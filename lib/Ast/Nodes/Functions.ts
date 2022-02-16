import { ZrNodeKind } from "./Enum";
import {
	ZrNode,
	ParentNode,
	BooleanLiteral,
	ArrayIndexExpression,
	Identifier,
	PropertyAccessExpression,
	ZrNodeKinds,
} from "./NodeTypes";

export function getKindName(kind: ZrNodeKind | undefined) {
	if (kind === undefined) {
		return "<none>";
	}

	return ZrNodeKind[kind];
}

function isNode<K extends keyof ZrNodeKinds>(node: ZrNode, kind: K): node is ZrNodeKinds[K] {
	return node.kind === kind;
}

function interpolate(node: Identifier | PropertyAccessExpression | ArrayIndexExpression): string {
	if (isNode(node, ZrNodeKind.Identifier)) {
		return node.name;
	} else if (isNode(node, ZrNodeKind.PropertyAccessExpression)) {
		return node.name + "." + interpolate(node.expression);
	} else if (isNode(node, ZrNodeKind.ArrayIndexExpression)) {
		return interpolate(node.expression) + "." + node.index.value;
	}

	throw `Invalid`;
}

export function getVariableName(node: Identifier | PropertyAccessExpression | ArrayIndexExpression) {
	return interpolate(node);
}

export function getFriendlyName(node: ZrNode, isConst = false) {
	if (node.kind === ZrNodeKind.String || node.kind === ZrNodeKind.InterpolatedString) {
		return "string";
	} else if (node.kind === ZrNodeKind.Number) {
		return "number";
	} else if (node.kind === ZrNodeKind.Boolean) {
		return isConst ? (node as BooleanLiteral).value : "boolean";
	}

	return getKindName(node.kind);
}

export function getNodeKindName(node: ZrNode) {
	if (node === undefined) {
		return "<none>";
	}

	return getKindName(node.kind);
}

export function isParentNode(node: ZrNode): node is ParentNode {
	return "children" in node;
}

// export function getNextNode(node: Node): Node | undefined {
// 	const { parent } = node;
// 	if (parent && isParentNode(parent)) {
// 		const index = parent.children.indexOf(node) + 1;
// 		return parent.children[index];
// 	}
// }

// export function getPreviousNode(node: Node): Node | undefined {
// 	const { parent } = node;
// 	if (parent && isParentNode(parent)) {
// 		const index = parent.children.indexOf(node) - 1;
// 		return parent.children[index];
// 	}
// }
