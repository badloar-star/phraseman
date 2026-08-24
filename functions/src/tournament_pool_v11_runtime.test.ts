import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  finalizeTournamentV11TaskPool,
  TOURNAMENT_POOL_V11_VERSION,
  TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS,
  type TournamentV11Task,
} from './tournament_pool_v11_factory';
import { buildTournamentV11Candidates, type V11CandidateSourceDay } from './tournament_pool_v11_candidates';
import { selectTournamentV11Candidates } from './tournament_pool_v11_selector';
import { TOURNAMENT_MODES } from './tournament_pool_plan';
import type { TournamentSemanticCandidate } from './tournament_semantic_contract';
import type { TournamentSemanticReceipt } from './tournament_semantic_receipt_store';
import { TOURNAMENT_SEMANTIC_PROMPTS } from './tournament_semantic_review';
import {
  buildTournamentRounds,
  loadTournamentTaskSlicesForToken,
  type TournamentPoolBarrierToken,
} from './tournaments';

jest.setTimeout(600_000);

function exactPassReceipt(candidate: TournamentSemanticCandidate): Extract<TournamentSemanticReceipt, { decision: 'PASS' }> {
  const counts = candidate.mode === 'speed_match'
    ? { acceptableAnswerCount: 6, errorOptionCount: 0 }
    : candidate.mode === 'guess_phrase' || candidate.mode === 'fill_gap'
      ? { acceptableAnswerCount: 1, errorOptionCount: 3 }
      : { acceptableAnswerCount: 1, errorOptionCount: 1 };
  const subjects = candidate.reviewSubjects.map((subject) => ({
    subjectId: subject.subjectId,
    verdict: 'PASS' as const,
    findingCode: null,
    explanation: 'Independent exact review.',
    partOfSpeech: candidate.mode === 'translate_build' && subject.declaredRole === 'required'
      && subject.subjectId.endsWith('_0') ? 'pronoun' : 'verb',
    grammaticality: candidate.mode === 'translate_build' || candidate.mode === 'speed_match'
      ? 'not_applicable' as const
      : subject.declaredRole === 'correct' || subject.declaredRole === 'safe' ? 'valid' as const : 'invalid' as const,
    minimalTwin: candidate.mode === 'translate_build' || candidate.mode === 'speed_match' ? null : true,
    violationType: subject.declaredRole === 'distractor' || subject.declaredRole === 'odd'
      ? 'exact_error'
      : subject.declaredRole === 'decoy' ? 'build_decoy' : null,
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
    canonicalTaskSnapshotHash: candidate.contentSha256,
    semanticSignature: candidate.semanticSignature,
    candidateId: candidate.candidateId, mode: candidate.mode, difficulty: candidate.difficulty,
    provenanceKeys: candidate.provenanceKeys,
    reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    primaryPromptVersion: TOURNAMENT_SEMANTIC_PROMPTS.primary.version,
    adversarialPromptVersion: TOURNAMENT_SEMANTIC_PROMPTS.adversarial.version,
    promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
    primaryModel: 'gpt-4.1-mini', adversarialModel: 'gpt-4.1',
    requestAccounting: { attempts: 2, inputTokens: 1, outputTokens: 1 },
    createdAtMs: 1, completedAtMs: 2, generationJobId: 'actual-runtime-gate',
    primaryVerdict: verdict('primary', 'gpt-4.1-mini'),
    adversarialVerdict: verdict('adversarial', 'gpt-4.1'),
  };
}

function actualFinalizedPool() {
  const sourceDays = JSON.parse(readFileSync(
    join(__dirname, 'generated', 'tournament_content.json'), 'utf8',
  )) as readonly V11CandidateSourceDay[];
  const build = buildTournamentV11Candidates({ sourceDays });
  const selection = selectTournamentV11Candidates({ candidates: build.candidates });
  if (!selection.ok) throw new Error(`actual_selection_shortage:${JSON.stringify(selection.shortages)}`);
  const receipts = new Map(selection.selected.map((candidate) => (
    [candidate.contentSha256, exactPassReceipt(candidate)] as const
  )));
  return finalizeTournamentV11TaskPool({ selection, receipts });
}

describe('tournament v11 730-day runtime gate', () => {
  const finalized = actualFinalizedPool();
  const tasks = finalized.tasks;
  global.gc?.();
  const byId = new Map(tasks.map((task) => [task.taskId, task] as const));
  const byBucket = new Map<string, TournamentV11Task[]>();
  for (const task of tasks) {
    const bucket = byBucket.get(task.exposureBucket) ?? [];
    bucket.push(task);
    byBucket.set(task.exposureBucket, bucket);
  }
  const token: TournamentPoolBarrierToken = {
    generation: TOURNAMENT_POOL_V11_VERSION, revision: 11,
    exposureBucketCounts: TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS,
    exposureLayoutHash: finalized.exposureLayoutHash, taskCount: 4_000,
    manifestSha256: finalized.manifestSha256,
    bundleSha256: finalized.bundleSha256,
    receiptLedgerSha256: finalized.receiptLedgerSha256,
  };

  it('serves every actual finalized task through the production 40-row slice loader over 730 days', async () => {
    expect(tasks).toHaveLength(4_000);
    expect(byBucket.size).toBe(102);
    expect(Math.max(...[...byBucket.values()].map((bucket) => bucket.length))).toBeLessThanOrEqual(40);
    const epoch = Math.floor(Date.parse('2026-08-01T00:00:00.000Z') / 86_400_000);
    const allV11TaskIdsSeen = new Set<string>();
    const taskIdsSeenByBucket = new Map<string, Set<string>>();
    const previousBySeries = new Map<string, Set<string>>();
    const previousRoundsBySeries = new Map<string, string>();
    for (let day = 0; day < 730; day += 1) {
      const dayOrdinal = epoch + day;
      const pool = await loadTournamentTaskSlicesForToken({
        token,
        dayOrdinal,
        readLegacyMode: async () => { throw new Error('v11_legacy_read_forbidden'); },
        readExposureBucket: async (mode, bucket, limit) => {
          expect(limit).toBe(40);
          return (byBucket.get(bucket) ?? []).filter((task) => task.mode === mode).slice(0, limit);
        },
      });
      const date = new Date(dayOrdinal * 86_400_000).toISOString().slice(0, 10);
      for (const [series, roomId] of [
        ['daily_1200', `daily_1200_${date}`],
        ['daily_1900_r1', `daily_1900_${date}_r1`],
      ] as const) {
        const rounds = buildTournamentRounds(roomId, pool);
        expect(rounds).not.toBeNull();
        const roomTaskIds = new Set(rounds!.flatMap(({ taskIds }) => taskIds));
        expect(roomTaskIds.size).toBe(16);
        const roomTasks = [...roomTaskIds].map((taskId) => byId.get(taskId)!);
        const totalProvenanceRefsInRoom = roomTasks.reduce((sum, task) => sum + task.provenanceKeys.length, 0);
        const roomProvenanceKeys = new Set(roomTasks.flatMap((task) => task.provenanceKeys));
        expect(roomProvenanceKeys.size).toBe(totalProvenanceRefsInRoom);
        expect(roomTasks.filter(({ mode }) => mode === 'speed_match')
          .every((task) => task.provenanceKeys.length === 6)).toBe(true);
        const previous = previousBySeries.get(series);
        if (previous) {
          const overlap = [...roomTaskIds].filter((id) => previous.has(id));
          if (overlap.length > 0) throw new Error(`adjacent_overlap:${day}:${series}:previous=${previousRoundsBySeries.get(series)}:current=${JSON.stringify(rounds!.map((round) => round.taskIds.map((id) => `${byId.get(id)?.mode}:${byId.get(id)?.difficulty}:${id}`)))}:overlap=${overlap.map((id) => (
            `${byId.get(id)?.mode}:${byId.get(id)?.difficulty}:${id}`
          )).join(',')}`);
        }
        previousBySeries.set(series, roomTaskIds);
        previousRoundsBySeries.set(series, JSON.stringify(rounds!.map((round) => round.taskIds.map((id) => `${byId.get(id)?.mode}:${byId.get(id)?.difficulty}:${id}`))));
        roomTaskIds.forEach((id) => {
          allV11TaskIdsSeen.add(id);
          const bucket = byId.get(id)!.exposureBucket;
          const seen = taskIdsSeenByBucket.get(bucket) ?? new Set<string>();
          seen.add(id);
          taskIdsSeenByBucket.set(bucket, seen);
        });
      }
    }
    const unseen = tasks.filter(({ taskId }) => !allV11TaskIdsSeen.has(taskId));
    if (unseen.length > 0) {
      throw new Error(`unseen_v11_tasks:${JSON.stringify(unseen.map(({ taskId, mode, difficulty, exposureBucket }) => ({
        taskId, mode, difficulty, exposureBucket,
      })))}`);
    }
    expect(allV11TaskIdsSeen.size).toBe(4_000);
    for (const mode of TOURNAMENT_MODES) {
      const modeIds = tasks.filter((task) => task.mode === mode).map(({ taskId }) => taskId);
      expect(modeIds.every((id) => allV11TaskIdsSeen.has(id))).toBe(true);
    }
    for (const [bucket, bucketTasks] of byBucket) {
      expect(taskIdsSeenByBucket.get(bucket)?.size).toBe(bucketTasks.length);
    }
  });
});
