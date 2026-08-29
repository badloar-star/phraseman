// Weekly Boons — выдача наград модальных бонусов (Mystery Monday, Comeback) и
// гард «один раз за период». Чистая часть (выбор награды, расчёт claim-ключа)
// вынесена для тестов; запись в стор — тонкая обёртка над shards_system.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { commitShardCreditOperation } from '../shards_system';
import { grantLocalChestSpin } from '../local_level_spins';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';
import type { ClientShardLocalWrite } from '../economy/client_shard_operation_ledger';
import { getUtcDayKey } from '../local_date';
import { utcWeekNumberFromTodayKey } from './boon_engine';
import { DebugLogger } from '../debug-logger';

/**
 * Описание разовой награды бонуса.
 *
 * зачем `spins` (владелец, 2026-08-26): жемчужины из «Сундука недели» и «Дня
 * возвращения» заменены на спин общей рулетки — тот же единственный спин
 * приложения, что даёт уровень, урок, Арена и сундук лиги. Поле `shards`
 * оставлено в типе ради старых записей и тестов, но боевые награды теперь
 * кладут 0 жемчужин и 1 спин.
 */
export interface BoonReward {
  shards: number;
  spins?: number;
  /**
   * Мера редкости сундука — ТОЛЬКО для драматургии открытия (цвет, эффекты).
   *
   * зачем (владелец, 2026-08-26, инцидент «сундук вылезает каждый заход»):
   * `pickMysteryReward` возвращал редкость в поле `shards`, а `grantBoonReward`
   * читал то же поле как ВЫПЛАТУ — уходил в жемчужинную ветку, выдавал
   * жемчужины, которых владелец убрал, и при неуспехе не писал claim-маркер,
   * из-за чего модалка возвращалась при каждом запуске. Редкость обязана жить
   * в отдельном поле, чтобы такое склеивание больше не повторилось.
   */
  rarityShards?: number;
}

/** Тиры награды «Загадочного понедельника» (переменная, но без «пустых»). */
interface RewardTier {
  weight: number;
  shards: number;
}

/**
 * Экономика «Монеты и Звёзды» (docs/plans/2026-07-20-coins-stars-economy-plan.ru.md §7)
 * обнуляла выплаты из буня — сундук показывал «0 жемчужин — теперь твои», то есть
 * пустое окно с анимацией открытия.
 *
 * зачем: владелец (2026-07-27) закрыл висевший в этом файле открытый вопрос и разрешил
 * маленькую выплату — сундук снова что-то даёт, но по скромной шкале 1/2/3/5 (максимум
 * 5 жемчужин в неделю), чтобы не размывать продажу жемчужин. Веса, claim-гарды и
 * модалки не менялись.
 */
const MYSTERY_TIERS: readonly RewardTier[] = [
  { weight: 60, shards: 1 },
  { weight: 27, shards: 2 },
  { weight: 10, shards: 3 },
  { weight: 3, shards: 5 },
];

/**
 * Награда «Сундука недели» после замены жемчужин на спин.
 *
 * зачем (владелец, 2026-08-26): владелец убрал жемчужину из сундуков — она
 * размывала продажу валюты и не читалась как событие. Сундук недели теперь
 * даёт ровно один спин рулетки: награда крупнее по ощущению и ведёт игрока
 * в раздел подарков. Тиры MYSTERY_TIERS сохранены — они по-прежнему задают
 * «редкость» сундука (цвет и драматургию открытия), но выплата от них больше
 * не зависит.
 */
export const MYSTERY_SPIN_REWARD = 1;

/**
 * Детерминированный выбор тира по «броску» [0,1). Чистая функция: один и тот же
 * roll → один и тот же тир (для тестов и воспроизводимости).
 */
export function pickMysteryReward(roll: number): BoonReward {
  const total = MYSTERY_TIERS.reduce((s, tier) => s + tier.weight, 0);
  const r = Math.min(Math.max(roll, 0), 0.999999) * total;
  let acc = 0;
  for (const tier of MYSTERY_TIERS) {
    acc += tier.weight;
    // зачем: `shards` тут больше НЕ выплата, а мера редкости сундука — по ней
    // хост выбирает цвет и драматургию открытия (rarityForShards). Выплата
    // фиксирована: один спин. См. комментарий у MYSTERY_SPIN_REWARD.
    // зачем: тир задаёт ТОЛЬКО редкость (цвет и драматургию открытия) — она
    // едет в `rarityShards`. Выплата фиксирована: один спин, жемчужин ноль.
    // Держать редкость в `shards` нельзя: то же поле читает выплата.
    if (r < acc) return { shards: 0, spins: MYSTERY_SPIN_REWARD, rarityShards: tier.shards };
  }
  return { shards: 0, spins: MYSTERY_SPIN_REWARD, rarityShards: MYSTERY_TIERS[0].shards };
}

/**
 * Фиксированная награда «Дня возвращения».
 *
 * зачем (владелец, 2026-08-26): была 1 жемчужина — заменена на 1 спин, как и в
 * «Сундуке недели». Защита серии, которая идёт вместе с этой наградой, не
 * тронута: она выдаётся отдельно и к жемчужинам отношения не имела.
 */
export const COMEBACK_REWARD: BoonReward = { shards: 0, spins: 1 };

/** Текущий week-id (UTC, ISO-неделя-подобный номер) — для недельных claim-ключей. */
export function currentWeekId(todayKey: string = getUtcDayKey()): string {
  return `w${utcWeekNumberFromTodayKey(todayKey)}`;
}

/**
 * Storage-ключ claim'а «Сундука недели» (mystery_monday). Один источник истины:
 * пишет MysteryMondayHost при выдаче, читает плашка TodaysBoonStrip, чтобы не
 * показывать «открой и забери» после того, как сундук уже забран на этой неделе.
 */
export const MYSTERY_MONDAY_CLAIM_KEY = 'boon_mystery_monday_claimed_v1';

/** Прочитать, был ли claim по ключу совершён в данном периоде. */
export async function isClaimed(storageKey: string, periodId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(storageKey)) === periodId;
  } catch {
    return false;
  }
}

/** Пометить claim совершённым в данном периоде. */
export async function markClaimed(storageKey: string, periodId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, periodId);
  } catch (e) {
      // best-effort
      DebugLogger.error('boon_rewards:markClaimed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/**
 * Положить маркеры «забрано» на диск.
 *
 * зачем отдельной функцией (2026-08-26): маркер обязан лечь на КАЖДОМ пути
 * выдачи, включая отказной. Пока он писался только на успешном пути, любой
 * сбой выдачи превращался в «сундук показывается при каждом запуске».
 */
async function persistBoonClaimMarkers(
  localWrites: readonly ClientShardLocalWrite[],
): Promise<void> {
  if (localWrites.length === 0) return;
  await AsyncStorage.multiSet(localWrites.map(([key, value]) => [key, value]))
    .catch(() => {});
}

/**
 * Атомарно начислить награду вместе с её одноразовыми локальными маркерами.
 *
 * зачем переписано (владелец, 2026-08-26): раньше функция обслуживала только
 * жемчужины и на `shards <= 0` выходила через `return true` — то есть при
 * нулевой выплате НЕ записывала claim-маркер, и сундук показывался снова при
 * каждом запуске. После замены награды на спин выплата жемчужин стала нулевой,
 * поэтому этот ранний выход обязан был исчезнуть, иначе баг «модалка навсегда»
 * стал бы постоянным. Теперь маркеры пишутся ВСЕГДА, а спин выдаётся своим
 * идемпотентным путём (тот же ключ периода — повтор не удвоит награду).
 */
export async function grantBoonReward(
  reward: BoonReward,
  logReason: string,
  periodId: string,
  localWrites: readonly ClientShardLocalWrite[] = [],
): Promise<boolean> {
  const safeReason = logReason.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 32);
  const safePeriod = periodId.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 32);
  const spins = Math.max(0, Math.floor(Number(reward.spins) || 0));

  let spinsOk = true;
  if (spins > 0) {
    const token = captureAccountGeneration();
    // зачем (2026-08-26, «подарок получил — спин не начислился»): при пустом
    // stableId (личность ещё не готова на холодном старте) grantLocalChestSpin
    // выходит через `return false`, а прежняя проверка
    // isCurrentAccountGeneration(token, token.stableId) на null сравнивала null
    // с null и отвечала «всё в порядке» — провал выдачи считался успехом.
    // Теперь отсутствие личности — явный отказ.
    if (!token.stableId) {
      spinsOk = false;
    } else {
      for (let index = 0; index < spins; index += 1) {
        // Ключ идемпотентности — источник + период + индекс: повторный вызов
        // (второй показ модалки, ретрай после обрыва) не выдаст второй спин.
        const granted = await grantLocalChestSpin(
          `boon:${safeReason}:${safePeriod}:${index}`,
          token,
        ).catch(() => false);
        // false здесь означает и «уже выдавали» — это успех, а не отказ. Отличаем
        // только реальный сбой identity: тогда маркер писать нельзя.
        if (!granted && !isCurrentAccountGeneration(token, token.stableId)) spinsOk = false;
      }
    }
  }

  if (reward.shards > 0) {
    const result = await commitShardCreditOperation({
      amount: reward.shards,
      reason: logReason,
      operationId: `boon:${safeReason}:${safePeriod}`,
      grant: { kind: 'boon_reward', subjectId: `${safeReason}:${safePeriod}` },
      localWrites,
    });
    const shardsOk = result.status === 'applied' || result.status === 'already-applied';
    // зачем (2026-08-26): при отказе (например, личность ещё не готова)
    // commitShardCreditOperation НЕ пишет localWrites — маркер «забрано»
    // не ложился, и сундук вылезал при каждом заходе в приложение. Награда
    // идемпотентна по operationId/ключу спина, поэтому маркер безопасно
    // положить и здесь: повторная выдача исключена, а бесконечная модалка — да.
    if (!shardsOk) await persistBoonClaimMarkers(localWrites);
    return shardsOk && spinsOk;
  }

  // Жемчужин нет — маркеры «забрано» всё равно обязаны лечь на диск, иначе
  // модалка вернётся при следующем запуске.
  await persistBoonClaimMarkers(localWrites);
  return spinsOk;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
