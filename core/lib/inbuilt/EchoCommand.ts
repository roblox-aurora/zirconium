import { Command } from "class/Command";
import { GroupType } from "class/CommandGroup";

const EchoBuiltInCommand = Command.create({
	command: "echo",
	groups: [GroupType.User, GroupType.Moderator, GroupType.Administrator, GroupType.Developer, GroupType.Creator],
	args: [{ type: ["string", "number", "boolean"], varadic: true }],
	options: {
		separator: { type: "string", default: " " },
	},
	execute: (ctx, args) => {
		const argString = args.Arguments.filterUndefined().join(args.Options.separator);
		ctx.PushOutput(argString);
	},
});
export = EchoBuiltInCommand;
