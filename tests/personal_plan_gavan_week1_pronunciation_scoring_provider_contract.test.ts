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
  GAVAN_WEEK1_PRONUNCIATION_SCORING_PROVIDER_CONTRACT_PATH,
  buildGavanWeek1PronunciationScoringProviderContract,
  isGavanWeek1PronunciationScoringProviderContractTargetAllowed,
  writeGavanWeek1PronunciationScoringProviderContract,
  type GavanWeek1PronunciationScoringProviderMetadata,
} from '../tools/personal_plan_gavan_week1_pronunciation_scoring_provider_contract';

function readinessPacket() {
  const adapter = buildGavanWeek1PronunciationReferenceAdapter({
    plan: buildGavanWeek1CanonicalPlan(),
  });
  const result = buildGavanWeek1PronunciationScoringReadinessPacket(adapter, {
    generatedAt: '2026-06-04T00:00:00.000Z',
  });

  if (!result.packet) throw new Error('expected pronunciation scoring readiness packet');
  return result.packet;
}

const completeProvider: GavanWeek1PronunciationScoringProviderMetadata = {
  providerId: 'openai',
  scorerId: 'pronunciation-scorer:gavan-week1:v1',
  scoringVersion: 'gavan-week1-pronunciation-v1',
  resultFields: ['score', 'pronunciationScore', 'fluencyScore', 'intonationScore'],
  minimumConfidence: 0.75,
  approvedForScoredAttemptValidation: true,
  productionReady: false,
  finalScoringReady: false,
  liveEditsAllowed: false,
};

describe('Gavan week 1 pronunciation scoring provider contract', () => {
  it('maps every pronunciation reference to a missing-provider blocker without fake readiness', () => {
    const result = buildGavanWeek1PronunciationScoringProviderContract(readinessPacket(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
    });

    expect(result.valid).toBe(true);
    expect(result.contract).toMatchObject({
      kind: 'gavan_week1_pronunciation_scoring_provider_contract',
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'pronunciation_scorer_contract_blocked_missing_provider',
      readyForLive: false,
      pronunciationProductionReady: false,
      scoringContractReady: false,
      scoringAdapterReady: false,
      approvalMayBeInferred: false,
      liveEditsAllowed: false,
    });
    expect(result.contract?.summary).toEqual({
      referenceCount: 4,
      missingProviderReferenceCount: 4,
      contractReadyReferenceCount: 0,
      approvedScoredAttemptValidationReferenceCount: 0,
      productionReadyReferenceCount: 0,
      fakeFinalClaimCount: 0,
    });
    expect(result.contract?.references).toHaveLength(4);
    expect(result.contract?.references.every(
      (item: { scoringContractStatus: string }) =>
        item.scoringContractStatus === 'missing_scorer_contract',
    )).toBe(true);
    expect(result.contract?.requiredNextActions).toEqual([
      'Attach real pronunciation scorer provider metadata before scored-attempt validation.',
      'Run scored-attempt validation with recorded attempts and confidence/score evidence.',
      'Create explicit approval records before any live scoring adapter or progress penalty is enabled.',
    ]);
  });

  it('accepts complete provider metadata for scored-attempt validation while keeping live release blocked', () => {
    const result = buildGavanWeek1PronunciationScoringProviderContract(readinessPacket(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      provider: completeProvider,
    });

    expect(result.valid).toBe(true);
    expect(result.contract).toMatchObject({
      status: 'pronunciation_scorer_contract_ready_for_scored_attempt_validation',
      readyForLive: false,
      pronunciationProductionReady: false,
      scoringContractReady: true,
      scoringAdapterReady: false,
      approvalMayBeInferred: false,
      liveEditsAllowed: false,
    });
    expect(result.contract?.provider).toEqual(completeProvider);
    expect(result.contract?.summary).toEqual({
      referenceCount: 4,
      missingProviderReferenceCount: 0,
      contractReadyReferenceCount: 4,
      approvedScoredAttemptValidationReferenceCount: 4,
      productionReadyReferenceCount: 0,
      fakeFinalClaimCount: 0,
    });
    expect(result.contract?.references.every(
      (item: { scoringContractStatus: string }) =>
        item.scoringContractStatus === 'ready_for_scored_attempt_validation',
    )).toBe(true);
  });

  it('rejects fake final or production claims from provider metadata', () => {
    const result = buildGavanWeek1PronunciationScoringProviderContract(readinessPacket(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      provider: {
        ...completeProvider,
        productionReady: true,
        finalScoringReady: true,
        liveEditsAllowed: true,
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      {
        code: 'fake_production_pronunciation_scorer_claim',
        detail: 'Provider metadata cannot mark pronunciation scoring production-ready before scored-attempt evidence and explicit approval.',
      },
      {
        code: 'fake_final_pronunciation_scorer_claim',
        detail: 'Provider metadata cannot mark finalScoringReady before scored-attempt evidence and explicit approval.',
      },
      {
        code: 'live_edits_not_allowed',
        detail: 'Pronunciation scoring provider contract is non-live and cannot allow live edits.',
      },
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-pronunciation-scoring-provider-contract.test.json',
    );

    const result = writeGavanWeek1PronunciationScoringProviderContract(readinessPacket(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      targetPath,
      provider: completeProvider,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(isGavanWeek1PronunciationScoringProviderContractTargetAllowed(targetPath)).toBe(true);

    const parsed = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_pronunciation_scoring_provider_contract');
    expect(parsed.writePolicy).toEqual({
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      scoringFilesWritten: false,
    });
  });

  it('rejects live source scoring and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_pronunciation_scoring.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-pronunciation.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1PronunciationScoringProviderContract(readinessPacket(), {
        generatedAt: '2026-06-04T00:00:00.000Z',
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Pronunciation scoring provider contract can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import or mutate UI storage navigation audio workers or live scorers', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_pronunciation_scoring_provider_contract.ts'),
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
      'personal_plan_audio_openai_worker',
      'personal_plan_exercise.tsx',
    ]) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).not.toContain("from 'openai'");
    expect(source).not.toContain('from "openai"');
  });
});
