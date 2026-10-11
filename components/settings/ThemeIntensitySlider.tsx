// зачем (владелец 2026-10-04): «убираем 3 кнопки (Акцент / Максимум / Спокойно) и вместо
// этого делаем только ползунок — тянешь, и на глазах меняется насыщенность».
// • Бегунок и заливка двигаются на UI-потоке (shared value) за пальцем 1:1 — без анимации,
//   иначе ползунок «отстаёт» от пальца.
// • В JS уходят только смены шага 0.05 (≤ 21 за проход) → тема перекрашивается превью,
//   без записи на диск; отпускание → одна запись (theme_intensity_drag.ts).
// • Хаптик — только на опорных точках 0 / 25 / 50 / 75 / 100 %.
// • Доступность: adjustable, шаг ±10 %, значение в процентах.
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapticTap } from '../../hooks/use-haptics';
import { liquidGlassTokens, type GlassTokens, type LiquidGlassThemeId } from '../../constants/liquidGlassThemePalette';
import { LIQUID_GLASS_INTENSITY_STEP } from '../../constants/liquidGlassThemeIntensity';
import { createThemeIntensityDragController } from './theme_intensity_drag';

// зачем: в части тестовых окружений глобального __DEV__ нет — лог [THEME-INTENSITY] не должен ронять гидратацию.
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const THUMB = 28;
const TRACK_H = 8;
const ROW_H = 56;
const PAD_X = 14;
const ICON = 18;
const ICON_GAP = 12;
// зачем: сильный ease-out — ответ на тап начинается сразу, а не «разгоняется».
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const A11Y_STEP = 0.1;

type Props = Readonly<{
  glass: GlassTokens;
  themeId: LiquidGlassThemeId;
  value: number;
  label: string;
  onPreview: (intensity: number | null) => void;
  onCommit: (intensity: number) => void;
}>;

function ThemeIntensitySliderImpl({ glass, themeId, value, label, onPreview, onCommit }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(value);
  const width = useSharedValue(0);
  const lastStep = useSharedValue(value);
  const pressed = useSharedValue(0);
  const dragging = useSharedValue(0);

  // зачем: цвет заливки на UI-потоке — между опорными палитрами ЭТОЙ темы, а не общий.
  const fill = useMemo(() => {
    const at = (intensity: number) => liquidGlassTokens(themeId, { level: 'calm', appearance: glass.appearance, intensity });
    return [at(0).accent, at(0.5).accent, at(1).accent] as const;
  }, [themeId, glass.appearance]);

  const onPreviewRef = useRef(onPreview);
  const onCommitRef = useRef(onCommit);
  onPreviewRef.current = onPreview;
  onCommitRef.current = onCommit;
  // Контроллер один на всю жизнь компонента (ленивая инициализация, не на каждый рендер).
  const controllerRef = useRef<ReturnType<typeof createThemeIntensityDragController> | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createThemeIntensityDragController({
      onPreview: (i) => onPreviewRef.current(i),
      onCommit: (i) => onCommitRef.current(i),
      onDetent: () => {
        void hapticTap().catch((e: unknown) => {
          if (IS_DEV) console.log('[THEME-INTENSITY] haptic failed', e);
        });
      },
    });
  }
  const controller = controllerRef.current;

  // Внешнее значение (миграция при старте, смена из кода) — только когда палец не на ползунке.
  useEffect(() => {
    if (controller.isDragging()) return;
    progress.value = reduceMotion ? value : withTiming(value, { duration: 200, easing: EASE_OUT });
    lastStep.value = value;
  }, [value, reduceMotion, progress, lastStep, controller]);

  const begin = useCallback((i: number) => controller.begin(i), [controller]);
  const step = useCallback((i: number) => controller.step(i), [controller]);
  const end = useCallback((i: number) => controller.end(i), [controller]);
  const commitNow = useCallback((i: number) => controller.commitNow(i), [controller]);

  const gesture = useMemo(() => {
    const toValue = (x: number) => {
      'worklet';
      const usable = Math.max(1, width.value - THUMB);
      return Math.max(0, Math.min(1, (x - THUMB / 2) / usable));
    };
    const quantize = (v: number) => {
      'worklet';
      return Math.round(Math.round(v / LIQUID_GLASS_INTENSITY_STEP) * LIQUID_GLASS_INTENSITY_STEP * 100) / 100;
    };
    // зачем: перетаскивание включается только при горизонтальном сдвиге — вертикальная
    // прокрутка списка, начатая на ползунке, отдаётся скроллу и НИЧЕГО не сохраняет.
    const pan = Gesture.Pan()
      .maxPointers(1)
      .activeOffsetX([-4, 4])
      .failOffsetY([-10, 10])
      .onStart((e) => {
        dragging.value = 1;
        pressed.value = withTiming(1, { duration: 120, easing: EASE_OUT });
        const v = toValue(e.x);
        progress.value = v;
        lastStep.value = quantize(v);
        runOnJS(begin)(lastStep.value);
      })
      .onUpdate((e) => {
        const v = toValue(e.x);
        progress.value = v;
        const q = quantize(v);
        if (q !== lastStep.value) {
          lastStep.value = q;
          runOnJS(step)(q);
        }
      })
      .onFinalize(() => {
        if (dragging.value === 0) return;
        dragging.value = 0;
        pressed.value = withTiming(0, { duration: 160, easing: EASE_OUT });
        // зачем: бегунок «садится» на сохранённый шаг — что видишь, то и записано.
        progress.value = withTiming(lastStep.value, { duration: 120, easing: EASE_OUT });
        runOnJS(end)(lastStep.value);
      });
    // Тап по дорожке — перескок в точку касания и сразу сохранение.
    const tap = Gesture.Tap()
      .maxDuration(300)
      .maxDistance(8)
      .onEnd((e, success) => {
        if (!success) return;
        const q = quantize(toValue(e.x));
        lastStep.value = q;
        progress.value = withTiming(q, { duration: 200, easing: EASE_OUT });
        runOnJS(commitNow)(q);
      });
    return Gesture.Exclusive(pan, tap);
  }, [begin, step, end, commitNow, width, progress, lastStep, pressed, dragging]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width;
  }, [width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: THUMB / 2 + progress.value * Math.max(0, width.value - THUMB),
    backgroundColor: interpolateColor(progress.value, [0, 0.5, 1], [fill[0], fill[1], fill[2]]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * Math.max(0, width.value - THUMB) },
      { scale: 1 + pressed.value * 0.12 },
    ],
  }));

  const percent = Math.round(value * 100);
  const onA11y = useCallback((event: AccessibilityActionEvent) => {
    const delta = event.nativeEvent.actionName === 'increment' ? A11Y_STEP
      : event.nativeEvent.actionName === 'decrement' ? -A11Y_STEP : 0;
    if (delta === 0) return;
    const next = Math.max(0, Math.min(1, value + delta));
    lastStep.value = next;
    commitNow(next);
  }, [value, commitNow, lastStep]);

  return (
    <View
      testID="theme-intensity-slider"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onA11y}
      style={[styles.row, { backgroundColor: glass.opaqueControl }]}
    >
      <Ionicons name="water-outline" size={ICON} color={glass.secondary} />
      <GestureDetector gesture={gesture}>
        <View style={styles.hit} onLayout={onLayout}>
          <View style={[styles.track, { backgroundColor: glass.line }]}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: glass.isLight ? '#FFFFFF' : glass.text, shadowColor: glass.isLight ? glass.shadowTint : '#000000' }, // theme-exempt: ручка ползунка: белая заливка и чёрная тень — постоянные
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>
      <Ionicons name="water" size={ICON} color={glass.accentText} />
    </View>
  );
}

export const ThemeIntensitySlider = memo(ThemeIntensitySliderImpl);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ICON_GAP,
    height: ROW_H,
    paddingHorizontal: PAD_X,
    borderRadius: 16,
    marginTop: 20,
  },
  // Зона касания на всю высоту строки — палец не обязан попадать в 8-пиксельную дорожку.
  hit: { flex: 1, height: ROW_H, justifyContent: 'center' },
  track: { height: TRACK_H, borderRadius: TRACK_H / 2, overflow: 'hidden', marginHorizontal: 0 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: TRACK_H / 2 },
  thumb: {
    position: 'absolute',
    left: 0,
    top: (ROW_H - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
