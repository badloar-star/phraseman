/**
 * GlobalCompassSocialHost — тост-фолбэк соц-сводки «Кстати…».
 *
 * Основной канал соц-уведомлений (заявка в друзья / приняли твою заявку / лайк) —
 * блок «Кстати…» внутри брифинга Компаса. Но брифинг показывается не всегда:
 * Компас выключен, юзер не премиум в обычный день, или брифинг сегодня уже закрыт.
 * В этих случаях юзер всё равно должен узнать о событии — этот хост показывает
 * лёгкий тост (как GlobalFriendGiftHost для подарков).
 *
 * БЕЗ ЗАДВОЕНИЯ: и брифинг, и этот хост зовут общий collectCompassSocialNews +
 * markSocialNewsSeen (общие seen-сигнатуры). Плюс:
 *  • если брифинг СЕЙЧАС на экране (isCompassBriefingOnScreen) — тост пропускаем;
 *  • перед показом ждём короткую паузу (GRACE_MS), давая брифингу шанс открыться
 *    и забрать события первым; после паузы перечитываем — если брифинг их уже
 *    забрал, collect вернёт пусто.
 *
 * Анти-спам: поллинг не чаще POLL_INTERVAL_MS (как у подарков).
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import {
  collectCompassSocialNews,
  markSocialNewsSeen,
  isCompassBriefingOnScreen,
} from '../app/compass';
import { useLang } from './LangContext';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const LAST_POLL_KEY = 'global_compass_social_last_poll';
/** Пауза, дающая брифингу открыться и забрать события раньше тоста. */
const GRACE_MS = 4000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function GlobalCompassSocialHost() {
  const { lang } = useLang();
  const langRef = useRef(lang);
  langRef.current = lang;
  const runningRef = useRef(false);

  const poll = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const lastRaw = await AsyncStorage.getItem(LAST_POLL_KEY).catch(() => null);
      const last = lastRaw ? Number(lastRaw) : 0;
      const now = Date.now();
      if (last > 0 && now - last < POLL_INTERVAL_MS) return;
      await AsyncStorage.setItem(LAST_POLL_KEY, String(now)).catch(() => {});

      // Брифинг сейчас открыт — он сам покажет блок «Кстати…», тост не нужен.
      if (isCompassBriefingOnScreen()) return;

      // Первый сбор — есть ли вообще что показывать.
      const first = await collectCompassSocialNews(langRef.current).catch(() => ({ lines: [], events: [] }));
      if (!first.events.length) return;

      // Даём брифингу шанс открыться и забрать события первым.
      await delay(GRACE_MS);
      if (isCompassBriefingOnScreen()) return;

      // Перечитываем: если брифинг уже забрал события (markSeen), здесь будет пусто.
      const news = await collectCompassSocialNews(langRef.current).catch(() => ({ lines: [], events: [] }));
      if (!news.events.length) return;
      // Финальная проверка перед показом — последний await позади, брифинг не открыт.
      if (isCompassBriefingOnScreen()) return;

      // MARK-THEN-EMIT (анти-задвоение с модалкой): сначала помечаем seen, ПОТОМ
      // показываем тост. Если в тот же тик брифинг всё же откроется, его loader
      // перечитает уже-помеченные события и покажет пустой блок (не дубль), а не
      // ту же сводку. Обратный порядок (emit→mark) оставлял окно на двойной показ.
      await markSocialNewsSeen(news.events).catch(() => {});
      // Между mark и emit нет await и нет шанса для брифинга «забрать» события —
      // они уже помечены. Тост показываем безусловно (мы их «застолбили»).

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
    void poll();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void poll();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
