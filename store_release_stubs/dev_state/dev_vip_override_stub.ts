// Стор-сборка: заглушка app/dev_vip_override.ts. Подмены VIP и плана нет.
export function setDevVipOverride(): boolean { return false; }
export function clearDevVipOverride(): void {}
export function getDevVipOverrideFor(): null { return null; }
export function isDevVipOverrideActive(): boolean { return false; }
export function setDevPlanOverride(): boolean { return false; }
export function getDevPlanOverride(): null { return null; }
export function resetDevVipOverrideForTests(): void {}
export default function __RouteShim() { return null; }
// зачем (12.10, energy-modes-006): «Plus выдан» в памяти в стор-сборке не выдаётся — значения пустые, setDevVipOverride отказывает
export function devMemoryPlusValues(): Record<string, string> {
  return { vip_active: 'false', vip_plan: '', vip_from: '0', vip_until: '0', vip_admin_override: '', vip_admin_grant_at: '' };
}
