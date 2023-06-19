export enum ZrNodeKind {
	Unknown,
	/** `cmd ...; cmd2 ...; ...` */
	Source,

	/** Any statement with an expression */
	ExpressionStatement,

	/** `cmd(...)` */
	CallExpression,

	/** `cmd ...` */
	SimpleCallExpression,

	/** `$( ... )`
	 * @deprecated
	 */
	InnerExpression,
	/** `{ ... }` */
	Block,
	/** `"value"` or `'value'` or `value` */
	String,
	/** `true` or `false` */
	Boolean,

	/** `10`, `10.0` */
	Number,
	OptionKey,
	/** `--key <value>`, `--key`, `-k` */
	OptionExpression,
	/** `$var` */
	Identifier,
	OperatorToken,
	/** `cmd1 && cmd2`, `cmd1 | cmd2`, `cmd1 || cmd2` */
	BinaryExpression,
	/** `"test $variable interpolated"`, `'test $variable interpolated'` */
	InterpolatedString,
	PrefixToken,
	PrefixExpression,
	EndOfStatement,
	/** `$x = <value>` */
	VariableDeclaration,
	/** `[export] $x = <value>` */
	VariableStatement,
	Invalid,
	/** `if (<expression>)` */
	IfStatement,
	/** `[<value>, <value>, ...]` */
	ArrayLiteralExpression,
	/** @deprecated */
	ArrayIndexExpression,
	/** `$var.value` */
	PropertyAccessExpression,

	/** `for (<var> in <expression>)` */
	ForInStatement,

	ParenthesizedExpression,

	/** `function <id>([...parameters]) { <statements> }` */
	FunctionDeclaration,

	/** `function([...parameters]) { [statements] }` */
	FunctionExpression,

	/** `<id> [: <typeReference>]` */
	Parameter,

	TypeReference,

	/** `{ a: <expression>, b: <expression>, ... }`  */
	ObjectLiteralExpression,
	/** `id: <expression>` */
	PropertyAssignment,

	UnaryExpression,

	/**
	 * `undefined`
	 */
	UndefinedKeyword,

	/**
	 * `export`
	 */
	ExportKeyword,

	/** Range expression */
	RangeExpression,

	/**
	 * `return <expression>`
	 */
	ReturnStatement,

	/**
	 * ```ts
	 * enum EnumName {
	 * 	[EnumItemExpression, ...]
	 * }
	 * ```
	 */
	EnumDeclaration,

	/**
	 * `EnumItem`
	 */
	EnumItemExpression,

	EmptyExpression,

	EmptyStatement,

	/**
	 * Element access - `x[0]`, `x["hi there"]`, `x[var]`
	 */
	ElementAccessExpression,
}

export enum ZrTypeKeyword {
	Any = "any",
}

export const CmdSyntaxKind = ZrNodeKind;


export const enum ZrNodeFlag {
    None = 0,
    Const = 1 << 0,
    Let = 1 << 1,

    HasImplicitReturn = 1 << 8,
    ThisNodeHasError = 1 << 16,
	IncompleteNode = 1 << 31,
}
