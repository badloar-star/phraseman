// зачем (theme_sliders_v1, макет docs/work/mockups/theme_sliders_exact.html, слово владельца 05.11): ползунок «Оттенок» (спектр) и «Насыщенность» (серый → цвет).
// Устройство — как ThemeIntensitySlider: бегунок и заливка на UI-потоке за пальцем 1:1, в JS уходят только смены целого шага и отпускание (tune_slider_controller.ts);
// вертикальная прокрутка, начатая на ползунке, отдаётся скроллу. Без Plus ползунок заперт: касание не двигает его, а зовёт onLockedPress (пейвол).
// Доступность: adjustable, шаг ±10 % диапазона, значение текстом.
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { createTuneDragController } from './tune_slider_controller';

// зачем (владелец 05.11 ~20:55 «КАК ПО МАКЕТУ»): размеры 1:1 с docs/work/mockups/theme_sliders_exact.html (.trk 34, .bar 20, .kn 32/22);
// касание остаётся ≥ 44 за счёт hitSlop по вертикали — визуально 34, пальцу 46.
const THUMB = 32;
const TRACK_H = 20;
const ROW_H = 34;
const HIT_SLOP_V = 6;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const A11Y_STEP = 0.1;

type Props = Readonly<{
  /** Цвета дорожки слева направо. */
  gradient: readonly string[];
  /** Текущее целое значение 0…max. */
  value: number;
  max: number;
  /** Цвет серединки бегунка — цвет, который выбран сейчас. */
  thumbColor: string;
  /** Тонкая полупрозрачная кромка дорожки (макет: inset 1px) — цвет из темы. */
  edgeColor?: string;
  label: string;
  valueText: string;
  locked: boolean;
  onLockedPress: () => void;
  onPreview: (value: number) => void;
  onCommit: (value: number) => void;
  testID?: string;
}>;

function TuneSliderImpl({ gradient, value, max, thumbColor, edgeColor, label, valueText, locked, onLockedPress, onPreview, onCommit, testID }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(value / max);
  const width = useSharedValue(0);
  const lastStep = useSharedValue(value);
  const dragging = useSharedValue(0);
  const pressed = useSharedValue(0);

  const onPreviewRef = useRef(onPreview);
  const onCommitRef = useRef(onCommit);
  onPreviewRef.current = onPreview;
  onCommitRef.current = onCommit;
  const controllerRef = useRef<ReturnType<typeof createTuneDragController> | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createTuneDragController({ onPreview: (v) => onPreviewRef.current(v), onCommit: (v) => onCommitRef.current(v) });
  }
  const controller = controllerRef.current;

  // Внешнее значение (миграция, «Вернуть стандартный», загрузка) — только когда палец не на ползунке.
  useEffect(() => {
    if (controller.isDragging()) return;
    const target = max > 0 ? value / max : 0;
    progress.value = reduceMotion ? target : withTiming(target, { duration: 200, easing: EASE_OUT });
    lastStep.value = value;
  }, [value, max, reduceMotion, progress, lastStep, controller]);

  const begin = useCallback((v: number) => controller.begin(v), [controller]);
  const step = useCallback((v: number) => controller.step(v), [controller]);
  const end = useCallback((v: number) => controller.end(v), [controller]);
  const commitNow = useCallback((v: number) => controller.commitNow(v), [controller]);

  const gesture = useMemo(() => {
    const toProgress = (x: number) => {
      'worklet';
      const usable = Math.max(1, width.value - THUMB);
      return Math.max(0, Math.min(1, (x - THUMB / 2) / usable));
    };
    const quantize = (p: number) => {
      'worklet';
      return Math.round(p * max);
    };
    // зачем: перетаскивание включается только при горизонтальном сдвиге — вертикальный скролл экрана не двигает ползунок и ничего не сохраняет
    const pan = Gesture.Pan()
      .hitSlop({ top: HIT_SLOP_V, bottom: HIT_SLOP_V })
      .maxPointers(1)
      .activeOffsetX([-4, 4])
      .failOffsetY([-10, 10])
      .onStart((e) => {
        dragging.value = 1;
        pressed.value = withTiming(1, { duration: 120, easing: EASE_OUT });
        const p = toProgress(e.x);
        progress.value = p;
        lastStep.value = quantize(p);
        runOnJS(begin)(lastStep.value);
      })
      .onUpdate((e) => {
        const p = toProgress(e.x);
        progress.value = p;
        const q = quantize(p);
        if (q !== lastStep.value) {
          lastStep.value = q;
          runOnJS(step)(q);
        }
      })
      .onFinalize(() => {
        if (dragging.value === 0) return;
        dragging.value = 0;
        pressed.value = withTiming(0, { duration: 160, easing: EASE_OUT });
        progress.value = withTiming(lastStep.value / max, { duration: 120, easing: EASE_OUT }); // бегунок «садится» на записанный шаг
        runOnJS(end)(lastStep.value);
      });
    const tap = Gesture.Tap()
      .hitSlop({ top: HIT_SLOP_V, bottom: HIT_SLOP_V })
      .maxDuration(300)
      .maxDistance(8)
      .onEnd((e, success) => {
        if (!success) return;
        const q = quantize(toProgress(e.x));
        lastStep.value = q;
        progress.value = withTiming(q / max, { duration: 200, easing: EASE_OUT });
        runOnJS(commitNow)(q);
      });
    return Gesture.Exclusive(pan, tap);
  }, [begin, step, end, commitNow, max, width, progress, lastStep, pressed, dragging]);

  const onLayout = useCallback((e: LayoutChangeEvent) => { width.value = e.nativeEvent.layout.width; }, [width]);
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * Math.max(0, width.value - THUMB) }, { scale: 1 + pressed.value * 0.1 }],
  }));

  const onA11y = useCallback((event: AccessibilityActionEvent) => {
    if (locked) { onLockedPress(); return; }
    const delta = event.nativeEvent.actionName === 'increment' ? A11Y_STEP : event.nativeEvent.actionName === 'decrement' ? -A11Y_STEP : 0;
    if (delta === 0) return;
    const next = Math.max(0, Math.min(max, Math.round(value + delta * max)));
    lastStep.value = next;
    commitNow(next);
  }, [locked, onLockedPress, max, value, commitNow, lastStep]);

  const body = (
    <View style={styles.hit} onLayout={onLayout}>
      <LinearGradient colors={gradient as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.track} />
      {edgeColor ? <View pointerEvents="none" style={[styles.trackEdge, { boxShadow: `inset 0 0 0 1px ${edgeColor}` }]} /> : null}
      <Animated.View style={[styles.thumb, thumbStyle]}>
        <View style={[styles.thumbCore, { backgroundColor: thumbColor }]} />
      </Animated.View>
    </View>
  );

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value, text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onA11y}
      style={[styles.row, locked && styles.locked]}
    >
      {locked ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onLockedPress} hitSlop={{ top: HIT_SLOP_V, bottom: HIT_SLOP_V }} style={styles.hit}>{body}</Pressable> : <GestureDetector gesture={gesture}>{body}</GestureDetector>}
    </View>
  );
}

export const TuneSlider = memo(TuneSliderImpl);

const styles = StyleSheet.create({
  row: { height: ROW_H, marginTop: 6 },
  locked: { opacity: 0.45 },
  hit: { flex: 1, height: ROW_H, justifyContent: 'center' },
  track: { height: TRACK_H, borderRadius: TRACK_H / 2 },
  trackEdge: { position: 'absolute', left: 0, right: 0, top: (ROW_H - TRACK_H) / 2, height: TRACK_H, borderRadius: TRACK_H / 2 },
  thumb: {
    position: 'absolute', left: 0, top: (ROW_H - THUMB) / 2, width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', // theme-exempt: ручка по макету — белое кольцо, одинаковое во всех темах
    shadowColor: '#000000', // theme-exempt: тень ручки — чёрная по макету, одинаковая во всех темах
    shadowOpacity: 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  thumbCore: { width: 22, height: 22, borderRadius: 11 },
});
