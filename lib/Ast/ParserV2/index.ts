import { Option, Result } from "@rbxts/rust-classes";
import { ZrLexer } from "Ast";
import { createBinaryExpression, createBlock, createBooleanNode, createExpressionStatement, createFunctionDeclaration, createIdentifier, createKeywordTypeNode, createNumberNode, createParameter, createParenthesizedExpression, createSourceFile, createStringNode, createUnaryExpression } from "Ast/Nodes/Create";
import { ZrTypeKeyword } from "Ast/Nodes/Enum";
import { DeclarationStatement, EnumDeclarationStatement, Expression, FunctionDeclaration, LiteralExpression, Node, ParameterDeclaration, ParenthesizedExpression, SourceBlock, SourceFile, Statement } from "Ast/Nodes/NodeTypes";
import Grammar, { Keywords, OperatorTokenId, SpecialTokenId } from "Ast/Tokens/Grammar";
import { isToken, KeywordToken, Token, TokenTypes, ZrTokenKind } from "Ast/Tokens/Tokens";

export interface ZrParserError {
	message: string;
	code: ZrParserErrorCode;
	node?: Node;
	token?: Token;
	range?: [number, number];
}

export const enum ZrParserErrorCode {
    ExceptionThrown = -1,
	NotImplemented,
}

export interface ZrParserFunctionContext {
    name: string;
}

export class ZrParserV2 {
    private errors = new Array<ZrParserError>();
    private functionContext = new Array<ZrParserFunctionContext>();

    public constructor(private lexer: ZrLexer) {}

    /**
     * Consumes the given token
     * @param kind Forces the consumed token kind, or errors if mismatched.
     */
    private consumeToken(): Token | undefined;
    private consumeToken<K extends keyof TokenTypes>(kind: K, expectedValue?: string): TokenTypes[K];
    private consumeToken(kind?: ZrTokenKind, expectedValue?: string) {
        const value = this.lexer.next();
        if (kind) {
            assert(
                value && value.kind === kind && (expectedValue === undefined || expectedValue === value.value),
                `Expected ${kind} with value ${expectedValue ?? "<any>"} got ${value?.kind} with value ${value?.value}`
            );
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
     * Gets the given token (does not consume it)
     * @param kind Forces the token kind
     */
    private getToken(): Token | undefined;
    private getToken<K extends keyof TokenTypes>(kind: K, expectedValue?: string): TokenTypes[K] | undefined;
    private getToken(kind?: ZrTokenKind, expectedValue?: string) {
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
        return this.isToken(ZrTokenKind.Keyword, undefined, token) && token.value === keyword;
    }

    /**
     * Parses a block - which is a `SourceBlock` of `Statement`s
     */
    private parseBlock(): SourceBlock {
        // Consume the first '{'
        this.consumeToken(ZrTokenKind.Special, Grammar.SpecialTokenId.BodyBegin);

        const statements = new Array<Statement>();

        while (this.lexer.hasNext()) {
            // Break if we've reached the '}'
            if (this.isToken(ZrTokenKind.Special, Grammar.SpecialTokenId.BodyEnd)) {
                break;
            }

            // We'll attempt to parse the inner statements inside the block
            statements.push(this.parseNextStatement());
        }

        this.consumeToken(ZrTokenKind.Special, Grammar.SpecialTokenId.BodyEnd);
        return createBlock(statements);
    }

    private parseFunctionDeclarationParameters(): ParameterDeclaration[] {
        const parameters = new Array<ParameterDeclaration>();

        if (this.isToken(ZrTokenKind.Special, SpecialTokenId.FunctionParametersBegin)) {
            this.consumeToken(ZrTokenKind.Special, SpecialTokenId.FunctionParametersBegin);

            let parameterIndex = 0;
            while (this.lexer.hasNext() && !this.isToken(ZrTokenKind.Special, SpecialTokenId.FunctionParametersEnd)) {
                if (parameterIndex > 0) {
                    this.consumeToken(ZrTokenKind.Special, SpecialTokenId.FunctionParametersSeparator);
                }

                parameterIndex++;

                if (this.isToken(ZrTokenKind.Identifier)) {
                    const id = this.consumeToken(ZrTokenKind.Identifier);
                    parameters.push(createParameter(createIdentifier(id.value), createKeywordTypeNode(ZrTypeKeyword.Any)));
                } else {
                    throw `TODO Error Need Id for Param got ${this.lexer.peek()?.kind} ${this.lexer.peek()?.value}`;
                }
            }

            this.consumeToken(ZrTokenKind.Special, SpecialTokenId.FunctionParametersEnd);
        } else {
            throw `TODO Error Need Id for FunctionParametersBegin`
        }

        return parameters;
    }

    /**
     * Parse the function declaration
     */
    private parseFunctionDeclaration(): FunctionDeclaration {
        this.consumeToken(ZrTokenKind.Keyword, Keywords.FUNCTION); // consume 'function'

        if (this.isToken(ZrTokenKind.Identifier)) {
            const id = this.consumeToken(ZrTokenKind.Identifier);
            this.functionContext.push({ name: id.value });
            const parameters = this.parseFunctionDeclarationParameters();

            if (this.isToken(ZrTokenKind.Special, "{")) {
                const body = this.parseBlock();
                this.functionContext.pop();
                return createFunctionDeclaration(createIdentifier(id.value), [], body);
            }
        }

        throw `Not Implement`;
    }

    private parseEnumDeclaration(): EnumDeclarationStatement {
        this.consumeToken(ZrTokenKind.Keyword, Keywords.ENUM); // consume 'enum'

        if (this.isToken(ZrTokenKind.Identifier)) {
            const id = this.consumeToken(ZrTokenKind.Identifier);


        }

        throw `Noo`;
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
        if (this.isToken(ZrTokenKind.Number)) {
            const numberToken = this.consumeToken(ZrTokenKind.Number);
            return Option.some(createNumberNode(numberToken.value));
        }

        if (this.isToken(ZrTokenKind.String)) {
            const numberToken = this.consumeToken(ZrTokenKind.String);
            return Option.some(createStringNode(numberToken.value));
        }

        if (this.isToken(ZrTokenKind.Boolean)) {
            const booleanToken = this.consumeToken(ZrTokenKind.Boolean);
            return Option.some(createBooleanNode(booleanToken.value));
        }

        return Option.none();
    }

    private parseParenthesizedExpression(): Expression {
        this.consumeToken(ZrTokenKind.Special, "(");
        const innerExpr = this.mutateExpression(this.parseNextExpression());
        this.consumeToken(ZrTokenKind.Special, ")");
        return innerExpr;
    }

    /**
     * Attempts to parse the next expression
     */
    private parseNextExpression(): Expression {

        if (this.isToken(ZrTokenKind.Operator, OperatorTokenId.UnaryMinus) || this.isToken(ZrTokenKind.Operator, OperatorTokenId.UnaryPlus)) {
            const unaryOp = this.consumeToken(ZrTokenKind.Operator);
            return createUnaryExpression(unaryOp.value, this.parseNextExpression());
        }

        const primitive = this.tryParseLiteral();
        if (primitive.isSome()) {
            return primitive.unwrap();
        }


        if (this.isToken(ZrTokenKind.Special, "(")) {
            return this.mutateExpression(this.parseParenthesizedExpression());
        }
        

        throw `Unexpected '${this.getToken()?.value}' after expression: ` + debug.traceback("", 2);
    }

    private mutateExpression(left: Expression, precedence = 0): Expression {
        const token = this.getToken(ZrTokenKind.Operator);
        if (token) {
            const otherPrecedence = Grammar.OperatorPrecedence[token.value];
            assert(otherPrecedence !== undefined, `No precedence for '${token.value}'`);
            if (otherPrecedence > precedence) {
                const opToken = this.consumeToken(ZrTokenKind.Operator);
                
                return createBinaryExpression(left, opToken.value, this.mutateExpression(this.parseNextExpression()))
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

        let expression: Expression;

        // if (this.isToken(ZrTokenKind.Special, "(")) {
        //     expression = this.mutateExpression(this.parseParenthesizedExpression());
        // } else {
            expression = this.mutateExpression(this.parseNextExpression());
        //}

        return createExpressionStatement(expression);
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
        const source = new Array<Statement>();

        // While we have tokens in the lexer, we want to fetch them
        while (this.lexer.hasNext()) {
            // We're wanting to fetch statements here, the source file is composed of statements
            const statement = this.mutateStatement(this.parseNextStatement());
            source.push(statement);

            if (this.isToken(ZrTokenKind.EndOfStatement, ";")) {
                this.consumeToken(ZrTokenKind.EndOfStatement);
            }
        }

        return createSourceFile(source);
    }

    public parseAst(): Result<SourceFile, [source: SourceFile, errors: ZrParserError[]]> {
        try {
            const source = this.parseSourceFile();

            if (this.errors.size() > 0) {
                return Result.err([source, this.errors]);
            } else {
                return Result.ok(source);
            }
        } catch (err) {
            return Result.err([createSourceFile([]), [...this.errors, {message: tostring(err), code: ZrParserErrorCode.ExceptionThrown }]]);
        }
    }
}