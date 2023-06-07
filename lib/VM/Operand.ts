import { payload, TypeNames, variantModule, VariantOf } from "@rbxts/variant";

function value<T>() {
	return (value: T) => ({ value });
}

export const Operand = variantModule({
	string: value<string>(),
	number: value<number>(),
	boolean: value<boolean>(),
});
export type Operand<T extends TypeNames<typeof Operand> = undefined> = VariantOf<typeof Operand, T>;
