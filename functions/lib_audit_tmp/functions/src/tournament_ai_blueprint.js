"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// tournament_ai_blueprint.ts — план ЦЕЛОГО турнира для ИИ-генерации.
//
// зачем: владелец забраковал прежний генератор — «ОНИ ВСЕ ОДНОТИПНЫЕ, как они
// для разных типов задания будут использоваться?». Раньше генерация выдавала
// 10 однотипных вопросов «переведи фразу», хотя турнир состоит из четырёх
// раундов с РАЗНЫМИ режимами. Решение владельца: одна генерация = один готовый
// турнир целиком, каждому режиму — свой тип вопроса, хранение по разделам.
//
// Модуль ЧИСТЫЙ: только план и его проверка, ни сети, ни Firestore. Так
// раскладку можно посчитать в тестах, не тратя ни копейки на OpenAI.
// ═══════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROUND_DIFFICULTY = exports.TOURNAMENT_AI_TOTAL_TASKS = exports.TASKS_PER_ROUND = exports.KIND_TO_FORMAT = exports.KIND_TO_MODE = exports.TOURNAMENT_AI_KINDS = void 0;
exports.buildTournamentPlan = buildTournamentPlan;
exports.flattenPlan = flattenPlan;
exports.planKindCounts = planKindCounts;
const tournament_core_1 = require("./tournament_core");
// ── Типы вопросов (выбор владельца 2026-07-26) ──────────────────────────────
/**
 * Четыре типа, которые владелец выбрал вместо однотипного «переведи фразу».
 * Каждый ложится на формат, который УЖЕ понимает сервер турнира:
 * первые три — choice (4 варианта), четвёртый — translate (банк слов).
 */
exports.TOURNAMENT_AI_KINDS = [
    'situation', // «Официант принёс не то. Что скажешь?» → 4 англ. реплики
    'gap', // «I'm looking ___ my keys» → for / at / after / to
    'oddity', // 4 фразы, одна — калька с русского («I feel myself good»)
    'assembly', // собери фразу из слов (второй формат турнира)
];
/** Режим пула, под которым задание ляжет в Firestore и попадёт в раунд. */
exports.KIND_TO_MODE = Object.freeze({
    situation: 'guess_phrase',
    gap: 'fill_gap',
    oddity: 'find_oddity',
    assembly: 'translate_build',
});
/** Формат серверного контракта: choice (4 опции) или translate (банк слов). */
exports.KIND_TO_FORMAT = Object.freeze({
    situation: 'choice',
    gap: 'choice',
    oddity: 'choice',
    assembly: 'translate',
});
// ── Размер турнира ──────────────────────────────────────────────────────────
/** Заданий в раунде — зеркало DEFAULT_TASKS_PER_ROUND в tournaments.ts. */
exports.TASKS_PER_ROUND = 4;
/** Полный турнир: 4 раунда × 6 заданий. */
exports.TOURNAMENT_AI_TOTAL_TASKS = tournament_core_1.TOURNAMENT_ROUNDS * exports.TASKS_PER_ROUND;
/**
 * Сложность, допустимая в раунде — зеркало selectRoundTasks (tournament_core).
 * Раунд 1 только лёгкие (все включаются), раунд 4 — жёсткий отсев.
 */
exports.ROUND_DIFFICULTY = Object.freeze({
    1: [1], 2: [1, 2], 3: [2], 4: [2, 3],
});
/**
 * Раскладка целого турнира.
 *
 * зачем: раунды 1 и 3 сервер собирает из ОДНОГО режима (single) — если
 * подсунуть туда разные, selectRoundTasks возьмёт случайный режим и часть
 * заданий не наберётся, а комната отменится с возвратом билетов. Раунды 2 и 4
 * смешанные — там кладём все четыре типа, чтобы турнир не приедался.
 *
 * Типы по раундам чередуются, чтобы каждый встретился и в «своём» раунде,
 * и в миксе: 1 — ситуации, 3 — пропущенное слово (обе single).
 */
function buildTournamentPlan() {
    // зачем: single-раунды отдаём РЕДКИМ типам. Если поставить сюда situation и
    // gap, они получат по 10 заданий из 24, а oddity и assembly — по 2: расчёт
    // на реальном плане это показал. Отдаём single-раунды assembly и oddity,
    // тогда каждый тип представлен достойно (8/8/4/4 вместо 10/10/2/2).
    const singleKinds = ['assembly', 'oddity'];
    let singleIndex = 0;
    // Сквозной курсор по типам для микс-раундов: круг НЕ начинается заново в
    // каждом раунде, иначе редкие типы не доходят до плана (см. ниже).
    let mixCursor = 0;
    return tournament_core_1.TOURNAMENT_ROUND_MODE_KINDS.map((modeKind, index) => {
        const roundNo = index + 1;
        const allowed = exports.ROUND_DIFFICULTY[roundNo] ?? [1];
        const kinds = [];
        if (modeKind === 'single') {
            // Весь раунд одним типом — иначе сервер не наберёт задания.
            const kind = singleKinds[singleIndex % singleKinds.length];
            singleIndex += 1;
            for (let i = 0; i < exports.TASKS_PER_ROUND; i += 1)
                kinds.push(kind);
        }
        else {
            // Микс: даём слоты РЕДКИМ типам — тем, которым не достался свой
            // single-раунд.
            // зачем 2026-07-27: раньше микс гнал все типы по кругу. При 6 заданиях
            // выходило 4+2 и сходило с рук, но после перевода раунда на 4 задания
            // single-типы забирали по 4 своих задания плюс ещё по одному из каждого
            // микса — 6 против 2 у situation и gap, то есть ровно та регрессия
            // «редкие типы вырождаются в довесок», ради которой писался тест
            // разнообразия. Микс-раунды отдаём тем, кто обделён, и турнир
            // раскладывается ровно: по 4 задания на каждый из четырёх типов.
            const rareKinds = exports.TOURNAMENT_AI_KINDS.filter((kind) => !singleKinds.includes(kind));
            const cycle = rareKinds.length > 0 ? rareKinds : exports.TOURNAMENT_AI_KINDS;
            for (let i = 0; i < exports.TASKS_PER_ROUND; i += 1) {
                kinds.push(cycle[mixCursor % cycle.length]);
                mixCursor += 1;
            }
        }
        // Сложности гоняем по допустимой полосе раунда, чтобы внутри раунда
        // тоже был разброс, а не шесть одинаковых заданий.
        const difficulties = Array.from({ length: exports.TASKS_PER_ROUND }, (_, i) => allowed[i % allowed.length]);
        return Object.freeze({ roundNo, modeKind, kinds: Object.freeze(kinds), difficulties: Object.freeze(difficulties) });
    });
}
function flattenPlan(plan) {
    const out = [];
    for (const round of plan) {
        for (let i = 0; i < round.kinds.length; i += 1) {
            out.push({ roundNo: round.roundNo, kind: round.kinds[i], difficulty: round.difficulties[i] });
        }
    }
    return Object.freeze(out);
}
/** Сколько заданий каждого типа даёт полный турнир — для отчёта в админке. */
function planKindCounts(plan) {
    const counts = {};
    for (const task of flattenPlan(plan)) {
        counts[task.kind] = (counts[task.kind] ?? 0) + 1;
    }
    return Object.freeze(counts);
}
//# sourceMappingURL=tournament_ai_blueprint.js.map