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

/**
 * ⛔️ ТРЕБОВАНИЕ ВЛАДЕЛЬЦА (2026-08-03), НАРУШАТЬ ЗАПРЕЩЕНО:
 * НИКОГДА не включать App Check для админки, пока владелец САМ ЯВНО не скажет.
 *
 * Это относится ко ВСЕМ способам включения, любой из них — нарушение:
 *   • вернуть `enforceAppCheck: true` в ADMIN_SENSITIVE_WRITE_OPTIONS;
 *   • выставить env `ENFORCE_APP_CHECK_ADMIN=true`;
 *   • выставить глобальный `ENFORCE_APP_CHECK=true` (ADMIN его НЕ наследует, см. ниже);
 *   • убрать флаговый гард из requireAdminAppCheck().
 *
 * Ни ИИ-агент, ни автоматика НЕ имеют права включить это «заодно», «для безопасности»
 * или «раз уж чиню рядом». Только прямое распоряжение владельца. Причина — ниже:
 * включённый энфорс при ненастроенном ключе кладёт ВСЮ админку намертво.
 * Сторож: functions/src/admin_sensitive_writes.test.ts.
 *
 * Админские привилегированные записи.
 *
 * зачем (2026-08-03, инцидент «Plus не выдан: Unauthenticated»): раньше здесь стоял
 * жёсткий `enforceAppCheck: true`. Но App Check для ВЕБ-админки так и не был настроен —
 * шаг 1 плана (docs/reports/APP_CHECK_ENABLEMENT_PLAN_2026-06-13.md, «reCAPTCHA Enterprise
 * для веба») требует ручных действий в Firebase Console и выполнен не был. Site key
 * `6LfteFAt...` в admin/v2/legacy.html Google не признаёт («Invalid site key»), поэтому
 * админка физически не может получить App Check-токен, а сервер его требовал → Firebase
 * рубил ВСЕ ~30 админских функций (выдача Plus, бан, награды, лиги, рефералы, конфиги)
 * кодом `unauthenticated`, ещё до входа в тело функции.
 *
 * Теперь энфорс управляется флагом ENFORCE_APP_CHECK_ADMIN — ровно тот механизм поэтапного
 * раската, ради которого и заводились остальные группы. Включить обратно (одной env-
 * переменной, без правки кода) можно СРАЗУ после того, как в Firebase Console появится
 * настоящий reCAPTCHA Enterprise-ключ и он будет прописан в админке.
 *
 * Безопасность при выключенном флаге НЕ падает до нуля: каждая такая функция отдельно
 * требует custom claim `admin: true` в Firebase Auth токене (см. actor() в
 * admin_access_controls.ts) — без него вызов отклоняется с permission-denied.
 */
// зачем: НЕ через appCheckGroup() — тот наследует глобальный ENFORCE_APP_CHECK, и тогда
// включение общего флага «за компанию» снова положило бы всю админку. Здесь наследования
// нет намеренно: включить можно ТОЛЬКО отдельной явной переменной ENFORCE_APP_CHECK_ADMIN,
// то есть осознанным действием владельца, а не побочным эффектом чужого раската.
export const ENFORCE_APP_CHECK_ADMIN = process.env.ENFORCE_APP_CHECK_ADMIN === 'true';

export const ADMIN_SENSITIVE_WRITE_OPTIONS = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
} as const;

/**
 * Defense in depth для тестов/эмуляторов и путей, обходящих enforcement опций.
 * зачем: гард обязан следовать тому же флагу, что и опции — иначе выключение энфорса
 * ничего не даёт, функция всё равно упадёт здесь (именно так и было в инциденте).
 */
export function requireAdminAppCheck(request: { app?: unknown | null }): void {
  if (!ENFORCE_APP_CHECK_ADMIN) return;
  if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
}

export const HOT_CALLABLE_OPTIONS = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
  memory: '256MiB' as const,
  maxInstances: 80,
} as const;

