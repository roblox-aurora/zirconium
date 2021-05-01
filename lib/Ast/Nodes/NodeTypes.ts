/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ZrNodeKind, ZrNodeFlag } from "./Enum";
import { ASSIGNABLE } from "./Guards";

export interface NodeTypes {
	[ZrNodeKind.CallExpression]: CallExpression;
	[ZrNodeKind.ExpressionStatement]: ExpressionStatement;
	[ZrNodeKind.SimpleCallExpression]: SimpleCallExpression;
	[ZrNodeKind.IfStatement]: IfStatement;
	[ZrNodeKind.Block]: SourceBlock;
	[ZrNodeKind.String]: StringLiteral;
	[ZrNodeKind.OptionKey]: Option;
	[ZrNodeKind.EndOfStatement]: EndOfStatement;
	[ZrNodeKind.Source]: SourceFile;
	[ZrNodeKind.Identifier]: Identifier;
	[ZrNodeKind.PropertyAccessExpression]: PropertyAccessExpression;
	[ZrNodeKind.Boolean]: BooleanLiteral;
	[ZrNodeKind.Number]: NumberLiteral;
	[ZrNodeKind.InterpolatedString]: InterpolatedStringExpression;
	[ZrNodeKind.BinaryExpression]: BinaryExpression;
	[ZrNodeKind.OperatorToken]: OperatorToken;
	[ZrNodeKind.PrefixToken]: PrefixToken;
	[ZrNodeKind.PrefixExpression]: PrefixExpression;
	[ZrNodeKind.VariableDeclaration]: VariableDeclaration;
	[ZrNodeKind.VariableStatement]: VariableStatement;
	[ZrNodeKind.Invalid]: InvalidNode;
	[ZrNodeKind.OptionExpression]: OptionExpression;
	[ZrNodeKind.InnerExpression]: InnerExpression;
	[ZrNodeKind.ArrayLiteralExpression]: ArrayLiteralExpression;
	[ZrNodeKind.ArrayIndexExpression]: ArrayIndexExpression;
	[ZrNodeKind.ParenthesizedExpression]: ParenthesizedExpression;
	[ZrNodeKind.FunctionDeclaration]: FunctionDeclaration;
	[ZrNodeKind.Parameter]: ParameterDeclaration;
	[ZrNodeKind.TypeReference]: TypeReference;
	[ZrNodeKind.ForInStatement]: ForInStatement;
	[ZrNodeKind.ObjectLiteralExpression]: ObjectLiteral;
	[ZrNodeKind.PropertyAssignment]: PropertyAssignment;
	[ZrNodeKind.UnaryExpression]: UnaryExpression;
	[ZrNodeKind.UndefinedKeyword]: UndefinedKeyword;
	[ZrNodeKind.ExportKeyword]: ExportKeyword;
	[ZrNodeKind.FunctionExpression]: FunctionExpression;
	[ZrNodeKind.ReturnStatement]: ReturnStatement;
}

export interface Node {
	kind: ZrNodeKind;
	parent?: Node;
	startPos?: number;
	rawText?: string;
	endPos?: number;
	children?: Node[];
	flags: ZrNodeFlag;
}

export interface ValuesExpression extends Expression {
	readonly values: Node[];
}

export interface Statement extends Node {
	/** @deprecated */
	readonly _nominal_Statement: unique symbol;
}

export interface Declaration extends Node {
	/** @deprecated */
	readonly _nominal_Declaration: unique symbol;
}

type DeclarationName = Identifier | StringLiteral | NumberLiteral;
export interface NamedDeclaration extends Declaration {
	readonly name?: DeclarationName;
}

export interface Keyword extends Node {
	readonly _nominal_Keyword: unique symbol;
}

type PropertyName = Identifier | StringLiteral | NumberLiteral;
export interface ObjectLiteralElement extends NamedDeclaration {
	/** @deprecated */
	readonly _nominal_ObjectLiteralElement: unique symbol;
	readonly name?: PropertyName;
}

export interface LeftHandSideExpression extends Expression {
	/** @deprecated */
	readonly _nominal_LeftHandSide: unique symbol;
}

export interface Expression extends Node {
	/** @deprecated */
	readonly _nominal_Expression: unique symbol;
}
export interface LiteralExpression extends Expression {
	/** @deprecated */
	readonly _nominal_Literal: unique symbol;
}

export interface DeclarationStatement extends Statement {
	readonly name?: Identifier | StringLiteral | NumberLiteral;
}

type OP = "&&" | "|" | "=";

export interface OperatorToken extends Node {
	operator: string;
	kind: ZrNodeKind.OperatorToken;
}

export interface ExportKeyword extends Keyword {
	kind: ZrNodeKind.ExportKeyword;
}

export interface UndefinedKeyword extends Keyword, Expression {
	kind: ZrNodeKind.UndefinedKeyword;
}

export interface ParenthesizedExpression extends Expression {
	kind: ZrNodeKind.ParenthesizedExpression;
	expression: Expression;
}

export interface TypeReference extends Node {
	kind: ZrNodeKind.TypeReference;
	typeName: Identifier;
}

export interface ParameterDeclaration extends NamedDeclaration {
	kind: ZrNodeKind.Parameter;
	name: Identifier;
	type?: TypeReference; // TODO: NumberKeyword, StringKeyword etc.
}

export interface ReturnStatement extends Statement {
	kind: ZrNodeKind.ReturnStatement;
	expression: Expression;
}

export interface ForInStatement extends Statement {
	kind: ZrNodeKind.ForInStatement;
	initializer: Identifier;
	expression: Expression;
	statement: SourceBlock;
}

export interface FunctionExpression extends Expression {
	kind: ZrNodeKind.FunctionExpression;
	parameters: ParameterDeclaration[]; // TODO:
	body: SourceBlock;
}

export interface FunctionDeclaration extends DeclarationStatement {
	kind: ZrNodeKind.FunctionDeclaration;
	name: Identifier;
	parameters: ParameterDeclaration[]; // TODO:
	body: SourceBlock;
}

export interface SourceFile extends Node {
	kind: ZrNodeKind.Source;
	children: Array<Node>;
}

export interface InterpolatedStringExpression extends ValuesExpression {
	kind: ZrNodeKind.InterpolatedString;
	values: Array<StringLiteral | Identifier>;
}

export interface UnaryExpression extends Expression {
	kind: ZrNodeKind.UnaryExpression;
	expression: Node;
	operator: string;
}

export interface BinaryExpression extends Expression, Declaration {
	kind: ZrNodeKind.BinaryExpression;
	left: Expression;
	operator: string;
	right: Expression;
	children: Node[];
}

export interface ArrayLiteralExpression extends ValuesExpression {
	kind: ZrNodeKind.ArrayLiteralExpression;
	values: Node[];
}

export interface PropertyAssignment extends ObjectLiteralElement {
	kind: ZrNodeKind.PropertyAssignment;
	name: Identifier;
	initializer: Expression;
}

export interface ObjectLiteral extends LiteralExpression, ValuesExpression {
	kind: ZrNodeKind.ObjectLiteralExpression;
	values: PropertyAssignment[];
}

export interface InvalidNode extends Node {
	kind: ZrNodeKind.Invalid;
	expression: Node;
	message: string;
}

export interface VariableDeclaration extends Declaration {
	kind: ZrNodeKind.VariableDeclaration;
	identifier: Identifier | PropertyAccessExpression | ArrayIndexExpression;
	expression: AssignableExpression;
}

export interface VariableStatement extends Statement {
	kind: ZrNodeKind.VariableStatement;
	modifiers?: Array<ExportKeyword>;
	declaration: VariableDeclaration;
}

export interface PropertyAccessExpression extends Expression {
	kind: ZrNodeKind.PropertyAccessExpression;
	expression: Identifier | PropertyAccessExpression | ArrayIndexExpression;
	name: Identifier;
}

export interface ArrayIndexExpression extends Expression {
	kind: ZrNodeKind.ArrayIndexExpression;
	expression: Identifier | PropertyAccessExpression | ArrayIndexExpression;
	index: NumberLiteral;
}

export interface StringLiteral extends LiteralExpression {
	kind: ZrNodeKind.String;
	quotes?: string;
	isUnterminated?: boolean;
	text: string;
}

export interface SourceBlock extends Statement {
	kind: ZrNodeKind.Block;
	statements: Statement[];
}

export type AssignableExpression = NodeTypes[typeof ASSIGNABLE[number]];

export interface IfStatement extends Statement {
	kind: ZrNodeKind.IfStatement;
	condition: Expression | undefined;
	thenStatement: SourceBlock | Statement | undefined;
	elseStatement: IfStatement | SourceBlock | Statement | undefined;
}

export interface ExpressionStatement extends Statement {
	kind: ZrNodeKind.ExpressionStatement;
	expression: Expression;
}

export interface BooleanLiteral extends LiteralExpression {
	kind: ZrNodeKind.Boolean;
	value: boolean;
}

export interface NumberLiteral extends LiteralExpression {
	kind: ZrNodeKind.Number;
	value: number;
}

/**
 * An expression like `func(...)`
 */
export interface CallExpression extends Expression {
	readonly kind: ZrNodeKind.CallExpression;
	readonly expression: Identifier;
	readonly options: OptionExpression[];
	readonly isUnterminated?: boolean;
	readonly arguments: Node[];
}

/**
 * An expression like `func ...`
 */
export interface SimpleCallExpression extends Expression {
	kind: ZrNodeKind.SimpleCallExpression;
	expression: Identifier;
	isUnterminated?: boolean;
	arguments: Node[];
}

export interface InnerExpression extends Expression {
	kind: ZrNodeKind.InnerExpression;
	expression: Statement | BinaryExpression;
}

export interface NodeError {
	node: Node;
	message: string;
}

export interface Option extends LeftHandSideExpression {
	flag: string;
	right?: Node;
}

export interface OptionExpression extends Expression {
	option: Option;
	expression: Expression;
}

export const VALID_PREFIX_CHARS = ["~", "@", "%", "^", "*", "!"] as const;
export interface PrefixToken extends Node {
	value: typeof VALID_PREFIX_CHARS[number];
}

export interface PrefixExpression extends Expression {
	prefix: PrefixToken;
	expression: StringLiteral | NumberLiteral | InterpolatedStringExpression | BooleanLiteral;
}

export interface Identifier extends Declaration, LeftHandSideExpression {
	name: string;
	prefix: string;
}

export interface EndOfStatement extends Node {
	kind: ZrNodeKind.EndOfStatement;
}

type NonParentNode<T> = T extends { children: Node[] } ? never : T;
export type ParentNode = Exclude<Node, NonParentNode<Node>>;

export type NodeKind = keyof NodeTypes;
