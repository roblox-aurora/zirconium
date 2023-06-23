export class ArrayReader<T extends defined> {
	public constructor(private arr: T[], private idx = 0) {}

	public next() {
		return this.arr[++this.idx];
	}

	public prev() {
		if (this.idx > 0) {
			return this.arr[--this.idx];
		}
	}

	public at() {
		return this.arr[this.idx];
	}
}
