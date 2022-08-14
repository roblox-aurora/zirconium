import Log, { LogLevel } from "@rbxts/log";
import { $env, $NODE_ENV } from "rbxts-transform-env";

const logger = Log.Configure()
	.SetMinLogLevel($NODE_ENV === "development" ? LogLevel.Verbose : LogLevel.Information)
	.WriteTo(Log.RobloxOutput());

/** @internal */
export const ZirconiumLogging = logger.Create();
