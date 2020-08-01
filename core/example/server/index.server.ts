import { Command } from "@cmd-core/class/Command";
import { Registry, Dispatch } from "@cmd-core";
import { PlayerType } from "./types/PlayerType";
import { CommandArgument } from "./types/Types";

function createArgumentList<A extends CommandArgument[]>(...commandArgs: A) {
	return commandArgs;
}

const testCommand = Command.create({
	command: "test",
	options: {
		test: { type: "string", default: "test" },
		test2: { type: PlayerType },
	} as const,
	args: Command.args({ type: "string" }, { type: "boolean" }),
	execute(context, args) {
		// TODO
	},
});

Registry.RegisterCommand(testCommand);

game.GetService("Players").PlayerAdded.Connect((player) => {
	player.Chatted.Connect((message) => {
		if (message.sub(0, 0) === "/") {
			Dispatch.Execute(message.sub(1), player);
		}
	});
});
