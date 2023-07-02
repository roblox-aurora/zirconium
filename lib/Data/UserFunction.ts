import { isNode } from "Ast";
import { ZrNodeKind } from "Ast/Nodes";
import { FunctionDeclaration, FunctionExpression, ParameterDeclaration, SourceBlock } from "../Ast/Nodes/NodeTypes";
import { ZrFunction } from "./Function";

/**
 * A function declared by a user
 * @deprecated
 */
export default class ZrUserFunction {
	private parameters: ParameterDeclaration[];
	private body: SourceBlock;
	private label: string = "???";

	constructor(declaration: FunctionDeclaration | FunctionExpression) {
		this.parameters = declaration.parameters;
		this.body = declaration.body;
		if (isNode(declaration, ZrNodeKind.FunctionDeclaration)) {
			this.label = declaration.name.name;
		}
	}

	public getLabel() {
		return this.label;
	}

	public getParameters() {
		return this.parameters;
	}

	public getBody() {
		return this.body;
	}

	public toString() {
		return `function ${this.getLabel() ?? ""}(${this.parameters.map(p => p.name.name).join(", ")}) {...}`;
	}
}
