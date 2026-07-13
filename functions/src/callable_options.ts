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

/** Shared baseline for ordinary authenticated callables that may perform bounded I/O. */
export const DEFAULT_CALLABLE_OPTIONS = {
  region: REGION,
  timeoutSeconds: 60,
  memory: '512MiB' as const,
} as const;

export const HOT_CALLABLE_OPTIONS = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
  memory: '256MiB' as const,
  maxInstances: 80,
} as const;

