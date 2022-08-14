import { TextLocation, TextPosition } from "../Ast/Types";
import { ZrLanguageServerState } from "./LanguageServerState";

export enum ZrCompletionItemKind {
    Identifier,
}

export interface ZrCompletionItem {
    readonly name: string;
    readonly text: string;
    readonly isSnippet: boolean;
    readonly kind: ZrCompletionItemKind;
}

export function ZrCompletionItem(name: string, text: string, isSnippet: boolean, kind: ZrCompletionItemKind): ZrCompletionItem {
    return {
        name,
        text,
        isSnippet,
        kind,
    }
}

export class ZrLanguageServerServices {
    public constructor(private state: ZrLanguageServerState) {}

    public getAutoCompleteItems(location: TextPosition): readonly ZrCompletionItem[] {
        const items = new Array<ZrCompletionItem>();


        return items;
    }
}