import { ZrEnum } from "./Enum";
import { ZrValue } from "./Locals";
import { ZrUserdata } from "./Userdata";

/**
 * The built-in Zirconium enum item type
 */
export class ZrEnumItem extends ZrUserdata<number> {
	public constructor(private parentEnum: ZrEnum, private value: number, private name: string) {
		super(
			{
				properties: {},
				methods: {},
			},
			"ZrEnumItem",
		);
	}

	public properties = {
		get_enum: {
			get: () => this.parentEnum,
		},
	};

	public unwrap(): number {
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
