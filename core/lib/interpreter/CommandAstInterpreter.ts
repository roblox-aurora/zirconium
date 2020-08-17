import { isNodeIn, getKindName, getNodeKindName, isNode, CmdSyntaxKind } from "@rbxts/cmd-ast/out/Nodes";
import { flattenInterpolatedString, createBooleanNode } from "@rbxts/cmd-ast/out/Nodes/Create";
import { argumentTransformers, getFriendlyName } from "./InterpreterHelpers";
import {
	NodeKind,
	CommandName,
	Option,
	Node,
	NodeTypes,
	CommandStatement,
	CommandSource,
	BinaryExpression,
} from "@rbxts/cmd-ast/out/Nodes/NodeTypes";

type ValidationType = "string" | "number" | "boolean";

export interface CommandInterpreterArgument {
	default?: defined;
	type: ValidationType | "player" | "any" | "var";
}

export interface CommandInterpreterOption {
	name: string;
	alias?: string[];
	default?: defined;
	type: ValidationType | "switch" | "any" | "var";
}

export const enum ResultKind {
	Command,
	SequentialCommands,
}

export interface CommandInterpreterResult {
	kind: ResultKind.Command;
	command: string;
	options: Map<string, defined>;
	args: Array<defined>;
}

export interface CommandInterpreterSequenceResult {
	kind: ResultKind.SequentialCommands;
	left: CommandInterpreterResult;
	right: CommandInterpreterResult;
}

interface InterpreterOptions {
	/**
	 * Throw on invalid options for commands
	 */
	throwOnInvalidOption: boolean;

	/**
	 * Allow the interpreter to work on undefined commands instead of erroring.
	 */
	allowUndefinedCommands: boolean;
}

export interface CommandInterpreterDeclaration {
	command: string;
	options: readonly CommandInterpreterOption[];
	args: readonly CommandInterpreterArgument[];
}

/**
 * Used to interpret given command statements, will throw on invalid options & args
 *
 */
export default class CommandAstInterpreter {
	public static isCommand(
		result: CommandInterpreterSequenceResult | CommandInterpreterResult,
	): result is CommandInterpreterResult {
		return result.kind === ResultKind.Command;
	}

	public static isCommandSeqence(
		result: CommandInterpreterSequenceResult | CommandInterpreterResult,
	): result is CommandInterpreterSequenceResult {
		return result.kind === ResultKind.SequentialCommands;
	}

	constructor(private commands: CommandInterpreterDeclaration[]) {}

	private expectOptionTypes<K extends NodeKind>(
		command: CommandName,
		option: Option,
		node: Node,
		...kind: K[]
	): asserts node is NodeTypes[K] {
		if (!isNodeIn(node, kind)) {
			error(
				`[CommandInterpreter] Invalid option for ${command.name.text}: ${option.flag} expects ${kind
					.map((k) => getKindName(k))
					.join(" | ")}, got ${getNodeKindName(node)}.`,
			);
		}
	}

	private expectOptionType<K extends NodeKind>(
		command: CommandName,
		option: Option,
		node: Node,
		kind: K,
	): asserts node is NodeTypes[K] {
		if (!isNode(node, kind)) {
			error(
				`[CommandInterpreter] Invalid option for ${command.name.text}: ${option.flag} expects ${getKindName(
					kind,
				)}, got ${getNodeKindName(node)}.`,
			);
		}
	}

	public interpret(
		node: CommandStatement | CommandSource | BinaryExpression,
		variables: Record<string, defined>,
		interpreterOptions: InterpreterOptions = { throwOnInvalidOption: true, allowUndefinedCommands: false },
		results = new Array<CommandInterpreterResult | CommandInterpreterSequenceResult>(),
	) {
		if (isNode(node, CmdSyntaxKind.CommandStatement)) {
			results.push(this.interpretCommandStatement(node, variables, interpreterOptions));
		} else if (isNode(node, CmdSyntaxKind.BinaryExpression)) {
			throw `[CommandInterpreter] Not yet supported!`;
		} else if (isNode(node, CmdSyntaxKind.Source)) {
			for (const statement of node.children) {
				if (
					isNode(statement, CmdSyntaxKind.CommandStatement) ||
					isNode(statement, CmdSyntaxKind.BinaryExpression)
				) {
					this.interpret(statement, variables, interpreterOptions, results);
				} else {
					throw `[CommandInterpreter] Cannot intepret ${getNodeKindName(node)}`;
				}
			}
		}
		return results;
	}

	/**
	 * Try interpreting the given statement
	 *
	 * @throws If there are invalid parts to the command - such as invalid options or arguments
	 *
	 * @param statementNode The statement node
	 * @param variables The variables to pass to the interpreter
	 * @param interpreterOptions The interpreter options
	 */
	public interpretCommandStatement(
		statementNode: CommandStatement,
		variables: Record<string, defined>,
		interpreterOptions: InterpreterOptions,
	) {
		const parsedResult: CommandInterpreterResult = {
			kind: ResultKind.Command,
			command: "",
			options: new Map(),
			args: [],
		};
		const { options, args } = parsedResult;

		assert(
			statementNode.kind === CmdSyntaxKind.CommandStatement,
			"[CommandInterpreter] Invalid node: " +
				getNodeKindName(statementNode) +
				", expects: " +
				getKindName(CmdSyntaxKind.CommandStatement),
		);
		const command = statementNode.command;
		parsedResult.command = command.name.text;

		let matchingCommand = this.commands.find((c) => c.command === command.name.text);
		if (matchingCommand === undefined) {
			if (interpreterOptions.allowUndefinedCommands) {
				matchingCommand = {
					command: command.name.text,
					options: [],
					args: [],
				};
			} else {
				throw `[CommandInterpreter] Command ${command.name.text} is not declared`;
			}
		}

		const commandTypeHandler: Record<
			CommandInterpreterOption["type"] | "_",
			(optionFullName: string, optionNode: Option, nextNode: Node) => boolean
		> = {
			string: (optionFullName, node, nextNode) => {
				if (isNode(nextNode, CmdSyntaxKind.InterpolatedString)) {
					nextNode = flattenInterpolatedString(nextNode, variables);
				}
				this.expectOptionTypes(command, node, nextNode, CmdSyntaxKind.String);
				options.set(optionFullName, nextNode.text);
				return true;
			},
			number: (optionFullName, node, nextNode) => {
				this.expectOptionType(command, node, nextNode, CmdSyntaxKind.Number);
				options.set(optionFullName, nextNode.value);
				return true;
			},
			boolean: (optionFullName, node, nextNode) => {
				this.expectOptionType(command, node, nextNode, CmdSyntaxKind.Boolean);
				options.set(optionFullName, nextNode.value);
				return true;
			},
			any: (optionFullName, _, nextNode) => {
				if (isNode(nextNode, CmdSyntaxKind.String)) {
					options.set(optionFullName, nextNode.text);
				} else if (isNode(nextNode, CmdSyntaxKind.InterpolatedString)) {
					options.set(optionFullName, flattenInterpolatedString(nextNode, variables).text);
				} else if (isNode(nextNode, CmdSyntaxKind.Number)) {
					options.set(optionFullName, nextNode.value);
				} else if (isNode(nextNode, CmdSyntaxKind.Boolean)) {
					options.set(optionFullName, nextNode.value);
				} else {
					throw `[CommandInterpreter] Cannot parse node value ${getNodeKindName(nextNode)}`;
				}
				return true;
			},
			var: (optionFullName, node, nextNode) => {
				this.expectOptionType(command, node, nextNode, CmdSyntaxKind.Identifier);
				options.set(optionFullName, variables[nextNode.name]);
				return true;
			},
			switch: (node, _) => {
				options.set(node, createBooleanNode(true).value);
				return false;
			},
			// default
			_: (_optionFullName, node, _nextNode) => {
				throw `[CommandInterpreter] Cannot handle option type for ${node.flag}`;
				// return false;
			},
		};

		// Set defaults
		for (const option of matchingCommand.options) {
			if (option.default !== undefined) {
				options.set(option.name, option.default);
			}
		}

		let ptr = 0;
		let argIdx = 0;
		const children = statementNode.children;
		while (ptr < children.size()) {
			const node = children[ptr];

			if (isNode(node, CmdSyntaxKind.OptionExpression)) {
				const optionNode = node.option;
				// handle option
				const matchingOption = matchingCommand.options.find(
					(f) => f.name === optionNode.flag || f.alias?.includes(optionNode.flag),
				);

				// if (option === undefined) {
				// 	if (interpreterOptions.throwOnInvalidOption) {
				// 		throw `[CommandInterpreter] Invalid option for ${matchingCommand.command}: ${optionNode.flag}`;
				// 	} else {
				// 		commandTypeHandler.switch(optionNode.flag, optionNode, children[ptr + 1]);
				// 	}
				// } else {
				// 	const typeHandler = commandTypeHandler[option.type];
				// 	const nextNode = children[ptr + 1];

				// 	if (typeHandler) {
				// 		typeHandler(option.name, optionNode, nextNode) && ptr++;
				// 	} else {
				// 		commandTypeHandler._(option?.name, optionNode, nextNode) && ptr++;
				// 	}
				// }
			} else {
				// Handle arguments
				if (!isNodeIn(node, [CmdSyntaxKind.CommandName, CmdSyntaxKind.EndOfStatement])) {
					if (matchingCommand.args.size() === 0) {
						// Allow any number of arguments if not specified
						ptr++;
						if (isNode(node, CmdSyntaxKind.String)) {
							args.push(node.text);
						} else if (isNode(node, CmdSyntaxKind.InterpolatedString)) {
							args.push(flattenInterpolatedString(node, variables).text);
						} else if (isNode(node, CmdSyntaxKind.Number) || isNode(node, CmdSyntaxKind.Boolean)) {
							args.push(node.value);
						} else if (isNode(node, CmdSyntaxKind.Identifier)) {
							args.push(variables[node.name]);
						}
						continue;
					}

					if (argIdx >= matchingCommand.args.size()) {
						throw `[CommandInterpreter] Exceeding argument list: [ ${matchingCommand.args
							.map((t) => t.type)
							.join(", ")} ] with ${getNodeKindName(node)}`;
					}

					const arg = matchingCommand.args[argIdx];
					const typeNodeHandlers = argumentTransformers[arg.type];
					if (typeNodeHandlers) {
						if (node.kind === CmdSyntaxKind.Unknown) throw `UnknownNodeKind`;

						const typeNodeHandler = typeNodeHandlers[node.kind] as (
							node: Node,
							vars: Record<string, defined>,
						) => defined;
						if (typeNodeHandler !== undefined) {
							const value = typeNodeHandler(node, variables);
							args.push(value);
						} else {
							throw `[CommandInterpreter] expected ${arg.type}, got ${getFriendlyName(node)}`;
						}
					} else {
						throw `[CommandInterpreter] No argument type handler for ${arg.type}`;
					}

					argIdx++;
				}
			}

			ptr++;
		}

		return parsedResult;
	}
}
