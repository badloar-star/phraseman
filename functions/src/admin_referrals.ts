/**
 * Admin-callables для раздела «Рефералы» админки: список приглашений, статистика
 * и лог рулетки, запись весов в «Пульт», health-проверки работоспособности.
 *
 * Гейт: custom claim `admin` в auth token.
 * TODO(verify): в extract нет существующего admin-gate — сверить имя claim'а и
 * механизм выдачи с реальным проектом (возможно, там свой assertAdmin / allowlist
 * email'ов). Точка одна — функция assertAdmin ниже.
 *
 * Все функции read-mostly; adminSetSpinWeights — единственная пишущая (валидация
 * суммы 100 через validateSpinWeights из referral_spin_logic.ts — та же, что в тестах).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import {
  REFERRAL_SPIN_PRIZE_DAYS,
  referralSpinWeightsFromData,
  validateSpinWeights,
} from './referral_spin_logic';
import {
  legacyCreditExpiryMs,
  referralRoulettePolicyFromData,
  type ReferralRoulettePolicy,
} from './referral_roulette_policy';
import { isStorePremiumActive, parseProgressMs } from './premium_status';
import { referralDisplayNameFromUserData } from './referral';
import { REFERRAL_SPIN_LEDGER, referralCreditId } from './referral_spin_ledger';
import { summarizeReferralAdminDrain } from './referral_admin_drain_metrics';
import {
  referralSoftToggleReplayResult,
  resolveReferralSoftOffAtMs,
} from './referral_admin_soft_toggle';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

const USERS = 'users';
const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
const SPINS_SUBCOLLECTION = 'referral_spins';
const MAX_PAGE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_QUALIFIED_DAYS = 30;
/** Health-выборки ограничены сверху — дешёвые проверки, а не полный скан. */
const HEALTH_SAMPLE_USERS = 500;
const FIRESTORE_IN_BATCH = 30;
const FIRESTORE_GET_ALL_BATCH = 100;

type ReferralDashboardAttribution = Readonly<{
  id: string;
  referrerStableId?: string;
  refCode?: string;
  status?: string;
  qualifiedBy?: string;
  createdAt?: unknown;
  createdAtMs?: unknown;
  qualifiedAt?: unknown;
  qualifiedAtMs?: unknown;
}>;

export type ReferralDashboardSpinReceipt = Readonly<{
  creditId?: string;
  creditSource?: string;
  prizeDays?: number;
  prizeKind?: string;
  prizePearls?: number;
  createdAt?: unknown;
  createdAtMs?: unknown;
}>;

export type ReferralDashboardRow = Readonly<{
  referrerStableId: string;
  referrerName: string;
  refereeStableId: string;
  refereeName: string;
  refCode: string;
  createdAtMs: number;
  plusPurchased: boolean;
  purchasedAtMs: number;
  roulette:
    | Readonly<{ state: 'not_spun' }>
    | Readonly<{
      state: 'spun';
      prizeDays: number;
      prizeKind: 'days' | 'pearls';
      prizePearls: number;
      createdAtMs: number;
    }>;
}>;

export type ReferralDashboardCursor = Readonly<{
  seconds: number;
  nanoseconds: number;
  attributionId: string;
}>;

const FIRESTORE_TIMESTAMP_MIN_SECONDS = -62_135_596_800;
const FIRESTORE_TIMESTAMP_MAX_SECONDS = 253_402_300_799;

function validatedReferralDashboardCursor(
  raw: Readonly<{ seconds?: unknown; nanoseconds?: unknown; attributionId?: unknown }>,
): ReferralDashboardCursor | null {
  const seconds = raw.seconds;
  const nanoseconds = raw.nanoseconds;
  const attributionId = typeof raw.attributionId === 'string' ? raw.attributionId.trim() : '';
  if (typeof seconds !== 'number'
    || !Number.isSafeInteger(seconds)
    || seconds < FIRESTORE_TIMESTAMP_MIN_SECONDS
    || seconds > FIRESTORE_TIMESTAMP_MAX_SECONDS
    || typeof nanoseconds !== 'number'
    || !Number.isInteger(nanoseconds)
    || nanoseconds < 0
    || nanoseconds > 999_999_999
    || !attributionId
    || attributionId.includes('/')
    || Buffer.byteLength(attributionId, 'utf8') > 1_500) {
    return null;
  }
  return {
    seconds,
    nanoseconds,
    attributionId,
  };
}

export function referralDashboardCursorFromAttribution(
  attribution: Readonly<{ id: string; createdAt?: unknown }>,
): ReferralDashboardCursor | null {
  if (!attribution.createdAt || typeof attribution.createdAt !== 'object') return null;
  const createdAt = attribution.createdAt as { seconds?: unknown; nanoseconds?: unknown };
  return validatedReferralDashboardCursor({
    seconds: createdAt.seconds,
    nanoseconds: createdAt.nanoseconds,
    attributionId: attribution.id,
  });
}

function referralDashboardCursorFromData(raw: unknown): ReferralDashboardCursor | null {
  if (!raw || typeof raw !== 'object') return null;
  return validatedReferralDashboardCursor(
    raw as { seconds?: unknown; nanoseconds?: unknown; attributionId?: unknown },
  );
}

function dashboardDisplayName(value: unknown): string {
  const name = String(value ?? '').trim();
  return name || 'Без имени';
}

function spinReceiptFromData(data: ReferralDashboardSpinReceipt): ReferralDashboardSpinReceipt {
  return {
    creditId: String(data.creditId ?? ''),
    creditSource: String(data.creditSource ?? ''),
    prizeDays: Math.max(0, Math.floor(Number(data.prizeDays) || 0)),
    prizeKind: data.prizeKind === 'pearls' ? 'pearls' : 'days',
    prizePearls: Math.max(0, Math.floor(Number(data.prizePearls) || 0)),
    createdAtMs: tsToMs(data.createdAt) || tsToMs(data.createdAtMs),
  };
}

/**
 * Pure, read-only projection used by both the callable and its contract tests.
 * The purchase boolean deliberately comes only from server-owned store fields.
 */
export function projectReferralDashboardRow(input: Readonly<{
  attribution: ReferralDashboardAttribution;
  refereeProgress: Record<string, unknown> | null | undefined;
  displayNames: Readonly<Record<string, string | null | undefined>>;
  spinReceipts: readonly ReferralDashboardSpinReceipt[];
  nowMs: number;
}>): ReferralDashboardRow {
  const refereeStableId = String(input.attribution.id ?? '').trim();
  const referrerStableId = String(input.attribution.referrerStableId ?? '').trim();
  const plusPurchased = isStorePremiumActive(input.refereeProgress, input.nowMs);
  const expectedCreditId = referralCreditId(refereeStableId);
  const receipt = input.spinReceipts
    .filter((candidate) => (
      String(candidate.creditId ?? '') === expectedCreditId
      && String(candidate.creditSource ?? '') === 'referral'
    ))
    .map(spinReceiptFromData)
    .sort((a, b) => tsToMs(b.createdAtMs) - tsToMs(a.createdAtMs))[0];
  const prizeKind: 'days' | 'pearls' = receipt?.prizeKind === 'pearls' ? 'pearls' : 'days';

  return {
    referrerStableId,
    referrerName: dashboardDisplayName(input.displayNames[referrerStableId]),
    refereeStableId,
    refereeName: dashboardDisplayName(input.displayNames[refereeStableId]),
    refCode: String(input.attribution.refCode ?? '').trim(),
    createdAtMs: tsToMs(input.attribution.createdAt) || tsToMs(input.attribution.createdAtMs),
    plusPurchased,
    purchasedAtMs: plusPurchased
      ? parseProgressMs(input.refereeProgress?.premium_rc_purchased_at_ms)
        || tsToMs(input.attribution.qualifiedAt)
        || tsToMs(input.attribution.qualifiedAtMs)
      : 0,
    roulette: receipt
      ? {
        state: 'spun',
        prizeDays: Math.max(0, Math.floor(Number(receipt.prizeDays) || 0)),
        prizeKind,
        prizePearls: Math.max(0, Math.floor(Number(receipt.prizePearls) || 0)),
        createdAtMs: tsToMs(receipt.createdAtMs),
      }
      : { state: 'not_spun' },
  };
}

function chunked<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function getUsersById(
  db: FirebaseFirestore.Firestore,
  ids: readonly string[],
): Promise<Map<string, FirebaseFirestore.DocumentData>> {
  const uniqueIds = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  const result = new Map<string, FirebaseFirestore.DocumentData>();
  for (const batch of chunked(uniqueIds, FIRESTORE_GET_ALL_BATCH)) {
    // eslint-disable-next-line no-await-in-loop
    const snapshots = await db.getAll(...batch.map((id) => db.collection(USERS).doc(id)));
    for (const snapshot of snapshots) {
      if (snapshot.exists) result.set(snapshot.id, snapshot.data() ?? {});
    }
  }
  return result;
}

export function displayNameFromUser(data: FirebaseFirestore.DocumentData | undefined): string | null {
  return referralDisplayNameFromUserData(data);
}

function prizeAggregateKey(receipt: ReferralDashboardSpinReceipt): string {
  return receipt.prizeKind === 'pearls'
    ? `pearls:${Math.max(0, Math.floor(Number(receipt.prizePearls) || 0))}`
    : `days:${Math.max(0, Math.floor(Number(receipt.prizeDays) || 0))}`;
}

export function summarizeReferralDashboardPurchases(input: Readonly<{
  attributionIds: readonly string[];
  progressByRefereeId: ReadonlyMap<string, Record<string, unknown>>;
  nowMs: number;
}>): Readonly<{ totalInvited: number; plusPurchased: number }> {
  let plusPurchased = 0;
  for (const attributionId of input.attributionIds) {
    if (isStorePremiumActive(input.progressByRefereeId.get(attributionId), input.nowMs)) {
      plusPurchased += 1;
    }
  }
  return { totalInvited: input.attributionIds.length, plusPurchased };
}

/** TODO(verify): сверить с реальным admin-гейтом проекта. */
function assertAdmin(request: { auth?: { uid: string; token?: Record<string, unknown> } | null }): void {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  if (request.auth.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'ADMIN_REQUIRED');
  }
}

function adminRoleFromToken(token: Record<string, unknown> | undefined): AdminRole | null {
  const role = token?.adminRole;
  return hasAdminRole(role) ? role : null;
}

function clampLimit(raw: unknown, fallback: number): number {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(MAX_PAGE, n);
}

function tsToMs(v: unknown): number {
  if (v && typeof (v as { toMillis?: unknown }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

async function countOf(query: admin.firestore.Query): Promise<number> {
  const snap = await query.count().get();
  return Number(snap.data().count ?? 0);
}

// ── a) Список приглашений ─────────────────────────────────────────────────────

export const adminListReferrals = onCall(CALLABLE_BASE, async (request) => {
  assertAdmin(request);
  const status = String(request.data?.status ?? '').trim();
  const limit = clampLimit(request.data?.limit, 50);
  const cursorMs = tsToMs(request.data?.cursor);

  const db = admin.firestore();
  let query: admin.firestore.Query = db.collection(REFERRAL_ATTRIBUTIONS).orderBy('createdAt', 'desc');
  if (status === 'pending' || status === 'qualified' || status === 'rewarded' || status === 'skipped_referrer_cap') {
    query = db
      .collection(REFERRAL_ATTRIBUTIONS)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc');
  }
  if (cursorMs > 0) {
    query = query.startAfter(admin.firestore.Timestamp.fromMillis(cursorMs));
  }
  const snap = await query.limit(limit).get();

  // Имена referrer/referee одной пачкой (как в referralListMyInvites).
  const uids = new Set<string>();
  for (const d of snap.docs) {
    const row = d.data() as { referrerStableId?: string };
    uids.add(d.id);
    if (row.referrerStableId) uids.add(String(row.referrerStableId));
  }
  const uidList = [...uids].slice(0, 200);
  const userSnaps = uidList.length ? await db.getAll(...uidList.map((id) => db.collection(USERS).doc(id))) : [];
  const nameByUid = new Map<string, string>();
  for (const u of userSnaps) {
    const data = u.data() as { displayName?: string; name?: string } | undefined;
    const name = String(data?.displayName ?? data?.name ?? '').trim();
    if (name) nameByUid.set(u.id, name);
  }

  const rows = snap.docs.map((d) => {
    const row = d.data() as {
      status?: string;
      referrerStableId?: string;
      refCode?: string;
      createdAt?: unknown;
      qualifiedAt?: unknown;
      rewardKind?: string;
    };
    return {
      refereeStableId: d.id,
      refereeName: nameByUid.get(d.id) ?? null,
      referrerStableId: String(row.referrerStableId ?? ''),
      referrerName: row.referrerStableId ? (nameByUid.get(String(row.referrerStableId)) ?? null) : null,
      status: String(row.status ?? 'pending'),
      refCode: String(row.refCode ?? ''),
      rewardKind: String(row.rewardKind ?? ''),
      createdAtMs: tsToMs(row.createdAt),
      qualifiedAtMs: tsToMs(row.qualifiedAt),
    };
  });

  const counts = {
    total: await countOf(db.collection(REFERRAL_ATTRIBUTIONS)),
    pending: await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'pending')),
    qualified: await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'qualified')),
    rewarded: await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'rewarded')),
  };

  return {
    ok: true,
    rows,
    counts,
    nextCursor: rows.length === limit ? rows[rows.length - 1]?.createdAtMs ?? null : null,
  };
});

// ── a2) Read-only dashboard: покупка Plus + результат конкретного spin-credit ─

export const adminGetReferralDashboard = onCall(CALLABLE_BASE, async (request) => {
  assertAdmin(request);
  const limit = clampLimit(request.data?.limit, 100);
  const cursor = referralDashboardCursorFromData(request.data?.cursor);
  const nowMs = Date.now();
  const db = admin.firestore();

  let pageQuery: admin.firestore.Query = db
    .collection(REFERRAL_ATTRIBUTIONS)
    .orderBy('createdAt', 'desc')
    .orderBy(admin.firestore.FieldPath.documentId(), 'desc');
  if (cursor) {
    pageQuery = pageQuery.startAfter(
      new admin.firestore.Timestamp(cursor.seconds, cursor.nanoseconds),
      cursor.attributionId,
    );
  }

  const [pageSnap, allAttributionsSnap, allSpinsSnap] = await Promise.all([
    pageQuery.limit(limit).get(),
    db.collection(REFERRAL_ATTRIBUTIONS).select().get(),
    db.collectionGroup(SPINS_SUBCOLLECTION)
      .select('creditId', 'creditSource', 'prizeDays', 'prizeKind', 'prizePearls', 'createdAt', 'createdAtMs')
      .get(),
  ]);

  const pageAttributions: ReferralDashboardAttribution[] = pageSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ReferralDashboardAttribution, 'id'>),
  }));
  const allAttributionIds = allAttributionsSnap.docs.map((doc) => doc.id);
  const pageUserIds = pageAttributions.flatMap((row) => [
    row.id,
    String(row.referrerStableId ?? ''),
  ]);
  const [pageUsers, allRefereeUsers] = await Promise.all([
    getUsersById(db, pageUserIds),
    getUsersById(db, allAttributionIds),
  ]);

  const pageCreditIds = pageAttributions.map((row) => referralCreditId(row.id));
  const pageSpinReceipts: ReferralDashboardSpinReceipt[] = [];
  for (const creditIds of chunked(pageCreditIds, FIRESTORE_IN_BATCH)) {
    // eslint-disable-next-line no-await-in-loop
    const snap = await db.collectionGroup(SPINS_SUBCOLLECTION)
      .where('creditId', 'in', creditIds)
      .get();
    for (const doc of snap.docs) {
      pageSpinReceipts.push(doc.data() as ReferralDashboardSpinReceipt);
    }
  }

  const displayNames: Record<string, string | null> = {};
  for (const [id, data] of pageUsers.entries()) {
    displayNames[id] = displayNameFromUser(data);
  }
  const progressByUserId = new Map<string, Record<string, unknown>>();
  for (const [id, data] of pageUsers.entries()) {
    progressByUserId.set(id, (data.progress ?? {}) as Record<string, unknown>);
  }
  const rows = pageAttributions.map((attribution) => projectReferralDashboardRow({
    attribution,
    refereeProgress: progressByUserId.get(attribution.id),
    displayNames,
    spinReceipts: pageSpinReceipts,
    nowMs,
  }));

  const allProgressByRefereeId = new Map<string, Record<string, unknown>>();
  for (const [id, data] of allRefereeUsers.entries()) {
    allProgressByRefereeId.set(id, (data.progress ?? {}) as Record<string, unknown>);
  }
  const purchaseSummary = summarizeReferralDashboardPurchases({
    attributionIds: allAttributionIds,
    progressByRefereeId: allProgressByRefereeId,
    nowMs,
  });

  const allSpinReceipts = allSpinsSnap.docs.map((doc) => (
    spinReceiptFromData(doc.data() as ReferralDashboardSpinReceipt)
  ));
  const byPrize: Record<string, number> = {};
  const spunReferralCreditIds = new Set<string>();
  for (const receipt of allSpinReceipts) {
    const key = prizeAggregateKey(receipt);
    byPrize[key] = (byPrize[key] ?? 0) + 1;
    if (receipt.creditSource === 'referral' && receipt.creditId) {
      spunReferralCreditIds.add(String(receipt.creditId));
    }
  }

  return {
    ok: true,
    rows,
    summary: {
      ...purchaseSummary,
      rouletteSpun: spunReferralCreditIds.size,
    },
    roulette: {
      totalSpins: allSpinReceipts.length,
      byPrize,
    },
    nextCursor: rows.length === limit && pageAttributions[pageAttributions.length - 1]
      ? referralDashboardCursorFromAttribution(pageAttributions[pageAttributions.length - 1])
      : null,
  };
});

// ── b) Статистика рулетки ─────────────────────────────────────────────────────

export const adminSpinStats = onCall(CALLABLE_BASE, async (request) => {
  assertAdmin(request);
  const db = admin.firestore();
  const spinsCol = db.collectionGroup(SPINS_SUBCOLLECTION);
  const now = Date.now();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const [total, today, week] = await Promise.all([
    countOf(spinsCol),
    countOf(spinsCol.where('createdAtMs', '>=', dayStart.getTime())),
    countOf(spinsCol.where('createdAtMs', '>=', now - 7 * DAY_MS)),
  ]);

  // Распределение призов: 6 count-запросов (по одному на prizeDays).
  const byPrize: Record<string, number> = {};
  for (const days of REFERRAL_SPIN_PRIZE_DAYS) {
    // eslint-disable-next-line no-await-in-loop
    byPrize[String(days)] = await countOf(spinsCol.where('prizeDays', '==', days));
  }
  const daysGranted = REFERRAL_SPIN_PRIZE_DAYS.reduce((s, d) => s + d * (byPrize[String(d)] ?? 0), 0);

  // Кредиты на руках: точная сумма по map-полю progress.* агрегацией не считается —
  // выборка HEALTH_SAMPLE_USERS юзеров с кредитами (помечаем sampled: true).
  const creditsSnap = await db
    .collection(USERS)
    .where('progress.referral_spin_credits', '>', 0)
    .limit(HEALTH_SAMPLE_USERS)
    .get();
  let creditsOnHandSampled = 0;
  for (const u of creditsSnap.docs) {
    const p = (u.data() as { progress?: Record<string, unknown> }).progress ?? {};
    creditsOnHandSampled += Math.max(0, Math.floor(Number(p.referral_spin_credits ?? 0)));
  }

  const weights = await (async () => {
    try {
      const snap = await db.collection('remote_config').doc('app').get();
      const data = snap.data() as { numbers?: Record<string, unknown> } | undefined;
      return referralSpinWeightsFromData(data?.numbers);
    } catch {
      return referralSpinWeightsFromData(undefined);
    }
  })();

  return {
    ok: true,
    spins: { total, today, week },
    daysGranted,
    creditsOnHand: creditsOnHandSampled,
    creditsSampled: creditsSnap.size >= HEALTH_SAMPLE_USERS,
    byPrize,
    weights,
    expectedShares: Object.fromEntries(
      REFERRAL_SPIN_PRIZE_DAYS.map((d, i) => [String(d), (weights[i] ?? 0) / 100]),
    ),
  };
});

// ── b) Лог спинов ─────────────────────────────────────────────────────────────

export const adminSpinLogs = onCall(CALLABLE_BASE, async (request) => {
  assertAdmin(request);
  const limit = clampLimit(request.data?.limit, 50);
  const cursorMs = tsToMs(request.data?.cursor);

  const db = admin.firestore();
  let query: admin.firestore.Query = db.collectionGroup(SPINS_SUBCOLLECTION).orderBy('createdAtMs', 'desc');
  if (cursorMs > 0) query = query.startAfter(cursorMs);
  const snap = await query.limit(limit).get();

  const rows = snap.docs.map((d) => {
    // path: users/{uid}/referral_spins/{spinRequestId}
    const uid = d.ref.path.split('/')[1] ?? '';
    const row = d.data() as {
      prizeIndex?: number;
      prizeDays?: number;
      reroll?: boolean;
      pity?: boolean;
      createdAtMs?: number;
    };
    return {
      uid,
      spinRequestId: d.id,
      prizeIndex: Math.max(0, Math.floor(Number(row.prizeIndex ?? 0))),
      prizeDays: Math.max(0, Math.floor(Number(row.prizeDays ?? 0))),
      reroll: row.reroll === true,
      pity: row.pity === true,
      createdAtMs: tsToMs(row.createdAtMs),
    };
  });

  return { ok: true, rows, nextCursor: rows.length === limit ? rows[rows.length - 1]?.createdAtMs ?? null : null };
});

// ── b) Запись весов в «Пульт» ─────────────────────────────────────────────────

export const adminSetSpinWeights = onCall(CALLABLE_BASE, async (request) => {
  assertAdmin(request);
  const v = validateSpinWeights(request.data?.weights);
  if (!v.ok) {
    throw new HttpsError('invalid-argument', v.error);
  }
  const db = admin.firestore();
  await db.collection('remote_config').doc('app').set(
    { numbers: { referral_spin_weights: v.weights } },
    { merge: true },
  );
  console.log(JSON.stringify({ event: 'admin_set_spin_weights', weights: v.weights, by: request.auth?.uid }));
  return { ok: true, weights: v.weights };
});

// ── b2) Мастер-флаг «Рулетка Plus + реферальная программа» ────────────────────

/**
 * Вкл/выкл всей связки рулетка+рефералка из админки БЕЗ релиза.
 * Пишет remote_config/app.numbers.referral_roulette_enabled (boolean) — тот же ключ,
 * что читают referralSpin/referralClaimSpin (resolveReferralRouletteEnabled) и клиент
 * (remote_flags → isReferralRouletteEnabled). Дефолт при отсутствии ключа = ON.
 */
export const adminSetReferralRouletteEnabled = onCall(CALLABLE_BASE, async (request) => {
  assertAdmin(request);
  const role = adminRoleFromToken(request.auth?.token as Record<string, unknown> | undefined);
  if (!role || !hasPermission(role, 'application.config.write')) {
    throw new HttpsError('permission-denied', 'APPLICATION_CONFIG_WRITE_REQUIRED');
  }
  const enabled = request.data?.enabled;
  if (typeof enabled !== 'boolean') {
    throw new HttpsError('invalid-argument', 'enabled (boolean) required');
  }
  const reason = String(request.data?.reason ?? '').trim().slice(0, 500);
  const requestId = String(request.data?.requestId ?? '').trim().slice(0, 160);
  const idempotencyKey = String(request.data?.idempotencyKey ?? '').trim().slice(0, 120);
  if (!reason || !requestId || !idempotencyKey) {
    throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey required');
  }
  const db = admin.firestore();
  const configRef = db.collection('remote_config').doc('app');
  const operationRef = db.collection('admin_command_operations').doc(`referral_roulette_${idempotencyKey}`);
  const auditRef = db.collection('admin_log').doc();
  const fingerprint = JSON.stringify({ enabled });
  const actorUid = request.auth!.uid;

  return db.runTransaction(async (tx) => {
    const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
    if (operationSnap.exists) {
      const previous = operationSnap.data() ?? {};
      if (previous.requestFingerprint !== fingerprint || previous.actorUid !== actorUid) {
        throw new HttpsError('already-exists', 'idempotency key replay mismatch');
      }
      return referralSoftToggleReplayResult(previous);
    }

    const config = (configSnap.data() ?? {}) as { numbers?: Record<string, unknown> };
    const beforeEnabled = config.numbers?.referral_roulette_enabled !== false;
    const beforeSoftOffAtMs = tsToMs(config.numbers?.referral_roulette_soft_off_at_ms);
    const nowMs = Date.now();
    const softOffAtMs = resolveReferralSoftOffAtMs({
      enabled,
      beforeEnabled,
      beforeSoftOffAtMs,
      nowMs,
    });
    const audit = createAuditRecord({
      action: 'referral_roulette.enabled.set',
      actorUid,
      role,
      entity: { collection: 'remote_config', id: 'app' },
      reason,
      before: { enabled: beforeEnabled, softOffAtMs: beforeSoftOffAtMs },
      after: { enabled, softOffAtMs },
      requestId,
      timestamp: new Date().toISOString(),
    });

    tx.set(configRef, {
      numbers: {
        referral_roulette_enabled: enabled,
        referral_roulette_soft_off_at_ms: softOffAtMs,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: actorUid,
    }, { merge: true });
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.create(operationRef, {
      action: 'referral_roulette.enabled.set',
      actorUid,
      requestFingerprint: fingerprint,
      enabled,
      softOffAtMs,
      auditId: auditRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, enabled, softOffAtMs, auditId: auditRef.id, replayed: false };
  });
});

/** True kill switch: blocks qualification, credit award, claim, and spin for everyone. */
export const adminSetReferralRouletteEmergencyStop = onCall(CALLABLE_BASE, async (request) => {
  assertAdmin(request);
  const role = adminRoleFromToken(request.auth?.token as Record<string, unknown> | undefined);
  if (!role || !hasPermission(role, 'application.config.write')) {
    throw new HttpsError('permission-denied', 'APPLICATION_CONFIG_WRITE_REQUIRED');
  }
  const emergencyStop = request.data?.emergencyStop;
  if (typeof emergencyStop !== 'boolean') {
    throw new HttpsError('invalid-argument', 'emergencyStop (boolean) required');
  }
  const reason = String(request.data?.reason ?? '').trim().slice(0, 500);
  const requestId = String(request.data?.requestId ?? '').trim().slice(0, 160);
  const idempotencyKey = String(request.data?.idempotencyKey ?? '').trim().slice(0, 120);
  if (!reason || !requestId || !idempotencyKey) {
    throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey required');
  }

  const db = admin.firestore();
  const configRef = db.collection('remote_config').doc('app');
  const operationRef = db.collection('admin_command_operations').doc(`referral_roulette_emergency_${idempotencyKey}`);
  const auditRef = db.collection('admin_log').doc();
  const fingerprint = JSON.stringify({ emergencyStop });
  const actorUid = request.auth!.uid;

  return db.runTransaction(async (tx) => {
    const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
    if (operationSnap.exists) {
      const previous = operationSnap.data() ?? {};
      if (previous.requestFingerprint !== fingerprint || previous.actorUid !== actorUid) {
        throw new HttpsError('already-exists', 'idempotency key replay mismatch');
      }
      return {
        ok: true,
        emergencyStop: previous.emergencyStop === true,
        auditId: String(previous.auditId ?? ''),
        replayed: true,
      };
    }

    const config = (configSnap.data() ?? {}) as { numbers?: Record<string, unknown> };
    const beforeEmergencyStop = config.numbers?.referral_roulette_emergency_stop === true;
    const audit = createAuditRecord({
      action: 'referral_roulette.emergency_stop.set',
      actorUid,
      role,
      entity: { collection: 'remote_config', id: 'app' },
      reason,
      before: { emergencyStop: beforeEmergencyStop },
      after: { emergencyStop },
      requestId,
      timestamp: new Date().toISOString(),
    });

    tx.set(configRef, {
      numbers: { referral_roulette_emergency_stop: emergencyStop },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: actorUid,
    }, { merge: true });
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.create(operationRef, {
      action: 'referral_roulette.emergency_stop.set',
      actorUid,
      requestFingerprint: fingerprint,
      emergencyStop,
      auditId: auditRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, emergencyStop, auditId: auditRef.id, replayed: false };
  });
});

// ── c) Health-проверки ────────────────────────────────────────────────────────

type HealthStatus = 'ok' | 'warn' | 'fail';
interface HealthCheck {
  id: string;
  status: HealthStatus;
  detail: string;
}

export const adminReferralHealth = onCall(CALLABLE_BASE, async (request) => {
  assertAdmin(request);
  const db = admin.firestore();
  const checks: HealthCheck[] = [];

  // 1. Функции задеплоены: сам факт ответа этого callable + соседние считаем по
  // доступности данных. Точная проверка деплоя — внешняя (CI/консоль), TODO.
  checks.push({
    id: 'functions_deployed',
    status: 'ok',
    detail: 'adminReferralHealth отвечает; referralSpin/referralClaimSpin/feed_fanout деплоятся тем же пакетом (проверка CI — TODO)',
  });

  // 2. Весы валидны (мягкий парсер → если дефолт вместо конфига, значит мусор/отсутствует).
  let weightsValid = true;
  // Мастер-флаг: отсутствие ключа = ON, ошибка чтения = fail-closed.
  let rouletteEnabled = false;
  let emergencyStop = true;
  let softOffAtMs = 0;
  let roulettePolicy: ReferralRoulettePolicy = {
    softEnabled: false,
    emergencyStop: true,
    softOffAtMs: 0,
  };
  let rouletteFlagReadable = false;
  try {
    const snap = await db.collection('remote_config').doc('app').get();
    const data = snap.data() as { numbers?: Record<string, unknown> } | undefined;
    weightsValid = validateSpinWeights(data?.numbers?.referral_spin_weights).ok;
    roulettePolicy = referralRoulettePolicyFromData(data);
    rouletteEnabled = roulettePolicy.softEnabled;
    emergencyStop = roulettePolicy.emergencyStop;
    softOffAtMs = roulettePolicy.softOffAtMs;
    rouletteFlagReadable = true;
  } catch {
    weightsValid = false;
  }
  checks.push({
    id: 'roulette_feature_flag',
    status: !rouletteFlagReadable ? 'fail' : rouletteEnabled ? 'ok' : 'warn',
    detail: !rouletteFlagReadable
      ? 'Не удалось прочитать referral_roulette_enabled — серверные spin/claim закрыты fail-closed'
      : rouletteEnabled
      ? 'referral_roulette_enabled: ON — рулетка и рефералка работают'
      : 'referral_roulette_enabled: OFF — новые приглашения и dev-выдача закрыты; grandfathered claim/spin работают до своих дедлайнов',
  });
  checks.push({
    id: 'roulette_emergency_stop',
    status: emergencyStop ? 'fail' : 'ok',
    detail: emergencyStop
      ? 'Аварийная остановка активна: qualification, award, claim и spin заблокированы для всех'
      : 'Аварийная остановка выключена',
  });
  checks.push({
    id: 'weights_valid',
    status: weightsValid ? 'ok' : 'warn',
    detail: weightsValid
      ? 'remote_config/app.numbers.referral_spin_weights: 6 призов, сумма 100'
      : 'Весы отсутствуют/битые — runtime работает на дефолтах (55/30/11.5/2.9/0.55/0.05)',
  });

  // 3. Спины с призом вне конфигурации (должно быть 0).
  const outOfConfig = await countOf(
    db.collectionGroup(SPINS_SUBCOLLECTION).where('prizeDays', 'not-in', [...REFERRAL_SPIN_PRIZE_DAYS]),
  );
  checks.push({
    id: 'no_out_of_config_prizes',
    status: outOfConfig === 0 ? 'ok' : 'fail',
    detail: outOfConfig === 0 ? 'Все prizeDays ∈ [1,7,30,90,180,365]' : `${outOfConfig} спинов с призом вне конфигурации!`,
  });

  // 4. Qualified-атрибуции старше 30 дней (застрявшие прокруты).
  const staleCutoff = admin.firestore.Timestamp.fromMillis(Date.now() - STALE_QUALIFIED_DAYS * DAY_MS);
  const staleQualified = await countOf(
    db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'qualified').where('createdAt', '<', staleCutoff),
  );
  checks.push({
    id: 'no_stale_qualified',
    status: staleQualified === 0 ? 'ok' : 'warn',
    detail:
      staleQualified === 0
        ? 'Нет qualified-приглашений старше 30 дней'
        : `${staleQualified} приглашений ждут клейма > ${STALE_QUALIFIED_DAYS}д — напомнить юзерам/проверить UI`,
  });

  // 5. Баланс кредитов (выборка): issued ≈ used + onHand. Точный аудит — отдельная
  // джоба (агрегации по map-полям недоступны), TODO.
  const creditsSnap = await db
    .collection(USERS)
    .where('progress.referral_spin_credits', '>', 0)
    .limit(HEALTH_SAMPLE_USERS)
    .get();
  let onHand = 0;
  let used = 0;
  for (const u of creditsSnap.docs) {
    const p = (u.data() as { progress?: Record<string, unknown> }).progress ?? {};
    onHand += Math.max(0, Math.floor(Number(p.referral_spin_credits ?? 0)));
    used += Math.max(0, Math.floor(Number(p.referral_spins_total ?? 0)));
  }
  checks.push({
    id: 'credits_balance_sampled',
    status: 'ok',
    detail: `Выборка ${creditsSnap.size} юзеров: на руках ${onHand}, использовано ${used}. Точный баланс issued=used+onHand — отдельная reconcile-джоба (TODO)`,
  });

  const drainSampleLimit = HEALTH_SAMPLE_USERS + 1;
  const serverNowMs = Date.now();
  const [pendingDrainSnap, qualifiedDrainSnap, ledgerAvailableSnap] = await Promise.all([
    db.collection(REFERRAL_ATTRIBUTIONS)
      .where('status', '==', 'pending')
      .limit(drainSampleLimit)
      .get(),
    db.collection(REFERRAL_ATTRIBUTIONS)
      .where('status', 'in', ['qualified', 'skipped_referrer_cap'])
      .limit(drainSampleLimit)
      .get(),
    db.collectionGroup(REFERRAL_SPIN_LEDGER)
      .where('status', '==', 'available')
      .limit(drainSampleLimit)
      .get(),
  ]);
  const sampledAttributions = [...pendingDrainSnap.docs, ...qualifiedDrainSnap.docs]
    .slice(0, HEALTH_SAMPLE_USERS * 2)
    .map((doc) => {
      const row = doc.data() as Record<string, unknown>;
      return {
        status: String(row.status ?? ''),
        createdAtMs: tsToMs(row.createdAt) || tsToMs(row.createdAtMs),
        qualifiedAtMs: tsToMs(row.qualifiedAt) || tsToMs(row.qualifiedAtMs),
      };
    });
  const sampledCredits = ledgerAvailableSnap.docs
    .slice(0, HEALTH_SAMPLE_USERS)
    .map((doc) => {
      const row = doc.data() as Record<string, unknown>;
      return {
        status: String(row.status ?? ''),
        source: String(row.source ?? ''),
        expiresAtMs: tsToMs(row.expiresAt) || tsToMs(row.expiresAtMs),
      };
    });
  const semanticDrain = summarizeReferralAdminDrain({
    policy: roulettePolicy,
    nowMs: serverNowMs,
    attributions: sampledAttributions,
    credits: sampledCredits,
  });
  const drainMetrics = {
    ...semanticDrain,
    aggregateCreditsSampled: onHand,
    softOffAtMs,
    legacyCreditExpiryMs: legacyCreditExpiryMs(),
    serverNowMs,
    sampleLimit: HEALTH_SAMPLE_USERS,
    truncated: pendingDrainSnap.size > HEALTH_SAMPLE_USERS
      || qualifiedDrainSnap.size > HEALTH_SAMPLE_USERS
      || ledgerAvailableSnap.size > HEALTH_SAMPLE_USERS,
  };

  // 6. Отставание feed: последнее событие my_events vs последняя feed-копия (по выборке).
  let feedLagMinutes = -1;
  try {
    const [latestEvent, latestFeed] = await Promise.all([
      db.collectionGroup('my_events').orderBy('ts', 'desc').limit(1).get(),
      db.collectionGroup('feed').orderBy('ts', 'desc').limit(1).get(),
    ]);
    const eTs = Number((latestEvent.docs[0]?.data() as { ts?: unknown } | undefined)?.ts ?? 0);
    const fTs = Number((latestFeed.docs[0]?.data() as { ts?: unknown } | undefined)?.ts ?? 0);
    if (eTs > 0 && fTs > 0) feedLagMinutes = Math.max(0, Math.round((eTs - fTs) / 60000));
  } catch {
    /* индексы collectionGroup могут отсутствовать до backfill — тогда warn ниже */
  }
  checks.push({
    id: 'feed_lag',
    status: feedLagMinutes < 0 ? 'warn' : feedLagMinutes < 5 ? 'ok' : 'warn',
    detail:
      feedLagMinutes < 0
        ? 'Не удалось оценить (нет данных/индекса collectionGroup) — проверить после backfill'
        : `Отставание fan-out ≈ ${feedLagMinutes} мин (порог 5 мин)`,
  });

  const worst: HealthStatus = checks.some((c) => c.status === 'fail')
    ? 'fail'
    : checks.some((c) => c.status === 'warn')
      ? 'warn'
      : 'ok';
  return {
    ok: true,
    status: worst,
    checks,
    rouletteEnabled,
    emergencyStop,
    softOffAtMs,
    drainMetrics,
    checkedAtMs: Date.now(),
  };
});
