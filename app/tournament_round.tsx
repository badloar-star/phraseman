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

const QUESTIONS_PER_ROUND = 5;
const SECONDS_PER_QUESTION = 15;
const LETTERS = ['A', 'B', 'C', 'D'] as const;

type Question = {
  id: string;
  prompt: string;
  phrase: string;
  options: string[];
  correctIndex: number;
};

/** TODO(server): придёт из tournamentRooms/{roomId}.rounds[n].tasks. */
const DEMO_QUESTIONS: Question[] = [
  {
    id: 'q1', prompt: 'Что это значит?', phrase: '«Break a leg!»',
    options: ['Сломай ногу!', 'Ни пуха ни пера!', 'Беги быстрее!', 'Держись подальше!'],
    correctIndex: 1,
  },
  {
    id: 'q2', prompt: 'Что это значит?', phrase: '«Piece of cake»',
    options: ['Кусок торта', 'Проще простого', 'Дорогое удовольствие', 'Сладкая жизнь'],
    correctIndex: 1,
  },
  {
    id: 'q3', prompt: 'Что это значит?', phrase: '«Hit the books»',
    options: ['Сесть за учёбу', 'Бросить книги', 'Купить учебник', 'Закрыть тему'],
    correctIndex: 0,
  },
  {
    id: 'q4', prompt: 'Что это значит?', phrase: '«Under the weather»',
    options: ['Попасть под дождь', 'Приболеть', 'Опоздать', 'Замёрзнуть'],
    correctIndex: 1,
  },
  {
    id: 'q5', prompt: 'Что это значит?', phrase: '«Call it a day»',
    options: ['Назначить дату', 'Закончить на сегодня', 'Позвонить днём', 'Начать сначала'],
    correctIndex: 1,
  },
];

type Phase = 'intro' | 'question' | 'feedback';

export default function TournamentRoundScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();

  const [roundNo] = useState(1);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = DEMO_QUESTIONS[index];
  const multiplier = streak >= 4 ? 2 : streak >= 2 ? 1.5 : 1;

  // Интро раунда: режим + 3-2-1, затем первый вопрос.
  useEffect(() => {
    if (phase !== 'intro') return;
    const id = setTimeout(() => setPhase('question'), 1600);
    return () => clearTimeout(id);
  }, [phase]);

  // Таймер вопроса. Ноль = ответ не дан, идём дальше без очков.
  useEffect(() => {
    if (phase !== 'question') return;
    setSecondsLeft(SECONDS_PER_QUESTION);
    const id = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          clearInterval(id);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, index]);

  const goNext = useCallback(() => {
    if (index + 1 >= QUESTIONS_PER_ROUND) {
      router.replace('/tournament_table');
      return;
    }
    setIndex((value) => value + 1);
    setPicked(null);
    setPhase('question');
  }, [index, router]);

  const answer = useCallback((optionIndex: number) => {
    if (phase !== 'question') return;
    const correct = optionIndex === question.correctIndex;

    setPicked(optionIndex);
    setPhase('feedback');
    // Хаптик на ответе — управляющее действие, вибрация уместна.
    void Haptics.notificationAsync(
      correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    );

    if (correct) {
      // Скорость даёт до +40% к базе (§5 спеки).
      const speedBonus = Math.round((secondsLeft / SECONDS_PER_QUESTION) * 4);
      setScore((value) => value + Math.round((10 + speedBonus) * multiplier));
      setStreak((value) => value + 1);
    } else {
      setStreak(0);
    }

    advanceRef.current = setTimeout(goNext, motion.answerFeedbackMs);
  }, [phase, question.correctIndex, secondsLeft, multiplier, goNext]);

  // Время вышло — засчитываем как пропуск и идём дальше.
  useEffect(() => {
    if (phase !== 'question' || secondsLeft > 0) return;
    setPicked(null);
    setPhase('feedback');
    setStreak(0);
    advanceRef.current = setTimeout(goNext, motion.answerFeedbackMs);
  }, [phase, secondsLeft, goNext]);

  useEffect(() => () => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
  }, []);

  const isCorrect = picked !== null && picked === question.correctIndex;
  const dots = useMemo(() => Array.from({ length: QUESTIONS_PER_ROUND }, (_, i) => i), []);

  if (phase === 'intro') {
    return (
      <View style={[styles.root, styles.introRoot]}>
        <Animated.Text entering={ZoomIn.duration(320)} style={styles.introRound}>
          Раунд {roundNo}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(200)} style={styles.introMode}>
          Угадай перевод
        </Animated.Text>
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
          <Text style={styles.progressLabel}>
            Вопрос {index + 1} <Text style={styles.progressLabelDim}>из {QUESTIONS_PER_ROUND}</Text>
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
              correctIndex={question.correctIndex}
              revealed={phase === 'feedback'}
              onPress={answer}
            />
          ))}
        </View>

        {/* Фидбек — место зарезервировано, поэтому варианты не прыгают */}
        <View style={styles.feedbackSlot}>
          {phase === 'feedback' ? (
            <Animated.View entering={FadeIn.duration(160)}>
              <Card tone={isCorrect ? 'card' : 'card'} pad={18} style={{
                backgroundColor: isCorrect ? T.accentSoft : T.dangerSoft,
              }}>
                <Text style={[styles.feedbackTitle, { color: isCorrect ? T.accent : T.danger }]}>
                  {isCorrect ? 'Правильно!' : 'Почти!'}
                </Text>
                <Text style={styles.feedbackSub}>
                  {isCorrect
                    ? `+${Math.round(10 * multiplier)} очков · дальше вопрос ${Math.min(index + 2, QUESTIONS_PER_ROUND)}/${QUESTIONS_PER_ROUND}`
                    : question.options[question.correctIndex]}
                </Text>
              </Card>
            </Animated.View>
          ) : null}
        </View>

        <Text style={styles.scoreLine} allowFontScaling={false}>
          Ваши очки: {score}
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Вариант ответа ──────────────────────────────────────────────────────────

const OptionRow = memo(function OptionRow({
  letter, text, index, picked, correctIndex, revealed, onPress,
}: {
  letter: string;
  text: string;
  index: number;
  picked: number | null;
  correctIndex: number;
  revealed: boolean;
  onPress: (index: number) => void;
}) {
  const isCorrect = revealed && index === correctIndex;
  const isWrongPick = revealed && picked === index && index !== correctIndex;

  const background = isCorrect ? T.accentSoft : isWrongPick ? T.dangerSoft : T.card;
  const textColor = isCorrect ? T.accent : isWrongPick ? T.danger : T.text;

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
      <View style={[styles.optionLetter, isCorrect && { backgroundColor: T.accent }]}>
        <Text style={[styles.optionLetterText, isCorrect && { color: T.accentText }]}>{letter}</Text>
      </View>
      <Text style={[styles.optionText, { color: textColor }]}>{text}</Text>
      {isCorrect ? <Text style={styles.optionMark}>✓</Text> : null}
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
