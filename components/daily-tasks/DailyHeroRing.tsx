/**
 * DailyHeroRing — герой-кольцо «Командного центра» вызовов дня.
 *
 * SVG-кольцо из N дуг (по одной на задание): каждой дуге выделена своя
 * 1/N окружности, длина заполнения внутри неё = прогресс задания (0..1),
 * цвет — тематический акцент типа задания (dailyTaskAccentHex). Трек —
 * приглушённый сегмент той же геометрии. Дуги «подметают» кольцо при
 * появлении и при изменении прогресса (Reanimated + strokeDashoffset,
 * тот же паттерн, что ComboRing). При системном reduce motion — целевой
 * кадр сразу, без анимации.
 *
 * Центр — children (счётчик/подпись/пилюля решает экран).
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SWEEP_MS = 600;

export type DailyHeroRingArc = {
  key: string;
  color: string;
  /** Доля заполнения своего сегмента окружности, 0..1. */
  progress: number;
};

export type DailyHeroRingProps = {
  arcs: DailyHeroRingArc[];
  /** Цвет трека сегментов (t.bgSurface2 / border активной темы). */
  trackColor: string;
  size?: number;
  strokeWidth?: number;
  /** Угловой зазор между сегментами, градусы. */
  gapDegrees?: number;
  /** Без анимации: сразу целевой кадр (системный reduce motion). */
  reduceMotion?: boolean;
  children?: React.ReactNode;
};

type HeroArcSegmentProps = {
  cx: number;
  cy: number;
  r: number;
  rotateDeg: number;
  segLen: number;
  circumference: number;
  strokeWidth: number;
  color: string;
  progress: number;
  reduceMotion: boolean;
};

function HeroArcSegment({
  cx,
  cy,
  r,
  rotateDeg,
  segLen,
  circumference,
  strokeWidth,
  color,
  progress,
  reduceMotion,
}: HeroArcSegmentProps) {
  const sweep = useSharedValue(reduceMotion ? progress : 0);

  useEffect(() => {
    sweep.value = reduceMotion ? progress : withTiming(progress, { duration: SWEEP_MS });
    return () => cancelAnimation(sweep);
  }, [sweep, progress, reduceMotion]);

  // dasharray [segLen, circumference]: смещение segLen*(1-p) оставляет видимой
  // ровно p·segLen начала пути; зазор в полную окружность убирает «хвост» на конце.
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: segLen * (1 - sweep.value),
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={`${segLen} ${circumference}`}
      animatedProps={animatedProps}
      transform={`rotate(${rotateDeg} ${cx} ${cy})`}
    />
  );
}

export function DailyHeroRing({
  arcs,
  trackColor,
  size = 170,
  strokeWidth = 11,
  gapDegrees = 14,
  reduceMotion = false,
  children,
}: DailyHeroRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const count = Math.max(1, arcs.length);
  const stepDeg = 360 / count;
  const segLen = Math.max(0, circumference * ((stepDeg - gapDegrees) / 360));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {arcs.map((arc, index) => {
          // Сегмент i: начало в 12:00 + i·шаг + половина зазора (зазор симметричен).
          const rotateDeg = index * stepDeg + gapDegrees / 2 - 90;
          return (
            <React.Fragment key={arc.key}>
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={trackColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${segLen} ${circumference}`}
                strokeDashoffset={0}
                transform={`rotate(${rotateDeg} ${cx} ${cy})`}
              />
              <HeroArcSegment
                cx={cx}
                cy={cy}
                r={r}
                rotateDeg={rotateDeg}
                segLen={segLen}
                circumference={circumference}
                strokeWidth={strokeWidth}
                color={arc.color}
                progress={arc.progress}
                reduceMotion={reduceMotion}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      <View pointerEvents="none" style={styles.center}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});

export default DailyHeroRing;
