"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1 = exports.LEARNING_V2_COURSE_TARGET_MINUTES_V1 = exports.LEARNING_V2_COURSE_SESSION_COUNT_V1 = exports.LEARNING_V2_SESSION_INTERACTION_ABSOLUTE_MAX_V1 = exports.LEARNING_V2_SESSION_VOICE_INTERACTION_MAX_V1 = exports.LEARNING_V2_SESSION_VOICE_INTERACTION_TARGET_V1 = exports.LEARNING_V2_SESSION_VOICE_INTERACTION_MIN_V1 = exports.LEARNING_V2_SESSION_RAPID_INTERACTION_MAX_V1 = exports.LEARNING_V2_SESSION_RAPID_INTERACTION_TARGET_V1 = exports.LEARNING_V2_SESSION_RAPID_INTERACTION_MIN_V1 = exports.LEARNING_V2_SESSION_STANDARD_INTERACTION_MAX_V1 = exports.LEARNING_V2_SESSION_STANDARD_INTERACTION_TARGET_V1 = exports.LEARNING_V2_SESSION_STANDARD_INTERACTION_MIN_V1 = exports.LEARNING_V2_SESSION_MAX_MINUTES_V1 = exports.LEARNING_V2_SESSION_TARGET_MINUTES_V1 = exports.LEARNING_V2_SESSION_MIN_MINUTES_V1 = exports.LEARNING_V2_CHAPTER_SESSION_COUNT_V1 = exports.LEARNING_V2_INTRO_PAGES_PER_SESSION = exports.LEARNING_V2_LESSON_CHAPTER_COUNT_V1 = exports.LEARNING_V2_LESSON_SESSION_COUNT_V1 = exports.LEARNING_V2_COURSE_LESSON_COUNT_V1 = exports.LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1 = void 0;
exports.learningV2CourseLessonIdV1 = learningV2CourseLessonIdV1;
exports.learningV2CourseSessionIdV1 = learningV2CourseSessionIdV1;
exports.learningV2CourseSessionRoleV1 = learningV2CourseSessionRoleV1;
exports.learningV2SessionInteractionBudgetV1 = learningV2SessionInteractionBudgetV1;
exports.buildLearningV2CourseTopologyV1 = buildLearningV2CourseTopologyV1;
const decision_registry_1 = require("../policies/decision_registry");
/**
 * Owner-current Learning V2 course topology.
 *
 * This contract describes structure only. It does not create lesson content:
 * the 32 real lesson bodies remain owner-authored through the generator.
 */
exports.LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1 = "learning-v2-course-topology.v1";
exports.LEARNING_V2_COURSE_LESSON_COUNT_V1 = 32;
exports.LEARNING_V2_LESSON_SESSION_COUNT_V1 = 56;
exports.LEARNING_V2_LESSON_CHAPTER_COUNT_V1 = 7;
// зачем: интро сессии — ровно три страницы, на каждой свой вопрос (слоты 1–3).
// Раньше произведение 12 × 3 = 36 стояло в проверках готовым числом, и урок из
// 56 сессий рантайм отвергал молча. Держим множитель рядом с числом сессий,
// чтобы обе величины менялись вместе.
exports.LEARNING_V2_INTRO_PAGES_PER_SESSION = 3;
exports.LEARNING_V2_CHAPTER_SESSION_COUNT_V1 = 8;
exports.LEARNING_V2_SESSION_MIN_MINUTES_V1 = 5;
exports.LEARNING_V2_SESSION_TARGET_MINUTES_V1 = 7;
exports.LEARNING_V2_SESSION_MAX_MINUTES_V1 = 8;
exports.LEARNING_V2_SESSION_STANDARD_INTERACTION_MIN_V1 = 14;
exports.LEARNING_V2_SESSION_STANDARD_INTERACTION_TARGET_V1 = 16;
exports.LEARNING_V2_SESSION_STANDARD_INTERACTION_MAX_V1 = 18;
exports.LEARNING_V2_SESSION_RAPID_INTERACTION_MIN_V1 = 18;
exports.LEARNING_V2_SESSION_RAPID_INTERACTION_TARGET_V1 = 20;
exports.LEARNING_V2_SESSION_RAPID_INTERACTION_MAX_V1 = 22;
exports.LEARNING_V2_SESSION_VOICE_INTERACTION_MIN_V1 = 10;
exports.LEARNING_V2_SESSION_VOICE_INTERACTION_TARGET_V1 = 12;
exports.LEARNING_V2_SESSION_VOICE_INTERACTION_MAX_V1 = 14;
exports.LEARNING_V2_SESSION_INTERACTION_ABSOLUTE_MAX_V1 = 22;
exports.LEARNING_V2_COURSE_SESSION_COUNT_V1 = 1_792;
exports.LEARNING_V2_COURSE_TARGET_MINUTES_V1 = 12_544;
exports.LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1 = Object.freeze([
    8, 16, 24, 32, 40, 48,
]);
function assertOrdinal(value, max, field) {
    if (!Number.isSafeInteger(value) || value < 1 || value > max) {
        throw new Error(`learning_v2_course_topology_${field}_invalid`);
    }
}
function learningV2CourseLessonIdV1(lessonOrdinal) {
    assertOrdinal(lessonOrdinal, exports.LEARNING_V2_COURSE_LESSON_COUNT_V1, "lesson_ordinal");
    return `lesson-${String(lessonOrdinal).padStart(2, "0")}`;
}
function learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal) {
    assertOrdinal(lessonOrdinal, exports.LEARNING_V2_COURSE_LESSON_COUNT_V1, "lesson_ordinal");
    assertOrdinal(sessionOrdinal, exports.LEARNING_V2_LESSON_SESSION_COUNT_V1, "session_ordinal");
    return `${learningV2CourseLessonIdV1(lessonOrdinal)}:session:${String(sessionOrdinal).padStart(2, "0")}`;
}
function learningV2CourseSessionRoleV1(sessionOrdinal) {
    assertOrdinal(sessionOrdinal, exports.LEARNING_V2_LESSON_SESSION_COUNT_V1, "session_ordinal");
    if (sessionOrdinal === exports.LEARNING_V2_LESSON_SESSION_COUNT_V1)
        return "final_exam";
    if (exports.LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1.includes(sessionOrdinal)) {
        return "chapter_checkpoint";
    }
    if (sessionOrdinal >= 49)
        return "transfer_practice";
    return "guided_learning";
}
function buildSession(lessonOrdinal, sessionOrdinal) {
    return Object.freeze({
        sessionId: learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal),
        lessonOrdinal,
        sessionOrdinal,
        chapterOrdinal: Math.ceil(sessionOrdinal / exports.LEARNING_V2_CHAPTER_SESSION_COUNT_V1),
        positionInChapter: ((sessionOrdinal - 1) % exports.LEARNING_V2_CHAPTER_SESSION_COUNT_V1) + 1,
        role: learningV2CourseSessionRoleV1(sessionOrdinal),
        durationMinutes: Object.freeze({
            min: exports.LEARNING_V2_SESSION_MIN_MINUTES_V1,
            target: exports.LEARNING_V2_SESSION_TARGET_MINUTES_V1,
            max: exports.LEARNING_V2_SESSION_MAX_MINUTES_V1,
        }),
        interactionBudget: learningV2SessionInteractionBudgetV1(),
    });
}
function learningV2SessionInteractionBudgetV1() {
    return Object.freeze({
        countingUnit: "planned_primary_learning_interactions",
        standard: Object.freeze({
            min: exports.LEARNING_V2_SESSION_STANDARD_INTERACTION_MIN_V1,
            target: exports.LEARNING_V2_SESSION_STANDARD_INTERACTION_TARGET_V1,
            max: exports.LEARNING_V2_SESSION_STANDARD_INTERACTION_MAX_V1,
        }),
        rapid: Object.freeze({
            min: exports.LEARNING_V2_SESSION_RAPID_INTERACTION_MIN_V1,
            target: exports.LEARNING_V2_SESSION_RAPID_INTERACTION_TARGET_V1,
            max: exports.LEARNING_V2_SESSION_RAPID_INTERACTION_MAX_V1,
        }),
        voiceHeavy: Object.freeze({
            min: exports.LEARNING_V2_SESSION_VOICE_INTERACTION_MIN_V1,
            target: exports.LEARNING_V2_SESSION_VOICE_INTERACTION_TARGET_V1,
            max: exports.LEARNING_V2_SESSION_VOICE_INTERACTION_MAX_V1,
        }),
        absoluteMax: exports.LEARNING_V2_SESSION_INTERACTION_ABSOLUTE_MAX_V1,
        completionPolicy: "duration_and_objective_coverage_not_raw_count",
        remediationPolicy: "retries_and_second_error_explanation_outside_base_count",
    });
}
function buildLearningV2CourseTopologyV1() {
    const lessons = Object.freeze(Array.from({ length: exports.LEARNING_V2_COURSE_LESSON_COUNT_V1 }, (_, lessonIndex) => {
        const lessonOrdinal = lessonIndex + 1;
        return Object.freeze({
            lessonId: learningV2CourseLessonIdV1(lessonOrdinal),
            lessonOrdinal,
            chapterCount: exports.LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
            sessionCount: exports.LEARNING_V2_LESSON_SESSION_COUNT_V1,
            sessions: Object.freeze(Array.from({ length: exports.LEARNING_V2_LESSON_SESSION_COUNT_V1 }, (_, sessionIndex) => buildSession(lessonOrdinal, sessionIndex + 1))),
            contentAuthorship: "owner_only",
        });
    }));
    const body = Object.freeze({
        schemaVersion: exports.LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1,
        lessonCount: exports.LEARNING_V2_COURSE_LESSON_COUNT_V1,
        sessionsPerLesson: exports.LEARNING_V2_LESSON_SESSION_COUNT_V1,
        chaptersPerLesson: exports.LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
        sessionsPerChapter: exports.LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
        lessons,
        courseTotals: Object.freeze({
            sessionCount: exports.LEARNING_V2_COURSE_SESSION_COUNT_V1,
            targetMinutes: exports.LEARNING_V2_COURSE_TARGET_MINUTES_V1,
            targetWholeHours: 209,
            targetRemainingMinutes: 4,
        }),
        realContentAuthorship: "owner_only",
        generatorResponsibility: "structure_validation_preview_release_tooling_only",
    });
    return Object.freeze({
        ...body,
        topologyFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
}
//# sourceMappingURL=course_topology_v1.js.map