import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Share, Keyboard, StyleSheet, Modal,
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
import UnifiedPlayerModal, { PlayerInfo } from '../../components/PlayerProfileModal';
import ThemedConfirmModal from '../../components/ThemedConfirmModal';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import { getLevelFromXP, getXPProgress } from '../../constants/theme';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
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
import { trackActivity } from '../app_activity';

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
    frame: String(getBestFrameForLevel(1)),
  };
}

async function fetchFriendProfileFromFirestore(uid: string): Promise<FriendProfile | null> {
  try {
    const db = getDb();
    if (!db) return null;
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) {
      console.warn('[friendProfile] doc missing for uid:', uid);
      return null;
    }
    const d: Record<string, unknown> = snap.data() ?? {};
    const p = (d.progress as Record<string, unknown>) ?? {};
    const totalXp = parseInt((p.user_total_xp as string) ?? '0') || 0;
    const weeklyXp = parseInt((p.weekly_xp as string) ?? '0') || 0;
    const streak = parseInt((p.streak_count as string) ?? '0') || 0;
    const isPremium = (p.premium_plan as string) === 'monthly' || (p.premium_plan as string) === 'annual';
    const level = getLevelFromXP(totalXp);
    const avatarRaw = typeof p.user_avatar === 'string' ? p.user_avatar.trim() : '';
    const frameRaw = typeof p.user_avatar_frame === 'string'
      ? p.user_avatar_frame.trim()
      : (typeof p.user_frame === 'string' ? p.user_frame.trim() : '');
    const linked = (d.linkedAuth as Record<string, unknown> | undefined) ?? {};
    const nameRaw =
      (d.displayName as string) ||
      (d.name as string) ||
      (p.displayName as string) ||
      (p.display_name as string) ||
      (p.user_name as string) ||
      (typeof linked.displayName === 'string' ? linked.displayName : '') ||
      (typeof linked.name === 'string' ? linked.name : '');
    console.warn('[friendProfile] uid:', uid, 'name:', JSON.stringify(nameRaw), 'xp:', totalXp, 'progressKeys:', Object.keys(p));
    return {
      uid,
      name: nameRaw.trim() || 'Игрок',
      totalXp, weeklyXp, streak, isPremium,
      avatar: avatarRaw || String(getBestAvatarForLevel(level)),
      frame: frameRaw || String(getBestFrameForLevel(level)),
    };
  } catch (e) {
    console.warn('[friendProfile] error for uid:', uid, String(e));
    return null;
  }
}

/**
 * Загружает профили для списка uid.
 * - Из кеша (TTL 5 мин) — мгновенно без Firestore.
 * - Просроченные или отсутствующие — из Firestore, результат кешируется.
 * Возвращает Map uid→профиль; отсутствующие в Firestore не включаются.
 */
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
      // Сразу показываем последний сохранённый профиль (даже если TTL вышел); обновление — в фоне.
      result[uid] = entry.profile;
      if (now - entry.fetchedAt >= PROFILE_TTL_MS) toFetch.push(uid);
    } else {
      toFetch.push(uid);
    }
  }

  if (toFetch.length > 0) {
    // Убеждаемся что Auth готов один раз перед параллельными запросами.
    await ensureAnonUser();
    const fetched = await Promise.all(toFetch.map(fetchFriendProfileFromFirestore));
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
    // Обновляем модульный кеш сразу — переживает ремаунты компонента.
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
    return {
      name: (d.displayName as string) || (p.displayName as string) || (p.user_name as string) || 'Я',
      avatar: avatarRaw || String(getBestAvatarForLevel(level)),
      frame: frameRaw || String(getBestFrameForLevel(level)),
      totalXP: totalXp,
      streak: streak ?? null,
      isPremium,
    };
  } catch { return null; }
}

/** Коротко: 11324 → 11.3k, 1 200 000 → 1.2M — чтобы строка на карточке не расползалась. */
function formatCompactWeeklyXpDiff(absDiff: number): string {
  const a = Math.abs(Math.round(absDiff));
  if (a >= 1_000_000) {
    const v = a / 1_000_000;
    const s = v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10).replace(/\.0$/, '');
    return `${s}M`;
  }
  if (a >= 1000) {
    const v = a / 1000;
    const s = v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10).replace(/\.0$/, '');
    return `${s}k`;
  }
  return String(a);
}

// ── Weekly comparison badge ───────────────────────────────────────────────────

function WeeklyBadge({ myWeekly, friendWeekly, lang, textMuted }: {
  myWeekly: number; friendWeekly: number; lang: string;
  textMuted: string;
}) {
  if (myWeekly === 0 && friendWeekly === 0) return null;
  const diff = myWeekly - friendWeekly;
  if (Math.abs(diff) < 10) return null;
  const ahead = diff > 0;
  const color = ahead ? '#34C759' : '#FF6B6B';
  const icon = ahead ? 'trending-up' : 'trending-down';
  const compact = formatCompactWeeklyXpDiff(diff);
  const sign = ahead ? '+' : '−';
  const tail = ahead
    ? triLang(lang as any, { ru: 'впереди', uk: 'попереду', es: 'adelante' })
    : triLang(lang as any, { ru: 'отстаёшь', uk: 'відстаєш', es: 'atrás' });
  const weekTag = triLang(lang as any, { ru: 'нед', uk: 'тиж', es: 'sem' });
  const accessibilityLabel = ahead
    ? triLang(lang as any, {
        ru: `По неделе ты впереди на ${diff} XP`,
        uk: `За тиждень ти попереду на ${diff} XP`,
        es: `Esta semana llevas ${diff} XP más que este amigo`,
      })
    : triLang(lang as any, {
        ru: `По неделе ты отстаёшь на ${Math.abs(diff)} XP`,
        uk: `За тиждень ти відстаєш на ${Math.abs(diff)} XP`,
        es: `Esta semana este amigo lleva ${Math.abs(diff)} XP más que tú`,
      });

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2, maxWidth: '100%' }}
    >
      <Ionicons name={icon as any} size={11} color={color} />
      <Text style={{ fontSize: 11, color, fontWeight: '700' }} numberOfLines={1}>
        {sign}
        {compact}
      </Text>
      <Text style={{ fontSize: 10, color: textMuted, fontWeight: '600', opacity: 0.85 }} numberOfLines={1}>
        {'XP · '}
        {weekTag}
        {' · '}
      </Text>
      <Text style={{ fontSize: 11, color, fontWeight: '600' }} numberOfLines={1}>
        {tail}
      </Text>
    </View>
  );
}

// ── XP Bar ────────────────────────────────────────────────────────────────────

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
  profile, myWeekly, rank, onPress, onDelete, lang, t, f,
}: {
  profile: FriendProfile; myWeekly: number; rank: number;
  onPress: () => void; onDelete: () => void;
  lang: string; t: any; f: any;
}) {
  const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : t.textMuted;
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
        <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={44} />
      </PremiumAvatarHalo>
      <View style={{ flex: 1, minWidth: 0 }}>
        {profile.isPremium
          ? <PremiumGoldUserName text={profile.name} fontSize={f.body} />
          : <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>{profile.name}</Text>
        }
        <MiniXpBar xp={profile.totalXp} color={t.textSecond} />
        <WeeklyBadge myWeekly={myWeekly} friendWeekly={profile.weeklyXp} lang={lang} textMuted={t.textMuted} />
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
        {profile.streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 13 }}>🔥</Text>
            <Text style={{ fontSize: f.sub, color: '#FF9500', fontWeight: '700' }}>{profile.streak}</Text>
          </View>
        )}
        <TouchableOpacity
          testID={`friend-delete-${profile.uid}`}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Ionicons name="person-remove-outline" size={16} color={t.textMuted} />
        </TouchableOpacity>
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
  return (
    <View testID={`friend-request-row-${profile.uid}`} style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.bgCard, borderRadius: 16, padding: 14, marginBottom: 10,
      borderWidth: 0.5, borderColor: t.border, gap: 12,
    }}>
      <PremiumAvatarHalo enabled={profile.isPremium} avatarSize={44} maskColor={t.bgCard}>
        <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={44} />
      </PremiumAvatarHalo>
      <View style={{ flex: 1, minWidth: 0 }}>
        {profile.isPremium
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
  return (
    <View testID="friends-found-user-card" style={{
      backgroundColor: t.bgCard, borderRadius: 20, padding: 20, marginTop: 12,
      borderWidth: 1, borderColor: t.accent + '55', gap: 16,
      shadowColor: t.accent, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PremiumAvatarHalo enabled={profile.isPremium} avatarSize={56} maskColor={t.bgCard}>
          <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={56} />
        </PremiumAvatarHalo>
        <View style={{ flex: 1 }}>
          {profile.isPremium
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
        {isAdding
          ? <ActivityIndicator size="small" color={t.correctText} />
          : <Ionicons name="person-add" size={18} color={t.correctText} />
        }
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
          }}>
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
        }}>
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
  const L = (ru: string, uk: string, es: string) => triLang(lang as any, { ru, uk, es });

  const load = useCallback(async (force = false) => {
    if (friendUids.length === 0) { setEvents([]); return; }
    if (force) setRefreshing(true); else setLoading(true);
    const result = await fetchFriendsActivityFeed(friendUids, force);
    setEvents(result);
    if (force) setRefreshing(false); else setLoading(false);
  }, [friendUids]);

  // Без force кэш ленты (30 мин) долго показывает пустоту после событий у друзей.
  useEffect(() => { void load(true); }, [load]);

  if (friendUids.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
        <Ionicons name="people-outline" size={40} color={t.textMuted} />
        <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
          {L('Добавьте друзей, чтобы видеть их активность', 'Додайте друзів, щоб бачити їхню активність', 'Agrega amigos para ver su actividad')}
        </Text>
      </View>
    );
  }

  if (loading) {
    return <ActivityIndicator color={t.accent} style={{ marginTop: 40 }} />;
  }

  if (events.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
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
    <>
      <TouchableOpacity
        onPress={() => { hapticTap(); void load(true); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: 12 }}
        activeOpacity={0.7}
      >
        {refreshing
          ? <ActivityIndicator size="small" color={t.textMuted} />
          : <Ionicons name="refresh-outline" size={16} color={t.textMuted} />
        }
        <Text style={{ color: t.textMuted, fontSize: f.sub }}>
          {L('Обновить', 'Оновити', 'Actualizar')}
        </Text>
      </TouchableOpacity>
      {events.map(event => {
        const profile = profiles[event.uid];
        const name = profile?.name ?? L('Друг', 'Друг', 'Amigo');
        const color = eventIconColor(event.type, t.accent);
        return (
          <View
            key={event.id}
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
          </View>
        );
      })}
    </>
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
          {/* Header */}
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
            {/* My code */}
            <CodeCard
              code={myCode} onCopy={onCopy} onShare={onShare}
              copied={copied} lang={lang} t={t} f={f}
              layout="standalone"
              loadError={loadError}
              onRetryLoad={onRetryLoad}
            />

            {/* Search */}
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
                {isSearching
                  ? <ActivityIndicator size="small" color={codeInput.length === 6 ? t.correctText : t.textMuted} />
                  : <Ionicons name="search" size={22} color={codeInput.length === 6 ? t.correctText : t.textMuted} />
                }
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
  const { goHome } = useTabNav();
  const L = (ru: string, uk: string, es: string) => triLang(lang, { ru, uk, es });

  /** Только код из `ensure…` — без старого кеша первым кадром (не мигать «чужим» кодом). */
  const [myCode, setMyCode] = useState<string | null>(null);
  const [friendCodeLoadError, setFriendCodeLoadError] = useState(false);
  const [myWeeklyXp, setMyWeeklyXp] = useState(0);
  const [myProfile, setMyProfile] = useState<{
    name: string; avatar: string; frame: string; totalXP: number; streak: number | null;
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
    void AsyncStorage.getItem('weekly_xp').then(v => {
      if (mountedRef.current) setMyWeeklyXp(parseInt(v ?? '0') || 0);
    });
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

  useFocusEffect(
    useCallback(() => {
      void ensureFriendRequestViewerAuthLink();
    }, []),
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
      const profile: FriendProfile = fetched ?? {
        uid: result.uid, name: 'Игрок', totalXp: 0, weeklyXp: 0, streak: 0, isPremium: false,
        avatar: String(getBestAvatarForLevel(1)), frame: String(getBestFrameForLevel(1)),
      };
      setFoundUser(profile);
      await trackActivity('friends:search_result', {
        feature: 'friends',
        screen: 'friends',
        result: 'success',
        tags: { targetUid: result.uid, profileLoaded: fetched != null },
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

  const openProfile = (profile: FriendProfile) => {
    hapticTap();
    setSelectedPlayer({
      name: profile.name,
      points: profile.totalXp,
      totalXp: profile.totalXp,
      weekXp: profile.weeklyXp,
      isMe: false,
      uid: profile.uid,
      isPremium: profile.isPremium,
      avatar: profile.avatar,
      frame: profile.frame,
      streak: profile.streak,
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

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 6, marginBottom: 14 }}>
          {/* Back */}
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

          {/* Title */}
          <Text style={{ color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900', letterSpacing: -0.5, flex: 1 }}>
            {L('Друзья', 'Друзі', 'Amigos')}
          </Text>

          {/* Add friend — круглая иконка */}
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

        {/* Tab switcher */}
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

        {/* ── Вкладка Друзья ── */}
        {activeTab === 'friends' && (
          <>
            {/* Активные входящие заявки */}
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

            {/* Список друзей */}
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
                  myWeekly={myWeeklyXp}
                  rank={i + 1}
                  onPress={() => openProfile(profile)}
                  onDelete={() => handleDeleteConfirm(profile.uid, profile.name)}
                  lang={lang} t={t} f={f}
                />
              ))
            )}
          </>
        )}

        {/* ── Вкладка Активность ── */}
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

      {/* Модал добавления друга */}
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

      <UnifiedPlayerModal
        player={selectedPlayer}
        myInfo={{
          name: myProfile?.name ?? 'Я',
          avatar: myProfile?.avatar ?? String(getBestAvatarForLevel(1)),
          frame: myProfile?.frame ?? String(getBestFrameForLevel(1)),
          totalXP: myProfile?.totalXP ?? 0,
          streak: myProfile?.streak ?? null,
        }}
        onClose={() => setSelectedPlayer(null)}
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
