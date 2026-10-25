// ═══════════════════════════════════════════════════════════════════════════
// SpireGhostLayer.tsx — «призрак друга» на ступени Пика: полоска 26 dp над кольцом + неподвижная метка на кольце
// (живой макет docs/design/v2-app/spire-step-live.html, сцена «Призрак друга»; ТЗ spire-engagement-2026-10-25.md §3а).
//
// зачем (владелец 25.10: «Аня в среднем за 2:10», среднее время из уже загруженной комнаты): человек видит, с чьим темпом он бежит.
// Полоска — абсолютная, в зазоре между шапкой и кольцом (34 dp: 4 + 26 + 4), поток экрана она НЕ двигает — «ничего не прыгает».
// Бегунок друга идёт линейно по времени на UI-треде (Reanimated, без setState в кадрах), свой — по числу сделанных заданий.
// Единственный setState — «обогнал» на смене задания (не чаще одного раза за ступень). «Уменьшить движение»: бегунок друга стоит
// в точке финиша, свой и строка меняются без анимации. Звука и вибрации нет — это фон, не событие.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import type { SpireClock } from '../../app/spire/use_spire_step_runner';
import type { SpireGhostView } from '../../app/spire/use_spire_ghost';
import { SPIRE_GHOST_TASKS_PER_STEP, spireGhostAhead, spireGhostTrackFrac } from '../../modules/spire/ghost';
import { lv2Alpha } from '../learning-v2/LearningV2Glass';
import { SPIRE_RING_R, SPIRE_RING_SIZE } from './SpireTimerRing';
import { spireClock } from './spire_game_strings';
import { spireGhostShortName, spireGhostText } from './spire_ghost_strings';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';

const STRIP_H = 26;
const TRACK_W = 96;
const MARK_R = 11;
const FADE_MS = 200; // метка тает 200 мс (макет)
const MOVE_MS = 260; // свой бегунок: 260 мс, ease-out (0.23, 1, 0.32, 1)
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type Props = Readonly<{
  lang: Lang;
  view: SpireGhostView;
  clock: SpireClock;
  paused: boolean;
  /** Сколько заданий уже сделано (индекс текущего, 0-based). */
  done: number;
}>;

function SpireGhostLayer({ lang, view, clock, paused, done }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const reduceMotion = useReducedMotion();
  const { ghost, markFrac } = view;
  const [passed, setPassed] = useState(false);
  const herX = useSharedValue(reduceMotion ? 1 : 0);
  const mineX = useSharedValue(0);
  const fade = useSharedValue(1); // 1 — призрак «бежит», 0.22/0.3 — обогнали
  const swap = useSharedValue(0); // 0 — «Аня в среднем…», 1 — «Ты впереди»

  // зачем: «обогнал» проверяем на смене задания, когда число сделанных заданий выросло, а не в кадрах; один раз за ступень.
  useEffect(() => {
    if (passed) return;
    const elapsed = clock.get();
    if (!spireGhostAhead({ done, elapsedMs: elapsed, avgMs: ghost.avgMs })) return;
    console.log('[SPIRE]', '[SPIRE-GHOST]', `обогнал: сделано=${done}/${SPIRE_GHOST_TASKS_PER_STEP} время=${elapsed}мс среднее друга=${ghost.avgMs}мс кандидат=${ghost.uid.slice(0, 6)}`); // guard-ok: единичный лог перехода
    setPassed(true);
  }, [done, passed, clock, ghost.avgMs, ghost.uid]);

  // свой бегунок: к done/10 за 260 мс
  useEffect(() => {
    const to = Math.min(1, done / SPIRE_GHOST_TASKS_PER_STEP);
    mineX.value = reduceMotion ? to : withTiming(to, { duration: MOVE_MS, easing: EASE_OUT });
  }, [done, reduceMotion, mineX]);

  // бегунок друга: линейно до финиша по оставшемуся времени; пауза (ответ, шторка, фон) — стоит, потом продолжает с точного места по часам
  useEffect(() => {
    cancelAnimation(herX);
    if (reduceMotion) { herX.value = 1; return undefined; }
    const elapsed = clock.get();
    const frac = spireGhostTrackFrac(elapsed, ghost.avgMs);
    herX.value = frac;
    if (!paused && frac < 1) herX.value = withTiming(1, { duration: Math.max(0, ghost.avgMs - elapsed), easing: Easing.linear });
    return () => cancelAnimation(herX);
  }, [paused, reduceMotion, ghost.avgMs, clock, herX]);

  // обогнали: метка и бегунок тают 200 мс, строка меняется
  useEffect(() => {
    if (!passed) return;
    const cfg = { duration: reduceMotion ? 0 : FADE_MS, easing: EASE_OUT };
    fade.value = withTiming(0.25, cfg);
    swap.value = withTiming(1, cfg);
  }, [passed, reduceMotion, fade, swap]);

  const herStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateX: herX.value * TRACK_W }] }));
  const mineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: mineX.value * TRACK_W }] }));
  const markStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const g0Style = useAnimatedStyle(() => ({ opacity: 1 - swap.value }));
  const g1Style = useAnimatedStyle(() => ({ opacity: swap.value, transform: [{ translateY: (1 - swap.value) * 4 }] }));

  const name = spireGhostShortName(ghost.name);
  const average = spireGhostText(lang, 'average', { name, t: spireClock(ghost.avgMs) });
  const ahead = spireGhostText(lang, 'ahead');
  const ghostTone = lv2Alpha(p.text, 0.15);
  // зачем: ширину блока текста держит самая длинная из двух строк (в макете grid) — иначе полоска дёргалась бы при смене
  const sizer = average.length >= ahead.length + 3 ? average : `${ahead}   `;

  return (
    <View pointerEvents="none" style={s.layer} testID="spire-ghost-layer" importantForAccessibility="no-hide-descendants">
      <View style={s.stripWrap}>
        <View style={[s.strip, { backgroundColor: p.card }, sh.nested]} accessible accessibilityLabel={passed ? ahead : average} testID="spire-ghost-strip">
          <View>
            <Text numberOfLines={1} style={[s.text, s.sizer]}>{sizer}</Text>
            <Animated.Text numberOfLines={1} style={[s.text, s.over, { color: p.textSecondary }, g0Style]}>{average}</Animated.Text>
            <Animated.View style={[s.over, s.aheadRow, g1Style]}>
              <Ionicons name="checkmark" size={14} color={p.accentText} />
              <Text numberOfLines={1} style={[s.text, s.aheadText, { color: p.accentText }]}>{ahead}</Text>
            </Animated.View>
          </View>
          <View style={s.track}>
            <View style={[s.line, { backgroundColor: p.hairline }]} />
            <View style={[s.fin, { backgroundColor: p.textSecondary }]} />
            <Animated.View style={[s.her, { backgroundColor: ghostTone }, herStyle]}>
              <Text style={[s.herLetter, { color: p.text }]}>{ghost.letter}</Text>
            </Animated.View>
            <Animated.View style={[s.mine, { backgroundColor: p.accentText, boxShadow: `0 0 0 2px ${p.card}` }, mineStyle]} />
          </View>
        </View>
      </View>
      {markFrac !== null ? (
        <View style={s.ringBox} testID="spire-ghost-mark">
          <Animated.View style={[s.mark, markPos(markFrac), { backgroundColor: p.card }, markStyle]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: ghostTone, borderRadius: MARK_R }]} />
            <Text style={[s.markLetter, { color: p.text }]}>{ghost.letter}</Text>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

/** Центр метки на дуге кольца: от верха по часовой на markFrac оборота (как конец дуги таймера в этот момент). */
function markPos(frac: number): { left: number; top: number } {
  const a = (frac * 360 - 90) * Math.PI / 180;
  const c = SPIRE_RING_SIZE / 2;
  return { left: c + SPIRE_RING_R * Math.cos(a) - MARK_R, top: c + SPIRE_RING_R * Math.sin(a) - MARK_R };
}

const s = StyleSheet.create({
  // слой — поверх ringWrap (маргин 34 сверху), потока не занимает
  layer: { position: 'absolute', top: 0, left: 0, right: 0, height: SPIRE_RING_SIZE },
  // полоска: 4 dp под шапкой, 26 dp высотой, 4 dp над кольцом (зазор 34)
  stripWrap: { position: 'absolute', top: -(STRIP_H + 4), left: 0, right: 0, alignItems: 'center' },
  strip: { height: STRIP_H, borderRadius: STRIP_H / 2, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '100%' },
  text: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  sizer: { opacity: 0 },
  over: { position: 'absolute', left: 0, top: 0 },
  aheadRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aheadText: { fontWeight: '700' },
  track: { width: TRACK_W, height: 18 },
  line: { position: 'absolute', left: 0, right: 0, top: 8, height: 2, borderRadius: 1 },
  fin: { position: 'absolute', right: -1, top: 4, width: 2, height: 10, borderRadius: 1, opacity: 0.5 },
  her: { position: 'absolute', top: 1, left: -8, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  herLetter: { fontSize: 9, lineHeight: 11, fontWeight: '700' }, // d145-micro: буква в бегунке 16 dp, 9 sp — как в живом макете spire-step-live.html
  mine: { position: 'absolute', top: 4, left: -5, width: 10, height: 10, borderRadius: 5 },
  ringBox: { position: 'absolute', top: 0, left: '50%', width: SPIRE_RING_SIZE, height: SPIRE_RING_SIZE, marginLeft: -SPIRE_RING_SIZE / 2 },
  mark: { position: 'absolute', width: MARK_R * 2, height: MARK_R * 2, borderRadius: MARK_R, alignItems: 'center', justifyContent: 'center' },
  markLetter: { fontSize: 12, lineHeight: 15, fontWeight: '700' }, // d145-micro: буква на метке 22 dp, 12 sp — как в живом макете spire-step-live.html
});

export default memo(SpireGhostLayer);
