import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import type { RequiredSessionTaskCompletionInputV3 } from '../modules/learning-v2/progress/required_session_completion_envelope';
import type {
  IntroLine,
  IntroTextPart,
  LessonIntroScreen,
} from './lesson_data_types';
import {
  plainIntroText,
  richIntroLines,
  richSubtitle,
  richTitle,
} from './lesson_intro_rich';

type IntroVisual = Readonly<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: string;
  accentSoft: string;
  glow: string;
}>;

const VISUALS: readonly IntroVisual[] = Object.freeze([
  Object.freeze({
    icon: 'sparkles-outline',
    accent: '#72D7FF',
    accentSoft: '#153344',
    glow: '#72D7FF2E',
  }),
  Object.freeze({
    icon: 'git-branch-outline',
    accent: '#B8A7FF',
    accentSoft: '#292344',
    glow: '#9C86FF30',
  }),
  Object.freeze({
    icon: 'flash-outline',
    accent: '#CFFF45',
    accentSoft: '#2C3619',
    glow: '#CFFF4530',
  }),
]);

const TONE_COLORS: Readonly<
  Record<NonNullable<IntroTextPart['tone']>, string>
> = Object.freeze({
  normal: '#EAF0F6',
  muted: '#9AA7B5',
  strong: '#FFFFFF',
  accent: '#72D7FF',
  success: '#B9F67C',
  danger: '#FF9EAD',
  warning: '#FFD276',
  formula: '#C8BBFF',
  code: '#A8E7FF',
});

const lineText = (line: IntroLine): string =>
  line.parts?.map((part) => part.text).join('') ?? line.text ?? '';

const stringsFor = (lang: Lang) => ({
  close: triLang(lang, {
    ru: 'Закрыть интро',
    uk: 'Закрити вступ',
    es: 'Cerrar introducción',
    'pt-BR': 'Fechar introdução',
    vi: 'Đóng phần giới thiệu',
    id: 'Tutup pengantar',
    tr: 'Girişi kapat',
    pl: 'Zamknij wprowadzenie',
  }),
  session: triLang(lang, {
    ru: 'Интро сессии',
    uk: 'Вступ до сесії',
    es: 'Introducción de sesión',
    'pt-BR': 'Introdução da sessão',
    vi: 'Giới thiệu phiên học',
    id: 'Pengantar sesi',
    tr: 'Oturum girişi',
    pl: 'Wprowadzenie do sesji',
  }),
  next: triLang(lang, {
    ru: 'Дальше',
    uk: 'Далі',
    es: 'Continuar',
    'pt-BR': 'Continuar',
    vi: 'Tiếp tục',
    id: 'Lanjut',
    tr: 'Devam',
    pl: 'Dalej',
  }),
  startPractice: triLang(lang, {
    ru: 'Начать практику',
    uk: 'Почати практику',
    es: 'Empezar práctica',
    'pt-BR': 'Começar prática',
    vi: 'Bắt đầu luyện tập',
    id: 'Mulai latihan',
    tr: 'Pratiğe başla',
    pl: 'Zacznij ćwiczenie',
  }),
  answerFirst: triLang(lang, {
    ru: 'Сначала ответь на вопрос',
    uk: 'Спочатку дай відповідь',
    es: 'Responde primero',
    'pt-BR': 'Responda primeiro',
    vi: 'Hãy trả lời trước',
    id: 'Jawab dulu',
    tr: 'Önce cevapla',
    pl: 'Najpierw odpowiedz',
  }),
  correct: triLang(lang, {
    ru: 'Верно',
    uk: 'Правильно',
    es: 'Correcto',
    'pt-BR': 'Correto',
    vi: 'Đúng',
    id: 'Benar',
    tr: 'Doğru',
    pl: 'Dobrze',
  }),
  stageLabels: [
    triLang(lang, {
      ru: 'СМЫСЛ',
      uk: 'СЕНС',
      es: 'IDEA',
      'pt-BR': 'IDEIA',
      vi: 'Ý NGHĨA',
      id: 'MAKNA',
      tr: 'ANLAM',
      pl: 'SENS',
    }),
    triLang(lang, {
      ru: 'СХЕМА',
      uk: 'СХЕМА',
      es: 'ESQUEMA',
      'pt-BR': 'ESQUEMA',
      vi: 'CẤU TRÚC',
      id: 'POLA',
      tr: 'ŞEMA',
      pl: 'SCHEMAT',
    }),
    triLang(lang, {
      ru: 'ПРИМЕНЕНИЕ',
      uk: 'ЗАСТОСУВАННЯ',
      es: 'APLICACIÓN',
      'pt-BR': 'APLICAÇÃO',
      vi: 'ÁP DỤNG',
      id: 'PENERAPAN',
      tr: 'UYGULAMA',
      pl: 'ZASTOSOWANIE',
    }),
  ] as const,
});

function RichLine({
  line,
  accent,
}: Readonly<{ line: IntroLine; accent: string }>) {
  if (line.type === 'spacer') return <View style={styles.spacer} />;
  const text = lineText(line).trim();
  if (!text) return null;

  const formula = line.type === 'formula';
  const danger = line.type === 'wrong';
  const success = line.type === 'correct';
  const featured =
    formula ||
    danger ||
    success ||
    line.type === 'tip' ||
    line.type === 'example';
  const icon: React.ComponentProps<typeof Ionicons>['name'] = danger
    ? 'close-circle-outline'
    : success
      ? 'checkmark-circle-outline'
      : formula
        ? 'code-slash-outline'
        : line.type === 'tip'
          ? 'bulb-outline'
          : 'chatbubble-ellipses-outline';
  const featureColor = danger ? '#FF9EAD' : success ? '#B9F67C' : accent;

  return (
    <View
      style={[
        styles.line,
        featured && styles.featuredLine,
        featured && { borderColor: `${featureColor}42` },
      ]}
    >
      {featured && (
        <View
          style={[styles.lineIcon, { backgroundColor: `${featureColor}18` }]}
        >
          <Ionicons name={icon} size={18} color={featureColor} />
        </View>
      )}
      <Text style={[styles.lineText, formula && styles.formulaText]}>
        {line.parts?.length
          ? line.parts.map((part, index) => (
              <Text
                key={`${part.text}-${index}`}
                style={{
                  color: part.tone ? TONE_COLORS[part.tone] : '#EAF0F6',
                  fontWeight:
                    part.tone === 'strong' ||
                    part.tone === 'formula' ||
                    part.tone === 'code'
                      ? '900'
                      : '700',
                }}
              >
                {part.text}
              </Text>
            ))
          : text}
      </Text>
    </View>
  );
}

export default function LearningV2SessionIntro({
  introScreens,
  lessonId,
  sessionOrdinal,
  taskIds,
  onComplete,
  onBack,
}: Readonly<{
  introScreens: readonly LessonIntroScreen[];
  lessonId: number;
  sessionOrdinal: number;
  taskIds: readonly [string, string, string];
  onComplete: (
    completions: readonly RequiredSessionTaskCompletionInputV3[],
  ) => void;
  onBack?: () => void;
}>) {
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [selectedCorrectIndex, setSelectedCorrectIndex] = useState<
    number | null
  >(null);
  const [attempts, setAttempts] = useState(1);
  const [wrongCount, setWrongCount] = useState(0);
  const completionsRef = useRef(
    new Map<string, RequiredSessionTaskCompletionInputV3>(),
  );
  // A release may finish hydrating while the learner reads page two. The
  // three intro answers must nevertheless stay on the exact task identity set
  // selected at the intro boundary.
  const stableTaskIdsRef = useRef(taskIds);
  const stableTaskIds = stableTaskIdsRef.current;
  const answerShake = useSharedValue(0);
  const copy = useMemo(() => stringsFor(lang), [lang]);
  const screens = introScreens.length > 0 ? introScreens : [];
  const safeIndex = Math.min(index, Math.max(0, screens.length - 1));
  const screen = screens[safeIndex];
  const visualIndex =
    screen?.kind === 'formula'
      ? 1
      : screen?.kind === 'practice'
        ? 2
        : safeIndex % VISUALS.length;
  const visual = VISUALS[visualIndex] ?? VISUALS[0]!;
  const stageLabel = copy.stageLabels[visualIndex] ?? copy.stageLabels[0];
  const title = screen
    ? (richTitle(screen, lang, studyTarget) ?? stageLabel)
    : '';
  const subtitle = screen
    ? (richSubtitle(screen, lang, studyTarget) ?? '')
    : '';
  const localizedLines = screen
    ? richIntroLines(screen, lang, studyTarget)
    : [];
  const lines = screen
    ? localizedLines.length > 0
      ? localizedLines
      : [
          {
            type: 'text' as const,
            text: plainIntroText(screen, lang, studyTarget) ?? '',
          },
        ]
    : [];
  const isLast = safeIndex === screens.length - 1;
  const compact = height < 720;
  const question = screen?.learningV2EmbeddedQuestion;
  const questionPrompt = question?.promptByLocale[lang] ?? '';
  const questionChoices = question?.choicesByLocale[lang] ?? [];
  const questionExplanation = question?.explanationByLocale[lang] ?? '';
  const answered = selectedCorrectIndex !== null;
  const answerShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: answerShake.value }],
  }));

  useEffect(() => {
    if (screens.length === 0) onComplete([]);
  }, [onComplete, screens.length]);

  if (!screen) {
    return null;
  }

  const chooseAnswer = (choiceIndex: number) => {
    if (!question || answered) return;
    if (choiceIndex === question.correctChoiceIndex) {
      const taskId = stableTaskIds[question.taskSlot - 1];
      completionsRef.current.set(taskId, {
        taskId,
        disposition: 'completed',
        learnerAttempts: attempts,
        hintUsed: false,
      });
      setSelectedCorrectIndex(choiceIndex);
      void hapticSuccess();
      return;
    }
    setWrongCount((value) => value + 1);
    setAttempts((value) => value + 1);
    void hapticError();
    if (reducedMotion) return;
    answerShake.value = withSequence(
      withTiming(-7, { duration: 45, reduceMotion: ReduceMotion.System }),
      withTiming(6, { duration: 55, reduceMotion: ReduceMotion.System }),
      withTiming(-4, { duration: 55, reduceMotion: ReduceMotion.System }),
      withTiming(0, { duration: 45, reduceMotion: ReduceMotion.System }),
    );
  };

  const advance = () => {
    if (!question || !answered) return;
    void hapticTap();
    if (isLast) {
      onComplete(
        stableTaskIds
          .map((taskId) => completionsRef.current.get(taskId))
          .filter(
            (entry): entry is RequiredSessionTaskCompletionInputV3 =>
              entry !== undefined,
          ),
      );
      return;
    }
    setSelectedCorrectIndex(null);
    setAttempts(1);
    setWrongCount(0);
    setIndex((value) => Math.min(value + 1, screens.length - 1));
  };

  return (
    <LinearGradient
      colors={['#0B1017', '#111926', '#0A0E15']}
      style={styles.screen}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            hitSlop={10}
            onPressIn={() => void hapticTap()}
            onPress={onBack}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="close" size={22} color="#EAF0F6" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>LEARNING V2</Text>
            <Text style={styles.headerTitle}>
              {copy.session} {sessionOrdinal}
            </Text>
          </View>
          <View
            accessibilityLabel={`${safeIndex + 1} из ${screens.length}`}
            style={styles.pageCounter}
          >
            <Text style={styles.pageCounterText}>{safeIndex + 1}</Text>
            <Text style={styles.pageCounterMuted}>/{screens.length}</Text>
          </View>
        </View>

        <View
          style={styles.progressRow}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 1,
            max: screens.length,
            now: safeIndex + 1,
          }}
        >
          {screens.map((entry, progressIndex) => (
            <View
              key={entry.screenId ?? `${lessonId}-${progressIndex}`}
              style={[
                styles.progressSegment,
                progressIndex <= safeIndex && {
                  backgroundColor: visual.accent,
                },
              ]}
            />
          ))}
        </View>

        <Animated.View
          key={`intro-v2-${safeIndex}`}
          entering={
            reducedMotion
              ? FadeIn.duration(1)
              : FadeInDown.duration(300).reduceMotion(ReduceMotion.System)
          }
          style={styles.slide}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              compact && styles.scrollContentCompact,
              { paddingBottom: 94 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.hero,
                compact && styles.heroCompact,
                {
                  backgroundColor: visual.accentSoft,
                  borderColor: `${visual.accent}4A`,
                },
              ]}
            >
              <View
                style={[styles.heroGlow, { backgroundColor: visual.glow }]}
              />
              <View
                style={[
                  styles.orbitOuter,
                  { borderColor: `${visual.accent}35` },
                ]}
              >
                <View
                  style={[
                    styles.orbitInner,
                    { borderColor: `${visual.accent}56` },
                  ]}
                >
                  <LinearGradient
                    colors={[visual.accent, '#7C8BFF']}
                    style={styles.heroIcon}
                  >
                    <Ionicons
                      name={visual.icon}
                      size={compact ? 28 : 34}
                      color="#07110A"
                    />
                  </LinearGradient>
                </View>
              </View>
              <View
                style={[
                  styles.heroLabel,
                  { backgroundColor: `${visual.accent}1E` },
                ]}
              >
                <Text style={[styles.heroLabelText, { color: visual.accent }]}>
                  {stageLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

            <View style={styles.knowledgePanel}>
              {lines.map((line, lineIndex) => (
                <RichLine
                  key={`${safeIndex}-${lineIndex}-${lineText(line)}`}
                  line={line}
                  accent={visual.accent}
                />
              ))}
            </View>

            {question && (
              <Animated.View style={[styles.questionPanel, answerShakeStyle]}>
                <View style={styles.questionEyebrowRow}>
                  <View
                    style={[
                      styles.questionNumber,
                      { backgroundColor: `${visual.accent}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.questionNumberText,
                        { color: visual.accent },
                      ]}
                    >
                      {question.taskSlot}
                    </Text>
                  </View>
                  <Text style={styles.questionEyebrow}>{copy.answerFirst}</Text>
                </View>
                <Text style={styles.questionPrompt}>{questionPrompt}</Text>
                <View style={styles.answerList}>
                  {questionChoices.map((choice, choiceIndex) => {
                    const correct = selectedCorrectIndex === choiceIndex;
                    return (
                      <Pressable
                        key={`${question.questionId}-${choiceIndex}`}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: correct,
                          disabled: answered,
                        }}
                        disabled={answered}
                        onPress={() => chooseAnswer(choiceIndex)}
                        style={({ pressed }) => [
                          styles.answerChoice,
                          correct && styles.answerChoiceCorrect,
                          pressed && !answered && styles.answerChoicePressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.answerChoiceText,
                            correct && styles.answerChoiceTextCorrect,
                          ]}
                        >
                          {choice}
                        </Text>
                        {correct && (
                          <Ionicons
                            name="checkmark-circle"
                            size={21}
                            color="#07110A"
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                {answered && (
                  <Text style={styles.correctMessage}>{copy.correct}</Text>
                )}
                {!answered && wrongCount >= 2 && (
                  <Text style={styles.explanation}>{questionExplanation}</Text>
                )}
              </Animated.View>
            )}
          </ScrollView>
        </Animated.View>

        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 6) },
          ]}
        >
          <Pressable
            testID="learning-v2-intro-next"
            accessibilityRole="button"
            accessibilityLabel={isLast ? copy.startPractice : copy.next}
            accessibilityState={{ disabled: !answered }}
            disabled={!answered}
            onPress={advance}
            style={({ pressed }) => [
              styles.cta,
              !answered && styles.ctaDisabled,
              pressed && answered && styles.pressed,
            ]}
          >
            <Text style={[styles.ctaText, !answered && styles.ctaTextDisabled]}>
              {isLast ? copy.startPractice : copy.next}
            </Text>
            <Ionicons
              name={isLast ? 'play' : 'arrow-forward'}
              size={20}
              color={answered ? '#07110A' : '#66717F'}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B1017' },
  safe: { flex: 1, overflow: 'hidden' },
  header: {
    minHeight: 62,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: '#1A2330',
    borderWidth: 1,
    borderColor: '#2C3949',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  headerEyebrow: {
    color: '#7E8B9A',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  headerTitle: {
    color: '#EDF3F8',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
    marginTop: 1,
  },
  pageCounter: {
    minWidth: 52,
    height: 38,
    paddingHorizontal: 11,
    borderRadius: 15,
    backgroundColor: '#1A2330',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageCounterText: { color: '#F6F9FB', fontSize: 14, fontWeight: '900' },
  pageCounterMuted: { color: '#758293', fontSize: 12, fontWeight: '800' },
  progressRow: {
    height: 5,
    marginHorizontal: 18,
    marginTop: 6,
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#263140',
  },
  slide: { flex: 1, minHeight: 0 },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 24 },
  scrollContentCompact: { paddingTop: 14 },
  hero: {
    height: 196,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCompact: { height: 150 },
  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  orbitOuter: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B111A99',
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
  },
  heroLabel: {
    position: 'absolute',
    bottom: 15,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  heroLabelText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  title: {
    color: '#F7FAFC',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: 24,
  },
  subtitle: {
    color: '#9DAABA',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    marginTop: 8,
  },
  knowledgePanel: { marginTop: 20, gap: 10 },
  line: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  featuredLine: {
    minHeight: 58,
    borderRadius: 19,
    borderWidth: 1,
    backgroundColor: '#151E29',
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  lineIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  lineText: {
    flex: 1,
    color: '#EAF0F6',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  formulaText: { fontSize: 17, lineHeight: 25, letterSpacing: 0.1 },
  spacer: { height: 4 },
  questionPanel: {
    marginTop: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#334152',
    backgroundColor: '#111923',
    padding: 15,
  },
  questionEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: { fontSize: 12, fontWeight: '900' },
  questionEyebrow: {
    color: '#9BA9B8',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  questionPrompt: {
    color: '#F4F7FA',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '900',
    marginTop: 13,
  },
  answerList: { marginTop: 13, gap: 9 },
  answerChoice: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#354355',
    backgroundColor: '#1A2430',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  answerChoicePressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  answerChoiceCorrect: { backgroundColor: '#CFFF45', borderColor: '#CFFF45' },
  answerChoiceText: {
    flex: 1,
    color: '#ECF2F7',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  answerChoiceTextCorrect: { color: '#07110A' },
  correctMessage: {
    color: '#CFFF45',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '900',
    marginTop: 12,
  },
  explanation: {
    color: '#CBD5DF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginTop: 12,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#202A37',
    backgroundColor: '#0D131BF2',
  },
  cta: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: '#CFFF45',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaDisabled: { backgroundColor: '#202A35' },
  ctaText: {
    color: '#07110A',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  ctaTextDisabled: { color: '#66717F' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});
