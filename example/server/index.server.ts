import Zr from "@zirconium";
import { ZrDebug, ZrPrint, ZrRange } from "./Functions/BuiltInFunctions";
import { ZrScriptCreateResult } from "./Runtime/ScriptContext";

const test = Zr.createContext();
test.registerGlobal("print", ZrPrint);
test.registerGlobal("range", ZrRange);
test.registerGlobal("debug", ZrDebug);
const script = test.createScriptFromSource(`
	$value = ["Hello, World!"]
	
	function test($message) {
		print("The message is", $message)
	}

	test("Hello, World!")
	test "Hello, World! 2"
`);
if (script.result === ZrScriptCreateResult.OK) {
	const { current } = script;
	current.executeOrThrow();
} else {
	const [error] = script.errors;
	warn(error.message);
}
