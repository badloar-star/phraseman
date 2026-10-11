"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_V2_SEASON_LEVEL_STARS = exports.ARENA_V2_SPIN_ODDS_BPS = exports.ARENA_V2_SPIN_MINIMUM_ANSWERS = exports.ARENA_V2_SPIN_PITY_MATCHES = exports.ARENA_DAILY_REWARD_MATCHES = exports.ARENA_V2_DAILY_MULTIPLIERS = exports.ARENA_V2_ANSWER_MS = exports.ARENA_V2_DIFFICULTY_BY_DIVISION_BAND = exports.ARENA_V2_MODE_ORDER = exports.ARENA_V2_SEASON_EPOCH_MS = exports.ARENA_V2_SEASON_LENGTH_DAYS = exports.ARENA_V2_TIME_TIE_BREAK_MS = exports.ARENA_V2_RENDEZVOUS_MS = exports.ARENA_V2_INVITE_TTL_MS = exports.ARENA_V2_MATCH_TTL_MS = exports.ARENA_V2_ACTIVE_MATCH_STALE_MS = exports.ARENA_V2_QUEUE_LEASE_MS = exports.ARENA_V2_RECEIVE_GRACE_MS = exports.ARENA_V2_READING_MS = exports.ARENA_V2_REVEAL_MS = exports.ARENA_V2_COUNTDOWN_MS = exports.ARENA_V2_ACCEPT_MS = exports.ARENA_V2_RANKED_BOT_DAILY_LIMIT = exports.ARENA_V2_RANKED_BOT_FALLBACK_MS = exports.ARENA_V2_RANKED_BOT_BIAS = exports.ARENA_V2_RANKED_BOT_MAX_MS = exports.ARENA_V2_RANKED_BOT_MIN_MS = exports.ARENA_V2_QUICK_BOT_FALLBACK_MS = exports.ARENA_V2_QUICK_BOT_BIAS = exports.ARENA_V2_QUICK_BOT_MAX_MS = exports.ARENA_V2_QUICK_BOT_MIN_MS = exports.ARENA_V2_PRIVATE_BUDGET_BYTES = exports.ARENA_V2_SPEED_MATCH_PAIRS = exports.ARENA_V2_MAX_TASK_DOC_READS = exports.ARENA_V2_QUICK_TASK_COUNT = exports.ARENA_V2_TASK_COUNT = exports.ARENA_V2_TARGET_PROFILE_SUBCOLLECTION = exports.ARENA_V2_COLLECTIONS = void 0;
exports.arenaCompetitiveProfilePath = arenaCompetitiveProfilePath;
exports.arenaMasterySignatureId = arenaMasterySignatureId;
exports.arenaResolveRequiredStudyTarget = arenaResolveRequiredStudyTarget;
exports.arenaQueuePublicationCompatible = arenaQueuePublicationCompatible;
exports.arenaTargetBoundPlanHash = arenaTargetBoundPlanHash;
exports.arenaTaskCount = arenaTaskCount;
exports.arenaQuickBotDelayMs = arenaQuickBotDelayMs;
exports.arenaRankedBotDelayMs = arenaRankedBotDelayMs;
exports.encodeArenaSpeedProgress = encodeArenaSpeedProgress;
exports.decodeArenaSpeedProgress = decodeArenaSpeedProgress;
exports.adaptTournamentTaskForArena = adaptTournamentTaskForArena;
exports.arenaModeOrder = arenaModeOrder;
exports.arenaDifficultyPlan = arenaDifficultyPlan;
exports.selectArenaTasks = selectArenaTasks;
exports.toArenaPublicTask = toArenaPublicTask;
exports.validateArenaPrivateEnvelope = validateArenaPrivateEnvelope;
exports.arenaRankWindow = arenaRankWindow;
exports.arenaRanksCompatible = arenaRanksCompatible;
exports.arenaTaskDurationMs = arenaTaskDurationMs;
exports.arenaAcceptanceOpen = arenaAcceptanceOpen;
exports.arenaObservedElapsedMs = arenaObservedElapsedMs;
exports.buildArenaBotBlueprint = buildArenaBotBlueprint;
exports.scoreArenaAnswer = scoreArenaAnswer;
exports.scoreArenaSpeedProgress = scoreArenaSpeedProgress;
exports.resolveArenaOutcome = resolveArenaOutcome;
exports.arenaRankIndexFromStars = arenaRankIndexFromStars;
exports.arenaStarDeltaForOutcome = arenaStarDeltaForOutcome;
exports.arenaSeasonWindow = arenaSeasonWindow;
exports.arenaDailyMultiplier = arenaDailyMultiplier;
exports.arenaSeasonStars = arenaSeasonStars;
exports.arenaTaskStars = arenaTaskStars;
exports.arenaRareSpin = arenaRareSpin;
exports.arenaSeasonLevelUnlocked = arenaSeasonLevelUnlocked;
exports.arenaSeasonReward = arenaSeasonReward;
const node_crypto_1 = require("node:crypto");
const tournament_core_1 = require("./tournament_core");
const tournament_mode_contract_1 = require("./tournament_mode_contract");
const arena_stars_v3_1 = require("./arena_stars_v3");
const arena_target_registry_1 = require("./arena_target_registry");
exports.ARENA_V2_COLLECTIONS = Object.freeze({
    config: 'arena_v2_config',
    profiles: 'arena_v2_profiles',
    queue: 'arena_v2_queue',
    queueLocks: 'arena_v2_queue_locks',
    matches: 'arena_v2_matches',
    matchPrivate: 'arena_v2_match_private',
    /** Живой прогресс соперника. Единственное, куда пишет сам клиент. */
    matchLive: 'arena_v2_match_live',
    matchLiveSeats: 'seats',
    invites: 'arena_v2_invites',
    taskSource: 'tournamentTasks',
    seasons: 'arena_v2_seasons',
    receipts: 'arena_v2_receipts',
    spinCredits: 'arena_v2_spin_credits',
    spinResults: 'arena_v2_spin_results',
    seasonClaims: 'arena_v2_season_claims',
    pairLimits: 'arena_v2_pair_limits',
    members: 'arena_v2_members',
});
exports.ARENA_V2_TARGET_PROFILE_SUBCOLLECTION = 'arena_v2_target_profiles';
/**
 * Competitive Arena state is language-local. English keeps its historical
 * document address byte-for-byte; new contours start clean under the user's
 * canonical profile and never inherit English rating or an active match.
 */
function arenaCompetitiveProfilePath(stableUid, studyTarget) {
    const uid = String(stableUid ?? '').trim();
    if (!uid || uid.includes('/'))
        throw new Error('arena_profile_uid_invalid');
    const root = `${exports.ARENA_V2_COLLECTIONS.profiles}/${uid}`;
    return studyTarget === 'en'
        ? root
        : `${root}/${exports.ARENA_V2_TARGET_PROFILE_SUBCOLLECTION}/${studyTarget}`;
}
/** English keeps its installed mastery evidence ids; new contours cannot consume them. */
function arenaMasterySignatureId(studyTarget, signature) {
    return studyTarget === 'en' ? signature : `${studyTarget}_${signature}`;
}
/** New Arena entry points never infer English from a missing target. */
function arenaResolveRequiredStudyTarget(value) {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        return { ok: false, reason: 'arena_target_required' };
    }
    const studyTarget = (0, arena_target_registry_1.resolveArenaStudyTarget)(value);
    return studyTarget
        ? { ok: true, studyTarget }
        : { ok: false, reason: 'arena_target_invalid' };
}
/** Matchmaking is scoped by both language and the immutable content publication. */
function arenaQueuePublicationCompatible(candidate, expected) {
    if (typeof candidate.studyTarget !== 'string' || typeof candidate.publicationFingerprint !== 'string') {
        return { ok: false, reason: 'arena_queue_legacy_untagged' };
    }
    if (candidate.studyTarget !== expected.studyTarget) {
        return { ok: false, reason: 'arena_queue_target_mismatch' };
    }
    if (candidate.publicationFingerprint !== expected.publicationFingerprint) {
        return { ok: false, reason: 'arena_queue_publication_mismatch' };
    }
    return { ok: true };
}
/** Target/publication-bound plan hash; changing either invalidates a stale report. */
function arenaTargetBoundPlanHash(matchId, studyTarget, publicationFingerprint, tasks) {
    const canonical = tasks
        .map((task, index) => `${index}:${task.taskId}:${task.mode}:${task.difficulty}`)
        .join('|');
    return (0, node_crypto_1.createHash)('sha256')
        .update(`arena-target-plan.v1|${matchId}|${studyTarget}|${publicationFingerprint}|${canonical}`)
        .digest('base64url')
        .slice(0, 32);
}
/** Рейтинг, дружеская дуэль, серия, Arena Today — полный матч. */
exports.ARENA_V2_TASK_COUNT = 10;
/** Владелец (2026-08-21): быстрый матч — восемь заданий. */
exports.ARENA_V2_QUICK_TASK_COUNT = 8;
/** Число заданий по режиму. Строка, а не union, чтобы вызывающие не тянули типы. */
function arenaTaskCount(mode) {
    return mode === 'quick' ? exports.ARENA_V2_QUICK_TASK_COUNT : exports.ARENA_V2_TASK_COUNT;
}
exports.ARENA_V2_MAX_TASK_DOC_READS = 10;
exports.ARENA_V2_SPEED_MATCH_PAIRS = 4;
exports.ARENA_V2_PRIVATE_BUDGET_BYTES = 384 * 1_024;
/**
 * Владелец (2026-08-27): соперник в быстром матче обязан находиться ВСЕГДА в
 * первые 20 секунд, момент внутри окна случайный. Прежнее окно 3–45 секунд
 * давало ожидание почти минуту, а после сорванного назначения — минуты.
 * Момент назначает сервер при постановке в очередь и кладёт в очередь как
 * botDueAtMs; клиент только ждёт до него. Живой соперник всегда перебивает
 * бота. Повторный бот после сорванного назначения тоже укладывается в 20 с.
 */
exports.ARENA_V2_QUICK_BOT_MIN_MS = 3_000;
/*
 * зачем 10 секунд (владелец 2026-09-20): «рейтинг сократи поиск и блиц игра
 * на арене до 10 секунд, бот подключается уже не более чем через 10 секунд».
 * Клиент режет срок своим потолком, но сервер обязан совпасть — иначе он
 * отбивает запрос как `bot_too_early`, и человек ждёт лишний круг повтора.
 */
exports.ARENA_V2_QUICK_BOT_MAX_MS = 10_000;
/** Смещение к началу диапазона: медиана ≈ 6 с, потолок жёсткий — 10 с. */
exports.ARENA_V2_QUICK_BOT_BIAS = 1.6;
/** `unit` — равномерное [0,1). Возвращает задержку в миллисекундах. */
function arenaQuickBotDelayMs(unit) {
    const safe = Number.isFinite(unit) ? Math.max(0, Math.min(1, unit)) : 0.5;
    const biased = Math.pow(safe, exports.ARENA_V2_QUICK_BOT_BIAS);
    const span = exports.ARENA_V2_QUICK_BOT_MAX_MS - exports.ARENA_V2_QUICK_BOT_MIN_MS;
    return Math.round(exports.ARENA_V2_QUICK_BOT_MIN_MS + biased * span);
}
/** Совместимость: минимальная граница, раньше которой сервер бота не отдаёт. */
exports.ARENA_V2_QUICK_BOT_FALLBACK_MS = exports.ARENA_V2_QUICK_BOT_MIN_MS;
/**
 * Владелец (2026-08-28): рейтинг тоже получает бота — ждать реального
 * соперника до победного конца больше нельзя (узкое окно рангов ±1 иногда
 * никого не находит вовсе). Живой соперник всегда приоритетнее и перебивает
 * бота, если находится раньше. Владелец: «в первые 20 секунд» относится к
 * быстрому матчу; для рейтинга — до минуты, ставки выше и живой соперник
 * ценнее подождать.
 */
/*
 * зачем 10 секунд (владелец 2026-09-20): прежнее окно «до минуты» отменено
 * прямым указанием — «рейтинг сократи поиск… до 10 секунд». Нижняя граница
 * опущена вместе с верхней: при MIN=20 с сервер физически не отдавал бота
 * раньше двадцатой секунды, и потолок клиента ничего не решал.
 */
exports.ARENA_V2_RANKED_BOT_MIN_MS = 3_000;
exports.ARENA_V2_RANKED_BOT_MAX_MS = 10_000;
/** Тот же профиль смещения к началу окна, что и у быстрого бота. */
exports.ARENA_V2_RANKED_BOT_BIAS = 1.6;
function arenaRankedBotDelayMs(unit) {
    const safe = Number.isFinite(unit) ? Math.max(0, Math.min(1, unit)) : 0.5;
    const biased = Math.pow(safe, exports.ARENA_V2_RANKED_BOT_BIAS);
    const span = exports.ARENA_V2_RANKED_BOT_MAX_MS - exports.ARENA_V2_RANKED_BOT_MIN_MS;
    return Math.round(exports.ARENA_V2_RANKED_BOT_MIN_MS + biased * span);
}
exports.ARENA_V2_RANKED_BOT_FALLBACK_MS = exports.ARENA_V2_RANKED_BOT_MIN_MS;
/**
 * Дневной потолок рейтинговых матчей ПРОТИВ БОТА на игрока (владелец
 * 2026-08-28): бот закрывает дыру пустой очереди, а не становится бесплатным
 * фармом рейтинга через самый слабый доступный источник побед.
 */
exports.ARENA_V2_RANKED_BOT_DAILY_LIMIT = 3;
exports.ARENA_V2_ACCEPT_MS = 12_000;
exports.ARENA_V2_COUNTDOWN_MS = 3_200;
exports.ARENA_V2_REVEAL_MS = 1_200;
exports.ARENA_V2_READING_MS = 2_500;
exports.ARENA_V2_RECEIVE_GRACE_MS = 1_500;
exports.ARENA_V2_QUEUE_LEASE_MS = 45_000;
/**
 * Через сколько после ПРОСРОЧЕННОГО дедлайна фазы матч считается брошенным и
 * перестаёт блокировать новый поиск (владелец 2026-08-29).
 *
 * Запас крупный намеренно: живой матч всегда двигает свой дедлайн, поэтому
 * пять минут тишины после срока не может означать «идёт игра». Меньше брать
 * опасно — вернувшийся из фона игрок должен доиграть, а не потерять матч.
 */
exports.ARENA_V2_ACTIVE_MATCH_STALE_MS = 5 * 60_000;
exports.ARENA_V2_MATCH_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
exports.ARENA_V2_INVITE_TTL_MS = 10 * 60 * 1_000;
exports.ARENA_V2_RENDEZVOUS_MS = 90 * 1_000;
exports.ARENA_V2_TIME_TIE_BREAK_MS = 2_000;
exports.ARENA_V2_SEASON_LENGTH_DAYS = 63;
exports.ARENA_V2_SEASON_EPOCH_MS = Date.UTC(2026, 7, 1);
function boundedIndexArray(value, maxItems = 12, unique = false) {
    if (!Array.isArray(value))
        return [];
    const bounded = value.filter((entry) => Number.isInteger(entry))
        .map(Number).filter((entry) => entry >= -1 && entry < maxItems).slice(0, maxItems);
    return unique ? Array.from(new Set(bounded)) : bounded;
}
function encodeArenaSpeedProgress(progress) {
    if (!progress)
        return undefined;
    const pairCount = Math.min(12, Math.max(progress.matchedIndexes?.length ?? 0, progress.triedIndexes?.length ?? 0));
    const triedIndexesByPair = Object.fromEntries(Array.from({ length: pairCount }, (_, pairIndex) => [
        String(pairIndex), boundedIndexArray(progress.triedIndexes?.[pairIndex], 12, true).filter((entry) => entry >= 0),
    ]));
    return {
        schemaVersion: 'arena-speed-progress.firestore.v1',
        matchedIndexes: boundedIndexArray(progress.matchedIndexes, 12),
        triedIndexesByPair,
        wrongAttempts: Math.max(0, Math.min(100, Math.trunc(Number(progress.wrongAttempts ?? 0)))),
    };
}
function decodeArenaSpeedProgress(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return undefined;
    const source = value;
    const matchedIndexes = boundedIndexArray(source.matchedIndexes, 12);
    const legacy = Array.isArray(source.triedIndexes) ? source.triedIndexes : null;
    const stored = source.triedIndexesByPair && typeof source.triedIndexesByPair === 'object'
        && !Array.isArray(source.triedIndexesByPair) ? source.triedIndexesByPair : {};
    const pairCount = Math.min(12, Math.max(matchedIndexes.length, legacy?.length ?? 0, ...Object.keys(stored).map((key) => Number.isInteger(Number(key)) ? Number(key) + 1 : 0)));
    return {
        matchedIndexes,
        triedIndexes: Array.from({ length: pairCount }, (_, pairIndex) => boundedIndexArray(legacy?.[pairIndex] ?? stored[String(pairIndex)], 12, true).filter((entry) => entry >= 0)),
        wrongAttempts: Math.max(0, Math.min(100, Math.trunc(Number(source.wrongAttempts ?? 0)))),
    };
}
function hash32(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}
function deterministicOrder(items, seed) {
    return [...items].sort((left, right) => {
        const delta = hash32(`${seed}|${left.taskId}`) - hash32(`${seed}|${right.taskId}`);
        return delta || left.taskId.localeCompare(right.taskId);
    });
}
/**
 * Tournament publication remains the source of reviewed content, but Arena
 * freezes an independent, immutable four-pair snapshot into its private doc.
 */
function adaptTournamentTaskForArena(task, seed = task.taskId) {
    if (!(0, tournament_core_1.validateTournamentTaskForNewRoom)(task).ok)
        return null;
    if (task.mode !== 'speed_match')
        return structuredClone(task);
    const sourceItems = task.payload.items;
    const sourceRight = task.payload.rightOptions;
    const selectedIndexes = Array.from({ length: sourceItems.length }, (_, index) => index)
        .sort((left, right) => (hash32(`${seed}|${task.taskId}|pair|${left}`)
        - hash32(`${seed}|${task.taskId}|pair|${right}`)) || left - right)
        .slice(0, exports.ARENA_V2_SPEED_MATCH_PAIRS);
    const selectedItems = selectedIndexes.map((index) => sourceItems[index]);
    if (selectedItems.length !== exports.ARENA_V2_SPEED_MATCH_PAIRS)
        return null;
    const selectedSourceIndexes = selectedItems.map((item) => Number(item.correctIndex));
    if (new Set(selectedSourceIndexes).size !== exports.ARENA_V2_SPEED_MATCH_PAIRS)
        return null;
    // Правая колонка обязана быть не просто случайной, а без единого готового
    // ответа напротив своей строки. Ненулевой детерминированный сдвиг даёт
    // derangement для всех четырёх пар и одинаково воспроизводится по seed.
    const rotation = 1 + (hash32(`${seed}|${task.taskId}|right`) % (exports.ARENA_V2_SPEED_MATCH_PAIRS - 1));
    const rightSourceIndexes = selectedSourceIndexes.map((_, index) => (selectedSourceIndexes[(index + rotation) % exports.ARENA_V2_SPEED_MATCH_PAIRS]));
    const rightOptions = rightSourceIndexes.map((index) => sourceRight[index]);
    if (rightOptions.some((value) => typeof value !== 'string'))
        return null;
    const items = selectedItems.map((item) => {
        const correctIndex = rightSourceIndexes.indexOf(Number(item.correctIndex));
        if (correctIndex < 0)
            return null;
        const sourceReasons = item.explanation
            ?.wrongOptionReasons;
        const reorderedReasons = rightSourceIndexes.map((sourceIndex) => (typeof sourceReasons?.[sourceIndex] === 'string' ? sourceReasons[sourceIndex] : ''));
        return {
            ...structuredClone(item),
            options: rightOptions.slice(),
            correctIndex,
            ...(item.explanation && typeof item.explanation === 'object'
                ? {
                    explanation: {
                        ...structuredClone(item.explanation),
                        wrongOptionReasons: reorderedReasons,
                    },
                }
                : {}),
        };
    });
    if (items.some((item) => item === null))
        return null;
    const adapted = {
        ...structuredClone(task),
        payload: {
            ...structuredClone(task.payload),
            rightOptions,
            items,
        },
    };
    return (0, tournament_core_1.validateTournamentTask)(adapted).ok ? adapted : null;
}
/** Exactly two distinct reviewed tasks from each of the five approved modes. */
exports.ARENA_V2_MODE_ORDER = Object.freeze([
    'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
    'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
]);
exports.ARENA_V2_DIFFICULTY_BY_DIVISION_BAND = Object.freeze({
    '0-5': [1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
    '6-11': [1, 1, 1, 2, 2, 1, 2, 2, 2, 2],
    '12-17': [2, 2, 2, 2, 2, 2, 2, 2, 3, 3],
    '18-23': [2, 2, 2, 3, 3, 3, 3, 2, 3, 3],
});
/**
 * Быстрый матч берёт первые восемь слотов полного порядка: все пять типов
 * успевают встретиться, а три основных типа повторяются.
 */
function arenaModeOrder(mode) {
    return exports.ARENA_V2_MODE_ORDER.slice(0, arenaTaskCount(mode));
}
function arenaDifficultyPlan(divisionIndex, mode) {
    const band = divisionIndex <= 5 ? exports.ARENA_V2_DIFFICULTY_BY_DIVISION_BAND['0-5']
        : divisionIndex <= 11 ? exports.ARENA_V2_DIFFICULTY_BY_DIVISION_BAND['6-11']
            : divisionIndex <= 17 ? exports.ARENA_V2_DIFFICULTY_BY_DIVISION_BAND['12-17']
                : exports.ARENA_V2_DIFFICULTY_BY_DIVISION_BAND['18-23'];
    return band.slice(0, arenaTaskCount(mode));
}
function selectArenaTasks(source, seed, divisionIndex = 0, matchMode) {
    const grouped = new Map();
    const seen = new Set();
    for (const raw of source) {
        if (seen.has(raw.taskId))
            continue;
        if (!(0, tournament_core_1.validateTournamentTaskForNewRoom)(raw).ok
            || !tournament_mode_contract_1.OWNER_APPROVED_TOURNAMENT_MODES.includes(raw.mode))
            continue;
        seen.add(raw.taskId);
        const key = `${raw.mode}:${raw.difficulty}`;
        grouped.set(key, [...(grouped.get(key) ?? []), raw]);
    }
    const difficulties = arenaDifficultyPlan(Math.max(0, Math.min(23, Math.trunc(divisionIndex))));
    const result = [];
    const order = arenaModeOrder(matchMode);
    for (let index = 0; index < order.length; index += 1) {
        const mode = order[index];
        const difficulty = difficulties[index];
        const candidates = deterministicOrder(grouped.get(`${mode}:${difficulty}`) ?? [], `${seed}|${index}`);
        const selected = candidates.find((task) => !result.some((entry) => entry.taskId === task.taskId));
        if (!selected)
            return null;
        const adapted = adaptTournamentTaskForArena(selected, `${seed}|slot|${index}`);
        if (!adapted)
            return null;
        result.push(adapted);
    }
    return result.length === arenaTaskCount(matchMode) ? result : null;
}
/** No answer fingerprints and no explanation ever cross the public boundary. */
function toArenaPublicTask(task) {
    const publicTask = (0, tournament_core_1.toPublicTournamentTask)(task);
    if (!publicTask)
        return null;
    const { answerFingerprints: _discarded, ...safe } = publicTask;
    return safe;
}
function validateArenaPrivateEnvelope(envelope, matchMode) {
    const serializedBytes = Buffer.byteLength(JSON.stringify(envelope), 'utf8');
    const expectedTasks = arenaTaskCount(matchMode);
    if (envelope.tasks.length !== expectedTasks) {
        return { ok: false, reason: 'task_count_invalid', serializedBytes };
    }
    const counts = new Map();
    for (const task of envelope.tasks) {
        if (!(0, tournament_core_1.validateTournamentTask)(task).ok) {
            return { ok: false, reason: 'task_invalid', serializedBytes };
        }
        counts.set(task.mode, (counts.get(task.mode) ?? 0) + 1);
    }
    // зачем: владелец сделал быстрый матч из восьми заданий, а 8 не делится на
    // пять типов нацело — прежняя проверка `expectedTasks / модов` давала 1.6 и
    // ОТКЛОНЯЛА любой быстрый конверт (mode_quota_invalid), из-за чего матч с
    // ботом не создавался. Квоту берём из того же порядка слотов, по которому
    // задания и подбираются, — один источник правды для любой длины матча.
    const expectedCounts = new Map();
    for (const mode of arenaModeOrder(matchMode)) {
        expectedCounts.set(mode, (expectedCounts.get(mode) ?? 0) + 1);
    }
    if (tournament_mode_contract_1.OWNER_APPROVED_TOURNAMENT_MODES.some((mode) => (counts.get(mode) ?? 0) !== (expectedCounts.get(mode) ?? 0))) {
        return { ok: false, reason: 'mode_quota_invalid', serializedBytes };
    }
    if (serializedBytes >= exports.ARENA_V2_PRIVATE_BUDGET_BYTES) {
        return { ok: false, reason: 'private_size_budget_exceeded', serializedBytes };
    }
    return { ok: true, serializedBytes };
}
function arenaRankWindow(mode) {
    return mode === 'ranked' ? 1 : 3;
}
function arenaRanksCompatible(mode, leftRankIndex, rightRankIndex) {
    return Math.abs(Math.trunc(leftRankIndex) - Math.trunc(rightRankIndex)) <= arenaRankWindow(mode);
}
/**
 * Полное окно ответа; чтение и countdown в него не входят.
 *
 * зачем (владелец 2026-09-04, жалобы игроков «слишком быстро»): окна выросли
 * в 1.6–2.5 раза. Прежние 8 секунд на выбор фразы человек тратил целиком на
 * чтение перевода и четырёх вариантов, а на решение времени не оставалось —
 * матч ощущался не соревнованием, а проверкой скорости чтения.
 *
 * ТРЕТЬЯ копия этих чисел. Две другие — `ARENA_ANSWER_MS` в
 * `modules/arena/stars.ts` (клиент) и `functions/src/arena_stars_v3.ts`
 * (сервер). Правишь здесь — правь все три: расхождение означает, что игрок
 * видит один таймер, а зачёт идёт по другому.
 */
exports.ARENA_V2_ANSWER_MS = Object.freeze({
    guess_phrase: 20_000,
    fill_gap: 20_000,
    find_oddity: 30_000,
    translate_build: 40_000,
    speed_match: 50_000,
});
function arenaTaskDurationMs(mode) {
    return exports.ARENA_V2_READING_MS + exports.ARENA_V2_ANSWER_MS[mode] + exports.ARENA_V2_RECEIVE_GRACE_MS;
}
function arenaAcceptanceOpen(nowMs, deadlineAtMs) {
    return Number.isFinite(nowMs) && Number.isFinite(deadlineAtMs) && nowMs < deadlineAtMs;
}
function arenaObservedElapsedMs(receivedAtMs, readingEndsAtMs, mode) {
    return Math.max(0, Math.min(receivedAtMs - readingEndsAtMs, exports.ARENA_V2_ANSWER_MS[mode]));
}
function seededUnit(seed) {
    return (hash32(seed) + 0.5) / 0x1_0000_0000;
}
const ARENA_BOT_ACCURACY_BY_STRENGTH = {
    quick: { min: 0.55, max: 0.88, base: 0.58, perDivision: 0.012 },
    ranked: { min: 0.65, max: 0.92, base: 0.68, perDivision: 0.012 },
};
/** Immutable bot behavior generated before play; it never reads player progress. */
function buildArenaBotBlueprint(seed, divisionIndex, tasks, strength = 'quick') {
    const division = Math.max(0, Math.min(23, Math.trunc(divisionIndex)));
    const accuracyRange = ARENA_BOT_ACCURACY_BY_STRENGTH[strength];
    const baseAccuracy = Math.max(accuracyRange.min, Math.min(accuracyRange.max, accuracyRange.base + division * accuracyRange.perDivision));
    // зачем (владелец 2026-09-04, вместе с удлинением окон ответа): медиана
    // бота задана ДОЛЕЙ окна, а не абсолютными миллисекундами. Раньше здесь
    // стояло 7_500 мс на любое задание; после роста окон бот отвечал бы за
    // треть окна на всём подряд и забирал бы гонку «кто первым» почти всегда —
    // игрок получил бы больше времени и при этом стал бы чаще проигрывать.
    // 0.375 — прежние 7.5 с от прежних 20 с полного цикла быстрого задания,
    // то есть темп соперника остался тем же, каким его знали игроки.
    const medianShareOfWindow = 0.375;
    const divisionSpeedUp = division * 0.0075;
    const modifiers = {
        guess_phrase: 0.02,
        fill_gap: 0,
        find_oddity: -0.03,
        translate_build: -0.05,
        speed_match: -0.02,
    };
    return tasks.map((task, taskIndex) => {
        const mode = task.mode;
        const timeout = seededUnit(`${seed}|${taskIndex}|timeout`) < 0.03;
        const u1 = Math.max(Number.EPSILON, seededUnit(`${seed}|${taskIndex}|normal-a`));
        const u2 = seededUnit(`${seed}|${taskIndex}|normal-b`);
        const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const answerDeadlineMs = exports.ARENA_V2_ANSWER_MS[mode];
        const medianResponseMs = answerDeadlineMs
            * Math.max(0.2, medianShareOfWindow - divisionSpeedUp);
        const elapsedMs = timeout ? answerDeadlineMs : Math.round(Math.max(1_500, Math.min(answerDeadlineMs - 700, medianResponseMs * Math.exp(0.35 * normal))));
        const accuracy = Math.max(0, Math.min(1, baseAccuracy + (modifiers[mode] ?? 0)));
        if (mode === 'speed_match') {
            let matchedPairs = 0;
            for (let pair = 0; pair < exports.ARENA_V2_SPEED_MATCH_PAIRS; pair += 1) {
                if (!timeout && seededUnit(`${seed}|${taskIndex}|pair|${pair}`) < accuracy)
                    matchedPairs += 1;
            }
            const wrongAttempts = timeout ? 0 : exports.ARENA_V2_SPEED_MATCH_PAIRS - matchedPairs;
            return { correct: matchedPairs === exports.ARENA_V2_SPEED_MATCH_PAIRS, elapsedMs, timedOut: timeout, matchedPairs, wrongAttempts };
        }
        const correct = !timeout && seededUnit(`${seed}|${taskIndex}|correct`) < accuracy;
        return { correct, elapsedMs, timedOut: timeout, matchedPairs: 0, wrongAttempts: correct ? 0 : 1 };
    });
}
function scoreArenaAnswer(task, answer) {
    const correct = (0, tournament_core_1.verifyTournamentAnswer)(task, answer);
    return { correct, points: correct ? 100 : 0 };
}
function scoreArenaSpeedProgress(progress) {
    const matched = new Set(progress?.matchedIndexes
        ?.filter((index) => Number.isInteger(index) && index >= 0 && index < exports.ARENA_V2_SPEED_MATCH_PAIRS) ?? []).size;
    const wrongAttempts = Math.max(0, Math.trunc(progress?.wrongAttempts ?? 0));
    return Math.max(0, Math.min(100, matched * 25 - wrongAttempts * 5));
}
function resolveArenaOutcome(left, right) {
    if (left.score !== right.score) {
        return left.score > right.score
            ? { left: 'win', right: 'loss', reason: 'score' }
            : { left: 'loss', right: 'win', reason: 'score' };
    }
    if (left.fullySolved !== right.fullySolved) {
        return left.fullySolved > right.fullySolved
            ? { left: 'win', right: 'loss', reason: 'score' }
            : { left: 'loss', right: 'win', reason: 'score' };
    }
    const difference = Math.abs(Math.max(0, left.elapsedMs) - Math.max(0, right.elapsedMs));
    if (difference < exports.ARENA_V2_TIME_TIE_BREAK_MS)
        return { left: 'draw', right: 'draw', reason: 'draw' };
    return left.elapsedMs < right.elapsedMs
        ? { left: 'win', right: 'loss', reason: 'time' }
        : { left: 'loss', right: 'win', reason: 'time' };
}
// зачем: владелец (2026-08-23) отменил очки ранга (RP) и таблицу дельт по
// разнице дивизионов. Звёздная лестница: победа +1, поражение −1, ничья 0 —
// одинаково для любого соперника, ранг = звёзды ÷ 3.
function arenaRankIndexFromStars(stars) {
    return Math.max(0, Math.min(23, Math.floor(Math.max(0, stars) / 3)));
}
function arenaStarDeltaForOutcome(outcome) {
    return outcome === 'win' ? 1 : outcome === 'loss' ? -1 : 0;
}
function arenaSeasonWindow(nowMs) {
    const durationMs = exports.ARENA_V2_SEASON_LENGTH_DAYS * 24 * 60 * 60 * 1_000;
    const cycle = Math.max(0, Math.floor((Math.max(exports.ARENA_V2_SEASON_EPOCH_MS, nowMs)
        - exports.ARENA_V2_SEASON_EPOCH_MS) / durationMs));
    const startsAtMs = exports.ARENA_V2_SEASON_EPOCH_MS + cycle * durationMs;
    const endsAtMs = startsAtMs + durationMs;
    return { seasonId: `arena-${new Date(startsAtMs).toISOString().slice(0, 10)}`, startsAtMs, endsAtMs };
}
exports.ARENA_V2_DAILY_MULTIPLIERS = Object.freeze([
    1, 1, 1, 1, 0.5, 0.5,
]);
function arenaDailyMultiplier(eligibleMatchIndex) {
    return exports.ARENA_V2_DAILY_MULTIPLIERS[Math.max(0, Math.trunc(eligibleMatchIndex))] ?? 0;
}
function arenaSeasonStars(input) {
    /**
     * Начисляется ли за режим звёзды в кошелёк, решает ОДИН список — политика
     * режима в движке звёзд. Правило D-07 «быстрый матч звёзды не начисляет,
     * только опыт» ОТМЕНЕНО владельцем 2026-08-29: quick снова 'banked'.
     * Второй список режимов здесь и был причиной расхождения:
     * клиент получал в плане `starPolicy: 'none'` и обещал игроку ноль, а сервер
     * по своему списку записывал звёзды в сезон и кошелёк.
     */
    if (arena_stars_v3_1.ARENA_STAR_POLICY[input.mode] !== 'banked')
        return 0;
    const multiplied = Math.floor(Math.max(0, input.rawStars) * arenaDailyMultiplier(input.eligibleMatchIndex));
    return Math.max(0, Math.min(multiplied, 160 - Math.max(0, input.dailyStarsBefore)));
}
function arenaTaskStars(input) {
    if (input.task.mode === 'speed_match') {
        const matched = new Set(input.speedProgress?.matchedIndexes
            ?.filter((value) => Number.isInteger(value) && value >= 0 && value < exports.ARENA_V2_SPEED_MATCH_PAIRS) ?? []).size;
        const wrong = Math.max(0, Math.trunc(input.speedProgress?.wrongAttempts ?? 0));
        const fullBoardBonus = matched === exports.ARENA_V2_SPEED_MATCH_PAIRS ? Math.max(0, input.task.difficulty - 1) : 0;
        return Math.max(0, Math.min(6, matched + fullBoardBonus - wrong));
    }
    return input.correct ? ({ 1: 3, 2: 4, 3: 5 }[input.task.difficulty] ?? 0) : 0;
}
/**
 * Сколько матчей за сутки дают право на редкую награду. Считаются быстрые и
 * рейтинговые; звёзды при этом начисляют рейтинговый и быстрый (D-07 отменён
 * 2026-08-29), поэтому
 * счётчик отдельный от счётчика начисления.
 */
exports.ARENA_DAILY_REWARD_MATCHES = 6;
exports.ARENA_V2_SPIN_PITY_MATCHES = 80;
exports.ARENA_V2_SPIN_MINIMUM_ANSWERS = 8;
exports.ARENA_V2_SPIN_ODDS_BPS = Object.freeze({
    // Владелец (2026-08-12): шанс против бота выровнен с человеческим — иначе
    // внимательный игрок вычислял бы бота по статистике дропов.
    quick_bot: 50,
    quick_human: 50,
    // Ranked без победы (поражение, ничья, матч с ботом) сохраняет прежний шанс:
    // гарантия 2026-08-23 добавлена ТОЛЬКО поверх победы над человеком.
    ranked_human: 100,
});
/**
 * зачем (владелец, 23.08): спин за победу в рейтинге над реальным игроком
 * обязан выпадать КАЖДЫЙ раз, а не по шансу — раньше `ranked_human` тоже шёл
 * через `rollBps` (1%) с догоняющим pity на 80-м матче. Быстрые матчи (quick,
 * против бота или человека) остаются вероятностными без изменений — правка
 * касается только рейтинга. Обе защиты от фарма (минимум 8 ответов из 10,
 * не больше одного спина в сутки с матча) остаются как были — решение
 * владельца сохранить их при переходе на гарантию.
 */
function arenaRareSpin(input) {
    const pityBefore = Math.max(0, Math.trunc(input.pityBefore));
    const isRankedHumanWin = input.mode === 'ranked' && input.opponentKind === 'human' && input.outcome === 'win';
    // Прежняя шкала шансов сохранена для ВСЕХ остальных случаев: ranked без
    // победы (поражение, ничья, матч против бота) и любые быстрые матчи. Правка
    // владельца добавляет гарантию за победу, а не отбирает шанс у остальных.
    const kind = input.mode === 'ranked' ? 'ranked_human'
        : input.mode === 'quick' && input.opponentKind === 'bot' ? 'quick_bot'
            : input.mode === 'quick' ? 'quick_human' : null;
    const eligible = Boolean(kind) && input.rewardEligible
        && input.submittedAnswers >= exports.ARENA_V2_SPIN_MINIMUM_ANSWERS
        && input.dropsToday < 1;
    if (!eligible || !kind)
        return { awarded: false, pityAfter: pityBefore };
    // Победа над реальным человеком в рейтинге — гарантия, без ролла и pity.
    if (isRankedHumanWin)
        return { awarded: true, pityAfter: 0 };
    const awarded = pityBefore >= exports.ARENA_V2_SPIN_PITY_MATCHES - 1
        || (Number.isInteger(input.rollBps)
            && input.rollBps >= 0
            && input.rollBps < exports.ARENA_V2_SPIN_ODDS_BPS[kind]);
    return { awarded, pityAfter: awarded ? 0 : pityBefore + 1 };
}
exports.ARENA_V2_SEASON_LEVEL_STARS = 50;
function arenaSeasonLevelUnlocked(totalStars, level) {
    return Number.isInteger(level) && level >= 1
        && Math.max(0, Math.trunc(totalStars)) >= level * exports.ARENA_V2_SEASON_LEVEL_STARS;
}
function arenaSeasonReward(level, side) {
    if (level % 10 === 0)
        return { kind: 'spin_credit', amount: 1 };
    return { kind: 'shards', amount: side === 'plus' ? 15 : 5 };
}
//# sourceMappingURL=arena_v2_core.js.map