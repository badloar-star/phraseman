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
exports.arenaSeasonClaimReward = exports.arenaSeasonGetTop = void 0;
/**
 * arenaSeasonGetTop — топ-100 текущего сезона + место запрашивающего.
 * arenaSeasonClaimReward — выдача награды за завершённый сезон (идемпотентно).
 *
 * Награда считается по ПИКУ за сезон (peakSR / seasonPeakRankIndex) + финальному
 * месту (finalPlace), которые крон arenaSeasonRolloverCron застэшил в
 * arena_season_claims/{seasonId}_{uid}. Дропы — существующий каталог (shards/ауры/
 * энергия), начисление через тот же buildRewardProgressPatch, что у лиг.
 */
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const arena_season_1 = require("./arena_season");
const league_chest_1 = require("./league_chest");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const LEGEND_RANK_INDEX = (0, arena_season_1.rankIndex)('legend', 'III'); // 23
// ─── Топ-100 ─────────────────────────────────────────────────────────────────
exports.arenaSeasonGetTop = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const seasonId = (0, arena_season_1.seasonIdForDate)(new Date());
    const entriesCol = db
        .collection('arena_season_leaderboard').doc(seasonId).collection('entries');
    const topSnap = await entriesCol.orderBy('sr', 'desc').limit(100).get();
    const rows = topSnap.docs.map((doc, i) => {
        const dd = doc.data();
        return { place: i + 1, uid: dd.uid ?? doc.id, sr: Math.max(0, Math.trunc(dd.sr ?? 0)) };
    });
    // Обогащение косметикой — те же источники, что hill-топ.
    const entries = await Promise.all(rows.map(async (row) => {
        const [lbSnap, userSnap, apSnap] = await Promise.all([
            db.collection('leaderboard').doc(row.uid).get().catch(() => null),
            db.collection('users').doc(row.uid).get().catch(() => null),
            db.collection('arena_profiles').doc(row.uid).get().catch(() => null),
        ]);
        const lb = lbSnap?.data() ?? {};
        const user = userSnap?.data() ?? {};
        const ap = apSnap?.data() ?? {};
        return {
            ...row,
            name: String(lb.name ?? user.displayName ?? ap.displayName ?? 'Phraseman').slice(0, 64),
            avatar: lb.avatar ?? user.avatar ?? ap.courseAvatar ?? null,
            frame: lb.frame ?? user.frame ?? ap.courseFrame ?? null,
            aura: lb.aura ?? user.aura ?? ap.courseAura ?? null,
            isPremium: lb.isPremium === true || user.isPremium === true,
        };
    }));
    // Место запрашивающего, если он ниже топ-100.
    const meId = request.auth.uid;
    const meInTop = entries.find((e) => e.uid === meId);
    let myPlace = meInTop?.place ?? null;
    let mySR = meInTop?.sr ?? 0;
    if (!meInTop) {
        const meSnap = await entriesCol.doc(meId).get().catch(() => null);
        const meData = meSnap?.data();
        if (meData) {
            mySR = Math.max(0, Math.trunc(meData.sr ?? 0));
            const ahead = await entriesCol.where('sr', '>', mySR).count().get();
            myPlace = ahead.data().count + 1;
        }
    }
    const seasonSnap = await db.collection('arena_seasons').doc(seasonId).get();
    const startsAt = seasonSnap.data()?.startsAt ?? Date.now();
    return { seasonId, startsAt, endsAtMs: (0, arena_season_1.quarterEndMs)(new Date()), myPlace, mySR, entries };
});
// ─── Выдача награды ──────────────────────────────────────────────────────────
exports.arenaSeasonClaimReward = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const uid = request.auth.uid;
    const seasonId = String(request.data?.seasonId ?? '').trim();
    if (!seasonId)
        throw new https_1.HttpsError('invalid-argument', 'season_required');
    const db = admin.firestore();
    const claimRef = db.collection('arena_season_claims').doc(`${seasonId}_${uid}`);
    const userRef = db.collection('users').doc(uid);
    const profileRef = db.collection('arena_profiles').doc(uid);
    return db.runTransaction(async (tx) => {
        const claimSnap = await tx.get(claimRef);
        const claim = claimSnap.data();
        if (!claim)
            throw new https_1.HttpsError('not-found', 'nothing_to_claim');
        if (claim.claimed)
            return { alreadyClaimed: true, rewards: [] };
        const rewards = buildSeasonRewards(claim.peakSR ?? 0, claim.seasonPeakRankIndex ?? 0, claim.finalPlace ?? null);
        const userSnap = await tx.get(userRef);
        const user = userSnap.data() ?? {};
        const now = Date.now();
        const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // бусты/триалы живут неделю
        const shards = rewards.filter((r) => r.kind === 'shards').reduce((s, r) => s + (r.amount ?? 0), 0);
        const beforeShards = Math.max(0, Math.trunc(Number(user.shards ?? 0)));
        const userPatch = {
            ...(0, league_chest_1.buildRewardProgressPatch)({ drops: rewards, user, now, expiresAt }),
        };
        if (shards > 0) {
            userPatch.shards = beforeShards + shards;
            userPatch.shards_updated_at_ms = now;
            userPatch.shards_updated_op = 'earn';
            userPatch.shards_updated_reason = 'arena_season';
        }
        tx.set(userRef, userPatch, { merge: true });
        // Сезонный бейдж у ника (до конца след. сезона) — если есть место в топах.
        const badge = badgeForPlace(claim.finalPlace ?? null, claim.seasonPeakRankIndex ?? 0);
        if (badge) {
            tx.set(profileRef, { seasonBadge: { seasonId, tier: badge } }, { merge: true });
        }
        tx.set(claimRef, { claimed: true, claimedAt: now, rewards }, { merge: true });
        return { alreadyClaimed: false, rewards };
    });
});
// ─── Состав награды по пику/месту ────────────────────────────────────────────
function buildSeasonRewards(peakSR, peakRankIndex, finalPlace) {
    const out = [];
    const reachedLegend = peakRankIndex >= LEGEND_RANK_INDEX;
    const top100 = finalPlace != null && finalPlace <= 100;
    const top10 = finalPlace != null && finalPlace <= 10;
    const champion = finalPlace === 1;
    // Осколки растут от пикового ранга, бонус за место.
    let shards = reachedLegend ? 120 : Math.max(20, Math.round(peakRankIndex * 6));
    if (top100)
        shards += 60;
    if (top10)
        shards += 120;
    if (champion)
        shards += 200;
    out.push({ id: 'season_shards', kind: 'shards', rarity: 'common', amount: shards });
    if (reachedLegend) {
        out.push({ id: 'season_aura', kind: 'avatar_aura', rarity: 'epic', auraId: 'aura-season' });
        out.push({ id: 'season_energy', kind: 'energy_fast_recovery', rarity: 'rare' });
    }
    if (top10 || champion) {
        out.push({ id: 'season_champion_aura', kind: 'avatar_aura', rarity: 'legendary', auraId: 'aura-season-champion' });
    }
    return out;
}
function badgeForPlace(finalPlace, peakRankIndex) {
    if (finalPlace === 1)
        return 'champion';
    if (finalPlace != null && finalPlace <= 10)
        return 'top10';
    if (finalPlace != null && finalPlace <= 100)
        return 'top100';
    return null;
}
//# sourceMappingURL=arena_season_rewards.js.map