import { SourceFile } from "Ast/Nodes/NodeTypes";
import { ZrValue } from "Data/Locals";
import { ZrInstanceUserdata, ZrUserdata } from "Data/Userdata";
import ZrScript from "./Script";
import ZrScriptContext from "./ScriptContext";

export default class ZrPlayerScriptContext extends ZrScriptContext {
	public constructor(private player: Player) {
		super();
	}

	public createScript(nodes: SourceFile) {
		this.registerGlobal("executor", new ZrInstanceUserdata(this.player));
		return new ZrScript(nodes, this.getGlobals(), this.player);
	}
}
