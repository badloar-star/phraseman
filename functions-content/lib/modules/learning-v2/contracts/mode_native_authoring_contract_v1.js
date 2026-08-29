"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_MODE_NATIVE_AUTHORING_CONTRACT_V1 = exports.LEARNING_V2_MODE_NATIVE_FAMILIES_V1 = exports.LEARNING_V2_MODE_NATIVE_AUTHORING_CONTRACT_VERSION_V1 = void 0;
/**
 * Owner contract, 2026-08-25.
 *
 * A family name is not a mode implementation. Every authored interaction must
 * carry the family-native data needed by the exact owner mockup; a generic
 * single-choice/ordered-token projection is forbidden even when `family` has
 * one of the approved names.
 */
exports.LEARNING_V2_MODE_NATIVE_AUTHORING_CONTRACT_VERSION_V1 = "learning-v2-mode-native-authoring.v1";
exports.LEARNING_V2_MODE_NATIVE_FAMILIES_V1 = [
    "phrase_builder",
    "listen_choose",
    "listen_build_dictation",
    "context_gap_grammar",
    "speed_match",
    "scripted_repeat_compare",
];
exports.LEARNING_V2_MODE_NATIVE_AUTHORING_CONTRACT_V1 = Object.freeze({
    schemaVersion: exports.LEARNING_V2_MODE_NATIVE_AUTHORING_CONTRACT_VERSION_V1,
    ownerDecisionRef: "owner-learning-v2-mode-native-and-exact-mockup-parity-2026-08-25",
    parityPolicy: "exact_owner_mockup_1_to_1",
    modes: Object.freeze([
        Object.freeze({
            family: "phrase_builder",
            mockupPath: "docs/v2/mockups/02-phrase-builder.html",
            mockupSha256: "2cbbf8b4417083614d009bc4ba98213de7c71ed473918f305edd47874f2d7ea1",
            requiredPayload: Object.freeze([
                "targetPhrase",
                "localizedMeaning",
                "orderedTokens",
                "authoredDistractorTokens",
                "slotFeedback",
            ]),
            mockupParityStatus: "PASS",
            mockupParityReceiptId: "owner-approved-en-s01-phone-parity-2026-08-26:phrase_builder",
        }),
        Object.freeze({
            family: "listen_choose",
            mockupPath: "docs/v2/mockups/03-listen-choose.html",
            mockupSha256: "0a56b80fbf02afcf28887ce38b005aa66f1f95054274853e4057724bb0c66ae7",
            requiredPayload: Object.freeze([
                "referenceAudio",
                "slowReferenceAudio",
                "localizedMeaningChoices",
                "transcriptRevealPolicy",
                "choiceFeedback",
            ]),
            mockupParityStatus: "PASS",
            mockupParityReceiptId: "owner-approved-en-s01-phone-parity-2026-08-26:listen_choose",
        }),
        Object.freeze({
            family: "listen_build_dictation",
            mockupPath: "docs/v2/mockups/05-listen-build.html",
            mockupSha256: "29f6c4a3ba7f84fdb60667f71e6153815d9d76e1856a15e54fceab49beeadce1",
            requiredPayload: Object.freeze([
                "referenceAudio",
                "slowReferenceAudio",
                "hiddenTargetPhrase",
                "orderedTokens",
                "authoredDistractorTokens",
                "slotFeedback",
            ]),
            mockupParityStatus: "PASS",
            mockupParityReceiptId: "owner-approved-en-s01-phone-parity-2026-08-26:listen_build_dictation",
        }),
        Object.freeze({
            family: "context_gap_grammar",
            mockupPath: "docs/v2/mockups/06-context-gap.html",
            mockupSha256: "e75b5c5c8472e88e680a1be50c0be87f999beb0bb3e6176e569438faf9d92daf",
            requiredPayload: Object.freeze([
                "localizedScene",
                "gappedTargetPhrase",
                "gapOptions",
                "testedDimension",
                "choiceFeedback",
            ]),
            mockupParityStatus: "PASS",
            mockupParityReceiptId: "owner-approved-en-s01-phone-parity-2026-08-26:context_gap_grammar",
        }),
        Object.freeze({
            family: "speed_match",
            mockupPath: "docs/v2/mockups/07-speed-match.html",
            mockupSha256: "93c82d1b825313e1a9088208bccb5c85cf2ab12bbabb6327efe1ce4f5ad6a07f",
            requiredPayload: Object.freeze([
                "pairGrid",
                "leftColumn",
                "rightColumn",
                "pairingKey",
                "timerPolicy",
                "finishStats",
            ]),
            mockupParityStatus: "PASS",
            mockupParityReceiptId: "owner-approved-en-s01-phone-parity-2026-08-26:speed_match",
        }),
        Object.freeze({
            family: "scripted_repeat_compare",
            mockupPath: "docs/v2/mockups/14-repeat-compare.html",
            mockupSha256: "aeecb0352dfe29901e99d81efc08400000bd3b39a2f560604d00598320609dec",
            requiredPayload: Object.freeze([
                "referenceAudio",
                "slowReferenceAudio",
                "targetPhrase",
                "recordControlPolicy",
                "modelPlayback",
                "learnerPlayback",
                "honestOutcomeStates",
            ]),
            mockupParityStatus: "PASS",
            mockupParityReceiptId: "owner-approved-en-s01-phone-parity-2026-08-26:scripted_repeat_compare",
        }),
    ]),
});
//# sourceMappingURL=mode_native_authoring_contract_v1.js.map