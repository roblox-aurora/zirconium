import { CmdCoreRegistryService } from "./RegistryService";
import CommandAstParser from "@rbxts/cmd-ast";
import CommandAstInterpreter from "../interpreter";
import { CommandStatement, BinaryExpression, VariableStatement, Node } from "@rbxts/cmd-ast/out/Nodes/NodeTypes";
import { isNode, CmdSyntaxKind, getNodeKindName } from "@rbxts/cmd-ast/out/Nodes";
import { flattenInterpolatedString } from "@rbxts/cmd-ast/out/Nodes/Create";
import { prettyPrintNodes } from "@rbxts/cmd-ast/out/Utility";

interface stdio {
	stdout: Array<string>;
	stdin: Array<string>;
}

export interface ExecutionParams extends stdio {
	pipedOutput: boolean;
}

export namespace CmdCoreDispatchService {
	let Registry!: CmdCoreRegistryService;

	export const dependencies = ["RegistryService"];
	const playerVariables = new WeakMap<Player, Record<string, defined>>();
	const globalVariables: Record<string, defined> = {
		_VERSION: PKG_VERSION,
	};

	export function getVariablesForPlayer(player: Player): Record<string, defined> {
		if (playerVariables.has(player)) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			return playerVariables.get(player)!;
		} else {
			const vars = { ...globalVariables, player, playerName: player.Name, userId: player.UserId };
			playerVariables.set(player, vars);
			return vars;
		}
	}

	/** @internal */
	export function LoadDependencies(registry: CmdCoreRegistryService) {
		Registry = registry;
	}

	function executeStatement(statement: CommandStatement, executor: Player, params: ExecutionParams) {
		const matchingCommand = Registry.GetCommands().find((c) => c.matchesCommand(statement));
		if (matchingCommand) {
			return matchingCommand.executeStatement(statement, CmdCoreDispatchService, executor, params);
		}
	}

	function executeBinaryExpression(expression: BinaryExpression, executor: Player, stdout: stdio["stdout"] = []) {
		const {
			left,
			right,
			operator: { operator: op },
		} = expression;
		const stdin = new Array<string>();
		const tmpstdout = new Array<string>();

		if (isNode(left, CmdSyntaxKind.CommandStatement)) {
			const result = executeStatement(left, executor, {
				stdin: [],
				stdout: op === "|" ? tmpstdout : stdout,
				pipedOutput: op === "|",
			}) as defined | undefined;
			const success = result !== undefined ? result : true;

			if (success && op === "&&") {
				if (isNode(right, CmdSyntaxKind.CommandStatement)) {
					return executeStatement(right, executor, { stdin: [], stdout: stdout, pipedOutput: false });
				}
			} else if (op === "|") {
				if (isNode(right, CmdSyntaxKind.CommandStatement)) {
					return executeStatement(right, executor, { stdin: tmpstdout, stdout, pipedOutput: false });
				}
			}
		} else if (isNode(left, CmdSyntaxKind.BinaryExpression)) {
			const result = executeBinaryExpression(left, executor, tmpstdout);
			const success = result !== undefined ? result : true;

			if (success && op === "&&") {
				if (isNode(right, CmdSyntaxKind.CommandStatement)) {
					return executeStatement(right, executor, { stdin, stdout, pipedOutput: false });
				}
			} else if (op === "|") {
				if (isNode(right, CmdSyntaxKind.CommandStatement)) {
					return executeStatement(right, executor, { stdin: tmpstdout, stdout, pipedOutput: true });
				}
			}
		}
	}

	export function executeVariableStatement(statement: VariableStatement, executor: Player) {
		const vars = getVariablesForPlayer(executor);

		const {
			declaration: {
				expression,
				identifier: { name },
			},
		} = statement;

		if (isNode(expression, CmdSyntaxKind.Boolean) || isNode(expression, CmdSyntaxKind.Number)) {
			vars[name] = expression.value;
		} else if (isNode(expression, CmdSyntaxKind.String)) {
			vars[name] = expression.text;
		} else if (isNode(expression, CmdSyntaxKind.CommandStatement)) {
			vars[name] = executeStatement(expression, executor, {
				stdout: [],
				stdin: [],
				pipedOutput: false,
			}) as defined;
		} else if (isNode(expression, CmdSyntaxKind.InterpolatedString)) {
			vars[name] = flattenInterpolatedString(expression, vars).text;
		} else if (isNode(expression, CmdSyntaxKind.Identifier)) {
			vars[name] = vars[expression.name];
		} else {
			throw `[CommandDispatch] Cannot declare ${name} as ${getNodeKindName(expression)}`;
		}
	}

	function executeNodes(nodes: Node[], executor: Player, stdin = new Array<string>()) {
		const stdout = new Array<string>();
		const vars = getVariablesForPlayer(executor);

		for (const statement of nodes) {
			if (isNode(statement, CmdSyntaxKind.CommandStatement)) {
				vars._ = executeStatement(statement, executor, { stdin, stdout, pipedOutput: false }) as defined;
			} else if (isNode(statement, CmdSyntaxKind.BinaryExpression)) {
				vars._ = executeBinaryExpression(statement, executor, stdout) as defined;
			} else if (isNode(statement, CmdSyntaxKind.VariableStatement)) {
				executeVariableStatement(statement, executor);
			}
		}

		return { stdout, stderr: new Array<string>() };
	}

	const parser = new CommandAstParser({
		prefixExpressions: false,
		variableDeclarations: true,
		innerExpressions: false,
		nestingInnerExpressions: true,
	});

	export function Execute(text: string, executor: Player) {
		parser.SetCommandDefinitions(Registry.GetCommandDeclarations());

		const commandAst = parser.Parse(text);
		const valid = CommandAstParser.validate(commandAst);
		if (valid.success) {
			const isStudio = game.GetService("RunService").IsStudio();
			if (isStudio) {
				const vars = getVariablesForPlayer(executor);
				vars._ = text;

				if (vars.debug === true) {
					prettyPrintNodes([commandAst]);
				}

				return executeNodes(commandAst.children, executor);
			} else {
				try {
					const vars = getVariablesForPlayer(executor);
					vars._ = text;

					return executeNodes(commandAst.children, executor);
				} catch (err) {
					return { stderr: [tostring(err)], stdout: new Array<string>() };
				}
			}
		} else {
			return { stderr: [valid.errorNodes[0].message], stdout: new Array<string>() };
		}
	}
}
export type CmdCoreDispatchService = typeof CmdCoreDispatchService;
