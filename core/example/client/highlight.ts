import CommandAstParser from "@rbxts/cmd-ast";
import { Node } from "@rbxts/cmd-ast/out/Nodes/NodeTypes";
import { typeGuards, CmdSyntaxKind } from "@rbxts/cmd-ast/out/Nodes";

export enum HighlightKind {
	String,
	Number,
	Keyword,
	Variable,
	Operator,
}

const Highlight: Record<HighlightKind, { startText: string; endText: string }> = {
	[HighlightKind.String]: { startText: `<font color="rgb(173, 241, 149)">`, endText: `</font>` },
	[HighlightKind.Number]: { startText: `<font color="rgb(255, 198, 0)">`, endText: `</font>` },
	[HighlightKind.Keyword]: { startText: `<font color="rgb(248, 109, 124)">`, endText: `</font>` },
	[HighlightKind.Variable]: { startText: `<font color="rgb(132, 214, 247)">`, endText: `</font>` },
	[HighlightKind.Operator]: { startText: `<font color="rgb(204, 204, 204)">`, endText: `</font>` },
};

interface HighlightNode {
	startPos: number;
	endPos: number;
	kind: HighlightKind;
}

function getNodePositions(node: Node, nodeList = new Array<HighlightNode>()) {
	if (typeGuards.isCommandStatement(node) || typeGuards.isSource(node)) {
		for (const child of node.children) {
			getNodePositions(child, nodeList);
		}
	} else if (typeGuards.isStringLiteral(node) && node.quotes) {
		nodeList.push({ kind: HighlightKind.String, startPos: node.startPos ?? 0, endPos: node.endPos ?? 0 });
	} else if (typeGuards.isNode(node, CmdSyntaxKind.InterpolatedString)) {
		nodeList.push({ kind: HighlightKind.String, startPos: node.startPos ?? 0, endPos: node.endPos ?? 0 });
		for (const child of node.values) {
			getNodePositions(child, nodeList);
		}
	} else if (typeGuards.isNode(node, CmdSyntaxKind.Number)) {
		nodeList.push({ kind: HighlightKind.Number, startPos: node.startPos ?? 0, endPos: node.endPos ?? 0 });
	} else if (typeGuards.isNode(node, CmdSyntaxKind.Boolean)) {
		nodeList.push({ kind: HighlightKind.Keyword, startPos: node.startPos ?? 0, endPos: node.endPos ?? 0 });
	} else if (typeGuards.isIdentifier(node)) {
		nodeList.push({ kind: HighlightKind.Variable, startPos: node.startPos ?? 0, endPos: node.endPos ?? 0 });
	} else if (typeGuards.isNode(node, CmdSyntaxKind.InnerExpression)) {
		// nodeList.push({ kind: HighlightKind.Variable, startPos: node.startPos ?? 0, endPos: node.endPos ?? 0 });
		// getNodePositions(node.expression, nodeList);
	} else if (typeGuards.isNode(node, CmdSyntaxKind.CommandName)) {
		nodeList.push({ kind: HighlightKind.Keyword, startPos: node.startPos ?? 0, endPos: node.endPos ?? 0 });
	} else if (typeGuards.isNode(node, CmdSyntaxKind.VariableDeclaration)) {
		nodeList.push({ kind: HighlightKind.Operator, startPos: node.startPos ?? 0, endPos: node.endPos ?? 0 });
		getNodePositions(node.identifier, nodeList);
		getNodePositions(node.expression, nodeList);
	} else if (typeGuards.isNode(node, CmdSyntaxKind.VariableStatement)) {
		getNodePositions(node.declaration, nodeList);
	} else if (typeGuards.isNode(node, CmdSyntaxKind.BinaryExpression)) {
		nodeList.push({ kind: HighlightKind.Operator, startPos: node.startPos ?? 0, endPos: node.endPos ?? 0 });
		getNodePositions(node.left, nodeList);
		getNodePositions(node.right, nodeList);
	}
	return nodeList;
}

export function highlight(st: string) {
	const expr = new CommandAstParser(st, {
		prefixExpressions: true,
		variableDeclarations: true,
		innerExpressions: true,
		nestingInnerExpressions: true,
	}).Parse();
	const pos = getNodePositions(expr);

	if (!(CommandAstParser.validate(expr) as { success: boolean }).success) {
		return st;
	}

	let newStr = "";
	let i = 0;
	const stack = new Array<HighlightKind>();
	while (i < st.size()) {
		const char = st.sub(i, i);
		for (const item of pos) {
			if (item.startPos === i) {
				newStr += Highlight[item.kind].startText;
			}
		}
		newStr += char;
		for (const item of pos) {
			if (item.endPos === i) {
				newStr += Highlight[item.kind].endText;
			}
		}
		i++;
	}
	return newStr;
}
