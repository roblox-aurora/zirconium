import { Result } from "@rbxts/rust-classes";
import { ZrParserV2, ZrParserOptions } from "Ast/ParserV2";
import { ZrParserError } from "Ast/ParserV2/Diagnostics";
import { ZrScopedLib } from "std/Globals";
import { ZrTextStream, ZrLexer } from "../Ast";
import { SourceFile } from "../Ast/Nodes/NodeTypes";
import ZrContext from "../Data/Context";
import { ZrValue } from "../Data/Locals";
import ZrLuauFunction, { ZrUnknown } from "../Data/LuauFunction";
import ZrScript from "./Script";

export enum ZrScriptCreateResult {
	ParserError = 0,
	OK,
}

export interface ZrCreateScriptError {
	result: ZrScriptCreateResult.ParserError;
	sourceFileWithErrors: SourceFile;
	errors: readonly ZrParserError[];
	message: string;
}

export type ZrLibrary = Record<string, ZrValue>;

export default class ZrScriptContext {
	private globals = identity<Record<string, ZrValue>>({});

	public clone(): ZrScriptContext {
		const newContext = new ZrScriptContext();
		newContext.globals = table.clone(this.globals);
		return newContext;
	}

	public registerGlobal(name: string, value: ZrValue) {
		this.globals[name] = value;
	}

	/**
	 * Loads the given variables into the environment
	 */
	public loadEnv<TLibrary extends ZrLibrary>(lib: TLibrary, filter?: (keyof TLibrary)[]) {
		for (const [name, value] of pairs(lib as ZrLibrary)) {
			if (filter === undefined || filter.includes(name)) {
				this.registerGlobal(name, value);
			}
		}
	}

	public loadLibrary(name: string, lib: ZrLibrary) {
		this.globals[name] = new ZrScopedLib(name, lib);
	}

	public importGlobals(context: ZrScriptContext) {
		for (const [name, global] of pairs(context.globals)) {
			this.globals[name] = global;
		}
	}

	public registerLuauFunction(name: string, fn: (ctx: ZrContext, ...args: ZrUnknown[]) => ZrValue | undefined) {
		this.registerGlobal(name, new ZrLuauFunction(fn));
	}

	protected getGlobals() {
		const localMap = new Map<string, ZrValue>();
		for (const [k, v] of pairs(this.globals)) {
			localMap.set(k, v);
		}
		return localMap;
	}

	/**
	 * Creates a script from the specified ast
	 * @param nodes The source nodes
	 * @returns The script
	 */
	public createScriptFromAst(nodes: SourceFile) {
		return new ZrScript(nodes, this.getGlobals());
	}

	/**
	 * Creates a script from the given source, with the given source
	 *
	 * Will throw errors if the parsing throws errors
	 * @param source The source of the program
	 * @param options The options for the parsing
	 * @returns The result, `Ok(ZrScript)` if successful - otherwise `Err(ZrCreateScriptError)`
	 */
	public createScriptFromSource(source: string, options: ZrParserOptions): Result<ZrScript, ZrCreateScriptError> {
		return this.parseToAst(source, options).map(sourceFile => this.createScriptFromAst(sourceFile));
	}

	/**
	 * Creates a source file, and returns a `Result<T, E>` of the result of parsing the file
	 */
	public parseToAst(source: string, options: ZrParserOptions): Result<SourceFile, ZrCreateScriptError> {
		const stream = new ZrTextStream(source);
		const lexer = new ZrLexer(stream);
		const parser = new ZrParserV2(lexer, options);

		return parser.parseAst().match(
			sourceFile => {
				return Result.ok(sourceFile);
			},
			err => {
				return Result.err(
					identity<ZrCreateScriptError>({
						result: ZrScriptCreateResult.ParserError,
						errors: err[1],
						sourceFileWithErrors: err[0],
						message: tostring(error),
					}),
				);
			},
		);
	}
}
