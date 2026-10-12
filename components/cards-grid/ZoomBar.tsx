/**
 * Полоса масштаба над сеткой карточек — макет cards-v2 (`.zbar`, `.zs`): слева значок «мельче», справа «крупнее», между ними дорожка 4 px
 * с четырьмя остановками и круглым бегунком 24. Бегунок идёт за пальцем, на отпускании встаёт на остановку (380 мс cubic-bezier(.2,.8,.2,1));
 * тап по значкам двигает на шаг. Справа — крупнее (шаг 0, одна колонка), слева — мельче (шаг 3, пять колонок).
 *
 * зачем (Карточки 2.0, решение владельца 12.10: «ползунок масштаба с 4 остановками»): тот же шаг, что меняет щипок, — один источник правды (`step`).
 * Optimistic UI: бегунок и сетка реагируют на палец сразу, запись масштаба — фоном (gallery_step_prefs).
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { LinearGradient } from '../SafeLinearGradient';
import { nestedBoxShadow } from '../v2/ShadowSurface';
import { GALLERY_LAST_STEP, GALLERY_MORPH_EASE, GALLERY_MORPH_MS, sliderFractionForStep, stepForSliderFraction } from './cardsGalleryLayout';

const TAG = '[CARDS-ZOOM]';
const THUMB = 24;
const EASE = Easing.bezier(...GALLERY_MORPH_EASE);
const DOTS = [0, 1, 2, 3] as const;

type Props = Readonly<{
  g: GlassTokens;
  step: number;
  onStep: (next: number) => void;
  /** Подписи для доступности. */
  smallerLabel: string;
  largerLabel: string;
  /** Необязательное поле поиска над ползунком (кадр «Поиск»). */
  search?: React.ReactNode;
}>;

function withAlpha(color: string, alphaHex: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? `${color}${alphaHex}` : color;
}

function ZoomBarInner({ g, step, onStep, smallerLabel, largerLabel, search }: Props) {
  const reduceMotion = useReduceMotion();
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);
  const p = useSharedValue(sliderFractionForStep(step));
  const dragging = useRef(false);
  const stepRef = useRef(step);
  stepRef.current = step;

  // зачем: шаг сменили извне (щипок, кнопка) — бегунок едет на остановку так же, как сетка (380 мс)
  useEffect(() => {
    if (dragging.current) return;
    p.value = withTiming(sliderFractionForStep(step), { duration: reduceMotion ? 0 : GALLERY_MORPH_MS, easing: EASE });
  }, [p, reduceMotion, step]);

  const onTrackLayout = useCallback((event: LayoutChangeEvent) => {
    const w = Math.round(event.nativeEvent.layout.width);
    trackWRef.current = w;
    setTrackW(w);
  }, []);

  const moveTo = useCallback((x: number, source: string) => {
    const w = trackWRef.current;
    if (w <= 0) { console.warn(`${TAG} ползунок: ширина дорожки неизвестна, касание x=${x} (${source}) пропущено`); return; }
    const f = Math.max(0, Math.min(1, x / w));
    p.value = f;
    const next = stepForSliderFraction(f);
    if (next !== stepRef.current) onStep(next);
  }, [onStep, p]);

  const settle = useCallback(() => {
    dragging.current = false;
    p.value = withTiming(sliderFractionForStep(stepRef.current), { duration: reduceMotion ? 0 : GALLERY_MORPH_MS, easing: EASE });
  }, [p, reduceMotion]);

  const pan = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((event) => { dragging.current = true; moveTo(event.x, 'касание'); })
    .onUpdate((event) => { moveTo(event.x, 'перетаскивание'); })
    .onFinalize(() => { settle(); }), [moveTo, settle]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * trackW - THUMB / 2 }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: p.value * trackW }));

  // зачем (R1_DIFF_ONE_FIX, cards-005): верх залипающей полосы с ползунком был 94 % (F0) — сквозь неё просвечивал перевод прокрученной карточки; верх плотный (FF), затухание только внизу
  const bg = g.bg;
  return (
    <View style={styles.bar}>
      <LinearGradient pointerEvents="none" colors={[withAlpha(bg, 'FF'), withAlpha(bg, 'FF'), withAlpha(bg, '00')]} locations={[0, 0.72, 1]} style={StyleSheet.absoluteFill} />
      {search ? <View style={styles.search}>{search}</View> : null}
      <View style={[styles.zs, search ? styles.zsWithSearch : null]}>
        <Pressable testID="fc-zoom-smaller" accessibilityRole="button" accessibilityLabel={smallerLabel} hitSlop={6} onPress={() => onStep(Math.min(GALLERY_LAST_STEP, stepRef.current + 1))} style={styles.icon}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={g.secondary} strokeWidth={1.7}>
            <Rect x={3} y={5} width={7.5} height={3.6} rx={1.2} />
            <Rect x={13.5} y={5} width={7.5} height={3.6} rx={1.2} />
            <Rect x={3} y={10.2} width={7.5} height={3.6} rx={1.2} />
            <Rect x={13.5} y={10.2} width={7.5} height={3.6} rx={1.2} />
            <Rect x={3} y={15.4} width={7.5} height={3.6} rx={1.2} />
            <Rect x={13.5} y={15.4} width={7.5} height={3.6} rx={1.2} />
          </Svg>
        </Pressable>
        <GestureDetector gesture={pan}>
          <View testID="fc-zoom-track" accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: GALLERY_LAST_STEP, now: GALLERY_LAST_STEP - step }} style={styles.track} onLayout={onTrackLayout}>
            <View pointerEvents="none" style={[styles.rail, { backgroundColor: g.dividerTone }]} />
            <Animated.View pointerEvents="none" style={[styles.fill, { backgroundColor: g.secondary }, fillStyle]} />
            {DOTS.map((k) => (
              <View key={k} /* guard-ok: ровно четыре остановки */ pointerEvents="none" style={[styles.dot, { left: (k / GALLERY_LAST_STEP) * trackW - 2.5, backgroundColor: g.mutedText }]} />
            ))}
            <Animated.View pointerEvents="none" style={[styles.thumb, { backgroundColor: g.text, boxShadow: nestedBoxShadow(g) }, thumbStyle]} />
          </View>
        </GestureDetector>
        <Pressable testID="fc-zoom-larger" accessibilityRole="button" accessibilityLabel={largerLabel} hitSlop={6} onPress={() => onStep(Math.max(0, stepRef.current - 1))} style={styles.icon}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={g.secondary} strokeWidth={1.7}>
            <Rect x={2.5} y={6.5} width={19} height={11} rx={2.8} />
          </Svg>
        </Pressable>
      </View>
    </View>
  );
}

export const ZoomBar = memo(ZoomBarInner);

const styles = StyleSheet.create({
  bar: { marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  search: { marginBottom: 0 },
  zs: { flexDirection: 'row', alignItems: 'center', height: 34 },
  zsWithSearch: { marginTop: 8 },
  icon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  track: { flex: 1, height: 34, marginHorizontal: 12, justifyContent: 'center' },
  rail: { position: 'absolute', left: 0, right: 0, top: 15, height: 4, borderRadius: 2 },
  fill: { position: 'absolute', left: 0, top: 15, height: 4, borderRadius: 2 },
  dot: { position: 'absolute', top: 14.5, width: 5, height: 5, borderRadius: 2.5 },
  thumb: { position: 'absolute', left: 0, top: 5, width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
});
