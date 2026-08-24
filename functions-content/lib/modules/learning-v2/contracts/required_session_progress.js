"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRequiredTaskSettlementCandidate = exports.createRequiredTaskSettlementCandidate = exports.createRequiredSessionCatalogFromSessionSetV2 = exports.createRequiredSessionCatalog = exports.parsePublishedRequiredSessionSet = exports.createPublishedRequiredSessionSet = exports.parseRequiredSessionTaskSlotRef = void 0;
const course_economy_1 = require("./course_economy");
const decision_registry_1 = require("../policies/decision_registry");
const session_1 = require("./session");
const CATALOG_BODY_KEYS = [
    "schemaVersion",
    "courseId",
    "studyTarget",
    "courseReleaseId",
    "sessionSetId",
    "sessionSetHash",
    "requiredSessionOrdinal",
    "sessionId",
    "tasks",
];
const CATALOG_KEYS = [...CATALOG_BODY_KEYS, "catalogFingerprint"];
const TASK_CATALOG_KEYS = [
    "taskOrdinal",
    "taskId",
    "activityId",
    "skipPolicy",
];
const TASK_BODY_KEYS = [
    "schemaVersion",
    "candidateAuthority",
    "operationId",
    "accountScopeHash",
    "accountGeneration",
    "courseId",
    "studyTarget",
    "courseReleaseId",
    "sessionSetId",
    "sessionSetHash",
    "requiredSessionOrdinal",
    "sessionId",
    "sessionRunId",
    "runKindClaim",
    "taskOrdinal",
    "taskId",
    "activityId",
    "disposition",
    "learnerAttempts",
    "hintUsed",
    "sourceAttemptRef",
];
const TASK_CANDIDATE_KEYS = [
    ...TASK_BODY_KEYS.filter((key) => key !== "schemaVersion"),
    "schemaVersion",
    "projectedStars",
    "projectedCountsAsLearnerError",
    "retryRequired",
    "candidateFingerprint",
];
const ATTEMPT_REF_KEYS = ["schemaVersion", "opId", "attemptBodyHash"];
const TASK_SLOT_REF_KEYS = [
    "schemaVersion",
    "courseId",
    "courseReleaseId",
    "sessionSetId",
    "sessionSetHash",
    "requiredSessionOrdinal",
    "sessionId",
    "sessionRunId",
    "runKindClaim",
    "taskOrdinal",
    "taskId",
    "activityId",
];
const PUBLISHED_SESSION_SET_BODY_KEYS = [
    "schemaVersion",
    "courseId",
    "studyTarget",
    "courseReleaseId",
    "seasonRevisionId",
    "episodeRevisionFingerprint",
    "episodeContentHash",
    "sessionSetId",
    "sessionSetHash",
    "sessionSet",
];
const PUBLISHED_SESSION_SET_KEYS = [
    ...PUBLISHED_SESSION_SET_BODY_KEYS,
    "publicationFingerprint",
];
const PUBLISHED_SESSION_SET_V2_BODY_KEYS = [
    ...PUBLISHED_SESSION_SET_BODY_KEYS,
    "episodeOrdinal",
];
const PUBLISHED_SESSION_SET_V2_KEYS = [
    ...PUBLISHED_SESSION_SET_V2_BODY_KEYS,
    "publicationFingerprint",
];
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const HASH = /^[a-f0-9]{64}$/;
const RESERVED_RECORD_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key));
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const assertBoundedJson = (input, errorCode) => {
    let nodes = 0;
    let stringUnits = 0;
    const ancestors = new Set();
    const visit = (value, depth) => {
        nodes += 1;
        if (nodes > 512 || depth > 12)
            throw new Error(errorCode);
        if (typeof value === "string") {
            stringUnits += value.length;
            if (stringUnits > 65_536)
                throw new Error(errorCode);
            return;
        }
        if (typeof value !== "object" || value === null)
            return;
        if (ancestors.has(value))
            throw new Error(errorCode);
        ancestors.add(value);
        if (Array.isArray(value)) {
            if (value.length > 64)
                throw new Error(errorCode);
            const ownKeys = Reflect.ownKeys(value);
            if (ownKeys.some((key) => typeof key !== "string" ||
                (key !== "length" && !/^(?:0|[1-9][0-9]*)$/.test(key))))
                throw new Error(errorCode);
            for (let index = 0; index < value.length; index += 1) {
                const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
                if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
                    throw new Error(errorCode);
                }
                visit(descriptor.value, depth + 1);
            }
        }
        else {
            const prototype = Object.getPrototypeOf(value);
            if (prototype !== Object.prototype && prototype !== null)
                throw new Error(errorCode);
            const descriptors = Object.getOwnPropertyDescriptors(value);
            const keys = Object.keys(descriptors);
            if (keys.length > 64)
                throw new Error(errorCode);
            for (const key of keys) {
                stringUnits += key.length;
                if (stringUnits > 65_536)
                    throw new Error(errorCode);
                const descriptor = descriptors[key];
                if (!("value" in descriptor) || !descriptor.enumerable)
                    throw new Error(errorCode);
                visit(descriptor.value, depth + 1);
            }
        }
        ancestors.delete(value);
    };
    visit(input, 0);
};
const detachedCanonical = (input, errorCode) => {
    assertBoundedJson(input, errorCode);
    try {
        return JSON.parse((0, decision_registry_1.canonicalJsonV1)(input));
    }
    catch {
        throw new Error(errorCode);
    }
};
const validId = (value) => typeof value === "string" &&
    SAFE_ID.test(value) &&
    !RESERVED_RECORD_KEYS.has(value);
const validOrdinal = (value, maximum) => Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= maximum;
const isAttemptRef = (value) => isRecord(value) &&
    exactKeys(value, ATTEMPT_REF_KEYS) &&
    value.schemaVersion === "v2-attempt-ref.v1" &&
    validId(value.opId) &&
    typeof value.attemptBodyHash === "string" &&
    HASH.test(value.attemptBodyHash);
const parseRequiredSessionTaskSlotRef = (input) => {
    const value = detachedCanonical(input, "required_session_task_slot_ref_invalid");
    if (!isRecord(value) ||
        !exactKeys(value, TASK_SLOT_REF_KEYS) ||
        value.schemaVersion !== "learning-v2-required-session-task-slot-ref.v1" ||
        !validId(value.courseId) ||
        !validId(value.courseReleaseId) ||
        !validId(value.sessionSetId) ||
        typeof value.sessionSetHash !== "string" ||
        !HASH.test(value.sessionSetHash) ||
        !validOrdinal(value.requiredSessionOrdinal, 384) ||
        !validId(value.sessionId) ||
        !validId(value.sessionRunId) ||
        (value.runKindClaim !== "initial" && value.runKindClaim !== "repeat") ||
        !validOrdinal(value.taskOrdinal, 12) ||
        !validId(value.taskId) ||
        !validId(value.activityId))
        throw new Error("required_session_task_slot_ref_invalid");
    return deepFreeze(value);
};
exports.parseRequiredSessionTaskSlotRef = parseRequiredSessionTaskSlotRef;
const createPublishedRequiredSessionSet = (input) => {
    if (!isRecord(input) ||
        (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null)) {
        throw new Error("published_required_session_set_invalid");
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const ownKeys = Reflect.ownKeys(descriptors);
    const schemaDescriptor = descriptors.schemaVersion;
    if (!schemaDescriptor || !("value" in schemaDescriptor) ||
        !schemaDescriptor.enumerable ||
        (schemaDescriptor.value !== "learning-v2-published-required-session-set.v1" &&
            schemaDescriptor.value !== "learning-v2-published-required-session-set.v2")) {
        throw new Error("published_required_session_set_invalid");
    }
    const isV2 = schemaDescriptor.value === "learning-v2-published-required-session-set.v2";
    const hasFingerprint = Object.prototype.hasOwnProperty.call(descriptors, "publicationFingerprint");
    const expectedKeys = hasFingerprint
        ? (isV2 ? PUBLISHED_SESSION_SET_V2_KEYS : PUBLISHED_SESSION_SET_KEYS)
        : (isV2 ? PUBLISHED_SESSION_SET_V2_BODY_KEYS : PUBLISHED_SESSION_SET_BODY_KEYS);
    if (ownKeys.length !== expectedKeys.length ||
        ownKeys.some((key) => typeof key !== "string" || !expectedKeys.includes(key)) ||
        expectedKeys.some((key) => {
            const descriptor = descriptors[key];
            return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
        }))
        throw new Error("published_required_session_set_invalid");
    const value = Object.create(null);
    for (const key of expectedKeys)
        value[key] = descriptors[key].value;
    if (!(hasFingerprint
        ? exactKeys(value, isV2 ? PUBLISHED_SESSION_SET_V2_KEYS : PUBLISHED_SESSION_SET_KEYS)
        : exactKeys(value, isV2 ? PUBLISHED_SESSION_SET_V2_BODY_KEYS : PUBLISHED_SESSION_SET_BODY_KEYS)) ||
        !validId(value.courseId) ||
        !validId(value.studyTarget) ||
        !validId(value.courseReleaseId) ||
        !validId(value.seasonRevisionId) ||
        typeof value.episodeRevisionFingerprint !== "string" ||
        !HASH.test(value.episodeRevisionFingerprint) ||
        typeof value.episodeContentHash !== "string" ||
        !HASH.test(value.episodeContentHash) ||
        !validId(value.sessionSetId) ||
        typeof value.sessionSetHash !== "string" ||
        !HASH.test(value.sessionSetHash) ||
        (isV2 && !validOrdinal(value.episodeOrdinal, 32)))
        throw new Error("published_required_session_set_invalid");
    const validation = (0, session_1.validateV2SessionSet)(value.sessionSet);
    if (!validation.ok ||
        validation.value.schemaVersion !== "v2-session-set.v2" ||
        (0, decision_registry_1.hashCanonicalBody)(validation.value) !== value.sessionSetHash)
        throw new Error("published_required_session_set_invalid");
    const commonBody = {
        courseId: value.courseId,
        studyTarget: value.studyTarget,
        courseReleaseId: value.courseReleaseId,
        seasonRevisionId: value.seasonRevisionId,
        episodeRevisionFingerprint: value.episodeRevisionFingerprint,
        episodeContentHash: value.episodeContentHash,
        sessionSetId: value.sessionSetId,
        sessionSetHash: value.sessionSetHash,
        sessionSet: validation.value,
    };
    const body = isV2
        ? {
            schemaVersion: "learning-v2-published-required-session-set.v2",
            ...commonBody,
            episodeOrdinal: Number(value.episodeOrdinal),
        }
        : {
            schemaVersion: "learning-v2-published-required-session-set.v1",
            ...commonBody,
        };
    const publicationFingerprint = (0, decision_registry_1.hashCanonicalBody)(body);
    if (hasFingerprint && value.publicationFingerprint !== publicationFingerprint) {
        throw new Error("published_required_session_set_invalid");
    }
    return deepFreeze({ ...body, publicationFingerprint });
};
exports.createPublishedRequiredSessionSet = createPublishedRequiredSessionSet;
const parsePublishedRequiredSessionSet = (input) => (0, exports.createPublishedRequiredSessionSet)(input);
exports.parsePublishedRequiredSessionSet = parsePublishedRequiredSessionSet;
const catalogBodyForHash = (catalog) => catalog;
const createRequiredSessionCatalog = (input) => {
    const value = detachedCanonical(input, "required_session_catalog_invalid");
    if (!isRecord(value))
        throw new Error("required_session_catalog_invalid");
    const hasFingerprint = Object.prototype.hasOwnProperty.call(value, "catalogFingerprint");
    if (!(hasFingerprint ? exactKeys(value, CATALOG_KEYS) : exactKeys(value, CATALOG_BODY_KEYS)) ||
        value.schemaVersion !== "learning-v2-required-session-catalog.v1" ||
        !validId(value.courseId) ||
        !validId(value.studyTarget) ||
        !validId(value.courseReleaseId) ||
        !validId(value.sessionSetId) ||
        typeof value.sessionSetHash !== "string" ||
        !HASH.test(value.sessionSetHash) ||
        !validOrdinal(value.requiredSessionOrdinal, 384) ||
        !validId(value.sessionId) ||
        !Array.isArray(value.tasks) ||
        value.tasks.length !== 12)
        throw new Error("required_session_catalog_invalid");
    const tasks = value.tasks.map((entry) => {
        if (!isRecord(entry) ||
            !exactKeys(entry, TASK_CATALOG_KEYS) ||
            !validOrdinal(entry.taskOrdinal, 12) ||
            !validId(entry.taskId) ||
            !validId(entry.activityId) ||
            (entry.skipPolicy !== "allowed" && entry.skipPolicy !== "forbidden"))
            throw new Error("required_session_catalog_invalid");
        return {
            taskOrdinal: Number(entry.taskOrdinal),
            taskId: entry.taskId,
            activityId: entry.activityId,
            skipPolicy: entry.skipPolicy,
        };
    }).sort((left, right) => left.taskOrdinal - right.taskOrdinal);
    if (tasks.some((task, index) => task.taskOrdinal !== index + 1) ||
        new Set(tasks.map((task) => task.taskId)).size !== 12 ||
        new Set(tasks.map((task) => task.activityId)).size !== 12)
        throw new Error("required_session_catalog_invalid");
    const body = catalogBodyForHash({
        schemaVersion: "learning-v2-required-session-catalog.v1",
        courseId: value.courseId,
        studyTarget: value.studyTarget,
        courseReleaseId: value.courseReleaseId,
        sessionSetId: value.sessionSetId,
        sessionSetHash: value.sessionSetHash,
        requiredSessionOrdinal: Number(value.requiredSessionOrdinal),
        sessionId: value.sessionId,
        tasks,
    });
    const catalogFingerprint = (0, decision_registry_1.hashCanonicalBody)(body);
    if (hasFingerprint && value.catalogFingerprint !== catalogFingerprint) {
        throw new Error("required_session_catalog_invalid");
    }
    return deepFreeze({ ...body, catalogFingerprint });
};
exports.createRequiredSessionCatalog = createRequiredSessionCatalog;
/**
 * Derives the twelve authoritative task coordinates from canonical
 * session-set.v2 bytes. No activity id or task id is accepted separately.
 */
const createRequiredSessionCatalogFromSessionSetV2 = (input) => {
    const sourceKeys = [
        "courseId",
        "studyTarget",
        "courseReleaseId",
        "sessionSetId",
        "sessionSetHash",
        "requiredSessionOrdinal",
        "sessionSet",
    ];
    if (!isRecord(input) ||
        (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null)) {
        throw new Error("required_session_catalog_source_invalid");
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const own = Reflect.ownKeys(descriptors);
    if (own.length !== sourceKeys.length || own.some((key) => typeof key !== "string" || !sourceKeys.includes(key)) ||
        sourceKeys.some((key) => {
            const descriptor = descriptors[key];
            return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
        })) {
        throw new Error("required_session_catalog_source_invalid");
    }
    const value = Object.create(null);
    for (const key of sourceKeys)
        value[key] = descriptors[key].value;
    if (!isRecord(value) ||
        !exactKeys(value, sourceKeys) ||
        !validId(value.courseId) ||
        !validId(value.studyTarget) ||
        !validId(value.courseReleaseId) ||
        !validId(value.sessionSetId) ||
        typeof value.sessionSetHash !== "string" ||
        !HASH.test(value.sessionSetHash) ||
        !validOrdinal(value.requiredSessionOrdinal, 384))
        throw new Error("required_session_catalog_source_invalid");
    const validation = (0, session_1.validateV2SessionSet)(value.sessionSet);
    if (!validation.ok || validation.value.schemaVersion !== "v2-session-set.v2") {
        throw new Error("required_session_catalog_source_invalid");
    }
    const sessionSet = validation.value;
    if ((0, decision_registry_1.hashCanonicalBody)(sessionSet) !== value.sessionSetHash) {
        throw new Error("required_session_catalog_source_invalid");
    }
    const session = sessionSet.sessions[Number(value.requiredSessionOrdinal) - 1];
    if (!session || session.ordinal !== value.requiredSessionOrdinal) {
        throw new Error("required_session_catalog_source_invalid");
    }
    return (0, exports.createRequiredSessionCatalog)({
        schemaVersion: "learning-v2-required-session-catalog.v1",
        courseId: value.courseId,
        studyTarget: value.studyTarget,
        courseReleaseId: value.courseReleaseId,
        sessionSetId: value.sessionSetId,
        sessionSetHash: value.sessionSetHash,
        requiredSessionOrdinal: value.requiredSessionOrdinal,
        sessionId: session.sessionId,
        tasks: session.cards.map((card, index) => ({
            taskOrdinal: index + 1,
            taskId: card.cardId,
            activityId: card.activityId,
            skipPolicy: "allowed",
        })),
    });
};
exports.createRequiredSessionCatalogFromSessionSetV2 = createRequiredSessionCatalogFromSessionSetV2;
const parseCandidateBody = (input) => {
    const value = detachedCanonical(input, "required_task_candidate_invalid");
    if (!isRecord(value) ||
        !exactKeys(value, TASK_BODY_KEYS) ||
        value.schemaVersion !== "learning-v2-required-task-settlement-candidate-body.v1" ||
        value.candidateAuthority !== "untrusted_local" ||
        !validId(value.operationId) ||
        typeof value.accountScopeHash !== "string" ||
        !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
        !Number.isSafeInteger(value.accountGeneration) ||
        Number(value.accountGeneration) < 0 ||
        !validId(value.courseId) ||
        !validId(value.studyTarget) ||
        !validId(value.courseReleaseId) ||
        !validId(value.sessionSetId) ||
        typeof value.sessionSetHash !== "string" ||
        !HASH.test(value.sessionSetHash) ||
        !validOrdinal(value.requiredSessionOrdinal, 384) ||
        !validId(value.sessionId) ||
        !validId(value.sessionRunId) ||
        (value.runKindClaim !== "initial" && value.runKindClaim !== "repeat") ||
        !validOrdinal(value.taskOrdinal, 12) ||
        !validId(value.taskId) ||
        !validId(value.activityId) ||
        (value.disposition !== "completed" &&
            value.disposition !== "skipped" &&
            value.disposition !== "technical_invalid") ||
        !Number.isSafeInteger(value.learnerAttempts) ||
        Number(value.learnerAttempts) < 0 ||
        typeof value.hintUsed !== "boolean" ||
        (value.sourceAttemptRef !== null && !isAttemptRef(value.sourceAttemptRef)) ||
        (value.disposition === "completed" &&
            (Number(value.learnerAttempts) < 1 || !isAttemptRef(value.sourceAttemptRef))) ||
        (value.disposition === "skipped" &&
            (Number(value.learnerAttempts) > 0 || value.hintUsed) &&
            !isAttemptRef(value.sourceAttemptRef)))
        throw new Error("required_task_candidate_invalid");
    return value;
};
const createRequiredTaskSettlementCandidate = (input) => {
    const body = parseCandidateBody(input);
    const projection = (0, course_economy_1.projectRequiredTaskStars)({
        disposition: body.disposition,
        learnerAttempts: body.learnerAttempts,
        hintUsed: body.hintUsed,
    });
    const { schemaVersion: _bodySchema, ...identity } = body;
    const candidateWithoutFingerprint = {
        schemaVersion: "learning-v2-required-task-settlement-candidate.v1",
        ...identity,
        projectedStars: projection.stars,
        projectedCountsAsLearnerError: projection.countsAsLearnerError,
        retryRequired: projection.retryRequired,
    };
    return deepFreeze({
        ...candidateWithoutFingerprint,
        candidateFingerprint: (0, decision_registry_1.hashCanonicalBody)(candidateWithoutFingerprint),
    });
};
exports.createRequiredTaskSettlementCandidate = createRequiredTaskSettlementCandidate;
const parseRequiredTaskSettlementCandidate = (input) => {
    const value = detachedCanonical(input, "required_task_candidate_invalid");
    if (!isRecord(value) ||
        !exactKeys(value, TASK_CANDIDATE_KEYS) ||
        value.schemaVersion !== "learning-v2-required-task-settlement-candidate.v1" ||
        typeof value.candidateFingerprint !== "string" ||
        !HASH.test(value.candidateFingerprint))
        throw new Error("required_task_candidate_invalid");
    const { schemaVersion: _candidateSchema, projectedStars, projectedCountsAsLearnerError, retryRequired, candidateFingerprint, ...identity } = value;
    const rebuilt = (0, exports.createRequiredTaskSettlementCandidate)({
        schemaVersion: "learning-v2-required-task-settlement-candidate-body.v1",
        ...identity,
    });
    if (projectedStars !== rebuilt.projectedStars ||
        projectedCountsAsLearnerError !== rebuilt.projectedCountsAsLearnerError ||
        retryRequired !== rebuilt.retryRequired ||
        candidateFingerprint !== rebuilt.candidateFingerprint)
        throw new Error("required_task_candidate_invalid");
    return rebuilt;
};
exports.parseRequiredTaskSettlementCandidate = parseRequiredTaskSettlementCandidate;
//# sourceMappingURL=required_session_progress.js.map