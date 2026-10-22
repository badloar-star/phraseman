import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { consumeDevFriendEvent, DEV_FOUND_FRIEND_UID, isDevFoundFriendCode, isDevFoundFriendUid, isDevFriendsFail, isDevFriendsHeld, isDevSelfFriendCode, isDevUnsyncedFriendCode } from '../dev_social_state';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, TouchableOpacity, TextInput,
  Share, Keyboard, StyleSheet, Modal, InteractionManager, Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Reanimated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { noteSwallowedAs, noteSwallowedHandler } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

// FlashList с поддержкой Reanimated-обработчика скролла (onScroll-worklet на UI-потоке).
const AnimatedFlashList = Reanimated.createAnimatedComponent(FlashList as any) as any;
// зачем: «добавить друга» — низкий Bevel-шит на общем каркасе шторок рефералки.
import FriendsAddSheetShell from '../../components/friends/FriendsAddSheetShell';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import FeatureIntroEntry from '../../components/feature_intro/FeatureIntroEntry';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import { useBouncy, useBouncyStyle } from '../../components/BouncyScrollView';
import { LinearGradient } from '../../components/SafeLinearGradient';
// зачем (владелец 2026-09-29): вкладка «Друзья» 1 в 1 по макету community.html (Liquid Glass) —
// презентационные блоки вынесены в components/friends/*, логика остаётся в этом экране.
import FriendsRequestCard from '../../components/friends/FriendsRequestCard';
import FriendsFoundCard from '../../components/friends/FriendsFoundCard';
import FriendsEmptyState from '../../components/friends/FriendsEmptyState';
import DailyPollCard from '../../components/friends/DailyPollCard';
import { FriendsFeedbackRow, FriendsRoundButton, FriendsSectionTitle, useFriendsGlass } from '../../components/friends/FriendsGlassKit';
import { plateBoxShadow } from '../../components/v2/ShadowSurface';
import { FlowText } from '../../components/text-integrity';
import UnifiedPlayerModal, { PlayerInfo } from '../../components/PlayerProfileModal';
import ThemedConfirmModal from '../../components/ThemedConfirmModal';
import { softShadow } from '../../constants/androidGlow';
import { V2 } from '../../constants/v2Style';
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

import { isValidInviteCodeLookup, normalizeInviteCodeInput } from '../friend_code';
import { ensureMyInviteCodeForFriends, isTransientFirestoreRead, lookupUserByFriendCode, lookupUserByNickname, readCachedMyInviteCodeForFriends, type LookupUserProfile } from '../firestore_friends';
import { friendTag, logFriendAdd } from '../friend_add_trace';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  subscribeToIncomingRequests,
  cleanupStaleFriendData,
  invalidateFriendsSocialReadCaches,
  decideFriendsCacheAgainstCachedSocialEvent,
  type FriendEntry,
  type FriendRequestEntry,
} from '../firestore_friend_requests';
import { blockUser, refreshBlockedList } from '../friend_block';
// зачем (Ядро 01.10): кнопку «Заблокировать» включать только после выкладки friendBlockUser/friendUnblockUser —
// без функций каждое нажатие кончалось бы откатом и ошибкой. Включить: true (после подтверждения координатора).
const FRIEND_BLOCK_UI_ENABLED = true; // координатор 01.10: функции блокировки и удаления аккаунта выложены
import { CLOUD_SYNC_ENABLED, ENABLE_DEV_TOOLS, IS_EXPO_GO } from '../config';
import { getCanonicalUserId } from '../user_id_policy';
import { ensureAnonUser } from '../cloud_sync';
import { fetchFriendProfilesBatch, type FriendProfileBatchRecord } from '../friends_profiles_batch';
import { devFriendsDemoData, isDevFriendsDemoOn } from '../dev_friends_demo';
import { isDevOverlaysOff } from '../dev_overlays_off';
import { acquireInviteCodeShared, invalidateInviteCodeShared } from '../invite_code_singleton';
import { isPremiumProgressActive, isVipProgressActive } from '../premium_progress';
import { isPlusProfile, readPlusUntilMs } from '../../components/plus/plus_ring_spec';
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
import { useTabFocusTick, useTabNav } from '../TabContext';
// зачем (владелец, 2026-08-16): лента «Активность» удалена — у 99 % пользователей она была
// пустой (35 из 4 657 имеют друзей), источник событий давал 0–2 события в день на всю базу.
// Социальный жест остался один и дешёвый: «дай пять» = профильный лайк прямо в строке друга.
import {
  PROFILE_LIKE_EVENT_ID,
  fetchActivityLikeState,
  fetchActivityLikeStatesCached,
  removeFriendActivityLike,
  sendFriendActivityLike,
} from '../friend_activity_likes';
import { trackActivity } from '../app_activity';
import { friendsAccountStore } from '../friends_account_store';
import { useLoadGate } from '../use_load_gate';
import { createPendingFriendOps } from '../friends_pending_ops';
import { emitAppEvent, onAppEvent } from '../events';
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
import { getAppSnapshot, useAppSnapshotSelector } from '../app_snapshot_store';
import { captureAccountGeneration } from '../account_generation';
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
import {
  getFriendsTogetherSnapshot,
  primeFriendsTogetherSnapshot,
  refreshFriendsTogether,
  type FriendsTogetherSnapshot,
  type FriendTogetherPairState,
} from '../friends_together/together_store';
import { nudgeFriend, isNudgedToday, primeNudgedTodayCache, type NudgeErrorReason } from '../friends_together/nudge_client';
import { LEVEL_NAMES, nextThreshold } from '../friends_together/together_days';
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
  probeUserNotificationsHead,
  readCachedUserNotifications,
} from '../user_notifications';
// DEV-only: сквозная ручная проверка «Вместе» без реальных друзей (владелец, 2026-08-17).
import DevBotsSheet from '../../components/friends_together/DevBotsSheet';
import {
  type DevBotsState,
  loadDevBots,
  addDevBots,
  advanceBotDay,
  advanceAllBots,
  simulateIncomingNudge,
  nudgeDevBot,
  resetDevBots,
  devBotToFriendProfile,
  devBotTogetherMetrics,
} from '../friends_together/dev_bots';
import { DebugLogger } from '../debug-logger';
import { isValidCoinRank } from '../coin_rank_table_v1';
import { noteSkeletonGeom } from '../skeleton_geom_log';

// зачем: PM-212 — чтение AsyncStorage при ИМПОРТЕ модуля убрано. Тёплый кеш
// греет root layout, а сам экран зовёт идемпотентный prime в эффектах монтирования
// (тот же общий Promise), поэтому импорт вкладки больше ничего не читает с диска.

// ── Types ─────────────────────────────────────────────────────────────────────

interface FriendProfile {
  uid: string;
  name: string;
  streak: number;
  isPremium: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
  /** Настоящий Plus (Ядро 22.10): кольцо у друга считает isPlusProfile; вводный доступ сюда не попадает. */
  isPlus?: boolean | null;
  /** Срок Plus в мс: 0 = бессрочно, null/нет = Plus нет. */
  plusUntilMs?: number | null;
  avatar: string;
  frame: string;
  aura?: string;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  coinRank?: number | null;
}

const PROFILE_TTL_MS = 30 * 1000;
const FRIENDS_REFERRAL_REFRESH_TTL_MS = 15 * 60 * 1000;

type ProfileCacheEntry = FriendsProfileCacheEntry;

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

async function writeProfilesCache(cache: Record<string, ProfileCacheEntry>, retainUids: readonly string[] = []): Promise<void> {
  try {
    await AsyncStorage.setItem(
      FRIEND_PROFILES_CACHE_KEY,
      JSON.stringify(pruneFriendsProfileCache(cache, Date.now(), retainUids)),
    );
  } catch (e) {
      // ignore
      DebugLogger.error('friends:writeProfilesCache', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// ── Firestore accessor ────────────────────────────────────────────────────────

const getDb = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return require('@react-native-firebase/firestore').default();
  } catch (e) {
    console.warn('[FRIENDS] firestore unavailable:', e instanceof Error ? e.message.slice(0, 80) : String(e).slice(0, 80)); // guard-ok: немой catch закрыт (аудит 17.10)
    return null;
  }
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
    streak: 0,
    isPremium: false,
    isVip: false,
    avatar: '1',
    frame: '',
    aura: undefined,
    coinRank: null,
  };
}

/**
 * Строит FriendProfile из серверного профиля поиска (users.progress). Это ПЕРВИЧНЫЙ
 * источник: сервер вернул имя и аватар сразу, поэтому карточка друга не
 * зависит от leaderboard (у многих юзеров записи там нет → раньше был прочерк
 * и базовый аватар). Уровень больше не является частью профиля.
 */
function friendProfileFromLookup(uid: string, lp: LookupUserProfile | undefined): FriendProfile | null {
  if (!lp) return null;
  const name = cleanFriendDisplayName(lp.name);
  const avatar = (lp.avatar ?? '').trim();
  // Совсем пусто — профиля нет (не перекрываем возможный leaderboard-результат).
  if (!name && !avatar) return null;
  return normalizePublicFriendProfile({
    uid,
    name,
    streak: 0,
    isPremium: lp.isPremium === true,
    isVip: false,
    isLifetime: false,
    avatar: avatar || '1',
    frame: (lp.frame ?? '').trim(),
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
  return {
    ...profile,
    // зачем (координатор 12.10, подготовка к английскому): запасное имя при пустом имени было русским «Игрок» для всех языков; теперь тот же нейтральный «Phraseman», что у placeholderFriendProfile и в списке заглушек shouldUseLookupDisplayName (старый кэш с «Игрок» по-прежнему считается заглушкой).
    name: profile.name.trim() || 'Phraseman',
    avatar: profile.avatar.trim() || '1',
    frame: profile.frame.trim(),
    // зачем (D108, 2026-09-30): ауры удалены — у друга только монета-аватар.
    aura: undefined,
    profileCardLevel: normalizeProfileCardLevel(profile.profileCardLevel),
    profileCardTheme: normalizeProfileCardTheme(profile.profileCardTheme),
    profileCardMotion: normalizeProfileCardMotion(profile.profileCardMotion),
    profileCardPublicFocus: normalizeProfileCardPublicFocus(profile.profileCardPublicFocus),
    coinRank: isValidCoinRank(profile.coinRank) ? profile.coinRank : null,
  };
}

function mergePublicFriendProfiles(
  current: FriendProfile | null,
  incoming: FriendProfile | null,
): FriendProfile | null {
  if (!incoming) return current;
  if (!current) return normalizePublicFriendProfile(incoming);

  const primary = incoming.name || incoming.avatar ? incoming : current;
  const secondary = primary === incoming ? current : incoming;
  return normalizePublicFriendProfile({
    uid: primary.uid || secondary.uid,
    name: primary.name || secondary.name,
    streak: Math.max(primary.streak, secondary.streak),
    isPremium: primary.isPremium || secondary.isPremium,
    isVip: primary.isVip || secondary.isVip,
    isLifetime: primary.isLifetime || secondary.isLifetime,
    // зачем: isPlus и срок берём парой из одного источника — иначе срок от старого профиля и флаг от нового дали бы чужой Plus
    isPlus: (primary.isPlus !== undefined ? primary : secondary).isPlus,
    plusUntilMs: (primary.isPlus !== undefined ? primary : secondary).plusUntilMs,
    avatar: primary.avatar || secondary.avatar,
    frame: primary.frame || secondary.frame,
    aura: primary.aura ?? secondary.aura,
    profileCardLevel: primary.profileCardLevel ?? secondary.profileCardLevel,
    profileCardTheme: primary.profileCardTheme ?? secondary.profileCardTheme,
    profileCardMotion: primary.profileCardMotion ?? secondary.profileCardMotion,
    profileCardPublicFocus: primary.profileCardPublicFocus ?? secondary.profileCardPublicFocus,
    coinRank: isValidCoinRank(primary.coinRank) ? primary.coinRank : secondary.coinRank,
  });
}

function profileFromLeaderboardDoc(uid: string, data: Record<string, unknown>): FriendProfile | null {
  const avatar = readPublicString(data.avatar);
  const frame = readPublicString(data.frame);
  const name = readPublicString(data.name) || readPublicString(data.displayName);
  const profileCardLevel = normalizeProfileCardLevel(data.profileCardLevel);
  if (!name && !avatar && !frame && profileCardLevel <= 0) return null;

  return normalizePublicFriendProfile({
    uid,
    name,
    streak: readPublicNumber(data.streak),
    isPremium: data.isPremium === true,
    isVip: data.isVip === true,
    isLifetime: data.isLifetime === true,
    isPlus: data.isPlus === true,
    plusUntilMs: readPlusUntilMs(data.plusUntilMs),
    avatar,
    frame,
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
    streak: 0,
    isPremium: rec.isPremium,
    isVip: rec.isVip,
    isLifetime: rec.isLifetime,
    isPlus: rec.isPlus === true,
    plusUntilMs: readPlusUntilMs(rec.plusUntilMs),
    avatar: rec.avatar,
    frame: rec.frame,
    aura: rec.aura,
    profileCardLevel: rec.profileCardLevel,
    profileCardTheme: undefined,
    profileCardMotion: undefined,
    profileCardPublicFocus: undefined,
    coinRank: isValidCoinRank(rec.coinRank) ? rec.coinRank : null,
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
    const newEntries: Record<string, ProfileCacheEntry> = {};
    for (let i = 0; i < toFetch.length; i++) {
      const profile = fetched[i];
      if (profile) {
        result[toFetch[i]] = profile;
        const entry: ProfileCacheEntry = { profile, fetchedAt: now };
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

// зачем (координатор 17.10, 💸 аудит [AUTH-OPTIMISTIC]): свой профиль читался целиком (users/{me}) на КАЖДОМ фокусе
// вкладки «Друзья». Кэш в памяти на владельца, 10 мин — тот же владелец не платит за чтение при каждом переключении.
const MY_PROFILE_TTL_MS = 10 * 60_000;
const myProfileCache = new Map<string, { at: number; value: Awaited<ReturnType<typeof fetchMyProfileFromFirestore>> }>();

/** Какое поле своего профиля в кэше разошлось со снимком приложения (null — кэш свежий). */
function myProfileCacheStaleField(value: NonNullable<Awaited<ReturnType<typeof fetchMyProfileFromFirestore>>>): string | null {
  const snapshot = getAppSnapshot();
  const profile = snapshot.profile;
  if (profile) {
    const localName = String(profile.name ?? '').trim();
    if (localName && localName !== value.name) return 'name';
    const localAvatar = String(profile.avatar ?? '').trim();
    if (localAvatar && localAvatar !== value.avatar) return 'avatar';
    if (profile.frame !== undefined && String(profile.frame ?? '').trim() !== String(value.frame ?? '').trim()) return 'frame';
    if (profile.premiumActive !== value.isPremium) return 'premium';
    if (profile.vipActive !== value.isVip) return 'vip';
  }
  const localStreak = snapshot.progress?.streak;
  if (typeof localStreak === 'number' && localStreak !== (value.streak ?? 0)) return 'streak';
  return null;
}

async function fetchMyProfile() {
  const myUid = await ensureAnonUser().catch((e: unknown) => {
    console.warn('[FRIENDS] my profile: anon user failed', e instanceof Error ? e.message.slice(0, 80) : String(e).slice(0, 80)); // guard-ok: причина раннего выхода
    return null;
  });
  if (!myUid) return null;
  const cached = myProfileCache.get(myUid);
  // зачем (Ревизор 3.15, aac7e1014): кэш хранит имя, аватар, рамку, серию, Plus — и должен сбрасываться, как только
  // свой профиль поменялся на этом телефоне (ник, покупка Plus, смена аватара/рамки, занятие → серия). Один признак
  // «мой профиль изменился» — расхождение кэша со снимком приложения, который все эти места уже обновляют.
  const staleField = cached?.value ? myProfileCacheStaleField(cached.value) : null;
  if (cached && !staleField && Date.now() - cached.at < MY_PROFILE_TTL_MS) {
    console.log('[FRIEND-ADD]', JSON.stringify({ step: 'my_profile', source: 'memory_cache', ageMs: Date.now() - cached.at })); // guard-ok: без имён
    return cached.value;
  }
  if (staleField) console.log('[FRIEND-ADD]', JSON.stringify({ step: 'my_profile', source: 'cache_stale', field: staleField })); // guard-ok: только имя поля
  const value = await fetchMyProfileFromFirestore(myUid);
  if (value) myProfileCache.set(myUid, { at: Date.now(), value });
  console.log('[FRIEND-ADD]', JSON.stringify({ step: 'my_profile', source: 'server', found: Boolean(value) })); // guard-ok: без имён
  return value;
}

async function fetchMyProfileFromFirestore(myUid: string) {
  try {
    const db = getDb();
    if (!db) return null;
    const snap = await db.collection('users').doc(myUid).get();
    if (!snap.exists) return null;
    const d: Record<string, unknown> = snap.data() ?? {};
    const p = (d.progress as Record<string, unknown>) ?? {};
    const streak = parseInt((p.streak_count as string) ?? '0') || 0;
    const isPremium = isPremiumProgressActive(p);
    const isVip = isVipProgressActive(p);
    const avatarRaw = typeof p.user_avatar === 'string' ? p.user_avatar.trim() : '';
    const frameRaw = typeof p.user_avatar_frame === 'string'
      ? p.user_avatar_frame.trim()
      : (typeof p.user_frame === 'string' ? p.user_frame.trim() : '');
    return {
      name: (p.user_name as string) || (d.name as string) || '?',
      avatar: avatarRaw || '1',
      frame: frameRaw,
      streak: streak ?? null,
      isPremium,
      isVip,
    };
  } catch (e) {
    console.warn('[FRIENDS] my profile read failed:', e instanceof Error ? e.message.slice(0, 80) : String(e).slice(0, 80)); // guard-ok: немой catch закрыт (аудит 17.10)
    return null;
  }
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
  // зачем (PM-033-A1): «Уменьшить движение» — без вечного пульса.
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (active && runtimeActive && !reducedMotion) {
      opacity.value = withRepeat(withTiming(0.6, { duration: 900 }), -1, true);
    } else {
      opacity.value = withTiming(1, { duration: 150 });
    }
  }, [active, runtimeActive, reducedMotion, opacity]);
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
};

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
  isAdding, addFeedback, addFeedbackTone, onSearch, onAddFound, onCloseFoundUser,
  lang, onShareCode,
}: {
  visible: boolean; onClose: () => void;
  codeInput: string; setCodeInput: (v: string) => void;
  isSearching: boolean; foundUser: FriendProfile | null; searchError: string | null;
  isAdding: boolean; addFeedback: string | null; addFeedbackTone: 'success' | 'error' | 'pending';
  onSearch: () => void; onAddFound: () => void; onCloseFoundUser: () => void;
  lang: string;
  /** «Поделиться своим кодом» (community.html find); null — реферальный вход скрыт, кнопки нет. */
  onShareCode: (() => void) | null;
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
  const { glass, textScale } = useFriendsGlass();
  const searchReady = isFriendSearchReady(codeInput);
  const codeMode = isFriendCodeQuery(codeInput);
  // Юзер открыл шит «добавить друга» именно чтобы ввести имя — открываем
  // клавиатуру сами. Задержка ждёт выезд шторки (380мс): без неё фокус на
  // iOS теряется и клавиатура не поднимается.
  const searchInputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (!visible) return;
    // зачем: шторка выезжает 440 мс — фокус после выезда, иначе на iOS клавиатура не поднимается.
    const id = setTimeout(() => searchInputRef.current?.focus(), 460);
    return () => clearTimeout(id);
  }, [visible]);
  // зачем (Сверка community-007, community.html find 04.10): подпись «Имя или код» — поиск по коду уже есть (isFriendCodeQuery).
  const inputLabel = L('Имя или код', 'Імʼя або код', 'Name or code', 'Nombre o código', 'Nome ou código', 'Tên hoặc mã', 'Nama atau kode', 'Ad veya kod', 'Imię lub kod');
  const subtitle = L('Найди по имени или коду', 'Знайди за імʼям або кодом', 'Find by name or code', 'Busca por nombre o código', 'Encontre por nome ou código', 'Tìm theo tên hoặc mã', 'Cari dengan nama atau kode', 'Ad veya kodla bul', 'Znajdź po imieniu lub kodzie');
  const shareLabel = L('Поделиться своим кодом', 'Поділитися своїм кодом', 'Share your code', 'Compartir tu código', 'Compartilhar seu código', 'Chia sẻ mã của bạn', 'Bagikan kodemu', 'Kodunu paylaş', 'Udostępnij swój kod');
  // зачем: владелец (2026-07-26) уходил от нижнего шита, потому что тот рос паддингом под клавиатурой и «ездил».
  // Макет 04.10 снова шторка — FriendsAddSheetShell фиксированной высоты, над клавиатурой поднимается целиком
  // (координатор 05.10; лог [FRIEND-ADD-SHEET]).
  // зачем (владелец 2026-09-29): содержимое окна 1 в 1 по макету community.html#COM-04-FIND…ERROR —
  // подпись поля, поле 54 с кнопкой поиска 54, скелетон, карточка найденного, строка результата.
  return (
    // зачем (координатор 05.10, макет 04.10): нижняя шторка вместо окна по центру; над клавиатурой поднимается целиком.
    <FriendsAddSheetShell
      visible={visible}
      onClose={onClose}
      testID="friends-add-sheet"
      subtitle={subtitle}
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
              <Text style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.7 }}>
                {inputLabel}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* зачем («Тень» 12.10): `.field` — плашка с тенью, без кромки; тень на обёртке (у TextInput boxShadow не типизирован) */}
                <View style={{ flex: 1, backgroundColor: glass.plateFillFrom, borderRadius: 14, boxShadow: plateBoxShadow(glass) }}>
                <TextInput
                  ref={searchInputRef}
                  testID="friends-code-input"
                  accessibilityLabel={inputLabel}
                  style={{
                    minHeight: 54,
                    paddingHorizontal: 14, paddingVertical: 12,
                    fontSize: 16 * textScale, fontWeight: '400', color: glass.text,
                    letterSpacing: codeMode ? 4 : 0,
                  }}
                  placeholder=""
                  placeholderTextColor={glass.mutedText}
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
                </View>
                <FriendsRoundButton
                  glass={glass}
                  testID="friends-search"
                  icon={isSearching ? 'hourglass-outline' : 'search'}
                  onPress={onSearch}
                  disabled={!searchReady || isSearching}
                  size={54}
                  label={L('Найти друга по имени', 'Знайти друга за імʼям', 'Search for a friend by name', 'Buscar amigo por nombre', 'Encontrar amigo por nome', 'Tìm bạn theo tên', 'Cari teman dengan nama', 'Adıyla arkadaş bul', 'Znajdź znajomego po imieniu')}
                />
              </View>
            </View>

            {searchError && (
              <FriendsFeedbackRow testID="friends-search-error" tone="error" text={searchError} textScale={textScale} />
            )}

            {/* Скелетон-shimmer на время поиска (opacity loop, UI-анимация). */}
            {isSearching && !foundUser && (
              // зачем (координатор 18.10, «первый кадр = геометрия готового экрана»): заглушка той же высоты, что карточка найденного
              // (FriendsFoundCard: поля 14 + монета 48 + шаг 14 + кнопка 48 + поля 14 = 138, сверху 2) — было 92, скачок ~46 dp.
              <View testID="friends-search-skeleton" onLayout={(event) => noteSkeletonGeom('friends_search', 'skeleton', event.nativeEvent.layout.height + 2)} style={{ marginTop: 2 }}>
                <PulseOn active>
                  <View style={{ height: 138, borderRadius: 14, backgroundColor: glass.opaqueControl, width: '100%' }} />
                </PulseOn>
              </View>
            )}

            {foundUser && (
              <Reanimated.View entering={FadeInDown.duration(280)}>
                <FriendsFoundCard
                  profile={foundUser} onAdd={onAddFound} onClose={onCloseFoundUser}
                  isAdding={isAdding}
                />
              </Reanimated.View>
            )}

            {addFeedback && (
              <FriendsFeedbackRow testID="friends-add-feedback" tone={addFeedbackTone} text={addFeedback} textScale={textScale} />
            )}

            {onShareCode ? (
              // `.cta.gh` «Поделиться своим кодом» — то же приглашение по коду («один код», решение 25.07).
              <Pressable
                testID="friends-share-code"
                accessibilityRole="button"
                accessibilityLabel={shareLabel}
                onPress={onShareCode}
                style={({ pressed }) => ({
                  minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
                  // зачем («Тень» 12.10): контурная кнопка `.cta.gh` стала плашкой с тенью
                  backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass), opacity: pressed ? 0.72 : 1, marginTop: 0,
                })}
              >
                <Text style={{ color: glass.text, fontSize: 16 * textScale, fontWeight: '700' }}>{shareLabel}</Text>
              </Pressable>
            ) : null}
      </View>
    </FriendsAddSheetShell>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

// зачем (community-010): страховочный потолок состояния «Отправляем заявку…» — больше таймаута отправки заявки (15 с), чтобы результат успел заменить его
const FRIEND_FEEDBACK_PENDING_CEILING_MS = 20_000;

export default function FriendsTabScreen() {
  const tabContentBottomPad = useTabContentBottomPad();
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const socialParams = useLocalSearchParams<{ focusFriend?: string; socialEventId?: string }>();
  const { runtimeOwnerId } = useTabNav();
  const focusTick = useTabFocusTick(); // зачем (каскад [TABS-RENDER]): focusTick — свой контекст, см. app/TabContext.tsx
  const friendsTabVisible = runtimeOwnerId === 'friends';
  const friendsRuntimeActive = useRuntimeActive(friendsTabVisible);

  // ── «Вместе» (friends_together) — состояние UI-слоя, целиком за флагом ─────
  const friendsTogetherPolicy = useFriendsTogetherEnabled();
  // Диск и память прогреваются ниже только после определения текущего stable uid;
  // не рисуем модульный снапшот вслепую при смене аккаунта.
  const [togetherSnapshot, setTogetherSnapshot] = useState<FriendsTogetherSnapshot | null>(null);
  const [togetherSheetSession, setTogetherSheetSession] = useState<FriendSheetSession<FriendProfile> | null>(null);
  const [friendEvents, setFriendEvents] = useState<FriendSocialEvent[]>([]);
  const [friendMarkerClockMs, setFriendMarkerClockMs] = useState(Date.now());
  const [studyInvite, setStudyInvite] = useState<{ event: FriendSocialEvent; friendName: string; friendCoinRank: number | null } | null>(null);

  const [optimisticNudgedUids, setOptimisticNudgedUids] = useState<Set<string>>(() => new Set());
  const [nudgedTick, setNudgedTick] = useState(0);

  // DEV-only: боты «Вместе» — сквозная ручная проверка без реальных друзей и без
  // единого чтения/записи Firestore (owner, 2026-08-17). Полностью выпадает из
  // сборки для не-__DEV__: и sheet, и state отсекаются условием ниже.
  const [devBotsSheetOpen, setDevBotsSheetOpen] = useState(false);
  const [devBotsState, setDevBotsState] = useState<DevBotsState>({ bots: [] });
  const devBots = devBotsState.bots;
  // «Вместе» отключён в текущем релизном контуре.
  const friendsTogetherUiEnabled = false;
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
    let unsubFreshRequests: (() => void) | null = null;
    let socialRefreshStarted = false;
    const refreshAfterSocialEvent = (reason: string) => {
      if (cancelled || socialRefreshStarted) return;
      socialRefreshStarted = true;
      invalidateFriendsSocialReadCaches(reason);
      friendsAccountStore.retry();
      unsubFreshRequests = subscribeToIncomingRequests(
        (data) => {
          if (cancelled) return;
          setRequests(pendingFriendOpsRef.current.filterRequests(data, Date.now()));
        },
        (error) => console.warn('[FRIENDS] fresh requests after friend event failed', { message: error?.message?.slice(0, 80) }), // guard-ok: причина
      );
    };
    void readCachedUserNotifications().then((rows) => {
      apply(rows);
      if (cancelled) return;
      // зачем (Ревизор к 17e26d73c): проба общая с Главной и колокольчиком — если заявку уже подтянули они, проба здесь
      // вернёт ttl_skip/network_same и кэш друзей (30 мин) не сбросится. Сравниваем без чтений: событие дружбы в кэше
      // уведомлений новее загрузки кэшей друзей/заявок → сброс и перечитка, как в сетевой ветке.
      const verdict = decideFriendsCacheAgainstCachedSocialEvent(rows);
      console.log('[READ-TTL]', JSON.stringify({ area: 'friends_focus', ...verdict })); // guard-ok: времена и решение, без uid
      if (verdict.decision === 'invalidate') refreshAfterSocialEvent('cached_notification_friend_event');
    });
    // зачем (владелец 21.10, №45; Ревизор п.1–2): вместо полного списка уведомлений (до 20) на каждом заходе — проба
    // «последнее уведомление» (1 чтение, не чаще раза в минуту). Новое уведомление о заявке или принятии → кэш друзей и
    // заявок (30 мин) сбрасывается и перечитывается сразу: правило 17.10 «друзья мгновенно» держится без чтений каждые 30 с.
    void probeUserNotificationsHead('friends_focus').then((fresh) => {
      if (cancelled) return;
      if (!fresh) {
        console.log('[READ-TTL]', JSON.stringify({ area: 'friends_notifications', source: 'cache', reason: 'probe_no_newer_or_ttl' })); // guard-ok: ветка решения
        return;
      }
      apply(fresh);
      const socialNews = fresh.some((row) => row.type === 'friend_request' || row.type === 'friend_accepted');
      console.log('[READ-TTL]', JSON.stringify({ area: 'friends_notifications', source: 'network', socialNews, rows: fresh.length })); // guard-ok: ветка решения
      if (!socialNews) return;
      refreshAfterSocialEvent('notification_friend_event');
    });
    return () => {
      cancelled = true;
      unsubFreshRequests?.();
    };
  }, [focusTick, friendsRuntimeActive]);
  useEffect(() => {
    if (!ENABLE_DEV_TOOLS) return;
    void loadDevBots().then(setDevBotsState);
  }, []);

  useEffect(() => {
    if (!friendsTogetherUiEnabled) return;
    void primeFriendsTogetherSnapshot().then((snap) => { if (snap) setTogetherSnapshot(snap); });
    void primeNudgedTodayCache().then(() => setNudgedTick((n) => n + 1));
  }, [friendsTogetherUiEnabled]);


  // зачем (Q6, координатор 01.10, D09/D78): окно «уровень дружбы вырос» с пустой
  // фанфарой сундука удалено целиком; уровни дружбы остаются как данные.
  const [myProfile, setMyProfile] = useState<{
    name: string; avatar: string; frame: string; aura?: string; streak: number | null;
  } | null>(null);


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
  const handleDevIncomingNudge = useCallback(async (uid: string) => {
    const s = await simulateIncomingNudge(uid);
    setDevBotsState(s);
  }, []);
  const handleDevNudge = useCallback(async (uid: string) => {
    const s = await nudgeDevBot(uid);
    setDevBotsState(s);
  }, []);
  const handleDevReset = useCallback(async () => {
    const s = await resetDevBots();
    setDevBotsState(s);
  }, []);

  const NUDGE_ERROR_TEXT: Record<NudgeErrorReason, { ru: string; uk: string; en?: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string }> = {
    disabled: { ru: 'Друг отключил зовы', uk: 'Друг вимкнув кличі', es: 'Tu amigo desactivó las llamadas', en: 'Your friend turned off calls', ptBr: 'Seu amigo desativou os chamados', vi: 'Bạn đã tắt lời gọi', id: 'Teman menonaktifkan panggilan', tr: 'Arkadaşın çağrıları kapattı', pl: 'Znajomy wyłączył wołania' },
    quiet_hours: { ru: 'У друга тихие часы', uk: 'У друга тихі години', es: 'Tu amigo está en horas de silencio', en: 'Your friend is in quiet hours', ptBr: 'Seu amigo está no horário silencioso', vi: 'Bạn đang trong giờ yên tĩnh', id: 'Teman sedang jam tenang', tr: 'Arkadaşının sessiz saatleri', pl: 'Znajomy ma ciche godziny' },
    daily_limit: { ru: 'Сегодня уже звал', uk: 'Сьогодні вже кликав', es: 'Ya llamaste hoy', en: 'You already called today', ptBr: 'Você já chamou hoje', vi: 'Hôm nay đã gọi rồi', id: 'Sudah memanggil hari ini', tr: 'Bugün zaten çağırdın', pl: 'Dziś już wołałeś' },
    sender_limit: { ru: 'Сегодня уже звал', uk: 'Сьогодні вже кликав', es: 'Ya llamaste hoy', en: 'You already called today', ptBr: 'Você já chamou hoje', vi: 'Hôm nay đã gọi rồi', id: 'Sudah memanggil hari ini', tr: 'Bugün zaten çağırdın', pl: 'Dziś już wołałeś' },
    receiver_limit: { ru: 'Друг уже получил максимум зовов на сегодня. Попробуй завтра.', uk: 'Друг уже отримав максимум закликів на сьогодні. Спробуй завтра.', es: 'Tu amigo alcanzó el límite de llamadas de hoy. Prueba mañana.', en: 'Your friend has reached today\'s call limit. Try tomorrow.', ptBr: 'Seu amigo atingiu o limite de chamados de hoje. Tente amanhã.', vi: 'Bạn của bạn đã nhận đủ lời gọi hôm nay. Thử lại ngày mai nhé.', id: 'Temanmu sudah mencapai batas panggilan hari ini. Coba besok.', tr: 'Arkadaşın bugünkü çağrı sınırına ulaştı. Yarın tekrar dene.', pl: 'Znajomy osiągnął dzisiejszy limit wołań. Spróbuj jutro.' },
    not_friends: { ru: 'Зов доступен только друзьям. Проверь список друзей.', uk: 'Заклик доступний лише друзям. Перевір список друзів.', es: 'Solo puedes llamar a amigos. Revisa tu lista de amigos.', en: 'You can only call friends. Check your friends list.', ptBr: 'Você só pode chamar amigos. Confira sua lista de amigos.', vi: 'Chỉ có thể gọi bạn bè. Hãy kiểm tra danh sách bạn bè.', id: 'Panggilan hanya tersedia untuk teman. Periksa daftar temanmu.', tr: 'Yalnızca arkadaşlarını çağırabilirsin. Arkadaş listeni kontrol et.', pl: 'Możesz wołać tylko znajomych. Sprawdź listę znajomych.' },
    network: { ru: 'Нет сети — попробуй ещё раз', uk: 'Немає мережі — спробуй ще раз', es: 'Sin conexión — inténtalo de nuevo', en: 'No connection — try again', ptBr: 'Sem conexão — tente novamente', vi: 'Không có mạng — thử lại nhé', id: 'Tidak ada jaringan — coba lagi', tr: 'Bağlantı yok — tekrar dene', pl: 'Brak sieci — spróbuj ponownie' },
  };

  // зачем (координатор 18.10, аудит Optimistic UI Сообщества, (в)): nudgeFriend на повторный тап, пока первый в полёте, отвечает
  // reason 'network' — экран показывал ложное «Нет сети» и снимал оптимистичную отметку, хотя первый зов ещё шёл. Повтор глушим здесь.
  const nudgeInFlightRef = useRef<Set<string>>(new Set());
  const handleNudgeFriend = useCallback(async (friendUid: string, friendName: string) => {
    if (nudgeInFlightRef.current.has(friendUid)) {
      console.log(`[NUDGE] tap → skipped in_flight friend=${friendUid}`); // guard-ok: ранний выход называет причину
      return;
    }
    nudgeInFlightRef.current.add(friendUid);
    setOptimisticNudgedUids((current) => new Set(current).add(friendUid));
    let result: Awaited<ReturnType<typeof nudgeFriend>>;
    try {
      result = await nudgeFriend(friendUid);
    } finally {
      nudgeInFlightRef.current.delete(friendUid);
    }
    setNudgedTick((n) => n + 1);
    if (!result.ok) {
      console.warn(`[NUDGE] tap → failed friend=${friendUid} reason=${result.reason} markedToday=${isNudgedToday(friendUid)}`); // guard-ok: сбой зова, один раз на тап
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
        messageRu: texts.ru, messageUk: texts.uk, messageEn: texts.en, messageEs: texts.es, messagePtBr: texts.ptBr,
        messageVi: texts.vi, messageId: texts.id, messageTr: texts.tr, messagePl: texts.pl,
      });
      return;
    }
    emitAppEvent('action_toast', {
      type: 'success',
      messageRu: `Позвал ${friendName}`,
      messageUk: `Покликав ${friendName}`,
      messageEn: `You called ${friendName}`,
      messageEs: `Llamaste a ${friendName}`,
      messagePtBr: `Você chamou ${friendName}`,
      messageVi: `Đã gọi ${friendName}`,
      messageId: `Memanggil ${friendName}`,
      messageTr: `${friendName} çağrıldı`,
      messagePl: `Zawołano ${friendName}`,
    });
  }, []);

  const topFadeScroll = useTopFadeScroll();
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const handleFriendsScroll = useCallback((e: any) => {
    topFadeScroll?.onScroll?.(e);
    onBouncyScroll(e);
  }, [onBouncyScroll, topFadeScroll]);
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const { glass, textScale } = useFriendsGlass();
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
    } catch (e) {
      // нет auth_links / сети — добьём ретраем ниже (useEffect)
      DebugLogger.error('friends:rc', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
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
    } catch (e) {
      // нет данных — пропускаем
      DebugLogger.error('friends:show', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
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
      const share = await buildCloudReferralInviteShare({ lang, userName: name }).catch(noteSwallowedAs('friends:useCallback.buildCloudReferralInviteShare', null));
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
  const [addFeedbackTone, setAddFeedbackTone] = useState<'success' | 'error' | 'pending'>('success');

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const friendsSnapshot = useAppSnapshotSelector((snapshot) => snapshot.friends);
  const warmFriendsSnapshot = peekFriendsTabSwrWarm();
  const [friends, setFriends] = useState<FriendEntry[]>(() => warmFriendsSnapshot?.friends ?? friendsSnapshot?.friends ?? []);
  // зачем (макет COM-04-OFFLINE): подписка на список упала — показать «Связь пропала · Повторить».
  const [friendsListError, setFriendsListError] = useState(false);
  // зачем (правило владельца 18.10 «экранов-ошибок нигде»): кнопки «Повторить» больше нет — подписка на список друзей
  // перечитывается тихо (паузы useLoadGate, затем при возврате в приложение); успех подписки сам снимает friendsListError.
  useLoadGate({
    id: 'friends_list',
    status: friendsListError ? 'error' : 'ready',
    retry: () => { friendsAccountStore.retry(); },
    enabled: friendsRuntimeActive && friendsListError,
  });
  const [requests, setRequests] = useState<FriendRequestEntry[]>(() => warmFriendsSnapshot?.requests ?? friendsSnapshot?.requests ?? []);
  // Live friend/request subscriptions may publish equivalent arrays with new
  // identities. Profile hydration follows UID membership so those emissions do
  // not restart the async load and clone profile state in a render loop.
  const profileMembershipKey = useMemo(
    () => JSON.stringify([...new Set([
      ...friends.map(friend => friend.uid),
      ...requests.map(request => request.fromUid),
    ])].sort()),
    [friends, requests],
  );
  const friendMembershipKey = useMemo(
    () => JSON.stringify([...new Set(friends.map(friend => friend.uid))].sort()),
    [friends],
  );
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
  const [profileDismissPending, setProfileDismissPending] = useState(false);
  // The card can open before the batch resolves. Keep its public rank and other
  // profile fields live without issuing another read or requiring a reopen.
  const selectedPlayerProfile = useMemo(() => {
    if (!selectedPlayer) return null;
    const uid = selectedPlayer.friendUid ?? selectedPlayer.uid;
    if (!uid || !profiles[uid]) return selectedPlayer;
    const profile = profileWithLookupDisplayName(uid, profiles[uid] ?? null, selectedPlayer.name);
    return profile ? { ...selectedPlayer, ...profile } : selectedPlayer;
  }, [profiles, selectedPlayer]);
  const [deleteTarget, setDeleteTarget] = useState<{ uid: string; name: string } | null>(null);
  // зачем (Q41/Q48/Q49, координатор 01.10): блокировка из шторки друга, заодно удаляет из друзей.
  const [blockTarget, setBlockTarget] = useState<{ uid: string; name: string } | null>(null);
  const [pendingTogetherSheetAction, setPendingTogetherSheetAction] = useState<FriendSheetPendingAction<FriendProfile> | null>(null);

  /** Анти-клин iOS: одновременный present двух <Modal> глушит тачи всего экрана («мёртвый экран»
   *  при серии быстрых тапов по карточке). Пока открыта/открывается одна модалка — вторую не пускаем. */
  const modalWedgeGuardRef = useRef(false);

  const mountedRef = useRef(true);
  /** Был непустой список в SWR-кеше для текущего uid — блокируем пустой локальный onSnapshot Firestore. */
  const swrHadFriendsRef = useRef(false);
  // зачем (аудит Optimistic UI, 12.10): заявки «в пути» — снимки подписок не возвращают принятую/отклонённую заявку и не
  // убирают только что добавленного друга, пока сервер не ответил (см. app/friends_pending_ops.ts).
  const pendingFriendOpsRef = useRef(createPendingFriendOps<FriendEntry, FriendRequestEntry>());
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
    const cancelled = { current: false };
    void startFriendsTabSwrPrime();
    // Рефералка — после первого кадра списка, не залпом с подписками.
    const task = InteractionManager.runAfterInteractions(() => {
      const force = referralRefreshDirtyRef.current;
      referralRefreshDirtyRef.current = false;
      void refreshReferralState({ force });
    });
    return () => { cancelled.current = true; task.cancel(); };
  }, [friendsRuntimeActive, focusTick, refreshReferralState]);

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
    }).catch(noteSwallowedHandler('friends:useEffect.getReferralCode'));
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
      // зачем (координатор 12.10, community-006, dev `friends=demo`): робот не входит во второй аккаунт — вкладка показывает одну входящую заявку и одного друга ТОЛЬКО из памяти:
      // без подписок Firestore, без записи кэша вкладки (см. эффекты ниже). В сторе isDevFriendsDemoOn() всегда false.
      // зачем (Авторизация 12.10, съёмка R1 community-021): «Связь пропала» вкладки без подписок Firestore — список пуст, плашка ошибки. В сторе выключено.
      if (isDevFriendsFail('list')) {
        console.warn('[DEV-STATE] friends: список не обновился (dev_friends_fail=list) — подписок нет, пустое состояние с ошибкой'); // guard-ok: dev-ветка
        setFriends([]);
        setRequests([]);
        setFriendsListError(true);
        return;
      }
      if (isDevFriendsDemoOn()) {
        const demo = devFriendsDemoData();
        console.log(`[DEV-STATE] friends: вкладка рисует демо requests=${demo.requests.length} friends=${demo.friends.length} (подписок нет)`); // guard-ok: ветка решает значение
        setFriends(demo.friends.map((f) => ({ uid: f.uid, createdAt: f.createdAt, displayName: f.displayName })));
        setRequests(demo.requests.map((r) => ({ fromUid: r.fromUid, fromName: r.fromName, status: r.status, createdAt: r.createdAt })));
        return;
      }
      // зачем (владелец 17.10 «друзья должны находиться мгновенно», логи до починки): когда вкладка запускает чтения.
      logFriendAdd('tab_active', { runtimeActive: friendsRuntimeActive });
      await startFriendsTabSwrPrime();
      if (cancelled) return;

      let canonical: string | null = null;
      try {
        canonical = await getCanonicalUserId();
      } catch (e) {
        logFriendAdd('tab_active', { step: 'canonical_failed', code: String((e as { code?: unknown })?.code ?? (e instanceof Error ? e.message : 'unknown')).slice(0, 60) });
        canonical = null;
      }
      if (cancelled) return;
      logFriendAdd('tab_reads_start', { me: friendTag(canonical), warmFor: friendTag(peekFriendsTabSwrWarm()?.canonicalUid ?? null) });

      // После prime модульный кеш уже заполнен — не читаем диск снова (async лишний раунд).
      const profilesCache = peekProfilesCache();
      profilesCacheRef.current = { ...profilesCache };

      const w = peekFriendsTabSwrWarm();

      if (canonical && w && w.canonicalUid === canonical) {
        swrHadFriendsRef.current = w.friends.length > 0;
        setFriends(w.friends);
        if (w.friends.length > 0) {
          void checkAchievements({ type: 'friend_added', totalFriends: w.friends.length }).catch(noteSwallowedHandler('friends:useEffect.checkAchievements'));
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
        setFriendsListError(false);
        const fromCache = meta?.fromCache === true;
        if (data.length === 0 && fromCache && swrHadFriendsRef.current) return;
        const mergedFriends = pendingFriendOpsRef.current.mergeFriends(data, Date.now());
        if (mergedFriends.length !== data.length) {
          console.log(`[FRIEND-REQUEST] снимок друзей: из сервера ${data.length}, добавлено «в пути» ${mergedFriends.length - data.length}`); // guard-ok: ветка решает значение
        }
        setFriends(mergedFriends);
        if (data.length > 0) {
          void checkAchievements({ type: 'friend_added', totalFriends: data.length }).catch(noteSwallowedHandler('friends:useEffect.checkAchievements_2'));
        }
      }, (error) => {
        if (cancelled) return;
        console.warn('[FRIENDS-LIST] screen got subscription error', { message: error?.message });
        setFriendsListError(true);
      });

      unsubRequests = subscribeToIncomingRequests(
        data => {
          if (cancelled) return;
          const visible = pendingFriendOpsRef.current.filterRequests(data, Date.now());
          if (visible.length !== data.length) {
            console.log(`[FRIEND-REQUEST] снимок заявок: из сервера ${data.length}, скрыто «в пути» ${data.length - visible.length}`); // guard-ok: ветка решает значение
          }
          setRequests(visible);
        },
        (error) => {
          // Заявки не прочитались — экран держит прежний список (кэш); причину пишем (немой обработчик закрыт, аудит 17.10).
          console.warn('[FRIENDS] incoming requests read failed', { message: error?.message?.slice(0, 80) });
        },
      );
    })();

    return () => {
      cancelled = true;
      unsubFriends();
      unsubRequests();
    };
  }, [friendsRuntimeActive]);

  useEffect(() => {
    if (isDevFriendsDemoOn()) return undefined; // зачем: демо-данные не пишем в кэш вкладки (диск)
    if (isDevFriendsFail('list')) return undefined; // зачем (Авторизация 12.10, community-021): пустой список подмены не пишем в кэш вкладки — иначе затрём настоящий список
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
        } catch (e) {
      // ignore
      DebugLogger.error('friends:uid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      })();
    }, 450);
    return () => clearTimeout(timer);
  }, [friends, requests]);

  // ── Profile loading ────────────────────────────────────────────────────────

  useEffect(() => {
    const uids = JSON.parse(profileMembershipKey) as string[];
    if (!friendsRuntimeActive || uids.length === 0) return;
    if (isDevFriendsDemoOn()) return; // зачем: демо-друзья вымышленные — профили из Firestore не читаем
    if (isDevFriendsFail('list')) return; // зачем (Авторизация 12.10, community-021): при подмене `list` друзей нет — профили из Firestore не читаем
    let cancelled = false;
    void (async () => {
      // profilesCacheRef.current уже загружен с диска при монтировании — не читаем снова
      const { fresh, updatedCache } = await loadProfiles(uids, profilesCacheRef.current);
      if (cancelled) return;
      profilesCacheRef.current = updatedCache;
      setProfiles(prev => {
        if (Object.entries(fresh).every(([uid, profile]) => prev[uid] === profile)) return prev;
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
            const friendUids = JSON.parse(friendMembershipKey) as string[];
            if (friendUids.length === 0) return;
            const batchMap = await fetchFriendProfilesBatch(friendUids);
            if (cancelled) return;
            const records = friendUids
              .map((uid) => batchMap[uid])
              .filter((r): r is FriendProfileBatchRecord => !!r);
            await refreshFriendsTogether(records);
            if (cancelled) return;
            setTogetherSnapshot(getFriendsTogetherSnapshot());
          } catch (e) {
      // best-effort — снапшот остаётся прежним/пустым
      DebugLogger.error('friends:records', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        })();
      }
    })();
    return () => { cancelled = true; };
  }, [friendMembershipKey, friendsRuntimeActive, friendsTogetherPolicy.enabled, profileMembershipKey]);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  // зачем: ошибки (сеть, откат принятия/блока/удаления) шли тем же рядом, что и успех, и рисовались зелёным
  // тоном успеха; тон теперь передаётся вместе с текстом (владелец/координатор 03:15).
  const showFeedback = useCallback((msg: string, tone: 'success' | 'error' | 'pending' = 'success') => {
    setAddFeedbackTone(tone);
    setAddFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    // зачем (community-010, «Отправляем заявку…»): ожидание держится, пока не пришёл результат (его покажет следующий showFeedback); страховочный потолок — на случай, если ответ так и не придёт.
    feedbackTimerRef.current = setTimeout(() => setAddFeedback(null), tone === 'pending' ? FRIEND_FEEDBACK_PENDING_CEILING_MS : 2500);
  }, []);

  const handleSearch = useCallback(async () => {
    const query = getFriendSearchQuery(codeInput);
    // зачем (R55, «первый тап по лупе не срабатывает» при открытой клавиатуре): сперва логи — видно, дошёл ли тап до поиска
    // и почему вышли. Сам запрос не печатаем (ник — персональные данные), только длину и тип.
    const searchTrace = { queryLength: query.length, ready: isFriendSearchReady(query), isSearching, isCode: isFriendCodeQuery(query), keyboardVisible: Keyboard.isVisible() };
    if (__DEV__) console.log('[FRIEND-SEARCH] tap', JSON.stringify(searchTrace));
    if (!searchTrace.ready || isSearching) {
      console.warn('[FRIEND-SEARCH] skip', JSON.stringify({ reason: isSearching ? 'already_searching' : 'query_not_ready', ...searchTrace }));
      return;
    }
    hapticTap();
    Keyboard.dismiss();
    setIsSearching(true);
    setFoundUser(null);
    setSearchError(null);
    try {
      const isCode = isFriendCodeQuery(query);
      // зачем (R55 п.3, координатор 15.10): 6 знаков A–Z0–9 вне алфавита кода (0/O/1/I) кодом быть не могут — поиск по имени, без блокировки.
      if (__DEV__ && !isCode && /^[A-Z0-9]{6}$/i.test(query)) console.log('[FRIEND-SEARCH] reason=code_like_out_of_alphabet → name_search', JSON.stringify({ queryLength: query.length }));
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
      // зачем (координатор 12.10, R1 «нет пути», друзья): dev `dev_friends_fail=search` — «Сейчас не получилось» (не транзиентный отказ); служебный код DEVUNSYNCED — «профиль найден, но не синхронизирован» без сервера; в стор-сборке геттеры выключены.
      if (isDevFriendsFail('search')) throw new Error('dev_friends_search_failed');
      // зачем (Авторизация 12.10, съёмка R1 community-008/013/015): скелетон поиска живёт доли секунды, свой код робот не знает,
      // а «нет сети» на эмуляторе не включить. Ветки — до сети и до журнала сбоев (в catch пишется отчёт в Firestore). В сторе выключено.
      if (isDevFriendsHeld('search')) {
        console.warn('[DEV-STATE] friends: поиск держится в загрузке (dev_friends_hold=search), ответа не будет'); // guard-ok: dev-ветка
        await new Promise<never>(() => {});
      }
      if (isDevFriendsFail('search_offline')) {
        console.warn('[DEV-STATE] friends: поиск — «Связь пропала» (dev_friends_fail=search_offline), сеть не вызывалась'); // guard-ok: dev-ветка
        setSearchError(L('Связь пропала', 'Зв’язок зник', 'Connection lost', 'Se perdió la conexión', 'A conexão caiu', 'Mất kết nối', 'Koneksi terputus', 'Bağlantı kesildi', 'Brak połączenia')+'\n'+L('Проверь интернет и попробуй ещё раз.', 'Перевір інтернет і спробуй ще раз.', 'Check your connection and try again.', 'Revisa tu conexión e inténtalo de nuevo.', 'Verifique a internet e tente novamente.', 'Hãy kiểm tra mạng và thử lại.', 'Periksa internet lalu coba lagi.', 'İnternetinizi kontrol edip tekrar deneyin.', 'Sprawdź internet i spróbuj ponownie.'));
        return;
      }
      if (isCode && isDevSelfFriendCode(codeUpper)) {
        console.warn('[DEV-STATE] friends: поиск — свой код (DEVSLF), сеть не вызывалась'); // guard-ok: dev-ветка
        setSearchError(randomSelfFriendCodeMessage(L));
        return;
      }
      // зачем (координатор 12.10, съёмка R1 community-009/010/011/017…019): служебный код DEVFND — найденный профиль без сервера
      // и без входа; заявка такому другу дальше тоже не уходит в сеть (handleAddFound). В стор-сборке геттер выключен.
      if (isCode && isDevFoundFriendCode(codeUpper)) {
        console.warn('[DEV-STATE] friends: найден подставной друг (DEVFND) — без сервера'); // guard-ok: dev-ветка
        setFoundUser(placeholderFriendProfile(DEV_FOUND_FRIEND_UID, 'Алиса')); // i18n-ok: имя подставного друга dev-кода DEVFND, только dev-сборка
        return;
      }
      const devUnsynced = isCode && isDevUnsyncedFriendCode(codeUpper);
      const result = devUnsynced
        ? ({ uid: 'dev_unsynced_friend', name: '', source: 'friend_code' } as unknown as Awaited<ReturnType<typeof lookupUserByFriendCode>>)
        : isCode ? await lookupUserByFriendCode(codeUpper) : await lookupUserByNickname(query);
      lastLookupSourceRef.current = result?.source ?? null;
      if (!result) {
        await trackActivity('friends:search_result', {
          feature: 'friends',
          screen: 'friends',
          result: 'blocked',
          tags: { reason: 'not_found', queryLength: query.length, queryType: isCode ? 'code' : 'nickname' },
        });
        setSearchError(L('Пользователь не найден', 'Користувача не знайдено', 'User not found', 'Usuario no encontrado', 'Usuário não encontrado', 'Không tìm thấy người dùng', 'Pengguna tidak ditemukan', 'Kullanıcı bulunamadı', 'Nie znaleziono użytkownika')+'\n'+L('Проверь код или имя.', 'Перевір код або ім’я.', 'Check the code or name.', 'Revisa el código o el nombre.', 'Verifique o código ou o nome.', 'Hãy kiểm tra mã hoặc tên.', 'Periksa kode atau nama.', 'Kodu veya adı kontrol edin.', 'Sprawdź kod lub nazwę.'));
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
      const fetched = devUnsynced ? null : await fetchFriendProfileFromFirestore(result.uid);
      // Серверный профиль (из users.progress) — ПЕРВИЧНЫЙ источник имени/уровня/аватара.
      // Объединяем с leaderboard: серверный имеет приоритет (mergePublicFriendProfiles
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
          'Профиль пока не готов. Открой приложение на другом устройстве и попробуй снова.',
          'Профіль поки не готовий. Відкрий застосунок на іншому пристрої та спробуй ще раз.',
          'This profile isn’t ready yet. Open the app on the other device and try again.',
          'Este perfil aún no está listo. Abre la app en el otro dispositivo e inténtalo de nuevo.',
          'Este perfil ainda não está pronto. Abra o app no outro dispositivo e tente de novo.',
          'Hồ sơ này chưa sẵn sàng. Hãy mở ứng dụng trên thiết bị kia rồi thử lại.',
          'Profil ini belum siap. Buka aplikasi di perangkat lain lalu coba lagi.',
          'Bu profil henüz hazır değil. Uygulamayı diğer cihazda açıp tekrar dene.',
          'Ten profil nie jest jeszcze gotowy. Otwórz aplikację na drugim urządzeniu i spróbuj ponownie.',
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
      // зачем: транзиентный отказ сети ([firestore/unavailable], «no available instance»)
      // — это НЕ поломка приложения, и писать про неё «что-то пошло не так» значит
      // пугать человека и скрывать единственное полезное действие: повторить.
      // Признак берём из общего на проект списка, чтобы классификация не разъезжалась.
      const isTransient = isTransientFirestoreRead(e);
      const errCode = String((e as { code?: unknown })?.code ?? '');
      // guard-ok: лог в catch остаётся в проде намеренно (правило «логи в catch навсегда»),
      // срабатывает только при сбое поиска — не горячий путь, на плавность не влияет.
      console.warn('[FRIEND-SEARCH] handleSearch:failed', {
        transient: isTransient,
        code: errCode,
        message: e instanceof Error ? e.message : String(e),
        queryLength: codeInput.length,
      });
      void import('../app_health')
        .then(({ logAppWarning }) =>
          logAppWarning('friends:search_failed', e, {
            feature: 'friends',
            screen: 'friends',
            writeToFirestore: true,
            tags: { queryLength: codeInput.length, transient: isTransient, errorCode: errCode },
          }),
        )
        .catch(noteSwallowedHandler('friends:useCallback.call'));
      await trackActivity('friends:search_error', {
        feature: 'friends',
        screen: 'friends',
        result: 'error',
        tags: {
          queryLength: codeInput.length,
          transient: isTransient,
          error: e instanceof Error ? e.message : String(e),
        },
      });
      setSearchError(isTransient
        ? L('Связь пропала', 'Зв’язок зник', 'Connection lost', 'Se perdió la conexión', 'A conexão caiu', 'Mất kết nối', 'Koneksi terputus', 'Bağlantı kesildi', 'Brak połączenia')+'\n'+L('Проверь интернет и попробуй ещё раз.', 'Перевір інтернет і спробуй ще раз.', 'Check your connection and try again.', 'Revisa tu conexión e inténtalo de nuevo.', 'Verifique a internet e tente novamente.', 'Hãy kiểm tra mạng và thử lại.', 'Periksa internet lalu coba lagi.', 'İnternetinizi kontrol edip tekrar deneyin.', 'Sprawdź internet i spróbuj ponownie.')
        : L('Сейчас не получилось. Попробуй ещё раз', 'Зараз не вийшло. Спробуй ще раз', "Didn't work this time. Try again", 'Ahora no ha funcionado. Inténtalo de nuevo', 'Não deu certo agora. Tente de novo', 'Lúc này chưa được. Hãy thử lại', 'Belum berhasil. Coba lagi', 'Şu an olmadı. Tekrar dene', 'Teraz się nie udało. Spróbuj ponownie'));
    } finally {
      setIsSearching(false);
    }
  }, [L, codeInput, isSearching, myCode, profiles, friends, requests]); // eslint-disable-line react-hooks/exhaustive-deps

  // зачем: state isAdding обновляется после рендера — второй тап в том же кадре успевал
  // отправить заявку дважды; ref-замок меняется синхронно (Optimistic UI, защита от двойного тапа).
  const addRequestInFlightRef = useRef(false);
  const handleAddFound = useCallback(async () => {
    if (!foundUser || isAdding) return;
    if (addRequestInFlightRef.current) {
      console.warn('[FRIEND-REQUEST] add: уже в пути — повторный тап пропущен');
      return;
    }
    addRequestInFlightRef.current = true;
    const targetUser = foundUser;
    const previousCodeInput = codeInput;
    hapticTap();
    setIsAdding(true);
    setFoundUser(null);
    setCodeInput('');
    // зачем (решение владельца 12.10, п.81 (13), community-010): карточка найденного скрывается мгновенно (Optimistic UI), а вместо преждевременного «Заявка отправлена!» — честное «Отправляем заявку…»;
    // «Заявка отправлена!» появится, когда придёт результат (ветка 'sent' ниже). Ошибка вернёт карточку и покажет причину, как раньше.
    showFeedback(L('Отправляем заявку…', 'Надсилаємо заявку…', 'Sending request…', 'Enviando solicitud…', 'Enviando solicitação…', 'Đang gửi lời mời…', 'Mengirim permintaan…', 'İstek gönderiliyor…', 'Wysyłamy zaproszenie…'), 'pending');
    try {
      await trackActivity('friends:add_request_start', {
        feature: 'friends',
        screen: 'friends',
        result: 'start',
        tags: { targetUid: targetUser.uid },
      });
      // зачем (координатор 12.10, R1 «нет пути», друзья): dev `dev_friends_hold=add_request` держит «отправку заявки»; `dev_friends_fail=add` — отказ отправки (результат error); в стор-сборке геттеры выключены.
      const result: Awaited<ReturnType<typeof sendFriendRequest>> = isDevFriendsHeld('add_request')
        ? await new Promise<never>(() => undefined)
        : isDevFriendsFail('add') ? 'error'
          // зачем (бэклог №18, community-011/018/019): остальные исходы заявки для съёмки — тоже без сети; в стор-сборке геттер выключен.
          : isDevFriendsFail('add_network') ? 'network'
          : isDevFriendsFail('add_already_friends') ? 'already_friends'
          : isDevFriendsFail('add_already_sent') ? 'already_sent'
          // зачем (съёмка R1): подставному другу DEVFND заявка не уходит в сеть — сразу «отправлена».
          : isDevFoundFriendUid(targetUser.uid) ? 'sent'
          : await sendFriendRequest(targetUser.uid);
      await trackActivity('friends:add_request_result', {
        feature: 'friends',
        screen: 'friends',
        result: result === 'sent' ? 'success' : result === 'error' || result === 'network' ? 'error' : 'blocked',
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
          .catch((error: unknown) => { console.warn('[FRIEND-REQUEST] привязка реферального кода не удалась', error); });
      }
      if (result === 'sent') {
        setFoundUser(null);
        setCodeInput('');
        showFeedback(L('Заявка отправлена!', 'Заявку надіслано!', 'Request sent!', '¡Solicitud enviada!', 'Solicitação enviada!', 'Đã gửi lời mời!', 'Permintaan terkirim!', 'İstek gönderildi!', 'Zaproszenie wysłane!')+'\n'+L('Ответ появится в активных заявках.', 'Відповідь з’явиться в активних заявках.', 'The reply will appear in active requests.', 'La respuesta aparecerá en las solicitudes activas.', 'A resposta aparecerá nas solicitações ativas.', 'Phản hồi sẽ hiện trong lời mời đang hoạt động.', 'Balasan akan muncul di permintaan aktif.', 'Yanıt etkin isteklerde görünecek.', 'Odpowiedź pojawi się w aktywnych zaproszeniach.'));
      } else if (result === 'already_friends') {
        setFoundUser(null);
        showFeedback(L('Уже друзья', 'Уже друзі', 'Already friends', 'Ya son amigos', 'Vocês já são amigos', 'Hai bạn đã là bạn bè', 'Kalian sudah berteman', 'Zaten arkadaşsınız', 'Już jesteście znajomymi')+'\n'+L('Профиль уже есть в твоём списке.', 'Профіль уже є у твоєму списку.', 'The profile is already in your list.', 'El perfil ya está en tu lista.', 'O perfil já está na sua lista.', 'Hồ sơ đã có trong danh sách của bạn.', 'Profil sudah ada di daftarmu.', 'Profil zaten listende.', 'Profil jest już na Twojej liście.'));
      } else if (result === 'already_sent') {
        setFoundUser(null);
        showFeedback(L('Заявка уже отправлена', 'Заявку вже надіслано', 'Request already sent', 'Solicitud ya enviada', 'Solicitação já enviada', 'Lời mời đã được gửi', 'Permintaan sudah dikirim', 'İstek zaten gönderildi', 'Zaproszenie już wysłane')+'\n'+L('Она остаётся в ожидании ответа.', 'Вона чекає на відповідь.', 'It is still waiting for a reply.', 'Sigue esperando respuesta.', 'Ainda aguarda resposta.', 'Lời mời vẫn đang chờ phản hồi.', 'Masih menunggu balasan.', 'Yanıt bekliyor.', 'Wciąż czeka na odpowiedź.'));
      } else if (result === 'self') {
        setFoundUser(null);
        showFeedback(randomSelfFriendCodeMessage(L));
      } else if (result === 'network') {
        // зачем (PM-162): при сбое сети честная причина вместо общего «что-то пошло не так».
        setFoundUser(targetUser);
        setCodeInput(previousCodeInput);
        showFeedback(L('Связь пропала', 'Зв’язок зник', 'Connection lost', 'Se perdió la conexión', 'A conexão caiu', 'Mất kết nối', 'Koneksi terputus', 'Bağlantı kesildi', 'Brak połączenia')+'\n'+L('Проверь интернет и попробуй ещё раз.', 'Перевір інтернет і спробуй ще раз.', 'Check your connection and try again.', 'Revisa tu conexión e inténtalo de nuevo.', 'Verifique a internet e tente novamente.', 'Hãy kiểm tra mạng và thử lại.', 'Periksa internet lalu coba lagi.', 'İnternetinizi kontrol edip tekrar deneyin.', 'Sprawdź internet i spróbuj ponownie.'), 'error');
      } else {
        setFoundUser(targetUser);
        setCodeInput(previousCodeInput);
        showFeedback(L('Сейчас не получилось. Попробуй ещё раз', 'Зараз не вийшло. Спробуй ще раз', "Didn't work this time. Try again", 'Ahora no ha funcionado. Inténtalo de nuevo', 'Não deu certo agora. Tente de novo', 'Lúc này chưa được. Hãy thử lại', 'Belum berhasil. Coba lagi', 'Şu an olmadı. Tekrar dene', 'Teraz się nie udało. Spróbuj ponownie'), 'error');
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
        .catch((error: unknown) => { console.warn('[FRIEND-REQUEST] запись add_request_ui_failed не удалась', error); });
      await trackActivity('friends:add_request_error', {
        feature: 'friends',
        screen: 'friends',
        result: 'error',
        tags: { targetUid: targetUser.uid, error: e instanceof Error ? e.message : String(e) },
      });
      setFoundUser(targetUser);
      setCodeInput(previousCodeInput);
      showFeedback(L('Сейчас не получилось. Попробуй ещё раз', 'Зараз не вийшло. Спробуй ще раз', "Didn't work this time. Try again", 'Ahora no ha funcionado. Inténtalo de nuevo', 'Não deu certo agora. Tente de novo', 'Lúc này chưa được. Hãy thử lại', 'Belum berhasil. Coba lagi', 'Şu an olmadı. Tekrar dene', 'Teraz się nie udało. Spróbuj ponownie'), 'error');
    } finally {
      addRequestInFlightRef.current = false;
      setIsAdding(false);
    }
  }, [L, codeInput, foundUser, isAdding, showFeedback]); // eslint-disable-line react-hooks/exhaustive-deps

  // зачем (FINAL_PHASE п.7): двойной тап по «Принять/Отклонить» до перерисовки строки
  // отправлял два вызова на сервер — держим набор заявок «в пути».
  const requestOpsInFlightRef = useRef<Set<string>>(new Set());

  const handleAcceptRequest = useCallback((request: FriendRequestEntry) => {
    if (isDevFriendsDemoOn()) {
      // зачем (dev friends=demo): вымышленная заявка — меняем только экран, в облако ничего не уходит
      hapticTap();
      console.log(`[DEV-STATE] friends: demo accept ${request.fromUid} (только экран)`); // guard-ok: ветка решает значение
      setRequests(prev => prev.filter(item => item.fromUid !== request.fromUid));
      setFriends(prev => (prev.some(f => f.uid === request.fromUid) ? prev : [{ uid: request.fromUid, createdAt: Date.now(), ...(request.fromName ? { displayName: request.fromName } : {}) }, ...prev]));
      return;
    }
    if (requestOpsInFlightRef.current.has(request.fromUid)) {
      console.warn(`[FRIEND-REQUEST] accept ${request.fromUid}: уже в пути — повторный тап пропущен`);
      return;
    }
    requestOpsInFlightRef.current.add(request.fromUid);
    hapticTap();
    const hadFriend = friends.some(friend => friend.uid === request.fromUid);
    const optimisticFriend: FriendEntry = {
      uid: request.fromUid,
      createdAt: Date.now(),
      ...(request.fromName ? { displayName: request.fromName } : {}),
    };
    pendingFriendOpsRef.current.begin(request.fromUid, 'accept', hadFriend ? undefined : optimisticFriend);
    setRequests(prev => prev.filter(item => item.fromUid !== request.fromUid));
    if (!hadFriend) {
      setFriends(prev => prev.some(friend => friend.uid === request.fromUid) ? prev : [...prev, optimisticFriend]);
      // зачем: лёгкий социальный сигнал «теперь вы друзья» — играет сразу,
      // оптимистично, как и локальное добавление в список выше.
      soundDirector.request('pm.social.friend_added', { scope: 'friends' });
    }
    acceptFriendRequest(request.fromUid)
      .then(() => { pendingFriendOpsRef.current.settle(request.fromUid, true, Date.now()); })
      .catch((error: unknown) => {
        pendingFriendOpsRef.current.settle(request.fromUid, false, Date.now());
        console.warn(`[FRIEND-REQUEST] accept ${request.fromUid}: не удалось — откат`, error);
        setRequests(prev => prev.some(item => item.fromUid === request.fromUid) ? prev : [request, ...prev]);
        if (!hadFriend) {
          setFriends(prev => prev.filter(friend => friend.uid !== request.fromUid));
        }
        showFeedback(L('Не получилось принять. Попробуй ещё раз', 'Не вдалося прийняти. Спробуй ще раз', 'Could not accept. Try again', 'No se pudo aceptar', 'Não deu para aceitar', 'Chưa chấp nhận được', 'Belum bisa diterima', 'Kabul edilemedi', 'Nie udało się zaakceptować'), 'error');
      })
      .finally(() => { requestOpsInFlightRef.current.delete(request.fromUid); });
  }, [L, friends, showFeedback]);

  const handleDeclineRequest = useCallback((request: FriendRequestEntry) => {
    if (isDevFriendsDemoOn()) {
      hapticTap();
      console.log(`[DEV-STATE] friends: demo decline ${request.fromUid} (только экран)`); // guard-ok: ветка решает значение
      setRequests(prev => prev.filter(item => item.fromUid !== request.fromUid));
      return;
    }
    if (requestOpsInFlightRef.current.has(request.fromUid)) {
      console.warn(`[FRIEND-REQUEST] decline ${request.fromUid}: уже в пути — повторный тап пропущен`);
      return;
    }
    requestOpsInFlightRef.current.add(request.fromUid);
    hapticTap();
    pendingFriendOpsRef.current.begin(request.fromUid, 'decline');
    setRequests(prev => prev.filter(item => item.fromUid !== request.fromUid));
    declineFriendRequest(request.fromUid)
      .then(() => { pendingFriendOpsRef.current.settle(request.fromUid, true, Date.now()); })
      .catch((error: unknown) => {
        pendingFriendOpsRef.current.settle(request.fromUid, false, Date.now());
        console.warn(`[FRIEND-REQUEST] decline ${request.fromUid}: не удалось — откат`, error);
        setRequests(prev => prev.some(item => item.fromUid === request.fromUid) ? prev : [request, ...prev]);
        showFeedback(L('Сейчас не получилось. Попробуй ещё раз', 'Зараз не вийшло. Спробуй ще раз', "Didn't work this time. Try again", 'Ahora no ha funcionado. Inténtalo de nuevo', 'Não deu certo agora. Tente de novo', 'Lúc này chưa được. Hãy thử lại', 'Belum berhasil. Coba lagi', 'Şu an olmadı. Tekrar dene', 'Teraz się nie udało. Spróbuj ponownie'), 'error');
      })
      .finally(() => { requestOpsInFlightRef.current.delete(request.fromUid); });
  }, [L, showFeedback]);

  // Список блокировок — из кэша сразу, с сервера не чаще раза в 6 ч (TTL внутри стора).
  useEffect(() => {
    refreshBlockedList().catch((error: unknown) => {
      console.warn('[FRIEND-BLOCK] ui: refresh failed', error instanceof Error ? error.message : String(error));
    });
  }, []);

  const handleDeleteConfirm = useCallback((uid: string, name: string) => {
    if (modalWedgeGuardRef.current) return;
    hapticTap();
    setDeleteTarget({ uid, name });
  }, []);

  const handleBlockConfirm = useCallback((uid: string, name: string) => {
    if (modalWedgeGuardRef.current) return;
    hapticTap();
    setBlockTarget({ uid, name });
  }, []);

  // зачем: удаление и блокировка одного человека не должны идти параллельно и дважды
  // (двойное подтверждение до закрытия окна); замок по uid снимается по завершении.
  const friendRemovalInFlightRef = useRef<Set<string>>(new Set());
  const runBlock = useCallback((target: { uid: string; name: string }) => {
    if (friendRemovalInFlightRef.current.has(target.uid)) {
      console.warn(`[FRIEND-BLOCK] ui: ${target.uid.slice(0, 6)} уже в пути — повторное подтверждение пропущено`);
      return;
    }
    friendRemovalInFlightRef.current.add(target.uid);
    // Optimistic: друг исчезает сразу; отказ сервера — возвращаем и говорим причину.
    const previousFriend = friends.find(friend => friend.uid === target.uid) ?? null;
    setFriends(prev => prev.filter(friend => friend.uid !== target.uid));
    setSelectedPlayer(current => (current?.uid === target.uid || current?.friendUid === target.uid ? null : current));
    const rollback = () => {
      if (previousFriend) setFriends(prev => prev.some(friend => friend.uid === previousFriend.uid) ? prev : [previousFriend, ...prev]);
    };
    void blockUser(target.uid).then((result) => {
      console.log('[FRIEND-BLOCK] ui: block result', JSON.stringify({ uid: target.uid.slice(0, 6), result }));
      if (result === 'ok') {
        showFeedback(L('Пользователь заблокирован', 'Користувача заблоковано', 'User blocked', 'Usuario bloqueado', 'Usuário bloqueado', 'Đã chặn người dùng', 'Pengguna diblokir', 'Kullanıcı engellendi', 'Użytkownik zablokowany'));
        if (previousFriend) {
          deleteFriend(target.uid).catch((error: unknown) => {
            console.warn('[FRIEND-BLOCK] ui: delete after block failed', error instanceof Error ? error.message : String(error));
          });
        }
        return;
      }
      rollback();
      showFeedback(result === 'limit'
        ? L('Достигнут предел списка', 'Досягнуто межі списку', 'Block list is full', 'La lista está llena', 'A lista está cheia', 'Danh sách đã đầy', 'Daftar sudah penuh', 'Liste dolu', 'Lista jest pełna')
        : L('Не получилось заблокировать. Попробуй ещё раз', 'Не вдалося заблокувати. Спробуй ще раз', 'Could not block. Try again', 'No se pudo bloquear. Inténtalo de nuevo', 'Não deu para bloquear. Tente novamente', 'Chưa chặn được. Hãy thử lại', 'Belum bisa diblokir. Coba lagi', 'Engellenemedi. Tekrar dene', 'Nie udało się zablokować. Spróbuj ponownie'), 'error');
    }).catch((error: unknown) => {
      // зачем: blockUser по контракту возвращает код, но сбой стора не должен оставить друга скрытым без объяснения
      console.warn('[FRIEND-BLOCK] ui: block threw — откат', error instanceof Error ? error.message : String(error));
      rollback();
      showFeedback(L('Не получилось заблокировать. Попробуй ещё раз', 'Не вдалося заблокувати. Спробуй ще раз', 'Could not block. Try again', 'No se pudo bloquear. Inténtalo de nuevo', 'Não foi possível bloquear. Tente de novo', 'Không chặn được. Hãy thử lại', 'Gagal memblokir. Coba lagi', 'Engellenemedi. Tekrar dene', 'Nie udało się zablokować. Spróbuj ponownie'), 'error');
    }).finally(() => { friendRemovalInFlightRef.current.delete(target.uid); });
  }, [L, friends, showFeedback]);

  const openProfile = useCallback((profile: FriendProfile) => {
    if (modalWedgeGuardRef.current) return;
    modalWedgeGuardRef.current = true;
    hapticTap();
    setSelectedPlayer({
      name: profile.name,
      points: 0,
      isMe: false,
      uid: profile.uid,
      isPremium: profile.isPremium,
      isVip: profile.isVip,
      isLifetime: profile.isLifetime,
      isPlus: profile.isPlus,
      plusUntilMs: profile.plusUntilMs,
      avatar: profile.avatar,
      frame: profile.frame,
      aura: profile.aura,
      streak: profile.streak,
      friendUid: profile.uid,
      profileCardLevel: profile.profileCardLevel,
      profileCardTheme: profile.profileCardTheme,
      profileCardMotion: profile.profileCardMotion,
      profileCardPublicFocus: profile.profileCardPublicFocus,
      coinRank: profile.coinRank,
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
    // зачем (координатор 18.10 08:22, Firebase-экономия владельца): вкладка монтируется на старте — лайки (2 запроса до 500 док.)
    // читаем только при открытой вкладке и не чаще раза в 30 мин (кэш в friend_activity_likes, без force).
    if (!hasFriends || !friendsRuntimeActive) return;
    let cancelled = false;
    // Один запрос на все мои лайки (≤500 док.), а не по чтению на каждого друга.
    void fetchActivityLikeStatesCached()
      .then(states => {
        if (cancelled) return;
        setHighFivedUids(new Set(
          states.filter(state => state.eventId === PROFILE_LIKE_EVENT_ID).map(state => state.targetUid),
        ));
      })
      .catch(noteSwallowedHandler('friends:useEffect.fetchActivityLikeStates'));
    return () => { cancelled = true; };
  }, [friendsRuntimeActive, hasFriends]);
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
        const fresh = await fetchActivityLikeState(uid).catch(noteSwallowedAs('friends:useCallback.fetchActivityLikeState', null));
        const likedOnServer = !!fresh;
        setHighFivedUids(prev => {
          if (prev.has(uid) === likedOnServer) return prev;
          const next = new Set(prev);
          if (likedOnServer) next.add(uid); else next.delete(uid);
          return next;
        });
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Сейчас не получилось. Попробуй ещё раз',
          messageUk: 'Зараз не вийшло. Спробуй ще раз',
          // зачем (координатор 12.10, EN_READINESS): у тостов друзей не было messageEn — английский интерфейс видел запасной язык.
          messageEn: "Didn't work this time. Try again",
          messageEs: 'Ahora no ha funcionado. Inténtalo de nuevo',
          messagePtBr: 'Não deu certo agora. Tente de novo',
          messageVi: 'Lúc này chưa được. Hãy thử lại',
          messageId: 'Belum berhasil. Coba lagi',
          messageTr: 'Şu an olmadı. Tekrar dene',
          messagePl: 'Teraz się nie udało. Spróbuj ponownie',
        });
      })
      .finally(() => {
        highFiveInFlightRef.current.delete(uid);
      });
  }, [highFivedUids, myProfile?.name]);

  // Обновляем гард на каждый рендер: любая открытая модалка блокирует открытие следующей.
  const modalWedgeActive = selectedPlayer !== null || deleteTarget !== null || blockTarget !== null
    || addModalOpen
    || togetherSheetSession !== null || profileDismissPending;
  modalWedgeGuardRef.current = modalWedgeActive;

  useEffect(() => {
    const action = pendingTogetherSheetAction;
    if (!action) return;
    if (togetherSheetSession !== null || modalWedgeActive) return;

    setPendingTogetherSheetAction(null);
    // зачем: D83 — клиентская Арена удалена, дуэли с другом больше нет;
    // из шторки друга остаётся только удаление.
    if (action.kind === 'delete') handleDeleteConfirm(action.profile.uid, action.profile.name);
    else if (action.kind === 'block') handleBlockConfirm(action.profile.uid, action.profile.name);
    else if (__DEV__) console.warn('[D83-ARENA-RETIRED] friend sheet duel action ignored', { kind: action.kind });
  }, [handleBlockConfirm, handleDeleteConfirm, modalWedgeActive, pendingTogetherSheetAction, togetherSheetSession]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const sortedFriends = useMemo(() => {
    const visible = [...friends]
      .map(fr => profileWithLookupDisplayName(fr.uid, profiles[fr.uid] ?? null, fr.displayName) ?? placeholderFriendProfile(fr.uid, fr.displayName));
    if (ENABLE_DEV_TOOLS && friendsTogetherUiEnabled) {
      for (const bot of devBots) {
        visible.push(devBotToFriendProfile(
          bot,
          '1',
          '',
        ));
      }
    }
    return visible.sort((a, b) => a.name.localeCompare(b.name));
  }, [friends, profiles, devBots, friendsTogetherUiEnabled]);

  const openFriendSheet = useCallback((profile: FriendProfile) => {
    if (modalWedgeGuardRef.current) return;
    modalWedgeGuardRef.current = true;
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
        messageEn: 'High five received. Giving up is now officially off the table.',
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
      setStudyInvite({ event, friendName: profile.name, friendCoinRank: isValidCoinRank(profile.coinRank) ? profile.coinRank : null });
      return;
    }
    // зачем: D83 — клиентская Арена удалена; старое приглашение в дуэль
    // просто гасится как прочитанное, экрана приглашения больше нет.
    if (__DEV__) console.warn('[D83-ARENA-RETIRED] duel invite marker acknowledged without navigation', { kind: event.kind });
    acknowledgeFriendEvent(event);
  }, [acknowledgeFriendEvent]);

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

  // зачем (координатор 12.10, R1 «нет пути», друзья): dev `friend_event=study_invite` — окно приглашения на занятие без события от сервера; выдаётся один раз; в стор-сборке null.
  useEffect(() => {
    if (consumeDevFriendEvent() !== 'study_invite') return;
    const now = Date.now();
    console.log('[DEV-STATE] friends: окно приглашения на занятие (study_invite)'); // guard-ok: dev-ветка
    setStudyInvite({
      event: { id: 'dev_study_invite', actorStableUid: 'dev_friend', kind: 'study_invite', createdAtMs: now, expiresAtMs: now + 10 * 60_000, inviteId: 'dev_invite' },
      friendName: 'Алиса', // i18n-ok: имя подставного друга dev-события study_invite, только dev-сборка
      friendCoinRank: 3,
    });
  }, [focusTick]);

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

  // зачем: поля списка = поля шапки «Сообщество» (V2.screenPad), чтобы вкладка стояла вровень с заголовком.
  const PX = V2.screenPad;

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
    // зачем: верхний отступ под статус-бар уже даёт оболочка вкладок (TabScaffold) и шапка «Сообщество» —
    // собственный верхний отступ по safe area здесь давал двойной отступ под переключателем разделов.
    contentContainerStyle: { paddingBottom: tabContentBottomPad, paddingHorizontal: PX, paddingTop: 0 },
    scrollEventThrottle: 16,
    bounces: true,
    alwaysBounceVertical: true,
    overScrollMode: 'always' as const,
    onScroll: handleFriendsScroll,
  };

  const hasRequests = requests.length > 0;
  const hasFriendRows = sortedFriends.length > 0;
  const yourFriendsTitle = L('Твои друзья', 'Твої друзі', 'Your friends', 'Tus amigos', 'Seus amigos', 'Bạn bè của bạn', 'Teman kamu', 'Arkadaşların', 'Twoi znajomi');

  // зачем (владелец 2026-09-29): вкладка встроена в «Сообщество» (заголовок + переключатель уже там), поэтому
  // собственную шапку «Друзья» и кнопку «назад» убрали. По макету community.html#COM-04 остаётся первая
  // секция («Активные заявки» / «Ваши друзья») и справа кнопка «+ Добавить друга».
  const showListHeader = hasRequests || hasFriendRows || ENABLE_DEV_TOOLS;
  const listHeader = !showListHeader ? null : (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 44, marginTop: 12, marginBottom: 12 }}>
      <View testID="friends-screen-title" style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {hasRequests ? (
          <>
            <FriendsSectionTitle glass={glass} textScale={textScale}>
              {L('Активные заявки', 'Активні заявки', 'Active requests', 'Solicitudes activas', 'Solicitações ativas', 'Lời mời đang chờ', 'Permintaan aktif', 'Aktif istekler', 'Aktywne zaproszenia')}
            </FriendsSectionTitle>
            <View style={{ minWidth: 33, height: 24, paddingHorizontal: 9, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl }}>
              <Text style={{ color: glass.text, fontSize: 13, fontWeight: '700' }}>{requests.length}</Text>
            </View>
          </>
        ) : hasFriendRows ? (
          <FriendsSectionTitle glass={glass} textScale={textScale}>{yourFriendsTitle}</FriendsSectionTitle>
        ) : null}
      </View>
      {/* DEV-only: панель ботов «Вместе» — сквозная ручная проверка сценариев (owner, 2026-08-17). */}
      {/* зачем (Макеты 12.10, community-020): плашка «DEV» не должна попадать в кадры сверки — при dev overlays=off её нет */}
      {ENABLE_DEV_TOOLS && !isDevOverlaysOff() && (
        <TouchableOpacity
          testID="friends-together-dev-open"
          onPressIn={() => hapticTap()}
          onPress={() => setDevBotsSheetOpen(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="DEV: боты «Вместе»" /* i18n-ok: подпись dev-кнопки, только ENABLE_DEV_TOOLS */
          hitSlop={4}
          style={{ minWidth: 64, minHeight: 44, borderRadius: 22, backgroundColor: glass.buttonFill, flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}
        >
          <Ionicons name="flask-outline" size={16} color={glass.text} />
          <FlowText testID="friends-together-dev-badge" provenance="authored" style={{ color: glass.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>DEV</FlowText>
        </TouchableOpacity>
      )}
      {hasRequests || hasFriendRows ? (
        <FriendsRoundButton
          glass={glass}
          testID="friends-open-add"
          icon="add"
          onPress={() => { if (modalWedgeGuardRef.current) return; setAddModalOpen(true); setFoundUser(null); setSearchError(null); setCodeInput(''); }}
          label={L('Добавить друга', 'Додати друга', 'Add friend', 'Agregar amigo', 'Adicionar amigo', 'Thêm bạn', 'Tambah teman', 'Arkadaş ekle', 'Dodaj znajomego')}
        />
      ) : null}
    </View>
  );

  // зачем (владелец 2026-09-30): «Опрос дня» по макету COM-04-ACTIVITY — первым блоком вкладки.
  // Опроса на сегодня нет → карточка сама ничего не рисует (без пустой рамки).
  const dailyPollCard = <DailyPollCard active={friendsRuntimeActive} />;

  // Всё, что на вкладке «Друзья» идёт до строк списка.
  const friendsPreList = (
    <>
      {hasRequests && (
        <View style={{ gap: 10 }}>
          {requests.map(req => {
            const reqProfile = profileWithLookupDisplayName(req.fromUid, profiles[req.fromUid] ?? null, req.fromName) ?? placeholderFriendProfile(req.fromUid, req.fromName);
            return (
              <FriendsRequestCard
                key={req.fromUid}
                profile={reqProfile}
                onAccept={() => handleAcceptRequest(req)}
                onDecline={() => handleDeclineRequest(req)}
              />
            );
          })}
        </View>
      )}
      {/* зачем (PM-163): заголовок «Список друзей» убран как самоочевидный, но в макете после заявок идёт
          «Ваши друзья» — показываем его только когда есть и заявки, и друзья (иначе он уже в шапке). */}
      {hasRequests && hasFriendRows && (
        <View style={{ marginTop: 24, marginBottom: 12 }}>
          <FriendsSectionTitle glass={glass} textScale={textScale}>{yourFriendsTitle}</FriendsSectionTitle>
        </View>
      )}
    </>
  );

  const friendsEmptyState = (
    <FriendsEmptyState
      onAdd={() => { hapticTap(); setAddModalOpen(true); }}
      error={friendsListError}
    />
  );

  const listFooter = (
    <>
        {addFeedback && !addModalOpen && (
          <FriendsFeedbackRow testID="friends-feedback" tone={addFeedbackTone} text={addFeedback} textScale={textScale} style={{ marginTop: 4, marginBottom: 10, paddingHorizontal: 4 }} />
        )}

        {/* зачем (R55, макет community.html friendsEmpty): в пустом списке ссылки «Нашёл ошибку?» нет — только при непустом. */}
        {sortedFriends.length > 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <ReportErrorButton
            screen="friends_tab"
            dataId="friends_tab_main"
            dataText={L('Вкладка друзья', 'Вкладка друзі', 'Friends tab', 'Pestaña amigos', 'Aba amigos', 'Tab bạn bè', 'Tab teman', 'Arkadaşlar sekmesi', 'Karta znajomych')}
          />
        </View>
        ) : null}
    </>
  );

  return (
    <ScreenGradient artBackdrop="friends">
      <FeatureIntroEntry id="friends_first_visit" enabled={friendsRuntimeActive && !addModalOpen && !selectedPlayer && !togetherSheetSession && !accessEndedOpen && !devBotsSheetOpen && !studyInvite && !deleteTarget} />
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
                  coinRank={profile.coinRank ?? null}
                  isPlus={isPlusProfile(profile)}
                  daysTogether={together?.days ?? null}
                  onOpenProfile={openProfileByUid}
                  onOpenDetails={openFriendSheetByUid}
                  event={event}
                  onOpenEvent={event ? openFriendEventByUid : undefined}
                />
              </Reanimated.View>
            );
          }}
          ListHeaderComponent={<>{dailyPollCard}{listHeader}{friendsPreList}</>}
          ListEmptyComponent={friendsEmptyState}
          ListFooterComponent={listFooter}
        />
      </BouncyWrap>


      <AddFriendModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onShareCode={referralMarketingVisible ? () => { void handleReferralInvite(); } : null}
        codeInput={codeInput}
        setCodeInput={setCodeInput}
        isSearching={isSearching}
        foundUser={foundUser}
        searchError={searchError}
        isAdding={isAdding}
        addFeedback={addFeedback}
        addFeedbackTone={addFeedbackTone}
        onSearch={handleSearch}
        onAddFound={handleAddFound}
        onCloseFoundUser={() => setFoundUser(null)}
        lang={lang}
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
        player={selectedPlayerProfile}
        myInfo={{
          name: myProfile?.name ?? L('Я', 'Я', 'Me', 'Yo', 'Eu', 'Tôi', 'Saya', 'Ben', 'Ja'),
          avatar: myProfile?.avatar ?? '1',
          frame: myProfile?.frame ?? '',
          aura: myProfile?.aura,
          streak: myProfile?.streak ?? null,
        }}
        onClose={() => {
          setProfileDismissPending(true);
          setSelectedPlayer(null);
        }}
        onDismissed={() => setProfileDismissPending(false)}
      />

      {togetherSheetSession !== null && (() => {
        const sheetSession = togetherSheetSession;
        const friendUid = sheetSession.uid;
        const devBot = ENABLE_DEV_TOOLS ? devBots.find((bot) => bot.uid === friendUid) : undefined;
        const friendProfile = devBot
          ? devBotToFriendProfile(devBot, '1', '')
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
            friendAura={friendProfile.aura}
            myAvatar={myProfile?.avatar ?? '1'}
            streak={friendProfile.streak}
            highFived={highFivedUids.has(friendUid)}
            together={togetherDisplay}
            onNudge={togetherDisplay ? () => { if (devBot) void handleDevNudge(devBot.uid); else void handleNudgeFriend(friendUid, friendProfile.name); } : null}
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
            onBlock={devBot || !FRIEND_BLOCK_UI_ENABLED ? null : (requestDismiss) => {
              setPendingTogetherSheetAction(current => queueFirstFriendSheetAction(current, { kind: 'block', profile: friendProfile }));
              requestDismiss();
            }}
          />
        );
      })()}

      <FriendStudyInviteModal
        visible={studyInvite !== null}
        friendCoinRank={studyInvite?.friendCoinRank ?? null}
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
          onIncomingNudge={(uid) => { void handleDevIncomingNudge(uid); }}
          onReset={() => { void handleDevReset(); }}
        />
      )}

      <ThemedConfirmModal
        visible={blockTarget !== null}
        // зачем (D135, владелец 01.10): разблокировки нет — подтверждение честно говорит «навсегда».
        title={L('Заблокировать навсегда?', 'Заблокувати назавжди?', 'Block permanently?', '¿Bloquear para siempre?', 'Bloquear para sempre?', 'Chặn vĩnh viễn?', 'Blokir selamanya?', 'Kalıcı olarak engellensin mi?', 'Zablokować na zawsze?')}
        message={blockTarget?.name ?? ''}
        cancelLabel={L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'İptal', 'Anuluj')}
        confirmLabel={L('Заблокировать', 'Заблокувати', 'Block', 'Bloquear', 'Bloquear', 'Chặn', 'Blokir', 'Engelle', 'Zablokuj')}
        confirmVariant="default"
        testIDPrefix="friends-block-confirm"
        onCancel={() => setBlockTarget(null)}
        onConfirm={() => {
          const target = blockTarget;
          setBlockTarget(null);
          if (target) runBlock(target);
        }}
      />

      <ThemedConfirmModal
        visible={deleteTarget !== null}
        title={L('Убрать друга?', 'Прибрати друга?', 'Remove friend?', '¿Quitar amigo?', 'Remover amigo?', 'Gỡ bạn bè?', 'Hapus teman?', 'Arkadaşı kaldır?', 'Usunąć znajomego?')}
        // зачем: паритет с макетом community.html COM-04-REMOVE — пояснение «{имя} исчезнет из списка…» и красная «Убрать».
        message={L(`${deleteTarget?.name ?? ''} исчезнет из списка друзей. Запрос можно будет отправить снова.`, `${deleteTarget?.name ?? ''} зникне зі списку друзів. Запит можна буде надіслати знову.`, `${deleteTarget?.name ?? ''} will disappear from your friends list. You can send a request again.`, `${deleteTarget?.name ?? ''} desaparecerá de tu lista de amigos. Podrás enviar la solicitud de nuevo.`, `${deleteTarget?.name ?? ''} vai sumir da sua lista de amigos. Você poderá enviar o pedido de novo.`, `${deleteTarget?.name ?? ''} sẽ biến mất khỏi danh sách bạn bè. Bạn có thể gửi lời mời lại.`, `${deleteTarget?.name ?? ''} akan hilang dari daftar teman. Permintaan bisa dikirim lagi.`, `${deleteTarget?.name ?? ''} arkadaş listenden kaybolacak. İsteği tekrar gönderebilirsin.`, `${deleteTarget?.name ?? ''} zniknie z listy znajomych. Zaproszenie można wysłać ponownie.`)}
        cancelLabel={L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'İptal', 'Anuluj')}
        confirmLabel={L('Убрать', 'Прибрати', 'Remove', 'Quitar', 'Remover', 'Gỡ', 'Hapus', 'Kaldır', 'Usuń')}
        confirmVariant="default"
        destructive
        testIDPrefix="friends-delete-confirm"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target && friendRemovalInFlightRef.current.has(target.uid)) {
            console.warn(`[FRIEND-DELETE] ui: ${target.uid.slice(0, 6)} уже в пути — повторное подтверждение пропущено`);
          } else if (target) {
            friendRemovalInFlightRef.current.add(target.uid);
            const previousFriend = friends.find(friend => friend.uid === target.uid) ?? null;
            setFriends(prev => prev.filter(friend => friend.uid !== target.uid));
            setSelectedPlayer(current => (current?.uid === target.uid || current?.friendUid === target.uid ? null : current));
            showFeedback(L('Убираем друга…', 'Прибираємо друга…', 'Removing friend…', 'Quitando amigo…', 'Removendo amigo…', 'Đang gỡ bạn bè…', 'Menghapus teman…', 'Arkadaş kaldırılıyor…', 'Usuwanie znajomego…'));
            emitAppEvent('action_toast', {
              type: 'info',
              messageRu: `Убираем друга: ${target.name}`,
              messageUk: `Видаляємо друга: ${target.name}`,
              messageEn: `Removing friend: ${target.name}`,
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
                  messageEn: `Friend removed: ${target.name}`,
                  messageEs: `Amigo eliminado: ${target.name}`,
                  messagePtBr: `Amigo removido: ${target.name}`,
                  messageVi: `Đã xóa bạn bè: ${target.name}`,
                  messageId: `Teman dihapus: ${target.name}`,
                  messageTr: `Arkadaş silindi: ${target.name}`,
                  messagePl: `Znajomy usunięty: ${target.name}`,
                });
              })
              .catch((error: unknown) => {
                console.warn('[FRIENDS] remove friend failed — откат', error instanceof Error ? error.message.slice(0, 80) : String(error).slice(0, 80)); // guard-ok: причина отката
                if (previousFriend) {
                  setFriends(prev => prev.some(friend => friend.uid === previousFriend.uid) ? prev : [previousFriend, ...prev]);
                }
                showFeedback(L('Не получилось убрать друга. Попробуй ещё раз', 'Не вдалося прибрати друга. Спробуй ще раз', 'Could not remove. Try again', 'No se pudo quitar. Inténtalo de nuevo', 'Não deu para remover. Tente novamente', 'Chưa gỡ được. Hãy thử lại', 'Belum bisa dihapus. Coba lagi', 'Kaldırılamadı. Tekrar dene', 'Nie udało się usunąć. Spróbuj ponownie'), 'error');
                emitAppEvent('action_toast', {
                  type: 'error',
                  messageRu: 'Не получилось убрать друга. Попробуй ещё раз',
                  messageUk: 'Помилка видалення. Спробуй ще раз',
                  messageEn: "Couldn't remove the friend. Try again",
                  messageEs: 'Error al eliminar. Inténtalo de nuevo',
                  messagePtBr: 'Erro ao remover. Tente novamente',
                  messageVi: 'Không xóa được. Hãy thử lại',
                  messageId: 'Gagal menghapus. Coba lagi',
                  messageTr: 'Silme hatası. Tekrar dene',
                  messagePl: 'Błąd usuwania. Spróbuj ponownie',
                });
              })
              .finally(() => { friendRemovalInFlightRef.current.delete(target.uid); });
          }
        }}
      />
      </View>
    </ScreenGradient>
  );
}
