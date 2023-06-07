import { ZrCompiledCode } from "./Compiler";
import { ZrInstruction } from "./Instructions";
import { Operand } from "./Operand";

interface ZrFrame {
	retAddr: number;
}
function ZrFrame(retAddr: number) {
	return identity<ZrFrame>({ retAddr });
}

export class ZrVM {
	private ip = 0;
	private callStack = new Array<ZrFrame>();
	private stack = new Array<Operand>();

	public constructor(private compiled: ZrCompiledCode, private instructions: readonly ZrInstruction[]) {
		let frame = ZrFrame(compiled.code.size());
		this.callStack.push(frame);
	}

	private next() {
		let code = this.compiled.code[this.ip];
		this.ip += 1;
		return code;
	}

	public getDataAtIndex(index: number) {
		return this.compiled.data[index];
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

	public call(label: string) {
		this.callStack.push(ZrFrame(this.ip));
		print("calling", label);
		this.jump(label);
	}

	public push(value: Operand) {
		this.stack.push(value);
	}

	public pop() {
		const value = this.stack.pop();
		assert(value, "opstack empty");
		return value;
	}

	public run() {
		while (true) {
			if (this.ip >= this.compiled.code.size()) {
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
