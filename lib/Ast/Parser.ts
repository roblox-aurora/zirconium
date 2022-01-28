import { AstCommandDefinitions } from "./Definitions/Definitions";
import { $print } from "rbxts-transform-debug";
import ZrLexer from "./Lexer";
import { ZrNodeKind, isNode } from "./Nodes";
import * as ErrorStrings from "./ErrorStrings.json";
import {
	createArrayIndexExpression,
	createArrayLiteral,
	createBinaryExpression,
	createBlock,
	createBooleanNode,
	createCallExpression,
	createSourceFile,
	createExpressionStatement,
	createForInStatement,
	createFunctionDeclaration,
	createIdentifier,
	createIfStatement,
	createInterpolatedString,
	createKeywordTypeNode,
	createNumberNode,
	createObjectLiteral,
	createOptionExpression,
	createOptionKey,
	createParameter,
	createParenthesizedExpression,
	createPropertyAccessExpression,
	createPropertyAssignment,
	createSimpleCallExpression,
	createStringNode,
	createTypeReference,
	createUnaryExpression,
	createVariableDeclaration,
	createVariableStatement,
	createUndefined,
	createExportKeyword,
	createFunctionExpression,
	createReturnStatement,
	withError,
	updateNodeInternal,
	createEnumDeclaration,
	createEnumItemExpression,
} from "./Nodes/Create";
import { ZrNodeFlag, ZrTypeKeyword } from "./Nodes/Enum";
import { getFriendlyName, getVariableName } from "./Nodes/Functions";
import { isAssignableExpression, isOptionExpression } from "./Nodes/Guards";
import {
	ArrayIndexExpression,
	CallExpression,
	EnumItemExpression,
	Expression,
	ForInStatement,
	Identifier,
	Node,
	OptionExpression,
	ParameterDeclaration,
	PropertyAccessExpression,
	PropertyAssignment,
	SimpleCallExpression,
	Statement,
	StringLiteral,
	VariableDeclaration,
	VariableStatement,
} from "./Nodes/NodeTypes";
import Grammar, { Keywords, OperatorTokens, UnaryOperatorsTokens } from "./Tokens/Grammar";
import {
	ArrayIndexToken,
	IdentifierToken,
	InterpolatedStringToken,
	isToken,
	KeywordToken,
	OperatorToken,
	PropertyAccessToken,
	StringToken,
	Token,
	TokenTypes,
	ZrTokenFlag,
	ZrTokenKind,
} from "./Tokens/Tokens";
import prettyPrintNodes from "./Utility/PrettyPrintNodes";

export const enum ZrParserErrorCode {
	Unexpected = 1001,
	UnexpectedWord,
	InvalidVariableAssignment,
	IdentifierExpected,
	ExpectedToken,
	NotImplemented,
	ExpressionExpected,
	UnterminatedStringLiteral,
	FunctionIdentifierExpected,
	KeywordReserved,
	InvalidIdentifier,
	InvalidPropertyAccess,
	InvalidReturnStatement,
	ExpectedBlock,
	ExpectedKeyword,
}

interface FunctionCallContext {
	strict: boolean;
}

export const enum ZrParserWarningCode {
	/**
	 * Function names do not require $ prefix.
	 */
	FunctionIdWithPrefix = 1,
}

export interface ZrParserError {
	message: string;
	code: ZrParserErrorCode;
	node?: Node;
	token?: Token;
	range?: [number, number];
}

export interface ZrParserWarning {
	message: string;
	code: ZrParserWarningCode;
	node?: Node;
	token?: Token;
}

export const enum ZrScriptMode {
	CommandLike = "command",
	Strict = "strict",
}

export const enum ZrScriptVersion {
	Zr2020 = 0,

	/**
	 * Enables `let`, `const`
	 */
	Zr2021 = 1000,

	/**
	 * Enables `enum`, `export`
	 */
	Zr2022 = 1001,
}

export interface ZrParserOptions {
	version: number;
	enableExport: boolean;
	mode: ZrScriptMode;
}

export default class ZrParser {
	private preventCommandParsing = false;
	private strict = false;
	private callContext = new Array<FunctionCallContext>();
	private functionContext = new Array<string>();
	private errors = new Array<ZrParserError>();
	private warnings = new Array<ZrParserWarning>();
	private options: ZrParserOptions;
	private enableExportKeyword = false;
	private enableUserEnum = false;
	private experimentalFeaturesEnabled = false;

	public constructor(private lexer: ZrLexer, options?: Partial<ZrParserOptions>) {
		this.options = {
			version: ZrScriptVersion.Zr2021,
			mode: ZrScriptMode.CommandLike,
			enableExport: false,
			...options,
		};
		this.strict = this.options.mode === ZrScriptMode.Strict;
		this.enableExportKeyword = this.options.enableExport;

		if (this.options.version >= ZrScriptVersion.Zr2021) {
			this.experimentalFeaturesEnabled = true;
		}

		if (this.options.version >= ZrScriptVersion.Zr2022) {
			this.enableUserEnum = true;
		}
	}

	private getCurrentCallContext(): FunctionCallContext | undefined {
		return this.callContext[this.callContext.size() - 1];
	}

	private parserErrorNode<TNode extends Node>(
		message: string,
		code: ZrParserErrorCode,
		node: TNode,
		range?: [number, number],
	) {
		this.errors.push(
			identity<ZrParserError>({
				message,
				code,
				node,
				range,
			}),
		);
		return withError(node);
	}

	private throwParserError(message: string, code: ZrParserErrorCode, token?: Token): never {
		this.errors.push(
			identity<ZrParserError>({
				message,
				code,
				token,
				range: token ? [token.startPos, token.endPos] : undefined,
			}),
		);
		this._throwParserError(message);
	}

	private throwParserNodeError(message: string, code: ZrParserErrorCode, node?: Node): never {
		this.errors.push(
			identity<ZrParserError>({
				message,
				code,
				node,
				range: node?.startPos ? [node.startPos, node.endPos ?? node.startPos] : undefined,
			}),
		);
		this._throwParserError(message);
	}

	private _throwParserError(message: string): never {
		throw `[ZParser] Parsing Error: ${message} \n` + debug.traceback("", 2);
	}

	/**
	 * Checks whether or not the specified token kind is the current
	 */
	private is(kind: ZrTokenKind, value?: string | number | boolean) {
		const token = this.lexer.peek();
		if (value !== undefined) {
			return token !== undefined && token.kind === kind && token.value === value;
		} else {
			return token !== undefined && token.kind === kind;
		}
	}

	/**
	 * Gets the token of the specified kind, if it's the next token
	 */
	public get<K extends keyof TokenTypes>(kind: K, value?: TokenTypes[K]["value"]): TokenTypes[K] | undefined {
		return this.is(kind, value) ? (this.lexer.peek()! as TokenTypes[K]) : undefined;
	}

	private tokenToString(token: Token | undefined) {
		if (token === undefined) {
			return "<EOF>";
		} else if (token.value === "\n") {
			return "<newline>";
		} else {
			return `'${token.value}'`;
		}
	}

	/**
	 * Skips a token of a specified kind if it's the next
	 */
	private skip(kind: ZrTokenKind, value?: string | number | boolean, message?: string) {
		if (this.is(kind, value)) {
			return this.lexer.next()!;
		} else {
			const node = this.lexer.peek();
			this.throwParserError(
				message ?? `ZrParser.skip("${kind}", ${value ? `'${value}'` : 'undefined'}): Expected '` + value + "' got " + this.tokenToString(node),
				ZrParserErrorCode.Unexpected,
				node,
			);
		}
	}

	/**
	 * Skips token if it exists.
	 */
	private skipIf(kind: ZrTokenKind, value: string | number | boolean) {
		if (this.is(kind, value)) {
			this.lexer.next();
			return true;
		} else {
			return false;
		}
	}

	private parseBlock() {
		const statements = new Array<Statement>();

		this.skip(ZrTokenKind.Special, "{");
		while (this.lexer.hasNext()) {
			if (this.is(ZrTokenKind.Special, "}")) {
				break;
			}

			if (this.skipIf(ZrTokenKind.EndOfStatement, "\n")) {
				continue;
			}

			statements.push(this.parseNextStatement());
		}

		this.skip(ZrTokenKind.Special, "}");
		return createBlock(statements);
	}

	/**
	 * Parses an inline statement (e.g. `if $true: <expression>`)
	 *
	 * Short-hand and only takes one expression. For multiple use `parseBlock`.
	 */
	private parseInlineStatement() {
		if (this.is(ZrTokenKind.Special, ":")) {
			this.skip(ZrTokenKind.Special, ":");
			return createBlock([this.mutateStatement(this.parseNext()) as Statement]);
		} else {
			this.throwParserError("Expected ':' got  " + this.lexer.peek()?.kind, ZrParserErrorCode.ExpectedToken);
		}
	}

	private parseBlockOrInlineStatement() {
		if (this.is(ZrTokenKind.Special, ":")) {
			return this.parseInlineStatement();
		} else {
			return this.parseBlock();
		}
	}

	private parseParameters() {
		const parameters = new Array<ParameterDeclaration>();
		if (this.is(ZrTokenKind.Special, "(")) {
			this.skip(ZrTokenKind.Special, "(");

			let index = 0;
			while (this.lexer.hasNext() && !this.is(ZrTokenKind.Special, ")")) {
				if (index > 0) {
					this.skip(ZrTokenKind.Special, ",");
				}

				index++;

				// If valid parameter
				if (this.is(ZrTokenKind.Identifier)) {
					const id = this.lexer.next() as IdentifierToken;

					// Check for parameter type
					if (this.is(ZrTokenKind.Special, ":")) {
						this.skip(ZrTokenKind.Special, ":");

						// TODO: More advanced types later.
						if (this.is(ZrTokenKind.String)) {
							const typeName = this.lexer.next() as StringToken;
							parameters.push(
								createParameter(
									createIdentifier(id.value),
									createTypeReference(createIdentifier(typeName.value)),
								),
							);
						} else {
							this.throwParserError("Type expected", ZrParserErrorCode.Unexpected);
						}
					} else {
						parameters.push(
							createParameter(createIdentifier(id.value), createKeywordTypeNode(ZrTypeKeyword.Any)),
						);
					}
				} else {
					const nextItem = this.lexer.next();
					this.throwParserError(
						`Parameter item expects an identifier`,
						ZrParserErrorCode.IdentifierExpected,
						nextItem,
					);
				}
			}
			this.skip(ZrTokenKind.Special, ")");
		} else {
			this.throwParserError(
				"'(' expected got '" + (this.lexer.peek()?.value ?? "EOF") + "'",
				ZrParserErrorCode.ExpectedToken,
			);
		}
		return parameters;
	}

	private parseForIn(initializer: ForInStatement["initializer"]): ForInStatement {
		const forStatement = createForInStatement(initializer, undefined, undefined);
		this.lexer.next();

		const targetId = this.get(ZrTokenKind.Identifier);
		if (targetId !== undefined) {
			this.lexer.next();

			forStatement.expression = createIdentifier(targetId.value);
			forStatement.statement = this.parseBlockOrInlineStatement();
		} else if (!this.lexer.isNextOfKind(ZrTokenKind.EndOfStatement)) {
			const expression = this.mutateExpression(this.parseExpression());
			if (
				isNode(expression, ZrNodeKind.CallExpression) ||
				isNode(expression, ZrNodeKind.SimpleCallExpression) ||
				isNode(expression, ZrNodeKind.ArrayLiteralExpression) ||
				isNode(expression, ZrNodeKind.ObjectLiteralExpression) ||
				isNode(expression, ZrNodeKind.ArrayIndexExpression) ||
				isNode(expression, ZrNodeKind.ParenthesizedExpression) ||
				isNode(expression, ZrNodeKind.BinaryExpression)
			) {
				forStatement.expression = expression;
				forStatement.statement = this.parseBlockOrInlineStatement();
			} else {
				return this.parserErrorNode(
					"ForIn statement expects a valid expression after 'in' got " + ZrNodeKind[expression.kind],
					ZrParserErrorCode.IdentifierExpected,
					forStatement,
				);
			}
		} else {
			this.throwParserError(
				"ForIn statement expects expression after 'in'",
				ZrParserErrorCode.ExpressionExpected,
			);
		}

		return forStatement;
	}

	private parseFor() {
		this.skip(ZrTokenKind.Keyword, Keywords.FOR);
		const initializer = this.parseExpression();

		if (isNode(initializer, ZrNodeKind.Identifier)) {
			if (this.is(ZrTokenKind.Keyword, Keywords.IN)) {
				return this.parseForIn(initializer);
			} else {
				return this.throwParserNodeError(
					"Expected 'in' after initializer",
					ZrParserErrorCode.ExpectedKeyword,
					initializer,
				);
			}
		} else {
			this.throwParserError("Identifier expected after 'for'", ZrParserErrorCode.IdentifierExpected);
		}
	}

	private parseFunctionExpression() {
		const funcToken = this.skip(ZrTokenKind.Keyword, Keywords.FUNCTION);
		const paramList = this.parseParameters();

		if (this.is(ZrTokenKind.Special, "{")) {
			this.functionContext.push("<Anonymous>");
			const body = this.parseBlock();
			this.functionContext.pop();
			return createFunctionExpression(paramList, body);
		} else {
			const invalidFuncExpression = createFunctionExpression(paramList, undefined);
			return this.parserErrorNode(
				ErrorStrings.FUNCTION_IMPLEMENTATION_MISSING.format("<Anonymous>"),
				ZrParserErrorCode.ExpectedBlock,
				invalidFuncExpression,
				funcToken ? [funcToken.startPos, funcToken.endPos] : undefined,
			);
		}
	}

	private parseFunction() {
		const funcToken = this.skip(ZrTokenKind.Keyword, Keywords.FUNCTION);

		if (this.lexer.isNextOfAnyKind(ZrTokenKind.String, ZrTokenKind.Identifier)) {
			const id = this.lexer.next() as StringToken | IdentifierToken;
			const idNode = createIdentifier(id.value);
			this.functionContext.push(idNode.name);
			const paramList = this.parseParameters();

			if (this.is(ZrTokenKind.Special, "{")) {
				const body = this.parseBlock();
				this.functionContext.pop();
				return createFunctionDeclaration(idNode, paramList, body);
			} else {
				return this.parserErrorNode(
					ErrorStrings.FUNCTION_IMPLEMENTATION_MISSING.format(idNode.name),
					ZrParserErrorCode.NotImplemented,
					createFunctionDeclaration(idNode, paramList, undefined),
					[id.startPos, id.endPos],
				);

				// this.throwParserError(
				// 	ErrorStrings.FUNCTION_IMPLEMENTATION_MISSING.format(idNode.name),
				// 	ZrParserErrorCode.NotImplemented,
				// 	id,
				// );
			}
		} else {
			this.throwParserError(
				ErrorStrings.FUNCTION_ID_EXPECTED,
				ZrParserErrorCode.FunctionIdentifierExpected,
				this.lexer.next() ?? funcToken,
			);
		}
	}

	private parseIfStatement() {
		const token = this.skip(ZrTokenKind.Keyword, Keywords.IF);

		const expr = this.mutateExpression(this.parseExpression());
		const node = createIfStatement(expr, undefined, undefined);

		if (this.is(ZrTokenKind.Special, ":")) {
			node.thenStatement = this.parseInlineStatement();
			return node;
		} else if (this.is(ZrTokenKind.Special, "{")) {
			node.thenStatement = this.parseBlock();
		} else {
			return this.parserErrorNode(
				"Expected block or inline block after if statement",
				ZrParserErrorCode.ExpectedBlock,
				node,
			);
		}

		if (this.is(ZrTokenKind.Keyword, Keywords.ELSE)) {
			this.lexer.next();

			if (this.is(ZrTokenKind.Keyword, Keywords.IF)) {
				node.elseStatement = this.parseIfStatement();
			} else if (this.is(ZrTokenKind.Special, "{")) {
				node.elseStatement = this.parseBlock();
			} else if (this.is(ZrTokenKind.Special, ":")) {
				node.elseStatement = this.parseInlineStatement();
			} else {
				return this.parserErrorNode(
					"Unexpected '" + this.lexer.peek()?.value + "' after 'else' - must be block or inline statement",
					ZrParserErrorCode.ExpectedBlock,
					node,
				);
			}
		}

		return node;
	}

	private isOperatorToken() {
		return this.lexer.isNextOfKind(ZrTokenKind.Operator);
	}

	private isEndBracketOrBlockToken() {
		return (
			this.is(ZrTokenKind.Special, ")") || this.is(ZrTokenKind.Special, "]") || this.is(ZrTokenKind.Special, "}")
			// this.is(ZrTokenKind.Special, ":")
		);
	}

	private getFunctionCallee(token: StringToken | IdentifierToken | ArrayIndexToken | PropertyAccessToken) {
		let callee: Identifier | PropertyAccessExpression | ArrayIndexExpression;
		if (token.kind === ZrTokenKind.PropertyAccess) {
			callee = this.parsePropertyAccess(token);
		} else {
			callee = createIdentifier(token.value);
		}
		return callee;
	}

	private functionCallScope = 0;
	private parseCallExpression(
		token: StringToken | IdentifierToken | PropertyAccessToken,
		isStrictFunctionCall = this.strict,
	) {
		this.functionCallScope += 1;
		const startPos = token.startPos;
		let endPos = token.startPos;

		const callee = this.getFunctionCallee(token);

		const options = new Array<OptionExpression>();
		const args = new Array<Expression>();

		// Enable 'strict' function-like calls e.g. `kill(vorlias)` vs `kill vorlias`
		if (this.is(ZrTokenKind.Special, "(") || isStrictFunctionCall) {
			this.skip(ZrTokenKind.Special, "(");
			isStrictFunctionCall = true;
			this.strict = true;
			this.callContext.push({ strict: true });
		} else {
			this.callContext.push({ strict: false });
		}

		let argumentIndex = 0;
		while (
			this.lexer.hasNext() &&
			(!this.isNextEndOfStatementOrNewline() || isStrictFunctionCall) &&
			// !this.isOperatorToken() &&
			!this.isEndBracketOrBlockToken()
		) {
			if (isStrictFunctionCall && this.is(ZrTokenKind.Special, ")")) {
				break;
			}

			const isEscaped = this.is(ZrTokenKind.Special, "\\") && this.skip(ZrTokenKind.Special, "\\");
			if ((isStrictFunctionCall || isEscaped) && this.skipIf(ZrTokenKind.EndOfStatement, "\n")) {
				continue;
			}

			let arg: Expression;
			// Handle expression mutation only if strict
			if (isStrictFunctionCall) {
				if (argumentIndex > 0) {
					this.skip(ZrTokenKind.Special, ",");
				}
				this.skipIf(ZrTokenKind.EndOfStatement, "\n");
				arg = this.mutateExpression(this.parseExpression());
			} else {
				arg = this.parseExpression(undefined, true);
				$print("addArg", arg);
			}

			if (isOptionExpression(arg)) {
				options.push(arg);
			} else {
				args.push(arg);
			}

			argumentIndex++;
			endPos = this.lexer.getStream().getPtr() - 1;
		}

		if (isStrictFunctionCall) {
			endPos = this.skip(ZrTokenKind.Special, ")").endPos - 1;
			this.strict = false;
		}

		this.callContext.pop();

		let result: CallExpression | SimpleCallExpression;

		if (isStrictFunctionCall) {
			result = createCallExpression(callee, args, options);
		} else {
			result = createSimpleCallExpression(callee, args);
			$print(result, "simpleCall");
		}

		this.functionCallScope -= 1;
		result.startPos = startPos;
		result.endPos = endPos;
		result.rawText = this.lexer.getStreamSub(startPos, endPos);
		return result;
	}

	/**
	 * Handles the parsing of a `InterpolatedStringToken`
	 * @param token The `InterpolatedStringToken`
	 * @returns the InterpolatedStringExpression
	 */
	private parseInterpolatedString(token: InterpolatedStringToken) {
		if ((token.flags & ZrTokenFlag.UnterminatedString) !== 0) {
			this.throwParserError("Unterminated string literal", ZrParserErrorCode.UnterminatedStringLiteral, token);
		}

		const { values, variables } = token;
		const resulting = new Array<StringLiteral | Identifier>();
		for (let k = 0; k < values.size(); k++) {
			const v = values[k];
			resulting.push(createStringNode(v));

			const matchingVar = variables[k];
			if (matchingVar !== undefined) {
				resulting.push(createIdentifier(matchingVar));
			}
		}

		return createInterpolatedString(...resulting);
	}

	private parseListExpression<K extends Node = Node>(
		start: string,
		stop: string,
		nextItem: () => K,
		separator = ",",
		strict = this.strict,
	): K[] {
		const values = new Array<K>();
		let index = 0;

		this.skip(ZrTokenKind.Special, start);
		this.preventCommandParsing = false;

		const functionContext = this.getCurrentCallContext();

		while (this.lexer.hasNext()) {
			if (this.is(ZrTokenKind.Special, stop)) {
				break;
			}

			if (this.skipIf(ZrTokenKind.EndOfStatement, "\n")) {
				continue;
			}

			if (index > 0 && (this.is(ZrTokenKind.Special, separator) || (functionContext && functionContext.strict))) {
				this.skip(ZrTokenKind.Special, separator);
			}

			this.skipIf(ZrTokenKind.EndOfStatement, "\n");

			values.push(nextItem());

			index++;
		}

		this.skipIf(ZrTokenKind.EndOfStatement, "\n");
		this.skip(ZrTokenKind.Special, stop);

		return values;
	}

	private parseObjectPropertyAssignment(): PropertyAssignment {
		if (this.lexer.isNextOfAnyKind(ZrTokenKind.Identifier, ZrTokenKind.String)) {
			const id = this.lexer.next() as StringToken;
			this.skip(ZrTokenKind.Special, ":"); // Expects ':'

			const preventCommandParsing = this.preventCommandParsing;
			this.preventCommandParsing = false;
			const expression = this.parseExpression();
			this.preventCommandParsing = preventCommandParsing;
			return createPropertyAssignment(createIdentifier(id.value), expression);
		} else {
			this.throwParserError("Expected Identifier", ZrParserErrorCode.IdentifierExpected, this.lexer.peek());
		}
	}

	private parseObjectExpression() {
		const values = this.parseListExpression("{", "}", () => this.parseObjectPropertyAssignment(), ",", true);
		return createObjectLiteral(values);
	}

	private parseArrayExpression() {
		const values = this.parseListExpression("[", "]", () => this.parseExpression(), undefined, true);
		return createArrayLiteral(values);
	}

	private parsePropertyAccess(token: PropertyAccessToken) {
		let expr: Identifier | PropertyAccessExpression | ArrayIndexExpression = createIdentifier(token.value);
		for (const name of token.properties) {
			if (name.match("^%d+$")[0]) {
				expr = createArrayIndexExpression(expr, createNumberNode(tonumber(name)!));
			} else {
				expr = createPropertyAccessExpression(expr, createIdentifier(name));
			}
		}
		return expr;
	}

	private parseStrictFunctionOption(option: string) {
		this.skip(ZrTokenKind.Special, ":");
		return createOptionExpression(createOptionKey(option), this.mutateExpression(this.parseExpression()));
	}

	private parseUndefined(token?: Token) {
		if (token) {
			if (isToken(token, ZrTokenKind.Keyword) && token.value === Keywords.UNDEFINED) {
				return createUndefined();
			}
		} else {
			if (this.is(ZrTokenKind.Keyword, Keywords.UNDEFINED)) {
				this.skip(ZrTokenKind.Keyword, Keywords.UNDEFINED);
				return createUndefined();
			}
		}
	}

	private parseExpression(token?: Token, treatIdentifiersAsStrings = false): Expression {
		if (this.is(ZrTokenKind.Special, "{")) {
			return this.parseObjectExpression();
		}

		if (this.is(ZrTokenKind.Special, "[")) {
			return this.parseArrayExpression();
		}

		if (this.experimentalFeaturesEnabled && this.is(ZrTokenKind.Keyword, Keywords.FUNCTION)) {
			return this.parseFunctionExpression();
		}

		// Handle literals
		token = token ?? this.lexer.next();

		const undefinedNode = this.parseUndefined(token);
		if (undefinedNode) {
			return undefinedNode;
		}

		if (!token) {
			this.throwParserError(
				"Expression expected, got EOF after " + this.lexer.prev().kind + " - " + debug.traceback(),
				ZrParserErrorCode.ExpressionExpected,
			);
		}

		if (isToken(token, ZrTokenKind.String)) {
			if (this.preventCommandParsing || token.startCharacter !== undefinedNode) {
				if (this.strict && token.startCharacter === undefinedNode) {
					this.throwParserError("Unexpected '" + token.value + "'", ZrParserErrorCode.UnexpectedWord);
				}

				if (!token.closed) {
					this.throwParserError(
						"Unterminated string literal",
						ZrParserErrorCode.UnterminatedStringLiteral,
						token,
					);
				}

				return createStringNode(token.value, token.startCharacter);
			} else if (token.value !== "") {
				if (!token.value.match("[%w_.]+")[0]) {
					this.throwParserError("Expression expected", ZrParserErrorCode.ExpressionExpected, token);
				}

				const context = this.getCurrentCallContext();

				if (this.functionCallScope > 0 && this.is(ZrTokenKind.Special, ":") && context?.strict) {
					return this.parseStrictFunctionOption(token.value);
				}

				const callContext = this.getCurrentCallContext();
				// If we're inside a function
				if (callContext) {
					if (callContext.strict) {
						const isFunctionCall = this.is(ZrTokenKind.Special, "(");
						const result = !isFunctionCall
							? createIdentifier(token.value)
							: this.parseCallExpression(token);
						return result;
					} else {
						return createStringNode(token.value);
					}
				} else {
					const result = this.parseCallExpression(token);
					return result;
				}
			}
		}

		if (isToken(token, ZrTokenKind.Identifier) || isToken(token, ZrTokenKind.PropertyAccess)) {
			if (treatIdentifiersAsStrings && (token.flags & ZrTokenFlag.VariableDollarIdentifier) === 0) {
				return createStringNode(token.value);
			}

			if (token.value === undefinedNode || token.value.size() === 0) {
				this.throwParserError("Unexpected empty identifier", ZrParserErrorCode.Unexpected, token);
			}

			const nextToken = this.lexer.peek();

			if (this.is(ZrTokenKind.Special, "(")) {
				// Handle bracketed "strict" calls e.g. `x()`
				return this.parseCallExpression(token, true);
			} else if (nextToken) {
				// Handle any `x "y"` calls as well as `x!`
				if (nextToken.kind === ZrTokenKind.Identifier || ZrLexer.IsPrimitiveValueToken(nextToken)) {
					return this.parseCallExpression(token, false);
				} else if (
					nextToken.kind === ZrTokenKind.Operator &&
					nextToken.value === "!" &&
					this.experimentalFeaturesEnabled
				) {
					this.lexer.next();

					const callee = this.getFunctionCallee(token);

					return createCallExpression(callee, []);
				}
			}

			if (isToken(token, ZrTokenKind.Identifier)) {
				return updateNodeInternal(createIdentifier(token.value), {
					startPos: token.startPos,
					endPos: token.endPos,
					rawText: token.value,
				});
			} else if (isToken(token, ZrTokenKind.PropertyAccess)) {
				let expr: Identifier | PropertyAccessExpression | ArrayIndexExpression = createIdentifier(token.value);
				for (const name of token.properties) {
					if (name.match("^%d+$")[0]) {
						expr = createArrayIndexExpression(expr, createNumberNode(tonumber(name)!));
					} else {
						expr = createPropertyAccessExpression(expr, createIdentifier(name));
					}
				}
				return expr;
			}
		} else if (isToken(token, ZrTokenKind.Number)) {
			return updateNodeInternal(createNumberNode(token.value), {
				startPos: token.startPos,
				endPos: token.endPos,
				rawText: token.rawText,
			});
		} else if (isToken(token, ZrTokenKind.Boolean)) {
			return updateNodeInternal(createBooleanNode(token.value), {
				startPos: token.startPos,
				endPos: token.endPos,
				rawText: token.rawText,
			});
		} else if (isToken(token, ZrTokenKind.InterpolatedString)) {
			return this.parseInterpolatedString(token);
		} else if (isToken(token, ZrTokenKind.EndOfStatement)) {
			this._throwParserError(`Invalid EndOfStatement: '${token.value}' [${token.startPos}:${token.endPos}]`);
		} else if (isToken(token, ZrTokenKind.Option)) {
			return createOptionKey(token.value);
		}

		if (
			isToken(token, ZrTokenKind.Operator) &&
			Grammar.UnaryOperators.includes(token.value as UnaryOperatorsTokens)
		) {
			return createUnaryExpression(token.value, this.parseExpression());
		}

		// Handle parenthesized expression
		if (isToken(token, ZrTokenKind.Special) && token.value === "(") {
			const expr = createParenthesizedExpression(this.mutateExpression(this.parseExpression()));
			this.skip(ZrTokenKind.Special, ")");
			return expr;
		}

		if (isToken(token, ZrTokenKind.Special) || isToken(token, ZrTokenKind.Operator)) {
			this.throwParserError(
				`ZrParser.parseExpression(${token.kind}, ${treatIdentifiersAsStrings}) - Unexpected Token "${token.kind}" with value "${token.value}"`,
				ZrParserErrorCode.Unexpected,
				token,
			);
		}

		if (token.kind === ZrTokenKind.Keyword) {
			this.throwParserError(
				`Cannot use '${token.value}' here, it is a reserved keyword.`,
				ZrParserErrorCode.KeywordReserved,
				token,
			);
		} else {
			this.throwParserError(
				`Unexpected '${token.value}' (${token.kind}) preceded by token ${this.lexer.prev().kind}`,
				ZrParserErrorCode.Unexpected,
				token,
			);
		}
	}

	private parseNewVariableDeclaration(keyword: string, exportKeyword?: boolean) {
		this.skip(ZrTokenKind.Keyword, keyword);
		const word = this.lexer.next();
		if (word && (word.kind === ZrTokenKind.String || word.kind === ZrTokenKind.Identifier)) {
			return this.parseVariableDeclaration(
				createIdentifier(word.value),
				keyword === "const" ? ZrNodeFlag.Const : ZrNodeFlag.Let,
				exportKeyword ? [createExportKeyword()] : undefined,
			);
		} else {
			this.throwParserError(
				"'" + keyword + "' must be followed by a text identifier",
				ZrParserErrorCode.InvalidVariableAssignment,
				word,
			);
		}
	}

	private isVariableDeclarationStatement() {
		return this.get(ZrTokenKind.Keyword, Keywords.LET) ?? this.get(ZrTokenKind.Keyword, Keywords.CONST);
	}

	private parseEnumStatement() {
		const enumToken = this.skip(ZrTokenKind.Keyword, Keywords.ENUM);

		if (this.lexer.isNextOfKind(ZrTokenKind.Identifier)) {
			const id = this.lexer.next() as IdentifierToken;
			const idNode = createIdentifier(id.value, "");

			if (this.is(ZrTokenKind.Special, "{")) {
				const items = this.parseListExpression(
					"{",
					"}",
					() => {
						const id = this.skip(ZrTokenKind.Identifier) as IdentifierToken;
						return createEnumItemExpression(createIdentifier(id.value));
					},
					",",
					true,
				);

				return createEnumDeclaration(idNode, items);
			} else {
				this.throwParserError("Enum requires body", ZrParserErrorCode.ExpectedBlock, enumToken);
			}
		}

		throw `Not Implemented`;
	}

	private parseDeclarations() {
		if (this.is(ZrTokenKind.Keyword, Keywords.FUNCTION)) {
			return this.parseFunction();
		}

		if (this.is(ZrTokenKind.Keyword, Keywords.ENUM) && this.enableUserEnum) {
			return this.parseEnumStatement();
		}
	}

	/**
	 * Parses the next expression statement
	 */
	private parseNextStatement(): Statement {
		const declaration = this.parseDeclarations();
		if (declaration) {
			return declaration;
		}

		if (this.is(ZrTokenKind.Keyword, Keywords.RETURN)) {
			this.skip(ZrTokenKind.Keyword, Keywords.RETURN);
			if (this.functionContext.size() > 0) {
				return createReturnStatement(this.parseExpression());
			} else {
				this.throwParserError(
					"'return' can only be used inside of functions",
					ZrParserErrorCode.InvalidReturnStatement,
					this.lexer.prev(),
				);
			}
		}

		if (this.is(ZrTokenKind.Keyword, Keywords.FOR)) {
			return this.parseFor();
		}

		if (this.is(ZrTokenKind.Special, "{")) {
			return this.parseBlock();
		}

		if (this.is(ZrTokenKind.Keyword, Keywords.IF)) {
			return this.parseIfStatement();
		}

		if (this.experimentalFeaturesEnabled) {
			let variable: KeywordToken | undefined;
			if (this.is(ZrTokenKind.Keyword, Keywords.EXPORT) && this.enableExportKeyword) {
				this.skip(ZrTokenKind.Keyword, Keywords.EXPORT);
				if ((variable = this.isVariableDeclarationStatement())) {
					return this.parseNewVariableDeclaration(variable.value, true);
				}
			} else {
				if ((variable = this.isVariableDeclarationStatement())) {
					return this.parseNewVariableDeclaration(variable.value);
				}
			}
		}

		const token = this.lexer.next();
		assert(token);

		// This passes the token directly, since in this case the expressions statement is part of our statement
		// generation code anyway.
		return createExpressionStatement(this.mutateExpression(this.parseExpression(token)));
	}

	private parseVariableDeclaration(
		left: Identifier | PropertyAccessExpression | ArrayIndexExpression,
		flags: ZrNodeFlag = 0,
		modifiers?: VariableStatement["modifiers"],
	) {
		const prev = this.get(ZrTokenKind.Operator);
		this.skipIf(ZrTokenKind.Operator, "=");
		$print("skipIf =", prev);
		let right = this.mutateExpression(this.parseExpression());

		// Simplify the expression a bit, if it's parenthesized
		if (isNode(right, ZrNodeKind.ParenthesizedExpression)) {
			right = right.expression;
		}

		if (isAssignableExpression(right)) {
			// isAssignment
			const decl = createVariableDeclaration(left, right);
			decl.flags = flags;
			const statement = createVariableStatement(decl, modifiers);
			return statement;
		} else {
			this.throwParserNodeError(
				`Cannot assign ${getFriendlyName(right)} to variable '${getVariableName(left)}'`,
				ZrParserErrorCode.InvalidVariableAssignment,
				right,
			);
		}
	}

	private mutateExpression(left: Expression, precedence = 0): Expression {
		const token = this.get(ZrTokenKind.Operator);
		if (token) {
			const otherPrecedence = Grammar.OperatorPrecedence[token.value];
			assert(otherPrecedence !== undefined, `No precedence for '${token.value}'`);
			if (otherPrecedence > precedence) {
				const prev = this.lexer.prev();
				this.lexer.next();

				if (token.value === "=" && left.kind !== ZrNodeKind.Identifier) {
					this.throwParserError(
						"Unexpected '=' after " + ZrNodeKind[left.kind],
						ZrParserErrorCode.Unexpected,
						token,
					);
				}

				return createBinaryExpression(left, token.value, this.mutateExpression(this.parseExpression()));
			}
		}

		return left;
	}

	/**
	 * Mutates expression statements if required
	 *
	 * If the expression is a binary expression, it will mutate the expression accordingly
	 */
	private mutateStatement(left: Statement, precedence = 0): Statement {
		const token = this.get(ZrTokenKind.Operator);
		if (token) {
			const otherPrecedence = Grammar.OperatorPrecedence[token.value];
			if (otherPrecedence > precedence) {
				this.lexer.next();

				if (token.value === "=") {
					if (!isNode(left, ZrNodeKind.Identifier) && !isNode(left, ZrNodeKind.PropertyAccessExpression)) {
						this.throwParserNodeError(
							"Unexpected '=' (Assignment to " + ZrNodeKind[left.kind] + ")",
							ZrParserErrorCode.Unexpected,
							left,
						);
					}
					return this.parseVariableDeclaration(left);
				}
			}
		}

		return left;
	}

	/**
	 * Parse the next expression
	 */
	private parseNext() {
		const expr = this.parseNextStatement();
		return this.mutateStatement(expr);
	}

	private isNextEndOfStatement() {
		return this.is(ZrTokenKind.EndOfStatement, ";") || !this.lexer.hasNext();
	}

	private isNextEndOfStatementOrNewline() {
		return (
			this.is(ZrTokenKind.EndOfStatement, ";") ||
			this.is(ZrTokenKind.EndOfStatement, "\n") ||
			!this.lexer.hasNext()
		);
	}

	private skipNextEndOfStatementOrNewline() {
		if (this.isNextEndOfStatementOrNewline()) {
			this.lexer.next();
		} else {
			this.throwParserError("Expected end of statement", ZrParserErrorCode.Unexpected);
		}
	}

	private skipAllWhitespace() {
		while (this.lexer.hasNext() && this.isNextEndOfStatementOrNewline()) {
			this.skipNextEndOfStatementOrNewline();
		}
	}

	/**
	 * Parse source code
	 */
	private parseSource(start?: string, stop?: string) {
		const source = new Array<Statement>();

		if (start) {
			this.skip(ZrTokenKind.Special, start);
		}

		// this.skipAllWhitespace();

		while (this.lexer.hasNext()) {
			if (stop && this.is(ZrTokenKind.Special, stop)) {
				break;
			}

			const statement = this.parseNext();
			source.push(statement);

			if (stop && this.is(ZrTokenKind.Special, stop)) {
				break;
			}

			this.skipAllWhitespace();
		}

		this.skipAllWhitespace();

		if (stop) {
			this.skip(ZrTokenKind.Special, stop);
		}

		return source;
	}

	public parseOrThrow() {
		const source = createSourceFile(this.parseSource());
		if (this.hasErrors()) {
			throw this.errors
				.map((e) =>
					e.range ? `[ZR${e.code}] [${e.range[0]}:${e.range[1]}] ${e.message}` : `[ZR${e.code}] ${e.message}`,
				)
				.join("\n");
		} else {
			return source;
		}
	}

	public parse() {
		try {
			return this.parseOrThrow();
		} catch (e) {
			warn(e);
			return createSourceFile([]);
		}
	}

	public getErrors(): readonly ZrParserError[] {
		return this.errors;
	}

	public hasErrors() {
		return this.errors.size() > 0;
	}
}
