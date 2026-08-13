import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { parseV2ExactLanguageTagV1 } from "../contracts/language_tag_v1";

export const LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_SCHEMA_V1 =
  "learning-v2-activity-session-intro-projection.v1" as const;
export const LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_MAX_BYTES_V1 =
  64 * 1024;

export interface LearningV2ActivitySessionIntroPageInputV1 {
  readonly pageOrdinal: 1 | 2 | 3;
  readonly conceptId: string;
  readonly heading: string;
  readonly explanation: string;
  readonly question: Readonly<{
    taskId: string;
    taskSlot: 1 | 2 | 3;
    questionId: string;
    coveredConceptIds: readonly string[];
    learnerSurfaceFingerprint: string;
    promptId: string;
    prompt: string;
    responseOptions: readonly Readonly<{
      responseId: string;
      text: string;
    }>[];
    accessibilityLabel: string;
  }>;
}

export interface LearningV2ActivitySessionIntroProjectionInputV1 {
  readonly contentClass: "production_candidate" | "neutral_test_fixture";
  readonly introId: string;
  readonly introFingerprint: string;
  readonly sourceSubjectFingerprint: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly targetLanguage: string;
  readonly title: string;
  readonly pages: readonly LearningV2ActivitySessionIntroPageInputV1[];
}

export interface LearningV2ActivitySessionIntroProjectionV1 extends LearningV2ActivitySessionIntroProjectionInputV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_SCHEMA_V1;
  readonly pageCount: 3;
  readonly embeddedQuestionCount: 3;
  readonly practiceStartSlot: 4;
  readonly slotPresentationPolicy: "slots_1_2_3_are_embedded_in_intro_pages_and_must_not_repeat";
  readonly learnerVisibleFieldPolicy: "positive_allowlist_title_and_three_intro_pages_only";
  readonly evaluatorDataPolicy: "none";
  readonly answerDataPolicy: "none";
  readonly serverSidecarPolicy: "none";
  readonly sourceContentAuthority: "unverified_owner_input_claim";
  readonly languageAccuracyAuthority: "none";
  readonly curriculumAuthority: "none";
  readonly repositoryAuthority: "none";
  readonly storageAuthority: "none";
  readonly runtimeAuthority: "none_release_readback_required";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly projectionFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const CONTROL_RE =
  /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u;
const handles = new WeakSet<object>();
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "contentClass",
  "introId",
  "introFingerprint",
  "sourceSubjectFingerprint",
  "episodeId",
  "sessionId",
  "sessionOrdinal",
  "targetLanguage",
  "title",
  "pages",
  "pageCount",
  "embeddedQuestionCount",
  "practiceStartSlot",
  "slotPresentationPolicy",
  "learnerVisibleFieldPolicy",
  "evaluatorDataPolicy",
  "answerDataPolicy",
  "serverSidecarPolicy",
  "sourceContentAuthority",
  "languageAccuracyAuthority",
  "curriculumAuthority",
  "repositoryAuthority",
  "storageAuthority",
  "runtimeAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "completionAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "projectionFingerprint",
] as const);
const PAGE_KEYS = Object.freeze([
  "pageOrdinal",
  "conceptId",
  "heading",
  "explanation",
  "question",
] as const);
const QUESTION_KEYS = Object.freeze([
  "taskId",
  "taskSlot",
  "questionId",
  "coveredConceptIds",
  "learnerSurfaceFingerprint",
  "promptId",
  "prompt",
  "responseOptions",
  "accessibilityLabel",
] as const);
const OPTION_KEYS = Object.freeze(["responseId", "text"] as const);

function fail(): never {
  throw new Error("learning_v2_activity_session_intro_projection_invalid");
}
function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, i) => key !== expected[i])
  )
    fail();
}
function text(value: unknown, max: number): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > max ||
    value !== value.normalize("NFC") ||
    CONTROL_RE.test(value)
  )
    fail();
  return value;
}
function id(value: unknown): string {
  const result = text(value, 160);
  if (!ID_RE.test(result)) fail();
  return result;
}
function token(value: unknown): string {
  const result = text(value, 128);
  if (!TOKEN_RE.test(result)) fail();
  return result;
}
function hash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function parseValue(
  value: unknown,
): LearningV2ActivitySessionIntroProjectionV1 {
  if (!record(value)) fail();
  exactKeys(value, ROOT_KEYS);
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_SCHEMA_V1 ||
    !["production_candidate", "neutral_test_fixture"].includes(
      String(value.contentClass),
    ) ||
    !Number.isSafeInteger(value.sessionOrdinal) ||
    Number(value.sessionOrdinal) < 1 ||
    Number(value.sessionOrdinal) > 12 ||
    !Array.isArray(value.pages) ||
    value.pages.length !== 3 ||
    value.pageCount !== 3 ||
    value.embeddedQuestionCount !== 3 ||
    value.practiceStartSlot !== 4
  )
    fail();
  const taskIds = new Set<string>();
  const questionIds = new Set<string>();
  const conceptIds = new Set<string>();
  const pages = Object.freeze(
    value.pages.map((entry, index) => {
      if (!record(entry)) fail();
      exactKeys(entry, PAGE_KEYS);
      if (entry.pageOrdinal !== index + 1 || !record(entry.question)) fail();
      exactKeys(entry.question, QUESTION_KEYS);
      const conceptId = id(entry.conceptId);
      if (conceptIds.has(conceptId)) fail();
      conceptIds.add(conceptId);
      const question = entry.question;
      if (
        question.taskSlot !== index + 1 ||
        !Array.isArray(question.coveredConceptIds) ||
        question.coveredConceptIds.length !== 1 ||
        question.coveredConceptIds[0] !== conceptId ||
        !Array.isArray(question.responseOptions) ||
        question.responseOptions.length < 2 ||
        question.responseOptions.length > 6
      )
        fail();
      const taskId = id(question.taskId);
      const questionId = id(question.questionId);
      if (taskIds.has(taskId) || questionIds.has(questionId)) fail();
      taskIds.add(taskId);
      questionIds.add(questionId);
      const optionIds = new Set<string>();
      const responseOptions = Object.freeze(
        question.responseOptions.map((option) => {
          if (!record(option)) fail();
          exactKeys(option, OPTION_KEYS);
          const responseId = id(option.responseId);
          if (optionIds.has(responseId)) fail();
          optionIds.add(responseId);
          return Object.freeze({ responseId, text: text(option.text, 512) });
        }),
      );
      return Object.freeze({
        pageOrdinal: (index + 1) as 1 | 2 | 3,
        conceptId,
        heading: text(entry.heading, 240),
        explanation: text(entry.explanation, 4_000),
        question: Object.freeze({
          taskId,
          taskSlot: (index + 1) as 1 | 2 | 3,
          questionId,
          coveredConceptIds: Object.freeze([conceptId]),
          learnerSurfaceFingerprint: hash(question.learnerSurfaceFingerprint),
          promptId: id(question.promptId),
          prompt: text(question.prompt, 1_000),
          responseOptions,
          accessibilityLabel: text(question.accessibilityLabel, 512),
        }),
      });
    }),
  );
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_SCHEMA_V1,
    contentClass: value.contentClass as
      | "production_candidate"
      | "neutral_test_fixture",
    introId: id(value.introId),
    introFingerprint: hash(value.introFingerprint),
    sourceSubjectFingerprint: hash(value.sourceSubjectFingerprint),
    episodeId: token(value.episodeId),
    sessionId: id(value.sessionId),
    sessionOrdinal: Number(value.sessionOrdinal),
    targetLanguage: (() => {
      const result = text(value.targetLanguage, 255);
      if (!parseV2ExactLanguageTagV1(result)) fail();
      return result;
    })(),
    title: text(value.title, 240),
    pages,
    pageCount: 3 as const,
    embeddedQuestionCount: 3 as const,
    practiceStartSlot: 4 as const,
    slotPresentationPolicy:
      "slots_1_2_3_are_embedded_in_intro_pages_and_must_not_repeat" as const,
    learnerVisibleFieldPolicy:
      "positive_allowlist_title_and_three_intro_pages_only" as const,
    evaluatorDataPolicy: "none" as const,
    answerDataPolicy: "none" as const,
    serverSidecarPolicy: "none" as const,
    sourceContentAuthority: "unverified_owner_input_claim" as const,
    languageAccuracyAuthority: "none" as const,
    curriculumAuthority: "none" as const,
    repositoryAuthority: "none" as const,
    storageAuthority: "none" as const,
    runtimeAuthority: "none_release_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  for (const [key, expected] of Object.entries({
    slotPresentationPolicy: body.slotPresentationPolicy,
    learnerVisibleFieldPolicy: body.learnerVisibleFieldPolicy,
    evaluatorDataPolicy: "none",
    answerDataPolicy: "none",
    serverSidecarPolicy: "none",
    sourceContentAuthority: body.sourceContentAuthority,
    languageAccuracyAuthority: "none",
    curriculumAuthority: "none",
    repositoryAuthority: "none",
    storageAuthority: "none",
    runtimeAuthority: body.runtimeAuthority,
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none",
    publicationAuthority: "none",
    releaseAuthority: false,
  }))
    if (value[key] !== expected) fail();
  if (value.projectionFingerprint !== hashCanonicalBody(body)) fail();
  const result = Object.freeze({
    ...body,
    projectionFingerprint: hash(value.projectionFingerprint),
  });
  handles.add(result);
  return result;
}

export function materializeLearningV2ActivitySessionIntroProjectionV1(
  input: LearningV2ActivitySessionIntroProjectionInputV1,
): LearningV2ActivitySessionIntroProjectionV1 {
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_SCHEMA_V1,
    ...input,
    pageCount: 3 as const,
    embeddedQuestionCount: 3 as const,
    practiceStartSlot: 4 as const,
    slotPresentationPolicy:
      "slots_1_2_3_are_embedded_in_intro_pages_and_must_not_repeat" as const,
    learnerVisibleFieldPolicy:
      "positive_allowlist_title_and_three_intro_pages_only" as const,
    evaluatorDataPolicy: "none" as const,
    answerDataPolicy: "none" as const,
    serverSidecarPolicy: "none" as const,
    sourceContentAuthority: "unverified_owner_input_claim" as const,
    languageAccuracyAuthority: "none" as const,
    curriculumAuthority: "none" as const,
    repositoryAuthority: "none" as const,
    storageAuthority: "none" as const,
    runtimeAuthority: "none_release_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2ActivitySessionIntroProjectionV1(
    canonicalJsonV1({
      ...body,
      projectionFingerprint: hashCanonicalBody(body),
    }),
  );
}

export function parseLearningV2ActivitySessionIntroProjectionV1(raw: string) {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (canonicalJsonV1(value) !== raw) fail();
  return parseValue(value);
}
export function encodeLearningV2ActivitySessionIntroProjectionV1(
  value: LearningV2ActivitySessionIntroProjectionV1,
) {
  if (!isLearningV2ActivitySessionIntroProjectionV1(value)) fail();
  return canonicalJsonV1(value);
}
export function isLearningV2ActivitySessionIntroProjectionV1(
  value: unknown,
): value is LearningV2ActivitySessionIntroProjectionV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
