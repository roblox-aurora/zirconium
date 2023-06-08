import { isNode } from "Ast";
import { ZrNodeKind } from "Ast/Nodes";
import { BooleanLiteral, Expression, NumberLiteral, SourceFile, StringLiteral, ZrNode } from "Ast/Nodes/NodeTypes";
import { ZrCodeBuilder } from "./CodeBuilder";
import { ZrInstruction, ZrInstructionTable, ZrOP } from "./Instructions";
import { Operand } from "./Operand";

export type ZrCompilerConstant = string | number;

type ZrLocal = readonly [index: number, startpc: number, endpc: number];
type ZrLabel = readonly [idx: number, label: string];

export interface ZrChunk {
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
}

export class ZrCompiler {
	private builder = new ZrCodeBuilder(ZrInstructionTable);

	protected constructor() {}

	public static toPrettyString(compiled: ZrChunk) {
		const bytes = compiled.instructions;
		const labels = compiled.labels;
		const data = compiled.constants;

		const strs = new Array<string>();

		for (let ip = 0; ip < bytes.size(); ) {
			const opCode = bytes[ip];
			const instr = ZrInstructionTable.find(f => f[0] === opCode);

			for (const [labelPtr, label] of labels) {
				if (labelPtr === ip) {
					strs.push(`.${label}`);
				}
			}

			assert(instr);
			const [, name, arity] = instr;
			let str = [name.upper()];

			for (let i = 1; i <= arity; i++) {
				const arg = bytes[ip + i];
				str.push(tostring(arg));
			}

			if (opCode === ZrOP.ADD) {
				str.push("\t\t; Pops & adds the last two values on the stack, pushes the result");
			} else if (opCode === ZrOP.CALLK) {
				str.push(`\t\t; calls '${tostring(data[bytes[ip + 1]])}' with ${bytes[ip + 2]} arguments`);
			} else if (opCode === ZrOP.LOADK) {
				const ptr = bytes[ip + 1];
				str.push(`\t\t; load constant @${ptr} (${tostring(data[ptr])}) onto the stack`);
			} else if (opCode === ZrOP.SETUPVALUE) {
				str.push(`\t\t; sets the upvalue ${tostring(data[bytes[ip + 1]])} to the last value in the stack`);
			} else if (opCode === ZrOP.CLOSURE) {
				str.push(`\t\t; create closure '${data[bytes[ip + 1]]}'`);
			}

			strs.push(`\t${str.join(" ")}`);
			ip += arity + 1;
		}

		strs.push("-- constants --");
		let i = 0;
		for (const constant of data) {
			strs.push(`\t@${i} = ${tostring(constant)}`);
			i++;
		}

		return strs.join("\n");
	}

	protected pushLiteral(node: StringLiteral | NumberLiteral | BooleanLiteral) {
		if (node.kind === ZrNodeKind.String) {
			this.builder.push(ZrOP.LOADK, Operand.string(node.text)); // load constant
		} else if (node.kind === ZrNodeKind.Number) {
			this.builder.push(ZrOP.LOADK, Operand.number(node.value)); // load constant
		} else if (node.kind === ZrNodeKind.Boolean) {
			this.builder.push(ZrOP.LOADK, Operand.number(node.value ? 1 : 0)); // load constant
		}
	}

	private parseExpression(node: Expression, singleExpressions = false) {
		if ((isNode(node, ZrNodeKind.String) || isNode(node, ZrNodeKind.Number)) && singleExpressions) {
			this.pushLiteral(node);
		} else if (isNode(node, ZrNodeKind.ElementAccessExpression)) {
			if (isNode(node.argumentExpression, ZrNodeKind.Number)) {
				this.parseExpression(node.expression, true);
				this.builder.push(ZrOP.GETINDEX, node.argumentExpression.value);
			} else if (isNode(node.argumentExpression, ZrNodeKind.String)) {
				this.parseExpression(node.expression, true);
				this.builder.push(ZrOP.GETPROPERTY, Operand.string(node.argumentExpression.text));
			} else {
				throw `Not supported index: ${ZrNodeKind[node.argumentExpression.kind]}`;
			}
		} else if (isNode(node, ZrNodeKind.UndefinedKeyword)) {
			this.builder.push(ZrOP.LOADNONE);
		} else if (isNode(node, ZrNodeKind.PropertyAccessExpression)) {
			this.parseExpression(node.expression, true);
			this.builder.push(ZrOP.GETPROPERTY, Operand.string(node.name.name));
		} else if (isNode(node, ZrNodeKind.Identifier)) {
			this.builder.push(ZrOP.GETGLOBAL, Operand.string(node.name));
		} else if (isNode(node, ZrNodeKind.ObjectLiteralExpression)) {
			this.builder.push(ZrOP.NEWOBJECT, node.values.size());
		} else if (isNode(node, ZrNodeKind.ArrayLiteralExpression)) {
			this.builder.push(ZrOP.NEWARRAY, node.values.size());
		} else if (isNode(node, ZrNodeKind.CallExpression)) {
			const { expression, arguments: args } = node;

			if (args !== undefined) {
				for (const arg of args as Expression[]) {
					this.parseExpression(arg, true);
				}
			}

			if (isNode(expression, ZrNodeKind.Identifier)) {
				this.builder.push(ZrOP.CALLK, Operand.string(expression.name), args?.size() ?? 0);
			} else {
				throw `Invalid expression for call`;
			}
		} else if (isNode(node, ZrNodeKind.BinaryExpression)) {
			this.parseExpression(node.left, true);
			this.parseExpression(node.right, true);

			if (node.operator === "+") {
				this.builder.push(ZrOP.ADD);
			} else if (node.operator === "*") {
				this.builder.push(ZrOP.MUL);
			} else if (node.operator === "-") {
				this.builder.push(ZrOP.SUB);
			} else if (node.operator === "/") {
				this.builder.push(ZrOP.DIV);
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

	protected astToVM(node: ZrNode) {
		if (isNode(node, ZrNodeKind.Source)) {
			for (const statement of node.children) {
				this.astToVM(statement);
			}
		} else if (isNode(node, ZrNodeKind.Block)) {
			for (const statement of node.statements) {
				this.astToVM(statement);
			}
		} else if (isNode(node, ZrNodeKind.ExpressionStatement)) {
			this.parseExpression(node.expression);
		} else if (isNode(node, ZrNodeKind.ReturnStatement)) {
			this.parseExpression(node.expression, true);
			this.builder.push(ZrOP.RET, 1);
		} else if (isNode(node, ZrNodeKind.VariableDeclaration)) {
			this.parseExpression(node.expression, true);
			if (isNode(node.identifier, ZrNodeKind.Identifier)) {
				this.builder.push(ZrOP.SETUPVALUE, Operand.string(node.identifier.name));
			}
		} else if (isNode(node, ZrNodeKind.IfStatement)) {
			if (node.condition) {
				const ifTrueLabel = this.getUniqueName("if_true");
				const endLabel = this.getUniqueName("end");

				this.parseExpression(node.condition, true); // push expr

				if (node.thenStatement && node.elseStatement) {
					// push if_true
					this.builder.push(ZrOP.JMPIFK, Operand.string(ifTrueLabel)); // JMPIF cond
					this.astToVM(node.elseStatement); // false condition
					this.builder.push(ZrOP.JMPK, Operand.string(endLabel)); // JMP end

					// true label
					this.builder.label(ifTrueLabel);
					this.astToVM(node.thenStatement);
					this.builder.label(endLabel);
				}
			}
		} else if (isNode(node, ZrNodeKind.FunctionDeclaration)) {
			this.builder.push(ZrOP.CLOSURE, Operand.string(node.name.name));

			this.builder.closure(
				node.name.name,
				node.parameters.map(p => p.name.name),
				() => {
					for (const statement of node.body.statements) {
						this.astToVM(statement);
					}

					if (!this.builder.chunk().returns) {
						this.builder.push(ZrOP.RET, 0);
					}
				},
			);

			this.builder.push(ZrOP.SETUPVALUE, Operand.string(node.name.name));
		}
	}

	public compile(): ZrChunk {
		return this.builder.build();
	}

	public static loadFile(source: SourceFile): ZrCompiler {
		const compiler = new ZrCompiler();
		compiler.astToVM(source);

		if (!compiler.builder.chunk().returns) {
			compiler.builder.push(ZrOP.RET, 0);
		}

		return compiler;
	}
}
