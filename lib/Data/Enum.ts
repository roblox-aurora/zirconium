import { ZrEnumItem } from "./EnumItem";
import { ZrValue } from "./Locals";
import ZrUndefined from "./Undefined";
import { ZrUserdata } from "./Userdata";

/**
 * The built-in Enum type in Zirconium
 */
export class ZrEnum extends ZrUserdata<Array<ZrEnumItem>> {
	protected constructor(private name = "[ZrEnum]", private items: Array<ZrEnumItem>) {
		super(
			{
				properties: {},
				methods: {},
			},
			"ZrEnum",
		);

		// for (const item of items) {
		// 	this.proto.properties[item.getName()] = {
		// 		get: () => item,
		// 	};
		// }
	}

	public unwrap(): ZrEnumItem[] {
		return this.items;
	}

	public get(index: string): ZrValue | ZrUndefined {
		return this.items.find(f => f.getName() === index) ?? ZrUndefined;
	}

	/**
	 * Creates an enum from an array of strings - where the strings will be the values of the enum
	 * @param name The name of the enum
	 * @param items The items in this enum
	 * @returns The enum
	 */
	public static fromArray(name: string, items: string[]) {
		// return new ZrEnum(items, name);
		return new ZrEnum(name, []); // TODO: Fix
	}

	public getEnumName() {
		return this.name;
	}

	public getItemByName(name: string) {
		return this.items.find(f => f.getName() === name);
	}

	/**
	 * @internal
	 */
	public getItemByIndex(idx: number) {
		return this.items.find(f => f.getValue() === idx);
	}

	public getItems() {
		return this.items as readonly ZrEnumItem[];
	}

	public toString() {
		return `enum@${this.name}`;
	}
}
