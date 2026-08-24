import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createTournamentSemanticCandidate } from './tournament_semantic_contract';
import { buildTournamentV11Candidates, type V11CandidateSourceDay } from './tournament_pool_v11_candidates';
import { selectTournamentV11Candidates } from './tournament_pool_v11_selector';
import {
  semanticReceiptId,
  validateTournamentSemanticReceipt,
  type TournamentSemanticReceipt,
} from './tournament_semantic_receipt_store';
import { TOURNAMENT_SEMANTIC_PROMPTS } from './tournament_semantic_review';
import {
  finalizeTournamentV11Bundle,
  isCompleteTournamentV11BundleForJob,
  tournamentV11BundleTaskPath,
  type TournamentV11BundlePersistence,
} from './tournament_pool_v11_bundle';
import {
  finalizeTournamentV11TaskPool,
  TOURNAMENT_POOL_V11_VERSION,
  tournamentV11TaskId,
  type FinalizedTournamentV11TaskPool,
} from './tournament_pool_v11_factory';
import {
  auditTournamentV11RuntimePool,
  type TournamentV11RuntimeAudit,
} from './tournament_pool_v11_runtime_audit';
import { buildTournamentV11DryRunArtifacts } from './tournament_pool_v11_dry_run';

jest.setTimeout(600_000);

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

// The real 730-day production audit remains covered by the dedicated 231.7s gate.
// Bundle tests use its exact compact output contract to avoid rerunning that gate.
function runtimeAuditFor(finalized: FinalizedTournamentV11TaskPool): TournamentV11RuntimeAudit {
  const body = {
    kind: 'tournament_pool_v11_runtime_audit_v1' as const,
    poolVersion: TOURNAMENT_POOL_V11_VERSION,
    days: 730 as const,
    roomSeries: 2 as const,
    roomsSimulated: 1_460 as const,
    tasksPerRoom: 16 as const,
    taskCount: 4_000 as const,
    bucketCount: 102,
    maxAdjacentTaskOverlap: 0 as const,
    maxAdjacentProvenanceOverlap: 0 as const,
    provenanceCollisions: 0 as const,
    fullTaskCoverage: true as const,
    fullBucketCoverage: true as const,
    speedBoardsChecked: 1,
    speedBoardsWithSixProvenance: 1,
    taskIdsSha256: sha256(finalized.tasks.map(({ taskId }) => taskId).sort()),
    bucketIdsSha256: sha256([...new Set(finalized.tasks.map(({ exposureBucket }) => exposureBucket))].sort()),
    manifestSha256: finalized.manifestSha256,
    bundleSha256: finalized.bundleSha256,
    receiptLedgerSha256: finalized.receiptLedgerSha256,
    exposureLayoutHash: finalized.exposureLayoutHash,
  };
  return { ...body, auditSha256: sha256(body) };
}

class MemoryBundlePersistence implements TournamentV11BundlePersistence {
  rows = new Map<string, unknown>();
  async get(path: string) { return this.rows.get(path) ?? null; }
  async create(path: string, value: unknown) {
    if (this.rows.has(path)) throw new Error('already_exists');
    this.rows.set(path, structuredClone(value));
  }
  async compareAndSet(path: string, expectedRevision: number, value: unknown) {
    const current = this.rows.get(path) as { revision?: number } | undefined;
    if (!current || current.revision !== expectedRevision) throw new Error('publication_revision_conflict');
    this.rows.set(path, structuredClone(value));
  }
}

const bundleJobBinding = Object.freeze({
  jobId: `tsj_${'1'.repeat(64)}`,
  queueSha256: '2'.repeat(64),
  reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
  promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
  primaryModel: 'gpt-4.1-mini',
  adversarialModel: 'gpt-4.1',
});

function speedCandidate(index: number) {
  return createTournamentSemanticCandidate({
    candidateId: `bundle-candidate-${index}`, mode: 'speed_match', difficulty: 1,
    prompt: 'Сопоставьте пары.', context: { topic: `topic-${index}` },
    reviewSubjects: Array.from({ length: 6 }, (_, pair) => ({
      subjectId: `pair_${pair + 1}`, kind: 'speed_pair' as const, declaredRole: 'pair' as const,
      text: `word-${index}-${pair}`, completedText: `слово-${index}-${pair}`,
      metadata: { partOfSpeech: 'noun', senseHint: 'none' },
    })),
    provenanceKeys: Array.from({ length: 6 }, (_, pair) => `bundle:${index}:vocab-${pair}`),
  });
}

function receiptFor(candidate: ReturnType<typeof speedCandidate>): Extract<TournamentSemanticReceipt, { decision: 'PASS' }> {
  const counts = candidate.mode === 'speed_match'
    ? { acceptableAnswerCount: 6, errorOptionCount: 0 }
    : candidate.mode === 'guess_phrase' || candidate.mode === 'fill_gap'
      ? { acceptableAnswerCount: 1, errorOptionCount: 3 }
      : { acceptableAnswerCount: 1, errorOptionCount: 1 };
  const verdict = (pass: 'primary' | 'adversarial', model: 'gpt-4.1-mini' | 'gpt-4.1') => ({
    contentSha256: candidate.contentSha256, reviewContractVersion: 'tournament-semantic-review-v2',
    promptVersion: `tournament-semantic-${pass}-v3`, pass, model, verdict: 'PASS' as const,
    promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
    ...counts,
    subjects: candidate.reviewSubjects.map((subject) => ({
      subjectId: subject.subjectId, verdict: 'PASS' as const, findingCode: null, explanation: 'ok',
      partOfSpeech: candidate.mode === 'translate_build' ? 'verb' : 'noun',
      grammaticality: candidate.mode === 'guess_phrase' || candidate.mode === 'fill_gap'
        || candidate.mode === 'find_oddity'
        ? (subject.declaredRole === 'correct' || subject.declaredRole === 'safe' ? 'valid' as const : 'invalid' as const)
        : 'not_applicable' as const,
      minimalTwin: candidate.mode === 'guess_phrase' || candidate.mode === 'fill_gap'
        || candidate.mode === 'find_oddity' ? true : null,
      violationType: candidate.mode === 'translate_build' && subject.declaredRole === 'decoy'
        ? 'build_decoy'
        : ((candidate.mode === 'guess_phrase' || candidate.mode === 'fill_gap'
          || candidate.mode === 'find_oddity')
          && subject.declaredRole !== 'correct' && subject.declaredRole !== 'safe'
          ? 'agreement_error' : null),
    })), blockingFindings: [],
  });
  return {
    decision: 'PASS', contentSha256: candidate.contentSha256,
    canonicalTaskSnapshotHash: candidate.contentSha256, semanticSignature: candidate.semanticSignature,
    candidateId: candidate.candidateId,
    mode: candidate.mode, difficulty: candidate.difficulty, provenanceKeys: candidate.provenanceKeys,
    reviewContractVersion: 'tournament-semantic-review-v2',
    primaryPromptVersion: 'tournament-semantic-primary-v3',
    adversarialPromptVersion: 'tournament-semantic-adversarial-v3',
    promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
    primaryModel: 'gpt-4.1-mini', adversarialModel: 'gpt-4.1',
    requestAccounting: { attempts: 2, inputTokens: 1, outputTokens: 1 },
    createdAtMs: 1, completedAtMs: 2, generationJobId: 'job-a',
    primaryVerdict: verdict('primary', 'gpt-4.1-mini'),
    adversarialVerdict: verdict('adversarial', 'gpt-4.1'),
  };
}

describe('finalizeTournamentV11Bundle', () => {
  const sourceDays = JSON.parse(readFileSync(
    join(__dirname, 'generated', 'tournament_content.json'),
    'utf8',
  )) as readonly V11CandidateSourceDay[];
  const build = buildTournamentV11Candidates({ sourceDays });
  const fullSelection = selectTournamentV11Candidates({ candidates: build.candidates });
  if (!fullSelection.ok) throw new Error(`full_selection_failed:${JSON.stringify(fullSelection.shortages)}`);
  const fullReceipts = new Map(fullSelection.selected.map((candidate) => (
    [candidate.contentSha256, receiptFor(candidate)] as const
  )));
  const finalized = finalizeTournamentV11TaskPool({ selection: fullSelection, receipts: fullReceipts });
  const runtimeAudit = auditTournamentV11RuntimePool(finalized);

  it('rejects task IDs that are not one Firestore document segment', () => {
    expect(() => tournamentV11BundleTaskPath(
      'tournament_pool_v11_bundles/tpool_test_v11',
      'safe-task-id',
    )).not.toThrow();
    expect(() => tournamentV11BundleTaskPath(
      'tournament_pool_v11_bundles/tpool_test_v11',
      'nested/task',
    )).toThrow('bundle_task_id_invalid');
  });

  it('requires the full subject matrix and distinct reviewer identities', () => {
    const candidate = speedCandidate(1);
    const receipt = receiptFor(candidate);
    expect(() => validateTournamentSemanticReceipt(receipt, candidate)).not.toThrow();
    expect(() => validateTournamentSemanticReceipt({
      ...receipt,
      adversarialModel: receipt.primaryModel,
      adversarialVerdict: { ...receipt.adversarialVerdict, model: receipt.primaryModel },
    }, candidate)).toThrow('receipt_invalid');
    expect(() => validateTournamentSemanticReceipt({
      ...receipt,
      adversarialVerdict: { ...receipt.adversarialVerdict, subjects: [] },
    }, candidate)).toThrow();
  });

  it('rejects caller-supplied test quotas instead of publishing a partial bundle', async () => {
    const partial = {
      ...finalized,
      tasks: finalized.tasks.slice(0, 3),
    } as unknown as FinalizedTournamentV11TaskPool;
    const persistence = new MemoryBundlePersistence();

    await expect(finalizeTournamentV11Bundle({
      finalized: partial, runtimeAudit, jobBinding: bundleJobBinding, persistence,
    })).rejects.toThrow('bundle_input_invalid');
    expect(persistence.rows.size).toBe(0);
  });

  it('fails closed when any exact approval is absent from an otherwise publishable 4,000 selection', async () => {
    const receipts = new Map(fullReceipts);
    receipts.delete(fullSelection.selected[0].contentSha256);
    expect(() => finalizeTournamentV11TaskPool({ selection: fullSelection, receipts }))
      .toThrow('tournament_v11_receipt_missing');
  });

  it('publishes a full exact bundle through bounded write/verify phases and binds receipt and manifest changes into its hash', async () => {
    const persistence = new MemoryBundlePersistence();
    let result = await finalizeTournamentV11Bundle({
      finalized, runtimeAudit,
      jobBinding: bundleJobBinding, persistence, maxOperations: 500,
    });
    const firstRuntimeTask = [...finalized.tasks].sort((left, right) => left.taskId.localeCompare(right.taskId))[0];
    const firstTask = fullSelection.selected.find((candidate) => (
      candidate.contentSha256 === firstRuntimeTask.contentSha256
    ))!;
    const firstReceipt = fullReceipts.get(firstRuntimeTask.contentSha256);
    expect(firstReceipt).toBeDefined();
    const runtimeTaskId = tournamentV11TaskId('tpool_20260808_v11', firstRuntimeTask.contentSha256);
    const storedRuntimeTask = persistence.rows.get(
      `tournament_pool_v11_bundles/${TOURNAMENT_POOL_V11_VERSION}/tasks/${runtimeTaskId}`,
    );
    expect(storedRuntimeTask).toEqual(expect.objectContaining({
      taskId: runtimeTaskId,
      payload: expect.any(Object),
      explanation: expect.any(Object),
      tags: ['pool:tpool_20260808_v11', expect.stringMatching(/^provenance-parity:[01]$/u)],
      semanticReceiptSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      semanticReceiptId: semanticReceiptId(
        firstRuntimeTask.contentSha256,
        firstReceipt!.reviewContractVersion,
        firstReceipt!.promptSetSha256,
        { primaryModel: firstReceipt!.primaryModel, adversarialModel: firstReceipt!.adversarialModel },
      ),
    }));
    expect(storedRuntimeTask).not.toHaveProperty('candidate');
    while (result.continuation) {
      result = await finalizeTournamentV11Bundle({
        finalized, runtimeAudit,
        jobBinding: bundleJobBinding, persistence, maxOperations: 500,
      });
    }
    expect(result).toMatchObject({
      state: 'ready', taskCount: 4_000, writeCursor: 4_000, verifyCursor: 4_000, continuation: false,
    });
    expect(persistence.rows.get(`tournament_pool_v11_bundles/${TOURNAMENT_POOL_V11_VERSION}`))
      .toEqual(expect.objectContaining({
        ...bundleJobBinding,
        taskCount: 4_000,
        bundleSha256: result.bundleSha256,
        publicationPlanSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        runtimeAudit: expect.objectContaining({ days: 730, fullTaskCoverage: true }),
      }));
    expect(isCompleteTournamentV11BundleForJob(
      persistence.rows.get(`tournament_pool_v11_bundles/${TOURNAMENT_POOL_V11_VERSION}`),
      persistence.rows.get(`tournament_pool_v11_bundles/${TOURNAMENT_POOL_V11_VERSION}/internal/publication_checkpoint`),
      bundleJobBinding,
    )).toBe(true);

    // This is the production admin seam, not a hand-authored migration fixture:
    // exact reviewed candidates -> runtime factory -> audited create-only bundle
    // -> zero-write artifact -> migration validator.
    const candidateByContent = new Map(fullSelection.selected.map((candidate) => (
      [candidate.contentSha256, candidate] as const
    )));
    const reviewedTasks = finalized.tasks.map((task) => ({
      candidateId: candidateByContent.get(task.contentSha256)!.candidateId,
      task,
    }));
    const deterministicRejections = fullSelection.manifest.deterministicRejections;
    const historicalExclusions = fullSelection.manifest.historicalExclusions;
    const candidateRejections = {
      total: Object.values(deterministicRejections).reduce((sum, count) => sum + count, 0) + historicalExclusions,
      byReason: { ...deterministicRejections, historical_signature: historicalExclusions },
    };
    const artifacts = buildTournamentV11DryRunArtifacts({
      poolVersion: TOURNAMENT_POOL_V11_VERSION,
      candidates: fullSelection.selected,
      tasks: reviewedTasks,
      receipts: [...fullReceipts.values()],
      manifest: {
        taskCount: finalized.taskCount,
        manifestSha256: finalized.manifestSha256,
        bundleSha256: finalized.bundleSha256,
        receiptLedgerSha256: finalized.receiptLedgerSha256,
        exposureLayoutHash: finalized.exposureLayoutHash,
        modeDifficultyCounts: fullSelection.manifest.modeDifficultyCounts,
        fill: {
          total: fullSelection.manifest.fill.total,
          contentWordCount: fullSelection.manifest.fill.contentWordCount,
          articleAndToBeCount: fullSelection.manifest.fill.articleAndToBeCount,
          maxOptionSetCount: Math.max(...Object.values(fullSelection.manifest.fill.optionSetCounts)),
          maxCorrectTokenCount: Math.max(...Object.values(fullSelection.manifest.fill.correctTokenCounts)),
          positionCounts: fullSelection.manifest.fill.positionCounts,
        },
      },
      candidateRejections,
      historicalExclusions,
      productionWrites: 0,
      providerCalls: 0,
    });
    const byPath = new Map(artifacts.files.map((file) => [file.path, file.content] as const));
    const migration = require('../../scripts/apply-tournament-pool-v11.cjs');
    const manifest = JSON.parse(byPath.get('manifest.json')!);
    const reviewed = byPath.get('reviewed-tasks.ndjson')!.trim().split('\n').map((line) => JSON.parse(line));
    const rows = reviewed.map(({ task }: { task: { taskId: string } }) => ({ id: task.taskId, data: task }));
    const receiptIndex = JSON.parse(byPath.get('receipt-index.json')!);
    const emittedRuntimeAudit = JSON.parse(byPath.get('exposure-report.json')!);
    expect(() => migration.validateTargetArtifacts({
      manifest,
      rows,
      receiptIndex,
      runtimeAudit: emittedRuntimeAudit,
      pins: {
        ...manifest.pins,
        taskIdsSha256: migration.taskIdsSha256(rows.map(({ id }: { id: string }) => id)),
        taskRowsSha256: migration.canonicalSha256([...rows].sort((left, right) => left.id.localeCompare(right.id))),
      },
    })).not.toThrow();

    const changedReceipts = new Map(fullReceipts);
    const changed = receiptFor(firstTask);
    const changedPrimaryModel = 'gpt-4.1-nano' as const;
    changedReceipts.set(firstTask.contentSha256, {
      ...changed,
      primaryModel: changedPrimaryModel,
      primaryVerdict: { ...changed.primaryVerdict, model: changedPrimaryModel },
    });
    const changedReceiptFinalized = finalizeTournamentV11TaskPool({
      selection: fullSelection, receipts: changedReceipts,
    });
    const changedReceiptResult = await finalizeTournamentV11Bundle({
      finalized: changedReceiptFinalized,
      runtimeAudit: runtimeAuditFor(changedReceiptFinalized),
      jobBinding: bundleJobBinding,
      persistence: new MemoryBundlePersistence(), maxOperations: 1,
    });
    expect(changedReceiptResult.bundleSha256).not.toBe(result.bundleSha256);

    const changedManifestSelection = selectTournamentV11Candidates({
      candidates: fullSelection.selected,
      historicalExclusions: fullSelection.manifest.historicalExclusions + 1,
      deterministicRejections: fullSelection.manifest.deterministicRejections,
    });
    expect(changedManifestSelection.ok).toBe(true);
    if (!changedManifestSelection.ok) return;
    const changedManifestFinalized = finalizeTournamentV11TaskPool({
      selection: changedManifestSelection, receipts: fullReceipts,
    });
    const changedManifestResult = await finalizeTournamentV11Bundle({
      finalized: changedManifestFinalized,
      runtimeAudit: runtimeAuditFor(changedManifestFinalized),
      jobBinding: bundleJobBinding,
      persistence: new MemoryBundlePersistence(), maxOperations: 1,
    });
    expect(changedManifestResult.bundleSha256).not.toBe(result.bundleSha256);

    const provenanceSource = fullSelection.selected.find((candidate) => candidate.mode === 'speed_match');
    expect(provenanceSource).toBeDefined();
    if (!provenanceSource) return;
    const provenanceChangedCandidate = createTournamentSemanticCandidate({
      candidateId: provenanceSource.candidateId,
      mode: provenanceSource.mode,
      difficulty: provenanceSource.difficulty,
      prompt: provenanceSource.prompt,
      context: provenanceSource.context,
      reviewSubjects: provenanceSource.reviewSubjects,
      provenanceKeys: ['mutation:999:provenance', ...provenanceSource.provenanceKeys.slice(1)],
    });
    expect(provenanceChangedCandidate.semanticSignature).toBe(provenanceSource.semanticSignature);
    expect(provenanceChangedCandidate.contentSha256).not.toBe(provenanceSource.contentSha256);
    const provenanceChangedSelection = selectTournamentV11Candidates({
      candidates: fullSelection.selected.map((candidate) => (
        candidate.candidateId === provenanceSource.candidateId ? provenanceChangedCandidate : candidate
      )),
      historicalExclusions: fullSelection.manifest.historicalExclusions,
      deterministicRejections: fullSelection.manifest.deterministicRejections,
    });
    expect(provenanceChangedSelection.ok).toBe(true);
    if (!provenanceChangedSelection.ok) return;
    const provenanceChangedReceipts = new Map(fullReceipts);
    provenanceChangedReceipts.delete(provenanceSource.contentSha256);
    provenanceChangedReceipts.set(
      provenanceChangedCandidate.contentSha256,
      receiptFor(provenanceChangedCandidate),
    );
    const provenanceChangedFinalized = finalizeTournamentV11TaskPool({
      selection: provenanceChangedSelection, receipts: provenanceChangedReceipts,
    });
    const provenanceChangedResult = await finalizeTournamentV11Bundle({
      finalized: provenanceChangedFinalized,
      runtimeAudit: runtimeAuditFor(provenanceChangedFinalized),
      jobBinding: bundleJobBinding,
      persistence: new MemoryBundlePersistence(),
      maxOperations: 1,
    });
    expect(provenanceChangedResult.bundleSha256).not.toBe(result.bundleSha256);
  });

  it('blocks a fixed-path bundle from a different queue or review identity', async () => {
    const persistence = new MemoryBundlePersistence();
    await finalizeTournamentV11Bundle({
      finalized, runtimeAudit, jobBinding: bundleJobBinding, persistence, maxOperations: 1,
    });
    for (const jobBinding of [
      { ...bundleJobBinding, jobId: `tsj_${'3'.repeat(64)}`, queueSha256: '4'.repeat(64) },
      { ...bundleJobBinding, primaryModel: 'gpt-4.1-nano' },
    ]) await expect(finalizeTournamentV11Bundle({
      finalized, runtimeAudit, jobBinding, persistence, maxOperations: 1,
    })).rejects.toThrow('publication_plan_conflict');
  });
});
