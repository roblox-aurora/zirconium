import Zr from "@zirconium";
import { prettyPrintNodes, ZrLexer, ZrTextStream } from "Ast";
import { ZrParserV2 } from "Ast/ParserV2";
import { ZrBinder } from "Binder";
import { $env } from "rbxts-transform-env";
import { ZrLibs } from "std/Globals";

let source = `
	print(_VERSION)
	print(typeof, print, warn, error, Array, Object);
	print(typeof(Array), typeof(Array) == "userdata");
	assert(typeof(Array) == "userdata");
	print(Array.sized(10));
	print(math, math.clamp 200 0 100);

	function test() {
		print "this was called from task.spawn!";
	}
	task.defer(test)
	print "I'm cool!";

	task.delay 5 test;
	error "you suck lol";
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

		const zr = Zr.createContext();
		zr.loadLibrary(ZrLibs.stdlib);
		zr.loadLibrary(ZrLibs.experimentallib);

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
