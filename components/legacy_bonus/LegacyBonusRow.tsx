// ═══════════════════════════════════════════════════════════════════════════
// LegacyBonusRow.tsx — одна строка пересчёта окна «Встречайте PhraseMan 2.0»: «Опыт (XP)  8 362 → +836».
//
// зачем (макет Q9jqpBbjwJEFV1DpdEGx2h, .row / burnRow): строка «сгорает» — старое число отсчитывается до нуля за 520 мс, над значением
// всплывает «+N монет» (980 мс), плитка закрашивается акцентом и показывает галочку, справа проявляется новое значение «+N».
// Всё состояние строки живёт ЗДЕСЬ (общий прогресс на UI-треде + локальный интервал для отсчёта числа): шторка не перерисовывается.
// Управление — императивно: play() запускает «сгорание», finish() сразу показывает итог (уменьшить движение).
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { formatBonusNumber, type LegacyBonusRowVM } from '../../modules/legacy_bonus/legacy_bonus_view';
import { legacyBonusCoinWord, legacyBonusRowTitle } from '../../modules/legacy_bonus/legacy_bonus_strings';

const ICON: Readonly<Record<LegacyBonusRowVM['key'], keyof typeof Ionicons.glyphMap>> = {
  xp: 'sparkles-outline',
  pearls: 'ellipse-outline',
  spins: 'disc-outline',
};

/** Сколько длится отсчёт старого числа до нуля (макет countDown(old, …, 520)). */
export const LEGACY_BONUS_ROW_COUNTDOWN_MS = 520;
const CHIP_MS = 980;
const SWAP_MS = 360;
const EASE_POP = Easing.bezier(0.34, 1.56, 0.64, 1);
const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

export type LegacyBonusRowHandle = Readonly<{
  play: () => void;
  finish: () => void;
}>;

type Props = Readonly<{
  lang: Lang;
  row: LegacyBonusRowVM;
  glass: GlassTokens;
  reduceMotion: boolean;
  testID?: string;
}>;

const LegacyBonusRow = forwardRef<LegacyBonusRowHandle, Props>(function LegacyBonusRow({ lang, row, glass, reduceMotion, testID }, ref) {
  const [oldValue, setOldValue] = useState(reduceMotion ? 0 : row.from);
  const active = useSharedValue(0);
  const done = useSharedValue(reduceMotion ? 1 : 0);
  const chip = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accentSoft = glass.accentSoft;

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const countDown = useCallback(() => {
    stopTimer();
    const t0 = Date.now();
    timerRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / LEGACY_BONUS_ROW_COUNTDOWN_MS);
      setOldValue(Math.round(row.from * Math.pow(1 - p, 3))); // 1 − easeOutCubic(p)
      if (p >= 1) stopTimer();
    }, 33);
  }, [row.from, stopTimer]);

  useImperativeHandle(ref, () => ({
    play: () => {
      console.log(`[LEGACY-BONUS] строка ${row.key}: было=${row.from} монет=${row.coins}`); // guard-ok: одна строка на показ
      active.value = withTiming(1, { duration: SWAP_MS, easing: EASE_OUT });
      countDown();
      chip.value = 0;
      chip.value = withTiming(1, { duration: CHIP_MS, easing: Easing.linear });
      // макет: через 560 мс строка из «в работе» переходит в «готово»
      if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
      swapTimerRef.current = setTimeout(() => {
        active.value = withTiming(0, { duration: SWAP_MS, easing: EASE_OUT });
        done.value = withTiming(1, { duration: SWAP_MS, easing: EASE_OUT });
      }, 560);
    },
    finish: () => {
      stopTimer();
      if (swapTimerRef.current) { clearTimeout(swapTimerRef.current); swapTimerRef.current = null; }
      setOldValue(0);
      done.value = 1;
    },
  }), [active, chip, countDown, done, row.coins, row.from, row.key, stopTimer]);

  useEffect(() => () => {
    stopTimer();
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
  }, [stopTimer]);

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(done.value, [0, 1], [glass.opaqueControl, glass.opaqueCard]),
  }));
  const tileStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(done.value, [0, 1], [interpolateColor(active.value, [0, 1], [glass.opaqueSheet, accentSoft]), glass.accent]),
  }));
  const iconStyle = useAnimatedStyle(() => ({ opacity: 1 - done.value, transform: [{ scale: interpolate(done.value, [0, 1], [1, 0.6]) }] }));
  const okStyle = useAnimatedStyle(() => ({ opacity: done.value, transform: [{ scale: interpolate(done.value, [0, 1], [0.4, 1]) }] }));
  const oldStyle = useAnimatedStyle(() => ({ opacity: 1 - done.value }));
  const newStyle = useAnimatedStyle(() => ({ opacity: done.value, transform: [{ translateY: 6 * (1 - done.value) }] }));
  const chipStyle = useAnimatedStyle(() => {
    const t = chip.value;
    return {
      opacity: interpolate(t, [0, 0.14, 0.68, 1], [0, 1, 1, 0]),
      transform: [
        { translateY: interpolate(t, [0, 0.14, 0.68, 1], [6, -2, -16, -26]) },
        { scale: interpolate(t, [0, 0.14, 0.68, 1], [0.86, 1, 1, 0.98]) },
      ],
    };
  });
  // название темнеет, когда строка готова
  const titleStyle = useAnimatedStyle(() => ({ color: interpolateColor(done.value, [0, 1], [glass.text, glass.secondary]) }));

  return (
    <Animated.View style={[s.row, rowStyle]} testID={testID}>
      <Animated.View style={[s.tile, tileStyle]}>
        <Animated.View style={iconStyle}><Ionicons name={ICON[row.key]} size={19} color={glass.text} /></Animated.View>
        <Animated.View style={[s.ok, okStyle]}><Ionicons name="checkmark" size={18} color={glass.accentInk} /></Animated.View>
      </Animated.View>
      <Animated.Text style={[s.title, titleStyle]} numberOfLines={2}>{legacyBonusRowTitle(lang, row.key)}</Animated.Text>
      <View style={s.val}>
        <Animated.Text style={[s.valText, { color: glass.text }, oldStyle]} testID={testID ? `${testID}-old` : undefined}>{formatBonusNumber(oldValue)}</Animated.Text>
        <Animated.Text style={[s.valText, s.valNew, { color: glass.accent }, newStyle]} testID={testID ? `${testID}-new` : undefined}>{`+${formatBonusNumber(row.coins)}`}</Animated.Text>
        <Animated.View pointerEvents="none" style={[s.chip, { backgroundColor: accentSoft }, chipStyle]}>
          <Text style={[s.chipText, { color: glass.accent }]}>{`+${formatBonusNumber(row.coins)} ${legacyBonusCoinWord(lang, row.coins)}`}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  // макет `.row`: min 50, поля 7/10/7/8, радиус 14, зазор 10
  row: { minHeight: 50, paddingVertical: 7, paddingRight: 10, paddingLeft: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ok: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  // `.row .tt`: 16/20, 700
  title: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  val: { minWidth: 64, alignItems: 'flex-end', justifyContent: 'center' },
  valText: { fontSize: 16, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'right' },
  valNew: { position: 'absolute', right: 0, top: 0 },
  // `.chip`: над значением, пилюля 13/17 (шкала проекта: 13 → 17; было 16 — красный сторож типографики, координатор 15.10), 700
  chip: { position: 'absolute', right: 0, bottom: '100%', marginBottom: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 },
  chipText: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

export default memo(LegacyBonusRow);
