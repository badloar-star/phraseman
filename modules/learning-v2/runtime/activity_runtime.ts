import type { ActivityRegistration, ActivityRegistry } from "./activity_registry";

/**
 * React-free runtime boundary. The presentation layer receives a declarative
 * activity definition and resolves `rendererKey` inside its own UI registry.
 */
export const resolveActivityRegistration = (
  registry: ActivityRegistry,
  activityTypeKey: string,
): ActivityRegistration => registry.get(activityTypeKey);
