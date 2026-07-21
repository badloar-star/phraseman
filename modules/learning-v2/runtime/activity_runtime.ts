import type { ActivityRegistry } from "./activity_registry";

/** React-free runtime boundary; UI shells consume this resolved definition. */
export const resolveActivityRenderer = (
  registry: ActivityRegistry,
  activityTypeKey: string,
): unknown => registry.resolveRenderer(activityTypeKey);
