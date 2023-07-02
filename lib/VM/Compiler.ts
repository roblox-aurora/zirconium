import { isNode } from "Ast";
import { ZrNodeKind } from "Ast/Nodes";
import { BooleanLiteral, Expression, NumberLiteral, SourceFile, StringLiteral, ZrNode } from "Ast/Nodes/NodeTypes";
import { ZrBytecodeWriteStream } from "./ByteStream";
import { ZrBytecodeBuilder as ZrBytecodeBuilder, ZrcFunction } from "./CodeBuilder";
import { ZrInstruction, ZrInstructionTable, ZrOP } from "./Instructions";
import { Operand } from "./Operand";
import { u8, ZR_EMIT_ABC } from "./Utils";

export type ZrCompilerConstant =
	| { type: "string"; value: string }
	| { type: "number"; value: number }
	| { type: "undefined"; value?: undefined }
	| { type: "boolean"; value: boolean };

type ZrLocal = readonly [index: number, startpc: number, endpc: number];
type ZrLabel = readonly [idx: number, label: string];

export interface ZrBytecodeTable {
	locals: Array<ZrLocal>;

	/**
	 * A list of "labels" for JMP, JMPIF
	 */
	labels: Array<ZrLabel>;

	/**
	 * Constants
	 */
	constants: Array<ZrCompilerConstant>;

	/**
	 * The instructions
	 */
	instructions: Array<number>;

	functions: Array<ZrcFunction>;
	entryPoint: number;
}

/**
 * The compiler for Zirconium - will translate AST or source to bytecode
 */
export class ZrCompiler {
	private bytecodeBuilder = new ZrBytecodeBuilder(ZrInstructionTable);

	private constructor() {}

	public static toPrettyString(compiled: ZrBytecodeTable) {
		// const bytes = compiled.instructions;
		// const labels = compiled.labels;
		const constants = compiled.constants;

		const strs = new Array<string>();

		// for (let ip = 0; ip < bytes.size(); ) {
		// 	const opCode = bytes[ip];
		// 	const instr = ZrInstructionTable.find(f => f[0] === opCode);

		// 	for (const [labelPtr, label] of labels) {
		// 		if (labelPtr === ip) {
		// 			strs.push(`.${label}`);
		// 		}
		// 	}

		// 	assert(instr);
		// 	const [, name, arity] = instr;
		// 	let str = [name.upper()];

		// 	for (let i = 1; i <= arity; i++) {
		// 		const arg = bytes[ip + i];
		// 		str.push(tostring(arg));
		// 	}

		// 	if (opCode === ZrOP.ADD) {
		// 		str.push("\t\t; Pops & adds the last two values on the stack, pushes the result");
		// 	} else if (opCode === ZrOP.CALLK) {
		// 		str.push(`\t\t; calls '${tostring(data[bytes[ip + 1]])}' with ${bytes[ip + 2]} arguments`);
		// 	} else if (opCode === ZrOP.LOADK) {
		// 		const ptr = bytes[ip + 1];
		// 		str.push(`\t\t; load constant @${ptr} (${tostring(data[ptr])}) onto the stack`);
		// 	} else if (opCode === ZrOP.SETUPVALUE) {
		// 		str.push(`\t\t; sets the upvalue ${tostring(data[bytes[ip + 1]])} to the last value in the stack`);
		// 	} else if (opCode === ZrOP.CLOSURE) {
		// 		str.push(`\t\t; create closure '${data[bytes[ip + 1]]}'`);
		// 	}

		// 	strs.push(`\t${str.join(" ")}`);
		// 	ip += arity + 1;
		// }

		strs.push("-- constants --");
		let i = 0;
		for (const constant of constants) {
			strs.push(`\t@${i} = ${tostring(constant)}`);
			i++;
		}

		return strs.join("\n");
	}

	protected pushLiteral(node: StringLiteral | NumberLiteral | BooleanLiteral) {
		if (node.kind === ZrNodeKind.String) {
			this.bytecodeBuilder.emitABC(ZrOP.PUSHK, this.bytecodeBuilder.addConstantString(node.text)); // load constant
		} else if (node.kind === ZrNodeKind.Number) {
			this.bytecodeBuilder.emitABC(ZrOP.PUSHK, this.bytecodeBuilder.addConstantNumber(node.value)); // load constant
		} else if (node.kind === ZrNodeKind.Boolean) {
			this.bytecodeBuilder.emitABC(ZrOP.PUSHK, this.bytecodeBuilder.addConstantBoolean(node.value)); // load constant
		}
	}

	private parseExpression(node: Expression, singleExpressions = false) {
		if (
			(isNode(node, ZrNodeKind.String) || isNode(node, ZrNodeKind.Boolean) || isNode(node, ZrNodeKind.Number)) &&
			singleExpressions
		) {
			this.pushLiteral(node);
		} else if (isNode(node, ZrNodeKind.ElementAccessExpression)) {
			if (isNode(node.argumentExpression, ZrNodeKind.Number)) {
				this.parseExpression(node.expression, true);
				this.bytecodeBuilder.emitABC(
					ZrOP.GETINDEX,
					this.bytecodeBuilder.addConstantNumber(node.argumentExpression.value),
				);
			} else if (isNode(node.argumentExpression, ZrNodeKind.String)) {
				this.parseExpression(node.expression, true);
				this.bytecodeBuilder.emitABC(
					ZrOP.GETPROPERTY,
					this.bytecodeBuilder.addConstantString(node.argumentExpression.text),
				);
			} else {
				throw `Not supported index: ${ZrNodeKind[node.argumentExpression.kind]}`;
			}
		} else if (isNode(node, ZrNodeKind.UndefinedKeyword)) {
			this.bytecodeBuilder.emitAux(ZrOP.LOADNONE);
		} else if (isNode(node, ZrNodeKind.PropertyAccessExpression)) {
			this.parseExpression(node.expression, true);
			this.bytecodeBuilder.emitABC(ZrOP.GETPROPERTY, this.bytecodeBuilder.addConstantString(node.name.name));
		} else if (isNode(node, ZrNodeKind.Identifier)) {
			this.bytecodeBuilder.emitABC(ZrOP.GETGLOBAL, this.bytecodeBuilder.addConstantString(node.name));
		} else if (isNode(node, ZrNodeKind.ObjectLiteralExpression)) {
			this.bytecodeBuilder.emitABC(ZrOP.NEWOBJECT, this.bytecodeBuilder.addConstantNumber(node.values.size()));
		} else if (isNode(node, ZrNodeKind.ArrayLiteralExpression)) {
			this.bytecodeBuilder.emitABC(ZrOP.NEWARRAY, this.bytecodeBuilder.addConstantNumber(node.values.size()));
		} else if (isNode(node, ZrNodeKind.CallExpression)) {
			const { expression, arguments: args, parent } = node;

			if (parent !== undefined) {
				print("parent is ", ZrNodeKind[parent.kind]);
			}

			if (args !== undefined) {
				for (const arg of args as Expression[]) {
					this.parseExpression(arg, true);
				}
			}

			if (isNode(expression, ZrNodeKind.Identifier)) {
				this.bytecodeBuilder.emitABC(
					ZrOP.CALLK,
					this.bytecodeBuilder.addConstantString(expression.name),
					(args?.size() ?? 0) as u8,
				);
			} else {
				throw `Invalid expression for call`;
			}
		} else if (isNode(node, ZrNodeKind.BinaryExpression)) {
			this.parseExpression(node.left, true);
			this.parseExpression(node.right, true);

			if (node.operator === "+") {
				this.bytecodeBuilder.emitABC(ZrOP.ADD);
			} else if (node.operator === "*") {
				this.bytecodeBuilder.emitABC(ZrOP.MUL);
			} else if (node.operator === "-") {
				this.bytecodeBuilder.emitABC(ZrOP.SUB);
			} else if (node.operator === "/") {
				this.bytecodeBuilder.emitABC(ZrOP.DIV);
			}
		} else {
			throw `Expression ${ZrNodeKind[node.kind]} not yet supported by compiler`;
		}
	}

	private uniques = new Map<string, number>();
	protected getUniqueName(name: string) {
		const uniqueIdx = this.uniques.get(name) ?? 0;
		this.uniques.set(name, uniqueIdx + 1);
		return `${name}_${uniqueIdx}`;
	}

	protected writeBytecode(node: ZrNode) {
		if (isNode(node, ZrNodeKind.Source)) {
			for (const statement of node.children) {
				this.writeBytecode(statement);
			}
		} else if (isNode(node, ZrNodeKind.Block)) {
			for (const statement of node.statements) {
				this.writeBytecode(statement);
			}
		} else if (isNode(node, ZrNodeKind.ExpressionStatement)) {
			this.parseExpression(node.expression);
		} else if (isNode(node, ZrNodeKind.ReturnStatement)) {
			this.parseExpression(node.expression, true);
			this.bytecodeBuilder.emitABC(ZrOP.RET, 1);
		} else if (isNode(node, ZrNodeKind.VariableDeclaration)) {
			this.parseExpression(node.expression, true);
			if (isNode(node.identifier, ZrNodeKind.Identifier)) {
				this.bytecodeBuilder.emitABC(
					ZrOP.SETUPVALUE,
					this.bytecodeBuilder.addConstantString(node.identifier.name),
				);
			}
		} else if (isNode(node, ZrNodeKind.IfStatement)) {
			if (node.condition) {
				if (node.thenStatement && node.elseStatement) {
					if (isNode(node.condition, ZrNodeKind.BinaryExpression)) {
						throw `Not yet implemented!`;
					} else {
						// IF CONDITION
						this.parseExpression(node.condition, true);
						this.bytecodeBuilder.emitABC(ZrOP.TEST, 0, -1);

						this.bytecodeBuilder.withJump(() => {
							this.writeBytecode(node.thenStatement!);
						});

						// ELSE CONDITION
						this.parseExpression(node.condition, true); // push expr
						this.bytecodeBuilder.emitABC(ZrOP.TEST, 1, -1);

						this.bytecodeBuilder.withJump(() => {
							this.writeBytecode(node.elseStatement!);
						});
					}

					// this.bytecodeBuilder.emitABC(ZrOP.JMP, this.bytecodeBuilder.offset() as u8);
					this.bytecodeBuilder.withJump(() => {
						this.writeBytecode(node.thenStatement!);
					});
				} else if (node.thenStatement) {
					if (isNode(node.condition, ZrNodeKind.BinaryExpression)) {
						this.parseExpression(node.condition, true); // push expr
						if (node.condition.operator === "==") {
							this.bytecodeBuilder.emitABC(ZrOP.EQ, 0, -2, -1);
						} else if (node.condition.operator === "!=") {
							this.bytecodeBuilder.emitABC(ZrOP.EQ, 1, -2, -1);
						}
					} else {
						// TRUE CONDITION
						this.parseExpression(node.condition, true);
						this.bytecodeBuilder.emitABC(ZrOP.TEST, 0, -1);
					}

					// this.bytecodeBuilder.emitABC(ZrOP.JMP, this.bytecodeBuilder.offset() as u8);
					this.bytecodeBuilder.withJump(() => {
						this.writeBytecode(node.thenStatement!);
					});
				}

				// if (node.thenStatement && node.elseStatement) {
				// 	// push if_true
				// 	this.bytecodeBuilder.emitABC(ZrOP.JMPIFK, this.bytecodeBuilder.addConstantString(ifTrueLabel)); // JMPIF cond
				// 	this.writeBytecode(node.elseStatement); // false condition
				// 	this.bytecodeBuilder.emitABC(ZrOP.JMPK, this.bytecodeBuilder.addConstantString(endLabel)); // JMP end

				// 	// true label
				// 	this.bytecodeBuilder.label(ifTrueLabel);
				// 	this.writeBytecode(node.thenStatement);
				// 	this.bytecodeBuilder.label(endLabel);
				// } else if (node.thenStatement) {
				// 	this.bytecodeBuilder.emitABC(ZrOP.JMPIFK, this.bytecodeBuilder.addConstantString(ifTrueLabel)); // JMPIF cond
				// 	this.bytecodeBuilder.label(ifTrueLabel);
				// 	this.writeBytecode(node.thenStatement);
				// }
			}
		} else if (isNode(node, ZrNodeKind.FunctionDeclaration)) {
			this.bytecodeBuilder.emitABC(ZrOP.CLOSURE, this.bytecodeBuilder.addConstantString(node.name.name));

			this.bytecodeBuilder.beginFunction(
				node.name.name,
				node.parameters.map(p => p.name.name),
				false,
			);
			{
				for (const statement of node.body.statements) {
					this.writeBytecode(statement);
				}

				if (!this.bytecodeBuilder.currentFunction().returns) {
					this.bytecodeBuilder.emitABC(ZrOP.RET, 0);
				}
			}
			this.bytecodeBuilder.endFunction();
			this.bytecodeBuilder.emitABC(ZrOP.SETGLOBAL, this.bytecodeBuilder.addConstantString(node.name.name));
		}
	}

	public dumpEverything() {
		return this.bytecodeBuilder.dumpEverything();
	}

	public toBytecodeTable(): ZrBytecodeTable {
		return this.bytecodeBuilder.build();
	}

	public toBinaryString(): string {
		const writeStream = new ZrBytecodeWriteStream();
		writeStream.writeBytecodeTable(this.toBytecodeTable());
		return writeStream.toString();
	}

	public static fromSource(source: string, parseOptions: unknown) {
		throw `TODO`;
	}

	public static fromAst(source: SourceFile): ZrCompiler {
		const compiler = new ZrCompiler();
		compiler.writeBytecode(source);

		if (!compiler.bytecodeBuilder.currentFunction().returns) {
			compiler.bytecodeBuilder.emitABC(ZrOP.RET, 0);
		}

		return compiler;
	}
}
