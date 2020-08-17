import { CommandStatement } from "@rbxts/cmd-ast/out/Nodes/NodeTypes";
import { CmdCoreDispatchService, ExecutionParams } from "../services/DispatchService";

export abstract class CommandBase {
	constructor(protected readonly command: string) {}

	/** @internal */
	public matchesCommand(statement: CommandStatement) {
		return statement.command.name.text === this.command;
	}

	public abstract executeStatement(
		statement: CommandStatement,
		dispatch: CmdCoreDispatchService,
		player: Player,
		params: ExecutionParams,
	): unknown;
}
