import type { CustomCommandType } from "../types/Types";
import { CommandBase } from "../class/CommandBase";
import { GroupType } from "../class/CommandGroup";
import EchoBuiltInCommand from "inbuilt/EchoCommand";

export namespace CmdCoreRegistryService {
	const commands = new Array<CommandBase>();
	const playerPermissions = new Map<number, Set<GroupType>>();
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

	export function RegisterDefaultCommands() {
		RegisterCommand(EchoBuiltInCommand);
	}

	export function GetCommands(): ReadonlyArray<CommandBase> {
		return commands;
	}

	export function GetCommandsForPlayer(player: Player) {
		return commands.filter((c) => {
			const permissions = playerPermissions.get(player.UserId);
			if (!permissions) {
				return false;
			}

			for (const group of c.groups) {
				if (permissions.has(group)) {
					return true;
				}
			}

			return false;
		});
	}

	export function GetCommandDeclarations(player: Player) {
		return GetCommandsForPlayer(player).map((c) => {
			return c.getAstDefinition();
		});
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

	const isCreator = (player: Player) => {
		const creatorId = game.CreatorId;
		const creatorType = game.CreatorType;
		if (creatorType === Enum.CreatorType.Group) {
			return player.GetRankInGroup(creatorId);
		} else {
			return player.UserId === creatorId;
		}
	};

	export function GetUserGroups({ UserId }: Player): GroupType[] {
		return playerPermissions.get(UserId)?.values() ?? [GroupType.User];
	}

	export function RegisterPlayer(player: Player) {
		const perms = [GroupType.User];
		if (isCreator(player)) {
			perms.push(GroupType.Creator);
		}

		print("[CmdRegistry] Registered", player, "under", perms.map((p) => GroupType[p]).join(", "));

		playerPermissions.set(player.UserId, new Set(perms));
	}

	export function AddGroupToPlayer(player: Player, type: GroupType) {
		const perms = playerPermissions.get(player.UserId);
		if (perms !== undefined) {
			perms.add(type);
		}
	}

	export function UnregisterPlayer(player: Player) {
		playerPermissions.delete(player.UserId);
	}
}

export type CmdCoreRegistryService = typeof CmdCoreRegistryService;
