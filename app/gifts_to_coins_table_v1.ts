/**
 * D51/D53: таблица компенсации «Подарки/спины → монеты», вариант «Средне».
 *
 * зачем (владелец 2026-09-24, D53; координатор 2026-10-01, Q12/PM-048-A2):
 * раздел «Подарки» и спины удалены в 2.0. Всё неиспользованное молча
 * превращается в монеты по утверждённой таблице из
 * docs/phraseman-2.0/docs/GIFTS_TO_COINS_MIGRATION.md §7 (колонка «Средне»).
 * Пока монеты = руны (до PM-069), каждая «монета» — это руна.
 *
 * Отличия от исходной таблицы §7 (medium.v1 → medium.v2):
 *  - строка «жемчуг ×10» УБРАНА: D70 (отменяет D15) — жемчуг удаляется
 *    без компенсации, поэтому `pearls_*`/`shards_*`/`prem_shards_*` и
 *    жемчуг «Дневного пути» стоят 0;
 *  - энерго-бонусы `energy_full`/`energy_plus1/2/3` стоят 0 (решение
 *    2026-09-27, PROGRESS.md: удалённые энерго-бонусы не возвращают валюту);
 *  - добавлены предметы сезонного пропуска (D53: «незабранные награды
 *    сезонного пропуска — по той же таблице»).
 *
 * Модуль ЧИСТЫЙ (без хранилища и сети): его зовёт миграция и тесты. Меняешь
 * число — меняй TABLE_VERSION, иначе уже записанный журнал миграции разойдётся
 * с кодом, который пытается его продолжить.
 */

export const GIFTS_TO_COINS_TABLE_VERSION = 'medium.v2' as const;

/** Бесплатный кредит спина = ожидаемая ценность спина каталога v7 (D53). */
export const FREE_SPIN_COINS = 130;
/** Платный спин стоил 300 рун: компенсация не меньше цены (D51). */
export const PAID_SPIN_MIN_COINS = 300;
/** Потолок бесплатных спинов на человека (D53). Платные в потолок не входят. */
export const FREE_SPIN_CAP = 20;
/** D70: жемчуг в монеты НЕ конвертируется (строка «×10» убрана из таблицы). */
export const PEARL_COINS = 0;
/** Решение 2026-09-27: удалённые энерго-бонусы компенсации не дают. */
export const ENERGY_ITEM_COINS = 0;
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

export function plusGiftDays(giftId: PlusGiftId): 3 | 7 | 14 | 30 {
  if (giftId === 'plus_days_3') return 3;
  if (giftId === 'plus_days_7') return 7;
  if (giftId === 'plus_days_14') return 14;
  return 30;
}

const CHAIN_SHIELD_DAY_COINS = 90;

/** Фиксированные строки таблицы «Средне» (§7) с поправками medium.v2. */
const FIXED_COINS: Readonly<Record<string, number>> = Object.freeze({
  cosmetic_theme: 2_000,
  cosmetic_avatar_aura: 1_500,
  premium_cosmetic_aura: 1_500,
  cosmetic_avatar_common: 900,
  premium_cosmetic_avatar: 900,
  pack_voucher_48h: 100,
  prem_pack_48h: 100,
  energy_full: ENERGY_ITEM_COINS,
  energy_plus1: ENERGY_ITEM_COINS,
  energy_plus2: ENERGY_ITEM_COINS,
  energy_plus3: ENERGY_ITEM_COINS,
  chain_shield_1: CHAIN_SHIELD_DAY_COINS,
  chain_shield_3: CHAIN_SHIELD_DAY_COINS * 3,
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

const coins = (value: number): GiftCoinValuation => Object.freeze({ coins: value, kind: 'coins' });
const unknown = (): GiftCoinValuation => Object.freeze({ coins: XP_ITEM_COINS, kind: 'unknown' });

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
    if (options.length === 0) return unknown();
    return coins(Math.max(...options.map((value) => value.coins)));
  }
  const fixed = FIXED_COINS[giftId];
  if (fixed !== undefined) return coins(fixed);
  const stars = /^stars_(\d+)$/.exec(giftId);
  if (stars) return coins(Number(stars[1]));
  // зачем (D70, Q12): жемчуг удаляется без компенсации — предмет известен,
  // стоит 0 и закрывается вместе с остальными (не «unknown»).
  if (/^(?:pearls|shards|prem_shards)_\d+$/.test(giftId)) return coins(PEARL_COINS);
  if (giftId.startsWith('prem_level_unlock_')) return coins(PERMANENT_PACK_COINS);
  if (/^(?:xp_|xp_bank_|xp_2x_|focus_)/.test(giftId)) return coins(XP_ITEM_COINS);
  return unknown();
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
 * Незабранный подарок «Дневного пути». Спины здесь считаются без потолка —
 * потолок 20 применяет опись (общий учёт с активацией).
 */
export function valueDailyJourneyReward(
  kind: DailyJourneyRewardKind,
  amount: number,
): GiftCoinValuation {
  const safeAmount = Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
  switch (kind) {
    case 'pearls': return coins(safeAmount * PEARL_COINS);
    case 'runes': return coins(safeAmount);
    case 'energy_full':
    case 'energy_plus': return coins(ENERGY_ITEM_COINS);
    case 'freeze': return coins(safeAmount * CHAIN_SHIELD_DAY_COINS);
    case 'spins': return coins(safeAmount * FREE_SPIN_COINS);
    default: return unknown();
  }
}

/**
 * Предмет сезонного пропуска (инвентарь `season_pass_gift_inventory_v2:*`).
 * Батарейка/турбо-реген — энергия (0), турнирный билет давно хранится как
 * жемчуг (0, D70), щит друга — щит серии на `amount` дней, остальное — бусты
 * удалённых механик опыта/лиги/клуба (как «опыт» — 25 за предмет).
 */
export function valueSeasonPassItem(kind: string, amount: number | undefined): GiftCoinValuation {
  const count = Number.isSafeInteger(amount) && Number(amount) > 0 ? Number(amount) : 1;
  switch (kind) {
    case 'battery':
    case 'turbo_regen': return coins(ENERGY_ITEM_COINS);
    case 'tournament_ticket':
    case 'pearls': return coins(PEARL_COINS);
    case 'friend_shield': return coins(count * CHAIN_SHIELD_DAY_COINS);
    case 'league_boost':
    case 'club_totem':
    case 'golden_lesson':
    case 'collection_magnet':
    case 'time_machine':
    case 'xp_bank':
    case 'choice_3': return coins(XP_ITEM_COINS);
    default: return unknown();
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
