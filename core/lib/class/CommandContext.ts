import { Command } from "./Command";
import { CommandOptions, MappedOptions } from "../types/Types";

export interface CommandContextOptions<O extends CommandOptions> {
	readonly Command: Command<O, any, any>;
	readonly Name: string;
	readonly Executor: Player;
	readonly Arguments: defined[];
	readonly Options: MappedOptions<O>;
	readonly RawOptions: Map<string, defined>;
	readonly RawArguments: ReadonlyArray<defined>;
}

export default class CommandContext<O extends CommandOptions> {
	private readonly command: Command<O, any, any>;
	private readonly executor: Player;
	public readonly Options: MappedOptions<O>;
	private readonly rawOptions: Map<string, defined>;

	constructor(options: CommandContextOptions<O>) {
		this.command = options.Command;
		this.executor = options.Executor;
		this.Options = options.Options;
		this.rawOptions = options.RawOptions;
	}

	public GetCommand() {
		return this.command;
	}

	public GetExecutor() {
		return this.executor;
	}
}
