// ═══════════════════════════════════════════════════════════════════════════
// StreakMilestoneToast.tsx — тост малого рубежа серии (1, 3, 14, 150, 250; эталон streak-milestones.html: `.mtoast`, `toastSmall`, `smallInit`).
//
// зачем (владелец 14.10: «перенести точно по макетам»): малый рубеж — тост на Главной ≤ 1,5 с, без экрана: огонь (StreakFlameFill в цвете стадии, burst через 0,3 с) + искры, заголовок 16/20 700,
// подпись «До N — M дн.» 13/17, монета ранга справа (MomentCoin 32). Плашка в стиле «Тень» (тон + тень, без обводки). Появление пружиной 600 мс сверху (`emToastIn`);
// reduceMotion — сразу на месте. Ничего не начисляет и не пишет: показывает то, что пришло пропсами; закрывает себя через onDone. Показ — за флагом moments_v3 (решает Ядро).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { hapticSuccess, hapticTap } from '../../../hooks/use-haptics';
import MomentCoin from '../../moments/MomentCoin';
import StreakMomentFlame from './StreakMomentFlame';
import MomentFirework from '../../spire/moments/moments_effects';
import { useSpirePalette } from '../../spire/useSpirePalette';
import { useSpireShadow } from '../../spire/useSpireShadow';
import { STREAK_MOMENT_DURATION_MS, streakFlameStage, type StreakMilestone } from './streak_milestones';
import { playStreakSceneSound, playStreakTapSound } from './streak_moments_sound';
import { streakMilestoneSubline, streakMilestoneTitle, streakMomentText } from './streak_moments_strings';

export type StreakMilestoneToastProps = Readonly<{
  lang: Lang;
  /** Рубеж малого уровня: 1, 3, 14, 150 или 250. */
  milestone: StreakMilestone;
  /** Ранг монеты человека 0…19 (null — базовая монета). */
  coinRank: number | null;
  onDone: () => void;
  testID?: string;
}>;

/** Тайминг эталона: burst огня и искры — через 300 мс после появления. */
export const STREAK_TOAST_BURST_DELAY_MS = 300;

function StreakMilestoneToast({ lang, milestone, coinRank, onDone, testID = 'streak-milestone-toast' }: StreakMilestoneToastProps) {
  const p = useSpirePalette();
  const sh = useSpireShadow();
  const reduceMotion = useReducedMotion();
  const [burstKey, setBurstKey] = useState(0);
  const [sparks, setSparks] = useState(false);
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  // зачем (проверка класса «эффект тайм-листа перезапускает таймеры», 14.10): onDone приходит от хозяина и может меняться на каждый его рендер — в зависимостях эффекта он перезапускал бы
  // таймеры, звук и хаптик при любом рендере Главной, а тост так и не закрывался. Колбэк живёт в ref, эффект зависит только от сцены.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    playStreakSceneSound('toast');
    if (!reduceMotion) enter.value = withSpring(1, { damping: 14, stiffness: 140 });
    else enter.value = withTiming(1, { duration: 0, easing: Easing.linear });
    const burst = setTimeout(() => {
      setBurstKey(1);
      setSparks(true);
      playStreakTapSound();
      void hapticSuccess();
    }, STREAK_TOAST_BURST_DELAY_MS);
    const done = setTimeout(() => onDoneRef.current(), STREAK_MOMENT_DURATION_MS.toast);
    void hapticTap();
    return () => { clearTimeout(burst); clearTimeout(done); };
  }, [enter, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: (1 - enter.value) * -28 }] }));
  const sub = streakMilestoneSubline(lang, milestone);
  return (
    <Animated.View testID={testID} accessibilityRole="alert" style={[s.toast, { backgroundColor: p.cardRaised }, sh.plate, style]}>
      <StreakMomentFlame days={milestone} size={40} stage={streakFlameStage(milestone)} burstKey={burstKey || undefined} accessibilityLabel={streakMomentText(lang, 'flameA11y', { n: milestone })} />
      <View style={[s.dot, { backgroundColor: p.textSecondary }]} />
      <View style={s.text}>
        <Text style={[s.title, { color: p.text }]} numberOfLines={1}>{streakMilestoneTitle(lang, milestone)}</Text>
        <Text style={[s.sub, { color: p.textSecondary }]} numberOfLines={1}>{sub}</Text>
      </View>
      <MomentCoin rank={coinRank} size={32} mood="idle" shadow={false} />
      <MomentFirework x={34} y={28} r={30} n={6} fire={sparks} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  toast: { position: 'absolute', left: 20, right: 20, top: 60, zIndex: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18 },
  dot: { width: 4, height: 4, borderRadius: 2, marginLeft: -4 },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  sub: { fontSize: 13, lineHeight: 17, fontWeight: '400' },
});

export default memo(StreakMilestoneToast);
