// ═══════════════════════════════════════════════════════════════════════════
// story_instead_from_event.ts — событие `instead` → данные кадра «истории вместо окон».
//
// зачем (владелец 11.11, шаг 2): кадр показывает только то, что лежит в событии, и только если данные целы. Битое событие
// (нет числа, отрицательное, ранг вне таблицы) кадра не даёт — лучше пропустить историю, чем показать «0 дней перерыва».
// Пока подключены два вида: `back` («С возвращением») и `rank_enough` («Хватает на ранг»); остальные 15 — следующими партиями.
// Числа проверяются строго: строка '6' и дробное 6.9 не превращаются в 6 — так уже маскировался битый payload у ранга монеты.
// ═══════════════════════════════════════════════════════════════════════════
import { isValidCoinRank } from '../../../app/coin_rank_table_v1';
import type { StoryInsteadTemplate } from './story_instead_registry';

type Payload = Readonly<Record<string, string | number | boolean>>;

/** Целое неотрицательное число как есть; иначе null. */
function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** Виды событий `instead`, у которых уже есть источник. */
export const STORY_INSTEAD_EVENT_KINDS = ['back', 'rank_enough'] as const;

export function insteadTemplateFromPayload(p: Payload): StoryInsteadTemplate | null {
  switch (p.kind) {
    case 'back': {
      const daysAway = count(p.daysAway);
      const dueCards = count(p.dueCards);
      const phrasesLearned = count(p.phrasesLearned);
      if (daysAway === null || daysAway < 1 || dueCards === null || phrasesLearned === null) return null;
      const coinRank = isValidCoinRank(p.coinRank) ? p.coinRank : null;
      return { id: 'instead_back', coinRank, daysAway, dueCards, phrasesLearned };
    }
    case 'rank_enough': {
      const balance = count(p.balance);
      const price = count(p.price);
      if (!isValidCoinRank(p.rank) || !isValidCoinRank(p.nextRank) || p.nextRank !== p.rank + 1) return null;
      // зачем: кадр обещает «хватает» — если в событии баланс меньше цены, это битые данные, а не повод показать неправду
      if (balance === null || price === null || price < 1 || balance < price) return null;
      return { id: 'instead_rank', rank: p.rank, nextRank: p.nextRank, balance, price };
    }
    default:
      return null;
  }
}
