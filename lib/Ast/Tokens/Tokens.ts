export const enum ZrTokenType {
	Identifier = "Id",
	Comment = "Comment",
	String = "String",
	InterpolatedString = "InterpolatedString",
	Number = "Number",
	Boolean = "Boolean",
	Operator = "Operator",
	Option = "Option",
	Special = "Special",
	Keyword = "Keyword",
	/** @deprecated */
	PropertyAccess = "Property",
	/** @deprecated */
	ArrayIndex = "ArrayIndex",
	EndOfStatement = "EndOfStatement",
	Whitespace = "Whitespace",
}

export const KEYWORDS = ["if", "else", "for", "in", "function", "while", "const", "let"];
export const TYPES = ["number", "string", "boolean"];

export interface TokenTypes {
	[ZrTokenType.Identifier]: IdentifierToken;
	[ZrTokenType.String]: StringToken;
	[ZrTokenType.Number]: NumberToken;
	[ZrTokenType.Operator]: OperatorToken;
	[ZrTokenType.Special]: SpecialToken;
	[ZrTokenType.Boolean]: BooleanToken;
	[ZrTokenType.Keyword]: KeywordToken;
	[ZrTokenType.InterpolatedString]: InterpolatedStringToken;
	[ZrTokenType.EndOfStatement]: EndOfStatementToken;
	[ZrTokenType.ArrayIndex]: ArrayIndexToken;
	[ZrTokenType.PropertyAccess]: PropertyAccessToken;
	[ZrTokenType.Option]: OptionToken;
	[ZrTokenType.Whitespace]: WhitespaceToken;
	[ZrTokenType.Comment]: CommentToken;
}

export type Token = TokenTypes[keyof TokenTypes];

export const enum ZrTokenFlag {
	None = 0,
	UnterminatedString = 1 << 0,
	Interpolated = 1 << 1,
	FunctionName = 1 << 2,
	Label = 1 << 3,
	InvalidIdentifier = 1 << 4,
	VariableDeclaration = 1 << 5,
	VariableDollarIdentifier = 1 << 6,
	EnumName,
}

export interface TokenBase {
	kind: ZrTokenType;
	startPos: number;
	endPos: number;
	flags: ZrTokenFlag;
}

export interface WhitespaceToken extends TokenBase {
	kind: ZrTokenType.Whitespace;
	value: string;
}

export interface CommentToken extends TokenBase {
	kind: ZrTokenType.Comment;
	value: string;
}

export interface OptionToken extends TokenBase {
	kind: ZrTokenType.Option;
	value: string;
	prefix?: string;
}

export interface IdentifierToken extends TokenBase {
	kind: ZrTokenType.Identifier;
	value: string;
}

export interface ArrayIndexToken extends TokenBase {
	kind: ZrTokenType.ArrayIndex;
	value: string;
}

export interface PropertyAccessToken extends TokenBase {
	kind: ZrTokenType.PropertyAccess;
	properties: string[];
	value: string;
}

export interface BooleanToken extends TokenBase {
	kind: ZrTokenType.Boolean;
	value: boolean;
	rawText: string;
}

export interface SpecialToken extends TokenBase {
	kind: ZrTokenType.Special;
	value: string;
}

export interface EndOfStatementToken extends TokenBase {
	kind: ZrTokenType.EndOfStatement;
	value: string;
}

export interface OperatorToken extends TokenBase {
	kind: ZrTokenType.Operator;
	value: string;
}

export interface StringToken extends TokenBase {
	kind: ZrTokenType.String;
	value: string;
	closed: boolean;
	startCharacter?: string;
	endCharacter?: string;
}

export function joinInterpolatedString(values: string[], variables: string[]) {
	const resulting = new Array<string>();
	for (let k = 0; k < values.size(); k++) {
		const v = values[k];
		resulting.push(v);

		const matchingVar = variables[k];
		if (matchingVar !== undefined) {
			resulting.push(`$${matchingVar}`);
		}
	}
	return resulting.join("");
}

export interface InterpolatedStringToken extends TokenBase {
	kind: ZrTokenType.InterpolatedString;
	values: string[];
	value: string;
	variables: string[];
	closed?: boolean;
	quotes?: string;
}

type Keywords = typeof KEYWORDS[number];

export interface KeywordToken extends TokenBase {
	kind: ZrTokenType.Keyword;
	value: Keywords;
}

export interface NumberToken extends TokenBase {
	kind: ZrTokenType.Number;
	value: number;
	rawText: string;
}

export type ZrToken = TokenTypes[keyof TokenTypes];

export function isToken<K extends keyof TokenTypes>(token: ZrToken, kind: K): token is TokenTypes[K] {
	return token !== undefined && token.kind === kind;
}
