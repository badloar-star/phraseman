import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  getLearningV2ActivityReleasedSessionPackageSummaryV1,
  getLearningV2ActivityReleasedSessionTaskV1,
  mountLearningV2ActivityReleasedSessionRuntimeV1,
  parseLearningV2ActivityReleasedSessionPackageV1,
  type LearningV2ActivityReleasedSessionRuntimeHandleV1,
} from "./activity_released_session_package_v1";
import {
  parseLearningV2ActivitySessionIntroProjectionV1,
  type LearningV2ActivitySessionIntroProjectionV1,
} from "./activity_session_intro_projection_v1";

export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V2 =
  "learning-v2-activity-released-session-package.v2" as const;
export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_MAX_BYTES_V2 =
  8 * 1024 * 1024;
export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_RUNTIME_SCHEMA_V2 =
  "learning-v2-activity-released-session-runtime.v2" as const;

export interface LearningV2ActivityReleasedSessionPackageHandleV2 {
  readonly __opaqueLearningV2ActivityReleasedSessionPackageHandleV2: unique symbol;
}

export interface LearningV2ActivityReleasedSessionRuntimeHandleV2 {
  readonly __opaqueLearningV2ActivityReleasedSessionRuntimeHandleV2: unique symbol;
}

export interface LearningV2ActivityReleasedSessionPackageSummaryV2 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V2;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly activityPackageFingerprint: string;
  readonly corePackageFingerprint: string;
  readonly introProjectionFingerprint: string;
  readonly taskCount: 12;
  readonly introPageCount: 3;
  readonly embeddedQuestionCount: 3;
  readonly practiceStartSlot: 4;
  readonly slotPresentationPolicy: "slots_1_2_3_are_embedded_in_intro_pages_and_must_not_repeat";
  readonly introTaskBinding: "exact_intro_questions_to_core_tasks_1_2_3";
  readonly localFeedbackAuthority: "local_provisional_only";
  readonly transportAuthentication: "required_outside_pure_package";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly releaseAuthority: false;
  readonly packageFingerprint: string;
}

export interface LearningV2ActivityReleasedSessionRuntimeSummaryV2
  extends Omit<LearningV2ActivityReleasedSessionPackageSummaryV2, "schemaVersion"> {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_SESSION_RUNTIME_SCHEMA_V2;
  readonly interfaceLocale: LearningV2InterfaceLocale;
  readonly runtimeFingerprint: string;
}

type PackageMaterial = Readonly<{
  summary: LearningV2ActivityReleasedSessionPackageSummaryV2;
  corePackageRaw: string;
  intro: LearningV2ActivitySessionIntroProjectionV1;
}>;

type RuntimeMaterial = Readonly<{
  summary: LearningV2ActivityReleasedSessionRuntimeSummaryV2;
  coreRuntime: LearningV2ActivityReleasedSessionRuntimeHandleV1;
  intro: LearningV2ActivitySessionIntroProjectionV1;
}>;

const packageHandles = new WeakSet<object>();
const packageMaterials = new WeakMap<object, PackageMaterial>();
const runtimeHandles = new WeakSet<object>();
const runtimeMaterials = new WeakMap<object, RuntimeMaterial>();
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "corePackageRaw",
  "introRaw",
  "episodeId",
  "sessionId",
  "sessionOrdinal",
  "activityPackageFingerprint",
  "corePackageFingerprint",
  "introProjectionFingerprint",
  "taskCount",
  "introPageCount",
  "embeddedQuestionCount",
  "practiceStartSlot",
  "slotPresentationPolicy",
  "introTaskBinding",
  "localFeedbackAuthority",
  "transportAuthentication",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "completionAuthority",
  "releaseAuthority",
  "packageFingerprint",
] as const);

function fail(): never {
  throw new Error("learning_v2_activity_released_session_package_v2_invalid");
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function parseCanonical(raw: string): Record<string, unknown> {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_MAX_BYTES_V2 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_MAX_BYTES_V2
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (!record(value) || canonicalJsonV1(value) !== raw) fail();
  return value;
}

function exactKeys(value: Record<string, unknown>) {
  const actual = Object.keys(value).sort();
  const expected = [...ROOT_KEYS].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  )
    fail();
}

function assertIntroBinding(
  corePackageRaw: string,
  intro: LearningV2ActivitySessionIntroProjectionV1,
) {
  const corePackage = parseLearningV2ActivityReleasedSessionPackageV1(
    corePackageRaw,
  );
  const coreSummary =
    getLearningV2ActivityReleasedSessionPackageSummaryV1(corePackage);
  const runtime = mountLearningV2ActivityReleasedSessionRuntimeV1({
    packageHandle: corePackage,
    interfaceLocale: "ru",
  });
  if (
    intro.episodeId !== coreSummary.episodeId ||
    intro.sessionId !== coreSummary.sessionId ||
    intro.sessionOrdinal !== coreSummary.sessionOrdinal ||
    intro.pages.length !== 3 ||
    intro.practiceStartSlot !== 4
  )
    fail();
  intro.pages.forEach((page, index) => {
    const task = getLearningV2ActivityReleasedSessionTaskV1(runtime, index + 1);
    const question = page.question;
    if (
      page.pageOrdinal !== index + 1 ||
      question.taskSlot !== index + 1 ||
      question.taskId !== task.taskId ||
      question.promptId !== task.learner.promptId ||
      question.prompt !== task.learner.prompt ||
      canonicalJsonV1(question.responseOptions) !==
        canonicalJsonV1(task.learner.responseOptions) ||
      question.accessibilityLabel !== task.learner.accessibilityLabel ||
      question.learnerSurfaceFingerprint !==
        hashCanonicalBody({
          taskId: task.taskId,
          promptId: task.learner.promptId,
          prompt: task.learner.prompt,
          responseOptions: task.learner.responseOptions,
          accessibilityLabel: task.learner.accessibilityLabel,
        })
    )
      fail();
  });
  return Object.freeze({ corePackage, coreSummary });
}

export function materializeLearningV2ActivityReleasedSessionPackageV2(input: {
  readonly corePackageRaw: string;
  readonly introRaw: string;
}): string {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !== "corePackageRaw|introRaw" ||
    typeof input.corePackageRaw !== "string" ||
    typeof input.introRaw !== "string"
  )
    fail();
  const intro = parseLearningV2ActivitySessionIntroProjectionV1(input.introRaw);
  const { coreSummary } = assertIntroBinding(input.corePackageRaw, intro);
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V2,
    corePackageRaw: input.corePackageRaw,
    introRaw: input.introRaw,
    episodeId: coreSummary.episodeId,
    sessionId: coreSummary.sessionId,
    sessionOrdinal: coreSummary.sessionOrdinal,
    activityPackageFingerprint: coreSummary.activityPackageFingerprint,
    corePackageFingerprint: coreSummary.packageFingerprint,
    introProjectionFingerprint: intro.projectionFingerprint,
    taskCount: 12 as const,
    introPageCount: 3 as const,
    embeddedQuestionCount: 3 as const,
    practiceStartSlot: 4 as const,
    slotPresentationPolicy:
      "slots_1_2_3_are_embedded_in_intro_pages_and_must_not_repeat" as const,
    introTaskBinding: "exact_intro_questions_to_core_tasks_1_2_3" as const,
    localFeedbackAuthority: "local_provisional_only" as const,
    transportAuthentication: "required_outside_pure_package" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  const raw = canonicalJsonV1({
    ...body,
    packageFingerprint: hashCanonicalBody(body),
  });
  parseLearningV2ActivityReleasedSessionPackageV2(raw);
  return raw;
}

export function parseLearningV2ActivityReleasedSessionPackageV2(
  raw: string,
): LearningV2ActivityReleasedSessionPackageHandleV2 {
  const value = parseCanonical(raw);
  exactKeys(value);
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V2 ||
    typeof value.corePackageRaw !== "string" ||
    typeof value.introRaw !== "string" ||
    value.taskCount !== 12 ||
    value.introPageCount !== 3 ||
    value.embeddedQuestionCount !== 3 ||
    value.practiceStartSlot !== 4 ||
    value.slotPresentationPolicy !==
      "slots_1_2_3_are_embedded_in_intro_pages_and_must_not_repeat" ||
    value.introTaskBinding !== "exact_intro_questions_to_core_tasks_1_2_3" ||
    value.localFeedbackAuthority !== "local_provisional_only" ||
    value.transportAuthentication !== "required_outside_pure_package" ||
    value.walletAuthority !== "none" ||
    value.masteryAuthority !== "none" ||
    value.evidenceAuthority !== "none" ||
    value.completionAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail();
  const intro = parseLearningV2ActivitySessionIntroProjectionV1(value.introRaw);
  const { coreSummary } = assertIntroBinding(value.corePackageRaw, intro);
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V2,
    corePackageRaw: value.corePackageRaw,
    introRaw: value.introRaw,
    episodeId: coreSummary.episodeId,
    sessionId: coreSummary.sessionId,
    sessionOrdinal: coreSummary.sessionOrdinal,
    activityPackageFingerprint: coreSummary.activityPackageFingerprint,
    corePackageFingerprint: coreSummary.packageFingerprint,
    introProjectionFingerprint: intro.projectionFingerprint,
    taskCount: 12 as const,
    introPageCount: 3 as const,
    embeddedQuestionCount: 3 as const,
    practiceStartSlot: 4 as const,
    slotPresentationPolicy:
      "slots_1_2_3_are_embedded_in_intro_pages_and_must_not_repeat" as const,
    introTaskBinding: "exact_intro_questions_to_core_tasks_1_2_3" as const,
    localFeedbackAuthority: "local_provisional_only" as const,
    transportAuthentication: "required_outside_pure_package" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  const packageFingerprint = hashCanonicalBody(body);
  if (
    value.episodeId !== body.episodeId ||
    value.sessionId !== body.sessionId ||
    value.sessionOrdinal !== body.sessionOrdinal ||
    value.activityPackageFingerprint !== body.activityPackageFingerprint ||
    value.corePackageFingerprint !== body.corePackageFingerprint ||
    value.introProjectionFingerprint !== body.introProjectionFingerprint ||
    value.packageFingerprint !== packageFingerprint ||
    canonicalJsonV1({ ...body, packageFingerprint }) !== raw
  )
    fail();
  const summary = Object.freeze({
    schemaVersion: body.schemaVersion,
    episodeId: body.episodeId,
    sessionId: body.sessionId,
    sessionOrdinal: body.sessionOrdinal,
    activityPackageFingerprint: body.activityPackageFingerprint,
    corePackageFingerprint: body.corePackageFingerprint,
    introProjectionFingerprint: body.introProjectionFingerprint,
    taskCount: body.taskCount,
    introPageCount: body.introPageCount,
    embeddedQuestionCount: body.embeddedQuestionCount,
    practiceStartSlot: body.practiceStartSlot,
    slotPresentationPolicy: body.slotPresentationPolicy,
    introTaskBinding: body.introTaskBinding,
    localFeedbackAuthority: body.localFeedbackAuthority,
    transportAuthentication: body.transportAuthentication,
    walletAuthority: body.walletAuthority,
    masteryAuthority: body.masteryAuthority,
    evidenceAuthority: body.evidenceAuthority,
    completionAuthority: body.completionAuthority,
    releaseAuthority: body.releaseAuthority,
    packageFingerprint,
  });
  const handle = Object.freeze(
    {},
  ) as LearningV2ActivityReleasedSessionPackageHandleV2;
  packageHandles.add(handle as object);
  packageMaterials.set(
    handle as object,
    Object.freeze({ summary, corePackageRaw: value.corePackageRaw, intro }),
  );
  return handle;
}

function packageMaterial(
  handle: LearningV2ActivityReleasedSessionPackageHandleV2,
): PackageMaterial {
  const material = packageMaterials.get(handle as object);
  if (!material || !packageHandles.has(handle as object)) fail();
  return material;
}

export function isLearningV2ActivityReleasedSessionPackageHandleV2(
  value: unknown,
): value is LearningV2ActivityReleasedSessionPackageHandleV2 {
  return typeof value === "object" && value !== null && packageHandles.has(value);
}

export function getLearningV2ActivityReleasedSessionPackageSummaryV2(
  handle: LearningV2ActivityReleasedSessionPackageHandleV2,
): LearningV2ActivityReleasedSessionPackageSummaryV2 {
  return packageMaterial(handle).summary;
}

export function mountLearningV2ActivityReleasedSessionRuntimeV2(input: {
  readonly packageHandle: LearningV2ActivityReleasedSessionPackageHandleV2;
  readonly interfaceLocale: LearningV2InterfaceLocale;
}): LearningV2ActivityReleasedSessionRuntimeHandleV2 {
  if (!record(input)) fail();
  const material = packageMaterial(input.packageHandle);
  const corePackage = parseLearningV2ActivityReleasedSessionPackageV1(
    material.corePackageRaw,
  );
  const coreRuntime = mountLearningV2ActivityReleasedSessionRuntimeV1({
    packageHandle: corePackage,
    interfaceLocale: input.interfaceLocale,
  });
  const runtimeBody = Object.freeze({
    ...material.summary,
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_RUNTIME_SCHEMA_V2,
    interfaceLocale: input.interfaceLocale,
  });
  const summary = Object.freeze({
    ...runtimeBody,
    runtimeFingerprint: hashCanonicalBody(runtimeBody),
  });
  const handle = Object.freeze(
    {},
  ) as LearningV2ActivityReleasedSessionRuntimeHandleV2;
  runtimeHandles.add(handle as object);
  runtimeMaterials.set(
    handle as object,
    Object.freeze({ summary, coreRuntime, intro: material.intro }),
  );
  return handle;
}

function runtimeMaterial(
  handle: LearningV2ActivityReleasedSessionRuntimeHandleV2,
): RuntimeMaterial {
  const material = runtimeMaterials.get(handle as object);
  if (!material || !runtimeHandles.has(handle as object)) fail();
  return material;
}

export function getLearningV2ActivityReleasedSessionRuntimeSummaryV2(
  handle: LearningV2ActivityReleasedSessionRuntimeHandleV2,
): LearningV2ActivityReleasedSessionRuntimeSummaryV2 {
  return runtimeMaterial(handle).summary;
}

export function isLearningV2ActivityReleasedSessionRuntimeHandleV2(
  value: unknown,
): value is LearningV2ActivityReleasedSessionRuntimeHandleV2 {
  return typeof value === "object" && value !== null && runtimeHandles.has(value);
}

export function resolveLearningV2ActivityReleasedSessionIntroV2(
  handle: LearningV2ActivityReleasedSessionRuntimeHandleV2,
): LearningV2ActivitySessionIntroProjectionV1 {
  return runtimeMaterial(handle).intro;
}

export function resolveLearningV2ActivityReleasedSessionCoreRuntimeV2(
  handle: LearningV2ActivityReleasedSessionRuntimeHandleV2,
): LearningV2ActivityReleasedSessionRuntimeHandleV1 {
  return runtimeMaterial(handle).coreRuntime;
}
