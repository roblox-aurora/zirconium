import { ZrValue } from "./Locals";
import ZrUndefined from "./Undefined";

export function ZrIsUndefined(value: ZrValue | ZrUndefined): value is ZrUndefined {
	return value === ZrUndefined;
}
