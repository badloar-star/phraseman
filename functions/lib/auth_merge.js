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
exports.authMergeStableAccounts = void 0;
exports.mergeUserProgress = mergeUserProgress;
exports.mergeShards = mergeShards;
exports.mergeStableAccounts = mergeStableAccounts;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const USERS = 'users';
/**
 * Cross-device account merge.
 *
 * Корень бага расслоения: клиентская транзакция в app/auth_provider.ts читала
 * ЧУЖОЙ users/{remoteStableId}, что запрещено firestore.rules (read требует
 * firebaseAuthUid == request.auth.uid). Транзакция падала → merge не происходил
 * → два аккаунта. Здесь то же слияние выполняется Admin SDK (правила не мешают),
 * атомарно, по политике «лучшее по каждому полю» — ничего не теряется.
 *
 * progress хранится как плоский Record<string,string> (значения — строки, как в
 * AsyncStorage). Поэтому числовые поля парсятся, берётся max, и результат снова
 * строка. premium/VIP сливаются СЕМАНТИЧЕСКИ (целым блоком от «сильной» стороны),
 * чтобы не получить half-merged несогласованное состояние (часть ключей от A,
 * часть от B).
 */
// ── Premium/VIP key sets (ровно как в app/cloud_sync.ts SYNC_KEYS premium-блок
//    и app/premium_progress.ts). Эти ключи НЕ участвуют в числовом max — они
//    переносятся целым блоком от победителя по entitlement. ─────────────────────
const PREMIUM_KEYS = [
    'premium_plan',
    'premium_expiry',
    'premium_rc_product_id',
    'premium_rc_period_type',
    'premium_rc_store',
    'premium_rc_environment',
    'premium_rc_event_type',
    'premium_rc_updated_at',
    'premium_rc_expiry_ms',
    'premium_rc_purchased_at_ms',
    'premium_rc_cancelled_at',
    'admin_premium_override',
    'premium_admin_grant_at',
];
const VIP_KEYS = [
    'vip_active',
    'vip_plan',
    'vip_from',
    'vip_until',
    'vip_expiry',
    'vip_admin_override',
    'vip_admin_grant_at',
    'vip_grant_at',
    'vip_migrated_from_admin_grant_at',
    'vip_revoked_at',
];
const PREMIUM_AND_VIP_KEYS = new Set([...PREMIUM_KEYS, ...VIP_KEYS, 'had_premium_ever']);
function cleanStr(value) {
    return String(value ?? '').trim();
}
function parseMs(value) {
    if (value == null || value === '')
        return 0;
    if (typeof value === 'object') {
        const record = value;
        if (typeof record.toMillis === 'function') {
            const n = Number(record.toMillis());
            return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
        }
        if (typeof record.seconds === 'number') {
            const n = Number(record.seconds) * 1000;
            return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
        }
    }
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
/**
 * Parses a value as a base-10 integer ONLY if it is a clean integer string/number.
 * Returns null for JSON blobs, booleans-as-strings, dates, empty — anything that
 * should be treated as opaque (string) rather than numerically maxed.
 */
function asCleanInt(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? Math.trunc(value) : null;
    if (typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    // Strictly integer (optionally negative). Avoids "1.5", "12abc", "true", "[...]".
    if (!/^-?\d+$/.test(trimmed))
        return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
}
function isTruthyFlag(value) {
    const v = cleanStr(value).toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
}
function isFalsyFlag(value) {
    const v = cleanStr(value).toLowerCase();
    return v === 'false' || v === '0' || v === 'no';
}
function hasMeaningfulPlan(plan) {
    return plan !== '' && plan !== 'null' && plan !== 'undefined';
}
function isStorePremiumPlan(plan) {
    return plan === 'monthly' || plan === 'yearly' || plan === 'annual';
}
function realPremiumStrength(progress, now) {
    const plan = cleanStr(progress.premium_plan).toLowerCase();
    const override = cleanStr(progress.admin_premium_override).toLowerCase();
    const expiryMs = parseMs(progress.premium_expiry);
    if (!hasMeaningfulPlan(plan))
        return { active: false, expiryMs: 0, hasShape: override === 'false' };
    if (override === 'true' || plan === 'admin_grant' || !isStorePremiumPlan(plan)) {
        // Not "real" store premium (это VIP-территория) — для premium-блока неактивно.
        return { active: false, expiryMs, hasShape: true };
    }
    const active = expiryMs <= 0 || expiryMs > now;
    // expiryMs<=0 (бессрочная подписка) — самый «сильный»: сортируем как +∞.
    return { active, expiryMs: expiryMs <= 0 ? Number.MAX_SAFE_INTEGER : expiryMs, hasShape: true };
}
function vipStrength(progress, now) {
    const planRaw = cleanStr(progress.vip_plan).toLowerCase();
    const overrideRaw = cleanStr(progress.vip_admin_override);
    const activeFlag = isTruthyFlag(progress.vip_active);
    const revoked = isFalsyFlag(progress.vip_admin_override) || isFalsyFlag(progress.vip_active);
    const fromMs = parseMs(progress.vip_from);
    const untilMs = parseMs(progress.vip_until ?? progress.vip_expiry);
    const grantAt = cleanStr(progress.vip_admin_grant_at ?? progress.vip_grant_at);
    const hasShape = hasMeaningfulPlan(planRaw) || activeFlag || revoked || fromMs > 0 || untilMs > 0 || !!grantAt;
    if (!hasShape)
        return { active: false, expiryMs: 0, hasShape: false };
    const plan = hasMeaningfulPlan(planRaw) ? planRaw : 'admin_vip';
    const windowStarted = fromMs <= 0 || fromMs <= now;
    const windowOpen = untilMs <= 0 || untilMs > now;
    const active = !revoked && (activeFlag || isTruthyFlag(overrideRaw) || hasMeaningfulPlan(plan)) && windowStarted && windowOpen;
    return { active, expiryMs: untilMs <= 0 ? Number.MAX_SAFE_INTEGER : untilMs, hasShape: true };
}
/**
 * Chooses which side "wins" an entitlement block:
 *  1. active beats inactive,
 *  2. among same activeness, furthest expiry wins,
 *  3. a side with any shape beats a side with none.
 * Ties → prefer A (the declared winner-by-XP). Returns 'a' | 'b'.
 */
function chooseEntitlementSide(a, b) {
    if (a.active !== b.active)
        return a.active ? 'a' : 'b';
    if (a.expiryMs !== b.expiryMs)
        return a.expiryMs > b.expiryMs ? 'a' : 'b';
    if (a.hasShape !== b.hasShape)
        return a.hasShape ? 'a' : 'b';
    return 'a';
}
function copyKeys(from, keys, into) {
    for (const k of keys) {
        if (from[k] !== undefined)
            into[k] = from[k];
    }
}
/**
 * Best-of-field merge of two progress maps.
 * @param winner the canonical side (higher XP) — wins ties / opaque-string conflicts
 * @param loser  the side being merged in
 * @returns a NEW merged progress map (immutable — neither input mutated)
 */
function mergeUserProgress(winner, loser, now = Date.now()) {
    const w = winner ? { ...winner } : {};
    const l = loser ? { ...loser } : {};
    const out = { ...l, ...w }; // start: winner overrides loser for shared keys
    const allKeys = new Set([...Object.keys(w), ...Object.keys(l)]);
    for (const key of allKeys) {
        if (PREMIUM_AND_VIP_KEYS.has(key))
            continue; // handled as whole blocks below
        const wv = w[key];
        const lv = l[key];
        // Only loser has it → take loser's (out already has it from spread of l).
        if (wv === undefined) {
            out[key] = lv;
            continue;
        }
        // Only winner has it → keep winner's (already in out).
        if (lv === undefined) {
            out[key] = wv;
            continue;
        }
        // Both present: numeric-accumulative → max.
        const wn = asCleanInt(wv);
        const ln = asCleanInt(lv);
        if (wn !== null && ln !== null) {
            const max = Math.max(wn, ln);
            // Preserve string-ness if inputs were strings (progress is a string map).
            out[key] = typeof wv === 'string' || typeof lv === 'string' ? String(max) : max;
            continue;
        }
        // Both present, not both numeric: keep winner's value, but if winner's is
        // empty/blank and loser's is meaningful, take loser's (don't lose data).
        const wStr = cleanStr(wv);
        if (wStr === '' || wStr.toLowerCase() === 'null' || wStr.toLowerCase() === 'undefined') {
            const lStr = cleanStr(lv);
            if (lStr !== '' && lStr.toLowerCase() !== 'null' && lStr.toLowerCase() !== 'undefined') {
                out[key] = lv;
                continue;
            }
        }
        out[key] = wv;
    }
    // ── Premium block: take the stronger side ENTIRELY (consistent state). ───────
    // First strip any premium keys that leaked in from the spread, then copy the
    // winning side's full block.
    for (const k of PREMIUM_KEYS)
        delete out[k];
    const premiumSide = chooseEntitlementSide(realPremiumStrength(w, now), realPremiumStrength(l, now));
    copyKeys(premiumSide === 'a' ? w : l, PREMIUM_KEYS, out);
    // ── VIP block: same. ────────────────────────────────────────────────────────
    for (const k of VIP_KEYS)
        delete out[k];
    const vipSide = chooseEntitlementSide(vipStrength(w, now), vipStrength(l, now));
    copyKeys(vipSide === 'a' ? w : l, VIP_KEYS, out);
    // ── had_premium_ever: sticky true if EITHER ever had it. ─────────────────────
    if (isTruthyFlag(w.had_premium_ever) || isTruthyFlag(l.had_premium_ever)) {
        out.had_premium_ever = 'true';
    }
    else if (w.had_premium_ever !== undefined) {
        out.had_premium_ever = w.had_premium_ever;
    }
    else if (l.had_premium_ever !== undefined) {
        out.had_premium_ever = l.had_premium_ever;
    }
    return out;
}
/** Shards balance lives at users/{uid}.shards (top-level). Merge = max (no dup farming). */
function mergeShards(winner, loser) {
    const wn = asCleanInt(winner);
    const ln = asCleanInt(loser);
    if (wn === null && ln === null)
        return undefined;
    return Math.max(wn ?? 0, ln ?? 0);
}
/**
 * Merges two stable-id accounts into one canonical doc using Admin SDK.
 * Winner = higher user_total_xp. Loser's data is merged in (best-of-field), then
 * the loser doc is hidden (identityHidden + canonicalStableId) and downstream
 * surfaces (leaderboard/league/name_index) are canonicalized via the existing
 * cleanup helper.
 *
 * Idempotent: if the two are already merged (one hidden → other), returns the
 * canonical id without rewriting.
 */
async function mergeStableAccounts(db, authUid, stableIdA, stableIdB, now = Date.now()) {
    const a = cleanStr(stableIdA);
    const b = cleanStr(stableIdB);
    if (!a || !b)
        throw new https_1.HttpsError('invalid-argument', 'stable_ids_required');
    // Same id (or already-canonicalized to the same target) → nothing to merge.
    if (a === b) {
        await (0, auth_identity_1.linkStableAuthUid)(db, a, authUid);
        return { canonicalStableId: a, mergedFromStableId: null, alreadyMerged: true };
    }
    const [snapA, snapB] = await Promise.all([
        db.collection(USERS).doc(a).get(),
        db.collection(USERS).doc(b).get(),
    ]);
    const dataA = (snapA.data() ?? {});
    const dataB = (snapB.data() ?? {});
    // Resolve hidden→canonical pointers so we never "revive" a tombstoned doc.
    const canonA = dataA.identityHidden === true && cleanStr(dataA.canonicalStableId)
        ? cleanStr(dataA.canonicalStableId)
        : a;
    const canonB = dataB.identityHidden === true && cleanStr(dataB.canonicalStableId)
        ? cleanStr(dataB.canonicalStableId)
        : b;
    // Already merged into the same canonical → idempotent no-op.
    if (canonA === canonB) {
        await (0, auth_identity_1.linkStableAuthUid)(db, canonA, authUid);
        return { canonicalStableId: canonA, mergedFromStableId: null, alreadyMerged: true };
    }
    // Ownership: caller must own BOTH (provider just signed in → allowProviderRelink).
    // assertStableOwner is invoked indirectly via resolveStableUidForAuth, which also
    // self-heals firebaseAuthUid. Reject (permission-denied) if either is not ownable.
    const opts = { allowProviderRelink: true };
    const ownedA = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, canonA, opts);
    const ownedB = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, canonB, opts);
    const liveA = (await db.collection(USERS).doc(ownedA).get()).data() ?? {};
    const liveB = (await db.collection(USERS).doc(ownedB).get()).data() ?? {};
    const xpA = asCleanInt(liveA.progress?.user_total_xp) ?? 0;
    const xpB = asCleanInt(liveB.progress?.user_total_xp) ?? 0;
    // Winner = higher XP. Tie → keep the one already linked to this auth uid if any,
    // else A.
    let winnerId = ownedA;
    let loserId = ownedB;
    let winnerData = liveA;
    let loserData = liveB;
    if (xpB > xpA) {
        winnerId = ownedB;
        loserId = ownedA;
        winnerData = liveB;
        loserData = liveA;
    }
    if (winnerId === loserId) {
        await (0, auth_identity_1.linkStableAuthUid)(db, winnerId, authUid);
        return { canonicalStableId: winnerId, mergedFromStableId: null, alreadyMerged: true };
    }
    const mergedProgress = mergeUserProgress(winnerData.progress, loserData.progress, now);
    const mergedShards = mergeShards(winnerData.shards, loserData.shards);
    const winnerRef = db.collection(USERS).doc(winnerId);
    const loserRef = db.collection(USERS).doc(loserId);
    await db.runTransaction(async (tx) => {
        const update = {
            progress: mergedProgress,
            firebaseAuthUid: authUid,
            updatedAt: now,
            identityMergedAt: now,
        };
        if (mergedShards !== undefined)
            update.shards = mergedShards;
        tx.set(winnerRef, update, { merge: true });
        tx.set(loserRef, {
            identityHidden: true,
            canonicalStableId: winnerId,
            duplicateOfStableId: winnerId,
            identityMergedAt: now,
            updatedAt: now,
        }, { merge: true });
    });
    // Canonicalize leaderboard / league_groups / name_index for both the loser id
    // and any siblings sharing this auth uid. Best-effort (does not fail the merge).
    await (0, auth_identity_1.cleanupLegacyAuthIdentityDuplicates)(db, winnerId, authUid, {
        reason: 'account_merge',
    }).catch((e) => {
        console.warn(JSON.stringify({
            event: 'account_merge_cleanup_failed',
            winnerId,
            loserId,
            message: String(e?.message ?? e).slice(0, 160),
        }));
    });
    console.log(JSON.stringify({
        event: 'account_merged',
        winner: winnerId.slice(0, 8),
        loser: loserId.slice(0, 8),
        xpWinner: Math.max(xpA, xpB),
        xpLoser: Math.min(xpA, xpB),
    }));
    return { canonicalStableId: winnerId, mergedFromStableId: loserId, alreadyMerged: false };
}
exports.authMergeStableAccounts = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableIdA = cleanStr(request.data?.stableIdA);
    const stableIdB = cleanStr(request.data?.stableIdB);
    if (!stableIdA || !stableIdB) {
        throw new https_1.HttpsError('invalid-argument', 'stable_ids_required');
    }
    const result = await mergeStableAccounts(db, authUid, stableIdA, stableIdB);
    return { ok: true, ...result };
});
//# sourceMappingURL=auth_merge.js.map