import { isOfVariant } from "@rbxts/variant";
import { ZrBytecodeTable, ZrCompilerConstant } from "./Compiler";
import { ZrEncoding, ZrInstruction, ZrOP } from "./Instructions";
import { Operand } from "./Operand";
import { ArrayReader } from "./Ptr";
import { ZR_A, ZR_B, ZR_OP } from "./Utils";
import inspect from "@rbxts/inspect";

const MAIN = "@ZrMain";

/**
 * @internal
 */
type ZrcConstant = ZrCompilerConstant;

export type ZrEncodedInstruction = readonly [op: number, a: number, b: number, c: number];

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

			return this.constants.push(value) - 1;
		} else {
			const existing = this.constants.findIndex(f => value.type === f.type && value.value === f.value);
			if (existing !== -1) {
				return existing;
			}

			return this.constants.push(value) - 1;
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

	public decode(instruction: number): ZrEncodedInstruction {
		return [
			bit32.extract(instruction, 0, 8),
			bit32.extract(instruction, 8, 8),
			bit32.extract(instruction, 16, 8),
			bit32.extract(instruction, 24, 8),
		] as const;
	}

	public emit(code: ZrOP): number;
	public emit(code: ZrOP, e: number): number;
	public emit(code: ZrOP, a: number, d: number): number;
	public emit(code: ZrOP, a: number, b: number, c: number): number;
	public emit(code: ZrOP, a: number = 0, b: number = 0, c: number = 0) {
		const chunk = this.currentFunction();
		const bytes = chunk.data;

		const OP_MASK = 0x00_00_00_ff; // used to ensure byte offset (8 bits)
		const A1_MASK = 0x00_00_ff_00; // used to ensure byte offset (8 bits)
		const A2_MASK = 0x00_ff_00_00; // used to ensure byte offset (8 bits)
		const A3_MASK = 0xff_00_00_00; // used to ensure byte offset (8 bits)

		const result = (code & OP_MASK) | ((a << 8) & A1_MASK) | ((b << 16) & A2_MASK) | ((c << 24) & A3_MASK);
		bytes.push(result);
		return result;
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

	private dumpInstruction(instr: number) {
		const [a, b, c, d] = this.decode(instr);
	}

	public dumpConstant(constantIndex: number) {
		const constant = this.constants[constantIndex];
		if (!constant) {
			error("Failed to fetch constant at index " + (constantIndex + 1) + ` - size is ${this.constants.size()}`);
		}

		switch (constant.type) {
			case "boolean":
				return constant.value ? "true" : "false";
			case "string":
				return `'${constant.value}'`;
			case "number":
				return tostring(constant.value);
			case "undefined":
				return "undefined";
		}
	}

	public dumpFunction(functionIdx: number) {
		const func = this.functions[functionIdx];
		const result = new Array<string>();

		print("constants are", inspect(this.constants));

		if (func) {
			// Dump instructions
			const instructions = func.data;
			for (let ip = 0; ip < instructions.size(); ip++) {
				const instruction = instructions[ip];
				const op = ZR_OP(instruction);

				switch (op) {
					case ZrOP.ADD:
						result.push(`ADD ; (from stack)`);
						break;
					case ZrOP.CALLK: {
						const k1 = ZR_A(instruction);
						const b = ZR_B(instruction);
						result.push(`CALLK K${k1} ${b} [${this.dumpConstant(k1)}] - ${b} args`);
						break;
					}
					case ZrOP.LOADK: {
						const k1 = ZR_A(instruction);
						print("+ LOADK", `K${k1}`, k1 < this.constants.size() ? this.dumpConstant(k1) : "???");
						result.push(`LOADK K${k1} [${this.dumpConstant(k1)}]`);
						break;
					}
					case ZrOP.RET: {
						const retCount = ZR_A(instruction);
						result.push(`RET ${retCount}`);
						break;
					}
					case ZrOP.JMPK: {
						const k1 = ZR_A(instruction);
						result.push(`JUMPK K${k1} [${this.dumpConstant(k1)}]`);
						break;
					}
					case ZrOP.JMPIFK: {
						const k1 = ZR_A(instruction);
						result.push(`JUMPIFK K${k1} [${this.dumpConstant(k1)}]`);
						break;
					}
					case ZrOP.CLOSURE: {
						const k1 = ZR_A(instruction);
						result.push(`CLOSURE K${k1} [${this.dumpConstant(k1)}]`);
						break;
					}
					case ZrOP.SETUPVALUE: {
						const k1 = ZR_A(instruction);
						result.push(`SETUPVALUE K${k1} [${this.dumpConstant(k1)}]`);
						break;
					}
					case ZrOP.GETGLOBAL: {
						const k1 = ZR_A(instruction);
						result.push(`GETGLOBAL K${k1} [${this.dumpConstant(k1)}]`);
						break;
					}
					case ZrOP.LOADNONE: {
						result.push("LOADNONE");
						break;
					}
					default:
						throw `Invalid operation code: ${ZrOP[ZR_OP(instruction)] ?? ZR_OP(instruction)}`;
				}

				// ip += arity + 1;
			}

			// dump labels
			for (const [label, offset] of func.labels) {
			}
		}

		return result.join("\n");
	}

	public dumpEverything() {
		const result = new Array<string>();

		for (let i = 0; i < this.functions.size(); i++) {
			const funct = this.functions[i];

			result.push(string.format("Function %d (%s)", i, funct.name));
			this.dumpFunction(i)
				.split("\n")
				.forEach(f => {
					result.push(`\t${f}`);
				});
		}

		result.push("-- global constants --");
		for (let i = 0; i < this.constants.size(); i++) {
			const constant = this.constants[i];
			result.push(`\t${i}\t(${constant.type})\t${this.dumpConstant(i)}`);
		}

		return result.join("\n");
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
			functions: this.functions,
			constants: this.constants,
			entryPoint: this.functions.indexOf(this.mainFunction),
			instructions,
		});
	}
}
