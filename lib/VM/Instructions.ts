import { ZrClosure } from "Data/Closure";
import { ZrValue } from "Data/Locals";
import ZrLuauFunction from "Data/LuauFunction";
import ZrUndefined from "Data/Undefined";
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
	 *  TODO: Change to use registers?
	 *
	 * `EQ [invert: 1 | 0] [value: CONST_OR_UPVALUE_ID]`
	 *
	 * `EQ 1` (equals false)
	 * `EQ 0` (equals true)
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
	LOADNONE,
	CLOSURE,
	EXIT,
}
export type ZrInstruction = [code: ZrOP, name: string, arity: number, fn: (vm: ZrVM, args: number[]) => void];

export const ZrInstructionTable: readonly ZrInstruction[] = [
	[
		ZrOP.ADD,
		"add",
		0,
		vm => {
			let rhs = vm.stackPop();
			let lhs = vm.stackPop();

			assert(typeIs(rhs, "number") && typeIs(lhs, "number"));
			vm.stackPush(rhs + lhs);
		},
	],
	[
		ZrOP.LOADK,
		"LOADK",
		1,
		(vm, [arg]) => {
			vm.stackPush(vm.getDataAtIndex(arg).value ?? ZrUndefined);
		},
	],
	[
		ZrOP.CALLK,
		"CALLK",
		2,
		(vm, [id, argc]) => {
			let label = vm.getDataAtIndex(id).value;
			assert(label, "no label data at idx " + id);

			let fun = vm.env.getLocalOrUpValue(tostring(label));
			if (fun !== undefined) {
				const value = fun.data.value;
				if (value instanceof ZrLuauFunction) {
					let args = new Array<ZrValue>();

					for (let i = 0; i < argc; i++) {
						args.push(vm.stackPop());
					}

					vm.env.push();

					const result = value.call(undefined! /* TO DO */, args);
					if (result !== undefined) {
						vm.stackPush(result);
					} else {
						vm.stackPush(ZrUndefined);
					}

					vm.env.pop();
				} else if (value instanceof ZrClosure) {
					return vm.call(value.getLabel(), argc);
				}
			}

			error("Unknown closure: " + label);
		},
	],
	[
		ZrOP.RET,
		"RET",
		1,
		vm => {
			vm.ret();
		},
	],
	[
		ZrOP.JMPK,
		"JMPK",
		1,
		(vm, [id]) => {
			let label = vm.getDataAtIndex(id).value;
			assert(label, `No valid label at id ${id}`);
			vm.jump(tostring(label));
		},
	],
	[
		ZrOP.JMPIFK,
		"JMPIFK",
		1,
		(vm, [id]) => {
			const condition = vm.stackPop();
			assert(typeIs(condition, "number"));
			if (condition !== 0) {
				let label = vm.getDataAtIndex(id).value;
				vm.jump(tostring(label));
			}
		},
	],
	[ZrOP.GETGLOBAL, "GETGLOBAL", 1, (vm, [id]) => {}],
	[
		ZrOP.SETUPVALUE,
		"setupvalue",
		1,
		(vm, [id]) => {
			const variableName = vm.getDataAtIndex(id).value;
			const value = vm.stackPop();

			assert(typeIs(variableName, "string"));
			vm.env.setUpValueOrLocal(variableName, value);
		},
	],
	[ZrOP.NEWOBJECT, "newobject", 1, (vm, [size]) => {}],
	[ZrOP.NEWARRAY, "newarray", 1, (vm, [size]) => {}],
	[ZrOP.GETINDEX, "getindex", 1, (vm, [idx]) => {}],
	[ZrOP.GETPROPERTY, "getproperty", 1, (vm, [id]) => {}],
	[
		ZrOP.LOADNONE,
		"pushnone",
		0,
		vm => {
			vm.stackPush(ZrUndefined);
		},
	],
	[
		ZrOP.CLOSURE,
		"closure",
		1,
		(vm, [id]) => {
			const label = vm.getDataAtIndex(id).value;
			vm.stackPush(new ZrClosure(tostring(label)));
		},
	],
	[
		ZrOP.EXIT,
		"exit",
		0,
		vm => {
			vm.ret();
		},
	],
];
