import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLang } from '../components/LangContext';
import { ArenaProgress, ArenaStateCard } from '../components/arena/ArenaExpansionUI';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import { masteryLevel, type ArenaMasteryMetric } from '../modules/arena/expansion_contract';
import { arenaModeCopyKey } from '../modules/arena/expansion_model';
import { ARENA_TASK_MODES } from '../modules/arena/contract';
import { arenaExpansionHome } from './arena_client';
import { arenaFeatureOpenEvent } from '../modules/arena/telemetry';
import { trackArenaTelemetry } from './arena_telemetry';

export default function ArenaMasteryMapScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [items, setItems] = useState<readonly ArenaMasteryMetric[]>([]);
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent('mastery', 'hub')); }, []);
  const load = useCallback(() => {
    setState('loading');
    void arenaExpansionHome().then((home) => {
      if (!home.availability.mastery) { setState('unavailable'); return; }
      setItems(ARENA_TASK_MODES.map((mode) => home.mastery.find((item) => item.mode === mode) ?? { mode, score: null, sampleCount: 0, accuracy: 0, confidence: 'insufficient' as const }));
      setState('ready');
    }).catch(() => setState('error'));
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);

  return (
    <ArenaScreen title={arenaExpansionText(lang, 'mastery')} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.mode}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.center}><ArenaStateCard state={state} title={arenaExpansionText(lang, state === 'error' ? 'unavailable' : state)} actionLabel={state === 'error' ? arenaExpansionText(lang, 'retry') : undefined} onAction={state === 'error' ? load : undefined} /></View>}
        renderItem={({ item }) => {
          const level = masteryLevel(item);
          return <V2Card style={styles.card}>
            <View style={styles.row}><View style={styles.copy}><Text style={[styles.title, { color: P.text }]}>{arenaExpansionText(lang, arenaModeCopyKey(item.mode))}</Text><Text style={[styles.level, { color: item.score === null ? P.muted : P.gold }]}>{arenaExpansionText(lang, level)}</Text></View><Text style={[styles.score, { color: item.score === null ? P.muted : P.text }]}>{item.score === null ? '—' : item.score}</Text></View>
            <ArenaProgress value={item.score ?? 0} max={100} label={arenaExpansionText(lang, arenaModeCopyKey(item.mode))} />
            <Text style={[styles.meta, { color: P.muted }]}>{item.sampleCount} · {Math.round(item.accuracy)}%</Text>
          </V2Card>;
        }}
      />
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, gap: 12, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center' },
  card: { gap: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  level: { marginTop: 2, fontSize: 13, fontWeight: '800' },
  score: { fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] },
  meta: { fontSize: 12, fontWeight: '800' },
});
