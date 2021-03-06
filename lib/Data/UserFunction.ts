import { isNode } from "Ast";
import { ZrNodeKind } from "Ast/Nodes";
import { FunctionDeclaration, FunctionExpression, ParameterDeclaration, SourceBlock } from "../Ast/Nodes/NodeTypes";
import ZrRuntime, { ZrRuntimeErrorCode } from "../Runtime/Runtime";
import ZrLocalStack, { ZrValue } from "./Locals";

/**
 * A function declared by a user
 */
export default class ZrUserFunction {
	private parameters: ParameterDeclaration[];
	private body: SourceBlock;
	private name?: string;

	constructor(declaration: FunctionDeclaration | FunctionExpression) {
		this.parameters = declaration.parameters;
		this.body = declaration.body;
		if (isNode(declaration, ZrNodeKind.FunctionDeclaration)) {
			this.name = declaration.name.name;
		}
	}

	public getParameters() {
		return this.parameters;
	}

	public getBody() {
		return this.body;
	}

	public toString() {
		return `function ${this.name ?? ""}(${this.parameters.map((p) => p.name.name).join(", ")}) {...}`;
	}
}
