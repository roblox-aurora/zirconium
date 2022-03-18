import { Option, Result } from "@rbxts/rust-classes";
import { ZrLexer } from "Ast";
import { ArrayIndexExpression, ArrayLiteralExpression, DeclarationStatement, EnumDeclarationStatement, EnumItemExpression, Expression, FunctionDeclaration, Identifier, LiteralExpression, NamedDeclaration, ZrNode, ZrNodeKinds, ObjectLiteralExpression, ParameterDeclaration, PropertyAccessExpression, PropertyAssignment, SourceBlock, SourceFile, Statement, ZrEditNode, StringLiteral, ElementAccessExpression } from "Ast/Nodes/NodeTypes";
import Grammar, { Keywords, OperatorTokenId, SpecialTokenId } from "Ast/Tokens/Grammar";
import { ArrayIndexToken, IdentifierToken, isToken, KeywordToken, PropertyAccessToken, ZrToken, TokenTypes, ZrTokenType, ZrTokenFlag } from "Ast/Tokens/Tokens";
import { DiagnosticErrors, ZrDiagnostic } from "./DiagnosticMap";
import { ZrParserError, ZrParserErrorCode } from "./Diagnostics";
import * as factory from "Ast/Nodes/Create";
import { ZrNodeKind } from "Ast/Nodes";
import { ZrNodeFlag, ZrTypeKeyword } from "Ast/Nodes/Enum";
import { TextLocation, TextRanges } from "Ast/Types";




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

    public constructor(private lexer: ZrLexer) {}

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
                range: TextRanges.fromToken(token)
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
    private createMissingNode<TNodeKind extends keyof ZrNodeKinds>(kind: TNodeKind, reportAtCurrentPosition: boolean, diagnostic: ZrDiagnostic) {
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

            if ((expectedValue  !== undefined && !isMatchingType) || !isMatchingValue) {
                this.parserErrorAtPosition(this.lexer.prev().startPos, 0, DiagnosticErrors.Expected(expectedValue!));
            } else if(!isMatchingType) {
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
    private isToken<K extends keyof TokenTypes>(kind: K, value?: string, token = this.lexer.peek()): token is TokenTypes[K] {
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
    private parseBlock(): SourceBlock {
        const block = this.createNode(ZrNodeKind.Block);

        // Consume the first '{'
        if (this.consumeToken(ZrTokenType.Special, Grammar.SpecialTokenId.BodyBegin)) {
            const statements = new Array<Statement>();

            while (this.lexer.hasNext()) {
                // Break if we've reached the '}'
                if (this.isToken(ZrTokenType.Special, Grammar.SpecialTokenId.BodyEnd)) {
                    break;
                }

                // We'll attempt to parse the inner statements inside the block
                statements.push(this.parseNextStatement());
            }

            this.consumeToken(ZrTokenType.Special, Grammar.SpecialTokenId.BodyEnd);
            block.statements = statements;
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
            const id = this.consumeToken(ZrTokenType.Identifier)!;
            this.functionContext.push({ name: id.value });
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

    private parseEnumItems(): EnumItemExpression[] {
        const enumItems = new Array<EnumItemExpression>();
        this.parserErrorAtPosition(this.lexer.getPosition(), 0, {
            code: -1,
            message: "Enum items not implemented"
        })
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

    /**
     * Attempts to parse a declaration statement, if there is any
     * 
     * This will match a `VariableDeclaration`, `FunctionDeclaration` or `EnumDeclaration`.
     */
    private tryParseDeclarationStatement(): DeclarationStatement | undefined {
        // If `function` -
        if (this.isKeywordToken(Keywords.FUNCTION)) {
            return this.parseFunctionDeclaration();
        }

        // If `enum` - 
        if (this.isKeywordToken(Keywords.ENUM)) {
            return this.parseEnumDeclaration();
        }
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

    private isIdentifyingToken(token: ZrToken | undefined): token is IdentifierToken | PropertyAccessToken | ArrayIndexToken {
        return token !== undefined && (isToken(token, ZrTokenType.PropertyAccess) || isToken(token, ZrTokenType.ArrayIndex) || isToken(token, ZrTokenType.Identifier));
    }

    /**
     * Parses the next identifier as a {@link StringLiteral}
     * @returns 
     */
    private parseIdentifierAsString(): StringLiteral | Identifier | ArrayIndexExpression | PropertyAccessExpression | ElementAccessExpression {
        const nextToken = this.getToken(ZrTokenType.Identifier);
        if (nextToken && (nextToken.flags & ZrTokenFlag.VariableDollarIdentifier) !== 0) {
            return this.parseIdentifierLike();
        }


        const stringNode = this.createNode(ZrNodeKind.String);

        const idToken = this.consumeToken(ZrTokenType.Identifier);
        stringNode.text = idToken!.value;

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

    private mutateIdentifyingExpression(left: PropertyAccessExpression | ElementAccessExpression | Identifier | ArrayIndexExpression): PropertyAccessExpression | ElementAccessExpression | ArrayIndexExpression | Identifier {
        const token = this.getToken(ZrTokenType.Special);
        if (token) {
            const specialToken = this.consumeToken(ZrTokenType.Special)!;
            if (specialToken.value === SpecialTokenId.Dot) {
                const propExpression = this.createNode(ZrNodeKind.PropertyAccessExpression);
                propExpression.expression = left;
                propExpression.name = this.parseIdentifier();
                
                return this.mutateIdentifyingExpression(this.finishNode(propExpression));
            } else if (specialToken.value === SpecialTokenId.ElementBegin) {
                const elementAccess = this.createNode(ZrNodeKind.ElementAccessExpression);
                elementAccess.expression = left;
                elementAccess.argumentExpression = this.mutateExpression(this.parseNextExpression());
                this.consumeIfToken(ZrTokenType.Special, SpecialTokenId.ElementEnd);
                return this.mutateIdentifyingExpression(this.finishNode(elementAccess));
            }
        }

        return left;
    }

    /**
     * Parses any identifying like nodes
     * @returns 
     */
    private parseIdentifierLike(): Identifier | PropertyAccessExpression | ArrayIndexExpression | ElementAccessExpression {
        return this.mutateIdentifyingExpression(this.parseIdentifier());
    }

    private parseCallExpression(isStrictFunctionCall = false) {
        this.functionCallScope += 1;

        const callExpression = this.createNode(ZrNodeKind.CallExpression);
        callExpression.expression = this.parseIdentifierLike();
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
        while (this.lexer.hasNext() && (!this.isEndOfStatement() || isStrictFunctionCall) && !this.isFunctionCallEndToken()) {
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
            const endToken = this.consumeIfToken(ZrTokenType.EndOfStatement);
            endPos = endToken ? endToken?.endPos - 1 : undefined;
        }

        this.callContext.pop();
        this.functionCallScope -= 1;

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
		strict = true
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
                this.consumeToken(ZrTokenType.EndOfStatement)
				continue;
			}

			if (index > 0 && (this.isToken(ZrTokenType.Special, separator) || (functionContext && functionContext.strict) || strict)) {
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
		objectLiteral.values = this.parseExpressionList("{", "}", () => this.parseObjectPropertyAssignment(), ",")
        return this.finishNode(objectLiteral);
	}

    public parseArrayLiteralExpression(): ArrayLiteralExpression {
        const arrayLiteral = this.createNode(ZrNodeKind.ArrayLiteralExpression);
        arrayLiteral.values = this.parseExpressionList("[", "]", () => this.mutateExpression(this.parseNextExpression()));
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

    /**
     * Attempts to parse the next expression
     */
    private parseNextExpression(useSimpleCallSyntax = false): Expression {
        // Handle our unary expressions
        if (this.isToken(ZrTokenType.Operator, OperatorTokenId.UnaryMinus) || this.isToken(ZrTokenType.Operator, OperatorTokenId.UnaryPlus)) {
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
        if (useSimpleCallSyntax && this.isToken(ZrTokenType.Special, SpecialTokenId.SimpleCallInlineExpressionDelimiter)) {
            this.consumeToken(); // consume @

            if (this.isToken(ZrTokenType.Special, SpecialTokenId.ArrayBegin)) {
                return this.mutateExpression(this.parseArrayLiteralExpression());
            } else if (this.isToken(ZrTokenType.Special, SpecialTokenId.ObjectBegin)) {
                return this.mutateExpression(this.parseObjectLiteralExpression());
            }

            return this.mutateExpression(this.parseParenthesizedExpression());
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
        if (this.isToken(ZrTokenType.Identifier) || this.isToken(ZrTokenType.PropertyAccess) || this.isToken(ZrTokenType.ArrayIndex)) {
            // Handle bang calls e.g. 'execute!'
            if (this.isNextToken(ZrTokenType.Operator, "!") && !useSimpleCallSyntax) {
                const callExpression = this.createNode(ZrNodeKind.CallExpression);
                callExpression.isSimpleCall = true;
                callExpression.expression = this.parseIdentifierLike();
                const bang = this.consumeToken(ZrTokenType.Operator, "!");
                return this.finishNode(callExpression, bang!.startPos);
            }
        
            // Handle script calls - e.g. `player.add_item("iron_sword", 20)`
            if (this.isNextToken(ZrTokenType.Special, "(") && !useSimpleCallSyntax) {
                return this.parseCallExpression(true);
            }

            // Handle command calls e.g. `player.add_item "iron_sword" 20`
            if (
                (this.isNextToken(ZrTokenType.String) 
                || this.isNextToken(ZrTokenType.Number)
                || this.isNextToken(ZrTokenType.Boolean)
                || this.isNextToken(ZrTokenType.Special, SpecialTokenId.SimpleCallInlineExpressionDelimiter)
                || this.isNextToken(ZrTokenType.Special, SpecialTokenId.ArrayBegin)
                || this.isNextToken(ZrTokenType.Special, SpecialTokenId.ObjectBegin))
                && !useSimpleCallSyntax
            ) {
                return this.parseCallExpression(false);
            }

            // If we're currently inside a command call, we'll treat identifiers as strings.
            if (useSimpleCallSyntax) {
                return this.parseIdentifierAsString();
            }

            // Otherwise, we'll return this as a regular identifier.
            return this.parseIdentifierLike();
        }
        
        this.consumeToken();
        return this.finishNode(this.createNode(ZrNodeKind.EmptyExpression));
    }

    private mutateExpression(left: Expression, precedence = 0): Expression {
        const token = this.getToken(ZrTokenType.Operator);
        if (token) {
            const otherPrecedence = Grammar.OperatorPrecedence[token.value];
            const opToken = this.consumeToken(ZrTokenType.Operator);

            assert(otherPrecedence !== undefined, `No precedence for '${token.value}'`);
            if (otherPrecedence > precedence) {
                return factory.createBinaryExpression(left, opToken!.value, this.mutateExpression(this.parseNextExpression(), otherPrecedence));
            }
        }

        return left;
    }

    /**
     * Attempts to parse the next statement
     */
    private parseNextStatement(): Statement {
        // We'll first try and parse any VariableDeclaration, FunctionDeclaration or EnumDeclaration statements
        const declaration = this.tryParseDeclarationStatement();
        if (declaration !== undefined) {
            return declaration;
        }

        if (this.isToken(ZrTokenType.EndOfStatement, "\n")) {
            this.consumeToken();
            return factory.createEmptyStatement();
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
    private parseSourceFile(): SourceFile  {
        const sourceFile = this.createNode(ZrNodeKind.Source, 1);
        const source = new Array<Statement>();

        // While we have tokens in the lexer, we want to fetch them
        while (this.lexer.hasNext()) {
            if (this.isToken(ZrTokenType.EndOfStatement, "\n")) {
                this.consumeToken();
            }

            // We're wanting to fetch statements here, the source file is composed of statements
            const statement = this.mutateStatement(this.parseNextStatement());
            source.push(statement);

            if (this.isToken(ZrTokenType.EndOfStatement, ";")) {
                this.consumeToken(ZrTokenType.EndOfStatement);
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
    public parseAst(): Result<SourceFile, [source: SourceFile, errors: ZrParserError[]]> {
        try {
            const source = this.parseSourceFile();

            if (this.errors.size() > 0) {
                return Result.err([source, this.errors]);
            } else {
                return Result.ok(source);
            }
        } catch (err) {
            return Result.err([factory.createSourceFile([]), [...this.errors, {message: tostring(err), code: ZrParserErrorCode.ExceptionThrown }]]);
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
            (src) => src,
            ([src]) => src
        );
    }
}