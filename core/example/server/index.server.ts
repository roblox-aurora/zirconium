import { Command } from "@cmd-core/class/Command";
import { CmdServer } from "@cmd-core";
import Net from "@rbxts/net";
import t from "@rbxts/t";
import { GroupType } from "./class/CommandGroup";

const killCommand = Command.create({
	command: "kill",
	options: {
		withExplosion: { type: "switch", alias: ["e"] },
	},
	groups: [GroupType.Creator],
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
	groups: [GroupType.Creator],
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
	groups: [GroupType.Creator],
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
	groups: [GroupType.Creator, GroupType.User],
	options: {
		prefix: { type: "string", alias: ["p"], default: "*" },
		numTest: { type: ["number"] },
	},
	args: [{ type: ["string", "number", "boolean"], variadic: true }] as const,
	children: [
		Command.create({
			command: "workspace",
			options: {},
			groups: [GroupType.Creator, GroupType.User],
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
		if (args.Options.numTest) {
			print("numTest");
		}

		const message = (args.Options.prefix ?? "") + args.Arguments.filterUndefined().map(tostring).join(" ");
		ctx.PushOutput(message);
	},
});

const listVars = Command.create({
	command: "env",
	groups: [GroupType.Creator],
	options: {
		name: { type: "string" },
	},
	args: [{ type: "player" }],
	execute: (ctx, args) => {
		const vars = ctx.GetVariables();

		const [plr] = args.Arguments;
		if (plr !== undefined) {
			const vars = CmdServer.Dispatch.getVariablesForPlayer(plr);
			ctx.PushOutput("Vars for " + plr.Name);
			for (const [name, value] of Object.entries(vars)) {
				ctx.PushOutput(`$${name} = ${tostring(value)}`);
			}
		} else {
			if (args.Options.name) {
				ctx.PushOutput(tostring(vars[args.Options.name]));
			} else {
				for (const [name, value] of Object.entries(vars)) {
					ctx.PushOutput(`$${name} = ${tostring(value)}`);
				}
			}
		}
	},
});

CmdServer.Registry.RegisterCommand(echoCommand);
CmdServer.Registry.RegisterCommand(listVars);

CmdServer.Registry.RegisterCommand(
	Command.create({
		command: "testargs",
		groups: [GroupType.Creator, GroupType.User],
		args: [
			{ type: "string" },
			{ type: "number" },
			{ type: ["string", "number", "boolean"], varadic: true },
		] as const,
		options: {},
		execute: (ctx, args) => {
			for (const arg of args.Arguments) {
				print(arg);
			}
		},
	}),
);

// const testSend = new Net.ServerEvent("TestSendEvent", t.string);
// testSend.Connect((player, message) => {
// 	const { stdout } = CmdServer.Dispatch.Execute(message, player);
// 	for (const message of stdout) {
// 		print("[info]", message);
// 	}
// });
