import { payload, TypeNames, variantModule, VariantOf } from "@rbxts/variant";
import { ZrValue } from "Data/Locals";
import ZrUndefined from "Data/Undefined";

function value<T extends ZrValue>() {
	return (value: T) => ({ value });
}

export const Operand = variantModule({
	string: value<string>(),
	number: value<number>(),
});
export type Operand<T extends TypeNames<typeof Operand> = undefined> = VariantOf<typeof Operand, T>;
