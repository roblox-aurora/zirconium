import { TextPosition } from "../../../Ast/Types";
import { TextDocumentIdentifier } from "../TextDocumentIdentifier";
import { CompletionContext } from "./CompletionContext";

export class CompletionParams {
    public constructor(
        public context: CompletionContext,
        public textDocument: TextDocumentIdentifier,
        public position: TextPosition
    ) {}
}