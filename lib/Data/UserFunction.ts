import { isNode } from "Ast";
import { ZrNodeKind } from "Ast/Nodes";
import { FunctionDeclaration, FunctionExpression, ParameterDeclaration, SourceBlock } from "../Ast/Nodes/NodeTypes";
import { ZrClosure } from "./Closure";

/**
 * A function declared by a user
 */
export default class ZrUserFunction extends ZrClosure {
	private parameters: ParameterDeclaration[];
	private body: SourceBlock;

	constructor(declaration: FunctionDeclaration | FunctionExpression) {
		super(game.GetService("HttpService").GenerateGUID(false));
		this.parameters = declaration.parameters;
		this.body = declaration.body;
		if (isNode(declaration, ZrNodeKind.FunctionDeclaration)) {
			this.label = declaration.name.name;
		}
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
