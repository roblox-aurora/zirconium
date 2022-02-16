import { ZrNode } from "Ast/Nodes/NodeTypes";
import { ZrToken } from "Ast/Tokens/Tokens";




export enum ZrParserErrorCode {
    ExceptionThrown = -1,
    NotImplemented = 0,
    ExpectedToken = 1,
    IdentifierExpected
}

export interface ZrParserError {
	message: string;
	code: ZrParserErrorCode;
	node?: ZrNode;
	token?: ZrToken;
	range?: [number, number];
}