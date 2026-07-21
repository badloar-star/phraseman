"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOT_CALLABLE_OPTIONS = exports.ENFORCE_APP_CHECK_OPENAI = exports.ENFORCE_APP_CHECK_SENSITIVE = exports.ENFORCE_APP_CHECK = void 0;
const REGION = 'us-central1';
/**
 * Глобальный предохранитель App Check. Дефолт false (НЕ энфорсим) — резкое включение
 * сломало бы прод (старые клиенты/анонимные OpenAI-вызовы без токена → unauthenticated).
 * План поэтапного включения: docs/reports/APP_CHECK_ENABLEMENT_PLAN_2026-06-13.md
 */
exports.ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true';
/**
 * Per-group флаги для ПОЭТАПНОГО включения (шаг 4 плана): можно включить энфорс на
 * одной группе функций, не трогая остальные. Каждый флаг наследует глобальный
 * ENFORCE_APP_CHECK, но его можно поднять отдельно своей env-переменной.
 * Так staged rollout (сначала destructive → identity → OpenAI → всё) реально исполним,
 * а не «всё или ничего». Поведение по умолчанию не меняется: все = ENFORCE_APP_CHECK (false).
 */
function appCheckGroup(envVar) {
    const raw = process.env[envVar];
    if (raw === 'true')
        return true;
    if (raw === 'false')
        return false;
    return exports.ENFORCE_APP_CHECK; // не задан → следуем глобальному флагу
}
/** Разрушительные/identity-функции — включать App Check ПЕРВЫМИ (наименьший трафик, выше риск). */
exports.ENFORCE_APP_CHECK_SENSITIVE = appCheckGroup('ENFORCE_APP_CHECK_SENSITIVE');
/** Платные OpenAI-функции (explain/dialog/weekly/stats) — включать ПОСЛЕДНИМИ, после прогрева. */
exports.ENFORCE_APP_CHECK_OPENAI = appCheckGroup('ENFORCE_APP_CHECK_OPENAI');
exports.HOT_CALLABLE_OPTIONS = {
    region: REGION,
    enforceAppCheck: exports.ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 80,
};
//# sourceMappingURL=callable_options.js.map