import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useStableSafeAreaInsets } from "./stable_safe_area_metrics";
import DuoPressable from "../components/DuoPressable";
import { useLang } from "../components/LangContext";
import PressableHybrid from "../components/PressableHybrid";
import { LinearGradient } from "../components/SafeLinearGradient";
import { useStudyTarget } from "../components/StudyTargetContext";
import { useTheme } from "../components/ThemeContext";
import { triLang, type Lang } from "../constants/i18n";
import ReportErrorButton from "../components/ReportErrorButton";
import { CHK, LUM } from "../constants/motionHybrid";
import { hapticError, hapticSuccess } from "../hooks/use-haptics";
import type { RequiredSessionTaskCompletionInputV3 } from "../modules/learning-v2/progress/required_session_completion_envelope";
import {
  introCtaTextColor,
  introTargetTextColor,
} from "./learning_v2_intro_theme";
import {
  introPartRole,
  type IntroPartRole,
} from "./learning_v2_intro_semantic_bridge";
import type {
  IntroLine,
  IntroTextPart,
  LessonIntroScreen,
} from "./lesson_data_types";
import {
  plainIntroText,
  richIntroLines,
  richSubtitle,
  richTitle,
} from "../components/lesson_intro_rich";
import { splitLearningV2IntroTitleByTargetsV1 } from "./learning_v2_intro_title_semantics_v1";

const lineText = (line: IntroLine): string =>
  line.parts?.map((part) => part.text).join("") ?? line.text ?? "";

const stringsFor = (lang: Lang) => ({
  close: triLang(lang, {
    ru: "Закрыть интро",
    uk: "Закрити вступ",
    en: "Close intro",
    es: "Cerrar introducción",
    "pt-BR": "Fechar introdução",
    vi: "Đóng phần giới thiệu",
    id: "Tutup pengantar",
    tr: "Girişi kapat",
    pl: "Zamknij wprowadzenie",
  }),
  next: triLang(lang, {
    ru: "Дальше",
    uk: "Далі",
    en: "Next",
    es: "Continuar",
    "pt-BR": "Continuar",
    vi: "Tiếp tục",
    id: "Lanjut",
    tr: "Devam",
    pl: "Dalej",
  }),
  startPractice: triLang(lang, {
    ru: "Начать практику",
    uk: "Почати практику",
    en: "Start practice",
    es: "Empezar práctica",
    "pt-BR": "Começar prática",
    vi: "Bắt đầu luyện tập",
    id: "Mulai latihan",
    tr: "Pratiğe başla",
    pl: "Zacznij ćwiczenie",
  }),
  answerFirst: triLang(lang, {
    ru: "Проверь себя",
    uk: "Перевір себе",
    en: "Test yourself",
    es: "Compruébalo",
    "pt-BR": "Confira",
    vi: "Tự kiểm tra",
    id: "Periksa pemahamanmu",
    tr: "Kendini kontrol et",
    pl: "Sprawdź się",
  }),
  correct: triLang(lang, {
    ru: "Верно",
    uk: "Правильно",
    en: "Correct",
    es: "Correcto",
    "pt-BR": "Correto",
    vi: "Đúng",
    id: "Benar",
    tr: "Doğru",
    pl: "Dobrze",
  }),
  correctExample: triLang(lang, {
    ru: "правильный пример",
    uk: "правильний приклад",
    en: "correct example",
    es: "ejemplo correcto",
    "pt-BR": "exemplo correto",
    vi: "ví dụ đúng",
    id: "contoh benar",
    tr: "doğru örnek",
    pl: "poprawny przykład",
  }),
  wrongExample: triLang(lang, {
    ru: "неверный пример",
    uk: "неправильний приклад",
    en: "incorrect example",
    es: "ejemplo incorrecto",
    "pt-BR": "exemplo incorreto",
    vi: "ví dụ sai",
    id: "contoh salah",
    tr: "yanlış örnek",
    pl: "błędny przykład",
  }),
  progress: (current: number, total: number) =>
    triLang(lang, {
      ru: `${current} из ${total}`,
      uk: `${current} з ${total}`,
      en: `${current} of ${total}`,
      es: `${current} de ${total}`,
      "pt-BR": `${current} de ${total}`,
      vi: `${current} trên ${total}`,
      id: `${current} dari ${total}`,
      tr: `${current} / ${total}`,
      pl: `${current} z ${total}`,
    }),
  stageLabels: [
    triLang(lang, {
      ru: "СМЫСЛ",
      uk: "СЕНС",
      en: "MEANING",
      es: "IDEA",
      "pt-BR": "IDEIA",
      vi: "Ý NGHĨA",
      id: "MAKNA",
      tr: "ANLAM",
      pl: "SENS",
    }),
    triLang(lang, {
      ru: "СХЕМА",
      uk: "СХЕМА",
      en: "PATTERN",
      es: "ESQUEMA",
      "pt-BR": "ESQUEMA",
      vi: "CẤU TRÚC",
      id: "POLA",
      tr: "ŞEMA",
      pl: "SCHEMAT",
    }),
    triLang(lang, {
      ru: "ЛОВУШКА",
      uk: "ПАСТКА",
      en: "TRAP",
      es: "TRAMPA",
      "pt-BR": "ARMADILHA",
      vi: "BẪY",
      id: "JEBAKAN",
      tr: "TUZAK",
      pl: "PUŁAPKA",
    }),
  ] as const,
});

/**
 * Цвет и вес куска по его роли.
 *
 * зачем: до 2026-08-23 экран красил только по полю `semantic`, которого в
 * контенте нет ни разу — 61,5% разметки доезжало серым текстом. Теперь роль
 * приходит из моста над `tone`, а палитра берётся из токенов темы (не хардкод),
 * иначе цвета ломались бы на светлой теме sagePorcelain.
 */
function rolePresentation(
  role: IntroPartRole,
  theme: ReturnType<typeof useTheme>["theme"],
  targetColor: string,
): { color: string; fontWeight: "400" | "700"; strike: boolean; size: number } {
  switch (role) {
    case "target":
      return { color: targetColor, fontWeight: "700", strike: false, size: 16 };
    case "targetWrong":
      return { color: theme.wrong, fontWeight: "700", strike: true, size: 16 };
    case "gloss":
      return { color: theme.textMuted, fontWeight: "400", strike: false, size: 15 };
    case "markerCorrect":
      return { color: theme.correct, fontWeight: "700", strike: false, size: 15 };
    case "markerWarning":
      return { color: theme.gold, fontWeight: "700", strike: false, size: 15 };
    case "formula":
      return { color: theme.textSecond, fontWeight: "700", strike: false, size: 15 };
    case "emphasis":
      return { color: theme.textOnCard, fontWeight: "700", strike: false, size: 15 };
    case "plain":
    default:
      return { color: theme.textOnCard, fontWeight: "400", strike: false, size: 15 };
  }
}

function IntroReaderParagraph({
  lineIndex,
  parts,
  targetColor,
  theme,
  nativeScriptIsCyrillic,
  correctExampleLabel,
  wrongExampleLabel,
}: Readonly<{
  lineIndex: number;
  parts: readonly IntroTextPart[];
  targetColor: string;
  theme: ReturnType<typeof useTheme>["theme"];
  nativeScriptIsCyrillic: boolean;
  correctExampleLabel: string;
  wrongExampleLabel: string;
}>) {
  return (
    <Text
      testID={
        lineIndex === 0
          ? "learning-v2-intro-reader-paragraph"
          : `learning-v2-intro-reader-paragraph-${lineIndex}`
      }
      style={[
        styles.readerParagraph,
        { color: theme.textOnCard },
      ]}
    >
      {parts.map((part, index) => {
        const role = introPartRole(part, nativeScriptIsCyrillic);
        const look = rolePresentation(role, theme, targetColor);
        return (
          <Text
            key={`${index}-${part.text}`}
            testID={`learning-v2-intro-part-${lineIndex}-${index}`}
            accessibilityLabel={
              role === "targetWrong"
                ? `${part.text}, ${wrongExampleLabel}`
                : role === "target"
                  ? `${part.text}, ${correctExampleLabel}`
                  : part.text
            }
            style={{
              color: look.color,
              fontSize: look.size,
              fontWeight: look.fontWeight,
              textDecorationLine: look.strike ? "line-through" : "none",
            }}
          >
            {part.text}
          </Text>
        );
      })}
    </Text>
  );
}

function IntroAnswerShake({
  nudgeToken,
  reducedMotion,
  children,
}: Readonly<{
  nudgeToken: number;
  reducedMotion: boolean;
  children: React.ReactNode;
}>) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (nudgeToken === 0 || reducedMotion) return;
    x.value = withSequence(
      withTiming(-7, { duration: 42 }),
      withTiming(7, { duration: 54 }),
      withTiming(-4, { duration: 46 }),
      withTiming(0, { duration: 42 }),
    );
  }, [nudgeToken, reducedMotion, x]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function LearningV2SessionIntro({
  introScreens,
  lessonId,
  sessionOrdinal: _sessionOrdinal,
  taskIds,
  evaluateChoice,
  resolveSecondWrongExplanation,
  onComplete,
  onBack,
  headerAccessory,
}: Readonly<{
  introScreens: readonly LessonIntroScreen[];
  lessonId: number;
  sessionOrdinal: number;
  taskIds: readonly [string, string, string];
  evaluateChoice?: (
    input: Readonly<{
      interactionId: string;
      choiceText: string;
      choiceIndex: number;
    }>,
  ) => "correct" | "wrong" | "technical_invalid";
  resolveSecondWrongExplanation?: (interactionId: string) => string | null;
  onComplete: (
    completions: readonly RequiredSessionTaskCompletionInputV3[],
  ) => void;
  onBack?: () => void;
  /** Header-owned status content must participate in layout, never float over it. */
  headerAccessory?: React.ReactNode;
}>) {
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, themeMode } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [selectedCorrectIndex, setSelectedCorrectIndex] = useState<
    number | null
  >(null);
  const [attempts, setAttempts] = useState(1);
  const [wrongCount, setWrongCount] = useState(0);
  const [wrongChoiceNudge, setWrongChoiceNudge] = useState({
    choiceIndex: -1,
    token: 0,
  });
  const completionsRef = useRef(
    new Map<string, RequiredSessionTaskCompletionInputV3>(),
  );
  const stableTaskIdsRef = useRef(taskIds);
  const stableTaskIds = stableTaskIdsRef.current;
  const copy = useMemo(() => stringsFor(lang), [lang]);
  const screens = introScreens.length > 0 ? introScreens : [];
  const safeIndex = Math.min(index, Math.max(0, screens.length - 1));
  const screen = screens[safeIndex];
  const stageLabel = copy.stageLabels[safeIndex] ?? copy.stageLabels[0];
  const title = screen
    ? (richTitle(screen, lang, studyTarget) ?? stageLabel)
    : "";
  const subtitle = screen
    ? (richSubtitle(screen, lang, studyTarget) ?? "")
    : "";
  const localizedLines = screen
    ? richIntroLines(screen, lang, studyTarget)
    : [];
  const lines = screen
    ? localizedLines.length > 0
      ? localizedLines
      : [
          {
            type: "text" as const,
            parts: [
              {
                text: plainIntroText(screen, lang, studyTarget) ?? "",
                semantic: "explanation" as const,
              },
            ],
          },
        ]
    : [];
  const titleTargetFragments = lines.flatMap((line) =>
    (line.parts ?? [])
      .filter((part) => part.semantic === "targetCorrect")
      .map((part) => part.text),
  );
  const titleSegments = splitLearningV2IntroTitleByTargetsV1(
    title,
    titleTargetFragments,
  );
  const isLast = safeIndex === screens.length - 1;
  const compact = height < 720;
  // зачем: алфавитная развилка «латиница = изучаемый язык» верна только там, где
  // родной язык кириллический. Для es/pt-BR/vi/id/tr/pl родной сам на латинице.
  const nativeScriptIsCyrillic = lang === "ru" || lang === "uk";
  const question = screen?.learningV2EmbeddedQuestion;
  // зачем: встроенный вопрос — контент курса, английского source нет — сужаем
  // на RU, как остальные контентные фолбэки без en в проекте.
  const questionContentLang = lang === "en" ? "ru" : lang;
  const questionPrompt = question?.promptByLocale[questionContentLang] ?? "";
  const questionChoices = question?.choicesByLocale[questionContentLang] ?? [];
  const questionExplanation = question
    ? (resolveSecondWrongExplanation?.(question.questionId) ??
      question.explanationByLocale[questionContentLang] ??
      "")
    : "";
  const answered = selectedCorrectIndex !== null;
  const targetColor = introTargetTextColor(t, themeMode);
  const ctaTextColor = introCtaTextColor(t);

  useEffect(() => {
    if (screens.length === 0) onComplete([]);
  }, [onComplete, screens.length]);

  if (!screen) return null;

  const chooseAnswer = (choiceIndex: number) => {
    if (!question || answered) return;
    const choiceText = questionChoices[choiceIndex];
    const verdict = evaluateChoice
      ? choiceText === undefined
        ? "technical_invalid"
        : evaluateChoice({
            interactionId: question.questionId,
            choiceText,
            choiceIndex,
          })
      : choiceIndex === question.correctChoiceIndex
        ? "correct"
        : "wrong";
    if (verdict === "correct") {
      const taskId = stableTaskIds[question.taskSlot - 1];
      completionsRef.current.set(taskId, {
        taskId,
        disposition: "completed",
        learnerAttempts: attempts,
        hintUsed: false,
      });
      setSelectedCorrectIndex(choiceIndex);
      void hapticSuccess();
      return;
    }
    setWrongCount((value) => value + 1);
    setAttempts((value) => value + 1);
    setWrongChoiceNudge((current) => ({
      choiceIndex,
      token: current.token + 1,
    }));
    void hapticError();
  };

  const advance = () => {
    if (!question || !answered) return;
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
    setWrongChoiceNudge({ choiceIndex: -1, token: 0 });
    setIndex((value) => Math.min(value + 1, screens.length - 1));
  };

  return (
    <LinearGradient
      colors={[t.bgGradient[0], t.bgPrimary, t.bgGradient[1]]}
      style={[styles.screen, { backgroundColor: t.bgPrimary }]}
    >
      <SafeAreaView
        style={[styles.safe, { paddingTop: insets.top }]}
        edges={[]}
      >
        <View style={styles.header}>
          <PressableHybrid
            testID="learning-v2-intro-close"
            variant="icon"
            accessibilityLabel={copy.close}
            hitSlop={10}
            onPress={onBack}
            style={styles.closeButton}
            contentStyle={[
              styles.closeButtonFace,
              { backgroundColor: t.bgCard },
            ]}
          >
            <Ionicons name="close" size={22} color={t.textPrimary} />
          </PressableHybrid>

          <View style={styles.stageMeta}>
            <Text style={[styles.stageLabel, { color: targetColor }]}>
              {stageLabel}
            </Text>
            <Text
              accessibilityLabel={copy.progress(safeIndex + 1, screens.length)}
              style={[styles.pageCounter, { color: t.textMuted }]}
            >
              {safeIndex + 1} / {screens.length}
            </Text>
          </View>
          {headerAccessory ? (
            <View style={styles.headerAccessory}>{headerAccessory}</View>
          ) : null}
        </View>

        <View
          style={styles.progressRow}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: screens.length, now: safeIndex + 1 }}
        >
          {screens.map((entry, progressIndex) => (
            <View
              key={entry.screenId ?? `${lessonId}-${progressIndex}`}
              style={[
                styles.progressSegment,
                { backgroundColor: t.bgSurface2 },
                progressIndex <= safeIndex && { backgroundColor: targetColor },
              ]}
            />
          ))}
        </View>

        <Animated.View
          key={`intro-v2-${safeIndex}`}
          entering={
            reducedMotion
              ? undefined
              : FadeInDown.duration(LUM.contentMs).reduceMotion(
                  ReduceMotion.System,
                )
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
            <View style={styles.readerColumn}>
              <Text style={[styles.title, { color: t.textPrimary }]}>
                {titleSegments.map((segment, segmentIndex) => (
                  <Text
                    key={`${segmentIndex}-${segment.text}`}
                    style={
                      segment.isTarget
                        ? { color: targetColor, fontWeight: "900" }
                        : undefined
                    }
                  >
                    {segment.text}
                  </Text>
                ))}
              </Text>
              {!!subtitle && (
                <Text style={[styles.subtitle, { color: t.textMuted }]}>
                  {subtitle}
                </Text>
              )}

              <View style={styles.knowledgeFlow}>
                {lines.map((line, lineIndex) => {
                  const text = lineText(line);
                  if (line.type === "spacer") {
                    return <View key={`${lineIndex}-spacer`} style={styles.spacer} />;
                  }
                  if (!text.trim()) return null;
                  const parts = line.parts?.length
                    ? line.parts
                    : [{ text, semantic: "explanation" as const }];
                  return (
                    <IntroReaderParagraph
                      key={`${lineIndex}-${text}`}
                      lineIndex={lineIndex}
                      parts={parts}
                      targetColor={targetColor}
                      theme={t}
                      nativeScriptIsCyrillic={nativeScriptIsCyrillic}
                      correctExampleLabel={copy.correctExample}
                      wrongExampleLabel={copy.wrongExample}
                    />
                  );
                })}
              </View>

              {question && (
                <View style={styles.questionPanel}>
                  <View style={styles.questionEyebrowRow}>
                    <Text style={[styles.questionEyebrow, { color: targetColor }]}>
                      {copy.answerFirst}
                    </Text>
                    <Text style={[styles.questionNumber, { color: t.textMuted }]}>
                      {question.taskSlot} / 3
                    </Text>
                  </View>
                  <Text style={[styles.questionPrompt, { color: t.textOnCard }]}>
                    {questionPrompt}
                  </Text>
                  <View style={styles.answerList}>
                    {questionChoices.map((choice, choiceIndex) => {
                      const correct = selectedCorrectIndex === choiceIndex;
                      return (
                        <IntroAnswerShake
                          key={`${question.questionId}-${choiceIndex}`}
                          reducedMotion={reducedMotion}
                          nudgeToken={
                            wrongChoiceNudge.choiceIndex === choiceIndex
                              ? wrongChoiceNudge.token
                              : 0
                          }
                        >
                        <PressableHybrid
                          testID={`learning-v2-intro-answer-${choiceIndex}`}
                          variant="card"
                          accessibilityLabel={choice}
                          accessibilityState={{ selected: correct, disabled: answered }}
                          disabled={answered}
                          withHaptic={false}
                          onPress={() => chooseAnswer(choiceIndex)}
                          style={styles.answerChoiceTouch}
                          contentStyle={[
                            styles.answerChoice,
                            {
                              backgroundColor: correct ? t.correct : t.bgSurface2,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.answerChoiceText,
                              { color: correct ? t.correctText : t.textOnCard },
                            ]}
                          >
                            {choice}
                          </Text>
                          {correct && (
                            <Ionicons
                              name="checkmark-circle"
                              size={21}
                              color={t.correctText}
                            />
                          )}
                        </PressableHybrid>
                        </IntroAnswerShake>
                      );
                    })}
                  </View>
                  {answered && (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={[styles.correctMessage, { color: t.correct }]}
                    >
                      {copy.correct}
                    </Text>
                  )}
                  {!answered && wrongCount >= 2 && (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={[styles.explanation, { color: t.textMuted }]}
                    >
                      {questionExplanation}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>

        <View style={[styles.reportDock, { bottom: insets.bottom + 78 }]}>
          <ReportErrorButton
            screen="learning_v2_intro"
            dataId={`learning_v2_intro_${lessonId}_${safeIndex}`}
            dataText={questionPrompt || stageLabel}
            variant="icon-flag"
            accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в объяснении', uk: 'Повідомити про помилку в поясненні', en: 'Report an error in the explanation', es: 'Informar de un error en la explicación', 'pt-BR': 'Relatar erro na explicação', vi: 'Báo lỗi trong phần giải thích', id: 'Laporkan kesalahan pada penjelasan', tr: 'Açıklamadaki hatayı bildir', pl: 'Zgłoś błąd w wyjaśnieniu' })}
            testID="learning-v2-intro-report"
          />
        </View>

        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 6),
              backgroundColor: t.bgPrimary,
              borderTopColor: t.border,
            },
          ]}
        >
          <DuoPressable
            testID="learning-v2-intro-next"
            accessibilityLabel={isLast ? copy.startPractice : copy.next}
            accessibilityState={{ disabled: !answered }}
            disabled={!answered}
            onPress={advance}
            edgeColor={answered ? t.btnShadow : undefined}
            edgeHeight={CHK.recoilShiftPx}
            wrapStyle={styles.ctaWrap}
            style={[
              styles.cta,
              { backgroundColor: answered ? t.correct : t.bgSurface2 },
            ]}
          >
            <Text
              style={[
                styles.ctaText,
                { color: answered ? ctaTextColor : t.textMuted },
              ]}
            >
              {isLast ? copy.startPractice : copy.next}
            </Text>
            <Ionicons
              name={isLast ? "play" : "arrow-forward"}
              size={20}
              color={answered ? ctaTextColor : t.textMuted}
            />
          </DuoPressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, overflow: "hidden" },
  header: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  closeButton: { minWidth: 44, minHeight: 44 },
  // зачем: владелец запретил обводки контейнеров — кнопка, панель вопроса и
  // варианты разделяются тоном (bgCard/bgSurface2 на градиенте экрана), не рамкой.
  closeButtonFace: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  stageMeta: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageLabel: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  pageCounter: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  headerAccessory: { flexShrink: 0 },
  progressRow: {
    height: 4,
    marginHorizontal: 18,
    marginTop: 4,
    flexDirection: "row",
    gap: 6,
  },
  progressSegment: { flex: 1, height: 4, borderRadius: 4 },
  slide: { flex: 1, minHeight: 0 },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 24 },
  scrollContentCompact: { paddingTop: 16 },
  readerColumn: { width: "100%", maxWidth: 680, alignSelf: "center" },
  title: {
    fontSize: 23,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
    marginTop: 10,
  },
  knowledgeFlow: { marginTop: 18, gap: 13 },
  readerParagraph: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  spacer: { height: 4 },
  questionPanel: {
    marginTop: 18,
  },
  questionEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  questionEyebrow: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  questionNumber: { fontSize: 12, lineHeight: 17, fontWeight: "700" },
  questionPrompt: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700",
    marginTop: 12,
  },
  answerList: { marginTop: 10, marginHorizontal: -14, gap: 8 },
  answerChoiceTouch: { minHeight: 52 },
  answerChoice: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  answerChoiceText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  correctMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 12,
  },
  explanation: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400",
    marginTop: 12,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  reportDock: {
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
  ctaWrap: { width: "100%", maxWidth: 680, alignSelf: "center" },
  cta: {
    minHeight: 58,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
});
