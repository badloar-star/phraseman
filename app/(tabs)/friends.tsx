import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Share, Keyboard, StyleSheet,
} from 'react-native';
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
import { ensureMyInviteCodeForFriends, lookupUserByFriendCode } from '../firestore_friends';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  subscribeToFriends,
  subscribeToIncomingRequests,
  ensureFriendRequestViewerAuthLink,
  type FriendEntry,
  type FriendRequestEntry,
} from '../firestore_friend_requests';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getCanonicalUserId } from '../user_id_policy';
import { ensureAnonUser } from '../cloud_sync';
import { randomSelfFriendCodeMessage } from '../friends_self_code_messages';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReportErrorButton from '../../components/ReportErrorButton';
import { useTabNav } from '../TabContext';

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

/** Локальный снимок вкладки «Друзья» для мгновенного показа до ответа облака. */
const FRIENDS_TAB_SWR_CACHE_KEY = 'friends_tab_swr_v1';

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

async function fetchFriendProfile(uid: string): Promise<FriendProfile> {
  const fallback: FriendProfile = {
    uid, name: 'Игрок', totalXp: 0, weeklyXp: 0, streak: 0, isPremium: false,
    avatar: String(getBestAvatarForLevel(1)), frame: String(getBestFrameForLevel(1)),
  };
  try {
    const db = getDb();
    if (!db) return fallback;
    await ensureAnonUser();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return fallback;
    const d: Record<string, unknown> = snap.data() ?? {};
    const p = (d.progress as Record<string, unknown>) ?? {};
    const totalXp = parseInt((p.user_total_xp as string) ?? '0') || 0;
    const weeklyXp = parseInt((p.weekly_xp as string) ?? '0') || 0;
    const streak = parseInt((p.streak_count as string) ?? '0') || 0;
    const isPremium = (p.premium_plan as string) === 'monthly' || (p.premium_plan as string) === 'annual';
    const level = getLevelFromXP(totalXp);
    const avatar = String(getBestAvatarForLevel(level));
    const frame = String(getBestFrameForLevel(level));
    const linked = (d.linkedAuth as Record<string, unknown> | undefined) ?? {};
    const nameRaw =
      (d.displayName as string) ||
      (p.displayName as string) ||
      (p.user_name as string) ||
      (typeof linked.displayName === 'string' ? linked.displayName : '');
    const name = nameRaw.trim() || 'Игрок';
    return { uid, name, totalXp, weeklyXp, streak, isPremium, avatar, frame };
  } catch { return fallback; }
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
    return {
      name: (d.displayName as string) || (p.displayName as string) || 'Я',
      avatar: String(getBestAvatarForLevel(level)),
      frame: String(getBestFrameForLevel(level)),
      totalXP: totalXp,
      streak: streak ?? null,
      isPremium,
    };
  } catch { return null; }
}

// ── Weekly comparison badge ───────────────────────────────────────────────────

function WeeklyBadge({ myWeekly, friendWeekly, lang }: {
  myWeekly: number; friendWeekly: number; lang: string;
}) {
  if (myWeekly === 0 && friendWeekly === 0) return null;
  const diff = myWeekly - friendWeekly;
  if (Math.abs(diff) < 10) return null;
  const ahead = diff > 0;
  const color = ahead ? '#34C759' : '#FF6B6B';
  const icon = ahead ? 'trending-up' : 'trending-down';
  const label = ahead
    ? triLang(lang as any, { ru: `+${diff} на этой неделе`, uk: `+${diff} цього тижня`, es: `+${diff} esta semana` })
    : triLang(lang as any, { ru: `${diff} на этой неделе`, uk: `${diff} цього тижня`, es: `${diff} esta semana` });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
      <Ionicons name={icon as any} size={11} color={color} />
      <Text style={{ fontSize: 11, color, fontWeight: '600' }}>{label}</Text>
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
  const level = getLevelFromXP(profile.totalXp);
  const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : t.textMuted;
  return (
    <TouchableOpacity
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
        <WeeklyBadge myWeekly={myWeekly} friendWeekly={profile.weeklyXp} lang={lang} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {profile.streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 13 }}>🔥</Text>
              <Text style={{ fontSize: f.sub, color: '#FF9500', fontWeight: '700' }}>{profile.streak}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="star" size={11} color={t.gold} />
          <Text style={{ color: t.gold, fontSize: f.sub, fontWeight: '700' }}>
            {profile.totalXp.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
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
    <View style={{
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
          onPress={onAccept}
          style={{ backgroundColor: t.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minWidth: 96, alignItems: 'center' }}
        >
          <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '800' }}>{B('Принять', 'Прийняти', 'Aceptar')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
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
    <View style={{
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
    <View style={{
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
          <Text style={{
            fontSize: 36, fontWeight: '900', letterSpacing: 8,
            color: t.textPrimary, fontVariant: ['tabular-nums'],
          }}>
            {code}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
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

  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequestEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, FriendProfile>>({});

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ uid: string; name: string } | null>(null);

  const mountedRef = useRef(true);

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
    void syncMyInviteCode();
    void fetchMyProfile().then(p => { if (mountedRef.current && p) setMyProfile(p); });
    void AsyncStorage.getItem('weekly_xp').then(v => {
      if (mountedRef.current) setMyWeeklyXp(parseInt(v ?? '0') || 0);
    });
    return () => { mountedRef.current = false; };
  }, [syncMyInviteCode]);

  useFocusEffect(
    useCallback(() => {
      void ensureFriendRequestViewerAuthLink();
    }, []),
  );

  // ── Кеш с устройства → подписки (сначала старый снимок, потом тихое обновление из облака) ──

  useEffect(() => {
    let cancelled = false;
    let unsubFriends: () => void = () => {};
    let unsubRequests: () => void = () => {};

    void (async () => {
      const uid = await ensureAnonUser();
      if (!uid) {
        if (!cancelled) {
          setFriends([]);
          setRequests([]);
        }
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(FRIENDS_TAB_SWR_CACHE_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as {
            canonicalUid?: string;
            friends?: FriendEntry[];
            requests?: FriendRequestEntry[];
            profiles?: Record<string, FriendProfile>;
          };
          if (parsed.canonicalUid === uid) {
            if (Array.isArray(parsed.friends)) setFriends(parsed.friends);
            if (Array.isArray(parsed.requests)) setRequests(parsed.requests);
            if (parsed.profiles && typeof parsed.profiles === 'object') setProfiles(parsed.profiles);
          }
        }
      } catch {
        /* ignore */
      }

      if (cancelled) return;

      await ensureFriendRequestViewerAuthLink();
      if (cancelled) return;

      unsubFriends = subscribeToFriends(
        data => { if (!cancelled) setFriends(data); },
        () => {},
      );
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const uid = await getCanonicalUserId();
          if (!uid) return;
          await AsyncStorage.setItem(
            FRIENDS_TAB_SWR_CACHE_KEY,
            JSON.stringify({
              canonicalUid: uid,
              friends,
              requests,
              profiles,
              savedAt: Date.now(),
            }),
          );
        } catch {
          /* ignore */
        }
      })();
    }, 450);
    return () => clearTimeout(timer);
  }, [friends, requests, profiles]);

  // ── Profile loading ────────────────────────────────────────────────────────

  useEffect(() => {
    const uids = [...friends.map(f => f.uid), ...requests.map(r => r.fromUid)];
    const missing = uids.filter(uid => !profiles[uid]);
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(missing.map(fetchFriendProfile)).then(result => {
      if (cancelled) return;
      setProfiles(prev => {
        const next = { ...prev };
        for (const p of result) next[p.uid] = p;
        return next;
      });
    });
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
      const result = await lookupUserByFriendCode(codeInput.toUpperCase());
      if (!result) {
        setSearchError(L('Пользователь с таким кодом не найден', 'Користувача з таким кодом не знайдено', 'No se encontró usuario con ese código'));
        return;
      }
      const codeUpper = codeInput.toUpperCase();
      const myUid = await ensureAnonUser();
      const isSelf =
        (myCode != null && codeUpper === myCode.toUpperCase()) ||
        (myUid != null && result.uid === myUid);
      if (isSelf) {
        setSearchError(randomSelfFriendCodeMessage(L));
        return;
      }
      const profile = await fetchFriendProfile(result.uid);
      setFoundUser(profile);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFound = async () => {
    if (!foundUser || isAdding) return;
    hapticTap();
    setIsAdding(true);
    try {
      const result = await sendFriendRequest(foundUser.uid);
      if (result === 'sent') {
        setFoundUser(null);
        setCodeInput('');
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

  const [addPanelOpen, setAddPanelOpen] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────

  const sortedFriends = useMemo(
    () =>
      [...friends]
        .map(fr => profiles[fr.uid] ?? placeholderFriendProfile(fr.uid))
        .sort((a, b) => b.totalXp - a.totalXp),
    [friends, profiles],
  );

  const PX = 16;
  /** Кнопка «назад» не должна центрироваться по блоку заголовок+подпись — при переносе подписи на 2 строки она «прыгала» вниз. Выравниваем по первой строке заголовка. */
  const friendsTitleFs = typeof f.h1 === 'number' ? f.h1 : 28;
  const friendsTitleLineH = Math.round(friendsTitleFs * 1.2);
  const friendsBackBtnMarginTop = Math.max(0, Math.round((friendsTitleLineH - 36) / 2));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: PX }}
      >

        {/* Header — back по центру только строки заголовка (не всего столбца с подписью) */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: 12, paddingBottom: 6, marginBottom: 14 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={L('На главную', 'На головну', 'Inicio')}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.bgCard,
              borderWidth: 0.5,
              borderColor: t.border,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
              marginTop: friendsBackBtnMarginTop,
              flexShrink: 0,
            }}
            onPress={() => { hapticTap(); goHome(); }}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900', letterSpacing: -0.5 }}>
              {L('Друзья', 'Друзі', 'Amigos')}
            </Text>
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.sub,
                marginTop: 2,
                lineHeight: Math.round((typeof f.sub === 'number' ? f.sub : 14) * 1.35),
                minHeight: Math.round((typeof f.sub === 'number' ? f.sub : 14) * 1.35) * 2,
              }}
              numberOfLines={2}
            >
              {sortedFriends.length > 0
                ? L(`${sortedFriends.length} ${sortedFriends.length === 1 ? 'друг' : 'друзей'}`, `${sortedFriends.length} друзів`, `${sortedFriends.length} amigos`)
                : L('Добавляйте друзей и соревнуйтесь', 'Додавайте друзів і змагайтеся', 'Añade amigos y compite')
              }
            </Text>
          </View>
        </View>

        {/* Add friend button — сверху; «Мой код» под ней / внутри той же выпадающей панели */}
        <TouchableOpacity
          onPress={() => { hapticTap(); setAddPanelOpen(v => !v); setFoundUser(null); setSearchError(null); setCodeInput(''); }}
          activeOpacity={0.8}
          style={{
            backgroundColor: addPanelOpen ? t.bgCard : t.accent,
            borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, marginBottom: 0,
            borderWidth: addPanelOpen ? 0.5 : 0,
            borderColor: addPanelOpen ? t.border : 'transparent',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >
          <Ionicons
            name={addPanelOpen ? 'close' : 'person-add'}
            size={18}
            color={addPanelOpen ? t.textMuted : t.correctText}
          />
          <Text style={{ color: addPanelOpen ? t.textMuted : t.correctText, fontSize: f.body, fontWeight: '700' }}>
            {addPanelOpen
              ? L('Отмена', 'Скасувати', 'Cancelar')
              : L('Добавить друга', 'Додати друга', 'Agregar amigo')
            }
          </Text>
        </TouchableOpacity>

        {!addPanelOpen && (
          <CodeCard
            code={myCode} onCopy={handleCopy} onShare={handleShare}
            copied={copied} lang={lang} t={t} f={f}
            layout="underButton"
            loadError={friendCodeLoadError}
            onRetryLoad={retryFriendCode}
          />
        )}

        {/* Expandable add panel: мой код + поле ввода */}
        {addPanelOpen && (
          <View style={{
            backgroundColor: t.bgCard,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            marginBottom: 24,
            borderWidth: 0.5,
            borderTopWidth: 0,
            borderColor: t.border,
            overflow: 'hidden',
          }}>
            <CodeCard
              code={myCode} onCopy={handleCopy} onShare={handleShare}
              copied={copied} lang={lang} t={t} f={f}
              layout="inSheet"
              loadError={friendCodeLoadError}
              onRetryLoad={retryFriendCode}
            />
            <View style={{ padding: 16, paddingTop: 12, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
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
                  setCodeInput(v.toUpperCase().replace(/[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g, ''));
                  setFoundUser(null);
                  setSearchError(null);
                }}
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                onPress={handleSearch}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
                <Text style={{ color: '#FF6B6B', fontSize: f.sub }}>{searchError}</Text>
              </View>
            )}

            {foundUser && (
              <FoundUserCard
                profile={foundUser} onAdd={handleAddFound} onClose={() => setFoundUser(null)}
                isAdding={isAdding} lang={lang} t={t} f={f}
              />
            )}

            {addFeedback && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                <Text style={{ color: '#34C759', fontSize: f.sub, fontWeight: '600' }}>{addFeedback}</Text>
              </View>
            )}
            </View>
          </View>
        )}

        {/* Активные входящие заявки — над списком друзей */}
        {requests.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 }}>
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
                  acceptFriendRequest(req.fromUid).catch(() => {
                    showFeedback(L('Ошибка при принятии. Попробуйте ещё раз', 'Помилка. Спробуйте ще раз', 'Error al aceptar'));
                  });
                }}
                onDecline={() => { hapticTap(); void declineFriendRequest(req.fromUid); }}
                lang={lang}
                t={t}
                f={f}
              />
            ))}
          </>
        )}

        {/* Friends list */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
          <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
            {L('Друзья', 'Друзі', 'Amigos')}
          </Text>
          {sortedFriends.length > 0 && (
            <Text style={{ color: t.textMuted, fontSize: f.sub }}>
              {L('по XP', 'за XP', 'por XP')}
            </Text>
          )}
        </View>

        {sortedFriends.length === 0 ? (
          <View style={{
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
              {L('Нажмите «Добавить друга» и введите код', 'Натисніть «Додати друга» і введіть код', 'Pulsa «Agregar amigo» e ingresa el código')}
            </Text>
          </View>
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

        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <ReportErrorButton
            screen="friends_tab"
            dataId="friends_tab_main"
            dataText={L('Вкладка друзья', 'Вкладка друзі', 'Pestaña amigos')}
          />
        </View>

      </ScrollView>

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
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) void deleteFriend(target.uid);
        }}
      />
    </View>
  );
}
