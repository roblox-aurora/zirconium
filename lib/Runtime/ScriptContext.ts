import { Result } from "@rbxts/rust-classes";
import { ZrParserV2, ZrParserOptions } from "Ast/ParserV2";
import { ZrParserError } from "Ast/ParserV2/Diagnostics";
import { ZrFunction } from "Data/Function";
import { ZrState } from "VM/State";
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

interface ZrCreateScriptSuccess {
	result: ZrScriptCreateResult.OK;
	current: ZrScript;
}
interface ZrCreateScriptError {
	result: ZrScriptCreateResult.ParserError;
	sourceFileWithErrors: SourceFile;
	errors: readonly ZrParserError[];
	message: string;
}
type ZrCreateScriptResult = ZrCreateScriptError | ZrCreateScriptSuccess;

export default class ZrScriptContext {
	private globals = identity<Record<string, ZrValue>>({});

	public registerGlobal(name: string, value: ZrValue) {
		this.globals[name] = value;
	}

	public importGlobals(context: ZrScriptContext) {
		for (const [name, global] of pairs(context.globals)) {
			this.globals[name] = global;
		}
	}

	public registerLuauFunction(name: string, fn: (state: ZrState, ...args: ZrUnknown[]) => ZrValue | undefined) {
		this.registerGlobal(name, ZrFunction.createFunction(name, fn));
	}

	protected getGlobals() {
		const localMap = new Map<string, ZrValue>();
		for (const [k, v] of pairs(this.globals)) {
			localMap.set(k, v);
		}
		return localMap;
	}

	/**
	 * Creates a script from the specified source
	 * @param nodes The source nodes
	 * @returns The script
	 */
	public createScript(nodes: SourceFile) {
		return new ZrScript(nodes, this.getGlobals());
	}

	/**
	 * Creates a source file, and returns a `Result<T, E>` of the result of parsing the file
	 */
	public parseSource(source: string, options: ZrParserOptions): Result<SourceFile, ZrCreateScriptError> {
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
