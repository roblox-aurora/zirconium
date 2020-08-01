import Lazy from "./internal/Lazy";
import { GetCommandService } from "./services";

const Registry = Lazy(() => GetCommandService("RegistryService"));
const Dispatch = Lazy(() => GetCommandService("DispatchService"));

export { Registry, Dispatch };
