import { SourceFile } from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrLuauFunction from "../Data/LuauFunction";
import ZrLocalStack, { ZrValue } from "../Data/Locals";
import ZrRuntime, { ZrRuntimeError } from "./Runtime";

export default class ZrScript {
	private runtime: ZrRuntime;

	public constructor(source: SourceFile, globalVariables: Record<string, ZrValue>) {
		const globals = new ZrLocalStack(globalVariables);
		this.runtime = new ZrRuntime(source, globals);
	}

	public registerFunction(name: string, func: ZrLuauFunction) {
		this.runtime.getLocals().setGlobal(name, func); //?
	}

	public async execute() {
		return Promise.defer<string[]>(
			(resolve: (value: string[]) => void, reject: (err: ZrRuntimeError[]) => void) => {
				try {
					resolve(this.runtime.execute());
				} catch (e) {
					reject(this.runtime.getErrors());
				}
			},
		);
	}

	public executeOrThrow() {
		const results = this.runtime.execute();
		for (const result of results) {
			print(">", result);
		}
	}

	/** @internal Testing function */
	public _printScriptGlobals() {
		for (const [name, value] of this.runtime.getLocals().toMap()) {
			print(name, value);
		}
	}
}
