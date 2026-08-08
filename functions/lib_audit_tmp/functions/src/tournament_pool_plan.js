"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// tournament_pool_plan.ts — планировщик КОМПЛЕКТА заданий турнира.
//
// зачем (владелец 2026-07-27): «генератор должен быть переписан — блокер
// снимается, если генератор будет сразу создавать все задания». Раньше он
// генерил только guess_phrase и вслепую: раунду нужно TASKS_PER_ROUND заданий
// ОДНОГО режима ОДНОЙ группы сложности, а в отдельных ячейках было по 2-4.
//
// Здесь чистая арифметика без сети и Firestore: какие ячейки (режим × слож-
// ность) нужны турниру, сколько в них уже есть и сколько заказать у ИИ.
// Модуль намеренно pure — покрывается тестами без эмулятора.
// ═══════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.CELL_HEALTHY = exports.CELL_TARGET = exports.SINGLE_MODE_ROUNDS = exports.ROUND_DIFFICULTIES = exports.TOURNAMENT_MODES = exports.TASKS_PER_ROUND = void 0;
exports.isTournamentMode = isTournamentMode;
exports.cellKey = cellKey;
exports.requiredCells = requiredCells;
exports.planPoolGaps = planPoolGaps;
exports.roundReadiness = roundReadiness;
exports.poolIsTournamentReady = poolIsTournamentReady;
exports.planGenerationOrders = planGenerationOrders;
const tournament_core_1 = require("./tournament_core");
const tournament_mode_contract_1 = require("./tournament_mode_contract");
/**
 * Заданий в раунде — та же константа, что в tournaments.ts (TASKS_PER_ROUND).
 * зачем копия: она приватная в tournaments.ts, а планировщик обязан быть pure
 * (без импорта модуля с Firestore/onCall) — контрактный тест сверяет значения.
 */
// зачем 2026-07-27 (владелец: «4 вопроса в раунде»): было 6, из-за чего в
// шапке горело «Вопрос 5 из 6» и турнир тянулся 24 вопроса вместо 16. Спека
// (docs/tournaments) тоже говорит 4. Это ЕДИНСТВЕННЫЙ источник правды для
// планировщика пула; зеркала в tournaments.ts и tournament_ai_blueprint.ts
// обязаны совпадать — расхождение закреплено тестом.
exports.TASKS_PER_ROUND = 4;
/**
 * Режимы, играбельные в турнире.
 *
 * зачем такой состав: владелец отобрал режимы лично 2026-07-27, посмотрев
 * макеты Learning V2. Аудио он одобрил, и возражение про задержку снято тем,
 * что озвучка качается в лобби ЗАРАНЕЕ, а не в момент вопроса. Диалоги и
 * голосовые ответы игрока в турнир не идут: их нельзя проверить объективно.
 *
 * Добавление режима = одна строка здесь: планировщик, готовность раундов и
 * заказ для генератора пересчитаются автоматически.
 */
exports.TOURNAMENT_MODES = tournament_mode_contract_1.OWNER_APPROVED_TOURNAMENT_MODES;
function isTournamentMode(value) {
    return (0, tournament_mode_contract_1.isOwnerApprovedTournamentMode)(value);
}
/**
 * Группы сложности по номеру раунда — ровно те, что читает selectRoundTasks:
 * раунд 1 → [1], раунд 2 → [1,2], раунд 3 → [2], раунд 4 → [2,3].
 */
exports.ROUND_DIFFICULTIES = Object.freeze([
    [1],
    [1, 2],
    [2],
    [2, 3],
]);
/** Раунды, где режим ОДИН на весь раунд (single) — там и возникает блокер. */
exports.SINGLE_MODE_ROUNDS = tournament_core_1.TOURNAMENT_ROUND_MODE_KINDS
    .map((kind, index) => (kind === 'single' ? index + 1 : 0))
    .filter((roundNo) => roundNo > 0);
/** Сколько заданий должно быть в ячейке, чтобы single-раунд гарантированно собрался. */
exports.CELL_TARGET = exports.TASKS_PER_ROUND;
/**
 * Запас сверх минимума: с ровно TASKS_PER_ROUND заданиями каждый турнир играл
 * бы один и тот же набор — узнаваемо и скучно. Держим кратно больше, чтобы выборка по сиду
 * реально перемешивала.
 */
exports.CELL_HEALTHY = exports.TASKS_PER_ROUND * 3;
function approvedModes(modes) {
    return Array.from(new Set(modes.filter(isTournamentMode)));
}
/** Ключ ячейки в счётчике: `<mode>:<difficulty>`. */
function cellKey(cell) {
    return `${cell.mode}:${cell.difficulty}`;
}
/**
 * Все ячейки, которые турнир реально может запросить: каждая пара
 * «режим × сложность, встречающаяся хотя бы в одном раунде».
 */
function requiredCells(modes = exports.TOURNAMENT_MODES) {
    const allowedModes = new Set(approvedModes(modes));
    const cells = new Map();
    tournament_core_1.TOURNAMENT_ROUND_MODE_PLAN.forEach((roundModes, roundIndex) => {
        for (const mode of roundModes) {
            if (!allowedModes.has(mode))
                continue;
            for (const difficulty of exports.ROUND_DIFFICULTIES[roundIndex] ?? []) {
                const cell = { mode, difficulty };
                cells.set(cellKey(cell), cell);
            }
        }
    });
    return [...cells.values()];
}
/**
 * Дыры комплекта: что и сколько заказывать генератору.
 * Сортировка — сначала блокирующие ячейки, потом самые пустые.
 */
function planPoolGaps(counts, modes = exports.TOURNAMENT_MODES) {
    return requiredCells(modes)
        .map((cell) => {
        const have = Math.max(0, Number(counts[cellKey(cell)] ?? 0));
        return {
            ...cell,
            have,
            missing: Math.max(0, exports.CELL_TARGET - have),
            missingHealthy: Math.max(0, exports.CELL_HEALTHY - have),
            blocking: have < exports.CELL_TARGET,
        };
    })
        .sort((a, b) => (Number(b.blocking) - Number(a.blocking)) || (a.have - b.have));
}
function modeCanAllocateUniqueTasksThroughRound(mode, counts, lastRoundIndex) {
    const occurrences = tournament_core_1.TOURNAMENT_ROUND_MODE_PLAN
        .slice(0, lastRoundIndex + 1)
        .flatMap((roundModes, roundIndex) => (roundModes.includes(mode) ? [exports.ROUND_DIFFICULTIES[roundIndex]] : []))
        .sort((left, right) => left.length - right.length);
    const remaining = new Map([1, 2, 3].map((difficulty) => [
        difficulty,
        Math.max(0, Number(counts[`${mode}:${difficulty}`] ?? 0)),
    ]));
    const allocate = (slotIndex) => {
        if (slotIndex >= occurrences.length)
            return true;
        for (const difficulty of occurrences[slotIndex]) {
            const available = remaining.get(difficulty) ?? 0;
            if (available <= 0)
                continue;
            remaining.set(difficulty, available - 1);
            if (allocate(slotIndex + 1))
                return true;
            remaining.set(difficulty, available);
        }
        return false;
    };
    return allocate(0);
}
/**
 * Накопительная готовность каждого раунда — то, что показываем в админке
 * вместо догадок. Поздний раунд не может стать готовым, если уникальные
 * задания уже закончились на одном из предыдущих раундов.
 *
 * Runtime owner plan всегда требует четыре конкретных режима: по одному
 * заданию каждого. Старый расчёт single/mix мог объявить раунд готовым по
 * сумме чужих режимов, хотя buildTournamentRounds затем возвращал null.
 */
function roundReadiness(counts, modes = exports.TOURNAMENT_MODES) {
    const eligibleModes = new Set(approvedModes(modes));
    let prefixReady = true;
    return exports.ROUND_DIFFICULTIES.map((difficulties, index) => {
        const roundNo = index + 1;
        const plannedModes = tournament_core_1.TOURNAMENT_ROUND_MODE_PLAN[index];
        const perMode = plannedModes.map((mode) => ({
            mode,
            count: eligibleModes.has(mode)
                ? difficulties.reduce((sum, difficulty) => sum + Math.max(0, Number(counts[`${mode}:${difficulty}`] ?? 0)), 0)
                : 0,
        }));
        const readyModes = perMode.filter((entry) => (entry.count >= 1 && modeCanAllocateUniqueTasksThroughRound(entry.mode, counts, index))).map((entry) => entry.mode);
        const totalTasks = perMode.reduce((sum, entry) => sum + entry.count, 0);
        prefixReady = prefixReady && readyModes.length === plannedModes.length;
        return {
            roundNo,
            readyModes,
            totalTasks,
            ok: prefixReady,
        };
    });
}
/** Комплект готов: каждый раунд собирается. */
function poolIsTournamentReady(counts, modes = exports.TOURNAMENT_MODES) {
    return roundReadiness(counts, modes).every((round) => round.ok);
}
/**
 * План заказа для ИИ: закрываем сначала блокирующие ячейки, затем добиваем до
 * здорового запаса, пока не упрёмся в общий лимит батча.
 *
 * зачем лимит: генерация стоит денег (OpenAI) — владелец не должен случайно
 * заказать тысячу заданий одним нажатием. Админка вызывает планировщик
 * повторно, пока комплект не станет зелёным.
 */
function planGenerationOrders(counts, options) {
    const maxTasks = Math.max(0, options?.maxTasks ?? exports.CELL_TARGET * 4);
    const healthy = options?.healthy === true;
    const gaps = planPoolGaps(counts, options?.modes);
    const orders = [];
    let budget = maxTasks;
    for (const gap of gaps) {
        if (budget <= 0)
            break;
        const need = healthy ? gap.missingHealthy : gap.missing;
        if (need <= 0)
            continue;
        const count = Math.min(need, budget);
        orders.push({ mode: gap.mode, difficulty: gap.difficulty, count });
        budget -= count;
    }
    return orders;
}
//# sourceMappingURL=tournament_pool_plan.js.map