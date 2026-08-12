import {
  LEARNING_V2_AUDIO_VOICES,
  LEARNING_V2_GENERATION_WAVES,
  learningV2CourseGenerationManifestV2Fingerprint,
  learningV2EpisodeLocaleSessionAggregateFingerprint,
  learningV2GenerationWaveFingerprint,
  validateLearningV2EpisodeLocaleIndexV1,
  validateLearningV2CourseGenerationManifestV2,
  type LearningV2CourseGenerationManifestV2,
  type LearningV2EpisodeLocaleIndexV1,
} from '../modules/learning-v2/content/generator_course_manifest';
import {
  LEARNING_V2_APPROVAL_STAGES,
  LEARNING_V2_INTERFACE_LOCALES,
  LEARNING_V2_REQUIRED_CONTENT_KINDS,
} from '../modules/learning-v2/content/generator_course_contract';

const hash = (character: string) => character.repeat(64);

function validManifest(): LearningV2CourseGenerationManifestV2 {
  const episodeReceipts = Array.from({ length: 32 }, (_, index) => ({
    episodeOrdinal: index + 1,
    requiredSessionCount: 12 as const,
    cardCount: 144,
    contentAggregateFingerprint: hash(((index % 6) + 1).toString(16)),
    qaFingerprint: hash((((index + 2) % 6) + 1).toString(16)),
  }));
  const episodeLocaleShards = episodeReceipts.flatMap((receipt) => LEARNING_V2_INTERFACE_LOCALES.map((locale, localeIndex) => ({
    shardId: `episode-${String(receipt.episodeOrdinal).padStart(2, '0')}:${locale}`,
    episodeOrdinal: receipt.episodeOrdinal,
    locale,
    requiredSessionCount: 12 as const,
    contentKinds: LEARNING_V2_REQUIRED_CONTENT_KINDS,
    generationInputFingerprint: hash((((receipt.episodeOrdinal + localeIndex) % 6) + 1).toString(16)),
    sessionAggregateFingerprint: hash((((receipt.episodeOrdinal + localeIndex + 2) % 6) + 1).toString(16)),
    object: {
      objectPath: `learning-v2/course-packages/english-course-v2/episodes/${String(receipt.episodeOrdinal).padStart(2, '0')}/${locale}/content.json`,
      contentHash: hash((((receipt.episodeOrdinal + localeIndex + 1) % 6) + 1).toString(16)),
      objectGeneration: `generation-${receipt.episodeOrdinal}-${localeIndex + 1}`,
      byteSize: 48_000,
    },
  })));
  const audioShards = episodeReceipts.map((receipt, index) => ({
    episodeOrdinal: receipt.episodeOrdinal,
    provider: 'openai' as const,
    endpoint: '/v1/audio/speech' as const,
    voices: LEARNING_V2_AUDIO_VOICES,
    variantsPerItem: 4 as const,
    sourceContentAggregateFingerprint: receipt.contentAggregateFingerprint,
    voiceSettingsFingerprint: hash((((index + 3) % 6) + 1).toString(16)),
    object: {
      objectPath: `learning-v2/course-packages/english-course-v2/episodes/${String(receipt.episodeOrdinal).padStart(2, '0')}/audio/manifest.json`,
      contentHash: hash((((index + 4) % 6) + 1).toString(16)),
      objectGeneration: `audio-generation-${receipt.episodeOrdinal}`,
      byteSize: 20_000,
    },
  }));
  return {
    schemaVersion: 'learning-v2-course-generation-manifest.v2',
    packageId: 'english-course-v2',
    targetLanguage: 'en',
    entryBand: 'PRE_A1',
    exitBand: 'C2',
    episodeCount: 32,
    requiredSessionsPerEpisode: 12,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    generationWaves: LEARNING_V2_GENERATION_WAVES,
    episodeLocaleShards,
    episodeReceipts,
    audioShards,
    waveApprovals: LEARNING_V2_GENERATION_WAVES.map((wave) => ({
      waveId: wave.waveId,
      state: 'approved' as const,
      waveFingerprint: learningV2GenerationWaveFingerprint({ waveId: wave.waveId, episodeLocaleShards, audioShards }),
      reviewerId: 'owner' as const,
      reviewedAtIso: '2026-08-11T10:00:00.000Z',
    })),
    stageApprovals: LEARNING_V2_APPROVAL_STAGES.map((stage, index) => ({
      stage,
      state: 'approved' as const,
      artifactId: `artifact-${index + 1}`,
      artifactFingerprint: hash(((index % 6) + 1).toString(16)),
      reviewerId: 'owner' as const,
      reviewedAtIso: '2026-08-11T10:00:00.000Z',
    })),
  };
}

describe('Learning V2 bounded full-course generation manifest', () => {
  test('indexes exactly twelve immutable session-locale bodies without putting them into the root manifest', () => {
    const episodeOrdinal = 1;
    const locale = 'ru' as const;
    const sessionShards = Array.from({ length: 12 }, (_, index) => ({
      shardId: `episode-01:session-${String(index + 1).padStart(2, '0')}`,
      episodeOrdinal,
      requiredSessionOrdinal: index + 1,
      generationInputFingerprint: hash((((index + 1) % 6) + 1).toString(16)),
      object: {
        objectPath: `learning-v2/course-packages/english-course-v2/episodes/01/sessions/${String(index + 1).padStart(2, '0')}.json`,
        contentHash: hash((((index + 2) % 6) + 1).toString(16)),
        objectGeneration: `session-${index + 1}`,
        byteSize: 24_000,
      },
    }));
    const body = {
      schemaVersion: 'learning-v2-episode-locale-index.v1' as const,
      packageId: 'english-course-v2',
      targetLanguage: 'en',
      episodeOrdinal,
      locale,
      requiredSessionCount: 12 as const,
      contentKinds: LEARNING_V2_REQUIRED_CONTENT_KINDS,
      sessionShards,
    };
    const index: LearningV2EpisodeLocaleIndexV1 = {
      ...body,
      sessionAggregateFingerprint: learningV2EpisodeLocaleSessionAggregateFingerprint(body),
    };
    expect(validateLearningV2EpisodeLocaleIndexV1(index)).toBe(index);
    expect(() => validateLearningV2EpisodeLocaleIndexV1({ ...index, sessionShards: index.sessionShards.slice(0, 11) }))
      .toThrow('learning_v2_episode_locale_index_identity_invalid');
    expect(() => validateLearningV2EpisodeLocaleIndexV1({ ...index, sessionAggregateFingerprint: hash('f') }))
      .toThrow('learning_v2_episode_locale_index_aggregate_invalid');
  });

  test('pins 32 episodes, 12 sessions each, every locale, four voices and E1 → chapter → season approvals', () => {
    const manifest = validManifest();
    expect(validateLearningV2CourseGenerationManifestV2(manifest)).toBe(manifest);
    expect(() => validateLearningV2CourseGenerationManifestV2(JSON.parse(JSON.stringify(manifest)) as LearningV2CourseGenerationManifestV2)).not.toThrow();
    expect(manifest.episodeLocaleShards).toHaveLength(32 * 8);
    expect(manifest.audioShards).toHaveLength(32);
    expect(manifest.waveApprovals.map((item) => item.waveId)).toEqual(['e1', 'chapter_1', 'season']);
    expect(learningV2CourseGenerationManifestV2Fingerprint(manifest)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('fails closed when one episode-locale shard is missing or points outside its deterministic namespace', () => {
    const manifest = validManifest();
    expect(() => validateLearningV2CourseGenerationManifestV2({ ...manifest, episodeLocaleShards: manifest.episodeLocaleShards.slice(0, -1) }))
      .toThrow('learning_v2_course_manifest_locale_shards_incomplete');
    const episodeLocaleShards = manifest.episodeLocaleShards.map((item, index) => index === 9
      ? { ...item, object: { ...item.object, objectPath: 'foreign/account/content.json' } }
      : item);
    expect(() => validateLearningV2CourseGenerationManifestV2({ ...manifest, episodeLocaleShards }))
      .toThrow('learning_v2_course_manifest_object_ref_invalid');
  });

  test('rejects a short session set, the historical 7–9-card shape and stale audio after localized content changes', () => {
    const manifest = validManifest();
    const episodeReceipts = manifest.episodeReceipts.map((item, index) => index === 3 ? { ...item, requiredSessionCount: 11 as never } : item);
    expect(() => validateLearningV2CourseGenerationManifestV2({ ...manifest, episodeReceipts }))
      .toThrow('learning_v2_course_manifest_episode_receipt_invalid');
    const historicalCardCount = manifest.episodeReceipts.map((item, index) => index === 3 ? { ...item, cardCount: 96 } : item);
    expect(() => validateLearningV2CourseGenerationManifestV2({ ...manifest, episodeReceipts: historicalCardCount }))
      .toThrow('learning_v2_course_manifest_episode_receipt_invalid');
    const audioShards = manifest.audioShards.map((item, index) => index === 3 ? { ...item, sourceContentAggregateFingerprint: hash('f') } : item);
    expect(() => validateLearningV2CourseGenerationManifestV2({ ...manifest, audioShards }))
      .toThrow('learning_v2_course_manifest_audio_shard_invalid');
  });

  test('requires exact owner receipts for all three bounded generation waves and all seven review stages', () => {
    const manifest = validManifest();
    expect(() => validateLearningV2CourseGenerationManifestV2({ ...manifest, waveApprovals: manifest.waveApprovals.slice(0, 2) }))
      .toThrow('learning_v2_course_manifest_wave_approvals_incomplete');
    expect(() => validateLearningV2CourseGenerationManifestV2({ ...manifest, stageApprovals: manifest.stageApprovals.slice(0, 6) }))
      .toThrow('learning_v2_course_manifest_stage_approvals_incomplete');
  });
});
