import Zr from "@zirconium";
import { ZrDebug, ZrPrint, ZrRange } from "./Functions/BuiltInFunctions";
import { ZrScriptCreateResult } from "./Runtime/ScriptContext";

const test = Zr.createContext();
test.registerGlobal("print", ZrPrint);
test.registerGlobal("range", ZrRange);
test.registerGlobal("debug", ZrDebug);
const script = test.createScriptFromSource(`
	if !$value: print "!!!"
	for $value in range 1 10: print $value {
`);
if (script.result === ZrScriptCreateResult.OK) {
	script.current.executeOrThrow();
} else {
	warn(script.errors[0].message);
}
