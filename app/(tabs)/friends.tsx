import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  View, Text, TouchableOpacity, TextInput, ScrollView, Animated,
  Share, Keyboard, StyleSheet, Modal, InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import Reanimated, { runOnJS, useSharedValue } from 'react-native-reanimated';

// FlashList с поддержкой Reanimated-обработчика скролла (onScroll-worklet на UI-потоке).
const AnimatedFlashList = Reanimated.createAnimatedComponent(FlashList as any) as any;
import TapScale from '../../components/TapScale';
import DuoPressable from '../../components/DuoPressable';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import VipGreenUserName from '../../components/VipGreenUserName';
import LeagueCrownName from '../../components/LeagueCrownName';
import ProfileCardBadge from '../../components/ProfileCardBadge';
import { StreakChainIcon } from '../../components/StreakChainIcon';
import UnifiedPlayerModal, { PlayerInfo } from '../../components/PlayerProfileModal';
import ThemedConfirmModal from '../../components/ThemedConfirmModal';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import { getLevelGiftRewardIcon } from '../../constants/levelGiftRewardIcons';
import { getSocialFriendsIcon } from '../../constants/socialIconAssets';
import { PREMIUM_AVATAR_AURA_ID, USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId, normalizeAvatarAuraId } from '../../constants/avatar_auras';
import { getLevelFromXP, getXPProgress, type ThemeMode } from '../../constants/theme';
import { monoIcon, MONO_ICON } from '../../constants/monoIcon';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import {
  normalizeProfileCardLevel,
  normalizeProfileCardMotion,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
} from '../profile_card_system';
import { stableInitialWindowMetrics, useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { isValidInviteCodeLookup, normalizeInviteCodeInput } from '../friend_code';
import { ensureMyInviteCodeForFriends, lookupUserByFriendCode, lookupUserByNickname, readCachedMyInviteCodeForFriends, type LookupUserProfile } from '../firestore_friends';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  subscribeToFriends,
  subscribeToIncomingRequests,
  ensureFriendRequestViewerAuthLink,
  cleanupStaleFriendData,
  type FriendEntry,
  type FriendRequestEntry,
} from '../firestore_friend_requests';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getCanonicalUserId } from '../user_id_policy';
import { ensureAnonUser } from '../cloud_sync';
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
import { fetchFriendsActivityFeed, invalidateFriendsActivityCache, type FriendEvent } from '../firestore_friend_activity';
import {
  fetchTodayActivityLikeState,
  fetchActivityLikeTotal,
  sendFriendActivityLike,
  todayActivityLikeDateKeyUtc,
  type FriendActivityLikeTodayState,
} from '../friend_activity_likes';
import {
  bumpActivityLikeCount,
  rollbackActivityLikeCount,
  setActivityLikeCount,
} from '../friend_activity_like_optimistic';
import { trackActivity } from '../app_activity';
import { getShardsBalance } from '../shards_system';
import { oskolokImageForPackShards } from '../oskolok';
import { claimUnseenFriendGifts, type IncomingFriendGift } from '../friend_gift_inbox';
import { emitAppEvent } from '../events';
import {
  FRIEND_GIFT_CATALOG,
  classifyFriendGiftError,
  isFriendGiftsCloudEnabled,
  sendFriendGiftWithShards,
  sendFriendGiftThanks,
  type FriendGiftId,
} from '../friend_gifts';
import {
  claimFriendQuestReward,
  getActiveFriendQuest,
  type FriendQuest,
} from '../friend_quests';
import { checkAchievements } from '../achievements';
import { ReferralAccessEndedModal } from '../referral_access_ended_modal';
import {
  getClaimableReferralState,
  summarizeInvites,
  type ReferralInvite,
} from '../referral_vip';
import { buildCloudReferralInviteShare } from '../referral_invite_share';
import { generateReferralCode, getReferralCode } from '../referral_system';
import { isReferralCloudEnabled } from '../referral_flags';
import {
  shouldShowReferralAccessEnded,
  markReferralAccessEndedSeen,
  getTrackedReferralWindowEnd,
} from '../referral_access_ended_tracker';
import { useAppSnapshotSelector } from '../app_snapshot_store';

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
  if (themeMode === 'minimalDark') {
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

function placeholderFriendProfile(uid: string, fallbackName?: string): FriendProfile {
  const sanitizedName = cleanFriendDisplayName(fallbackName);
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
 * зависит от leaderboard/arena (у многих юзеров записи там нет → раньше был прочерк
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
  fallbackName?: string,
): FriendProfile | null {
  const sanitizedName = cleanFriendDisplayName(fallbackName);
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

function profileFromArenaDoc(uid: string, data: Record<string, unknown>): FriendProfile | null {
  const stableUid = readPublicString(data.mirrorStableId) || uid;
  const totalXp = readPublicNumber(data.courseTotalXp);
  const avatar = readPublicString(data.courseAvatar);
  const frame = readPublicString(data.courseFrame);
  const aura = normalizeAvatarAuraId(readPublicString(data.courseAura));
  const name = readPublicString(data.displayName) || readPublicString(data.name);
  const profileCardLevel = normalizeProfileCardLevel(data.courseProfileCardLevel);
  if (!name && totalXp <= 0 && !avatar && !frame && !aura && profileCardLevel <= 0) return null;

  return normalizePublicFriendProfile({
    uid: stableUid,
    name,
    totalXp,
    weeklyXp: 0,
    streak: 0,
    isPremium: data.courseIsPremium === true || data.isPremium === true,
    isVip: data.courseIsVip === true || data.isVip === true,
    isLifetime: data.courseIsLifetime === true || data.isLifetime === true,
    avatar,
    frame,
    aura,
    profileCardLevel,
    profileCardTheme: normalizeProfileCardTheme(data.courseProfileCardTheme),
    profileCardMotion: normalizeProfileCardMotion(data.courseProfileCardMotion),
    profileCardPublicFocus: normalizeProfileCardPublicFocus(data.courseProfileCardPublicFocus),
  });
}

async function fetchFriendProfileFromFirestore(uid: string): Promise<FriendProfile | null> {
  try {
    const db = getDb();
    if (!db) return null;
    let profile: FriendProfile | null = null;

    const leaderboardSnap = await db.collection('leaderboard').doc(uid).get();
    if (leaderboardSnap.exists) {
      profile = mergePublicFriendProfiles(profile, profileFromLeaderboardDoc(uid, leaderboardSnap.data() ?? {}));
    }
    if (!profile || profile.totalXp <= 0) {
      const byAuthSnap = await db.collection('leaderboard').where('firebaseAuthUid', '==', uid).limit(1).get();
      const byAuthDoc = byAuthSnap.docs?.[0];
      if (byAuthDoc) {
        profile = mergePublicFriendProfiles(profile, profileFromLeaderboardDoc(byAuthDoc.id, byAuthDoc.data() ?? {}));
      }
    }

    if (!profile || profile.totalXp <= 0) {
      const arenaByStableSnap = await db.collection('arena_profiles').where('mirrorStableId', '==', uid).limit(1).get();
      const arenaByStableDoc = arenaByStableSnap.docs?.[0];
      if (arenaByStableDoc) {
        profile = mergePublicFriendProfiles(profile, profileFromArenaDoc(uid, arenaByStableDoc.data() ?? {}));
      }
    }

    if (!profile || profile.totalXp <= 0) {
      const arenaSnap = await db.collection('arena_profiles').doc(uid).get();
      if (arenaSnap.exists) {
        profile = mergePublicFriendProfiles(profile, profileFromArenaDoc(uid, arenaSnap.data() ?? {}));
      }
    }

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
    const fetched = await mapWithConcurrency(toFetch, 6, (uid) => fetchFriendProfileFromFirestore(uid));
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

// ── Friend row ────────────────────────────────────────────────────────────────

const FRIEND_ROW_AVATAR_SIZE = 60;

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

function FriendRow({
  profile, rank, onPress, onDelete, onGift, lang, t, f, chrome, themeMode, referralStatus,
}: {
  profile: FriendProfile; rank: number;
  onPress: () => void; onDelete: () => void; onGift: () => void;
  lang: string; t: any; f: any;
  chrome: FriendsChrome;
  themeMode: ThemeMode;
  /** Статус приглашения, если друг пришёл по твоему коду. */
  referralStatus?: 'pending' | 'qualified' | 'rewarded';
}) {
  const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : t.textMuted;
  const leagueCrownCount = Math.max(0, Math.floor(Number(profile.leagueCrownCount) || 0));
  const hasLeagueCrown = leagueCrownCount > 0 || Number(profile.leagueCrownExpiresAt) > Date.now();
  const displayLeagueCrownCount = hasLeagueCrown ? Math.max(1, leagueCrownCount) : 0;
  const effectiveAura = getEffectiveAvatarAuraId(profile.aura, profile.isPremium, profile.isVip);
  const usesPremiumAura = effectiveAura === PREMIUM_AVATAR_AURA_ID;
  return (
    <View
      testID={`friend-row-${profile.uid}`}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: glassFill(chrome.card, 0.46),
        borderRadius: 16, padding: 14, marginBottom: 10,
        borderTopWidth: 1, borderTopColor: glassFill(t.accent, 0.14),
      }}
    >
      <TouchableOpacity
        testID={`friend-row-profile-${profile.uid}`}
        activeOpacity={0.75}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={triLang(lang as any, { ru: `Открыть профиль ${profile.name}`, uk: `Відкрити профіль ${profile.name}`, es: `Abrir perfil de ${profile.name}`, 'pt-BR': `Abrir perfil de ${profile.name}`, vi: `Mở hồ sơ ${profile.name}`, id: `Buka profil ${profile.name}`, tr: `${profile.name} profilini aç`, pl: `Otwórz profil ${profile.name}` })}
        style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <Text style={{ minWidth: 28, fontSize: f.body, fontWeight: '800', color: rankColor, textAlign: 'center' }}>
          {rank}
        </Text>
        <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={FRIEND_ROW_AVATAR_SIZE} maskColor={chrome.mask} animateShimmer={false}>
          <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={FRIEND_ROW_AVATAR_SIZE} auraId={usesPremiumAura ? undefined : effectiveAura} animateAura={false} />
        </PremiumAvatarHalo>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              {hasLeagueCrown
                ? <LeagueCrownName text={profile.name} fontSize={f.body} count={displayLeagueCrownCount} />
                : profile.isPremium
                ? <PremiumGoldUserName text={profile.name} fontSize={f.body} />
                : profile.isVip
                ? <VipGreenUserName text={profile.name} fontSize={f.body} />
                : <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>{profile.name}</Text>
              }
            </View>
            <ProfileCardBadge level={profile.profileCardLevel} theme={profile.profileCardTheme} />
          </View>
          <MiniXpBar xp={profile.totalXp} color={t.textSecond} />
          {referralStatus && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Ionicons
                name={referralStatus === 'pending' ? 'hourglass-outline' : 'checkmark-circle'}
                size={12}
                color={referralStatus === 'pending' ? t.textMuted : t.accent}
              />
              <Text
                style={{ fontSize: f.xs ?? 11, fontWeight: '700', color: referralStatus === 'pending' ? t.textMuted : t.accent }}
                numberOfLines={1}
              >
                {referralStatus === 'pending'
                  ? triLang(lang as any, { ru: 'По твоему приглашению', uk: 'За твоїм запрошенням', es: 'Por tu invitación', 'pt-BR': 'Pelo seu convite', vi: 'Theo lời mời của bạn', id: 'Lewat undanganmu', tr: 'Senin davetinle', pl: 'Z twojego zaproszenia' })
                  : referralStatus === 'qualified'
                  ? triLang(lang as any, { ru: 'Готов открыть доступ', uk: 'Готовий відкрити доступ', es: 'Listo para abrir acceso', 'pt-BR': 'Pronto para abrir acesso', vi: 'Sẵn sàng mở quyền', id: 'Siap buka akses', tr: 'Erişim açmaya hazır', pl: 'Gotowy otworzyć dostęp' })
                  : triLang(lang as any, { ru: 'Доступ открыт', uk: 'Доступ відкрито', es: 'Acceso abierto', 'pt-BR': 'Acesso aberto', vi: 'Đã mở quyền', id: 'Akses dibuka', tr: 'Erişim açıldı', pl: 'Dostęp otwarty' })}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Живой пульс недели: видно, кто реально занимается прямо сейчас. */}
          {profile.weeklyXp > 0 && (
            <View testID={`friend-weekly-xp-${profile.uid}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="flash" size={12} color={t.accent} />
              <Text style={{ fontSize: f.sub, color: t.accent, fontWeight: '800' }}>+{profile.weeklyXp}</Text>
            </View>
          )}
          {profile.streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <StreakChainIcon themeMode={themeMode} streakDays={profile.streak} size={16} />
              <Text style={{ fontSize: f.sub, color: monoIcon(themeMode, '#FF9500'), fontWeight: '700' }}>{profile.streak}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TapScale
            testID={`friend-gift-${profile.uid}`}
            onPress={onGift}
            hitSlop={6}
            accessibilityLabel={triLang(lang as any, { ru: `Подарить ${profile.name}`, uk: `Подарувати ${profile.name}`, es: `Regalar a ${profile.name}`, 'pt-BR': `Presentear ${profile.name}`, vi: `Tặng quà cho ${profile.name}`, id: `Beri hadiah ke ${profile.name}`, tr: `${profile.name} kullanıcısına hediye gönder`, pl: `Podaruj ${profile.name}` })}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="gift-outline" size={18} color={t.accent} />
          </TapScale>
          <TapScale
            testID={`friend-delete-${profile.uid}`}
            onPress={onDelete}
            hitSlop={6}
            accessibilityLabel={triLang(lang as any, { ru: `Удалить ${profile.name}`, uk: `Видалити ${profile.name}`, es: `Eliminar a ${profile.name}`, 'pt-BR': `Remover ${profile.name}`, vi: `Xóa ${profile.name}`, id: `Hapus ${profile.name}`, tr: `${profile.name} kullanıcısını sil`, pl: `Usuń ${profile.name}` })}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="person-remove-outline" size={16} color={t.textMuted} />
          </TapScale>
        </View>
      </View>
    </View>
  );
}

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
      borderTopWidth: 1, borderTopColor: glassFill(t.accent, 0.14), gap: 12,
    }}>
      <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={44} maskColor={chrome.mask} animateShimmer={false}>
        <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={44} auraId={usesPremiumAura ? undefined : effectiveAura} animateAura={false} />
      </PremiumAvatarHalo>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            {hasLeagueCrown
              ? <LeagueCrownName text={profile.name} fontSize={f.body} count={displayLeagueCrownCount} />
              : profile.isPremium
              ? <PremiumGoldUserName text={profile.name} fontSize={f.body} />
              : profile.isVip
              ? <VipGreenUserName text={profile.name} fontSize={f.body} />
              : <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>{profile.name}</Text>
            }
          </View>
          <ProfileCardBadge level={profile.profileCardLevel} theme={profile.profileCardTheme} />
        </View>
        <MiniXpBar xp={profile.totalXp} color={t.textSecond} />
        {profile.streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
            <StreakChainIcon themeMode={themeMode} streakDays={profile.streak} size={15} />
            <Text style={{ fontSize: f.sub, color: monoIcon(themeMode, '#FF9500'), fontWeight: '700' }}>{profile.streak}</Text>
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
            borderWidth: 0.5,
            borderColor: chrome.border,
          }}
        >
          <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700' }}>
            {triLang(lang as any, {
              ru: 'Отклонить',
              uk: 'Відхилити',
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
      borderWidth: 1, borderColor: t.accent + '55', gap: 16,
      shadowColor: t.accent, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={56} maskColor={chrome.mask}>
          <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={56} auraId={usesPremiumAura ? undefined : effectiveAura} />
        </PremiumAvatarHalo>
        <View style={{ flex: 1 }}>
          {hasLeagueCrown
            ? <LeagueCrownName text={profile.name} fontSize={f.h3 ?? f.body + 2} count={displayLeagueCrownCount} />
            : profile.isPremium
            ? <PremiumGoldUserName text={profile.name} fontSize={f.h3 ?? f.body + 2} />
            : profile.isVip
            ? <VipGreenUserName text={profile.name} fontSize={f.h3 ?? f.body + 2} />
            : <Text style={{ color: t.textPrimary, fontSize: f.h3 ?? 18, fontWeight: '800' }}>{profile.name}</Text>
          }
          <Text style={{ color: t.textSecond, fontSize: f.body, marginTop: 2 }}>
            Lv {level} • {profile.totalXp.toLocaleString()} XP
          </Text>
          {profile.streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <StreakChainIcon themeMode={themeMode} streakDays={profile.streak} size={15} />
              <Text style={{ color: monoIcon(themeMode, '#FF9500'), fontSize: f.sub }}>
                {profile.streak} {triLang(lang as any, {
                  ru: 'дней подряд',
                  uk: 'днів поспіль',
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

// ── Activity feed helpers ─────────────────────────────────────────────────────

function formatEventTime(ts: number, lang: string): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (min < 2) return triLang(lang as any, {
    ru: 'только что',
    uk: 'щойно',
    es: 'ahora mismo',
    'pt-BR': 'agora mesmo',
    vi: 'vừa xong',
    id: 'baru saja',
    tr: 'az önce',
    pl: 'przed chwilą',
  });
  if (min < 60) return triLang(lang as any, {
    ru: `${min} мин назад`,
    uk: `${min} хв тому`,
    es: `hace ${min} min`,
    'pt-BR': `há ${min} min`,
    vi: `${min} phút trước`,
    id: `${min} menit lalu`,
    tr: `${min} dk önce`,
    pl: `${min} min temu`,
  });
  if (hrs < 24) return triLang(lang as any, {
    ru: `${hrs} ч назад`,
    uk: `${hrs} год тому`,
    es: `hace ${hrs} h`,
    'pt-BR': `há ${hrs} h`,
    vi: `${hrs} giờ trước`,
    id: `${hrs} jam lalu`,
    tr: `${hrs} sa önce`,
    pl: `${hrs} godz. temu`,
  });
  if (days < 7) return triLang(lang as any, {
    ru: `${days} дн назад`,
    uk: `${days} дн тому`,
    es: `hace ${days} días`,
    'pt-BR': `há ${days} dias`,
    vi: `${days} ngày trước`,
    id: `${days} hari lalu`,
    tr: `${days} gün önce`,
    pl: `${days} dni temu`,
  });
  const dateLocaleByLang: Record<Lang, string> = {
    ru: 'ru-RU',
    uk: 'uk-UA',
    es: 'es-ES',
    'pt-BR': 'pt-BR',
    vi: 'vi-VN',
    id: 'id-ID',
    tr: 'tr-TR',
    pl: 'pl-PL',
  };
  const dateLocale = dateLocaleByLang[lang as Lang] ?? dateLocaleByLang.ru;
  return new Date(ts).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' });
}

function giftEventLabel(payload: Record<string, string | number>, lang: string): string {
  const payloadKeyByLang: Record<Lang, keyof typeof payload> = {
    ru: 'giftLabelRu',
    uk: 'giftLabelUk',
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

function eventText(event: FriendEvent, friendName: string, lang: string): string {
  const n = friendName;
  const p = event.payload;
  const L = (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang as any, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
  if (event.type === 'friend_gift_sent') {
    const gift = giftEventLabel(p, lang);
    return L(`${n} отправил подарок: ${gift}`, `${n} надіслав подарунок: ${gift}`, `${n} envió un regalo: ${gift}`, `${n} enviou um presente: ${gift}`, `${n} đã gửi quà: ${gift}`, `${n} mengirim hadiah: ${gift}`, `${n} hediye gönderdi: ${gift}`, `${n} wysłał prezent: ${gift}`);
  }
  if (event.type === 'friend_gift_received') {
    const gift = giftEventLabel(p, lang);
    return L(`${n} получил подарок: ${gift}`, `${n} отримав подарунок: ${gift}`, `${n} recibió un regalo: ${gift}`, `${n} recebeu um presente: ${gift}`, `${n} đã nhận quà: ${gift}`, `${n} menerima hadiah: ${gift}`, `${n} hediye aldı: ${gift}`, `${n} otrzymał prezent: ${gift}`);
  }
  switch (event.type) {
    case 'level_up':
      return L(`${n} достиг уровня ${p.level}`, `${n} досяг рівня ${p.level}`, `${n} alcanzó el nivel ${p.level}`, `${n} alcançou o nível ${p.level}`, `${n} đạt cấp ${p.level}`, `${n} mencapai level ${p.level}`, `${n} ${p.level}. seviyeye ulaştı`, `${n} osiągnął poziom ${p.level}`);
    case 'lesson_complete': {
      const lvlMap: Record<string, string> = {
        easy: L('лёгкий', 'легкий', 'fácil', 'fácil', 'dễ', 'mudah', 'kolay', 'łatwy'),
        medium: L('средний', 'середній', 'medio', 'médio', 'vừa', 'sedang', 'orta', 'średni'),
        hard: L('сложный', 'складний', 'difícil', 'difícil', 'khó', 'sulit', 'zor', 'trudny'),
      };
      const lvlName = lvlMap[String(p.level)] ?? String(p.level);
      return L(`${n} прошёл урок (${lvlName})`, `${n} пройшов урок (${lvlName})`, `${n} completó la lección (${lvlName})`, `${n} concluiu a lição (${lvlName})`, `${n} hoàn thành bài học (${lvlName})`, `${n} menyelesaikan pelajaran (${lvlName})`, `${n} dersi tamamladı (${lvlName})`, `${n} ukończył lekcję (${lvlName})`);
    }
    case 'achievement':
      return L(`${n} получил достижение ${p.icon ?? '🏆'} «${p.nameRu}»`, `${n} отримав досягнення ${p.icon ?? '🏆'} «${p.nameRu}»`, `${n} desbloqueó logro ${p.icon ?? '🏆'} «${p.nameRu}»`, `${n} desbloqueou uma conquista ${p.icon ?? '🏆'}`, `${n} đã mở khóa một thành tích ${p.icon ?? '🏆'}`, `${n} membuka pencapaian ${p.icon ?? '🏆'}`, `${n} bir başarı açtı ${p.icon ?? '🏆'}`, `${n} odblokował osiągnięcie ${p.icon ?? '🏆'}`);
    case 'streak_milestone':
      return L(`${n} держит серию ${p.days} дней подряд 🔥`, `${n} тримає серію ${p.days} днів поспіль 🔥`, `${n} lleva ${p.days} días seguidos 🔥`, `${n} mantém uma sequência de ${p.days} dias 🔥`, `${n} giữ chuỗi ${p.days} ngày liên tiếp 🔥`, `${n} menjaga rangkaian ${p.days} hari berturut-turut 🔥`, `${n} ${p.days} günlük seriyi sürdürüyor 🔥`, `${n} utrzymuje serię ${p.days} dni z rzędu 🔥`);
    case 'arena_rank_up':
      return L(`${n} поднялся до ранга «${p.rank}» на арене ⚔️`, `${n} піднявся до рангу «${p.rank}» на арені ⚔️`, `${n} subió al rango «${p.rank}» en la arena ⚔️`, `${n} subiu para o rank «${p.rank}» na arena ⚔️`, `${n} lên hạng «${p.rank}» trong đấu trường ⚔️`, `${n} naik ke peringkat «${p.rank}» di arena ⚔️`, `${n} arenada «${p.rank}» rütbesine yükseldi ⚔️`, `${n} awansował do rangi „${p.rank}” na arenie ⚔️`);
    case 'arena_rank_down':
      return L(`${n} потерял ранг на арене`, `${n} втратив ранг на арені`, `${n} bajó de rango en la arena`, `${n} caiu de rank na arena`, `${n} bị tụt hạng trong đấu trường`, `${n} turun peringkat di arena`, `${n} arenada rütbe kaybetti`, `${n} stracił rangę na arenie`);
    default:
      return `${n} — ${event.type}`;
  }
}

/** Русские/украинские/польские формы «урок/урока/уроков» по числу. */
function lessonsWordForm(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Схлопнутая карточка «N уроков за день» — вместо ленты одинаковых событий. */
function lessonsDayText(friendName: string, count: number, lang: string): string {
  const n = friendName;
  const ru = lessonsWordForm(count, 'урок', 'урока', 'уроков');
  const uk = lessonsWordForm(count, 'урок', 'уроки', 'уроків');
  const pl = lessonsWordForm(count, 'lekcję', 'lekcje', 'lekcji');
  return triLang(lang as any, {
    ru: `${n} прошёл ${count} ${ru} за день 💪`,
    uk: `${n} пройшов ${count} ${uk} за день 💪`,
    es: `${n} completó ${count} lecciones en un día 💪`,
    'pt-BR': `${n} concluiu ${count} lições em um dia 💪`,
    vi: `${n} đã hoàn thành ${count} bài học trong ngày 💪`,
    id: `${n} menyelesaikan ${count} pelajaran dalam sehari 💪`,
    tr: `${n} bir günde ${count} ders tamamladı 💪`,
    pl: `${n} ukończył ${count} ${pl} w ciągu dnia 💪`,
  });
}

/** Заголовок дайджеста «Сегодня у друзей: N уроков · M событий». */
function activityDigestText(lessons: number, milestones: number, lang: string): string {
  const parts: Record<Lang, string[]> = {
    ru: [], uk: [], es: [], 'pt-BR': [], vi: [], id: [], tr: [], pl: [],
  };
  if (lessons > 0) {
    parts.ru.push(`${lessons} ${lessonsWordForm(lessons, 'урок', 'урока', 'уроков')}`);
    parts.uk.push(`${lessons} ${lessonsWordForm(lessons, 'урок', 'уроки', 'уроків')}`);
    parts.es.push(`${lessons} ${lessons === 1 ? 'lección' : 'lecciones'}`);
    parts['pt-BR'].push(`${lessons} ${lessons === 1 ? 'lição' : 'lições'}`);
    parts.vi.push(`${lessons} bài học`);
    parts.id.push(`${lessons} pelajaran`);
    parts.tr.push(`${lessons} ders`);
    parts.pl.push(`${lessons} ${lessonsWordForm(lessons, 'lekcja', 'lekcje', 'lekcji')}`);
  }
  if (milestones > 0) {
    parts.ru.push(`${milestones} ${lessonsWordForm(milestones, 'достижение', 'достижения', 'достижений')}`);
    parts.uk.push(`${milestones} ${lessonsWordForm(milestones, 'досягнення', 'досягнення', 'досягнень')}`);
    parts.es.push(`${milestones} ${milestones === 1 ? 'logro' : 'logros'}`);
    parts['pt-BR'].push(`${milestones} ${milestones === 1 ? 'conquista' : 'conquistas'}`);
    parts.vi.push(`${milestones} cột mốc`);
    parts.id.push(`${milestones} pencapaian`);
    parts.tr.push(`${milestones} başarı`);
    parts.pl.push(`${milestones} ${lessonsWordForm(milestones, 'osiągnięcie', 'osiągnięcia', 'osiągnięć')}`);
  }
  return triLang(lang as any, {
    ru: `Сегодня у друзей: ${parts.ru.join(' · ')}`,
    uk: `Сьогодні у друзів: ${parts.uk.join(' · ')}`,
    es: `Hoy tus amigos: ${parts.es.join(' · ')}`,
    'pt-BR': `Hoje seus amigos: ${parts['pt-BR'].join(' · ')}`,
    vi: `Hôm nay bạn bè: ${parts.vi.join(' · ')}`,
    id: `Hari ini temanmu: ${parts.id.join(' · ')}`,
    tr: `Bugün arkadaşların: ${parts.tr.join(' · ')}`,
    pl: `Dzisiaj znajomi: ${parts.pl.join(' · ')}`,
  });
}

function eventIcon(type: FriendEvent['type']): string {
  if (type === 'friend_gift_sent' || type === 'friend_gift_received') return 'gift-outline';
  switch (type) {
    case 'level_up': return 'trending-up';
    case 'lesson_complete': return 'book-outline';
    case 'achievement': return 'trophy-outline';
    case 'streak_milestone': return 'flame-outline';
    case 'arena_rank_up': return 'arrow-up-circle-outline';
    case 'arena_rank_down': return 'arrow-down-circle-outline';
    default: return 'ellipse-outline';
  }
}

function eventIconColor(type: FriendEvent['type'], accent: string): string {
  if (type === 'friend_gift_sent') return '#60A5FA';
  if (type === 'friend_gift_received') return '#A78BFA';
  switch (type) {
    case 'level_up': return '#34C759';
    case 'lesson_complete': return accent;
    case 'achievement': return '#FFD700';
    case 'streak_milestone': return '#FF9500';
    case 'arena_rank_up': return '#34C759';
    case 'arena_rank_down': return '#FF6B6B';
    default: return accent;
  }
}

// ── Activity tab ──────────────────────────────────────────────────────────────

function FriendQuestStartedModal({
  visible, onClose, L, f, themeMode,
}: {
  visible: boolean;
  onClose: () => void;
  L: (...args: string[]) => string;
  f: any;
  themeMode: ThemeMode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(9, 8, 12, 0.72)' }}>
        <View style={{ width: '100%', maxWidth: 372, borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: 'rgba(156,115,45,0.32)' }}>
          <LinearGradient colors={['rgba(255,248,221,0.98)', 'rgba(232,195,106,0.42)']} style={{ padding: 22, gap: 14 }}>
            <View style={{ alignSelf: 'center', alignItems: 'center', justifyContent: 'center', width: 82, height: 82 }}>
              <FriendsThemeIcon themeMode={themeMode} size={82} accessibilityLabel="Friend quest" />
            </View>
            <Text style={{ color: monoIcon(themeMode, '#21170B', MONO_ICON.onLight), fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
              {L('Совместная миссия началась', 'Спільна місія почалася', 'Friend quest started', 'Missão conjunta iniciada', 'Nhiệm vụ bạn bè bắt đầu', 'Quest teman dimulai', 'Arkadaş görevi başladı', 'Misja ze znajomym rozpoczęta')}
            </Text>
            <Text style={{ color: monoIcon(themeMode, '#4E3B1D', MONO_ICON.onLight), fontSize: f.sub, lineHeight: f.sub + 5, textAlign: 'center' }}>
              {L('Наберите оба по 3000 XP за 24 часа и получите по 10 шардов и 1000 XP.', 'Наберіть обидва по 3000 XP за 24 години й отримайте по 10 шардів і 1000 XP.', 'Both of you need 3000 XP in 24 hours to earn 10 shards and 1000 XP each.', 'Ambos precisam de 3000 XP em 24 horas para ganhar 10 shards e 1000 XP.', 'Cả hai cần 3000 XP trong 24 giờ để nhận 10 shards và 1000 XP.', 'Kumpulkan masing-masing 3000 XP dalam 24 jam untuk mendapat 10 shard dan 1000 XP.', '24 saatte ikiniz de 3000 XP toplayın, 10 shard ve 1000 XP kazanın.', 'Zdobądźcie po 3000 XP w 24 godziny, aby dostać po 10 shardów i 1000 XP.')}
            </Text>
            <TouchableOpacity activeOpacity={0.86} onPress={onClose} style={{ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D7A83B' }}>
              <Text style={{ color: monoIcon(themeMode, '#241905', MONO_ICON.onLight), fontSize: f.sub, fontWeight: '900', textAlign: 'center' }}>
                {L('Вперёд', 'Уперед', 'Let’s go', 'Vamos', 'Bắt đầu', 'Mulai', 'Başla', 'Start')}
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(9, 8, 12, 0.72)' }}>
        <View style={{ width: '100%', maxWidth: 372, borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: 'rgba(156,115,45,0.32)' }}>
          <LinearGradient colors={['rgba(255,248,221,0.98)', 'rgba(52,199,89,0.24)']} style={{ padding: 22, gap: 14 }}>
            <View style={{ width: 66, height: 66, borderRadius: 22, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#19351F' }}>
              <Ionicons name="sparkles-outline" size={38} color={monoIcon(themeMode, '#B9F6C9')} />
            </View>
            <Text style={{ color: monoIcon(themeMode, '#21170B', MONO_ICON.onLight), fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
              {L('Миссия выполнена', 'Місію виконано', 'Quest complete', 'Missão concluída', 'Hoàn thành nhiệm vụ', 'Quest selesai', 'Görev tamamlandı', 'Misja wykonana')}
            </Text>
            <Text style={{ color: monoIcon(themeMode, '#4E3B1D', MONO_ICON.onLight), fontSize: f.sub, lineHeight: f.sub + 5, textAlign: 'center' }}>
              {L('Награда начислена вам обоим: 10 шардов и 1000 XP.', 'Нагороду нараховано вам обом: 10 шардів і 1000 XP.', 'Reward granted to both of you: 10 shards and 1000 XP.', 'Recompensa enviada para ambos: 10 shards e 1000 XP.', 'Cả hai đã nhận thưởng: 10 shards và 1000 XP.', 'Hadiah untuk kalian berdua: 10 shard dan 1000 XP.', 'Ödül ikinize de verildi: 10 shard ve 1000 XP.', 'Nagroda dla was obojga: 10 shardów i 1000 XP.')}
            </Text>
            <TouchableOpacity activeOpacity={0.86} onPress={onClose} style={{ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#34C759' }}>
              <Text style={{ color: monoIcon(themeMode, '#071E0C', MONO_ICON.onLight), fontSize: f.sub, fontWeight: '900', textAlign: 'center' }}>
                {L('Отлично', 'Чудово', 'Nice', 'Boa', 'Tuyệt', 'Mantap', 'Harika', 'Super')}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

type ActivityFeedSection = 'today' | 'yesterday' | 'earlier';

// «Кто поставил лайк» переехало в центр уведомлений на главной (NotificationCenterButton) —
// лента активности показывает только события друзей.
type ActivityFeedItem =
  | { kind: 'event'; ts: number; key: string; event: FriendEvent; lessonsCount?: number }
  | { kind: 'section'; ts: number; key: string; section: ActivityFeedSection };

/** Хвост ленты ограничен: старый шум не имеет ценности, важное всегда сверху. */
const ACTIVITY_FEED_MAX_ITEMS = 60;

function activityDayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function ActivityTab({
  friendUids, profiles, lang, t, f, chrome, themeMode, header, footer, scrollProps, onOpenProfile,
}: {
  friendUids: string[];
  profiles: Record<string, FriendProfile>;
  lang: string; t: any; f: any;
  chrome: FriendsChrome;
  themeMode: ThemeMode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scrollProps?: Record<string, unknown>;
  /** Тап по карточке события открывает профиль друга. */
  onOpenProfile?: (uid: string) => void;
}) {
  const [events, setEvents] = useState<FriendEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayLike, setTodayLike] = useState<FriendActivityLikeTodayState | null>(null);
  const likeInFlightRef = useRef<string | null>(null);
  const L = (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang as any, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const load = useCallback(async (force = false) => {
    if (friendUids.length === 0) {
      setEvents([]);
      setTodayLike(null);
      return;
    }
    if (force) setRefreshing(true); else setLoading(true);
    try {
      const [result, likeState] = await Promise.all([
        fetchFriendsActivityFeed(friendUids, force),
        fetchTodayActivityLikeState(),
      ]);
      setEvents(result);
      setTodayLike(likeState);
    } catch {
      // Сеть/бэкенд упали — оставляем прежнюю ленту, спиннер гасим в finally.
    } finally {
      if (force) setRefreshing(false); else setLoading(false);
    }
    // Check "liked by friend" achievement
    void (async () => {
      try {
        const myUid = await getCanonicalUserId();
        if (!myUid) return;
        const total = await fetchActivityLikeTotal(myUid);
        if (total > 0) {
          const { checkAchievements } = await import('../achievements');
          void checkAchievements({ type: 'achievement_liked', likeTotal: total });
        }
      } catch {}
    })();
  }, [friendUids]);

  const handleActivityLike = useCallback((event: FriendEvent) => {
    const sameLike = todayLike?.targetUid === event.uid && todayLike?.eventId === event.id;
    if (sameLike || todayLike || likeInFlightRef.current) return;
    hapticTap();
    const eventKey = `${event.uid}:${event.id}`;
    const optimisticCreatedAt = Date.now();
    likeInFlightRef.current = eventKey;
    setTodayLike({
      date: todayActivityLikeDateKeyUtc(),
      targetUid: event.uid,
      eventId: event.id,
      createdAt: optimisticCreatedAt,
    });
    setEvents(prev => bumpActivityLikeCount(prev, event.uid, event.id));

    void sendFriendActivityLike({ targetUid: event.uid, eventId: event.id }).then(res => {
      setTodayLike({
        date: res.date,
        targetUid: res.targetUid,
        eventId: res.eventId,
        createdAt: Date.now(),
      });
      setEvents(prev => setActivityLikeCount(prev, event.uid, event.id, res.activityLikeCount));
      void invalidateFriendsActivityCache();
    }).catch(async () => {
      const freshState = await fetchTodayActivityLikeState().catch(() => null);
      const freshMatchesEvent = freshState?.targetUid === event.uid && freshState?.eventId === event.id;
      setTodayLike(current => {
        if (freshState) return freshState;
        if (
          current?.targetUid === event.uid
          && current?.eventId === event.id
          && current?.createdAt === optimisticCreatedAt
        ) {
          return null;
        }
        return current;
      });
      if (!freshMatchesEvent) {
        setEvents(prev => rollbackActivityLikeCount(prev, event.uid, event.id));
      }
      void invalidateFriendsActivityCache();
    }).finally(() => {
      if (likeInFlightRef.current === eventKey) {
        likeInFlightRef.current = null;
      }
    });
  }, [todayLike]);

  // Без force кэш ленты (30 мин) долго показывает пустоту после событий у друзей.
  useEffect(() => { void load(false); }, [load]);

  // Merge friends' events and incoming likes into one time-sorted feed ("X liked you" rows
  // are interleaved with achievements/level-ups by timestamp, newest first).
  // Ценность вместо шума: arena_rank_down скрыт (негатив без действия), одинаковые
  // lesson_complete одного друга за день схлопнуты в одну карточку «N уроков за день»
  // (лайк вешается на самое свежее событие группы), лента размечена секциями по дням.
  const feedItems = useMemo<ActivityFeedItem[]>(() => {
    const merged: ActivityFeedItem[] = [];
    const lessonGroups = new Map<string, { event: FriendEvent; count: number }>();
    for (const event of events) {
      if (event.type === 'arena_rank_down') continue;
      if (event.type === 'lesson_complete') {
        const groupKey = `${event.uid}:${activityDayKey(event.ts)}`;
        const group = lessonGroups.get(groupKey);
        lessonGroups.set(groupKey, {
          event: group && group.event.ts >= event.ts ? group.event : event,
          count: (group?.count ?? 0) + 1,
        });
        continue;
      }
      merged.push({ kind: 'event', ts: event.ts, key: `event:${event.uid}:${event.id}`, event });
    }
    for (const group of lessonGroups.values()) {
      merged.push({
        kind: 'event',
        ts: group.event.ts,
        key: `event:${group.event.uid}:${group.event.id}`,
        event: group.event,
        lessonsCount: group.count,
      });
    }
    merged.sort((a, b) => b.ts - a.ts);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStartMs = todayStart.getTime() - 86400000;
    const withSections: ActivityFeedItem[] = [];
    let lastSection: ActivityFeedSection | null = null;
    for (const item of merged.slice(0, ACTIVITY_FEED_MAX_ITEMS)) {
      const section: ActivityFeedSection = item.ts >= todayStart.getTime()
        ? 'today'
        : item.ts >= yesterdayStartMs ? 'yesterday' : 'earlier';
      if (section !== lastSection) {
        withSections.push({ kind: 'section', ts: item.ts, key: `section:${section}`, section });
        lastSection = section;
      }
      withSections.push(item);
    }
    return withSections;
  }, [events]);

  // Сводка дня для карточки-дайджеста над лентой.
  const todayDigest = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todays = events.filter(e => e.ts >= todayStart.getTime() && e.type !== 'arena_rank_down');
    if (todays.length === 0) return null;
    const lessons = todays.filter(e => e.type === 'lesson_complete').length;
    const counts = new Map<string, number>();
    for (const e of todays) counts.set(e.uid, (counts.get(e.uid) ?? 0) + 1);
    let topUid = '';
    let topCount = 0;
    for (const [uid, count] of counts) {
      if (count > topCount) { topUid = uid; topCount = count; }
    }
    return { lessons, milestones: todays.length - lessons, topUid };
  }, [events]);

  // Пустые состояния уходят в ListEmptyComponent, чтобы FlashList оставался
  // единственным скроллером таба (шапка скроллится вместе с лентой).
  const emptyNoFriends = friendUids.length === 0;
  const emptyNoEvents = events.length === 0;

  const emptyState = emptyNoFriends ? (
    <View testID="friends-activity-empty-no-friends" style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
      <FriendsThemeIcon themeMode={themeMode} size={58} accessibilityLabel="Friends" />
      <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
        {L('Добавьте друзей, чтобы видеть их активность', 'Додайте друзів, щоб бачити їхню активність', 'Agrega amigos para ver su actividad', 'Adicione amigos para ver a atividade deles', 'Thêm bạn bè để xem hoạt động của họ', 'Tambahkan teman untuk melihat aktivitas mereka', 'Etkinliklerini görmek için arkadaş ekle', 'Dodaj znajomych, aby widzieć ich aktywność')}
      </Text>
    </View>
  ) : (
    <View testID="friends-activity-empty" style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
      <Ionicons name="pulse-outline" size={40} color={t.textMuted} />
      <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
        {L('Пока нет активности', 'Поки немає активності', 'Sin actividad aún', 'Ainda sem atividade', 'Chưa có hoạt động', 'Belum ada aktivitas', 'Henüz etkinlik yok', 'Brak aktywności')}
      </Text>
      <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center' }}>
        {L('Здесь появятся достижения и прогресс ваших друзей', 'Тут з\'являться досягнення та прогрес ваших друзів', 'Aquí aparecerán logros y progreso de tus amigos', 'Aqui aparecerão conquistas e progresso dos seus amigos', 'Thành tích và tiến độ của bạn bè sẽ xuất hiện ở đây', 'Pencapaian dan progres temanmu akan muncul di sini', 'Arkadaşlarının başarıları ve ilerlemesi burada görünecek', 'Tutaj pojawią się osiągnięcia i postępy znajomych')}
      </Text>
    </View>
  );

  const showFeed = !emptyNoFriends && !emptyNoEvents;

  const renderFeedItem = ({ item }: { item: ActivityFeedItem }) => {
        if (item.kind === 'section') {
          const label = item.section === 'today'
            ? L('Сегодня', 'Сьогодні', 'Hoy', 'Hoje', 'Hôm nay', 'Hari ini', 'Bugün', 'Dzisiaj')
            : item.section === 'yesterday'
            ? L('Вчера', 'Вчора', 'Ayer', 'Ontem', 'Hôm qua', 'Kemarin', 'Dün', 'Wczoraj')
            : L('Ранее', 'Раніше', 'Antes', 'Antes', 'Trước đó', 'Sebelumnya', 'Daha önce', 'Wcześniej');
          return (
            <Text
              testID={`friends-activity-section-${item.section}`}
              style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, marginBottom: 10 }}
            >
              {label}
            </Text>
          );
        }
        const event = item.event;
        const profile = profiles[event.uid];
        const name = profile?.name ?? L('Друг', 'Друг', 'Amigo', 'Amigo', 'Bạn bè', 'Teman', 'Arkadaş', 'Znajomy');
        const color = eventIconColor(event.type, t.accent);
        const likeColor = '#FF2D55';
        const likeCount = Math.max(0, Math.floor(Number(event.activityLikeCount ?? 0) || 0));
        const likedToday = todayLike?.targetUid === event.uid && todayLike?.eventId === event.id;
        // Вехи (уровень/серия/достижение/ранг) подсвечены цветом события — их видно в потоке.
        const isMilestone = event.type === 'level_up' || event.type === 'streak_milestone'
          || event.type === 'achievement' || event.type === 'arena_rank_up';
        const rowText = item.lessonsCount && item.lessonsCount > 1
          ? lessonsDayText(name, item.lessonsCount, lang)
          : eventText(event, name, lang);
        return (
          <View
            testID={`friends-activity-row-${event.uid}-${event.id}`}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              backgroundColor: glassFill(chrome.card, 0.46), borderRadius: 16, padding: 14, marginBottom: 10,
              borderTopWidth: 1, borderTopColor: isMilestone ? color + '55' : glassFill(t.accent, 0.14),
            }}
          >
            <TouchableOpacity
              testID={`friends-activity-open-profile-${event.uid}-${event.id}`}
              activeOpacity={0.75}
              disabled={!profile || !onOpenProfile}
              onPress={() => onOpenProfile?.(event.uid)}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang as any, { ru: `Открыть профиль ${name}`, uk: `Відкрити профіль ${name}`, es: `Abrir perfil de ${name}`, 'pt-BR': `Abrir perfil de ${name}`, vi: `Mở hồ sơ ${name}`, id: `Buka profil ${name}`, tr: `${name} profilini aç`, pl: `Otwórz profil ${name}` })}
              style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
            >
              {/* Аватар друга вместо безликой иконки; тип события — мини-бейджем. */}
              <View style={{ width: 38, height: 38, flexShrink: 0 }}>
                {profile ? (
                  <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={38} animateAura={false} />
                ) : (
                  <View style={{
                    width: 38, height: 38, borderRadius: 19,
                    backgroundColor: color + '22',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Ionicons name={eventIcon(event.type) as any} size={18} color={color} />
                  </View>
                )}
                {profile && (
                  <View style={{
                    position: 'absolute', right: -4, bottom: -4,
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: color,
                    borderWidth: 1.5, borderColor: chrome.card,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={eventIcon(event.type) as any} size={10} color="#0B140E" />
                  </View>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600', lineHeight: 20 }}>
                  {rowText}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
                  {formatEventTime(event.ts, lang)}
                </Text>
              </View>
            </TouchableOpacity>
            <TapScale
              testID={`friends-activity-like-${event.uid}-${event.id}`}
              onPress={() => { void handleActivityLike(event); }}
              accessibilityRole="button"
              accessibilityLabel={L('Лайк за активность', 'Лайк за активність', 'Like de actividad', 'Like de atividade', 'Thích hoạt động', 'Like aktivitas', 'Etkinlik beğenisi', 'Polubienie aktywności')}
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 14,
                paddingHorizontal: 7,
                paddingVertical: 5,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: likedToday ? 'rgba(255,45,85,0.16)' : chrome.button,
                borderWidth: 0.5,
                borderColor: likedToday ? 'rgba(255,45,85,0.55)' : chrome.border,
              }}
            >
              <Ionicons name={likedToday ? 'heart' : 'heart-outline'} size={19} color={likedToday ? likeColor : t.textMuted} />
              <Text style={{ color: likedToday ? likeColor : t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '900', marginTop: 1 }}>
                {likeCount}
              </Text>
            </TapScale>
          </View>
        );
  };

  // D3: лента виртуализирована — FlashList и есть скроллер таба (эталон: flashcards_collection.tsx).
  return (
    <AnimatedFlashList
      {...(scrollProps ?? {})}
      testID="friends-activity-list"
      data={showFeed ? feedItems : []}
      keyExtractor={(item: ActivityFeedItem) => item.key}
      getItemType={(item: ActivityFeedItem) => item.kind}
      renderItem={renderFeedItem}
      ListHeaderComponent={
        <>
          {header}
          {showFeed && (
            <TapScale
              testID="friends-activity-refresh"
              onPress={() => { void load(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: 12 }}
            >
              <Ionicons name="refresh-outline" size={16} color={t.textMuted} />
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {L('Обновить', 'Оновити', 'Actualizar', 'Atualizar', 'Làm mới', 'Perbarui', 'Yenile', 'Odśwież')}
              </Text>
            </TapScale>
          )}
          {showFeed && todayDigest && (
            <View
              testID="friends-activity-digest"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: glassFill(t.accent, 0.14), borderRadius: 16, padding: 14, marginBottom: 14,
                borderTopWidth: 1, borderTopColor: glassFill(t.accent, 0.14),
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: t.accent + '26',
                justifyContent: 'center', alignItems: 'center', flexShrink: 0,
              }}>
                <Ionicons name="flash" size={18} color={t.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                  {activityDigestText(todayDigest.lessons, todayDigest.milestones, lang)}
                </Text>
                {!!profiles[todayDigest.topUid]?.name && (
                  <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 2 }} numberOfLines={1}>
                    {triLang(lang as any, {
                      ru: `Самый активный — ${profiles[todayDigest.topUid].name} 👏`,
                      uk: `Найактивніший — ${profiles[todayDigest.topUid].name} 👏`,
                      es: `El más activo: ${profiles[todayDigest.topUid].name} 👏`,
                      'pt-BR': `O mais ativo: ${profiles[todayDigest.topUid].name} 👏`,
                      vi: `Năng nổ nhất — ${profiles[todayDigest.topUid].name} 👏`,
                      id: `Paling aktif — ${profiles[todayDigest.topUid].name} 👏`,
                      tr: `En aktif — ${profiles[todayDigest.topUid].name} 👏`,
                      pl: `Najaktywniejszy — ${profiles[todayDigest.topUid].name} 👏`,
                    })}
                  </Text>
                )}
              </View>
            </View>
          )}
        </>
      }
      ListEmptyComponent={emptyState}
      ListFooterComponent={<>{footer}</>}
    />
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
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang as any, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const searchReady = isFriendSearchReady(codeInput);
  const codeMode = isFriendCodeQuery(codeInput);
  // Юзер открыл модалку «добавить друга» именно чтобы ввести имя — открываем
  // клавиатуру сами. Задержка ждёт slide-анимацию pageSheet: без неё фокус на
  // iOS теряется и клавиатура не поднимается.
  const searchInputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => searchInputRef.current?.focus(), 320);
    return () => clearTimeout(id);
  }, [visible]);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={stableInitialWindowMetrics}>
        <ScreenGradient forceFullBleed artBackdrop="friends">
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'bottom', 'left']}>
          <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 }}>
            <Text style={{ flex: 1, fontSize: f.h2 ?? 22, fontWeight: '800', color: t.textPrimary }}>
              {L('Добавить друга', 'Додати друга', 'Agregar amigo', 'Adicionar amigo', 'Thêm bạn bè', 'Tambah teman', 'Arkadaş ekle', 'Dodaj znajomego')}
            </Text>
            <TapScale
              onPress={onClose}
              hitSlop={8}
              style={{
                width: 44, height: 44, borderRadius: 22,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: chrome.button,
                borderWidth: 0.5, borderColor: chrome.border,
              }}
            >
              <Ionicons name="close" size={24} color={t.textMuted} />
            </TapScale>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            decelerationRate="normal"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 14 }}
          >
            <View
              testID="friends-code-search-card"
              style={{
                paddingTop: 2,
                gap: 10,
              }}
            >
              <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {L('Введите имя друга', 'Введіть імʼя друга', 'Ingresa el nombre de tu amigo', 'Digite o nome do amigo', 'Nhập tên bạn bè', 'Masukkan nama teman', 'Arkadaşının adını gir', 'Wpisz imię znajomego')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  ref={searchInputRef}
                  testID="friends-code-input"
                  accessibilityLabel="Friend name input"
                  style={{
                    flex: 1, backgroundColor: chrome.surface, borderRadius: 14,
                    minHeight: 58,
                    paddingHorizontal: 16, paddingVertical: 12,
                    fontSize: 20, fontWeight: '900', color: t.textPrimary,
                    letterSpacing: codeMode ? 4 : 0, borderWidth: 0.5, borderColor: chrome.border,
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
                  accessibilityLabel={L('Найти друга по имени', 'Знайти друга за імʼям', 'Buscar amigo por nombre', 'Encontrar amigo por nome', 'Tìm bạn theo tên', 'Cari teman dengan nama', 'Adıyla arkadaş bul', 'Znajdź znajomego po imieniu')}
                  style={{
                    minWidth: 58,
                    minHeight: 58,
                    backgroundColor: searchReady ? t.accent : chrome.button,
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 0.5,
                    borderColor: searchReady ? t.accent : chrome.border,
                    opacity: isSearching ? 0.6 : 1,
                  }}
                >
                  <Ionicons name={isSearching ? 'hourglass-outline' : 'search'} size={22} color={searchReady ? t.correctText : t.textMuted} />
                </TapScale>
              </View>
            </View>

            {searchError && (
              <View testID="friends-search-error" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="alert-circle-outline" size={16} color={monoIcon(themeMode, '#FF6B6B')} />
                <Text style={{ color: monoIcon(themeMode, '#FF6B6B'), fontSize: f.sub }}>{searchError}</Text>
              </View>
            )}

            {foundUser && (
              <FoundUserCard
                profile={foundUser} onAdd={onAddFound} onClose={onCloseFoundUser}
                isAdding={isAdding} lang={lang} t={t} f={f} chrome={chrome}
                themeMode={themeMode}
              />
            )}

            {addFeedback && (
              <View testID="friends-add-feedback" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-circle-outline" size={16} color={t.correct} />
                <Text style={{ color: t.correct, fontSize: f.sub, fontWeight: '600' }}>{addFeedback}</Text>
              </View>
            )}
          </ScrollView>
          </View>
          </SafeAreaView>
        </ScreenGradient>
      </SafeAreaProvider>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FriendsTabScreen() {
  const tabContentBottomPad = useTabContentBottomPad();
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const { goHome, activeIdx, focusTick } = useTabNav();
  const friendsTabVisible = activeIdx === 3;
  const insets = useStableSafeAreaInsets();
  const topFadeScroll = useTopFadeScroll();
  // Маска шапки (TopFadeMask) слушает scrollY порогом showThreshold=6 — будим JS
  // только на пересечении порога, сам скролл идёт UI-потоком (onAnimatedScroll).
  const topFadeShown = useSharedValue(false);
  const topFadeOnScroll = topFadeScroll?.onScroll;
  const notifyTopFade = useCallback((y: number) => {
    topFadeOnScroll?.({ nativeEvent: { contentOffset: { y } } });
  }, [topFadeOnScroll]);
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onAnimatedScroll } = useBouncy({
    onScrollWorklet: (y: number) => {
      'worklet';
      const shown = y > 6;
      if (shown !== topFadeShown.value) {
        topFadeShown.value = shown;
        runOnJS(notifyTopFade)(y);
      }
    },
  });
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const chrome = useMemo(() => makeFriendsChrome(themeMode, t), [themeMode, t]);
  const sentGiftChrome = false
    ? {
        shellColors: ['rgba(21,24,18,0.98)', 'rgba(13,16,12,0.98)', 'rgba(2,3,4,0.98)'] as const,
        shellRadius: 8,
        innerRadius: 7,
        iconRadius: 8,
        shadowColor: '#F2C48D',
        innerBg: '#0D100C',
        innerBorder: 'rgba(242,196,141,0.24)',
        washColors: ['rgba(242,196,141,0.14)', 'rgba(255,255,255,0)', 'rgba(242,196,141,0.08)'] as const,
        haloBg: 'rgba(242,196,141,0.12)',
        iconColors: ['#FFF0D2', '#F2C48D', '#B4774E'] as const,
        labelColor: '#F2C48D',
        titleColor: '#FFF8E8',
        bodyColor: '#D9DEC9',
        mutedColor: '#8D9870',
        infoColor: '#F2C48D',
        buttonBg: '#F4B978',
        buttonText: '#151008',
      }
    : {
        shellColors: ['rgba(40,47,62,0.98)', 'rgba(28,31,42,0.98)', 'rgba(18,20,29,0.98)'] as const,
        shellRadius: 28,
        innerRadius: 27,
        iconRadius: 24,
        shadowColor: '#6EA8FF',
        innerBg: '#1D202B',
        innerBorder: 'rgba(129,174,255,0.24)',
        washColors: ['rgba(111,165,255,0.16)', 'rgba(255,255,255,0)', 'rgba(219,178,91,0.13)'] as const,
        haloBg: 'rgba(108,164,255,0.14)',
        iconColors: ['#9FC4FF', '#6EA8FF', '#D8AC4D'] as const,
        labelColor: '#9FC4FF',
        titleColor: '#F8FAFF',
        bodyColor: '#D8E5FF',
        mutedColor: '#9FB0CC',
        infoColor: '#9FC4FF',
        buttonBg: '#6EA8FF',
        buttonText: '#101724',
      };
  const L = useCallback((
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang as any, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl }), [lang]);

  /** Только код из `ensure…` — без старого кеша первым кадром (не мигать «чужим» кодом). */
  const [myCode, setMyCode] = useState<string | null>(null);
  const [friendCodeLoadError, setFriendCodeLoadError] = useState(false);
  const [myProfile, setMyProfile] = useState<{
    name: string; avatar: string; frame: string; aura?: string; totalXP: number; streak: number | null;
  } | null>(null);

  // ── Реферал: накопленные дни доступа + модалки активации/окончания ──────────
  const [referralInvites, setReferralInvites] = useState<ReferralInvite[]>([]);
  const [accessEndedOpen, setAccessEndedOpen] = useState(false);
  /** РЕФЕРАЛЬНЫЙ код (referral_codes) — отдельный от friend-кода (myCode). Для «Пригласить». */
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const referralEnabled = isReferralCloudEnabled();
  const referralRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const referralLastRefreshAtRef = useRef(0);

  const refreshReferralState = useCallback(async (options: { force?: boolean } = {}) => {
    if (!isReferralCloudEnabled()) return;
    const now = Date.now();
    if (!options.force && now - referralLastRefreshAtRef.current < FRIENDS_REFERRAL_REFRESH_TTL_MS) return;
    if (referralRefreshInFlightRef.current) return referralRefreshInFlightRef.current;
    referralLastRefreshAtRef.current = now;
    const task = (async () => {
    // Реферальный код (ensure на сервере). Без него «Пригласить» делилась бы friend-кодом,
    // которого нет в referral_codes → друг получал «код не найден» и наград не было (C1).
    try {
      // Кэш-код первым: серверный ensure только когда кода ещё нет, а не на каждый фокус таба.
      let rc = await getReferralCode();
      if (!rc || rc.trim().length < 4) {
        await generateReferralCode(myProfile?.name ?? 'User');
        rc = await getReferralCode();
      }
      if (rc && rc.trim().length >= 4) setReferralCode(rc.trim().toUpperCase());
    } catch { /* нет auth_links / сети — добьём ретраем ниже (useEffect) */ }
    const state = await getClaimableReferralState({ force: options.force });
    if (state.ok) {
      setReferralInvites(prev => referralInvitesKey(prev) === referralInvitesKey(state.invites) ? prev : state.invites);
    }

    // Модал окончания: трекер сам определяет «реферальность» окна (стикки-маркер переживает
    // зануление vip_plan при истечении). Гейт по текущему плану здесь НЕ нужен — это и был баг.
    try {
      const pairs = await AsyncStorage.multiGet(['vip_plan', 'vip_until']);
      const plan = pairs.find(p => p[0] === 'vip_plan')?.[1] ?? '';
      const until = Number(pairs.find(p => p[0] === 'vip_until')?.[1] ?? '0') || 0;
      const show = await shouldShowReferralAccessEnded(plan, until);
      if (show) setAccessEndedOpen(true);
    } catch { /* нет данных — пропускаем */ }
    })();
    referralRefreshInFlightRef.current = task.finally(() => {
      referralRefreshInFlightRef.current = null;
    });
    return referralRefreshInFlightRef.current;
  }, [myProfile?.name]);

  /** Закрыть модал окончания, пометив ровно то окно, для которого он показан (фикс BUG 2). */
  const dismissReferralAccessEnded = useCallback(async () => {
    const windowEnd = await getTrackedReferralWindowEnd();
    await markReferralAccessEndedSeen(windowEnd);
  }, []);

  /** Не пускать второй Share, пока первый ещё готовится/открыт (двойной тап = два шеринга). */
  const inviteShareBusyRef = useRef(false);
  const handleReferralInvite = useCallback(async () => {
    if (inviteShareBusyRef.current) return;
    inviteShareBusyRef.current = true;
    hapticTap();
    try {
      const name = myProfile?.name ?? '';
      const share = await buildCloudReferralInviteShare({ lang, userName: name }).catch(() => null);
      if (share?.message) {
        await Share.share({ message: share.message });
      }
    } finally {
      inviteShareBusyRef.current = false;
    }
  }, [lang, myProfile?.name]);

  const [codeInput, setCodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FriendProfile | null>(null);
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
  const [giftBalance, setGiftBalance] = useState(0);
  const [giftBusyId, setGiftBusyId] = useState<FriendGiftId | null>(null);
  const [sentGiftReceipt, setSentGiftReceipt] = useState<{
    targetName: string;
    giftName: string;
    costShards: number;
    balanceAfter: number;
    dailyRemaining?: number;
  } | null>(null);
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

  const syncMyInviteCode = useCallback(async () => {
    // Retry up to 5 times with 3s delay — Auth may not be ready immediately on cold launch.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = await ensureMyInviteCodeForFriends('');
      if (!mountedRef.current) return;
      if (code) {
        setMyCode(code);
        setFriendCodeLoadError(false);
        return;
      }
      if (attempt < 4) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (!mountedRef.current) return;
      }
    }
    setFriendCodeLoadError(true);
  }, []);

  const retryFriendCode = useCallback(() => {
    hapticTap();
    setFriendCodeLoadError(false);
    void syncMyInviteCode();
  }, [syncMyInviteCode]);

  // ── My code + my data ──────────────────────────────────────────────────────

  // Предзагрузка при премаунте (задумано): данные готовы ДО того как юзер откроет таб.
  useEffect(() => {
    mountedRef.current = true;
    void readCachedMyInviteCodeForFriends().then(cached => {
      if (mountedRef.current && cached) setMyCode(prev => prev ?? cached);
    });
    void syncMyInviteCode();
    const task = InteractionManager.runAfterInteractions(() => {
      void fetchMyProfile().then(p => { if (mountedRef.current && p) setMyProfile(p); });
      // После prime диск прочитан, modCache обновлён — синхронизируем ref и state.
      void startFriendsTabSwrPrime().then(() => {
        if (!mountedRef.current) return;
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
    return () => { mountedRef.current = false; task.cancel(); };
  }, [syncMyInviteCode]);

  const pollIncomingFriendGifts = useCallback(async (cancelled: { current: boolean }) => {
    try {
      const gifts = await claimUnseenFriendGifts();
      if (cancelled.current) return;
      if (gifts.length === 0) return;
      const first = gifts[0];
      const from = first.fromName || L('друг', 'друг', 'amigo', 'amigo', 'bạn bè', 'teman', 'arkadaş', 'znajomy');
      const gift = giftEventLabel(first as unknown as Record<string, string | number>, lang);
      setIncomingGiftModal({ gifts });
      showFeedback(
        gifts.length === 1
          ? L(`${from} подарил: ${gift}`, `${from} подарував: ${gift}`, `${from} te regaló: ${gift}`, `${from} deu um presente: ${gift}`, `${from} đã tặng: ${gift}`, `${from} memberi hadiah: ${gift}`, `${from} hediye verdi: ${gift}`, `${from} podarował: ${gift}`)
          : L(`Новые подарки от друзей: ${gifts.length}`, `Нові подарунки від друзів: ${gifts.length}`, `Regalos nuevos de amigos: ${gifts.length}`, `Novos presentes de amigos: ${gifts.length}`, `Quà mới từ bạn bè: ${gifts.length}`, `Hadiah baru dari teman: ${gifts.length}`, `Arkadaşlardan yeni hediyeler: ${gifts.length}`, `Nowe prezenty od znajomych: ${gifts.length}`),
      );
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: gifts.length === 1 ? `${from} подарил: ${gift}` : `Новые подарки от друзей: ${gifts.length}`,
        messageUk: gifts.length === 1 ? `${from} подарував: ${gift}` : `Нові подарунки від друзів: ${gifts.length}`,
        messageEs: gifts.length === 1 ? `${from} te regaló: ${gift}` : `Regalos nuevos de amigos: ${gifts.length}`,
      });
      void invalidateFriendsActivityCache();
      setActiveTab('activity');
    } catch {
      /* ignore */
    }
  }, [L, lang]);

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
    if (!friendsTabVisible) return;
    const cancelled = { current: false };
    void ensureFriendRequestViewerAuthLink();
    void startFriendsTabSwrPrime();
    void pollIncomingFriendGifts(cancelled);
    void refreshFriendQuest(cancelled);
    void refreshReferralState();
    return () => { cancelled.current = true; };
  }, [friendsTabVisible, focusTick, pollIncomingFriendGifts, refreshFriendQuest, refreshReferralState]);

  // Реф-код один раз создаётся и НАВСЕГДА закрепляется за аккаунтом в AsyncStorage
  // (REFERRAL_KEY) — поэтому при каждом монтировании/возврате на вкладку читаем его
  // СИНХРОННО из кеша и сразу вшиваем в текст. Без этого код стартовал с null и «моргал»:
  // пропадал при переключении вкладок и всплывал лишь через ~1.5 с после ответа сервера.
  useEffect(() => {
    if (!referralEnabled) return;
    let cancelled = false;
    void getReferralCode().then(rc => {
      if (!cancelled && rc && rc.trim().length >= 4) {
        setReferralCode(prev => prev ?? rc.trim().toUpperCase());
      }
    }).catch(() => { /* нет кеша — сетевой ретрай ниже добьёт первую генерацию */ });
    return () => { cancelled = true; };
  }, [referralEnabled]);

  // Реф-код на свежей установке часто пуст: ensure-CF падает, пока auth_links не готовы
  // (та же холодная гонка, что и при резервации имени) — и в тексте «введёт ваш код __»
  // зияет пустота. refreshReferralState бьёт лишь раз на фокус, поэтому добиваем код
  // ограниченным ретраем с бэкоффом, пока он не появится (auth готовится за пару секунд).
  useEffect(() => {
    if (!referralEnabled || referralCode) return;
    let cancelled = false;
    let attempt = 0;
    const tick = async () => {
      if (cancelled) return;
      attempt += 1;
      try {
        await generateReferralCode(myProfile?.name ?? 'User');
        const rc = await getReferralCode();
        if (!cancelled && rc && rc.trim().length >= 4) {
          setReferralCode(rc.trim().toUpperCase());
          return;
        }
      } catch { /* ещё не готово — повторим */ }
      if (!cancelled && attempt < 5) {
        timer = setTimeout(() => { void tick(); }, 1500 * attempt);
      }
    };
    let timer = setTimeout(() => { void tick(); }, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [referralEnabled, referralCode, myProfile?.name]);

  // ── Кеш с устройства → подписки: сначала SWR, затем live; пустой кеш Firestore не затирает SWR.
  // ──

  useEffect(() => {
    if (!friendsTabVisible) return;
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

      const uid = await ensureAnonUser();
      if (!uid || cancelled) return;

      await ensureFriendRequestViewerAuthLink();
      if (cancelled) return;

      unsubFriends = subscribeToFriends((data, meta) => {
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
  }, [friendsTabVisible]);

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
    if (!friendsTabVisible || uids.length === 0) return;
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
    })();
    return () => { cancelled = true; };
  }, [friends, requests, friendsTabVisible, focusTick]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!result) {
        await trackActivity('friends:search_result', {
          feature: 'friends',
          screen: 'friends',
          result: 'blocked',
          tags: { reason: 'not_found', queryLength: query.length, queryType: isCode ? 'code' : 'nickname' },
        });
        setSearchError(L('Пользователь с таким кодом или ником не найден', 'Користувача з таким кодом або ніком не знайдено', 'No se encontró usuario con ese código o nick', 'Nenhum usuário encontrado com esse código ou nick', 'Không tìm thấy người dùng với mã hoặc tên này', 'Pengguna dengan kode atau nama ini tidak ditemukan', 'Bu kod veya adla kullanıcı bulunamadı', 'Nie znaleziono użytkownika z tym kodem lub nickiem'));
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
      // Объединяем с leaderboard/arena: серверный имеет приоритет (mergePublicFriendProfiles
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
      setSearchError(L('Ошибка. Попробуй ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo', 'Erro. Tente novamente', 'Lỗi. Hãy thử lại', 'Error. Coba lagi', 'Hata. Tekrar dene', 'Błąd. Spróbuj ponownie'));
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
    showFeedback(L('Заявка отправлена!', 'Заявку надіслано!', '¡Solicitud enviada!', 'Solicitação enviada!', 'Đã gửi lời mời!', 'Permintaan terkirim!', 'İstek gönderildi!', 'Zaproszenie wysłane!'));
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
      if (result === 'sent') {
        setFoundUser(null);
        setCodeInput('');
        void invalidateFriendsActivityCache();
        showFeedback(L('Заявка отправлена!', 'Заявку надіслано!', '¡Solicitud enviada!', 'Solicitação enviada!', 'Đã gửi lời mời!', 'Permintaan terkirim!', 'İstek gönderildi!', 'Zaproszenie wysłane!'));
      } else if (result === 'already_friends') {
        setFoundUser(null);
        showFeedback(L('Вы уже друзья', 'Ви вже друзі', 'Ya son amigos', 'Vocês já são amigos', 'Hai bạn đã là bạn bè', 'Kalian sudah berteman', 'Zaten arkadaşsınız', 'Już jesteście znajomymi'));
      } else if (result === 'already_sent') {
        setFoundUser(null);
        showFeedback(L('Заявка уже отправлена', 'Заявку вже надіслано', 'Solicitud ya enviada', 'Solicitação já enviada', 'Lời mời đã được gửi', 'Permintaan sudah dikirim', 'İstek zaten gönderildi', 'Zaproszenie już wysłane'));
      } else if (result === 'self') {
        setFoundUser(null);
        showFeedback(randomSelfFriendCodeMessage(L));
      } else {
        setFoundUser(targetUser);
        setCodeInput(previousCodeInput);
        showFeedback(L('Ошибка. Попробуй ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo', 'Erro. Tente novamente', 'Lỗi. Hãy thử lại', 'Error. Coba lagi', 'Hata. Tekrar dene', 'Błąd. Spróbuj ponownie'));
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
      showFeedback(L('Ошибка. Попробуй ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo', 'Erro. Tente novamente', 'Lỗi. Hãy thử lại', 'Error. Coba lagi', 'Hata. Tekrar dene', 'Błąd. Spróbuj ponownie'));
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
    }
    acceptFriendRequest(request.fromUid)
      .then(() => {
        void invalidateFriendsActivityCache();
      })
      .catch(() => {
        setRequests(prev => prev.some(item => item.fromUid === request.fromUid) ? prev : [request, ...prev]);
        if (!hadFriend) {
          setFriends(prev => prev.filter(friend => friend.uid !== request.fromUid));
        }
        showFeedback(L('Ошибка при принятии. Попробуй ещё раз', 'Помилка. Спробуйте ще раз', 'Error al aceptar', 'Erro ao aceitar', 'Lỗi khi chấp nhận', 'Gagal menerima', 'Kabul ederken hata', 'Błąd przy akceptacji'));
      });
  }, [L, friends, showFeedback]);

  const handleDeclineRequest = useCallback((request: FriendRequestEntry) => {
    hapticTap();
    setRequests(prev => prev.filter(item => item.fromUid !== request.fromUid));
    declineFriendRequest(request.fromUid)
      .then(() => {
        void invalidateFriendsActivityCache();
      })
      .catch(() => {
        setRequests(prev => prev.some(item => item.fromUid === request.fromUid) ? prev : [request, ...prev]);
        showFeedback(L('Ошибка. Попробуй ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo', 'Erro. Tente novamente', 'Lỗi. Hãy thử lại', 'Error. Coba lagi', 'Hata. Tekrar dene', 'Błąd. Spróbuj ponownie'));
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
    setGiftTarget(profile);
    void getShardsBalance().then(setGiftBalance).catch(() => setGiftBalance(0));
  }, []);

  const giftLabel = (gift: (typeof FRIEND_GIFT_CATALOG)[number]) =>
    triLang(lang, {
      ru: gift.labelRu,
      uk: gift.labelUk,
      es: gift.labelEs,
      'pt-BR': gift.labelPtBr,
      vi: gift.labelVi,
      id: gift.labelId,
      tr: gift.labelTr,
      pl: gift.labelPl,
    });

  const giftDescription = (gift: (typeof FRIEND_GIFT_CATALOG)[number]) =>
    triLang(lang, {
      ru: gift.descRu,
      uk: gift.descUk,
      es: gift.descEs,
      'pt-BR': gift.descPtBr,
      vi: gift.descVi,
      id: gift.descId,
      tr: gift.descTr,
      pl: gift.descPl,
    });

  const emitFriendGiftErrorToast = (message: string) => {
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: message,
      messageUk: message,
      messageEs: message,
      messagePtBr: message,
      messageVi: message,
      messageId: message,
      messageTr: message,
      messagePl: message,
    });
  };

  const handleSendGift = async (giftId: FriendGiftId, explicitTarget: FriendProfile | null = giftTarget, balanceOverride = giftBalance) => {
    if (!explicitTarget || giftBusyId) return;
    const gift = FRIEND_GIFT_CATALOG.find(x => x.id === giftId);
    if (!gift) return;
    if (!isFriendGiftsCloudEnabled()) {
      showFeedback(L('Подарки доступны только с облачной синхронизацией', 'Подарунки доступні лише з хмарною синхронізацією', 'Los regalos requieren sincronizacion en la nube', 'Os presentes exigem sincronização na nuvem', 'Quà tặng cần đồng bộ đám mây', 'Hadiah memerlukan sinkronisasi cloud', 'Hediyeler için bulut senkronizasyonu gerekir', 'Prezenty wymagają synchronizacji w chmurze'));
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Подарки доступны только с облачной синхронизацией',
        messageUk: 'Подарунки доступні лише з хмарною синхронізацією',
        messageEs: 'Los regalos requieren sincronizacion en la nube',
        messagePtBr: 'Os presentes exigem sincronização na nuvem',
        messageVi: 'Quà tặng cần đồng bộ đám mây',
        messageId: 'Hadiah memerlukan sinkronisasi cloud',
        messageTr: 'Hediyeler için bulut senkronizasyonu gerekir',
        messagePl: 'Prezenty wymagają synchronizacji w chmurze',
      });
      return;
    }
    if (balanceOverride < gift.costShards) {
      showFeedback(L('Не хватает осколков', 'Не вистачає осколків', 'No tienes suficientes fragmentos', 'Fragmentos insuficientes', 'Không đủ mảnh', 'Pecahan tidak cukup', 'Parça yetersiz', 'Za mało odłamków'));
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Не хватает осколков',
        messageUk: 'Не вистачає осколків',
        messageEs: 'No tienes suficientes fragmentos',
        messagePtBr: 'Fragmentos insuficientes',
        messageVi: 'Không đủ mảnh',
        messageId: 'Pecahan tidak cukup',
        messageTr: 'Parça yetersiz',
        messagePl: 'Za mało odłamków',
      });
      return;
    }
    hapticTap();
    setGiftBusyId(giftId);
    const target = explicitTarget;
    const sentGiftName = giftLabel(gift);
    showFeedback(L('Отправляем подарок...', 'Надсилаємо подарунок...', 'Enviando regalo...', 'Enviando presente...', 'Đang gửi quà...', 'Mengirim hadiah...', 'Hediye gönderiliyor...', 'Wysyłanie prezentu...'));
    emitAppEvent('action_toast', {
      type: 'info',
      messageRu: `Отправляем подарок: ${sentGiftName}`,
      messageUk: `Надсилаємо подарунок: ${sentGiftName}`,
      messageEs: `Enviando regalo: ${sentGiftName}`,
      messagePtBr: `Enviando presente: ${sentGiftName}`,
      messageVi: `Đang gửi quà: ${sentGiftName}`,
      messageId: `Mengirim hadiah: ${sentGiftName}`,
      messageTr: `Hediye gönderiliyor: ${sentGiftName}`,
      messagePl: `Wysyłanie prezentu: ${sentGiftName}`,
    });
    try {
      const res = await sendFriendGiftWithShards({
        friendStableId: target.uid,
        giftId,
        senderDisplayName: myProfile?.name ?? '',
      });
      const guardedBalance = await getShardsBalance().catch(() => res.senderBalanceAfter);
      setGiftBalance(guardedBalance);
      setGiftTarget(null);
      setSentGiftReceipt({
        targetName: target.name,
        giftName: sentGiftName,
        costShards: gift.costShards,
        balanceAfter: guardedBalance,
        dailyRemaining: res.dailyRemaining,
      });
      if (res.questStarted && res.quest) {
        const quest = res.quest as FriendQuest;
        setActiveFriendQuest(quest);
        setFriendQuestStarted(quest);
      } else {
        void refreshFriendQuest(undefined, { force: true });
      }
      showFeedback(L('Подарок отправлен', 'Подарунок надіслано', 'Regalo enviado', 'Presente enviado', 'Đã gửi quà', 'Hadiah terkirim', 'Hediye gönderildi', 'Prezent wysłany'));
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: `Подарок отправлен: ${sentGiftName}`,
        messageUk: `Подарунок надіслано: ${sentGiftName}`,
        messageEs: `Regalo enviado: ${sentGiftName}`,
        messagePtBr: `Presente enviado: ${sentGiftName}`,
        messageVi: `Đã gửi quà: ${sentGiftName}`,
        messageId: `Hadiah terkirim: ${sentGiftName}`,
        messageTr: `Hediye gönderildi: ${sentGiftName}`,
        messagePl: `Prezent wysłany: ${sentGiftName}`,
      });
      await trackActivity('friends:send_gift', {
        feature: 'friends',
        screen: 'friends',
        result: 'success',
        tags: { giftId, targetUid: target.uid, cost: gift.costShards },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const kind = classifyFriendGiftError(e);
      if (kind !== 'unknown') {
        const feedback =
          kind === 'limit'
            ? L('Лимит подарков на сегодня уже исчерпан', 'Ліміт подарунків на сьогодні вже вичерпано', 'Ya alcanzaste el limite de regalos de hoy', 'Você atingiu o limite de presentes de hoje', 'Bạn đã hết lượt tặng quà hôm nay', 'Batas hadiah hari ini sudah tercapai', 'Bugünkü hediye sınırına ulaştın', 'Dzisiejszy limit prezentów został już wykorzystany')
            : kind === 'not_enough_shards'
            ? L('Не хватает осколков', 'Не вистачає осколків', 'No tienes suficientes fragmentos', 'Fragmentos insuficientes', 'Không đủ mảnh', 'Pecahan tidak cukup', 'Parça yetersiz', 'Za mało odłamków')
            : kind === 'not_friends' || kind === 'user_missing'
            ? L('Дружба уже не активна. Обнови список друзей.', 'Дружба вже не активна. Онови список друзів.', 'La amistad ya no esta activa. Actualiza la lista.', 'A amizade não está mais ativa. Atualize a lista.', 'Tình bạn không còn hoạt động. Hãy làm mới danh sách.', 'Pertemanan sudah tidak aktif. Segarkan daftar.', 'Arkadaşlık artık aktif değil. Listeyi yenile.', 'Znajomość nie jest już aktywna. Odśwież listę.')
            : kind === 'auth' || kind === 'identity_changed'
            ? L('Аккаунт ещё связывается с облаком. Подожди пару секунд и попробуй снова.', 'Акаунт ще зв’язується з хмарою. Зачекай кілька секунд і спробуй знову.', 'La cuenta aun se esta vinculando. Espera unos segundos e intentalo de nuevo.', 'A conta ainda esta vinculando. Espere alguns segundos e tente de novo.', 'Tài khoản đang liên kết đám mây. Chờ vài giây rồi thử lại.', 'Akun masih ditautkan ke cloud. Tunggu sebentar lalu coba lagi.', 'Hesap buluta bağlanıyor. Birkaç saniye bekleyip tekrar dene.', 'Konto nadal łączy się z chmurą. Poczekaj chwilę i spróbuj ponownie.')
            : kind === 'network'
            ? L('Сеть не ответила. Подарок не списан, попробуй ещё раз.', 'Мережа не відповіла. Подарунок не списано, спробуй ще раз.', 'La red no respondio. No se cobro el regalo; intentalo de nuevo.', 'A rede não respondeu. O presente não foi cobrado; tente de novo.', 'Mạng chưa phản hồi. Quà chưa bị trừ, hãy thử lại.', 'Jaringan tidak merespons. Hadiah belum ditagih; coba lagi.', 'Ağ yanıt vermedi. Hediye ücretlendirilmedi, tekrar dene.', 'Sieć nie odpowiedziała. Prezent nie został pobrany, spróbuj ponownie.')
            : L('Подарок не дошёл. Повтори попытку.', 'Не вдалося надіслати подарунок', 'No se pudo enviar el regalo', 'Não foi possível enviar o presente', 'Không gửi được quà', 'Hadiah tidak dapat dikirim', 'Hediye gönderilemedi', 'Nie udało się wysłać prezentu');
        showFeedback(feedback);
        emitFriendGiftErrorToast(feedback);
        await trackActivity('friends:send_gift', {
          feature: 'friends',
          screen: 'friends',
          result: 'error',
          tags: { giftId, targetUid: target.uid, error: msg, kind },
        });
        return;
      }
      if (msg.includes('resource-exhausted') || msg.includes('limit')) {
        showFeedback(L('Лимит подарков на сегодня уже исчерпан', 'Ліміт подарунків на сьогодні вже вичерпано', 'Ya alcanzaste el limite de regalos de hoy', 'Você atingiu o limite de presentes de hoje', 'Bạn đã hết lượt tặng quà hôm nay', 'Batas hadiah hari ini sudah tercapai', 'Bugünkü hediye sınırına ulaştın', 'Dzisiejszy limit prezentów został już wykorzystany'));
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Лимит подарков на сегодня уже исчерпан',
          messageUk: 'Ліміт подарунків на сьогодні вже вичерпано',
          messageEs: 'Ya alcanzaste el limite de regalos de hoy',
          messagePtBr: 'Você atingiu o limite de presentes de hoje',
          messageVi: 'Bạn đã hết lượt tặng quà hôm nay',
          messageId: 'Batas hadiah hari ini sudah tercapai',
          messageTr: 'Bugünkü hediye sınırına ulaştın',
          messagePl: 'Dzisiejszy limit prezentów został już wykorzystany',
        });
        await trackActivity('friends:send_gift', {
          feature: 'friends',
          screen: 'friends',
          result: 'error',
          tags: { giftId, targetUid: target.uid, error: msg },
        });
        return;
      }
      showFeedback(
        msg.includes('precondition') || msg.includes('Not enough')
          ? L('Не хватает осколков или дружба уже не активна', 'Не вистачає осколків або дружба вже не активна', 'Faltan fragmentos o la amistad ya no esta activa', 'Fragmentos insuficientes ou amizade não está mais ativa', 'Không đủ mảnh hoặc tình bạn không còn hoạt động', 'Pecahan tidak cukup atau pertemanan sudah tidak aktif', 'Parça yetersiz veya arkadaşlık artık aktif değil', 'Za mało odłamków albo znajomość nie jest już aktywna')
          : L('Подарок не дошёл. Повтори попытку.', 'Не вдалося надіслати подарунок', 'No se pudo enviar el regalo', 'Não foi possível enviar o presente', 'Không gửi được quà', 'Hadiah tidak dapat dikirim', 'Hediye gönderilemedi', 'Nie udało się wysłać prezentu'),
      );
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Подарок не отправлен. Попробуй ещё раз.',
        messageUk: 'Подарунок не надіслано. Спробуй ще раз.',
        messageEs: 'No se pudo enviar el regalo. Inténtalo de nuevo.',
        messagePtBr: 'Não foi possível enviar o presente. Tente novamente.',
        messageVi: 'Không gửi được quà. Hãy thử lại.',
        messageId: 'Hadiah tidak dapat dikirim. Coba lagi.',
        messageTr: 'Hediye gönderilemedi. Tekrar dene.',
        messagePl: 'Nie udało się wysłać prezentu. Spróbuj ponownie.',
      });
      await trackActivity('friends:send_gift', {
        feature: 'friends',
        screen: 'friends',
        result: 'error',
        tags: { giftId, targetUid: target.uid, error: msg },
      });
    } finally {
      setGiftBusyId(null);
    }
  };

  const requestSendGift = (giftId: FriendGiftId) => {
    if (!giftTarget || giftBusyId) return;
    const gift = FRIEND_GIFT_CATALOG.find(x => x.id === giftId);
    if (!gift) return;
    if (giftBalance < gift.costShards) {
      const missing = gift.costShards - giftBalance;
      setGiftTarget(null);
      showFeedback(L('Не хватает осколков', 'Не вистачає осколків', 'No tienes suficientes fragmentos', 'Fragmentos insuficientes', 'Không đủ mảnh', 'Pecahan tidak cukup', 'Parça yetersiz', 'Za mało odłamków'));
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: `Нужно ещё осколков: ${missing}`,
        messageUk: `Потрібно ще осколків: ${missing}`,
        messageEs: `Necesitas más fragmentos: ${missing}`,
        messagePtBr: `Você precisa de mais fragmentos: ${missing}`,
        messageVi: `Cần thêm mảnh: ${missing}`,
        messageId: `Butuh pecahan lagi: ${missing}`,
        messageTr: `Daha fazla parça gerekiyor: ${missing}`,
        messagePl: `Potrzeba więcej odłamków: ${missing}`,
      });
      router.push({ pathname: '/shards_shop', params: { need: String(missing), source: 'friend_gift' } } as any);
      return;
    }
    const target = giftTarget;
    void handleSendGift(giftId, target, giftBalance);
  };

  const incomingReplyTarget = useCallback((gift: IncomingFriendGift): FriendProfile => {
    const cached = profiles[gift.fromUid];
    return cached ?? {
      uid: gift.fromUid,
      name: gift.fromName || L('друг', 'друг', 'amigo', 'amigo', 'bạn bè', 'teman', 'arkadaş', 'znajomy'),
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
    setIncomingGiftModal(null);
    showFeedback(L('Спасибо отправлено', 'Подяку надіслано', 'Thanks sent', 'Agradecimento enviado', 'Đã gửi lời cảm ơn', 'Ucapan terima kasih terkirim', 'Teşekkür gönderildi', 'Podziękowanie wysłane'));
    try {
      await sendFriendGiftThanks({
        friendStableId: first.fromUid,
        giftId: first.giftId as FriendGiftId,
        senderDisplayName: myProfile?.name ?? '',
      });
      setIncomingGiftModal(null);
      showFeedback(L('Спасибо отправлено', 'Подяку надіслано', 'Thanks sent', 'Agradecimento enviado', 'Đã gửi lời cảm ơn', 'Ucapan terima kasih terkirim', 'Teşekkür gönderildi', 'Podziękowanie wysłane'));
      void invalidateFriendsActivityCache();
    } catch {
      setIncomingGiftModal(previousModal);
      showFeedback(L('Не удалось отправить спасибо', 'Не вдалося надіслати подяку', 'Could not send thanks', 'Não foi possível agradecer', 'Không gửi được lời cảm ơn', 'Gagal mengirim terima kasih', 'Teşekkür gönderilemedi', 'Nie udało się podziękować'));
    } finally {
      setGiftBusyId(null);
    }
  }, [L, giftBusyId, incomingGiftModal, myProfile?.name, showFeedback]);

  const handleIncomingGiftReply = useCallback(async (giftId: FriendGiftId) => {
    const first = incomingGiftModal?.gifts[0];
    if (!first || giftBusyId) return;
    const target = incomingReplyTarget(first);
    const gift = FRIEND_GIFT_CATALOG.find(x => x.id === giftId);
    if (!gift) return;
    const balance = await getShardsBalance().catch(() => 0);
    if (balance < gift.costShards) {
      setIncomingGiftModal(null);
      router.push({ pathname: '/shards_shop', params: { need: String(gift.costShards - balance), source: 'friend_gift_reply' } } as any);
      return;
    }
    setIncomingGiftModal(null);
    await handleSendGift(giftId, target, balance);
  }, [giftBusyId, handleSendGift, incomingGiftModal, incomingReplyTarget, router]);

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
        showFeedback(L('Квест ещё не выполнен', 'Квест ще не виконано', 'Quest is not finished yet', 'A missão ainda não terminou', 'Nhiệm vụ chưa xong', 'Quest belum selesai', 'Görev henüz bitmedi', 'Misja nie jest jeszcze gotowa'));
      }
    } catch {
      showFeedback(L('Не удалось забрать награду', 'Не вдалося забрати нагороду', 'Could not claim reward', 'Não foi possível receber a recompensa', 'Không nhận được thưởng', 'Gagal mengambil hadiah', 'Ödül alınamadı', 'Nie udało się odebrać nagrody'));
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
  const [activeTab, setActiveTab] = useState<'friends' | 'activity'>('friends');

  // Обновляем гард на каждый рендер: любая открытая модалка блокирует открытие следующей.
  modalWedgeGuardRef.current = selectedPlayer !== null || deleteTarget !== null
    || giftTarget !== null || incomingGiftModal !== null
    || friendQuestCompleted !== null || addModalOpen;

  // ── Derived ────────────────────────────────────────────────────────────────

  const sortedFriends = useMemo(
    () =>
      [...friends]
        .map(fr => profileWithLookupDisplayName(fr.uid, profiles[fr.uid] ?? null, fr.displayName) ?? placeholderFriendProfile(fr.uid, fr.displayName))
        .sort((a, b) => b.totalXp - a.totalXp),
    [friends, profiles],
  );

  const friendUids = useMemo(() => friends.map(f => f.uid), [friends]);

  /** uid друга → статус его реферал-приглашения (для метки в строке). */
  const referralStatusByUid = useMemo(() => {
    const map = new Map<string, 'pending' | 'qualified' | 'rewarded'>();
    for (const inv of referralInvites) {
      if (inv.status === 'pending' || inv.status === 'qualified' || inv.status === 'rewarded') {
        map.set(inv.refereeStableId, inv.status);
      } else if (inv.status === 'skipped_referrer_cap') {
        // legacy «лимит месяца» снова claimable (M1) — показываем как qualified.
        map.set(inv.refereeStableId, 'qualified');
      }
    }
    return map;
  }, [referralInvites]);

  /** Сводка по статусам приглашений — для бейджа на кнопке хедера и модалки. */
  const referralSummary = useMemo(() => summarizeInvites(referralInvites), [referralInvites]);

  const friendQuestPeerUid = useMemo(() => {
    if (!activeFriendQuest) return '';
    return activeFriendQuest.participantUids.find(uid => !!profiles[uid] || friends.some(friend => friend.uid === uid)) ?? activeFriendQuest.participantUids[1] ?? '';
  }, [activeFriendQuest, friends, profiles]);
  const friendQuestMyUid = useMemo(() => {
    if (!activeFriendQuest) return '';
    return activeFriendQuest.participantUids.find(uid => uid !== friendQuestPeerUid) ?? activeFriendQuest.participantUids[0] ?? '';
  }, [activeFriendQuest, friendQuestPeerUid]);
  const friendQuestPeerName = profiles[friendQuestPeerUid]?.name || L('друг', 'друг', 'amigo', 'amigo', 'bạn bè', 'teman', 'arkadaş', 'znajomy');
  const friendQuestMyProgress = activeFriendQuest ? Math.min(activeFriendQuest.targetXp, activeFriendQuest.progressByUid[friendQuestMyUid] ?? 0) : 0;
  const friendQuestPeerProgress = activeFriendQuest ? Math.min(activeFriendQuest.targetXp, activeFriendQuest.progressByUid[friendQuestPeerUid] ?? 0) : 0;
  const friendQuestMyRemaining = activeFriendQuest ? Math.max(0, activeFriendQuest.remainingXpByUid[friendQuestMyUid] ?? activeFriendQuest.targetXp) : 0;
  const friendQuestPeerRemaining = activeFriendQuest ? Math.max(0, activeFriendQuest.remainingXpByUid[friendQuestPeerUid] ?? activeFriendQuest.targetXp) : 0;
  const friendQuestReady = !!activeFriendQuest && friendQuestMyRemaining === 0 && friendQuestPeerRemaining === 0;
  const friendQuestMsLeft = activeFriendQuest ? Math.max(0, activeFriendQuest.expiresAtMs - Date.now()) : 0;
  const friendQuestHoursLeft = Math.max(0, Math.ceil(friendQuestMsLeft / 3600000));

  const PX = 16;

  // ── Render ─────────────────────────────────────────────────────────────────

  // D3: вместо общего ScrollView каждый таб — собственный FlashList (виртуализация,
  // эталон flashcards_collection.tsx); шапка и переключатель табов уезжают в
  // ListHeaderComponent и скроллятся вместе со списком, как раньше.
  const listScrollProps = {
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled' as const,
    contentContainerStyle: { paddingBottom: tabContentBottomPad, paddingHorizontal: PX, paddingTop: insets.top },
    decelerationRate: 'normal' as const,
    scrollEventThrottle: 16,
    bounces: true,
    alwaysBounceVertical: true,
    overScrollMode: 'always' as const,
    onScroll: onAnimatedScroll,
  };

  const listHeader = (
    <>
        {/* Хедер */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 8, marginHorizontal: -PX, paddingHorizontal: PX }}>
          <TapScale
            accessibilityRole="button"
            accessibilityLabel={L('На главную', 'На головну', 'Inicio', 'Início', 'Trang chủ', 'Beranda', 'Ana sayfa', 'Strona główna')}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: chrome.button, borderWidth: 0.5, borderColor: chrome.border,
              justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0,
            }}
            onPress={() => goHome()}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TapScale>
          <View style={{ flex: 1 }} />
          {/* Разделы одним рядом компактных иконок (как чипы на главной, но свои иконки:
              на главной — колокольчик/чат/видео, здесь — люди/пульс/мегафон/добавить). */}
          {(['friends', 'activity'] as const).map(tab => {
            const active = activeTab === tab;
            const tabLabel = tab === 'friends'
              ? L('Друзья', 'Друзі', 'Amigos', 'Amigos', 'Bạn bè', 'Teman', 'Arkadaşlar', 'Znajomi')
              : L('Активность', 'Активність', 'Actividad', 'Atividade', 'Hoạt động', 'Aktivitas', 'Etkinlik', 'Aktywność');
            const tabIcon = tab === 'friends'
              ? (active ? 'people' : 'people-outline')
              : (active ? 'pulse' : 'pulse-outline');
            const tabBadge = tab === 'friends' ? requests.length : 0;
            return (
              <TouchableOpacity
                testID={`friends-tab-${tab}`}
                key={tab}
                accessibilityRole="button"
                accessibilityLabel={tabLabel}
                accessibilityState={{ selected: active }}
                onPressIn={() => hapticTap()}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: active ? t.accent : chrome.button,
                  borderWidth: 0.5, borderColor: active ? t.accent : chrome.border,
                  justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginRight: 10,
                }}
              >
                <Ionicons name={tabIcon as any} size={19} color={active ? t.correctText : t.textPrimary} />
                {tabBadge > 0 && (
                  <View
                    style={{
                      position: 'absolute', top: -3, right: -3,
                      minWidth: 18, height: 18, borderRadius: 9,
                      backgroundColor: '#FF3B30',
                      borderWidth: 1.5, borderColor: t.bgPrimary ?? '#000',
                      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>{tabBadge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {isReferralCloudEnabled() && (
            <TouchableOpacity
              testID="friends-open-referrals"
              accessibilityRole="button"
              accessibilityLabel={L('Мои рефералы', 'Мої реферали', 'Mis referidos', 'Meus indicados', 'Lời mời của tôi', 'Referal saya', 'Davetlerim', 'Moje polecenia')}
              onPressIn={() => hapticTap()}
              onPress={() => router.push('/referrals' as any)}
              activeOpacity={0.8}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: chrome.button, borderWidth: 0.5, borderColor: chrome.border,
                justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginRight: 10,
              }}
            >
              <Ionicons name="megaphone-outline" size={19} color={t.textPrimary} />
              {referralSummary.qualified > 0 && (
                <View
                  style={{
                    position: 'absolute', top: -3, right: -3,
                    minWidth: 18, height: 18, borderRadius: 9,
                    backgroundColor: t.correct ?? '#34C759',
                    borderWidth: 1.5, borderColor: t.bgPrimary ?? '#000',
                    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: t.correctText ?? '#fff', fontSize: 10, fontWeight: '900' }}>
                    {referralSummary.qualified}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID="friends-open-add"
            onPressIn={() => hapticTap()}
            onPress={() => { if (modalWedgeGuardRef.current) return; setAddModalOpen(true); setFoundUser(null); setSearchError(null); setCodeInput(''); }}
            activeOpacity={0.8}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}
          >
            <Ionicons name="person-add" size={18} color={t.correctText} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 12 }} />
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
                  borderTopWidth: 1,
                  borderTopColor: glassFill(t.accent, 0.14),
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="flash-outline" size={19} color={t.correctText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
                      {L('Совместный квест', 'Спільний квест', 'Friend Quest', 'Missão em dupla', 'Nhiệm vụ bạn bè', 'Quest teman', 'Arkadaş görevi', 'Misja znajomych')}
                    </Text>
                    <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 2 }}>
                      {L(`По 3000 XP за 24 часа · ${friendQuestHoursLeft}ч`, `По 3000 XP за 24 год · ${friendQuestHoursLeft}год`, `3000 XP each · ${friendQuestHoursLeft}h`, `3000 XP cada · ${friendQuestHoursLeft}h`, `Mỗi người 3000 XP · ${friendQuestHoursLeft}h`, `Masing-masing 3000 XP · ${friendQuestHoursLeft}j`, `Kişi başı 3000 XP · ${friendQuestHoursLeft}sa`, `Po 3000 XP · ${friendQuestHoursLeft}h`)}
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
                        {L('Забрать', 'Забрати', 'Claim', 'Receber', 'Nhận', 'Klaim', 'Al', 'Odbierz')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {[
                  { id: 'friend-quest-my-progress', name: L('Ты', 'Ти', 'You', 'Você', 'Bạn', 'Kamu', 'Sen', 'Ty'), progress: friendQuestMyProgress, remaining: friendQuestMyRemaining },
                  { id: 'friend-quest-friend-progress', name: friendQuestPeerName, progress: friendQuestPeerProgress, remaining: friendQuestPeerRemaining },
                ].map(row => {
                  const pct = activeFriendQuest.targetXp > 0 ? Math.min(100, Math.round((row.progress / activeFriendQuest.targetXp) * 100)) : 0;
                  return (
                    <View key={row.id} testID={row.id} style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', flex: 1 }} numberOfLines={1}>{row.name}</Text>
                        <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '800' }}>
                          {row.remaining > 0 ? L(`ещё ${row.remaining} XP`, `ще ${row.remaining} XP`, `${row.remaining} XP left`, `faltam ${row.remaining} XP`, `còn ${row.remaining} XP`, `sisa ${row.remaining} XP`, `${row.remaining} XP kaldı`, `zostało ${row.remaining} XP`) : L('готово', 'готово', 'ready', 'pronto', 'xong', 'siap', 'hazır', 'gotowe')}
                        </Text>
                      </View>
                      <View style={{ height: 9, borderRadius: 5, backgroundColor: chrome.surface, overflow: 'hidden' }}>
                        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 5, backgroundColor: row.remaining === 0 ? '#34C759' : t.accent }} />
                      </View>
                    </View>
                  );
                })}
                <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '700' }}>
                  {L('+10 осколков и +1000 XP каждому', '+10 осколків і +1000 XP кожному', '+10 shards and +1000 XP each', '+10 fragmentos e +1000 XP para cada', '+10 mảnh và +1000 XP mỗi người', '+10 pecahan dan +1000 XP masing-masing', 'Herkese +10 parça ve +1000 XP', '+10 odłamków i +1000 XP dla każdego')}
                </Text>
              </View>
            )}
            {requests.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {L('Активные заявки', 'Активні заявки', 'Solicitudes activas', 'Solicitações ativas', 'Lời mời đang chờ', 'Permintaan aktif', 'Aktif istekler', 'Aktywne zaproszenia')}
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
                {L('Список друзей', 'Список друзів', 'Lista de amigos', 'Lista de amigos', 'Danh sách bạn bè', 'Daftar teman', 'Arkadaş listesi', 'Lista znajomych')}
                {sortedFriends.length > 0 ? ` · ${sortedFriends.length}` : ''}
              </Text>
              {sortedFriends.length > 0 && (
                <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                  {L('по XP', 'за XP', 'por XP', 'por XP', 'theo XP', 'berdasarkan XP', "XP'ye göre", 'wg XP')}
                </Text>
              )}
            </View>
          </>
  );

  const friendsEmptyState = (
              <View testID="friends-list-empty" style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 8, paddingHorizontal: 12, gap: 10 }}>
                <FriendsThemeIcon themeMode={themeMode} size={86} accessibilityLabel="Friends" />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', textAlign: 'center' }}>
                  {L('Учиться вместе веселее', 'Навчатися разом веселіше', 'Aprender juntos es más divertido', 'Aprender junto é mais divertido', 'Học cùng nhau vui hơn', 'Belajar bersama lebih seru', 'Birlikte öğrenmek daha eğlenceli', 'Nauka razem jest fajniejsza')}
                </Text>
                {referralEnabled ? (
                  <>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', lineHeight: Math.round(f.sub * 1.4), maxWidth: 320 }}>
                      {L(
                        'Получите 7 дней полного Plus-доступа ко всему за одного приглашённого друга, который установит приложение, введёт ваш код',
                        'Отримайте 7 днів повного Plus-доступу до всього за одного запрошеного друга, який встановить застосунок, введе ваш код',
                        'Recibe 7 días de acceso Plus completo a todo por cada amigo invitado que instale la app, introduzca tu código',
                        'Receba 7 dias de acesso Plus completo a tudo por um amigo convidado que instalar o app, inserir seu código',
                        'Nhận 7 ngày Plus đầy đủ khi bạn mời một người bạn cài ứng dụng, nhập mã của bạn',
                        'Dapatkan 7 hari Plus penuh saat teman yang kamu undang memasang aplikasi, memasukkan kodemu',
                        'Davet ettiğin arkadaş uygulamayı kurup kodunu girerse',
                        'Otrzymasz 7 dni pełnego Plus za znajomego, który zainstaluje aplikację i wpisze twój kod',
                      )}
                      {referralCode ? (
                        <Text testID="friends-referral-code-inline" style={{ color: t.accent, fontWeight: '900', letterSpacing: 1 }}>
                          {' '}{referralCode}
                        </Text>
                      ) : null}
                      {L(
                        ' и пройдёт один урок полностью. Друг тоже получит 7 дней полного доступа.',
                        ' і повністю пройде один урок. Друг теж отримає 7 днів повного доступу.',
                        ' y complete una lección. Tu amigo también recibirá 7 días.',
                        ' e concluir uma lição. Ele também recebe 7 dias.',
                        ' và hoàn thành một bài học. Bạn ấy cũng nhận 7 ngày.',
                        ' dan menyelesaikan satu pelajaran. Temanmu juga dapat 7 hari.',
                        ' ve bir dersi tamamen bitirirse 7 gün tam Plus erişim kazanırsın. Arkadaşın da 7 gün alır.',
                        ' i ukończy jedną lekcję. Znajomy też dostanie 7 dni.',
                      )}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, alignSelf: 'stretch', paddingHorizontal: 8 }}>
                      <DuoPressable
                        testID="friends-empty-invite"
                        onPress={() => { void handleReferralInvite(); }}
                        edgeColor={t.accent}
                        wrapStyle={{ flex: 1 }}
                        style={{ minHeight: 58, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 12 }}
                      >
                        <Ionicons name="share-social" size={20} color={t.correctText} />
                        <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '900', textAlign: 'center', includeFontPadding: false }} numberOfLines={2}>
                          {L('Пригласить', 'Запросити', 'Invitar', 'Convidar', 'Mời bạn', 'Undang', 'Davet et', 'Zaproś')}
                        </Text>
                      </DuoPressable>
                      <TapScale
                        testID="friends-empty-enter-code"
                        onPress={() => { hapticTap(); router.push('/referral_code_entry' as any); }}
                        style={{ flex: 1, minHeight: 58, backgroundColor: 'transparent', borderRadius: 14, borderWidth: 1, borderColor: t.border }}
                      >
                        <View style={{ minHeight: 58, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 }}>
                          <Ionicons name="ticket-outline" size={20} color={t.textPrimary} />
                          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900', textAlign: 'center', includeFontPadding: false }} numberOfLines={2}>
                            {L('Ввести код', 'Ввести код', 'Ingresar código', 'Inserir código', 'Nhập mã', 'Masukkan kode', 'Kod gir', 'Wpisz kod')}
                          </Text>
                        </View>
                      </TapScale>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', lineHeight: Math.round(f.sub * 1.4), maxWidth: 320 }}>
                      {L(
                        'Добавьте друзей по коду или нику — соревнуйтесь в лигах и дарите подарки.',
                        'Додайте друзів за кодом або ніком — змагайтеся в лігах і даруйте подарунки.',
                        'Agrega amigos por código o apodo: compitan en ligas y envíen regalos.',
                        'Adicione amigos por código ou apelido — compita em ligas e troque presentes.',
                        'Thêm bạn bằng mã hoặc biệt danh — thi đua trong giải và tặng quà.',
                        'Tambahkan teman lewat kode atau nama — berkompetisi di liga dan beri hadiah.',
                        'Kod veya takma adla arkadaş ekle — liglerde yarış ve hediye gönder.',
                        'Dodaj znajomych po kodzie lub nicku — rywalizujcie w ligach i dawajcie prezenty.',
                      )}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, alignSelf: 'stretch', paddingHorizontal: 8 }}>
                      <DuoPressable
                        testID="friends-empty-add"
                        onPress={() => { hapticTap(); setAddModalOpen(true); }}
                        edgeColor={t.accent}
                        wrapStyle={{ flex: 1 }}
                        style={{ minHeight: 58, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 12 }}
                      >
                        <Ionicons name="person-add" size={20} color={t.correctText} />
                        <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '900', textAlign: 'center', includeFontPadding: false }} numberOfLines={2}>
                          {L('Добавить друга', 'Додати друга', 'Agregar amigo', 'Adicionar amigo', 'Thêm bạn', 'Tambah teman', 'Arkadaş ekle', 'Dodaj znajomego')}
                        </Text>
                      </DuoPressable>
                    </View>
                  </>
                )}
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

        {activeTab === 'friends' && (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <ReportErrorButton
              screen="friends_tab"
              dataId="friends_tab_main"
              dataText={L('Вкладка друзья', 'Вкладка друзі', 'Pestaña amigos', 'Aba amigos', 'Tab bạn bè', 'Tab teman', 'Arkadaşlar sekmesi', 'Karta znajomych')}
            />
          </View>
        )}
    </>
  );

  return (
    <ScreenGradient artBackdrop="friends">
      <View testID="screen-friends" style={{ flex: 1 }}>
      <BouncyWrap style={bouncyStyle}>
      {activeTab === 'friends' ? (
        <AnimatedFlashList
          {...listScrollProps}
          testID="friends-list"
          data={sortedFriends}
          keyExtractor={(profile: FriendProfile) => profile.uid}
          renderItem={({ item: profile, index: i }: { item: FriendProfile; index: number }) => (
            <FriendRow
              profile={profile}
              rank={i + 1}
              onPress={() => openProfile(profile)}
              onDelete={() => handleDeleteConfirm(profile.uid, profile.name)}
              onGift={() => openGiftPicker(profile)}
              lang={lang} t={t} f={f} chrome={chrome}
              themeMode={themeMode}
              referralStatus={referralStatusByUid.get(profile.uid)}
            />
          )}
          ListHeaderComponent={<>{listHeader}{friendsPreList}</>}
          ListEmptyComponent={friendsEmptyState}
          ListFooterComponent={listFooter}
        />
      ) : (
        <ActivityTab
          friendUids={friendUids}
          profiles={profiles}
          lang={lang} t={t} f={f}
          chrome={chrome}
          themeMode={themeMode}
          header={listHeader}
          footer={listFooter}
          scrollProps={listScrollProps}
          onOpenProfile={(uid) => { const p = profiles[uid]; if (p) openProfile(p); }}
        />
      )}
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
          <View style={{
            backgroundColor: chrome.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 18,
            paddingBottom: 28,
            gap: 12,
            borderWidth: 0.5,
            borderColor: chrome.border,
          }}>
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
                  {L('Подарок другу', 'Подарунок другу', 'Regalo para amigo', 'Presente para amigo', 'Quà cho bạn bè', 'Hadiah untuk teman', 'Arkadaşına hediye', 'Prezent dla znajomego')}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 2 }} numberOfLines={1}>
                  {giftTarget?.name ?? ''}
                </Text>
              </View>
              <TouchableOpacity
                testID="friend-gift-close"
                onPress={() => setGiftTarget(null)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: chrome.button,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color={t.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{
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
                accessibilityLabel="Осколки"
              />
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}>{giftBalance}</Text>
            </View>

            {addFeedback && giftTarget && (
              <View
                testID="friend-gift-feedback"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: chrome.surface,
                  borderWidth: 0.5,
                  borderColor: chrome.border,
                }}
              >
                <Ionicons name="information-circle-outline" size={18} color={t.accent} />
                <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', flex: 1 }}>
                  {addFeedback}
                </Text>
              </View>
            )}

            {FRIEND_GIFT_CATALOG.map(gift => {
              const cannotAfford = giftBalance < gift.costShards;
              const sendingThisGift = giftBusyId === gift.id;
              const disabled = giftBusyId !== null;
              const displayCost = cannotAfford ? gift.costShards - giftBalance : gift.costShards;
              const displayCostText = cannotAfford ? `+${displayCost}` : `${displayCost}`;
              return (
                <TouchableOpacity
                  key={gift.id}
                  testID={`friend-gift-option-${gift.id}`}
                  disabled={disabled}
                  onPress={() => requestSendGift(gift.id)}
                  activeOpacity={0.82}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 13,
                    borderRadius: 14,
                    backgroundColor: chrome.surface,
                    opacity: sendingThisGift ? 0.82 : disabled ? 0.45 : cannotAfford ? 0.72 : 1,
                    borderWidth: 0.5,
                    borderColor: chrome.border,
                  }}
                >
                  <View style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: chrome.card,
                  }}>
                    <Ionicons name={gift.icon as any} size={21} color={t.accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
                      {giftLabel(gift)}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }} numberOfLines={2}>
                      {giftDescription(gift)}
                    </Text>
                  </View>
                  <View style={{ minWidth: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    {sendingThisGift ? (
                      <ActivityIndicator size="small" color={t.accent} />
                    ) : (
                      <>
                    <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '900', textAlign: 'right' }}>
                      {displayCostText}
                    </Text>
                    <Image
                      source={oskolokImageForPackShards(displayCost)}
                      style={{ width: 22, height: 22 }}
                      contentFit="contain"
                      accessibilityLabel="Осколки"
                    />
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal
        visible={sentGiftReceipt !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSentGiftReceipt(null)}
      >
        <View testID="friend-gift-sent-modal" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(7, 8, 13, 0.72)' }}>
          <LinearGradient
            testID="friend-gift-sent-card"
            colors={sentGiftChrome.shellColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '100%',
              maxWidth: 372,
              borderRadius: sentGiftChrome.shellRadius,
              padding: 1,
              shadowColor: sentGiftChrome.shadowColor,
              shadowOpacity: 0.34,
              shadowRadius: 30,
              shadowOffset: { width: 0, height: 16 },
              elevation: 18,
            }}
          >
            <View style={{ borderRadius: sentGiftChrome.innerRadius, overflow: 'hidden', backgroundColor: sentGiftChrome.innerBg, borderWidth: 1, borderColor: sentGiftChrome.innerBorder }}>
              <LinearGradient
                colors={sentGiftChrome.washColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={{ padding: 22, gap: 14 }}>
                <View style={{ alignSelf: 'center', alignItems: 'center', justifyContent: 'center', width: 94, height: 94 }}>
                  <View style={{ position: 'absolute', width: 94, height: 94, borderRadius: 47, backgroundColor: sentGiftChrome.haloBg }} />
                  <LinearGradient
                    colors={sentGiftChrome.iconColors}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.95, y: 1 }}
                    style={{ width: 72, height: 72, borderRadius: sentGiftChrome.iconRadius, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }}
                  >
                    <Ionicons name="checkmark" size={38} color={sentGiftChrome.buttonText} />
                  </LinearGradient>
                </View>
                <Text style={{ color: sentGiftChrome.labelColor, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0 }}>
                  {L('Подарок другу', 'Подарунок другу', 'Friend gift', 'Presente para amigo', 'Quà cho bạn bè', 'Hadiah untuk teman', 'Arkadaşına hediye', 'Prezent dla znajomego')}
                </Text>
                <Text style={{ color: sentGiftChrome.titleColor, fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
                  {L('Подарок отправлен', 'Подарунок надіслано', 'Gift sent', 'Presente enviado', 'Đã gửi quà', 'Hadiah terkirim', 'Hediye gönderildi', 'Prezent wysłany')}
                </Text>
                {sentGiftReceipt ? (
                  <View style={{ borderRadius: 18, padding: 14, gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                    <Text style={{ color: sentGiftChrome.bodyColor, fontSize: f.sub, lineHeight: f.sub + 4, textAlign: 'center' }}>
                      {L(
                        `${sentGiftReceipt.targetName} получит: ${sentGiftReceipt.giftName}`,
                        `${sentGiftReceipt.targetName} отримає: ${sentGiftReceipt.giftName}`,
                        `${sentGiftReceipt.targetName} recibirá: ${sentGiftReceipt.giftName}`,
                        `${sentGiftReceipt.targetName} receberá: ${sentGiftReceipt.giftName}`,
                        `${sentGiftReceipt.targetName} sẽ nhận: ${sentGiftReceipt.giftName}`,
                        `${sentGiftReceipt.targetName} akan menerima: ${sentGiftReceipt.giftName}`,
                        `${sentGiftReceipt.targetName} alacak: ${sentGiftReceipt.giftName}`,
                        `${sentGiftReceipt.targetName} otrzyma: ${sentGiftReceipt.giftName}`,
                      )}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={{ color: sentGiftChrome.mutedColor, fontSize: f.sub, fontWeight: '800' }}>
                          {L('Списано', 'Списано', 'Spent', 'Gasto', 'Đã trừ', 'Terpakai', 'Harcanan', 'Pobrano')}
                        </Text>
                        <Text style={{ color: monoIcon(themeMode, '#F3C45E'), fontSize: f.sub, fontWeight: '900' }}>{sentGiftReceipt.costShards}</Text>
                        <Image source={oskolokImageForPackShards(sentGiftReceipt.costShards)} style={{ width: 18, height: 18 }} contentFit="contain" accessibilityLabel="Осколки" />
                      </View>
                      <View style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.16)' }} />
                      <Text style={{ color: sentGiftChrome.mutedColor, fontSize: f.sub, fontWeight: '800' }}>
                        {L(`Осталось ${sentGiftReceipt.balanceAfter}`, `Залишилось ${sentGiftReceipt.balanceAfter}`, `${sentGiftReceipt.balanceAfter} left`, `Restam ${sentGiftReceipt.balanceAfter}`, `Còn ${sentGiftReceipt.balanceAfter}`, `Sisa ${sentGiftReceipt.balanceAfter}`, `${sentGiftReceipt.balanceAfter} kaldı`, `Zostało ${sentGiftReceipt.balanceAfter}`)}
                      </Text>
                    </View>
                    {sentGiftReceipt.dailyRemaining === 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Ionicons name="information-circle-outline" size={15} color={sentGiftChrome.infoColor} />
                        <Text style={{ color: sentGiftChrome.infoColor, fontSize: f.sub, fontWeight: '800', textAlign: 'center', flexShrink: 1 }}>
                          {L('Лимит подарков на сегодня исчерпан', 'Ліміт подарунків на сьогодні вичерпано', 'Gift limit reached for today', 'Limite de presentes de hoje atingido', 'Đã hết lượt tặng quà hôm nay', 'Batas hadiah hari ini tercapai', 'Bugünkü hediye sınırı doldu', 'Dzisiejszy limit prezentów wykorzystany')}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}
                <TouchableOpacity
                  testID="friend-gift-sent-ok"
                  onPress={() => setSentGiftReceipt(null)}
                  activeOpacity={0.86}
                  style={{ minHeight: 48, borderRadius: sentGiftChrome.iconRadius, alignItems: 'center', justifyContent: 'center', backgroundColor: sentGiftChrome.buttonBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
                >
                  <Text style={{ color: sentGiftChrome.buttonText, fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                    {L('Понятно', 'Зрозуміло', 'Done', 'Entendi', 'Đã hiểu', 'Mengerti', 'Tamam', 'Rozumiem')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      <Modal
        visible={incomingGiftModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setIncomingGiftModal(null)}
      >
        <View testID="friend-gift-received-modal" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(9, 8, 12, 0.72)' }}>
          <LinearGradient
            testID="friend-gift-received-card"
            colors={['rgba(255,247,222,0.98)', 'rgba(250,238,210,0.97)', 'rgba(232,213,176,0.96)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '100%',
              maxWidth: 372,
              borderRadius: 28,
              padding: 1,
              shadowColor: '#D9A441',
              shadowOpacity: 0.32,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: 16 },
              elevation: 18,
            }}
          >
          <View style={{ borderRadius: 27, overflow: 'hidden', backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: 'rgba(156,115,45,0.32)' }}>
            <LinearGradient
              colors={['rgba(68,48,20,0.06)', 'rgba(255,255,255,0)', 'rgba(184,132,38,0.12)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ padding: 22, gap: 14 }}>
            {incomingGiftModal ? (() => {
              const first = incomingGiftModal.gifts[0];
              const from = first?.fromName || L('друг', 'друг', 'amigo', 'amigo', 'bạn bè', 'teman', 'arkadaş', 'znajomy');
              const gift = first ? giftEventLabel(first as unknown as Record<string, string | number>, lang) : '';
              const multi = incomingGiftModal.gifts.length > 1;
              const iconGiftId = first?.giftId === 'xp_boost_2x_24h' ? 'xp_2x_24h' : first?.giftId;
              return (
                <>
                  <View style={{ alignSelf: 'center', alignItems: 'center', justifyContent: 'center', width: 98, height: 98 }}>
                    <View style={{ position: 'absolute', width: 98, height: 98, borderRadius: 49, backgroundColor: 'rgba(214,157,44,0.14)' }} />
                    <LinearGradient
                      testID={`friend-gift-rank-${iconGiftId || 'generic'}`}
                      colors={['#FFF8DD', '#E8C36A', '#B78628']}
                      start={{ x: 0.15, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={{ width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(109,76,24,0.24)' }}
                    >
                      {iconGiftId ? (
                        <Image source={getLevelGiftRewardIcon(iconGiftId, themeMode)} style={{ width: 56, height: 56 }} contentFit="contain" accessibilityLabel="Иконка подарка" />
                      ) : (
                        <Ionicons name="gift-outline" size={34} color={monoIcon(themeMode, '#4C3412', MONO_ICON.onLight)} />
                      )}
                    </LinearGradient>
                  </View>
                  <Text style={{ color: monoIcon(themeMode, '#7A5518', MONO_ICON.onLight), fontSize: 11, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0 }}>
                    {L('Подарок от друга', 'Подарунок від друга', 'Friend gift', 'Presente de amigo', 'Quà từ bạn bè', 'Hadiah teman', 'Arkadaş hediyesi', 'Prezent od znajomego')}
                  </Text>
                  <Text style={{ color: monoIcon(themeMode, '#21170B', MONO_ICON.onLight), fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
                    {multi
                      ? L('Новые подарки', 'Нові подарунки', 'Regalos nuevos', 'Novos presentes', 'Quà mới', 'Hadiah baru', 'Yeni hediyeler', 'Nowe prezenty')
                      : L('Подарок получен', 'Подарунок отримано', 'Regalo recibido', 'Presente recebido', 'Đã nhận quà', 'Hadiah diterima', 'Hediye alındı', 'Prezent otrzymany')}
                  </Text>
                  <View style={{ borderRadius: 18, padding: 14, gap: 8, backgroundColor: 'rgba(255,255,255,0.54)', borderWidth: 1, borderColor: 'rgba(126,88,27,0.14)' }}>
                    <Text style={{ color: monoIcon(themeMode, '#4E3B1D', MONO_ICON.onLight), fontSize: f.sub, lineHeight: f.sub + 4, textAlign: 'center' }}>
                      {multi
                        ? L(`У тебя ${incomingGiftModal.gifts.length} новых подарка от друзей`, `У тебе ${incomingGiftModal.gifts.length} нових подарунки від друзів`, `Tienes ${incomingGiftModal.gifts.length} regalos nuevos de amigos`, `Você tem ${incomingGiftModal.gifts.length} presentes novos de amigos`, `Bạn có ${incomingGiftModal.gifts.length} quà mới từ bạn bè`, `Kamu punya ${incomingGiftModal.gifts.length} hadiah baru dari teman`, `Arkadaşlarından ${incomingGiftModal.gifts.length} yeni hediye var`, `Masz ${incomingGiftModal.gifts.length} nowe prezenty od znajomych`)
                        : L(`${from} подарил: ${gift}`, `${from} подарував: ${gift}`, `${from} te regaló: ${gift}`, `${from} deu um presente: ${gift}`, `${from} đã tặng: ${gift}`, `${from} memberi hadiah: ${gift}`, `${from} hediye verdi: ${gift}`, `${from} podarował: ${gift}`)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Ionicons name="albums-outline" size={15} color={monoIcon(themeMode, '#8A641D', MONO_ICON.onLight)} />
                      <Text style={{ color: monoIcon(themeMode, '#8A641D', MONO_ICON.onLight), fontSize: f.sub, fontWeight: '800', textAlign: 'center' }}>
                        {L('Сохранено в разделе «Подарки»', 'Збережено в розділі «Подарунки»', 'Saved in Gifts', 'Salvo em Presentes', 'Đã lưu trong Quà', 'Disimpan di Hadiah', 'Hediyeler bölümüne kaydedildi', 'Zapisano w Prezentach')}
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
                    style={{ minHeight: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(126,88,27,0.16)' }}
                  >
                    <Text style={{ color: monoIcon(themeMode, '#3D2B10', MONO_ICON.onLight), fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                      {L('Сказать спасибо', 'Сказати дякую', 'Say thanks', 'Agradecer', 'Cảm ơn', 'Ucapkan terima kasih', 'Teşekkür et', 'Podziękuj')}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      testID="friend-gift-reply-shield"
                      activeOpacity={0.86}
                      disabled={giftBusyId !== null}
                      onPress={() => void handleIncomingGiftReply('chain_shield_1')}
                      style={{ flex: 1, minHeight: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#272015', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}
                    >
                      <Text style={{ color: monoIcon(themeMode, '#FFF7DF'), fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                        {L('Ответить щитом', 'Відповісти щитом', 'Send shield', 'Enviar escudo', 'Gửi khiên', 'Kirim perisai', 'Kalkan gönder', 'Wyślij tarczę')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="friend-gift-reply-boost"
                      activeOpacity={0.86}
                      disabled={giftBusyId !== null}
                      onPress={() => void handleIncomingGiftReply('xp_boost_2x_24h')}
                      style={{ flex: 1, minHeight: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D7A83B' }}
                    >
                      <Text style={{ color: monoIcon(themeMode, '#241905', MONO_ICON.onLight), fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                        {L('Отправить буст', 'Надіслати буст', 'Send boost', 'Enviar boost', 'Gửi boost', 'Kirim boost', 'Boost gönder', 'Wyślij boost')}
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
                  style={{ flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#272015', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}
                >
                  <Text style={{ color: monoIcon(themeMode, '#FFF7DF'), fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                    {L('В подарки', 'До подарунків', 'Gifts', 'Presentes', 'Quà', 'Hadiah', 'Hediyeler', 'Prezenty')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="friend-gift-received-ok"
                  onPress={() => setIncomingGiftModal(null)}
                  activeOpacity={0.86}
                  style={{ flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D7A83B' }}
                >
                  <Text style={{ color: monoIcon(themeMode, '#241905', MONO_ICON.onLight), fontSize: f.sub, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>
                    {L('Понятно', 'Зрозуміло', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Tamam', 'Rozumiem')}
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
        visible={accessEndedOpen}
        onInviteFriend={() => { setAccessEndedOpen(false); void dismissReferralAccessEnded(); void handleReferralInvite(); }}
        onOpenFullAccess={() => {
          setAccessEndedOpen(false);
          void dismissReferralAccessEnded();
          router.push({ pathname: '/premium_modal', params: { context: 'generic', source: 'referral_ended' } } as any);
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
      <ThemedConfirmModal
        visible={deleteTarget !== null}
        title={L('Удалить друга?', 'Видалити друга?', '¿Eliminar amigo?', 'Remover amigo?', 'Xóa bạn bè?', 'Hapus teman?', 'Arkadaşı sil?', 'Usunąć znajomego?')}
        message={deleteTarget?.name ?? ''}
        cancelLabel={L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'İptal', 'Anuluj')}
        confirmLabel={L('Удалить', 'Видалити', 'Eliminar', 'Remover', 'Xóa', 'Hapus', 'Sil', 'Usuń')}
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
            showFeedback(L('Удаляем друга...', 'Видаляємо друга...', 'Eliminando amigo...', 'Removendo amigo...', 'Đang xóa bạn bè...', 'Menghapus teman...', 'Arkadaş siliniyor...', 'Usuwanie znajomego...'));
            emitAppEvent('action_toast', {
              type: 'info',
              messageRu: `Удаляем друга: ${target.name}`,
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
                void invalidateFriendsActivityCache();
                showFeedback(L('Друг удалён', 'Друга видалено', 'Amigo eliminado', 'Amigo removido', 'Đã xóa bạn bè', 'Teman dihapus', 'Arkadaş silindi', 'Znajomy usunięty'));
                emitAppEvent('action_toast', {
                  type: 'success',
                  messageRu: `Друг удалён: ${target.name}`,
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
                showFeedback(L('Ошибка удаления. Попробуй ещё раз', 'Помилка видалення. Спробуйте ще раз', 'Error al eliminar. Inténtalo de nuevo', 'Erro ao remover. Tente novamente', 'Không xóa được. Hãy thử lại', 'Gagal menghapus. Coba lagi', 'Silme hatası. Tekrar dene', 'Błąd usuwania. Spróbuj ponownie'));
                emitAppEvent('action_toast', {
                  type: 'error',
                  messageRu: 'Ошибка удаления. Попробуй ещё раз',
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
