import Lazy from "./internal/Lazy";
import { GetCommandService } from "./services";
import Net from "@rbxts/net";
import { RemoteId } from "remote";

const RunService = game.GetService("RunService");
const IsServer = RunService.IsServer();

export namespace CmdServer {
	if (IsServer) {
		Net.CreateFunction(RemoteId.GetCommands);
		Net.CreateFunction(RemoteId.DispatchToServer);
	}

	export const Registry = Lazy(() => {
		assert(IsServer, "Zirconium Service only accessible on server");
		return GetCommandService("RegistryService");
	});
	export const Dispatch = Lazy(() => {
		assert(IsServer, "Zirconium Service only accessible on server");
		return GetCommandService("DispatchService");
	});
}

// export namespace CmdClient {
// 	// export const Dispatch = Lazy(() => {
// 	// 	return undefined;
// 	// });
// }
