import ZrTextStream from "./TextStream";
import Grammar, { BooleanLiteralTokens, EndOfStatementTokens, OperatorTokens, PunctuationTokens } from "./Tokens/Grammar";
import {
	BooleanToken,
	CommentToken,
	EndOfStatementToken,
	IdentifierToken,
	InterpolatedStringToken,
	isToken,
	joinInterpolatedString,
	KeywordToken,
	NumberToken,
	OperatorToken,
	OptionToken,
	PropertyAccessToken,
	SpecialToken,
	StringToken,
	Token,
	WhitespaceToken,
	ZrTokenFlag,
	ZrTokenKind,
} from "./Tokens/Tokens";

const enum TokenCharacter {
	Hash = "#",
	Dollar = "$",
	DoubleQuote = '"',
	SingleQuote = "'",
	Dot = ".",
	Dash = "-",
	Bang = "!",
}

export interface ZrLexerOptions {
	readonly SyntaxHighlighterLexer: boolean;
	readonly ExperimentalSyntaxHighlighter: boolean;
	readonly CommandNames: string[];
}

const DEFAULTS = identity<ZrLexerOptions>({
	/**
	 * Enables the lexer to add all the tokens for syntax highlighting
	 */
	SyntaxHighlighterLexer: false,
	ExperimentalSyntaxHighlighter: false,
	CommandNames: [],
});

/**
 * The lexer for Zirconium
 */
export default class ZrLexer {
	private static readonly OPERATORS = Grammar.Operators;
	private static readonly ENDOFSTATEMENT = Grammar.EndOfStatement;
	private static readonly SPECIAL = Grammar.Punctuation;
	private static readonly BOOLEAN = Grammar.BooleanLiterals;

	public static IsPrimitiveValueToken = (token: Token): token is StringToken | InterpolatedStringToken | NumberToken | BooleanToken => {
		return token.kind === ZrTokenKind.String || token.kind === ZrTokenKind.InterpolatedString || token.kind === ZrTokenKind.Number || token.kind === ZrTokenKind.Boolean;
	};

	private options: ZrLexerOptions;

	public constructor(private stream: ZrTextStream, options?: Partial<ZrLexerOptions>) {
		this.options = { ...DEFAULTS, ...options };
	}

	private isNumeric = (c: string) => c.match("[%d]")[0] !== undefined;
	private isSpecial = (c: string) => ZrLexer.SPECIAL.includes(c as PunctuationTokens);
	private isNotNewline = (c: string) => c !== "\n";
	private isNotEndOfStatement = (c: string) => c !== "\n" && c !== ";";
	private isKeyword = (c: string) => (Grammar.Keywords as readonly string[]).includes(c);
	private isWhitespace = (c: string) => c.match("%s")[0] !== undefined && c !== "\n";
	private isId = (c: string) => c.match("[%w_]")[0] !== undefined;
	private isOptionId = (c: string) => c.match("[%w_-]")[0] !== undefined;

	public getStreamSub(x: number, y: number) {
		return this.stream.sub(x, y);
	}

	/** @internal */
	public getStream() {
		return this.stream;
	}

	/**
	 * Resets the stream pointer to the beginning
	 */
	public reset() {
		this.stream.reset();
	}

	/**
	 * Reads while the specified condition is met, or the end of stream
	 */
	private readWhile(condition: (str: string) => boolean) {
		let src = "";
		while (this.stream.hasNext() === true && condition(this.stream.peek()) === true) {
			src += this.stream.next();
		}
		return src;
	}

	public parseLongString(character: string): [source: string[], vars: string[], closed: boolean] {
		let str = "";
		const src = new Array<string>();
		const vars = new Array<string>();
		let escaped = false;
		let closed = false;

		this.stream.next(); // eat start character

		while (this.stream.hasNext()) {
			const char = this.stream.next();
			if (escaped) {
				escaped = false;
			} else if (char === "\\") {
				escaped = true;
			} else if (char === character) {
				closed = true;
				break;
			} else if (char === TokenCharacter.Dollar) {
				src.push(str);
				str = "";
				const id = this.readWhile(this.isId);
				vars.push(id);
				continue;
			}

			str += char;
		}

		if (str !== "") {
			src.push(str);
		}

		return [src, vars, closed];
	}

	/**
	 * Reads a comment
	 * `# comment example`
	 */
	private readComment() {
		const result = this.readWhile(this.isNotNewline);
		return result;
	}

	private readStringToken(startCharacter: string) {
		const startPos = this.stream.getPtr(); // ¯\_(ツ)_/¯
		const [values, variables, closed] = this.parseLongString(startCharacter);
		const endPos = this.stream.getPtr() - 1;

		if (variables.size() === 0) {
			return identity<StringToken>({
				kind: ZrTokenKind.String,
				value: values.join(" "),
				startPos,
				closed,
				flags: closed ? ZrTokenFlag.None : ZrTokenFlag.UnterminatedString,
				endPos,
				startCharacter,
				endCharacter: closed ? startCharacter : undefined,
			});
		} else {
			return identity<InterpolatedStringToken>({
				kind: ZrTokenKind.InterpolatedString,
				values,
				value: joinInterpolatedString(values, variables),
				variables,
				closed,
				startPos,
				flags: (closed ? ZrTokenFlag.None : ZrTokenFlag.UnterminatedString) | ZrTokenFlag.Interpolated,
				endPos,
				quotes: startCharacter,
			});
		}
	}

	private parseBoolean(value: string) {
		if (value === "true") {
			return true;
		}

		return false;
	}

	/** @internal */
	public lastText(count: number) {
		return this.stream.sub(math.max(0, this.stream.getPtr() - count), this.stream.getPtr());
	}

	private readLiteralString() {
		const startPos = this.stream.getPtr();
		const literal = this.readWhile(
			(c) =>
				this.isNotEndOfStatement(c) &&
				!this.isWhitespace(c) &&
				!this.isSpecial(c) &&
				c !== TokenCharacter.DoubleQuote &&
				c !== TokenCharacter.SingleQuote &&
				c !== TokenCharacter.Bang &&
				c !== "\n",
		);
		const endPos = this.stream.getPtr() - 1;

		if (this.isKeyword(literal)) {
			return identity<KeywordToken>({
				kind: ZrTokenKind.Keyword,
				startPos,
				endPos,
				flags: ZrTokenFlag.None,
				value: literal,
			});
		}

		if (ZrLexer.BOOLEAN.includes(literal as BooleanLiteralTokens)) {
			return identity<BooleanToken>({
				kind: ZrTokenKind.Boolean,
				startPos,
				endPos,
				flags: ZrTokenFlag.None,
				value: this.parseBoolean(literal),
				rawText: literal,
			});
		}

		const previous = this.prev(2);

		if (previous && this.prevIs(ZrTokenKind.Keyword, 2) && previous.value === "function") {
			return identity<IdentifierToken>({
				kind: ZrTokenKind.Identifier,
				startPos,
				endPos,
				flags: ZrTokenFlag.FunctionName,
				value: literal,
			});
		}

		if (previous && this.prevIs(ZrTokenKind.Keyword, 2) && (previous.value === "let" || previous.value === "const")) {

			if (this.options.SyntaxHighlighterLexer && this.options.ExperimentalSyntaxHighlighter) {
				const nextToken = this.peekNext(2);
				if (nextToken?.kind === ZrTokenKind.Keyword && nextToken.value === "function") {
					return identity<IdentifierToken>({
						kind: ZrTokenKind.Identifier,
						startPos,
						endPos,
						flags: ZrTokenFlag.FunctionName,
						value: literal,
					});			
				}
			}

			return identity<IdentifierToken>({
				kind: ZrTokenKind.Identifier,
				startPos,
				endPos,
				flags: ZrTokenFlag.VariableDeclaration,
				value: literal,
			});			
		}

		if (this.options.SyntaxHighlighterLexer && this.options.ExperimentalSyntaxHighlighter) {
			const nextToken = this.peekNext();
			if (nextToken?.kind === ZrTokenKind.Special && nextToken.value === ":")  {
				return identity<StringToken>({
					kind: ZrTokenKind.String,
					startPos,
					endPos,
					closed: true,
					flags: ZrTokenFlag.Label,
					value: literal,
				});
			}
		}

		
		// return identity<IdentifierToken>({
		// 	kind: ZrTokenKind.Identifier,
		// 	startPos,
		// 	endPos,
		// 	// closed: true,
		// 	flags: ZrTokenFlag.FunctionName,
		// 	value: literal,
		// });
		this.stream.setPtr(startPos);
		return this.readIdentifier(ZrTokenFlag.FunctionName, startPos);
	}

	private readNumber() {
		const startPos = this.stream.getPtr();

		let isDecimal = false;
		const number = this.readWhile((c) => {
			if (c === ".") {
				if (isDecimal) {
					return false;
				}

				isDecimal = true;
				return true;
			}

			return this.isNumeric(c);
		});
		const endPos = this.stream.getPtr() - 1;
		return identity<NumberToken>({
			kind: ZrTokenKind.Number,
			value: tonumber(number)!,
			startPos,
			flags: ZrTokenFlag.None,
			endPos,
			rawText: number,
		});
	}

	private readVariableToken() {
		const startPos = this.stream.getPtr();
		const flags = ZrTokenFlag.VariableDollarIdentifier;

		// skip $
		this.stream.next();

		return this.readIdentifier(flags,startPos);
	}

	private readOption(prefix: string) {
		const startPos = this.stream.getPtr();
		const optionName = this.readWhile(this.isOptionId);
		const endPos = this.stream.getPtr() - 1;
		return identity<OptionToken>({
			kind: ZrTokenKind.Option,
			value: optionName,
			flags: ZrTokenFlag.None,
			startPos,
			endPos,
			prefix,
		});
	}

	/**
	 * Similar to `readNext`, except resets the pointer back to the start of the read afterwards.
	 */
	private peekNext(offset = 1) {
		const start = this.stream.getPtr();
		let i = 0;
		let value: Token | undefined;
		while (i < offset) {
			this.readWhile(this.isWhitespace);
			value = this.readNext();
			i++;
		}
		this.stream.setPtr(start);
		return value;
	}

	/**
	 * Gets the next token
	 */
	private readNext(): Token | undefined {
		const { options } = this;

		// skip whitespace
		if (!options.SyntaxHighlighterLexer) this.readWhile(this.isWhitespace);
		const startPos = this.stream.getPtr();

		if (!this.stream.hasNext()) {
			return undefined;
		}

		// Get the next token
		const char = this.stream.peek();

		if (options.SyntaxHighlighterLexer && this.isWhitespace(char)) {
			this.stream.next();
			return identity<WhitespaceToken>({
				kind: ZrTokenKind.Whitespace,
				value: char,
				flags: ZrTokenFlag.None,
				startPos: startPos,
				endPos: startPos,
			});
		}

		if (char === TokenCharacter.Hash) {
			const value = this.readComment();
			if (options.SyntaxHighlighterLexer) {
				return identity<CommentToken>({
					kind: ZrTokenKind.Comment,
					value,
					flags: ZrTokenFlag.None,
					startPos,
					endPos: startPos + value.size(),
				});
			}
			return this.readNext();
		}

		if (char === TokenCharacter.Dollar) {
			return this.readVariableToken();
		}

		// Handle double quote and single quote strings
		if (char === TokenCharacter.DoubleQuote || char === TokenCharacter.SingleQuote) {
			return this.readStringToken(char);
		}

		if (char === TokenCharacter.Dash) {
			const nextChar = this.stream.peek(1);
			if (nextChar === TokenCharacter.Dash) {
				// if dash dash prefix (aka 'option')
				this.stream.next(2); // strip both dashes
				return this.readOption("--");
			}
		}

		if (this.isNumeric(char)) {
			return this.readNumber();
		}

		if (ZrLexer.OPERATORS.includes(char as OperatorTokens)) {
			return identity<OperatorToken>({
				kind: ZrTokenKind.Operator,
				startPos,
				flags: ZrTokenFlag.None,
				endPos: startPos + char.size(),
				value: this.readWhile((c) => ZrLexer.OPERATORS.includes(c as OperatorTokens)),
			});
		}

		if (ZrLexer.ENDOFSTATEMENT.includes(char as EndOfStatementTokens)) {
			return identity<EndOfStatementToken>({
				kind: ZrTokenKind.EndOfStatement,
				startPos,
				flags: ZrTokenFlag.None,
				endPos: startPos,
				value: this.stream.next(),
			});
		}

		if (ZrLexer.SPECIAL.includes(char as PunctuationTokens)) {
			if (char === ":") {
				const prev = this.prevSkipWhitespace();
				if (prev) {
					prev.flags |= ZrTokenFlag.Label;
				}
			}

			return identity<SpecialToken>({
				kind: ZrTokenKind.Special,
				startPos,
				endPos: startPos,
				flags: ZrTokenFlag.None,
				value: this.stream.next(),
			});
		}

		return this.readLiteralString();

	}

	public readIdentifier(flags: ZrTokenFlag, startPos = this.stream.getPtr()) {
		const properties = new Array<string>();

		// read the id
		const id = this.readWhile(this.isId);

		// read any property access
		while (this.stream.hasNext() && this.stream.peek() === ".") {
			this.stream.next();
			const id = this.readWhile(this.isId);
			if (id === "") {
				flags = ZrTokenFlag.InvalidIdentifier;
			}
			properties.push(id);
		}

		const endPos = this.stream.getPtr() - 1;

		if (properties.size() > 0) {
			return identity<PropertyAccessToken>({
				kind: ZrTokenKind.PropertyAccess,
				startPos,
				endPos,
				flags,
				properties,
				value: id,
			});
		} else {
			return identity<IdentifierToken>({
				kind: ZrTokenKind.Identifier,
				startPos,
				flags,
				endPos,
				value: id,
			});
		}
	}

	public isNextOfKind(kind: ZrTokenKind) {
		return this.peek()?.kind === kind;
	}

	public isNextOfAnyKind(...kind: ZrTokenKind[]) {
		for (const k of kind) {
			if (this.isNextOfKind(k)) {
				return true;
			}
		}
		return false;
	}

	private fetchNextToken() {
		if (this.currentToken) {
			return this.currentToken;
		} else {
			const nextToken = this.readNext();
			if (nextToken) this.previousTokens.push(nextToken);
			return nextToken;
		}
	}

	private previousTokens = new Array<Token>();
	private currentToken: Token | undefined;
	public peek() {
		this.currentToken = this.fetchNextToken();
		return this.currentToken;
	}

	public prev(offset = 1) {
		assert(offset > 0);
		return this.previousTokens[this.previousTokens.size() - offset];
	}

	public prevSkipWhitespace(offset = 1) {
		assert(offset > 0);
		for (let i = this.previousTokens.size() - offset; i > 0; i--) {
			const token = this.previousTokens[i];
			if (token.kind !== ZrTokenKind.Whitespace) {
				return token;
			}
		}

		return undefined;
	}

	public prevIs(kind: ZrTokenKind, offset?: number) {
		const prev = this.prev(offset);
		return prev?.kind === kind;
	}

	public next() {
		const token = this.fetchNextToken();
		this.currentToken = undefined;
		return token;
	}

	public hasNext() {
		return this.currentToken !== undefined || this.stream.hasNext();
	}
}
