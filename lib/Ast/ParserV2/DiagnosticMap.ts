
import { ZrParser } from "Ast";
import { ZrToken, ZrTokenType } from "Ast/Tokens/Tokens";
import { ZrParserError, ZrParserErrorCode } from "./Diagnostics";

export interface ZrDiagnostic {
    code: number;
    message: string;
}

export const DiagnosticErrors = {
    ExpectedToken: (token: ZrTokenType) => {
        return identity<ZrDiagnostic>({
            code: ZrParserErrorCode.ExpectedToken,
            message: `Expected token kind ${token}`
        });
    },
    Expected: (...values: string[]) => {
        return identity<ZrDiagnostic>({
            code: ZrParserErrorCode.ExpectedToken,
            message: values.size() === 1 ? `'${values[0]}' Expected` : `${values.map(v => `'${v}'`).join(" or ")} Expected`
        });
    },
    IdentifierExpected: identity<ZrDiagnostic>({
        code: ZrParserErrorCode.IdentifierExpected,
        message: 'Identifier expected'
    }),
    EndOfFile: identity<ZrDiagnostic>({
        code: ZrParserErrorCode.EndOfFile,
        message: 'Unexpected EOF'
    })
} as const;