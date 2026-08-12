"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_AUDIO_PREFETCH_POLICY_V1 = exports.V2_FOUR_VOICE_PLAYBACK_POLICY_V1 = exports.V2_REQUIRED_VOICE_IDS = void 0;
const decision_registry_1 = require("../policies/decision_registry");
exports.V2_REQUIRED_VOICE_IDS = Object.freeze([
    "ash",
    "onyx",
    "nova",
    "coral",
]);
const playbackBody = Object.freeze({
    schemaVersion: "v2-four-voice-playback-policy.v1",
    policyId: "balanced-four-voice-shuffled-cycle",
    version: 1,
    voices: exports.V2_REQUIRED_VOICE_IDS,
    variantsPerApprovedTarget: 4,
    selection: "local_shuffled_round_robin",
    exhaustAllVoicesBeforeRepeat: true,
    avoidImmediateRepeatAcrossCycleBoundary: true,
    serverRequestPerPlayback: false,
    remoteTtsFallbackDuringSession: false,
    selectionAuthority: "code_owned_runtime_policy",
});
exports.V2_FOUR_VOICE_PLAYBACK_POLICY_V1 = Object.freeze({
    body: playbackBody,
    ref: Object.freeze({
        policyId: playbackBody.policyId,
        version: playbackBody.version,
        contentHash: (0, decision_registry_1.hashCanonicalBody)(playbackBody),
    }),
    contentHash: (0, decision_registry_1.hashCanonicalBody)(playbackBody),
});
const prefetchBody = Object.freeze({
    schemaVersion: "v2-audio-prefetch-policy.v1",
    policyId: "current-and-next-required-session-audio",
    version: 1,
    initialRequiredSessionOrdinals: Object.freeze([1, 2]),
    afterCompletionPrefetchOrdinalOffset: 2,
    cacheIdentity: "immutable_content_hash",
    wholeEpisodePrefetch: false,
    serverRequestPerPlayback: false,
    runtimeImplementationAuthority: "external_pending",
});
exports.V2_AUDIO_PREFETCH_POLICY_V1 = Object.freeze({
    body: prefetchBody,
    ref: Object.freeze({
        policyId: prefetchBody.policyId,
        version: prefetchBody.version,
        contentHash: (0, decision_registry_1.hashCanonicalBody)(prefetchBody),
    }),
    contentHash: (0, decision_registry_1.hashCanonicalBody)(prefetchBody),
});
//# sourceMappingURL=voice_playback_policy_v1.js.map