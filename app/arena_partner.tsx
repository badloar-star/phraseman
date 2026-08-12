import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLang } from '../components/LangContext';
import { ArenaProgress, ArenaStateCard } from '../components/arena/ArenaExpansionUI';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaText } from '../modules/arena/copy';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import type { ArenaPartnerSummary } from '../modules/arena/expansion_contract';
import { peekFriendsTabSwrWarm, startFriendsTabSwrPrime, type FriendsTabWarmSnapshot } from './friends_tab_swr_warm';
import { arenaExpansionHome, arenaPartnerAccept, arenaPartnerClaimSpotlight, arenaPartnerInvite, arenaPartnerNudge, arenaPartnerPause, arenaPartnerPreferences, arenaPartnerRemove, createArenaRequestId } from './arena_client';
import { arenaFeatureOpenEvent } from '../modules/arena/telemetry';
import { trackArenaTelemetry } from './arena_telemetry';

export default function ArenaPartnerScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'unavailable' | 'error'>('loading');
  const [partners, setPartners] = useState<readonly ArenaPartnerSummary[]>([]);
  const [friends, setFriends] = useState<FriendsTabWarmSnapshot | null>(() => peekFriendsTabSwrWarm());
  const [selectedFriend, setSelectedFriend] = useState('');
  const [busy, setBusy] = useState(false);
  const [nudgesEnabled, setNudgesEnabled] = useState(false);
  const ids = useRef(new Map<string, string>());
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent('partner', 'hub')); }, []);
  const load = useCallback(() => {
    setState('loading');
    void arenaExpansionHome().then((home) => {
      if (!home.availability.partner) { setState('unavailable'); return; }
      setPartners(home.partners);
      setNudgesEnabled(home.partnerPreferences.nudgesEnabled);
      setState(home.partners.length ? 'ready' : 'empty');
    }).catch(() => setState('error'));
    void startFriendsTabSwrPrime().then(() => setFriends(peekFriendsTabSwrWarm())).catch(() => {});
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);

  const run = (key: string, action: (requestId: string) => Promise<Readonly<{ ok: true; partner: ArenaPartnerSummary }>>) => {
    const requestId = ids.current.get(key) ?? createArenaRequestId('partner');
    ids.current.set(key, requestId);
    setBusy(true);
    void action(requestId).then((response) => {
      ids.current.delete(key);
      setPartners((current) => {
        const without = current.filter((item) => item.partnershipId !== response.partner.partnershipId);
        const next = response.partner.state === 'removed' ? without : [...without, response.partner].slice(0, 5);
        setState(next.length ? 'ready' : 'empty');
        return next;
      });
    }).catch(() => setState('error')).finally(() => setBusy(false));
  };

  const updateNudgePreferences = () => {
    const next = !nudgesEnabled;
    const key = `preferences:${next}`;
    const requestId = ids.current.get(key) ?? createArenaRequestId('partner_preferences');
    ids.current.set(key, requestId);
    setBusy(true);
    void arenaPartnerPreferences(next, next ? { startHour: 22, endHour: 8 } : null, requestId)
      .then((response) => {
        ids.current.delete(key);
        setNudgesEnabled(response.enabled);
        load();
      })
      .catch(() => setState('error'))
      .finally(() => setBusy(false));
  };

  return (
    <ArenaScreen title={arenaExpansionText(lang, 'partner')} subtitle={arenaExpansionText(lang, 'partnerBody')}>
      {state === 'loading' || state === 'unavailable' || state === 'error' ? <ArenaStateCard state={state} title={arenaExpansionText(lang, state === 'error' ? 'unavailable' : state)} actionLabel={state === 'error' ? arenaExpansionText(lang, 'retry') : undefined} onAction={state === 'error' ? load : undefined} /> : null}
      {state === 'empty' || state === 'ready' ? <V2Card style={styles.card}>
        <Text style={[styles.title, { color: P.text }]}>{arenaExpansionText(lang, 'nudgePreferences')}</Text>
        <Text style={[styles.body, { color: P.muted }]}>{arenaExpansionText(lang, 'nudgeQuietHours')}</Text>
        <V2Cta tone="ghost" disabled={busy} onPress={updateNudgePreferences}>{arenaExpansionText(lang, nudgesEnabled ? 'nudgeDisable' : 'nudgeEnable')}</V2Cta>
      </V2Card> : null}
      {partners.length < 5 && (state === 'empty' || state === 'ready') ? <V2Card style={styles.card}>
        <Text style={[styles.title, { color: P.text }]}>{arenaExpansionText(lang, 'partnerInvite')}</Text>
        <View style={styles.friends}>{(friends?.friends ?? []).map((friend) => { const profile = friends?.profiles[friend.uid]; const selected = selectedFriend === friend.uid; return <Pressable key={friend.uid} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSelectedFriend(friend.uid)} style={[styles.friend, { backgroundColor: selected ? P.accent : P.elev2 }]}><Text style={[styles.friendText, { color: selected ? P.okInk : P.text }]}>{profile?.name ?? friend.displayName ?? arenaText(lang, 'friend')}</Text></Pressable>; })}</View>
        {(friends?.friends ?? []).length === 0 ? <Text style={[styles.body, { color: P.muted }]}>{arenaText(lang, 'noFriends')}</Text> : null}
        <V2Cta disabled={!selectedFriend || busy} onPress={() => run(`invite:${selectedFriend}`, (requestId) => arenaPartnerInvite(selectedFriend, requestId))}>{arenaExpansionText(lang, 'partnerInvite')}</V2Cta>
      </V2Card> : null}
      {partners.map((partner) => <V2Card key={partner.partnershipId} style={styles.card}>
        <Text style={[styles.title, { color: P.text }]}>{partner.partnerName}</Text>
        <ArenaProgress value={partner.sharedDays} max={partner.targetSharedDays} label={arenaExpansionText(lang, 'sharedDays')} />
        <Text style={[styles.body, { color: P.muted }]}>{arenaExpansionText(lang, 'sharedDays')}: {partner.sharedDays}</Text>
        {partner.state === 'invited' && partner.direction === 'incoming' ? <V2Cta disabled={busy} onPress={() => run(`accept:${partner.partnershipId}`, (requestId) => arenaPartnerAccept(partner.partnershipId, requestId))}>{arenaText(lang, 'accept')}</V2Cta> : null}
        {partner.state === 'invited' && partner.direction === 'outgoing' ? <Text style={[styles.body, { color: P.muted }]}>{arenaText(lang, 'waiting')}</Text> : null}
        {partner.state === 'active' ? <V2Cta disabled={busy} onPress={() => run(`claim:${partner.partnershipId}`, (requestId) => arenaPartnerClaimSpotlight(partner.partnershipId, requestId))}>{arenaExpansionText(lang, partner.spotlightAvailable ? 'claim' : 'checkProgress')}</V2Cta> : null}
        {partner.state === 'active' && partner.nudgeEnabled ? <V2Cta tone="ghost" disabled={busy} onPress={() => run(`nudge:${partner.partnershipId}`, (requestId) => arenaPartnerNudge(partner.partnershipId, requestId))}>{arenaExpansionText(lang, 'nudge')}</V2Cta> : null}
        {partner.state === 'active' || partner.pausedByViewer ? <V2Cta tone="ghost" disabled={busy} onPress={() => run(`pause:${partner.partnershipId}:${!partner.pausedByViewer}`, (requestId) => arenaPartnerPause(partner.partnershipId, !partner.pausedByViewer, requestId))}>{arenaExpansionText(lang, partner.pausedByViewer ? 'partnerResume' : 'partnerPause')}</V2Cta> : null}
        <V2Cta tone="ghost" disabled={busy} onPress={() => run(`remove:${partner.partnershipId}`, (requestId) => arenaPartnerRemove(partner.partnershipId, requestId))}>{arenaExpansionText(lang, 'remove')}</V2Cta>
      </V2Card>)}
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '900' },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  friends: { gap: 8 },
  friend: { minHeight: 48, borderRadius: 15, paddingHorizontal: 13, justifyContent: 'center' },
  friendText: { fontSize: 15, fontWeight: '800' },
});
