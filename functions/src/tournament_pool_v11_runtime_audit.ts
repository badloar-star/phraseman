import { createHash } from 'node:crypto';

import { TOURNAMENT_V11_EXPOSURE_EPOCH_DAY } from './tournament_core';
import {
  TOURNAMENT_POOL_V11_VERSION,
  TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS,
  type FinalizedTournamentV11TaskPool,
  type TournamentV11Task,
} from './tournament_pool_v11_factory';
import { TOURNAMENT_MODES } from './tournament_pool_plan';
import { TOURNAMENT_TASKS_PER_MODE_SLICE } from './tournament_pool_plan';
import {
  buildTournamentRounds,
  tournamentExposureBucketId,
  type TournamentPoolBarrierToken,
} from './tournaments';

export type TournamentV11RuntimeAudit = Readonly<{
  kind: 'tournament_pool_v11_runtime_audit_v1';
  poolVersion: typeof TOURNAMENT_POOL_V11_VERSION;
  days: 730;
  roomSeries: 2;
  roomsSimulated: 1_460;
  tasksPerRoom: 16;
  taskCount: 4_000;
  bucketCount: number;
  maxAdjacentTaskOverlap: 0;
  maxAdjacentProvenanceOverlap: 0;
  provenanceCollisions: 0;
  fullTaskCoverage: true;
  fullBucketCoverage: true;
  speedBoardsChecked: number;
  speedBoardsWithSixProvenance: number;
  taskIdsSha256: string;
  bucketIdsSha256: string;
  manifestSha256: string;
  bundleSha256: string;
  receiptLedgerSha256: string;
  exposureLayoutHash: string;
  auditSha256: string;
}>;

const verifiedRuntimeAudits = new Map<string, TournamentV11RuntimeAudit>();

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  throw new Error('tournament_v11_runtime_audit_invalid');
}

function sha256(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

export function validateTournamentV11RuntimeAudit(
  audit: TournamentV11RuntimeAudit,
  finalized: FinalizedTournamentV11TaskPool,
): void {
  const expectedBucketCount = Object.values(TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS)
    .reduce((sum, count) => sum + count, 0);
  const bucketLoads = new Map<string, number>();
  finalized.tasks.forEach((task) => bucketLoads.set(
    task.exposureBucket,
    (bucketLoads.get(task.exposureBucket) ?? 0) + 1,
  ));
  if (!audit || !exactKeys(audit, [
    'kind', 'poolVersion', 'days', 'roomSeries', 'roomsSimulated', 'tasksPerRoom', 'taskCount',
    'bucketCount', 'maxAdjacentTaskOverlap', 'maxAdjacentProvenanceOverlap', 'provenanceCollisions',
    'fullTaskCoverage', 'fullBucketCoverage', 'speedBoardsChecked', 'speedBoardsWithSixProvenance',
    'taskIdsSha256', 'bucketIdsSha256', 'manifestSha256', 'bundleSha256', 'receiptLedgerSha256',
    'exposureLayoutHash', 'auditSha256',
  ]) || audit.kind !== 'tournament_pool_v11_runtime_audit_v1'
    || audit.poolVersion !== finalized.poolVersion || audit.days !== 730 || audit.roomSeries !== 2
    || audit.roomsSimulated !== 1_460 || audit.tasksPerRoom !== 16 || audit.taskCount !== 4_000
    || audit.bucketCount !== expectedBucketCount || bucketLoads.size !== expectedBucketCount
    || [...bucketLoads.values()].some((count) => count > TOURNAMENT_TASKS_PER_MODE_SLICE)
    || audit.speedBoardsChecked < 1
    || audit.speedBoardsWithSixProvenance !== audit.speedBoardsChecked
    || audit.maxAdjacentTaskOverlap !== 0 || audit.maxAdjacentProvenanceOverlap !== 0
    || audit.provenanceCollisions !== 0 || audit.fullTaskCoverage !== true
    || audit.fullBucketCoverage !== true || audit.manifestSha256 !== finalized.manifestSha256
    || audit.bundleSha256 !== finalized.bundleSha256
    || audit.receiptLedgerSha256 !== finalized.receiptLedgerSha256
    || audit.exposureLayoutHash !== finalized.exposureLayoutHash
    || audit.taskIdsSha256 !== sha256(finalized.tasks.map(({ taskId }) => taskId).sort())
    || audit.bucketIdsSha256 !== sha256([...new Set(finalized.tasks.map(({ exposureBucket }) => exposureBucket))].sort())
    || audit.auditSha256 !== sha256(Object.fromEntries(
      Object.entries(audit).filter(([key]) => key !== 'auditSha256'),
    ))) throw new Error('tournament_v11_runtime_audit_invalid');
}

export function auditTournamentV11RuntimePool(
  finalized: FinalizedTournamentV11TaskPool,
): TournamentV11RuntimeAudit {
  if (!finalized || finalized.poolVersion !== TOURNAMENT_POOL_V11_VERSION
    || finalized.taskCount !== 4_000 || finalized.tasks.length !== 4_000) {
    throw new Error('tournament_v11_runtime_audit_invalid');
  }
  const cached = verifiedRuntimeAudits.get(finalized.bundleSha256);
  if (cached) {
    validateTournamentV11RuntimeAudit(cached, finalized);
    return cached;
  }
  const tasks = finalized.tasks;
  const byId = new Map(tasks.map((task) => [task.taskId, task] as const));
  const byBucket = new Map<string, TournamentV11Task[]>();
  for (const task of tasks) {
    const bucket = byBucket.get(task.exposureBucket) ?? [];
    bucket.push(task);
    byBucket.set(task.exposureBucket, bucket);
  }
  const token: TournamentPoolBarrierToken = {
    generation: finalized.poolVersion,
    revision: 0,
    exposureBucketCounts: finalized.exposureBucketCounts,
    exposureLayoutHash: finalized.exposureLayoutHash,
    taskCount: finalized.taskCount,
    manifestSha256: finalized.manifestSha256,
    bundleSha256: finalized.bundleSha256,
    receiptLedgerSha256: finalized.receiptLedgerSha256,
  };
  const taskIdsSeen = new Set<string>();
  const bucketIdsSeen = new Set<string>();
  const previousTaskIds = new Map<string, Set<string>>();
  const previousProvenance = new Map<string, Set<string>>();
  let speedBoardsChecked = 0;
  let speedBoardsWithSixProvenance = 0;
  for (let day = 0; day < 730; day += 1) {
    const dayOrdinal = TOURNAMENT_V11_EXPOSURE_EPOCH_DAY + day;
    const buckets = TOURNAMENT_MODES.map((mode) => tournamentExposureBucketId(token, mode, dayOrdinal));
    buckets.forEach((bucket) => bucketIdsSeen.add(bucket));
    const pool = buckets.flatMap((bucket) => (
      byBucket.get(bucket) ?? []
    ).slice(0, TOURNAMENT_TASKS_PER_MODE_SLICE));
    const date = new Date(dayOrdinal * 86_400_000).toISOString().slice(0, 10);
    for (const [series, roomId] of [
      ['daily_1200', `daily_1200_${date}`],
      ['daily_1900_r1', `daily_1900_${date}_r1`],
    ] as const) {
      const rounds = buildTournamentRounds(roomId, pool);
      if (!rounds) throw new Error(`tournament_v11_runtime_audit_shortage:${day}:${series}`);
      const roomTaskIds = new Set(rounds.flatMap(({ taskIds }) => taskIds));
      if (roomTaskIds.size !== 16) throw new Error('tournament_v11_runtime_audit_shortage');
      const roomTasks = [...roomTaskIds].map((taskId) => byId.get(taskId)).filter((task): task is TournamentV11Task => Boolean(task));
      if (roomTasks.length !== 16) throw new Error('tournament_v11_runtime_audit_invalid');
      const provenance = roomTasks.flatMap((task) => task.provenanceKeys);
      const roomProvenance = new Set(provenance);
      if (roomProvenance.size !== provenance.length) throw new Error('tournament_v11_runtime_audit_provenance');
      const previousIds = previousTaskIds.get(series);
      const previousKeys = previousProvenance.get(series);
      if (previousIds && [...roomTaskIds].some((id) => previousIds.has(id))) {
        throw new Error(`tournament_v11_runtime_audit_adjacent_task:${day}:${series}`);
      }
      if (previousKeys && [...roomProvenance].some((key) => previousKeys.has(key))) {
        throw new Error(`tournament_v11_runtime_audit_adjacent_provenance:${day}:${series}`);
      }
      previousTaskIds.set(series, roomTaskIds);
      previousProvenance.set(series, roomProvenance);
      for (const task of roomTasks) {
        taskIdsSeen.add(task.taskId);
        if (task.mode === 'speed_match') {
          speedBoardsChecked += 1;
          if (task.provenanceKeys.length === 6) speedBoardsWithSixProvenance += 1;
        }
      }
    }
  }
  if (taskIdsSeen.size !== tasks.length || bucketIdsSeen.size !== byBucket.size
    || speedBoardsWithSixProvenance !== speedBoardsChecked) {
    const unseen = tasks.filter((task) => !taskIdsSeen.has(task.taskId)).slice(0, 20).map((task) => ({
      taskId: task.taskId, mode: task.mode, difficulty: task.difficulty,
      exposureBucket: task.exposureBucket,
      parity: task.tags.find((tag) => tag.startsWith('provenance-parity:')),
    }));
    throw new Error(`tournament_v11_runtime_audit_coverage:tasks=${taskIdsSeen.size}:buckets=${bucketIdsSeen.size}:speed=${speedBoardsWithSixProvenance}/${speedBoardsChecked}:unseen=${JSON.stringify(unseen)}`);
  }
  const body = Object.freeze({
    kind: 'tournament_pool_v11_runtime_audit_v1' as const,
    poolVersion: TOURNAMENT_POOL_V11_VERSION,
    days: 730 as const,
    roomSeries: 2 as const,
    roomsSimulated: 1_460 as const,
    tasksPerRoom: 16 as const,
    taskCount: 4_000 as const,
    bucketCount: byBucket.size,
    maxAdjacentTaskOverlap: 0 as const,
    maxAdjacentProvenanceOverlap: 0 as const,
    provenanceCollisions: 0 as const,
    fullTaskCoverage: true as const,
    fullBucketCoverage: true as const,
    speedBoardsChecked,
    speedBoardsWithSixProvenance,
    taskIdsSha256: sha256(tasks.map(({ taskId }) => taskId).sort()),
    bucketIdsSha256: sha256([...byBucket.keys()].sort()),
    manifestSha256: finalized.manifestSha256,
    bundleSha256: finalized.bundleSha256,
    receiptLedgerSha256: finalized.receiptLedgerSha256,
    exposureLayoutHash: finalized.exposureLayoutHash,
  });
  const audit = Object.freeze({ ...body, auditSha256: sha256(body) });
  validateTournamentV11RuntimeAudit(audit, finalized);
  verifiedRuntimeAudits.set(finalized.bundleSha256, audit);
  return audit;
}
