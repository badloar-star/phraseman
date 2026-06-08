// ═══════════════════════════════════════════════════════════════════════════
// remote_flags.ts — Remote Config layer (admin-tunable runtime knobs)
//
// Single source of truth for every value we want to change WITHOUT a release:
// free-tier limits, energy economy, trainer A/B split, and the paywall variant
// split. Resolution order (highest priority first):
//
//   1. Firestore override   (admin/index.html → remote_config/* → onSnapshot)
//   2. Build-time env        (EXPO_PUBLIC_* — useful for QA builds)
//   3. Hardcoded default     (DEFAULT_NUMBERS / DEFAULT_FLAGS below)
//
// The Firestore layer is filled by loadRemoteConfig()/subscribeRemoteConfig()
// (see remote_config_client.ts). Until that runs, defaults/env apply, so the
// app always works offline and on first launch.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

export type RemoteNumberKey =
  | 'free_lesson_limit'
  | 'free_daily_quiz_limit'
  | 'arena_daily_max'
  | 'arena_shard_refill_cost'
  | 'arena_shard_refill_slots'
  | 'max_energy'
  | 'energy_recovery_interval_ms'
  | 'free_trainer_sessions_per_day'
  | 'trainer_ab_a_pct'
  | 'trainer_ab_b_pct'
  | 'trainer_ab_c_pct'
  | 'paywall_v2_pct';

export type RemoteBoolKey =
  | 'referral_enabled'
  | 'speaking_enabled';

/**
 * Default free trainer sessions per day. Exported for call sites that need the
 * baseline without resolving Remote Config (e.g. trainer_session.ts fallback).
 * Kept in sync with DEFAULT_NUMBERS.free_trainer_sessions_per_day below.
 */
export const FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT = 2;

const DEFAULT_NUMBERS: Record<RemoteNumberKey, number> = {
  free_lesson_limit: 8,
  free_daily_quiz_limit: 3,
  arena_daily_max: 5,
  arena_shard_refill_cost: 5,
  arena_shard_refill_slots: 5,
  max_energy: 5,
  energy_recovery_interval_ms: 10 * 60 * 1000,
  free_trainer_sessions_per_day: 2,
  trainer_ab_a_pct: 0,
  trainer_ab_b_pct: 100,
  trainer_ab_c_pct: 0,
  paywall_v2_pct: 50,
};

const DEFAULT_FLAGS: Record<RemoteBoolKey, boolean> = {
  referral_enabled: false,
  speaking_enabled: true,
};

// Reasonable guard rails so a fat-fingered admin value can't brick the app.
const NUMBER_BOUNDS: Record<RemoteNumberKey, { min: number; max: number }> = {
  free_lesson_limit: { min: 1, max: 32 },
  free_daily_quiz_limit: { min: 0, max: 999 },
  arena_daily_max: { min: 0, max: 999 },
  arena_shard_refill_cost: { min: 0, max: 9999 },
  arena_shard_refill_slots: { min: 0, max: 999 },
  max_energy: { min: 1, max: 99 },
  energy_recovery_interval_ms: { min: 10_000, max: 24 * 60 * 60 * 1000 },
  free_trainer_sessions_per_day: { min: 0, max: 99 },
  trainer_ab_a_pct: { min: 0, max: 100 },
  trainer_ab_b_pct: { min: 0, max: 100 },
  trainer_ab_c_pct: { min: 0, max: 100 },
  paywall_v2_pct: { min: 0, max: 100 },
};

const ENV_NUMBER_KEYS: Partial<Record<RemoteNumberKey, string | undefined>> = {
  free_trainer_sessions_per_day: process.env.EXPO_PUBLIC_FREE_TRAINER_SESSIONS,
  trainer_ab_a_pct: process.env.EXPO_PUBLIC_TRAINER_AB_A,
  trainer_ab_b_pct: process.env.EXPO_PUBLIC_TRAINER_AB_B,
  trainer_ab_c_pct: process.env.EXPO_PUBLIC_TRAINER_AB_C,
  paywall_v2_pct: process.env.EXPO_PUBLIC_PAYWALL_V2_PCT,
};

// Firestore-fed overrides. Filled by remote_config_client; empty until then.
let _numberOverrides: Partial<Record<RemoteNumberKey, number>> = {};
let _boolOverrides: Partial<Record<RemoteBoolKey, boolean>> = {};
let _configSignature = 'defaults';

function clampNumber(key: RemoteNumberKey, value: number): number {
  const { min, max } = NUMBER_BOUNDS[key];
  if (!Number.isFinite(value)) return DEFAULT_NUMBERS[key];
  return Math.max(min, Math.min(max, value));
}

function parseEnvNumber(raw: string | undefined): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Resolve a numeric flag (override → env → default), always clamped. */
export function getRemoteNumber(key: RemoteNumberKey): number {
  const override = _numberOverrides[key];
  if (typeof override === 'number') return clampNumber(key, override);
  const env = parseEnvNumber(ENV_NUMBER_KEYS[key]);
  if (typeof env === 'number') return clampNumber(key, env);
  return DEFAULT_NUMBERS[key];
}

/** Resolve a boolean flag (override → default). */
export function getRemoteBool(key: RemoteBoolKey): boolean {
  const override = _boolOverrides[key];
  if (typeof override === 'boolean') return override;
  return DEFAULT_FLAGS[key];
}

/**
 * Apply a fresh config snapshot from Firestore. Unknown keys are ignored;
 * out-of-type values are dropped. Returns the new signature (changes when any
 * resolved value changes) so callers can invalidate cached A/B groups.
 */
export function applyRemoteConfigSnapshot(snapshot: {
  numbers?: Partial<Record<string, unknown>>;
  bools?: Partial<Record<string, unknown>>;
}): string {
  const nextNumbers: Partial<Record<RemoteNumberKey, number>> = {};
  const nextBools: Partial<Record<RemoteBoolKey, boolean>> = {};

  for (const key of Object.keys(DEFAULT_NUMBERS) as RemoteNumberKey[]) {
    const raw = snapshot.numbers?.[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      nextNumbers[key] = clampNumber(key, raw);
    }
  }
  for (const key of Object.keys(DEFAULT_FLAGS) as RemoteBoolKey[]) {
    const raw = snapshot.bools?.[key];
    if (typeof raw === 'boolean') nextBools[key] = raw;
  }

  _numberOverrides = nextNumbers;
  _boolOverrides = nextBools;
  _configSignature = buildSignature();
  return _configSignature;
}

function buildSignature(): string {
  const parts: string[] = [];
  for (const key of Object.keys(DEFAULT_NUMBERS) as RemoteNumberKey[]) {
    parts.push(`${key}=${getRemoteNumber(key)}`);
  }
  for (const key of Object.keys(DEFAULT_FLAGS) as RemoteBoolKey[]) {
    parts.push(`${key}=${getRemoteBool(key)}`);
  }
  return parts.join('|');
}

export function getRemoteConfigSignature(): string {
  return _configSignature;
}

// ── Convenience accessors (typed, self-documenting call sites) ──────────────

export const getFreeLessonLimit = () => getRemoteNumber('free_lesson_limit');
export const getFreeDailyQuizLimit = () => getRemoteNumber('free_daily_quiz_limit');
export const getArenaDailyMax = () => getRemoteNumber('arena_daily_max');
export const getArenaShardRefillCost = () => getRemoteNumber('arena_shard_refill_cost');
export const getArenaShardRefillSlots = () => getRemoteNumber('arena_shard_refill_slots');
export const getMaxEnergy = () => getRemoteNumber('max_energy');
export const getEnergyRecoveryIntervalMs = () => getRemoteNumber('energy_recovery_interval_ms');
export const getFreeTrainerSessionsPerDay = () => getRemoteNumber('free_trainer_sessions_per_day');
export const getPaywallV2Pct = () => getRemoteNumber('paywall_v2_pct');
export const isReferralEnabled = () => getRemoteBool('referral_enabled');
export const isSpeakingEnabled = () => getRemoteBool('speaking_enabled');

/**
 * Deterministic A/B group for a user (stable across launches unless the split
 * config changes). djb2 hash of `${userId}:${salt}` → bucket by cumulative pct.
 * Groups: 'A' | 'B' | 'C'. Defaults to 'B' (2 sessions) if all pcts are zero.
 */
export type TrainerAbGroup = 'A' | 'B' | 'C';

export function getTrainerAbGroup(userId: string): TrainerAbGroup {
  const a = getRemoteNumber('trainer_ab_a_pct');
  const b = getRemoteNumber('trainer_ab_b_pct');
  const c = getRemoteNumber('trainer_ab_c_pct');
  const total = a + b + c;
  if (total <= 0) return 'B';
  const bucket = hashToUnit(`${userId}:trainer_sessions_ab`) * total;
  if (bucket < a) return 'A';
  if (bucket < a + b) return 'B';
  return 'C';
}

/** Deterministic paywall variant for a user: 'v1' | 'v2' by paywall_v2_pct. */
export function getPaywallVariant(userId: string): 'v1' | 'v2' {
  const v2pct = getRemoteNumber('paywall_v2_pct');
  if (v2pct <= 0) return 'v1';
  if (v2pct >= 100) return 'v2';
  return hashToUnit(`${userId}:paywall_variant`) * 100 < v2pct ? 'v2' : 'v1';
}

function hashToUnit(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return (h % 100000) / 100000;
}

// ── Trainer A/B effective sessions (cached per user) ────────────────────────
// Merged from the env-based remote_flags during branch integration: builds on
// the Remote Config getters above (getTrainerAbGroup / getFreeTrainerSessionsPerDay)
// instead of duplicating the resolution logic.

const TRAINER_AB_CACHE_KEY = 'trainer_sessions_ab_group_v1';

/** Sessions/day for a given A/B group. A=1, B=2, C=3. */
export function trainerSessionsForGroup(group: TrainerAbGroup): number {
  switch (group) {
    case 'A': return 1;
    case 'B': return 2;
    case 'C': return 3;
  }
}

/**
 * Effective free trainer sessions/day for a user: if an A/B split is configured,
 * resolve a stable group by userId; otherwise fall back to the flat per-day value.
 * The chosen group is cached in AsyncStorage and invalidated when the Remote
 * Config signature changes, so the group never sticks across experiment changes.
 */
export async function getEffectiveFreeTrainerSessions(userId: string | null): Promise<number> {
  const hasAbSplit =
    getRemoteNumber('trainer_ab_a_pct') +
      getRemoteNumber('trainer_ab_b_pct') +
      getRemoteNumber('trainer_ab_c_pct') >
    0;

  if (!hasAbSplit || !userId) return getFreeTrainerSessionsPerDay();

  const sig = getRemoteConfigSignature();
  let group: TrainerAbGroup | null = null;
  const cached = await AsyncStorage.getItem(TRAINER_AB_CACHE_KEY).catch(() => null);
  if (cached) {
    const [cachedSig, cachedGroup] = cached.split('|');
    if (cachedSig === sig && (cachedGroup === 'A' || cachedGroup === 'B' || cachedGroup === 'C')) {
      group = cachedGroup;
    }
  }
  if (!group) {
    group = getTrainerAbGroup(userId);
    await AsyncStorage.setItem(TRAINER_AB_CACHE_KEY, `${sig}|${group}`).catch(() => {});
  }
  return trainerSessionsForGroup(group);
}

/** Test-only reset. */
export function __resetRemoteFlagsForTest(): void {
  _numberOverrides = {};
  _boolOverrides = {};
  _configSignature = 'defaults';
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
