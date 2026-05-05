import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import AvatarView from '../components/AvatarView';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import { subscribeToFriends } from './firestore_friend_requests';
import { WEEKLY_XP_KEY } from './weekly_xp';
import {
  sortAndRankHoF,
  isWeeklyAllZero,
  type HoFEntry,
  type RankedHoFEntry,
} from './friends_hof_helpers';
import { triLang } from '../constants/i18n';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';
import { getCanonicalUserId } from './user_id_policy';

// ── Firestore accessor (same pattern as other Firestore files) ────────────────

const getDb = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

// ── Profile fetcher with banned-user filter ───────────────────────────────────

async function fetchFriendProfile(uid: string): Promise<HoFEntry | null> {
  try {
    const db = getDb();
    if (!db) return null;
    const [userSnap, banSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('banned_users').doc(uid).get(),
    ]);
    if (banSnap.exists || !userSnap.exists) return null;
    const data = (userSnap.data() ?? {}) as Record<string, unknown>;
    const progress = (data.progress ?? {}) as Record<string, unknown>;
    return {
      uid,
      name: (data.displayName as string) || (progress.displayName as string) || 'Игрок',
      totalXp: parseInt((progress.user_total_xp as string) ?? '0') || 0,
      weeklyXp: parseInt((progress.weekly_xp as string) ?? '0') || 0,
      isMe: false,
    };
  } catch {
    return null;
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 64;

export default function FriendsHoFScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [mode, setMode] = useState<'alltime' | 'weekly'>('alltime');
  const [entries, setEntries] = useState<HoFEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUid, setMyUid] = useState<string | null>(null);

  // Resolve canonical UID once on mount.
  useEffect(() => { void getCanonicalUserId().then(setMyUid); }, []);

  // Subscribe to friends and rebuild entry list whenever friends or myUid change.
  useEffect(() => {
    let cancelled = false;

    const unsub = subscribeToFriends(
      async (friendEntries) => {
        const profiles = await Promise.all(
          friendEntries.map(f => fetchFriendProfile(f.uid)),
        );
        const valid = profiles.filter((p): p is HoFEntry => p !== null);

        // Self entry from local AsyncStorage (no Firestore read for self).
        const [xpRaw, nameRaw, weeklyRaw] = await AsyncStorage.multiGet([
          'user_total_xp',
          'user_name',
          WEEKLY_XP_KEY,
        ]);
        const self: HoFEntry = {
          uid: myUid ?? '__self__',
          name: nameRaw[1] || triLang(lang, { ru: 'Вы', uk: 'Ви', es: 'Tú' }),
          totalXp: parseInt(xpRaw[1] ?? '0') || 0,
          weeklyXp: parseInt(weeklyRaw[1] ?? '0') || 0,
          isMe: true,
        };

        if (!cancelled) {
          setEntries([...valid, self]);
          setLoading(false);
        }
      },
      () => { if (!cancelled) setLoading(false); },
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [myUid, lang]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const ranked = sortAndRankHoF(entries, mode);
  const weeklyEmpty = mode === 'weekly' && isWeeklyAllZero(entries) && entries.length > 0;
  const myRankIndex = ranked.findIndex(e => e.isMe);

  // ── Row renderer ────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: RankedHoFEntry }) => {
    const xp = mode === 'weekly' ? item.weeklyXp : item.totalXp;
    const level = getLevelFromXP(item.totalXp);
    const avatarId = String(getBestAvatarForLevel(level));
    return (
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            height: ROW_HEIGHT,
            paddingHorizontal: 16,
            gap: 12,
          },
          item.isMe && { backgroundColor: t.correctBg },
        ]}
      >
        <Text style={{ color: t.textMuted, width: 30, fontSize: f.sub }}>#{item.rank}</Text>
        <AvatarView avatar={avatarId} size={36} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: item.isMe ? t.correct : t.textPrimary,
              fontWeight: item.isMe ? '700' : '400',
              fontSize: f.body,
            }}
          >
            {item.name}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.sub }}>Lv {level}</Text>
        </View>
        <Text style={{ color: item.isMe ? t.correct : t.textSecond, fontSize: f.body }}>
          {xp.toLocaleString()} XP
        </Text>
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <TouchableOpacity onPress={() => { doHaptic(); router.back(); }}>
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              marginLeft: 12,
              color: t.textPrimary,
              fontSize: f.h2,
              fontWeight: '700',
            }}
          >
            {triLang(lang, { ru: 'Зал Славы друзей', uk: 'Зал Слави друзів', es: 'Salón de la Fama' })}
          </Text>
        </View>

        {/* Toggle HOF-02 */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: t.bgCard,
            borderRadius: 10,
            padding: 3,
          }}
        >
          {(['alltime', 'weekly'] as const).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => { doHaptic(); setMode(m); }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: mode === m ? t.accent : 'transparent',
              }}
            >
              <Text
                style={{
                  color: mode === m ? '#fff' : t.textMuted,
                  fontSize: f.body,
                  fontWeight: '600',
                }}
              >
                {m === 'alltime'
                  ? triLang(lang, { ru: 'Всё время', uk: 'Весь час', es: 'Todo' })
                  : triLang(lang, { ru: 'Эта неделя', uk: 'Цей тиждень', es: 'Esta semana' })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading ? (
          <ActivityIndicator size="large" color={t.accent} style={{ marginTop: 40 }} />
        ) : weeklyEmpty ? (
          <Text
            style={{
              color: t.textMuted,
              textAlign: 'center',
              marginTop: 40,
              fontSize: f.body,
            }}
          >
            {triLang(lang, {
              ru: 'Эта неделя ещё не началась',
              uk: 'Цей тиждень ще не почався',
              es: 'La semana aún no empezó',
            })}
          </Text>
        ) : entries.length === 0 ? (
          <Text
            style={{
              color: t.textMuted,
              textAlign: 'center',
              marginTop: 40,
              fontSize: f.body,
            }}
          >
            {triLang(lang, {
              ru: 'Ещё нет друзей — добавьте по коду в настройках',
              uk: 'Ще немає друзів',
              es: 'Sin amigos aún',
            })}
          </Text>
        ) : (
          <FlatList
            data={ranked}
            keyExtractor={item => item.uid}
            renderItem={renderItem}
            initialScrollIndex={myRankIndex >= 0 ? Math.max(0, myRankIndex - 2) : 0}
            getItemLayout={(_data, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}
