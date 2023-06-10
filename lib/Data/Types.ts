import { Option, Result } from "@rbxts/rust-classes";
import variantModule, { TypeNames, VariantOf } from "@rbxts/variant";
import { isArray } from "Util";
import { ZrEnum } from "./Enum";
import { ZrEnumItem } from "./EnumItem";
import { ZrDefined, ZrValue } from "./Locals";
import ZrLuauFunction from "./LuauFunction";
import ZrNull from "./Null";
import ZrObject from "./Object";
import ZrRange from "./Range";
import ZrUndefined from "./Undefined";
import { ZrUserdata } from "./Userdata";
import ZrUserFunction from "./UserFunction";

function valueType<T extends ZrValue>() {
	return (value: T) => ({ value });
}

export const ZrVariant = variantModule({
	string: valueType<string>(),
	number: valueType<number>(),
	boolean: valueType<boolean>(),
	userdata: valueType<ZrUserdata<any>>(),
	range: valueType<ZrRange>(),
	function: valueType<ZrLuauFunction | ZrUserFunction>(),
	object: valueType<ZrObject>(),
	array: valueType<ZrValue[]>(),
	undefined: () => ({ value: undefined }),
	enum: valueType<ZrEnum>(),
	enumItem: valueType<ZrEnumItem>(),
});
export type ZrVariant<T extends TypeNames<typeof ZrVariant> = undefined> = VariantOf<typeof ZrVariant, T>;

export namespace ZrVariants {
	export function typeOf(value: ZrVariant): string {
		return value.type;
	}

	export function from(value: ZrValue | undefined): ZrVariant {
		if (typeIs(value, "string")) {
			return ZrVariant.string(value);
		} else if (typeIs(value, "number")) {
			return ZrVariant.number(value);
		} else if (typeIs(value, "boolean")) {
			return ZrVariant.boolean(value);
		} else if (value === ZrUndefined || value === undefined) {
			return ZrVariant.undefined();
		} else if (isArray(value)) {
			return ZrVariant.array(value);
		} else if (value instanceof ZrLuauFunction || value instanceof ZrUserFunction) {
			return ZrVariant.function(value);
		} else if (value instanceof ZrRange) {
			return ZrVariant.range(value);
		} else if (value instanceof ZrObject) {
			return ZrVariant.object(value);
		} else if (value instanceof ZrEnum) {
			return ZrVariant.enum(value);
		} else if (value instanceof ZrUserdata) {
			return ZrVariant.userdata(value);
		} else {
			throw `Not implemented`;
		}
	}
}

export interface ZrCheckableTypes {
	string: string;
	number: number;
	boolean: boolean;
	undefined: ZrUndefined;
	array: ZrValue[];
	function: ZrLuauFunction | ZrUserFunction;
	range: ZrRange;
	object: ZrObject;
	userdata: ZrUserdata<object>;
	enum: ZrEnum;
	any: ZrValue;
}

type ZrValueTypeOf = keyof ZrCheckableTypes;
export namespace ZrValidation {
	export function typeOf(value: ZrValue | undefined): ZrValueTypeOf {
		if (value === undefined) {
			return "undefined";
		}

		if (is(value, "string")) {
			return "string";
		} else if (is(value, "number")) {
			return "number";
		} else if (is(value, "boolean")) {
			return "boolean";
		} else if (value === ZrUndefined || value === undefined) {
			return "undefined";
		} else if (isArray(value)) {
			return "array";
		} else if (value instanceof ZrLuauFunction || value instanceof ZrUserFunction) {
			return "function";
		} else if (value instanceof ZrRange) {
			return "range";
		} else if (value instanceof ZrObject) {
			return "object";
		} else if (value instanceof ZrEnum) {
			return "enum";
		} else if (value instanceof ZrUserdata) {
			return "userdata";
		} else {
			throw `Not implemented`;
		}
	}

	export type ArrayType<T> = T extends Array<infer U> ? U : never;
	export type Check<T extends ZrValue> = (value: ZrValue | undefined) => value is T;
	export type Static<T extends Check<ZrValue>> = T extends Check<infer A> ? A : never;

	export function check<T extends keyof ZrCheckableTypes>(typeId: T) {
		return (value: ZrValue | undefined): value is ZrCheckableTypes[T] => is(value, typeId);
	}

	export function union<T extends Check<ZrValue>[]>(...checks: T): Check<Static<ArrayType<T>>> {
		throw `oops`;
	}

	export function checkDefined(): Check<ZrDefined> {
		return (value: ZrValue | undefined): value is ZrDefined => value !== ZrUndefined && value !== undefined;
	}

	export function optional<T extends ZrValue>(check: Check<T>) {
		return (value: ZrValue | undefined): value is T | ZrUndefined => {
			return check(value) || value === ZrUndefined || value === undefined;
		};
	}

	export function is<T extends keyof ZrCheckableTypes>(
		value: ZrValue | undefined,
		typeId: T,
	): value is ZrCheckableTypes[T] {
		if (typeId === "any") {
			return true;
		}

		if (typeId === "string") {
			return typeIs(value, "string");
		} else if (typeId === "number") {
			return typeIs(value, "number");
		} else if (typeId === "boolean") {
			return typeIs(value, "boolean");
		} else if (typeId === "undefined") {
			return value === ZrUndefined || value === undefined;
		} else if (typeId === "array") {
			return isArray(value);
		} else if (typeId === "function") {
			return value instanceof ZrLuauFunction || value instanceof ZrUserFunction;
		} else if (typeId === "object") {
			return value instanceof ZrObject;
		} else if (typeId === "range") {
			return value instanceof ZrRange;
		} else if (typeId === "userdata") {
			return value instanceof ZrUserdata;
		} else if (typeId === "enum") {
			return value instanceof ZrEnum;
		}

		throw `Invalid typeId: ${typeId}`;
	}
}

export interface ZrBinaryOperationError {
	left: ZrValue;
	right: ZrValue;
	message: string;
}

export namespace ZrBinaryOperation {
	export function add(value1: ZrValue | undefined, value2: ZrValue | undefined): Result<ZrValue, string> {
		if (ZrValidation.is(value1, "number") && ZrValidation.is(value2, "number")) {
			return Result.ok(value1 + value2);
		}

		// if (ZrValidation.is(value1, "range") && ZrValidation.is(value2, "number")) {
		// 	return Result.ok(new ZrRange(new NumberRange(value1.GetMin(), value1.GetMax() + value2)));
		// } else if (ZrValidation.is(value1, "number") && ZrValidation.is(value2, "range")) {
		// 	return Result.ok(value1 + (value2.GetMax() - value2.GetMin()));
		// }

		return Result.err(`Attempt to perform (add) on '${typeOf(value1) + "' and '" + typeOf(value2)}'`);
	}

	export function sub(value1: ZrValue | undefined, value2: ZrValue | undefined): Result<ZrValue, string> {
		if (ZrValidation.is(value1, "number") && ZrValidation.is(value2, "number")) {
			return Result.ok(value1 - value2);
		}

		return Result.err(`Attempt to perform (sub) on '${typeOf(value1) + "' and '" + typeOf(value2)}'`);
	}

	export function div(value1: ZrValue | undefined, value2: ZrValue | undefined): Result<ZrValue, string> {
		if (ZrValidation.is(value1, "number") && ZrValidation.is(value2, "number")) {
			return Result.ok(value1 / value2);
		}

		return Result.err(`Attempt to perform (div) on '${typeOf(value1) + "' and '" + typeOf(value2)}'`);
	}

	export function mul(value1: ZrValue | undefined, value2: ZrValue | undefined): Result<ZrValue, string> {
		if (ZrValidation.is(value1, "number") && ZrValidation.is(value2, "number")) {
			return Result.ok(value1 * value2);
		}

		return Result.err(`Attempt to perform (mul) on '${typeOf(value1) + "' and '" + typeOf(value2)}'`);
	}

	export function nullc(value: ZrValue | undefined, elseValue: ZrValue): ZrValue {
		return value !== undefined && value !== ZrUndefined ? value : elseValue;
	}

	export function gt(left: ZrValue | undefined, right: ZrValue | undefined): Result<boolean, string> {
		if (ZrValidation.is(left, "number") && ZrValidation.is(right, "number")) {
			return Result.ok(left > right);
		}

		return Result.err(`Attempt to compare values '${typeOf(left) + "' and '" + typeOf(right)}'`);
	}

	export function lt(left: ZrValue | undefined, right: ZrValue | undefined): Result<boolean, string> {
		if (ZrValidation.is(left, "number") && ZrValidation.is(right, "number")) {
			return Result.ok(left > right);
		}

		return Result.err(`Attempt to compare values '${typeOf(left) + "' and '" + typeOf(right)}'`);
	}

	export function range(left: ZrValue | undefined, right: ZrValue | undefined): Result<ZrRange, string> {
		if (ZrValidation.is(left, "number") && ZrValidation.is(right, "number")) {
			return Result.ok(new ZrRange(new NumberRange(left, right)));
		}

		return Result.err(`Attempt to create a range from '${typeOf(left) + "' and '" + typeOf(right)}'`);
	}
}
