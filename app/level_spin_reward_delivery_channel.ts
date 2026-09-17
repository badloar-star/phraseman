import { LEVEL_SPIN_REWARD_IDS, type LevelSpinRewardId } from './level_spin_reward_catalog';

/**
 * Канал доставки приза спина.
 *
 * зачем (владелец, 2026-09-17): до этой даты спин НИКОГДА не применял приз сам —
 * всё падало плиткой в «Подарки» и ждало тапа. Владелец: «я не хочу, чтобы мне
 * ещё заходить надо было и их как-то активировать… должно сразу показывать
 * изменения в счётчике рун». Прежнее правило отменено, но не целиком: предметы,
 * которые выгодно включать в нужный момент, обязаны остаться отложенными —
 * иначе полная энергия, выпавшая при полной шкале, сгорает впустую.
 *
 * `instant`   — валюта и опыт: применяются в момент выигрыша, счётчик растёт
 *               сразу, плитка в «Подарках» НЕ создаётся.
 * `inventory` — энергия, расходники с длительностью и косметика: ждут тапа
 *               владельца в разделе «Подарки», как и раньше.
 */
export type LevelSpinRewardDeliveryChannel = 'instant' | 'inventory';

/**
 * Префиксы мгновенных призов.
 *
 * Здесь ТОЛЬКО то, что прибавляется к счётчику и не может быть потрачено зря:
 * опыт, жемчужины, звёзды/руны. Намеренно НЕ входят:
 * - `xp_bank_*`  — это множитель ×2 с запасом XP, а не мгновенный опыт: он
 *                  «расходуется только во время обучения», значит его выгодно
 *                  включать перед уроком (правило владельца про длительность);
 * - `xp_2x_*`    — множитель на 24/48 часов, время пошло бы впустую;
 * - `energy_*`   — владелец: «пусть идёт в подарки, применим когда хотим»;
 * - `cosmetic_*` — владелец оставил в подарках ради момента распаковки;
 * - `hint_*`, `chain_shield_*`, `attempt_restore_all`, `plus_days_*` — расходники.
 */
const INSTANT_REWARD_PREFIXES = ['xp_', 'pearls_', 'stars_'] as const;

/** Исключения из префиксов: начинаются на `xp_`, но по смыслу отложенные. */
const INSTANT_PREFIX_EXCEPTIONS = ['xp_bank_', 'xp_2x_'] as const;

export function levelSpinRewardDeliveryChannel(
  giftId: string,
): LevelSpinRewardDeliveryChannel {
  if (INSTANT_PREFIX_EXCEPTIONS.some((prefix) => giftId.startsWith(prefix))) return 'inventory';
  return INSTANT_REWARD_PREFIXES.some((prefix) => giftId.startsWith(prefix))
    ? 'instant'
    : 'inventory';
}

export function isInstantLevelSpinReward(giftId: string): boolean {
  return levelSpinRewardDeliveryChannel(giftId) === 'instant';
}

/**
 * Полный разбор каталога по каналам — для сторожа и админских проверок.
 *
 * зачем: каталог растёт (v7 добавил джекпоты). Новый приз, забытый в этой
 * классификации, молча уедет в «Подарки» — сторож обязан показать такой список
 * целиком, а не выяснять это на живом владельце.
 */
export function levelSpinRewardChannelBreakdown(): Readonly<{
  instant: readonly LevelSpinRewardId[];
  inventory: readonly LevelSpinRewardId[];
}> {
  const instant: LevelSpinRewardId[] = [];
  const inventory: LevelSpinRewardId[] = [];
  for (const id of LEVEL_SPIN_REWARD_IDS) {
    if (isInstantLevelSpinReward(id)) instant.push(id);
    else inventory.push(id);
  }
  return Object.freeze({
    instant: Object.freeze(instant),
    inventory: Object.freeze(inventory),
  });
}

export default function __RouteShim() { return null; }
