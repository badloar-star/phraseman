import {
  advanceCreateOnlyPublication,
  createOnlyPublicationEntriesSha256,
  createOnlyPublicationPlanSha256,
  createCreateOnlyPublicationPlan,
  type CreateOnlyPublicationEntry,
  type CreateOnlyPublicationPersistence,
} from './tournament_bundle_publication';
import {
  TOURNAMENT_POOL_V11_VERSION,
  TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS,
  type FinalizedTournamentV11TaskPool,
  type TournamentV11Task,
} from './tournament_pool_v11_factory';
import {
  validateTournamentV11RuntimeAudit,
  type TournamentV11RuntimeAudit,
} from './tournament_pool_v11_runtime_audit';

export interface TournamentV11BundlePersistence extends CreateOnlyPublicationPersistence {}

export type TournamentV11BundleTask = TournamentV11Task;

export type TournamentV11BundleJobBinding = Readonly<{
  jobId: string;
  queueSha256: string;
  reviewContractVersion: string;
  promptSetSha256: string;
  primaryModel: string;
  adversarialModel: string;
}>;

type TournamentV11BundlePublicationBinding = TournamentV11BundleJobBinding & Readonly<{
  exposureLayoutHash: string;
  manifestSha256: string;
  bundleSha256: string;
  receiptLedgerSha256: string;
  runtimeAuditSha256: string;
  publicationPlanSha256: string;
  publicationEntriesSha256: string;
}>;

export type TournamentV11BundleRoot = Readonly<{
  kind: 'tournament_pool_v11_bundle_v1';
  poolVersion: typeof TOURNAMENT_POOL_V11_VERSION;
  jobId: string;
  queueSha256: string;
  reviewContractVersion: string;
  promptSetSha256: string;
  primaryModel: string;
  adversarialModel: string;
  publicationPlanSha256: string;
  publicationEntriesSha256: string;
  taskCount: 4_000;
  exposureBucketCounts: FinalizedTournamentV11TaskPool['exposureBucketCounts'];
  exposureLayoutHash: string;
  manifestSha256: string;
  bundleSha256: string;
  receiptLedgerSha256: string;
  runtimeAudit: TournamentV11RuntimeAudit;
}>;

const HASH = /^[a-f0-9]{64}$/u;
const JOB_ID = /^tsj_[a-f0-9]{64}$/u;

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  throw new Error('bundle_value_invalid');
}

function sha256(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

function exactBucketCounts(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !exactKeys(value, Object.keys(TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS))) return false;
  return Object.entries(TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS).every(
    ([mode, count]) => (value as Record<string, unknown>)[mode] === count,
  );
}

function validJobBinding(value: TournamentV11BundleJobBinding): boolean {
  return Boolean(value) && JOB_ID.test(value.jobId) && HASH.test(value.queueSha256)
    && typeof value.reviewContractVersion === 'string' && value.reviewContractVersion.trim().length > 0
    && value.reviewContractVersion.length <= 160 && HASH.test(value.promptSetSha256)
    && typeof value.primaryModel === 'string' && value.primaryModel.trim().length > 0
    && typeof value.adversarialModel === 'string' && value.adversarialModel.trim().length > 0
    && value.primaryModel !== value.adversarialModel;
}

function publicationBindingFromRoot(root: TournamentV11BundleRoot): TournamentV11BundlePublicationBinding {
  return Object.freeze({
    jobId: root.jobId,
    queueSha256: root.queueSha256,
    reviewContractVersion: root.reviewContractVersion,
    promptSetSha256: root.promptSetSha256,
    primaryModel: root.primaryModel,
    adversarialModel: root.adversarialModel,
    exposureLayoutHash: root.exposureLayoutHash,
    manifestSha256: root.manifestSha256,
    bundleSha256: root.bundleSha256,
    receiptLedgerSha256: root.receiptLedgerSha256,
    runtimeAuditSha256: root.runtimeAudit.auditSha256,
    publicationPlanSha256: root.publicationPlanSha256,
    publicationEntriesSha256: root.publicationEntriesSha256,
  });
}

const BUNDLE_ROOT_PATH = `tournament_pool_v11_bundles/${TOURNAMENT_POOL_V11_VERSION}`;
const BUNDLE_CHECKPOINT_PATH = `${BUNDLE_ROOT_PATH}/internal/publication_checkpoint`;

function expectedCheckpointPlanSha256(
  root: TournamentV11BundleRoot,
  binding: TournamentV11BundlePublicationBinding,
): string {
  return createOnlyPublicationPlanSha256({
    publicationId: `${TOURNAMENT_POOL_V11_VERSION}_${root.publicationPlanSha256}`,
    checkpointPath: BUNDLE_CHECKPOINT_PATH,
    entriesSha256: root.publicationEntriesSha256,
    root: { path: BUNDLE_ROOT_PATH, value: root },
    binding,
  });
}

/** A status response may report ready only for the exact, fully-audited root. */
export function isCompleteTournamentV11BundleRoot(value: unknown): value is TournamentV11BundleRoot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const root = value as Partial<TournamentV11BundleRoot>;
  if (!exactKeys(value, [
    'kind', 'poolVersion', 'jobId', 'queueSha256', 'reviewContractVersion', 'promptSetSha256',
    'primaryModel', 'adversarialModel', 'publicationPlanSha256', 'publicationEntriesSha256',
    'taskCount', 'exposureBucketCounts', 'exposureLayoutHash',
    'manifestSha256', 'bundleSha256', 'receiptLedgerSha256', 'runtimeAudit',
  ]) || root.kind !== 'tournament_pool_v11_bundle_v1'
    || root.poolVersion !== TOURNAMENT_POOL_V11_VERSION || root.taskCount !== 4_000
    || !validJobBinding(root as TournamentV11BundleJobBinding)
    || !exactBucketCounts(root.exposureBucketCounts) || !root.runtimeAudit
    || ![root.exposureLayoutHash, root.manifestSha256, root.bundleSha256,
      root.receiptLedgerSha256, root.publicationPlanSha256, root.publicationEntriesSha256]
      .every((hash) => typeof hash === 'string' && HASH.test(hash))) return false;
  const audit = root.runtimeAudit;
  if (!exactKeys(audit, [
    'kind', 'poolVersion', 'days', 'roomSeries', 'roomsSimulated', 'tasksPerRoom', 'taskCount',
    'bucketCount', 'maxAdjacentTaskOverlap', 'maxAdjacentProvenanceOverlap', 'provenanceCollisions',
    'fullTaskCoverage', 'fullBucketCoverage', 'speedBoardsChecked', 'speedBoardsWithSixProvenance',
    'taskIdsSha256', 'bucketIdsSha256', 'manifestSha256', 'bundleSha256', 'receiptLedgerSha256',
    'exposureLayoutHash', 'auditSha256',
  ])) return false;
  const auditBody = Object.fromEntries(Object.entries(audit).filter(([key]) => key !== 'auditSha256'));
  return audit.kind === 'tournament_pool_v11_runtime_audit_v1'
    && audit.poolVersion === root.poolVersion && audit.taskCount === root.taskCount
    && audit.days === 730 && audit.roomSeries === 2 && audit.roomsSimulated === 1_460
    && audit.tasksPerRoom === 16 && audit.bucketCount === 102
    && audit.fullTaskCoverage === true && audit.fullBucketCoverage === true
    && audit.maxAdjacentTaskOverlap === 0 && audit.maxAdjacentProvenanceOverlap === 0
    && audit.provenanceCollisions === 0 && audit.speedBoardsChecked > 0
    && audit.speedBoardsChecked === audit.speedBoardsWithSixProvenance
    && audit.exposureLayoutHash === root.exposureLayoutHash
    && audit.manifestSha256 === root.manifestSha256
    && audit.bundleSha256 === root.bundleSha256
    && audit.receiptLedgerSha256 === root.receiptLedgerSha256
    && HASH.test(audit.taskIdsSha256) && HASH.test(audit.bucketIdsSha256)
    && HASH.test(audit.auditSha256) && audit.auditSha256 === sha256(auditBody);
}

function checkpointBinding(value: unknown): TournamentV11BundlePublicationBinding | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const checkpoint = value as Record<string, unknown>;
  if (!exactKeys(checkpoint, [
    'kind', 'publicationId', 'planSha256', 'binding', 'revision', 'phase', 'writeCursor', 'verifyCursor',
  ]) || checkpoint.kind !== 'create_only_publication_checkpoint_v1'
    || typeof checkpoint.planSha256 !== 'string' || !HASH.test(checkpoint.planSha256)
    || !Number.isSafeInteger(checkpoint.revision) || Number(checkpoint.revision) < 0
    || !['writing', 'verifying', 'root', 'ready'].includes(String(checkpoint.phase))
    || !Number.isSafeInteger(checkpoint.writeCursor) || Number(checkpoint.writeCursor) < 0
    || Number(checkpoint.writeCursor) > 4_000
    || !Number.isSafeInteger(checkpoint.verifyCursor) || Number(checkpoint.verifyCursor) < 0
    || Number(checkpoint.verifyCursor) > 4_000) return null;
  const binding = checkpoint.binding as TournamentV11BundlePublicationBinding;
  if (!binding || !exactKeys(binding, [
    'jobId', 'queueSha256', 'reviewContractVersion', 'promptSetSha256', 'primaryModel', 'adversarialModel',
    'exposureLayoutHash', 'manifestSha256', 'bundleSha256', 'receiptLedgerSha256',
    'runtimeAuditSha256', 'publicationPlanSha256', 'publicationEntriesSha256',
  ]) || !validJobBinding(binding)
    || ![binding.exposureLayoutHash, binding.manifestSha256, binding.bundleSha256,
      binding.receiptLedgerSha256, binding.runtimeAuditSha256, binding.publicationPlanSha256,
      binding.publicationEntriesSha256]
      .every((hash) => HASH.test(hash))
    || checkpoint.publicationId !== `${TOURNAMENT_POOL_V11_VERSION}_${binding.publicationPlanSha256}`) return null;
  return binding;
}

export function isCompleteTournamentV11BundleForJob(
  rootValue: unknown,
  checkpointValue: unknown,
  jobBinding: TournamentV11BundleJobBinding,
): boolean {
  if (!isCompleteTournamentV11BundleRoot(rootValue) || !validJobBinding(jobBinding)) return false;
  const checkpoint = checkpointValue as Record<string, unknown>;
  const binding = checkpointBinding(checkpointValue);
  return Boolean(binding) && checkpoint.phase === 'ready'
    && checkpoint.writeCursor === 4_000 && checkpoint.verifyCursor === 4_000
    && canonical(publicationBindingFromRoot(rootValue)) === canonical(binding)
    && checkpoint.planSha256 === expectedCheckpointPlanSha256(rootValue, binding!)
    && canonical({
      jobId: rootValue.jobId, queueSha256: rootValue.queueSha256,
      reviewContractVersion: rootValue.reviewContractVersion, promptSetSha256: rootValue.promptSetSha256,
      primaryModel: rootValue.primaryModel, adversarialModel: rootValue.adversarialModel,
    }) === canonical(jobBinding);
}

export function tournamentV11BundlePublicationStatus(
  rootValue: unknown,
  checkpointValue: unknown,
  jobBinding: TournamentV11BundleJobBinding,
): 'missing' | 'writing' | 'ready' | 'conflict' {
  if (!validJobBinding(jobBinding)) return 'conflict';
  if (rootValue == null && checkpointValue == null) return 'missing';
  const binding = checkpointBinding(checkpointValue);
  if (!binding || canonical({
    jobId: binding.jobId, queueSha256: binding.queueSha256,
    reviewContractVersion: binding.reviewContractVersion, promptSetSha256: binding.promptSetSha256,
    primaryModel: binding.primaryModel, adversarialModel: binding.adversarialModel,
  }) !== canonical(jobBinding)) return 'conflict';
  const checkpoint = checkpointValue as Record<string, unknown>;
  if (rootValue == null) return checkpoint.phase === 'writing' || checkpoint.phase === 'verifying'
    || checkpoint.phase === 'root' ? 'writing' : 'conflict';
  return isCompleteTournamentV11BundleForJob(rootValue, checkpointValue, jobBinding) ? 'ready' : 'conflict';
}

export function tournamentV11BundleTaskPath(rootPath: string, taskId: string): string {
  if (!/^[a-z0-9_-]{1,200}$/u.test(taskId)) throw new Error('bundle_task_id_invalid');
  return `${rootPath}/tasks/${taskId}`;
}

export async function finalizeTournamentV11Bundle(input: Readonly<{
  finalized: FinalizedTournamentV11TaskPool;
  runtimeAudit: TournamentV11RuntimeAudit;
  jobBinding: TournamentV11BundleJobBinding;
  persistence: TournamentV11BundlePersistence;
  maxOperations?: number;
}>): Promise<Readonly<{
  reused: boolean;
  taskCount: 4_000;
  bundleSha256: string;
  runtimeAuditSha256: string;
  publicationPlanSha256: string;
  state: 'writing' | 'verifying' | 'root' | 'ready';
  continuation: boolean;
  writeCursor: number;
  verifyCursor: number;
}>> {
  const finalized = input.finalized;
  if (!finalized || finalized.poolVersion !== TOURNAMENT_POOL_V11_VERSION
    || finalized.taskCount !== 4_000 || finalized.tasks.length !== 4_000
    || !validJobBinding(input.jobBinding)) {
    throw new Error('bundle_input_invalid');
  }
  validateTournamentV11RuntimeAudit(input.runtimeAudit, finalized);
  const tasks = [...finalized.tasks].sort((left, right) => left.taskId.localeCompare(right.taskId));
  const rootPath = BUNDLE_ROOT_PATH;
  const publicationPlanSha256 = sha256({
    kind: 'tournament_pool_v11_publication_plan_v1',
    rootPath,
    jobBinding: input.jobBinding,
    exposureLayoutHash: finalized.exposureLayoutHash,
    manifestSha256: finalized.manifestSha256,
    bundleSha256: finalized.bundleSha256,
    receiptLedgerSha256: finalized.receiptLedgerSha256,
    runtimeAuditSha256: input.runtimeAudit.auditSha256,
    tasks: tasks.map((task) => ({
      taskId: task.taskId, contentSha256: task.contentSha256,
      semanticReceiptSha256: task.semanticReceiptSha256, exposureBucket: task.exposureBucket,
    })),
  });
  const publicationEntries: readonly CreateOnlyPublicationEntry[] = tasks.map((task) => ({
    path: tournamentV11BundleTaskPath(rootPath, task.taskId), value: task,
  }));
  const publicationEntriesSha256 = createOnlyPublicationEntriesSha256(publicationEntries);
  const root: TournamentV11BundleRoot = Object.freeze({
    kind: 'tournament_pool_v11_bundle_v1',
    poolVersion: finalized.poolVersion,
    ...input.jobBinding,
    publicationPlanSha256,
    publicationEntriesSha256,
    taskCount: finalized.taskCount,
    exposureBucketCounts: finalized.exposureBucketCounts,
    exposureLayoutHash: finalized.exposureLayoutHash,
    manifestSha256: finalized.manifestSha256,
    bundleSha256: finalized.bundleSha256,
    receiptLedgerSha256: finalized.receiptLedgerSha256,
    runtimeAudit: input.runtimeAudit,
  });
  if (!isCompleteTournamentV11BundleRoot(root)) throw new Error('bundle_root_invalid');
  const binding = publicationBindingFromRoot(root);
  const publication = createCreateOnlyPublicationPlan({
    publicationId: `${TOURNAMENT_POOL_V11_VERSION}_${publicationPlanSha256}`,
    checkpointPath: BUNDLE_CHECKPOINT_PATH,
    entries: publicationEntries,
    root: { path: rootPath, value: root },
    binding,
  });
  if (publication.planSha256 !== expectedCheckpointPlanSha256(root, binding)) {
    throw new Error('bundle_publication_plan_invalid');
  }
  const progress = await advanceCreateOnlyPublication({
    publication,
    persistence: input.persistence,
    maxOperations: input.maxOperations,
  });
  return Object.freeze({
    reused: progress.createdThisBatch === 0,
    taskCount: finalized.taskCount,
    bundleSha256: finalized.bundleSha256,
    runtimeAuditSha256: input.runtimeAudit.auditSha256,
    publicationPlanSha256,
    state: progress.state,
    continuation: progress.continuation,
    writeCursor: progress.writeCursor,
    verifyCursor: progress.verifyCursor,
  });
}
import { createHash } from 'node:crypto';
