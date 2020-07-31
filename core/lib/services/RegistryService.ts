export namespace CmdCoreRegistryService {
	// const commands = new Array<Command<defined>>();
	// const types = new Map<string, CmdTypeDefinition<defined>>();
	// function makeEnumType<T extends string>(name: string, values: T[]): CmdTypeDefinition<T> {
	// 	return {
	// 		displayName: `Enum(${name})`,
	// 		validate(value) {
	// 			if (values.includes(value as T)) {
	// 				return { success: true };
	// 			} else {
	// 				return {
	// 					success: false,
	// 					reason: `'${value}' is not a valid value for ${name} - Expected ${values.join(", ")}`,
	// 				};
	// 			}
	// 		},
	// 		parse(value) {
	// 			return value;
	// 		},
	// 	};
	// }
	// export function GetCommands(): ReadonlyArray<Command<defined>> {
	// 	return commands;
	// }
	// /** @internal */
	// export function _getCommandDeclarations() {
	// 	return commands.map(c => c.getCommandDeclaration());
	// }
	// export function RegisterCommand<K extends Record<string, Option>, R>(command: Declaration<K, R>) {
	// 	commands.push(Command.create(command));
	// }
	// export function RegisterEnumType<T extends string>(name: string, values: T[]) {
	// 	const e = makeEnumType(name, values);
	// 	types.set(name, e);
	// 	return e;
	// }
	// export function RegisterType<T, U>(name: string, type: CmdTypeDefinition<T, U>) {
	//     types.set(name, type);
	// }
	const dud = 1;
}
export type CmdCoreRegistryService = typeof CmdCoreRegistryService;
