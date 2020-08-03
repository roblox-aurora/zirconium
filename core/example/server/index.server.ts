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

const jq = Command.create({
	command: "json",
	options: {},
	args: [],
	execute: (ctx, args) => {
		const http = game.GetService("HttpService");

		const input = ctx.GetInput();
		if (input.size() > 0) {
			for (const value of input) {
				print(http.JSONEncode(http.JSONDecode(value)));
			}
		} else {
			for (const value of args.Arguments) {
				print(http.JSONEncode(http.JSONDecode(tostring(value))));
			}
		}
	},
});

const echoCommand = Command.create({
	command: "print",
	options: {
		prefix: { type: Player, alias: ["p"], default: "*" },
	},
	args: [],
	execute: (ctx, args) => {
		for (const arg of args.Arguments) {
			ctx.PushOutput(tostring(arg));
		}

		if (!ctx.IsOutputPiped()) {
			print(args.Options.prefix, ...args.Arguments);
		}
		return (args.Arguments as readonly defined[]).map(tostring).join(" ");
	},
});

Registry.RegisterCommand(killCommand);
Registry.RegisterCommand(echoCommand);
Registry.RegisterCommand(jq);

game.GetService("Players").PlayerAdded.Connect((player) => {
	player.Chatted.Connect((message) => {
		if (message.sub(0, 0) === "/") {
			Dispatch.Execute(message.sub(1), player);
		}
	});
});
