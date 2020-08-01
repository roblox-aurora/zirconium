import { Command } from "@cmd-core/class/Command";
import { Registry, Dispatch } from "@cmd-core";
import { PlayerType } from "./types/PlayerType";

const testCommand = Command.create({
	command: "test",
	options: {
		test: { type: "string", default: "test" },
		test2: { type: PlayerType },
	} as const,
	args: [{ type: "string" }, { type: "number" }],
	execute(context, args) {
		// TODO
	},
});

Registry.RegisterCommand(testCommand);

game.GetService("Players").PlayerAdded.Connect((player) => {
	player.Chatted.Connect((message) => {
		if (message.sub(0, 0) === "/") {
			Dispatch.Execute(message, player);
		}
	});
});
