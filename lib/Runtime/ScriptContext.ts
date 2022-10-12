import { Result } from "@rbxts/rust-classes";
import { ZrTextStream, ZrLexer } from "../Ast";
import { SourceFile } from "../Ast/Nodes/NodeTypes";
import ZrParser, { ZrParserError, ZrScriptMode, ZrScriptVersion } from "../Ast/Parser";
import prettyPrintNodes from "../Ast/Utility/PrettyPrintNodes";
import ZrContext from "../Data/Context";
import { ZrValue } from "../Data/Locals";
import ZrLuauFunction, { ZrUnknown } from "../Data/LuauFunction";
import { ZrRuntimeError } from "./Runtime";
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
	public parseSource(
		source: string,
		version = ZrScriptVersion.Zr2020,
		mode = ZrScriptMode.CommandLike,
	): Result<SourceFile, ZrCreateScriptError> {
		const stream = new ZrTextStream(source);
		const lexer = new ZrLexer(stream);
		const parser = new ZrParser(lexer, { version, mode });

		try {
			const nodes = parser.parseOrThrow();
			return Result.ok(nodes);
		} catch (error) {
			warn(error);
			return Result.err(
				identity<ZrCreateScriptError>({
					result: ZrScriptCreateResult.ParserError,
					errors: parser.getErrors(),
					message: tostring(error),
				}),
			);
		}
	}
}
