export class TextDocumentIdentifier {
    public constructor(private path: string) {}
    public getPath() {
        return this.path;
    }
}