import { isNode, ZrNodeKind } from "Ast/Nodes";
import { Expression } from "Ast/Nodes/NodeTypes";

function getIdText(expression: Expression): string {
	if (isNode(expression, ZrNodeKind.Identifier)) {
		return expression.name;
	} else if (isNode(expression, ZrNodeKind.PropertyAccessExpression)) {
		return `${getIdText(expression.expression)}.${getIdText(expression.name)}`;
	} else {
		return "<unknown>";
	}
}

export = getIdText;
