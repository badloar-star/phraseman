/**
 * cards-2.0: единая карточка фразы (§2–3.3 мастер-плана) — «физический набор в руках».
 * Один вид, один флип, одна хаптика во всех местах, где она карточка
 * (набор коллекции, words-сессия, слушание). НЕ тащить в review/арену/phrases.
 *
 * - Настоящий 3D-флип: perspective ПЕРВЫМ + rotateY, два слоя,
 *   backfaceVisibility: 'hidden' + фолбэк-переключение opacity на пороге 90°
 *   (официальный паттерн доков Reanimated — чинит старые Android и web).
 * - web / reduceMotion / lowPower → кроссфейд 150мс (FC_TIMING.fast).
 * - Press-эффект «Duolingo-кнопки»: scale 0.97 + сдвиг вниз 2px.
 * - Флип БЕЗ звука (репорт владельца): остаётся только хаптика на 90°.
 * - Декоративной полосы под карточкой нет (репорт владельца) — низ чистый.
 * - mode='grade': Gesture.Pan свайп вправо («знаю») / влево («учу») с цветным
 *   оверлеем ✓/✕ + кнопки-дублёры (web / доступность / одноручный режим).
 * - Только transform + opacity на UI-потоке (Reanimated 4).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated as RNAnimated,
  Platform,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Theme } from '../../constants/theme';
import {
  FC_FLIP_PERSPECTIVE,
  FC_SPRING,
  FC_SWIPE,
  FC_TIMING,
} from '../../constants/flashcards_motion';
import { useTheme } from '../../components/ThemeContext';
import { isLowPowerEffective } from './low_power';
import { fcHaptic, playSfx } from './SoundService';
import WordStrengthDots from './WordStrengthDots';
import type { FlashcardContentLang } from './types';
import type { WordStrength } from './word_strength';

// ── Общие хуки деградации ─────────────────────────────────────────────────────

/** Подписка на системный reduceMotion (паттерн FlashcardsCategoryHub). */
export function useFcReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (mounted) setReduceMotion(v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduceMotion;
}

/** true → вместо 3D-флипа использовать кроссфейд (web / reduceMotion / lowPower). */
export function useFcCrossfadeFlip(): boolean {
  const reduceMotion = useFcReduceMotion();
  return Platform.OS === 'web' || reduceMotion || isLowPowerEffective();
}

// ── Флип-движок для legacy RN Animated (FlashcardListItem, parent-driven anim) ─

export type LegacyFlipFaceStyles = {
  front: { opacity: RNAnimated.AnimatedInterpolation<number>; transform?: any[]; backfaceVisibility?: 'hidden' };
  back: { opacity: RNAnimated.AnimatedInterpolation<number>; transform?: any[]; backfaceVisibility?: 'hidden' };
  /** Жёсткое переключение прозрачности на 90° — реюз для слоёв поверх карточки (динамик и т.п.) */
  frontOpacity: RNAnimated.AnimatedInterpolation<number>;
  backOpacity: RNAnimated.AnimatedInterpolation<number>;
};

/**
 * Тот же 3D-флип для строк списка, где анимацией владеет родитель (RN Animated.Value 0↔1,
 * useNativeDriver). При use3D=false — чистый кроссфейд (web/reduceMotion/lowPower).
 * Opacity-переключение на пороге 90° оставлено и в 3D-ветке — фолбэк backfaceVisibility.
 */
export function buildLegacyFlipFaceStyles(anim: RNAnimated.Value, use3D: boolean): LegacyFlipFaceStyles {
  const frontOpacity = anim.interpolate({ inputRange: [0, 0.499, 0.501, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = anim.interpolate({ inputRange: [0, 0.499, 0.501, 1], outputRange: [0, 0, 1, 1] });
  if (!use3D) {
    return { front: { opacity: frontOpacity }, back: { opacity: backOpacity }, frontOpacity, backOpacity };
  }
  const frontRotateY = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotateY = anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  return {
    front: {
      opacity: frontOpacity,
      // perspective ПЕРВЫМ элементом transform (§3.3)
      transform: [{ perspective: FC_FLIP_PERSPECTIVE }, { rotateY: frontRotateY }],
      backfaceVisibility: 'hidden',
    },
    back: {
      opacity: backOpacity,
      transform: [{ perspective: FC_FLIP_PERSPECTIVE }, { rotateY: backRotateY }],
      backfaceVisibility: 'hidden',
    },
    frontOpacity,
    backOpacity,
  };
}

// ── PhraseCard ────────────────────────────────────────────────────────────────

export type PhraseCardGradeResult = 'know' | 'learn';

/**
 * Подписи свайп-индикатора «знаю / учу» — все 8 локалей интерфейса.
 * Держим здесь, а не в экране: индикатор рисует сама карточка, и без дефолта
 * он показывался бы голой иконкой (репорт владельца: «подпись стоит криво»).
 */
export const PHRASE_CARD_GRADE_LABELS: Record<
  FlashcardContentLang,
  { know: string; learn: string }
> = {
  ru: { know: 'Знаю', learn: 'Учу' },
  uk: { know: 'Знаю', learn: 'Вчу' },
  es: { know: 'Lo sé', learn: 'Aprendo' },
  'pt-BR': { know: 'Sei', learn: 'Aprendendo' },
  vi: { know: 'Đã biết', learn: 'Đang học' },
  id: { know: 'Tahu', learn: 'Belajar' },
  tr: { know: 'Biliyorum', learn: 'Öğreniyorum' },
  pl: { know: 'Znam', learn: 'Uczę się' },
};

export type PhraseCardPackTheme = {
  borderAccent: string;
  frontGradient: readonly [string, string];
  backGradient: readonly [string, string];
};

export type PhraseCardProps = {
  mode?: 'view' | 'grade';
  /** Структурный контент (обычный случай) */
  en: string;
  transcription?: string | null;
  translation?: string | null;
  /** Полный оверрайд рендера сторон (бейджи источника, кастомные слои) */
  renderFront?: () => React.ReactNode;
  renderBack?: () => React.ReactNode;
  /** Контролируемый флип; без него — внутренний стейт по тапу */
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  /** Озвучка: если задана — динамик в единой позиции справа сверху */
  onSpeakFront?: () => void;
  onSpeakBack?: () => void;
  /** grade: свайп вправо=know / влево=learn (+ кнопки-дублёры) */
  onGrade?: (result: PhraseCardGradeResult) => void;
  gradeLabels?: { know: string; learn: string };
  /** Локаль подписей свайп-индикатора (дефолт PHRASE_CARD_GRADE_LABELS). */
  lang?: FlashcardContentLang;
  /** Тема купленного пака (getCardPackPaywallTheme) — градиенты лица/рубашки */
  packTheme?: PhraseCardPackTheme | null;
  /** Тема/шрифты; по умолчанию — из useTheme() */
  t?: Theme;
  f?: Record<string, number>;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  /** Без SFX/хаптики флипа (напр. автофлип в «Слушании») */
  muted?: boolean;
  disabled?: boolean;
  testID?: string;
  /** E13: «сила слова» из SRS (§2) — 1–3 точки в углу лица; null — не рисуем. */
  strength?: WordStrength | null;
};

const CARD_RADIUS = 24;

function PhraseCardImpl({
  mode = 'view',
  en,
  transcription,
  translation,
  renderFront,
  renderBack,
  flipped,
  onFlip,
  onSpeakFront,
  onSpeakBack,
  onGrade,
  gradeLabels,
  lang = 'ru',
  packTheme = null,
  t: tProp,
  f: fProp,
  minHeight = 120,
  style,
  muted = false,
  disabled = false,
  testID,
  strength = null,
}: PhraseCardProps) {
  const ctx = useTheme();
  const t = tProp ?? ctx.theme;
  const f = fProp ?? (ctx.f as unknown as Record<string, number>);
  const crossfade = useFcCrossfadeFlip();
  const isWeb = Platform.OS === 'web';

  // ── Флип ──
  const flip = useSharedValue(0); // 0 = лицо, 1 = рубашка
  const pulse = useSharedValue(1);
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isControlled = flipped !== undefined;
  const shownFlipped = isControlled ? !!flipped : internalFlipped;
  const shownFlippedRef = useRef(shownFlipped);
  shownFlippedRef.current = shownFlipped;

  const animateFlipTo = useCallback(
    (target: 0 | 1) => {
      if (crossfade) {
        flip.value = withTiming(target, { duration: FC_TIMING.fast });
      } else {
        flip.value = withSpring(target, FC_SPRING.flip);
        // параллельный scale-пульс 1→1.04→1 (§3.3)
        pulse.value = withSequence(
          withTiming(1.04, { duration: 120 }),
          withTiming(1, { duration: 180 }),
        );
      }
    },
    [crossfade, flip, pulse],
  );

  useEffect(() => {
    animateFlipTo(shownFlipped ? 1 : 0);
  }, [shownFlipped, animateFlipTo]);

  const toggleFlip = useCallback(() => {
    if (disabled) return;
    const next = !shownFlippedRef.current;
    if (!isControlled) setInternalFlipped(next);
    onFlip?.(next);
  }, [disabled, isControlled, onFlip]);

  /**
   * Хаптика на пересечении 90° (§3.3); в кроссфейде порог тот же (середина фейда).
   * Звука флипа НЕТ (репорт владельца после теста на iPhone: «убрать звук
   * переворачивания карточки») — остальные SFX (свайп-оценка) не тронуты.
   */
  const onFlipMidpoint = useCallback(() => {
    if (muted) return;
    fcHaptic('flip');
  }, [muted]);
  useAnimatedReaction(
    () => flip.value >= 0.5,
    (past, prev) => {
      if (prev !== null && past !== prev) runOnJS(onFlipMidpoint)();
    },
    [onFlipMidpoint],
  );

  // ── Press-эффект «Duolingo-кнопки» ──
  const pressed = useSharedValue(0);
  const onPressIn = useCallback(() => {
    pressed.value = withSpring(1, FC_SPRING.press);
  }, [pressed]);
  const onPressOut = useCallback(() => {
    pressed.value = withSpring(0, FC_SPRING.press);
  }, [pressed]);

  // ── Свайп-оценка (grade) ──
  const tx = useSharedValue(0);
  const cardW = useSharedValue(320);
  const thresholdCrossed = useSharedValue(0);
  /**
   * Улёт «зафиксирован»: подпись «знаю/учу» держится на полной непрозрачности
   * до подмены карточки. Без защёлки она гасла на середине улёта (репорт: «текст
   * пропадает слишком рано»), потому что интерполяция шла только от tx.
   */
  const flyingOut = useSharedValue(0);
  /** Жест уже отдал результат — второй onEnd/onFinalize не должен его продублировать. */
  const gradeLatched = useSharedValue(0);

  const emitThresholdHaptic = useCallback(() => fcHaptic('threshold'), []);

  /**
   * Колбэки в ref: `Gesture.Pan()` пересоздавался на каждый рендер родителя
   * (onGrade обычно инлайн-стрелка), GestureDetector переподключал жест прямо
   * посреди свайпа — палец «терялся», и карточка пружиной возвращалась назад
   * (репорт владельца: «карточки прыгают назад»). Теперь объект жеста собран
   * один раз на примитивных зависимостях.
   */
  const onGradeRef = useRef(onGrade);
  onGradeRef.current = onGrade;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const handleGrade = useCallback(
    (result: PhraseCardGradeResult) => {
      if (!mutedRef.current) {
        playSfx(result === 'know' ? 'swipe_know' : 'swipe_learn');
        fcHaptic(result === 'know' ? 'swipe_know' : 'swipe_learn');
      }
      onGradeRef.current?.(result);
      // Сброс позиции — родитель обычно подставляет следующую карточку
      cancelAnimation(tx);
      tx.value = 0;
      thresholdCrossed.value = 0;
      flyingOut.value = 0;
      gradeLatched.value = 0;
    },
    [flyingOut, gradeLatched, thresholdCrossed, tx],
  );

  /** Возврат карточки на место — общий путь для «не дотянул» и отмены жеста. */
  const snapBack = useCallback(() => {
    'worklet';
    thresholdCrossed.value = 0;
    flyingOut.value = 0;
    tx.value = withSpring(0, FC_SPRING.return);
  }, [flyingOut, thresholdCrossed, tx]);

  const panEnabled = mode === 'grade' && !isWeb && !disabled;
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(panEnabled)
        // Горизонт — наш, вертикаль отдаём скроллу списка (иначе Pan крал скролл
        // и жест срывался посреди движения).
        .activeOffsetX([-FC_SWIPE.activationOffsetX, FC_SWIPE.activationOffsetX])
        .failOffsetY([-FC_SWIPE.failOffsetY, FC_SWIPE.failOffsetY])
        .onBegin(() => {
          // Незавершённый возврат предыдущего жеста не должен драться с новым.
          cancelAnimation(tx);
          gradeLatched.value = 0;
          flyingOut.value = 0;
        })
        .onUpdate((e) => {
          tx.value = e.translationX;
          const threshold = cardW.value * FC_SWIPE.thresholdRatio;
          if (Math.abs(e.translationX) > threshold) {
            if (thresholdCrossed.value === 0) {
              thresholdCrossed.value = 1;
              runOnJS(emitThresholdHaptic)();
            }
          } else {
            thresholdCrossed.value = 0;
          }
        })
        .onEnd((e) => {
          if (gradeLatched.value === 1) return;
          const threshold = cardW.value * FC_SWIPE.thresholdRatio;
          const passed =
            Math.abs(e.translationX) > threshold ||
            Math.abs(e.velocityX) > FC_SWIPE.velocityThreshold;
          if (!passed) {
            snapBack();
            return;
          }
          gradeLatched.value = 1;
          flyingOut.value = 1;
          // Направление берём по знаку смещения, а на «чистом флике» (смещение
          // почти нулевое) — по знаку скорости, иначе быстрый флик влево уходил вправо.
          const signed = e.translationX !== 0 ? e.translationX : e.velocityX;
          const dir: PhraseCardGradeResult = signed >= 0 ? 'know' : 'learn';
          tx.value = withTiming(
            Math.sign(signed || 1) * cardW.value * 1.2,
            { duration: FC_SWIPE.flyOutMs },
            (finished) => {
              if (finished) runOnJS(handleGrade)(dir);
              else snapBack();
            },
          );
        })
        .onFinalize((_e, success) => {
          // Отмена жеста системой (скролл/шторка/переход) — карточка не должна
          // зависнуть посреди экрана.
          if (!success && gradeLatched.value === 0) snapBack();
        }),
    [
      panEnabled,
      tx,
      cardW,
      thresholdCrossed,
      flyingOut,
      gradeLatched,
      emitThresholdHaptic,
      handleGrade,
      snapBack,
    ],
  );

  // ── Animated styles (только transform + opacity) ──
  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: interpolate(pressed.value, [0, 1], [0, 2]) },
      {
        rotateZ: `${interpolate(
          tx.value,
          [-cardW.value, 0, cardW.value],
          [-FC_SWIPE.rotateZDeg, 0, FC_SWIPE.rotateZDeg],
        )}deg`,
      },
      { scale: interpolate(pressed.value, [0, 1], [1, 0.97]) * pulse.value },
    ],
  }));

  const frontStyle = useAnimatedStyle(() => {
    if (crossfade) {
      return { opacity: interpolate(flip.value, [0, 0.5, 1], [1, 0, 0]) };
    }
    return {
      // Фолбэк backfaceVisibility: жёсткое переключение opacity на 90°
      opacity: flip.value < 0.5 ? 1 : 0,
      transform: [
        { perspective: FC_FLIP_PERSPECTIVE },
        { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` },
      ],
      backfaceVisibility: 'hidden' as const,
    };
  }, [crossfade]);

  const backStyle = useAnimatedStyle(() => {
    if (crossfade) {
      return { opacity: interpolate(flip.value, [0, 0.5, 1], [0, 0, 1]) };
    }
    return {
      opacity: flip.value >= 0.5 ? 1 : 0,
      transform: [
        { perspective: FC_FLIP_PERSPECTIVE },
        { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` },
      ],
      backfaceVisibility: 'hidden' as const,
    };
  }, [crossfade]);

  /**
   * Оверлеи свайпа. Было: интерполяция без CLAMP от 0 до порога улёта — подпись
   * успевала показаться только у самого порога, а на противоположной стороне
   * opacity уходила в минус (RN клампил, но на iOS это давало мигание).
   * Стало: полная непрозрачность уже на FC_SWIPE.labelFullRatio ширины, жёсткий
   * CLAMP и защёлка `flyingOut` — подпись держится весь жест и весь улёт.
   */
  const knowOverlayStyle = useAnimatedStyle(() => {
    const full = Math.max(1, cardW.value * FC_SWIPE.labelFullRatio);
    const byDrag = interpolate(tx.value, [0, full], [0, 1], Extrapolation.CLAMP);
    return { opacity: flyingOut.value === 1 && tx.value >= 0 ? 1 : byDrag };
  });
  const learnOverlayStyle = useAnimatedStyle(() => {
    const full = Math.max(1, cardW.value * FC_SWIPE.labelFullRatio);
    const byDrag = interpolate(tx.value, [-full, 0], [1, 0], Extrapolation.CLAMP);
    return { opacity: flyingOut.value === 1 && tx.value < 0 ? 1 : byDrag };
  });

  const accent = packTheme?.borderAccent ?? t.accent;
  /** Подписи свайп-индикатора: явный проп важнее, иначе локаль (8 языков). */
  const swipeLabels = gradeLabels ?? PHRASE_CARD_GRADE_LABELS[lang] ?? PHRASE_CARD_GRADE_LABELS.ru;
  /**
   * Подпись индикатора: одинаковый стиль для «знаю» и «учу», центрирование по
   * оси карточки (раньше подпись стояла криво — её просто не было, а иконка
   * жила без общей типографики).
   */
  const swipeLabelTextStyle = (color: string) => ({
    color,
    marginTop: 10,
    fontSize: (f.h2 ?? f.body ?? 17) + 1,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    width: '100%' as const,
  });
  const faceBaseStyle: ViewStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  };

  const defaultFront = (
    <>
      <Text
        maxFontSizeMultiplier={1.35}
        numberOfLines={4}
        style={{ color: t.textPrimary, fontSize: (f.h1 ?? 22) + 2, fontWeight: '600', textAlign: 'center', width: '100%' }}
      >
        {en}
      </Text>
      {transcription?.trim() ? (
        <Text
          maxFontSizeMultiplier={1.35}
          numberOfLines={3}
          style={{ color: t.textMuted, fontSize: f.sub ?? 14, marginTop: 6, textAlign: 'center', fontStyle: 'italic', letterSpacing: 0.25 }}
        >
          {transcription.trim()}
        </Text>
      ) : null}
    </>
  );
  const defaultBack = (
    <Text
      maxFontSizeMultiplier={1.35}
      numberOfLines={6}
      style={{ color: t.textPrimary, fontSize: (f.h1 ?? 22), fontWeight: '400', textAlign: 'center', width: '100%' }}
    >
      {translation ?? ''}
    </Text>
  );

  const speakBtn = (side: 'front' | 'back', onSpeak?: () => void) =>
    onSpeak ? (
      // Правило FLASHCARDS_RULES §3: НЕ e.stopPropagation() — responder-обёртка
      <View
        onStartShouldSetResponder={() => true}
        style={{ position: 'absolute', top: 10, right: 10, zIndex: 5 }}
      >
        <Pressable
          onPress={onSpeak}
          accessibilityRole="button"
          hitSlop={8}
          testID={testID ? `${testID}-speak-${side}` : undefined}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${t.bgSurface}F0`,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Ionicons name="volume-medium" size={16} color={accent} />
        </Pressable>
      </View>
    ) : null;

  const card = (
    <Reanimated.View style={[outerStyle, style]} testID={testID}>
      <Pressable
        onPress={toggleFlip}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: shownFlipped }}
        testID={testID ? `${testID}-flip` : undefined}
        style={{ minHeight, width: '100%' }}
        onLayout={(e) => {
          cardW.value = Math.max(1, e.nativeEvent.layout.width);
        }}
      >
        {/* Лицо: EN + транскрипция */}
        <Reanimated.View
          style={[
            faceBaseStyle,
            packTheme
              ? { backgroundColor: 'transparent', borderColor: packTheme.borderAccent }
              : { backgroundColor: t.bgCard, borderColor: t.border },
            frontStyle,
          ]}
        >
          {packTheme ? (
            <LinearGradient
              colors={[...packTheme.frontGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CARD_RADIUS }}
            />
          ) : null}
          {renderFront ? renderFront() : defaultFront}
          {speakBtn('front', onSpeakFront)}
          {/* E13: точки силы слова (Weak/Medium/Strong из SRS, §2) */}
          {strength ? (
            <WordStrengthDots
              strength={strength}
              t={t}
              style={{ position: 'absolute', bottom: 12, left: 16 }}
              testID={testID ? `${testID}-strength` : undefined}
            />
          ) : null}
        </Reanimated.View>

        {/* Рубашка: перевод */}
        <Reanimated.View
          style={[
            faceBaseStyle,
            packTheme
              ? { backgroundColor: 'transparent', borderColor: packTheme.borderAccent }
              : { backgroundColor: t.bgSurface, borderColor: `${accent}80` },
            backStyle,
          ]}
        >
          {packTheme ? (
            <LinearGradient
              colors={[...packTheme.backGradient]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CARD_RADIUS }}
            />
          ) : null}
          {renderBack ? renderBack() : defaultBack}
          {speakBtn('back', onSpeakBack)}
        </Reanimated.View>

        {/* Невидимый спейсер задаёт высоту (стороны absolute) */}
        <View style={{ minHeight, opacity: 0 }} pointerEvents="none">
          {renderFront ? renderFront() : defaultFront}
        </View>

        {/* Цветные оверлеи свайпа: иконка + подпись, ровно по центру карточки */}
        {mode === 'grade' && (
          <>
            <Reanimated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                faceBaseStyle,
                { backgroundColor: `${t.correct}2E`, borderColor: t.correct, borderWidth: 2 },
                knowOverlayStyle,
              ]}
              testID={testID ? `${testID}-swipe-know` : 'fc-swipe-know'}
            >
              <Ionicons name="checkmark-circle" size={56} color={t.correct} />
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={swipeLabelTextStyle(t.correct)}
              >
                {swipeLabels.know}
              </Text>
            </Reanimated.View>
            <Reanimated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                faceBaseStyle,
                { backgroundColor: `${t.wrong}2E`, borderColor: t.wrong, borderWidth: 2 },
                learnOverlayStyle,
              ]}
              testID={testID ? `${testID}-swipe-learn` : 'fc-swipe-learn'}
            >
              <Ionicons name="close-circle" size={56} color={t.wrong} />
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={swipeLabelTextStyle(t.wrong)}
              >
                {swipeLabels.learn}
              </Text>
            </Reanimated.View>
          </>
        )}
      </Pressable>
      {/*
        Декоративной «толстой» нижней грани здесь больше нет (репорт владельца
        после теста на iPhone: «убрать полоску снизу карточки»). Press-эффект
        остался в outerStyle — scale + сдвиг вниз, только transform.
      */}
    </Reanimated.View>
  );

  return (
    <View style={{ width: '100%' }}>
      {mode === 'grade' && !isWeb ? <GestureDetector gesture={pan}>{card}</GestureDetector> : card}
      {mode === 'grade' && (
        // Кнопки-дублёры: единственный способ оценки на web + доступность/одноручный режим
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 14 }}>
          <Pressable
            onPress={() => handleGrade('learn')}
            accessibilityRole="button"
            accessibilityLabel={gradeLabels?.learn ?? '✕'}
            testID={testID ? `${testID}-grade-learn` : 'fc-grade-learn'}
            style={({ pressed: p }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 22,
              paddingVertical: 12,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: t.wrong,
              backgroundColor: `${t.wrong}1A`,
              transform: [{ scale: p ? 0.97 : 1 }],
            })}
          >
            <Ionicons name="close" size={20} color={t.wrong} />
            {gradeLabels?.learn ? (
              <Text style={{ color: t.wrong, fontSize: f.body ?? 15, fontWeight: '700' }}>{gradeLabels.learn}</Text>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => handleGrade('know')}
            accessibilityRole="button"
            accessibilityLabel={gradeLabels?.know ?? '✓'}
            testID={testID ? `${testID}-grade-know` : 'fc-grade-know'}
            style={({ pressed: p }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 22,
              paddingVertical: 12,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: t.correct,
              backgroundColor: `${t.correct}1A`,
              transform: [{ scale: p ? 0.97 : 1 }],
            })}
          >
            <Ionicons name="checkmark" size={20} color={t.correct} />
            {gradeLabels?.know ? (
              <Text style={{ color: t.correct, fontSize: f.body ?? 15, fontWeight: '700' }}>{gradeLabels.know}</Text>
            ) : null}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const PhraseCard = React.memo(PhraseCardImpl);
export default PhraseCard;
