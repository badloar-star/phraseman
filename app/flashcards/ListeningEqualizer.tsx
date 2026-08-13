/**
 * cards-2.1 (§7.1 SPEC_2_1): анимированный эквалайзер плеера «Слушание».
 *
 * Полосы «дышат» во время озвучки и плавно опадают в низкое статичное положение
 * на паузе/финале. Реализация — ТОЛЬКО `transform: scaleY` (+ opacity контейнера):
 * height/width не трогаем, layout-прохода на кадр нет. Вся анимация живёт на
 * UI-потоке Reanimated (useSharedValue + withRepeat/withSequence/withTiming),
 * ни одного setInterval на JS-потоке.
 *
 * Полосы намеренно НЕ синхронны: у каждой свой период (вверх/вниз разной длины)
 * и своя фаза-задержка — иначе получается «шагающий строй» (§8: премиальный вид,
 * мягкие пружины, без мультяшности). Параметры детерминированы по индексу
 * (listening_equalizer_model.ts) — одинаковая картинка между ре-рендерами.
 *
 * Деградация (§8):
 *  - «уменьшить движение» (useFcReduceMotion) → статичный вид; при озвучке
 *    полосы стоят в «арке» (видно, что звук идёт), на паузе — опадают;
 *  - слабое устройство (isLowPowerEffective) → ОДИН общий драйвер на все полосы
 *    вместо N анимаций, фаза берётся из параметров полосы.
 *
 * Компонент переиспользуемый: `playing` / `barCount` / `color` (+ размеры).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useFcReduceMotion } from './PhraseCard';
import { isLowPowerEffective } from './low_power';
import {
  EQ_DEFAULT_BARS,
  EQ_SETTLE_MS,
  EQ_SIMPLE_CYCLE_MS,
  equalizerBars,
  equalizerMotionMode,
  equalizerSimpleScale,
  equalizerStaticScale,
  type EqBarParams,
  type EqMotionMode,
} from './listening_equalizer_model';

export type ListeningEqualizerProps = {
  /** Идёт озвучка: полосы двигаются. false — плавно опадают и замирают. */
  playing: boolean;
  /**
   * Сессия идёт (плеер не на паузе). Управляет только прозрачностью: во время
   * «паузы подумать» полосы стоят, но блок не приглушается — приглушение
   * означает именно паузу плеера. По умолчанию = `playing`.
   */
  active?: boolean;
  /** Количество полос (зажимается в 3..12). */
  barCount?: number;
  /** Цвет полос — акцент экрана. */
  color?: string;
  /** Высота слота полосы, px (scaleY = 1 — полная высота). */
  height?: number;
  /** Ширина полосы, px. */
  barWidth?: number;
  /** Зазор между полосами, px. */
  gap?: number;
  /** Оверрайды деградации — по умолчанию берутся из a11y/устройства. */
  reduceMotion?: boolean;
  lowPower?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_HEIGHT = 34;
const DEFAULT_BAR_W = 5;
const DEFAULT_GAP = 5;
/** Прозрачность контейнера: пауза читается ещё и «приглушением». */
const OPACITY_PLAYING = 1;
const OPACITY_IDLE = 0.5;

type BarProps = {
  params: EqBarParams;
  mode: EqMotionMode;
  playing: boolean;
  color: string;
  height: number;
  width: number;
  /** Общий драйвер 0→1 (пила) для упрощённого режима. */
  driver: SharedValue<number>;
};

/**
 * Одна полоса. Якорь масштаба — НИЗ: scaleY идёт от центра, поэтому компенсируем
 * сдвиг через translateY = height*(1-scale)/2 (translate указан первым, значит
 * сам он не масштабируется).
 */
function EqualizerBar({ params, mode, playing, color, height, width, driver }: BarProps) {
  const scale = useSharedValue(params.restScale);
  const prevMode = useRef<EqMotionMode>('static');

  useEffect(() => {
    cancelAnimation(scale);
    if (mode === 'full') {
      // Свой период у каждой полосы + фазовая задержка → нет «шагающего строя».
      scale.value = withDelay(
        params.delayMs,
        withRepeat(
          withSequence(
            withTiming(params.maxScale, { duration: params.durationMs, easing: Easing.inOut(Easing.quad) }),
            withTiming(params.minScale, { duration: params.downDurationMs, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        ),
      );
    } else if (mode === 'simple') {
      // Масштаб считает общий драйвер в animated style — своя анимация не нужна.
    } else {
      // Выход из simple: подхватываем текущее положение, иначе будет скачок.
      if (prevMode.current === 'simple') scale.value = equalizerSimpleScale(params, driver.value);
      scale.value = withTiming(equalizerStaticScale(params, playing), {
        duration: EQ_SETTLE_MS,
        easing: Easing.out(Easing.quad),
      });
    }
    prevMode.current = mode;
    return () => cancelAnimation(scale);
  }, [mode, playing, params, scale, driver]);

  const aStyle = useAnimatedStyle(() => {
    let s: number;
    if (mode === 'simple') {
      // Формула повторяет equalizerSimpleScale — намеренно инлайн: worklet не
      // должен звать функцию из обычного модуля (её не workletize'ит babel).
      const ph = (driver.value + params.phase01) % 1;
      const tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      s = params.minScale + (params.maxScale - params.minScale) * tri;
    } else {
      s = scale.value;
    }
    return { transform: [{ translateY: (height * (1 - s)) / 2 }, { scaleY: s }] };
  }, [mode, height, params]);

  return (
    <Reanimated.View
      style={[
        { width, height, borderRadius: width / 2, backgroundColor: color },
        aStyle,
      ]}
    />
  );
}

export default function ListeningEqualizer({
  playing,
  active,
  barCount = EQ_DEFAULT_BARS,
  color = '#9C6ADE',
  height = DEFAULT_HEIGHT,
  barWidth = DEFAULT_BAR_W,
  gap = DEFAULT_GAP,
  reduceMotion,
  lowPower,
  testID = 'fc-listen-equalizer',
  accessibilityLabel,
  style,
}: ListeningEqualizerProps) {
  const a11yReduceMotion = useFcReduceMotion();
  const effReduceMotion = reduceMotion ?? a11yReduceMotion;
  const effLowPower = lowPower ?? isLowPowerEffective();

  const mode = equalizerMotionMode({ playing, reduceMotion: effReduceMotion, lowPower: effLowPower });
  const bars = useMemo(() => equalizerBars(barCount), [barCount]);

  // Общий драйвер упрощённого режима: одна пила 0→1 на все полосы.
  const driver = useSharedValue(0);
  useEffect(() => {
    if (mode !== 'simple') {
      cancelAnimation(driver);
      return;
    }
    driver.value = 0;
    driver.value = withRepeat(withTiming(1, { duration: EQ_SIMPLE_CYCLE_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(driver);
  }, [mode, driver]);

  const lit = active ?? playing;
  const opacity = useSharedValue(lit ? OPACITY_PLAYING : OPACITY_IDLE);
  useEffect(() => {
    opacity.value = withTiming(lit ? OPACITY_PLAYING : OPACITY_IDLE, { duration: EQ_SETTLE_MS });
  }, [lit, opacity]);
  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Reanimated.View
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? 'qa-fc-listen-equalizer'}
      accessible
      accessibilityRole="image"
      style={[styles.row, { height, gap }, wrapStyle, style]}
    >
      {bars.map((params, i) => (
        <EqualizerBar
          key={i}
          params={params}
          mode={mode}
          playing={playing}
          color={color}
          height={height}
          width={barWidth}
          driver={driver}
        />
      ))}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Ширина блока эквалайзера — если нужно зарезервировать место в ряду. */
export function equalizerWidth(barCount: number, barWidth = DEFAULT_BAR_W, gap = DEFAULT_GAP): number {
  const n = Math.max(1, Math.round(barCount));
  return n * barWidth + (n - 1) * gap;
}

export type { EqMotionMode };
