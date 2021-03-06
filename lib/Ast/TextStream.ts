/**
 * A text stream
 */
export default class ZrTextStream {
	private ptr = 1;
	private column = 0;
	private row = 0;

	public constructor(private source: string) {}

	/**
	 * Consume and return the next character in the stream
	 */
	public next(offset = 1) {
		const char = this.source.sub(this.ptr, this.ptr);
		this.ptr += offset;
		if (char === "\n") {
			this.column += 1;
		} else {
			this.column = 0;
			this.row += 1;
		}
		return char;
	}

	public getRowAndColumn() {
		return identity<[row: number, column: number]>([this.row, this.column]);
	}

	/** @internal */
	public sub(x: number, y: number) {
		return this.source.sub(x, y);
	}

	public getRow() {
		return this.row;
	}

	public getColumn() {
		return this.column;
	}

	/**
	 * Returns the next character in the stream without consuming it
	 */
	public peek(offset = 0) {
		const char = this.source.sub(this.ptr + offset, this.ptr + offset);
		return char;
	}

	/**
	 * Resets the stream pointer to the beginning.
	 */
	public reset() {
		this.ptr = 1;
	}

	/**
	 * Whether or not there's a next character in the stream
	 */
	public hasNext() {
		return this.source.size() >= this.ptr;
	}

	/**
	 * Get the current pointer location
	 */
	public getPtr() {
		return this.ptr;
	}

	/** @internal */
	public setPtr(ptr: number) {
		this.ptr = ptr;
	}
}
