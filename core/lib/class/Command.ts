import {
	CommandOptions,
	CommandArgument,
	isCmdTypeDefinition,
	MappedOptions,
	MappedArgs,
	MappedOptionsReadonly,
	ExecutionOptions,
	CommandOptionArgument,
} from "../types/Types";
import {
	CommandInterpreterOption,
	CommandInterpreterDeclaration,
	CommandInterpreterArgument,
} from "../interpreter/CommandAstInterpreter";
import CommandContext from "./CommandContext";

export interface CommandDeclaration<O extends CommandOptions, A extends ReadonlyArray<CommandArgument>, R> {
	command: string;
	options: O;
	args: A;
	execute(this: void, context: CommandContext<O>, args: ExecutionArgs<O, A>): R;
}

export interface ExecutionArgs<K extends CommandOptions, A> {
	Options: MappedOptions<K> & { stdin?: defined };
	Arguments: MappedOptionsReadonly<A>;
}

export class Command<O extends CommandOptions = defined, A extends ReadonlyArray<CommandArgument> = [], R = unknown> {
	public readonly command: string;
	public readonly options: O;
	public readonly args: A;
	private execute: CommandDeclaration<O, A, R>["execute"];

	constructor({ command, options, args, execute }: CommandDeclaration<O, A, R>) {
		// TODO:
		this.command = command;
		this.options = options;
		this.args = args;
		this.execute = execute;
	}

	/** @internal */
	public getCommandDeclaration(): CommandInterpreterDeclaration {
		return {
			command: this.command,
			options: this.getInterpreterOptions(),
			args: this.getInterpreterArguments(),
		};
	}

	/**
	 * @internal
	 */
	public getInterpreterArguments(): ReadonlyArray<CommandInterpreterArgument> {
		const args = new Array<CommandInterpreterArgument>();

		for (const [_, arg] of Object.entries(this.args)) {
			if (typeIs(arg.type, "table")) {
				args.push({
					type: "string",
					default: arg.default,
				});
			} else {
				args.push({
					type: arg.type,
					default: arg.default,
				});
			}
		}

		return args;
	}

	/** @internal */
	public getInterpreterOptions(): readonly CommandInterpreterOption[] {
		const options = new Array<CommandInterpreterOption>();
		for (const [name, option] of Object.entries(this.options)) {
			if (typeIs(option.type, "table")) {
				options.push({
					name,
					default: option.default,
					alias: option.alias,
					type: "string",
				});
			} else {
				options.push({
					name,
					alias: option.alias,
					default: option.default,
					type: option.type as "string",
				});
			}
		}
		return options;
	}

	private argParse(arg: CommandOptionArgument | CommandArgument, opt: defined, executor: Player) {
		if (isCmdTypeDefinition(arg.type)) {
			const { type: optionType } = arg;

			if (!typeIs(opt, "string")) {
				throw `Invalid type for custom value`;
			}

			const value = optionType.transform?.(opt, executor) ?? opt;
			if (value === undefined) {
				throw `[CommandExcecutor] Failed to transform value`;
			}

			const valid = optionType.validate?.(value, executor) ?? { success: true };
			if (valid.success === false) {
				throw `[CommandExecutor] Failed to execute command: ${valid.reason}`;
			}
			const result = optionType.parse(value) as defined;
			return result;
		} else {
			return opt;
		}
	}

	/** @internal */
	public executeForPlayer({ variables, mappedOptions, args, executor }: ExecutionOptions): R {
		const remapped: Record<string, defined> = {};
		for (const [name, opt] of mappedOptions) {
			const option = this.options[name];
			if (option !== undefined) {
				remapped[name] = this.argParse(option, opt, executor);
			}
		}

		const argMap = new Array<defined>();
		for (const [index, val] of args.entries()) {
			if (this.args.size() > 0) {
				argMap.push(this.argParse(this.args[index], val, executor));
			} else {
				argMap.push(val);
			}
		}

		return this.execute(
			new CommandContext({
				Command: this,
				Options: remapped as MappedOptions<O>,
				Arguments: argMap,
				RawArguments: this.args,
				RawOptions: mappedOptions,
				Executor: executor,
				Name: this.command,
				Variables: variables,
			}),
			{
				Options: remapped as MappedOptions<O>,
				Arguments: (argMap as ReadonlyArray<defined>) as MappedOptionsReadonly<A>,
			},
		);
	}

	public static create<O extends CommandOptions, A extends ReadonlyArray<CommandArgument>, R>(
		declaration: CommandDeclaration<O, A, R>,
	) {
		return new Command(declaration);
	}
}
