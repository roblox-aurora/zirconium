import inspect from "@rbxts/inspect";
import { ZrFunction } from "Data/Function";
import { ZrValue } from "Data/Locals";
import ZrUndefined from "Data/Undefined";
import { ZrVM } from "VM";
import { u8, utoi8 } from "./Utils";

export enum ZrOP {
	/**
	 * Load a value onto the stack from a constant
	 *
	 * `LOADK [const_idx]`
	 */
	PUSHK,

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
	 * Jump forward N instructions
	 *
	 * `JMP [N]`
	 */
	JMP,

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

	SETGLOBAL,

	/**
	 * @deprecated TODO
	 */
	LT,

	/**
	 *  Will skip the next instruction if not A
	 *
	 * `EQ A B C`
	 */
	EQ,

	TEST,

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

export enum ZrEncoding {
	ABC = 3,
	AD = 2,
	E = 1,
	AUX = 0,
}

export type ZrInstruction = [
	code: ZrOP,
	name: string,
	arity: ZrEncoding,
	fn: (vm: ZrVM, args: readonly number[]) => void,
];

export const ZrInstructionTable: readonly ZrInstruction[] = [
	[
		ZrOP.ADD,
		"add",
		ZrEncoding.ABC,
		(vm, [rA, rBK, rCK]) => {
			let lhs = vm.getRegister(rBK);
			let rhs = vm.getRegister(rCK);

			assert(typeIs(rhs, "number") && typeIs(lhs, "number"));
			vm.setRegister(rA, rhs + lhs);
		},
	],
	[
		ZrOP.PUSHK,
		"PUSHK",
		ZrEncoding.ABC,
		(vm, [arg]) => {
			const value = vm.getConstant(arg).value ?? ZrUndefined;

			vm.push(value);
			print("push", value, "onto stack", inspect(vm.state.getStack().values()));
		},
	],
	[
		ZrOP.TEST,
		"TEST",
		ZrEncoding.ABC,
		(vm, [condA, b]) => {
			const stack = vm.state.getStack();

			let bSigned = utoi8(b as u8);

			let valueB: ZrValue;
			if (bSigned < 0) {
				valueB = stack.pop(bSigned);
			} else {
				throw `not yet impl`;
			}

			const conditionRequirement = condA === 1;

			if (!!valueB !== conditionRequirement) {
				vm.jmpc(1);
			}
		},
	],
	[
		ZrOP.EQ,
		"EQ",
		ZrEncoding.ABC,
		(vm, [condA, b, c]) => {
			let bSigned = utoi8(b as u8);
			let cSigned = utoi8(c as u8);

			const stack = vm.state.getStack();

			let valueC: ZrValue;
			if (cSigned < 0) {
				valueC = stack.pop(cSigned);
			} else {
				throw `not yet impl`;
			}

			let valueB: ZrValue;
			if (bSigned < 0) {
				valueB = stack.pop(bSigned);
			} else {
				throw `not yet impl`;
			}

			const conditionRequirement = condA === 1;

			if ((valueC === valueB) !== conditionRequirement) {
				vm.jmpc(2);
			}
		},
	],
	[
		ZrOP.CALLK,
		"CALLK",
		ZrEncoding.ABC,
		(vm, [id, argc]) => {
			let label = vm.getConstant(id).value;
			assert(label, "no label data at idx " + id);

			let fun = vm.state.getGlobal(tostring(label)).unwrap();
			if (fun instanceof ZrFunction) {
				fun.stackcall(vm.state, argc, true);
			} else {
				error("Unknown closure: " + label);
			}
		},
	],
	[
		ZrOP.RET,
		"RET",
		ZrEncoding.ABC,
		(vm, [count]) => {
			vm.ret(count);
		},
	],
	[
		ZrOP.JMP,
		"JMP",
		ZrEncoding.ABC,
		(vm, [pc]) => {
			vm.jmpc(pc);
		},
	],
	[
		ZrOP.GETGLOBAL,
		"GETGLOBAL",
		1,
		(vm, [id]) => {
			const value = vm.state.getGlobal(tostring(vm.getConstant(id).value));
			vm.state.getStack().push(value.expect(`Failed to get global ${id}`));
		},
	],
	[
		ZrOP.SETUPVALUE,
		"setupvalue",
		ZrEncoding.ABC,
		(vm, [id]) => {
			const variableName = vm.getConstant(id).value;
			const value = vm.pop();

			assert(typeIs(variableName, "string"));
			// vm.env.setUpValueOrLocal(variableName, value);
		},
	],
	[
		ZrOP.SETGLOBAL,
		"setglobal",
		ZrEncoding.ABC,
		(vm, [id]) => {
			const constant = vm.getConstant(id);
			assert(constant.type === "string");
			const top = vm.state.getStack().pop();
			assert(top);
			vm.state.setGlobal(constant.value, top);
		},
	],
	[ZrOP.NEWOBJECT, "newobject", ZrEncoding.ABC, (vm, [size]) => {}],
	[ZrOP.NEWARRAY, "newarray", ZrEncoding.ABC, (vm, [size]) => {}],
	[ZrOP.GETINDEX, "getindex", ZrEncoding.ABC, (vm, [idx]) => {}],
	[ZrOP.GETPROPERTY, "getproperty", ZrEncoding.ABC, (vm, [id]) => {}],
	[
		ZrOP.LOADNONE,
		"pushnone",
		ZrEncoding.AUX,
		vm => {
			vm.push(ZrUndefined);
		},
	],
	[
		ZrOP.CLOSURE,
		"closure",
		ZrEncoding.ABC,
		(vm, [id]) => {
			const constant = vm.getConstant(id);
			assert(constant.type === "string");
			const func = vm.getFunctionNamed(constant.value);
			assert(func);
			vm.push(ZrFunction.createUserFunctionFromCompiled(func));
		},
	],
	[
		ZrOP.EXIT,
		"exit",
		ZrEncoding.AUX,
		vm => {
			vm.ret(0);
		},
	],
];
