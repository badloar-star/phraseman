"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// tournament_core.ts — чистая логика режима «Турниры» (Фаза 1 MVP).
// Спека: docs/tournaments/2026-07-21-tournaments-mode-spec.md (§5, §7, §8, §11).
//
// Здесь НЕТ Firestore/CF — только типы, константы и детерминированная
// математика (seed-рандом, скоринг, стейт-машина, призы, сезонные очки,
// банк, генератор бот-персон). IO живёт в tournaments.ts / tournament_bots.ts,
// чтобы этот модуль был полностью покрыт юнит-тестами без эмулятора.
// ═══════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOURNAMENT_HOT_STREAK_TIERS = exports.TOURNAMENT_BANK_RATE = exports.TOURNAMENT_SEASON_POINTS = exports.TOURNAMENT_PRIZES = exports.TOURNAMENT_STREAK_X2_THRESHOLD = exports.TOURNAMENT_STREAK_X15_THRESHOLD = exports.TOURNAMENT_MAX_SPEED_BONUS_RATIO = exports.TOURNAMENT_VOICE_BASE_MULTIPLIER = exports.TOURNAMENT_BASE_SCORE = exports.TOURNAMENT_ROUND_MODE_KINDS = exports.TOURNAMENT_FILL_SERIALIZED_BUDGET_BYTES = exports.TOURNAMENT_TASK_LIMITS = exports.TOURNAMENT_STATE_CANCELLED = exports.TOURNAMENT_STATES = exports.DEFAULT_TOURNAMENT_SCHEDULE = exports.TOURNAMENT_ROOM_TTL_MS = exports.TOURNAMENT_REWARD_CLAIM_WINDOW_MS = exports.TOURNAMENT_RESULTS_DISPLAY_MS = exports.TOURNAMENT_FINAL_DISPLAY_MS = exports.TOURNAMENT_TABLE_DISPLAY_MS = exports.TOURNAMENT_CANCEL_COMPENSATION_GEMS = exports.TOURNAMENT_FILL_CANCELLATION_CUTOFF_MS = exports.TOURNAMENT_FILL_BOTS_AHEAD_MS = exports.TOURNAMENT_CREATE_AHEAD_MS = exports.TOURNAMENT_LOBBY_OPEN_MS = exports.TOURNAMENT_ROUNDS = exports.TOURNAMENT_MIN_REAL_PLAYERS = exports.TOURNAMENT_ROOM_SIZE = exports.TOURNAMENT_RECEIPTS_SUBCOLLECTION = exports.TOURNAMENT_REWARD_CLAIMS_SUBCOLLECTION = exports.TOURNAMENT_TICKETS_DOC = exports.BOT_PROFILES_COLLECTION = exports.TOURNAMENT_BANK_COLLECTION = exports.TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION = exports.TOURNAMENT_SEASONS_COLLECTION = exports.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION = exports.TOURNAMENT_TASKS_COLLECTION = exports.TOURNAMENT_ROOMS_COLLECTION = exports.TOURNAMENT_SCHEDULE_CONFIG_DOC = exports.TOURNAMENT_SCHEDULE_COLLECTION = void 0;
exports.normalizeTournamentSchedule = normalizeTournamentSchedule;
exports.tournamentRoomId = tournamentRoomId;
exports.dateKeyInTimezone = dateKeyInTimezone;
exports.slotStartMs = slotStartMs;
exports.isTournamentState = isTournamentState;
exports.canTransitionTournament = canTransitionTournament;
exports.nextTournamentState = nextTournamentState;
exports.canCancelTournament = canCancelTournament;
exports.roundStateFor = roundStateFor;
exports.tableStateFor = tableStateFor;
exports.stateAfterTournamentDeadline = stateAfterTournamentDeadline;
exports.stateDeadlineDurationMs = stateDeadlineDurationMs;
exports.validateTournamentTask = validateTournamentTask;
exports.toPublicTournamentTask = toPublicTournamentTask;
exports.loadCompleteTournamentTasks = loadCompleteTournamentTasks;
exports.validateTournamentFillMutation = validateTournamentFillMutation;
exports.verifyTournamentAnswer = verifyTournamentAnswer;
exports.tournamentFeatureGates = tournamentFeatureGates;
exports.serverBoundedElapsedMs = serverBoundedElapsedMs;
exports.scoreAnswer = scoreAnswer;
exports.scoreRound = scoreRound;
exports.applyTournamentSubmission = applyTournamentSubmission;
exports.applyTournamentJoin = applyTournamentJoin;
exports.planTournamentCancellation = planTournamentCancellation;
exports.completeTournamentRoundAtDeadline = completeTournamentRoundAtDeadline;
exports.planTournamentFinalization = planTournamentFinalization;
exports.tournamentHash32 = tournamentHash32;
exports.tournamentPrng = tournamentPrng;
exports.roundSeed = roundSeed;
exports.seededShuffle = seededShuffle;
exports.selectRoundTasks = selectRoundTasks;
exports.prizeForPlace = prizeForPlace;
exports.tournamentRewardPlan = tournamentRewardPlan;
exports.cancellationRefundForPlayer = cancellationRefundForPlayer;
exports.legacyTournamentRecoveryAction = legacyTournamentRecoveryAction;
exports.computePlacements = computePlacements;
exports.seasonPointsForPlace = seasonPointsForPlace;
exports.tournamentWeekId = tournamentWeekId;
exports.bankContributionGems = bankContributionGems;
exports.nextHotStreak = nextHotStreak;
exports.generateBotProfile = generateBotProfile;
exports.generateBotProfiles = generateBotProfiles;
exports.simulateBotAnswers = simulateBotAnswers;
// ── Коллекции ───────────────────────────────────────────────────────────────
exports.TOURNAMENT_SCHEDULE_COLLECTION = 'tournamentSchedule';
exports.TOURNAMENT_SCHEDULE_CONFIG_DOC = 'config';
exports.TOURNAMENT_ROOMS_COLLECTION = 'tournamentRooms';
exports.TOURNAMENT_TASKS_COLLECTION = 'tournamentTasks';
exports.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION = 'taskSecrets';
exports.TOURNAMENT_SEASONS_COLLECTION = 'tournamentSeasons';
exports.TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION = 'entries';
exports.TOURNAMENT_BANK_COLLECTION = 'tournamentBank';
exports.BOT_PROFILES_COLLECTION = 'botProfiles';
exports.TOURNAMENT_TICKETS_DOC = 'tickets';
exports.TOURNAMENT_REWARD_CLAIMS_SUBCOLLECTION = 'reward_claims';
/** Server-only tournament receipts. Unlike legacy reward_claims, clients cannot create these. */
exports.TOURNAMENT_RECEIPTS_SUBCOLLECTION = 'tournament_receipts';
// ── Размеры и лимиты (§3, §11 cost-контролы) ────────────────────────────────
exports.TOURNAMENT_ROOM_SIZE = 16;
exports.TOURNAMENT_MIN_REAL_PLAYERS = 8;
exports.TOURNAMENT_ROUNDS = 4;
exports.TOURNAMENT_LOBBY_OPEN_MS = 5 * 60 * 1000; // лобби за 5 мин до старта (§2)
exports.TOURNAMENT_CREATE_AHEAD_MS = 10 * 60 * 1000; // комнаты за 10 мин до слота
exports.TOURNAMENT_FILL_BOTS_AHEAD_MS = 2 * 60 * 1000; // два тика минутного scheduler до старта
exports.TOURNAMENT_FILL_CANCELLATION_CUTOFF_MS = 30 * 1000;
exports.TOURNAMENT_CANCEL_COMPENSATION_GEMS = 3; // «за ожидание» (§2)
exports.TOURNAMENT_TABLE_DISPLAY_MS = 12 * 1000;
exports.TOURNAMENT_FINAL_DISPLAY_MS = 5 * 1000;
exports.TOURNAMENT_RESULTS_DISPLAY_MS = 5 * 1000;
exports.TOURNAMENT_REWARD_CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;
exports.TOURNAMENT_ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
exports.DEFAULT_TOURNAMENT_SCHEDULE = Object.freeze({
    slots: [
        { slotId: 'daily_1200', localTime: '12:00', timezone: 'Europe/Moscow', ticketsRequired: 1, enabled: true },
        { slotId: 'daily_1900', localTime: '19:00', timezone: 'Europe/Moscow', ticketsRequired: 1, enabled: true },
        { slotId: 'daily_2100', localTime: '21:00', timezone: 'Europe/Moscow', ticketsRequired: 1, enabled: true },
    ],
    freeWeeklyEntry: true,
    ticketGemValue: 10,
});
function normalizeTournamentSchedule(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { slots: [], freeWeeklyEntry: false, ticketGemValue: 0 };
    }
    const data = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw
        : {};
    const rawSlots = Array.isArray(data.slots) ? data.slots : [];
    const slots = [];
    const seenSlotIds = new Set();
    for (const entry of rawSlots) {
        if (!entry || typeof entry !== 'object')
            continue;
        const e = entry;
        const slotId = String(e.slotId ?? '').trim().slice(0, 60);
        const localTime = String(e.localTime ?? '').trim();
        const timeMatch = /^(\d{2}):(\d{2})$/.exec(localTime);
        const timezone = String(e.timezone ?? '').trim().slice(0, 60);
        let timezoneValid = false;
        try {
            new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
            timezoneValid = true;
        }
        catch {
            timezoneValid = false;
        }
        if (!slotId || seenSlotIds.has(slotId) || !timeMatch || Number(timeMatch[1]) > 23
            || Number(timeMatch[2]) > 59 || !timezoneValid)
            continue;
        seenSlotIds.add(slotId);
        slots.push({
            slotId,
            localTime,
            timezone,
            ticketsRequired: Math.max(1, Math.trunc(Number(e.ticketsRequired)) || 1),
            enabled: e.enabled === true,
        });
    }
    return {
        slots,
        freeWeeklyEntry: data.freeWeeklyEntry === true,
        ticketGemValue: Math.max(0, Math.trunc(Number(data.ticketGemValue)) || 0),
    };
}
/** Детерминированный id комнаты: повторный запуск scheduler'а не создаёт дубль. */
function tournamentRoomId(slotId, timezone, dateKey) {
    return `${slotId}_${timezone.replace(/[^\w]/g, '_')}_${dateKey}`.slice(0, 140);
}
/** Дата YYYY-MM-DD в таймзоне слота (без Intl-полифиллов — через toLocaleString). */
function dateKeyInTimezone(nowMs, timezone) {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(new Date(nowMs));
        const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
        return `${get('year')}-${get('month')}-${get('day')}`;
    }
    catch {
        return new Date(nowMs).toISOString().slice(0, 10);
    }
}
/** Момент старта слота (ms) для данной даты в таймзоне. Аппроксимация через смещение. */
function slotStartMs(dateKey, localTime, timezone) {
    const guessUtc = Date.parse(`${dateKey}T${localTime}:00Z`);
    try {
        const asLocal = new Date(new Date(guessUtc).toLocaleString('en-US', { timeZone: timezone }));
        const asUtc = new Date(new Date(guessUtc).toLocaleString('en-US', { timeZone: 'UTC' }));
        const offsetMs = asLocal.getTime() - asUtc.getTime();
        return guessUtc - offsetMs;
    }
    catch {
        return guessUtc;
    }
}
// ── Стейт-машина комнаты (§11) ──────────────────────────────────────────────
exports.TOURNAMENT_STATES = [
    'scheduled', 'lobby',
    'round1', 'table1',
    'round2', 'table2',
    'round3', 'table3',
    'round4', 'final',
    'results', 'rewards', 'closed',
];
/** Отдельный терминал при отмене (мало живых игроков) — вне happy-path цепочки. */
exports.TOURNAMENT_STATE_CANCELLED = 'cancelled';
const STATE_ORDER = Object.freeze(exports.TOURNAMENT_STATES.reduce((acc, s, i) => ({ ...acc, [s]: i }), {}));
function isTournamentState(value) {
    return typeof value === 'string' && exports.TOURNAMENT_STATES.includes(value);
}
/** Единственный разрешённый переход — строго на следующее состояние. */
function canTransitionTournament(from, to) {
    if (!isTournamentState(from) || !isTournamentState(to))
        return false;
    return STATE_ORDER[to] === STATE_ORDER[from] + 1;
}
function nextTournamentState(from) {
    const idx = STATE_ORDER[from];
    return idx < exports.TOURNAMENT_STATES.length - 1 ? exports.TOURNAMENT_STATES[idx + 1] : null;
}
/** Отмена разрешена только до начала раундов (пока можно честно вернуть билеты). */
function canCancelTournament(state) {
    return state === 'scheduled' || state === 'lobby';
}
function roundStateFor(roundNo) {
    if (roundNo < 1 || roundNo > exports.TOURNAMENT_ROUNDS)
        return null;
    return `round${roundNo}`;
}
function tableStateFor(roundNo) {
    if (roundNo < 1 || roundNo > exports.TOURNAMENT_ROUNDS - 1)
        return null;
    return `table${roundNo}`;
}
/** The next persisted state after a server deadline. No table/final/results state is skipped. */
function stateAfterTournamentDeadline(state) {
    if (/^round[1-3]$/.test(state))
        return `table${state.slice(-1)}`;
    if (/^table[1-3]$/.test(state))
        return `round${Number(state.slice(-1)) + 1}`;
    if (state === 'round4')
        return 'final';
    if (state === 'final')
        return 'results';
    if (state === 'results')
        return 'rewards';
    if (state === 'rewards')
        return 'closed';
    return null;
}
function stateDeadlineDurationMs(state, taskCount = 0, maxMsPerTask = 10000) {
    if (/^round[1-4]$/.test(state))
        return Math.max(1, taskCount) * Math.max(1, maxMsPerTask);
    if (/^table[1-3]$/.test(state))
        return exports.TOURNAMENT_TABLE_DISPLAY_MS;
    if (state === 'final')
        return exports.TOURNAMENT_FINAL_DISPLAY_MS;
    if (state === 'results')
        return exports.TOURNAMENT_RESULTS_DISPLAY_MS;
    if (state === 'rewards')
        return exports.TOURNAMENT_REWARD_CLAIM_WINDOW_MS;
    return null;
}
exports.TOURNAMENT_TASK_LIMITS = Object.freeze({
    taskIdBytes: 160,
    modeBytes: 40,
    phraseBytes: 512,
    promptBytes: 512,
    referenceBytes: 1024,
    answerBytes: 1024,
    optionBytes: 128,
    tokenBytes: 128,
    tagBytes: 64,
    maxTags: 12,
    maxWordBankItems: 32,
    maxCorrectTokens: 32,
    maxTimeattackItems: 8,
    maxTimeattackOptions: 6,
    maxTaskIdsPerRound: 8,
    maxTaskSecrets: 32,
});
/** Aggregate guard is deliberately far below Firestore's 1 MiB document limit. */
exports.TOURNAMENT_FILL_SERIALIZED_BUDGET_BYTES = 384 * 1024;
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function nonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function boundedString(value, maxBytes) {
    return nonEmptyString(value) && Buffer.byteLength(value, 'utf8') <= maxBytes;
}
function boundedStringArray(value, options) {
    return Array.isArray(value)
        && (options.allowEmpty === true || value.length > 0)
        && value.length <= options.maxItems
        && value.every((entry) => boundedString(entry, options.maxItemBytes));
}
function hasOnlyKeys(value, allowed) {
    const allowlist = new Set(allowed);
    return Object.keys(value).every((key) => allowlist.has(key));
}
function taskKind(task) {
    const mode = String(task.mode || '').toLowerCase();
    if (task.isVoice || mode.includes('voice'))
        return 'voice';
    if (mode.includes('time'))
        return 'timeattack';
    if (mode.includes('translate'))
        return 'translate';
    return 'choice';
}
/** Fail-closed task contract. Only human-verified tasks with a complete answer key may run. */
function validateTournamentTask(task) {
    if (task?.verified !== true)
        return { ok: false, reason: 'task_not_verified' };
    if (!boundedString(task.taskId, exports.TOURNAMENT_TASK_LIMITS.taskIdBytes)
        || !boundedString(task.mode, exports.TOURNAMENT_TASK_LIMITS.modeBytes)
        || !isRecord(task.payload)) {
        return { ok: false, reason: 'task_identity_invalid' };
    }
    if (!boundedStringArray(task.tags, {
        maxItems: exports.TOURNAMENT_TASK_LIMITS.maxTags,
        maxItemBytes: exports.TOURNAMENT_TASK_LIMITS.tagBytes,
        allowEmpty: true,
    }))
        return { ok: false, reason: 'task_tags_invalid' };
    if (!Number.isInteger(task.difficulty) || task.difficulty < 1 || task.difficulty > 3) {
        return { ok: false, reason: 'task_difficulty_invalid' };
    }
    const kind = taskKind(task);
    if (kind === 'voice') {
        if (!hasOnlyKeys(task.payload, ['phrase', 'reference'])) {
            return { ok: false, reason: 'task_payload_fields_invalid' };
        }
        if (task.isVoice !== true
            || !boundedString(task.payload.phrase, exports.TOURNAMENT_TASK_LIMITS.phraseBytes)
            || !boundedString(task.payload.reference, exports.TOURNAMENT_TASK_LIMITS.referenceBytes)) {
            return { ok: false, reason: 'voice_contract_invalid' };
        }
        return { ok: true, kind };
    }
    if (kind === 'translate') {
        if (!hasOnlyKeys(task.payload, ['phrase', 'wordBank', 'correctTokens', 'correctAnswer'])) {
            return { ok: false, reason: 'task_payload_fields_invalid' };
        }
        const correctTokens = boundedStringArray(task.payload.correctTokens, {
            maxItems: exports.TOURNAMENT_TASK_LIMITS.maxCorrectTokens,
            maxItemBytes: exports.TOURNAMENT_TASK_LIMITS.tokenBytes,
        });
        const correctAnswer = boundedString(task.payload.correctAnswer, exports.TOURNAMENT_TASK_LIMITS.answerBytes);
        if (!boundedString(task.payload.phrase, exports.TOURNAMENT_TASK_LIMITS.phraseBytes)
            || !boundedStringArray(task.payload.wordBank, {
                maxItems: exports.TOURNAMENT_TASK_LIMITS.maxWordBankItems,
                maxItemBytes: exports.TOURNAMENT_TASK_LIMITS.tokenBytes,
            })
            || (!correctTokens && !correctAnswer)) {
            return { ok: false, reason: 'translate_contract_invalid' };
        }
        return { ok: true, kind };
    }
    if (kind === 'timeattack') {
        if (!hasOnlyKeys(task.payload, ['prompt', 'items'])) {
            return { ok: false, reason: 'task_payload_fields_invalid' };
        }
        const items = task.payload.items;
        if (!boundedString(task.payload.prompt, exports.TOURNAMENT_TASK_LIMITS.promptBytes)
            || !Array.isArray(items) || items.length === 0
            || items.length > exports.TOURNAMENT_TASK_LIMITS.maxTimeattackItems
            || items.some((item) => {
                if (!isRecord(item) || !hasOnlyKeys(item, ['prompt', 'options', 'correctIndex'])
                    || !boundedString(item.prompt, exports.TOURNAMENT_TASK_LIMITS.promptBytes)
                    || !boundedStringArray(item.options, {
                        maxItems: exports.TOURNAMENT_TASK_LIMITS.maxTimeattackOptions,
                        maxItemBytes: exports.TOURNAMENT_TASK_LIMITS.optionBytes,
                    })
                    || item.options.length < 2 || !Number.isInteger(item.correctIndex))
                    return true;
                const index = Number(item.correctIndex);
                return index < 0 || index >= item.options.length;
            }))
            return { ok: false, reason: 'timeattack_contract_invalid' };
        return { ok: true, kind };
    }
    if (!hasOnlyKeys(task.payload, ['phrase', 'options', 'correctIndex', 'correctAnswer'])) {
        return { ok: false, reason: 'task_payload_fields_invalid' };
    }
    const options = task.payload.options;
    const correctIndex = task.payload.correctIndex;
    const optionalCorrectAnswer = task.payload.correctAnswer;
    if (!boundedString(task.payload.phrase, exports.TOURNAMENT_TASK_LIMITS.phraseBytes)
        || !boundedStringArray(options, { maxItems: 4, maxItemBytes: exports.TOURNAMENT_TASK_LIMITS.optionBytes })
        || options.length !== 4 || !Number.isInteger(correctIndex)
        || (optionalCorrectAnswer !== undefined
            && !boundedString(optionalCorrectAnswer, exports.TOURNAMENT_TASK_LIMITS.answerBytes))
        || Number(correctIndex) < 0 || Number(correctIndex) >= options.length) {
        return { ok: false, reason: 'choice_contract_invalid' };
    }
    return { ok: true, kind };
}
function publicPayloadForTask(task, kind) {
    if (kind === 'choice') {
        return {
            phrase: String(task.payload.phrase),
            options: task.payload.options.slice(),
        };
    }
    if (kind === 'translate') {
        return {
            phrase: String(task.payload.phrase),
            wordBank: task.payload.wordBank.slice(),
        };
    }
    if (kind === 'timeattack') {
        return {
            prompt: String(task.payload.prompt),
            items: task.payload.items.map((item) => ({
                prompt: String(item.prompt),
                options: item.options.slice(),
            })),
        };
    }
    return { phrase: String(task.payload.phrase) };
}
function toPublicTournamentTask(task) {
    const validation = validateTournamentTask(task);
    if (!validation.ok)
        return null;
    return {
        taskId: task.taskId,
        mode: task.mode,
        kind: validation.kind,
        isVoice: task.isVoice,
        difficulty: task.difficulty,
        payload: publicPayloadForTask(task, validation.kind),
    };
}
/**
 * Reads an immutable task snapshot without converting infrastructure errors
 * into missing data. A rejected read propagates; only a proven absent or
 * invalid task returns null so callers may choose a safe cancellation path.
 */
async function loadCompleteTournamentTasks(taskIds, readTask) {
    const unique = Array.from(new Set(taskIds.filter(Boolean)));
    const tasks = await Promise.all(unique.map(readTask));
    if (tasks.length !== unique.length || tasks.some((task) => task === null))
        return null;
    return tasks;
}
function stableJson(value) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value))
        return `[${value.map(stableJson).join(',')}]`;
    if (isRecord(value)) {
        return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined)
            .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(null);
}
/**
 * Deterministically budgets the entire fill write-set, not just the room doc.
 * Counting taskSecrets as part of the same envelope adds a conservative margin
 * on top of the 384 KiB cap and prevents a valid-looking pool from failing at commit.
 */
function validateTournamentFillMutation(input) {
    const invalidRounds = input.rounds.length !== 4 || input.rounds.some((round) => (!Number.isInteger(round.roundNo)
        || !boundedString(round.mode, exports.TOURNAMENT_TASK_LIMITS.modeBytes)
        || !Array.isArray(round.taskIds)
        || round.taskIds.length === 0
        || round.taskIds.length > exports.TOURNAMENT_TASK_LIMITS.maxTaskIdsPerRound
        || !round.taskIds.every((taskId) => boundedString(taskId, exports.TOURNAMENT_TASK_LIMITS.taskIdBytes))
        || new Set(round.taskIds).size !== round.taskIds.length
        || (round.tasks !== undefined && (!Array.isArray(round.tasks) || round.tasks.length !== round.taskIds.length))));
    if (invalidRounds)
        return { ok: false, reason: 'fill_rounds_invalid', serializedBytes: 0 };
    if (input.selectedTasks.length === 0
        || input.selectedTasks.length > exports.TOURNAMENT_TASK_LIMITS.maxTaskSecrets
        || new Set(input.selectedTasks.map((task) => task.taskId)).size !== input.selectedTasks.length
        || input.selectedTasks.some((task) => !validateTournamentTask(task).ok)) {
        return { ok: false, reason: 'fill_tasks_invalid', serializedBytes: 0 };
    }
    const selectedIds = new Set(input.selectedTasks.map((task) => task.taskId));
    if (input.rounds.some((round) => round.taskIds.some((taskId) => !selectedIds.has(taskId)))) {
        return { ok: false, reason: 'fill_tasks_invalid', serializedBytes: 0 };
    }
    if (input.room.players.length + input.botPlayers.length > exports.TOURNAMENT_ROOM_SIZE) {
        return { ok: false, reason: 'fill_players_invalid', serializedBytes: 0 };
    }
    const envelope = {
        roomMutation: {
            ...input.room,
            players: [...input.room.players, ...input.botPlayers],
            rounds: input.rounds,
            ...(input.metadata || {}),
        },
        taskSecrets: input.selectedTasks.slice().sort((left, right) => left.taskId.localeCompare(right.taskId)),
        privateBotMetadata: input.privateBotMetadata,
    };
    const serializedBytes = Buffer.byteLength(stableJson(envelope), 'utf8');
    return serializedBytes <= exports.TOURNAMENT_FILL_SERIALIZED_BUDGET_BYTES
        ? { ok: true, serializedBytes }
        : { ok: false, reason: 'fill_size_budget_exceeded', serializedBytes };
}
function normalizedTokens(value) {
    if (!Array.isArray(value) || value.some((token) => typeof token !== 'string'))
        return null;
    return value.map((token) => token.trim()).filter(Boolean);
}
/** Server answer normalization. Voice is deliberately disabled until evidence is server-verifiable. */
function verifyTournamentAnswer(task, answer) {
    const validation = validateTournamentTask(task);
    if (!validation.ok || validation.kind === 'voice' || !isRecord(answer))
        return false;
    if (validation.kind === 'choice') {
        return Number.isInteger(answer.selectedIndex) && answer.selectedIndex === task.payload.correctIndex;
    }
    if (validation.kind === 'translate') {
        const given = normalizedTokens(answer.tokens);
        if (!given)
            return false;
        const expectedTokens = normalizedTokens(task.payload.correctTokens)
            ?? (nonEmptyString(task.payload.correctAnswer) ? String(task.payload.correctAnswer).trim().split(/\s+/) : null);
        return !!expectedTokens && given.length === expectedTokens.length
            && given.every((token, index) => token === expectedTokens[index]);
    }
    const selected = answer.selectedIndexes;
    const items = task.payload.items;
    return Array.isArray(selected) && selected.length === items.length
        && selected.every((index, itemIndex) => Number.isInteger(index) && index === items[itemIndex].correctIndex);
}
function tournamentFeatureGates() {
    return {
        voiceScoring: { enabled: false, reason: 'verified_voice_evidence_contract_missing' },
        xpCashback: { enabled: false, reason: 'progress_event_contract_missing' },
        avatarFrameExpiry: { enabled: false, reason: 'avatar_frame_contract_missing' },
        referralTickets: { enabled: false, reason: 'referral_receipt_contract_missing' },
        seasonPayout: { enabled: false, reason: 'season_payout_contract_missing' },
    };
}
/** Чередование режимов раундов (§5): 1 и 3 — одиночный, 2 и 4 — микс. */
exports.TOURNAMENT_ROUND_MODE_KINDS = ['single', 'mix', 'single', 'mix'];
// ── Скоринг (§5): база + бонус скорости ≤+40% + стрик ×1.5/×2 ───────────────
exports.TOURNAMENT_BASE_SCORE = 100;
exports.TOURNAMENT_VOICE_BASE_MULTIPLIER = 1.5;
exports.TOURNAMENT_MAX_SPEED_BONUS_RATIO = 0.4;
exports.TOURNAMENT_STREAK_X15_THRESHOLD = 3;
exports.TOURNAMENT_STREAK_X2_THRESHOLD = 5;
function serverBoundedElapsedMs(input) {
    const maxMs = Math.max(1, Math.trunc(input.maxMsPerTask));
    const count = Math.max(1, Math.trunc(input.taskCount));
    const raw = input.receivedAtMs - input.stateStartedAtMs;
    if (!Number.isFinite(raw) || raw < 0)
        return maxMs;
    return Math.min(maxMs, Math.max(0, Math.ceil(raw / count)));
}
/**
 * Очки за один ответ.
 * - неверный ответ = 0 (и сброс серии на уровне раунда);
 * - база 100, голосовые задания ×1.5 (компенсация времени ответа, §5);
 * - бонус скорости линейный до +40% (мгновенный ответ = полный бонус);
 * - стрик-множитель применяется к (база+бонус): ×1.5 с серии 3, ×2 с серии 5.
 */
function scoreAnswer(input) {
    if (!input.correct)
        return 0;
    const base = Math.max(1, Math.trunc(input.baseScore ?? exports.TOURNAMENT_BASE_SCORE));
    const baseWithVoice = base * (input.isVoice ? exports.TOURNAMENT_VOICE_BASE_MULTIPLIER : 1);
    const maxMs = Math.max(1, input.maxMs);
    const elapsed = Math.min(Math.max(0, input.elapsedMs), maxMs);
    const speedBonus = baseWithVoice * exports.TOURNAMENT_MAX_SPEED_BONUS_RATIO * (1 - elapsed / maxMs);
    // streakBefore — серия ДО этого ответа; текущий ответ = streakBefore + 1.
    // ×1.5 начинается с 3-го правильного подряд, ×2 — с 5-го (§5).
    const streakWithCurrent = input.streakBefore + 1;
    const streakMult = streakWithCurrent >= exports.TOURNAMENT_STREAK_X2_THRESHOLD
        ? 2
        : streakWithCurrent >= exports.TOURNAMENT_STREAK_X15_THRESHOLD
            ? 1.5
            : 1;
    return Math.round((baseWithVoice + speedBonus) * streakMult);
}
/** Итог раунда: очки и новая серия. Неверный ответ сбрасывает серию. */
function scoreRound(answers) {
    let roundScore = 0;
    let streak = 0;
    for (const a of answers) {
        const effective = { ...a, streakBefore: a.correct ? streak : a.streakBefore };
        roundScore += scoreAnswer(effective);
        streak = a.correct ? streak + 1 : 0;
    }
    return { roundScore, streakAfter: streak };
}
function scoreInputsWithStartingStreak(answers, streakStart) {
    let roundScore = 0;
    let correct = 0;
    let streak = Math.max(0, streakStart);
    for (const answer of answers) {
        roundScore += scoreAnswer({ ...answer, streakBefore: streak });
        if (answer.correct) {
            correct += 1;
            streak += 1;
        }
        else {
            streak = 0;
        }
    }
    return { roundScore, correct, streakAfter: streak };
}
/**
 * Pure transaction plan for a submission. Firestore retries call this again with
 * the newest room snapshot, so two different players merge and a replay is inert.
 */
function applyTournamentSubmission(room, submission) {
    const roundIndex = room.rounds.findIndex((entry) => entry.roundNo === submission.roundNo);
    if (roundIndex < 0)
        throw new Error('round_not_found');
    const existing = room.rounds[roundIndex].results?.[submission.playerId];
    const replacingTimedOut = existing?.submissionStatus === 'timed_out' || existing?.timedOut === true;
    if (existing && !replacingTimedOut) {
        return { room, replay: true, result: existing, allRealSubmitted: false };
    }
    const activeState = roundStateFor(submission.roundNo);
    if (!activeState)
        throw new Error('round_not_active');
    if (replacingTimedOut) {
        if (room.state !== stateAfterTournamentDeadline(activeState))
            throw new Error('round_closed');
    }
    else if (room.state !== activeState) {
        throw new Error('round_not_active');
    }
    const deadlineAtMs = replacingTimedOut ? existing.submittedAtMs : room.stateDeadlineAtMs;
    if (deadlineAtMs && submission.receivedAtMs > deadlineAtMs)
        throw new Error('round_deadline_elapsed');
    const playerIndex = room.players.findIndex((entry) => !entry.isBot && entry.id === submission.playerId);
    if (playerIndex < 0)
        throw new Error('not_in_room');
    const maxMsPerTask = Math.max(1, Math.trunc(submission.maxMsPerTask ?? 10000));
    const taskCount = Math.max(1, room.rounds[roundIndex].taskIds.length);
    const roundStartedAtMs = replacingTimedOut
        ? existing.roundStartedAtMs ?? Math.max(0, existing.submittedAtMs - taskCount * maxMsPerTask)
        : room.stateStartedAtMs ?? submission.receivedAtMs;
    const elapsedMs = serverBoundedElapsedMs({
        stateStartedAtMs: roundStartedAtMs,
        receivedAtMs: submission.receivedAtMs,
        taskCount,
        maxMsPerTask,
    });
    const taskMap = new Map(submission.tasks.map((task) => [task.taskId, task]));
    const answerMap = new Map(submission.answers.map((entry) => [entry.taskId, entry.answer]));
    const inputs = room.rounds[roundIndex].taskIds.map((taskId) => {
        const task = taskMap.get(taskId);
        return {
            correct: !!task && verifyTournamentAnswer(task, answerMap.get(taskId)),
            elapsedMs,
            maxMs: maxMsPerTask,
            streakBefore: 0,
            isVoice: task?.isVoice === true,
        };
    });
    const player = room.players[playerIndex];
    const streakBefore = replacingTimedOut ? existing.streakBefore ?? player.streak : player.streak;
    const scored = scoreInputsWithStartingStreak(inputs, streakBefore);
    const result = {
        playerId: submission.playerId,
        correct: scored.correct,
        total: room.rounds[roundIndex].taskIds.length,
        roundScore: scored.roundScore,
        submittedAtMs: submission.receivedAtMs,
        submissionStatus: 'submitted',
        streakBefore,
        roundStartedAtMs,
    };
    const players = room.players.map((entry, index) => index === playerIndex
        ? {
            ...entry,
            score: entry.score - (replacingTimedOut ? existing.roundScore : 0) + scored.roundScore,
            streak: scored.streakAfter,
        }
        : { ...entry });
    const rounds = room.rounds.map((entry, index) => index === roundIndex
        ? { ...entry, results: { ...(entry.results || {}), [submission.playerId]: result } }
        : { ...entry, results: { ...(entry.results || {}) } });
    const allRealSubmitted = players.filter((entry) => !entry.isBot)
        .every((entry) => !!rounds[roundIndex].results[entry.id]);
    return {
        room: { ...room, players, rounds, version: room.version + 1 },
        replay: false,
        result,
        allRealSubmitted,
    };
}
function applyTournamentJoin(room, player, authUid, nowMs) {
    if (room.state === exports.TOURNAMENT_STATE_CANCELLED || room.state === 'closed')
        throw new Error('room_not_joinable');
    const existing = room.players.some((entry) => !entry.isBot && entry.id === player.id);
    if (existing) {
        if (room.participantAuthUids?.includes(authUid))
            return room;
        return {
            ...room,
            participantAuthUids: Array.from(new Set([...(room.participantAuthUids || []), authUid])),
            version: room.version + 1,
        };
    }
    if (room.state !== 'lobby')
        throw new Error('room_not_joinable');
    if (nowMs !== undefined && nowMs >= room.startsAt)
        throw new Error('join_cutoff_elapsed');
    if (room.players.length >= exports.TOURNAMENT_ROOM_SIZE)
        throw new Error('room_full');
    return {
        ...room,
        players: [...room.players.map((entry) => ({ ...entry })), { ...player }],
        participantAuthUids: Array.from(new Set([...(room.participantAuthUids || []), authUid])),
        version: room.version + 1,
    };
}
function planTournamentCancellation(room, reason, nowMs, options = {}) {
    const receiptId = `tournament_cancel_${room.roomId}`;
    if (room.state === exports.TOURNAMENT_STATE_CANCELLED || room.cancellationReceiptId) {
        return { room, receiptId: room.cancellationReceiptId || receiptId, alreadyCancelled: true, refunds: [] };
    }
    if (!canCancelTournament(room.state) && !options.allowActive)
        throw new Error('room_not_cancellable');
    const refunds = room.players.flatMap((player) => {
        const refund = cancellationRefundForPlayer(player, { fallbackTickets: options.fallbackTickets });
        return refund ? [{ playerId: player.id, ...refund }] : [];
    });
    return {
        receiptId,
        alreadyCancelled: false,
        refunds,
        room: {
            ...room,
            state: exports.TOURNAMENT_STATE_CANCELLED,
            cancelReason: reason,
            cancelledAtMs: nowMs,
            cancellationReceiptId: receiptId,
            stateStartedAtMs: nowMs,
            stateDeadlineAtMs: undefined,
            players: room.players.map((player) => player.isBot ? { ...player } : { ...player, refunded: true }),
            version: room.version + 1,
        },
    };
}
function completeTournamentRoundAtDeadline(room, tasks, nowMs) {
    const match = /^round([1-4])$/.exec(String(room.state));
    if (!match)
        throw new Error('round_not_active');
    if (room.stateDeadlineAtMs && nowMs < room.stateDeadlineAtMs)
        throw new Error('round_deadline_not_elapsed');
    const roundNo = Number(match[1]);
    const roundIndex = room.rounds.findIndex((entry) => entry.roundNo === roundNo);
    if (roundIndex < 0)
        throw new Error('round_not_found');
    const rounds = room.rounds.map((entry) => ({ ...entry, results: { ...(entry.results || {}) } }));
    const players = room.players.map((entry) => ({ ...entry }));
    const taskMap = new Map(tasks.map((task) => [task.taskId, task]));
    const roundTasks = rounds[roundIndex].taskIds.map((id) => taskMap.get(id)).filter((task) => !!task);
    if (roundTasks.length !== rounds[roundIndex].taskIds.length)
        throw new Error('round_tasks_unavailable');
    for (let index = 0; index < players.length; index += 1) {
        const player = players[index];
        if (rounds[roundIndex].results[player.id])
            continue;
        if (!player.isBot) {
            const deadlineAtMs = room.stateDeadlineAtMs ?? nowMs;
            rounds[roundIndex].results[player.id] = {
                playerId: player.id,
                correct: 0,
                total: rounds[roundIndex].taskIds.length,
                roundScore: 0,
                submittedAtMs: deadlineAtMs,
                submissionStatus: 'timed_out',
                streakBefore: player.streak,
                roundStartedAtMs: room.stateStartedAtMs ?? deadlineAtMs,
                timedOut: true,
            };
            players[index] = { ...player, streak: 0 };
            continue;
        }
        const profile = {
            botId: player.id,
            name: player.name,
            avatarEmoji: player.avatar,
            rank: 'silver',
            titles: [],
            winRate: Math.min(0.85, Math.max(0.15, player.botWinRate ?? 0.5)),
            color: player.color,
        };
        const inputs = simulateBotAnswers(profile, { roomId: room.roomId, roundNo, tasks: roundTasks, maxMsPerTask: 10000 });
        const scored = scoreInputsWithStartingStreak(inputs, player.streak);
        players[index] = { ...player, score: player.score + scored.roundScore, streak: scored.streakAfter };
        rounds[roundIndex].results[player.id] = {
            playerId: player.id,
            correct: scored.correct,
            total: rounds[roundIndex].taskIds.length,
            roundScore: scored.roundScore,
            submittedAtMs: nowMs,
            submissionStatus: 'simulated',
            streakBefore: player.streak,
            roundStartedAtMs: room.stateStartedAtMs ?? nowMs,
        };
    }
    const nextState = stateAfterTournamentDeadline(room.state);
    if (!nextState)
        throw new Error('round_transition_unavailable');
    const duration = stateDeadlineDurationMs(nextState);
    return {
        completedRoundNo: roundNo,
        room: {
            ...room,
            players,
            rounds,
            state: nextState,
            stateStartedAtMs: nowMs,
            stateDeadlineAtMs: duration === null ? undefined : nowMs + duration,
            version: room.version + 1,
        },
    };
}
function planTournamentFinalization(room, nowMs) {
    const receiptId = `tournament_finalize_${room.roomId}`;
    if (room.finalizationReceiptId || room.state === 'rewards' || room.state === 'closed') {
        return { room, receiptId: room.finalizationReceiptId || receiptId, alreadyFinalized: true, playerEffects: [] };
    }
    if (room.state !== 'results')
        throw new Error('room_not_ready_to_finalize');
    if (!room.stateDeadlineAtMs || room.stateDeadlineAtMs <= 0)
        throw new Error('results_deadline_missing');
    if (nowMs < room.stateDeadlineAtMs)
        throw new Error('results_visibility_pending');
    const { realPlacements } = computePlacements(room.players);
    const playerEffects = realPlacements.map(({ player, place }) => ({
        playerId: player.id,
        place,
        seasonPoints: seasonPointsForPlace(place),
        tournamentsPlayed: 1,
        won: place === 1,
        reward: tournamentRewardPlan(place),
    }));
    return {
        receiptId,
        alreadyFinalized: false,
        playerEffects,
        room: {
            ...room,
            state: 'rewards',
            finalizationReceiptId: receiptId,
            stateStartedAtMs: nowMs,
            stateDeadlineAtMs: nowMs + exports.TOURNAMENT_REWARD_CLAIM_WINDOW_MS,
            version: room.version + 1,
        },
    };
}
// ── Seeded RNG (§6): seed = roomId + roundNo, детерминированная верификация ──
function tournamentHash32(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
/** mulberry32 — быстрый детерминированный PRNG из 32-битного seed. */
function tournamentPrng(seed) {
    let a = tournamentHash32(seed);
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function roundSeed(roomId, roundNo) {
    return `${roomId}:${roundNo}`;
}
/** Детерминированный shuffle (Fisher–Yates на seeded PRNG). */
function seededShuffle(items, seed) {
    const rand = tournamentPrng(seed);
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
    }
    return out;
}
/**
 * Детерминированный выбор заданий раунда из пула. Один и тот же
 * (roomId, roundNo, pool) всегда даёт один и тот же сет — сервер верифицирует
 * ответы по тому же seed (§6).
 */
function selectRoundTasks(params) {
    const { pool, roomId, roundNo, count, modeKind } = params;
    const seed = roundSeed(roomId, roundNo);
    const allowedDifficulties = roundNo === 1 ? [1]
        : roundNo === 2 ? [1, 2]
            : roundNo === 3 ? [2]
                : roundNo === 4 ? [2, 3]
                    : [];
    const voiceEnabled = Boolean(tournamentFeatureGates().voiceScoring.enabled);
    const verified = pool.filter((candidate) => {
        const validation = validateTournamentTask(candidate);
        return validation.ok
            && (validation.kind !== 'voice' || voiceEnabled)
            && allowedDifficulties.includes(candidate.difficulty);
    });
    let candidates = verified;
    if (modeKind === 'single' && verified.length > 0) {
        const modes = Array.from(new Set(verified.map((t) => t.mode))).sort();
        const rand = tournamentPrng(`${seed}:mode`);
        const mode = modes[Math.floor(rand() * modes.length)];
        candidates = verified.filter((t) => t.mode === mode);
    }
    return seededShuffle(candidates, seed).slice(0, Math.max(0, count));
}
exports.TOURNAMENT_PRIZES = Object.freeze([
    { place: 1, gems: 50, ticketBack: true, titleId: 'tournament_champion_of_day', avatarFrameId: 'tournament_gold_frame_24h' },
    { place: 2, gems: 25, ticketBack: true },
    { place: 3, gems: 10, ticketBack: false },
]);
function prizeForPlace(place) {
    return exports.TOURNAMENT_PRIZES.find((p) => p.place === place) ?? null;
}
function tournamentRewardPlan(place) {
    const prize = prizeForPlace(place);
    return {
        place,
        gems: prize?.gems ?? 0,
        tickets: prize?.ticketBack ? 1 : 0,
        titleId: prize?.titleId ?? null,
        pending: {
            xpCashback: 'disabled_pending_progress_event_contract',
            avatarFrameExpiry: 'disabled_pending_avatar_frame_contract',
            referralTickets: 'disabled_pending_referral_receipt_contract',
            seasonPayout: 'disabled_pending_season_payout_contract',
        },
    };
}
function cancellationRefundForPlayer(player, options = {}) {
    if (player.isBot)
        return null;
    const entry = player.entry;
    return {
        tickets: entry?.kind === 'ticket'
            ? Math.max(0, Math.trunc(entry.ticketsSpent))
            : entry ? 0 : Math.max(0, Math.trunc(options.fallbackTickets ?? 0)),
        restoreFreeWeek: entry?.kind === 'free_weekly' ? entry.weekId : null,
        bankContributionGems: Math.max(0, Math.trunc(entry?.bankContributionGems ?? 0)),
        compensationGems: exports.TOURNAMENT_CANCEL_COMPENSATION_GEMS,
    };
}
/**
 * Legacy rooms predate persisted deadlines and immutable task snapshots. Once
 * their start has passed, missing evidence is not reconstructed or guessed:
 * the server cancels and refunds them instead of charging or stranding users.
 */
function legacyTournamentRecoveryAction(room, nowMs, hasCompleteTaskSecrets) {
    if (room.state === exports.TOURNAMENT_STATE_CANCELLED || room.state === 'closed')
        return 'wait';
    if (room.state === 'scheduled' || room.state === 'lobby') {
        if (!room.stateDeadlineAtMs)
            return nowMs < room.startsAt ? 'wait' : 'cancel';
        return nowMs < room.stateDeadlineAtMs ? 'wait' : 'advance';
    }
    if (/^round[1-4]$/.test(room.state) && !hasCompleteTaskSecrets)
        return 'cancel';
    if (!room.stateDeadlineAtMs)
        return 'cancel';
    return room.stateDeadlineAtMs <= nowMs ? 'advance' : 'wait';
}
/**
 * Итоговые места. Боты НЕ занимают призовые места (§3): сортировка общая,
 * но призы сдвигаются к живым игрокам.
 */
function computePlacements(players) {
    const standings = players.slice().sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const realPlacements = standings
        .filter((p) => !p.isBot)
        .map((player, idx) => ({ player, place: idx + 1 }));
    return { standings, realPlacements };
}
// ── Сезон (§8) ──────────────────────────────────────────────────────────────
exports.TOURNAMENT_SEASON_POINTS = Object.freeze({
    place1: 25,
    place2: 15,
    place3: 10,
    participation: 2,
});
function seasonPointsForPlace(place) {
    if (place === 1)
        return exports.TOURNAMENT_SEASON_POINTS.place1;
    if (place === 2)
        return exports.TOURNAMENT_SEASON_POINTS.place2;
    if (place === 3)
        return exports.TOURNAMENT_SEASON_POINTS.place3;
    return exports.TOURNAMENT_SEASON_POINTS.participation;
}
/** ISO-неделя (та же формула, что currentWeekId в league_chest.ts). */
function tournamentWeekId(nowMs = Date.now()) {
    const d = new Date(nowMs);
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
// ── Банк недели (§9, КФ-4) ──────────────────────────────────────────────────
/** 20% стоимости билета в 💎 капает в банк недели. */
exports.TOURNAMENT_BANK_RATE = 0.2;
function bankContributionGems(ticketsSpent, ticketGemValue) {
    const raw = Math.max(0, ticketsSpent) * Math.max(0, ticketGemValue) * exports.TOURNAMENT_BANK_RATE;
    return Math.floor(raw);
}
// ── Горячая серия (§9, КФ-7) ────────────────────────────────────────────────
exports.TOURNAMENT_HOT_STREAK_TIERS = Object.freeze([
    { wins: 3, reward: 'flame_frame_week' },
    { wins: 5, reward: 'title_unstoppable' },
    { wins: 10, reward: 'legendary_badge_bank_bonus' },
]);
function nextHotStreak(current, won) {
    return won ? Math.max(0, current) + 1 : 0;
}
const BOT_NAMES = [
    'Марина', 'Тёма', 'Соня', 'Дэн', 'Лера', 'Гоша', 'Настя', 'Петрович',
    'Юля', 'Сева', 'Кира', 'Макс', 'Олеся', 'Тимур', 'Вера', 'Гриша',
    'Даша', 'Эльдар', 'Милана', 'Савва', 'Алиса', 'Ратмир', 'Злата', 'Егор',
];
const BOT_EMOJI = ['🦊', '🐼', '🦉', '🐸', '🐯', '🦁', '🐨', '🦜', '🐳', '🦄', '🐝', '🦖'];
const BOT_RANKS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
const BOT_COLORS = ['#47C870', '#FFC800', '#FF5B6C', '#16B7D9', '#B78CFF', '#FF9F43'];
const BOT_TITLES = ['Фразовый маньяк', 'Спринтер', 'Тихий охотник', 'Ветеран слотов', 'Словарный запас'];
/** winRate: среднее двух равномерных — треугольное распределение 0.15–0.85. */
function generateBotProfile(index, seed) {
    const rand = tournamentPrng(`${seed}:bot:${index}`);
    const name = BOT_NAMES[Math.floor(rand() * BOT_NAMES.length)];
    const avatarEmoji = BOT_EMOJI[Math.floor(rand() * BOT_EMOJI.length)];
    const rank = BOT_RANKS[Math.floor(rand() * BOT_RANKS.length)];
    const color = BOT_COLORS[Math.floor(rand() * BOT_COLORS.length)];
    const titlesCount = rand() < 0.4 ? 1 : 0;
    const titles = Array.from({ length: titlesCount }, () => BOT_TITLES[Math.floor(rand() * BOT_TITLES.length)]);
    const winRate = Math.round(((rand() + rand()) / 2) * 70 + 15) / 100;
    return {
        botId: `bot_${String(index + 1).padStart(3, '0')}`,
        name,
        avatarEmoji,
        rank,
        titles,
        winRate: Math.min(0.85, Math.max(0.15, winRate)),
        color,
    };
}
function generateBotProfiles(count, seed) {
    return Array.from({ length: Math.max(0, count) }, (_, i) => generateBotProfile(i, seed));
}
/**
 * Детерминированный результат бота за раунд: точность из его winRate,
 * «время ответа» — 30–90% лимита (чем выше winRate, тем быстрее).
 */
function simulateBotAnswers(bot, params) {
    const { roomId, roundNo, tasks, maxMsPerTask } = params;
    const rand = tournamentPrng(`${roundSeed(roomId, roundNo)}:botrun:${bot.botId}`);
    return tasks.map((task) => {
        const correct = rand() < bot.winRate;
        const speedFactor = 0.3 + (1 - bot.winRate) * 0.4 + rand() * 0.2;
        return {
            correct,
            elapsedMs: Math.round(maxMsPerTask * Math.min(0.95, speedFactor)),
            maxMs: maxMsPerTask,
            streakBefore: 0, // реальная серия считается в scoreRound
            isVoice: task.isVoice,
        };
    });
}
//# sourceMappingURL=tournament_core.js.map