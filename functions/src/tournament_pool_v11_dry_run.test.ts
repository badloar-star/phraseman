import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  type TournamentSemanticCandidate,
} from './tournament_semantic_contract';
import type { TournamentSemanticReceipt } from './tournament_semantic_receipt_store';
import { TOURNAMENT_SEMANTIC_PROMPTS } from './tournament_semantic_review';
import {
  finalizeTournamentV11TaskPool,
  TOURNAMENT_POOL_V11_VERSION,
} from './tournament_pool_v11_factory';
import { selectTournamentV11Candidates } from './tournament_pool_v11_selector';
import {
  buildTournamentV11Candidates,
  type V11CandidateSourceDay,
} from './tournament_pool_v11_candidates';
import {
  buildTournamentV11DryRunArtifacts,
  type TournamentV11DryRunCandidate,
  type TournamentV11DryRunTask,
} from './tournament_pool_v11_dry_run';

function receiptFor(candidate: TournamentSemanticCandidate): Extract<TournamentSemanticReceipt, { decision: 'PASS' }> {
  const counts = candidate.mode === 'speed_match'
    ? { acceptableAnswerCount: 6, errorOptionCount: 0 }
    : candidate.mode === 'guess_phrase' || candidate.mode === 'fill_gap'
      ? { acceptableAnswerCount: 1, errorOptionCount: 3 }
      : { acceptableAnswerCount: 1, errorOptionCount: 1 };
  const subjects = candidate.reviewSubjects.map((subject) => ({
    subjectId: subject.subjectId, verdict: 'PASS' as const, findingCode: null,
    explanation: 'Independent exact review.',
    partOfSpeech: candidate.mode === 'translate_build' && subject.declaredRole === 'required'
      && subject.subjectId.endsWith('_0') ? 'pronoun' : 'verb',
    grammaticality: candidate.mode === 'translate_build' || candidate.mode === 'speed_match'
      ? 'not_applicable' as const
      : subject.declaredRole === 'correct' || subject.declaredRole === 'safe' ? 'valid' as const : 'invalid' as const,
    minimalTwin: candidate.mode === 'translate_build' || candidate.mode === 'speed_match' ? null : true,
    violationType: subject.declaredRole === 'distractor' || subject.declaredRole === 'odd'
      ? 'exact_error' : subject.declaredRole === 'decoy' ? 'build_decoy' : null,
  }));
  const verdict = (pass: 'primary' | 'adversarial', model: 'gpt-4.1-mini' | 'gpt-4.1') => ({
    contentSha256: candidate.contentSha256,
    reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    promptVersion: TOURNAMENT_SEMANTIC_PROMPTS[pass].version,
    promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
    pass, model, verdict: 'PASS' as const, ...counts, subjects, blockingFindings: [],
  });
  return {
    decision: 'PASS', contentSha256: candidate.contentSha256,
    canonicalTaskSnapshotHash: candidate.contentSha256, semanticSignature: candidate.semanticSignature,
    candidateId: candidate.candidateId, mode: candidate.mode, difficulty: candidate.difficulty,
    provenanceKeys: candidate.provenanceKeys,
    reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    primaryPromptVersion: TOURNAMENT_SEMANTIC_PROMPTS.primary.version,
    adversarialPromptVersion: TOURNAMENT_SEMANTIC_PROMPTS.adversarial.version,
    promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
    primaryModel: 'gpt-4.1-mini', adversarialModel: 'gpt-4.1',
    requestAccounting: { attempts: 2, inputTokens: 1, outputTokens: 1 },
    createdAtMs: 1, completedAtMs: 2, generationJobId: 'dry-run-fixture',
    primaryVerdict: verdict('primary', 'gpt-4.1-mini'),
    adversarialVerdict: verdict('adversarial', 'gpt-4.1'),
  };
}

function buildFixture() {
  const candidates: readonly TournamentV11DryRunCandidate[] = (() => {
    const sourceDays = JSON.parse(readFileSync(
      join(__dirname, 'generated', 'tournament_content.json'), 'utf8',
    )) as readonly V11CandidateSourceDay[];
    const build = buildTournamentV11Candidates({ sourceDays });
    const sourceSelection = selectTournamentV11Candidates({ candidates: build.candidates });
    if (!sourceSelection.ok) {
      throw new Error(`fixture_source_selection_invalid:${JSON.stringify(sourceSelection.shortages)}`);
    }
    // Retain only the exact production-selected 4,000 so the unselected corpus can
    // be reclaimed before the 730-day runtime audit and mutation checks.
    return [...sourceSelection.selected];
  })();
  const selection = selectTournamentV11Candidates({
    candidates,
  });
  if (!selection.ok) throw new Error(`fixture_selection_invalid:${JSON.stringify(selection.shortages)}`);
  const receipts = selection.selected.map(receiptFor);
  const finalized = finalizeTournamentV11TaskPool({
    selection,
    receipts: new Map(receipts.map((receipt) => [receipt.contentSha256, receipt] as const)),
  });
  const selectedByContent = new Map(selection.selected.map((candidate) => [candidate.contentSha256, candidate] as const));
  const exactTasks = finalized.tasks.map((task) => ({
    candidateId: selectedByContent.get(task.contentSha256)!.candidateId,
    task,
  }));
  return {
    poolVersion: TOURNAMENT_POOL_V11_VERSION,
    candidates,
    tasks: exactTasks,
    receipts,
    manifest: {
      taskCount: 4_000,
      manifestSha256: finalized.manifestSha256,
      bundleSha256: finalized.bundleSha256,
      receiptLedgerSha256: finalized.receiptLedgerSha256,
      exposureLayoutHash: finalized.exposureLayoutHash,
      modeDifficultyCounts: selection.manifest.modeDifficultyCounts,
      fill: {
        total: selection.manifest.fill.total,
        contentWordCount: selection.manifest.fill.contentWordCount,
        articleAndToBeCount: selection.manifest.fill.articleAndToBeCount,
        maxOptionSetCount: Math.max(...Object.values(selection.manifest.fill.optionSetCounts)),
        maxCorrectTokenCount: Math.max(...Object.values(selection.manifest.fill.correctTokenCounts)),
        positionCounts: selection.manifest.fill.positionCounts,
      },
    },
    candidateRejections: { total: 0, byReason: {} },
    historicalExclusions: 0,
    productionWrites: 0,
    providerCalls: 0,
  } as const;
}

let cachedFixture: ReturnType<typeof buildFixture> | undefined;
function fixture(): ReturnType<typeof buildFixture> {
  cachedFixture ??= buildFixture();
  return cachedFixture;
}

describe('tournament v11 zero-write dry-run artifacts', () => {
  it('emits the complete hash-pinned audit packet without provider calls or writes', () => {
    const artifacts = buildTournamentV11DryRunArtifacts(fixture());
    expect(artifacts.summary).toEqual(expect.objectContaining({
      poolVersion: TOURNAMENT_POOL_V11_VERSION,
      candidateCount: fixture().candidates.length,
      reviewedTaskCount: 4_000,
      receiptCount: 4_000,
      historicalExclusions: 0,
      productionWrites: 0,
      providerCalls: 0,
      exposureDays: 730,
      roomsSimulated: 1_460,
      allTaskIdsSeen: 4_000,
      allBucketsSeen: 102,
    }));
    expect(artifacts.files.map(({ path }) => path)).toEqual([
      'manifest.json', 'candidate-rejections.json', 'reviewed-tasks.ndjson',
      'receipt-index.json', 'exposure-report.json', 'REPORT.md',
    ]);
    expect(artifacts.files.every(({ sha256 }) => /^[a-f0-9]{64}$/u.test(sha256))).toBe(true);
    const manifest = JSON.parse(artifacts.files[0].content);
    expect(manifest.gates).toEqual(expect.objectContaining({
      exactTaskCount: true, exactReceiptCoverage: true, diversity: true,
      exposure730Days: true, exactRuntimeAudit: true, productionWrites: 0, providerCalls: 0,
    }));
    expect(artifacts.files[2].content.trim().split('\n')).toHaveLength(4_000);
    expect(JSON.parse(artifacts.files[3].content)).toHaveLength(4_000);
    expect(artifacts.files[5].content).toContain('productionWrites: 0');
  });

  it('feeds its complete reviewed-task artifact directly into fail-closed migration validation', () => {
    const apply = require('../../scripts/apply-tournament-pool-v11.cjs');
    const artifacts = buildTournamentV11DryRunArtifacts(fixture());
    const byPath = new Map(artifacts.files.map((file) => [file.path, file.content] as const));
    const manifest = JSON.parse(byPath.get('manifest.json')!);
    const reviewed = byPath.get('reviewed-tasks.ndjson')!.trim().split('\n').map((line) => JSON.parse(line));
    const rows = reviewed.map(({ task }: TournamentV11DryRunTask) => ({ id: task.taskId, data: task }));
    const receiptIndex = JSON.parse(byPath.get('receipt-index.json')!);
    const runtimeAudit = JSON.parse(byPath.get('exposure-report.json')!);
    expect(reviewed[0]).toEqual(expect.objectContaining({
      candidateId: expect.any(String),
      task: expect.objectContaining({ payload: expect.any(Object), explanation: expect.any(Object) }),
    }));
    expect(() => apply.validateTargetArtifacts({
      manifest,
      rows,
      receiptIndex,
      runtimeAudit,
      pins: {
        ...manifest.pins,
        taskIdsSha256: apply.taskIdsSha256(rows.map(({ id }: { id: string }) => id)),
        taskRowsSha256: apply.canonicalSha256([...rows].sort((a, b) => a.id.localeCompare(b.id))),
      },
    })).not.toThrow();
  });

  it('fails closed on coverage, receipt, diversity, exposure, and write claims', () => {
    const base = fixture();
    const mutations = [
      { ...base, tasks: base.tasks.slice(1) },
      { ...base, tasks: base.tasks.map((reviewed, index) => index === 0
        ? { ...reviewed, task: { ...reviewed.task, semanticReceiptSha256: 'bad' } } : reviewed) },
      { ...base, tasks: base.tasks.map((reviewed, index) => index === 0
        ? { ...reviewed, task: { ...reviewed.task, payload: {} } } : reviewed) },
      { ...base, manifest: { ...base.manifest, fill: { ...base.manifest.fill, contentWordCount: 299 } } },
      { ...base, productionWrites: 1 },
      { ...base, providerCalls: 1 },
      { ...base, productionWrites: undefined },
      { ...base, providerCalls: undefined },
    ];
    for (const mutation of mutations) {
      expect(() => buildTournamentV11DryRunArtifacts(mutation as any)).toThrow('tournament_v11_dry_run_invalid');
    }
  });

  it('rebuilds exact factory tasks instead of accepting substituted payload claims', () => {
    const base = fixture();
    const substituted = {
      ...base,
      tasks: base.tasks.map((reviewed, index) => index === 0 ? {
        ...reviewed,
        task: {
          ...reviewed.task,
          payload: { ...reviewed.task.payload, phrase: 'Valid but substituted reviewed payload.' },
        },
      } : reviewed),
    };
    expect(() => buildTournamentV11DryRunArtifacts(substituted as any))
      .toThrow('tournament_v11_dry_run_invalid');
  });

  it('requires full receipt bodies instead of trusting task receipt hashes', () => {
    const base = fixture();
    expect(() => buildTournamentV11DryRunArtifacts({ ...base, receipts: undefined } as any))
      .toThrow('tournament_v11_dry_run_invalid');
    expect(() => buildTournamentV11DryRunArtifacts({ ...base, receipts: [] } as any))
      .toThrow('tournament_v11_dry_run_invalid');
    for (const driftReceipt of [
      { ...base.receipts[0], semanticSignature: 'f'.repeat(64) },
      { ...base.receipts[0], candidateId: 'wrong-candidate' },
      {
        ...base.receipts[0], adversarialModel: base.receipts[0].primaryModel,
        adversarialVerdict: { ...base.receipts[0].adversarialVerdict, model: base.receipts[0].primaryModel },
      },
      {
        ...base.receipts[0],
        primaryVerdict: { ...base.receipts[0].primaryVerdict, subjects: [] },
      },
    ]) expect(() => buildTournamentV11DryRunArtifacts({
      ...base, receipts: [driftReceipt, ...base.receipts.slice(1)],
    } as any)).toThrow('tournament_v11_dry_run_invalid');
    expect(() => buildTournamentV11DryRunArtifacts({
      ...base,
      tasks: base.tasks.map((row, index) => index === 0 ? {
        ...row,
        task: { ...row.task, semanticReceiptId: 'a'.repeat(64), semanticReceiptSha256: 'b'.repeat(64) },
      } : row),
    } as any)).toThrow('tournament_v11_dry_run_invalid');
  });
});
