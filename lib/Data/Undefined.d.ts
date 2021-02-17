// interface ZrUndefined {
// 	readonly __nominal_Undefined: unique symbol;
// }
/**
 * The Zirconium runtime equivalent of "nil" in Luau, and "undefined" in TypeScript.
 */
declare const ZrUndefined: unique symbol;
declare type ZrUndefined = typeof ZrUndefined;
export = ZrUndefined;
