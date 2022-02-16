
import { ZrParser } from "Ast";
import { Token, ZrTokenKind } from "Ast/Tokens/Tokens";
import { ZrParserError, ZrParserErrorCode } from "./Diagnostics";

export interface ZrDiagnostic {
    code: number;
    message: string;
}

export const DiagnosticErrors = {
    ExpectedToken: (token: ZrTokenKind) => {
        return identity<ZrDiagnostic>({
            code: ZrParserErrorCode.ExpectedToken,
            message: `Expected token kind ${token}`
        });
    },
    Expected: (value: string) => {
        return identity<ZrDiagnostic>({
            code: ZrParserErrorCode.ExpectedToken,
            message: `Expected '${value}'`
        });
    },
    IdentifierExpected: identity<ZrDiagnostic>({
        code: ZrParserErrorCode.IdentifierExpected,
        message: 'Expected identifier'
    })
} as const;