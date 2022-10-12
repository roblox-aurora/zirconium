import { BinaryExpression } from "Ast/Nodes/NodeTypes";
import { ZrValue } from "Data/Locals";
import ZrUndefined from "Data/Undefined";
import ZrRuntime from "./Runtime";

/**
 * @internal
 */
export namespace ZrRuntimeHelpers {
	export function createNumericBinaryExpression(
		runtime: ZrRuntime,
	): (
		fn: (
			node: BinaryExpression,
			left: ZrValue | ZrUndefined | undefined,
			right: ZrValue | ZrUndefined | undefined,
		) => ZrValue,
	) => void {
		return node => {
			return node;
		};
	}
}
