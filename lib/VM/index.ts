import inspect from "@rbxts/inspect";
import { ZrFunction } from "Data/Function";
import ZrLocalStack, { ZrValue } from "Data/Locals";
import { ZrVariants } from "Data/Types";
import ZrUndefined from "Data/Undefined";
import { ZrcFunction } from "./CodeBuilder";
import { ZrBytecodeTable, ZrCompilerConstant } from "./Compiler";
import { ZrInstruction, ZrOP } from "./Instructions";
import { ZrState } from "./State";
import { ZR_A, ZR_B, ZR_C, ZR_D, ZR_E, ZR_OP } from "./Utils";

interface ZrvFrame {
	ret: number;
	returned: ZrValue | undefined;
	func: ZrcFunction;
}

export class ZrStack {}

export const enum ZrVMRegister {
	A,
	B,
	C,
	D,
}

export class ZrVM {
	public readonly state = new ZrState();

	private registers: [a: ZrValue, b: ZrValue, c: ZrValue, d: ZrValue] = [
		ZrUndefined,
		ZrUndefined,
		ZrUndefined,
		ZrUndefined,
	];

	private ip = 0;
	private frameStack = new Array<ZrvFrame>();

	public constructor(private compiled: ZrBytecodeTable, private instructions: readonly ZrInstruction[]) {
		let frame = identity<ZrvFrame>({
			ret: -1,
			returned: undefined,
			func: compiled.functions[0], // always first function
		});

		this.frameStack.push(frame);

		this.state.vm = this;
	}

	private frame(): ZrcFunction {
		const frame = this.frameStack[this.frameStack.size() - 1];
		assert(frame, "Cannot find frame at " + (this.frameStack.size() - 1));
		return frame.func;
	}

	private hasFrame() {
		return this.frameStack.size() > 0;
	}

	private next() {
		let code = this.frame().data[this.ip];
		this.ip += 1;
		return code;
	}

	public getConstant(index: number): ZrCompilerConstant {
		return this.frame().constants[index];
	}

	public getFunctionIdx(funcIdx: number): ZrcFunction {
		return this.compiled.functions[funcIdx];
	}

	public getFunctionNamed(funcName: string): ZrcFunction | undefined {
		return this.compiled.functions.find(f => f.name === funcName);
	}

	public getRegister(register: ZrVMRegister) {
		assert(register <= ZrVMRegister.D);
		return this.registers[register];
	}

	public setRegister(register: ZrVMRegister, value: ZrValue) {
		this.registers[register] = value;
	}

	public jump(label: string) {
		const matchingLabel = this.compiled.labels.find(f => f[1] === label);
		assert(matchingLabel, `Attempt to jump to unknown label: ${matchingLabel}`);
		this.ip = matchingLabel[0];
	}

	public jmpc(count: number) {
		this.ip += count;
	}

	public push(value: ZrValue) {
		this.state.getStack().push(value);
	}

	public pop() {
		const value = this.state.getStack().pop();
		assert(value, "opstack empty");
		return value;
	}

	private exec(instruction: number) {
		const code = ZR_OP(instruction);

		const instr = this.instructions.find(instr => instr[0] === code);
		assert(instr, `Could not find instruction with op code ${code}`);

		const [, name, arity, exec] = instr;
		if (arity === 0) {
			exec(this, []);
		} else if (arity === 3) {
			const a = ZR_A(instruction);
			const b = ZR_B(instruction);
			const c = ZR_C(instruction);

			print("exec", ZrOP[code], a, b, c);
			exec(this, [a, b, c]);
		} else if (arity === 2) {
			const a = ZR_A(instruction);
			const d = ZR_D(instruction);
			exec(this, [a, d]);
		} else if (arity === 1) {
			const e = ZR_E(instruction);
			exec(this, [e]);
		} else {
			throw `Invalid arity for '${name}': ${arity}`;
		}
	}

	public ret(count: number): ZrValue[] {
		const stack = this.state.getStack();
		assert(stack.checkstack(count));

		let returnedValues = new Array<ZrValue>();
		for (let i = 0; i < count; i++) {
			returnedValues.unshift(stack.pop());
		}

		let frame = this.frameStack.pop();
		assert(frame);
		this.ip = frame.ret;

		this.state.endStack();

		print("return", count);
		return returnedValues;
	}

	public call(frame: ZrcFunction, args: ZrValue[]) {
		print("call", frame.name, inspect(args));
		// TODO: Assign args to locals

		this.state.beginStack();

		this.frameStack.push(
			identity<ZrvFrame>({
				func: frame,
				returned: undefined,
				ret: this.ip++,
			}),
		);

		let ip = 0;
		while (ip < frame.data.size()) {
			const instruction = frame.data[ip++];
			this.exec(instruction);
		}

		this.frameStack.pop();
	}

	public run() {
		while (true) {
			if (!this.hasFrame()) break;

			const frame = this.frame();

			if (this.ip >= frame.data.size()) {
				break;
			}

			let instruction = this.next();
			this.exec(instruction);
		}
	}
}
