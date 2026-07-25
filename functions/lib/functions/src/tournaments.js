"use strict";
// Tournament Phase-1 backend. All economy and room mutations are server-authoritative,
// transactional and idempotent. Product contract: docs/tournaments/2026-07-21-tournaments-mode-spec.md.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentClaimReward = exports.tournamentAdvanceRound = exports.tournamentAdvanceRooms = exports.tournamentFinalize = exports.tournamentSubmitAnswers = exports.tournamentFillBots = exports.tournamentJoin = exports.tournamentCreateRooms = void 0;
exports.resolveStableUid = resolveStableUid;
exports.assertNotBanned = assertNotBanned;
exports.assertTransactionalTournamentAccess = assertTransactionalTournamentAccess;
exports.tournamentJoinTransaction = tournamentJoinTransaction;
exports.tournamentCancelTransaction = tournamentCancelTransaction;
exports.tournamentFillRoomTransaction = tournamentFillRoomTransaction;
exports.processTournamentFillRooms = processTournamentFillRooms;
exports.tournamentSubmitTransaction = tournamentSubmitTransaction;
exports.tournamentFinalizeTransaction = tournamentFinalizeTransaction;
exports.advanceRoomAtDeadline = advanceRoomAtDeadline;
exports.settleAdvanceOutcome = settleAdvanceOutcome;
exports.processDueTournamentRooms = processDueTournamentRooms;
exports.scanLegacyTournamentRooms = scanLegacyTournamentRooms;
exports.tournamentClaimTransaction = tournamentClaimTransaction;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const tournament_core_1 = require("./tournament_core");
const REGION = 'us-central1';
const ROOM_SCAN_LIMIT = 50;
const MAX_PROCESSOR_PAGES = 10;
const LIFECYCLE_CURSOR_DOC = '_lifecycle_due_cursor_v1';
const BOT_SIMULATION_METADATA_DOC = '__bot_simulation_v1';
const LIFECYCLE_RECOVERY_BACKOFF_MS = 60 * 1000;
const LEGACY_RECOVERY_CURSOR_DOC = '_legacy_recovery_cursor_v1';
const DEFAULT_TASKS_PER_ROUND = 6;
const DEFAULT_MAX_MS_PER_TASK = 10000;
const PLAYER_COLORS = ['#47C870', '#FFC800', '#FF5B6C', '#16B7D9', '#B78CFF', '#FF9F43'];
const ACTIVE_DEADLINE_STATES = [
    'scheduled', 'lobby', 'round1', 'table1', 'round2', 'table2',
    'round3', 'table3', 'round4', 'final', 'results', 'rewards',
];
function sanitizeString(value, max) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function readInt(value, fallback = 0) {
    const parsed = Math.trunc(Number(value));
    return Number.isFinite(parsed) ? parsed : fallback;
}
function timestampMs(value) {
    if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
        return value.toMillis();
    }
    return readInt(value, 0);
}
function readRoom(snap) {
    const data = snap.data() || {};
    return {
        roomId: snap.id,
        slotId: sanitizeString(data.slotId, 60),
        seed: sanitizeString(data.seed, 200),
        state: sanitizeString(data.state, 20),
        startsAt: readInt(data.startsAt, 0),
        ticketsRequired: Math.max(0, readInt(data.ticketsRequired, 0)) || undefined,
        players: Array.isArray(data.players) ? data.players : [],
        rounds: Array.isArray(data.rounds) ? data.rounds : [],
        version: readInt(data.version, 0),
        createdAtMs: readInt(data.createdAtMs, 0),
        stateStartedAtMs: readInt(data.stateStartedAtMs, 0) || undefined,
        stateDeadlineAtMs: readInt(data.stateDeadlineAtMs, 0) || undefined,
        lifecycleRetryAtMs: readInt(data.lifecycleRetryAtMs, 0) || undefined,
        ready: data.ready === true,
        participantAuthUids: Array.isArray(data.participantAuthUids)
            ? data.participantAuthUids.map((uid) => sanitizeString(uid, 160)).filter(Boolean)
            : [],
        participantAuthUidsComplete: data.participantAuthUidsComplete === true,
        cancelledAtMs: readInt(data.cancelledAtMs, 0) || undefined,
        cancelReason: data.cancelReason ? sanitizeString(data.cancelReason, 80) : undefined,
        cancellationReceiptId: data.cancellationReceiptId ? sanitizeString(data.cancellationReceiptId, 200) : undefined,
        finalizationReceiptId: data.finalizationReceiptId ? sanitizeString(data.finalizationReceiptId, 200) : undefined,
        closedAtMs: readInt(data.closedAtMs, 0) || undefined,
        expireAtMs: timestampMs(data.expireAt) || undefined,
    };
}
function parseTask(snap) {
    if (!snap.exists)
        return null;
    const data = snap.data() || {};
    const task = {
        taskId: snap.id,
        mode: sanitizeString(data.mode, 40),
        isVoice: data.isVoice === true,
        difficulty: readInt(data.difficulty, 0),
        payload: data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload) ? data.payload : {},
        tags: Array.isArray(data.tags) ? data.tags.map((tag) => sanitizeString(tag, 40)).filter(Boolean) : [],
        verified: data.verified === true,
    };
    return (0, tournament_core_1.validateTournamentTask)(task).ok ? task : null;
}
async function loadTasksByIds(db, taskIds, roomId) {
    const unique = Array.from(new Set(taskIds.filter(Boolean)));
    const tasks = await (0, tournament_core_1.loadCompleteTournamentTasks)(unique, async (id) => {
        const snap = await (roomId
            ? db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION).doc(roomId)
                .collection(tournament_core_1.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(id).get()
            : db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION).doc(id).get());
        return parseTask(snap);
    });
    if (!tasks)
        throw new https_1.HttpsError('failed-precondition', 'round_tasks_unavailable');
    return tasks;
}
async function loadScheduleConfig(db) {
    const snap = await db.collection(tournament_core_1.TOURNAMENT_SCHEDULE_COLLECTION).doc(tournament_core_1.TOURNAMENT_SCHEDULE_CONFIG_DOC).get();
    if (!snap.exists)
        return { slots: [], freeWeeklyEntry: false, ticketGemValue: 0 };
    return (0, tournament_core_1.normalizeTournamentSchedule)(snap.data());
}
async function resolveStableUid(db, authUid) {
    return (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, undefined, { repairLinks: false });
}
async function assertNotBanned(db, stableUid) {
    const [userSnap, bannedSnap] = await Promise.all([
        db.collection('users').doc(stableUid).get(),
        db.collection('banned_users').doc(stableUid).get(),
    ]);
    if (bannedSnap.exists || userSnap.data()?.banned === true) {
        throw new https_1.HttpsError('permission-denied', 'user_banned');
    }
}
function assertTransactionalTournamentAccess(authUid, stableUid, authLinkSnap, userSnap, bannedSnap) {
    const linkedStableUid = sanitizeString(authLinkSnap.data()?.stable_id, 160);
    if ((linkedStableUid && linkedStableUid !== stableUid) || (!linkedStableUid && stableUid !== authUid)) {
        throw new https_1.HttpsError('permission-denied', 'stable_identity_changed');
    }
    if (bannedSnap.exists || userSnap.data()?.banned === true) {
        throw new https_1.HttpsError('permission-denied', 'user_banned');
    }
}
function validBotProfile(id, data) {
    const name = sanitizeString(data.name, 48);
    const avatarEmoji = sanitizeString(data.avatarEmoji, 16);
    const color = sanitizeString(data.color, 16);
    const winRate = Number(data.winRate);
    if (!id || !name || !avatarEmoji || !color || !Number.isFinite(winRate) || winRate < 0.15 || winRate > 0.85)
        return null;
    return {
        botId: id,
        name,
        avatarEmoji,
        color,
        winRate,
        rank: sanitizeString(data.rank, 24) || 'silver',
        titles: Array.isArray(data.titles) ? data.titles.map((title) => sanitizeString(title, 48)).filter(Boolean) : [],
    };
}
async function loadResourcePool(db) {
    const [botsSnap, tasksSnap] = await Promise.all([
        db.collection(tournament_core_1.BOT_PROFILES_COLLECTION).limit(tournament_core_1.TOURNAMENT_ROOM_SIZE * 2).get(),
        db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION).where('verified', '==', true).limit(200).get(),
    ]);
    const bots = botsSnap.docs.map((doc) => validBotProfile(doc.id, doc.data())).filter((bot) => !!bot);
    const tasks = tasksSnap.docs.map(parseTask).filter((task) => !!task);
    return { bots, tasks };
}
function buildRounds(roomId, pool) {
    const rounds = tournament_core_1.TOURNAMENT_ROUND_MODE_KINDS.map((modeKind, index) => {
        const roundNo = index + 1;
        const selected = (0, tournament_core_1.selectRoundTasks)({ pool, roomId, roundNo, count: DEFAULT_TASKS_PER_ROUND, modeKind });
        if (selected.length !== DEFAULT_TASKS_PER_ROUND)
            return null;
        return {
            roundNo,
            mode: modeKind === 'single' ? selected[0].mode : 'mix',
            taskIds: selected.map((task) => task.taskId),
            results: {},
        };
    });
    return rounds.some((round) => round === null) ? null : rounds;
}
function publicTournamentPlayer(player) {
    const { isBot: _isBot, botWinRate: _botWinRate, ...publicPlayer } = player;
    return publicPlayer;
}
function hydratePrivateBotMetadata(room, data) {
    const entries = Array.isArray(data?.bots) ? data.bots : [];
    const botRates = new Map(entries.map((entry) => [sanitizeString(entry.playerId, 160), Number(entry.winRate)]));
    return {
        ...room,
        players: room.players.map((player) => {
            if (!player || typeof player !== 'object')
                return player;
            return botRates.has(player.id)
                ? { ...player, isBot: true, botWinRate: Math.min(0.85, Math.max(0.15, botRates.get(player.id) || 0.5)) }
                : { ...player, isBot: false };
        }),
    };
}
function roundsWithActivatedPublicTasks(rounds, roundNo, tasks) {
    const publicTasks = tasks.map(tournament_core_1.toPublicTournamentTask);
    if (publicTasks.some((task) => task === null))
        throw new https_1.HttpsError('failed-precondition', 'round_tasks_unavailable');
    return rounds.map((round) => {
        if (round.roundNo === roundNo)
            return { ...round, tasks: publicTasks };
        if (round.roundNo < roundNo)
            return round;
        const { tasks: _futureTasks, ...withoutFutureTasks } = round;
        return withoutFutureTasks;
    });
}
// ── Room creation: missing/invalid config or resources creates nothing. ─────────
exports.tournamentCreateRooms = (0, scheduler_1.onSchedule)({ schedule: '*/5 * * * *', timeZone: 'UTC', region: REGION }, async () => {
    const db = admin.firestore();
    const [config, resources] = await Promise.all([loadScheduleConfig(db), loadResourcePool(db)]);
    if (config.slots.length === 0 || resources.bots.length < tournament_core_1.TOURNAMENT_ROOM_SIZE - tournament_core_1.TOURNAMENT_MIN_REAL_PLAYERS) {
        console.warn('[tournaments] create skipped: config_or_bots_unavailable');
        return;
    }
    const nowMs = Date.now();
    for (const slot of config.slots) {
        if (!slot.enabled)
            continue;
        const dateKey = (0, tournament_core_1.dateKeyInTimezone)(nowMs, slot.timezone);
        const startsAt = (0, tournament_core_1.slotStartMs)(dateKey, slot.localTime, slot.timezone);
        if (nowMs < startsAt - tournament_core_1.TOURNAMENT_CREATE_AHEAD_MS || nowMs >= startsAt)
            continue;
        const roomId = (0, tournament_core_1.tournamentRoomId)(slot.slotId, slot.timezone, dateKey);
        if (!buildRounds(roomId, resources.tasks)) {
            console.warn('[tournaments] create skipped: task_pool_unavailable', { roomId });
            continue;
        }
        const roomRef = db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
        await db.runTransaction(async (tx) => {
            const existing = await tx.get(roomRef);
            if (existing.exists)
                return;
            const room = {
                roomId,
                slotId: slot.slotId,
                seed: roomId,
                state: 'scheduled',
                startsAt,
                players: [],
                rounds: [],
                participantAuthUids: [],
                participantAuthUidsComplete: true,
                stateStartedAtMs: nowMs,
                stateDeadlineAtMs: startsAt - tournament_core_1.TOURNAMENT_LOBBY_OPEN_MS,
                version: 0,
                createdAtMs: nowMs,
                expireAtMs: startsAt + tournament_core_1.TOURNAMENT_ROOM_TTL_MS,
            };
            tx.create(roomRef, {
                ...room,
                ticketsRequired: slot.ticketsRequired,
                timezone: slot.timezone,
                ready: false,
                featureGates: (0, tournament_core_1.tournamentFeatureGates)(),
                expireAt: admin.firestore.Timestamp.fromMillis(startsAt + tournament_core_1.TOURNAMENT_ROOM_TTL_MS),
            });
        });
    }
});
// ── Join: room, config, inventory, bank contribution and provenance are atomic. ─
async function tournamentJoinTransaction(db, input) {
    const { authUid, stableUid, roomId } = input;
    const requestedNowMs = input.nowMs;
    const roomRef = db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
    const userRef = db.collection('users').doc(stableUid);
    const ticketsRef = userRef.collection('inventory').doc('tickets');
    const configRef = db.collection(tournament_core_1.TOURNAMENT_SCHEDULE_COLLECTION).doc(tournament_core_1.TOURNAMENT_SCHEDULE_CONFIG_DOC);
    const authLinkRef = db.collection('auth_links').doc(authUid);
    const bannedRef = db.collection('banned_users').doc(stableUid);
    return db.runTransaction(async (tx) => {
        const [roomSnap, userSnap, ticketsSnap, configSnap, authLinkSnap, bannedSnap] = await tx.getAll(roomRef, userRef, ticketsRef, configRef, authLinkRef, bannedRef);
        if (!roomSnap.exists)
            throw new https_1.HttpsError('not-found', 'room_not_found');
        assertTransactionalTournamentAccess(authUid, stableUid, authLinkSnap, userSnap, bannedSnap);
        const room = readRoom(roomSnap);
        const nowMs = requestedNowMs ?? Date.now();
        const existingPlayer = room.players.find((player) => !player.isBot && player.id === stableUid);
        if (existingPlayer) {
            const replayRoom = (0, tournament_core_1.applyTournamentJoin)(room, existingPlayer, authUid, nowMs);
            if (replayRoom !== room) {
                tx.set(roomRef, {
                    participantAuthUids: replayRoom.participantAuthUids,
                    version: replayRoom.version,
                    updatedAt: nowMs,
                }, { merge: true });
            }
            return { ok: true, joined: true, alreadyJoined: true, roomId };
        }
        if (room.state !== 'lobby')
            throw new https_1.HttpsError('failed-precondition', 'room_not_joinable');
        if (nowMs >= room.startsAt)
            throw new https_1.HttpsError('failed-precondition', 'join_cutoff_elapsed');
        const config = configSnap.exists ? (0, tournament_core_1.normalizeTournamentSchedule)(configSnap.data()) : (0, tournament_core_1.normalizeTournamentSchedule)(null);
        const slot = config.slots.find((candidate) => candidate.slotId === room.slotId && candidate.enabled);
        if (!slot || config.ticketGemValue <= 0)
            throw new https_1.HttpsError('failed-precondition', 'tournament_config_disabled');
        const ticketsRequired = Math.max(1, readInt(roomSnap.data()?.ticketsRequired, slot.ticketsRequired));
        const weekId = (0, tournament_core_1.tournamentWeekId)(room.startsAt);
        const user = userSnap.data() || {};
        const ticketsBefore = Math.max(0, readInt(ticketsSnap.data()?.count, 0));
        const useFreeEntry = config.freeWeeklyEntry && ticketsRequired === 1
            && sanitizeString(user.tournament_free_week, 12) !== weekId;
        if (!useFreeEntry && ticketsBefore < ticketsRequired) {
            throw new https_1.HttpsError('failed-precondition', 'not_enough_tickets');
        }
        const contribution = useFreeEntry ? 0 : (0, tournament_core_1.bankContributionGems)(ticketsRequired, config.ticketGemValue);
        const player = {
            id: stableUid,
            isBot: false,
            name: sanitizeString(user.name || user.displayName, 48) || 'Player',
            avatar: sanitizeString(user.avatar_emoji || user.avatar, 16) || '🙂',
            color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
            score: 0,
            streak: 0,
            entry: {
                kind: useFreeEntry ? 'free_weekly' : 'ticket',
                ticketsSpent: useFreeEntry ? 0 : ticketsRequired,
                bankContributionGems: contribution,
                weekId,
            },
        };
        let nextRoom;
        try {
            nextRoom = (0, tournament_core_1.applyTournamentJoin)(room, player, authUid, nowMs);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'room_not_joinable';
            throw new https_1.HttpsError(message === 'room_full' ? 'resource-exhausted' : 'failed-precondition', message);
        }
        if (useFreeEntry) {
            tx.set(userRef, { tournament_free_week: weekId, updatedAt: nowMs }, { merge: true });
        }
        else {
            tx.set(ticketsRef, { count: ticketsBefore - ticketsRequired, updatedAt: nowMs }, { merge: true });
            if (contribution > 0) {
                tx.set(db.collection(tournament_core_1.TOURNAMENT_BANK_COLLECTION).doc(weekId), {
                    weekId,
                    total: admin.firestore.FieldValue.increment(contribution),
                    contributions: admin.firestore.FieldValue.increment(1),
                    updatedAt: nowMs,
                }, { merge: true });
            }
        }
        tx.set(roomRef, {
            players: nextRoom.players.map(publicTournamentPlayer),
            participantAuthUids: nextRoom.participantAuthUids,
            version: nextRoom.version,
            updatedAt: nowMs,
        }, { merge: true });
        return {
            ok: true,
            joined: true,
            roomId,
            entry: useFreeEntry ? 'free_weekly' : 'ticket',
            ticketsLeft: useFreeEntry ? ticketsBefore : ticketsBefore - ticketsRequired,
        };
    });
}
exports.tournamentJoin = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid);
    await assertNotBanned(db, stableUid);
    const roomId = sanitizeString(request.data?.roomId, 160);
    if (!roomId)
        throw new https_1.HttpsError('invalid-argument', 'room_required');
    return tournamentJoinTransaction(db, { authUid, stableUid, roomId });
});
// ── Cancellation: transaction marker + per-player receipts make refunds exact-once. ─
function hasRunnableRoomResources(room) {
    return room.ready === true
        && room.rounds.length === 4
        && room.rounds.every((round) => round.taskIds.length > 0);
}
function cancellationTaskSecretRefs(roomRef, room, discoveredRefs = []) {
    const taskIds = Array.from(new Set([
        ...room.rounds.flatMap((round) => round.taskIds).filter(Boolean),
        ...discoveredRefs.map((ref) => ref.id),
    ]));
    if (taskIds.length > tournament_core_1.TOURNAMENT_TASK_LIMITS.maxTaskSecrets) {
        throw new https_1.HttpsError('failed-precondition', 'task_secret_cleanup_bounds_exceeded');
    }
    return taskIds.map((taskId) => roomRef.collection(tournament_core_1.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(taskId));
}
async function cancelRoomInTransaction(db, tx, roomRef, room, reason, nowMs, discoveredSecretRefs = []) {
    const taskSecretRefs = cancellationTaskSecretRefs(roomRef, room, discoveredSecretRefs);
    if (room.state === tournament_core_1.TOURNAMENT_STATE_CANCELLED || room.cancellationReceiptId) {
        for (const taskSecretRef of taskSecretRefs)
            tx.delete(taskSecretRef);
        return true;
    }
    if (room.players.filter((player) => !player.isBot).length >= tournament_core_1.TOURNAMENT_MIN_REAL_PLAYERS
        && reason === 'not_enough_players')
        return false;
    if (reason === 'resources_unavailable' && room.state === 'lobby' && hasRunnableRoomResources(room))
        return false;
    let plan;
    try {
        const allowActive = reason === 'legacy_gameplay_unverifiable' || reason === 'resources_unavailable';
        plan = (0, tournament_core_1.planTournamentCancellation)(room, reason, nowMs, {
            allowActive,
            fallbackTickets: room.ticketsRequired ?? 1,
        });
    }
    catch {
        return false;
    }
    const refs = plan.refunds.flatMap((refund) => {
        const userRef = db.collection('users').doc(refund.playerId);
        return [
            userRef,
            userRef.collection('inventory').doc('tickets'),
            userRef.collection(tournament_core_1.TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`cancel_${room.roomId}`),
        ];
    });
    const bankRef = db.collection(tournament_core_1.TOURNAMENT_BANK_COLLECTION).doc((0, tournament_core_1.tournamentWeekId)(room.startsAt));
    const snapshots = refs.length > 0 ? await tx.getAll(...refs, bankRef) : [await tx.get(bankRef)];
    const byPath = new Map(snapshots.map((snapshot) => [snapshot.ref.path, snapshot]));
    let bankRefund = 0;
    let bankContributionRefunds = 0;
    for (const refund of plan.refunds) {
        const userRef = db.collection('users').doc(refund.playerId);
        const ticketsRef = userRef.collection('inventory').doc('tickets');
        const receiptRef = userRef.collection(tournament_core_1.TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`cancel_${room.roomId}`);
        if (byPath.get(receiptRef.path)?.exists)
            continue;
        if (refund.tickets > 0) {
            tx.set(ticketsRef, { count: admin.firestore.FieldValue.increment(refund.tickets), updatedAt: nowMs }, { merge: true });
        }
        const userData = byPath.get(userRef.path)?.data() || {};
        const userPatch = {
            shards: admin.firestore.FieldValue.increment(refund.compensationGems),
            shards_updated_at_ms: nowMs,
            shards_updated_op: 'earn',
            shards_updated_reason: 'tournament_cancel_compensation',
            updatedAt: nowMs,
        };
        if (refund.restoreFreeWeek && userData.tournament_free_week === refund.restoreFreeWeek) {
            userPatch.tournament_free_week = admin.firestore.FieldValue.delete();
        }
        tx.set(userRef, userPatch, { merge: true });
        tx.set(userRef.collection('shard_log').doc(`tournament_cancel_${room.roomId}`), {
            ts: new Date(nowMs).toISOString(),
            type: 'earn',
            amount: refund.compensationGems,
            reason: 'tournament_cancel_compensation',
            roomId: room.roomId,
        });
        tx.create(receiptRef, {
            kind: 'tournament_cancel',
            uid: refund.playerId,
            roomId: room.roomId,
            ticketsRefunded: refund.tickets,
            freeWeekRestored: refund.restoreFreeWeek,
            bankContributionRefunded: refund.bankContributionGems,
            compensationGems: refund.compensationGems,
            createdAtMs: nowMs,
        });
        bankRefund += refund.bankContributionGems;
        if (refund.bankContributionGems > 0)
            bankContributionRefunds += 1;
    }
    if (bankRefund > 0) {
        const bankData = byPath.get(bankRef.path)?.data() || {};
        const bankBefore = Math.max(0, readInt(bankData.total, 0));
        const contributionsBefore = Math.max(0, readInt(bankData.contributions, 0));
        tx.set(bankRef, {
            total: Math.max(0, bankBefore - bankRefund),
            contributions: Math.max(0, contributionsBefore - bankContributionRefunds),
            updatedAt: nowMs,
        }, { merge: true });
    }
    for (const taskSecretRef of taskSecretRefs)
        tx.delete(taskSecretRef);
    tx.set(roomRef, {
        state: plan.room.state,
        players: plan.room.players.map(publicTournamentPlayer),
        cancelReason: plan.room.cancelReason,
        cancelledAtMs: plan.room.cancelledAtMs,
        cancellationReceiptId: plan.room.cancellationReceiptId,
        stateStartedAtMs: plan.room.stateStartedAtMs,
        stateDeadlineAtMs: admin.firestore.FieldValue.delete(),
        lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
        version: plan.room.version,
        expireAt: admin.firestore.Timestamp.fromMillis(nowMs + tournament_core_1.TOURNAMENT_ROOM_TTL_MS),
        updatedAt: nowMs,
    }, { merge: true });
    return true;
}
async function tournamentCancelTransaction(db, roomTarget, reason, requestedNowMs, expected) {
    const roomRef = typeof roomTarget === 'string'
        ? db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION).doc(roomTarget)
        : roomTarget;
    const secretSnap = await roomRef.collection(tournament_core_1.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION)
        .limit(tournament_core_1.TOURNAMENT_TASK_LIMITS.maxTaskSecrets + 1).get();
    if (secretSnap.size > tournament_core_1.TOURNAMENT_TASK_LIMITS.maxTaskSecrets) {
        throw new https_1.HttpsError('failed-precondition', 'task_secret_cleanup_bounds_exceeded');
    }
    // FILL_CANCEL_TRANSACTION_GUARD: join/fill/cancel all conflict on the same room document.
    return db.runTransaction(async (tx) => {
        const [roomSnap, botMetadataSnap] = await tx.getAll(roomRef, roomRef.collection(tournament_core_1.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC));
        if (!roomSnap.exists)
            return false;
        const room = hydratePrivateBotMetadata(readRoom(roomSnap), botMetadataSnap.data());
        if (expected && (room.state !== expected.state || room.version !== expected.version))
            return false;
        return cancelRoomInTransaction(db, tx, roomRef, room, reason, requestedNowMs ?? Date.now(), secretSnap.docs.map((doc) => doc.ref));
    });
}
async function tournamentFillRoomTransaction(db, roomRef, resources, dependencies = {}) {
    const clock = dependencies.nowMs ?? Date.now;
    // FILL_CANCEL_TRANSACTION_GUARD
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists)
            return 'skip';
        const room = readRoom(snap);
        if (room.state !== 'scheduled' && room.state !== 'lobby')
            return 'skip';
        if (snap.data()?.ready === true)
            return 'filled';
        if (room.state === 'scheduled' && !room.stateDeadlineAtMs)
            return 'skip';
        const nowMs = clock();
        const fillDeadlineAtMs = room.state === 'scheduled' ? room.stateDeadlineAtMs : room.startsAt;
        const realCount = room.players.filter((player) => !player.isBot).length;
        if (realCount < tournament_core_1.TOURNAMENT_MIN_REAL_PLAYERS) {
            if (nowMs < room.startsAt - tournament_core_1.TOURNAMENT_FILL_CANCELLATION_CUTOFF_MS)
                return 'skip';
            dependencies.beforeWrites?.();
            const cancelled = await cancelRoomInTransaction(db, tx, roomRef, room, 'not_enough_players', nowMs);
            return cancelled ? 'cancelled_players' : 'skip';
        }
        const rounds = buildRounds(room.roomId, resources.tasks);
        const needed = tournament_core_1.TOURNAMENT_ROOM_SIZE - room.players.length;
        const picked = resources.bots
            .filter((bot) => !room.players.some((player) => player.id === bot.botId))
            .slice(0, Math.max(0, needed));
        const taskMap = new Map(resources.tasks.map((task) => [task.taskId, task]));
        const selectedTasks = rounds
            ? Array.from(new Set(rounds.flatMap((round) => round.taskIds))).map((taskId) => taskMap.get(taskId))
            : [];
        const botPlayers = picked.map((bot, index) => ({
            id: `p_${(0, tournament_core_1.tournamentHash32)(`${room.roomId}:${bot.botId}`).toString(36)}`,
            isBot: true,
            name: bot.name,
            avatar: bot.avatarEmoji,
            color: bot.color || PLAYER_COLORS[(room.players.length + index) % PLAYER_COLORS.length],
            score: 0,
            streak: 0,
            botWinRate: bot.winRate,
        }));
        const privateBotMetadata = {
            kind: 'bot_simulation_v1',
            bots: botPlayers.map((player) => ({ playerId: player.id, winRate: player.botWinRate })),
        };
        const completeTasks = selectedTasks.filter((task) => !!task);
        const fillValidation = rounds && picked.length === Math.max(0, needed)
            && completeTasks.length === selectedTasks.length
            ? (0, tournament_core_1.validateTournamentFillMutation)({
                room,
                rounds,
                selectedTasks: completeTasks,
                botPlayers,
                privateBotMetadata,
                metadata: {
                    ready: true,
                    readyAtMs: nowMs,
                    stateDeadlineAtMs: fillDeadlineAtMs,
                    version: room.version + 1,
                    updatedAt: nowMs,
                },
            })
            : { ok: false, reason: 'fill_tasks_invalid', serializedBytes: 0 };
        if (!fillValidation.ok) {
            dependencies.beforeWrites?.();
            const cancelled = await cancelRoomInTransaction(db, tx, roomRef, room, 'resources_unavailable', nowMs);
            return cancelled ? 'cancelled_resources' : 'skip';
        }
        dependencies.beforeWrites?.();
        tx.set(roomRef, {
            players: [...room.players, ...botPlayers].map(publicTournamentPlayer),
            rounds,
            ready: true,
            readyAtMs: nowMs,
            stateDeadlineAtMs: fillDeadlineAtMs,
            lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
            version: room.version + 1,
            updatedAt: nowMs,
        }, { merge: true });
        for (const task of completeTasks) {
            const secretRef = roomRef.collection(tournament_core_1.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(task.taskId);
            tx.create(secretRef, task);
        }
        tx.create(roomRef.collection(tournament_core_1.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC), privateBotMetadata);
        return 'filled';
    });
}
async function processTournamentFillRooms(options) {
    const { db } = options;
    const nowMs = options.nowMs ?? Date.now();
    const limit = Math.max(1, Math.min(ROOM_SCAN_LIMIT, Math.trunc(options.limit ?? ROOM_SCAN_LIMIT)));
    const resources = options.resources ?? await loadResourcePool(db);
    const fillRoom = options.fillRoom ?? tournamentFillRoomTransaction;
    let scanned = 0;
    let filled = 0;
    let failed = 0;
    let cursor;
    for (let page = 0; page < MAX_PROCESSOR_PAGES; page += 1) {
        let query = db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION)
            .where('state', 'in', ['scheduled', 'lobby'])
            .where('startsAt', '<=', nowMs + tournament_core_1.TOURNAMENT_FILL_BOTS_AHEAD_MS)
            .orderBy('startsAt', 'asc')
            .orderBy(admin.firestore.FieldPath.documentId(), 'asc')
            .limit(limit);
        if (cursor)
            query = query.startAfter(cursor);
        const rooms = await query.get();
        scanned += rooms.size;
        for (const doc of rooms.docs) {
            try {
                if (await fillRoom(db, doc.ref, resources) === 'filled')
                    filled += 1;
            }
            catch (error) {
                failed += 1;
                console.error('[tournaments] room fill failed', { roomId: doc.id, error });
            }
        }
        if (rooms.size < limit)
            break;
        cursor = rooms.docs[rooms.docs.length - 1];
    }
    return { scanned, filled, failed };
}
exports.tournamentFillBots = (0, scheduler_1.onSchedule)({ schedule: '* * * * *', timeZone: 'UTC', region: REGION }, async () => {
    const db = admin.firestore();
    await processTournamentFillRooms({ db, nowMs: Date.now() });
});
// ── Submit: the transaction recomputes from its fresh room snapshot. ───────────
async function tournamentSubmitTransaction(db, input) {
    const { stableUid, roomId, roundNo, rawAnswers } = input;
    const receivedAtMs = input.receivedAtMs ?? Date.now();
    const roomRef = db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
    const initial = await roomRef.get();
    if (!initial.exists)
        throw new https_1.HttpsError('not-found', 'room_not_found');
    const initialRoom = readRoom(initial);
    const initialRound = initialRoom.rounds.find((round) => round.roundNo === roundNo);
    if (!initialRound)
        throw new https_1.HttpsError('not-found', 'round_not_found');
    const initialReplay = initialRound.results?.[stableUid];
    const initialTimedOut = initialReplay?.submissionStatus === 'timed_out' || initialReplay?.timedOut === true;
    if (initialReplay && !initialTimedOut) {
        return { ok: true, replay: true, roundScore: initialReplay.roundScore, correct: initialReplay.correct };
    }
    // Compatibility marker for the former loadTasksByIds(db, initialRound.taskIds, roomId) contract:
    // the same immutable refs are now read authoritatively by tx.getAll below.
    const answers = rawAnswers.slice(0, initialRound.taskIds.length).map((answer) => ({
        taskId: sanitizeString(answer.taskId, 160),
        answer: answer.answer,
    })).filter((answer) => !!answer.taskId);
    // SUBMIT_TRANSACTION_GUARD: concurrent submitters conflict/retry on roomRef.
    return db.runTransaction(async (tx) => {
        const secretRefs = initialRound.taskIds.map((taskId) => roomRef
            .collection(tournament_core_1.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(taskId));
        const accessRefs = input.authUid ? [
            db.collection('auth_links').doc(input.authUid),
            db.collection('users').doc(stableUid),
            db.collection('banned_users').doc(stableUid),
        ] : [];
        const snapshots = await tx.getAll(roomRef, ...secretRefs, ...accessRefs);
        const roomSnap = snapshots[0];
        if (!roomSnap.exists)
            throw new https_1.HttpsError('not-found', 'room_not_found');
        if (input.authUid) {
            assertTransactionalTournamentAccess(input.authUid, stableUid, snapshots[1 + secretRefs.length], snapshots[2 + secretRefs.length], snapshots[3 + secretRefs.length]);
        }
        const room = readRoom(roomSnap);
        const round = room.rounds.find((candidate) => candidate.roundNo === roundNo);
        const existing = round?.results?.[stableUid];
        const existingTimedOut = existing?.submissionStatus === 'timed_out' || existing?.timedOut === true;
        if (existing && !existingTimedOut) {
            return { ok: true, replay: true, roundScore: existing.roundScore, correct: existing.correct };
        }
        if (!round || !sameTaskIdSnapshot(round.taskIds, initialRound.taskIds)) {
            throw new https_1.HttpsError('aborted', 'round_changed_retry');
        }
        const tasks = snapshots.slice(1, 1 + secretRefs.length).map(parseTask);
        if (tasks.some((task) => !task))
            throw new https_1.HttpsError('failed-precondition', 'round_tasks_unavailable');
        let applied;
        try {
            applied = (0, tournament_core_1.applyTournamentSubmission)(room, {
                playerId: stableUid,
                roundNo,
                answers,
                tasks: tasks,
                receivedAtMs,
                maxMsPerTask: DEFAULT_MAX_MS_PER_TASK,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'submission_rejected';
            throw new https_1.HttpsError(message === 'not_in_room' ? 'permission-denied' : 'failed-precondition', message);
        }
        tx.set(roomRef, {
            players: applied.room.players,
            rounds: applied.room.rounds,
            version: applied.room.version,
            updatedAt: receivedAtMs,
        }, { merge: true });
        return {
            ok: true,
            replay: false,
            roundScore: applied.result.roundScore,
            correct: applied.result.correct,
            total: applied.result.total,
            state: applied.room.state,
        };
    });
}
exports.tournamentSubmitAnswers = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const stableUid = await resolveStableUid(db, request.auth.uid);
    await assertNotBanned(db, stableUid);
    const roomId = sanitizeString(request.data?.roomId, 160);
    const roundNo = readInt(request.data?.roundNo, 0);
    if (!roomId || roundNo < 1 || roundNo > 4)
        throw new https_1.HttpsError('invalid-argument', 'room_and_round_required');
    const rawAnswers = Array.isArray(request.data?.answers) ? request.data.answers : [];
    return tournamentSubmitTransaction(db, { authUid: request.auth.uid, stableUid, roomId, roundNo, rawAnswers });
});
// ── Finalization: one transaction owns room marker, season, streak and entitlements. ─
async function tournamentFinalizeTransaction(db, roomId, requestedNowMs) {
    const roomRef = db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
    // FINALIZE_TRANSACTION_GUARD
    return db.runTransaction(async (tx) => {
        const [roomSnap, botMetadataSnap] = await tx.getAll(roomRef, roomRef.collection(tournament_core_1.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC));
        if (!roomSnap.exists)
            throw new https_1.HttpsError('not-found', 'room_not_found');
        const room = hydratePrivateBotMetadata(readRoom(roomSnap), botMetadataSnap.data());
        if (room.state === tournament_core_1.TOURNAMENT_STATE_CANCELLED)
            throw new https_1.HttpsError('failed-precondition', 'room_cancelled');
        let plan;
        try {
            plan = (0, tournament_core_1.planTournamentFinalization)(room, requestedNowMs ?? Date.now());
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'room_not_ready_to_finalize';
            throw new https_1.HttpsError('failed-precondition', message);
        }
        if (plan.alreadyFinalized)
            return { ok: true, alreadyFinalized: true };
        const weekId = (0, tournament_core_1.tournamentWeekId)(room.startsAt);
        const refs = plan.playerEffects.flatMap((effect) => {
            const userRef = db.collection('users').doc(effect.playerId);
            return [
                userRef,
                db.collection(tournament_core_1.TOURNAMENT_SEASONS_COLLECTION).doc(weekId)
                    .collection(tournament_core_1.TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION).doc(effect.playerId),
                userRef.collection(tournament_core_1.TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`reward_${roomId}`),
            ];
        });
        const snapshots = refs.length > 0 ? await tx.getAll(...refs) : [];
        const byPath = new Map(snapshots.map((snapshot) => [snapshot.ref.path, snapshot]));
        const nowMs = requestedNowMs ?? Date.now();
        for (const effect of plan.playerEffects) {
            const userRef = db.collection('users').doc(effect.playerId);
            const seasonRef = db.collection(tournament_core_1.TOURNAMENT_SEASONS_COLLECTION).doc(weekId)
                .collection(tournament_core_1.TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION).doc(effect.playerId);
            const rewardRef = userRef.collection(tournament_core_1.TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`reward_${roomId}`);
            if (byPath.get(rewardRef.path)?.exists)
                throw new https_1.HttpsError('failed-precondition', 'finalization_receipt_conflict');
            const user = byPath.get(userRef.path)?.data() || {};
            const season = byPath.get(seasonRef.path)?.data() || {};
            const hotStreak = effect.won ? Math.max(0, readInt(user.tournament_hot_streak, 0)) + 1 : 0;
            const hotTier = hotStreak >= 10 ? 10 : hotStreak >= 5 ? 5 : hotStreak >= 3 ? 3 : 0;
            tx.set(seasonRef, {
                uid: effect.playerId,
                name: room.players.find((player) => player.id === effect.playerId)?.name || 'Player',
                points: Math.max(0, readInt(season.points, 0)) + effect.seasonPoints,
                tournamentsPlayed: Math.max(0, readInt(season.tournamentsPlayed, 0)) + 1,
                bestPlace: season.bestPlace ? Math.min(readInt(season.bestPlace, effect.place), effect.place) : effect.place,
                updatedAt: nowMs,
            }, { merge: true });
            tx.set(userRef, {
                tournament_hot_streak: hotStreak,
                tournament_hot_streak_tier: hotTier,
                tournament_best_place: user.tournament_best_place
                    ? Math.min(readInt(user.tournament_best_place, effect.place), effect.place)
                    : effect.place,
                updatedAt: nowMs,
            }, { merge: true });
            tx.create(rewardRef, {
                kind: 'tournament_reward',
                uid: effect.playerId,
                roomId,
                place: effect.place,
                seasonPoints: effect.seasonPoints,
                reward: effect.reward,
                claimed: false,
                createdAtMs: nowMs,
            });
        }
        const winner = plan.playerEffects.find((effect) => effect.place === 1)?.playerId ?? null;
        tx.set(roomRef, {
            state: plan.room.state,
            finalizationReceiptId: plan.room.finalizationReceiptId,
            stateStartedAtMs: plan.room.stateStartedAtMs,
            stateDeadlineAtMs: plan.room.stateDeadlineAtMs,
            lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
            version: plan.room.version,
            winnerUid: winner,
            finalizedAtMs: nowMs,
            featureGates: (0, tournament_core_1.tournamentFeatureGates)(),
            expireAt: admin.firestore.Timestamp.fromMillis(nowMs + tournament_core_1.TOURNAMENT_ROOM_TTL_MS),
            updatedAt: nowMs,
        }, { merge: true });
        return { ok: true };
    });
}
exports.tournamentFinalize = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (request.auth?.token?.admin !== true)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const roomId = sanitizeString(request.data?.roomId, 160);
    if (!roomId)
        throw new https_1.HttpsError('invalid-argument', 'room_required');
    return tournamentFinalizeTransaction(admin.firestore(), roomId);
});
function sameTaskIdSnapshot(left, right) {
    const leftIds = left ?? [];
    const rightIds = right ?? [];
    return leftIds.length === rightIds.length && leftIds.every((taskId, index) => taskId === rightIds[index]);
}
function activationRoundForState(room) {
    const roundNo = room.state === 'lobby' ? 1
        : room.state === 'table1' ? 2
            : room.state === 'table2' ? 3
                : room.state === 'table3' ? 4 : 0;
    return roundNo ? room.rounds.find((round) => round.roundNo === roundNo) : undefined;
}
async function advanceRoomAtDeadline(db, roomRef, dependencies = {}) {
    const readTasks = dependencies.loadTasksByIds ?? loadTasksByIds;
    const clock = dependencies.nowMs ?? Date.now;
    const botMetadataRef = roomRef.collection(tournament_core_1.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).doc(BOT_SIMULATION_METADATA_DOC);
    const [initial, initialBotMetadata] = await Promise.all([roomRef.get(), botMetadataRef.get()]);
    if (!initial.exists)
        return 'skip';
    const initialRoom = hydratePrivateBotMetadata(readRoom(initial), initialBotMetadata.data());
    const initialAuthUid = dependencies.requesterAuthUid;
    if (dependencies.requesterStableUid
        && !(initialAuthUid && initialRoom.participantAuthUids?.includes(initialAuthUid))
        && !initialRoom.players.some((player) => !player.isBot && player.id === dependencies.requesterStableUid)) {
        throw new https_1.HttpsError('permission-denied', 'not_in_room');
    }
    if (dependencies.expectedState !== undefined && (initialRoom.state !== dependencies.expectedState
        || initialRoom.stateDeadlineAtMs !== dependencies.expectedDeadlineAtMs)) {
        return 'stale';
    }
    const activeRound = /^round[1-4]$/.test(initialRoom.state)
        ? initialRoom.rounds.find((round) => `round${round.roundNo}` === initialRoom.state)
        : undefined;
    let tasks = [];
    if (activeRound) {
        try {
            tasks = await readTasks(db, activeRound.taskIds, initialRoom.roomId);
        }
        catch (error) {
            if (error instanceof https_1.HttpsError
                && error.code === 'failed-precondition'
                && error.message === 'round_tasks_unavailable') {
                tasks = null;
            }
            else {
                throw error;
            }
        }
    }
    const activationRound = activationRoundForState(initialRoom);
    let activationTasks = [];
    if (activationRound) {
        try {
            activationTasks = await readTasks(db, activationRound.taskIds, initialRoom.roomId);
        }
        catch (error) {
            if (error instanceof https_1.HttpsError && error.code === 'failed-precondition'
                && error.message === 'round_tasks_unavailable')
                activationTasks = null;
            else
                throw error;
        }
    }
    const secretRefsToDelete = initialRoom.state === 'rewards'
        ? await roomRef.collection(tournament_core_1.TOURNAMENT_TASK_SECRETS_SUBCOLLECTION).listDocuments()
        : [];
    return db.runTransaction(async (tx) => {
        const accessRefs = dependencies.requesterAuthUid && dependencies.requesterStableUid ? [
            db.collection('auth_links').doc(dependencies.requesterAuthUid),
            db.collection('users').doc(dependencies.requesterStableUid),
            db.collection('banned_users').doc(dependencies.requesterStableUid),
        ] : [];
        const snapshots = await tx.getAll(roomRef, botMetadataRef, ...accessRefs);
        const snap = snapshots[0];
        if (!snap.exists)
            return 'skip';
        if (dependencies.requesterAuthUid && dependencies.requesterStableUid) {
            assertTransactionalTournamentAccess(dependencies.requesterAuthUid, dependencies.requesterStableUid, snapshots[2], snapshots[3], snapshots[4]);
        }
        const room = hydratePrivateBotMetadata(readRoom(snap), snapshots[1].data());
        const nowMs = clock();
        const authUid = dependencies.requesterAuthUid;
        if (dependencies.requesterStableUid
            && !(authUid && room.participantAuthUids?.includes(authUid))
            && !room.players.some((player) => !player.isBot && player.id === dependencies.requesterStableUid)) {
            throw new https_1.HttpsError('permission-denied', 'not_in_room');
        }
        if (dependencies.expectedState !== undefined && (room.state !== dependencies.expectedState
            || room.stateDeadlineAtMs !== dependencies.expectedDeadlineAtMs)) {
            return 'stale';
        }
        const currentActiveRound = /^round[1-4]$/.test(room.state)
            ? room.rounds.find((round) => `round${round.roundNo}` === room.state)
            : undefined;
        const currentActivationRound = activationRoundForState(room);
        if (room.state !== initialRoom.state
            || room.stateDeadlineAtMs !== initialRoom.stateDeadlineAtMs
            || currentActiveRound?.roundNo !== activeRound?.roundNo
            || !sameTaskIdSnapshot(currentActiveRound?.taskIds, activeRound?.taskIds)
            || currentActivationRound?.roundNo !== activationRound?.roundNo
            || !sameTaskIdSnapshot(currentActivationRound?.taskIds, activationRound?.taskIds)) {
            return 'stale';
        }
        if (!ACTIVE_DEADLINE_STATES.includes(room.state))
            return 'skip';
        const legacyAction = (0, tournament_core_1.legacyTournamentRecoveryAction)(room, nowMs, tasks !== null);
        if (legacyAction === 'cancel')
            return 'cancel_legacy';
        if (legacyAction === 'wait')
            return 'waiting';
        if (room.state === 'scheduled') {
            tx.set(roomRef, {
                state: 'lobby',
                stateStartedAtMs: nowMs,
                stateDeadlineAtMs: room.startsAt,
                lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
                version: room.version + 1,
                updatedAt: nowMs,
            }, { merge: true });
            return 'advanced';
        }
        if (room.state === 'lobby') {
            if (room.players.filter((player) => !player.isBot).length < tournament_core_1.TOURNAMENT_MIN_REAL_PLAYERS)
                return 'cancel_players';
            if (snap.data()?.ready !== true || room.rounds.length !== 4 || room.rounds.some((round) => round.taskIds.length === 0)) {
                return 'cancel_resources';
            }
            if (!activationTasks || !activationRound)
                return 'cancel_resources';
            const duration = (0, tournament_core_1.stateDeadlineDurationMs)('round1', room.rounds[0].taskIds.length, DEFAULT_MAX_MS_PER_TASK);
            tx.set(roomRef, {
                state: 'round1',
                stateStartedAtMs: nowMs,
                stateDeadlineAtMs: nowMs + duration,
                rounds: roundsWithActivatedPublicTasks(room.rounds, activationRound.roundNo, activationTasks),
                lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
                version: room.version + 1,
                updatedAt: nowMs,
            }, { merge: true });
            return 'advanced';
        }
        if (/^round[1-4]$/.test(room.state)) {
            if (!tasks)
                return 'cancel_resources';
            let completed;
            try {
                completed = (0, tournament_core_1.completeTournamentRoundAtDeadline)(room, tasks, nowMs);
            }
            catch {
                return 'cancel_resources';
            }
            tx.set(roomRef, {
                players: completed.room.players.map(publicTournamentPlayer),
                rounds: completed.room.rounds,
                state: completed.room.state,
                stateStartedAtMs: completed.room.stateStartedAtMs,
                stateDeadlineAtMs: completed.room.stateDeadlineAtMs,
                lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
                version: completed.room.version,
                updatedAt: nowMs,
            }, { merge: true });
            return 'advanced';
        }
        if (room.state === 'results')
            return 'finalize';
        if (room.state === 'rewards') {
            for (const secretRef of secretRefsToDelete)
                tx.delete(secretRef);
            tx.set(roomRef, {
                state: 'closed',
                closedAtMs: nowMs,
                stateStartedAtMs: nowMs,
                stateDeadlineAtMs: admin.firestore.FieldValue.delete(),
                lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
                version: room.version + 1,
                expireAt: admin.firestore.Timestamp.fromMillis(nowMs + tournament_core_1.TOURNAMENT_ROOM_TTL_MS),
                updatedAt: nowMs,
            }, { merge: true });
            return 'advanced';
        }
        const nextState = (0, tournament_core_1.stateAfterTournamentDeadline)(room.state);
        if (!nextState)
            return 'skip';
        const nextRound = /^round[1-4]$/.test(nextState)
            ? room.rounds.find((round) => `round${round.roundNo}` === nextState)
            : undefined;
        const duration = (0, tournament_core_1.stateDeadlineDurationMs)(nextState, nextRound?.taskIds.length ?? 0, DEFAULT_MAX_MS_PER_TASK);
        if (nextRound && (!activationTasks || activationRound?.roundNo !== nextRound.roundNo))
            return 'cancel_resources';
        tx.set(roomRef, {
            state: nextState,
            stateStartedAtMs: nowMs,
            stateDeadlineAtMs: duration === null ? admin.firestore.FieldValue.delete() : nowMs + duration,
            ...(nextRound ? { rounds: roundsWithActivatedPublicTasks(room.rounds, nextRound.roundNo, activationTasks) } : {}),
            lifecycleRetryAtMs: admin.firestore.FieldValue.delete(),
            version: room.version + 1,
            updatedAt: nowMs,
        }, { merge: true });
        return 'advanced';
    });
}
async function settleAdvanceOutcome(db, roomRef, outcome, dependencies = {}) {
    const requestedNowMs = dependencies.nowMs?.();
    if (outcome === 'cancel_players') {
        const cancelled = await tournamentCancelTransaction(db, roomRef, 'not_enough_players', requestedNowMs);
        if (!cancelled) {
            const resources = await loadResourcePool(db);
            const fillOutcome = await tournamentFillRoomTransaction(db, roomRef, resources, { nowMs: dependencies.nowMs });
            if (fillOutcome === 'filled') {
                return settleAdvanceOutcome(db, roomRef, await advanceRoomAtDeadline(db, roomRef, {
                    nowMs: dependencies.nowMs,
                }), dependencies);
            }
            if (fillOutcome === 'cancelled_players' || fillOutcome === 'cancelled_resources')
                return 'cancelled';
        }
        return cancelled ? 'cancelled' : outcome;
    }
    if (outcome === 'cancel_resources') {
        // Compatibility marker: tournamentCancelTransaction(db, roomRef, 'resources_unavailable')
        // now additionally carries the freshly observed state/version token.
        const rechecked = await advanceRoomAtDeadline(db, roomRef, { nowMs: dependencies.nowMs });
        if (rechecked !== 'cancel_resources')
            return settleAdvanceOutcome(db, roomRef, rechecked, dependencies);
        const expectedSnap = await roomRef.get();
        if (!expectedSnap.exists)
            return 'skip';
        const expectedRoom = readRoom(expectedSnap);
        await dependencies.beforeCancelTransaction?.();
        const cancelled = await tournamentCancelTransaction(db, roomRef, 'resources_unavailable', undefined, {
            state: expectedRoom.state,
            version: expectedRoom.version,
        });
        if (cancelled)
            return 'cancelled';
        return 'stale';
    }
    if (outcome === 'cancel_legacy') {
        const cancelled = await tournamentCancelTransaction(db, roomRef, 'legacy_gameplay_unverifiable', requestedNowMs);
        return cancelled ? 'cancelled' : outcome;
    }
    if (outcome === 'finalize') {
        await tournamentFinalizeTransaction(db, roomRef.id, requestedNowMs);
        return 'advanced';
    }
    return outcome;
}
async function processDueTournamentRooms(options) {
    const { db } = options;
    const nowMs = options.nowMs ?? Date.now();
    const limit = Math.max(1, Math.min(ROOM_SCAN_LIMIT, Math.trunc(options.limit ?? ROOM_SCAN_LIMIT)));
    let scanned = 0;
    let advanced = 0;
    let failed = 0;
    const cursorRef = db.collection(tournament_core_1.TOURNAMENT_SCHEDULE_COLLECTION).doc(LIFECYCLE_CURSOR_DOC);
    const persistedCursor = await cursorRef.get();
    const persistedDeadlineAtMs = readInt(persistedCursor.data()?.stateDeadlineAtMs, 0);
    const persistedRoomId = sanitizeString(persistedCursor.data()?.roomId, 200);
    let cursor;
    let exhausted = false;
    for (let page = 0; page < MAX_PROCESSOR_PAGES; page += 1) {
        let query = db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION)
            .where('state', 'in', ACTIVE_DEADLINE_STATES)
            .where('stateDeadlineAtMs', '<=', nowMs)
            .orderBy('stateDeadlineAtMs', 'asc')
            .orderBy(admin.firestore.FieldPath.documentId(), 'asc')
            .limit(limit);
        if (cursor)
            query = query.startAfter(cursor);
        else if (persistedDeadlineAtMs > 0 && persistedRoomId) {
            query = query.startAfter(persistedDeadlineAtMs, persistedRoomId);
        }
        const snap = await query.get();
        scanned += snap.size;
        for (const doc of snap.docs) {
            if (readInt(doc.data().lifecycleRetryAtMs, 0) > nowMs)
                continue;
            try {
                const outcome = await advanceRoomAtDeadline(db, doc.ref, { nowMs: () => nowMs });
                const settled = await settleAdvanceOutcome(db, doc.ref, outcome, { nowMs: () => nowMs });
                if (settled === 'advanced' || settled === 'cancelled')
                    advanced += 1;
            }
            catch (error) {
                failed += 1;
                console.error('[tournaments] lifecycle recovery failed', { roomId: doc.id, error });
                const failedDeadlineAtMs = readInt(doc.data().stateDeadlineAtMs, 0);
                if (failedDeadlineAtMs <= 0)
                    continue;
                try {
                    await db.runTransaction(async (tx) => {
                        const currentSnap = await tx.get(doc.ref);
                        if (!currentSnap.exists)
                            return;
                        const current = currentSnap.data() || {};
                        const currentDeadlineAtMs = readInt(current.stateDeadlineAtMs, 0);
                        if (currentDeadlineAtMs !== failedDeadlineAtMs || currentDeadlineAtMs > nowMs)
                            return;
                        tx.set(doc.ref, {
                            lifecycleRetryAtMs: nowMs + LIFECYCLE_RECOVERY_BACKOFF_MS,
                        }, { merge: true });
                    });
                }
                catch (backoffError) {
                    console.error('[tournaments] lifecycle recovery backoff failed', { roomId: doc.id, error: backoffError });
                }
            }
        }
        if (snap.size < limit) {
            exhausted = true;
            break;
        }
        cursor = snap.docs[snap.docs.length - 1];
    }
    if (exhausted) {
        if (persistedCursor.exists)
            await cursorRef.delete();
    }
    else if (cursor) {
        await cursorRef.set({
            stateDeadlineAtMs: readInt(cursor.data().stateDeadlineAtMs, 0),
            roomId: cursor.id,
            updatedAt: nowMs,
        });
    }
    return { scanned, advanced, failed };
}
exports.tournamentAdvanceRooms = (0, scheduler_1.onSchedule)({ schedule: '* * * * *', timeZone: 'UTC', region: REGION }, async () => {
    const db = admin.firestore();
    const nowMs = Date.now();
    await processDueTournamentRooms({ db, nowMs });
    const legacyDocs = await scanLegacyTournamentRooms(db, { nowMs });
    for (const doc of legacyDocs) {
        try {
            const outcome = await advanceRoomAtDeadline(db, doc.ref, { nowMs: () => nowMs });
            await settleAdvanceOutcome(db, doc.ref, outcome);
        }
        catch (error) {
            console.error('[tournaments] legacy lifecycle recovery failed', { roomId: doc.id, error });
        }
    }
});
async function scanLegacyTournamentRooms(db, options = {}) {
    const nowMs = options.nowMs ?? Date.now();
    const pageSize = Math.max(1, Math.min(500, Math.trunc(options.pageSize ?? ROOM_SCAN_LIMIT * 4)));
    const legacyRecoveryCursorRef = db.collection(tournament_core_1.TOURNAMENT_SCHEDULE_COLLECTION).doc(LEGACY_RECOVERY_CURSOR_DOC);
    const cursorSnap = await legacyRecoveryCursorRef.get();
    const cursorStartsAt = readInt(cursorSnap.data()?.startsAt, 0);
    const cursorRoomId = sanitizeString(cursorSnap.data()?.roomId, 200);
    let query = db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION)
        .where('state', 'in', ACTIVE_DEADLINE_STATES)
        .where('startsAt', '<=', nowMs)
        .orderBy('startsAt', 'asc')
        .orderBy(admin.firestore.FieldPath.documentId(), 'asc')
        .limit(pageSize);
    if (cursorStartsAt > 0 && cursorRoomId) {
        query = query.startAfter(cursorStartsAt, cursorRoomId);
    }
    const snap = await query.get();
    if (snap.empty) {
        if (cursorSnap.exists)
            await legacyRecoveryCursorRef.delete();
        return [];
    }
    const last = snap.docs[snap.docs.length - 1];
    await legacyRecoveryCursorRef.set({
        startsAt: readInt(last.data().startsAt, 0),
        roomId: last.id,
        updatedAt: nowMs,
    });
    return snap.docs.filter((doc) => !doc.data().stateDeadlineAtMs);
}
/**
 * Cloud Scheduler is the recovery fallback (one-minute granularity). A room
 * participant may request the same server-checked transition at the exact
 * 10–12 second UI deadline; this callable cannot advance early.
 */
exports.tournamentAdvanceRound = (0, https_1.onCall)({ ...callable_options_1.HOT_CALLABLE_OPTIONS, enforceAppCheck: true }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const roomId = sanitizeString(request.data?.roomId, 160);
    const expectedState = sanitizeString(request.data?.expectedState, 20);
    const expectedDeadlineAtMs = readInt(request.data?.expectedDeadlineAtMs, -1);
    if (!roomId
        || !/^(round[1-4]|table[1-3]|final|results)$/.test(expectedState)
        || expectedDeadlineAtMs <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'room_state_deadline_required');
    }
    const db = admin.firestore();
    const roomRef = db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION).doc(roomId);
    const stableUid = await resolveStableUid(db, request.auth.uid);
    await assertNotBanned(db, stableUid);
    const serverNowMs = Date.now();
    const outcome = await settleAdvanceOutcome(db, roomRef, await advanceRoomAtDeadline(db, roomRef, {
        nowMs: () => serverNowMs,
        requesterAuthUid: request.auth.uid,
        requesterStableUid: request.auth.token?.admin === true ? undefined : stableUid,
        expectedState,
        expectedDeadlineAtMs,
    }));
    if (outcome === 'waiting')
        throw new https_1.HttpsError('failed-precondition', 'deadline_not_elapsed');
    const current = await roomRef.get();
    return { ok: true, state: sanitizeString(current.data()?.state, 20), outcome };
});
// ── Claim: entitlement is a server-only receipt; transaction applies it once. ──
async function tournamentClaimTransaction(db, stableUid, roomId, requestedNowMs, authUid) {
    const userRef = db.collection('users').doc(stableUid);
    const receiptRef = userRef.collection(tournament_core_1.TOURNAMENT_RECEIPTS_SUBCOLLECTION).doc(`reward_${roomId}`);
    const ticketsRef = userRef.collection('inventory').doc('tickets');
    return db.runTransaction(async (tx) => {
        const accessRefs = authUid ? [
            db.collection('auth_links').doc(authUid), userRef, db.collection('banned_users').doc(stableUid),
        ] : [];
        const snapshots = await tx.getAll(receiptRef, db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION).doc(roomId), ...accessRefs);
        const [receiptSnap, roomSnap] = snapshots;
        if (authUid)
            assertTransactionalTournamentAccess(authUid, stableUid, snapshots[2], snapshots[3], snapshots[4]);
        if (!receiptSnap.exists)
            throw new https_1.HttpsError('not-found', 'reward_not_found');
        const receipt = receiptSnap.data() || {};
        if (receipt.kind !== 'tournament_reward' || receipt.uid !== stableUid || receipt.roomId !== roomId) {
            throw new https_1.HttpsError('permission-denied', 'reward_receipt_invalid');
        }
        if (!roomSnap.exists || !['rewards', 'closed'].includes(sanitizeString(roomSnap.data()?.state, 20))) {
            throw new https_1.HttpsError('failed-precondition', 'room_not_finalized');
        }
        const reward = receipt.reward && typeof receipt.reward === 'object' ? receipt.reward : {};
        const gems = Math.max(0, readInt(reward.gems, 0));
        const tickets = Math.max(0, readInt(reward.tickets, 0));
        const titleId = sanitizeString(reward.titleId, 60);
        if (receipt.claimed === true) {
            return { ok: true, alreadyClaimed: true, place: readInt(receipt.place, 0), gems, tickets, titleId: titleId || null };
        }
        const nowMs = requestedNowMs ?? Date.now();
        if (gems > 0) {
            tx.set(userRef, {
                shards: admin.firestore.FieldValue.increment(gems),
                shards_updated_at_ms: nowMs,
                shards_updated_op: 'earn',
                shards_updated_reason: 'tournament_prize',
            }, { merge: true });
            tx.set(userRef.collection('shard_log').doc(`tournament_prize_${roomId}`), {
                ts: new Date(nowMs).toISOString(),
                type: 'earn',
                amount: gems,
                reason: 'tournament_prize',
                roomId,
                place: readInt(receipt.place, 0),
            });
        }
        if (tickets > 0)
            tx.set(ticketsRef, { count: admin.firestore.FieldValue.increment(tickets), updatedAt: nowMs }, { merge: true });
        if (titleId) {
            tx.set(userRef, {
                tournament_title: titleId,
                tournament_titles_won: admin.firestore.FieldValue.increment(1),
            }, { merge: true });
        }
        tx.set(receiptRef, { claimed: true, claimedAtMs: nowMs }, { merge: true });
        return {
            ok: true,
            alreadyClaimed: false,
            place: readInt(receipt.place, 0),
            gems,
            tickets,
            titleId: titleId || null,
            pending: reward.pending || {},
            claimedAtMs: nowMs,
        };
    });
}
exports.tournamentClaimReward = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const stableUid = await resolveStableUid(db, request.auth.uid);
    await assertNotBanned(db, stableUid);
    const roomId = sanitizeString(request.data?.roomId, 160);
    if (!roomId)
        throw new https_1.HttpsError('invalid-argument', 'room_required');
    return tournamentClaimTransaction(db, stableUid, roomId, undefined, request.auth.uid);
});
//# sourceMappingURL=tournaments.js.map