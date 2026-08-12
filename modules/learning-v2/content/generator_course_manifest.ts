import { hashCanonicalBody, utf8ByteLengthV1 } from '../policies/decision_registry';
import {
  LEARNING_V2_APPROVAL_STAGES,
  LEARNING_V2_INTERFACE_LOCALES,
  LEARNING_V2_REQUIRED_CONTENT_KINDS,
  type LearningV2ApprovalStage,
  type LearningV2InterfaceLocale,
} from './generator_course_contract';

export const LEARNING_V2_GENERATION_WAVES = Object.freeze([
  Object.freeze({ waveId: 'e1', prerequisiteWaveId: null, episodeOrdinals: Object.freeze([1]) }),
  Object.freeze({ waveId: 'chapter_1', prerequisiteWaveId: 'e1', episodeOrdinals: Object.freeze(Array.from({ length: 8 }, (_, index) => index + 1)) }),
  Object.freeze({ waveId: 'season', prerequisiteWaveId: 'chapter_1', episodeOrdinals: Object.freeze(Array.from({ length: 32 }, (_, index) => index + 1)) }),
] as const);

export const LEARNING_V2_AUDIO_VOICES = Object.freeze(['ash', 'onyx', 'nova', 'coral'] as const);
export type LearningV2GenerationWaveId = (typeof LEARNING_V2_GENERATION_WAVES)[number]['waveId'];

export type LearningV2GeneratedObjectRef = Readonly<{
  objectPath: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
}>;

export type LearningV2EpisodeLocaleShardRef = Readonly<{
  shardId: string;
  episodeOrdinal: number;
  locale: LearningV2InterfaceLocale;
  requiredSessionCount: 12;
  contentKinds: typeof LEARNING_V2_REQUIRED_CONTENT_KINDS;
  generationInputFingerprint: string;
  sessionAggregateFingerprint: string;
  object: LearningV2GeneratedObjectRef;
}>;

export type LearningV2SessionShardRef = Readonly<{
  shardId: string;
  episodeOrdinal: number;
  requiredSessionOrdinal: number;
  generationInputFingerprint: string;
  object: LearningV2GeneratedObjectRef;
}>;

/** Bounded episode-locale index. Session bodies remain separate immutable objects. */
export type LearningV2EpisodeLocaleIndexV1 = Readonly<{
  schemaVersion: 'learning-v2-episode-locale-index.v1';
  packageId: string;
  targetLanguage: string;
  episodeOrdinal: number;
  locale: LearningV2InterfaceLocale;
  requiredSessionCount: 12;
  contentKinds: typeof LEARNING_V2_REQUIRED_CONTENT_KINDS;
  sessionShards: readonly LearningV2SessionShardRef[];
  sessionAggregateFingerprint: string;
}>;

export type LearningV2EpisodeCompilationReceipt = Readonly<{
  episodeOrdinal: number;
  requiredSessionCount: 12;
  cardCount: number;
  contentAggregateFingerprint: string;
  qaFingerprint: string;
}>;

export type LearningV2EpisodeAudioShardRef = Readonly<{
  episodeOrdinal: number;
  provider: 'openai';
  endpoint: '/v1/audio/speech';
  voices: typeof LEARNING_V2_AUDIO_VOICES;
  variantsPerItem: 4;
  sourceContentAggregateFingerprint: string;
  voiceSettingsFingerprint: string;
  object: LearningV2GeneratedObjectRef;
}>;

export type LearningV2WaveApprovalReceipt = Readonly<{
  waveId: LearningV2GenerationWaveId;
  state: 'approved';
  waveFingerprint: string;
  reviewerId: 'owner';
  reviewedAtIso: string;
}>;

export type LearningV2StageApprovalRef = Readonly<{
  stage: LearningV2ApprovalStage;
  state: 'approved';
  artifactId: string;
  artifactFingerprint: string;
  reviewerId: 'owner';
  reviewedAtIso: string;
}>;

export type LearningV2CourseGenerationManifestV2 = Readonly<{
  schemaVersion: 'learning-v2-course-generation-manifest.v2';
  packageId: string;
  targetLanguage: string;
  entryBand: 'PRE_A1';
  exitBand: 'C2';
  episodeCount: 32;
  requiredSessionsPerEpisode: 12;
  interfaceLocales: typeof LEARNING_V2_INTERFACE_LOCALES;
  generationWaves: typeof LEARNING_V2_GENERATION_WAVES;
  episodeLocaleShards: readonly LearningV2EpisodeLocaleShardRef[];
  episodeReceipts: readonly LearningV2EpisodeCompilationReceipt[];
  audioShards: readonly LearningV2EpisodeAudioShardRef[];
  waveApprovals: readonly LearningV2WaveApprovalReceipt[];
  stageApprovals: readonly LearningV2StageApprovalRef[];
}>;

const TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const LANGUAGE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const MAX_SHARD_BYTES = 512 * 1024;
const MAX_MANIFEST_BYTES = 512 * 1024;

function exactArray(value: readonly unknown[], expected: readonly unknown[]): boolean {
  return value.length === expected.length && value.every((item, index) => item === expected[index]);
}

function exactGenerationWaves(value: typeof LEARNING_V2_GENERATION_WAVES): boolean {
  return value.length === LEARNING_V2_GENERATION_WAVES.length && value.every((wave, index) => {
    const expected = LEARNING_V2_GENERATION_WAVES[index];
    return wave.waveId === expected.waveId && wave.prerequisiteWaveId === expected.prerequisiteWaveId &&
      exactArray(wave.episodeOrdinals, expected.episodeOrdinals);
  });
}

function expectedEpisodePath(packageId: string, episodeOrdinal: number, locale: string): string {
  return `learning-v2/course-packages/${packageId}/episodes/${String(episodeOrdinal).padStart(2, '0')}/${locale}/content.json`;
}

function expectedSessionPath(packageId: string, episodeOrdinal: number, sessionOrdinal: number): string {
  return `learning-v2/course-packages/${packageId}/episodes/${String(episodeOrdinal).padStart(2, '0')}/sessions/${String(sessionOrdinal).padStart(2, '0')}.json`;
}

function expectedAudioPath(packageId: string, episodeOrdinal: number): string {
  return `learning-v2/course-packages/${packageId}/episodes/${String(episodeOrdinal).padStart(2, '0')}/audio/manifest.json`;
}

function validateObjectRef(value: LearningV2GeneratedObjectRef, expectedPath: string): void {
  if (value.objectPath !== expectedPath || !HASH_RE.test(value.contentHash) || !GENERATION_RE.test(value.objectGeneration) ||
      !Number.isSafeInteger(value.byteSize) || value.byteSize < 1 || value.byteSize > MAX_SHARD_BYTES) {
    throw new Error('learning_v2_course_manifest_object_ref_invalid');
  }
}

export function learningV2GenerationWaveFingerprint(input: Readonly<{
  waveId: LearningV2GenerationWaveId;
  episodeLocaleShards: readonly LearningV2EpisodeLocaleShardRef[];
  audioShards: readonly LearningV2EpisodeAudioShardRef[];
}>): string {
  const definition = LEARNING_V2_GENERATION_WAVES.find((wave) => wave.waveId === input.waveId);
  if (!definition) throw new Error('learning_v2_course_manifest_wave_invalid');
  const episodeSet = new Set<number>(definition.episodeOrdinals);
  const content = input.episodeLocaleShards
    .filter((shard) => episodeSet.has(shard.episodeOrdinal))
    .map((shard) => Object.freeze({ shardId: shard.shardId, sessionAggregateFingerprint: shard.sessionAggregateFingerprint, contentHash: shard.object.contentHash }));
  const audio = input.audioShards
    .filter((shard) => episodeSet.has(shard.episodeOrdinal))
    .map((shard) => Object.freeze({ episodeOrdinal: shard.episodeOrdinal, contentHash: shard.object.contentHash }));
  return hashCanonicalBody(Object.freeze({ waveId: input.waveId, episodeOrdinals: definition.episodeOrdinals, content, audio }));
}

export function learningV2EpisodeLocaleSessionAggregateFingerprint(input: Readonly<{
  packageId: string;
  episodeOrdinal: number;
  locale: LearningV2InterfaceLocale;
  sessionShards: readonly LearningV2SessionShardRef[];
}>): string {
  return hashCanonicalBody(Object.freeze({
    schemaVersion: 'learning-v2-episode-locale-session-aggregate.v1',
    packageId: input.packageId,
    episodeOrdinal: input.episodeOrdinal,
    locale: input.locale,
    sessions: Object.freeze(input.sessionShards.map((shard) => Object.freeze({
      shardId: shard.shardId,
      requiredSessionOrdinal: shard.requiredSessionOrdinal,
      generationInputFingerprint: shard.generationInputFingerprint,
      objectPath: shard.object.objectPath,
      contentHash: shard.object.contentHash,
      objectGeneration: shard.object.objectGeneration,
      byteSize: shard.object.byteSize,
    }))),
  }));
}

export function validateLearningV2EpisodeLocaleIndexV1(input: LearningV2EpisodeLocaleIndexV1): LearningV2EpisodeLocaleIndexV1 {
  if (input.schemaVersion !== 'learning-v2-episode-locale-index.v1' || !TOKEN_RE.test(input.packageId) || !LANGUAGE_RE.test(input.targetLanguage) ||
      !Number.isSafeInteger(input.episodeOrdinal) || input.episodeOrdinal < 1 || input.episodeOrdinal > 32 ||
      !LEARNING_V2_INTERFACE_LOCALES.includes(input.locale) || input.requiredSessionCount !== 12 ||
      !exactArray(input.contentKinds, LEARNING_V2_REQUIRED_CONTENT_KINDS) || !Array.isArray(input.sessionShards) || input.sessionShards.length !== 12) {
    throw new Error('learning_v2_episode_locale_index_identity_invalid');
  }
  for (let index = 0; index < input.sessionShards.length; index += 1) {
    const shard = input.sessionShards[index];
    const sessionOrdinal = index + 1;
    if (shard.shardId !== `episode-${String(input.episodeOrdinal).padStart(2, '0')}:session-${String(sessionOrdinal).padStart(2, '0')}` ||
        shard.episodeOrdinal !== input.episodeOrdinal || shard.requiredSessionOrdinal !== sessionOrdinal ||
        !HASH_RE.test(shard.generationInputFingerprint)) {
      throw new Error('learning_v2_episode_locale_index_session_invalid');
    }
    validateObjectRef(shard.object, expectedSessionPath(input.packageId, input.episodeOrdinal, sessionOrdinal));
  }
  const expectedAggregate = learningV2EpisodeLocaleSessionAggregateFingerprint(input);
  if (input.sessionAggregateFingerprint !== expectedAggregate) throw new Error('learning_v2_episode_locale_index_aggregate_invalid');
  const encoded = JSON.stringify(input);
  if (!encoded || encoded.length > MAX_SHARD_BYTES || utf8ByteLengthV1(encoded) > MAX_SHARD_BYTES) {
    throw new Error('learning_v2_episode_locale_index_size_invalid');
  }
  return input;
}

/**
 * Validates the bounded root of a generated course. The root contains only
 * immutable references and receipts; localized lesson bodies and audio indexes
 * remain in episode-scoped objects so one correction never regenerates the
 * whole course and a crash can resume from the exact missing shard.
 */
export function validateLearningV2CourseGenerationManifestV2(input: LearningV2CourseGenerationManifestV2): LearningV2CourseGenerationManifestV2 {
  if (input.schemaVersion !== 'learning-v2-course-generation-manifest.v2' || !TOKEN_RE.test(input.packageId) || !LANGUAGE_RE.test(input.targetLanguage) ||
      input.entryBand !== 'PRE_A1' || input.exitBand !== 'C2' || input.episodeCount !== 32 || input.requiredSessionsPerEpisode !== 12) {
    throw new Error('learning_v2_course_manifest_identity_invalid');
  }
  if (!exactArray(input.interfaceLocales, LEARNING_V2_INTERFACE_LOCALES) || !exactGenerationWaves(input.generationWaves)) {
    throw new Error('learning_v2_course_manifest_policy_invalid');
  }

  const expectedShardCount = input.episodeCount * LEARNING_V2_INTERFACE_LOCALES.length;
  if (!Array.isArray(input.episodeLocaleShards) || input.episodeLocaleShards.length !== expectedShardCount) {
    throw new Error('learning_v2_course_manifest_locale_shards_incomplete');
  }
  const shardIds = new Set<string>();
  let shardIndex = 0;
  for (let episodeOrdinal = 1; episodeOrdinal <= input.episodeCount; episodeOrdinal += 1) {
    for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
      const shard = input.episodeLocaleShards[shardIndex++];
      const expectedId = `episode-${String(episodeOrdinal).padStart(2, '0')}:${locale}`;
      if (shard.shardId !== expectedId || shardIds.has(shard.shardId) || shard.episodeOrdinal !== episodeOrdinal || shard.locale !== locale ||
          shard.requiredSessionCount !== 12 || !exactArray(shard.contentKinds, LEARNING_V2_REQUIRED_CONTENT_KINDS) ||
          !HASH_RE.test(shard.generationInputFingerprint) || !HASH_RE.test(shard.sessionAggregateFingerprint)) {
        throw new Error('learning_v2_course_manifest_locale_shard_invalid');
      }
      validateObjectRef(shard.object, expectedEpisodePath(input.packageId, episodeOrdinal, locale));
      shardIds.add(shard.shardId);
    }
  }

  if (!Array.isArray(input.episodeReceipts) || input.episodeReceipts.length !== input.episodeCount) {
    throw new Error('learning_v2_course_manifest_episode_receipts_incomplete');
  }
  for (let index = 0; index < input.episodeReceipts.length; index += 1) {
    const receipt = input.episodeReceipts[index];
    if (receipt.episodeOrdinal !== index + 1 || receipt.requiredSessionCount !== 12 || receipt.cardCount !== 144 ||
        !HASH_RE.test(receipt.contentAggregateFingerprint) || !HASH_RE.test(receipt.qaFingerprint)) {
      throw new Error('learning_v2_course_manifest_episode_receipt_invalid');
    }
  }

  if (!Array.isArray(input.audioShards) || input.audioShards.length !== input.episodeCount) {
    throw new Error('learning_v2_course_manifest_audio_shards_incomplete');
  }
  for (let index = 0; index < input.audioShards.length; index += 1) {
    const shard = input.audioShards[index];
    const receipt = input.episodeReceipts[index];
    if (shard.episodeOrdinal !== index + 1 || shard.provider !== 'openai' || shard.endpoint !== '/v1/audio/speech' ||
        !exactArray(shard.voices, LEARNING_V2_AUDIO_VOICES) || shard.variantsPerItem !== 4 ||
        shard.sourceContentAggregateFingerprint !== receipt.contentAggregateFingerprint || !HASH_RE.test(shard.voiceSettingsFingerprint)) {
      throw new Error('learning_v2_course_manifest_audio_shard_invalid');
    }
    validateObjectRef(shard.object, expectedAudioPath(input.packageId, index + 1));
  }

  if (!Array.isArray(input.waveApprovals) || input.waveApprovals.length !== LEARNING_V2_GENERATION_WAVES.length) {
    throw new Error('learning_v2_course_manifest_wave_approvals_incomplete');
  }
  for (const [index, definition] of LEARNING_V2_GENERATION_WAVES.entries()) {
    const approval = input.waveApprovals[index];
    const expectedFingerprint = learningV2GenerationWaveFingerprint({ waveId: definition.waveId, episodeLocaleShards: input.episodeLocaleShards, audioShards: input.audioShards });
    if (approval.waveId !== definition.waveId || approval.state !== 'approved' || approval.waveFingerprint !== expectedFingerprint ||
        approval.reviewerId !== 'owner' || Number.isNaN(Date.parse(approval.reviewedAtIso))) {
      throw new Error(`learning_v2_course_manifest_wave_${definition.waveId}_approval_invalid`);
    }
  }

  if (!Array.isArray(input.stageApprovals) || input.stageApprovals.length !== LEARNING_V2_APPROVAL_STAGES.length) {
    throw new Error('learning_v2_course_manifest_stage_approvals_incomplete');
  }
  for (const [index, stage] of LEARNING_V2_APPROVAL_STAGES.entries()) {
    const approval = input.stageApprovals[index];
    if (approval.stage !== stage || approval.state !== 'approved' || !TOKEN_RE.test(approval.artifactId) || !HASH_RE.test(approval.artifactFingerprint) ||
        approval.reviewerId !== 'owner' || Number.isNaN(Date.parse(approval.reviewedAtIso))) {
      throw new Error(`learning_v2_course_manifest_stage_${stage}_approval_invalid`);
    }
  }

  const encoded = JSON.stringify(input);
  if (!encoded || encoded.length > MAX_MANIFEST_BYTES || utf8ByteLengthV1(encoded) > MAX_MANIFEST_BYTES) {
    throw new Error('learning_v2_course_manifest_size_invalid');
  }
  return input;
}

export function learningV2CourseGenerationManifestV2Fingerprint(input: LearningV2CourseGenerationManifestV2): string {
  validateLearningV2CourseGenerationManifestV2(input);
  return hashCanonicalBody(input);
}
