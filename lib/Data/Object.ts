import { ZrIsUndefined } from "./Helpers";
import { ZrValue } from "./Locals";
import ZrUndefined from "./Undefined";

/**
 * A zirconium object
 */
export default class ZrObject {
	private map = new Map<string, ZrValue>();
	public set(name: string, value: ZrValue | ZrUndefined) {
		if (ZrIsUndefined(value)) {
			this.map.delete(name);
		} else {
			this.map.set(name, value);
		}
	}

	public get(name: string) {
		return this.map.get(name) ?? ZrUndefined;
	}

	public toString() {
		const str = new Array<string>();
		for (const [key, value] of this.map) {
			str.push(`${key}: ${value}`);
		}
		return `{${str.join(", ") || " "}}`;
	}

	public toMap() {
		return this.map as ReadonlyMap<string, Exclude<ZrValue, ZrUndefined>>;
	}
}
