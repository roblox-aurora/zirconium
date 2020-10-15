import ZrContext from "./Context";
import { ZrValue } from "./Locals";

/**
 * A lua-side function.
 *
 * Where the real magic happens.
 */
type TypeId = "string" | "number" | "boolean";
type InferTypeName<T> = T extends "string"
	? string
	: T extends "number"
	? number
	: T extends "boolean"
	? boolean
	: never;

type ArgTypes<T> = { readonly [P in keyof T]: InferTypeName<T[P]> };

export default class ZrLuauFunction {
	constructor(private callback: (ctx: ZrContext, ...args: readonly ZrValue[]) => ZrValue | void) {}

	/**
	 * Create a dynamic function (one that takes any value per argument)
	 */
	public static createDynamic(fn: (context: ZrContext, ...args: readonly ZrValue[]) => ZrValue | void) {
		return new ZrLuauFunction(fn);
	}

	/** @internal */
	public call(context: ZrContext, ...args: ZrValue[]) {
		return this.callback(context, ...args);
	}

	public toString() {
		return "function (...) { [native] }";
	}
}
