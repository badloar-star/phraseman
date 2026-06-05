import { readFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1CanonicalPlan } from '../app/personal_plan_gavan_week1_canonical_plan';
import {
  buildGavanWeek1PronunciationReferenceAdapter,
} from '../app/personal_plan_gavan_week1_pronunciation_reference_adapter';
import {
  buildGavanWeek1PronunciationScoringReadinessPacket,
} from '../tools/personal_plan_gavan_week1_pronunciation_scoring_readiness_packet';
import {
  buildGavanWeek1PronunciationScoringProviderContract,
} from '../tools/personal_plan_gavan_week1_pronunciation_scoring_provider_contract';
import {
  GAVAN_WEEK1_PRONUNCIATION_PRODUCTION_READINESS_GATE_PATH,
  buildGavanWeek1PronunciationProductionReadinessGate,
  writeGavanWeek1PronunciationProductionReadinessGate,
} from '../tools/personal_plan_gavan_week1_pronunciation_production_readiness_gate';

const OPTIONS = {
  generatedAt: '2026-06-04T16:40:00.000Z',
  evidenceOwnerId: 'pronunciation-evidence-owner',
  readinessOwnerId: 'pronunciation-production-readiness-owner',
};

function providerContract() {
  const adapter = buildGavanWeek1PronunciationReferenceAdapter({
    plan: buildGavanWeek1CanonicalPlan(),
  });
  const packetResult = buildGavanWeek1PronunciationScoringReadinessPacket(adapter, {
    generatedAt: OPTIONS.generatedAt,
  });
  if (!packetResult.packet) throw new Error('expected pronunciation scoring readiness packet');

  const contractResult = buildGavanWeek1PronunciationScoringProviderContract(packetResult.packet, {
    generatedAt: OPTIONS.generatedAt,
  });
  if (!contractResult.contract) throw new Error('expected pronunciation provider contract');

  return contractResult.contract;
}

describe('Gavan week 1 pronunciation production readiness gate', () => {
  it('holds release while scorer provider, real attempts, explicit approval, final scorer, and live adapter are missing', () => {
    const result = buildGavanWeek1PronunciationProductionReadinessGate(providerContract(), {}, OPTIONS);

    expect(result.valid).toBe(true);
    expect(result.gate).toMatchObject({
      kind: 'gavan_week1_pronunciation_production_readiness_gate',
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceEvidenceIntakeStatus: 'blocked_missing_scorer_contract',
      status: 'hold_missing_scorer_provider',
      releaseDecision: 'hold',
      productionReady: false,
      readyForLive: false,
      pronunciationProductionReady: false,
      scoredAttemptEvidenceReady: false,
      explicitApprovalReady: false,
      finalScorerReady: false,
      liveScoringAdapterAllowed: false,
      progressPenaltyAllowed: false,
      approvalRecordsCreated: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      recordingFilesWritten: false,
      scoringFilesWritten: false,
      audioReadinessMayBeInferred: false,
    });
    expect(result.gate.summary).toEqual({
      referenceCount: 4,
      scorerContractReadyCount: 0,
      validScoredAttemptCount: 0,
      missingScoredAttemptCount: 0,
      invalidScoredAttemptCount: 0,
      missingScorerContractCount: 4,
      explicitApprovalRecordCount: 0,
      finalScorerReadyCount: 0,
      liveAdapterReadyCount: 0,
      productionReadyReferenceCount: 0,
      blockerCount: 6,
    });
    expect(result.gate.blockers.map((blocker) => blocker.code)).toEqual([
      'missing_scorer_provider_contract',
      'missing_real_scored_attempt_evidence',
      'missing_explicit_pronunciation_approval_records',
      'missing_final_pronunciation_scorer_promotion',
      'live_pronunciation_adapter_blocked',
      'progress_penalty_blocked',
    ]);
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-pronunciation-production-readiness-gate.test.json',
    );
    const result = writeGavanWeek1PronunciationProductionReadinessGate(providerContract(), {}, {
      ...OPTIONS,
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(0);

    const parsed = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_pronunciation_production_readiness_gate');
    expect(parsed.status).toBe('hold_missing_scorer_provider');
    expect(parsed.releaseDecision).toBe('hold');
    expect(parsed.summary.blockerCount).toBe(6);
  });

  it('rejects runtime, storage, audio, and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_pronunciation_attempt.ts'),
      path.join(process.cwd(), 'app', 'personal_plan_pronunciation_readiness.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-pronunciation.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1PronunciationProductionReadinessGate(providerContract(), {}, {
        ...OPTIONS,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Pronunciation production readiness gate can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import or mutate runtime UI storage navigation audio workers live scorers or approval writers', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_pronunciation_production_readiness_gate.ts'),
      'utf8',
    );

    for (const forbidden of [
      'react-native',
      'AsyncStorage',
      'navigation',
      'expo-av',
      'expo-audio',
      'child_process',
      'ffprobe',
      'from \'openai\'',
      'from "openai"',
      'personal_plan_audio_openai_worker',
      'personal_plan_pronunciation_readiness',
      'personal_plan_exercise.tsx',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('exposes the canonical report path', () => {
    expect(GAVAN_WEEK1_PRONUNCIATION_PRODUCTION_READINESS_GATE_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-pronunciation-production-readiness-gate.json',
    ));
  });
});
