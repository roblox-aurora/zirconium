import {
	CommandOptions,
	CommandArgument,
	isCmdTypeDefinition,
	MappedOptions,
	MappedOptionsReadonly,
	ExecutionOptions,
	CommandOptionArgument,
} from "../types/Types";
import CommandAstInterpreter, {
	CommandInterpreterOption,
	CommandInterpreterDeclaration,
	CommandInterpreterArgument,
	ValidationType,
} from "../interpreter/CommandAstInterpreter";
import CommandContext from "./CommandContext";
import { CommandBase } from "./CommandBase";
import { CommandStatement, CommandName } from "@rbxts/cmd-ast/out/Nodes/NodeTypes";
import { CmdCoreDispatchService, ExecutionParams } from "../services/DispatchService";
import {
	AstCommandDefinition,
	AstOptionDefinition,
	AstArgumentDefinition,
	AstPrimitiveType,
} from "@rbxts/cmd-ast/out/Definitions/Definitions";
import { typeGuards, CmdSyntaxKind } from "@rbxts/cmd-ast/out/Nodes";
import { createCommandStatement } from "@rbxts/cmd-ast/out/Nodes/Create";

export interface CommandDeclaration<O extends CommandOptions, A extends ReadonlyArray<CommandArgument>, R> {
	command: string;
	options: O;
	args: A;
	execute?: (this: void, context: CommandContext<O>, args: ExecutionArgs<O, A>) => R;
	children?: readonly Command<any, any, any>[];
}

export interface ExecutionArgs<K extends CommandOptions, A extends readonly CommandArgument[]> {
	Options: MappedOptions<K> & { stdin?: defined };
	Arguments: MappedOptionsReadonly<A>;
}

export class Command<
	O extends CommandOptions = defined,
	A extends ReadonlyArray<CommandArgument> = [],
	R = unknown
> extends CommandBase {
	public readonly options: O;
	public readonly args: A;
	private execute: CommandDeclaration<O, A, R>["execute"];
	private children: readonly Command[] | undefined;

	private constructor({ command, options, args, execute, children }: CommandDeclaration<O, A, R>) {
		super(command);
		this.options = options;
		this.args = args;
		this.children = children;
		this.execute = execute;
	}

	private typeToAstType(typeName: CommandOptionArgument["type"]): AstPrimitiveType {
		if (typeIs(typeName, "table")) {
			return "string";
		} else if (typeName === "player") {
			return "string";
		} else {
			return typeName;
		}
	}

	private getAstOptionDefinitions(): Readonly<Record<string, AstOptionDefinition>> | undefined {
		if (Object.isEmpty(this.options)) {
			return undefined;
		}

		const list: Record<string, AstOptionDefinition> = {};
		for (const [key, { type: optionType }] of Object.entries(this.options)) {
			if (typeIs(optionType, "table")) {
				if (!isCmdTypeDefinition(optionType)) {
					const argl = new Array<AstPrimitiveType>();
					for (const subType of optionType) {
						argl.push(this.typeToAstType(subType));
					}
					list[key] = { type: argl };
				} else {
					list[key] = { type: ["string"] };
				}
			} else {
				list[key] = { type: [this.typeToAstType(optionType)] };
			}
		}
		return list;
	}

	public getAstArgumentDefinitions(): readonly AstArgumentDefinition[] | undefined {
		if (this.args.size() === 0) {
			return undefined;
		}

		const list = new Array<AstArgumentDefinition>();
		for (const arg of this.args) {
			const { type: argType, varadic } = arg;
			if (typeIs(argType, "table")) {
				if (!isCmdTypeDefinition(argType)) {
					const argl = new Array<AstPrimitiveType>();
					for (const subType of argType) {
						argl.push(this.typeToAstType(subType));
					}
					list.push({ type: argl, varadic });
				} else {
					list.push({ type: ["string"], varadic });
				}
			} else {
				list.push({ type: [this.typeToAstType(argType)], varadic });
			}
		}
		return list;
	}

	public getAstDefinition(): AstCommandDefinition {
		if (this.children) {
			const defs = new Array<AstCommandDefinition>();
			for (const child of this.children) {
				defs.push(child.getAstDefinition());
			}

			return {
				command: this.command,
				options: this.getAstOptionDefinitions(),
				args: this.getAstArgumentDefinitions(),
				children: defs,
			};
		} else {
			return {
				command: this.command,
				options: this.getAstOptionDefinitions(),
				args: this.getAstArgumentDefinitions(),
			};
		}
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
			if (isCmdTypeDefinition(arg.type)) {
				args.push({
					type: ["string"],
					default: arg.default,
				});
			} else if (typeIs(arg.type, "table")) {
				const types = new Array<ValidationType>();
				for (const t of arg.type) {
					if (typeIs(t, "table")) {
						types.push("string");
					} else {
						types.push(t);
					}
				}

				args.push({
					default: arg.default,
					type: types,
				});
			} else {
				// Primitives
				args.push({
					type: [arg.type],
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
			if (isCmdTypeDefinition(option.type)) {
				options.push({
					name,
					default: option.default as defined,
					alias: option.alias,
					type: ["string"],
				});
			} else if (typeIs(option.type, "table")) {
				const types = new Array<ValidationType>();
				for (const t of option.type) {
					if (typeIs(t, "table")) {
						types.push("string");
					} else {
						types.push(t);
					}
				}

				options.push({
					name,
					default: option.default,
					alias: option.alias,
					type: types,
				});
			} else {
				options.push({
					name,
					alias: option.alias,
					default: option.default as defined,
					type: [option.type as "string"],
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

	public executeStatement(
		statement: CommandStatement,
		dispatch: CmdCoreDispatchService,
		executor: Player,
		params: ExecutionParams,
	): R | undefined {
		const command = statement.children.filter((c): c is CommandName =>
			typeGuards.isNode(c, CmdSyntaxKind.CommandName),
		);

		if (command.size() > 1) {
			const spliced = createCommandStatement(command[1], statement.children.slice(1));
			if (this.children) {
				const match: Command | undefined = this.children.find((c) => c.matchesCommand(spliced));
				if (match) {
					return match.executeStatement(spliced, dispatch, executor, params) as R | undefined;
				} else {
					throw `How did this happen`;
				}
			} else {
				throw `Shouldn't happen`;
			}
		} else {
			assert(statement.command.name.text === this.command, "Invalid execution");
			const variables = dispatch.getVariablesForPlayer(executor);
			variables._cmd = statement.command.name.text;
			const interpreter = new CommandAstInterpreter([this.getCommandDeclaration()]);
			const result = interpreter.interpret(statement, variables);
			const cmd = result[0];
			if (CommandAstInterpreter.isCommand(cmd)) {
				return this.executeForPlayer({
					variables,
					mappedOptions: cmd.options,
					args: cmd.args,
					executor,
					piped: params.pipedOutput,
					stdin: params.stdin,
					stdout: params.stdout,
				});
			}
		}

		// assert(statement.command.name.text === this.command, "Invalid execution");
		// const variables = dispatch.getVariablesForPlayer(executor);
		// variables._cmd = statement.command.name.text;
		// const interpreter = new CommandAstInterpreter([this.getCommandDeclaration()]);
		// const result = interpreter.interpret(statement, variables);
		// const cmd = result[0];
		// if (CommandAstInterpreter.isCommand(cmd)) {
		// 	return this.executeForPlayer({
		// 		variables,
		// 		mappedOptions: cmd.options,
		// 		args: cmd.args,
		// 		executor,
		// 		piped: params.pipedOutput,
		// 		stdin: params.stdin,
		// 		stdout: params.stdout,
		// 	});
		// }
	}

	/** @internal */
	private executeForPlayer({
		variables,
		mappedOptions,
		args,
		executor,
		stdin,
		stdout,
		piped,
	}: ExecutionOptions): R | undefined {
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

		if (this.execute !== undefined) {
			return this.execute(
				new CommandContext({
					Command: this,
					Options: remapped as MappedOptions<O>,
					Arguments: argMap,
					RawArguments: this.args,
					RawOptions: mappedOptions,
					Executor: executor,
					Name: this.command,
					Input: stdin,
					Output: stdout,
					IsPipedOutput: piped,
					Variables: variables,
				}),
				{
					Options: remapped as MappedOptions<O>,
					Arguments: (argMap as ReadonlyArray<defined>) as MappedOptionsReadonly<A>,
				},
			);
		} else {
			return undefined;
		}
	}

	public static create<O extends CommandOptions, A extends ReadonlyArray<CommandArgument>, R>(
		declaration: CommandDeclaration<O, A, R>,
	) {
		return new Command(declaration);
	}
}
