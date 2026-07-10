import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import { createGenerationJob, type FactorySurface } from './content_factory/contracts';

const REGION = 'us-central1';
const SURFACES: readonly FactorySurface[] = ['lessons', 'vocabulary', 'drills', 'quizzes', 'cards', 'arena_questions'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface ContentFactoryJobRequest {
  readonly projectId: string;
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly lessonIds: readonly number[];
  readonly surfaces: readonly FactorySurface[];
  readonly idempotencyKey: string;
  readonly blueprintVersion: string;
}

export function parseContentFactoryJobRequest(data: unknown): ContentFactoryJobRequest {
  if (!isRecord(data) || !Array.isArray(data.lessonIds) || !Array.isArray(data.surfaces)) {
    throw new HttpsError('invalid-argument', 'lessonIds and surfaces are required');
  }
  const lessonIds = data.lessonIds.map(Number);
  const surfaces = data.surfaces.map(String) as FactorySurface[];
  if (!lessonIds.every(Number.isInteger) || lessonIds.length > 100 || lessonIds.some((id) => id < 1)) {
    throw new HttpsError('invalid-argument', 'lessonIds must contain 1..100 positive integers');
  }
  if (!surfaces.length || surfaces.some((surface) => !SURFACES.includes(surface))) {
    throw new HttpsError('invalid-argument', 'unsupported generation surface');
  }
  const result = {
    projectId: String(data.projectId ?? '').trim(),
    studyTarget: String(data.studyTarget ?? '').trim(),
    sourceLocale: String(data.sourceLocale ?? '').trim(),
    lessonIds,
    surfaces,
    idempotencyKey: String(data.idempotencyKey ?? '').trim(),
    blueprintVersion: String(data.blueprintVersion ?? '').trim(),
  };
  if (Object.values(result).some((value) => typeof value === 'string' && !value)) {
    throw new HttpsError('invalid-argument', 'project, language, locale, operation and blueprint are required');
  }
  return Object.freeze({ ...result, lessonIds: Object.freeze([...lessonIds]), surfaces: Object.freeze([...surfaces]) });
}

function roleFromToken(token: Record<string, unknown>): AdminRole {
  return hasAdminRole(token.adminRole) ? token.adminRole : 'admin';
}

export const adminCreateContentGenerationJob = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!hasPermission(role, 'content.draft.write')) throw new HttpsError('permission-denied', 'Role cannot create content drafts');
    const actorUid = request.auth.uid;
    const input = parseContentFactoryJobRequest(request.data);
    const job = createGenerationJob({ ...input, requestedBy: actorUid });
    const db = admin.firestore();
    const jobRef = db.collection('content_factory_jobs').doc(job.idempotencyKey);
    return db.runTransaction(async (tx) => {
      const existing = await tx.get(jobRef);
      if (existing.exists) {
        const previous = existing.data() ?? {};
        if (previous.projectId !== job.projectId || previous.studyTarget !== job.studyTarget) {
          throw new HttpsError('already-exists', 'idempotencyKey belongs to another job');
        }
        return { ok: true, jobId: job.idempotencyKey, state: previous.state ?? 'queued', replayed: true };
      }
      tx.create(jobRef, { ...job, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.create(db.collection('admin_log').doc(), {
        action: 'content_factory.job.create',
        actorUid,
        role,
        entity: { collection: 'content_factory_jobs', id: job.idempotencyKey },
        reason: 'Language Factory generation job created',
        requestId: String(request.data && isRecord(request.data) ? request.data.requestId ?? '' : ''),
        timestamp: new Date().toISOString(),
        operationId: job.idempotencyKey,
      });
      return { ok: true, jobId: job.idempotencyKey, state: job.state, replayed: false };
    });
  },
);
