import { commitShardCompositeOperation } from './shards_system';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { ENERGY_BASE_CAPACITY, ENERGY_PERMANENT_CAPACITY_LIMIT } from './energy_contract';
import { createFullEnergyState } from './energy_state_v2';
import { energyVisualTransactions } from './energy_visual_transactions';
import * as Crypto from 'expo-crypto';

const ENERGY_STORAGE_KEY = 'energy_state';

/**
 * Сколько недостающих единиц энергии покрывает одна жемчужина.
 *
 * зачем (владелец, 2026-09-14): полный бак стоил 5 жемчужин — слишком дёшево,
 * жемчужина не ощущалась тратой. Владелец поднял цену полного заряда до 20,
 * то есть курс стал вчетверо дороже: 1 жемчужина за каждые начатые 5 единиц.
 */
const ENERGY_UNITS_PER_SHARD = 5 as const;

/**
 * Потолок цены ОДНОЙ дозаправки в жемчужинах (владелец, 2026-09-14).
 *
 * зачем потолок, а не плоская цена: постоянный запас энергии растёт вместе с
 * лигой и карточкой профиля (ENERGY_PERMANENT_CAPACITY_LIMIT = 210). Чистая
 * пропорция превратила бы дозаправку на Высшей лиге в 42 жемчужины — то есть
 * штрафовала бы за прогресс. С потолком полный бак стоит 20 при любом запасе, а
 * частичная доливка остаётся дешевле.
 */
export const ENERGY_REFILL_SHARD_COST_CAP = 20 as const;

/**
 * Цена дозаправки базовой энергии — по НЕДОСТАЮЩЕМУ количеству.
 *
 * зачем (аудит экономики 2026-08-24): цена была фиксированной (= maxEnergy),
 * сколько бы единиц ни не хватало. Окно «мало энергии» открывается не только при
 * нуле: экзамен и другие активности требуют порога (minRequired в NoEnergyModal),
 * поэтому частично пустая шкала не должна стоить как полностью пустая.
 *
 * baseEnergy не передан (старые вызовы, витрина магазина) — показываем цену
 * полного заряда с нуля, как и раньше.
 */
export function energyRefillShardCost(maxEnergy: number, baseEnergy: number = 0): number {
  const cap = Math.min(ENERGY_PERMANENT_CAPACITY_LIMIT, Math.max(1, Math.floor(Number(maxEnergy) || 0)));
  const have = Math.max(0, Math.min(cap, Math.floor(Number(baseEnergy) || 0)));
  const proportional = Math.ceil((cap - have) / ENERGY_UNITS_PER_SHARD);
  return Math.max(1, Math.min(ENERGY_REFILL_SHARD_COST_CAP, proportional));
}

export type RefillEnergyShardsFailReason =
  | 'unlimited'
  | 'already_full'
  | 'insufficient_shards'
  | 'spend_failed'
  | 'persist_failed';

export type RefillEnergyShardsResult =
  | { ok: true; spent: number }
  | { ok: false; reason: RefillEnergyShardsFailReason };

export function createEnergyRefillOperationId(): string {
  return `energy-refill:${Crypto.randomUUID()}`;
}

/**
 * Полная базовая энергия до maxEnergy за осколки. Бонусные слоты не трогаем.
 */
export async function refillEnergyWithShards(params: {
  maxEnergy: number;
  baseEnergy: number;
  isUnlimited: boolean;
  operationId?: string;
}): Promise<RefillEnergyShardsResult> {
  const { baseEnergy, isUnlimited, maxEnergy } = params;
  const operationId = params.operationId?.trim() || createEnergyRefillOperationId();
  if (isUnlimited) return { ok: false, reason: 'unlimited' };
  const target = Math.min(ENERGY_PERMANENT_CAPACITY_LIMIT, Math.max(ENERGY_BASE_CAPACITY, Math.floor(maxEnergy)));
  if (baseEnergy >= target) return { ok: false, reason: 'already_full' };
  const cost = energyRefillShardCost(target, baseEnergy);
  try {
    const nextEnergyState = JSON.stringify(createFullEnergyState(Date.now(), target));
    const purchase = await commitShardCompositeOperation({
      operationId,
      amount: cost,
      reason: 'buy_energy',
      grant: {
        kind: 'energy_refill',
        subjectId: 'base_energy',
        payload: { current: target, schemaVersion: 2 },
      },
      localWrites: [[ENERGY_STORAGE_KEY, nextEnergyState]],
    });
    if (purchase.status === 'insufficient') {
      return { ok: false, reason: 'insufficient_shards' };
    }
    if (purchase.status === 'failed') return { ok: false, reason: 'persist_failed' };
  } catch (error) {
    DebugLogger.error('energy_shard_refill:persist', error, 'warning');
    return { ok: false, reason: 'persist_failed' };
  }
  emitAppEvent('energy_reload');
  emitAppEvent('energy_purchased_shards');
  energyVisualTransactions.publish({
    operationId,
    from: Math.max(0, Math.floor(baseEnergy)),
    to: target,
    reason: 'refill',
    source: 'pearls',
  });
  return { ok: true, spent: cost };
}

export function toastEnergyRefilledWithShards(): void {
  emitAppEvent('action_toast', {
    type: 'success',
    soundEventId: 'pm.energy.refilled',
    messageRu: 'Энергия восстановлена.',
    messageUk: 'Енергію відновлено.',
    messageEs: 'Energía recuperada.',
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
