import ZrContext from "./Context";
import { ZrValue } from "./Locals";
import ZrUndefined from "./Undefined";

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

export type ZrLuauArgument = ZrValue | ZrUndefined;
export default class ZrLuauFunction {
	constructor(private callback: (ctx: ZrContext, ...args: readonly ZrLuauArgument[]) => ZrValue | void) {}

	/**
	 * Create a dynamic function (one that takes any value per argument)
	 */
	public static createDynamic(fn: (context: ZrContext, ...args: readonly ZrLuauArgument[]) => ZrValue | void) {
		return new ZrLuauFunction(fn);
	}

	/** @internal */
	public call(context: ZrContext, ...args: ZrLuauArgument[]) {
		return this.callback(context, ...args);
	}

	public toString() {
		return "function (...) { [native] }";
	}
}
