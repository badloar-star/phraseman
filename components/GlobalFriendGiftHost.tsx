/**
 * GlobalFriendGiftHost — глобальный поллер подарков от друзей.
 *
 * Проблема: claimUnseenFriendGifts вызывался только на вкладке Friends.
 * Юзер, не заходя на Friends, никогда не видел уведомление.
 *
 * Решение: хост в _layout.tsx опрашивает при старте и при переходе
 * в foreground. Он помечает подарки seen — friends.tsx тогда получает
 * пустой ответ и не задваивает тост.
 *
 * Антиспам: поллинг не чаще POLL_INTERVAL_MS. Тост = reward-тип.
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import { claimUnseenFriendGifts } from '../app/friend_gift_inbox';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { scheduleCoalescedForegroundTask } from '../app/app_resume_policy';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const LAST_POLL_KEY = 'global_friend_gift_last_poll';

function giftLabel(gift: Awaited<ReturnType<typeof claimUnseenFriendGifts>>[number], lang: ReturnType<typeof useLang>['lang']): string {
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
  const langRef = useRef(lang);
  langRef.current = lang;
  const runningRef = useRef(false);
  const scheduledRef = useRef<{ cancel: () => void } | null>(null);

  const poll = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const lastRaw = await AsyncStorage.getItem(LAST_POLL_KEY).catch(() => null);
      const last = lastRaw ? Number(lastRaw) : 0;
      const now = Date.now();
      if (now - last < POLL_INTERVAL_MS) return;
      await AsyncStorage.setItem(LAST_POLL_KEY, String(now)).catch(() => {});

      const gifts = await claimUnseenFriendGifts();
      if (!gifts.length) return;

      const l = langRef.current;
      const first = gifts[0];
      const from = first.fromName || triLang(l, { ru: 'друг', uk: 'друг', es: 'amigo', 'pt-BR': 'amigo', vi: 'bạn', id: 'teman', tr: 'arkadaş', pl: 'znajomy' });
      const label = giftLabel(first, l);

      const messageRu = gifts.length === 1
        ? `${from} подарил тебе: ${label} 🎁`
        : triLang(l, { ru: `Новые подарки от друзей: ${gifts.length} 🎁`, uk: `Нові подарунки від друзів: ${gifts.length} 🎁`, es: `Regalos nuevos: ${gifts.length} 🎁`, 'pt-BR': `Novos presentes: ${gifts.length} 🎁`, vi: `Quà mới: ${gifts.length} 🎁`, id: `Hadiah baru: ${gifts.length} 🎁`, tr: `Yeni hediyeler: ${gifts.length} 🎁`, pl: `Nowe prezenty: ${gifts.length} 🎁` });

      emitAppEvent('action_toast', {
        type: 'reward',
        soundEventId: 'pm.social.gift_received',
        messageRu,
        messageUk: gifts.length === 1 ? `${from} подарував тобі: ${giftLabel(first, 'uk')} 🎁` : undefined,
        messageEs: gifts.length === 1 ? `${from} te regaló: ${giftLabel(first, 'es')} 🎁` : undefined,
      });
    } catch {
      /* ignore — optional enhancement */
    } finally {
      runningRef.current = false;
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

  return null;
}
