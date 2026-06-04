import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';
import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import {
  buildPlanAudioRequirementManifest,
} from '../app/personal_plan_audio_requirement_manifest';

function block(type: PlanExerciseBlock['type'], id: string): PlanExerciseBlock {
  return {
    id,
    planId: 'gavan',
    dayIndex: 3,
    type,
    title: `Task ${id}`,
    contentUnitIds: [`${id}:p1`],
    estimatedMinutes: 4,
    requiredFor: [15, 20],
    prerequisiteLessonIds: [1],
    progressPolicy: 'correct_only',
    recoveryPolicy: 'return_wrong_to_recall',
  };
}

function approvedAsset(blockId: string, overrides: Partial<PlanAudioAsset> = {}): PlanAudioAsset {
  return {
    id: `audio:${blockId}`,
    blockId,
    contentUnitIds: [`${blockId}:p1`],
    targetText: 'Could you repeat that?',
    locale: 'en',
    status: 'approved',
    assetId: `asset:${blockId}`,
    uri: `https://cdn.example.test/${blockId}.mp3`,
    durationMs: 1400,
    voiceId: 'openai:alloy',
    provider: 'openai',
    finalAssetReady: true,
    ...overrides,
  };
}

describe('personal plan audio requirement manifest', () => {
  it('tracks listen-choose and listen-build requirements separately from non-listening blocks', () => {
    const manifest = buildPlanAudioRequirementManifest({
      blocks: [
        block('plan_listen_choose', 'listen-choose-1'),
        block('plan_listen_build', 'listen-build-1'),
        block('plan_missing_word', 'missing-word-1'),
      ],
      audioRequirementsByBlockId: {
        'listen-choose-1': approvedAsset('listen-choose-1'),
        'listen-build-1': approvedAsset('listen-build-1', {
          status: 'placeholder',
          assetId: undefined,
          uri: undefined,
          durationMs: undefined,
          voiceId: undefined,
          provider: 'unknown',
          finalAssetReady: false,
        }),
      },
    });

    expect(manifest.items.map((item) => item.blockId)).toEqual([
      'listen-choose-1',
      'listen-build-1',
    ]);
    expect(manifest.summary).toEqual({
      totalListeningBlocks: 2,
      approved: 1,
      placeholder: 1,
      generated: 0,
      missing: 0,
      invalid: 0,
      productionReady: 1,
      productionBlocked: 1,
    });
    expect(manifest.productionReady).toBe(false);
  });

  it('reports missing and invalid audio requirements as production blockers', () => {
    const manifest = buildPlanAudioRequirementManifest({
      blocks: [
        block('plan_listen_choose', 'listen-choose-1'),
        block('plan_listen_build', 'listen-build-1'),
      ],
      audioRequirementsByBlockId: {
        'listen-build-1': approvedAsset('listen-build-1', {
          finalAssetReady: false,
        }),
      },
    });

    expect(manifest.productionReady).toBe(false);
    expect(manifest.items).toEqual([
      expect.objectContaining({
        blockId: 'listen-choose-1',
        assetStatus: 'missing',
        productionReady: false,
        issueCodes: ['missing_audio_asset'],
      }),
      expect.objectContaining({
        blockId: 'listen-build-1',
        assetStatus: 'approved',
        productionReady: false,
        issueCodes: ['approved_audio_not_marked_final'],
      }),
    ]);
    expect(manifest.summary).toEqual(expect.objectContaining({
      missing: 1,
      invalid: 2,
      productionBlocked: 2,
    }));
  });
});
