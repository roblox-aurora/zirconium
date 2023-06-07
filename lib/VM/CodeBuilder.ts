import { isOfVariant } from "@rbxts/variant";
import { ZrCompiledCode } from "./Compiler";
import { ZrInstruction, ZrOP } from "./Instructions";
import { Operand } from "./Operand";

export class ZrCodeBuilder {
	private instructions = new Array<number>();
	private data = new Array<Operand>();
	private labels = new Map<string, number>();

	public constructor(private instructionTable: readonly ZrInstruction[]) {}

	public push(code: ZrOP, ...args: (Operand | number)[]) {
		const instr = this.instructionTable.find(instr => instr[0] === code);
		assert(instr, `Instruction not found at code ${code}`);

		const [, name, arity] = instr;

		if (args.size() !== arity) {
			error(`Instruction ${name} has arity of ${arity} but ${args.size()} was provided`);
		}

		this.instructions.push(code);
		for (const arg of args) {
			if (typeIs(arg, "number")) {
				this.instructions.push(arg);
			} else {
				const existing = this.data.findIndex(f => f.type === arg.type && f.value === arg.value);
				let pos = existing !== -1 ? existing : this.data.push(arg) - 1;
				this.instructions.push(pos);
			}
		}
	}

	public labelAt(name: string, at: number) {
		this.labels.set(name, at);
	}

	public label(name: string) {
		let idx = this.instructions.size();
		this.labels.set(name, idx);
	}

	public toPrettyString() {
		const strs = new Array<string>();

		for (let ip = 0; ip < this.instructions.size(); ) {
			const opCode = this.instructions[ip];
			const instr = this.instructionTable.find(f => f[0] === opCode);

			for (const [label, labelPtr] of this.labels) {
				if (labelPtr === ip) {
					strs.push(`.${label}`);
				}
			}

			assert(instr);
			const [, name, arity] = instr;
			let str = [name.upper()];

			for (let i = 1; i <= arity; i++) {
				const arg = this.instructions[ip + i];
				str.push(tostring(arg));
			}

			if (opCode === ZrOP.ADD) {
				str.push("\t\t; Pops & adds the last two values on the stack, pushes the result");
			} else if (opCode === ZrOP.CALLK) {
				str.push(
					`\t\t; calls '${this.data[this.instructions[ip + 1]].value}' with ${
						this.instructions[ip + 2]
					} arguments`,
				);
			} else if (opCode === ZrOP.LOADK) {
				const ptr = this.instructions[ip + 1];
				str.push(`\t\t; load constant @${ptr} (${this.data[ptr].value}) onto the stack`);
			} else if (opCode === ZrOP.SETUPVALUE) {
				str.push(
					`\t\t; sets the upvalue ${
						this.data[this.instructions[ip + 1]].value
					} to the last value in the stack`,
				);
			}

			strs.push(`\t${str.join(" ")}`);
			ip += arity + 1;
		}

		strs.push("-- constants --");
		let i = 0;
		for (const constant of this.data) {
			strs.push(`\t@${i} = ${constant.value}`);
			i++;
		}

		return strs.join("\n");
	}

	public build() {
		let labels = new Array<[number, string]>();

		for (const [key, value] of this.labels) {
			labels.push([value, key]);
		}

		labels.sort((a, b) => a[0] < b[0]);

		return identity<ZrCompiledCode>({
			symbols: [],
			labels,
			data: this.data,
			code: this.instructions,
		});
	}
}
