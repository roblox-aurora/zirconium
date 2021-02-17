import { isNode, ZrNodeKind } from "@rbxts/zirconium-ast/out/Nodes";
import { Node, NodeTypes, SourceFile } from "@rbxts/zirconium-ast/out/Nodes/NodeTypes";

export default interface ZrBinder {
	// TODO
	bind(): void;
}

export enum ZrSymbolKind {
	Source,
	Function,
	Variable,
}

export interface ZrSymbol {
	kind: ZrSymbolKind;
	name: string;
}

interface FileSymbol extends ZrSymbol {
	kind: ZrSymbolKind.Source;
}

interface FunctionSymbol extends ZrSymbol {
	kind: ZrSymbolKind.Function;
}

interface VariableSymbol extends ZrSymbol {
	kind: ZrSymbolKind.Variable;
}

interface ZrSymbolMap {
	[ZrSymbolKind.Function]: FunctionSymbol;
	[ZrSymbolKind.Source]: FileSymbol;
	[ZrSymbolKind.Variable]: VariableSymbol;
}

type ZrSymbols = ZrSymbolMap[keyof ZrSymbolMap];

export default class ZrSymbolTable {
	public symbols = new Array<ZrSymbols>();
	public hasSymbolById(symbolId: string) {
		return this.symbols.find((f) => f.name === symbolId);
	}
	public addSymbol(symbol: ZrSymbols) {}
}

/** @internal */
export default class ZrBinder implements ZrBinder {
	private symbolMap = new Array<ZrSymbols>();
	private symbolStack = new Array<ZrSymbols>();
	private currentSymbol: ZrSymbols;

	public constructor(private source: SourceFile) {
		this.currentSymbol = {
			kind: ZrSymbolKind.Source,
			name: "<source>",
		};
		this.symbolStack.push(this.currentSymbol);
	}

	private getSymbolNameFor(node: Node) {
		if (isNode(node, ZrNodeKind.Identifier)) {
			return "id:" + node.name;
		}
	}

	public bindNode(node: Node, parentSymbol?: ZrSymbols) {
		if (isNode(node, ZrNodeKind.Source)) {
			for (const child of node.children) {
				this.bindNode(child);
			}
		} else if (isNode(node, ZrNodeKind.VariableDeclaration)) {
			const id = this.getSymbolNameFor(node);
		}
	}

	public bind() {}
}
