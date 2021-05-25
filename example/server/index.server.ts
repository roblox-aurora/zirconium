import { Result } from "@rbxts/rust-classes";
import Zr from "@zirconium";
import { prettyPrintNodes } from "Ast";
import { ZrScriptVersion } from "Ast/Parser";
import ZrLuauFunction from "Data/LuauFunction";
import { ZrValue } from "./Data/Locals";
import ZrUndefined from "./Data/Undefined";
import { ZrUserdata } from "./Data/Userdata";
import { ZrDebug, ZrPrint, ZrRange } from "./Functions/BuiltInFunctions";
import { ZrScriptCreateResult } from "./Runtime/ScriptContext";

const globals = Zr.createContext();
globals.registerGlobal("print", ZrPrint);
globals.registerGlobal("range", ZrRange);
globals.registerGlobal("debug", ZrDebug);
globals.registerGlobal(
	"value",
	new ZrLuauFunction((context, value) => {
		return value;
	}),
);
globals.registerGlobal("null", (ZrUndefined as unknown) as ZrValue);

game.GetService("Players").PlayerAdded.Connect((player) => {
	const playerContext = Zr.createPlayerContext(player);
	playerContext.registerGlobal("player", ZrUserdata.fromInstance(player));
	playerContext.importGlobals(globals);

	const sourceResult = playerContext.parseSource(
		`# Test using identifiers
	const x = 10
	$y = 20
	print $x x
	{
		const x = 20
		$y = 100
		print $x $y
	}
	print $x $y
	k = {}`,
		ZrScriptVersion.Zr2021,
	);
	sourceResult.match(
		(sourceFile) => {
			prettyPrintNodes([sourceFile]);

			const script = playerContext.createScript(sourceFile);
			script._printScriptGlobals();
			script.executeOrThrow();
		},
		(err) => {
			const { message } = err;
			warn(message);
		},
	);
});
