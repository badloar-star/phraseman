import { createHash } from 'node:crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';

const MAX_COHORT_TEXT = 64;
const INTENT_ID_RE = /^[A-Za-z0-9_-]{16,80}$/;
const TIMESTAMP_FIELDS = new Set([
  'createdAt',
  'consentGrantedAt',
  'consentRevokedAt',
  'legalAcceptedAt',
  'updatedAt',
]);

export type AgeConsentSnapshotInput = {
  schemaVersion: 1;
  intentId: string;
  ageBracket: 'adult' | 'unknown';
  analyticsConsent: 'granted' | 'denied' | 'unset';
  legalAccepted: boolean;
  appVersion: string;
  build: string;
  platform: 'ios' | 'android' | 'web';
};

type ConsentRow = Record<string, unknown>;

export interface AgeConsentRepository {
  runTransaction<T>(
    stableUid: string,
    work: (current: ConsentRow | null) => Promise<{ result: T; patch: ConsentRow | null }>,
  ): Promise<T>;
}

type HandlerDependencies = {
  repository: AgeConsentRepository;
  resolveStableUid(authUid: string): Promise<string>;
  nowMs(): number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new HttpsError('invalid-argument', message);
}

function requiredText(value: unknown, field: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || normalized.length > MAX_COHORT_TEXT) invalid(`Invalid ${field}`);
  return normalized;
}

export function parseAgeConsentSnapshot(value: unknown): AgeConsentSnapshotInput {
  if (!isPlainObject(value)) invalid('Object payload required');
  const allowed = new Set([
    'schemaVersion',
    'intentId',
    'ageBracket',
    'analyticsConsent',
    'legalAccepted',
    'appVersion',
    'build',
    'platform',
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) invalid('Unexpected field');
  if (value.schemaVersion !== 1) invalid('Unsupported consent schema');

  const intentId = typeof value.intentId === 'string' ? value.intentId.trim() : '';
  if (!INTENT_ID_RE.test(intentId)) invalid('Invalid intent id');
  if (value.ageBracket !== 'adult' && value.ageBracket !== 'unknown') {
    invalid('Unsupported age bracket');
  }
  if (
    value.analyticsConsent !== 'granted'
    && value.analyticsConsent !== 'denied'
    && value.analyticsConsent !== 'unset'
  ) invalid('Unsupported analytics consent');
  if (typeof value.legalAccepted !== 'boolean') invalid('Invalid legal acceptance');
  if (value.platform !== 'ios' && value.platform !== 'android' && value.platform !== 'web') {
    invalid('Unsupported platform');
  }

  return {
    schemaVersion: 1,
    intentId,
    ageBracket: value.ageBracket,
    analyticsConsent: value.analyticsConsent,
    legalAccepted: value.legalAccepted,
    appVersion: requiredText(value.appVersion, 'app version'),
    build: requiredText(value.build, 'build'),
    platform: value.platform,
  };
}

function intentHash(stableUid: string, intentId: string): string {
  return createHash('sha256')
    .update(`age-consent-v1|${stableUid}|${intentId}`)
    .digest('hex');
}

function missing(row: ConsentRow | null, field: string): boolean {
  return row?.[field] == null;
}

export async function applyAgeConsentSnapshot(
  repository: AgeConsentRepository,
  stableUid: string,
  rawInput: unknown,
  nowMs = Date.now(),
): Promise<{ ok: true; duplicate: boolean }> {
  const input = parseAgeConsentSnapshot(rawInput);
  const receiptHash = intentHash(stableUid, input.intentId);

  return repository.runTransaction<{ ok: true; duplicate: boolean }>(stableUid, async (current) => {
    if (current?.lastIntentHash === receiptHash) {
      return { result: { ok: true as const, duplicate: true }, patch: null };
    }

    const patch: ConsentRow = {
      schemaVersion: 1,
      ageBracket: input.ageBracket,
      analyticsConsent: input.analyticsConsent,
      legalAccepted: input.legalAccepted,
      appVersion: input.appVersion,
      build: input.build,
      platform: input.platform,
      updatedAt: nowMs,
      lastIntentHash: receiptHash,
    };
    if (missing(current, 'createdAt')) patch.createdAt = nowMs;
    if (missing(current, 'firstAppVersion')) patch.firstAppVersion = input.appVersion;
    if (missing(current, 'firstBuild')) patch.firstBuild = input.build;
    if (missing(current, 'firstPlatform')) patch.firstPlatform = input.platform;
    if (input.analyticsConsent === 'granted' && missing(current, 'consentGrantedAt')) {
      patch.consentGrantedAt = nowMs;
    }
    if (input.analyticsConsent === 'denied') patch.consentRevokedAt = nowMs;
    if (input.legalAccepted && missing(current, 'legalAcceptedAt')) patch.legalAcceptedAt = nowMs;

    return { result: { ok: true as const, duplicate: false }, patch };
  });
}

export async function handleRecordAgeConsentSnapshot(
  dependencies: HandlerDependencies,
  request: { authUid: string; data: unknown },
): Promise<{ ok: true; duplicate: boolean }> {
  const authUid = request.authUid.trim();
  if (!authUid) throw new HttpsError('unauthenticated', 'Authentication required');
  parseAgeConsentSnapshot(request.data);
  const stableUid = await dependencies.resolveStableUid(authUid);
  if (!stableUid.trim()) throw new HttpsError('failed-precondition', 'Stable identity required');
  return applyAgeConsentSnapshot(dependencies.repository, stableUid, request.data, dependencies.nowMs());
}

function firestoreRepository(db: FirebaseFirestore.Firestore): AgeConsentRepository {
  return {
    runTransaction: (stableUid, work) => db.runTransaction(async (transaction) => {
      const ref = db.collection('user_consents').doc(stableUid);
      const snapshot = await transaction.get(ref);
      const outcome = await work(snapshot.exists ? (snapshot.data() ?? {}) : null);
      if (outcome.patch) {
        const firestorePatch = Object.fromEntries(
          Object.entries(outcome.patch).map(([key, value]) => [
            key,
            TIMESTAMP_FIELDS.has(key) && typeof value === 'number'
              ? admin.firestore.Timestamp.fromMillis(value)
              : value,
          ]),
        );
        transaction.set(ref, firestorePatch, { merge: true });
      }
      return outcome.result;
    }),
  };
}

export const recordAgeConsentSnapshot = onCall({
  region: 'us-central1',
  enforceAppCheck: false,
  timeoutSeconds: 15,
  memory: '256MiB',
  maxInstances: 40,
}, async (request) => {
  const authUid = request.auth?.uid ?? '';
  const db = admin.firestore();
  return handleRecordAgeConsentSnapshot({
    repository: firestoreRepository(db),
    resolveStableUid: (authUid) => resolveStableUidForAuth(db, authUid, undefined, {
      requireKnownIdentity: true,
      repairLinks: false,
    }),
    nowMs: () => Date.now(),
  }, { authUid, data: request.data });
});
