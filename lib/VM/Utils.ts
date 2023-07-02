import { ZrOP } from "./Instructions";

export type bit = 0 | 1;

export type i8 =
	| -128
	| -127
	| -126
	| -125
	| -124
	| -123
	| -122
	| -121
	| -120
	| -119
	| -118
	| -117
	| -116
	| -115
	| -114
	| -113
	| -112
	| -111
	| -110
	| -109
	| -108
	| -107
	| -106
	| -105
	| -104
	| -103
	| -102
	| -101
	| -100
	| -99
	| -98
	| -97
	| -96
	| -95
	| -94
	| -93
	| -92
	| -91
	| -90
	| -89
	| -88
	| -87
	| -86
	| -85
	| -84
	| -83
	| -82
	| -81
	| -80
	| -79
	| -78
	| -77
	| -76
	| -75
	| -74
	| -73
	| -72
	| -71
	| -70
	| -69
	| -68
	| -67
	| -66
	| -65
	| -64
	| -63
	| -62
	| -61
	| -60
	| -59
	| -58
	| -57
	| -56
	| -55
	| -54
	| -53
	| -52
	| -51
	| -50
	| -49
	| -48
	| -47
	| -46
	| -45
	| -44
	| -43
	| -42
	| -41
	| -40
	| -39
	| -38
	| -37
	| -36
	| -35
	| -34
	| -33
	| -32
	| -31
	| -30
	| -29
	| -28
	| -27
	| -26
	| -25
	| -24
	| -23
	| -22
	| -21
	| -20
	| -19
	| -18
	| -17
	| -16
	| -15
	| -14
	| -13
	| -12
	| -11
	| -10
	| -9
	| -8
	| -7
	| -6
	| -5
	| -4
	| -3
	| -2
	| -1
	| 0
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15
	| 16
	| 17
	| 18
	| 19
	| 20
	| 21
	| 22
	| 23
	| 24
	| 25
	| 26
	| 27
	| 28
	| 29
	| 30
	| 31
	| 32
	| 33
	| 34
	| 35
	| 36
	| 37
	| 38
	| 39
	| 40
	| 41
	| 42
	| 43
	| 44
	| 45
	| 46
	| 47
	| 48
	| 49
	| 50
	| 51
	| 52
	| 53
	| 54
	| 55
	| 56
	| 57
	| 58
	| 59
	| 60
	| 61
	| 62
	| 63
	| 64
	| 65
	| 66
	| 67
	| 68
	| 69
	| 70
	| 71
	| 72
	| 73
	| 74
	| 75
	| 76
	| 77
	| 78
	| 79
	| 80
	| 81
	| 82
	| 83
	| 84
	| 85
	| 86
	| 87
	| 88
	| 89
	| 90
	| 91
	| 92
	| 93
	| 94
	| 95
	| 96
	| 97
	| 98
	| 99
	| 100
	| 101
	| 102
	| 103
	| 104
	| 105
	| 106
	| 107
	| 108
	| 109
	| 110
	| 111
	| 112
	| 113
	| 114
	| 115
	| 116
	| 117
	| 118
	| 119
	| 120
	| 121
	| 122
	| 123
	| 124
	| 125
	| 126
	| 127;

/**
 * Unsigned byte (8 bits)
 */
export type u8 =
	| 0
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15
	| 16
	| 17
	| 18
	| 19
	| 20
	| 21
	| 22
	| 23
	| 24
	| 25
	| 26
	| 27
	| 28
	| 29
	| 30
	| 31
	| 32
	| 33
	| 34
	| 35
	| 36
	| 37
	| 38
	| 39
	| 40
	| 41
	| 42
	| 43
	| 44
	| 45
	| 46
	| 47
	| 48
	| 49
	| 50
	| 51
	| 52
	| 53
	| 54
	| 55
	| 56
	| 57
	| 58
	| 59
	| 60
	| 61
	| 62
	| 63
	| 64
	| 65
	| 66
	| 67
	| 68
	| 69
	| 70
	| 71
	| 72
	| 73
	| 74
	| 75
	| 76
	| 77
	| 78
	| 79
	| 80
	| 81
	| 82
	| 83
	| 84
	| 85
	| 86
	| 87
	| 88
	| 89
	| 90
	| 91
	| 92
	| 93
	| 94
	| 95
	| 96
	| 97
	| 98
	| 99
	| 100
	| 101
	| 102
	| 103
	| 104
	| 105
	| 106
	| 107
	| 108
	| 109
	| 110
	| 111
	| 112
	| 113
	| 114
	| 115
	| 116
	| 117
	| 118
	| 119
	| 120
	| 121
	| 122
	| 123
	| 124
	| 125
	| 126
	| 127
	| 128
	| 129
	| 130
	| 131
	| 132
	| 133
	| 134
	| 135
	| 136
	| 137
	| 138
	| 139
	| 140
	| 141
	| 142
	| 143
	| 144
	| 145
	| 146
	| 147
	| 148
	| 149
	| 150
	| 151
	| 152
	| 153
	| 154
	| 155
	| 156
	| 157
	| 158
	| 159
	| 160
	| 161
	| 162
	| 163
	| 164
	| 165
	| 166
	| 167
	| 168
	| 169
	| 170
	| 171
	| 172
	| 173
	| 174
	| 175
	| 176
	| 177
	| 178
	| 179
	| 180
	| 181
	| 182
	| 183
	| 184
	| 185
	| 186
	| 187
	| 188
	| 189
	| 190
	| 191
	| 192
	| 193
	| 194
	| 195
	| 196
	| 197
	| 198
	| 199
	| 200
	| 201
	| 202
	| 203
	| 204
	| 205
	| 206
	| 207
	| 208
	| 209
	| 210
	| 211
	| 212
	| 213
	| 214
	| 215
	| 216
	| 217
	| 218
	| 219
	| 220
	| 221
	| 222
	| 223
	| 224
	| 225
	| 226
	| 227
	| 228
	| 229
	| 230
	| 231
	| 232
	| 233
	| 234
	| 235
	| 236
	| 237
	| 238
	| 239
	| 240
	| 241
	| 242
	| 243
	| 244
	| 245
	| 246
	| 247
	| 248
	| 249
	| 250
	| 251
	| 252
	| 253
	| 254
	| 255;

const SIGNED_BYTE_MAX = 0x7f;
const UNSIGNED_BYTE_MAX = 0xff;

export function u8(value: number): u8 {
	return math.clamp(value, 0, 255) as u8;
}

export function i8(value: number): i8 {
	return math.clamp(value, -128, 127) as i8;
}

export function ZR_OP(ins: number) {
	return (ins & 0xff) as u8;
}

export function utoi8(value: u8): i8 {
	if (value > SIGNED_BYTE_MAX) {
		// 127
		return (value - (UNSIGNED_BYTE_MAX + 1)) as i8; // -256 to get negative
	} else {
		return value as i8;
	}
}

export function ZR_EMIT_ABC(code: number, a: number, b: number, c: number) {
	const OP_MASK = 0x00_00_00_ff; // used to ensure byte offset (8 bits)
	const A1_MASK = 0x00_00_ff_00; // used to ensure byte offset (8 bits)
	const A2_MASK = 0x00_ff_00_00; // used to ensure byte offset (8 bits)
	const A3_MASK = 0xff_00_00_00; // used to ensure byte offset (8 bits)

	const result = (code & OP_MASK) | ((a << 8) & A1_MASK) | ((b << 16) & A2_MASK) | ((c << 24) & A3_MASK);
	return result;
}

/**
 * ABC encoding - three 8 bit values
 */
export function ZR_A(ins: number) {
	return ((ins >> 8) & 0xff) as u8;
}

/**
 * ABC encoding - three 8 bit values
 */
export function ZR_B(ins: number) {
	return ((ins >> 16) & 0xff) as u8;
}

/**
 * ABC encoding - three 8 bit values
 */
export function ZR_C(ins: number) {
	return ((ins >> 24) & 0xff) as u8;
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
