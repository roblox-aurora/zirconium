import t from "@rbxts/t";

interface ValidationSuccessResult {
	success: true;
}
interface ValidationFailResult {
	success: false;
	reason: string;
}

export type ValidationResult = ValidationSuccessResult | ValidationFailResult;

export interface CustomCommandType<T = string, R = T> {
	displayName?: string;

	/**
	 *
	 * @param value The string representation
	 * @returns The transformed representation
	 */
	transform?(value: string, executor: Player): T;

	validate?(value: T, executor: Player): ValidationResult;

	parse(value: T): R;
}

export const enum CommandType {
	String = "string",
	Number = "number",
	Boolean = "boolean",
	Switch = "switch",
}

interface CommandArgumentType<T> {
	type: T;
	alias?: string[];
}

interface StringCommandArgument extends CommandArgumentType<"string" | CommandType.String> {
	default?: string;
}

interface NumberCommandArgument extends CommandArgumentType<"number" | CommandType.Number> {
	default?: number;
}

interface BooleanCommandArgument extends CommandArgumentType<"boolean" | CommandType.Boolean> {
	default?: boolean;
}

interface SwitchCommandArgument extends CommandArgumentType<"switch" | CommandType.Switch> {
	default?: never;
}

export interface CustomTypeArgument<T, U> extends CommandArgumentType<CustomCommandType<T, U>> {
	required?: boolean;
	default?: defined;
}

export type CommandArgument =
	| StringCommandArgument
	| BooleanCommandArgument
	| NumberCommandArgument
	| CustomTypeArgument<defined, defined>;

export type CommandOptionArgument = CommandArgument | SwitchCommandArgument;

export type CommandOptions = Record<string, SwitchCommandArgument>;

const _isCmdTypeDefinition = t.interface({
	parse: t.callback,
	transform: t.optional(t.callback),
	validate: t.optional(t.callback),
	displayName: t.optional(t.string),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCmdTypeDefinition(value: unknown): value is CustomCommandType<unknown, unknown> {
	return _isCmdTypeDefinition(value);
}

type GetResultingType<T, U> = U extends { default: T } ? T : U extends { required: true } ? T : T | undefined;
type InferType<T> = T extends { type: CommandType.String | "string" }
	? GetResultingType<string, T>
	: T extends { type: CommandType.Number | "number" }
	? GetResultingType<number, T>
	: T extends { type: CommandType.Switch | "switch" }
	? boolean
	: T extends { type: CommandType.Boolean | "boolean" }
	? GetResultingType<boolean, T>
	: T extends { type: CustomCommandType<infer _, infer A> }
	? GetResultingType<A, T>
	: never;

export type MappedOptionsReadonly<T> = { readonly [P in keyof T]: InferType<T[P]> };

export type MappedOptions<T> = { [P in keyof T]: InferType<T[P]> };
export type MappedArgs<T> = T extends [infer A]
	? [InferType<A>]
	: T extends [infer A, infer B]
	? [InferType<A>, InferType<B>]
	: never;
