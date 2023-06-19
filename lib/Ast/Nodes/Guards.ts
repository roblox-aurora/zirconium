import {
	ZrNodeKinds,
	ZrNode,
	VALID_PREFIX_CHARS,
	VariableStatement,
	StringLiteral,
	InvalidNode,
	SourceFile,
	PrefixToken,
	OperatorToken,
	Identifier,
	Option,
	InterpolatedStringExpression,
	NumberLiteral,
	BooleanLiteral,
	BinaryExpression,
	ExpressionStatement,
	CallExpression,
	SimpleCallExpression,
	OptionExpression,
	ArrayIndexExpression,
	ArrayLiteralExpression,
	FunctionDeclaration,
	FunctionExpression,
	ForInStatement,
	PropertyAccessExpression,
	ReturnStatement,
	ParameterDeclaration,
	ObjectLiteralExpression,
	ExportKeyword,
	UndefinedKeyword,
	PropertyAssignment,
	UnaryExpression,
	ParenthesizedExpression,
	VariableDeclaration,
	SourceBlock,
	ElementAccessExpression,
} from "./NodeTypes";
import { ZrNodeFlag, ZrNodeKind } from "./Enum";
import { getKindName, getNodeKindName } from "./Functions";

export function isNode<K extends keyof ZrNodeKinds>(node: ZrNode, typeName: K): node is ZrNodeKinds[K] {
	return node !== undefined && node.kind === typeName;
}

export function hasNodeFlag<F extends ZrNodeFlag>(node: ZrNode, flag: F) {
	return node.flags !== undefined && (node.flags & flag) !== 0;
}

export function assertIsNode<K extends keyof ZrNodeKinds>(node: ZrNode, typeName: K): asserts node is ZrNodeKinds[K] {
	if (!isNode(node, typeName)) {
		error(`Expected ${getKindName(typeName)}, got ${getNodeKindName(node)}`);
	}
}

export function getNodesOfType<K extends keyof ZrNodeKinds>(nodes: ZrNode[], typeName: K): Array<ZrNodeKinds[K]> {
	return nodes.filter((node): node is ZrNodeKinds[K] => isNode(node, typeName));
}

export function getSiblingNode(nodes: ZrNode[], kind: ZrNodeKind) {
	return nodes.find((f) => f.kind === kind);
}

export function isNodeIn<K extends keyof ZrNodeKinds>(node: ZrNode, typeName: readonly K[]): node is ZrNodeKinds[K] {
	return node !== undefined && (typeName as ReadonlyArray<ZrNodeKind>).includes(node.kind);
}

export function isValidPrefixCharacter(input: string): input is typeof VALID_PREFIX_CHARS[number] {
	return VALID_PREFIX_CHARS.includes(input as typeof VALID_PREFIX_CHARS[number]);
}

/**
 * @internal
 */
export const VALID_VARIABLE_NAME = "^[A-Za-z_][A-Za-z0-9_]*$"; // matches $A, $a, $a0, $_a, $A_, $A_a, etc.
/**
 * @internal
 */
export const VALID_COMMAND_NAME = "^[A-Za-z][A-Z0-9a-z_%-]*$";

/**
 * @internal
 */
const PREFIXABLE = [ZrNodeKind.String, ZrNodeKind.InterpolatedString, ZrNodeKind.Number, ZrNodeKind.Boolean] as const;

/**
 * Can this expression be prefixed?
 */
export function isPrefixableExpression(node: ZrNode): node is ZrNodeKinds[typeof PREFIXABLE[number]] {
	return isNodeIn(node, PREFIXABLE);
}

/**
 * @internal
 */
export const ASSIGNABLE = [
	ZrNodeKind.String,
	ZrNodeKind.InterpolatedString,
	ZrNodeKind.Identifier,
	ZrNodeKind.Number,
	ZrNodeKind.Boolean,
	ZrNodeKind.InnerExpression,
	ZrNodeKind.ArrayLiteralExpression,
	ZrNodeKind.PropertyAccessExpression,
	ZrNodeKind.ArrayIndexExpression,
	ZrNodeKind.ObjectLiteralExpression,
	ZrNodeKind.BinaryExpression,
	ZrNodeKind.UnaryExpression,
	ZrNodeKind.CallExpression,
	ZrNodeKind.SimpleCallExpression,
	ZrNodeKind.UndefinedKeyword,
	ZrNodeKind.FunctionExpression,
	ZrNodeKind.ParenthesizedExpression,
] as const;
export type AssignableExpression = ZrNodeKinds[typeof ASSIGNABLE[number]];

/**
 * Can this expression be prefixed?
 */
export function isAssignableExpression(node: ZrNode): node is AssignableExpression {
	return isNodeIn(node, ASSIGNABLE);
}

/**
 * @internal
 */
const LIT = [
	ZrNodeKind.String,
	ZrNodeKind.InterpolatedString,
	ZrNodeKind.Identifier,
	ZrNodeKind.Number,
	ZrNodeKind.Boolean,
] as const;
export type LiteralExpression = ZrNodeKinds[typeof LIT[number]];

const EXPRESSIONABLE = [ZrNodeKind.VariableStatement, ZrNodeKind.BinaryExpression] as const;

export function isSourceFile(node: ZrNode): node is SourceFile {
	return node !== undefined && node.kind === ZrNodeKind.Source;
}

/** @deprecated */
export const isSource = isSourceFile;

export function isParameterDeclaration(node: ZrNode): node is ParameterDeclaration {
	return node !== undefined && node.kind === ZrNodeKind.Parameter;
}

// REGION Expressions

/** @deprecated */
export function isValidExpression(node: ZrNode): node is ZrNodeKinds[typeof EXPRESSIONABLE[number]] {
	return isNodeIn(node, EXPRESSIONABLE);
}

/**
 * Is this expression considered a primitive type?
 */
export function isPrimitiveExpression(node: ZrNode): node is LiteralExpression {
	return isNodeIn(node, ASSIGNABLE);
}

export function isSimpleCallExpression(node: ZrNode): node is SimpleCallExpression {
	return node !== undefined && node.kind === ZrNodeKind.SimpleCallExpression;
}

export function isCallExpression(node: ZrNode): node is CallExpression {
	return node !== undefined && node.kind === ZrNodeKind.CallExpression;
}

export function isCallableExpression(node: ZrNode): node is CallExpression | SimpleCallExpression {
	return isSimpleCallExpression(node) || isCallExpression(node);
}

export function isOptionExpression(node: ZrNode): node is OptionExpression {
	return node !== undefined && node.kind === ZrNodeKind.OptionExpression;
}

export function isExpressionStatement(node: ZrNode): node is ExpressionStatement {
	return node !== undefined && node.kind === ZrNodeKind.ExpressionStatement;
}

export function isUnaryExpression(node: ZrNode): node is UnaryExpression {
	return node !== undefined && node.kind === ZrNodeKind.UnaryExpression;
}

export function isParenthesizedExpression(node: ZrNode): node is ParenthesizedExpression {
	return node !== undefined && node.kind === ZrNodeKind.ParenthesizedExpression;
}

// REGION Statements

export function isReturnStatement(node: ZrNode): node is ReturnStatement {
	return node !== undefined && node.kind === ZrNodeKind.ReturnStatement;
}

export function isBlock(node: ZrNode): node is SourceBlock {
	return node !== undefined && node.kind === ZrNodeKind.Block;
}

// REGION indexing

export function isArrayIndexExpression(node: ZrNode): node is ArrayIndexExpression {
	return node !== undefined && node.kind === ZrNodeKind.ArrayIndexExpression;
}

export function isElementAccessExpression(node: ZrNode): node is ElementAccessExpression {
	return node !== undefined && node.kind === ZrNodeKind.ElementAccessExpression;
}

export function isPropertyAccessExpression(node: ZrNode): node is PropertyAccessExpression {
	return node !== undefined && node.kind === ZrNodeKind.PropertyAccessExpression;
}

export function isPropertyAssignment(node: ZrNode): node is PropertyAssignment {
	return node !== undefined && node.kind === ZrNodeKind.PropertyAssignment;
}

// REGION variables

export function isVariableStatement(node: ZrNode): node is VariableStatement {
	return node !== undefined && node.kind === ZrNodeKind.VariableStatement;
}

export function isVariableDeclaration(node: ZrNode): node is VariableDeclaration {
	return node !== undefined && node.kind === ZrNodeKind.VariableDeclaration;
}

// REGION Iterable

export function isForInStatement(node: ZrNode): node is ForInStatement {
	return node !== undefined && node.kind === ZrNodeKind.ForInStatement;
}

export function isStringExpression(node: ZrNode): node is StringLiteral | InterpolatedStringExpression {
	return node !== undefined && (node.kind === ZrNodeKind.String || node.kind === ZrNodeKind.InterpolatedString);
}

// REGION function checks

export function isFunctionDeclaration(node: ZrNode): node is FunctionDeclaration {
	return node !== undefined && node.kind === ZrNodeKind.FunctionDeclaration;
}

export function isFunctionExpression(node: ZrNode): node is FunctionExpression {
	return node !== undefined && node.kind === ZrNodeKind.FunctionExpression;
}

/// REGION Literal Checks

export function isIdentifier(node: ZrNode): node is Identifier {
	return node !== undefined && node.kind === ZrNodeKind.Identifier;
}

export function isObjectLiteralExpression(node: ZrNode): node is ObjectLiteralExpression {
	return node !== undefined && node.kind === ZrNodeKind.ObjectLiteralExpression;
}

export function isArrayLiteralExpression(node: ZrNode): node is ArrayLiteralExpression {
	return node !== undefined && node.kind === ZrNodeKind.ArrayLiteralExpression;
}

export function isBooleanLiteral(node: ZrNode): node is BooleanLiteral {
	return node !== undefined && node.kind === ZrNodeKind.Boolean;
}

export function isNumberLiteral(node: ZrNode): node is NumberLiteral {
	return node !== undefined && node.kind === ZrNodeKind.Number;
}

export function isStringLiteral(node: ZrNode): node is StringLiteral {
	return node !== undefined && node.kind === ZrNodeKind.String;
}

/** @deprecated */
export function isPrefixToken(node: ZrNode): node is PrefixToken {
	return node !== undefined && node.kind === ZrNodeKind.PrefixToken;
}

export function isOperatorToken(node: ZrNode): node is OperatorToken {
	return node !== undefined && node.kind === ZrNodeKind.OperatorToken;
}

export function isBinaryExpression(node: ZrNode): node is BinaryExpression {
	return node !== undefined && node.kind === ZrNodeKind.BinaryExpression;
}

export function isOptionKey(node: ZrNode): node is Option {
	return node !== undefined && node.kind === ZrNodeKind.OptionKey;
}

/** @deprecated */
export function isInvalid(node: ZrNode): node is InvalidNode {
	return node !== undefined && node.kind === ZrNodeKind.Invalid;
}

// REGION Keywords

export function isExportKeyword(node: ZrNode): node is ExportKeyword {
	return node !== undefined && node.kind === ZrNodeKind.ExportKeyword;
}

export function isUndefinedKeyword(node: ZrNode): node is UndefinedKeyword {
	return node !== undefined && node.kind === ZrNodeKind.UndefinedKeyword;
}
