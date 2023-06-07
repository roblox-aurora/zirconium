import { isNode } from "Ast";
import { ZrNodeKind } from "Ast/Nodes";
import { BooleanLiteral, Expression, NumberLiteral, SourceFile, StringLiteral, ZrNode } from "Ast/Nodes/NodeTypes";
import { ZrCodeBuilder } from "./CodeBuilder";
import { ZrInstruction, ZrInstructionTable, ZrOP } from "./Instructions";
import { Operand } from "./Operand";

export interface ZrCompiledCode {
	symbols: Array<readonly [idx: number, symbol: string]>;
	labels: Array<readonly [idx: number, label: string]>;
	data: Array<Operand>;
	code: Array<number>;
}

export class ZrCompiler {
	private builder = new ZrCodeBuilder(ZrInstructionTable);

	protected constructor() {}

	protected pushLiteral(node: StringLiteral | NumberLiteral | BooleanLiteral) {
		if (node.kind === ZrNodeKind.String) {
			this.builder.push(ZrOP.LOADK, Operand.string(node.text)); // load constant
		} else if (node.kind === ZrNodeKind.Number) {
			this.builder.push(ZrOP.LOADK, Operand.number(node.value)); // load constant
		} else if (node.kind === ZrNodeKind.Boolean) {
			this.builder.push(ZrOP.LOADK, Operand.boolean(node.value)); // load constant
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

			for (const arg of args as Expression[]) {
				this.parseExpression(arg, true);
			}

			if (isNode(expression, ZrNodeKind.Identifier)) {
				this.builder.push(ZrOP.CALLK, Operand.string(expression.name), args.size());
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

	protected astToVM(node: ZrNode) {
		print("toOpCode", ZrNodeKind[node.kind]);

		if (isNode(node, ZrNodeKind.Source)) {
			this.builder.label("main");

			for (const statement of node.children) {
				this.astToVM(statement);
			}
		} else if (isNode(node, ZrNodeKind.ExpressionStatement)) {
			this.parseExpression(node.expression);
		} else if (isNode(node, ZrNodeKind.ReturnStatement)) {
			this.parseExpression(node.expression);
			this.builder.push(ZrOP.RET);
		} else if (isNode(node, ZrNodeKind.VariableDeclaration)) {
			this.parseExpression(node.expression, true);
			if (isNode(node.identifier, ZrNodeKind.Identifier)) {
				this.builder.push(ZrOP.SETUPVALUE, Operand.string(node.identifier.name));
			}
		}
	}

	public compile(): ZrCompiledCode {
		return this.builder.build();
	}

	public toString() {
		return `ZrCompiler {\n${this.builder.toPrettyString()}\n}`;
	}

	public static loadFile(source: SourceFile): ZrCompiler {
		const compiler = new ZrCompiler();
		compiler.astToVM(source);
		return compiler;
	}
}
