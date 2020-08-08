import { isValidPrefixCharacter } from "@rbxts/cmd-ast/out/Nodes";

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

interface InnerExpressionToken extends TokenBase {
	Type: TokenType.InnerExpression;
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

const INTEGER = "%d+";
const DECIMAL = "^[0-9]+%.*[0-9]*$";
const KEY = "^%-[A-Za-z]+$";
const KEYNAME = "^%-%-[A-Za-z%-0-9]+$";
const VARIABLE = "^%$[A-Za-z_][A-Za-z0-9_]*$";

export default class SimpleLexer {
	private ptr = 0;
	private tokens = "";

	constructor(private source: string) {}

	private generateToken(str: string): Token {
		if (str.match(DECIMAL)[0]) {
			return { Type: TokenType.Number, Value: str };
		} else if (str === "true" || str === "false") {
			return { Type: TokenType.Keyword, Value: str };
		} else if (str.match(VARIABLE)[0]) {
			return { Type: TokenType.Variable, Value: str };
		} else if (str.match(KEY)[0] || str.match(KEYNAME)[0]) {
			return { Type: TokenType.Option, Value: str };
		} else {
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
		if (this.tokens !== "") {
			tokens.push(this.generateToken(this.tokens));
			this.tokens = "";
		}
	}

	public Parse() {
		const tokens = new Array<Token>();
		let isComment = false;
		while (this.ptr < this.source.size()) {
			const char = this.source.sub(this.ptr, this.ptr);

			if (char === " " || char === "\t" || char === "\n") {
				this.pushTokens(tokens);
				tokens.push({ Type: TokenType.Whitespace, Value: char });
			} else if (char === "#") {
				isComment = true;
				while (this.ptr <= this.source.size()) {
					const subChar = this.source.sub(this.ptr, this.ptr);
					if (subChar === "\n") {
						tokens.push({ Type: TokenType.Comment, Value: this.tokens });
						tokens.push({ Type: TokenType.Whitespace, Value: subChar });
						this.tokens = "";
						isComment = false;
						break;
					} else {
						this.tokens += subChar;
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
							tokens.push({ Type: TokenType.Error, Value: `${char}` });
						} else {
							tokens.push({ Type: TokenType.Prefix, Value: `${char}${prefix}` });
						}
						break;
					} else {
						prefix += subChar;
					}
					subPtr++;
				}

				this.ptr = subPtr - 1;
			} else if (OPERATORS.includes(char)) {
				this.pushTokens(tokens);
				tokens.push({ Type: TokenType.Operator, Value: char });
			} else if (char === `"` || char === "'") {
				let subPtr = this.ptr + 1;
				let completeString = false;
				let isId = false;

				tokens.push({ Type: TokenType.Operator, Value: char });

				while (subPtr < this.source.size()) {
					const subChar = this.source.sub(subPtr, subPtr);
					const nextSubChar = this.source.sub(subPtr + 1, subPtr + 1);
					if (subChar === char) {
						tokens.push({ Type: TokenType.String, Value: this.tokens, Quote: char });
						tokens.push({ Type: TokenType.Operator, Value: char });
						this.tokens = "";
						completeString = true;
						break;
					} else if (subChar === "$" && nextSubChar.match("[A-Za-z_]")[0]) {
						tokens.push({ Type: TokenType.String, Value: this.tokens, Quote: char });
						this.tokens = "";

						isId = true;
						const { token, ptr } = this.parseVariable(subPtr + 1);
						tokens.push(token);
						subPtr = ptr;
						isId = false;
					} else {
						this.tokens += subChar;
					}
					subPtr++;
				}

				if (this.tokens !== "") {
					tokens.push({ Type: TokenType.String, Value: this.tokens, Quote: char });
					this.tokens = "";
				}

				this.ptr = subPtr;
			} else {
				this.tokens += char;
			}
			this.ptr++;
		}

		if (isComment) {
			tokens.push({ Type: TokenType.Comment, Value: this.tokens });
		} else {
			if (this.tokens !== "") {
				tokens.push(this.generateToken(this.tokens));
				this.tokens = "";
			}
		}

		return tokens;
	}

	public static renderTokens(tokens: Token[]) {
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
