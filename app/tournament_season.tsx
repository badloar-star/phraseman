// ═══════════════════════════════════════════════════════════════════════════
// tournament_season.tsx — недельный сезон (макеты 21-23).
//
// зачем: удержание между турнирами. Лидерборд недели, отсчёт до сброса
// (красный за 3 часа) и тиры наград. Своя строка подсвечена и всегда видна.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Card } from '../components/tournament/tournament_ui';
import { TimeLeft, useCountdown } from '../components/tournament/TournamentCountdown';
import { T, placeColor, radius, type } from '../components/tournament/tournament_theme';

type SeasonRow = {
  id: number;
  name: string;
  emoji: string;
  color: string;
  points: number;
  isYou?: boolean;
};

/** TODO(server): придёт из недельного рейтинга (tournamentSeasons). */
const SEASON_ROWS: SeasonRow[] = [
  { id: 1, name: 'КубокБарон', emoji: '👑', color: '#FFD43B', points: 412 },
  { id: 2, name: 'МолнияPRO', emoji: '⚔️', color: '#FF5B6C', points: 388 },
  { id: 3, name: 'СловоЖора', emoji: '🐺', color: '#8B8B8B', points: 341 },
  { id: 4, name: 'Полиглот_77', emoji: '🌍', color: '#3B82F6', points: 305 },
  { id: 5, name: 'IdiomHunter', emoji: '🏹', color: '#47C870', points: 289 },
  { id: 6, name: 'Вы', emoji: '🦊', color: '#FB923C', points: 265, isYou: true },
  { id: 7, name: 'Фразочкина', emoji: '🦉', color: '#47C870', points: 240 },
  { id: 8, name: 'VerbaVolt', emoji: '⚡', color: '#FFD43B', points: 228 },
];

const TIERS = [
  { range: '1 место', reward: '👑 Рамка чемпиона + 200 💎' },
  { range: 'Топ-3', reward: '100 💎 + титул' },
  { range: 'Топ-5', reward: '50 💎' },
  { range: 'Топ-10', reward: '20 💎' },
];

export default function TournamentSeasonScreen() {
  const insets = useStableSafeAreaInsets();
  // Отсчёт до сброса недели.
  const secondsToReset = useCountdown(2 * 3600 + 41 * 60);
  const urgent = secondsToReset <= 3 * 3600;

  const myRow = SEASON_ROWS.find((row) => row.isYou);
  const myPlace = myRow ? SEASON_ROWS.indexOf(myRow) + 1 : 0;
  const toTop5 = myPlace > 5 && myRow
    ? (SEASON_ROWS[4]?.points ?? 0) - myRow.points + 1
    : 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Сезон</Text>

        {/* Отсчёт до сброса */}
        <Card tone="elev" pad={22}>
          <Text style={[styles.resetKicker, urgent && { color: T.danger }]}>
            {urgent ? 'Сезон почти закончился' : 'До конца сезона'}
          </Text>
          <View style={styles.resetTimer}>
            <TimeLeft seconds={secondsToReset} size={44} color={urgent ? T.danger : T.text} />
          </View>
          {toTop5 > 0 ? (
            <Text style={styles.resetHint}>До топ-5 осталось {toTop5} очков</Text>
          ) : null}
        </Card>

        {/* Лидерборд */}
        <View style={styles.list}>
          {SEASON_ROWS.map((row, index) => (
            <Animated.View
              key={row.id}
              entering={FadeInDown.delay(index * 40).duration(240)}
            >
              <SeasonRowItem row={row} place={index + 1} />
            </Animated.View>
          ))}
        </View>

        {/* Тиры наград */}
        <Card pad={18}>
          <Text style={styles.tiersTitle}>Награды недели</Text>
          {TIERS.map((tier) => (
            <View key={tier.range} style={styles.tierRow}>
              <Text style={styles.tierRange}>{tier.range}</Text>
              <Text style={styles.tierReward}>{tier.reward}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const SeasonRowItem = memo(function SeasonRowItem({
  row, place,
}: { row: SeasonRow; place: number }) {
  return (
    <View style={[styles.row, row.isYou && styles.rowYou]}>
      <Text style={[styles.place, { color: placeColor(place) }]} allowFontScaling={false}>
        {place}
      </Text>
      <View style={[styles.avatar, { backgroundColor: `${row.color}33` }]}>
        <Text style={styles.avatarEmoji}>{row.emoji}</Text>
      </View>
      <Text style={[styles.name, row.isYou && { color: T.accent }]} numberOfLines={1}>
        {row.name}
      </Text>
      <Text style={styles.points} allowFontScaling={false}>{row.points}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, gap: 14 },

  title: { ...type.title, color: T.text },

  resetKicker: {
    ...type.label,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: T.muted,
    textAlign: 'center',
  },
  resetTimer: { marginTop: 10 },
  resetHint: { ...type.body, color: T.muted, textAlign: 'center', marginTop: 10 },

  list: { gap: 8 },
  row: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: T.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  rowYou: { backgroundColor: T.accentSoft },
  place: { width: 22, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  avatar: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 17 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: T.text },
  points: {
    fontSize: 17,
    fontWeight: '900',
    color: T.text,
    fontVariant: ['tabular-nums'],
  },

  tiersTitle: { fontSize: 17, fontWeight: '800', color: T.text, marginBottom: 10 },
  tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 12 },
  tierRange: { width: 80, ...type.body, fontWeight: '800', color: T.gold },
  tierReward: { flex: 1, ...type.body, color: T.muted },
});
