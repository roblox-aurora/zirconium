import { isNode, ZrNodeKind } from "../Ast/Nodes";
import { ZrNode, ZrNodeKinds, SourceFile, Declaration, Identifier, FunctionDeclaration, VariableDeclaration, EnumDeclarationStatement, ZrNodes } from "../Ast/Nodes/NodeTypes";


export enum ZrSymbolFlags {
	None = 0,
	ScopedVariable = 1 << 0,
	Function = 1 << 1,
	Interface = 1 << 2,
	TypeLiteral = 1 << 3,

	EnumMember = 1 << 4,
	Property = 1 << 5,
	
}

export interface ZrSymbolTable {
	[name: string]: ZrSymbol;
}

export class ZrSymbol {
	public declarations?: Declaration[];
	public parent?: ZrSymbol;
	public exports: ZrSymbolTable = {};

	constructor(public flags: ZrSymbolFlags, private name: string) {}
}

/** @internal */
export class ZrBinder {
	public constructor(private file: SourceFile) {}

	private createSymbol(flags: ZrSymbolFlags, name: string): ZrSymbol {
		return new ZrSymbol(flags, name);
	}

	private addDeclarationToSymbol(symbol: ZrSymbol, node: Declaration, flags: ZrSymbolFlags) {
		symbol.flags |= flags;
		node.symbol = symbol;

		if (!symbol.declarations) {
			symbol.declarations = [];
		}
		symbol.declarations.push(node);
	}

	private getDeclarationName(node: Declaration) {
		// TODO: Change identifier to use NamedDeclaration
		if (isNode(node, ZrNodeKind.Identifier)) {
			return node.name;
		}
	}

	private bindFunctionDeclaration(node: FunctionDeclaration) {
		const sym = this.createSymbol(0, node.name.name);
		this.addDeclarationToSymbol(sym, node, 0);
		return sym;
	}

	private bindEnumDeclaration(node: EnumDeclarationStatement) {
		const sym = this.createSymbol(0, node.name.name);
		this.addDeclarationToSymbol(sym, node, 0);
		return sym;
	}

	private declareSymbol(symbolTable: ZrSymbolTable, parent: ZrSymbol, node: Declaration, includes: ZrSymbolFlags, excludes: ZrSymbolFlags) {
		let name = this.getDeclarationName(node);
		
		let symbol: ZrSymbol;
		if (name !== undefined) {
			symbol = (symbolTable[name] = this.createSymbol(ZrSymbolFlags.None, name));
		} else {
			symbol = this.createSymbol(ZrSymbolFlags.None, "__missing");
		}

		this.addDeclarationToSymbol(symbol, node, includes);
		symbol.parent = parent;
	}

	private declareDeclarationSymbol(container: Declaration, symbolFlags: ZrSymbolFlags): void {
		switch (container.kind) {
			case ZrNodeKind.EnumDeclaration:
				return this.declareSymbol(
					container.symbol!.exports,
					container.symbol!,
					container,
					symbolFlags,
					0
				);
		}
	}

	private bindVariableDeclaration(node: VariableDeclaration) {
		this.declareDeclarationSymbol(node, ZrSymbolFlags.ScopedVariable);
	}

	private bind(node: ZrNodes) {
		switch (node.kind) {
			case ZrNodeKind.Identifier:
				// TODO:
			case ZrNodeKind.FunctionDeclaration:
				return this.declareDeclarationSymbol(<Declaration> node, ZrSymbolFlags.Function);
			case ZrNodeKind.VariableDeclaration:
				return this.bindVariableDeclaration(node as VariableDeclaration);
		}
	}
}
