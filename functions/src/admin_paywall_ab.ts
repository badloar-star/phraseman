import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { createAuditRecord } from './admin/audit_contract';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';

const REGION = 'us-central1';
const PAYWALL_AB_DOC_ID = 'paywall_ab';
const DEFAULT_SALT = 'v3';

export const PAYWALL_AB_VARIANT_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
export type PaywallAbVariantLetter = (typeof PAYWALL_AB_VARIANT_LETTERS)[number];

export interface PaywallAbVariantShare {
  readonly enabled: boolean;
  readonly pct: number;
}

export interface PaywallAbPublishRequest {
  readonly variants: Readonly<Record<PaywallAbVariantLetter, PaywallAbVariantShare>>;
  readonly salt?: string;
  readonly rating_x10?: number;
  readonly ratings_count?: number;
  readonly expectedUpdatedAt?: number;
  readonly idempotencyKey: string;
  readonly reason: string;
  readonly requestId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseVariantShare(letter: string, value: unknown): PaywallAbVariantShare {
  if (!isRecord(value)) throw new HttpsError('invalid-argument', `variants.${letter} must be an object`);
  if (typeof value.enabled !== 'boolean') throw new HttpsError('invalid-argument', `variants.${letter}.enabled must be a boolean`);
  const pct = Number(value.pct);
  if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
    throw new HttpsError('invalid-argument', `variants.${letter}.pct must be an integer between 0 and 100`);
  }
  return Object.freeze({ enabled: value.enabled, pct });
}

export function parsePaywallAbRequest(data: unknown): PaywallAbPublishRequest {
  if (!isRecord(data) || !isRecord(data.variants)) {
    throw new HttpsError('invalid-argument', 'variants object required');
  }
  const submittedLetters = Object.keys(data.variants);
  const unknownLetters = submittedLetters.filter((letter) => !(PAYWALL_AB_VARIANT_LETTERS as readonly string[]).includes(letter));
  if (unknownLetters.length > 0) {
    throw new HttpsError('invalid-argument', `variants contains unsupported letters: ${unknownLetters.join(', ')}`);
  }
  if (submittedLetters.length === 0) throw new HttpsError('invalid-argument', 'variants must not be empty');
  const variants = {} as Record<PaywallAbVariantLetter, PaywallAbVariantShare>;
  for (const letter of PAYWALL_AB_VARIANT_LETTERS) {
    // Пропущенная буква = контракт приложения для старых доков: включённый вариант с долей 0.
    variants[letter] = letter in data.variants
      ? parseVariantShare(letter, data.variants[letter])
      : Object.freeze({ enabled: true, pct: 0 });
  }
  const enabledLetters = PAYWALL_AB_VARIANT_LETTERS.filter((letter) => variants[letter].enabled);
  if (enabledLetters.length === 0) {
    throw new HttpsError('invalid-argument', 'at least one variant must be enabled');
  }
  const enabledPctSum = enabledLetters.reduce((total, letter) => total + variants[letter].pct, 0);
  if (enabledPctSum !== 100) {
    throw new HttpsError('invalid-argument', `sum of pct over enabled variants must equal 100, got ${enabledPctSum}`);
  }

  let salt: string | undefined;
  if (data.salt !== undefined && data.salt !== null) {
    salt = String(data.salt).trim();
    if (!salt || salt.length > 40) throw new HttpsError('invalid-argument', 'salt must be a string of 1-40 characters');
  }
  let rating_x10: number | undefined;
  if (data.rating_x10 !== undefined && data.rating_x10 !== null) {
    rating_x10 = Number(data.rating_x10);
    if (!Number.isInteger(rating_x10) || rating_x10 < 0 || rating_x10 > 50) {
      throw new HttpsError('invalid-argument', 'rating_x10 must be an integer between 0 and 50');
    }
  }
  let ratings_count: number | undefined;
  if (data.ratings_count !== undefined && data.ratings_count !== null) {
    ratings_count = Number(data.ratings_count);
    if (!Number.isInteger(ratings_count) || ratings_count < 0) {
      throw new HttpsError('invalid-argument', 'ratings_count must be a non-negative integer');
    }
  }
  let expectedUpdatedAt: number | undefined;
  if (data.expectedUpdatedAt !== undefined && data.expectedUpdatedAt !== null) {
    expectedUpdatedAt = Number(data.expectedUpdatedAt);
    if (!Number.isFinite(expectedUpdatedAt) || expectedUpdatedAt < 0) {
      throw new HttpsError('invalid-argument', 'expectedUpdatedAt must be a non-negative number');
    }
  }
  const idempotencyKey = String(data.idempotencyKey ?? '').trim();
  const reason = String(data.reason ?? '').trim().slice(0, 500);
  const requestId = String(data.requestId ?? '').trim();
  if (!idempotencyKey || idempotencyKey.length > 120 || !reason || !requestId) {
    throw new HttpsError('invalid-argument', 'idempotencyKey, reason and requestId are required');
  }
  return Object.freeze({
    variants: Object.freeze(variants),
    salt,
    rating_x10,
    ratings_count,
    expectedUpdatedAt,
    idempotencyKey,
    reason,
    requestId,
  });
}

function readDocInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num < min || num > max) return fallback;
  return num;
}

export function buildPaywallAbDoc(
  input: PaywallAbPublishRequest,
  before: Readonly<Record<string, unknown>>,
  actorUid: string,
  nowMs: number,
): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  for (const letter of PAYWALL_AB_VARIANT_LETTERS) {
    doc[`${letter}_pct`] = input.variants[letter].pct;
    doc[`${letter}_enabled`] = input.variants[letter].enabled;
  }
  const beforeSalt = typeof before.salt === 'string' && before.salt.trim().length > 0 && before.salt.length <= 40
    ? before.salt
    : DEFAULT_SALT;
  doc.salt = input.salt ?? beforeSalt;
  doc.rating_x10 = input.rating_x10 ?? readDocInt(before.rating_x10, 0, 50, 0);
  doc.ratings_count = input.ratings_count ?? readDocInt(before.ratings_count, 0, Number.MAX_SAFE_INTEGER, 0);
  doc.updatedAt = nowMs;
  doc.updatedBy = actorUid;
  return doc;
}

function formatFieldValue(value: unknown): string {
  return value === undefined || value === null ? '∅' : String(value);
}

export function paywallAbChanges(
  before: Readonly<Record<string, unknown>>,
  after: Readonly<Record<string, unknown>>,
): string[] {
  const fields = [
    ...PAYWALL_AB_VARIANT_LETTERS.flatMap((letter) => [`${letter}_pct`, `${letter}_enabled`]),
    'salt',
    'rating_x10',
    'ratings_count',
  ];
  const changes: string[] = [];
  for (const field of fields) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      changes.push(`${field}: ${formatFieldValue(before[field])} → ${formatFieldValue(after[field])}`);
    }
  }
  return changes;
}

function resolveRole(token: Record<string, unknown>): AdminRole | null {
  const claimed = token.adminRole;
  return hasAdminRole(claimed) ? claimed : null;
}

function paywallAbFingerprint(input: PaywallAbPublishRequest): string {
  return JSON.stringify({
    variants: input.variants,
    salt: input.salt ?? null,
    rating_x10: input.rating_x10 ?? null,
    ratings_count: input.ratings_count ?? null,
  });
}

export const adminPublishPaywallAb = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const input = parsePaywallAbRequest(request.data);
    const actorUid = request.auth.uid;
    const role = resolveRole(request.auth.token as Record<string, unknown>);
    if (!role) throw new HttpsError('permission-denied', 'adminRole claim required');
    if (!hasPermission(role, 'application.config.write')) {
      throw new HttpsError('permission-denied', 'Role cannot publish paywall A/B config');
    }
    const db = admin.firestore();
    const configRef = db.collection('remote_config').doc(PAYWALL_AB_DOC_ID);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection('remote_config_history').doc();
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();

    return db.runTransaction(async (tx) => {
      const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() ?? {};
        if (previous.requestFingerprint !== paywallAbFingerprint(input)) {
          throw new HttpsError('already-exists', 'idempotencyKey was already used for another payload');
        }
        return {
          ok: true,
          auditId: String(previous.auditId ?? ''),
          updatedAt: Number(previous.updatedAt ?? 0),
          replayed: true,
        };
      }

      const before = (configSnap.data() ?? {}) as Record<string, unknown>;
      if (input.expectedUpdatedAt !== undefined) {
        if (!configSnap.exists || Number(before.updatedAt ?? 0) !== input.expectedUpdatedAt) {
          throw new HttpsError('failed-precondition', 'paywall_ab changed; reload before publishing');
        }
      }
      const after = buildPaywallAbDoc(input, before, actorUid, nowMs);
      const changes = paywallAbChanges(before, after);
      const audit = createAuditRecord({
        action: 'paywall_ab.publish',
        actorUid,
        role,
        entity: { collection: 'remote_config', id: PAYWALL_AB_DOC_ID },
        reason: input.reason,
        before,
        after,
        rollbackReference: historyRef.id,
        requestId: input.requestId,
        timestamp: now,
      });

      // merge:false — документ эксперимента перезаписывается целиком, устаревшие поля удаляются.
      tx.set(configRef, after);
      tx.create(historyRef, {
        ...audit,
        operationId: input.idempotencyKey,
        changes,
        doc: PAYWALL_AB_DOC_ID,
        by: actorUid,
        at: now,
      });
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, {
        operationId: input.idempotencyKey,
        requestFingerprint: paywallAbFingerprint(input),
        auditId: auditRef.id,
        updatedAt: nowMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, auditId: auditRef.id, updatedAt: nowMs, replayed: false };
    });
  },
);

export const adminGetPaywallAbWorkspace = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = resolveRole(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'application.config.write')) {
      throw new HttpsError('permission-denied', 'Role cannot read paywall A/B config');
    }
    const db = admin.firestore();
    const [configSnap, historySnap] = await Promise.all([
      db.collection('remote_config').doc(PAYWALL_AB_DOC_ID).get(),
      db.collection('remote_config_history').limit(100).get(),
    ]);
    const config = configSnap.exists ? ((configSnap.data() ?? {}) as Record<string, unknown>) : {};
    const history = historySnap.docs
      .map((doc): Record<string, unknown> & { id: string } => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .filter((entry) => entry.doc === PAYWALL_AB_DOC_ID || (isRecord(entry.entity) && entry.entity.id === PAYWALL_AB_DOC_ID))
      .sort((left, right) => String(right.timestamp ?? right.at ?? '').localeCompare(String(left.timestamp ?? left.at ?? '')))
      .slice(0, 20);
    return { ok: true, exists: configSnap.exists, config, history };
  },
);
