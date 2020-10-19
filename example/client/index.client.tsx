import Roact from "@rbxts/roact";
import { ZrLexer, ZrTextStream } from "@rbxts/zirconium-ast";
import { isToken, ZrTokenKind } from "@rbxts/zirconium-ast/out/Tokens/Tokens";

export {};

// const lexer = new ZrLexer(new ZrTextStream("test"));
// lexer.

interface ZrThemeOptions {
	VariableColor: string;
	KeywordColor: string;
	NumberColor: string;
	StringColor: string;
	OperatorColor: string;
	CommentColor?: string;
	BooleanLiteral?: string;
	ControlCharacters: string;
}

const DARK_THEME: ZrThemeOptions = {
	VariableColor: "#B57EDC",
	KeywordColor: "#57AFE3",
	NumberColor: "#56B6C2",
	StringColor: "#79C36C",
	OperatorColor: "#5F6672",
	BooleanLiteral: "#56B6C2",
	ControlCharacters: "rgb(50, 50, 50)",
	// CommentColor: "#5F6672",
};

function font(text: string, color: string) {
	return `<font color="${color}">${text}</font>`;
}

class ZrRichTextHighlighter {
	constructor(private lexer: ZrLexer, private options: ZrThemeOptions = DARK_THEME) {}

	public parse() {
		let str = "";
		const { options } = this;

		while (this.lexer.hasNext()) {
			const token = this.lexer.next();

			if (!token) break;
			print(token.value, token.kind);

			if (isToken(token, ZrTokenKind.Boolean)) {
				str += font(token.rawText, options.BooleanLiteral ?? options.OperatorColor);
			} else if (isToken(token, ZrTokenKind.String)) {
				const { quotes, value } = token;
				if (quotes) {
					str += font(`${quotes}${font(value, options.StringColor)}${quotes}`, options.OperatorColor);
				} else {
					str += value;
				}
			} else if (isToken(token, ZrTokenKind.InterpolatedString)) {
				const { values, variables, quotes } = token;
				const resulting = new Array<string>();
				for (const [k, v] of values.entries()) {
					resulting.push(font(v, options.StringColor));

					const matchingVar = variables[k];
					if (matchingVar !== undefined) {
						resulting.push(font(`$${matchingVar}`, options.VariableColor));
					}
				}
				str += font(
					`${quotes}${font(resulting.join(""), options.StringColor)}${quotes}`,
					options.OperatorColor,
				);
			} else if (isToken(token, ZrTokenKind.Number)) {
				str += font(token.rawText, options.NumberColor);
			} else if (isToken(token, ZrTokenKind.Identifier)) {
				str += font(`$${token.value}`, options.VariableColor);
			} else if (isToken(token, ZrTokenKind.Operator) || isToken(token, ZrTokenKind.Special)) {
				str += font(token.value, options.OperatorColor);
			} else if (isToken(token, ZrTokenKind.Keyword)) {
				str += font(token.value, options.KeywordColor);
			} else if (isToken(token, ZrTokenKind.EndOfStatement)) {
				if (token.value === "\n") {
					str += font("¬", options.ControlCharacters);
					str += token.value;
				} else {
					str += token.value;
				}
			} else if (isToken(token, ZrTokenKind.Whitespace)) {
				if (token.value === " ") {
					str += font("·", options.ControlCharacters);
				} else if (token.value === "\t") {
					str += font("→", options.ControlCharacters);
				} else {
					str += token.value;
				}
			} else if (isToken(token, ZrTokenKind.PropertyAccess)) {
				str += font(`$${token.value}`, options.VariableColor);
				for (const prop of token.properties) {
					str +=
						font(".", options.OperatorColor) +
						(prop.match("%d+")[0] ? font(prop, options.NumberColor) : font(prop, options.VariableColor));
				}
			} else if (isToken(token, ZrTokenKind.Comment)) {
				str += font(token.value, options.CommentColor ?? options.OperatorColor);
			} else {
				str += tostring(token.value);
			}
		}

		return str;
	}
}

const source = `# Hello there
print "Hello, World!"
print "Hello $again!"
$x = 10
for $i in2 range 1 10 {
	print "This is $i"
}

$y = ["Hello, World!", 10, true];
$z = $y.0.test

for $i in range(1, 10): print "this is $i"`;
const txtPr = new ZrTextStream(source);
const lex = new ZrLexer(txtPr, { ParseCommentsAsTokens: true, ParseWhitespaceAsTokens: true });
const res = new ZrRichTextHighlighter(lex);

Roact.mount(
	<screengui>
		<textlabel
			Font="Code"
			TextSize={16}
			Size={new UDim2(0, 400, 0, 400)}
			TextXAlignment="Left"
			TextYAlignment="Top"
			BackgroundColor3={Color3.fromRGB(33, 37, 43)}
			TextColor3={Color3.fromRGB(198, 204, 215)}
			RichText
			Text={res.parse()}
		/>
	</screengui>,
	game.GetService("Players").LocalPlayer.WaitForChild("PlayerGui"),
);
