import { Node } from "../Nodes/NodeTypes";
import { isStringExpression, isNumberLiteral, isBooleanLiteral } from "../Nodes/Guards";

/* eslint-disable @typescript-eslint/no-empty-interface */
export type AstPrimitiveType = "string" | "number" | "boolean" | "switch";

interface AstBaseDefinition {
	readonly type: readonly AstPrimitiveType[];
}

export interface AstArgumentDefinition extends AstBaseDefinition {
	variadic?: true;
}
export interface AstOptionDefinition extends AstBaseDefinition {}

export interface AstCommandDefinition {
	readonly command: string;
	readonly options?: Readonly<Record<string, AstOptionDefinition>>;
	readonly args?: readonly AstArgumentDefinition[];
	readonly children?: readonly AstCommandDefinition[];
}
export type AstCommandDefinitions = readonly AstCommandDefinition[];

export function nodeMatchAstDefinitionType(node: Node, typeName: AstPrimitiveType): MatchResult {
	if (typeName === "string" && isStringExpression(node)) {
		return { matches: true, matchType: typeName };
	} else if (typeName === "number" && isNumberLiteral(node)) {
		return { matches: true, matchType: typeName };
	} else if (typeName === "boolean" && isBooleanLiteral(node)) {
		return { matches: true, matchType: typeName };
	} else if (typeName === "switch") {
		return { matches: true, matchType: typeName };
	}
	return { matches: false };
}

type MatchResult = { matches: true; matchType: AstPrimitiveType } | { matches: false };
export function nodeMatchesAstDefinitionTypes(node: Node, types: readonly AstPrimitiveType[]): MatchResult {
	for (const typeName of types) {
		const result = nodeMatchAstDefinitionType(node, typeName);
		if (result.matches) {
			return result;
		}
	}

	return { matches: false };
}
