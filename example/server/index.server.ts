import Zr from "@zirconium";
import ZrLuauFunction from "Data/LuauFunction";
import { ZrValue } from "./Data/Locals";
import ZrUndefined from "./Data/Undefined";
import { ZrUserdata } from "./Data/Userdata";
import { ZrDebug, ZrPrint, ZrRange } from "./Functions/BuiltInFunctions";
import { ZrScriptCreateResult } from "./Runtime/ScriptContext";

const test = Zr.createContext();
test.registerGlobal("print", ZrPrint);
test.registerGlobal("range", ZrRange);
test.registerGlobal("debug", ZrDebug);
test.registerGlobal(
	"value",
	new ZrLuauFunction((context, value) => {
		return value;
	}),
);
test.registerGlobal("null", (ZrUndefined as unknown) as ZrValue);

game.GetService("Players").PlayerAdded.Connect((player) => {
	test.registerGlobal("player", ZrUserdata.fromInstance(player));

	const script = test.createScriptFromSource(`
	const x = 10;
	print(x, x);
	`);
	if (script.result === ZrScriptCreateResult.OK) {
		const { current } = script;
		current.executeOrThrow();
	} else {
		const [error] = script.errors;
		if (error) {
			warn(error.message, error.node?.startPos ?? error.token?.value);
		}

		warn(error?.message ?? script.message);
	}
});
