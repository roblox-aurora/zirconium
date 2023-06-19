import { ZrNodeFlag } from "./Enum";
import { ZrNode } from "./NodeTypes";

export function updateHasNodeError<T extends ZrNode>(node: T) {
    node.flags |= ZrNodeFlag.ThisNodeHasError;
    return node;
}