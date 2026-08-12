import { hashCanonicalBody } from "../policies/decision_registry";

export const V2_REQUIRED_VOICE_IDS = Object.freeze([
  "ash",
  "onyx",
  "nova",
  "coral",
] as const);

const playbackBody = Object.freeze({
  schemaVersion: "v2-four-voice-playback-policy.v1" as const,
  policyId: "balanced-four-voice-shuffled-cycle" as const,
  version: 1 as const,
  voices: V2_REQUIRED_VOICE_IDS,
  variantsPerApprovedTarget: 4 as const,
  selection: "local_shuffled_round_robin" as const,
  exhaustAllVoicesBeforeRepeat: true as const,
  avoidImmediateRepeatAcrossCycleBoundary: true as const,
  serverRequestPerPlayback: false as const,
  remoteTtsFallbackDuringSession: false as const,
  selectionAuthority: "code_owned_runtime_policy" as const,
});

export const V2_FOUR_VOICE_PLAYBACK_POLICY_V1 = Object.freeze({
  body: playbackBody,
  ref: Object.freeze({
    policyId: playbackBody.policyId,
    version: playbackBody.version,
    contentHash: hashCanonicalBody(playbackBody),
  }),
  contentHash: hashCanonicalBody(playbackBody),
});

const prefetchBody = Object.freeze({
  schemaVersion: "v2-audio-prefetch-policy.v1" as const,
  policyId: "current-and-next-required-session-audio" as const,
  version: 1 as const,
  initialRequiredSessionOrdinals: Object.freeze([1, 2] as const),
  afterCompletionPrefetchOrdinalOffset: 2 as const,
  cacheIdentity: "immutable_content_hash" as const,
  wholeEpisodePrefetch: false as const,
  serverRequestPerPlayback: false as const,
  runtimeImplementationAuthority: "external_pending" as const,
});

export const V2_AUDIO_PREFETCH_POLICY_V1 = Object.freeze({
  body: prefetchBody,
  ref: Object.freeze({
    policyId: prefetchBody.policyId,
    version: prefetchBody.version,
    contentHash: hashCanonicalBody(prefetchBody),
  }),
  contentHash: hashCanonicalBody(prefetchBody),
});
