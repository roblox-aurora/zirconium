import ZrLuauFunction from "Data/LuauFunction";
import ZrObject from "Data/Object";
import { ZrValidation } from "Data/Types";
import ZrUndefined from "Data/Undefined";
import { ZrObjectUserdata } from "Data/Userdata";
import ZrUserFunction from "Data/UserFunction";
import { ZirconiumLogging } from "Logging";
import { $package } from "rbxts-transform-debug";
import { ZrLibrary } from "Runtime/ScriptContext";
import { isArray } from "Util";

function keys(value: object) {
	const keyValues = new Array<string>();
	for (const [k] of pairs(value)) {
		keyValues.push(tostring(k));
	}
	return keyValues;
}

class ZrScopedLib<T extends ZrLibrary> extends ZrObjectUserdata<T> {
	public constructor(private name: string, obj: T) {
		super(obj);
	}

	public static luaulib(lib: typeof math) {
		const zrlib = {} as ZrLibrary;

		for (const [k, v] of pairs(lib) as IterableFunction<[string, defined]>) {
			if (typeIs(v, "function")) {
				zrlib[k] = new ZrLuauFunction((_, ...args) => void v(...args));
			}
		}

		return zrlib;
	}

	public toString(): string {
		return `[ZrLibrary ${this.name}: ${keys(this.toValue()).join(", ")}]`;
	}
}

export namespace ZrLibs {
	export const mathlib = {
		min: ZrLuauFunction.wrap(math.min),
		max: ZrLuauFunction.wrap(math.max),
		clamp: ZrLuauFunction.wrap(math.clamp),
		huge: math.huge,
		deg: ZrLuauFunction.wrap(math.deg),
		rad: ZrLuauFunction.wrap(math.rad),
		pi: math.pi,
	};

	export const stringlib = {
		find: ZrLuauFunction.wrap(string.find),
		sub: ZrLuauFunction.wrap(string.sub),
	};

	/**
	 * @experimental
	 */
	export const tasklib = {
		spawn: ZrLuauFunction.typed([ZrValidation.check("function")], (ctx, fn, ...args) => {
			task.spawn(() => ctx.call(fn, ...args));
		}),
		defer: ZrLuauFunction.typed([ZrValidation.check("function")], (ctx, fn, ...args) => {
			task.defer(() => ctx.call(fn, ...args));
		}),
		delay: ZrLuauFunction.typed(
			[ZrValidation.check("number"), ZrValidation.check("function")] as const,
			(ctx, delay, fn, ...args) => {
				task.delay(delay, () => ctx.call(fn, ...args));
			},
		),
		wait: ZrLuauFunction.typed([ZrValidation.check("number")], (ctx, time) => task.wait(time)),
	};

	export const experimentallib = {
		task: new ZrScopedLib("task", tasklib),
	};

	export const stdlib = {
		_VERSION: $package.version,
		typeof: new ZrLuauFunction((_, value) => ZrValidation.typeOf(value)),
		print: new ZrLuauFunction((_, ...args) => print("[Zr]", ...args)),
		warn: new ZrLuauFunction((_, ...args) => warn("[Zr]", ...args)),
		error: new ZrLuauFunction((_, errMsg) => ZirconiumLogging.Error(`[Zr] ${tostring(errMsg)}`)),
		Array: new ZrScopedLib("Array", {
			is: new ZrLuauFunction((_, value) => isArray(value)),
			sized: ZrLuauFunction.typed(
				[ZrValidation.check("number")] as const,
				(_, size) => new Array(size, ZrUndefined),
			),
		}),
		Object: new ZrScopedLib("Object", {
			is: new ZrLuauFunction((_, value) => value instanceof ZrObject),
		}),
		assert: ZrLuauFunction.typed(
			[ZrValidation.checkDefined(), ZrValidation.optional(ZrValidation.check("string"))] as const,
			(ctx, check, message) => assert(check, message !== ZrUndefined ? message : undefined),
		),
		math: new ZrScopedLib("math", mathlib),
		string: new ZrScopedLib("string", stringlib),
		wait: tasklib.wait,
	} as const;
}
