import { SourceFile } from "../Ast/Nodes/NodeTypes";
import ZrLuauFunction from "../Data/LuauFunction";
import ZrLocalStack, { ZrValue } from "../Data/Locals";
import ZrRuntime, { ZrRuntimeResult, ZrRuntimeError } from "./Runtime";
import { $print } from "rbxts-transform-debug";
import { stringify } from "Functions/BuiltInFunctions";
import { Result } from "@rbxts/rust-classes";

export default class ZrScript {
	private runtime: ZrRuntime;

	public constructor(private readonly source: SourceFile, globalVariables: Map<string, ZrValue>, player?: Player) {
		const globals = new ZrLocalStack(globalVariables);
		this.runtime = new ZrRuntime(source, globals, player);
	}

	public registerFunction(name: string, func: ZrLuauFunction) {
		this.runtime.getLocals().setGlobal(name, func, true); //?
	}

	public getSourceAst() {
		return this.source;
	}

	public execute(): Result<ZrRuntimeResult, ZrRuntimeError[]> {
		try {
			return Result.ok(this.runtime.execute());
		} catch (e) {
			return Result.err(this.runtime.getErrors());
		}
	}

	public executeOrThrow(): ZrValue {
		const results = this.runtime.execute();
		for (const result of results.expressionEval) {
			$print(">", stringify(result));
		}

		return results.value;
	}

	/** @internal Testing function */
	public _printScriptGlobals() {
		for (const [name, value] of this.runtime.getLocals().toMap()) {
			print(name, value);
		}
	}
}
