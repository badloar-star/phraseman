import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import AvatarView from '../components/AvatarView';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import { arenaV2InviteCreate, createArenaRequestId, rememberArenaViewerSeat, useArenaProfile } from './arena_client';
import { peekFriendsTabSwrWarm, startFriendsTabSwrPrime, type FriendsTabWarmSnapshot } from './friends_tab_swr_warm';
import { useRuntimeActive } from '../hooks/use_runtime_active';

export default function ArenaFriendDuelScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const [friends, setFriends] = useState<FriendsTabWarmSnapshot | null>(() => peekFriendsTabSwrWarm());
  const [friendId, setFriendId] = useState('');
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [stableUid, setStableUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(createArenaRequestId('invite')).current;
  const profile = useArenaProfile(stableUid, active && Boolean(inviteId));

  useEffect(() => {
    if (!active) return;
    const warm = peekFriendsTabSwrWarm();
    if (warm) setFriends(warm);
    void startFriendsTabSwrPrime().then(() => setFriends(peekFriendsTabSwrWarm())).catch(() => {});
  }, [active]);

  useEffect(() => {
    const matchId = profile.value?.activeMatchId;
    if (!matchId) return;
    rememberArenaViewerSeat(matchId, 'a');
    router.replace({ pathname: '/arena_match', params: { matchId, viewerSeat: 'a' } } as never);
  }, [profile.value?.activeMatchId, router]);

  const create = () => {
    if (!friendId.trim() || busy) return;
    setBusy(true);
    setError(false);
    void arenaV2InviteCreate(friendId.trim(), requestId)
      .then((result) => { setStableUid(result.stableUid); setInviteId(result.inviteId); })
      .catch(() => setError(true))
      .finally(() => setBusy(false));
  };
  const share = () => {
    if (!inviteId) return;
    const url = `phraseman://arena/invite/${encodeURIComponent(inviteId)}`;
    void Share.share({ message: url }).catch(() => {});
  };

  return (
    <ArenaScreen title={arenaText(lang, 'inviteTitle')} variant="tickets">
      <Text style={[styles.friendHint, { color: P.muted }]}>{arenaText(lang, 'friendHint')}</Text>
      <V2Card style={styles.card}>
        <Text style={[styles.label, { color: P.text }]}>{arenaText(lang, 'selectFriend')}</Text>
        <View style={styles.friendList}>
          {(friends?.friends ?? []).map((friend) => {
            const profile = friends?.profiles[friend.uid];
            const selected = friendId === friend.uid;
            return (
              <Pressable
                key={friend.uid}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={profile?.name ?? friend.displayName ?? arenaText(lang, 'friend')}
                onPress={() => setFriendId(friend.uid)}
                style={[styles.friendRow, { backgroundColor: selected ? P.accent : P.elev }]}
              >
                <AvatarView avatar={profile?.avatar} auraId={profile?.aura} size={44} animateAura={false} ownerActive={active} />
                <Text numberOfLines={1} style={[styles.friendName, { color: selected ? P.okInk : P.text }]}>{profile?.name ?? friend.displayName ?? arenaText(lang, 'friend')}</Text>
              </Pressable>
            );
          })}
          {(friends?.friends ?? []).length === 0 ? <Text style={[styles.empty, { color: P.muted }]}>{arenaText(lang, 'noFriends')}</Text> : null}
        </View>
        <Text style={[styles.fallback, { color: P.muted }]}>{arenaText(lang, 'friendId')}</Text>
        <TextInput
          accessibilityLabel={arenaText(lang, 'friendId')}
          autoCapitalize="none"
          autoCorrect={false}
          value={friendId}
          onChangeText={setFriendId}
          editable={!busy && !inviteId}
          style={[styles.input, { backgroundColor: P.elev, color: P.text }]}
        />
        {!inviteId ? <V2Cta disabled={!friendId.trim() || busy} onPress={create}>{arenaText(lang, 'createInvite')}</V2Cta> : (
          <>
            <Text accessibilityLiveRegion="polite" style={[styles.ready, { color: P.text }]}>{arenaText(lang, 'inviteReady')}</Text>
            <Text style={[styles.fallback, { color: P.muted }]}>{arenaText(lang, 'inviteTtl')}</Text>
            <Text selectable style={[styles.code, { color: P.accent }]}>{inviteId}</Text>
            <V2Cta onPress={share}>{arenaText(lang, 'share')}</V2Cta>
          </>
        )}
        {error ? <Text style={[styles.error, { color: P.danger }]}>{arenaText(lang, 'retry')}</Text> : null}
      </V2Card>
      <V2Cta tone="ghost" onPress={() => router.push('/arena_invite' as never)}>{arenaText(lang, 'join')}</V2Cta>
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  label: { fontSize: 16, fontWeight: '800' },
  friendHint: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  friendList: { gap: 8 },
  friendRow: { minHeight: 56, borderRadius: 17, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  friendName: { flex: 1, fontSize: 15, fontWeight: '800' },
  empty: { minHeight: 44, textAlignVertical: 'center', textAlign: 'center', fontSize: 14, fontWeight: '600' },
  fallback: { fontSize: 12, fontWeight: '700' },
  input: { minHeight: 52, borderRadius: 16, paddingHorizontal: 14, fontSize: 16, fontWeight: '700' },
  ready: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  code: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  error: { textAlign: 'center', fontWeight: '700' },
});
