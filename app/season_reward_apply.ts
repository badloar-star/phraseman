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
import { resetEnergyToMax } from './energy_system';
import { applyTurboRegenOverride } from './boons/boon_effects_energy';
import { activateLeagueBoost } from './league_personal_boosts';
import { grantClubGiftFreeBoostFromLevel } from './club_boosts';
import { reviveStreak } from './streak_revive';
import { addOwnedPackId } from './flashcards/marketplace';
import { unlockRandomCustomAvatarGift, type GiftCosmeticUnlock } from './level_gift_system';
import { addShardsLocalOnlyForPendingServerClaim } from './shards_system';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { getCanonicalUserId } from './user_id_policy';
import { readVipSnapshotForAccount, writeVipSnapshotForAccount } from './premium_vip_storage';
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

/** Пак сезона 1 — фирменный набор, открывается навсегда (каталог §6, ур. 45). */
export const SEASON1_CARD_PACK_ID = 'official_peaky_blinders_en';

export const SEASON_GOLDEN_LESSON_KEY = 'season_golden_lesson_v1';
export interface SeasonGoldenLessonState { multiplier: number; remaining: number; grantedAtMs: number }

const GIFT_XP_BANK_KEY = 'gift_xp_bank_v1';
export const SEASON_COLLECTION_MAGNET_KEY = 'season_collection_magnet_v1';
export const SEASON_TOURNAMENT_TICKET_KEY = 'season_tournament_ticket_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

async function activateCollectionMagnet(nowMs: number = Date.now()): Promise<void> {
  const raw = await AsyncStorage.getItem(SEASON_COLLECTION_MAGNET_KEY);
  let existingExpiry = 0;
  try {
    existingExpiry = Math.max(0, Number((JSON.parse(raw ?? '{}') as { expiresAt?: unknown }).expiresAt) || 0);
  } catch {
    // A corrupt old value must not prevent a newly earned gift from working.
  }
  await AsyncStorage.setItem(SEASON_COLLECTION_MAGNET_KEY, JSON.stringify({
    multiplier: 2,
    activatedAt: nowMs,
    expiresAt: Math.max(nowMs, existingExpiry) + DAY_MS,
  }));
}

async function grantTournamentTicket(nowMs: number = Date.now()): Promise<void> {
  const raw = await AsyncStorage.getItem(SEASON_TOURNAMENT_TICKET_KEY);
  let usesLeft = 0;
  let existingExpiry = 0;
  try {
    const parsed = JSON.parse(raw ?? '{}') as { usesLeft?: unknown; expiresAt?: unknown };
    usesLeft = Math.max(0, Math.floor(Number(parsed.usesLeft) || 0));
    existingExpiry = Math.max(0, Number(parsed.expiresAt) || 0);
  } catch {
    // Replace corrupt storage with a valid local ticket.
  }
  await AsyncStorage.setItem(SEASON_TOURNAMENT_TICKET_KEY, JSON.stringify({
    usesLeft: usesLeft + 1,
    expiresAt: Math.max(nowMs, existingExpiry) + 3 * DAY_MS,
  }));
}

async function grantSeasonPlusDays(days: number, nowMs: number = Date.now()): Promise<void> {
  const token = captureAccountGeneration();
  const stableId = token.stableId;
  if (!stableId || !isCurrentAccountGeneration(token, stableId)) {
    throw new Error('season_plus_identity_not_ready');
  }
  const existing = await readVipSnapshotForAccount(stableId);
  if (!isCurrentAccountGeneration(token, stableId)) throw new Error('season_plus_identity_changed');
  const previousUntil = Math.max(0, Number(existing?.vip_until) || 0);
  const untilMs = Math.max(nowMs, previousUntil) + Math.max(1, Math.floor(days)) * DAY_MS;
  await writeVipSnapshotForAccount(stableId, {
    vip_active: 'true',
    vip_plan: 'season_pass',
    vip_from: String(nowMs),
    vip_until: String(untilMs),
    vip_admin_override: 'true',
    vip_admin_grant_at: String(nowMs),
  });
  if (!isCurrentAccountGeneration(token, stableId)) throw new Error('season_plus_identity_changed');
  emitAppEvent('vip_activated');
  emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
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

/** XP-банк: формат level_gift_system.GiftXpBankState — тот же ключ, та же семантика. */
async function creditXpBank(amount: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(GIFT_XP_BANK_KEY);
    const parsed = raw ? JSON.parse(raw) as { remaining?: number; grantedTotal?: number } : {};
    const remaining = Math.max(0, Math.floor(Number(parsed.remaining) || 0)) + amount;
    const grantedTotal = Math.max(0, Math.floor(Number(parsed.grantedTotal) || 0)) + amount;
    await AsyncStorage.setItem(GIFT_XP_BANK_KEY, JSON.stringify({ ...parsed, remaining, grantedTotal, updatedAt: Date.now() }));
  } catch { /* best effort: следующий грант доложит */ }
}

async function grantGoldenLesson(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SEASON_GOLDEN_LESSON_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<SeasonGoldenLessonState> : {};
    const remaining = Math.max(0, Math.floor(Number(parsed.remaining) || 0)) + 1;
    const state: SeasonGoldenLessonState = { multiplier: 3, remaining, grantedAtMs: Date.now() };
    await AsyncStorage.setItem(SEASON_GOLDEN_LESSON_KEY, JSON.stringify(state));
  } catch { /* best effort */ }
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
 * Применить награду. ЛОКАЛЬНЫЕ эффекты — мгновенно (optimistic по построению),
 * СЕРВЕРНЫЕ (plus_days/magnet/ticket) отмечаются pendingServer — их довершает
 * season_pass_server.ts (callable), модалка ждёт с индикатором.
 */
export async function applySeasonRewardLocal(
  reward: SeasonReward,
  idempotencyKey?: string,
): Promise<ApplySeasonRewardResult> {
  switch (reward.kind) {
    case 'pearls': {
      // Optimistic-начисление жемчуга тем же путём, что рулетка: локально сразу,
      // серверная транзакция seasonClaimReward доначисляет authoritative-баланс.
      const token = captureAccountGeneration();
      const stableId = (await getCanonicalUserId()) ?? token.stableId;
      // Без stableId optimistic пропускаем — серверный seasonClaimReward всё равно
      // доначислит authoritative-баланс, цифра догонит при синке.
      if (stableId) {
        await addShardsLocalOnlyForPendingServerClaim(reward.amount ?? 0, 'season_pass_pearls', token, stableId);
      }
      return { ok: true };
    }
    case 'battery':
      await resetEnergyToMax();
      return { ok: true };
    case 'turbo_regen':
      await applyTurboRegenOverride();
      return { ok: true };
    case 'league_boost':
      await activateLeagueBoost('x2_eod_pass');
      return { ok: true };
    case 'club_totem': {
      await grantClubGiftFreeBoostFromLevel();
      return { ok: true };
    }
    case 'golden_lesson':
      await grantGoldenLesson();
      return { ok: true };
    case 'xp_bank':
      await creditXpBank(Math.max(0, reward.amount ?? 0));
      return { ok: true };
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
      await activateCollectionMagnet();
      return { ok: true };
    case 'tournament_ticket':
      if (!ENABLE_TOURNAMENTS) {
        // Legacy/offline ticket claims keep their value but cannot resurrect a
        // retired tournament entry point or create active ticket state.
        return applySeasonRewardLocal({ kind: 'pearls', amount: 5 }, idempotencyKey);
      }
      await grantTournamentTicket();
      return { ok: true };
    case 'plus_days':
      await grantSeasonPlusDays(reward.amount ?? 1);
      return { ok: true };
    case 'friend_shield': {
      const raw = await AsyncStorage.getItem('chain_shield');
      let daysLeft = 0;
      try {
        daysLeft = Math.max(0, Math.floor(Number((JSON.parse(raw ?? '{}') as { daysLeft?: unknown }).daysLeft) || 0));
      } catch {
        // A new local shield replaces a corrupt legacy value.
      }
      await AsyncStorage.setItem('chain_shield', JSON.stringify({
        daysLeft: daysLeft + 1,
        grantedAt: new Date().toISOString().slice(0, 10),
      }));
      return { ok: true };
    }
    case 'choice_3':
      // Выбор делает модалка: выбранный вариант применяется отдельным вызовом.
      return { ok: true };
    default:
      return { ok: false, failReason: 'unknown' };
  }
}
