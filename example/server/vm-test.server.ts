import { ZrLexer, ZrTextStream } from "Ast";
import { ZrParserV2 } from "Ast/ParserV2";
import { ZrVM } from "VM";
import { ZrCompiler } from "VM/Compiler";
import { ZrInstructionTable } from "VM/Instructions";

const source = `
    let pow_plus_5 = pow(2, 8) + 5;
    let again = 10 + pow_plus_5;

    let x = {a: 10, b: 20};
    let y = [1, 2, 3] + [];

    let z = y[0];
    let z2 = y.name;
    let z3 = y["name2"]
`;

const lex = new ZrParserV2(new ZrLexer(new ZrTextStream(source)), {
	FinalExpressionImplicitReturn: true,
});
lex.parseAstWithThrow().match(
	source => {
		const compiler = ZrCompiler.loadFile(source);
		// const compiled = compiler.compile();

		print("compiler", compiler);

		// const vm = new ZrVM(compiled, ZrInstructionTable);
		// vm.run();
	},
	err => {},
);
