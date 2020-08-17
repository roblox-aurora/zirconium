import Lazy from "./internal/Lazy";
import { GetCommandService } from "./services";
import Net from "@rbxts/net";
import t from "@rbxts/t";

const RunService = game.GetService("RunService");
const IsServer = RunService.IsServer();

export const enum CmdRemoteId {
	GetCommands = "CmdGetCommands",
	DispatchToServer = "CmdSrvDispatch",
	StdOutput = "CmdSrvStdout",
}

export namespace CmdServer {
	export const Registry = Lazy(() => {
		assert(IsServer, "CmdCore Service only accessible on server");
		return GetCommandService("RegistryService");
	});
	export const Dispatch = Lazy(() => {
		assert(IsServer, "CmdCore Service only accessible on server");
		return GetCommandService("DispatchService");
	});

	if (IsServer) {
		const Stdout = new Net.ServerEvent(CmdRemoteId.StdOutput);
		const DispatchToServer = new Net.ServerEvent(CmdRemoteId.DispatchToServer, t.string);
		DispatchToServer.Connect((player, execute) => {
			const { stdout } = Dispatch.Execute(execute, player);
			for (const message of stdout) {
				Stdout.SendToPlayer(player, message);
			}
		});

		const GetCommands = new Net.ServerFunction(CmdRemoteId.GetCommands);
		GetCommands.SetCallback((_) => Registry.GetCommandDeclarations());
	}
}

export namespace CmdClient {
	export const Dispatch = Lazy(() => GetCommandService("ClientDispatchService"));
	export const Registry = Lazy(() => GetCommandService("ClientRegistryService"));
}
