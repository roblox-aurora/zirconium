import { ZrValue } from "Data/Locals";
import { ZrLuauArgument } from "Data/LuauFunction";
import ZrPlayerScriptContext from "Runtime/PlayerScriptContext";
import ZrScriptContext from "./Runtime/ScriptContext";

/**
 * Zirconium Language Namespace
 */
namespace Zr {
	const contexts = new Map<string, ZrScriptContext>();

	/**
	 * Create a new Zirconium script context to execute code against
	 */
	export function createContext(name = game.GetService("HttpService").GenerateGUID()) {
		if (contexts.has(name)) throw `Context '${name}' already exists.`;

		const ctx = new ZrScriptContext();
		contexts.set(name, ctx);
		return ctx;
	}

	export function createPlayerContext(player: Player, name = game.GetService("HttpService").GenerateGUID()) {
		if (contexts.has(name)) throw `Context '${name}' already exists.`;

		const ctx = new ZrPlayerScriptContext(player);
		contexts.set(name, ctx);
		return ctx;
	}

	export type Value = ZrValue;
	export type Argument = ZrLuauArgument;
}

export = Zr;
