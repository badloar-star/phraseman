import { readFileSync } from 'fs';
import path from 'path';

import {
  buildBlockedPlanPronunciationScoringRequirement,
  type PlanPronunciationScoringRequirement,
} from '../app/personal_plan_pronunciation_readiness';
import { buildGavanWeek1CanonicalPlan } from '../app/personal_plan_gavan_week1_canonical_plan';
import {
  buildGavanWeek1PronunciationReferenceAdapter,
} from '../app/personal_plan_gavan_week1_pronunciation_reference_adapter';
import {
  GAVAN_WEEK1_PRONUNCIATION_SCORING_READINESS_PACKET_PATH,
  buildGavanWeek1PronunciationScoringReadinessPacket,
  isGavanWeek1PronunciationScoringReadinessPacketTargetAllowed,
  writeGavanWeek1PronunciationScoringReadinessPacket,
} from '../tools/personal_plan_gavan_week1_pronunciation_scoring_readiness_packet';

function adapter() {
  return buildGavanWeek1PronunciationReferenceAdapter({
    plan: buildGavanWeek1CanonicalPlan(),
  });
}

function readJson<T>(targetPath: string): T {
  return JSON.parse(readFileSync(targetPath, 'utf8')) as T;
}

describe('Gavan week 1 pronunciation reference adapter', () => {
  beforeAll(() => {
    writeGavanWeek1PronunciationScoringReadinessPacket(adapter(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      targetPath: GAVAN_WEEK1_PRONUNCIATION_SCORING_READINESS_PACKET_PATH,
    });
  });

  it('maps canonical pronunciation-shadow blocks to exact pronunciation references without fake scoring', () => {
    const result = adapter();

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.status).toBe('pronunciation_references_ready_scoring_blocked');
    expect(result.summary).toEqual({
      pronunciationBlockCount: 1,
      referenceCount: 4,
      authoringReadyReferenceCount: 4,
      productionReadyReferenceCount: 0,
      blockedReferenceCount: 4,
      fakeFinalClaimCount: 0,
    });
    expect(result.references.map((item) => item.dayId)).toEqual([
      'gavan-week1-day6',
      'gavan-week1-day6',
      'gavan-week1-day6',
      'gavan-week1-day6',
    ]);
    expect(result.references.map((item) => item.targetText)).toEqual([
      'That works for me.',
      'I can do that.',
      "I can't do that today.",
      "I'll check and come back.",
    ]);
    expect(result.references.every((item) => item.runtimeMode === 'plan_pronunciation_repeat')).toBe(true);
    expect(result.references.every((item) => item.scoringRequirement.status === 'blocked_until_scoring')).toBe(true);
    expect(result.references.every((item) => item.readiness.validForAuthoring)).toBe(true);
    expect(result.references.every((item) => !item.readiness.productionReady)).toBe(true);
  });

  it('rejects fake final scoring claims instead of making pronunciation production-ready', () => {
    const base = adapter();
    const first = base.references[0];
    const fakeFinalRequirement: PlanPronunciationScoringRequirement = {
      ...buildBlockedPlanPronunciationScoringRequirement({
        exerciseId: first.exerciseId,
        blockId: first.blockId,
        contentUnitIds: [first.contentUnitId],
        targetText: first.targetText,
      }),
      finalScoringReady: true,
    };

    const result = buildGavanWeek1PronunciationReferenceAdapter({
      plan: buildGavanWeek1CanonicalPlan(),
      scoringRequirementsByReferenceId: {
        [first.id]: fakeFinalRequirement,
      },
    });

    expect(result.valid).toBe(false);
    expect(result.status).toBe('pronunciation_references_invalid');
    expect(result.summary.fakeFinalClaimCount).toBe(1);
    expect(result.issues).toContainEqual({
      code: 'fake_final_pronunciation_claim',
      referenceId: first.id,
      detail: 'Only ready pronunciation scoring can be marked final.',
    });
  });

  it('builds a non-live scoring readiness packet that blocks release until real scorer metadata exists', () => {
    const result = buildGavanWeek1PronunciationScoringReadinessPacket(adapter(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
    });

    expect(result.valid).toBe(true);
    expect(result.packet).toMatchObject({
      kind: 'gavan_week1_pronunciation_scoring_readiness_packet',
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'pronunciation_scoring_blocked_no_real_scorer',
      blockerStillOpen: 'missing_pronunciation_scorer',
      readyForLive: false,
      pronunciationProductionReady: false,
      scoringAdapterReady: false,
      pronunciationReferenceAdapterReady: true,
      approvalMayBeInferred: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
    });
    expect(result.packet?.summary).toEqual({
      pronunciationBlockCount: 1,
      referenceCount: 4,
      authoringReadyReferenceCount: 4,
      productionReadyReferenceCount: 0,
      blockedReferenceCount: 4,
      fakeFinalClaimCount: 0,
    });
    expect(result.packet?.requiredNextActions).toEqual([
      'Choose a real pronunciation scorer provider and stable scorer id.',
      'Define scoring version, result fields, and minimum confidence for Gavan week 1.',
      'Run scored-attempt validation before allowing production scoring or progress penalties.',
    ]);
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-pronunciation-scoring-readiness-packet.test.json',
    );

    const result = writeGavanWeek1PronunciationScoringReadinessPacket(adapter(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(isGavanWeek1PronunciationScoringReadinessPacketTargetAllowed(targetPath)).toBe(true);

    const parsed = readJson<ReturnType<typeof buildGavanWeek1PronunciationScoringReadinessPacket>['packet']>(targetPath);
    expect(parsed?.kind).toBe('gavan_week1_pronunciation_scoring_readiness_packet');
    expect(parsed?.writePolicy).toEqual({
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      scoringFilesWritten: false,
    });
  });

  it('rejects live source audio scoring and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_pronunciation_scoring.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-pronunciation.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1PronunciationScoringReadinessPacket(adapter(), {
        generatedAt: '2026-06-04T00:00:00.000Z',
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Pronunciation scoring readiness packet can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import or mutate UI storage navigation audio workers or live scorers', () => {
    const adapterSource = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_week1_pronunciation_reference_adapter.ts'),
      'utf8',
    );
    const packetSource = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_pronunciation_scoring_readiness_packet.ts'),
      'utf8',
    );

    for (const source of [adapterSource, packetSource]) {
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
    }
  });
});
