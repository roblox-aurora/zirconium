import Zr from "@zirconium";
import { ZrDebug, ZrPrint, ZrRange } from "./Functions/BuiltInFunctions";
import { ZrScriptCreateResult } from "./Runtime/ScriptContext";

const test = Zr.createContext();
test.registerGlobal("print", ZrPrint);
test.registerGlobal("range", ZrRange);
test.registerGlobal("debug", ZrDebug);
const script = test.createScriptFromSource(`
	$value = ["Hello, World!"]
	$arr = {a: 10}
	print $value.0
	print([1, 2, 3], k: true)
	if $value {
		print "has value"
	}

	function test($x) {
		if $prettyPrint {
			print("**", $x, "**")
		} else {
			print($x)
		}
	}

	test("Hello there", prettyPrint: true)
`);
if (script.result === ZrScriptCreateResult.OK) {
	const { current } = script;
	current.executeOrThrow();
} else {
	const [error] = script.errors;
	warn(error?.message ?? script.message);
}
