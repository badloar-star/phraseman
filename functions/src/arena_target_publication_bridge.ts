import { createHash } from 'node:crypto';

import { validateArenaTaskForNewRoom } from './arena_target_quality';
import {
  arenaTargetPublicationFingerprint,
  arenaPublishedTaskDocumentId,
  parseArenaTargetPublicationState,
  resolveArenaStudyTarget,
  type ArenaStudyTarget,
  type ArenaTargetPublication,
} from './arena_target_registry';
import type { TournamentTask } from './tournament_core';
import {
  arenaTargetApprovalReceiptDocumentsMatch,
  isCompleteTournamentV11TargetBundleForPublication,
  tournamentV11TargetBundleRootPath,
  type TournamentV11TargetBundleRoot,
} from './tournament_pool_v11_bundle';
import {
  verifyTournamentPoolTaskProof,
  type ArenaPublication,
} from './tournament_pool_publication';

export const ARENA_PUBLICATION_PAGE_LIMIT = 400 as const;
export const ARENA_PUBLICATION_TASK_COUNT = 4_000 as const;
const HASH = /^[a-f0-9]{64}$/u;
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/u;
const TARGETS = new Set<ArenaStudyTarget>(['es', 'fr', 'de']);

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  throw new Error('arena_publication_value_invalid');
}

function sha256(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : canonical(value), 'utf8').digest('hex');
}

export function arenaPublicationExactEqual(left: unknown, right: unknown): boolean {
  return canonical(left) === canonical(right);
}

export function arenaPublicationSha256(value: unknown): string {
  return sha256(value);
}

export type ArenaPublicationRequest = Readonly<{
  studyTarget: Exclude<ArenaStudyTarget, 'en'>;
  bundleSha256: string;
  requestId: string;
}>;

/** Public admin mutation payload: no task data, approvals or pointers may be caller supplied. */
export function parseArenaPublicationRequest(value: unknown): ArenaPublicationRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const keys = Object.keys(row).sort().join(',');
  const studyTarget = resolveArenaStudyTarget(row.studyTarget);
  if (keys !== 'bundleSha256,requestId,studyTarget' || !studyTarget || !TARGETS.has(studyTarget)
    || typeof row.bundleSha256 !== 'string' || !HASH.test(row.bundleSha256)
    || typeof row.requestId !== 'string' || !REQUEST_ID.test(row.requestId)) return null;
  return { studyTarget: studyTarget as Exclude<ArenaStudyTarget, 'en'>,
    bundleSha256: row.bundleSha256, requestId: row.requestId };
}

export function arenaPublicationJobPath(
  studyTarget: Exclude<ArenaStudyTarget, 'en'>,
  bundleSha256: string,
  requestId: string,
): string {
  if (!TARGETS.has(studyTarget) || !HASH.test(bundleSha256) || !REQUEST_ID.test(requestId)) {
    throw new Error('arena_publication_request_invalid');
  }
  return `arena_target_publication_jobs/${studyTarget}_${bundleSha256}_${sha256(requestId)}`;
}

export type ArenaPublicationSourceRoot = Readonly<{
  kind: 'tournament_pool_v11_target_bundle_v2';
  publicationSchema: 'tournament-pool-v11-target-v2';
  studyTarget: Exclude<ArenaStudyTarget, 'en'>;
  poolVersion: string;
  manifestSha256: string;
  merkleRootSha256: string;
  factPackVersion: string;
  factPackSha256: string;
  taskCount: 4_000;
  taskIdsSha256: string;
  bundleSha256: string;
  receiptLedgerSha256: string;
  approvalSha256: string;
  approvalReceiptLedgerSha256: string;
  publicationFingerprint: string;
}>;

export function parseArenaPublicationSource(
  rootValue: unknown,
  checkpointValue: unknown,
  request: ArenaPublicationRequest,
  approvalReceiptDocuments: readonly unknown[],
): ArenaPublicationSourceRoot | null {
  if (!isCompleteTournamentV11TargetBundleForPublication(rootValue, checkpointValue)) return null;
  const root = rootValue as TournamentV11TargetBundleRoot;
  if (root.studyTarget !== request.studyTarget || root.bundleSha256 !== request.bundleSha256
    || !arenaTargetApprovalReceiptDocumentsMatch(root, approvalReceiptDocuments)) return null;
  const identity = {
    studyTarget: root.studyTarget,
    poolVersion: root.poolVersion,
    manifestSha256: root.manifestSha256,
    merkleRootSha256: root.merkleRootSha256,
    factPackVersion: root.factPack.version,
    factPackSha256: root.factPack.sha256,
  };
  return Object.freeze({
    kind: root.kind,
    publicationSchema: root.publicationSchema,
    ...identity,
    taskCount: root.taskCount,
    taskIdsSha256: root.runtimeAudit.taskIdsSha256,
    bundleSha256: root.bundleSha256,
    receiptLedgerSha256: root.receiptLedgerSha256,
    approvalSha256: root.approvals.approvalsSha256,
    approvalReceiptLedgerSha256: root.approvals.receiptLedgerSha256,
    publicationFingerprint: arenaTargetPublicationFingerprint(identity),
  }) as ArenaPublicationSourceRoot;
}

export type ArenaPublishedTask = TournamentTask & Readonly<{
  studyTarget: ArenaStudyTarget;
  publicationFingerprint: string;
  arenaPublication: ArenaPublication & Readonly<{
    manifestSha256: string;
    publicationFingerprint: string;
  }>;
}>;

/** Adds only derived publication metadata; authored task bytes remain unchanged and Merkle-bound. */
export function buildArenaPublicationTask(
  value: unknown,
  source: ArenaPublicationSourceRoot,
): ArenaPublishedTask {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('arena_publication_task_invalid');
  }
  const task = value as TournamentTask & { arenaPublication?: ArenaPublication };
  const proof = task.arenaPublication;
  const proofKeys = proof && typeof proof === 'object'
    ? Object.keys(proof).sort().join(',') : '';
  const validation = validateArenaTaskForNewRoom(task, {
    studyTarget: source.studyTarget,
    factPackVersion: source.factPackVersion,
    factPackSha256: source.factPackSha256,
  });
  if (!validation.ok || task.studyTarget !== source.studyTarget
    || task.publicationFingerprint !== undefined
    || task.poolVersion !== source.poolVersion
    || typeof task.semanticReceiptId !== 'string' || !HASH.test(task.semanticReceiptId)
    || typeof task.semanticReceiptSha256 !== 'string' || !HASH.test(task.semanticReceiptSha256)
    || !proof
    || proofKeys !== 'leafSha256,manifestSha256,merkleRootSha256,poolContentSha256,proof,schemaVersion'
    || proof.manifestSha256 !== source.manifestSha256
    || proof.poolContentSha256 !== source.manifestSha256
    || proof.merkleRootSha256 !== source.merkleRootSha256
    || proof.publicationFingerprint !== undefined
    || !verifyTournamentPoolTaskProof(task, source.merkleRootSha256)) {
    throw new Error('arena_publication_task_invalid');
  }
  return Object.freeze({
    ...task,
    studyTarget: source.studyTarget,
    publicationFingerprint: source.publicationFingerprint,
    arenaPublication: Object.freeze({
      ...proof,
      manifestSha256: source.manifestSha256,
      publicationFingerprint: source.publicationFingerprint,
    }),
  }) as ArenaPublishedTask;
}

export type ArenaPublicationBridgePhase = 'staging' | 'verifying' | 'ready';
export type ArenaPublicationBridgeCheckpoint = Readonly<{
  kind: 'arena-target-publication-bridge-checkpoint-v1';
  revision: number;
  createdAtMs: number;
  request: ArenaPublicationRequest;
  source: ArenaPublicationSourceRoot;
  previousTargetPublication: ArenaTargetPublication | null;
  phase: ArenaPublicationBridgePhase;
  stageCursor: string | null;
  verifyCursor: string | null;
  stagedCount: number;
  verifiedCount: number;
  orderedTaskIds: readonly string[];
}>;

export type ArenaPublicationBridgePersistence = Readonly<{
  get(path: string): Promise<unknown | null>;
  create(path: string, value: unknown): Promise<void>;
  compareAndSet(path: string, expectedRevision: number, value: unknown): Promise<void>;
  list(rootPath: string, afterId: string | null, limit: number): Promise<readonly Readonly<{ id: string; value: unknown }>[] >;
  createExactMany(entries: readonly Readonly<{ path: string; value: unknown }>[]): Promise<Readonly<{ created: number; reused: number }>>;
  getCurrentTargetPublication(studyTarget: ArenaStudyTarget): Promise<ArenaTargetPublication | null>;
}>;

function parseBridgeCheckpoint(value: unknown, request: ArenaPublicationRequest): ArenaPublicationBridgeCheckpoint {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('arena_publication_checkpoint_invalid');
  const row = value as ArenaPublicationBridgeCheckpoint;
  const keys = Object.keys(value).sort().join(',');
  const previous = row.previousTargetPublication === null
    ? null
    : parseArenaTargetPublicationState(row.previousTargetPublication, request.studyTarget);
  const fingerprint = row.source && arenaTargetPublicationFingerprint({
    studyTarget: row.source.studyTarget,
    poolVersion: row.source.poolVersion,
    manifestSha256: row.source.manifestSha256,
    merkleRootSha256: row.source.merkleRootSha256,
    factPackVersion: row.source.factPackVersion,
    factPackSha256: row.source.factPackSha256,
  });
  if (keys !== 'createdAtMs,kind,orderedTaskIds,phase,previousTargetPublication,request,revision,source,stageCursor,stagedCount,verifiedCount,verifyCursor'
    || row.kind !== 'arena-target-publication-bridge-checkpoint-v1'
    || canonical(row.request) !== canonical(request)
    || !Number.isSafeInteger(row.revision) || row.revision < 0
    || !Number.isSafeInteger(row.createdAtMs) || row.createdAtMs < 1
    || !['staging', 'verifying', 'ready'].includes(row.phase)
    || !Number.isSafeInteger(row.stagedCount) || row.stagedCount < 0 || row.stagedCount > ARENA_PUBLICATION_TASK_COUNT
    || !Number.isSafeInteger(row.verifiedCount) || row.verifiedCount < 0 || row.verifiedCount > ARENA_PUBLICATION_TASK_COUNT
    || !Array.isArray(row.orderedTaskIds) || row.orderedTaskIds.length !== row.stagedCount
    || new Set(row.orderedTaskIds).size !== row.orderedTaskIds.length
    || row.source.studyTarget !== request.studyTarget || row.source.bundleSha256 !== request.bundleSha256
    || row.source.publicationFingerprint !== fingerprint
    || (row.previousTargetPublication !== null && (!previous || previous.ready !== true))
    || (row.stagedCount === 0 ? row.stageCursor !== null
      : row.stageCursor !== row.orderedTaskIds.at(-1))
    || row.verifiedCount > row.stagedCount
    || (row.verifiedCount === 0 ? row.verifyCursor !== null : typeof row.verifyCursor !== 'string')
    || (row.phase === 'staging' && (row.stagedCount >= ARENA_PUBLICATION_TASK_COUNT || row.verifiedCount !== 0))
    || (row.phase === 'verifying' && (row.stagedCount !== ARENA_PUBLICATION_TASK_COUNT
      || row.verifiedCount >= ARENA_PUBLICATION_TASK_COUNT))
    || (row.phase === 'ready' && (row.stagedCount !== ARENA_PUBLICATION_TASK_COUNT
      || row.verifiedCount !== ARENA_PUBLICATION_TASK_COUNT))) {
    throw new Error('arena_publication_checkpoint_invalid');
  }
  return row;
}

function taskIdsSha256(taskIds: readonly string[]): string {
  return sha256([...taskIds].sort());
}

async function exactCheckpoint(
  persistence: ArenaPublicationBridgePersistence,
  path: string,
  request: ArenaPublicationRequest,
  source: ArenaPublicationSourceRoot,
): Promise<ArenaPublicationBridgeCheckpoint> {
  const existing = await persistence.get(path);
  if (existing !== null) return parseBridgeCheckpoint(existing, request);
  const checkpoint: ArenaPublicationBridgeCheckpoint = Object.freeze({
    kind: 'arena-target-publication-bridge-checkpoint-v1',
    revision: 0,
    createdAtMs: Date.now(),
    request,
    source,
    previousTargetPublication: await persistence.getCurrentTargetPublication(request.studyTarget),
    phase: 'staging',
    stageCursor: null,
    verifyCursor: null,
    stagedCount: 0,
    verifiedCount: 0,
    orderedTaskIds: Object.freeze([]),
  });
  try {
    await persistence.create(path, checkpoint);
  } catch (error) {
    const raced = await persistence.get(path);
    if (raced === null) throw error;
  }
  return parseBridgeCheckpoint(await persistence.get(path), request);
}

export type ArenaPublicationBridgeProgress = Readonly<{
  studyTarget: ArenaStudyTarget;
  bundleSha256: string;
  publicationFingerprint: string;
  phase: ArenaPublicationBridgePhase;
  stagedCount: number;
  verifiedCount: number;
  continuation: boolean;
}>;

/** One resumable step: at most 400 create-only task rows or 400 exact readbacks. */
export async function advanceArenaTargetPublicationBridge(input: Readonly<{
  request: ArenaPublicationRequest;
  sourceRoot: unknown;
  sourceCheckpoint: unknown;
  approvalReceiptDocuments: readonly unknown[];
  persistence: ArenaPublicationBridgePersistence;
  maxTasks?: number;
}>): Promise<ArenaPublicationBridgeProgress> {
  const source = parseArenaPublicationSource(
    input.sourceRoot, input.sourceCheckpoint, input.request, input.approvalReceiptDocuments,
  );
  if (!source) throw new Error('arena_publication_source_not_ready');
  const maxTasks = input.maxTasks ?? ARENA_PUBLICATION_PAGE_LIMIT;
  if (!Number.isSafeInteger(maxTasks) || maxTasks < 1 || maxTasks > ARENA_PUBLICATION_PAGE_LIMIT) {
    throw new Error('arena_publication_page_invalid');
  }
  const rootPath = tournamentV11TargetBundleRootPath(source.studyTarget, source.bundleSha256);
  const path = arenaPublicationJobPath(source.studyTarget, source.bundleSha256, input.request.requestId);
  let checkpoint = await exactCheckpoint(input.persistence, path, input.request, source);
  if (canonical(checkpoint.source) !== canonical(source)) throw new Error('arena_publication_source_conflict');
  if (checkpoint.phase === 'ready') {
    return { studyTarget: source.studyTarget, bundleSha256: source.bundleSha256,
      publicationFingerprint: source.publicationFingerprint, phase: 'ready',
      stagedCount: checkpoint.stagedCount, verifiedCount: checkpoint.verifiedCount, continuation: false };
  }
  if (checkpoint.phase === 'staging') {
    const remaining = ARENA_PUBLICATION_TASK_COUNT - checkpoint.stagedCount;
    const pageSize = Math.min(maxTasks, remaining);
    const finalPage = remaining <= maxTasks;
    const page = await input.persistence.list(
      `${rootPath}/tasks`, checkpoint.stageCursor, finalPage ? pageSize + 1 : pageSize,
    );
    if (page.length !== pageSize) throw new Error('arena_publication_source_count_invalid');
    const expected = page.map(({ id, value }) => {
      const task = buildArenaPublicationTask(value, source);
      if (task.taskId !== id) throw new Error('arena_publication_task_id_mismatch');
      return { path: `tournamentTasks/${arenaPublishedTaskDocumentId(source, id)}`, value: task };
    });
    await input.persistence.createExactMany(expected);
    const orderedTaskIds = Object.freeze([...checkpoint.orderedTaskIds, ...page.map(({ id }) => id)]);
    const stagedCount = checkpoint.stagedCount + page.length;
    if (stagedCount > ARENA_PUBLICATION_TASK_COUNT) throw new Error('arena_publication_source_count_invalid');
    const phase: ArenaPublicationBridgePhase = stagedCount === ARENA_PUBLICATION_TASK_COUNT ? 'verifying' : 'staging';
    if (phase === 'verifying' && taskIdsSha256(orderedTaskIds) !== source.taskIdsSha256) {
      throw new Error('arena_publication_task_ids_mismatch');
    }
    const next: ArenaPublicationBridgeCheckpoint = Object.freeze({
      ...checkpoint,
      revision: checkpoint.revision + 1,
      phase,
      stageCursor: page.at(-1)!.id,
      stagedCount,
      orderedTaskIds,
    });
    await input.persistence.compareAndSet(path, checkpoint.revision, next);
    checkpoint = next;
  } else if (checkpoint.phase === 'verifying') {
    const remaining = ARENA_PUBLICATION_TASK_COUNT - checkpoint.verifiedCount;
    const pageSize = Math.min(maxTasks, remaining);
    const finalPage = remaining <= maxTasks;
    const page = await input.persistence.list(
      `${rootPath}/tasks`, checkpoint.verifyCursor, finalPage ? pageSize + 1 : pageSize,
    );
    if (page.length !== pageSize) throw new Error('arena_publication_source_count_invalid');
    for (const { id, value } of page) {
      const expected = buildArenaPublicationTask(value, source);
      const actual = await input.persistence.get(
        `tournamentTasks/${arenaPublishedTaskDocumentId(source, id)}`,
      );
      if (actual === null || canonical(actual) !== canonical(expected)) {
        throw new Error('arena_publication_readback_mismatch');
      }
    }
    const verifiedCount = checkpoint.verifiedCount + page.length;
    const phase: ArenaPublicationBridgePhase = verifiedCount === ARENA_PUBLICATION_TASK_COUNT ? 'ready' : 'verifying';
    const next: ArenaPublicationBridgeCheckpoint = Object.freeze({
      ...checkpoint,
      revision: checkpoint.revision + 1,
      phase,
      verifyCursor: page.at(-1)!.id,
      verifiedCount,
    });
    await input.persistence.compareAndSet(path, checkpoint.revision, next);
    checkpoint = next;
  }
  return Object.freeze({
    studyTarget: source.studyTarget,
    bundleSha256: source.bundleSha256,
    publicationFingerprint: source.publicationFingerprint,
    phase: checkpoint.phase,
    stagedCount: checkpoint.stagedCount,
    verifiedCount: checkpoint.verifiedCount,
    continuation: checkpoint.phase !== 'ready',
  });
}

export function publicationStateFromSource(source: ArenaPublicationSourceRoot): ArenaTargetPublication {
  return Object.freeze({
    studyTarget: source.studyTarget,
    poolVersion: source.poolVersion,
    manifestSha256: source.manifestSha256,
    merkleRootSha256: source.merkleRootSha256,
    factPackVersion: source.factPackVersion,
    factPackSha256: source.factPackSha256,
    enabled: true,
    ready: true,
    publicationFingerprint: source.publicationFingerprint,
  });
}

export function readReadyArenaPublicationCheckpoint(
  value: unknown,
  request: ArenaPublicationRequest,
): ArenaPublicationBridgeCheckpoint {
  const checkpoint = parseBridgeCheckpoint(value, request);
  if (checkpoint.phase !== 'ready' || checkpoint.stagedCount !== ARENA_PUBLICATION_TASK_COUNT
    || checkpoint.verifiedCount !== ARENA_PUBLICATION_TASK_COUNT
    || taskIdsSha256(checkpoint.orderedTaskIds) !== checkpoint.source.taskIdsSha256) {
    throw new Error('arena_publication_not_ready');
  }
  return checkpoint;
}

export function readArenaPublicationCheckpoint(
  value: unknown,
  request: ArenaPublicationRequest,
): ArenaPublicationBridgeCheckpoint | null {
  if (value === null || value === undefined) return null;
  return parseBridgeCheckpoint(value, request);
}
