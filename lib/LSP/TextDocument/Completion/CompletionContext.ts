export enum CompletionTriggerKind {
    Invoked, // Invoked by id
    TriggerCharacter, // Trigger character
    TriggerForIncompleteCompletions, // re-triggered since list incomplete
}

export class CompletionContext {
    public constructor(public kind: CompletionTriggerKind, public triggerCharacter?: string) {}
}
