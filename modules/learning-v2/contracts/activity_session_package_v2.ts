import {
  V2_REQUIRED_SESSION_FAMILIES_V2,
  type V2ActivityFamilyV2,
} from "./activity_catalog_v2";
import {
  canonicalJsonV1,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from '../content/course_topology_v1';

export const V2_REQUIRED_SESSION_TASK_PURPOSES_V2 = Object.freeze([
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
] as const);

export const V2_ACTIVITY_SESSION_PACKAGE_SCHEMA_V2 =
  "v2-activity-session-package.v2" as const;

export const V2_REQUIRED_SESSION_TASK_SLOT_POLICY_V2 = Object.freeze(
  V2_REQUIRED_SESSION_TASK_PURPOSES_V2.map((purpose, index) =>
    Object.freeze({
      taskOrdinal: index + 1,
      purpose,
      independent: index === 9 || index === 11,
      requiredSupport: index === 9 || index === 11 ? ("none" as const) : null,
      maxHints: index === 9 || index === 11 ? (0 as const) : (2 as const),
      requiredAnswerExposure:
        index === 9 || index === 11 ? ("forbidden" as const) : null,
      trainedPromptAllowed: index !== 9 && index !== 11,
    }),
  ),
);

export type V2RequiredSessionTaskPurposeV2 =
  (typeof V2_REQUIRED_SESSION_TASK_PURPOSES_V2)[number];
export type V2RequiredSessionFamilyV2 =
  (typeof V2_REQUIRED_SESSION_FAMILIES_V2)[number];
export type V2ActivitySessionZoneV2 = "understand" | "use" | "master";
export type V2ActivitySessionSupportV2 =
  | "model"
  | "full_text"
  | "partial_cue"
  | "visual_only"
  | "none";

export interface V2ActivityIntroQuestionRefV2 {
  readonly introArtifactFingerprint: string;
  readonly questionId: string;
  readonly coveredConceptIds: readonly string[];
}

export type V2ActivityReviewSourceV2 =
  | Readonly<{
      kind: "same_session_bootstrap";
      reviewOfTaskId: string;
      sourceSessionOrdinal: 1;
    }>
  | Readonly<{
      kind: "prior_session";
      reviewOfTaskId: string;
      sourceSessionOrdinal: number;
    }>;

export interface V2ActivitySessionTaskV2 {
  readonly taskId: string;
  readonly taskOrdinal: number;
  readonly purpose: V2RequiredSessionTaskPurposeV2;
  readonly activityId: string;
  readonly contentItemId: string;
  readonly objectiveId: string;
  readonly family: V2RequiredSessionFamilyV2;
  readonly learningFunction: string;
  readonly support: V2ActivitySessionSupportV2;
  readonly hintsAllowed: 0 | 1 | 2;
  readonly answerExposure: "allowed_after_attempt" | "forbidden";
  readonly promptId: string;
  readonly promptNovelty: "trained" | "varied" | "novel";
  readonly localEvaluatorCapsuleId: string;
  readonly introQuestionRef: V2ActivityIntroQuestionRefV2 | null;
  readonly reviewSource: V2ActivityReviewSourceV2 | null;
}

export interface V2ActivityRequiredSessionV2 {
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly zone: V2ActivitySessionZoneV2;
  readonly tasks: readonly V2ActivitySessionTaskV2[];
}

/**
 * @deprecated НЕ ИСПОЛЬЗОВАТЬ для говорильной дорожки.
 *
 * зачем: заготовка осталась от «Разговорного клуба» — разговора с ИИ-собеседником,
 * который владелец удалил намеренно (восстанавливать запрещено). Владелец
 * утверждил вместо него ДРУГУЮ фичу — говорильную дорожку: 56 сессий на урок,
 * задания на произнесение фраз урока, звёзды из общего кошелька.
 *
 * Эта структура ей не подходит по трём причинам сразу:
 *   1. максимум 2 записи на эпизод (см. проверку ниже) — нужно 56;
 *   2. walletAuthority "none" — говорильная дорожка обязана начислять звёзды;
 *   3. requiredSessionStarEligible false — звёзды должны быть те же самые.
 *
 * Менять поля здесь нельзя: они и есть смысл заготовки, её проверки на них
 * держатся. Говорильная дорожка получает СВОЮ сущность.
 * План: docs/v2/SPEAKING_TRACK_PLAN_2026-08-17.md §4.1.
 */
export interface V2ActivityOptionalClubCapstoneV2 {
  readonly capstoneId: string;
  readonly activityId: string;
  readonly family: "speaking_club_mission";
  readonly requiredForProgress: false;
  readonly canWriteMastery: false;
  readonly requiredSessionStarEligible: false;
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
}

export interface V2ActivitySessionPackageV2 {
  readonly schemaVersion: "v2-activity-session-package.v2";
  readonly packageId: string;
  readonly episodeId: string;
  readonly requiredSessionCount: 12;
  readonly requiredTasksPerSession: 12;
  readonly requiredFamilies: typeof V2_REQUIRED_SESSION_FAMILIES_V2;
  readonly sessions: readonly V2ActivityRequiredSessionV2[];
  /** @deprecated Наследие удалённого «Разговорного клуба» — см. V2ActivityOptionalClubCapstoneV2. */
  readonly optionalClubCapstones: readonly V2ActivityOptionalClubCapstoneV2[];
  readonly contentMayAward: false;
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

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
] as const;
const SESSION_KEYS = ["sessionId", "sessionOrdinal", "zone", "tasks"] as const;
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
] as const;
const INTRO_QUESTION_KEYS = [
  "coveredConceptIds",
  "introArtifactFingerprint",
  "questionId",
] as const;
const REVIEW_SOURCE_KEYS = [
  "kind",
  "reviewOfTaskId",
  "sourceSessionOrdinal",
] as const;
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
] as const;
const REQUIRED_FAMILY_SET = new Set<string>(V2_REQUIRED_SESSION_FAMILIES_V2);
const SUPPORT_SET = new Set([
  "model",
  "full_text",
  "partial_cue",
  "visual_only",
  "none",
]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const brandedPackages = new WeakSet<object>();

const fail = (message: string): never => {
  throw new Error(`invalid v2 activity session package: ${message}`);
};
const record = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    fail(`${label} must be an object`);
  return value as Record<string, unknown>;
};
const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  )
    fail(`${label} keys mismatch`);
};
const id = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !ID_PATTERN.test(value))
    fail(`${label} is invalid`);
  return value as string;
};
const literal = (value: unknown, expected: unknown, label: string): void => {
  if (value !== expected) fail(`${label} must be ${String(expected)}`);
};
const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};

const expectedZone = (ordinal: number): V2ActivitySessionZoneV2 =>
  ordinal <= 4 ? "understand" : ordinal <= 8 ? "use" : "master";

export const v2ActivitySessionIdV2 = (
  episodeId: string,
  sessionOrdinal: number,
): string => {
  if (
    !ID_PATTERN.test(episodeId) ||
    !Number.isSafeInteger(sessionOrdinal) ||
    sessionOrdinal < 1 ||
    sessionOrdinal > LEARNING_V2_LESSON_SESSION_COUNT_V1
  ) {
    fail("canonical session identity is invalid");
  }
  return `${episodeId}:session:${String(sessionOrdinal).padStart(2, "0")}`;
};

export const parseV2ActivitySessionPackageV2 = (
  rawCanonical: string,
): V2ActivitySessionPackageV2 => {
  if (
    typeof rawCanonical !== "string" ||
    rawCanonical.length > 512 * 1024 ||
    utf8ByteLengthV1(rawCanonical) > 512 * 1024
  )
    fail("raw bytes exceed limit");
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawCanonical);
  } catch {
    fail("raw JSON is malformed");
  }
  if (canonicalJsonV1(decoded) !== rawCanonical)
    fail("raw JSON is not canonical");
  const root = record(decoded, "package");
  exactKeys(root, PACKAGE_KEYS, "package");
  literal(
    root.schemaVersion,
    V2_ACTIVITY_SESSION_PACKAGE_SCHEMA_V2,
    "schemaVersion",
  );
  id(root.packageId, "packageId");
  id(root.episodeId, "episodeId");
  literal(root.requiredSessionCount, 12, "requiredSessionCount");
  literal(root.requiredTasksPerSession, 12, "requiredTasksPerSession");
  if (
    !Array.isArray(root.requiredFamilies) ||
    canonicalJsonV1(root.requiredFamilies) !==
      canonicalJsonV1(V2_REQUIRED_SESSION_FAMILIES_V2)
  )
    fail("requiredFamilies must be the exact seven-family policy");
  literal(root.contentMayAward, false, "contentMayAward");
  for (const key of [
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
    "executionAuthority",
  ] as const)
    literal(root[key], "none", key);
  literal(
    root.publicationPolicy,
    "draft_only_no_consumer",
    "publicationPolicy",
  );
  literal(root.runtimeConsumer, false, "runtimeConsumer");
  literal(root.releaseEligible, false, "releaseEligible");
  literal(root.releaseAuthority, false, "releaseAuthority");
  if (!Array.isArray(root.sessions) || root.sessions.length !== 12)
    fail("sessions must contain exactly 12 entries");
  const sessions = root.sessions as unknown[];

  const uniqueExecutionIds = new Set<string>();
  const activityIds = new Set<string>();
  const sessionIds = new Set<string>();
  const aggregateFamilies = new Set<string>();
  const tasksById = new Map<
    string,
    {
      readonly sessionOrdinal: number;
      readonly taskOrdinal: number;
      readonly objectiveId: string;
    }
  >();
  sessions.forEach((candidate, sessionIndex) => {
    const session = record(candidate, `sessions[${sessionIndex}]`);
    exactKeys(session, SESSION_KEYS, `sessions[${sessionIndex}]`);
    const sessionId = id(
      session.sessionId,
      `sessions[${sessionIndex}].sessionId`,
    );
    if (sessionIds.has(sessionId)) fail("sessionId must be package-unique");
    literal(
      sessionId,
      v2ActivitySessionIdV2(String(root.episodeId), sessionIndex + 1),
      `sessions[${sessionIndex}].sessionId`,
    );
    sessionIds.add(sessionId);
    literal(
      session.sessionOrdinal,
      sessionIndex + 1,
      `sessions[${sessionIndex}].sessionOrdinal`,
    );
    literal(
      session.zone,
      expectedZone(sessionIndex + 1),
      `sessions[${sessionIndex}].zone`,
    );
    if (!Array.isArray(session.tasks) || session.tasks.length !== 12)
      fail(`sessions[${sessionIndex}].tasks must contain exactly 12 entries`);
    const tasks = session.tasks as unknown[];
    const sessionFamilies = new Set<string>();
    const introArtifactFingerprints = new Set<string>();
    const introQuestionIds = new Set<string>();
    const taughtObjectiveIds = new Set<string>();
    tasks.forEach((candidateTask, taskIndex) => {
      const task = record(
        candidateTask,
        `sessions[${sessionIndex}].tasks[${taskIndex}]`,
      );
      exactKeys(
        task,
        TASK_KEYS,
        `sessions[${sessionIndex}].tasks[${taskIndex}]`,
      );
      literal(task.taskOrdinal, taskIndex + 1, "taskOrdinal");
      literal(
        task.purpose,
        V2_REQUIRED_SESSION_TASK_PURPOSES_V2[taskIndex],
        "purpose",
      );
      for (const key of ["contentItemId", "objectiveId"] as const) {
        id(task[key], key);
      }
      for (const key of [
        "taskId",
        "activityId",
        "promptId",
        "localEvaluatorCapsuleId",
      ] as const) {
        const value = id(task[key], key);
        if (uniqueExecutionIds.has(value))
          fail(`${key} must be package-unique`);
        uniqueExecutionIds.add(value);
        if (key === "activityId") activityIds.add(value);
      }
      if (!REQUIRED_FAMILY_SET.has(String(task.family)))
        fail("required task family is not admitted");
      sessionFamilies.add(String(task.family));
      aggregateFamilies.add(String(task.family));
      if (
        typeof task.learningFunction !== "string" ||
        task.learningFunction.length < 1 ||
        task.learningFunction.length > 240
      )
        fail("learningFunction is invalid");
      if (!SUPPORT_SET.has(String(task.support))) fail("support is invalid");
      if (![0, 1, 2].includes(task.hintsAllowed as number))
        fail("hintsAllowed is invalid");
      if (
        task.answerExposure !== "allowed_after_attempt" &&
        task.answerExposure !== "forbidden"
      )
        fail("answerExposure is invalid");
      if (!["trained", "varied", "novel"].includes(String(task.promptNovelty)))
        fail("promptNovelty is invalid");
      if (taskIndex < 3) {
        const introQuestionRef = record(
          task.introQuestionRef,
          "introQuestionRef",
        );
        exactKeys(introQuestionRef, INTRO_QUESTION_KEYS, "introQuestionRef");
        const introArtifactFingerprint =
          introQuestionRef.introArtifactFingerprint;
        if (
          typeof introArtifactFingerprint !== "string" ||
          !HASH_PATTERN.test(introArtifactFingerprint)
        )
          fail("introArtifactFingerprint is invalid");
        introArtifactFingerprints.add(introArtifactFingerprint as string);
        const questionId = id(introQuestionRef.questionId, "questionId");
        if (introQuestionIds.has(questionId))
          fail("intro question IDs must be distinct within slots 1–3");
        introQuestionIds.add(questionId);
        const rawCoveredConceptIds = introQuestionRef.coveredConceptIds;
        if (
          !Array.isArray(rawCoveredConceptIds) ||
          rawCoveredConceptIds.length < 1 ||
          rawCoveredConceptIds.length > 16
        )
          fail("coveredConceptIds is invalid");
        const coveredConceptIds = (rawCoveredConceptIds as unknown[]).map(
          (value) => id(value, "coveredConceptId"),
        );
        if (new Set(coveredConceptIds).size !== coveredConceptIds.length)
          fail("coveredConceptIds must be distinct");
      } else if (task.introQuestionRef !== null) {
        fail("introQuestionRef is allowed only in slots 1–3");
      }
      if (taskIndex === 10) {
        const reviewSource = record(task.reviewSource, "reviewSource");
        exactKeys(reviewSource, REVIEW_SOURCE_KEYS, "reviewSource");
        const reviewOfTaskId = id(
          reviewSource.reviewOfTaskId,
          "reviewOfTaskId",
        );
        if (
          !Number.isSafeInteger(reviewSource.sourceSessionOrdinal) ||
          Number(reviewSource.sourceSessionOrdinal) < 1 ||
          Number(reviewSource.sourceSessionOrdinal) > LEARNING_V2_LESSON_SESSION_COUNT_V1
        )
          fail("review sourceSessionOrdinal is invalid");
        const reviewedTask =
          tasksById.get(reviewOfTaskId) ??
          fail("review source task is missing");
        if (sessionIndex === 0) {
          literal(
            reviewSource.kind,
            "same_session_bootstrap",
            "session 1 review source kind",
          );
          literal(
            reviewSource.sourceSessionOrdinal,
            1,
            "session 1 review sourceSessionOrdinal",
          );
          if (
            reviewedTask.sessionOrdinal !== 1 ||
            reviewedTask.taskOrdinal >= taskIndex + 1
          )
            fail("session 1 bootstrap must target an earlier task");
        } else {
          literal(reviewSource.kind, "prior_session", "review source kind");
          if (
            reviewedTask.sessionOrdinal !== reviewSource.sourceSessionOrdinal ||
            reviewedTask.sessionOrdinal >= sessionIndex + 1
          )
            fail("review must target an exact earlier-session task");
        }
        if (reviewedTask.objectiveId !== task.objectiveId)
          fail("review objective must match its source task");
      } else if (task.reviewSource !== null) {
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
      if (taskIndex < 9) taughtObjectiveIds.add(String(task.objectiveId));
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
  if (aggregateFamilies.size !== V2_REQUIRED_SESSION_FAMILIES_V2.length)
    fail("the required 144-task course must cover all seven families");

  if (
    !Array.isArray(root.optionalClubCapstones) ||
    root.optionalClubCapstones.length > 2
  )
    fail("optionalClubCapstones must contain at most two entries");
  const optionalClubCapstones = root.optionalClubCapstones as unknown[];
  optionalClubCapstones.forEach((candidate, index) => {
    const club = record(candidate, `optionalClubCapstones[${index}]`);
    exactKeys(club, CLUB_KEYS, `optionalClubCapstones[${index}]`);
    const capstoneId = id(club.capstoneId, "capstoneId");
    const activityId = id(club.activityId, "activityId");
    if (
      uniqueExecutionIds.has(capstoneId) ||
      uniqueExecutionIds.has(activityId)
    ) {
      fail(
        "optional Club identifiers must remain outside the required 144 tasks",
      );
    }
    uniqueExecutionIds.add(capstoneId);
    uniqueExecutionIds.add(activityId);
    if (activityIds.has(activityId))
      fail("optional Club activityId must be unique");
    activityIds.add(activityId);
    literal(club.family, "speaking_club_mission", "club family");
    literal(club.requiredForProgress, false, "requiredForProgress");
    literal(club.canWriteMastery, false, "canWriteMastery");
    literal(
      club.requiredSessionStarEligible,
      false,
      "requiredSessionStarEligible",
    );
    for (const key of [
      "walletAuthority",
      "masteryAuthority",
      "evidenceAuthority",
      "completionAuthority",
    ] as const)
      literal(club[key], "none", key);
  });
  const parsed = deepFreeze(decoded) as V2ActivitySessionPackageV2;
  brandedPackages.add(parsed as object);
  return parsed;
};

export const isV2ActivitySessionPackageV2 = (
  value: unknown,
): value is V2ActivitySessionPackageV2 =>
  typeof value === "object" && value !== null && brandedPackages.has(value);

export const encodeV2ActivitySessionPackageV2 = (value: unknown): string => {
  const raw = canonicalJsonV1(value);
  parseV2ActivitySessionPackageV2(raw);
  return raw;
};

export const V2_ACTIVITY_SESSION_PACKAGE_AUTHORITY_V2 = Object.freeze({
  contentMayAward: false as const,
  walletAuthority: "none" as const,
  masteryAuthority: "none" as const,
  evidenceAuthority: "none" as const,
  completionAuthority: "none" as const,
  executionAuthority: "none" as const,
  publicationPolicy: "draft_only_no_consumer" as const,
  runtimeConsumer: false as const,
  releaseEligible: false as const,
  releaseAuthority: false as const,
});

/** @deprecated Наследие удалённого «Разговорного клуба» — см. V2ActivityOptionalClubCapstoneV2. */
export type V2OptionalActivityFamilyV2 = Extract<
  V2ActivityFamilyV2,
  "speaking_club_mission"
>;
