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
import { useTimerTickCue } from '../hooks/use-timer-tick-cue';
import { fk } from './feedback/feedback_kit';

/**
 * зачем 2026-08-04 (владелец: «звуки в турнире работают рандомно и через
 * раз»): общий на всё приложение лимит арбитра — 2 звука/сек, рассчитан на
 * редкие события одиночного урока. В турнире тап по паре, вердикт ответа и
 * тик таймера легко случаются в одну секунду — часть звуков молча гасла.
 * Свой scope с приподнятым лимитом только для турнирного экрана: остальные
 * экраны (диагностика, экзамен, флеш-арена) продолжают жить с исходной
 * защитой от спама.
 */
const TOURNAMENT_SOUND_SCOPE = 'tournament-round';
const TOURNAMENT_SOUND_RATE_LIMIT = { maxStarts: 5, windowMs: 1000 };
const TOURNAMENT_SOUND_OPTIONS = {
  scope: TOURNAMENT_SOUND_SCOPE,
  rateLimit: TOURNAMENT_SOUND_RATE_LIMIT,
} as const;
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
import { TournamentBackdrop } from '../components/tournament/TournamentBackdrop';
import { TournamentRoundIntro } from '../components/tournament/TournamentRoundIntro';
import {
      canRetryTournamentTaskAnswer, forfeitTournament, getOrCreateTournamentTaskIdempotencyKey,
      isTournamentAnswerSelectionWindowOpen,
  isRetryableTournamentTaskAnswerError, isTableState,
      resolveTournamentRoomIdParam, resolveTournamentScheduledTaskIndex,
      resolveTournamentExitStatus,
      resolveTournamentVisibleTaskIndex,
      runTournamentMutationWithRetry,
  shouldShowTournamentLocalIntro,
  submitSpeedMatchAttempt, submitTaskAnswer, tournamentNow, tournamentSecondsUntil,
  useTournamentReactions, useTournamentRoom,
  type PublicTask, type RoomTaskTiming } from './tournament_client';
import { useLocalSearchParams } from 'expo-router';
import { getStableId, peekStableId } from './stable_id';
import { answerFingerprint } from './tournament_answer_fingerprint';
import { actionToastTri, emitAppEvent } from './events';
import { closeTournamentFlow } from './tournament_navigation';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';

// зачем 2026-07-27 (владелец: «4 вопроса в раунде»): здесь лежала третья
// версия одного и того же числа — сервер собирал 6 заданий, а клиент считал 5.
// Значение используется только как запасное, пока задания не пришли; реальное
// число берётся из questions.length, но расходиться они больше не должны.
const QUESTIONS_PER_ROUND = 4;
const SPEED_MATCH_PAIRS = 6;
// зачем 2026-08-01 (аудит турнира): режим называется «Пары на скорость», но
// сам себя тормозил — после каждого ответа поле было заблокировано
// pendingTuple на 400 мс (160+240) при верной паре и на 300 мс при неверной.
// На шести парах это до 2.4 секунды, отнятых у режима, который весь про темп.
// Длительность самой анимации сохранена настолько, чтобы попадание читалось,
// но окно блокировки ввода сжато почти вдвое.
const MATCH_SELECT_MS = 110;
const MATCH_CORRECT_POP_MS = 120;
const MATCH_CORRECT_FADE_MS = 150;
/**
 * Прозрачность УЖЕ СОБРАННОЙ пары (владелец 2026-08-03: «должны просто стать
 * неактивные», а не исчезать). Не ноль: карточка обязана остаться видимой на
 * своём месте, иначе поле дёргается, а запоздавшее подтверждение сервера
 * выглядит как «слово вернулось».
 */
const MATCH_SOLVED_OPACITY = 0.28;
const MATCH_WRONG_TONE_MS = 200;
const LETTERS = ['A', 'B', 'C', 'D'] as const;
const OWNER_APPROVED_TOURNAMENT_MODES = new Set([
  'guess_phrase',
  'fill_gap',
  'find_oddity',
  'translate_build',
  'speed_match',
]);
const CHOICE_MODES = new Set(['guess_phrase', 'fill_gap', 'find_oddity']);
/** Человеческие названия режимов — локализованы под текущий язык интерфейса. */
function modeLabelsFor(lang: Lang): Record<string, string> {
  return {
    guess_phrase: triLang(lang, { ru: 'Живая ситуация', uk: 'Жива ситуація', es: 'Situación real', 'pt-BR': 'Situação real', vi: 'Tình huống thực tế', id: 'Situasi nyata', tr: 'Gerçek durum', pl: 'Prawdziwa sytuacja' }),
    fill_gap: triLang(lang, { ru: 'Пропущенное слово', uk: 'Пропущене слово', es: 'Palabra faltante', 'pt-BR': 'Palavra faltante', vi: 'Từ còn thiếu', id: 'Kata yang hilang', tr: 'Eksik kelime', pl: 'Brakujące słowo' }),
    find_oddity: triLang(lang, { ru: 'Так не говорят', uk: 'Так не кажуть', es: 'Así no se dice', 'pt-BR': 'Não se diz assim', vi: 'Không nói như vậy', id: 'Tidak diucapkan seperti itu', tr: 'Böyle söylenmez', pl: 'Tak się nie mówi' }),
    translate_build: triLang(lang, { ru: 'Собери фразу', uk: 'Збери фразу', es: 'Arma la frase', 'pt-BR': 'Monte a frase', vi: 'Ghép câu', id: 'Susun frasa', tr: 'Cümleyi oluştur', pl: 'Ułóż zdanie' }),
    speed_match: triLang(lang, { ru: 'Пары на скорость', uk: 'Пари на швидкість', es: 'Parejas contrarreloj', 'pt-BR': 'Pares contra o tempo', vi: 'Ghép cặp tốc độ', id: 'Pasangan kecepatan', tr: 'Hız çiftleri', pl: 'Pary na czas' }),
  };
}

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
  answerFingerprints?: string[];
  /**
   * Сложность задания 1..3 — множитель награды.
   *
   * зачем 2026-08-03: звёзды больше не зависят от места в гонке, поэтому их
   * можно посчитать локально в момент тапа и показать без ожидания сети.
   * Формула обязана совпадать с серверной (tournamentStarsForDifficulty).
   */
  difficulty?: number;
};

/** Клиентская копия серверной шкалы: 3⭐ за сложность 1, 4⭐ за 2, 5⭐ за 3. */
function starsForDifficulty(difficulty: number | undefined): number {
  const level = Math.min(3, Math.max(1, Math.trunc(Number(difficulty ?? 1)) || 1));
  return 3 + (level - 1);
}

function localAnswerVerdict(
  roomId: string | null,
  task: Question,
  answer: unknown,
  itemIndex = task.itemIndex,
): boolean | null {
  const expected = task.answerFingerprints?.[itemIndex];
  if (!roomId || typeof expected !== 'string') return null;
  return answerFingerprint(roomId, task.taskId, answer) === expected;
}

/**
 * Публичное задание сервера → один или несколько вопросов экрана.
 *
 * зачем: publicPayload не раскрывает сырой ключ ответа, но содержит room-scoped
 * отпечатки для мгновенной локальной окраски. Сетевой ответ не блокирует UI;
 * очки и награды по-прежнему подтверждает сервер.
 *
 * Исторические режимы могут оставаться в старых документах для аудита, но
 * активный игровой экран их не интерпретирует и не показывает.
 */
function taskToQuestions(task: PublicTask, lang: Lang): Question[] {
  const payload = task.payload ?? {};
  if (!OWNER_APPROVED_TOURNAMENT_MODES.has(task.mode)) return [];
  if (task.kind === 'choice' && CHOICE_MODES.has(task.mode)) {
    const options = Array.isArray(payload.options) ? (payload.options as string[]) : [];
    const phrase = String(payload.phrase ?? '');
    if (!phrase || options.length < 2) return [];
    return [{
      taskId: task.taskId, mode: task.mode, kind: 'choice', prompt: triLang(lang, { ru: 'Что это значит?', uk: 'Що це означає?', es: '¿Qué significa esto?', 'pt-BR': 'O que isso significa?', vi: 'Điều này có nghĩa là gì?', id: 'Apa artinya ini?', tr: 'Bu ne anlama geliyor?', pl: 'Co to znaczy?' }), phrase, options,
      wordBank: [], requiredTokenCount: 0, itemIndex: 0, itemCount: 1,
      answerFingerprints: task.answerFingerprints,
      difficulty: task.difficulty,
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
      prompt: typeof payload.prompt === 'string' && payload.prompt
        ? payload.prompt
        : triLang(lang, { ru: 'Соедини пары', uk: 'З’єднай пари', es: 'Empareja', 'pt-BR': 'Combine os pares', vi: 'Ghép cặp', id: 'Cocokkan pasangan', tr: 'Çiftleri eşleştir', pl: 'Połącz pary' }),
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
      answerFingerprints: task.answerFingerprints,
      difficulty: task.difficulty,
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
      taskId: task.taskId, mode: task.mode, kind: 'translate', prompt: triLang(lang, { ru: 'Собери фразу', uk: 'Збери фразу', es: 'Arma la frase', 'pt-BR': 'Monte a frase', vi: 'Ghép câu', id: 'Susun frasa', tr: 'Cümleyi oluştur', pl: 'Ułóż zdanie' }), phrase,
      options: [], wordBank, requiredTokenCount, itemIndex: 0, itemCount: 1,
      answerFingerprints: task.answerFingerprints,
      difficulty: task.difficulty,
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

/** Optimistic paint is immediate; only the authoritative transport waits. */
const waitForTournamentAnswerWindow = async (
  timing: RoomTaskTiming | null,
): Promise<void> => {
  if (!timing) return;
  const opensAtMs = timing.readingEndsAtMs ?? timing.startsAtMs;
  const waitMs = Math.max(0, opensAtMs - tournamentNow());
  if (waitMs === 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
};

export default function TournamentRoundScreen() {
  const { lang } = useLang();
  const MODE_LABELS = useMemo(() => modeLabelsFor(lang), [lang]);
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string | string[] }>();
  const roomId = resolveTournamentRoomIdParam(params.roomId);
  const runtimeActive = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  const { playTimerTick, playTimerExpired } = useTimerTickCue({
    scope: TOURNAMENT_SOUND_SCOPE,
    rateLimit: TOURNAMENT_SOUND_RATE_LIMIT,
    // зачем 2026-08-04 (владелец: «звуки в турнире работают рандомно и через
    // раз», после поднятия rateLimit): тик — самый низкоприоритетный звук
    // экрана (62 против 68-70 у вердиктов), поэтому именно он чаще всего
    // молча проигрывает конкуренцию за единственный активный слот. Один
    // отложенный шанс сразу после освобождения слота вместо тишины.
    queueIfBusy: true,
  });

  const { room, status, freshSnapshot, secondsLeft: stateSecondsLeft, retry } = useTournamentRoom(roomId, runtimeActive);
  const { incoming: incomingReactions, consume: consumeReaction } = useTournamentReactions(roomId, runtimeActive);

  const [navigation, setNavigation] = useState<{ roundKey: string; index: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [picked, setPicked] = useState<number | null>(null);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const [feedbackZeroScoreReason, setFeedbackZeroScoreReason] = useState<null | 'incorrect_answer' | 'speed_match_penalty'>(null);
  const [feedbackExplanation, setFeedbackExplanation] = useState<{ ruleNote: string; example: string } | null>(null);
  const [feedbackCorrectIndex, setFeedbackCorrectIndex] = useState<number | null>(null);
  const [forfeitConfirmVisible, setForfeitConfirmVisible] = useState(false);
  const forfeitingRef = useRef(false);
  // Базовый счёт и серия приходят из серверного snapshot. Для speed_match
  // подписанные отпечатки позволяют сразу показать +1/-1; pendingStars держит
  // этот прогноз до подтверждения сервера и откатывает его при сетевой ошибке.
  const [myId, setMyId] = useState<string | null>(() => peekStableId());
  const [matchStatus, setMatchStatus] = useState<Record<number, MatchStatus>>({});
  const [confirmedMatchPairs, setConfirmedMatchPairs] = useState<ReadonlySet<number>>(() => new Set());
  const pendingMatchPairsRef = useRef(new Set<string>());
  const activeMatchSelectionsRef = useRef(new Map<number, number>());
  // зачем 2026-08-03: таймаут-эффекту нужно отправить собранные пары, но
  // finishMatchEarly зависит от matchStatus, который меняется на КАЖДОЙ паре.
  // Прямая зависимость пересоздавала бы таймаут-эффект по ходу сборки поля —
  // ровно тот класс нестабильности, из-за которого баг и жил. Ref даёт эффекту
  // всегда свежую функцию, не входя в его список зависимостей.
  const finishMatchEarlyRef = useRef<(() => void) | null>(null);
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
  const serverStars = Math.max(0, Math.trunc(Number(authoritativePlayer?.score ?? 0)));
  /**
   * Счётчик звёзд растёт в момент тапа, а не по приходу снапшота.
   *
   * зачем 2026-08-03 (владелец: «анимация начисления звёзд должна быть
   * мгновенной сразу»): счётчик читал только серверный score, поэтому пилюля
   * в шапке дёргалась через сотни миллисекунд после ответа. Держим локальную
   * надбавку за задания, которые сервер ещё не подтвердил, и гасим её ровно
   * тогда, когда снапшот эти звёзды уже учёл.
   *
   * Гонка: снапшот приходит асинхронно и может относиться к состоянию ДО
   * нашего ответа. Поэтому надбавка снимается не по времени, а по факту —
   * когда score вырос минимум на неё (см. эффект ниже).
   */
  /**
   * зачем 2026-08-03 (владелец: «счёт изменяется только 1 раз в первом задании
   * каждого раунда и счёт не отображает актуальное состояние»): здесь лежала
   * ОДНА надбавка {baseline, amount}. На втором задании раунда setPendingStars
   * ПЕРЕЗАПИСЫВАЛ её новым baseline, снятым уже после первого ответа, — прирост
   * за первое задание при этом терялся, если сервер ещё не успел его учесть.
   * Внешне это и выглядело как «счётчик дёрнулся один раз и замер».
   *
   * Теперь копим СУММУ неподтверждённых звёзд от одной опорной точки. Опора —
   * серверный счёт на момент ПЕРВОГО неподтверждённого ответа; сколько бы
   * заданий игрок ни решил подряд, каждое добавляет свои звёзды к сумме.
   */
  const [pendingStars, setPendingStars] = useState<{ baseline: number; amount: number } | null>(null);
  // Показываем максимум из «сервер» и «опора + локальный прирост»: поздний
  // снапшот с бо́льшим счётом никогда не откатывает цифру назад, а локальный
  // прогноз никогда не занижает подтверждённое сервером значение.
  const stars = pendingStars
    ? pendingStars.amount >= 0
      ? Math.max(serverStars, pendingStars.baseline + pendingStars.amount)
      : Math.min(serverStars, Math.max(0, pendingStars.baseline + pendingStars.amount))
    : serverStars;

  useEffect(() => {
    if (!pendingStars) return;
    // Сервер догнал (или перегнал) локальный прогноз — надбавка больше не нужна.
    const target = Math.max(0, pendingStars.baseline + pendingStars.amount);
    if ((pendingStars.amount > 0 && serverStars >= target)
      || (pendingStars.amount < 0 && serverStars <= target)
      || pendingStars.amount === 0) setPendingStars(null);
  }, [pendingStars, serverStars]);

  /** Накопить локальные звёзды поверх уже ожидающих, не теряя предыдущие. */
  const addPendingStars = useCallback((amount: number) => {
    if (amount === 0) return;
    setPendingStars((current) => {
      const next = current
        ? { baseline: current.baseline, amount: current.amount + amount }
        : { baseline: serverStars, amount };
      return next.amount === 0 ? null : next;
    });
  }, [serverStars]);

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
    return tasks.flatMap((task) => taskToQuestions(task, lang));
  }, [activeRound?.tasks, lang]);

  const total = questions.length || QUESTIONS_PER_ROUND;
  const scheduleNowMs = tournamentNow();
  // зачем 2026-08-02: здесь считались elapsedTaskIds и allQuestionsResolved —
  // единственным их потребителем была кнопка «Готово», которую владелец
  // попросил убрать. Вместе с ней ушёл и расчёт: он строил Set через
  // filter+map и пересчитывался по секундной сетке, то есть каждую секунду
  // работы раунда — теперь эта работа не делается вовсе.
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
    // зачем 2026-08-02: раньше очищался только resolvedTaskIds, а карты
    // отправленных ответов и ключей идемпотентности жили весь экран. Они
    // ключуются по taskId, но ключ идемпотентности считается ещё и от roundNo —
    // на новом раунде старая запись становится мусором, который уже нельзя
    // переиспользовать. Чистим весь набор разом, чтобы данные прошлого раунда
    // не могли повлиять на текущий.
    taskAnswersRef.current.clear();
    taskIdempotencyKeysRef.current.clear();
    pendingTaskSubmissionsRef.current.clear();
  }, [roundKey]);
  const scheduledIndex = resolveTournamentScheduledTaskIndex(activeRound?.taskSchedule, scheduleNowMs);
  const index = resolveTournamentVisibleTaskIndex(
    activeRound?.taskSchedule,
    scheduleNowMs,
    navigation?.roundKey === roundKey ? navigation.index : undefined,
  );
  const question = questions[index] ?? null;
  const questionKey = question ? `${question.taskId}:${question.itemIndex}` : null;
  // зачем 2026-08-02 (владелец: «внизу есть всегда недоступная кнопка „Готово“,
  // она никогда не нажимается, потому что при нажатии на вариант ответа он
  // сразу засчитывается»): кнопка убрана целиком — ни в одном режиме она не
  // нужна, и в каждом висела серой.
  //
  // Почему нажать её было нельзя: disabled требовал allQuestionsResolved, то
  // есть решённого ВСЕГО раунда. Но каждое задание закрывается само:
  //   • choice — тапом по варианту;
  //   • translate — своей кнопкой подтверждения внутри WordBank;
  //   • speed_match — автоматически, как только сходится последняя пара
  //     (см. эффект по matchComplete ниже).
  // К моменту, когда условие выполнялось, раунд уже был закончен и экран уходил
  // на таблицу по серверной границе — нажать физически не успеть.
  //
  // Ранний финиш при этом не потерян: сервер считает бонус скорости от времени
  // ПРИХОДА каждого ответа, а ответы уходят сразу по мере решения заданий.
  const showRoundFinish = false;
  const questionTiming = useMemo(() => {
    if (!question) return null;
    return activeRound?.taskSchedule?.find((timing) => (
      timing.taskId === question.taskId && timing.taskIndex === index
    )) ?? activeRound?.taskSchedule?.find((timing) => timing.taskId === question.taskId) ?? null;
  }, [activeRound?.taskSchedule, index, question]);
  const nextQuestionTiming = useMemo(() => (
    activeRound?.taskSchedule?.find((timing) => timing.taskIndex === index + 1) ?? null
  ), [activeRound?.taskSchedule, index]);
  const answerWindowDurationMs = questionTiming
    ? Math.max(1,
      (questionTiming.answerDeadlineAtMs ?? questionTiming.deadlineAtMs)
      - (questionTiming.readingEndsAtMs ?? questionTiming.startsAtMs))
    : 0;
  const answerWindowSeconds = answerWindowDurationMs > 0
    ? Math.max(1, Math.ceil(answerWindowDurationMs / 1000))
    : questionTiming?.durationMs
      ? Math.max(1, Math.ceil(questionTiming.durationMs / 1000))
      : Math.max(1, stateSecondsLeft);
  // зачем 2026-08-02 (владелец: «турнир, первый вопрос ответил, дальше кнопки
  // не реагируют вообще»): фаза 'reading' была ИСКЛЮЧЕНА из таймера, поэтому на
  // ней экран не перерисовывался. А answerSelectionActive вычисляется в теле
  // рендера через tournamentNow() — без ре-рендера оно застревало в значении
  // «окно ещё закрыто», снятом в момент входа в reading, и варианты оставались
  // мёртвыми даже после того, как серверное окно фактически открылось.
  // Единственным, кто будил экран, был снапшот комнаты — то есть кнопки
  // «оживали» случайно и не всегда.
  const taskTimerActive = phase === 'reading' || phase === 'question' || phase === 'feedback';
  const displayedSecondsLeft = secondsLeft ?? deriveDisplayedSecondsLeft(
    phase,
    questionTiming,
    answerWindowSeconds,
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
  const answerSelectionActive = (phase === 'reading' || phase === 'question')
    && isTournamentAnswerSelectionWindowOpen(questionTiming, tournamentNow());

  /**
   * Экран обязан следовать серверному расписанию сам.
   *
   * зачем 2026-08-02 (владелец: «не нажимается ни один вариант», проверено на
   * живой комнате): видимый index и answerSelectionActive считаются В ТЕЛЕ
   * РЕНДЕРА от tournamentNow(). Значит «сервер перешёл к следующему заданию»
   * замечается только на перерисовке. Единственным источником перерисовок был
   * секундный таймер, который пишет secondsLeft — но когда он доходит до 0,
   * значение перестаёт МЕНЯТЬСЯ, React не рендерит, и экран замирает.
   *
   * Факт из прода: сервер уже на задании #2 (окно открыто), а экран показывал
   * «Вопрос 1 из 4» с таймером 0 — все варианты мертвы, потому что окно
   * первого задания давно закрылось.
   *
   * Здесь держим отдельный тик, привязанный к границам расписания: он не
   * рисует цифры, а просто будит рендер, когда наступает следующее окно.
   * Дешевле, чем таймер раз в секунду: просыпаемся ровно на переходах.
   */
  const [scheduleTick, setScheduleTick] = useState(0);
  useEffect(() => {
    if (!runtimeActive || !activeRound?.taskSchedule?.length) return;
    const nowMs = tournamentNow();
    // Ближайшая будущая граница: старт или конец приёма ответа любого задания.
    const boundaries = activeRound.taskSchedule
      .flatMap((timing) => [
        timing.startsAtMs,
        timing.answerDeadlineAtMs ?? timing.deadlineAtMs,
        timing.deadlineAtMs,
      ])
      .filter((atMs) => atMs > nowMs)
      .sort((left, right) => left - right);
    if (boundaries.length === 0) return;
    // +60 мс, чтобы проснуться ГАРАНТИРОВАННО после границы, а не ровно на ней.
    const delayMs = Math.max(16, boundaries[0] - nowMs + 60);
    const id = setTimeout(() => setScheduleTick((value) => value + 1), delayMs);
    return () => clearTimeout(id);
  }, [activeRound?.taskSchedule, runtimeActive, scheduleTick, phase]);
  /**
   * зачем 2026-08-02 (владелец: «пропал отсчёт 3 2 1 (обязательный)»):
   * условие сверялось с ПЕРВЫМ заданием раунда через questionTiming. Но у
   * интро всего 3 секунды: сервер ставит state='round1' и
   * introEndsAtMs = now + 3с одновременно, а расписание заданий строится ровно
   * от introEndsAtMs. Пока лобби получало снапшот, роутер монтировал экран
   * раунда и приходил первый рендер — эти секунды успевали истечь, и отсчёт
   * не показывался вовсе.
   *
   * Сверяемся напрямую с границей интро самой комнаты (room.introEndsAtMs).
   * Она не зависит от того, какое задание сейчас видимое, поэтому отсчёт
   * показывается всегда, когда сервер его действительно отвёл.
   */
  const roundIntroEndsAtMs = room?.introEndsAtMs
    ?? activeRound?.taskSchedule?.[0]?.introEndsAtMs
    ?? null;
  const showLocalIntro = roundIntroEndsAtMs !== null
    ? tournamentNow() < roundIntroEndsAtMs
    : shouldShowTournamentLocalIntro(questionTiming, tournamentNow(), room?.introEndsAtMs);

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
    // зачем 2026-08-02 (владелец: «ответил на первый, второй ответить
    // невозможно»): здесь стоял questionTiming — тайминг ТЕКУЩЕГО видимого
    // задания. Но индекс в той же строке переводится на scheduledIndex, то
    // есть на задание СЕРВЕРА. Фаза считалась от старого задания, а показывался
    // новый: экран стартовал рассинхронизированным, и если окно предыдущего
    // задания уже закрылось — фаза выходила 'feedback', в которой ввод
    // заблокирован. Берём тайминг того задания, которое реально показываем.
    const scheduledTiming = activeRound?.taskSchedule?.find(
      (timing) => timing.taskIndex === scheduledIndex,
    ) ?? questionTiming;
    setNavigation({ roundKey, index: scheduledIndex });
    setPhase(derivePhaseFromTiming(scheduledTiming, tournamentNow()));
  }, [activeRound?.taskSchedule, questionTiming, roundKey, scheduledIndex]);

  useEffect(() => {
    if (phase === 'intro' && !showLocalIntro) startQuestions();
  }, [phase, showLocalIntro, startQuestions]);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setPicked(null);
    setFeedbackCorrect(null);
    setFeedbackZeroScoreReason(null);
    setFeedbackExplanation(null);
    setFeedbackCorrectIndex(null);
    setMatchStatus({});
    setConfirmedMatchPairs(new Set());
    pendingMatchPairsRef.current.clear();
    activeMatchSelectionsRef.current.clear();
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
        ? answerWindowSeconds
        : tournamentSecondsUntil(questionTiming.answerDeadlineAtMs ?? questionTiming.deadlineAtMs, serverNowMs);
      setSecondsLeft(Math.min(answerWindowSeconds, remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [answerWindowSeconds, questionTiming, runtimeActive, stateSecondsLeft, taskTimerActive]);

  /**
   * Выравнивание фазы по серверу — страховка от «мёртвого» экрана.
   *
   * зачем 2026-08-02 (владелец: «не нажимается ни один вариант»): фазу двигали
   * только локальные таймеры (goNext по границе фидбэка, переход reading →
   * question). Любой их сбой — пропущенный таймер при уходе в фон, поздний
   * снапшот, гонка при смене задания — оставлял экран в 'feedback' навсегда,
   * а в этой фазе ввод заблокирован. Игрок видел живой вопрос с мёртвыми
   * кнопками.
   *
   * Здесь сверяемся с абсолютным расписанием: если сервер уже открыл окно
   * ответа текущего задания, а мы всё ещё показываем фидбэк по нему — молча
   * возвращаем игрока в игру. Это не дублирует goNext (тот двигает НОМЕР
   * задания), а только чинит рассинхрон фазы.
   */
  useEffect(() => {
    if (!runtimeActive || phase !== 'feedback' || !questionTiming) return;
    // Ответ по этому заданию уже принят — фидбэк показан по делу, не трогаем.
    if (resolvedTaskIds.has(questionTiming.taskId)) return;
    const nowMs = tournamentNow();
    const answerEndsAtMs = questionTiming.answerDeadlineAtMs ?? questionTiming.deadlineAtMs;
    if (nowMs >= questionTiming.startsAtMs && nowMs < answerEndsAtMs) {
      setPhase('question');
    }
  }, [phase, questionTiming, resolvedTaskIds, runtimeActive, scheduleTick]);

  const goNext = useCallback(() => {
    if (forfeitingRef.current) return;
    // A previous request may resolve after the absolute feedback boundary.
    // Invalidate it before showing another task so it cannot repaint new UI.
    activeTaskSubmissionRef.current = null;
    activeQuestionKeyRef.current = null;
    if (index + 1 >= total) {
      router.replace(roomId ? { pathname: '/tournament_table', params: { roomId, completedRound: String(roundNo) } } : '/tournament_table');
      return;
    }
    // зачем 2026-08-02 (владелец: «первое задание каждого раунда я могу
    // выбрать, все остальные блокируются»): goNext вызывается ИЗ ТАЙМЕРА
    // (scheduleFeedbackAdvance), поэтому его замыкание держит index на момент
    // постановки таймера. Считать index + 1 от замкнутого значения нельзя:
    // после первого ответа экран прибивал navigation на первое задание, а
    // видимый index = max(серверный, navigation.index) уже не мог вырасти —
    // раунд залипал на вопросе 1 навсегда. Сдвигаем от АКТУАЛЬНОГО значения.
    setNavigation((current) => {
      const base = current?.roundKey === roundKey ? current.index : index;
      return { roundKey, index: base + 1 };
    });
    // зачем 2026-08-02 (КОРЕНЬ «отвечаю только на первый вопрос, остальные
    // заблокированы»): secondsLeft здесь НЕ сбрасывался. К концу предыдущего
    // задания таймер честно дотикивал до 0 — и это значение ПЕРЕЖИВАЛО переход
    // на следующий вопрос. Первый же рендер нового вопроса имел
    // phase='question' + secondsLeft=0 (от старого!) + question=новый — ровно
    // условие таймаут-эффекта «время вышло». Тот срабатывал ДО того, как
    // секундный таймер успевал записать настоящий остаток, мгновенно помечал
    // новый вопрос пропущенным (markTaskResolved) и уводил в 'feedback', где
    // ввод заблокирован. Так умирал каждый вопрос после первого, а прогресс
    // «ехал сам». Первый вопрос раунда жил только потому, что после интро
    // secondsLeft был null, а null !== 0.
    // Сброс обязан быть ИМЕННО ЗДЕСЬ, в одном батче со сменой вопроса:
    // сброс из отдельного эффекта применился бы только к следующему рендеру,
    // а таймаут-эффект текущего прохода всё равно увидел бы старый 0.
    setSecondsLeft(null);
    setPicked(null);
    setFeedbackCorrect(null);
    setMatchStatus({});
    setConfirmedMatchPairs(new Set());
    pendingMatchPairsRef.current.clear();
    activeMatchSelectionsRef.current.clear();
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

  /**
   * Полёт звёзд от карточки ответа к счётчику в шапке.
   *
   * зачем 2026-08-03 (владелец: «анимация начисления звёзд должна быть
   * мгновенной сразу»): flyStar жил в TournamentFx, но в турнирном раунде не
   * вызывался НИ РАЗУ — начисление не было видно вообще, число просто
   * подменялось после ответа сервера. Запускаем полёт в момент тапа: сколько
   * звёзд начислено, столько глифов и летит.
   *
   * measureInWindow асинхронна, но это не задерживает награду: число уже
   * нарисовано состоянием, полёт — только украшение поверх.
   */
  const flyStarsToCounter = useCallback((amount: number) => {
    if (reduceMotion || amount <= 0) return;
    const counter = starCounterRef.current;
    if (!counter || !fxRef.current) return;
    counter.measureInWindow((x, y, width, height) => {
      if (!screenMountedRef.current || !fxRef.current) return;
      const to = { x: x + width / 2, y: y + height / 2 };
      // Старт — из центра экрана, где игрок только что нажал ответ.
      const from = { x: fxSize.width / 2, y: fxSize.height * 0.62 };
      for (let index = 0; index < Math.min(5, amount); index += 1) {
        fxRef.current?.flyStar(from, to, P.gold);
      }
    });
  }, [P.gold, fxSize.height, fxSize.width, reduceMotion]);

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

  const confirmForfeit = useCallback(() => {
    if (!roomId || forfeitingRef.current || !runtimeActive) return;
    forfeitingRef.current = true;
    setForfeitConfirmVisible(false);
    activeTaskSubmissionRef.current = null;
    activeQuestionKeyRef.current = null;
    if (advanceRef.current) {
      clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
    closeTournamentFlow(router);
    void runTournamentMutationWithRetry(() => forfeitTournament(roomId)).catch(async () => {
      const exitPlayerId = myId ?? await getStableId().catch(() => null);
      const exitStatus = await resolveTournamentExitStatus(roomId, exitPlayerId);
      if (exitStatus === 'forfeited' || exitStatus === 'left') return;
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось синхронизировать выход. Проверьте интернет',
        uk: 'Не вдалося синхронізувати вихід. Перевірте інтернет',
        es: 'No se pudo sincronizar la salida. Comprueba Internet',
        'pt-BR': 'Não foi possível sincronizar a saída. Verifique a internet',
        vi: 'Không thể đồng bộ việc rời đi. Kiểm tra kết nối mạng',
        id: 'Gagal menyinkronkan keluar. Periksa internet',
        tr: 'Çıkış senkronize edilemedi. İnterneti kontrol edin',
        pl: 'Nie udało się zsynchronizować wyjścia. Sprawdź internet',
      }));
      // Результат турнира сервер-авторитетный: если подтверждённый выход не
      // записался, возвращаем живой раунд вместо пустого/ложного лобби.
      router.push({ pathname: '/tournament_round', params: { roomId } });
    });
  }, [myId, roomId, router, runtimeActive]);

  const submitCurrentTaskAnswer = useCallback(async (
    task: Question,
    optimisticAnswer: unknown,
    optimisticCorrect: boolean | null = null,
  ) => {
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
    // The tap completes and paints this task locally before any await. Scores,
    // rewards, and standings still come exclusively from the server response.
    markTaskResolved(task.taskId);
    // зачем 2026-08-02: здесь стояло setNavigation({ roundKey, index }) —
    // отправка ответа ПРИБИВАЛА видимый индекс к текущему заданию. Видимый
    // индекс считается как max(серверный, navigation.index), поэтому после
    // первого же ответа он переставал расти вместе с расписанием, и раунд
    // залипал на вопросе 1: варианты второго задания приходили в состоянии
    // «окно закрыто» и не нажимались. Двигать индекс — работа goNext по
    // абсолютной границе фидбэка; отправка ответа его больше не трогает.
    setPhase('feedback');
    setFeedbackCorrect(optimisticCorrect);
    // Награда детерминирована (скорость из формулы убрана), поэтому
    // считаем её локально в момент тапа. зачем 2026-08-08 (владелец: «они должны
    // идти в один счёт»): прирост попадает только в общий счётчик шапки;
    // карточка вердикта не рисует второе `+N звёзд`.
    const optimisticStars = optimisticCorrect === true
      ? starsForDifficulty(task.difficulty)
      : optimisticCorrect === false ? 0 : null;
    if (optimisticStars && optimisticStars > 0) {
      // Счётчик в шапке растёт в этом же кадре; снапшот потом подтвердит.
      //
      // зачем 2026-08-04 (владелец: «то не начисляет вообще звёзды за
      // правильный ответ»): здесь стоял setPendingStars со СВЕЖИМ baseline —
      // ровно тот баг, который комментарий выше описывает как исправленный.
      // На втором задании раунда опора снималась уже после первого ответа, и
      // если сервер его ещё не учёл, прирост за первое задание терялся. Копим
      // сумму через addPendingStars от ОДНОЙ опорной точки.
      addPendingStars(optimisticStars);
      flyStarsToCounter(optimisticStars);
    }
    setFeedbackZeroScoreReason(null);
    setFeedbackExplanation(null);
    setFeedbackCorrectIndex(null);
    // The visual transition belongs to the server-authored absolute boundary,
    // not to network latency from the scoring callable.
    scheduleFeedbackAdvance();
    try {
      await waitForTournamentAnswerWindow(questionTiming);
      if (!screenMountedRef.current || activeTaskSubmissionRef.current !== submissionToken) return;
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
      // Прогноз разошёлся с сервером — корректируем только дельту ЭТОГО
      // ответа. Остальные неподтверждённые ответы продолжают ждать серверный
      // snapshot и не должны исчезнуть из общего счёта.
      const optimisticStarAmount = optimisticStars ?? 0;
      if (optimisticStarAmount !== result.earnedStars) {
        addPendingStars(result.earnedStars - optimisticStarAmount);
      }
      setFeedbackZeroScoreReason(result.zeroScoreReason);
      setFeedbackExplanation(result.explanation);
      setFeedbackCorrectIndex(typeof result.correctIndex === 'number' ? result.correctIndex : null);
      if (result.correct) fk.correct(TOURNAMENT_SOUND_OPTIONS);
      else fk.wrong(TOURNAMENT_SOUND_OPTIONS);
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
  }, [addPendingStars, flyStarsToCounter, index, markTaskResolved, questionTiming, retry, roomId,
    roundKey, roundNo, scheduleFeedbackAdvance]);

  /**
   * зачем 2026-08-02: здесь жили finishEarly и флаг finishing — обработчик
   * кнопки «Готово», которую владелец попросил убрать («она никогда не
   * нажимается»). Вместе с кнопкой удалён и обработчик: держать мёртвый код
   * с состоянием, которое никто не выставляет, — прямой путь к путанице.
   *
   * Уход на таблицу при этом не потерян. Его делают два живых пути:
   *   • goNext — когда закончилось последнее задание раунда;
   *   • эффект по room.state — когда сервер сам перевёл комнату дальше.
   * Ранний финиш тоже цел: сервер считает бонус скорости от времени прихода
   * КАЖДОГО ответа, а они уходят сразу при решении задания.
   */

  const answer = useCallback((optionIndex: number) => {
    if (!answerSelectionActive || !question) return;
    // зачем 2026-08-02 (владелец: «в турнире ни одна кнопка не нажимается», и
    // при этом выбранный ПРАВИЛЬНЫЙ вариант засчитывался как неверный, 0 звёзд):
    // здесь стояла подмена — если в taskAnswersRef уже лежал ответ по этому
    // taskId, брался ОН, а свежий тап игрока молча отбрасывался. Кэш при этом
    // не очищался никогда: ни между заданиями, ни между раундами. В итоге со
    // второго задания экран выглядел «мёртвым» (тап проходил, но уходил чужой
    // индекс), а сервер получал ответ от предыдущего вопроса — отсюда «ноль
    // звёзд» на верном варианте. Один раз «получалось» ровно там, где кэш ещё
    // был пуст.
    //
    // Кэш нужен для ДРУГОГО: submitCurrentTaskAnswer держит в нём уже
    // отправленное тело запроса, чтобы ретрай ушёл с тем же payload под тем же
    // ключом идемпотентности. К выбору игрока он отношения не имеет — тап
    // всегда отправляет именно то, что нажали.
    setPicked(optionIndex);
    const localCorrect = localAnswerVerdict(roomId, question, optionIndex);
    void submitCurrentTaskAnswer(question, { selectedIndex: optionIndex }, localCorrect);
  }, [answerSelectionActive, question, roomId, submitCurrentTaskAnswer]);

  /**
   * Подтверждение сборки фразы (translate) — вызывается, когда игрок собрал
   * фразу целиком (banklWords.length === 0) или нажал «Готово».
   * зачем: в отличие от choice, здесь нет единственного индекса — ответ это
   * ВЕСЬ собранный порядок слов, поэтому answer передаётся отдельно.
   */
  const answerTranslate = useCallback((tokens: string[]) => {
    if (!answerSelectionActive || !question) return;
    const localCorrect = localAnswerVerdict(roomId, question, tokens);
    void submitCurrentTaskAnswer(question, { tokens }, localCorrect);
  }, [answerSelectionActive, question, roomId, submitCurrentTaskAnswer]);

  const answerMatch = useCallback((pairIndex: number, selectedIndex: number): Promise<'correct' | 'wrong' | 'rejected'> => {
    if (!answerSelectionActive || question?.kind !== 'match' || !roomId) return Promise.resolve('rejected');
    const attemptQuestionKey = questionKey;
    if (!attemptQuestionKey) return Promise.resolve('rejected');
    const attemptKey = `${question.taskId}:${pairIndex}:${selectedIndex}`;
    if (matchStatus[pairIndex]?.verdict === 'correct') return Promise.resolve('rejected');
    if (pendingMatchPairsRef.current.has(attemptKey)) return Promise.resolve('rejected');
    pendingMatchPairsRef.current.add(attemptKey);
    activeMatchSelectionsRef.current.set(pairIndex, selectedIndex);
    const localCorrect = localAnswerVerdict(roomId, question, selectedIndex, pairIndex);
    setMatchStatus((current) => {
      if (current[pairIndex]?.verdict !== 'wrong') return current;
      const next = { ...current };
      delete next[pairIndex];
      return next;
    });
    if (localCorrect === null) {
      return (async () => {
        try {
          await waitForTournamentAnswerWindow(questionTiming);
          const result = await submitSpeedMatchAttempt(roomId, roundNo, question.taskId, pairIndex, selectedIndex);
          if (!screenMountedRef.current || activeQuestionKeyRef.current !== attemptQuestionKey
            || activeMatchSelectionsRef.current.get(pairIndex) !== selectedIndex) return 'rejected';
          const isCorrect = result.correct === true;
          setMatchStatus((current) => ({
            ...current,
            [pairIndex]: { verdict: isCorrect ? 'correct' : 'wrong', selectedIndex },
          }));
          if (isCorrect) {
            setConfirmedMatchPairs((current) => new Set(current).add(pairIndex));
            fk.correct(TOURNAMENT_SOUND_OPTIONS);
            // Та же шкала, что и в быстрой ветке: верная пара = +1 звезда.
            // зачем 2026-08-04 (владелец: «развалилось: было 25 звёзд, появилось
            // слева ещё 3, теперь у меня 25 и 3 отдельно»): звезда ЛЕТЕЛА к
            // счётчику, но в сам счётчик не попадала — надбавка копилась только
            // для одиночных заданий, а пары её не трогали. Игрок видел анимацию
            // «+1» и неизменное число рядом, то есть два счёта одновременно.
            addPendingStars(1);
            flyStarsToCounter(1);
          } else {
            if (result.penaltyApplied) addPendingStars(-1);
            fk.wrong(TOURNAMENT_SOUND_OPTIONS);
          }
          return isCorrect ? 'correct' : 'wrong';
        } catch {
          if (!screenMountedRef.current || activeQuestionKeyRef.current !== attemptQuestionKey) return 'rejected';
          return 'rejected';
        } finally {
          pendingMatchPairsRef.current.delete(attemptKey);
        }
      })();
    }

    const localVerdict = localCorrect ? 'correct' : 'wrong';
    const optimisticStarDelta = localCorrect ? 1 : -1;
    setMatchStatus((current) => ({
      ...current,
      [pairIndex]: { verdict: localVerdict, selectedIndex },
    }));
    addPendingStars(optimisticStarDelta);
    if (localCorrect) {
      fk.correct(TOURNAMENT_SOUND_OPTIONS);
      // зачем 2026-08-03 (владелец: «задания типа пары надо считать сколько
      // юзер ответил правильно — 1 правильно, 1 звезда»): счётчик стартовал с 3
      // и УМЕНЬШАЛСЯ за ошибки, то есть показывал штраф, а не заработок. Теперь
      // растёт на каждой верной паре — ровно то число, что начислит сервер.
      // зачем 2026-08-04: см. ветку выше — без этого звезда летела к счётчику,
      // но не прибавлялась к нему, и общий счёт «отставал» от анимации.
      flyStarsToCounter(1);
    } else {
      fk.wrong(TOURNAMENT_SOUND_OPTIONS);
    }

    void waitForTournamentAnswerWindow(questionTiming)
      .then(() => submitSpeedMatchAttempt(roomId, roundNo, question.taskId, pairIndex, selectedIndex))
      .then((result) => {
        if (!screenMountedRef.current || activeQuestionKeyRef.current !== attemptQuestionKey
          || activeMatchSelectionsRef.current.get(pairIndex) !== selectedIndex) return;
        const isCorrect = result.correct === true;
        const authoritativeStarDelta = isCorrect ? 1 : result.penaltyApplied ? -1 : 0;
        addPendingStars(authoritativeStarDelta - optimisticStarDelta);
        setConfirmedMatchPairs((current) => {
          const next = new Set(current);
          if (isCorrect) next.add(pairIndex);
          else next.delete(pairIndex);
          return next;
        });
        // Fingerprints are immediate UX hints, not an authority boundary.
        // Reconcile silently so local haptics and star penalties do not repeat.
        setMatchStatus((current) => ({
          ...current,
          [pairIndex]: { verdict: isCorrect ? 'correct' : 'wrong', selectedIndex },
        }));
      })
      .catch(() => {
        if (!screenMountedRef.current || activeQuestionKeyRef.current !== attemptQuestionKey
          || activeMatchSelectionsRef.current.get(pairIndex) !== selectedIndex) return;
        // A locally-correct pair cannot complete until the server confirms it.
        if (localCorrect) {
          setMatchStatus((current) => {
            const existing = current[pairIndex];
            if (existing?.selectedIndex !== selectedIndex || existing.verdict !== 'correct') return current;
            const next = { ...current };
            delete next[pairIndex];
            return next;
          });
        }
        addPendingStars(-optimisticStarDelta);
      })
      .finally(() => {
        pendingMatchPairsRef.current.delete(attemptKey);
      });

    return Promise.resolve(localVerdict);
  }, [addPendingStars, answerSelectionActive, flyStarsToCounter, question, questionKey,
    questionTiming, roomId, roundNo, matchStatus]);

  const matchComplete = question?.kind === 'match'
    && question.matchPairs?.every((_, pairIndex) => (
      matchStatus[pairIndex]?.verdict === 'correct' && confirmedMatchPairs.has(pairIndex)
    ));

  useEffect(() => {
    if (!matchComplete || phase !== 'question' || !question) return;
    const selectedIndexes = question.matchPairs?.map((_, pairIndex) => (
      matchStatus[pairIndex]?.selectedIndex ?? -1
    )) ?? [];
    void submitCurrentTaskAnswer(question, { selectedIndexes });
  }, [confirmedMatchPairs, matchComplete, matchStatus, phase, question, submitCurrentTaskAnswer]);

  /**
   * «Готово» в задании с парами — досрочная фиксация ответа.
   *
   * зачем 2026-08-03 (владелец: «кнопка готова должна быть когда он закончил»):
   * раньше задание уходило на сервер ТОЛЬКО когда собрано всё поле целиком
   * (matchComplete), поэтому игрок, собравший часть пар, был обязан досиживать
   * таймер — а по новому правилу частичный результат уже стоит звёзд. Кнопка
   * отправляет то, что собрано, и не ждёт остатка.
   *
   * Отправляем ровно подтверждённые пары; неподтверждённые уходят как -1 и
   * сервер их не засчитывает — врать в свою пользу кнопка не может.
   */
  /**
   * Отправка собранного поля БЕЗ звука тапа.
   *
   * зачем 2026-08-03: этим же путём уходит автоотправка по истечении времени,
   * а там уже звучит сигнал таймера — второй звук в тот же кадр читался бы как
   * «игрок что-то нажал», хотя он ничего не нажимал.
   */
  const submitMatchProgress = useCallback(() => {
    if (!question || question.kind !== 'match' || phase !== 'question') return;
    const selectedIndexes = question.matchPairs?.map((_, pairIndex) => (
      matchStatus[pairIndex]?.verdict === 'correct' && confirmedMatchPairs.has(pairIndex)
        ? matchStatus[pairIndex]?.selectedIndex ?? -1
        : -1
    )) ?? [];
    void submitCurrentTaskAnswer(question, { selectedIndexes });
  }, [confirmedMatchPairs, matchStatus, phase, question, submitCurrentTaskAnswer]);

  const finishMatchEarly = useCallback(() => {
    if (!question || question.kind !== 'match' || phase !== 'question') return;
    fk.tap();
    submitMatchProgress();
  }, [phase, question, submitMatchProgress]);

  // Таймаут-эффект берёт функцию отсюда, чтобы не зависеть от matchStatus.
  useEffect(() => {
    finishMatchEarlyRef.current = submitMatchProgress;
  }, [submitMatchProgress]);

  /** Сколько пар уже подтверждено сервером — по ним считается награда. */
  const confirmedMatchCount = question?.kind === 'match'
    ? (question.matchPairs ?? []).filter((_, pairIndex) => (
      matchStatus[pairIndex]?.verdict === 'correct' && confirmedMatchPairs.has(pairIndex)
    )).length
    : 0;

  // зачем: последние секунды слышно, а не только видно — TimerRing красит
  // кольцо на `seconds <= 5`, звук берём с того же порога, чтобы картинка и
  // звук говорили об одном. Повторы схлопывает кулдаун каталога.
  useEffect(() => {
    if (phase !== 'question' || !question) return;
    if (secondsLeft == null || secondsLeft > 5 || secondsLeft <= 0) return;
    playTimerTick();
  }, [phase, question, secondsLeft, playTimerTick]);

  // Время вышло — пропуск, серия обнуляется.
  useEffect(() => {
    if (phase !== 'question' || secondsLeft !== 0 || !question) return;
    // зачем 2026-08-02 (страховка к корню бага «мёртвые вопросы после
    // первого»): secondsLeft — производное состояние, и ноль в нём может быть
    // УСТАРЕВШИМ (от предыдущего задания, пережившим переход). Пропуск по
    // таймауту — необратимый исход, поэтому сверяемся с первоисточником:
    // абсолютным серверным дедлайном ВИДИМОГО задания. Окно реально открыто —
    // значит ноль ложный, выходим и даём секундному таймеру записать настоящий
    // остаток.
    const answerEndsAtMs = questionTiming?.answerDeadlineAtMs ?? questionTiming?.deadlineAtMs;
    if (answerEndsAtMs !== undefined && tournamentNow() < answerEndsAtMs) return;
    // зачем: истечение времени — это исход задания, а не просто смена фазы;
    // без звука пропуск по таймауту ощущался как «экран сам перещёлкнулся».
    playTimerExpired();
    /**
     * КОРЕНЬ бага «собранные пары откатываются и звёзд максимум 4»
     * (владелец 2026-08-03: «сегодня пытались исправить 10 раз и не исправили»).
     *
     * Здесь стоял только markTaskResolved — задание помечалось закрытым, но
     * ОТВЕТ НА СЕРВЕР НЕ УХОДИЛ. Для choice/translate это верно (нечего слать),
     * а для пар игрок к этому моменту уже собрал часть поля, и она просто
     * исчезала. Дальше срабатывал второй, невидимый эффект: сервер считает
     * звёзды за раунд ТОЛЬКО когда пришли чеки по ВСЕМ четырём заданиям
     * (hasCompleteReceiptSet в tournaments.ts). Нет чека по парам — не
     * считается весь раунд целиком, поэтому звёзды «застревали» на числе,
     * набранном в предыдущих заданиях, а поле выглядело так, будто игрок на
     * него не отвечал.
     *
     * Прошлые попытки искали гонку с сервером и правили внешний вид карточки —
     * то есть лечили симптом. Теперь по истечении времени отправляем ровно то,
     * что собрано: «сколько правильно — столько звёзд» работает и при неполном
     * поле, а раунд получает недостающий чек и досчитывается.
     */
    if (question.kind === 'match') {
      finishMatchEarlyRef.current?.();
    }
    markTaskResolved(question.taskId);
    setPicked(null);
    setPhase('feedback');
    setFeedbackCorrect(null);
    scheduleFeedbackAdvance();
  }, [markTaskResolved, phase, secondsLeft, question, questionTiming, scheduleFeedbackAdvance, playTimerExpired]);

  // Сервер перевёл комнату дальше — уходим, даже если локально не досчитали.
  useEffect(() => {
    if (!runtimeActive || !freshSnapshot || !room || !roomId || forfeitingRef.current) return;
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
        <TournamentEdgeState kind="cancelled" onRetry={() => closeTournamentFlow(router)} />
      </View>
    );
  }

  if (phase === 'intro' && showLocalIntro) {
    const modeLabel = MODE_LABELS[questions[0]?.mode ?? ''] ?? triLang(lang, { ru: 'Турнирный раунд', uk: 'Турнірний раунд', es: 'Ronda del torneo', 'pt-BR': 'Rodada do torneio', vi: 'Vòng đấu giải', id: 'Ronde turnamen', tr: 'Turnuva turu', pl: 'Runda turnieju' });
    return (
      <TournamentRoundIntro
        roundNo={roundNo}
        modeLabel={modeLabel}
        // Та же граница, по которой решается ПОКАЗЫВАТЬ ли интро (см.
        // roundIntroEndsAtMs выше). Раньше здесь был отдельный набор фолбэков,
        // и отсчёт мог целиться в момент, отличный от условия показа.
        introEndsAtMs={roundIntroEndsAtMs ?? tournamentNow()}
        onDone={startQuestions}
      />
    );
  }

  // Задания ещё не пришли — держим геометрию интро, а не мигаем пустотой.
  if (!question) {
    return (
      <View style={[styles.root, styles.introRoot]}>
        <TournamentBackdrop variant="play" />
        <Text style={styles.introMode}>{triLang(lang, { ru: 'Готовим вопросы…', uk: 'Готуємо запитання…', es: 'Preparando preguntas…', 'pt-BR': 'Preparando perguntas…', vi: 'Đang chuẩn bị câu hỏi…', id: 'Menyiapkan pertanyaan…', tr: 'Sorular hazırlanıyor…', pl: 'Przygotowujemy pytania…' })}</Text>
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
      <TournamentBackdrop variant="play" />
      {/* зачем 2026-07-27 (владелец: «почему всё так высоко задрано вверх, а
          внизу куча пустого пространства»): контент лип к верху, а низ экрана
          пустовал. Теперь высота распределена — вопрос занимает свою долю и
          центрируется, ответы идут следом, а управление прижато к низу
          (см. bottomBar под ScrollView). flexGrow позволяет содержимому
          дышать на больших экранах и скроллиться на маленьких. */}
      <ScrollView
        ref={scrollRef}
        decelerationRate="normal"
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
          {/* зачем 2026-08-01 (аудит турнира): выход из турнира — самое
              весомое действие на экране, а открывалось оно «тихо», без
              тактильного отклика, тогда как тот же выход в лобби его давал. */}
          <Pressable
            onPress={() => { fk.tap(); setForfeitConfirmVisible(true); }}
            style={styles.forfeitButton}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Выйти из текущего турнира', uk: 'Вийти з поточного турніру', es: 'Salir del torneo actual', 'pt-BR': 'Sair do torneio atual', vi: 'Rời giải đấu hiện tại', id: 'Keluar dari turnamen saat ini', tr: 'Mevcut turnuvadan çık', pl: 'Opuść bieżący turniej' })}
            accessibilityHint={triLang(lang, { ru: 'Потребуется подтверждение; взнос не возвращается', uk: 'Знадобиться підтвердження; внесок не повертається', es: 'Se pedirá confirmación; la entrada no se reembolsa', 'pt-BR': 'Será necessária confirmação; a taxa não é reembolsada', vi: 'Cần xác nhận; phí không được hoàn lại', id: 'Perlu konfirmasi; biaya masuk tidak dikembalikan', tr: 'Onay gerekecek; giriş ücreti iade edilmez', pl: 'Będzie wymagane potwierdzenie; opłata nie jest zwracana' })}
          >
            <Text style={styles.forfeitButtonText}>{triLang(lang, { ru: 'Выйти', uk: 'Вийти', es: 'Salir', 'pt-BR': 'Sair', vi: 'Rời đi', id: 'Keluar', tr: 'Çık', pl: 'Wyjdź' })}</Text>
          </Pressable>
          <Text style={styles.progressLabel}>
            {triLang(lang, { ru: `Вопрос ${index + 1}`, uk: `Запитання ${index + 1}`, es: `Pregunta ${index + 1}`, 'pt-BR': `Pergunta ${index + 1}`, vi: `Câu hỏi ${index + 1}`, id: `Pertanyaan ${index + 1}`, tr: `Soru ${index + 1}`, pl: `Pytanie ${index + 1}` })} <Text style={styles.progressLabelDim}>{triLang(lang, { ru: `из ${total}`, uk: `з ${total}`, es: `de ${total}`, 'pt-BR': `de ${total}`, vi: `trên ${total}`, id: `dari ${total}`, tr: `${total} soru`, pl: `z ${total}` })}</Text>
          </Text>
          <V2Segments total={total} done={index + 1} />
          <TimerRing seconds={displayedSecondsLeft} total={answerWindowSeconds} />
        </View>
        <View style={styles.statsRow}>
          <View style={styles.modePill}>
            <TournamentTwoLineText style={styles.modePillText}>
              {MODE_LABELS[question.mode] ?? question.prompt}
            </TournamentTwoLineText>
          </View>
          <View style={styles.statsSpacer} />
          <V2StreakPill ref={streakPillRef} streak={streak} />
          {/* зачем 2026-08-03 (владелец: «счёт не отображает актуальное состояние,
              он всегда начинается с нуля»): в режиме пар счётчик в шапке раньше
              показывал ЛОКАЛЬНЫЙ счётчик собранных пар этого задания, который
              стартует с нуля. Общий счёт турнира при этом исчезал с экрана, и
              игрок видел «0» вместо накопленных звёзд. Счётчик в шапке всегда
              показывает ОБЩИЙ счёт (серверный + неподтверждённые локальные через
              addPendingStars); прогресс внутри поля пар виден по самим карточкам. */}
          <V2Counter ref={starCounterRef}
            value={stars}
            tone="stars"
            accessibilityLabel={triLang(lang, {
              ru: `Общий счёт турнира: ${stars} звёзд`,
              uk: `Загальний рахунок турніру: ${stars} зірок`,
              es: `Puntuación total del torneo: ${stars} estrellas`,
              'pt-BR': `Pontuação total do torneio: ${stars} estrelas`,
              vi: `Tổng điểm giải đấu: ${stars} sao`,
              id: `Skor total turnamen: ${stars} bintang`,
              tr: `Toplam turnuva skoru: ${stars} yıldız`,
              pl: `Łączny wynik turnieju: ${stars} gwiazdek`,
            })}
            accessibilityLiveRegion="polite"
          />
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
          <>
            <MatchBoard
              matchPairs={question.matchPairs ?? []}
              matchOptions={question.matchOptions}
              status={matchStatus}
              disabled={!answerSelectionActive}
              onSelect={answerMatch}
              lang={lang}
            />
            {/* зачем 2026-08-03 (владелец: «кнопка готова должна быть когда он
                закончил»): пока поле не собрано целиком, игрок ждал таймер зря —
                частично собранные пары уже стоят звёзд. Кнопка появляется, как
                только есть что засчитывать, и подписана числом, чтобы решение
                «жать или добирать» принималось без догадок. */}
            {answerSelectionActive && confirmedMatchCount > 0 ? (
              <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(v2motion.fast)}>
                <Pressable
                  onPress={finishMatchEarly}
                  style={styles.matchDoneButton}
                  accessibilityRole="button"
                  accessibilityLabel={triLang(lang, {
                      ru: `Готово, засчитать ${confirmedMatchCount} звёзд`,
                      uk: `Готово, зарахувати ${confirmedMatchCount} зірок`,
                      es: `Listo, contabilizar ${confirmedMatchCount} estrellas`,
                      'pt-BR': `Concluído, contabilizar ${confirmedMatchCount} estrelas`,
                      vi: `Xong, tính ${confirmedMatchCount} sao`,
                      id: `Selesai, hitung ${confirmedMatchCount} bintang`,
                      tr: `Bitti, ${confirmedMatchCount} yıldız say`,
                      pl: `Gotowe, zalicz ${confirmedMatchCount} gwiazdek`,
                  })}
                >
                  <Text style={styles.matchDoneText}>
                    {triLang(lang, {
                        ru: `Готово · ${confirmedMatchCount} ${confirmedMatchCount === 1 ? 'звезда' : 'звёзд'}`,
                        uk: `Готово · ${confirmedMatchCount} зірок`,
                        es: `Listo · ${confirmedMatchCount} estrellas`,
                        'pt-BR': `Concluído · ${confirmedMatchCount} estrelas`,
                        vi: `Xong · ${confirmedMatchCount} sao`,
                        id: `Selesai · ${confirmedMatchCount} bintang`,
                        tr: `Bitti · ${confirmedMatchCount} yıldız`,
                        pl: `Gotowe · ${confirmedMatchCount} gwiazdek`,
                    })}
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}
          </>
        ) : question.kind === 'translate' ? (
          <WordBank
            key={question.taskId}
            wordBank={question.wordBank}
            requiredTokenCount={question.requiredTokenCount}
            revealed={feedbackVisible}
            disabled={!answerSelectionActive}
            correct={feedbackCorrect}
            onSubmit={answerTranslate}
            lang={lang}
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
                disabled={!answerSelectionActive}
                displayedCorrect={feedbackCorrect}
                authoritativeCorrectIndex={feedbackCorrectIndex}
                onPress={answer}
                lang={lang}
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
                  {feedbackCorrect === true
                      ? triLang(lang, { ru: 'Правильно!', uk: 'Правильно!', es: '¡Correcto!', 'pt-BR': 'Correto!', vi: 'Đúng rồi!', id: 'Benar!', tr: 'Doğru!', pl: 'Poprawnie!' })
                      : triLang(lang, { ru: 'Почти!', uk: 'Майже!', es: '¡Casi!', 'pt-BR': 'Quase!', vi: 'Gần đúng!', id: 'Hampir!', tr: 'Neredeyse!', pl: 'Prawie!' })}
                </TournamentTwoLineText>
                {/* зачем 2026-08-02 (владелец: «убери блок с объяснением ошибки
                    на экране во время турнира»): здесь показывался разбор
                    правила и пример прямо под вердиктом. Турнир — соревнование
                    на скорость, а не урок: длинный текст отнимал внимание в
                    момент, когда идёт отсчёт до следующего задания, и ломал
                    ритм. Разбор ошибок остаётся в конце турнира отдельным
                    экраном (tournament_review), где его можно читать спокойно. */}
              </Animated.View>
            ) : null}
          </View>
        ) : null}

        {/* «Время вышло» не показываем. Для choice остаётся короткий бинарный
            результат сервера в заранее зарезервированном слоте; ключ ответа
            во время игры не раскрывается и выбранная плита не красится зелёным. */}
      </ScrollView>

      {/* зачем 2026-08-02 (владелец: «внизу есть всегда недоступная кнопка
          „Готово“, она никогда не нажимается»): нижняя панель с кнопкой
          удалена. Раньше здесь стоял ранний финиш раунда, но задания давно
          отправляются по одному сразу при решении, поэтому кнопке нечего было
          подтверждать — она висела серой во всех режимах. Подробности и
          обоснование — у showRoundFinish выше. */}

      {/* Слой полётов поверх экрана: звёзды, конфетти, золотая волна.
          pointerEvents=none внутри — тапы проходят сквозь него к вариантам. */}
      <TournamentFxHost ref={fxRef} width={fxSize.width} height={fxSize.height} />
      <Sheet visible={forfeitConfirmVisible} onClose={() => setForfeitConfirmVisible(false)}>
        <Text style={styles.forfeitTitle}>{triLang(lang, { ru: 'Выйти из турнира?', uk: 'Вийти з турніру?', es: '¿Salir del torneo?', 'pt-BR': 'Sair do torneio?', vi: 'Rời khỏi giải đấu?', id: 'Keluar dari turnamen?', tr: 'Turnuvadan çıkılsın mı?', pl: 'Opuścić turniej?' })}</Text>
        <Text style={styles.forfeitText}>
          {triLang(lang, { ru: 'Вы покинете текущий турнир и потеряете возможность получить награду.', uk: 'Ви покинете поточний турнір і втратите можливість отримати нагороду.', es: 'Saldrás del torneo actual y perderás la oportunidad de obtener una recompensa.', 'pt-BR': 'Você sairá do torneio atual e perderá a chance de ganhar uma recompensa.', vi: 'Bạn sẽ rời khỏi giải đấu hiện tại và mất cơ hội nhận phần thưởng.', id: 'Anda akan keluar dari turnamen saat ini dan kehilangan kesempatan mendapatkan hadiah.', tr: 'Mevcut turnuvadan çıkacak ve ödül kazanma fırsatını kaybedeceksin.', pl: 'Opuścisz bieżący turniej i stracisz szansę na nagrodę.' })}
        </Text>
        <Text style={styles.forfeitWarning}>{triLang(lang, { ru: 'Взнос не возвращается.', uk: 'Внесок не повертається.', es: 'La entrada no se reembolsa.', 'pt-BR': 'A taxa não é reembolsada.', vi: 'Phí không được hoàn lại.', id: 'Biaya masuk tidak dikembalikan.', tr: 'Giriş ücreti iade edilmez.', pl: 'Opłata nie jest zwracana.' })}</Text>
        <View style={styles.forfeitActions}>
          <V2Cta tone="ghost" onPress={() => setForfeitConfirmVisible(false)}>{triLang(lang, { ru: 'Остаться', uk: 'Залишитися', es: 'Quedarse', 'pt-BR': 'Ficar', vi: 'Ở lại', id: 'Tetap tinggal', tr: 'Kal', pl: 'Zostań' })}</V2Cta>
          <V2Cta tone="ghost" onPress={confirmForfeit}>{triLang(lang, { ru: 'Подтвердить выход', uk: 'Підтвердити вихід', es: 'Confirmar salida', 'pt-BR': 'Confirmar saída', vi: 'Xác nhận rời đi', id: 'Konfirmasi keluar', tr: 'Çıkışı onayla', pl: 'Potwierdź wyjście' })}</V2Cta>
        </View>
      </Sheet>
    </View>
  );
}

// ── Вариант ответа ──────────────────────────────────────────────────────────

const OptionRow = memo(function OptionRow({
  letter, text, index, picked, revealed, disabled, displayedCorrect, authoritativeCorrectIndex, onPress, lang,
}: {
  letter: string;
  text: string;
  index: number;
  picked: number | null;
  revealed: boolean;
  disabled: boolean;
  displayedCorrect: boolean | null;
  authoritativeCorrectIndex: number | null;
  onPress: (index: number) => void;
  lang: Lang;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  // зачем 2026-07-27: плита варианта переведена на язык Learning V2 —
  // градиент, нижняя 3D-кромка, просадка на неё при нажатии. Выбранный
  // вариант становится зелёным только при совпадении локального отпечатка;
  // серверный итог затем тихо подтверждает результат и начисляет очки.
  const isPicked = picked === index;
  const isLocallyCorrectSelection = revealed && isPicked && displayedCorrect === true;
  const isCorrectOption = revealed && (
    authoritativeCorrectIndex === index
    || (authoritativeCorrectIndex === null && isLocallyCorrectSelection)
  );
  const verdict = isCorrectOption
    ? 'ok'
    : revealed && isPicked && displayedCorrect !== null
    ? displayedCorrect ? 'ok' : 'bad'
    : revealed && !isPicked ? 'dim' : 'idle';
  const answerState = revealed && isPicked && displayedCorrect !== null
    ? (displayedCorrect
        ? triLang(lang, { ru: ', ответ верный', uk: ', відповідь правильна', es: ', respuesta correcta', 'pt-BR': ', resposta correta', vi: ', câu trả lời đúng', id: ', jawaban benar', tr: ', cevap doğru', pl: ', odpowiedź poprawna' })
        : triLang(lang, { ru: ', ответ не подошёл', uk: ', відповідь неправильна', es: ', respuesta incorrecta', 'pt-BR': ', resposta incorreta', vi: ', câu trả lời không đúng', id: ', jawaban tidak tepat', tr: ', cevap yanlış', pl: ', odpowiedź niepoprawna' }))
    : '';

  return (
    <V2Chip
      block
      verdict={verdict}
      selected={isPicked}
      disabled={disabled || revealed}
      onPress={() => onPress(index)}
      accessibilityLabel={triLang(lang, {
          ru: `Вариант ${letter}: ${text}${answerState}`,
          uk: `Варіант ${letter}: ${text}${answerState}`,
          es: `Opción ${letter}: ${text}${answerState}`,
          'pt-BR': `Opção ${letter}: ${text}${answerState}`,
          vi: `Lựa chọn ${letter}: ${text}${answerState}`,
          id: `Pilihan ${letter}: ${text}${answerState}`,
          tr: `Seçenek ${letter}: ${text}${answerState}`,
          pl: `Opcja ${letter}: ${text}${answerState}`,
      })}
      left={(
        <View style={[
            styles.optionLetter,
            isCorrectOption && styles.optionLetterCorrect,
            revealed && isPicked && displayedCorrect === false && styles.optionLetterWrong,
          ]}>
          <Text style={[
            styles.optionLetterText,
            isCorrectOption && styles.optionLetterTextCorrect,
          ]}>{letter}</Text>
        </View>
      )}
      right={isCorrectOption ? (
        <Text style={[styles.optionMark, { color: P.accentText }]}>✓</Text>
      ) : revealed && isPicked && displayedCorrect === false ? (
        <Text style={[styles.optionMark, { color: P.danger }]}>×</Text>
      ) : null}
    >
      <TournamentTwoLineText style={[
        styles.optionText,
        isCorrectOption && styles.optionTextCorrect,
        revealed && isPicked && displayedCorrect === false && styles.optionTextWrong,
      ]}>{text}</TournamentTwoLineText>
    </V2Chip>
  );
});

const MatchBoard = memo(function MatchBoard({
  matchPairs, matchOptions, status, disabled, onSelect, lang,
}: {
  matchPairs: MatchPair[];
  matchOptions?: string[];
  status: Record<number, MatchStatus>;
  disabled: boolean;
  onSelect: (pairIndex: number, selectedIndex: number) => Promise<'correct' | 'wrong' | 'rejected'>;
  lang: Lang;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);

  // Старые поля имели отдельные 4 варианта на каждую строку. Они не должны
  // ломать уже начатую комнату, но в новые комнаты не попадают: у точного
  // переноса 07 всегда общая правая колонка из шести карточек.
  if (!matchOptions || matchOptions.length !== matchPairs.length) {
    return (
      <View style={styles.matchBoard} accessibilityLabel={triLang(lang, { ru: 'Шесть пар слов на скорость', uk: 'Шість пар слів на швидкість', es: 'Seis pares de palabras contrarreloj', 'pt-BR': 'Seis pares de palavras contra o tempo', vi: 'Sáu cặp từ tính giờ', id: 'Enam pasangan kata kecepatan', tr: 'Hız için altı kelime çifti', pl: 'Sześć par słów na czas' })}>
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
    lang={lang}
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
  side,
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
  /**
   * Какой язык в карточке: изучаемый ('prompt') или родной ('translation').
   *
   * зачем 2026-08-03 (владелец: «в турнирах два языка одним шрифтом и цветом в
   * заданиях, то надо исправить»): обе колонки красились одним стилем, поэтому
   * английское слово и перевод читались как один поток и глазу не за что было
   * зацепиться. Различаем тоном и весом — изучаемый язык ведёт, перевод
   * поддерживает. Обводки не используем: они запрещены правилами проекта.
   */
  side: 'prompt' | 'translation';
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const scale = useSharedValue(1);
  /**
   * зачем 2026-08-03 (владелец: «в задании пары при соединении слова исчезают
   * совсем, а должны просто стать неактивные, но затем они возвращаются»):
   * решённая карточка уходила в opacity 0 — то есть ПРОПАДАЛА с поля. Пустое
   * место сбивало с толку, а когда серверное подтверждение запаздывало или
   * отпадало, карточка «воскресала» на прежнем месте — самый неприятный эффект,
   * потому что доска выглядела сломанной.
   *
   * Решённая пара теперь ГАСНЕТ до приглушённого состояния, но остаётся на
   * месте: поле не дёргается, игрок видит, что уже собрано, и возвращать
   * нечего — карточка никуда не девалась.
   */
  const opacity = useSharedValue(hidden ? MATCH_SOLVED_OPACITY : 1);

  useEffect(() => {
    if (hidden) {
      opacity.value = withTiming(MATCH_SOLVED_OPACITY, { duration: reduceMotion ? 0 : MATCH_CORRECT_FADE_MS });
      return;
    }
    if (!resolvingCorrect) {
      opacity.value = withTiming(1, { duration: reduceMotion ? 0 : MATCH_SELECT_MS });
      scale.value = withTiming(1, { duration: reduceMotion ? 0 : MATCH_SELECT_MS });
      return;
    }
    if (reduceMotion) {
      opacity.value = withTiming(MATCH_SOLVED_OPACITY, { duration: 0 });
      return;
    }
    scale.value = withSequence(
      withTiming(1.06, { duration: MATCH_CORRECT_POP_MS / 2 }),
      withTiming(0.97, { duration: MATCH_CORRECT_POP_MS / 2 }),
      withTiming(1, { duration: MATCH_CORRECT_FADE_MS }),
    );
    opacity.value = withDelay(
      MATCH_CORRECT_POP_MS,
      withTiming(MATCH_SOLVED_OPACITY, { duration: MATCH_CORRECT_FADE_MS }),
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
        // Изучаемый язык ведёт весом и полным тоном, перевод звучит тише.
        side === 'translation' && styles.strictMatchTextTranslation,
        selected && styles.strictMatchTextSelected,
        wrong && styles.strictMatchTextWrong,
        resolvingCorrect && styles.strictMatchTextCorrect,
      ]}>{label}</TournamentTwoLineText>
    </AnimatedPressable>
  );
});

const StrictMatchBoard = memo(function StrictMatchBoard({
  matchPairs, matchOptions, status, disabled, onSelect, lang,
}: {
  matchPairs: MatchPair[];
  matchOptions: string[];
  status: Record<number, MatchStatus>;
  disabled: boolean;
  onSelect: (pairIndex: number, selectedIndex: number) => Promise<'correct' | 'wrong' | 'rejected'>;
  lang: Lang;
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
    <View style={styles.strictMatchBoard} accessibilityLabel={triLang(lang, { ru: 'Поле пар: английские слова и переводы', uk: 'Поле пар: англійські слова та переклади', es: 'Tablero de parejas: palabras en inglés y traducciones', 'pt-BR': 'Quadro de pares: palavras em inglês e traduções', vi: 'Bảng ghép cặp: từ tiếng Anh và bản dịch', id: 'Papan pasangan: kata bahasa Inggris dan terjemahan', tr: 'Eşleştirme tahtası: İngilizce kelimeler ve çeviriler', pl: 'Plansza par: angielskie słowa i tłumaczenia' })}>
      <View style={styles.strictMatchColumn}>
        {matchPairs.map((pair, index) => {
          const matched = status[index]?.verdict === 'correct';
          const selected = pickedLeft === index;
          const isWrong = wrong?.left === index;
          const resolvingCorrect = selected && pickedRight !== null && matched;
          return (
            <Animated.View key={`left:${pair.prompt}:${index}`} entering={reduceMotion ? undefined : FadeInDown.delay(index * 40).duration(260)} style={styles.matchSlot}>
              <MatchCard
                side="prompt"
                label={pair.prompt}
                accessibilityLabel={triLang(lang, { ru: `Английское слово: ${pair.prompt}`, uk: `Англійське слово: ${pair.prompt}`, es: `Palabra en inglés: ${pair.prompt}`, 'pt-BR': `Palavra em inglês: ${pair.prompt}`, vi: `Từ tiếng Anh: ${pair.prompt}`, id: `Kata bahasa Inggris: ${pair.prompt}`, tr: `İngilizce kelime: ${pair.prompt}`, pl: `Angielskie słowo: ${pair.prompt}` })}
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
                side="translation"
                label={option}
                accessibilityLabel={triLang(lang, { ru: `Перевод: ${option}`, uk: `Переклад: ${option}`, es: `Traducción: ${option}`, 'pt-BR': `Tradução: ${option}`, vi: `Bản dịch: ${option}`, id: `Terjemahan: ${option}`, tr: `Çeviri: ${option}`, pl: `Tłumaczenie: ${option}` })}
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
  wordBank, requiredTokenCount, revealed, disabled, correct, onSubmit, lang,
}: {
  wordBank: string[];
  requiredTokenCount: number;
  revealed: boolean;
  disabled: boolean;
  correct: boolean | null;
  onSubmit: (tokens: string[]) => void;
  lang: Lang;
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
              accessibilityLabel={triLang(lang, { ru: `Убрать слово ${word}`, uk: `Прибрати слово ${word}`, es: `Quitar la palabra ${word}`, 'pt-BR': `Remover a palavra ${word}`, vi: `Xóa từ ${word}`, id: `Hapus kata ${word}`, tr: `${word} kelimesini kaldır`, pl: `Usuń słowo ${word}` })}
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
                  accessibilityLabel={triLang(lang, { ru: `Слово ${word}`, uk: `Слово ${word}`, es: `Palabra ${word}`, 'pt-BR': `Palavra ${word}`, vi: `Từ ${word}`, id: `Kata ${word}`, tr: `${word} kelimesi`, pl: `Słowo ${word}` })}
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
            {triLang(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Hazır', pl: 'Gotowe' })}
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
  // зачем 2026-08-02: стиль bottomBar удалён вместе с кнопкой «Готово» —
  // нижней панели на экране раунда больше нет.

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
  /**
   * Родной язык — тише изучаемого.
   *
   * зачем 2026-08-03 (владелец: «два языка одним шрифтом и цветом — надо
   * исправить»): различаем тоном и весом, а не обводкой (обводки контейнеров
   * запрещены) и не размером (одинаковая высота карточек держит сетку поля).
   * P.muted — тот же токен, которым проект глушит вторичный текст, поэтому
   * контраст остаётся читаемым в любой теме.
   */
  strictMatchTextTranslation: { color: P.muted, fontWeight: '600' },
  // Кнопка досрочной фиксации пар. Разделение тоном, без обводки.
  matchDoneButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: P.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  matchDoneText: { fontSize: 16, fontWeight: '900', color: P.accentText },
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
