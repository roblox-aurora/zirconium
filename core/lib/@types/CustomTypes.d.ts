interface ValidationSuccessResult {
	success: true;
}
interface ValidationFailResult {
	success: false;
	reason: string;
}

export type ValidationResult = ValidationSuccessResult | ValidationFailResult;

export interface CustomCommandType<T = string, R = T> {
	displayName?: string;

	validate?(value: T, executor: Player): ValidationResult;

	/**
	 *
	 * @param value The string representation
	 * @returns The transformed representation
	 */
	transform?(value: string, executor: Player): T;

	parse(value: T): R;
}
