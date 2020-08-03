import { CmdCoreRegistryService } from "./RegistryService";
import { CommandStatement, isNode, CmdSyntaxKind, BinaryExpression } from "@rbxts/cmd-ast/out/Nodes";
import CommandAstParser, { ast } from "@rbxts/cmd-ast";
import CommandAstInterpreter from "../interpreter";

interface stdio {
	stdout: Array<string>;
	stdin: Array<string>;
}

interface ExecutionParams extends stdio {
	pipedOutput: boolean;
}

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

	function executeStatement(statement: CommandStatement, executor: Player, params: ExecutionParams) {
		variables["player"] = executor;
		variables["playerName"] = executor.Name;

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
					piped: params.pipedOutput,
					stdin: params.stdin,
					stdout: params.stdout,
				});
			}
		}
	}

	function executeBinaryExpression(expression: BinaryExpression, executor: Player, stdout: stdio["stdout"] = []) {
		const { left, right, op } = expression;
		const stdin = new Array<string>();

		if (isNode(left, CmdSyntaxKind.CommandStatement)) {
			const result = executeStatement(left, executor, { stdin: [], stdout, pipedOutput: op === "|" }) as
				| defined
				| undefined;
			const success = result !== undefined ? result : true;

			if (success && op === "&&") {
				if (isNode(right, CmdSyntaxKind.CommandStatement)) {
					return executeStatement(right, executor, { stdin: [], stdout: [], pipedOutput: false });
				}
			} else if (result && op === "|") {
				if (isNode(right, CmdSyntaxKind.CommandStatement)) {
					return executeStatement(right, executor, { stdin: stdout, stdout: [], pipedOutput: false });
				}
			}
		} else if (isNode(left, CmdSyntaxKind.BinaryExpression)) {
			const result = executeBinaryExpression(left, executor, stdout);
			const success = result !== undefined ? result : true;

			if (success && op === "&&") {
				if (isNode(right, CmdSyntaxKind.CommandStatement)) {
					return executeStatement(right, executor, { stdin, stdout, pipedOutput: false });
				}
			}
		}
	}

	export function Execute(text: string, executor: Player) {
		const commandAst = new CommandAstParser(text).Parse();

		const stdout = new Array<string>();

		for (const statement of commandAst.children) {
			if (isNode(statement, CmdSyntaxKind.CommandStatement)) {
				executeStatement(statement, executor, { stdin: [], stdout, pipedOutput: false });
			} else if (isNode(statement, CmdSyntaxKind.BinaryExpression)) {
				executeBinaryExpression(statement, executor, stdout);
			}
		}

		variables["_last"] = text;

		return { stdout };
	}
}
export type CmdCoreDispatchService = typeof CmdCoreDispatchService;
