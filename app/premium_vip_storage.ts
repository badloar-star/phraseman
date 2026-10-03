import { readStoredItem } from './storage_snapshot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { getVipProgressState, parsePremiumProgressMs } from './premium_progress';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const VIP_SNAPSHOT_VERSION = 1 as const;
const VIP_SNAPSHOT_PREFIX = 'premium_vip_snapshot_v1:';

export const VIP_LEGACY_OWNER_KEY = 'premium_vip_legacy_owner_v1';
export const VIP_LEGACY_MIGRATION_CONSUMED_KEY = 'premium_vip_legacy_migration_consumed_v1';

export const VIP_STORAGE_KEYS = [
  'vip_active',
  'vip_plan',
  'vip_from',
  'vip_until',
  'vip_admin_override',
  'vip_admin_grant_at',
] as const;

const VIP_LEGACY_READ_KEYS = [
  ...VIP_STORAGE_KEYS,
  'vip_expiry',
  'vip_grant_at',
  'premium_plan',
  'premium_expiry',
  'admin_premium_override',
  'premium_admin_grant_at',
] as const;

export type VipStorageValues = Record<(typeof VIP_STORAGE_KEYS)[number], string>;

type VipStorageSnapshot = Readonly<{
  version: typeof VIP_SNAPSHOT_VERSION;
  ownerStableId: string;
  updatedAt: number;
  values: VipStorageValues;
}>;

let legacyMigrationClaimed = false;

function normalizeStableId(stableId: string | null | undefined): string | null {
  return stableId?.trim() || null;
}

export function vipSnapshotStorageKey(stableId: string): string {
  return `${VIP_SNAPSHOT_PREFIX}${encodeURIComponent(stableId.trim())}`;
}

export function isVipSnapshotStorageKey(key: string): boolean {
  return key.startsWith(VIP_SNAPSHOT_PREFIX);
}

function normalizeVipValues(values: Partial<VipStorageValues>): VipStorageValues {
  return {
    vip_active: String(values.vip_active ?? 'false'),
    vip_plan: String(values.vip_plan ?? ''),
    vip_from: String(values.vip_from ?? '0'),
    vip_until: String(values.vip_until ?? '0'),
    vip_admin_override: String(values.vip_admin_override ?? 'false'),
    vip_admin_grant_at: String(values.vip_admin_grant_at ?? ''),
  };
}

function parseSnapshot(raw: string | null, expectedStableId: string): VipStorageValues | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<VipStorageSnapshot>;
    if (
      parsed.version !== VIP_SNAPSHOT_VERSION
      || parsed.ownerStableId !== expectedStableId
      || !parsed.values
      || typeof parsed.values !== 'object'
    ) return null;
    return normalizeVipValues(parsed.values);
  } catch {
    return null;
  }
}

export function prepareVipSnapshotWritesForAccount(
  stableId: string,
  values: VipStorageValues,
  extraPairs: Array<[string, string]> = [],
): Array<[string, string]> {
  const snapshot: VipStorageSnapshot = {
    version: VIP_SNAPSHOT_VERSION,
    ownerStableId: stableId,
    updatedAt: Date.now(),
    values,
  };
  return [
    [vipSnapshotStorageKey(stableId), JSON.stringify(snapshot)],
    [VIP_LEGACY_OWNER_KEY, stableId],
    [VIP_LEGACY_MIGRATION_CONSUMED_KEY, '1'],
    ...VIP_STORAGE_KEYS.map((key) => [key, values[key]] as [string, string]),
    ...extraPairs,
  ];
}

/**
 * Commit a VIP snapshot for the identity that originated the work. The scoped
 * document is authoritative; global keys are compatibility mirrors only.
 */
export async function writeVipSnapshotForAccount(
  stableIdValue: string,
  valuesValue: Partial<VipStorageValues>,
): Promise<void> {
  const stableId = normalizeStableId(stableIdValue);
  if (!stableId) throw new Error('vip_snapshot_owner_required');
  const values = normalizeVipValues(valuesValue);
  inFlightVipReads.clear();
  await AsyncStorage.multiSet(prepareVipSnapshotWritesForAccount(stableId, values));
}

/**
 * Cloud restore must never publish account A into the global compatibility
 * mirrors after account B becomes active. The generation is checked under the
 * same transition lock immediately before the native write begins.
 */
export async function writeVipSnapshotForGeneration(
  generation: AccountGenerationToken,
  valuesValue: Partial<VipStorageValues>,
): Promise<boolean> {
  const stableId = normalizeStableId(generation.stableId);
  if (!stableId) return false;
  const values = normalizeVipValues(valuesValue);
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(generation, stableId)) return false;
    inFlightVipReads.clear();
    await AsyncStorage.multiSet(prepareVipSnapshotWritesForAccount(stableId, values));
    return isCurrentAccountGeneration(generation, stableId);
  });
}

/** Trusted reads never adopt ownerless or foreign legacy mirrors. */
export async function readVipSnapshotForAccount(
  stableIdValue: string | null | undefined,
): Promise<VipStorageValues | null> {
  const stableId = normalizeStableId(stableIdValue);
  if (!stableId) return null;
  const raw = await readVipSnapshotRawCoalesced(vipSnapshotStorageKey(stableId));
  return parseSnapshot(raw, stableId);
}

/**
 * зачем ([COLD-START-IO], release, слабый профиль, 02.10): снимок VIP читали 10 раз за первые 15 с.
 * Ключ стирает и общая чистка аккаунта (cloud_sync), поэтому значение НЕ держим — только склеиваем
 * одновременные чтения одного ключа; записи этого модуля сбрасывают склейку.
 */
const inFlightVipReads = new Map<string, Promise<string | null>>();

function readVipSnapshotRawCoalesced(key: string): Promise<string | null> {
  const existing = inFlightVipReads.get(key);
  if (existing) return existing;
  // зачем (§122, PM-220): чтение идёт через снапшот — хранилище один раз, дальше память. Стирание ключа общей чисткой аккаунта
  // (cloud_sync) и любая запись этого модуля проходят через AsyncStorage и выбрасывают ключ из снапшота.
  const pending = readStoredItem(key)
    .catch(noteSwallowedAs('premium_vip_storage:promise_1', null))
    .finally(() => {
      if (inFlightVipReads.get(key) === pending) inFlightVipReads.delete(key);
    });
  inFlightVipReads.set(key, pending);
  return pending;
}

/** Account-generation guarded trusted read; stale native completions fail closed. */
export async function readVipSnapshotForGeneration(
  generation: AccountGenerationToken,
): Promise<VipStorageValues | null> {
  const stableId = normalizeStableId(generation.stableId);
  if (!stableId || !isCurrentAccountGeneration(generation, stableId)) return null;
  const result = await readVipSnapshotForAccount(stableId);
  return isCurrentAccountGeneration(generation, stableId) ? result : null;
}

/**
 * One-time upgrade seam for pre-account-scoped installs. It is intentionally
 * explicit and generation-bound; ordinary entitlement readers never call it.
 */
export async function migrateLegacyVipSnapshotOnce(
  generation: AccountGenerationToken,
): Promise<boolean> {
  const stableId = normalizeStableId(generation.stableId);
  if (!stableId || !isCurrentAccountGeneration(generation, stableId)) return false;
  // Claim synchronously: B cannot start a second migration while A is awaiting
  // native storage. A late commit remains owned by A and B fails closed.
  if (legacyMigrationClaimed) return false;
  legacyMigrationClaimed = true;

  const keys = [
    VIP_LEGACY_MIGRATION_CONSUMED_KEY,
    VIP_LEGACY_OWNER_KEY,
    vipSnapshotStorageKey(stableId),
    ...VIP_LEGACY_READ_KEYS,
  ];
  const pairs = await AsyncStorage.multiGet(keys).catch(noteSwallowedAs('premium_vip_storage:promise_2', [] as Array<[string, string | null]>));
  if (!isCurrentAccountGeneration(generation, stableId)) return false;
  const values = new Map(pairs);
  if (parseSnapshot(values.get(vipSnapshotStorageKey(stableId)) ?? null, stableId)) return false;
  if (values.get(VIP_LEGACY_MIGRATION_CONSUMED_KEY) === '1') return false;

  const legacyOwner = normalizeStableId(values.get(VIP_LEGACY_OWNER_KEY));
  if (legacyOwner && legacyOwner !== stableId) return false;

  const get = (key: string): string | null => values.get(key) ?? null;
  const legacyState = getVipProgressState({
    vip_active: get('vip_active'),
    vip_plan: get('vip_plan'),
    vip_from: get('vip_from'),
    vip_until: get('vip_until') ?? get('vip_expiry'),
    vip_admin_override: get('vip_admin_override'),
    vip_admin_grant_at: get('vip_admin_grant_at') ?? get('vip_grant_at'),
    premium_plan: get('premium_plan'),
    premium_expiry: get('premium_expiry'),
    admin_premium_override: get('admin_premium_override'),
    premium_admin_grant_at: get('premium_admin_grant_at'),
  });
  if (!legacyState || !isCurrentAccountGeneration(generation, stableId)) return false;

  const normalized = normalizeVipValues({
    vip_active: legacyState.active ? 'true' : 'false',
    vip_plan: legacyState.active ? legacyState.plan : '',
    vip_from: legacyState.active ? legacyState.fromValue : '0',
    vip_until: legacyState.active ? legacyState.untilValue : '0',
    vip_admin_override: legacyState.active ? 'true' : 'false',
    vip_admin_grant_at: legacyState.grantAt
      ? String(parsePremiumProgressMs(legacyState.grantAt) || legacyState.grantAt)
      : '',
  });
  inFlightVipReads.clear();
  await AsyncStorage.multiSet(prepareVipSnapshotWritesForAccount(stableId, normalized));
  return isCurrentAccountGeneration(generation, stableId);
}

export const __premiumVipStorageTestHooks = {
  parseSnapshot,
  normalizeVipValues,
  resetMigrationClaim: () => { legacyMigrationClaimed = false; },
};

export default function __RouteShim() { return null; }
