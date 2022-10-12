import ZrContext from "./Context";
import { ZrValue } from "./Locals";
import ZrUndefined from "./Undefined";

/**
 * A lua-side function.
 *
 * Where the real magic happens.
 */
export type ZrUnknown = ZrValue | ZrUndefined;
export default class ZrLuauFunction {
	constructor(private callback: (ctx: ZrContext, ...args: readonly ZrUnknown[]) => ZrUnknown | void) {}

	/**
	 * Create a dynamic function (one that takes any value per argument)
	 */
	public static createDynamic(fn: (context: ZrContext, ...args: readonly ZrUnknown[]) => ZrValue | void) {
		return new ZrLuauFunction(fn);
	}

	/** @internal */
	public call(context: ZrContext, ...args: ZrUnknown[]) {
		return this.callback(context, ...args);
	}

	public toString() {
		return "function (...) { [native] }";
	}
}
