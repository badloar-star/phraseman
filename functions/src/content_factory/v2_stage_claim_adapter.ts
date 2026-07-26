import type { Firestore, Query, Transaction } from 'firebase-admin/firestore';
import { selectRunnableV2Stages, transitionV2Stage, type V2StageRecord, type V2StageState } from './v2_stage_lifecycle';

const STAGES = 'content_v2_generation_stages';
const LEASE_MS = 10 * 60 * 1000;

export interface V2StageLease {
  readonly jobId: string;
  readonly stageId: string;
  readonly workerId: string;
  readonly leaseToken: string;
  readonly attempt: number;
  readonly leaseExpiresAtMs: number;
}

export interface V2StageClaimResult {
  readonly lease: V2StageLease | null;
  readonly reason?: 'no_runnable_stage';
}

type StageSnapshot = { readonly id: string; readonly exists: boolean; data(): Record<string, unknown> | undefined };

function token(value: unknown, label: string): string {
  const result = String(value ?? '').trim();
  if (!/^[A-Za-z0-9._:-]{1,180}$/.test(result)) throw new Error(`v2_stage_${label}_invalid`);
  return result;
}

function stageFromSnapshot(snapshot: StageSnapshot): V2StageRecord {
  const data = snapshot.data() ?? {};
  const dependsOn = Array.isArray(data.dependsOn) ? data.dependsOn.map(String) : [];
  return {
    stageId: token(data.stageId ?? snapshot.id, 'id'),
    dependsOn,
    state: String(data.state ?? '') as V2StageState,
    attempts: Number(data.attempts ?? 0),
    maxAttempts: Number(data.maxAttempts ?? 3),
    leaseExpiresAtMs: typeof data.leaseExpiresAtMs === 'number' ? data.leaseExpiresAtMs : undefined,
  };
}

function stageQuery(db: Firestore, jobId: string): Query {
  return db.collection(STAGES).where('jobId', '==', jobId);
}

/**
 * Atomically claims the next runnable V2 stage from the existing generation
 * queue. Dependencies, stale leases and attempt limits are evaluated inside
 * the transaction; no second queue is introduced.
 */
export async function claimNextV2Stage(db: Firestore, input: { readonly jobId: string; readonly workerId: string; readonly nowMs: number }): Promise<V2StageClaimResult> {
  const jobId = token(input.jobId, 'job_id');
  const workerId = token(input.workerId, 'worker_id');
  if (!Number.isSafeInteger(input.nowMs) || input.nowMs < 0) throw new Error('v2_stage_clock_invalid');
  return db.runTransaction(async (tx: Transaction) => {
    const querySnapshot = await tx.get(stageQuery(db, jobId));
    const snapshots = querySnapshot.docs as unknown as StageSnapshot[];
    const records = snapshots.map(stageFromSnapshot);
    const states = Object.fromEntries(records.map((item) => [item.stageId, item.state])) as Record<string, V2StageState>;
    const selectedId = selectRunnableV2Stages(records, input.nowMs)[0];
    if (!selectedId) return { lease: null, reason: 'no_runnable_stage' as const };
    const selectedSnapshot = snapshots.find((item) => stageFromSnapshot(item).stageId === selectedId);
    if (!selectedSnapshot) return { lease: null, reason: 'no_runnable_stage' as const };
    const next = transitionV2Stage(stageFromSnapshot(selectedSnapshot), 'start', { dependencyStates: states, nowMs: input.nowMs });
    const leaseToken = `${workerId}:${next.stageId}:${next.attempts}:${input.nowMs}`;
    const ref = db.collection(STAGES).doc(selectedSnapshot.id);
    tx.set(ref, { state: next.state, attempts: next.attempts, leaseExpiresAtMs: next.leaseExpiresAtMs, leaseToken, workerId, claimedAtMs: input.nowMs }, { merge: true });
    return { lease: Object.freeze({ jobId, stageId: next.stageId, workerId, leaseToken, attempt: next.attempts, leaseExpiresAtMs: next.leaseExpiresAtMs! }) };
  });
}

/** Completes a lease only when the same worker/token still owns the stage. */
export async function finishV2StageLease(db: Firestore, lease: V2StageLease, outcome: 'succeed' | 'fail'): Promise<boolean> {
  return db.runTransaction(async (tx: Transaction) => {
    const ref = db.collection(STAGES).doc(lease.stageId);
    const snapshot = await tx.get(ref);
    const data = snapshot.data() ?? {};
    if (!snapshot.exists || data.state !== 'running' || data.workerId !== lease.workerId || data.leaseToken !== lease.leaseToken) return false;
    const stage = stageFromSnapshot({ id: snapshot.id, exists: snapshot.exists, data: () => data });
    const next = transitionV2Stage(stage, outcome, { dependencyStates: {}, nowMs: lease.leaseExpiresAtMs - LEASE_MS });
    tx.set(ref, { state: next.state, leaseExpiresAtMs: null, leaseToken: null, workerId: null, finishedAtMs: lease.leaseExpiresAtMs - LEASE_MS }, { merge: true });
    return true;
  });
}
