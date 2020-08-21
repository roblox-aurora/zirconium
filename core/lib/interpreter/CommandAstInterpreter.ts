import { isNodeIn, getKindName, getNodeKindName, isNode, CmdSyntaxKind } from "@rbxts/cmd-ast/out/Nodes";
import { flattenInterpolatedString } from "@rbxts/cmd-ast/out/Nodes/Create";
import { argumentTransformers, matchInterpreterType, matchInterpreterOptionType } from "./InterpreterHelpers";
import { Node, CommandStatement, CommandSource, BinaryExpression } from "@rbxts/cmd-ast/out/Nodes/NodeTypes";
import { getFriendlyName } from "@rbxts/cmd-ast/out/Nodes/Functions";
import { prettyPrintNodes } from "@rbxts/cmd-ast/out/Utility";

export type ValidationType = "string" | "number" | "boolean" | "player";
export type OptionValidationType = ValidationType | "switch";

export interface CommandInterpreterArgument {
	default?: unknown;
	variadic?: true;
	type: readonly ValidationType[];
}

export interface CommandInterpreterOption {
	name: string;
	alias?: string[];
	default?: defined;
	type: ReadonlyArray<ValidationType | "switch">;
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
				const { option: optionNode, expression: expressionNode } = node;
				// handle option
				const matchingOption = matchingCommand.options.find(
					(f) => f.name === optionNode.flag || f.alias?.includes(optionNode.flag),
				);

				if (matchingOption === undefined) {
					throw `[CommandInterpreter] Invalid option for ${matchingCommand.command}: ${optionNode.flag}`;
				} else {
					const matcher = matchInterpreterOptionType(expressionNode, matchingOption.type);
					if (matcher.matches) {
						const { type: matchType } = matcher;
						if (matchType === "switch") {
							options.set(matchingOption.name, true);
						} else {
							const transformer = argumentTransformers[matchType];
							if (transformer) {
								if (expressionNode.kind === CmdSyntaxKind.Unknown) throw `UnknownNodeKind`;

								const typeNodeHandler = transformer[expressionNode.kind] as (
									node: Node,
									vars: Record<string, defined>,
								) => defined;
								if (typeNodeHandler !== undefined) {
									const value = typeNodeHandler(expressionNode, variables);
									options.set(matchingOption.name, value);
								} else {
									throw `[CommandInterpreter] Transform failed`;
								}
							}
						}
					}
				}
			} else {
				// Handle arguments
				if (!isNodeIn(node, [CmdSyntaxKind.CommandName, CmdSyntaxKind.EndOfStatement])) {
					if (matchingCommand.args.size() === 0) {
						// Allow any number of arguments if not specified

						if (isNode(node, CmdSyntaxKind.String)) {
							args.push(node.text);
						} else if (isNode(node, CmdSyntaxKind.InterpolatedString)) {
							args.push(flattenInterpolatedString(node, variables).text);
						} else if (isNode(node, CmdSyntaxKind.Number) || isNode(node, CmdSyntaxKind.Boolean)) {
							args.push(node.value);
						} else if (isNode(node, CmdSyntaxKind.Identifier)) {
							args.push(variables[node.name]);
						}
						ptr++;
						continue;
					}

					const lastArg = matchingCommand.args[matchingCommand.args.size() - 1];

					if (argIdx >= matchingCommand.args.size() && !lastArg.variadic) {
						throw `[CommandInterpreter] Exceeding argument list: [ ${matchingCommand.args
							.map((t) => t.type)
							.join(", ")} ] with ${getNodeKindName(node)}`;
					}

					const arg = matchingCommand.args[argIdx] ?? (lastArg.variadic ? lastArg : undefined);

					const matcher = matchInterpreterType(node, arg.type);
					if (matcher.matches) {
						const typeNodeHandlers = argumentTransformers[matcher.type];
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
								throw `[CommandInterpreter] expected '${arg.type.join(" | ")}' - but type handler '${
									matcher.type
								}[${getNodeKindName(node)}]' does not exist.`;
							}
						} else {
							throw `[CommandInterpreter] No argument type handler for ${arg.type}`;
						}
					} else {
						throw `[CommandInterpeter] Type mismatch '${getFriendlyName(node)}' to '${arg.type.join(
							" | ",
						)}'`;
					}

					// const typeNodeHandlers = argumentTransformers[arg.type];
					// if (typeNodeHandlers) {
					// 	if (node.kind === CmdSyntaxKind.Unknown) throw `UnknownNodeKind`;

					// 	const typeNodeHandler = typeNodeHandlers[node.kind] as (
					// 		node: Node,
					// 		vars: Record<string, defined>,
					// 	) => defined;
					// 	if (typeNodeHandler !== undefined) {
					// 		const value = typeNodeHandler(node, variables);
					// 		args.push(value);
					// 	} else {
					// 		throw `[CommandInterpreter] expected ${arg.type}, got ${getFriendlyName(node)}`;
					// 	}
					// } else {
					// 	throw `[CommandInterpreter] No argument type handler for ${arg.type}`;
					// }

					argIdx++;
				}
			}

			ptr++;
		}

		return parsedResult;
	}
}
