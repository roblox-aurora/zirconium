import { CustomCommandType } from "./Types";
import util from "../util";

export const PlayerType: CustomCommandType<Player[], Player> = {
	transform(value, executor) {
		if (value === "me") {
			return [executor];
		}

		return game
			.GetService("Players")
			.GetPlayers()
			.filter((f) => util.startsWithIgnoreCase(f.Name, value));
	},
	validate(value) {
		return value.size() > 0 ? { success: true } : { success: false, reason: "No matching players" };
	},
	parse(value) {
		return value[0];
	},
};
