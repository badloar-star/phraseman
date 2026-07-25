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
import { T, motion, radius, type } from '../components/tournament/tournament_theme';
import { TournamentEdgeState } from '../components/tournament/TournamentEdgeState';
import { submitAnswers, useTournamentRoom, type PublicTask } from './tournament_client';
import { useLocalSearchParams } from 'expo-router';

const QUESTIONS_PER_ROUND = 5;
const SECONDS_PER_QUESTION = 15;
const LETTERS = ['A', 'B', 'C', 'D'] as const;

type Question = {
  /** taskId исходного задания — на него ссылается ответ. */
  taskId: string;
  kind: 'choice' | 'timeattack';
  prompt: string;
  phrase: string;
  options: string[];
  /**
   * Позиция подвопроса внутри timeattack.items; для choice всегда 0.
   * зачем: одно timeattack-задание — это НЕСКОЛЬКО экранных вопросов с общим
   * taskId, но сервер (verifyTournamentAnswer) ждёт один ответ на весь
   * набор — массив selectedIndexes по всем items сразу. Поэтому ответы
   * подвопросов одного taskId копятся отдельно и мержатся в один пункт
   * пачки только при отправке (см. buildAnswerRow).
   */
  itemIndex: number;
  /** Сколько всего подвопросов в этом задании — 1 для choice. */
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
      itemIndex: 0, itemCount: 1,
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
          options, itemIndex, itemCount: items.length,
        };
      })
      .filter((question): question is Question => question !== null);
  }
  // translate/voice рисуются другими раскладками — фаза 2.
  return [];
}

type Phase = 'intro' | 'question' | 'feedback';

export default function TournamentRoundScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = typeof params.roomId === 'string' ? params.roomId : null;

  const { room, status, secondsLeft: stateSecondsLeft, retry } = useTournamentRoom(roomId);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [picked, setPicked] = useState<number | null>(null);
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
   */
  const answersByKeyRef = useRef<Map<string, number | null>>(new Map());
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
   * choice → { selectedIndex }, timeattack → { selectedIndexes } — массив
   * по ВСЕМ подвопросам задания, даже если часть не была отвечена (null
   * остаётся null, сервер сам решит, что с ним делать при подсчёте).
   */
  const buildAnswerRows = useCallback((): Array<{ taskId: string; answer: unknown }> => {
    const byTask = new Map<string, { kind: Question['kind']; values: (number | null)[] }>();
    for (const q of questions) {
      const entry = byTask.get(q.taskId) ?? { kind: q.kind, values: [] };
      entry.values[q.itemIndex] = answersByKeyRef.current.get(`${q.taskId}:${q.itemIndex}`) ?? null;
      byTask.set(q.taskId, entry);
    }
    return Array.from(byTask.entries()).map(([taskId, entry]) => ({
      taskId,
      answer: entry.kind === 'choice'
        ? { selectedIndex: entry.values[0] }
        : { selectedIndexes: entry.values.map((value) => value ?? -1) },
    }));
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
    setPhase('question');
  }, [index, total, flushAnswers, roomId, router]);

  const answer = useCallback((optionIndex: number) => {
    if (phase !== 'question' || !question) return;

    // Мгновенный отклик: подсветка и вибрация СРАЗУ, до любой сети.
    setPicked(optionIndex);
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

  // Время вышло — пропуск, серия обнуляется.
  useEffect(() => {
    if (phase !== 'question' || secondsLeft > 0 || !question) return;
    setPicked(null);
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
    if (room.state === 'table' || room.state === 'final') {
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

  const answered = picked !== null;
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
    const modeLabel = questions[0]?.kind === 'timeattack' ? 'Тайм-атака' : 'Угадай перевод';
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
          <Text style={styles.questionPhrase}>{question.phrase}</Text>
        </Card>

        {/* Варианты */}
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

        {/* Фидбек — место зарезервировано, поэтому варианты не прыгают.
            зачем: правильность знает только сервер (ключи ответов клиенту не
            приходят), поэтому подтверждаем ПРИЁМ ответа, а результат игрок
            видит в таблице — это же и защита от подглядывания ответов. */}
        <View style={styles.feedbackSlot}>
          {phase === 'feedback' ? (
            <Animated.View entering={FadeIn.duration(160)}>
              <Card pad={18} style={{ backgroundColor: answered ? T.accentSoft : T.dangerSoft }}>
                <Text style={[styles.feedbackTitle, { color: answered ? T.accent : T.danger }]}>
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
  // Подсвечиваем ТОЛЬКО выбранный вариант: правильный ответ придёт с
  // сервером в таблице, показывать его здесь нечем и не нужно.
  const isPicked = picked === index;
  const background = isPicked ? T.accentSoft : T.card;
  const textColor = isPicked ? T.accent : T.text;

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
      <View style={[styles.optionLetter, isPicked && { backgroundColor: T.accent }]}>
        <Text style={[styles.optionLetterText, isPicked && { color: T.accentText }]}>{letter}</Text>
      </View>
      <Text style={[styles.optionText, { color: textColor }]}>{text}</Text>
      {isPicked ? <Text style={styles.optionMark}>✓</Text> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, gap: 14 },

  introRoot: { alignItems: 'center', justifyContent: 'center' },
  introRound: { fontSize: 44, fontWeight: '900', color: T.text, letterSpacing: -1 },
  introMode: { ...type.section, color: T.accent, marginTop: 10 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressLabel: { fontSize: 15, fontWeight: '800', color: T.text },
  progressLabelDim: { color: T.muted, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: T.elev2 },
  dotDone: { backgroundColor: T.accent, opacity: 0.5 },
  dotActive: { width: 18, backgroundColor: T.accent },
  multiplier: { marginLeft: 'auto', fontSize: 15, fontWeight: '800', color: T.muted },

  questionCard: { minHeight: 128, justifyContent: 'center' },
  questionPrompt: { ...type.body, color: T.muted },
  questionPhrase: { fontSize: 28, fontWeight: '900', color: T.text, marginTop: 10, letterSpacing: -0.6 },

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
    backgroundColor: T.elev2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: { fontSize: 15, fontWeight: '900', color: T.muted },
  optionText: { flex: 1, fontSize: 16, fontWeight: '700' },
  optionMark: { fontSize: 20, color: T.accent, fontWeight: '900' },

  // Высота под фидбек зарезервирована заранее — иначе список вариантов
  // дёргался бы вверх при каждом ответе.
  feedbackSlot: { minHeight: 92 },
  feedbackTitle: { fontSize: 20, fontWeight: '900' },
  feedbackSub: { ...type.body, color: T.muted, marginTop: 6 },

  scoreLine: {
    textAlign: 'center',
    ...type.body,
    color: T.ghost,
    fontVariant: ['tabular-nums'],
  },
});
