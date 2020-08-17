import { Command } from "@cmd-core/class/Command";
import { CmdServer } from "@cmd-core";
import CommandTypes, { Player } from "./types";
import Net from "@rbxts/net";
import t from "@rbxts/t";

const killCommand = Command.create({
	command: "kill",
	options: {
		withExplosion: { type: "switch", alias: ["e"] },
	},
	args: [{ type: "player", required: true }] as const,
	execute: (_, { Arguments: [player], Options }) => {
		if (Options.withExplosion) {
			const explode = new Instance("Explosion");
			explode.Position = player.Character?.GetPrimaryPartCFrame().Position ?? new Vector3();
			explode.Parent = game.Workspace;
		} else {
			player.Character?.BreakJoints();
		}
	},
});

const jq = Command.create({
	command: "json",
	options: {
		wrap: { type: "string", default: "" },
	},
	args: [],
	execute: (ctx, args) => {
		const http = game.GetService("HttpService");

		const input = ctx.GetInput();
		if (input.size() > 0) {
			for (const value of input) {
				ctx.PushOutput(
					`${args.Options.wrap}` + http.JSONEncode(http.JSONDecode(value)) + `${args.Options.wrap}`,
				);
			}
		} else {
			for (const value of args.Arguments) {
				ctx.PushOutput(
					`${args.Options.wrap}` + http.JSONEncode(http.JSONDecode(tostring(value))) + `${args.Options.wrap}`,
				);
			}
		}
	},
});

const upper = Command.create({
	command: "caps",
	options: {},
	args: [],
	execute: (ctx, args) => {
		const input = ctx.GetInput();
		if (input.size() > 0) {
			for (const value of input) {
				ctx.PushOutput(value.upper());
			}
		} else {
			for (const value of args.Arguments) {
				ctx.PushOutput(tostring(value).upper());
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
	children: [
		Command.create({
			command: "workspace",
			options: {},
			args: [{ type: "string" }] as const,
			execute: (ctx, args) => {
				const [name] = args.Arguments;

				if (name) {
					ctx.PushOutput(tostring(game.Workspace.FindFirstChild(name)));
				}
			},
		}),
	],
	execute: (ctx, args) => {
		if (ctx.IsOutputPiped()) {
			ctx.PushOutput((args.Arguments as readonly defined[]).map(tostring).join(" "));
		} else {
			ctx.PushOutput((args.Arguments as readonly defined[]).map(tostring).join(" "));
		}
	},
});

const listVars = Command.create({
	command: "env",
	options: {
		name: { type: "string" },
	},
	args: [],
	execute: (ctx, args) => {
		const vars = ctx.GetVariables();

		if (args.Options.name) {
			ctx.PushOutput(tostring(vars[args.Options.name]));
		} else {
			for (const [name, value] of Object.entries(vars)) {
				ctx.PushOutput(`$${name} = ${tostring(value)}`);
			}
		}
	},
});

CmdServer.Registry.RegisterCommand(echoCommand);
CmdServer.Registry.RegisterCommand(listVars);

const testSend = new Net.ServerEvent("TestSendEvent", t.string);
testSend.Connect((player, message) => {
	const { stdout } = CmdServer.Dispatch.Execute(message, player);
	for (const message of stdout) {
		print("[info]", message);
	}
});

const GetCommands = new Net.ServerFunction("GetCommands");
GetCommands.SetCallback((_) => CmdServer.Registry.GetCommandDeclarations());
