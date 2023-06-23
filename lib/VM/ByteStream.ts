import BitBuffer from "./bitbuffer";
import { ZrBytecodeTable, ZrCompilerConstant } from "./Compiler";

enum Header {
	VERSION_HEADER = 0x0,
	INSTRUCTION_ARRAY = 0x1,
	CONSTANTS = 0x2,
	FUNCTION_HEADER = 0x3,
}

enum ConstantType {
	STRING,
	NUMBER,
	BOOLEAN,
	UNDEFINED,
}

const HEADER = "Zrc";
const VERSION = [2, 0, 0] as const;

export class ZrBytecodeWriteStream {
	private buffer: BitBuffer.WriteBuffer & BitBuffer.ExportBuffer = BitBuffer();

	public writeHeader() {
		// Zrc
		this.buffer.writeTerminatedString(HEADER);
		// VERSION_HEADER
		this.buffer.writeUInt8(Header.VERSION_HEADER);
		// MAJOR
		this.buffer.writeUInt8(VERSION[0]);
		// MINOR
		this.buffer.writeUInt8(VERSION[1]);
		// REVISION
		this.buffer.writeUInt8(VERSION[2]);
	}

	public writeInstructionBytes(data: number[]) {
		// INSTRUCTION_ARRAY, SIZE
		this.buffer.writeByte(Header.INSTRUCTION_ARRAY);
		this.buffer.writeUInt32(data.size());

		// [...BYTES] (sizeof SIZE)
		for (const n of data) {
			this.buffer.writeByte(n);
		}
	}

	public writeConstants(constants: ZrCompilerConstant[]) {
		// CONSTANTS, SIZE
		this.buffer.writeByte(Header.CONSTANTS);
		this.buffer.writeUInt32(constants.size());

		// [ [TYPE, VALUE], [TYPE, VALUE], ... ] (sizeof SIZE)
		for (const constant of constants) {
			if (constant.type === "number") {
				this.buffer.writeByte(ConstantType.NUMBER);
				this.buffer.writeInt32(constant.value);
			} else if (constant.type === "string") {
				this.buffer.writeByte(ConstantType.STRING);
				this.buffer.writeString(constant.value);
			} else if (constant.type === "boolean") {
				this.buffer.writeByte(ConstantType.BOOLEAN);
				this.buffer.writeField(constant.value);
			} else if (constant.type === "undefined") {
				this.buffer.writeByte(ConstantType.UNDEFINED);
			}
		}
	}

	/**
	 * Writes the bytecode table - should look something like
	 * ```
	 * 'Zrc' // compiler id
	 * [VERSION_HEADER]
	 * [INSTRUCTIONS...]
	 * [CONSTANTS...]
	 * ```
	 * @param bytecodeTable
	 */
	public writeBytecodeTable(bytecodeTable: ZrBytecodeTable) {
		this.writeHeader();
		this.writeInstructionBytes(bytecodeTable.instructions);
		this.writeConstants(bytecodeTable.constants);
	}

	public toHex() {
		return this.buffer.dumpHex();
	}

	public toString() {
		return this.buffer.dumpString();
	}
}

export class ZrBytecodeReadStream {
	private ptr = 0;
	public constructor(private stream: readonly number[]) {}
}
