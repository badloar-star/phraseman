import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TouchableOpacity, View } from 'react-native';
import InGameToast from '../../components/InGameToast';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AvatarView from '../../components/AvatarView';
import PremiumAvatarHalo from '../../components/PremiumAvatarHalo';
import PremiumGoldUserName from '../../components/PremiumGoldUserName';
import ContentWrap from '../../components/ContentWrap';
import { usePremium } from '../../components/PremiumContext';
import { getLeague, useLang } from '../../components/LangContext';
import PlayerProfileModal, { PlayerInfo } from '../../components/PlayerProfileModal';
import ScreenGradient from '../../components/ScreenGradient';
import { useTheme } from '../../components/ThemeContext';
import { bundleLang, triLang } from '../../constants/i18n';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../../constants/avatars';
import { getLevelFromXP } from '../../constants/theme';
import {
    addOrUpdateScore,
    getMyWeekPoints, LeaderEntry,
    loadLeaderboard,
    pointsForAnswer,
    streakMultiplier,
} from '../hall_of_fame_utils';
import { LEAGUES, loadLeagueState } from '../league_engine';
import { fetchGlobalLeaderboard, fetchMyGlobalRank, GLOBAL_LB_ASYNC_CACHE_KEY, RemoteLeaderEntry } from '../firestore_leaderboard';
import ReportUserModal from '../../components/ReportUserModal';
import EnergyBar from '../../components/EnergyBar';
import { logHallOfFameViewed } from '../firebase';
import { onAppEvent } from '../events';
import { ensureAnonUser } from '../cloud_sync';
import {
  loadPrevRank, savePrevRank, computeRankDelta,
  KEY_HOF_PREV_RANK, RankDelta,
} from '../rank_change';
import RankChangeBanner from '../../components/RankChangeBanner';
import { Animated } from 'react-native';

const LEADERBOARD_CACHE_KEY = 'leaderboard_cache_v3';
const HALL_REMOTE_REFRESH_AT_KEY = 'hall_remote_refresh_at_v1';
const HALL_REMOTE_REFRESH_MS = 6 * 60 * 60 * 1000;
const HALL_MANUAL_REFRESH_COOLDOWN_UNTIL_KEY = 'hall_manual_refresh_cooldown_until_v1';

export { addOrUpdateScore, pointsForAnswer, streakMultiplier };




// Мержит реальных игроков из Firestore с локальным рейтингом.
// Дедуплицируем только по UID (один документ leaderboard = одно место в топе).
// Дедуп по имени убран: у разных людей бывает один ник — тогда из топа пропадали места (#99–100 и т.д.).
const mergeRemoteWithLocal = (
  remote: LeaderEntry[],
  local: LeaderEntry[],
  myName: string,
): LeaderEntry[] => {
  const myNameLower = myName.trim().toLowerCase();

  const merged = [...remote];
  const myLocal = local.find(e => e.name.trim().toLowerCase() === myNameLower);
  if (myLocal && !merged.some(e => e.name.trim().toLowerCase() === myNameLower)) {
    merged.push(myLocal);
  }

  const byUid = new Map<string, LeaderEntry>();
  const noUid: LeaderEntry[] = [];
  for (const entry of merged) {
    if (!entry.uid) {
      noUid.push(entry);
      continue;
    }
    const existing = byUid.get(entry.uid);
    if (!existing || entry.points > existing.points) byUid.set(entry.uid, entry);
  }

  return [...byUid.values(), ...noUid].sort((a, b) => b.points - a.points);
};

function buildFinalHallBoard(
  remoteBoard: RemoteLeaderEntry[],
  localBoard: LeaderEntry[],
  name: string | null,
): LeaderEntry[] {
  const remoteAsLocal: (LeaderEntry & { streak?: number; leagueId?: number; frame?: string; uid?: string; isPremium?: boolean })[] = remoteBoard.map((r: RemoteLeaderEntry) => ({
    name: r.name,
    points: r.points,
    lang: r.lang,
    avatar: r.avatar,
    frame: r.frame,
    streak: r.streak,
    leagueId: r.leagueId,
    uid: r.uid,
    isPremium: r.isPremium ?? false,
  }));
  const baseBoard = remoteAsLocal.length > 0
    ? mergeRemoteWithLocal(remoteAsLocal, localBoard, name || '')
    : localBoard;
  return baseBoard
    .sort((a, b) => b.points - a.points)
    .slice(0, 100);
}

const entryUid = (e: LeaderEntry & { uid?: string }) => e.uid;

/**
 * «Я в этом топ-100?» — если есть uid, только по uid.
 * Падение по имени при uid: в топе может быть чужой такой же ник → мы думали «в топе»,
 * футер с глобальным рангом не показывали, хотя сами вне 100-ки.
 * Без uid (редко): только по имени.
 */
/**
 * «Я в этом топ-100?» — с uid только по uid.
 * Без uid: имя + очки (рядом с myTotalXP), иначе чужой с тем же ником даёт ложное «в топе».
 */
function isMeInHallBoard(
  boardRows: LeaderEntry[],
  myUid: string | null,
  myNameLower: string,
  myTotalXP: number,
): boolean {
  if (myUid) {
    return boardRows.some(e => entryUid(e) === myUid);
  }
  if (!myNameLower) return false;
  return boardRows.some(
    e =>
      e.name.trim().toLowerCase() === myNameLower
      && Math.abs(e.points - myTotalXP) <= Math.max(3, myTotalXP * 0.02),
  );
}

/** Место в срезе: с uid — только по uid; без uid — имя + очки (как в isMeInHallBoard). */
function findMyHallIndex(
  boardRows: LeaderEntry[],
  myUid: string | null,
  myNameLower: string,
  myTotalXP: number,
): number {
  if (myUid) {
    return boardRows.findIndex(e => entryUid(e) === myUid);
  }
  if (!myNameLower) return -1;
  return boardRows.findIndex(
    e =>
      e.name.trim().toLowerCase() === myNameLower
      && Math.abs(e.points - myTotalXP) <= Math.max(3, myTotalXP * 0.02),
  );
}

export default function HallOfFame() {
  const router = useRouter();
  const flatListRef = useRef<any>(null);
  const { theme: t , f, themeMode } = useTheme();
  const screenTitleColor = (themeMode === 'sakura' || themeMode === 'ocean')
    ? (themeMode === 'ocean' ? 'rgba(240,252,255,0.95)' : 'rgba(255,248,252,0.95)')
    : t.textPrimary;
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, []);

  const [board, setBoard]        = useState<LeaderEntry[]>([]);
  const [myName, setMyName]      = useState('');
  const [weekPoints, setWeekPts] = useState(0);
  const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[0] | null>(null);
  const [myAvatar, setMyAvatar]      = useState('🐣');
  const [myFrame, setMyFrame]        = useState('plain');
  const [myTotalXP, setMyTotalXP]   = useState(0);
  const [myStreak, setMyStreak]     = useState<number | null>(null);
  const [myGlobalRank, setMyGlobalRank] = useState<number | null>(null);
  const [myGlobalRankLoading, setMyGlobalRankLoading] = useState(false);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [profilePlayer, setProfile] = useState<PlayerInfo | null>(null);
  const [manualRefreshBusy, setManualRefreshBusy] = useState(false);
  const [manualRefreshCooldownUntil, setManualRefreshCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ uid: string; name: string } | null>(null);
  const [rankDelta, setRankDelta] = useState<RankDelta | null>(null);
  const myRowAnim = useRef(new Animated.Value(0)).current;
  const ROW_HEIGHT_HOF = 64;
  const HOF_TOP_LIMIT  = 100;
  const { s, lang } = useLang();
  const { isPremium: myIsPremium } = usePremium();
  const insets = useSafeAreaInsets();

  const load = useCallback(async (opts?: { forceRemote?: boolean }) => {
    // Stale-while-revalidate: показываем последний снимок сразу, не ждём сеть.
    let remoteBoard: RemoteLeaderEntry[] = [];
    try {
      const cached = await AsyncStorage.getItem(LEADERBOARD_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { data: RemoteLeaderEntry[]; timestamp: number };
        if (Array.isArray(parsed.data) && parsed.data.length > 0) {
          remoteBoard = parsed.data;
        }
      }
    } catch {}

    const lastRemoteAtRaw = await AsyncStorage.getItem(HALL_REMOTE_REFRESH_AT_KEY);
    const lastRemoteAt = parseInt(lastRemoteAtRaw || '0', 10) || 0;
    const shouldFetchRemote = !!opts?.forceRemote || (Date.now() - lastRemoteAt >= HALL_REMOTE_REFRESH_MS);

    if (shouldFetchRemote) {
      const fresh = await fetchGlobalLeaderboard();
      if (fresh.length > 0) {
        remoteBoard = fresh;
        try {
          await AsyncStorage.multiSet([
            [LEADERBOARD_CACHE_KEY, JSON.stringify({ data: remoteBoard, timestamp: Date.now() })],
            [HALL_REMOTE_REFRESH_AT_KEY, String(Date.now())],
          ]);
        } catch {}
      }
    }

    const [localBoard, name, wp, ls, xp, frame, streakRaw] = await Promise.all([
      loadLeaderboard(),
      AsyncStorage.getItem('user_name'),
      getMyWeekPoints(),
      loadLeagueState(),
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('user_frame'),
      AsyncStorage.getItem('streak_count'),
    ]);

    const finalBoard = buildFinalHallBoard(remoteBoard, localBoard, name);
    setBoard(finalBoard);
    setMyName((name ?? '').trim());

    const myUidLocal = await ensureAnonUser().catch(() => null);
    setMyUid(myUidLocal);

    // ── Rank delta после успешного remote refresh (только в top-100) ──────────
    if (shouldFetchRemote && finalBoard.length > 0) {
      const myNameNormForRank = (name || '').trim().toLowerCase();
      const myXp = parseInt((await AsyncStorage.getItem('user_total_xp')) || '0', 10) || 0;
      const myIdx = findMyHallIndex(finalBoard, myUidLocal, myNameNormForRank, myXp);
      if (myIdx >= 0 && myIdx < HOF_TOP_LIMIT) {
        const newRank = myIdx + 1;
        const ctxKey = 'global';
        const prev = await loadPrevRank(KEY_HOF_PREV_RANK);
        const sortedNames = finalBoard.map(b => b.name);
        const delta = computeRankDelta(prev, newRank, ctxKey, sortedNames);
        if (delta) {
          setRankDelta(delta);
          const startOffset = delta.delta * ROW_HEIGHT_HOF;
          myRowAnim.setValue(startOffset);
          Animated.timing(myRowAnim, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }).start();
        }
        await savePrevRank(KEY_HOF_PREV_RANK, { rank: newRank, contextKey: ctxKey, ts: Date.now() });
      } else {
        // Не в top-100 — не показываем анимацию, но сбрасываем prev,
        // чтобы при возвращении в топ не получить delta из «доисторического» rank'а.
        await savePrevRank(KEY_HOF_PREV_RANK, { rank: HOF_TOP_LIMIT + 1, contextKey: 'global', ts: Date.now() });
      }
    }
    setWeekPts(wp);
    if (ls) setEngineLeague(LEAGUES.find(l => l.id === ls.leagueId) || null);
    const xpNum = parseInt(xp || '0') || 0;
    const lvl = getLevelFromXP(xpNum);
    setMyTotalXP(xpNum);
    setMyStreak(parseInt(streakRaw || '0') || null);
    setMyAvatar(getBestAvatarForLevel(lvl));
    setMyFrame(frame   || getBestFrameForLevel(lvl).id);

    const myNameNormL = (name || '').trim().toLowerCase();
    const inTop100 = isMeInHallBoard(finalBoard, myUidLocal, myNameNormL, xpNum);
    if (!inTop100 && xpNum > 0) {
      setMyGlobalRankLoading(true);
      setMyGlobalRank(null);
      void fetchMyGlobalRank(xpNum)
        .then(rank => { setMyGlobalRank(rank); })
        .finally(() => { setMyGlobalRankLoading(false); });
    } else {
      setMyGlobalRank(null);
      setMyGlobalRankLoading(false);
    }

    if (!shouldFetchRemote) {
      return;
    }

    if (!opts?.forceRemote) {
      void fetchGlobalLeaderboard().then(async (fresh) => {
        if (fresh.length === 0) return;
        try {
          await AsyncStorage.multiSet([
            [LEADERBOARD_CACHE_KEY, JSON.stringify({ data: fresh, timestamp: Date.now() })],
            [HALL_REMOTE_REFRESH_AT_KEY, String(Date.now())],
          ]);
        } catch {}
        const [lb2, n2, xp2] = await Promise.all([
          loadLeaderboard(),
          AsyncStorage.getItem('user_name'),
          AsyncStorage.getItem('user_total_xp'),
        ]);
        const fb2 = buildFinalHallBoard(fresh, lb2, n2);
        setBoard(fb2);
        setMyName((n2 ?? '').trim());
        const xpN2 = parseInt(xp2 || '0') || 0;
        const myUid2 = await ensureAnonUser().catch(() => null);
        setMyUid(myUid2);
        const in2 = isMeInHallBoard(
          fb2,
          myUid2,
          (n2 || '').trim().toLowerCase(),
          xpN2,
        );
        if (!in2 && xpN2 > 0) {
          setMyGlobalRankLoading(true);
          setMyGlobalRank(null);
          void fetchMyGlobalRank(xpN2)
            .then(rank => { setMyGlobalRank(rank); })
            .finally(() => { setMyGlobalRankLoading(false); });
        } else {
          setMyGlobalRank(null);
          setMyGlobalRankLoading(false);
        }
      });
    }
  }, []);

  // Экран может открываться как standalone роут, поэтому грузим данные при каждом монтировании экрана.
  useEffect(() => {
    logHallOfFameViewed();
    load();
  }, [load]);

  useEffect(() => {
    const sub = onAppEvent('cloud_profile_hydrated', () => {
      void load();
    });
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    AsyncStorage.getItem(HALL_MANUAL_REFRESH_COOLDOWN_UNTIL_KEY)
      .then((raw) => {
        const ts = parseInt(raw || '0', 10) || 0;
        setManualRefreshCooldownUntil(ts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setNowTs(Date.now());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const formatCooldown = useCallback(
    (ms: number): string => {
      const totalSec = Math.max(0, Math.ceil(ms / 1000));
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      if (lang === 'es') return `${h}h ${m}min`;
      return `${h}ч ${m}м`;
    },
    [lang],
  );

  const onManualRefresh = useCallback(async () => {
    if (manualRefreshBusy) return;
    const now = Date.now();
    if (manualRefreshCooldownUntil > now) return;
    setManualRefreshBusy(true);
    try {
      await AsyncStorage.multiRemove([LEADERBOARD_CACHE_KEY, 'leaderboard_cache_v1', GLOBAL_LB_ASYNC_CACHE_KEY]);
      await load({ forceRemote: true });
      const next = Date.now() + HALL_REMOTE_REFRESH_MS;
      setManualRefreshCooldownUntil(next);
      await AsyncStorage.setItem(HALL_MANUAL_REFRESH_COOLDOWN_UNTIL_KEY, String(next));
    } finally {
      setManualRefreshBusy(false);
    }
  }, [manualRefreshBusy, manualRefreshCooldownUntil, load]);

  const myNameNorm = myName.trim().toLowerCase();
  const refreshOnCooldown = manualRefreshCooldownUntil > nowTs;
  const refreshCooldownLabel = refreshOnCooldown
    ? formatCooldown(manualRefreshCooldownUntil - nowTs)
    : null;
  const myRank = useMemo(
    () => findMyHallIndex(board, myUid, myNameNorm, myTotalXP),
    [board, myUid, myNameNorm, myTotalXP],
  );
  const showGlobalRankFooter = useMemo(
    () => myTotalXP > 0 && !isMeInHallBoard(board, myUid, myNameNorm, myTotalXP),
    [board, myNameNorm, myTotalXP, myUid],
  );
  const league = getLeague(weekPoints, lang);
  const stickyRankBarHeight = 76;

  const closePlayerProfile = useCallback(() => setProfile(null), []);

  const onBackPress = useCallback(() => {
    router.replace('/(tabs)/home' as any);
  }, [router]);

  const myInfoForProfile = useMemo(
    () => ({
      name: myName,
      avatar: myAvatar,
      frame: myFrame,
      totalXP: myTotalXP,
      leagueId: engineLeague?.id,
      streak: myStreak,
    }),
    [myName, myAvatar, myFrame, myTotalXP, engineLeague?.id, myStreak],
  );

  return (
    <ScreenGradient>
      <SafeAreaView testID="screen-hall-of-fame" accessibilityLabel="qa-screen-hall-of-fame" style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'bottom', 'left', 'right']}>
      <ContentWrap>
      <View style={{ flex: 1, position: 'relative' as const }}>
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, paddingTop:8, paddingBottom:4 }}>
        <TouchableOpacity
          style={{ width:44, height:44, borderRadius:22, backgroundColor:t.bgCard, borderWidth:0.5, borderColor:t.border, justifyContent:'center', alignItems:'center', marginRight:12 }}
          onPress={onBackPress}
        >
          <Ionicons name="chevron-back" size={20} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{ color: screenTitleColor, fontSize: f.h2 + 6, fontWeight: '700', flex:1 }}>
          {s.hallFame.title}
        </Text>
        <TouchableOpacity
          onPress={() => { void onManualRefresh(); }}
          disabled={manualRefreshBusy || refreshOnCooldown}
          style={{
            marginRight: 8,
            backgroundColor: (manualRefreshBusy || refreshOnCooldown) ? '#4A4A4A' : t.bgCard,
            borderWidth: 0.5,
            borderColor: (manualRefreshBusy || refreshOnCooldown) ? '#6A6A6A' : t.border,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 7,
            opacity: (manualRefreshBusy || refreshOnCooldown) ? 0.85 : 1,
          }}
        >
          <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '700' }}>
            {manualRefreshBusy
              ? triLang(lang, { uk: 'Оновлення...', ru: 'Обновление...', es: 'Actualizando…' })
              : refreshCooldownLabel
                ? refreshCooldownLabel
                : triLang(lang, { uk: 'Оновити', ru: 'Обновить', es: 'Actualizar' })}
          </Text>
        </TouchableOpacity>
        <EnergyBar size={20} />
      </View>

      <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={board}
          keyExtractor={(item) => (item as LeaderEntry & { uid?: string }).uid ?? `n:${item.name}:${item.points}:${item.lang}`}
          extraData={`${myNameNorm}|${myTotalXP}|${myAvatar}|${myStreak ?? ''}|${myIsPremium ? 1 : 0}`}
          contentContainerStyle={{
            paddingBottom: showGlobalRankFooter ? 16 + stickyRankBarHeight + insets.bottom : 30,
          }}
          removeClippedSubviews={false}
          maxToRenderPerBatch={16}
          windowSize={15}
          initialNumToRender={24}
          ListHeaderComponent={(
            <>
              {rankDelta && (
                <View style={{ marginHorizontal: 16, marginTop: 4 }}>
                  <RankChangeBanner
                    delta={rankDelta.delta}
                    passedName={rankDelta.passedName}
                    lostToName={rankDelta.lostToName}
                    lang={lang}
                    onClose={() => setRankDelta(null)}
                  />
                </View>
              )}
              {board.length > 0 && (
                <View
                  testID="hall-columns-header"
                  accessibilityLabel="qa-hall-columns-header"
                  style={{
                  flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 4,
                  borderBottomWidth: 0.5, borderBottomColor: t.border,
                }}>
                  <Text style={{ width: 44, color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>#</Text>
                  <Text style={{ flex: 1, color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>
                    {triLang(lang, { uk: 'Учасник', ru: 'Участник', es: 'Participante' })}
                  </Text>
                  <Text style={{ color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>
                    {triLang(lang, { uk: 'Досвід', ru: 'Опыт', es: 'Experiencia' })}
                  </Text>
                </View>
              )}
              {board.length === 0 && (
                <View style={{ justifyContent: 'center', alignItems: 'center', padding: 60 }}>
                  <View style={{
                    width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgCard,
                    borderWidth: 1, borderColor: t.border, justifyContent: 'center',
                    alignItems: 'center', marginBottom: 20,
                  }}>
                    <Ionicons name="trophy-outline" size={36} color={t.textSecond} />
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: f.bodyLg, textAlign: 'center', lineHeight: 26 }}>
                    {s.hallFame.empty}
                  </Text>
                </View>
              )}
            </>
          )}
          renderItem={({ item, index }) => {
            const isTop3 = index < 3;
            const isMe   = myUid
              ? (item as LeaderEntry & { uid?: string }).uid === myUid
              : item.name.trim().toLowerCase() === myNameNorm;
            const itemXP = isMe ? myTotalXP : item.points;
            // Всегда вычисляем аватар из актуального XP — стale-данные из Firestore игнорируем
            const itemAvatar = isMe ? myAvatar : String(getBestAvatarForLevel(getLevelFromXP(itemXP)));
            const rowPremium = isMe ? myIsPremium : !!(item as { isPremium?: boolean }).isPremium;
            const rowMask = isMe ? t.accentBg : t.bgCard;
            const rowTransform = (isMe && rankDelta) ? [{ translateY: myRowAnim }] : undefined;

            return (
              <Animated.View style={{ transform: rowTransform, zIndex: isMe ? 5 : 0, elevation: isMe ? 5 : 0 }}>
              <Pressable
                testID={`hall-leader-row-${index + 1}`}
                accessibilityLabel={`qa-hall-leader-row-${index + 1}`}
                onPress={() => setProfile({
                  name: item.name,
                  points: isMe ? myTotalXP : item.points,
                  isMe,
                  avatar: isMe ? myAvatar : String(getBestAvatarForLevel(getLevelFromXP(item.points))),
                  frame: isMe ? myFrame : (item as any).frame,
                  streak: isMe ? myStreak : ((item as any).streak ?? null),
                  leagueId: (item as any).leagueId,
                  uid: (item as any).uid,
                  isPremium: (item as any).isPremium ?? false,
                })}
                onLongPress={() => {
                  if (!isMe && (item as any).uid) {
                    setReportTarget({ uid: (item as any).uid, name: item.name });
                  }
                }}
                delayLongPress={500}
                // Скролл списка + свайп табов легко отменяют «сухой» тап; большой offset не рвёт onPress при микросдвиге пальца.
                pressRetentionOffset={{ top: 56, bottom: 56, left: 64, right: 64 }}
                style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 14,
                borderBottomWidth: 0.5, borderBottomColor: t.border,
                backgroundColor: isMe ? t.accentBg : t.bgCard,
                opacity: pressed ? 0.72 : 1,
              })}>
                <Text style={{ width: 36, fontSize: isTop3 ? 16 : 14, color: isTop3 ? t.gold : t.textPrimary, textAlign: 'center', fontWeight: isTop3 ? '700' : '400' }}>
                  {index + 1}
                </Text>
                <PremiumAvatarHalo enabled={rowPremium} avatarSize={36} maskColor={rowMask} style={{ marginRight: 10 }}>
                  <AvatarView avatar={itemAvatar} totalXP={itemXP} size={36} />
                </PremiumAvatarHalo>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  {rowPremium ? (
                    <PremiumGoldUserName text={item.name} fontSize={isTop3 ? 17 : 15} />
                  ) : (
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: isTop3 ? 17 : 15,
                        color: t.textPrimary,
                        fontWeight: isMe || isTop3 ? '700' : '600',
                      }}
                    >
                      {item.name}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={12} color={t.textSecond} />
                  <Text style={{ color: t.textSecond, fontSize: isTop3 ? 17 : 14, fontWeight: '600' }}>
                    {isMe ? myTotalXP : item.points}
                  </Text>
                </View>
              </Pressable>
              </Animated.View>
            );
          }}
        />
      {showGlobalRankFooter && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            elevation: 12,
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: Math.max(8, insets.bottom),
            backgroundColor: t.bgCard,
            borderTopWidth: 1,
            borderTopColor: t.border,
          }}
        >
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, paddingVertical: 12,
            backgroundColor: t.accentBg,
            borderRadius: 12,
            borderWidth: 1, borderColor: t.accent + '44',
          }}>
            <View style={{ width: 56, minHeight: 28, alignItems: 'center', justifyContent: 'center' }}>
              {myGlobalRank != null && myGlobalRank > 0 ? (
                <Text style={{ fontSize: 14, color: t.textMuted, textAlign: 'center', fontWeight: '600' }} numberOfLines={1} adjustsFontSizeToFit>
                  #{myGlobalRank.toLocaleString()}
                </Text>
              ) : myGlobalRankLoading ? (
                <ActivityIndicator size="small" color={t.textSecond} />
              ) : (
                <Text style={{ fontSize: 18, color: t.textMuted, textAlign: 'center' }}>—</Text>
              )}
            </View>
            <PremiumAvatarHalo enabled={myIsPremium} avatarSize={36} maskColor={t.accentBg} style={{ marginRight: 10 }}>
              <AvatarView avatar={myAvatar} totalXP={myTotalXP} size={36} />
            </PremiumAvatarHalo>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {myIsPremium ? (
                <PremiumGoldUserName
                  text={
                    myName.trim()
                      ? `${myName.trim()}${triLang(lang, { uk: ' (ти)', ru: ' (ты)', es: ' (tú)' })}`
                      : triLang(lang, { uk: 'Ви', ru: 'Вы', es: 'Tú' })
                  }
                  fontSize={15}
                />
              ) : (
                <Text style={{ flex: 1, fontSize: 15, color: t.textPrimary, fontWeight: '700' }}>
                  {myName.trim()
                    ? `${myName.trim()}${triLang(lang, { uk: ' (ти)', ru: ' (ты)', es: ' (tú)' })}`
                    : triLang(lang, { uk: 'Ви', ru: 'Вы', es: 'Tú' })}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="star" size={11} color={t.textMuted} />
              <Text style={{ color: t.textMuted, fontSize: 15, fontWeight: '600' }}>
                {myTotalXP.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      )}
      </View>
      </ContentWrap>

      <PlayerProfileModal
        player={profilePlayer}
        myInfo={myInfoForProfile}
        onClose={closePlayerProfile}
      />
      <InGameToast message={toast} onHide={() => setToast(null)} type="error" />
      {reportTarget && (
        <ReportUserModal
          visible={!!reportTarget}
          reportedUid={reportTarget.uid}
          reportedName={reportTarget.name}
          screen="leaderboard"
          lang={bundleLang(lang)}
          onClose={() => setReportTarget(null)}
        />
      )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

