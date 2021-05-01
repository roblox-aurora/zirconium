declare interface ZrNull {
	readonly __nil: unique symbol;
}
interface Symbols {
	readonly named: (name: string) => symbol;
	readonly ZrNull: {
		readonly __nil: unique symbol;
	};
}
declare const Symbols: Symbols;
export = Symbols;
