import { ZrTextStream, ZrLexer } from "../Ast";
import { SourceFile } from "../Ast/Nodes/NodeTypes";
import ZrParser, { ZrParserError } from "../Ast/Parser";
import prettyPrintNodes from "../Ast/Utility/PrettyPrintNodes";
import ZrContext from "../Data/Context";
import { ZrValue } from "../Data/Locals";
import ZrLuauFunction, { ZrLuauArgument } from "../Data/LuauFunction";
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

	public registerLuauFunction(name: string, fn: (ctx: ZrContext, ...args: ZrLuauArgument[]) => ZrValue | undefined) {
		this.registerGlobal(name, new ZrLuauFunction(fn));
	}

	public createScriptFromNodes(nodes: SourceFile, locals?: Record<string, ZrValue>) {
		const localMap = new Map<string, ZrValue>();
		for (const [k, v] of pairs(this.globals)) {
			localMap.set(k, v);
		}
		if (locals) {
			for (const [k, v] of pairs(locals)) {
				localMap.set(k, v);
			}
		}
		return new ZrScript(nodes, localMap);
	}

	public createScriptFromSource(source: string, locals?: Record<string, ZrValue>): ZrCreateScriptResult {
		const stream = new ZrTextStream(source);
		const lexer = new ZrLexer(stream);
		const parser = new ZrParser(lexer);

		try {
			const nodes = parser.parseOrThrow();
			prettyPrintNodes([nodes]);
			return identity<ZrCreateScriptSuccess>({
				result: ZrScriptCreateResult.OK,
				current: this.createScriptFromNodes(nodes, locals),
			});
		} catch (error) {
			return identity<ZrCreateScriptError>({
				result: ZrScriptCreateResult.ParserError,
				errors: parser.getErrors(),
				message: tostring(error),
			});
		}
	}
}
