import { ZrVM } from "VM";
import { Operand } from "./Operand";

export const enum ZrOP {
	/**
	 * Load a value onto the stack from a constant
	 *
	 * `LOADK [const_idx]`
	 */
	LOADK,

	/**
	 * Attempts to add the two values on top of the stack, and push the result
	 *
	 * `ADD`
	 */
	ADD,

	/**
	 * Attempts to call the given function from a constant name
	 *
	 * `CALLK [const_idx] [arg_count]`
	 */
	CALLK,

	/**
	 * `GETINDEX [idx]`
	 */
	GETINDEX,

	/**
	 * `GETPROPERTY `[@]`
	 */
	GETPROPERTY,

	/**
	 * Returns the current call stack frame
	 */
	RET,

	/**
	 * Jumps to a given label constant
	 *
	 * `JUMPK [label_const_idx]`
	 */
	JMPK,

	/**
	 * Jumps if the value on the top of the stack is _truthy_
	 *
	 * `JMPIFK [label_const_idx]`
	 */
	JMPIFK,

	/**
	 * Loads the given global variable to the stack
	 *
	 * `GETGLOBAL [variable_const_idx]`
	 */
	GETGLOBAL,

	/**
	 * Loads the given upvalue variable to the stack
	 *
	 * `GETUPVALUE [variable_const_idx]`
	 * @deprecated TODO
	 */
	GETUPVALUE,

	/**
	 * Sets the current upvalue with the last value on the stack and pops it
	 *
	 * `SETUPVALUE [variable_const_idx]`
	 * @deprecated TODO
	 */
	SETUPVALUE,

	/**
	 * @deprecated TODO
	 */
	LT,

	/**
	 * @deprecated TODO
	 */
	EQ,

	NEWARRAY,
	NEWOBJECT,

	/**
	 * @deprecated TODO
	 */
	SUB,

	/**
	 * @deprecated TODO
	 */
	MUL,

	/**
	 * @deprecated TODO
	 */
	DIV,

	/**
	 *
	 * - `#..#`: `PUSHR [start_const] [end_const]`
	 * @deprecated TODO
	 */
	PUSHR,

	/**
	 * @deprecated TODO
	 */
	NOT,
}
export type ZrInstruction = [code: ZrOP, name: string, arity: number, fn: (vm: ZrVM, args: number[]) => void];

export const ZrInstructionTable: readonly ZrInstruction[] = [
	[
		ZrOP.ADD,
		"add",
		0,
		vm => {
			let rhs = vm.pop();
			let lhs = vm.pop();
			assert(rhs.type === "number");
			assert(lhs.type === "number");

			vm.push(Operand.number(lhs.value + rhs.value));
		},
	],
	[
		ZrOP.LOADK,
		"LOADK",
		1,
		(vm, [arg]) => {
			vm.push(vm.getDataAtIndex(arg));
		},
	],
	[
		ZrOP.CALLK,
		"CALLK",
		2,
		(vm, [id, argc]) => {
			let label = vm.getDataAtIndex(id);
			assert(label, "no label data at idx " + id);

			vm.call(tostring(label.value));
		},
	],
	[
		ZrOP.RET,
		"RET",
		0,
		vm => {
			vm.ret();
		},
	],
	[
		ZrOP.JMPK,
		"JMPK",
		1,
		(vm, [id]) => {
			let label = vm.getDataAtIndex(id);
			assert(label, `No valid label at id ${id}`);
			vm.jump(tostring(label.value));
		},
	],
	[
		ZrOP.JMPIFK,
		"JMPIFK",
		1,
		(vm, [id]) => {
			const condition = vm.pop();
			assert(condition.type === "number");
			if (condition.value !== 0) {
				let label = vm.getDataAtIndex(id);
				vm.jump(tostring(label.value));
			}
		},
	],
	[ZrOP.GETGLOBAL, "GETGLOBAL", 1, (vm, [id]) => {}],
	[
		ZrOP.SETUPVALUE,
		"setupvalue",
		1,
		(vm, [id]) => {
			const variableName = vm.getDataAtIndex(id);
			const value = vm.pop();

			// TODO: Assign 'value' to 'variableName' on VM
		},
	],
	[ZrOP.NEWOBJECT, "newobject", 1, (vm, [size]) => {}],
	[ZrOP.NEWARRAY, "newarray", 1, (vm, [size]) => {}],
	[ZrOP.GETINDEX, "getindex", 1, (vm, [idx]) => {}],
	[ZrOP.GETPROPERTY, "getproperty", 1, (vm, [id]) => {}],
];
