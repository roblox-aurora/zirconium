import Net from "@rbxts/net";
import { CmdRemoteId } from "..";
import { CmdClientRegistryService } from "./ClientRegistryService";

export enum DispatchContext {
	Server,

	/** @internal */
	Client,
}

export namespace CmdClientDispatchService {
	let Registry!: CmdClientRegistryService;

	/** @internal */
	export const dependencies = ["ClientRegistryService"];

	/** @internal */
	export function LoadDependencies(registry: CmdClientRegistryService) {
		Registry = registry;
	}

	function InvokeServer(source: string) {
		Net.WaitForClientEventAsync(CmdRemoteId.DispatchToServer).then((dispatch) => {
			dispatch.SendToServer(source);
		});
	}

	export function Execute(source: string, context = DispatchContext.Server) {
		if (context === DispatchContext.Server) {
			InvokeServer(source);
		} else {
			throw `Not yet implemented`;
		}
	}

	export const ServerStdout = new Net.ClientEvent(CmdRemoteId.StdOutput);
	export const ServerStderr = new Net.ClientEvent(CmdRemoteId.StdErr);
}
export type CmdClientDispatchService = typeof CmdClientDispatchService;
