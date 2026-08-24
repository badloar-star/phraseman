import { createHash } from 'node:crypto';
import type { JobModel } from './openai_jobs_config';
import type { TournamentModeKind, TournamentProvenanceKey, TournamentSemanticCandidate } from './tournament_semantic_contract';
import {
  parseSemanticVerdict,
  TOURNAMENT_SEMANTIC_PROMPTS,
  type SemanticFinding,
  type SemanticReviewPass,
  type SemanticVerdict,
} from './tournament_semantic_review';

export type TournamentSemanticReceiptBase = Readonly<{
  contentSha256: string;
  canonicalTaskSnapshotHash: string;
  semanticSignature: string;
  candidateId: string;
  mode: TournamentModeKind;
  difficulty: 1 | 2 | 3;
  provenanceKeys: readonly TournamentProvenanceKey[];
  reviewContractVersion: string;
  primaryPromptVersion: string;
  adversarialPromptVersion: string;
  promptSetSha256: string;
  primaryModel: JobModel;
  adversarialModel: JobModel;
  requestAccounting: Readonly<{ attempts: number; inputTokens: number; outputTokens: number }>;
  createdAtMs: number;
  completedAtMs: number;
  generationJobId: string;
}>;

export type TournamentSemanticReceipt =
  | (TournamentSemanticReceiptBase & Readonly<{
    decision: 'PASS';
    primaryVerdict: SemanticVerdict;
    adversarialVerdict: SemanticVerdict;
  }>)
  | (TournamentSemanticReceiptBase & Readonly<{
    decision: 'REJECT';
    primaryVerdict: SemanticVerdict;
    adversarialVerdict?: SemanticVerdict;
    blockingFindings: readonly SemanticFinding[];
  }>)
  | (TournamentSemanticReceiptBase & Readonly<{
    decision: 'PARTIAL' | 'ERROR';
    internalAttemptId: string;
    completedPasses: readonly SemanticReviewPass[];
    failureCode: string;
  }>);

export interface TournamentSemanticReceiptPersistence {
  get(path: string): Promise<unknown | null>;
  create(path: string, value: unknown): Promise<void>;
}

const HASH = /^[a-f0-9]{64}$/u;
const MODES = new Set(['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match']);
const MODELS = new Set(['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini']);

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  throw new Error('receipt_invalid');
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= 256;
}

function validVerdict(value: unknown, pass: SemanticReviewPass, model: string, contentSha256: string): value is SemanticVerdict {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const verdict = value as Partial<SemanticVerdict>;
  return verdict.contentSha256 === contentSha256 && verdict.pass === pass && verdict.model === model
    && (verdict.verdict === 'PASS' || verdict.verdict === 'REJECT')
    && Array.isArray(verdict.subjects) && verdict.subjects.length > 0
    && Array.isArray(verdict.blockingFindings);
}

const BASE_KEYS = Object.freeze([
  'contentSha256', 'canonicalTaskSnapshotHash', 'semanticSignature', 'candidateId', 'mode', 'difficulty',
  'provenanceKeys', 'reviewContractVersion', 'primaryPromptVersion',
  'adversarialPromptVersion', 'promptSetSha256', 'primaryModel', 'adversarialModel',
  'requestAccounting', 'createdAtMs', 'completedAtMs', 'generationJobId', 'decision',
]);

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length && actual.every((key, index) => key === sorted[index]);
}

function validBase(receipt: Partial<TournamentSemanticReceiptBase>): boolean {
  const accounting = receipt.requestAccounting;
  return typeof receipt.contentSha256 === 'string' && HASH.test(receipt.contentSha256)
    && typeof receipt.canonicalTaskSnapshotHash === 'string' && HASH.test(receipt.canonicalTaskSnapshotHash)
    && typeof receipt.semanticSignature === 'string' && HASH.test(receipt.semanticSignature)
    && nonEmpty(receipt.candidateId)
    && typeof receipt.mode === 'string' && MODES.has(receipt.mode)
    && (receipt.difficulty === 1 || receipt.difficulty === 2 || receipt.difficulty === 3)
    && Array.isArray(receipt.provenanceKeys) && receipt.provenanceKeys.length > 0
    && receipt.provenanceKeys.every(nonEmpty)
    && new Set(receipt.provenanceKeys).size === receipt.provenanceKeys.length
    && nonEmpty(receipt.reviewContractVersion)
    && nonEmpty(receipt.primaryPromptVersion) && nonEmpty(receipt.adversarialPromptVersion)
    && receipt.reviewContractVersion === TOURNAMENT_SEMANTIC_PROMPTS.contractVersion
    && receipt.primaryPromptVersion === TOURNAMENT_SEMANTIC_PROMPTS.primary.version
    && receipt.adversarialPromptVersion === TOURNAMENT_SEMANTIC_PROMPTS.adversarial.version
    && receipt.promptSetSha256 === TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256
    && typeof receipt.primaryModel === 'string' && MODELS.has(receipt.primaryModel)
    && typeof receipt.adversarialModel === 'string' && MODELS.has(receipt.adversarialModel)
    && receipt.primaryModel !== receipt.adversarialModel
    && Boolean(accounting) && Number.isSafeInteger(accounting?.attempts) && Number(accounting?.attempts) >= 0
    && Number.isSafeInteger(accounting?.inputTokens) && Number(accounting?.inputTokens) >= 0
    && Number.isSafeInteger(accounting?.outputTokens) && Number(accounting?.outputTokens) >= 0
    && Number.isSafeInteger(receipt.createdAtMs) && Number(receipt.createdAtMs) >= 0
    && Number.isSafeInteger(receipt.completedAtMs) && Number(receipt.completedAtMs) >= Number(receipt.createdAtMs)
    && nonEmpty(receipt.generationJobId);
}

export function validateTournamentSemanticReceipt(
  value: unknown,
  candidate?: TournamentSemanticCandidate,
): asserts value is TournamentSemanticReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !validBase(value)) {
    throw new Error('receipt_invalid');
  }
  const receipt = value as Partial<TournamentSemanticReceipt>;
  if (receipt.decision === 'PASS') {
    if (!exactKeys(value, [...BASE_KEYS, 'primaryVerdict', 'adversarialVerdict'])
      || receipt.requestAccounting?.attempts !== 2
      || !validVerdict(receipt.primaryVerdict, 'primary', receipt.primaryModel!, receipt.contentSha256!)
      || !validVerdict(receipt.adversarialVerdict, 'adversarial', receipt.adversarialModel!, receipt.contentSha256!)
      || receipt.primaryVerdict.verdict !== 'PASS' || receipt.adversarialVerdict.verdict !== 'PASS') {
      throw new Error('receipt_invalid');
    }
    if (candidate) validateReceiptCandidateBinding(receipt as Extract<TournamentSemanticReceipt, { decision: 'PASS' }>, candidate);
    return;
  }
  if (receipt.decision === 'REJECT') {
    const hasAdversarial = receipt.adversarialVerdict !== undefined;
    if (!exactKeys(value, [...BASE_KEYS, 'primaryVerdict', 'blockingFindings', ...(hasAdversarial ? ['adversarialVerdict'] : [])])
      || receipt.requestAccounting?.attempts !== (hasAdversarial ? 2 : 1)
      || !validVerdict(receipt.primaryVerdict, 'primary', receipt.primaryModel!, receipt.contentSha256!)
      || !Array.isArray(receipt.blockingFindings) || receipt.blockingFindings.length === 0
      || (receipt.adversarialVerdict !== undefined
        && !validVerdict(receipt.adversarialVerdict, 'adversarial', receipt.adversarialModel!, receipt.contentSha256!))) {
      throw new Error('receipt_invalid');
    }
    if (candidate) validateReceiptCandidateBinding(receipt as Extract<TournamentSemanticReceipt, { decision: 'REJECT' }>, candidate);
    return;
  }
  if ((receipt.decision === 'PARTIAL' || receipt.decision === 'ERROR')
    && exactKeys(value, [...BASE_KEYS, 'internalAttemptId', 'completedPasses', 'failureCode'])
    && nonEmpty(receipt.internalAttemptId)
    && Array.isArray(receipt.completedPasses)
    && receipt.completedPasses.every((pass) => pass === 'primary' || pass === 'adversarial')
    && nonEmpty(receipt.failureCode)) return;
  throw new Error('receipt_invalid');
}

function validateReceiptCandidateBinding(
  receipt: Extract<TournamentSemanticReceipt, { decision: 'PASS' | 'REJECT' }>,
  candidate: TournamentSemanticCandidate,
): void {
  if (receipt.contentSha256 !== candidate.contentSha256
    || receipt.canonicalTaskSnapshotHash !== candidate.contentSha256
    || receipt.semanticSignature !== candidate.semanticSignature
    || receipt.candidateId !== candidate.candidateId
    || receipt.mode !== candidate.mode
    || receipt.difficulty !== candidate.difficulty
    || canonical(receipt.provenanceKeys) !== canonical(candidate.provenanceKeys)) {
    throw new Error('receipt_candidate_mismatch');
  }
  parseSemanticVerdict(receipt.primaryVerdict, {
    candidate,
    pass: 'primary',
    model: receipt.primaryModel,
    promptVersion: receipt.primaryPromptVersion,
    promptSetSha256: receipt.promptSetSha256,
    reviewContractVersion: receipt.reviewContractVersion,
  });
  if (receipt.adversarialVerdict) parseSemanticVerdict(receipt.adversarialVerdict, {
    candidate,
    pass: 'adversarial',
    model: receipt.adversarialModel,
    promptVersion: receipt.adversarialPromptVersion,
    promptSetSha256: receipt.promptSetSha256,
    reviewContractVersion: receipt.reviewContractVersion,
  });
}

export function semanticReceiptId(
  contentSha256: string,
  reviewContractVersion: string,
  promptSetSha256: string,
  models: Readonly<{ primaryModel: JobModel; adversarialModel: JobModel }>,
): string {
  if (!HASH.test(contentSha256) || !nonEmpty(reviewContractVersion)
    || !HASH.test(promptSetSha256)
    || !MODELS.has(models.primaryModel) || !MODELS.has(models.adversarialModel)
    || models.primaryModel === models.adversarialModel) {
    throw new Error('receipt_identity_invalid');
  }
  return createHash('sha256')
    .update(`${contentSha256}\n${reviewContractVersion}\n${promptSetSha256}\n${models.primaryModel}\n${models.adversarialModel}`, 'utf8')
    .digest('hex');
}

/** Canonical full-body receipt hash shared by factory, audit, and migration artifacts. */
export function semanticReceiptSha256(receipt: TournamentSemanticReceipt): string {
  validateTournamentSemanticReceipt(receipt);
  return createHash('sha256').update(canonical(receipt), 'utf8').digest('hex');
}

/** Stable ledger pin; callers may supply rows in any order, never arbitrary bodies. */
export function semanticReceiptLedgerSha256(
  rows: readonly Readonly<{ id: string; sha256: string }>[],
): string {
  if (!Array.isArray(rows) || rows.length < 1 || rows.some((row) => (
    !row || !exactKeys(row, ['id', 'sha256']) || !HASH.test(row.id) || !HASH.test(row.sha256)
  )) || new Set(rows.map(({ id }) => id)).size !== rows.length) throw new Error('receipt_ledger_invalid');
  return createHash('sha256').update(canonical(
    [...rows].sort((left, right) => left.id.localeCompare(right.id)),
  ), 'utf8').digest('hex');
}

function parentPath(id: string): string {
  return `tournament_semantic_review_receipts/${id}`;
}

export function createTournamentSemanticReceiptStore(persistence: TournamentSemanticReceiptPersistence) {
  const identity = (receipt: TournamentSemanticReceipt) => semanticReceiptId(
    receipt.contentSha256,
    receipt.reviewContractVersion,
    receipt.promptSetSha256,
    { primaryModel: receipt.primaryModel, adversarialModel: receipt.adversarialModel },
  );
  const createExact = async (
    path: string,
    receipt: TournamentSemanticReceipt,
    id: string,
    candidate?: TournamentSemanticCandidate,
  ) => {
    const existing = await persistence.get(path);
    if (existing !== null) {
      try { validateTournamentSemanticReceipt(existing, candidate); } catch { throw new Error('receipt_conflict'); }
      if (canonical(existing) !== canonical(receipt)) throw new Error('receipt_conflict');
      return Object.freeze({ reused: true, id });
    }
    try {
      await persistence.create(path, receipt);
      return Object.freeze({ reused: false, id });
    } catch (error) {
      const raced = await persistence.get(path);
      if (raced !== null && canonical(raced) === canonical(receipt)) return Object.freeze({ reused: true, id });
      throw error instanceof Error && error.message === 'already_exists'
        ? new Error('receipt_conflict') : error;
    }
  };
  return Object.freeze({
    async createImmutable(receipt: TournamentSemanticReceipt, candidate: TournamentSemanticCandidate) {
      validateTournamentSemanticReceipt(receipt, candidate);
      if (receipt.decision !== 'PASS' && receipt.decision !== 'REJECT') throw new Error('receipt_terminal_required');
      const id = identity(receipt);
      return createExact(parentPath(id), receipt, id, candidate);
    },
    async createEvidence(receipt: TournamentSemanticReceipt) {
      validateTournamentSemanticReceipt(receipt);
      if (receipt.decision !== 'PARTIAL' && receipt.decision !== 'ERROR') throw new Error('receipt_evidence_required');
      const id = identity(receipt);
      const evidenceId = receipt.internalAttemptId;
      return createExact(`${parentPath(id)}/evidence/${evidenceId}`, receipt, evidenceId);
    },
    async getReusableApproval(input: Readonly<{
      candidate: TournamentSemanticCandidate;
      reviewContractVersion: string;
      promptSetSha256: string;
      primaryModel: JobModel;
      adversarialModel: JobModel;
    }>): Promise<TournamentSemanticReceipt | null> {
      const id = semanticReceiptId(input.candidate.contentSha256, input.reviewContractVersion, input.promptSetSha256, input);
      const raw = await persistence.get(parentPath(id));
      if (raw === null) return null;
      try { validateTournamentSemanticReceipt(raw, input.candidate); } catch { throw new Error('receipt_invalid'); }
      return raw.decision === 'PASS' ? raw : null;
    },
  });
}
