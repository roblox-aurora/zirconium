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
			// return player.Character;
		} else {
			player.Character?.BreakJoints();
			// return player.Character;
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
		prefix: { type: "string", alias: ["p"], default: "*" },
	},
	args: [],
	execute: (ctx, args) => {
		ctx.PushOutput((args.Arguments as readonly defined[]).map(tostring).join(" "));
	},
});

Registry.RegisterCommand(killCommand);
Registry.RegisterCommand(echoCommand);
Registry.RegisterCommand(jq);

game.GetService("Players").PlayerAdded.Connect((player) => {
	player.Chatted.Connect((message) => {
		if (message.sub(0, 0) === "/") {
			const { stdout } = Dispatch.Execute(message.sub(1), player);
			for (const message of stdout) {
				print("[info]", message);
			}
		}
	});
});
