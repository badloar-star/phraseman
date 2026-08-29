import AsyncStorage from '@react-native-async-storage/async-storage';
import bundledManifest from './bundles/bundled_marketplace_manifest.json';
import { emitAppEvent } from '../events';
import { flashcardsPackTrialGiftKey, type RuntimeStudyTarget } from '../target_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from '../account_generation';
import {
  finalizeClaimedGiftLegacyValues,
  readGiftAccountValue,
  readClaimedGiftLegacyValues,
  requireGiftAccountStorageKey,
  writeGiftAccountValue,
} from '../gift_account_storage';
import { DebugLogger } from '../debug-logger';

export type PackGiftClaimBinding = {
  packId: string;
  packType: 'official' | 'community';
  studyTarget: RuntimeStudyTarget;
  confirmedAt: number;
};

export type PackTrialState = {
  localVoucherId: string;
  packId: string;
  expiresAt: number;
  voucherId?: string;
  occurrenceId?: string;
  idempotencyKey?: string;
  source?: string;
  claimBinding?: PackGiftClaimBinding;
};

export type PackGiftMaterializedEntitlement = Omit<PackGiftClaimBinding, 'confirmedAt'>;

const PACK_GIFT_INVENTORY_KEY = 'flashcard_pack_gift_inventory_v2';
const PACK_TRIAL_ONCE_KEY_PREFIX = 'flashcard_pack_trial_gift_once_';
const LEGACY_KEYS = [flashcardsPackTrialGiftKey('en'), flashcardsPackTrialGiftKey('fr')] as const;
let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.catch(() => undefined);
  return next;
}

function safePart(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 180);
}

function parseVoucher(value: unknown, fallbackId?: string): PackTrialState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const packId = String(raw.packId ?? '').trim();
  const expiresAt = Math.floor(Number(raw.expiresAt));
  const voucherId = String(raw.voucherId ?? '').trim() || undefined;
  const occurrenceId = String(raw.occurrenceId ?? '').trim() || undefined;
  const localVoucherId = String(raw.localVoucherId ?? '').trim()
    || (voucherId ? `server_${safePart(voucherId)}` : '')
    || fallbackId;
  if (!packId || !localVoucherId || !Number.isFinite(expiresAt) || expiresAt <= 0) return null;
  const bindingRaw = raw.claimBinding;
  const claimBinding = bindingRaw && typeof bindingRaw === 'object' && !Array.isArray(bindingRaw)
    ? (() => {
      const binding = bindingRaw as Record<string, unknown>;
      const bindingPackId = String(binding.packId ?? '').trim();
      const packType = String(binding.packType ?? '');
      const studyTarget = String(binding.studyTarget ?? '');
      const confirmedAt = Math.floor(Number(binding.confirmedAt));
      return bindingPackId && ['official', 'community'].includes(packType) && ['en', 'fr'].includes(studyTarget) && Number.isFinite(confirmedAt)
        ? { packId: bindingPackId, packType: packType as 'official' | 'community', studyTarget: studyTarget as RuntimeStudyTarget, confirmedAt }
        : undefined;
    })()
    : undefined;
  return {
    localVoucherId,
    packId,
    expiresAt,
    ...(voucherId ? { voucherId } : {}),
    ...(occurrenceId ? { occurrenceId } : {}),
    ...(typeof raw.idempotencyKey === 'string' && raw.idempotencyKey ? { idempotencyKey: raw.idempotencyKey } : {}),
    ...(typeof raw.source === 'string' && raw.source ? { source: raw.source } : {}),
    ...(claimBinding ? { claimBinding } : {}),
  };
}

function dedupeInventory(items: readonly PackTrialState[]): PackTrialState[] {
  const byId = new Map<string, PackTrialState>();
  for (const item of items) {
    const previous = byId.get(item.localVoucherId);
    byId.set(item.localVoucherId, previous ? { ...previous, ...item, claimBinding: item.claimBinding ?? previous.claimBinding } : item);
  }
  return [...byId.values()].sort((a, b) => a.expiresAt - b.expiresAt || a.localVoucherId.localeCompare(b.localVoucherId));
}

async function readRawInventory(token: AccountGenerationToken): Promise<PackTrialState[]> {
  const raw = await readGiftAccountValue(PACK_GIFT_INVENTORY_KEY, token).catch(() => null);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return dedupeInventory(parsed.map((item) => parseVoucher(item)).filter((item): item is PackTrialState => item != null));
  } catch {
    return [];
  }
}

async function readLegacyEntries(token: AccountGenerationToken): Promise<PackTrialState[]> {
  if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('pack_gift_account_changed');
  const pairs = await readClaimedGiftLegacyValues(PACK_GIFT_INVENTORY_KEY, LEGACY_KEYS, token);
  const result: PackTrialState[] = [];
  for (const [key, raw] of pairs) {
    if (!raw) continue;
    try {
      const legacy = JSON.parse(raw) as unknown;
      const target = key === LEGACY_KEYS[1] ? 'fr' : 'en';
      const voucher = parseVoucher(legacy, `legacy_${target}_${safePart(String((legacy as Record<string, unknown>)?.voucherId ?? 'slot'))}`);
      if (voucher) result.push({ ...voucher, source: voucher.source ?? `legacy_migration_${target}` });
    } catch (e) {
      // Invalid legacy state is ignored; it never grants access by itself.
      DebugLogger.error('pack_trial_gift:voucher', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('pack_gift_account_changed');
  return result;
}

async function persistInventory(
  items: readonly PackTrialState[],
  token: AccountGenerationToken,
  removeLegacy = false,
): Promise<void> {
  await writeGiftAccountValue(PACK_GIFT_INVENTORY_KEY, JSON.stringify(dedupeInventory(items)), token);
  if (removeLegacy) {
    await finalizeClaimedGiftLegacyValues(PACK_GIFT_INVENTORY_KEY, LEGACY_KEYS, token);
  }
}

async function loadInventory(token: AccountGenerationToken): Promise<PackTrialState[]> {
  const current = await readRawInventory(token);
  const legacy = await readLegacyEntries(token);
  if (!legacy.length) return current;
  const merged = dedupeInventory([...current, ...legacy]);
  await persistInventory(merged, token, true);
  return merged;
}

function isUsable(item: PackTrialState, now = Date.now()): boolean {
  return item.expiresAt > now || item.claimBinding != null;
}

export async function getPackGiftTrials(): Promise<PackTrialState[]> {
  const token = captureAccountGeneration();
  return serialize(async () => {
    const items = await loadInventory(token);
    const usable = items.filter((item) => isUsable(item));
    if (usable.length !== items.length) await persistInventory(usable, token);
    return usable;
  });
}

export async function getPackGiftTrial(
  _studyTarget?: RuntimeStudyTarget,
  selection?: Omit<PackGiftClaimBinding, 'confirmedAt'>,
): Promise<PackTrialState | null> {
  const items = await getPackGiftTrials();
  const matchingRecovery = selection && items.find((item) => item.claimBinding
    && item.claimBinding.packId === selection.packId
    && item.claimBinding.packType === selection.packType
    && item.claimBinding.studyTarget === selection.studyTarget);
  if (matchingRecovery) return matchingRecovery;
  return items.find((item) => item.expiresAt > Date.now() && !item.claimBinding)
    ?? items.find((item) => item.expiresAt > Date.now())
    ?? items.find((item) => item.claimBinding != null)
    ?? null;
}

export function getPackTrialHoursLeft(expiresAt: number): number {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 3600000));
}

function randomPackId(seed?: string): string {
  const packs = (bundledManifest as { packs: { id: string }[] }).packs;
  const ids = packs.length > 0 ? packs.map((pack) => pack.id) : ['official_peaky_blinders_en'];
  return seed ? (ids[hash32(seed) % ids.length] ?? ids[0]) : ids[Math.floor(Math.random() * ids.length)];
}

function localIdFor(voucherId?: string, occurrenceId?: string): string {
  if (voucherId) return `server_${safePart(voucherId)}`;
  if (occurrenceId) return `occurrence_${safePart(occurrenceId)}`;
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function upsertVoucher(item: PackTrialState, token: AccountGenerationToken): Promise<PackTrialState> {
  return serialize(async () => {
    const items = await loadInventory(token);
    const previous = items.find((candidate) => candidate.localVoucherId === item.localVoucherId);
    const merged = previous ? { ...previous, ...item, claimBinding: item.claimBinding ?? previous.claimBinding } : item;
    await persistInventory([...items.filter((candidate) => candidate.localVoucherId !== item.localVoucherId), merged], token);
    emitAppEvent('pack_trial_gift_set');
    return merged;
  });
}

export async function setRandomPackGiftTrial48h(
  _studyTarget?: RuntimeStudyTarget,
  voucherId?: string,
  expiresAtOverride?: number,
  occurrenceId?: string,
  source?: string,
): Promise<PackTrialState | null> {
  const token = captureAccountGeneration();
  const expiresAt = Math.max(0, Math.floor(Number(expiresAtOverride) || 0)) || Date.now() + 48 * 60 * 60 * 1000;
  if (Date.now() >= expiresAt) return null;
  return upsertVoucher({
    localVoucherId: localIdFor(voucherId, occurrenceId),
    packId: randomPackId(voucherId ?? occurrenceId),
    expiresAt,
    ...(voucherId ? { voucherId } : {}),
    ...(occurrenceId ? { occurrenceId } : {}),
    ...(source ? { source } : {}),
  }, token);
}

function hash32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function setPackGiftTrial48hOnce(
  studyTarget: RuntimeStudyTarget | undefined,
  idempotencyKey: string,
  expiresAtOverride?: number,
  voucherId?: string,
  occurrenceId?: string,
  source?: string,
): Promise<PackTrialState | null> {
  const token = captureAccountGeneration();
  const safeKey = safePart(idempotencyKey);
  if (!safeKey) return setRandomPackGiftTrial48h(undefined, voucherId, expiresAtOverride, occurrenceId, source);
  const markerBaseKey = `${PACK_TRIAL_ONCE_KEY_PREFIX}${safeKey}`;
  return serialize(async () => {
    const items = await loadInventory(token);
    const marker = await readGiftAccountValue(markerBaseKey, token).catch(() => null);
    if (marker) {
      const markerId = marker === '1' ? '' : marker;
      const exact = items.find((item) => item.localVoucherId === markerId)
        ?? items.find((item) => item.idempotencyKey === idempotencyKey || (!!voucherId && item.voucherId === voucherId))
        ?? (marker === '1' ? items.find((item) => item.source === `legacy_migration_${studyTarget ?? 'en'}`) : undefined);
      if (exact) return exact;
    }
    const expiresAt = Math.max(0, Math.floor(Number(expiresAtOverride) || 0)) || Date.now() + 48 * 60 * 60 * 1000;
    if (Date.now() >= expiresAt) return null;
    const item: PackTrialState = {
      localVoucherId: localIdFor(voucherId, occurrenceId ?? idempotencyKey),
      packId: randomPackId(safeKey),
      expiresAt,
      idempotencyKey,
      ...(voucherId ? { voucherId } : {}),
      ...(occurrenceId ? { occurrenceId } : {}),
      ...(source ? { source } : {}),
    };
    const next = dedupeInventory([...items.filter((candidate) => candidate.localVoucherId !== item.localVoucherId), item]);
    const inventoryKey = requireGiftAccountStorageKey(PACK_GIFT_INVENTORY_KEY, token);
    const markerKey = requireGiftAccountStorageKey(markerBaseKey, token);
    await AsyncStorage.multiSet([[inventoryKey, JSON.stringify(next)], [markerKey, item.localVoucherId]]);
    if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('pack_gift_account_changed');
    emitAppEvent('pack_trial_gift_set');
    return item;
  });
}

const SERVER_GIFT_SOURCES = new Set([
  'global_broadcast', 'league_chest', 'level_gift', 'server_grant', 'weekly_boon',
]);

function isServerBackedVoucher(item: PackTrialState): boolean {
  return !!item.voucherId || (!!item.occurrenceId && SERVER_GIFT_SOURCES.has(item.source ?? ''));
}

function bindingIsMaterialized(
  binding: PackGiftClaimBinding,
  entitlements: readonly PackGiftMaterializedEntitlement[],
): boolean {
  return entitlements.some((entitlement) => entitlement.packId === binding.packId
    && entitlement.packType === binding.packType
    && entitlement.studyTarget === binding.studyTarget);
}

export async function reconcilePackGiftTrials(
  items: readonly Omit<PackTrialState, 'localVoucherId' | 'packId'>[],
  materializedEntitlements: readonly PackGiftMaterializedEntitlement[] = [],
): Promise<void> {
  const token = captureAccountGeneration();
  await serialize(async () => {
    const current = await loadInventory(token);
    const incoming = items
      .filter((item) => Number.isFinite(item.expiresAt) && item.expiresAt > Date.now())
      .map((item) => ({
        ...item,
        localVoucherId: localIdFor(item.voucherId, item.occurrenceId),
        packId: randomPackId(item.voucherId ?? item.occurrenceId),
      }));
    const incomingIds = new Set(incoming.map((item) => item.localVoucherId));
    const retained = current.filter((item) => {
      if (incomingIds.has(item.localVoucherId)) return true;
      if (!isServerBackedVoucher(item)) return isUsable(item);
      if (!item.claimBinding) return false;
      return !bindingIsMaterialized(item.claimBinding, materializedEntitlements);
    });
    const next = dedupeInventory([...retained, ...incoming]);
    const changed = JSON.stringify(next) !== JSON.stringify(dedupeInventory(current));
    await persistInventory(next, token);
    if (changed) emitAppEvent('pack_trial_gift_set');
  });
}

/** @deprecated Server discovery is authoritative; use reconcilePackGiftTrials. */
export async function mergePackGiftTrials(items: readonly Omit<PackTrialState, 'localVoucherId' | 'packId'>[]): Promise<void> {
  await reconcilePackGiftTrials(items);
}

export async function bindPackGiftVoucherSelection(localVoucherId: string, binding: PackGiftClaimBinding): Promise<void> {
  const token = captureAccountGeneration();
  await serialize(async () => {
    const items = await loadInventory(token);
    const index = items.findIndex((item) => item.localVoucherId === localVoucherId);
    if (index < 0) throw new Error('pack_gift_voucher_missing');
    const next = [...items];
    next[index] = { ...next[index], claimBinding: binding };
    await persistInventory(next, token);
  });
}

export async function hasActivePackGiftVoucher(_studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  return (await getPackGiftTrials()).some((item) => item.expiresAt > Date.now() && !item.claimBinding);
}

export async function hasActiveCommunityPackGiftVoucher(_studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  return hasActivePackGiftVoucher();
}

/**
 * Знищити ваучер (одноразовий — «згоряє» одразу після redemption).
 * Cards 2.1 §1.1: офіційні набори виведені з каталогу, тож ваучерний флоу наборів більше не викликається.
 */
export async function consumePackGiftTrial(voucher: string | PackTrialState | undefined): Promise<void> {
  const token = captureAccountGeneration();
  await serialize(async () => {
    const items = await loadInventory(token);
    const requested = typeof voucher === 'string' ? voucher : voucher?.localVoucherId;
    const localVoucherId = requested === 'en' || requested === 'fr' || !requested
      ? items.find((item) => item.expiresAt > Date.now())?.localVoucherId
      : requested;
    if (!localVoucherId) return;
    await persistInventory(items.filter((item) => item.localVoucherId !== localVoucherId), token);
    emitAppEvent('pack_trial_gift_consumed');
  });
}

export default function __RouteShim() { return null; }
