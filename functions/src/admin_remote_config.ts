import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { createAuditRecord } from './admin/audit_contract';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';

const REGION = 'us-central1';
const REMOTE_CONFIG_ID = 'app';
const ALLOWED_KEYS = new Set(['bools', 'numbers', 'texts', 'version']);

export interface RemoteConfigRequest {
  readonly nextConfig: Readonly<Record<string, unknown>>;
  readonly expectedRevision: number;
  readonly idempotencyKey: string;
  readonly reason: string;
  readonly requestId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateConfigPatch(config: Readonly<Record<string, unknown>>): void {
  for (const branch of ['bools', 'numbers', 'texts'] as const) {
    if (!(branch in config)) continue;
    const value = config[branch];
    if (!isRecord(value)) throw new HttpsError('invalid-argument', `${branch} must be an object`);
    for (const [key, item] of Object.entries(value)) {
      if (!key.trim() || (branch === 'bools' && typeof item !== 'boolean') || (branch === 'numbers' && (typeof item !== 'number' || !Number.isFinite(item))) || (branch === 'texts' && typeof item !== 'string')) {
        throw new HttpsError('invalid-argument', `invalid ${branch}.${key}`);
      }
    }
  }
  if ('version' in config && (typeof config.version !== 'number' || !Number.isInteger(config.version) || config.version < 1)) {
    throw new HttpsError('invalid-argument', 'version must be a positive integer');
  }
}

export function parseRemoteConfigRequest(data: unknown): RemoteConfigRequest {
  if (!isRecord(data) || !isRecord(data.nextConfig)) {
    throw new HttpsError('invalid-argument', 'nextConfig object required');
  }
  const expectedRevision = Number(data.expectedRevision);
  const idempotencyKey = String(data.idempotencyKey ?? '').trim();
  const reason = String(data.reason ?? '').trim().slice(0, 500);
  const requestId = String(data.requestId ?? '').trim();
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new HttpsError('invalid-argument', 'expectedRevision must be a non-negative integer');
  }
  if (!idempotencyKey || idempotencyKey.length > 120 || !reason || !requestId) {
    throw new HttpsError('invalid-argument', 'idempotencyKey, reason and requestId are required');
  }
  const nextConfig = data.nextConfig;
  const unknownKeys = Object.keys(nextConfig).filter((key) => !ALLOWED_KEYS.has(key));
  if (unknownKeys.length > 0 || Object.keys(nextConfig).length === 0) {
    throw new HttpsError('invalid-argument', 'nextConfig contains unsupported or empty fields');
  }
  validateConfigPatch(nextConfig);
  return Object.freeze({ nextConfig: Object.freeze({ ...nextConfig }), expectedRevision, idempotencyKey, reason, requestId });
}

function resolveRole(token: Record<string, unknown>): AdminRole | null {
  const claimed = token.adminRole;
  return hasAdminRole(claimed) ? claimed : null;
}

export const adminPublishRemoteConfig = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const input = parseRemoteConfigRequest(request.data);
    const actorUid = request.auth.uid;
    const role = resolveRole(request.auth.token as Record<string, unknown>);
    if (!role) throw new HttpsError('permission-denied', 'adminRole claim required');
    if (!hasPermission(role, 'application.config.write')) {
      throw new HttpsError('permission-denied', 'Role cannot publish remote config');
    }
    const db = admin.firestore();
    const configRef = db.collection('remote_config').doc(REMOTE_CONFIG_ID);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection('remote_config_history').doc();
    const now = new Date().toISOString();

    return db.runTransaction(async (tx) => {
      const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() ?? {};
        if (previous.requestFingerprint !== JSON.stringify(input.nextConfig)) {
          throw new HttpsError('already-exists', 'idempotencyKey was already used for another payload');
        }
        return {
          ok: true,
          auditId: String(previous.auditId ?? ''),
          revision: Number(previous.revision ?? 0),
          replayed: true,
        };
      }

      const before = (configSnap.data() ?? {}) as Record<string, unknown>;
      const currentRevision = Number(before.revision ?? 0);
      if (!Number.isInteger(currentRevision) || currentRevision !== input.expectedRevision) {
        throw new HttpsError('failed-precondition', 'remote config changed; reload before publishing');
      }
      const after = { ...before, ...input.nextConfig, revision: currentRevision + 1, updatedBy: actorUid };
      const audit = createAuditRecord({
        action: 'remote_config.publish',
        actorUid,
        role,
        entity: { collection: 'remote_config', id: REMOTE_CONFIG_ID },
        reason: input.reason,
        before,
        after,
        rollbackReference: historyRef.id,
        requestId: input.requestId,
        timestamp: now,
      });

      tx.set(configRef, { ...after, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.create(historyRef, { ...audit, operationId: input.idempotencyKey, revision: currentRevision + 1 });
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, {
        operationId: input.idempotencyKey,
        requestFingerprint: JSON.stringify(input.nextConfig),
        auditId: auditRef.id,
        revision: currentRevision + 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, auditId: auditRef.id, revision: currentRevision + 1, replayed: false };
    });
  },
);
