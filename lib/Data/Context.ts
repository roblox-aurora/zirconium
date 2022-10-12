import ZrRuntime from "../Runtime/Runtime";
import { ZrValue } from "./Locals";
import { ZrInputStream, ZrOutputStream } from "./Stream";

export default class ZrContext {
	private output = new ZrOutputStream();

	constructor(private runtime: ZrRuntime) {}

	/** @internal */
	public getLocals() {
		return this.runtime.getLocals();
	}

	public getExecutor() {
		return this.runtime.getExecutingPlayer();
	}

	/**
	 * Gets the output stream
	 * @internal
	 */
	public getOutput() {
		return this.output;
	}
}
