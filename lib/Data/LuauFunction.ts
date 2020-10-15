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

export const ZrPrint = ZrLuauFunction.createDynamic((ctx, ...params) => {
	print(params.map((p) => tostring(p)).join(" "));
});

export const ZrRange = ZrLuauFunction.createDynamic((ctx, start, stop) => {
	if (typeIs(start, "number") && typeIs(stop, "number")) {
		const arr = new Array<number>(stop - start);
		for (let i = 0; i <= stop - start; i++) {
			arr.push(start + i);
		}
		return arr;
	}
});
