import Zr from "@zirconium";
import { prettyPrintNodes, ZrLexer, ZrTextStream } from "Ast";
import { ZrParserV2 } from "Ast/ParserV2";
import { ZrBinder } from "Binder";
import { ZrEnum } from "Data/Enum";
import ZrLuauFunction from "Data/LuauFunction";
import ZrObject from "Data/Object";
import { $env } from "rbxts-transform-env";
import { ZrCompiler } from "VM/Compiler";
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

let source = `
	function test(value) {
		if (value) {
			print "value was true";

			if (1) {
				print(1);
			} else {
				print(2);
			}

		} else {
			print "value was false";
		}

		return value;
	}

	if test(1) {
		print "test returned true";
	} else {
		print "test returned false";
	}
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
});
lex.parseAstWithThrow().match(
	source => {
		print("AST", source, len);
		prettyPrintNodes([source], undefined, false);

		const types = new ZrBinder();
		types.bindSourceFile(source);

		const compiler = ZrCompiler.fromAst(source);

		const compiled = compiler.toBytecodeTable();
		print(compiled);

		print("Compiled Source\n", ZrCompiler.toPrettyString(compiled));

		const zr = Zr.createContext();
		const zrScript = zr.createScript(source);
		zrScript.registerFunction("print", new ZrLuauFunction((context, ...args) => print(...args)));
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
