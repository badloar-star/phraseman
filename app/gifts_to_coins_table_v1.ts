/**
 * D51/D53: таблица компенсации «Подарки/спины → монеты», вариант «Средне».
 *
 * зачем (владелец 2026-09-24, D53): раздел «Подарки» и спины удаляются в 2.0.
 * Всё неиспользованное молча превращается в монеты по утверждённой таблице из
 * docs/phraseman-2.0/docs/GIFTS_TO_COINS_MIGRATION.md §7 (колонка «Средне»).
 * Пока монеты = руны (до PM-069), каждая «монета» — это руна.
 *
 * Модуль ЧИСТЫЙ (без хранилища и сети): его зовёт миграция и тесты. Меняешь
 * число — меняй TABLE_VERSION, иначе уже записанный журнал миграции разойдётся
 * с кодом, который пытается его продолжить.
 */

export const GIFTS_TO_COINS_TABLE_VERSION = 'medium.v1' as const;

/** Бесплатный кредит спина = ожидаемая ценность спина каталога v7 (D53). */
export const FREE_SPIN_COINS = 130;
/** Платный спин стоил 300 рун: компенсация не меньше цены (D51). */
export const PAID_SPIN_MIN_COINS = 300;
/** Потолок бесплатных спинов на человека (D53). Платные в потолок не входят. */
export const FREE_SPIN_CAP = 20;
/** Жемчуг → монеты (D15). */
export const PEARL_TO_COIN_RATE = 10;
/** Опыт и бусты опыта: механика исчезает (D02) — символическая сумма (D53). */
export const XP_ITEM_COINS = 25;
/** Минимальный номинал зачисления stars_10: итог округляется вверх до 10. */
export const COIN_ROUNDING_STEP = 10;

export type PlusGiftId = 'plus_days_3' | 'plus_days_7' | 'plus_days_14' | 'plus_days_30';

const PLUS_GIFT_IDS: ReadonlySet<string> = new Set([
  'plus_days_3', 'plus_days_7', 'plus_days_14', 'plus_days_30',
]);

export function isPlusGiftId(giftId: string): giftId is PlusGiftId {
  return PLUS_GIFT_IDS.has(giftId);
}

/** Фиксированные строки таблицы «Средне» (§7). */
const FIXED_COINS: Readonly<Record<string, number>> = Object.freeze({
  cosmetic_theme: 2_000,
  cosmetic_avatar_aura: 1_500,
  premium_cosmetic_aura: 1_500,
  cosmetic_avatar_common: 900,
  premium_cosmetic_avatar: 900,
  pack_voucher_48h: 100,
  prem_pack_48h: 100,
  energy_full: 50,
  energy_plus1: 50,
  energy_plus2: 60,
  energy_plus3: 70,
  chain_shield_1: 90,
  chain_shield_3: 270,
  attempt_restore_all: 25,
  hint_1: 10,
  hint_3: 30,
  club_boost_free: XP_ITEM_COINS,
  wager_discount_25: XP_ITEM_COINS,
  premium_xp_bank_1000: XP_ITEM_COINS,
});

/** Постоянный пакет карточек (`prem_level_unlock_*`) — 800 (§7). */
const PERMANENT_PACK_COINS = 800;

export type GiftCoinValuation = Readonly<{
  coins: number;
  /** plus — это не монеты, а включение Plus (D51). */
  kind: 'coins' | 'plus' | 'unknown';
}>;

/**
 * Сколько монет стоит один предмет каталога подарков/призов спина.
 *
 * `choices` — варианты «Выбор из 3»: платим по самому дорогому (§7).
 * Неизвестный id не превращаем в ноль молча: kind='unknown' + символические
 * 25, а вызывающий обязан это залогировать.
 */
export function valueGiftForCoins(
  giftId: string,
  choices?: readonly string[],
): GiftCoinValuation {
  if (isPlusGiftId(giftId)) return Object.freeze({ coins: 0, kind: 'plus' });
  if (giftId === 'choice_3_level') {
    const options = (choices ?? [])
      .map((choice) => valueGiftForCoins(choice))
      .filter((value) => value.kind === 'coins');
    if (options.length === 0) return Object.freeze({ coins: XP_ITEM_COINS, kind: 'unknown' });
    return Object.freeze({ coins: Math.max(...options.map((value) => value.coins)), kind: 'coins' });
  }
  const fixed = FIXED_COINS[giftId];
  if (fixed !== undefined) return Object.freeze({ coins: fixed, kind: 'coins' });
  const stars = /^stars_(\d+)$/.exec(giftId);
  if (stars) return Object.freeze({ coins: Number(stars[1]), kind: 'coins' });
  // зачем: таблица §7 владельца относит `shards_*`/`prem_shards_*` к жемчугу
  // (×10). В коде подарков уровня они давно выдают опыт (+150…+800 XP), а не
  // жемчуг — расхождение вынесено в отчёт; здесь исполняем УТВЕРЖДЁННУЮ таблицу.
  const pearls = /^(?:pearls|shards|prem_shards)_(\d+)$/.exec(giftId);
  if (pearls) return Object.freeze({ coins: Number(pearls[1]) * PEARL_TO_COIN_RATE, kind: 'coins' });
  if (giftId.startsWith('prem_level_unlock_')) {
    return Object.freeze({ coins: PERMANENT_PACK_COINS, kind: 'coins' });
  }
  if (/^(?:xp_|xp_bank_|xp_2x_|focus_)/.test(giftId)) {
    return Object.freeze({ coins: XP_ITEM_COINS, kind: 'coins' });
  }
  return Object.freeze({ coins: XP_ITEM_COINS, kind: 'unknown' });
}

/** Платный спин: max(300; ценность приза). Plus-приз включается, монет не даёт. */
export function valuePaidSpinPrize(prizeGiftId: string): GiftCoinValuation {
  const prize = valueGiftForCoins(prizeGiftId);
  if (prize.kind === 'plus') return prize;
  return Object.freeze({ coins: Math.max(PAID_SPIN_MIN_COINS, prize.coins), kind: prize.kind });
}

export type DailyJourneyRewardKind =
  | 'pearls' | 'runes' | 'spins' | 'energy_full' | 'energy_plus' | 'freeze';

/**
 * Незабранный подарок «Дневного пути». Спины сюда НЕ входят — они считаются
 * отдельно, потому что подчиняются общему потолку 20 спинов.
 */
export function valueDailyJourneyReward(
  kind: DailyJourneyRewardKind,
  amount: number,
): GiftCoinValuation {
  const safeAmount = Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
  switch (kind) {
    case 'pearls': return Object.freeze({ coins: safeAmount * PEARL_TO_COIN_RATE, kind: 'coins' });
    case 'runes': return Object.freeze({ coins: safeAmount, kind: 'coins' });
    case 'energy_full': return valueGiftForCoins('energy_full');
    case 'energy_plus': return valueGiftForCoins(`energy_plus${safeAmount}`);
    case 'freeze': return Object.freeze({ coins: safeAmount * (FIXED_COINS.chain_shield_1 ?? 0), kind: 'coins' });
    case 'spins': return Object.freeze({ coins: safeAmount * FREE_SPIN_COINS, kind: 'coins' });
    default: return Object.freeze({ coins: XP_ITEM_COINS, kind: 'unknown' });
  }
}

export function roundCoinsUp(total: number): number {
  if (!Number.isSafeInteger(total) || total <= 0) return 0;
  return Math.ceil(total / COIN_ROUNDING_STEP) * COIN_ROUNDING_STEP;
}

const DENOMINATIONS = Object.freeze([2_000, 1_000, 500, 250, 100, 50, 20, 10] as const);

/**
 * Разложить сумму на номиналы рунного кошелька (жадно, как Дневной путь).
 * Сумма обязана быть кратна 10 — это гарантирует roundCoinsUp.
 */
export function coinDenominationGiftIds(total: number): string[] {
  if (!Number.isSafeInteger(total) || total < 0 || total % COIN_ROUNDING_STEP !== 0) {
    throw new Error('gifts_to_coins_total_invalid');
  }
  let remaining = total;
  const giftIds: string[] = [];
  for (const denomination of DENOMINATIONS) {
    while (remaining >= denomination) {
      giftIds.push(`stars_${denomination}`);
      remaining -= denomination;
    }
  }
  return giftIds;
}

export default function __RouteShim() { return null; }
