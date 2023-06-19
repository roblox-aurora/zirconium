import { $print } from "rbxts-transform-debug";
import { ZrValue } from "./Locals";
import ZrUndefined from "./Undefined";
import { ZrUserdata } from "./Userdata";

export class ZrInstanceUserdata<T extends Instance = Instance> extends ZrUserdata<T> {
	public set = undefined;
	public get = undefined;

	public equals(other: ZrUserdata<defined>): boolean {
		return this.unwrap() === other.unwrap();
	}

	public isA<TClassName extends keyof Instances>(
		className: TClassName,
	): this is ZrInstanceUserdata<Instances[TClassName]> {
		return this.unwrap().IsA(className);
	}

	public static properties = {
		name: {
			get: (instance: Instance) => instance.Name,
			set: (instance: Instance, value: ZrValue) => (instance.Name = tostring(value)),
		},
		parent: {
			get: (instance: Instance) => {
				return instance.Parent !== undefined ? new ZrInstanceUserdata(instance.Parent) : ZrUndefined;
			},
		},
		full_name: {
			get: (instance: Instance) => instance.GetFullName(),
		},
		children: {
			get: (instance: Instance) => instance.GetChildren().map(child => new ZrInstanceUserdata(child)),
		},
		descendants: {
			get: (instance: Instance) => instance.GetDescendants().map(child => new ZrInstanceUserdata(child)),
		},
		class_name: {
			get: (instance: Instance) => instance.ClassName,
		},
	};

	public static methods = {};

	public constructor(private instance: T | (() => T)) {
		super(
			{
				properties: ZrInstanceUserdata.properties,
				methods: ZrInstanceUserdata.methods,
			},
			"RBX::Instance",
		);
	}

	public unwrap() {
		if (typeIs(this.instance, "function")) {
			this.instance = this.instance();
			$print("lazyGet", this.instance);
		}

		return this.instance;
	}

	public override toString() {
		return `<Instance(${this.unwrap().ClassName}) ${this.unwrap()}>`;
	}
}

export const InstanceConstructor = new (class ZrInstanceConstructorUserdata extends ZrUserdata<{}> {
	public unwrap(): {} {
		return {};
	}

	public constructor() {
		super(
			{
				methods: {
					create: (_, className) =>
						new ZrInstanceUserdata(new Instance(className as keyof CreatableInstances)),
				},
				properties: {},
			},
			"RBX::InstanceConstructor",
		);
	}
})();
