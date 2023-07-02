import { Option } from "@rbxts/rust-classes";
import { ZrDefined, ZrValue } from "Data/Locals";
import ZrUndefined from "Data/Undefined";
import { ZrVM } from "VM";
import { ZrStack } from "./Stack";

interface ZrvState {
	/**
	 * @internal
	 */
	globals: Map<string, ZrValue>;
	/**
	 * @internal
	 */
	upvalues: undefined;
	/**
	 * @internal
	 */
	stacks: Array<ZrStack>;
	/**
	 * @internal
	 */
	vm: ZrVM | undefined;
}

export class ZrState implements ZrvState {
	globals = new Map<string, ZrDefined>();
	upvalues = undefined; // TODO: upvalues
	stacks = [new ZrStack()];
	vm: ZrVM | undefined;

	public constructor() {}

	/**
	 * Gets the stack for this state
	 * @returns The state's current stack
	 */
	public getStack() {
		return this.stacks[this.stacks.size() - 1];
	}

	/**
	 * Gets the given global from this state
	 * @param name The name of the global
	 * @returns The resulting value
	 */
	public getGlobal(name: string): Option<ZrDefined> {
		return Option.wrap(this.globals.get(name));
	}

	/**
	 * Sets the global to the given name
	 * @param name The name of the global
	 * @param value The value of the global
	 */
	public setGlobal(name: string, value: ZrValue) {
		if (value === ZrUndefined) {
			this.globals.delete(name);
		} else {
			this.globals.set(name, value);
		}
	}

	public pushGlobal(name: string): number {
		const stack = this.getStack();
		return this.getGlobal(name).match(
			value => stack.push(value) - 1,
			() => -1,
		);
	}

	public setStackGlobal(name: string, index: number) {
		const stack = this.getStack();
		const value = stack.at(index);
		if (value !== ZrUndefined) {
			this.globals.set(name, value);
		}
	}

	/**
	 * @internal
	 */
	public beginStack(): ZrStack {
		const newStack = new ZrStack();
		this.stacks.push(newStack);
		return newStack;
	}

	/**
	 * @internal
	 */
	public endStack(): ZrStack | undefined {
		return this.stacks.pop();
	}
}
