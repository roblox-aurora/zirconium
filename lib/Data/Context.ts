import ZrRuntime from "../Runtime/Runtime";

export default class ZrContext {
	constructor(private runtime: ZrRuntime) {}

	/** @internal */
	public getLocals() {
		return this.runtime.getLocals();
	}
}
