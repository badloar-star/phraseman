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
import { captureAccountGeneration } from './account_generation';
import { getCanonicalUserId } from './user_id_policy';
import {
  grantSeasonAuraStage,
  grantSeasonFinale,
  grantSeasonFrame,
  grantSeasonNickColor,
  grantSeasonSecretAura,
  grantSeasonTitle,
  bumpSeasonCustomAvatarGrant,
  SEASON1_TITLE,
} from './season_cosmetics';
import type { SeasonReward } from './season_pass_track_config';

/** Пак сезона 1 — фирменный набор, открывается навсегда (каталог §6, ур. 45). */
export const SEASON1_CARD_PACK_ID = 'official_peaky_blinders_en';

export const SEASON_GOLDEN_LESSON_KEY = 'season_golden_lesson_v1';
export interface SeasonGoldenLessonState { multiplier: number; remaining: number; grantedAtMs: number }

const GIFT_XP_BANK_KEY = 'gift_xp_bank_v1';

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
    await AsyncStorage.setItem(GIFT_XP_BANK_KEY, JSON.stringify({ remaining, grantedTotal, updatedAt: Date.now() }));
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
export async function applySeasonRewardLocal(reward: SeasonReward): Promise<ApplySeasonRewardResult> {
  switch (reward.kind) {
    case 'pearls': {
      // Optimistic-начисление жемчуга тем же путём, что рулетка: локально сразу,
      // серверная транзакция seasonClaimReward доначисляет authoritative-баланс.
      const token = captureAccountGeneration();
      const stableId = await getCanonicalUserId();
      await addShardsLocalOnlyForPendingServerClaim(reward.amount ?? 0, 'season_pass_pearls', token, stableId ?? token.stableId);
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
    case 'club_totem':
      // Ваучер бесплатного группового буста — существующий канал level-gift
      // (club_boosts.ts), гасится штатной транзакцией активации в клубе.
      await grantClubGiftFreeBoostFromLevel();
      return { ok: true };
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
      const unlock = await unlockRandomCustomAvatarGift(token);
      await bumpSeasonCustomAvatarGrant();
      return { ok: true, avatarUnlock: unlock };
    }
    case 'frame':
      await grantSeasonFrame();
      return { ok: true };
    case 'nick_color':
      await grantSeasonNickColor();
      await grantSeasonTitle(SEASON1_TITLE);
      return { ok: true };
    case 'aura_stage':
      await grantSeasonAuraStage(Math.max(1, Math.min(4, reward.amount ?? 1)));
      return { ok: true };
    case 'aura_secret':
      await grantSeasonSecretAura('purple_vortex');
      return { ok: true };
    case 'season_finale':
      await grantSeasonFinale();
      return { ok: true };
    // Серверные: довершает callable (см. season_pass_server.ts) — здесь только маркер.
    case 'plus_days':
    case 'collection_magnet':
    case 'tournament_ticket':
    case 'friend_shield':
      return { ok: true, pendingServer: true };
    case 'choice_3':
      // Выбор делает модалка: выбранный вариант применяется отдельным вызовом.
      return { ok: true };
    default:
      return { ok: false, failReason: 'unknown' };
  }
}
