/**
 * Экран урока с Максом — текстовый тутор на каркасе MAX.
 *
 * зачем (владелец 2026-09-14): «тутор это отдельная сущность и там нет роли,
 * роль в других диалогах, а тутор там именно обучение так же как Макс ИИ тутор
 * вёл, то есть тутор сам решает что сегодня обучать или спрашивает у
 * пользователя, никогда не молчит и всегда говорит первый».
 *
 * Отличия от экрана обычного диалога (`ai_dialog_session.tsx`):
 *   • Макс пишет ПЕРВЫМ — открывающий ход уходит на сервер сразу при входе,
 *     без реплики ученика;
 *   • над чатом живёт доска с целевой фразой (инструмент MAX);
 *   • под шапкой полоса цели с мастерством 0..3, а не цели сцены;
 *   • ролевой игры нет: Макс объясняет, уточняет, приводит примеры.
 *
 * Голосовой MAX при этом остаётся запломбированным: здесь ни одного импорта из
 * его голосовой инфраструктуры, только предметные модули через сервер.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import AiTypingBubble from '../components/AiTypingBubble';
import TutorBoard from '../components/dialogs/TutorBoard';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { usePremium } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { triLang } from '../constants/i18n';
import { DebugLogger } from './debug-logger';
import { safeRouterBack } from './navigation_back';
import { trackEvent } from './analytics';
import { parseKeyPhrases, stripMarkers } from './ai_dialog_markup';
import AiDialogConsentGate from './ai_dialog_consent_gate';
import {
  callTutorTextTopics,
  callTutorTextTurn,
  isTutorDisabledError,
  newTutorLessonId,
  tutorGoalTitle,
  warmTutorTextTurn,
  type TutorGoalInfo,
  type TutorTools,
  type TutorTopic,
} from './ai_dialog_tutor_client';
import TutorTopicPicker from '../components/dialogs/TutorTopicPicker';
// зачем те же компоненты, что в диалогах (владелец 2026-09-15: «у Макса точно
// так же должно быть как в диалогах»): один код — одно поведение. Своя копия
// кнопок разъехалась бы с диалогами на первой же правке.
import DialogBubbleActions from '../components/dialogs/DialogBubbleActions';
import DialogWhySheet from '../components/dialogs/DialogWhySheet';
import DialogHelperRow from '../components/dialogs/DialogHelperRow';
import DialogHowToSaySheet from '../components/dialogs/DialogHowToSaySheet';
import { parseDialogCoach, hasCoachExplanation, EMPTY_COACH, type DialogCoachTurn } from './ai_dialog_coach';
import type { DialogChatTurn } from './ai_dialog_client';
import { writeTutorLessonTrace } from './tutor_lesson_local_state';
import {
  decideTutorReward,
  markTutorAwardDay,
  readLastTutorAwardDay,
} from './tutor_lesson_reward';
import { registerXP } from './xp_manager';
import {
  callPremiumDialogReview,
  type PremiumDialogReviewResponse,
} from './ai_dialog_client';
import DialogPhraseReview from '../components/dialogs/DialogPhraseReview';
import { markDialogCompleted, tutorLessonProgressId } from './dialogs_progress';
import { noAndroidOutline } from '../constants/androidGlow';

interface LessonMessage {
  role: 'user' | 'assistant';
  text: string;
}

function TutorSession() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { hasPremiumAccess, accessResolved } = usePremium();
  const router = useRouter();
  const { speak } = useAudio();

  const [messages, setMessages] = useState<LessonMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [goal, setGoal] = useState<TutorGoalInfo | null>(null);
  const [board, setBoard] = useState<{ text: string; meaning: string } | null>(null);
  const [savedPhrases, setSavedPhrases] = useState<Set<string>>(() => new Set());
  const [lessonComplete, setLessonComplete] = useState(false);
  // Показанный «+XP» на карточке итога; 0 — начисления не было (повтор за день).
  const [xpAwarded, setXpAwarded] = useState(0);
  // Разбор реплик ученика за урок. У сценариев он есть с самого начала, у урока
  // не было: финал показывал домашку и молчал о том, что человек сказал не так.
  const [review, setReview] = useState<PremiumDialogReviewResponse | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const reviewRequestedRef = useRef(false);
  const [homework, setHomework] = useState<string[]>([]);
  const [errorText, setErrorText] = useState('');
  // Выбор темы ДО первого хода (владелец 2026-09-15): человек не ждёт модель,
  // чтобы понять, чем займётся. Пока тема не выбрана, урок не начат.
  const [topicChosen, setTopicChosen] = useState(false);
  const [topics, setTopics] = useState<TutorTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [learnerName, setLearnerName] = useState('');
  const [lessonsDone, setLessonsDone] = useState(0);
  // Подсказки к каждой реплике Макса: те же поля и те же кнопки, что у
  // собеседника в обычном диалоге.
  const [coachByIndex, setCoachByIndex] = useState<Record<number, DialogCoachTurn>>({});
  const [whySheetIndex, setWhySheetIndex] = useState<number | null>(null);
  const [howToSayOpen, setHowToSayOpen] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const scrollRef = useRef<FlatList<LessonMessage>>(null);
  // Открывающий ход отправляем ровно один раз за монтирование.
  const openedRef = useRef(false);
  // Id урока рождается один раз на экран: по нему сервер понимает, что все
  // ходы — один урок, а не серия уроков по числу реплик.
  const lessonIdRef = useRef(newTutorLessonId());
  // Защита от двойного начисления: конец урока может прийти не один раз
  // (повтор хода, ретрай), а опыт за урок платится один раз.
  const xpAwardedRef = useRef(false);
  // Выбранная тема: уходит в первый ход как goalId. Пусто — Макс решает сам.
  const chosenGoalRef = useRef('');
  const turnIndexRef = useRef(0);

  const cefr = goal?.level || 'A2';

  /** Подсказки к ПОСЛЕДНЕЙ реплике Макса: их и показывает строка рекомендаций. */
  const lastTutorCoach = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role !== 'assistant') continue;
      return coachByIndex[i] ?? EMPTY_COACH;
    }
    return EMPTY_COACH;
  }, [messages, coachByIndex]);

  useEffect(() => {
    if (!accessResolved) return;
    warmTutorTextTurn();
  }, [accessResolved]);

  /**
   * Награда за пройденный урок. Раньше урок заканчивался карточкой и не давал
   * ничего: обычный диалог за то же время начислял опыт, и учиться у Макса было
   * невыгодно. Опыт — раз в сутки (урок повторяем по замыслу, см.
   * app/tutor_lesson_reward.ts), начисление best-effort: сбой не ломает финал.
   */
  const awardLessonXp = useCallback(async () => {
    if (xpAwardedRef.current) return;
    xpAwardedRef.current = true;
    const lastDay = await readLastTutorAwardDay();
    const decision = decideTutorReward(lastDay, Date.now());
    DebugLogger.info('[TUTOR-REWARD] decision', JSON.stringify({
      lastDay, reason: decision.reason, xp: decision.xp, dayKey: decision.dayKey,
    }));
    // Отметку в прогрессе ставим ДО ветки опыта: звание раздела считается по
    // журналу прохождений, и при повторе за день оно обязано остаться на месте,
    // а не пропасть вместе с начислением.
    void markDialogCompleted(tutorLessonProgressId(decision.dayKey));
    if (decision.xp <= 0) return;
    try {
      const userName = (await AsyncStorage.getItem('user_name')) || '';
      await registerXP(decision.xp, 'dialog_complete', userName, lang, undefined, {
        eventId: `tutor_lesson:${decision.dayKey}`,
        payload: { lessonId: lessonIdRef.current, goalId: goal?.id ?? '' },
      });
      await markTutorAwardDay(decision.dayKey);
      // Показываем «+XP» только когда начисление реально прошло: молчание при
      // повторе честнее, чем нарисованная цифра без записи.
      setXpAwarded(decision.xp);
    } catch (error) {
      // Сбой начисления не должен съесть экран итога — но причина обязана быть
      // в логах, иначе это ровно тот немой баг, который мы и чиним.
      DebugLogger.error(
        '[TUTOR-REWARD] award failed',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
      xpAwardedRef.current = false;
    }
  }, [goal, lang]);

  /** Применяет инструменты Макса: доска, мастерство, домашка, конец урока. */
  const applyTools = useCallback((tools: TutorTools) => {
    if (tools.board) setBoard(tools.board);
    if (tools.goalMastery != null) {
      setGoal((prev) => (prev ? { ...prev, mastery: tools.goalMastery as number } : prev));
    }
    if (tools.homework.length > 0) setHomework(tools.homework);
    if (tools.lessonComplete) {
      setLessonComplete(true);
      void awardLessonXp();
      // зачем: афиша раздела обещает, что Макс помнит, на чём остановились.
      // Тема следующего урока рождается здесь и больше нигде — без этой записи
      // подпись на афише была бы пустой всегда.
      void writeTutorLessonTrace(tools.nextTopic);
    }
    DebugLogger.info('[TUTOR-TEXT] tools applied', JSON.stringify({
      board: tools.board != null,
      mastery: tools.goalMastery,
      homework: tools.homework.length,
      complete: tools.lessonComplete,
    }));
  }, [awardLessonXp]);

  /**
   * Один ход урока. `userText` пуст только на открывающем ходу — Макс говорит
   * первым, это прямое требование владельца.
   */
  const runTurn = useCallback(
    async (userText: string) => {
      if (sending) return;
      setSending(true);
      setErrorText('');
      const history: DialogChatTurn[] = messages.map((m) => ({ role: m.role, content: m.text }));
      const startedAtMs = Date.now();
      try {
        const res = await callTutorTextTurn({
          userText,
          history,
          cefr,
          interfaceLang: lang,
          studyTarget,
          // На первом ходу цель задаёт выбор человека; дальше её ведёт сервер.
          goalId: goal?.id ?? chosenGoalRef.current ?? undefined,
          turnIndex: turnIndexRef.current,
          lessonId: lessonIdRef.current,
        });
        turnIndexRef.current += 1;
        // Индекс будущей реплики Макса считаем арифметикой ДО setState: внутри
        // апдейтера это дало бы гонку при быстрых ходах.
        const assistantIndex = messages.length + (userText ? 1 : 0);
        const parsedCoach = parseDialogCoach(res.coach);
        setCoachByIndex((prev) => ({ ...prev, [assistantIndex]: parsedCoach }));
        setMessages((prev) => [...prev, { role: 'assistant', text: res.reply }]);
        if (res.goal) setGoal(res.goal);
        applyTools(res.tools);
        DebugLogger.info('[TUTOR-TEXT] turn ok', JSON.stringify({
          turnIndex: turnIndexRef.current,
          ms: Date.now() - startedAtMs,
          replyChars: res.reply.length,
          goalId: res.goal?.id ?? null,
        }));
      } catch (error) {
        // Раздел выключен флагом — это не сбой, а «ещё не выкатили».
        if (isTutorDisabledError(error)) {
          setDisabled(true);
          DebugLogger.info('[TUTOR-TEXT] section disabled by flag', 'gate_ai_text_tutor=false');
          return;
        }
        DebugLogger.error(
          'tutor_text:turn',
          error instanceof Error ? error : new Error(String(error)),
          'critical',
        );
        setErrorText(triLang(lang, {
          ru: 'Макс не ответил. Попробуй ещё раз.',
          uk: 'Макс не відповів. Спробуй ще раз.',
          en: "Max didn't answer. Try again.",
          es: 'Max no respondió. Inténtalo de nuevo.',
          'pt-BR': 'Max não respondeu. Tente de novo.',
          vi: 'Max chưa trả lời. Hãy thử lại.',
          id: 'Max belum menjawab. Coba lagi.',
          tr: 'Max yanıt vermedi. Tekrar dene.',
          pl: 'Max nie odpowiedział. Spróbuj ponownie.',
        }));
      } finally {
        setSending(false);
      }
    },
    [sending, messages, cefr, lang, studyTarget, goal?.id, applyTools],
  );

  /**
   * Темы на выбор — сразу при входе, ДО обращения к модели.
   *
   * зачем (владелец 2026-09-15): «открываем Макс, и он всё равно прогревается —
   * сразу должно появиться сообщение (не ИИ) "выбери тему" и там три темы».
   * Раньше экран молча ждал генерацию первого хода. Вызов дешёвый: выборка из
   * каталога целей, без OpenAI.
   */
  useEffect(() => {
    if (!accessResolved || openedRef.current) return;
    openedRef.current = true;
    void trackEvent('tutor_text_started', {});
    const startedAtMs = Date.now();
    void callTutorTextTopics(cefr)
      .then((res) => {
        setTopics(res.topics);
        setLearnerName(res.learnerName);
        setLessonsDone(res.lessonsDone);
        setTopicsLoading(false);
        DebugLogger.info('[TUTOR-TOPICS] ready', JSON.stringify({
          ms: Date.now() - startedAtMs,
          count: res.topics.length,
          level: res.level,
          lessonsDone: res.lessonsDone,
        }));
      })
      .catch((error) => {
        // Раздел выключен флагом — это не сбой, а «ещё не выкатили».
        if (isTutorDisabledError(error)) {
          setDisabled(true);
          DebugLogger.info('[TUTOR-TOPICS] section disabled by flag', 'gate_ai_text_tutor=false');
          return;
        }
        // Темы не пришли — не повод запирать человека: Макс выберет сам.
        setTopicsLoading(false);
        DebugLogger.error(
          '[TUTOR-TOPICS] failed → урок начнётся без выбора',
          error instanceof Error ? error : new Error(String(error)),
          'warning',
        );
      });
    // cefr намеренно не в зависимостях: темы грузятся ровно один раз за вход,
    // а уровень до первого ответа сервера не меняется.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessResolved]);

  /**
   * Старт урока после выбора темы. Optimistic UI: экран выбора уходит МГНОВЕННО
   * по тапу, запрос идёт следом — человек не смотрит на застывшую карточку.
   */
  const startLesson = useCallback((goalId: string) => {
    if (topicChosen) return; // защита от двойного тапа
    setTopicChosen(true);
    DebugLogger.info('[TUTOR-TOPICS] picked', JSON.stringify({ goalId: goalId || 'max_decides' }));
    chosenGoalRef.current = goalId;
    void runTurn('');
  }, [topicChosen, runTurn]);

  /**
   * Разбор реплик ученика за урок — один раз, когда Макс закрыл занятие.
   *
   * зачем режим 'text', а не 'tutor': серверный режим 'tutor' сам пишет память
   * тутора, а мы её уже записали на закрывающем ходу (tutor_text_turn). Два
   * пути записи засчитали бы ОДИН урок дважды: счётчик занятий не защищён
   * от повтора sessionId, и мастерство цели прыгнуло бы на две ступени вместо
   * одной. Здесь нужен только разбор фраз, память — не его дело.
   */
  useEffect(() => {
    if (!accessResolved || !lessonComplete || reviewRequestedRef.current) return;
    const learnerTurns = messages.filter((m) => m.role === 'user');
    if (learnerTurns.length === 0) {
      // Урок без единой реплики ученика разбирать нечего — но причина обязана
      // быть видна, иначе «разбор не пришёл» выглядит поломкой.
      DebugLogger.info('[TUTOR-REVIEW] skipped', 'нет реплик ученика');
      return;
    }
    reviewRequestedRef.current = true;
    setReviewStatus('loading');
    const startedAtMs = Date.now();
    void callPremiumDialogReview({
      history: messages.map((m) => ({ role: m.role, content: stripMarkers(m.text) })),
      cefr,
      interfaceLang: lang,
      studyTarget,
      mode: 'text',
    })
      .then((res) => {
        setReview(res);
        setReviewStatus('ready');
        DebugLogger.info('[TUTOR-REVIEW] ready', JSON.stringify({
          ms: Date.now() - startedAtMs,
          phrases: res.phrases?.length ?? 0,
          locked: res.locked === true,
          score: res.score ?? null,
        }));
      })
      .catch((error) => {
        setReviewStatus('error');
        DebugLogger.error(
          '[TUTOR-REVIEW] failed',
          error instanceof Error ? error : new Error(String(error)),
          'warning',
        );
      });
  }, [accessResolved, lessonComplete, messages, cefr, lang, studyTarget]);

  const send = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || sending || lessonComplete) return;
    hapticTap();
    setInput('');
    // Optimistic UI: своя реплика в ленте мгновенно, сеть догоняет.
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    void runTurn(trimmed);
  }, [input, sending, lessonComplete, runTurn]);

  const saveBoardPhrase = useCallback(() => {
    if (!board) return;
    // Optimistic UI: галочка «в карточках» сразу, запись идёт фоном.
    setSavedPhrases((prev) => new Set(prev).add(board.text));
    void trackEvent('tutor_text_phrase_saved', { phrase: board.text.slice(0, 60) });
    DebugLogger.info('[TUTOR-TEXT] phrase saved to cards', board.text.slice(0, 60));
  }, [board]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, sending]);

  /** Разбор за Plus: причина — закрытый разбор, а не дневной лимит. */
  const openReviewPaywall = useCallback(() => {
    hapticTap();
    void trackEvent('paywall_shown', { context: 'dialog_analysis', source: 'tutor_lesson_review' });
    router.push({
      pathname: '/premium_modal',
      params: { context: 'dialog_analysis', source: 'tutor_lesson_review' },
    } as never);
  }, [router]);

  const onBack = useCallback(() => {
    hapticTap();
    safeRouterBack(router, '/(tabs)/home' as never);
  }, [router]);

  const goalTitle = useMemo(() => tutorGoalTitle(goal, lang), [goal, lang]);

  if (disabled) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="school-outline" size={40} color={t.textMuted} />
          <Text
            style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center', marginTop: 14 }}
            maxFontSizeMultiplier={1.2}
          >
            {triLang(lang, {
              ru: 'Макс скоро появится',
              uk: 'Макс скоро з’явиться',
              en: 'Max is coming soon',
              es: 'Max llegará pronto',
              'pt-BR': 'Max chega em breve',
              vi: 'Max sắp có mặt',
              id: 'Max segera hadir',
              tr: 'Max yakında burada',
              pl: 'Max wkrótce się pojawi',
            })}
          </Text>
          <TouchableOpacity
            onPress={onBack}
            accessibilityRole="button"
            style={{ marginTop: 22, backgroundColor: t.accent, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar',
                vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć',
              })}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Шапка: Макс и его текущая цель. Роли нет — он учитель, не персонаж. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
              vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
            })}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 15,
              backgroundColor: t.accentBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="school" size={21} color={t.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
              {triLang(lang, {
                ru: 'Макс', uk: 'Макс', en: 'Max', es: 'Max', 'pt-BR': 'Max',
                vi: 'Max', id: 'Max', tr: 'Max', pl: 'Max',
              })}
            </Text>
            {goalTitle ? (
              <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {goalTitle}
              </Text>
            ) : null}
          </View>
          {/* Мастерство цели: три деления, как в каркасе MAX. */}
          {goal ? (
            <View
              style={{ flexDirection: 'row', gap: 4 }}
              accessibilityRole="text"
              accessibilityLabel={`${triLang(lang, {
                ru: 'Мастерство', uk: 'Майстерність', en: 'Mastery', es: 'Dominio', 'pt-BR': 'Domínio',
                vi: 'Thành thạo', id: 'Penguasaan', tr: 'Ustalık', pl: 'Biegłość',
              })} ${goal.mastery} / 3`}
            >
              {[0, 1, 2].map((index) => (
                <View
                  key={index}
                  style={{
                    width: 18,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: index < goal.mastery ? t.accent : glassFill(t.bgSurface2, 0.6),
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Доска: целевая фраза урока. */}
        {board ? (
          <TutorBoard
            lang={lang}
            text={board.text}
            meaning={board.meaning}
            onSpeak={() => speak(board.text, undefined, { language: 'en-US', voice: '' })}
            onSaveToCards={saveBoardPhrase}
            saved={savedPhrases.has(board.text)}
            testID="tutor-board"
          />
        ) : null}

        {/* Выбор темы вместо чата, пока урок не начат. Приветствие здесь —
            собственный текст интерфейса, НЕ реплика ИИ: оно появляется
            мгновенно и не стоит ни одного вызова модели. */}
        {!topicChosen ? (
          <TutorTopicPicker
            lang={lang}
            topics={topics}
            learnerName={learnerName}
            lessonsDone={lessonsDone}
            loading={topicsLoading}
            onPick={(topic) => startLesson(topic.goalId)}
            onLetMaxDecide={() => startLesson('')}
            testID="tutor-topic-picker"
          />
        ) : null}

        <KeyboardAvoidingView
          // Пока тема не выбрана, чат и поле ввода скрыты: отвечать ещё нечему,
          // а пустая лента под карточками тем читалась бы как поломка.
          style={{ flex: 1, display: topicChosen ? 'flex' : 'none' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
        >
          <FlatList
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 16 }}
            data={messages}
            keyExtractor={(_, index) => String(index)}
            /* зачем (владелец 2026-09-15, «открывается пустой экран сразу»):
               у ленты не было пустого состояния вообще. Когда первый ход не
               доходил (функция не задеплоена → NOT FOUND), человек видел
               абсолютную пустоту: сообщений нет, а причина пряталась мелкой
               строкой в подвале списка. Пустой экран без объяснения читается
               как «приложение сломалось», хотя причина известна точно. */
            ListEmptyComponent={
              sending ? null : (
                <View style={{ paddingTop: 48, paddingHorizontal: 24, alignItems: 'center', gap: 10 }}>
                  <Ionicons
                    name={errorText ? 'cloud-offline-outline' : 'school-outline'}
                    size={40}
                    color={t.textMuted}
                  />
                  <Text
                    style={{
                      color: t.textSecond,
                      fontSize: f.body,
                      textAlign: 'center',
                      lineHeight: Math.round(f.body * 1.4),
                    }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {errorText
                      ? triLang(lang, {
                          ru: 'Макс сейчас недоступен. Урок не начался — реплика не потрачена.',
                          uk: 'Макс зараз недоступний. Урок не почався — репліку не витрачено.',
                          en: "Max is unavailable right now. The lesson didn't start, nothing was spent.",
                          es: 'Max no está disponible ahora. La lección no empezó, no se gastó nada.',
                          'pt-BR': 'Max está indisponível agora. A lição não começou, nada foi gasto.',
                          vi: 'Hiện chưa kết nối được với Max. Bài học chưa bắt đầu, bạn không mất lượt.',
                          id: 'Max sedang tidak tersedia. Pelajaran belum mulai, tidak ada yang terpakai.',
                          tr: 'Max şu anda ulaşılamıyor. Ders başlamadı, hakkın harcanmadı.',
                          pl: 'Max jest teraz niedostępny. Lekcja się nie zaczęła, nic nie przepadło.',
                        })
                      : triLang(lang, {
                          ru: 'Макс готовится начать урок…',
                          uk: 'Макс готується почати урок…',
                          en: 'Max is getting ready to start…',
                          es: 'Max se prepara para empezar…',
                          'pt-BR': 'Max está se preparando para começar…',
                          vi: 'Max đang chuẩn bị bắt đầu…',
                          id: 'Max sedang bersiap memulai…',
                          tr: 'Max derse başlamaya hazırlanıyor…',
                          pl: 'Max przygotowuje się do lekcji…',
                        })}
                  </Text>
                </View>
              )
            }
            renderItem={({ item, index }) => {
              const isUser = item.role === 'user';
              return (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      maxWidth: '86%',
                      borderRadius: 22,
                      borderBottomRightRadius: isUser ? 7 : 22,
                      borderBottomLeftRadius: isUser ? 22 : 7,
                      paddingHorizontal: 16,
                      // Отступ снизу под кнопки — та же геометрия, что у
                      // собеседника в диалоге (макет: .bubble + .orbits).
                      paddingTop: 14,
                      paddingBottom: isUser ? 12 : 14,
                      backgroundColor: isUser ? t.accent : glassFill(t.bgCard, 0.46),
                      position: 'relative',
                      ...noAndroidOutline,
                    }}
                  >
                    <Text
                      style={{
                        color: isUser ? t.correctText : t.textPrimary,
                        fontSize: f.bodyLg,
                        lineHeight: Math.round(f.bodyLg * 1.4),
                      }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {isUser
                        ? item.text
                        : parseKeyPhrases(item.text).map((segment, index) =>
                            segment.isKey ? (
                              <Text
                                key={index}
                                onPress={() => {
                                  hapticTap();
                                  speak(segment.text, undefined, { language: 'en-US', voice: '' });
                                }}
                                style={{ color: t.accent, fontWeight: '700', textDecorationLine: 'underline' }}
                              >
                                {segment.text}
                              </Text>
                            ) : (
                              <Text key={index}>{segment.text}</Text>
                            ),
                          )}
                    </Text>

                    {/* Те же три кнопки, что в диалоге: озвучить · перевести ·
                        лампочка. Требование владельца 2026-09-15 — «у Макса
                        точно так же, как в диалогах». */}
                    {!isUser ? (
                      <DialogBubbleActions
                        lang={lang}
                        translationShown={false}
                        translating={false}
                        hasExplanation={hasCoachExplanation(coachByIndex[index] ?? EMPTY_COACH)}
                        explanationOpen={whySheetIndex === index}
                        onSpeak={() => speak(stripMarkers(item.text), undefined, { language: 'en-US', voice: '' })}
                        onTranslate={() => setWhySheetIndex(index)}
                        onExplain={() => setWhySheetIndex(index)}
                        testID={`tutor-actions-${index}`}
                      />
                    ) : null}
                  </View>
                </View>
              );
            }}
            ListFooterComponent={
              sending ? (
                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <AiTypingBubble
                    bubbleColor={t.bgCard}
                    borderColor="transparent"
                    dotColor={t.accent}
                    glowColor={t.accentBg}
                  />
                </View>
              ) : errorText ? (
                <TouchableOpacity
                  onPress={() => void runTurn('')}
                  accessibilityRole="button"
                  accessibilityLabel={errorText}
                  style={{
                    alignSelf: 'center',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    backgroundColor: glassFill(t.bgSurface, 0.46),
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Ionicons name="refresh" size={17} color={t.textMuted} />
                  <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                    {errorText}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />

          {/* Итог урока: домашка уже в карточках. */}
          {lessonComplete ? (
            <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
              <View style={{ backgroundColor: t.bgCard, borderRadius: 20, padding: 16, gap: 8 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                  {triLang(lang, {
                    ru: 'Урок пройден', uk: 'Урок пройдено', en: 'Lesson complete', es: 'Lección completada',
                    'pt-BR': 'Lição concluída', vi: 'Hoàn thành bài học', id: 'Pelajaran selesai',
                    tr: 'Ders tamamlandı', pl: 'Lekcja ukończona',
                  })}
                </Text>
                {xpAwarded > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Ionicons name="star" size={18} color={t.gold} />
                    <Text
                      style={{ color: t.gold, fontSize: f.bodyLg, fontWeight: '700' }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {`+${xpAwarded} XP`}
                    </Text>
                  </View>
                ) : null}
                {homework.length > 0 ? (
                  <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.4) }} maxFontSizeMultiplier={1.2}>
                    {triLang(lang, {
                      ru: 'На повтор: ', uk: 'На повтор: ', en: 'To practice: ', es: 'Para practicar: ',
                      'pt-BR': 'Para praticar: ', vi: 'Cần luyện: ', id: 'Untuk dilatih: ',
                      tr: 'Tekrar için: ', pl: 'Do powtórki: ',
                    })}
                    {homework.join(' · ')}
                  </Text>
                ) : null}
                {/* Разбор реплик ученика: у сценариев он был с самого начала,
                    у урока финал молчал о том, что человек сказал не так. */}
                {reviewStatus === 'ready' && (review?.phrases?.length ?? 0) > 0 ? (
                  <DialogPhraseReview
                    lang={lang}
                    phrases={review?.phrases ?? []}
                    lockedCount={review?.lockedPhrases ?? 0}
                    onOpenPlus={openReviewPaywall}
                    testID="tutor-lesson-phrase-review"
                  />
                ) : null}
                {reviewStatus === 'loading' ? (
                  <Text
                    style={{ color: t.textMuted, fontSize: f.sub }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {triLang(lang, {
                      ru: 'Смотрю, что можно сказать лучше…',
                      uk: 'Дивлюся, що можна сказати краще…',
                      en: 'Looking at what could be said better…',
                      es: 'Reviso qué se puede decir mejor…',
                      'pt-BR': 'Vendo o que dá para dizer melhor…',
                      vi: 'Đang xem câu nào có thể nói hay hơn…',
                      id: 'Melihat apa yang bisa diucapkan lebih baik…',
                      tr: 'Daha iyi nasıl söylenebilir, bakıyorum…',
                      pl: 'Sprawdzam, co można powiedzieć lepiej…',
                    })}
                  </Text>
                ) : null}
                <TouchableOpacity
                  onPress={onBack}
                  accessibilityRole="button"
                  style={{
                    marginTop: 4,
                    minHeight: 50,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: t.accent,
                  }}
                >
                  <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                    {triLang(lang, {
                      ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo', 'pt-BR': 'Pronto',
                      vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
            {/* Рекомендации и «Как сказать…» — ровно как в диалоге. Строка
                видна, когда Макс прислал готовые ответы. */}
            {lastTutorCoach.suggestions.length > 0 && !sending ? (
              <DialogHelperRow
                lang={lang}
                hint=""
                suggestions={lastTutorCoach.suggestions}
                onUse={(value) => setInput(value)}
                onHowToSay={() => setHowToSayOpen(true)}
                testID="tutor-helper"
              />
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8, backgroundColor: t.bgPrimary }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={triLang(lang, {
                  ru: 'Ответь Максу…', uk: 'Відповідай Максу…', en: 'Reply to Max…', es: 'Responde a Max…',
                  'pt-BR': 'Responda ao Max…', vi: 'Trả lời Max…', id: 'Balas Max…',
                  tr: 'Max’a yanıt ver…', pl: 'Odpowiedz Maxowi…',
                })}
                placeholderTextColor={t.textMuted}
                editable={!sending}
                multiline
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={send}
                accessibilityLabel={triLang(lang, {
                  ru: 'Ответ Максу', uk: 'Відповідь Максу', en: 'Reply to Max', es: 'Respuesta a Max',
                  'pt-BR': 'Resposta ao Max', vi: 'Trả lời Max', id: 'Balasan untuk Max',
                  tr: 'Max’a yanıt', pl: 'Odpowiedź dla Maxa',
                })}
                style={{
                  flex: 1,
                  backgroundColor: t.bgCard,
                  borderRadius: 22,
                  paddingHorizontal: 18,
                  paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                  color: t.textPrimary,
                  fontSize: f.body,
                  maxHeight: 120,
                }}
                maxFontSizeMultiplier={1.2}
              />
              <TouchableOpacity
                onPress={send}
                disabled={!input.trim() || sending}
                accessibilityRole="button"
                accessibilityState={{ disabled: !input.trim() || sending }}
                accessibilityLabel={triLang(lang, {
                  ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar',
                  vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij',
                })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: input.trim() && !sending ? t.accent : t.bgSurface,
                  opacity: input.trim() && !sending ? 1 : 0.5,
                }}
              >
                <Ionicons name="arrow-up" size={22} color={input.trim() && !sending ? t.correctText : t.textMuted} />
              </TouchableOpacity>
            </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* «Почему так» — та же шторка, что в диалоге: объяснение, перевод,
          рекомендации. Всё уже приехало с репликой, генерации нет. */}
      <DialogWhySheet
        visible={whySheetIndex != null}
        onClose={() => setWhySheetIndex(null)}
        lang={lang}
        quote={whySheetIndex != null ? stripMarkers(messages[whySheetIndex]?.text ?? '') : ''}
        coach={whySheetIndex != null ? coachByIndex[whySheetIndex] ?? EMPTY_COACH : EMPTY_COACH}
        onUseSuggestion={(value) => {
          setInput(value);
          setWhySheetIndex(null);
        }}
        testID="tutor-why-sheet"
      />

      {/* «Как сказать…»: мысль на родном языке → варианты на изучаемом. */}
      <DialogHowToSaySheet
        visible={howToSayOpen}
        onClose={() => setHowToSayOpen(false)}
        lang={lang}
        cefr={cefr}
        studyTarget={studyTarget}
        // У урока нет сценария: ключом кэша служит цель занятия.
        scenarioId={goal?.id ?? 'tutor_lesson'}
        onUse={(value) => {
          setInput(value);
          setHowToSayOpen(false);
        }}
        testID="tutor-how-to-say"
      />
    </ScreenGradient>
  );
}

/**
 * Согласие на ИИ — снаружи компонента: внутри несколько точек отправки, одна
 * внешняя проверка надёжнее (тот же приём, что у экрана диалога).
 */
export default function TutorSessionRoute() {
  return (
    <AiDialogConsentGate>
      <TutorSession />
    </AiDialogConsentGate>
  );
}
