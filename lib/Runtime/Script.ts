import { SourceFile } from "../Ast/Nodes/NodeTypes";
import ZrLuauFunction from "../Data/LuauFunction";
import ZrLocalStack, { ZrValue } from "../Data/Locals";
import ZrRuntime, { ZrRuntimeError } from "./Runtime";

export default class ZrScript {
	private runtime: ZrRuntime;

	public constructor(source: SourceFile, globalVariables: Map<string, ZrValue>) {
		const globals = new ZrLocalStack(globalVariables);
		this.runtime = new ZrRuntime(source, globals);
	}

	public registerFunction(name: string, func: ZrLuauFunction) {
		this.runtime.getLocals().setGlobal(name, func); //?
	}

	public async execute() {
		return Promise.defer<readonly string[]>(
			(resolve: (value: readonly string[]) => void, reject: (err: ZrRuntimeError[]) => void) => {
				try {
					resolve(this.runtime.execute()._toStringArray());
				} catch (e) {
					reject(this.runtime.getErrors());
				}
			},
		);
	}

	public executeOrThrow() {
		const results = this.runtime.execute().toArray();
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
