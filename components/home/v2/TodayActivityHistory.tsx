import React, { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { buildTodayActivityHistory, type TodayActivityHistoryRow } from '../../../app/today_activity_history';
import { alphaHex } from '../../../constants/v2Style';
import { useLang } from '../../LangContext';
import { todayRingColors, useStreakColors } from '../../streak/moments/use_streak_colors';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { useTheme } from '../../ThemeContext';
import { plateBoxShadow, useShadowGlass } from '../../v2/ShadowSurface';
import type { TodayTask } from './home_v2_types';
import { todayHistoryCount, todayHistoryDateLabel, todayHistoryDayA11y, todayHistoryFullDays, todayHistoryRailA11y, todayHistoryTitle } from './today_activity_history_copy';

// зачем (22.10 владелец — восстановить работу 19.10; координатор): жёсткие цвета колец и текста заменены токенами темы — кольца теми же цветами, что кольца дня
// (todayRingColors), дорожка и текст от цвета текста темы; тексты и даты на 9 языках (today_activity_history_copy).
const FALLBACK_RING_COLORS = ['#7EF0C8', '#A08CFF', '#F0C551'] as const; // theme-exempt: запасные цвета колец, пока токены темы не готовы (эталон RC)
const RADII = [27, 20, 13] as const;
const STROKE = 4;
const SIZE = 62;
/** Размер колец дня в ленте (эталон `.td-mini`: 44 при внутренней сетке 62). */
const DISPLAY = 44;

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
    <Svg width={DISPLAY} height={DISPLAY} viewBox={`0 0 ${SIZE} ${SIZE}`} style={s.svg} accessible={false}>
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
  // зачем (эталон today-scene-concepts.html, `.td-hist`; владелец «точно как на макетах», 22.10): лента — карточка цвета темы уровня «Максимум» (как панель сцены) с заголовком «История»
  // и счётчиком «N полных дней»; день выбран подсветкой акцента 12 %
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const glass = useShadowGlass();
  const p = useMemo(() => liquidGlassTokens(liquidGlassThemeId, { level: 'max', appearance: liquidGlassAppearance }), [liquidGlassThemeId, liquidGlassAppearance]);
  const streakColors = useStreakColors(true);
  const ringColors = streakColors ? todayRingColors(streakColors) : FALLBACK_RING_COLORS;
  const track = alphaHex(p.text, 0.16);
  const rows = useMemo(() => rowFromTasks(dayKey, tasks), [dayKey, tasks]);
  const [selectedDayKey, setSelectedDayKey] = useState(dayKey);
  if (rows.length === 0) return null;
  const fullDays = rows.filter((row) => completionCount(row) === 3).length;
  const selected = rows.some((row) => row.dayKey === selectedDayKey) ? selectedDayKey : rows[rows.length - 1]!.dayKey;
  return (
    <View testID="today-activity-history" style={[s.card, { backgroundColor: p.opaqueCard, boxShadow: plateBoxShadow(glass) }]}>
      <View style={s.head}>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{todayHistoryTitle(lang)}</Text>
        <Text style={[s.fullDays, { color: p.secondary }]}>{todayHistoryFullDays(lang, fullDays)}</Text>
      </View>
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
            style={({ pressed }) => [s.day, active ? { backgroundColor: alphaHex(p.accent, 0.12) } : null, pressed ? s.pressed : null]}
          >
            <ActivityRings row={row} colors={ringColors} track={track} />
            <Text style={[s.date, { color: p.text }]}>{todayHistoryDateLabel(lang, row.dayKey)}</Text>
            <Text style={[s.count, { color: p.secondary }]}>{todayHistoryCount(lang, completed)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  // `.td-hist`: поля 14 16 0, радиус 28, внутри 14 14 12; заголовок `.hm-h` 20/26 700 + счётчик 15/400 справа; дни `.td-days` gap 6 (подпись и счётчик — 13/17 по шкале D145)
  card: { marginHorizontal: 16, borderRadius: 28, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  fullDays: { fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'] },
  rail: { gap: 6, paddingTop: 10 },
  day: { width: 66, alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 7, borderRadius: 16 },
  pressed: { transform: [{ scale: 0.94 }] },
  svg: { transform: [{ rotate: '-90deg' }] },
  date: { fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  // зачем (сторож типографики D145 «шрифт < 13»): подпись «N из 3» под кольцами дня 13/17, как остальные подписи
  count: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
});

export default memo(TodayActivityHistory);
