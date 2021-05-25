import { stringify } from "Functions/BuiltInFunctions";
import { ZrValue } from "./Locals";
import ZrUndefined from "./Undefined";

export class ZrInputStream {
	public constructor(private readonly input: ReadonlyArray<ZrValue>) {}
	public static empty() {
		return new ZrInputStream([]);
	}

	/**
	 * Whether or not this stream is empty
	 */
	public isEmpty() {
		return this.input.isEmpty();
	}

	/**
	 * Gets the input stream as a generator
	 *
	 * ```ts
	 * for (const value of input.stream()) {
	 *      print(value);
	 * }
	 * ```
	 */
	public *stream() {
		for (const value of this.input) {
			yield value;
		}
	}

	/**
	 * Returns an ipairs iterator
	 *
	 * ```ts
	 * for (const [idx, value] of input.ipairs()) {
	 *      print(idx, value);
	 * }
	 * ```
	 */
	public ipairs() {
		return ipairs(this.input);
	}

	/**
	 * Gets the input stream as an array
	 */
	public toArray() {
		return this.input;
	}
}

export class ZrOutputStream {
	private output = new Array<ZrValue | ZrUndefined>();

	/**
	 * Returns the output stream as an array
	 */
	public toArray(): ReadonlyArray<ZrValue | ZrUndefined> {
		return this.output;
	}

	/**
	 * Writes the specified message to the output stream
	 */
	public write(message: ZrValue | ZrUndefined) {
		this.output.push(message);
	}

	/**
	 * Converts this output stream to an array of string values
	 * @internal
	 */
	public _toStringArray() {
		return this.output.map((v) => stringify(v));
	}

	/**
	 * @internal
	 */
	public _toInputStream() {
		return new ZrInputStream(this.output);
	}
}
