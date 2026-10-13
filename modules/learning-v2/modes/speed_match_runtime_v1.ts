import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";
import type { LearningV2ModeNativePayloadV1 } from "../contracts/mode_native_payload_v1";

export type LearningV2SpeedMatchRoundPhaseV1 = "active" | "finish_timeout";

export type LearningV2SpeedMatchRoundStateV1 = Readonly<{
  phase: LearningV2SpeedMatchRoundPhaseV1;
  timerEnabled: boolean;
  expire: () => LearningV2SpeedMatchRoundStateV1;
  restart: (input?: Readonly<{ timerEnabled?: boolean }>) => LearningV2SpeedMatchRoundStateV1;
}>;

function roundState(
  phase: LearningV2SpeedMatchRoundPhaseV1,
  timerEnabled: boolean,
): LearningV2SpeedMatchRoundStateV1 {
  return Object.freeze({
    phase,
    timerEnabled,
    expire() {
      if (!timerEnabled || phase !== "active") return roundState(phase, timerEnabled);
      return roundState("finish_timeout", timerEnabled);
    },
    restart(input) {
      return roundState("active", input?.timerEnabled ?? timerEnabled);
    },
  });
}

export function createLearningV2SpeedMatchRoundStateV1(
  input: Readonly<{ timerEnabled?: boolean }> = {},
): LearningV2SpeedMatchRoundStateV1 {
  return roundState("active", input.timerEnabled ?? true);
}

export function learningV2SpeedMatchCanPickV1(
  state: LearningV2SpeedMatchRoundStateV1,
): boolean {
  return state.phase === "active";
}

export type LearningV2SpeedMatchMismatchExplanationV1 = Readonly<{
  selectedTarget: string;
  selectedMeaning: string;
  selectedTargetExplanation: string;
  meaningOwnerTarget: string;
  meaningOwnerExplanation: string;
}>;

export function resolveLearningV2SpeedMatchMismatchExplanationV1({
  interfaceLocale,
  leftPairId,
  rightPairId,
  payload,
}: Readonly<{
  interfaceLocale: LearningV2InterfaceLocale;
  leftPairId: string;
  rightPairId: string;
  payload: Extract<LearningV2ModeNativePayloadV1, { family: "speed_match" }>;
}>): LearningV2SpeedMatchMismatchExplanationV1 | null {
  const selectedTarget = payload.pairGrid.find((pair) => pair.pairId === leftPairId);
  const selectedMeaningOwner = payload.pairGrid.find((pair) => pair.pairId === rightPairId);
  const selectedTargetExplanation = selectedTarget?.analysisV1?.matchExplanationByLocale?.[interfaceLocale]?.trim();
  const meaningOwnerExplanation = selectedMeaningOwner?.analysisV1?.matchExplanationByLocale?.[interfaceLocale]?.trim();
  if (!selectedTarget || !selectedMeaningOwner || !selectedTargetExplanation || !meaningOwnerExplanation) return null;
  return Object.freeze({
    selectedTarget: selectedTarget.target,
    selectedMeaning: selectedMeaningOwner.meaningByLocale[interfaceLocale],
    selectedTargetExplanation,
    meaningOwnerTarget: selectedMeaningOwner.target,
    meaningOwnerExplanation,
  });
}
