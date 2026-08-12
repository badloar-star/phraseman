/**
 * cards-2.0: единая карточка фразы (§2–3.3 мастер-плана) — «физическая колода в руках».
 * Один вид, один флип, один звук, одна хаптика во всех местах, где она карточка
 * (колода коллекции, words-сессия, слушание). НЕ тащить в review/арену/phrases.
 *
 * - Настоящий 3D-флип: perspective ПЕРВЫМ + rotateY, два слоя,
 *   backfaceVisibility: 'hidden' + фолбэк-переключение opacity на пороге 90°
 *   (официальный паттерн доков Reanimated — чинит старые Android и web).
 * - web / reduceMotion / lowPower → кроссфейд 150мс (FC_TIMING.fast).
 * - Press-эффект «Duolingo-кнопки»: scale 0.97 + сдвиг вниз 2px + сжатие нижней грани.
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
const EDGE_H = 4; // «толстая» нижняя грань в цвет акцента

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

  // Хаптика + SFX на пересечении 90° (§3.3); в кроссфейде порог тот же (середина фейда)
  const onFlipMidpoint = useCallback(() => {
    if (muted) return;
    fcHaptic('flip');
    playSfx('flip');
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

  const emitThresholdHaptic = useCallback(() => fcHaptic('threshold'), []);
  const handleGrade = useCallback(
    (result: PhraseCardGradeResult) => {
      if (!muted) {
        playSfx(result === 'know' ? 'swipe_know' : 'swipe_learn');
        fcHaptic(result === 'know' ? 'swipe_know' : 'swipe_learn');
      }
      onGrade?.(result);
      // Сброс позиции — родитель обычно подставляет следующую карточку
      tx.value = 0;
      thresholdCrossed.value = 0;
    },
    [muted, onGrade, thresholdCrossed, tx],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(mode === 'grade' && !isWeb && !disabled)
        .activeOffsetX([-FC_SWIPE.activationOffsetX, FC_SWIPE.activationOffsetX])
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
          const threshold = cardW.value * FC_SWIPE.thresholdRatio;
          const passed =
            Math.abs(e.translationX) > threshold ||
            Math.abs(e.velocityX) > FC_SWIPE.velocityThreshold;
          if (passed) {
            const dir: PhraseCardGradeResult = e.translationX >= 0 ? 'know' : 'learn';
            tx.value = withTiming(
              Math.sign(e.translationX || 1) * cardW.value * 1.2,
              { duration: FC_SWIPE.flyOutMs },
              (finished) => {
                if (finished) runOnJS(handleGrade)(dir);
              },
            );
          } else {
            thresholdCrossed.value = 0;
            tx.value = withSpring(0, FC_SPRING.return);
          }
        }),
    [mode, isWeb, disabled, tx, cardW, thresholdCrossed, emitThresholdHaptic, handleGrade],
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

  const edgeStyle = useAnimatedStyle(() => ({
    // Грань «сжимается» при нажатии — только transform (высоту не анимируем)
    transform: [{ scaleY: interpolate(pressed.value, [0, 1], [1, 0.45]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.7]),
  }));

  const knowOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, cardW.value * FC_SWIPE.thresholdRatio], [0, 1]),
  }));
  const learnOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-cardW.value * FC_SWIPE.thresholdRatio, 0], [1, 0]),
  }));

  const accent = packTheme?.borderAccent ?? t.accent;
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
        adjustsFontSizeToFit
        minimumFontScale={0.5}
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
      adjustsFontSizeToFit
      minimumFontScale={0.5}
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

        {/* Цветные оверлеи свайпа ✓/✕ */}
        {mode === 'grade' && (
          <>
            <Reanimated.View
              pointerEvents="none"
              style={[
                faceBaseStyle,
                { backgroundColor: `${t.correct}2E`, borderColor: t.correct, borderWidth: 2 },
                knowOverlayStyle,
              ]}
            >
              <Ionicons name="checkmark-circle" size={56} color={t.correct} />
            </Reanimated.View>
            <Reanimated.View
              pointerEvents="none"
              style={[
                faceBaseStyle,
                { backgroundColor: `${t.wrong}2E`, borderColor: t.wrong, borderWidth: 2 },
                learnOverlayStyle,
              ]}
            >
              <Ionicons name="close-circle" size={56} color={t.wrong} />
            </Reanimated.View>
          </>
        )}
      </Pressable>

      {/* «Толстая» нижняя грань 4px в цвет акцента (Duolingo-press) */}
      <Reanimated.View
        pointerEvents="none"
        style={[
          {
            height: EDGE_H,
            marginTop: -EDGE_H / 2,
            marginHorizontal: 10,
            borderBottomLeftRadius: CARD_RADIUS,
            borderBottomRightRadius: CARD_RADIUS,
            backgroundColor: accent,
          },
          edgeStyle,
        ]}
      />
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
