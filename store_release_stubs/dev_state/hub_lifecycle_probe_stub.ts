// Стор-сборка: заглушка app/hub_lifecycle_probe.ts (журнал [HUB-LIFECYCLE] — только dev). Ничего не регистрирует и не пишет.
export function registerHubCacheProbe(): void {}
export function logHubSnapshot(): void {}
export function useHubLifecycle(): void {}
export function noteHubSubscription(): void {}
export function resetHubLifecycleProbeForTests(): void {}
export default function __RouteShim() { return null; }
