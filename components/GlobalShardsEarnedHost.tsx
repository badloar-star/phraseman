import { memo, useEffect } from 'react';
import { emitAppEvent, onAppEvent } from '../app/events';
import { labelForShardModalReason } from '../app/shard_earn_ui';
import { useLang } from './LangContext';

/**
 * Начисление осколков (shards_earned) → reward-тост единого стандарта.
 *
 * До 2026-06 здесь рендерилась ShardsEarnedModal (центр экрана, бэкдроп 82%,
 * автозакрытие 40с) — по аудиту модалок переведена в тост: мелкое начисление
 * не должно блокировать экран (docs/reports/MODALS_TOASTS_AUDIT_2026-06-10.md, раздел 4).
 * Очередь/дедуп/арбитр — внутри ActionToast.
 */
const SHARDS_WORD: Record<string, (n: number) => string> = {
  ru: (n) => `+${n} осколков`,
  uk: (n) => `+${n} осколків`,
  es: (n) => `+${n} fragmentos`,
  'pt-BR': (n) => `+${n} fragmentos`,
  vi: (n) => `+${n} mảnh`,
  id: (n) => `+${n} shard`,
  tr: (n) => `+${n} parça`,
  pl: (n) => `+${n} odłamków`,
};

function GlobalShardsEarnedHost() {
  const { lang } = useLang();

  useEffect(() => {
    const sub = onAppEvent('shards_earned', (p) => {
      if (!p.amount || p.amount <= 0) return;
      const reason = p.reasonText?.trim() || labelForShardModalReason(p.reasonKey, lang);
      const shards = (SHARDS_WORD[lang] ?? SHARDS_WORD.ru)(p.amount);
      const message = reason ? `${shards} — ${reason}` : shards;
      emitAppEvent('action_toast', {
        type: 'reward',
        messageRu: message,
        /** Строка уже на языке UI — дублируем в Es, чтобы испанский не упал на generic-фолбэк. */
        messageEs: message,
      });
    });
    return () => sub.remove();
  }, [lang]);

  return null;
}

export default memo(GlobalShardsEarnedHost);
