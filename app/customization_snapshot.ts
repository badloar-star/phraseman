import {
  AVATAR_AURA_GIFT_OWNED_KEY,
  AVATAR_AURA_OWNED_KEY,
  CUSTOM_AVATAR_GIFT_OWNED_KEY,
  CUSTOM_AVATAR_OWNED_KEY,
  USER_AVATAR_AURA_KEY,
} from '../constants/customization_storage_keys';
import type { AppSnapshot } from './app_snapshot_store';

export type OwnedAvatars = Record<string, string>;
export type OwnedAuras = Record<string, true>;

export interface CustomizationSnapshot {
  source: 'storage' | 'memory' | 'local';
  updatedAt: number;
  activeAvatar: string;
  storedAuraSelection: string | null;
  totalXp: number;
  level: number;
  shards: number;
  ownedAvatars: OwnedAvatars;
  ownedAuras: OwnedAuras;
  giftedAvatarId: string | null;
  giftedAuraId: string | null;
}

export interface CustomizationInitialState {
  confirmed: CustomizationSnapshot;
  previewAvatarValue: string;
  previewStoredAuraSelection: string | null;
  shards: number;
  ownedAvatars: OwnedAvatars;
  ownedAuras: OwnedAuras;
}

function readNonNegativeInt(raw: string | null | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function nonEmpty(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  return value ? value : null;
}

function parseRecord(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function parseOwnedAvatars(raw: string | null | undefined): OwnedAvatars {
  const record = parseRecord(raw);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).filter(([key, value]) => key.trim().length > 0 && typeof value === 'string' && value.trim().length > 0),
  ) as OwnedAvatars;
}

function parseOwnedAuras(raw: string | null | undefined): OwnedAuras {
  const record = parseRecord(raw);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).filter(([key, value]) => key.trim().length > 0 && value === true),
  ) as OwnedAuras;
}

export function normalizeStoredAuraSelection(raw: string | null | undefined): string | null {
  return nonEmpty(raw);
}

export function buildCustomizationSnapshot(
  values: ReadonlyMap<string, string | null>,
  updatedAt: number,
  level: number,
): CustomizationSnapshot {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return {
    source: 'storage',
    updatedAt,
    activeAvatar: values.get('user_avatar')?.trim() || String(Math.min(60, safeLevel)),
    storedAuraSelection: normalizeStoredAuraSelection(values.get(USER_AVATAR_AURA_KEY)),
    totalXp: readNonNegativeInt(values.get('user_total_xp')),
    level: safeLevel,
    shards: readNonNegativeInt(values.get('shards_balance')),
    ownedAvatars: parseOwnedAvatars(values.get(CUSTOM_AVATAR_OWNED_KEY)),
    ownedAuras: parseOwnedAuras(values.get(AVATAR_AURA_OWNED_KEY)),
    giftedAvatarId: nonEmpty(values.get(CUSTOM_AVATAR_GIFT_OWNED_KEY)),
    giftedAuraId: nonEmpty(values.get(AVATAR_AURA_GIFT_OWNED_KEY)),
  };
}

function stableRecord(record: Record<string, unknown>): string {
  return JSON.stringify(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

export function customizationSnapshotsEqual(
  a: CustomizationSnapshot,
  b: CustomizationSnapshot,
): boolean {
  return a.activeAvatar === b.activeAvatar
    && a.storedAuraSelection === b.storedAuraSelection
    && a.totalXp === b.totalXp
    && a.level === b.level
    && a.shards === b.shards
    && a.giftedAvatarId === b.giftedAvatarId
    && a.giftedAuraId === b.giftedAuraId
    && stableRecord(a.ownedAvatars) === stableRecord(b.ownedAvatars)
    && stableRecord(a.ownedAuras) === stableRecord(b.ownedAuras);
}

export function createCustomizationFallback(snapshot: Readonly<AppSnapshot>): CustomizationSnapshot {
  const profile = snapshot.profile;
  const progress = snapshot.progress;
  const level = Math.max(1, profile?.level ?? 1);
  return {
    source: 'memory',
    updatedAt: Math.max(profile?.updatedAt ?? 0, progress?.updatedAt ?? 0),
    activeAvatar: profile?.avatar || String(Math.min(60, level)),
    storedAuraSelection: profile?.aura?.trim() || null,
    totalXp: profile?.totalXp ?? 0,
    level,
    shards: progress?.shards ?? 0,
    ownedAvatars: {},
    ownedAuras: {},
    giftedAvatarId: null,
    giftedAuraId: null,
  };
}

export function createCustomizationInitialState(snapshot: Readonly<AppSnapshot>): CustomizationInitialState {
  const confirmed = snapshot.customization ?? createCustomizationFallback(snapshot);
  return {
    confirmed,
    previewAvatarValue: confirmed.activeAvatar,
    previewStoredAuraSelection: confirmed.storedAuraSelection,
    shards: confirmed.shards,
    ownedAvatars: confirmed.ownedAvatars,
    ownedAuras: confirmed.ownedAuras,
  };
}

export async function revalidateCustomizationSnapshot(
  current: CustomizationSnapshot,
  load: () => Promise<CustomizationSnapshot>,
  publish: (fresh: CustomizationSnapshot) => void,
): Promise<void> {
  const fresh = await load();
  if (!customizationSnapshotsEqual(current, fresh)) publish(fresh);
}
