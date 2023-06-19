export const enum Precedence {
	Brackets = 30,
	Exponents = 25,
	Division = 21,
	Multiplication = 20,
	Addition = 11,
	Subtraction = 10,
}

const Grammar = {
	Operators: ["&", "|", "=", ">", "<", "-", "+", "/", "*", "!", "?", "%", "^", "~"],
	UnaryOperators: ["!", "-", "+"],
	EndOfStatement: [";"],
	Punctuation: ["(", ")", ",", "{", "}", "[", "]", ".", ":", "\\", "@", "`"],
	BooleanLiterals: ["true", "false"],
	Keywords: [
		"if",
		"else",
		"for",
		"in",
		"enum",
		"declare",
		"async",
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
		"??": 2,
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

		"+": Precedence.Addition,
		"-": Precedence.Subtraction,
		"*": Precedence.Multiplication,
		"/": Precedence.Division,
		"%": Precedence.Division,
		"**": Precedence.Exponents,
	}),
	SpecialTokenId: {
		BodyBegin: "{",
		BodyEnd: "}",
		FunctionParameterBegin: "(",
		FunctionParameterEnd: ")",
	},
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
	ElementBegin = "[",
	ElementEnd = "]",
	ArrayEnd = "]",
	ObjectBegin = "{",
	ObjectEnd = "}",
	Dot = ".",
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
	return items as unknown as KeywordMap<K>;
}

export const Keywords = makeKeywordMap(Grammar.Keywords);
export default Grammar;
