import Zr from "@zirconium";
import { ZrDebug, ZrPrint, ZrRange } from "./Functions/BuiltInFunctions";
import { ZrScriptCreateResult } from "./Runtime/ScriptContext";

const test = Zr.createContext();
test.registerGlobal("print", ZrPrint);
test.registerGlobal("range", ZrRange);
test.registerGlobal("debug", ZrDebug);
const script = test.createScriptFromSource(`
	$value = ["Hello, World!"]
	$value.0
`);
if (script.result === ZrScriptCreateResult.OK) {
	script.current.executeOrThrow();
} else {
	warn(script.errors[0].message);
}
