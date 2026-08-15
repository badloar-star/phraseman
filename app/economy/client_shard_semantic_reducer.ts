import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AVATAR_AURA_OWNED_KEY,
  CUSTOM_AVATAR_OWNED_KEY,
} from '../../constants/customization_storage_keys';
import { flashcardsOwnedPacksKey, storageStudyTarget } from '../target_storage_keys';
import type { ClientShardGrant, ClientShardLocalWrite } from './client_shard_operation_ledger';

export const CLIENT_SHARD_SEMANTIC_PAID_PREFIX = 'client_shard_semantic_paid_v1:';

function semanticPaidKey(ownerStableId: string, kind: string, subjectId: string): string {
  return `${CLIENT_SHARD_SEMANTIC_PAID_PREFIX}${encodeURIComponent(ownerStableId)}:${kind}:${subjectId}`;
}

export async function markPortableClientShardGrantPaid(
  ownerStableId: string,
  grant: ClientShardGrant,
): Promise<void> {
  if (!isValidPortableClientShardGrant(grant)) return;
  await AsyncStorage.setItem(semanticPaidKey(ownerStableId, grant.kind, grant.subjectId), '1');
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function jsonObject(raw: string | null): Record<string, unknown> {
  try {
    return objectValue(raw ? JSON.parse(raw) : {});
  } catch {
    return {};
  }
}

/**
 * Closed cross-device materializer. It is called only while the account and
 * storage locks are held, so its read/merge/write cannot erase a concurrent
 * local purchase. Cloud data never chooses an AsyncStorage key.
 */
export async function reducePortableClientShardGrant(
  grant: ClientShardGrant,
  createdAtMs: number,
  ownerStableId: string,
): Promise<ClientShardSemanticReduction> {
  const payload = objectValue(grant.payload);
  const paidKey = semanticPaidKey(ownerStableId, grant.kind, grant.subjectId);
  if (await AsyncStorage.getItem(paidKey) === '1') {
    return { status: 'already-satisfied', writes: [] };
  }
  switch (grant.kind) {
    case 'official_card_pack': {
      const target = storageStudyTarget(payload.studyTarget === 'fr' ? 'fr' : 'en');
      const key = flashcardsOwnedPacksKey(target);
      const raw = await AsyncStorage.getItem(key);
      let owned: string[] = [];
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        owned = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
      } catch { owned = []; }
      if (owned.includes(grant.subjectId)) return { status: 'already-satisfied', writes: [[paidKey, '1']] };
      return { status: 'materialized', writes: [
        [key, JSON.stringify([...new Set([...owned, grant.subjectId])])],
        [paidKey, '1'],
      ] };
    }
    case 'custom_avatar':
    case 'avatar_aura': {
      const key = grant.kind === 'custom_avatar' ? CUSTOM_AVATAR_OWNED_KEY : AVATAR_AURA_OWNED_KEY;
      const owned = jsonObject(await AsyncStorage.getItem(key));
      const ownedValue = grant.kind === 'custom_avatar' ? String(payload.ownedValue ?? 'owned') : true;
      if (owned[grant.subjectId] !== undefined) return { status: 'already-satisfied', writes: [[paidKey, '1']] };
      return { status: 'materialized', writes: [
        [key, JSON.stringify({ ...owned, [grant.subjectId]: ownedValue })],
        [paidKey, '1'],
      ] };
    }
    case 'profile_card_level': {
      const level = Math.max(0, Math.min(5, Math.floor(Number(payload.level ?? grant.subjectId) || 0)));
      const current = Math.max(0, Math.floor(Number(await AsyncStorage.getItem('profile_card_level')) || 0));
      if (level === current) return { status: 'already-satisfied', writes: [[paidKey, '1']] };
      if (level < current) return { status: 'materialized', writes: [[paidKey, '1']] };
      const themes = ['classic', 'steel', 'teal', 'azure', 'crimson', 'platinum'];
      const coveredPriorLevels: ClientShardLocalWrite[] = Array.from(
        { length: current },
        (_, index) => [semanticPaidKey(ownerStableId, grant.kind, String(index + 1)), '1'] as const,
      );
      return { status: 'materialized', writes: [
        ['profile_card_level', String(level)],
        ['profile_card_theme', themes[level] ?? 'classic'],
        ['profile_card_motion', 'none'],
        ['profile_card_public_focus', 'balanced'],
        ...coveredPriorLevels,
        [paidKey, '1'],
      ] };
    }
    case 'season_pass': {
      const current = jsonObject(await AsyncStorage.getItem('season_pass_owned_v1'));
      // Season ids are YYYY-Qn, therefore lexical order is chronological and
      // also repairs legacy rows whose purchasedAt was stored as zero.
      const currentSeasonId = String(current.seasonId ?? '');
      if (currentSeasonId === grant.subjectId) return { status: 'already-satisfied', writes: [[paidKey, '1']] };
      if (currentSeasonId > grant.subjectId) return { status: 'materialized', writes: [[paidKey, '1']] };
      return { status: 'materialized', writes: [
        ['season_pass_owned_v1', JSON.stringify({ seasonId: grant.subjectId, purchasedAt: createdAtMs })],
        ...(currentSeasonId ? [[semanticPaidKey(ownerStableId, grant.kind, currentSeasonId), '1'] as const] : []),
        [paidKey, '1'],
      ] };
    }
    default:
      return { status: 'unsupported', writes: [] };
  }
}

export type ClientShardSemanticReduction = Readonly<{
  status: 'materialized' | 'already-satisfied' | 'unsupported';
  writes: readonly ClientShardLocalWrite[];
}>;

/**
 * Local business precondition + result materializer. The caller guarantees
 * that this runs inside the same owner/storage lock as the eventual debit.
 */
export async function reduceClientShardGrant(
  grant: ClientShardGrant,
  createdAtMs: number,
  requestedWrites: readonly ClientShardLocalWrite[],
  ownerStableId: string,
): Promise<ClientShardSemanticReduction> {
  if (isPortableClientShardGrantKind(grant.kind)) {
    return reducePortableClientShardGrant(grant, createdAtMs, ownerStableId);
  }
  const payload = objectValue(grant.payload);
  switch (grant.kind) {
    case 'custom_avatar_restyle': {
      const owned = jsonObject(await AsyncStorage.getItem(CUSTOM_AVATAR_OWNED_KEY));
      const desired = String(payload.ownedValue ?? '');
      if (desired && owned[grant.subjectId] === desired) return { status: 'already-satisfied', writes: [] };
      if (!desired) return { status: 'unsupported', writes: [] };
      const auxiliary = requestedWrites.filter(([key]) => key !== CUSTOM_AVATAR_OWNED_KEY);
      return {
        status: 'materialized',
        writes: [
          [CUSTOM_AVATAR_OWNED_KEY, JSON.stringify({ ...owned, [grant.subjectId]: desired })],
          ...auxiliary,
        ],
      };
    }
    case 'energy_refill': {
      const desired = Math.max(0, Math.floor(Number(payload.current) || 0));
      const raw = await AsyncStorage.getItem('energy_state');
      const current = jsonObject(raw);
      if (Number(current.current) >= desired) return { status: 'already-satisfied', writes: [] };
      const lastRecoveryTime = Number.isFinite(Number(current.lastRecoveryTime))
        ? Number(current.lastRecoveryTime)
        : createdAtMs;
      return {
        status: 'materialized',
        writes: [['energy_state', JSON.stringify({ current: desired, lastRecoveryTime })]],
      };
    }
    case 'streak_freeze': {
      const current = jsonObject(await AsyncStorage.getItem('streak_freeze'));
      if (current.active === true) return { status: 'already-satisfied', writes: [] };
      return {
        status: 'materialized',
        writes: [['streak_freeze', JSON.stringify({ active: true, date: grant.subjectId })]],
      };
    }
    case 'personal_league_boost': {
      const current = jsonObject(await AsyncStorage.getItem('league_personal_boost_v1'));
      if (current.expiresAt && Number(current.expiresAt) > Date.now()) {
        return { status: 'already-satisfied', writes: [] };
      }
      const expiresAt = Number(payload.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= createdAtMs) return { status: 'unsupported', writes: [] };
      return { status: 'materialized', writes: [['league_personal_boost_v1', JSON.stringify(payload)]] };
    }
    case 'streak_wager': {
      const current = jsonObject(await AsyncStorage.getItem('streak_wager_v2'));
      if (current.active === true) return { status: 'already-satisfied', writes: [] };
      const wager = objectValue(payload.wager);
      if (wager.active !== true || String(wager.startDate ?? '') !== grant.subjectId.split(':')[0]) {
        return { status: 'unsupported', writes: [] };
      }
      const writes: ClientShardLocalWrite[] = [['streak_wager_v2', JSON.stringify(wager)]];
      if (payload.consumeLegacyPremiumToken === true) {
        writes.push(['premium_wager_free_after_levelup_v1', '0']);
        writes.push(['premium_wager_free_month_issued_v1', '0']);
      }
      if (payload.consumeGiftDiscount === true) {
        const parsedUses = Number.parseInt(String(await AsyncStorage.getItem('wager_discount_uses_v1') ?? ''), 10);
        const remainingUses = Math.max(Number.isFinite(parsedUses) ? parsedUses : 0, 1) - 1;
        writes.push(['wager_discount', remainingUses > 0 ? '0.25' : '0']);
        writes.push(['wager_discount_uses_v1', String(remainingUses)]);
      }
      return { status: 'materialized', writes };
    }
    case 'streak_revive': {
      const current = jsonObject(await AsyncStorage.getItem('streak_revive_v1'));
      if (String(current.lostAt ?? '') !== grant.subjectId) return { status: 'unsupported', writes: [] };
      if (current.used === true) return { status: 'already-satisfied', writes: [] };
      const restoredStreak = Math.max(0, Math.floor(Number(payload.restoredStreak) || 0));
      const lastActiveDate = String(payload.lastActiveDate ?? '');
      if (!restoredStreak || !/^\d{4}-\d{2}-\d{2}$/.test(lastActiveDate)) {
        return { status: 'unsupported', writes: [] };
      }
      return {
        status: 'materialized',
        writes: [
          ['streak_count', String(restoredStreak)],
          ['last_active_date', lastActiveDate],
          ['streak_revive_v1', JSON.stringify({ ...current, used: true })],
        ],
      };
    }
    default:
      return { status: 'unsupported', writes: [] };
  }
}

/** Only durable, monotonic entitlements participate in another device's balance projection. */
export function isPortableClientShardGrantKind(kind: string): boolean {
  return new Set([
    'official_card_pack',
    'custom_avatar',
    'avatar_aura',
    'profile_card_level',
    'season_pass',
  ]).has(kind);
}

/** Full per-kind boundary: a recognized name with malformed payload is not portable. */
export function isValidPortableClientShardGrant(grant: ClientShardGrant): boolean {
  if (!isPortableClientShardGrantKind(grant.kind)) return false;
  if (!/^[A-Za-z0-9_.:-]{1,160}$/.test(grant.subjectId)) return false;
  const payload = objectValue(grant.payload);
  switch (grant.kind) {
    case 'official_card_pack':
      return payload.studyTarget === 'en' || payload.studyTarget === 'fr';
    case 'custom_avatar':
      return typeof payload.ownedValue === 'string' && payload.ownedValue.length > 0 && payload.ownedValue.length <= 160;
    case 'avatar_aura':
      return true;
    case 'profile_card_level': {
      const level = Number(payload.level ?? grant.subjectId);
      return Number.isSafeInteger(level) && level >= 1 && level <= 5 && String(level) === grant.subjectId;
    }
    case 'season_pass':
      return /^\d{4}-Q[1-4]$/.test(grant.subjectId) && payload.seasonId === grant.subjectId;
    default:
      return false;
  }
}
