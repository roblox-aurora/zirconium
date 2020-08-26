import Net from "@rbxts/net";
import { CmdRemoteId } from "..";
import { AstCommandDefinitions } from "@rbxts/cmd-ast/out/Definitions/Definitions";
import { CommandBase } from "../class/CommandBase";

const GetCommands = new Net.ClientFunction<AstCommandDefinitions>(CmdRemoteId.GetCommands);

export namespace CmdClientRegistryService {
	const commands = new Array<CommandBase>();

	export function GetServerCommands() {
		return GetCommands.CallServerAsync();
	}

	export async function GetClientCommands() {
		return commands.map((c) => c.getAstDefinition());
	}

	export function RegisterClientCommand<C extends CommandBase>(command: C) {
		commands.push(command);
	}
}
export type CmdClientRegistryService = typeof CmdClientRegistryService;
