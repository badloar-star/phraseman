import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import { ARENA_RANKS } from '../modules/arena/ranks';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaV2Home } from './arena_client';

const ROMAN = ['', 'I', 'II', 'III'] as const;
const TIER_KEYS = ['tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum', 'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend'] as const;

export default function ArenaRanksScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const [current, setCurrent] = useState<number | null>(null);
  useEffect(() => { if (active) void arenaV2Home().then((home) => setCurrent(home.profile.rank)).catch(() => {}); }, [active]);
  return (
    <ArenaScreen title={arenaText(lang, 'ranks')} variant="table">
      {ARENA_RANKS.map((rank) => {
        const selected = rank.index === current;
        return (
          <V2Card key={rank.index} pad={14} style={[styles.row, selected ? { backgroundColor: P.accent } : null]}>
            <View style={[styles.badge, { backgroundColor: selected ? P.okInk : P.elev2 }]}>
              <Text style={[styles.badgeText, { color: selected ? P.accent : P.text }]}>{rank.index + 1}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={[styles.name, { color: selected ? P.okInk : P.text }]}>{arenaText(lang, TIER_KEYS[rank.tierIndex])} · {ROMAN[rank.division]}</Text>
              <Text style={[styles.meta, { color: selected ? P.okInk : P.muted }]}>{rank.minRating}+</Text>
            </View>
          </V2Card>
        );
      })}
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 16, fontWeight: '900' },
  copy: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800' },
  meta: { marginTop: 2, fontSize: 13, fontWeight: '700' },
});
