import { ZrTextStream, ZrLexer } from "@rbxts/zirconium-ast";
import { CommandSource } from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrParser, { ParserError } from "@rbxts/zirconium-ast/out/Parser";
import { prettyPrintNodes } from "@rbxts/zirconium-ast/out/Utility";
import ZrContext from "../Data/Context";
import { ZrValue } from "../Data/Locals";
import ZrLuauFunction from "../Data/LuauFunction";
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
	errors: readonly ParserError[];
}
type ZrCreateScriptResult = ZrCreateScriptError | ZrCreateScriptSuccess;

export default class ZrScriptContext {
	private globals = identity<Record<string, ZrValue>>({});
	public registerGlobal(name: string, value: ZrValue) {
		this.globals[name] = value;
	}

	public registerLuauFunction(name: string, fn: (ctx: ZrContext, ...args: ZrValue[]) => ZrValue | undefined) {
		this.registerGlobal(name, new ZrLuauFunction(fn));
	}

	public createScriptFromNodes(nodes: CommandSource, locals?: Record<string, ZrValue>) {
		return new ZrScript(nodes, { ...this.globals, ...locals });
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
			});
		}
	}
}
