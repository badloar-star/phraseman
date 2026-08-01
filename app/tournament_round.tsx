// ═══════════════════════════════════════════════════════════════════════════
// tournament_round.tsx — раунд турнира (макеты 09-13, 25-28).
//
// зачем: сердце режима. Батч из 4 вопросов, точки прогресса, кольцо таймера,
// множитель серии, фидбек «Правильно!»/«Почти!» и переход по серверному окну.
// Слово «неверно» запрещено — только «Почти!» (правило владельца).
//
// Layout stability: карточка вопроса и блок вариантов имеют фиксированную
// геометрию с первого кадра. Фидбек-плашка занимает зарезервированное место,
// поэтому варианты не «прыгают» при её появлении.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextProps } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { fk } from './feedback/feedback_kit';
import { TimerRing } from '../components/tournament/TournamentCountdown';
import { Sheet } from '../components/tournament/tournament_ui';
import {
  V2Card,
  V2Chip,
  V2ChipGhost,
  V2Counter,
  V2Cta,
  V2Segments,
  V2StreakPill,
} from '../components/tournament/tournament_v2_ui';
import {
  StarGlyph,
  TournamentFxHost,
  type TournamentFxApi,
} from '../components/tournament/TournamentFx';
import { radius, type, useTournamentPalette, v2motion, type TournamentPalette} from '../components/tournament/tournament_theme';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import { TournamentRoundIntro } from '../components/tournament/TournamentRoundIntro';
import {
  canRetryTournamentTaskAnswer, forfeitTournament, getOrCreateTournamentTaskIdempotencyKey,
  isTournamentAnswerWindowOpen,
  isRetryableTournamentTaskAnswerError, isTableState, isTournamentTaskWindowResolved,
  resolveTournamentRoomIdParam, resolveTournamentScheduledTaskIndex,
  resolveTournamentVisibleTaskIndex,
  shouldShowTournamentLocalIntro,
  submitSpeedMatchAttempt, submitTaskAnswer, tournamentNow, tournamentSecondsUntil,
  useTournamentReactions, useTournamentRoom,
  type PublicTask, type RoomTaskTiming } from './tournament_client';
import { useLocalSearchParams } from 'expo-router';
import { getStableId, peekStableId } from './stable_id';

// зачем 2026-07-27 (владелец: «4 вопроса в раунде»): здесь лежала третья
// версия одного и того же числа — сервер собирал 6 заданий, а клиент считал 5.
// Значение используется только как запасное, пока задания не пришли; реальное
// число берётся из questions.length, но расходиться они больше не должны.
const QUESTIONS_PER_ROUND = 4;
const SPEED_MATCH_PAIRS = 6;
const MATCH_SELECT_MS = 140;
const MATCH_CORRECT_POP_MS = 160;
const MATCH_CORRECT_FADE_MS = 240;
const MATCH_WRONG_TONE_MS = 300;
const LETTERS = ['A', 'B', 'C', 'D'] as const;
const OWNER_APPROVED_TOURNAMENT_MODES = new Set([
  'guess_phrase',
  'fill_gap',
  'find_oddity',
  'translate_build',
  'speed_match',
]);
const CHOICE_MODES = new Set(['guess_phrase', 'fill_gap', 'find_oddity']);
const MODE_LABELS: Record<string, string> = {
  guess_phrase: 'Живая ситуация',
  fill_gap: 'Пропущенное слово',
  find_oddity: 'Так не говорят',
  translate_build: 'Собери фразу',
  speed_match: 'Пары на скорость',
};

type MatchPair = { prompt: string; options: string[] };
type MatchStatus = { verdict: 'correct' | 'wrong'; selectedIndex: number };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const QUESTION_ENTER = SlideInRight.duration(v2motion.taskSwapMs)
  .easing(Easing.bezier(...v2motion.bezierSlide).factory());
const QUESTION_EXIT = SlideOutLeft.duration(v2motion.press)
  .easing(Easing.bezier(...v2motion.bezierSlide).factory());

/**
 * Tournament cards have fixed, mock-approved geometry and the product contract
 * explicitly caps question/answer copy at two rendered lines. Keep that native
 * truncation exception in one reviewed component instead of scattering it
 * across every interactive answer surface. Each parent control exposes the
 * complete answer through its accessibility label.
 */
function TournamentTwoLineText(props: TextProps) {
  // eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- explicit tournament fixed-geometry product contract
  return <Text {...props} numberOfLines={2} />;
}

type Question = {
  /** taskId исходного задания — на него ссылается ответ. */
  taskId: string;
  /** Режим источника — один из пяти вариантов, утверждённых владельцем. */
  mode: string;
  kind: 'choice' | 'translate' | 'match';
  prompt: string;
  phrase: string;
  /** Варианты для choice; пусто для translate/match. */
  options: string[];
  /** Банк слов вразнобой для translate; пусто для choice/match. */
  wordBank: string[];
  /** Number of answer words; distractors must never be required to submit. */
  requiredTokenCount: number;
  /** Позиция ответа внутри задания; для choice/translate всегда 0. */
  itemIndex: number;
  /** Сколько всего ответов в задании — 1 для choice/translate. */
  itemCount: number;
  /** One speed-match task is a single board with six independently answered pairs. */
  matchPairs?: MatchPair[];
  /**
   * Общая правая колонка нового поля speed_match. Сам набор переводов не
   * раскрывает соответствия; их связывают только room-salted fingerprints.
   * Отсутствует у старого формата с 4 вариантами на строку.
   */
  matchOptions?: string[];
};

/**
 * Публичное задание сервера → один или несколько вопросов экрана.
 *
 * зачем: сервер НЕ присылает правильный ответ (его вырезает publicPayload),
 * поэтому подсветку верного варианта показывать нечем. Мгновенный отклик даём
 * по факту нажатия, а очки считает сервер — так накрутить нельзя.
 *
 * Исторические режимы могут оставаться в старых документах для аудита, но
 * активный игровой экран их не интерпретирует и не показывает.
 */
function taskToQuestions(task: PublicTask): Question[] {
  const payload = task.payload ?? {};
  if (!OWNER_APPROVED_TOURNAMENT_MODES.has(task.mode)) return [];
  if (task.kind === 'choice' && CHOICE_MODES.has(task.mode)) {
    const options = Array.isArray(payload.options) ? (payload.options as string[]) : [];
    const phrase = String(payload.phrase ?? '');
    if (!phrase || options.length < 2) return [];
    return [{
      taskId: task.taskId, mode: task.mode, kind: 'choice', prompt: 'Что это значит?', phrase, options,
      wordBank: [], requiredTokenCount: 0, itemIndex: 0, itemCount: 1,
    }];
  }
  if (task.kind === 'match' && task.mode === 'speed_match') {
    const items = Array.isArray(payload.items) ? (payload.items as Record<string, unknown>[]) : [];
    const matchPairs = items.map((item): MatchPair | null => {
      const prompt = String(item?.prompt ?? '');
      const options = Array.isArray(item?.options) ? (item.options as string[]) : [];
      return prompt && options.length >= 2 ? { prompt, options } : null;
    }).filter((pair): pair is MatchPair => pair !== null);
    // A partial field is unplayable: every speed round is exactly six pairs.
    if (items.length !== SPEED_MATCH_PAIRS || matchPairs.length !== SPEED_MATCH_PAIRS) return [];
    return [{
      taskId: task.taskId,
      mode: task.mode,
      kind: 'match',
      prompt: String(payload.prompt ?? 'Соедини пары'),
      phrase: '',
      options: [],
      wordBank: [],
      requiredTokenCount: 0,
      itemIndex: 0,
      itemCount: matchPairs.length,
      matchPairs,
      matchOptions: Array.isArray(payload.rightOptions)
        ? (payload.rightOptions as string[])
        : undefined,
    }];
  }
  if (task.kind === 'translate' && task.mode === 'translate_build') {
    // зачем: генератор кладёт в пул 3276 заданий translate_build (столько же,
    // сколько choice) — сервер выбирает режим раунда случайно, поэтому без
    // этой ветки треть турниров зависала бы на «Готовим вопросы…» навсегда
    // (найдено аудитом 2026-07-25).
    const wordBank = Array.isArray(payload.wordBank) ? (payload.wordBank as string[]) : [];
    const requiredTokenCount = Math.trunc(Number(payload.correctTokenCount));
    const phrase = String(payload.phrase ?? '');
    if (!phrase || wordBank.length < 2 || requiredTokenCount < 2 || requiredTokenCount > wordBank.length) return [];
    return [{
      taskId: task.taskId, mode: task.mode, kind: 'translate', prompt: 'Собери фразу', phrase,
      options: [], wordBank, requiredTokenCount, itemIndex: 0, itemCount: 1,
    }];
  }
  return [];
}

type Phase = 'intro' | 'reading' | 'question' | 'feedback';

/** Re-entering a room must resume the server's current phase, never a local default. */
const derivePhaseFromTiming = (
  timing: RoomTaskTiming | null,
  nowMs: number,
): Exclude<Phase, 'intro'> => {
  if (!timing) return 'question';
  const readingEndsAtMs = timing.readingEndsAtMs ?? timing.startsAtMs;
  if (nowMs < readingEndsAtMs) return 'reading';
  const answerEndsAtMs = timing.answerDeadlineAtMs ?? timing.deadlineAtMs;
  if (nowMs < answerEndsAtMs) return 'question';
  return 'feedback';
};

const deriveDisplayedSecondsLeft = (
  phase: Phase,
  timing: RoomTaskTiming | null,
  secondsForQuestion: number,
  fallbackSecondsLeft: number,
  nowMs: number,
): number => {
  if (phase === 'reading') return secondsForQuestion;
  if (!timing) return Math.max(0, fallbackSecondsLeft);
  return Math.min(
    secondsForQuestion,
    tournamentSecondsUntil(timing.answerDeadlineAtMs ?? timing.deadlineAtMs, nowMs),
  );
};

export default function TournamentRoundScreen() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string | string[] }>();
  const roomId = resolveTournamentRoomIdParam(params.roomId);
  const runtimeActive = useRuntimeActive();
  const reduceMotion = useReduceMotion();

  const { room, status, freshSnapshot, secondsLeft: stateSecondsLeft, retry } = useTournamentRoom(roomId, runtimeActive);
  const { incoming: incomingReactions, consume: consumeReaction } = useTournamentReactions(roomId, runtimeActive);

  const [navigation, setNavigation] = useState<{ roundKey: string; index: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [picked, setPicked] = useState<number | null>(null);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const [feedbackEarnedStars, setFeedbackEarnedStars] = useState<number | null>(null);
  const [feedbackZeroScoreReason, setFeedbackZeroScoreReason] = useState<null | 'incorrect_answer' | 'speed_match_penalty'>(null);
  const [feedbackExplanation, setFeedbackExplanation] = useState<{ ruleNote: string; example: string } | null>(null);
  const [feedbackCorrectIndex, setFeedbackCorrectIndex] = useState<number | null>(null);
  const [forfeitConfirmVisible, setForfeitConfirmVisible] = useState(false);
  const [forfeiting, setForfeiting] = useState(false);
  const [forfeitError, setForfeitError] = useState('');
  // Звёзды и серия — только из серверного snapshot. Публичное задание не
  // содержит ключ ответа, поэтому любой локальный инкремент на тап выдавал бы
  // неверный выбор за правильный. До следующего submit показываем последнее
  // подтверждённое сервером значение, не прогноз.
  const [myId, setMyId] = useState<string | null>(() => peekStableId());
  // Match rounds start perfect; every incorrect attempt removes one star permanently,
  // while the row itself remains available so the player can correct it.
  const [matchStars, setMatchStars] = useState(3);
  const [matchStatus, setMatchStatus] = useState<Record<number, MatchStatus>>({});
  const fxRef = useRef<TournamentFxApi>(null);
  const starCounterRef = useRef<View>(null);
  const streakPillRef = useRef<View>(null);
  const [fxSize, setFxSize] = useState({ width: 0, height: 0 });
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [resolvedTaskIds, setResolvedTaskIds] = useState<Set<string>>(() => new Set());
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskAnswersRef = useRef(new Map<string, unknown>());
  const taskIdempotencyKeysRef = useRef(new Map<string, string>());
  const pendingTaskSubmissionsRef = useRef(new Map<string, string>());
  const activeTaskSubmissionRef = useRef<string | null>(null);
  const activeQuestionKeyRef = useRef<string | null>(null);
  const screenMountedRef = useRef(true);
  const previousRuntimeActiveRef = useRef(runtimeActive);
  const previousRoomStatusRef = useRef(status);

  useEffect(() => {
    screenMountedRef.current = true;
    activeTaskSubmissionRef.current = null;
    let cancelled = false;
    void getStableId().then((id) => { if (!cancelled) setMyId(id); });
    return () => {
      cancelled = true;
      screenMountedRef.current = false;
      activeTaskSubmissionRef.current = null;
      activeQuestionKeyRef.current = null;
    };
  }, []);

  const authoritativePlayer = useMemo(
    () => (myId ? room?.players?.find((player) => player.id === myId) ?? null : null),
    [myId, room?.players],
  );
  const streak = Math.max(0, Math.trunc(Number(authoritativePlayer?.streak ?? 0)));
  const stars = Math.max(0, Math.trunc(Number(authoritativePlayer?.score ?? 0)));

  const activeRoundNo = useMemo(() => {
    const match = /^round([1-4])$/.exec(room?.state ?? '');
    return match ? Number(match[1]) : null;
  }, [room?.state]);
  const activeRound = useMemo(
    () => room?.rounds?.find((round) => round.roundNo === activeRoundNo) ?? null,
    [activeRoundNo, room?.rounds],
  );
  const roundNo = activeRound?.roundNo ?? 1;

  const questions = useMemo(() => {
    const tasks = activeRound?.tasks ?? [];
    return tasks.flatMap(taskToQuestions);
  }, [activeRound?.tasks]);

  const total = questions.length || QUESTIONS_PER_ROUND;
  const scheduleNowMs = tournamentNow();
  const elapsedTaskIds = new Set(
    (activeRound?.taskSchedule ?? [])
      .filter((timing) => isTournamentTaskWindowResolved(timing, scheduleNowMs))
      .map((timing) => timing.taskId),
  );
  const allQuestionsResolved = questions.length > 0
    && questions.every((candidate) => (
      resolvedTaskIds.has(candidate.taskId) || elapsedTaskIds.has(candidate.taskId)
    ));
  const markTaskResolved = useCallback((taskId: string) => {
    setResolvedTaskIds((previous) => {
      if (previous.has(taskId)) return previous;
      const next = new Set(previous);
      next.add(taskId);
      return next;
    });
  }, []);
  const roundKey = `${roomId ?? 'room'}:${roundNo}`;
  useEffect(() => {
    setResolvedTaskIds(new Set());
  }, [roundKey]);
  const scheduledIndex = resolveTournamentScheduledTaskIndex(activeRound?.taskSchedule, scheduleNowMs);
  const index = resolveTournamentVisibleTaskIndex(
    activeRound?.taskSchedule,
    scheduleNowMs,
    navigation?.roundKey === roundKey ? navigation.index : undefined,
  );
  const question = questions[index] ?? null;
  const questionKey = question ? `${question.taskId}:${question.itemIndex}` : null;
  const showRoundFinish = question?.kind !== 'translate';
  const questionTiming = useMemo(() => {
    if (!question) return null;
    return activeRound?.taskSchedule?.find((timing) => (
      timing.taskId === question.taskId && timing.taskIndex === index
    )) ?? activeRound?.taskSchedule?.find((timing) => timing.taskId === question.taskId) ?? null;
  }, [activeRound?.taskSchedule, index, question]);
  const nextQuestionTiming = useMemo(() => (
    activeRound?.taskSchedule?.find((timing) => timing.taskIndex === index + 1) ?? null
  ), [activeRound?.taskSchedule, index]);
  const secondsForQuestion = questionTiming?.durationMs
    ? Math.max(1, Math.ceil(questionTiming.durationMs / 1000))
    : Math.max(1, stateSecondsLeft);
  const taskTimerActive = phase === 'question' || phase === 'feedback';
  const displayedSecondsLeft = secondsLeft ?? deriveDisplayedSecondsLeft(
    phase,
    questionTiming,
    secondsForQuestion,
    stateSecondsLeft,
    tournamentNow(),
  );
  const readingEndsAtMs = questionTiming?.readingEndsAtMs ?? questionTiming?.startsAtMs ?? null;
  const feedbackEndsAtMs = questionTiming?.feedbackEndsAtMs
    ?? nextQuestionTiming?.startsAtMs
    ?? questionTiming?.deadlineAtMs
    ?? null;
  // Selection paints immediately. As soon as the authoritative verdict lands,
  // reveal it without waiting for the cosmetic feedback boundary.
  const feedbackVisible = phase === 'feedback' && feedbackCorrect !== null;
  const serverScheduleHasStarted = Boolean(activeRound?.taskSchedule?.some(
    (timing) => tournamentNow() >= timing.startsAtMs,
  ));
  const showLocalIntro = !serverScheduleHasStarted && shouldShowTournamentLocalIntro(
    questionTiming,
    tournamentNow(),
    room?.introEndsAtMs,
  );

  useEffect(() => {
    activeQuestionKeyRef.current = questionKey;
  }, [questionKey]);

  useEffect(() => {
    const resumed = runtimeActive && !previousRuntimeActiveRef.current;
    const reconnected = previousRoomStatusRef.current === 'offline' && status !== 'offline';
    if (resumed || reconnected) {
      const scheduledQuestion = questions[scheduledIndex] ?? null;
      const scheduledTaskId = scheduledQuestion?.taskId ?? null;
      const scheduledQuestionKey = scheduledQuestion
        ? `${scheduledQuestion.taskId}:${scheduledQuestion.itemIndex}`
        : null;
      const scheduledQuestionTiming = scheduledTaskId === null ? null
        : activeRound?.taskSchedule?.find((timing) => (
          timing.taskId === scheduledTaskId && timing.taskIndex === scheduledIndex
        )) ?? activeRound?.taskSchedule?.find((timing) => timing.taskId === scheduledTaskId) ?? null;
      const scheduledSubmissionToken = scheduledTaskId === null
        ? null
        : pendingTaskSubmissionsRef.current.get(scheduledTaskId) ?? null;
      const scheduledTaskHandled = scheduledTaskId !== null && (
        scheduledSubmissionToken !== null
        || resolvedTaskIds.has(scheduledTaskId)
      );
      if (activeTaskSubmissionRef.current !== scheduledSubmissionToken) {
        activeTaskSubmissionRef.current = null;
      }
      activeQuestionKeyRef.current = scheduledQuestionKey;
      setNavigation({ roundKey, index: scheduledIndex });
      if (phase !== 'intro') {
          setPhase(scheduledTaskHandled
            ? 'feedback'
            : derivePhaseFromTiming(scheduledQuestionTiming, tournamentNow()));
      }
      if (!scheduledTaskHandled) {
        setPicked(null);
        setFeedbackCorrect(null);
        setFeedbackEarnedStars(null);
        setFeedbackZeroScoreReason(null);
        setFeedbackExplanation(null);
        setFeedbackCorrectIndex(null);
      }
    }
    previousRuntimeActiveRef.current = runtimeActive;
    previousRoomStatusRef.current = status;
  }, [activeRound?.taskSchedule, phase, questions, resolvedTaskIds, roundKey, runtimeActive, scheduledIndex, status]);
  // зачем 2026-07-27 (владелец: «потом отсчёт перед началом типа 3 2 1, потом
  // начинается первый вопрос»): фиксированная пауза 1600 мс заменена живым
  // отсчётом. Момент старта задаёт сам отсчёт (onDone), поэтому таймера здесь
  // больше нет — иначе два независимых таймера разошлись бы между собой.
  const startQuestions = useCallback(() => {
    setNavigation({ roundKey, index: scheduledIndex });
    setPhase(derivePhaseFromTiming(questionTiming, tournamentNow()));
  }, [questionTiming, roundKey, scheduledIndex]);

  useEffect(() => {
    if (phase === 'intro' && !showLocalIntro) startQuestions();
  }, [phase, showLocalIntro, startQuestions]);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setPicked(null);
    setFeedbackCorrect(null);
    setFeedbackEarnedStars(null);
    setFeedbackZeroScoreReason(null);
    setFeedbackExplanation(null);
    setFeedbackCorrectIndex(null);
    setMatchStars(3);
    setMatchStatus({});
  }, [questionKey]);

  // Таймер задания читает только абсолютное серверное окно. Локальные часы
  // участвуют лишь через уже скорректированный tournamentNow(); собственных
  // gameplay-дедлайнов экран не создаёт.
  useEffect(() => {
    if (!taskTimerActive) {
      setSecondsLeft(null);
      return;
    }
    // Старые уже идущие комнаты могли не иметь taskSchedule. Не выдумываем
    // для них длительность режима: показываем общий серверный дедлайн раунда.
    if (!questionTiming) {
      setSecondsLeft(Math.max(0, stateSecondsLeft));
      return;
    }
    if (!runtimeActive) return;
    const tick = () => {
      const serverNowMs = tournamentNow();
      const remaining = serverNowMs < (questionTiming.readingEndsAtMs ?? questionTiming.startsAtMs)
        ? secondsForQuestion
        : tournamentSecondsUntil(questionTiming.answerDeadlineAtMs ?? questionTiming.deadlineAtMs, serverNowMs);
      setSecondsLeft(Math.min(secondsForQuestion, remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [questionTiming, runtimeActive, secondsForQuestion, stateSecondsLeft, taskTimerActive]);

  const goNext = useCallback(() => {
    // A previous request may resolve after the absolute feedback boundary.
    // Invalidate it before showing another task so it cannot repaint new UI.
    activeTaskSubmissionRef.current = null;
    activeQuestionKeyRef.current = null;
    if (index + 1 >= total) {
      router.replace(roomId ? { pathname: '/tournament_table', params: { roomId, completedRound: String(roundNo) } } : '/tournament_table');
      return;
    }
    setNavigation({ roundKey, index: index + 1 });
    setPicked(null);
    setFeedbackCorrect(null);
    setMatchStatus({});
    setPhase(nextQuestionTiming && tournamentNow() < nextQuestionTiming.startsAtMs ? 'reading' : 'question');
  }, [index, nextQuestionTiming, total, roomId, roundKey, roundNo, router]);

  // If the server exposes an upcoming task before its absolute startsAtMs,
  // the question may be read but cannot be answered yet. No local reading
  // constant exists: the schedule alone owns the transition.
  useEffect(() => {
    if (phase !== 'reading' || !questionTiming || !runtimeActive) return;
    if (readingEndsAtMs === null) {
      setPhase('question');
      return;
    }
    const delayMs = Math.max(0, readingEndsAtMs - tournamentNow());
    if (delayMs === 0) {
      setPhase('question');
      return;
    }
    const id = setTimeout(() => setPhase('question'), delayMs);
    return () => clearTimeout(id);
  }, [phase, questionTiming, readingEndsAtMs, runtimeActive]);

  const feedbackAdvanceAtMs = feedbackEndsAtMs;
  const scheduleFeedbackAdvance = useCallback(() => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    if (feedbackAdvanceAtMs === null) {
      goNext();
      return;
    }
    const delayMs = Math.max(0, feedbackAdvanceAtMs - tournamentNow());
    if (delayMs === 0) {
      goNext();
      return;
    }
    advanceRef.current = setTimeout(goNext, delayMs);
  }, [feedbackAdvanceAtMs, goNext]);

  useEffect(() => {
    if (phase === 'feedback' && runtimeActive) scheduleFeedbackAdvance();
  }, [phase, runtimeActive, scheduleFeedbackAdvance]);

  const confirmForfeit = useCallback(async () => {
    if (!roomId || forfeiting || !runtimeActive) return;
    setForfeiting(true);
    setForfeitError('');
    try {
      await forfeitTournament(roomId);
      activeTaskSubmissionRef.current = null;
      activeQuestionKeyRef.current = null;
      router.replace('/tournaments');
    } catch {
      setForfeitError('Не удалось выйти из турнира. Попробуйте ещё раз.');
      setForfeiting(false);
    }
  }, [forfeiting, roomId, router, runtimeActive]);

  const submitCurrentTaskAnswer = useCallback(async (task: Question, optimisticAnswer: unknown) => {
    if (!roomId || pendingTaskSubmissionsRef.current.has(task.taskId)) return;
    const answer = taskAnswersRef.current.get(task.taskId) ?? optimisticAnswer;
    taskAnswersRef.current.set(task.taskId, answer);
    const idempotencyKey = getOrCreateTournamentTaskIdempotencyKey(
      taskIdempotencyKeysRef.current,
      roomId,
      roundNo,
      task.taskId,
    );
    const submissionToken = `${roundKey}:${task.taskId}:${idempotencyKey}`;
    activeTaskSubmissionRef.current = submissionToken;
    pendingTaskSubmissionsRef.current.set(task.taskId, submissionToken);
    // The tap completes this task in the local flow immediately. Correctness,
    // stars, and standings still come exclusively from the server response.
    markTaskResolved(task.taskId);
    setNavigation({ roundKey, index });
    setPhase('feedback');
    setFeedbackCorrect(null);
    setFeedbackEarnedStars(null);
    setFeedbackZeroScoreReason(null);
    setFeedbackExplanation(null);
    setFeedbackCorrectIndex(null);
    // The visual transition belongs to the server-authored absolute boundary,
    // not to network latency from the scoring callable.
    scheduleFeedbackAdvance();
    try {
      let result;
      try {
        result = await submitTaskAnswer(roomId, roundNo, task.taskId, answer, idempotencyKey);
      } catch (error) {
        if (!screenMountedRef.current) throw error;
        if (!isRetryableTournamentTaskAnswerError(error)
          || !canRetryTournamentTaskAnswer(questionTiming, tournamentNow())) throw error;
        // Retry the exact immutable payload once in the background. The same
        // idempotency key makes a lost response safe to replay.
        result = await submitTaskAnswer(roomId, roundNo, task.taskId, answer, idempotencyKey);
      }
      if (!screenMountedRef.current || activeTaskSubmissionRef.current !== submissionToken) return;
      setFeedbackCorrect(result.correct);
      setFeedbackEarnedStars(result.earnedStars);
      setFeedbackZeroScoreReason(result.zeroScoreReason);
      setFeedbackExplanation(result.explanation);
      setFeedbackCorrectIndex(typeof result.correctIndex === 'number' ? result.correctIndex : null);
      if (result.correct) fk.correct();
      else fk.wrong();
    } catch {
      if (!screenMountedRef.current || activeTaskSubmissionRef.current !== submissionToken) return;
      // Never turn transport latency into visible gameplay state or paint an
      // unconfirmed answer as wrong. Refreshing the authoritative snapshot can
      // still recover a response that reached the server before the connection
      // failed.
      void retry();
    } finally {
      if (pendingTaskSubmissionsRef.current.get(task.taskId) === submissionToken) {
        pendingTaskSubmissionsRef.current.delete(task.taskId);
      }
    }
  }, [index, markTaskResolved, questionTiming, retry, roomId, roundKey, roundNo, scheduleFeedbackAdvance]);

  /**
   * «Готово» — игрок закончил раунд раньше дедлайна.
   *
   * зачем 2026-07-27 (владелец: «можно внизу нажать на кнопку готово… и это
   * учитывается в скорость выполнения; если юзер ответил раньше всех, он идёт
   * на турнирную таблицу, где видит таймер, пока все не доделают»): сервер
   * считает бонус скорости от времени ПРИХОДА пачки, поэтому ранняя отправка
   * реально прибавляет очки. Ждать общего дедлайна, сидя на отвеченном
   * вопросе, было бы прямой потерей.
   *
   * Every completed task has already been accepted independently. This button
   * only leaves the round; it does not create a second scoring path.
   */
  const [finishing, setFinishing] = useState(false);

  const finishEarly = useCallback(() => {
    if (finishing || !allQuestionsResolved) return;
    setFinishing(true);
    activeTaskSubmissionRef.current = null;
    activeQuestionKeyRef.current = null;
    router.replace(roomId
      ? { pathname: '/tournament_table', params: { roomId, completedRound: String(roundNo) } }
      : '/tournament_table');
  }, [allQuestionsResolved, finishing, roomId, roundNo, router]);

  const answer = useCallback((optionIndex: number) => {
    if (phase !== 'question' || !question
      || !isTournamentAnswerWindowOpen(questionTiming, tournamentNow())) return;
    const cached = taskAnswersRef.current.get(question.taskId) as { selectedIndex?: unknown } | undefined;
    const selectedIndex = typeof cached?.selectedIndex === 'number' ? cached.selectedIndex : optionIndex;
    setPicked(selectedIndex);
    void submitCurrentTaskAnswer(question, { selectedIndex });
  }, [phase, question, questionTiming, submitCurrentTaskAnswer]);

  /**
   * Подтверждение сборки фразы (translate) — вызывается, когда игрок собрал
   * фразу целиком (banklWords.length === 0) или нажал «Готово».
   * зачем: в отличие от choice, здесь нет единственного индекса — ответ это
   * ВЕСЬ собранный порядок слов, поэтому answer передаётся отдельно.
   */
  const answerTranslate = useCallback((tokens: string[]) => {
    if (phase !== 'question' || !question
      || !isTournamentAnswerWindowOpen(questionTiming, tournamentNow())) return;
    void submitCurrentTaskAnswer(question, { tokens });
  }, [phase, question, questionTiming, submitCurrentTaskAnswer]);

  const pendingMatchPairsRef = useRef(new Set<string>());
  const answerMatch = useCallback(async (pairIndex: number, selectedIndex: number): Promise<'correct' | 'wrong' | 'rejected'> => {
    if (phase !== 'question' || question?.kind !== 'match' || !roomId
      || !isTournamentAnswerWindowOpen(questionTiming, tournamentNow())) return 'rejected';
    const attemptQuestionKey = questionKey;
    if (!attemptQuestionKey) return 'rejected';
    const attemptKey = `${question.taskId}:${pairIndex}`;
    if (matchStatus[pairIndex]?.verdict === 'correct') return 'rejected';
    if (pendingMatchPairsRef.current.has(attemptKey)) return 'rejected';
    pendingMatchPairsRef.current.add(attemptKey);
    setMatchStatus((current) => {
      if (current[pairIndex]?.verdict !== 'wrong') return current;
      const next = { ...current };
      delete next[pairIndex];
      return next;
    });
    try {
      const result = await submitSpeedMatchAttempt(roomId, roundNo, question.taskId, pairIndex, selectedIndex);
      if (!screenMountedRef.current || activeQuestionKeyRef.current !== attemptQuestionKey) return 'rejected';
      const isCorrect = result.correct === true;
      setMatchStatus((current) => ({
        ...current,
        [pairIndex]: { verdict: isCorrect ? 'correct' : 'wrong', selectedIndex },
      }));
      if (isCorrect) {
        fk.correct();
      } else {
        fk.wrong();
        setMatchStars((value) => Math.max(0, value - 1));
      }
      return isCorrect ? 'correct' : 'wrong';
    } catch {
      // No verdict is invented on network failure; both cards remain retryable.
      if (!screenMountedRef.current || activeQuestionKeyRef.current !== attemptQuestionKey) return 'rejected';
      return 'rejected';
    } finally {
      pendingMatchPairsRef.current.delete(attemptKey);
    }
  }, [phase, question, questionKey, questionTiming, roomId, roundNo, matchStatus]);

  const matchComplete = question?.kind === 'match'
    && question.matchPairs?.every((_, pairIndex) => matchStatus[pairIndex]?.verdict === 'correct');

  useEffect(() => {
    if (!matchComplete || phase !== 'question' || !question) return;
    const selectedIndexes = question.matchPairs?.map((_, pairIndex) => (
      matchStatus[pairIndex]?.selectedIndex ?? -1
    )) ?? [];
    void submitCurrentTaskAnswer(question, { selectedIndexes });
  }, [matchComplete, matchStatus, phase, question, submitCurrentTaskAnswer]);

  // Время вышло — пропуск, серия обнуляется.
  useEffect(() => {
    if (phase !== 'question' || secondsLeft !== 0 || !question) return;
    markTaskResolved(question.taskId);
    setPicked(null);
    setPhase('feedback');
    setFeedbackCorrect(null);
    scheduleFeedbackAdvance();
  }, [markTaskResolved, phase, secondsLeft, question, scheduleFeedbackAdvance]);

  // Сервер перевёл комнату дальше — уходим, даже если локально не досчитали.
  useEffect(() => {
    if (!runtimeActive || !freshSnapshot || !room || !roomId) return;
    if (isTableState(room.state) || room.state === 'final') {
      activeTaskSubmissionRef.current = null;
      activeQuestionKeyRef.current = null;
      router.replace({ pathname: '/tournament_table', params: { roomId } });
    }
    if (room.state === 'results' || room.state === 'rewards' || room.state === 'closed') {
      activeTaskSubmissionRef.current = null;
      activeQuestionKeyRef.current = null;
      router.replace({ pathname: '/tournament_results', params: { roomId } });
    }
  }, [freshSnapshot, room?.state, roomId, router, room, runtimeActive]);

  useEffect(() => {
    if (!runtimeActive && advanceRef.current) {
      clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  }, [runtimeActive]);

  useEffect(() => () => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
  }, []);

  if (status === 'offline') {
    return (
      <View style={styles.root}>
        <TournamentEdgeState kind="offline" onRetry={retry} />
      </View>
    );
  }
  if (room?.state === 'cancelled') {
    return (
      <View style={styles.root}>
        <TournamentEdgeState kind="cancelled" onRetry={() => router.replace('/tournaments')} />
      </View>
    );
  }

  if (phase === 'intro' && showLocalIntro) {
    const modeLabel = MODE_LABELS[questions[0]?.mode ?? ''] ?? 'Турнирный раунд';
    return (
      <TournamentRoundIntro
        roundNo={roundNo}
        modeLabel={modeLabel}
        introEndsAtMs={questionTiming?.introEndsAtMs ?? room?.introEndsAtMs ?? questionTiming?.startsAtMs ?? tournamentNow()}
        onDone={startQuestions}
      />
    );
  }

  // Задания ещё не пришли — держим геометрию интро, а не мигаем пустотой.
  if (!question) {
    return (
      <View style={[styles.root, styles.introRoot]}>
        <Text style={styles.introMode}>Готовим вопросы…</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.root}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setFxSize((prev) => (prev.width === width && prev.height === height
          ? prev : { width, height }));
      }}
    >
      {/* зачем 2026-07-27 (владелец: «почему всё так высоко задрано вверх, а
          внизу куча пустого пространства»): контент лип к верху, а низ экрана
          пустовал. Теперь высота распределена — вопрос занимает свою долю и
          центрируется, ответы идут следом, а управление прижато к низу
          (см. bottomBar под ScrollView). flexGrow позволяет содержимому
          дышать на больших экранах и скроллиться на маленьких. */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Шапка: тот же двухъярусный ритм, что в V2-макетах. Верхний ряд
            отвечает только за прогресс и время; режим и награды не сжимают
            сегменты на узких экранах. */}
        <View style={styles.header}>
          <Pressable
            onPress={() => { setForfeitError(''); setForfeitConfirmVisible(true); }}
            style={styles.forfeitButton}
            accessibilityRole="button"
            accessibilityLabel="Выйти из текущего турнира"
            accessibilityHint="Потребуется подтверждение; взнос не возвращается"
          >
            <Text style={styles.forfeitButtonText}>Выйти</Text>
          </Pressable>
          <Text style={styles.progressLabel}>
            Вопрос {index + 1} <Text style={styles.progressLabelDim}>из {total}</Text>
          </Text>
          <V2Segments total={total} done={index + 1} />
          <TimerRing seconds={displayedSecondsLeft} total={secondsForQuestion} />
        </View>
        <View style={styles.statsRow}>
          <View style={styles.modePill}>
            <TournamentTwoLineText style={styles.modePillText}>
              {MODE_LABELS[question.mode] ?? question.prompt}
            </TournamentTwoLineText>
          </View>
          <View style={styles.statsSpacer} />
          <V2StreakPill ref={streakPillRef} streak={streak} />
          <V2Counter ref={starCounterRef} value={question.kind === 'match' ? matchStars : stars} tone="stars" />
        </View>

        {/* Вопрос.
            зачем 2026-07-27 (владелец: «просто анимация перехода на след
            задание как в Learning V2»): key={questionKey} пересоздаёт блок на
            каждом задании, поэтому entering/exiting отрабатывают как смена
            карточки в эталоне — уходящее уезжает влево, новое приходит справа.
            Кривые те же, что в макете (--ease-slide / --ease-spring). */}
        <Animated.View
          key={questionKey ?? 'q'}
          entering={reduceMotion ? undefined : QUESTION_ENTER}
          exiting={reduceMotion ? undefined : QUESTION_EXIT}
          style={[
            styles.questionZone,
            question.kind !== 'choice' && styles.questionZoneCompact,
          ]}
        >
        {/* зачем 2026-07-27 (владелец): формулировка задания — НАД контейнером,
            а не внутри него. Внутри карточки она конкурировала с самим
            заданием (плеером/фразой) за первое место в чтении; вынесенная
            наверх, она читается как подпись к блоку. */}
        <TournamentTwoLineText style={styles.questionPrompt}>{question.prompt}</TournamentTwoLineText>
        {question.kind !== 'match' ? <V2Card pad={22} style={styles.questionCard}>
          {/* Фраза задания — основной учебный текст: её нельзя обрезать. */}
          <Text style={styles.questionPhrase}>{question.phrase}</Text>
        </V2Card> : null}
        </Animated.View>

        {/* Варианты, сборка фразы или пары на скорость. */}
        {question.kind === 'match' ? (
          <MatchBoard
            matchPairs={question.matchPairs ?? []}
            matchOptions={question.matchOptions}
            status={matchStatus}
            disabled={phase !== 'question' || !isTournamentAnswerWindowOpen(questionTiming, tournamentNow())}
            onSelect={answerMatch}
          />
        ) : question.kind === 'translate' ? (
          <WordBank
            key={question.taskId}
            wordBank={question.wordBank}
            requiredTokenCount={question.requiredTokenCount}
            revealed={feedbackVisible}
            disabled={phase !== 'question' || !isTournamentAnswerWindowOpen(questionTiming, tournamentNow())}
            correct={feedbackCorrect}
            onSubmit={answerTranslate}
          />
        ) : (
          <View style={styles.options}>
            {question.options.map((option, optionIndex) => (
              <OptionRow
                key={option}
                letter={LETTERS[optionIndex]}
                text={option}
                index={optionIndex}
                picked={picked}
                revealed={feedbackVisible}
                disabled={phase !== 'question' || !isTournamentAnswerWindowOpen(questionTiming, tournamentNow())}
                authoritativeCorrect={feedbackCorrect}
                authoritativeCorrectIndex={feedbackCorrectIndex}
                onPress={answer}
              />
            ))}
          </View>
        )}

        {question.kind === 'choice' ? (
          <View style={styles.choiceFeedback} accessibilityLiveRegion="polite">
            {feedbackVisible && feedbackCorrect !== null ? (
              <Animated.View
                entering={reduceMotion ? undefined : FadeInDown.duration(v2motion.fast)}
                style={[
                  styles.choiceFeedbackCard,
                  feedbackCorrect ? styles.choiceFeedbackCorrect : styles.choiceFeedbackWrong,
                ]}
              >
                <Text style={[
                  styles.choiceFeedbackMark,
                  { color: feedbackCorrect ? P.accentText : P.danger },
                ]}>
                  {feedbackCorrect ? '✓' : '×'}
                </Text>
                <TournamentTwoLineText
                  style={[styles.choiceFeedbackText, {
                    color: feedbackCorrect ? P.accentText : P.danger,
                  }]}
                >
                  {feedbackCorrect === true ? 'Правильно!' : 'Почти!'}
                </TournamentTwoLineText>
                {feedbackEarnedStars !== null ? (
                  <Text style={styles.feedbackSub}>
                    {feedbackEarnedStars > 0 ? `+${feedbackEarnedStars} звёзд` : '0 звёзд'}
                  </Text>
                ) : null}
                {feedbackZeroScoreReason && feedbackExplanation ? (
                  <View style={styles.feedbackExplanation}>
                    <Text style={styles.feedbackExplanationText}>{feedbackExplanation.ruleNote}</Text>
                    <Text style={styles.feedbackExplanationExample}>{feedbackExplanation.example}</Text>
                  </View>
                ) : null}
              </Animated.View>
            ) : null}
          </View>
        ) : null}

        {/* «Время вышло» не показываем. Для choice остаётся короткий бинарный
            результат сервера в заранее зарезервированном слоте; ключ ответа
            во время игры не раскрывается и выбранная плита не красится зелёным. */}
      </ScrollView>

      {/* Низ экрана: «Готово».
          зачем 2026-07-27 (владелец: «можно внизу нажать на кнопку готово…
          и это учитывается в скорость выполнения; если юзер ответил раньше
          всех, он идёт на турнирную таблицу, где видит таймер, пока все не
          доделают»): кнопка отмечает, что игрок закончил, и отправляет пачку
          РАНЬШЕ дедлайна. Сервер считает бонус скорости от времени прихода
          пачки (serverBoundedElapsedMs), поэтому ранний финиш действительно
          даёт больше очков — это не декорация.
          Заодно кнопка занимает низ, который раньше пустовал.

          зачем 2026-07-27 (владелец: «на кнопке текст просто ГОТОВО, и он
          только отмечает что юзер ответил, а не пропускает что-то»): подпись
          и тон больше не зависят от числа отвеченных вопросов. Прежнее
          «Готово · пропустить остальные» и приглушённый ghost-тон читались как
          штраф за досрочный финиш, хотя действие ровно одно — отметить, что
          игрок закончил, и отправить ответы. */}
      {showRoundFinish ? (
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <V2Cta
          onPress={finishEarly}
          disabled={finishing || !allQuestionsResolved}
          tone="accent"
        >
          {finishing ? 'Переходим…' : 'Готово'}
        </V2Cta>
      </View>
      ) : null}

      {/* Слой полётов поверх экрана: звёзды, конфетти, золотая волна.
          pointerEvents=none внутри — тапы проходят сквозь него к вариантам. */}
      <TournamentFxHost ref={fxRef} width={fxSize.width} height={fxSize.height} />
      <Sheet visible={forfeitConfirmVisible} onClose={() => !forfeiting && setForfeitConfirmVisible(false)}>
        <Text style={styles.forfeitTitle}>Выйти из турнира?</Text>
        <Text style={styles.forfeitText}>
          Вы покинете текущий турнир и потеряете возможность получить награду.
        </Text>
        <Text style={styles.forfeitWarning}>Взнос не возвращается.</Text>
        {forfeitError ? <Text style={styles.forfeitError}>{forfeitError}</Text> : null}
        <View style={styles.forfeitActions}>
          <V2Cta tone="ghost" disabled={forfeiting} onPress={() => setForfeitConfirmVisible(false)}>Остаться</V2Cta>
          <V2Cta tone="ghost" disabled={forfeiting} onPress={confirmForfeit}>
            {forfeiting ? 'Выходим…' : 'Подтвердить выход'}
          </V2Cta>
        </View>
      </Sheet>
    </View>
  );
}

// ── Вариант ответа ──────────────────────────────────────────────────────────

const OptionRow = memo(function OptionRow({
  letter, text, index, picked, revealed, disabled, authoritativeCorrect, authoritativeCorrectIndex, onPress,
}: {
  letter: string;
  text: string;
  index: number;
  picked: number | null;
  revealed: boolean;
  disabled: boolean;
  authoritativeCorrect: boolean | null;
  authoritativeCorrectIndex: number | null;
  onPress: (index: number) => void;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  // зачем 2026-07-27: плита варианта переведена на язык Learning V2 —
  // градиент, нижняя 3D-кромка, просадка на неё при нажатии. Выбранный
  // вариант не становится зелёным только потому, что был выбран. Во время
  // игры сервер раскрывает лишь итог correct:boolean, но не ключ ответа;
  // конкретный правильный вариант придёт позже в разборе турнира.
  const isPicked = picked === index;
  const isCorrectOption = revealed && authoritativeCorrectIndex === index;
  const verdict = isCorrectOption
    ? 'ok'
    : revealed && isPicked && authoritativeCorrect !== null
    ? authoritativeCorrect ? 'ok' : 'bad'
    : revealed && !isPicked ? 'dim' : 'idle';
  const answerState = revealed && isPicked && authoritativeCorrect !== null
    ? authoritativeCorrect ? ', ответ верный' : ', ответ не подошёл'
    : '';

  return (
    <V2Chip
      block
      verdict={verdict}
      selected={isPicked}
      disabled={disabled || revealed}
      onPress={() => onPress(index)}
      accessibilityLabel={`Вариант ${letter}: ${text}${answerState}`}
      left={(
        <View style={[
            styles.optionLetter,
            isCorrectOption && styles.optionLetterCorrect,
            revealed && isPicked && authoritativeCorrect === false && styles.optionLetterWrong,
          ]}>
          <Text style={[
            styles.optionLetterText,
            isCorrectOption && styles.optionLetterTextCorrect,
          ]}>{letter}</Text>
        </View>
      )}
      right={isCorrectOption ? (
        <Text style={[styles.optionMark, { color: P.accentText }]}>✓</Text>
      ) : revealed && isPicked && authoritativeCorrect === false ? (
        <Text style={[styles.optionMark, { color: P.danger }]}>×</Text>
      ) : null}
    >
      <TournamentTwoLineText style={[
        styles.optionText,
        isCorrectOption && styles.optionTextCorrect,
        revealed && isPicked && authoritativeCorrect === false && styles.optionTextWrong,
      ]}>{text}</TournamentTwoLineText>
    </V2Chip>
  );
});

const MatchBoard = memo(function MatchBoard({
  matchPairs, matchOptions, status, disabled, onSelect,
}: {
  matchPairs: MatchPair[];
  matchOptions?: string[];
  status: Record<number, MatchStatus>;
  disabled: boolean;
  onSelect: (pairIndex: number, selectedIndex: number) => Promise<'correct' | 'wrong' | 'rejected'>;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);

  // Старые поля имели отдельные 4 варианта на каждую строку. Они не должны
  // ломать уже начатую комнату, но в новые комнаты не попадают: у точного
  // переноса 07 всегда общая правая колонка из шести карточек.
  if (!matchOptions || matchOptions.length !== matchPairs.length) {
    return (
      <View style={styles.matchBoard} accessibilityLabel="Шесть пар слов на скорость">
        {matchPairs.map((pair, pairIndex) => {
          const pairStatus = status[pairIndex];
          return (
            <View key={`${pair.prompt}:${pairIndex}`} style={styles.matchRow}>
              <View style={styles.matchPrompt}>
                <TournamentTwoLineText style={styles.matchPromptText}>{pair.prompt}</TournamentTwoLineText>
              </View>
              <View style={styles.matchOptions}>
                {pair.options.map((option, optionIndex) => (
                  <V2Chip
                    key={`${option}:${optionIndex}`}
                    block
                    verdict={pairStatus?.selectedIndex === optionIndex
                      ? pairStatus.verdict === 'correct' ? 'ok' : 'bad'
                      : 'idle'}
                    disabled={disabled || pairStatus?.verdict === 'correct'}
                    onPress={() => { void onSelect(pairIndex, optionIndex); }}
                    accessibilityLabel={`${pair.prompt}: ${option}`}
                    style={styles.matchOption}
                  >
                    <TournamentTwoLineText style={styles.optionText}>{option}</TournamentTwoLineText>
                  </V2Chip>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return <StrictMatchBoard
    matchPairs={matchPairs}
    matchOptions={matchOptions}
    status={status}
    disabled={disabled}
    onSelect={onSelect}
  />;
});

const MatchCard = memo(function MatchCard({
  label,
  accessibilityLabel,
  selected,
  wrong,
  resolvingCorrect,
  hidden,
  disabled,
  reduceMotion,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  wrong: boolean;
  resolvingCorrect: boolean;
  hidden: boolean;
  disabled: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(hidden ? 0 : 1);

  useEffect(() => {
    if (hidden) {
      opacity.value = withTiming(0, { duration: 0 });
      return;
    }
    if (!resolvingCorrect) {
      opacity.value = withTiming(1, { duration: reduceMotion ? 0 : MATCH_SELECT_MS });
      scale.value = withTiming(1, { duration: reduceMotion ? 0 : MATCH_SELECT_MS });
      return;
    }
    if (reduceMotion) {
      opacity.value = withTiming(0, { duration: 0 });
      return;
    }
    scale.value = withSequence(
      withTiming(1.06, { duration: MATCH_CORRECT_POP_MS / 2 }),
      withTiming(0.97, { duration: MATCH_CORRECT_POP_MS / 2 }),
      withTiming(1, { duration: MATCH_CORRECT_FADE_MS }),
    );
    opacity.value = withDelay(
      MATCH_CORRECT_POP_MS,
      withTiming(0, { duration: MATCH_CORRECT_FADE_MS }),
    );
  }, [hidden, opacity, reduceMotion, resolvingCorrect, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }] as const,
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || hidden, selected }}
      accessibilityElementsHidden={hidden}
      disabled={disabled || hidden}
      onPress={onPress}
      style={[
        styles.strictMatchCard,
        selected && styles.strictMatchCardPicked,
        wrong && styles.strictMatchCardWrong,
        resolvingCorrect && styles.strictMatchCardCorrect,
        animatedStyle,
      ]}
    >
      <TournamentTwoLineText style={[
        styles.strictMatchText,
        selected && styles.strictMatchTextSelected,
        wrong && styles.strictMatchTextWrong,
        resolvingCorrect && styles.strictMatchTextCorrect,
      ]}>{label}</TournamentTwoLineText>
    </AnimatedPressable>
  );
});

const StrictMatchBoard = memo(function StrictMatchBoard({
  matchPairs, matchOptions, status, disabled, onSelect,
}: {
  matchPairs: MatchPair[];
  matchOptions: string[];
  status: Record<number, MatchStatus>;
  disabled: boolean;
  onSelect: (pairIndex: number, selectedIndex: number) => Promise<'correct' | 'wrong' | 'rejected'>;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const [pickedLeft, setPickedLeft] = useState<number | null>(null);
  const [pickedRight, setPickedRight] = useState<number | null>(null);
  const [pendingTuple, setPendingTuple] = useState<{ left: number; right: number } | null>(null);
  const [wrong, setWrong] = useState<{ left: number; right: number } | null>(null);
  const [reservedLeft, setReservedLeft] = useState<ReadonlySet<number>>(() => new Set());
  const [reservedRight, setReservedRight] = useState<ReadonlySet<number>>(() => new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickedLeftRef = useRef<number | null>(null);
  const pickedRightRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const releaseTuple = useCallback((left: number, right: number) => {
    setReservedLeft((current) => {
      const next = new Set(current);
      next.delete(left);
      return next;
    });
    setReservedRight((current) => {
      const next = new Set(current);
      next.delete(right);
      return next;
    });
  }, []);

  const clearTupleSelection = useCallback((tuple: { left: number; right: number }) => {
    if (!mountedRef.current) return;
    pickedLeftRef.current = null;
    pickedRightRef.current = null;
    setPickedLeft(null);
    setPickedRight(null);
    setPendingTuple((current) => (
      current?.left === tuple.left && current.right === tuple.right ? null : current
    ));
    releaseTuple(tuple.left, tuple.right);
  }, [releaseTuple]);

  const reserveTuple = useCallback((left: number, right: number) => {
    // Copy and reserve the pair. Both cards stay visibly selected until the
    // authoritative result arrives, while the immutable tuple prevents a
    // delayed A-X result from becoming an accidental B-X submission.
    const tuple = { left, right };
    setReservedLeft((current) => new Set(current).add(tuple.left));
    setReservedRight((current) => new Set(current).add(tuple.right));
    setPendingTuple(tuple);
    void onSelect(tuple.left, tuple.right).then((verdict) => {
      if (!mountedRef.current) return;
      if (verdict === 'wrong') {
        setWrong(tuple);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setWrong(null);
          clearTupleSelection(tuple);
        }, reduceMotion ? 0 : MATCH_WRONG_TONE_MS);
        return;
      }
      if (verdict === 'correct') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(
          () => clearTupleSelection(tuple),
          reduceMotion ? 0 : MATCH_CORRECT_POP_MS + MATCH_CORRECT_FADE_MS,
        );
        return;
      }
      clearTupleSelection(tuple);
    });
  }, [clearTupleSelection, onSelect, reduceMotion]);

  const pickLeft = useCallback((index: number) => {
    if (pendingTuple) return;
    if (disabled || reservedLeft.has(index) || status[index]?.verdict === 'correct') return;
    const next = pickedLeftRef.current === index ? null : index;
    pickedLeftRef.current = next;
    setPickedLeft(next);
    const right = pickedRightRef.current;
    if (next !== null && right !== null) reserveTuple(next, right);
  }, [disabled, pendingTuple, reserveTuple, reservedLeft, status]);
  const pickRight = useCallback((index: number) => {
    if (pendingTuple) return;
    if (disabled || reservedRight.has(index)) return;
    const next = pickedRightRef.current === index ? null : index;
    pickedRightRef.current = next;
    setPickedRight(next);
    const left = pickedLeftRef.current;
    if (left !== null && next !== null) reserveTuple(left, next);
  }, [disabled, pendingTuple, reserveTuple, reservedRight]);

  return (
    <View style={styles.strictMatchBoard} accessibilityLabel="Поле пар: английские слова и переводы">
      <View style={styles.strictMatchColumn}>
        {matchPairs.map((pair, index) => {
          const matched = status[index]?.verdict === 'correct';
          const selected = pickedLeft === index;
          const isWrong = wrong?.left === index;
          const resolvingCorrect = selected && pickedRight !== null && matched;
          return (
            <Animated.View key={`left:${pair.prompt}:${index}`} entering={reduceMotion ? undefined : FadeInDown.delay(index * 40).duration(260)} style={styles.matchSlot}>
              <MatchCard
                label={pair.prompt}
                accessibilityLabel={`Английское слово: ${pair.prompt}`}
                selected={selected}
                wrong={isWrong}
                resolvingCorrect={resolvingCorrect}
                hidden={matched && !resolvingCorrect}
                disabled={disabled || matched || reservedLeft.has(index)}
                onPress={() => pickLeft(index)}
                reduceMotion={reduceMotion}
              />
            </Animated.View>
          );
        })}
      </View>
      <View style={styles.strictMatchColumn}>
        {matchOptions.map((option, index) => {
          const matched = Object.values(status).some((entry) => entry.verdict === 'correct' && entry.selectedIndex === index);
          const selected = pickedRight === index;
          const isWrong = wrong?.right === index;
          const resolvingLeft = pickedLeft !== null ? status[pickedLeft] : undefined;
          const resolvingCorrect = selected && resolvingLeft?.verdict === 'correct'
            && resolvingLeft.selectedIndex === index;
          return (
            <Animated.View key={`right:${option}:${index}`} entering={reduceMotion ? undefined : FadeInDown.delay(index * 40).duration(260)} style={styles.matchSlot}>
              <MatchCard
                label={option}
                accessibilityLabel={`Перевод: ${option}`}
                selected={selected}
                wrong={isWrong}
                resolvingCorrect={resolvingCorrect}
                hidden={matched && !resolvingCorrect}
                disabled={disabled || matched || reservedRight.has(index)}
                onPress={() => pickRight(index)}
                reduceMotion={reduceMotion}
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
});

const WordBank = memo(function WordBank({
  wordBank, requiredTokenCount, revealed, disabled, correct, onSubmit,
}: {
  wordBank: string[];
  requiredTokenCount: number;
  revealed: boolean;
  disabled: boolean;
  correct: boolean | null;
  onSubmit: (tokens: string[]) => void;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const reduceMotion = useReduceMotion();
  // usedPositions — индексы слов банка, уже перенесённых в собранную фразу,
  // в порядке переноса. Сбрасывается при смене самого banklWords (новый
  // вопрос) через key={question.taskId} на родителе.
  const [usedPositions, setUsedPositions] = useState<number[]>([]);
  const usedSet = useMemo(() => new Set(usedPositions), [usedPositions]);

  const takeWord = useCallback((position: number) => {
    if (disabled || revealed || usedSet.has(position)) return;
    setUsedPositions((value) => [...value, position]);
  }, [disabled, revealed, usedSet]);

  const returnWord = useCallback((slotIndex: number) => {
    if (disabled || revealed) return;
    setUsedPositions((value) => value.filter((_, index) => index !== slotIndex));
  }, [disabled, revealed]);

  const submit = useCallback(() => {
    if (disabled || revealed || usedPositions.length !== requiredTokenCount) return;
    onSubmit(usedPositions.map((position) => wordBank[position]));
  }, [disabled, revealed, usedPositions, wordBank, requiredTokenCount, onSubmit]);

  const collected = usedPositions.map((position) => wordBank[position]);
  const isComplete = collected.length === requiredTokenCount && requiredTokenCount > 0;

  return (
    <View>
      {/* Собранная фраза — зарезервированное место фиксированной высоты,
          чтобы банк слов ниже не прыгал по мере сборки.
          зачем 2026-07-27 (владелец): подсказка «Собирай слова снизу…» убрана —
          действие очевидно из самого экрана. Пустая зона ОСТАЁТСЯ (высота
          зарезервирована), иначе первое слово сдвинуло бы банк вверх. */}
      <View style={[
        styles.assembled,
        correct === true && styles.assembledCorrect,
        correct === false && styles.assembledWrong,
      ]}>
        {collected.map((word, slotIndex) => (
          <Animated.View key={`collected:${usedPositions[slotIndex]}`} entering={reduceMotion ? undefined : FadeInDown.duration(140)}>
            <V2Chip
              onPress={() => returnWord(slotIndex)}
              disabled={disabled || revealed}
              accessibilityLabel={`Убрать слово ${word}`}
              verdict={correct === true ? 'ok' : correct === false ? 'bad' : 'idle'}
            >
              <TournamentTwoLineText style={[
                styles.assembledChipText,
                correct === true && styles.assembledChipTextCorrect,
                correct === false && styles.assembledChipTextWrong,
              ]}>{word}</TournamentTwoLineText>
            </V2Chip>
          </Animated.View>
        ))}
      </View>

      {/* Банк слов вразнобой */}
      <View style={styles.bank}>
        {wordBank.map((word, position) => {
          const used = usedSet.has(position);
          return (
            <Animated.View key={position} entering={reduceMotion ? undefined : FadeInDown.duration(140)}>
              {used ? <V2ChipGhost label={word} /> : (
                <V2Chip
                  onPress={() => takeWord(position)}
                  disabled={disabled || revealed}
                  accessibilityLabel={`Слово ${word}`}
                >
                  <TournamentTwoLineText style={styles.bankChipText}>{word}</TournamentTwoLineText>
                </V2Chip>
              )}
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.submitSlot}>
        {isComplete ? (
          <V2Cta
            onPress={submit}
            disabled={disabled || revealed}
          >
            Готово
          </V2Cta>
        ) : null}
      </View>
    </View>
  );
});

const makeStyles = (P: TournamentPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  // зачем 2026-07-27 (владелец: «почему всё так высоко задрано вверх, а внизу
  // куча пустого пространства»): flexGrow отдаёт содержимому всю высоту, а
  // зона вопроса забирает свободное место и центрирует фразу. На маленьком
  // экране всё так же скроллится, на большом — не липнет к шапке.
  content: { paddingHorizontal: 16, gap: 14, flexGrow: 1 },
  /** Вопрос занимает свободную высоту между шапкой и вариантами. */
  questionZone: { flex: 1, justifyContent: 'center', minHeight: 132 },
  // Phrase building and the six-pair board already carry substantial vertical
  // geometry. Let their question card size to content so the interaction stays
  // visually connected to its prompt instead of being pushed down by flex.
  questionZoneCompact: { flex: 0, minHeight: 0 },
  /** Полоса управления у нижнего края. Разделяем тоном, без обводки. */
  bottomBar: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: P.bg },

  introRoot: { alignItems: 'center', justifyContent: 'center' },
  introRound: { fontSize: 44, fontWeight: '900', color: P.text, letterSpacing: -1 },
  introMode: { ...type.section, color: P.accent, marginTop: 10 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  forfeitButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    justifyContent: 'center',
    backgroundColor: P.dangerSoft,
  },
  forfeitButtonText: { color: P.danger, fontSize: 13, fontWeight: '900' },
  progressLabel: { fontSize: 15, fontWeight: '800', color: P.text },
  progressLabelDim: { color: P.muted, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 34 },
  statsSpacer: { flex: 1 },
  modePill: {
    maxWidth: '56%',
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: P.accentSoft,
  },
  modePillText: {
    color: P.accent,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  questionCard: { minHeight: 128, justifyContent: 'center' },
  // Подпись к блоку задания: живёт НАД карточкой, поэтому нужен свой отступ
  // снизу и лёгкий отступ слева, чтобы она не липла к кромке карточки.
  questionPrompt: { ...type.body, color: P.muted, marginBottom: 10, marginLeft: 4 },
  // marginTop убран вместе с выносом подписи наверх: внутри карточки фраза
  // теперь единственный элемент и центрируется сама.
  questionPhrase: { fontSize: 28, fontWeight: '900', color: P.text, letterSpacing: -0.6 },

  options: { gap: 10 },
  matchBoard: { gap: 12 },
  strictMatchBoard: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  strictMatchColumn: { flex: 1, gap: 10 },
  // Fixed slot height is intentional: a matched pair fades to an invisible
  // placeholder, so the two-column board never jumps upward.
  matchSlot: { minHeight: 54 },
  strictMatchCard: {
    flex: 1,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: radius.sm,
    backgroundColor: P.card,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    overflow: 'hidden',
  },
  strictMatchCardPicked: {
    backgroundColor: P.accentSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  strictMatchCardWrong: { backgroundColor: P.dangerSoft, shadowColor: P.danger },
  strictMatchCardCorrect: { backgroundColor: P.accent, shadowColor: P.accent },
  strictMatchText: { color: P.text, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  strictMatchTextSelected: { color: P.text, backgroundColor: 'transparent' },
  strictMatchTextWrong: { color: P.danger },
  strictMatchTextCorrect: { color: P.accentText },
  matchRow: { gap: 8 },
  matchPrompt: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: P.card,
  },
  matchPromptText: { fontSize: 17, fontWeight: '900', color: P.text },
  matchOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  matchOption: { flexGrow: 1, flexBasis: '44%', minHeight: 42 },
  option: {
    minHeight: 62,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 14,
    overflow: 'hidden',
  },
  optionInnerLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  optionLetter: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: P.elev2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterCorrect: { backgroundColor: P.accent },
  optionLetterWrong: { backgroundColor: P.dangerSoft },
  optionLetterText: { fontSize: 15, fontWeight: '900', color: P.muted },
  optionLetterTextCorrect: { color: P.accentText },
  optionText: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '700', color: P.text },
  optionTextCorrect: { color: P.accentText },
  optionTextWrong: { color: P.danger },
  optionMark: { fontSize: 20, color: P.accent, fontWeight: '900' },

  // The slot is always reserved, so the server result never moves answers.
  choiceFeedback: { minHeight: 84, justifyContent: 'center' },
  choiceFeedbackCard: {
    minHeight: 72,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  choiceFeedbackCorrect: { backgroundColor: P.accent },
  choiceFeedbackWrong: { backgroundColor: P.dangerSoft },
  choiceFeedbackMark: { width: 28, fontSize: 24, lineHeight: 28, fontWeight: '900', textAlign: 'center' },
  choiceFeedbackText: { flex: 1, fontSize: 20, lineHeight: 25, fontWeight: '900' },

  // Высота под фидбек зарезервирована заранее — иначе список вариантов
  // дёргался бы вверх при каждом ответе.
  feedbackTitle: { fontSize: 20, fontWeight: '900' },
  feedbackSub: { ...type.body, color: P.muted, marginTop: 6 },
  feedbackExplanation: { gap: 3, marginTop: 8 },
  feedbackExplanationText: { color: P.text, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  feedbackExplanationExample: { color: P.muted, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },

  scoreLine: {
    textAlign: 'center',
    ...type.body,
    color: P.ghost,
    fontVariant: ['tabular-nums'],
  },

  // ── Сборка фразы из слов (translate) ──────────────────────────────────────
  assembled: {
    minHeight: 72,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: P.card,
    overflow: 'hidden',
  },
  assembledCorrect: { backgroundColor: P.accentSoft },
  assembledWrong: { backgroundColor: P.dangerSoft },
  assembledChip: {
    backgroundColor: P.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assembledChipText: { fontSize: 16, fontWeight: '800', color: P.accent },
  assembledChipTextCorrect: { color: P.accentText },
  assembledChipTextWrong: { color: P.danger },

  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
    justifyContent: 'center',
  },
  bankChip: {
    backgroundColor: P.card,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bankChipUsed: { opacity: 0.25 },
  bankChipText: { fontSize: 16, fontWeight: '700', color: P.text },
  bankChipTextUsed: { color: P.ghost },

  submitSlot: { minHeight: 58, marginTop: 16, justifyContent: 'center' },
  submitButton: {
    backgroundColor: P.accent,
    borderRadius: radius.md,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { fontSize: 17, fontWeight: '900', color: P.accentText },
  forfeitTitle: { color: P.text, fontSize: 21, fontWeight: '900' },
  forfeitText: { color: P.text, fontSize: 15, lineHeight: 21, marginTop: 10 },
  forfeitWarning: { color: P.danger, fontSize: 15, fontWeight: '900', marginTop: 8 },
  forfeitError: { color: P.danger, fontSize: 13, fontWeight: '700', marginTop: 10 },
  forfeitActions: { gap: 10, marginTop: 18 },
});
