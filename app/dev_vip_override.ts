/**
 * DEV-подмена VIP-снимка и плана подписки — ТОЛЬКО В ПАМЯТИ процесса.
 *
 * зачем (координатор 12.10): фикстуры `vip=…` и `promo=ok|lifetime` писали настоящий VIP-снимок в AsyncStorage, а ключи снимка (`vip_*`,
 * account-scoped `isVipSnapshotStorageKey`) входят в облачную синхронизацию (cloud_sync.ts) — на вошедшем аккаунте dev-переключатель мог записать
 * настоящее право на Plus в облако. Теперь подмена живёт только здесь: premium_vip_storage отдаёт её при ЧТЕНИИ и пропускает ЗАПИСЬ, пока она
 * включена (чтобы производные записи — premium_guard, облачное слияние — не «закрепили» подмену в хранилище). Перезапуск сбрасывает всё.
 * `plan=yearly|monthly|lifetime` — то же для плана «Управления подпиской» и значения «Год» в Настройках (premium_plan в хранилище НЕ пишется).
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттеры всегда null/false, установка отклоняется. Логи: [DEV-STATE].
 */
import { IS_STORE_RELEASE } from './config';
import type { VipStorageValues } from './premium_vip_storage';

const LOG = '[DEV-STATE]';

function devVipAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

const EMPTY_VIP: VipStorageValues = {
  vip_active: 'false', vip_plan: '', vip_from: '0', vip_until: '0', vip_admin_override: '', vip_admin_grant_at: '',
};

let vipOverride: Readonly<{ stableId: string; values: VipStorageValues }> | null = null;

/** Подменить VIP-снимок аккаунта в памяти. В стор-сборке — отказ с логом, ничего не меняется. */
export function setDevVipOverride(stableId: string, values: Partial<VipStorageValues>, label = 'promo_vip'): boolean {
  if (!devVipAvailable()) {
    console.warn(`${LOG} ${label}: отклонено — не dev-сборка`); // guard-ok: ранний выход логируется
    return false;
  }
  const id = stableId.trim();
  if (!id) {
    console.warn(`${LOG} ${label}: отклонено — нет идентификатора аккаунта`); // guard-ok: ранний выход логируется
    return false;
  }
  vipOverride = { stableId: id, values: { ...EMPTY_VIP, ...values } };
  console.log(`${LOG} ${label} memory_only`, JSON.stringify({ plan: vipOverride.values.vip_plan, active: vipOverride.values.vip_active, until: vipOverride.values.vip_until })); // guard-ok: единичный лог на ссылку
  return true;
}

/**
 * Снимок «Plus выдан» для подмен в памяти (energy_stop=plus_granted): тестерский VIP на сутки. Чистая функция.
 * зачем отдельно от dev_state_fixtures.vipSnapshotValuesFor: этот модуль вызывается из экрана (EnergyStopSheet), а фикстуры
 * в стор-сборку попадать не должны; здесь стор получает заглушку.
 */
export function devMemoryPlusValues(nowMs: number): VipStorageValues {
  return {
    vip_active: 'true', vip_plan: 'telegram_tester', vip_from: String(nowMs - 60_000), vip_until: String(nowMs + 24 * 60 * 60 * 1000),
    vip_admin_override: '', vip_admin_grant_at: '',
  };
}

export function clearDevVipOverride(): void {
  if (vipOverride) console.log(`${LOG} vip memory_only: подмена снята`); // guard-ok: единичный лог
  vipOverride = null;
}

/** Подменённый снимок для этого аккаунта или null (вне dev — всегда null). */
export function getDevVipOverrideFor(stableId: string | null | undefined): VipStorageValues | null {
  if (!devVipAvailable() || !vipOverride) return null;
  return vipOverride.stableId === (stableId ?? '').trim() ? vipOverride.values : null;
}

/** Пока подмена включена, записи VIP-снимка в хранилище пропускаются. */
export function isDevVipOverrideActive(): boolean {
  return devVipAvailable() && vipOverride !== null;
}

export type DevPlan = 'yearly' | 'monthly' | 'lifetime';
export type DevPlanOverride = Readonly<{ plan: DevPlan; expiryMs: number | null }>;
let planOverride: DevPlanOverride | null = null;

/** Подменить план подписки в памяти (`plan=`). null снимает. */
export function setDevPlanOverride(plan: DevPlan | null, nowMs: number = Date.now(), untilMs: number | null = null): boolean {
  if (!devVipAvailable()) {
    console.warn(`${LOG} plan: отклонено — не dev-сборка`, { plan }); // guard-ok: ранний выход логируется
    return false;
  }
  const day = 24 * 60 * 60 * 1000;
  // зачем (бэклог №18, profile-024 / paywalls-022): `planUntil=YYYY-MM-DD` — точная дата следующего списания, как в образце (14 января 2027)
  const expiryMs = plan === 'lifetime' ? null : (untilMs ?? nowMs + (plan === 'yearly' ? 365 : 30) * day);
  planOverride = plan === null ? null : { plan, expiryMs };
  console.log(`${LOG} plan memory_only`, JSON.stringify({ plan, expiryMs: planOverride?.expiryMs ?? null })); // guard-ok: единичный лог на ссылку
  return true;
}

export function getDevPlanOverride(): DevPlanOverride | null {
  return devVipAvailable() ? planOverride : null;
}

/** Только для тестов. */
export function resetDevVipOverrideForTests(): void {
  vipOverride = null;
  planOverride = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
