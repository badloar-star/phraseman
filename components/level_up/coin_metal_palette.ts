// ─── Металлы монет рангов · цвета ребра, искр и отражения ──────────────────
// зачем (PM-077 → PM-073, 2026-09-24): лицо монеты теперь — готовая картинка ранга
// из app/coin_rank_table_v1.ts (D60/D63). Палитра осталась для того, чего на картинке
// нет: ребро при флипе, запасная процедурная грань (если картинку не передали), искры.
// Металлов 4 (Медь → Серебро → Золото → Платина, по 5 чеканок) — цвет берётся по металлу
// ранга из той же таблицы, своих номеров рангов тут больше нет.
// Прежняя палитра из 21 отдельного металла (Классика…Эталон) снята вместе со старой
// нумерацией 0–20 (D60).
import { coinRankRowForDisplay, type CoinMetalId } from '../../app/coin_rank_table_v1';

export type CoinMetal = Readonly<{
  /** Светлый блик, средний тон, тень, глубокая тень. */
  hi: string;
  mid: string;
  lo: string;
  deep: string;
  /** Внешнее кольцо биметаллической монеты (в текущем листе не используется). */
  ring?: readonly [string, string, string];
}>;

const m = (hi: string, mid: string, lo: string, deep: string): CoinMetal => ({ hi, mid, lo, deep });

// Те же значения, что у соответствующих металлов в утверждённом прототипе variant-b.html.
export const COIN_METAL_PALETTE: Readonly<Record<CoinMetalId, CoinMetal>> = Object.freeze({
  copper: m('#f4b892', '#c8774c', '#6f3a1f', '#3f2010'),
  silver: m('#f7f8fa', '#c3c7ce', '#6c717b', '#3c3f46'),
  gold: m('#fce9a4', '#dcab3c', '#7a561a', '#43300e'),
  platinum: m('#eef0f3', '#bbc0c8', '#6a707a', '#3a3e46'),
});

/** Металл ранга; вне диапазона — ближайший край (только для цвета, не для денег). */
export function coinMetalForRank(rank: number): CoinMetal {
  return COIN_METAL_PALETTE[coinRankRowForDisplay(rank).metalId];
}
