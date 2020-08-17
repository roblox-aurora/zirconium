import Net from "@rbxts/net";
import { CmdRemoteId } from "..";
import { AstCommandDefinitions } from "@rbxts/cmd-ast/out/Definitions/Definitions";

const GetCommands = new Net.ClientFunction<AstCommandDefinitions>(CmdRemoteId.GetCommands);

export namespace CmdClientRegistryService {
	export function GetServerCommands() {
		return GetCommands.CallServerAsync();
	}
}
export type CmdClientRegistryService = typeof CmdClientRegistryService;
