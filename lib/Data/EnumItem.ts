import { ZrEnum } from "./Enum";
import { ZrValue } from "./Locals";
import { ZrUserdata, ZrUserdataProperty } from "./Userdata";

/**
 * The built-in Zirconium enum item type
 */
export class ZrEnumItem extends ZrUserdata<number> {
	public constructor(private parentEnum: ZrEnum, private value: number, private name: string) {
		super();
	}

	public properties = {
		get_enum: {
			get: () => this.parentEnum,
		},
	};

	public toValue(): number {
		return this.value;
	}

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
