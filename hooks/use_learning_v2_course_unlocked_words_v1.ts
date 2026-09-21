import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  learningV2UnlockedLessonWordsAccountScopeV1,
  loadLearningV2CourseUnlockedWordsV1,
  subscribeLearningV2CourseUnlockedWordsV1,
  type LearningV2UnlockedLessonWordV1,
} from "../app/learning_v2_unlocked_lesson_words_v1";
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
} from "../app/account_generation";

/**
 * Слова ВСЕГО курса для словаря в шапке карты.
 *
 * зачем: владелец 21.09 выбрал «все открытые слова курса». Соседний хук
 * `useLearningV2UnlockedLessonWordsV1` остаётся как есть — он питает плеер
 * занятия, которому нужен РОВНО текущий урок (по нему считается, какие слова
 * уже показывали внутри сессии). Смешивать эти два смысла в одном хуке нельзя:
 * плеер начал бы считать открытыми слова из других уроков.
 *
 * Чтение — один `multiGet` на все уроки, подписка — на каждый урок, чтобы
 * слово, открытое в другом уроке, появилось в уже открытой шторке.
 */
export function useLearningV2CourseUnlockedWordsV1(
  scope: {
    targetLanguage: string;
    lessonOrdinals: readonly number[];
  } | null,
  options: Readonly<{ includeAuthoringPreview?: boolean }> = {},
): Readonly<{
  words: readonly LearningV2UnlockedLessonWordV1[];
  hydrated: boolean;
  refresh: () => Promise<void>;
}> {
  const targetLanguage = scope?.targetLanguage ?? null;
  const includeAuthoringPreview = options.includeAuthoringPreview === true;
  // Ключ по СОДЕРЖИМОМУ списка уроков: вызывающий почти всегда собирает массив
  // инлайном, и по ссылке эффект перезапускался бы на каждый рендер.
  const lessonOrdinalsKey = scope?.lessonOrdinals.join(",") ?? "";
  const lessonOrdinals = useMemo(
    () => (lessonOrdinalsKey ? lessonOrdinalsKey.split(",").map(Number) : []),
    [lessonOrdinalsKey],
  );
  const [accountToken, setAccountToken] = useState(captureAccountGeneration);
  useEffect(() => {
    const subscription = subscribeAccountGeneration(setAccountToken);
    return () => subscription.remove();
  }, []);
  const accountScope = useMemo(
    () => learningV2UnlockedLessonWordsAccountScopeV1(accountToken),
    [accountToken],
  );
  const requestedScopeKey =
    targetLanguage && lessonOrdinals.length > 0 && accountScope
      ? `${accountScope.accountScopeHash}:${accountScope.accountGeneration}:${targetLanguage}:${lessonOrdinalsKey}:${includeAuthoringPreview ? "preview" : "learner"}`
      : null;
  const requestRevisionRef = useRef(0);
  const [snapshot, setSnapshot] = useState<Readonly<{
    scopeKey: string | null;
    words: readonly LearningV2UnlockedLessonWordV1[];
  }>>({ scopeKey: null, words: Object.freeze([]) });

  const refresh = useCallback(async () => {
    const revision = ++requestRevisionRef.current;
    if (!accountScope || !targetLanguage || !requestedScopeKey) {
      setSnapshot({ scopeKey: null, words: Object.freeze([]) });
      return;
    }
    const words = await loadLearningV2CourseUnlockedWordsV1(
      accountScope,
      targetLanguage,
      lessonOrdinals,
      includeAuthoringPreview,
    );
    // Поздний ответ не затирает свежий запрос (защита от гонки при быстром
    // переключении аккаунта или языка).
    if (revision !== requestRevisionRef.current) return;
    setSnapshot({ scopeKey: requestedScopeKey, words });
  }, [accountScope, includeAuthoringPreview, lessonOrdinals, requestedScopeKey, targetLanguage]);

  useEffect(() => {
    const revision = ++requestRevisionRef.current;
    if (!accountScope || !targetLanguage || !requestedScopeKey) {
      setSnapshot({ scopeKey: null, words: Object.freeze([]) });
      return;
    }
    let mounted = true;
    const load = async () => {
      const words = await loadLearningV2CourseUnlockedWordsV1(
        accountScope,
        targetLanguage,
        lessonOrdinals,
        includeAuthoringPreview,
      );
      if (mounted && revision === requestRevisionRef.current) {
        setSnapshot({ scopeKey: requestedScopeKey, words });
      }
    };
    void load();
    const unsubscribe = subscribeLearningV2CourseUnlockedWordsV1(
      accountScope,
      targetLanguage,
      lessonOrdinals,
      includeAuthoringPreview,
      () => { void load(); },
    );
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [accountScope, includeAuthoringPreview, lessonOrdinals, requestedScopeKey, targetLanguage]);

  const hydrated = requestedScopeKey === snapshot.scopeKey;
  return {
    words: hydrated ? snapshot.words : Object.freeze([]),
    hydrated,
    refresh,
  };
}
