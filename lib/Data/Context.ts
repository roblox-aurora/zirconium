import { Result } from "@rbxts/rust-classes";
import ZrRuntime from "../Runtime/Runtime";
import { ZrValue } from "./Locals";
import ZrLuauFunction from "./LuauFunction";
import { ZrInputStream, ZrOutputStream } from "./Stream";
import ZrUndefined from "./Undefined";
import ZrUserFunction from "./UserFunction";

export default class ZrContext {
	private output = new ZrOutputStream();

	constructor(private runtime: ZrRuntime) {}

	/** @internal */
	public getLocals() {
		return this.runtime.getLocals();
	}

	public getExecutor() {
		return this.runtime.getExecutingPlayer();
	}

	/**
	 * Gets the output stream
	 * @internal
	 */
	public getOutput() {
		return this.output;
	}

	public call(fn: ZrUserFunction | ZrLuauFunction, ...args: ZrValue[]): ZrValue {
		if (fn instanceof ZrUserFunction) {
			return this.runtime.executeFunction(fn, args) ?? ZrUndefined;
		} else {
			return fn.call(this, ...args) ?? ZrUndefined;
		}
	}
}
