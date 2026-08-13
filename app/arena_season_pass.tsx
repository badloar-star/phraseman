import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLang } from '../components/LangContext';
import { ArenaScreen, ArenaStat } from '../components/arena/ArenaScreen';
import { ArenaHubChrome } from '../components/arena/ArenaHubChrome';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { StarGlyph } from '../components/tournament/TournamentFx';
import { arenaText } from '../modules/arena/copy';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaV2Home, arenaV2SeasonClaim, type ArenaHomeResponse } from './arena_client';

function rewardLabel(lang: Parameters<typeof arenaText>[0], reward: { kind: 'shards' | 'spin_credit'; amount: number }): string {
  return arenaText(lang, reward.kind === 'spin_credit' ? 'rewardSpin' : 'rewardPearls')
    .replace('{amount}', String(reward.amount));
}

export default function ArenaSeasonPassScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const [home, setHome] = useState<ArenaHomeResponse | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [claimError, setClaimError] = useState(false);
  const load = useCallback(() => { void arenaV2Home().then(setHome).catch(() => {}); }, []);
  useEffect(() => { if (active) load(); }, [active, load]);
  const claim = (level: number, side: 'free' | 'plus') => {
    const key = `${level}:${side}`;
    if (busyKey) return;
    setClaimError(false);
    setBusyKey(key);
    void arenaV2SeasonClaim({ seasonId: home?.season.seasonId, level, side })
      .then(load)
      .catch(() => setClaimError(true))
      .finally(() => setBusyKey(null));
  };
  return (
    <ArenaHubChrome>
    <ArenaScreen title={arenaText(lang, 'season')} variant="season" scroll={false}>
      <FlatList
        data={home?.season.levels ?? []}
        keyExtractor={(level) => String(level.level)}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={styles.stats}><ArenaStat label={arenaText(lang, 'stars')} value={home?.season.stars ?? '—'} /><ArenaStat label={arenaText(lang, 'season')} value={home?.season.level ?? '—'} /></View>}
        ListEmptyComponent={<Text style={[styles.loading, { color: P.muted }]}>{arenaText(lang, 'loading')}</Text>}
        ListFooterComponent={claimError ? <Text style={[styles.loading, { color: P.danger }]}>{arenaText(lang, 'retry')}</Text> : null}
        renderItem={({ item: level }) => (
          <V2Card style={styles.card}>
            <View style={styles.head}>
              <Text style={[styles.level, { color: P.text }]}>#{level.level}</Text>
              <View style={styles.stars}><StarGlyph size={18} color={P.gold} /><Text style={[styles.need, { color: P.text }]}>{level.stars}</Text></View>
            </View>
            <View style={styles.actions}>
              <View style={styles.rewardColumn}>
                <Text style={[styles.rewardLabel, { color: P.muted }]}>{rewardLabel(lang, level.freeReward)}</Text>
                <V2Cta tone="ghost" disabled={!home?.availability.rewardsEnabled || level.freeClaimed || busyKey !== null || (home?.season.stars ?? 0) < level.stars} onPress={() => claim(level.level, 'free')}>{level.freeClaimed ? '✓' : arenaText(lang, 'free')}</V2Cta>
              </View>
              <View style={styles.rewardColumn}>
                <Text style={[styles.rewardLabel, { color: P.muted }]}>{rewardLabel(lang, level.plusReward)}</Text>
                <V2Cta tone="gold" disabled={!home?.availability.rewardsEnabled || level.plusClaimed || busyKey !== null || (home?.season.stars ?? 0) < level.stars} onPress={() => claim(level.level, 'plus')}>{level.plusClaimed ? '✓' : arenaText(lang, 'plus')}</V2Cta>
              </View>
            </View>
          </V2Card>
        )}
      />
    </ArenaScreen>
    </ArenaHubChrome>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10 },
  list: { gap: 12, paddingBottom: 24 },
  card: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center' },
  level: { flex: 1, fontSize: 20, fontWeight: '900' },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  need: { fontSize: 16, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10 },
  rewardColumn: { flex: 1, gap: 6 },
  rewardLabel: { minHeight: 20, textAlign: 'center', fontSize: 12, fontWeight: '800' },
  loading: { textAlign: 'center', fontWeight: '700' },
});
