import AsyncStorage from '@react-native-async-storage/async-storage';
import { spendShards, getShardsBalance } from './shards_system';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';

const ENERGY_STORAGE_KEY = 'energy_state';

/** Цена полного заряда базовой энергии (как на главной). */
export function energyRefillShardCost(maxEnergy: number): number {
  return Math.max(1, maxEnergy);
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

/**
 * Полная базовая энергия до maxEnergy за осколки. Бонусные слоты не трогаем.
 */
export async function refillEnergyWithShards(params: {
  maxEnergy: number;
  baseEnergy: number;
  isUnlimited: boolean;
}): Promise<RefillEnergyShardsResult> {
  const { maxEnergy, baseEnergy, isUnlimited } = params;
  if (isUnlimited) return { ok: false, reason: 'unlimited' };
  if (baseEnergy >= maxEnergy) return { ok: false, reason: 'already_full' };
  const cost = energyRefillShardCost(maxEnergy);
  const balance = await getShardsBalance();
  if (balance < cost) return { ok: false, reason: 'insufficient_shards' };
  const okSpend = await spendShards(cost, 'buy_energy');
  if (!okSpend) return { ok: false, reason: 'spend_failed' };
  try {
    const esRaw = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
    const es = esRaw
      ? (JSON.parse(esRaw) as { current: number; lastRecoveryTime: number })
      : { current: 0, lastRecoveryTime: Date.now() };
    await AsyncStorage.setItem(
      ENERGY_STORAGE_KEY,
      JSON.stringify({ current: maxEnergy, lastRecoveryTime: es.lastRecoveryTime }),
    );
  } catch (error) {
    DebugLogger.error('energy_shard_refill:persist', error, 'warning');
    return { ok: false, reason: 'persist_failed' };
  }
  emitAppEvent('energy_reload');
  emitAppEvent('energy_purchased_shards');
  return { ok: true, spent: cost };
}

export function toastEnergyRefilledWithShards(): void {
  emitAppEvent('action_toast', {
    type: 'success',
    messageRu: 'Энергия восстановлена.',
    messageUk: 'Енергію відновлено.',
    messageEs: 'Energía recuperada.',
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
