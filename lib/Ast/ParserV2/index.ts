import { Option, Result } from "@rbxts/rust-classes";
import { prettyPrintNodes, ZrLexer } from "Ast";
import {
	ArrayIndexExpression,
	ArrayLiteralExpression,
	DeclarationStatement,
	EnumDeclarationStatement,
	EnumItemExpression,
	Expression,
	FunctionDeclaration,
	Identifier,
	LiteralExpression,
	NamedDeclaration,
	ZrNode,
	ZrNodeKinds,
	ObjectLiteralExpression,
	ParameterDeclaration,
	PropertyAccessExpression,
	PropertyAssignment,
	SourceBlock,
	SourceFile,
	Statement,
	ZrEditNode,
	StringLiteral,
	ElementAccessExpression,
	VariableAccessExpression,
	ForInStatement,
	IfStatement,
	VariableDeclaration,
	AssignableExpression,
	ReturnStatement,
	FunctionExpression,
	ExpressionStatement,
	CallExpression,
} from "Ast/Nodes/NodeTypes";
import Grammar, { Keywords, OperatorTokenId, SpecialTokenId } from "Ast/Tokens/Grammar";
import {
	ArrayIndexToken,
	IdentifierToken,
	isToken,
	KeywordToken,
	PropertyAccessToken,
	ZrToken,
	TokenTypes,
	ZrTokenType,
	ZrTokenFlag,
} from "Ast/Tokens/Tokens";
import { DiagnosticErrors, ZrDiagnostic } from "./DiagnosticMap";
import { ZrParserError, ZrParserErrorCode } from "./Diagnostics";
import * as factory from "Ast/Nodes/Create";
import { isNode, ZrNodeKind } from "Ast/Nodes";
import { ZrNodeFlag, ZrTypeKeyword } from "Ast/Nodes/Enum";
import { TextLocation, TextRanges } from "Ast/Types";
import inspect from "@rbxts/inspect";
import { $NODE_ENV } from "rbxts-transform-env";

export interface ZrParserOptions {
	/**
	 * If enabled, will convert the last expression to a return statement if it's not explicit
	 */
	FinalExpressionImplicitReturn?: boolean;

	/**
	 * Allow the legacy command syntax - may be buggy but will allow command calls
	 */
	UseLegacyCommandCallSyntax?: boolean;

	/**
	 * Allow experimental arrow functions
	 */
	ExperimentalArrowFunctions?: boolean;

	/**
	 * @internal
	 */
	TransformDebug?: {
		[name: string]:
			| readonly [ZrNodeKind.Source, (expr: SourceBlock) => Expression]
			| readonly [ZrNodeKind.CallExpression, (expr: CallExpression) => Expression];
	};
}

export interface ZrParserFunctionContext {
	name: string;
}

export interface ZrFunctionCallContext {
	strict: boolean;
}

export class ZrParserV2 {
	private parserErrorBeforeNextNode = false;
	private errors = new Array<ZrParserError>();
	private callContext = new Array<ZrFunctionCallContext>();
	private functionContext = new Array<ZrParserFunctionContext>();
	private functionCallScope = 0;
	private contextFlags = 0;
	public readonly nodes = new Array<ZrNode>();

	private arrowFunctionsEnabled: boolean;
	private commandSyntax: boolean;
	private internalDebugMacros: boolean;

	public constructor(private lexer: ZrLexer, private options: ZrParserOptions) {
		this.arrowFunctionsEnabled = this.options.ExperimentalArrowFunctions ?? false;
		this.commandSyntax = this.options.UseLegacyCommandCallSyntax ?? false;
		this.internalDebugMacros = this.options.TransformDebug !== undefined;
	}

	private contextAddFlag(flag: ZrNodeFlag) {
		this.contextFlags |= flag;
	}

	private contextRemoveFlag(flag: ZrNodeFlag) {
		this.contextFlags &= ~flag;
	}

	/**
	 * Create the specified node kind
	 * @param kind The kind of node
	 * @returns
	 */
	private createNode<TNodeKind extends keyof ZrNodeKinds>(kind: TNodeKind, pos?: number) {
		const node = factory.createNode(kind) as ZrNode;
		node.flags |= ZrNodeFlag.IncompleteNode;
		node.startPos = pos ?? this.lexer.getTokenRange()?.[0] ?? this.lexer.getPosition();
		return node as ZrEditNode<ZrNodeKinds[TNodeKind]>;
	}

	private prevNode() {
		return this.nodes[this.nodes.size() - 1];
	}

	private isPrevNode<TKind extends keyof ZrNodeKinds>(nodeKind: TKind): boolean {
		return this.prevNode().kind === nodeKind;
	}

	/**
	 * Finishes the node, marks it readonly
	 * @param node The node to finish
	 * @returns The finished node
	 */
	private finishNode<T extends ZrNode>(node: Writable<T> | T, endPos?: number) {
		let internalNode = node as ZrNode;
		internalNode.flags &= ~ZrNodeFlag.IncompleteNode;

		internalNode.endPos = endPos ?? node.endPos ?? this.lexer.getTokenRange()?.[1] ?? 0;
		internalNode.rawText = this.lexer.getStreamSub(internalNode.startPos!, internalNode.endPos);

		if (this.contextFlags) {
			internalNode.flags |= this.contextFlags;
		}

		// If there's an error, mark the error here.
		if (this.parserErrorBeforeNextNode) {
			internalNode.flags |= ZrNodeFlag.ThisNodeHasError;
			this.parserErrorBeforeNextNode = false;
		}

		this.nodes.push(node);
		return node as T;
	}

	private parserErrorAtPosition(start: number, length: number, diagnostic: ZrDiagnostic) {
		this.errors.push({
			...diagnostic,
			range: TextLocation(start, start + length),
		});

		this.parserErrorBeforeNextNode = true;
	}

	private parserErrorAtCurrentToken(diagnostic: ZrDiagnostic, token = this.lexer.prev()) {
		if (token) {
			this.errors.push({
				...diagnostic,
				token: token,
				range: TextRanges.fromToken(token),
			});
			this.parserErrorBeforeNextNode = true;
		}
	}

	/**
	 * Creates a missing node - will be error and will have invalid properties
	 * @param kind The kind of missing node
	 * @param reportAtCurrentPosition Report the error at the current position instead of the current token?
	 * @param diagnostic The diagnostic to report
	 * @returns A node of the given kind, with errors
	 */
	private createMissingNode<TNodeKind extends keyof ZrNodeKinds>(
		kind: TNodeKind,
		reportAtCurrentPosition: boolean,
		diagnostic: ZrDiagnostic,
	) {
		let result = this.createNode(kind, this.lexer.getPosition());
		result.rawText = "";

		if (reportAtCurrentPosition) {
			const tokenPos = this.lexer.getTokenRange()?.[0] ?? this.lexer.prev()?.startPos;

			this.parserErrorAtPosition(tokenPos, 0, diagnostic);
		} else {
			this.parserErrorAtCurrentToken(diagnostic);
		}

		return this.finishNode(result);
	}

	private getCurrentCallContext() {
		return this.callContext[this.callContext.size() - 1];
	}

	/**
	 * Consumes the given token
	 * @param kind Forces the consumed token kind, or errors if mismatched.
	 */
	private consumeToken(): ZrToken | undefined;
	private consumeToken<K extends keyof TokenTypes>(kind: K, expectedValue?: string): TokenTypes[K] | undefined;
	private consumeToken(kind?: ZrTokenType, expectedValue?: string) {
		const value = this.lexer.next();
		if (kind) {
			let isMatchingType = value !== undefined && value.kind === kind;
			let isMatchingValue = expectedValue === undefined || expectedValue === value?.value;

			if ((expectedValue !== undefined && !isMatchingType) || !isMatchingValue) {
				this.parserErrorAtCurrentToken(DiagnosticErrors.Expected(expectedValue!), value);
			} else if (!isMatchingType) {
				this.parserErrorAtCurrentToken(DiagnosticErrors.ExpectedToken(kind), value);
			}
		}

		return value;
	}

	/**
	 * Checks if the token matches the given kind
	 * @param kind The kind
	 * @param token The token (or the next token kind)
	 * @returns True if the token matches the given kind
	 */
	private isToken<K extends keyof TokenTypes>(
		kind: K,
		value?: string,
		token = this.lexer.peek(),
	): token is TokenTypes[K] {
		return token !== undefined && isToken(token, kind) && (value === undefined || value === token.value);
	}

	/**
	 * Checks if the next {@link offset} token matches the given kind
	 * @param kind The kind
	 * @param token The token (or the next token kind)
	 * @returns True if the token matches the given kind
	 */
	private isNextToken<K extends keyof TokenTypes>(kind: K, value?: string, offset = 1): boolean {
		const token = this.lexer.peekNext();
		return token !== undefined && isToken(token, kind) && (value === undefined || value === token.value);
	}

	/**
	 * Skips teh matching token if it exists
	 * @param kind
	 */
	private consumeIfToken<K extends keyof TokenTypes>(kind: K, value?: string) {
		if (this.isToken<K>(kind, value)) {
			return this.consumeToken(kind, value);
		}
	}

	/**
	 * Gets the given token (does not consume it)
	 * @param kind Forces the token kind
	 */
	private getToken(): ZrToken | undefined;
	private getToken<K extends keyof TokenTypes>(kind: K, expectedValue?: string): TokenTypes[K] | undefined;
	private getToken(kind?: ZrTokenType, expectedValue?: string) {
		const value = this.lexer.peek();
		if (kind) {
			if (value?.kind === kind) {
				return value;
			} else {
				return undefined;
			}
		}
		return value;
	}

	/**
	 * Returns whether or not the current token is a keyword token
	 * @param keyword
	 * @param token
	 * @returns
	 */
	private isKeywordToken(keyword: string, token = this.lexer.peek()): token is KeywordToken {
		return this.isToken(ZrTokenType.Keyword, undefined, token) && token.value === keyword;
	}

	private isFunctionCallEndToken() {
		return this.isToken(ZrTokenType.Special, SpecialTokenId.FunctionParametersEnd);
	}

	private isEndOfStatement() {
		return this.isToken(ZrTokenType.EndOfStatement);
	}

	/**
	 * Parses a block - which is a `SourceBlock` of `Statement`s
	 */
	private parseBlock(
		allowsSingleStatement = false,
		singleWrapKind: ZrNodeKind.ExpressionStatement | ZrNodeKind.ReturnStatement = ZrNodeKind.ExpressionStatement,
	): SourceBlock {
		const block = this.createNode(ZrNodeKind.Block);

		// Consume the first '{'
		if (this.isToken(ZrTokenType.Special, Grammar.SpecialTokenId.BodyBegin) || !allowsSingleStatement) {
			this.consumeToken(ZrTokenType.Special, Grammar.SpecialTokenId.BodyBegin);

			const statements = new Array<Statement>();

			while (this.lexer.hasNext()) {
				// Break if we've reached the '}'
				if (this.isToken(ZrTokenType.Special, Grammar.SpecialTokenId.BodyEnd)) {
					break;
				}

				// We'll attempt to parse the inner statements inside the block
				statements.push(this.parseNextStatement());

				if (this.lexer.hasNext() && this.isNextToken(ZrTokenType.EndOfStatement, ";")) {
					this.consumeToken(ZrTokenType.EndOfStatement, ";");
				}

				this.skipAllWhitespace();
			}

			this.consumeToken(ZrTokenType.Special, Grammar.SpecialTokenId.BodyEnd);
			block.statements = statements;
		} else {
			const stmt = this.createNode(singleWrapKind);
			stmt.expression = this.mutateExpression(this.parseNextExpression());
			this.finishNode<ExpressionStatement | ReturnStatement>(stmt, stmt.expression.endPos);

			block.statements = [stmt];
			return this.finishNode(block, stmt.endPos);
		}

		return this.finishNode(block);
	}

	private parseFunctionDeclarationParameters(): ParameterDeclaration[] {
		const parameters = new Array<ParameterDeclaration>();

		if (this.isToken(ZrTokenType.Special, SpecialTokenId.FunctionParametersBegin)) {
			this.consumeToken(ZrTokenType.Special, SpecialTokenId.FunctionParametersBegin);

			let parameterIndex = 0;
			while (this.lexer.hasNext() && !this.isToken(ZrTokenType.Special, SpecialTokenId.FunctionParametersEnd)) {
				if (parameterIndex > 0) {
					this.consumeToken(ZrTokenType.Special, SpecialTokenId.FunctionParametersSeparator);
				}

				parameterIndex++;

				const parameter = this.createNode(ZrNodeKind.Parameter);
				parameter.name = this.parseIdentifier();
				parameter.type = factory.createKeywordTypeNode(ZrTypeKeyword.Any);

				parameters.push(this.finishNode(parameter));
			}

			this.consumeToken(ZrTokenType.Special, SpecialTokenId.FunctionParametersEnd);
		} else {
			this.parserErrorAtCurrentToken(DiagnosticErrors.Expected(SpecialTokenId.FunctionParametersBegin));
		}

		return parameters;
	}

	/**
	 * Parse the function declaration
	 */
	private parseFunctionDeclaration(): FunctionDeclaration {
		const functionDeclaration = this.createNode(ZrNodeKind.FunctionDeclaration);

		this.consumeToken(ZrTokenType.Keyword, Keywords.FUNCTION); // consume 'function'

		if (this.isToken(ZrTokenType.Identifier)) {
			functionDeclaration.name = this.parseIdentifier();

			this.functionContext.push({ name: functionDeclaration.name.name });
			const parameters = this.parseFunctionDeclarationParameters();
			functionDeclaration.parameters = parameters;

			if (this.isToken(ZrTokenType.Special, "{")) {
				const body = this.parseBlock();
				functionDeclaration.body = body;
			} else if (this.isToken(ZrTokenType.Special, ":")) {
				this.parserErrorAtCurrentToken(DiagnosticErrors.Expected("{")); // TODO: Support
			} else {
				this.parserErrorAtCurrentToken(DiagnosticErrors.Expected("{"));
			}

			this.functionContext.pop();
			return this.finishNode(functionDeclaration);
		}

		return this.createMissingNode(ZrNodeKind.FunctionDeclaration, false, DiagnosticErrors.IdentifierExpected);
	}

	/**
	 * Parse the function declaration
	 */
	private parseFunctionExpression(): FunctionExpression {
		const functionDeclaration = this.createNode(ZrNodeKind.FunctionExpression);

		this.consumeToken(ZrTokenType.Keyword, Keywords.FUNCTION); // consume 'function'

		this.functionContext.push({ name: "<anonymous " + game.GetService("HttpService").GenerateGUID(false) + ">" });
		const parameters = this.parseFunctionDeclarationParameters();
		functionDeclaration.parameters = parameters;

		if (this.isToken(ZrTokenType.Special, "{")) {
			const body = this.parseBlock();
			functionDeclaration.body = body;
		} else if (this.isToken(ZrTokenType.Special, ":")) {
			this.parserErrorAtCurrentToken(DiagnosticErrors.Expected("{"));
		} else {
			this.parserErrorAtCurrentToken(DiagnosticErrors.Expected("{"));
		}

		this.functionContext.pop();
		return this.finishNode(functionDeclaration);
	}

	private parseEnumItems(): EnumItemExpression[] {
		const enumItems = new Array<EnumItemExpression>();
		this.parserErrorAtPosition(this.lexer.getPosition(), 0, {
			code: -1,
			message: "Enum items not implemented",
		});
		return enumItems;
	}

	private parseEnumDeclaration(): EnumDeclarationStatement {
		const enumStatement = this.createNode(ZrNodeKind.EnumDeclaration);

		this.consumeToken(ZrTokenType.Keyword, Keywords.ENUM); // consume 'enum'

		if (this.isToken(ZrTokenType.Identifier)) {
			enumStatement.name = this.parseIdentifier();
			enumStatement.values = this.parseEnumItems();
		} else {
			this.parserErrorAtCurrentToken(DiagnosticErrors.IdentifierExpected);
		}

		return this.finishNode(enumStatement);
	}

	private tryParseLiteral(): Option<LiteralExpression> {
		if (this.isToken(ZrTokenType.Number)) {
			const numberNode = this.createNode(ZrNodeKind.Number);

			const numberToken = this.consumeToken(ZrTokenType.Number);
			numberNode.value = numberToken!.value;

			return Option.some(this.finishNode(numberNode));
		}

		if (this.isToken(ZrTokenType.String)) {
			const stringNode = this.createNode(ZrNodeKind.String);

			const stringToken = this.consumeToken(ZrTokenType.String);
			stringNode.text = stringToken!.value;

			return Option.some(this.finishNode(stringNode));
		}

		if (this.isToken(ZrTokenType.Boolean)) {
			const booleanNode = this.createNode(ZrNodeKind.Boolean);

			const booleanToken = this.consumeToken(ZrTokenType.Boolean);
			booleanNode.value = booleanToken!.value;

			return Option.some(this.finishNode(booleanNode));
		}

		return Option.none();
	}

	private parseParenthesizedExpression(): Expression {
		this.consumeToken(ZrTokenType.Special, "(");
		const innerExpr = this.mutateExpression(this.parseNextExpression());
		this.consumeToken(ZrTokenType.Special, ")");
		return innerExpr;
	}

	private isIdentifyingToken(
		token: ZrToken | undefined,
	): token is IdentifierToken | PropertyAccessToken | ArrayIndexToken {
		return (
			token !== undefined &&
			(isToken(token, ZrTokenType.PropertyAccess) ||
				isToken(token, ZrTokenType.ArrayIndex) ||
				isToken(token, ZrTokenType.Identifier))
		);
	}

	/**
	 * Parses the next identifier as a {@link StringLiteral}
	 * @returns
	 */
	private parseIdentifierAsString():
		| StringLiteral
		| Identifier
		| ArrayIndexExpression
		| PropertyAccessExpression
		| ElementAccessExpression {
		const nextToken = this.getToken(ZrTokenType.Identifier);
		if (nextToken && (nextToken.flags & ZrTokenFlag.VariableDollarIdentifier) !== 0) {
			return this.parseVariableAccessExpression();
		}

		const literalNode = this.parseVariableAccessExpression();

		const stringNode = this.createNode(ZrNodeKind.String);

		// const idToken = this.consumeToken(ZrTokenType.Identifier);
		stringNode.text = literalNode!.rawText!;

		return this.finishNode(stringNode);
	}

	/**
	 * Parses only identifier nodes
	 * @returns
	 */
	private parseIdentifier(): Identifier {
		const identifier = this.createNode(ZrNodeKind.Identifier);
		const identifierToken = this.consumeToken(ZrTokenType.Identifier);
		identifier.name = identifierToken!.value;
		return this.finishNode(identifier);
	}

	private mutateVariableAccessExpression(left: VariableAccessExpression): VariableAccessExpression {
		const token = this.getToken(ZrTokenType.Special);
		if (token) {
			const specialToken = this.getToken(ZrTokenType.Special)!;
			if (specialToken.value === SpecialTokenId.Dot) {
				this.consumeToken(ZrTokenType.Special, SpecialTokenId.Dot);
				const propExpression = this.createNode(ZrNodeKind.PropertyAccessExpression);
				propExpression.expression = left;
				propExpression.name = this.parseIdentifier();
				propExpression.startPos = left.startPos;

				return this.mutateVariableAccessExpression(this.finishNode(propExpression));
			} else if (specialToken.value === SpecialTokenId.ElementBegin) {
				this.consumeToken(ZrTokenType.Special, SpecialTokenId.ElementBegin);
				const elementAccess = this.createNode(ZrNodeKind.ElementAccessExpression);
				elementAccess.expression = left;
				elementAccess.argumentExpression = this.mutateExpression(this.parseNextExpression());
				elementAccess.startPos = left.startPos;

				this.consumeToken(ZrTokenType.Special, SpecialTokenId.ElementEnd);
				return this.mutateVariableAccessExpression(this.finishNode(elementAccess));
			}
		}

		return left;
	}

	/**
	 * Parses any identifying like nodes
	 * @returns
	 */
	private parseVariableAccessExpression(): VariableAccessExpression {
		return this.mutateVariableAccessExpression(this.parseIdentifier());
	}

	private parseCallExpression(expression: VariableAccessExpression, isStrictFunctionCall = false) {
		this.functionCallScope += 1;

		const callExpression = this.createNode(ZrNodeKind.CallExpression);
		callExpression.expression = expression;
		const args = new Array<Expression>();

		if (this.isToken(ZrTokenType.Special, SpecialTokenId.FunctionParametersBegin) || isStrictFunctionCall) {
			this.consumeToken(ZrTokenType.Special);
			isStrictFunctionCall = true;
			this.callContext.push({ strict: true });
		} else {
			this.callContext.push({ strict: false });
		}

		callExpression.isSimpleCall = !isStrictFunctionCall;

		let argumentIndex = 0;
		while (
			this.lexer.hasNext() &&
			(!this.isEndOfStatement() || isStrictFunctionCall) &&
			!this.isFunctionCallEndToken()
		) {
			if (isStrictFunctionCall && this.isToken(ZrTokenType.Special, SpecialTokenId.FunctionParametersEnd)) {
				break;
			}

			let arg: Expression;
			// Handle expression mutation only if strict
			if (isStrictFunctionCall) {
				if (argumentIndex > 0) {
					this.consumeToken(ZrTokenType.Special, ",");
				}

				// If there's any new lines, skip them since they don't matter.
				this.consumeIfToken(ZrTokenType.EndOfStatement, "\n");

				arg = this.mutateExpression(this.parseNextExpression());

				// If there's any new lines, skip them since they don't matter.
				this.consumeIfToken(ZrTokenType.EndOfStatement, "\n");
			} else {
				arg = this.parseNextExpression(true);
			}

			args.push(arg);

			argumentIndex++;
		}

		// Add the arguments
		callExpression.arguments = args;

		let endPos: number | undefined;

		if (isStrictFunctionCall) {
			const endToken = this.consumeToken(ZrTokenType.Special, SpecialTokenId.FunctionParametersEnd);
			endPos = endToken?.endPos;
		} else {
			// const endToken = this.consumeIfToken(ZrTokenType.EndOfStatement, ";");
			// endPos = endToken ? endToken?.endPos - 1 : undefined;
		}

		this.callContext.pop();
		this.functionCallScope -= 1;

		callExpression.startPos = expression.startPos;
		return this.finishNode(callExpression, endPos);
	}

	/**
	 * Parses a list type expression (such as an array, or object)
	 */
	private parseExpressionList<K extends Expression | NamedDeclaration = Expression>(
		start: string,
		stop: string,
		nextItem: () => K,
		separator = ",",
		strict = true,
	): K[] {
		const values = new Array<K>();
		let index = 0;

		this.consumeToken(ZrTokenType.Special, start);

		const functionContext = this.getCurrentCallContext();

		while (this.lexer.hasNext() && !this.isToken(ZrTokenType.Special, stop)) {
			if (this.isToken(ZrTokenType.Special, stop)) {
				break;
			}

			if (this.isToken(ZrTokenType.EndOfStatement, "\n")) {
				this.consumeToken(ZrTokenType.EndOfStatement);
				continue;
			}

			if (
				index > 0 &&
				(this.isToken(ZrTokenType.Special, separator) || (functionContext && functionContext.strict) || strict)
			) {
				this.consumeToken(ZrTokenType.Special, separator);
			}

			this.consumeIfToken(ZrTokenType.EndOfStatement, "\n");

			values.push(nextItem());

			index++;
		}

		this.consumeIfToken(ZrTokenType.EndOfStatement, "\n");
		this.consumeToken(ZrTokenType.Special, stop);

		return values;
	}

	private parseObjectPropertyAssignment(): PropertyAssignment {
		const propertyAssignment = this.createNode(ZrNodeKind.PropertyAssignment);

		if (this.isToken(ZrTokenType.Identifier) || this.isToken(ZrTokenType.String)) {
			const id = this.consumeIfToken(ZrTokenType.Identifier) ?? this.consumeToken(ZrTokenType.String);
			this.consumeToken(ZrTokenType.Special, ":"); // Expects ':'

			const expression = this.mutateExpression(this.parseNextExpression());
			propertyAssignment.name = factory.createIdentifier(id!.value);
			propertyAssignment.initializer = expression;

			return this.finishNode(propertyAssignment);
		} else {
			// this.throwParserError("Expected Identifier", ZrParserErrorCode.IdentifierExpected, this.lexer.peek());
			throw `expected id`;
		}
	}

	private parseObjectLiteralExpression(): ObjectLiteralExpression {
		const objectLiteral = this.createNode(ZrNodeKind.ObjectLiteralExpression);
		objectLiteral.values = this.parseExpressionList("{", "}", () => this.parseObjectPropertyAssignment(), ",");
		return this.finishNode(objectLiteral);
	}

	public parseArrayLiteralExpression(): ArrayLiteralExpression {
		const arrayLiteral = this.createNode(ZrNodeKind.ArrayLiteralExpression);
		arrayLiteral.values = this.parseExpressionList("[", "]", () =>
			this.mutateExpression(this.parseNextExpression()),
		);
		return this.finishNode(arrayLiteral);
	}

	private tryParseListLiteral(): Option<ArrayLiteralExpression | ObjectLiteralExpression> {
		if (this.isToken(ZrTokenType.Special, "[")) {
			return Option.some(this.parseArrayLiteralExpression());
		}

		if (this.isToken(ZrTokenType.Special, "{")) {
			return Option.some(this.parseObjectLiteralExpression());
		}

		return Option.none();
	}

	private parseKeyword() {
		const keyword = this.consumeToken(ZrTokenType.Keyword)!;
		if (keyword.value === Keywords.UNDEFINED) {
			const undefinedKeyword = this.createNode(ZrNodeKind.UndefinedKeyword);
			undefinedKeyword.startPos = keyword.startPos;
			undefinedKeyword.endPos = keyword.endPos;
			return this.finishNode(undefinedKeyword);
		}

		const emptyNode = this.createNode(ZrNodeKind.EmptyExpression);
		this.parserErrorAtCurrentToken(DiagnosticErrors.UnexpectedKeyword(keyword));
		return this.finishNode(emptyNode);
	}

	private parseArrowFunction(): FunctionExpression {
		const node = this.createNode(ZrNodeKind.FunctionExpression);

		const params = this.parseFunctionDeclarationParameters();
		node.parameters = params;

		this.consumeToken(ZrTokenType.Operator, "=>");
		const body = this.parseBlock(true, ZrNodeKind.ReturnStatement);
		node.body = body;

		return this.finishNode(node, node.body.endPos);
	}

	/**
	 * Attempts to parse the next expression
	 */
	private parseNextExpression(useSimpleCallSyntax = false): Expression {
		// not a fan of this atm, but experimental for now.
		if (this.arrowFunctionsEnabled && this.isToken(ZrTokenType.Special, SpecialTokenId.FunctionParametersBegin)) {
			const parenEnd = this.lexer.findTokenAhead(ZrTokenType.Special, SpecialTokenId.FunctionParametersEnd);
			if (parenEnd) {
				const afterToken = this.lexer.peekNext(parenEnd[1] + 1); // + 1 to get the => after the ) if it exists.
				if (afterToken?.kind === ZrTokenType.Operator && afterToken.value === "=>") {
					return this.parseArrowFunction();
				}
			}
		}

		// Handle our unary expressions
		if (
			this.isToken(ZrTokenType.Operator, OperatorTokenId.UnaryMinus) ||
			this.isToken(ZrTokenType.Operator, OperatorTokenId.UnaryPlus)
		) {
			const unm = this.createNode(ZrNodeKind.UnaryExpression);
			const unaryOp = this.consumeToken(ZrTokenType.Operator);
			unm.operator = unaryOp!.value;
			unm.expression = this.parseNextExpression();
			return this.finishNode(unm);
		}

		// Handle our primitive types
		const primitive = this.tryParseLiteral();
		if (primitive.isSome()) {
			return this.mutateExpression(primitive.unwrap(), 0);
		}

		// Handle $(...) inline expression for command calling
		if (
			useSimpleCallSyntax &&
			this.isToken(ZrTokenType.Special, SpecialTokenId.SimpleCallInlineExpressionDelimiter)
		) {
			this.consumeToken(); // consume @

			if (this.isToken(ZrTokenType.Special, SpecialTokenId.ArrayBegin)) {
				return this.mutateExpression(this.parseArrayLiteralExpression());
			} else if (this.isToken(ZrTokenType.Special, SpecialTokenId.ObjectBegin)) {
				return this.mutateExpression(this.parseObjectLiteralExpression());
			}

			return this.mutateExpression(this.parseParenthesizedExpression());
		}

		if (this.isToken(ZrTokenType.Keyword, Keywords.FUNCTION)) {
			return this.parseFunctionExpression();
		}

		// Handle parenthesized expressions (which are just for order of operation stuff; mainly)
		if (this.isToken(ZrTokenType.Special, "(")) {
			return this.mutateExpression(this.parseParenthesizedExpression());
		}

		// Handle literal lists, such as objects and arrays
		const literalList = this.tryParseListLiteral();
		if (literalList.isSome()) {
			return literalList.unwrap();
		}

		// Handling function calling + identifiers
		if (this.isToken(ZrTokenType.Identifier)) {
			// If we're currently inside a command call, we'll treat identifiers as strings.
			// if (useSimpleCallSyntax) {
			//     return this.parseIdentifierAsString();
			// }

			const id = this.parseVariableAccessExpression();

			// ZirconiumLogging.Verbose("access id {Id} {tkn}", getIdText(id), this.getToken()?.value);

			// Handle script calls - e.g. `player.add_item("iron_sword", 20)`
			if (this.isToken(ZrTokenType.Special, "(") && !useSimpleCallSyntax) {
				return this.parseCallExpression(id, true);
			}

			if ($NODE_ENV === "development") {
				if (this.internalDebugMacros && this.isToken(ZrTokenType.Operator, "!")) {
					if (isNode(id, ZrNodeKind.Identifier)) {
						this.consumeToken(ZrTokenType.Operator, "!");

						for (const [name, transformer] of pairs(this.options.TransformDebug!)) {
							if (name === id.name) {
								const [transformTarget, transform] = transformer;

								if (transformTarget === ZrNodeKind.Source) {
									return transform(this.parseBlock());
								} else if (transformTarget === ZrNodeKind.CallExpression) {
									return transform(this.parseCallExpression(id));
								}
							}
						}
					}
				}
			}

			if (this.commandSyntax) {
				// Handle bang calls e.g. 'execute!'
				if (this.isToken(ZrTokenType.Operator, "!") && !useSimpleCallSyntax) {
					const callExpression = this.createNode(ZrNodeKind.CallExpression);
					callExpression.isSimpleCall = true;
					callExpression.startPos = id.startPos;
					callExpression.expression = id;
					const bang = this.consumeToken(ZrTokenType.Operator, "!");
					return this.finishNode(callExpression, bang!.startPos);
				}

				// Handle command calls e.g. `player.add_item "iron_sword" 20`
				if (
					(this.isToken(ZrTokenType.String) ||
						this.isToken(ZrTokenType.Number) ||
						this.isToken(ZrTokenType.Boolean) ||
						this.isToken(ZrTokenType.Identifier) ||
						this.isToken(ZrTokenType.Special, SpecialTokenId.SimpleCallInlineExpressionDelimiter)) &&
					!useSimpleCallSyntax
				) {
					const expr = this.parseCallExpression(id, false);
					return expr;
				}
			}

			// Otherwise, we'll return this as a regular identifier.
			return id;
		}

		if (this.isToken(ZrTokenType.Keyword)) {
			return this.parseKeyword();
		}

		const errNode = this.createNode(ZrNodeKind.EmptyExpression);
		this.consumeToken();
		this.parserErrorAtCurrentToken(DiagnosticErrors.ExpressionExpected);
		return this.finishNode(errNode);
	}

	private mutateExpression(left: Expression, precedence = 0): Expression {
		const token = this.getToken(ZrTokenType.Operator);
		if (token) {
			const otherPrecedence = Grammar.OperatorPrecedence[token.value];
			const opToken = this.consumeToken(ZrTokenType.Operator);

			assert(otherPrecedence !== undefined, `No precedence for '${token.value}' after ` + ZrNodeKind[left.kind]);
			if (otherPrecedence > precedence) {
				return factory.createBinaryExpression(
					left,
					opToken!.value,
					this.mutateExpression(this.parseNextExpression(), otherPrecedence),
				);
			}
		}

		return left;
	}

	/**
	 * Attempts to parse a declaration statement, if there is any
	 *
	 * This will match a `VariableDeclaration`, `FunctionDeclaration` or `EnumDeclaration`.
	 */
	private tryParseDeclaration(): DeclarationStatement | undefined {
		const exportToken = this.consumeIfToken(ZrTokenType.Keyword, Keywords.EXPORT);

		// If `function` -
		if (this.isKeywordToken(Keywords.FUNCTION)) {
			return this.parseFunctionDeclaration();
		}

		// If `enum` -
		if (this.isKeywordToken(Keywords.ENUM)) {
			return this.parseEnumDeclaration();
		}

		if (this.isKeywordToken(Keywords.CONST)) {
			return this.parseVariableDeclaration(ZrNodeFlag.Const);
		} else if (this.isKeywordToken(Keywords.LET)) {
			return this.parseVariableDeclaration(ZrNodeFlag.Let);
		}

		if (exportToken) {
			this.parserErrorAtCurrentToken(DiagnosticErrors.UnexpectedKeyword(exportToken));
		}
	}

	private parseVariableDeclaration(flags: VariableDeclaration["flags"]): VariableDeclaration {
		const keyword = this.consumeToken(ZrTokenType.Keyword);
		const variableDeclaration = this.createNode(ZrNodeKind.VariableDeclaration, keyword!.startPos);
		variableDeclaration.flags = flags;
		variableDeclaration.identifier = this.parseIdentifier();

		if (this.isNextToken(ZrTokenType.Operator, ";")) {
			variableDeclaration.expression = factory.createUndefined();
			return this.finishNode(variableDeclaration);
		} else {
			this.consumeToken(ZrTokenType.Operator, "=");
			variableDeclaration.expression = this.mutateExpression(this.parseNextExpression()) as AssignableExpression;

			return this.finishNode(variableDeclaration);
		}
	}

	private parseForStatement(): ForInStatement {
		this.consumeToken(ZrTokenType.Keyword, Keywords.FOR);

		const statement = this.createNode(ZrNodeKind.ForInStatement);
		statement.initializer = this.parseIdentifier();
		this.consumeToken(ZrTokenType.Keyword, Keywords.IN);
		statement.expression = this.mutateExpression(this.parseNextExpression());
		statement.statement = this.parseBlock();

		return this.finishNode(statement);
	}

	private tryParseControl(): Option<ForInStatement> {
		// If `for`
		if (this.isKeywordToken(Keywords.FOR)) {
			return Option.some(this.parseForStatement());
		}

		return Option.none();
	}

	private tryParseReturnStatement(): Option<ReturnStatement> {
		if (this.isKeywordToken(Keywords.RETURN)) {
			this.consumeToken(ZrTokenType.Keyword, Keywords.RETURN);

			const node = this.createNode(ZrNodeKind.ReturnStatement);

			// if (!this.getToken() || this.isEndOfStatement()) {
			// 	node.expression = factory.createUndefined();
			// } else {
			node.expression = this.parseNextExpression();
			//}

			return Option.some(this.finishNode(node));
		}

		return Option.none();
	}

	private tryParseIfStatement(): Option<IfStatement> {
		if (this.isKeywordToken(Keywords.IF)) {
			this.consumeToken(ZrTokenType.Keyword, Keywords.IF);

			const expression = this.mutateExpression(this.parseNextExpression());
			if (!expression) {
				throw `No expression`;
			}

			const ifStatement = this.createNode(ZrNodeKind.IfStatement);
			ifStatement.condition = expression;

			// Handle `if cond:`
			if (this.isToken(ZrTokenType.Special, ":")) {
				this.consumeToken(ZrTokenType.Special, ":");
				const ifExpression = this.mutateExpression(this.parseNextExpression());
				ifStatement.thenStatement = factory.createExpressionStatement(ifExpression);

				// Handle 'else:'
				if (this.isKeywordToken(Keywords.ELSE)) {
					this.consumeToken(ZrTokenType.Keyword, Keywords.ELSE);
					this.consumeToken(ZrTokenType.Special, ":");
					ifStatement.elseStatement = factory.createExpressionStatement(
						this.mutateExpression(this.parseNextExpression()),
					);
				}
			} else {
				// handle `if cond { ... }`
				const block = this.parseBlock();
				ifStatement.thenStatement = block;

				// if cond { ... } else ...
				if (this.isKeywordToken(Keywords.ELSE)) {
					this.consumeToken(ZrTokenType.Keyword, Keywords.ELSE);

					const elseIfStatement = this.tryParseIfStatement();

					if (elseIfStatement.isSome()) {
						ifStatement.elseStatement = elseIfStatement.unwrap();
					} else if (this.isToken(ZrTokenType.Special, ":")) {
						this.consumeToken();
						ifStatement.elseStatement = factory.createExpressionStatement(
							this.mutateExpression(this.parseNextExpression()),
						);
					} else {
						ifStatement.elseStatement = this.parseBlock();
					}
				}
			}

			return Option.some(this.finishNode(ifStatement));
		}
		return Option.none();
	}

	/**
	 * Attempts to parse the next statement
	 */
	private parseNextStatement(): Statement {
		// We'll first try and parse any VariableDeclaration, FunctionDeclaration or EnumDeclaration statements
		const declaration = this.tryParseDeclaration();
		if (declaration !== undefined) {
			return declaration;
		}

		const flow = this.tryParseControl();
		if (flow.isSome()) {
			return flow.unwrap();
		}

		const conditional = this.tryParseIfStatement();
		if (conditional.isSome()) {
			return conditional.unwrap();
		}

		if (this.isToken(ZrTokenType.EndOfStatement, "\n")) {
			this.consumeToken();
			return factory.createEmptyStatement();
		}

		if (this.isToken(ZrTokenType.Special, SpecialTokenId.BodyBegin)) {
			return this.parseBlock();
		}

		const ret = this.tryParseReturnStatement();
		if (ret.isSome()) {
			return ret.unwrap();
		}

		const expressionStatement = this.createNode(ZrNodeKind.ExpressionStatement);

		const expression = this.mutateExpression(this.parseNextExpression());
		expressionStatement.expression = expression;

		return this.finishNode(expressionStatement, expression.endPos);
	}

	private skipAllWhitespace() {
		while (this.lexer.hasNext() && this.isEndOfStatement()) {
			this.consumeToken();
		}
	}

	/**
	 * Handles statement mutation (such as operators)
	 * @param statement The statement
	 * @param precedence The default precedence
	 */
	private mutateStatement(statement: Statement, precedence = 0): Statement {
		return statement;
	}

	/**
	 * Parses a source file node (The top-level AST tree)
	 * @returns
	 */
	private parseSourceFile(): SourceFile {
		const sourceFile = this.createNode(ZrNodeKind.Source, 1);
		const source = new Array<Statement>();

		// While we have tokens in the lexer, we want to fetch them
		while (this.lexer.hasNext()) {
			if (this.isToken(ZrTokenType.EndOfStatement, "\n")) {
				this.consumeToken();
			}

			// We're wanting to fetch statements here, the source file is composed of statements
			const statement = this.mutateStatement(this.parseNextStatement());

			if (isNode(statement, ZrNodeKind.ExpressionStatement)) {
				if (!this.lexer.hasNext() && this.options.FinalExpressionImplicitReturn) {
					source.push(factory.createReturnStatement(statement.expression));
				} else {
					source.push(statement);
				}
			} else {
				source.push(statement);
			}

			if (this.lexer.hasNext() && this.isNextToken(ZrTokenType.EndOfStatement, ";")) {
				this.consumeToken(ZrTokenType.EndOfStatement, ";");
			}

			this.skipAllWhitespace();
		}

		sourceFile.children = source;

		return this.finishNode(sourceFile);
	}

	/** @internal */
	public parseAstWithThrow(): Result<SourceFile, [source: SourceFile, errors: ZrParserError[]]> {
		const source = this.parseSourceFile();

		if (this.errors.size() > 0) {
			return Result.err([source, this.errors]);
		} else {
			return Result.ok(source);
		}
	}

	/**
	 * Attempts to parse the AST, returns `SourceFile` if successful; else `[SourceFile, ZrParserError[]]` if there are errors.
	 * @returns
	 */
	public parseAst(): Result<SourceFile, [source: SourceFile, errors: readonly ZrParserError[]]> {
		try {
			const source = this.parseSourceFile();

			if (this.errors.size() > 0) {
				return Result.err([source, this.errors]);
			} else {
				return Result.ok(source);
			}
		} catch (err) {
			return Result.err([
				factory.createSourceFile([]),
				[...this.errors, { message: tostring(err), code: ZrParserErrorCode.ExceptionThrown }],
			]);
		}
	}

	public getSource([x, y]: [x: number, y: number]) {
		return this.lexer.getStreamSub(x, y);
	}

	/**
	 * Gets the source file AST regardless of errors
	 * @returns The source file AST.
	 */
	public getSourceFileAst() {
		return this.parseAst().match(
			src => src,
			([src]) => src,
		);
	}
}
