import { commitShardCompositeOperation } from './shards_system';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { ENERGY_BASE_CAPACITY, ENERGY_PERMANENT_CAPACITY_LIMIT } from './energy_contract';
import { createFullEnergyState } from './energy_state_v2';
import { energyVisualTransactions } from './energy_visual_transactions';
import * as Crypto from 'expo-crypto';

const ENERGY_STORAGE_KEY = 'energy_state';

/**
 * Цена дозаправки базовой энергии — по НЕДОСТАЮЩЕМУ количеству.
 *
 * зачем (аудит экономики 2026-08-24): цена была фиксированной (= maxEnergy),
 * сколько бы единиц ни не хватало. Окно «мало энергии» открывается не только при
 * нуле: экзамен и другие активности требуют порога (minRequired в NoEnergyModal),
 * поэтому частично пустая шкала не должна стоить как полностью пустая.
 * После миграции один прежний слот равен 20 единицам: сохраняем прежний курс
 * 1 жемчужина за каждые начатые 20 недостающих единиц.
 *
 * baseEnergy не передан (старые вызовы, витрина магазина) — показываем цену
 * полного заряда с нуля, как и раньше.
 */
export function energyRefillShardCost(maxEnergy: number, baseEnergy: number = 0): number {
  const cap = Math.min(ENERGY_PERMANENT_CAPACITY_LIMIT, Math.max(1, Math.floor(Number(maxEnergy) || 0)));
  const have = Math.max(0, Math.min(cap, Math.floor(Number(baseEnergy) || 0)));
  // Legacy exchange was one pearl per 20-energy slot. Preserve its value after
  // the 5→100 migration instead of silently making a refill twenty times dearer.
  return Math.max(1, Math.ceil((cap - have) / 20));
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
