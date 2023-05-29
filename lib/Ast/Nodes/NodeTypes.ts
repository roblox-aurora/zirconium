/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZrSymbol, ZrSymbolTable } from "Binder";
import type { ZrNodeKind, ZrNodeFlag } from "./Enum";
import { ASSIGNABLE } from "./Guards";

export interface ZrNodeKinds {
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
	[ZrNodeKind.ObjectLiteralExpression]: ObjectLiteralExpression;
	[ZrNodeKind.PropertyAssignment]: PropertyAssignment;
	[ZrNodeKind.UnaryExpression]: UnaryExpression;
	[ZrNodeKind.UndefinedKeyword]: UndefinedKeyword;
	[ZrNodeKind.ExportKeyword]: ExportKeyword;
	[ZrNodeKind.FunctionExpression]: FunctionExpression;
	[ZrNodeKind.ReturnStatement]: ReturnStatement;
	[ZrNodeKind.RangeExpression]: RangeExpression;
	[ZrNodeKind.EnumDeclaration]: EnumDeclarationStatement;
	[ZrNodeKind.EnumItemExpression]: EnumItemExpression;
	[ZrNodeKind.EmptyExpression]: EmptyExpression;
	[ZrNodeKind.EmptyStatement]: EmptyStatement;
	[ZrNodeKind.ElementAccessExpression]: ElementAccessExpression;
}
export type ZrNodes = ZrNodeKinds[keyof ZrNodeKinds];

export type ZrEditNode<T extends ZrNode> = Writable<T>;

export interface ZrNode {
	kind: ZrNodeKind;
	parent?: ZrNode;
	startPos?: number;
	rawText?: string;
	endPos?: number;
	children?: ZrNode[];
	flags: ZrNodeFlag;

	/** @internal */
	symbol?: ZrSymbol;
}

export type VariableAccessExpression = Identifier | ElementAccessExpression | PropertyAccessExpression;

export interface ValuesExpression extends Expression {
	readonly values: ZrNode[];
}

export interface ElementAccessExpression extends Expression {
	readonly expression: Expression;
	readonly argumentExpression: Expression;
}

export interface Statement extends ZrNode {
	/** @deprecated */
	readonly _nominal_Statement: unique symbol;
}

export interface EmptyStatement extends Statement {}

export interface Declaration extends ZrNode {
	/** @deprecated */
	readonly _nominal_Declaration: unique symbol;
}

type DeclarationName = Identifier | StringLiteral | NumberLiteral;
export interface NamedDeclaration extends Declaration {
	readonly name?: DeclarationName;
}

export interface Keyword extends ZrNode {
	readonly _nominal_Keyword: unique symbol;
}

type PropertyName = Identifier | StringLiteral | NumberLiteral;
export interface ObjectLiteralElement extends NamedDeclaration {
	/** @deprecated */
	readonly _nominal_ObjectLiteralElement: unique symbol;
	readonly name?: PropertyName;
}

interface TypeSymbol {}

export interface LeftHandSideExpression extends Expression {
	/** @deprecated */
	readonly _nominal_LeftHandSide: unique symbol;
}

export interface Expression extends ZrNode {
	/** @deprecated */
	readonly _nominal_Expression: unique symbol;
}

export interface EmptyExpression extends Expression {}

export interface LiteralExpression extends Expression {
	/** @deprecated */
	readonly _nominal_Literal: unique symbol;
}

export interface DeclarationStatement extends Declaration, Statement {}

type OP = "&&" | "|" | "=";

export interface OperatorToken extends ZrNode {
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

export interface RangeExpression extends Expression {
	kind: ZrNodeKind.RangeExpression;
	left: Expression;
	right: Expression;
}

export interface TypeReference extends ZrNode {
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

export interface SourceFile extends ZrNode {
	kind: ZrNodeKind.Source;
	children: Array<ZrNode>;
	locals?: ZrSymbolTable;
}

export interface InterpolatedStringExpression extends ValuesExpression {
	kind: ZrNodeKind.InterpolatedString;
	values: Array<StringLiteral | Identifier>;
}

export interface UnaryExpression extends Expression {
	kind: ZrNodeKind.UnaryExpression;
	expression: ZrNode;
	operator: string;
}

export interface BinaryExpression extends Expression {
	kind: ZrNodeKind.BinaryExpression;
	left: Expression;
	operator: string;
	right: Expression;
	children: ZrNode[];
}

export interface EnumItemExpression extends Expression {
	kind: ZrNodeKind.EnumItemExpression;
	name: Identifier;
}

export interface EnumDeclarationStatement extends DeclarationStatement {
	kind: ZrNodeKind.EnumDeclaration;
	name: Identifier;
	values: EnumItemExpression[];
}

export interface ArrayLiteralExpression extends ValuesExpression {
	kind: ZrNodeKind.ArrayLiteralExpression;
	values: ZrNode[];
}

export interface PropertyAssignment extends ObjectLiteralElement {
	kind: ZrNodeKind.PropertyAssignment;
	name: Identifier;
	initializer: Expression;
}

export interface ObjectLiteralExpression extends LiteralExpression, ValuesExpression {
	kind: ZrNodeKind.ObjectLiteralExpression;
	values: PropertyAssignment[];
}

export interface InvalidNode extends ZrNode {
	kind: ZrNodeKind.Invalid;
	expression: ZrNode;
	message: string;
}

export interface VariableDeclaration extends DeclarationStatement {
	kind: ZrNodeKind.VariableDeclaration;
	type: TypeReference | undefined;
	identifier: Identifier | PropertyAccessExpression | ArrayIndexExpression;
	expression: AssignableExpression;
}

export interface VariableStatement extends Statement, Expression {
	kind: ZrNodeKind.VariableStatement;
	modifiers?: Array<ExportKeyword>;
	declaration: VariableDeclaration;
}

export interface PropertyAccessExpression extends Expression {
	kind: ZrNodeKind.PropertyAccessExpression;
	expression: Identifier | PropertyAccessExpression | ArrayIndexExpression | ElementAccessExpression;
	name: Identifier;
}

/**
 * @deprecated Use {@link ElementAccessExpression} with a `NumericLiteral` as the argumentExpression
 */
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

export type AssignableExpression = ZrNodeKinds[typeof ASSIGNABLE[number]];

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
	readonly expression: Identifier | PropertyAccessExpression | ArrayIndexExpression | ElementAccessExpression;
	readonly options: OptionExpression[];
	readonly isUnterminated?: boolean;
	readonly isSimpleCall: boolean;
	readonly arguments: ZrNode[];
}

/**
 * An expression like `func ...`
 * @deprecated
 */
export interface SimpleCallExpression extends Expression {
	kind: ZrNodeKind.SimpleCallExpression;
	expression: Identifier | ArrayIndexExpression | PropertyAccessExpression;
	isUnterminated?: boolean;
	arguments: ZrNode[];
}

export interface InnerExpression extends Expression {
	kind: ZrNodeKind.InnerExpression;
	expression: Statement | BinaryExpression;
}

export interface NodeError {
	node: ZrNode;
	message: string;
}

export interface Option extends LeftHandSideExpression {
	flag: string;
	right?: ZrNode;
}

export interface OptionExpression extends Expression {
	option: Option;
	expression: Expression;
}

export const VALID_PREFIX_CHARS = ["~", "@", "%", "^", "*", "!"] as const;
export interface PrefixToken extends ZrNode {
	value: typeof VALID_PREFIX_CHARS[number];
}

export interface PrefixExpression extends Expression {
	prefix: PrefixToken;
	expression: StringLiteral | NumberLiteral | InterpolatedStringExpression | BooleanLiteral;
}

export interface Identifier extends Declaration, LeftHandSideExpression, TypeSymbol {
	name: string;
	prefix: string;
}

export interface EndOfStatement extends ZrNode {
	kind: ZrNodeKind.EndOfStatement;
}

type NonParentNode<T> = T extends { children: ZrNode[] } ? never : T;
export type ParentNode = Exclude<ZrNode, NonParentNode<ZrNode>>;

export type NodeKind = keyof ZrNodeKinds;
