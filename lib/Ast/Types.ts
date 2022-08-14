import { Node } from "./Nodes";
import { ZrToken } from "./Tokens/Tokens";

export type TextLocation = [start: number, end: number];

export interface TextRange {
    startPos: number;
    endPos: number;
}

export class TextPosition {
    public constructor(public line: number, public character: number) {}
}

/**
 * Creates a text range
 * @param startPos The start position of this range
 * @param endPos The end position of this range
 * @returns A text range
 * @internal Parser usage only
 */
export function TextLocation(startPos: number, endPos: number) {
    return identity<TextLocation>([startPos, endPos]);
}

export function TextRange(startPos: number, endPos: number) {
    return identity<TextRange>({startPos, endPos});
}

export namespace TextRanges {
    /** @internal */
    export function fromToken(token: ZrToken): TextLocation {
        return TextLocation(token.startPos, token.endPos);
    }
}

export function updateTextRange<V extends Node>(node: V, range: TextLocation) {
    node.startPos = range[0];
    node.endPos = range[1];
    return node;
}

