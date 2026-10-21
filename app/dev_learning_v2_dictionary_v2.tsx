// ═══════════════════════════════════════════════════════════
// dev_learning_v2_dictionary_v2 — DEV-маршрут нового словаря Learning V2 (вариант A dictionary-v2.html) для «Сверки».
//
// зачем (координатор 22.10 ночью): подключение словаря к вкладке «Уроки» решится утром (у файла вкладки неизвестный
// автор незакоммиченной правки), а «Сверке» экран нужен уже сейчас. Слова — настоящие открытые слова курса с телефона
// (тот же хук, что у вкладки), без сети. Состояния: ?state=list (по умолчанию) | empty | offline.
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";

import LearningV2DictionaryV2 from "../components/learning-v2/LearningV2DictionaryV2";
import { useStudyTarget } from "../components/StudyTargetContext";
import { useLearningV2CourseUnlockedWordsV1 } from "../hooks/use_learning_v2_course_unlocked_words_v1";
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from "./config";
import type { CardsTrainingRoute } from "./flashcards/training_entry";
import { safeRouterBack } from "./navigation_back";

const LOG = "[V2-DICT]";
const ALL_LESSONS = Array.from({ length: 32 }, (_, index) => index + 1);

export default function DevLearningV2DictionaryV2() {
  const params = useLocalSearchParams<{ state?: string | string[] }>();
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const raw = Array.isArray(params.state) ? params.state[0] : params.state;
  const state = raw === "empty" || raw === "offline" ? raw : "list";
  const scope = useMemo(() => ({ targetLanguage: "en", lessonOrdinals: ALL_LESSONS }), []);
  const { words, hydrated } = useLearningV2CourseUnlockedWordsV1(scope, { includeAuthoringPreview: true });
  const onNavigate = useCallback((route: CardsTrainingRoute) => {
    router.push({ pathname: route.pathname, params: route.params } as never);
  }, [router]);
  const onLimitReached = useCallback(() => {
    router.push({ pathname: "/premium_modal", params: { context: "flashcard_limit", source: "learning_v2_dictionary" } } as never);
  }, [router]);

  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) {
    console.warn(`${LOG} dev_route: отклонено — не dev-сборка, уводим на Главную`); // guard-ok: ранний выход логируется
    return <Redirect href="/" />;
  }
  console.log(`${LOG} dev_route state=${state} words=${words.length} hydrated=${hydrated}`); // guard-ok: строка на показ
  return (
    <LearningV2DictionaryV2
      words={state === "empty" ? [] : words}
      studyTarget={studyTarget}
      offline={state === "offline"}
      onClose={() => safeRouterBack(router)}
      onNavigate={onNavigate}
      onLimitReached={onLimitReached}
      onGoToEpisodeOne={() => safeRouterBack(router)}
    />
  );
}
