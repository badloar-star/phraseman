import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  loadLearningV2VisibleUnlockedLessonWordsV1,
  subscribeLearningV2AuthoringPreviewUnlockedLessonWordsV1,
  subscribeLearningV2UnlockedLessonWordsV1,
  type LearningV2UnlockedLessonWordV1,
} from "../app/learning_v2_unlocked_lesson_words_v1";

export function useLearningV2UnlockedLessonWordsV1(
  scope: {
    targetLanguage: string;
    lessonOrdinal: number;
  } | null,
  options: Readonly<{ includeAuthoringPreview?: boolean }> = {},
): Readonly<{
  words: readonly LearningV2UnlockedLessonWordV1[];
  hydrated: boolean;
  refresh: () => Promise<void>;
}> {
  const targetLanguage = scope?.targetLanguage ?? null;
  const lessonOrdinal = scope?.lessonOrdinal ?? null;
  const includeAuthoringPreview = options.includeAuthoringPreview === true;
  const requestedScopeKey = targetLanguage && lessonOrdinal
    ? `${targetLanguage}:${lessonOrdinal}:${includeAuthoringPreview ? "preview" : "learner"}`
    : null;
  const requestRevisionRef = useRef(0);
  const [snapshot, setSnapshot] = useState<Readonly<{
    scopeKey: string | null;
    words: readonly LearningV2UnlockedLessonWordV1[];
  }>>({ scopeKey: null, words: Object.freeze([]) });

  const activeScope = useMemo(
    () =>
      targetLanguage && lessonOrdinal
        ? { targetLanguage, lessonOrdinal }
        : null,
    [lessonOrdinal, targetLanguage],
  );

  const refresh = useCallback(async () => {
    const revision = ++requestRevisionRef.current;
    if (!activeScope || !requestedScopeKey) {
      setSnapshot({ scopeKey: null, words: Object.freeze([]) });
      return;
    }
    const words = await loadLearningV2VisibleUnlockedLessonWordsV1(
      activeScope,
      includeAuthoringPreview,
    );
    if (revision !== requestRevisionRef.current) return;
    setSnapshot({ scopeKey: requestedScopeKey, words });
  }, [activeScope, includeAuthoringPreview, requestedScopeKey]);

  useEffect(() => {
    const revision = ++requestRevisionRef.current;
    if (!activeScope || !requestedScopeKey) {
      setSnapshot({ scopeKey: null, words: Object.freeze([]) });
      return;
    }
    let mounted = true;
    const load = async () => {
      const words = await loadLearningV2VisibleUnlockedLessonWordsV1(
        activeScope,
        includeAuthoringPreview,
      );
      if (mounted && revision === requestRevisionRef.current) {
        setSnapshot({ scopeKey: requestedScopeKey, words });
      }
    };
    void load();
    const unsubscribeLearner = subscribeLearningV2UnlockedLessonWordsV1(activeScope, () => {
      void load();
    });
    const unsubscribePreview = includeAuthoringPreview
      ? subscribeLearningV2AuthoringPreviewUnlockedLessonWordsV1(activeScope, () => {
          void load();
        })
      : () => {};
    return () => {
      mounted = false;
      unsubscribeLearner();
      unsubscribePreview();
    };
  }, [activeScope, includeAuthoringPreview, requestedScopeKey]);

  const hydrated = requestedScopeKey === snapshot.scopeKey;
  return {
    words: hydrated ? snapshot.words : Object.freeze([]),
    hydrated,
    refresh,
  };
}
