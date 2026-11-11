// ═══════════════════════════════════════════════════════════════════════════
// HomeWeekCapsule.tsx — блок дней недели на сцене «Рассвет»: стеклянная капсула, цепочка серии, огонёк засчитанного дня.
//
// зачем (владелец 11.11: «хочу более красивый блок кружочков с днями», «блок с днями на главной сделай шире», «добавь анимацию зажигания
// огонька, когда день засчитан (на дне)»; макет docs/work/mockups/home-luxe-2026-11-11/aurora_rassvet.html утверждён «1 в 1»):
// капсула выходит за поля текста сцены на 8 с каждой стороны; у засчитанных дней в кружке огонёк на «солнечной» заливке; соседние засчитанные дни
// связаны цепочкой. Когда сегодняшний день засчитывается НА ЭТОМ экране, кружок зажигается: заливка проявляется из центра (320 мс), огонёк вспыхивает
// снизу вверх с лёгким перелётом (560 мс), кольцо и шесть искр расходятся и гаснут, цепочка дотягивается до сегодня. Уже засчитанный при открытии день
// рисуется сразу зажжённым — иначе вспышка играла бы на каждый вход. Всё движение — transform и opacity на UI-потоке; «Уменьшить движение» — без вспышки.
//
// Вид — только из пропсов (дни считает вызывающий, как у HomeWeekDots): компонент ничего не читает с диска и не ходит в сеть.
// Отклик мгновенный: состояние «засчитан» приходит пропсом из локального сигнала дня, сервер его не задерживает.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import type { AuroraMaterial } from '../../../constants/aurora_material';
import { useReduceMotion } from '../../../hooks/use_reduce_motion';
import { LinearGradient } from '../../SafeLinearGradient';
import V2Pressable from '../../v2/V2Pressable';

export type HomeWeekCapsuleDay = Readonly<{ date: string; isToday: boolean; counted: boolean }>;

type Props = Readonly<{
  /** Семь дней недели с понедельника (homeWeekDays). */
  days: readonly HomeWeekCapsuleDay[];
  /** Короткие подписи дней на языке интерфейса, с понедельника. */
  labels: readonly string[];
  /** Цвета сцены «Рассвет» из материала темы. */
  scene: AuroraMaterial['scene'];
  /** Главная на экране: пульс «сегодня» идёт только пока экран виден. */
  active: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}>;

const LOG = '[HOME-WEEK]';
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Размеры макета (.wk): кружок 34, зазор до подписи 6, поля капсулы 10 / 4 / 12, радиус 22, выход за поля текста 8. */
const CIRCLE = 34;
const PAD_H = 4;
const PAD_BOTTOM = 12;
const CHAIN_H = 4;
/** Шесть искр по кругу радиуса 25 (как box-shadow макета). */
const SPARKS: readonly (readonly [number, number])[] = [[0, -25], [22, -12], [22, 12], [0, 25], [-22, 12], [-22, -12]];

/** Соседние засчитанные дни → отрезки цепочки [первый, последний] (длиной от двух дней). */
export function homeWeekChainRuns(days: readonly HomeWeekCapsuleDay[]): readonly (readonly [number, number])[] {
  const runs: [number, number][] = [];
  let start = -1;
  days.forEach((day, i) => {
    if (day.counted && start < 0) start = i;
    if ((!day.counted || i === days.length - 1) && start >= 0) {
      const end = day.counted ? i : i - 1;
      if (end > start) runs.push([start, end]);
      start = -1;
    }
  });
  return runs;
}

function HomeWeekCapsule({ days, labels, scene, active, accessibilityLabel, onPress }: Props) {
  const reduceMotion = useReduceMotion();
  const todayIndex = days.findIndex((d) => d.isToday);
  const todayCounted = todayIndex >= 0 && days[todayIndex]!.counted;
  const count = days.filter((d) => d.counted).length;

  // «зажигание» играет один раз — только при переходе «сегодня не засчитан → засчитан», пока блок на экране
  const wasCountedRef = useRef<boolean | null>(null);
  const ignite = useSharedValue(todayCounted ? 1 : 0); // 0 — не зажжён, 1 — горит
  const burst = useSharedValue(0);
  const pulse = useSharedValue(0);
  const flick = useSharedValue(0);
  useEffect(() => {
    const before = wasCountedRef.current;
    wasCountedRef.current = todayCounted;
    if (before === null) { ignite.value = todayCounted ? 1 : 0; return; } // первый показ: состояние как есть, без вспышки
    if (before === todayCounted) return;
    if (!todayCounted) { console.log(LOG, 'сегодня снова не засчитан — огонёк гаснет без анимации', JSON.stringify({ todayIndex })); /* guard-ok: одна строка на редкий откат дня, ранний выход называет причину */ ignite.value = 0; burst.value = 0; return; }
    console.log(LOG, 'день засчитан — зажигаем огонёк', JSON.stringify({ todayIndex, reduceMotion })); // guard-ok: одна строка на событие дня
    if (reduceMotion) { ignite.value = 1; return; }
    ignite.value = withTiming(1, { duration: 560, easing: EASE_OUT });
    burst.value = 0;
    burst.value = withTiming(1, { duration: 560, easing: EASE_OUT });
  }, [todayCounted, todayIndex, reduceMotion, ignite, burst]);
  // пульс кольца «сегодня» (пока день не засчитан) и лёгкое колебание огонька (когда засчитан) — только на видимом экране
  useEffect(() => {
    cancelAnimation(pulse);
    cancelAnimation(flick);
    pulse.value = 0;
    flick.value = 0;
    if (!active || reduceMotion || todayIndex < 0) return undefined;
    if (!todayCounted) pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: EASE_OUT }), -1, false);
    else flick.value = withDelay(700, withRepeat(withSequence(withTiming(1, { duration: 540, easing: Easing.inOut(Easing.ease) }), withTiming(-1, { duration: 540, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 720, easing: Easing.inOut(Easing.ease) })), -1, false));
    return () => { cancelAnimation(pulse); cancelAnimation(flick); };
  }, [active, reduceMotion, todayCounted, todayIndex, pulse, flick]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, ignite.value / 0.57), transform: [{ scale: 0.5 + 0.5 * Math.min(1, ignite.value / 0.57) }] }));
  const flameStyle = useAnimatedStyle(() => {
    const t = ignite.value;
    // 0 → 0,45: снизу вверх с ростом до 1,3; 0,45 → 0,72: осадка до 0,93; 0,72 → 1: к покою
    const scale = t < 0.45 ? 0.5 + (0.8 * t) / 0.45 : t < 0.72 ? 1.3 - (0.37 * (t - 0.45)) / 0.27 : 0.93 + (0.07 * (t - 0.72)) / 0.28;
    const lift = t < 0.45 ? 7 - (10 * t) / 0.45 : t < 0.72 ? -3 + (3 * (t - 0.45)) / 0.27 : 0;
    return { opacity: Math.min(1, t / 0.45), transform: [{ translateY: lift }, { scale: scale * (1 + 0.06 * Math.abs(flick.value)) }, { rotate: `${flick.value * 3}deg` }] };
  });
  const ringStyle = useAnimatedStyle(() => ({ opacity: burst.value > 0 && burst.value < 1 ? 0.9 * (1 - burst.value) : 0, transform: [{ scale: 1 + 0.9 * burst.value }] }));
  const sparksStyle = useAnimatedStyle(() => ({ opacity: burst.value <= 0 || burst.value >= 1 ? 0 : burst.value < 0.3 ? burst.value / 0.3 : 1 - (burst.value - 0.3) / 0.7, transform: [{ scale: 0.4 + 0.85 * burst.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value < 0.7 ? 0.9 * (1 - pulse.value / 0.7) : 0, transform: [{ scale: 1 + 0.5 * Math.min(1, pulse.value / 0.7) }] }));
  const pendingStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, ignite.value / 0.3) }));

  const runs = homeWeekChainRuns(days);
  return (
    <V2Pressable testID="home-week-capsule" accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 0, max: 7, now: count }} onPress={onPress} scaleTo={0.97} style={s.capsule}>
      <View pointerEvents="none" style={s.chainLayer}>
        {runs.map(([from, to]) => (
          <LinearGradient key={`${from}-${to}`} colors={[scene.dayFrom, scene.dayTo]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
            style={[s.chain, { left: `${((from + 0.5) / 7) * 100}%`, width: `${((to - from) / 7) * 100}%` }]} />
        ))}
      </View>
      {days.map((day, index) => {
        const today = day.isToday;
        return (
          <View key={day.date} style={s.day}>
            <Text style={[s.label, today ? s.labelToday : null]}>{labels[index]}</Text>
            <View style={s.circle}>
              {today ? (
                <>
                  {/* сегодня, день ещё не засчитан: тёмный кружок с белым кольцом, точка и мягкий пульс */}
                  <Animated.View style={[s.pending, { backgroundColor: scene.top }, pendingStyle]}>
                    <LinearGradient colors={[scene.dayFrom, scene.dayTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.dot} />
                  </Animated.View>
                  <Animated.View style={[s.pulse, pulseStyle]} />
                  <Animated.View style={[StyleSheet.absoluteFill, fillStyle]}>
                    <LinearGradient colors={[scene.dayFrom, scene.dayTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.fill, { boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 14, spreadDistance: -4, color: scene.dayGlow }] }]} />
                  </Animated.View>
                  <Animated.View style={[s.burstRing, { boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 2, color: scene.dayTo }] }, ringStyle]} />
                  <Animated.View style={[s.sparks, sparksStyle]}>
                    {SPARKS.map(([x, y], i) => <View key={`${x}:${y}`} style={[s.spark, { backgroundColor: i % 2 ? scene.dayTo : scene.dayFrom, transform: [{ translateX: x }, { translateY: y }] }]} />)}
                  </Animated.View>
                  <Animated.View style={[s.flame, flameStyle]}><Ionicons name="flame" size={17} color={scene.dayInk} /></Animated.View>
                </>
              ) : day.counted ? (
                <>
                  <LinearGradient colors={[scene.dayFrom, scene.dayTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.fill, { boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 14, spreadDistance: -4, color: scene.dayGlow }] }]} />
                  <Ionicons name="flame" size={17} color={scene.dayInk} />
                </>
              ) : null}
            </View>
          </View>
        );
      })}
    </V2Pressable>
  );
}

export default memo(HomeWeekCapsule);

const s = StyleSheet.create({
  // зачем: капсула шире текста сцены — выходит за его поля на 8 с каждой стороны (макет: margin 0 −8)
  capsule: { flexDirection: 'row', marginHorizontal: -8, paddingTop: 10, paddingHorizontal: PAD_H, paddingBottom: PAD_BOTTOM, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.13)' }, // theme-exempt: стекло на сцене — свет сцены, одинаков во всех темах (как HOME_SCENE_INK.glass)
  chainLayer: { position: 'absolute', left: PAD_H, right: PAD_H, bottom: PAD_BOTTOM + CIRCLE / 2 - CHAIN_H / 2, height: CHAIN_H },
  chain: { position: 'absolute', top: 0, height: CHAIN_H, borderRadius: CHAIN_H / 2, opacity: 0.8 },
  day: { flex: 1, alignItems: 'center', gap: 6 },
  // зачем (D145): подписи сцены — шкала 13/17
  label: { fontSize: 13, lineHeight: 17, color: 'rgba(255,255,255,0.74)', textAlign: 'center' }, // theme-exempt: чернила сцены
  labelToday: { color: '#FFFFFF', fontWeight: '700' }, // theme-exempt: чернила сцены
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' }, // theme-exempt: стекло на сцене
  fill: { ...StyleSheet.absoluteFillObject, borderRadius: CIRCLE / 2 },
  pending: { ...StyleSheet.absoluteFillObject, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center', boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 2, color: '#FFFFFF' }] }, // shadow-ok: кольцо-индикатор «сегодня», не обводка контейнера; theme-exempt: чернила сцены
  dot: { width: 10, height: 10, borderRadius: 5 },
  pulse: { position: 'absolute', left: -2, right: -2, top: -2, bottom: -2, borderRadius: (CIRCLE + 4) / 2, boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 2, color: 'rgba(255,255,255,0.7)' }] }, // shadow-ok: пульс-индикатор; theme-exempt: чернила сцены
  burstRing: { ...StyleSheet.absoluteFillObject, borderRadius: CIRCLE / 2 }, // расходящееся кольцо вспышки рисуется тенью-кольцом (spread 2), гаснет за 0,5 с
  sparks: { position: 'absolute', left: CIRCLE / 2 - 2, top: CIRCLE / 2 - 2, width: 4, height: 4 },
  spark: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  flame: { alignItems: 'center', justifyContent: 'center' },
});
