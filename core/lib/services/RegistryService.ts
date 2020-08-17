import type { CustomCommandType } from "../types/Types";
import { Command } from "../class/Command";
import { CommandBase } from "../class/CommandBase";
import Net from "@rbxts/net";

export namespace CmdCoreRegistryService {
	const commands = new Array<CommandBase>();
	const types = new Map<string, CustomCommandType<defined>>();
	function makeEnumType<T extends string>(name: string, values: T[]): CustomCommandType<T> {
		return {
			displayName: `Enum(${name})`,
			validate(value) {
				if (values.includes(value as T)) {
					return { success: true };
				} else {
					return {
						success: false,
						reason: `'${value}' is not a valid value for ${name} - Expected ${values.join(", ")}`,
					};
				}
			},
			parse(value) {
				return value;
			},
		};
	}

	export function GetCommands(): ReadonlyArray<CommandBase> {
		return commands;
	}

	export function GetCommandDeclarations() {
		return (
			commands
				// .filter((c): c is Command => c instanceof Command)
				.map((c) => {
					return c.getAstDefinition();
				})
		);
	}

	export function RegisterCommand<C extends CommandBase>(command: C) {
		commands.push(command);
	}

	export function RegisterEnumType<T extends string>(name: string, values: T[]) {
		const e = makeEnumType(name, values);
		types.set(name, e);
		return e;
	}

	export function RegisterType<T, U>(name: string, type: CustomCommandType<T, U>) {
		types.set(name, type);
		return type;
	}
}

export type CmdCoreRegistryService = typeof CmdCoreRegistryService;
