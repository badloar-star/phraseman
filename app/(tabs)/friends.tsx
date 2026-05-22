import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View, Text, Image, TouchableOpacity, TextInput, ScrollView,
  Share, Keyboard, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import AvatarView from '../../components/AvatarView';
import PremiumAvatarHalo from '../../components/PremiumAvatarHalo';
import PremiumGoldUserName from '../../components/PremiumGoldUserName';
import VipGreenUserName from '../../components/VipGreenUserName';
import LeagueCrownName from '../../components/LeagueCrownName';
import UnifiedPlayerModal, { PlayerInfo } from '../../components/PlayerProfileModal';
import ThemedConfirmModal from '../../components/ThemedConfirmModal';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import { PREMIUM_AVATAR_AURA_ID, USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId, normalizeAvatarAuraId } from '../../constants/avatar_auras';
import { getLevelFromXP, getXPProgress, type ThemeMode } from '../../constants/theme';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import {
  normalizeProfileCardLevel,
  normalizeProfileCardMotion,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
} from '../profile_card_system';
import { normalizeInviteCodeInput } from '../friend_code';
import { ensureMyInviteCodeForFriends, lookupUserByFriendCode, readCachedMyInviteCodeForFriends } from '../firestore_friends';
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
  type FriendActivityLikeTodayState,
} from '../friend_activity_likes';
import { trackActivity } from '../app_activity';
import { getShardsBalance } from '../shards_system';
import { oskolokImageForPackShards } from '../oskolok';
import { claimUnseenFriendGifts } from '../friend_gift_inbox';
import { emitAppEvent } from '../events';
import {
  FRIEND_GIFT_CATALOG,
  isFriendGiftsCloudEnabled,
  sendFriendGiftWithShards,
  type FriendGiftId,
} from '../friend_gifts';
import { checkAchievements } from '../achievements';

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
  avatar: string;
  frame: string;
  aura?: string;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  leagueCrownExpiresAt?: number;
}

const PROFILE_TTL_MS = 30 * 1000;

type ProfileCacheEntry = FriendsProfileCacheEntry;

type FriendsChrome = {
  card: string;
  cardSoft: string;
  surface: string;
  button: string;
  border: string;
  mask: string;
};

function makeFriendsChrome(themeMode: ThemeMode, t: any): FriendsChrome {
  if (themeMode === 'neon') {
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

async function writeProfilesCache(cache: Record<string, ProfileCacheEntry>): Promise<void> {
  try { await AsyncStorage.setItem(FRIEND_PROFILES_CACHE_KEY, JSON.stringify(cache)); } catch { /* ignore */ }
}

// ── Firestore accessor ────────────────────────────────────────────────────────

const getDb = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return require('@react-native-firebase/firestore').default();
  } catch { return null; }
};

// ── Profile fetch ─────────────────────────────────────────────────────────────

function placeholderFriendProfile(uid: string): FriendProfile {
  return {
    uid,
    name: '…',
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
    avatar: primary.avatar || secondary.avatar,
    frame: primary.frame || secondary.frame,
    aura: primary.aura ?? secondary.aura,
    profileCardLevel: primary.profileCardLevel ?? secondary.profileCardLevel,
    profileCardTheme: primary.profileCardTheme ?? secondary.profileCardTheme,
    profileCardMotion: primary.profileCardMotion ?? secondary.profileCardMotion,
    profileCardPublicFocus: primary.profileCardPublicFocus ?? secondary.profileCardPublicFocus,
    leagueCrownExpiresAt: primary.leagueCrownExpiresAt ?? secondary.leagueCrownExpiresAt,
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

    if (!profile) console.warn('[friendProfile] public profile missing for uid:', uid);
    return profile;
  } catch (e) {
    console.warn('[friendProfile] error for uid:', uid, String(e));
    return null;
  }
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
    const fetched = await Promise.all(toFetch.map(fetchFriendProfileFromFirestore));
    const fetchedProfiles = fetched.filter((p): p is FriendProfile => p !== null);
    const crownMap = await fetchActiveLeagueCrowns(fetchedProfiles.map((p) => p.uid));
    const newEntries: Record<string, ProfileCacheEntry> = {};
    for (let i = 0; i < toFetch.length; i++) {
      const profile = fetched[i];
      if (profile) {
        const crowned = { ...profile, leagueCrownExpiresAt: crownMap[profile.uid]?.expiresAt };
        result[toFetch[i]] = crowned;
        const entry: ProfileCacheEntry = { profile: crowned, fetchedAt: now };
        updatedCache[toFetch[i]] = entry;
        newEntries[toFetch[i]] = entry;
      }
    }
    if (Object.keys(newEntries).length > 0) upsertProfilesCache(newEntries);
    void writeProfilesCache(updatedCache);
  }

  return { fresh: result, updatedCache };
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
      name: (d.displayName as string) || (p.displayName as string) || (p.user_name as string) || 'Я',
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

function FriendRow({
  profile, rank, onPress, onDelete, onGift, lang, t, f, chrome,
}: {
  profile: FriendProfile; rank: number;
  onPress: () => void; onDelete: () => void; onGift: () => void;
  lang: string; t: any; f: any;
  chrome: FriendsChrome;
}) {
  const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : t.textMuted;
  const hasLeagueCrown = Number(profile.leagueCrownExpiresAt) > Date.now();
  const effectiveAura = getEffectiveAvatarAuraId(profile.aura, profile.isPremium, profile.isVip);
  const usesPremiumAura = effectiveAura === PREMIUM_AVATAR_AURA_ID;
  return (
    <TouchableOpacity
      testID={`friend-row-${profile.uid}`}
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: chrome.card,
        borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 0.5, borderColor: chrome.border,
        gap: 12,
      }}
    >
      <Text style={{ width: 20, fontSize: f.body, fontWeight: '800', color: rankColor, textAlign: 'center' }}>
        {rank}
      </Text>
      <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={FRIEND_ROW_AVATAR_SIZE} maskColor={chrome.mask}>
        <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={FRIEND_ROW_AVATAR_SIZE} auraId={usesPremiumAura ? undefined : effectiveAura} />
      </PremiumAvatarHalo>
      <View style={{ flex: 1, minWidth: 0 }}>
        {hasLeagueCrown
          ? <LeagueCrownName text={profile.name} fontSize={f.body} />
          : profile.isPremium
          ? <PremiumGoldUserName text={profile.name} fontSize={f.body} />
          : profile.isVip
          ? <VipGreenUserName text={profile.name} fontSize={f.body} />
          : <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>{profile.name}</Text>
        }
        <MiniXpBar xp={profile.totalXp} color={t.textSecond} />
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
        {profile.streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 13 }}>🔥</Text>
            <Text style={{ fontSize: f.sub, color: '#FF9500', fontWeight: '700' }}>{profile.streak}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            testID={`friend-gift-${profile.uid}`}
            accessibilityLabel={triLang(lang as any, {
              ru: 'Подарить',
              uk: 'Подарувати',
              es: 'Regalar',
              'pt-BR': 'Presentear',
              vi: 'Tặng quà',
              id: 'Beri hadiah',
              tr: 'Hediye gönder',
              pl: 'Podaruj',
            })}
            onPress={onGift}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
          >
            <Ionicons name="gift-outline" size={18} color={t.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            testID={`friend-delete-${profile.uid}`}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
          >
            <Ionicons name="person-remove-outline" size={16} color={t.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Request row ───────────────────────────────────────────────────────────────

function RequestRow({ profile, onAccept, onDecline, lang, t, f, chrome }: {
  profile: FriendProfile;
  onAccept: () => void;
  onDecline: () => void;
  lang: string;
  t: any;
  f: any;
  chrome: FriendsChrome;
}) {
  const hasLeagueCrown = Number(profile.leagueCrownExpiresAt) > Date.now();
  const effectiveAura = getEffectiveAvatarAuraId(profile.aura, profile.isPremium, profile.isVip);
  const usesPremiumAura = effectiveAura === PREMIUM_AVATAR_AURA_ID;
  return (
    <View testID={`friend-request-row-${profile.uid}`} style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: chrome.card, borderRadius: 16, padding: 14, marginBottom: 10,
      borderWidth: 0.5, borderColor: chrome.border, gap: 12,
    }}>
      <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={44} maskColor={chrome.mask}>
        <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={44} auraId={usesPremiumAura ? undefined : effectiveAura} />
      </PremiumAvatarHalo>
      <View style={{ flex: 1, minWidth: 0 }}>
        {hasLeagueCrown
          ? <LeagueCrownName text={profile.name} fontSize={f.body} />
          : profile.isPremium
          ? <PremiumGoldUserName text={profile.name} fontSize={f.body} />
          : profile.isVip
          ? <VipGreenUserName text={profile.name} fontSize={f.body} />
          : <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>{profile.name}</Text>
        }
        <MiniXpBar xp={profile.totalXp} color={t.textSecond} />
        {profile.streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
            <Text style={{ fontSize: 12 }}>🔥</Text>
            <Text style={{ fontSize: f.sub, color: '#FF9500', fontWeight: '700' }}>{profile.streak}</Text>
          </View>
        )}
      </View>
      <View style={{ gap: 8, alignSelf: 'center' }}>
        <TouchableOpacity
          testID={`friend-request-accept-${profile.uid}`}
          onPress={onAccept}
          style={{ backgroundColor: t.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minWidth: 96, alignItems: 'center' }}
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
        </TouchableOpacity>
        <TouchableOpacity
          testID={`friend-request-decline-${profile.uid}`}
          onPress={onDecline}
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
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Found user card ───────────────────────────────────────────────────────────

function FoundUserCard({ profile, onAdd, onClose, isAdding, lang, t, f, chrome }: {
  profile: FriendProfile; onAdd: () => void; onClose: () => void;
  isAdding: boolean; lang: string; t: any; f: any;
  chrome: FriendsChrome;
}) {
  const level = getLevelFromXP(profile.totalXp);
  const hasLeagueCrown = Number(profile.leagueCrownExpiresAt) > Date.now();
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
            ? <LeagueCrownName text={profile.name} fontSize={f.h3 ?? f.body + 2} />
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
            <Text style={{ color: '#FF9500', fontSize: f.sub, marginTop: 2 }}>
              🔥 {profile.streak} {triLang(lang as any, {
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
          )}
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={22} color={t.textMuted} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        testID="friends-add-found"
        onPress={onAdd}
        disabled={isAdding}
        style={{
          backgroundColor: t.accent, borderRadius: 14, paddingVertical: 14,
          alignItems: 'center', opacity: isAdding ? 0.6 : 1,
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
      </TouchableOpacity>
    </View>
  );
}

// ── Code card ─────────────────────────────────────────────────────────────────

function CodeCard({ code, onCopy, onShare, copied, lang, t, f, chrome, layout = 'standalone', loadError, onRetryLoad }: {
  code: string | null; onCopy: () => void; onShare: () => void;
  copied: boolean; lang: string; t: any; f: any;
  chrome: FriendsChrome;
  /** standalone — отдельная карточка; underButton — примыкает снизу к кнопке; inSheet — внутри выпадающей панели (плоские низ/верх для стыковки). */
  layout?: 'standalone' | 'underButton' | 'inSheet';
  loadError?: boolean;
  onRetryLoad?: () => void;
}) {
  const under = layout === 'underButton';
  const inSheet = layout === 'inSheet';
  const topFlat = under || inSheet;
  const bottomFlat = inSheet;
  const marginBottom = layout === 'standalone' ? 24 : under ? 24 : 0;

  return (
    <View testID="friends-my-code-card" style={{
      backgroundColor: chrome.card,
      borderRadius: 20,
      borderTopLeftRadius: topFlat ? 0 : 20,
      borderTopRightRadius: topFlat ? 0 : 20,
      borderBottomLeftRadius: bottomFlat ? 0 : 20,
      borderBottomRightRadius: bottomFlat ? 0 : 20,
      padding: 20,
      alignItems: 'center', gap: 14,
      borderWidth: inSheet ? 0 : 0.5,
      borderBottomWidth: inSheet ? StyleSheet.hairlineWidth : 0.5,
      borderColor: chrome.border,
      marginBottom,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="qr-code-outline" size={18} color={t.textSecond} />
        <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {triLang(lang as any, {
            ru: 'Мой код',
            uk: 'Мій код',
            es: 'Mi código',
            'pt-BR': 'Meu código',
            vi: 'Mã của tôi',
            id: 'Kode saya',
            tr: 'Kodum',
            pl: 'Mój kod',
          })}
        </Text>
      </View>
      {code ? (
        <>
          <Text
            testID="friends-my-code-text"
            style={{
            fontSize: 36, fontWeight: '900', letterSpacing: 8,
            color: t.textPrimary, fontVariant: ['tabular-nums'],
          }}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.65}
          >
            {code}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              testID="friends-copy-code"
              onPress={onCopy}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: copied ? '#34C759' : chrome.button,
                borderRadius: 12, paddingVertical: 12, gap: 6,
                borderWidth: 0.5, borderColor: copied ? '#34C759' : chrome.border,
              }}
            >
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#fff' : t.textPrimary} />
              <Text style={{ color: copied ? '#fff' : t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
                {copied
                  ? triLang(lang as any, {
                    ru: 'Скопировано!',
                    uk: 'Скопійовано!',
                    es: '¡Copiado!',
                    'pt-BR': 'Copiado!',
                    vi: 'Đã sao chép!',
                    id: 'Tersalin!',
                    tr: 'Kopyalandı!',
                    pl: 'Skopiowano!',
                  })
                  : triLang(lang as any, {
                    ru: 'Копировать',
                    uk: 'Копіювати',
                    es: 'Copiar',
                    'pt-BR': 'Copiar',
                    vi: 'Sao chép',
                    id: 'Salin',
                    tr: 'Kopyala',
                    pl: 'Kopiuj',
                  })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="friends-share-code"
              onPress={onShare}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: chrome.button, borderRadius: 12, paddingVertical: 12, gap: 6,
                borderWidth: 0.5, borderColor: chrome.border,
              }}
            >
              <Ionicons name="share-outline" size={16} color={t.textPrimary} />
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
                {triLang(lang as any, {
                  ru: 'Поделиться',
                  uk: 'Поділитись',
                  es: 'Compartir',
                  'pt-BR': 'Compartilhar',
                  vi: 'Chia sẻ',
                  id: 'Bagikan',
                  tr: 'Paylaş',
                  pl: 'Udostępnij',
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : loadError ? (
        <View style={{ alignItems: 'center', gap: 10, alignSelf: 'stretch' }}>
          <Text style={{ color: '#FF9F0A', fontSize: f.sub, textAlign: 'center', fontWeight: '600' }}>
            {triLang(lang as any, {
              ru: 'Не удалось получить код. Проверьте сеть и попробуйте снова.',
              uk: 'Не вдалося отримати код. Перевірте мережу й спробуйте ще.',
              es: 'No se pudo obtener el código. Comprueba la red e inténtalo de nuevo.',
              'pt-BR': 'Não foi possível obter o código. Verifique a rede e tente de novo.',
              vi: 'Không thể lấy mã. Hãy kiểm tra mạng và thử lại.',
              id: 'Tidak dapat mengambil kode. Periksa jaringan dan coba lagi.',
              tr: 'Kod alınamadı. Ağı kontrol edip tekrar dene.',
              pl: 'Nie udało się pobrać kodu. Sprawdź sieć i spróbuj ponownie.',
            })}
          </Text>
          {onRetryLoad && (
            <TouchableOpacity
              testID="friends-retry-code"
              onPress={onRetryLoad}
              style={{
                backgroundColor: t.accent,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 20,
              }}
            >
              <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang as any, {
                  ru: 'Повторить',
                  uk: 'Повторити',
                  es: 'Reintentar',
                  'pt-BR': 'Tentar de novo',
                  vi: 'Thử lại',
                  id: 'Coba lagi',
                  tr: 'Tekrar dene',
                  pl: 'Spróbuj ponownie',
                })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={{
          fontSize: 36, fontWeight: '900', letterSpacing: 8,
          color: t.textMuted, fontVariant: ['tabular-nums'],
        }} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.65}>
          ······
        </Text>
      )}
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

function ActivityTab({
  friendUids, profiles, lang, t, f, chrome,
}: {
  friendUids: string[];
  profiles: Record<string, FriendProfile>;
  lang: string; t: any; f: any;
  chrome: FriendsChrome;
}) {
  const [events, setEvents] = useState<FriendEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayLike, setTodayLike] = useState<FriendActivityLikeTodayState | null>(null);
  const [likeBusyEventId, setLikeBusyEventId] = useState<string | null>(null);
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

  const showActivityLikeToast = useCallback((type: 'success' | 'error' | 'info', ru: string, uk: string, es: string) => {
    emitAppEvent('action_toast', { type, messageRu: ru, messageUk: uk, messageEs: es });
  }, []);

  const load = useCallback(async (force = false) => {
    if (friendUids.length === 0) { setEvents([]); setTodayLike(null); return; }
    if (force) setRefreshing(true); else setLoading(true);
    const [result, likeState] = await Promise.all([
      fetchFriendsActivityFeed(friendUids, force),
      fetchTodayActivityLikeState(),
    ]);
    setEvents(result);
    setTodayLike(likeState);
    if (force) setRefreshing(false); else setLoading(false);
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

  const handleActivityLike = useCallback(async (event: FriendEvent) => {
    const sameLike = todayLike?.targetUid === event.uid && todayLike?.eventId === event.id;
    if (sameLike) {
      showActivityLikeToast('info', 'Лайк за активность уже здесь', 'Лайк за активність уже тут', 'Tu like de actividad ya está aquí');
      return;
    }
    if (todayLike) {
      showActivityLikeToast('info', 'Сегодня лайк за активность уже использован', 'Сьогодні лайк за активність уже використано', 'Ya usaste tu like de actividad de hoy');
      return;
    }
    if (likeBusyEventId) return;
    hapticTap();
    setLikeBusyEventId(`${event.uid}:${event.id}`);
    try {
      const res = await sendFriendActivityLike({ targetUid: event.uid, eventId: event.id });
      setTodayLike({ date: res.date, targetUid: res.targetUid, eventId: res.eventId, createdAt: Date.now() });
      setEvents(prev => prev.map(row =>
        row.uid === event.uid && row.id === event.id
          ? { ...row, activityLikeCount: res.activityLikeCount }
          : row,
      ));
      void invalidateFriendsActivityCache();
      showActivityLikeToast('success', 'Лайк за активность!', 'Лайк за активність!', 'Like de actividad');
    } catch (e) {
      const code = String((e as any)?.code ?? '');
      const msg = String((e as any)?.message ?? e);
      const freshState = await fetchTodayActivityLikeState();
      if (freshState) setTodayLike(freshState);
      if (code.includes('resource-exhausted') || msg.includes('resource-exhausted') || msg.includes('Daily activity like limit')) {
        showActivityLikeToast('info', 'Сегодня лайк за активность уже использован', 'Сьогодні лайк за активність уже використано', 'Ya usaste tu like de actividad de hoy');
      } else if (msg.includes('Self activity likes')) {
        showActivityLikeToast('info', 'Лайки считаются от других пользователей', 'Лайки рахуються від інших користувачів', 'Los likes cuentan cuando vienen de otros usuarios');
      } else {
        showActivityLikeToast('error', 'Не удалось поставить лайк', 'Не вдалося поставити лайк', 'No se pudo dar like');
      }
    } finally {
      setLikeBusyEventId(null);
    }
  }, [likeBusyEventId, showActivityLikeToast, todayLike]);

  // Без force кэш ленты (30 мин) долго показывает пустоту после событий у друзей.
  useEffect(() => { void load(true); }, [load]);

  if (friendUids.length === 0) {
    return (
      <View testID="friends-activity-empty-no-friends" style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
        <Ionicons name="people-outline" size={40} color={t.textMuted} />
        <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
          {L('Добавьте друзей, чтобы видеть их активность', 'Додайте друзів, щоб бачити їхню активність', 'Agrega amigos para ver su actividad', 'Adicione amigos para ver a atividade deles', 'Thêm bạn bè để xem hoạt động của họ', 'Tambahkan teman untuk melihat aktivitas mereka', 'Etkinliklerini görmek için arkadaş ekle', 'Dodaj znajomych, aby widzieć ich aktywność')}
        </Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
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
  }

  return (
    <View testID="friends-activity-list">
      <TouchableOpacity
        testID="friends-activity-refresh"
        onPress={() => { hapticTap(); void load(true); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: 12 }}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh-outline" size={16} color={t.textMuted} />
        <Text style={{ color: t.textMuted, fontSize: f.sub }}>
          {L('Обновить', 'Оновити', 'Actualizar', 'Atualizar', 'Làm mới', 'Perbarui', 'Yenile', 'Odśwież')}
        </Text>
      </TouchableOpacity>
      {events.map(event => {
        const profile = profiles[event.uid];
        const name = profile?.name ?? L('Друг', 'Друг', 'Amigo', 'Amigo', 'Bạn bè', 'Teman', 'Arkadaş', 'Znajomy');
        const color = eventIconColor(event.type, t.accent);
        const likeColor = '#FF2D55';
        const likeCount = Math.max(0, Math.floor(Number(event.activityLikeCount ?? 0) || 0));
        const likedToday = todayLike?.targetUid === event.uid && todayLike?.eventId === event.id;
        const busy = likeBusyEventId === `${event.uid}:${event.id}`;
        return (
          <View
            key={`${event.uid}:${event.id}`}
            testID={`friends-activity-row-${event.uid}-${event.id}`}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              backgroundColor: chrome.card, borderRadius: 16, padding: 14, marginBottom: 10,
              borderWidth: 0.5, borderColor: chrome.border,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: color + '22',
              justifyContent: 'center', alignItems: 'center', flexShrink: 0,
            }}>
              <Ionicons name={eventIcon(event.type) as any} size={18} color={color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600', lineHeight: 20 }}>
                {eventText(event, name, lang)}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
                {formatEventTime(event.ts, lang)}
              </Text>
            </View>
            <TouchableOpacity
              testID={`friends-activity-like-${event.uid}-${event.id}`}
              activeOpacity={0.78}
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
                opacity: busy ? 0.55 : 1,
              }}
            >
              <Ionicons name={likedToday ? 'heart' : 'heart-outline'} size={19} color={likedToday ? likeColor : t.textMuted} />
              <Text style={{ color: likedToday ? likeColor : t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '900', marginTop: 1 }}>
                {likeCount}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

// ── Add Friend Modal ──────────────────────────────────────────────────────────

function AddFriendModal({
  visible, onClose, myCode, onCopy, onShare, copied,
  codeInput, setCodeInput, isSearching, foundUser, searchError,
  isAdding, addFeedback, onSearch, onAddFound, onCloseFoundUser,
  loadError, onRetryLoad, lang, t, f, chrome,
}: {
  visible: boolean; onClose: () => void;
  myCode: string | null; onCopy: () => void; onShare: () => void; copied: boolean;
  codeInput: string; setCodeInput: (v: string) => void;
  isSearching: boolean; foundUser: FriendProfile | null; searchError: string | null;
  isAdding: boolean; addFeedback: string | null;
  onSearch: () => void; onAddFound: () => void; onCloseFoundUser: () => void;
  loadError: boolean; onRetryLoad: () => void;
  lang: string; t: any; f: any;
  chrome: FriendsChrome;
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
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ScreenGradient artBackdrop="friends">
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'bottom', 'left']}>
          <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
            <Text style={{ flex: 1, fontSize: f.h2 ?? 22, fontWeight: '800', color: t.textPrimary }}>
              {L('Добавить друга', 'Додати друга', 'Agregar amigo', 'Adicionar amigo', 'Thêm bạn bè', 'Tambah teman', 'Arkadaş ekle', 'Dodaj znajomego')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={26} color={t.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 16 }}
          >
            <CodeCard
              code={myCode} onCopy={onCopy} onShare={onShare}
              copied={copied} lang={lang} t={t} f={f} chrome={chrome}
              layout="standalone"
              loadError={loadError}
              onRetryLoad={onRetryLoad}
            />
            <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
              {L('Введите код друга', 'Введіть код друга', 'Ingresa el código del amigo', 'Digite o código do amigo', 'Nhập mã bạn bè', 'Masukkan kode teman', 'Arkadaş kodunu gir', 'Wpisz kod znajomego')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
                testID="friends-code-input"
                style={{
                  flex: 1, backgroundColor: chrome.surface, borderRadius: 12,
                  paddingHorizontal: 16, paddingVertical: 13,
                  fontSize: 20, fontWeight: '800', color: t.textPrimary,
                  letterSpacing: 4, borderWidth: 0.5, borderColor: chrome.border,
                }}
                placeholder=""
                placeholderTextColor={t.textMuted}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                value={codeInput}
                onChangeText={v => {
                  setCodeInput(normalizeInviteCodeInput(v));
                  onCloseFoundUser();
                }}
                onSubmitEditing={onSearch}
              />
              <TouchableOpacity
                testID="friends-search"
                onPress={onSearch}
                disabled={codeInput.length !== 6 || isSearching}
                style={{
                  backgroundColor: codeInput.length === 6 ? t.accent : chrome.button,
                  borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center',
                  borderWidth: 0.5, borderColor: codeInput.length === 6 ? t.accent : chrome.border,
                  opacity: isSearching ? 0.6 : 1,
                }}
              >
                <Ionicons name="search" size={22} color={codeInput.length === 6 ? t.correctText : t.textMuted} />
              </TouchableOpacity>
            </View>

            {searchError && (
              <View testID="friends-search-error" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
                <Text style={{ color: '#FF6B6B', fontSize: f.sub }}>{searchError}</Text>
              </View>
            )}

            {foundUser && (
              <FoundUserCard
                profile={foundUser} onAdd={onAddFound} onClose={onCloseFoundUser}
                isAdding={isAdding} lang={lang} t={t} f={f} chrome={chrome}
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
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const { goHome } = useTabNav();
  const chrome = useMemo(() => makeFriendsChrome(themeMode, t), [themeMode, t]);
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

  /** Только код из `ensure…` — без старого кеша первым кадром (не мигать «чужим» кодом). */
  const [myCode, setMyCode] = useState<string | null>(null);
  const [friendCodeLoadError, setFriendCodeLoadError] = useState(false);
  const [myProfile, setMyProfile] = useState<{
    name: string; avatar: string; frame: string; aura?: string; totalXP: number; streak: number | null;
  } | null>(null);

  const [codeInput, setCodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FriendProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [friends, setFriends] = useState<FriendEntry[]>(() => peekFriendsTabSwrWarm()?.friends ?? []);
  const [requests, setRequests] = useState<FriendRequestEntry[]>(() => peekFriendsTabSwrWarm()?.requests ?? []);
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
    return base;
  });

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ uid: string; name: string } | null>(null);
  const [giftTarget, setGiftTarget] = useState<FriendProfile | null>(null);
  const [giftBalance, setGiftBalance] = useState(0);
  const [giftBusyId, setGiftBusyId] = useState<FriendGiftId | null>(null);
  const [giftConfirm, setGiftConfirm] = useState<{ target: FriendProfile; giftId: FriendGiftId } | null>(null);

  const mountedRef = useRef(true);
  /** Был непустой список в SWR-кеше для текущего uid — блокируем пустой локальный onSnapshot Firestore. */
  const swrHadFriendsRef = useRef(false);
  /** После сверки с диском / uid; до этого не показываем финальный «нет друзей». */
  const [friendsCacheReady, setFriendsCacheReady] = useState(() => peekFriendsTabSwrWarm() != null);
  /** Можно показывать пустой список как финальный (кеш пустой или уже пришёл надёжный снимок / таймаут). */
  const [friendsLiveResolved, setFriendsLiveResolved] = useState(() => {
    const w = peekFriendsTabSwrWarm();
    return w != null && w.friends.length === 0;
  });
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

  useEffect(() => {
    mountedRef.current = true;
    // Show cached code immediately (no loading state), then verify/refresh in background.
    void readCachedMyInviteCodeForFriends().then(cached => {
      if (mountedRef.current && cached) setMyCode(cached);
    });
    void syncMyInviteCode();
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
    return () => { mountedRef.current = false; };
  }, [syncMyInviteCode]);

  const pollIncomingFriendGifts = useCallback(async () => {
    try {
      const gifts = await claimUnseenFriendGifts();
      if (gifts.length === 0) return;
      const first = gifts[0];
      const from = first.fromName || L('друг', 'друг', 'amigo', 'amigo', 'bạn bè', 'teman', 'arkadaş', 'znajomy');
      const gift = giftEventLabel(first as unknown as Record<string, string | number>, lang);
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

  useFocusEffect(
    useCallback(() => {
      void ensureFriendRequestViewerAuthLink();
      void pollIncomingFriendGifts();
    }, [pollIncomingFriendGifts]),
  );

  // ── Кеш с устройства → подписки: сначала SWR, затем live; пустой кеш Firestore не затирает SWR.
  // ──

  useEffect(() => {
    let cancelled = false;
    let unsubFriends: () => void = () => {};
    let unsubRequests: () => void = () => {};
    let liveResolveTimer: ReturnType<typeof setTimeout> | null = null;
    const LIVE_RESOLVE_MS = 12_000;

    const clearLiveResolveTimer = () => {
      if (liveResolveTimer) {
        clearTimeout(liveResolveTimer);
        liveResolveTimer = null;
      }
    };

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
      let hadSwrForUser = false;

      if (canonical && w && w.canonicalUid === canonical) {
        hadSwrForUser = true;
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

      setFriendsCacheReady(true);

      if (hadSwrForUser && !swrHadFriendsRef.current) {
        setFriendsLiveResolved(true);
      } else {
        liveResolveTimer = setTimeout(() => {
          if (!cancelled) setFriendsLiveResolved(true);
        }, LIVE_RESOLVE_MS);
      }

      const uid = await ensureAnonUser();
      if (!uid || cancelled) return;

      await ensureFriendRequestViewerAuthLink();
      if (cancelled) return;

      unsubFriends = subscribeToFriends((data, meta) => {
        if (cancelled) return;
        const fromCache = meta?.fromCache === true;
        if (data.length === 0 && fromCache && swrHadFriendsRef.current) return;
        clearLiveResolveTimer();
        setFriends(data);
        if (data.length > 0) {
          void checkAchievements({ type: 'friend_added', totalFriends: data.length }).catch(() => {});
        }
        setFriendsLiveResolved(true);
      });

      unsubRequests = subscribeToIncomingRequests(
        data => { if (!cancelled) setRequests(data); },
        () => {},
      );
    })();

    return () => {
      cancelled = true;
      clearLiveResolveTimer();
      unsubFriends();
      unsubRequests();
    };
  }, []);

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
    if (uids.length === 0) return;
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
  }, [friends, requests]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const showFeedback = (msg: string) => {
    setAddFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setAddFeedback(null), 2500);
  };

  const handleSearch = async () => {
    if (codeInput.length !== 6 || isSearching) return;
    hapticTap();
    Keyboard.dismiss();
    setIsSearching(true);
    setFoundUser(null);
    setSearchError(null);
    try {
      const codeUpper = codeInput.toUpperCase();
      await trackActivity('friends:search_start', {
        feature: 'friends',
        screen: 'friends',
        result: 'start',
        tags: { codeLength: codeUpper.length },
      });
      const result = await lookupUserByFriendCode(codeUpper);
      if (!result) {
        await trackActivity('friends:search_result', {
          feature: 'friends',
          screen: 'friends',
          result: 'blocked',
          tags: { reason: 'not_found', codeLength: codeUpper.length },
        });
        setSearchError(L('Пользователь с таким кодом не найден', 'Користувача з таким кодом не знайдено', 'No se encontró usuario con ese código', 'Nenhum usuário encontrado com esse código', 'Không tìm thấy người dùng với mã này', 'Pengguna dengan kode ini tidak ditemukan', 'Bu kodla kullanıcı bulunamadı', 'Nie znaleziono użytkownika z tym kodem'));
        return;
      }
      const myUid = await ensureAnonUser();
      const isSelf =
        (myCode != null && codeUpper === myCode.toUpperCase()) ||
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
      if (result.source === 'referral_code') {
        void import('../referral_bootstrap')
          .then((m) => m.captureReferralCodeFromManualInput(codeUpper))
          .catch(() => {});
      }
      const fetched = await fetchFriendProfileFromFirestore(result.uid);
      if (!fetched) {
        await trackActivity('friends:search_result', {
          feature: 'friends',
          screen: 'friends',
          result: 'blocked',
          tags: { reason: 'profile_unavailable', targetUid: result.uid },
        });
        setSearchError(L(
          'Профиль найден, но еще не синхронизирован. Откройте профиль на втором устройстве и попробуйте снова.',
          'Профіль знайдено, але ще не синхронізовано. Відкрийте профіль на другому пристрої та спробуйте ще раз.',
          'Perfil encontrado, pero aun no esta sincronizado. Abre el perfil en el segundo dispositivo e intenta de nuevo.',
          'Perfil encontrado, mas ainda não está sincronizado. Abra o perfil no segundo dispositivo e tente de novo.',
          'Hồ sơ đã được tìm thấy, nhưng chưa đồng bộ. Hãy mở hồ sơ trên thiết bị thứ hai rồi thử lại.',
          'Profil ditemukan, tetapi belum tersinkron. Buka profil di perangkat kedua lalu coba lagi.',
          'Profil bulundu, ama henüz senkronize edilmedi. Profili ikinci cihazda açıp tekrar dene.',
          'Profil znaleziony, ale nie jest jeszcze zsynchronizowany. Otwórz profil na drugim urządzeniu i spróbuj ponownie.',
        ));
        return;
      }
      setFoundUser(fetched);
      await trackActivity('friends:search_result', {
        feature: 'friends',
        screen: 'friends',
        result: 'success',
        tags: { targetUid: result.uid, profileLoaded: true },
      });
    } catch (e) {
      void import('../app_health')
        .then(({ logAppWarning }) =>
          logAppWarning('friends:search_failed', e, {
            feature: 'friends',
            screen: 'friends',
            writeToFirestore: true,
            tags: { codeLength: codeInput.length },
          }),
        )
        .catch(() => {});
      await trackActivity('friends:search_error', {
        feature: 'friends',
        screen: 'friends',
        result: 'error',
        tags: { codeLength: codeInput.length, error: e instanceof Error ? e.message : String(e) },
      });
      setSearchError(L('Ошибка. Попробуйте ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo', 'Erro. Tente novamente', 'Lỗi. Hãy thử lại', 'Error. Coba lagi', 'Hata. Tekrar dene', 'Błąd. Spróbuj ponownie'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFound = async () => {
    if (!foundUser || isAdding) return;
    hapticTap();
    setIsAdding(true);
    try {
      await trackActivity('friends:add_request_start', {
        feature: 'friends',
        screen: 'friends',
        result: 'start',
        tags: { targetUid: foundUser.uid },
      });
      const result = await sendFriendRequest(foundUser.uid);
      await trackActivity('friends:add_request_result', {
        feature: 'friends',
        screen: 'friends',
        result: result === 'sent' ? 'success' : result === 'error' ? 'error' : 'blocked',
        tags: { targetUid: foundUser.uid, requestResult: result },
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
        showFeedback(L('Ошибка. Попробуйте ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo', 'Erro. Tente novamente', 'Lỗi. Hãy thử lại', 'Error. Coba lagi', 'Hata. Tekrar dene', 'Błąd. Spróbuj ponownie'));
      }
    } catch (e) {
      void import('../app_health')
        .then(({ logAppWarning }) =>
          logAppWarning('friends:add_request_ui_failed', e, {
            feature: 'friends',
            screen: 'friends',
            writeToFirestore: true,
            tags: { targetUid: foundUser.uid },
          }),
        )
        .catch(() => {});
      await trackActivity('friends:add_request_error', {
        feature: 'friends',
        screen: 'friends',
        result: 'error',
        tags: { targetUid: foundUser.uid, error: e instanceof Error ? e.message : String(e) },
      });
      showFeedback(L('Ошибка. Попробуйте ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo', 'Erro. Tente novamente', 'Lỗi. Hãy thử lại', 'Error. Coba lagi', 'Hata. Tekrar dene', 'Błąd. Spróbuj ponownie'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleCopy = useCallback(() => {
    if (!myCode) return;
    hapticTap();
    void Clipboard.setStringAsync(myCode);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1800);
  }, [myCode]);

  const handleShare = useCallback(async () => {
    if (!myCode) return;
    hapticTap();
    await Share.share({
      message: L('Мой код в PhraseMan:', 'Мій код у PhraseMan:', 'Mi código en PhraseMan:', 'Meu código no PhraseMan:', 'Mã của tôi trong PhraseMan:', 'Kode saya di PhraseMan:', 'PhraseMan kodum:', 'Mój kod w PhraseMan:') + ' ' + myCode,
    });
  }, [myCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteConfirm = (uid: string, name: string) => {
    hapticTap();
    setDeleteTarget({ uid, name });
  };

  const openGiftPicker = (profile: FriendProfile) => {
    hapticTap();
    setGiftTarget(profile);
    void getShardsBalance().then(setGiftBalance).catch(() => setGiftBalance(0));
  };

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

  const handleSendGift = async (giftId: FriendGiftId) => {
    if (!giftTarget || giftBusyId) return;
    const gift = FRIEND_GIFT_CATALOG.find(x => x.id === giftId);
    if (!gift) return;
    if (!isFriendGiftsCloudEnabled()) {
      showFeedback(L('Подарки доступны только с облачной синхронизацией', 'Подарунки доступні лише з хмарною синхронізацією', 'Los regalos requieren sincronizacion en la nube', 'Os presentes exigem sincronização na nuvem', 'Quà tặng cần đồng bộ đám mây', 'Hadiah memerlukan sinkronisasi cloud', 'Hediyeler için bulut senkronizasyonu gerekir', 'Prezenty wymagają synchronizacji w chmurze'));
      return;
    }
    if (giftBalance < gift.costShards) {
      showFeedback(L('Не хватает осколков', 'Не вистачає осколків', 'No tienes suficientes fragmentos', 'Fragmentos insuficientes', 'Không đủ mảnh', 'Pecahan tidak cukup', 'Parça yetersiz', 'Za mało odłamków'));
      return;
    }
    hapticTap();
    setGiftBusyId(giftId);
    try {
      const target = giftTarget;
      const res = await sendFriendGiftWithShards({
        friendStableId: target.uid,
        giftId,
        senderDisplayName: myProfile?.name ?? '',
      });
      setGiftBalance(res.senderBalanceAfter);
      setGiftTarget(null);
      showFeedback(L('Подарок отправлен', 'Подарунок надіслано', 'Regalo enviado', 'Presente enviado', 'Đã gửi quà', 'Hadiah terkirim', 'Hediye gönderildi', 'Prezent wysłany'));
      await trackActivity('friends:send_gift', {
        feature: 'friends',
        screen: 'friends',
        result: 'success',
        tags: { giftId, targetUid: target.uid, cost: gift.costShards },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('resource-exhausted') || msg.includes('limit')) {
        showFeedback(L('Лимит подарков на сегодня уже исчерпан', 'Ліміт подарунків на сьогодні вже вичерпано', 'Ya alcanzaste el limite de regalos de hoy', 'Você atingiu o limite de presentes de hoje', 'Bạn đã hết lượt tặng quà hôm nay', 'Batas hadiah hari ini sudah tercapai', 'Bugünkü hediye sınırına ulaştın', 'Dzisiejszy limit prezentów został już wykorzystany'));
        await trackActivity('friends:send_gift', {
          feature: 'friends',
          screen: 'friends',
          result: 'error',
          tags: { giftId, targetUid: giftTarget.uid, error: msg },
        });
        return;
      }
      showFeedback(
        msg.includes('precondition') || msg.includes('Not enough')
          ? L('Не хватает осколков или дружба уже не активна', 'Не вистачає осколків або дружба вже не активна', 'Faltan fragmentos o la amistad ya no esta activa', 'Fragmentos insuficientes ou amizade não está mais ativa', 'Không đủ mảnh hoặc tình bạn không còn hoạt động', 'Pecahan tidak cukup atau pertemanan sudah tidak aktif', 'Parça yetersiz veya arkadaşlık artık aktif değil', 'Za mało odłamków albo znajomość nie jest już aktywna')
          : L('Не удалось отправить подарок', 'Не вдалося надіслати подарунок', 'No se pudo enviar el regalo', 'Não foi possível enviar o presente', 'Không gửi được quà', 'Hadiah tidak dapat dikirim', 'Hediye gönderilemedi', 'Nie udało się wysłać prezentu'),
      );
      await trackActivity('friends:send_gift', {
        feature: 'friends',
        screen: 'friends',
        result: 'error',
        tags: { giftId, targetUid: giftTarget.uid, error: msg },
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
      router.push({ pathname: '/shards_shop', params: { need: String(missing), source: 'friend_gift' } } as any);
      return;
    }
    setGiftConfirm({ target: giftTarget, giftId });
  };

  const openProfile = (profile: FriendProfile) => {
    hapticTap();
    setSelectedPlayer({
      name: profile.name,
      points: profile.totalXp,
      totalXp: profile.totalXp,
      isMe: false,
      uid: profile.uid,
      isPremium: profile.isPremium,
      isVip: profile.isVip,
      avatar: profile.avatar,
      frame: profile.frame,
      aura: profile.aura,
      streak: profile.streak,
      friendUid: profile.uid,
      leagueCrownExpiresAt: profile.leagueCrownExpiresAt,
      profileCardLevel: profile.profileCardLevel,
      profileCardTheme: profile.profileCardTheme,
      profileCardMotion: profile.profileCardMotion,
      profileCardPublicFocus: profile.profileCardPublicFocus,
    });
  };

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'activity'>('friends');

  // ── Derived ────────────────────────────────────────────────────────────────

  const sortedFriends = useMemo(
    () =>
      [...friends]
        .map(fr => profiles[fr.uid] ?? placeholderFriendProfile(fr.uid))
        .sort((a, b) => b.totalXp - a.totalXp),
    [friends, profiles],
  );

  const showFriendsEmpty =
    friendsCacheReady && friendsLiveResolved && sortedFriends.length === 0;

  const friendUids = useMemo(() => friends.map(f => f.uid), [friends]);

  const PX = 16;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScreenGradient artBackdrop="friends">
      <View testID="screen-friends" style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: PX }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 6, marginBottom: 14 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={L('На главную', 'На головну', 'Inicio', 'Início', 'Trang chủ', 'Beranda', 'Ana sayfa', 'Strona główna')}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: chrome.button, borderWidth: 0.5, borderColor: chrome.border,
              justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0,
            }}
            onPress={() => { hapticTap(); goHome(); }}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900', letterSpacing: -0.5, flex: 1 }}>
            {L('Друзья', 'Друзі', 'Amigos', 'Amigos', 'Bạn bè', 'Teman', 'Arkadaşlar', 'Znajomi')}
          </Text>
          <TouchableOpacity
            testID="friends-open-add"
            onPress={() => {
              hapticTap();
              setAddModalOpen(true);
              setFoundUser(null);
              setSearchError(null);
              setCodeInput('');
            }}
            activeOpacity={0.8}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: t.accent,
              justifyContent: 'center', alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Ionicons name="person-add" size={18} color={t.correctText} />
          </TouchableOpacity>
        </View>
        <View style={{
          flexDirection: 'row', backgroundColor: chrome.card,
          borderRadius: 14, padding: 3, marginBottom: 20,
          borderWidth: 0.5, borderColor: chrome.border,
        }}>
          {(['friends', 'activity'] as const).map(tab => {
            const active = activeTab === tab;
            const label = tab === 'friends'
              ? L('Друзья', 'Друзі', 'Amigos', 'Amigos', 'Bạn bè', 'Teman', 'Arkadaşlar', 'Znajomi')
              : L('Активность', 'Активність', 'Actividad', 'Atividade', 'Hoạt động', 'Aktivitas', 'Etkinlik', 'Aktywność');
            return (
              <TouchableOpacity
                testID={`friends-tab-${tab}`}
                key={tab}
                onPress={() => { hapticTap(); setActiveTab(tab); }}
                activeOpacity={0.8}
                style={{
                  flex: 1, paddingVertical: 9, borderRadius: 11,
                  backgroundColor: active ? t.accent : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: active ? t.correctText : t.textMuted,
                  fontSize: f.body, fontWeight: active ? '700' : '500',
                }}>
                  {label}
                  {tab === 'friends' && sortedFriends.length > 0
                    ? ` (${sortedFriends.length})`
                    : ''}
                  {tab === 'friends' && requests.length > 0
                    ? ` · ${requests.length}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {activeTab === 'friends' && (
          <>
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
                    profile={profiles[req.fromUid] ?? placeholderFriendProfile(req.fromUid)}
                    onAccept={() => {
                      hapticTap();
                      acceptFriendRequest(req.fromUid)
                        .then(() => { void invalidateFriendsActivityCache(); })
                        .catch(() => {
                          showFeedback(L('Ошибка при принятии. Попробуйте ещё раз', 'Помилка. Спробуйте ще раз', 'Error al aceptar', 'Erro ao aceitar', 'Lỗi khi chấp nhận', 'Gagal menerima', 'Kabul ederken hata', 'Błąd przy akceptacji'));
                        });
                    }}
                    onDecline={() => { hapticTap(); void declineFriendRequest(req.fromUid); }}
                    lang={lang} t={t} f={f} chrome={chrome}
                  />
                ))}
              </>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
              <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
                {L('Список друзей', 'Список друзів', 'Lista de amigos', 'Lista de amigos', 'Danh sách bạn bè', 'Daftar teman', 'Arkadaş listesi', 'Lista znajomych')}
              </Text>
              {sortedFriends.length > 0 && (
                <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                  {L('по XP', 'за XP', 'por XP', 'por XP', 'theo XP', 'berdasarkan XP', "XP'ye göre", 'wg XP')}
                </Text>
              )}
            </View>

            {sortedFriends.length === 0 ? (
              !showFriendsEmpty ? null : (
              <View testID="friends-empty-state" style={{
                backgroundColor: chrome.cardSoft, borderRadius: 20, padding: 32,
                alignItems: 'center', gap: 12, borderWidth: 0.5, borderColor: chrome.border,
              }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: chrome.surface, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={28} color={t.textMuted} />
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                  {L('Пока нет друзей', 'Поки немає друзів', 'Sin amigos aún', 'Ainda sem amigos', 'Chưa có bạn bè', 'Belum ada teman', 'Henüz arkadaş yok', 'Brak znajomych')}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', lineHeight: 20 }}>
                  {L('Нажмите иконку + вверху справа', 'Натисніть іконку + вгорі праворуч', 'Pulsa el ícono + arriba a la derecha', 'Toque no ícone + no canto superior direito', 'Nhấn biểu tượng + ở góc trên bên phải', 'Ketuk ikon + di kanan atas', 'Sağ üstteki + simgesine dokun', 'Stuknij ikonę + w prawym górnym rogu')}
                </Text>
              </View>
              )
            ) : (
              sortedFriends.map((profile, i) => (
                <FriendRow
                  key={profile.uid}
                  profile={profile}
                  rank={i + 1}
                  onPress={() => openProfile(profile)}
                  onDelete={() => handleDeleteConfirm(profile.uid, profile.name)}
                  onGift={() => openGiftPicker(profile)}
                  lang={lang} t={t} f={f} chrome={chrome}
                />
              ))
            )}
          </>
        )}
        {activeTab === 'activity' && (
          <ActivityTab
            friendUids={friendUids}
            profiles={profiles}
            lang={lang} t={t} f={f}
            chrome={chrome}
          />
        )}

        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <ReportErrorButton
            screen="friends_tab"
            dataId="friends_tab_main"
            dataText={L('Вкладка друзья', 'Вкладка друзі', 'Pestaña amigos', 'Aba amigos', 'Tab bạn bè', 'Tab teman', 'Arkadaşlar sekmesi', 'Karta znajomych')}
          />
        </View>

      </ScrollView>
      <AddFriendModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        myCode={myCode}
        onCopy={handleCopy}
        onShare={handleShare}
        copied={copied}
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
        loadError={friendCodeLoadError}
        onRetryLoad={retryFriendCode}
        lang={lang} t={t} f={f} chrome={chrome}
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
                resizeMode="contain"
              />
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}>{giftBalance}</Text>
            </View>

            {FRIEND_GIFT_CATALOG.map(gift => {
              const cannotAfford = giftBalance < gift.costShards;
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
                    opacity: disabled ? 0.45 : cannotAfford ? 0.72 : 1,
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
                    <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '900', textAlign: 'right' }}>
                      {displayCostText}
                    </Text>
                    <Image
                      source={oskolokImageForPackShards(displayCost)}
                      style={{ width: 22, height: 22 }}
                      resizeMode="contain"
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

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
        visible={giftConfirm !== null}
        title={L('Отправить подарок?', 'Надіслати подарунок?', '¿Enviar regalo?', 'Enviar presente?', 'Gửi quà?', 'Kirim hadiah?', 'Hediye gönderilsin mi?', 'Wysłać prezent?')}
        message={
          giftConfirm
            ? L(
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} за ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} осколков`,
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} за ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} осколків`,
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} por ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} fragmentos`,
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} por ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} fragmentos`,
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} với ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} mảnh`,
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} seharga ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} pecahan`,
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} parça karşılığında`,
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} za ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} odłamków`,
              )
            : ''
        }
        cancelLabel={L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'İptal', 'Anuluj')}
        confirmLabel={L('Подарить', 'Подарувати', 'Regalar', 'Presentear', 'Tặng', 'Beri hadiah', 'Hediye et', 'Podaruj')}
        confirmVariant="accent"
        testIDPrefix="friends-gift-confirm"
        onCancel={() => setGiftConfirm(null)}
        onConfirm={() => {
          const pending = giftConfirm;
          setGiftConfirm(null);
          if (pending) void handleSendGift(pending.giftId);
        }}
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
            deleteFriend(target.uid)
              .then(() => { void invalidateFriendsActivityCache(); })
              .catch(() => {
                showFeedback(L('Ошибка удаления. Попробуйте ещё раз', 'Помилка видалення. Спробуйте ще раз', 'Error al eliminar. Inténtalo de nuevo', 'Erro ao remover. Tente novamente', 'Không xóa được. Hãy thử lại', 'Gagal menghapus. Coba lagi', 'Silme hatası. Tekrar dene', 'Błąd usuwania. Spróbuj ponownie'));
              });
          }
        }}
      />
      </View>
    </ScreenGradient>
  );
}
