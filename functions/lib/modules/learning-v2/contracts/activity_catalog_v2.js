"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_REQUIRED_SESSION_FAMILY_POLICY_V2 = exports.V2_ACTIVITY_FAMILY_CATALOG_V2 = exports.V2_REQUIRED_SESSION_FAMILIES_V2 = exports.V2_ACTIVITY_FAMILIES_V2 = exports.V2_ACTIVITY_FAMILIES_V1 = void 0;
const activity_1 = require("./activity");
const decision_registry_1 = require("../policies/decision_registry");
/**
 * Historical Episode-v1 catalog. This alias deliberately preserves the exact
 * frozen 16-family tuple and must never be widened in place.
 */
exports.V2_ACTIVITY_FAMILIES_V1 = activity_1.V2_ACTIVITY_FAMILIES;
/** Owner-current Episode-v2 catalog. Checkpoints are assessment, not a family. */
exports.V2_ACTIVITY_FAMILIES_V2 = Object.freeze([
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
]);
/**
 * Required sessions intentionally remain a narrow seven-family policy. A
 * family being present in the 17-family catalog does not admit it to core.
 */
exports.V2_REQUIRED_SESSION_FAMILIES_V2 = Object.freeze([
    "phrase_builder",
    "listen_choose",
    "sound_contrast",
    "listen_build_dictation",
    "context_gap_grammar",
    "speed_match",
    "scripted_repeat_compare",
]);
const catalogBody = Object.freeze({
    schemaVersion: "v2-activity-family-catalog.v2",
    catalogId: "v2-activity-family-catalog",
    version: 2,
    families: exports.V2_ACTIVITY_FAMILIES_V2,
    checkpointIsActivityFamily: false,
});
exports.V2_ACTIVITY_FAMILY_CATALOG_V2 = Object.freeze({
    body: catalogBody,
    ref: Object.freeze({
        catalogId: catalogBody.catalogId,
        version: catalogBody.version,
        contentHash: (0, decision_registry_1.hashCanonicalBody)(catalogBody),
    }),
    contentHash: (0, decision_registry_1.hashCanonicalBody)(catalogBody),
});
const requiredSessionPolicyBody = Object.freeze({
    schemaVersion: "v2-required-session-family-policy.v2",
    policyId: "v2-required-session-family-policy",
    version: 2,
    requiredFamilies: exports.V2_REQUIRED_SESSION_FAMILIES_V2,
    minimumDistinctFamiliesPerSession: 3,
    maximumDistinctFamiliesPerSession: 4,
    optionalPracticeMayReplaceRequiredTask: false,
});
exports.V2_REQUIRED_SESSION_FAMILY_POLICY_V2 = Object.freeze({
    body: requiredSessionPolicyBody,
    ref: Object.freeze({
        policyId: requiredSessionPolicyBody.policyId,
        version: requiredSessionPolicyBody.version,
        contentHash: (0, decision_registry_1.hashCanonicalBody)(requiredSessionPolicyBody),
    }),
    contentHash: (0, decision_registry_1.hashCanonicalBody)(requiredSessionPolicyBody),
});
//# sourceMappingURL=activity_catalog_v2.js.map