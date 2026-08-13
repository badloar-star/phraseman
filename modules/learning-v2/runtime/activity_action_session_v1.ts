import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";
import {
  createLearningV2ActivityCompactActionExecutorV1,
  type LearningV2ActivityCompactActionExecutionResultV1,
  type LearningV2ActivityVoicePortOutcomeV1,
} from "./activity_compact_action_executor_v1";
import {
  isLearningV2ActivityAuxiliarySessionRuntimeV1,
  type LearningV2ActivityAuxiliaryRuntimeTaskV1,
  type LearningV2ActivityAuxiliarySessionRuntimeV1,
} from "./activity_auxiliary_session_runtime_v1";
import type { LearningV2ActivityReportContextV1 } from "./activity_learner_action_resource_v1";
import {
  resolveLearningV2ActivityPostTerminalCardV1,
  type LearningV2ActivityPostTerminalCardResultV1,
} from "./activity_post_terminal_card_capsule_v1";
import type { LearningV2ActivityAttemptIdentityV1 } from "./activity_attempt_controller_v1";

export const LEARNING_V2_ACTIVITY_ACTION_SESSION_SCHEMA_V1 =
  "learning-v2-activity-action-session.v1" as const;

export type LearningV2ActivityActionTerminalStateV1 =
  | "completed"
  | "skipped"
  | "not_terminal";

export type LearningV2ActivityActionSaveOutcomeV1 =
  | "added"
  | "duplicate"
  | "limit_reached"
  | "stale"
  | "failed";

export type LearningV2ActivityWrongFeedbackV1 = Readonly<{
  motion: "transparent_nudge" | "reduced_motion_crossfade";
  showRedFrame: false;
  commitSelection: false;
  errorOrdinal: number;
  explanation: Readonly<{
    explanationRef: string;
    localizedText: string;
    interfaceLocale: LearningV2InterfaceLocale;
  }> | null;
}>;

export interface LearningV2ActivityActionSessionPortsV1 {
  readonly openReport: (
    input: Readonly<{
      context: LearningV2ActivityReportContextV1;
      identity: LearningV2ActivityAttemptIdentityV1;
    }>,
  ) => void | Promise<void>;
  readonly saveCard: (
    input: Readonly<{
      card: LearningV2ActivityPostTerminalCardResultV1;
      identity: LearningV2ActivityAttemptIdentityV1;
    }>,
  ) => Promise<LearningV2ActivityActionSaveOutcomeV1>;
  readonly voiceControl: (
    input: Readonly<{
      command: "start" | "stop";
      interaction: "tap" | "hold" | "lifecycle";
    }>,
  ) => Promise<LearningV2ActivityVoicePortOutcomeV1>;
}

export interface LearningV2ActivityActionSessionV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_ACTION_SESSION_SCHEMA_V1;
  readonly identity: LearningV2ActivityAttemptIdentityV1;
  readonly descriptorFingerprint: string;
  readonly interfaceLocale: LearningV2InterfaceLocale;
  readonly terminalState: LearningV2ActivityActionTerminalStateV1;
  readonly reportAvailable: true;
  readonly saveAvailable: boolean;
  readonly voiceAvailable: boolean;
  readonly payloadRetention: "none_refs_coordinates_and_visible_card_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
  readonly openReport: () => Promise<LearningV2ActivityCompactActionExecutionResultV1>;
  readonly savePhrase: () => Promise<LearningV2ActivityCompactActionExecutionResultV1>;
  readonly controlVoice: (
    command: "start" | "stop",
    interaction: "tap" | "hold",
  ) => Promise<LearningV2ActivityCompactActionExecutionResultV1>;
  readonly resolveWrongFeedback: (
    errorOrdinal: number,
  ) => LearningV2ActivityWrongFeedbackV1;
  readonly dispose: () => Promise<void>;
}

const sessionHandles = new WeakSet<object>();

function fail(): never {
  throw new Error("learning_v2_activity_action_session_invalid");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactPorts(
  value: LearningV2ActivityActionSessionPortsV1,
): LearningV2ActivityActionSessionPortsV1 {
  if (
    !isPlainObject(value) ||
    Object.keys(value).sort().join("|") !==
      "openReport|saveCard|voiceControl" ||
    typeof value.openReport !== "function" ||
    typeof value.saveCard !== "function" ||
    typeof value.voiceControl !== "function"
  )
    fail();
  return value;
}

function sameIdentity(
  left: LearningV2ActivityAttemptIdentityV1,
  right: LearningV2ActivityAttemptIdentityV1,
): boolean {
  return (
    left.episodeId === right.episodeId &&
    left.sessionId === right.sessionId &&
    left.sessionOrdinal === right.sessionOrdinal &&
    left.taskId === right.taskId &&
    left.activityId === right.activityId &&
    left.promptId === right.promptId
  );
}

export function createLearningV2ActivityActionSessionV1(
  input: Readonly<{
    runtime: LearningV2ActivityAuxiliarySessionRuntimeV1;
    task: LearningV2ActivityAuxiliaryRuntimeTaskV1;
    terminalState: LearningV2ActivityActionTerminalStateV1;
    reducedMotion: boolean;
    ports: LearningV2ActivityActionSessionPortsV1;
  }>,
): LearningV2ActivityActionSessionV1 {
  if (
    !isPlainObject(input) ||
    Object.keys(input).sort().join("|") !==
      "ports|reducedMotion|runtime|task|terminalState" ||
    !isLearningV2ActivityAuxiliarySessionRuntimeV1(input.runtime) ||
    input.runtime.resolveTaskBySlot(input.task?.slot) !== input.task ||
    !["completed", "skipped", "not_terminal"].includes(input.terminalState) ||
    typeof input.reducedMotion !== "boolean"
  )
    fail();
  const ports = exactPorts(input.ports);
  const descriptor = input.runtime.getDescriptor();
  const action = input.task.action;
  const identity: LearningV2ActivityAttemptIdentityV1 = Object.freeze({
    episodeId: descriptor.episodeId,
    sessionId: descriptor.sessionId,
    sessionOrdinal: descriptor.sessionOrdinal,
    taskId: action.taskId,
    activityId: action.activityId,
    promptId: action.promptId,
  });
  let active = true;

  const executor = createLearningV2ActivityCompactActionExecutorV1({
    openReport: async ({ reportContextRef, identity: commandIdentity }) => {
      if (
        !active ||
        reportContextRef !== action.report.reportContextRef ||
        !sameIdentity(commandIdentity, identity)
      )
        fail();
      await ports.openReport({ context: action.report, identity });
    },
    savePhrase: async ({ savablePhraseRef, identity: commandIdentity }) => {
      if (!active || !sameIdentity(commandIdentity, identity)) return "stale";
      if (
        input.terminalState !== "completed" ||
        savablePhraseRef !== action.save.savablePhraseRef
      )
        return "stale";
      const card = resolveLearningV2ActivityPostTerminalCardV1({
        capsule: descriptor.postTerminalCards,
        actionResource: descriptor.actionResource,
        taskId: action.taskId,
        activityId: action.activityId,
        savablePhraseRef,
        interfaceLocale: input.runtime.interfaceLocale,
        terminalState: "completed",
      });
      return ports.saveCard({ card, identity });
    },
    voiceControl: async (command) => {
      if (!active || !action.voiceAvailable) return "unavailable";
      return ports.voiceControl(command);
    },
  });

  const session: LearningV2ActivityActionSessionV1 = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_ACTION_SESSION_SCHEMA_V1,
    identity,
    descriptorFingerprint: input.runtime.descriptorFingerprint,
    interfaceLocale: input.runtime.interfaceLocale,
    terminalState: input.terminalState,
    reportAvailable: true as const,
    saveAvailable: input.terminalState === "completed",
    voiceAvailable: action.voiceAvailable,
    payloadRetention: "none_refs_coordinates_and_visible_card_only" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
    openReport: () =>
      executor.execute({
        kind: "open_report",
        reportContextRef: action.report.reportContextRef,
        identity,
      }),
    savePhrase: () =>
      executor.execute({
        kind: "save_phrase",
        savablePhraseRef: action.save.savablePhraseRef,
        identity,
      }),
    controlVoice: (command: "start" | "stop", interaction: "tap" | "hold") =>
      executor.execute({ kind: "voice_control", command, interaction }),
    resolveWrongFeedback: (errorOrdinal: number) => {
      if (!active || !Number.isSafeInteger(errorOrdinal) || errorOrdinal < 1)
        fail();
      return Object.freeze({
        motion: input.reducedMotion
          ? ("reduced_motion_crossfade" as const)
          : ("transparent_nudge" as const),
        showRedFrame: false as const,
        commitSelection: false as const,
        errorOrdinal,
        explanation:
          errorOrdinal < 2
            ? null
            : Object.freeze({
                explanationRef:
                  input.task.secondErrorExplanation.explanationRef,
                localizedText: input.task.secondErrorExplanation.text,
                interfaceLocale:
                  input.task.secondErrorExplanation.interfaceLocale,
              }),
      });
    },
    dispose: async () => {
      if (!active) return;
      await executor.dispose();
      active = false;
    },
  });
  sessionHandles.add(session);
  return session;
}

export function isLearningV2ActivityActionSessionV1(
  value: unknown,
): value is LearningV2ActivityActionSessionV1 {
  return (
    typeof value === "object" && value !== null && sessionHandles.has(value)
  );
}
