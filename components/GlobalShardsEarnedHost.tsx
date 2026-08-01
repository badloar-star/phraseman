import { memo, useEffect } from 'react';
import { emitAppEvent, onAppEvent } from '../app/events';
import { labelForShardModalReason } from '../app/shard_earn_ui';
import {
  ruKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAfterNumber,
} from '../constants/shard_plurals';
import { useLang } from './LangContext';

/**
 * Начисление осколков (shards_earned) → reward-тост единого стандарта.
 *
 * До 2026-06 здесь рендерилась ShardsEarnedModal (центр экрана, бэкдроп 82%,
 * автозакрытие 40с) — по аудиту модалок переведена в тост: мелкое начисление
 * не должно блокировать экран (docs/reports/MODALS_TOASTS_AUDIT_2026-06-10.md, раздел 4).
 * Очередь/дедуп/арбитр — внутри ActionToast.
 */
// зачем: RU/UK склоняются по числу — «+1 жемчужина», а не «+1 жемчужин».
const SHARDS_WORD: Record<string, (n: number) => string> = {
  ru: (n) => `+${n} ${ruKnowledgeShardsAfterNumber(n)}`,
  uk: (n) => `+${n} ${ukKnowledgeShardsAfterNumber(n)}`,
  es: (n) => `+${n} perlas`,
  'pt-BR': (n) => `+${n} perlas`,
  vi: (n) => `+${n} xu`,
  id: (n) => `+${n} shard`,
  tr: (n) => `+${n} jeton`,
  pl: (n) => `+${n} monet`,
};

/** Фаза 2: подпись бонусной части от карточки IV+ («карточка +N»), 8 языков UI. */
const CARD_BONUS_WORD: Record<string, (n: number) => string> = {
  ru: (n) => `карточка +${n}`,
  uk: (n) => `картка +${n}`,
  es: (n) => `tarjeta +${n}`,
  'pt-BR': (n) => `cartão +${n}`,
  vi: (n) => `thẻ +${n}`,
  id: (n) => `kartu +${n}`,
  tr: (n) => `kart +${n}`,
  pl: (n) => `karta +${n}`,
};

function GlobalShardsEarnedHost() {
  const { lang } = useLang();

  useEffect(() => {
    const sub = onAppEvent('shards_earned', (p) => {
      if (!p.amount || p.amount <= 0) return;
      const reason = p.reasonText?.trim() || labelForShardModalReason(p.reasonKey, lang);
      const shards = (SHARDS_WORD[lang] ?? SHARDS_WORD.ru)(p.amount);
      // Фаза 2: бонусная часть карточки IV+ показывается отдельно («+N · карточка +K»).
      const bonus = typeof p.bonus === 'number' && p.bonus > 0 ? Math.floor(p.bonus) : 0;
      const bonusText = bonus > 0 ? ` · ${(CARD_BONUS_WORD[lang] ?? CARD_BONUS_WORD.ru)(bonus)}` : '';
      const message = reason ? `${shards}${bonusText} — ${reason}` : `${shards}${bonusText}`;
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
