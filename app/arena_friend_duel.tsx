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
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import EnergyCostBadge from '../components/EnergyCostBadge';

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
    name: typeof params.friendName === 'string' ? params.friendName : arenaText(lang, 'friendFallbackName'),
    avatar: typeof params.friendAvatar === 'string' ? params.friendAvatar : undefined,
  } : null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [invite, setInvite] = useState<StoredInvite | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Вызов друга = 1 ⚡ у инициатора (владелец 2026-08-23: единая экономика,
  // платим за ПОПЫТКУ — списание в create() ниже, до сетевого вызова).
  const {
    confirmSpendOne: confirmDuelEnergy,
    refundOne: refundDuelEnergy,
    acknowledgeSessionStart,
  } = useEnergy();
  const [noEnergyOpen, setNoEnergyOpen] = useState(false);
  const requestIdRef = useRef(createArenaRequestId('friend_invite'));
  const [duelEnergyRevision, setDuelEnergyRevision] = useState(0);
  const duelEnergyIntent = useEnergySessionIntent(
    'arena_friend_duel',
    selected?.uid ?? 'friend',
    `${requestIdRef.current}:${duelEnergyRevision}`,
  );
  // зачем (владелец 2026-08-26, «экран вообще поломан»): раньше picker
  // открывался нативным Modal СРАЗУ при входе без выбранного друга. Пока он
  // висел, стрелка «назад» и вся карточка оставались ПОД ним и тапы туда не
  // доходили — экран выглядел мёртвым, и выйти было нельзя. Теперь вход всегда
  // показывает обычный экран, а шторка открывается только по тапу «Выбрать
  // друга», поэтому закрытие шторки больше никогда не уводит с экрана.
  const leaveFriendDuel = useCallback(() => router.replace('/arena' as never), [router]);
  const closeFriendPicker = useCallback(() => setPickerOpen(false), []);

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
      setError(arenaText(lang, status.status === 'declined' ? 'challengeDeclined' : status.status === 'expired' ? 'challengeExpired' : 'challengeCancelled'));
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

  // Синхронный латч оплаты старта (см. комментарий внутри create).
  const chargeInFlightRef = useRef(false);

  const create = async () => {
    if (!selected || busy || chargeInFlightRef.current) return;
    // зачем: окно подтверждения траты убрано 2026-08-24, а раньше именно оно
    // отбивало второй тап, пока висело на экране. busy тут не спасает — это
    // состояние React, оно ставится только ПОСЛЕ await и не видно второму тапу
    // в том же кадре. Латч закрывает щель между проверкой и setBusy(true);
    // дальше эстафету принимает busy.
    chargeInFlightRef.current = true;
    let energyCharged = false;
    let entryGranted = false;
    let energyResult: Awaited<ReturnType<typeof confirmDuelEnergy>>;
    try {
      energyResult = await confirmDuelEnergy(duelEnergyIntent);
      if (energyResult === 'cancelled') return;
      if (energyResult === 'insufficient') { setNoEnergyOpen(true); return; }
      energyCharged = energyResult === 'spent';
      setBusy(true); setError('');
    } finally {
      // Снимаем ровно тогда, когда эстафету уже принял busy (или мы вышли
      // раньше): держать дольше нельзя — кнопка залипнет на всё время сети.
      chargeInFlightRef.current = false;
    }
    try {
      const result = await arenaV2InviteCreate(selected.uid, requestIdRef.current);
      // The authoritative invite now exists. Later local-cache/ready polling
      // failures must not turn an actually granted Arena entry into a refund.
      entryGranted = true;
      if (energyCharged) void acknowledgeSessionStart(duelEnergyIntent.operationId);
      const stored: StoredInvite = { inviteId: result.inviteId, requestId: requestIdRef.current, selected, expiresAtMs: result.expiresAtMs };
      setInvite(stored);
      const uid = await getCanonicalUserId().catch(() => null);
      if (uid) await AsyncStorage.setItem(`${ACTIVE_INVITE_KEY}:${uid}`, JSON.stringify(stored));
      const ready = await arenaV2InviteReady(result.inviteId);
      finishStatus(ready);
    } catch {
      // зачем: вызов не создан (нет сети / отказ сервера) — значит входа не
      // случилось, и плата обязана вернуться. Иначе игрок теряет единицу за
      // чужую сетевую ошибку.
      if (energyCharged && !entryGranted) {
        await refundDuelEnergy(duelEnergyIntent.operationId, 'entry_failed')
          .then(() => setDuelEnergyRevision((current) => current + 1))
          .catch(() => {});
      }
      setError(`${arenaText(lang, 'inviteFailed')}. ${arenaText(lang, 'inviteFailedHint')}`);
    }
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
      setError(arenaText(lang, 'challengeCancelled'));
    }
    catch { setError(arenaText(lang, 'challengeCancelFailed')); }
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
    <ArenaScreen title={arenaText(lang, 'friendDuelTitle')} variant="tickets" onBack={leaveFriendDuel}>
      <V2Card style={styles.card}>
        {!selected && !invite ? (
          // зачем: пустой экран с одной кнопкой не объяснял, что вообще
          // происходит. Одна строка вместо немой пустоты.
          <Text style={[styles.lead, { color: P.muted }]}>{arenaText(lang, 'selectFriend')}</Text>
        ) : null}
        {selected ? <View style={styles.selected}><AvatarView avatar={selected.avatar} auraId={selected.aura} size={64} animateAura={false} ownerActive={active} /><Text style={[styles.name, { color: P.text }]}>{selected.name}</Text></View> : null}
        {invite ? <><Text testID="arena-friend-invite-countdown" style={[styles.countdown, { color: P.accent }]}>{remainingLabel(invite.expiresAtMs, now)}</Text><V2Cta tone="ghost" disabled={busy} onPress={cancel}>{arenaText(lang, 'cancelChallenge')}</V2Cta></> : <><V2Cta tone="ghost" disabled={busy} onPress={() => setPickerOpen(true)}>{arenaText(lang, selected ? 'pickAnotherFriend' : 'pickFriend')}</V2Cta>{selected ? <View style={styles.ctaWrap}><V2Cta accessibilityHint={arenaText(lang, 'friendHint')} disabled={busy} onPress={create}>{arenaText(lang, 'throwChallenge')}</V2Cta><EnergyCostBadge testID="arena-duel-energy-cost" /></View> : null}</>}
        {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: P.muted }]}>{error}</Text> : null}
      </V2Card>

      <HybridSheetShell visible={pickerOpen} onClose={closeFriendPicker} closeLabel={arenaText(lang, 'closeLabel')} testID="arena-friend-picker">
        {({ requestDismiss }) => <View style={styles.picker}>
          <Text style={[styles.pickerTitle, { color: P.text }]}>{arenaText(lang, 'whoToChallenge')}</Text>
          <ScrollView decelerationRate="fast" style={styles.pickerScroll} contentContainerStyle={styles.pickerRows} showsVerticalScrollIndicator={false}>
          {(friends?.friends ?? []).map((friend) => {
            const profile = friends?.profiles[friend.uid];
            const name = profile?.name ?? friend.displayName ?? arenaText(lang, 'friendFallbackName');
            return <Pressable key={friend.uid} accessibilityRole="button" accessibilityLabel={name} onPress={() => { setSelected({ uid: friend.uid, name, avatar: profile?.avatar, aura: profile?.aura }); requestDismiss(); }} style={[styles.row, { backgroundColor: P.elev }]}><AvatarView avatar={profile?.avatar} auraId={profile?.aura} size={44} animateAura={false} ownerActive={active} /><Text style={[styles.rowName, { color: P.text }]}>{name}</Text></Pressable>;
          })}
          {(friends?.friends ?? []).length === 0 && !__DEV__ ? (
            // зачем: без этого шторка открывалась ПУСТОЙ — ни строки текста,
            // и человек не понимал, сломалось приложение или у него правда нет
            // друзей. Ключ noFriends в copy.ts уже был, просто не использовался.
            <Text style={[styles.pickerEmpty, { color: P.muted }]}>{arenaText(lang, 'noFriends')}</Text>
          ) : null}
          {__DEV__ ? <Pressable testID="arena-friend-dev-bot" accessibilityRole="button" accessibilityLabel="DEV-бот" onPress={() => { requestDismiss(); void startDevBot(); }} style={[styles.row, { backgroundColor: P.elev }]}><View style={[styles.botAvatar, { backgroundColor: P.accent }]}><Text style={{ color: P.okInk, fontWeight: '900' }}>BOT</Text></View><Text style={[styles.rowName, { color: P.text }]}>DEV-бот</Text></Pressable> : null}
          </ScrollView>
        </View>}
      </HybridSheetShell>
      <NoEnergyModal visible={noEnergyOpen} onClose={() => setNoEnergyOpen(false)} />
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  // Якорь для углового бейджа «−1 ⚡».
  ctaWrap: { position: 'relative' },
  selected: { alignItems: 'center', gap: 10 },
  name: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  countdown: { fontSize: 34, fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] },
  error: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  picker: { gap: 10, paddingBottom: 4 },
  pickerScroll: { maxHeight: 480 },
  pickerRows: { gap: 10, paddingBottom: 4 },
  lead: { fontSize: 15, fontWeight: '600', textAlign: 'center', paddingBottom: 14 },
  pickerEmpty: { fontSize: 15, fontWeight: '600', textAlign: 'center', paddingVertical: 28 },
  pickerTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  row: { minHeight: 60, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowName: { flex: 1, fontSize: 16, fontWeight: '800' },
  botAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
