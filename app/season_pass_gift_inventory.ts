// ════════════════════════════════════════════════════════════════════════════
// season_pass_gift_inventory.ts — единый инвентарь подарков Season Pass.
// зачем: владелец, 2026-08-03 — «оба сразу, одним заходом»: инвентарь +
// модалка получения. §0 каталога (docs/plans/2026-08-03-season-pass-gift-
// catalog.ru.md) описывал это как фундамент, без которого клейм некуда класть.
//
// Переиспользует GIFT_TTL_MS из gift_expiry.ts (72ч, единая формула для ВСЕХ
// подарков приложения) — НЕ изобретает свой таймер. Не трогает
// level_gift_inventory.ts / friend_gift_inventory.ts (заняты другими
// сессиями/фичами) — это четвёртое, но узко-сезонное хранилище, как и
// предполагал §0 при аудите: миграция трёх старых структур в общий тип —
// отдельная задача вне рамок Season Pass.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GIFT_TTL_MS } from './gift_expiry';
import { emitAppEvent } from './events';
import { withStorageLock } from './storage_mutex';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { SEASON_TRACK, type SeasonRewardKind } from './season_pass_track_config';
import { ENABLE_TOURNAMENTS } from './config';
import {
  authorizeSeasonPassClaimForAccount,
  getSeasonPassSeasonId,
  hydrateSeasonPassEntitlementForAccount,
} from './season_pass_model';
import { getVerifiedPremiumAccessStatusForAccountLease } from './premium_guard';

export const SEASON_PASS_GIFT_INVENTORY_STORAGE_KEY = 'season_pass_gift_inventory_v1';
const OWNER_INVENTORY_KEY_PREFIX = 'season_pass_gift_inventory_v2:';
const LEGACY_INVENTORY_OWNER_KEY = 'season_pass_gift_inventory_legacy_owner_v1';
const USED_MARKER_PREFIX = 'season_pass_gift_used_v1:';
const CLAIM_COMPOSITE_KEY_PREFIX = 'season_pass_claim_composite_v1:';
const LEGACY_CLAIMED_KEY = 'season_pass_claimed_v1';
const LEGACY_CLAIMED_OWNER_KEY = 'season_pass_claimed_legacy_owner_v1';
const RETIRED_TOURNAMENT_TICKET_PEARLS = 5;

/** Расходники, которые физически попадают в инвентарь (не статус, не сразу применяемое). */
export const SEASON_CONSUMABLE_KINDS: readonly SeasonRewardKind[] = [
  'battery', 'league_boost', 'club_totem', 'golden_lesson', 'collection_magnet',
  'turbo_regen', 'tournament_ticket', 'time_machine', 'friend_shield', 'xp_bank', 'choice_3',
];

export interface SeasonPassGiftItem {
  /** `${seasonId}:${level}:${side}` — уникален, не может задвоиться при повторном клейме. */
  id: string;
  kind: SeasonRewardKind;
  amount?: number;
  level: number;
  receivedAtMs: number;
  expiresAtMs: number;
  /** true, когда юзер нажал «Применить» — предмет ещё виден в списке до истечения TTL, но неактивен. */
  usedAtMs?: number;
}

type SeasonPassClaimRecordV1 = Readonly<{
  seasonId: string;
  level: number;
  side: 'free' | 'pass';
  /** null only for a migrated legacy claimed marker whose old gift is unknown. */
  gift: SeasonPassGiftItem | null;
}>;

type SeasonPassClaimCompositeV1 = Readonly<{
  schemaVersion: 'season-pass-claim-composite.v1';
  ownerStableId: string;
  claims: Readonly<Record<string, SeasonPassClaimRecordV1>>;
}>;

export function seasonPassClaimCompositeStorageKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner || owner.includes('/')) throw new Error('season_pass_claim_owner_invalid');
  return `${CLAIM_COMPOSITE_KEY_PREFIX}${encodeURIComponent(owner)}`;
}

export function seasonPassGiftInventoryStorageKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner || owner.includes('/')) throw new Error('season_pass_gift_owner_invalid');
  return `${OWNER_INVENTORY_KEY_PREFIX}${encodeURIComponent(owner)}`;
}

const emptyClaimComposite = (ownerStableId: string): SeasonPassClaimCompositeV1 => Object.freeze({
  schemaVersion: 'season-pass-claim-composite.v1',
  ownerStableId,
  claims: Object.freeze({}),
});

function parseClaimComposite(raw: string | null, ownerStableId: string): SeasonPassClaimCompositeV1 {
  if (raw === null) return emptyClaimComposite(ownerStableId);
  let parsed: unknown;
  try { parsed = JSON.parse(raw) as unknown; } catch { throw new Error('season_pass_claim_composite_corrupt'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('season_pass_claim_composite_corrupt');
  }
  const value = parsed as Partial<SeasonPassClaimCompositeV1>;
  if (value.schemaVersion !== 'season-pass-claim-composite.v1'
    || value.ownerStableId !== ownerStableId
    || !value.claims || typeof value.claims !== 'object' || Array.isArray(value.claims)) {
    throw new Error('season_pass_claim_composite_corrupt');
  }
  for (const [id, record] of Object.entries(value.claims)) {
    const match = /^(\d{4}-Q[1-4]):(\d+):(free|pass)$/.exec(id);
    const level = match ? Number(match[2]) : 0;
    const side = match?.[3] as 'free' | 'pass' | undefined;
    const catalogReward = side ? SEASON_TRACK.find((node) => node.level === level)?.[side] : undefined;
    const normalizedCatalogGift = catalogReward ? normalizeRetiredTournamentTicket({
      id,
      kind: catalogReward.kind,
      amount: catalogReward.amount,
      level,
      receivedAtMs: record?.gift?.receivedAtMs ?? 0,
      expiresAtMs: record?.gift?.expiresAtMs ?? GIFT_TTL_MS,
    }) : null;
    if (!record || typeof record !== 'object' || Array.isArray(record)
      || !match || !catalogReward
      || typeof record.seasonId !== 'string' || !/^\d{4}-Q[1-4]$/.test(record.seasonId)
      || !Number.isSafeInteger(record.level) || record.level < 1
      || (record.side !== 'free' && record.side !== 'pass')
      || record.seasonId !== match[1] || record.level !== level || record.side !== side
      || (record.gift !== null && (
        typeof record.gift !== 'object' || record.gift.id !== id
        || record.gift.level !== level
        || !Number.isSafeInteger(record.gift.receivedAtMs) || record.gift.receivedAtMs < 0
        || !Number.isSafeInteger(record.gift.expiresAtMs)
        || record.gift.expiresAtMs !== record.gift.receivedAtMs + GIFT_TTL_MS
        || record.gift.kind !== normalizedCatalogGift?.kind
        || record.gift.amount !== normalizedCatalogGift?.amount
      ))) {
      throw new Error('season_pass_claim_composite_corrupt');
    }
  }
  return value as SeasonPassClaimCompositeV1;
}

async function readClaimCompositeForOwner(
  token: AccountGenerationToken,
  owner: string,
): Promise<Readonly<{ raw: string | null; value: SeasonPassClaimCompositeV1 }>> {
  const key = seasonPassClaimCompositeStorageKey(owner);
  const raw = await AsyncStorage.getItem(key);
  if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_pass_claim_identity_changed');
  if (raw !== null) return Object.freeze({ raw, value: parseClaimComposite(raw, owner) });

  // Preserve old claimed rewards without letting the unscoped legacy map leak
  // into every later account. The first active owner tags it before migration.
  const legacyRaw = await AsyncStorage.getItem(LEGACY_CLAIMED_KEY);
  if (!legacyRaw || !isCurrentAccountGeneration(token, owner)) {
    return Object.freeze({ raw: null, value: emptyClaimComposite(owner) });
  }
  const taggedOwner = (await AsyncStorage.getItem(LEGACY_CLAIMED_OWNER_KEY))?.trim() ?? '';
  if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_pass_claim_identity_changed');
  if (taggedOwner && taggedOwner !== owner) {
    return Object.freeze({ raw: null, value: emptyClaimComposite(owner) });
  }
  if (!taggedOwner) {
    await AsyncStorage.setItem(LEGACY_CLAIMED_OWNER_KEY, owner);
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_pass_claim_identity_changed');
  }
  let legacy: unknown;
  try { legacy = JSON.parse(legacyRaw) as unknown; } catch { legacy = null; }
  const claims: Record<string, SeasonPassClaimRecordV1> = {};
  if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
    for (const [id, claimed] of Object.entries(legacy)) {
      const match = /^(\d{4}-Q[1-4]):(\d+):(free|pass)$/.exec(id);
      if (claimed !== true || !match) continue;
      claims[id] = Object.freeze({
        seasonId: match[1]!, level: Number(match[2]), side: match[3] as 'free' | 'pass', gift: null,
      });
    }
  }
  const migrated = Object.freeze({
    schemaVersion: 'season-pass-claim-composite.v1' as const,
    ownerStableId: owner,
    claims: Object.freeze(claims),
  });
  const migratedRaw = JSON.stringify(migrated);
  await AsyncStorage.setItem(key, migratedRaw);
  if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_pass_claim_identity_changed');
  return Object.freeze({ raw: migratedRaw, value: migrated });
}

function parseInventory(raw: string | null): SeasonPassGiftItem[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error('season_pass_gift_inventory_corrupt');
  return parsed.filter((it): it is SeasonPassGiftItem =>
    !!it && typeof it === 'object' && typeof it.id === 'string' && typeof it.expiresAtMs === 'number');
}

async function readOwnerInventory(
  token: AccountGenerationToken,
  owner: string,
): Promise<SeasonPassGiftItem[]> {
  const assertCurrent = (): void => {
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
  };
  const ownerKey = seasonPassGiftInventoryStorageKey(owner);
  const ownerRaw = await AsyncStorage.getItem(ownerKey);
  assertCurrent();
  if (ownerRaw !== null) return parseInventory(ownerRaw);

  const legacyRaw = await AsyncStorage.getItem(SEASON_PASS_GIFT_INVENTORY_STORAGE_KEY);
  assertCurrent();
  if (!legacyRaw) return [];
  const taggedOwner = (await AsyncStorage.getItem(LEGACY_INVENTORY_OWNER_KEY))?.trim() ?? '';
  assertCurrent();
  if (taggedOwner && taggedOwner !== owner) return [];

  // The owner tag is the one-time migration authority. It is written before
  // the projection so a native interruption cannot let another account adopt
  // the same legacy gifts. The tagged owner can reconstruct its scoped copy.
  if (!taggedOwner) {
    await AsyncStorage.setItem(LEGACY_INVENTORY_OWNER_KEY, owner);
    assertCurrent();
  }
  const migrated = parseInventory(legacyRaw);
  await AsyncStorage.setItem(ownerKey, JSON.stringify(migrated));
  assertCurrent();
  return migrated;
}

async function writeOwnerInventory(owner: string, items: readonly SeasonPassGiftItem[]): Promise<void> {
  await AsyncStorage.setItem(seasonPassGiftInventoryStorageKey(owner), JSON.stringify(items));
  emitAppEvent('season_pass_gift_inventory_changed', undefined);
}

/**
 * Tournament tickets are preserved as a legacy wire/storage kind, but while the
 * owner lock is active they must never reappear in UI or create dead inventory.
 * Five pearls preserve the configured value of one tournament entry.
 */
function normalizeRetiredTournamentTicket(item: SeasonPassGiftItem): SeasonPassGiftItem {
  if (ENABLE_TOURNAMENTS || item.kind !== 'tournament_ticket') return item;
  return { ...item, kind: 'pearls', amount: RETIRED_TOURNAMENT_TICKET_PEARLS };
}

/** Живые (не просроченные) предметы, отсортированы: скоро сгорающие — первыми. */
export async function loadSeasonPassGiftInventory(nowMs: number = Date.now()): Promise<SeasonPassGiftItem[]> {
  const token = captureAccountGeneration();
  const owner = token.stableId?.trim();
  if (!owner || !isCurrentAccountGeneration(token, owner)) return [];
  try {
    return await withAccountTransitionLock(() => withStorageLock(async () => {
      if (!isCurrentAccountGeneration(token, owner)) return [];
      const storedItems = await readOwnerInventory(token, owner);
      const { value: composite } = await readClaimCompositeForOwner(token, owner);
      if (!isCurrentAccountGeneration(token, owner)) return [];
      const compositeGifts = Object.values(composite.claims)
        .flatMap((claim) => claim.gift ? [claim.gift] : []);
      const byId = new Map<string, SeasonPassGiftItem>();
      [...storedItems, ...compositeGifts].forEach((item) => byId.set(item.id, item));
      const items = [...byId.values()].map(normalizeRetiredTournamentTicket);
      const alive = await filterAvailableSeasonPassGifts(items, nowMs, token, owner);
      if (!isCurrentAccountGeneration(token, owner)) return [];

      const normalizedStored = storedItems.map(normalizeRetiredTournamentTicket);
      const aliveIds = new Set(alive.map((item) => item.id));
      const nextStored = normalizedStored.filter((item) => aliveIds.has(item.id));
      if (JSON.stringify(nextStored) !== JSON.stringify(storedItems)) {
        await writeOwnerInventory(owner, nextStored);
      }
      return alive.slice().sort((a, b) => a.expiresAtMs - b.expiresAtMs);
    }));
  } catch {
    // Corrupt or cross-owner storage is unavailable, never globally inherited.
    return [];
  }
}

export async function loadSeasonPassClaimedMapForAccount(
  token: AccountGenerationToken,
): Promise<Record<string, true>> {
  const owner = token.stableId?.trim();
  if (!owner || !isCurrentAccountGeneration(token, owner)) return {};
  try {
    return await withAccountTransitionLock(async () => {
      if (!isCurrentAccountGeneration(token, owner)) return {};
      const { value } = await readClaimCompositeForOwner(token, owner);
      if (!isCurrentAccountGeneration(token, owner)) return {};
      return Object.fromEntries(Object.keys(value.claims).map((id) => [id, true])) as Record<string, true>;
    });
  } catch {
    return {};
  }
}

async function filterAvailableSeasonPassGifts(
  items: readonly SeasonPassGiftItem[],
  nowMs: number,
  token: AccountGenerationToken,
  owner: string,
): Promise<SeasonPassGiftItem[]> {
  const markerKeys = items.map((item) => seasonPassGiftUseMarkerStorageKey(item.id, owner));
  const usedMarkers = await AsyncStorage.multiGet(markerKeys);
  if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
  const legacyOwner = (await AsyncStorage.getItem(LEGACY_INVENTORY_OWNER_KEY))?.trim() ?? '';
  if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
  const legacyMarkers = legacyOwner === owner
    ? await AsyncStorage.multiGet(items.map((item) => legacySeasonPassGiftUseMarkerStorageKey(item.id)))
    : [];
  if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
  const usedIds = new Set(
    usedMarkers.flatMap(([, value], index) => value === '1' ? [items[index]?.id] : [])
      .filter((id): id is string => typeof id === 'string'),
  );
  const markerMigrations: [string, string][] = [];
  legacyMarkers.forEach(([, value], index) => {
    const item = items[index];
    if (value === '1' && item) {
      usedIds.add(item.id);
      if (usedMarkers[index]?.[1] !== '1') markerMigrations.push([markerKeys[index]!, '1']);
    }
  });
  for (const [key, value] of markerMigrations) {
    await AsyncStorage.setItem(key, value);
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
  }
  return items.filter((item) => item.expiresAtMs > nowMs && !usedIds.has(item.id));
}

export async function loadPendingSeasonPassGiftCount(nowMs: number = Date.now()): Promise<number> {
  const items = await loadSeasonPassGiftInventory(nowMs);
  return items.filter((it) => !it.usedAtMs).length;
}

/**
 * Кладёт подарок в инвентарь по факту клейма уровня. Идемпотентно по `id`:
 * повторный вызов с тем же level/kind не создаёт дубль (защита от двойного
 * тапа и повторной доставки одного и того же серверного результата).
 */
export async function addSeasonPassGift(
  seasonId: string,
  level: number,
  side: 'free' | 'pass',
  kind: SeasonRewardKind,
  amount?: number,
  nowMs: number = Date.now(),
): Promise<SeasonPassGiftItem> {
  const token = captureAccountGeneration();
  const owner = token.stableId?.trim();
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    throw new Error('season_gift_identity_not_ready');
  }
  return withAccountTransitionLock(() => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
    const id = `${seasonId}:${level}:${side}`;
    const items = await readOwnerInventory(token, owner);
    const existing = items.find((it) => it.id === id);
    if (existing) {
      const normalized = normalizeRetiredTournamentTicket(existing);
      if (normalized !== existing) {
        await writeOwnerInventory(owner, items.map((item) => item.id === id ? normalized : item));
      }
      return normalized;
    }
    const item = normalizeRetiredTournamentTicket({
      id, kind, amount, level, receivedAtMs: nowMs, expiresAtMs: nowMs + GIFT_TTL_MS,
    });
    await writeOwnerInventory(owner, [...items, item]);
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
    return item;
  }));
}

export type SeasonPassRewardClaimResult = Readonly<{
  status: 'applied' | 'already-claimed';
  gift: SeasonPassGiftItem | null;
}>;

/**
 * Authoritative Season claim. The owner checkpoint, current-quarter pass
 * entitlement, immutable claimed marker and exact gift remain under one
 * account-transition lease. Marker + gift share one storage value, so there is
 * no partial native multi-write that can create an orphan grant.
 */
export async function commitSeasonPassRewardClaim(input: Readonly<{
  token: AccountGenerationToken;
  seasonId: string;
  level: number;
  side: 'free' | 'pass';
  kind: SeasonRewardKind;
  amount?: number;
  now?: Date;
}>): Promise<SeasonPassRewardClaimResult> {
  const owner = input.token.stableId?.trim();
  const now = input.now ?? new Date();
  const currentSeasonId = (): string => getSeasonPassSeasonId(input.now ?? new Date());
  if (!owner || !isCurrentAccountGeneration(input.token, owner)) {
    throw new Error('season_pass_claim_identity_changed');
  }
  if (input.seasonId !== currentSeasonId()) {
    throw new Error('season_pass_claim_season_changed');
  }
  const catalogReward = SEASON_TRACK.find((node) => node.level === input.level)?.[input.side];
  if (!catalogReward || catalogReward.kind !== input.kind || catalogReward.amount !== input.amount) {
    throw new Error('season_pass_claim_catalog_mismatch');
  }
  return withAccountTransitionLock((lease) => withStorageLock(async () => {
    const assertCurrent = (): void => {
      if (!isCurrentAccountGeneration(input.token, owner)) {
        throw new Error('season_pass_claim_identity_changed');
      }
      if (input.seasonId !== currentSeasonId()) {
        throw new Error('season_pass_claim_season_changed');
      }
    };
    assertCurrent();
    if (input.side === 'pass') {
      const verifiedPlusAccess = await getVerifiedPremiumAccessStatusForAccountLease(
        input.token,
        lease,
      ).catch(() => false);
      assertCurrent();
      if (!verifiedPlusAccess) throw new Error('season_pass_claim_plus_required');
    }
    const reached = await authorizeSeasonPassClaimForAccount(
      input.token, input.seasonId, input.level, now, lease,
    );
    assertCurrent();
    if (!reached) throw new Error('season_pass_claim_level_not_reached');
    const entitled = await hydrateSeasonPassEntitlementForAccount(input.token, now, lease);
    assertCurrent();
    if (!entitled) throw new Error('season_pass_claim_entitlement_missing');

    const key = seasonPassClaimCompositeStorageKey(owner);
    const current = await readClaimCompositeForOwner(input.token, owner);
    assertCurrent();
    const id = `${input.seasonId}:${input.level}:${input.side}`;
    const existing = current.value.claims[id];
    if (existing) {
      return Object.freeze({ status: 'already-claimed' as const, gift: existing.gift });
    }
    const gift = normalizeRetiredTournamentTicket({
      id,
      kind: input.kind,
      amount: input.amount,
      level: input.level,
      receivedAtMs: now.getTime(),
      expiresAtMs: now.getTime() + GIFT_TTL_MS,
    });
    const next: SeasonPassClaimCompositeV1 = Object.freeze({
      ...current.value,
      claims: Object.freeze({
        ...current.value.claims,
        [id]: Object.freeze({
          seasonId: input.seasonId,
          level: input.level,
          side: input.side,
          gift,
        }),
      }),
    });
    try {
      await AsyncStorage.setItem(key, JSON.stringify(next));
      assertCurrent();
    } catch (error) {
      // A generation can be invalidated while the native write is in flight.
      // Account storage work waits on this lease, so restore the exact previous
      // owner value before allowing the transition to continue.
      try {
        if (current.raw === null) await AsyncStorage.removeItem(key);
        else await AsyncStorage.setItem(key, current.raw);
      } catch {
        throw new Error('season_pass_claim_rollback_failed');
      }
      throw error;
    }
    emitAppEvent('season_pass_gift_inventory_changed', undefined);
    return Object.freeze({ status: 'applied' as const, gift });
  }));
}

/** Помечает предмет использованным (кнопка «Применить») — эффект применяет вызывающий код. */
export async function markSeasonPassGiftUsed(id: string, nowMs: number = Date.now()): Promise<void> {
  void nowMs;
  const token = captureAccountGeneration();
  const owner = token.stableId?.trim();
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    throw new Error('season_gift_identity_not_ready');
  }
  await withAccountTransitionLock(() => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
    const items = await readOwnerInventory(token, owner);
    const next = items.filter((it) => it.id !== id);
    // The owner marker is the logical consumption authority. Persist it first:
    // a later inventory-prune failure may leave a hidden item, but never makes
    // a consumed gift usable again.
    await AsyncStorage.setItem(seasonPassGiftUseMarkerStorageKey(id, owner), '1');
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
    await writeOwnerInventory(owner, next);
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
    emitAppEvent('season_pass_gift_inventory_changed', undefined);
  }));
}

/**
 * Durable one-gift marker used by shard composite operations. The marker is
 * deliberately separate from the mutable inventory array: even if an older
 * inventory snapshot is restored after a crash, a consumed gift cannot become
 * claimable again.
 */
function legacySeasonPassGiftUseMarkerStorageKey(id: string): string {
  return `${USED_MARKER_PREFIX}${encodeURIComponent(String(id).trim())}`;
}

export function seasonPassGiftUseMarkerStorageKey(id: string, ownerStableId?: string): string {
  const owner = ownerStableId?.trim() || captureAccountGeneration().stableId?.trim() || '';
  if (!owner || owner.includes('/')) throw new Error('season_gift_identity_not_ready');
  return `${USED_MARKER_PREFIX}${encodeURIComponent(owner)}:${encodeURIComponent(String(id).trim())}`;
}

/** Exact local result committed in the same storage transaction as a pearl credit. */
export function prepareSeasonPassGiftUseLocalWrites(
  id: string,
): readonly (readonly [string, string])[] {
  const cleanId = String(id ?? '').trim();
  if (!cleanId) throw new Error('season_gift_id_required');
  const token = captureAccountGeneration();
  const owner = token.stableId?.trim();
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    throw new Error('season_gift_identity_not_ready');
  }
  // Marker-only is the logical removal. Writing a pre-read inventory snapshot
  // here would erase a gift added concurrently before the ledger commit.
  return [[seasonPassGiftUseMarkerStorageKey(cleanId, owner), '1']];
}

export type SeasonGiftEffectCommitResult = 'applied' | 'already-applied';

/**
 * Commit an incremental local gift effect and its logical-use marker under the
 * same account/storage lock. A crash may postpone physical inventory pruning,
 * but it can neither repeat the effect nor make the gift claimable again.
 */
export async function commitSeasonPassGiftEffect(
  id: string,
  buildWrites: () => Promise<readonly (readonly [string, string])[]>,
): Promise<SeasonGiftEffectCommitResult> {
  const cleanId = String(id ?? '').trim();
  if (!cleanId) throw new Error('season_gift_id_required');
  const token = captureAccountGeneration();
  const owner = token.stableId;
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    throw new Error('season_gift_identity_not_ready');
  }
  return withAccountTransitionLock(() => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
    const markerKey = seasonPassGiftUseMarkerStorageKey(cleanId, owner);
    if (await AsyncStorage.getItem(markerKey) === '1') return 'already-applied';
    const writes = await buildWrites();
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
    const seen = new Set<string>();
    const pairs: [string, string][] = [];
    for (const [key, value] of writes) {
      if (!key || typeof value !== 'string' || key === markerKey || seen.has(key)) {
        throw new Error('season_gift_invalid_effect_writes');
      }
      seen.add(key);
      pairs.push([key, value]);
    }
    pairs.push([markerKey, '1']);
    await AsyncStorage.multiSet(pairs);
    if (!isCurrentAccountGeneration(token, owner)) throw new Error('season_gift_identity_changed');
    if (await AsyncStorage.getItem(markerKey) !== '1') throw new Error('season_gift_effect_not_durable');
    return 'applied';
  }));
}
