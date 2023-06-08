import { isOfVariant } from "@rbxts/variant";
import { ZrChunk, ZrCompilerConstant } from "./Compiler";
import { ZrInstruction, ZrOP } from "./Instructions";
import { Operand } from "./Operand";

const MAIN = "@ZrMain";

interface ZrFunctionChunk {
	name: string;
	instructions: number[];
	locals: Map<string, [startPc: number, endPc: number]>;
	labels: Map<string, number>;
	returns: boolean;
}

export class ZrCodeBuilder {
	private stackPtr = 0;

	private chunkStack = new Array<ZrFunctionChunk>();
	private chunks = new Array<ZrFunctionChunk>();

	private data = new Array<ZrCompilerConstant>();
	private labels = new Map<string, number>();

	public constructor(private instructionTable: readonly ZrInstruction[]) {
		const main: ZrFunctionChunk = {
			name: MAIN,
			instructions: [],
			locals: new Map(),
			labels: new Map(),
			returns: false,
		};

		this.chunks.push(main);
		this.chunkStack.push(main);
	}

	public closure(name: string, parameters: string[], withClosure: () => void): void {
		const arr = new Array<number>();

		const chunk = identity<ZrFunctionChunk>({
			name,
			instructions: arr,
			locals: new Map(),
			labels: new Map(),
			returns: false,
		});

		this.chunkStack.push(chunk);
		this.stackPtr += 1;

		withClosure();
		for (const parameter of parameters) {
			chunk.locals.set(parameter, [0, chunk.instructions.size()]);
		}

		this.chunkStack.pop();
		this.stackPtr -= 1;
		this.chunks.push(chunk);
	}

	public chunk(): Readonly<ZrFunctionChunk> {
		return this.chunkStack[this.stackPtr];
	}

	public push(code: ZrOP, ...args: (Operand | number)[]) {
		const chunk = this.chunkStack[this.stackPtr];
		const bytes = chunk.instructions;

		const instr = this.instructionTable.find(instr => instr[0] === code);
		assert(instr, `Instruction not found at code ${code}`);

		const [, name, arity] = instr;

		if (args.size() !== arity) {
			error(`Instruction ${name} has arity of ${arity} but ${args.size()} was provided`);
		}

		bytes.push(code);

		if (code === ZrOP.RET) {
			chunk.returns = true;
		}

		for (const arg of args) {
			if (typeIs(arg, "number")) {
				bytes.push(arg);
			} else {
				const existing = this.data.findIndex(f => f === arg.value);
				let pos = existing !== -1 ? existing : this.data.push(arg.value) - 1;
				bytes.push(pos);
			}
		}
	}

	public labelAt(name: string, at: number) {
		const labels = this.chunkStack[this.stackPtr].labels;
		labels.set(name, at);
	}

	public label(name: string) {
		const closure = this.chunkStack[this.stackPtr];

		let idx = closure.instructions.size();
		closure.labels.set(name, idx);
	}

	public build() {
		let labels = new Array<[number, string]>();

		let instructions = new Array<number>();

		for (const chunk of this.chunks) {
			let offset = instructions.size();
			labels.push([offset, chunk.name]);

			for (const instruction of chunk.instructions) {
				instructions.push(instruction);
			}

			for (const [label, lp] of chunk.labels) {
				labels.push([offset + lp, label]);
			}

			if (!chunk.returns) {
				instructions.push(ZrOP.RET);
			}
		}

		labels.sort((a, b) => a[0] < b[0]);

		return identity<ZrChunk>({
			labels,
			locals: [],
			constants: this.data,
			instructions,
		});
	}
}
