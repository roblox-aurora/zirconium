import { ZirconiumLogging } from "Logging";
import { ZrLanguageServer } from "LSP/LanguageServer";
import { ZrCompletionItem } from "LSP/LanguageServerServices";
import { CompletionParams } from "./Completion/CompletionParams";
import { DidChangeTextDocumentParams } from "./DidChange/DidChangeTextDocumentParams";

export class TextDocumentService {
    public constructor(private server: ZrLanguageServer) {}

    public didChange(params: DidChangeTextDocumentParams) {}

    public didClose(params: unknown) {}

    public didSave(params: unknown) {}

    public didOpen(params: unknown) {}

    public hover(params: unknown) {}

    public completion(params: CompletionParams): Promise<ReadonlyArray<ZrCompletionItem>> {
        let zrPosition = params.position;
        let triggerCharacter = params.context.triggerCharacter;

        ZirconiumLogging.Debug("Completion request: '{TriggerCharacter}' {Position}", triggerCharacter, zrPosition);
        return Promise.resolve(this.server.service.getAutoCompleteItems(zrPosition));
    }
}
