import { CommandSource } from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrLuauFunction from "../Data/LuauFunction";
import ZrLocalStack, { ZrValue } from "../Data/Locals";
import ZrRuntime from "./Runtime";

export default class ZrScript {
	private runtime: ZrRuntime;

	public constructor(source: CommandSource, globalVariables: Record<string, ZrValue>) {
		const globals = new ZrLocalStack(globalVariables);
		this.runtime = new ZrRuntime(source, globals);
	}

	public registerFunction(name: string, func: ZrLuauFunction) {
		this.runtime.getLocals().setGlobal(name, func); //?
	}

	public async execute() {
		return new Promise<void>((resolve, reject) => {
			Promise.spawn(() => {
				try {
					this.runtime.execute();
					resolve();
				} catch (e) {
					reject(this.runtime.getErrors()[0]);
				}
			});
		});
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
