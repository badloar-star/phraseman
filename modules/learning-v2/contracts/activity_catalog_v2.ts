import { V2_ACTIVITY_FAMILIES } from "./activity";
import { hashCanonicalBody } from "../policies/decision_registry";

/**
 * Historical Episode-v1 catalog. This alias deliberately preserves the exact
 * frozen 16-family tuple and must never be widened in place.
 */
export const V2_ACTIVITY_FAMILIES_V1 = V2_ACTIVITY_FAMILIES;

/** Owner-current Episode-v2 catalog. Checkpoints are assessment, not a family. */
export const V2_ACTIVITY_FAMILIES_V2 = Object.freeze([
  "visual_discovery",
  "listen_choose",
  "sound_contrast",
  "sound_syllable_lab",
  "scripted_repeat_compare",
  "phrase_builder",
  "listen_build_dictation",
  "context_gap_grammar",
  "quick_spoken_response",
  "shadowing_prosody",
  "describe_scene",
  "microstory_radio",
  "branching_scene",
  "scripted_dialogue",
  "speaking_club_mission",
  "personalized_review",
  "speed_match",
] as const);

export type V2ActivityFamilyV2 = (typeof V2_ACTIVITY_FAMILIES_V2)[number];

/**
 * Required sessions intentionally remain a narrow seven-family policy. A
 * family being present in the 17-family catalog does not admit it to core.
 */
export const V2_REQUIRED_SESSION_FAMILIES_V2 = Object.freeze([
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
] as const satisfies readonly V2ActivityFamilyV2[]);

const catalogBody = Object.freeze({
  schemaVersion: "v2-activity-family-catalog.v2" as const,
  catalogId: "v2-activity-family-catalog" as const,
  version: 2 as const,
  families: V2_ACTIVITY_FAMILIES_V2,
  checkpointIsActivityFamily: false as const,
});

export const V2_ACTIVITY_FAMILY_CATALOG_V2 = Object.freeze({
  body: catalogBody,
  ref: Object.freeze({
    catalogId: catalogBody.catalogId,
    version: catalogBody.version,
    contentHash: hashCanonicalBody(catalogBody),
  }),
  contentHash: hashCanonicalBody(catalogBody),
});

const requiredSessionPolicyBody = Object.freeze({
  schemaVersion: "v2-required-session-family-policy.v2" as const,
  policyId: "v2-required-session-family-policy" as const,
  version: 2 as const,
  requiredFamilies: V2_REQUIRED_SESSION_FAMILIES_V2,
  minimumDistinctFamiliesPerSession: 3 as const,
  maximumDistinctFamiliesPerSession: 4 as const,
  optionalPracticeMayReplaceRequiredTask: false as const,
});

export const V2_REQUIRED_SESSION_FAMILY_POLICY_V2 = Object.freeze({
  body: requiredSessionPolicyBody,
  ref: Object.freeze({
    policyId: requiredSessionPolicyBody.policyId,
    version: requiredSessionPolicyBody.version,
    contentHash: hashCanonicalBody(requiredSessionPolicyBody),
  }),
  contentHash: hashCanonicalBody(requiredSessionPolicyBody),
});
