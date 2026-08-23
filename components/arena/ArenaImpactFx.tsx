import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient as SvgRadialGradient, Rect, Stop } from 'react-native-svg';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Премиум-слои кульминаций Арены — вспышка экрана, лучи, золотая пыль.
 *
 * зачем: владелец (2026-08-23) принял премиум-макет
 * .motion-mockups/phraseman-arena-stars.html; эти слои нужны и модалкам
 * смены ранга, и экрану итога — поэтому живут отдельно от сцен.
 * Всё движение — transform/opacity: UI-тред, без тиков JS по кадрам.
 */

/** Вспышка всего экрана в момент удара: радиальный золотой свет 0.5→0. */
export function ImpactFlash({ opacity }: { opacity: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <SvgRadialGradient id="arimpactflash" cx="50%" cy="46%" r="62%">
            <Stop offset="0" stopColor="#FFE082" stopOpacity={0.55} />
            <Stop offset="0.45" stopColor="#FFD43B" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#FFD43B" stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#arimpactflash)" />
      </Svg>
    </Reanimated.View>
  );
}

/** Запускает стандартную вспышку удара: 0.5 → 0 за 460ms. */
export function fireImpactFlash(opacity: SharedValue<number>, peak = 0.5): void {
  opacity.value = withSequence(
    withTiming(peak, { duration: 0 }),
    withTiming(0, { duration: 460, easing: Easing.linear }),
  );
}

/**
 * Лучи за эмблемой: световой веер разгорается и медленно плывёт.
 * Конечная анимация (10°→40° за 6с), не вечный цикл — Performance Bible.
 */
const RAY_COUNT = 8;
export function RaysHalo({ delayMs, reduceMotion, size = 300 }: { delayMs: number; reduceMotion: boolean; size?: number }) {
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) { opacity.value = 0.5; return; }
    opacity.value = withDelay(delayMs, withTiming(0.85, { duration: 900, easing: Easing.out(Easing.quad) }));
    rotate.value = withDelay(delayMs, withSequence(
      withTiming(10, { duration: 900, easing: Easing.out(Easing.quad) }),
      withTiming(40, { duration: 6000, easing: Easing.linear }),
    ));
    return () => { cancelAnimation(opacity); cancelAnimation(rotate); };
    // зачем: хореография собирается один раз на монтирование сцены.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ rotate: `${rotate.value}deg` }] }));
  const half = size / 2;
  return (
    <Reanimated.View pointerEvents="none" style={[styles.rays, { width: size, height: size, marginLeft: -half, marginTop: -half }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <SvgRadialGradient id="arraysfade" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFD86E" stopOpacity={0.12} />
            <Stop offset="0.62" stopColor="#FFD86E" stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        {Array.from({ length: RAY_COUNT }, (_, i) => {
          const a = (i / RAY_COUNT) * Math.PI * 2;
          const x = 50 + Math.cos(a) * 50, y = 50 + Math.sin(a) * 50;
          const xw = 50 + Math.cos(a + 0.16) * 50, yw = 50 + Math.sin(a + 0.16) * 50;
          return <Path key={i} d={`M50 50 L${x} ${y} L${xw} ${yw} Z`} fill="#FFD86E" opacity={0.09} />; // guard-ok: фиксированный веер
        })}
        <Rect x="0" y="0" width="100" height="100" fill="url(#arraysfade)" />
      </Svg>
    </Reanimated.View>
  );
}

/** Золотая пылинка: медленно оседает вниз после кульминации. */
const DustFallMote = memo(function DustFallMote({ index, delayMs, reduceMotion }: { index: number; delayMs: number; reduceMotion: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.value = withDelay(delayMs + index * 40, withTiming(1, { duration: 1300 + (index % 4) * 220, easing: Easing.bezier(0.3, 0.6, 0.6, 1) }));
    return () => cancelAnimation(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);
  // Детерминированный разлёт по индексу: без Math.random (контракт сцен).
  const drift = ((index % 5) - 2) * 12;
  const startX = ((index % 7) - 3) * 9;
  const style = useAnimatedStyle(() => ({
    opacity: t.value <= 0 ? 0 : 0.9 * (1 - t.value),
    transform: [
      { translateX: startX + drift * t.value },
      { translateY: 10 + (58 + (index % 3) * 18) * t.value },
    ],
  }));
  return <Reanimated.View pointerEvents="none" style={[styles.dustMote, style]} />;
});

export function GoldDustFall({ delayMs, count, reduceMotion }: { delayMs: number; count: number; reduceMotion: boolean }) {
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={styles.dustWrap}>
      {Array.from({ length: count }, (_, i) => (
        <DustFallMote key={i} index={i} delayMs={delayMs} reduceMotion={reduceMotion} /> // guard-ok: фиксированный залп
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rays: { position: 'absolute', left: '50%', top: '54%' },
  dustWrap: { position: 'absolute', left: '50%', top: '55%', width: 0, height: 0, alignItems: 'center' },
  dustMote: { position: 'absolute', width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: '#FFE082' },
});
