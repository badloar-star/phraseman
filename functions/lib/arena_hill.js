"use strict";
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
exports.arenaHillGetDailyTop = exports.arenaHillRecordAttempt = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const THRONES = 'arena_hill_thrones';
const PLAYER_WINS = 'arena_hill_player_wins'; // {dayKey}_{stableUid} → { wins, name, updatedAt }
const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000;
const THRONE_REWARD_SHARDS = 10;
// Defense-in-depth: bound the daily win counter so a client that fabricates wins
// (isWin is client-asserted — see the security note on arenaHillRecordAttempt)
// cannot inflate the throne score to an absurd value. Set far above any real
// day of play so a legitimate grinder is never capped. NOTE: this bounds score
// inflation only; fully closing the fake-win farm requires server-side bot-match
// adjudication (the server must decide the winner instead of trusting isWin).
const MAX_DAILY_WINS = 1000;
function readInt(value, fallback = 0) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? n : fallback;
}
function readMaxInt(...values) {
    let max = 0;
    for (const value of values)
        max = Math.max(max, readInt(value, 0));
    return max;
}
function pad2(n) {
    return String(n).padStart(2, '0');
}
function dayKey(date = new Date()) {
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}
function cleanName(value) {
    const s = String(value ?? '').replace(/\s+/g, ' ').trim();
    return (s || 'Phraseman').slice(0, 80);
}
function cleanString(value, max = 80) {
    const s = String(value ?? '').replace(/\s+/g, ' ').trim();
    return s ? s.slice(0, max) : undefined;
}
function safeDocId(s) {
    return String(s || 'x').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'x';
}
function parseSessionStartedAt(sessionId) {
    const botHillMatch = /^bot_hill_(\d{10,15})$/.exec(sessionId);
    if (botHillMatch) {
        const startedAt = Number(botHillMatch[1]);
        if (Number.isFinite(startedAt)) {
            const now = Date.now();
            if (startedAt <= now + 60000 && now - startedAt <= MAX_SESSION_AGE_MS) {
                return startedAt;
            }
        }
    }
    return Date.now();
}
async function resolveStableUid(db, authUid) {
    const direct = await db.collection('users').doc(authUid).get().catch(() => null);
    if (direct?.exists)
        return authUid;
    const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
    if (!byAuth.empty)
        return byAuth.docs[0].id;
    return authUid;
}
async function assertNotBanned(db, stableUid) {
    const [userSnap, bannedSnap] = await Promise.all([
        db.collection('users').doc(stableUid).get().catch(() => null),
        db.collection('banned_users').doc(stableUid).get().catch(() => null),
    ]);
    if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
        throw new https_1.HttpsError('permission-denied', 'user_banned');
    }
}
async function resolveDisplayName(db, stableUid, requested) {
    const [lbSnap, userSnap] = await Promise.all([
        db.collection('leaderboard').doc(stableUid).get().catch(() => null),
        db.collection('users').doc(stableUid).get().catch(() => null),
    ]);
    return cleanName(lbSnap?.data()?.name
        ?? userSnap?.data()?.name
        ?? userSnap?.data()?.displayName
        ?? requested
        ?? 'Phraseman');
}
exports.arenaHillRecordAttempt = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid);
    await assertNotBanned(db, stableUid);
    const sessionId = String(request.data?.sessionId ?? '').trim();
    parseSessionStartedAt(sessionId); // validate age only
    const isWin = request.data?.isWin === true || request.data?.isWin === 1;
    const today = dayKey();
    const name = await resolveDisplayName(db, stableUid, request.data?.userName);
    const now = Date.now();
    const throneRef = db.collection(THRONES).doc(today);
    const playerWinsRef = db.collection(PLAYER_WINS).doc(`${today}_${safeDocId(stableUid)}`);
    // De-dup per session — одна сессия не может дать больше одной победы
    const sessionRef = db.collection(PLAYER_WINS).doc(`session_${safeDocId(sessionId)}_${safeDocId(stableUid)}`);
    return db.runTransaction(async (tx) => {
        const [throneSnap, playerSnap, sessionSnap] = await Promise.all([
            tx.get(throneRef),
            tx.get(playerWinsRef),
            tx.get(sessionRef),
        ]);
        // Дедупликация по sessionId
        if (sessionSnap.exists) {
            const current = throneSnap.exists ? throneSnap.data() || {} : null;
            return {
                dayKey: today,
                duplicate: true,
                isNewChampion: false,
                myWins: readInt(playerSnap.data()?.wins, 0),
                throne: current ? { id: today, ...current } : null,
                previousChampionName: current?.championName,
                previousScore: current?.score,
            };
        }
        // Записываем сессию как обработанную
        tx.set(sessionRef, { dayKey: today, stableUid, sessionId, isWin, createdAt: now });
        // Обновляем счётчик побед игрока (с дневным потолком против накрутки счёта)
        const prevWins = readInt(playerSnap.data()?.wins, 0);
        const newWins = isWin && prevWins < MAX_DAILY_WINS ? prevWins + 1 : prevWins;
        tx.set(playerWinsRef, { dayKey: today, stableUid, name, wins: newWins, updatedAt: now }, { merge: true });
        const current = throneSnap.exists ? throneSnap.data() || {} : null;
        const currentChampionWins = readInt(current?.score, 0);
        const attempts = readInt(current?.attempts, 0) + 1;
        // Занимаем трон если: победа И (трон пустой ИЛИ у нас побед больше)
        const winsThrone = isWin && newWins > currentChampionWins;
        // Обновляем трон если мы уже чемпион (наш счётчик вырос)
        const isCurrentChampion = current?.championUid === stableUid;
        const shouldUpdate = winsThrone || (isCurrentChampion && isWin);
        if (!shouldUpdate) {
            tx.set(throneRef, { dayKey: today, attempts, lastAttemptAt: now, updatedAt: now }, { merge: true });
            return {
                dayKey: today,
                isNewChampion: false,
                myWins: newWins,
                throne: current ? { id: today, ...current, attempts, updatedAt: now } : null,
                previousChampionName: current?.championName,
                previousScore: current?.score,
            };
        }
        const next = {
            id: today,
            dayKey: today,
            championUid: stableUid,
            championAuthUid: authUid,
            championName: name,
            score: newWins, // score = количество побед
            heldSince: isCurrentChampion ? (current?.heldSince ?? now) : now,
            updatedAt: now,
            attempts,
            ...(current?.championUid && !isCurrentChampion ? { previousChampionUid: current.championUid } : {}),
            ...(current?.championName && !isCurrentChampion ? { previousChampionName: current.championName } : {}),
            ...(typeof current?.score === 'number' && !isCurrentChampion ? { previousScore: current.score } : {}),
        };
        tx.set(throneRef, next);
        return {
            dayKey: today,
            isNewChampion: winsThrone && !isCurrentChampion,
            myWins: newWins,
            throne: next,
            previousChampionName: current?.championName,
            previousScore: current?.score,
        };
    });
});
exports.arenaHillGetDailyTop = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const today = dayKey();
    const throneSnap = await db.collection(THRONES).doc(today).get();
    const throne = throneSnap.data() ?? {};
    const rawRows = throneSnap.exists && throne.championUid
        ? [{
                uid: cleanString(throne.championUid, 120) ?? '',
                authUid: cleanString(throne.championAuthUid, 120),
                name: cleanName(throne.championName),
                wins: Math.max(0, readInt(throne.score, 0)),
                updatedAt: readInt(throne.updatedAt, 0),
            }].filter((row) => row.uid && row.wins > 0)
        : [];
    const entries = await Promise.all(rawRows.map(async (row, index) => {
        const [lbSnap, userSnap, arenaStableSnap, arenaAuthSnap] = await Promise.all([
            db.collection('leaderboard').doc(row.uid).get().catch(() => null),
            db.collection('users').doc(row.uid).get().catch(() => null),
            db.collection('arena_profiles').doc(row.uid).get().catch(() => null),
            row.authUid && row.authUid !== row.uid
                ? db.collection('arena_profiles').doc(row.authUid).get().catch(() => null)
                : Promise.resolve(null),
        ]);
        const lb = lbSnap?.data() ?? {};
        const user = userSnap?.data() ?? {};
        const userProgress = (user.progress && typeof user.progress === 'object')
            ? user.progress
            : {};
        const arenaStable = arenaStableSnap?.data() ?? {};
        const rawArenaAuth = arenaAuthSnap?.data() ?? {};
        const arenaAuthMirror = cleanString(rawArenaAuth.mirrorStableId, 120);
        const arenaAuth = !arenaAuthMirror || arenaAuthMirror === row.uid ? rawArenaAuth : {};
        const totalXp = readMaxInt(lb.points, lb.totalXp, user.totalXp, user.user_total_xp, userProgress.user_total_xp, userProgress.totalXp, arenaStable.courseTotalXp, arenaStable.totalXp, arenaAuth.courseTotalXp, arenaAuth.totalXp);
        return {
            place: index + 1,
            uid: row.uid,
            name: cleanName(lb.name ?? user.displayName ?? user.name ?? userProgress.user_name ?? arenaStable.displayName ?? arenaAuth.displayName ?? row.name),
            wins: row.wins,
            totalXp,
            avatar: cleanString(lb.avatar ?? user.avatar ?? user.user_avatar ?? userProgress.user_avatar ?? arenaStable.courseAvatar ?? arenaAuth.courseAvatar, 64),
            frame: cleanString(lb.frame ?? user.frame ?? user.user_frame ?? userProgress.user_frame ?? userProgress.user_avatar_frame ?? arenaStable.courseFrame ?? arenaAuth.courseFrame, 64),
            aura: cleanString(lb.aura ?? user.aura ?? user.user_avatar_aura ?? userProgress.user_avatar_aura ?? arenaStable.courseAura ?? arenaAuth.courseAura, 64),
            isPremium: lb.isPremium === true || user.isPremium === true,
            isVip: lb.isVip === true || user.isVip === true,
            profileCardLevel: readInt(lb.profileCardLevel ?? user.profileCardLevel ?? userProgress.profile_card_level ?? arenaStable.courseProfileCardLevel ?? arenaAuth.courseProfileCardLevel, 0),
            profileCardTheme: cleanString(lb.profileCardTheme ?? user.profileCardTheme ?? userProgress.profile_card_theme ?? arenaStable.courseProfileCardTheme ?? arenaAuth.courseProfileCardTheme, 32),
            profileCardMotion: cleanString(lb.profileCardMotion ?? user.profileCardMotion ?? userProgress.profile_card_motion ?? arenaStable.courseProfileCardMotion ?? arenaAuth.courseProfileCardMotion, 32),
            profileCardPublicFocus: cleanString(lb.profileCardPublicFocus ?? user.profileCardPublicFocus ?? userProgress.profile_card_public_focus ?? arenaStable.courseProfileCardPublicFocus ?? arenaAuth.courseProfileCardPublicFocus, 32),
        };
    }));
    return {
        dayKey: today,
        rewardShards: THRONE_REWARD_SHARDS,
        entries,
    };
});
//# sourceMappingURL=arena_hill.js.map