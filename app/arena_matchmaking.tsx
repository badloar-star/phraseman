import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import { ARENA_QUICK_FALLBACK_MS, ARENA_RANKED_HEARTBEAT_MS, type ArenaQueueMode } from '../modules/arena/contract';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useVisibleWallClock } from '../hooks/use_visible_wall_clock';
import { arenaRankedElapsedMs, arenaRankedWaitPresentation } from '../modules/arena/matchmaking_state';
import {
  arenaV2FindMatch,
  arenaV2QueueCancel,
  arenaV2QuickBotFallback,
  createArenaRequestId,
  useArenaQueue,
} from './arena_client';

const quickFallbackRequests = new Set<string>();

export default function ArenaMatchmakingScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const params = useLocalSearchParams<{ mode?: string; requestId?: string; stableUid?: string }>();
  const mode: ArenaQueueMode = params.mode === 'ranked' ? 'ranked' : 'quick';
  const active = useRuntimeActive();
  const generatedRequestIdRef = useRef(createArenaRequestId('queue'));
  const requestId = typeof params.requestId === 'string' && params.requestId ? params.requestId : generatedRequestIdRef.current;
  const localStartedAtMsRef = useRef(Date.now());
  const now = useVisibleWallClock(active, 1_000);
  const [stableUid, setStableUid] = useState<string | null>(typeof params.stableUid === 'string' ? params.stableUid : null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [rankedPresentationRestartedAtMs, setRankedPresentationRestartedAtMs] = useState<number | undefined>();
  const queue = useArenaQueue(stableUid, active && !matchId);
  const title = useMemo(() => arenaText(lang, mode), [lang, mode]);
  const rankedElapsedMs = arenaRankedElapsedMs(
    now,
    localStartedAtMsRef.current,
    queue.value?.joinedAtMs,
    rankedPresentationRestartedAtMs,
  );
  const rankedPresentation = mode === 'ranked'
    ? arenaRankedWaitPresentation(rankedElapsedMs)
    : 'searching';

  useEffect(() => {
    localStartedAtMsRef.current = Date.now();
    setRankedPresentationRestartedAtMs(undefined);
    setSwitchingMode(false);
  }, [requestId]);

  useEffect(() => {
    if (!active || matchId) return;
    let cancelled = false;
    const reconcile = () => arenaV2FindMatch(mode, requestId).then((result) => {
      if (cancelled) return;
      setStableUid(result.stableUid);
      if (result.matchId) setMatchId(result.matchId);
    }).catch((reason) => { if (!cancelled) setError(String(reason)); });
    void reconcile();
    const fallback = mode === 'quick' && !quickFallbackRequests.has(requestId) ? setTimeout(() => {
      quickFallbackRequests.add(requestId);
      void arenaV2QuickBotFallback(requestId).then((result) => {
        if (!cancelled) setMatchId(result.matchId);
      }).catch((reason) => { if (!cancelled) setError(String(reason)); });
    }, ARENA_QUICK_FALLBACK_MS) : null;
    const heartbeat = mode === 'ranked' ? setInterval(() => { void reconcile(); }, ARENA_RANKED_HEARTBEAT_MS) : null;
    return () => {
      cancelled = true;
      if (fallback) clearTimeout(fallback);
      if (heartbeat) clearInterval(heartbeat);
    };
  }, [active, matchId, mode, requestId]);

  useEffect(() => {
    const next = queue.value?.status === 'matched' ? queue.value.matchId : null;
    if (next) setMatchId(next);
  }, [queue.value]);

  useEffect(() => {
    if (!matchId) return;
    quickFallbackRequests.delete(requestId);
    router.replace({ pathname: '/arena_match', params: { matchId } } as never);
  }, [matchId, requestId, router]);

  const cancel = () => {
    quickFallbackRequests.delete(requestId);
    void arenaV2QueueCancel(requestId).finally(() => router.replace('/arena' as never));
  };

  const switchToQuick = async () => {
    if (mode !== 'ranked' || switchingMode || matchId) return;
    setSwitchingMode(true);
    setError(null);
    try {
      await arenaV2QueueCancel(requestId);
      const nextRequestId = createArenaRequestId('queue');
      router.replace({ pathname: '/arena_matchmaking', params: { mode: 'quick', requestId: nextRequestId } } as never);
    } catch (reason) {
      setError(String(reason));
      setSwitchingMode(false);
    }
  };

  const continueRankedSearch = () => {
    setError(null);
    setRankedPresentationRestartedAtMs(now);
  };

  return (
    <ArenaScreen title={title} subtitle={arenaText(lang, 'searching')} variant="lobby" scroll={false} onBack={cancel}>
      <View style={styles.center}>
        <V2Card style={styles.card}>
          {rankedPresentation !== 'calm' ? <ActivityIndicator size="large" color={P.accent} /> : null}
          <Text accessibilityLiveRegion="polite" style={[styles.searching, { color: P.text }]}>
            {rankedPresentation === 'calm' ? arenaText(lang, 'rankedEmpty') : arenaText(lang, 'searching')}
          </Text>
          <Text style={[styles.hint, { color: P.muted }]}>
            {rankedPresentation === 'calm' ? arenaText(lang, 'rankedEmptyHint') : arenaText(lang, 'keepOpen')}
          </Text>
          {mode === 'ranked' && rankedPresentation === 'quick_offer' ? (
            <View style={styles.offer}>
              <Text style={[styles.offerTitle, { color: P.text }]}>{arenaText(lang, 'rankedQuickOffer')}</Text>
              <V2Cta disabled={switchingMode} onPress={() => void switchToQuick()}>{arenaText(lang, 'switchToQuick')}</V2Cta>
            </View>
          ) : null}
          {mode === 'ranked' && rankedPresentation === 'calm' ? (
            <View style={styles.offer}>
              <V2Cta disabled={switchingMode} onPress={continueRankedSearch}>{arenaText(lang, 'continueSearch')}</V2Cta>
              <V2Cta tone="ghost" disabled={switchingMode} onPress={() => void switchToQuick()}>{arenaText(lang, 'switchToQuick')}</V2Cta>
            </View>
          ) : null}
          {error ? <Text style={[styles.error, { color: P.danger }]}>{arenaText(lang, 'retry')}</Text> : null}
        </V2Card>
      </View>
      <V2Cta tone="ghost" onPress={cancel}>{arenaText(lang, 'cancel')}</V2Cta>
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  card: { minHeight: 230, justifyContent: 'center', alignItems: 'center', gap: 14 },
  searching: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  hint: { fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  error: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  offer: { width: '100%', gap: 10, marginTop: 4 },
  offerTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
});
