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
	private readonly options: MappedOptions<O>;
	private readonly rawOptions: Map<string, defined>;

	constructor(options: CommandContextOptions<O>) {
		this.command = options.Command;
		this.executor = options.Executor;
		this.options = options.Options;
		this.rawOptions = options.RawOptions;
	}

	public GetOption<K extends keyof O>(key: K): MappedOptions<O>[K] {
		return this.options[key];
	}

	public GetCommand() {
		return this.command;
	}

	public GetExecutor() {
		return this.executor;
	}
}
