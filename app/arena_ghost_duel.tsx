import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaDisclosureBadge, ArenaStateNotice } from '../components/arena/ArenaExpansionUI';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaText } from '../modules/arena/copy';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import type { ArenaGhostCreateResponse, ArenaGhostResponse, ArenaGhostSourceKind, ArenaGhostSummary } from '../modules/arena/expansion_contract';
import { arenaExpansionHome, arenaGhostAccept, arenaGhostCreate, arenaGhostDecline, arenaGhostStatus, createArenaRequestId } from './arena_client';
import { peekFriendsTabSwrWarm, startFriendsTabSwrPrime, type FriendsTabWarmSnapshot } from './friends_tab_swr_warm';
import { arenaFeatureOpenEvent } from '../modules/arena/telemetry';
import { trackArenaTelemetry } from './arena_telemetry';

export default function ArenaGhostDuelScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const params = useLocalSearchParams<{ inviteToken?: string; sourceRunId?: string; sourceKind?: string; friendStableUid?: string }>();
  const [token, setToken] = useState(typeof params.inviteToken === 'string' ? params.inviteToken : '');
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'expired' | 'error'>('loading');
  const [selected, setSelected] = useState<ArenaGhostResponse | null>(null);
  const [ghosts, setGhosts] = useState<readonly ArenaGhostSummary[]>([]);
  const [friends, setFriends] = useState<FriendsTabWarmSnapshot | null>(() => peekFriendsTabSwrWarm());
  const [friendStableUid, setFriendStableUid] = useState(params.friendStableUid ?? '');
  const [created, setCreated] = useState<ArenaGhostCreateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const createId = useRef<string | null>(null);
  const acceptId = useRef<string | null>(null);
  const sourceKind: ArenaGhostSourceKind = params.sourceKind === 'arena_today' ? 'arena_today' : 'arena_match';
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent('ghost', params.inviteToken ? 'deep_link' : params.sourceRunId ? 'result' : 'direct')); }, [params.inviteToken, params.sourceRunId]);

  const load = useCallback(() => {
    setState('loading');
    void Promise.all([arenaExpansionHome(), arenaGhostStatus(token || undefined)]).then(([home, response]) => {
      if (!home.availability.ghost) { setState('unavailable'); return; }
      setSelected(response.selected ?? null);
      setGhosts(response.ghosts);
      setState(response.selected?.status === 'expired' ? 'expired' : 'ready');
    }).catch(() => setState('error'));
    void startFriendsTabSwrPrime().then(() => setFriends(peekFriendsTabSwrWarm())).catch(() => {});
  }, [token]);
  useEffect(() => { if (active) load(); }, [active, load]);

  const create = () => {
    if (!friendStableUid || !params.sourceRunId || busy) return;
    const requestId = createId.current ?? createArenaRequestId('ghost_create');
    createId.current = requestId;
    setBusy(true);
    void arenaGhostCreate(friendStableUid, params.sourceRunId, sourceKind, requestId).then((response) => {
      setCreated(response);
      setToken(response.inviteToken);
      createId.current = null;
    }).catch(() => setState('error')).finally(() => setBusy(false));
  };
  const accept = () => {
    if (!token || busy) return;
    const requestId = acceptId.current ?? createArenaRequestId('ghost_accept');
    acceptId.current = requestId;
    setBusy(true);
    void arenaGhostAccept(token, requestId).then((response) => {
      acceptId.current = null;
      setSelected(response);
      if (response.matchId) router.replace({ pathname: '/arena_today', params: { runId: response.matchId, runKind: 'ghost' } } as never);
    }).catch(() => setState('error')).finally(() => setBusy(false));
  };

  return (
    <ArenaScreen title={arenaExpansionText(lang, 'ghost')} subtitle={arenaExpansionText(lang, 'recordingBadge')}>
      <ArenaDisclosureBadge text={arenaExpansionText(lang, 'ghostDisclosure')} />
      <ArenaDisclosureBadge text={arenaExpansionText(lang, 'noEconomy')} />
      {state === 'loading' ? <ArenaStateNotice state="loading" /> : null}
      {state === 'unavailable' || state === 'expired' || state === 'error' ? <ArenaStateNotice state={state} ghost onRetry={load} onBack={() => router.replace('/arena' as never)} /> : null}
      {state === 'ready' ? (
        <>
          {params.sourceRunId && !created ? <V2Card style={styles.card}><Text style={[styles.title, { color: P.text }]}>{arenaExpansionText(lang, 'ghostCreate')}</Text><View style={styles.friends}>{(friends?.friends ?? []).map((friend) => { const profile = friends?.profiles[friend.uid]; const activeFriend = friendStableUid === friend.uid; return <Pressable key={friend.uid} accessibilityRole="button" accessibilityState={{ selected: activeFriend }} onPress={() => setFriendStableUid(friend.uid)} style={[styles.friend, { backgroundColor: activeFriend ? P.accent : P.elev2 }]}><Text style={[styles.friendText, { color: activeFriend ? P.okInk : P.text }]}>{profile?.name ?? friend.displayName}</Text></Pressable>; })}</View><V2Cta disabled={!friendStableUid || busy} onPress={create}>{arenaExpansionText(lang, 'ghostCreate')}</V2Cta></V2Card> : !params.sourceRunId && !token ? <ArenaStateNotice state="empty" emptyHint="emptyGhost" /> : null}
          {created ? <V2Card style={styles.card}><Text selectable style={[styles.code, { color: P.text, backgroundColor: P.elev2 }]}>{created.inviteToken}</Text><V2Cta onPress={() => void Share.share({ message: created.shareUrl })}>{arenaExpansionText(lang, 'share')}</V2Cta></V2Card> : null}
          {!created ? <V2Card style={styles.card}>
            <Text style={[styles.title, { color: P.text }]}>{arenaExpansionText(lang, 'inviteCode')}</Text>
            <TextInput accessibilityLabel={arenaExpansionText(lang, 'inviteCode')} value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} style={[styles.input, { color: P.text, backgroundColor: P.elev2 }]} />
            <V2Cta disabled={!token || busy || selected?.status === 'expired'} onPress={accept}>{arenaExpansionText(lang, 'ghostAccept')}</V2Cta>
          </V2Card> : null}
          {ghosts.map((ghost) => <V2Card key={ghost.ghostId} style={styles.card}><Text style={[styles.title, { color: P.text }]}>{ghost.ownerName}</Text><Text style={[styles.status, { color: ghost.state === 'expired' ? P.danger : P.muted }]}>{ghost.result ? arenaExpansionText(lang, 'score').replace('{you}', String(ghost.direction === 'incoming' ? ghost.result.guestScore : ghost.result.hostScore)).replace('{them}', String(ghost.direction === 'incoming' ? ghost.result.hostScore : ghost.result.guestScore)) : arenaExpansionText(lang, ghost.state === 'expired' ? 'expired' : ghost.state === 'unavailable' ? 'unavailable' : 'recordingBadge')}</Text>{ghost.direction === 'incoming' && ghost.inviteToken && !ghost.result ? <><V2Cta disabled={busy} onPress={() => { setToken(ghost.inviteToken ?? ''); }}>{arenaExpansionText(lang, 'ghostAccept')}</V2Cta><V2Cta tone="ghost" disabled={busy} onPress={() => void arenaGhostDecline(ghost.inviteToken as string).then(load).catch(() => setState('error'))}>{arenaText(lang, 'decline')}</V2Cta></> : null}{ghost.direction === 'outgoing' && ghost.shareUrl && !ghost.result ? <V2Cta tone="ghost" onPress={() => void Share.share({ message: ghost.shareUrl as string })}>{arenaExpansionText(lang, 'share')}</V2Cta> : null}</V2Card>)}
        </>
      ) : null}
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  input: { minHeight: 48, borderRadius: 15, paddingHorizontal: 13, fontSize: 16, fontWeight: '700' },
  code: { minHeight: 48, borderRadius: 15, padding: 12, fontSize: 13, fontWeight: '700' },
  friends: { gap: 8 },
  friend: { minHeight: 48, borderRadius: 15, paddingHorizontal: 13, justifyContent: 'center' },
  friendText: { fontSize: 15, fontWeight: '800' },
  status: { fontSize: 13, fontWeight: '800' },
});
