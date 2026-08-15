import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from '../components/SafeLinearGradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { projectRequiredTaskStars } from '../modules/learning-v2/contracts/course_economy';
import type { LearningV2IntroQuestionTaskBinding } from '../modules/learning-v2/content/generator_session_contract';
import type { RequiredSessionTaskCompletionInputV3 } from '../modules/learning-v2/progress/required_session_completion_envelope';
import { useLang } from '../components/LangContext';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

type IntroCheckResult = 'idle' | 'wrong' | 'correct';

export type LearningV2SessionIntroCheckProps = Readonly<{
  bindings: readonly [
    LearningV2IntroQuestionTaskBinding,
    LearningV2IntroQuestionTaskBinding,
    LearningV2IntroQuestionTaskBinding,
  ];
  displayedStars: number;
  onAward: (taskCardId: string, award: 1 | 2 | 3) => void;
  onComplete: (results: readonly RequiredSessionTaskCompletionInputV3[]) => void;
  onBack: () => void;
}>;

const starWord = (value: number) => value === 1 ? 'звезда' : value >= 2 && value <= 4 ? 'звезды' : 'звёзд';

/**
 * Three generator-owned comprehension checks. They intentionally consume the
 * first three canonical task IDs, so the final completion envelope remains an
 * exact 12-task record and still contains no answer text.
 */
export default function LearningV2SessionIntroCheck({
  bindings,
  displayedStars,
  onAward,
  onComplete,
  onBack,
}: LearningV2SessionIntroCheckProps) {
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [result, setResult] = useState<IntroCheckResult>('idle');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [latestAward, setLatestAward] = useState<1 | 2 | 3>(3);
  const completionsRef = useRef(new Map<string, RequiredSessionTaskCompletionInputV3>());
  const transitionLatchRef = useRef(false);
  const rewardScale = useSharedValue(1);
  const answerShake = useSharedValue(0);
  const binding = bindings[questionIndex];
  const question = binding.question;
  const prompt = question.promptByLocale[lang];
  const choices = question.choicesByLocale[lang];
  const explanation = question.explanationByLocale[lang];
  const progress = (questionIndex + 1) / 3;
  const progressStyle = useMemo(() => ({ width: `${Math.round(progress * 100)}%` as `${number}%` }), [progress]);
  const rewardStyle = useAnimatedStyle(() => ({ transform: [{ scale: rewardScale.value }] }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: answerShake.value }] }));

  const runRewardMotion = useCallback(() => {
    if (reducedMotion) return;
    rewardScale.value = withSequence(
      withSpring(1.18, { damping: 8, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
  }, [reducedMotion, rewardScale]);

  const runWrongMotion = useCallback(() => {
    if (reducedMotion) return;
    answerShake.value = withSequence(
      withTiming(-8, { duration: 45, reduceMotion: ReduceMotion.System }),
      withTiming(7, { duration: 55, reduceMotion: ReduceMotion.System }),
      withTiming(-5, { duration: 55, reduceMotion: ReduceMotion.System }),
      withTiming(0, { duration: 60, reduceMotion: ReduceMotion.System }),
    );
  }, [answerShake, reducedMotion]);

  const completeOrAdvance = useCallback(() => {
    if (transitionLatchRef.current) return;
    transitionLatchRef.current = true;
    if (questionIndex === 2) {
      const results = bindings.map(({ taskCardId }) => completionsRef.current.get(taskCardId));
      if (results.some((entry) => !entry)) throw new Error('learning_v2_intro_check_incomplete');
      onComplete(results as RequiredSessionTaskCompletionInputV3[]);
      return;
    }
    setQuestionIndex((value) => value + 1);
    setResult('idle');
    setSelectedIndex(null);
    setAttempts(1);
    transitionLatchRef.current = false;
  }, [bindings, onComplete, questionIndex]);

  const choose = (choiceIndex: number) => {
    if (result === 'correct') return;
    void hapticTap();
    setSelectedIndex(choiceIndex);
    if (choiceIndex === question.correctChoiceIndex) {
      const completion = Object.freeze({
        taskId: binding.taskCardId,
        disposition: 'completed' as const,
        learnerAttempts: attempts,
        hintUsed: false,
      });
      completionsRef.current.set(binding.taskCardId, completion);
      const award = projectRequiredTaskStars(completion).stars as 1 | 2 | 3;
      setLatestAward(award);
      setResult('correct');
      onAward(binding.taskCardId, award);
      runRewardMotion();
      void hapticSuccess();
      return;
    }
    setAttempts((value) => value + 1);
    setResult('wrong');
    runWrongMotion();
    void hapticError();
  };

  const skip = () => {
    if (transitionLatchRef.current || result === 'correct') return;
    completionsRef.current.set(binding.taskCardId, Object.freeze({
      taskId: binding.taskCardId,
      disposition: 'skipped' as const,
      learnerAttempts: Math.max(0, attempts - 1),
      hintUsed: false,
    }));
    void hapticTap();
    completeOrAdvance();
  };

  return (
    <LinearGradient colors={['#10151D', '#151B26', '#0E1219']} style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть проверку интро"
          hitSlop={10}
          onPressIn={() => void hapticTap()}
          onPress={onBack}
          style={styles.iconButton}
        >
          <Ionicons name="close" size={24} color="#EAF0F6" />
        </Pressable>
        <View style={styles.progressTrack}><View style={[styles.progressFill, progressStyle]} /></View>
        <View accessible accessibilityLabel={`Вопрос ${questionIndex + 1} из 3`} style={styles.counter}>
          <Text style={styles.counterText}>{questionIndex + 1}/3</Text>
        </View>
        <Animated.View
          accessible
          accessibilityLabel={`Собрано ${displayedStars} ${starWord(displayedStars)} в этой сессии`}
          style={[styles.starCounter, rewardStyle]}
        >
          <Ionicons name="star" size={17} color="#FFD75A" />
          <Text style={styles.starCounterText}>{displayedStars}</Text>
        </Animated.View>
      </View>

      <View style={styles.content}>
        <Animated.View
          key={`intro-check-heading-${questionIndex}`}
          entering={reducedMotion ? FadeIn.duration(1) : FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
          style={styles.eyebrowRow}
        >
          <View style={styles.eyebrowIcon}><Ionicons name="sparkles" size={18} color="#F8C84E" /></View>
          <View style={styles.eyebrowCopy}>
            <Text style={styles.eyebrow}>ПРОВЕРКА ИНТРО</Text>
            <Text style={styles.eyebrowDetail}>3 вопроса · до 9 звёзд</Text>
          </View>
        </Animated.View>

        <Animated.View
          key={`intro-check-card-${questionIndex}`}
          entering={reducedMotion ? FadeIn.duration(1) : FadeInDown.duration(280).reduceMotion(ReduceMotion.System)}
          style={styles.questionCard}
        >
          <Text style={styles.questionNumber}>ВОПРОС {questionIndex + 1}</Text>
          <Text style={styles.prompt}>{prompt}</Text>
        </Animated.View>

        <Animated.View style={[styles.choices, shakeStyle]}>
          {choices.map((choice, index) => {
            const isCorrect = result === 'correct' && index === question.correctChoiceIndex;
            const isWrong = result === 'wrong' && index === selectedIndex;
            return (
              <Pressable
                key={`${question.questionId}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Ответ ${String.fromCharCode(65 + index)}: ${choice}`}
                accessibilityState={{ selected: selectedIndex === index, disabled: result === 'correct' }}
                disabled={result === 'correct'}
                onPress={() => choose(index)}
                style={({ pressed }) => [
                  styles.choice,
                  isCorrect && styles.choiceCorrect,
                  isWrong && styles.choiceWrong,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.choiceIndex, isCorrect && styles.choiceIndexCorrect, isWrong && styles.choiceIndexWrong]}>
                  {String.fromCharCode(65 + index)}
                </Text>
                <Text style={styles.choiceText}>{choice}</Text>
                {isCorrect && <Ionicons name="checkmark-circle" size={22} color="#8EE65A" />}
              </Pressable>
            );
          })}
        </Animated.View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
        {result === 'wrong' && (
          <Text accessibilityLiveRegion="polite" style={styles.feedbackWrong}>
            Почти. Перечитай формулу и попробуй ещё раз.
          </Text>
        )}
        {result === 'correct' && (
          <Animated.View
            key={`${binding.taskCardId}-${latestAward}`}
            entering={reducedMotion ? FadeIn.duration(1) : FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Верно. Плюс ${latestAward} ${starWord(latestAward)}. ${explanation}`}
            style={styles.rewardMoment}
          >
            <View importantForAccessibility="no-hide-descendants" style={styles.rewardStars}>
              {[1, 2, 3].map((position) => (
                <Ionicons key={position} name={position <= latestAward ? 'star' : 'star-outline'} size={25} color={position <= latestAward ? '#FFD75A' : '#596273'} />
              ))}
            </View>
            <View style={styles.rewardCopy}>
              <Text style={styles.feedbackCorrect}>Верно! +{latestAward} {starWord(latestAward)}</Text>
              <Text style={styles.explanation}>{explanation}</Text>
            </View>
          </Animated.View>
        )}
        {result !== 'correct' && (
          <View style={styles.assistRow}>
            <Text style={styles.attemptText}>Попытка {attempts}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Пропустить вопрос интро"
              accessibilityHint="Вопрос получит ноль звёзд, проверка продолжится"
              onPress={skip}
              style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
            >
              <Text style={styles.skipText}>Пропустить</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: result !== 'correct' }}
          disabled={result !== 'correct'}
          onPressIn={() => void hapticTap()}
          onPress={completeOrAdvance}
          style={({ pressed }) => [styles.cta, result !== 'correct' && styles.ctaDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{questionIndex === 2 ? 'Начать сессию' : 'Следующий вопрос'}</Text>
          <Ionicons name="arrow-forward" size={20} color="#07110A" />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10151D' },
  top: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 46, height: 46, borderRadius: 17, backgroundColor: '#202936', alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 8, borderRadius: 8, backgroundColor: '#27313F', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8, backgroundColor: '#F8C84E' },
  counter: { minWidth: 46, height: 34, borderRadius: 14, backgroundColor: '#202936', alignItems: 'center', justifyContent: 'center' },
  counterText: { color: '#E9EEF4', fontWeight: '900', fontSize: 12 },
  starCounter: { minWidth: 58, height: 38, borderRadius: 16, backgroundColor: '#2D2819', borderWidth: 1, borderColor: '#66562A', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  starCounterText: { color: '#FFF1B8', fontWeight: '900', fontSize: 15 },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 26 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 },
  eyebrowIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#F8C84E1F', borderWidth: 1, borderColor: '#F8C84E55', alignItems: 'center', justifyContent: 'center' },
  eyebrowCopy: { flex: 1 },
  eyebrow: { color: '#F8C84E', fontSize: 12, lineHeight: 16, letterSpacing: 1.4, fontWeight: '900' },
  eyebrowDetail: { color: '#7F8B99', fontSize: 12, lineHeight: 17, marginTop: 2, fontWeight: '700' },
  questionCard: { minHeight: 180, borderRadius: 28, backgroundColor: '#1B2430', borderWidth: 1, borderColor: '#39485A', padding: 24, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  questionNumber: { color: '#758395', fontSize: 11, lineHeight: 16, letterSpacing: 1.5, fontWeight: '900', textAlign: 'center' },
  prompt: { color: '#F8FAFC', fontSize: 25, lineHeight: 34, textAlign: 'center', fontWeight: '900', letterSpacing: -0.4, marginTop: 12 },
  choices: { gap: 11, marginTop: 18 },
  choice: { minHeight: 62, borderRadius: 20, backgroundColor: '#1A222D', borderWidth: 1, borderColor: '#344151', paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceCorrect: { backgroundColor: '#203A25', borderColor: '#8EE65A' },
  choiceWrong: { backgroundColor: '#3A2327', borderColor: '#FB7185' },
  choiceIndex: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#2A3543', color: '#BFC9D4', textAlign: 'center', textAlignVertical: 'center', lineHeight: 32, fontWeight: '900' },
  choiceIndexCorrect: { backgroundColor: '#8EE65A', color: '#07110A' },
  choiceIndexWrong: { backgroundColor: '#FB7185', color: '#07110A' },
  choiceText: { flex: 1, color: '#EDF2F7', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  bottom: { paddingHorizontal: 18, paddingTop: 12, backgroundColor: '#121821F2', borderTopWidth: 1, borderTopColor: '#273341' },
  feedbackWrong: { color: '#FF9B9B', fontWeight: '700', lineHeight: 20, marginBottom: 8 },
  rewardMoment: { minHeight: 72, borderRadius: 18, borderWidth: 1, borderColor: '#6B5726', backgroundColor: '#2B2619', paddingHorizontal: 13, paddingVertical: 9, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardStars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rewardCopy: { flex: 1 },
  feedbackCorrect: { color: '#FFF2B5', fontWeight: '900', fontSize: 15 },
  explanation: { color: '#C7B777', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 2 },
  assistRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attemptText: { color: '#7F8B99', fontSize: 12, fontWeight: '700' },
  skipButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  skipText: { color: '#AEB9C5', fontWeight: '800' },
  cta: { height: 58, borderRadius: 20, backgroundColor: '#8EE65A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ctaDisabled: { opacity: 0.35 },
  ctaText: { color: '#07110A', fontSize: 16, fontWeight: '900' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
