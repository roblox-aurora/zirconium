import { $print } from "rbxts-transform-debug";
import { ZrValue } from "./Locals";
import ZrLuauFunction from "./LuauFunction";
import ZrObject from "./Object";
import ZrUndefined from "./Undefined";

export interface UserdataProperty<T extends defined> {
	get?: (userdata: T) => ZrValue;
	set?: (userdata: T, value: ZrValue) => void;
}

export interface UserdataProperties<T extends defined> {
	[name: string]: UserdataProperty<T>;
}

export type UserdataMethod<T extends defined> = (userdata: T, ...args: ZrValue[]) => ZrValue;
export interface UserdataMethods<T extends defined> {
	[name: string]: UserdataMethod<T>;
}

export interface ZrUserdataPrototype<T extends defined> {
	readonly properties: UserdataProperties<T>;
	readonly methods: UserdataMethods<T>;
}

export abstract class ZrUserdata<T extends defined> {
	public constructor(public readonly proto: ZrUserdataPrototype<T>, public readonly className: string) {
		// set methods pls.
		for (const [methodName, method] of pairs(proto.methods)) {
			proto.properties[methodName] = {
				get: userdata => new ZrLuauFunction((_, ...args) => method(userdata, ...args)),
			};
		}
	}

	public abstract unwrap(): T;

	public equals?(other: ZrUserdata<defined>): boolean;
	public get?(index: string): ZrValue;
	public set?(index: string, value: ZrValue | undefined): void;

	/** @internal */
	public iter?(): Generator<ZrValue, void, unknown>;

	public toString() {
		return `<userdata ${this.className}>`;
	}
}

export class ZrObjectUserdata<T extends object> extends ZrUserdata<T> {
	public get(index: string): ZrValue {
		return this.object[index as never] ?? ZrUndefined;
	}

	public set(index: string, value: ZrValue | undefined) {
		this.object[index as never] = value as never;
	}

	public equals(other: ZrUserdata<defined>): boolean {
		return other.unwrap() === this.unwrap();
	}

	public constructor(private object: T) {
		super(
			{
				properties: {},
				methods: {},
			},
			"ObjectUserdata",
		);
	}

	public toString() {
		return "toString" in this.object ? tostring(this.object) : "[ZrObjectUserdata]";
	}

	public unwrap() {
		return this.object;
	}
}
