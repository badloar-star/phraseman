"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ACTIVITY_SESSION_PACKAGE_AUTHORITY_V2 = exports.encodeV2ActivitySessionPackageV2 = exports.isV2ActivitySessionPackageV2 = exports.parseV2ActivitySessionPackageV2 = exports.v2ActivitySessionIdV2 = exports.V2_REQUIRED_SESSION_TASK_SLOT_POLICY_V2 = exports.V2_ACTIVITY_SESSION_PACKAGE_SCHEMA_V2 = exports.V2_REQUIRED_SESSION_TASK_PURPOSES_V2 = void 0;
const activity_catalog_v2_1 = require("./activity_catalog_v2");
const decision_registry_1 = require("../policies/decision_registry");
exports.V2_REQUIRED_SESSION_TASK_PURPOSES_V2 = Object.freeze([
    "intro_comprehension_check",
    "intro_comprehension_check",
    "intro_comprehension_check",
    "supported_practice",
    "supported_practice",
    "guided_practice",
    "guided_practice",
    "retrieval_practice",
    "near_transfer",
    "independent_check",
    "interleaved_review",
    "independent_check",
]);
exports.V2_ACTIVITY_SESSION_PACKAGE_SCHEMA_V2 = "v2-activity-session-package.v2";
exports.V2_REQUIRED_SESSION_TASK_SLOT_POLICY_V2 = Object.freeze(exports.V2_REQUIRED_SESSION_TASK_PURPOSES_V2.map((purpose, index) => Object.freeze({
    taskOrdinal: index + 1,
    purpose,
    independent: index === 9 || index === 11,
    requiredSupport: index === 9 || index === 11 ? "none" : null,
    maxHints: index === 9 || index === 11 ? 0 : 2,
    requiredAnswerExposure: index === 9 || index === 11 ? "forbidden" : null,
    trainedPromptAllowed: index !== 9 && index !== 11,
})));
const PACKAGE_KEYS = [
    "schemaVersion",
    "packageId",
    "episodeId",
    "requiredSessionCount",
    "requiredTasksPerSession",
    "requiredFamilies",
    "sessions",
    "optionalClubCapstones",
    "contentMayAward",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
    "executionAuthority",
    "publicationPolicy",
    "runtimeConsumer",
    "releaseEligible",
    "releaseAuthority",
];
const SESSION_KEYS = ["sessionId", "sessionOrdinal", "zone", "tasks"];
const TASK_KEYS = [
    "taskId",
    "taskOrdinal",
    "purpose",
    "activityId",
    "contentItemId",
    "objectiveId",
    "family",
    "learningFunction",
    "support",
    "hintsAllowed",
    "answerExposure",
    "promptId",
    "promptNovelty",
    "localEvaluatorCapsuleId",
    "introQuestionRef",
    "reviewSource",
];
const INTRO_QUESTION_KEYS = [
    "coveredConceptIds",
    "introArtifactFingerprint",
    "questionId",
];
const REVIEW_SOURCE_KEYS = [
    "kind",
    "reviewOfTaskId",
    "sourceSessionOrdinal",
];
const CLUB_KEYS = [
    "capstoneId",
    "activityId",
    "family",
    "requiredForProgress",
    "canWriteMastery",
    "requiredSessionStarEligible",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
];
const REQUIRED_FAMILY_SET = new Set(activity_catalog_v2_1.V2_REQUIRED_SESSION_FAMILIES_V2);
const SUPPORT_SET = new Set([
    "model",
    "full_text",
    "partial_cue",
    "visual_only",
    "none",
]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const brandedPackages = new WeakSet();
const fail = (message) => {
    throw new Error(`invalid v2 activity session package: ${message}`);
};
const record = (value, label) => {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        fail(`${label} must be an object`);
    return value;
};
const exactKeys = (value, keys, label) => {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    if (actual.length !== expected.length ||
        actual.some((key, index) => key !== expected[index]))
        fail(`${label} keys mismatch`);
};
const id = (value, label) => {
    if (typeof value !== "string" || !ID_PATTERN.test(value))
        fail(`${label} is invalid`);
    return value;
};
const literal = (value, expected, label) => {
    if (value !== expected)
        fail(`${label} must be ${String(expected)}`);
};
const deepFreeze = (value) => {
    if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
    }
    return value;
};
const expectedZone = (ordinal) => ordinal <= 4 ? "understand" : ordinal <= 8 ? "use" : "master";
const v2ActivitySessionIdV2 = (episodeId, sessionOrdinal) => {
    if (!ID_PATTERN.test(episodeId) ||
        !Number.isSafeInteger(sessionOrdinal) ||
        sessionOrdinal < 1 ||
        sessionOrdinal > 12) {
        fail("canonical session identity is invalid");
    }
    return `${episodeId}:session:${String(sessionOrdinal).padStart(2, "0")}`;
};
exports.v2ActivitySessionIdV2 = v2ActivitySessionIdV2;
const parseV2ActivitySessionPackageV2 = (rawCanonical) => {
    if (typeof rawCanonical !== "string" ||
        rawCanonical.length > 512 * 1024 ||
        (0, decision_registry_1.utf8ByteLengthV1)(rawCanonical) > 512 * 1024)
        fail("raw bytes exceed limit");
    let decoded;
    try {
        decoded = JSON.parse(rawCanonical);
    }
    catch {
        fail("raw JSON is malformed");
    }
    if ((0, decision_registry_1.canonicalJsonV1)(decoded) !== rawCanonical)
        fail("raw JSON is not canonical");
    const root = record(decoded, "package");
    exactKeys(root, PACKAGE_KEYS, "package");
    literal(root.schemaVersion, exports.V2_ACTIVITY_SESSION_PACKAGE_SCHEMA_V2, "schemaVersion");
    id(root.packageId, "packageId");
    id(root.episodeId, "episodeId");
    literal(root.requiredSessionCount, 12, "requiredSessionCount");
    literal(root.requiredTasksPerSession, 12, "requiredTasksPerSession");
    if (!Array.isArray(root.requiredFamilies) ||
        (0, decision_registry_1.canonicalJsonV1)(root.requiredFamilies) !==
            (0, decision_registry_1.canonicalJsonV1)(activity_catalog_v2_1.V2_REQUIRED_SESSION_FAMILIES_V2))
        fail("requiredFamilies must be the exact seven-family policy");
    literal(root.contentMayAward, false, "contentMayAward");
    for (const key of [
        "walletAuthority",
        "masteryAuthority",
        "evidenceAuthority",
        "completionAuthority",
        "executionAuthority",
    ])
        literal(root[key], "none", key);
    literal(root.publicationPolicy, "draft_only_no_consumer", "publicationPolicy");
    literal(root.runtimeConsumer, false, "runtimeConsumer");
    literal(root.releaseEligible, false, "releaseEligible");
    literal(root.releaseAuthority, false, "releaseAuthority");
    if (!Array.isArray(root.sessions) || root.sessions.length !== 12)
        fail("sessions must contain exactly 12 entries");
    const sessions = root.sessions;
    const uniqueExecutionIds = new Set();
    const activityIds = new Set();
    const sessionIds = new Set();
    const aggregateFamilies = new Set();
    const tasksById = new Map();
    sessions.forEach((candidate, sessionIndex) => {
        const session = record(candidate, `sessions[${sessionIndex}]`);
        exactKeys(session, SESSION_KEYS, `sessions[${sessionIndex}]`);
        const sessionId = id(session.sessionId, `sessions[${sessionIndex}].sessionId`);
        if (sessionIds.has(sessionId))
            fail("sessionId must be package-unique");
        literal(sessionId, (0, exports.v2ActivitySessionIdV2)(String(root.episodeId), sessionIndex + 1), `sessions[${sessionIndex}].sessionId`);
        sessionIds.add(sessionId);
        literal(session.sessionOrdinal, sessionIndex + 1, `sessions[${sessionIndex}].sessionOrdinal`);
        literal(session.zone, expectedZone(sessionIndex + 1), `sessions[${sessionIndex}].zone`);
        if (!Array.isArray(session.tasks) || session.tasks.length !== 12)
            fail(`sessions[${sessionIndex}].tasks must contain exactly 12 entries`);
        const tasks = session.tasks;
        const sessionFamilies = new Set();
        const introArtifactFingerprints = new Set();
        const introQuestionIds = new Set();
        const taughtObjectiveIds = new Set();
        tasks.forEach((candidateTask, taskIndex) => {
            const task = record(candidateTask, `sessions[${sessionIndex}].tasks[${taskIndex}]`);
            exactKeys(task, TASK_KEYS, `sessions[${sessionIndex}].tasks[${taskIndex}]`);
            literal(task.taskOrdinal, taskIndex + 1, "taskOrdinal");
            literal(task.purpose, exports.V2_REQUIRED_SESSION_TASK_PURPOSES_V2[taskIndex], "purpose");
            for (const key of ["contentItemId", "objectiveId"]) {
                id(task[key], key);
            }
            for (const key of [
                "taskId",
                "activityId",
                "promptId",
                "localEvaluatorCapsuleId",
            ]) {
                const value = id(task[key], key);
                if (uniqueExecutionIds.has(value))
                    fail(`${key} must be package-unique`);
                uniqueExecutionIds.add(value);
                if (key === "activityId")
                    activityIds.add(value);
            }
            if (!REQUIRED_FAMILY_SET.has(String(task.family)))
                fail("required task family is not admitted");
            sessionFamilies.add(String(task.family));
            aggregateFamilies.add(String(task.family));
            if (typeof task.learningFunction !== "string" ||
                task.learningFunction.length < 1 ||
                task.learningFunction.length > 240)
                fail("learningFunction is invalid");
            if (!SUPPORT_SET.has(String(task.support)))
                fail("support is invalid");
            if (![0, 1, 2].includes(task.hintsAllowed))
                fail("hintsAllowed is invalid");
            if (task.answerExposure !== "allowed_after_attempt" &&
                task.answerExposure !== "forbidden")
                fail("answerExposure is invalid");
            if (!["trained", "varied", "novel"].includes(String(task.promptNovelty)))
                fail("promptNovelty is invalid");
            if (taskIndex < 3) {
                const introQuestionRef = record(task.introQuestionRef, "introQuestionRef");
                exactKeys(introQuestionRef, INTRO_QUESTION_KEYS, "introQuestionRef");
                const introArtifactFingerprint = introQuestionRef.introArtifactFingerprint;
                if (typeof introArtifactFingerprint !== "string" ||
                    !HASH_PATTERN.test(introArtifactFingerprint))
                    fail("introArtifactFingerprint is invalid");
                introArtifactFingerprints.add(introArtifactFingerprint);
                const questionId = id(introQuestionRef.questionId, "questionId");
                if (introQuestionIds.has(questionId))
                    fail("intro question IDs must be distinct within slots 1–3");
                introQuestionIds.add(questionId);
                const rawCoveredConceptIds = introQuestionRef.coveredConceptIds;
                if (!Array.isArray(rawCoveredConceptIds) ||
                    rawCoveredConceptIds.length < 1 ||
                    rawCoveredConceptIds.length > 16)
                    fail("coveredConceptIds is invalid");
                const coveredConceptIds = rawCoveredConceptIds.map((value) => id(value, "coveredConceptId"));
                if (new Set(coveredConceptIds).size !== coveredConceptIds.length)
                    fail("coveredConceptIds must be distinct");
            }
            else if (task.introQuestionRef !== null) {
                fail("introQuestionRef is allowed only in slots 1–3");
            }
            if (taskIndex === 10) {
                const reviewSource = record(task.reviewSource, "reviewSource");
                exactKeys(reviewSource, REVIEW_SOURCE_KEYS, "reviewSource");
                const reviewOfTaskId = id(reviewSource.reviewOfTaskId, "reviewOfTaskId");
                if (!Number.isSafeInteger(reviewSource.sourceSessionOrdinal) ||
                    Number(reviewSource.sourceSessionOrdinal) < 1 ||
                    Number(reviewSource.sourceSessionOrdinal) > 12)
                    fail("review sourceSessionOrdinal is invalid");
                const reviewedTask = tasksById.get(reviewOfTaskId) ??
                    fail("review source task is missing");
                if (sessionIndex === 0) {
                    literal(reviewSource.kind, "same_session_bootstrap", "session 1 review source kind");
                    literal(reviewSource.sourceSessionOrdinal, 1, "session 1 review sourceSessionOrdinal");
                    if (reviewedTask.sessionOrdinal !== 1 ||
                        reviewedTask.taskOrdinal >= taskIndex + 1)
                        fail("session 1 bootstrap must target an earlier task");
                }
                else {
                    literal(reviewSource.kind, "prior_session", "review source kind");
                    if (reviewedTask.sessionOrdinal !== reviewSource.sourceSessionOrdinal ||
                        reviewedTask.sessionOrdinal >= sessionIndex + 1)
                        fail("review must target an exact earlier-session task");
                }
                if (reviewedTask.objectiveId !== task.objectiveId)
                    fail("review objective must match its source task");
            }
            else if (task.reviewSource !== null) {
                fail("reviewSource is allowed only in slot 11");
            }
            if (taskIndex === 9 || taskIndex === 11) {
                literal(task.support, "none", "independent support");
                literal(task.hintsAllowed, 0, "independent hintsAllowed");
                literal(task.answerExposure, "forbidden", "independent answerExposure");
                if (task.promptNovelty === "trained")
                    fail("independent checks must be varied or novel");
                if (task.family === "scripted_repeat_compare")
                    fail("scripted repeat cannot be an independent check");
                if (!taughtObjectiveIds.has(String(task.objectiveId)))
                    fail("independent checks must bind a previously taught objective");
            }
            if (taskIndex < 9)
                taughtObjectiveIds.add(String(task.objectiveId));
            tasksById.set(String(task.taskId), {
                sessionOrdinal: sessionIndex + 1,
                taskOrdinal: taskIndex + 1,
                objectiveId: String(task.objectiveId),
            });
        });
        if (introArtifactFingerprints.size !== 1 || introQuestionIds.size !== 3)
            fail("slots 1–3 must reference one intro artifact and three questions");
        if (sessionFamilies.size < 3 || sessionFamilies.size > 4)
            fail("each required session must use 3–4 distinct families");
    });
    if (aggregateFamilies.size !== activity_catalog_v2_1.V2_REQUIRED_SESSION_FAMILIES_V2.length)
        fail("the required 144-task course must cover all seven families");
    if (!Array.isArray(root.optionalClubCapstones) ||
        root.optionalClubCapstones.length > 2)
        fail("optionalClubCapstones must contain at most two entries");
    const optionalClubCapstones = root.optionalClubCapstones;
    optionalClubCapstones.forEach((candidate, index) => {
        const club = record(candidate, `optionalClubCapstones[${index}]`);
        exactKeys(club, CLUB_KEYS, `optionalClubCapstones[${index}]`);
        const capstoneId = id(club.capstoneId, "capstoneId");
        const activityId = id(club.activityId, "activityId");
        if (uniqueExecutionIds.has(capstoneId) ||
            uniqueExecutionIds.has(activityId)) {
            fail("optional Club identifiers must remain outside the required 144 tasks");
        }
        uniqueExecutionIds.add(capstoneId);
        uniqueExecutionIds.add(activityId);
        if (activityIds.has(activityId))
            fail("optional Club activityId must be unique");
        activityIds.add(activityId);
        literal(club.family, "speaking_club_mission", "club family");
        literal(club.requiredForProgress, false, "requiredForProgress");
        literal(club.canWriteMastery, false, "canWriteMastery");
        literal(club.requiredSessionStarEligible, false, "requiredSessionStarEligible");
        for (const key of [
            "walletAuthority",
            "masteryAuthority",
            "evidenceAuthority",
            "completionAuthority",
        ])
            literal(club[key], "none", key);
    });
    const parsed = deepFreeze(decoded);
    brandedPackages.add(parsed);
    return parsed;
};
exports.parseV2ActivitySessionPackageV2 = parseV2ActivitySessionPackageV2;
const isV2ActivitySessionPackageV2 = (value) => typeof value === "object" && value !== null && brandedPackages.has(value);
exports.isV2ActivitySessionPackageV2 = isV2ActivitySessionPackageV2;
const encodeV2ActivitySessionPackageV2 = (value) => {
    const raw = (0, decision_registry_1.canonicalJsonV1)(value);
    (0, exports.parseV2ActivitySessionPackageV2)(raw);
    return raw;
};
exports.encodeV2ActivitySessionPackageV2 = encodeV2ActivitySessionPackageV2;
exports.V2_ACTIVITY_SESSION_PACKAGE_AUTHORITY_V2 = Object.freeze({
    contentMayAward: false,
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none",
    executionAuthority: "none",
    publicationPolicy: "draft_only_no_consumer",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
});
//# sourceMappingURL=activity_session_package_v2.js.map