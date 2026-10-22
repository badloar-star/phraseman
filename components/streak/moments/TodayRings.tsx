// ═══════════════════════════════════════════════════════════════════════════
// TodayRings.tsx — три кольца блока «Сегодня» с монетой в центре и плашкой «День выполнен» (образец engagement-moments-v3-all.html: `.rw`, `ringsSvg`, `closeFx`, `allFx`).
//
// зачем (владелец 13–14.10: «кольца = задачи блока „Сегодня“ на Главной»; координатор): кольцо докручивается за 0,9 с; на цели — перехлёст (кривая .23,1.3,.32,1), вспышка по кольцу,
// 10 искр, звук ringClose + хаптик success; когда закрыты все три — монета подпрыгивает, «День выполнен» (звук dayDone, тяжёлый хаптик). Цвета — из токенов темы: акцент, второй цвет, золото.
// Только вид: числа приходят пропсами (цели 1 / 3 / 10 — как в today_tasks), ничего не пишется. Reanimated на UI-треде; reduceMotion — кольца сразу на месте, без вспышек.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle } from 'react-native-svg';
import type { Lang } from '../../../constants/i18n';
import { hapticSuccess, hapticTap } from '../../../hooks/use-haptics';
import MomentCoin from '../../moments/MomentCoin';
import MomentFirework from '../../spire/moments/moments_effects';
import { useSpirePalette } from '../../spire/useSpirePalette';
import { useSpireShadow } from '../../spire/useSpireShadow';
import { todayRingColors, useStreakColors } from './use_streak_colors';
import { playStreakTapSound, playTodayDayDoneSound, playTodayRingClosedSound } from './streak_moments_sound';
import { streakMomentText } from './streak_moments_strings';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 148;
const STROKE = 11;
const GAP = 5;
/**
 * Размеры колец. 148 — эталон v3 (dev-превью, Главная до 17.10); 222 — экран «Сегодня» (макет Б docs/design/v2-app/today-rings-screen.html:
 * «геометрия эталона, масштаб 1,5»: толщина 16, зазор 7, монета 86 — числа макета, не пересчёт, чтобы толщина не стала дробной).
 */
export const TODAY_RING_SIZES = Object.freeze({
  148: Object.freeze({ size: 148, stroke: STROKE, gap: GAP, coin: 58 }),
  222: Object.freeze({ size: 222, stroke: 16, gap: 7, coin: 86 }),
  // зачем (эталон today-scene-concepts.html, вариант A «Сцена», 22.10): кольца-герой 200 — макет масштабирует геометрию 222 коэффициентом 200/222
  200: Object.freeze({ size: 200, stroke: 14.4, gap: 6.3, coin: 77 }),
});
export type TodayRingSize = keyof typeof TODAY_RING_SIZES;
/** Кольца заполняются по очереди (макет Б: transition-delay i × 120 мс) — только при «до → после». */
const RING_STAGGER_MS = 120;
const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_OVERSHOOT = Easing.bezier(0.23, 1.3, 0.32, 1);
/** Цели задач «Сегодня» (modules/today-tasks): урок 1, ступени Пика 3, карточки 10. */
export const TODAY_RING_TARGETS = [1, 3, 10] as const;

/** Радиус и длина окружности кольца i (внешнее — первое). Чистая функция — проверяет сторож. */
export function todayRingGeometry(i: number, ringSize: TodayRingSize = 148): Readonly<{ r: number; len: number }> {
  const g = TODAY_RING_SIZES[ringSize];
  const r = g.size / 2 - g.stroke / 2 - i * (g.stroke + g.gap);
  return { r, len: 2 * Math.PI * r };
}

/** Доля кольца 0…1 по числу выполненного и цели. */
export function todayRingFraction(done: number, target: number): number {
  return target > 0 ? Math.min(1, Math.max(0, done / target)) : 0;
}

type RingProps = Readonly<{ index: number; value: number; from: number; color: string; instant: boolean; ringSize: TodayRingSize; delayMs: number }>;
const Ring = memo(function Ring({ index, value, from, color, instant, ringSize, delayMs }: RingProps) {
  const { r, len } = todayRingGeometry(index, ringSize);
  const { size, stroke } = TODAY_RING_SIZES[ringSize];
  // зачем (экран «Сегодня», координатор 17.10): кольцо стартует с того, что человек видел в прошлый раз, и докручивается до текущего; reduceMotion — сразу финал
  const v = useSharedValue(instant ? value : from);
  useEffect(() => {
    if (instant) { v.value = value; return; }
    const fill = withTiming(value, { duration: 900, easing: value >= 1 ? EASE_OVERSHOOT : EASE });
    v.value = delayMs > 0 ? withDelay(delayMs, fill) : fill;
  }, [value, instant, v, delayMs]);
  const animated = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - Math.min(1, v.value)) }));
  const c = size / 2;
  return (
    <>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} opacity={0.16} />
      <AnimatedCircle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={len} animatedProps={animated} />
    </>
  );
});

export { todayRingColors };

export type TodayRingsProps = Readonly<{
  lang: Lang;
  /** Цели трёх задач; по умолчанию 1 / 3 / 10 (modules/today-tasks). */
  targets?: readonly [number, number, number];
  /** Сколько выполнено по трём задачам (урок, ступени Пика, карточки). */
  progress: readonly [number, number, number];
  /** С какого прогресса начинать заполнение («до» с прошлого открытия). Нет — кольца сразу на месте, как раньше. */
  fromProgress?: readonly [number, number, number];
  coinRank: number | null;
  testID?: string;
  /** 148 — как раньше; 222 — экран «Сегодня» (макет Б). */
  size?: TodayRingSize;
  /** Плашка «День выполнен» под кольцами; на экране «Сегодня» её нет (решение координатора 17.10). */
  showDayDone?: boolean;
}>;

function TodayRings({ lang, progress, fromProgress, targets = TODAY_RING_TARGETS, coinRank, testID = 'today-rings', size: ringSize = 148, showDayDone = true }: TodayRingsProps) {
  const geom = TODAY_RING_SIZES[ringSize];
  const k = geom.size / SIZE;
  const p = useSpirePalette();
  const sh = useSpireShadow();
  const reduceMotion = useReducedMotion();
  const streakColors = useStreakColors();
  const colors = todayRingColors(streakColors);
  const values = progress.map((n, i) => todayRingFraction(n, targets[i]));
  const allClosed = values.every((x) => x >= 1);
  const fromValues = fromProgress ? fromProgress.map((n, i) => todayRingFraction(n, targets[i])) : values;
  // зачем: при «до → после» вспышка, звук и «День выполнен» срабатывают на кольцах, закрытых с прошлого открытия
  const prev = useRef<readonly number[] | null>(fromProgress ? fromValues : null);
  const [sparkKey, setSparkKey] = useState(0);
  const [sparkRing, setSparkRing] = useState(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    const before = prev.current;
    prev.current = values;
    if (!before || reduceMotion) {
      if (__DEV__) console.log('[TODAY-RING] sparks:skip', JSON.stringify({ reason: !before ? 'first_show' : 'reduce_motion' })); // guard-ok: ранний выход — первый показ и reduceMotion без вспышек
      return undefined;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    values.forEach((x, i) => {
      if (x >= 1 && before[i] < 1) {
        timers.push(setTimeout(() => {
          setSparkRing(i);
          setSparkKey((k) => k + 1);
          flash.value = withSequence(withTiming(0.9, { duration: 175, easing: EASE }), withTiming(0, { duration: 525, easing: EASE }));
          playTodayRingClosedSound();
          void hapticSuccess();
        }, 650));
      } else if (x > before[i] && x < 1) {
        playStreakTapSound();
        void hapticTap();
      }
    });
    if (allClosed && before.some((x) => x < 1)) {
      timers.push(setTimeout(() => { playTodayDayDoneSound(); void hapticSuccess(); }, 1250));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- значения колец собираются из progress; реагируем только на него
  }, [progress[0], progress[1], progress[2]]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value, transform: [{ scale: 0.85 + (1 - flash.value) * 0.27 }] }));
  return (
    <View testID={testID} style={s.wrap} accessible accessibilityLabel={streakMomentText(lang, 'today')}>
      <View style={[s.rw, { width: geom.size, height: geom.size }]}>
        <Animated.View pointerEvents="none" style={[s.flash, { backgroundColor: colors[sparkRing] }, flashStyle]} />
        <Svg width={geom.size} height={geom.size} viewBox={`0 0 ${geom.size} ${geom.size}`} style={s.svg}>
          {values.map((x, i) => <Ring key={i} /* guard-ok: три кольца фиксированного порядка */ index={i} value={x} from={fromValues[i] ?? x} color={colors[i]} instant={reduceMotion} ringSize={ringSize} delayMs={fromProgress ? i * RING_STAGGER_MS : 0} />)}
        </Svg>
        <MomentCoin rank={coinRank} size={geom.coin} mood={allClosed && !reduceMotion ? 'jump' : 'idle'} shadow={false} />
        <MomentFirework x={geom.size / 2} y={geom.size / 2} r={(68 - sparkRing * 16 + 28) * k} n={10} fire={sparkKey > 0} key={sparkKey} />
      </View>
      {allClosed && showDayDone ? (
        <Animated.View style={[s.dayOk, { backgroundColor: p.card }, sh.nested]}>
          <Ionicons name="checkmark" size={16} color={streakColors.accentGraphic} />
          <Text style={[s.dayOkText, { color: p.text }]}>{streakMomentText(lang, 'dayDone')}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, paddingTop: 2, paddingBottom: 14 },
  rw: { alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute', left: 0, top: 0, transform: [{ rotate: '-90deg' }], overflow: 'visible' },
  flash: { position: 'absolute', left: -14, right: -14, top: -14, bottom: -14, borderRadius: 999, opacity: 0 },
  dayOk: { height: 32, paddingLeft: 10, paddingRight: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayOkText: { fontSize: 13, fontWeight: '700' },
});

export default memo(TodayRings);
