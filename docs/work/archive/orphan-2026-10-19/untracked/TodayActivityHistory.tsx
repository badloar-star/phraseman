import React, { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { buildTodayActivityHistory, type TodayActivityHistoryRow } from '../../../app/today_activity_history';
import { V2_TYPE } from '../../../constants/v2Style';
import type { TodayTask } from './home_v2_types';

const RING_COLORS = ['#54E6CE', '#92A8FF', '#F4B96D'] as const;
const RING_TRACK = 'rgba(255,255,255,0.12)';
const RADII = [27, 20, 13] as const;
const STROKE = 4;
const SIZE = 62;

type Props = Readonly<{
  dayKey: string;
  tasks: readonly TodayTask[];
}>;

function dateLabel(dayKey: string): string {
  const [, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey) ?? [];
  const names = ['янв.', 'фев.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'];
  return month && day ? `${Number(day)} ${names[Number(month) - 1] ?? ''}` : dayKey;
}

function rowFromTasks(dayKey: string, tasks: readonly TodayTask[]): readonly TodayActivityHistoryRow[] {
  const progress = tasks.slice(0, 3).map((task) => task.progress);
  const targets = tasks.slice(0, 3).map((task) => task.target);
  return buildTodayActivityHistory(dayKey, progress, targets);
}

function completionCount(row: TodayActivityHistoryRow): number {
  return row.progress.reduce((count, value, index) => count + (value >= row.targets[index]! && row.targets[index]! > 0 ? 1 : 0), 0);
}

function ActivityRings({ row }: Readonly<{ row: TodayActivityHistoryRow }>) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={s.svg} accessible={false}>
      {RADII.map((radius, index) => {
        const length = 2 * Math.PI * radius;
        const fraction = row.targets[index]! > 0 ? Math.min(1, row.progress[index]! / row.targets[index]!) : 0;
        return (
          <React.Fragment key={radius}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={radius} fill="none" stroke={RING_TRACK} strokeWidth={STROKE} />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              fill="none"
              stroke={RING_COLORS[index]!}
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
  const rows = useMemo(() => rowFromTasks(dayKey, tasks), [dayKey, tasks]);
  const [selectedDayKey, setSelectedDayKey] = useState(dayKey);
  if (rows.length === 0) return null;
  const selected = rows.some((row) => row.dayKey === selectedDayKey) ? selectedDayKey : rows[rows.length - 1]!.dayKey;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.rail}
      accessibilityLabel="История активности за дни"
    >
      {rows.map((row) => {
        const completed = completionCount(row);
        const active = row.dayKey === selected;
        return (
          <Pressable
            key={row.dayKey}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${dateLabel(row.dayKey)}: завершено ${completed} из 3`}
            onPress={() => setSelectedDayKey(row.dayKey)}
            style={({ pressed }) => [s.day, active ? s.selected : null, pressed ? s.pressed : null]}
          >
            <ActivityRings row={row} />
            <Text style={[s.date, active ? s.activeText : null]}>{dateLabel(row.dayKey)}</Text>
            <Text style={[s.count, active ? s.activeText : null]}>{completed} из 3</Text>
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
  date: { ...V2_TYPE.caption, color: '#9BBAB7', fontWeight: '700', textAlign: 'center' },
  count: { ...V2_TYPE.caption, color: '#9BBAB7', fontSize: 10, lineHeight: 13, textAlign: 'center' },
  activeText: { color: '#EFFFFC' },
});

export default memo(TodayActivityHistory);
