import ZrContext from "./Context";
import { ZrValue } from "./Locals";
import { ZrValidation } from "./Types";
import ZrUndefined from "./Undefined";

export type ZrUnknown = ZrValue | ZrUndefined;

type ExtractTypes<T extends readonly ZrValidation.Check<ZrValue>[]> = { [P in keyof T]: ZrValidation.Static<T[P]> };

/**
 * A lua-side function.
 *
 * Where the real magic happens.
 */
export default class ZrLuauFunction {
	constructor(private callback: (ctx: ZrContext, ...args: readonly ZrUnknown[]) => ZrUnknown | void) {}

	/**
	 * Create a dynamic function (one that takes any value per argument)
	 */
	public static createDynamic(fn: (context: ZrContext, ...args: readonly ZrUnknown[]) => ZrValue | void) {
		return new ZrLuauFunction(fn);
	}

	public static wrap(fn: Callback) {
		return new ZrLuauFunction((ctx, ...args) => fn(...args));
	}

	public static typed<T extends readonly ZrValidation.Check<ZrValue>[]>(
		checks: T,
		fn: (context: ZrContext, ...args: ExtractTypes<T>) => ZrValue | void,
	) {
		return new ZrLuauFunction((ctx, ...args) => {
			for (let i = 0; i < checks.size(); i++) {
				const check = checks[i];
				const arg = args[i];

				if (!check(arg)) {
					error("[ZrTypeError] Invalid type at argument " + i + " ( " + arg + " )");
				}
			}

			return fn(ctx, ...(args as ExtractTypes<T>));
		});
	}

	/** @internal */
	public call(context: ZrContext, ...args: ZrUnknown[]) {
		return this.callback(context, ...args);
	}

	public toString() {
		return "function (...) { [native] }";
	}
}
