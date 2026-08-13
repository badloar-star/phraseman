import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";
import {
  isLearningV2ActivityAuxiliaryClientDescriptorV1,
  type LearningV2ActivityAuxiliaryClientDescriptorV1,
} from "./activity_auxiliary_client_descriptor_v1";
import type { LearningV2ActivityLearnerActionEntryV1 } from "./activity_learner_action_resource_v1";

export const LEARNING_V2_ACTIVITY_AUXILIARY_SESSION_RUNTIME_SCHEMA_V1 =
  "learning-v2-activity-auxiliary-session-runtime.v1" as const;

export type LearningV2ActivityAuxiliaryRuntimeTaskV1 = Readonly<{
  slot: number;
  action: LearningV2ActivityLearnerActionEntryV1;
  secondErrorExplanation: Readonly<{
    explanationRef: string;
    text: string;
    interfaceLocale: LearningV2InterfaceLocale;
  }>;
  audioAvailable: boolean;
  postTerminalSaveAvailable: boolean;
}>;

export interface LearningV2ActivityAuxiliarySessionRuntimeV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_AUXILIARY_SESSION_RUNTIME_SCHEMA_V1;
  readonly descriptorFingerprint: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly interfaceLocale: LearningV2InterfaceLocale;
  readonly taskCount: 12;
  readonly transportDependency: "none_after_verified_descriptor_mount";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
  readonly resolveTaskBySlot: (
    slot: number,
  ) => LearningV2ActivityAuxiliaryRuntimeTaskV1;
  readonly getDescriptor: () => LearningV2ActivityAuxiliaryClientDescriptorV1;
}

const runtimeHandles = new WeakSet<object>();

function fail(): never {
  throw new Error("learning_v2_activity_auxiliary_session_runtime_invalid");
}

export function createLearningV2ActivityAuxiliarySessionRuntimeV1(input: {
  descriptor: LearningV2ActivityAuxiliaryClientDescriptorV1;
  interfaceLocale: LearningV2InterfaceLocale;
}): LearningV2ActivityAuxiliarySessionRuntimeV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "descriptor|interfaceLocale" ||
    !isLearningV2ActivityAuxiliaryClientDescriptorV1(input.descriptor)
  )
    fail();
  const descriptor = input.descriptor;
  if (!(input.interfaceLocale in descriptor.errorExplanations[0].textByLocale))
    fail();

  const tasks = new Map<number, LearningV2ActivityAuxiliaryRuntimeTaskV1>();
  descriptor.actionResource.entries.forEach((action, index) => {
    const explanation = descriptor.errorExplanations[index];
    const terminalCard = descriptor.postTerminalCards.entries[index];
    if (
      !explanation ||
      explanation.taskId !== action.taskId ||
      explanation.activityId !== action.activityId ||
      !terminalCard ||
      terminalCard.taskId !== action.taskId ||
      terminalCard.activityId !== action.activityId ||
      terminalCard.savablePhraseRef !== action.save.savablePhraseRef ||
      tasks.has(action.slot)
    )
      fail();
    const audioAvailable = descriptor.audioRuntime.entries.some(
      (entry) => entry.taskId === action.taskId,
    );
    tasks.set(
      action.slot,
      Object.freeze({
        slot: action.slot,
        action,
        secondErrorExplanation: Object.freeze({
          explanationRef: explanation.explanationRef,
          text: explanation.textByLocale[input.interfaceLocale],
          interfaceLocale: input.interfaceLocale,
        }),
        audioAvailable,
        postTerminalSaveAvailable: true,
      }),
    );
  });
  if (tasks.size !== 12) fail();

  const runtime: LearningV2ActivityAuxiliarySessionRuntimeV1 = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_SESSION_RUNTIME_SCHEMA_V1,
    descriptorFingerprint: descriptor.descriptorFingerprint,
    activeManifestHash: descriptor.activeManifestHash,
    episodeId: descriptor.episodeId,
    sessionId: descriptor.sessionId,
    sessionOrdinal: descriptor.sessionOrdinal,
    interfaceLocale: input.interfaceLocale,
    taskCount: 12,
    transportDependency: "none_after_verified_descriptor_mount",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    releaseAuthority: false,
    resolveTaskBySlot: (slot: number) => {
      if (!Number.isSafeInteger(slot) || slot < 1 || slot > 12) fail();
      const task = tasks.get(slot);
      if (!task) fail();
      return task;
    },
    getDescriptor: () => descriptor,
  });
  runtimeHandles.add(runtime);
  return runtime;
}

export function isLearningV2ActivityAuxiliarySessionRuntimeV1(
  value: unknown,
): value is LearningV2ActivityAuxiliarySessionRuntimeV1 {
  return (
    typeof value === "object" && value !== null && runtimeHandles.has(value)
  );
}
