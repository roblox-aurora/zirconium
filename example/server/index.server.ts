import { ast, ZrLexer, ZrParser, ZrTextStream } from "@rbxts/zirconium-ast";
import {
	createBlock,
	createCommandName,
	createCommandSource,
	createCommandStatement,
	createIdentifier,
	createNumberNode,
	createStringNode,
	createVariableDeclaration,
	createVariableStatement,
} from "@rbxts/zirconium-ast/out/Nodes/Create";
import { prettyPrintNodes } from "@rbxts/zirconium-ast/out/Utility";
import ZrLuauFunction from "./Data/LuauFunction";
import { ZrDebug, ZrPrint, ZrRange } from "./Functions/BuiltInFunctions";
import ZrScript from "./Runtime/Script";

const debugPrint = createCommandStatement(createCommandName(createStringNode("debug.print")), []);

const source2 = createCommandSource([
	createVariableStatement(createVariableDeclaration(createIdentifier("test"), createNumberNode(10))),
	debugPrint,
	createBlock([
		createVariableStatement(createVariableDeclaration(createIdentifier("test2"), createNumberNode(1337))),
		debugPrint,
	]),
	debugPrint,
]);

const stringSrc = `
	if $value {
		print "!!!"
	}
`;
let t = tick();

const textStr = new ZrTextStream(stringSrc);
const txtTkn = new ZrLexer(textStr);
print("tokenizer", `${(tick() - t) * 1000}ms`);
t = tick();

const stst = new ZrParser(txtTkn);
const source = stst.parseOrThrow();
print("parser", `${(tick() - t) * 1000}ms`);
t = tick();

prettyPrintNodes([source]);
const test = new ZrScript(source, {});
test.registerFunction("print", ZrPrint);
test.registerFunction("range", ZrRange);
test.registerFunction("debug", ZrDebug);
test.registerFunction(
	"pipe",
	ZrLuauFunction.createDynamic((ctx, arg) => {
		if (ctx.getInput().size() > 0) {
			print(ctx.getInput().join(", "));
			ctx.pushOutput("test2" + ctx.getInput()[ctx.getInput().size() - 1]);
		} else {
			ctx.pushOutput("test" + tostring(arg));
		}
	}),
);
test.executeOrThrow();

print("execution", `${(tick() - t) * 1000}ms`);
t = tick();
