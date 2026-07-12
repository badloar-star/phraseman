import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const FUNNEL_CAP = 5_000;
const CONFIG_ID = 'paywall_ab';
const VARIANTS = ['A', 'B', 'C', 'v1'] as const;
const STEPS = ['shown', 'cta_click', 'trial_started', 'purchase_completed', 'close', 'purchase_cancelled'] as const;

type Variant = typeof VARIANTS[number];
type Step = typeof STEPS[number];

interface FunnelRow {
  readonly variant?: unknown;
  readonly step?: unknown;
  readonly context?: unknown;
  readonly plan?: unknown;
  readonly uidh?: unknown;
  readonly dev?: unknown;
}

export interface PaywallAbConfig {
  readonly aPct: number;
  readonly bPct: number;
  readonly cPct: number;
  readonly salt: string;
  readonly ratingX10: number;
  readonly ratingsCount: number;
}

export interface PaywallAbPublishRequest {
  readonly config: PaywallAbConfig;
  readonly expectedRevision: number;
  readonly idempotencyKey: string;
  readonly reason: string;
  readonly requestId: string;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function integer(value: unknown, label: string, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new HttpsError('invalid-argument', `${label} must be an integer from ${min} to ${max}`);
  return parsed;
}

function normalizeConfig(value: unknown): PaywallAbConfig {
  const data = record(value);
  return Object.freeze({
    aPct: integer(data.aPct ?? data.a_pct ?? 0, 'aPct', 0, 100),
    bPct: integer(data.bPct ?? data.b_pct ?? 0, 'bPct', 0, 100),
    cPct: integer(data.cPct ?? data.c_pct ?? 0, 'cPct', 0, 100),
    salt: String(data.salt ?? 'v3').trim().slice(0, 64) || 'v3',
    ratingX10: integer(data.ratingX10 ?? data.rating_x10 ?? 0, 'ratingX10', 0, 50),
    ratingsCount: integer(data.ratingsCount ?? data.ratings_count ?? 0, 'ratingsCount', 0, 100_000_000),
  });
}

export function parsePaywallAbPublishRequest(value: unknown): PaywallAbPublishRequest {
  const data = record(value);
  const config = normalizeConfig(data.config);
  if (config.aPct + config.bPct + config.cPct > 100) throw new HttpsError('invalid-argument', 'traffic allocation must not exceed 100');
  if (config.ratingX10 > 0 && config.ratingX10 < 10) throw new HttpsError('invalid-argument', 'ratingX10 must be zero or from 10 to 50');
  const expectedRevision = integer(data.expectedRevision, 'expectedRevision', 0, Number.MAX_SAFE_INTEGER);
  const idempotencyKey = String(data.idempotencyKey ?? '').trim();
  const reason = String(data.reason ?? '').trim().slice(0, 500);
  const requestId = String(data.requestId ?? '').trim();
  if (!idempotencyKey || idempotencyKey.length > 160 || !reason || !requestId) throw new HttpsError('invalid-argument', 'idempotencyKey, reason and requestId are required');
  return Object.freeze({ config, expectedRevision, idempotencyKey, reason, requestId });
}

function emptyVariant() {
  return { shown: 0, ctaClick: 0, trialStarted: 0, purchaseCompleted: 0, close: 0, purchaseCancelled: 0, uniqueShown: 0 };
}

export function aggregatePaywallFunnel(rows: readonly FunnelRow[], includeDev: boolean) {
  const variants: Record<Variant, ReturnType<typeof emptyVariant>> = { A: emptyVariant(), B: emptyVariant(), C: emptyVariant(), v1: emptyVariant() };
  const unique = new Map<Variant, Set<string>>(VARIANTS.map((variant) => [variant, new Set<string>()]));
  const contexts: Record<string, { shown: number; trialStarted: number; purchaseCompleted: number }> = {};
  const plans: Record<string, number> = {};
  let totalEvents = 0;
  let excludedDevEvents = 0;
  for (const row of rows) {
    if (!includeDev && row.dev === true) { excludedDevEvents += 1; continue; }
    const variant = String(row.variant ?? '') as Variant;
    const step = String(row.step ?? '') as Step;
    if (!VARIANTS.includes(variant) || !STEPS.includes(step)) continue;
    totalEvents += 1;
    const target = variants[variant];
    const key = step === 'cta_click' ? 'ctaClick' : step === 'trial_started' ? 'trialStarted' : step === 'purchase_completed' ? 'purchaseCompleted' : step === 'purchase_cancelled' ? 'purchaseCancelled' : step;
    target[key as keyof typeof target] += 1;
    if (step === 'shown' && String(row.uidh ?? '')) unique.get(variant)?.add(String(row.uidh));
    const context = String(row.context ?? 'generic').trim().slice(0, 100) || 'generic';
    const contextTarget = contexts[context] ?? (contexts[context] = { shown: 0, trialStarted: 0, purchaseCompleted: 0 });
    if (step === 'shown') contextTarget.shown += 1;
    if (step === 'trial_started') contextTarget.trialStarted += 1;
    if (step === 'purchase_completed') {
      contextTarget.purchaseCompleted += 1;
      const plan = String(row.plan ?? 'other').trim().slice(0, 50) || 'other';
      plans[plan] = (plans[plan] ?? 0) + 1;
    }
  }
  for (const variant of VARIANTS) variants[variant].uniqueShown = unique.get(variant)?.size ?? 0;
  return { totalEvents, excludedDevEvents, variants, contexts, plans };
}

function roleFor(request: { auth?: { token?: unknown; uid: string } }) {
  if (!request.auth?.token || record(request.auth.token).admin !== true) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(record(request.auth.token));
  if (!role) throw new HttpsError('permission-denied', 'adminRole claim required');
  return role;
}

export const adminGetPaywallAbWorkspace = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'application.config.write') && !hasPermission(role, 'money.read')) throw new HttpsError('permission-denied', 'Role cannot read Paywall A/B');
    const data = record(request.data);
    const rangeDays = integer(data.rangeDays ?? 28, 'rangeDays', 1, 90);
    if (![7, 28, 90].includes(rangeDays)) throw new HttpsError('invalid-argument', 'rangeDays must be 7, 28 or 90');
    const includeDev = data.includeDev === true;
    const now = Date.now();
    const db = admin.firestore();
    const [configSnap, funnelSnap, historySnap] = await Promise.all([
      db.collection('remote_config').doc(CONFIG_ID).get(),
      db.collection('paywall_funnel').where('ts', '>=', now - rangeDays * 86_400_000).where('ts', '<=', now).orderBy('ts').limit(FUNNEL_CAP + 1).get(),
      db.collection('remote_config_history').limit(200).get(),
    ]);
    const rawConfig = configSnap.data() ?? {};
    const rows = funnelSnap.docs.slice(0, FUNNEL_CAP).map((doc) => doc.data() as FunnelRow);
    const history = historySnap.docs
      .map((doc): Record<string, unknown> & { id: string } => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .filter((item) => record(item.entity).id === CONFIG_ID || item.doc === CONFIG_ID)
      .sort((left, right) => String(right.timestamp ?? right.at ?? '').localeCompare(String(left.timestamp ?? left.at ?? '')))
      .slice(0, 30);
    return {
      ok: true,
      config: { ...normalizeConfig(rawConfig), revision: integer(rawConfig.revision ?? 0, 'revision', 0, Number.MAX_SAFE_INTEGER), updatedBy: String(rawConfig.updatedBy ?? '') },
      analytics: aggregatePaywallFunnel(rows, includeDev),
      source: { state: rows.length ? (funnelSnap.size > FUNNEL_CAP ? 'partial' : 'ready') : 'empty', count: rows.length, truncated: funnelSnap.size > FUNNEL_CAP },
      rangeDays,
      includeDev,
      history,
      generatedAtMs: now,
    };
  },
);

export const adminPublishPaywallAb = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'application.config.write')) throw new HttpsError('permission-denied', 'Role cannot publish Paywall A/B');
    const input = parsePaywallAbPublishRequest(request.data);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const configRef = db.collection('remote_config').doc(CONFIG_ID);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection('remote_config_history').doc();
    const fingerprint = JSON.stringify(input.config);
    const timestamp = new Date().toISOString();
    return db.runTransaction(async (tx) => {
      const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() ?? {};
        if (previous.requestFingerprint !== fingerprint) throw new HttpsError('already-exists', 'idempotencyKey was already used for another payload');
        return { ok: true, revision: Number(previous.revision ?? 0), auditId: String(previous.auditId ?? ''), replayed: true };
      }
      const before = configSnap.data() ?? {};
      const currentRevision = integer(before.revision ?? 0, 'revision', 0, Number.MAX_SAFE_INTEGER);
      if (currentRevision !== input.expectedRevision) throw new HttpsError('failed-precondition', 'Paywall A/B changed; reload before publishing');
      const after = {
        a_pct: input.config.aPct,
        b_pct: input.config.bPct,
        c_pct: input.config.cPct,
        salt: input.config.salt,
        rating_x10: input.config.ratingX10,
        ratings_count: input.config.ratingsCount,
        revision: currentRevision + 1,
        updatedBy: actorUid,
      };
      const audit = createAuditRecord({
        action: 'paywall_ab.publish', actorUid, role,
        entity: { collection: 'remote_config', id: CONFIG_ID },
        reason: input.reason, before, after, rollbackReference: historyRef.id,
        requestId: input.requestId, timestamp,
      });
      tx.set(configRef, { ...after, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.create(historyRef, { ...audit, doc: CONFIG_ID, operationId: input.idempotencyKey, revision: currentRevision + 1 });
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, { operationId: input.idempotencyKey, requestFingerprint: fingerprint, auditId: auditRef.id, revision: currentRevision + 1, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, revision: currentRevision + 1, auditId: auditRef.id, replayed: false };
    });
  },
);
