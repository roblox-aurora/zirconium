import {
	CommandInterpreterArgument,
	ValidationType,
	OptionValidationType,
	CommandInterpreterOption,
} from "./CommandAstInterpreter";
import { NodeTypes, BooleanLiteral, NumberLiteral, Node } from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import { CmdSyntaxKind, getNodeKindName } from "@rbxts/zirconium-ast/out/Nodes";
import { flattenInterpolatedString } from "@rbxts/zirconium-ast/out/Nodes/Create";
import { isStringExpression, isNumberLiteral, isBooleanLiteral } from "@rbxts/zirconium-ast/out/Nodes/Guards";
import util from "../util";

export type CmdSyntaxMap<R = unknown> = {
	[P in keyof NodeTypes]: (value: NodeTypes[P], variables: Record<string, defined>) => R;
};

const numericHandler = (node: BooleanLiteral | NumberLiteral) => node.value;

export const argumentTransformers: Partial<Record<
	CommandInterpreterArgument["type"][number],
	Partial<CmdSyntaxMap>
>> = {
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
	player: {
		[CmdSyntaxKind.InterpolatedString]: (node, variables) => {
			const text = flattenInterpolatedString(node, variables).text;
			const players = game.GetService("Players").GetPlayers();
			return players.find((f) => util.startsWithIgnoreCase(f.Name, text));
		},
		[CmdSyntaxKind.String]: (node) => {
			const players = game.GetService("Players").GetPlayers();
			return players.find((f) => util.startsWithIgnoreCase(f.Name, node.text));
		},
	},
};

type OptionMatch = { matches: true; type: CommandInterpreterOption["type"][number] } | { matches: false };
type Match = { matches: true; type: CommandInterpreterArgument["type"][number] } | { matches: false };

export function matchInterpreterOptionType(node: Node, types: readonly OptionValidationType[]): OptionMatch {
	for (const typeName of types) {
		if (typeName === "string" && isStringExpression(node)) {
			return { matches: true, type: "string" };
		} else if (typeName === "player" && isStringExpression(node)) {
			return { matches: true, type: "player" };
		} else if (typeName === "number" && isNumberLiteral(node)) {
			return { matches: true, type: "number" };
		} else if (typeName === "boolean" && isBooleanLiteral(node)) {
			return { matches: true, type: "boolean" };
		} else if (typeName === "switch") {
			return { matches: true, type: "switch" };
		}
	}

	return { matches: false };
}

export function matchInterpreterType(node: Node, types: readonly ValidationType[]): Match {
	for (const typeName of types) {
		if (typeName === "string" && isStringExpression(node)) {
			return { matches: true, type: "string" };
		} else if (typeName === "player" && isStringExpression(node)) {
			return { matches: true, type: "player" };
		} else if (typeName === "number" && isNumberLiteral(node)) {
			return { matches: true, type: "number" };
		} else if (typeName === "boolean" && isBooleanLiteral(node)) {
			return { matches: true, type: "boolean" };
		}
	}

	return { matches: false };
}

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
