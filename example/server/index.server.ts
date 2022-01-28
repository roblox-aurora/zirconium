import { Result } from "@rbxts/rust-classes";
import Zr from "@zirconium";
import { prettyPrintNodes, ZrLexer, ZrTextStream } from "Ast";
import ZrParser, { ZrScriptVersion } from "Ast/Parser";
import { ZrParserV2 } from "Ast/ParserV2";
import { Token } from "Ast/Tokens/Tokens";
import { ZrEnum } from "Data/Enum";
import ZrLuauFunction from "Data/LuauFunction";
import ZrObject from "Data/Object";
import { ZrValue } from "./Data/Locals";
import ZrUndefined from "./Data/Undefined";
import { ZrUserdata } from "./Data/Userdata";
import { ZrDebug, ZrPrint, ZrRange } from "./Functions/BuiltInFunctions";
import { ZrScriptCreateResult } from "./Runtime/ScriptContext";

const globals = Zr.createContext();
globals.registerGlobal("print", ZrPrint);
globals.registerGlobal("range", ZrRange);
globals.registerGlobal("debug", ZrDebug);
globals.registerGlobal("TestEnum", ZrEnum.fromArray("TestEnum", ["A", "B"]));
globals.registerGlobal(
	"values",
	new ZrLuauFunction((context, ...args) => {
		return `[ ${args.map(tostring).join(", ")} ]`;
	}),
);
globals.registerGlobal("null", (ZrUndefined as unknown) as ZrValue);
globals.registerGlobal(
	"test",
	ZrObject.fromRecord({
		example: new ZrLuauFunction((_, input) => {
			print("Example worked", input);
		}),
	}),
);

let source = `
# testing inline literals
"Hello there"
10
true
[ 1, 2, 3 ]
{ a: "A", b: "B", "c": "C" }

# Binary expressions
5 + 5 # should be fine
5 * 5 + 10 # Precedence here needs fixing
(5 * 5) + 10 # Predence here is forced. So fine.

# Call expressions
bang! # bang operator
command "string" 42 true [ "an", "array" ] { objects: true } $("Give me an inline expression, " + "please!")
funcName("string", 42, true, [ "an", "array" ], { objects: true }, "Give me an inline expression, " + "please!")

# Declarations
function test() {
	# The body stuff should work here.
}
`;


const lex = new ZrParserV2(new ZrLexer(new ZrTextStream(source)));
lex.parseAst().match((source) => {
	print("AST", source);
	prettyPrintNodes(source.children);
}, (err) => {
	const [source, errs] = err;
	errs.forEach(e => warn(e.message));
});

print("---");

const oldLex = new ZrParser(new ZrLexer(new ZrTextStream(source)));
const nodes = oldLex.parse()
prettyPrintNodes(nodes.children);

game.GetService("Players").PlayerAdded.Connect((player) => {
	const playerContext = Zr.createPlayerContext(player);
	playerContext.registerGlobal("player", ZrUserdata.fromInstance(player));
	playerContext.importGlobals(globals);

	const source = `print(-10)
	-20-3`;


	// const sourceResult = playerContext.parseSource(source, ZrScriptVersion.Zr2022);
	// sourceResult.match(
	// 	(sourceFile) => {
	// 		prettyPrintNodes([sourceFile]);

	// 		const sourceScript = playerContext.createScript(sourceFile);
	// 		// sourceScript._printScriptGlobals();
	// 		sourceScript.executeOrThrow();
	// 	},
	// 	(err) => {
	// 		const { message, errors } = err;

	// 		warn(
	// 			`${message} - ` +
	// 				errors
	// 					.map((e) => {
	// 						if (e.token) {
	// 							return `[${e.token.startPos}:${e.token.endPos}] ${e.message} '${e.token.value}'`;
	// 						} else if (e.node) {
	// 							return `<${e.node.kind}> ${e.message}`;
	// 						}

	// 						return e.message;
	// 					})
	// 					.join(", "),
	// 		);
	// 	},
	// );
});
