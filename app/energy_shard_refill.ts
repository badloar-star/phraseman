import AsyncStorage from '@react-native-async-storage/async-storage';
import { commitShardCompositeOperation } from './shards_system';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';

const ENERGY_STORAGE_KEY = 'energy_state';

/**
 * Цена дозаправки базовой энергии — по НЕДОСТАЮЩЕМУ количеству.
 *
 * зачем (аудит экономики 2026-08-24): цена была фиксированной (= maxEnergy),
 * сколько бы единиц ни не хватало. Окно «мало энергии» открывается не только при
 * нуле: экзамен и другие активности требуют порога (minRequired в NoEnergyModal),
 * поэтому игрок с 3 из 5 платил полные 5 жемчужин за 2 недостающие единицы —
 * переплата в 2,5 раза. Курс приложения прозрачен и равен 1 жемчужина = 1 слот =
 * 30 минут ожидания; фиксированная цена его нарушала.
 *
 * baseEnergy не передан (старые вызовы, витрина магазина) — показываем цену
 * полного заряда с нуля, как и раньше.
 */
export function energyRefillShardCost(maxEnergy: number, baseEnergy: number = 0): number {
  const cap = Math.max(1, Math.floor(Number(maxEnergy) || 0));
  const have = Math.max(0, Math.min(cap, Math.floor(Number(baseEnergy) || 0)));
  return Math.max(1, cap - have);
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
  const cost = energyRefillShardCost(maxEnergy, baseEnergy);
  try {
    const esRaw = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
    const es = esRaw
      ? (JSON.parse(esRaw) as { current: number; lastRecoveryTime: number })
      : { current: 0, lastRecoveryTime: Date.now() };
    const nextEnergyState = JSON.stringify({
      current: maxEnergy,
      lastRecoveryTime: Number.isFinite(es.lastRecoveryTime) ? es.lastRecoveryTime : Date.now(),
    });
    const purchase = await commitShardCompositeOperation({
      amount: cost,
      reason: 'buy_energy',
      grant: {
        kind: 'energy_refill',
        subjectId: 'base_energy',
        payload: { current: maxEnergy },
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
