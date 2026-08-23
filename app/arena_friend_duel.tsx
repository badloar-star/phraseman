import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AvatarView from '../components/AvatarView';
import HybridSheetShell from '../components/modal_fx/HybridSheetShell';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card, V2Cta } from '../components/ui/v2_ui';
import { useTournamentPalette } from '../components/ui/v2_theme';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useLang } from '../components/LangContext';
import { arenaText } from '../modules/arena/copy';
import {
  arenaV2DevFriendBotCreate,
  arenaV2InviteCancel,
  arenaV2InviteCreate,
  arenaV2InviteReady,
  arenaV2InviteStatus,
  createArenaRequestId,
} from './arena_client';
import { peekFriendsTabSwrWarm, startFriendsTabSwrPrime, type FriendsTabWarmSnapshot } from './friends_tab_swr_warm';
import { getCanonicalUserId } from './user_id_policy';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';

const ACTIVE_INVITE_KEY = 'arena_friend_invite_active_v2';
type SelectedFriend = { uid: string; name: string; avatar?: string; aura?: string };
type StoredInvite = { inviteId: string; requestId: string; selected: SelectedFriend; expiresAtMs: number };

const remainingLabel = (deadline: number, now: number) => {
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function ArenaFriendDuelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ friendStableUid?: string; friendName?: string; friendAvatar?: string; devBot?: string }>();
  const P = useTournamentPalette();
  const { lang } = useLang();
  const active = useRuntimeActive();
  const [friends, setFriends] = useState<FriendsTabWarmSnapshot | null>(() => peekFriendsTabSwrWarm());
  const [selected, setSelected] = useState<SelectedFriend | null>(() => typeof params.friendStableUid === 'string' ? {
    uid: params.friendStableUid,
    name: typeof params.friendName === 'string' ? params.friendName : 'Друг',
    avatar: typeof params.friendAvatar === 'string' ? params.friendAvatar : undefined,
  } : null);
  const [pickerOpen, setPickerOpen] = useState(() => typeof params.friendStableUid !== 'string');
  const [invite, setInvite] = useState<StoredInvite | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Вызов друга = 1 ⚡ у инициатора (владелец 2026-08-23: единая экономика,
  // платим за ПОПЫТКУ — списание в create() ниже, до сетевого вызова).
  const { isUnlimited: duelEnergyUnlimited, spendOne: spendDuelEnergy } = useEnergy();
  const [noEnergyOpen, setNoEnergyOpen] = useState(false);
  const requestIdRef = useRef(createArenaRequestId('friend_invite'));
  /**
   * На первом входе picker открыт нативным Modal поверх всего экрана. Он
   * перехватывает и системную кнопку, и тап по видимой стрелке попадает в backdrop.
   * Первое закрытие поэтому выходит в Арену; picker, открытый повторно для
   * смены уже выбранного друга, только закрывается.
   */
  const pickerCloseIntentRef = useRef<'stay' | 'leave'>(typeof params.friendStableUid === 'string' ? 'stay' : 'leave');
  const leaveFriendDuel = useCallback(() => router.replace('/arena' as never), [router]);
  const closeFriendPicker = useCallback(() => {
    setPickerOpen(false);
    if (pickerCloseIntentRef.current === 'leave') router.replace('/arena' as never);
  }, [router]);

  useEffect(() => {
    if (!active) return;
    const warm = peekFriendsTabSwrWarm();
    if (warm) setFriends(warm);
    void startFriendsTabSwrPrime().then(() => setFriends(peekFriendsTabSwrWarm())).catch(() => {});
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    void getCanonicalUserId().then(async (uid) => {
      if (!uid) return;
      const raw = await AsyncStorage.getItem(`${ACTIVE_INVITE_KEY}:${uid}`).catch(() => null);
      if (cancelled || !raw) return;
      try {
        const stored = JSON.parse(raw) as StoredInvite;
        if (stored.inviteId && stored.requestId && stored.selected?.uid) {
          requestIdRef.current = stored.requestId;
          setSelected(stored.selected);
          setInvite(stored);
          setPickerOpen(false);
        }
      } catch { /* corrupted DEV/session state is ignored */ }
    });
    return () => { cancelled = true; };
  }, []);

  const clearStored = useCallback(async () => {
    const uid = await getCanonicalUserId().catch(() => null);
    if (uid) await AsyncStorage.removeItem(`${ACTIVE_INVITE_KEY}:${uid}`).catch(() => {});
  }, []);

  const finishStatus = useCallback((status: Awaited<ReturnType<typeof arenaV2InviteStatus>>) => {
    if (status.status === 'matched' && status.matchId) {
      void clearStored();
      router.replace({ pathname: '/arena_match', params: { matchId: status.matchId, viewerSeat: status.viewerSeat } } as never);
      return true;
    }
    if (['declined', 'cancelled', 'expired'].includes(status.status)) {
      void clearStored();
      requestIdRef.current = createArenaRequestId('friend_invite');
      setInvite(null);
      setError(status.status === 'declined' ? 'Сегодня без драмы' : status.status === 'expired' ? 'Время вызова вышло' : 'Вызов отменён');
      return true;
    }
    return false;
  }, [clearStored, router]);

  useEffect(() => {
    if (!active || !invite) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const status = await arenaV2InviteReady(invite.inviteId);
        if (cancelled || finishStatus(status)) return;
      } catch { /* bounded focused poll retries */ }
      if (!cancelled) timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [active, finishStatus, invite]);

  useEffect(() => {
    if (!active || !invite) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => { setNow(Date.now()); timer = setTimeout(tick, 1000); };
    tick();
    return () => { if (timer) clearTimeout(timer); };
  }, [active, invite]);

  const create = async () => {
    if (!selected || busy) return;
    if (!duelEnergyUnlimited) {
      const ok = await spendDuelEnergy();
      if (!ok) { setNoEnergyOpen(true); return; }
    }
    setBusy(true); setError('');
    try {
      const result = await arenaV2InviteCreate(selected.uid, requestIdRef.current);
      const stored: StoredInvite = { inviteId: result.inviteId, requestId: requestIdRef.current, selected, expiresAtMs: result.expiresAtMs };
      setInvite(stored);
      const uid = await getCanonicalUserId().catch(() => null);
      if (uid) await AsyncStorage.setItem(`${ACTIVE_INVITE_KEY}:${uid}`, JSON.stringify(stored));
      const ready = await arenaV2InviteReady(result.inviteId);
      finishStatus(ready);
    } catch { setError(`${arenaText(lang, 'inviteFailed')}. ${arenaText(lang, 'inviteFailedHint')}`); }
    finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!invite || busy) return;
    setBusy(true);
    try {
      await arenaV2InviteCancel(invite.inviteId);
      await clearStored();
      requestIdRef.current = createArenaRequestId('friend_invite');
      setInvite(null);
      setError('Вызов отменён');
    }
    catch { setError('Не удалось отменить. Повторить?'); }
    finally { setBusy(false); }
  };

  const startDevBot = async () => {
    if (busy) return;
    setPickerOpen(false); setBusy(true); setError('DEV-бот принимает вызов…');
    try {
      const result = await arenaV2DevFriendBotCreate(createArenaRequestId('dev_friend_bot'));
      router.replace({ pathname: '/arena_match', params: { matchId: result.matchId, viewerSeat: result.viewerSeat } } as never);
    } catch { setError('DEV-бот недоступен: запусти Functions emulator'); }
    finally { setBusy(false); }
  };

  const devBotStartedRef = useRef(false);
  useEffect(() => {
    if (params.devBot !== '1' || devBotStartedRef.current) return;
    devBotStartedRef.current = true;
    void startDevBot();
    // startDevBot intentionally runs once for the deep-linked DEV scenario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.devBot]);

  return (
    <ArenaScreen title="Дуэль с другом" variant="tickets" onBack={leaveFriendDuel}>
      <V2Card style={styles.card}>
        {selected ? <View style={styles.selected}><AvatarView avatar={selected.avatar} auraId={selected.aura} size={64} animateAura={false} ownerActive={active} /><Text style={[styles.name, { color: P.text }]}>{selected.name}</Text></View> : null}
        {invite ? <><Text testID="arena-friend-invite-countdown" style={[styles.countdown, { color: P.accent }]}>{remainingLabel(invite.expiresAtMs, now)}</Text><V2Cta tone="ghost" disabled={busy} onPress={cancel}>Отменить вызов</V2Cta></> : <><V2Cta tone="ghost" disabled={busy} onPress={() => { pickerCloseIntentRef.current = 'stay'; setPickerOpen(true); }}>{selected ? 'Выбрать другого' : 'Выбрать друга'}</V2Cta>{selected ? <V2Cta accessibilityHint={arenaText(lang, 'friendHint')} disabled={busy} onPress={create}>Бросить вызов</V2Cta> : null}</>}
        {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: P.muted }]}>{error}</Text> : null}
      </V2Card>

      <HybridSheetShell visible={pickerOpen} onClose={closeFriendPicker} closeLabel="Закрыть" testID="arena-friend-picker">
        {({ requestDismiss }) => <View style={styles.picker}>
          <Text style={[styles.pickerTitle, { color: P.text }]}>Кому бросить вызов?</Text>
          <ScrollView style={styles.pickerScroll} contentContainerStyle={styles.pickerRows} showsVerticalScrollIndicator={false}>
          {(friends?.friends ?? []).map((friend) => {
            const profile = friends?.profiles[friend.uid];
            const name = profile?.name ?? friend.displayName ?? 'Друг';
            return <Pressable key={friend.uid} accessibilityRole="button" accessibilityLabel={name} onPress={() => { pickerCloseIntentRef.current = 'stay'; setSelected({ uid: friend.uid, name, avatar: profile?.avatar, aura: profile?.aura }); requestDismiss(); }} style={[styles.row, { backgroundColor: P.elev }]}><AvatarView avatar={profile?.avatar} auraId={profile?.aura} size={44} animateAura={false} ownerActive={active} /><Text style={[styles.rowName, { color: P.text }]}>{name}</Text></Pressable>;
          })}
          {__DEV__ ? <Pressable testID="arena-friend-dev-bot" accessibilityRole="button" accessibilityLabel="DEV-бот" onPress={() => { pickerCloseIntentRef.current = 'stay'; requestDismiss(); void startDevBot(); }} style={[styles.row, { backgroundColor: P.elev }]}><View style={[styles.botAvatar, { backgroundColor: P.accent }]}><Text style={{ color: P.okInk, fontWeight: '900' }}>BOT</Text></View><Text style={[styles.rowName, { color: P.text }]}>DEV-бот</Text></Pressable> : null}
          </ScrollView>
        </View>}
      </HybridSheetShell>
      <NoEnergyModal visible={noEnergyOpen} onClose={() => setNoEnergyOpen(false)} />
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  selected: { alignItems: 'center', gap: 10 },
  name: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  countdown: { fontSize: 34, fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] },
  error: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  picker: { gap: 10, paddingBottom: 4 },
  pickerScroll: { maxHeight: 480 },
  pickerRows: { gap: 10, paddingBottom: 4 },
  pickerTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  row: { minHeight: 60, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowName: { flex: 1, fontSize: 16, fontWeight: '800' },
  botAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
