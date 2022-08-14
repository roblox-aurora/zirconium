import { ZrLexer, ZrTextStream } from "Ast";
import ZrParser, { ZrParserError, ZrParserOptions } from "../Ast/Parser";

export class ZrModuleReference {
    public constructor(private fileName: string) {}
    public getFileName() {
        return this.fileName;
    }
}

export class ZrLanguageServerState {
    private sources = new Map<ZrModuleReference, string>();

    public constructor(configuration: ZrParserOptions) {}

    private updateRawModule(module: ZrModuleReference, source: string): readonly ZrParserError[] {
        const parser = new ZrParser(new ZrLexer(new ZrTextStream(source)));
        this.sources.set(module, source);
        return parser.getErrors();
    }

    public update(module: ZrModuleReference, source: string): readonly ZrModuleReference[] {
        const errors = this.updateRawModule(module, source);
        return [module]; // only affects itself right now.
    }

    public createTempModuleFile(source: string): ZrModuleReference {
        const ref = new ZrModuleReference("://" + game.GetService("HttpService").GenerateGUID(false));
        this.sources.set(ref, source);
        return ref;
    }

    public createModuleFile(fileName: string, source: string) {
        const ref = new ZrModuleReference("://" + fileName);
        this.sources.set(ref, source);
        return ref;
    }
}