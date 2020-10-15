import { isNode, ZrNodeKind } from "@rbxts/zirconium-ast/out/Nodes";
import { InterpolatedStringExpression, StringLiteral } from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrObject from "./Object";

export type ZrValue = number | string | boolean | ZrObject | Array<ZrValue>;

export default class ZrLocalStack {
	private locals = new Array<Map<string, ZrValue>>();

	constructor(inject?: Record<string, ZrValue>);
	constructor(inject?: ReadonlyMap<string, ZrValue>);
	constructor(inject?: defined) {
		if (inject) {
			const newLocals = new Map<string, ZrValue>();
			for (const [name, value] of pairs(inject)) {
				newLocals.set(name, value);
			}
			this.locals.push(newLocals);
		}
	}

	private current() {
		return this.locals[this.locals.size() - 1];
	}

	/**
	 * Will set the value on the first stack
	 * @internal
	 */
	public setGlobal(name: string, value: ZrValue) {
		const first = this.locals[0];
		first.set(name, value);
	}

	/**
	 * Gets the specified global
	 */
	public getGlobal(name: string) {
		const first = this.locals[0];
		return first.get(name);
	}

	/**
	 * Will set the value at the stack it was first declared
	 * @internal
	 */
	public setUpValueOrLocal(name: string, value: ZrValue) {
		const stack = this.getUpValueStack(name) ?? this.current();
		stack.set(name, value);
	}

	/**
	 * Will set the value on the last stack
	 * @internal
	 */
	public setLocal(name: string, value: ZrValue) {
		const last = this.current();
		last.set(name, value);
	}

	/**
	 * Gets the stack (if any) the local is declared at
	 * @internal
	 */
	private getUpValueStack(name: string) {
		for (const currentLocals of this.locals) if (currentLocals.has(name)) return currentLocals;
	}

	/**
	 * Gets the value of a local (or the upvalue if it's not local to this stack)
	 * @internal
	 */
	public getLocalOrUpValue(name: string) {
		for (const currentLocals of this.locals) {
			if (currentLocals.has(name)) return currentLocals.get(name);
		}
	}

	/** @internal */
	public pop() {
		return this.locals.pop();
	}

	/** @internal */
	public push() {
		this.locals.push(new Map<string, ZrValue>());
	}

	public toMap() {
		const map = new Map<string, ZrValue>();
		for (const currentLocals of this.locals) {
			currentLocals.forEach((v, k) => map.set(k, v));
		}
		return map as ReadonlyMap<string, ZrValue>;
	}

	/** @internal */
	public evaluateInterpolatedString(expression: InterpolatedStringExpression): string {
		const top = this.current();
		let text = "";
		for (const value of expression.values) {
			if (isNode(value, ZrNodeKind.Identifier)) {
				text += tostring(this.getLocalOrUpValue(value.name));
			} else {
				text += value.text;
			}
		}
		return text;
	}
}
