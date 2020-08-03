import { CmdCoreRegistryService } from "./RegistryService";
import { CommandStatement, isNode, CmdSyntaxKind, BinaryExpression } from "@rbxts/cmd-ast/out/Nodes";
import CommandAstParser, { ast } from "@rbxts/cmd-ast";
import CommandAstInterpreter from "../interpreter";

export namespace CmdCoreDispatchService {
	let Registry!: CmdCoreRegistryService;

	export const dependencies = ["RegistryService"];
	const variables: Record<string, defined> = {
		_VERSION: PKG_VERSION,
	};

	/** @internal */
	export function LoadDependencies(registry: CmdCoreRegistryService) {
		Registry = registry;
	}

	function executeStatement(statement: CommandStatement, executor: Player) {
		const interpreter = new CommandAstInterpreter(Registry.GetCommandDeclarations());
		const result = interpreter.interpret(statement, variables);

		const cmd = result[0];
		if (CommandAstInterpreter.isCommand(cmd)) {
			const matchingCommand = Registry.GetCommands().find((c) => c.command === cmd.command);
			if (matchingCommand) {
				return matchingCommand.executeForPlayer({
					variables,
					mappedOptions: cmd.options,
					args: cmd.args,
					executor,
				});
			}
		}
	}

	function executeBinaryExpression(expression: BinaryExpression, executor: Player) {
		const { left, right, op } = expression;
		if (isNode(left, CmdSyntaxKind.CommandStatement)) {
			const result = executeStatement(left, executor) as defined | undefined;
			const success = result !== undefined ? result : true;

			if (success && op === "&&") {
				if (isNode(right, CmdSyntaxKind.CommandStatement)) {
					return executeStatement(right, executor);
				}
			} else if (result && op === "|") {
				if (isNode(right, CmdSyntaxKind.CommandStatement)) {
					if (typeIs(result, "number")) {
						right.children.push(ast.createNumberNode(result));
					} else if (typeIs(result, "string")) {
						right.children.push(ast.createStringNode(result));
					} else {
						variables._ = result;
						right.children.push(ast.createIdentifier("_"));
					}

					return executeStatement(right, executor);
				}
			}
		} else if (isNode(left, CmdSyntaxKind.BinaryExpression)) {
			const result = executeBinaryExpression(left, executor);
			const success = result !== undefined ? result : true;

			if (success && op === "&&") {
				if (isNode(right, CmdSyntaxKind.CommandStatement)) {
					return executeStatement(right, executor);
				}
			}
		}
	}

	export function Execute(text: string, executor: Player) {
		const commandAst = new CommandAstParser(text).Parse();
		for (const statement of commandAst.children) {
			if (isNode(statement, CmdSyntaxKind.CommandStatement)) {
				executeStatement(statement, executor);
			} else if (isNode(statement, CmdSyntaxKind.BinaryExpression)) {
				executeBinaryExpression(statement, executor);
			}
		}
	}
}
export type CmdCoreDispatchService = typeof CmdCoreDispatchService;
