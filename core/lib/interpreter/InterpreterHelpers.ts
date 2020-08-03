import {
	NodeTypes,
	BooleanLiteral,
	NumberLiteral,
	CmdSyntaxKind,
	flattenInterpolatedString,
	isNode,
	Node,
	getNodeKindName,
} from "@rbxts/cmd-ast/out/Nodes";
import { CommandInterpreterArgument } from "./CommandAstInterpreter";

type CmdSyntaxMap = {
	[P in keyof NodeTypes]: (value: NodeTypes[P], variables: Record<string, defined>) => defined;
};

const numericHandler = (node: BooleanLiteral | NumberLiteral) => node.value;

export const argumentTransformers: Partial<Record<CommandInterpreterArgument["type"], Partial<CmdSyntaxMap>>> = {
	string: {
		[CmdSyntaxKind.InterpolatedString]: (node, variables) => flattenInterpolatedString(node, variables).text,
		[CmdSyntaxKind.String]: (node) => node.text,
		[CmdSyntaxKind.Identifier]: (node, variables) => {
			const value = variables[node.name];
			if (typeIs(value, "string")) {
				return value;
			} else {
				throw `[CommandInterpreter] expected string, got ${getFriendlyName(node)}`;
			}
		},
	},
	number: {
		[CmdSyntaxKind.Number]: numericHandler,
		[CmdSyntaxKind.Identifier]: (node, variables) => {
			const value = variables[node.name];
			if (typeIs(value, "number")) {
				return value;
			} else {
				throw `[CommandInterpreter] expected number, got ${getFriendlyName(node)}`;
			}
		},
	},
	boolean: {
		[CmdSyntaxKind.Boolean]: numericHandler,
		[CmdSyntaxKind.Identifier]: (node, variables) => {
			const value = variables[node.name];
			if (typeIs(value, "boolean")) {
				return value;
			} else {
				throw `[CommandInterpreter] expected boolean, got ${getFriendlyName(node)}`;
			}
		},
	},
	var: {
		[CmdSyntaxKind.Identifier]: (node, variables) => variables[node.name],
	},
	any: {
		[CmdSyntaxKind.Identifier]: (node, variables) => variables[node.name],
		[CmdSyntaxKind.InterpolatedString]: (node, variables) => flattenInterpolatedString(node, variables).text,
		[CmdSyntaxKind.String]: (node) => node.text,
		[CmdSyntaxKind.Number]: numericHandler,
		[CmdSyntaxKind.Boolean]: numericHandler,
	},
};

export function getFriendlyName(node: Node) {
	switch (node.kind) {
		case CmdSyntaxKind.String:
		case CmdSyntaxKind.InterpolatedString:
			return "string";
		case CmdSyntaxKind.Identifier:
			return "var";
		case CmdSyntaxKind.Number:
			return "number";
		case CmdSyntaxKind.Boolean:
			return "boolean";
		case CmdSyntaxKind.CommandStatement:
			return "command";
		default:
			return getNodeKindName(node);
	}
}
