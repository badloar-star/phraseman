import {
  ENERGY_BASE_CAPACITY,
  ENERGY_BONUS_CAPACITY_LIMIT,
  ENERGY_PERMANENT_CAPACITY_LIMIT,
  ENERGY_MICRO_UNITS_PER_UNIT,
} from './energy_contract';

const SUBMICRO_UNITS_PER_MICRO_UNIT = 1_000_000;
const SUBMICRO_UNITS_PER_ENERGY =
  ENERGY_MICRO_UNITS_PER_UNIT * SUBMICRO_UNITS_PER_MICRO_UNIT;
const LEGACY_MAX_ENERGY = 5;
const LEGACY_UNIT_MS = 30 * 60_000;
const LEGACY_SLOT_SCALE = ENERGY_BASE_CAPACITY / LEGACY_MAX_ENERGY;

export type EnergyStateV2 = Readonly<{
  schemaVersion: 2;
  current: number;
  lastSettledAt: number;
  recoveryCreditMicrounits: number;
  /** Millionths of one microunit, independent of the current recovery rate. */
  recoveryDivisionRemainder: number;
}>;

export type SettledEnergy = Readonly<{
  state: EnergyStateV2;
  bonusEnergy: number;
  bonusCapacity: number;
  bonusExpiresAt: number;
}>;

type LegacyEnergyState = Readonly<{ current: number; lastRecoveryTime: number }>;

function finiteInteger(value: number, fallback = 0): number {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, finiteInteger(value, min)));
}

function ceilDivide(numerator: bigint, denominator: bigint): bigint {
  if (numerator <= 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

function splitRecoveryCredit(totalSubmicrounits: bigint): Readonly<{
  wholeEnergy: number;
  recoveryCreditMicrounits: number;
  recoveryDivisionRemainder: number;
}> {
  const safeTotal = totalSubmicrounits > 0n ? totalSubmicrounits : 0n;
  const perEnergy = BigInt(SUBMICRO_UNITS_PER_ENERGY);
  const perMicrounit = BigInt(SUBMICRO_UNITS_PER_MICRO_UNIT);
  const wholeEnergy = Number(safeTotal / perEnergy);
  const fractional = safeTotal % perEnergy;
  return {
    wholeEnergy,
    recoveryCreditMicrounits: Number(fractional / perMicrounit),
    recoveryDivisionRemainder: Number(fractional % perMicrounit),
  };
}

function storedRecoveryCredit(state: Pick<EnergyStateV2,
  'recoveryCreditMicrounits' | 'recoveryDivisionRemainder'>): bigint {
  const microunits = clampInteger(
    state.recoveryCreditMicrounits,
    0,
    ENERGY_MICRO_UNITS_PER_UNIT - 1,
  );
  const remainder = clampInteger(
    state.recoveryDivisionRemainder,
    0,
    SUBMICRO_UNITS_PER_MICRO_UNIT - 1,
  );
  return BigInt(microunits) * BigInt(SUBMICRO_UNITS_PER_MICRO_UNIT) + BigInt(remainder);
}

export function migrateLegacyEnergyState(
  legacy: LegacyEnergyState,
  nowMs: number,
): EnergyStateV2 {
  const now = Math.max(0, finiteInteger(nowMs));
  const safeCurrent = clampInteger(legacy.current, 0, LEGACY_MAX_ENERGY);
  const lastRecoveryTime = Math.max(0, finiteInteger(legacy.lastRecoveryTime, now));
  const elapsed = Math.max(0, now - lastRecoveryTime);
  const completed = Math.min(
    LEGACY_MAX_ENERGY - safeCurrent,
    Math.floor(elapsed / LEGACY_UNIT_MS),
  );
  const settledLegacy = safeCurrent + completed;

  if (settledLegacy >= LEGACY_MAX_ENERGY) {
    return {
      schemaVersion: 2,
      current: ENERGY_BASE_CAPACITY,
      lastSettledAt: now,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    };
  }

  const elapsedWithinSlot = elapsed - completed * LEGACY_UNIT_MS;
  const partialSubmicrounits = (
    BigInt(elapsedWithinSlot)
    * BigInt(LEGACY_SLOT_SCALE)
    * BigInt(SUBMICRO_UNITS_PER_ENERGY)
  ) / BigInt(LEGACY_UNIT_MS);
  const partial = splitRecoveryCredit(partialSubmicrounits);

  return {
    schemaVersion: 2,
    current: Math.min(
      ENERGY_BASE_CAPACITY,
      settledLegacy * LEGACY_SLOT_SCALE + partial.wholeEnergy,
    ),
    lastSettledAt: now,
    recoveryCreditMicrounits: partial.recoveryCreditMicrounits,
    recoveryDivisionRemainder: partial.recoveryDivisionRemainder,
  };
}

export function createFullEnergyState(nowMs: number, maxEnergy: number = ENERGY_BASE_CAPACITY): EnergyStateV2 {
  return {
    schemaVersion: 2,
    current: clampInteger(maxEnergy, ENERGY_BASE_CAPACITY, ENERGY_PERMANENT_CAPACITY_LIMIT),
    lastSettledAt: Math.max(0, finiteInteger(nowMs)),
    recoveryCreditMicrounits: 0,
    recoveryDivisionRemainder: 0,
  };
}

/** Parses a durable payload and performs the legacy 1..5 → 0..100 migration once. */
export function coerceEnergyStateV2(value: unknown, nowMs: number): EnergyStateV2 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createFullEnergyState(nowMs);
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion === 2) {
    const current = finiteInteger(Number(record.current), Number.NaN);
    const lastSettledAt = finiteInteger(Number(record.lastSettledAt), Number.NaN);
    const recoveryCreditMicrounits = finiteInteger(
      Number(record.recoveryCreditMicrounits),
      Number.NaN,
    );
    const recoveryDivisionRemainder = finiteInteger(
      Number(record.recoveryDivisionRemainder),
      Number.NaN,
    );
    if (
      Number.isFinite(current)
      && current >= 0
      && current <= ENERGY_PERMANENT_CAPACITY_LIMIT
      && Number.isFinite(lastSettledAt)
      && lastSettledAt > 0
      && Number.isFinite(recoveryCreditMicrounits)
      && recoveryCreditMicrounits >= 0
      && recoveryCreditMicrounits < ENERGY_MICRO_UNITS_PER_UNIT
      && Number.isFinite(recoveryDivisionRemainder)
      && recoveryDivisionRemainder >= 0
      && recoveryDivisionRemainder < SUBMICRO_UNITS_PER_MICRO_UNIT
    ) {
      return {
        schemaVersion: 2,
        current,
        lastSettledAt,
        recoveryCreditMicrounits,
        recoveryDivisionRemainder,
      };
    }
    return createFullEnergyState(nowMs);
  }

  if (Number.isFinite(Number(record.current)) && Number.isFinite(Number(record.lastRecoveryTime))) {
    return migrateLegacyEnergyState({
      current: Number(record.current),
      lastRecoveryTime: Number(record.lastRecoveryTime),
    }, nowMs);
  }
  return createFullEnergyState(nowMs);
}

export function settleEnergyState(
  state: EnergyStateV2,
  input: Readonly<{
    nowMs: number;
    unitMs: number;
    bonusEnergy: number;
    bonusCapacity: number;
    bonusExpiresAt: number;
    maxEnergy?: number;
  }>,
): SettledEnergy {
  const previousSettledAt = Math.max(0, finiteInteger(state.lastSettledAt));
  const requestedNow = Math.max(0, finiteInteger(input.nowMs, previousSettledAt));
  const settledAt = Math.max(previousSettledAt, requestedNow);
  const elapsed = settledAt - previousSettledAt;
  const unitMs = Math.max(1, finiteInteger(input.unitMs, 1));
  const maxEnergy = clampInteger(
    input.maxEnergy ?? ENERGY_BASE_CAPACITY,
    ENERGY_BASE_CAPACITY,
    ENERGY_PERMANENT_CAPACITY_LIMIT,
  );
  const currentBase = clampInteger(state.current, 0, maxEnergy);

  const earnedSubmicrounits = (
    BigInt(elapsed) * BigInt(SUBMICRO_UNITS_PER_ENERGY)
  ) / BigInt(unitMs);
  const recovered = splitRecoveryCredit(storedRecoveryCredit(state) + earnedSubmicrounits);

  const activeBonusCapacity = input.bonusExpiresAt > settledAt
    ? clampInteger(input.bonusCapacity, 0, ENERGY_BONUS_CAPACITY_LIMIT)
    : 0;
  const activeBonusEnergy = clampInteger(input.bonusEnergy, 0, activeBonusCapacity);
  const nextBase = Math.min(maxEnergy, currentBase + recovered.wholeEnergy);
  const baseRecovered = nextBase - currentBase;
  const nextBonus = Math.min(
    activeBonusCapacity,
    activeBonusEnergy + recovered.wholeEnergy - baseRecovered,
  );
  const full = nextBase + nextBonus >= maxEnergy + activeBonusCapacity;

  return {
    state: {
      schemaVersion: 2,
      current: nextBase,
      lastSettledAt: settledAt,
      recoveryCreditMicrounits: full ? 0 : recovered.recoveryCreditMicrounits,
      recoveryDivisionRemainder: full ? 0 : recovered.recoveryDivisionRemainder,
    },
    bonusEnergy: nextBonus,
    bonusCapacity: activeBonusCapacity,
    bonusExpiresAt: activeBonusCapacity > 0 ? finiteInteger(input.bonusExpiresAt) : 0,
  };
}

export type EnergyRateSegment = Readonly<{ endAtMs: number; unitMs: number; maxEnergy?: number }>;

export function settleEnergyAcrossRateSegments(
  opening: SettledEnergy,
  segments: readonly EnergyRateSegment[],
): SettledEnergy {
  return segments.reduce((current, segment) => settleEnergyState(current.state, {
    nowMs: segment.endAtMs,
    unitMs: segment.unitMs,
    bonusEnergy: current.bonusEnergy,
    bonusCapacity: current.bonusCapacity,
    bonusExpiresAt: current.bonusExpiresAt,
    maxEnergy: segment.maxEnergy,
  }), opening);
}

export function timeUntilEnergyAtLeast(input: Readonly<{
  current: number;
  required: number;
  unitMs: number;
  recoveryCreditMicrounits: number;
  recoveryDivisionRemainder: number;
}>): number {
  const current = Math.max(0, finiteInteger(input.current));
  const required = Math.max(0, finiteInteger(input.required));
  const missing = Math.max(0, required - current);
  if (missing === 0) return 0;

  const unitMs = Math.max(1, finiteInteger(input.unitMs, 1));
  const stored = storedRecoveryCredit(input);
  const requiredSubmicrounits = BigInt(missing) * BigInt(SUBMICRO_UNITS_PER_ENERGY);
  const remaining = requiredSubmicrounits - stored;
  return Number(ceilDivide(
    remaining * BigInt(unitMs),
    BigInt(SUBMICRO_UNITS_PER_ENERGY),
  ));
}

export function normalizeEnergyMicrounits(value: number): number {
  return clampInteger(value, 0, ENERGY_MICRO_UNITS_PER_UNIT - 1);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
