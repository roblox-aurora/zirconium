import { isNode, ZrNodeKind } from "@rbxts/zirconium-ast/out/Nodes";
import { getFriendlyName } from "@rbxts/zirconium-ast/out/Nodes/Functions";
import {
	ArrayLiteral,
	CommandSource,
	Node,
	ObjectLiteral,
	SourceBlock,
	VariableDeclaration,
} from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrObject from "../Data/Object";
import ZrLocalStack, { ZrValue } from "../Data/Locals";

export enum ZrRuntimeErrorCode {
	NodeValueError,
	EvaluationError,
}
export interface RuntimeError {
	message: string;
	code: ZrRuntimeErrorCode;
	node?: Node;
}

/**
 * Handles a block
 */
export default class ZrExecution {
	private level = 0;
	private errors = new Array<RuntimeError>();
	public constructor(private source: CommandSource | SourceBlock, private locals = new ZrLocalStack()) {}

	private runtimeError(message: string, code: ZrRuntimeErrorCode, node?: Node) {
		const err = identity<RuntimeError>({
			message,
			code,
			node,
		});
		this.errors.push(err);
		throw `[RuntimeError] ${err}`;
	}

	private runtimeAssert(
		condition: unknown,
		message: string,
		code: ZrRuntimeErrorCode,
		node?: Node,
	): asserts condition {
		if (!condition) {
			this.runtimeError(message, code, node);
		}
	}

	public getLocals() {
		return this.locals;
	}

	/**
	 * Pushes a new stack onto the executor
	 */
	private push() {
		this.level++;
		this.locals.push();
	}

	/**
	 * Pops the last stack from the executor
	 */
	private pop() {
		this.level--;
		return this.locals.pop();
	}

	public executeSetVariable(node: VariableDeclaration) {
		const { identifier, expression } = node;
		const value = this.evaluateNode(expression);
		this.runtimeAssert(value, "Failed to get value of node", ZrRuntimeErrorCode.NodeValueError, expression);
		this.getLocals().setUpValueOrLocal(identifier.name, value);
		return undefined;
	}

	public evaluateObjectNode(node: ObjectLiteral) {
		const object = new ZrObject();
		for (const prop of node.values) {
			const value = this.evaluateNode(prop.initializer);
			this.runtimeAssert(value, "No value", ZrRuntimeErrorCode.NodeValueError, prop.initializer);
			object.set(prop.name.name, value);
		}
		return object;
	}

	public evaluateArrayNode(node: ArrayLiteral) {
		const values = new Array<ZrValue>();
		for (const subNode of node.values) {
			const value = this.evaluateNode(subNode);
			this.runtimeAssert(value, "No value", ZrRuntimeErrorCode.NodeValueError, subNode);
			values.push(value);
		}
		return values;
	}

	public evaluateNode(node: Node): ZrValue | undefined {
		if (isNode(node, ZrNodeKind.Source)) {
			for (const subNode of node.children) {
				this.evaluateNode(subNode);
			}
			return undefined;
		} else if (isNode(node, ZrNodeKind.String)) {
			return node.text;
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
			} = node;
			if (name.text === "debug") {
				for (const [name, value] of this.getLocals().toMap()) {
					print(">".rep(this.level), name, value);
				}
			} else {
				throw `Invalid command: ${name.text}`;
			}
		} else {
			this.runtimeError(`Failed to evaluate ${getFriendlyName(node)}`, ZrRuntimeErrorCode.EvaluationError, node);
		}
	}

	public execute() {
		this.evaluateNode(this.source);
	}
}
