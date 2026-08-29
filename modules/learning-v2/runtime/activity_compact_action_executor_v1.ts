import type {
  LearningV2ActivityAttemptEffectV1,
  LearningV2ActivityAttemptIdentityV1,
} from "./activity_attempt_controller_v1";

export const LEARNING_V2_ACTIVITY_COMPACT_ACTION_EXECUTOR_SCHEMA_V1 =
  "learning-v2-activity-compact-action-executor.v1" as const;

export type LearningV2ActivityCompactActionCommandV1 = Extract<
  LearningV2ActivityAttemptEffectV1,
  { kind: "open_report" | "save_phrase" | "voice_control" }
>;

export type LearningV2ActivitySavePhraseOutcomeV1 =
  | "added"
  | "duplicate"
  | "limit_reached"
  | "stale"
  | "failed";

export type LearningV2ActivityVoicePortOutcomeV1 =
  | "started"
  | "stopped"
  | "permission_denied"
  | "unavailable"
  | "failed";

export interface LearningV2ActivityCompactActionPortsV1 {
  readonly openReport: (
    input: Readonly<{
      reportContextRef: string;
      identity: LearningV2ActivityAttemptIdentityV1;
    }>,
  ) => void | Promise<void>;
  readonly savePhrase: (
    input: Readonly<{
      savablePhraseRef: string;
      identity: LearningV2ActivityAttemptIdentityV1;
    }>,
  ) => Promise<LearningV2ActivitySavePhraseOutcomeV1>;
  readonly voiceControl: (
    input: Readonly<{
      command: "start" | "stop";
      interaction: "tap" | "hold" | "lifecycle";
    }>,
  ) => Promise<LearningV2ActivityVoicePortOutcomeV1>;
}

export type LearningV2ActivityCompactActionExecutionResultV1 =
  | Readonly<{
      kind: "report_result";
      outcome: "opened" | "failed" | "busy_recording" | "disposed";
    }>
  | Readonly<{
      kind: "save_result";
      outcome:
        | LearningV2ActivitySavePhraseOutcomeV1
        | "in_progress"
        | "busy_recording"
        | "disposed";
    }>
  | Readonly<{
      kind: "voice_result";
      outcome:
        | LearningV2ActivityVoicePortOutcomeV1
        | "invalid_transition"
        | "disposed";
    }>;

export interface LearningV2ActivityCompactActionExecutorSnapshotV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_COMPACT_ACTION_EXECUTOR_SCHEMA_V1;
  readonly voiceState: "idle" | "starting" | "recording" | "stopping";
  readonly saveState: "idle" | "saving";
  readonly disposed: boolean;
  readonly payloadRetention: "none_refs_and_coordinates_only";
  readonly recordingArtifactAuthority: "none";
  readonly transcriptAuthority: "none";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
}

export interface LearningV2ActivityCompactActionExecutorV1 {
  readonly getSnapshot: () => LearningV2ActivityCompactActionExecutorSnapshotV1;
  readonly execute: (
    command: LearningV2ActivityCompactActionCommandV1,
  ) => Promise<LearningV2ActivityCompactActionExecutionResultV1>;
  readonly dispose: () => Promise<void>;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const executorHandles = new WeakSet<object>();

function fail(): never {
  throw new Error("learning_v2_activity_compact_action_executor_invalid");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
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
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key))
  )
    fail();
}

function exactId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !ID_RE.test(value) ||
    RESERVED_KEYS.has(value)
  )
    fail();
  return value;
}

function exactIdentity(value: unknown): LearningV2ActivityAttemptIdentityV1 {
  if (!isPlainObject(value)) fail();
  exactKeys(value, [
    "episodeId",
    "sessionId",
    "sessionOrdinal",
    "taskId",
    "activityId",
    "promptId",
  ]);
  if (
    !Number.isSafeInteger(value.sessionOrdinal) ||
    Number(value.sessionOrdinal) < 1 ||
    Number(value.sessionOrdinal) > 12
  )
    fail();
  return Object.freeze({
    episodeId: exactId(value.episodeId),
    sessionId: exactId(value.sessionId),
    sessionOrdinal: Number(value.sessionOrdinal),
    taskId: exactId(value.taskId),
    activityId: exactId(value.activityId),
    promptId: exactId(value.promptId),
  });
}

function exactCommand(
  value: unknown,
): LearningV2ActivityCompactActionCommandV1 {
  if (!isPlainObject(value) || typeof value.kind !== "string") fail();
  if (value.kind === "open_report") {
    exactKeys(value, ["kind", "reportContextRef", "identity"]);
    return Object.freeze({
      kind: "open_report",
      reportContextRef: exactId(value.reportContextRef),
      identity: exactIdentity(value.identity),
    });
  }
  if (value.kind === "save_phrase") {
    exactKeys(value, ["kind", "savablePhraseRef", "identity"]);
    return Object.freeze({
      kind: "save_phrase",
      savablePhraseRef: exactId(value.savablePhraseRef),
      identity: exactIdentity(value.identity),
    });
  }
  if (value.kind === "voice_control") {
    exactKeys(value, ["kind", "command", "interaction"]);
    if (
      (value.command !== "start" && value.command !== "stop") ||
      (value.interaction !== "tap" && value.interaction !== "hold")
    )
      fail();
    return Object.freeze({
      kind: "voice_control",
      command: value.command,
      interaction: value.interaction,
    });
  }
  fail();
}

function exactPorts(
  value: LearningV2ActivityCompactActionPortsV1,
): LearningV2ActivityCompactActionPortsV1 {
  if (!isPlainObject(value)) fail();
  exactKeys(value, ["openReport", "savePhrase", "voiceControl"]);
  if (
    typeof value.openReport !== "function" ||
    typeof value.savePhrase !== "function" ||
    typeof value.voiceControl !== "function"
  )
    fail();
  return value;
}

function isSaveOutcome(
  value: unknown,
): value is LearningV2ActivitySavePhraseOutcomeV1 {
  return (
    value === "added" ||
    value === "duplicate" ||
    value === "limit_reached" ||
    value === "stale" ||
    value === "failed"
  );
}

function isVoiceOutcome(
  value: unknown,
): value is LearningV2ActivityVoicePortOutcomeV1 {
  return (
    value === "started" ||
    value === "stopped" ||
    value === "permission_denied" ||
    value === "unavailable" ||
    value === "failed"
  );
}

export function createLearningV2ActivityCompactActionExecutorV1(
  inputPorts: LearningV2ActivityCompactActionPortsV1,
): LearningV2ActivityCompactActionExecutorV1 {
  const ports = exactPorts(inputPorts);
  let voiceState: LearningV2ActivityCompactActionExecutorSnapshotV1["voiceState"] =
    "idle";
  let saveState: LearningV2ActivityCompactActionExecutorSnapshotV1["saveState"] =
    "idle";
  let disposed = false;
  let pendingVoicePort: Promise<LearningV2ActivityVoicePortOutcomeV1> | null =
    null;

  const snapshot = (): LearningV2ActivityCompactActionExecutorSnapshotV1 =>
    Object.freeze({
      schemaVersion: LEARNING_V2_ACTIVITY_COMPACT_ACTION_EXECUTOR_SCHEMA_V1,
      voiceState,
      saveState,
      disposed,
      payloadRetention: "none_refs_and_coordinates_only",
      recordingArtifactAuthority: "none",
      transcriptAuthority: "none",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
    });

  const executeVoice = async (
    command: Extract<
      LearningV2ActivityCompactActionCommandV1,
      { kind: "voice_control" }
    >,
  ): Promise<LearningV2ActivityCompactActionExecutionResultV1> => {
    if (disposed)
      return Object.freeze({ kind: "voice_result", outcome: "disposed" });
    if (
      (command.command === "start" && voiceState !== "idle") ||
      (command.command === "stop" && voiceState !== "recording")
    )
      return Object.freeze({
        kind: "voice_result",
        outcome: "invalid_transition",
      });
    voiceState = command.command === "start" ? "starting" : "stopping";
    try {
      const operation = Promise.resolve(
        ports.voiceControl({
          command: command.command,
          interaction: command.interaction,
        }),
      );
      pendingVoicePort = operation;
      const outcome = await operation;
      if (pendingVoicePort === operation) pendingVoicePort = null;
      if (!isVoiceOutcome(outcome)) fail();
      if (command.command === "start" && outcome === "started") {
        if (disposed) {
          voiceState = "stopping";
          try {
            await ports.voiceControl({
              command: "stop",
              interaction: "lifecycle",
            });
          } catch (e) {
      // The native owner still owns its revocation cleanup.
      console.warn('[silent-catch] activity_compact_action_executor_v1:outcome', e instanceof Error ? e.message : String(e));
    }
          voiceState = "idle";
          return Object.freeze({ kind: "voice_result", outcome: "disposed" });
        }
        voiceState = "recording";
      } else {
        voiceState = "idle";
      }
      return Object.freeze({ kind: "voice_result", outcome });
    } catch {
      pendingVoicePort = null;
      voiceState = "idle";
      return Object.freeze({ kind: "voice_result", outcome: "failed" });
    }
  };

  const executor: LearningV2ActivityCompactActionExecutorV1 = Object.freeze({
    getSnapshot: snapshot,
    execute: async (
      rawCommand: LearningV2ActivityCompactActionCommandV1,
    ): Promise<LearningV2ActivityCompactActionExecutionResultV1> => {
      const command = exactCommand(rawCommand);
      if (command.kind === "voice_control") return executeVoice(command);
      if (disposed) {
        return Object.freeze({
          kind:
            command.kind === "open_report" ? "report_result" : "save_result",
          outcome: "disposed",
        }) as LearningV2ActivityCompactActionExecutionResultV1;
      }
      if (voiceState !== "idle") {
        return Object.freeze({
          kind:
            command.kind === "open_report" ? "report_result" : "save_result",
          outcome: "busy_recording",
        }) as LearningV2ActivityCompactActionExecutionResultV1;
      }
      if (command.kind === "open_report") {
        try {
          await ports.openReport({
            reportContextRef: command.reportContextRef,
            identity: command.identity,
          });
          return Object.freeze({ kind: "report_result", outcome: "opened" });
        } catch {
          return Object.freeze({ kind: "report_result", outcome: "failed" });
        }
      }
      if (saveState === "saving") {
        return Object.freeze({
          kind: "save_result",
          outcome: "in_progress",
        });
      }
      saveState = "saving";
      try {
        const outcome = await ports.savePhrase({
          savablePhraseRef: command.savablePhraseRef,
          identity: command.identity,
        });
        if (!isSaveOutcome(outcome)) fail();
        return Object.freeze({ kind: "save_result", outcome });
      } catch {
        return Object.freeze({ kind: "save_result", outcome: "failed" });
      } finally {
        saveState = "idle";
      }
    },
    dispose: async (): Promise<void> => {
      if (disposed) return;
      disposed = true;
      if (voiceState === "starting" && pendingVoicePort) {
        try {
          await pendingVoicePort;
        } catch (e) {
      // executeVoice converts the failure to a typed result.
      console.warn('[silent-catch] activity_compact_action_executor_v1:outcome', e instanceof Error ? e.message : String(e));
    }
      }
      if (voiceState === "recording") {
        voiceState = "stopping";
        try {
          await ports.voiceControl({
            command: "stop",
            interaction: "lifecycle",
          });
        } catch (e) {
      // The native owner is responsible for releasing its recording lease.
      console.warn('[silent-catch] activity_compact_action_executor_v1:outcome', e instanceof Error ? e.message : String(e));
    }
      }
      voiceState = "idle";
    },
  });
  executorHandles.add(executor);
  return executor;
}

export function isLearningV2ActivityCompactActionExecutorV1(
  value: unknown,
): value is LearningV2ActivityCompactActionExecutorV1 {
  return (
    typeof value === "object" && value !== null && executorHandles.has(value)
  );
}
