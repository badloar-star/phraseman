import React, { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { buildTodayActivityHistory, type TodayActivityHistoryRow } from '../../../app/today_activity_history';
import { alphaHex, V2_TYPE } from '../../../constants/v2Style';
import { useLang } from '../../LangContext';
import { todayRingColors, useStreakColors } from '../../streak/moments/use_streak_colors';
import { useV2Palette } from '../../v2/useV2Palette';
import type { TodayTask } from './home_v2_types';
import { todayHistoryCount, todayHistoryDateLabel, todayHistoryDayA11y, todayHistoryRailA11y } from './today_activity_history_copy';

// зачем (22.10 владелец — восстановить работу 19.10; координатор): жёсткие цвета колец и текста заменены токенами темы — кольца теми же цветами, что кольца дня
// (todayRingColors), дорожка и текст от цвета текста темы; тексты и даты на 9 языках (today_activity_history_copy).
const FALLBACK_RING_COLORS = ['#7EF0C8', '#A08CFF', '#F0C551'] as const; // theme-exempt: запасные цвета колец, пока токены темы не готовы (эталон RC)
const RADII = [27, 20, 13] as const;
const STROKE = 4;
const SIZE = 62;

type Props = Readonly<{
  dayKey: string;
  tasks: readonly TodayTask[];
}>;

function rowFromTasks(dayKey: string, tasks: readonly TodayTask[]): readonly TodayActivityHistoryRow[] {
  const progress = tasks.slice(0, 3).map((task) => task.progress);
  const targets = tasks.slice(0, 3).map((task) => task.target);
  return buildTodayActivityHistory(dayKey, progress, targets);
}

function completionCount(row: TodayActivityHistoryRow): number {
  return row.progress.reduce((count, value, index) => count + (value >= row.targets[index]! && row.targets[index]! > 0 ? 1 : 0), 0);
}

function ActivityRings({ row, colors, track }: Readonly<{ row: TodayActivityHistoryRow; colors: readonly string[]; track: string }>) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={s.svg} accessible={false}>
      {RADII.map((radius, index) => {
        const length = 2 * Math.PI * radius;
        const fraction = row.targets[index]! > 0 ? Math.min(1, row.progress[index]! / row.targets[index]!) : 0;
        return (
          <React.Fragment key={radius}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={radius} fill="none" stroke={track} strokeWidth={STROKE} />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              fill="none"
              stroke={colors[index] ?? FALLBACK_RING_COLORS[index]!}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={length}
              strokeDashoffset={length * (1 - fraction)}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function TodayActivityHistory({ dayKey, tasks }: Props) {
  const { lang } = useLang();
  const p = useV2Palette();
  const streakColors = useStreakColors(true);
  const ringColors = streakColors ? todayRingColors(streakColors) : FALLBACK_RING_COLORS;
  const track = alphaHex(p.text, 0.16);
  const rows = useMemo(() => rowFromTasks(dayKey, tasks), [dayKey, tasks]);
  const [selectedDayKey, setSelectedDayKey] = useState(dayKey);
  if (rows.length === 0) return null;
  const selected = rows.some((row) => row.dayKey === selectedDayKey) ? selectedDayKey : rows[rows.length - 1]!.dayKey;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.rail}
      accessibilityLabel={todayHistoryRailA11y(lang)}
    >
      {rows.map((row) => {
        const completed = completionCount(row);
        const active = row.dayKey === selected;
        return (
          <Pressable
            key={row.dayKey}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={todayHistoryDayA11y(lang, row.dayKey, completed)}
            onPress={() => setSelectedDayKey(row.dayKey)}
            style={({ pressed }) => [s.day, active ? s.selected : null, pressed ? s.pressed : null]}
          >
            <ActivityRings row={row} colors={ringColors} track={track} />
            <Text style={[s.date, { color: active ? p.text : p.textSecondary }]}>{todayHistoryDateLabel(lang, row.dayKey)}</Text>
            <Text style={[s.count, { color: active ? p.text : p.textSecondary }]}>{todayHistoryCount(lang, completed)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  rail: { gap: 18, paddingHorizontal: 12, paddingVertical: 8 },
  day: { width: 66, alignItems: 'center', gap: 7, opacity: 0.82 },
  selected: { opacity: 1 },
  pressed: { transform: [{ scale: 0.94 }] },
  svg: { transform: [{ rotate: '-90deg' }] },
  date: { ...V2_TYPE.caption, fontWeight: '700', textAlign: 'center' },
  count: { ...V2_TYPE.caption, fontSize: 10, lineHeight: 13, textAlign: 'center' },
});

export default memo(TodayActivityHistory);
