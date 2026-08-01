import { HttpsError } from 'firebase-functions/v2/https';

const REGION = 'us-central1';

/**
 * Глобальный предохранитель App Check. Дефолт false (НЕ энфорсим) — резкое включение
 * сломало бы прод (старые клиенты/анонимные OpenAI-вызовы без токена → unauthenticated).
 * План поэтапного включения: docs/reports/APP_CHECK_ENABLEMENT_PLAN_2026-06-13.md
 */
export const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true';

/**
 * Per-group флаги для ПОЭТАПНОГО включения (шаг 4 плана): можно включить энфорс на
 * одной группе функций, не трогая остальные. Каждый флаг наследует глобальный
 * ENFORCE_APP_CHECK, но его можно поднять отдельно своей env-переменной.
 * Так staged rollout (сначала destructive → identity → OpenAI → всё) реально исполним,
 * а не «всё или ничего». Поведение по умолчанию не меняется: все = ENFORCE_APP_CHECK (false).
 */
function appCheckGroup(envVar: string): boolean {
  const raw = process.env[envVar];
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return ENFORCE_APP_CHECK; // не задан → следуем глобальному флагу
}

/** Разрушительные/identity-функции — включать App Check ПЕРВЫМИ (наименьший трафик, выше риск). */
export const ENFORCE_APP_CHECK_SENSITIVE = appCheckGroup('ENFORCE_APP_CHECK_SENSITIVE');
/** Платные OpenAI-функции (explain/dialog/weekly/stats) — включать ПОСЛЕДНИМИ, после прогрева. */
export const ENFORCE_APP_CHECK_OPENAI = appCheckGroup('ENFORCE_APP_CHECK_OPENAI');

/** Privileged writes must never inherit a rollout flag that can disable attestation. */
export const ADMIN_SENSITIVE_WRITE_OPTIONS = {
  region: REGION,
  enforceAppCheck: true,
} as const;

/** Defense in depth for tests/emulators and any runtime path that bypasses option enforcement. */
export function requireAdminAppCheck(request: { app?: unknown | null }): void {
  if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
}

export const HOT_CALLABLE_OPTIONS = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
  memory: '256MiB' as const,
  maxInstances: 80,
} as const;

