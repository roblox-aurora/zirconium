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

export class ZrEnum {
	private items = new Array<ZrEnumItem>();
	public constructor(items: readonly string[], private name = "[ZrEnum]") {
		this.items = items.map((item, i) => new ZrEnumItem(this, i, item));
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
