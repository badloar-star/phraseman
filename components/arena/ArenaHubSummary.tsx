import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Card } from '../ui/v2_ui';
import { useTournamentPalette } from '../ui/v2_theme';
import { useLang } from '../LangContext';
import { arenaText } from '../../modules/arena/copy';
import type { ArenaHubModel } from '../../modules/arena/hub_view';
import { ArenaRankStars } from './ArenaRankStars';

const TIER_COPY = [
  'tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum',
  'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend',
] as const;
const ROMAN = ['', 'I', 'II', 'III'] as const;

export function ArenaHubSummary({ model }: Readonly<{ model: ArenaHubModel }>) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const rank = model.rank;
  const stats = model.stats;
  const rankLabel = rank
    ? `${arenaText(lang, TIER_COPY[rank.tierIndex])} · ${ROMAN[rank.division]}`
    : '—';
  const cells = [
    { label: arenaText(lang, 'wins'), value: stats?.wins ?? '—' },
    { label: arenaText(lang, 'losses'), value: stats?.losses ?? '—' },
    { label: arenaText(lang, 'streakLabel'), value: model.streak ?? '—' },
    {
      // зачем: владелец (2026-08-23) убрал очки ранга — до следующего ранга
      // осталось N побед (1 победа = 1 звезда), а не N очков.
      label: rank?.top ? arenaText(lang, 'rankTop') : arenaText(lang, 'rankNext'),
      value: rank ? (rank.top ? '✓' : `${rank.winsToNextRank} ★`) : '—',
    },
  ];

  return (
    <V2Card pad={16} style={styles.card}>
      <View style={styles.rankRow}>
        <View style={styles.rankCopy}>
          <Text style={[styles.kicker, { color: P.muted }]}>{arenaText(lang, 'ranks')}</Text>
          <Text style={[styles.rank, { color: P.text }]}>{rankLabel}</Text>
        </View>
        {rank ? (
          <ArenaRankStars
            filled={rank.starsInRank}
            size={18}
            accessibilityLabel={`${arenaText(lang, 'rankStars')}: ${rank.starsInRank}/${rank.starsPerRank}`}
          />
        ) : (
          <Text style={[styles.rp, { color: P.accent }]}>—</Text>
        )}
      </View>
      <View style={styles.grid}>
        {cells.map((cell) => (
          <View key={cell.label} style={[styles.cell, { backgroundColor: P.elev }]}>
            <Text style={[styles.value, { color: P.text }]}>{cell.value}</Text>
            <Text style={[styles.label, { color: P.muted }]}>{cell.label}</Text>
          </View>
        ))}
      </View>
    </V2Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankCopy: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  rank: { marginTop: 2, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  rp: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  cell: { width: '50%', minHeight: 62, borderRadius: 16, padding: 10, borderWidth: 4, borderColor: 'transparent' },
  value: { fontSize: 19, fontWeight: '900', fontVariant: ['tabular-nums'] },
  label: { marginTop: 2, fontSize: 11.5, fontWeight: '700' },
});
