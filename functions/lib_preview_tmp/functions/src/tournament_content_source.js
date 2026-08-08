"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// tournament_content_source.ts — доступ к авторскому контенту планов.
//
// зачем: генератор турнирных заданий берёт сырьё из app/plan_content_*.ts —
// это уже отревьюенные фразы с разметкой частей речи и дистракторов. Читаем
// их из КОДА, а не из Firestore: ноль чтений на генерацию (правило экономии),
// и контент гарантированно совпадает с тем, что видит игрок в приложении.
//
// Файлы планов большие (3-5 МБ каждый), поэтому загружаем лениво и кэшируем:
// генерация по одному плану не должна тянуть в память все пять.
// ═══════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOURNAMENT_SOURCE_PLANS = void 0;
exports.loadPlanDays = loadPlanDays;
exports.loadTournamentSourceDays = loadTournamentSourceDays;
/** Планы с авторским контентом. Совпадает с PLAN_IDS в app/plan_content_registry.ts. */
exports.TOURNAMENT_SOURCE_PLANS = Object.freeze([
    'mitap', 'gavan', 'impuls', 'echo', 'voyazh',
]);
/** Кэш на инстанс функции: JSON парсится один раз на холодный старт. */
let BUNDLE_CACHE = null;
/**
 * Загружает выжимку контента, собранную на этапе сборки.
 *
 * зачем: исходники планов (app/plan_content_*.ts) — TypeScript в корне
 * проекта, а в Cloud Functions уезжает только папка functions/, где .ts никто
 * не исполнит. Поэтому scripts/build_tournament_content.js вытаскивает нужные
 * генератору поля в src/generated/tournament_content.json (2.2 МБ вместо 20 МБ
 * исходников — без объяснений, теории и словаря дня). Файл обязан обновляться
 * при изменении контента планов: `npm run build:tournament-content`.
 */
function loadBundle() {
    if (BUNDLE_CACHE)
        return BUNDLE_CACHE;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: JSON грузится лениво, только при первой генерации
        BUNDLE_CACHE = require('./generated/tournament_content.json');
    }
    catch {
        // Отсутствие выжимки не должно ронять функцию: генерация вернёт ноль
        // заданий и админка покажет это владельцу явно.
        BUNDLE_CACHE = [];
    }
    return BUNDLE_CACHE;
}
/** Дни одного плана. Неизвестный план — пустой массив. */
function loadPlanDays(planId) {
    if (!exports.TOURNAMENT_SOURCE_PLANS.includes(planId))
        return [];
    return loadBundle().filter((day) => day.planId === planId);
}
/** Собирает дни нескольких планов в один список для генератора. */
function loadTournamentSourceDays(planIds) {
    const days = [];
    for (const planId of planIds)
        days.push(...loadPlanDays(planId));
    return days;
}
//# sourceMappingURL=tournament_content_source.js.map