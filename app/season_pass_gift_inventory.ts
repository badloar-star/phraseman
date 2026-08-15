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
} from './account_generation';
import type { SeasonRewardKind } from './season_pass_track_config';
import { ENABLE_TOURNAMENTS } from './config';

export const SEASON_PASS_GIFT_INVENTORY_STORAGE_KEY = 'season_pass_gift_inventory_v1';
const USED_MARKER_PREFIX = 'season_pass_gift_used_v1:';
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

async function readAll(): Promise<SeasonPassGiftItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SEASON_PASS_GIFT_INVENTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((it): it is SeasonPassGiftItem =>
      it && typeof it === 'object' && typeof it.id === 'string' && typeof it.expiresAtMs === 'number');
  } catch (error) {
    throw error;
    return [];
  }
}

async function writeAll(items: SeasonPassGiftItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SEASON_PASS_GIFT_INVENTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Best effort — как во всех остальных подарочных инвентарях приложения.
  }
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
  const storedItems = await readAll();
  const items = storedItems.map(normalizeRetiredTournamentTicket);
  const alive = await filterAvailableSeasonPassGifts(items, nowMs);
  const migratedRetiredTicket = items.some((item, index) => item !== storedItems[index]);
  if (alive.length !== items.length || migratedRetiredTicket) {
    // Re-read under the inventory lock before physical cleanup. Persisting the
    // stale snapshot above could erase a gift concurrently added by another flow.
    await withStorageLock(async () => {
      const latestStored = await readAll();
      const latest = latestStored.map(normalizeRetiredTournamentTicket);
      await writeAll(await filterAvailableSeasonPassGifts(latest, nowMs));
    });
  }
  return alive.slice().sort((a, b) => a.expiresAtMs - b.expiresAtMs);
}

async function filterAvailableSeasonPassGifts(
  items: readonly SeasonPassGiftItem[],
  nowMs: number,
): Promise<SeasonPassGiftItem[]> {
  const usedMarkers = await AsyncStorage.multiGet(
    items.map((item) => seasonPassGiftUseMarkerStorageKey(item.id)),
  );
  const usedIds = new Set(
    usedMarkers.flatMap(([, value], index) => value === '1' ? [items[index]?.id] : [])
      .filter((id): id is string => typeof id === 'string'),
  );
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
  return withStorageLock(async () => {
    const id = `${seasonId}:${level}:${side}`;
    const items = await readAll();
    const existing = items.find((it) => it.id === id);
    if (existing) {
      const normalized = normalizeRetiredTournamentTicket(existing);
      if (normalized !== existing) {
        await writeAll(items.map((item) => item.id === id ? normalized : item));
      }
      return normalized;
    }
    const item = normalizeRetiredTournamentTicket({
      id, kind, amount, level, receivedAtMs: nowMs, expiresAtMs: nowMs + GIFT_TTL_MS,
    });
    await writeAll([...items, item]);
    return item;
  });
}

/** Помечает предмет использованным (кнопка «Применить») — эффект применяет вызывающий код. */
export async function markSeasonPassGiftUsed(id: string, nowMs: number = Date.now()): Promise<void> {
  void nowMs;
  await withStorageLock(async () => {
    const items = await readAll();
    const next = items.filter((it) => it.id !== id);
    await AsyncStorage.multiSet([
      [SEASON_PASS_GIFT_INVENTORY_STORAGE_KEY, JSON.stringify(next)],
      [seasonPassGiftUseMarkerStorageKey(id), '1'],
    ]);
    emitAppEvent('season_pass_gift_inventory_changed', undefined);
  });
}

/**
 * Durable one-gift marker used by shard composite operations. The marker is
 * deliberately separate from the mutable inventory array: even if an older
 * inventory snapshot is restored after a crash, a consumed gift cannot become
 * claimable again.
 */
export function seasonPassGiftUseMarkerStorageKey(id: string): string {
  return `${USED_MARKER_PREFIX}${encodeURIComponent(String(id).trim())}`;
}

/** Exact local result committed in the same storage transaction as a pearl credit. */
export function prepareSeasonPassGiftUseLocalWrites(
  id: string,
): readonly (readonly [string, string])[] {
  const cleanId = String(id ?? '').trim();
  if (!cleanId) throw new Error('season_gift_id_required');
  // Marker-only is the logical removal. Writing a pre-read inventory snapshot
  // here would erase a gift added concurrently before the ledger commit.
  return [[seasonPassGiftUseMarkerStorageKey(cleanId), '1']];
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
    const markerKey = seasonPassGiftUseMarkerStorageKey(cleanId);
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
