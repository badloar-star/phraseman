export type LearningV2Session1VoiceDevJumpInteractionV1 = {
  readonly family: string;
};

export function resolveLearningV2Session1VoiceDevJumpV1(input: {
  readonly isDev: boolean;
  readonly lessonOrdinal: number | null;
  readonly sessionOrdinal: number | null;
  readonly interactions: readonly LearningV2Session1VoiceDevJumpInteractionV1[];
}): number | null {
  if (
    !input.isDev ||
    input.lessonOrdinal !== 1 ||
    input.sessionOrdinal !== 1
  )
    return null;
  const index = input.interactions.findIndex(
    (interaction) => interaction.family === "scripted_repeat_compare",
  );
  return index >= 0 ? index : null;
}

export function runLearningV2Session1VoiceDevJumpV1(
  practiceIndex: number | null,
  controls: {
    readonly settleSkippedPrefix: (practiceIndex: number) => void;
    readonly enterPractice: () => void;
    readonly showPracticeIndex: (index: number) => void;
  },
): boolean {
  if (practiceIndex === null) return false;
  controls.settleSkippedPrefix(practiceIndex);
  controls.enterPractice();
  controls.showPracticeIndex(practiceIndex);
  return true;
}
