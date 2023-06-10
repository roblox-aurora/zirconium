import { ZrValue } from "./Locals";
import ZrLuauFunction from "./LuauFunction";

export default class ZrRange {
	private rng = new Random();

	public static properties: Record<string, (range: ZrRange) => ZrValue> = {
		random_int: range => {
			return range.GetRandomInteger();
		},
		random: range => range.GetRandomNumber(),
		min: range => range.GetMin(),
		max: range => range.GetMax(),
	};

	private static next = (range: ZrRange) => range.GetRandomInteger();

	public constructor(private range: NumberRange) {}
	public GetValue() {
		return this.range;
	}

	public GetRandomInteger() {
		return this.rng.NextInteger(this.range.Min, this.range.Max);
	}
	public GetRandomNumber() {
		return this.rng.NextNumber(this.range.Min, this.range.Max);
	}
	public *Iterator() {
		for (let i = this.range.Min; i <= this.range.Max; i++) {
			yield i;
		}
	}

	public GetMin() {
		return this.range.Min;
	}

	public GetMax() {
		return this.range.Max;
	}

	public toString() {
		return `${this.range.Min} .. ${this.range.Max}`;
	}
}
