import Roact from "@rbxts/roact";
import CommandAstParser from "@rbxts/cmd-ast";
import { highlight } from "./highlight";
import SimpleLexer from "./highlight2";
import { NodeError } from "@rbxts/cmd-ast/out/Nodes/NodeTypes";
import Net from "@rbxts/net";

const evt = new Net.ClientEvent("TestSendEvent");

class TestEditor extends Roact.Component<{ source?: string }, { source: string; error: string }> {
	constructor(props: { source?: string }) {
		super(props);
		this.state = {
			source: props.source ?? "",
			error: "",
		};
	}

	public updateText = (text: string) => {
		this.setState({ source: text });

		const ast = new CommandAstParser(text, {
			prefixExpressions: true,
			variableDeclarations: true,
			innerExpressions: true,
			nestingInnerExpressions: true,
		}).Parse();
		const validate = CommandAstParser.validate(ast) as { success: boolean; errorNodes: NodeError[] };
		if (!validate.success) {
			const errNode = validate.errorNodes[0];

			this.setState({
				error: `[${errNode.node.startPos ?? 0}:${errNode.node.endPos ?? 0}] ${errNode.message}`,
			});
		} else {
			this.setState({ error: "" });
		}
	};

	public render() {
		const lineCount = this.state.source.split("\n").size();
		const minSize = math.max(150, lineCount * 18 + 20);
		return (
			<screengui>
				<frame
					Size={new UDim2(0.5, 0, 0, minSize)}
					Position={new UDim2(0, 0, 1, -minSize)}
					BackgroundColor3={Color3.fromRGB(37, 37, 37)}
					// BackgroundTransparency={0.1}
					BorderSizePixel={0}
				>
					<uipadding PaddingLeft={new UDim(0, 10)} PaddingTop={new UDim(0, 10)} />
					<textlabel
						Font="Code"
						TextSize={18}
						BackgroundTransparency={1}
						TextColor3={Color3.fromRGB(100, 100, 100)}
						Text={tostring(
							this.state.source
								.split("\n")
								.map((_, i) => tostring(i + 1))
								.join("\n"),
						)}
						Size={new UDim2(0, 20, 1, 0)}
						TextXAlignment="Right"
						TextYAlignment="Top"
					/>
					<textbox
						TextXAlignment="Left"
						TextYAlignment="Top"
						BackgroundTransparency={1}
						MultiLine
						ClearTextOnFocus={false}
						Font="Code"
						TextSize={18}
						Change={{
							Text: (rbx) => {
								this.updateText(rbx.Text);
							},
						}}
						Text={this.state.source}
						Position={new UDim2(0, 30, 0, 0)}
						Size={new UDim2(1, -30, 1, 0)}
						TextColor3={Color3.fromRGB(204, 204, 204)}
						TextTransparency={0.75}
						BackgroundColor3={Color3.fromRGB(37, 37, 37)}
						BorderSizePixel={0}
					/>
					<textlabel
						TextXAlignment="Left"
						TextYAlignment="Top"
						Font="Code"
						TextSize={18}
						BackgroundTransparency={1}
						RichText
						Text={SimpleLexer.renderTokens(new SimpleLexer(this.state.source).Parse())}
						Position={new UDim2(0, 30, 0, 0)}
						Size={new UDim2(1, -30, 1, 0)}
						TextColor3={Color3.fromRGB(204, 204, 204)}
					/>
					<textlabel
						TextXAlignment="Left"
						BackgroundTransparency={1}
						Font="Code"
						TextSize={18}
						TextColor3={Color3.fromRGB(255, 0, 0)}
						Text={this.state.error}
						Size={new UDim2(1, 0, 0, 30)}
						Position={new UDim2(0, 0, 1, -30)}
					/>
					<textbutton
						Text="Run"
						Size={new UDim2(0, 100, 0, 20)}
						Position={new UDim2(1, -100, 1, -20)}
						TextSize={18}
						BorderSizePixel={0}
						BackgroundColor3={Color3.fromRGB(80, 80, 80)}
						TextColor3={Color3.fromRGB(200, 100, 100)}
						Font="Code"
						Event={{
							MouseButton1Down: () => {
								evt.SendToServer(this.state.source);
							},
						}}
					/>
				</frame>
			</screengui>
		);
	}
}

Roact.mount(
	<screengui>
		<TestEditor
			source={`$hello = "Hello, $playerName!"
print "The statement is: $hello"`}
		/>
	</screengui>,
	game.GetService("Players").LocalPlayer.FindFirstChildOfClass("PlayerGui")!,
	"cmon",
);

print(game.GetService("HttpService").JSONEncode(new SimpleLexer(`$x = 10; cmd --testing yes`).Parse()));
