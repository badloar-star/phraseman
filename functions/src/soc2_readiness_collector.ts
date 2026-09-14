import * as crypto from 'node:crypto';
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { withCronHeartbeat } from './cron_heartbeat';

export const SOC2_AUTOMATED_CONTROLS = [
  'access-review', 'change-release', 'dependency-review', 'backup-restore',
  'incident-tabletop', 'vendor-review', 'privacy-deletion', 'availability-baseline',
] as const;
export const SOC2_MANIFESTS = 'soc2_evidence_manifests';
export const SOC2_PROJECTION = 'soc2_automated_control_projection';
export const SOC2_STATE = 'soc2_automation_state';
export const SOC2_RUNS = 'soc2_evidence_runs';
export const SOC2_SCHEMA_VERSION = 'soc2-evidence-manifest-v1';
export const SOC2_MAX_AUTH_USERS = 1000;
export const SOC2_MAX_AUDIT_ROWS = 500;
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export type SourceResultStatus = 'pass' | 'failed' | 'blocked';
export type SourceResult = {
  controlId: string;
  evidenceId: string;
  source: string;
  result: SourceResultStatus;
  populationSummary: Record<string, number | string | boolean>;
  exceptions: string[];
  sourceRevision: string;
  collectedAt?: string;
};

export type EvidenceManifest = {
  schemaVersion: typeof SOC2_SCHEMA_VERSION;
  runId: string;
  collectedAt: string;
  windowStart: string;
  windowEnd: string;
  controlId: string;
  evidenceId: string;
  source: string;
  populationSummary: Record<string, number | string | boolean>;
  result: SourceResultStatus;
  exceptions: string[];
  sourceRevision: string;
  checksum: string;
  startedAt: string;
  completedAt: string;
};

export type CollectionContext = {
  runId: string;
  collectedAt: string;
  windowStart: string;
  windowEnd: string;
  sources: SourceResult[];
};

export function boundText(value: unknown, max: number): string {
  return String(value ?? '').slice(0, Math.max(0, max));
}

export function sha256Text(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function buildWeeklyRunId(now: Date): string {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return `weekly-${monday.toISOString().slice(0, 10)}`;
}

// Compatibility alias for local tooling created during the initial daily design.
export const buildDailyRunId = buildWeeklyRunId;

export function redactAdminIds(ids: string[]): { count: number; sha256: string } {
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))].sort();
  return { count: unique.length, sha256: sha256Text(unique.join('\n')) };
}

export function classifyFreshness(collectedAt: Date, maxAgeDays: number, asOf: Date): 'fresh' | 'stale' {
  return asOf.getTime() - collectedAt.getTime() <= maxAgeDays * DAY_MS ? 'fresh' : 'stale';
}

function safeException(value: unknown): string {
  return boundText(String(value ?? 'unknown').replace(/[^a-zA-Z0-9_.:-]/g, '_'), 160);
}

function sourceError(controlId: string, evidenceId: string, source: string, error: unknown): SourceResult {
  return {
    controlId, evidenceId, source, result: 'failed', populationSummary: { count: 0 },
    exceptions: [`collector_error:${safeException(error instanceof Error ? error.message : error)}`],
    sourceRevision: source,
  };
}

export async function collectAdminAccessSummary(auth: Pick<admin.auth.Auth, 'listUsers'>): Promise<SourceResult> {
  try {
    const page = await auth.listUsers(SOC2_MAX_AUTH_USERS);
    const ids = page.users.map((user) => user.uid);
    const redacted = redactAdminIds(ids);
    const truncated = Boolean(page.pageToken);
    return {
      controlId: 'access-review', evidenceId: 'AUTO-CC6.2-ACCESS', source: 'firebase-auth',
      result: truncated ? 'blocked' : 'pass',
      populationSummary: { ...redacted, truncated },
      exceptions: truncated ? ['population_truncated'] : [], sourceRevision: 'firebase-auth-v1',
    };
  } catch (error) {
    return sourceError('access-review', 'AUTO-CC6.2-ACCESS', 'firebase-auth', error);
  }
}

export async function collectAdminAuditSummary(
  db: Pick<FirebaseFirestore.Firestore, 'collection'>,
  windowStartIso: string,
  windowEndIso: string,
): Promise<SourceResult> {
  try {
    const snapshot = await db.collection('admin_log')
      .where('timestamp', '>=', windowStartIso)
      .where('timestamp', '<', windowEndIso)
      .orderBy('timestamp', 'asc')
      .limit(SOC2_MAX_AUDIT_ROWS + 1)
      .get();
    const rows = snapshot.docs.slice(0, SOC2_MAX_AUDIT_ROWS).map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return { action: boundText(data.action, 120), timestamp: boundText(data.timestamp, 64) };
    });
    const truncated = snapshot.size > SOC2_MAX_AUDIT_ROWS;
    const actionCounts = rows.reduce<Record<string, number>>((counts, row) => {
      counts[row.action || 'unknown'] = (counts[row.action || 'unknown'] || 0) + 1;
      return counts;
    }, {});
    return {
      controlId: 'change-release', evidenceId: 'AUTO-CC8.1-ADMIN-LOG', source: 'firestore-admin-log',
      result: truncated ? 'blocked' : 'pass',
      populationSummary: {
        count: rows.length, truncated, actionTypes: Object.keys(actionCounts).length,
        actionTypesSha256: sha256Text(JSON.stringify(actionCounts)),
        rowsSha256: sha256Text(JSON.stringify(rows)),
      },
      exceptions: truncated ? ['audit_population_truncated'] : [], sourceRevision: 'admin-log-v1',
    };
  } catch (error) {
    return sourceError('change-release', 'AUTO-CC8.1-ADMIN-LOG', 'firestore-admin-log', error);
  }
}

export function buildUnsupportedSourceResult(controlId: string, reason: string): SourceResult {
  return {
    controlId, evidenceId: `BLOCKED-${controlId.toUpperCase()}`, source: 'not-integrated', result: 'blocked',
    populationSummary: { count: 0 }, exceptions: [boundText(reason, 2000)], sourceRevision: 'none',
  };
}

export function buildWeeklyCollection(context: CollectionContext): EvidenceManifest[] {
  const sourceByControl = new Map(context.sources.map((source) => [source.controlId, source]));
  const unsupported = new Map([
    ['dependency-review', 'dependency_scan_not_integrated'],
    ['backup-restore', 'restore_test_requires_human_execution'],
    ['incident-tabletop', 'incident_exercise_requires_human_execution'],
    ['vendor-review', 'vendor_review_requires_human_approval'],
    ['privacy-deletion', 'privacy_review_requires_human_approval'],
    ['availability-baseline', 'availability_slo_source_not_approved'],
  ]);
  return SOC2_AUTOMATED_CONTROLS.map((controlId) => {
    const source = sourceByControl.get(controlId) || buildUnsupportedSourceResult(controlId, unsupported.get(controlId) || 'source_not_collected');
    const startedAt = context.collectedAt;
    const completedAt = context.collectedAt;
    const base = {
      schemaVersion: SOC2_SCHEMA_VERSION as typeof SOC2_SCHEMA_VERSION,
      runId: context.runId, collectedAt: context.collectedAt, windowStart: context.windowStart,
      windowEnd: context.windowEnd, controlId: source.controlId, evidenceId: source.evidenceId,
      source: source.source, populationSummary: source.populationSummary, result: source.result,
      exceptions: source.exceptions.map((exception) => boundText(exception, 2000)),
      sourceRevision: boundText(source.sourceRevision, 120), startedAt, completedAt,
    };
    return { ...base, checksum: sha256Text(JSON.stringify(base)) };
  });
}

// Compatibility alias for callers created during the initial daily design.
export const buildDailyCollection = buildWeeklyCollection;

export function projectionFromManifest(manifest: EvidenceManifest, nowIso: string): Record<string, unknown> {
  return {
    schemaVersion: 'soc2-automated-projection-v1', controlId: manifest.controlId,
    status: manifest.result === 'pass' ? 'fresh' : manifest.result,
    evidenceId: manifest.evidenceId, source: manifest.source, lastRunId: manifest.runId,
    collectedAt: manifest.collectedAt, updatedAt: nowIso, manifestRef: `${SOC2_MANIFESTS}/${manifest.runId}-${manifest.controlId}`,
    reason: manifest.exceptions[0] || '', checksum: manifest.checksum,
  };
}

export async function runSoc2ReadinessCollection(
  db: FirebaseFirestore.Firestore,
  auth: Pick<admin.auth.Auth, 'listUsers'>,
  now = new Date(),
): Promise<{ runId: string; manifests: number; blocked: number; failed: number }> {
  const runId = buildWeeklyRunId(now);
  const collectedAt = now.toISOString();
  const windowEnd = collectedAt;
  const windowStart = new Date(now.getTime() - WEEK_MS).toISOString();
  const runRef = db.collection(SOC2_RUNS).doc(runId);
  const existing = await runRef.get();
  if (existing.exists && existing.data()?.status === 'completed') return { runId, manifests: 0, blocked: 0, failed: 0 };
  await runRef.set({ schemaVersion: 'soc2-run-v1', runId, status: 'running', startedAt: collectedAt }, { merge: true });
  try {
    const sources = [
      await collectAdminAccessSummary(auth),
      await collectAdminAuditSummary(db, windowStart, windowEnd),
    ];
    const manifests = buildWeeklyCollection({ runId, collectedAt, windowStart, windowEnd, sources });
    const batch = db.batch();
    manifests.forEach((manifest) => {
      batch.set(db.collection(SOC2_MANIFESTS).doc(`${runId}-${manifest.controlId}`), manifest);
      batch.set(db.collection(SOC2_PROJECTION).doc(manifest.controlId), projectionFromManifest(manifest, collectedAt), { merge: true });
    });
    const blocked = manifests.filter((manifest) => manifest.result === 'blocked').length;
    const failed = manifests.filter((manifest) => manifest.result === 'failed').length;
    batch.set(db.collection(SOC2_STATE).doc('latest'), {
      schemaVersion: 'soc2-automation-state-v1', lastRunId: runId, collectedAt,
      status: failed > 0 ? 'failed' : blocked > 0 ? 'blocked' : 'ok',
      manifests: manifests.length, blocked, failed, updatedAt: collectedAt,
    });
    batch.set(db.collection(SOC2_RUNS).doc(runId).collection('events').doc('completed'), {
      schemaVersion: 'soc2-run-event-v1', eventType: 'completed', runId, at: collectedAt,
      manifests: manifests.length, blocked, failed,
    });
    batch.set(runRef, { status: 'completed', completedAt: collectedAt, manifests: manifests.length, blocked, failed }, { merge: true });
    await batch.commit();
    return { runId, manifests: manifests.length, blocked, failed };
  } catch (error) {
    await runRef.set({ status: 'failed', failedAt: new Date().toISOString(), error: safeException(error) }, { merge: true });
    throw error;
  }
}

export const soc2ReadinessCollectorCron = onSchedule(
  { schedule: '0 4 * * 1', timeZone: 'UTC', retryCount: 3, maxInstances: 1 },
  withCronHeartbeat('soc2ReadinessCollectorCron', async () => {
    const result = await runSoc2ReadinessCollection(admin.firestore(), admin.auth());
    return { manifests: result.manifests, blocked: result.blocked, failed: result.failed };
  }),
);
