import type { LearningV2NewWordAudioStateV1 } from "./learning_v2_new_word_encounter_copy";

export function learningV2NewWordAudioEnabledV1(
  state: LearningV2NewWordAudioStateV1,
): boolean {
  return state !== "unavailable";
}

export function createLearningV2NewWordAutoFlipControllerV1(input: Readonly<{
  delayMs: number;
  schedule: (callback: () => void, delayMs: number) => unknown;
  cancel: (timer: unknown) => void;
  onAutoFlip: () => void;
}>): Readonly<{
  arm: () => void;
  manualFlip: () => void;
  dispose: () => void;
}> {
  let timer: unknown = null;
  let manuallyFlipped = false;
  const cancel = () => {
    if (timer === null) return;
    input.cancel(timer);
    timer = null;
  };
  return Object.freeze({
    arm() {
      cancel();
      manuallyFlipped = false;
      timer = input.schedule(() => {
        timer = null;
        if (!manuallyFlipped) input.onAutoFlip();
      }, input.delayMs);
    },
    manualFlip() {
      manuallyFlipped = true;
      cancel();
    },
    dispose: cancel,
  });
}
