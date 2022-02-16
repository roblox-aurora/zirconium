import { ZrNodeFlag } from "./Enum";
import { Node } from "./NodeTypes";

export function updateHasNodeError<T extends Node>(node: T) {
    node.flags |= ZrNodeFlag.ThisNodeHasError;
    return node;
}