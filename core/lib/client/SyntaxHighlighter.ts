import { isValidPrefixCharacter } from "@rbxts/zirconium-ast/out/Nodes";
import { AstCommandDefinitions } from "@rbxts/zirconium-ast/out/Definitions/Definitions";

export enum TokenType {
	Identifier,
	Operator,
	String,
	Whitespace,
	Expression,
	Variable,
	Comment,
	Number,
	InnerExpression,
	Keyword,
	Prefix,
	Option,
	Error,
}
interface TokenBase {
	Type: TokenType;
}

interface WhitespaceToken extends TokenBase {
	Type: TokenType.Whitespace;
	Value: string;
}

interface ErrorToken extends TokenBase {
	Type: TokenType.Error;
	Value: string;
}

interface OptionToken extends TokenBase {
	Type: TokenType.Option;
	Value: string;
}

interface PrefixToken extends TokenBase {
	Type: TokenType.Prefix;
	Value: string;
}

interface KeywordToken extends TokenBase {
	Type: TokenType.Keyword;
	Value: string;
}

interface OperatorToken extends TokenBase {
	Type: TokenType.Operator;
	Value: string;
}

interface StringToken extends TokenBase {
	Type: TokenType.String;
	Value: string;
	Quote: string;
}

interface NumberToken extends TokenBase {
	Type: TokenType.Number;
	Value: string;
}

interface VariableToken extends TokenBase {
	Type: TokenType.Variable;
	Value: string;
}

interface CommentToken extends TokenBase {
	Type: TokenType.Comment;
	Value: string;
}

export type Token =
	| WhitespaceToken
	| StringToken
	| VariableToken
	| KeywordToken
	| NumberToken
	| OperatorToken
	| CommentToken
	| OptionToken
	| PrefixToken
	| ErrorToken;

const OPERATORS = ["=", "|", "&", ";"];

const DECIMAL = "^[0-9]+%.*[0-9]*$";
const KEY = "^%-[A-Za-z]+$";
const KEYNAME = "^%-%-[A-Za-z%-0-9]+$";
const VARIABLE = "^%$[A-Za-z_][A-Za-z0-9_]*$";

interface LexerOptions {
	variables: boolean;
	options: boolean;
	commands: AstCommandDefinitions;
}

const DEFAULT_LEXER_OPTIONS: LexerOptions = {
	variables: true,
	options: true,
	commands: [],
};

export default class SyntaxLexer {
	private ptr = 0;
	private curTokens = "";
	private options: LexerOptions;
	private tokens = new Array<Token>();

	constructor(private source: string, options?: Partial<LexerOptions>) {
		this.options = { ...DEFAULT_LEXER_OPTIONS, ...options };
	}

	private generateToken(str: string): Token {
		if (str.match(DECIMAL)[0]) {
			return { Type: TokenType.Number, Value: str };
		} else if (str === "true" || str === "false") {
			return { Type: TokenType.Keyword, Value: str };
		} else if (str.match(VARIABLE)[0] && this.options.variables) {
			return { Type: TokenType.Variable, Value: str };
		} else if ((str.match(KEY)[0] || str.match(KEYNAME)[0]) && this.options.options) {
			return { Type: TokenType.Option, Value: str };
		} else {
			const lastToken = this.tokens[this.tokens.size() - 2];
			const matchingCommand = this.options.commands.find((c) => c.command === str);
			if (matchingCommand) {
				return { Type: TokenType.Keyword, Value: str };
			} else if (lastToken && lastToken.Type === TokenType.Keyword) {
				const parentCommand = this.options.commands.find((c) => c.command === lastToken.Value);
				if (parentCommand && parentCommand.children !== undefined) {
					const matchingCommand = parentCommand.children.find((c) => c.command === str);
					if (matchingCommand) {
						return { Type: TokenType.Keyword, Value: str };
					}
				}
			}
			return { Type: TokenType.String, Value: str, Quote: "" };
		}
	}

	public parseVariable(startPtr: number): { token: VariableToken; ptr: number } {
		let innerExpr = "";
		while (startPtr < this.source.size()) {
			const char = this.source.sub(startPtr, startPtr);
			if (!char.match("[A-Za-z0-9_]")[0]) {
				return { token: { Type: TokenType.Variable, Value: `$${innerExpr}` }, ptr: startPtr - 1 };
			} else {
				innerExpr += char;
			}
			startPtr++;
		}

		return { token: { Type: TokenType.Variable, Value: `$${innerExpr}` }, ptr: startPtr };
	}

	public pushTokens(tokens: Array<Token>) {
		if (this.curTokens !== "") {
			tokens.push(this.generateToken(this.curTokens));
			this.curTokens = "";
		}
	}

	public Parse() {
		let isComment = false;
		while (this.ptr < this.source.size()) {
			const char = this.source.sub(this.ptr, this.ptr);

			if (char === " " || char === "\t" || char === "\n") {
				this.pushTokens(this.tokens);
				this.tokens.push({ Type: TokenType.Whitespace, Value: char });
			} else if (char === "#") {
				isComment = true;
				while (this.ptr <= this.source.size()) {
					const subChar = this.source.sub(this.ptr, this.ptr);
					if (subChar === "\n") {
						this.tokens.push({ Type: TokenType.Comment, Value: this.curTokens });
						this.tokens.push({ Type: TokenType.Whitespace, Value: subChar });
						this.curTokens = "";
						isComment = false;
						break;
					} else {
						this.curTokens += subChar;
					}
					this.ptr++;
				}
			} else if (isValidPrefixCharacter(char)) {
				let subPtr = this.ptr + 1;
				let prefix = "";
				while (subPtr <= this.source.size()) {
					const subChar = this.source.sub(subPtr, subPtr);
					if (subChar === " " || subChar === "\n" || subChar === ";" || subPtr === this.source.size()) {
						if (prefix === "") {
							this.tokens.push({ Type: TokenType.Error, Value: `${char}` });
						} else {
							this.tokens.push({ Type: TokenType.Prefix, Value: `${char}${prefix}` });
						}
						break;
					} else {
						prefix += subChar;
					}
					subPtr++;
				}

				this.ptr = subPtr - 1;
			} else if (OPERATORS.includes(char)) {
				this.pushTokens(this.tokens);
				this.tokens.push({ Type: TokenType.Operator, Value: char });
			} else if (char === `"` || char === "'") {
				let subPtr = this.ptr + 1;
				let completeString = false;
				let isId = false;

				this.tokens.push({ Type: TokenType.Operator, Value: char });

				while (subPtr < this.source.size()) {
					const subChar = this.source.sub(subPtr, subPtr);
					const nextSubChar = this.source.sub(subPtr + 1, subPtr + 1);
					if (subChar === char) {
						this.tokens.push({ Type: TokenType.String, Value: this.curTokens, Quote: char });
						this.tokens.push({ Type: TokenType.Operator, Value: char });
						this.curTokens = "";
						completeString = true;
						break;
					} else if (subChar === "$" && nextSubChar.match("[A-Za-z_]")[0] && this.options.variables) {
						this.tokens.push({ Type: TokenType.String, Value: this.curTokens, Quote: char });
						this.curTokens = "";

						isId = true;
						const { token, ptr } = this.parseVariable(subPtr + 1);
						this.tokens.push(token);
						subPtr = ptr;
						isId = false;
					} else {
						this.curTokens += subChar;
					}
					subPtr++;
				}

				if (this.curTokens !== "") {
					this.tokens.push({ Type: TokenType.String, Value: this.curTokens, Quote: char });
					this.curTokens = "";
				}

				this.ptr = subPtr;
			} else {
				this.curTokens += char;
			}
			this.ptr++;
		}

		if (isComment) {
			this.tokens.push({ Type: TokenType.Comment, Value: this.curTokens });
		} else {
			if (this.curTokens !== "") {
				this.tokens.push(this.generateToken(this.curTokens));
				this.curTokens = "";
			}
		}

		return this.tokens;
	}

	public static toRichText(tokens: Token[]) {
		let str = "";
		for (const token of tokens) {
			if (token.Type === TokenType.Variable) {
				str += `<font color="rgb(132, 214, 247)">${token.Value}</font>`;
			} else if (token.Type === TokenType.Keyword) {
				str += `<font color="rgb(248, 109, 124)">${token.Value}</font>`;
			} else if (token.Type === TokenType.Number) {
				str += `<font color="rgb(255, 198, 0)">${token.Value}</font>`;
			} else if (token.Type === TokenType.String && token.Quote !== "") {
				str += `<font color="rgb(173, 241, 149)">${token.Value}</font>`;
			} else if (token.Type === TokenType.Operator || token.Type === TokenType.Comment) {
				str += `<font color="rgb(102, 102, 102)">${token.Value}</font>`;
			} else if (token.Type === TokenType.Option) {
				str += `<font color="rgb(11, 90, 175)">${token.Value}</font>`;
			} else if (token.Type === TokenType.Prefix) {
				str += `<font color="rgb(173, 241, 149)">${token.Value}</font>`;
			} else if (token.Type === TokenType.Error) {
				str += `<font color="rgb(248, 67, 70)">${token.Value}</font>`;
			} else if (token.Type === TokenType.Whitespace) {
				if (token.Value === "\n") {
					str += `<font color="rgb(50, 50, 50)"> </font>`;
				}
				str += token.Value;
			} else {
				str += token.Value;
			}
		}
		return str;
	}
}
