import { hashCanonicalBody } from '../policies/decision_registry';
import {
  LEARNING_V2_OPENAI_TTS_VOICES,
  type LearningV2OpenAiTtsVoice,
} from './generator_session_contract';
export const LEARNING_V2_AUDIO_CACHE_MAX_BYTES = 256 * 1024 * 1024;
export const LEARNING_V2_AUDIO_CACHE_TARGET_BYTES = 224 * 1024 * 1024;

export type LearningV2AudioVariantManifestEntry = Readonly<{
  voice: LearningV2OpenAiTtsVoice;
  variantOrdinal: 1 | 2 | 3 | 4;
  dependencyFingerprint: string;
  assetSha256: string;
  assetBytes: number;
  downloadUrl: string;
}>;

export type LearningV2AudioEpisodeManifest = Readonly<{
  schemaVersion: 'learning-v2-audio-episode-manifest.v1';
  studyTarget: string;
  episodeOrdinal: number;
  contentVersion: string;
  items: readonly Readonly<{
    contentItemId: string;
    variants: readonly [
      LearningV2AudioVariantManifestEntry,
      LearningV2AudioVariantManifestEntry,
      LearningV2AudioVariantManifestEntry,
      LearningV2AudioVariantManifestEntry,
    ];
  }>[];
  manifestFingerprint: string;
}>;

export type LearningV2AudioPrefetchWindow = Readonly<{
  /** This episode must be complete before its first actionable session frame. */
  requiredBeforeSession: readonly number[];
  /** Download only outside an active lesson; never from an audio-button press. */
  backgroundPrefetch: readonly number[];
  /** Recent replay + current + next stay protected from LRU eviction. */
  retainProtected: readonly number[];
}>;

const HEX_64 = /^[a-f0-9]{64}$/;
const clean = (value: string, field: string, max: number): string => {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error(`learning_v2_audio_${field}_invalid`);
  return normalized;
};

export function planLearningV2AudioPrefetchWindow(input: Readonly<{
  lastCompletedEpisodeOrdinal: number;
  totalEpisodes?: number;
}>): LearningV2AudioPrefetchWindow {
  const totalEpisodes = input.totalEpisodes ?? 32;
  if (!Number.isSafeInteger(totalEpisodes) || totalEpisodes < 1 || totalEpisodes > 10_000 ||
    !Number.isSafeInteger(input.lastCompletedEpisodeOrdinal) || input.lastCompletedEpisodeOrdinal < 0 ||
    input.lastCompletedEpisodeOrdinal > totalEpisodes) {
    throw new Error('learning_v2_audio_prefetch_progress_invalid');
  }
  const current = Math.min(input.lastCompletedEpisodeOrdinal + 1, totalEpisodes);
  const next = current < totalEpisodes ? current + 1 : null;
  const previous = current > 1 ? current - 1 : null;
  return Object.freeze({
    requiredBeforeSession: Object.freeze([current]),
    backgroundPrefetch: Object.freeze(next === null ? [] : [next]),
    retainProtected: Object.freeze([previous, current, next].filter((value): value is number => value !== null)),
  });
}

function manifestBody(manifest: Omit<LearningV2AudioEpisodeManifest, 'manifestFingerprint'>) {
  return {
    schemaVersion: manifest.schemaVersion,
    studyTarget: manifest.studyTarget,
    episodeOrdinal: manifest.episodeOrdinal,
    contentVersion: manifest.contentVersion,
    items: manifest.items,
  };
}

export function materializeLearningV2AudioEpisodeManifest(
  input: Omit<LearningV2AudioEpisodeManifest, 'manifestFingerprint'>,
): LearningV2AudioEpisodeManifest {
  if (input.schemaVersion !== 'learning-v2-audio-episode-manifest.v1' ||
    !Number.isSafeInteger(input.episodeOrdinal) || input.episodeOrdinal < 1 || input.episodeOrdinal > 10_000 ||
    input.items.length < 1 || input.items.length > 10_000) {
    throw new Error('learning_v2_audio_manifest_invalid');
  }
  clean(input.studyTarget, 'study_target', 24);
  clean(input.contentVersion, 'content_version', 128);
  const contentIds = new Set<string>();
  for (const item of input.items) {
    const contentItemId = clean(item.contentItemId, 'content_item_id', 128);
    if (contentIds.has(contentItemId)) throw new Error('learning_v2_audio_manifest_duplicate_item');
    contentIds.add(contentItemId);
    if (item.variants.length !== 4) throw new Error('learning_v2_audio_manifest_voice_set_invalid');
    item.variants.forEach((variant, index) => {
      if (variant.voice !== LEARNING_V2_OPENAI_TTS_VOICES[index] || variant.variantOrdinal !== index + 1 ||
        !HEX_64.test(variant.dependencyFingerprint) || !HEX_64.test(variant.assetSha256) ||
        !Number.isSafeInteger(variant.assetBytes) || variant.assetBytes < 200 || variant.assetBytes > 4 * 1024 * 1024) {
        throw new Error('learning_v2_audio_manifest_variant_invalid');
      }
      const url = clean(variant.downloadUrl, 'download_url', 2_048);
      if (!url.startsWith('https://')) throw new Error('learning_v2_audio_manifest_url_invalid');
    });
  }
  return Object.freeze({
    ...input,
    manifestFingerprint: hashCanonicalBody(manifestBody(input)),
  });
}

export function learningV2AudioEpisodeManifestIsCurrent(
  expected: LearningV2AudioEpisodeManifest,
  installedManifestFingerprint: string | null,
): boolean {
  if (!HEX_64.test(expected.manifestFingerprint) || installedManifestFingerprint !== expected.manifestFingerprint) return false;
  return hashCanonicalBody(manifestBody(expected)) === expected.manifestFingerprint;
}
