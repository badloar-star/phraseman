// ════════════════════════════════════════════════════════════════════════════
// season_reward_apply.ts — единый применитель наград Season Pass.
// зачем: владелец, 2026-08-03 — «все подарки должны быть работающими, никаких
// „скоро заработает“». Каждый kind ниже дёргает НАСТОЯЩИЙ эффект через уже
// существующие механики приложения; серверные (дни Plus, магнит, билет) идут
// через callable seasonClaimReward/seasonRedeemConsumable (functions/src/season_pass.ts).
//
// Optimistic-контракт: локальные эффекты применяются мгновенно; серверные
// возвращают pending=false только после подтверждения, у вызывающих модалок
// есть явные состояния «применяю…» и откат-тост при ошибке.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getEffectiveMaxEnergyValue } from './energy_system';
import { getEnergyRecoveryIntervalMs } from './remote_flags';
import { reviveStreak } from './streak_revive';
import { addOwnedPackId } from './flashcards/marketplace';
import { unlockRandomCustomAvatarGift, type GiftCosmeticUnlock } from './level_gift_system';
import { commitShardCreditOperation } from './shards_system';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { prepareVipSnapshotWritesForAccount, readVipSnapshotForAccount } from './premium_vip_storage';
import { emitAppEvent } from './events';
import {
  grantSeasonAuraStage,
  grantSeasonFinale,
  grantSeasonFrame,
  grantSeasonNickColor,
  grantSeasonSecretAura,
  grantSeasonTitle,
  SEASON_COSMETICS_KEY,
  SEASON1_TITLE,
} from './season_cosmetics';
import type { SeasonReward } from './season_pass_track_config';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { ENABLE_TOURNAMENTS } from './config';
import {
  commitSeasonPassGiftEffect,
  markSeasonPassGiftUsed,
  prepareSeasonPassGiftUseLocalWrites,
} from './season_pass_gift_inventory';

/** Пак сезона 1 — фирменный набор, открывается навсегда (каталог §6, ур. 45). */
export const SEASON1_CARD_PACK_ID = 'official_peaky_blinders_en';

export const SEASON_GOLDEN_LESSON_KEY = 'season_golden_lesson_v1';
export interface SeasonGoldenLessonState { multiplier: number; remaining: number; grantedAtMs: number }

const GIFT_XP_BANK_KEY = 'gift_xp_bank_v1';
export const SEASON_COLLECTION_MAGNET_KEY = 'season_collection_magnet_v1';
export const SEASON_TOURNAMENT_TICKET_KEY = 'season_tournament_ticket_v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const ENERGY_STORAGE_KEY = 'energy_state';
const BOON_ENERGY_OVERRIDE_KEY = 'boon_energy_override_v1';
const LEAGUE_PERSONAL_BOOST_KEY = 'league_personal_boost_v1';
const CLUB_GIFT_FREE_BOOST_KEY = 'club_gift_free_boost_v1';
const CHAIN_SHIELD_KEY = 'chain_shield';

function parseObject(raw: string | null): Record<string, unknown> {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

async function commitIncrementalSeasonGift(
  giftId: string | undefined,
  buildWrites: () => Promise<readonly (readonly [string, string])[]>,
  afterCommit?: () => void,
): Promise<ApplySeasonRewardResult> {
  const id = String(giftId ?? '').trim();
  if (!id) return { ok: false, failReason: 'unknown' };
  await commitSeasonPassGiftEffect(id, buildWrites);
  await markSeasonPassGiftUsed(id).catch(() => {});
  afterCommit?.();
  return { ok: true };
}

const syncSeasonCosmeticsBestEffort = (publicDisplayChanged = false): void => {
  if (publicDisplayChanged) void syncPublicProfileSnapshot({ reason: 'display_change' }).catch(() => {});
  // Lazy import avoids cloud_sync -> xp_manager -> season_reward_apply -> cloud_sync.
  void import('./cloud_sync')
    .then(({ syncToCloud }) => syncToCloud({ forceNow: true }))
    .catch(() => {});
};

export interface ApplySeasonRewardResult {
  ok: boolean;
  /** Эффект требует серверного подтверждения — модалка показывает «применяю…». */
  pendingServer?: boolean;
  /** Выданный кастомный аватар (для превью в модалке). */
  avatarUnlock?: GiftCosmeticUnlock | null;
  failReason?: 'no_streak_gap' | 'network' | 'unknown';
}

/** Прочитать и атомарно потратить заряд «Золотого урока» — вызывается из xp_manager. */
export async function consumeSeasonGoldenLessonMultiplier(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SEASON_GOLDEN_LESSON_KEY);
    if (!raw) return 1;
    const parsed = JSON.parse(raw) as Partial<SeasonGoldenLessonState>;
    const remaining = Math.max(0, Math.floor(Number(parsed.remaining) || 0));
    if (remaining <= 0) return 1;
    await AsyncStorage.setItem(SEASON_GOLDEN_LESSON_KEY, JSON.stringify({ /* guard-ok: декремент заряда расходника при использовании (как remainingUses у xp_boost сундука лиги), не баланс юзера */
      multiplier: 3, remaining: remaining - 1, grantedAtMs: Number(parsed.grantedAtMs) || Date.now(),
    }));
    return Math.max(1, Math.floor(Number(parsed.multiplier) || 3));
  } catch {
    return 1;
  }
}

export async function peekSeasonGoldenLessonCharges(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SEASON_GOLDEN_LESSON_KEY);
    if (!raw) return 0;
    return Math.max(0, Math.floor(Number((JSON.parse(raw) as SeasonGoldenLessonState).remaining) || 0));
  } catch {
    return 0;
  }
}

/**
 * Применить награду локально. Инкрементальные эффекты фиксируются
 * вместе с durable gift marker под account/storage lock; сервер их не разрешает
 * и не изменяет.
 */
export async function applySeasonRewardLocal(
  reward: SeasonReward,
  idempotencyKey?: string,
): Promise<ApplySeasonRewardResult> {
  switch (reward.kind) {
    case 'pearls': {
      const giftId = String(idempotencyKey ?? '').trim();
      const amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
      if (!giftId || amount <= 0) return { ok: false, failReason: 'unknown' };
      const eventHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `season-pass-reward:${giftId}`,
      );
      const localWrites = prepareSeasonPassGiftUseLocalWrites(giftId);
      const result = await commitShardCreditOperation({
        operationId: `season-reward:${eventHash.slice(0, 40)}`,
        amount,
        reason: 'season_pass_pearls',
        grant: {
          kind: 'season_pass_reward',
          subjectId: eventHash.slice(0, 40),
          payload: { giftId, rewardKind: 'pearls', amount },
        },
        localWrites,
      });
      const ok = result.status === 'applied' || result.status === 'already-applied';
      if (ok) await markSeasonPassGiftUsed(giftId).catch(() => {});
      return {
        ok,
        ...(ok
          ? {}
          : { failReason: 'unknown' as const }),
      };
    }
    case 'battery':
      return commitIncrementalSeasonGift(idempotencyKey, async () => {
        const nowMs = Date.now();
        return [[ENERGY_STORAGE_KEY, JSON.stringify({
          current: await getEffectiveMaxEnergyValue(),
          lastRecoveryTime: nowMs,
        })]];
      });
    case 'turbo_regen':
      return commitIncrementalSeasonGift(idempotencyKey, async () => {
        const base = getEnergyRecoveryIntervalMs();
        const recoveryMs = Math.max(1000, Math.floor(base / 2));
        const now = new Date();
        const expiresAt = Date.UTC(
          now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0,
        );
        return [[BOON_ENERGY_OVERRIDE_KEY, JSON.stringify({ expiresAt, recoveryMs })]];
      });
    case 'league_boost':
      return commitIncrementalSeasonGift(idempotencyKey, async () => {
        const nowMs = Date.now();
        const now = new Date(nowMs);
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        return [[LEAGUE_PERSONAL_BOOST_KEY, JSON.stringify({
          id: 'x2_eod_pass', multiplier: 2, startedAt: nowMs,
          expiresAt: Math.max(nowMs + 60_000, midnight.getTime()),
        })]];
      });
    case 'club_totem': {
      return commitIncrementalSeasonGift(idempotencyKey, async () => {
        const current = Math.max(0, Number.parseInt(
          await AsyncStorage.getItem(CLUB_GIFT_FREE_BOOST_KEY) ?? '', 10,
        ) || 0);
        return [[CLUB_GIFT_FREE_BOOST_KEY, String(current + 1)]];
      });
    }
    case 'golden_lesson':
      return commitIncrementalSeasonGift(idempotencyKey, async () => {
        const parsed = parseObject(await AsyncStorage.getItem(SEASON_GOLDEN_LESSON_KEY));
        const remaining = Math.max(0, Math.floor(Number(parsed.remaining) || 0)) + 1;
        return [[SEASON_GOLDEN_LESSON_KEY, JSON.stringify({
          multiplier: 3, remaining, grantedAtMs: Date.now(),
        })]];
      });
    case 'xp_bank':
      return commitIncrementalSeasonGift(idempotencyKey, async () => {
        const parsed = parseObject(await AsyncStorage.getItem(GIFT_XP_BANK_KEY));
        const amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
        return [[GIFT_XP_BANK_KEY, JSON.stringify({
          ...parsed,
          remaining: Math.max(0, Math.floor(Number(parsed.remaining) || 0)) + amount,
          grantedTotal: Math.max(0, Math.floor(Number(parsed.grantedTotal) || 0)) + amount,
          updatedAt: Date.now(),
        })]];
      });
    case 'time_machine': {
      const res = await reviveStreak({ free: true });
      if (res.ok) return { ok: true };
      return { ok: false, failReason: res.reason === 'no_offer' ? 'no_streak_gap' : 'unknown' };
    }
    case 'card_pack':
      await addOwnedPackId(SEASON1_CARD_PACK_ID);
      return { ok: true };
    case 'custom_avatar': {
      const token = captureAccountGeneration();
      const unlock = await unlockRandomCustomAvatarGift(
        token,
        idempotencyKey ? {
          idempotencyKey: `season:${idempotencyKey}`,
          counterStorageKey: SEASON_COSMETICS_KEY,
        } : undefined,
      );
      syncSeasonCosmeticsBestEffort();
      return { ok: true, avatarUnlock: unlock };
    }
    case 'frame':
      await grantSeasonFrame();
      syncSeasonCosmeticsBestEffort(true);
      return { ok: true };
    case 'nick_color':
      await grantSeasonNickColor();
      await grantSeasonTitle(SEASON1_TITLE);
      syncSeasonCosmeticsBestEffort();
      return { ok: true };
    case 'aura_stage':
      await grantSeasonAuraStage(Math.max(1, Math.min(4, reward.amount ?? 1)));
      syncSeasonCosmeticsBestEffort(true);
      return { ok: true };
    case 'aura_secret':
      await grantSeasonSecretAura('purple_vortex');
      syncSeasonCosmeticsBestEffort(true);
      return { ok: true };
    case 'season_finale':
      await grantSeasonFinale();
      syncSeasonCosmeticsBestEffort(true);
      return { ok: true };
    case 'collection_magnet':
      return commitIncrementalSeasonGift(idempotencyKey, async () => {
        const nowMs = Date.now();
        const parsed = parseObject(await AsyncStorage.getItem(SEASON_COLLECTION_MAGNET_KEY));
        const existingExpiry = Math.max(0, Number(parsed.expiresAt) || 0);
        return [[SEASON_COLLECTION_MAGNET_KEY, JSON.stringify({
          multiplier: 2,
          activatedAt: nowMs,
          expiresAt: Math.max(nowMs, existingExpiry) + DAY_MS,
        })]];
      });
    case 'tournament_ticket':
      if (!ENABLE_TOURNAMENTS) {
        // Legacy/offline ticket claims keep their value but cannot resurrect a
        // retired tournament entry point or create active ticket state.
        return applySeasonRewardLocal({ kind: 'pearls', amount: 5 }, idempotencyKey);
      }
      return commitIncrementalSeasonGift(idempotencyKey, async () => {
        const nowMs = Date.now();
        const parsed = parseObject(await AsyncStorage.getItem(SEASON_TOURNAMENT_TICKET_KEY));
        return [[SEASON_TOURNAMENT_TICKET_KEY, JSON.stringify({
          usesLeft: Math.max(0, Math.floor(Number(parsed.usesLeft) || 0)) + 1,
          expiresAt: Math.max(nowMs, Math.max(0, Number(parsed.expiresAt) || 0)) + 3 * DAY_MS,
        })]];
      });
    case 'plus_days':
      return commitIncrementalSeasonGift(idempotencyKey, async () => {
        const token = captureAccountGeneration();
        const stableId = token.stableId;
        if (!stableId || !isCurrentAccountGeneration(token, stableId)) {
          throw new Error('season_plus_identity_not_ready');
        }
        const nowMs = Date.now();
        const existing = await readVipSnapshotForAccount(stableId);
        if (!isCurrentAccountGeneration(token, stableId)) throw new Error('season_plus_identity_changed');
        const previousUntil = Math.max(0, Number(existing?.vip_until) || 0);
        const untilMs = Math.max(nowMs, previousUntil)
          + Math.max(1, Math.floor(Number(reward.amount) || 1)) * DAY_MS;
        return prepareVipSnapshotWritesForAccount(stableId, {
          vip_active: 'true',
          vip_plan: 'season_pass',
          vip_from: String(nowMs),
          vip_until: String(untilMs),
          vip_admin_override: 'true',
          vip_admin_grant_at: String(nowMs),
        });
      }, () => {
        emitAppEvent('vip_activated');
        emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
      });
    case 'friend_shield': {
      return commitIncrementalSeasonGift(idempotencyKey, async () => {
        const parsed = parseObject(await AsyncStorage.getItem(CHAIN_SHIELD_KEY));
        return [[CHAIN_SHIELD_KEY, JSON.stringify({
          daysLeft: Math.max(0, Math.floor(Number(parsed.daysLeft) || 0)) + 1,
          grantedAt: new Date().toISOString().slice(0, 10),
        })]];
      });
    }
    case 'choice_3':
      // Выбор делает модалка: выбранный вариант применяется отдельным вызовом.
      return { ok: true };
    default:
      return { ok: false, failReason: 'unknown' };
  }
}
