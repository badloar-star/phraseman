/**
 * GlobalFriendGiftHost — единственный владелец получения и показа подарков.
 * Подарок виден на любом экране, ждёт свободного слота OverlayArbiter и не
 * дублируется обычным тостом. claimUnseenFriendGifts уже сохраняет его в инвентарь.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { claimUnseenFriendGifts, type IncomingFriendGift } from '../app/friend_gift_inbox';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import { scheduleCoalescedForegroundTask } from '../app/app_resume_policy';
import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration } from '../app/account_generation';
import { accountScopeKey } from '../app/account_scope_key';
import { useOverlayVisible } from './OverlayArbiter';
import HybridAlertShell from './modal_fx/HybridAlertShell';
import DuoPressable from './DuoPressable';
import { soundDirector } from '../modules/audio/sound_director';
import { onAppEvent } from '../app/events';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const GIFT_SOUND = { soundEventId: 'pm.social.gift_received' as const };
const LAST_POLL_KEY = 'global_friend_gift_last_poll';

function giftLabel(gift: IncomingFriendGift, lang: ReturnType<typeof useLang>['lang']): string {
  if (lang === 'uk') return gift.giftLabelUk ?? gift.giftLabel;
  if (lang === 'es') return gift.giftLabelEs ?? gift.giftLabel;
  if (lang === 'pt-BR') return gift.giftLabelPtBr ?? gift.giftLabel;
  if (lang === 'vi') return gift.giftLabelVi ?? gift.giftLabel;
  if (lang === 'id') return gift.giftLabelId ?? gift.giftLabel;
  if (lang === 'tr') return gift.giftLabelTr ?? gift.giftLabel;
  if (lang === 'pl') return gift.giftLabelPl ?? gift.giftLabel;
  return gift.giftLabelRu ?? gift.giftLabel;
}

export default function GlobalFriendGiftHost() {
  const { lang } = useLang();
  const { theme: t, f } = useTheme();
  const runningRef = useRef(false);
  const forcePollPendingRef = useRef(false);
  const scheduledRef = useRef<{ cancel: () => void } | null>(null);
  const [pending, setPending] = useState<IncomingFriendGift[]>([]);
  const visible = useOverlayVisible('friendGift', pending.length > 0);
  const first = pending[0] ?? null;

  const dismiss = useCallback(() => {
    setPending((current) => current.slice(1));
  }, []);

  useEffect(() => {
    if (!visible || !first) return;
    soundDirector.request(GIFT_SOUND.soundEventId, {
      scope: 'friend-gift-modal',
      dedupeKey: first.id,
    });
  }, [first, visible]);

  const poll = async (force = false) => {
    if (runningRef.current) {
      if (force) forcePollPendingRef.current = true;
      return;
    }
    runningRef.current = true;
    try {
      const accountToken = captureAccountGeneration();
      const scope = accountScopeKey(accountToken);
      if (!scope || !isCurrentAccountGeneration(accountToken, accountToken.stableId)) return;
      const pollKey = `${LAST_POLL_KEY}::${scope}`;
      const lastRaw = await AsyncStorage.getItem(pollKey).catch(() => null);
      if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return;
      const last = lastRaw ? Number(lastRaw) : 0;
      const now = Date.now();
      if (!force && now - last < POLL_INTERVAL_MS) return;
      const gifts = await claimUnseenFriendGifts();
      if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return;
      await AsyncStorage.setItem(pollKey, String(now));
      if (!isCurrentAccountGeneration(accountToken, accountToken.stableId) || gifts.length === 0) return;
      setPending((current) => [...current, ...gifts.filter((gift) => !current.some((item) => item.id === gift.id))]);
    } catch {
      /* Подарок останется unseen и будет подобран следующим безопасным poll. */
    } finally {
      runningRef.current = false;
      if (forcePollPendingRef.current) {
        forcePollPendingRef.current = false;
        void poll(true);
      }
    }
  };

  useEffect(() => {
    const schedulePoll = () => {
      scheduledRef.current?.cancel();
      scheduledRef.current = scheduleCoalescedForegroundTask('global_friend_gift_poll', poll);
    };
    schedulePoll();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedulePoll();
    });
    return () => {
      sub.remove();
      scheduledRef.current?.cancel();
      scheduledRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => subscribeAccountGeneration(() => {
    // Never let account B see a gift modal queued for account A.
    setPending([]);
    forcePollPendingRef.current = false;
    scheduledRef.current?.cancel();
    scheduledRef.current = scheduleCoalescedForegroundTask('global_friend_gift_poll', () => poll(true));
  }).remove,
  // Process-lifetime host; poll validates the new account generation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  useEffect(() => {
    const sub = onAppEvent('friend_gift_push_opened', () => {
      scheduledRef.current?.cancel();
      scheduledRef.current = null;
      void poll(true);
    });
    return () => sub.remove();
    // Один process-lifetime listener; poll защищён runningRef и account generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const from = first?.fromName || triLang(lang, { ru: 'друга', uk: 'друга', es: 'un amigo', 'pt-BR': 'um amigo', vi: 'một người bạn', id: 'teman', tr: 'bir arkadaş', pl: 'znajomego' });
  const title = triLang(lang, { ru: `Подарок от ${from}`, uk: `Подарунок від ${from}`, es: `Regalo de ${from}`, 'pt-BR': `Presente de ${from}`, vi: `Quà từ ${from}`, id: `Hadiah dari ${from}`, tr: `${from} adlı arkadaşından hediye`, pl: `Prezent od ${from}` });
  const claim = triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Recoger', 'pt-BR': 'Resgatar', vi: 'Nhận', id: 'Ambil', tr: 'Al', pl: 'Odbierz' });

  return (
    <HybridAlertShell visible={visible} onRequestClose={dismiss} testID="friend-gift-global-modal" shadowColor={t.gold}>
      <View style={[styles.card, { backgroundColor: t.bgCard }]}>
        <View style={[styles.hero, { backgroundColor: t.goldBg }]}>
          <Ionicons name="gift" size={46} color={t.gold} />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
        <Text style={[styles.gift, { color: t.textPrimary, fontSize: f.h3 }]}>{first ? giftLabel(first, lang) : ''}</Text>
        <DuoPressable testID="friend-gift-global-claim" onPress={dismiss} edgeColor={t.gold} style={[styles.cta, { backgroundColor: t.gold }]}>
          <Text style={[styles.ctaText, { color: t.correctText }]}>{claim}</Text>
        </DuoPressable>
      </View>
    </HybridAlertShell>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, alignItems: 'center' },
  hero: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 18, fontWeight: '700', textAlign: 'center' },
  gift: { marginTop: 14, marginBottom: 24, fontWeight: '700', textAlign: 'center' },
  cta: { width: '100%', minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
