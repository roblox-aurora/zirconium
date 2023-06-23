import { isOfVariant } from "@rbxts/variant";
import { ZrBytecodeTable, ZrCompilerConstant } from "./Compiler";
import { ZrInstruction, ZrOP } from "./Instructions";
import { Operand } from "./Operand";

const MAIN = "@ZrMain";

/**
 * @internal
 */
type ZrcConstant = ZrCompilerConstant;

/**
 * @internal
 */
export interface ZrcFunction {
	/**
	 * The name of the function
	 */
	readonly name: string;
	/**
	 * The instruction data for the function
	 */
	readonly data: number[];
	/**
	 * The locals for this function
	 */
	readonly locals: Map<string, [startPc: number, endPc: number]>;
	/**
	 * The labels for this function
	 */
	readonly labels: Map<string, number>;

	/**
	 * The number of parameters this function takes in
	 */
	readonly numparams: number;
	/**
	 * Whether or not this function uses variadic arguments
	 */
	readonly isVararg: boolean;

	/**
	 * Whether or not this function returns
	 */
	returns: boolean;
}

export class ZrBytecodeBuilder {
	private stackPtr = 0;

	private mainFunction: ZrcFunction;
	private functions = new Array<ZrcFunction>();

	private functionStack = new Array<ZrcFunction>();

	private constants = new Array<ZrCompilerConstant>();
	private labels = new Map<string, number>();

	public constructor(private instructionTable: readonly ZrInstruction[]) {
		const main: ZrcFunction = {
			name: MAIN,
			data: [],
			locals: new Map(),
			labels: new Map(),
			numparams: 0,
			isVararg: true,
			returns: false,
		};

		this.mainFunction = main;
		this.functions.push(main);
		this.functionStack.push(main);
	}

	/**
	 * Pushes a new closure and returns the closure id (the length of the array)
	 * @param name The name of the closure
	 * @param parameters The parameter(s) of the closure
	 * @param varargs Whether or not this closure takes varargs
	 * @returns The index of this function
	 */
	public beginFunction(name: string, parameters: string[], varargs: boolean): number {
		const arr = new Array<number>();

		const chunk = identity<ZrcFunction>({
			name,
			data: arr,
			locals: new Map(),
			labels: new Map(),
			isVararg: varargs,
			numparams: parameters.size(),
			returns: false,
		});

		for (const parameter of parameters) {
			chunk.locals.set(parameter, [0, chunk.data.size()]);
		}

		this.functionStack.push(chunk);
		this.stackPtr += 1;

		return this.functions.push(chunk);
	}

	public endFunction() {
		const chunk = this.functionStack.pop();
		if (chunk) {
			this.stackPtr -= 1;
		}
	}

	public currentFunction(): ZrcFunction {
		return this.functionStack[this.stackPtr] ?? this.mainFunction;
	}

	private addConstant(value: ZrcConstant) {
		if (value.type === "undefined") {
			const existing = this.constants.findIndex(f => f.type === "undefined");
			if (existing !== -1) {
				return existing;
			}
			return this.constants.push(value);
		} else {
			const existing = this.constants.findIndex(f => value.type === f.type);
			if (existing !== -1) {
				return existing;
			}

			return this.constants.push(value);
		}
	}

	public addConstantString(value: string): number {
		return this.addConstant({
			type: "string",
			value,
		});
	}

	public addConstantNumber(value: number): number {
		return this.addConstant({
			type: "number",
			value,
		});
	}

	public addConstantBoolean(value: boolean): number {
		return this.addConstant({
			type: "boolean",
			value,
		});
	}

	public addConstantUndefined(): number {
		return this.addConstant({
			type: "undefined",
		});
	}

	/**
	 * Raw emit an instruction with arguments
	 * @param code The op code
	 * @param args The bytes following the code
	 */
	public emit(code: ZrOP, ...args: number[]) {
		const chunk = this.currentFunction();
		const bytes = chunk.data;

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
			bytes.push(arg);
		}
	}

	public labelAt(name: string, at: number) {
		const labels = this.functionStack[this.stackPtr].labels;
		labels.set(name, at);
	}

	public label(name: string) {
		const closure = this.functionStack[this.stackPtr];

		let idx = closure.data.size();
		closure.labels.set(name, idx);
	}

	public build() {
		let labels = new Array<[number, string]>();

		let instructions = new Array<number>();

		for (const chunk of this.functions) {
			let offset = instructions.size();
			labels.push([offset, chunk.name]);

			for (const instruction of chunk.data) {
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

		return identity<ZrBytecodeTable>({
			labels,
			locals: [],
			constants: this.constants,
			instructions,
		});
	}
}
