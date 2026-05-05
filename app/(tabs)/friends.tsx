import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Alert, Share, Keyboard, FlatList,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { usePremium } from '../../components/PremiumContext';
import AvatarView from '../../components/AvatarView';
import PremiumAvatarHalo from '../../components/PremiumAvatarHalo';
import PremiumGoldUserName from '../../components/PremiumGoldUserName';
import UnifiedPlayerModal, { PlayerInfo } from '../../components/PlayerProfileModal';
import ContentWrap from '../../components/ContentWrap';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import { getLevelFromXP, getXPProgress } from '../../constants/theme';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { ensureMyFriendCode, lookupUserByFriendCode } from '../firestore_friends';
import {
  sendFriendRequest, acceptFriendRequest, declineFriendRequest, deleteFriend,
  subscribeToFriends, subscribeToIncomingRequests,
  type FriendEntry, type FriendRequestEntry,
} from '../firestore_friend_requests';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getCanonicalUserId } from '../user_id_policy';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// ── Firestore accessor ────────────────────────────────────────────────────────

const getDb = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return require('@react-native-firebase/firestore').default();
  } catch { return null; }
};

// ── Profile fetch ─────────────────────────────────────────────────────────────

async function fetchFriendProfile(uid: string): Promise<FriendProfile> {
  const fallback: FriendProfile = {
    uid, name: 'Игрок', totalXp: 0, weeklyXp: 0, streak: 0, isPremium: false,
    avatar: String(getBestAvatarForLevel(1)), frame: String(getBestFrameForLevel(1)),
  };
  try {
    const db = getDb();
    if (!db) return fallback;
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
    const name = (d.displayName as string) || (p.displayName as string) || 'Игрок';
    return { uid, name, totalXp, weeklyXp, streak, isPremium, avatar, frame };
  } catch { return fallback; }
}

async function fetchMyProfile() {
  try {
    const db = getDb();
    const myUid = await getCanonicalUserId();
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

function RequestRow({ profile, onAccept, onDecline, t, f }: {
  profile: FriendProfile; onAccept: () => void; onDecline: () => void; t: any; f: any;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.bgCard, borderRadius: 16, padding: 14, marginBottom: 10,
      borderWidth: 1, borderColor: t.accent + '44', gap: 12,
    }}>
      <PremiumAvatarHalo enabled={profile.isPremium} avatarSize={40} maskColor={t.bgCard}>
        <AvatarView avatar={profile.avatar} totalXP={profile.totalXp} size={40} />
      </PremiumAvatarHalo>
      <View style={{ flex: 1 }}>
        {profile.isPremium
          ? <PremiumGoldUserName text={profile.name} fontSize={f.body} />
          : <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }} numberOfLines={1}>{profile.name}</Text>
        }
        <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 1 }}>
          Lv {getLevelFromXP(profile.totalXp)} • {profile.totalXp.toLocaleString()} XP
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={onAccept}
          style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDecline}
          style={{ backgroundColor: t.bgSurface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 0.5, borderColor: t.border }}
        >
          <Ionicons name="close" size={18} color={t.textMuted} />
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
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="person-add" size={18} color="#fff" />
        }
        <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '800' }}>
          {triLang(lang as any, { ru: 'Добавить в друзья', uk: 'Додати в друзі', es: 'Agregar amigo' })}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Code card ─────────────────────────────────────────────────────────────────

function CodeCard({ code, onCopy, onShare, copied, lang, t, f }: {
  code: string | null; onCopy: () => void; onShare: () => void;
  copied: boolean; lang: string; t: any; f: any;
}) {
  return (
    <View style={{
      backgroundColor: t.bgCard, borderRadius: 20, padding: 20,
      alignItems: 'center', gap: 14, borderWidth: 0.5, borderColor: t.border,
      marginBottom: 24,
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
      ) : (
        <ActivityIndicator size="small" color={t.accent} />
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FriendsTabScreen() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { isPremium } = usePremium();
  const L = (ru: string, uk: string, es: string) => triLang(lang, { ru, uk, es });

  const [myCode, setMyCode] = useState<string | null>(null);
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
  const [isLoading, setIsLoading] = useState(true);

  const friendsFiredRef = useRef(false);
  const requestsFiredRef = useRef(false);

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);

  // ── My code + my data ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    void ensureMyFriendCode().then(code => { if (!cancelled) setMyCode(code); });
    void fetchMyProfile().then(p => { if (!cancelled && p) setMyProfile(p); });
    void AsyncStorage.getItem('weekly_xp').then(v => {
      if (!cancelled) setMyWeeklyXp(parseInt(v ?? '0') || 0);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Real-time subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    const done = () => {
      if (!friendsFiredRef.current) {
        friendsFiredRef.current = true;
        if (requestsFiredRef.current) setIsLoading(false);
      }
    };
    const unsub = subscribeToFriends(data => { setFriends(data); done(); }, () => done());
    return () => unsub();
  }, []);

  useEffect(() => {
    const done = () => {
      if (!requestsFiredRef.current) {
        requestsFiredRef.current = true;
        if (friendsFiredRef.current) setIsLoading(false);
      }
    };
    const unsub = subscribeToIncomingRequests(data => { setRequests(data); done(); }, () => done());
    return () => unsub();
  }, []);

  // Fallback spinner timeout
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(timer);
  }, []);

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
        showFeedback(L('Это ваш код', 'Це ваш код', 'Es tu código'));
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
    Alert.alert(
      L('Удалить друга?', 'Видалити друга?', '¿Eliminar amigo?'),
      name,
      [
        { text: L('Отмена', 'Скасувати', 'Cancelar'), style: 'cancel' },
        { text: L('Удалить', 'Видалити', 'Eliminar'), style: 'destructive', onPress: () => void deleteFriend(uid) },
      ],
    );
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

  // ── Derived ────────────────────────────────────────────────────────────────

  const sortedFriends = [...friends]
    .map(f => profiles[f.uid])
    .filter(Boolean)
    .sort((a, b) => (b?.totalXp ?? 0) - (a?.totalXp ?? 0)) as FriendProfile[];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <ContentWrap>

          {/* Header */}
          <View style={{ paddingTop: 8, paddingBottom: 20 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900', letterSpacing: -0.5 }}>
              {L('Друзья', 'Друзі', 'Amigos')}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
              {sortedFriends.length > 0
                ? L(`${sortedFriends.length} ${sortedFriends.length === 1 ? 'друг' : 'друзей'}`, `${sortedFriends.length} друзів`, `${sortedFriends.length} amigos`)
                : L('Добавляйте друзей и соревнуйтесь', 'Додавайте друзів і змагайтеся', 'Añade amigos y compite')
              }
            </Text>
          </View>

          {/* My code */}
          <CodeCard
            code={myCode} onCopy={handleCopy} onShare={handleShare}
            copied={copied} lang={lang} t={t} f={f}
          />

          {/* Search */}
          <View style={{
            backgroundColor: t.bgCard, borderRadius: 20, padding: 16,
            borderWidth: 0.5, borderColor: t.border, marginBottom: 24, gap: 12,
          }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
              {L('Найти друга по коду', 'Знайти друга за кодом', 'Buscar amigo por código')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={{
                  flex: 1, backgroundColor: t.bgSurface, borderRadius: 12,
                  paddingHorizontal: 16, paddingVertical: 13,
                  fontSize: 20, fontWeight: '800', color: t.textPrimary,
                  letterSpacing: 4, borderWidth: 0.5, borderColor: t.border,
                }}
                placeholder="XXXXXX"
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
                  ? <ActivityIndicator size="small" color={codeInput.length === 6 ? '#fff' : t.textMuted} />
                  : <Ionicons name="search" size={22} color={codeInput.length === 6 ? '#fff' : t.textMuted} />
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

          {/* Incoming requests */}
          {requests.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {L('Заявки', 'Заявки', 'Solicitudes')}
                </Text>
                <View style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{requests.length}</Text>
                </View>
              </View>
              {requests.map(req => {
                const profile = profiles[req.fromUid];
                if (!profile) return (
                  <View key={req.fromUid} style={{ height: 70, backgroundColor: t.bgCard, borderRadius: 16, marginBottom: 10, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={t.accent} />
                  </View>
                );
                return (
                  <RequestRow
                    key={req.fromUid} profile={profile}
                    onAccept={() => { hapticTap(); void acceptFriendRequest(req.fromUid); }}
                    onDecline={() => { hapticTap(); void declineFriendRequest(req.fromUid); }}
                    t={t} f={f}
                  />
                );
              })}
            </>
          )}

          {/* Friends list */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
            <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
              {L('Друзья', 'Друзі', 'Amigos')}
            </Text>
            {sortedFriends.length > 0 && (
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {L('по XP за всё время', 'за XP за весь час', 'por XP total')}
              </Text>
            )}
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={t.accent} />
            </View>
          ) : sortedFriends.length === 0 ? (
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
                {L('Поделитесь своим кодом или введите код друга выше', 'Поділіться своїм кодом або введіть код друга вище', 'Comparte tu código o ingresa el de un amigo arriba')}
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

        </ContentWrap>
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
    </SafeAreaView>
  );
}
