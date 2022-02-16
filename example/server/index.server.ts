import { Result } from "@rbxts/rust-classes";
import Zr from "@zirconium";
import { prettyPrintNodes, ZrLexer, ZrTextStream } from "Ast";
import ZrParser, { ZrScriptVersion } from "Ast/Parser";
import { ZrParserV2 } from "Ast/ParserV2";
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
print "hi there";
print!
print
print("Hello, world!")
`;

function rangeToString(range?: [x: number, y: number]) {
	if (range) {
		return `[ ${range[0]}, ${range[1]} ]`;
	} else {
		return `()`
	}
}

const lex = new ZrParserV2(new ZrLexer(new ZrTextStream(source)));
lex.parseAst().match((source) => {
	print("AST", source);
	prettyPrintNodes(source.children, undefined, true);
}, (err) => {
	const [source, errs] = err;
	prettyPrintNodes(source.children);

	errs.forEach(e => warn(`Error: ${rangeToString(e.range)} [${e.range ? lex.getSource(e.range) : ""}] ${e.message}`));

	print(lex.test);
});

// game.GetService("Players").PlayerAdded.Connect((player) => {
// 	const playerContext = Zr.createPlayerContext(player);
// 	playerContext.registerGlobal("player", ZrUserdata.fromInstance(player));
// 	playerContext.importGlobals(globals);
// });
