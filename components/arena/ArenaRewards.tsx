import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StarGlyph } from '../tournament/TournamentFx';
import { V2Card } from '../tournament/tournament_v2_ui';
import { useTournamentPalette } from '../tournament/tournament_theme';
import type { ArenaMatchReward } from '../../modules/arena/contract';
import { useCountUp } from '../league/leagueStatusShared';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

export function ArenaRewards({ reward, starsLabel }: { reward?: ArenaMatchReward; starsLabel: string }) {
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();
  const shownStars = useCountUp(reward?.starsEarned ?? 0, reduceMotion);
  return (
    <V2Card>
      <View style={styles.row}>
        <StarGlyph size={28} color={P.gold} />
        <View style={styles.copy}>
          <Text style={[styles.value, { color: P.text }]}>+{shownStars}</Text>
          <Text style={[styles.label, { color: P.muted }]}>{starsLabel}</Text>
        </View>
        {typeof reward?.ratingDelta === 'number' ? (
          <Text style={[styles.rating, { color: reward.ratingDelta >= 0 ? P.accent : P.danger }]}>
            {reward.ratingDelta >= 0 ? '+' : ''}{reward.ratingDelta}
          </Text>
        ) : null}
      </View>
    </V2Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 54, alignItems: 'center', gap: 12 },
  copy: { flex: 1 },
  value: { fontSize: 25, fontWeight: '900' },
  label: { fontSize: 13, fontWeight: '700' },
  rating: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
