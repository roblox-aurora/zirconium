import { ZrNodeKind, ZrNodeFlag, ZrTypeKeyword } from "./Enum";
import {
	InterpolatedStringExpression,
	StringLiteral,
	Node,
	InnerExpression,
	PrefixToken,
	PrefixExpression,
	SourceFile,
	NumberLiteral,
	Identifier,
	Option as OptionKey,
	OperatorToken,
	VariableDeclaration,
	VariableStatement,
	BooleanLiteral,
	EndOfStatement,
	InvalidNode,
	BinaryExpression,
	NodeError,
	OptionExpression,
	IfStatement,
	ArrayLiteralExpression,
	PropertyAccessExpression,
	ArrayIndexExpression,
	Statement,
	ParenthesizedExpression,
	FunctionDeclaration,
	ParameterDeclaration,
	TypeReference,
	ForInStatement,
	ObjectLiteralExpression,
	PropertyAssignment,
	UnaryExpression,
	CallExpression,
	SimpleCallExpression,
	NodeTypes,
	Expression,
	UndefinedKeyword,
	ExportKeyword,
	EnumDeclarationStatement,
} from "./NodeTypes";
import { isNode } from "./Guards";

export function createNode<T extends keyof NodeTypes>(kind: T) {
	return {
		kind,
		flags: 0,
	} as Writable<NodeTypes[T & ZrNodeKind]>;
}

/** @internal */
export function updateNodeInternal<TNode extends Node>(node: TNode, props: Partial<TNode>) {
	for (const [key, prop] of pairs(props)) {
		/** @ts-ignore */
		node[key] = prop;
	}
	return node;
}

export function createInterpolatedString(
	...values: InterpolatedStringExpression["values"]
): InterpolatedStringExpression {
	const node = createNode(ZrNodeKind.InterpolatedString);
	node.values = values;
	node.children = values;
	return node;
}

export function createReturnStatement(expression: Expression) {
	const node = createNode(ZrNodeKind.ReturnStatement);
	node.expression = expression;
	node.children = [expression];
	return node;
}

export function createEmptyExpression() {
	return createNode(ZrNodeKind.EmptyExpression);
}

export function createEmptyStatement() {
	return createNode(ZrNodeKind.EmptyStatement);
}

export function createArrayLiteral(values: ArrayLiteralExpression["values"]) {
	const node = createNode(ZrNodeKind.ArrayLiteralExpression);
	node.values = values;
	node.children = values;
	return node;
}

export function createEnumDeclaration(name: Identifier, values: EnumDeclarationStatement["values"]) {
	const node = createNode(ZrNodeKind.EnumDeclaration);
	node.name = name;
	node.values = values;
	node.children = values;
	return node;
}

export function createEnumItemExpression(name: Identifier) {
	const node = createNode(ZrNodeKind.EnumItemExpression);
	node.name = name;
	return node;
}

export function withError<T extends Node>(node: T): T {
	node.flags |= ZrNodeFlag.ThisNodeHasError;
	return node;
}

export function createExportKeyword(): ExportKeyword {
	const node = createNode(ZrNodeKind.ExportKeyword);
	return node;
}

export function createUndefined(): UndefinedKeyword {
	const node = createNode(ZrNodeKind.UndefinedKeyword);
	return node;
}

export function createPropertyAssignment(
	name: PropertyAssignment["name"],
	initializer: PropertyAssignment["initializer"],
) {
	const node = createNode(ZrNodeKind.PropertyAssignment);
	node.name = name;
	node.initializer = initializer;
	node.children = [name, initializer];
	return node;
}

export function createObjectLiteral(values: ObjectLiteralExpression["values"]) {
	const node = createNode(ZrNodeKind.ObjectLiteralExpression);
	node.values = values;
	node.children = values;
	return node;
}

export function createArrayIndexExpression(
	expression: ArrayIndexExpression["expression"],
	index: ArrayIndexExpression["index"],
) {
	const node = createNode(ZrNodeKind.ArrayIndexExpression);
	node.expression = expression;
	node.index = index;
	node.children = [expression, index];
	return node;
}

export function createPropertyAccessExpression(
	expression: PropertyAccessExpression["expression"],
	name: PropertyAccessExpression["name"],
) {
	const node = createNode(ZrNodeKind.PropertyAccessExpression);
	node.expression = expression;
	node.name = name;
	node.children = [expression, name];
	return node;
}

export function createNodeError(message: string, node: Node): NodeError {
	return {
		node,
		message,
	};
}

export function createIfStatement(
	condition: IfStatement["condition"],
	thenStatement: IfStatement["thenStatement"],
	elseStatement: IfStatement["elseStatement"],
): IfStatement {
	const node = createNode(ZrNodeKind.IfStatement);
	node.condition = condition;
	node.thenStatement = thenStatement;
	node.elseStatement = elseStatement;
	node.children = [];
	if (condition) node.children.push(condition);
	if (thenStatement) node.children.push(thenStatement);
	if (elseStatement) node.children.push(elseStatement);
	return node;
}

export function createExpressionStatement(expression: Expression) {
	const node = createNode(ZrNodeKind.ExpressionStatement);
	node.expression = expression;
	node.children = [expression];
	return node;
}

export function createRangeExpression(left: Expression, right: Expression) {
	const node = createNode(ZrNodeKind.RangeExpression);
	node.left = left;
	node.right = right;
	return node;
}

export function createForInStatement(
	initializer: ForInStatement["initializer"],
	expression: ForInStatement["expression"] | undefined,
	statement: ForInStatement["statement"] | undefined,
) {
	const node = createNode(ZrNodeKind.ForInStatement);
	node.initializer = initializer;
	node.children = [initializer];

	if (expression) {
		node.expression = expression;
		node.children.push(expression);
	}

	if (statement) {
		node.statement = statement;
		node.children.push(statement);
	}
	return node;
}

/**
 * Flattens an interpolated string into a regular string
 * @param expression The interpolated string expression
 * @param variables The variables for identifiers etc. to flatten with
 */
export function flattenInterpolatedString(
	expression: InterpolatedStringExpression,
	variables: Record<string, defined>,
): StringLiteral {
	let text = "";
	for (const value of expression.values) {
		if (isNode(value, ZrNodeKind.Identifier)) {
			text += tostring(variables[value.name]);
		} else {
			text += value.text;
		}
	}

	const node = createNode(ZrNodeKind.String);
	node.text = text;
	return node;
}

export function createBlock(statements: Statement[]) {
	const node = createNode(ZrNodeKind.Block);
	node.statements = statements;
	node.children = statements;
	return node;
}

export function createTypeReference(typeName: TypeReference["typeName"]) {
	return identity<TypeReference>({
		kind: ZrNodeKind.TypeReference,
		typeName,
		children: [],
		flags: 0,
	});
}

export function createKeywordTypeNode(keyword: ZrTypeKeyword) {
	return createTypeReference(createIdentifier(keyword));
}

export function createParameter(name: ParameterDeclaration["name"], typeName?: ParameterDeclaration["type"]) {
	const node = createNode(ZrNodeKind.Parameter);
	node.name = name;
	node.type = typeName;
	node.children = [name];
	return node;
}

export function createFunctionExpression(
	parameters: FunctionDeclaration["parameters"],
	body: FunctionDeclaration["body"] | undefined,
) {
	const node = createNode(ZrNodeKind.FunctionExpression);
	node.parameters = parameters;
	node.children = [...parameters];

	if (body) {
		node.body = body;
		node.children.push(body);
	}
	return node;
}

export function createFunctionDeclaration(
	name: FunctionDeclaration["name"],
	parameters: FunctionDeclaration["parameters"],
	body: FunctionDeclaration["body"] | undefined,
) {
	const node = createNode(ZrNodeKind.FunctionDeclaration);
	node.name = name;
	node.children = [name];

	node.parameters = parameters;
	if (body) {
		node.body = body;
		node.children.push(body);
	}
	return node;
}

export function createParenthesizedExpression(expression: ParenthesizedExpression["expression"]) {
	const node = createNode(ZrNodeKind.ParenthesizedExpression);
	node.expression = expression;
	node.children = [expression];
	return node;
}

// /** @deprecated Use createCallExpression */
// export function createCommandStatement(command: CommandName, children: Node[], startPos?: number, endPos?: number) {
// 	const statement: CommandStatement = {
// 		kind: ZrNodeKind.CommandStatement,
// 		command,
// 		children,
// 		flags: 0,
// 		startPos: startPos,
// 		endPos,
// 	};
// 	for (const child of statement.children) {
// 		child.parent = statement;
// 	}

// 	return statement;
// }

export function createSimpleCallExpression(
	expression: SimpleCallExpression["expression"],
	args: SimpleCallExpression["arguments"],
	startPos?: number,
	endPos?: number,
) {
	const node = createNode(ZrNodeKind.SimpleCallExpression);
	node.expression = expression;
	node.arguments = args;
	node.startPos = startPos;
	node.endPos = endPos;
	node.children = [expression, ...args];
	return node;
}

export function createCallExpression(
	expression: CallExpression["expression"],
	args: CallExpression["arguments"],
	options?: CallExpression["options"],
	startPos?: number,
	endPos?: number,
) {
	const result = createNode(ZrNodeKind.CallExpression);
	result.expression = expression;
	result.arguments = args;
	result.startPos = startPos;
	result.endPos = endPos;
	result.options = options ?? [];
	return result;
}

export function createInnerExpression(expression: InnerExpression["expression"], startPos?: number, endPos?: number) {
	const node = createNode(ZrNodeKind.InnerExpression);
	node.expression = expression;
	node.startPos = startPos;
	node.endPos = endPos;
	node.children = [expression];
	return node;
}

export function createPrefixToken(value: PrefixToken["value"]): PrefixToken {
	return { kind: ZrNodeKind.PrefixToken, value, flags: 0, children: [] };
}

export function createPrefixExpression(
	prefix: PrefixExpression["prefix"],
	expression: PrefixExpression["expression"],
): PrefixExpression {
	const node = createNode(ZrNodeKind.PrefixExpression);
	node.prefix = prefix;
	node.expression = expression;
	node.children = [prefix, expression];
	return node;
}

export function createSourceFile(children: SourceFile["children"]) {
	const statement: SourceFile = { kind: ZrNodeKind.Source, children, flags: 0 };
	for (const child of statement.children) {
		child.parent = statement;
	}
	return statement;
}

export function createStringNode(text: string, quotes?: string): StringLiteral {
	// return { kind: ZrNodeKind.String, text, quotes, flags: 0 };
	const node = createNode(ZrNodeKind.String);
	node.text = text;
	node.quotes = quotes;
	return node;
}

export function createNumberNode(value: number): NumberLiteral {
	const node = createNode(ZrNodeKind.Number);
	node.value = value;
	return node;
}

export function createIdentifier(name: string, prefix = "$"): Identifier {
	const node = createNode(ZrNodeKind.Identifier);
	node.name = name;
	node.prefix = prefix;
	return node;
}

export function createOptionKey(flag: string, endPos?: number): OptionKey {
	// return { kind: ZrNodeKind.OptionKey, flag, flags: 0, startPos: endPos ? endPos - flag.size() : 0, endPos };
	const node = createNode(ZrNodeKind.OptionKey);
	node.flag = flag;
	node.startPos = endPos ? endPos - flag.size() : 0;
	node.endPos = endPos;
	return node;
}

export function createOptionExpression(
	option: OptionKey,
	expression: OptionExpression["expression"],
): OptionExpression {
	const node = createNode(ZrNodeKind.OptionExpression);
	node.startPos = option.startPos;
	node.endPos = expression.endPos;
	node.option = option;
	node.expression = expression;
	return node;
}

export function createOperator(operator: OperatorToken["operator"], startPos?: number): OperatorToken {
	return {
		kind: ZrNodeKind.OperatorToken,
		operator,
		flags: 0,
		children: [],
		startPos,
		endPos: (startPos ?? 0) + operator.size() - 1,
	};
}

export function createVariableDeclaration(
	identifier: Identifier | PropertyAccessExpression | ArrayIndexExpression,
	expression: VariableDeclaration["expression"],
): VariableDeclaration {
	const node = createNode(ZrNodeKind.VariableDeclaration);
	node.flags = ZrNodeFlag.Let;
	node.identifier = identifier;
	node.expression = expression;
	node.children = [identifier, expression];
	node.startPos = identifier.startPos;
	node.endPos = expression.endPos;
	return node;
}

export function createVariableStatement(
	declaration: VariableDeclaration,
	modifiers?: VariableStatement["modifiers"],
): VariableStatement {
	const node = createNode(ZrNodeKind.VariableStatement);
	node.declaration = declaration;
	node.modifiers = modifiers;
	node.children = [declaration];
	return node;
}

export function createBooleanNode(value: boolean): BooleanLiteral {
	const node = createNode(ZrNodeKind.Boolean);
	node.value = value;
	return node;
}

export function createEndOfStatementNode(): EndOfStatement {
	return { kind: ZrNodeKind.EndOfStatement, flags: 0, children: [] };
}

export function createInvalidNode(
	message: InvalidNode["message"],
	expression: Node,
	startPos?: number,
	endPos?: number,
): InvalidNode {
	return {
		kind: ZrNodeKind.Invalid,
		expression,
		message,
		flags: ZrNodeFlag.ThisNodeHasError,
		children: [],
		startPos: startPos ?? expression.startPos,
		endPos: endPos ?? expression.endPos,
	};
}

export function createBinaryExpression(
	left: Expression,
	op: string,
	right: Expression,
	startPos?: number,
	endPos?: number,
): BinaryExpression {
	const node = createNode(ZrNodeKind.BinaryExpression);
	node.left = left;
	node.operator = op;
	node.right = right;
	node.startPos = startPos;
	node.endPos = endPos;

	left.parent = node;
	right.parent = node;
	node.children = [left, right];
	return node;
}

export function createUnaryExpression(op: string, expression: Node, startPos?: number, endPos?: number) {
	const node = createNode(ZrNodeKind.UnaryExpression);
	node.expression = expression;
	node.operator = op;
	node.startPos = startPos;
	node.endPos = endPos;
	node.parent = expression;
	node.children = [expression];
	return node;
}
