import { ZrLexer, ZrTextStream } from "@rbxts/zirconium-ast";
import { CommandSource } from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";
import ZrParser from "@rbxts/zirconium-ast/out/Parser";

export default class ZrRuntime {
	public constructor(private source: CommandSource) {}

	public static execute(source: string) {
		const textStream = new ZrTextStream(source);
		const lexer = new ZrLexer(textStream, {});
		const parser = new ZrParser(lexer);

		// return new ZrRuntime(parser);
	}
}
