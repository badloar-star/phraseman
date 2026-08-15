import {
  learningV2AudioEpisodeManifestIsCurrent,
  materializeLearningV2AudioEpisodeManifest,
  planLearningV2AudioPrefetchWindow,
} from '../modules/learning-v2/content/audio_delivery_contract';
import { LEARNING_V2_OPENAI_TTS_VOICES } from '../modules/learning-v2/content/generator_session_contract';

describe('Learning V2 audio delivery contract', () => {
  test('keeps the current episode required and prefetches exactly one episode ahead', () => {
    expect(planLearningV2AudioPrefetchWindow({ lastCompletedEpisodeOrdinal: 0 })).toEqual({
      requiredBeforeSession: [1],
      backgroundPrefetch: [2],
      retainProtected: [1, 2],
    });
    expect(planLearningV2AudioPrefetchWindow({ lastCompletedEpisodeOrdinal: 1 })).toEqual({
      requiredBeforeSession: [2],
      backgroundPrefetch: [3],
      retainProtected: [1, 2, 3],
    });
    expect(planLearningV2AudioPrefetchWindow({ lastCompletedEpisodeOrdinal: 31 })).toEqual({
      requiredBeforeSession: [32],
      backgroundPrefetch: [],
      retainProtected: [31, 32],
    });
  });

  test('publishes an episode only with the exact four ordered voice files', () => {
    const variants = LEARNING_V2_OPENAI_TTS_VOICES.map((voice, index) => ({
      voice,
      variantOrdinal: (index + 1) as 1 | 2 | 3 | 4,
      dependencyFingerprint: String(index + 1).repeat(64),
      assetSha256: String(index + 5).repeat(64),
      assetBytes: 8_000,
      downloadUrl: `https://cdn.example/audio/phrase-${voice}.mp3`,
    }));
    const manifest = materializeLearningV2AudioEpisodeManifest({
      schemaVersion: 'learning-v2-audio-episode-manifest.v1',
      studyTarget: 'en',
      episodeOrdinal: 1,
      contentVersion: 'e1-v1',
      items: [{ contentItemId: 'e1-hello', variants: variants as never }],
    });
    expect(learningV2AudioEpisodeManifestIsCurrent(manifest, manifest.manifestFingerprint)).toBe(true);
    expect(() => materializeLearningV2AudioEpisodeManifest({
      ...manifest,
      items: [{ contentItemId: 'e1-hello', variants: variants.slice(0, 3) }],
    } as never)).toThrow('learning_v2_audio_manifest_voice_set_invalid');
  });
});
