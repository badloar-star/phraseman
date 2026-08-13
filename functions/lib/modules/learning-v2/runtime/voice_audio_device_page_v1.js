"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_VOICE_AUDIO_SIGNED_URL_MAX_TTL_MS_V1 = exports.LEARNING_V2_VOICE_AUDIO_SIGNED_URL_MIN_TTL_MS_V1 = exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_MAX_ITEMS_V1 = exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_SCHEMA_V1 = void 0;
exports.learningV2VoiceAudioDeviceStableProjectionFingerprintV1 = learningV2VoiceAudioDeviceStableProjectionFingerprintV1;
exports.materializeLearningV2VoiceAudioDevicePageV1 = materializeLearningV2VoiceAudioDevicePageV1;
exports.createLearningV2VoiceAudioDevicePageRuntimeInputV1 = createLearningV2VoiceAudioDevicePageRuntimeInputV1;
const decision_registry_1 = require("../policies/decision_registry");
const voice_native_decoder_observer_v1_1 = require("./voice_native_decoder_observer_v1");
exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_SCHEMA_V1 = "learning-v2-voice-audio-device-page.v1";
exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_MAX_ITEMS_V1 = 32;
exports.LEARNING_V2_VOICE_AUDIO_SIGNED_URL_MIN_TTL_MS_V1 = 60000;
exports.LEARNING_V2_VOICE_AUDIO_SIGNED_URL_MAX_TTL_MS_V1 = 15 * 60000;
const HASH_RE = /^[a-f0-9]{64}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const AUDIO_PATH_RE = /^learning-v2\/voice-audio\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/u;
const EXACT_BUCKET = "phraseman-ea0b3.firebasestorage.app";
function fail() {
    throw new Error("learning_v2_voice_audio_device_page_invalid");
}
function exactSignedUrl(value, objectPath) {
    if (typeof value !== "string" || value.length < 1 || value.length > 4096)
        fail();
    let url;
    try {
        url = new URL(value);
    }
    catch {
        fail();
    }
    const gcsPath = `/${EXACT_BUCKET}/${objectPath}`;
    const firebasePath = `/v0/b/${EXACT_BUCKET}/o/${encodeURIComponent(objectPath)}`;
    if (url.protocol !== "https:" ||
        url.username !== "" ||
        url.password !== "" ||
        url.hash !== "" ||
        url.search.length < 2 ||
        !((url.hostname === "storage.googleapis.com" && url.pathname === gcsPath) ||
            (url.hostname === "firebasestorage.googleapis.com" &&
                url.pathname === firebasePath)))
        fail();
    return value;
}
function exactSourceRow(value, expectedIndex) {
    if (!value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype ||
        Object.keys(value).sort().join("|") !==
            [
                "byteSize",
                "contentHash",
                "entryFingerprint",
                "generationTargetFingerprint",
                "itemIndex",
                "objectGeneration",
                "objectPath",
                "signedReadUrl",
            ]
                .sort()
                .join("|") ||
        !exactStableSourceRow(value, expectedIndex))
        fail();
    return Object.freeze({
        ...value,
        signedReadUrl: exactSignedUrl(value.signedReadUrl, value.objectPath),
    });
}
function exactStableSourceRow(value, expectedIndex) {
    return (value.itemIndex === expectedIndex &&
        HASH_RE.test(value.generationTargetFingerprint) &&
        HASH_RE.test(value.entryFingerprint) &&
        AUDIO_PATH_RE.test(value.objectPath) &&
        HASH_RE.test(value.contentHash) &&
        value.objectPath.endsWith(`/${value.contentHash}.mp3`) &&
        GENERATION_RE.test(value.objectGeneration) &&
        Number.isSafeInteger(value.byteSize) &&
        value.byteSize >= 1 &&
        value.byteSize <= 64 * 1024);
}
function learningV2VoiceAudioDeviceStableProjectionFingerprintV1(input) {
    if (!input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !==
            [
                "audioObjectCount",
                "episodeReceiptFingerprint",
                "manifestFingerprint",
                "nextPageStartIndex",
                "pageAudioReadbackAggregateFingerprint",
                "pageReceiptFingerprint",
                "pageStartIndex",
                "rows",
            ]
                .sort()
                .join("|") ||
        !HASH_RE.test(input.manifestFingerprint) ||
        !HASH_RE.test(input.episodeReceiptFingerprint) ||
        !HASH_RE.test(input.pageReceiptFingerprint) ||
        !HASH_RE.test(input.pageAudioReadbackAggregateFingerprint) ||
        !Number.isSafeInteger(input.audioObjectCount) ||
        input.audioObjectCount < 1 ||
        !Number.isSafeInteger(input.pageStartIndex) ||
        input.pageStartIndex < 0 ||
        !Array.isArray(input.rows) ||
        input.rows.length < 1 ||
        input.rows.length > exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_MAX_ITEMS_V1 ||
        input.pageStartIndex + input.rows.length > input.audioObjectCount)
        fail();
    const expectedNext = input.pageStartIndex + input.rows.length === input.audioObjectCount
        ? null
        : input.pageStartIndex + input.rows.length;
    if (input.nextPageStartIndex !== expectedNext)
        fail();
    if (new Set(input.rows.map((row) => row.generationTargetFingerprint)).size !==
        input.rows.length ||
        new Set(input.rows.map((row) => row.entryFingerprint)).size !==
            input.rows.length)
        fail();
    const rowFingerprints = input.rows.map((row, offset) => {
        if (!row ||
            typeof row !== "object" ||
            Array.isArray(row) ||
            Object.getPrototypeOf(row) !== Object.prototype ||
            Object.keys(row).sort().join("|") !==
                [
                    "byteSize",
                    "contentHash",
                    "entryFingerprint",
                    "generationTargetFingerprint",
                    "itemIndex",
                    "objectGeneration",
                    "objectPath",
                ]
                    .sort()
                    .join("|") ||
            !exactStableSourceRow(row, input.pageStartIndex + offset))
            fail();
        return (0, decision_registry_1.hashCanonicalBody)({
            itemIndex: row.itemIndex,
            generationTargetFingerprint: row.generationTargetFingerprint,
            entryFingerprint: row.entryFingerprint,
            objectPath: row.objectPath,
            contentHash: row.contentHash,
            objectGeneration: row.objectGeneration,
            byteSize: row.byteSize,
        });
    });
    return (0, decision_registry_1.hashCanonicalBody)({
        manifestFingerprint: input.manifestFingerprint,
        episodeReceiptFingerprint: input.episodeReceiptFingerprint,
        pageReceiptFingerprint: input.pageReceiptFingerprint,
        pageAudioReadbackAggregateFingerprint: input.pageAudioReadbackAggregateFingerprint,
        audioObjectCount: input.audioObjectCount,
        pageStartIndex: input.pageStartIndex,
        pageItemCount: input.rows.length,
        nextPageStartIndex: input.nextPageStartIndex,
        orderedRowAggregateFingerprint: (0, decision_registry_1.hashCanonicalBody)(rowFingerprints),
    });
}
function materializeLearningV2VoiceAudioDevicePageV1(input) {
    if (!input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !==
            [
                "audioObjectCount",
                "episodeReceiptFingerprint",
                "manifestFingerprint",
                "nextPageStartIndex",
                "observedAtMs",
                "pageAudioReadbackAggregateFingerprint",
                "pageReceiptFingerprint",
                "pageStartIndex",
                "rows",
                "signedUrlExpiresAtMs",
            ]
                .sort()
                .join("|") ||
        !HASH_RE.test(input.manifestFingerprint) ||
        !HASH_RE.test(input.episodeReceiptFingerprint) ||
        !HASH_RE.test(input.pageReceiptFingerprint) ||
        !HASH_RE.test(input.pageAudioReadbackAggregateFingerprint) ||
        !Number.isSafeInteger(input.audioObjectCount) ||
        input.audioObjectCount < 1 ||
        !Number.isSafeInteger(input.pageStartIndex) ||
        input.pageStartIndex < 0 ||
        !Number.isSafeInteger(input.observedAtMs) ||
        input.observedAtMs < 0 ||
        !Number.isSafeInteger(input.signedUrlExpiresAtMs) ||
        input.signedUrlExpiresAtMs - input.observedAtMs <
            exports.LEARNING_V2_VOICE_AUDIO_SIGNED_URL_MIN_TTL_MS_V1 ||
        input.signedUrlExpiresAtMs - input.observedAtMs >
            exports.LEARNING_V2_VOICE_AUDIO_SIGNED_URL_MAX_TTL_MS_V1 ||
        !Array.isArray(input.rows) ||
        input.rows.length < 1 ||
        input.rows.length > exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_MAX_ITEMS_V1 ||
        input.pageStartIndex + input.rows.length > input.audioObjectCount)
        fail();
    const expectedNext = input.pageStartIndex + input.rows.length === input.audioObjectCount
        ? null
        : input.pageStartIndex + input.rows.length;
    if (input.nextPageStartIndex !== expectedNext)
        fail();
    const rows = Object.freeze(input.rows.map((row, offset) => {
        const exact = exactSourceRow(row, input.pageStartIndex + offset);
        const stableBody = {
            itemIndex: exact.itemIndex,
            generationTargetFingerprint: exact.generationTargetFingerprint,
            entryFingerprint: exact.entryFingerprint,
            objectPath: exact.objectPath,
            contentHash: exact.contentHash,
            objectGeneration: exact.objectGeneration,
            byteSize: exact.byteSize,
        };
        return Object.freeze({
            ...exact,
            rowFingerprint: (0, decision_registry_1.hashCanonicalBody)(stableBody),
        });
    }));
    if (new Set(rows.map((row) => row.generationTargetFingerprint)).size !==
        rows.length ||
        new Set(rows.map((row) => row.entryFingerprint)).size !== rows.length)
        fail();
    const stableBody = {
        manifestFingerprint: input.manifestFingerprint,
        episodeReceiptFingerprint: input.episodeReceiptFingerprint,
        pageReceiptFingerprint: input.pageReceiptFingerprint,
        pageAudioReadbackAggregateFingerprint: input.pageAudioReadbackAggregateFingerprint,
        audioObjectCount: input.audioObjectCount,
        pageStartIndex: input.pageStartIndex,
        pageItemCount: rows.length,
        nextPageStartIndex: input.nextPageStartIndex,
        orderedRowAggregateFingerprint: (0, decision_registry_1.hashCanonicalBody)(rows.map((row) => row.rowFingerprint)),
    };
    const stableProjectionFingerprint = (0, decision_registry_1.hashCanonicalBody)(stableBody);
    const transportBody = {
        stableProjectionFingerprint,
        signedUrlExpiresAtMs: input.signedUrlExpiresAtMs,
        signedUrlHashes: rows.map((row) => (0, decision_registry_1.hashCanonicalBody)(row.signedReadUrl)),
    };
    return Object.freeze({
        schemaVersion: exports.LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_SCHEMA_V1,
        ...stableBody,
        signedUrlExpiresAtMs: input.signedUrlExpiresAtMs,
        rows,
        stableProjectionFingerprint,
        signedTransportFingerprint: (0, decision_registry_1.hashCanonicalBody)(transportBody),
        transportUrlPurpose: "short_lived_download_only",
        transportUrlRetention: "forbidden_in_evidence_and_journal",
        repositoryOriginAuthority: "none_serialized_transport",
        audioByteAuthority: "none_device_must_hash_exact_bytes",
        listeningEvidenceAuthority: "none",
        deviceEvidenceAuthority: "none",
        publicationAuthority: "none",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
    });
}
function createLearningV2VoiceAudioDevicePageRuntimeInputV1(input) {
    const page = materializeLearningV2VoiceAudioDevicePageV1({
        manifestFingerprint: input.page.manifestFingerprint,
        episodeReceiptFingerprint: input.page.episodeReceiptFingerprint,
        pageReceiptFingerprint: input.page.pageReceiptFingerprint,
        pageAudioReadbackAggregateFingerprint: input.page.pageAudioReadbackAggregateFingerprint,
        audioObjectCount: input.page.audioObjectCount,
        pageStartIndex: input.page.pageStartIndex,
        nextPageStartIndex: input.page.nextPageStartIndex,
        signedUrlExpiresAtMs: input.page.signedUrlExpiresAtMs,
        observedAtMs: input.observedAtMs,
        rows: input.page.rows.map((row) => ({
            itemIndex: row.itemIndex,
            generationTargetFingerprint: row.generationTargetFingerprint,
            entryFingerprint: row.entryFingerprint,
            objectPath: row.objectPath,
            contentHash: row.contentHash,
            objectGeneration: row.objectGeneration,
            byteSize: row.byteSize,
            signedReadUrl: row.signedReadUrl,
        })),
    });
    if (page.stableProjectionFingerprint !==
        input.page.stableProjectionFingerprint ||
        page.signedTransportFingerprint !== input.page.signedTransportFingerprint ||
        input.observedAtMs >= page.signedUrlExpiresAtMs)
        fail();
    const urls = new Map();
    const identities = Object.freeze(page.rows.map((row) => {
        urls.set(row.entryFingerprint, row.signedReadUrl);
        return (0, voice_native_decoder_observer_v1_1.parseLearningV2NativeDecoderIdentityV1)({
            itemIndex: row.itemIndex,
            generationTargetFingerprint: row.generationTargetFingerprint,
            entryFingerprint: row.entryFingerprint,
            objectPath: row.objectPath,
            contentHash: row.contentHash,
            objectGeneration: row.objectGeneration,
            byteSize: row.byteSize,
            platform: input.device.platform,
            deviceClass: input.device.deviceClass,
            osVersion: input.device.osVersion,
            appBuildFingerprint: input.device.appBuildFingerprint,
            expoAudioVersion: input.device.expoAudioVersion,
        });
    }));
    return Object.freeze({
        identities,
        resolveSourceUrl: async (identity) => {
            const value = urls.get(identity.entryFingerprint);
            if (!value)
                fail();
            return value;
        },
    });
}
//# sourceMappingURL=voice_audio_device_page_v1.js.map