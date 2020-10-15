import { FunctionDeclaration, Parameter, SourceBlock } from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrRuntime, { ZrRuntimeErrorCode } from "../Runtime/Runtime";
import ZrLocalStack, { ZrValue } from "./Locals";

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

	// public call(runtime: ZrRuntime, args: ZrValue[], execute: (body: SourceBlock) => ZrValue | undefined) {
	//     const { parameters, body } = this;
	//     const locals = runtime.getLocals();
	// 	locals.push();
	// 	for (const [i, parameter] of ipairs(parameters)) {
	// 		const value = args[i];
	// 		if (value !== undefined) {
	// 			runtime.setLocal(parameter.name.name, value);
	// 		}
	// 	}

	// 	const retVal = execute(body);
	// 	runtime.pop();

	// 	return retVal;
	// }

	public toString() {
		return `function ${this.name}(${this.parameters.map((p) => p.name.name).join(", ")}) {...}`;
	}
}
