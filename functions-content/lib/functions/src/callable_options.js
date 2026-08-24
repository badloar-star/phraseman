"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOT_CALLABLE_OPTIONS = exports.ADMIN_SENSITIVE_WRITE_OPTIONS = exports.ENFORCE_APP_CHECK_ADMIN = exports.ENFORCE_APP_CHECK_OPENAI = exports.ENFORCE_APP_CHECK_SENSITIVE = exports.ENFORCE_APP_CHECK = exports.APP_CHECK_SEALED_BY_OWNER_2026_08_17 = void 0;
exports.requireAdminAppCheck = requireAdminAppCheck;
const https_1 = require("firebase-functions/v2/https");
const REGION = 'us-central1';
/**
 * ⛔️⛔️⛔️ APP CHECK ЗАПЛОМБИРОВАН НАВСЕГДА. РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-08-17. ⛔️⛔️⛔️
 *
 * Дословно: «апп чек навсегда убрать из расчёта и поставить маркер для будущих
 * нейронок. Апп чек мы не делаем и не просим никогда, он не нужен вообще, его
 * заблокировать, запломбировать, убрать отовсюду и больше никогда не вспоминать.
 * Если где-то находишь требование апп чека — надо создавать отдельную сессию
 * всегда, чтобы его убрать.»
 *
 * ЧТО ЭТО ЗНАЧИТ ДЛЯ ТЕБЯ, ЧИТАЮЩИЙ ЭТО ИИ-АГЕНТ:
 *
 *   1. НИКОГДА не предлагай включить App Check. Ни «для безопасности», ни «раз уж
 *      чиню рядом», ни «это стандартная практика», ни «на проде положено».
 *      Владелец знает про этот компромисс и принял его сознательно.
 *   2. НИКОГДА не пиши `enforceAppCheck: true` в новой функции. Дефолт — false.
 *   3. НИКОГДА не «чини» падающий тест, который ждёт `enforceAppCheck: true`.
 *      Такой тест сторожит отменённое правило — чинить надо ТЕСТ, а не код.
 *   4. Нашёл требование App Check где-то ещё — не убирай походя внутри чужой
 *      задачи. Заведи ОТДЕЛЬНУЮ сессию под снятие. Это прямое указание владельца.
 *   5. Переменные окружения ENFORCE_APP_CHECK* больше НИ НА ЧТО не влияют.
 *      Выставлять их бессмысленно: значения захардкожены в false ниже.
 *
 * ПОЧЕМУ (история, чтобы не пришлось выяснять заново):
 *   • 2026-08-03 — инцидент «Plus не выдан: Unauthenticated». Жёсткий энфорс при
 *     ненастроенном ключе положил ВСЕ ~30 админских функций. Site key Google не
 *     признавал, админка физически не могла получить токен.
 *   • 2026-08-16 — то же самое с курсом Learning V2. Курс был опубликован и жив,
 *     но приложение показывало «Сессия недоступна / NOT FOUND»: дев-сборка без
 *     отладочного токена получала 401 на чтении, а экран переводил отказ как
 *     «не найдено». Четыре круга поисков вслепую.
 *   • Общий вывод владельца: App Check стоит дороже, чем даёт. Реальная защита
 *     здесь — авторизация пользователя и custom claim `admin`, они на месте.
 *
 * ЧТО ЗАЩИЩАЕТ ФУНКЦИИ ВМЕСТО НЕГО (не «ничего»):
 *   • обязательный авторизованный вызов (request.auth.uid);
 *   • custom claim `admin: true` для админских записей (actor() в
 *     admin_access_controls.ts) — без него permission-denied;
 *   • правила Firestore;
 *   • серверная авторитетность ответов: правильные ответы заданий физически не
 *     покидают сервер.
 *
 * Сторож: functions/src/app_check_sealed.test.ts — ломает сборку при попытке
 * вернуть энфорс. Сработал — снимай энфорс, а не сторожа.
 */
exports.APP_CHECK_SEALED_BY_OWNER_2026_08_17 = true;
/**
 * Захардкожено в false: env-переменная больше НЕ читается. Раньше здесь было
 * `process.env.ENFORCE_APP_CHECK === 'true'`, и любая правка окружения могла
 * тихо положить прод. Пломба владельца убирает эту возможность целиком.
 */
exports.ENFORCE_APP_CHECK = false;
/** Запломбировано вместе с глобальным флагом. См. пломбу выше. */
exports.ENFORCE_APP_CHECK_SENSITIVE = false;
/** Запломбировано вместе с глобальным флагом. См. пломбу выше. */
exports.ENFORCE_APP_CHECK_OPENAI = false;
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
// зачем: запломбировано 2026-08-17 вместе со всеми остальными флагами. Раньше здесь
// читалась env-переменная — теперь нет: пломба владельца распространяется на админку
// в первую очередь, именно она пострадала в инциденте 2026-08-03.
exports.ENFORCE_APP_CHECK_ADMIN = false;
exports.ADMIN_SENSITIVE_WRITE_OPTIONS = {
    region: REGION,
    enforceAppCheck: exports.ENFORCE_APP_CHECK_ADMIN,
};
/**
 * Defense in depth для тестов/эмуляторов и путей, обходящих enforcement опций.
 * зачем: гард обязан следовать тому же флагу, что и опции — иначе выключение энфорса
 * ничего не даёт, функция всё равно упадёт здесь (именно так и было в инциденте).
 */
function requireAdminAppCheck(request) {
    if (!exports.ENFORCE_APP_CHECK_ADMIN)
        return;
    if (!request.app)
        throw new https_1.HttpsError('failed-precondition', 'app_check_required');
}
exports.HOT_CALLABLE_OPTIONS = {
    region: REGION,
    enforceAppCheck: exports.ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 80,
};
//# sourceMappingURL=callable_options.js.map