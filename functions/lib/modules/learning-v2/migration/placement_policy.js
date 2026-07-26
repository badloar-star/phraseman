"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendLegacyPlacement = exports.LEGACY_PLACEMENT_RECOMMENDATION_SCHEMA = exports.LEGACY_PLACEMENT_SNAPSHOT_SCHEMA = void 0;
exports.LEGACY_PLACEMENT_SNAPSHOT_SCHEMA = "legacy-placement-snapshot.v1";
exports.LEGACY_PLACEMENT_RECOMMENDATION_SCHEMA = "legacy-placement-recommendation.v1";
const SNAPSHOT_FIELDS = [
    "schemaVersion",
    "highestContiguousCompletedLesson",
];
const recommendationEffects = () => ({
    writesLegacyProgress: false,
    writesV2Progress: false,
    grantsV2Stars: false,
    grantsV2Checkpoint: false,
    grantsV2LearningEvidence: false,
});
const manualReviewRecommendation = () => ({
    schemaVersion: exports.LEGACY_PLACEMENT_RECOMMENDATION_SCHEMA,
    action: "manual_review_snapshot",
    recognizedLegacyBoundary: null,
    diagnosticProfile: "none",
    acknowledgesLegacyExperience: false,
    effects: recommendationEffects(),
});
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isValidCompletedLesson = (value) => value === null ||
    (Number.isInteger(value) &&
        typeof value === "number" &&
        value >= 1 &&
        value <= 32);
const validateSnapshot = (value) => {
    if (!isRecord(value)) {
        return {
            ok: false,
            issues: [
                {
                    code: "legacy_placement_snapshot_object_required",
                    path: "$",
                },
            ],
        };
    }
    const issues = [];
    for (const field of Object.keys(value).sort()) {
        if (!SNAPSHOT_FIELDS.includes(field)) {
            issues.push({
                code: "legacy_placement_snapshot_field_unknown",
                path: `$.${field}`,
            });
        }
    }
    if (value.schemaVersion !== exports.LEGACY_PLACEMENT_SNAPSHOT_SCHEMA) {
        issues.push({
            code: "legacy_placement_snapshot_schema_invalid",
            path: "$.schemaVersion",
        });
    }
    if (!isValidCompletedLesson(value.highestContiguousCompletedLesson)) {
        issues.push({
            code: "legacy_placement_snapshot_lesson_invalid",
            path: "$.highestContiguousCompletedLesson",
        });
    }
    issues.sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code));
    if (issues.length > 0)
        return { ok: false, issues };
    return {
        ok: true,
        snapshot: value,
    };
};
const recognizedBoundary = (highestContiguousCompletedLesson) => {
    if (highestContiguousCompletedLesson === null)
        return 0;
    if (highestContiguousCompletedLesson >= 32)
        return 32;
    if (highestContiguousCompletedLesson >= 28)
        return 28;
    if (highestContiguousCompletedLesson >= 18)
        return 18;
    if (highestContiguousCompletedLesson >= 8)
        return 8;
    return 0;
};
const profileForBoundary = (boundary) => {
    switch (boundary) {
        case 8:
            return "chapter_1";
        case 18:
            return "chapters_1_2_voice_transfer";
        case 28:
            return "through_chapter_3_scenario_transfer";
        case 32:
            return "full_can_do";
        default:
            return "none";
    }
};
const recommendLegacyPlacement = (input) => {
    const parsed = validateSnapshot(input);
    if (!parsed.ok) {
        return {
            ok: false,
            issues: parsed.issues,
            recommendation: manualReviewRecommendation(),
        };
    }
    const highestCompleted = parsed.snapshot.highestContiguousCompletedLesson;
    const boundary = recognizedBoundary(highestCompleted);
    return {
        ok: true,
        recommendation: {
            schemaVersion: exports.LEGACY_PLACEMENT_RECOMMENDATION_SCHEMA,
            action: boundary === 0 ? "start_episode_1" : "offer_placement_diagnostic",
            recognizedLegacyBoundary: boundary,
            diagnosticProfile: profileForBoundary(boundary),
            acknowledgesLegacyExperience: highestCompleted !== null,
            effects: recommendationEffects(),
        },
    };
};
exports.recommendLegacyPlacement = recommendLegacyPlacement;
//# sourceMappingURL=placement_policy.js.map