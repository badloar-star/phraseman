// ─── Визитка 2.0: повышение ранга прямо в визитке (макет VC-UP-*) ─────────────
// зачем (владелец 2026-09-30): эпичная анимация повышения — в самой визитке, у «Про»
// богаче. Таймлайн 6,5 с 1:1 с keyframes макета (доли p = проценты CSS):
//  заряд 0–26% (монета дрожит, ореол разгорается; у «Про» стягиваются искры) →
//  переворот 26–42% (старая уходит ребром, новая выходит с перелётом) →
//  удар 34% (вспышка, ударная волна; у «Про» вторая волна, лучи, разлёт искр, кант) →
//  новый титул 42–52%, плашка «Новый ранг» 44–94%.
// В приложении таймлайн проигрывается ОДИН раз (в макете — петля для показа).
// Празднование не durable: ранг и списание уже записаны до старта (useCoinRankUpgrade).
// При «уменьшить движение» — сразу финальный кадр (как в макете).
import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { DebugLogger } from '../../app/debug-logger';
import { CoinImage } from './ProfileCardCoin';
import { noAndroidOutline } from '../../constants/androidGlow';
import { useShadowGlass } from '../v2/ShadowSurface';
import { colorWithAlpha } from '../v2/plateAlpha';

export const RANK_UP_DURATION_MS = 6500;
const CLAMP = Extrapolation.CLAMP;

/** Один прогон таймлайна 0→1. active=false — стоит в 0. */
export function useRankUpTimeline(active: boolean, reduceMotion: boolean, onDone: () => void): SharedValue<number> {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      cancelAnimation(t);
      t.value = 0;
      return undefined;
    }
    DebugLogger.info('[PROFILE-CARD]', `повышение: анимация в визитке стартует ${JSON.stringify({ reduceMotion })}`);
    if (reduceMotion) {
      t.value = 0.6; // финальный кадр: новая монета и новый титул уже на месте
      const timer = setTimeout(onDone, 1600);
      return () => clearTimeout(timer);
    }
    t.value = 0;
    t.value = withTiming(1, { duration: RANK_UP_DURATION_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
    return () => cancelAnimation(t);
    // onDone намеренно не в зависимостях: смена колбэка не должна перезапускать праздник.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion, t]);
  return t;
}

function wedges(r: number, count: number, wedgeDeg: number): string {
  const step = 360 / count;
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const a0 = (i * step * Math.PI) / 180;
    const a1 = ((i * step + wedgeDeg) * Math.PI) / 180;
    parts.push(`M${r},${r}L${(r + r * Math.cos(a0)).toFixed(2)},${(r + r * Math.sin(a0)).toFixed(2)}L${(r + r * Math.cos(a1)).toFixed(2)},${(r + r * Math.sin(a1)).toFixed(2)}Z`);
  }
  return parts.join('');
}

type Spark = Readonly<{ x: number; y: number; delay: number }>;

function sparks(n: number, r0: number, step: number): Spark[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = r0 + (i % 3) * step;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, delay: ((i % 5) * 0.025) / (RANK_UP_DURATION_MS / 1000) };
  });
}

function SparkDot({ t, spark, inward, cx, cy }: { t: SharedValue<number>; spark: Spark; inward: boolean; cx: number; cy: number }) {
  const style = useAnimatedStyle(() => {
    const p = t.value - spark.delay;
    if (inward) {
      const move = interpolate(p, [0.04, 0.3], [1, 0], CLAMP);
      return {
        opacity: interpolate(p, [0.04, 0.1, 0.3, 0.32], [0, 1, 1, 0], CLAMP),
        transform: [
          { translateX: spark.x * move },
          { translateY: spark.y * move },
          { scale: interpolate(p, [0.04, 0.3, 0.32], [1, 0.4, 0.2], CLAMP) },
        ],
      };
    }
    const move = interpolate(p, [0.33, 0.72], [0, 1], CLAMP);
    return {
      opacity: interpolate(p, [0.33, 0.35, 0.72], [0, 1, 0], CLAMP),
      transform: [
        { translateX: spark.x * (1 - Math.pow(1 - move, 3)) },
        { translateY: spark.y * (1 - Math.pow(1 - move, 3)) },
        { scale: interpolate(p, [0.33, 0.72], [1.2, 0.3], CLAMP) },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute', left: cx - 3.5, top: cy - 3.5, width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: '#FFF3CF', shadowColor: '#FFDC96', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, // theme-exempt: иллюстрация повышения ранга на карточке профиля
        ...noAndroidOutline, // зачем: без непрозрачного фона Android рисует квадрат вокруг скругления (сторож android_no_square_outline)
      }, style]}
    />
  );
}

type StageProps = Readonly<{
  t: SharedValue<number>;
  width: number;
  height: number;
  cx: number;
  cy: number;
  coin: number;
  pro: boolean;
  fromRank: number;
  toRank: number;
  /** Обсидиан: новая монета в золотом кольце (кольцо рисует сам ProfileCardCoin). */
}>;

/** Слои повышения поверх сцены: ореол, волны, лучи, искры, переворот монеты, вспышка. */
function RankUpStageFxBase({ t, width, height, cx, cy, coin, pro, fromRank, toRank }: StageProps) {
  const halo = Math.round(coin * 1.9);
  const wave = coin + 6;
  const rays = 560;
  // зачем (закон владельца 22.10 «цвета — строго цвета и оттенки текущей темы»): белые части удара — ударная волна и вспышка обычной
  // визитки — «чернила поверх картинок» темы (mediaInk). Тёплое золото света монеты (лучи, ореол, искры, кант) — металл ранга, ждёт решения координатора.
  const { mediaInk } = useShadowGlass();
  const waveInk = useMemo(() => colorWithAlpha(mediaInk, 0.85), [mediaInk]);
  const sparksIn = useMemo(() => (pro ? sparks(12, 150, 20) : []), [pro]);
  const sparksOut = useMemo(() => (pro ? sparks(18, 120, 36) : []), [pro]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.28, 0.34, 0.6, 0.94, 1], [0, 0.9, 1, 0.25, 0.25, 0], CLAMP),
    transform: [{ scale: interpolate(t.value, [0, 0.28, 0.34, 0.6], [0.8, 1.15, 1.5, 1.1], CLAMP) }],
  }));
  const waveStyle = (delay: number) => () => {
    'worklet';
    const p = t.value - delay;
    const grow = interpolate(p, [0.32, 0.62], [0, 1], CLAMP);
    return {
      opacity: interpolate(p, [0.32, 0.34, 0.62], [0, 1, 0], CLAMP),
      transform: [{ scale: 0.9 + 1.7 * (1 - Math.pow(1 - grow, 3)) }],
    };
  };
  const wave1 = useAnimatedStyle(waveStyle(0));
  const wave2 = useAnimatedStyle(waveStyle(0.22 / (RANK_UP_DURATION_MS / 1000)));
  const raysStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.31, 0.38, 0.8], [0, 1, 0], CLAMP),
    transform: [
      { rotate: `${interpolate(t.value, [0.31, 0.38, 0.8], [0, 12, 55], CLAMP)}deg` },
      { scale: interpolate(t.value, [0.31, 0.38, 0.8], [0.5, 1, 1.15], CLAMP) },
    ],
  }));
  const oldStyle = useAnimatedStyle(() => {
    const p = t.value;
    const shaking = p >= 0.06 && p <= 0.25;
    const rotZ = shaking ? 2 * Math.sin(((p - 0.06) / 0.04) * Math.PI * 2) : 0;
    return {
      opacity: p < 0.33 ? 1 : 0,
      transform: [
        { perspective: 800 },
        { rotateY: `${interpolate(p, [0.26, 0.32], [0, 90], CLAMP)}deg` },
        { rotate: `${rotZ}deg` },
        { scale: interpolate(p, [0, 0.06, 0.24, 0.26, 0.32], [1, 1.03, 1.04, 1.05, 1.08], CLAMP) },
      ],
    };
  });
  const newStyle = useAnimatedStyle(() => {
    const p = t.value;
    return {
      opacity: p < 0.33 ? 0 : 1,
      transform: [
        { perspective: 800 },
        { rotateY: `${interpolate(p, [0.33, 0.42], [-90, 0], CLAMP)}deg` },
        { scale: interpolate(p, [0.33, 0.42, 0.48, 0.54], [1.08, 1.22, 0.97, 1], CLAMP) },
      ],
    };
  });
  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.31, 0.34, 0.5], [0, 1, 0], CLAMP),
  }));

  const flashR = Math.max(width, height);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pro ? (
        <Animated.View style={[{ position: 'absolute', left: cx - rays / 2, top: cy - rays / 2, width: rays, height: rays }, raysStyle]}>
          <Svg width={rays} height={rays}>
            <Defs>
              <RadialGradient id="rankRays" cx={rays / 2} cy={rays / 2} r={rays / 2} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#FFECBE" stopOpacity={0.36} />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
                <Stop offset="0.25" stopColor="#FFECBE" stopOpacity={0.36} />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
                <Stop offset="0.88" stopColor="#FFECBE" stopOpacity={0} />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
              </RadialGradient>
            </Defs>
            <Path d={wedges(rays / 2, 24, 4)} fill="url(#rankRays)" />
          </Svg>
        </Animated.View>
      ) : null}
      <Animated.View style={[{ position: 'absolute', left: cx - halo / 2, top: cy - halo / 2, width: halo, height: halo }, haloStyle]}>
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id="rankHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFF0C8" stopOpacity={0.75} />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
              <Stop offset="0.45" stopColor="#FFD278" stopOpacity={0.25} />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
              <Stop offset="0.7" stopColor="#FFD278" stopOpacity={0} />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
            </RadialGradient>
          </Defs>
          <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill="url(#rankHalo)" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[{
          position: 'absolute', left: cx - wave / 2, top: cy - wave / 2, width: wave, height: wave, borderRadius: wave / 2,
          borderWidth: 3, borderColor: waveInk, // shadow-ok: ударная волна повышения ранга (анимация-эффект), не контейнер; guard-ok: ударная волна из макета (.up-wave), не контейнер
          shadowColor: '#FFE6AA', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, // theme-exempt: иллюстрация повышения ранга на карточке профиля
        }, wave1]}
      />
      {pro ? (
        <Animated.View
          style={[{
            position: 'absolute', left: cx - wave / 2, top: cy - wave / 2, width: wave, height: wave, borderRadius: wave / 2,
            borderWidth: 2, borderColor: 'rgba(255,220,150,0.7)', // shadow-ok: вторая волна «Про» (анимация-эффект), не контейнер; guard-ok: вторая волна «Про» (.up-wave.w2) // theme-exempt: иллюстрация повышения ранга на карточке профиля
          }, wave2]}
        />
      ) : null}
      {sparksIn.map((spark) => (
        <SparkDot key={`in${spark.x.toFixed(1)}${spark.y.toFixed(1)}`} t={t} spark={spark} inward cx={cx} cy={cy} />
      ))}
      <Animated.View style={[{ position: 'absolute', left: cx - coin / 2, top: cy - coin / 2, width: coin, height: coin, backfaceVisibility: 'hidden' }, oldStyle]}>
        <CoinImage rank={fromRank} size={coin} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: cx - coin / 2, top: cy - coin / 2, width: coin, height: coin, backfaceVisibility: 'hidden' }, newStyle]}>
        <CoinImage rank={toRank} size={coin} />
      </Animated.View>
      {sparksOut.map((spark) => (
        <SparkDot key={`out${spark.x.toFixed(1)}${spark.y.toFixed(1)}`} t={t} spark={spark} inward={false} cx={cx} cy={cy} />
      ))}
      <Animated.View style={[StyleSheet.absoluteFill, flashStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            {pro ? (
              <RadialGradient id="rankFlash" cx={cx} cy={cy} r={flashR} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#FFF8E4" stopOpacity={0.95} />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
                <Stop offset="0.3" stopColor="#FFECBE" stopOpacity={0.3} />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
                <Stop offset="0.6" stopColor="#FFECBE" stopOpacity={0} />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
              </RadialGradient>
            ) : (
              <RadialGradient id="rankFlash" cx={cx} cy={cy} r={flashR} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={mediaInk} stopOpacity={0.45} />
                <Stop offset="0.45" stopColor={mediaInk} stopOpacity={0} />
              </RadialGradient>
            )}
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#rankFlash)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export const RankUpStageFx = memo(RankUpStageFxBase);

/** Вспышка канта визитки («Про»). */
function RankUpCardGlowBase({ t, radius }: { t: SharedValue<number>; radius: number }) {
  const style = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0.32, 0.35, 0.7], [0, 1, 0], CLAMP) }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius }, style]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 14, borderColor: 'rgba(255,220,150,0.16)' }]} /* shadow-ok: вспышка канта (анимация-эффект повышения ранга), не контейнер; guard-ok: вспышка канта .up-cardglow, живёт 1 с */ />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 2, borderColor: 'rgba(255,236,190,0.9)' }]} /* shadow-ok: вспышка канта (анимация-эффект повышения ранга), не контейнер; guard-ok: вспышка канта .up-cardglow */ />{/* theme-exempt: иллюстрация повышения ранга на карточке профиля */}
    </Animated.View>
  );
}

export const RankUpCardGlow = memo(RankUpCardGlowBase);

export function useRankChipStyles(t: SharedValue<number>) {
  const oldChip = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.4, 0.46], [1, 1, 0], CLAMP),
    transform: [
      { translateY: interpolate(t.value, [0.4, 0.46], [0, -12], CLAMP) },
      { scale: interpolate(t.value, [0.4, 0.46], [1, 0.9], CLAMP) },
    ],
  }));
  const newChip = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.42, 0.52], [0, 1], CLAMP),
    transform: [
      { translateY: interpolate(t.value, [0.42, 0.5, 0.52], [14, -2, 0], CLAMP) },
      { scale: interpolate(t.value, [0.42, 0.5, 0.52], [0.9, 1.03, 1], CLAMP) },
    ],
  }));
  const banner = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.44, 0.52, 0.86, 0.94], [0, 1, 1, 0], CLAMP),
    transform: [
      { translateY: interpolate(t.value, [0.44, 0.52, 0.86, 0.94], [12, 0, 0, -8], CLAMP) },
      { scale: interpolate(t.value, [0.44, 0.52, 0.86, 0.94], [0.9, 1, 1, 0.96], CLAMP) },
    ],
  }));
  return { oldChip, newChip, banner };
}
