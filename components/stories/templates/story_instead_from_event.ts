// ═══════════════════════════════════════════════════════════════════════════
// story_instead_from_event.ts — событие `instead` → данные кадра «истории вместо окон».
//
// зачем (владелец 11.11, шаг 2): кадр показывает только то, что лежит в событии, и только если данные целы. Битое событие
// (нет числа, отрицательное, ранг вне таблицы) кадра не даёт — лучше пропустить историю, чем показать «0 дней перерыва».
// Подключены четыре вида: `back` («С возвращением»), `rank_enough` («Хватает на ранг»), `legacy` («Бонусы стали монетами»),
// `plus_expired` («Plus закончился»), `ref_ended` («Доступ можно открыть снова»),
// `ref_welcome` («Тебя пригласили»), `first_dialog` («Первый разговор»); остальные 10 — следующими партиями.
// Числа проверяются строго: строка '6' и дробное 6.9 не превращаются в 6 — так уже маскировался битый payload у ранга монеты.
// ═══════════════════════════════════════════════════════════════════════════
import { isValidCoinRank } from '../../../app/coin_rank_table_v1';
import type { StoryInsteadTemplate } from './story_instead_registry';

// зачем (release-gate 11.11, TS2345): данные события приходят из журнала как «неизвестно что» (StoryEventLike: Record<string, unknown>) —
// так их и принимаем; каждое поле ниже проверяется по типу перед использованием, поэтому сужать тип на входе незачем и нечестно.
type Payload = Readonly<Record<string, unknown>>;

/** Целое неотрицательное число как есть; иначе null. */
function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** Виды событий `instead`, у которых уже есть источник. */
export const STORY_INSTEAD_EVENT_KINDS = ['back', 'rank_enough', 'legacy', 'plus_expired', 'ref_ended', 'ref_welcome', 'first_dialog'] as const;

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
    case 'legacy': {
      const coins = count(p.coins);
      const xpBefore = count(p.xpBefore);
      const pearlsBefore = count(p.pearlsBefore);
      const spinsBefore = count(p.spinsBefore);
      // зачем (владелец 15.10): окно показывалось и при нулевом итоге — человек должен узнать, что пересчёт был; кадр ведёт себя так же
      if (coins === null || xpBefore === null || pearlsBefore === null || spinsBefore === null) return null;
      return { id: 'instead_legacy', coins, xpBefore, pearlsBefore, spinsBefore };
    }
    case 'plus_expired': {
      const freezesPerMonth = count(p.freezesPerMonth);
      if (freezesPerMonth === null || freezesPerMonth < 1) return null;
      // дату окончания хост истёкшей подписки не знает — кадр идёт без строки с датой
      return { id: 'instead_plus_expired', untilLabel: null, freezesPerMonth };
    }
    case 'ref_ended': {
      const windowEndMs = count(p.windowEndMs);
      if (windowEndMs === null || windowEndMs < 1) return null;
      return { id: 'instead_ref_ended', windowEndMs };
    }
    case 'ref_welcome':
      return { id: 'instead_ref_welcome', needsCodeEntry: p.needsCodeEntry === true };
    case 'first_dialog': {
      const turns = count(p.turns);
      const goalsDone = count(p.goalsDone);
      const goalsTotal = count(p.goalsTotal);
      if (typeof p.studyTarget !== 'string' || p.studyTarget.length === 0) return null;
      if (turns === null || turns < 1 || goalsDone === null || goalsTotal === null || goalsDone > goalsTotal) return null;
      return { id: 'instead_first_dialog', studyTarget: p.studyTarget, turns, goalsDone, goalsTotal };
    }
    default:
      return null;
  }
}
