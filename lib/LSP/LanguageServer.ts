import { ZrParserOptions } from "Ast/Parser";
import { ZrLanguageServerServices } from "./LanguageServerServices";
import { ZrLanguageServerState } from "./LanguageServerState";
import { TextDocumentService } from "./TextDocument/TextDocumentService";

export class ZrLanguageServer {
	public readonly state;
	public readonly service;
	public readonly textDocumentService = new TextDocumentService(this);

	public constructor(private configuration: ZrParserOptions) {
		this.state = new ZrLanguageServerState(this.configuration);
		this.service = new ZrLanguageServerServices(this.state);
	}
}
