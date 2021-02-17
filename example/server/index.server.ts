import Zr from "@zirconium";
import { ZrValue } from "./Data/Locals";
import ZrUndefined from "./Data/Undefined";
import { ZrUserdata } from "./Data/Userdata";
import { ZrDebug, ZrPrint, ZrRange } from "./Functions/BuiltInFunctions";
import { ZrScriptCreateResult } from "./Runtime/ScriptContext";

const test = Zr.createContext();
test.registerGlobal("print", ZrPrint);
test.registerGlobal("range", ZrRange);
test.registerGlobal("debug", ZrDebug);
test.registerGlobal("null", (ZrUndefined as unknown) as ZrValue);

game.GetService("Players").PlayerAdded.Connect((player) => {
	test.registerGlobal("player", ZrUserdata.fromInstance(player));

	const script = test.createScriptFromSource(`
	$playerName = $player.Character
	$table = {
		a: $null,
		b: 20
	}
	print($null, $table2, $table)
`);
	if (script.result === ZrScriptCreateResult.OK) {
		const { current } = script;
		current.executeOrThrow();
	} else {
		const [error] = script.errors;
		warn(error?.message ?? script.message);
	}
});
