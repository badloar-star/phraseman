export function learningV2PreviewSpeechWatchdogMsV1(text: string): number {
  const wordCount = Math.max(1, text.trim().split(/\s+/u).filter(Boolean).length);
  return Math.max(2_500, Math.min(9_000, wordCount * 900 + 1_800));
}

export type LearningV2PreviewSpeechGenerationV1 = Readonly<{
  generation: number;
  key: string;
}>;

export function createLearningV2PreviewSpeechGenerationGuardV1(): Readonly<{
  begin: (key: string) => LearningV2PreviewSpeechGenerationV1;
  clear: (request: LearningV2PreviewSpeechGenerationV1) => boolean;
  cancelCurrent: () => void;
  currentKey: () => string | null;
}> {
  let generation = 0;
  let current: LearningV2PreviewSpeechGenerationV1 | null = null;
  return Object.freeze({
    begin(key: string) {
      current = Object.freeze({ generation: ++generation, key });
      return current;
    },
    clear(request: LearningV2PreviewSpeechGenerationV1) {
      if (current?.generation !== request.generation) return false;
      current = null;
      return true;
    },
    cancelCurrent() {
      generation += 1;
      current = null;
    },
    currentKey() {
      return current?.key ?? null;
    },
  });
}
