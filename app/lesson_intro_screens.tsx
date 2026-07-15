import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  ScrollView,
  Easing,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from '../components/SafeLinearGradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, getVolumetricShadow } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import ScreenGradient from '../components/ScreenGradient';
import DuoPressable from '../components/DuoPressable';
import TopFadeMask from '../components/TopFadeMask';
import LessonArtBackdrop from '../components/LessonArtBackdrop';
import CompassDepthSurface from '../components/CompassDepthSurface';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { MOTION_SCALE } from '../constants/motion';
import { COMPASS_GRADIENTS, COMPASS_RICH, COMPASS_SURFACE_LOCATIONS, compassShadow } from '../constants/compassTheme';
import type { LessonIntroExample, LessonIntroScreen, LessonIntroBlockKind } from './lesson_data_types';
import type { StudyTargetLang } from './study_target_lang_dev';
import { useStudyTarget } from '../components/StudyTargetContext';
import BouncyScrollView from '../components/BouncyScrollView';
import ReportErrorButton from '../components/ReportErrorButton';
import {
  HighlightedText,
  RichTextParts,
  RichIntroLineView,
  KIND_MAP,
  KIND_BY_INDEX,
  defaultKindTitle,
  richKindToLegacyKind,
  richTitle,
  richSubtitle,
  richIntroLines,
  hasRichIntroLines,
  plainIntroText,
  isRichExample,
  richExampleText,
  lessonIntroExampleLines,
  isPlannedIntroLang,
  plannedExampleMeta,
  legacyExampleMeta,
  lessonLevelLabel,
  levelColor,
} from './lesson_intro_rich';

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
const INTRO_HEADER_TOP_GAP = 8;
// Фолбэк, пока хедер не измерил свою реальную высоту через onLayout.
// Честная высота = paddingTop(8) + высота pill/кнопки(~36) + paddingBottom(12) ≈ 56;
// + воздух до первой карточки.
const INTRO_HEADER_FALLBACK_HEIGHT = 56;
const INTRO_FIRST_CARD_GAP = 16;
/**
 * Очень мягкая «expo-out» кривая (a-la Material expressive / iOS spring без bounce).
 * Сильно тормозит к концу — глаз видит долгое, дорогое появление.
 */
const EASE_EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** Чуть менее агрессивная: для opacity, чтобы фейд начинался не «мгновенно от 0». */
const EASE_SOFT_OUT = Easing.bezier(0.22, 0.61, 0.36, 1);

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
  onRevealComplete?: (index: number) => void;
  footer?: React.ReactNode;
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
  onRevealComplete,
  footer,
}: IntroBlockCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SLIDE_DISTANCE_PX)).current;
  const scale = useRef(new Animated.Value(0.965)).current;
  const iconPulse = useRef(new Animated.Value(0)).current;

  const kind: LessonIntroBlockKind = richKindToLegacyKind(data.kind) ?? KIND_BY_INDEX[index] ?? 'tip';
  const km = KIND_MAP[kind];
  const accent = km.color(t);
  const isLight = false;
  const isCompassTheme = false;

  const defaultTitle = defaultKindTitle(km, lang, studyTarget);
  const localizedTitle = richTitle(data, lang, studyTarget);
  const title = localizedTitle ?? defaultTitle;
  const text = plainIntroText(data, lang, studyTarget);
  const rich = hasRichIntroLines(data);
  const lines = richIntroLines(data, lang, studyTarget);
  const subtitle = richSubtitle(data, lang, studyTarget);

  useEffect(() => {
    if (!visible) return;
    // «Киношный» фейд: длинный opacity + долгий translate с expo-out;
    // никаких пружин — иначе блок «прыгает» и кажется резким.
    // Лёгкий каскад: opacity стартует мгновенно, slide/scale — с микро-задержкой,
    // чтобы появление воспринималось не как «один взмах», а как мягкое всплытие.
    const reveal = Animated.parallel([
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
    ]);
    reveal.start(({ finished }) => {
      if (finished) onRevealComplete?.(index);
    });
    return () => reveal.stop();
  }, [visible, index, opacity, translateY, scale, iconPulse, onRevealComplete]);

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
  const titleColor = isCompassTheme ? COMPASS_RICH.champagne : accent;
  const cardBg = isCompassTheme ? COMPASS_RICH.charcoalRaised : false ? '#FFFFFF' : t.bgCard;
  const stripeBg = isCompassTheme ? COMPASS_RICH.champagne : `${accent}99`;
  const cardRadius = isCompassTheme ? 10 : 18;

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
            borderRadius: cardRadius,
            borderColor: isCompassTheme ? COMPASS_RICH.hairline : t.borderHighlight,
            ...(isCompassTheme ? compassShadow(2) : getVolumetricShadow(themeMode, t, 2)),
          },
        ]}
      >
        {isCompassTheme && <CompassDepthSurface radius={cardRadius} />}
        {/* Цветная вертикальная полоса слева */}
        <View style={[styles.stripe, { backgroundColor: stripeBg }]} />

        <View style={styles.cardInner}>
          {/* Заголовок: иконка + caps-метка */}
          <View style={styles.cardHeader}>
            <Animated.View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalWarm : iconBg,
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : iconBorder,
                  borderRadius: isCompassTheme ? 9 : 18,
                  transform: [{ scale: iconScale }],
                  shadowColor: isCompassTheme ? '#000000' : accent,
                  ...(isCompassTheme ? compassShadow(1) : null),
                },
              ]}
            >
              {isCompassTheme && <CompassDepthSurface radius={9} selected />}
              <Ionicons name={km.icon} size={20} color={isCompassTheme ? COMPASS_RICH.cream : accent} />
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
            <View
              style={[
                styles.exampleBox,
                {
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : `${accent}33`,
                  backgroundColor: isCompassTheme ? COMPASS_RICH.charcoal : isLight ? '#FFFFFF80' : '#00000022',
                  borderRadius: isCompassTheme ? 9 : 12,
                },
              ]}
            >
              {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
              {data.examples.map((ex, i) => {
                const richExample = isRichExample(ex);
                const { primary, secondary } = richExample
                  ? {
                      primary: '',
                      secondary: richExampleText(ex, lang, studyTarget),
                    }
                  : lessonIntroExampleLines(ex as LessonIntroExample, lang, studyTarget);
                const label = richExample
                  ? isPlannedIntroLang(lang)
                    ? plannedExampleMeta(ex, 'label', lang)
                    : legacyExampleMeta(ex, 'label', lang, studyTarget)
                  : undefined;
                const note = richExample
                  ? isPlannedIntroLang(lang)
                    ? plannedExampleMeta(ex, 'note', lang)
                    : legacyExampleMeta(ex, 'note', lang, studyTarget)
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
                    <Text style={[styles.exampleNote, { color: t.textMuted, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.35), marginTop: 3 }]}>
                      {note}
                    </Text>
                  )}
                </View>
                );
              })}
            </View>
          )}

          {footer}
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
  const lessonIntroRuntimeActive = useRuntimeActive();
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: screenH } = useWindowDimensions();
  const isLight = false;
  const isCompassTheme = false;

  const totalBlocks = introScreens.length;
  const [revealedCount, setRevealedCount] = useState(1); // первый блок виден сразу
  const allRevealed = revealedCount >= totalBlocks;
  const ctaReady = allRevealed;

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
  const visibleHeightRef = useRef<number>(screenH);
  // Реальная высота хедера (Back + pill), измеренная на лету — вместо магического числа.
  const [headerHeight, setHeaderHeight] = useState(INTRO_HEADER_FALLBACK_HEIGHT);
  // Зеркало низа хедера для auto-scroll — чтобы не тащить headerBottom в deps эффекта.
  const headerBottomRef = useRef<number>(0);

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
      // Ставим новый блок сразу ПОД хедером (а не под него): вычитаем низ хедера + воздух,
      // иначе верх карточки прячется за fade-маской/шапкой.
      const targetY = Math.max(0, y - (headerBottomRef.current + INTRO_FIRST_CARD_GAP));
      scrollRef.current.scrollTo({ y: targetY, animated: true });
    }, AUTO_SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [revealedCount]);

  // Подсказка «Коснитесь, чтобы увидеть дальше» — плавно появляется ПОСЛЕ того,
  // как блок успел осесть, и держит лёгкий «бобинг» иконки, чтобы привлечь внимание.
  useEffect(() => {
    if (!lessonIntroRuntimeActive || allRevealed) {
      hintBob.stopAnimation();
      hintBob.setValue(0);
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
  }, [revealedCount, allRevealed, hintFade, hintBob, lessonIntroRuntimeActive]);

  // CTA «Начать тренировку» — длинный плавный fade-in + долгий expo-out scale + breathing pulse
  useEffect(() => {
    if (!lessonIntroRuntimeActive || !ctaReady) {
      btnPulse.stopAnimation();
      fadeBtn.setValue(0);
      btnScale.setValue(0.85);
      btnPulse.setValue(1);
      return;
    }
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
  }, [ctaReady, fadeBtn, btnScale, btnPulse, lessonIntroRuntimeActive]);

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

  const lessonWord = triLang(lang, {
    ru: 'Урок',
    uk: 'Урок',
    es: 'Lección',
    'pt-BR': 'Lição',
    vi: 'Bài',
    id: 'Pelajaran',
    tr: 'Ders',
    pl: 'Lekcja',
  });

  const headerLabel = `${lessonWord} ${lessonId}`;
  // Текущий (последний открытый) слайд — для контекста отчёта об ошибке.
  const currentIndex = Math.max(0, Math.min(revealedCount - 1, totalBlocks - 1));
  const currentScreen = introScreens[currentIndex];
  const currentKind: LessonIntroBlockKind =
    richKindToLegacyKind(currentScreen?.kind) ?? KIND_BY_INDEX[currentIndex] ?? 'tip';
  const currentSlideTitle =
    (currentScreen ? richTitle(currentScreen, lang, studyTarget) : undefined) ??
    defaultKindTitle(KIND_MAP[currentKind], lang, studyTarget);
  const lvlLabel = lessonLevelLabel(lessonId);
  const lvlColor = levelColor(lessonId, isLight);
  const introHeaderTop = insets.top + INTRO_HEADER_TOP_GAP;
  // Низ хедера = safe-area + зазор + измеренная высота. Контент скролла начинается ниже,
  // плюс воздух до первой карточки.
  const headerBottom = introHeaderTop + headerHeight;
  headerBottomRef.current = headerBottom;
  const scrollTopPadding = headerBottom + INTRO_FIRST_CARD_GAP;
  const startLabel = triLang(lang, {
    ru: 'Начать тренировку',
    uk: 'Почати тренування',
    es: 'Comenzar práctica',
    'pt-BR': 'Começar treino',
    vi: 'Bắt đầu luyện tập',
    id: 'Mulai latihan',
    tr: 'Alıştırmaya başla',
    pl: 'Zacznij trening',
  });
  const tapHintLabel = triLang(lang, {
    ru: 'Коснитесь, чтобы увидеть дальше',
    uk: 'Торкніться, щоб побачити далі',
    es: 'Toca para continuar',
    'pt-BR': 'Toque para continuar',
    vi: 'Chạm để xem tiếp',
    id: 'Ketuk untuk melanjutkan',
    tr: 'Devam etmek için dokun',
    pl: 'Dotknij, aby kontynuować',
  });

  const startCta = (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.ctaInlineWrap,
        {
          opacity: fadeBtn,
          transform: [{ scale: btnScale }],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
        <DuoPressable
          testID="lesson-intro-start"
          accessibilityLabel={startLabel}
          onPress={handleStart}
          gradientColors={isCompassTheme ? COMPASS_GRADIENTS.primaryButton : [`${t.accent}`, `${t.correct}`]}
          gradientStart={{ x: 0, y: 0 }}
          gradientEnd={{ x: 1, y: 1 }}
          edgeColor={isCompassTheme ? COMPASS_RICH.hairlineStrong : t.correct}
          style={[
            styles.ctaBtn,
            {
              borderRadius: isCompassTheme ? 9 : 18,
              borderWidth: 0,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.borderHighlight,
            },
          ]}
        >
          {isCompassTheme && <CompassDepthSurface radius={9} cream />}
          <Text style={[styles.ctaText, { color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontSize: f.bodyLg }]}>
            {startLabel}
          </Text>
          <View style={[styles.ctaIconWrap, isCompassTheme && { backgroundColor: 'rgba(21,16,8,0.12)', borderRadius: 8 }]}>
            <Ionicons name="arrow-forward" size={18} color={isCompassTheme ? COMPASS_RICH.textDark : t.correctText} />
          </View>
        </DuoPressable>
      </Animated.View>
    </Animated.View>
  );

  return (
    <ScreenGradient>
      <LessonArtBackdrop variant="intro" />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        {/* Затемняющий верхний край (общий компонент, Telegram-стиль): карточки
            при скролле уходят в тень у статус-бара, а не обрезаются резко.
            Высота = safe-area + хедер. */}
        <TopFadeMask headerHeight={headerHeight + INTRO_HEADER_TOP_GAP} />

        {/* Шапка: Back + pill «Урок N · A1» */}
        <Animated.View
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h > 0 && h !== headerHeight) setHeaderHeight(h);
          }}
          style={[
            styles.header,
            {
              top: introHeaderTop,
              opacity: headerFade,
              transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
            },
          ]}
        >
          <TapScale
            testID="lesson-intro-back"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад',
              uk: 'Назад',
              es: 'Volver',
              'pt-BR': 'Voltar',
              vi: 'Quay lại',
              id: 'Kembali',
              tr: 'Geri',
              pl: 'Wstecz',
            })}
            onPress={handleBack}
            hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
            style={[
              styles.skipBtn,
              {
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderColor: isCompassTheme ? COMPASS_RICH.hairline : t.borderHighlight,
                borderRadius: isCompassTheme ? 9 : 18,
                overflow: isCompassTheme ? 'hidden' : 'visible',
                ...(isCompassTheme ? compassShadow(1) : null),
              },
            ]}
          >
            {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
            <Ionicons name="chevron-back" size={20} color={isCompassTheme ? COMPASS_RICH.champagne : t.textMuted} />
          </TapScale>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.headerPill,
                {
                  backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                  borderColor: isCompassTheme ? COMPASS_RICH.hairline : t.borderHighlight,
                  borderRadius: isCompassTheme ? 10 : 20,
                  overflow: isCompassTheme ? 'hidden' : 'visible',
                  ...(isCompassTheme ? compassShadow(1) : getVolumetricShadow(themeMode, t, 1)),
                },
              ]}
            >
              {isCompassTheme && <CompassDepthSurface radius={10} quiet />}
              <Text style={[styles.headerText, { color: t.textPrimary, fontSize: f.caption }]} numberOfLines={1}>
                {headerLabel}
              </Text>
              <View style={[styles.headerDot, { backgroundColor: t.textMuted }]} />
              <Text style={[styles.headerText, { color: lvlColor, fontSize: f.caption }]} numberOfLines={1}>
                {lvlLabel}
              </Text>
            </View>

            <ReportErrorButton
              variant="icon-flag"
              screen="lesson_intro"
              dataId={`lesson_intro_${lessonId ?? 'unknown'}_slide_${currentIndex ?? 0}`}
              dataText={currentSlideTitle}
              accessibilityLabel="Сообщить об ошибке в объяснении"
              testID="lesson-intro-report"
              style={[
                styles.reportFlag,
                {
                  backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                  borderColor: isCompassTheme ? COMPASS_RICH.hairline : t.borderHighlight,
                  ...(isCompassTheme ? compassShadow(1) : null),
                },
              ]}
            />
          </View>
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
          <BouncyScrollView
            ref={scrollRef}
            decelerationRate="normal"
            contentContainerStyle={[styles.scrollContent, { paddingTop: scrollTopPadding }]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
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
              {introScreens.slice(0, totalBlocks).map((block, i) => {
                const isLastBlock = i === totalBlocks - 1;
                return (
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
                    footer={isLastBlock && ctaReady ? startCta : null}
                  />
                );
              })}

              {/* Подсказка-плашка: визуальная только. Тап обрабатывает родительский Pressable. */}
              {!allRevealed && (
                <Animated.View
                  testID="lesson-intro-hint"
                  pointerEvents="none"
                  style={[
                    styles.tapHintRow,
                    {
                      opacity: hintFade,
                      alignSelf: 'center',
                      backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : undefined,
                      borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : undefined,
                      borderWidth: 0,
                      borderRadius: isCompassTheme ? 9 : 0,
                      overflow: isCompassTheme ? 'hidden' : 'visible',
                      ...(isCompassTheme ? compassShadow(1) : null),
                    },
                  ]}
                >
                  {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
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
                    <Ionicons name="finger-print-outline" size={16} color={isCompassTheme ? COMPASS_RICH.champagne : t.textGhost} />
                  </Animated.View>
                  <Text style={[styles.tapHint, { color: isCompassTheme ? COMPASS_RICH.textMuted : t.textGhost, fontSize: f.caption }]}>
                    {tapHintLabel}
                  </Text>
                </Animated.View>
              )}

              <View style={{ height: 28 + bottomInset }} />
            </Pressable>
          </BouncyScrollView>
        </Animated.View>

      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  headerPill: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0,
  },
  reportFlag: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
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
    borderWidth: 0,
  },
  scrollContent: {
    paddingHorizontal: 18,
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
    borderWidth: 0,
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
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    overflow: 'hidden',
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
  exampleBox: {
    position: 'relative',
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 0,
    padding: 12,
    overflow: 'hidden',
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
  exampleNote: {
    fontStyle: 'normal',
    fontWeight: '600',
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
  ctaInlineWrap: {
    marginTop: 18,
    width: '100%',
  },
  ctaBtn: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 0,
    overflow: 'hidden',
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
