import { ZrValue } from "Data/Locals";
import ZrUndefined from "Data/Undefined";

export class ZrStack {
	private inner = new Array<ZrValue>();

	public push(value: ZrValue) {
		return this.inner.push(value) - 1;
	}

	public values() {
		return [...this.inner];
	}

	public size() {
		return this.inner.size();
	}

	/**
	 * Moves the given stack elements to another stack
	 * @param stackStartIdx The start index of the stack to move
	 * @param stackEndIdx The end index of the stack to move
	 * @param stackTargetStartIdx The start index of the target stack to move this stack range to
	 * @param stack The stack to move the range to
	 * @returns The stack which the range is moved to
	 * @internal
	 */
	public move(stackStartIdx: number, stackEndIdx: number, stackTargetStartIdx: number, stack: ZrStack) {
		this.inner.move(stackStartIdx, stackEndIdx, stackTargetStartIdx, stack.inner);
		return stack;
	}

	public pop(index = -1) {
		if (index === -1) {
			const value = this.inner.pop();
			assert(value !== undefined, "stack empty");
			return value;
		} else {
			if (index < 0) index = this.inner.size() + index;

			const value = this.inner.remove(index);
			assert(value !== undefined, `Could not pop at index ${index}`);
			return value;
		}
	}

	/**
	 * Checks the stack size
	 * @param size Whether or not the stack matches the given size
	 */
	public checkstack(size: number): boolean {
		return this.inner.size() >= size;
	}

	/**
	 * Gets a value on the stack
	 *
	 * - Negative numbers will go from the top of the stack (e.g. `-1` is 'last')
	 * - Positive numbers will go from the bottom of the stack (e.g. `0` is first)
	 * @param idx The stack index to get the value from
	 * @returns The stack value
	 */
	public at(idx: number): ZrValue {
		if (idx < 0) {
			return this.inner[this.inner.size() + idx];
		} else {
			return this.inner[idx];
		}
	}

	public gettop() {
		return this.inner.size() - 1;
	}

	/**
	 *
	 * @param count
	 * @internal
	 */
	public settop(count: number) {
		this.inner = this.inner.move(1, count, 0, new Array(count, ZrUndefined));
	}

	/**
	 * Casts the given stack value to a string
	 * @param idx The index to cast to a string
	 * @returns The string representation of the stack object
	 */
	public tostring(idx: number) {
		return tostring(this.at(idx));
	}

	/**
	 * Casts the given stack value to a number (if possible)
	 * @param idx The index to cast to a string
	 * @returns The number representation of the stack object, or `ZrUndefined` if none
	 */
	public tonumber(idx: number): ZrValue {
		const value = this.at(idx);
		if (typeIs(value, "number")) {
			return value;
		} else if (typeIs(value, "string")) {
			return tonumber(value) ?? ZrUndefined;
		}

		// TODO: Replace with Zr typeof
		throw `Cannot cast ${typeOf(value)} to number`;
	}
}
