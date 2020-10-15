import { isNode, ZrNodeKind } from "@rbxts/zirconium-ast/out/Nodes";
import { getFriendlyName } from "@rbxts/zirconium-ast/out/Nodes/Functions";
import {
	ArrayIndexExpression,
	ArrayLiteral,
	CommandSource,
	ForInStatement,
	FunctionDeclaration,
	IfStatement,
	Node,
	ObjectLiteral,
	SourceBlock,
	VariableDeclaration,
} from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrObject from "../Data/Object";
import ZrLocalStack, { ZrValue } from "../Data/Locals";
import { isArray, isMap } from "../Util";
import ZrUserFunction from "../Data/UserFunction";

export enum ZrRuntimeErrorCode {
	NodeValueError,
	EvaluationError,
	StackOverflow,
	InvalidForInExpression,
	IndexingUndefined,
	InvalidArrayIndex,
	InvalidType,
	NotCallable,
}
export interface ZrRuntimeError {
	message: string;
	code: ZrRuntimeErrorCode;
	node?: Node;
}

const getTypeName = (value: ZrValue) => {
	if (isArray(value)) {
		return "Array";
	} else if (value instanceof ZrObject) {
		return "Object";
	} else {
		return typeOf(value);
	}
};

/**
 * Handles a block
 */
export default class ZrRuntime {
	private level = 0;
	private errors = new Array<ZrRuntimeError>();
	public constructor(private source: CommandSource | SourceBlock, private locals = new ZrLocalStack()) {}

	private runtimeError(message: string, code: ZrRuntimeErrorCode, node?: Node) {
		const err = identity<ZrRuntimeError>({
			message,
			code,
			node,
		});
		this.errors.push(err);
		throw `[RuntimeError] ${err.message}`;
	}

	private runtimeAssert(
		condition: unknown,
		message: string,
		code: ZrRuntimeErrorCode,
		node?: Node,
	): asserts condition {
		if (condition === false) {
			this.runtimeError(message, code, node);
		}
	}

	private runtimeAssertNotUndefined(
		condition: unknown,
		message: string,
		code: ZrRuntimeErrorCode,
		node?: Node,
	): asserts condition is defined {
		if (condition === undefined) {
			this.runtimeError(message, code, node);
		}
	}

	public getLocals() {
		return this.locals;
	}

	public getErrors() {
		return this.errors;
	}

	/**
	 * Pushes a new stack onto the executor
	 */
	private push() {
		this.level++;
		this.locals.push();

		if (this.level > 256) {
			this.runtimeError("Stack overflow", ZrRuntimeErrorCode.StackOverflow);
		}
	}

	/**
	 * Pops the last stack from the executor
	 */
	private pop() {
		this.level--;
		return this.locals.pop();
	}

	private executeSetVariable(node: VariableDeclaration) {
		const { identifier, expression } = node;
		const value = this.evaluateNode(expression);
		this.runtimeAssertNotUndefined(
			value,
			"Failed to get value of node",
			ZrRuntimeErrorCode.NodeValueError,
			expression,
		);
		this.getLocals().setUpValueOrLocal(identifier.name, value);
		return undefined;
	}

	private evaluateObjectNode(node: ObjectLiteral) {
		const object = new ZrObject();
		for (const prop of node.values) {
			const value = this.evaluateNode(prop.initializer);
			this.runtimeAssertNotUndefined(value, "No value", ZrRuntimeErrorCode.NodeValueError, prop.initializer);
			object.set(prop.name.name, value);
		}
		return object;
	}

	private evaluateFunctionDeclaration(node: FunctionDeclaration) {
		const declaration = new ZrUserFunction(node);
		this.locals.setLocal(node.name.name, declaration);
		return declaration;
	}

	private evaluateArrayNode(node: ArrayLiteral) {
		const values = new Array<ZrValue>();
		let i = 0;
		for (const subNode of node.values) {
			const value = this.evaluateNode(subNode);
			this.runtimeAssertNotUndefined(
				value,
				"Array value is NONE at index " + i,
				ZrRuntimeErrorCode.NodeValueError,
				subNode,
			);
			values.push(value);
			i++;
		}
		return values;
	}

	private evaluateIfStatement(node: IfStatement) {
		const { condition, thenStatement, elseStatement } = node;
		assert(condition);
		const resultOfCondition = this.evaluateNode(condition);
		this.runtimeAssertNotUndefined(
			resultOfCondition,
			"Condition not valid?",
			ZrRuntimeErrorCode.EvaluationError,
			condition,
		);
		if (resultOfCondition && thenStatement) {
			this.evaluateNode(thenStatement);
		} else if (!resultOfCondition && elseStatement) {
			this.evaluateNode(elseStatement);
		}
	}

	private evaluateForInStatement(node: ForInStatement) {
		const { initializer, expression, statement } = node;

		if (isNode(expression, ZrNodeKind.Identifier)) {
			const value = this.locals.getLocalOrUpValue(expression.name);
			this.runtimeAssertNotUndefined(
				value,
				"Array or Object expected",
				ZrRuntimeErrorCode.InvalidForInExpression,
			);
			this.runtimeAssert(
				isArray(value) || value instanceof ZrObject,
				"Array, Map or Object expected",
				ZrRuntimeErrorCode.InvalidType,
			);
			if (value instanceof ZrObject) {
				for (const [k, v] of value.toMap()) {
					this.push();
					this.locals.setLocal(initializer.name, [k, v]);
					this.evaluateNode(statement);
					this.pop();
				}
			} else {
				for (const [, v] of pairs(value)) {
					this.push();
					this.locals.setLocal(initializer.name, v);
					this.evaluateNode(statement);
					this.pop();
				}
			}
		}
	}

	private evaluateArrayIndexExpression(node: ArrayIndexExpression) {
		const { expression, index } = node;
		const value = this.evaluateNode(expression);
		this.runtimeAssertNotUndefined(
			value,
			"Attempted to index nil value",
			ZrRuntimeErrorCode.IndexingUndefined,
			expression,
		);
		this.runtimeAssert(
			isArray<ZrValue>(value),
			"Attempt to index " + getTypeName(value) + " with a number",
			ZrRuntimeErrorCode.InvalidArrayIndex,
			index,
		);
		return value[index.value];
	}

	/** @internal */
	public evaluateNode(node: Node): ZrValue | undefined {
		if (isNode(node, ZrNodeKind.Source)) {
			for (const subNode of node.children) {
				this.evaluateNode(subNode);
			}
			return undefined;
		} else if (isNode(node, ZrNodeKind.String)) {
			return node.text;
		} else if (isNode(node, ZrNodeKind.Identifier)) {
			return this.getLocals().getLocalOrUpValue(node.name);
		} else if (isNode(node, ZrNodeKind.ArrayIndexExpression)) {
			return this.evaluateArrayIndexExpression(node);
		} else if (isNode(node, ZrNodeKind.FunctionDeclaration)) {
			return this.evaluateFunctionDeclaration(node);
		} else if (isNode(node, ZrNodeKind.ForInStatement)) {
			this.evaluateForInStatement(node);
		} else if (isNode(node, ZrNodeKind.IfStatement)) {
			this.evaluateIfStatement(node);
		} else if (isNode(node, ZrNodeKind.ObjectLiteralExpression)) {
			return this.evaluateObjectNode(node);
		} else if (isNode(node, ZrNodeKind.ArrayLiteralExpression)) {
			return this.evaluateArrayNode(node);
		} else if (isNode(node, ZrNodeKind.Number) || isNode(node, ZrNodeKind.Boolean)) {
			return node.value;
		} else if (isNode(node, ZrNodeKind.InterpolatedString)) {
			return this.getLocals().evaluateInterpolatedString(node);
		} else if (isNode(node, ZrNodeKind.VariableStatement)) {
			return this.executeSetVariable(node.declaration);
		} else if (isNode(node, ZrNodeKind.Block)) {
			this.push();
			for (const statement of node.statements) {
				this.evaluateNode(statement);
			}
			this.pop();
		} else if (isNode(node, ZrNodeKind.CommandStatement)) {
			const {
				command: { name },
				children,
			} = node;
			if (name.text === "debug") {
				this.locals.print();
			} else {
				const matching = this.locals.getLocalOrUpValue(name.text);
				if (matching instanceof ZrUserFunction) {
					this.push();
					const params = matching.getParameters();
					for (const [i, param] of ipairs(params)) {
						const value = children[i];
						if (value !== undefined) {
							const valueOf = this.evaluateNode(value);
							this.runtimeAssertNotUndefined(valueOf, "Huh?", ZrRuntimeErrorCode.EvaluationError, node);
							this.locals.setLocal(param.name.name, valueOf);
						}
					}

					this.evaluateNode(matching.getBody());
					this.pop();
				} else {
					this.runtimeError(name.text + " is not a function", ZrRuntimeErrorCode.NotCallable, node);
				}
			}
		} else {
			this.runtimeError(`Failed to evaluate ${getFriendlyName(node)}`, ZrRuntimeErrorCode.EvaluationError, node);
		}
	}

	public execute() {
		this.evaluateNode(this.source);
	}
}
