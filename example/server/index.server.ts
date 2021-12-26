import { Result } from "@rbxts/rust-classes";
import Zr from "@zirconium";
import { prettyPrintNodes, ZrLexer, ZrTextStream } from "Ast";
import { ZrScriptVersion } from "Ast/Parser";
import { Token } from "Ast/Tokens/Tokens";
import { ZrEnum, ZrEnumItem } from "Data/Enum";
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
globals.registerGlobal("TestEnum", new ZrEnum(["A", "B"], "TestEnum"));
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

game.GetService("Players").PlayerAdded.Connect((player) => {
	const playerContext = Zr.createPlayerContext(player);
	playerContext.registerGlobal("player", ZrUserdata.fromInstance(player));
	playerContext.importGlobals(globals);

	const source = `values undefined undefined 10`;

	const tokenizer = new ZrLexer(new ZrTextStream(source));
	const results = new Array<Token>();
	while (tokenizer.hasNext()) {
		results.push(tokenizer.next()!);
	}
	print("tokens", results);

	const sourceResult = playerContext.parseSource(source, ZrScriptVersion.Zr2022);
	sourceResult.match(
		(sourceFile) => {
			prettyPrintNodes([sourceFile]);

			const sourceScript = playerContext.createScript(sourceFile);
			// sourceScript._printScriptGlobals();
			sourceScript.executeOrThrow();
		},
		(err) => {
			const { message, errors } = err;

			warn(
				`${message} - ` +
					errors
						.map((e) => {
							if (e.token) {
								return `[${e.token.startPos}:${e.token.endPos}] ${e.message} '${e.token.value}'`;
							} else if (e.node) {
								return `<${e.node.kind}> ${e.message}`;
							}

							return e.message;
						})
						.join(", "),
			);
		},
	);
});
