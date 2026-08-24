import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AvatarView from '../components/AvatarView';
import HybridAlertShell from '../components/modal_fx/HybridAlertShell';
import DuoPressable from '../components/DuoPressable';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card } from '../components/ui/v2_ui';
import { useTournamentPalette } from '../components/ui/v2_theme';
import { useTheme } from '../components/ThemeContext';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useLang } from '../components/LangContext';
import { arenaText } from '../modules/arena/copy';
import { arenaV2InviteAccept, arenaV2InviteDecline, arenaV2InviteReady, arenaV2InviteStatus, type ArenaFriendInviteStatus } from './arena_client';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import EnergyCostBadge from '../components/EnergyCostBadge';

export default function ArenaInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ inviteId?: string }>();
  const inviteId = typeof params.inviteId === 'string' ? params.inviteId.trim() : '';
  const active = useRuntimeActive();
  const P = useTournamentPalette();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const [status, setStatus] = useState<ArenaFriendInviteStatus | null>(null);
  const [busy, setBusy] = useState(false);
  // Принятие вызова друга = 1 ⚡ у принимающего (владелец 2026-08-23: единая
  // экономика, платим за ПОПЫТКУ — списание в accept() ниже).
  const { confirmSpendOne: confirmInviteEnergy, refundOne: refundInviteEnergy } = useEnergy();
  const [noEnergyOpen, setNoEnergyOpen] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const readyRequestedRef = useRef('');

  const handleStatus = useCallback((next: ArenaFriendInviteStatus) => {
    setStatus((current) => current ? { ...current, ...next } : next);
    if (next.status === 'matched' && next.matchId) {
      router.replace({ pathname: '/arena_match', params: { matchId: next.matchId, viewerSeat: next.viewerSeat } } as never);
      return true;
    }
    if (['declined', 'cancelled', 'expired'].includes(next.status)) {
      setError(next.status === 'expired' ? 'Время вызова вышло' : next.status === 'cancelled' ? 'Вызов отменён' : 'Сегодня без драмы');
    }
    return false;
  }, [router]);

  useEffect(() => {
    if (!active || !inviteId) { if (!inviteId) router.replace('/arena' as never); return; }
    let cancelled = false;
    void arenaV2InviteStatus(inviteId).then((next) => { if (!cancelled) handleStatus(next); }).catch(() => { if (!cancelled) setError('Вызов больше недоступен'); });
    return () => { cancelled = true; };
  }, [active, handleStatus, inviteId, router]);

  useEffect(() => {
    if (!active || !inviteId || status?.status !== 'pending') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const next = await arenaV2InviteStatus(inviteId);
        if (cancelled || handleStatus(next)) return;
      } catch { /* retry only while focused */ }
      if (!cancelled) timer = setTimeout(poll, 1500);
    };
    timer = setTimeout(poll, 1500);
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [active, handleStatus, inviteId, status?.status]);

  useEffect(() => {
    if (!active || !inviteId || status?.status !== 'accepted') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const next = readyRequestedRef.current === inviteId
          ? await arenaV2InviteStatus(inviteId)
          : await arenaV2InviteReady(inviteId);
        readyRequestedRef.current = inviteId;
        if (cancelled || handleStatus(next)) return;
      } catch { /* retry only while focused */ }
      if (!cancelled) timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [active, handleStatus, inviteId, status?.status]);

  useEffect(() => {
    if (!active || status?.status !== 'accepted') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => { setNow(Date.now()); timer = setTimeout(tick, 1000); };
    tick();
    return () => { if (timer) clearTimeout(timer); };
  }, [active, status?.status]);

  const accept = async () => {
    if (!inviteId || busy) return;
    let energyCharged = false;
    const energyResult = await confirmInviteEnergy();
    if (energyResult === 'cancelled') return;
    if (energyResult === 'insufficient') { setNoEnergyOpen(true); return; }
    energyCharged = energyResult === 'spent';
    setBusy(true); setError('');
    try {
      const accepted = await arenaV2InviteAccept(inviteId);
      if (handleStatus(accepted)) return;
      const ready = await arenaV2InviteReady(inviteId);
      handleStatus(ready);
    } catch {
      // зачем: вызов не принят (нет сети / отказ сервера) — входа не случилось,
      // плата возвращается. Иначе теряется единица за чужую сетевую ошибку.
      if (energyCharged) void refundInviteEnergy();
      setError(`${arenaText(lang, 'joinFailed')}. ${arenaText(lang, 'joinFailedHint')}`);
    }
    finally { setBusy(false); }
  };

  const decline = async () => {
    if (!inviteId || busy) return;
    setBusy(true);
    try { await arenaV2InviteDecline(inviteId); router.replace('/arena' as never); }
    catch { setError(`${arenaText(lang, 'declineFailed')}. ${arenaText(lang, 'declineFailedHint')}`); setBusy(false); }
  };

  const seconds = Math.max(0, Math.ceil((Number(status?.rendezvousExpiresAtMs ?? 0) - now) / 1000));
  return (
    <ArenaScreen title="Дуэль" variant="tickets" onBack={() => router.replace('/arena' as never)}>
      {status?.status === 'accepted' ? <V2Card style={styles.waiting}>
        <AvatarView avatar={status.counterpartAvatar} size={72} animateAura={false} ownerActive={active} />
        <Text style={[styles.name, { color: P.text }]}>{status.counterpartName || 'Друг'}</Text>
        <Text testID="arena-rendezvous-countdown" style={[styles.timer, { color: P.accent }]}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</Text>
      </V2Card> : null}
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: P.muted }]}>{error}</Text> : null}
      <HybridAlertShell visible={status?.status === 'pending'} onRequestClose={() => router.replace('/arena' as never)} testID="arena-friend-invite-modal" shadowColor={t.accent}>
        <View style={[styles.modal, { backgroundColor: t.bgCard }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{`${status?.counterpartName || 'Друг'} бросает вызов`}</Text>
          <Text style={[styles.body, { color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.35) }]}>10 заданий</Text>
          <View style={styles.ctaWrap}><DuoPressable testID="arena-friend-invite-accept" disabled={busy} onPress={() => { void accept(); }} edgeColor={t.accent} style={[styles.primary, { backgroundColor: t.accent }]}><Text style={[styles.button, { color: t.correctText }]}>Проверим</Text></DuoPressable><EnergyCostBadge testID="arena-invite-energy-cost" /></View>
          <DuoPressable testID="arena-friend-invite-decline" disabled={busy} onPress={() => { void decline(); }} edgeColor={t.bgSurface2} style={[styles.secondary, { backgroundColor: t.bgSurface2 }]}><Text style={[styles.button, { color: t.textPrimary }]}>Сегодня без драмы</Text></DuoPressable>
        </View>
      </HybridAlertShell>
      <NoEnergyModal visible={noEnergyOpen} onClose={() => setNoEnergyOpen(false)} />
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  waiting: { alignItems: 'center', gap: 12 },
  name: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  timer: { fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'] },
  error: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  modal: { padding: 24 },
  // Якорь для углового бейджа «−1 ⚡».
  ctaWrap: { position: 'relative' },
  title: { fontWeight: '700', textAlign: 'center' },
  body: { marginTop: 14, marginBottom: 22, textAlign: 'center' },
  primary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: 52, marginTop: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  button: { fontSize: 16, fontWeight: '700' },
});
