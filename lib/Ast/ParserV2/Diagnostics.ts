import { Node } from "Ast/Nodes/NodeTypes";
import { Token } from "Ast/Tokens/Tokens";




export enum ZrParserErrorCode {
    ExceptionThrown = -1,
    NotImplemented = 0,
    ExpectedToken = 1,
    IdentifierExpected
}

export interface ZrParserError {
	message: string;
	code: ZrParserErrorCode;
	node?: Node;
	token?: Token;
	range?: [number, number];
}