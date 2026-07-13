import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { LeagueHubPalette } from './leagueHubPalette';

export interface LeagueQuickStatItem {
  id: string;
  label: string;
  value: string;
  hint: string;
  onPress: () => void;
}

interface LeagueQuickStatsProps {
  items: readonly LeagueQuickStatItem[];
  palette: LeagueHubPalette;
}

function QuickStat({ item, palette, compact }: { item: LeagueQuickStatItem; palette: LeagueHubPalette; compact: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.label}: ${item.value}`}
      accessibilityHint={item.hint}
      onPress={item.onPress}
      style={({ pressed }) => [styles.card, compact && styles.compactCard, { backgroundColor: palette.surface, opacity: pressed ? 0.82 : 1 }]}
    >
      <Text style={[styles.label, { color: palette.muted }]}>{item.label}</Text>
      <Text style={[styles.value, { color: palette.text }]}>{item.value}</Text>
    </Pressable>
  );
}

function LeagueQuickStatsComponent({ items, palette }: LeagueQuickStatsProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const compact = width <= 360;
  const cards = items.slice(0, 3).map((item) => <QuickStat key={item.id} item={item} palette={palette} compact={compact} />);

  return (
    <Reanimated.View entering={reduceMotion ? undefined : FadeInUp.delay(40).duration(220)} testID="league-quick-stats">
      {compact ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{cards}</ScrollView>
      ) : (
        <View style={styles.row}>{cards}</View>
      )}
    </Reanimated.View>
  );
}

export const LeagueQuickStats = memo(LeagueQuickStatsComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, minWidth: 0, minHeight: 78, paddingHorizontal: 13, paddingVertical: 12, borderRadius: 19, justifyContent: 'space-between' },
  compactCard: { flex: 0, width: 136 },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 18, fontWeight: '900', flexWrap: 'wrap' },
});
