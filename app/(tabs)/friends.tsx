import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, TouchableOpacity, TextInput,
  Share, Keyboard, StyleSheet, Modal, InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import Reanimated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// FlashList с поддержкой Reanimated-обработчика скролла (onScroll-worklet на UI-потоке).
const AnimatedFlashList = Reanimated.createAnimatedComponent(FlashList as any) as any;
import TapScale from '../../components/TapScale';
import DuoPressable from '../../components/DuoPressable';
// зачем: «добавить друга» — низкий Bevel-шит на общем каркасе шторок рефералки.
import CenteredDialogShell from '../../components/centered_dialog_shell';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { glassFill } from '../../components/GlassSurface';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import { useBouncy, useBouncyStyle } from '../../components/BouncyScrollView';
import { LinearGradient } from '../../components/SafeLinearGradient';
import AvatarView from '../../components/AvatarView';
import PremiumAvatarHalo from '../../components/PremiumAvatarHalo';
import PremiumGoldUserName from '../../components/PremiumGoldUserName';
import LeagueCrownName from '../../components/LeagueCrownName';
import ProfileCardBadge from '../../components/ProfileCardBadge';
import { StreakChainIcon } from '../../components/StreakChainIcon';
import { FlowText } from '../../components/text-integrity';
import UnifiedPlayerModal, { PlayerInfo } from '../../components/PlayerProfileModal';
import ThemedConfirmModal from '../../components/ThemedConfirmModal';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import { softShadow } from '../../constants/androidGlow';
import RetiredRasterFallback from '../../components/feedback/RetiredRasterFallback';
import { getSocialFriendsIcon } from '../../constants/socialIconAssets';
import { PREMIUM_AVATAR_AURA_ID, USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId, normalizeAvatarAuraId } from '../../constants/avatar_auras';
import { getLevelFromXP, getXPProgress, isLightThemeMode, type ThemeMode } from '../../constants/theme';
import { OLIVE_GRADIENTS, OLIVE_RICH, oliveShadow } from '../../constants/oliveTheme';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { soundDirector } from '../../modules/audio/sound_director';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import {
  normalizeProfileCardLevel,
  normalizeProfileCardMotion,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
} from '../profile_card_system';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';

import { isValidInviteCodeLookup, normalizeInviteCodeInput } from '../friend_code';
import { ensureMyInviteCodeForFriends, lookupUserByFriendCode, lookupUserByNickname, readCachedMyInviteCodeForFriends, type LookupUserProfile } from '../firestore_friends';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  subscribeToIncomingRequests,
  cleanupStaleFriendData,
  type FriendEntry,
  type FriendRequestEntry,
} from '../firestore_friend_requests';
import { CLOUD_SYNC_ENABLED, ENABLE_DEV_TOOLS, IS_EXPO_GO } from '../config';
import { getCanonicalUserId } from '../user_id_policy';
import { ensureAnonUser } from '../cloud_sync';
import { fetchFriendProfilesBatch, type FriendProfileBatchRecord } from '../friends_profiles_batch';
import { acquireInviteCodeShared, invalidateInviteCodeShared } from '../invite_code_singleton';
import { isPremiumProgressActive, isVipProgressActive } from '../premium_progress';
import { fetchActiveLeagueCrowns } from '../services/league_chest_rewards';
import { randomSelfFriendCodeMessage } from '../friends_self_code_messages';
import {
  startFriendsTabSwrPrime,
  peekFriendsTabSwrWarm,
  memoryUpsertFriendsTabSwr,
  peekProfilesCache,
  pruneFriendsProfileCache,
  upsertProfilesCache,
  FRIENDS_TAB_SWR_CACHE_KEY,
  FRIEND_PROFILES_CACHE_KEY,
  type FriendsProfileCacheEntry,
} from '../friends_tab_swr_warm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReportErrorButton from '../../components/ReportErrorButton';
import { useTabNav } from '../TabContext';
// зачем (владелец, 2026-08-16): лента «Активность» удалена — у 99 % пользователей она была
// пустой (35 из 4 657 имеют друзей), источник событий давал 0–2 события в день на всю базу.
// Социальный жест остался один и дешёвый: «дай пять» = профильный лайк прямо в строке друга.
import {
  PROFILE_LIKE_EVENT_ID,
  fetchActivityLikeState,
  fetchActivityLikeStates,
  removeFriendActivityLike,
  sendFriendActivityLike,
} from '../friend_activity_likes';
import { trackActivity } from '../app_activity';
import {
  getShardsBalance,
  peekLastKnownShardsBalance,
} from '../shards_system';
import { oskolokImageForPackShards } from '../oskolok';
import type { IncomingFriendGift } from '../friend_gift_inbox';
import { friendsAccountStore } from '../friends_account_store';
import { emitAppEvent, onAppEvent } from '../events';
import {
  FRIEND_GIFT_CATALOG,
  isFriendGiftsCloudEnabled,
  sendFriendGiftThanks,
  type FriendGiftId,
} from '../friend_gifts';
import { enqueueFriendGiftSend } from '../friend_gift_outbox';
import {
  claimFriendQuestReward,
  getActiveFriendQuest,
  type FriendQuest,
} from '../friend_quests';
import { checkAchievements } from '../achievements';
import { ReferralAccessEndedModal } from '../referral_access_ended_modal';
import {
  getClaimableReferralState,
  peekClaimableReferralState,
  type ReferralInvite,
} from '../referral_vip';
import { buildCloudReferralInviteShare } from '../referral_invite_share';
import { generateReferralCode, getReferralCode } from '../referral_system';
import { isReferralCloudEnabled } from '../referral_flags';
import { useReferralRoulettePolicy } from '../referral_roulette_flag';
import { selectAccountScopedReferralState, selectReferralSurfaceState } from '../referral_surface_state';
import {
  shouldShowReferralAccessEnded,
  markReferralAccessEndedSeen,
  getTrackedReferralWindowEnd,
} from '../referral_access_ended_tracker';
import { useAppSnapshotSelector } from '../app_snapshot_store';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
import { readVipSnapshotForGeneration } from '../premium_vip_storage';
import {
  isReferralAccountRequestCurrent,
  readReferralDrain,
  readReferralInvites,
} from '../referrals_cache';
// «Вместе» (friends_together) — ядро уже построено и протестировано отдельно
// (app/friends_together/*), здесь только UI-слой за флагом.
import { useFriendsTogetherEnabled } from '../friends_together/together_config';
import { applyChestRewardsLocally } from '../friends_together/chest_reward_apply';
import {
  getFriendsTogetherSnapshot,
  readWeeklyChestClaimedWeekKey,
  primeFriendsTogetherSnapshot,
  refreshFriendsTogether,
  type FriendsTogetherSnapshot,
  type FriendTogetherPairState,
} from '../friends_together/together_store';
import { buildWeeklyChestModel, type WeeklyChestModel } from '../friends_together/weekly_chest_model';
import { nudgeFriend, isNudgedToday, primeNudgedTodayCache, type NudgeErrorReason } from '../friends_together/nudge_client';
import { claimFriendLevel, claimWeeklyChest } from '../friends_together/claims_client';
import { LEVEL_NAMES, bonusPercentForLevel, nextThreshold, starRewardForLevelRange, friendGiftCostForLevel, decodeActiveDays, levelForDays as levelForDaysDev } from '../friends_together/together_days';
import { getMyWeekPoints, getWeekKey } from '../hall_of_fame_utils';
import FriendsChestCard from '../../components/friends_together/FriendsChestCard';
import FriendListRow from '../../components/friends_together/FriendListRow';
import FriendTogetherSheet from '../../components/friends_together/FriendTogetherSheet';
import {
  createFriendSheetSession,
  completeFriendSheetSession,
  hideFriendSheetSession,
  isCurrentFriendSheetMember,
  queueFirstFriendSheetAction,
  resolveFriendSheetProfile,
  type FriendSheetPendingAction,
  type FriendSheetSession,
} from '../../components/friends_together/friend_sheet_session';
import FriendLevelUpModal from '../../components/friends_together/FriendLevelUpModal';
import FriendsChestModal from '../../components/friends_together/FriendsChestModal';
import FriendStudyInviteModal from '../../components/friends_together/FriendStudyInviteModal';
import {
  acknowledgeMarker,
  friendSocialEventsFromNotifications,
  nextFriendMarkerExpiryMs,
  selectFriendMarker,
  type FriendSocialEvent,
} from '../friend_social_events';
import {
  markUserNotificationsRead,
  readCachedUserNotifications,
  refreshUserNotificationsOnce,
} from '../user_notifications';
// DEV-only: сквозная ручная проверка «Вместе» без реальных друзей (владелец, 2026-08-17).
import DevBotsSheet from '../../components/friends_together/DevBotsSheet';
import {
  type DevBotsState,
  loadDevBots,
  addDevBots,
  advanceBotDay,
  advanceAllBots,
  setChestScenario,
  openDevChestScenario,
  resetDevChestScenario,
  simulateIncomingNudge,
  nudgeDevBot,
  markGiftReady,
  resetDevBots,
  devBotToFriendProfile,
  devBotTogetherMetrics,
} from '../friends_together/dev_bots';

// Тёплый кеш (дублирует root layout — если вкладка подгрузилась отдельным чанком).
startFriendsTabSwrPrime();

// ── Types ─────────────────────────────────────────────────────────────────────

interface FriendProfile {
  uid: string;
  name: string;
  totalXp: number;
  weeklyXp: number;
  streak: number;
  isPremium: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
  avatar: string;
  frame: string;
  aura?: string;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  leagueCrownExpiresAt?: number;
  leagueCrownCount?: number;
}

const PROFILE_TTL_MS = 30 * 1000;
const FRIENDS_REFERRAL_REFRESH_TTL_MS = 15 * 60 * 1000;
const FRIENDS_QUEST_REFRESH_TTL_MS = 2 * 60 * 1000;

type ProfileCacheEntry = FriendsProfileCacheEntry;

type FriendsChrome = {
  card: string;
  cardSoft: string;
  surface: string;
  button: string;
  border: string;
  mask: string;
};

function referralInvitesKey(invites: ReferralInvite[]): string {
  return invites
    .map((inv) => [
      inv.refereeStableId,
      inv.status,
      inv.refereeName ?? '',
      Math.floor(Number(inv.createdAtMs || 0)),
    ].join(':'))
    .sort()
    .join('|');
}

function friendQuestKey(quest: FriendQuest | null): string {
  if (!quest) return 'none';
  const progress = Object.keys(quest.progressByUid || {})
    .sort()
    .map((uid) => `${uid}:${quest.progressByUid[uid] ?? 0}:${quest.remainingXpByUid?.[uid] ?? 0}`)
    .join(',');
  const claimed = Object.keys(quest.rewardClaimedByUid || {})
    .sort()
    .map((uid) => `${uid}:${quest.rewardClaimedByUid?.[uid] ? 1 : 0}`)
    .join(',');
  return [
    quest.questId,
    quest.status,
    quest.startedAtMs,
    quest.expiresAtMs,
    quest.targetXp,
    quest.rewardShards,
    quest.rewardXp,
    progress,
    claimed,
  ].join('|');
}

function makeFriendsChrome(themeMode: ThemeMode, t: any): FriendsChrome {
  if (false) {
    return {
      card: 'rgba(32,32,32,0.76)',
      cardSoft: 'rgba(32,32,32,0.70)',
      surface: 'rgba(42,42,42,0.62)',
      button: 'rgba(42,42,42,0.58)',
      border: 'rgba(200,255,0,0.11)',
      mask: '#202020',
    };
  }
  if (themeMode === 'indigo') {
    return {
      card: 'rgba(35,36,40,0.76)',
      cardSoft: 'rgba(35,36,40,0.70)',
      surface: 'rgba(45,47,52,0.62)',
      button: 'rgba(45,47,52,0.58)',
      border: 'rgba(255,255,255,0.12)',
      mask: '#232428',
    };
  }
  return {
    card: t.bgCard,
    cardSoft: t.bgCard,
    surface: t.bgSurface,
    button: t.bgSurface,
    border: t.border,
    mask: t.bgCard,
  };
}

function friendQuestModalChrome(themeMode: ThemeMode) {
  if (themeMode === 'olive') return { panel: OLIVE_RICH.panel, gradient: OLIVE_GRADIENTS.raisedPanel, button: OLIVE_RICH.champagne, text: OLIVE_RICH.ivory, mutedText: OLIVE_RICH.champagneLight, shadow: oliveShadow(3) };
  return { panel: '#FFF9EE', gradient: ['rgba(255,248,221,0.98)', 'rgba(232,195,106,0.42)'] as const, button: '#D7A83B', text: '#21170B', mutedText: '#4E3B1D', shadow: {} };
}
const friendGiftModalChrome = (themeMode: ThemeMode) => themeMode === 'olive' ? OLIVE_GRADIENTS.raisedPanel : null;
const friendGiftIncomingModalChrome = (themeMode: ThemeMode) => themeMode === 'olive' ? OLIVE_GRADIENTS.quietPanel : null;

function friendGiftAccent(giftId: FriendGiftId | string, t: any, themeMode: ThemeMode): string {
  if (themeMode === 'olive') return giftId === 'chain_shield_1' ? OLIVE_RICH.champagneLight : OLIVE_RICH.champagne;
  if (giftId === 'chain_shield_1') return '#7AA7FF';
  if (giftId === 'xp_boost_2x_24h') return '#F0A23A';
  return t.accent;
}

async function writeProfilesCache(cache: Record<string, ProfileCacheEntry>, retainUids: readonly string[] = []): Promise<void> {
  try {
    await AsyncStorage.setItem(
      FRIEND_PROFILES_CACHE_KEY,
      JSON.stringify(pruneFriendsProfileCache(cache, Date.now(), retainUids)),
    );
  } catch { /* ignore */ }
}

// ── Firestore accessor ────────────────────────────────────────────────────────

const getDb = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return require('@react-native-firebase/firestore').default();
  } catch { return null; }
};

// ── Profile fetch ─────────────────────────────────────────────────────────────

function cleanFriendDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 40).trim();
}

function shouldUseLookupDisplayName(profile: FriendProfile | null): boolean {
  const current = cleanFriendDisplayName(profile?.name);
  return !current || current === '…' || current === '...' || current === 'Phraseman' || current === 'Friend' || current === 'Player' || current === 'Игрок';
}

function placeholderFriendProfile(uid: string, candidateName?: string): FriendProfile {
  const sanitizedName = cleanFriendDisplayName(candidateName);
  return {
    uid,
    name: sanitizedName || 'Phraseman',
    totalXp: 0,
    weeklyXp: 0,
    streak: 0,
    isPremium: false,
    isVip: false,
    avatar: String(getBestAvatarForLevel(1)),
    frame: String(getBestFrameForLevel(1).id),
    aura: undefined,
  };
}

/**
 * Строит FriendProfile из серверного профиля поиска (users.progress). Это ПЕРВИЧНЫЙ
 * источник: сервер вернул имя/уровень/XP/аватар сразу, поэтому карточка друга не
 * зависит от leaderboard (у многих юзеров записи там нет → раньше был прочерк
 * и уровень 1). Уровень считается из totalXp самой аватаркой.
 */
function friendProfileFromLookup(uid: string, lp: LookupUserProfile | undefined): FriendProfile | null {
  if (!lp) return null;
  const name = cleanFriendDisplayName(lp.name);
  const totalXp = typeof lp.totalXp === 'number' && lp.totalXp > 0 ? Math.floor(lp.totalXp) : 0;
  const avatar = (lp.avatar ?? '').trim();
  const aura = normalizeAvatarAuraId((lp.aura ?? '').trim());
  // Совсем пусто — профиля нет (не перекрываем возможный leaderboard-результат).
  if (!name && totalXp <= 0 && !avatar) return null;
  const levelForAssets = totalXp > 0 ? getLevelFromXP(totalXp) : (lp.level && lp.level > 0 ? lp.level : 1);
  return normalizePublicFriendProfile({
    uid,
    name,
    totalXp,
    weeklyXp: 0,
    streak: 0,
    isPremium: lp.isPremium === true,
    isVip: false,
    isLifetime: false,
    avatar: avatar || String(getBestAvatarForLevel(levelForAssets)),
    frame: (lp.frame ?? '').trim() || String(getBestFrameForLevel(levelForAssets).id),
    aura,
  });
}

function profileWithLookupDisplayName(
  uid: string,
  profile: FriendProfile | null,
  candidateName?: string,
): FriendProfile | null {
  const sanitizedName = cleanFriendDisplayName(candidateName);
  if (!sanitizedName) return profile;
  if (!profile) return placeholderFriendProfile(uid, sanitizedName);
  if (!shouldUseLookupDisplayName(profile)) return profile;
  return { ...profile, name: sanitizedName };
}

function friendNameSearchKey(value: unknown): string {
  return cleanFriendDisplayName(value).toLocaleLowerCase();
}

function findLocalFriendProfileByName(
  query: string,
  profiles: Record<string, FriendProfile>,
  friends: FriendEntry[],
  requests: FriendRequestEntry[],
): FriendProfile | null {
  const key = friendNameSearchKey(query);
  if (!key) return null;
  const candidates: FriendProfile[] = [];
  const seen = new Set<string>();
  const push = (profile: FriendProfile | null | undefined) => {
    if (!profile || seen.has(profile.uid)) return;
    seen.add(profile.uid);
    candidates.push(profile);
  };

  for (const friend of friends) {
    push(profileWithLookupDisplayName(friend.uid, profiles[friend.uid] ?? null, friend.displayName)
      ?? placeholderFriendProfile(friend.uid, friend.displayName));
  }
  for (const req of requests) {
    push(profileWithLookupDisplayName(req.fromUid, profiles[req.fromUid] ?? null, req.fromName)
      ?? placeholderFriendProfile(req.fromUid, req.fromName));
  }
  Object.values(profiles).forEach(push);

  return candidates.find(profile => friendNameSearchKey(profile.name) === key) ?? null;
}

function readPublicNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
}

function readPublicString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePublicFriendProfile(profile: FriendProfile): FriendProfile {
  const level = getLevelFromXP(profile.totalXp);
  return {
    ...profile,
    name: profile.name.trim() || 'Игрок',
    avatar: profile.avatar.trim() || String(getBestAvatarForLevel(level)),
    frame: profile.frame.trim() || String(getBestFrameForLevel(level).id),
    aura: normalizeAvatarAuraId(profile.aura),
    profileCardLevel: normalizeProfileCardLevel(profile.profileCardLevel),
    profileCardTheme: normalizeProfileCardTheme(profile.profileCardTheme),
    profileCardMotion: normalizeProfileCardMotion(profile.profileCardMotion),
    profileCardPublicFocus: normalizeProfileCardPublicFocus(profile.profileCardPublicFocus),
  };
}

function mergePublicFriendProfiles(
  current: FriendProfile | null,
  incoming: FriendProfile | null,
): FriendProfile | null {
  if (!incoming) return current;
  if (!current) return normalizePublicFriendProfile(incoming);

  const primary = incoming.totalXp >= current.totalXp ? incoming : current;
  const secondary = primary === incoming ? current : incoming;
  return normalizePublicFriendProfile({
    uid: primary.uid || secondary.uid,
    name: primary.name || secondary.name,
    totalXp: Math.max(primary.totalXp, secondary.totalXp),
    weeklyXp: Math.max(primary.weeklyXp, secondary.weeklyXp),
    streak: Math.max(primary.streak, secondary.streak),
    isPremium: primary.isPremium || secondary.isPremium,
    isVip: primary.isVip || secondary.isVip,
    isLifetime: primary.isLifetime || secondary.isLifetime,
    avatar: primary.avatar || secondary.avatar,
    frame: primary.frame || secondary.frame,
    aura: primary.aura ?? secondary.aura,
    profileCardLevel: primary.profileCardLevel ?? secondary.profileCardLevel,
    profileCardTheme: primary.profileCardTheme ?? secondary.profileCardTheme,
    profileCardMotion: primary.profileCardMotion ?? secondary.profileCardMotion,
    profileCardPublicFocus: primary.profileCardPublicFocus ?? secondary.profileCardPublicFocus,
    leagueCrownExpiresAt: primary.leagueCrownExpiresAt ?? secondary.leagueCrownExpiresAt,
    leagueCrownCount: Math.max(
      Math.floor(Number(primary.leagueCrownCount) || 0),
      Math.floor(Number(secondary.leagueCrownCount) || 0),
    ),
  });
}

function profileFromLeaderboardDoc(uid: string, data: Record<string, unknown>): FriendProfile | null {
  const totalXp = readPublicNumber(data.points);
  const avatar = readPublicString(data.avatar);
  const frame = readPublicString(data.frame);
  const aura = normalizeAvatarAuraId(readPublicString(data.aura));
  const name = readPublicString(data.name) || readPublicString(data.displayName);
  const profileCardLevel = normalizeProfileCardLevel(data.profileCardLevel);
  if (!name && totalXp <= 0 && !avatar && !frame && !aura && profileCardLevel <= 0) return null;

  return normalizePublicFriendProfile({
    uid,
    name,
    totalXp,
    weeklyXp: readPublicNumber(data.weekPoints),
    streak: readPublicNumber(data.streak),
    isPremium: data.isPremium === true,
    isVip: data.isVip === true,
    isLifetime: data.isLifetime === true,
    avatar,
    frame,
    aura,
    profileCardLevel,
    profileCardTheme: normalizeProfileCardTheme(data.profileCardTheme),
    profileCardMotion: normalizeProfileCardMotion(data.profileCardMotion),
    profileCardPublicFocus: normalizeProfileCardPublicFocus(data.profileCardPublicFocus),
  });
}

/** Конвертация batch-ответа сервера в локальный FriendProfile (поля normalizePublicFriendProfile). */
function profileFromBatchRecord(rec: FriendProfileBatchRecord): FriendProfile {
  return normalizePublicFriendProfile({
    uid: rec.uid,
    name: rec.displayName,
    totalXp: rec.totalXp,
    weeklyXp: 0,
    streak: 0,
    isPremium: rec.isPremium,
    isVip: rec.isVip,
    isLifetime: rec.isLifetime,
    avatar: rec.avatar,
    frame: rec.frame,
    aura: rec.aura,
    profileCardLevel: rec.profileCardLevel,
    profileCardTheme: undefined,
    profileCardMotion: undefined,
    profileCardPublicFocus: undefined,
  });
}

async function fetchFriendProfileFromFirestore(uid: string): Promise<FriendProfile | null> {
  try {
    // Пачечный серверный путь читает канонический leaderboard одним callable.
    // TODO(legacy-compat): для IS_EXPO_GO/CLOUD_SYNC_ENABLED=false старая цепочка
    // видна в git-истории при необходимости.
    const map = await fetchFriendProfilesBatch([uid]);
    const rec = map[uid];
    const profile = rec ? profileFromBatchRecord(rec) : null;
    if (!profile && __DEV__) console.warn('[friendProfile] public profile missing for uid:', uid);
    return profile;
  } catch (e) {
    if (__DEV__) console.warn('[friendProfile] error for uid:', uid, String(e));
    return null;
  }
}

/**
 * Перф: map с ограничением конкурентности. Раньше loadProfiles делал
 * Promise.all по ВСЕМ друзьям сразу — десятки одновременных Firestore-чтений
 * залпом в момент открытия таба «Друзья» = удар по JS-потоку и сети.
 * Результат сохраняет ПОРЯДОК входного массива (result[i] ⟷ items[i]),
 * т.к. вызывающий код читает fetched[i] по индексу toFetch[i].
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const result = new Array<R>(items.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await fn(items[index], index);
    }
  };
  const size = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: size }, () => worker()));
  return result;
}


// ── XP Bar ────────────────────────────────────────────────────────────────────

async function loadProfiles(
  uids: string[],
  existingCache: Record<string, ProfileCacheEntry>,
): Promise<{ fresh: Record<string, FriendProfile>; updatedCache: Record<string, ProfileCacheEntry> }> {
  const now = Date.now();
  const result: Record<string, FriendProfile> = {};
  const updatedCache = { ...existingCache };
  const toFetch: string[] = [];

  for (const uid of uids) {
    const entry = existingCache[uid];
    if (entry) {
      result[uid] = entry.profile as FriendProfile;
      if (now - entry.fetchedAt >= PROFILE_TTL_MS) toFetch.push(uid);
    } else {
      toFetch.push(uid);
    }
  }

  if (toFetch.length > 0) {
    await ensureAnonUser();
    const batchMap = await fetchFriendProfilesBatch(toFetch);
    const fetched = toFetch.map((uid) => {
      const rec = batchMap[uid];
      return rec ? profileFromBatchRecord(rec) : null;
    });
    const fetchedProfiles = fetched.filter((p): p is FriendProfile => p !== null);
    const crownMap = await fetchActiveLeagueCrowns(fetchedProfiles.map((p) => p.uid));
    const newEntries: Record<string, ProfileCacheEntry> = {};
    for (let i = 0; i < toFetch.length; i++) {
      const profile = fetched[i];
      if (profile) {
        const crown = crownMap[profile.uid];
        const crowned = {
          ...profile,
          leagueCrownExpiresAt: crown?.expiresAt,
          leagueCrownCount: Math.max(0, Math.floor(Number(crown?.crownCount) || 0)),
        };
        result[toFetch[i]] = crowned;
        const entry: ProfileCacheEntry = { profile: crowned, fetchedAt: now };
        updatedCache[toFetch[i]] = entry;
        newEntries[toFetch[i]] = entry;
      }
    }
    if (Object.keys(newEntries).length > 0) upsertProfilesCache(newEntries);
  }

  const prunedCache = pruneFriendsProfileCache(updatedCache, now, uids);
  if (toFetch.length > 0 || Object.keys(prunedCache).length !== Object.keys(updatedCache).length) {
    void writeProfilesCache(prunedCache, uids);
  }

  return { fresh: result, updatedCache: prunedCache };
}

async function fetchMyProfile() {
  try {
    const db = getDb();
    const myUid = await ensureAnonUser();
    if (!db || !myUid) return null;
    const snap = await db.collection('users').doc(myUid).get();
    if (!snap.exists) return null;
    const d: Record<string, unknown> = snap.data() ?? {};
    const p = (d.progress as Record<string, unknown>) ?? {};
    const totalXp = parseInt((p.user_total_xp as string) ?? '0') || 0;
    const streak = parseInt((p.streak_count as string) ?? '0') || 0;
    const isPremium = isPremiumProgressActive(p);
    const isVip = isVipProgressActive(p);
    const level = getLevelFromXP(totalXp);
    const avatarRaw = typeof p.user_avatar === 'string' ? p.user_avatar.trim() : '';
    const frameRaw = typeof p.user_avatar_frame === 'string'
      ? p.user_avatar_frame.trim()
      : (typeof p.user_frame === 'string' ? p.user_frame.trim() : '');
    const auraRaw = typeof p.user_avatar_aura === 'string' ? p.user_avatar_aura.trim() : '';
    return {
      name: (p.user_name as string) || (d.name as string) || '?',
      avatar: avatarRaw || String(getBestAvatarForLevel(level)),
      frame: frameRaw || String(getBestFrameForLevel(level).id),
      aura: normalizeAvatarAuraId(auraRaw),
      totalXP: totalXp,
      streak: streak ?? null,
      isPremium,
      isVip,
    };
  } catch { return null; }
}

function MiniXpBar({ xp, color }: { xp: number; color: string }) {
  const level = getLevelFromXP(xp);
  const { progress } = getXPProgress(xp);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
      <View style={{ flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2 }}>
        <View style={{ height: 3, width: `${progress * 100}%` as any, backgroundColor: color, borderRadius: 2 }} />
      </View>
      <Text style={{ fontSize: 10, color, fontWeight: '700', minWidth: 28 }}>Lv{level}</Text>
    </View>
  );
}

function FriendsThemeIcon({
  themeMode,
  size,
  accessibilityLabel,
}: {
  themeMode: ThemeMode;
  size: number;
  accessibilityLabel: string;
}) {
  return (
    <Image
      source={getSocialFriendsIcon(themeMode)}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    />
  );
}

// ── Микроанимации списков (D-редизайн): каскад, пульс, pop ─────────────────────

/** Мягкий пульс (opacity 0.6→1) — для кнопки подарка, когда подарок реально доступен. */
function PulseOn({ active, children }: { active: boolean; children: React.ReactNode }) {
  const opacity = useSharedValue(1);
  // зачем: withRepeat(-1) без гарда крутится вечно даже когда вкладка «Друзья»
  // в фоне или приложение свёрнуто — это грелка батареи. Гардим фокусом экрана
  // и активностью приложения (контракт tests/perf_freeze_contract.test.ts).
  //
  // зачем ownerVisible 2026-07-27 (владелец: «приложение греет телефон»): все
  // табы живут в ОДНОМ роутном экране, поэтому useIsFocused() возвращает true
  // и для невидимых — одного useRuntimeActive() было мало, пульс крутился,
  // пока пользователь сидел на главной. runtimeOwnerId — честный сигнал.
  const { runtimeOwnerId } = useTabNav();
  const runtimeActive = useRuntimeActive(runtimeOwnerId === 'friends');
  useEffect(() => {
    if (active && runtimeActive) {
      opacity.value = withRepeat(withTiming(0.6, { duration: 900 }), -1, true);
    } else {
      opacity.value = withTiming(1, { duration: 150 });
    }
  }, [active, runtimeActive, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Reanimated.View style={style}>{children}</Reanimated.View>;
}

/** «Вместе» — данные строки друга, посчитанные родителем (together_store снапшот). */
type FriendRowTogether = {
  days: number;
  level: number;
  progressPercent: number; // 0..100 до следующего уровня (100 — уже максимум)
  nudged: boolean;
  learnedToday: boolean;
  incomingNudge?: boolean;
  giftReady?: boolean;
};

// ── Request row ───────────────────────────────────────────────────────────────

function RequestRow({ profile, onAccept, onDecline, lang, t, f, chrome, themeMode }: {
  profile: FriendProfile;
  onAccept: () => void;
  onDecline: () => void;
  lang: string;
  t: any;
  f: any;
  chrome: FriendsChrome;
  themeMode: ThemeMode;
}) {
  const leagueCrownCount = Math.max(0, Math.floor(Number(profile.leagueCrownCount) || 0));
  const hasLeagueCrown = leagueCrownCount > 0 || Number(profile.leagueCrownExpiresAt) > Date.now();
  const displayLeagueCrownCount = hasLeagueCrown ? Math.max(1, leagueCrownCount) : 0;
  const effectiveAura = getEffectiveAvatarAuraId(profile.aura, profile.isPremium, profile.isVip);
  const usesPremiumAura = effectiveAura === PREMIUM_AVATAR_AURA_ID;
  return (
    <View testID={`friend-request-row-${profile.uid}`} style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: glassFill(chrome.card, 0.46), borderRadius: 16, padding: 14, marginBottom: 10,
      gap: 12,
    }}>
      <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={44} maskColor={chrome.mask} animateShimmer={false}>
        <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={44} auraId={usesPremiumAura ? undefined : effectiveAura} animateAura={false} />
      </PremiumAvatarHalo>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ minWidth: 0, overflow: 'hidden' }}>
          <View style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>
            {hasLeagueCrown
              ? <LeagueCrownName text={profile.name} fontSize={f.body} count={displayLeagueCrownCount} />
              : profile.isPremium || profile.isVip
              ? <PremiumGoldUserName text={profile.name} fontSize={f.body} />
              : <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>{profile.name}</Text>
            }
          </View>
        </View>
        <ProfileCardBadge level={profile.profileCardLevel} theme={profile.profileCardTheme} style={{ marginTop: 3 }} />
        <MiniXpBar xp={profile.totalXp} color={t.textSecond} />
        {profile.streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
            <StreakChainIcon themeMode={themeMode} streakDays={profile.streak} size={15} />
            <Text style={{ fontSize: f.sub, color: '#FF9500', fontWeight: '700' }}>{profile.streak}</Text>
          </View>
        )}
      </View>
      <View style={{ gap: 8, alignSelf: 'center' }}>
        <DuoPressable
          testID={`friend-request-accept-${profile.uid}`}
          onPress={onAccept}
          edgeColor={t.accent}
          style={{ backgroundColor: t.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minWidth: 96 }}
        >
          <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '800' }}>
            {triLang(lang as any, {
              ru: 'Принять',
              uk: 'Прийняти',
              en: 'Accept',
              es: 'Aceptar',
              'pt-BR': 'Aceitar',
              vi: 'Chấp nhận',
              id: 'Terima',
              tr: 'Kabul et',
              pl: 'Przyjmij',
            })}
          </Text>
        </DuoPressable>
        <TapScale
          testID={`friend-request-decline-${profile.uid}`}
          onPress={onDecline}
          scaleTo={0.96}
          style={{
            backgroundColor: chrome.button,
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
            minWidth: 96,
            alignItems: 'center',
            borderWidth: 0,
            borderColor: 'transparent',
          }}
        >
          <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700' }}>
            {triLang(lang as any, {
              ru: 'Отклонить',
              uk: 'Відхилити',
              en: 'Decline',
              es: 'Rechazar',
              'pt-BR': 'Recusar',
              vi: 'Từ chối',
              id: 'Tolak',
              tr: 'Reddet',
              pl: 'Odrzuć',
            })}
          </Text>
        </TapScale>
      </View>
    </View>
  );
}

// ── Found user card ───────────────────────────────────────────────────────────

function FoundUserCard({ profile, onAdd, onClose, isAdding, lang, t, f, chrome, themeMode }: {
  profile: FriendProfile; onAdd: () => void; onClose: () => void;
  isAdding: boolean; lang: string; t: any; f: any;
  chrome: FriendsChrome;
  themeMode: ThemeMode;
}) {
  const level = getLevelFromXP(profile.totalXp);
  const leagueCrownCount = Math.max(0, Math.floor(Number(profile.leagueCrownCount) || 0));
  const hasLeagueCrown = leagueCrownCount > 0 || Number(profile.leagueCrownExpiresAt) > Date.now();
  const displayLeagueCrownCount = hasLeagueCrown ? Math.max(1, leagueCrownCount) : 0;
  const effectiveAura = getEffectiveAvatarAuraId(profile.aura, profile.isPremium, profile.isVip);
  const usesPremiumAura = effectiveAura === PREMIUM_AVATAR_AURA_ID;
  return (
    <View testID="friends-found-user-card" style={{
      backgroundColor: chrome.card, borderRadius: 20, padding: 20, marginTop: 12,
      borderWidth: 0, borderColor: 'transparent', gap: 16,
      shadowColor: t.accent, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={56} maskColor={chrome.mask}>
          <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={56} auraId={usesPremiumAura ? undefined : effectiveAura} />
        </PremiumAvatarHalo>
        <View style={{ flex: 1 }}>
          {hasLeagueCrown
            ? <LeagueCrownName text={profile.name} fontSize={f.h3 ?? f.body + 2} count={displayLeagueCrownCount} />
            : profile.isPremium || profile.isVip
            ? <PremiumGoldUserName text={profile.name} fontSize={f.h3 ?? f.body + 2} />
            : <Text style={{ color: t.textPrimary, fontSize: f.h3 ?? 18, fontWeight: '800' }}>{profile.name}</Text>
          }
          <Text style={{ color: t.textSecond, fontSize: f.body, marginTop: 2 }}>
            Lv {level} • {profile.totalXp.toLocaleString()} XP
          </Text>
          {profile.streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <StreakChainIcon themeMode={themeMode} streakDays={profile.streak} size={15} />
              <Text style={{ color: '#FF9500', fontSize: f.sub }}>
                {profile.streak} {triLang(lang as any, {
                  ru: 'дней подряд',
                  uk: 'днів поспіль',
                  en: 'days in a row',
                  es: 'días seguidos',
                  'pt-BR': 'dias seguidos',
                  vi: 'ngày liên tiếp',
                  id: 'hari berturut-turut',
                  tr: 'gün üst üste',
                  pl: 'dni z rzędu',
                })}
              </Text>
            </View>
          )}
        </View>
        <TapScale onPress={onClose} hitSlop={8}>
          <Ionicons name="close-circle" size={22} color={t.textMuted} />
        </TapScale>
      </View>
      <DuoPressable
        testID="friends-add-found"
        onPress={onAdd}
        disabled={isAdding}
        edgeColor={t.accent}
        style={{
          backgroundColor: t.accent, borderRadius: 14, paddingVertical: 14,
          opacity: isAdding ? 0.6 : 1,
          flexDirection: 'row', justifyContent: 'center', gap: 8,
        }}
      >
        <Ionicons name="person-add" size={18} color={t.correctText} />
        <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
          {triLang(lang as any, {
            ru: 'Добавить в друзья',
            uk: 'Додати в друзі',
            en: 'Add friend',
            es: 'Agregar amigo',
            'pt-BR': 'Adicionar amigo',
            vi: 'Thêm bạn bè',
            id: 'Tambah teman',
            tr: 'Arkadaş ekle',
            pl: 'Dodaj znajomego',
          })}
        </Text>
      </DuoPressable>
    </View>
  );
}

function giftEventLabel(payload: Record<string, string | number>, lang: string): string {
  const payloadKeyByLang: Record<Lang, keyof typeof payload> = {
    ru: 'giftLabelRu',
    uk: 'giftLabelUk',
    en: 'giftLabelRu',
    es: 'giftLabelEs',
    'pt-BR': 'giftLabelPtBr',
    vi: 'giftLabelVi',
    id: 'giftLabelId',
    tr: 'giftLabelTr',
    pl: 'giftLabelPl',
  };
  const catalogLabelByLang: Record<Lang, keyof (typeof FRIEND_GIFT_CATALOG)[number]> = {
    ru: 'labelRu',
    uk: 'labelUk',
    en: 'labelRu',
    es: 'labelEs',
    'pt-BR': 'labelPtBr',
    vi: 'labelVi',
    id: 'labelId',
    tr: 'labelTr',
    pl: 'labelPl',
  };
  const safeLang = (lang in payloadKeyByLang ? lang : 'ru') as Lang;
  const payloadValue = payload[payloadKeyByLang[safeLang]];
  if (typeof payloadValue === 'string' && payloadValue.trim()) return payloadValue;
  const catalogItem = FRIEND_GIFT_CATALOG.find((item) => item.id === payload.giftId);
  const catalogValue = catalogItem?.[catalogLabelByLang[safeLang]];
  if (typeof catalogValue === 'string' && catalogValue.trim()) return catalogValue;
  const rawGiftId = payload.giftId;
  return typeof rawGiftId === 'string' ? rawGiftId : '';
}

// ── Friend quest modals ────────────────────────────────────────────────────────

function FriendQuestStartedModal({
  visible, onClose, L, f, themeMode,
}: {
  visible: boolean;
  onClose: () => void;
  L: (...args: string[]) => string;
  f: any;
  themeMode: ThemeMode;
}) {
  const modalChrome = friendQuestModalChrome(themeMode);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View accessibilityViewIsModal style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(9, 8, 12, 0.72)' }}>
        <View style={{ width: '100%', maxWidth: 372, borderRadius: 24, overflow: 'hidden', backgroundColor: modalChrome.panel, borderWidth: 0, borderColor: 'transparent', ...modalChrome.shadow }}>
          <LinearGradient colors={modalChrome.gradient} style={{ padding: 22, gap: 14 }}>
            <View style={{ alignSelf: 'center', alignItems: 'center', justifyContent: 'center', width: 82, height: 82 }}>
              <FriendsThemeIcon themeMode={themeMode} size={82} accessibilityLabel="Friend quest" />
            </View>
            <Text accessibilityRole="header" style={{ color: themeMode === 'olive' ? modalChrome.text : '#21170B', fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
              {L('Совместная миссия началась', 'Спільна місія почалася', 'Friend quest started', 'Misión con amigo iniciada', 'Missão conjunta iniciada', 'Nhiệm vụ bạn bè bắt đầu', 'Quest teman dimulai', 'Arkadaş görevi başladı', 'Misja ze znajomym rozpoczęta')}
            </Text>
            <Text style={{ color: themeMode === 'olive' ? modalChrome.mutedText : '#4E3B1D', fontSize: f.sub, lineHeight: f.sub + 5, textAlign: 'center' }}>
              {L('Наберите оба по 3000 XP за 24 часа и получите по 10 шардов и 1000 XP.', 'Наберіть обидва по 3000 XP за 24 години й отримайте по 10 шардів і 1000 XP.', 'Both of you need 3000 XP in 24 hours to earn 10 shards and 1000 XP each.', 'Ambos necesitáis 3000 XP en 24 horas para ganar 10 shards y 1000 XP cada uno.', 'Ambos precisam de 3000 XP em 24 horas para ganhar 10 shards e 1000 XP.', 'Cả hai cần 3000 XP trong 24 giờ để nhận 10 shards và 1000 XP.', 'Kumpulkan masing-masing 3000 XP dalam 24 jam untuk mendapat 10 shard dan 1000 XP.', '24 saatte ikiniz de 3000 XP toplayın, 10 shard ve 1000 XP kazanın.', 'Zdobądźcie po 3000 XP w 24 godziny, aby dostać po 10 shardów i 1000 XP.')}
            </Text>
            <TouchableOpacity activeOpacity={0.86} onPress={onClose} style={{ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: modalChrome.button }}>
              <Text style={{ color: '#241905', fontSize: f.sub, fontWeight: '900', textAlign: 'center' }}>
                {L('Вперёд', 'Уперед', 'Let’s go', 'Vamos', 'Vamos', 'Bắt đầu', 'Mulai', 'Başla', 'Start')}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

function FriendQuestCompletedModal({
  visible, onClose, L, f, themeMode,
}: {
  visible: boolean;
  onClose: () => void;
  L: (...args: string[]) => string;
  f: any;
  themeMode: ThemeMode;
}) {
  const modalChrome = friendQuestModalChrome(themeMode);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View accessibilityViewIsModal style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(9, 8, 12, 0.72)' }}>
        <View style={{ width: '100%', maxWidth: 372, borderRadius: 24, overflow: 'hidden', backgroundColor: modalChrome.panel, borderWidth: 0, borderColor: 'transparent', ...modalChrome.shadow }}>
          <LinearGradient colors={themeMode === 'olive' ? modalChrome.gradient : ['rgba(255,248,221,0.98)', 'rgba(52,199,89,0.24)']} style={{ padding: 22, gap: 14 }}>
            <View style={{ width: 66, height: 66, borderRadius: 22, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#19351F' }}>
              <Ionicons name="sparkles-outline" size={38} color={'#B9F6C9'} />
            </View>
                <Text accessibilityRole="header" style={{ color: themeMode === 'olive' ? modalChrome.text : '#21170B', fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
              {L('Миссия выполнена', 'Місію виконано', 'Quest complete', 'Misión completada', 'Missão concluída', 'Hoàn thành nhiệm vụ', 'Quest selesai', 'Görev tamamlandı', 'Misja wykonana')}
            </Text>
            <Text style={{ color: themeMode === 'olive' ? modalChrome.mutedText : '#4E3B1D', fontSize: f.sub, lineHeight: f.sub + 5, textAlign: 'center' }}>
              {/* зачем (самоаудит, 2026-08-27): было «начислена вам обоим» — обращение
                  на «вы» (Правило 14), и валюта называлась старым словом «шарды»
                  вместо жемчуга. */}
              {L('Награда у обоих: 10 жемчужин и 1000 XP.', 'Нагорода в обох: 10 перлин і 1000 XP.', 'Reward for both: 10 pearls and 1000 XP.', 'Recompensa para ambos: 10 perlas y 1000 XP.', 'Recompensa para os dois: 10 pérolas e 1000 XP.', 'Cả hai đều nhận: 10 ngọc trai và 1000 XP.', 'Hadiah untuk berdua: 10 mutiara dan 1000 XP.', 'İkinize de ödül: 10 inci ve 1000 XP.', 'Nagroda dla obojga: 10 pereł i 1000 XP.')}
            </Text>
            <TouchableOpacity activeOpacity={0.86} onPress={onClose} style={{ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: themeMode === 'olive' ? modalChrome.button : '#34C759' }}>
              <Text style={{ color: '#071E0C', fontSize: f.sub, fontWeight: '900', textAlign: 'center' }}>
                {L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

// ── Add Friend Modal ──────────────────────────────────────────────────────────

const FRIEND_SEARCH_MAX_LENGTH = 32;

function normalizeFriendSearchInput(value: string): string {
  return String(value ?? '').normalize('NFKC').replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').slice(0, FRIEND_SEARCH_MAX_LENGTH);
}

function getFriendSearchQuery(value: string): string {
  return normalizeFriendSearchInput(value).trim();
}

function isFriendCodeQuery(value: string): boolean {
  const query = getFriendSearchQuery(value);
  return query.length === 6 && isValidInviteCodeLookup(query);
}

function isFriendSearchReady(value: string): boolean {
  const query = getFriendSearchQuery(value);
  return query.length >= 2 && query.length <= FRIEND_SEARCH_MAX_LENGTH;
}

function AddFriendModal({
  visible, onClose,
  codeInput, setCodeInput, isSearching, foundUser, searchError,
  isAdding, addFeedback, onSearch, onAddFound, onCloseFoundUser,
  lang, t, f, chrome, themeMode,
}: {
  visible: boolean; onClose: () => void;
  codeInput: string; setCodeInput: (v: string) => void;
  isSearching: boolean; foundUser: FriendProfile | null; searchError: string | null;
  isAdding: boolean; addFeedback: string | null;
  onSearch: () => void; onAddFound: () => void; onCloseFoundUser: () => void;
  lang: string; t: any; f: any;
  chrome: FriendsChrome;
  themeMode: ThemeMode;
}) {
  const L = (
    ru: string,
    uk: string,
    en: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang as any, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const searchReady = isFriendSearchReady(codeInput);
  const codeMode = isFriendCodeQuery(codeInput);
  // Юзер открыл шит «добавить друга» именно чтобы ввести имя — открываем
  // клавиатуру сами. Задержка ждёт выезд шторки (380мс): без неё фокус на
  // iOS теряется и клавиатура не поднимается.
  const searchInputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => searchInputRef.current?.focus(), 260);
    return () => clearTimeout(id);
  }, [visible]);
  // зачем: владелец (2026-07-26) — окно «Добавить друга» должно появляться ПОСРЕДИ
  // экрана и быть полностью независимым от клавиатуры: клавиатура выезжает под ним
  // и не двигает его. Раньше был нижний шит (ReferralSheetShell), который рос
  // паддингом под клавиатуру и визуально «поднимался». Каркас шита остался за
  // шитами рефералки, а здесь — отдельный центрированный CenteredDialogShell.
  return (
    <CenteredDialogShell
      visible={visible}
      onClose={onClose}
      testID="friends-add-sheet"
      title={L('Добавить друга', 'Додати друга', 'Add a friend', 'Agregar amigo', 'Adicionar amigo', 'Thêm bạn bè', 'Tambah teman', 'Arkadaş ekle', 'Dodaj znajomego')}
      closeLabel={L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
    >
      <View style={{ gap: 14, paddingBottom: 4 }}>
            <View
              testID="friends-code-search-card"
              style={{
                paddingTop: 2,
                gap: 10,
              }}
            >
              <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {L('Введи имя друга', 'Введи імʼя друга', 'Enter your friend\'s name', 'Ingresa el nombre de tu amigo', 'Digite o nome do amigo', 'Nhập tên bạn bè', 'Masukkan nama teman', 'Arkadaşının adını gir', 'Wpisz imię znajomego')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  ref={searchInputRef}
                  testID="friends-code-input"
                  accessibilityLabel={L('Введи имя друга', 'Введи імʼя друга', 'Enter your friend\'s name', 'Ingresa el nombre de tu amigo', 'Digite o nome do amigo', 'Nhập tên bạn bè', 'Masukkan nama teman', 'Arkadaşının adını gir', 'Wpisz imię znajomego')}
                  style={{
                    // зачем: без обводки (правило владельца) — поле отделяем тоном
                    // поверхности, а не рамкой.
                    flex: 1, backgroundColor: chrome.surface, borderRadius: 14,
                    minHeight: 58,
                    paddingHorizontal: 16, paddingVertical: 12,
                    fontSize: 20, fontWeight: '900', color: t.textPrimary,
                    letterSpacing: codeMode ? 4 : 0,
                  }}
                  placeholder=""
                  maxLength={FRIEND_SEARCH_MAX_LENGTH}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={codeInput}
                  onChangeText={v => {
                    setCodeInput(normalizeFriendSearchInput(v));
                    onCloseFoundUser();
                  }}
                  onSubmitEditing={onSearch}
                />
                <TapScale
                  testID="friends-search"
                  onPress={onSearch}
                  disabled={!searchReady || isSearching}
                  accessibilityRole="button"
                  accessibilityLabel={L('Найти друга по имени', 'Знайти друга за імʼям', 'Search for a friend by name', 'Buscar amigo por nombre', 'Encontrar amigo por nome', 'Tìm bạn theo tên', 'Cari teman dengan nama', 'Adıyla arkadaş bul', 'Znajdź znajomego po imieniu')}
                  style={{
                    minWidth: 58,
                    minHeight: 58,
                    backgroundColor: searchReady ? t.accent : chrome.button,
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: isSearching ? 0.6 : 1,
                  }}
                >
                  <Ionicons name={isSearching ? 'hourglass-outline' : 'search'} size={22} color={searchReady ? t.correctText : t.textMuted} />
                </TapScale>
              </View>
            </View>

            {searchError && (
              <View testID="friends-search-error" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="alert-circle-outline" size={16} color={'#FF6B6B'} />
                <Text style={{ color: '#FF6B6B', fontSize: f.sub }}>{searchError}</Text>
              </View>
            )}

            {/* Скелетон-shimmer на время поиска (opacity loop, UI-анимация). */}
            {isSearching && !foundUser && (
              <View testID="friends-search-skeleton" style={{ gap: 10 }}>
                {[0, 1].map((row) => (
                  <PulseOn key={row} active>
                    <View style={{
                      height: row === 0 ? 76 : 20,
                      borderRadius: 14,
                      backgroundColor: chrome.button,
                      width: row === 0 ? '100%' : '60%',
                    }} />
                  </PulseOn>
                ))}
              </View>
            )}

            {foundUser && (
              <Reanimated.View entering={FadeInDown.duration(280)}>
                <FoundUserCard
                  profile={foundUser} onAdd={onAddFound} onClose={onCloseFoundUser}
                  isAdding={isAdding} lang={lang} t={t} f={f} chrome={chrome}
                  themeMode={themeMode}
                />
              </Reanimated.View>
            )}

            {addFeedback && (
              <View testID="friends-add-feedback" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-circle-outline" size={16} color={t.correct} />
                <Text style={{ color: t.correct, fontSize: f.sub, fontWeight: '600' }}>{addFeedback}</Text>
              </View>
            )}
      </View>
    </CenteredDialogShell>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FriendsTabScreen() {
  const tabContentBottomPad = useTabContentBottomPad();
  const { theme: t, f, themeMode } = useTheme();
  const isOliveTheme = themeMode === 'olive';
  const { lang } = useLang();
  const router = useRouter();
  const socialParams = useLocalSearchParams<{ focusFriend?: string; socialEventId?: string }>();
  const { goHome, focusTick, runtimeOwnerId } = useTabNav();
  const friendsTabVisible = runtimeOwnerId === 'friends';
  const friendsRuntimeActive = useRuntimeActive(friendsTabVisible);

  // ── «Вместе» (friends_together) — состояние UI-слоя, целиком за флагом ─────
  const friendsTogetherPolicy = useFriendsTogetherEnabled();
  // Диск и память прогреваются ниже только после определения текущего stable uid;
  // не рисуем модульный снапшот вслепую при смене аккаунта.
  const [togetherSnapshot, setTogetherSnapshot] = useState<FriendsTogetherSnapshot | null>(null);
  const [myWeeklyStats, setMyWeeklyStats] = useState<{ weeklyXp: number; activeDaysThisWeek: number; weekKey: string } | null>(null);
  const [chestClaimedWeekKey, setChestClaimedWeekKey] = useState<string | null>(null);
  const [togetherSheetSession, setTogetherSheetSession] = useState<FriendSheetSession<FriendProfile> | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<{ friendUid: string; level: number; starsGranted: number } | null>(null);
  const [chestModal, setChestModal] = useState<{ tier: number; starsGranted: number; xpBoostMinutes: number; xpGranted: number; energyRefilled: boolean; streakShield: boolean; aura: boolean } | null>(null);
  const [chestClaimBusy, setChestClaimBusy] = useState(false);
  const [friendEvents, setFriendEvents] = useState<FriendSocialEvent[]>([]);
  const [friendMarkerClockMs, setFriendMarkerClockMs] = useState(Date.now());
  const [studyInvite, setStudyInvite] = useState<{ event: FriendSocialEvent; friendName: string } | null>(null);

  const [levelClaimBusy, setLevelClaimBusy] = useState(false);
  const [optimisticNudgedUids, setOptimisticNudgedUids] = useState<Set<string>>(() => new Set());
  const [nudgedTick, setNudgedTick] = useState(0);
  const levelUpShownRef = useRef<Set<string>>(new Set());

  // DEV-only: боты «Вместе» — сквозная ручная проверка без реальных друзей и без
  // единого чтения/записи Firestore (owner, 2026-08-17). Полностью выпадает из
  // сборки для не-__DEV__: и sheet, и state отсекаются условием ниже.
  const [devBotsSheetOpen, setDevBotsSheetOpen] = useState(false);
  const [devBotsState, setDevBotsState] = useState<DevBotsState>({ bots: [], chestScenarioTier: 0, chestOpenedTier: 0 });
  const devBots = devBotsState.bots;
  const friendsTogetherUiEnabled = friendsTogetherPolicy.enabled || (ENABLE_DEV_TOOLS && devBots.length > 0);
  const friendMarkersByUid = useMemo(() => {
    const grouped = new Map<string, FriendSocialEvent[]>();
    for (const event of friendEvents) grouped.set(event.actorStableUid, [...(grouped.get(event.actorStableUid) ?? []), event]);
    const selected = new Map<string, FriendSocialEvent>();
    grouped.forEach((events, uid) => {
      const marker = selectFriendMarker(events, Math.max(friendMarkerClockMs, Date.now()));
      if (marker) selected.set(uid, marker);
    });
    return selected;
  }, [friendEvents, friendMarkerClockMs]);

  useEffect(() => {
    if (!friendsRuntimeActive) return undefined;
    const nowMs = Date.now();
    const expiresAtMs = nextFriendMarkerExpiryMs(friendEvents, nowMs);
    if (expiresAtMs === null) return undefined;
    const timer = setTimeout(
      () => setFriendMarkerClockMs(Date.now()),
      Math.max(0, expiresAtMs - nowMs + 25),
    );
    return () => clearTimeout(timer);
  }, [friendEvents, friendMarkerClockMs, friendsRuntimeActive]);

  useEffect(() => {
    if (!friendsRuntimeActive) return;
    let cancelled = false;
    const apply = (rows: Awaited<ReturnType<typeof readCachedUserNotifications>>) => {
      if (!cancelled) setFriendEvents(friendSocialEventsFromNotifications(rows));
    };
    void readCachedUserNotifications().then(apply);
    void refreshUserNotificationsOnce({ minIntervalMs: 30_000 }).then(apply);
    return () => { cancelled = true; };
  }, [focusTick, friendsRuntimeActive]);
  useEffect(() => {
    if (!ENABLE_DEV_TOOLS) return;
    void loadDevBots().then(setDevBotsState);
  }, []);

  useEffect(() => {
    if (!friendsTogetherPolicy.enabled) return;
    void primeFriendsTogetherSnapshot().then((snap) => { if (snap) setTogetherSnapshot(snap); });
    void primeNudgedTodayCache().then(() => setNudgedTick((n) => n + 1));
  }, [friendsTogetherPolicy.enabled]);

  // Мои недельные XP/дни — читаются раз при фокусе вкладки (не листенер, не таймер).
  useEffect(() => {
    if (!friendsTogetherPolicy.enabled || !friendsRuntimeActive) return;
    let cancelled = false;
    void (async () => {
      try {
        const weekKey = getWeekKey(new Date());
        const [weeklyXp, myActiveDaysRaw, claimedWeekKey] = await Promise.all([
          getMyWeekPoints(),
          AsyncStorage.getItem('active_days_v1'),
          readWeeklyChestClaimedWeekKey(weekKey),
        ]);
        if (cancelled) return;
        let activeDaysThisWeek = 0;
        try {
          const parsed = myActiveDaysRaw ? JSON.parse(myActiveDaysRaw) : null;
          if (parsed?.anchor && typeof parsed.bits === 'string') {
            const dates = decodeActiveDays({ anchor: parsed.anchor, bits: parsed.bits });
            const now = new Date();
            const day = now.getUTCDay() || 7;
            const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1));
            for (const d of dates) {
              const dMs = Date.parse(`${d}T00:00:00.000Z`);
              if (Number.isFinite(dMs) && dMs >= monday.getTime()) activeDaysThisWeek += 1;
            }
          }
        } catch { /* дефолт 0 активных дней */ }
        setMyWeeklyStats({ weeklyXp, activeDaysThisWeek, weekKey });
        setChestClaimedWeekKey(claimedWeekKey);
      } catch { /* офлайн — сундук останется locked до следующего фокуса */ }
    })();
    return () => { cancelled = true; };
  }, [friendsTogetherPolicy.enabled, friendsRuntimeActive, focusTick]);

  const weeklyChestModel: WeeklyChestModel | null = useMemo(() => {
    const devScenarioTier = ENABLE_DEV_TOOLS ? devBotsState.chestScenarioTier : 0;
    if (!friendsTogetherUiEnabled || (!togetherSnapshot && devBots.length === 0) || (!myWeeklyStats && devScenarioTier === 0)) return null;
    const weekStats = myWeeklyStats ?? { weeklyXp: 0, activeDaysThisWeek: 0, weekKey: getWeekKey(new Date()) };
    const friendsInput = Object.values(togetherSnapshot?.pairs ?? {}).map((p: FriendTogetherPairState) => ({
      uid: p.friendUid,
      weeklyXp: p.weeklyXp,
      pairLevel: p.level,
      boostActive: p.boostActive,
    }));
    // DEV-only: боты подмешиваются в тот же вход модели сундука — не трогают
    // togetherSnapshot (реальные пары), исчезают вместе с __DEV__ в проде.
    if (ENABLE_DEV_TOOLS && devBots.length > 0) {
      for (const b of devBots) {
        friendsInput.push({ uid: b.uid, weeklyXp: b.weeklyXp, pairLevel: levelForDaysDev(b.days, friendsTogetherPolicy.config.levelThresholds), boostActive: false });
      }
    }
    return buildWeeklyChestModel({
      friends: friendsInput,
      myDays: devScenarioTier > 0 ? Math.max(5, weekStats.activeDaysThisWeek) : weekStats.activeDaysThisWeek,
      myWeeklyXp: devScenarioTier > 0 ? Math.max(1000, weekStats.weeklyXp) : weekStats.weeklyXp,
      weekKey: weekStats.weekKey,
      claimedWeekKey: devScenarioTier > 0 && devBotsState.chestOpenedTier > 0 ? weekStats.weekKey : chestClaimedWeekKey,
      isClaimDay: devScenarioTier > 0 ? true : undefined,
      config: friendsTogetherPolicy.config,
    });
  }, [friendsTogetherUiEnabled, friendsTogetherPolicy.config, togetherSnapshot, myWeeklyStats, chestClaimedWeekKey, devBots, devBotsState.chestScenarioTier, devBotsState.chestOpenedTier]);

  // Уровень дружбы вырос с последнего клейма — открыть модалку один раз на пару+уровень.
  useEffect(() => {
    if (!friendsTogetherPolicy.enabled || !togetherSnapshot || levelUpModal) return;
    for (const pair of Object.values(togetherSnapshot.pairs) as FriendTogetherPairState[]) {
      if (pair.level > pair.claimedLevel && pair.level >= 2) {
        const key = `${pair.friendUid}:${pair.level}`;
        if (levelUpShownRef.current.has(key)) continue;
        levelUpShownRef.current.add(key);
        setLevelUpModal({ friendUid: pair.friendUid, level: pair.level, starsGranted: starRewardForLevelRange(pair.claimedLevel, pair.level) });
        break; // одна модалка за раз — не наваливаем каскад окон
      }
    }
  }, [friendsTogetherPolicy.enabled, togetherSnapshot, levelUpModal]);

  const [myProfile, setMyProfile] = useState<{
    name: string; avatar: string; frame: string; aura?: string; totalXP: number; streak: number | null;
  } | null>(null);

  const handleClaimFriendLevel = useCallback(async () => {
    if (!levelUpModal || levelClaimBusy) return;
    const { friendUid, level } = levelUpModal;
    setLevelClaimBusy(true);
    try {
      const result = await claimFriendLevel(friendUid, level);
      if (result.ok) {
        setLevelUpModal(null);
      } else {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Не удалось забрать награду — попробуй ещё раз',
          messageUk: 'Не вдалося забрати нагороду — спробуй ще раз',
          messageEs: 'No se pudo reclamar la recompensa. Inténtalo de nuevo',
          messagePtBr: 'Não foi possível resgatar a recompensa. Tente novamente',
          messageVi: 'Không thể nhận phần thưởng — hãy thử lại',
          messageId: 'Hadiah gagal diambil — coba lagi',
          messageTr: 'Ödül alınamadı — tekrar dene',
          messagePl: 'Nie udało się odebrać nagrody — spróbuj ponownie',
        });
      }
    } finally {
      setLevelClaimBusy(false);
    }
  }, [levelClaimBusy, levelUpModal]);

  // DEV-only: обработчики панели ботов — каждый просто мутирует локальное
  // AsyncStorage-состояние ботов и перечитывает снапшот, ничего не шлёт в сеть.
  const handleDevAddBots = useCallback(async (count: number) => {
    const s = await addDevBots(count);
    setDevBotsState(s);
  }, []);
  const handleDevAdvanceAll = useCallback(async () => {
    const s = await advanceAllBots();
    setDevBotsState(s);
  }, []);
  const handleDevAdvanceOne = useCallback(async (uid: string) => {
    const s = await advanceBotDay(uid);
    setDevBotsState(s);
  }, []);
  const handleDevChestTier = useCallback(async (tier: 0 | 1 | 2 | 3) => {
    const s = await setChestScenario(tier);
    setDevBotsState(s);
  }, []);
  const handleDevIncomingNudge = useCallback(async (uid: string) => {
    const s = await simulateIncomingNudge(uid);
    setDevBotsState(s);
  }, []);
  const handleDevNudge = useCallback(async (uid: string) => {
    const s = await nudgeDevBot(uid);
    setDevBotsState(s);
  }, []);
  const handleDevGiftReady = useCallback(async (uid: string) => {
    const s = await markGiftReady(uid);
    setDevBotsState(s);
  }, []);
  const handleDevReset = useCallback(async () => {
    const s = await resetDevBots();
    setDevBotsState(s);
  }, []);
  const handleDevResetChest = useCallback(async () => {
    const s = await resetDevChestScenario();
    setDevBotsState(s);
  }, []);

  const handleClaimWeeklyChest = useCallback(async () => {
    if (!weeklyChestModel || !weeklyChestModel.canClaim || chestClaimBusy) return;
    if (ENABLE_DEV_TOOLS && devBotsState.chestScenarioTier > 0) {
      const devResult = await openDevChestScenario();
      setDevBotsState(devResult.state);
      if (!devResult.opened) return;
      const tier = weeklyChestModel.tier;
      // зачем: DEV-витрина обязана показывать РОВНО серверную шкалу
      // (functions/src/friends_together.ts → CHEST_RUNES_BY_TIER и соседи),
      // иначе владелец проверяет глазами одну награду, а игрок получает другую.
      setChestModal({
        tier,
        starsGranted: tier >= 3 ? 175 : tier >= 2 ? 50 : 15,
        xpBoostMinutes: tier >= 3 ? 120 : tier >= 2 ? 60 : 30,
        xpGranted: tier >= 3 ? 2000 : tier >= 2 ? 1000 : 500,
        energyRefilled: tier >= 2,
        streakShield: tier >= 2,
        aura: tier >= 3,
      });
      return;
    }
    setChestClaimBusy(true);
    try {
      const result = await claimWeeklyChest(weeklyChestModel.weekKey);
      if (result.ok) {
        setChestClaimedWeekKey(weeklyChestModel.weekKey);
        setChestModal({
          tier: weeklyChestModel.tier,
          starsGranted: result.rewards.starsGranted,
          xpBoostMinutes: result.rewards.xpBoostMinutes,
          xpGranted: result.rewards.xpGranted,
          energyRefilled: result.rewards.energyRefilled,
          streakShield: result.rewards.streakShield,
          aura: result.rewards.aura,
        });
        // зачем: опыт и энергия живут на устройстве — сервер их только
        // объявляет. Применяем локально и не ждём: модалка уже открыта,
        // шкала и счётчик догоняют в том же кадре (optimistic).
        //
        // зачем вызываем и при alreadyClaimed (владелец, 2026-08-26): раньше
        // повторный ответ сервера ПРОПУСКАЛ выдачу, потому что замок применения
        // жил в памяти запуска. Из-за этого опыт терялся навсегда, если
        // приложение убили между ответом сервера и начислением: сервер уже
        // считал сундук выданным, а на устройстве не начислилось ничего.
        // Теперь замок персистентный и ставится только после успеха
        // (app/friends_together/chest_reward_apply.ts), поэтому повторный вызов
        // безопасен: успешную выдачу он не продублирует, а прерванную — доведёт.
        void applyChestRewardsLocally({
          weekKey: weeklyChestModel.weekKey,
          xpGranted: result.rewards.xpGranted,
          energyRefilled: result.rewards.energyRefilled,
          userName: myProfile?.name ?? '',
          lang,
        });
      } else {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Не удалось открыть сундук',
          messageUk: 'Не вдалося відкрити скриню',
          messageEs: 'No se pudo abrir el cofre',
          messagePtBr: 'Não foi possível abrir o baú',
          messageVi: 'Không mở được rương',
          messageId: 'Gagal membuka peti',
          messageTr: 'Sandık açılamadı',
          messagePl: 'Nie udało się otworzyć skrzyni',
        });
      }
    } catch (error) {
      // зачем (аудит 2026-08-26): раньше здесь не было catch вовсе — при обрыве сети
      // сундук не открывался молча. Отказ сервера сообщался, а исключение — нет.
      void import('../debug-logger')
        .then(({ DebugLogger }) => DebugLogger.error('friends.tsx:handleClaimWeeklyChest', error, 'warning'))
        .catch(() => {});
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось открыть сундук. Проверь связь и попробуй ещё раз.',
        messageUk: 'Не вдалося відкрити скриню. Перевір зв’язок і спробуй ще раз.',
        messageEs: 'No se pudo abrir el cofre. Revisa la conexión e inténtalo de nuevo.',
        messagePtBr: 'Não foi possível abrir o baú. Verifique a conexão e tente de novo.',
        messageVi: 'Không mở được rương. Hãy kiểm tra kết nối và thử lại.',
        messageId: 'Gagal membuka peti. Periksa koneksi dan coba lagi.',
        messageTr: 'Sandık açılamadı. Bağlantını kontrol et ve tekrar dene.',
        messagePl: 'Nie udało się otworzyć skrzyni. Sprawdź połączenie i spróbuj ponownie.',
      });
    } finally {
      setChestClaimBusy(false);
    }
  }, [weeklyChestModel, chestClaimBusy, devBotsState.chestScenarioTier, myProfile?.name, lang]);

  const NUDGE_ERROR_TEXT: Record<NudgeErrorReason, { ru: string; uk: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string }> = {
    disabled: { ru: 'Друг отключил зовы', uk: 'Друг вимкнув кличі', es: 'Tu amigo desactivó las llamadas', ptBr: 'Seu amigo desativou os chamados', vi: 'Bạn đã tắt lời gọi', id: 'Teman menonaktifkan panggilan', tr: 'Arkadaşın çağrıları kapattı', pl: 'Znajomy wyłączył wołania' },
    quiet_hours: { ru: 'У друга тихие часы', uk: 'У друга тихі години', es: 'Tu amigo está en horas de silencio', ptBr: 'Seu amigo está no horário silencioso', vi: 'Bạn đang trong giờ yên tĩnh', id: 'Teman sedang jam tenang', tr: 'Arkadaşının sessiz saatleri', pl: 'Znajomy ma ciche godziny' },
    daily_limit: { ru: 'Сегодня уже звал', uk: 'Сьогодні вже кликав', es: 'Ya llamaste hoy', ptBr: 'Você já chamou hoje', vi: 'Hôm nay đã gọi rồi', id: 'Sudah memanggil hari ini', tr: 'Bugün zaten çağırdın', pl: 'Dziś już wołałeś' },
    sender_limit: { ru: 'Сегодня уже звал', uk: 'Сьогодні вже кликав', es: 'Ya llamaste hoy', ptBr: 'Você já chamou hoje', vi: 'Hôm nay đã gọi rồi', id: 'Sudah memanggil hari ini', tr: 'Bugün zaten çağırdın', pl: 'Dziś już wołałeś' },
    receiver_limit: { ru: 'Друг сегодня уже занят зовами', uk: 'Друга сьогодні вже кликали', es: 'Tu amigo ya recibió llamadas hoy', ptBr: 'Seu amigo já recebeu chamados hoje', vi: 'Bạn đã nhận đủ lời gọi hôm nay', id: 'Teman sudah menerima panggilan hari ini', tr: 'Arkadaşın bugün zaten çağrıldı', pl: 'Znajomy ma już dość wołań dziś' },
    not_friends: { ru: 'Это уже не друг', uk: 'Це вже не друг', es: 'Ya no son amigos', ptBr: 'Vocês não são mais amigos', vi: 'Không còn là bạn bè', id: 'Bukan teman lagi', tr: 'Artık arkadaş değil', pl: 'To już nie znajomy' },
    network: { ru: 'Нет сети — попробуй ещё раз', uk: 'Немає мережі — спробуй ще раз', es: 'Sin conexión — inténtalo de nuevo', ptBr: 'Sem conexão — tente novamente', vi: 'Không có mạng — thử lại nhé', id: 'Tidak ada jaringan — coba lagi', tr: 'Bağlantı yok — tekrar dene', pl: 'Brak sieci — spróbuj ponownie' },
  };

  const handleNudgeFriend = useCallback(async (friendUid: string, friendName: string) => {
    setOptimisticNudgedUids((current) => new Set(current).add(friendUid));
    const result = await nudgeFriend(friendUid);
    setNudgedTick((n) => n + 1);
    if (!result.ok) {
      if (!isNudgedToday(friendUid)) {
        setOptimisticNudgedUids((current) => {
          const next = new Set(current);
          next.delete(friendUid);
          return next;
        });
      }
      const texts = NUDGE_ERROR_TEXT[result.reason];
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: texts.ru, messageUk: texts.uk, messageEs: texts.es, messagePtBr: texts.ptBr,
        messageVi: texts.vi, messageId: texts.id, messageTr: texts.tr, messagePl: texts.pl,
      });
      return;
    }
    emitAppEvent('action_toast', {
      type: 'success',
      messageRu: `Позвал ${friendName}`,
      messageUk: `Покликав ${friendName}`,
      messageEs: `Llamaste a ${friendName}`,
      messagePtBr: `Você chamou ${friendName}`,
      messageVi: `Đã gọi ${friendName}`,
      messageId: `Memanggil ${friendName}`,
      messageTr: `${friendName} çağrıldı`,
      messagePl: `Zawołano ${friendName}`,
    });
  }, []);

  const insets = useStableSafeAreaInsets();
  const topFadeScroll = useTopFadeScroll();
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const handleFriendsScroll = useCallback((e: any) => {
    topFadeScroll?.onScroll?.(e);
    onBouncyScroll(e);
  }, [onBouncyScroll, topFadeScroll]);
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const chrome = useMemo(() => makeFriendsChrome(themeMode, t), [themeMode, t]);
  // зачем: мягкие альфы стекла рассчитаны на светлый фон; проверка была только на
  const lightGlass = isLightThemeMode(themeMode);
  const friendGiftSheetColors = friendGiftModalChrome(themeMode) ?? [
    glassFill(t.accent, lightGlass ? 0.10 : 0.18),
    chrome.card,
    chrome.cardSoft,
  ] as [string, string, string];
  const friendGiftPillColors = [
    glassFill(t.accent, lightGlass ? 0.12 : 0.20),
    chrome.surface,
    chrome.card,
  ] as [string, string, string];
  const L = useCallback((
    ru: string,
    uk: string,
    en: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang as any, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl }), [lang]);

  /** Только код из `ensure…` — без старого кеша первым кадром (не мигать «чужим» кодом). */
  const [myCode, setMyCode] = useState<string | null>(null);
  const [friendCodeLoadError, setFriendCodeLoadError] = useState(false);

  // ── Реферал: накопленные дни доступа + модалки активации/окончания ──────────
  const referralAccountToken = captureAccountGeneration();
  const referralAccountKey = accountScopeKey(referralAccountToken);
  const warmReferralState = peekClaimableReferralState();
  const warmReferralInvites = readReferralInvites(referralAccountToken);
  const warmReferralDrain = readReferralDrain(referralAccountToken);
  const [referralInviteState, setReferralInvites] = useState<ReferralInvite[]>(() => (
    warmReferralInvites?.value ?? warmReferralState?.invites ?? []
  ));
  const [referralDrain, setReferralDrain] = useState(() => warmReferralDrain?.value ?? warmReferralState?.drain ?? {
    softEnabled: true,
    emergencyStop: false,
    serverNowMs: 0,
    activePendingCount: 0,
    claimableQualifiedCount: 0,
    availableCreditCount: 0,
    latestPendingDeadlineMs: 0,
    earliestCreditExpiryMs: 0,
  });
  const [hasReferralServerDrain, setHasReferralServerDrain] = useState(() => (
    !!warmReferralDrain || !!warmReferralState
  ));
  const [referralStateAccountKey, setReferralStateAccountKey] = useState<string | null>(() => (
    referralAccountKey
  ));
  const [accessEndedOpen, setAccessEndedOpen] = useState(false);
  /** РЕФЕРАЛЬНЫЙ код (referral_codes) — отдельный от friend-кода (myCode). Для «Пригласить». */
  const [referralCodeState, setReferralCode] = useState<string | null>(null);
  const [referralCodeAccountKey, setReferralCodeAccountKey] = useState<string | null>(() => (
    referralAccountKey
  ));
  const referralEnabled = isReferralCloudEnabled();
  const roulettePolicy = useReferralRoulettePolicy();
  const scopedReferralState = selectAccountScopedReferralState(referralAccountKey, {
    accountKey: referralStateAccountKey,
    invites: referralInviteState,
    drain: hasReferralServerDrain ? referralDrain : null,
  });
  const referralCode = selectAccountScopedReferralState(referralAccountKey, {
    accountKey: referralCodeAccountKey,
    referralCode: referralCodeState,
  }).referralCode;
  const referralSurface = selectReferralSurfaceState({
    referralEnabled,
    remotePolicy: roulettePolicy,
    persistedDrain: scopedReferralState.drain,
  });
  const referralMarketingVisible = referralSurface.marketingVisible;
  const referralRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const referralLastRefreshAtRef = useRef(0);
  const friendsRuntimeActiveRef = useRef(friendsRuntimeActive);
  const referralRuntimeGenerationRef = useRef(0);
  const referralRefreshDirtyRef = useRef(false);
  const inviteCodeDirtyRef = useRef(false);
  friendsRuntimeActiveRef.current = friendsRuntimeActive;
  useEffect(() => {
    if (!friendsRuntimeActive) {
      referralRuntimeGenerationRef.current += 1;
      referralRefreshDirtyRef.current = true;
      referralRefreshInFlightRef.current = null;
    }
  }, [friendsRuntimeActive]);

  useEffect(() => {
    const token = captureAccountGeneration();
    if (!isReferralAccountRequestCurrent(token, referralAccountKey)) {
      setReferralInvites([]);
      setHasReferralServerDrain(false);
      return;
    }
    setReferralStateAccountKey(referralAccountKey);
    setReferralInvites(readReferralInvites(token)?.value ?? []);
    const nextDrain = readReferralDrain(token)?.value;
    setHasReferralServerDrain(!!nextDrain);
    setReferralDrain(nextDrain ?? {
      softEnabled: roulettePolicy.softEnabled,
      emergencyStop: roulettePolicy.emergencyStop,
      serverNowMs: 0,
      activePendingCount: 0,
      claimableQualifiedCount: 0,
      availableCreditCount: 0,
      latestPendingDeadlineMs: 0,
      earliestCreditExpiryMs: 0,
    });
  }, [referralAccountKey, roulettePolicy.emergencyStop, roulettePolicy.softEnabled]);

  const refreshReferralState = useCallback(async (options: { force?: boolean } = {}) => {
    if (!friendsRuntimeActiveRef.current) {
      referralRefreshDirtyRef.current = true;
      return;
    }
    if (!referralEnabled || referralSurface.emergencyStop) return;
    const now = Date.now();
    if (!options.force && now - referralLastRefreshAtRef.current < FRIENDS_REFERRAL_REFRESH_TTL_MS) return;
    if (referralRefreshInFlightRef.current) return referralRefreshInFlightRef.current;
    referralLastRefreshAtRef.current = now;
    const requestToken = captureAccountGeneration();
    const runtimeGeneration = referralRuntimeGenerationRef.current;
    const isCurrentRequest = () => {
      const current = friendsRuntimeActiveRef.current
      && runtimeGeneration === referralRuntimeGenerationRef.current
      && isReferralAccountRequestCurrent(requestToken, referralAccountKey);
      if (!current) referralRefreshDirtyRef.current = true;
      return current;
    };
    if (!isCurrentRequest()) return;
    referralRefreshDirtyRef.current = false;
    const task = (async () => {
    // Реферальный код (ensure на сервере). Без него «Пригласить» делилась бы friend-кодом,
    // которого нет в referral_codes → друг получал «код не найден» и наград не было (C1).
    if (referralMarketingVisible) try {
      // Кэш-код первым: серверный ensure только когда кода ещё нет, а не на каждый фокус таба.
      let rc = await getReferralCode();
      if (!isCurrentRequest()) return;
      if (!rc || rc.trim().length < 4) {
        await generateReferralCode(myProfile?.name ?? 'User');
        if (!isCurrentRequest()) return;
        rc = await getReferralCode();
        if (!isCurrentRequest()) return;
      }
      if (rc && rc.trim().length >= 4) {
        setReferralCodeAccountKey(accountScopeKey(requestToken));
        setReferralCode(rc.trim().toUpperCase());
      }
    } catch { /* нет auth_links / сети — добьём ретраем ниже (useEffect) */ }
    if (!isCurrentRequest()) return;
    const state = await getClaimableReferralState({ force: options.force });
    if (state.ok && isCurrentRequest()) {
      setReferralStateAccountKey(accountScopeKey(requestToken));
      setReferralInvites(prev => referralInvitesKey(prev) === referralInvitesKey(state.invites) ? prev : state.invites);
      setReferralDrain(current => JSON.stringify(current) === JSON.stringify(state.drain) ? current : state.drain);
      setHasReferralServerDrain(true);
    }
    if (!isCurrentRequest()) return;

    // Модал окончания: трекер сам определяет «реферальность» окна (стикки-маркер переживает
    // зануление vip_plan при истечении). Гейт по текущему плану здесь НЕ нужен — это и был баг.
    try {
      const vip = await readVipSnapshotForGeneration(requestToken);
      if (!isCurrentRequest()) return;
      const plan = vip?.vip_plan ?? '';
      const until = Number(vip?.vip_until ?? '0') || 0;
      const show = await shouldShowReferralAccessEnded(plan, until);
      if (show && isCurrentRequest()) setAccessEndedOpen(true);
    } catch { /* нет данных — пропускаем */ }
    })();
    const ownedTask = task.finally(() => {
      if (referralRefreshInFlightRef.current === ownedTask) referralRefreshInFlightRef.current = null;
    });
    referralRefreshInFlightRef.current = ownedTask;
    return ownedTask;
  }, [
    myProfile?.name,
    referralAccountKey,
    referralEnabled,
    referralMarketingVisible,
    referralSurface.emergencyStop,
    friendsRuntimeActive,
  ]);

  /** Закрыть модал окончания, пометив ровно то окно, для которого он показан (фикс BUG 2). */
  const dismissReferralAccessEnded = useCallback(async () => {
    const windowEnd = await getTrackedReferralWindowEnd();
    await markReferralAccessEndedSeen(windowEnd);
  }, []);

  /** Не пускать второй Share, пока первый ещё готовится/открыт (двойной тап = два шеринга). */
  const inviteShareBusyRef = useRef(false);
  const handleReferralInvite = useCallback(async () => {
    if (!referralMarketingVisible || inviteShareBusyRef.current) return;
    const requestToken = captureAccountGeneration();
    if (!isReferralAccountRequestCurrent(requestToken, referralAccountKey)) return;
    inviteShareBusyRef.current = true;
    hapticTap();
    try {
      const name = myProfile?.name ?? '';
      const share = await buildCloudReferralInviteShare({ lang, userName: name }).catch(() => null);
      if (!isReferralAccountRequestCurrent(requestToken, referralAccountKey)) return;
      if (share?.message) {
        await Share.share({ message: share.message });
      }
    } finally {
      inviteShareBusyRef.current = false;
    }
  }, [lang, myProfile?.name, referralAccountKey, referralMarketingVisible]);

  const [codeInput, setCodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FriendProfile | null>(null);
  // зачем: «один код» (решение владельца 2026-07-25) — если пользователь нашёл друга
  // по РЕФЕРАЛЬНОМУ коду, то при добавлении тот же ввод привязывает и приглашение.
  const lastLookupSourceRef = useRef<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const friendsSnapshot = useAppSnapshotSelector((snapshot) => snapshot.friends);
  const warmFriendsSnapshot = peekFriendsTabSwrWarm();
  const [friends, setFriends] = useState<FriendEntry[]>(() => warmFriendsSnapshot?.friends ?? friendsSnapshot?.friends ?? []);
  const [requests, setRequests] = useState<FriendRequestEntry[]>(() => warmFriendsSnapshot?.requests ?? friendsSnapshot?.requests ?? []);
  const [profiles, setProfiles] = useState<Record<string, FriendProfile>>(() => {
    // Модульный кеш переживает ремаунты — показываем мгновенно без async.
    const modCache = peekProfilesCache();
    const base: Record<string, FriendProfile> = {};
    for (const [uid, e] of Object.entries(modCache)) base[uid] = e.profile as FriendProfile;
    // Дополняем warm SWR profiles если modCache пустой (первый старт).
    const w = peekFriendsTabSwrWarm();
    if (w?.profiles) {
      for (const [uid, p] of Object.entries(w.profiles)) {
        if (!base[uid]) base[uid] = p as FriendProfile;
      }
    }
    if (friendsSnapshot?.profiles) {
      for (const [uid, p] of Object.entries(friendsSnapshot.profiles)) {
        if (!base[uid]) base[uid] = p as FriendProfile;
      }
    }
    return base;
  });

  useEffect(() => {
    const session = togetherSheetSession;
    if (!session) return;
    const currentDevBots = ENABLE_DEV_TOOLS ? devBots : [];
    if (isCurrentFriendSheetMember(session.uid, friends, currentDevBots)) return;
    setPendingTogetherSheetAction(null);
    if (!session.visible) return;
    setTogetherSheetSession(current => hideFriendSheetSession(current, session.uid));
  }, [devBots, friends, togetherSheetSession]);

  useEffect(() => {
    if (!friendsSnapshot) return;
    setFriends(prev => prev.length > 0 ? prev : friendsSnapshot.friends);
    setRequests(prev => prev.length > 0 ? prev : friendsSnapshot.requests);
    setProfiles(prev => {
      let changed = false;
      const next = { ...prev };
      for (const [uid, profile] of Object.entries(friendsSnapshot.profiles)) {
        if (!next[uid]) {
          next[uid] = profile as FriendProfile;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [friendsSnapshot]);

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ uid: string; name: string } | null>(null);
  const [giftTarget, setGiftTarget] = useState<FriendProfile | null>(null);
  const [pendingTogetherSheetAction, setPendingTogetherSheetAction] = useState<FriendSheetPendingAction<FriendProfile> | null>(null);
  const giftTargetRef = useRef<FriendProfile | null>(giftTarget);
  giftTargetRef.current = giftTarget;
  const giftRequestInFlightRef = useRef(false);
  const [giftBalance, setGiftBalance] = useState(() => peekLastKnownShardsBalance() ?? 0);
  const [giftBusyId, setGiftBusyId] = useState<FriendGiftId | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<FriendGiftId>(() => FRIEND_GIFT_CATALOG[0]?.id ?? 'chain_shield_1');
  const [giftSendFailedId, setGiftSendFailedId] = useState<FriendGiftId | null>(null);
  const [incomingGiftModal, setIncomingGiftModal] = useState<{ gifts: IncomingFriendGift[] } | null>(null);
  const [activeFriendQuest, setActiveFriendQuest] = useState<FriendQuest | null>(null);
  const [friendQuestStarted, setFriendQuestStarted] = useState<FriendQuest | null>(null);
  const [friendQuestCompleted, setFriendQuestCompleted] = useState<FriendQuest | null>(null);

  /** Анти-клин iOS: одновременный present двух <Modal> глушит тачи всего экрана («мёртвый экран»
   *  при серии быстрых тапов по карточке). Пока открыта/открывается одна модалка — вторую не пускаем. */
  const modalWedgeGuardRef = useRef(false);
  const [friendQuestBusy, setFriendQuestBusy] = useState(false);
  const friendQuestRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const friendQuestLastRefreshAtRef = useRef(0);

  const mountedRef = useRef(true);
  /** Был непустой список в SWR-кеше для текущего uid — блокируем пустой локальный onSnapshot Firestore. */
  const swrHadFriendsRef = useRef(false);
  /** Локальный кеш профилей с TTL — инициализируется из модульного peekProfilesCache() (переживает ремаунты). */
  const profilesCacheRef = useRef<Record<string, ProfileCacheEntry>>(peekProfilesCache());

  const syncMyInviteCode = useCallback(async (isCancelled: () => boolean = () => false) => {
    const stopped = () => !mountedRef.current || isCancelled();
    // Ретрай/бэкофф живёт внутри синглтона (dedupe с referrals.tsx — один сетевой проход).
    const code = await ensureMyInviteCodeForFriends('User');
    if (stopped()) return;
    if (code) {
      setMyCode(code);
      setFriendCodeLoadError(false);
    } else {
      setFriendCodeLoadError(true);
    }
  }, []);

  const retryFriendCode = useCallback(() => {
    hapticTap();
    setFriendCodeLoadError(false);
    void syncMyInviteCode();
  }, [syncMyInviteCode]);

  // ── My code + my data ──────────────────────────────────────────────────────

  // mountedRef живёт весь маунт экрана; табы не размонтируются при переключении.
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Локальный кеш остаётся частью премаунта: он даёт первый кадр без сети.
  useEffect(() => {
    void readCachedMyInviteCodeForFriends().then(cached => {
      if (mountedRef.current && cached) setMyCode(prev => prev ?? cached);
    });
  }, []);

  // Сетевое обслуживание стартует только для видимого таба. Иначе фоновый
  // премаунт запускал retry кода, профиль и Firestore cleanup, а их ответы продолжали
  // будить тяжёлое дерево friends после ухода на соседний таб.
  useEffect(() => {
    if (!friendsRuntimeActive) return;
    let cancelled = false;
    void syncMyInviteCode(() => cancelled);
    const task = InteractionManager.runAfterInteractions(() => {
      void fetchMyProfile().then(p => { if (!cancelled && mountedRef.current && p) setMyProfile(p); });
      // После prime диск прочитан, modCache обновлён — синхронизируем ref и state.
      void startFriendsTabSwrPrime().then(() => {
        if (cancelled || !mountedRef.current) return;
        const fresh = peekProfilesCache();
        profilesCacheRef.current = { ...fresh };
        setProfiles(prev => {
          const next = { ...prev };
          for (const [uid, e] of Object.entries(fresh)) {
            if (!next[uid]) next[uid] = e.profile as FriendProfile;
          }
          return next;
        });
      });
      void cleanupStaleFriendData();
    });
    return () => { cancelled = true; task.cancel(); };
  }, [friendsRuntimeActive, syncMyInviteCode]);

  useEffect(() => {
    if (!friendsRuntimeActive) return;
    const consume = () => {
      const gifts = friendsAccountStore.takeIncomingGifts();
      if (gifts.length > 0) setIncomingGiftModal({ gifts: [...gifts] });
    };
    return friendsAccountStore.subscribeIncomingGifts(consume);
  }, [friendsRuntimeActive]);

  const refreshFriendQuest = useCallback(async (
    cancelled?: { current: boolean },
    options: { force?: boolean } = {},
  ) => {
    const now = Date.now();
    if (!options.force && now - friendQuestLastRefreshAtRef.current < FRIENDS_QUEST_REFRESH_TTL_MS) return;
    if (friendQuestRefreshInFlightRef.current) return friendQuestRefreshInFlightRef.current;
    friendQuestLastRefreshAtRef.current = now;
    const task = (async () => {
      try {
        const res = await getActiveFriendQuest({ force: options.force });
        if (cancelled?.current) return;
        const next = res.quest && res.quest.status !== 'expired' && res.quest.status !== 'completed' ? res.quest : null;
        setActiveFriendQuest(prev => friendQuestKey(prev) === friendQuestKey(next) ? prev : next);
      } catch {
        if (!cancelled?.current) setActiveFriendQuest(prev => prev === null ? prev : null);
      }
    })();
    friendQuestRefreshInFlightRef.current = task.finally(() => {
      friendQuestRefreshInFlightRef.current = null;
    });
    return friendQuestRefreshInFlightRef.current;
  }, []);

  useEffect(() => {
    if (!friendsRuntimeActive) return;
    const cancelled = { current: false };
    void startFriendsTabSwrPrime();
    // Подарки/квесты/рефералка — после первого кадра списка, не залпом с подписками.
    const task = InteractionManager.runAfterInteractions(() => {
      void refreshFriendQuest(cancelled);
      const force = referralRefreshDirtyRef.current;
      referralRefreshDirtyRef.current = false;
      void refreshReferralState({ force });
    });
    return () => { cancelled.current = true; task.cancel(); };
  }, [friendsRuntimeActive, focusTick, refreshFriendQuest, refreshReferralState]);

  // Реф-код один раз создаётся и НАВСЕГДА закрепляется за аккаунтом в AsyncStorage
  // (REFERRAL_KEY) — поэтому при каждом монтировании/возврате на вкладку читаем его
  // СИНХРОННО из кеша и сразу вшиваем в текст. Без этого код стартовал с null и «моргал»:
  // пропадал при переключении вкладок и всплывал лишь через ~1.5 с после ответа сервера.
  useEffect(() => {
    invalidateInviteCodeShared(referralAccountKey);
    setReferralCodeAccountKey(referralAccountKey);
    setReferralCode(null);
  }, [referralAccountKey]);

  useEffect(() => {
    if (!referralMarketingVisible) return;
    let cancelled = false;
    const requestToken = captureAccountGeneration();
    void getReferralCode().then(rc => {
      if (
        !cancelled
        && rc
        && rc.trim().length >= 4
        && isReferralAccountRequestCurrent(requestToken, referralAccountKey)
      ) {
        setReferralCodeAccountKey(accountScopeKey(requestToken));
        setReferralCode(prev => prev ?? rc.trim().toUpperCase());
      }
    }).catch(() => { /* нет кеша — сетевой ретрай ниже добьёт первую генерацию */ });
    return () => { cancelled = true; };
  }, [referralAccountKey, referralMarketingVisible]);

  // Реф-код на свежей установке часто пуст: ensure-CF падает, пока auth_links не готовы
  // (та же холодная гонка, что и при резервации имени) — и в тексте «введёт ваш код __»
  // зияет пустота. refreshReferralState бьёт лишь раз на фокус, поэтому добиваем код
  // ограниченным ретраем с бэкоффом, пока он не появится (auth готовится за пару секунд).
  useEffect(() => {
    if (!friendsRuntimeActive || !referralMarketingVisible || referralCode) return;
    let cancelled = false;
    const requestToken = captureAccountGeneration();
    const runtimeGeneration = referralRuntimeGenerationRef.current;
    const isCurrentRequest = () => !cancelled
      && friendsRuntimeActiveRef.current
      && runtimeGeneration === referralRuntimeGenerationRef.current
      && isReferralAccountRequestCurrent(requestToken, referralAccountKey);
    const lease = acquireInviteCodeShared(myProfile?.name ?? 'User');
    void lease.promise.then(code => {
      if (
        isCurrentRequest()
        && code
      ) {
        inviteCodeDirtyRef.current = false;
        setReferralCodeAccountKey(accountScopeKey(requestToken));
        setReferralCode(code);
      } else if (!isCurrentRequest()) {
        inviteCodeDirtyRef.current = true;
      }
    });
    return () => {
      cancelled = true;
      inviteCodeDirtyRef.current = true;
      lease.release();
    };
  }, [friendsRuntimeActive, referralAccountKey, referralMarketingVisible, referralCode, myProfile?.name]);

  // ── Кеш с устройства → подписки: сначала SWR, затем live; пустой кеш Firestore не затирает SWR.
  // ──

  useEffect(() => {
    if (!friendsRuntimeActive) return;
    let cancelled = false;
    let unsubFriends: () => void = () => {};
    let unsubRequests: () => void = () => {};

    void (async () => {
      await startFriendsTabSwrPrime();
      if (cancelled) return;

      let canonical: string | null = null;
      try {
        canonical = await getCanonicalUserId();
      } catch {
        canonical = null;
      }
      if (cancelled) return;

      // После prime модульный кеш уже заполнен — не читаем диск снова (async лишний раунд).
      const profilesCache = peekProfilesCache();
      profilesCacheRef.current = { ...profilesCache };

      const w = peekFriendsTabSwrWarm();

      if (canonical && w && w.canonicalUid === canonical) {
        swrHadFriendsRef.current = w.friends.length > 0;
        setFriends(w.friends);
        if (w.friends.length > 0) {
          void checkAchievements({ type: 'friend_added', totalFriends: w.friends.length }).catch(() => {});
        }
        setRequests(w.requests);
        const fromWarmProf = (w.profiles as Record<string, FriendProfile>) ?? {};
        const allUids = [
          ...w.friends.map(f => f.uid),
          ...w.requests.map(r => r.fromUid),
        ];
        const merged: Record<string, FriendProfile> = { ...fromWarmProf };
        for (const uid of allUids) {
          const e = profilesCache[uid];
          if (e?.profile) merged[uid] = e.profile as FriendProfile;
        }
        if (Object.keys(merged).length > 0) setProfiles(merged);
      } else if (canonical && w && w.canonicalUid !== canonical) {
        setFriends([]);
        setRequests([]);
        setProfiles({});
        swrHadFriendsRef.current = false;
      }

      unsubFriends = friendsAccountStore.subscribe((data, meta) => {
        if (cancelled) return;
        const fromCache = meta?.fromCache === true;
        if (data.length === 0 && fromCache && swrHadFriendsRef.current) return;
        setFriends(data);
        if (data.length > 0) {
          void checkAchievements({ type: 'friend_added', totalFriends: data.length }).catch(() => {});
        }
      });

      unsubRequests = subscribeToIncomingRequests(
        data => { if (!cancelled) setRequests(data); },
        () => {},
      );
    })();

    return () => {
      cancelled = true;
      unsubFriends();
      unsubRequests();
    };
  }, [friendsRuntimeActive]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const uid = await getCanonicalUserId();
          if (!uid) return;
          // Сохраняем только friends+requests — профили хранятся в отдельном кеше с TTL.
          await AsyncStorage.setItem(
            FRIENDS_TAB_SWR_CACHE_KEY,
            JSON.stringify({ canonicalUid: uid, friends, requests, savedAt: Date.now() }),
          );
          memoryUpsertFriendsTabSwr(uid, friends, requests);
        } catch {
          /* ignore */
        }
      })();
    }, 450);
    return () => clearTimeout(timer);
  }, [friends, requests]);

  // ── Profile loading ────────────────────────────────────────────────────────

  useEffect(() => {
    const uids = [...new Set([...friends.map(f => f.uid), ...requests.map(r => r.fromUid)])];
    if (!friendsRuntimeActive || uids.length === 0) return;
    let cancelled = false;
    void (async () => {
      // profilesCacheRef.current уже загружен с диска при монтировании — не читаем снова
      const { fresh, updatedCache } = await loadProfiles(uids, profilesCacheRef.current);
      if (cancelled) return;
      profilesCacheRef.current = updatedCache;
      setProfiles(prev => {
        const next = { ...prev, ...fresh };
        return next;
      });
      // «Вместе» (G, ТЗ): пересчёт снапшота пар из тех же профилей друзей —
      // fetchFriendProfilesBatch(uids) сейчас 100% попадает в TTL-кэш (loadProfiles
      // выше только что его прогрел), поэтому это НЕ второе сетевое чтение.
      // friend_pairs освежается своим отдельным кэшем 6ч внутри together_store.
      if (friendsTogetherPolicy.enabled) {
        void (async () => {
          try {
            const friendUids = friends.map(f => f.uid);
            if (friendUids.length === 0) return;
            const batchMap = await fetchFriendProfilesBatch(friendUids);
            if (cancelled) return;
            const records = friendUids
              .map((uid) => batchMap[uid])
              .filter((r): r is FriendProfileBatchRecord => !!r);
            await refreshFriendsTogether(records);
            if (cancelled) return;
            setTogetherSnapshot(getFriendsTogetherSnapshot());
          } catch { /* best-effort — снапшот остаётся прежним/пустым */ }
        })();
      }
    })();
    return () => { cancelled = true; };
  }, [friends, requests, friendsRuntimeActive, focusTick, friendsTogetherPolicy.enabled]);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const showFeedback = useCallback((msg: string) => {
    setAddFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setAddFeedback(null), 2500);
  }, []);

  const handleSearch = useCallback(async () => {
    const query = getFriendSearchQuery(codeInput);
    if (!isFriendSearchReady(query) || isSearching) return;
    hapticTap();
    Keyboard.dismiss();
    setIsSearching(true);
    setFoundUser(null);
    setSearchError(null);
    try {
      const isCode = isFriendCodeQuery(query);
      const codeUpper = normalizeInviteCodeInput(query);
      await trackActivity('friends:search_start', {
        feature: 'friends',
        screen: 'friends',
        result: 'start',
        tags: { queryLength: query.length, queryType: isCode ? 'code' : 'nickname' },
      });
      if (!isCode) {
        const localProfile = findLocalFriendProfileByName(query, profiles, friends, requests);
        if (localProfile) {
          setFoundUser(localProfile);
          await trackActivity('friends:search_result', {
            feature: 'friends',
            screen: 'friends',
            result: 'success',
            tags: { targetUid: localProfile.uid, profileLoaded: true, queryType: 'nickname', source: 'local_cache' },
          });
          return;
        }
      }
      const result = isCode ? await lookupUserByFriendCode(codeUpper) : await lookupUserByNickname(query);
      lastLookupSourceRef.current = result?.source ?? null;
      if (!result) {
        await trackActivity('friends:search_result', {
          feature: 'friends',
          screen: 'friends',
          result: 'blocked',
          tags: { reason: 'not_found', queryLength: query.length, queryType: isCode ? 'code' : 'nickname' },
        });
        setSearchError(L('Пользователь с таким кодом или ником не найден', 'Користувача з таким кодом або ніком не знайдено', 'No user found with that code or nickname', 'No se encontró usuario con ese código o nick', 'Nenhum usuário encontrado com esse código ou nick', 'Không tìm thấy người dùng với mã hoặc tên này', 'Pengguna dengan kode atau nama ini tidak ditemukan', 'Bu kod veya adla kullanıcı bulunamadı', 'Nie znaleziono użytkownika z tym kodem lub nickiem'));
        return;
      }
      const myUid = await ensureAnonUser();
      const isSelf =
        (isCode && myCode != null && codeUpper === myCode.toUpperCase()) ||
        (myUid != null && result.uid === myUid);
      if (isSelf) {
        await trackActivity('friends:search_result', {
          feature: 'friends',
          screen: 'friends',
          result: 'blocked',
          tags: { reason: 'self_code', targetUid: result.uid },
        });
        setSearchError(randomSelfFriendCodeMessage(L));
        return;
      }
      const fetched = await fetchFriendProfileFromFirestore(result.uid);
      // Серверный профиль (из users.progress) — ПЕРВИЧНЫЙ источник имени/уровня/аватара.
      // Объединяем с leaderboard: серверный имеет приоритет (mergePublicFriendProfiles
      // берёт запись с бОльшим totalXp как primary). Так карточка не показывает прочерк/ур.1.
      const lookupProfile = friendProfileFromLookup(result.uid, result.profile);
      const merged = mergePublicFriendProfiles(fetched, lookupProfile) ?? lookupProfile ?? fetched;
      const displayProfile = profileWithLookupDisplayName(result.uid, merged, result.name || result.profile?.name);
      if (!displayProfile) {
        await trackActivity('friends:search_result', {
          feature: 'friends',
          screen: 'friends',
          result: 'blocked',
          tags: { reason: 'profile_unavailable', targetUid: result.uid },
        });
        setSearchError(L(
          'Профиль найден, но ещё не синхронизирован. Открой профиль на втором устройстве и попробуй снова.',
          'Профіль знайдено, але ще не синхронізовано. Відкрийте профіль на другому пристрої та спробуйте ще раз.',
          'Profile found, but not synced yet. Open the profile on the other device and try again.',
          'Perfil encontrado, pero aún no está sincronizado. Abre el perfil en el segundo dispositivo e intenta de nuevo.',
          'Perfil encontrado, mas ainda não está sincronizado. Abra o perfil no segundo dispositivo e tente de novo.',
          'Hồ sơ đã được tìm thấy, nhưng chưa đồng bộ. Hãy mở hồ sơ trên thiết bị thứ hai rồi thử lại.',
          'Profil ditemukan, tetapi belum tersinkron. Buka profil di perangkat kedua lalu coba lagi.',
          'Profil bulundu, ama henüz senkronize edilmedi. Profili ikinci cihazda açıp tekrar dene.',
          'Profil znaleziony, ale nie jest jeszcze zsynchronizowany. Otwórz profil na drugim urządzeniu i spróbuj ponownie.',
        ));
        return;
      }
      setFoundUser(displayProfile);
      await trackActivity('friends:search_result', {
        feature: 'friends',
        screen: 'friends',
        result: 'success',
        tags: { targetUid: result.uid, profileLoaded: true, queryType: isCode ? 'code' : 'nickname' },
      });
    } catch (e) {
      void import('../app_health')
        .then(({ logAppWarning }) =>
          logAppWarning('friends:search_failed', e, {
            feature: 'friends',
            screen: 'friends',
            writeToFirestore: true,
            tags: { queryLength: codeInput.length },
          }),
        )
        .catch(() => {});
      await trackActivity('friends:search_error', {
        feature: 'friends',
        screen: 'friends',
        result: 'error',
        tags: { queryLength: codeInput.length, error: e instanceof Error ? e.message : String(e) },
      });
      setSearchError(L('Что-то пошло не так. Попробуй ещё раз', 'Щось пішло не так. Спробуй ще раз', 'Something went wrong. Try again', 'Algo salió mal. Inténtalo de nuevo', 'Algo deu errado. Tente novamente', 'Có lỗi xảy ra. Hãy thử lại', 'Ada yang salah. Coba lagi', 'Bir şeyler ters gitti. Tekrar dene', 'Coś poszło nie tak. Spróbuj ponownie'));
    } finally {
      setIsSearching(false);
    }
  }, [L, codeInput, isSearching, myCode, profiles, friends, requests]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddFound = useCallback(async () => {
    if (!foundUser || isAdding) return;
    const targetUser = foundUser;
    const previousCodeInput = codeInput;
    hapticTap();
    setIsAdding(true);
    setFoundUser(null);
    setCodeInput('');
    showFeedback(L('Заявка отправлена!', 'Заявку надіслано!', 'Request sent!', '¡Solicitud enviada!', 'Solicitação enviada!', 'Đã gửi lời mời!', 'Permintaan terkirim!', 'İstek gönderildi!', 'Zaproszenie wysłane!'));
    try {
      await trackActivity('friends:add_request_start', {
        feature: 'friends',
        screen: 'friends',
        result: 'start',
        tags: { targetUid: targetUser.uid },
      });
      const result = await sendFriendRequest(targetUser.uid);
      await trackActivity('friends:add_request_result', {
        feature: 'friends',
        screen: 'friends',
        result: result === 'sent' ? 'success' : result === 'error' ? 'error' : 'blocked',
        tags: { targetUid: targetUser.uid, requestResult: result },
      });
      // зачем: «один код» — друг найден по реферальному коду, значит этот же ввод
      // привязывает приглашение (сервер идемпотентен, invalid/too_old тихо
      // игнорируются). Один callable строго по явному действию пользователя.
      if (
        (result === 'sent' || result === 'already_sent' || result === 'already_friends')
        && lastLookupSourceRef.current === 'referral_code'
      ) {
        lastLookupSourceRef.current = null;
        void import('../referral_bootstrap')
          .then(({ applyManualReferralCode }) => applyManualReferralCode(previousCodeInput))
          .catch(() => {});
      }
      if (result === 'sent') {
        setFoundUser(null);
        setCodeInput('');
        showFeedback(L('Заявка отправлена!', 'Заявку надіслано!', 'Request sent!', '¡Solicitud enviada!', 'Solicitação enviada!', 'Đã gửi lời mời!', 'Permintaan terkirim!', 'İstek gönderildi!', 'Zaproszenie wysłane!'));
      } else if (result === 'already_friends') {
        setFoundUser(null);
        showFeedback(L('Уже друзья', 'Уже друзі', 'Already friends', 'Ya son amigos', 'Vocês já são amigos', 'Hai bạn đã là bạn bè', 'Kalian sudah berteman', 'Zaten arkadaşsınız', 'Już jesteście znajomymi'));
      } else if (result === 'already_sent') {
        setFoundUser(null);
        showFeedback(L('Заявка уже отправлена', 'Заявку вже надіслано', 'Request already sent', 'Solicitud ya enviada', 'Solicitação já enviada', 'Lời mời đã được gửi', 'Permintaan sudah dikirim', 'İstek zaten gönderildi', 'Zaproszenie już wysłane'));
      } else if (result === 'self') {
        setFoundUser(null);
        showFeedback(randomSelfFriendCodeMessage(L));
      } else {
        setFoundUser(targetUser);
        setCodeInput(previousCodeInput);
        showFeedback(L('Что-то пошло не так. Попробуй ещё раз', 'Щось пішло не так. Спробуй ще раз', 'Something went wrong. Try again', 'Algo salió mal. Inténtalo de nuevo', 'Algo deu errado. Tente novamente', 'Có lỗi xảy ra. Hãy thử lại', 'Ada yang salah. Coba lagi', 'Bir şeyler ters gitti. Tekrar dene', 'Coś poszło nie tak. Spróbuj ponownie'));
      }
    } catch (e) {
      void import('../app_health')
        .then(({ logAppWarning }) =>
          logAppWarning('friends:add_request_ui_failed', e, {
            feature: 'friends',
            screen: 'friends',
            writeToFirestore: true,
            tags: { targetUid: targetUser.uid },
          }),
        )
        .catch(() => {});
      await trackActivity('friends:add_request_error', {
        feature: 'friends',
        screen: 'friends',
        result: 'error',
        tags: { targetUid: targetUser.uid, error: e instanceof Error ? e.message : String(e) },
      });
      setFoundUser(targetUser);
      setCodeInput(previousCodeInput);
      showFeedback(L('Что-то пошло не так. Попробуй ещё раз', 'Щось пішло не так. Спробуй ще раз', 'Something went wrong. Try again', 'Algo salió mal. Inténtalo de nuevo', 'Algo deu errado. Tente novamente', 'Có lỗi xảy ra. Hãy thử lại', 'Ada yang salah. Coba lagi', 'Bir şeyler ters gitti. Tekrar dene', 'Coś poszło nie tak. Spróbuj ponownie'));
    } finally {
      setIsAdding(false);
    }
  }, [L, codeInput, foundUser, isAdding, showFeedback]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcceptRequest = useCallback((request: FriendRequestEntry) => {
    hapticTap();
    const hadFriend = friends.some(friend => friend.uid === request.fromUid);
    const optimisticFriend: FriendEntry = {
      uid: request.fromUid,
      createdAt: Date.now(),
      ...(request.fromName ? { displayName: request.fromName } : {}),
    };
    setRequests(prev => prev.filter(item => item.fromUid !== request.fromUid));
    if (!hadFriend) {
      setFriends(prev => prev.some(friend => friend.uid === request.fromUid) ? prev : [...prev, optimisticFriend]);
      // зачем: лёгкий социальный сигнал «теперь вы друзья» — играет сразу,
      // оптимистично, как и локальное добавление в список выше.
      soundDirector.request('pm.social.friend_added', { scope: 'friends' });
    }
    acceptFriendRequest(request.fromUid)
      .then(() => {
      })
      .catch(() => {
        setRequests(prev => prev.some(item => item.fromUid === request.fromUid) ? prev : [request, ...prev]);
        if (!hadFriend) {
          setFriends(prev => prev.filter(friend => friend.uid !== request.fromUid));
        }
        showFeedback(L('Не получилось принять. Попробуй ещё раз', 'Не вдалося прийняти. Спробуй ще раз', 'Could not accept. Try again', 'No se pudo aceptar', 'Não deu para aceitar', 'Chưa chấp nhận được', 'Belum bisa diterima', 'Kabul edilemedi', 'Nie udało się zaakceptować'));
      });
  }, [L, friends, showFeedback]);

  const handleDeclineRequest = useCallback((request: FriendRequestEntry) => {
    hapticTap();
    setRequests(prev => prev.filter(item => item.fromUid !== request.fromUid));
    declineFriendRequest(request.fromUid)
      .then(() => {
      })
      .catch(() => {
        setRequests(prev => prev.some(item => item.fromUid === request.fromUid) ? prev : [request, ...prev]);
        showFeedback(L('Что-то пошло не так. Попробуй ещё раз', 'Щось пішло не так. Спробуй ще раз', 'Something went wrong. Try again', 'Algo salió mal. Inténtalo de nuevo', 'Algo deu errado. Tente novamente', 'Có lỗi xảy ra. Hãy thử lại', 'Ada yang salah. Coba lagi', 'Bir şeyler ters gitti. Tekrar dene', 'Coś poszło nie tak. Spróbuj ponownie'));
      });
  }, [L, showFeedback]);

  const handleDeleteConfirm = useCallback((uid: string, name: string) => {
    if (modalWedgeGuardRef.current) return;
    hapticTap();
    setDeleteTarget({ uid, name });
  }, []);

  const openGiftPicker = useCallback((profile: FriendProfile) => {
    if (modalWedgeGuardRef.current) return;
    hapticTap();
    giftTargetRef.current = profile;
    setSelectedGiftId(FRIEND_GIFT_CATALOG[0]?.id ?? 'chain_shield_1');
    setGiftSendFailedId(null);
    setGiftTarget(profile);
    const requestAccountToken = captureAccountGeneration();
    void getShardsBalance().then((balance) => {
      if (!isCurrentAccountGeneration(requestAccountToken, requestAccountToken.stableId)) return;
      if (giftTargetRef.current?.uid !== profile.uid) return;
      setGiftBalance((prev) => (prev === balance ? prev : balance));
    }).catch(() => {});
  }, []);

  const giftLabel = (gift: (typeof FRIEND_GIFT_CATALOG)[number]) =>
    triLang(lang, {
      ru: gift.labelRu,
      uk: gift.labelUk,
      en: gift.labelRu,
      es: gift.labelEs,
      'pt-BR': gift.labelPtBr,
      vi: gift.labelVi,
      id: gift.labelId,
      tr: gift.labelTr,
      pl: gift.labelPl,
    });

  const giftCostForTarget = useCallback((gift: (typeof FRIEND_GIFT_CATALOG)[number], targetUid: string): number =>
    friendGiftCostForLevel(gift.costShards, togetherSnapshot?.pairs[targetUid]?.level ?? 1), [togetherSnapshot]);

  const handleSendGift = async (giftId: FriendGiftId, explicitTarget: FriendProfile | null = giftTarget, balanceOverride = giftBalance) => {
    if (!explicitTarget || giftBusyId) return;
    const gift = FRIEND_GIFT_CATALOG.find(x => x.id === giftId);
    if (!gift) return;
    const giftCost = giftCostForTarget(gift, explicitTarget.uid);
    if (!isFriendGiftsCloudEnabled()) {
      showFeedback(L('Подарки временно недоступны. Попробуй позже.', 'Подарунки тимчасово недоступні. Спробуй пізніше.', 'Gifts are temporarily unavailable. Try again later.', 'Los regalos no están disponibles ahora. Inténtalo más tarde.', 'Os presentes estão temporariamente indisponíveis. Tente mais tarde.', 'Quà tặng tạm thời chưa khả dụng. Hãy thử lại sau.', 'Hadiah sementara tidak tersedia. Coba lagi nanti.', 'Hediyeler geçici olarak kullanılamıyor. Daha sonra dene.', 'Prezenty są chwilowo niedostępne. Spróbuj później.'));
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Подарки временно недоступны. Попробуй позже.',
        messageUk: 'Подарунки тимчасово недоступні. Спробуй пізніше.',
        messageEs: 'Los regalos no están disponibles ahora. Inténtalo más tarde.',
        messagePtBr: 'Os presentes estão temporariamente indisponíveis. Tente mais tarde.',
        messageVi: 'Quà tặng tạm thời chưa khả dụng. Hãy thử lại sau.',
        messageId: 'Hadiah sementara tidak tersedia. Coba lagi nanti.',
        messageTr: 'Hediyeler geçici olarak kullanılamıyor. Daha sonra dene.',
        messagePl: 'Prezenty są chwilowo niedostępne. Spróbuj później.',
      });
      return;
    }
    if (balanceOverride < giftCost) {
      showFeedback(L('Не хватает жемчуга', 'Не вистачає перлин', 'Not enough pearls', 'No tienes suficientes perlas', 'Pérolas insuficientes', 'Không đủ ngọc trai', 'Mutiara tidak cukup', 'İnci yetersiz', 'Za mało pereł'));
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Не хватает жемчуга',
        messageUk: 'Не вистачає перлин',
        messageEs: 'No tienes suficientes perlas',
        messagePtBr: 'Perlas insuficientes',
        messageVi: 'Không đủ ngọc trai',
        messageId: 'Mutiara tidak cukup',
        messageTr: 'Parça yetersiz',
        messagePl: 'Za mało pereł',
      });
      return;
    }
    const giftAccountToken = captureAccountGeneration();
    if (
      !accountScopeKey(giftAccountToken)
      || !giftAccountToken.stableId
      || !isCurrentAccountGeneration(giftAccountToken)
    ) return;
    hapticTap();
    const target = explicitTarget;
    const sentGiftName = giftLabel(gift);
    try {
      // Сначала фиксируем полную операцию на диске, затем мгновенно закрываем UI.
      // Сервер, баланс и friend quest догоняют через crash-safe outbox без спиннера.
      const queued = await enqueueFriendGiftSend({
        friendStableId: target.uid,
        giftId,
        senderDisplayName: myProfile?.name ?? '',
      }, {
        accountToken: giftAccountToken,
      });
      if (!isCurrentAccountGeneration(giftAccountToken)) return;
      setGiftSendFailedId(null);
      setGiftTarget(null);
      showFeedback(L('Подарок отправлен', 'Подарунок надіслано', 'Gift sent', 'Regalo enviado', 'Presente enviado', 'Đã gửi quà', 'Hadiah terkirim', 'Hediye gönderildi', 'Prezent wysłany'));
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: `Подарок отправлен. ${sentGiftName} уже у ${target.name}.`,
        messageUk: `Подарунок надіслано: ${sentGiftName}`,
        messageEs: `Regalo enviado: ${sentGiftName}`,
        messagePtBr: `Presente enviado: ${sentGiftName}`,
        messageVi: `Đã gửi quà: ${sentGiftName}`,
        messageId: `Hadiah terkirim: ${sentGiftName}`,
        messageTr: `Hediye gönderildi: ${sentGiftName}`,
        messagePl: `Prezent wysłany: ${sentGiftName}`,
      });
      void queued.completion.then(async (res) => {
        if (!isCurrentAccountGeneration(giftAccountToken)) return;
        const guardedBalance = await getShardsBalance().catch(() => null);
        if (!isCurrentAccountGeneration(giftAccountToken)) return;
        if (guardedBalance !== null) setGiftBalance(guardedBalance);
        if (res.questStarted && res.quest) {
          const quest = res.quest as FriendQuest;
          setActiveFriendQuest(quest);
          setFriendQuestStarted(quest);
        } else {
          void refreshFriendQuest(undefined, { force: true });
        }
        await trackActivity('friends:send_gift', {
          feature: 'friends',
          screen: 'friends',
          result: 'success',
          tags: { giftId, targetUid: target.uid, cost: giftCost },
        });
      }).catch(async (error) => {
        if (!isCurrentAccountGeneration(giftAccountToken)) return;
        await trackActivity('friends:send_gift', {
          feature: 'friends',
          screen: 'friends',
          result: 'error',
          tags: { giftId, targetUid: target.uid, error: String(error) },
        });
      });
    } catch (e) {
      if (!isCurrentAccountGeneration(giftAccountToken)) return;
      setGiftSendFailedId(giftId);
      const feedback = L('Не удалось поставить подарок в очередь. Попробуй ещё раз.', 'Не вдалося поставити подарунок у чергу. Спробуй ще раз.', 'Could not queue the gift. Try again.', 'No se pudo poner el regalo en cola. Inténtalo de nuevo.', 'Não foi possível colocar o presente na fila. Tente novamente.', 'Không thể xếp quà vào hàng đợi. Hãy thử lại.', 'Hadiah tidak dapat dimasukkan ke antrean. Coba lagi.', 'Hediye sıraya alınamadı. Tekrar dene.', 'Nie udało się dodać prezentu do kolejki. Spróbuj ponownie.');
      showFeedback(feedback);
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось поставить подарок в очередь. Попробуй ещё раз.',
        messageUk: 'Не вдалося поставити подарунок у чергу. Спробуй ще раз.',
        messageEs: 'No se pudo poner el regalo en cola. Inténtalo de nuevo.',
        messagePtBr: 'Não foi possível colocar o presente na fila. Tente novamente.',
        messageVi: 'Không thể xếp quà vào hàng đợi. Hãy thử lại.',
        messageId: 'Hadiah tidak dapat dimasukkan ke antrean. Coba lagi.',
        messageTr: 'Hediye sıraya alınamadı. Tekrar dene.',
        messagePl: 'Nie udało się dodać prezentu do kolejki. Spróbuj ponownie.',
      });
    }
  };

  const requestSendGift = (giftId: FriendGiftId) => {
    if (!giftTarget || giftBusyId || giftRequestInFlightRef.current) return;
    const gift = FRIEND_GIFT_CATALOG.find(x => x.id === giftId);
    if (!gift) return;
    const target = giftTarget;
    const giftCost = giftCostForTarget(gift, target.uid);
    const requestAccountToken = captureAccountGeneration();
    if (
      !accountScopeKey(requestAccountToken)
      || !requestAccountToken.stableId
      || !isCurrentAccountGeneration(requestAccountToken, requestAccountToken.stableId)
    ) return;
    // Баланс уже прогревается при открытии picker. На тапе ждём только короткую
    // локальную запись outbox; серверная проверка и списание идут уже в фоне.
    const knownBalance = peekLastKnownShardsBalance();
    const warmBalance = knownBalance ?? giftBalance;
    setGiftBalance((prev) => (prev === warmBalance ? prev : warmBalance));
    if (knownBalance !== null && warmBalance < giftCost) {
      const missing = giftCost - warmBalance;
      setGiftTarget(null);
      showFeedback(L('Не хватает жемчуга', 'Не вистачає перлин', 'Not enough pearls', 'No tienes suficientes perlas', 'Pérolas insuficientes', 'Không đủ ngọc trai', 'Mutiara tidak cukup', 'İnci yetersiz', 'Za mało pereł'));
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: `Нужно ещё жемчуга: ${missing}`,
        messageUk: `Потрібно ще перлин: ${missing}`,
        messageEs: `Necesitas más perlas: ${missing}`,
        messagePtBr: `Você precisa de mais pérolas: ${missing}`,
        messageVi: `Cần thêm ngọc trai: ${missing}`,
        messageId: `Butuh mutiara lagi: ${missing}`,
        messageTr: `Daha fazla inci gerekiyor: ${missing}`,
        messagePl: `Potrzeba więcej monet: ${missing}`,
      });
      router.push({ pathname: '/shards_shop', params: { need: String(missing), source: 'friend_gift' } } as any);
      return;
    }
    giftRequestInFlightRef.current = true;
    setGiftBusyId(giftId);
    // Если диск ещё не прогрет, не объявляем нулевой placeholder реальным
    // балансом. Сервер всё равно атомарно проверит стоимость и вернёт точную
    // ошибку; UI при этом остаётся мгновенным.
    void handleSendGift(giftId, target, knownBalance ?? Number.MAX_SAFE_INTEGER).finally(() => {
      giftRequestInFlightRef.current = false;
      setGiftBusyId(null);
    });
  };

  const incomingReplyTarget = useCallback((gift: IncomingFriendGift): FriendProfile => {
    const cached = profiles[gift.fromUid];
    return cached ?? {
      uid: gift.fromUid,
      name: gift.fromName || L('друг', 'друг', 'friend', 'amigo', 'amigo', 'bạn bè', 'teman', 'arkadaş', 'znajomy'),
      totalXp: 0,
      weeklyXp: 0,
      streak: 0,
      isPremium: false,
      isVip: false,
      avatar: String(getBestAvatarForLevel(1)),
      frame: String(getBestFrameForLevel(1).id),
    };
  }, [L, profiles]);

  const handleIncomingGiftThanks = useCallback(async () => {
    const first = incomingGiftModal?.gifts[0];
    if (!first || giftBusyId) return;
    const previousModal = incomingGiftModal;
    hapticTap();
    setGiftBusyId(first.giftId as FriendGiftId);
    try {
      await sendFriendGiftThanks({
        friendStableId: first.fromUid,
        giftId: first.giftId as FriendGiftId,
        senderDisplayName: myProfile?.name ?? '',
      });
      setIncomingGiftModal(null);
      showFeedback(L('Спасибо отправлено', 'Подяку надіслано', 'Thanks sent', 'Gracias enviadas', 'Agradecimento enviado', 'Đã gửi lời cảm ơn', 'Ucapan terima kasih terkirim', 'Teşekkür gönderildi', 'Podziękowanie wysłane'));
    } catch {
      setIncomingGiftModal(previousModal);
      showFeedback(L('Не удалось отправить спасибо', 'Не вдалося надіслати подяку', 'Could not send thanks', 'No se pudo enviar el agradecimiento', 'Não foi possível agradecer', 'Không gửi được lời cảm ơn', 'Gagal mengirim terima kasih', 'Teşekkür gönderilemedi', 'Nie udało się podziękować'));
    } finally {
      setGiftBusyId(null);
    }
  }, [L, giftBusyId, incomingGiftModal, myProfile?.name, showFeedback]);

  const handleIncomingGiftReply = useCallback((giftId: FriendGiftId) => {
    const first = incomingGiftModal?.gifts[0];
    if (!first || giftBusyId || giftRequestInFlightRef.current) return;
    const target = incomingReplyTarget(first);
    const gift = FRIEND_GIFT_CATALOG.find(x => x.id === giftId);
    if (!gift) return;
    const giftCost = giftCostForTarget(gift, target.uid);
    const knownBalance = peekLastKnownShardsBalance();
    if (knownBalance !== null && knownBalance < giftCost) {
      setIncomingGiftModal(null);
      router.push({ pathname: '/shards_shop', params: { need: String(giftCost - knownBalance), source: 'friend_gift_reply' } } as any);
      return;
    }
    setIncomingGiftModal(null);
    giftRequestInFlightRef.current = true;
    void handleSendGift(giftId, target, knownBalance ?? Number.MAX_SAFE_INTEGER).finally(() => {
      giftRequestInFlightRef.current = false;
    });
  }, [giftBusyId, handleSendGift, incomingGiftModal, incomingReplyTarget, router, togetherSnapshot]);

  const handleClaimFriendQuest = useCallback(async () => {
    if (!activeFriendQuest || friendQuestBusy) return;
    hapticTap();
    setFriendQuestBusy(true);
    try {
      const res = await claimFriendQuestReward(activeFriendQuest.questId);
      if (res.reached) {
        setFriendQuestCompleted(activeFriendQuest);
        setActiveFriendQuest(null);
      } else {
        void refreshFriendQuest(undefined, { force: true });
        showFeedback(L('Квест ещё не выполнен', 'Квест ще не виконано', 'Quest is not finished yet', 'La misión aún no está completa', 'A missão ainda não terminou', 'Nhiệm vụ chưa xong', 'Quest belum selesai', 'Görev henüz bitmedi', 'Misja nie jest jeszcze gotowa'));
      }
    } catch {
      showFeedback(L('Не удалось забрать награду', 'Не вдалося забрати нагороду', 'Could not claim reward', 'No se pudo recibir la recompensa', 'Não foi possível receber a recompensa', 'Không nhận được thưởng', 'Gagal mengambil hadiah', 'Ödül alınamadı', 'Nie udało się odebrać nagrody'));
    } finally {
      setFriendQuestBusy(false);
    }
  }, [L, activeFriendQuest, friendQuestBusy, refreshFriendQuest, showFeedback]);

  const openProfile = useCallback((profile: FriendProfile) => {
    if (modalWedgeGuardRef.current) return;
    hapticTap();
    setSelectedPlayer({
      name: profile.name,
      points: profile.totalXp,
      totalXp: profile.totalXp,
      isMe: false,
      uid: profile.uid,
      isPremium: profile.isPremium,
      isVip: profile.isVip,
      isLifetime: profile.isLifetime,
      avatar: profile.avatar,
      frame: profile.frame,
      aura: profile.aura,
      streak: profile.streak,
      friendUid: profile.uid,
      leagueCrownExpiresAt: profile.leagueCrownExpiresAt,
      leagueCrownCount: profile.leagueCrownCount,
      profileCardLevel: profile.profileCardLevel,
      profileCardTheme: profile.profileCardTheme,
      profileCardMotion: profile.profileCardMotion,
      profileCardPublicFocus: profile.profileCardPublicFocus,
    });
  }, []);

  const [addModalOpen, setAddModalOpen] = useState(false);

  // ── «Дай пять» — профильный лайк другу прямо из списка ─────────────────────
  // Optimistic UI: сердце меняется мгновенно, сеть догоняет; при ошибке — откат к
  // серверной правде + тост; повторный тап во время полёта игнорируется.
  const [highFivedUids, setHighFivedUids] = useState<Set<string>>(() => new Set());
  const highFiveInFlightRef = useRef<Set<string>>(new Set());
  const hasFriends = friends.length > 0;
  useEffect(() => {
    if (!hasFriends) return;
    let cancelled = false;
    // Один запрос на все мои лайки (≤500 док.), а не по чтению на каждого друга.
    void fetchActivityLikeStates()
      .then(states => {
        if (cancelled) return;
        setHighFivedUids(new Set(
          states.filter(state => state.eventId === PROFILE_LIKE_EVENT_ID).map(state => state.targetUid),
        ));
      })
      .catch(() => { /* сеть/бэкенд — сердца остаются пустыми, тап всё равно работает */ });
    return () => { cancelled = true; };
  }, [hasFriends]);
  // Карточка игрока тоже умеет ставить/снимать этот лайк — держим строку в согласии.
  useEffect(() => {
    const sub = onAppEvent('profile_like_changed', ({ targetUid, liked }) => {
      setHighFivedUids(prev => {
        if (prev.has(targetUid) === liked) return prev;
        const next = new Set(prev);
        if (liked) next.add(targetUid); else next.delete(targetUid);
        return next;
      });
    });
    return () => sub.remove();
  }, []);
  const handleHighFive = useCallback((profile: FriendProfile) => {
    const uid = profile.uid;
    if (highFiveInFlightRef.current.has(uid)) return;
    hapticTap();
    const wasLiked = highFivedUids.has(uid);
    highFiveInFlightRef.current.add(uid);
    setHighFivedUids(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(uid); else next.add(uid);
      return next;
    });
    const action = wasLiked
      ? removeFriendActivityLike({ targetUid: uid })
      : sendFriendActivityLike({ targetUid: uid, senderDisplayName: myProfile?.name });
    void action
      .then(() => {
        emitAppEvent('profile_like_changed', { targetUid: uid, liked: !wasLiked });
      })
      .catch(async () => {
        // Откат к правде сервера, а не просто к прежнему значению: поздний ответ не должен
        // затереть более свежий тап из карточки игрока.
        const fresh = await fetchActivityLikeState(uid).catch(() => null);
        const likedOnServer = !!fresh;
        setHighFivedUids(prev => {
          if (prev.has(uid) === likedOnServer) return prev;
          const next = new Set(prev);
          if (likedOnServer) next.add(uid); else next.delete(uid);
          return next;
        });
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Не получилось. Проверь интернет и попробуй ещё раз',
          messageUk: 'Не вдалося. Перевір інтернет і спробуй ще раз',
          messageEs: 'No funcionó. Comprueba Internet e inténtalo de nuevo',
          messagePtBr: 'Não deu certo. Verifique a internet e tente novamente',
          messageVi: 'Không thành công. Hãy kiểm tra mạng rồi thử lại',
          messageId: 'Gagal. Periksa internet lalu coba lagi',
          messageTr: 'Olmadı. İnterneti kontrol edip tekrar dene',
          messagePl: 'Nie udało się. Sprawdź internet i spróbuj ponownie',
        });
      })
      .finally(() => {
        highFiveInFlightRef.current.delete(uid);
      });
  }, [highFivedUids, myProfile?.name]);

  // Обновляем гард на каждый рендер: любая открытая модалка блокирует открытие следующей.
  const modalWedgeActive = selectedPlayer !== null || deleteTarget !== null
    || giftTarget !== null || incomingGiftModal !== null
    || friendQuestStarted !== null || friendQuestCompleted !== null || addModalOpen
    || togetherSheetSession !== null;
  modalWedgeGuardRef.current = modalWedgeActive;

  useEffect(() => {
    const action = pendingTogetherSheetAction;
    if (!action) return;
    if (togetherSheetSession !== null || modalWedgeActive) return;

    setPendingTogetherSheetAction(null);
    if (action.kind === 'gift') openGiftPicker(action.profile);
    else if (action.kind === 'delete') handleDeleteConfirm(action.profile.uid, action.profile.name);
    else if (action.profile.uid.startsWith('devbot_')) router.push({ pathname: '/arena_friend_duel', params: { devBot: '1' } } as never);
    else router.push({
      pathname: '/arena_friend_duel',
      params: {
        friendStableUid: action.profile.uid,
        friendName: action.profile.name,
        friendAvatar: action.profile.avatar,
      },
    } as never);
  }, [handleDeleteConfirm, modalWedgeActive, openGiftPicker, pendingTogetherSheetAction, router, togetherSheetSession]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const sortedFriends = useMemo(() => {
    const visible = [...friends]
      .map(fr => profileWithLookupDisplayName(fr.uid, profiles[fr.uid] ?? null, fr.displayName) ?? placeholderFriendProfile(fr.uid, fr.displayName));
    if (ENABLE_DEV_TOOLS && friendsTogetherUiEnabled) {
      for (const bot of devBots) {
        const assetLevel = getLevelFromXP(bot.totalXp);
        visible.push(devBotToFriendProfile(
          bot,
          String(getBestAvatarForLevel(assetLevel)),
          String(getBestFrameForLevel(assetLevel).id),
        ));
      }
    }
    return visible.sort((a, b) => b.totalXp - a.totalXp);
  }, [friends, profiles, devBots, friendsTogetherUiEnabled]);

  const openFriendSheet = useCallback((profile: FriendProfile) => {
    if (modalWedgeGuardRef.current) return;
    hapticTap();
    setTogetherSheetSession(createFriendSheetSession(profile));
  }, []);

  const acknowledgeFriendEvent = useCallback((event: FriendSocialEvent) => {
    setFriendEvents((current) => acknowledgeMarker(current, event.id));
    if (event.notificationId) void markUserNotificationsRead([event.notificationId]);
  }, []);

  const openFriendEvent = useCallback((profile: FriendProfile, event: FriendSocialEvent) => {
    hapticTap();
    if (event.kind === 'high_five') {
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: 'Пятюня получена. Теперь официально нельзя сдаваться.',
        messageUk: 'П’ять отримано. Тепер офіційно не можна здаватися.',
        messageEs: 'Choca esos cinco. Ahora rendirse ya no es oficial.',
        messagePtBr: 'Toca aqui recebido. Agora desistir não vale.',
        messageVi: 'Đã nhận cú đập tay. Giờ thì không được bỏ cuộc.',
        messageId: 'Tos diterima. Sekarang resmi tidak boleh menyerah.',
        messageTr: 'Çak bir beşlik geldi. Artık pes etmek resmen yasak.',
        messagePl: 'Piątka odebrana. Teraz oficjalnie nie wolno się poddać.',
      });
      acknowledgeFriendEvent(event);
      return;
    }
    if (event.kind === 'study_invite') {
      setStudyInvite({ event, friendName: profile.name });
      return;
    }
    acknowledgeFriendEvent(event);
    router.push({ pathname: '/arena_invite', params: { inviteId: event.inviteId ?? event.id } } as never);
  }, [acknowledgeFriendEvent, router]);

  // зачем (аудит скорости 2026-08-22): renderItem ниже создавал новые стрелочные
  // обёртки (() => openProfile(profile) и т.д.) на КАЖДЫЙ рендер экрана — новые
  // ссылки колбэков полностью нейтрализовали React.memo(FriendListRow), поэтому
  // все видимые строки друзей перерисовывались на любое изменение состояния
  // экрана. Держим свежий список в ref (без лишних ре-рендеров) и три стабильные
  // by-uid обёртки — их ссылки не меняются между рендерами, memo снова работает.
  const sortedFriendsRef = useRef(sortedFriends);
  sortedFriendsRef.current = sortedFriends;
  const openProfileByUid = useCallback((friendUid: string) => {
    const profile = sortedFriendsRef.current.find((item) => item.uid === friendUid);
    if (profile) openProfile(profile);
  }, [openProfile]);
  const openFriendSheetByUid = useCallback((friendUid: string) => {
    const profile = sortedFriendsRef.current.find((item) => item.uid === friendUid);
    if (profile) openFriendSheet(profile);
  }, [openFriendSheet]);
  const openFriendEventByUid = useCallback((friendUid: string, event: FriendSocialEvent) => {
    const profile = sortedFriendsRef.current.find((item) => item.uid === friendUid);
    if (profile) openFriendEvent(profile, event);
  }, [openFriendEvent]);

  const socialOpenedRef = useRef('');
  useEffect(() => {
    const eventId = String(socialParams.socialEventId || '');
    const friendUid = String(socialParams.focusFriend || '');
    const routeKey = `${friendUid}:${eventId}`;
    if (!eventId || !friendUid || socialOpenedRef.current === routeKey) return;
    const event = friendEvents.find((item) => item.id === eventId && item.actorStableUid === friendUid);
    const profile = sortedFriends.find((item) => item.uid === friendUid);
    if (!event || !profile) return;
    socialOpenedRef.current = routeKey;
    openFriendEvent(profile, event);
  }, [friendEvents, openFriendEvent, socialParams.focusFriend, socialParams.socialEventId, sortedFriends]);

  const friendQuestPeerUid = useMemo(() => {
    if (!activeFriendQuest) return '';
    return activeFriendQuest.participantUids.find(uid => !!profiles[uid] || friends.some(friend => friend.uid === uid)) ?? activeFriendQuest.participantUids[1] ?? '';
  }, [activeFriendQuest, friends, profiles]);
  const friendQuestMyUid = useMemo(() => {
    if (!activeFriendQuest) return '';
    return activeFriendQuest.participantUids.find(uid => uid !== friendQuestPeerUid) ?? activeFriendQuest.participantUids[0] ?? '';
  }, [activeFriendQuest, friendQuestPeerUid]);
  const friendQuestPeerName = profiles[friendQuestPeerUid]?.name || L('друг', 'друг', 'friend', 'amigo', 'amigo', 'bạn bè', 'teman', 'arkadaş', 'znajomy');
  const friendQuestMyProgress = activeFriendQuest ? Math.min(activeFriendQuest.targetXp, activeFriendQuest.progressByUid[friendQuestMyUid] ?? 0) : 0;
  const friendQuestPeerProgress = activeFriendQuest ? Math.min(activeFriendQuest.targetXp, activeFriendQuest.progressByUid[friendQuestPeerUid] ?? 0) : 0;
  const friendQuestMyRemaining = activeFriendQuest ? Math.max(0, activeFriendQuest.remainingXpByUid[friendQuestMyUid] ?? activeFriendQuest.targetXp) : 0;
  const friendQuestPeerRemaining = activeFriendQuest ? Math.max(0, activeFriendQuest.remainingXpByUid[friendQuestPeerUid] ?? activeFriendQuest.targetXp) : 0;
  const friendQuestReady = !!activeFriendQuest && friendQuestMyRemaining === 0 && friendQuestPeerRemaining === 0;
  const friendQuestMsLeft = activeFriendQuest ? Math.max(0, activeFriendQuest.expiresAtMs - Date.now()) : 0;
  const friendQuestHoursLeft = Math.max(0, Math.ceil(friendQuestMsLeft / 3600000));

  const PX = 16;

  // «Вместе»: одна пересборка uid → together-пропы за снапшот/тик, а не за каждый
  // рендер каждой строки — FriendRow остаётся дешёвым для FlashList.
  const togetherByUid = useMemo<Record<string, FriendRowTogether>>(() => {
    if (!friendsTogetherUiEnabled) return {};
    void nudgedTick; // зачем: isNudgedToday() синхронный над модульной памятью — тик форсирует пересборку карты
    const out: Record<string, FriendRowTogether> = {};
    for (const pair of Object.values(togetherSnapshot?.pairs ?? {}) as FriendTogetherPairState[]) {
      const next = nextThreshold(pair.level, friendsTogetherPolicy.config.levelThresholds);
      const prevThreshold = pair.level <= 1 ? 0 : (nextThreshold(pair.level - 1, friendsTogetherPolicy.config.levelThresholds) ?? 0);
      const progressPercent = next === null
        ? 100
        : Math.max(0, Math.min(100, Math.round(((pair.days - prevThreshold) / Math.max(1, next - prevThreshold)) * 100)));
      const friendUid = pair.friendUid;
      out[friendUid] = {
        days: pair.days,
        level: pair.level,
        progressPercent,
        nudged: optimisticNudgedUids.has(friendUid) || isNudgedToday(friendUid),
        learnedToday: pair.todayCommon,
      };
    }
    if (ENABLE_DEV_TOOLS) {
      for (const bot of devBots) {
        const metrics = devBotTogetherMetrics(bot);
        out[bot.uid] = {
          days: bot.days,
          level: metrics.level,
          progressPercent: metrics.progressPercent,
          nudged: metrics.nudged,
          learnedToday: metrics.learnedToday,
          incomingNudge: bot.incomingNudge,
          giftReady: bot.giftReady,
        };
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendsTogetherUiEnabled, friendsTogetherPolicy.config.levelThresholds, togetherSnapshot, nudgedTick, optimisticNudgedUids, handleNudgeFriend, devBots, handleDevNudge]);

  // ── Render ─────────────────────────────────────────────────────────────────

  // D3: вместо общего ScrollView каждый таб — собственный FlashList (виртуализация,
  // эталон flashcards_collection.tsx); шапка и переключатель табов уезжают в
  // ListHeaderComponent и скроллятся вместе со списком, как раньше.
  const listScrollProps = {
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled' as const,
    contentContainerStyle: { paddingBottom: tabContentBottomPad, paddingHorizontal: PX, paddingTop: insets.top },
    scrollEventThrottle: 16,
    bounces: true,
    alwaysBounceVertical: true,
    overScrollMode: 'always' as const,
    onScroll: handleFriendsScroll,
  };

  const listHeader = (
    <>
        {/* Хедер */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 8, marginHorizontal: -PX, paddingHorizontal: PX }}>
          <TapScale
            accessibilityRole="button"
            accessibilityLabel={L('На главную', 'На головну', 'Home', 'Inicio', 'Início', 'Trang chủ', 'Beranda', 'Ana sayfa', 'Strona główna')}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: chrome.button, borderWidth: 0, borderColor: 'transparent',
              justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0,
            }}
            onPress={() => goHome()}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TapScale>
          {/* зачем: переключатель «Друзья / Активность» ушёл вместе с лентой — экран
              один, поэтому шапка получает обычный заголовок, как соседние табы. */}
          <FlowText
            testID="friends-screen-title"
            provenance="authored"
            accessibilityRole="header"
            style={{ flex: 1, minWidth: 0, color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}
          >
            {L('Друзья', 'Друзі', 'Friends', 'Amigos', 'Amigos', 'Bạn bè', 'Teman', 'Arkadaşlar', 'Znajomi')}
          </FlowText>
          {/* DEV-only: панель ботов «Вместе» — сквозная ручная проверка сценариев (owner, 2026-08-17). */}
          {ENABLE_DEV_TOOLS && (
            <TouchableOpacity
              testID="friends-together-dev-open"
              onPressIn={() => hapticTap()}
              onPress={() => setDevBotsSheetOpen(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="DEV: боты «Вместе»"
              hitSlop={4}
              style={{ width: 64, height: 44, borderRadius: 14, backgroundColor: t.accent, flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginRight: 8 }}
            >
              <Ionicons name="flask-outline" size={16} color={t.correctText} />
              <FlowText testID="friends-together-dev-badge" provenance="authored" style={{ color: t.correctText, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>DEV</FlowText>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID="friends-open-add"
            onPressIn={() => hapticTap()}
            onPress={() => { if (modalWedgeGuardRef.current) return; setAddModalOpen(true); setFoundUser(null); setSearchError(null); setCodeInput(''); }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={L('Добавить друга', 'Додати друга', 'Add friend', 'Agregar amigo', 'Adicionar amigo', 'Thêm bạn', 'Tambah teman', 'Arkadaş ekle', 'Dodaj znajomego')}
            hitSlop={8}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}
          >
            <Ionicons name="person-add" size={18} color={t.correctText} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 12 }} />
        {/* «Вместе» (G): сундук недели — только когда есть друзья и флаг включён;
            снапшот из памяти даёт мгновенный первый кадр (нет сети/спиннера). */}
        {friendsTogetherUiEnabled && weeklyChestModel && sortedFriends.length > 0 && (
          <FriendsChestCard
            model={weeklyChestModel}
            onClaim={handleClaimWeeklyChest}
            claimBusy={chestClaimBusy}
            ownerVisible={friendsTabVisible}
            devMode={ENABLE_DEV_TOOLS && devBotsState.chestScenarioTier > 0}
          />
        )}
    </>
  );

  // Всё, что на вкладке «Друзья» идёт до строк списка (квест, заявки, заголовок списка).
  const friendsPreList = (
          <>
            {activeFriendQuest && (
              <View
                testID="friend-quest-card"
                style={{
                  marginBottom: 16,
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: glassFill(chrome.card, 0.46),
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="flash-outline" size={19} color={t.correctText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
                      {L('Совместный квест', 'Спільний квест', 'Friend Quest', 'Misión con amigo', 'Missão em dupla', 'Nhiệm vụ bạn bè', 'Quest teman', 'Arkadaş görevi', 'Misja znajomych')}
                    </Text>
                    <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 2 }}>
                      {L(`По 3000 XP за 24 часа · ${friendQuestHoursLeft}ч`, `По 3000 XP за 24 год · ${friendQuestHoursLeft}год`, `3000 XP each · ${friendQuestHoursLeft}h`, `3000 XP cada uno · ${friendQuestHoursLeft}h`, `3000 XP cada · ${friendQuestHoursLeft}h`, `Mỗi người 3000 XP · ${friendQuestHoursLeft}h`, `Masing-masing 3000 XP · ${friendQuestHoursLeft}j`, `Kişi başı 3000 XP · ${friendQuestHoursLeft}sa`, `Po 3000 XP · ${friendQuestHoursLeft}h`)}
                    </Text>
                  </View>
                  {friendQuestReady && (
                    <TouchableOpacity
                      testID="friend-quest-claim"
                      activeOpacity={0.84}
                      disabled={friendQuestBusy}
                      onPress={handleClaimFriendQuest}
                      style={{ minHeight: 44, borderRadius: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent }}
                    >
                      <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '900' }}>
                        {L('Забрать', 'Забрати', 'Claim', 'Reclamar', 'Receber', 'Nhận', 'Klaim', 'Al', 'Odbierz')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {[
                  { id: 'friend-quest-my-progress', name: L('Ты', 'Ти', 'You', 'Tú', 'Você', 'Bạn', 'Kamu', 'Sen', 'Ty'), progress: friendQuestMyProgress, remaining: friendQuestMyRemaining },
                  { id: 'friend-quest-friend-progress', name: friendQuestPeerName, progress: friendQuestPeerProgress, remaining: friendQuestPeerRemaining },
                ].map(row => {
                  const pct = activeFriendQuest.targetXp > 0 ? Math.min(100, Math.round((row.progress / activeFriendQuest.targetXp) * 100)) : 0;
                  return (
                    <View key={row.id} testID={row.id} style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', flex: 1 }} numberOfLines={1}>{row.name}</Text>
                        <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '800' }}>
                          {row.remaining > 0 ? L(`ещё ${row.remaining} XP`, `ще ${row.remaining} XP`, `${row.remaining} XP left`, `faltan ${row.remaining} XP`, `faltam ${row.remaining} XP`, `còn ${row.remaining} XP`, `sisa ${row.remaining} XP`, `${row.remaining} XP kaldı`, `zostało ${row.remaining} XP`) : L('готово', 'готово', 'ready', 'listo', 'pronto', 'xong', 'siap', 'hazır', 'gotowe')}
                        </Text>
                      </View>
                      <View style={{ height: 9, borderRadius: 5, backgroundColor: chrome.surface, overflow: 'hidden' }}>
                        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 5, backgroundColor: row.remaining === 0 ? '#34C759' : t.accent }} />
                      </View>
                    </View>
                  );
                })}
                <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '700' }}>
                  {L('+10 жемчуга и +1000 XP каждому', '+10 перлин і +1000 XP кожному', '+10 pearls and +1000 XP each', '+10 perlas y +1000 XP para cada uno', '+10 pérolas e +1000 XP para cada', '+10 ngọc trai và +1000 XP mỗi ngườи', '+10 mutiara dan +1000 XP masing-masing', 'Herkese +10 inci ve +1000 XP', '+10 pereł i +1000 XP dla każdego')}
                </Text>
              </View>
            )}
            {requests.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {L('Активные заявки', 'Активні заявки', 'Active requests', 'Solicitudes activas', 'Solicitações ativas', 'Lời mời đang chờ', 'Permintaan aktif', 'Aktif istekler', 'Aktywne zaproszenia')}
                  </Text>
                  <View style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: t.correctText, fontSize: 11, fontWeight: '800' }}>{requests.length}</Text>
                  </View>
                </View>
                {requests.map(req => (
                  <RequestRow
                    key={req.fromUid}
                    profile={profileWithLookupDisplayName(req.fromUid, profiles[req.fromUid] ?? null, req.fromName) ?? placeholderFriendProfile(req.fromUid, req.fromName)}
                    onAccept={() => handleAcceptRequest(req)}
                    onDecline={() => handleDeclineRequest(req)}
                    lang={lang} t={t} f={f} chrome={chrome}
                    themeMode={themeMode}
                  />
                ))}
              </>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
              <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
                {L('Список друзей', 'Список друзів', 'Friends list', 'Lista de amigos', 'Lista de amigos', 'Danh sách bạn bè', 'Daftar teman', 'Arkadaş listesi', 'Lista znajomych')}
                {sortedFriends.length > 0 ? ` · ${sortedFriends.length}` : ''}
              </Text>
              {sortedFriends.length > 0 && (
                <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                  {L('по XP', 'за XP', 'by XP', 'por XP', 'por XP', 'theo XP', 'berdasarkan XP', "XP'ye göre", 'wg XP')}
                </Text>
              )}
            </View>
          </>
  );

  const friendsEmptyState = (
              <View testID="friends-list-empty" style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 8, paddingHorizontal: 12, gap: 10 }}>
                <FriendsThemeIcon themeMode={themeMode} size={86} accessibilityLabel="Friends" />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', textAlign: 'center' }}>
                  {L('Учиться вместе веселее', 'Навчатися разом веселіше', 'Learning together is more fun', 'Aprender juntos es más divertido', 'Aprender junto é mais divertido', 'Học cùng nhau vui hơn', 'Belajar bersama lebih seru', 'Birlikte öğrenmek daha eğlenceli', 'Nauka razem jest fajniejsza')}
                </Text>
                  <>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', lineHeight: Math.round(f.sub * 1.4), maxWidth: 320 }}>
                      {L(
                        'Добавьте друзей по коду или нику — соревнуйтесь в лигах и дарите подарки.',
                        'Додайте друзів за кодом або ніком — змагайтеся в лігах і даруйте подарунки.',
                        'Add friends by code or nickname — compete in leagues and send gifts.',
                        'Agrega amigos por código o apodo: compitan en ligas y envíen regalos.',
                        'Adicione amigos por código ou apelido — compita em ligas e troque presentes.',
                        'Thêm bạn bằng mã hoặc biệt danh — thi đua trong giải và tặng quà.',
                        'Tambahkan teman lewat kode atau nama — berkompetisi di liga dan beri hadiah.',
                        'Kod veya takma adla arkadaş ekle — liglerde yarış ve hediye gönder.',
                        'Dodaj znajomych po kodzie lub nicku — rywalizujcie w ligach i dawajcie prezenty.',
                      )}
                    </Text>
                    <View style={{ marginTop: 6, alignSelf: 'stretch', paddingHorizontal: 8 }}>
                      <DuoPressable
                        testID="friends-empty-add"
                        onPress={() => { hapticTap(); setAddModalOpen(true); }}
                        accessibilityRole="button"
                        accessibilityLabel={L('Добавить друга', 'Додати друга', 'Add friend', 'Agregar amigo', 'Adicionar amigo', 'Thêm bạn', 'Tambah teman', 'Arkadaş ekle', 'Dodaj znajomego')}
                        hitSlop={8}
                        edgeColor={t.accent}
                        wrapStyle={{ flex: 1 }}
                        style={{ minHeight: 58, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 12 }}
                      >
                        <Ionicons name="person-add" size={20} color={t.correctText} />
                        <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '900', textAlign: 'center', includeFontPadding: false }} numberOfLines={2}>
                          {L('Добавить друга', 'Додати друга', 'Add friend', 'Agregar amigo', 'Adicionar amigo', 'Thêm bạn', 'Tambah teman', 'Arkadaş ekle', 'Dodaj znajomego')}
                        </Text>
                      </DuoPressable>
                    </View>
                  </>
              </View>
  );

  const listFooter = (
    <>
        {addFeedback && !addModalOpen && (
          <View testID="friends-feedback" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 10, paddingHorizontal: 10 }}>
            <Ionicons name="checkmark-circle-outline" size={16} color={t.correct} />
            <Text style={{ color: t.correct, fontSize: f.sub, fontWeight: '700', flex: 1 }}>{addFeedback}</Text>
          </View>
        )}

        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <ReportErrorButton
            screen="friends_tab"
            dataId="friends_tab_main"
            dataText={L('Вкладка друзья', 'Вкладка друзі', 'Friends tab', 'Pestaña amigos', 'Aba amigos', 'Tab bạn bè', 'Tab teman', 'Arkadaşlar sekmesi', 'Karta znajomych')}
          />
        </View>
    </>
  );

  return (
    <ScreenGradient artBackdrop="friends">
      <View testID="screen-friends" style={{ flex: 1 }}>
      <BouncyWrap style={bouncyStyle}>
        <AnimatedFlashList decelerationRate="fast"
          {...listScrollProps}
          testID="friends-list"
          data={sortedFriends}
          keyExtractor={(profile: FriendProfile) => profile.uid}
          renderItem={({ item: profile, index: i }: { item: FriendProfile; index: number }) => { // guard-ok: FlashList не memo-сравнивает renderItem; стабильны колбэки внутри (onOpenProfile={openProfileByUid} и т.д., аудит 2026-08-22)
            const together = togetherByUid[profile.uid];
            const event = friendMarkersByUid.get(profile.uid) ?? null;
            return (
              <Reanimated.View entering={FadeInDown.delay(Math.min(i, 10) * 40).duration(320)}>
                <FriendListRow
                  friendUid={profile.uid}
                  friendName={profile.name}
                  avatar={profile.avatar}
                  totalXp={profile.totalXp}
                  auraId={getEffectiveAvatarAuraId(profile.aura, profile.isPremium, profile.isVip)}
                  daysTogether={together?.days ?? null}
                  onOpenProfile={openProfileByUid}
                  onOpenDetails={openFriendSheetByUid}
                  event={event}
                  onOpenEvent={event ? openFriendEventByUid : undefined}
                />
              </Reanimated.View>
            );
          }}
          ListHeaderComponent={<>{listHeader}{friendsPreList}</>}
          ListEmptyComponent={friendsEmptyState}
          ListFooterComponent={listFooter}
        />
      </BouncyWrap>


      <AddFriendModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        codeInput={codeInput}
        setCodeInput={setCodeInput}
        isSearching={isSearching}
        foundUser={foundUser}
        searchError={searchError}
        isAdding={isAdding}
        addFeedback={addFeedback}
        onSearch={handleSearch}
        onAddFound={handleAddFound}
        onCloseFoundUser={() => setFoundUser(null)}
        lang={lang} t={t} f={f} chrome={chrome} themeMode={themeMode}
      />

      <Modal
        visible={giftTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setGiftTarget(null)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.58)' }}>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setGiftTarget(null)}
          />
          <LinearGradient
            colors={friendGiftSheetColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
            backgroundColor: chrome.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 18,
            paddingBottom: 28,
            gap: 12,
            borderWidth: 0,
            borderColor: 'transparent',
            overflow: 'hidden',
          }}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 22,
                right: 22,
                height: 1,
                backgroundColor: glassFill(t.accent, lightGlass ? 0.28 : 0.42),
                opacity: 0.75,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {giftTarget ? (() => {
                const effectiveAura = getEffectiveAvatarAuraId(giftTarget.aura, giftTarget.isPremium, giftTarget.isVip);
                const usesPremiumAura = effectiveAura === PREMIUM_AVATAR_AURA_ID;
                return (
                  <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={44} maskColor={chrome.mask}>
                    <AvatarView avatar={giftTarget.avatar} totalXP={giftTarget.totalXp} size={44} auraId={usesPremiumAura ? undefined : effectiveAura} />
                  </PremiumAvatarHalo>
                );
              })() : null}
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '900' }}>
                  {`${L('Подарок для', 'Подарунок для', 'Gift for', 'Regalo para', 'Presente para', 'Quà cho', 'Hadiah untuk', 'Hediye', 'Prezent dla')} ${giftTarget?.name ?? ''}`}
                </Text>
              </View>
              <TouchableOpacity
                testID="friend-gift-close"
                accessibilityRole="button"
                accessibilityLabel={L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
                onPress={() => setGiftTarget(null)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: chrome.button,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color={t.textPrimary} />
              </TouchableOpacity>
            </View>

            <LinearGradient
              colors={friendGiftPillColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: chrome.surface,
            }}>
              <Image
                source={oskolokImageForPackShards(giftBalance)}
                style={{ width: 20, height: 20 }}
                contentFit="contain"
                accessibilityLabel={triLang(lang, { ru: 'Жемчуг', uk: 'Перлини', en: 'Pearls', es: 'Perlas', 'pt-BR': 'Pérolas', vi: 'Ngọc trai', id: 'Mutiara', tr: 'İnciler', pl: 'Perły' })}
              />
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}>{giftBalance}</Text>
            </LinearGradient>

            {FRIEND_GIFT_CATALOG.map(gift => {
              const giftCost = giftCostForTarget(gift, giftTarget?.uid ?? '');
              const cannotAfford = giftBalance < giftCost;
              const disabled = giftBusyId !== null;
              const displayCost = cannotAfford ? giftCost - giftBalance : giftCost;
              const displayCostText = cannotAfford ? `+${displayCost}` : `${displayCost}`;
              const giftAccentColor = friendGiftAccent(gift.id, t, themeMode);
              const selected = selectedGiftId === gift.id;
              const optionColors = [
                glassFill(giftAccentColor, lightGlass ? 0.13 : 0.22),
                chrome.surface,
                chrome.card,
              ] as [string, string, string];
              return (
                <TouchableOpacity
                  key={gift.id}
                  testID={`friend-gift-option-${gift.id}`}
                  disabled={disabled}
                  onPress={() => { setSelectedGiftId(gift.id); setGiftSendFailedId(null); }}
                  activeOpacity={0.82}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 13,
                    borderRadius: 14,
                    backgroundColor: chrome.surface,
                    opacity: disabled ? 0.45 : cannotAfford ? 0.72 : 1,
                    borderWidth: selected ? 2 : 0,
                    borderColor: selected ? giftAccentColor : 'transparent',
                    overflow: 'hidden',
                  }}
                >
                  <LinearGradient
                    colors={optionColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 16,
                      right: 16,
                      height: 1,
                      backgroundColor: glassFill(giftAccentColor, lightGlass ? 0.30 : 0.52),
                      opacity: 0.62,
                    }}
                  />
                  <View style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: glassFill(giftAccentColor, lightGlass ? 0.16 : 0.22),
                  }}>
                    <Ionicons name={gift.icon as any} size={21} color={giftAccentColor} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                      {giftLabel(gift)}
                    </Text>
                  </View>
                  <View style={{ minWidth: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <Text style={{ color: giftAccentColor, fontSize: f.body, fontWeight: '900', textAlign: 'right' }}>
                      {displayCostText}
                    </Text>
                    <Image
                      source={oskolokImageForPackShards(displayCost)}
                      style={{ width: 22, height: 22 }}
                      contentFit="contain"
                      accessibilityLabel={triLang(lang, { ru: 'Жемчуг', uk: 'Перлини', en: 'Pearls', es: 'Perlas', 'pt-BR': 'Pérolas', vi: 'Ngọc trai', id: 'Mutiara', tr: 'İnciler', pl: 'Perły' })}
                    />
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={giftAccentColor} />}
                </TouchableOpacity>
              );
            })}
            {giftTarget ? (() => {
              const selectedGift = FRIEND_GIFT_CATALOG.find((gift) => gift.id === selectedGiftId) ?? FRIEND_GIFT_CATALOG[0];
              if (!selectedGift) return null;
              const selectedCost = giftCostForTarget(selectedGift, giftTarget.uid);
              const retry = giftSendFailedId === selectedGift.id;
              const ctaLabel = retry
                ? L('Повторить', 'Повторити', 'Retry', 'Reintentar', 'Tentar novamente', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Spróbuj ponownie')
                : `${L('Отправить', 'Надіслати', 'Send', 'Enviar', 'Enviar', 'Gửi', 'Kirim', 'Gönder', 'Wyślij')} ${giftLabel(selectedGift)} · ${selectedCost}`;
              return (
                <DuoPressable
                  testID="friend-gift-send-cta"
                  disabled={giftBusyId !== null}
                  onPress={() => requestSendGift(selectedGift.id)}
                  edgeColor={t.accent}
                  style={{ minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent, opacity: giftBusyId ? 0.6 : 1 }}
                >
                  <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>{ctaLabel}</Text>
                </DuoPressable>
              );
            })() : null}
          </LinearGradient>
        </View>
      </Modal>

      <Modal
        visible={incomingGiftModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setIncomingGiftModal(null)}
      >
        <View testID="friend-gift-received-modal" accessibilityViewIsModal style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(9, 8, 12, 0.72)' }}>
          <LinearGradient
            testID="friend-gift-received-card"
            colors={friendGiftIncomingModalChrome(themeMode) ?? ['rgba(255,247,222,0.98)', 'rgba(250,238,210,0.97)', 'rgba(232,213,176,0.96)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '100%',
              maxWidth: 372,
              borderRadius: 28,
              padding: isOliveTheme ? 0 : 1,
              // зачем: фон рисует LinearGradient, поэтому Android не выводил
              // скруглённый outline и заливал квадрат вокруг карточки.
              ...(themeMode === 'olive' ? oliveShadow(3) : softShadow({ color: '#D9A441', opacity: 0.32, radius: 28, offsetY: 16, elevation: 18 })),
            }}
          >
          <View style={{ borderRadius: 27, overflow: 'hidden', backgroundColor: themeMode === 'olive' ? OLIVE_RICH.panel : '#FFF9EE', borderWidth: 0, borderColor: 'transparent' }}>
            <LinearGradient
              colors={isOliveTheme ? ['rgba(201,168,76,0.08)', 'rgba(0,0,0,0)', 'rgba(201,168,76,0.05)'] : ['rgba(68,48,20,0.06)', 'rgba(255,255,255,0)', 'rgba(184,132,38,0.12)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ padding: 22, gap: 14 }}>
            {incomingGiftModal ? (() => {
              const first = incomingGiftModal.gifts[0];
              const from = first?.fromName || L('друг', 'друг', 'friend', 'amigo', 'amigo', 'bạn bè', 'teman', 'arkadaş', 'znajomy');
              const gift = first ? giftEventLabel(first as unknown as Record<string, string | number>, lang) : '';
              const multi = incomingGiftModal.gifts.length > 1;
              const iconGiftId = first?.giftId === 'xp_boost_2x_24h' ? 'xp_2x_24h' : first?.giftId;
              return (
                <>
                  <View style={{ alignSelf: 'center', alignItems: 'center', justifyContent: 'center', width: 98, height: 98 }}>
                    <View style={{ position: 'absolute', width: 98, height: 98, borderRadius: 49, backgroundColor: 'rgba(214,157,44,0.14)' }} />
                    <LinearGradient
                      testID={`friend-gift-rank-${iconGiftId || 'generic'}`}
                      colors={isOliveTheme ? ['#F0DEA5', '#C9A84C', '#9C7A29'] : ['#FFF8DD', '#E8C36A', '#B78628']}
                      start={{ x: 0.15, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={{ width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: isOliveTheme ? 0 : 1, borderColor: isOliveTheme ? 'transparent' : 'rgba(109,76,24,0.24)' }}
                    >
                      {iconGiftId ? (
                        <RetiredRasterFallback
                          kind="gift"
                          size={56}
                          color="#4C3412"
                          accessibilityLabel={triLang(lang, { ru: 'Иконка подарка', uk: 'Іконка подарунка', en: 'Gift icon', es: 'Icono de regalo', 'pt-BR': 'Ícone de presente', vi: 'Biểu tượng quà tặng', id: 'Ikon hadiah', tr: 'Hediye simgesi', pl: 'Ikona prezentu' })}
                        />
                      ) : (
                        <Ionicons name="gift-outline" size={34} color={'#4C3412'} />
                      )}
                    </LinearGradient>
                  </View>
                  <Text style={{ color: isOliveTheme ? OLIVE_RICH.champagneLight : '#7A5518', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0 }}>
                    {L('Подарок от друга', 'Подарунок від друга', 'Friend gift', 'Regalo de un amigo', 'Presente de amigo', 'Quà từ bạn bè', 'Hadiah teman', 'Arkadaş hediyesi', 'Prezent od znajomego')}
                  </Text>
                  <Text accessibilityRole="header" style={{ color: isOliveTheme ? OLIVE_RICH.ivory : '#21170B', fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
                    {multi
                      ? L('Новые подарки', 'Нові подарунки', 'New gifts', 'Regalos nuevos', 'Novos presentes', 'Quà mới', 'Hadiah baru', 'Yeni hediyeler', 'Nowe prezenty')
                      : L('Подарок получен', 'Подарунок отримано', 'Gift received', 'Regalo recibido', 'Presente recebido', 'Đã nhận quà', 'Hadiah diterima', 'Hediye alındı', 'Prezent otrzymany')}
                  </Text>
                  <View style={{ borderRadius: 18, padding: 14, gap: 8, backgroundColor: isOliveTheme ? OLIVE_RICH.surface : 'rgba(255,255,255,0.54)', borderWidth: 0, borderColor: 'transparent' }}>
                    <Text style={{ color: isOliveTheme ? OLIVE_RICH.ivory : '#4E3B1D', fontSize: f.sub, lineHeight: f.sub + 4, textAlign: 'center' }}>
                      {multi
                        ? L(`У тебя ${incomingGiftModal.gifts.length} новых подарка от друзей`, `У тебе ${incomingGiftModal.gifts.length} нових подарунки від друзів`, `You have ${incomingGiftModal.gifts.length} new gifts from friends`, `Tienes ${incomingGiftModal.gifts.length} regalos nuevos de amigos`, `Você tem ${incomingGiftModal.gifts.length} presentes novos de amigos`, `Bạn có ${incomingGiftModal.gifts.length} quà mới từ bạn bè`, `Kamu punya ${incomingGiftModal.gifts.length} hadiah baru dari teman`, `Arkadaşlarından ${incomingGiftModal.gifts.length} yeni hediye var`, `Masz ${incomingGiftModal.gifts.length} nowe prezenty od znajomych`)
                        : L(`${from} подарил: ${gift}`, `${from} подарував: ${gift}`, `${from} sent a gift: ${gift}`, `${from} te regaló: ${gift}`, `${from} deu um presente: ${gift}`, `${from} đã tặng: ${gift}`, `${from} memberi hadiah: ${gift}`, `${from} hediye verdi: ${gift}`, `${from} podarował: ${gift}`)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Ionicons name="albums-outline" size={15} color={isOliveTheme ? OLIVE_RICH.champagneLight : '#8A641D'} />
                      <Text style={{ color: isOliveTheme ? OLIVE_RICH.ivory : '#8A641D', fontSize: f.sub, fontWeight: '800', textAlign: 'center' }}>
                        {L('Сохранено в разделе «Подарки»', 'Збережено в розділі «Подарунки»', 'Saved in Gifts', 'Guardado en Regalos', 'Salvo em Presentes', 'Đã lưu trong Quà', 'Disimpan di Hadiah', 'Hediyeler bölümüne kaydedildi', 'Zapisano w Prezentach')}
                      </Text>
                    </View>
                  </View>
                </>
              );
            })() : null}
              {incomingGiftModal?.gifts[0] && (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    testID="friend-gift-reply-thanks"
                    activeOpacity={0.86}
                    disabled={giftBusyId !== null}
                    onPress={handleIncomingGiftThanks}
                    style={{ minHeight: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isOliveTheme ? OLIVE_RICH.surface : 'rgba(255,255,255,0.62)', borderWidth: 0, borderColor: 'transparent' }}
                  >
                    <Text style={{ color: isOliveTheme ? OLIVE_RICH.ivory : '#3D2B10', fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                      {L('Сказать спасибо', 'Сказати дякую', 'Say thanks', 'Agradecer', 'Agradecer', 'Cảm ơn', 'Ucapkan terima kasih', 'Teşekkür et', 'Podziękuj')}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      testID="friend-gift-reply-shield"
                      activeOpacity={0.86}
                      disabled={giftBusyId !== null}
                      onPress={() => void handleIncomingGiftReply('chain_shield_1')}
                      style={{ flex: 1, minHeight: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isOliveTheme ? OLIVE_RICH.raised : '#272015', borderWidth: 0, borderColor: 'transparent' }}
                    >
                      <Text style={{ color: '#FFF7DF', fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                        {L('Ответить щитом', 'Відповісти щитом', 'Send shield', 'Enviar escudo', 'Enviar escudo', 'Gửi khiên', 'Kirim perisai', 'Kalkan gönder', 'Wyślij tarczę')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="friend-gift-reply-boost"
                      activeOpacity={0.86}
                      disabled={giftBusyId !== null}
                      onPress={() => void handleIncomingGiftReply('xp_boost_2x_24h')}
                      style={{ flex: 1, minHeight: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isOliveTheme ? OLIVE_RICH.champagne : '#D7A83B' }}
                    >
                      <Text style={{ color: '#241905', fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                        {L('Отправить буст', 'Надіслати буст', 'Send boost', 'Enviar boost', 'Enviar boost', 'Gửi boost', 'Kirim boost', 'Boost gönder', 'Wyślij boost')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  testID="friend-gift-received-open-inventory"
                  onPress={() => {
                    setIncomingGiftModal(null);
                    router.push('/level_gifts_inventory' as any);
                  }}
                  activeOpacity={0.86}
                  style={{ flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isOliveTheme ? OLIVE_RICH.raised : '#272015', borderWidth: 0, borderColor: 'transparent' }}
                >
                  <Text style={{ color: '#FFF7DF', fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                    {L('В подарки', 'До подарунків', 'Gifts', 'Regalos', 'Presentes', 'Quà', 'Hadiah', 'Hediyeler', 'Prezenty')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="friend-gift-received-ok"
                  onPress={() => setIncomingGiftModal(null)}
                  activeOpacity={0.86}
                  style={{ flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isOliveTheme ? OLIVE_RICH.champagne : '#D7A83B' }}
                >
                  <Text style={{ color: '#241905', fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                    {/* зачем (аудит по Библии, 2026-08-26): «Понятно» — реакция,
                        а не действие (Правило 1: глагол в кнопке). Модалка про
                        полученный подарок, поэтому кнопка называет действие. Коротко:
                        две кнопки в ряду при numberOfLines={1} — длинная
                        подпись обрезалась бы на узких экранах. */}
                    {L('Забрать', 'Забрати', 'Claim', 'Reclamar', 'Receber', 'Nhận', 'Klaim', 'Al', 'Odbierz')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </LinearGradient>
        </View>
      </Modal>

      <FriendQuestStartedModal
        visible={friendQuestStarted !== null}
        onClose={() => setFriendQuestStarted(null)}
        L={L}
        f={f}
        themeMode={themeMode}
      />

      <FriendQuestCompletedModal
        visible={friendQuestCompleted !== null}
        onClose={() => setFriendQuestCompleted(null)}
        L={L}
        f={f}
        themeMode={themeMode}
      />

      <ReferralAccessEndedModal
        visible={referralMarketingVisible && accessEndedOpen}
        onInviteFriend={() => { setAccessEndedOpen(false); void dismissReferralAccessEnded(); void handleReferralInvite(); }}
        onOpenFullAccess={() => {
          setAccessEndedOpen(false);
          void dismissReferralAccessEnded();
          {/* зачем: аудит «пейволы-объясняют» — конец подарочного VIP показывал generic-копию;
              контекст referral_ended говорит юзеру, что именно закончилось. */}
          router.push({ pathname: '/premium_modal', params: { context: 'referral_ended', source: 'referral_ended' } } as any);
        }}
        onClose={() => { setAccessEndedOpen(false); void dismissReferralAccessEnded(); }}
        L={L}
        t={t}
      />

      <UnifiedPlayerModal
        player={selectedPlayer}
        myInfo={{
          name: myProfile?.name ?? 'Я',
          avatar: myProfile?.avatar ?? String(getBestAvatarForLevel(1)),
          frame: myProfile?.frame ?? String(getBestFrameForLevel(1).id),
          aura: myProfile?.aura,
          totalXP: myProfile?.totalXP ?? 0,
          streak: myProfile?.streak ?? null,
        }}
        onClose={() => setSelectedPlayer(null)}
      />

      {togetherSheetSession !== null && (() => {
        const sheetSession = togetherSheetSession;
        const friendUid = sheetSession.uid;
        const devBot = ENABLE_DEV_TOOLS ? devBots.find((bot) => bot.uid === friendUid) : undefined;
        const assetLevel = devBot ? getLevelFromXP(devBot.totalXp) : 1;
        const friendProfile = devBot
          ? devBotToFriendProfile(devBot, String(getBestAvatarForLevel(assetLevel)), String(getBestFrameForLevel(assetLevel).id))
          : resolveFriendSheetProfile(sheetSession, sortedFriends);
        const pair = devBot
          ? { days: devBot.days, level: devBotTogetherMetrics(devBot).level }
          : togetherSnapshot?.pairs[friendUid];
        const rowTogether = togetherByUid[friendUid];
        const next = pair ? nextThreshold(pair.level, friendsTogetherPolicy.config.levelThresholds) : null;
        const prevThreshold = pair && pair.level > 1 ? (nextThreshold(pair.level - 1, friendsTogetherPolicy.config.levelThresholds) ?? 0) : 0;
        const progressPercent = pair && next !== null ? Math.max(0, Math.min(100, Math.round(((pair.days - prevThreshold) / Math.max(1, next - prevThreshold)) * 100))) : null;
        const nextLevelName = pair && next !== null ? (LEVEL_NAMES[Math.min(LEVEL_NAMES.length - 1, pair.level + 1)] || null) : null;
        const togetherDisplay = pair && friendsTogetherUiEnabled
          ? {
            days: pair.days,
            level: pair.level,
            progressPercent,
            nextLevelName,
            nudged: rowTogether?.nudged ?? (devBot ? devBot.nudgedByMe : optimisticNudgedUids.has(friendUid) || isNudgedToday(friendUid)),
            learnedToday: rowTogether?.learnedToday ?? false,
            incomingNudge: rowTogether?.incomingNudge ?? false,
            giftReady: rowTogether?.giftReady ?? false,
          }
          : null;
        return (
          <FriendTogetherSheet
            visible={sheetSession.visible}
            onClose={() => setTogetherSheetSession(current => hideFriendSheetSession(current, friendUid))}
            onDismissed={() => setTogetherSheetSession(current => completeFriendSheetSession(current, friendUid))}
            friendName={friendProfile.name}
            friendUid={friendUid}
            friendAvatar={friendProfile.avatar}
            friendTotalXp={friendProfile.totalXp}
            friendAura={friendProfile.aura}
            myAvatar={myProfile?.avatar ?? String(getBestAvatarForLevel(1))}
            myTotalXp={myProfile?.totalXP ?? 0}
            streak={friendProfile.streak}
            highFived={highFivedUids.has(friendUid)}
            together={togetherDisplay}
            onNudge={togetherDisplay ? () => { if (devBot) void handleDevNudge(devBot.uid); else void handleNudgeFriend(friendUid, friendProfile.name); } : null}
            onGift={(requestDismiss) => {
              setPendingTogetherSheetAction(current => queueFirstFriendSheetAction(current, { kind: 'gift', profile: friendProfile }));
              requestDismiss();
            }}
            onHighFive={() => {
              if (devBot) {
                hapticTap();
                setHighFivedUids(current => {
                  const next = new Set(current);
                  if (next.has(friendProfile.uid)) next.delete(friendProfile.uid); else next.add(friendProfile.uid);
                  return next;
                });
              } else {
                void handleHighFive(friendProfile);
              }
            }}
            onDelete={devBot ? null : (requestDismiss) => {
              setPendingTogetherSheetAction(current => queueFirstFriendSheetAction(current, { kind: 'delete', profile: friendProfile }));
              requestDismiss();
            }}
          />
        );
      })()}

      {friendsTogetherPolicy.enabled && levelUpModal && (() => {
        const friendProfile = profiles[levelUpModal.friendUid];
        if (!friendProfile) return null;
        return (
          <FriendLevelUpModal
            visible
            friendName={friendProfile.name}
            friendAvatar={friendProfile.avatar}
            friendTotalXp={friendProfile.totalXp}
            friendAura={friendProfile.aura}
            myAvatar={myProfile?.avatar ?? String(getBestAvatarForLevel(1))}
            myTotalXp={myProfile?.totalXP ?? 0}
            level={levelUpModal.level}
            bonusPercent={bonusPercentForLevel(levelUpModal.level)}
            starsGranted={levelUpModal.starsGranted}
            claimBusy={levelClaimBusy}
            onClaim={() => { void handleClaimFriendLevel(); }}
          />
        );
      })()}

      {friendsTogetherUiEnabled && chestModal && (
        <FriendsChestModal
          visible
          tier={chestModal.tier}
          starsGranted={chestModal.starsGranted}
          xpBoostMinutes={chestModal.xpBoostMinutes}
          xpGranted={chestModal.xpGranted}
          energyRefilled={chestModal.energyRefilled}
          streakShield={chestModal.streakShield}
          aura={chestModal.aura}
          onClaim={() => setChestModal(null)}
        />
      )}

      <FriendStudyInviteModal
        visible={studyInvite !== null}
        onStart={() => {
          if (studyInvite) acknowledgeFriendEvent(studyInvite.event);
          setStudyInvite(null);
          router.push('/(tabs)/lessons' as never);
        }}
        onDecline={() => {
          if (studyInvite) acknowledgeFriendEvent(studyInvite.event);
          setStudyInvite(null);
        }}
      />

      {ENABLE_DEV_TOOLS && (
        <DevBotsSheet
          visible={devBotsSheetOpen}
          onClose={() => setDevBotsSheetOpen(false)}
          bots={devBots}
          onAddBots={(count) => { void handleDevAddBots(count); }}
          onAdvanceAll={() => { void handleDevAdvanceAll(); }}
          onAdvanceOne={(uid) => { void handleDevAdvanceOne(uid); }}
          onChestTier={(tier) => { void handleDevChestTier(tier); }}
          onIncomingNudge={(uid) => { void handleDevIncomingNudge(uid); }}
          onGiftReady={(uid) => { void handleDevGiftReady(uid); }}
          onResetChest={() => { void handleDevResetChest(); }}
          onReset={() => { void handleDevReset(); }}
        />
      )}

      <ThemedConfirmModal
        visible={deleteTarget !== null}
        title={L('Убрать друга?', 'Прибрати друга?', 'Remove friend?', '¿Quitar amigo?', 'Remover amigo?', 'Gỡ bạn bè?', 'Hapus teman?', 'Arkadaşı kaldır?', 'Usunąć znajomego?')}
        message={deleteTarget?.name ?? ''}
        cancelLabel={L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'İptal', 'Anuluj')}
        confirmLabel={L('Убрать', 'Прибрати', 'Remove', 'Quitar', 'Remover', 'Gỡ', 'Hapus', 'Kaldır', 'Usuń')}
        confirmVariant="default"
        testIDPrefix="friends-delete-confirm"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) {
            const previousFriend = friends.find(friend => friend.uid === target.uid) ?? null;
            setFriends(prev => prev.filter(friend => friend.uid !== target.uid));
            setSelectedPlayer(current => (current?.uid === target.uid || current?.friendUid === target.uid ? null : current));
            showFeedback(L('Убираем друга…', 'Прибираємо друга…', 'Removing friend…', 'Quitando amigo…', 'Removendo amigo…', 'Đang gỡ bạn bè…', 'Menghapus teman…', 'Arkadaş kaldırılıyor…', 'Usuwanie znajomego…'));
            emitAppEvent('action_toast', {
              type: 'info',
              messageRu: `Убираем друга: ${target.name}`,
              messageUk: `Видаляємо друга: ${target.name}`,
              messageEs: `Eliminando amigo: ${target.name}`,
              messagePtBr: `Removendo amigo: ${target.name}`,
              messageVi: `Đang xóa bạn bè: ${target.name}`,
              messageId: `Menghapus teman: ${target.name}`,
              messageTr: `Arkadaş siliniyor: ${target.name}`,
              messagePl: `Usuwanie znajomego: ${target.name}`,
            });
            deleteFriend(target.uid)
              .then(() => {
                showFeedback(L('Друг убран', 'Друга прибрано', 'Friend removed', 'Amigo quitado', 'Amigo removido', 'Đã gỡ bạn bè', 'Teman dihapus', 'Arkadaş kaldırıldı', 'Znajomy usunięty'));
                emitAppEvent('action_toast', {
                  type: 'success',
                  messageRu: `Друг убран: ${target.name}`,
                  messageUk: `Друга видалено: ${target.name}`,
                  messageEs: `Amigo eliminado: ${target.name}`,
                  messagePtBr: `Amigo removido: ${target.name}`,
                  messageVi: `Đã xóa bạn bè: ${target.name}`,
                  messageId: `Teman dihapus: ${target.name}`,
                  messageTr: `Arkadaş silindi: ${target.name}`,
                  messagePl: `Znajomy usunięty: ${target.name}`,
                });
              })
              .catch(() => {
                if (previousFriend) {
                  setFriends(prev => prev.some(friend => friend.uid === previousFriend.uid) ? prev : [previousFriend, ...prev]);
                }
                showFeedback(L('Не получилось убрать друга. Попробуй ещё раз', 'Не вдалося прибрати друга. Спробуй ще раз', 'Could not remove. Try again', 'No se pudo quitar. Inténtalo de nuevo', 'Não deu para remover. Tente novamente', 'Chưa gỡ được. Hãy thử lại', 'Belum bisa dihapus. Coba lagi', 'Kaldırılamadı. Tekrar dene', 'Nie udało się usunąć. Spróbuj ponownie'));
                emitAppEvent('action_toast', {
                  type: 'error',
                  messageRu: 'Не получилось убрать друга. Попробуй ещё раз',
                  messageUk: 'Помилка видалення. Спробуйте ще раз',
                  messageEs: 'Error al eliminar. Inténtalo de nuevo',
                  messagePtBr: 'Erro ao remover. Tente novamente',
                  messageVi: 'Không xóa được. Hãy thử lại',
                  messageId: 'Gagal menghapus. Coba lagi',
                  messageTr: 'Silme hatası. Tekrar dene',
                  messagePl: 'Błąd usuwania. Spróbuj ponownie',
                });
              });
          }
        }}
      />
      </View>
    </ScreenGradient>
  );
}
