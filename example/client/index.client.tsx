import Roact from "@rbxts/roact";
import { ZrRichTextHighlighter } from "@rbxts/zirconium-ast";

export {};

const source = `# it does functions
function example($message) {
    print "The message was: $message"
}

example("Hello, World!"); # YEET
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
