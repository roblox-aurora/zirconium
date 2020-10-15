import { FunctionDeclaration, Parameter, SourceBlock } from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrRuntime, { ZrRuntimeErrorCode } from "../Runtime/Runtime";
import ZrLocalStack, { ZrValue } from "./Locals";

/**
 * A function declared by a user
 */
export default class ZrUserFunction {
	private parameters: Parameter[];
	private body: SourceBlock;
	private name: string;

	constructor(declaration: FunctionDeclaration) {
		this.parameters = declaration.parameters;
		this.body = declaration.body;
		this.name = declaration.name.name;
	}

	public getParameters() {
		return this.parameters;
	}

	public getBody() {
		return this.body;
    }

	public toString() {
		return `function ${this.name}(${this.parameters.map((p) => p.name.name).join(", ")}) {...}`;
	}
}
