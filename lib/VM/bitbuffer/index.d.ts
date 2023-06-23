declare namespace BitBuffer {
	interface BufferBase {
		getPointer(this: void): number;
		setPointer(this: void, ptr: number): void;
		setPointerFromEnd(this: void, ptr: number): void;

		getPointerByte(this: void): number;
		setPointerByte(this: void, ptrByte: number): void;
		setPointerByteFromEnd(this: void): void;

		getLength(this: void): number;
		getByteLength(this: void): number;
	}

	interface ExportBuffer {
		crc32(): number;
		dumpString(this: void): string;
		dumpBinary(this: void): string;
		dumpBase64(this: void): string;
		dumpHex(this: void): string;
	}

	interface ReadBuffer extends BufferBase {
		readBits(this: void, n: number): number[];

		// same as readUint8
		readByte(this: void): number;

		readUInt8(this: void): number;
		readUInt16(this: void): number;
		readUInt32(this: void): number;

		readInt8(this: void): number;
		readInt16(this: void): number;
		readInt32(this: void): number;

		readFloat16(this: void): number;
		readFloat32(this: void): number;
		readFloat64(this: void): number;

		readString(this: void): string;
		readTerminatedString(this: void): string;
		readSetLengthString(this: void, length: number): string;

		readField(this: void, length: number): boolean[];

		isFinished(this: void): boolean;
	}

	interface WriteBuffer extends BufferBase {
		writeByte(this: void, byte: number): void;
		writeBits(this: void, ...bits: number[]): void;

		writeUInt8(this: void, u8: number): void;
		writeUInt16(this: void, u16: number): void;
		writeUInt32(this: void, u32: number): void;

		writeInt8(this: void, i8: number): void;
		writeInt16(this: void, i16: number): void;
		writeInt32(this: void, i32: number): void;

		writeFloat16(this: void, f16: number): void;
		writeFloat32(this: void, f32: number): void;
		writeFloat64(this: void, f32: number): void;

		writeBase64(this: void, base64: string): void;

		writeString(this: void, str: string): void;
		writeTerminatedString(this: void, str: string): void;
		writeSetLengthString(this: void, str: string): void;

		writeField(this: void, ...args: boolean[]): void;
	}

	interface Buffer extends WriteBuffer, ReadBuffer, ExportBuffer {}
}

interface BitBuffer {
	(): BitBuffer.Buffer;
	(source: string): BitBuffer.Buffer;
}
declare const BitBuffer: BitBuffer;
export = BitBuffer;
