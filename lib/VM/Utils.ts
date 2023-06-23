export function ZR_OP(ins: number) {
	return ins & 0xff;
}

/**
 * ABC encoding - three 8 bit values
 */
export function ZR_A(ins: number) {
	return (ins >> 8) & 0xff;
}

/**
 * ABC encoding - three 8 bit values
 */
export function ZR_B(ins: number) {
	return (ins >> 16) & 0xff;
}

/**
 * ABC encoding - three 8 bit values
 */
export function ZR_C(ins: number) {
	return (ins >> 24) & 0xff;
}

/**
 * AD encoding - one 8 bit, one signed 16 bit number
 */
export function ZR_D(ins: number) {
	return ins >> 16;
}

/**
 * E encoding - one signed 24-bit value
 */
export function ZR_E(ins: number) {
	return ins >> 8;
}
