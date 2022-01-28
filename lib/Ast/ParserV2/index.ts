import { Result } from "@rbxts/rust-classes";
import { ZrLexer } from "Ast";
import { createSourceFile } from "Ast/Nodes/Create";
import { Expression, Node, SourceFile, Statement } from "Ast/Nodes/NodeTypes";
import { Token } from "Ast/Tokens/Tokens";

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

export class ZrParserV2 {
    private errors = new Array<ZrParserError>();

    public constructor(private lexer: ZrLexer) {}


    /**
     * Attempts to parse the next expression
     */
    private parseNextExpression(): Expression {
        throw `Not Implemented`;
    }

    /**
     * Attempts to parse the next statement
     */
    private parseNextStatement(): Statement {
        throw `Not Implemented`;
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