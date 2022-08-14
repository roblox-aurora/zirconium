import Zr from "@zirconium";
import { prettyPrintNodes, ZrLexer, ZrTextStream } from "Ast";
import { ZrParserV2 } from "Ast/ParserV2";
import { ZrEnum } from "Data/Enum";
import ZrLuauFunction from "Data/LuauFunction";
import ZrObject from "Data/Object";
import { $env } from "rbxts-transform-env";
import { ZrValue } from "./Data/Locals";
import ZrUndefined from "./Data/Undefined";
import { ZrDebug, ZrPrint, ZrRange } from "./Functions/BuiltInFunctions";

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
globals.registerGlobal("null", ZrUndefined as unknown as ZrValue);
globals.registerGlobal(
	"test",
	ZrObject.fromRecord({
		example: new ZrLuauFunction((_, input) => {
			print("Example worked", input);
		}),
	}),
);

let source = `print(true)`;

function rangeToString(range?: [x: number, y: number]) {
	if (range) {
		return `[ ${range[0]}, ${range[1]} ]`;
	} else {
		return `()`;
	}
}

const flags = new Set(
	$env
		.string("ZIRCONIUM_TEST_FLAGS", "")
		.split(";")
		.filter(f => f !== ""),
);

const lex = new ZrParserV2(new ZrLexer(new ZrTextStream(source)));
lex.parseAstWithThrow().match(
	source => {
		print("AST", source);
		prettyPrintNodes([source], undefined, false);
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
