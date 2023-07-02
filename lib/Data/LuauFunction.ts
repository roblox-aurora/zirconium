import { ZrFunction, ZrFunctionHandle } from "./Function";
import ZrContext from "./Context";
import { ZrValue } from "./Locals";
import ZrUndefined from "./Undefined";
import { ZrState } from "VM/State";

export type ZrUnknown = ZrValue | ZrUndefined;

/**
 * A lua-side function.
 *
 * Where the real magic happens.
 *
 * @deprecated
 */
export default class ZrLuauFunction extends ZrFunction {
	constructor(callback: (state: ZrState, ...args: readonly ZrUnknown[]) => ZrUnknown | void) {
		super(
			ZrFunctionHandle.LuauFunction({
				name: "",
				callback,
			}),
		);
	}

	public toString() {
		return "function (...) { [native] }";
	}
}
