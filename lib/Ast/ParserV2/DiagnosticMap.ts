
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
            message: values.size() === 1 ? `Expected '${values[0]}'` : `Expected ${values.map(v => `'${v}'`).join(" or ")}`
        });
    },
    IdentifierExpected: identity<ZrDiagnostic>({
        code: ZrParserErrorCode.IdentifierExpected,
        message: 'Expected identifier'
    })
} as const;