import { isNode, ZrNodeKind } from "@rbxts/zirconium-ast/out/Nodes";
import { getFriendlyName } from "@rbxts/zirconium-ast/out/Nodes/Functions";
import {
	CommandSource,
	Node,
	ObjectLiteral,
	SourceBlock,
	VariableDeclaration,
} from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrObject from "../Data/Object";
import ZrLocalStack, { ZrValue } from "../Data/Locals";

/**
 * Handles a block
 */
export default class ZrExecution {
	private level = 0;
	public constructor(private source: CommandSource | SourceBlock, private locals = new ZrLocalStack()) {}

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
		const value = this.executeNode(expression);
		assert(value, "Cannot assign `void` to variable.");
		this.getLocals().setUpValueOrLocal(identifier.name, value);
		return undefined;
	}

	public evaluateObjectNode(node: ObjectLiteral) {
		const object = new ZrObject();
		for (const prop of node.values) {
			const value = this.executeNode(prop.initializer);
			assert(value);
			object.set(prop.name.name, value);
		}
		return object;
	}

	public executeNode(node: Node): ZrValue | undefined {
		if (isNode(node, ZrNodeKind.Source)) {
			for (const subNode of node.children) {
				this.executeNode(subNode);
			}
			return undefined;
		} else if (isNode(node, ZrNodeKind.String)) {
			return node.text;
		} else if (isNode(node, ZrNodeKind.ObjectLiteralExpression)) {
			return this.evaluateObjectNode(node);
		} else if (isNode(node, ZrNodeKind.Number) || isNode(node, ZrNodeKind.Boolean)) {
			return node.value;
		} else if (isNode(node, ZrNodeKind.InterpolatedString)) {
			return this.getLocals().evaluateInterpolatedString(node);
		} else if (isNode(node, ZrNodeKind.VariableStatement)) {
			return this.executeSetVariable(node.declaration);
		} else if (isNode(node, ZrNodeKind.VariableDeclaration)) {
			return undefined;
		} else if (isNode(node, ZrNodeKind.Block)) {
			this.push();
			for (const statement of node.statements) {
				this.executeNode(statement);
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
			throw `Cannot execute node: ${getFriendlyName(node)}`;
		}
	}

	public execute() {
		this.executeNode(this.source);
	}
}
