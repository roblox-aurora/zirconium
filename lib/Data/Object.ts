import { ZrValue } from "./Locals";

/**
 * A zirconium object
 */
export default class ZrObject {
	private map = new Map<string, ZrValue>();
	public set(name: string, value: ZrValue) {
		this.map.set(name, value);
	}
	public get(name: string) {
		return this.map.get(name);
	}

	public toString() {
		const str = new Array<string>();
		for (const [key, value] of this.map) {
			str.push(`${key}: ${value}`);
		}
		return `{${str.join(", ") || " "}}`;
	}

	public toMap() {
		return this.map as ReadonlyMap<string, ZrValue>;
	}
}
