import inspect from "@rbxts/inspect";
import variantModule, { fields, lookup, match, TypeNames, VariantOf } from "@rbxts/variant";
import { ZrVM } from "VM";
import { ZrcFunction } from "VM/CodeBuilder";
import { ZrState } from "VM/State";
import ZrContext from "./Context";
import { ZrValue } from "./Locals";
import ZrUndefined from "./Undefined";

type LuauFunction = (state: ZrState, ...args: ZrValue[]) => ZrValue | void;

export interface ZrUserFunction {
	/**
	 * The name of the function
	 */
	readonly name: string;

	/**
	 * A pointer to a function
	 */
	readonly callback: LuauFunction;
}

export const ZrFunctionHandle = variantModule({
	LuauFunction: fields<ZrUserFunction>(),
	ZrFunction: fields<ZrcFunction>(),
});
export type ZrFunctionHandle = VariantOf<typeof ZrFunctionHandle>;

export class ZrFunction {
	private static readonly luauMap = new WeakMap<LuauFunction, ZrFunction>();

	public readonly handle: ZrFunctionHandle;
	protected constructor(handle: ZrFunctionHandle) {
		this.handle = handle;
	}

	/**
	 * Calls the function from a Luau context, passing in parameters and returning the value directly
	 * @param state The state to call the function on
	 * @param args The arguments to pass to the function
	 */
	public call(state: ZrState, ...args: ZrValue[]): ZrValue | void {
		const handle = this.handle;
		if (handle.type === "LuauFunction") {
			const stack = state.beginStack();

			for (const arg of args) {
				stack.push(arg);
			}
			const retVal = handle.callback(state, ...args);

			state.endStack();
			return retVal;
		} else if (handle.type === "ZrFunction") {
			assert(state.vm, "Cannot call a bytecode function if there's no VM specified to run it on");
			state.vm.call(handle, args);
			return;
		}
	}

	/**
	 * Calls the function using the state's stack
	 * @internal
	 * @param state The state
	 * @param numparams The number of parameters to read from the stack
	 * @param returns The number of values returned to the stack
	 * @returns The last stack index after the call (should be the index of the return value)
	 */
	public stackcall(state: ZrState, numparams: number, returns: boolean): number {
		const stack = state.getStack();
		const handle = this.handle;

		print("stackcall", handle.name, numparams, inspect(state.getStack().values()));
		// if (handle.type === "LuauFunction") {
		// Ensure we have enough parameters, and pop each parameter to be consumed by the LuauFunction.
		assert(
			stack.checkstack(numparams),
			`LuauFunction ${handle.name} (numparams) ${numparams} !== (stacksize) ${stack.size()}`,
		);
		const args = new Array<ZrValue>(numparams);
		for (let i = 0; i < numparams; i++) {
			args.unshift(stack.pop());
		}

		// Create an empty stack for this function call - we're already passing parameters here.
		state.beginStack();
		const value = this.call(state, ...args);
		state.endStack();

		// If returns are specified, we'll push the result back onto the stack - otherwise naaah.
		if (returns) {
			stack.push(value ?? ZrUndefined);
		}

		// Return the stack top index
		return stack.gettop();

		assert(false, "panic"); // panic
	}

	public static createFunction(name: string, callback: LuauFunction) {
		let handle = ZrFunction.luauMap.get(callback);
		if (!handle) {
			handle = new ZrFunction(
				ZrFunctionHandle.LuauFunction({
					name,
					callback,
				}),
			);
			ZrFunction.luauMap.set(callback, handle);
		}

		return handle;
	}

	/**
	 * @internal
	 */
	public static createUserFunctionFromCompiled(frame: ZrcFunction) {
		return new ZrFunction(ZrFunctionHandle.ZrFunction(frame));
	}

	public toString() {
		return match(this.handle, {
			LuauFunction: lf => `<function '${lf.name ?? "??"}'>`,
			ZrFunction: zf => `<function '${zf.name ?? "??"}'>`,
		});
	}
}
