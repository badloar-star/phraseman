// Стор-сборка: заглушка app/dev_vip_override.ts. Подмены VIP и плана нет.
export function setDevVipOverride(): boolean { return false; }
export function clearDevVipOverride(): void {}
export function getDevVipOverrideFor(): null { return null; }
export function isDevVipOverrideActive(): boolean { return false; }
export function setDevPlanOverride(): boolean { return false; }
export function getDevPlanOverride(): null { return null; }
export function resetDevVipOverrideForTests(): void {}
export default function __RouteShim() { return null; }
