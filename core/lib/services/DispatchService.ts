import { CmdCoreRegistryService } from "./RegistryService";
import { CommandStatement, isNode, CmdSyntaxKind } from "@rbxts/cmd-ast/out/Nodes";
import CommandAstParser from "@rbxts/cmd-ast";

export namespace CmdCoreDispatchService {
	let Registry!: CmdCoreRegistryService;

	export const dependencies = ["RegistryService"];

	/** @internal */
	export function LoadDependencies(registry: CmdCoreRegistryService) {
		Registry = registry;
	}

	function executeStatement(statement: CommandStatement, executor: Player) {
		// TODO: FIX ME
	}

	export function Execute(text: string, executor: Player) {
		const commandAst = new CommandAstParser(text).Parse();
		for (const statement of commandAst.children) {
			if (isNode(statement, CmdSyntaxKind.CommandStatement)) {
				executeStatement(statement, executor);
			} else if (isNode(statement, CmdSyntaxKind.BinaryExpression)) {
				warn("Cannot run BinaryExpression yet!");
			}
		}
	}
}
export type CmdCoreDispatchService = typeof CmdCoreDispatchService;
