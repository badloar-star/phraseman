import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../content/generator_course_contract";
import {
  introRunsPlainTextV1,
  validateLearningV2IntroRunsByLocaleV1,
  type LearningV2IntroRunsByLocaleV1,
} from "../content/intro_semantic_runs_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import type { LearningV2CourseSessionInteractionProfileV1 } from "./course_session_release_package_v1";

export const LEARNING_V2_COURSE_SESSION_INTRO_CHILD_SCHEMA_V1 =
  "learning-v2-course-session-intro-child.v1" as const;
export const LEARNING_V2_COURSE_SESSION_LEARNER_CHILD_SCHEMA_V1 =
  "learning-v2-course-session-learner-child.v1" as const;
export const LEARNING_V2_COURSE_SESSION_AUXILIARY_CHILD_SCHEMA_V1 =
  "learning-v2-course-session-auxiliary-child.v1" as const;
export const LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1 = 256 * 1024;

export type LearningV2CourseSessionLocalizedTextV1 = Readonly<
  Record<LearningV2InterfaceLocale, string>
>;
type LocalizedText = LearningV2CourseSessionLocalizedTextV1;

export type LearningV2CourseSessionSavablePhraseV1 = Readonly<{
  available: true;
  savablePhraseRef: string;
  targetLanguage: string;
  targetText: string;
  meaningByLocale: LocalizedText;
  sourceTextFingerprint: string;
  contentOrigin: "learner_safe_release_projection";
}>;

export type LearningV2CourseSessionNewWordEncounterV1 = Readonly<{
  lexicalItemId: string;
  transcription: string;
  playfulMeaningByLocale: LocalizedText;
  motionVariant: "lesson_hero_b" | "premium_a";
  presentation: "blocking_task_overlay";
  dismissal: "continue_only";
  saveControl: "bookmark_icon";
  orderWithinSession: number;
  save: LearningV2CourseSessionSavablePhraseV1;
}>;

export interface LearningV2CourseSessionIntroQuestionV1 {
  readonly interactionId: string;
  readonly promptByLocale: LocalizedText;
  readonly choicesByLocale: Readonly<
    Record<LearningV2InterfaceLocale, readonly string[]>
  >;
  readonly accessibilityLabelByLocale: LocalizedText;
}

export interface LearningV2CourseSessionIntroPageV1 {
  readonly pageOrdinal: 1 | 2 | 3;
  readonly pageId: string;
  readonly kind: "concept" | "formula" | "example" | "trap" | "tip";
  readonly titleByLocale: LocalizedText;
  readonly bodyByLocale: LocalizedText;
  readonly bodyRunsByLocale?: LearningV2IntroRunsByLocaleV1;
  readonly question: LearningV2CourseSessionIntroQuestionV1;
}

export interface LearningV2CourseSessionIntroChildV1 {
  readonly schemaVersion: typeof LEARNING_V2_COURSE_SESSION_INTRO_CHILD_SCHEMA_V1;
  readonly courseSessionId: string;
  readonly learningOutcomeByLocale: LocalizedText;
  readonly pages: readonly [
    LearningV2CourseSessionIntroPageV1,
    LearningV2CourseSessionIntroPageV1,
    LearningV2CourseSessionIntroPageV1,
  ];
  readonly pageCount: 3;
  readonly embeddedQuestionCount: 3;
  readonly practiceStartOrdinal: 4;
  readonly questionPolicy: "one_question_at_bottom_of_each_intro_page_no_post_intro_duplicate";
  readonly answerDataPolicy: "none_server_evaluator_child_only";
  readonly runtimeAuthority: "none_active_release_join_required";
  readonly releaseAuthority: false;
  readonly introFingerprint: string;
}

export interface LearningV2CourseSessionPracticeInteractionV1 {
  readonly interactionId: string;
  readonly ordinal: number;
  readonly purpose:
    | "supported_practice"
    | "guided_practice"
    | "retrieval_practice"
    | "near_transfer"
    | "independent_check"
    | "interleaved_review";
  readonly family:
    | "phrase_builder"
    | "listen_choose"
    | "sound_contrast"
    | "listen_build_dictation"
    | "context_gap_grammar"
    | "speed_match"
    | "scripted_repeat_compare";
  readonly inputMode: "ordered_tokens" | "single_choice" | "scripted_speech";
  readonly prompt: string;
  readonly responseOptions: readonly Readonly<{
    responseId: string;
    text: string;
  }>[];
  readonly mediaIds: readonly string[];
  readonly audioTargetIds: readonly string[];
  readonly accessibilityLabel: string;
  readonly scriptedAlternate: Readonly<{
    alternateId: string;
    instruction: string;
    voiceEvidenceEquivalent: false;
    canAward: false;
  }> | null;
}

export interface LearningV2CourseSessionLearnerChildV1 {
  readonly schemaVersion: typeof LEARNING_V2_COURSE_SESSION_LEARNER_CHILD_SCHEMA_V1;
  readonly courseSessionId: string;
  readonly targetLanguage: string;
  readonly interactionProfile: LearningV2CourseSessionInteractionProfileV1;
  readonly interactions: readonly LearningV2CourseSessionPracticeInteractionV1[];
  readonly practiceInteractionCount: number;
  readonly firstPracticeOrdinal: 4;
  readonly evaluatorPayload: "absent_by_exact_schema";
  readonly acceptedAnswerPayload: "absent_by_exact_schema";
  readonly runtimeAuthority: "none_active_release_join_required";
  readonly releaseAuthority: false;
  readonly learnerFingerprint: string;
}

export interface LearningV2CourseSessionAuxiliaryEntryV1 {
  readonly interactionId: string;
  readonly report: Readonly<{
    available: true;
    reportContextRef: string;
    screen: "learning_v2_session";
  }>;
  readonly save: LearningV2CourseSessionSavablePhraseV1;
  readonly voice: Readonly<{
    available: true;
    tapToRecordAllowed: true;
    holdToTalkAllowed: true;
  }>;
  readonly secondErrorExplanationRef: string;
  readonly secondErrorExplanationByLocale: LocalizedText;
  /**
   * Optional for backward-compatible v1 reads; new authored packages provide
   * exact feedback for every visible wrong response id.
   */
  readonly responseFeedbackById?: Readonly<Record<string, LocalizedText>>;
  /** Present only on the first learner contact with a newly introduced word. */
  readonly newWordEncounter?: LearningV2CourseSessionNewWordEncounterV1;
}

export interface LearningV2CourseSessionAuxiliaryChildV1 {
  readonly schemaVersion: typeof LEARNING_V2_COURSE_SESSION_AUXILIARY_CHILD_SCHEMA_V1;
  readonly courseSessionId: string;
  readonly entries: readonly LearningV2CourseSessionAuxiliaryEntryV1[];
  readonly entryCount: number;
  readonly actionCoverage: "every_intro_and_practice_interaction";
  readonly firstWrongBehavior: "transparent_shake_not_selected_no_red_frame";
  readonly secondWrongBehavior: "show_localized_server_approved_explanation";
  readonly explanationOrigin: "admin_reviewed_error_guidance_release_reference";
  readonly evaluatorPayload: "absent_by_exact_schema";
  readonly recordingArtifactPolicy: "none_command_only";
  readonly runtimeAuthority: "none_active_release_join_required";
  readonly releaseAuthority: false;
  readonly auxiliaryFingerprint: string;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const LANGUAGE_RE =
  /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$/u;
const CONTROL_RE =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const introHandles = new WeakSet<object>();
const learnerHandles = new WeakSet<object>();
const auxiliaryHandles = new WeakSet<object>();

function fail(): never {
  throw new Error("learning_v2_course_session_client_child_invalid");
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Object.keys(value).sort();
  const target = [...expected].sort();
  if (
    keys.length !== target.length ||
    keys.some((key, index) => key !== target[index] || RESERVED.has(key))
  )
    fail();
}

function text(value: unknown, maximum: number): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximum ||
    value !== value.normalize("NFC") ||
    CONTROL_RE.test(value)
  )
    fail();
  return value;
}

function id(value: unknown): string {
  const result = text(value, 160);
  if (!ID_RE.test(result) || RESERVED.has(result)) fail();
  return result;
}

function localized(value: unknown, maximum: number): LocalizedText {
  if (!record(value)) fail();
  exactKeys(value, LEARNING_V2_INTERFACE_LOCALES);
  const result: Partial<Record<LearningV2InterfaceLocale, string>> = {};
  for (const locale of LEARNING_V2_INTERFACE_LOCALES)
    result[locale] = text(value[locale], maximum);
  return Object.freeze(result) as LocalizedText;
}

export function materializeLearningV2CourseSessionSavablePhraseV1(
  input: Readonly<{
    targetLanguage: string;
    targetText: string;
    meaningByLocale: LocalizedText;
  }>,
): LearningV2CourseSessionSavablePhraseV1 {
  if (!LANGUAGE_RE.test(input.targetLanguage)) fail();
  const targetLanguage = input.targetLanguage;
  const targetText = text(input.targetText, 4_000);
  const meaningByLocale = localized(input.meaningByLocale, 4_000);
  const sourceTextFingerprint = hashCanonicalBody({ targetText });
  return Object.freeze({
    available: true as const,
    savablePhraseRef: hashCanonicalBody({
      targetLanguage,
      targetText,
      meaningByLocale,
      sourceTextFingerprint,
    }),
    targetLanguage,
    targetText,
    meaningByLocale,
    sourceTextFingerprint,
    contentOrigin: "learner_safe_release_projection" as const,
  });
}

function localizedChoices(value: unknown) {
  if (!record(value)) fail();
  exactKeys(value, LEARNING_V2_INTERFACE_LOCALES);
  const result: Partial<Record<LearningV2InterfaceLocale, readonly string[]>> =
    {};
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    const choices = value[locale];
    if (!Array.isArray(choices) || choices.length < 2 || choices.length > 6)
      fail();
    const parsed = choices.map((choice) => text(choice, 512));
    if (new Set(parsed).size !== parsed.length) fail();
    result[locale] = Object.freeze(parsed);
  }
  return Object.freeze(result) as Readonly<
    Record<LearningV2InterfaceLocale, readonly string[]>
  >;
}

function localizedIntroRuns(value: unknown): LearningV2IntroRunsByLocaleV1 {
  let validated: LearningV2IntroRunsByLocaleV1;
  try {
    validated = validateLearningV2IntroRunsByLocaleV1(value);
  } catch {
    fail();
  }
  const result: Partial<
    Record<
      LearningV2InterfaceLocale,
      LearningV2IntroRunsByLocaleV1[LearningV2InterfaceLocale]
    >
  > = {};
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    result[locale] = Object.freeze(
      validated[locale].map((run) =>
        Object.freeze({
          text: text(run.text, 1_000),
          semantic: run.semantic,
        }),
      ),
    );
  }
  return Object.freeze(result) as LearningV2IntroRunsByLocaleV1;
}

function preflight(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const current = stack.pop()!;
    if (++nodes > 12_000 || current.depth > 20) fail();
    if (typeof current.value === "string") {
      if (
        current.value.length > 8_192 ||
        current.value !== current.value.normalize("NFC")
      )
        fail();
    } else if (typeof current.value === "number") {
      if (!Number.isSafeInteger(current.value) || Object.is(current.value, -0))
        fail();
    } else if (Array.isArray(current.value)) {
      if (current.value.length > 128) fail();
      current.value.forEach((child) =>
        stack.push({ value: child, depth: current.depth + 1 }),
      );
    } else if (record(current.value)) {
      const entries = Object.entries(current.value);
      if (entries.length > 64 || entries.some(([key]) => RESERVED.has(key)))
        fail();
      entries.forEach(([, child]) =>
        stack.push({ value: child, depth: current.depth + 1 }),
      );
    } else if (current.value !== null && typeof current.value !== "boolean")
      fail();
  }
}

function parseCanonical(raw: string): Record<string, unknown> {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  preflight(value);
  if (!record(value) || canonicalJsonV1(value) !== raw) fail();
  return value;
}

const INTRO_ROOT_KEYS = [
  "schemaVersion",
  "courseSessionId",
  "learningOutcomeByLocale",
  "pages",
  "pageCount",
  "embeddedQuestionCount",
  "practiceStartOrdinal",
  "questionPolicy",
  "answerDataPolicy",
  "runtimeAuthority",
  "releaseAuthority",
  "introFingerprint",
] as const;
const INTRO_PAGE_KEYS_LEGACY = [
  "pageOrdinal",
  "pageId",
  "kind",
  "titleByLocale",
  "bodyByLocale",
  "question",
] as const;
const INTRO_PAGE_KEYS_WITH_RUNS = [
  "pageOrdinal",
  "pageId",
  "kind",
  "titleByLocale",
  "bodyByLocale",
  "bodyRunsByLocale",
  "question",
] as const;
const INTRO_QUESTION_KEYS = [
  "interactionId",
  "promptByLocale",
  "choicesByLocale",
  "accessibilityLabelByLocale",
] as const;

export function parseLearningV2CourseSessionIntroChildV1(
  raw: string,
): LearningV2CourseSessionIntroChildV1 {
  const value = parseCanonical(raw);
  exactKeys(value, INTRO_ROOT_KEYS);
  if (
    value.schemaVersion !== LEARNING_V2_COURSE_SESSION_INTRO_CHILD_SCHEMA_V1 ||
    !Array.isArray(value.pages) ||
    value.pages.length !== 3 ||
    value.pageCount !== 3 ||
    value.embeddedQuestionCount !== 3 ||
    value.practiceStartOrdinal !== 4
  )
    fail();
  const ids = new Set<string>();
  const pages = value.pages.map((entry, index) => {
    if (!record(entry)) fail();
    const hasBodyRuns = Object.prototype.hasOwnProperty.call(
      entry,
      "bodyRunsByLocale",
    );
    exactKeys(
      entry,
      hasBodyRuns ? INTRO_PAGE_KEYS_WITH_RUNS : INTRO_PAGE_KEYS_LEGACY,
    );
    if (
      entry.pageOrdinal !== index + 1 ||
      !["concept", "formula", "example", "trap", "tip"].includes(
        String(entry.kind),
      ) ||
      !record(entry.question)
    )
      fail();
    exactKeys(entry.question, INTRO_QUESTION_KEYS);
    const interactionId = id(entry.question.interactionId);
    if (ids.has(interactionId)) fail();
    ids.add(interactionId);
    const bodyByLocale = localized(entry.bodyByLocale, 4_000);
    const bodyRunsByLocale = hasBodyRuns
      ? localizedIntroRuns(entry.bodyRunsByLocale)
      : undefined;
    if (
      bodyRunsByLocale &&
      LEARNING_V2_INTERFACE_LOCALES.some(
        (locale) =>
          introRunsPlainTextV1(bodyRunsByLocale[locale]) !==
          bodyByLocale[locale],
      )
    ) {
      fail();
    }
    return Object.freeze({
      pageOrdinal: (index + 1) as 1 | 2 | 3,
      pageId: id(entry.pageId),
      kind: entry.kind as LearningV2CourseSessionIntroPageV1["kind"],
      titleByLocale: localized(entry.titleByLocale, 240),
      bodyByLocale,
      ...(bodyRunsByLocale ? { bodyRunsByLocale } : {}),
      question: Object.freeze({
        interactionId,
        promptByLocale: localized(entry.question.promptByLocale, 1_000),
        choicesByLocale: localizedChoices(entry.question.choicesByLocale),
        accessibilityLabelByLocale: localized(
          entry.question.accessibilityLabelByLocale,
          512,
        ),
      }),
    });
  }) as unknown as LearningV2CourseSessionIntroChildV1["pages"];
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_INTRO_CHILD_SCHEMA_V1,
    courseSessionId: id(value.courseSessionId),
    learningOutcomeByLocale: localized(value.learningOutcomeByLocale, 1_000),
    pages: Object.freeze(pages),
    pageCount: 3 as const,
    embeddedQuestionCount: 3 as const,
    practiceStartOrdinal: 4 as const,
    questionPolicy:
      "one_question_at_bottom_of_each_intro_page_no_post_intro_duplicate" as const,
    answerDataPolicy: "none_server_evaluator_child_only" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    releaseAuthority: false as const,
  };
  if (
    value.questionPolicy !== body.questionPolicy ||
    value.answerDataPolicy !== body.answerDataPolicy ||
    value.runtimeAuthority !== body.runtimeAuthority ||
    value.releaseAuthority !== false ||
    value.introFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const result = Object.freeze({
    ...body,
    introFingerprint: value.introFingerprint as string,
  });
  introHandles.add(result);
  return result;
}

export function materializeLearningV2CourseSessionIntroChildV1(
  input: Pick<
    LearningV2CourseSessionIntroChildV1,
    "courseSessionId" | "learningOutcomeByLocale" | "pages"
  >,
) {
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_INTRO_CHILD_SCHEMA_V1,
    ...input,
    pageCount: 3 as const,
    embeddedQuestionCount: 3 as const,
    practiceStartOrdinal: 4 as const,
    questionPolicy:
      "one_question_at_bottom_of_each_intro_page_no_post_intro_duplicate" as const,
    answerDataPolicy: "none_server_evaluator_child_only" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2CourseSessionIntroChildV1(
    canonicalJsonV1({ ...body, introFingerprint: hashCanonicalBody(body) }),
  );
}

const LEARNER_ROOT_KEYS = [
  "schemaVersion",
  "courseSessionId",
  "targetLanguage",
  "interactionProfile",
  "interactions",
  "practiceInteractionCount",
  "firstPracticeOrdinal",
  "evaluatorPayload",
  "acceptedAnswerPayload",
  "runtimeAuthority",
  "releaseAuthority",
  "learnerFingerprint",
] as const;
const INTERACTION_KEYS = [
  "interactionId",
  "ordinal",
  "purpose",
  "family",
  "inputMode",
  "prompt",
  "responseOptions",
  "mediaIds",
  "audioTargetIds",
  "accessibilityLabel",
  "scriptedAlternate",
] as const;
const OPTION_KEYS = ["responseId", "text"] as const;
const ALTERNATE_KEYS = [
  "alternateId",
  "instruction",
  "voiceEvidenceEquivalent",
  "canAward",
] as const;

export function parseLearningV2CourseSessionLearnerChildV1(
  raw: string,
): LearningV2CourseSessionLearnerChildV1 {
  const value = parseCanonical(raw);
  exactKeys(value, LEARNER_ROOT_KEYS);
  if (
    !Array.isArray(value.interactions) ||
    value.interactions.length < 7 ||
    value.interactions.length > 19 ||
    !LANGUAGE_RE.test(String(value.targetLanguage)) ||
    !["standard", "rapid", "voice_heavy"].includes(
      String(value.interactionProfile),
    )
  )
    fail();
  const ids = new Set<string>();
  const interactions = Object.freeze(
    value.interactions.map((entry, index) => {
      if (!record(entry)) fail();
      exactKeys(entry, INTERACTION_KEYS);
      const interactionId = id(entry.interactionId);
      if (
        ids.has(interactionId) ||
        entry.ordinal !== index + 4 ||
        ![
          "supported_practice",
          "guided_practice",
          "retrieval_practice",
          "near_transfer",
          "independent_check",
          "interleaved_review",
        ].includes(String(entry.purpose)) ||
        ![
          "phrase_builder",
          "listen_choose",
          "sound_contrast",
          "listen_build_dictation",
          "context_gap_grammar",
          "speed_match",
          "scripted_repeat_compare",
        ].includes(String(entry.family)) ||
        !["ordered_tokens", "single_choice", "scripted_speech"].includes(
          String(entry.inputMode),
        ) ||
        !Array.isArray(entry.responseOptions) ||
        entry.responseOptions.length > 8 ||
        !Array.isArray(entry.mediaIds) ||
        entry.mediaIds.length > 8 ||
        !Array.isArray(entry.audioTargetIds) ||
        entry.audioTargetIds.length > 32
      )
        fail();
      ids.add(interactionId);
      const responseIds = new Set<string>();
      const responseOptions = Object.freeze(
        entry.responseOptions.map((option) => {
          if (!record(option)) fail();
          exactKeys(option, OPTION_KEYS);
          const responseId = id(option.responseId);
          if (responseIds.has(responseId)) fail();
          responseIds.add(responseId);
          return Object.freeze({ responseId, text: text(option.text, 512) });
        }),
      );
      let scriptedAlternate: LearningV2CourseSessionPracticeInteractionV1["scriptedAlternate"] =
        null;
      if (entry.scriptedAlternate !== null) {
        if (!record(entry.scriptedAlternate)) fail();
        exactKeys(entry.scriptedAlternate, ALTERNATE_KEYS);
        if (
          entry.scriptedAlternate.voiceEvidenceEquivalent !== false ||
          entry.scriptedAlternate.canAward !== false
        )
          fail();
        scriptedAlternate = Object.freeze({
          alternateId: id(entry.scriptedAlternate.alternateId),
          instruction: text(entry.scriptedAlternate.instruction, 1_000),
          voiceEvidenceEquivalent: false as const,
          canAward: false as const,
        });
      }
      return Object.freeze({
        interactionId,
        ordinal: index + 4,
        purpose: entry.purpose,
        family: entry.family,
        inputMode: entry.inputMode,
        prompt: text(entry.prompt, 2_000),
        responseOptions,
        mediaIds: Object.freeze(entry.mediaIds.map(id)),
        audioTargetIds: Object.freeze(entry.audioTargetIds.map(id)),
        accessibilityLabel: text(entry.accessibilityLabel, 1_000),
        scriptedAlternate,
      }) as LearningV2CourseSessionPracticeInteractionV1;
    }),
  );
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_LEARNER_CHILD_SCHEMA_V1,
    courseSessionId: id(value.courseSessionId),
    targetLanguage: value.targetLanguage as string,
    interactionProfile:
      value.interactionProfile as LearningV2CourseSessionInteractionProfileV1,
    interactions,
    practiceInteractionCount: interactions.length,
    firstPracticeOrdinal: 4 as const,
    evaluatorPayload: "absent_by_exact_schema" as const,
    acceptedAnswerPayload: "absent_by_exact_schema" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    releaseAuthority: false as const,
  };
  if (
    value.schemaVersion !== body.schemaVersion ||
    value.practiceInteractionCount !== body.practiceInteractionCount ||
    value.firstPracticeOrdinal !== 4 ||
    value.evaluatorPayload !== body.evaluatorPayload ||
    value.acceptedAnswerPayload !== body.acceptedAnswerPayload ||
    value.runtimeAuthority !== body.runtimeAuthority ||
    value.releaseAuthority !== false ||
    value.learnerFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const result = Object.freeze({
    ...body,
    learnerFingerprint: value.learnerFingerprint as string,
  });
  learnerHandles.add(result);
  return result;
}

export function materializeLearningV2CourseSessionLearnerChildV1(
  input: Pick<
    LearningV2CourseSessionLearnerChildV1,
    "courseSessionId" | "targetLanguage" | "interactionProfile" | "interactions"
  >,
) {
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_LEARNER_CHILD_SCHEMA_V1,
    ...input,
    practiceInteractionCount: input.interactions.length,
    firstPracticeOrdinal: 4 as const,
    evaluatorPayload: "absent_by_exact_schema" as const,
    acceptedAnswerPayload: "absent_by_exact_schema" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2CourseSessionLearnerChildV1(
    canonicalJsonV1({ ...body, learnerFingerprint: hashCanonicalBody(body) }),
  );
}

const AUX_ROOT_KEYS = [
  "schemaVersion",
  "courseSessionId",
  "entries",
  "entryCount",
  "actionCoverage",
  "firstWrongBehavior",
  "secondWrongBehavior",
  "explanationOrigin",
  "evaluatorPayload",
  "recordingArtifactPolicy",
  "runtimeAuthority",
  "releaseAuthority",
  "auxiliaryFingerprint",
] as const;
const AUX_ENTRY_KEYS = [
  "interactionId",
  "report",
  "save",
  "voice",
  "secondErrorExplanationRef",
  "secondErrorExplanationByLocale",
] as const;
const NEW_WORD_ENCOUNTER_KEYS = [
  "lexicalItemId",
  "transcription",
  "playfulMeaningByLocale",
  "motionVariant",
  "presentation",
  "dismissal",
  "saveControl",
  "orderWithinSession",
  "save",
] as const;

export function parseLearningV2CourseSessionAuxiliaryChildV1(
  raw: string,
): LearningV2CourseSessionAuxiliaryChildV1 {
  const value = parseCanonical(raw);
  exactKeys(value, AUX_ROOT_KEYS);
  if (
    !Array.isArray(value.entries) ||
    value.entries.length < 10 ||
    value.entries.length > 22
  )
    fail();
  const ids = new Set<string>();
  const entries = Object.freeze(
    value.entries.map((entry) => {
      if (!record(entry)) fail();
      exactKeys(entry, [
        ...AUX_ENTRY_KEYS,
        ...(Object.prototype.hasOwnProperty.call(entry, "responseFeedbackById")
          ? ["responseFeedbackById"]
          : []),
        ...(Object.prototype.hasOwnProperty.call(entry, "newWordEncounter")
          ? ["newWordEncounter"]
          : []),
      ]);
      const interactionId = id(entry.interactionId);
      if (
        ids.has(interactionId) ||
        !record(entry.report) ||
        !record(entry.save) ||
        !record(entry.voice)
      )
        fail();
      let responseFeedbackById:
        | Readonly<Record<string, LocalizedText>>
        | undefined;
      if ("responseFeedbackById" in entry) {
        if (!record(entry.responseFeedbackById)) fail();
        const feedbackEntries = Object.entries(entry.responseFeedbackById);
        if (feedbackEntries.length > 8) fail();
        responseFeedbackById = Object.freeze(
          Object.fromEntries(
            feedbackEntries.map(([responseId, copy]) => [
              id(responseId),
              localized(copy, 2_000),
            ]),
          ),
        );
      }
      ids.add(interactionId);
      exactKeys(entry.report, ["available", "reportContextRef", "screen"]);
      exactKeys(entry.save, [
        "available",
        "savablePhraseRef",
        "targetLanguage",
        "targetText",
        "meaningByLocale",
        "sourceTextFingerprint",
        "contentOrigin",
      ]);
      exactKeys(entry.voice, [
        "available",
        "tapToRecordAllowed",
        "holdToTalkAllowed",
      ]);
      if (
        entry.report.available !== true ||
        entry.report.screen !== "learning_v2_session" ||
        entry.save.available !== true ||
        entry.voice.available !== true ||
        entry.voice.tapToRecordAllowed !== true ||
        entry.voice.holdToTalkAllowed !== true
      )
        fail();
      const save = materializeLearningV2CourseSessionSavablePhraseV1({
        targetLanguage: entry.save.targetLanguage as string,
        targetText: entry.save.targetText as string,
        meaningByLocale: entry.save.meaningByLocale as LocalizedText,
      });
      if (
        entry.save.savablePhraseRef !== save.savablePhraseRef ||
        entry.save.sourceTextFingerprint !== save.sourceTextFingerprint ||
        entry.save.contentOrigin !== save.contentOrigin
      )
        fail();
      let newWordEncounter:
        | LearningV2CourseSessionNewWordEncounterV1
        | undefined;
      if (Object.prototype.hasOwnProperty.call(entry, "newWordEncounter")) {
        if (!record(entry.newWordEncounter)) fail();
        exactKeys(entry.newWordEncounter, NEW_WORD_ENCOUNTER_KEYS);
        if (!record(entry.newWordEncounter.save)) fail();
        exactKeys(entry.newWordEncounter.save, [
          "available",
          "savablePhraseRef",
          "targetLanguage",
          "targetText",
          "meaningByLocale",
          "sourceTextFingerprint",
          "contentOrigin",
        ]);
        const encounterSave = materializeLearningV2CourseSessionSavablePhraseV1(
          {
            targetLanguage: entry.newWordEncounter.save
              .targetLanguage as string,
            targetText: entry.newWordEncounter.save.targetText as string,
            meaningByLocale: entry.newWordEncounter.save
              .meaningByLocale as LocalizedText,
          },
        );
        const transcription = text(entry.newWordEncounter.transcription, 160);
        const orderWithinSession = entry.newWordEncounter.orderWithinSession;
        const motionVariant = entry.newWordEncounter.motionVariant;
        if (
          !/^\/.+\/$/u.test(transcription) ||
          !Number.isInteger(orderWithinSession) ||
          (orderWithinSession as number) < 1 ||
          (orderWithinSession as number) > 20 ||
          (motionVariant !== "lesson_hero_b" &&
            motionVariant !== "premium_a") ||
          entry.newWordEncounter.presentation !== "blocking_task_overlay" ||
          entry.newWordEncounter.dismissal !== "continue_only" ||
          entry.newWordEncounter.saveControl !== "bookmark_icon" ||
          entry.newWordEncounter.save.available !== true ||
          entry.newWordEncounter.save.savablePhraseRef !==
            encounterSave.savablePhraseRef ||
          entry.newWordEncounter.save.sourceTextFingerprint !==
            encounterSave.sourceTextFingerprint ||
          entry.newWordEncounter.save.contentOrigin !==
            encounterSave.contentOrigin ||
          encounterSave.savablePhraseRef !== save.savablePhraseRef
        )
          fail();
        newWordEncounter = Object.freeze({
          lexicalItemId: id(entry.newWordEncounter.lexicalItemId),
          transcription,
          playfulMeaningByLocale: localized(
            entry.newWordEncounter.playfulMeaningByLocale,
            400,
          ),
          motionVariant,
          presentation: "blocking_task_overlay" as const,
          dismissal: "continue_only" as const,
          saveControl: "bookmark_icon" as const,
          orderWithinSession: orderWithinSession as number,
          save: encounterSave,
        });
      }
      return Object.freeze({
        interactionId,
        report: Object.freeze({
          available: true as const,
          reportContextRef: id(entry.report.reportContextRef),
          screen: "learning_v2_session" as const,
        }),
        save,
        voice: Object.freeze({
          available: true as const,
          tapToRecordAllowed: true as const,
          holdToTalkAllowed: true as const,
        }),
        secondErrorExplanationRef: id(entry.secondErrorExplanationRef),
        secondErrorExplanationByLocale: localized(
          entry.secondErrorExplanationByLocale,
          2_000,
        ),
        ...(responseFeedbackById ? { responseFeedbackById } : {}),
        ...(newWordEncounter ? { newWordEncounter } : {}),
      });
    }),
  );
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_AUXILIARY_CHILD_SCHEMA_V1,
    courseSessionId: id(value.courseSessionId),
    entries,
    entryCount: entries.length,
    actionCoverage: "every_intro_and_practice_interaction" as const,
    firstWrongBehavior: "transparent_shake_not_selected_no_red_frame" as const,
    secondWrongBehavior: "show_localized_server_approved_explanation" as const,
    explanationOrigin:
      "admin_reviewed_error_guidance_release_reference" as const,
    evaluatorPayload: "absent_by_exact_schema" as const,
    recordingArtifactPolicy: "none_command_only" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    releaseAuthority: false as const,
  };
  if (
    value.schemaVersion !== body.schemaVersion ||
    value.entryCount !== body.entryCount ||
    value.actionCoverage !== body.actionCoverage ||
    value.firstWrongBehavior !== body.firstWrongBehavior ||
    value.secondWrongBehavior !== body.secondWrongBehavior ||
    value.explanationOrigin !== body.explanationOrigin ||
    value.evaluatorPayload !== body.evaluatorPayload ||
    value.recordingArtifactPolicy !== body.recordingArtifactPolicy ||
    value.runtimeAuthority !== body.runtimeAuthority ||
    value.releaseAuthority !== false ||
    value.auxiliaryFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const result = Object.freeze({
    ...body,
    auxiliaryFingerprint: value.auxiliaryFingerprint as string,
  });
  auxiliaryHandles.add(result);
  return result;
}

export function materializeLearningV2CourseSessionAuxiliaryChildV1(
  input: Pick<
    LearningV2CourseSessionAuxiliaryChildV1,
    "courseSessionId" | "entries"
  >,
) {
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_AUXILIARY_CHILD_SCHEMA_V1,
    ...input,
    entryCount: input.entries.length,
    actionCoverage: "every_intro_and_practice_interaction" as const,
    firstWrongBehavior: "transparent_shake_not_selected_no_red_frame" as const,
    secondWrongBehavior: "show_localized_server_approved_explanation" as const,
    explanationOrigin:
      "admin_reviewed_error_guidance_release_reference" as const,
    evaluatorPayload: "absent_by_exact_schema" as const,
    recordingArtifactPolicy: "none_command_only" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2CourseSessionAuxiliaryChildV1(
    canonicalJsonV1({ ...body, auxiliaryFingerprint: hashCanonicalBody(body) }),
  );
}

export const encodeLearningV2CourseSessionIntroChildV1 = (
  value: LearningV2CourseSessionIntroChildV1,
) => {
  if (!introHandles.has(value)) fail();
  return canonicalJsonV1(value);
};
export const encodeLearningV2CourseSessionLearnerChildV1 = (
  value: LearningV2CourseSessionLearnerChildV1,
) => {
  if (!learnerHandles.has(value)) fail();
  return canonicalJsonV1(value);
};
export const isLearningV2CourseSessionLearnerChildV1 = (
  value: unknown,
): value is LearningV2CourseSessionLearnerChildV1 =>
  typeof value === "object" && value !== null && learnerHandles.has(value);
export const encodeLearningV2CourseSessionAuxiliaryChildV1 = (
  value: LearningV2CourseSessionAuxiliaryChildV1,
) => {
  if (!auxiliaryHandles.has(value)) fail();
  return canonicalJsonV1(value);
};
