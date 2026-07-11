/**
 * Ненавязчивый глобальный тост для социальных событий Компаса.
 * Проверяет новости при входе/возврате в приложение не чаще одного раза в 5 минут.
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import {
  collectCompassSocialNews,
  markSocialNewsSeen,
} from '../app/compass';
import { useLang } from './LangContext';
import { scheduleCoalescedForegroundTask } from '../app/app_resume_policy';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const LAST_POLL_KEY = 'global_compass_social_last_poll';
export default function GlobalCompassSocialHost() {
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
      if (last > 0 && now - last < POLL_INTERVAL_MS) return;
      await AsyncStorage.setItem(LAST_POLL_KEY, String(now)).catch(() => {});

      const news = await collectCompassSocialNews(langRef.current).catch(() => ({ lines: [], allLines: [], events: [] }));
      if (!news.events.length) return;

      // Помечаем события до показа, чтобы повторный foreground не задвоил тост.
      await markSocialNewsSeen(news.events).catch(() => {});

      // Строки уже собраны на ТЕКУЩЕМ языке (collectCompassSocialNews(lang)).
      // ActionToast выбирает поле по языку и падает на messageRu, если поля нет —
      // поэтому кладём готовый локализованный текст и в messageRu (база/дедуп),
      // и в поле текущего языка, чтобы для не-RU не показать русский фолбэк.
      const text = news.lines.join('\n');
      const l = langRef.current;
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: text,
        messageUk: l === 'uk' ? text : undefined,
        messageEs: l === 'es' ? text : undefined,
        messagePtBr: l === 'pt-BR' ? text : undefined,
        messageVi: l === 'vi' ? text : undefined,
        messageId: l === 'id' ? text : undefined,
        messageTr: l === 'tr' ? text : undefined,
        messagePl: l === 'pl' ? text : undefined,
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
      scheduledRef.current = scheduleCoalescedForegroundTask('global_compass_social_poll', poll);
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
  }, []);

  return null;
}
