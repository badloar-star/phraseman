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
exports.chooseSurvivingAttribution = chooseSurvivingAttribution;
exports.mergeUserProgress = mergeUserProgress;
exports.mergeShards = mergeShards;
exports.mergeStableAccounts = mergeStableAccounts;
exports.repointReferralOnMerge = repointReferralOnMerge;
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
/**
 * Реферальные счётчики наград — вложенные map {период: число} в progress. Их НЕЛЬЗЯ
 * брать «целиком от победителя» (generic-логика так и делает для объектов) — иначе мерж
 * СБРАСЫВАЛ БЫ анти-фарм кап (лузерский счёт терялся). Суммируем по периодам.
 */
const REFERRAL_CLAIM_COUNTER_KEYS = ['referral_vip_claims_monthly', 'referral_vip_claims_daily'];
/** Парсит вложенный счётчик {период: число} из значения progress (объект или JSON-строка). */
function asClaimCounter(value) {
    let obj = value;
    if (typeof value === 'string') {
        try {
            obj = JSON.parse(value);
        }
        catch {
            return {};
        }
    }
    if (!obj || typeof obj !== 'object')
        return {};
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0)
            out[k] = Math.floor(n);
    }
    return out;
}
/** Сумма двух реферальных счётчиков по периодам (объединение ключей, сложение значений). */
function mergeClaimCounters(a, b) {
    const ca = asClaimCounter(a);
    const cb = asClaimCounter(b);
    const keys = new Set([...Object.keys(ca), ...Object.keys(cb)]);
    if (keys.size === 0)
        return undefined;
    const out = {};
    for (const k of keys)
        out[k] = (ca[k] ?? 0) + (cb[k] ?? 0);
    return out;
}
/**
 * Выбирает, какой referee-attribution оставить при коллизии на merge (у winner уже есть свой).
 * Порядок «дальше прошёл»: rewarded > qualified/skipped > pending. Ничья → существующий (a).
 * Это НЕ выдаёт награду повторно (refereeRewardedAtMs/статус сохраняются) и НЕ теряет её.
 * Экспортируется для тестов.
 */
function chooseSurvivingAttribution(a, b) {
    if (!a)
        return b;
    if (!b)
        return a;
    const rank = (s) => {
        if (s === 'rewarded' || s === 'revoked')
            return 3;
        if (s === 'qualified' || s === 'skipped_referrer_cap')
            return 2;
        if (s === 'pending')
            return 1;
        return 0;
    };
    return rank(b.status) > rank(a.status) ? b : a;
}
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
    return plan === 'monthly' || plan === 'yearly' || plan === 'annual' || plan === 'lifetime';
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
        if (REFERRAL_CLAIM_COUNTER_KEYS.includes(key))
            continue; // summed below
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
    // ── Реферальные счётчики наград: СУММИРУЕМ по периодам (не сбрасываем кап мержем). ──
    for (const key of REFERRAL_CLAIM_COUNTER_KEYS) {
        const merged = mergeClaimCounters(w[key], l[key]);
        if (merged)
            out[key] = merged;
        else
            delete out[key];
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
const AUTH_LINKS_COL = 'auth_links';
/**
 * Genuine ownership = the caller controls this account through a trustworthy
 * signal — its firebaseAuthUid is the caller, or a provider link (Google/Apple)
 * binds it to the caller, or auth_links/{authUid} points at it. It deliberately
 * does NOT accept the anonymous-reinstall relink escape (assertStableOwner line
 * ~173), which trusts a stable_id that is publicly readable as a leaderboard
 * document id. A fresh anon_merge_claim proves a device held an anonymous LOSER
 * but must NEVER make an account the merge survivor (see the "never overwrite an
 * owned account" test). Used to gate every path that rebinds
 * users/{id}.firebaseAuthUid to the caller (#11 / #12 account-takeover).
 */
async function callerGenuinelyOwns(db, authUid, stableId, data) {
    const userData = data ?? (await db.collection(USERS).doc(stableId).get().catch(() => null))?.data() ?? {};
    if (cleanStr(userData.firebaseAuthUid) === authUid)
        return true;
    const linkedAuth = userData.linkedAuth;
    if (linkedAuth && typeof linkedAuth === 'object') {
        const providerUid = cleanStr(linkedAuth.providerUid);
        if (providerUid && providerUid === authUid)
            return true;
    }
    const linkSnap = await db.collection(AUTH_LINKS_COL).doc(authUid).get().catch(() => null);
    if (stableId && cleanStr(linkSnap?.data()?.stable_id) === stableId)
        return true;
    return false;
}
/** Throw permission-denied unless the caller GENUINELY owns the account it is
 *  about to be bound to. Shared by every merge branch that would rewrite
 *  users/{id}.firebaseAuthUid, so a leaked stable_id alone can never seize a
 *  stranger's account. */
async function assertGenuineOwnerForBind(db, authUid, stableId, data) {
    if (await callerGenuinelyOwns(db, authUid, stableId, data))
        return;
    console.warn(JSON.stringify({ event: 'merge_bind_denied', authUid, stableId }));
    throw new https_1.HttpsError('permission-denied', 'stable_id_mismatch');
}
async function mergeStableAccounts(db, authUid, stableIdA, stableIdB, now = Date.now()) {
    const a = cleanStr(stableIdA);
    const b = cleanStr(stableIdB);
    if (!a || !b)
        throw new https_1.HttpsError('invalid-argument', 'stable_ids_required');
    // Same id (or already-canonicalized to the same target) → nothing to merge.
    if (a === b) {
        await assertGenuineOwnerForBind(db, authUid, a);
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
        await assertGenuineOwnerForBind(db, authUid, canonA);
        await (0, auth_identity_1.linkStableAuthUid)(db, canonA, authUid);
        return { canonicalStableId: canonA, mergedFromStableId: null, alreadyMerged: true };
    }
    // Ownership: the SURVIVING (winner) account must be owned by the caller. The
    // loser may be a device-held anonymous account the caller doesn't formally own
    // yet (scenario #11), but ONLY if it carries a fresh anon_merge_claim it stamped
    // itself moments ago while still anonymous (see authStampAnonOwnership). That
    // proves the same device held it — an attacker with a leaked stable_id has no
    // anonymous token to stamp with, so cannot absorb a stranger's account.
    // resolveStableUidForAuth self-heals firebaseAuthUid; here we tolerate a mismatch
    // and defer the decision until the XP winner is known.
    // repairLinks:false — the ownership PROBE must be READ-ONLY. Previously
    // resolveStableUidForAuth rebound users/{id}.firebaseAuthUid as a side effect of
    // the probe, so a permissive anon-relink resolve seized a victim's account before
    // the ownership gates even ran (and that rebind was not rolled back on a later
    // throw). The genuine rebind now happens ONLY in the final transaction / the
    // gated branch links below.
    const opts = { allowProviderRelink: true, repairLinks: false };
    const resolveOwnershipSafe = async (id) => {
        try {
            return { owned: true, id: await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, id, opts) };
        }
        catch {
            return { owned: false, id };
        }
    };
    const resA = await resolveOwnershipSafe(canonA);
    const resB = await resolveOwnershipSafe(canonB);
    const liveA = (await db.collection(USERS).doc(resA.id).get()).data() ?? {};
    const liveB = (await db.collection(USERS).doc(resB.id).get()).data() ?? {};
    const xpA = asCleanInt(liveA.progress?.user_total_xp) ?? 0;
    const xpB = asCleanInt(liveB.progress?.user_total_xp) ?? 0;
    // Winner = higher XP. Tie → A.
    let winnerId = resA.id;
    let loserId = resB.id;
    let winnerData = liveA;
    let loserData = liveB;
    let winnerOwned = resA.owned;
    let loserOwned = resB.owned;
    if (xpB > xpA) {
        winnerId = resB.id;
        loserId = resA.id;
        winnerData = liveB;
        loserData = liveA;
        winnerOwned = resB.owned;
        loserOwned = resA.owned;
    }
    if (winnerId === loserId) {
        await assertGenuineOwnerForBind(db, authUid, winnerId, winnerData);
        await (0, auth_identity_1.linkStableAuthUid)(db, winnerId, authUid);
        return { canonicalStableId: winnerId, mergedFromStableId: null, alreadyMerged: true };
    }
    // The surviving account MUST be GENUINELY owned by the caller — by a trustworthy
    // signal (firebaseAuthUid / provider link / auth_links), NOT merely "ownable" via
    // the anonymous-reinstall relink escape, which trusts a stable_id that is publicly
    // readable as a leaderboard document id. A leaked stable_id must never let an
    // attacker seize a stranger's account (#11 / #12). A fresh anon_merge_claim proves
    // a device held an anonymous LOSER but can NEVER make an account the survivor
    // (guarded by the "never overwrite an owned account" test). winnerOwned above came
    // from the permissive probe and is intentionally no longer trusted here.
    await assertGenuineOwnerForBind(db, authUid, winnerId, winnerData);
    // The loser, if not owned, is only absorbable with a fresh self-stamped anon
    // claim whose authUid matches the loser doc's own firebaseAuthUid (the anon uid
    // that held it). No claim / stale / mismatched → reject.
    if (!loserOwned) {
        const claim = (0, auth_identity_1.readAnonMergeClaim)(loserData, now);
        const loserAuthUid = cleanStr(loserData.firebaseAuthUid);
        if (!claim || !loserAuthUid || claim.authUid !== loserAuthUid) {
            throw new https_1.HttpsError('permission-denied', 'stable_id_mismatch');
        }
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
            // Consume any claim on the survivor so it can't be replayed.
            anon_merge_claim: admin.firestore.FieldValue.delete(),
        };
        if (mergedShards !== undefined) {
            update.shards = mergedShards;
            update.shards_updated_at_ms = now;
            update.shards_updated_op = 'replace';
            update.shards_updated_reason = 'account_merge';
        }
        tx.set(winnerRef, update, { merge: true });
        tx.set(loserRef, {
            identityHidden: true,
            canonicalStableId: winnerId,
            duplicateOfStableId: winnerId,
            identityMergedAt: now,
            updatedAt: now,
            anon_merge_claim: admin.firestore.FieldValue.delete(),
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
    // Re-point referral data (attributions as referee/referrer + owned code) from loser to
    // winner — иначе приглашённые друзья и незабранные награды «терялись» после входа на
    // новом телефоне. Best-effort: сбой не валит merge (как и cleanup выше).
    await repointReferralOnMerge(db, winnerId, loserId).catch((e) => {
        console.warn(JSON.stringify({
            event: 'account_merge_referral_repoint_failed',
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
const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
const REFERRAL_CODES = 'referral_codes';
const REFERRAL_OWNERS = 'referral_owners';
/**
 * Переносит реферальные данные с loser-аккаунта на winner после merge.
 * Документы attribution заведены по REFEREE id (doc id) и хранят REFERRER id в поле.
 * Переносим обе роли + владение кодом. Идемпотентно, защищено от self-referral и
 * двойной выдачи (статус/refereeRewardedAtMs не пересчитываем). Best-effort, без транзакции
 * на весь объём (могут быть сотни строк) — каждый кусок атомарен сам по себе.
 */
async function repointReferralOnMerge(db, winnerId, loserId) {
    if (!winnerId || !loserId || winnerId === loserId)
        return;
    // (1) Роль REFEREE: referral_attributions/{loserId} → /{winnerId} (rename = copy+delete).
    const loserAttrRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(loserId);
    const loserAttrSnap = await loserAttrRef.get();
    if (loserAttrSnap.exists) {
        const loserAttr = loserAttrSnap.data();
        // Self-referral после слияния (winner пригласил loser или наоборот) — такая запись бессмысленна.
        if (String(loserAttr?.referrerStableId ?? '') === winnerId) {
            await loserAttrRef.delete().catch(() => { });
        }
        else {
            const winnerAttrRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(winnerId);
            const winnerAttrSnap = await winnerAttrRef.get();
            const survivor = chooseSurvivingAttribution(winnerAttrSnap.exists ? winnerAttrSnap.data() : undefined, loserAttr);
            await winnerAttrRef.set(survivor, { merge: true });
            await loserAttrRef.delete().catch(() => { });
        }
    }
    // (2) Роль REFERRER: все attribution, где referrerStableId == loserId → winnerId.
    // Доки, ставшие self-referral (referee doc id == winnerId), удаляем.
    const asReferrer = await db
        .collection(REFERRAL_ATTRIBUTIONS)
        .where('referrerStableId', '==', loserId)
        .limit(500)
        .get();
    for (const d of asReferrer.docs) {
        if (d.id === winnerId) {
            await d.ref.delete().catch(() => { });
        }
        else {
            await d.ref.set({ referrerStableId: winnerId }, { merge: true }).catch(() => { });
        }
    }
    // (3) Владение КОДОМ: referral_codes где ownerStableId == loserId → winnerId.
    const ownedCodes = await db
        .collection(REFERRAL_CODES)
        .where('ownerStableId', '==', loserId)
        .limit(50)
        .get();
    for (const d of ownedCodes.docs) {
        await d.ref.set({ ownerStableId: winnerId }, { merge: true }).catch(() => { });
    }
    // (4) referral_owners/{loserId}: если у winner ещё нет своего кода — переносим, иначе
    // лузерский owner-док убираем (его referral_codes уже перенаправлены на winner в (3)).
    const loserOwnerRef = db.collection(REFERRAL_OWNERS).doc(loserId);
    const loserOwnerSnap = await loserOwnerRef.get();
    if (loserOwnerSnap.exists) {
        const winnerOwnerRef = db.collection(REFERRAL_OWNERS).doc(winnerId);
        const winnerOwnerSnap = await winnerOwnerRef.get();
        if (!winnerOwnerSnap.exists) {
            const data = loserOwnerSnap.data();
            await winnerOwnerRef.set({ ...data, ownerStableId: winnerId }, { merge: true }).catch(() => { });
        }
        await loserOwnerRef.delete().catch(() => { });
    }
}
exports.authMergeStableAccounts = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    if (!request.app) {
        // App Check warm-up (H9): observe attestation token presence before enforcing.
        console.warn(JSON.stringify({
            event: 'app_check_header_shape',
            function: 'authMergeStableAccounts',
            header: (0, auth_identity_1.describeAppCheckHeader)(request.rawRequest.headers['x-firebase-appcheck']),
        }));
    }
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