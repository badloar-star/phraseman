/**
 * «Дуэль на 5 фраз» (идея 3) — шапка хода: закрыть, полоса «2 из 5», подпись «Дуэль · 2 из 5» и таймер фразы.
 * зачем (макет docs/design/v2-app/friends-full.html, «Фраза 2 из 5»: .tvtop, .trk2, .tvn, .timer): размеры — общие токены шапки
 * заданий (LV2_TASK_LAYOUT), чтобы дуэль и урок не разошлись. Таймер — отдельный маленький компонент: тикает только он,
 * экран с плитками раз в секунду не перерисовывается.
 */
import React, { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FlowText } from '../text-integrity';
import { useLv2Glass, type Lv2Glass } from '../learning-v2/LearningV2Glass';
import { LV2_TASK_LAYOUT, lv2TaskPlateStyle, lv2TaskTrackColor } from '../learning-v2/learning_v2_task_layout_tokens';
import { hapticTap } from '../../hooks/use-haptics';
import { DUEL_PHRASE_MAX_MS } from '../../app/friends_together/duel_core';
import { duelClock } from '../../app/friends_together/duel_play_copy';

type TimerProps = Readonly<{ startedAtMs: number; frozenMs: number | null; label: string; textScale: number; g: Lv2Glass }>;

/** Часы фразы «0:07»: идут от показа фразы, на «Проверить» замирают. Тик выровнен по секундам от начала фразы. */
const DuelTimerPill = memo(function DuelTimerPill({ startedAtMs, frozenMs, label, textScale, g }: TimerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (frozenMs !== null) return undefined;
    let handle: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const now = Date.now();
      setNowMs(now);
      if (now - startedAtMs >= DUEL_PHRASE_MAX_MS) return;
      handle = setTimeout(tick, 1000 - ((now - startedAtMs) % 1000) + 8);
    };
    tick();
    return () => {
      if (handle !== null) clearTimeout(handle);
    };
  }, [frozenMs, startedAtMs]);
  const shownMs = frozenMs ?? Math.min(Math.max(0, nowMs - startedAtMs), DUEL_PHRASE_MAX_MS);
  const clock = duelClock(shownMs);
  return (
    <View style={[styles.timer, lv2TaskPlateStyle(g)]} accessible accessibilityLabel={`${label} ${clock}`}>
      <Ionicons name="timer-outline" size={16} color={g.text} accessible={false} />
      <FlowText testID="friend-duel-timer" provenance="authored" style={[styles.timerText, { color: g.text, fontSize: 16 * textScale, lineHeight: 21 * textScale }]}>
        {clock}
      </FlowText>
    </View>
  );
});

type Props = Readonly<{
  current: number;
  total: number;
  progressLabel: string;
  closeLabel: string;
  timeLabel: string;
  startedAtMs: number;
  frozenMs: number | null;
  textScale: number;
  onClose: () => void;
}>;

/** Крестик экрана дуэли (`.mrb.t` / `.ldh .x` макета): круг 44 в тоне контрола, без тени; нажатие чуть сжимает круг. */
export const DuelCloseButton = memo(function DuelCloseButton({ label, onPress }: Readonly<{ label: string; onPress: () => void }>) {
  const g = useLv2Glass();
  return (
    <Pressable
      testID="friend-duel-close"
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        void hapticTap();
        onPress();
      }}
      style={({ pressed }) => [styles.close, { backgroundColor: g.opaqueControl, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
    >
      <Ionicons name="close" size={20} color={g.text} accessible={false} />
    </Pressable>
  );
});

function DuelPlayTopBar({ current, total, progressLabel, closeLabel, timeLabel, startedAtMs, frozenMs, textScale, onClose }: Props) {
  const g = useLv2Glass();
  const fill = `${Math.max(0, Math.min(1, current / total)) * 100}%` as const;
  return (
    <View style={styles.bar}>
      <DuelCloseButton label={closeLabel} onPress={onClose} />
      <View style={styles.middle} accessible accessibilityRole="progressbar" accessibilityLabel={progressLabel} accessibilityValue={{ min: 0, max: total, now: current }}>
        <View style={[styles.track, { backgroundColor: lv2TaskTrackColor(g) }]}>
          <View style={[styles.trackFill, { width: fill, backgroundColor: g.accent }]} />
        </View>
        <FlowText testID="friend-duel-progress" provenance="authored" style={[styles.label, { color: g.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{/* guard-ok: подпись полосы прогресса (.tvn макета), не расшифровка */}
          {progressLabel}
        </FlowText>
      </View>
      <DuelTimerPill startedAtMs={startedAtMs} frozenMs={frozenMs} label={timeLabel} textScale={textScale} g={g} />
    </View>
  );
}

export default memo(DuelPlayTopBar);

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: LV2_TASK_LAYOUT.topBar.gap, minHeight: LV2_TASK_LAYOUT.topBar.minHeight, marginTop: LV2_TASK_LAYOUT.topBar.marginTop },
  // `.mrb.t` дуэли: круг 44 в тоне контрола, без тени (в отличие от `.tvx` урока).
  close: { width: LV2_TASK_LAYOUT.close.size, height: LV2_TASK_LAYOUT.close.size, borderRadius: LV2_TASK_LAYOUT.close.size / 2, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, minWidth: 0 },
  track: { height: LV2_TASK_LAYOUT.progress.height, borderRadius: LV2_TASK_LAYOUT.progress.radius, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: LV2_TASK_LAYOUT.progress.radius },
  label: { marginTop: LV2_TASK_LAYOUT.progress.labelGap, fontWeight: '700' },
  // `.timer`: 34, поля 12, радиус 17, зазор 6, 16 жирный, цифры одной ширины.
  timer: { minHeight: 34, paddingHorizontal: 12, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerText: { fontWeight: '700', fontVariant: ['tabular-nums'] },
});
