import { ZrEnumItem } from "./EnumItem";

/**
 * The built-in Enum type in Zirconium
 */
export class ZrEnum {
	private items = new Array<ZrEnumItem>();

	/**
	 * @param items The item labels
	 * @param name The name of this enum
	 * @param enumFactory A custom enum item factory
	 */
	protected constructor(
		items: readonly string[],
		private name = "[ZrEnum]",
		/**
		 * Mainly for Zircon to override with a child enum type -
		 */
		enumFactory: (value: string, index: number) => ZrEnumItem = (value, index) =>
			new ZrEnumItem(this, index, value),
	) {
		this.items = items.map(enumFactory);
	}

	/**
	 * Creates an enum from an array of strings - where the strings will be the values of the enum
	 * @param name The name of the enum
	 * @param items The items in this enum
	 * @returns The enum
	 */
	public static fromArray(name: string, items: string[]) {
		return new ZrEnum(items, name);
	}

	public getEnumName() {
		return this.name;
	}

	public getItemByName(name: string) {
		return this.items.find((f) => f.getName() === name);
	}

	public getItemByIndex(idx: number) {
		return this.items.find((f) => f.getValue() === idx);
	}

	public getItems() {
		return this.items as readonly ZrEnumItem[];
	}

	public toString() {
		return `enum@${this.name}`;
	}
}
