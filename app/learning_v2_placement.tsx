// learning_v2_placement.tsx — экран теста «Не хочу с начала» (макет chapter-exam-season.html, раздел 6): старт → вопросы по темам уроков → итог.
// зачем (координатор 24.10: «только интерфейс, 1 в 1, за флагом»): здесь только показ и переходы. Счёт — движок `placement_test_v1.ts` (чистые функции, не меняем),
// вопросы и открытие уроков — через мост `placement_bridge.ts` (живая реализация на данных Learning V2 — placement_bridge_live.tsx). Нет флага — тест недоступен, экран уводит обратно с причиной в журнале.
// Журнал [PLACEMENT-UI]: вход, каждый ответ и решение по теме, конец теста, закрытие.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useLv2Glass } from '../components/learning-v2/LearningV2Glass';
import { learningV2ChapterExamCopy } from '../components/learning-v2/learning_v2_chapter_exam_copy';
import { PlacementTopBar, PlacementTopicCard } from '../components/learning-v2/placement/PlacementChrome';
import { PlacementResultView } from '../components/learning-v2/placement/PlacementResultView';
import { PlacementStartView } from '../components/learning-v2/placement/PlacementStartView';
import { LEARNING_V2_PLACEMENT_UI_ENABLED } from '../components/learning-v2/placement/placement_flags';
import { PLACEMENT_LOG, type PlacementBridgeV1 } from '../components/learning-v2/placement/placement_bridge';
import { createLivePlacementBridge } from '../components/learning-v2/placement/placement_bridge_live';
import { placementCopy } from '../components/learning-v2/placement/placement_copy';
import { placementQuestionView, placementResultView } from '../components/learning-v2/placement/placement_view_model';
import {
  answerPlacementTestV1,
  placementCurrentLessonV1,
  placementTestResultV1,
  startPlacementTestV1,
  type PlacementTestStateV1,
} from '../modules/learning-v2/exam/placement_test_v1';
import { safeRouterBack } from './navigation_back';
import { LEARNING_V2_HIDDEN_REDIRECT, isLearningV2Hidden, logLearningV2Hidden } from './learning_v2_visibility_switch';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

const FALLBACK_ROUTE = '/(tabs)/lessons';

export default function LearningV2PlacementScreen() {
  // зачем (план Б 16.10, как у экзамена главы): при скрытом V2 ссылка на тест ведёт на Главную, а не в пустой раздел
  if (isLearningV2Hidden()) {
    logLearningV2Hidden('route_learning_v2_placement', LEARNING_V2_HIDDEN_REDIRECT);
    return <Redirect href={LEARNING_V2_HIDDEN_REDIRECT} />;
  }
  if (!LEARNING_V2_PLACEMENT_UI_ENABLED) {
    console.warn(PLACEMENT_LOG, 'unavailable', JSON.stringify({ flag: LEARNING_V2_PLACEMENT_UI_ENABLED, decided: 'redirect' })); // guard-ok: ранний выход пишет причину
    return <Redirect href={FALLBACK_ROUTE as never} />;
  }
  return <PlacementRunLive />;
}

// зачем: живой мост на данных Learning V2 (app/learning_v2_placement_v1.ts); собирается один раз на язык и вход, не на каждый кадр
function PlacementRunLive() {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const bridge = useMemo(() => createLivePlacementBridge({ lang, studyTarget, push: (href) => router.push(href as never) }), [lang, router, studyTarget]);
  return <PlacementRun bridge={bridge} />;
}

type Stage = 'start' | 'question' | 'result';

function PlacementRun({ bridge }: Readonly<{ bridge: PlacementBridgeV1 }>) {
  const router = useRouter();
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const [stage, setStage] = useState<Stage>('start');
  const [state, setState] = useState<PlacementTestStateV1>(() => startPlacementTestV1(bridge.lessons));
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  // зачем: какие вопросы по текущей теме уже были — чтобы «ещё 2» не повторяли первый; сбрасывается со сменой темы
  const usedRef = useRef<Readonly<{ lessonOrdinal: number | null; ids: readonly string[] }>>({ lessonOrdinal: null, ids: [] });
  const lastCorrectRef = useRef<boolean | null>(null);
  const closeLabel = learningV2ChapterExamCopy(lang, 'later');

  const close = useCallback((reason: string) => {
    console.log(PLACEMENT_LOG, 'close', JSON.stringify({ reason, stage, index: state.index, decided: state.outcomes.length })); // guard-ok: выход и причина
    safeRouterBack(router, FALLBACK_ROUTE as never);
  }, [router, stage, state.index, state.outcomes.length]);

  const lessonTitle = useCallback((lessonOrdinal: number) => bridge.lessonTitle(lessonOrdinal, lang), [bridge, lang]);

  const view = useMemo(() => placementQuestionView(state), [state]);
  const question = useMemo(() => {
    const lessonOrdinal = placementCurrentLessonV1(state);
    if (stage !== 'question' || lessonOrdinal === null) return null;
    const ids = usedRef.current.lessonOrdinal === lessonOrdinal ? usedRef.current.ids : [];
    const picked = bridge.questionFor({ lessonOrdinal, attemptIndex: state.attempts.length, usedInteractionIds: ids });
    console.log(PLACEMENT_LOG, 'question', JSON.stringify({ lessonOrdinal, attemptIndex: state.attempts.length, used: ids.length, interactionId: picked?.interactionId ?? null })); // guard-ok: какой вопрос выбран
    return picked;
  }, [bridge, stage, state]);

  const finish = useCallback((finalState: PlacementTestStateV1, stopLesson: number | null) => {
    const result = placementResultView(finalState, stopLesson);
    console.log(PLACEMENT_LOG, 'finished', JSON.stringify({ start: result.startLessonOrdinal, opened: result.openedLessonOrdinals.length, stoppedAt: stopLesson })); // guard-ok: итог теста
    // зачем: итог показываем сразу (экран не ждёт запись прогресса); не записалось — причина в журнале, повтор за Learning V2
    void bridge.applyResult({ startLessonOrdinal: result.startLessonOrdinal, openedLessonOrdinals: result.openedLessonOrdinals }).catch((error: unknown) => {
      console.warn(PLACEMENT_LOG, 'apply_failed', JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    });
    setStoppedAt(stopLesson);
    setStage('result');
  }, [bridge]);

  const onStart = useCallback(() => {
    console.log(PLACEMENT_LOG, 'start', JSON.stringify({ lessons: state.lessons.length, alreadyFinished: state.finished })); // guard-ok: вход в тест
    if (state.finished) { finish(state, null); return; }
    setStage('question');
  }, [finish, state]);

  const onAnswered = useCallback((correct: boolean) => {
    lastCorrectRef.current = correct;
    console.log(PLACEMENT_LOG, 'answered', JSON.stringify({ lessonOrdinal: placementCurrentLessonV1(state), correct, attempts: state.attempts.length + 1 })); // guard-ok: ответ
  }, [state]);

  const onNext = useCallback(() => {
    const correct = lastCorrectRef.current;
    if (correct === null) {
      console.warn(PLACEMENT_LOG, 'next_without_answer', JSON.stringify({ index: state.index })); // guard-ok: ранний выход пишет причину
      return;
    }
    lastCorrectRef.current = null;
    const lessonOrdinal = placementCurrentLessonV1(state);
    if (question && lessonOrdinal !== null) {
      const ids = usedRef.current.lessonOrdinal === lessonOrdinal ? usedRef.current.ids : [];
      usedRef.current = { lessonOrdinal, ids: [...ids, question.interactionId] };
    }
    const next = answerPlacementTestV1(state, correct);
    console.log(PLACEMENT_LOG, 'next', JSON.stringify({ lessonOrdinal, correct, nextIndex: next.index, nextAttempts: next.attempts.length, finished: next.finished })); // guard-ok: переход
    setState(next);
    if (next.finished) finish(next, null);
  }, [finish, question, state]);

  // зачем: у темы нет вопроса в пуле — тест не застревает: останавливаемся на этой теме (как на незасчитанной) и показываем итог по пройденному
  const missingQuestion = stage === 'question' && question === null;
  React.useEffect(() => {
    if (!missingQuestion) return;
    const lessonOrdinal = placementCurrentLessonV1(state);
    console.warn(PLACEMENT_LOG, 'no_question', JSON.stringify({ lessonOrdinal, attempts: state.attempts.length })); // guard-ok: пустой пул
    finish(state, lessonOrdinal);
  }, [finish, missingQuestion, state]);

  const result = useMemo(() => placementResultView(state, stoppedAt), [state, stoppedAt]);

  return (
    <View style={[styles.screen, { backgroundColor: g.bg, paddingTop: stage === 'question' ? insets.top : 0 }]}>
      {stage === 'start' ? (
        <PlacementStartView lang={lang} topInset={insets.top} bottomInset={insets.bottom} onStart={onStart} onStartOver={() => close('start_over')} onClose={() => close('start_close')} closeLabel={closeLabel} />
      ) : null}
      {stage === 'question' && view ? (
        <>
          <PlacementTopBar topInset={0} closeLabel={closeLabel} onClose={() => close('question_close')} progress={{ fraction: view.progress, label: placementCopy(lang, 'progress', { n: view.position, of: view.total }) }} />
          {question ? (
            <bridge.QuestionRenderer
              key={`${question.interactionId}:${state.attempts.length}`}
              question={question}
              bottomInset={insets.bottom}
              onAnswered={onAnswered}
              onNext={onNext}
              header={(
                <View>
                  <PlacementTopicCard lang={lang} lessonOrdinal={view.lessonOrdinal} title={lessonTitle(view.lessonOrdinal)} dots={view.dots} />
                  {/* зачем (владелец 25.10 «не надо плашку»): «ещё N вопросов по теме» не показываем — повтор по теме идёт молча, точки попыток остаются */}
                </View>
              )}
            />
          ) : <View style={styles.flex} />}
        </>
      ) : null}
      {stage === 'result' ? (
        <PlacementResultView lang={lang} topInset={insets.top} bottomInset={insets.bottom} result={result} lessonTitle={lessonTitle}
          onStartLesson={() => {
            const lessonOrdinal = result.startLessonOrdinal ?? (result.openedLessonOrdinals[result.openedLessonOrdinals.length - 1] ?? 0) + 1;
            console.log(PLACEMENT_LOG, 'start_lesson', JSON.stringify({ lessonOrdinal })); // guard-ok: куда ведёт кнопка
            bridge.startLesson(lessonOrdinal);
          }}
          onClose={() => close('result_close')} closeLabel={closeLabel} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
});
