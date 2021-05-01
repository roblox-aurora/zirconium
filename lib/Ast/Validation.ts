import { NodeError } from "./Nodes/NodeTypes";

interface ValidationSuccess {
	success: true;
}
interface ValidationFailure {
	success: false;
	errorNodes: NodeError[];
}
export type ValidationResult = ValidationSuccess | ValidationFailure;
