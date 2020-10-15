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
    $variable = 10
    $x = 10
    $y = {
        a: 10,
        b: {
            c: 20
        }
    }
    debug
    {
        $innerVariable = 20
        $variable = 25
        debug
    }
    debug
`;
let t = tick();

const textStr = new ZrTextStream(stringSrc);
const txtTkn = new ZrLexer(textStr, {});
print("tokenizer", `${(tick() - t) * 1000}ms`);
t = tick();

const stst = new ZrParser(txtTkn);
const source = stst.parseOrThrow();
print("parser", `${(tick() - t) * 1000}ms`);
t = tick();

const test = new ZrScript(source, {});
test.execute();

print("execution", `${(tick() - t) * 1000}ms`);
t = tick();
