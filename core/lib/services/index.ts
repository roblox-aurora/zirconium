import Lazy from "../internal/Lazy";
import { CmdCoreRegistryService } from "./RegistryService";
import { CmdCoreDispatchService } from "./DispatchService";
import t from "@rbxts/t";

interface ServiceMap {
	RegistryService: CmdCoreRegistryService;
	DispatchService: CmdCoreDispatchService;
}

export type ServerDependencies = Array<keyof ServiceMap>;

const HasDependencyInjection = t.interface({
	dependencies: t.array(t.string),
	LoadDependencies: t.callback,
});

const serviceMap = new Map<string, ServiceMap[keyof ServiceMap]>();
const serviceLoading = new Set<string>();

function GetServiceInt<K extends keyof ServiceMap>(service: K, importingFrom?: keyof ServiceMap): ServiceMap[K] {
	if (serviceLoading.has(service)) {
		throw `Cyclic service dependency ${importingFrom}<->${service}`;
	}

	let svcImport = serviceMap.get(service);
	if (svcImport === undefined) {
		serviceLoading.add(service);

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const serviceMaster = require(script.FindFirstChild(service) as ModuleScript) as Map<string, ServiceMap[K]>;
		svcImport = serviceMaster.get(`CmdCore${service}`) as ServiceMap[K];
		if (svcImport === undefined) {
			throw `Tried importing service: ${service}, but no matching ZClient${service} declaration.`;
		}
		serviceMap.set(service, svcImport);

		if (HasDependencyInjection(svcImport)) {
			const dependencies = [];
			for (const dependency of svcImport.dependencies) {
				dependencies.push(Lazy(() => GetServiceInt(dependency as keyof ServiceMap, service)));
			}

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			svcImport.LoadDependencies(...dependencies);
		}

		serviceLoading.delete(service);
		return svcImport as ServiceMap[K];
	} else {
		return svcImport as ServiceMap[K];
	}
}

/**
 * Synchronously imports the service
 * @rbxts server
 * @internal
 * @param service The service name
 */
export function GetCommandService<K extends keyof ServiceMap>(service: K): ServiceMap[K] {
	return GetServiceInt(service);
}
