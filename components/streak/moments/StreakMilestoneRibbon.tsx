// ═══════════════════════════════════════════════════════════════════════════
// StreakMilestoneRibbon.tsx — лента рубежей под пилюлей серии на Главной (эталон streak-milestones.html: `ribbon`).
//
// зачем (владелец 14.10): показывает прогресс к следующему рубежу — пять последних рубежей до следующего включительно; пройденные залиты акцентом, следующий подсвечен кольцом.
// «Рубежи» слева, «до N — M дн.» справа, дорожка 6, метки 26 с числом. Заполнение растёт 1200 мс (UI-тред); reduceMotion — сразу. Только показ: без чтений сервера и записи.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { useSpirePalette } from '../../spire/useSpirePalette';
import { useSpireShadow } from '../../spire/useSpireShadow';
import { STREAK_MILESTONES, nextStreakMilestone } from './streak_milestones';
import { streakMomentText } from './streak_moments_strings';

const VISIBLE = 5;

/** Какие рубежи рисуем: до пяти последних, не дальше следующего. Чистая функция — проверяет сторож. */
export function streakRibbonMilestones(days: number): readonly number[] {
  const next = nextStreakMilestone(days) ?? 1000;
  return STREAK_MILESTONES.filter((m) => m <= next).slice(-VISIBLE);
}

/** Положение метки на дорожке, % (поля 4 % с краёв, как в образце). */
export function streakRibbonPosition(value: number, list: readonly number[]): number {
  const min = list[0];
  const max = list[list.length - 1];
  return ((value - min) / (max - min || 1)) * 92 + 4;
}

export type StreakMilestoneRibbonProps = Readonly<{ lang: Lang; days: number; testID?: string }>;

function StreakMilestoneRibbon({ lang, days, testID = 'streak-milestone-ribbon' }: StreakMilestoneRibbonProps) {
  const p = useSpirePalette();
  const sh = useSpireShadow();
  const reduceMotion = useReducedMotion();
  const list = streakRibbonMilestones(days);
  const next = nextStreakMilestone(days);
  const target = Math.min(100, Math.max(0, streakRibbonPosition(Math.min(days, list[list.length - 1]), list)));
  const fill = useSharedValue(reduceMotion ? target : 0);
  useEffect(() => {
    fill.value = reduceMotion ? target : withTiming( // guard-ok: ширина дорожки ленты (вид), не баланс
      target, { duration: 1200, easing: Easing.bezier(0.2, 1, 0.3, 1) });
  }, [fill, reduceMotion, target]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));
  return (
    <View testID={testID} style={[s.wrap, { backgroundColor: p.card }, sh.plate]}>
      <View style={s.head}>
        <Text style={[s.ov, { color: p.textSecondary }]}>{streakMomentText(lang, 'ribbon')}</Text>
        {next ? <Text style={[s.small, { color: p.textSecondary }]}>{streakMomentText(lang, 'toNext', { next, left: next - days })}</Text> : null}
      </View>
      <View style={s.ribbon}>
        <View style={[s.track, { backgroundColor: p.control }]}>
          <Animated.View style={[s.fill, { backgroundColor: p.cta }, fillStyle]} />
        </View>
        {list.map((m) => {
          const reached = m <= days;
          const isNext = m === next;
          return (
            <View key={m} style={[s.mark, { left: `${streakRibbonPosition(m, list)}%`, backgroundColor: reached ? p.cta : p.control }, isNext ? { borderRadius: 13 } : null]}>
              <Text style={[s.markText, { color: reached ? p.ctaText : isNext ? p.text : p.textSecondary }]}>{m}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 12, paddingTop: 12, paddingHorizontal: 12, paddingBottom: 4, borderRadius: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ov: { fontSize: 13, lineHeight: 17, letterSpacing: 1.6, fontWeight: '700', textTransform: 'uppercase' },
  small: { fontSize: 13, lineHeight: 17 },
  ribbon: { position: 'relative', height: 56, marginHorizontal: 4 },
  track: { position: 'absolute', left: 0, right: 0, top: 24, height: 6, borderRadius: 3 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  mark: { position: 'absolute', top: 14, width: 26, height: 26, marginLeft: -13, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: 11, fontWeight: '800' },
});

export default memo(StreakMilestoneRibbon);
