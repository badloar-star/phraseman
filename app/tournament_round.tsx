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
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Card } from '../components/tournament/tournament_ui';
import { TimerRing } from '../components/tournament/TournamentCountdown';
import { T, motion, radius, type, useTournamentPalette, type TournamentPalette} from '../components/tournament/tournament_theme';
import { TournamentAudioButton } from '../components/tournament/TournamentAudioButton';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import {
  isTableState, submitAnswers, useTournamentRoom, type PublicTask } from './tournament_client';
import { useLocalSearchParams } from 'expo-router';

const QUESTIONS_PER_ROUND = 5;
const SECONDS_PER_QUESTION = 15;
const LETTERS = ['A', 'B', 'C', 'D'] as const;

type Question = {
  /** taskId исходного задания — на него ссылается ответ. */
  taskId: string;
  // зачем 2026-07-27: аудио-режимы владельца. listen = услышал → выбрал,
  // dictate = услышал → собрал из чипов. Отвечают как choice/translate,
  // но вместо текста фразы игроку даётся ТОЛЬКО звук.
  kind: 'choice' | 'timeattack' | 'translate' | 'listen' | 'dictate';
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

type Phase = 'intro' | 'question' | 'feedback';

export default function TournamentRoundScreen() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = typeof params.roomId === 'string' ? params.roomId : null;

  const { room, status, secondsLeft: stateSecondsLeft, retry } = useTournamentRoom(roomId);

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
      entry.values[q.itemIndex] = answersByKeyRef.current.get(`${q.taskId}:${q.itemIndex}`) ?? null;
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

  // Интро раунда: показываем режим, затем первый вопрос.
  useEffect(() => {
    if (phase !== 'intro') return;
    const id = setTimeout(() => setPhase('question'), 1600);
    return () => clearTimeout(id);
  }, [phase]);

  // Таймер вопроса. Ноль = ответа не было, идём дальше без очков.
  useEffect(() => {
    if (phase !== 'question') return;
    setSecondsLeft(SECONDS_PER_QUESTION);
    const id = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) { clearInterval(id); return 0; }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, index]);

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
    setPhase('question');
  }, [index, total, flushAnswers, roomId, router]);

  const answer = useCallback((optionIndex: number) => {
    if (phase !== 'question' || !question) return;

    // Мгновенный отклик: подсветка и вибрация СРАЗУ, до любой сети.
    setPicked(optionIndex);
    setTimedOut(false);
    setPhase('feedback');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Серию ведём локально для множителя; правильность знает только сервер,
    // поэтому серию считаем по факту ответа, а очки не показываем до таблицы.
    setStreak((value) => value + 1);
    // guard-ok: это Map.set() в памяти (локальный буфер ответов), не запись
    // в Firestore — итоговая пачка уходит одним submitAnswers ниже.
    answersByKeyRef.current.set(`${question.taskId}:${question.itemIndex}`, optionIndex);

    advanceRef.current = setTimeout(goNext, motion.answerFeedbackMs);
  }, [phase, question, goNext]);

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
    setStreak((value) => value + 1);
    // guard-ok: Map.set() в памяти (локальный буфер ответов), не Firestore.
    answersByKeyRef.current.set(`${question.taskId}:${question.itemIndex}`, tokens);
    advanceRef.current = setTimeout(goNext, motion.answerFeedbackMs);
  }, [phase, question, goNext]);

  // Время вышло — пропуск, серия обнуляется.
  useEffect(() => {
    if (phase !== 'question' || secondsLeft > 0 || !question) return;
    setPicked(null);
    setTimedOut(true);
    setPhase('feedback');
    setStreak(0);
    // Пропуск — оставляем null в буфере (в timeattack это станет -1 в
    // selectedIndexes при сборке пачки, см. buildAnswerRows).
    answersByKeyRef.current.set(`${question.taskId}:${question.itemIndex}`, null);
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
      <View style={[styles.root, styles.introRoot]}>
        <Animated.Text entering={ZoomIn.duration(320)} style={styles.introRound}>
          Раунд {roundNo}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(200)} style={styles.introMode}>
          {modeLabel}
        </Animated.Text>
      </View>
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
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
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
          <Text style={styles.multiplier}>×{multiplier}</Text>
          <TimerRing seconds={secondsLeft} total={SECONDS_PER_QUESTION} />
        </View>

        {/* Вопрос */}
        <Card tone="elev" pad={22} style={styles.questionCard}>
          <Text style={styles.questionPrompt}>{question.prompt}</Text>
          {/* зачем: в аудио-режиме текст фразы — это и есть ответ, показывать
              его нельзя. Вместо него кнопка: услышать можно только ушами. */}
          {question.kind === 'listen' || question.kind === 'dictate' ? (
            <TournamentAudioButton
              key={question.taskId}
              audioUri={question.audioUri ?? ''}
            />
          ) : (
            <Text style={styles.questionPhrase}>{question.phrase}</Text>
          )}
        </Card>

        {/* Варианты (choice/timeattack) или сборка слов (translate) */}
        {question.kind === 'translate' || question.kind === 'dictate' ? (
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

        {/* Фидбек — место зарезервировано, поэтому варианты не прыгают.
            зачем: правильность знает только сервер (ключи ответов клиенту не
            приходят), поэтому подтверждаем ПРИЁМ ответа, а результат игрок
            видит в таблице — это же и защита от подглядывания ответов. */}
        <View style={styles.feedbackSlot}>
          {phase === 'feedback' ? (
            <Animated.View entering={FadeIn.duration(160)}>
              <Card pad={18} style={{ backgroundColor: answered ? P.accentSoft : P.dangerSoft }}>
                <Text style={[styles.feedbackTitle, { color: answered ? P.accent : P.danger }]}>
                  {answered ? 'Ответ принят' : 'Время вышло'}
                </Text>
                <Text style={styles.feedbackSub}>
                  {index + 1 < total
                    ? `дальше вопрос ${index + 2} из ${total}`
                    : 'считаем результаты…'}
                </Text>
              </Card>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
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
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  // Подсвечиваем ТОЛЬКО выбранный вариант: правильный ответ придёт с
  // сервером в таблице, показывать его здесь нечем и не нужно.
  const isPicked = picked === index;
  const background = isPicked ? P.accentSoft : P.card;
  const textColor = isPicked ? P.accent : P.text;

  return (
    <Pressable
      onPress={() => onPress(index)}
      disabled={revealed}
      style={[styles.option, { backgroundColor: background }]}
      accessibilityRole="button"
      accessibilityState={{ disabled: revealed, selected: picked === index }}
      accessibilityLabel={`Вариант ${letter}: ${text}`}
    >
      <View style={styles.optionInnerLight} pointerEvents="none" />
      <View style={[styles.optionLetter, isPicked && { backgroundColor: P.accent }]}>
        <Text style={[styles.optionLetterText, isPicked && { color: P.accentText }]}>{letter}</Text>
      </View>
      <Text style={[styles.optionText, { color: textColor }]}>{text}</Text>
      {isPicked ? <Text style={styles.optionMark}>✓</Text> : null}
    </Pressable>
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
          чтобы банк слов ниже не прыгал по мере сборки. */}
      <View style={styles.assembled}>
        {collected.length === 0 ? (
          <Text style={styles.assembledPlaceholder}>Собирай слова снизу…</Text>
        ) : (
          collected.map((word, slotIndex) => (
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
          ))
        )}
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
  content: { paddingHorizontal: 16, gap: 14 },

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
  questionPrompt: { ...type.body, color: P.muted },
  questionPhrase: { fontSize: 28, fontWeight: '900', color: P.text, marginTop: 10, letterSpacing: -0.6 },

  options: { gap: 10 },
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
  feedbackSlot: { minHeight: 92 },
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
  assembledPlaceholder: { ...type.body, color: P.ghost },
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
