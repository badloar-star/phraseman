import {
  ENERGY_BASE_CAPACITY,
  ENERGY_BONUS_CAPACITY_LIMIT,
  ENERGY_PERMANENT_CAPACITY_LIMIT,
} from './energy_contract';

export type EnergyPools = Readonly<{
  base: number;
  bonus: number;
  capacity: number;
  expiresAt: number;
  maxEnergy?: number;
}>;

export type EnergyGiftEffect =
  | Readonly<{ kind: 'full'; amount: 0 }>
  | Readonly<{ kind: 'capacity'; amount: 20 | 40 | 60 }>;

export const ENERGY_GIFT_EFFECTS = Object.freeze({
  energy_full: { kind: 'full', amount: 0 },
  energy_plus1: { kind: 'capacity', amount: 20 },
  energy_plus2: { kind: 'capacity', amount: 40 },
  energy_plus3: { kind: 'capacity', amount: 60 },
} satisfies Readonly<Record<
  'energy_full' | 'energy_plus1' | 'energy_plus2' | 'energy_plus3',
  EnergyGiftEffect
>>);

export type EnergyGiftRewardId = keyof typeof ENERGY_GIFT_EFFECTS;

function clampInteger(value: number, min: number, max: number): number {
  const normalized = Number.isFinite(value) ? Math.floor(value) : min;
  return Math.max(min, Math.min(max, normalized));
}

export function energyGiftEffectForRewardId(id: EnergyGiftRewardId): EnergyGiftEffect {
  return ENERGY_GIFT_EFFECTS[id];
}

export function fillEnergyToActiveCap(pools: EnergyPools): EnergyPools {
  const capacity = clampInteger(pools.capacity, 0, ENERGY_BONUS_CAPACITY_LIMIT);
  const maxEnergy = clampInteger(
    pools.maxEnergy ?? ENERGY_BASE_CAPACITY,
    ENERGY_BASE_CAPACITY,
    ENERGY_PERMANENT_CAPACITY_LIMIT,
  );
  return {
    base: maxEnergy,
    bonus: capacity,
    capacity,
    expiresAt: capacity > 0 ? Math.max(0, Math.floor(pools.expiresAt)) : 0,
  };
}

export function applyEnergyCapacityGift(
  pools: EnergyPools,
  added: number,
  midnightMs: number,
): EnergyPools {
  const currentCapacity = clampInteger(pools.capacity, 0, ENERGY_BONUS_CAPACITY_LIMIT);
  const addedCapacity = Math.max(0, Number.isFinite(added) ? Math.floor(added) : 0);
  const capacity = Math.min(ENERGY_BONUS_CAPACITY_LIMIT, currentCapacity + addedCapacity);
  const maxEnergy = clampInteger(
    pools.maxEnergy ?? ENERGY_BASE_CAPACITY,
    ENERGY_BASE_CAPACITY,
    ENERGY_PERMANENT_CAPACITY_LIMIT,
  );
  return {
    base: maxEnergy,
    bonus: capacity,
    capacity,
    expiresAt: capacity > 0 ? Math.max(0, Math.floor(midnightMs)) : 0,
  };
}

export function expireEnergyGift(pools: EnergyPools): EnergyPools {
  const maxEnergy = clampInteger(
    pools.maxEnergy ?? ENERGY_BASE_CAPACITY,
    ENERGY_BASE_CAPACITY,
    ENERGY_PERMANENT_CAPACITY_LIMIT,
  );
  return {
    base: clampInteger(pools.base, 0, maxEnergy),
    bonus: 0,
    capacity: 0,
    expiresAt: 0,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
