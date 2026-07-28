// ═══════════════════════════════════════════════════════════════════════════
// tournament_round.tsx — раунд турнира (макеты 09-13, 25-28).
//
// зачем: сердце режима. Батч из 5 вопросов, точки прогресса, кольцо таймера,
// множитель серии, фидбек «Правильно!»/«Почти!» и авто-переход через 1.4с.
// Слово «неверно» запрещено — только «Почти!» (правило владельца).
//
// Layout stability: карточка вопроса и блок вариантов имеют фиксированную
// геометрию с первого кадра. Фидбек-плашка занимает зарезервированное место,
// поэтому варианты не «прыгают» при её появлении.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInRight, SlideOutLeft, ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { TimerRing } from '../components/tournament/TournamentCountdown';
import {
  V2Card,
  V2Chip,
  V2Counter,
  V2Cta,
  V2Segments,
  V2StreakPill,
} from '../components/tournament/tournament_v2_ui';
import {
  StarGlyph,
  TournamentFxHost,
  type FxPoint,
  type TournamentFxApi,
} from '../components/tournament/TournamentFx';
import { T, motion, radius, type, useTournamentPalette, v2motion, type TournamentPalette} from '../components/tournament/tournament_theme';
import { TournamentAudioButton } from '../components/tournament/TournamentAudioButton';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import { TournamentRoundIntro } from '../components/tournament/TournamentRoundIntro';
import {
  isTableState, submitAnswers, useTournamentReactions, useTournamentRoom,
  type PublicTask } from './tournament_client';
import { useLocalSearchParams } from 'expo-router';

// зачем 2026-07-27 (владелец: «4 вопроса в раунде»): здесь лежала третья
// версия одного и того же числа — сервер собирал 6 заданий, а клиент считал 5.
// Значение используется только как запасное, пока задания не пришли; реальное
// число берётся из questions.length, но расходиться они больше не должны.
const QUESTIONS_PER_ROUND = 4;
const SECONDS_PER_QUESTION = 15;
const SECONDS_PER_MATCH = 20;
const SPEED_MATCH_PAIRS = 6;
const LETTERS = ['A', 'B', 'C', 'D'] as const;

type MatchPair = { prompt: string; options: string[] };
type MatchStatus = { verdict: 'correct' | 'wrong'; selectedIndex: number };

type Question = {
  /** taskId исходного задания — на него ссылается ответ. */
  taskId: string;
  // зачем 2026-07-27: аудио-режимы владельца. listen = услышал → выбрал,
  // dictate = услышал → собрал из чипов. Отвечают как choice/translate,
  // но вместо текста фразы игроку даётся ТОЛЬКО звук.
  kind: 'choice' | 'timeattack' | 'translate' | 'listen' | 'dictate' | 'match';
  prompt: string;
  /** Для аудио-режимов ПУСТО: услышанный текст и есть ответ. */
  phrase: string;
  /** Озвучка задания (аудио-режимы). Пусто для текстовых. */
  audioUri?: string;
  /** Варианты для choice/timeattack; пусто для translate. */
  options: string[];
  /** Банк слов вразнобой для translate; пусто для choice/timeattack. */
  wordBank: string[];
  /**
   * Позиция подвопроса внутри timeattack.items; для choice/translate всегда 0.
   * зачем: одно timeattack-задание — это НЕСКОЛЬКО экранных вопросов с общим
   * taskId, но сервер (verifyTournamentAnswer) ждёт один ответ на весь
   * набор — массив selectedIndexes по всем items сразу. Поэтому ответы
   * подвопросов одного taskId копятся отдельно и мержатся в один пункт
   * пачки только при отправке (см. buildAnswerRow).
   */
  itemIndex: number;
  /** Сколько всего подвопросов в этом задании — 1 для choice/translate. */
  itemCount: number;
  /** One speed-match task is a single board with six independently answered pairs. */
  matchPairs?: MatchPair[];
  /** Server-issued, room-salted answer fingerprints; never expose answer keys. */
  answerFingerprints?: string[];
};

/**
 * Публичное задание сервера → один или несколько вопросов экрана.
 *
 * зачем: сервер НЕ присылает правильный ответ (его вырезает publicPayload),
 * поэтому подсветку верного варианта показывать нечем. Мгновенный отклик даём
 * по факту нажатия, а очки считает сервер — так накрутить нельзя.
 *
 * timeattack разворачивается в СПИСОК вопросов (по items.length штук) —
 * раньше здесь рисовался только items[0], и 5 из 6 подвопросов серии молча
 * терялись (найдено аудитом 2026-07-25).
 */
function taskToQuestions(task: PublicTask): Question[] {
  const payload = task.payload ?? {};
  if (task.kind === 'choice') {
    const options = Array.isArray(payload.options) ? (payload.options as string[]) : [];
    const phrase = String(payload.phrase ?? '');
    if (!phrase || options.length < 2) return [];
    return [{
      taskId: task.taskId, kind: 'choice', prompt: 'Что это значит?', phrase, options,
      wordBank: [], itemIndex: 0, itemCount: 1,
    }];
  }
  if (task.kind === 'timeattack') {
    const items = Array.isArray(payload.items) ? (payload.items as Record<string, unknown>[]) : [];
    const prompt = String(payload.prompt ?? 'Переведи');
    return items
      .map((item, itemIndex): Question | null => {
        const options = Array.isArray(item?.options) ? (item.options as string[]) : [];
        if (options.length < 2) return null;
        return {
          taskId: task.taskId, kind: 'timeattack', prompt, phrase: String(item.prompt ?? ''),
          options, wordBank: [], itemIndex, itemCount: items.length,
        };
      })
      .filter((question): question is Question => question !== null);
  }
  if (task.kind === 'match') {
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
      kind: 'match',
      prompt: String(payload.prompt ?? 'Соедини пары'),
      phrase: '',
      options: [],
      wordBank: [],
      itemIndex: 0,
      itemCount: matchPairs.length,
      matchPairs,
      answerFingerprints: task.answerFingerprints,
    }];
  }
  if (task.kind === 'translate') {
    // зачем: генератор кладёт в пул 3276 заданий translate_build (столько же,
    // сколько choice) — сервер выбирает режим раунда случайно, поэтому без
    // этой ветки треть турниров зависала бы на «Готовим вопросы…» навсегда
    // (найдено аудитом 2026-07-25).
    const wordBank = Array.isArray(payload.wordBank) ? (payload.wordBank as string[]) : [];
    const phrase = String(payload.phrase ?? '');
    if (!phrase || wordBank.length < 2) return [];
    return [{
      taskId: task.taskId, kind: 'translate', prompt: 'Собери фразу', phrase,
      options: [], wordBank, itemIndex: 0, itemCount: 1,
    }];
  }
  if (task.kind === 'listen') {
    // зачем: без этой ветки аудио-задание давало пустой список вопросов, и
    // турнир зависал на «Готовим вопросы…» — ровно тот класс бага, что уже
    // ловили аудитом на translate_build.
    const options = Array.isArray(payload.options) ? (payload.options as string[]) : [];
    const audioUri = String(payload.audioUri ?? '');
    if (!audioUri || options.length < 2) return [];
    return [{
      taskId: task.taskId,
      kind: 'listen',
      prompt: task.mode === 'sound_contrast' ? 'Какое слово прозвучало?' : 'Что ты слышишь?',
      phrase: '',
      audioUri,
      options,
      wordBank: [],
      itemIndex: 0,
      itemCount: 1,
    }];
  }
  if (task.kind === 'dictate') {
    const wordBank = Array.isArray(payload.wordBank) ? (payload.wordBank as string[]) : [];
    const audioUri = String(payload.audioUri ?? '');
    if (!audioUri || wordBank.length < 2) return [];
    return [{
      taskId: task.taskId,
      kind: 'dictate',
      prompt: 'Послушай и собери фразу',
      phrase: '',
      audioUri,
      options: [],
      wordBank,
      itemIndex: 0,
      itemCount: 1,
    }];
  }
  // voice рисуется отдельной раскладкой — фаза 2 (серверный скоринг выключен).
  return [];
}

function answerFingerprint(roomId: string, taskId: string, selectedIndex: number): string {
  const seed = `${roomId}|${taskId}|${String(selectedIndex).trim().toLowerCase()}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

type Phase = 'intro' | 'question' | 'feedback';

export default function TournamentRoundScreen() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = typeof params.roomId === 'string' ? params.roomId : null;

  const { room, status, secondsLeft: stateSecondsLeft, retry } = useTournamentRoom(roomId);
  const { incoming: incomingReactions, consume: consumeReaction } = useTournamentReactions(roomId);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [picked, setPicked] = useState<number | null>(null);
  /**
   * Явный флаг тайм-аута — раньше «был ли дан ответ» определялось через
   * picked !== null, но у translate нет picked (ответ — собранный порядок
   * слов, не индекс варианта), и фидбек всегда показывал бы «Время вышло»
   * даже при собранной фразе.
   */
  const [timedOut, setTimedOut] = useState(false);
  const [streak, setStreak] = useState(0);
  // зачем 2026-07-27: звёзды и серия в языке Learning V2. ВАЖНО про честность:
  // правильность ответа знает только сервер, поэтому звезда летит за ДАННЫЙ
  // ответ (участие), а не за верный — иначе экран врал бы игроку. Итоговый
  // счёт всё равно приходит с сервера в таблице между раундами.
  const [stars, setStars] = useState(0);
  // Match rounds start perfect; every incorrect attempt removes one star permanently,
  // while the row itself remains available so the player can correct it.
  const [matchStars, setMatchStars] = useState(3);
  const [matchStatus, setMatchStatus] = useState<Record<number, MatchStatus>>({});
  const fxRef = useRef<TournamentFxApi>(null);
  const starCounterRef = useRef<View>(null);
  const streakPillRef = useRef<View>(null);
  const [fxSize, setFxSize] = useState({ width: 0, height: 0 });
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Ответы по каждому подвопросу, ключ — `${taskId}:${itemIndex}`.
   *
   * зачем: сервер (verifyTournamentAnswer) проверяет timeattack ОДНИМ
   * ответом на всё задание — { selectedIndexes: number[] } длиной
   * items.length, а не по одному ответу на подвопрос. Раньше клиент слал
   * голое число как answer и terealTaskId на каждый подвопрос — сервер
   * получал бы answer не тем объектом, каким его ждёт verifyTournamentAnswer,
   * и ответ был бы принят как неверный независимо от выбора игрока.
   * Копим по taskId, на отправке (buildAnswerRows) собираем один пункт
   * пачки на задание в точном серверном формате.
   *
   * Значение для choice/timeattack — индекс варианта (number). Для translate
   * значение — уже собранный порядок токенов (string[]): сервер сверяет
   * ЦЕЛУЮ последовательность слов, а не один индекс.
   */
  const answersByKeyRef = useRef<Map<string, number | string[] | null>>(new Map());
  const submittedRef = useRef(false);

  const activeRound = useMemo(
    () => room?.rounds?.find((round) => round.tasks && round.tasks.length > 0) ?? null,
    [room?.rounds],
  );
  const roundNo = activeRound?.roundNo ?? 1;

  const questions = useMemo(() => {
    const tasks = activeRound?.tasks ?? [];
    return tasks.flatMap(taskToQuestions);
  }, [activeRound?.tasks]);

  const total = questions.length || QUESTIONS_PER_ROUND;
  const question = questions[index] ?? null;
  const secondsForQuestion = question?.kind === 'match' ? SECONDS_PER_MATCH : SECONDS_PER_QUESTION;
  const multiplier = streak >= 4 ? 2 : streak >= 2 ? 1.5 : 1;

  /**
   * Собирает пачку ответов в точном формате verifyTournamentAnswer:
   *   choice     → { selectedIndex: number }
   *   timeattack → { selectedIndexes: number[] } — по ВСЕМ подвопросам
   *                задания, даже если часть не была отвечена (тогда -1,
   *                сервер сам решит, что с ним делать при подсчёте)
   *   translate  → { tokens: string[] } — собранный порядок слов
   */
  const buildAnswerRows = useCallback((): Array<{ taskId: string; answer: unknown }> => {
    const byTask = new Map<string, { kind: Question['kind']; values: (number | string[] | null)[] }>();
    for (const q of questions) {
      const entry = byTask.get(q.taskId) ?? { kind: q.kind, values: [] };
      if (q.kind === 'match') {
        for (let pairIndex = 0; pairIndex < q.itemCount; pairIndex += 1) {
          entry.values[pairIndex] = answersByKeyRef.current.get(`${q.taskId}:${pairIndex}`) ?? null;
        }
      } else {
        entry.values[q.itemIndex] = answersByKeyRef.current.get(`${q.taskId}:${q.itemIndex}`) ?? null;
      }
      byTask.set(q.taskId, entry);
    }
    return Array.from(byTask.entries()).map(([taskId, entry]) => {
      if (entry.kind === 'dictate' || entry.kind === 'translate') {
        return { taskId, answer: { tokens: entry.values[0] ?? [] } };
      }
      if (entry.kind === 'choice' || entry.kind === 'listen') {
        return { taskId, answer: { selectedIndex: entry.values[0] } };
      }
      return {
        taskId,
        answer: { selectedIndexes: entry.values.map((value) => (typeof value === 'number' ? value : -1)) },
      };
    });
  }, [questions]);

  // зачем 2026-07-27 (владелец: «потом отсчёт перед началом типа 3 2 1, потом
  // начинается первый вопрос»): фиксированная пауза 1600 мс заменена живым
  // отсчётом. Момент старта задаёт сам отсчёт (onDone), поэтому таймера здесь
  // больше нет — иначе два независимых таймера разошлись бы между собой.
  const startQuestions = useCallback(() => setPhase('question'), []);

  /**
   * Прослушано ли аудио текущего вопроса.
   *
   * зачем 2026-07-27 (владелец: «таймер запускается не после первого
   * воспроизведения, а сразу, и на ввод фразы остаётся меньше 2 секунд»):
   * в режимах listen/dictate фраза звучит несколько секунд, и всё это время
   * таймер уже тикал — на сам ответ (собрать фразу из слов!) не оставалось
   * ничего. Теперь для аудио отсчёт стартует ПОСЛЕ первого проигрывания.
   * Ключ по вопросу, иначе следующий вопрос унаследовал бы флаг предыдущего.
   */
  const [audioReadyKey, setAudioReadyKey] = useState<string | null>(null);
  const isAudioQuestion = question?.kind === 'listen' || question?.kind === 'dictate';
  const questionKey = question ? `${question.taskId}:${question.itemIndex}` : null;
  const audioPlayed = !isAudioQuestion || audioReadyKey === questionKey;

  const handleAudioPlayed = useCallback(() => {
    if (questionKey) setAudioReadyKey(questionKey);
  }, [questionKey]);

  useEffect(() => {
    setMatchStars(3);
    setMatchStatus({});
  }, [questionKey]);

  // Таймер вопроса. Ноль = ответа не было, идём дальше без очков.
  useEffect(() => {
    if (phase !== 'question') return;
    setSecondsLeft(secondsForQuestion);
    // Аудио ещё не прозвучало — держим полное время на табло и не тикаем.
    if (!audioPlayed) return;
    const id = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) { clearInterval(id); return 0; }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, index, audioPlayed, secondsForQuestion]);

  /**
   * Отправка пачки. Ровно один раз за раунд: сервер идемпотентен, но лишний
   * вызов — лишние деньги и лишний риск гонки.
   */
  const flushAnswers = useCallback(() => {
    if (!roomId || submittedRef.current) return;
    submittedRef.current = true;
    // Не ждём ответа: очки придут через подписку на комнату, а игрок в это
    // время уже смотрит таблицу — блокировать экран нечем и незачем.
    void submitAnswers(roomId, roundNo, buildAnswerRows()).catch(() => {
      // Сеть моргнула — сервер засчитает таймаут по своему дедлайну.
    });
  }, [roomId, roundNo, buildAnswerRows]);

  const goNext = useCallback(() => {
    if (index + 1 >= total) {
      flushAnswers();
      router.replace(roomId ? { pathname: '/tournament_table', params: { roomId } } : '/tournament_table');
      return;
    }
    setIndex((value) => value + 1);
    setPicked(null);
    setTimedOut(false);
    setMatchStatus({});
    setPhase('question');
  }, [index, total, flushAnswers, roomId, router]);

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
   * Optimistic UI: уходим на таблицу СРАЗУ, не дожидаясь сети — пачка летит
   * фоном (flushAnswers не ждёт ответа). Двойной тап закрыт submittedRef
   * внутри flushAnswers и локальным finishing.
   */
  const [finishing, setFinishing] = useState(false);

  const finishEarly = useCallback(() => {
    if (finishing) return;
    setFinishing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flushAnswers();
    router.replace(roomId
      ? { pathname: '/tournament_table', params: { roomId } }
      : '/tournament_table');
  }, [finishing, flushAnswers, roomId, router]);

  /**
   * Полёт звезды от места ответа к счётчику + бонусы за серию.
   * Координаты меряем в окне: слой эффектов сам переводит их в свои.
   */
  const flyStar = useCallback((from: FxPoint) => {
    const counter = starCounterRef.current;
    if (!counter) { setStars((value) => value + 1); return; }
    counter.measureInWindow((x, y, width, height) => {
      fxRef.current?.flyStar(from, { x: x + width / 2, y: y + height / 2 }, P.gold, () => {
        setStars((value) => value + 1);
      });
    });
  }, [P.gold]);

  /** Веха серии: золотая волна + конфетти, как в эталоне V2. */
  const celebrateStreak = useCallback((nextStreak: number) => {
    if (nextStreak !== 3 && nextStreak !== 5 && nextStreak !== 7) return;
    fxRef.current?.goldWave(P.gold);
    const counter = starCounterRef.current;
    counter?.measureInWindow((x, y, width, height) => {
      fxRef.current?.confetti(
        { x: x + width / 2, y: y + height / 2 },
        [P.gold, P.accent, P.okGradA, P.text],
      );
    });
    // Бонус-звёзды летят ОТ пилюли серии — связь «серия = звёзды» читается
    // телом анимации, а не подписью.
    const bonus = nextStreak >= 5 ? 2 : 1;
    const pill = streakPillRef.current;
    pill?.measureInWindow((x, y, width, height) => {
      const origin = { x: x + width / 2, y: y + height / 2 };
      fxRef.current?.floatLabel(`+${bonus}`, origin, P.gold);
      for (let i = 0; i < bonus; i += 1) {
        setTimeout(() => flyStar(origin), 300 + i * 170);
      }
    });
  }, [P.gold, P.accent, P.okGradA, P.text, flyStar]);

  const answer = useCallback((optionIndex: number) => {
    if (phase !== 'question' || !question) return;

    // Мгновенный отклик: подсветка и вибрация СРАЗУ, до любой сети.
    setPicked(optionIndex);
    setTimedOut(false);
    setPhase('feedback');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Серию ведём локально для множителя; правильность знает только сервер,
    // поэтому серию считаем по факту ответа, а очки не показываем до таблицы.
    setStreak((value) => {
      const next = value + 1;
      celebrateStreak(next);
      return next;
    });
    // Звезда стартует из центра экрана вопроса — точное место плиты не
    // измеряем, чтобы не платить лишним measure на каждом тапе.
    if (fxSize.width > 0) {
      flyStar({ x: fxSize.width / 2, y: fxSize.height * 0.62 });
    }
    // guard-ok: это Map.set() в памяти (локальный буфер ответов), не запись
    // в Firestore — итоговая пачка уходит одним submitAnswers ниже.
    answersByKeyRef.current.set(`${question.taskId}:${question.itemIndex}`, optionIndex);

    advanceRef.current = setTimeout(goNext, motion.answerFeedbackMs);
  }, [phase, question, goNext, celebrateStreak, flyStar, fxSize]);

  /**
   * Подтверждение сборки фразы (translate) — вызывается, когда игрок собрал
   * фразу целиком (banklWords.length === 0) или нажал «Готово».
   * зачем: в отличие от choice, здесь нет единственного индекса — ответ это
   * ВЕСЬ собранный порядок слов, поэтому answer передаётся отдельно.
   */
  const answerTranslate = useCallback((tokens: string[]) => {
    if (phase !== 'question' || !question) return;
    setPhase('feedback');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStreak((value) => {
      const next = value + 1;
      celebrateStreak(next);
      return next;
    });
    if (fxSize.width > 0) {
      flyStar({ x: fxSize.width / 2, y: fxSize.height * 0.5 });
    }
    // guard-ok: Map.set() в памяти (локальный буфер ответов), не Firestore.
    answersByKeyRef.current.set(`${question.taskId}:${question.itemIndex}`, tokens);
    advanceRef.current = setTimeout(goNext, motion.answerFeedbackMs);
  }, [phase, question, goNext, celebrateStreak, flyStar, fxSize]);

  const answerMatch = useCallback((pairIndex: number, selectedIndex: number) => {
    if (phase !== 'question' || question?.kind !== 'match' || !roomId) return;
    if (matchStatus[pairIndex]?.verdict === 'correct') return;

    const fingerprint = answerFingerprint(roomId, question.taskId, selectedIndex);
    const isCorrect = fingerprint === question.answerFingerprints?.[pairIndex];
    setMatchStatus((current) => ({
      ...current,
      [pairIndex]: { verdict: isCorrect ? 'correct' : 'wrong', selectedIndex },
    }));
    // A wrong tile is deliberately not locked. The next tap replaces its stored
    // answer, allowing correction without restoring the lost star.
    answersByKeyRef.current.set(`${question.taskId}:${pairIndex}`, selectedIndex);
    if (isCorrect) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMatchStars((value) => Math.max(0, value - 1));
    }
  }, [phase, question, roomId, matchStatus]);

  const matchComplete = question?.kind === 'match'
    && question.matchPairs?.every((_, pairIndex) => matchStatus[pairIndex]?.verdict === 'correct');

  useEffect(() => {
    if (!matchComplete || phase !== 'question') return;
    advanceRef.current = setTimeout(goNext, motion.answerFeedbackMs);
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, [matchComplete, phase, goNext]);

  // Время вышло — пропуск, серия обнуляется.
  useEffect(() => {
    if (phase !== 'question' || secondsLeft > 0 || !question) return;
    setPicked(null);
    setTimedOut(true);
    setPhase('feedback');
    setStreak(0);
    // Пропуск — оставляем null в буфере (в timeattack это станет -1 в
    // selectedIndexes при сборке пачки, см. buildAnswerRows).
    if (question.kind === 'match') {
      for (let pairIndex = 0; pairIndex < question.itemCount; pairIndex += 1) {
        answersByKeyRef.current.set(`${question.taskId}:${pairIndex}`, null);
      }
    } else {
      answersByKeyRef.current.set(`${question.taskId}:${question.itemIndex}`, null);
    }
    advanceRef.current = setTimeout(goNext, motion.answerFeedbackMs);
  }, [phase, secondsLeft, question, goNext]);

  // Сервер перевёл комнату дальше — уходим, даже если локально не досчитали.
  useEffect(() => {
    if (!room || !roomId) return;
    if (isTableState(room.state) || room.state === 'final') {
      flushAnswers();
      router.replace({ pathname: '/tournament_table', params: { roomId } });
    }
    if (room.state === 'results' || room.state === 'rewards') {
      router.replace({ pathname: '/tournament_results', params: { roomId } });
    }
  }, [room?.state, roomId, router, room, flushAnswers]);

  useEffect(() => () => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
  }, []);

  // зачем: было picked !== null — у translate нет picked (ответ это собранный
  // порядок слов, не индекс варианта), фидбек всегда лгал бы «Время вышло»
  // даже при верно собранной фразе. timedOut выставляется явно в трёх местах.
  const answered = !timedOut;
  const dots = useMemo(() => Array.from({ length: total }, (_, i) => i), [total]);

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

  if (phase === 'intro') {
    // зачем: раньше здесь было захардкожено «Угадай перевод» для любого
    // раунда — интро тайм-атаки лгало о своём режиме (найдено аудитом).
    const firstKind = questions[0]?.kind;
    const modeLabel = firstKind === 'timeattack' ? 'Тайм-атака'
      : firstKind === 'listen' ? 'На слух'
        : firstKind === 'dictate' ? 'Диктант'
          : firstKind === 'translate' ? 'Собери фразу' : 'Угадай перевод';
    return (
      <TournamentRoundIntro
        roundNo={roundNo}
        modeLabel={modeLabel}
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
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Шапка: прогресс батча, множитель, таймер */}
        <View style={styles.header}>
          {/* зачем: было жёстко «из QUESTIONS_PER_ROUND» (константа 5) — в
              timeattack-раунде реальных подвопросов 6, подпись лгала бы
              «Вопрос 6 из 5» (найдено аудитом). total уже берёт questions.length. */}
          <Text style={styles.progressLabel}>
            Вопрос {index + 1} <Text style={styles.progressLabelDim}>из {total}</Text>
          </Text>
          <View style={styles.dots}>
            {dots.map((dot) => (
              <View
                key={dot}
                style={[
                  styles.dot,
                  dot === index && styles.dotActive,
                  dot < index && styles.dotDone,
                ]}
              />
            ))}
          </View>
          {/* Серия и звёзды — язык V2: пилюля накаляется по ярусам, счётчик
              подпрыгивает при начислении. Множитель ушёл в пилюлю. */}
          <V2StreakPill ref={streakPillRef} streak={streak} />
          <V2Counter ref={starCounterRef} value={question.kind === 'match' ? matchStars : stars} tone="stars" />
          <TimerRing seconds={secondsLeft} total={secondsForQuestion} />
        </View>

        {/* Вопрос.
            зачем 2026-07-27 (владелец: «просто анимация перехода на след
            задание как в Learning V2»): key={questionKey} пересоздаёт блок на
            каждом задании, поэтому entering/exiting отрабатывают как смена
            карточки в эталоне — уходящее уезжает влево, новое приходит справа.
            Кривые те же, что в макете (--ease-slide / --ease-spring). */}
        <Animated.View
          key={questionKey ?? 'q'}
          entering={SlideInRight.duration(v2motion.taskSwapMs)
            .easing(Easing.bezier(...v2motion.bezierSlide).factory())}
          exiting={SlideOutLeft.duration(v2motion.press)
            .easing(Easing.bezier(...v2motion.bezierSlide).factory())}
          style={styles.questionZone}
        >
        {/* зачем 2026-07-27 (владелец): формулировка задания — НАД контейнером,
            а не внутри него. Внутри карточки она конкурировала с самим
            заданием (плеером/фразой) за первое место в чтении; вынесенная
            наверх, она читается как подпись к блоку. */}
        <Text style={styles.questionPrompt}>{question.prompt}</Text>
        {question.kind !== 'match' ? <V2Card pad={22} style={styles.questionCard}>
          {/* зачем: в аудио-режиме текст фразы — это и есть ответ, показывать
              его нельзя. Вместо него кнопка: услышать можно только ушами. */}
          {question.kind === 'listen' || question.kind === 'dictate' ? (
            <TournamentAudioButton
              key={question.taskId}
              audioUri={question.audioUri ?? ''}
              // Первое проигрывание запускает таймер вопроса (см. audioPlayed).
              onPlayed={handleAudioPlayed}
            />
          ) : (
            <Text style={styles.questionPhrase}>{question.phrase}</Text>
          )}
        </V2Card> : null}
        </Animated.View>

        {/* Варианты (choice/timeattack) или сборка слов (translate) */}
        {question.kind === 'match' ? (
          <MatchBoard
            matchPairs={question.matchPairs ?? []}
            status={matchStatus}
            onSelect={answerMatch}
          />
        ) : question.kind === 'translate' || question.kind === 'dictate' ? (
          <WordBank
            key={question.taskId}
            wordBank={question.wordBank}
            revealed={phase === 'feedback'}
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
                revealed={phase === 'feedback'}
                onPress={answer}
              />
            ))}
          </View>
        )}

        {/* зачем 2026-07-27 (владелец: «время вышло писать не надо, просто
            анимация перехода на след задание как в Learning V2»): плашка
            «Ответ принят / Время вышло» убрана. Приём ответа читается телом
            движения — плита проседает, звезда улетает в счётчик, задание
            уезжает влево, — как в эталоне 02-phrase-builder. Место больше не
            резервируем: карточка вопроса теперь в своей зоне и варианты не
            прыгают без этой распорки. */}
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
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <V2Cta onPress={finishEarly} disabled={finishing} tone="accent">
          {finishing ? 'Отправляем…' : 'Готово'}
        </V2Cta>
      </View>

      {/* Слой полётов поверх экрана: звёзды, конфетти, золотая волна.
          pointerEvents=none внутри — тапы проходят сквозь него к вариантам. */}
      <TournamentFxHost ref={fxRef} width={fxSize.width} height={fxSize.height} />
    </View>
  );
}

// ── Вариант ответа ──────────────────────────────────────────────────────────

const OptionRow = memo(function OptionRow({
  letter, text, index, picked, revealed, onPress,
}: {
  letter: string;
  text: string;
  index: number;
  picked: number | null;
  revealed: boolean;
  onPress: (index: number) => void;
}) {
  // зачем 2026-07-27: плита варианта переведена на язык Learning V2 —
  // градиент, нижняя 3D-кромка, просадка на неё при нажатии. Выбранный
  // вариант получает okPop-сквош; правильный ответ здесь НЕ раскрывается,
  // он придёт с сервером в таблице.
  const isPicked = picked === index;

  return (
    <V2Chip
      block
      verdict={isPicked ? 'ok' : revealed ? 'dim' : 'idle'}
      disabled={revealed}
      onPress={() => onPress(index)}
      accessibilityLabel={`Вариант ${letter}: ${text}`}
    >
      {text}
    </V2Chip>
  );
});

// ── Сборка фразы из слов (translate) ────────────────────────────────────────

/**
 * Собери фразу из слов: банк перемешанных слов внизу, собранная фраза
 * растёт сверху. Тап переносит слово из банка в собранную строку; повторный
 * тап на собранное слово возвращает его обратно — без этого опечатка
 * заставляла бы ждать конца вопроса, чтобы её исправить.
 *
 * Каждое слово в банке уникально по ПОЗИЦИИ (не по тексту): фраза может
 * содержать повторяющееся слово («I am, I think»), поэтому ключ — индекс
 * исходного банка, а не сам текст.
 */
const MatchBoard = memo(function MatchBoard({
  matchPairs, status, onSelect,
}: {
  matchPairs: MatchPair[];
  status: Record<number, MatchStatus>;
  onSelect: (pairIndex: number, selectedIndex: number) => void;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);

  return (
    <View style={styles.matchBoard} accessibilityLabel="Шесть пар слов на скорость">
      {matchPairs.map((pair, pairIndex) => {
        const pairStatus = status[pairIndex];
        return (
          <View key={`${pair.prompt}:${pairIndex}`} style={styles.matchRow}>
            <View style={styles.matchPrompt}>
              <Text style={styles.matchPromptText}>{pair.prompt}</Text>
            </View>
            <View style={styles.matchOptions}>
              {pair.options.map((option, optionIndex) => (
                <V2Chip
                  key={`${option}:${optionIndex}`}
                  block
                  verdict={pairStatus?.selectedIndex === optionIndex
                    ? pairStatus.verdict === 'correct' ? 'ok' : 'bad'
                    : 'idle'}
                  disabled={pairStatus?.verdict === 'correct'}
                  onPress={() => onSelect(pairIndex, optionIndex)}
                  accessibilityLabel={`${pair.prompt}: ${option}`}
                  style={styles.matchOption}
                >
                  {option}
                </V2Chip>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
});

const WordBank = memo(function WordBank({
  wordBank, revealed, onSubmit,
}: {
  wordBank: string[];
  revealed: boolean;
  onSubmit: (tokens: string[]) => void;
}) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  // usedPositions — индексы слов банка, уже перенесённых в собранную фразу,
  // в порядке переноса. Сбрасывается при смене самого banklWords (новый
  // вопрос) через key={question.taskId} на родителе.
  const [usedPositions, setUsedPositions] = useState<number[]>([]);
  const usedSet = useMemo(() => new Set(usedPositions), [usedPositions]);

  const takeWord = useCallback((position: number) => {
    if (revealed || usedSet.has(position)) return;
    void Haptics.selectionAsync();
    setUsedPositions((value) => [...value, position]);
  }, [revealed, usedSet]);

  const returnWord = useCallback((slotIndex: number) => {
    if (revealed) return;
    void Haptics.selectionAsync();
    setUsedPositions((value) => value.filter((_, index) => index !== slotIndex));
  }, [revealed]);

  const submit = useCallback(() => {
    if (revealed || usedPositions.length !== wordBank.length) return;
    onSubmit(usedPositions.map((position) => wordBank[position]));
  }, [revealed, usedPositions, wordBank, onSubmit]);

  const collected = usedPositions.map((position) => wordBank[position]);
  const isComplete = collected.length === wordBank.length && wordBank.length > 0;

  return (
    <View>
      {/* Собранная фраза — зарезервированное место фиксированной высоты,
          чтобы банк слов ниже не прыгал по мере сборки.
          зачем 2026-07-27 (владелец): подсказка «Собирай слова снизу…» убрана —
          действие очевидно из самого экрана. Пустая зона ОСТАЁТСЯ (высота
          зарезервирована), иначе первое слово сдвинуло бы банк вверх. */}
      <View style={styles.assembled}>
        {collected.map((word, slotIndex) => (
          <Pressable
            key={slotIndex}
            onPress={() => returnWord(slotIndex)}
            disabled={revealed}
            style={styles.assembledChip}
            accessibilityRole="button"
            accessibilityState={{ disabled: revealed }}
            accessibilityLabel={`Убрать слово ${word}`}
          >
            <Text style={styles.assembledChipText}>{word}</Text>
          </Pressable>
        ))}
      </View>

      {/* Банк слов вразнобой */}
      <View style={styles.bank}>
        {wordBank.map((word, position) => {
          const used = usedSet.has(position);
          return (
            <Pressable
              key={position}
              onPress={() => takeWord(position)}
              disabled={revealed || used}
              style={[styles.bankChip, used && styles.bankChipUsed]}
              accessibilityRole="button"
              accessibilityState={{ disabled: revealed || used }}
              accessibilityLabel={`Слово ${word}`}
            >
              <Text style={[styles.bankChipText, used && styles.bankChipTextUsed]}>{word}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.submitSlot}>
        {isComplete ? (
          <Pressable
            onPress={submit}
            disabled={revealed}
            style={styles.submitButton}
            accessibilityRole="button"
            accessibilityState={{ disabled: revealed }}
            accessibilityLabel="Подтвердить фразу"
          >
            <Text style={styles.submitButtonText}>Готово ✓</Text>
          </Pressable>
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
  /** Полоса управления у нижнего края. Разделяем тоном, без обводки. */
  bottomBar: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: P.bg },

  introRoot: { alignItems: 'center', justifyContent: 'center' },
  introRound: { fontSize: 44, fontWeight: '900', color: P.text, letterSpacing: -1 },
  introMode: { ...type.section, color: P.accent, marginTop: 10 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressLabel: { fontSize: 15, fontWeight: '800', color: P.text },
  progressLabelDim: { color: P.muted, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: P.elev2 },
  dotDone: { backgroundColor: P.accent, opacity: 0.5 },
  dotActive: { width: 18, backgroundColor: P.accent },
  multiplier: { marginLeft: 'auto', fontSize: 15, fontWeight: '800', color: P.muted },

  questionCard: { minHeight: 128, justifyContent: 'center' },
  // Подпись к блоку задания: живёт НАД карточкой, поэтому нужен свой отступ
  // снизу и лёгкий отступ слева, чтобы она не липла к кромке карточки.
  questionPrompt: { ...type.body, color: P.muted, marginBottom: 10, marginLeft: 4 },
  // marginTop убран вместе с выносом подписи наверх: внутри карточки фраза
  // теперь единственный элемент и центрируется сама.
  questionPhrase: { fontSize: 28, fontWeight: '900', color: P.text, letterSpacing: -0.6 },

  options: { gap: 10 },
  matchBoard: { gap: 12 },
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
  optionLetterText: { fontSize: 15, fontWeight: '900', color: P.muted },
  optionText: { flex: 1, fontSize: 16, fontWeight: '700' },
  optionMark: { fontSize: 20, color: P.accent, fontWeight: '900' },

  // Высота под фидбек зарезервирована заранее — иначе список вариантов
  // дёргался бы вверх при каждом ответе.
  feedbackTitle: { fontSize: 20, fontWeight: '900' },
  feedbackSub: { ...type.body, color: P.muted, marginTop: 6 },

  scoreLine: {
    textAlign: 'center',
    ...type.body,
    color: P.ghost,
    fontVariant: ['tabular-nums'],
  },

  // ── Сборка фразы из слов (translate) ──────────────────────────────────────
  assembled: {
    minHeight: 56,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  assembledChip: {
    backgroundColor: P.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assembledChipText: { fontSize: 16, fontWeight: '800', color: P.accent },

  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
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
});
