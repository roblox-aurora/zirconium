import { ZrNode, SourceFile } from "../Nodes/NodeTypes";

type VisitResult<T extends ZrNode> = T | T[] | undefined | void;
export type Visitor = (node: ZrNode) => VisitResult<ZrNode>;

function* iterateNodeChildren(node: ZrNode) {
	if (node === undefined) {
		return;
	}

	if (node.children) {
		for (const child of node.children) {
			yield child;
		}
	}
}

function* iterateNodeAndChildren(node: ZrNode) {
	yield node;
	if (node && node.children) {
		for (const child of node.children) {
			yield child;
		}
	}
}

export function visitEachChild<T extends ZrNode>(targetNode: T, visitor: Visitor) {
	for (const node of iterateNodeChildren(targetNode)) {
		visitor(node);
	}
}
