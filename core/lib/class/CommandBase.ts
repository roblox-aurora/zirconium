import { CommandStatement } from "@rbxts/cmd-ast/out/Nodes/NodeTypes";
import { CmdCoreDispatchService, ExecutionParams } from "../services/DispatchService";
import { AstCommandDefinition } from "@rbxts/cmd-ast/out/Definitions/Definitions";
import { GroupType } from "./CommandGroup";

export abstract class CommandBase {
	constructor(protected readonly command: string, public readonly groups: GroupType[]) {}

	/** @internal */
	public matchesCommand(statement: CommandStatement) {
		return statement.command.name.text === this.command;
	}

	public getAstDefinition(): AstCommandDefinition {
		return {
			command: this.command,
			options: {},
			args: [],
		};
	}

	public abstract executeStatement(
		statement: CommandStatement,
		dispatch: CmdCoreDispatchService,
		player: Player,
		params: ExecutionParams,
	): unknown;
}
