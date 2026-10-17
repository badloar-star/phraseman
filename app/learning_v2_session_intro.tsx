import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PixelRatio,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  FadeInDown,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { LEARNING_V2_OWNER_LAYOUT } from "../components/learning-v2/learningV2OwnerLayout";
import { KitGlassLayer } from "../components/v2/KitLiquidGlass";
import { nestedBoxShadow, plateBoxShadow } from "../components/v2/ShadowSurface";

import { useStableSafeAreaInsets } from "./stable_safe_area_metrics";
import { useLang } from "../components/LangContext";
import PressableHybrid from "../components/PressableHybrid";
import { LinearGradient } from "../components/SafeLinearGradient";
import { useStudyTarget } from "../components/StudyTargetContext";
import {
  Lv2Cta,
  lv2Alpha,
  lv2CardStyle,
  useLv2Glass,
  type Lv2Glass,
} from "../components/learning-v2/LearningV2Glass";
import { triLang, type Lang } from "../constants/i18n";
import ReportErrorButton from "../components/ReportErrorButton";
import { LUM } from "../constants/motionHybrid";
import { hapticError, hapticSuccess } from "../hooks/use-haptics";
import type { RequiredSessionTaskCompletionInputV3 } from "../modules/learning-v2/progress/required_session_completion_envelope";
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
import { useScaledTextStyles } from '../hooks/useLineScale';
import type {
  LearningV2ModeChoiceDiagnosticV1,
  LearningV2ModeTextAnalysisV1,
} from "../modules/learning-v2/contracts/mode_native_payload_v1";

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
 * зачем (learning-v2.html, `.know`): роль куска по-прежнему выводит мост над `tone`, но палитра
 * теперь — токены Liquid Glass активной темы. Правильный пример на изучаемом языке — белый и
 * жирнее обычного текста; ошибочный — зачёркнут красным; «верно»-маркер зелёный, предупреждение
 * и формула — светлые и жирные. Прежний цвет «языка» (accent) ушёл: в макете он нейтральный.
 */
function rolePresentation(
  role: IntroPartRole,
  g: Lv2Glass,
): { color: string; fontWeight: "400" | "600" | "700"; strike: boolean; size: number } {
  switch (role) {
    case "target":
      return { color: g.text, fontWeight: "700", strike: false, size: 17 };
    case "targetWrong":
      return { color: g.bad, fontWeight: "700", strike: true, size: 17 };
    case "gloss":
      return { color: g.secondary, fontWeight: "400", strike: false, size: 16 };
    case "markerCorrect":
      return { color: g.good, fontWeight: "700", strike: false, size: 16 };
    case "markerWarning":
      return { color: g.cta, fontWeight: "700", strike: false, size: 16 };
    case "formula":
      return { color: g.text, fontWeight: "700", strike: false, size: 16 };
    case "emphasis":
      return { color: g.text, fontWeight: "700", strike: false, size: 16 };
    case "plain":
    default:
      return { color: g.text, fontWeight: "400", strike: false, size: 16 };
  }
}

function IntroReaderParagraph({
  lineIndex,
  parts,
  glass,
  nativeScriptIsCyrillic,
  correctExampleLabel,
  wrongExampleLabel,
}: Readonly<{
  lineIndex: number;
  parts: readonly IntroTextPart[];
  glass: Lv2Glass;
  nativeScriptIsCyrillic: boolean;
  correctExampleLabel: string;
  wrongExampleLabel: string;
}>) {
  const sx = useScaledTextStyles(styles);
  return (
    <Text
      testID={
        lineIndex === 0
          ? "learning-v2-intro-reader-paragraph"
          : `learning-v2-intro-reader-paragraph-${lineIndex}`
      }
      style={[
        sx.readerParagraph,
        { color: glass.text },
      ]}
    >
      {parts.map((part, index) => {
        const role = introPartRole(part, nativeScriptIsCyrillic);
        const look = rolePresentation(role, glass);
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

// зачем ([INTRO-BLUR]): анимация появления страницы должна дойти до конца (finished=true); застрявшая на полупрозрачности/сдвиге даёт «мутный» текст
function logIntroEntering(page: number, finished: boolean): void {
  console.log('[INTRO-BLUR] entering done', JSON.stringify({ page, finished })); // guard-ok: итог анимации появления
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
  resolveChoiceAnalysis,
  onComplete,
  onQuestionComplete,
  onBack,
  headerAccessory,
  runeAwardOriginRef,
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
  resolveSecondWrongExplanation?: (
    interactionId: string,
    choiceIndex: number,
    responseId: string | null,
  ) => string | null;
  resolveChoiceAnalysis?: (
    interactionId: string,
    choiceIndex: number,
    responseId: string | null,
  ) => Readonly<{
    analysis: LearningV2ModeTextAnalysisV1;
    diagnostics: LearningV2ModeChoiceDiagnosticV1 | null;
  }> | null;
  onComplete: (
    completions: readonly RequiredSessionTaskCompletionInputV3[],
  ) => void;
  /** Presentation callback; the parent owns the once-per-interaction rune HUD. */
  onQuestionComplete?: (completion: RequiredSessionTaskCompletionInputV3) => void;
  runeAwardOriginRef?: React.Ref<View>;
  onBack?: () => void;
  /** Header-owned status content must participate in layout, never float over it. */
  headerAccessory?: React.ReactNode;
}>) {
  const sx = useScaledTextStyles(styles);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  // зачем (learning-v2.html, интро): все цвета экрана — токены Liquid Glass активной темы.
  const g = useLv2Glass();
  
  const { height } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [selectedCorrectIndex, setSelectedCorrectIndex] = useState<
    number | null
  >(null);
  const [attempts, setAttempts] = useState(1);
  const [wrongCount, setWrongCount] = useState(0);
  // зачем (макет 25 «ЛОВУШКА — две ошибки»): неверные варианты остаются красными на странице,
  // а не гаснут после толчка. Только вид: вердикт по-прежнему решает evaluateChoice.
  const [wrongChoiceIndexes, setWrongChoiceIndexes] = useState<readonly number[]>([]);
  const [wrongChoiceNudge, setWrongChoiceNudge] = useState({
    choiceIndex: -1,
    token: 0,
  });
  const completionsRef = useRef(
    new Map<string, RequiredSessionTaskCompletionInputV3>(),
  );
  // зачем ([OPTIMISTIC-DESIGN] 17.10): два быстрых тапа по «Дальше» до перерисовки проходили оба — setIndex(+1) дважды пропускал страницу
  // (с её вопросом — занятие теряло задание), а на последней странице onComplete звался дважды. Замок снимается, когда страница реально сменилась.
  const advanceLockRef = useRef(false);
  const stableTaskIdsRef = useRef(taskIds);
  const stableTaskIds = stableTaskIdsRef.current;
  const copy = useMemo(() => stringsFor(lang), [lang]);
  const screens = introScreens.length > 0 ? introScreens : [];
  const safeIndex = Math.min(index, Math.max(0, screens.length - 1));
  const introBlurPage = safeIndex;
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
    ? (resolveSecondWrongExplanation?.(
        question.questionId,
        wrongChoiceNudge.choiceIndex,
        question.responseIdsInVisibleOrder?.[wrongChoiceNudge.choiceIndex] ?? null,
      ) ??
      question.explanationByLocale[questionContentLang] ??
      "")
    : "";
  const answered = selectedCorrectIndex !== null;

  useEffect(() => {
    if (screens.length === 0) onComplete([]);
  }, [onComplete, screens.length]);

  useEffect(() => {
    advanceLockRef.current = false;
  }, [safeIndex]);

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
      const completion: RequiredSessionTaskCompletionInputV3 = {
        taskId,
        disposition: "completed",
        learnerAttempts: attempts,
        hintUsed: false,
      };
      if (!completionsRef.current.has(taskId)) {
        completionsRef.current.set(taskId, completion);
        onQuestionComplete?.(completion);
      }
      setSelectedCorrectIndex(choiceIndex);
      void hapticSuccess();
      return;
    }
    setWrongCount((value) => value + 1);
    setWrongChoiceIndexes((current) =>
      current.includes(choiceIndex) ? current : [...current, choiceIndex],
    );
    setAttempts((value) => value + 1);
    setWrongChoiceNudge((current) => ({
      choiceIndex,
      token: current.token + 1,
    }));
    void hapticError();
  };

  const advance = () => {
    if (!question || !answered) return;
    if (advanceLockRef.current) {
      console.log('[OPTIMISTIC-DESIGN] intro advance: повторный тап отброшен', JSON.stringify({ page: safeIndex, isLast })); // guard-ok: редкий ранний выход
      return;
    }
    advanceLockRef.current = true;
    if (isLast) {
      // зачем: если родитель не ушёл с экрана (ошибка запуска практики), кнопка не должна остаться мёртвой навсегда
      setTimeout(() => { advanceLockRef.current = false; }, 1500);
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
    setWrongChoiceIndexes([]);
    setAttempts(1);
    setWrongCount(0);
    setWrongChoiceNudge({ choiceIndex: -1, token: 0 });
    setIndex((value) => Math.min(value + 1, screens.length - 1));
  };

  // зачем (координатор 17.10, владелец: «почему всё так размыто»; правило «сперва логи»): какие стили реально применены к тексту вступления и его карточке в момент показа страницы —
  // тень текста, прозрачность, трансформ, тень карточки, шрифт/плотность. Рядом [INTRO-BLUR] entering/layout: дошла ли анимация появления до конца и какие размеры у карточки.
  useEffect(() => {
    const fx = (style: unknown) => {
      const f = (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
      return {
        fontSize: f.fontSize ?? null,
        fontWeight: f.fontWeight ?? null,
        opacity: f.opacity ?? null,
        transform: f.transform ?? null,
        textShadowRadius: f.textShadowRadius ?? null,
        textShadowColor: f.textShadowColor ?? null,
        boxShadow: f.boxShadow ? 'yes' : 'no',
        backgroundColor: f.backgroundColor ?? null,
      };
    };
    console.log('[INTRO-BLUR] page', JSON.stringify({
      page: safeIndex,
      lesson: lessonId,
      entering: !reducedMotion,
      reducedMotion,
      pixelRatio: PixelRatio.get(),
      fontScale: PixelRatio.getFontScale(),
      title: fx(sx.title),
      paragraph: fx(sx.readerParagraph),
      card: fx([sx.knowledgeFlow, lv2CardStyle(g)]),
      textColor: g.text,
      titleColor: lv2Alpha(g.text, 0.86),
      cardFill: g.plateFillFrom,
    })); // guard-ok: журнал стилей текста вступления
  }, [g, lessonId, reducedMotion, safeIndex, sx.knowledgeFlow, sx.readerParagraph, sx.title]);
  const logIntroLayout = (node: string) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    console.log('[INTRO-BLUR] layout', JSON.stringify({ node, page: safeIndex, x, y, w: width, h: height })); // guard-ok: размеры без округления — дробные значения тоже причина мути
  };

  return (
    <LinearGradient
      colors={[g.bgTop, g.bg, g.bgBottom]}
      style={[sx.screen, { backgroundColor: g.bg }]}
    >
      <SafeAreaView
        style={[sx.safe, { paddingTop: insets.top }]}
        edges={[]}
      >
        <View style={sx.header}>
          <PressableHybrid
            testID="learning-v2-intro-close"
            variant="icon"
            accessibilityLabel={copy.close}
            hitSlop={10}
            onPress={onBack}
            style={sx.closeButton}
            contentStyle={[
              sx.closeButtonFace,
              { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) },
            ]}
          >
            {/* зачем (learning-v2.html `.shd .rb`; «Тень» 12.10): круг 42 — плашка с малой тенью без кромки, крестик 20. */}
            <KitGlassLayer radius={21} />
            <Ionicons name="close" size={20} color={g.text} />
          </PressableHybrid>

          <View style={sx.stageMeta}>
            {/* зачем (Сверка df455f92d, кадр 12; координатор 15.10): подпись этапа переносилась по буквам («СМЫС»/«Л») — рядом с «1 / 3» и тремя плашками (сердца, энергия, монеты) ей не хватало ширины. Теперь метка не сжимается (flexShrink 0, ширина по содержимому), «N / 3» — отдельной строкой под ней; сжатие и обрезка текста запрещены сторожем, поэтому место берётся высотой, а не шириной. */}
            {/* зачем (Ревизор по 37f546656): ширина метки = экран 360 dp (320) − «×» 42 − зазоры 20 − плашки сердец и энергии ≈ 139 = ≈ 119 dp; самая длинная метка (pt-BR «ARMADILHA») при 13/1,0 ≈ 91 dp — помещается в одну строку.
                maxFontSizeMultiplier 1,2 не даёт крупному системному шрифту раздуть метку сверх этого запаса (91 × 1,2 ≈ 109 < 119): слово не рвётся посреди; сжатия и обрезки нет. */}
            <Text maxFontSizeMultiplier={1.2} style={[sx.stageLabel, { color: lv2Alpha(g.text, 0.86) }]}>
              {stageLabel}
            </Text>
            <Text
              accessibilityLabel={copy.progress(safeIndex + 1, screens.length)}
              style={[sx.pageCounter, { color: g.secondary }]}
            >
              {safeIndex + 1} / {screens.length}
            </Text>
          </View>
          {headerAccessory ? (
            <View style={sx.headerAccessory}>{headerAccessory}</View>
          ) : null}
        </View>

        <View
          style={sx.progressRow}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: screens.length, now: safeIndex + 1 }}
        >
          {screens.map((entry, progressIndex) => (
            <View
              key={entry.screenId ?? `${lessonId}-${progressIndex}`}
              style={[
                sx.progressSegment,
                { backgroundColor: g.opaqueControl },
                progressIndex <= safeIndex && { backgroundColor: g.accent },
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
                ).withCallback((finished) => {
                  'worklet';
                  runOnJS(logIntroEntering)(introBlurPage, finished === true);
                })
          }
          onLayout={logIntroLayout('slide')}
          style={sx.slide}
        >
          <ScrollView
            style={sx.scroll}
            contentContainerStyle={[
              sx.scrollContent,
              compact && sx.scrollContentCompact,
              { paddingBottom: 94 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={sx.readerColumn}>
              <Text style={[sx.title, { color: lv2Alpha(g.text, 0.86) }]}>
                {titleSegments.map((segment, segmentIndex) => (
                  <Text
                    key={`${segmentIndex}-${segment.text}`}
                    style={
                      segment.isTarget
                        ? { color: g.text, fontWeight: "800" }
                        : undefined
                    }
                  >
                    {segment.text}
                  </Text>
                ))}
              </Text>
              {!!subtitle && (
                <Text style={[sx.subtitle, { color: g.secondary }]}>
                  {subtitle}
                </Text>
              )}

              <View onLayout={logIntroLayout('card')} style={[sx.knowledgeFlow, lv2CardStyle(g)]}>
                {lines.map((line, lineIndex) => {
                  const text = lineText(line);
                  if (line.type === "spacer") {
                    return <View key={`${lineIndex}-spacer`} style={sx.spacer} />;
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
                      glass={g}
                      nativeScriptIsCyrillic={nativeScriptIsCyrillic}
                      correctExampleLabel={copy.correctExample}
                      wrongExampleLabel={copy.wrongExample}
                    />
                  );
                })}
              </View>

              {question && (
                <View ref={runeAwardOriginRef} collapsable={false} style={sx.questionPanel}>
                  <View style={sx.questionEyebrowRow}>
                    <Text style={[sx.questionEyebrow, { color: g.text }]}>
                      {copy.answerFirst}
                    </Text>
                    <Text style={[sx.questionNumber, { color: g.mutedText }]}>
                      {question.taskSlot} / 3
                    </Text>
                  </View>
                  <Text style={[sx.questionPrompt, { color: g.text }]}>
                    {questionPrompt}
                  </Text>
                  <View style={sx.answerList}>
                    {questionChoices.map((choice, choiceIndex) => {
                      const correct = selectedCorrectIndex === choiceIndex;
                      const wrong = !correct && wrongChoiceIndexes.includes(choiceIndex);
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
                          style={sx.answerChoiceTouch}
                          contentStyle={[
                            sx.answerChoice,
                            {
                              // зачем (learning-v2.html, `.ach`; «Тень» 12.10): верный — зелёная заливка .12 и кольцо исхода,
                              // неверный — красная .10 и кольцо; обычный — плита с тенью без обводки.
                              backgroundColor: correct
                                ? g.goodSoft
                                : wrong
                                  ? lv2Alpha(g.bad, 0.1)
                                  : g.opaqueCard,
                              borderColor: correct ? g.good : wrong ? g.bad : 'transparent',
                              borderWidth: correct || wrong ? 1 : 0, // shadow-ok: кольцо исхода ответа верно/неверно
                              boxShadow: plateBoxShadow(g),
                            },
                          ]}
                        >
                          <View style={[sx.answerLetter, { backgroundColor: correct ? g.good : wrong ? g.bad : g.opaqueControl }]}>
                            <Text style={{ color: correct || wrong ? g.ctaInk : g.secondary, fontSize: 13, fontWeight: "700" }}>{String.fromCharCode(65 + choiceIndex)}</Text>
                          </View>
                          <Text
                            style={[
                              sx.answerChoiceText,
                              { color: g.text },
                            ]}
                          >
                            {choice}
                          </Text>
                          {correct && (
                            <Ionicons
                              name="checkmark"
                              size={20}
                              color={g.good}
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
                      style={[sx.correctMessage, { color: g.good }]}
                    >
                      {copy.correct}
                    </Text>
                  )}
                  {!answered && wrongCount >= 2 && (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={[sx.explanation, { color: g.secondary }]}
                    >
                      {questionExplanation}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>

        <View style={[sx.reportDock, { bottom: insets.bottom + 78 }]}>
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
            sx.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 6),
              backgroundColor: g.bg,
            },
          ]}
        >
          {/* зачем (learning-v2.html, `.cta` / `.cta.dis`): «Дальше» — плоская пилюля цвета CTA
              темы; пока нет верного ответа — глухая плита. Значок справа как в макете. */}
          <Lv2Cta
            testID="learning-v2-intro-next"
            accessibilityLabel={isLast ? copy.startPractice : copy.next}
            disabled={!answered}
            onPress={advance}
            style={sx.ctaWrap}
            right={
              <Ionicons
                name={isLast ? "play" : "arrow-forward"}
                size={20}
                color={answered ? g.ctaInk : g.mutedText}
              />
            }
          >
            {isLast ? copy.startPractice : copy.next}
          </Lv2Cta>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, overflow: "hidden" },
  // зачем (сверка с learning-v2.html, 05.10): `.shd` margin-top 8, gap 10, поля страницы --pad 20. Прежние поля 6/18
  // шли из настроек Atlas 12.09; по гейту владельца 04.10 эталон — макет 2.0.
  header: {
    minHeight: 42,
    marginTop: 8,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  closeButton: { minWidth: 44, minHeight: 44 },
  // зачем: владелец запретил обводки контейнеров — кнопка, панель вопроса и
  // варианты разделяются тоном (bgCard/bgSurface2 на градиенте экрана), не рамкой.
  closeButtonFace: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  stageMeta: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  // зачем (ратчет typography_two_sizes, D145): ниже заголовка допустимы только 13 и 16 — метка этапа 13 (макет 12) с трекингом 1,0; запас ширины см. комментарий у метки
  stageLabel: {
    flexShrink: 0,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pageCounter: { flexShrink: 0, fontSize: 13, lineHeight: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  headerAccessory: { flexShrink: 0 },
  progressRow: {
    height: 4,
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: "row",
    gap: 6,
  },
  progressSegment: { flex: 1, height: 4, borderRadius: 4 },
  slide: { flex: 1, minHeight: 0 },
  scroll: { flex: 1, minHeight: 0 },
  // `.ititle` margin-top 26 от полосы: 18 здесь + 8 у заголовка.
  scrollContent: { paddingHorizontal: 20, paddingTop: 18 },
  scrollContentCompact: { paddingTop: 16 },
  readerColumn: { width: "100%", maxWidth: 680, alignSelf: "center" },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    marginTop: 8,
  },
  // `.know` padding 18/18/6 + абзац margin-bottom 14 → снизу 20, между абзацами 14.
  knowledgeFlow: { marginTop: 20, gap: 14, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20 },
  readerParagraph: { fontSize: 16, lineHeight: 23, fontWeight: "400" },
  spacer: { height: 4 },
  questionPanel: {
    marginTop: 24,
  },
  questionEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  questionEyebrow: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  questionNumber: { fontSize: 13, lineHeight: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  questionPrompt: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "700",
    marginTop: 10,
  },
  // `.stack` — 9 между вариантами.
  answerList: { marginTop: 14, gap: 9 },
  answerChoiceTouch: { minHeight: LEARNING_V2_OWNER_LAYOUT.intro.targetHeight },
  answerLetter: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  answerChoice: {
    minHeight: LEARNING_V2_OWNER_LAYOUT.intro.targetHeight,
    borderRadius: 14,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  answerChoiceText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
  },
  correctMessage: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    marginTop: 14,
  },
  explanation: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    marginTop: 14,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  reportDock: {
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
  ctaWrap: { width: "100%", maxWidth: 680, alignSelf: "center" },
});
