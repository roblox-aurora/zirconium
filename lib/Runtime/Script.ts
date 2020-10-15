import { CommandSource } from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrLocalStack, { ZrValue } from "../Data/Locals";
import ZrExecution from "./Execution";

export default class ZrScript {
	private stack: ZrExecution;

	public constructor(private source: CommandSource, private globalVariables: Record<string, ZrValue>) {
		const globals = new ZrLocalStack(globalVariables);
		this.stack = new ZrExecution(source, globals);
	}

	public execute() {
		this.stack.execute();
	}

	/** @internal Testing function */
	public _printScriptGlobals() {
		for (const [name, value] of this.stack.getLocals().toMap()) {
			print(name, value);
		}
	}
}
