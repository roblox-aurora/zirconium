import { Command } from "@cmd-core/class/Command";
import { Registry, Dispatch } from "@cmd-core";
import CommandTypes, { Player } from "./types";

const killCommand = Command.create({
	command: "kill",
	options: {
		withExplosion: { type: "switch", alias: ["e"] },
	},
	args: [{ type: CommandTypes.Player, required: true }] as const,
	execute: (_, { Arguments: [player], Options }) => {
		if (Options.withExplosion) {
			const explode = new Instance("Explosion");
			explode.Position = player.Character?.GetPrimaryPartCFrame().Position ?? new Vector3();
			explode.Parent = game.Workspace;
			return player.Character;
		} else {
			player.Character?.BreakJoints();
			return player.Character;
		}
	},
});

const echoCommand = Command.create({
	command: "echo",
	options: {
		prefix: { type: "string", default: "[PRINT]", alias: ["p"] },
	},
	args: [],
	execute: (_, args) => {
		print(args.Options.prefix, ...args.Arguments);

		return (args.Arguments as defined[]).join(" ");
	},
});

Registry.RegisterCommand(killCommand);
Registry.RegisterCommand(echoCommand);

game.GetService("Players").PlayerAdded.Connect((player) => {
	player.Chatted.Connect((message) => {
		if (message.sub(0, 0) === "/") {
			Dispatch.Execute(message.sub(1), player);
		}
	});
});
