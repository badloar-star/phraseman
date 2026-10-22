// app/learning-v2/chapter-exam.tsx — экран экзамена главы: 12 вопросов подряд (макет chapter-exam-flow.html / chapter-exam-season.html, раздел 3).
// зачем (координатор 22.10, шаг 2): шапка «Экзамен · n / 12» с прогрессом и крестиком, тело — общий роутер режимов заданий (тот же,
// что в занятии, схема №23), подвал с кнопкой «Проверить» / «Дальше». Одна попытка на вопрос, сердечек и разборов по ходу нет.
// Вопросы и проверка — из встроенного выпуска курса (без сети). 1 энергия списывается при показе первого вопроса (Plus — бесплатно).
// Шаг 3: после 12-го вопроса — итог «X из 12» и разбор ошибок (components/learning-v2/LearningV2ChapterExamResult.tsx).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { SlideInRight, SlideOutLeft, useReducedMotion } from 'react-native-reanimated';

import V2Pressable from '../../components/v2/V2Pressable';
import NoEnergyModal from '../../components/NoEnergyModal';
import LearningV2PracticeViewport from '../../components/learning-v2/LearningV2PracticeViewport';
import { useLang } from '../../components/LangContext';
import { useEnergy } from '../../components/EnergyContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { lv2TaskTokens } from '../../components/learning-v2/learning_v2_task_theme_tokens';
import { learningV2ChapterExamCopy } from '../../components/learning-v2/learning_v2_chapter_exam_copy';
import {
  LearningV2ChapterExamResultView,
  LearningV2ChapterExamReviewView,
  type ChapterExamAnswerDetailV1,
} from '../../components/learning-v2/LearningV2ChapterExamResult';
import { learningV2ChapterExamResultCopy } from '../../components/learning-v2/learning_v2_chapter_exam_result_copy';
import { launchLearningV2SessionByOrdinalsV1 } from '../learning_v2_home_continue_route';
import { grantChapterExamCoinsV1 } from '../learning_v2_chapter_exam_reward_v1';
import { splitLearningV2TaskPromptV1, type LearningV2TaskIconV1 } from '../../modules/learning-v2/runtime/task_prompt_parts_v1';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { safeRouterBack } from '../navigation_back';
import { getStableId } from '../stable_id';
import { studySpeechLocale } from '../study_speech_locale';
import { useAudio } from '../../hooks/use-audio';
import { hapticError, hapticSuccess } from '../../hooks/use-haptics';
import { createEnergySessionIntent } from '../energy_session_operation_ledger';
import { LEARNING_V2_HIDDEN_REDIRECT, isLearningV2Hidden, logLearningV2Hidden } from '../learning_v2_visibility_switch';
import { deriveLocalOfflineProgressAccountScopeHash } from '../../modules/learning-v2/progress/progress_account_scope';
import { CHAPTER_EXAM_QUESTION_COUNT_V1, type ChapterExamQuestionV1 } from '../../modules/learning-v2/exam/chapter_exam_v1';
import LearningV2ModeRouterV1 from '../../modules/learning-v2/modes/mode_router_v1';
import { learningV2ModeCheckLabelV1 } from '../../modules/learning-v2/modes/mode_copy_v1';
import { resolveLearningV2ModeFeedbackV1, type LearningV2ModeLearnerFeedbackV1 } from '../../modules/learning-v2/modes/mode_feedback_v1';
import { sanitizeLearningV2LearnerPromptV1 } from '../../modules/learning-v2/content/learner_prompt_hygiene_v1';
import { stableShuffleLearningV2OptionsV1 } from '../../modules/learning-v2/runtime/stable_option_shuffle_v1';
import { resolveLearningV2CourseSessionDeviceSpeechTextV1 } from '../../modules/learning-v2/runtime/course_session_device_speech_text_v1';
import type { V2LocalEvaluatorResponseV1 } from '../../modules/learning-v2/runtime/local_evaluator_capsule_v1';
import type { LearningV2InterfaceLocale } from '../../modules/learning-v2/content/generator_course_contract';
import {
  checkLearningV2ChapterExamAnswerV1,
  finishLearningV2ChapterExamV1,
  learningV2ChapterExamCorrectAnswerV1,
  learningV2ChapterExamInteractionV1,
  prepareLearningV2ChapterExamV1,
} from '../learning_v2_chapter_exam_v1';

const LOG = '[CHAPTER-EXAM]';

type Answer = ChapterExamAnswerDetailV1;
type Outcome = Readonly<{ correct: number; passed: boolean; openedRange: Readonly<{ first: number; last: number }> | null }>;

// Значок режима — как в теле заданий (LearningV2TaskBody, TASK_ICON).
const TASK_ICON: Readonly<Record<LearningV2TaskIconV1, React.ComponentProps<typeof Ionicons>['name']>> = {
  ear: 'ear', headset: 'headset', puzzle: 'extension-puzzle', create: 'create', swap: 'swap-horizontal', mic: 'mic',
};

/** Номера засчитанных эпизодов → «Эпизоды a–b тоже открыты»; ничего не засчитано — null. */
function openedRangeOf(sessionIds: readonly string[]): Outcome['openedRange'] {
  const ordinals = sessionIds.map((id) => Number(/session[:-]0*(\d+)/u.exec(id)?.[1])).filter((n) => Number.isFinite(n) && n > 0);
  return ordinals.length > 0 ? { first: Math.min(...ordinals), last: Math.max(...ordinals) } : null;
}
type Prepared = Readonly<{ examKey: string; attempt: number; questions: readonly ChapterExamQuestionV1[]; scopeHash: string }>;

export default function LearningV2ChapterExamScreen() {
  // зачем (план Б 16.10): при скрытом V2 ссылка на экзамен ведёт на Главную, а не в пустой раздел
  if (isLearningV2Hidden()) {
    logLearningV2Hidden('route_learning_v2_chapter_exam', LEARNING_V2_HIDDEN_REDIRECT);
    return <Redirect href={LEARNING_V2_HIDDEN_REDIRECT} />;
  }
  return <ChapterExamRun />;
}

function ChapterExamRun() {
  const params = useLocalSearchParams<{ lessonOrdinal?: string; chapterOrdinal?: string; source?: string }>();
  const lessonOrdinal = Number(params.lessonOrdinal) || 1;
  const chapterOrdinal = Number(params.chapterOrdinal) || 1;
  const router = useRouter();
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const locale: 'ru' | 'uk' = lang === 'uk' ? 'uk' : 'ru';
  const { isUnlimited, confirmActivityStart } = useEnergy();
  const { studyTarget } = useStudyTarget();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [noEnergy, setNoEnergy] = useState(false);
  const answersRef = useRef<Answer[]>([]);
  const chargedRef = useRef(false);
  const finishingRef = useRef(false);

  const close = useCallback((reason: string) => {
    console.log(`${LOG} screen:close`, JSON.stringify({ reason, index, answered: answersRef.current.length })); // guard-ok: выход и причина
    safeRouterBack(router, '/learning-v2/course' as never);
  }, [index, router]);

  // Подготовка: запись прошлых попыток (диск, без сети) → номер попытки → 12 вопросов главы.
  useEffect(() => {
    let cancelled = false;
    console.log(`${LOG} screen:open`, JSON.stringify({ lessonOrdinal, chapterOrdinal, source: params.source ?? null, locale })); // guard-ok: вход
    void (async () => {
      const scopeHash = deriveLocalOfflineProgressAccountScopeHash(await getStableId());
      const exam = await prepareLearningV2ChapterExamV1({ accountScopeHash: scopeHash, targetLanguage: 'en', lessonOrdinal, chapterOrdinal, locale });
      if (cancelled) return;
      if (!exam) {
        console.warn(`${LOG} screen:no_questions`, JSON.stringify({ lessonOrdinal, chapterOrdinal })); // guard-ok: ранний выход
        close('no_questions');
        return;
      }
      if (exam.kind === 'cooldown') {
        // зачем (Ревизор 22.10): пауза после провала — вопросов не даём, показываем, через сколько можно пересдать
        console.warn(`${LOG} screen:cooldown`, JSON.stringify({ examKey: exam.examKey, minutesLeft: exam.minutesLeft })); // guard-ok: ранний выход
        setCooldownMinutes(exam.minutesLeft);
        return;
      }
      console.log(`${LOG} screen:prepared`, JSON.stringify({ examKey: exam.examKey, attempt: exam.attempt, questions: exam.questions.map((q) => `${q.sessionOrdinal}:${q.family}`) })); // guard-ok: что подобрано
      setPrepared({ examKey: exam.examKey, attempt: exam.attempt, questions: exam.questions, scopeHash });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: экзамен готовится один раз на вход
  }, []);

  // Энергия — при показе первого вопроса, один раз за попытку (номер операции = ключ экзамена + попытка: повторный вход не спишет дважды).
  useEffect(() => {
    if (!prepared || chargedRef.current) return;
    chargedRef.current = true;
    if (isUnlimited) {
      console.log(`${LOG} energy:skip`, JSON.stringify({ reason: 'unlimited' })); // guard-ok: ветка
      return;
    }
    const intent = createEnergySessionIntent('level_exam', prepared.examKey, `${prepared.examKey}:attempt-${prepared.attempt}`);
    void confirmActivityStart('level_exam', intent).then((result) => {
      console.log(`${LOG} energy:charge`, JSON.stringify({ examKey: prepared.examKey, attempt: prepared.attempt, result })); // guard-ok: ответ списания
      if (result === 'insufficient' || result === 'cancelled') setNoEnergy(true);
    });
  }, [confirmActivityStart, isUnlimited, prepared]);

  const onAnswered = useCallback((answer: Answer) => {
    answersRef.current = [...answersRef.current.filter((a) => a.interactionId !== answer.interactionId), answer];
  }, []);

  const onNext = useCallback(() => {
    if (!prepared) return;
    if (index + 1 < prepared.questions.length) {
      setIndex(index + 1);
      return;
    }
    if (finishingRef.current) return;
    finishingRef.current = true;
    void finishLearningV2ChapterExamV1({
      accountScopeHash: prepared.scopeHash,
      progressAccountScopeHash: prepared.scopeHash,
      examKey: prepared.examKey,
      lessonOrdinal,
      chapterOrdinal,
      answers: answersRef.current.map((a) => ({ interactionId: a.interactionId, correct: a.correct })),
      finishedAtMs: Date.now(),
    }).then((outcome) => {
      console.log(`${LOG} screen:finished`, JSON.stringify({ examKey: prepared.examKey, correct: outcome.result.correct, passed: outcome.result.passed, credited: outcome.creditedSessionIds.length })); // guard-ok: итог
      // зачем (владелец 22.10): правильный ответ — только после конца экзамена и только по ошибкам, из вердикта проверки
      answersRef.current = answersRef.current.map((a) => (a.correct ? a : { ...a, correctAnswer: learningV2ChapterExamCorrectAnswerV1({ lessonOrdinal, sessionOrdinal: a.sessionOrdinal, interactionId: a.interactionId, locale }) }));
      setOutcome({ correct: outcome.result.correct, passed: outcome.result.passed, openedRange: openedRangeOf(outcome.creditedSessionIds) });
      // зачем (владелец 22.10): 40 монет за ПЕРВУЮ сдачу главы; плашка — только после подтверждения сервера (празднуем фактом)
      if (outcome.firstPass) {
        void grantChapterExamCoinsV1({ lessonOrdinal, chapterOrdinal }).then((granted) => {
          console.log(`${LOG} reward`, JSON.stringify({ examKey: prepared.examKey, granted })); // guard-ok: показали плашку или нет
          if (granted === 'credited') setReward(40);
        });
      }
    }, (error: unknown) => {
      console.warn(`${LOG} screen:finish_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
      finishingRef.current = false;
    });
  }, [chapterOrdinal, close, index, lessonOrdinal, locale, prepared]);

  const repeatEpisode = useCallback((sessionOrdinal: number) => {
    console.log(`${LOG} review:repeat_episode`, JSON.stringify({ lessonOrdinal, sessionOrdinal })); // guard-ok: куда ведёт нажатие
    void launchLearningV2SessionByOrdinalsV1({ lessonOrdinal, sessionOrdinal, from: 'chapter_exam_review', repeat: true }, { lang, studyTarget, push: (href) => router.push(href as never) });
  }, [lang, lessonOrdinal, router, studyTarget]);

  if (cooldownMinutes !== null) {
    return (
      <View style={[styles.screen, { backgroundColor: g.bg, paddingTop: insets.top }]}>
        <View style={styles.top}>
          <V2Pressable testID="chapter-exam-close" accessibilityLabel={learningV2ChapterExamCopy(lang, 'later')} onPress={() => close('cooldown_close')} style={[styles.close, { backgroundColor: g.opaqueCard, boxShadow: t.taskPlateShadow as never }]}>
            <Ionicons name="close" size={22} color={g.text} />
          </V2Pressable>
        </View>
        <View style={styles.cooldown} testID="chapter-exam-cooldown">
          <Ionicons name="time-outline" size={42} color={g.secondary} />
          <Text style={[styles.cooldownTitle, { color: g.text }]}>{learningV2ChapterExamCopy(lang, 'title', { n: chapterOrdinal })}</Text>
          <Text style={[styles.cooldownText, { color: g.secondary }]}>{learningV2ChapterExamResultCopy(lang, 'retryIn', { m: cooldownMinutes })}</Text>
        </View>
      </View>
    );
  }
  if (outcome && reviewOpen) {
    return (
      <View style={[styles.screen, { backgroundColor: g.bg }]}>
        <LearningV2ChapterExamReviewView lang={lang} chapterOrdinal={chapterOrdinal} answers={answersRef.current} topInset={insets.top} bottomInset={insets.bottom} onBack={() => setReviewOpen(false)} onRepeatEpisode={repeatEpisode} />
      </View>
    );
  }
  if (outcome) {
    return (
      <View style={[styles.screen, { backgroundColor: g.bg, paddingTop: insets.top }]}>
        {/* итог: в шапке только крестик, без прогресса (макет раздел 4) */}
        <View style={styles.top}>
          <V2Pressable testID="chapter-exam-close" accessibilityLabel={learningV2ChapterExamCopy(lang, 'later')} onPress={() => close('result_close')} style={[styles.close, { backgroundColor: g.opaqueCard, boxShadow: t.taskPlateShadow as never }]}>
            <Ionicons name="close" size={22} color={g.text} />
          </V2Pressable>
        </View>
        <LearningV2ChapterExamResultView lang={lang} lessonOrdinal={lessonOrdinal} chapterOrdinal={chapterOrdinal} correct={outcome.correct} passed={outcome.passed} openedRange={outcome.openedRange} reward={reward} answers={answersRef.current} bottomInset={insets.bottom}
          onToChapter={(n) => close(`to_chapter_${n}`)} onReview={() => setReviewOpen(true)} />
      </View>
    );
  }

  const question = prepared?.questions[index] ?? null;
  const progress = prepared ? (index + 1) / CHAPTER_EXAM_QUESTION_COUNT_V1 : 0;
  return (
    <View style={[styles.screen, { backgroundColor: g.bg, paddingTop: insets.top }]}>
      <View style={styles.top}>
        <V2Pressable testID="chapter-exam-close" accessibilityLabel={learningV2ChapterExamCopy(lang, 'later')} onPress={() => close('close_button')} style={[styles.close, { backgroundColor: g.opaqueCard, boxShadow: t.taskPlateShadow as never }]}>
          <Ionicons name="close" size={22} color={g.text} />
        </V2Pressable>
        <View style={styles.progressColumn}>
          <View style={[styles.track, { backgroundColor: t.controlSoft }]}>
            <View style={[styles.fill, { backgroundColor: g.accent, width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: g.secondary }]}>{learningV2ChapterExamCopy(lang, 'progress', { i: Math.min(index + 1, CHAPTER_EXAM_QUESTION_COUNT_V1) })}</Text>
        </View>
      </View>
      {question ? (
        <ChapterExamQuestion
          key={question.interactionId}
          ordinal={index + 1}
          question={question}
          lessonOrdinal={lessonOrdinal}
          locale={locale}
          interfaceLocale={lang as LearningV2InterfaceLocale}
          bottomInset={insets.bottom}
          onAnswered={onAnswered}
          onNext={onNext}
        />
      ) : <View style={styles.flex} />}
      <NoEnergyModal variant="course" activity="level_exam" visible={noEnergy} onClose={() => { setNoEnergy(false); close('no_energy'); }} />
    </View>
  );
}

type QuestionProps = Readonly<{
  ordinal: number;
  question: ChapterExamQuestionV1;
  lessonOrdinal: number;
  locale: 'ru' | 'uk';
  interfaceLocale: LearningV2InterfaceLocale;
  bottomInset: number;
  onAnswered: (answer: Answer) => void;
  onNext: () => void;
}>;

function ChapterExamQuestion({ ordinal, question, lessonOrdinal, locale, interfaceLocale, bottomInset, onAnswered, onNext }: QuestionProps) {
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  const reducedMotion = useReducedMotion();
  const { studyTarget } = useStudyTarget();
  const { speak, stop } = useAudio();
  const interaction = useMemo(
    () => learningV2ChapterExamInteractionV1({ lessonOrdinal, sessionOrdinal: question.sessionOrdinal, interactionId: question.interactionId, locale }),
    [lessonOrdinal, locale, question.interactionId, question.sessionOrdinal],
  );
  const options = useMemo(() => (interaction ? stableShuffleLearningV2OptionsV1(interaction.interactionId, interaction.responseOptions) : []), [interaction]);
  const speechText = useMemo(() => (interaction ? resolveLearningV2CourseSessionDeviceSpeechTextV1(interaction) : null), [interaction]);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<readonly string[]>([]);
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null);
  const [feedback, setFeedback] = useState<LearningV2ModeLearnerFeedbackV1 | null>(null);
  const [playing, setPlaying] = useState(false);

  const playPhrase = useCallback(() => {
    if (!speechText) return;
    speak(speechText, undefined, {
      language: studySpeechLocale(studyTarget, 'learning_v2_preview'),
      systemTtsOnly: true,
      onStart: () => setPlaying(true),
      onDone: () => setPlaying(false),
      onStopped: () => setPlaying(false),
      onError: (error: Error) => {
        console.warn(`${LOG} audio:error`, JSON.stringify({ interactionId: question.interactionId, reason: error.message })); // guard-ok: сбой озвучки
        setPlaying(false);
      },
    });
  }, [question.interactionId, speak, speechText, studyTarget]);

  // зачем: задания «послушай» начинаются со звука, как в занятии; уход с вопроса гасит речь
  useEffect(() => {
    if (question.family === 'listen_choose' || question.family === 'listen_build_dictation') playPhrase();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: один автозвук на вопрос
  }, []);

  const evaluate = useCallback((response: V2LocalEvaluatorResponseV1) => {
    if (!interaction || verdict) return;
    const correct = checkLearningV2ChapterExamAnswerV1({ lessonOrdinal, sessionOrdinal: question.sessionOrdinal, interactionId: interaction.interactionId, locale, response });
    setVerdict(correct ? 'correct' : 'wrong');
    const fb = resolveLearningV2ModeFeedbackV1({
      interfaceLocale,
      modePayload: interaction.modePayload,
      outcome: correct ? 'correct' : 'wrong',
      selectedResponseId: response.kind === 'choice_token' ? response.value : null,
      orderedResponseIds: orderedIds,
    });
    // зачем (Ревизор 22.10): авторский разбор варианта обычно называет правильный ответ — посреди экзамена это подсказка.
    // Роутеру — только вердикт «Верно / Неверно» без разбора (данные задания не передаём); разбор живёт в итоге.
    setFeedback(resolveLearningV2ModeFeedbackV1({ interfaceLocale, modePayload: null, outcome: correct ? 'correct' : 'wrong', selectedResponseId: null, orderedResponseIds: [] }));
    const parts = splitLearningV2TaskPromptV1({ family: interaction.family, prompt: interaction.prompt, interfaceLocale, modePayload: interaction.modePayload, interactionId: interaction.interactionId });
    const answerText = response.kind === 'choice_token'
      ? (options.find((o) => o.responseId === response.value)?.text ?? null)
      : (typeof response.value === 'string' ? response.value : null);
    onAnswered({
      ordinal, interactionId: interaction.interactionId, sessionOrdinal: question.sessionOrdinal, correct,
      taskName: parts.instruction, taskIcon: TASK_ICON[parts.icon], situation: parts.situation, answerText, correctAnswer: null,
      // зачем: в разборе — только авторское объяснение из данных задания; общая фраза «Неверно» объяснением не считается
      explanation: fb.authored ? fb.text : null,
    });
    void (correct ? hapticSuccess() : hapticError());
  }, [interaction, interfaceLocale, lessonOrdinal, locale, onAnswered, options, orderedIds, ordinal, question.sessionOrdinal, verdict]);

  if (!interaction || !interaction.modePayload) {
    // зачем: задание не собралось — экзамен не застревает: засчитываем как неверное и даём «Дальше» (причина в журнале)
    console.warn(`${LOG} question:missing`, JSON.stringify({ interactionId: question.interactionId, hasInteraction: interaction !== null })); // guard-ok: ранний выход
  }
  const orderedText = options.filter((o) => orderedIds.includes(o.responseId))
    .sort((a, b) => orderedIds.indexOf(a.responseId) - orderedIds.indexOf(b.responseId))
    .map((o) => o.text).join(' ');
  const response: V2LocalEvaluatorResponseV1 = interaction?.inputMode === 'single_choice'
    ? { kind: 'choice_token', value: selectedChoiceId }
    : { kind: 'text', value: orderedText || null };
  const canSubmit = verdict === null && (interaction?.inputMode === 'single_choice' ? selectedChoiceId !== null : orderedIds.length > 0);
  const answered = verdict !== null || !interaction?.modePayload;
  const ctaLabel = answered ? learningV2ChapterExamCopy(interfaceLocale, 'next') : learningV2ModeCheckLabelV1(interfaceLocale);

  return (
    <>
      <Animated.View style={styles.body} entering={reducedMotion ? undefined : SlideInRight.duration(110)} exiting={reducedMotion ? undefined : SlideOutLeft.duration(110)}>
        {/* зачем: тот же вьюпорт, что у плеера занятия — компактная раскладка на низких экранах и прокрутка при крупном шрифте */}
        <LearningV2PracticeViewport>
        {interaction?.modePayload ? (
          <LearningV2ModeRouterV1
            family={interaction.family}
            interfaceLocale={interfaceLocale}
            modePayload={interaction.modePayload}
            phase={verdict === 'correct' ? 'success' : verdict === 'wrong' ? 'needs_work' : 'idle'}
            prompt={sanitizeLearningV2LearnerPromptV1(interaction.prompt)}
            options={options}
            selectedChoiceId={selectedChoiceId}
            orderedResponseIds={orderedIds}
            wrongNudge={{ responseId: null, token: 0 }}
            reducedMotion={reducedMotion}
            resolved={verdict !== null}
            explanation={null}
            learnerFeedback={feedback}
            referenceAudioState={speechText ? (playing ? 'playing' : 'idle') : 'unavailable'}
            onPick={(responseId) => {
              if (verdict) return;
              setSelectedChoiceId(responseId);
              evaluate({ kind: 'choice_token', value: responseId });
            }}
            onAppendToken={(responseId) => { if (!verdict) setOrderedIds((current) => [...current, responseId]); }}
            onUndoToken={() => { if (!verdict) setOrderedIds((current) => current.slice(0, -1)); }}
            onRemoveTokenAt={(at) => { if (!verdict) setOrderedIds((current) => current.filter((_, i) => i !== at)); }}
            onPlaySelectableAudio={() => {}}
            onPlayFullPhraseAudio={speechText ? playPhrase : null}
            onPlaySlowPhraseAudio={null}
            onModeNativeComplete={(responseId) => evaluate({ kind: 'choice_token', value: responseId })}
            onToggleRecording={() => {}}
            onSubmit={() => evaluate(response)}
            canSubmit={canSubmit}
          />
        ) : null}
        </LearningV2PracticeViewport>
      </Animated.View>
      {/* `.exfoot`: подвал экзамена, `.tcta` — до ответа приглушена (.35) */}
      <View style={[styles.foot, { backgroundColor: t.footerSolid, paddingBottom: 34 + bottomInset }]}>
        <V2Pressable
          testID="chapter-exam-cta"
          disabled={!answered && !canSubmit}
          onPress={() => {
            if (!answered) { evaluate(response); return; }
            if (!interaction?.modePayload) onAnswered({ ordinal, interactionId: question.interactionId, sessionOrdinal: question.sessionOrdinal, correct: false, taskName: '', taskIcon: 'help-circle-outline', situation: null, answerText: null, correctAnswer: null, explanation: null });
            onNext();
          }}
          style={[styles.cta, { backgroundColor: t.ctaFill, opacity: answered || canSubmit ? 1 : 0.35 }]}
        >
          <Text style={[styles.ctaText, { color: t.ctaInk }]}>{ctaLabel}</Text>
        </V2Pressable>
      </View>
    </>
  );
}

// Размеры — 1:1 по таблице «экзамен главы», раздел 3 (`.extop`, `.tvx`, `.tvtrk`, `.tvn`, `.exfoot`, `.tcta`).
const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, marginTop: 2, paddingHorizontal: 20 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  progressColumn: { flex: 1 },
  cooldown: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 80 },
  cooldownTitle: { marginTop: 16, fontSize: 22, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  cooldownText: { marginTop: 6, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  progressText: { marginTop: 5, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  body: { flex: 1, paddingTop: 8, paddingHorizontal: 20 },
  foot: { paddingTop: 12, paddingHorizontal: 20 },
  cta: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
