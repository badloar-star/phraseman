import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  parseV2ActivitySessionProjectionSource,
  type V2ActivitySessionProjectionSource,
} from "./v2_activity_session_projection";

export const V2_OWNER_AUTHORED_SESSION_INTRO_SCHEMA_V1 =
  "v2-owner-authored-session-intro.v1" as const;
export const V2_OWNER_AUTHORED_SESSION_INTRO_MAX_BYTES_V1 = 64 * 1024;

type ContentClass = "production_candidate" | "neutral_test_fixture";

export interface V2OwnerAuthoredSessionIntroConceptV1 {
  readonly conceptId: string;
  readonly heading: string;
  readonly explanation: string;
}

export interface V2OwnerAuthoredSessionIntroDraftV1 {
  readonly contentClass: ContentClass;
  readonly introId: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly concepts: readonly V2OwnerAuthoredSessionIntroConceptV1[];
}

export interface V2OwnerAuthoredSessionIntroQuestionRecordV1 {
  readonly taskId: string;
  readonly questionId: string;
  readonly coveredConceptIds: readonly string[];
  readonly learnerSurfaceFingerprint: string;
}

export interface V2OwnerAuthoredSessionIntroSummaryV1 {
  readonly schemaVersion: "v2-owner-authored-session-intro-summary.v1";
  readonly contentClass: ContentClass;
  readonly introId: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly targetLanguage: string;
  readonly introFingerprint: string;
  readonly sourceSubjectFingerprint: string;
  readonly questionCount: 3;
  readonly conceptCount: number;
  readonly contentOriginAuthority: "unverified_owner_input_claim";
  readonly languageAccuracyAuthority: "none";
  readonly curriculumAuthority: "none";
  readonly repositoryAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

export interface V2OwnerAuthoredSessionIntroHandleV1 {
  readonly __brand: "V2OwnerAuthoredSessionIntroHandleV1";
}

export interface V2OwnerAuthoredSessionIntroMaterialV1 {
  readonly raw: string;
  readonly summary: V2OwnerAuthoredSessionIntroSummaryV1;
  readonly source: V2ActivitySessionProjectionSource;
}

interface RawIntroBodyV1 {
  readonly schemaVersion: typeof V2_OWNER_AUTHORED_SESSION_INTRO_SCHEMA_V1;
  readonly contentClass: ContentClass;
  readonly introId: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly targetLanguage: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly concepts: readonly V2OwnerAuthoredSessionIntroConceptV1[];
  readonly questions: readonly V2OwnerAuthoredSessionIntroQuestionRecordV1[];
  readonly sourceSubjectFingerprint: string;
  readonly contentOriginAuthority: "unverified_owner_input_claim";
  readonly languageAccuracyAuthority: "none";
  readonly curriculumAuthority: "none";
  readonly repositoryAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

interface RawIntroV1 extends RawIntroBodyV1 {
  readonly introFingerprint: string;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const handles = new WeakSet<object>();
const materials = new WeakMap<object, V2OwnerAuthoredSessionIntroMaterialV1>();

const RAW_KEYS = [
  "schemaVersion",
  "contentClass",
  "introId",
  "episodeId",
  "sessionId",
  "sessionOrdinal",
  "targetLanguage",
  "title",
  "paragraphs",
  "concepts",
  "questions",
  "sourceSubjectFingerprint",
  "contentOriginAuthority",
  "languageAccuracyAuthority",
  "curriculumAuthority",
  "repositoryAuthority",
  "humanApprovalAuthority",
  "executionAuthority",
  "publicationPolicy",
  "runtimeConsumer",
  "releaseEligible",
  "releaseAuthority",
  "introFingerprint",
] as const;
const CONCEPT_KEYS = ["conceptId", "heading", "explanation"] as const;
const QUESTION_KEYS = [
  "taskId",
  "questionId",
  "coveredConceptIds",
  "learnerSurfaceFingerprint",
] as const;

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function safeText(value: unknown, maximum: number, code: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximum ||
    value !== value.normalize("NFC") ||
    CONTROL_RE.test(value)
  )
    fail(code);
  return value;
}

function trustedSource(value: unknown): V2ActivitySessionProjectionSource {
  try {
    return parseV2ActivitySessionProjectionSource(canonicalJsonV1(value));
  } catch {
    fail("v2_owner_session_intro_source_invalid");
  }
}

function learnerSurfaceFingerprint(
  task: V2ActivitySessionProjectionSource["session"]["tasks"][number],
) {
  return hashCanonicalBody({
    taskId: task.taskId,
    promptId: task.learner.promptId,
    prompt: task.learner.prompt,
    responseOptions: task.learner.responseOptions,
    accessibilityLabel: task.learner.accessibilityLabel,
  });
}

function sourceSubject(source: V2ActivitySessionProjectionSource) {
  const questions = source.session.tasks.slice(0, 3).map((task) => {
    if (!task.introQuestionRef)
      fail("v2_owner_session_intro_question_binding_invalid");
    return {
      taskId: task.taskId,
      questionId: task.introQuestionRef.questionId,
      coveredConceptIds: [...task.introQuestionRef.coveredConceptIds],
      learnerSurfaceFingerprint: learnerSurfaceFingerprint(task),
    };
  });
  return {
    episodeId: source.episodeId,
    sessionId: source.session.sessionId,
    sessionOrdinal: source.session.ordinal,
    targetLanguage: source.targetLanguage,
    questions,
    sourceSubjectFingerprint: hashCanonicalBody({
      episodeId: source.episodeId,
      sessionId: source.session.sessionId,
      sessionOrdinal: source.session.ordinal,
      targetLanguage: source.targetLanguage,
      questions,
    }),
  };
}

function assertDraft(
  value: unknown,
): asserts value is V2OwnerAuthoredSessionIntroDraftV1 {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "contentClass",
      "introId",
      "title",
      "paragraphs",
      "concepts",
    ]) ||
    (value.contentClass !== "production_candidate" &&
      value.contentClass !== "neutral_test_fixture") ||
    typeof value.introId !== "string" ||
    !TOKEN_RE.test(value.introId) ||
    !Array.isArray(value.paragraphs) ||
    value.paragraphs.length < 1 ||
    value.paragraphs.length > 12 ||
    !Array.isArray(value.concepts) ||
    value.concepts.length < 1 ||
    value.concepts.length > 16
  )
    fail("v2_owner_session_intro_draft_invalid");
  safeText(value.title, 240, "v2_owner_session_intro_text_invalid");
  value.paragraphs.forEach((entry) =>
    safeText(entry, 2_000, "v2_owner_session_intro_text_invalid"),
  );
  const conceptIds = new Set<string>();
  for (const candidate of value.concepts) {
    if (!isRecord(candidate) || !exactKeys(candidate, CONCEPT_KEYS))
      fail("v2_owner_session_intro_concept_invalid");
    const conceptId = safeText(
      candidate.conceptId,
      160,
      "v2_owner_session_intro_concept_invalid",
    );
    if (!ID_RE.test(conceptId) || conceptIds.has(conceptId))
      fail("v2_owner_session_intro_concept_invalid");
    conceptIds.add(conceptId);
    safeText(candidate.heading, 240, "v2_owner_session_intro_concept_invalid");
    safeText(
      candidate.explanation,
      2_000,
      "v2_owner_session_intro_concept_invalid",
    );
  }
}

function bindSourceFingerprint(
  source: V2ActivitySessionProjectionSource,
  introFingerprint: string,
) {
  const next = JSON.parse(canonicalJsonV1(source)) as Record<string, unknown>;
  const session = next.session as Record<string, unknown>;
  const tasks = session.tasks as Record<string, unknown>[];
  for (const task of tasks.slice(0, 3)) {
    const introQuestionRef = task.introQuestionRef as Record<string, unknown>;
    introQuestionRef.introArtifactFingerprint = introFingerprint;
  }
  return trustedSource(next);
}

function assertRaw(
  value: unknown,
  source: V2ActivitySessionProjectionSource,
): asserts value is RawIntroV1 {
  if (!isRecord(value) || !exactKeys(value, RAW_KEYS))
    fail("v2_owner_session_intro_shape_invalid");
  if (
    value.schemaVersion !== V2_OWNER_AUTHORED_SESSION_INTRO_SCHEMA_V1 ||
    (value.contentClass !== "production_candidate" &&
      value.contentClass !== "neutral_test_fixture") ||
    typeof value.introId !== "string" ||
    !TOKEN_RE.test(value.introId) ||
    value.episodeId !== source.episodeId ||
    value.sessionId !== source.session.sessionId ||
    value.sessionOrdinal !== source.session.ordinal ||
    value.targetLanguage !== source.targetLanguage ||
    typeof value.sourceSubjectFingerprint !== "string" ||
    !HASH_RE.test(value.sourceSubjectFingerprint) ||
    typeof value.introFingerprint !== "string" ||
    !HASH_RE.test(value.introFingerprint) ||
    value.contentOriginAuthority !== "unverified_owner_input_claim" ||
    value.languageAccuracyAuthority !== "none" ||
    value.curriculumAuthority !== "none" ||
    value.repositoryAuthority !== "none" ||
    value.humanApprovalAuthority !== "none" ||
    value.executionAuthority !== "none" ||
    value.publicationPolicy !== "draft_only_no_consumer" ||
    value.runtimeConsumer !== false ||
    value.releaseEligible !== false ||
    value.releaseAuthority !== false
  )
    fail("v2_owner_session_intro_value_invalid");
  assertDraft({
    contentClass: value.contentClass,
    introId: value.introId,
    title: value.title,
    paragraphs: value.paragraphs,
    concepts: value.concepts,
  });
  if (!Array.isArray(value.questions) || value.questions.length !== 3)
    fail("v2_owner_session_intro_question_binding_invalid");
  for (const question of value.questions) {
    if (!isRecord(question) || !exactKeys(question, QUESTION_KEYS))
      fail("v2_owner_session_intro_question_binding_invalid");
  }
  const subject = sourceSubject(source);
  if (
    value.sourceSubjectFingerprint !== subject.sourceSubjectFingerprint ||
    canonicalJsonV1(value.questions) !== canonicalJsonV1(subject.questions)
  )
    fail("v2_owner_session_intro_question_binding_invalid");
  const conceptIds = new Set(
    (value.concepts as V2OwnerAuthoredSessionIntroConceptV1[]).map(
      (concept) => concept.conceptId,
    ),
  );
  const covered = new Set(
    subject.questions.flatMap((question) => question.coveredConceptIds),
  );
  if (
    conceptIds.size !== covered.size ||
    [...conceptIds].some((conceptId) => !covered.has(conceptId))
  )
    fail("v2_owner_session_intro_concept_binding_invalid");
  if (
    source.session.tasks
      .slice(0, 3)
      .some(
        (task) =>
          task.introQuestionRef?.introArtifactFingerprint !==
          value.introFingerprint,
      )
  )
    fail("v2_owner_session_intro_fingerprint_binding_invalid");
}

export function materializeV2OwnerAuthoredSessionIntroV1(
  draft: V2OwnerAuthoredSessionIntroDraftV1,
  sessionSource: unknown,
): V2OwnerAuthoredSessionIntroMaterialV1 {
  assertDraft(draft);
  const source = trustedSource(sessionSource);
  const subject = sourceSubject(source);
  const body: RawIntroBodyV1 = {
    schemaVersion: V2_OWNER_AUTHORED_SESSION_INTRO_SCHEMA_V1,
    contentClass: draft.contentClass,
    introId: draft.introId,
    episodeId: subject.episodeId,
    sessionId: subject.sessionId,
    sessionOrdinal: subject.sessionOrdinal,
    targetLanguage: subject.targetLanguage,
    title: draft.title,
    paragraphs: [...draft.paragraphs],
    concepts: draft.concepts.map((concept) => ({ ...concept })),
    questions: subject.questions,
    sourceSubjectFingerprint: subject.sourceSubjectFingerprint,
    contentOriginAuthority: "unverified_owner_input_claim",
    languageAccuracyAuthority: "none",
    curriculumAuthority: "none",
    repositoryAuthority: "none",
    humanApprovalAuthority: "none",
    executionAuthority: "none",
    publicationPolicy: "draft_only_no_consumer",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
  };
  const introFingerprint = hashCanonicalBody(body);
  const boundSource = bindSourceFingerprint(source, introFingerprint);
  const raw = canonicalJsonV1({ ...body, introFingerprint });
  const handle = parseV2OwnerAuthoredSessionIntroV1(raw, boundSource);
  return resolveV2OwnerAuthoredSessionIntroMaterialV1(handle);
}

export function parseV2OwnerAuthoredSessionIntroV1(
  raw: string,
  sessionSource: unknown,
): V2OwnerAuthoredSessionIntroHandleV1 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_OWNER_AUTHORED_SESSION_INTRO_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_OWNER_AUTHORED_SESSION_INTRO_MAX_BYTES_V1
  )
    fail("v2_owner_session_intro_raw_invalid");
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    fail("v2_owner_session_intro_json_invalid");
  }
  const source = trustedSource(sessionSource);
  assertRaw(candidate, source);
  if (canonicalJsonV1(candidate) !== raw)
    fail("v2_owner_session_intro_noncanonical");
  const { introFingerprint: _ignored, ...body } = candidate;
  if (hashCanonicalBody(body) !== candidate.introFingerprint)
    fail("v2_owner_session_intro_fingerprint_invalid");
  const summary = Object.freeze({
    schemaVersion: "v2-owner-authored-session-intro-summary.v1" as const,
    contentClass: candidate.contentClass,
    introId: candidate.introId,
    episodeId: candidate.episodeId,
    sessionId: candidate.sessionId,
    sessionOrdinal: candidate.sessionOrdinal,
    targetLanguage: candidate.targetLanguage,
    introFingerprint: candidate.introFingerprint,
    sourceSubjectFingerprint: candidate.sourceSubjectFingerprint,
    questionCount: 3 as const,
    conceptCount: candidate.concepts.length,
    contentOriginAuthority: "unverified_owner_input_claim" as const,
    languageAccuracyAuthority: "none" as const,
    curriculumAuthority: "none" as const,
    repositoryAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const handle = Object.freeze({
    __brand: "V2OwnerAuthoredSessionIntroHandleV1" as const,
  });
  handles.add(handle);
  materials.set(handle, Object.freeze({ raw, summary, source }));
  return handle;
}

export function isV2OwnerAuthoredSessionIntroHandleV1(
  value: unknown,
): value is V2OwnerAuthoredSessionIntroHandleV1 {
  return isRecord(value) && handles.has(value);
}

export function getV2OwnerAuthoredSessionIntroSummaryV1(
  handle: V2OwnerAuthoredSessionIntroHandleV1,
) {
  const material = materials.get(handle);
  if (!material) fail("v2_owner_session_intro_handle_invalid");
  return material.summary;
}

export function resolveV2OwnerAuthoredSessionIntroMaterialV1(
  handle: V2OwnerAuthoredSessionIntroHandleV1,
) {
  const material = materials.get(handle);
  if (!material) fail("v2_owner_session_intro_handle_invalid");
  return material;
}
