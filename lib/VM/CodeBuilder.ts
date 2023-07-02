import { isOfVariant } from "@rbxts/variant";
import { ZrBytecodeTable, ZrCompilerConstant } from "./Compiler";
import { ZrEncoding, ZrInstruction, ZrOP } from "./Instructions";
import { Operand } from "./Operand";
import { ArrayReader } from "./Ptr";
import { bit, i8, u8, utoi8, ZR_A, ZR_EMIT_ABC, ZR_B, ZR_C, ZR_OP } from "./Utils";
import inspect from "@rbxts/inspect";

const MAIN = "__main__";

/**
 * @internal
 */
type ZrcConstant = ZrCompilerConstant;

export type ZrEncodedInstruction = readonly [op: u8, a: u8, b: u8, c: u8];

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

	readonly constants: ZrcConstant[];

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
			constants: [],
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
			constants: [],
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

	private addConstant(constant: ZrcConstant): u8 {
		const constants = this.currentFunction().constants;

		if (constant.type === "undefined") {
			const existing = constants.findIndex(f => f.type === "undefined");
			if (existing !== -1) {
				return existing as u8;
			}

			return (constants.push(constant) - 1) as u8;
		} else {
			const existing = constants.findIndex(f => constant.type === f.type && constant.value === f.value);
			if (existing !== -1) {
				return existing as u8;
			}

			return (constants.push(constant) - 1) as u8;
		}
	}

	public addConstantString(value: string): u8 {
		return this.addConstant({
			type: "string",
			value,
		});
	}

	public addConstantNumber(value: number): u8 {
		return this.addConstant({
			type: "number",
			value,
		});
	}

	public addConstantBoolean(value: boolean): u8 {
		return this.addConstant({
			type: "boolean",
			value,
		});
	}

	private registerIdx = 0;
	public pushRegister(): number {
		if (this.registerIdx >= 4) {
			return this.registerIdx;
		}

		return this.registerIdx++;
	}

	public popRegister(): number {
		if (this.registerIdx === 0) {
			return this.registerIdx;
		}

		return this.registerIdx--;
	}

	public addConstantUndefined(): number {
		return this.addConstant({
			type: "undefined",
		});
	}

	public decode(instruction: number): ZrEncodedInstruction {
		return [
			bit32.extract(instruction, 0, 8) as u8,
			bit32.extract(instruction, 8, 8) as u8,
			bit32.extract(instruction, 16, 8) as u8,
			bit32.extract(instruction, 24, 8) as u8,
		] as const;
	}

	public offset() {
		return this.currentFunction().data.size() - 1;
	}

	public emitABC(code: ZrOP.ADD): number;
	public emitABC(code: ZrOP.SUB): number;
	public emitABC(code: ZrOP.MUL): number;
	public emitABC(code: ZrOP.DIV): number;
	public emitABC(code: ZrOP.TEST, cond: bit, value: i8): number;
	public emitABC(code: ZrOP.PUSHK, k: u8): number;
	public emitABC(code: ZrOP.EQ, cond: bit, lhs: i8, rhs: i8): number;
	public emitABC(code: ZrOP.GETPROPERTY, kId: u8): number;
	public emitABC(code: ZrOP.GETINDEX, kId: u8): number;
	public emitABC(code: ZrOP.GETGLOBAL, kId: u8): number;
	public emitABC(code: ZrOP.NEWOBJECT, kSize: u8): number;
	public emitABC(code: ZrOP.NEWARRAY, kSize: u8): number;
	public emitABC(code: ZrOP.CALLK, kName: u8, nargs: u8): number;
	public emitABC(code: ZrOP.SETUPVALUE, kName: u8): number;
	public emitABC(code: ZrOP.RET, count: u8): number;
	public emitABC(code: ZrOP.JMP, count: u8): number;
	public emitABC(code: ZrOP.CLOSURE, kLabel: u8): number;
	public emitABC(code: ZrOP.SETGLOBAL, kLabel: u8): number;

	public emitABC(code: ZrOP, a: number = 0, b: number = 0, c: number = 0) {
		const chunk = this.currentFunction();
		const bytes = chunk.data;

		const result = ZR_EMIT_ABC(code, a, b, c);
		bytes.push(result);
		return result;
	}

	public emitAD(code: ZrOP, a: u8, d: number) {
		const chunk = this.currentFunction();
		const bytes = chunk.data;

		const result = code | (a << 8) | (d << 16);
		bytes.push(result);
		return result;
	}

	public emitE(code: ZrOP, e: number) {
		const chunk = this.currentFunction();
		const bytes = chunk.data;

		const result = code | (e << 8);
		bytes.push(result);
		return result;
	}

	public emitAux(code: ZrOP.LOADNONE): number;
	public emitAux(code: ZrOP) {
		const chunk = this.currentFunction();
		const bytes = chunk.data;
		bytes.push(code);
		return code;
	}

	public withJump(fn: () => void): number {
		const startPtr = this.currentFunction().data.size();
		fn();
		const endPtr = this.currentFunction().data.size();
		this.currentFunction().data.insert(startPtr, ZR_EMIT_ABC(ZrOP.JMP, endPtr - startPtr, 0, 0));
		return endPtr;
	}

	public emitRaw(idx: number, value: number) {
		this.currentFunction().data.insert(idx, value);
	}

	public jump(pc: number) {
		this.currentFunction().data.push(ZR_EMIT_ABC(ZrOP.JMP, pc, 0, 0));
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

	public dumpFunctionConstant(constantIndex: number, func: ZrcFunction) {
		const constant = func.constants[constantIndex];
		if (!constant) {
			error("Failed to fetch constant at index " + (constantIndex + 1) + ` - size is ${func.constants.size()}`);
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

		if (func) {
			// Dump instructions
			const instructions = func.data;
			for (let ip = 0; ip < instructions.size(); ip++) {
				const instruction = instructions[ip];
				const op = ZR_OP(instruction);

				switch (op) {
					case ZrOP.ADD:
						result.push(`${ZrOP[op]}`);
						break;
					case ZrOP.CALLK: {
						const k1 = ZR_A(instruction);
						const b = ZR_B(instruction);
						result.push(`${ZrOP[op]} K${k1} ${b} [${this.dumpFunctionConstant(k1, func)}] - ${b} args`);
						break;
					}
					case ZrOP.PUSHK: {
						const k1 = ZR_A(instruction);
						result.push(`${ZrOP[op]} K${k1} [${this.dumpFunctionConstant(k1, func)}]`);
						break;
					}
					case ZrOP.RET: {
						const retCount = ZR_A(instruction);
						result.push(`${ZrOP[op]} ${retCount}`);
						break;
					}
					case ZrOP.JMP: {
						const pc = ZR_A(instruction);
						result.push(
							`${ZrOP[op]} ${pc} [move ${pc >= 0 ? "forward" : "backward"} ${math.abs(pc)} instructions]`,
						);
						break;
					}
					case ZrOP.CLOSURE: {
						const k1 = ZR_A(instruction);
						result.push(`${ZrOP[op]} K${k1} [${this.dumpFunctionConstant(k1, func)}]`);
						break;
					}
					case ZrOP.SETUPVALUE: {
						const k1 = ZR_A(instruction);
						result.push(`${ZrOP[op]} K${k1} [${this.dumpFunctionConstant(k1, func)}]`);
						break;
					}
					case ZrOP.GETGLOBAL: {
						const k1 = ZR_A(instruction);
						result.push(`${ZrOP[op]} K${k1} [${this.dumpFunctionConstant(k1, func)}]`);
						break;
					}
					case ZrOP.SETGLOBAL: {
						const k1 = ZR_A(instruction);
						result.push(`${ZrOP[op]} K${k1} [${this.dumpFunctionConstant(k1, func)}]`);
						break;
					}
					case ZrOP.EQ: {
						const truthiness = ZR_A(instruction);
						const lhs = utoi8(ZR_B(instruction));
						const rhs = utoi8(ZR_C(instruction));
						result.push(
							`${ZrOP[op]} ${truthiness} ${lhs} ${rhs} [SKIP NEXT UNLESS (${
								lhs < 0 ? `[StkTop - ${-lhs}]` : `R(${lhs})`
							} == ${rhs < 0 ? `[StkTop - ${-rhs}]` : `R(${rhs})`}) is ${
								truthiness === 1 ? "true" : "false"
							}]`,
						);
						break;
					}
					case ZrOP.TEST: {
						const truthiness = ZR_A(instruction);
						const lhs = utoi8(ZR_B(instruction));
						result.push(
							`${ZrOP[op]} ${truthiness} ${lhs} [SKIP NEXT UNLESS (${
								lhs < 0 ? `[StkTop - ${-lhs}]` : `R(${lhs})`
							} is ${truthiness === 1 ? "true" : "false"}]`,
						);
						break;
					}
					case ZrOP.LOADNONE: {
						result.push(`${ZrOP[op]}`);
						break;
					}
					default:
						throw `Invalid operation code: ${ZrOP[ZR_OP(instruction)] ?? ZR_OP(instruction)}`;
				}
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

			result.push(`\tconstants (${funct.constants.size()})`);
			for (let i = 0; i < funct.constants.size(); i++) {
				const constant = funct.constants[i];
				result.push(`\t\t${i}\t(${constant.type})\t${this.dumpFunctionConstant(i, funct)}`);
			}
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
