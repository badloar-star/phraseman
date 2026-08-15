import * as admin from 'firebase-admin';
import { createHash, randomUUID } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import {
  ACCOUNT_DELETE_AUTH_MARKERS,
  ACCOUNT_DELETE_PERMANENT_DENIALS,
  ACCOUNT_DELETE_TOMBSTONES,
  accountDeletePermanentDenialId,
} from './account_delete_job';
import {
  cleanupLegacyAuthIdentityDuplicates,
  describeAppCheckHeader,
  readAnonMergeClaim,
} from './auth_identity';
import {
  aggregatePremiumLineages,
  chooseAuthoritativePremiumLineageState,
  MAX_OWNER_LINEAGES,
  type PremiumLineageState,
} from './revenuecat_premium_lineage';
import {
  buildLevelSpinMergePlan,
  type LevelSpinMergeDoc,
  type LevelSpinMergeSnapshot,
} from './level_spin_merge';

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
  'premium_rc_active_lineage',
  'premium_rc_reconcile_needed',
  'admin_premium_override',
  'premium_admin_grant_at',
] as const;

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
] as const;

const PREMIUM_AND_VIP_KEYS = new Set<string>([...PREMIUM_KEYS, ...VIP_KEYS, 'had_premium_ever']);

/**
 * Реферальные счётчики наград — вложенные map {период: число} в progress. Их НЕЛЬЗЯ
 * брать «целиком от победителя» (generic-логика так и делает для объектов) — иначе мерж
 * СБРАСЫВАЛ БЫ анти-фарм кап (лузерский счёт терялся). Суммируем по периодам.
 */
const REFERRAL_CLAIM_COUNTER_KEYS = ['referral_vip_claims_monthly', 'referral_vip_claims_daily'] as const;

type ProgressMap = Record<string, unknown>;

/** Парсит вложенный счётчик {период: число} из значения progress (объект или JSON-строка). */
function asClaimCounter(value: unknown): Record<string, number> {
  let obj: unknown = value;
  if (typeof value === 'string') {
    try { obj = JSON.parse(value); } catch { return {}; }
  }
  if (!obj || typeof obj !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
  }
  return out;
}

/** Сумма двух реферальных счётчиков по периодам (объединение ключей, сложение значений). */
function mergeClaimCounters(a: unknown, b: unknown): Record<string, number> | undefined {
  const ca = asClaimCounter(a);
  const cb = asClaimCounter(b);
  const keys = new Set([...Object.keys(ca), ...Object.keys(cb)]);
  if (keys.size === 0) return undefined;
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = (ca[k] ?? 0) + (cb[k] ?? 0);
  return out;
}

/**
 * Выбирает, какой referee-attribution оставить при коллизии на merge (у winner уже есть свой).
 * Порядок «дальше прошёл»: rewarded > qualified/skipped > pending. Ничья → существующий (a).
 * Это НЕ выдаёт награду повторно (refereeRewardedAtMs/статус сохраняются) и НЕ теряет её.
 * Экспортируется для тестов.
 */
export function chooseSurvivingAttribution<T extends { status?: string }>(
  a: T | undefined,
  b: T | undefined,
): T {
  if (!a) return b as T;
  if (!b) return a;
  const rank = (s: string | undefined): number => {
    if (s === 'rewarded' || s === 'revoked') return 3;
    if (s === 'qualified' || s === 'skipped_referrer_cap') return 2;
    if (s === 'pending') return 1;
    return 0;
  };
  return rank(b.status) > rank(a.status) ? b : a;
}

function cleanStr(value: unknown): string {
  return String(value ?? '').trim();
}

function parseMs(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'object') {
    const record = value as { toMillis?: () => number; seconds?: number };
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
function asCleanInt(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Strictly integer (optionally negative). Avoids "1.5", "12abc", "true", "[...]".
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function isTruthyFlag(value: unknown): boolean {
  const v = cleanStr(value).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isFalsyFlag(value: unknown): boolean {
  const v = cleanStr(value).toLowerCase();
  return v === 'false' || v === '0' || v === 'no';
}

function hasMeaningfulPlan(plan: string): boolean {
  return plan !== '' && plan !== 'null' && plan !== 'undefined';
}

function isStorePremiumPlan(plan: string): boolean {
  return plan === 'monthly' || plan === 'yearly' || plan === 'annual' || plan === 'lifetime';
}

// ── Premium/VIP "strength" scoring (mirrors app/premium_progress.ts semantics) ──

type PremiumStrength = { active: boolean; expiryMs: number; hasShape: boolean };

function realPremiumStrength(progress: ProgressMap, now: number): PremiumStrength {
  const plan = cleanStr(progress.premium_plan).toLowerCase();
  const override = cleanStr(progress.admin_premium_override).toLowerCase();
  const expiryMs = parseMs(progress.premium_expiry);
  if (!hasMeaningfulPlan(plan)) return { active: false, expiryMs: 0, hasShape: override === 'false' };
  if (override === 'true' || plan === 'admin_grant' || !isStorePremiumPlan(plan)) {
    // Not "real" store premium (это VIP-территория) — для premium-блока неактивно.
    return { active: false, expiryMs, hasShape: true };
  }
  const active = expiryMs <= 0 || expiryMs > now;
  // expiryMs<=0 (бессрочная подписка) — самый «сильный»: сортируем как +∞.
  return { active, expiryMs: expiryMs <= 0 ? Number.MAX_SAFE_INTEGER : expiryMs, hasShape: true };
}

function vipStrength(progress: ProgressMap, now: number): PremiumStrength {
  const planRaw = cleanStr(progress.vip_plan).toLowerCase();
  const overrideRaw = cleanStr(progress.vip_admin_override);
  const activeFlag = isTruthyFlag(progress.vip_active);
  const revoked = isFalsyFlag(progress.vip_admin_override) || isFalsyFlag(progress.vip_active);
  const fromMs = parseMs(progress.vip_from);
  const untilMs = parseMs(progress.vip_until ?? progress.vip_expiry);
  const grantAt = cleanStr(progress.vip_admin_grant_at ?? progress.vip_grant_at);
  const hasShape =
    hasMeaningfulPlan(planRaw) || activeFlag || revoked || fromMs > 0 || untilMs > 0 || !!grantAt;
  if (!hasShape) return { active: false, expiryMs: 0, hasShape: false };
  const plan = hasMeaningfulPlan(planRaw) ? planRaw : 'admin_vip';
  const windowStarted = fromMs <= 0 || fromMs <= now;
  const windowOpen = untilMs <= 0 || untilMs > now;
  const active =
    !revoked && (activeFlag || isTruthyFlag(overrideRaw) || hasMeaningfulPlan(plan)) && windowStarted && windowOpen;
  return { active, expiryMs: untilMs <= 0 ? Number.MAX_SAFE_INTEGER : untilMs, hasShape: true };
}

/**
 * Chooses which side "wins" an entitlement block:
 *  1. active beats inactive,
 *  2. among same activeness, furthest expiry wins,
 *  3. a side with any shape beats a side with none.
 * Ties → prefer A (the declared winner-by-XP). Returns 'a' | 'b'.
 */
function chooseEntitlementSide(a: PremiumStrength, b: PremiumStrength): 'a' | 'b' {
  if (a.active !== b.active) return a.active ? 'a' : 'b';
  if (a.expiryMs !== b.expiryMs) return a.expiryMs > b.expiryMs ? 'a' : 'b';
  if (a.hasShape !== b.hasShape) return a.hasShape ? 'a' : 'b';
  return 'a';
}

function copyKeys(from: ProgressMap, keys: readonly string[], into: ProgressMap): void {
  for (const k of keys) {
    if (from[k] !== undefined) into[k] = from[k];
  }
}

/**
 * Best-of-field merge of two progress maps.
 * @param winner the canonical side (higher XP) — wins ties / opaque-string conflicts
 * @param loser  the side being merged in
 * @returns a NEW merged progress map (immutable — neither input mutated)
 */
export function mergeUserProgress(
  winner: ProgressMap | undefined,
  loser: ProgressMap | undefined,
  now: number = Date.now(),
): ProgressMap {
  const w: ProgressMap = winner ? { ...winner } : {};
  const l: ProgressMap = loser ? { ...loser } : {};
  const out: ProgressMap = { ...l, ...w }; // start: winner overrides loser for shared keys

  const allKeys = new Set<string>([...Object.keys(w), ...Object.keys(l)]);

  for (const key of allKeys) {
    if (PREMIUM_AND_VIP_KEYS.has(key)) continue; // handled as whole blocks below
    if ((REFERRAL_CLAIM_COUNTER_KEYS as readonly string[]).includes(key)) continue; // summed below

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
  for (const k of PREMIUM_KEYS) delete out[k];
  const premiumSide = chooseEntitlementSide(realPremiumStrength(w, now), realPremiumStrength(l, now));
  copyKeys(premiumSide === 'a' ? w : l, PREMIUM_KEYS, out);

  // ── VIP block: same. ────────────────────────────────────────────────────────
  for (const k of VIP_KEYS) delete out[k];
  const vipSide = chooseEntitlementSide(vipStrength(w, now), vipStrength(l, now));
  copyKeys(vipSide === 'a' ? w : l, VIP_KEYS, out);

  // ── had_premium_ever: sticky true if EITHER ever had it. ─────────────────────
  if (isTruthyFlag(w.had_premium_ever) || isTruthyFlag(l.had_premium_ever)) {
    out.had_premium_ever = 'true';
  } else if (w.had_premium_ever !== undefined) {
    out.had_premium_ever = w.had_premium_ever;
  } else if (l.had_premium_ever !== undefined) {
    out.had_premium_ever = l.had_premium_ever;
  }

  // ── Реферальные счётчики наград: СУММИРУЕМ по периодам (не сбрасываем кап мержем). ──
  for (const key of REFERRAL_CLAIM_COUNTER_KEYS) {
    const merged = mergeClaimCounters(w[key], l[key]);
    if (merged) out[key] = merged;
    else delete out[key];
  }

  return out;
}

/** Forensic helper for legacy tests/read-only migrations. Never used to mutate economy. */
export function mergeShards(winner: unknown, loser: unknown): number | undefined {
  const wn = asCleanInt(winner);
  const ln = asCleanInt(loser);
  if (wn === null && ln === null) return undefined;
  return Math.max(wn ?? 0, ln ?? 0);
}

type MergeResult = {
  canonicalStableId: string;
  mergedFromStableId: string | null;
  alreadyMerged: boolean;
};

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
function userDataOwnedByAuth(data: Record<string, unknown>, authUid: string): boolean {
  if (cleanStr((data as { firebaseAuthUid?: unknown }).firebaseAuthUid) === authUid) return true;
  const linkedAuth = (data as { linkedAuth?: unknown }).linkedAuth;
  if (linkedAuth && typeof linkedAuth === 'object') {
    const providerUid = cleanStr((linkedAuth as { providerUid?: unknown }).providerUid);
    if (providerUid && providerUid === authUid) return true;
  }
  return false;
}

type TransactionResolvedIdentity = {
  stableId: string;
  data: Record<string, unknown>;
  ref: admin.firestore.DocumentReference;
};

type TransactionMergeOutcome = MergeResult & {
  xpA: number;
  xpB: number;
};

const MAX_MERGE_CANONICAL_HOPS = 8;
const MAX_MERGE_PREMIUM_LINEAGES = 64;
const ACCOUNT_IDENTITY_OWNER_MAP = 'account_identity_owner_map';
const ACCOUNT_MERGE_OUTBOX = 'account_merge_outbox';

function premiumLineageDocId(uid: string, lineageHash: string): string {
  const ownerHash = createHash('sha256').update(uid).digest('hex').slice(0, 32);
  return `lin_${ownerHash}_${lineageHash}`;
}

function revenueCatProjectionStrength(progress: ProgressMap): number {
  const plan = cleanStr(progress.premium_plan).toLowerCase();
  if (plan === 'lifetime') return Number.MAX_SAFE_INTEGER;
  if (!isStorePremiumPlan(plan)) return 0;
  const expiryMs = Math.max(parseMs(progress.premium_expiry), parseMs(progress.premium_rc_expiry_ms));
  return expiryMs > 0 ? expiryMs : Number.MAX_SAFE_INTEGER;
}

function accountMergeOutboxId(winnerStableId: string, loserStableId: string): string {
  return `merge_${createHash('sha256').update(`${winnerStableId}\0${loserStableId}`).digest('hex')}`;
}

async function mergeStableAccountsTransactionally(
  db: admin.firestore.Firestore,
  authUid: string,
  rawA: string,
  rawB: string,
  now: number,
): Promise<MergeResult> {
  const authLinkRef = db.collection(AUTH_LINKS_COL).doc(authUid);
  const authMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
  let transactionAttempt = 0;

  const outcome = await db.runTransaction(async (tx): Promise<TransactionMergeOutcome> => {
    transactionAttempt += 1;
    if (transactionAttempt > 1) {
      throw new HttpsError('failed-precondition', 'stable_identity_changed');
    }

    const userCache = new Map<string, Promise<TransactionResolvedIdentity>>();
    const readStable = (stableId: string): Promise<TransactionResolvedIdentity> => {
      const cached = userCache.get(stableId);
      if (cached) return cached;
      const pending = (async () => {
        const ref = db.collection(USERS).doc(stableId);
        const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableId);
        const [userSnap, tombstoneSnap] = await Promise.all([
          tx.get(ref),
          tx.get(tombstoneRef),
        ]);
        if (tombstoneSnap.exists) {
          throw new HttpsError('failed-precondition', 'account_delete_pending');
        }
        if (!userSnap.exists) {
          throw new HttpsError('failed-precondition', 'stable_id_missing');
        }
        return {
          stableId,
          data: (userSnap.data() ?? {}) as Record<string, unknown>,
          ref,
        };
      })();
      userCache.set(stableId, pending);
      return pending;
    };

    const resolveCanonical = async (startStableId: string): Promise<TransactionResolvedIdentity> => {
      let currentStableId = startStableId;
      const visited = new Set<string>();
      for (let hop = 0; hop < MAX_MERGE_CANONICAL_HOPS; hop += 1) {
        if (visited.has(currentStableId)) {
          throw new HttpsError('failed-precondition', 'stable_identity_changed');
        }
        visited.add(currentStableId);
        const current = await readStable(currentStableId);
        const nextStableId = current.data.identityHidden === true
          ? cleanStr(current.data.canonicalStableId)
          : '';
        if (!nextStableId || nextStableId === currentStableId) return current;
        currentStableId = nextStableId;
      }
      throw new HttpsError('failed-precondition', 'stable_identity_changed');
    };

    const [authLinkSnap, authMarkerSnap] = await Promise.all([
      tx.get(authLinkRef),
      tx.get(authMarkerRef),
    ]);
    if (authMarkerSnap.exists) {
      throw new HttpsError('failed-precondition', 'account_delete_pending');
    }

    const [resolvedA, resolvedB] = await Promise.all([
      resolveCanonical(rawA),
      resolveCanonical(rawB),
    ]);

    const linkedStableId = cleanStr(authLinkSnap.data()?.stable_id);
    if (authLinkSnap.exists) {
      if (!linkedStableId) {
        throw new HttpsError('permission-denied', 'stable_id_mismatch');
      }
      const linkedIdentity = await resolveCanonical(linkedStableId);
      if (!userDataOwnedByAuth(linkedIdentity.data, authUid)) {
        throw new HttpsError('permission-denied', 'stable_id_mismatch');
      }
      return {
        canonicalStableId: linkedIdentity.stableId,
        mergedFromStableId: null,
        alreadyMerged: true,
        xpA: asCleanInt((resolvedA.data.progress as ProgressMap | undefined)?.user_total_xp) ?? 0,
        xpB: asCleanInt((resolvedB.data.progress as ProgressMap | undefined)?.user_total_xp) ?? 0,
      };
    }

    if (resolvedA.stableId === resolvedB.stableId) {
      if (!userDataOwnedByAuth(resolvedA.data, authUid)) {
        throw new HttpsError('permission-denied', 'stable_id_mismatch');
      }
      const xp = asCleanInt((resolvedA.data.progress as ProgressMap | undefined)?.user_total_xp) ?? 0;
      return {
        canonicalStableId: resolvedA.stableId,
        mergedFromStableId: null,
        alreadyMerged: true,
        xpA: xp,
        xpB: xp,
      };
    }

    const xpA = asCleanInt((resolvedA.data.progress as ProgressMap | undefined)?.user_total_xp) ?? 0;
    const xpB = asCleanInt((resolvedB.data.progress as ProgressMap | undefined)?.user_total_xp) ?? 0;
    const bWins = xpB > xpA;
    const winner = bWins ? resolvedB : resolvedA;
    const loser = bWins ? resolvedA : resolvedB;
    if (winner.data.levelSpinMergePending === true || loser.data.levelSpinMergePending === true) {
      throw new HttpsError('failed-precondition', 'level_spin_merge_already_pending');
    }
    if (!userDataOwnedByAuth(winner.data, authUid)) {
      throw new HttpsError('permission-denied', 'stable_id_mismatch');
    }
    if (!userDataOwnedByAuth(loser.data, authUid)) {
      const claim = readAnonMergeClaim(loser.data, now);
      const loserAuthUid = cleanStr(loser.data.firebaseAuthUid);
      if (!claim || !loserAuthUid || claim.authUid !== loserAuthUid) {
        throw new HttpsError('permission-denied', 'stable_id_mismatch');
      }
    }

    const loserLineageQuery = db.collection('revenuecat_premium_lineages')
      .where('ownerUid', '==', loser.stableId)
      .limit(MAX_MERGE_PREMIUM_LINEAGES + 1);
    const winnerLineageQuery = db.collection('revenuecat_premium_lineages')
      .where('ownerUid', '==', winner.stableId)
      .limit(MAX_MERGE_PREMIUM_LINEAGES + 1);
    const [loserLineages, winnerLineages] = await Promise.all([
      tx.get(loserLineageQuery),
      tx.get(winnerLineageQuery),
    ]);
    if (loserLineages.docs.length > MAX_MERGE_PREMIUM_LINEAGES
      || winnerLineages.docs.length > MAX_MERGE_PREMIUM_LINEAGES) {
      throw new HttpsError('resource-exhausted', 'premium_lineage_limit');
    }

    const canonicalLineages = new Map<string, {
      targetRef: FirebaseFirestore.DocumentReference;
      state: PremiumLineageState;
      obsoleteRefs: FirebaseFirestore.DocumentReference[];
    }>();
    for (const lineage of [...winnerLineages.docs, ...loserLineages.docs]) {
      const state = lineage.data() as PremiumLineageState;
      const targetRef = db.collection('revenuecat_premium_lineages')
        .doc(premiumLineageDocId(winner.stableId, state.lineageHash));
      const existing = canonicalLineages.get(state.lineageHash);
      canonicalLineages.set(state.lineageHash, {
        targetRef,
        state: existing
          ? chooseAuthoritativePremiumLineageState(existing.state, state)
          : state,
        obsoleteRefs: [
          ...(existing?.obsoleteRefs ?? []),
          ...(lineage.ref.path === targetRef.path ? [] : [lineage.ref]),
        ],
      });
    }
    if (canonicalLineages.size > MAX_MERGE_PREMIUM_LINEAGES) {
      throw new HttpsError('resource-exhausted', 'premium_lineage_limit');
    }

    const mergedProgress = mergeUserProgress(
      winner.data.progress as ProgressMap | undefined,
      loser.data.progress as ProgressMap | undefined,
      now,
    );
    const canonicalAggregate = canonicalLineages.size > 0
      ? aggregatePremiumLineages(
        [...canonicalLineages.values()].map(({ state }) => state),
        mergedProgress,
        now,
      )
      : null;
    const mergedHasStrictLegacySentinel = isStorePremiumPlan(cleanStr(mergedProgress.premium_plan).toLowerCase())
      && !cleanStr(mergedProgress.premium_rc_active_lineage);
    const reconciledMergedProgress = canonicalAggregate
      && !(mergedHasStrictLegacySentinel
        && revenueCatProjectionStrength(mergedProgress) >= revenueCatProjectionStrength(canonicalAggregate.progressPatch))
      ? canonicalAggregate.progressPatch
      : mergedProgress;
    const winnerUpdate: Record<string, unknown> = {
      progress: reconciledMergedProgress,
      levelSpinMergePending: true,
      firebaseAuthUid: authUid,
      updatedAt: now,
      identityMergedAt: now,
      anon_merge_claim: admin.firestore.FieldValue.delete(),
    };
    for (const lineage of canonicalLineages.values()) {
      tx.set(lineage.targetRef, { ...lineage.state, ownerUid: winner.stableId, updatedAt: now }, { merge: false });
      for (const obsoleteRef of lineage.obsoleteRefs) tx.delete(obsoleteRef);
    }
    tx.set(winner.ref, winnerUpdate, { merge: true });
    const loserUpdate: Record<string, unknown> = {
      levelSpinMergePending: true,
      identityHidden: true,
      canonicalStableId: winner.stableId,
      duplicateOfStableId: winner.stableId,
      identityMergedAt: now,
      updatedAt: now,
      anon_merge_claim: admin.firestore.FieldValue.delete(),
    };
    for (const key of PREMIUM_KEYS) loserUpdate[`progress.${key}`] = admin.firestore.FieldValue.delete();
    tx.update(loser.ref, loserUpdate);
    tx.set(db.collection(ACCOUNT_IDENTITY_OWNER_MAP).doc(loser.stableId), {
      canonicalStableId: winner.stableId,
      loserStableId: loser.stableId,
      updatedAt: now,
    }, { merge: true });
    tx.set(db.collection(ACCOUNT_MERGE_OUTBOX).doc(accountMergeOutboxId(winner.stableId, loser.stableId)), {
      winnerStableId: winner.stableId,
      loserStableId: loser.stableId,
      status: 'pending',
      tasks: ['historical_revenuecat_receipts', 'derived_identity_cleanup', 'level_spins'],
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    tx.set(authLinkRef, { stable_id: winner.stableId, updatedAt: now }, { merge: true });
    return {
      canonicalStableId: winner.stableId,
      mergedFromStableId: loser.stableId,
      alreadyMerged: false,
      xpA,
      xpB,
    };
  });

  if (outcome.alreadyMerged || !outcome.mergedFromStableId) {
    return {
      canonicalStableId: outcome.canonicalStableId,
      mergedFromStableId: null,
      alreadyMerged: true,
    };
  }

  const winnerId = outcome.canonicalStableId;
  const loserId = outcome.mergedFromStableId;
  await cleanupLegacyAuthIdentityDuplicates(db, winnerId, authUid, {
    reason: 'account_merge',
  }).catch((error) => {
    console.warn(JSON.stringify({
      event: 'account_merge_cleanup_failed',
      winnerId,
      loserId,
      message: String((error as { message?: unknown })?.message ?? error).slice(0, 160),
    }));
  });
  await repointReferralOnMerge(db, winnerId, loserId).catch((error) => {
    console.warn(JSON.stringify({
      event: 'account_merge_referral_repoint_failed',
      winnerId,
      loserId,
      message: String((error as { message?: unknown })?.message ?? error).slice(0, 160),
    }));
  });
  console.log(JSON.stringify({
    event: 'account_merged',
    winner: winnerId.slice(0, 8),
    loser: loserId.slice(0, 8),
    xpWinner: Math.max(outcome.xpA, outcome.xpB),
    xpLoser: Math.min(outcome.xpA, outcome.xpB),
  }));
  return {
    canonicalStableId: winnerId,
    mergedFromStableId: loserId,
    alreadyMerged: false,
  };
}

export async function mergeStableAccounts(
  db: admin.firestore.Firestore,
  authUid: string,
  stableIdA: string,
  stableIdB: string,
  now: number = Date.now(),
): Promise<MergeResult> {
  const a = cleanStr(stableIdA);
  const b = cleanStr(stableIdB);
  if (!a || !b) throw new HttpsError('invalid-argument', 'stable_ids_required');
  return mergeStableAccountsTransactionally(db, authUid, a, b, now);
}

const ACCOUNT_MERGE_LEASE_MS = 5 * 60_000;
const ACCOUNT_MERGE_RECEIPT_PAGE_SIZE = 100;

const ACCOUNT_MERGE_RECEIPT_FIELDS: Array<{
  collection: string;
  field: string;
  array?: boolean;
}> = [
  { collection: 'revenuecat_premium_events', field: 'uid' },
  { collection: 'revenuecat_premium_events', field: 'recipientId' },
  { collection: 'revenuecat_premium_events', field: 'candidates', array: true },
  { collection: 'revenuecat_premium_events', field: 'donorIds', array: true },
  { collection: 'revenuecat_premium_events', field: 'transferredFrom', array: true },
  { collection: 'revenuecat_premium_events', field: 'transferredTo', array: true },
  { collection: 'revenuecat_premium_denials', field: 'ownerUid' },
  { collection: 'revenuecat_premium_denials', field: 'candidates', array: true },
  { collection: 'revenuecat_shard_transactions', field: 'uid' },
  { collection: 'revenuecat_shard_transactions', field: 'candidates', array: true },
  { collection: 'revenuecat_shard_refunds', field: 'uid' },
  { collection: 'revenuecat_shard_refunds', field: 'sourceUid' },
];

const LEVEL_SPIN_MERGE_COLLECTIONS = ['level_spin_credits', 'level_spin_results', 'level_up_bonus_claims'] as const;
type LevelSpinMergeCollection = typeof LEVEL_SPIN_MERGE_COLLECTIONS[number];

function levelSpinMergeCollection(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  name: LevelSpinMergeCollection,
) {
  return db.collection(`users/${stableUid}/${name}`);
}

function legacyBonusClaimDoc(
  data: FirebaseFirestore.DocumentData | undefined,
  level: number,
): LevelSpinMergeDoc | null {
  if (!data) return null;
  const payload = data.payload && typeof data.payload === 'object'
    ? data.payload as Record<string, unknown>
    : {};
  const result = data.result && typeof data.result === 'object'
    ? data.result as Record<string, unknown>
    : {};
  if (data.eventId !== `level_up:${level}:bonus`
    || data.type !== 'level_up_bonus'
    || Number(payload.level) !== level
    || Number(payload.xpDelta ?? payload.amount ?? payload.baseXp) !== 100
    || Number(result.xpDelta) !== 100) {
    throw new Error('level_up_bonus_legacy_ledger_corrupt');
  }
  return {
    id: `level_bonus_v1_${String(level).padStart(3, '0')}`,
    data: {
      level,
      eventId: `level_up:${level}:bonus`,
      amount: 100,
      grandfatheredLegacyLedger: true,
    },
  };
}

async function migrateLevelSpinAccountMerge(
  db: FirebaseFirestore.Firestore,
  winner: string,
  loser: string,
  outboxRef: FirebaseFirestore.DocumentReference,
  leaseToken: string,
  now: number,
): Promise<number> {
  const listedGroups = await Promise.all(
    [winner, loser].flatMap((owner) => LEVEL_SPIN_MERGE_COLLECTIONS.map(async (kind) => {
      const snapshot = await levelSpinMergeCollection(db, owner, kind).limit(60).get();
      if (snapshot.size >= 60) throw new Error(`account_merge_spin_${kind}_overflow`);
      return { owner, kind, docs: snapshot.docs };
    })),
  );
  const listed = listedGroups.flatMap((group) => group.docs.map((doc) => ({
    owner: group.owner,
    kind: group.kind,
    ref: doc.ref,
  })));
  const legacy = [winner, loser].flatMap((owner) => Array.from({ length: 59 }, (_, offset) => {
    const level = offset + 2;
    return {
      owner,
      level,
      ref: db.collection(`users/${owner}/progress_events`).doc(`level_up:${level}:bonus`),
    };
  }));
  const winnerRef = db.collection(USERS).doc(winner);
  const loserRef = db.collection(USERS).doc(loser);

  return db.runTransaction(async (tx) => {
    const [
      outboxSnap,
      winnerSnap,
      loserSnap,
      winnerTombstone,
      loserTombstone,
      winnerDenial,
      loserDenial,
      ...current
    ] = await Promise.all([
      tx.get(outboxRef),
      tx.get(winnerRef),
      tx.get(loserRef),
      tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(winner)),
      tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(loser)),
      tx.get(db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS).doc(accountDeletePermanentDenialId(winner))),
      tx.get(db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS).doc(accountDeletePermanentDenialId(loser))),
      ...listed.map((entry) => tx.get(entry.ref)),
      ...legacy.map((entry) => tx.get(entry.ref)),
    ]);
    if (!outboxSnap.exists || outboxSnap.data()?.leaseToken !== leaseToken) {
      throw new Error('account_merge_outbox_lease_lost');
    }
    if (winnerTombstone.exists || loserTombstone.exists || winnerDenial.exists || loserDenial.exists) {
      throw new Error('account_merge_spin_delete_pending');
    }
    const winnerData = winnerSnap.data() ?? {};
    const loserData = loserSnap.data() ?? {};
    if (!winnerSnap.exists
      || !loserSnap.exists
      || winnerData.levelSpinMergePending !== true
      || loserData.levelSpinMergePending !== true
      || loserData.identityHidden !== true
      || cleanStr(loserData.canonicalStableId) !== winner) {
      throw new Error('account_merge_spin_identity_changed');
    }

    const currentListed = current.slice(0, listed.length);
    const currentLegacy = current.slice(listed.length);
    const snapshotFor = (owner: string): LevelSpinMergeSnapshot => {
      const docs = (kind: LevelSpinMergeCollection): LevelSpinMergeDoc[] => listed.flatMap((entry, index) => (
        entry.owner === owner && entry.kind === kind && currentListed[index]?.exists
          ? [{ id: entry.ref.id, data: currentListed[index]!.data() ?? {} }]
          : []
      ));
      const bonusClaims = docs('level_up_bonus_claims');
      legacy.forEach((entry, index) => {
        if (entry.owner !== owner || !currentLegacy[index]?.exists) return;
        const grandfathered = legacyBonusClaimDoc(currentLegacy[index]!.data(), entry.level);
        if (grandfathered && !bonusClaims.some((claim) => claim.id === grandfathered.id)) {
          bonusClaims.push(grandfathered);
        }
      });
      const userData = owner === winner ? winnerData : loserData;
      return {
        stableUid: owner,
        state: userData.levelSpinServerState && typeof userData.levelSpinServerState === 'object'
          ? userData.levelSpinServerState as Record<string, unknown>
          : {},
        credits: docs('level_spin_credits'),
        results: docs('level_spin_results'),
        bonusClaims,
      };
    };

    const plan = buildLevelSpinMergePlan(snapshotFor(winner), snapshotFor(loser));
    for (const doc of plan.credits) {
      tx.set(levelSpinMergeCollection(db, winner, 'level_spin_credits').doc(doc.id), doc.data, { merge: false });
    }
    for (const doc of plan.results) {
      tx.set(levelSpinMergeCollection(db, winner, 'level_spin_results').doc(doc.id), doc.data, { merge: false });
    }
    for (const doc of plan.bonusClaims) {
      tx.set(levelSpinMergeCollection(db, winner, 'level_up_bonus_claims').doc(doc.id), doc.data, { merge: false });
    }
    listed.forEach((entry, index) => {
      if (entry.owner === loser && currentListed[index]?.exists) tx.delete(entry.ref);
    });
    tx.update(winnerRef, {
      levelSpinServerState: { ...plan.state, updatedAt: now },
      'progress.level_reward_spin_balance': String(plan.state.balance),
      levelSpinMergePending: false,
      updatedAt: now,
    });
    tx.update(loserRef, { levelSpinMergePending: false, updatedAt: now });
    return plan.credits.length + plan.results.length + plan.bonusClaims.length;
  });
}

export async function processAccountMergeOutboxJob(
  db: FirebaseFirestore.Firestore,
  outboxId: string,
  now = Date.now(),
): Promise<{ status: 'completed' | 'already_completed' | 'cancelled'; updated: number }> {
  const ref = db.collection(ACCOUNT_MERGE_OUTBOX).doc(outboxId);
  const leaseToken = randomUUID();
  const claim = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    if (data.status === 'completed') return {
      alreadyCompleted: true as const,
      winner: '',
      loser: '',
      tasks: [] as string[],
    };
    if (data.status === 'running' && Number(data.leaseUntilMs ?? 0) > now) {
      throw new Error('account_merge_outbox_lease_active');
    }
    const winner = cleanStr(data.winnerStableId);
    const loser = cleanStr(data.loserStableId);
    if (!winner || !loser || winner === loser) throw new Error('account_merge_outbox_invalid');
    const deletionGuards = await Promise.all([
      tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(winner)),
      tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(loser)),
      tx.get(db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS).doc(accountDeletePermanentDenialId(winner))),
      tx.get(db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS).doc(accountDeletePermanentDenialId(loser))),
    ]);
    if (deletionGuards.some((guard) => guard.exists)) {
      tx.set(ref, { status: 'cancelled_by_deletion', leaseUntilMs: 0, updatedAt: now }, { merge: true });
      return { cancelled: true as const, winner, loser, tasks: [] as string[] };
    }
    tx.set(ref, {
      status: 'running',
      leaseToken,
      leaseUntilMs: now + ACCOUNT_MERGE_LEASE_MS,
      attempts: Number(data.attempts ?? 0) + 1,
      updatedAt: now,
    }, { merge: true });
    return {
      winner,
      loser,
      tasks: Array.isArray(data.tasks)
        ? data.tasks.filter((task): task is string => typeof task === 'string')
        : [],
    };
  });
  if (!claim) return { status: 'already_completed', updated: 0 };
  if ('alreadyCompleted' in claim) return { status: 'already_completed', updated: 0 };
  if ('cancelled' in claim) return { status: 'cancelled', updated: 0 };

  let updated = 0;
  try {
    if (claim.tasks.includes('level_spins')) {
      updated += await migrateLevelSpinAccountMerge(
        db,
        claim.winner,
        claim.loser,
        ref,
        leaseToken,
        now,
      );
    }
    for (const spec of ACCOUNT_MERGE_RECEIPT_FIELDS) {
      for (;;) {
        const snapshot = await db.collection(spec.collection)
          .where(spec.field, spec.array ? 'array-contains' : '==', claim.loser)
          .limit(ACCOUNT_MERGE_RECEIPT_PAGE_SIZE)
          .get();
        if (snapshot.empty) break;
        const pageResult = await db.runTransaction(async (tx) => {
          const outboxSnap = await tx.get(ref);
          if (!outboxSnap.exists || outboxSnap.data()?.leaseToken !== leaseToken) {
            throw new Error('account_merge_outbox_lease_lost');
          }

          let canonicalWinner = claim.winner;
          const seenOwners = new Set<string>();
          for (let depth = 0; depth <= MAX_OWNER_LINEAGES; depth += 1) {
            if (seenOwners.has(canonicalWinner)) throw new Error('account_merge_owner_map_cycle');
            seenOwners.add(canonicalWinner);
            const ownerMap = await tx.get(db.collection(ACCOUNT_IDENTITY_OWNER_MAP).doc(canonicalWinner));
            const nextOwner = cleanStr(ownerMap.data()?.canonicalStableId);
            if (!ownerMap.exists || !nextOwner || nextOwner === canonicalWinner) break;
            if (depth === MAX_OWNER_LINEAGES) throw new Error('account_merge_owner_map_overflow');
            canonicalWinner = nextOwner;
          }

          const guardedIdentities = [...new Set([claim.loser, claim.winner, canonicalWinner])];
          const deletionGuards: FirebaseFirestore.DocumentSnapshot[] = [];
          for (const identity of guardedIdentities) {
            deletionGuards.push(await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(identity)));
            deletionGuards.push(await tx.get(
              db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS).doc(accountDeletePermanentDenialId(identity)),
            ));
          }
          const currentDocs: FirebaseFirestore.DocumentSnapshot[] = [];
          for (const doc of snapshot.docs) currentDocs.push(await tx.get(doc.ref));
          if (deletionGuards.some((guard) => guard.exists)) {
            tx.set(ref, {
              status: 'cancelled_by_deletion',
              leaseToken: admin.firestore.FieldValue.delete(),
              leaseUntilMs: 0,
              updatedAt: now,
            }, { merge: true });
            return { cancelled: true as const, changed: 0 };
          }

          let changed = 0;
          for (const currentDoc of currentDocs) {
            if (!currentDoc.exists) continue;
            const raw = currentDoc.data()?.[spec.field];
            const stillOwnedByLoser = spec.array
              ? Array.isArray(raw) && raw.some((value) => cleanStr(value) === claim.loser)
              : cleanStr(raw) === claim.loser;
            if (!stillOwnedByLoser) continue;
            const replacement = spec.array
              ? [...new Set((raw as unknown[]).map((value) => (
                cleanStr(value) === claim.loser ? canonicalWinner : cleanStr(value)
              )).filter(Boolean))]
              : canonicalWinner;
            tx.update(currentDoc.ref, {
              [spec.field]: replacement,
              canonicalOwnerUid: canonicalWinner,
              previousOwnerUidHash: createHash('sha256').update(claim.loser).digest('hex'),
              ownerRepointedAt: now,
            });
            changed += 1;
          }
          return { cancelled: false as const, changed };
        });
        if (pageResult.cancelled) return { status: 'cancelled', updated };
        updated += pageResult.changed;
        if (snapshot.size < ACCOUNT_MERGE_RECEIPT_PAGE_SIZE) break;
      }
    }

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.leaseToken !== leaseToken) {
        throw new Error('account_merge_outbox_lease_lost');
      }
      tx.set(ref, {
        status: 'completed',
        updatedDocs: updated,
        completedAt: now,
        leaseToken: admin.firestore.FieldValue.delete(),
        leaseUntilMs: 0,
        updatedAt: now,
      }, { merge: true });
    });
    return { status: 'completed', updated };
  } catch (error) {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.status !== 'running' || snap.data()?.leaseToken !== leaseToken) return;
      tx.set(ref, {
        status: 'pending',
        lastError: String((error as { message?: unknown })?.message ?? error).slice(0, 160),
        leaseToken: admin.firestore.FieldValue.delete(),
        leaseUntilMs: 0,
        updatedAt: Date.now(),
      }, { merge: true });
    }).catch(() => undefined);
    throw error;
  }
}

export const accountMergeOutboxWorker = onDocumentCreated({
  document: `${ACCOUNT_MERGE_OUTBOX}/{outboxId}`,
  region: 'us-central1',
  retry: true,
}, async (event) => {
  await processAccountMergeOutboxJob(admin.firestore(), event.params.outboxId);
});

export const accountMergeOutboxRetryCron = onSchedule({
  schedule: 'every 5 minutes',
  timeZone: 'UTC',
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 300,
}, async () => {
  const db = admin.firestore();
  const [pending, running] = await Promise.all([
    db.collection(ACCOUNT_MERGE_OUTBOX).where('status', '==', 'pending').limit(20).get(),
    db.collection(ACCOUNT_MERGE_OUTBOX).where('status', '==', 'running').limit(20).get(),
  ]);
  const now = Date.now();
  for (const doc of [...pending.docs, ...running.docs]) {
    if (doc.data()?.status === 'running' && Number(doc.data()?.leaseUntilMs ?? 0) > now) continue;
    await processAccountMergeOutboxJob(db, doc.id, now);
  }
});

const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
const REFERRAL_CODES = 'referral_codes';
const REFERRAL_OWNERS = 'referral_owners';

const REFERRAL_ATTRIBUTION_PAGE_SIZE = 500;
const REFERRAL_CODE_PAGE_SIZE = 50;
const REFERRAL_TRANSACTION_CONCURRENCY = 10;

export type ReferralRepointResult = {
  complete: boolean;
  attributionDocsRepointed: number;
  codeDocsRepointed: number;
  lastAttributionId: string | null;
  lastCodeId: string | null;
  stoppedReason?: 'account_delete_pending';
  stoppedPhase?: 'referee' | 'attributions' | 'codes' | 'owner';
};

type GuardedReferralMutation = 'changed' | 'skipped' | 'account_delete_pending';
type GuardedReferralChunk = {
  accountDeletePending: boolean;
  changedCount: number;
};

/**
 * Переносит реферальные данные с loser-аккаунта на winner после merge.
 * Каждая строка повторно читается в транзакции вместе с tombstone обоих аккаунтов:
 * stale query не может перезаписать новую награду/владельца, а удаление останавливает
 * проход с наблюдаемым incomplete-результатом. Страницы упорядочены по document id.
 */
export async function repointReferralOnMerge(
  db: admin.firestore.Firestore,
  winnerId: string,
  loserId: string,
): Promise<ReferralRepointResult> {
  const result: ReferralRepointResult = {
    complete: true,
    attributionDocsRepointed: 0,
    codeDocsRepointed: 0,
    lastAttributionId: null,
    lastCodeId: null,
  };
  if (!winnerId || !loserId || winnerId === loserId) return result;

  const winnerTombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(winnerId);
  const loserTombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(loserId);
  const incomplete = (
    phase: NonNullable<ReferralRepointResult['stoppedPhase']>,
  ): ReferralRepointResult => ({
    ...result,
    complete: false,
    stoppedReason: 'account_delete_pending',
    stoppedPhase: phase,
  });

  // (1) Роль REFEREE: referral_attributions/{loserId} → /{winnerId}.
  const loserAttrRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(loserId);
  const winnerAttrRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(winnerId);
  const refereeOutcome = await db.runTransaction(async (tx): Promise<GuardedReferralMutation> => {
    const [winnerTombstoneSnap, loserTombstoneSnap, loserAttrSnap, winnerAttrSnap] =
      await Promise.all([
        tx.get(winnerTombstoneRef),
        tx.get(loserTombstoneRef),
        tx.get(loserAttrRef),
        tx.get(winnerAttrRef),
      ]);
    if (winnerTombstoneSnap.exists || loserTombstoneSnap.exists) {
      return 'account_delete_pending';
    }
    if (!loserAttrSnap.exists) return 'skipped';
    const loserAttr = loserAttrSnap.data() as { referrerStableId?: string; status?: string };
    if (String(loserAttr.referrerStableId ?? '') === winnerId) {
      tx.delete(loserAttrRef);
    } else {
      const survivor = chooseSurvivingAttribution(
        winnerAttrSnap.exists ? (winnerAttrSnap.data() as { status?: string }) : undefined,
        loserAttr,
      );
      tx.set(winnerAttrRef, survivor as Record<string, unknown>, { merge: true });
      tx.delete(loserAttrRef);
    }
    return 'changed';
  });
  if (refereeOutcome === 'account_delete_pending') return incomplete('referee');

  // (2) Роль REFERRER: bounded, deterministic pages with per-row ownership checks.
  let attributionCursor: string | null = null;
  while (true) {
    let query: FirebaseFirestore.Query = db
      .collection(REFERRAL_ATTRIBUTIONS)
      .where('referrerStableId', '==', loserId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(REFERRAL_ATTRIBUTION_PAGE_SIZE);
    if (attributionCursor) query = query.startAfter(attributionCursor);
    const page = await query.get();
    for (let offset = 0; offset < page.docs.length; offset += REFERRAL_TRANSACTION_CONCURRENCY) {
      const chunk = page.docs.slice(offset, offset + REFERRAL_TRANSACTION_CONCURRENCY);
      const chunkResult = await db.runTransaction(async (tx): Promise<GuardedReferralChunk> => {
        const [winnerTombstoneSnap, loserTombstoneSnap, ...currentSnaps] =
          await Promise.all([
            tx.get(winnerTombstoneRef),
            tx.get(loserTombstoneRef),
            ...chunk.map((queried) => tx.get(queried.ref)),
          ]);
        if (winnerTombstoneSnap.exists || loserTombstoneSnap.exists) {
          return { accountDeletePending: true, changedCount: 0 };
        }
        let changedCount = 0;
        currentSnaps.forEach((currentSnap, index) => {
          if (
            !currentSnap.exists
            || cleanStr(currentSnap.data()?.referrerStableId) !== loserId
          ) {
            return;
          }
          const queried = chunk[index];
          if (queried.id === winnerId) tx.delete(queried.ref);
          else tx.set(queried.ref, { referrerStableId: winnerId }, { merge: true });
          changedCount += 1;
        });
        return { accountDeletePending: false, changedCount };
      });
      if (chunkResult.accountDeletePending) return incomplete('attributions');
      result.attributionDocsRepointed += chunkResult.changedCount;
      attributionCursor = chunk[chunk.length - 1].id;
      result.lastAttributionId = attributionCursor;
    }
    if (page.size < REFERRAL_ATTRIBUTION_PAGE_SIZE) break;
  }

  // (3) Владение кодами: same ordered paging and transactional revalidation.
  let codeCursor: string | null = null;
  while (true) {
    let query: FirebaseFirestore.Query = db
      .collection(REFERRAL_CODES)
      .where('ownerStableId', '==', loserId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(REFERRAL_CODE_PAGE_SIZE);
    if (codeCursor) query = query.startAfter(codeCursor);
    const page = await query.get();
    for (let offset = 0; offset < page.docs.length; offset += REFERRAL_TRANSACTION_CONCURRENCY) {
      const chunk = page.docs.slice(offset, offset + REFERRAL_TRANSACTION_CONCURRENCY);
      const chunkResult = await db.runTransaction(async (tx): Promise<GuardedReferralChunk> => {
        const [winnerTombstoneSnap, loserTombstoneSnap, ...currentSnaps] =
          await Promise.all([
            tx.get(winnerTombstoneRef),
            tx.get(loserTombstoneRef),
            ...chunk.map((queried) => tx.get(queried.ref)),
          ]);
        if (winnerTombstoneSnap.exists || loserTombstoneSnap.exists) {
          return { accountDeletePending: true, changedCount: 0 };
        }
        let changedCount = 0;
        currentSnaps.forEach((currentSnap, index) => {
          if (!currentSnap.exists || cleanStr(currentSnap.data()?.ownerStableId) !== loserId) {
            return;
          }
          tx.set(chunk[index].ref, { ownerStableId: winnerId }, { merge: true });
          changedCount += 1;
        });
        return { accountDeletePending: false, changedCount };
      });
      if (chunkResult.accountDeletePending) return incomplete('codes');
      result.codeDocsRepointed += chunkResult.changedCount;
      codeCursor = chunk[chunk.length - 1].id;
      result.lastCodeId = codeCursor;
    }
    if (page.size < REFERRAL_CODE_PAGE_SIZE) break;
  }

  // (4) Owner pointer: preserve a winner collision and retire only loser-owned data.
  const loserOwnerRef = db.collection(REFERRAL_OWNERS).doc(loserId);
  const winnerOwnerRef = db.collection(REFERRAL_OWNERS).doc(winnerId);
  const ownerOutcome = await db.runTransaction(async (tx): Promise<GuardedReferralMutation> => {
    const [winnerTombstoneSnap, loserTombstoneSnap, loserOwnerSnap, winnerOwnerSnap] =
      await Promise.all([
        tx.get(winnerTombstoneRef),
        tx.get(loserTombstoneRef),
        tx.get(loserOwnerRef),
        tx.get(winnerOwnerRef),
      ]);
    if (winnerTombstoneSnap.exists || loserTombstoneSnap.exists) {
      return 'account_delete_pending';
    }
    if (!loserOwnerSnap.exists) return 'skipped';
    const loserOwner = loserOwnerSnap.data() as Record<string, unknown>;
    const loserOwnerStableId = cleanStr(loserOwner.ownerStableId);
    if (loserOwnerStableId && loserOwnerStableId !== loserId) {
      throw new HttpsError('failed-precondition', 'referral_owner_changed');
    }
    if (winnerOwnerSnap.exists) {
      const winnerOwnerStableId = cleanStr(winnerOwnerSnap.data()?.ownerStableId);
      if (winnerOwnerStableId && winnerOwnerStableId !== winnerId) {
        throw new HttpsError('failed-precondition', 'referral_owner_changed');
      }
    } else {
      tx.set(winnerOwnerRef, { ...loserOwner, ownerStableId: winnerId }, { merge: true });
    }
    tx.delete(loserOwnerRef);
    return 'changed';
  });
  if (ownerOutcome === 'account_delete_pending') return incomplete('owner');
  return result;
}

export const authMergeStableAccounts = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  if (!request.app) {
    // App Check warm-up (H9): observe attestation token presence before enforcing.
    console.warn(JSON.stringify({
      event: 'app_check_header_shape',
      function: 'authMergeStableAccounts',
      header: describeAppCheckHeader(request.rawRequest.headers['x-firebase-appcheck']),
    }));
  }
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableIdA = cleanStr(request.data?.stableIdA);
  const stableIdB = cleanStr(request.data?.stableIdB);
  if (!stableIdA || !stableIdB) {
    throw new HttpsError('invalid-argument', 'stable_ids_required');
  }
  const result = await mergeStableAccounts(db, authUid, stableIdA, stableIdB);
  return { ok: true, ...result };
});
