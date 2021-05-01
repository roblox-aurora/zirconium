import ZrRuntime from "../Runtime/Runtime";
import { ZrValue } from "./Locals";
import { ZrInputStream, ZrOutputStream } from "./Stream";

export default class ZrContext {
	private input = ZrInputStream.empty();
	private output = new ZrOutputStream();

	constructor(private runtime: ZrRuntime) {}

	public static createPipedContext(runtime: ZrRuntime, input: ZrInputStream, output: ZrOutputStream) {
		const context = new ZrContext(runtime);
		context.input = input;
		context.output = output;
		return context;
	}

	/** @internal */
	public getLocals() {
		return this.runtime.getLocals();
	}

	/**
	 * Gets the input stream
	 */
	public getInput() {
		return this.input;
	}

	public getExecutor() {
		return this.runtime.getExecutingPlayer();
	}

	/**
	 * Gets the output stream
	 */
	public getOutput() {
		return this.output;
	}
}
