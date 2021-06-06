export default class ZrRange {
	private rng = new Random();

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
