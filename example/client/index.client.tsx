import Roact from "@rbxts/roact";
import { ZrRichTextHighlighter } from "@rbxts/zirconium-ast";

export {};

const source = `# it does functions
x = 10
$y = 20
test.print2!
test.print
enum Test {
    ItemA,
    ItemB,
    ItemC,
}
`;
const res = new ZrRichTextHighlighter(source);

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
