import { ZrNode, SourceFile } from "../Nodes/NodeTypes";

type VisitResult<T extends ZrNode> = T | T[] | undefined | void;
export type Visitor = (node: ZrNode) => VisitResult<ZrNode>;

// export default class ZrAstNodeVisitor<TNode extends Node> {
// 	constructor(private node: TNode) {}

// 	private nodeStack = new Array<TNode>();

// 	public visitNode(visitor: Visitor) {
// 		return visitor(this.node);
// 	}

// 	public static iterateNodeAndChildren = function* (this: typeof ZrAstNodeVisitor, node: Node) {
// 		yield node;
// 		if (node.children) {
// 			for (const child of node.children) {
// 				yield child;
// 			}
// 		}
// 	};

// 	public visitNodeAndChildren(visitor: Visitor) {
// 		for (const node of ZrAstNodeVisitor.iterateNodeAndChildren(this.node)) {
// 			visitor(node);
// 		}
// 	}

// 	public static fromSourceFile(sourceFile: SourceFile) {
// 		return new ZrAstNodeVisitor(sourceFile);
// 	}
// }

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

export function visitNodeAndChildren(targetNode: ZrNode, visitor: Visitor) {
	for (const node of iterateNodeAndChildren(targetNode)) {
		visitor(node);
	}
}

export function visitEachChild(targetNode: ZrNode, visitor: Visitor) {
	for (const node of iterateNodeChildren(targetNode)) {
		visitor(node);
	}
}
