import Net from "@rbxts/net";
import { CmdRemoteId } from "..";

export namespace CmdClientDispatchService {
	export function InvokeServer(source: string) {
		Net.WaitForClientEventAsync(CmdRemoteId.DispatchToServer).then((dispatch) => {
			dispatch.SendToServer(source);
		});
	}

	export const ServerStdout = new Net.ClientEvent(CmdRemoteId.StdOutput);
}
export type CmdClientDispatchService = typeof CmdClientDispatchService;
