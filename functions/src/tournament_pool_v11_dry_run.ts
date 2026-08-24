import { createHash } from 'node:crypto';

import type { TournamentSemanticCandidate } from './tournament_semantic_contract';
import type { TournamentSemanticReceipt } from './tournament_semantic_receipt_store';
import {
  finalizeTournamentV11TaskPool,
  TOURNAMENT_POOL_V11_VERSION,
  type FinalizedTournamentV11TaskPool,
  type TournamentV11Task,
} from './tournament_pool_v11_factory';
import {
  selectTournamentV11Candidates,
  TOURNAMENT_V11_CELL_QUOTAS,
} from './tournament_pool_v11_selector';
import {
  auditTournamentV11RuntimePool,
  type TournamentV11RuntimeAudit,
} from './tournament_pool_v11_runtime_audit';

const HASH = /^[a-f0-9]{64}$/u;
const CELL_KEYS = Object.keys(TOURNAMENT_V11_CELL_QUOTAS).sort();

export type TournamentV11DryRunCandidate = TournamentSemanticCandidate;

export type TournamentV11DryRunTask = Readonly<{
  candidateId: string;
  task: TournamentV11Task;
}>;

export type TournamentV11DryRunInput = Readonly<{
  poolVersion: typeof TOURNAMENT_POOL_V11_VERSION;
  candidates: readonly TournamentV11DryRunCandidate[];
  tasks: readonly TournamentV11DryRunTask[];
  receipts: readonly TournamentSemanticReceipt[];
  manifest: Readonly<{
    taskCount: number;
    manifestSha256: string;
    bundleSha256: string;
    receiptLedgerSha256: string;
    exposureLayoutHash: string;
    modeDifficultyCounts: Readonly<Record<string, number>>;
    fill: Readonly<{
      total: number;
      contentWordCount: number;
      articleAndToBeCount: number;
      maxOptionSetCount: number;
      maxCorrectTokenCount: number;
      positionCounts: Readonly<{ first: number; middle: number; last: number }>;
    }>;
  }>;
  candidateRejections: Readonly<{
    total: number;
    byReason: Readonly<Record<string, number>>;
  }>;
  historicalExclusions: number;
  productionWrites: 0;
  providerCalls: 0;
}>;

export type TournamentV11DryRunArtifact = Readonly<{
  path: 'manifest.json' | 'candidate-rejections.json' | 'reviewed-tasks.ndjson'
    | 'receipt-index.json' | 'exposure-report.json' | 'REPORT.md';
  content: string;
  sha256: string;
}>;

function invalid(): never {
  throw new Error('tournament_v11_dry_run_invalid');
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
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
  invalid();
}

function canonicalSha256(value: unknown): string {
  return sha256(canonical(value));
}

function finalizedPoolEvidence(finalized: FinalizedTournamentV11TaskPool): unknown {
  return {
    ...finalized,
    tasks: [...finalized.tasks].sort((left, right) => left.taskId.localeCompare(right.taskId)),
  };
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function finiteCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function exactCounts(actual: Readonly<Record<string, number>>): boolean {
  const keys = Object.keys(actual).sort();
  return keys.length === CELL_KEYS.length && keys.every((key, index) => (
    key === CELL_KEYS[index]
    && actual[key] === TOURNAMENT_V11_CELL_QUOTAS[key as keyof typeof TOURNAMENT_V11_CELL_QUOTAS]
  ));
}

type ValidatedDryRun = Readonly<{
  finalized: FinalizedTournamentV11TaskPool;
  reviewedTasks: readonly TournamentV11DryRunTask[];
  runtimeAudit: TournamentV11RuntimeAudit;
  finalizedPoolSha256: string;
}>;

function validate(input: TournamentV11DryRunInput): ValidatedDryRun {
  if (!input || input.poolVersion !== TOURNAMENT_POOL_V11_VERSION
    || input.productionWrites !== 0
    || input.providerCalls !== 0
    || input.candidates.length < 4_000 || input.tasks.length !== 4_000
    || !Array.isArray(input.receipts) || input.receipts.length !== 4_000
    || input.manifest.taskCount !== 4_000
    || ![input.manifest.manifestSha256, input.manifest.bundleSha256,
      input.manifest.receiptLedgerSha256, input.manifest.exposureLayoutHash].every((value) => HASH.test(value))
    || !exactCounts(input.manifest.modeDifficultyCounts)) invalid();

  const fill = input.manifest.fill;
  if (fill.total !== 500 || fill.contentWordCount < 300 || fill.articleAndToBeCount > 75
    || fill.maxOptionSetCount > 10 || fill.maxCorrectTokenCount > 40
    || fill.positionCounts.first < 75 || fill.positionCounts.middle < 75 || fill.positionCounts.last < 75) invalid();

  const rejectionValues = Object.values(input.candidateRejections.byReason);
  if (!finiteCount(input.candidateRejections.total) || rejectionValues.some((value) => !finiteCount(value))
    || rejectionValues.reduce((sum, value) => sum + value, 0) !== input.candidateRejections.total
    || !finiteCount(input.historicalExclusions)
    || (input.candidateRejections.byReason.historical_signature ?? 0) !== input.historicalExclusions) invalid();

  const deterministicRejections = Object.fromEntries(Object.entries(input.candidateRejections.byReason)
    .filter(([reason]) => reason !== 'historical_signature'));
  const selection = selectTournamentV11Candidates({
    candidates: input.candidates,
    historicalExclusions: input.historicalExclusions,
    deterministicRejections,
  });
  if (!selection.ok) invalid();
  const receipts = new Map<string, TournamentSemanticReceipt>();
  for (const receipt of input.receipts) {
    if (!receipt || receipts.has(receipt.contentSha256)) invalid();
    receipts.set(receipt.contentSha256, receipt);
  }
  let finalized: FinalizedTournamentV11TaskPool;
  try { finalized = finalizeTournamentV11TaskPool({ selection, receipts }); } catch { invalid(); }
  const selectedByContent = new Map(selection.selected.map((candidate) => [candidate.contentSha256, candidate] as const));
  const reviewedTasks = finalized.tasks.map((task) => Object.freeze({
    candidateId: selectedByContent.get(task.contentSha256)!.candidateId,
    task,
  }));
  if (input.manifest.manifestSha256 !== finalized.manifestSha256
    || input.manifest.bundleSha256 !== finalized.bundleSha256
    || input.manifest.receiptLedgerSha256 !== finalized.receiptLedgerSha256
    || input.manifest.exposureLayoutHash !== finalized.exposureLayoutHash
    || canonical(input.manifest.modeDifficultyCounts) !== canonical(selection.manifest.modeDifficultyCounts)
    || input.manifest.fill.total !== selection.manifest.fill.total
    || input.manifest.fill.contentWordCount !== selection.manifest.fill.contentWordCount
    || input.manifest.fill.articleAndToBeCount !== selection.manifest.fill.articleAndToBeCount
    || input.manifest.fill.maxOptionSetCount !== Math.max(...Object.values(selection.manifest.fill.optionSetCounts))
    || input.manifest.fill.maxCorrectTokenCount !== Math.max(...Object.values(selection.manifest.fill.correctTokenCounts))
    || canonical(input.manifest.fill.positionCounts) !== canonical(selection.manifest.fill.positionCounts)) invalid();
  const supplied = [...input.tasks].sort((left, right) => left.task.taskId.localeCompare(right.task.taskId));
  const exact = [...reviewedTasks].sort((left, right) => left.task.taskId.localeCompare(right.task.taskId));
  if (canonical(supplied) !== canonical(exact)) invalid();
  let runtimeAudit: TournamentV11RuntimeAudit;
  try { runtimeAudit = auditTournamentV11RuntimePool(finalized); } catch (error) {
    throw new Error(`tournament_v11_dry_run_invalid:${error instanceof Error ? error.message : 'runtime_audit'}`);
  }
  return Object.freeze({
    finalized,
    reviewedTasks: Object.freeze(reviewedTasks),
    runtimeAudit,
    finalizedPoolSha256: canonicalSha256(finalizedPoolEvidence(finalized)),
  });
}

export function buildTournamentV11DryRunArtifacts(input: TournamentV11DryRunInput): Readonly<{
  summary: Readonly<{
    poolVersion: typeof TOURNAMENT_POOL_V11_VERSION;
    candidateCount: number;
    reviewedTaskCount: 4_000;
    receiptCount: 4_000;
    historicalExclusions: number;
    productionWrites: 0;
    providerCalls: 0;
    exposureDays: 730;
    roomsSimulated: number;
    allTaskIdsSeen: 4_000;
    allBucketsSeen: number;
  }>;
  files: readonly TournamentV11DryRunArtifact[];
}> {
  const validated = validate(input);
  const sortedTasks = [...validated.reviewedTasks].sort((left, right) => left.task.taskId.localeCompare(right.task.taskId));
  const receiptIndex = sortedTasks.map(({ candidateId, task }) => {
    return {
      taskId: task.taskId,
      candidateId,
      contentSha256: task.contentSha256,
      semanticReceiptId: task.semanticReceiptId,
      semanticReceiptSha256: task.semanticReceiptSha256,
    };
  });
  const summary = Object.freeze({
    poolVersion: TOURNAMENT_POOL_V11_VERSION,
    candidateCount: input.candidates.length,
    reviewedTaskCount: 4_000 as const,
    receiptCount: 4_000 as const,
    historicalExclusions: input.historicalExclusions,
    productionWrites: 0 as const,
    providerCalls: 0 as const,
    exposureDays: 730 as const,
    roomsSimulated: validated.runtimeAudit.roomsSimulated,
    allTaskIdsSeen: 4_000 as const,
    allBucketsSeen: validated.runtimeAudit.bucketCount,
  });
  const manifest = {
    kind: 'tournament_pool_v11_dry_run_v1',
    ...summary,
    pins: {
      manifestSha256: input.manifest.manifestSha256,
      bundleSha256: input.manifest.bundleSha256,
      receiptLedgerSha256: input.manifest.receiptLedgerSha256,
      exposureLayoutHash: input.manifest.exposureLayoutHash,
      finalizedPoolSha256: validated.finalizedPoolSha256,
      runtimeAuditSha256: validated.runtimeAudit.auditSha256,
    },
    modeDifficultyCounts: input.manifest.modeDifficultyCounts,
    fillDiversity: input.manifest.fill,
    gates: {
      exactTaskCount: true,
      exactReceiptCoverage: true,
      diversity: true,
      exposure730Days: true,
      exactRuntimeAudit: true,
      productionWrites: 0,
      providerCalls: 0,
    },
  };
  const reports: Array<readonly [TournamentV11DryRunArtifact['path'], string]> = [
    ['manifest.json', json(manifest)],
    ['candidate-rejections.json', json({
      candidateCount: input.candidates.length,
      historicalExclusions: input.historicalExclusions,
      ...input.candidateRejections,
    })],
    ['reviewed-tasks.ndjson', `${sortedTasks.map((task) => JSON.stringify(task)).join('\n')}\n`],
    ['receipt-index.json', json(receiptIndex)],
    ['exposure-report.json', json(validated.runtimeAudit)],
    ['REPORT.md', [
      '# Tournament pool v11 — zero-write audit',
      '',
      `- poolVersion: ${TOURNAMENT_POOL_V11_VERSION}`,
      `- candidates: ${input.candidates.length}`,
      '- reviewedTasks: 4000',
      '- exactReceipts: 4000',
      `- historicalExclusions: ${input.historicalExclusions}`,
      '- exposureDays: 730',
      `- roomsSimulated: ${validated.runtimeAudit.roomsSimulated}`,
      '- maxAdjacentRoomOverlap: 0',
      '- provenanceCollisions: 0',
      '- providerCalls: 0',
      '- productionWrites: 0',
      '',
      'This artifact is audit evidence only. It does not publish or activate the v11 pool.',
      '',
    ].join('\n')],
  ];
  const files = Object.freeze(reports.map(([path, content]) => Object.freeze({
    path, content, sha256: sha256(content),
  })));
  return Object.freeze({ summary, files });
}
