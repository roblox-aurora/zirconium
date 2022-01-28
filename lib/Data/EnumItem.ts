import { ZrEnum } from "./Enum";

/**
 * The built-in Zirconium enum item type
 */
export class ZrEnumItem {
	public constructor(private parentEnum: ZrEnum, private value: number, private name: string) {}

	public getEnum() {
		return this.parentEnum;
	}

	public getValue() {
		return this.value;
	}

	public getName() {
		return this.name;
	}

	public toString() {
		return `enum@${this.parentEnum.getEnumName()}.${this.getName()}`;
	}
}
