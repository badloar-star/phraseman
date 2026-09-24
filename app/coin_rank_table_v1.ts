// ═══ Таблица рангов монеты · ЕДИНСТВЕННЫЙ источник чисел (PM-071-A2, PM-073) ═══
// зачем (владелец 2026-09-24, D34/D60/D62/D63): 20 рангов = 20 готовых картинок монет,
// металлы Медь → Серебро → Золото → Платина по 5 чеканок. Цена перехода НА ранг N
// (из N-1) = N × 1000; ранг 0 — бесплатный старт. Все числа, названия и картинки рангов
// живут ТОЛЬКО здесь: кнопка «Повысить уровень», аватар-монета, церемония чеканки и
// любая будущая подпись берут их отсюда, а не держат свои копии (иначе цена на кнопке
// однажды разойдётся с ценой списания).
//
// Источник: docs/phraseman-2.0/docs/COIN_RANKS.md (таблица «Цены»).
// Картинки: assets/images/coins/coin_rank_NN.webp — нарезка листа владельца
// (docs/phraseman-2.0/docs/coin-assets/sliced/), конвертированы в webp (2,4 МБ → ~0,5 МБ)
// и очищены от краешка соседней монеты, попавшего в нарезку сверху.
//
// ОТКРЫТО (COIN_RANKS.md «Открыто»): названий уровней 21 (Стажёр…Оракул), картинок 20.
// Названия сопоставлены по индексу 0..19, «Оракул» (индекс 20) НЕ используется — замену
// не выдумываем, ждём решения владельца. Названия пока только русские (переводы — PM-245).
import type { ImageSourcePropType } from 'react-native';

export type CoinMetalId = 'copper' | 'silver' | 'gold' | 'platinum';

export type CoinRankRow = Readonly<{
  /** Ранг 0…19. */
  rank: number;
  /** Цена перехода НА этот ранг из предыдущего. У ранга 0 — 0 (старт). */
  priceToReach: number;
  /** Сколько всего монет потрачено, чтобы дойти до этого ранга от старта. */
  totalSpent: number;
  metalId: CoinMetalId;
  /** Название металла (ru) — имя АССЕТА, не уровня. */
  metalName: string;
  /** Чеканка внутри металла 1…5 (гладкий круг → пышный резной узор). */
  chase: number;
  /** Название уровня (ru), короткая подпись под аватаром / в церемонии. */
  levelTitle: string;
  /** Путь картинки в репозитории — для документации и проверок. */
  assetPath: string;
  /** Картинка монеты для <Image source>. */
  source: ImageSourcePropType;
}>;

export const COIN_RANK_MIN = 0;
export const COIN_RANK_MAX = 19;
/** Шаг цены: переход на ранг N стоит N × COIN_RANK_PRICE_STEP. */
export const COIN_RANK_PRICE_STEP = 1000;

const METALS: readonly (readonly [CoinMetalId, string])[] = [
  ['copper', 'Медь'],
  ['silver', 'Серебро'],
  ['gold', 'Золото'],
  ['platinum', 'Платина'],
];

// Индекс = ранг. «Оракул» (21-е название из COIN_RANKS.md) сознательно отсутствует.
const LEVEL_TITLES_RU: readonly string[] = [
  'Стажёр', 'Кадет', 'Скаут', 'Агент', 'Спикер',
  'Лектор', 'Эксперт', 'Профи', 'Мастер', 'Эрудит',
  'Дипломат', 'Консул', 'Стратег', 'Магистр', 'Лидер',
  'Элита', 'Кумир', 'Икона', 'Легенда', 'Титан',
];

// Metro тянет картинки только по статическим require — поэтому список, а не шаблон пути.
const SOURCES: readonly ImageSourcePropType[] = [
  require('../assets/images/coins/coin_rank_00.webp'),
  require('../assets/images/coins/coin_rank_01.webp'),
  require('../assets/images/coins/coin_rank_02.webp'),
  require('../assets/images/coins/coin_rank_03.webp'),
  require('../assets/images/coins/coin_rank_04.webp'),
  require('../assets/images/coins/coin_rank_05.webp'),
  require('../assets/images/coins/coin_rank_06.webp'),
  require('../assets/images/coins/coin_rank_07.webp'),
  require('../assets/images/coins/coin_rank_08.webp'),
  require('../assets/images/coins/coin_rank_09.webp'),
  require('../assets/images/coins/coin_rank_10.webp'),
  require('../assets/images/coins/coin_rank_11.webp'),
  require('../assets/images/coins/coin_rank_12.webp'),
  require('../assets/images/coins/coin_rank_13.webp'),
  require('../assets/images/coins/coin_rank_14.webp'),
  require('../assets/images/coins/coin_rank_15.webp'),
  require('../assets/images/coins/coin_rank_16.webp'),
  require('../assets/images/coins/coin_rank_17.webp'),
  require('../assets/images/coins/coin_rank_18.webp'),
  require('../assets/images/coins/coin_rank_19.webp'),
];

function buildTable(): readonly CoinRankRow[] {
  const rows: CoinRankRow[] = [];
  let total = 0;
  for (let rank = COIN_RANK_MIN; rank <= COIN_RANK_MAX; rank += 1) {
    const price = rank * COIN_RANK_PRICE_STEP;
    total += price;
    const [metalId, metalName] = METALS[Math.floor(rank / 5)];
    rows.push(Object.freeze({
      rank,
      priceToReach: price,
      totalSpent: total,
      metalId,
      metalName,
      chase: (rank % 5) + 1,
      levelTitle: LEVEL_TITLES_RU[rank],
      assetPath: `assets/images/coins/coin_rank_${String(rank).padStart(2, '0')}.webp`,
      source: SOURCES[rank],
    }));
  }
  return Object.freeze(rows);
}

export const COIN_RANK_TABLE: readonly CoinRankRow[] = buildTable();

/** Ранг — целое 0…19. Всё остальное (NaN, дробь, чужое значение из хранилища) — не ранг. */
export function isValidCoinRank(rank: unknown): rank is number {
  return Number.isSafeInteger(rank) && (rank as number) >= COIN_RANK_MIN && (rank as number) <= COIN_RANK_MAX;
}

/**
 * Строка таблицы для ПОКАЗА (картинка, название). Вне диапазона — ближайший край:
 * показ не должен падать из-за битого значения. Для денег это не годится —
 * списание обязано проверять ранг через isValidCoinRank и отказывать.
 */
export function coinRankRowForDisplay(rank: number): CoinRankRow {
  const safe = Number.isFinite(rank) ? Math.round(rank) : COIN_RANK_MIN;
  const idx = Math.max(COIN_RANK_MIN, Math.min(COIN_RANK_MAX, safe)); // guard-ok: индекс строки показа, не баланс
  return COIN_RANK_TABLE[idx];
}

/** Строка следующего ранга или null, если ранг уже последний / невалидный. */
export function nextCoinRankRow(rank: number): CoinRankRow | null {
  if (!isValidCoinRank(rank) || rank >= COIN_RANK_MAX) return null;
  return COIN_RANK_TABLE[rank + 1];
}
