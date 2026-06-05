import { readFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1CanonicalPlan } from '../app/personal_plan_gavan_week1_canonical_plan';
import {
  buildGavanWeek1PronunciationReferenceAdapter,
} from '../app/personal_plan_gavan_week1_pronunciation_reference_adapter';
import { buildScoredPronunciationAttempt } from '../app/personal_plan_pronunciation_attempt';
import {
  buildGavanWeek1PronunciationScoringProviderContract,
  type GavanWeek1PronunciationScoringProviderMetadata,
} from '../tools/personal_plan_gavan_week1_pronunciation_scoring_provider_contract';
import {
  buildGavanWeek1PronunciationScoringReadinessPacket,
} from '../tools/personal_plan_gavan_week1_pronunciation_scoring_readiness_packet';
import {
  GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH,
  buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
  isGavanWeek1PronunciationScoredAttemptEvidenceIntakeReportTargetAllowed,
  writeGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
} from '../tools/personal_plan_gavan_week1_pronunciation_scored_attempt_evidence_intake_report';

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

function readinessPacket() {
  const adapter = buildGavanWeek1PronunciationReferenceAdapter({
    plan: buildGavanWeek1CanonicalPlan(),
  });
  const result = buildGavanWeek1PronunciationScoringReadinessPacket(adapter, {
    generatedAt: '2026-06-04T00:00:00.000Z',
  });
  if (!result.packet) throw new Error('expected readiness packet');
  return result.packet;
}

function providerContract(provider?: GavanWeek1PronunciationScoringProviderMetadata) {
  const result = buildGavanWeek1PronunciationScoringProviderContract(readinessPacket(), {
    generatedAt: '2026-06-04T00:00:00.000Z',
    ...(provider ? { provider } : {}),
  });
  if (!result.contract) throw new Error('expected provider contract');
  return result.contract;
}

function validAttemptsByReferenceId() {
  const contract = providerContract(completeProvider);
  return Object.fromEntries(
    contract.references.map((reference, index) => [
      reference.id,
      buildScoredPronunciationAttempt({
        id: `attempt-${index + 1}`,
        planInstanceId: 'gavan-week1-test-instance',
        planId: 'gavan',
        dayIndex: reference.dayIndex,
        blockId: reference.blockId,
        contentUnitId: reference.contentUnitId,
        targetText: reference.targetText,
        recordingId: `recording-${index + 1}`,
        recordingUri: `file://recording-${index + 1}.m4a`,
        recordingDurationMs: 1400 + index,
        transcript: reference.targetText,
        recognitionProvider: 'openai',
        recognitionConfidence: 0.87,
        scoringProvider: 'openai',
        scoringVersion: completeProvider.scoringVersion,
        score: 86 + index,
        pronunciationScore: 84 + index,
        fluencyScore: 83 + index,
        intonationScore: 82 + index,
        progressPenaltyAllowed: false,
        occurredAt: '2026-06-04T00:00:00.000Z',
      }),
    ]),
  );
}

describe('Gavan week 1 pronunciation scored-attempt evidence intake report', () => {
  beforeAll(() => {
    writeGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(providerContract(), {}, {
      generatedAt: '2026-06-04T00:00:00.000Z',
      evidenceOwnerId: 'pronunciation-evidence-owner',
      targetPath: GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH,
    });
  });

  it('blocks every reference while the scorer provider contract is missing', () => {
    const result = buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(providerContract(), {}, {
      generatedAt: '2026-06-04T00:00:00.000Z',
      evidenceOwnerId: 'pronunciation-evidence-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.report).toMatchObject({
      kind: 'gavan_week1_pronunciation_scored_attempt_evidence_intake_report',
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'blocked_missing_scorer_contract',
      readyForLive: false,
      pronunciationProductionReady: false,
      scoredAttemptEvidenceReady: false,
      scoringAdapterReady: false,
      progressPenaltyAllowed: false,
      approvalMayBeInferred: false,
      liveEditsAllowed: false,
    });
    expect(result.report?.summary).toEqual({
      referenceCount: 4,
      providedAttemptCount: 0,
      validScoredAttemptCount: 0,
      invalidScoredAttemptCount: 0,
      missingScoredAttemptCount: 0,
      missingScorerContractCount: 4,
      productionReadyReferenceCount: 0,
    });
    expect(result.report?.rows.every((row: { status: string }) =>
      row.status === 'blocked_missing_scorer_contract',
    )).toBe(true);
  });

  it('blocks scorer-ready references until real scored attempts are provided', () => {
    const result = buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(
      providerContract(completeProvider),
      {},
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        evidenceOwnerId: 'pronunciation-evidence-owner',
      },
    );

    expect(result.valid).toBe(true);
    expect(result.report?.status).toBe('blocked_missing_scored_attempts');
    expect(result.report?.summary).toEqual({
      referenceCount: 4,
      providedAttemptCount: 0,
      validScoredAttemptCount: 0,
      invalidScoredAttemptCount: 0,
      missingScoredAttemptCount: 4,
      missingScorerContractCount: 0,
      productionReadyReferenceCount: 0,
    });
    expect(result.report?.rows.every((row: { status: string }) =>
      row.status === 'blocked_missing_scored_attempt',
    )).toBe(true);
  });

  it('accepts complete scored attempts for review without making pronunciation production-ready', () => {
    const result = buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(
      providerContract(completeProvider),
      validAttemptsByReferenceId(),
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        evidenceOwnerId: 'pronunciation-evidence-owner',
      },
    );

    expect(result.valid).toBe(true);
    expect(result.report).toMatchObject({
      status: 'ready_for_pronunciation_approval_review',
      readyForLive: false,
      pronunciationProductionReady: false,
      scoredAttemptEvidenceReady: true,
      scoringAdapterReady: false,
      progressPenaltyAllowed: false,
      approvalMayBeInferred: false,
      liveEditsAllowed: false,
    });
    expect(result.report?.summary).toEqual({
      referenceCount: 4,
      providedAttemptCount: 4,
      validScoredAttemptCount: 4,
      invalidScoredAttemptCount: 0,
      missingScoredAttemptCount: 0,
      missingScorerContractCount: 0,
      productionReadyReferenceCount: 0,
    });
    expect(result.report?.rows.every((row: { status: string; productionReady: boolean }) =>
      row.status === 'valid_scored_attempt' && row.productionReady === false,
    )).toBe(true);
  });

  it('rejects invalid scored attempts instead of enabling progress penalties', () => {
    const attempts = validAttemptsByReferenceId();
    const firstReferenceId = Object.keys(attempts)[0];
    attempts[firstReferenceId] = {
      ...attempts[firstReferenceId],
      recognitionConfidence: 0.3,
      progressPenaltyAllowed: true,
    };

    const result = buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(
      providerContract(completeProvider),
      attempts,
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        evidenceOwnerId: 'pronunciation-evidence-owner',
      },
    );

    expect(result.valid).toBe(true);
    expect(result.report?.status).toBe('blocked_invalid_scored_attempts');
    expect(result.report?.summary.invalidScoredAttemptCount).toBe(1);
    expect(result.report?.rows[0]).toEqual(expect.objectContaining({
      status: 'blocked_invalid_scored_attempt',
      attemptIssueCodes: expect.arrayContaining(['low_confidence_progress_penalty']),
      productionReady: false,
      progressPenaltyAllowed: false,
    }));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-pronunciation-scored-attempt-evidence-intake-report.test.json',
    );
    const result = writeGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(providerContract(), {}, {
      generatedAt: '2026-06-04T00:00:00.000Z',
      evidenceOwnerId: 'pronunciation-evidence-owner',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(isGavanWeek1PronunciationScoredAttemptEvidenceIntakeReportTargetAllowed(targetPath)).toBe(true);

    const parsed = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_pronunciation_scored_attempt_evidence_intake_report');
    expect(parsed.summary.missingScorerContractCount).toBe(4);
  });

  it('rejects source scoring and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_pronunciation_scoring.ts'),
      path.join(process.cwd(), 'app', 'personal_plan_exercise.tsx'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(providerContract(), {}, {
        generatedAt: '2026-06-04T00:00:00.000Z',
        evidenceOwnerId: 'pronunciation-evidence-owner',
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Pronunciation scored-attempt evidence intake report can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import or mutate runtime UI storage navigation audio workers or live scorers', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_pronunciation_scored_attempt_evidence_intake_report.ts'),
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
      'openai',
      'personal_plan_audio_openai_worker',
      'personal_plan_exercise.tsx',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('exposes the canonical report path', () => {
    expect(GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-pronunciation-scored-attempt-evidence-intake-report.json',
    ));
  });
});
