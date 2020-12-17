import ZrObject from "../Data/Object";
import { isArray, isMap } from "../Util";
import ZrLuauFunction from "../Data/LuauFunction";
import { ZrValue } from "../Data/Locals";
const runService = game.GetService("RunService");

const stringify = (value: ZrValue): string => {
	if (isArray(value)) {
		return "[" + (value.map((v) => stringify(v)).join(", ") || " ") + "]";
	} else if (isMap<ZrValue>(value)) {
		const values = new Array<string>();
		for (const [k, v] of value) {
			values.push(`${k}: ${stringify(v)}`);
		}
		return values.join(", ");
	} else if (typeIs(value, "table")) {
		return "[ ]";
	} else {
		return tostring(value);
	}
};

export const ZrPrint = ZrLuauFunction.createDynamic((ctx, ...params) => {
	print(params.map((p) => stringify(p)).join(" "));
});

export const ZrRange = ZrLuauFunction.createDynamic((ctx, start, stop) => {
	if (typeIs(start, "number") && typeIs(stop, "number")) {
		const arr = new Array<number>(stop - start);
		for (let i = 0; i <= stop - start; i++) {
			arr.push(start + i);
		}
		return arr;
	}
});

export const ZrDebug = ZrLuauFunction.createDynamic((ctx) => {
	assert(runService.IsStudio());
	const locals = ctx.getLocals();
	locals.print();
});
