"use strict";
/**
 * СЕРВЕРНАЯ КОПИЯ движка звёзд Арены.
 *
 * Источник — `modules/arena/stars.ts`. Файл повторяет его один в один, отличие
 * только в первой строке: сервер не может импортировать клиентский контракт,
 * поэтому два типа объявлены здесь локально.
 *
 * Расхождение между этим файлом и клиентским означает, что игрок видит одно
 * число, а получает другое. Тест паритета `arena_stars_parity` прогоняет обе
 * реализации на одних входах и падает при первом же расхождении.
 *
 * НЕ ПРАВИТЬ ЗДЕСЬ. Правишь `modules/arena/stars.ts` — переносишь сюда.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_XP_WIN = exports.ARENA_XP_COMPLETION = exports.ARENA_XP_PER_STAR = exports.ARENA_DAILY_STAR_CAP = exports.ARENA_DAILY_MULTIPLIERS = exports.ARENA_STAR_POLICY = exports.ARENA_SPEED_MATCH_PAIRS = exports.ARENA_COMBO_BONUS = exports.ARENA_COMBO_THRESHOLD = exports.ARENA_STARS_PER_PAIR = exports.ARENA_STARS_CORRECT_FIRST = exports.ARENA_STARS_CORRECT = exports.ARENA_TIME_QUANTUM_MS = exports.ARENA_ANSWER_MS = exports.ARENA_STARS_RULES_VERSION = void 0;
exports.arenaMatchStarCeiling = arenaMatchStarCeiling;
exports.arenaTimeBucket = arenaTimeBucket;
exports.arenaClampRaceMs = arenaClampRaceMs;
exports.arenaAwardStars = arenaAwardStars;
exports.arenaScoreRun = arenaScoreRun;
exports.arenaResolveDuel = arenaResolveDuel;
exports.arenaBankedStars = arenaBankedStars;
exports.arenaMatchXp = arenaMatchXp;
exports.ARENA_STARS_RULES_VERSION = 'arena-stars.v3';
/** Окно ответа по типу задания. Сокращено владельцем на четверть 2026-08-12. */
exports.ARENA_ANSWER_MS = Object.freeze({
    guess_phrase: 8000,
    fill_gap: 8000,
    find_oddity: 10000,
    translate_build: 14000,
    speed_match: 18000,
});
/**
 * Квант сравнения времени. Гонка «кто первым» решается по ведру в 100 мс, а не
 * по сырым миллисекундам: экран на 120 Гц иначе давал бы владельцу такого
 * телефона систематическое преимущество до 16.6 мс на каждом задании — около
 * 166 мс за рейтинговый матч, чего хватает, чтобы отобрать третью звезду.
 */
exports.ARENA_TIME_QUANTUM_MS = 100;
exports.ARENA_STARS_CORRECT = 2;
exports.ARENA_STARS_CORRECT_FIRST = 3;
exports.ARENA_STARS_PER_PAIR = 1;
exports.ARENA_COMBO_THRESHOLD = 3;
exports.ARENA_COMBO_BONUS = 1;
exports.ARENA_SPEED_MATCH_PAIRS = 4;
exports.ARENA_STAR_POLICY = Object.freeze({
    ranked: 'banked',
    quick: 'none',
    friend: 'unbanked',
    series: 'unbanked',
    today: 'banked',
    ghost: 'none',
});
/**
 * Потолок за матч. Выводится из фиксированного порядка типов заданий:
 * рейтинг — 3+3+3+3+4 дважды = 32 базовых плюс 8 комбо начиная с третьего
 * задания; быстрый — 16 базовых плюс 3 комбо.
 */
function arenaMatchStarCeiling(taskCount) {
    if (taskCount === 5)
        return 19;
    if (taskCount === 10)
        return 40;
    return 0;
}
function arenaTimeBucket(ms) {
    return Math.floor(Math.max(0, ms) / exports.ARENA_TIME_QUANTUM_MS);
}
function arenaClampRaceMs(elapsedMs, mode) {
    const max = exports.ARENA_ANSWER_MS[mode];
    if (!Number.isFinite(elapsedMs))
        return max;
    return Math.round(Math.max(0, Math.min(elapsedMs, max)));
}
/**
 * Как задание влияет на серию.
 *
 * Пары — особый случай. Строгий сброс убивал бы комбо ровно там, где оно
 * впервые становится оплачиваемым: пары стоят пятым и десятым заданием, и
 * требование «все четыре с первой попытки» жёстче любого другого в матче.
 * Поэтому 4/4 наращивает серию, 3/4 удерживает её, а 2 и меньше сбрасывает.
 */
function comboEffect(mode, status, firstAttemptPairs) {
    if (mode === 'speed_match') {
        if (firstAttemptPairs >= exports.ARENA_SPEED_MATCH_PAIRS)
            return 'increment';
        if (firstAttemptPairs === exports.ARENA_SPEED_MATCH_PAIRS - 1)
            return 'hold';
        return 'reset';
    }
    if (status === 'correct')
        return 'increment';
    // Технический сбой — не вина игрока, серия сохраняется. Но бонус за это
    // задание не платится, иначе падение рендера станет источником звёзд.
    if (status === 'broken')
        return 'hold';
    return 'reset';
}
function arenaAwardStars(input) {
    const { mode, status, opponentCorrect, comboRunBefore } = input;
    const isPairs = mode === 'speed_match';
    const pairs = Math.max(0, Math.min(exports.ARENA_SPEED_MATCH_PAIRS, Math.trunc(input.firstAttemptPairs)));
    const race = arenaClampRaceMs(input.raceElapsedMs, mode);
    const effect = comboEffect(mode, status, pairs);
    const runAfter = effect === 'increment' ? comboRunBefore + 1 : effect === 'hold' ? comboRunBefore : 0;
    const lines = [];
    let base = 0;
    let firstBonus = 0;
    let headline;
    if (isPairs) {
        base = pairs * exports.ARENA_STARS_PER_PAIR;
        lines.push({
            reason: 'base_pairs',
            stars: base,
            state: base > 0 ? 'earned' : 'missed',
            pairs,
        });
        lines.push({ reason: 'first', stars: 0, state: 'not_applicable' });
        headline = {
            key: pairs >= exports.ARENA_SPEED_MATCH_PAIRS ? 'starPairsFull' : pairs > 0 ? 'starPairsPartial' : 'starPairsNone',
            stars: base,
            pairs,
        };
    }
    else if (status === 'correct') {
        base = exports.ARENA_STARS_CORRECT;
        lines.push({ reason: 'base_correct', stars: base, state: 'earned' });
        // «Первым» считается тот, кто первым ответил ВЕРНО. Иначе появляется приём:
        // мгновенно ткнуть любой вариант, чтобы лишить соперника третьей звезды.
        const opponentKnown = opponentCorrect && typeof input.opponentRaceElapsedMs === 'number';
        const wasFirst = !opponentCorrect
            || !opponentKnown
            || arenaTimeBucket(race) <= arenaTimeBucket(input.opponentRaceElapsedMs);
        if (wasFirst) {
            firstBonus = 1;
            base = exports.ARENA_STARS_CORRECT_FIRST;
            lines.push({ reason: 'first', stars: exports.ARENA_STARS_CORRECT_FIRST - exports.ARENA_STARS_CORRECT, state: 'earned' });
            headline = { key: 'starFirst', stars: base };
        }
        else {
            const behindByMs = Math.max(0, race - input.opponentRaceElapsedMs);
            lines.push({ reason: 'first', stars: 0, state: 'missed', behindByMs });
            headline = opponentKnown
                ? { key: 'starSecond', stars: base, behindSeconds: Math.round(behindByMs / 100) / 10 }
                : { key: 'starSecondUnknownDelta', stars: base };
        }
    }
    else {
        lines.push({
            reason: status === 'wrong' ? 'wrong' : status === 'timeout' ? 'timeout' : 'broken',
            stars: 0,
            state: 'missed',
        });
        headline = {
            key: status === 'wrong' ? 'starWrong' : status === 'timeout' ? 'starTimeout' : 'starBroken',
            stars: 0,
        };
    }
    // Комбо не платится за задание, где игрок ничего не решил: сбой рендера и
    // просрочка не должны приносить звёзд.
    const comboPayable = runAfter >= exports.ARENA_COMBO_THRESHOLD && effect !== 'reset' && status !== 'broken';
    const comboBonus = comboPayable ? exports.ARENA_COMBO_BONUS : 0;
    if (comboBonus) {
        lines.push({ reason: 'combo', stars: comboBonus, state: 'earned', comboRun: runAfter });
    }
    const stars = base + comboBonus;
    const headlineWithCombo = comboBonus ? { ...headline, stars } : headline;
    /**
     * Время для исхода считается иначе, чем время для бонуса: неверный ответ
     * стоит полного окна. Без этого быстрый неверный тык бил бы медленный
     * верный ответ при равенстве звёзд.
     */
    const solved = isPairs ? pairs > 0 : status === 'correct';
    const tieBreakElapsedMs = solved ? race : exports.ARENA_ANSWER_MS[mode];
    return {
        stars,
        base,
        firstBonus,
        comboBonus,
        comboRunAfter: runAfter,
        tieBreakElapsedMs,
        lines,
        headline: headlineWithCombo,
    };
}
function arenaScoreRun(input) {
    const perTask = [];
    let comboRun = 0;
    let rawMatchStars = 0;
    let tieBreakElapsedMs = 0;
    let raceElapsedMs = 0;
    let correctCount = 0;
    let firstCount = 0;
    let longestCombo = 0;
    let brokenCount = 0;
    for (let index = 0; index < input.modes.length; index += 1) {
        const mode = input.modes[index];
        const own = input.own[index];
        const rival = input.opponent[index] ?? null;
        const status = own?.status ?? 'timeout';
        const rivalSolved = rival
            ? (rival.mode === 'speed_match' ? rival.firstAttemptPairs > 0 : rival.status === 'correct')
            : false;
        const award = arenaAwardStars({
            mode,
            status,
            raceElapsedMs: own?.raceElapsedMs ?? exports.ARENA_ANSWER_MS[mode],
            firstAttemptPairs: own?.firstAttemptPairs ?? 0,
            opponentRaceElapsedMs: rival ? rival.raceElapsedMs : null,
            opponentCorrect: rivalSolved,
            comboRunBefore: comboRun,
        });
        comboRun = award.comboRunAfter;
        longestCombo = Math.max(longestCombo, comboRun);
        rawMatchStars += award.stars;
        tieBreakElapsedMs += award.tieBreakElapsedMs;
        raceElapsedMs += arenaClampRaceMs(own?.raceElapsedMs ?? exports.ARENA_ANSWER_MS[mode], mode);
        if (mode === 'speed_match' ? (own?.firstAttemptPairs ?? 0) > 0 : status === 'correct')
            correctCount += 1;
        if (award.firstBonus)
            firstCount += 1;
        if (status === 'broken')
            brokenCount += 1;
        perTask.push(award);
    }
    const ceiling = arenaMatchStarCeiling(input.modes.length);
    const matchStars = ceiling > 0 ? Math.min(rawMatchStars, ceiling) : rawMatchStars;
    return {
        rulesVersion: exports.ARENA_STARS_RULES_VERSION,
        perTask,
        matchStars,
        rawMatchStars,
        tieBreakElapsedMs,
        raceElapsedMs,
        correctCount,
        firstCount,
        longestCombo,
        brokenCount,
    };
}
function arenaResolveDuel(left, right) {
    if (left.matchStars !== right.matchStars) {
        const leftWins = left.matchStars > right.matchStars;
        return { left: leftWins ? 'win' : 'loss', right: leftWins ? 'loss' : 'win', reason: 'stars' };
    }
    const leftBucket = arenaTimeBucket(left.tieBreakElapsedMs);
    const rightBucket = arenaTimeBucket(right.tieBreakElapsedMs);
    if (leftBucket === rightBucket)
        return { left: 'draw', right: 'draw', reason: 'draw' };
    const leftFaster = leftBucket < rightBucket;
    return { left: leftFaster ? 'win' : 'loss', right: leftFaster ? 'loss' : 'win', reason: 'time' };
}
/* ------------------------------- зачисление ------------------------------ */
/** Дневное затухание: первые четыре матча по 100 %, следующие два по 50 %. */
exports.ARENA_DAILY_MULTIPLIERS = Object.freeze([1, 1, 1, 1, 0.5, 0.5]);
exports.ARENA_DAILY_STAR_CAP = 160;
function arenaBankedStars(input) {
    if (exports.ARENA_STAR_POLICY[input.mode] !== 'banked')
        return 0;
    const ceiling = arenaMatchStarCeiling(input.taskCount);
    const capped = ceiling > 0 ? Math.min(input.matchStars, ceiling) : input.matchStars;
    const multiplier = exports.ARENA_DAILY_MULTIPLIERS[input.eligibleMatchIndex] ?? 0;
    const scaled = Math.floor(Math.max(0, capped) * multiplier);
    const roomLeft = Math.max(0, exports.ARENA_DAILY_STAR_CAP - Math.max(0, input.dailyStarsBefore));
    return Math.min(scaled, roomLeft);
}
/** База опыта за звезду счёта. Кривая приложения — в constants/theme.ts. */
exports.ARENA_XP_PER_STAR = 5;
exports.ARENA_XP_COMPLETION = 10;
exports.ARENA_XP_WIN = 20;
function arenaMatchXp(input) {
    if (!input.completed)
        return 0;
    const base = Math.max(0, Math.trunc(input.matchStars)) * exports.ARENA_XP_PER_STAR;
    const win = input.outcome === 'win' ? exports.ARENA_XP_WIN : 0;
    return base + exports.ARENA_XP_COMPLETION + win;
}
