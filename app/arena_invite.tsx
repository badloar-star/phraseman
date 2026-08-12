import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import { arenaV2InviteAccept, arenaV2InviteDecline } from './arena_client';

export default function ArenaInviteScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const params = useLocalSearchParams<{ inviteId?: string }>();
  const [inviteId, setInviteId] = useState(typeof params.inviteId === 'string' ? params.inviteId : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const accept = () => {
    if (!inviteId.trim() || busy) return;
    setBusy(true);
    setError(false);
    void arenaV2InviteAccept(inviteId.trim())
      .then((result) => router.replace({ pathname: '/arena_match', params: { matchId: result.matchId, viewerSeat: result.viewerSeat } } as never))
      .catch(() => { setError(true); setBusy(false); });
  };
  const decline = () => {
    if (!inviteId.trim()) return router.replace('/arena' as never);
    void arenaV2InviteDecline(inviteId.trim()).finally(() => router.replace('/arena' as never));
  };
  return (
    <ArenaScreen title={arenaText(lang, 'join')} variant="tickets" onBack={() => router.replace('/arena' as never)}>
      <V2Card style={styles.card}>
        <Text style={[styles.label, { color: P.text }]}>{arenaText(lang, 'inviteTitle')}</Text>
        <TextInput
          accessibilityLabel={arenaText(lang, 'inviteTitle')}
          autoCapitalize="none"
          autoCorrect={false}
          value={inviteId}
          onChangeText={setInviteId}
          editable={!busy}
          style={[styles.input, { backgroundColor: P.elev, color: P.text }]}
        />
        <V2Cta disabled={!inviteId.trim() || busy} onPress={accept}>{arenaText(lang, 'join')}</V2Cta>
        <V2Cta tone="ghost" onPress={decline}>{arenaText(lang, 'decline')}</V2Cta>
        {error ? <Text style={[styles.error, { color: P.danger }]}>{arenaText(lang, 'retry')}</Text> : null}
      </V2Card>
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  label: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  input: { minHeight: 52, borderRadius: 16, paddingHorizontal: 14, fontSize: 16, fontWeight: '700' },
  error: { textAlign: 'center', fontWeight: '700' },
});
