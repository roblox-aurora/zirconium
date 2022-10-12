import { ZrValue } from "Data/Locals";
import { ZrUnknown } from "Data/LuauFunction";
import { ZirconiumLogging } from "Logging";
import { $package } from "rbxts-transform-debug";
import { $env } from "rbxts-transform-env";
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
	export type Argument = ZrUnknown;

	if ($env.boolean("ZIRCONIUM_VERBOSE")) {
		ZirconiumLogging.Info("Initialized Zirconium v{VERSION}", $package.version);
	}
}

export = Zr;
