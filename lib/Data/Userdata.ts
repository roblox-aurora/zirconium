import { $print } from "rbxts-transform-debug";
import { ZrValue } from "./Locals";
import ZrObject from "./Object";
import ZrUndefined from "./Undefined";

export interface ZrUserdataProperty<
	T extends ZrUserdata<defined>,
	TGet extends ZrValue = ZrValue,
	TSet extends ZrValue = ZrValue,
> {
	get?: ((userdata: T) => TGet) | undefined;
	set?: ((userdata: T, value: TSet | undefined) => void) | undefined;
}

export abstract class ZrUserdata<T extends defined> {
	public abstract toValue(): T;

	public static is<T extends keyof CreatableInstances>(
		userdata: ZrUserdata<any>,
		rbxClassName: T,
	): userdata is ZrInstanceUserdata<CreatableInstances[T]>;
	public static is<T extends defined>(
		userdata: ZrUserdata<any>,
		classObject: abstract new () => T,
	): userdata is ZrObjectUserdata<T>;
	public static is<T extends defined>(
		userdata: ZrUserdata<any>,
		klass: (abstract new () => T) | keyof CreatableInstances,
	): userdata is ZrUserdata<T> {
		if (typeIs(klass, "string")) {
			const value = userdata.toValue();
			return typeIs(value, "Instance") && value.IsA(klass);
		} else {
			return userdata.toValue() instanceof klass;
		}
	}

	public static fromInstance<TInstance extends Instance>(instance: TInstance) {
		return new ZrInstanceUserdata(instance);
	}

	public static fromLazyInstance<TInstance extends Instance>(lazyFn: () => TInstance) {
		return new ZrInstanceUserdata(lazyFn);
	}

	public static fromRecord<T extends Record<string, ZrValue>>(record: T) {
		return new ZrObjectUserdata(record);
	}

	public static fromObject<TObject extends defined>(object: TObject) {
		return new ZrObjectUserdata(object);
	}

	public equals?(other: ZrUserdata<defined>): boolean;
	public get?(index: string): ZrValue | ZrUndefined;
	public set?(index: string, value: ZrValue | undefined): void;

	/** @internal */
	public iter?(): Generator<ZrValue, void, unknown>;

	public abstract properties?: { [P in string | number]: ZrUserdataProperty<any> | undefined };

	public toString() {
		return "userdata";
	}
}

type PickZrValues<T> = { [P in keyof T]: T[P] extends ZrValue ? P : never }[keyof T];
export type InferUserdataKeys<T> = T extends ZrInstanceUserdata<infer A> ? PickZrValues<A> : never;

export class ZrObjectUserdata<T extends defined> extends ZrUserdata<T> {
	public get(index: string) {
		return this.object[index as never] ?? ZrUndefined;
	}

	public set(index: string, value: ZrValue | undefined) {
		this.object[index as never] = value as never;
	}

	public equals(other: ZrUserdata<defined>): boolean {
		return other.toValue() === this.toValue();
	}

	/**
	 * @internal
	 */
	public *iter(): Generator<[string, ZrValue], void, unknown> {
		for (const [k, v] of pairs(this.object)) {
			yield [k as string, typeIs(v, "table") ? new ZrObjectUserdata(v) : (v as ZrValue)];
		}
	}

	// public iter = undefined;
	public properties = {};

	public constructor(private object: T) {
		super();
	}

	public isInstance() {
		return false;
	}

	public toString() {
		return "toString" in this.object ? tostring(this.object) : "[ZrObjectUserdata]";
	}

	public toValue() {
		return this.object;
	}
}

export class ZrInstanceUserdata<T extends Instance = Instance> extends ZrUserdata<T> {
	public set = undefined;
	public get = undefined;

	public equals(other: ZrUserdata<defined>): boolean {
		return this.toValue() === other.toValue();
	}

	/**
	 * @internal
	 */
	public *iter(): Generator<ZrInstanceUserdata, void, unknown> {
		for (const child of this.toValue().GetChildren()) {
			yield new ZrInstanceUserdata(child);
		}
	}

	public properties = {
		name: {
			get: () => this.toValue().Name,
			// set: (value: ZrValue | undefined) => {
			// 	this.toValue().Name = tostring(value ?? "undefined");
			// },
		},
		full_name: {
			get: () => this.toValue().GetFullName(),
		},
		children: {
			get: () =>
				this.toValue()
					.GetChildren()
					.map(child => new ZrInstanceUserdata(child)),
		},
		descendants: {
			get: () =>
				this.toValue()
					.GetDescendants()
					.map(child => new ZrInstanceUserdata(child)),
		},
		class_name: {
			get: () => this.toValue().ClassName,
		},
	};

	public constructor(private instance: T | (() => T)) {
		super();
	}

	public isInstance() {
		return true;
	}

	public toValue() {
		if (typeIs(this.instance, "function")) {
			this.instance = this.instance();
			$print("lazyGet", this.instance);
		}

		return this.instance;
	}

	public override toString() {
		return tostring(this.toValue());
	}
}
