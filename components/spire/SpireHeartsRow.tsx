/**
 * Сердца ступени Пика + шкала «сердечко за серию» (ТЗ docs/work/tasks/spire-engagement-2026-10-25.md §2, живой макет
 * docs/design/v2-app/spire-step-live.html, сцена «Сердечко за серию»).
 *
 * зачем (владелец 25.10, координатор 25.10): под сердцами тонкая шкала из 5 делений — видна только когда сердце потеряно;
 * верный ответ заливает деление (200 мс), ошибка гасит шкалу (140 мс, без тряски). На 5/5 шкала вспыхивает (240 мс),
 * потерянное сердце наливается 0,92 → 1,06 → 1 за 320 мс с ореолом 240 мс, шкала гаснет — за ступень одно сердце.
 * Шкала стоит абсолютно под плашкой: шапка не сдвигается. Всё на UI-треде (reanimated). «Уменьшить движение» — без
 * масштаба, только прозрачность. Флаг выключен — прежние три сердца, шкалы нет.
 */
import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';
import { SPIRE_STEP_MAX_HEARTS } from '../../modules/spire/step_machine';
import { SPIRE_STREAK_HEART_TARGET } from '../../modules/spire/streak_heart';
import type { SpireStreakHeartView } from '../../app/spire/use_spire_streak_heart';
import { spireGameText } from './spire_game_strings';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function Segment({ filled, color, track, reduce }: Readonly<{ filled: boolean; color: string; track: string; reduce: boolean }>) {
  const v = useSharedValue(filled ? 1 : 0);
  useEffect(() => { v.value = withTiming(filled ? 1 : 0, { duration: filled ? 200 : 140, easing: EASE_OUT }); }, [filled, v]);
  const fill = useAnimatedStyle(() => (reduce ? { opacity: v.value } : { opacity: v.value > 0 ? 1 : 0, transform: [{ scaleX: v.value }] }));
  return (
    <View style={[s.seg, { backgroundColor: track }]}>
      <Animated.View style={[s.segFill, { backgroundColor: color }, fill]} />
    </View>
  );
}

function Heart({ on, index, pop, popIndex, on_, off, halo, reduce }: Readonly<{ on: boolean; index: number; pop: SharedValue<number>; popIndex: SharedValue<number>; on_: string; off: string; halo: string; reduce: boolean }>) {
  const heart = useAnimatedStyle(() => {
    if (reduce || popIndex.value !== index) return { transform: [{ scale: 1 }] };
    // pop 0→1: 0,92 → 1,06 (60 %) → 1
    const t = pop.value;
    const scale = t < 0.6 ? 0.92 + (1.06 - 0.92) * (t / 0.6) : 1.06 - 0.06 * ((t - 0.6) / 0.4);
    return { transform: [{ scale: t === 0 ? 1 : scale }] };
  });
  const ring = useAnimatedStyle(() => {
    if (popIndex.value !== index) return { opacity: 0 };
    const t = Math.min(1, pop.value * (320 / 240)); // ореол — первые 240 мс из 320
    const opacity = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
    return { opacity: t >= 1 ? 0 : opacity * 0.45, transform: [{ scale: reduce ? 1 : 0.6 + 0.7 * t }] };
  });
  return (
    <View style={s.heartBox}>
      <Animated.View pointerEvents="none" style={[s.halo, { backgroundColor: halo }, ring]} />
      <Animated.View style={heart}>
        <Ionicons name="heart" size={18} color={on ? on_ : off} style={on ? null : s.heartOff} />
      </Animated.View>
    </View>
  );
}

function SpireHeartsRow({ lang, hearts, streak }: Readonly<{ lang: Lang; hearts: number; streak?: SpireStreakHeartView | null }>) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const reduce = useReducedMotion();
  const enabled = Boolean(streak?.enabled);
  const visible = enabled && !streak?.given && hearts < SPIRE_STEP_MAX_HEARTS && hearts > 0;
  const line = useSharedValue(visible ? 1 : 0);
  const pulse = useSharedValue(1);
  const pop = useSharedValue(0);
  const popIndex = useSharedValue(-1);
  const seenSeq = useRef(streak?.refillSeq ?? 0);

  useEffect(() => {
    const seq = streak?.refillSeq ?? 0;
    if (seq > seenSeq.current) {
      seenSeq.current = seq;
      // зачем (макет): шкала вспыхивает 240 мс → сердце наливается 320 мс → через 500 мс шкала гаснет 200 мс
      popIndex.value = hearts - 1;
      pop.value = 0;
      pop.value = withDelay(240, withTiming(1, { duration: 320, easing: Easing.linear }));
      pulse.value = reduce ? 1 : withSequence(withTiming(1.06, { duration: 120, easing: EASE_OUT }), withTiming(1, { duration: 120, easing: EASE_OUT }));
      line.value = withDelay(240 + 320 + 500, withTiming(0, { duration: 200 }));
      return;
    }
    line.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [hearts, line, pop, popIndex, pulse, reduce, streak?.refillSeq, visible]);

  const lineStyle = useAnimatedStyle(() => ({ opacity: line.value, transform: [{ scale: pulse.value }] }));
  const filled = streak?.streak ?? 0;
  return (
    <View style={[s.hearts, { backgroundColor: p.control }, sh.nested]} accessible accessibilityLabel={spireGameText(lang, 'hearts', { n: hearts })}>
      {Array.from({ length: SPIRE_STEP_MAX_HEARTS }, (_, i) => (
        // guard-ok: ровно 3 неподвижных сердца, порядок не меняется
        <Heart key={`heart-${i}`} on={i < hearts} index={i} pop={pop} popIndex={popIndex} on_={p.text} off={p.textMuted} halo={p.accentGraphic} reduce={reduce} />
      ))}
      {enabled ? (
        <Animated.View pointerEvents="none" style={[s.streak, lineStyle]} testID="spire-streak-heart-line" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {Array.from({ length: SPIRE_STREAK_HEART_TARGET }, (_, i) => (
            // guard-ok: ровно 5 делений шкалы, порядок не меняется
            <Segment key={`seg-${i}`} filled={i < filled} color={p.accentGraphic} track={p.divider} reduce={reduce} />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  hearts: { height: 37, borderRadius: 19, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heartBox: { alignItems: 'center', justifyContent: 'center' },
  heartOff: { opacity: 0.5 },
  halo: { position: 'absolute', width: 38, height: 38, borderRadius: 19 },
  streak: { position: 'absolute', left: 13, right: 13, top: 42, flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  segFill: { ...StyleSheet.absoluteFillObject, borderRadius: 2, transformOrigin: 'left' },
});

export default memo(SpireHeartsRow);
