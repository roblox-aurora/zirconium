import ZrRuntime from "../Runtime/Runtime";

export default class ZrContext {
	private input = new Array<string>();
	private output = new Array<string>();

	constructor(private runtime: ZrRuntime) {}

	public static createPipedContext(runtime: ZrRuntime, input: Array<string>, output: Array<string>) {
		const context = new ZrContext(runtime);
		context.input = input;
		context.output = output;
		return context;
	}

	/** @internal */
	public getLocals() {
		return this.runtime.getLocals();
	}

	public getInput(): readonly string[] {
		return this.input;
	}

	public pushOutput(value: string) {
		this.output.push(value);
	}

	/** @internal */
	public _getOutput() {
		return this.output;
	}
}
