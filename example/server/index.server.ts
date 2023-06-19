import inspect from "@rbxts/inspect";
import Zr from "@zirconium";
import { factory, prettyPrintNodes, ZrLexer, ZrParser, ZrTextStream } from "Ast";
import { isNode, ZrNodeKind } from "Ast/Nodes";
import { CallExpression, Expression, SourceBlock, StringLiteral } from "Ast/Nodes/NodeTypes";
import { ZrParserV2 } from "Ast/ParserV2";
import { ZrBinder } from "Binder";
import { InstanceConstructor, ZrInstanceUserdata } from "Data/Instances";
import { $env } from "rbxts-transform-env";
import { ZrLibs } from "std/Globals";

let source = `
	let part = Instance.create("Part")
	part.name = "testing lol"

	let test = {}
	test.a = 10
	test.b = "I am a value lol"

	print(part, part.name, part.parent, test)

	part
`;

function rangeToString(range?: [x: number, y: number]) {
	if (range) {
		return `[ ${range[0]}, ${range[1]} ]`;
	} else {
		return `()`;
	}
}

let len = source.size();

const lex = new ZrParserV2(new ZrLexer(new ZrTextStream(source)), {
	FinalExpressionImplicitReturn: true,
	UseLegacyCommandCallSyntax: false,
	ExperimentalArrowFunctions: true,
	TransformDebug: {
		pretty_print: [
			ZrNodeKind.Source,
			(expr: SourceBlock) => {
				prettyPrintNodes(expr.statements);
				return factory.createEmptyExpression();
			},
		],
		inspect: [
			ZrNodeKind.Source,
			(expr: SourceBlock) => {
				return factory.createStringNode(inspect(expr.statements));
			},
		] as const,
		kind_name: [
			ZrNodeKind.CallExpression,
			(source: CallExpression) => {
				return factory.createStringNode(ZrNodeKind[source.arguments[0].kind]);
			},
		] as const,
		assert_kind: [
			ZrNodeKind.CallExpression,
			(source: CallExpression) => {
				const [expression, kind] = source.arguments;

				assert(isNode(kind, ZrNodeKind.String));

				return factory.createCallExpression(factory.createIdentifier("assert"), [
					factory.createBooleanNode(ZrNodeKind[expression.kind] === kind.text),
					factory.createStringNode(`Mismatch, expected ${kind.text} got ${ZrNodeKind[expression.kind]}`),
				]);
			},
		],
	},
});
lex.parseAstWithThrow().match(
	source => {
		// print("AST", source, len);
		// prettyPrintNodes([source], undefined, false);

		const types = new ZrBinder();
		types.bindSourceFile(source);

		const zr = Zr.createContext();
		zr.loadLibrary(ZrLibs.stdlib);
		zr.loadLibrary(ZrLibs.experimentallib);
		zr.registerGlobal("Instance", InstanceConstructor);

		const testObject = new ZrInstanceUserdata(new Instance("Part"));

		const zrScript = zr.createScript(source);
		const result = zrScript.executeOrThrow();
		print("result is", result);
	},
	err => {
		const [source, errs] = err;
		prettyPrintNodes([source], undefined, true);

		errs.forEach(e =>
			warn(`Error: ${rangeToString(e.range)} [${e.range ? lex.getSource(e.range) : ""}] ${e.message}`),
		);

		if ($env.boolean("ZIRCONIUM_TEST_PRINT_NODES")) {
			print(lex.nodes);
		}
	},
);

// game.GetService("Players").PlayerAdded.Connect((player) => {
// 	const playerContext = Zr.createPlayerContext(player);
// 	playerContext.registerGlobal("player", ZrUserdata.fromInstance(player));
// 	playerContext.importGlobals(globals);
// });
