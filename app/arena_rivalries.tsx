import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaProgress, ArenaStateCard, ArenaStateNotice } from '../components/arena/ArenaExpansionUI';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaHubChrome } from '../components/arena/ArenaHubChrome';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaText } from '../modules/arena/copy';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import type { ArenaRivalrySummary } from '../modules/arena/expansion_contract';
import { arenaExpansionHome, arenaRivalAccept, arenaRivalLeave, arenaRivalMute, arenaRivalNext, arenaRivalPropose, createArenaRequestId } from './arena_client';
import { arenaFeatureOpenEvent } from '../modules/arena/telemetry';
import { trackArenaTelemetry } from './arena_telemetry';

export default function ArenaRivalriesScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const params = useLocalSearchParams<{ sourceMatchId?: string }>();
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'unavailable' | 'error'>('loading');
  const [items, setItems] = useState<readonly ArenaRivalrySummary[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const requestIds = useRef(new Map<string, string>());
  /**
   * Отказ ДЕЙСТВИЯ отдельно от отказа загрузки: сорвавшийся вызов или выход из
   * серии писали `state = 'error'`, и экран показывал «не удалось загрузить» —
   * то есть предлагал перезагрузку вместо повтора действия.
   */
  const [actionFailed, setActionFailed] = useState(false);
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent('rivalry', params.sourceMatchId ? 'result' : 'direct')); }, [params.sourceMatchId]);
  const load = useCallback(() => {
    setState('loading');
    setActionFailed(false);
    void arenaExpansionHome().then((home) => {
      if (!home.availability.rival) { setState('unavailable'); return; }
      setItems(home.rivalries);
      setState(home.rivalries.length ? 'ready' : 'empty');
    }).catch(() => setState('error'));
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);

  const run = (key: string, action: (requestId: string) => Promise<Readonly<{ ok?: true; activeMatchId?: string; viewerSeat?: 'a' | 'b' }>>) => {
    const requestId = requestIds.current.get(key) ?? createArenaRequestId('rival');
    requestIds.current.set(key, requestId);
    setBusyId(key);
    setActionFailed(false);
    void action(requestId).then((response) => {
      requestIds.current.delete(key);
      if (response.activeMatchId) router.push({ pathname: '/arena_match', params: { matchId: response.activeMatchId, viewerSeat: response.viewerSeat } } as never);
      else load();
    }).catch(() => setActionFailed(true)).finally(() => setBusyId(null));
  };
  const propose = () => params.sourceMatchId && run(`propose:${params.sourceMatchId}`, (requestId) => arenaRivalPropose(params.sourceMatchId as string, requestId));

  return (
    <ArenaHubChrome>
    <ArenaScreen title={arenaExpansionText(lang, 'rivalry')} subtitle={arenaExpansionText(lang, 'rivalryBody')} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.rivalryId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={styles.header}>{state === 'error' ? <ArenaStateNotice state="error" onRetry={load} /> : null}{actionFailed ? <ArenaStateCard state="error" title={arenaExpansionText(lang, 'actionFailed')} body={arenaExpansionText(lang, 'actionFailedHint')} /> : null}{params.sourceMatchId ? <V2Cta disabled={['loading', 'unavailable', 'error'].includes(state) || Boolean(busyId)} onPress={propose}>{arenaExpansionText(lang, 'rivalryPropose')}</V2Cta> : null}</View>}
        ListEmptyComponent={<View style={styles.center}><ArenaStateNotice state={state === 'ready' ? 'empty' : state} emptyHint="emptyRivalry" onRetry={load} onBack={() => router.replace('/arena' as never)} /></View>}
        renderItem={({ item }) => {
          const score = arenaExpansionText(lang, 'score').replace('{you}', String(item.viewerWins)).replace('{them}', String(item.opponentWins));
          return <V2Card style={styles.card}>
            <Text style={[styles.name, { color: P.text }]}>{item.opponentName}</Text>
            <Text style={[styles.score, { color: P.gold }]}>{score}</Text>
            <ArenaProgress value={item.gamesPlayed} max={3} label={arenaExpansionText(lang, 'rivalryBody')} />
            {item.nextMatchId ? <V2Cta onPress={() => router.push({ pathname: '/arena_match', params: { matchId: item.nextMatchId } } as never)}>{arenaExpansionText(lang, 'continueAction')}</V2Cta> : null}
            {item.state === 'invited' ? <V2Cta disabled={Boolean(busyId)} onPress={() => run(`accept:${item.rivalryId}`, (requestId) => arenaRivalAccept(item.rivalryId, requestId))}>{arenaText(lang, 'accept')}</V2Cta> : null}
            {item.state === 'active' && item.gamesPlayed < 3 ? <V2Cta disabled={Boolean(busyId)} onPress={() => run(`next:${item.rivalryId}`, (requestId) => arenaRivalNext(item.rivalryId, requestId))}>{arenaExpansionText(lang, 'rivalryContinue')}</V2Cta> : null}
            {item.leaveAllowed ? <V2Cta tone="ghost" disabled={Boolean(busyId)} onPress={() => Alert.alert(arenaExpansionText(lang, 'rivalryLeave'), arenaExpansionText(lang, 'rivalryBody'), [{ text: arenaText(lang, 'stay'), style: 'cancel' }, { text: arenaExpansionText(lang, 'rivalryLeave'), style: 'destructive', onPress: () => run(`leave:${item.rivalryId}`, (requestId) => arenaRivalLeave(item.rivalryId, requestId)) }])}>{arenaExpansionText(lang, 'rivalryLeave')}</V2Cta> : null}
            <V2Cta tone="ghost" disabled={Boolean(busyId)} onPress={() => run(`mute:${item.rivalryId}:${!item.muted}`, (requestId) => arenaRivalMute(item.rivalryId, !item.muted, requestId))}>{arenaExpansionText(lang, item.muted ? 'rivalryUnmute' : 'rivalryMute')}</V2Cta>
          </V2Card>;
        }}
      />
    </ArenaScreen>
    </ArenaHubChrome>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, gap: 12, paddingBottom: 24 },
  header: { gap: 12 },
  center: { flex: 1, justifyContent: 'center' },
  card: { gap: 12 },
  name: { fontSize: 20, fontWeight: '900' },
  score: { fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
