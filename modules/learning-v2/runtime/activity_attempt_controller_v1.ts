import {
  evaluateV2LocalEvaluatorCapsuleV1,
  isV2LocalEvaluatorCapsuleHandleV1,
  type V2LocalEvaluatorCapsuleHandleV1,
  type V2LocalEvaluatorResponseV1,
} from "./local_evaluator_capsule_v1";
import {
  resolveLearningV2ActivityErrorExplanationV1,
  type LearningV2ActivityErrorExplanationLearnerProjectionV1,
} from "../content/activity_error_explanation_catalog_v1";
import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";
import {
  isLearningV2ActivityAttemptAudioBindingV1,
  type LearningV2ActivityAttemptAudioBindingV1,
} from "./activity_audio_runtime_projection_v1";

export const LEARNING_V2_ACTIVITY_ATTEMPT_CONTROLLER_SCHEMA_V1 =
  "learning-v2-activity-attempt-controller.v1" as const;
export const LEARNING_V2_ACTIVITY_VOICE_IDS_V1 = Object.freeze([
  "ash",
  "onyx",
  "nova",
  "coral",
] as const);

export type LearningV2ActivityVoiceIdV1 =
  (typeof LEARNING_V2_ACTIVITY_VOICE_IDS_V1)[number];
export type LearningV2ActivityCompactActionV1 = "report" | "save" | "voice";

export interface LearningV2ActivityAttemptIdentityV1 {
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly taskId: string;
  readonly activityId: string;
  readonly promptId: string;
}

export interface LearningV2ActivityAttemptControllerConfigV1 {
  readonly identity: LearningV2ActivityAttemptIdentityV1;
  readonly capsuleHandle: V2LocalEvaluatorCapsuleHandleV1;
  readonly voiceSelectionIndex: 0 | 1 | 2 | 3;
  readonly fullPhraseAudioTargetId: string | null;
  readonly selectableAudioTargets: Readonly<
    Record<string, Readonly<{ audioTargetId: string; wordId: string }>>
  >;
  readonly savablePhraseRef: string | null;
  readonly reportContextRef: string;
  readonly reducedMotion: boolean;
  readonly holdToTalkEnabled: boolean;
  readonly resolveWrongExplanation: (
    input: Readonly<{
      taskId: string;
      activityId: string;
      errorOrdinal: number;
      decisionFingerprint: string;
    }>,
  ) => Readonly<{
    explanationRef: string;
    localizedText: string;
  }>;
}

export type LearningV2ActivityAttemptEffectV1 =
  | Readonly<{
      kind: "play_audio";
      audioTargetId: string;
      wordId: string | null;
      voiceId: LearningV2ActivityVoiceIdV1;
      source: "selected_word_or_chip" | "full_phrase";
    }>
  | Readonly<{
      kind: "wrong_feedback";
      targetId: string;
      motion: "transparent_nudge" | "reduced_motion_crossfade";
      showRedFrame: false;
      commitSelection: false;
      errorOrdinal: number;
      explanation: Readonly<{
        explanationRef: string;
        localizedText: string;
      }> | null;
    }>
  | Readonly<{
      kind: "provisional_correct";
      decisionFingerprint: string;
      commitSelection: true;
      walletAuthority: "none";
      masteryAuthority: "none";
      evidenceAuthority: "none";
    }>
  | Readonly<{
      kind: "technical_invalid";
      decisionFingerprint: string;
      freeRetry: true;
      learningErrorCountChanged: false;
    }>
  | Readonly<{
      kind: "open_report";
      reportContextRef: string;
      identity: LearningV2ActivityAttemptIdentityV1;
    }>
  | Readonly<{
      kind: "save_phrase";
      savablePhraseRef: string;
      identity: LearningV2ActivityAttemptIdentityV1;
    }>
  | Readonly<{
      kind: "voice_control";
      command: "start" | "stop";
      interaction: "tap" | "hold";
    }>;

export interface LearningV2ActivitySelectionAttemptV1 {
  readonly effects: readonly LearningV2ActivityAttemptEffectV1[];
  readonly commitSelection: boolean;
}

export interface LearningV2ActivityAttemptSnapshotV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_ATTEMPT_CONTROLLER_SCHEMA_V1;
  readonly identity: LearningV2ActivityAttemptIdentityV1;
  readonly voiceId: LearningV2ActivityVoiceIdV1;
  readonly learningErrorCount: number;
  readonly microphoneState: "idle" | "recording";
  readonly compactActions: readonly ["report", "save", "voice"];
  readonly networkAuthority: "none_local_attempt_controller";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
}

export interface LearningV2ActivityAttemptControllerV1 {
  readonly getSnapshot: () => LearningV2ActivityAttemptSnapshotV1;
  readonly selectAudioTarget: (
    selectableId: string,
  ) => LearningV2ActivityAttemptEffectV1;
  readonly playFullPhrase: () => LearningV2ActivityAttemptEffectV1;
  readonly evaluateResponse: (
    input: Readonly<{
      response: V2LocalEvaluatorResponseV1;
      feedbackTargetId: string;
    }>,
  ) => LearningV2ActivityAttemptEffectV1;
  readonly attemptSelection: (
    input: Readonly<{
      selectableId: string;
      response: V2LocalEvaluatorResponseV1;
      feedbackTargetId: string;
    }>,
  ) => LearningV2ActivitySelectionAttemptV1;
  readonly invokeCompactAction: (
    action: LearningV2ActivityCompactActionV1,
  ) => LearningV2ActivityAttemptEffectV1;
  readonly tapVoiceControl: () => LearningV2ActivityAttemptEffectV1;
  readonly holdVoiceControl: (
    phase: "press_in" | "press_out",
  ) => LearningV2ActivityAttemptEffectV1;
}

export type LearningV2ActivityAttemptBoundConfigV1 = Omit<
  LearningV2ActivityAttemptControllerConfigV1,
  "resolveWrongExplanation"
> &
  Readonly<{
    explanationProjection: LearningV2ActivityErrorExplanationLearnerProjectionV1;
    interfaceLocale: LearningV2InterfaceLocale;
  }>;

export type LearningV2ActivityAttemptReleasedConfigV1 = Omit<
  LearningV2ActivityAttemptBoundConfigV1,
  "voiceSelectionIndex" | "fullPhraseAudioTargetId" | "selectableAudioTargets"
> &
  Readonly<{
    audioBinding: LearningV2ActivityAttemptAudioBindingV1;
  }>;

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function fail(): never {
  throw new Error("learning_v2_activity_attempt_controller_invalid");
}

function exactIdentity(
  value: LearningV2ActivityAttemptIdentityV1,
): LearningV2ActivityAttemptIdentityV1 {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).sort().join("|") !==
      [
        "activityId",
        "episodeId",
        "promptId",
        "sessionId",
        "sessionOrdinal",
        "taskId",
      ]
        .sort()
        .join("|") ||
    !ID_RE.test(value.episodeId) ||
    !ID_RE.test(value.sessionId) ||
    !Number.isSafeInteger(value.sessionOrdinal) ||
    value.sessionOrdinal < 1 ||
    value.sessionOrdinal > 12 ||
    !ID_RE.test(value.taskId) ||
    !ID_RE.test(value.activityId) ||
    !ID_RE.test(value.promptId)
  )
    fail();
  return Object.freeze({ ...value });
}

function exactRef(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail();
  return value;
}

export function createLearningV2ActivityAttemptControllerV1(
  config: LearningV2ActivityAttemptControllerConfigV1,
): LearningV2ActivityAttemptControllerV1 {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config) ||
    Object.getPrototypeOf(config) !== Object.prototype ||
    Object.keys(config).sort().join("|") !==
      [
        "capsuleHandle",
        "fullPhraseAudioTargetId",
        "holdToTalkEnabled",
        "identity",
        "reducedMotion",
        "reportContextRef",
        "resolveWrongExplanation",
        "savablePhraseRef",
        "selectableAudioTargets",
        "voiceSelectionIndex",
      ]
        .sort()
        .join("|") ||
    !isV2LocalEvaluatorCapsuleHandleV1(config.capsuleHandle) ||
    !Number.isSafeInteger(config.voiceSelectionIndex) ||
    config.voiceSelectionIndex < 0 ||
    config.voiceSelectionIndex > 3 ||
    typeof config.resolveWrongExplanation !== "function" ||
    typeof config.reducedMotion !== "boolean" ||
    typeof config.holdToTalkEnabled !== "boolean"
  )
    fail();
  const identity = exactIdentity(config.identity);
  if (
    config.capsuleHandle.taskId !== identity.taskId ||
    config.capsuleHandle.activityId !== identity.activityId
  )
    fail();
  const fullPhraseAudioTargetId =
    config.fullPhraseAudioTargetId === null
      ? null
      : exactRef(config.fullPhraseAudioTargetId);
  const savablePhraseRef =
    config.savablePhraseRef === null ? null : exactRef(config.savablePhraseRef);
  const reportContextRef = exactRef(config.reportContextRef);
  if (
    !config.selectableAudioTargets ||
    typeof config.selectableAudioTargets !== "object" ||
    Array.isArray(config.selectableAudioTargets) ||
    Object.getPrototypeOf(config.selectableAudioTargets) !== Object.prototype
  )
    fail();
  const audioTargets = new Map<
    string,
    Readonly<{ audioTargetId: string; wordId: string }>
  >();
  const entries = Object.entries(config.selectableAudioTargets);
  if (entries.length > 32) fail();
  for (const [selectableId, value] of entries) {
    if (
      !ID_RE.test(selectableId) ||
      RESERVED_KEYS.has(selectableId) ||
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).sort().join("|") !== "audioTargetId|wordId"
    )
      fail();
    audioTargets.set(
      selectableId,
      Object.freeze({
        audioTargetId: exactRef(value.audioTargetId),
        wordId: exactRef(value.wordId),
      }),
    );
  }
  const voiceId = LEARNING_V2_ACTIVITY_VOICE_IDS_V1[
    config.voiceSelectionIndex
  ] as LearningV2ActivityVoiceIdV1;
  let learningErrorCount = 0;
  let microphoneState: "idle" | "recording" = "idle";
  const snapshot = (): LearningV2ActivityAttemptSnapshotV1 =>
    Object.freeze({
      schemaVersion: LEARNING_V2_ACTIVITY_ATTEMPT_CONTROLLER_SCHEMA_V1,
      identity,
      voiceId,
      learningErrorCount,
      microphoneState,
      compactActions: Object.freeze(["report", "save", "voice"] as const),
      networkAuthority: "none_local_attempt_controller" as const,
      walletAuthority: "none" as const,
      masteryAuthority: "none" as const,
      evidenceAuthority: "none" as const,
    });
  const voiceControl = (
    command: "start" | "stop",
    interaction: "tap" | "hold",
  ): LearningV2ActivityAttemptEffectV1 => {
    if (command === "start") {
      if (microphoneState !== "idle") fail();
      microphoneState = "recording";
    } else {
      if (microphoneState !== "recording") fail();
      microphoneState = "idle";
    }
    return Object.freeze({ kind: "voice_control", command, interaction });
  };
  const selectAudioTarget = (
    selectableId: string,
  ): LearningV2ActivityAttemptEffectV1 => {
    const target = audioTargets.get(selectableId);
    if (!target) fail();
    return Object.freeze({
      kind: "play_audio" as const,
      audioTargetId: target.audioTargetId,
      wordId: target.wordId,
      voiceId,
      source: "selected_word_or_chip" as const,
    });
  };
  const evaluateResponse = ({
    response,
    feedbackTargetId,
  }: Readonly<{
    response: V2LocalEvaluatorResponseV1;
    feedbackTargetId: string;
  }>): LearningV2ActivityAttemptEffectV1 => {
    exactRef(feedbackTargetId);
    const verdict = evaluateV2LocalEvaluatorCapsuleV1(
      config.capsuleHandle,
      response,
    );
    if (verdict.resultCode === "technical_invalid")
      return Object.freeze({
        kind: "technical_invalid" as const,
        decisionFingerprint: verdict.decisionFingerprint,
        freeRetry: true as const,
        learningErrorCountChanged: false as const,
      });
    if (verdict.resultCode === "provisional_correct")
      return Object.freeze({
        kind: "provisional_correct" as const,
        decisionFingerprint: verdict.decisionFingerprint,
        commitSelection: true as const,
        walletAuthority: "none" as const,
        masteryAuthority: "none" as const,
        evidenceAuthority: "none" as const,
      });
    learningErrorCount += 1;
    const explanation =
      learningErrorCount < 2
        ? null
        : config.resolveWrongExplanation({
            taskId: identity.taskId,
            activityId: identity.activityId,
            errorOrdinal: learningErrorCount,
            decisionFingerprint: verdict.decisionFingerprint,
          });
    if (
      explanation !== null &&
      (!explanation ||
        typeof explanation !== "object" ||
        Array.isArray(explanation) ||
        Object.getPrototypeOf(explanation) !== Object.prototype ||
        Object.keys(explanation).sort().join("|") !==
          "explanationRef|localizedText" ||
        !ID_RE.test(explanation.explanationRef) ||
        typeof explanation.localizedText !== "string" ||
        explanation.localizedText.trim().length < 1 ||
        explanation.localizedText.length > 1_000)
    )
      fail();
    return Object.freeze({
      kind: "wrong_feedback" as const,
      targetId: feedbackTargetId,
      motion: config.reducedMotion
        ? ("reduced_motion_crossfade" as const)
        : ("transparent_nudge" as const),
      showRedFrame: false as const,
      commitSelection: false as const,
      errorOrdinal: learningErrorCount,
      explanation: explanation === null ? null : Object.freeze(explanation),
    });
  };
  return Object.freeze({
    getSnapshot: snapshot,
    selectAudioTarget,
    playFullPhrase: () => {
      if (fullPhraseAudioTargetId === null) fail();
      return Object.freeze({
        kind: "play_audio" as const,
        audioTargetId: fullPhraseAudioTargetId,
        wordId: null,
        voiceId,
        source: "full_phrase" as const,
      });
    },
    evaluateResponse,
    attemptSelection: ({
      selectableId,
      response,
      feedbackTargetId,
    }: Readonly<{
      selectableId: string;
      response: V2LocalEvaluatorResponseV1;
      feedbackTargetId: string;
    }>) => {
      const audio = selectAudioTarget(selectableId);
      const verdict = evaluateResponse({ response, feedbackTargetId });
      return Object.freeze({
        effects: Object.freeze([audio, verdict]),
        commitSelection:
          verdict.kind === "provisional_correct" && verdict.commitSelection,
      });
    },
    invokeCompactAction: (action: LearningV2ActivityCompactActionV1) => {
      if (action === "report")
        return Object.freeze({
          kind: "open_report" as const,
          reportContextRef,
          identity,
        });
      if (action === "save") {
        if (savablePhraseRef === null) fail();
        return Object.freeze({
          kind: "save_phrase" as const,
          savablePhraseRef,
          identity,
        });
      }
      if (action !== "voice") fail();
      return voiceControl(microphoneState === "idle" ? "start" : "stop", "tap");
    },
    tapVoiceControl: () =>
      voiceControl(microphoneState === "idle" ? "start" : "stop", "tap"),
    holdVoiceControl: (phase: "press_in" | "press_out") => {
      if (!config.holdToTalkEnabled) fail();
      if (phase === "press_in") return voiceControl("start", "hold");
      if (phase === "press_out") return voiceControl("stop", "hold");
      return fail();
    },
  });
}

export function createLearningV2ActivityAttemptControllerWithExplanationProjectionV1(
  config: LearningV2ActivityAttemptBoundConfigV1,
): LearningV2ActivityAttemptControllerV1 {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config) ||
    Object.getPrototypeOf(config) !== Object.prototype
  )
    fail();
  const { explanationProjection, interfaceLocale, ...controllerConfig } =
    config;
  const explanation = resolveLearningV2ActivityErrorExplanationV1(
    explanationProjection,
    {
      taskId: config.identity.taskId,
      activityId: config.identity.activityId,
      interfaceLocale,
    },
  );
  return createLearningV2ActivityAttemptControllerV1({
    ...controllerConfig,
    resolveWrongExplanation: () => explanation,
  });
}

export function createLearningV2ActivityAttemptControllerFromRuntimeBindingsV1(
  config: LearningV2ActivityAttemptReleasedConfigV1,
): LearningV2ActivityAttemptControllerV1 {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config) ||
    Object.getPrototypeOf(config) !== Object.prototype ||
    !isLearningV2ActivityAttemptAudioBindingV1(config.audioBinding) ||
    config.audioBinding.taskId !== config.identity.taskId
  )
    fail();
  const { audioBinding, ...rest } = config;
  return createLearningV2ActivityAttemptControllerWithExplanationProjectionV1({
    ...rest,
    voiceSelectionIndex: audioBinding.voiceSelectionIndex,
    fullPhraseAudioTargetId: audioBinding.fullPhraseAudioTargetId,
    selectableAudioTargets: audioBinding.selectableAudioTargets,
  });
}
