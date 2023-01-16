import variantModule, { TypeNames, VariantOf } from "@rbxts/variant";
import { isArray } from "Util";
import { ZrEnum } from "./Enum";
import { ZrEnumItem } from "./EnumItem";
import { ZrValue } from "./Locals";
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
