import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  encodeLearningV2ActivityLearnerCoreReleaseIndexV1,
  isLearningV2ActivityLearnerCoreReleaseIndexV1,
  parseLearningV2ActivityLearnerCoreReleaseIndexV1,
  type LearningV2ActivityLearnerCoreObjectPinV1,
  type LearningV2ActivityLearnerCoreReleaseIndexV1,
} from "./activity_learner_core_release_index_v1";
import {
  LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_MAX_BYTES_V1,
  parseLearningV2ActivitySessionIntroProjectionV1,
} from "./activity_session_intro_projection_v1";

export const LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V2 =
  "learning-v2-activity-learner-core-release-index.v2" as const;
export const LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V2 =
  256 * 1024;
export const LEARNING_V2_ACTIVITY_SESSION_INTRO_OBJECT_PREFIX_V1 =
  "learning-v2/canonical/activity-session-intros" as const;

export interface LearningV2ActivityLearnerCoreIntroSessionPinV2 {
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly sourceSubjectFingerprint: string;
  readonly introFingerprint: string;
  readonly introProjectionFingerprint: string;
  readonly intro: LearningV2ActivityLearnerCoreObjectPinV1;
}

export interface LearningV2ActivityLearnerCoreReleaseIndexV2 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V2;
  readonly coreIndexV1Raw: string;
  readonly coreIndexV1Fingerprint: string;
  readonly planFingerprint: string;
  readonly ownerInputFingerprint: string;
  readonly introAggregateFingerprint: string;
  readonly introProjectionSetFingerprint: string;
  readonly ownerConfirmationFingerprint: string;
  readonly intros: readonly LearningV2ActivityLearnerCoreIntroSessionPinV2[];
  readonly sessionCount: 12;
  readonly introQuestionCount: 36;
  readonly objectCount: 36;
  readonly introReleaseBinding: "exact_owner_confirmed_projection_to_render_session";
  readonly repositoryOriginAuthority: "none_server_readback_required";
  readonly storageAuthority: "none_server_readback_required";
  readonly ownerConfirmationAuthority: "none_private_confirmed_owner_handle_required";
  readonly runtimeAuthority: "none_active_pointer_and_readback_required";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly indexFingerprint: string;
}

export interface LearningV2ActivityLearnerCoreIntroMaterialInputV2 {
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly renderRaw: string;
  readonly introRaw: string;
  readonly introPin: LearningV2ActivityLearnerCoreObjectPinV1;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "coreIndexV1Raw",
  "coreIndexV1Fingerprint",
  "planFingerprint",
  "ownerInputFingerprint",
  "introAggregateFingerprint",
  "introProjectionSetFingerprint",
  "ownerConfirmationFingerprint",
  "intros",
  "sessionCount",
  "introQuestionCount",
  "objectCount",
  "introReleaseBinding",
  "repositoryOriginAuthority",
  "storageAuthority",
  "ownerConfirmationAuthority",
  "runtimeAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "completionAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "indexFingerprint",
] as const);
const INTRO_KEYS = Object.freeze([
  "sessionId",
  "sessionOrdinal",
  "sourceSubjectFingerprint",
  "introFingerprint",
  "introProjectionFingerprint",
  "intro",
] as const);
const PIN_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("learning_v2_activity_learner_core_release_index_v2_invalid");
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
  const actual = Object.keys(value);
  if (
    actual.length !== keys.length ||
    actual.some((key) => !keys.includes(key))
  )
    fail();
}

function id(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail();
  return value;
}

function hash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

export function learningV2ActivitySessionIntroObjectPathV1(input: {
  readonly stageId: string;
  readonly sessionOrdinal: number;
  readonly projectionFingerprint: string;
  readonly rawHash: string;
}): string {
  if (
    !Number.isSafeInteger(input.sessionOrdinal) ||
    input.sessionOrdinal < 1 ||
    input.sessionOrdinal > 12
  )
    fail();
  return `${LEARNING_V2_ACTIVITY_SESSION_INTRO_OBJECT_PREFIX_V1}/${sha256Utf8(id(input.stageId))}/sessions/${String(input.sessionOrdinal).padStart(2, "0")}/${hash(input.projectionFingerprint)}/${hash(input.rawHash)}.json`;
}

function pin(
  value: unknown,
  expected: {
    readonly stageId: string;
    readonly sessionOrdinal: number;
    readonly projectionFingerprint: string;
  },
) {
  if (!record(value)) fail();
  exactKeys(value, PIN_KEYS);
  if (
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 2 ||
    Number(value.byteSize) >
      LEARNING_V2_ACTIVITY_SESSION_INTRO_PROJECTION_MAX_BYTES_V1 ||
    value.contentType !== "application/json; charset=utf-8"
  )
    fail();
  const contentHash = hash(value.contentHash);
  const objectPath = learningV2ActivitySessionIntroObjectPathV1({
    ...expected,
    rawHash: contentHash,
  });
  if (value.objectPath !== objectPath) fail();
  return Object.freeze({
    objectPath,
    contentHash,
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
    contentType: "application/json; charset=utf-8" as const,
  });
}

function renderTasks(
  raw: string,
  coreSession: LearningV2ActivityLearnerCoreReleaseIndexV1["sessions"][number],
) {
  if (
    typeof raw !== "string" ||
    sha256Utf8(raw) !== coreSession.render.contentHash
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (
    canonicalJsonV1(value) !== raw ||
    !record(value) ||
    !record(value.session)
  )
    fail();
  const tasks = value.session.tasks;
  if (!Array.isArray(tasks) || tasks.length !== 12) fail();
  return tasks;
}

function visibleSurface(task: unknown) {
  if (!record(task) || !record(task.learner)) fail();
  const learner = task.learner;
  if (
    typeof task.taskId !== "string" ||
    typeof learner.promptId !== "string" ||
    typeof learner.prompt !== "string" ||
    !Array.isArray(learner.responseOptions) ||
    typeof learner.accessibilityLabel !== "string"
  )
    fail();
  return {
    taskId: task.taskId,
    promptId: learner.promptId,
    prompt: learner.prompt,
    responseOptions: learner.responseOptions,
    accessibilityLabel: learner.accessibilityLabel,
  };
}

function introRow(
  value: unknown,
  core: LearningV2ActivityLearnerCoreReleaseIndexV1,
  expectedOrdinal: number,
): LearningV2ActivityLearnerCoreIntroSessionPinV2 {
  if (!record(value)) fail();
  exactKeys(value, INTRO_KEYS);
  const coreSession = core.sessions[expectedOrdinal - 1];
  if (
    !coreSession ||
    value.sessionOrdinal !== expectedOrdinal ||
    value.sessionId !== coreSession.sessionId
  )
    fail();
  const introProjectionFingerprint = hash(value.introProjectionFingerprint);
  return Object.freeze({
    sessionId: id(value.sessionId),
    sessionOrdinal: expectedOrdinal,
    sourceSubjectFingerprint: hash(value.sourceSubjectFingerprint),
    introFingerprint: hash(value.introFingerprint),
    introProjectionFingerprint,
    intro: pin(value.intro, {
      stageId: core.stageId,
      sessionOrdinal: expectedOrdinal,
      projectionFingerprint: introProjectionFingerprint,
    }),
  });
}

function parseValue(
  value: unknown,
): LearningV2ActivityLearnerCoreReleaseIndexV2 {
  if (!record(value)) fail();
  exactKeys(value, ROOT_KEYS);
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V2 ||
    typeof value.coreIndexV1Raw !== "string" ||
    !Array.isArray(value.intros) ||
    value.intros.length !== 12 ||
    value.sessionCount !== 12 ||
    value.introQuestionCount !== 36 ||
    value.objectCount !== 36
  )
    fail();
  const core = parseLearningV2ActivityLearnerCoreReleaseIndexV1(
    value.coreIndexV1Raw,
  );
  if (value.coreIndexV1Fingerprint !== core.indexFingerprint) fail();
  const intros = Object.freeze(
    value.intros.map((row, index) => introRow(row, core, index + 1)),
  );
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V2,
    coreIndexV1Raw: value.coreIndexV1Raw,
    coreIndexV1Fingerprint: core.indexFingerprint,
    planFingerprint: hash(value.planFingerprint),
    ownerInputFingerprint: hash(value.ownerInputFingerprint),
    introAggregateFingerprint: hash(value.introAggregateFingerprint),
    introProjectionSetFingerprint: hash(value.introProjectionSetFingerprint),
    ownerConfirmationFingerprint: hash(value.ownerConfirmationFingerprint),
    intros,
    sessionCount: 12 as const,
    introQuestionCount: 36 as const,
    objectCount: 36 as const,
    introReleaseBinding:
      "exact_owner_confirmed_projection_to_render_session" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none_server_readback_required" as const,
    ownerConfirmationAuthority:
      "none_private_confirmed_owner_handle_required" as const,
    runtimeAuthority: "none_active_pointer_and_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  if (
    value.introReleaseBinding !== body.introReleaseBinding ||
    value.repositoryOriginAuthority !== body.repositoryOriginAuthority ||
    value.storageAuthority !== body.storageAuthority ||
    value.ownerConfirmationAuthority !== body.ownerConfirmationAuthority ||
    value.runtimeAuthority !== body.runtimeAuthority ||
    value.walletAuthority !== "none" ||
    value.masteryAuthority !== "none" ||
    value.evidenceAuthority !== "none" ||
    value.completionAuthority !== "none" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false ||
    value.indexFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const result = Object.freeze({
    ...body,
    indexFingerprint: hash(value.indexFingerprint),
  });
  handles.add(result);
  return result;
}

export function materializeLearningV2ActivityLearnerCoreReleaseIndexV2(input: {
  readonly coreIndexV1: LearningV2ActivityLearnerCoreReleaseIndexV1;
  readonly planFingerprint: string;
  readonly ownerInputFingerprint: string;
  readonly introAggregateFingerprint: string;
  readonly introProjectionSetFingerprint: string;
  readonly ownerConfirmationFingerprint: string;
  readonly sessions: readonly LearningV2ActivityLearnerCoreIntroMaterialInputV2[];
}): LearningV2ActivityLearnerCoreReleaseIndexV2 {
  if (
    !isLearningV2ActivityLearnerCoreReleaseIndexV1(input.coreIndexV1) ||
    input.sessions.length !== 12
  )
    fail();
  const intros = input.sessions.map((session, index) => {
    const ordinal = index + 1;
    const coreSession = input.coreIndexV1.sessions[index];
    if (
      session.sessionOrdinal !== ordinal ||
      session.sessionId !== coreSession?.sessionId
    )
      fail();
    const intro = parseLearningV2ActivitySessionIntroProjectionV1(
      session.introRaw,
    );
    const tasks = renderTasks(session.renderRaw, coreSession);
    if (
      intro.episodeId !== input.coreIndexV1.episodeId ||
      intro.sessionId !== session.sessionId ||
      intro.sessionOrdinal !== ordinal ||
      sha256Utf8(session.introRaw) !== session.introPin.contentHash ||
      utf8ByteLengthV1(session.introRaw) !== session.introPin.byteSize ||
      intro.practiceStartSlot !== 4 ||
      intro.pages.some((page, questionIndex) => {
        const question = page.question;
        const surface = visibleSurface(tasks[questionIndex]);
        return (
          page.pageOrdinal !== questionIndex + 1 ||
          question.taskSlot !== questionIndex + 1 ||
          question.taskId !== surface.taskId ||
          question.promptId !== surface.promptId ||
          question.prompt !== surface.prompt ||
          canonicalJsonV1(question.responseOptions) !==
            canonicalJsonV1(surface.responseOptions) ||
          question.accessibilityLabel !== surface.accessibilityLabel ||
          question.learnerSurfaceFingerprint !== hashCanonicalBody(surface)
        );
      })
    )
      fail();
    return {
      sessionId: session.sessionId,
      sessionOrdinal: ordinal,
      sourceSubjectFingerprint: intro.sourceSubjectFingerprint,
      introFingerprint: intro.introFingerprint,
      introProjectionFingerprint: intro.projectionFingerprint,
      intro: session.introPin,
    };
  });
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V2,
    coreIndexV1Raw: encodeLearningV2ActivityLearnerCoreReleaseIndexV1(
      input.coreIndexV1,
    ),
    coreIndexV1Fingerprint: input.coreIndexV1.indexFingerprint,
    planFingerprint: hash(input.planFingerprint),
    ownerInputFingerprint: hash(input.ownerInputFingerprint),
    introAggregateFingerprint: hash(input.introAggregateFingerprint),
    introProjectionSetFingerprint: hash(input.introProjectionSetFingerprint),
    ownerConfirmationFingerprint: hash(input.ownerConfirmationFingerprint),
    intros,
    sessionCount: 12 as const,
    introQuestionCount: 36 as const,
    objectCount: 36 as const,
    introReleaseBinding:
      "exact_owner_confirmed_projection_to_render_session" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none_server_readback_required" as const,
    ownerConfirmationAuthority:
      "none_private_confirmed_owner_handle_required" as const,
    runtimeAuthority: "none_active_pointer_and_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2ActivityLearnerCoreReleaseIndexV2(
    canonicalJsonV1({ ...body, indexFingerprint: hashCanonicalBody(body) }),
  );
}

export function parseLearningV2ActivityLearnerCoreReleaseIndexV2(
  raw: string,
): LearningV2ActivityLearnerCoreReleaseIndexV2 {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V2 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V2
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

export function encodeLearningV2ActivityLearnerCoreReleaseIndexV2(
  index: LearningV2ActivityLearnerCoreReleaseIndexV2,
): string {
  if (!isLearningV2ActivityLearnerCoreReleaseIndexV2(index)) fail();
  return canonicalJsonV1(index);
}

export function isLearningV2ActivityLearnerCoreReleaseIndexV2(
  value: unknown,
): value is LearningV2ActivityLearnerCoreReleaseIndexV2 {
  return typeof value === "object" && value !== null && handles.has(value);
}
