import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  Share, Keyboard, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { usePremium } from '../../components/PremiumContext';
import AvatarView from '../../components/AvatarView';
import PremiumAvatarHalo from '../../components/PremiumAvatarHalo';
import PremiumGoldUserName from '../../components/PremiumGoldUserName';
import LeagueCrownName from '../../components/LeagueCrownName';
import UnifiedPlayerModal, { PlayerInfo } from '../../components/PlayerProfileModal';
import ThemedConfirmModal from '../../components/ThemedConfirmModal';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import { USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId, normalizeAvatarAuraId } from '../../constants/avatar_auras';
import { getLevelFromXP, getXPProgress } from '../../constants/theme';
import { triLang } from '../../constants/i18n';
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
import { claimUnseenFriendGifts } from '../friend_gift_inbox';
import { emitAppEvent } from '../events';
import {
  FRIEND_GIFT_CATALOG,
  isFriendGiftsCloudEnabled,
  sendFriendGiftWithShards,
  type FriendGiftId,
} from '../friend_gifts';

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
    const isPremium = (p.premium_plan as string) === 'monthly' || (p.premium_plan as string) === 'annual';
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

function FriendRow({
  profile, rank, onPress, onDelete, onGift, lang, t, f,
}: {
  profile: FriendProfile; rank: number;
  onPress: () => void; onDelete: () => void; onGift: () => void;
  lang: string; t: any; f: any;
}) {
  const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : t.textMuted;
  const hasLeagueCrown = Number(profile.leagueCrownExpiresAt) > Date.now();
  return (
    <TouchableOpacity
      testID={`friend-row-${profile.uid}`}
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: t.bgCard,
        borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 0.5, borderColor: t.border,
        gap: 12,
      }}
    >
      <Text style={{ width: 20, fontSize: f.body, fontWeight: '800', color: rankColor, textAlign: 'center' }}>
        {rank}
      </Text>
      <PremiumAvatarHalo enabled={profile.isPremium} avatarSize={44} maskColor={t.bgCard}>
        <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={44} auraId={getEffectiveAvatarAuraId(profile.aura, profile.isPremium)} />
      </PremiumAvatarHalo>
      <View style={{ flex: 1, minWidth: 0 }}>
        {hasLeagueCrown
          ? <LeagueCrownName text={profile.name} fontSize={f.body} />
          : profile.isPremium
          ? <PremiumGoldUserName text={profile.name} fontSize={f.body} />
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
            accessibilityLabel={triLang(lang as any, { ru: 'Подарить', uk: 'Подарувати', es: 'Regalar' })}
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

function RequestRow({ profile, onAccept, onDecline, lang, t, f }: {
  profile: FriendProfile;
  onAccept: () => void;
  onDecline: () => void;
  lang: string;
  t: any;
  f: any;
}) {
  const B = (ru: string, uk: string, es: string) => triLang(lang as any, { ru, uk, es });
  const hasLeagueCrown = Number(profile.leagueCrownExpiresAt) > Date.now();
  return (
    <View testID={`friend-request-row-${profile.uid}`} style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.bgCard, borderRadius: 16, padding: 14, marginBottom: 10,
      borderWidth: 0.5, borderColor: t.border, gap: 12,
    }}>
      <PremiumAvatarHalo enabled={profile.isPremium} avatarSize={44} maskColor={t.bgCard}>
        <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={44} auraId={getEffectiveAvatarAuraId(profile.aura, profile.isPremium)} />
      </PremiumAvatarHalo>
      <View style={{ flex: 1, minWidth: 0 }}>
        {hasLeagueCrown
          ? <LeagueCrownName text={profile.name} fontSize={f.body} />
          : profile.isPremium
          ? <PremiumGoldUserName text={profile.name} fontSize={f.body} />
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
          <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '800' }}>{B('Принять', 'Прийняти', 'Aceptar')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`friend-request-decline-${profile.uid}`}
          onPress={onDecline}
          style={{
            backgroundColor: t.bgSurface,
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
            minWidth: 96,
            alignItems: 'center',
            borderWidth: 0.5,
            borderColor: t.border,
          }}
        >
          <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700' }}>{B('Отклонить', 'Відхилити', 'Rechazar')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Found user card ───────────────────────────────────────────────────────────

function FoundUserCard({ profile, onAdd, onClose, isAdding, lang, t, f }: {
  profile: FriendProfile; onAdd: () => void; onClose: () => void;
  isAdding: boolean; lang: string; t: any; f: any;
}) {
  const level = getLevelFromXP(profile.totalXp);
  const hasLeagueCrown = Number(profile.leagueCrownExpiresAt) > Date.now();
  return (
    <View testID="friends-found-user-card" style={{
      backgroundColor: t.bgCard, borderRadius: 20, padding: 20, marginTop: 12,
      borderWidth: 1, borderColor: t.accent + '55', gap: 16,
      shadowColor: t.accent, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PremiumAvatarHalo enabled={profile.isPremium} avatarSize={56} maskColor={t.bgCard}>
          <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={56} auraId={getEffectiveAvatarAuraId(profile.aura, profile.isPremium)} />
        </PremiumAvatarHalo>
        <View style={{ flex: 1 }}>
          {hasLeagueCrown
            ? <LeagueCrownName text={profile.name} fontSize={f.h3 ?? f.body + 2} />
            : profile.isPremium
            ? <PremiumGoldUserName text={profile.name} fontSize={f.h3 ?? f.body + 2} />
            : <Text style={{ color: t.textPrimary, fontSize: f.h3 ?? 18, fontWeight: '800' }}>{profile.name}</Text>
          }
          <Text style={{ color: t.textSecond, fontSize: f.body, marginTop: 2 }}>
            Lv {level} • {profile.totalXp.toLocaleString()} XP
          </Text>
          {profile.streak > 0 && (
            <Text style={{ color: '#FF9500', fontSize: f.sub, marginTop: 2 }}>
              🔥 {profile.streak} {triLang(lang as any, { ru: 'дней подряд', uk: 'днів поспіль', es: 'días seguidos' })}
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
          {triLang(lang as any, { ru: 'Добавить в друзья', uk: 'Додати в друзі', es: 'Agregar amigo' })}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Code card ─────────────────────────────────────────────────────────────────

function CodeCard({ code, onCopy, onShare, copied, lang, t, f, layout = 'standalone', loadError, onRetryLoad }: {
  code: string | null; onCopy: () => void; onShare: () => void;
  copied: boolean; lang: string; t: any; f: any;
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
      backgroundColor: t.bgCard,
      borderRadius: 20,
      borderTopLeftRadius: topFlat ? 0 : 20,
      borderTopRightRadius: topFlat ? 0 : 20,
      borderBottomLeftRadius: bottomFlat ? 0 : 20,
      borderBottomRightRadius: bottomFlat ? 0 : 20,
      padding: 20,
      alignItems: 'center', gap: 14,
      borderWidth: inSheet ? 0 : 0.5,
      borderBottomWidth: inSheet ? StyleSheet.hairlineWidth : 0.5,
      borderColor: t.border,
      marginBottom,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="qr-code-outline" size={18} color={t.textSecond} />
        <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {triLang(lang as any, { ru: 'Мой код', uk: 'Мій код', es: 'Mi código' })}
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
                backgroundColor: copied ? '#34C759' : t.bgSurface,
                borderRadius: 12, paddingVertical: 12, gap: 6,
                borderWidth: 0.5, borderColor: copied ? '#34C759' : t.border,
              }}
            >
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#fff' : t.textPrimary} />
              <Text style={{ color: copied ? '#fff' : t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
                {copied
                  ? triLang(lang as any, { ru: 'Скопировано!', uk: 'Скопійовано!', es: '¡Copiado!' })
                  : triLang(lang as any, { ru: 'Копировать', uk: 'Копіювати', es: 'Copiar' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="friends-share-code"
              onPress={onShare}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: t.bgSurface, borderRadius: 12, paddingVertical: 12, gap: 6,
                borderWidth: 0.5, borderColor: t.border,
              }}
            >
              <Ionicons name="share-outline" size={16} color={t.textPrimary} />
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
                {triLang(lang as any, { ru: 'Поделиться', uk: 'Поділитись', es: 'Compartir' })}
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
                {triLang(lang as any, { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar' })}
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
  if (min < 2) return triLang(lang as any, { ru: 'только что', uk: 'щойно', es: 'ahora mismo' });
  if (min < 60) return triLang(lang as any, { ru: `${min} мин назад`, uk: `${min} хв тому`, es: `hace ${min} min` });
  if (hrs < 24) return triLang(lang as any, { ru: `${hrs} ч назад`, uk: `${hrs} год тому`, es: `hace ${hrs} h` });
  if (days < 7) return triLang(lang as any, { ru: `${days} дн назад`, uk: `${days} дн тому`, es: `hace ${days} días` });
  return new Date(ts).toLocaleDateString(lang === 'uk' ? 'uk-UA' : lang === 'es' ? 'es-ES' : 'ru-RU', { day: 'numeric', month: 'short' });
}

function eventText(event: FriendEvent, friendName: string, lang: string): string {
  const n = friendName;
  const p = event.payload;
  const L = (ru: string, uk: string, es: string) => triLang(lang as any, { ru, uk, es });
  if (event.type === 'friend_gift_sent') {
    return L(`${n} отправил подарок: ${p.giftLabel ?? p.giftId}`, `${n} надіслав подарунок: ${p.giftLabel ?? p.giftId}`, `${n} envió un regalo: ${p.giftLabel ?? p.giftId}`);
  }
  if (event.type === 'friend_gift_received') {
    return L(`${n} получил подарок: ${p.giftLabel ?? p.giftId}`, `${n} отримав подарунок: ${p.giftLabel ?? p.giftId}`, `${n} recibió un regalo: ${p.giftLabel ?? p.giftId}`);
  }
  switch (event.type) {
    case 'level_up':
      return L(`${n} достиг уровня ${p.level}`, `${n} досяг рівня ${p.level}`, `${n} alcanzó el nivel ${p.level}`);
    case 'lesson_complete': {
      const lvlMap: Record<string, string> = { easy: L('лёгкий', 'легкий', 'fácil'), medium: L('средний', 'середній', 'medio'), hard: L('сложный', 'складний', 'difícil') };
      const lvlName = lvlMap[String(p.level)] ?? String(p.level);
      return L(`${n} прошёл урок (${lvlName})`, `${n} пройшов урок (${lvlName})`, `${n} completó la lección (${lvlName})`);
    }
    case 'achievement':
      return L(`${n} получил достижение ${p.icon ?? '🏆'} «${p.nameRu}»`, `${n} отримав досягнення ${p.icon ?? '🏆'} «${p.nameRu}»`, `${n} desbloqueó logro ${p.icon ?? '🏆'} «${p.nameRu}»`);
    case 'streak_milestone':
      return L(`${n} держит серию ${p.days} дней подряд 🔥`, `${n} тримає серію ${p.days} днів поспіль 🔥`, `${n} lleva ${p.days} días seguidos 🔥`);
    case 'arena_rank_up':
      return L(`${n} поднялся до ранга «${p.rank}» на арене ⚔️`, `${n} піднявся до рангу «${p.rank}» на арені ⚔️`, `${n} subió al rango «${p.rank}» en la arena ⚔️`);
    case 'arena_rank_down':
      return L(`${n} потерял ранг на арене`, `${n} втратив ранг на арені`, `${n} bajó de rango en la arena`);
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
  friendUids, profiles, lang, t, f,
}: {
  friendUids: string[];
  profiles: Record<string, FriendProfile>;
  lang: string; t: any; f: any;
}) {
  const [events, setEvents] = useState<FriendEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayLike, setTodayLike] = useState<FriendActivityLikeTodayState | null>(null);
  const [likeBusyEventId, setLikeBusyEventId] = useState<string | null>(null);
  const L = (ru: string, uk: string, es: string) => triLang(lang as any, { ru, uk, es });

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
          void checkAchievements({ type: 'achievement_liked' });
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
          {L('Добавьте друзей, чтобы видеть их активность', 'Додайте друзів, щоб бачити їхню активність', 'Agrega amigos para ver su actividad')}
        </Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View testID="friends-activity-empty" style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
        <Ionicons name="pulse-outline" size={40} color={t.textMuted} />
        <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
          {L('Пока нет активности', 'Поки немає активності', 'Sin actividad aún')}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center' }}>
          {L('Здесь появятся достижения и прогресс ваших друзей', 'Тут з\'являться досягнення та прогрес ваших друзів', 'Aquí aparecerán logros y progreso de tus amigos')}
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
          {L('Обновить', 'Оновити', 'Actualizar')}
        </Text>
      </TouchableOpacity>
      {events.map(event => {
        const profile = profiles[event.uid];
        const name = profile?.name ?? L('Друг', 'Друг', 'Amigo');
        const color = eventIconColor(event.type, t.accent);
        const likeCount = Math.max(0, Math.floor(Number(event.activityLikeCount ?? 0) || 0));
        const likedToday = todayLike?.targetUid === event.uid && todayLike?.eventId === event.id;
        const busy = likeBusyEventId === `${event.uid}:${event.id}`;
        return (
          <View
            key={`${event.uid}:${event.id}`}
            testID={`friends-activity-row-${event.uid}-${event.id}`}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              backgroundColor: t.bgCard, borderRadius: 16, padding: 14, marginBottom: 10,
              borderWidth: 0.5, borderColor: t.border,
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
              accessibilityLabel={L('Лайк за активность', 'Лайк за активність', 'Like de actividad')}
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 14,
                paddingHorizontal: 7,
                paddingVertical: 5,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: likedToday ? 'rgba(255,45,85,0.16)' : t.bgSurface,
                borderWidth: 0.5,
                borderColor: likedToday ? 'rgba(255,45,85,0.55)' : t.border,
                opacity: busy ? 0.55 : 1,
              }}
            >
              <Ionicons name={likedToday ? 'heart' : 'heart-outline'} size={19} color={likedToday ? '#FF2D55' : t.textMuted} />
              <Text style={{ color: likedToday ? '#FF2D55' : t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '900', marginTop: 1 }}>
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
  loadError, onRetryLoad, lang, t, f,
}: {
  visible: boolean; onClose: () => void;
  myCode: string | null; onCopy: () => void; onShare: () => void; copied: boolean;
  codeInput: string; setCodeInput: (v: string) => void;
  isSearching: boolean; foundUser: FriendProfile | null; searchError: string | null;
  isAdding: boolean; addFeedback: string | null;
  onSearch: () => void; onAddFound: () => void; onCloseFoundUser: () => void;
  loadError: boolean; onRetryLoad: () => void;
  lang: string; t: any; f: any;
}) {
  const L = (ru: string, uk: string, es: string) => triLang(lang as any, { ru, uk, es });
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={['top', 'right', 'bottom', 'left']}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
            <Text style={{ flex: 1, fontSize: f.h2 ?? 22, fontWeight: '800', color: t.textPrimary }}>
              {L('Добавить друга', 'Додати друга', 'Agregar amigo')}
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
              copied={copied} lang={lang} t={t} f={f}
              layout="standalone"
              loadError={loadError}
              onRetryLoad={onRetryLoad}
            />
            <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
              {L('Введите код друга', 'Введіть код друга', 'Ingresa el código del amigo')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
                testID="friends-code-input"
                style={{
                  flex: 1, backgroundColor: t.bgSurface, borderRadius: 12,
                  paddingHorizontal: 16, paddingVertical: 13,
                  fontSize: 20, fontWeight: '800', color: t.textPrimary,
                  letterSpacing: 4, borderWidth: 0.5, borderColor: t.border,
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
                  backgroundColor: codeInput.length === 6 ? t.accent : t.bgSurface,
                  borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center',
                  borderWidth: 0.5, borderColor: codeInput.length === 6 ? t.accent : t.border,
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
                isAdding={isAdding} lang={lang} t={t} f={f}
              />
            )}

            {addFeedback && (
              <View testID="friends-add-feedback" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                <Text style={{ color: '#34C759', fontSize: f.sub, fontWeight: '600' }}>{addFeedback}</Text>
              </View>
            )}
          </ScrollView>
        </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FriendsTabScreen() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { isPremium } = usePremium();
  const router = useRouter();
  const { goHome } = useTabNav();
  const L = (ru: string, uk: string, es: string) => triLang(lang, { ru, uk, es });

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
      const from = first.fromName || L('друг', 'друг', 'amigo');
      const gift = first.giftLabel || first.giftId;
      showFeedback(
        gifts.length === 1
          ? L(`${from} подарил: ${gift}`, `${from} подарував: ${gift}`, `${from} te regaló: ${gift}`)
          : L(`Новые подарки от друзей: ${gifts.length}`, `Нові подарунки від друзів: ${gifts.length}`, `Regalos nuevos de amigos: ${gifts.length}`),
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
  }, [L]);

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
        setSearchError(L('Пользователь с таким кодом не найден', 'Користувача з таким кодом не знайдено', 'No se encontró usuario con ese código'));
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
      setSearchError(L('Ошибка. Попробуйте ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo'));
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
        showFeedback(L('Заявка отправлена!', 'Заявку надіслано!', '¡Solicitud enviada!'));
      } else if (result === 'already_friends') {
        setFoundUser(null);
        showFeedback(L('Вы уже друзья', 'Ви вже друзі', 'Ya son amigos'));
      } else if (result === 'already_sent') {
        setFoundUser(null);
        showFeedback(L('Заявка уже отправлена', 'Заявку вже надіслано', 'Solicitud ya enviada'));
      } else if (result === 'self') {
        setFoundUser(null);
        showFeedback(randomSelfFriendCodeMessage(L));
      } else {
        showFeedback(L('Ошибка. Попробуйте ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo'));
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
      showFeedback(L('Ошибка. Попробуйте ещё раз', 'Помилка. Спробуйте ще раз', 'Error. Inténtalo de nuevo'));
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
      message: L('Мой код в PhraseMan:', 'Мій код у PhraseMan:', 'Mi código en PhraseMan:') + ' ' + myCode,
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
    triLang(lang, { ru: gift.labelRu, uk: gift.labelUk, es: gift.labelEs });

  const giftDescription = (gift: (typeof FRIEND_GIFT_CATALOG)[number]) =>
    triLang(lang, { ru: gift.descRu, uk: gift.descUk, es: gift.descEs });

  const handleSendGift = async (giftId: FriendGiftId) => {
    if (!giftTarget || giftBusyId) return;
    const gift = FRIEND_GIFT_CATALOG.find(x => x.id === giftId);
    if (!gift) return;
    if (!isFriendGiftsCloudEnabled()) {
      showFeedback(L('Подарки доступны только с облачной синхронизацией', 'Подарунки доступні лише з хмарною синхронізацією', 'Los regalos requieren sincronizacion en la nube'));
      return;
    }
    if (giftBalance < gift.costShards) {
      showFeedback(L('Не хватает осколков', 'Не вистачає осколків', 'No tienes suficientes fragmentos'));
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
      showFeedback(L('Подарок отправлен', 'Подарунок надіслано', 'Regalo enviado'));
      await trackActivity('friends:send_gift', {
        feature: 'friends',
        screen: 'friends',
        result: 'success',
        tags: { giftId, targetUid: target.uid, cost: gift.costShards },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('resource-exhausted') || msg.includes('limit')) {
        showFeedback(L('Лимит подарков на сегодня уже исчерпан', 'Ліміт подарунків на сьогодні вже вичерпано', 'Ya alcanzaste el limite de regalos de hoy'));
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
          ? L('Не хватает осколков или дружба уже не активна', 'Не вистачає осколків або дружба вже не активна', 'Faltan fragmentos o la amistad ya no esta activa')
          : L('Не удалось отправить подарок', 'Не вдалося надіслати подарунок', 'No se pudo enviar el regalo'),
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
    <View testID="screen-friends" style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: PX }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 6, marginBottom: 14 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={L('На главную', 'На головну', 'Inicio')}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border,
              justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0,
            }}
            onPress={() => { hapticTap(); goHome(); }}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900', letterSpacing: -0.5, flex: 1 }}>
            {L('Друзья', 'Друзі', 'Amigos')}
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
          flexDirection: 'row', backgroundColor: t.bgCard,
          borderRadius: 14, padding: 3, marginBottom: 20,
          borderWidth: 0.5, borderColor: t.border,
        }}>
          {(['friends', 'activity'] as const).map(tab => {
            const active = activeTab === tab;
            const label = tab === 'friends'
              ? L('Друзья', 'Друзі', 'Amigos')
              : L('Активность', 'Активність', 'Actividad');
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
                    {L('Активные заявки', 'Активні заявки', 'Solicitudes activas')}
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
                          showFeedback(L('Ошибка при принятии. Попробуйте ещё раз', 'Помилка. Спробуйте ще раз', 'Error al aceptar'));
                        });
                    }}
                    onDecline={() => { hapticTap(); void declineFriendRequest(req.fromUid); }}
                    lang={lang} t={t} f={f}
                  />
                ))}
              </>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
              <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
                {L('Список друзей', 'Список друзів', 'Lista de amigos')}
              </Text>
              {sortedFriends.length > 0 && (
                <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                  {L('по XP', 'за XP', 'por XP')}
                </Text>
              )}
            </View>

            {sortedFriends.length === 0 ? (
              !showFriendsEmpty ? null : (
              <View testID="friends-empty-state" style={{
                backgroundColor: t.bgCard, borderRadius: 20, padding: 32,
                alignItems: 'center', gap: 12, borderWidth: 0.5, borderColor: t.border,
              }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: t.bgSurface, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={28} color={t.textMuted} />
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                  {L('Пока нет друзей', 'Поки немає друзів', 'Sin amigos aún')}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', lineHeight: 20 }}>
                  {L('Нажмите иконку + вверху справа', 'Натисніть іконку + вгорі праворуч', 'Pulsa el ícono + arriba a la derecha')}
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
                  lang={lang} t={t} f={f}
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
          />
        )}

        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <ReportErrorButton
            screen="friends_tab"
            dataId="friends_tab_main"
            dataText={L('Вкладка друзья', 'Вкладка друзі', 'Pestaña amigos')}
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
        lang={lang} t={t} f={f}
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
            backgroundColor: t.bgCard,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 18,
            paddingBottom: 28,
            gap: 12,
            borderWidth: 0.5,
            borderColor: t.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {giftTarget ? (
                <PremiumAvatarHalo enabled={giftTarget.isPremium} avatarSize={44} maskColor={t.bgCard}>
                  <AvatarView avatar={giftTarget.avatar} totalXP={giftTarget.totalXp} size={44} auraId={getEffectiveAvatarAuraId(giftTarget.aura, giftTarget.isPremium)} />
                </PremiumAvatarHalo>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '900' }}>
                  {L('Подарок другу', 'Подарунок другу', 'Regalo para amigo')}
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
                  backgroundColor: t.bgSurface,
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
              backgroundColor: t.bgSurface,
            }}>
              <Ionicons name="diamond-outline" size={15} color={t.accent} />
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}>{giftBalance}</Text>
            </View>

            {FRIEND_GIFT_CATALOG.map(gift => {
              const cannotAfford = giftBalance < gift.costShards;
              const disabled = giftBusyId !== null;
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
                    backgroundColor: t.bgSurface,
                    opacity: disabled ? 0.45 : cannotAfford ? 0.72 : 1,
                    borderWidth: 0.5,
                    borderColor: t.border,
                  }}
                >
                  <View style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: t.bgCard,
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
                  {giftBusyId === gift.id ? (
                    <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '900', minWidth: 48, textAlign: 'right' }}>
                      {cannotAfford
                        ? L(`+${gift.costShards - giftBalance} 💎`, `+${gift.costShards - giftBalance} 💎`, `+${gift.costShards - giftBalance} 💎`)
                        : `${gift.costShards} 💎`}
                    </Text>
                  ) : (
                    <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '900', minWidth: 48, textAlign: 'right' }}>
                      {cannotAfford
                        ? L(`+${gift.costShards - giftBalance} 💎`, `+${gift.costShards - giftBalance} 💎`, `+${gift.costShards - giftBalance} 💎`)
                        : `${gift.costShards} 💎`}
                    </Text>
                  )}
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
        title={L('Отправить подарок?', 'Надіслати подарунок?', '¿Enviar regalo?')}
        message={
          giftConfirm
            ? L(
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} за ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} осколков`,
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} за ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} осколків`,
                `${giftConfirm.target.name}: ${giftLabel(FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId) ?? FRIEND_GIFT_CATALOG[0])} por ${FRIEND_GIFT_CATALOG.find(x => x.id === giftConfirm.giftId)?.costShards ?? 0} fragmentos`,
              )
            : ''
        }
        cancelLabel={L('Отмена', 'Скасувати', 'Cancelar')}
        confirmLabel={L('Подарить', 'Подарувати', 'Regalar')}
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
        title={L('Удалить друга?', 'Видалити друга?', '¿Eliminar amigo?')}
        message={deleteTarget?.name ?? ''}
        cancelLabel={L('Отмена', 'Скасувати', 'Cancelar')}
        confirmLabel={L('Удалить', 'Видалити', 'Eliminar')}
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
                showFeedback(L('Ошибка удаления. Попробуйте ещё раз', 'Помилка видалення. Спробуйте ще раз', 'Error al eliminar. Inténtalo de nuevo'));
              });
          }
        }}
      />
    </View>
  );
}
