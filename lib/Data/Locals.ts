import { Result, unit, UnitType } from "@rbxts/rust-classes";
import { isNode, ZrNodeKind } from "../Ast/Nodes";
import { InterpolatedStringExpression } from "../Ast/Nodes/NodeTypes";
import { ZrEnum, ZrEnumItem } from "./Enum";
import ZrLuauFunction from "./LuauFunction";
import ZrObject from "./Object";
import ZrRange from "./Range";
import ZrUndefined from "./Undefined";
import { ZrUserdata } from "./Userdata";
import ZrUserFunction from "./UserFunction";

export type ZrValue =
	| number
	| string
	| boolean
	| ZrObject
	| Array<ZrValue>
	| Map<string, ZrValue>
	| ZrUserFunction
	| ZrLuauFunction
	| ZrEnum
	| ZrEnumItem
	| ZrUserdata<defined> | ZrRange;

export const enum StackValueType {
	Constant,
	Function,
}

type StackValue = [value: ZrValue | ZrUndefined, constant?: boolean, exports?: StackValueType];

export const enum StackValueAssignmentError {
	ReassignConstant,
	VariableNotDeclared,
}

export default class ZrLocalStack {
	private locals = new Array<Map<string, StackValue>>();

	constructor(inject?: ReadonlyMap<string, ZrValue>) {
		if (inject) {
			const newLocals = new Map<string, StackValue>();
			for (const [name, value] of pairs(inject)) {
				newLocals.set(name, [value, value instanceof ZrLuauFunction]);
			}
			this.locals.push(newLocals);
		}
	}

	public print() {
		print("=== stack ===");
		for (const [i, localStack] of ipairs(this.locals)) {
			for (const [k, v] of localStack) {
				print("░".rep(i - 1), k, v);
			}
		}
		print("=== end stack ===");
	}

	private current() {
		return this.locals[this.locals.size() - 1];
	}

	/**
	 * Will set the value on the first stack
	 * @internal
	 */
	public setGlobal(name: string, value: ZrValue, constant?: boolean) {
		const first = this.locals[0];
		first.set(name, [value, constant]);
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
	public setUpValueOrLocal(name: string, value: ZrValue | ZrUndefined | undefined, constant?: boolean): Result<ZrValue | ZrUndefined, StackValueAssignmentError> {
		const stack = this.getUpValueStack(name) ?? this.current();
		const stackValue = stack.get(name);
		if (stackValue) {
			const [, constant] = stackValue;
			if (constant) {
				return Result.err(StackValueAssignmentError.ReassignConstant);
			}
		}

		if (value !== undefined && value  !== ZrUndefined) {
			stack.set(name, [value, constant]);
			return Result.ok(value);
		} else {
			stack.delete(name);
			return Result.ok(ZrUndefined);
		}
	}

	public setUpValueOrLocalIfDefined(name: string, value: ZrValue | ZrUndefined | undefined): Result<ZrValue | ZrUndefined, StackValueAssignmentError> {
		const stack = this.getUpValueStack(name) ?? this.current();
		const existingValue = stack.get(name);
		if (existingValue !== undefined) {
			if (value === ZrUndefined || value === undefined) {
				return this.setUpValueOrLocal(name, ZrUndefined);
			} else {
				return this.setUpValueOrLocal(name, value);
			}
		} else {
			return Result.err(StackValueAssignmentError.VariableNotDeclared);
		}
	}

	/**
	 * Will set the value on the last stack
	 * @internal
	 */
	public setLocal(name: string, value: ZrValue | undefined, constant?: boolean) {
		const last = this.current();
		if (value === undefined) {
			last.set(name, [ZrUndefined, constant]);
		} else {
			last.set(name, [value, constant]);
		}
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
		for (let i = this.locals.size() - 1; i >= 0; i--) {
			const stack = this.locals[i];
			if (stack.has(name)) {
				return stack.get(name);
			}
		}

		return undefined;
	}

	/** @internal */
	public pop() {
		return this.locals.pop();
	}

	/** @internal */
	public push() {
		this.locals.push(new Map<string, StackValue>());
	}

	public toMap() {
		const map = new Map<string, ZrValue | ZrUndefined>();
		for (const currentLocals of this.locals) {
			currentLocals.forEach((v, k) => map.set(k, v[0]));
		}
		return map as ReadonlyMap<string, ZrValue>;
	}

	/** @internal */
	public evaluateInterpolatedString(expression: InterpolatedStringExpression): string {
		let text = "";
		for (const value of expression.values) {
			if (isNode(value, ZrNodeKind.Identifier)) {
				text += tostring(this.getLocalOrUpValue(value.name) ?? "");
			} else {
				text += value.text;
			}
		}
		return text;
	}
}
