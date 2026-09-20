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
  type FinalizedTournamentV11TargetTaskPool,
  type TournamentV11Task,
} from './tournament_pool_v11_factory';
import {
  validateTournamentV11TargetRuntimeAudit,
  validateTournamentV11RuntimeAudit,
  type TournamentV11TargetRuntimeAudit,
  type TournamentV11RuntimeAudit,
} from './tournament_pool_v11_runtime_audit';
import { resolveArenaStudyTarget, type ArenaStudyTarget } from './arena_target_registry';
import {
  buildTournamentPoolTaskProofs,
  type ArenaPublication,
} from './tournament_pool_publication';

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

export type TournamentV11TargetBundleJobBinding = TournamentV11BundleJobBinding & Readonly<{
  studyTarget: ArenaStudyTarget;
}>;

export type TournamentV11TargetBundleRoot = Readonly<{
  kind: 'tournament_pool_v11_target_bundle_v2';
  publicationSchema: 'tournament-pool-v11-target-v2';
  studyTarget: ArenaStudyTarget;
  factPack: Readonly<{ version: string; sha256: string }>;
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
  exposureBucketCounts: FinalizedTournamentV11TargetTaskPool['exposureBucketCounts'];
  exposureLayoutHash: string;
  manifestSha256: string;
  bundleSha256: string;
  receiptLedgerSha256: string;
  merkleRootSha256: string;
  approvals: ArenaTargetPublicationApprovals;
  runtimeAudit: TournamentV11TargetRuntimeAudit;
}>;

export const ARENA_TARGET_PUBLICATION_APPROVAL_ROLES = Object.freeze([
  'pedagogy',
  'nonsense',
  'distractors',
  'target_isolation',
  'target_linguist',
  'native_fact_approval',
  'owner_approval',
] as const);
export type ArenaTargetPublicationApprovalRole = typeof ARENA_TARGET_PUBLICATION_APPROVAL_ROLES[number];

export type ArenaTargetPublicationApprovalReceipt = Readonly<{
  schemaVersion: 'arena-target-publication-approval-receipt-v1';
  role: ArenaTargetPublicationApprovalRole;
  verdict: 'PASS';
  receiptId: string;
  reviewerId: string;
  reviewRunId: string;
  issuedAt: string;
  reviewerContextSha256: string;
  evidenceSha256: string;
  checksSha256: string;
  independence: Readonly<{
    authorRunIdDifferent: true;
    freshContext: true;
    selfIssued: false;
  }>;
  studyTarget: ArenaStudyTarget;
  bundleSha256: string;
  manifestSha256: string;
  factPackVersion: string;
  factPackSha256: string;
  taskIdsSha256: string;
  taskCount: 4_000;
  receiptSha256: string;
}>;

export type ArenaTargetPublicationApprovals = Readonly<{
  schemaVersion: 'arena-target-publication-approvals-v1';
  studyTarget: ArenaStudyTarget;
  bundleSha256: string;
  manifestSha256: string;
  factPackVersion: string;
  factPackSha256: string;
  taskIdsSha256: string;
  taskCount: 4_000;
  receipts: readonly ArenaTargetPublicationApprovalReceipt[];
  receiptLedgerSha256: string;
  approvalsSha256: string;
}>;

const APPROVAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/u;

function approvalBinding(value: {
  studyTarget: ArenaStudyTarget;
  bundleSha256: string;
  manifestSha256: string;
  factPackVersion: string;
  factPackSha256: string;
  taskIdsSha256: string;
  taskCount: 4_000;
}) {
  return {
    studyTarget: value.studyTarget,
    bundleSha256: value.bundleSha256,
    manifestSha256: value.manifestSha256,
    factPackVersion: value.factPackVersion,
    factPackSha256: value.factPackSha256,
    taskIdsSha256: value.taskIdsSha256,
    taskCount: value.taskCount,
  } as const;
}

/** Strict bridge-only evidence parser. Missing/legacy/BLOCK material never qualifies. */
export function parseArenaTargetPublicationApprovals(
  value: unknown,
  expected: ReturnType<typeof approvalBinding>,
): ArenaTargetPublicationApprovals | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (!exactKeys(row, [
    'schemaVersion', 'studyTarget', 'bundleSha256', 'manifestSha256', 'factPackVersion',
    'factPackSha256', 'taskIdsSha256', 'taskCount', 'receipts', 'receiptLedgerSha256',
    'approvalsSha256',
  ]) || row.schemaVersion !== 'arena-target-publication-approvals-v1'
    || canonical(approvalBinding(row as typeof expected)) !== canonical(expected)
    || !Array.isArray(row.receipts) || row.receipts.length !== ARENA_TARGET_PUBLICATION_APPROVAL_ROLES.length
    || typeof row.receiptLedgerSha256 !== 'string' || !HASH.test(row.receiptLedgerSha256)
    || typeof row.approvalsSha256 !== 'string' || !HASH.test(row.approvalsSha256)) return null;
  const seenRoles = new Set<string>();
  const seenReceiptIds = new Set<string>();
  const seenReviewerIds = new Set<string>();
  for (const candidate of row.receipts) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
    const receipt = candidate as Record<string, unknown>;
    if (!exactKeys(receipt, [
      'schemaVersion', 'role', 'verdict', 'receiptId', 'reviewerId', 'reviewRunId', 'issuedAt',
      'reviewerContextSha256', 'evidenceSha256', 'checksSha256', 'independence',
      'studyTarget', 'bundleSha256', 'manifestSha256', 'factPackVersion', 'factPackSha256',
      'taskIdsSha256', 'taskCount', 'receiptSha256',
    ]) || receipt.schemaVersion !== 'arena-target-publication-approval-receipt-v1'
      || receipt.verdict !== 'PASS'
      || !(ARENA_TARGET_PUBLICATION_APPROVAL_ROLES as readonly unknown[]).includes(receipt.role)
      || typeof receipt.receiptId !== 'string' || !APPROVAL_ID.test(receipt.receiptId)
      || typeof receipt.reviewerId !== 'string' || !APPROVAL_ID.test(receipt.reviewerId)
      || typeof receipt.reviewRunId !== 'string' || !APPROVAL_ID.test(receipt.reviewRunId)
      || typeof receipt.issuedAt !== 'string' || !Number.isFinite(Date.parse(receipt.issuedAt))
      || typeof receipt.reviewerContextSha256 !== 'string' || !HASH.test(receipt.reviewerContextSha256)
      || typeof receipt.evidenceSha256 !== 'string' || !HASH.test(receipt.evidenceSha256)
      || typeof receipt.checksSha256 !== 'string' || !HASH.test(receipt.checksSha256)
      || typeof receipt.receiptSha256 !== 'string' || !HASH.test(receipt.receiptSha256)
      || !receipt.independence || typeof receipt.independence !== 'object'
      || !exactKeys(receipt.independence as object, ['authorRunIdDifferent', 'freshContext', 'selfIssued'])
      || (receipt.independence as Record<string, unknown>).authorRunIdDifferent !== true
      || (receipt.independence as Record<string, unknown>).freshContext !== true
      || (receipt.independence as Record<string, unknown>).selfIssued !== false
      || canonical(approvalBinding(receipt as typeof expected)) !== canonical(expected)
      || seenRoles.has(String(receipt.role)) || seenReceiptIds.has(receipt.receiptId)
      || seenReviewerIds.has(receipt.reviewerId)) return null;
    seenRoles.add(String(receipt.role));
    seenReceiptIds.add(receipt.receiptId);
    seenReviewerIds.add(receipt.reviewerId);
    const { receiptSha256: _receiptHash, ...receiptBody } = receipt;
    if (receipt.receiptSha256 !== sha256(receiptBody)) return null;
  }
  if (ARENA_TARGET_PUBLICATION_APPROVAL_ROLES.some((role) => !seenRoles.has(role))) return null;
  const ledger = [...row.receipts as ArenaTargetPublicationApprovalReceipt[]]
    .sort((left, right) => left.role.localeCompare(right.role))
    .map(({ role, receiptSha256 }) => ({ role, receiptSha256 }));
  if (row.receiptLedgerSha256 !== sha256(ledger)) return null;
  const { approvalsSha256: _hash, ...body } = row;
  return row.approvalsSha256 === sha256(body) ? value as ArenaTargetPublicationApprovals : null;
}

export function arenaTargetApprovalReceiptPath(receiptSha256: string): string {
  if (!HASH.test(receiptSha256)) throw new Error('target_approval_receipt_identity_invalid');
  return `arena_target_publication_approval_receipts/${receiptSha256}`;
}

/** Root receipts must also exist as immutable create-only server documents. */
export function arenaTargetApprovalReceiptPaths(rootValue: unknown): readonly string[] {
  if (!isCompleteTournamentV11TargetBundleRoot(rootValue)) return Object.freeze([]);
  return Object.freeze(rootValue.approvals.receipts.map((receipt) => (
    arenaTargetApprovalReceiptPath(receipt.receiptSha256)
  )));
}

export function arenaTargetApprovalReceiptDocumentsMatch(
  root: TournamentV11TargetBundleRoot,
  documents: readonly unknown[],
): boolean {
  if (documents.length !== root.approvals.receipts.length) return false;
  return root.approvals.receipts.every((receipt, index) => (
    canonical(receipt) === canonical(documents[index])
  ));
}

export function tournamentV11TargetBundleRootPath(
  studyTarget: ArenaStudyTarget,
  bundleSha256: string,
): string {
  if (resolveArenaStudyTarget(studyTarget) !== studyTarget || !HASH.test(bundleSha256)) {
    throw new Error('target_bundle_identity_invalid');
  }
  return `tournament_pool_v11_target_bundles/${studyTarget}/${TOURNAMENT_POOL_V11_VERSION}/${bundleSha256}`;
}

function validTargetJobBinding(value: TournamentV11TargetBundleJobBinding): boolean {
  return validJobBinding(value) && resolveArenaStudyTarget(value.studyTarget) === value.studyTarget;
}

export function isCompleteTournamentV11TargetBundleRoot(
  value: unknown,
): value is TournamentV11TargetBundleRoot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const root = value as Partial<TournamentV11TargetBundleRoot>;
  if (!exactKeys(value, [
    'kind', 'publicationSchema', 'studyTarget', 'factPack', 'poolVersion',
    'jobId', 'queueSha256', 'reviewContractVersion', 'promptSetSha256',
    'primaryModel', 'adversarialModel', 'publicationPlanSha256', 'publicationEntriesSha256',
    'taskCount', 'exposureBucketCounts', 'exposureLayoutHash', 'manifestSha256',
    'bundleSha256', 'receiptLedgerSha256', 'merkleRootSha256', 'approvals', 'runtimeAudit',
  ])) return false;
  const audit = root.runtimeAudit;
  if (!audit || !exactKeys(audit, [
    'kind', 'publicationSchema', 'studyTarget', 'factPackVersion', 'factPackSha256',
    'poolVersion', 'days', 'roomSeries', 'roomsSimulated', 'tasksPerRoom', 'taskCount',
    'bucketCount', 'maxAdjacentTaskOverlap', 'maxAdjacentProvenanceOverlap', 'provenanceCollisions',
    'fullTaskCoverage', 'fullBucketCoverage', 'speedBoardsChecked', 'speedBoardsWithSixProvenance',
    'taskIdsSha256', 'bucketIdsSha256', 'manifestSha256', 'bundleSha256', 'receiptLedgerSha256',
    'exposureLayoutHash', 'auditSha256',
  ])) return false;
  const auditBody = Object.fromEntries(Object.entries(audit).filter(([key]) => key !== 'auditSha256'));
  return root.kind === 'tournament_pool_v11_target_bundle_v2'
    && root.publicationSchema === 'tournament-pool-v11-target-v2'
    && resolveArenaStudyTarget(root.studyTarget) === root.studyTarget
    && root.poolVersion === TOURNAMENT_POOL_V11_VERSION
    && root.taskCount === 4_000
    && validTargetJobBinding(root as TournamentV11TargetBundleJobBinding)
    && Boolean(root.factPack) && typeof root.factPack?.version === 'string'
    && root.factPack.version.trim().length > 0 && HASH.test(root.factPack.sha256)
    && exactBucketCounts(root.exposureBucketCounts)
    && [root.publicationPlanSha256, root.publicationEntriesSha256,
      root.exposureLayoutHash, root.manifestSha256, root.bundleSha256,
      root.receiptLedgerSha256, root.merkleRootSha256]
      .every((hash) => typeof hash === 'string' && HASH.test(hash))
    && Boolean(parseArenaTargetPublicationApprovals(root.approvals, {
      studyTarget: root.studyTarget,
      bundleSha256: String(root.bundleSha256),
      manifestSha256: String(root.manifestSha256),
      factPackVersion: root.factPack.version,
      factPackSha256: root.factPack.sha256,
      taskIdsSha256: audit.taskIdsSha256,
      taskCount: 4_000,
    }))
    && audit.kind === 'tournament_pool_v11_target_runtime_audit_v2'
    && audit.publicationSchema === root.publicationSchema
    && audit.studyTarget === root.studyTarget
    && audit.factPackVersion === root.factPack.version
    && audit.factPackSha256 === root.factPack.sha256
    && audit.poolVersion === root.poolVersion
    && audit.days === 730 && audit.roomSeries === 2 && audit.roomsSimulated === 1_460
    && audit.tasksPerRoom === 16 && audit.taskCount === 4_000 && audit.bucketCount === 102
    && audit.maxAdjacentTaskOverlap === 0 && audit.maxAdjacentProvenanceOverlap === 0
    && audit.provenanceCollisions === 0 && audit.fullTaskCoverage === true
    && audit.fullBucketCoverage === true && audit.speedBoardsChecked > 0
    && audit.speedBoardsWithSixProvenance === audit.speedBoardsChecked
    && HASH.test(audit.taskIdsSha256) && HASH.test(audit.bucketIdsSha256)
    && audit.exposureLayoutHash === root.exposureLayoutHash
    && audit.manifestSha256 === root.manifestSha256
    && audit.bundleSha256 === root.bundleSha256
    && audit.receiptLedgerSha256 === root.receiptLedgerSha256
    && HASH.test(audit.auditSha256) && audit.auditSha256 === sha256(auditBody);
}

type TournamentV11TargetBundlePublicationBinding = Readonly<{
  publicationSchema: 'tournament-pool-v11-target-v2';
  studyTarget: ArenaStudyTarget;
  factPackVersion: string;
  factPackSha256: string;
  jobId: string;
  queueSha256: string;
  reviewContractVersion: string;
  promptSetSha256: string;
  primaryModel: string;
  adversarialModel: string;
  exposureLayoutHash: string;
  manifestSha256: string;
  bundleSha256: string;
  receiptLedgerSha256: string;
  runtimeAuditSha256: string;
  publicationPlanSha256: string;
  publicationEntriesSha256: string;
}>;

function targetPublicationBindingFromRoot(
  root: TournamentV11TargetBundleRoot,
): TournamentV11TargetBundlePublicationBinding {
  return {
    publicationSchema: root.publicationSchema,
    studyTarget: root.studyTarget,
    factPackVersion: root.factPack.version,
    factPackSha256: root.factPack.sha256,
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
  };
}

/** Full source-bundle readiness gate used by the Arena publication bridge. */
export function isCompleteTournamentV11TargetBundleForPublication(
  rootValue: unknown,
  checkpointValue: unknown,
): rootValue is TournamentV11TargetBundleRoot {
  if (!isCompleteTournamentV11TargetBundleRoot(rootValue)
    || !checkpointValue || typeof checkpointValue !== 'object' || Array.isArray(checkpointValue)) return false;
  const checkpoint = checkpointValue as Record<string, unknown>;
  if (!exactKeys(checkpoint, [
    'kind', 'publicationId', 'planSha256', 'binding', 'revision', 'phase', 'writeCursor', 'verifyCursor',
  ]) || checkpoint.kind !== 'create_only_publication_checkpoint_v1'
    || checkpoint.publicationId !== `tv11_target_${rootValue.studyTarget}_${rootValue.publicationPlanSha256}`
    || checkpoint.phase !== 'ready' || checkpoint.writeCursor !== 4_000 || checkpoint.verifyCursor !== 4_000
    || typeof checkpoint.planSha256 !== 'string' || !HASH.test(checkpoint.planSha256)
    || !Number.isSafeInteger(checkpoint.revision) || Number(checkpoint.revision) < 1) return false;
  const binding = targetPublicationBindingFromRoot(rootValue);
  if (canonical(checkpoint.binding) !== canonical(binding)) return false;
  const rootPath = tournamentV11TargetBundleRootPath(rootValue.studyTarget, rootValue.bundleSha256);
  const expectedPlanSha256 = createOnlyPublicationPlanSha256({
    publicationId: String(checkpoint.publicationId),
    checkpointPath: `${rootPath}/internal/publication_checkpoint`,
    entriesSha256: rootValue.publicationEntriesSha256,
    root: { path: rootPath, value: rootValue },
    binding,
  });
  return checkpoint.planSha256 === expectedPlanSha256;
}

/**
 * Target-scoped create-only publication. The legacy global root remains
 * readable and is never used as the root or checkpoint for this operation.
 */
export async function finalizeTournamentV11TargetBundle(input: Readonly<{
  finalized: FinalizedTournamentV11TargetTaskPool;
  runtimeAudit: TournamentV11TargetRuntimeAudit;
  jobBinding: TournamentV11TargetBundleJobBinding;
  approvals: ArenaTargetPublicationApprovals;
  persistence: TournamentV11BundlePersistence;
  maxOperations?: number;
}>): Promise<Readonly<{
  studyTarget: ArenaStudyTarget;
  rootPath: string;
  checkpointPath: string;
  publicationId: string;
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
  if (!finalized || finalized.publicationSchema !== 'tournament-pool-v11-target-v2'
    || finalized.taskCount !== 4_000 || finalized.tasks.length !== 4_000
    || !validTargetJobBinding(input.jobBinding)
    || input.jobBinding.studyTarget !== finalized.studyTarget
    || finalized.tasks.some((task) => task.studyTarget !== finalized.studyTarget)) {
    throw new Error('target_bundle_input_invalid');
  }
  validateTournamentV11TargetRuntimeAudit(input.runtimeAudit, finalized);
  const tasks = [...finalized.tasks].sort((left, right) => left.taskId.localeCompare(right.taskId));
  const approvals = parseArenaTargetPublicationApprovals(input.approvals, {
    studyTarget: finalized.studyTarget,
    bundleSha256: finalized.bundleSha256,
    manifestSha256: finalized.manifestSha256,
    factPackVersion: finalized.factPack.version,
    factPackSha256: finalized.factPack.sha256,
    taskIdsSha256: input.runtimeAudit.taskIdsSha256,
    taskCount: 4_000,
  });
  if (!approvals) throw new Error('target_bundle_approvals_invalid');
  for (const receipt of approvals.receipts) {
    const path = arenaTargetApprovalReceiptPath(receipt.receiptSha256);
    const existing = await input.persistence.get(path);
    if (existing === null) throw new Error('target_approval_receipt_missing');
    if (canonical(existing) !== canonical(receipt)) throw new Error('target_approval_receipt_conflict');
  }
  const merkle = buildTournamentPoolTaskProofs(tasks);
  const tasksWithProof = tasks.map((task) => {
    const proof = merkle.byTaskId.get(task.taskId);
    if (!proof) throw new Error('target_bundle_merkle_proof_missing');
    const arenaPublication: ArenaPublication = Object.freeze({
      schemaVersion: 'tournament-task-merkle.v1',
      poolContentSha256: finalized.manifestSha256,
      manifestSha256: finalized.manifestSha256,
      merkleRootSha256: merkle.merkleRootSha256,
      leafSha256: proof.leafSha256,
      proof: proof.proof,
    });
    return Object.freeze({ ...task, arenaPublication });
  });
  const rootPath = tournamentV11TargetBundleRootPath(finalized.studyTarget, finalized.bundleSha256);
  const checkpointPath = `${rootPath}/internal/publication_checkpoint`;
  const planBody = {
    kind: 'tournament_pool_v11_target_publication_plan_v2',
    publicationSchema: finalized.publicationSchema,
    studyTarget: finalized.studyTarget,
    factPack: finalized.factPack,
    rootPath,
    jobBinding: input.jobBinding,
    exposureLayoutHash: finalized.exposureLayoutHash,
    manifestSha256: finalized.manifestSha256,
    bundleSha256: finalized.bundleSha256,
    receiptLedgerSha256: finalized.receiptLedgerSha256,
    runtimeAuditSha256: input.runtimeAudit.auditSha256,
    merkleRootSha256: merkle.merkleRootSha256,
    approvalsSha256: approvals.approvalsSha256,
    tasks: tasksWithProof.map((task) => ({
      taskId: task.taskId,
      studyTarget: task.studyTarget,
      contentSha256: task.contentSha256,
      semanticReceiptSha256: task.semanticReceiptSha256,
      exposureBucket: task.exposureBucket,
      sourceFactIds: task.sourceFactIds,
      factPackSha256: task.arenaEvidence.factPack.sha256,
    })),
  } as const;
  const publicationPlanSha256 = sha256(planBody);
  const entries: readonly CreateOnlyPublicationEntry[] = tasksWithProof.map((task) => ({
    path: tournamentV11BundleTaskPath(rootPath, task.taskId),
    value: task,
  }));
  const publicationEntriesSha256 = createOnlyPublicationEntriesSha256(entries);
  const root: TournamentV11TargetBundleRoot = Object.freeze({
    kind: 'tournament_pool_v11_target_bundle_v2' as const,
    publicationSchema: finalized.publicationSchema,
    ...input.jobBinding,
    studyTarget: finalized.studyTarget,
    factPack: finalized.factPack,
    poolVersion: finalized.poolVersion,
    publicationPlanSha256,
    publicationEntriesSha256,
    taskCount: finalized.taskCount,
    exposureBucketCounts: finalized.exposureBucketCounts,
    exposureLayoutHash: finalized.exposureLayoutHash,
    manifestSha256: finalized.manifestSha256,
    bundleSha256: finalized.bundleSha256,
    receiptLedgerSha256: finalized.receiptLedgerSha256,
    merkleRootSha256: merkle.merkleRootSha256,
    approvals,
    runtimeAudit: input.runtimeAudit,
  });
  if (!isCompleteTournamentV11TargetBundleRoot(root)) throw new Error('target_bundle_root_invalid');
  const binding = Object.freeze({
    publicationSchema: finalized.publicationSchema,
    studyTarget: finalized.studyTarget,
    factPackVersion: finalized.factPack.version,
    factPackSha256: finalized.factPack.sha256,
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
    publicationPlanSha256,
    publicationEntriesSha256,
  });
  const publicationId = `tv11_target_${finalized.studyTarget}_${publicationPlanSha256}`;
  const publication = createCreateOnlyPublicationPlan({
    publicationId,
    checkpointPath,
    entries,
    root: { path: rootPath, value: root },
    binding,
  });
  const progress = await advanceCreateOnlyPublication({
    publication,
    persistence: input.persistence,
    maxOperations: input.maxOperations,
  });
  return Object.freeze({
    studyTarget: finalized.studyTarget,
    rootPath,
    checkpointPath,
    publicationId,
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
