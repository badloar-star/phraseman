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
  Platform,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from '../components/SafeLinearGradient';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import ScreenGradient from '../components/ScreenGradient';
import DuoPressable from '../components/DuoPressable';
import TopFadeMask from '../components/TopFadeMask';
import LessonArtBackdrop from '../components/LessonArtBackdrop';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { soundDirector } from '../modules/audio/sound_director';
import { MOTION_SCALE } from '../constants/motion';
import type { LessonIntroExample, LessonIntroScreen, LessonIntroBlockKind } from './lesson_data_types';
import type { StudyTargetLang } from './study_target_lang_dev';
import { useStudyTarget } from '../components/StudyTargetContext';
import EnergyBar from '../components/EnergyBar';
import { useEnergy } from '../components/EnergyContext';
import { lessonNamesForStudyTarget } from './lesson_titles_for_study_target';
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
} from '../components/lesson_intro_rich';

import { noAndroidOutline } from '../constants/androidGlow';
import { LessonIntroExampleRow, introExampleEnStyle } from '../components/lessons/LessonIntroGlass';
import { nestedBoxShadow, plateBoxShadow } from '../components/v2/ShadowSurface';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import BackGlyph from '../components/v2/BackGlyph';
interface LessonIntroScreensProps {
  introScreens: LessonIntroScreen[];
  lessonId: number;
  onComplete: () => void;
  onBack?: () => void;
  showEnergyCost?: boolean;
}

const FADE_DURATION_MS = 1400; // длинный плавный фейд
const SLIDE_DURATION_MS = 1500; // длинный «дрейф» снизу
const SLIDE_DISTANCE_PX = 44; // путь slide-up — больше воздуха
const AUTO_SCROLL_DELAY_MS = 520; // даём блоку доехать до конца, потом скроллим
const INTRO_HEADER_TOP_GAP = 8;
/** Кромка подложки шапки ниже её низа (мягкий уход контента под шапку), бета-тест Б2. */
const INTRO_HEADER_FEATHER = 14;
/** Прозрачный вариант цвета верха фона (для плавной кромки без серого «пятна» при интерполяции). */
function introHeaderBackdropClear(bgTop: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(bgTop) ? `${bgTop}00` : 'rgba(255,255,255,0)'; // theme-exempt: прозрачный конец кромки — несёт только альфу
}
// Фолбэк, пока хедер не измерил свою реальную высоту через onLayout.
// Честная высота = paddingTop(8) + высота pill/кнопки(~36) + paddingBottom(12) ≈ 56;
// + воздух до первой карточки.
const INTRO_HEADER_FALLBACK_HEIGHT = 56;
const INTRO_FIRST_CARD_GAP = 16;

/** Contrast follows the rendered Liquid Glass surface, not a legacy theme mode. */
function isLiquidGlassLight(hex: string): boolean {
  const value = hex.replace('#', '').slice(0, 6);
  if (!/^[0-9A-Fa-f]{6}$/.test(value)) return false;
  const channels = [0, 2, 4].map(offset => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map(channel => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] > 0.5;
}
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
  glass: ReturnType<typeof liquidGlassTokens>;
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
  glass,
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
  // зачем: макет C1–C3 — нейтральный стеклянный блок; цветные акценты по видам блоков (полоса,
  // заливка иконки, рамка примеров) ушли, выделения в тексте берут основной тон темы.
  const accent = glass.text;
  // зачем: был мёртвый стаб `= false` — формула «Do / Does + хто + дія?» и
  // остальные rich-тона (formula/code) всегда красились «под тёмный фон»
  // (#C4B5FD и т.п.), из-за чего в «Нефрите» текст не читался на светлой карточке.
  const isLight = isLiquidGlassLight(glass.bg);

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

  const cardBg = glass.card;
  const cardRadius = 20;
  // Android keeps a bounded number of live blur roots while later cards retain
  // the same translucent tint, edge, and sheen layers below.
  const enableLiveBlur = Platform.OS !== 'android' || index < 3;

  return (
    <Animated.View
      onLayout={handleLayout}
      style={{
        opacity,
        transform: [{ translateY }, { scale }],
        marginBottom: 14,
        // зачем («Тень» 12.10): тень плашки на внешней обёртке — внутренняя карточка клипует блюр (overflow hidden) и тень бы обрезала
        borderRadius: cardRadius,
        boxShadow: plateBoxShadow(glass),
      }}
    >
      <View
        testID={`lesson-intro-card-${index + 1}`}
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderRadius: cardRadius,
          },
        ]}
      >
        {enableLiveBlur ? (
          <BlurView
            pointerEvents="none"
            intensity={Platform.OS === 'android' ? 8 : 12}
            blurReductionFactor={4}
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
            tint="systemUltraThinMaterialDark"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <LinearGradient
          pointerEvents="none"
          colors={[glass.lightTint, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassSheen}
        />
        <View style={styles.cardInner}>
          {/* Заголовок: иконка + caps-метка */}
          <View style={styles.cardHeader}>
            <Animated.View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: glass.opaqueControl,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  transform: [{ scale: iconScale }],
                },
              ]}
            >
              <Ionicons name={km.icon} size={20} color={glass.text} />
            </Animated.View>
            <Text
              style={[
                styles.cardTitle,
                {
                  color: glass.text,
                  fontSize: 16,
                  lineHeight: 20,
                  fontWeight: '700',
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
                <Text style={[styles.richSubtitle, { color: glass.secondary, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.45) }]}>
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
                  color: glass.text,
                  fontSize: 16,
                  lineHeight: 23,
                },
              ]}
            />
          )}

          {/* Опциональные примеры */}
          {!!data.examples?.length && (
            <View style={styles.exampleBox}>
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
                  <LessonIntroExampleRow
                    key={i}
                    glass={glass}
                    first={i === 0}
                    label={label}
                    note={note}
                    translation={secondary}
                    english={richExample ? (
                      <RichTextParts
                        parts={ex.en}
                        t={t}
                        accent={accent}
                        isLight={isLight}
                        style={[styles.exampleEN, introExampleEnStyle(glass)]}
                      />
                    ) : (
                      <Text style={[styles.exampleEN, introExampleEnStyle(glass)]}>{primary}</Text>
                    )}
                  />
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
  showEnergyCost = false,
}: LessonIntroScreensProps) {
  const lessonIntroRuntimeActive = useRuntimeActive();
  const { theme: t, f, themeMode, liquidGlassThemeId } = useTheme();
  const introGlass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { energyReady: introEnergyReady } = useEnergy();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: screenH } = useWindowDimensions();

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

  // зачем: тихая атмосферная подложка на первый показ интро урока — играет
  // синхронно с уже существующим header-fade ниже, один раз на lessonId
  // (dedupeKey гарантирует, что повторный mount того же урока не переиграет).
  useEffect(() => {
    soundDirector.request('pm.lesson.begin', { scope: 'lesson-intro', dedupeKey: String(lessonId) });
  }, [lessonId]);

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
      // зачем (PM-032, allowlist движения): вечная пульсация запрещена — декоративный цикл стал разовой реакцией.
      { iterations: 3 },
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
      // зачем (PM-032, allowlist движения): вечная пульсация запрещена — декоративный цикл стал разовой реакцией.
      { iterations: 3 },
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
    en: 'Lesson',
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
  // зачем: макет C1 — под «Урок N» стоит название урока; уровень остаётся запасным подзаголовком.
  const headerSubtitle = lessonNamesForStudyTarget(lang, studyTarget)[lessonId - 1] || lvlLabel;
  const introHeaderTop = insets.top + INTRO_HEADER_TOP_GAP;
  // Низ хедера = safe-area + зазор + измеренная высота. Контент скролла начинается ниже,
  // плюс воздух до первой карточки.
  const headerBottom = introHeaderTop + headerHeight;
  headerBottomRef.current = headerBottom;
  const scrollTopPadding = headerBottom + INTRO_FIRST_CARD_GAP;
  const startLabel = triLang(lang, {
    ru: 'Начать тренировку',
    uk: 'Почати тренування',
    en: 'Start training',
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
    en: 'Tap to see more',
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
      {/* position: relative — якорь для абсолютного бейджа цены, вынесенного
          из кнопки наружу (внутри его резал клип лица кнопки). */}
      <Animated.View style={{ position: 'relative', transform: [{ scale: btnPulse }] }}>
        <DuoPressable
          testID="lesson-intro-start"
          accessibilityLabel={startLabel}
          onPress={handleStart}
          gradientColors={[introGlass.cta, introGlass.cta]}
          gradientStart={{ x: 0, y: 0 }}
          gradientEnd={{ x: 1, y: 1 }}
          edgeColor={introGlass.cta}
          style={[
            styles.ctaBtn,
            {
              borderRadius: 26,
              borderWidth: 0,
            },
          ]}
        >
          <Text style={[styles.ctaText, { color: introGlass.accentInk, fontSize: 16, lineHeight: 21 }]}>
            {startLabel}
          </Text>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="arrow-forward" size={20} color={introGlass.ctaInk} />
          </View>
        </DuoPressable>
        {/* зачем (PM-086): ценник энергии на кнопке убран — сам расход энергии не менялся. */}
      </Animated.View>
    </Animated.View>
  );

  return (
    <ScreenGradient forceFullBleed>
      <LinearGradient
        pointerEvents="none"
        colors={[introGlass.bgTop, introGlass.bg, introGlass.bgBottom]}
        style={StyleSheet.absoluteFill}
      />
      <LessonArtBackdrop variant="intro" />
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['bottom']}>
        {/* Затемняющий верхний край (общий компонент, Telegram-стиль): карточки
            при скролле уходят в тень у статус-бара, а не обрезаются резко.
            Высота = safe-area + хедер. */}
        <TopFadeMask headerHeight={headerHeight + INTRO_HEADER_TOP_GAP} />
        {/* зачем (бета-тест Б2, 15.10): шапка «Урок N» — плавающий слой без фона, а скрим TopFadeMask на светлой теме держит альфу 0,8 — прокручиваемый текст теории был виден ПОД заголовком и наезжал на него.
            Подложка шапки: цвет верха фона темы (тот же, что у ScreenGradient сверху) непрозрачно до низа шапки + мягкая кромка INTRO_HEADER_FEATHER; контент уходит под шапку, а не просвечивает сквозь неё. */}
        <LinearGradient
          pointerEvents="none"
          testID="lesson-intro-header-backdrop"
          colors={[introGlass.bgTop, introGlass.bgTop, introHeaderBackdropClear(introGlass.bgTop)]}
          locations={[0, headerBottom / (headerBottom + INTRO_HEADER_FEATHER), 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: headerBottom + INTRO_HEADER_FEATHER, zIndex: 9, elevation: 9 }}
        />

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
              en: 'Back',
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
                backgroundColor: introGlass.opaqueControl,
                boxShadow: nestedBoxShadow(introGlass),
                borderRadius: 22,
              },
            ]}
          >
            <BackGlyph size={20} color={introGlass.text} />
          </TapScale>

          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={[styles.headerTitle, { color: introGlass.text }]}>
              {headerLabel}
            </Text>
            <Text style={[styles.headerSubtitle, { color: introGlass.secondary }]}>
              {headerSubtitle}
            </Text>
          </View>

          {introEnergyReady ? (
            // зачем (learn.html C4): интро урока на Liquid Glass — пилюля энергии тоже стеклянная.
            <EnergyBar size={30} glass />
          ) : (
            <View
              testID="lesson-intro-energy-loading"
              // зачем (владелец 01.10): у энергии нигде нет фона — место держим прозрачным, без капсулы.
              style={{ width: 60, height: 30 }}
            />
          )}

          <ReportErrorButton
            variant="icon-flag"
            screen="lesson_intro"
            dataId={`lesson_intro_${lessonId ?? 'unknown'}_slide_${currentIndex ?? 0}`}
            dataText={currentSlideTitle}
            // зачем (12.10, английский интерфейс в R1): экранный диктор читал подпись по-русски на любом языке интерфейса.
            accessibilityLabel={triLang(lang, {
              ru: 'Сообщить об ошибке в объяснении',
              uk: 'Повідомити про помилку в поясненні',
              en: 'Report a mistake in the explanation',
              es: 'Informar de un error en la explicación',
              'pt-BR': 'Informar um erro na explicação',
              vi: 'Báo lỗi trong phần giải thích',
              id: 'Laporkan kesalahan dalam penjelasan',
              tr: 'Açıklamadaki hatayı bildir',
              pl: 'Zgłoś błąd w wyjaśnieniu',
            })}
            testID="lesson-intro-report"
            style={[
              styles.reportFlag,
              {
                backgroundColor: introGlass.opaqueControl,
                boxShadow: nestedBoxShadow(introGlass),
              },
            ]}
          />
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
            decelerationRate="fast"
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
                    glass={introGlass}
                    onLayout={handleBlockLayout}
                  />
                );
              })}

              {/* зачем: макет C2 — «Начать тренировку →» стоит под карточками, а не внутри последней. */}
              {ctaReady ? startCta : null}

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
                      backgroundColor: undefined,
                      borderColor: undefined,
                      borderWidth: 0,
                      borderRadius: 0,
                      overflow: 'visible',
                    },
                  ]}
                >
                  <Animated.Text
                    style={[
                      styles.tapHint,
                      {
                        color: introGlass.mutedText,
                        fontSize: 13,
                        lineHeight: 18,
                        transform: [{ translateY: hintBob.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }],
                      },
                    ]}
                  >
                    {tapHintLabel}
                  </Animated.Text>
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
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 21,
    marginTop: 2,
  },
  reportFlag: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
  },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  cardInner: {
    flex: 1,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  iconCircle: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    overflow: 'hidden',
    ...noAndroidOutline,
  },
  cardTitle: {
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
  },
  exampleEN: {
    letterSpacing: 0,
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tapHint: {
    textAlign: 'center',
    fontWeight: '600',
  },
  ctaInlineWrap: {
    marginTop: 22,
    width: '100%',
  },
  ctaBtn: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 56,
    borderRadius: 26,
    borderWidth: 0,
    overflow: 'hidden',
    ...noAndroidOutline,
  },
  ctaText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  ctaIconWrap: {
    position: 'absolute',
    right: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
