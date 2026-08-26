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
