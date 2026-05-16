import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
  Easing,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, getVolumetricShadow } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import ScreenGradient from '../components/ScreenGradient';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SCALE } from '../constants/motion';
import type { IntroLine, IntroTextPart, IntroTextTone, LessonIntroExample, LessonIntroScreen, LessonIntroBlockKind } from './lesson_data_types';
import type { StudyTargetLang } from './study_target_lang_dev';
import { spanishLessonUiStringsActive, spanishStudyActive } from './spanish_content_gate';
import { useStudyTarget } from '../components/StudyTargetContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Разбивает текст на сегменты: обычный текст и английские вставки.
 * Английская вставка — последовательность ASCII-символов (латиница, цифры,
 * пробел, дефис, слэш, апостроф, точка, запятая) длиной ≥2, окружённая
 * не-ASCII символами или границами строки. Односимвольные ASCII (I, a)
 * внутри кириллического текста тоже выделяются если стоят отдельным словом.
 */
function splitEnglish(text: string): Array<{ value: string; isEn: boolean }> {
  // Паттерн: блок ASCII-слов (мин 1 ASCII-буква) отделённый от кириллицы
  const segments: Array<{ value: string; isEn: boolean }> = [];
  // Разбиваем по границам ASCII/не-ASCII
  const re = /([A-Za-z][A-Za-z0-9 '\-\/.,→↔]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ value: text.slice(last, m.index), isEn: false });
    }
    segments.push({ value: m[0], isEn: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ value: text.slice(last), isEn: false });
  }
  return segments;
}

function HighlightedText({
  text,
  style,
  accentColor,
}: {
  text: string;
  style: any;
  accentColor: string;
}) {
  const segments = splitEnglish(text);
  return (
    <Text style={style}>
      {segments.map((seg, i) =>
        seg.isEn ? (
          <Text key={i} style={{ color: accentColor, fontWeight: '600' }}>
            {seg.value}
          </Text>
        ) : (
          <Text key={i}>{seg.value}</Text>
        )
      )}
    </Text>
  );
}

/** В режиме «учим ES» первая строка — испанская цель (trES), не английский мост (en). */
function lessonIntroExampleLines(
  ex: LessonIntroExample,
  lang: Lang,
  studyTarget: StudyTargetLang,
): { primary: string; secondary: string } {
  const primary = spanishStudyActive(studyTarget) && ex.trES ? ex.trES : ex.en;
  let secondary =
    lang === 'uk'
      ? ex.trUK
      : spanishLessonUiStringsActive(lang, studyTarget)
        ? (ex.trES ?? ex.trRU)
        : ex.trRU;
  if (primary === secondary && ex.en !== primary) {
    secondary = ex.en;
  }
  return { primary, secondary };
}

function hasRichIntroLines(screen: LessonIntroScreen): boolean {
  return !!(screen.linesRU?.length || screen.linesUK?.length || screen.linesES?.length);
}

function richIntroLines(screen: LessonIntroScreen, lang: Lang, studyTarget: StudyTargetLang): IntroLine[] {
  if (lang === 'uk') return screen.linesUK ?? screen.linesRU ?? [];
  if (spanishLessonUiStringsActive(lang, studyTarget)) return screen.linesES ?? screen.linesRU ?? [];
  return screen.linesRU ?? [];
}

function richSubtitle(screen: LessonIntroScreen, lang: Lang, studyTarget: StudyTargetLang): string | undefined {
  if (lang === 'uk') return screen.subtitleUK ?? screen.subtitleRU;
  if (spanishLessonUiStringsActive(lang, studyTarget)) return screen.subtitleES ?? screen.subtitleRU;
  return screen.subtitleRU;
}

function richKindToLegacyKind(kind: LessonIntroScreen['kind']): LessonIntroBlockKind {
  if (kind === 'concept') return 'core_idea';
  if (kind === 'formula') return 'main_formula';
  if (kind === 'practice') return 'memory_tip';
  return (kind as LessonIntroBlockKind) ?? 'tip';
}

function isRichExample(ex: LessonIntroExample | any): ex is {
  en: IntroTextPart[];
  ru: string;
  uk: string;
  es: string;
  labelRU?: string;
  labelUK?: string;
  labelES?: string;
  noteRU?: string;
  noteUK?: string;
  noteES?: string;
} {
  return Array.isArray(ex?.en);
}

function toneStyle(tone: IntroTextTone | undefined, t: any, accent: string, isLight: boolean) {
  const resolved = tone ?? 'normal';
  const colorByTone: Record<IntroTextTone, string> = {
    normal: t.textPrimary,
    muted: t.textMuted,
    strong: t.textPrimary,
    accent,
    success: t.correct,
    danger: t.wrong,
    warning: t.gold,
    formula: isLight ? '#6D28D9' : '#C4B5FD',
    code: isLight ? '#0369A1' : '#7DD3FC',
  };
  const weightByTone: Record<IntroTextTone, '400' | '600' | '700' | '800'> = {
    normal: '400',
    muted: '400',
    strong: '800',
    accent: '800',
    success: '800',
    danger: '800',
    warning: '700',
    formula: '800',
    code: '700',
  };
  return { color: colorByTone[resolved], fontWeight: weightByTone[resolved] };
}

function RichTextParts({
  parts,
  text,
  t,
  accent,
  isLight,
  style,
}: {
  parts?: IntroTextPart[];
  text?: string;
  t: any;
  accent: string;
  isLight: boolean;
  style: any;
}) {
  const source = parts?.length ? parts : [{ text: text ?? '', tone: 'normal' as IntroTextTone }];
  return (
    <Text style={style}>
      {source.map((part, i) => (
        <Text key={`${part.text}-${i}`} style={toneStyle(part.tone, t, accent, isLight)}>
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function RichIntroLineView({
  line,
  t,
  accent,
  isLight,
  f,
}: {
  line: IntroLine;
  t: any;
  accent: string;
  isLight: boolean;
  f: any;
}) {
  if (line.type === 'spacer') return <View style={{ height: 8 }} />;

  const borderColor =
    line.type === 'wrong'
      ? `${t.wrong}55`
      : line.type === 'correct'
        ? `${t.correct}55`
        : line.type === 'formula'
          ? `${accent}55`
          : line.type === 'step'
            ? `${accent}33`
            : 'transparent';
  const bg =
    line.type === 'wrong'
      ? `${t.wrong}16`
      : line.type === 'correct'
        ? `${t.correct}16`
        : line.type === 'formula'
          ? `${accent}18`
          : line.type === 'step'
            ? isLight ? '#FFFFFFB8' : '#00000020'
            : line.type === 'tip'
              ? `${t.gold}14`
              : 'transparent';
  const isFramed = line.type === 'wrong' || line.type === 'correct' || line.type === 'formula' || line.type === 'step' || line.type === 'tip';

  return (
    <View
      style={[
        styles.richLine,
        isFramed && {
          backgroundColor: bg,
          borderColor,
          borderWidth: 1,
          paddingHorizontal: 12,
          paddingVertical: line.type === 'formula' ? 12 : 10,
        },
      ]}
    >
      <RichTextParts
        parts={line.parts}
        text={line.text}
        t={t}
        accent={accent}
        isLight={isLight}
        style={[
          styles.richLineText,
          {
            color: t.textPrimary,
            fontSize: line.type === 'formula' ? f.bodyLg : f.body,
            lineHeight: Math.round((line.type === 'formula' ? f.bodyLg : f.body) * 1.42),
            textAlign: line.type === 'formula' ? 'center' : 'left',
          },
        ]}
      />
    </View>
  );
}

interface LessonIntroScreensProps {
  introScreens: LessonIntroScreen[];
  lessonId: number;
  onComplete: () => void;
  onBack?: () => void;
}

const FADE_DURATION_MS = 1400; // длинный плавный фейд
const SLIDE_DURATION_MS = 1500; // длинный «дрейф» снизу
const SLIDE_DISTANCE_PX = 44; // путь slide-up — больше воздуха
const AUTO_SCROLL_DELAY_MS = 520; // даём блоку доехать до конца, потом скроллим
/** Нижний отступ кнопки «Начать урок» (совпадает с инлайн `bottom` у CTA). */
const INTRO_CTA_BOTTOM_OFFSET = 22;
/** Примерная высота CTA + зазор: звёзды не должны заезжать на эту зону во время анимации кнопки. */
const INTRO_CTA_ZONE_PX = 88;
/** Звёзды показываем только после всех карточек — и сразу над полосой кнопки. */
const INTRO_STARS_ABOVE_CTA_PX = INTRO_CTA_BOTTOM_OFFSET + INTRO_CTA_ZONE_PX;
const KIND_BY_INDEX: LessonIntroBlockKind[] = ['why', 'how', 'tip'];

/**
 * Очень мягкая «expo-out» кривая (a-la Material expressive / iOS spring без bounce).
 * Сильно тормозит к концу — глаз видит долгое, дорогое появление.
 */
const EASE_EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** Чуть менее агрессивная: для opacity, чтобы фейд начинался не «мгновенно от 0». */
const EASE_SOFT_OUT = Easing.bezier(0.22, 0.61, 0.36, 1);

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface KindStyle {
  icon: IconName;
  defaultTitleRU: string;
  defaultTitleUK: string;
  defaultTitleES: string;
  /** Возвращает основной акцентный цвет блока из темы */
  color: (t: any) => string;
}

const KIND_MAP: Record<LessonIntroBlockKind, KindStyle> = {
  why: {
    icon: 'sparkles',
    defaultTitleRU: 'Зачем эта тема',
    defaultTitleUK: 'Навіщо ця тема',
    defaultTitleES: '¿Para qué sirve este tema?',
    color: (t) => t.accent,
  },
  how: {
    icon: 'construct',
    defaultTitleRU: 'Как строится фраза',
    defaultTitleUK: 'Як будується фраза',
    defaultTitleES: '¿Cómo se forma la frase?',
    color: (t) => t.correct,
  },
  tip: {
    icon: 'bulb',
    defaultTitleRU: 'Полезно знать',
    defaultTitleUK: 'Корисно знати',
    defaultTitleES: 'Dato útil',
    color: (t) => t.gold,
  },
  trap: {
    icon: 'warning',
    defaultTitleRU: 'Главная ловушка',
    defaultTitleUK: 'Головна пастка',
    defaultTitleES: 'Trampa principal',
    color: (t) => t.wrong,
  },
  mechanic: {
    icon: 'hand-left',
    defaultTitleRU: 'Как это работает',
    defaultTitleUK: 'Як це працює',
    defaultTitleES: '¿Cómo funciona esto?',
    color: (t) => t.accent,
  },
  core_idea: {
    icon: 'flash',
    defaultTitleRU: 'Ключевая идея',
    defaultTitleUK: 'Ключова ідея',
    defaultTitleES: 'Idea clave',
    color: (t) => t.accent,
  },
  main_formula: {
    icon: 'calculator',
    defaultTitleRU: 'Формула урока',
    defaultTitleUK: 'Формула уроку',
    defaultTitleES: 'Fórmula de la lección',
    color: (t) => t.gold,
  },
  be_choice: {
    icon: 'git-branch',
    defaultTitleRU: 'Как выбрать форму',
    defaultTitleUK: 'Як обрати форму',
    defaultTitleES: 'Cómo elegir la forma',
    color: (t) => t.correct,
  },
  description_logic: {
    icon: 'list',
    defaultTitleRU: 'Что идёт после глагола',
    defaultTitleUK: 'Що йде після дієслова',
    defaultTitleES: 'Qué va después del verbo',
    color: (t) => t.gold,
  },
  memory_tip: {
    icon: 'bulb',
    defaultTitleRU: 'Приём сборки',
    defaultTitleUK: 'Прийом складання',
    defaultTitleES: 'Truco de construcción',
    color: (t) => t.gold,
  },
  negative_formula: {
    icon: 'close-circle',
    defaultTitleRU: 'Отрицание',
    defaultTitleUK: 'Заперечення',
    defaultTitleES: 'Negación',
    color: (t) => t.wrong,
  },
  question_formula: {
    icon: 'help-circle',
    defaultTitleRU: 'Вопрос',
    defaultTitleUK: 'Питання',
    defaultTitleES: 'Pregunta',
    color: (t) => t.accent,
  },
  after_be: {
    icon: 'list',
    defaultTitleRU: 'Что идёт после To Be',
    defaultTitleUK: 'Що йде після To Be',
    defaultTitleES: 'Qué va después de To Be',
    color: (t) => t.gold,
  },
  negative_questions: {
    icon: 'alert-circle',
    defaultTitleRU: 'Вопросы с not',
    defaultTitleUK: 'Питання з not',
    defaultTitleES: 'Preguntas con not',
    color: (t) => t.accent,
  },
  mistakes: {
    icon: 'warning',
    defaultTitleRU: 'Главные ошибки',
    defaultTitleUK: 'Головні помилки',
    defaultTitleES: 'Errores principales',
    color: (t) => t.wrong,
  },
};

function lessonLevelLabel(lessonId: number): 'A1' | 'A2' | 'B1' | 'B2' {
  if (lessonId <= 8) return 'A1';
  if (lessonId <= 18) return 'A2';
  if (lessonId <= 28) return 'B1';
  return 'B2';
}

function levelColor(lessonId: number, isLight: boolean): string {
  if (lessonId <= 8) return isLight ? '#15803D' : '#4CAF72';
  if (lessonId <= 18) return isLight ? '#0369A1' : '#40B4E8';
  if (lessonId <= 28) return isLight ? '#92400E' : '#D4A017';
  return isLight ? '#9A3412' : '#DC6428';
}

interface IntroBlockCardProps {
  index: number;
  total: number;
  data: LessonIntroScreen;
  visible: boolean;
  lang: Lang;
  studyTarget: StudyTargetLang;
  t: any;
  themeMode: any;
  f: any;
  onLayout: (index: number, y: number) => void;
}

function IntroBlockCard({
  index,
  total: _total,
  data,
  visible,
  lang,
  studyTarget,
  t,
  themeMode,
  f,
  onLayout,
}: IntroBlockCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SLIDE_DISTANCE_PX)).current;
  const scale = useRef(new Animated.Value(0.965)).current;
  const iconPulse = useRef(new Animated.Value(0)).current;

  const kind: LessonIntroBlockKind = richKindToLegacyKind(data.kind) ?? KIND_BY_INDEX[index] ?? 'tip';
  const km = KIND_MAP[kind];
  const accent = km.color(t);
  const isLight = themeMode === 'minimalLight';

  const defaultTitle =
    lang === 'uk' ? km.defaultTitleUK : spanishLessonUiStringsActive(lang, studyTarget) ? km.defaultTitleES : km.defaultTitleRU;
  const localizedTitle =
    lang === 'uk' ? data.titleUK : spanishLessonUiStringsActive(lang, studyTarget) ? data.titleES : data.titleRU;
  const title = localizedTitle ?? defaultTitle;
  const text =
    lang === 'uk' ? data.textUK : spanishLessonUiStringsActive(lang, studyTarget) ? (data.textES ?? data.textRU) : data.textRU;
  const rich = hasRichIntroLines(data);
  const lines = richIntroLines(data, lang, studyTarget);
  const subtitle = richSubtitle(data, lang, studyTarget);

  useEffect(() => {
    if (!visible) return;
    // «Киношный» фейд: длинный opacity + долгий translate с expo-out;
    // никаких пружин — иначе блок «прыгает» и кажется резким.
    // Лёгкий каскад: opacity стартует мгновенно, slide/scale — с микро-задержкой,
    // чтобы появление воспринималось не как «один взмах», а как мягкое всплытие.
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_DURATION_MS,
        easing: EASE_SOFT_OUT,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(80),
        Animated.timing(translateY, {
          toValue: 0,
          duration: SLIDE_DURATION_MS,
          easing: EASE_EXPO_OUT,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(80),
        Animated.timing(scale, {
          toValue: 1,
          duration: SLIDE_DURATION_MS,
          easing: EASE_EXPO_OUT,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(560),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 0,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [visible, opacity, translateY, scale, iconPulse]);

  const iconScale = iconPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, MOTION_SCALE.energyRefill],
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    onLayout(index, e.nativeEvent.layout.y);
  };

  if (!visible) {
    // Зарезервированное место не нужно — блок ещё не отрендерен,
    // следующие блоки увидят свою новую y когда появятся.
    return null;
  }

  // Цветовая полупрозрачная подложка под иконкой
  const iconBg = `${accent}28`;
  const iconBorder = `${accent}55`;
  const titleColor = accent;
  const cardBg = themeMode === 'minimalLight' ? '#FFFFFF' : t.bgCard;
  const stripeBg = `${accent}99`;

  return (
    <Animated.View
      onLayout={handleLayout}
      style={{
        opacity,
        transform: [{ translateY }, { scale }],
        marginBottom: 14,
      }}
    >
      <View
        testID={`lesson-intro-card-${index + 1}`}
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: t.borderHighlight,
            ...getVolumetricShadow(themeMode, t, 2),
          },
        ]}
      >
        {/* Цветная вертикальная полоса слева */}
        <View style={[styles.stripe, { backgroundColor: stripeBg }]} />

        <View style={styles.cardInner}>
          {/* Заголовок: иконка + caps-метка */}
          <View style={styles.cardHeader}>
            <Animated.View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: iconBg,
                  borderColor: iconBorder,
                  transform: [{ scale: iconScale }],
                  shadowColor: accent,
                },
              ]}
            >
              <Ionicons name={km.icon} size={20} color={accent} />
            </Animated.View>
            <Text
              style={[
                styles.cardTitle,
                {
                  color: titleColor,
                  fontSize: f.caption,
                },
              ]}
            >
              {title}
            </Text>
          </View>

          {/* Тело блока */}
          {rich ? (
            <View style={styles.richBody}>
              {!!subtitle && (
                <Text style={[styles.richSubtitle, { color: t.textMuted, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.45) }]}>
                  {subtitle}
                </Text>
              )}
              {lines.map((line, i) => (
                <RichIntroLineView
                  key={`${data.screenId ?? index}-line-${i}`}
                  line={line}
                  t={t}
                  accent={accent}
                  isLight={isLight}
                  f={f}
                />
              ))}
            </View>
          ) : (
            <HighlightedText
              text={text ?? ''}
              accentColor={accent}
              style={[
                styles.cardBody,
                {
                  color: t.textPrimary,
                  fontSize: f.bodyLg,
                  lineHeight: Math.round(f.bodyLg * 1.5),
                },
              ]}
            />
          )}

          {/* Опциональные примеры */}
          {!!data.examples?.length && (
            <View style={[styles.exampleBox, { borderColor: `${accent}33`, backgroundColor: isLight ? '#FFFFFF80' : '#00000022' }]}>
              {data.examples.map((ex, i) => {
                const richExample = isRichExample(ex);
                const { primary, secondary } = richExample
                  ? {
                      primary: '',
                      secondary:
                        lang === 'uk'
                          ? ex.uk
                          : spanishLessonUiStringsActive(lang, studyTarget)
                            ? ex.es
                            : ex.ru,
                    }
                  : lessonIntroExampleLines(ex as LessonIntroExample, lang, studyTarget);
                const label = richExample
                  ? lang === 'uk'
                    ? ex.labelUK
                    : spanishLessonUiStringsActive(lang, studyTarget)
                      ? ex.labelES
                      : ex.labelRU
                  : undefined;
                const note = richExample
                  ? lang === 'uk'
                    ? ex.noteUK
                    : spanishLessonUiStringsActive(lang, studyTarget)
                      ? ex.noteES
                      : ex.noteRU
                  : undefined;
                return (
                <View key={i} style={[styles.exampleRow, i > 0 && { marginTop: 6 }]}>
                  {!!label && (
                    <Text style={[styles.exampleTR, { color: t.textMuted, fontSize: f.caption, marginBottom: 2 }]}>
                      {label}
                    </Text>
                  )}
                  {richExample ? (
                    <RichTextParts
                      parts={ex.en}
                      t={t}
                      accent={accent}
                      isLight={isLight}
                      style={[styles.exampleEN, { color: t.correct, fontSize: f.body }]}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.exampleEN,
                        { color: t.correct, fontSize: f.body },
                      ]}
                    >
                      {primary}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.exampleTR,
                      { color: t.textMuted, fontSize: f.sub },
                    ]}
                  >
                    {secondary}
                  </Text>
                  {!!note && (
                    <Text style={[styles.exampleTR, { color: t.gold, fontSize: f.caption, marginTop: 2 }]}>
                      {note}
                    </Text>
                  )}
                </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function LessonIntroScreens({
  introScreens,
  lessonId,
  onComplete,
  onBack,
}: LessonIntroScreensProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useSafeAreaInsets();
  const isLight = themeMode === 'minimalLight';

  const totalBlocks = introScreens.length;
  const [revealedCount, setRevealedCount] = useState(1); // первый блок виден сразу
  const allRevealed = revealedCount >= totalBlocks;

  const fadeBtn = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0.85)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const containerScale = useRef(new Animated.Value(0.985)).current;

  // Подсказка-плашка «Коснитесь, чтобы увидеть дальше»: плавно появляется/исчезает
  const hintFade = useRef(new Animated.Value(0)).current;
  const hintBob = useRef(new Animated.Value(0)).current;

  const scrollRef = useRef<ScrollView | null>(null);
  const blockYRef = useRef<Record<number, number>>({});
  const visibleHeightRef = useRef<number>(SCREEN_H);

  const handleBlockLayout = useCallback((index: number, y: number) => {
    blockYRef.current[index] = y;
  }, []);

  // Появление header + лёгкое «оживление» контейнера на mount — медленный, дорогой фейд
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 900,
        easing: EASE_SOFT_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: 1,
        duration: 900,
        easing: EASE_EXPO_OUT,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerFade, containerScale]);

  // Авто-показ намеренно убран: пользователь сам контролирует темп чтения.
  // Следующий блок появляется только по тапу на кнопку «Дальше».

  // Auto-scroll к новому блоку: ждём, пока он отрендерится и узнает свою y, и плавно центрируем
  useEffect(() => {
    if (revealedCount <= 1) return;
    const idx = revealedCount - 1;
    const timer = setTimeout(() => {
      const y = blockYRef.current[idx];
      if (y === undefined || !scrollRef.current) return;
      // Ставим новый блок в верхнюю треть видимой области (комфортно для глаз):
      // если блок целиком влез — exitскролл всё равно мягко подвинет его выше предыдущего.
      const targetY = Math.max(0, y - 60);
      scrollRef.current.scrollTo({ y: targetY, animated: true });
    }, AUTO_SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [revealedCount]);

  // Подсказка «Коснитесь, чтобы увидеть дальше» — плавно появляется ПОСЛЕ того,
  // как блок успел осесть, и держит лёгкий «бобинг» иконки, чтобы привлечь внимание.
  useEffect(() => {
    if (allRevealed) {
      Animated.timing(hintFade, {
        toValue: 0,
        duration: 280,
        easing: EASE_SOFT_OUT,
        useNativeDriver: true,
      }).start();
      return;
    }
    hintFade.setValue(0);
    const appear = Animated.sequence([
      Animated.delay(FADE_DURATION_MS + 500),
      Animated.timing(hintFade, {
        toValue: 1,
        duration: 800,
        easing: EASE_SOFT_OUT,
        useNativeDriver: true,
      }),
    ]);
    appear.start();
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(hintBob, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(hintBob, {
          toValue: 0,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    bob.start();
    return () => {
      bob.stop();
      appear.stop();
    };
  }, [revealedCount, allRevealed, hintFade, hintBob]);

  // CTA «Начать урок» — длинный плавный fade-in + долгий expo-out scale + breathing pulse
  useEffect(() => {
    if (!allRevealed) return;
    Animated.parallel([
      Animated.timing(fadeBtn, {
        toValue: 1,
        duration: 1100,
        easing: EASE_SOFT_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(btnScale, {
        toValue: 1,
        duration: 1100,
        easing: EASE_EXPO_OUT,
        useNativeDriver: true,
      }),
    ]).start();
    // Breathing pulse — мягкий, ненавязчивый
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, {
          toValue: MOTION_SCALE.hint,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(btnPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [allRevealed, fadeBtn, btnScale, btnPulse]);

  const handleTapAnywhere = () => {
    if (revealedCount < totalBlocks) {
      hapticTap();
      setRevealedCount((n) => Math.min(n + 1, totalBlocks));
    }
  };

  const handleStart = () => {
    hapticTap();
    onComplete();
  };

  const handleBack = () => {
    hapticTap();
    (onBack ?? onComplete)();
  };

  // Защитный кейс: контента нет — мгновенно проваливаем в урок
  useEffect(() => {
    if (introScreens.length === 0) onComplete();
  }, [introScreens.length, onComplete]);

  if (introScreens.length === 0) return null;

  const lessonWord = triLang(lang, { ru: 'Урок', uk: 'Урок', es: 'Lección' });
  const headerLabel = `${lessonWord} ${lessonId}`;
  const lvlLabel = lessonLevelLabel(lessonId);
  const lvlColor = levelColor(lessonId, isLight);
  const startLabel = triLang(lang, { ru: 'Начать урок', uk: 'Почати урок', es: 'Empezar la lección' });
  const tapHintLabel = triLang(lang, {
    ru: 'Коснитесь, чтобы увидеть дальше',
    uk: 'Торкніться, щоб побачити далі',
    es: 'Toca para continuar',
  });

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Шапка: pill «Урок N · A1» + Skip */}
        <Animated.View
          style={[
            styles.header,
            { opacity: headerFade, transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] },
          ]}
        >
          <View
            style={[
              styles.headerPill,
              {
                backgroundColor: t.bgCard,
                borderColor: t.borderHighlight,
                ...getVolumetricShadow(themeMode, t, 1),
              },
            ]}
          >
            <Text style={[styles.headerText, { color: t.textPrimary, fontSize: f.caption }]}>
              {headerLabel}
            </Text>
            <View style={[styles.headerDot, { backgroundColor: t.textMuted }]} />
            <Text style={[styles.headerText, { color: lvlColor, fontSize: f.caption }]}>
              {lvlLabel}
            </Text>
          </View>

          <TouchableOpacity
            testID="lesson-intro-back"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver' })}
            onPress={handleBack}
            hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
            style={[styles.skipBtn, { backgroundColor: t.bgCard, borderColor: t.borderHighlight }]}
          >
            <Ionicons name="chevron-back" size={20} color={t.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        {/* Скроллируемый список карточек.
            Pressable-обёртку специально НЕ ставим: на Android она перехватывает touch responder
            раньше, чем ScrollView успеет начать pan-жест, и скролл «не работает». */}
        <Animated.View
          style={{ flex: 1, transform: [{ scale: containerScale }] }}
          onLayout={(e) => {
            visibleHeightRef.current = e.nativeEvent.layout.height;
          }}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            bounces
            overScrollMode="always"
          >
            {/* Pressable-«коврик» ВНУТРИ ScrollView: тап в любом месте = следующий блок.
                Скролл не ломается: Pressable — ребёнок ScrollView, поэтому при pan-жесте
                ScrollView перехватывает responder, а Pressable отменяет press. */}
            <Pressable
              onPress={!allRevealed ? handleTapAnywhere : undefined}
              android_disableSound
              style={styles.tapMat}
            >
              {introScreens.slice(0, totalBlocks).map((block, i) => (
                <IntroBlockCard
                  key={`${lessonId}-${i}`}
                  index={i}
                  total={totalBlocks}
                  data={block}
                  visible={i < revealedCount}
                  lang={lang}
                  studyTarget={studyTarget}
                  t={t}
                  themeMode={themeMode}
                  f={f}
                  onLayout={handleBlockLayout}
                />
              ))}

              {/* Подсказка-плашка: визуальная только. Тап обрабатывает родительский Pressable. */}
              {!allRevealed && (
                <Animated.View
                  testID="lesson-intro-hint"
                  pointerEvents="none"
                  style={[styles.tapHintRow, { opacity: hintFade, alignSelf: 'center' }]}
                >
                  <Animated.View
                    style={{
                      marginRight: 8,
                      transform: [
                        {
                          translateY: hintBob.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 3],
                          }),
                        },
                      ],
                    }}
                  >
                    <Ionicons name="finger-print-outline" size={16} color={t.textGhost} />
                  </Animated.View>
                  <Text style={[styles.tapHint, { color: t.textGhost, fontSize: f.caption }]}>
                    {tapHintLabel}
                  </Text>
                </Animated.View>
              )}

              {/* Доп. отступ снизу, чтобы под кнопкой CTA не упирался последний блок.
                  Растёт вместе с safe-area inset, чтобы на Android с 3-кнопочной навигацией
                  последняя карточка не оказывалась под CTA. */}
              <View style={{ height: (allRevealed ? 175 : 130) + insets.bottom }} />
            </Pressable>
          </ScrollView>
        </Animated.View>

        {allRevealed ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              alignSelf: 'center',
              bottom: INTRO_STARS_ABOVE_CTA_PX + insets.bottom,
              zIndex: 10,
            }}
          >
          </View>
        ) : null}

        {/* CTA «Начать урок» — фиксирован снизу, появляется когда все блоки раскрыты.
            bottom учитывает safe-area inset, иначе кнопка налезает на Android-навигацию
            (position:absolute в RN отсчитывается от padding-edge SafeAreaView). */}
        <Animated.View
          pointerEvents={allRevealed ? 'auto' : 'none'}
          style={[
            styles.ctaWrap,
            {
              bottom: INTRO_CTA_BOTTOM_OFFSET + insets.bottom,
              opacity: fadeBtn,
              transform: [{ scale: btnScale }],
              zIndex: 20,
              elevation: 14,
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
            <TouchableOpacity testID="lesson-intro-start" activeOpacity={0.88} onPress={handleStart}>
              <LinearGradient
                colors={[`${t.accent}`, `${t.correct}`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.ctaBtn,
                  {
                    borderColor: t.borderHighlight,
                    shadowColor: t.accent,
                  },
                ]}
              >
                <Text style={[styles.ctaText, { color: t.correctText, fontSize: f.bodyLg }]}>
                  {startLabel}
                </Text>
                <View style={styles.ctaIconWrap}>
                  <Ionicons name="arrow-forward" size={18} color={t.correctText} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  headerText: {
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    opacity: 0.7,
  },
  skipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    flexGrow: 1,
  },
  tapMat: {
    flexGrow: 1,
    width: '100%',
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    flexDirection: 'row',
  },
  stripe: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontWeight: '800',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    flex: 1,
  },
  cardBody: {
    fontWeight: '500',
  },
  richBody: {
    gap: 8,
  },
  richSubtitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  richLine: {
    borderRadius: 12,
  },
  richLineText: {
    fontWeight: '500',
  },
  exampleBox: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 12,
  },
  exampleRow: {
    flexDirection: 'column',
  },
  exampleEN: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  exampleTR: {
    marginTop: 1,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tapHint: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  ctaWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    // bottom выставляется инлайн с учётом safe-area inset
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaText: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  ctaIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
