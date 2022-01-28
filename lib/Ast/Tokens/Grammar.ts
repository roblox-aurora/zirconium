const Grammar = {
	Operators: ["&", "|", "=", ">", "<", "-", "+", "/", "*", "!", "?", "%", "^", "~"],
	UnaryOperators: ["!", "-", "+"],
	EndOfStatement: [";", "\n"],
	Punctuation: ["(", ")", ",", "{", "}", "[", "]", ".", ":", "\\", "@", "`"],
	BooleanLiterals: ["true", "false"],
	Keywords: [
		"if",
		"else",
		"for",
		"in",
		"enum",
		"declare",
		"function",
		"let",
		"export",
		"const",
		"delete",
		"undefined",
		"new",
		"continue",
		"while",
		"return",
		"default",
		"null",
		"nil",
		"import",
		"set",
		"get",
		"try",
		"catch",
		"finally",
		"class",
		"do",
		"throw",
		"from",
	],
	Types: ["number", "string", "boolean"],
	OperatorPrecedence: identity<Record<string, number>>({
		"..": 1,
		"!": 2,
		"=": 2,
		"+=": 2,
		"-=": 2,
		"|": 3,
		"||": 3,
		"&&": 4,
		"<": 7,
		">": 7,
		">=": 7,
		"<=": 7,
		"==": 7,
		"!=": 7,
		"+": 10,
		"-": 10,
		"*": 20,
		"/": 20,
		"%": 20,
	}),
	SpecialTokenId: {
		BodyBegin: "{",
		BodyEnd: "}",
		FunctionParameterBegin: "(",
		FunctionParameterEnd: ")",
	}
} as const;

export const enum OperatorTokenId {
	UnaryMinus = "-",
	UnaryPlus = "+",
	UnaryNot = "!",
}

export const enum SpecialTokenId {
	BodyBegin = "{",
	BodyEnd = "}",
	FunctionParametersBegin = "(",
	FunctionParametersEnd = ")",
	FunctionParametersSeparator = ",",
	SimpleCallInlineExpressionDelimiter = "$",
	ArrayBegin = "[",
	ArrayEnd = "]",
	ObjectBegin = "{",
	ObjectEnd = "}"
}

export type OperatorTokens = typeof Grammar["Operators"][number];
export type KeywordTokens = typeof Grammar["Keywords"][number];
export type EndOfStatementTokens = typeof Grammar["EndOfStatement"][number];
export type PunctuationTokens = typeof Grammar["Punctuation"][number];
export type BooleanLiteralTokens = typeof Grammar["BooleanLiterals"][number];
export type UnaryOperatorsTokens = typeof Grammar["UnaryOperators"][number];

export type KeywordMap<K extends ReadonlyArray<string>> = { readonly [P in Uppercase<K[number]>]: Lowercase<P> };
function makeKeywordMap<K extends ReadonlyArray<string>>(value: K) {
	const items: Record<string, string> = {};
	for (const item of value) {
		items[item.upper()] = item;
	}
	return (items as unknown) as KeywordMap<K>;
}

export const Keywords = makeKeywordMap(Grammar.Keywords);
export default Grammar;
