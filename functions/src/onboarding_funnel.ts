import { createHash } from 'node:crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasClaimedPermission } from './admin/permissions';

const REGION = 'us-central1';
const DAILY_COLLECTION = 'onboarding_funnel_daily';
const RECEIPT_COLLECTION = 'onboarding_funnel_receipts';
const RATE_COLLECTION = 'onboarding_funnel_rate_limits';
const RECEIPT_TTL_DAYS = 120;
const RATE_TTL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export const MAX_EVENTS_PER_AUTH_DAY = 3;

export type OnboardingFunnelEvent = 'started' | 'completed';
export type OnboardingFunnelPlatform = 'ios' | 'android' | 'web';
export type OnboardingFunnelPlatformFilter = OnboardingFunnelPlatform | 'all';

/**
 * Решение пользователя по НЕОБЯЗАТЕЛЬНОЙ аналитике, снятое в момент завершения
 * онбординга. Хранится ТОЛЬКО как суточный счётчик (см. incrementDaily) — само
 * значение никогда не пишется в документ.
 *
 * зачем: продуктовая аналитика гейтится согласием, поэтому отказавшихся она не
 * видит по определению — знаменателя «сколько всего спросили» не существовало, и
 * долю согласий нельзя было измерить ничем. Без неё нельзя понять, какая часть
 * аудитории вообще доходит до A/B-теста пейвола и хватит ли выборки на вердикт.
 * Это счётчик на легитимном интересе (как started/completed), без PII.
 */
export type OnboardingFunnelConsentDecision = 'granted' | 'denied';

export type OnboardingFunnelEventInput = {
  event: OnboardingFunnelEvent;
  platform: OnboardingFunnelPlatform;
  attemptId: string;
  /** Только у `completed`; отсутствует у клиентов старее этого счётчика. */
  analyticsConsent?: OnboardingFunnelConsentDecision;
};

export type OnboardingFunnelDailyRow = {
  date: string;
  platform: OnboardingFunnelPlatform;
  started: number;
  completed: number;
  /** Необязательны: документы, записанные до релиза счётчика, их не имеют. */
  consentGranted?: number;
  consentDenied?: number;
};

type ReceiptValue = { createdAtMs: number; expiresAtMs: number };
type RateValue = { started: number; completed: number; expiresAtMs: number };

export interface OnboardingFunnelTransaction {
  hasReceipt(key: string): Promise<boolean>;
  getRate(key: string): Promise<RateValue | null>;
  createReceipt(key: string, value: ReceiptValue): void;
  setRate(key: string, value: RateValue): void;
  incrementDaily(
    docId: string,
    date: string,
    platform: OnboardingFunnelPlatform,
    event: OnboardingFunnelEvent,
    analyticsConsent?: OnboardingFunnelConsentDecision,
  ): void;
}

export interface OnboardingFunnelRepository {
  runTransaction<T>(work: (tx: OnboardingFunnelTransaction) => Promise<T>): Promise<T>;
  listDaily(fromDay: string, toDayExclusive: string): Promise<OnboardingFunnelDailyRow[]>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireExactKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  if (Object.keys(value).some((key) => !allowedSet.has(key))) {
    throw new HttpsError('invalid-argument', 'Unexpected field');
  }
}

export function parseOnboardingFunnelEventInput(value: unknown): OnboardingFunnelEventInput {
  if (!isPlainObject(value)) throw new HttpsError('invalid-argument', 'Object payload required');
  requireExactKeys(value, ['event', 'platform', 'attemptId', 'analyticsConsent']);

  const event = value.event;
  if (event !== 'started' && event !== 'completed') {
    throw new HttpsError('invalid-argument', 'Unsupported onboarding event');
  }

  const platform = value.platform;
  if (platform !== 'ios' && platform !== 'android' && platform !== 'web') {
    throw new HttpsError('invalid-argument', 'Unsupported platform');
  }

  const attemptId = typeof value.attemptId === 'string' ? value.attemptId.trim() : '';
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(attemptId)) {
    throw new HttpsError('invalid-argument', 'Invalid attempt id');
  }

  // Строгий allowlist: 'unset' сюда не попадает — решение снимается только когда
  // пользователь его фактически принял, иначе счётчик врал бы знаменателем.
  if (value.analyticsConsent === undefined) return { event, platform, attemptId };
  if (value.analyticsConsent !== 'granted' && value.analyticsConsent !== 'denied') {
    throw new HttpsError('invalid-argument', 'Unsupported analytics consent decision');
  }

  return { event, platform, attemptId, analyticsConsent: value.analyticsConsent };
}

function privacyHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function buildOnboardingFunnelPrivacyKeys(
  authUid: string,
  input: OnboardingFunnelEventInput,
  utcDay: string,
): { receiptKey: string; startReceiptKey: string; rateKey: string } {
  return {
    receiptKey: privacyHash(`onboarding-funnel-v1|receipt|${authUid}|${input.event}|${input.attemptId}`),
    startReceiptKey: privacyHash(`onboarding-funnel-v1|receipt|${authUid}|started|${input.attemptId}`),
    rateKey: privacyHash(`onboarding-funnel-v1|rate|${authUid}|${utcDay}`),
  };
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextUtcDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
}

function addUtcDays(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + delta * DAY_MS).toISOString().slice(0, 10);
}

function safeCount(value: unknown): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function applyOnboardingFunnelEvent(
  repository: OnboardingFunnelRepository,
  authUid: string,
  rawInput: unknown,
  now = new Date(),
): Promise<{ ok: true; duplicate: boolean }> {
  if (!authUid.trim()) throw new HttpsError('unauthenticated', 'Authentication required');
  const input = parseOnboardingFunnelEventInput(rawInput);
  const day = utcDay(now);
  const keys = buildOnboardingFunnelPrivacyKeys(authUid, input, day);

  return repository.runTransaction(async (tx) => {
    if (await tx.hasReceipt(keys.receiptKey)) return { ok: true, duplicate: true };

    if (input.event === 'completed' && !(await tx.hasReceipt(keys.startReceiptKey))) {
      throw new HttpsError('failed-precondition', 'Onboarding start receipt required');
    }

    const rate = await tx.getRate(keys.rateKey) ?? { started: 0, completed: 0, expiresAtMs: 0 };
    const eventCount = rate[input.event];
    if (eventCount >= MAX_EVENTS_PER_AUTH_DAY) {
      throw new HttpsError('resource-exhausted', 'Daily onboarding event limit reached');
    }

    const nowMs = now.getTime();
    tx.createReceipt(keys.receiptKey, {
      createdAtMs: nowMs,
      expiresAtMs: nowMs + RECEIPT_TTL_DAYS * DAY_MS,
    });
    tx.setRate(keys.rateKey, {
      started: rate.started + (input.event === 'started' ? 1 : 0),
      completed: rate.completed + (input.event === 'completed' ? 1 : 0),
      expiresAtMs: nowMs + RATE_TTL_DAYS * DAY_MS,
    });
    tx.incrementDaily(`${day}_${input.platform}`, day, input.platform, input.event, input.analyticsConsent);
    return { ok: true, duplicate: false };
  });
}

export function summarizeOnboardingFunnelRows(
  rows: readonly OnboardingFunnelDailyRow[],
  platform: OnboardingFunnelPlatformFilter,
): {
  started: number;
  completed: number;
  conversionPercent: number | null;
  consentGranted: number;
  consentDenied: number;
  consentDecisions: number;
  consentRatePercent: number | null;
} {
  const selected = platform === 'all' ? rows : rows.filter((row) => row.platform === platform);
  const started = selected.reduce((sum, row) => sum + safeCount(row.started), 0);
  const completed = selected.reduce((sum, row) => sum + safeCount(row.completed), 0);
  const consentGranted = selected.reduce((sum, row) => sum + safeCount(row.consentGranted), 0);
  const consentDenied = selected.reduce((sum, row) => sum + safeCount(row.consentDenied), 0);
  const consentDecisions = consentGranted + consentDenied;
  return {
    started,
    completed,
    conversionPercent: started > 0 ? Math.round((completed / started) * 1000) / 10 : null,
    consentGranted,
    consentDenied,
    consentDecisions,
    // null, а не 0 — пока решений нет (или документы старые), доля неизвестна, и
    // показывать «0%» значило бы соврать в вердикте A/B.
    consentRatePercent: consentDecisions > 0
      ? Math.round((consentGranted / consentDecisions) * 1000) / 10
      : null,
  };
}

function firestoreRepository(db: FirebaseFirestore.Firestore): OnboardingFunnelRepository {
  return {
    runTransaction: (work) => db.runTransaction(async (firestoreTx) => work({
      hasReceipt: async (key) => (await firestoreTx.get(db.collection(RECEIPT_COLLECTION).doc(key))).exists,
      getRate: async (key) => {
        const snapshot = await firestoreTx.get(db.collection(RATE_COLLECTION).doc(key));
        if (!snapshot.exists) return null;
        const value = snapshot.data() ?? {};
        return {
          started: safeCount(value.started),
          completed: safeCount(value.completed),
          expiresAtMs: value.expiresAt?.toMillis?.() ?? 0,
        };
      },
      createReceipt: (key, value) => {
        firestoreTx.create(db.collection(RECEIPT_COLLECTION).doc(key), {
          createdAt: admin.firestore.Timestamp.fromMillis(value.createdAtMs),
          expiresAt: admin.firestore.Timestamp.fromMillis(value.expiresAtMs),
        });
      },
      setRate: (key, value) => {
        firestoreTx.set(db.collection(RATE_COLLECTION).doc(key), {
          started: value.started,
          completed: value.completed,
          expiresAt: admin.firestore.Timestamp.fromMillis(value.expiresAtMs),
        });
      },
      incrementDaily: (docId, date, platform, event, analyticsConsent) => {
        // Решение превращается в счётчик прямо здесь: в документ попадает только
        // consentGranted/consentDenied +1, само значение 'granted'/'denied' не хранится.
        const consentField = analyticsConsent === 'granted' ? 'consentGranted'
          : analyticsConsent === 'denied' ? 'consentDenied' : null;
        firestoreTx.set(db.collection(DAILY_COLLECTION).doc(docId), {
          date,
          platform,
          [event]: admin.firestore.FieldValue.increment(1),
          ...(consentField ? { [consentField]: admin.firestore.FieldValue.increment(1) } : {}),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      },
    })),
    listDaily: async (fromDay, toDayExclusive) => {
      const snapshot = await db.collection(DAILY_COLLECTION)
        .where(admin.firestore.FieldPath.documentId(), '>=', `${fromDay}_`)
        .where(admin.firestore.FieldPath.documentId(), '<', `${toDayExclusive}_`)
        .limit(400)
        .get();
      return snapshot.docs.flatMap((doc): OnboardingFunnelDailyRow[] => {
        const value = doc.data() ?? {};
        if (
          typeof value.date !== 'string'
          || (value.platform !== 'ios' && value.platform !== 'android' && value.platform !== 'web')
        ) return [];
        return [{
          date: value.date,
          platform: value.platform,
          started: safeCount(value.started),
          completed: safeCount(value.completed),
          consentGranted: safeCount(value.consentGranted),
          consentDenied: safeCount(value.consentDenied),
        }];
      });
    },
  };
}

function parseAdminFilter(value: unknown): { rangeDays: 7 | 28 | 90; platform: OnboardingFunnelPlatformFilter } {
  if (!isPlainObject(value)) throw new HttpsError('invalid-argument', 'Object payload required');
  requireExactKeys(value, ['rangeDays', 'platform']);
  const rawRange = Number(value.rangeDays);
  if (rawRange !== 7 && rawRange !== 28 && rawRange !== 90) {
    throw new HttpsError('invalid-argument', 'Unsupported date range');
  }
  const platform = value.platform;
  if (platform !== 'all' && platform !== 'ios' && platform !== 'android' && platform !== 'web') {
    throw new HttpsError('invalid-argument', 'Unsupported platform filter');
  }
  return { rangeDays: rawRange, platform };
}

export const recordOnboardingFunnelEvent = onCall({
  region: REGION,
  enforceAppCheck: true,
  timeoutSeconds: 15,
  memory: '256MiB',
  maxInstances: 40,
}, async (request) => {
  const authUid = request.auth?.uid ?? '';
  if (!authUid) throw new HttpsError('unauthenticated', 'Authentication required');
  return applyOnboardingFunnelEvent(firestoreRepository(admin.firestore()), authUid, request.data);
});

export const adminGetOnboardingFunnel = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
  memory: '256MiB',
}, async (request) => {
  if (!hasClaimedPermission(request.auth?.token, 'diagnostics.read')) {
    throw new HttpsError('permission-denied', 'diagnostics.read permission required');
  }
  const filter = parseAdminFilter(request.data);
  const today = utcDay(new Date());
  const fromDay = addUtcDays(today, -(filter.rangeDays - 1));
  const toDayExclusive = nextUtcDay(today);
  const rows = await firestoreRepository(admin.firestore()).listDaily(fromDay, toDayExclusive);
  return {
    ...summarizeOnboardingFunnelRows(rows, filter.platform),
    rangeDays: filter.rangeDays,
    platform: filter.platform,
    fromDay,
    throughDay: today,
    cohortDefinition: 'onboarding_funnel_server_aggregates_v1',
    generatedAtMs: Date.now(),
    limitations: [
      'available_from_counter_release_only',
      'client_platform_is_allowlisted_but_client_reported',
      'offline_events_may_arrive_late_or_be_missing',
    ],
  };
});
