// ═══════════════════════════════════════════════════════════════════════════
// auth_callable_region.ts — в какой регион сейчас идут вызовы входа (и их прогрев). Без зависимостей: читается синхронно.
//
// зачем (владелец 18.10 «Да, перенести», разбор fc30ae94a): база в eur3, а функции входа в us-central1 отвечали 3,6–5,9 с —
// каждое обращение к базе шло через океан. Функции выложены И в europe-west1, И в us-central1 (старые сборки зовут его).
// Правила выбора и запасного пути — в app/auth_callable_fetch.ts; здесь только память решения на этот запуск.
// ═══════════════════════════════════════════════════════════════════════════

export const AUTH_REGION_US = 'us-central1';
export const AUTH_REGION_EU = 'europe-west1';
export type AuthCallableRegion = typeof AUTH_REGION_US | typeof AUTH_REGION_EU;

// Европа ответила «функции нет» — до конца запуска зовём США сразу (не тратим круг на каждый вызов).
let euUnavailableThisRun = false;
// Последнее прочитанное значение выключателя auth_region_eu_v1 (null — ещё не читали: по умолчанию Европа).
let lastKnownEuEnabled: boolean | null = null;

export function markAuthRegionEuUnavailable(): void {
  euUnavailableThisRun = true;
}

export function isAuthRegionEuUnavailableThisRun(): boolean {
  return euUnavailableThisRun;
}

export function rememberAuthRegionEuEnabled(enabled: boolean): void {
  lastKnownEuEnabled = enabled;
}

/** Регион по памяти этого запуска — без чтения настроек (для прогрева, который не должен ждать). */
export function currentAuthCallableRegionSync(): AuthCallableRegion {
  if (euUnavailableThisRun) return AUTH_REGION_US;
  return lastKnownEuEnabled === false ? AUTH_REGION_US : AUTH_REGION_EU;
}

/** Только для тестов. */
export function resetAuthRegionStateForTest(): void {
  euUnavailableThisRun = false;
  lastKnownEuEnabled = null;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
