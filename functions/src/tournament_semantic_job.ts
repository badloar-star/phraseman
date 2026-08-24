import { createHash } from 'node:crypto';
import {
  validateTournamentSemanticCandidate,
  type TournamentSemanticCandidate,
} from './tournament_semantic_contract';

export type SemanticJobLifecycle = 'running' | 'paused' | 'blocked' | 'ready';

export type SemanticJobProgress = Readonly<{
  processed: number;
  approved: number;
  rejected: number;
  quarantined: number;
  cacheHits: number;
  providerAttempts: number;
  transientRetries: number;
}>;

export type SemanticJobPendingReview = Readonly<{
  candidateId: string;
  contentSha256: string;
  providerAttempts: number;
  transientRetries: number;
  evidenceRefs: readonly string[];
}>;

export type SemanticJobReviewIdentity = Readonly<{
  reviewContractVersion: string;
  promptSetSha256: string;
  primaryModel: string;
  adversarialModel: string;
}>;

export type SemanticJobState = Readonly<{
  kind: 'tournament_semantic_job_v1';
  jobId: string;
  poolVersion: string;
  queueSha256: string;
  reviewContractVersion: string;
  promptSetSha256: string;
  primaryModel: string;
  adversarialModel: string;
  totalCandidates: number;
  revision: number;
  lifecycle: SemanticJobLifecycle;
  cursor: number;
  progress: SemanticJobProgress;
  pendingReview: SemanticJobPendingReview | null;
  lease: Readonly<{ token: string; expiresAtMs: number }> | null;
  pauseReason: 'daily_cap_exhausted' | 'candidate_shortage' | null;
  createdAtMs: number;
  updatedAtMs: number;
}>;

export type CreateSemanticJobInput = Readonly<{
  jobId: string;
  poolVersion: string;
  queueSha256: string;
  reviewContractVersion: string;
  promptSetSha256: string;
  primaryModel: string;
  adversarialModel: string;
  totalCandidates: number;
  nowMs: number;
}>;

export type ClaimSemanticJobLeaseInput = Readonly<{
  jobId: string;
  expectedRevision: number;
  leaseToken: string;
  nowMs: number;
  leaseDurationMs: number;
}>;

export type SemanticJobTerminal = Readonly<{
  candidateId: string;
  contentSha256: string;
  decision: 'PASS' | 'REJECT' | 'QUARANTINED';
  source: 'cache' | 'review';
  providerAttempts: number;
  transientRetries: number;
  evidenceRefs: readonly string[];
}>;

export type SemanticJobCheckpointInput = Readonly<{
  jobId: string;
  expectedRevision: number;
  leaseToken: string;
  nowMs: number;
  terminal: SemanticJobTerminal;
}>;

export type SemanticJobPendingReviewInput = Readonly<{
  jobId: string;
  expectedRevision: number;
  leaseToken: string;
  nowMs: number;
  pendingReview: SemanticJobPendingReview;
}>;

export type SettleSemanticJobInput = Readonly<{
  jobId: string;
  expectedRevision: number;
  leaseToken: string;
  nowMs: number;
  lifecycle: SemanticJobLifecycle;
  reason?: 'daily_cap_exhausted' | 'candidate_shortage' | null;
  uncheckpointedProviderAttempts?: number;
  uncheckpointedTransientRetries?: number;
}>;

export interface SemanticJobRepository {
  createOrResume(input: CreateSemanticJobInput): Promise<SemanticJobState>;
  claimLease(input: ClaimSemanticJobLeaseInput): Promise<SemanticJobState>;
  savePendingReview(input: SemanticJobPendingReviewInput): Promise<SemanticJobState>;
  checkpoint(input: SemanticJobCheckpointInput): Promise<SemanticJobState>;
  settle(input: SettleSemanticJobInput): Promise<SemanticJobState>;
}

export type CachedSemanticTerminal = Readonly<{
  decision: 'PASS' | 'REJECT';
  reference: string;
}>;

export type SemanticJobReviewResult =
  | Readonly<{ kind: 'PASS' | 'REJECT'; providerAttempts: number; providerAttemptsCumulative?: boolean; evidenceRef: string }>
  | Readonly<{ kind: 'TRANSIENT_ERROR' | 'ERROR' | 'MALFORMED'; providerAttempts: number; providerAttemptsCumulative?: boolean; evidenceRef: string }>
  | Readonly<{ kind: 'BUDGET_PAUSED'; providerAttempts: number; providerAttemptsCumulative?: boolean; reason: 'daily_cap_exhausted' }>;

export interface TournamentSemanticJobDependencies {
  reviewIdentity: SemanticJobReviewIdentity;
  repository: SemanticJobRepository;
  loadCandidates(poolVersion: string): Promise<readonly TournamentSemanticCandidate[]>;
  lookupCachedTerminal(candidate: TournamentSemanticCandidate): Promise<CachedSemanticTerminal | null>;
  /**
   * The runner behind this boundary owns the fenced attempt state machine and
   * persists immutable returned/error evidence before resolving this promise.
   */
  reviewCandidate(candidate: TournamentSemanticCandidate): Promise<SemanticJobReviewResult>;
  assessSupply(state: SemanticJobState): Promise<'ready' | 'continue'>;
  nowMs(): number;
  createLeaseToken(): string;
}

export type TournamentSemanticJobBatchResult = Readonly<{
  jobId: string;
  poolVersion: string;
  state: SemanticJobLifecycle;
  revision: number;
  cursor: number;
  totalCandidates: number;
  processed: number;
  approved: number;
  rejected: number;
  quarantined: number;
  cacheHits: number;
  providerAttempts: number;
  transientRetries: number;
  continuation: boolean;
  shortage: boolean;
}>;

export type TournamentSemanticJobDryRun = Readonly<{
  poolVersion: string;
  sourceCandidates: number;
  hardGateRejections: number;
  duplicateRejections: number;
  historicalExclusions: number;
  eligibleCandidates: number;
  cachePasses: number;
  cacheRejects: number;
  projectedPrimaryRequests: number;
  projectedAdversarialRequests: number;
  transientRetryUpperBound: number;
  diversityFeasible: boolean;
  diversityShortages: readonly string[];
}>;

const HASH = /^[a-f0-9]{64}$/u;
const JOB_ID = /^tsj_[a-f0-9]{64}$/u;
const POOL_VERSION = /^tpool_[a-z0-9_-]+_v11$/u;
const DEFAULT_MAX_CANDIDATES = 4;
const MAX_CANDIDATES = 6;
const DEFAULT_LEASE_DURATION_MS = 60_000;
const MAX_TRANSIENT_RETRIES = 2;

function integer(value: number, minimum = 0): boolean {
  return Number.isSafeInteger(value) && value >= minimum;
}

function nonEmpty(value: string, maximum = 500): boolean {
  return typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= maximum;
}

function frozenProgress(progress: SemanticJobProgress): SemanticJobProgress {
  return Object.freeze({ ...progress });
}

function validReviewIdentity(value: SemanticJobReviewIdentity): boolean {
  return Boolean(value) && nonEmpty(value.reviewContractVersion, 160)
    && HASH.test(value.promptSetSha256)
    && nonEmpty(value.primaryModel, 160) && nonEmpty(value.adversarialModel, 160)
    && value.primaryModel !== value.adversarialModel;
}

export function assertSemanticJobReviewIdentity(
  state: SemanticJobState,
  expected: SemanticJobReviewIdentity,
): void {
  if (!validReviewIdentity(expected)
    || state.reviewContractVersion !== expected.reviewContractVersion
    || state.promptSetSha256 !== expected.promptSetSha256
    || state.primaryModel !== expected.primaryModel
    || state.adversarialModel !== expected.adversarialModel) {
    throw new Error('semantic_job_identity_mismatch');
  }
}

function validateState(state: SemanticJobState): void {
  if (!state || state.kind !== 'tournament_semantic_job_v1'
    || !JOB_ID.test(state.jobId) || !POOL_VERSION.test(state.poolVersion)
    || !HASH.test(state.queueSha256)
    || !validReviewIdentity(state)
    || !integer(state.totalCandidates) || !integer(state.revision)
    || !integer(state.cursor) || state.cursor > state.totalCandidates
    || !['running', 'paused', 'blocked', 'ready'].includes(state.lifecycle)
    || !integer(state.createdAtMs) || !integer(state.updatedAtMs) || state.updatedAtMs < state.createdAtMs) {
    throw new Error('semantic_job_state_invalid');
  }
  const progress = state.progress;
  const pending = state.pendingReview;
  if (!progress || Object.values(progress).some((value) => !integer(value))
    || progress.processed !== state.cursor
    || progress.processed !== progress.approved + progress.rejected + progress.quarantined
    || progress.cacheHits > progress.processed
    || (pending !== null && (!nonEmpty(pending.candidateId, 200) || !HASH.test(pending.contentSha256)
      || !integer(pending.providerAttempts)
      || !integer(pending.transientRetries) || pending.transientRetries > MAX_TRANSIENT_RETRIES
      || pending.providerAttempts + pending.transientRetries < 1
      || !Array.isArray(pending.evidenceRefs) || pending.evidenceRefs.length > pending.providerAttempts + pending.transientRetries
      || pending.evidenceRefs.some((reference) => !nonEmpty(reference))
      || progress.providerAttempts < pending.providerAttempts
      || progress.transientRetries < pending.transientRetries
      || state.cursor >= state.totalCandidates
      || state.lifecycle === 'ready' || state.lifecycle === 'blocked'))
    || (state.lease !== null && (!nonEmpty(state.lease.token, 200) || !integer(state.lease.expiresAtMs)))) {
    throw new Error('semantic_job_state_invalid');
  }
}

function checkMutation(
  state: SemanticJobState,
  input: Readonly<{ jobId: string; expectedRevision: number; leaseToken: string; nowMs: number }>,
): void {
  validateState(state);
  if (input.jobId !== state.jobId) throw new Error('semantic_job_identity_mismatch');
  if (input.expectedRevision !== state.revision) throw new Error('semantic_job_revision_conflict');
  if (!state.lease || input.leaseToken !== state.lease.token) throw new Error('semantic_job_stale_lease');
  if (!integer(input.nowMs) || input.nowMs < state.updatedAtMs) throw new Error('semantic_job_time_invalid');
  if (input.nowMs >= state.lease.expiresAtMs) throw new Error('semantic_job_stale_lease');
}

export function createInitialSemanticJobState(input: CreateSemanticJobInput): SemanticJobState {
  if (!JOB_ID.test(input.jobId) || !POOL_VERSION.test(input.poolVersion)
    || !HASH.test(input.queueSha256) || !integer(input.totalCandidates)
    || !integer(input.nowMs) || !validReviewIdentity(input)) {
    throw new Error('semantic_job_input_invalid');
  }
  const state: SemanticJobState = Object.freeze({
    kind: 'tournament_semantic_job_v1',
    jobId: input.jobId,
    poolVersion: input.poolVersion,
    queueSha256: input.queueSha256,
    reviewContractVersion: input.reviewContractVersion,
    promptSetSha256: input.promptSetSha256,
    primaryModel: input.primaryModel,
    adversarialModel: input.adversarialModel,
    totalCandidates: input.totalCandidates,
    revision: 0,
    lifecycle: 'running',
    cursor: 0,
    progress: frozenProgress({
      processed: 0, approved: 0, rejected: 0, quarantined: 0,
      cacheHits: 0, providerAttempts: 0, transientRetries: 0,
    }),
    pendingReview: null,
    lease: null,
    pauseReason: null,
    createdAtMs: input.nowMs,
    updatedAtMs: input.nowMs,
  });
  validateState(state);
  return state;
}

function validatePendingReview(pending: SemanticJobPendingReview): void {
  if (!pending || !nonEmpty(pending.candidateId, 200) || !HASH.test(pending.contentSha256)
    || !integer(pending.providerAttempts)
    || !integer(pending.transientRetries) || pending.transientRetries > MAX_TRANSIENT_RETRIES
    || pending.providerAttempts + pending.transientRetries < 1
    || !Array.isArray(pending.evidenceRefs) || pending.evidenceRefs.length > pending.providerAttempts + pending.transientRetries
    || pending.evidenceRefs.some((reference) => !nonEmpty(reference))) {
    throw new Error('semantic_job_pending_invalid');
  }
}

export function applySemanticJobPendingReview(
  state: SemanticJobState,
  input: SemanticJobPendingReviewInput,
): SemanticJobState {
  checkMutation(state, input);
  validatePendingReview(input.pendingReview);
  const previous = state.pendingReview;
  if (previous !== null) {
    if (input.pendingReview.candidateId !== previous.candidateId
      || input.pendingReview.contentSha256 !== previous.contentSha256
      || input.pendingReview.transientRetries < previous.transientRetries
      || input.pendingReview.transientRetries > previous.transientRetries + 1
      || input.pendingReview.providerAttempts < previous.providerAttempts
      || (input.pendingReview.transientRetries === previous.transientRetries
        && input.pendingReview.providerAttempts === previous.providerAttempts)
      || previous.evidenceRefs.some((reference, index) => input.pendingReview.evidenceRefs[index] !== reference)) {
      throw new Error('semantic_job_pending_conflict');
    }
  } else if (input.pendingReview.transientRetries > 1
    || input.pendingReview.providerAttempts + input.pendingReview.transientRetries < 1) {
    throw new Error('semantic_job_pending_conflict');
  }
  const providerDelta = input.pendingReview.providerAttempts - (previous?.providerAttempts ?? 0);
  const retryDelta = input.pendingReview.transientRetries - (previous?.transientRetries ?? 0);
  const next = Object.freeze({
    ...state,
    revision: state.revision + 1,
    progress: frozenProgress({
      ...state.progress,
      providerAttempts: state.progress.providerAttempts + providerDelta,
      transientRetries: state.progress.transientRetries + retryDelta,
    }),
    pendingReview: Object.freeze({
      ...input.pendingReview,
      evidenceRefs: Object.freeze([...input.pendingReview.evidenceRefs]),
    }),
    updatedAtMs: input.nowMs,
  });
  validateState(next);
  return next;
}

export function claimSemanticJobLease(
  state: SemanticJobState,
  input: ClaimSemanticJobLeaseInput,
): SemanticJobState {
  validateState(state);
  if (input.jobId !== state.jobId) throw new Error('semantic_job_identity_mismatch');
  if (input.expectedRevision !== state.revision) throw new Error('semantic_job_revision_conflict');
  if (!nonEmpty(input.leaseToken, 200) || !integer(input.nowMs) || input.nowMs < state.updatedAtMs
    || !integer(input.leaseDurationMs, 1) || input.leaseDurationMs > 600_000
    || !Number.isSafeInteger(input.nowMs + input.leaseDurationMs)) {
    throw new Error('semantic_job_lease_invalid');
  }
  if (state.lifecycle === 'ready' || state.lifecycle === 'blocked') throw new Error('semantic_job_terminal');
  if (state.lease && input.nowMs < state.lease.expiresAtMs) throw new Error('semantic_job_lease_busy');
  return Object.freeze({
    ...state,
    revision: state.revision + 1,
    lifecycle: 'running',
    lease: Object.freeze({ token: input.leaseToken, expiresAtMs: input.nowMs + input.leaseDurationMs }),
    pauseReason: null,
    updatedAtMs: input.nowMs,
  });
}

function validateTerminal(terminal: SemanticJobTerminal): void {
  if (!nonEmpty(terminal.candidateId, 200) || !HASH.test(terminal.contentSha256)
    || !['PASS', 'REJECT', 'QUARANTINED'].includes(terminal.decision)
    || !['cache', 'review'].includes(terminal.source)
    || !integer(terminal.providerAttempts) || !integer(terminal.transientRetries)
    || terminal.transientRetries > MAX_TRANSIENT_RETRIES
    || !Array.isArray(terminal.evidenceRefs) || terminal.evidenceRefs.length === 0
    || terminal.evidenceRefs.some((reference) => !nonEmpty(reference))) {
    throw new Error('semantic_job_terminal_invalid');
  }
  if ((terminal.source === 'cache' && (terminal.providerAttempts !== 0 || terminal.transientRetries !== 0
      || terminal.decision === 'QUARANTINED'))
    || (terminal.source === 'review' && terminal.providerAttempts < 1)) {
    throw new Error('semantic_job_terminal_invalid');
  }
}

export function applySemanticJobCheckpoint(
  state: SemanticJobState,
  input: SemanticJobCheckpointInput,
): SemanticJobState {
  checkMutation(state, input);
  validateTerminal(input.terminal);
  if (state.cursor >= state.totalCandidates) throw new Error('semantic_job_cursor_invalid');
  const pending = state.pendingReview;
  if (pending && (pending.candidateId !== input.terminal.candidateId
    || pending.contentSha256 !== input.terminal.contentSha256
    || input.terminal.source !== 'review'
    || input.terminal.providerAttempts < pending.providerAttempts
    || input.terminal.transientRetries !== pending.transientRetries
    || pending.evidenceRefs.some((reference, index) => input.terminal.evidenceRefs[index] !== reference))) {
    throw new Error('semantic_job_pending_conflict');
  }
  const providerDelta = input.terminal.providerAttempts - (pending?.providerAttempts ?? 0);
  const retryDelta = input.terminal.transientRetries - (pending?.transientRetries ?? 0);
  if (providerDelta < 0 || retryDelta < 0) throw new Error('semantic_job_pending_conflict');
  const progress: SemanticJobProgress = {
    ...state.progress,
    processed: state.progress.processed + 1,
    approved: state.progress.approved + (input.terminal.decision === 'PASS' ? 1 : 0),
    rejected: state.progress.rejected + (input.terminal.decision === 'REJECT' ? 1 : 0),
    quarantined: state.progress.quarantined + (input.terminal.decision === 'QUARANTINED' ? 1 : 0),
    cacheHits: state.progress.cacheHits + (input.terminal.source === 'cache' ? 1 : 0),
    providerAttempts: state.progress.providerAttempts + providerDelta,
    transientRetries: state.progress.transientRetries + retryDelta,
  };
  const next = Object.freeze({
    ...state,
    revision: state.revision + 1,
    cursor: state.cursor + 1,
    progress: frozenProgress(progress),
    pendingReview: null,
    updatedAtMs: input.nowMs,
  });
  validateState(next);
  return next;
}

export function settleSemanticJobBatch(
  state: SemanticJobState,
  input: SettleSemanticJobInput,
): SemanticJobState {
  checkMutation(state, input);
  const providerAttempts = input.uncheckpointedProviderAttempts ?? 0;
  const transientRetries = input.uncheckpointedTransientRetries ?? 0;
  if (!integer(providerAttempts) || !integer(transientRetries)
    || transientRetries > MAX_TRANSIENT_RETRIES
    || (input.lifecycle === 'paused' && input.reason !== 'daily_cap_exhausted')
    || (input.lifecycle === 'blocked' && input.reason !== 'candidate_shortage')
    || ((input.lifecycle === 'running' || input.lifecycle === 'ready') && input.reason != null)
    || ((input.lifecycle === 'ready' || input.lifecycle === 'blocked') && state.pendingReview !== null)) {
    throw new Error('semantic_job_settle_invalid');
  }
  const next = Object.freeze({
    ...state,
    revision: state.revision + 1,
    lifecycle: input.lifecycle,
    progress: frozenProgress({
      ...state.progress,
      providerAttempts: state.progress.providerAttempts + providerAttempts,
      transientRetries: state.progress.transientRetries + transientRetries,
    }),
    lease: null,
    pauseReason: input.reason ?? null,
    updatedAtMs: input.nowMs,
  });
  validateState(next);
  return next;
}

function queueFingerprint(candidates: readonly TournamentSemanticCandidate[]): string {
  return createHash('sha256')
    .update(candidates.map((item) => `${item.candidateId}\n${item.contentSha256}`).join('\n'), 'utf8')
    .digest('hex');
}

function deterministicJobId(
  poolVersion: string,
  queueSha256: string,
  reviewIdentity: SemanticJobReviewIdentity,
): string {
  return `tsj_${createHash('sha256').update([
    poolVersion, queueSha256, reviewIdentity.reviewContractVersion,
    reviewIdentity.promptSetSha256, reviewIdentity.primaryModel, reviewIdentity.adversarialModel,
  ].join('\n'), 'utf8').digest('hex')}`;
}

function result(state: SemanticJobState): TournamentSemanticJobBatchResult {
  return Object.freeze({
    jobId: state.jobId,
    poolVersion: state.poolVersion,
    state: state.lifecycle,
    revision: state.revision,
    cursor: state.cursor,
    totalCandidates: state.totalCandidates,
    ...state.progress,
    continuation: state.lifecycle === 'running' || state.lifecycle === 'paused',
    shortage: state.lifecycle === 'blocked' && state.pauseReason === 'candidate_shortage',
  });
}

function validateReviewResult(review: SemanticJobReviewResult): void {
  if (!review || !integer(review.providerAttempts)) throw new Error('semantic_job_review_invalid');
  if (review.providerAttemptsCumulative !== undefined && review.providerAttemptsCumulative !== true) {
    throw new Error('semantic_job_review_invalid');
  }
  if (review.kind === 'BUDGET_PAUSED') {
    if (review.providerAttempts < 0 || review.reason !== 'daily_cap_exhausted') {
      throw new Error('semantic_job_review_invalid');
    }
    return;
  }
  if (!['PASS', 'REJECT', 'TRANSIENT_ERROR', 'ERROR', 'MALFORMED'].includes(review.kind)
    || review.providerAttempts < 1 || !nonEmpty(review.evidenceRef)) {
    throw new Error('semantic_job_review_invalid');
  }
  if ((review.kind === 'PASS' || review.kind === 'REJECT') && review.providerAttempts < 1) {
    throw new Error('semantic_job_review_invalid');
  }
  if (review.kind === 'PASS' && review.providerAttempts < 2) throw new Error('semantic_job_review_invalid');
}

export async function dryRunTournamentSemanticJob(input: Readonly<{
  poolVersion: string;
  candidates: readonly TournamentSemanticCandidate[];
  historicalSignatures: ReadonlySet<string>;
  lookupCachedTerminal(candidate: TournamentSemanticCandidate): Promise<CachedSemanticTerminal | null>;
  assessDiversity(candidates: readonly TournamentSemanticCandidate[]): Promise<Readonly<{
    feasible: boolean;
    shortages: readonly string[];
  }>>;
}>): Promise<TournamentSemanticJobDryRun> {
  if (!input || !POOL_VERSION.test(input.poolVersion) || !Array.isArray(input.candidates)
    || !input.historicalSignatures || typeof input.historicalSignatures.has !== 'function') {
    throw new Error('semantic_job_dry_run_invalid');
  }
  for (const signature of input.historicalSignatures) {
    if (!HASH.test(signature)) throw new Error('semantic_job_dry_run_invalid');
  }
  let hardGateRejections = 0;
  let duplicateRejections = 0;
  let historicalExclusions = 0;
  const eligible: TournamentSemanticCandidate[] = [];
  const candidateIds = new Set<string>();
  const semanticSignatures = new Set<string>();
  const ordered = [...input.candidates].sort((left, right) => (
    String(left?.candidateId) < String(right?.candidateId) ? -1
      : String(left?.candidateId) > String(right?.candidateId) ? 1 : 0
  ));
  for (const item of ordered) {
    if (!validateTournamentSemanticCandidate(item).ok) {
      hardGateRejections += 1;
      continue;
    }
    if (candidateIds.has(item.candidateId) || semanticSignatures.has(item.semanticSignature)) {
      duplicateRejections += 1;
      continue;
    }
    candidateIds.add(item.candidateId);
    semanticSignatures.add(item.semanticSignature);
    if (input.historicalSignatures.has(item.semanticSignature)) {
      historicalExclusions += 1;
      continue;
    }
    eligible.push(item);
  }

  let cachePasses = 0;
  let cacheRejects = 0;
  let uncached = 0;
  const selectable: TournamentSemanticCandidate[] = [];
  for (const item of eligible) {
    const cached = await input.lookupCachedTerminal(item);
    if (cached === null) {
      uncached += 1;
      selectable.push(item);
      continue;
    }
    if (!cached || (cached.decision !== 'PASS' && cached.decision !== 'REJECT') || !nonEmpty(cached.reference)) {
      throw new Error('semantic_job_cache_invalid');
    }
    if (cached.decision === 'PASS') {
      cachePasses += 1;
      selectable.push(item);
    } else {
      cacheRejects += 1;
    }
  }
  const diversity = await input.assessDiversity(Object.freeze(selectable));
  if (!diversity || typeof diversity.feasible !== 'boolean' || !Array.isArray(diversity.shortages)
    || diversity.shortages.some((shortage) => !nonEmpty(shortage))) {
    throw new Error('semantic_job_diversity_invalid');
  }
  const projectedPrimaryRequests = uncached;
  const projectedAdversarialRequests = uncached;
  return Object.freeze({
    poolVersion: input.poolVersion,
    sourceCandidates: input.candidates.length,
    hardGateRejections,
    duplicateRejections,
    historicalExclusions,
    eligibleCandidates: eligible.length,
    cachePasses,
    cacheRejects,
    projectedPrimaryRequests,
    projectedAdversarialRequests,
    transientRetryUpperBound: (projectedPrimaryRequests + projectedAdversarialRequests) * MAX_TRANSIENT_RETRIES,
    diversityFeasible: diversity.feasible,
    diversityShortages: Object.freeze([...diversity.shortages]),
  });
}

export async function runTournamentSemanticJobBatch(
  deps: TournamentSemanticJobDependencies,
  input: Readonly<{
    jobId?: string;
    poolVersion: string;
    maxCandidates?: number;
    deadlineAtMs: number;
    leaseDurationMs?: number;
  }>,
): Promise<TournamentSemanticJobBatchResult> {
  const maxCandidates = input.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  if (!deps || !POOL_VERSION.test(input.poolVersion)
    || !integer(maxCandidates, 1) || maxCandidates > MAX_CANDIDATES
    || !integer(input.deadlineAtMs)
    || (input.leaseDurationMs !== undefined
      && (!integer(input.leaseDurationMs, 1) || input.leaseDurationMs > 600_000))) {
    throw new Error('semantic_job_input_invalid');
  }
  const loaded = await deps.loadCandidates(input.poolVersion);
  if (!Array.isArray(loaded)) throw new Error('semantic_job_queue_invalid');
  const candidates = [...loaded].sort((left, right) => (
    left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0
  ));
  if (candidates.some((item) => !validateTournamentSemanticCandidate(item).ok)
    || new Set(candidates.map((item) => item.candidateId)).size !== candidates.length
    || new Set(candidates.map((item) => item.contentSha256)).size !== candidates.length
    || new Set(candidates.map((item) => item.semanticSignature)).size !== candidates.length) {
    throw new Error('semantic_job_queue_invalid');
  }
  const queueSha256 = queueFingerprint(candidates);
  if (!validReviewIdentity(deps.reviewIdentity)) throw new Error('semantic_job_input_invalid');
  const reviewIdentity = Object.freeze({ ...deps.reviewIdentity });
  const expectedJobId = deterministicJobId(input.poolVersion, queueSha256, reviewIdentity);
  if (input.jobId !== undefined && input.jobId !== expectedJobId) throw new Error('semantic_job_identity_mismatch');
  const startMs = deps.nowMs();
  if (!integer(startMs)) throw new Error('semantic_job_time_invalid');
  const leaseDurationMs = input.leaseDurationMs ?? Math.min(
    600_000,
    Math.max(DEFAULT_LEASE_DURATION_MS, input.deadlineAtMs - startMs + 5_000),
  );
  let state = await deps.repository.createOrResume({
    jobId: expectedJobId,
    poolVersion: input.poolVersion,
    queueSha256,
    ...reviewIdentity,
    totalCandidates: candidates.length,
    nowMs: startMs,
  });
  validateState(state);
  if (state.jobId !== expectedJobId || state.poolVersion !== input.poolVersion
    || state.queueSha256 !== queueSha256 || state.totalCandidates !== candidates.length) {
    throw new Error('semantic_job_resume_conflict');
  }
  assertSemanticJobReviewIdentity(state, reviewIdentity);
  if (state.lifecycle === 'ready' || state.lifecycle === 'blocked') return result(state);

  const leaseToken = deps.createLeaseToken();
  if (!nonEmpty(leaseToken, 200)) throw new Error('semantic_job_lease_invalid');
  state = await deps.repository.claimLease({
    jobId: state.jobId,
    expectedRevision: state.revision,
    leaseToken,
    nowMs: startMs,
    leaseDurationMs,
  });
  validateState(state);

  const persistedSupply = await deps.assessSupply(state);
  if (persistedSupply !== 'ready' && persistedSupply !== 'continue') {
    throw new Error('semantic_job_supply_invalid');
  }
  if (persistedSupply === 'ready') {
    state = await deps.repository.settle({
      jobId: state.jobId,
      expectedRevision: state.revision,
      leaseToken,
      nowMs: deps.nowMs(),
      lifecycle: 'ready',
    });
    return result(state);
  }
  if (state.cursor >= candidates.length) {
    state = await deps.repository.settle({
      jobId: state.jobId,
      expectedRevision: state.revision,
      leaseToken,
      nowMs: deps.nowMs(),
      lifecycle: 'blocked',
      reason: 'candidate_shortage',
    });
    return result(state);
  }

  let completedThisBatch = 0;
  while (completedThisBatch < maxCandidates && state.cursor < candidates.length) {
    const beforeCandidateMs = deps.nowMs();
    if (!integer(beforeCandidateMs) || beforeCandidateMs < state.updatedAtMs) throw new Error('semantic_job_time_invalid');
    if (beforeCandidateMs >= input.deadlineAtMs) break;
    const item = candidates[state.cursor];
    if (state.pendingReview && (state.pendingReview.candidateId !== item.candidateId
      || state.pendingReview.contentSha256 !== item.contentSha256)) {
      throw new Error('semantic_job_pending_conflict');
    }
    const cached = state.pendingReview ? null : await deps.lookupCachedTerminal(item);
    let terminal: SemanticJobTerminal;
    if (cached !== null) {
      if (!cached || (cached.decision !== 'PASS' && cached.decision !== 'REJECT') || !nonEmpty(cached.reference)) {
        throw new Error('semantic_job_cache_invalid');
      }
      terminal = Object.freeze({
        candidateId: item.candidateId,
        contentSha256: item.contentSha256,
        decision: cached.decision,
        source: 'cache',
        providerAttempts: 0,
        transientRetries: 0,
        evidenceRefs: Object.freeze([cached.reference]),
      });
    } else {
      const evidenceRefs: string[] = [...(state.pendingReview?.evidenceRefs ?? [])];
      let providerAttempts = state.pendingReview?.providerAttempts ?? 0;
      let transientRetries = state.pendingReview?.transientRetries ?? 0;
      for (;;) {
        const review = await deps.reviewCandidate(item);
        validateReviewResult(review);
        providerAttempts = review.providerAttemptsCumulative
          ? Math.max(providerAttempts, review.providerAttempts)
          : providerAttempts + review.providerAttempts;
        if (review.kind === 'BUDGET_PAUSED') {
          const nowMs = deps.nowMs();
          if (providerAttempts > (state.pendingReview?.providerAttempts ?? 0)
            || transientRetries > (state.pendingReview?.transientRetries ?? 0)) {
            state = await deps.repository.savePendingReview({
              jobId: state.jobId,
              expectedRevision: state.revision,
              leaseToken,
              nowMs,
              pendingReview: {
                candidateId: item.candidateId,
                contentSha256: item.contentSha256,
                providerAttempts,
                transientRetries,
                evidenceRefs,
              },
            });
          }
          state = await deps.repository.settle({
            jobId: state.jobId,
            expectedRevision: state.revision,
            leaseToken,
            nowMs,
            lifecycle: 'paused',
            reason: review.reason,
          });
          return result(state);
        }
        evidenceRefs.push(review.evidenceRef);
        if (review.kind === 'TRANSIENT_ERROR' && transientRetries < MAX_TRANSIENT_RETRIES) {
          transientRetries += 1;
          state = await deps.repository.savePendingReview({
            jobId: state.jobId,
            expectedRevision: state.revision,
            leaseToken,
            nowMs: deps.nowMs(),
            pendingReview: {
              candidateId: item.candidateId,
              contentSha256: item.contentSha256,
              providerAttempts,
              transientRetries,
              evidenceRefs,
            },
          });
          if (deps.nowMs() >= input.deadlineAtMs) {
            state = await deps.repository.settle({
              jobId: state.jobId,
              expectedRevision: state.revision,
              leaseToken,
              nowMs: deps.nowMs(),
              lifecycle: 'running',
            });
            return result(state);
          }
          continue;
        }
        terminal = Object.freeze({
          candidateId: item.candidateId,
          contentSha256: item.contentSha256,
          decision: review.kind === 'PASS' ? 'PASS'
            : review.kind === 'REJECT' ? 'REJECT' : 'QUARANTINED',
          source: 'review',
          providerAttempts,
          transientRetries,
          evidenceRefs: Object.freeze(evidenceRefs),
        });
        break;
      }
    }
    const checkpointMs = deps.nowMs();
    state = await deps.repository.checkpoint({
      jobId: state.jobId,
      expectedRevision: state.revision,
      leaseToken,
      nowMs: checkpointMs,
      terminal,
    });
    completedThisBatch += 1;
    const supply = await deps.assessSupply(state);
    if (supply !== 'ready' && supply !== 'continue') throw new Error('semantic_job_supply_invalid');
    if (supply === 'ready') {
      state = await deps.repository.settle({
        jobId: state.jobId,
        expectedRevision: state.revision,
        leaseToken,
        nowMs: deps.nowMs(),
        lifecycle: 'ready',
      });
      return result(state);
    }
    if (state.cursor >= candidates.length) {
      state = await deps.repository.settle({
        jobId: state.jobId,
        expectedRevision: state.revision,
        leaseToken,
        nowMs: deps.nowMs(),
        lifecycle: 'blocked',
        reason: 'candidate_shortage',
      });
      return result(state);
    }
  }
  state = await deps.repository.settle({
    jobId: state.jobId,
    expectedRevision: state.revision,
    leaseToken,
    nowMs: deps.nowMs(),
    lifecycle: 'running',
  });
  return result(state);
}
