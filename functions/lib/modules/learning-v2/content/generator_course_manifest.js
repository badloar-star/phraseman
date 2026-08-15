"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_AUDIO_VOICES = exports.LEARNING_V2_GENERATION_WAVES = void 0;
exports.learningV2GenerationWaveFingerprint = learningV2GenerationWaveFingerprint;
exports.learningV2EpisodeLocaleSessionAggregateFingerprint = learningV2EpisodeLocaleSessionAggregateFingerprint;
exports.validateLearningV2EpisodeLocaleIndexV1 = validateLearningV2EpisodeLocaleIndexV1;
exports.validateLearningV2CourseGenerationManifestV2 = validateLearningV2CourseGenerationManifestV2;
exports.learningV2CourseGenerationManifestV2Fingerprint = learningV2CourseGenerationManifestV2Fingerprint;
const decision_registry_1 = require("../policies/decision_registry");
const generator_course_contract_1 = require("./generator_course_contract");
exports.LEARNING_V2_GENERATION_WAVES = Object.freeze([
    Object.freeze({ waveId: 'e1', prerequisiteWaveId: null, episodeOrdinals: Object.freeze([1]) }),
    Object.freeze({ waveId: 'chapter_1', prerequisiteWaveId: 'e1', episodeOrdinals: Object.freeze(Array.from({ length: 8 }, (_, index) => index + 1)) }),
    Object.freeze({ waveId: 'season', prerequisiteWaveId: 'chapter_1', episodeOrdinals: Object.freeze(Array.from({ length: 32 }, (_, index) => index + 1)) }),
]);
exports.LEARNING_V2_AUDIO_VOICES = Object.freeze(['ash', 'onyx', 'nova', 'coral']);
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const LANGUAGE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const MAX_SHARD_BYTES = 512 * 1024;
const MAX_MANIFEST_BYTES = 512 * 1024;
function exactArray(value, expected) {
    return value.length === expected.length && value.every((item, index) => item === expected[index]);
}
function exactGenerationWaves(value) {
    return value.length === exports.LEARNING_V2_GENERATION_WAVES.length && value.every((wave, index) => {
        const expected = exports.LEARNING_V2_GENERATION_WAVES[index];
        return wave.waveId === expected.waveId && wave.prerequisiteWaveId === expected.prerequisiteWaveId &&
            exactArray(wave.episodeOrdinals, expected.episodeOrdinals);
    });
}
function expectedEpisodePath(packageId, episodeOrdinal, locale) {
    return `learning-v2/course-packages/${packageId}/episodes/${String(episodeOrdinal).padStart(2, '0')}/${locale}/content.json`;
}
function expectedSessionPath(packageId, episodeOrdinal, sessionOrdinal) {
    return `learning-v2/course-packages/${packageId}/episodes/${String(episodeOrdinal).padStart(2, '0')}/sessions/${String(sessionOrdinal).padStart(2, '0')}.json`;
}
function expectedAudioPath(packageId, episodeOrdinal) {
    return `learning-v2/course-packages/${packageId}/episodes/${String(episodeOrdinal).padStart(2, '0')}/audio/manifest.json`;
}
function validateObjectRef(value, expectedPath) {
    if (value.objectPath !== expectedPath || !HASH_RE.test(value.contentHash) || !GENERATION_RE.test(value.objectGeneration) ||
        !Number.isSafeInteger(value.byteSize) || value.byteSize < 1 || value.byteSize > MAX_SHARD_BYTES) {
        throw new Error('learning_v2_course_manifest_object_ref_invalid');
    }
}
function learningV2GenerationWaveFingerprint(input) {
    const definition = exports.LEARNING_V2_GENERATION_WAVES.find((wave) => wave.waveId === input.waveId);
    if (!definition)
        throw new Error('learning_v2_course_manifest_wave_invalid');
    const episodeSet = new Set(definition.episodeOrdinals);
    const content = input.episodeLocaleShards
        .filter((shard) => episodeSet.has(shard.episodeOrdinal))
        .map((shard) => Object.freeze({ shardId: shard.shardId, sessionAggregateFingerprint: shard.sessionAggregateFingerprint, contentHash: shard.object.contentHash }));
    const audio = input.audioShards
        .filter((shard) => episodeSet.has(shard.episodeOrdinal))
        .map((shard) => Object.freeze({ episodeOrdinal: shard.episodeOrdinal, contentHash: shard.object.contentHash }));
    return (0, decision_registry_1.hashCanonicalBody)(Object.freeze({ waveId: input.waveId, episodeOrdinals: definition.episodeOrdinals, content, audio }));
}
function learningV2EpisodeLocaleSessionAggregateFingerprint(input) {
    return (0, decision_registry_1.hashCanonicalBody)(Object.freeze({
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
function validateLearningV2EpisodeLocaleIndexV1(input) {
    if (input.schemaVersion !== 'learning-v2-episode-locale-index.v1' || !TOKEN_RE.test(input.packageId) || !LANGUAGE_RE.test(input.targetLanguage) ||
        !Number.isSafeInteger(input.episodeOrdinal) || input.episodeOrdinal < 1 || input.episodeOrdinal > 32 ||
        !generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.includes(input.locale) || input.requiredSessionCount !== 12 ||
        !exactArray(input.contentKinds, generator_course_contract_1.LEARNING_V2_REQUIRED_CONTENT_KINDS) || !Array.isArray(input.sessionShards) || input.sessionShards.length !== 12) {
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
    if (input.sessionAggregateFingerprint !== expectedAggregate)
        throw new Error('learning_v2_episode_locale_index_aggregate_invalid');
    const encoded = JSON.stringify(input);
    if (!encoded || encoded.length > MAX_SHARD_BYTES || (0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_SHARD_BYTES) {
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
function validateLearningV2CourseGenerationManifestV2(input) {
    if (input.schemaVersion !== 'learning-v2-course-generation-manifest.v2' || !TOKEN_RE.test(input.packageId) || !LANGUAGE_RE.test(input.targetLanguage) ||
        input.entryBand !== 'PRE_A1' || input.exitBand !== 'C2' || input.episodeCount !== 32 || input.requiredSessionsPerEpisode !== 12) {
        throw new Error('learning_v2_course_manifest_identity_invalid');
    }
    if (!exactArray(input.interfaceLocales, generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES) || !exactGenerationWaves(input.generationWaves)) {
        throw new Error('learning_v2_course_manifest_policy_invalid');
    }
    const expectedShardCount = input.episodeCount * generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.length;
    if (!Array.isArray(input.episodeLocaleShards) || input.episodeLocaleShards.length !== expectedShardCount) {
        throw new Error('learning_v2_course_manifest_locale_shards_incomplete');
    }
    const shardIds = new Set();
    let shardIndex = 0;
    for (let episodeOrdinal = 1; episodeOrdinal <= input.episodeCount; episodeOrdinal += 1) {
        for (const locale of generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES) {
            const shard = input.episodeLocaleShards[shardIndex++];
            const expectedId = `episode-${String(episodeOrdinal).padStart(2, '0')}:${locale}`;
            if (shard.shardId !== expectedId || shardIds.has(shard.shardId) || shard.episodeOrdinal !== episodeOrdinal || shard.locale !== locale ||
                shard.requiredSessionCount !== 12 || !exactArray(shard.contentKinds, generator_course_contract_1.LEARNING_V2_REQUIRED_CONTENT_KINDS) ||
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
            !exactArray(shard.voices, exports.LEARNING_V2_AUDIO_VOICES) || shard.variantsPerItem !== 4 ||
            shard.sourceContentAggregateFingerprint !== receipt.contentAggregateFingerprint || !HASH_RE.test(shard.voiceSettingsFingerprint)) {
            throw new Error('learning_v2_course_manifest_audio_shard_invalid');
        }
        validateObjectRef(shard.object, expectedAudioPath(input.packageId, index + 1));
    }
    if (!Array.isArray(input.waveApprovals) || input.waveApprovals.length !== exports.LEARNING_V2_GENERATION_WAVES.length) {
        throw new Error('learning_v2_course_manifest_wave_approvals_incomplete');
    }
    for (const [index, definition] of exports.LEARNING_V2_GENERATION_WAVES.entries()) {
        const approval = input.waveApprovals[index];
        const expectedFingerprint = learningV2GenerationWaveFingerprint({ waveId: definition.waveId, episodeLocaleShards: input.episodeLocaleShards, audioShards: input.audioShards });
        if (approval.waveId !== definition.waveId || approval.state !== 'approved' || approval.waveFingerprint !== expectedFingerprint ||
            approval.reviewerId !== 'owner' || Number.isNaN(Date.parse(approval.reviewedAtIso))) {
            throw new Error(`learning_v2_course_manifest_wave_${definition.waveId}_approval_invalid`);
        }
    }
    if (!Array.isArray(input.stageApprovals) || input.stageApprovals.length !== generator_course_contract_1.LEARNING_V2_APPROVAL_STAGES.length) {
        throw new Error('learning_v2_course_manifest_stage_approvals_incomplete');
    }
    for (const [index, stage] of generator_course_contract_1.LEARNING_V2_APPROVAL_STAGES.entries()) {
        const approval = input.stageApprovals[index];
        if (approval.stage !== stage || approval.state !== 'approved' || !TOKEN_RE.test(approval.artifactId) || !HASH_RE.test(approval.artifactFingerprint) ||
            approval.reviewerId !== 'owner' || Number.isNaN(Date.parse(approval.reviewedAtIso))) {
            throw new Error(`learning_v2_course_manifest_stage_${stage}_approval_invalid`);
        }
    }
    const encoded = JSON.stringify(input);
    if (!encoded || encoded.length > MAX_MANIFEST_BYTES || (0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_MANIFEST_BYTES) {
        throw new Error('learning_v2_course_manifest_size_invalid');
    }
    return input;
}
function learningV2CourseGenerationManifestV2Fingerprint(input) {
    validateLearningV2CourseGenerationManifestV2(input);
    return (0, decision_registry_1.hashCanonicalBody)(input);
}
//# sourceMappingURL=generator_course_manifest.js.map