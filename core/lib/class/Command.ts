import { CommandOptions, CommandArgument, isCmdTypeDefinition, MappedOptions, MappedArgs } from "../types/Types";
import { CommandInterpreterOption, CommandInterpreterDeclaration } from "../interpreter/CommandAstInterpreter";
import CommandContext from "./CommandContext";

export interface CommandDeclaration<O extends CommandOptions, A extends CommandArgument[], R> {
	command: string;
	options: O;
	args: A;
	execute(this: void, context: CommandContext<O>, args: ExecutionArgs<O, A>): R;
}

export interface ExecutionArgs<K extends CommandOptions, A> {
	Options: MappedOptions<K>;
	Arguments: MappedArgs<A>;
}

export class Command<O extends CommandOptions = defined, A extends CommandArgument[] = [], R = unknown> {
	private command: string;
	private options: O;
	private args: A;
	private execute: CommandDeclaration<O, A, R>["execute"];

	constructor({ command, options, args, execute }: CommandDeclaration<O, A, R>) {
		// TODO:
		this.command = command;
		this.options = options;
		this.args = args;
		this.execute = execute;
	}

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
	public getInterpreterArguments(): ("string" | "number" | "boolean")[] {
		return [];
	}

	public getInterpreterOptions(): CommandInterpreterOption[] {
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

	/** @internal */
	public executeForPlayer(mappedOptions: Map<string, defined>, args: Array<defined>, executor: Player): R {
		const remapped: Record<string, defined> = {};
		for (const [name, opt] of mappedOptions) {
			const option = this.options[name];
			if (option !== undefined) {
				const { type: optionType } = option;
				if (isCmdTypeDefinition(optionType)) {
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
					const result = optionType.parse(value);
					remapped[name] = result;
				} else {
					remapped[name] = opt;
				}
			}
		}

		const argMap = new Array<defined>();
		for (const [index, val] of args.entries()) {
			const { type: optionType } = this.args[index];
			if (isCmdTypeDefinition(optionType)) {
				if (!typeIs(val, "string")) {
					throw `Invalid type for custom value`;
				}

				const value = optionType.transform?.(val, executor) ?? val;
				if (value === undefined) {
					throw `[CommandExcecutor] Failed to transform value`;
				}

				const valid = optionType.validate?.(value, executor) ?? { success: true };
				if (valid.success === false) {
					throw `[CommandExecutor] Failed to execute command: ${valid.reason}`;
				}
				const result = optionType.parse(value);
				argMap.push(result);
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
			}),
			{
				Options: remapped as MappedOptions<O>,
				Arguments: argMap as MappedArgs<A>,
			},
		);
	}

	public static create<O extends CommandOptions, A extends CommandArgument[], R>(
		declaration: CommandDeclaration<O, A, R>,
	) {
		return new Command(declaration);
	}

	/**
	 * Function that correctly types arguments, unfortunately required atm.
	 * @param commandArgs The argument types
	 */
	public static args<A extends CommandArgument[]>(...commandArgs: A) {
		return commandArgs;
	}
}
