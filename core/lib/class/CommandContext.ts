import { Command } from "./Command";
import { CommandOptions, MappedOptions } from "../types/Types";

export interface CommandContextOptions<O extends CommandOptions> {
	readonly Command: Command<O, any, any>;
	readonly Name: string;
	readonly Executor: Player;
	readonly Arguments: defined[];
	readonly Options: MappedOptions<O>;
	readonly RawOptions: Map<string, defined>;
	readonly Variables: Record<string, defined>;
	readonly RawArguments: ReadonlyArray<defined>;
	readonly Input: readonly string[];
	readonly IsPipedOutput: boolean;
	Output: string[];
}

export default class CommandContext<O extends CommandOptions> {
	private readonly command: Command<O, any, any>;
	private readonly executor: Player;
	public readonly Options: MappedOptions<O>;
	private readonly rawOptions: Map<string, defined>;
	private variables: Record<string, defined>;
	private readonly input: readonly string[];
	private readonly output: string[];
	private readonly piped: boolean;

	constructor(options: CommandContextOptions<O>) {
		this.command = options.Command;
		this.executor = options.Executor;
		this.Options = options.Options;
		this.rawOptions = options.RawOptions;
		this.variables = options.Variables;
		this.input = options.Input;
		this.output = options.Output;
		this.piped = options.IsPipedOutput;
	}

	private getVariable(key: string): unknown {
		return this.variables[key];
	}

	public GetVariables(): Readonly<Record<string, defined>> {
		return this.variables;
	}

	public GetNumberVariable(key: string): number | undefined {
		const value = this.getVariable(key);
		if (typeIs(value, "number")) {
			return value;
		}
	}

	public GetStringVariable(key: string): string | undefined {
		const value = this.getVariable(key);
		if (typeIs(value, "string")) {
			return value;
		}
	}

	public GetInput() {
		return this.input;
	}

	/**
	 * Return whether or not this command is piping the output to another command
	 * e.g. `echo "vorlias" | kill` as an example to pass "vorlias" to kill through a pipe
	 */
	public IsOutputPiped() {
		return this.piped;
	}

	public PushOutput(message: string) {
		this.output.push(message);
	}

	public GetCommand() {
		return this.command;
	}

	public GetExecutor() {
		return this.executor;
	}
}
