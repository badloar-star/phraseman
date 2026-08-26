import { useCallback, useEffect, useState } from "react";

import {
  loadLearningV2UnlockedLessonWordsV1,
  subscribeLearningV2UnlockedLessonWordsV1,
  type LearningV2UnlockedLessonWordV1,
} from "../app/learning_v2_unlocked_lesson_words_v1";

export function useLearningV2UnlockedLessonWordsV1(scope: {
  targetLanguage: string;
  lessonOrdinal: number;
} | null): Readonly<{
  words: readonly LearningV2UnlockedLessonWordV1[];
  refresh: () => Promise<void>;
}> {
  const [words, setWords] = useState<readonly LearningV2UnlockedLessonWordV1[]>([]);
  const targetLanguage = scope?.targetLanguage ?? null;
  const lessonOrdinal = scope?.lessonOrdinal ?? null;

  const refresh = useCallback(async () => {
    if (!targetLanguage || !lessonOrdinal) {
      setWords([]);
      return;
    }
    setWords(
      await loadLearningV2UnlockedLessonWordsV1({
        targetLanguage,
        lessonOrdinal,
      }),
    );
  }, [lessonOrdinal, targetLanguage]);

  useEffect(() => {
    if (!targetLanguage || !lessonOrdinal) {
      setWords([]);
      return;
    }
    const activeScope = { targetLanguage, lessonOrdinal };
    let mounted = true;
    const load = async () => {
      const next = await loadLearningV2UnlockedLessonWordsV1(activeScope);
      if (mounted) setWords(next);
    };
    void load();
    const unsubscribe = subscribeLearningV2UnlockedLessonWordsV1(activeScope, () => {
      void load();
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [lessonOrdinal, targetLanguage]);

  return { words, refresh };
}
