import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CUSTOM_AVATARS,
  CUSTOM_AVATAR_OWNED_KEY,
  type CustomAvatarDef,
} from '../constants/custom_avatars';

type OwnedCustomAvatars = Readonly<Record<string, string>>;

export type SpinCustomAvatarGiftPoolRead =
  | Readonly<{ status: 'available'; candidates: readonly CustomAvatarDef[] }>
  | Readonly<{ status: 'unavailable'; reason: 'read_failed' | 'malformed' }>;

const isValidOwnedCustomAvatarRecord = (value: unknown): value is Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, ownedStyle]) => (
    key.trim().length > 0
    && key.length <= 160
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(key)
    && typeof ownedStyle === 'string'
    && ownedStyle.trim().length > 0
  ));
};

const spinAvatarIndex = (id: string): number | null => {
  const match = /^custom-gen-(\d{2,3})$/.exec(id);
  if (!match) return null;
  const index = Number(match[1]);
  if (!Number.isInteger(index) || index < 1 || index > 125) return null;
  return id === `custom-gen-${String(index).padStart(2, '0')}` ? index : null;
};

/**
 * Spin-only pool approved by the owner: every generated avatar 01..125.
 * Legacy `custom-01..35` entries are intentionally excluded.
 */
export const SPIN_CUSTOM_AVATAR_GIFT_POOL: readonly CustomAvatarDef[] = Object.freeze(
  CUSTOM_AVATARS
    .filter((avatar) => spinAvatarIndex(avatar.id) !== null)
    .sort((left, right) => spinAvatarIndex(left.id)! - spinAvatarIndex(right.id)!),
);

/**
 * Integer selection weights within the avatar prize.
 *
 * 31..40 retain their historical 0.35 relative rarity. Store avatars costing
 * 300/500/1000 remain winnable, but are progressively less likely than the
 * 90/100/150 shelf. Integers keep the draw deterministic and auditable.
 */
export function getSpinCustomAvatarGiftWeight(
  avatar: Pick<CustomAvatarDef, 'id' | 'price'>,
): number {
  const index = spinAvatarIndex(avatar.id);
  if (index !== null && index >= 31 && index <= 40) return 35;
  const price = Math.max(0, Number(avatar.price) || 0);
  if (price >= 1_000) return 5;
  if (price >= 500) return 15;
  if (price >= 300) return 35;
  return 100;
}

export function listSpinCustomAvatarGiftCandidates(
  owned: OwnedCustomAvatars,
): CustomAvatarDef[] {
  return SPIN_CUSTOM_AVATAR_GIFT_POOL.filter((avatar) => !owned[avatar.id]);
}

export async function loadSpinCustomAvatarGiftCandidates(): Promise<SpinCustomAvatarGiftPoolRead> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(CUSTOM_AVATAR_OWNED_KEY);
  } catch {
    return { status: 'unavailable', reason: 'read_failed' };
  }
  if (raw === null) {
    return { status: 'available', candidates: listSpinCustomAvatarGiftCandidates({}) };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidOwnedCustomAvatarRecord(parsed)) {
      return { status: 'unavailable', reason: 'malformed' };
    }
    return {
      status: 'available',
      candidates: listSpinCustomAvatarGiftCandidates(parsed),
    };
  } catch {
    // Never treat corrupt ownership as empty: the apply path intentionally
    // refuses to overwrite it, so selecting avatar here would deadlock the
    // active receipt on every retry.
    return { status: 'unavailable', reason: 'malformed' };
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
