import ZrLocalStack, { ZrValue } from "Data/Locals";
import { ZrVariants } from "Data/Types";
import { ZrChunk } from "./Compiler";
import { ZrInstruction } from "./Instructions";

interface ZrFrame {
	retAddr: number;
}
function ZrFrame(retAddr: number) {
	return identity<ZrFrame>({ retAddr });
}

export class ZrStack {
	private stack = new Array<ZrValue>();

	public push(value: ZrValue) {
		this.stack.push(value);
	}

	public pop() {
		const value = this.stack.pop();
		assert(value);
		return value;
	}
}

export class ZrVM {
	public readonly env = new ZrLocalStack();
	public readonly stack = new ZrStack();

	private ip = 0;
	private callStack = new Array<ZrFrame>();

	public constructor(private compiled: ZrChunk, private instructions: readonly ZrInstruction[]) {
		let frame = ZrFrame(compiled.instructions.size());
		this.callStack.push(frame);
	}

	private next() {
		let code = this.compiled.instructions[this.ip];
		this.ip += 1;
		return code;
	}

	public getDataAtIndex(index: number) {
		return this.compiled.constants[index];
	}

	public jump(label: string) {
		const matchingLabel = this.compiled.labels.find(f => f[1] === label);
		assert(matchingLabel, `Attempt to jump to unknown label: ${matchingLabel}`);
		this.ip = matchingLabel[0];
	}

	public ret() {
		let frame = this.callStack.pop();
		assert(frame);
		this.ip = frame.retAddr;
	}

	public call(label: string, argc: number) {
		this.callStack.push(ZrFrame(this.ip));
		print("calling", label);
		this.jump(label);
	}

	public stackPush(value: ZrValue) {
		this.stack.push(value);
	}

	public stackPop() {
		const value = this.stack.pop();
		assert(value, "opstack empty");
		return value;
	}

	public run() {
		while (true) {
			if (this.ip >= this.compiled.instructions.size()) {
				break;
			}

			let opCode = this.next();

			const instr = this.instructions.find(instr => instr[0] === opCode);
			assert(instr, `Could not find instruction with op code ${opCode}`);

			const [code, _, arity, fn] = instr;

			let args = new Array<number>();
			for (let i = 0; i < arity; i++) {
				args.push(this.next());
			}

			fn(this, args);
		}
	}
}
