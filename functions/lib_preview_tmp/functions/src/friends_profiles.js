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
exports.friendsGetProfiles = void 0;
/**
 * Пачковая выдача публичных профилей друзей (убирает 4-RTT цепочку с клиента).
 *
 * Было (friends.tsx fetchFriendProfileFromFirestore): на КАЖДОГО друга до 4 последовательных
 * запросов (leaderboard/{uid} → leaderboard where firebaseAuthUid → arena_profiles where
 * mirrorStableId → arena_profiles/{uid}) с concurrency 6 — на 20 друзьях до 80 RTT.
 * Стало: один callable friendsGetProfiles({uids}) — цепочка выполняется server-to-server,
 * ответ кэшируется на 60 c (как listMyInvitesServerCache).
 *
 * TODO(mapping): набор полей выровнен по клиентским profileFromLeaderboardDoc /
 * profileFromArenaDoc (friends.tsx). Если там появятся новые поля карточки профиля —
 * дополнить FRIEND_PROFILE_FIELDS-маппинг здесь, не раздувая клиент.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const xp_levels_1 = require("./xp_levels");
const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
/** Сколько uid принимаем за вызов. */
const MAX_UIDS_PER_CALL = 100;
/** Server-side кэш ответа: 60 c — список друзей не требует realtime-точности. */
const SERVER_CACHE_TTL_MS = 60 * 1000;
const SERVER_CACHE_MAX_ENTRIES = 500;
const serverCache = new Map();
function readServerCache(key) {
    const hit = serverCache.get(key);
    if (hit && hit.expiresAtMs > Date.now())
        return hit.data;
    return null;
}
function writeServerCache(key, data) {
    const now = Date.now();
    serverCache.set(key, { expiresAtMs: now + SERVER_CACHE_TTL_MS, data });
    if (serverCache.size > SERVER_CACHE_MAX_ENTRIES) {
        for (const [k, entry] of serverCache) {
            if (entry.expiresAtMs <= now || serverCache.size > SERVER_CACHE_MAX_ENTRIES - 100) {
                serverCache.delete(k);
            }
        }
    }
}
function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
function str(v) {
    return typeof v === 'string' ? v : '';
}
/** Сборка публичного профиля из leaderboard + arena_profiles (приоритет leaderboard). */
function buildFriendProfile(uid, lb, arena) {
    if (!lb && !arena)
        return null;
    const displayName = str(lb?.displayName) || str(lb?.name) || str(arena?.displayName) || '';
    const totalXp = num(lb?.totalXp ?? lb?.user_total_xp ?? arena?.totalXp ?? arena?.user_total_xp);
    const profileCardLevel = num(lb?.courseProfileCardLevel ?? arena?.courseProfileCardLevel);
    const profile = {
        uid,
        displayName,
        totalXp,
        level: (0, xp_levels_1.getLevelFromXP)(totalXp),
        avatar: str(lb?.avatar ?? arena?.avatar),
        frame: str(lb?.courseProfileCardFrame ?? arena?.courseProfileCardFrame),
        aura: str(lb?.courseProfileCardAura ?? arena?.courseProfileCardAura),
        profileCardLevel,
        isPremium: lb?.courseIsPremium === true || lb?.isPremium === true || arena?.courseIsPremium === true,
        isVip: lb?.courseIsVip === true || lb?.isVip === true || arena?.courseIsVip === true,
        isLifetime: lb?.courseIsLifetime === true || lb?.isLifetime === true || arena?.courseIsLifetime === true,
    };
    if (!profile.displayName && profile.totalXp <= 0 && !profile.avatar && profile.profileCardLevel <= 0) {
        return null;
    }
    return profile;
}
/** Та же 4-шаговая цепочка, что была на клиенте, но server-to-server (1 вызов на всех). */
async function fetchOneProfile(db, uid) {
    let lbData;
    const lbSnap = await db.collection('leaderboard').doc(uid).get();
    if (lbSnap.exists) {
        lbData = lbSnap.data();
    }
    else {
        const byAuth = await db.collection('leaderboard').where('firebaseAuthUid', '==', uid).limit(1).get();
        lbData = byAuth.docs[0]?.data();
    }
    let arenaData;
    const arenaByStable = await db.collection('arena_profiles').where('mirrorStableId', '==', uid).limit(1).get();
    if (!arenaByStable.empty) {
        arenaData = arenaByStable.docs[0]?.data();
    }
    else {
        const arenaSnap = await db.collection('arena_profiles').doc(uid).get();
        arenaData = arenaSnap.exists ? arenaSnap.data() : undefined;
    }
    return buildFriendProfile(uid, lbData, arenaData);
}
exports.friendsGetProfiles = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const rawUids = request.data?.uids;
    if (!Array.isArray(rawUids)) {
        throw new https_1.HttpsError('invalid-argument', 'uids array required');
    }
    const uids = [...new Set(rawUids.map((u) => String(u ?? '').trim()).filter(Boolean))].slice(0, MAX_UIDS_PER_CALL);
    const cacheKey = uids.slice().sort().join(',');
    const cached = readServerCache(cacheKey);
    if (cached)
        return cached;
    const db = admin.firestore();
    const entries = await Promise.all(uids.map(async (uid) => {
        try {
            return [uid, await fetchOneProfile(db, uid)];
        }
        catch (e) {
            console.warn('friendsGetProfiles: failed for uid', uid, e);
            return [uid, null];
        }
    }));
    const profiles = {};
    for (const [uid, profile] of entries)
        profiles[uid] = profile;
    const result = { ok: true, profiles };
    writeServerCache(cacheKey, result);
    return result;
});
//# sourceMappingURL=friends_profiles.js.map