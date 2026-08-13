import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInLeft } from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { LeagueHubPalette } from './leagueHubPalette';

/**
 * Лента гонки: 2–4 живых события недели (буст, соседи по рейтингу).
 * Только конечные анимации (въезд слева со stagger).
 */

export interface LeagueRaceFeedItem {
  key: string;
  emoji?: string;
  text: string;
  trend?: 'up' | 'down' | 'heart' | null;
}

interface LeagueRaceFeedProps {
  palette: LeagueHubPalette;
  items: LeagueRaceFeedItem[];
}

function trendMark(trend: LeagueRaceFeedItem['trend']): string {
  if (trend === 'up') return '▲';
  if (trend === 'down') return '▼';
  if (trend === 'heart') return '♥';
  return '';
}

function LeagueRaceFeedComponent({ palette, items }: LeagueRaceFeedProps) {
  const reduceMotion = useReduceMotion();
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap} testID="league-race-feed">
      {items.map((item, index) => (
        <Reanimated.View
          key={item.key}
          entering={reduceMotion ? undefined : FadeInLeft.delay(120 + index * 120).duration(260)}
          style={[styles.item, { backgroundColor: palette.surface }]}
        >
          {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
          <Text numberOfLines={2} style={[styles.text, { color: palette.muted }]}>{item.text}</Text>
          {item.trend ? (
            <Text style={[styles.trend, { color: item.trend === 'up' ? palette.positive : item.trend === 'down' ? palette.negative : palette.negative }]}>
              {trendMark(item.trend)}
            </Text>
          ) : null}
        </Reanimated.View>
      ))}
    </View>
  );
}

export const LeagueRaceFeed = memo(LeagueRaceFeedComponent);

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 5,
  },
  emoji: { fontSize: 14 },
  text: { flex: 1, fontSize: 11.5, fontWeight: '700', lineHeight: 16 },
  trend: { fontSize: 12, fontWeight: '900' },
});
