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
import type { SeasonRewardKind } from './season_pass_track_config';
import { ENABLE_TOURNAMENTS } from './config';

const STORAGE_KEY = 'season_pass_gift_inventory_v1';
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
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
  const alive = items.filter((it) => it.expiresAtMs > nowMs);
  const migratedRetiredTicket = items.some((item, index) => item !== storedItems[index]);
  if (alive.length !== items.length || migratedRetiredTicket) {
    // Просроченные предметы физически сгорели — чистим тихо при следующем чтении,
    // не дожидаясь явного действия юзера (тот же паттерн, что level_gift_inventory).
    await writeAll(alive);
  }
  return alive.slice().sort((a, b) => a.expiresAtMs - b.expiresAtMs);
}

export async function loadPendingSeasonPassGiftCount(nowMs: number = Date.now()): Promise<number> {
  const items = await loadSeasonPassGiftInventory(nowMs);
  return items.filter((it) => !it.usedAtMs).length;
}

/**
 * Кладёт подарок в инвентарь по факту клейма уровня. Идемпотентно по `id`:
 * повторный вызов с тем же level/kind не создаёт дубль (защита от двойного
 * тапа — та же гарантия, что claimTaskWithReward даёт для заданий дня).
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
  await withStorageLock(async () => {
    const items = await readAll();
    const next = items.filter((it) => it.id !== id);
    await writeAll(next);
  });
}
