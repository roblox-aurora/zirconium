import { isNode, ZrNodeKind } from "@rbxts/zirconium-ast/out/Nodes";
import { getFriendlyName } from "@rbxts/zirconium-ast/out/Nodes/Functions";
import {
	ArrayIndexExpression,
	ArrayLiteralExpression,
	BinaryExpression,
	SourceFile,
	CallExpression,
	SimpleCallExpression,
	ForInStatement,
	FunctionDeclaration,
	IfStatement,
	Node,
	ObjectLiteral,
	PropertyAccessExpression,
	SourceBlock,
	VariableDeclaration,
	OptionExpression,
} from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrObject from "../Data/Object";
import ZrLocalStack, { ZrValue } from "../Data/Locals";
import { isArray, isMap } from "../Util";
import ZrUserFunction from "../Data/UserFunction";
import ZrLuauFunction from "../Data/LuauFunction";
import ZrContext from "../Data/Context";
import { types } from "@rbxts/zirconium-ast";

export enum ZrRuntimeErrorCode {
	NodeValueError,
	EvaluationError,
	StackOverflow,
	InvalidForInExpression,
	IndexingUndefined,
	InvalidArrayIndex,
	InvalidType,
	NotCallable,
	InvalidPropertyAccess,
	PipeError,
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
	private functions = new Map<string, ZrLuauFunction>();
	public constructor(private source: SourceFile | SourceBlock, private locals = new ZrLocalStack()) {}

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

	public registerFunction(name: string, func: ZrLuauFunction) {
		this.functions.set(name, func);
		this.locals.setGlobal(name, func);
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
		if (types.isIdentifier(identifier)) {
			this.getLocals().setUpValueOrLocal(identifier.name, value);
		} else {
			this.runtimeError("Not yet implemented", ZrRuntimeErrorCode.EvaluationError); // TODO
		}

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

	private evaluateArrayNode(node: ArrayLiteralExpression) {
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
			condition,
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
		const { initializer, statement } = node;
		let { expression } = node;

		// Shortcut a parenthesized expression
		if (isNode(expression, ZrNodeKind.ParenthesizedExpression)) {
			expression = expression.expression;
		}

		let value: ZrValue | undefined;

		if (isNode(expression, ZrNodeKind.Identifier)) {
			value = this.locals.getLocalOrUpValue(expression.name);
		} else if (
			types.isCallableExpression(expression) ||
			isNode(expression, ZrNodeKind.ArrayLiteralExpression) ||
			isNode(expression, ZrNodeKind.ObjectLiteralExpression)
		) {
			value = this.evaluateNode(expression);
		} else {
			this.runtimeError(
				"Invalid expression to ForIn statement - expects Array or Object",
				ZrRuntimeErrorCode.InvalidForInExpression,
				expression,
			);
		}

		this.runtimeAssertNotUndefined(
			value,
			"Expression expected",
			ZrRuntimeErrorCode.InvalidForInExpression,
			expression,
		);
		this.runtimeAssert(
			isArray(value) || value instanceof ZrObject,
			"Array, Map or Object expected",
			ZrRuntimeErrorCode.InvalidType,
			expression,
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

	private evaluatePropertyAccessExpression(node: PropertyAccessExpression) {
		const { expression, name } = node;
		const value = this.evaluateNode(expression);
		const id = name.name;
		this.runtimeAssertNotUndefined(id, "", ZrRuntimeErrorCode.NodeValueError, name);
		this.runtimeAssertNotUndefined(
			value,
			"Attempted to index nil with " + id,
			ZrRuntimeErrorCode.IndexingUndefined,
			expression,
		);
		if (value instanceof ZrObject) {
			return value.get(id);
		} else if (isMap<ZrValue>(value)) {
			return value.get(id);
		} else {
			this.runtimeError(
				`Attempt to index ${getTypeName(value)} with '${id}'`,
				ZrRuntimeErrorCode.InvalidPropertyAccess,
				name,
			);
		}
	}

	private evaluateFunctionCall(node: CallExpression | SimpleCallExpression, context: ZrContext) {
		const {
			expression: { name },
			children,
			arguments: callArgs,
		} = node;

		let options = new Array<OptionExpression>();
		if (types.isCallExpression(node)) {
			({ options } = node);
		}

		const matching = this.locals.getLocalOrUpValue(name);
		if (matching instanceof ZrUserFunction) {
			this.push();
			const params = matching.getParameters();
			for (let i = 0; i < params.size(); i++) {
				const param = params[i];
				const value = callArgs[i];
				if (value !== undefined) {
					const valueOf = this.evaluateNode(value);
					this.runtimeAssertNotUndefined(valueOf, "Huh?", ZrRuntimeErrorCode.EvaluationError, node);
					this.locals.setLocal(param.name.name, valueOf);
				}
			}
			for (const option of options) {
				const value = this.evaluateNode(option.expression);
				if (value) {
					this.locals.setLocal(option.option.flag, value);
				}
			}

			this.evaluateNode(matching.getBody());
			this.pop();
		} else if (matching instanceof ZrLuauFunction) {
			const args = new Array<ZrValue>();
			let i = 0;
			for (const child of callArgs) {
				const value = this.evaluateNode(child);
				if (value) {
					args[i] = value;
				}
				i++;
			}
			const result = matching.call(context, ...args);
			if (result) {
				return result;
			}
		} else {
			this.runtimeError(name + " is not a function", ZrRuntimeErrorCode.NotCallable, node);
		}
	}

	public evaluateBinaryExpression(node: BinaryExpression, input = new Array<string>()) {
		const { left, operator, right } = node;
		if (operator === "|") {
			this.runtimeAssert(
				types.isCallableExpression(left) &&
					(types.isCallableExpression(right) || isNode(right, ZrNodeKind.BinaryExpression)),
				"Pipe expression only works with two command statements",
				ZrRuntimeErrorCode.PipeError,
			);
			const output = new Array<string>();
			const context = ZrContext.createPipedContext(this, input, output);
			this.evaluateFunctionCall(left, context);

			if (types.isCallableExpression(right)) {
				this.evaluateFunctionCall(
					right,
					ZrContext.createPipedContext(this, output, this.mainContext._getOutput()),
				);
			} else {
				this.evaluateBinaryExpression(right, output);
			}
		} else if (operator === "&&") {
			if (types.isCallableExpression(left)) {
				const result = this.evaluateFunctionCall(left, this.mainContext);
				if (result === undefined || result) {
					return this.evaluateNode(right);
				}
			} else {
				const result = this.evaluateNode(left);
				if (result === undefined || result) {
					return this.evaluateNode(right);
				}
				// this.runtimeError(`Unable to handle ${getFriendlyName(left)}`, ZrRuntimeErrorCode.EvaluationError);
			}
		} else if (operator === "||") {
			if (types.isCallableExpression(left)) {
				const result = this.evaluateFunctionCall(left, this.mainContext);
				if (!result && result !== undefined) {
					return this.evaluateNode(right);
				}
			} else {
				this.runtimeError("NotHandled", ZrRuntimeErrorCode.EvaluationError);
			}
		} else {
			this.runtimeError(`Unhandled expression '${operator}'`, ZrRuntimeErrorCode.EvaluationError);
		}
		return undefined;
	}

	private mainContext = new ZrContext(this);

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
		} else if (isNode(node, ZrNodeKind.PropertyAccessExpression)) {
			return this.evaluatePropertyAccessExpression(node);
		} else if (isNode(node, ZrNodeKind.FunctionDeclaration)) {
			return this.evaluateFunctionDeclaration(node);
		} else if (isNode(node, ZrNodeKind.ParenthesizedExpression)) {
			return this.evaluateNode(node.expression);
		} else if (isNode(node, ZrNodeKind.BinaryExpression)) {
			return this.evaluateBinaryExpression(node);
		} else if (isNode(node, ZrNodeKind.UnaryExpression)) {
			if (node.operator === "!") {
				return !this.evaluateNode(node.expression);
			}
		} else if (isNode(node, ZrNodeKind.ExpressionStatement)) {
			this.evaluateNode(node.expression);
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
		} else if (types.isCallableExpression(node)) {
			return this.evaluateFunctionCall(node, this.mainContext);
		} else {
			this.runtimeError(`Failed to evaluate ${getFriendlyName(node)}`, ZrRuntimeErrorCode.EvaluationError, node);
		}
	}

	public execute() {
		this.evaluateNode(this.source);
		return this.mainContext._getOutput();
	}
}
