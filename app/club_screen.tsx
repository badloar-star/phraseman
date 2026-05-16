import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Animated, Easing, Pressable, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import UnifiedPlayerModal, { PlayerInfo as UnifiedPlayerInfo } from '../components/PlayerProfileModal';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import PremiumGoldUserName from '../components/PremiumGoldUserName';
import LeagueCrownName from '../components/LeagueCrownName';
import AvatarView from '../components/AvatarView';
import PremiumAvatarHalo from '../components/PremiumAvatarHalo';
import LeagueChestOpenModal from '../components/LeagueChestOpenModal';
import {
  LEAGUES,
  CLUB_DESC_ES,
  GroupMember, LeagueState, LeagueResult,
  checkLeagueOnAppOpen,
  clearPendingResult,
  getWeekId,
  loadLeagueState,
  loadPendingResult,
  invalidateLeagueGroupCache,
} from './league_engine';
import LeagueResultModal from './LeagueResultModal';
import { logLeaguePromoted } from './firebase';
import { getBestAvatarForLevel } from '../constants/avatars';
import { USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId } from '../constants/avatar_auras';
import { getTitleString } from '../constants/titles';

import { getMyWeekPoints } from './hall_of_fame_utils';
import { ensureAnonUser } from './cloud_sync';
import { getCanonicalUserId } from './user_id_policy';
import { getXPProgress, getLevelFromXP, screenTextOnGradient } from '../constants/theme';
import {
  loadPrevRank, savePrevRank, computeRankDelta,
  KEY_CLUB_PREV_RANK, RankDelta,
} from './rank_change';
import RankChangeBanner from '../components/RankChangeBanner';
import { getShardsBalance } from './shards_system';
import { actionToastTri, emitAppEvent, onAppEvent } from './events';
import {
  LEAGUE_PERSONAL_BOOSTS,
  LeaguePersonalBoostDef,
  LeaguePersonalBoostState,
  buyAndActivateLeagueBoost,
  formatLeagueBoostTimeLeft,
  getLeagueBoostDef,
  loadActiveLeagueBoost,
} from './league_personal_boosts';
import { oskolokImageForPackShards } from './oskolok';
import { subscribeMyArenaClubWarEvent } from './services/arena_club_wars';
import {
  LEAGUE_CROWN_NICK_COLOR,
  ensureLeagueChestRewards,
  fetchActiveLeagueCrowns,
  getLeagueChestGoal,
  resolveMyLeagueGroupMeta,
} from './services/league_chest_rewards';
import { shouldShowLeagueRace } from './league_race_visibility';
import LeagueChatPanel from '../components/LeagueChatPanel';

// v2 — bumped после фикса race на signInAnonymously + остановки записи fallback\'а
// в league_state_v3. Старый таймер мог хранить «не обновлять» с момента, когда
// fetchGroupForUser возвращал только пользователя из-за PERMISSION_DENIED.
const CLUB_REMOTE_REFRESH_AT_KEY = 'club_remote_refresh_at_v2';
const CLUB_REMOTE_REFRESH_MS = 6 * 60 * 60 * 1000;

/** Локальный календарный день — для «первый заход в лигу за день». */
const LEAGUE_PROMO_HINT_DAY_KEY = 'league_promo_hint_seen_calendar_day_v1';

function localCalendarDayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function leagueTag(lang: Lang, tagRU: string, tagUK: string): string {
  const pct = Number(tagRU.match(/([+-]?\d+)%/)?.[1] ?? '0');
  if (pct <= 0) return '';
  const formattedPct = `+${pct}%`;
  return triLang(lang, {
    ru: `Бонус к опыту: ${formattedPct}`,
    uk: `Бонус до досвіду: ${formattedPct}`,
    es: `Bono de XP: ${formattedPct}`,
  });
}

function leagueDesc(lang: Lang, leagueId: number, descRU: string, descUK: string): string {
  return triLang(lang, {
    ru: descRU,
    uk: descUK,
    es: CLUB_DESC_ES[leagueId] ?? descRU,
  });
}

function leaguePromotionHintText(lang: Lang, promotionCutoff: number): string {
  if (promotionCutoff <= 0) {
    return triLang(lang, {
      ru: 'Повышение станет доступно, когда в лиге будет хотя бы 2 участника.',
      uk: 'Підвищення стане доступним, коли в лізі буде хоча б 2 учасники.',
      es: 'El ascenso estará disponible cuando haya al menos 2 participantes en la liga.',
    });
  }
  return triLang(lang, {
    ru: `Чтобы перейти в следующую лигу, к концу недели нужно войти в топ-${promotionCutoff} по опыту, набранному за эту неделю.`,
    uk: `Щоб перейти в наступну лігу, до кінця тижня потрібно потрапити в топ-${promotionCutoff} за досвідом, зібраним за цей тиждень.`,
    es: `Para subir de liga, al final de la semana debes estar entre los ${promotionCutoff} primeros por experiencia ganada esta semana.`,
  });
}

// ── League icon renderer ──────────────────────────────────────────────────────
function LeagueIcon({
  league,
  size = 24,
  pulse = false,
  active = false,
  locked = false,
}: {
  league: any;
  size?: number;
  pulse?: boolean;
  active?: boolean;
  locked?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 1100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0,  duration: 1100, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, scaleAnim]);

  const iconName = (league as any).ionIcon ?? 'trophy';
  const imageUri = (league as any).imageUri;
  const icon = imageUri ? (
    <Image
      source={imageUri}
      style={{
        width: size,
        height: size,
        opacity: locked ? 0.55 : (active ? 1 : 0.65),
      }}
      resizeMode="contain"
    />
  ) : (
    <Ionicons
      name={iconName}
      size={Math.max(14, Math.round(size * 0.8))}
      color={locked ? '#7A7A7A' : (active ? league.color : '#7F8793')}
    />
  );

  return pulse ? (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>{icon}</Animated.View>
  ) : <>{icon}</>;
}

// ── NPC profile generation (seeded by name) ──────────────────────────────────


export default function ClubScreen() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();

  const [myLeagueId, setMyLeagueId]     = useState(0);
  const [selectedLeagueId, setSelectedLeagueId] = useState(0);
  const [group, setGroup]               = useState<GroupMember[]>([]);
  const [descModal, setDescModal]       = useState<(typeof LEAGUES)[number] | null>(null);
  const [profilePlayer, setProfile]     = useState<UnifiedPlayerInfo | null>(null);
  const [myAvatarEmoji, setMyAvatarEmoji] = useState('🐣');
  const [myFrameId, setMyFrameId]         = useState('plain');
  const [myAuraId, setMyAuraId]           = useState('');
  const [userName, setUserName]         = useState('');
  const [playerXP, setPlayerXP]         = useState(0);
  const [clubTab, setClubTab] = useState<'rank' | 'chat'>('rank');
  const [rankDelta, setRankDelta] = useState<RankDelta | null>(null);
  const [shardsBalance, setShardsBalance] = useState(0);
  const [boostMenuVisible, setBoostMenuVisible] = useState(false);
  const [x2Expanded, setX2Expanded] = useState(false);
  const [x3Expanded, setX3Expanded] = useState(false);
  const [gameAlert, setGameAlert] = useState<{
    title: string;
    message: string;
    actions: { label: string; style?: 'cancel' | 'default'; onPress?: () => void | Promise<void> }[];
  } | null>(null);
  const [activeLeagueBoost, setActiveLeagueBoost] = useState<LeaguePersonalBoostState | null>(null);
  const [activeLeagueBoostTime, setActiveLeagueBoostTime] = useState('');
  const [pendingLeagueResult, setPendingLeagueResult] = useState<LeagueResult | null>(null);
  const dismissedLeagueResultThisSessionRef = useRef<boolean>(false);
  const railScrollX = useRef(new Animated.Value(0)).current;
  const [leagueRailWidth, setLeagueRailWidth] = useState(0);
  const LEAGUE_ITEM_SIZE = 104;
  const LEAGUE_ITEM_GAP = 14;
  const LEAGUE_ITEM_FULL = LEAGUE_ITEM_SIZE + LEAGUE_ITEM_GAP;
  const leagueRailRef = useRef<ScrollView | null>(null);
  const contentScrollRef = useRef<ScrollView | null>(null);
  const didAutoScrollToMyRowRef = useRef<string | null>(null);
  const [contentViewportHeight, setContentViewportHeight] = useState(0);
  const [leaderboardTopY, setLeaderboardTopY] = useState<number | null>(null);
  const lastSnapLeagueRef = useRef<number | null>(null);
  const [railSideInset, setRailSideInset] = useState(12);
  /** Совпадает с RankChangeTestModal / тестовым превью — не менять без синхронизации. */
  const ROW_HEIGHT_CLUB = 60;
  const myRowAnim = useRef(new Animated.Value(0)).current;
  const leagueChestRewardCheckKeyRef = useRef<string | null>(null);
  const chatMetaRefreshAtRef = useRef(0);

  /** Подсказка про зону повышения: только первый раз за календарный день при открытии вкладки лиги. */
  const [leaguePromoHintVisible, setLeaguePromoHintVisible] = useState(false);
  const [arenaClubEvent, setArenaClubEvent] = useState<any | null>(null);
  const [arenaClubStableUid, setArenaClubStableUid] = useState('');
  const [leagueGroupMeta, setLeagueGroupMeta] = useState<{ weekId: string; groupId: string; leagueId: number } | null>(null);
  const [leagueChestClaimed, setLeagueChestClaimed] = useState(false);
  const [leagueCrownsByUid, setLeagueCrownsByUid] = useState<Record<string, { expiresAt: number }>>({});
  const [leagueChestOpenModal, setLeagueChestOpenModal] = useState<{
    crownName?: string;
    isCrownWinner?: boolean;
  } | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | null = null;
    void ensureAnonUser().then((stableUid) => {
      if (cancelled || !stableUid) return;
      setArenaClubStableUid(stableUid);
      unsub = subscribeMyArenaClubWarEvent(stableUid, setArenaClubEvent);
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  useEffect(() => {
    const groupId = String(arenaClubEvent?.groupId ?? '').trim();
    const weekId = String(arenaClubEvent?.weekId ?? '').trim();
    if (!groupId || !weekId) return;
    setLeagueGroupMeta({
      weekId,
      groupId,
      leagueId: Math.max(0, Math.floor(Number(arenaClubEvent?.leagueId) || myLeagueId)),
    });
  }, [arenaClubEvent, myLeagueId]);

  useEffect(() => {
    const uids = group.map((m) => m.uid).filter((uid): uid is string => !!uid);
    if (uids.length === 0) {
      setLeagueCrownsByUid({});
      return;
    }
    let cancelled = false;
    void fetchActiveLeagueCrowns(uids).then((crowns) => {
      if (!cancelled && isMountedRef.current) setLeagueCrownsByUid(crowns);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [group]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const today = localCalendarDayKey();
        const stored = await AsyncStorage.getItem(LEAGUE_PROMO_HINT_DAY_KEY);
        if (cancelled || !isMountedRef.current) return;
        if (stored === today) {
          setLeaguePromoHintVisible(false);
        } else {
          setLeaguePromoHintVisible(true);
          await AsyncStorage.setItem(LEAGUE_PROMO_HINT_DAY_KEY, today);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const LEAGUE_LOAD_TIMEOUT_MS = 22_000;

  useEffect(() => {
    if (!rankDelta) {
      myRowAnim.stopAnimation();
      myRowAnim.setValue(0);
      return;
    }
    const d = rankDelta.delta;
    const startOffset = d * ROW_HEIGHT_CLUB;
    myRowAnim.stopAnimation();
    myRowAnim.setValue(startOffset);
    Animated.timing(myRowAnim, {
      toValue: 0,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [rankDelta, ROW_HEIGHT_CLUB, myRowAnim]);

  const loadData = useCallback(async (opts?: { forceRemote?: boolean }) => {
    const maybeShowPending = (result: LeagueResult | null) => {
      if (!result) return;
      if (dismissedLeagueResultThisSessionRef.current) {
        void clearPendingResult();
        return;
      }
      if (isMountedRef.current) setPendingLeagueResult(result);
    };
    const applyLeagueOpen = (
      state: LeagueState,
      result: LeagueResult | null,
      fromRemote: boolean,
    ) => {
      if (!isMountedRef.current) return;
      setMyLeagueId(state.leagueId);
      setSelectedLeagueId(state.leagueId);
      if (result?.promoted) {
        const promotedLeague = LEAGUES.find(l => l.id === state.leagueId);
        if (promotedLeague) logLeaguePromoted(promotedLeague.nameRU);
      }
      setGroup(state.group);
      // Если пришёл свежий результат недели (после смены ISO-недели) — показываем модалку
      // прямо здесь. Раньше модалка жила только на home.tsx, поэтому захождение в Лиги
      // в понедельник не давало анимацию.
      if (result) maybeShowPending(result);
      if (!fromRemote) return;
      // Считаем delta только когда данные пришли из Firestore (не кеш).
      const sorted = [...state.group].sort((a, b) => b.points - a.points);
      const newRank = sorted.findIndex(m => m.isMe) + 1;
      if (newRank <= 0) return;

      void (async () => {
        const prev = await loadPrevRank(KEY_CLUB_PREV_RANK);
        const ctxKey = state.weekId;
        const delta = computeRankDelta(prev, newRank, ctxKey, sorted.map(s => s.name));
        if (delta && isMountedRef.current) {
          setRankDelta(delta);
        }
        await savePrevRank(KEY_CLUB_PREV_RANK, { rank: newRank, contextKey: ctxKey, ts: Date.now() });
      })();
    };

    try {
      // ── Фаза 1: мгновенно читаем локальный кеш ──────────────────────────────
      const [name, avatar, frame, aura, phrasm, xp, canonicalUid, cachedLeague, cachedPending] = await Promise.all([
        AsyncStorage.getItem('user_name'),
        AsyncStorage.getItem('user_avatar'),
        AsyncStorage.getItem('user_frame'),
        AsyncStorage.getItem(USER_AVATAR_AURA_KEY),
        AsyncStorage.getItem('user_phrasm'),
        AsyncStorage.getItem('user_total_xp'),
        getCanonicalUserId(),
        loadLeagueState(),
        loadPendingResult(),
      ]);
      if (!isMountedRef.current) return;
      // Если на этом устройстве уже был сохранён pending (например, home.tsx посчитал
      // итоги недели, но юзер закрыл приложение до закрытия модалки) — показываем здесь.
      if (cachedPending) maybeShowPending(cachedPending);

      const xpNum = parseInt(xp || '0', 10);
      const anonLevel = getXPProgress(xpNum).level;
      const anonTitle = getTitleString(anonLevel, lang ?? 'ru');
      const suffix = canonicalUid ? canonicalUid.replace(/-/g, '').slice(-4) : String(Math.floor(1000 + Math.random() * 9000));
      const anonName = anonTitle + ' #' + suffix;
      const n = name || anonName;

      setUserName(n);
      setPlayerXP(xpNum);
      setShardsBalance(await getShardsBalance());
      setMyAvatarEmoji((avatar && avatar.trim()) || getBestAvatarForLevel(getLevelFromXP(xpNum)));
      if (frame) setMyFrameId(frame);
      setMyAuraId(aura ?? '');
      resolveMyLeagueGroupMeta().then((meta) => {
        if (isMountedRef.current && meta) setLeagueGroupMeta(meta);
      }).catch(() => {});

      // Показываем кешированные данные лиги сразу, без ожидания сети
      if (cachedLeague) {
        applyLeagueOpen(cachedLeague, null, false);
      } else {
        applyLeagueOpen(
          { leagueId: 0, weekId: getWeekId(), group: [{ name: n, points: 0, isMe: true }] },
          null,
          false,
        );
      }

      // ── Фаза 2: сетевой апдейт не чаще 6 часов (или по force) ───────────────
      // ВАЖНО: 6h-троттл должен бить только Firestore-refetch группы, а не проверку
      // смены ISO-недели. Иначе после полуночи понедельника (новая неделя) пользователь
      // может зайти в Лиги и не увидеть LeagueResultModal, если последний refresh был <6h.
      const lastRemoteAtRaw = await AsyncStorage.getItem(CLUB_REMOTE_REFRESH_AT_KEY);
      const lastRemoteAt = parseInt(lastRemoteAtRaw || '0', 10) || 0;
      const within6h = (Date.now() - lastRemoteAt < CLUB_REMOTE_REFRESH_MS);
      const weekChanged = !!cachedLeague && cachedLeague.weekId !== getWeekId();
      const shouldRefreshRemote = !!opts?.forceRemote || !within6h || weekChanged;
      if (!shouldRefreshRemote) return;
      invalidateLeagueGroupCache();
      const wp = await getMyWeekPoints();
      if (!isMountedRef.current) return;

      const leagueWork = checkLeagueOnAppOpen(n, wp);
      const timeoutRace = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), LEAGUE_LOAD_TIMEOUT_MS);
      });
      const winner = await Promise.race([
        leagueWork.then(() => 'ok' as const),
        timeoutRace,
      ]);
      if (!isMountedRef.current) return;

      if (winner === 'timeout') {
        leagueWork
          .then(({ state, result }) => {
            if (isMountedRef.current) applyLeagueOpen(state, result, true);
          })
          .catch(() => {});
      } else {
        const { state, result } = await leagueWork;
        if (!isMountedRef.current) return;
        applyLeagueOpen(state, result, true);
      }
      await AsyncStorage.setItem(CLUB_REMOTE_REFRESH_AT_KEY, String(Date.now())).catch(() => {});
    } catch (e) {
      if (__DEV__) {
        console.warn('[club_screen] load failed:', e);
      }
    }
  }, [lang]);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  useEffect(() => {
    if (clubTab !== 'chat' || leagueGroupMeta) return;
    const now = Date.now();
    if (now - chatMetaRefreshAtRef.current < 15_000) return;
    chatMetaRefreshAtRef.current = now;
    void resolveMyLeagueGroupMeta()
      .then((meta) => {
        if (isMountedRef.current && meta) {
          setLeagueGroupMeta(meta);
          return;
        }
        void loadData({ forceRemote: true });
      })
      .catch(() => {
        void loadData({ forceRemote: true });
      });
  }, [clubTab, leagueGroupMeta, loadData]);

  const refreshActiveBoost = useCallback(async () => {
    const active = await loadActiveLeagueBoost();
    if (!isMountedRef.current) return;
    setActiveLeagueBoost(active);
    setActiveLeagueBoostTime(active ? formatLeagueBoostTimeLeft(active.expiresAt) : '');
  }, []);

  useEffect(() => {
    refreshActiveBoost();
  }, [refreshActiveBoost]);

  useEffect(() => {
    const sub = onAppEvent('shards_balance_updated', ({ balance }) => {
      setShardsBalance(Math.max(0, Math.floor(balance || 0)));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!activeLeagueBoost) return;
    const id = setInterval(() => {
      const left = formatLeagueBoostTimeLeft(activeLeagueBoost.expiresAt);
      if (!isMountedRef.current) return;
      setActiveLeagueBoostTime(left);
      if (left === '00:00') {
        refreshActiveBoost();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [activeLeagueBoost, refreshActiveBoost]);

  useEffect(() => {
    if (!leagueRailRef.current || leagueRailWidth <= 0) return;
    const idx = LEAGUES.findIndex((l) => l.id === myLeagueId);
    const targetX = Math.max(0, idx * LEAGUE_ITEM_FULL);
    const id = setTimeout(() => {
      leagueRailRef.current?.scrollTo({ x: targetX, y: 0, animated: true });
    }, 20);
    return () => clearTimeout(id);
  }, [myLeagueId, leagueRailWidth, LEAGUE_ITEM_FULL]);

  const myLeague = LEAGUES[myLeagueId];

  const sortedGroup = [...group].sort((a, b) => b.points - a.points);
  const zoneSize = Math.max(1, Math.ceil(sortedGroup.length * 0.15));
  const promotionCutoff = sortedGroup.length >= 2 && myLeagueId < LEAGUES.length - 1 ? zoneSize : 0;
  const relegationStartIndex = Math.max(0, sortedGroup.length - zoneSize);
  const myRank      = sortedGroup.findIndex(m => m.isMe) + 1;
  const total       = sortedGroup.length;
  const myRowIndex = myRank > 0 ? myRank - 1 : -1;
  const leagueRaceVisible = shouldShowLeagueRace(sortedGroup.length, userName);
  const myArenaClubPoints = arenaClubStableUid
    ? Math.max(0, Math.floor(Number((arenaClubEvent?.members ?? {})[arenaClubStableUid]?.points) || 0))
    : 0;
  const leagueRoomXp = sortedGroup.reduce((sum, p) => sum + Math.max(0, Math.floor(Number(p.points) || 0)), 0);
  const arenaChestBonus = Math.max(0, Math.floor(Number(arenaClubEvent?.totalPoints) || 0));
  const leagueChestGoal = getLeagueChestGoal(myLeagueId);
  const leagueChestProgress = leagueRaceVisible ? Math.min(leagueChestGoal, leagueRoomXp + arenaChestBonus) : 0;
  const leagueChestPct = leagueChestGoal > 0 ? Math.min(100, Math.round((leagueChestProgress / leagueChestGoal) * 100)) : 0;
  const myLeagueRoomXp = Math.max(0, Math.floor(Number(sortedGroup.find((p) => p.isMe)?.points) || 0));
  const myLeagueChestContribution = myLeagueRoomXp + myArenaClubPoints;
  const leagueChestReady = leagueRaceVisible && leagueChestProgress >= leagueChestGoal;
  const leagueCrownWinnerUid = leagueRaceVisible && leagueChestReady ? sortedGroup[0]?.uid : undefined;
  const leagueCrownWinnerName = leagueRaceVisible && leagueChestReady ? sortedGroup[0]?.name : undefined;
  const crownRaceTop = leagueRaceVisible ? sortedGroup.slice(0, 3) : [];

  useEffect(() => {
    if (!leagueRaceVisible || !leagueChestReady || !leagueGroupMeta || sortedGroup.length === 0 || leagueChestClaimed) return;
    const checkKey = `${leagueGroupMeta.weekId}:${leagueGroupMeta.groupId}:${Math.floor(myLeagueChestContribution)}`;
    if (leagueChestRewardCheckKeyRef.current === checkKey) return;
    leagueChestRewardCheckKeyRef.current = checkKey;
    let cancelled = false;
    void ensureLeagueChestRewards({
      weekId: leagueGroupMeta.weekId,
      groupId: leagueGroupMeta.groupId,
      leagueId: leagueGroupMeta.leagueId,
      members: sortedGroup.map((m) => ({
        uid: m.uid,
        name: m.name,
        points: Math.max(0, Math.floor(Number(m.points) || 0)),
        isMe: m.isMe,
      })),
      chestReady: leagueChestReady,
      myContribution: myLeagueChestContribution,
    }).then((res) => {
      if (cancelled || !isMountedRef.current) return;
      if (res.claimed) setLeagueChestClaimed(true);
      if (res.rewards) {
        setLeagueChestOpenModal({
          crownName: res.crown?.name,
          isCrownWinner: !!res.crown?.uid && res.crown.uid === arenaClubStableUid,
        });
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: '+30 осколков, x2 XP на 3 раза, энергия за 5 минут и щит серии +1',
          uk: '+30 осколків, x2 XP на 3 рази, енергія за 5 хвилин і щит серії +1',
          es: '+30 fragmentos, x2 XP por 3 usos, energía en 5 min y escudo de racha +1',
        }));
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [leagueRaceVisible, leagueChestReady, leagueGroupMeta, leagueChestClaimed, myLeagueChestContribution, sortedGroup, lang, arenaClubStableUid]);

  const showLeagueToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    emitAppEvent('action_toast', {
      type,
      messageRu: message,
      messageUk: message,
      messageEs: message,
    });
  }, []);

  const onSnapToLeague = useCallback((x: number) => {
    const raw = Math.round(x / LEAGUE_ITEM_FULL);
    const idx = Math.max(0, Math.min(LEAGUES.length - 1, raw));
    const leagueId = LEAGUES[idx]?.id ?? 0;
    setSelectedLeagueId(leagueId);
    if (lastSnapLeagueRef.current !== leagueId) {
      lastSnapLeagueRef.current = leagueId;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [LEAGUE_ITEM_FULL]);

  useEffect(() => {
    if (leagueRailWidth <= 0) return;
    setRailSideInset(Math.max(12, Math.round((leagueRailWidth - LEAGUE_ITEM_SIZE) / 2)));
  }, [leagueRailWidth, LEAGUE_ITEM_SIZE]);

  const snapOffsets = LEAGUES.map((_, idx) => idx * LEAGUE_ITEM_FULL);
  const x2BoostOptions = LEAGUE_PERSONAL_BOOSTS.filter((b) => b.multiplier === 2);
  const x3BoostDef = getLeagueBoostDef('x3_15m');

  useEffect(() => {
    if (!contentScrollRef.current || leaderboardTopY == null || contentViewportHeight <= 0 || myRowIndex < 0) return;
    const scrollKey = `${getWeekId()}-${myLeagueId}-${group.length}-${myRowIndex}`;
    if (didAutoScrollToMyRowRef.current === scrollKey) return;
    didAutoScrollToMyRowRef.current = scrollKey;

    const rowCenterY = leaderboardTopY + myRowIndex * ROW_HEIGHT_CLUB + ROW_HEIGHT_CLUB / 2;
    const targetY = Math.max(0, rowCenterY - contentViewportHeight * 0.45);
    const id = setTimeout(() => {
      contentScrollRef.current?.scrollTo({ y: targetY, animated: false });
    }, 80);
    return () => clearTimeout(id);
  }, [ROW_HEIGHT_CLUB, contentViewportHeight, group.length, leaderboardTopY, myLeagueId, myRowIndex]);

  const boostLabel = (boost: LeaguePersonalBoostDef): string => {
    if (boost.id === 'x2_30m') return triLang(lang, { ru: '30 минут', uk: '30 хвилин', es: '30 minutos' });
    if (boost.id === 'x2_1h') return triLang(lang, { ru: '1 час', uk: '1 година', es: '1 hora' });
    if (boost.id === 'x2_2h') return triLang(lang, { ru: '2 часа', uk: '2 години', es: '2 horas' });
    return triLang(lang, { ru: '15 минут', uk: '15 хвилин', es: '15 minutos' });
  };

  const buyBoost = async (id: 'x2_30m' | 'x2_1h' | 'x2_2h' | 'x3_15m') => {
    if (activeLeagueBoost) {
      setGameAlert({
        title: triLang(lang, { ru: 'Буст уже активен', uk: 'Буст вже активний', es: 'Ya tienes un impulso activo' }),
        message: triLang(lang, {
          ru: 'Дождись окончания текущего буста.',
          uk: 'Дочекайся завершення поточного буста.',
          es: 'Espera a que termine el impulso actual antes de activar otro.',
        }),
        actions: [{ label: 'OK', style: 'default' }],
      });
      return;
    }
    const result = await buyAndActivateLeagueBoost(id);
    if (!result.ok) {
      if (result.reason === 'not_enough_shards') {
        setGameAlert({
          title: triLang(lang, { ru: 'Недостаточно осколков', uk: 'Недостатньо осколків', es: 'No tienes suficientes fragmentos de conocimiento' }),
          message: triLang(lang, {
            ru: 'Пополни баланс, чтобы активировать буст.',
            uk: 'Поповни баланс, щоб активувати буст.',
            es: 'Consigue más fragmentos para poder activar el impulso.',
          }),
          actions: [{ label: 'OK', style: 'default' }],
        });
      } else {
        setGameAlert({
          title: triLang(lang, { ru: 'Не удалось активировать', uk: 'Не вдалося активувати', es: 'No se pudo activar el impulso' }),
          message: triLang(lang, {
            ru: 'Попробуй ещё раз чуть позже.',
            uk: 'Спробуй ще раз трохи пізніше.',
            es: 'Inténtalo de nuevo un poco más tarde.',
          }),
          actions: [{ label: 'OK', style: 'default' }],
        });
      }
      return;
    }
    setShardsBalance(await getShardsBalance());
    await refreshActiveBoost();
    setGameAlert({
      title: triLang(lang, { ru: 'Буст активирован', uk: 'Буст активовано', es: 'Impulso activado' }),
      message: triLang(lang, {
        ru: 'Время действия уже запущено.',
        uk: 'Час дії вже запущено.',
        es: 'El periodo del impulso ya ha empezado.',
      }),
      actions: [{ label: 'OK', style: 'default' }],
    });
  };

  const confirmAndBuyBoost = (id: 'x2_30m' | 'x2_1h' | 'x2_2h' | 'x3_15m') => {
    const def = LEAGUE_PERSONAL_BOOSTS.find((b) => b.id === id);
    if (!def) return;
    const buyVerb = triLang(lang, { ru: 'Купить', uk: 'Купити', es: 'Comprar' });
    const forPrep = triLang(lang, { ru: 'за', uk: 'за', es: 'por' });
    setGameAlert({
      title: triLang(lang, { ru: 'Подтвердить покупку', uk: 'Підтвердити покупку', es: 'Confirmar la compra' }),
      message: `${buyVerb} x${def.multiplier} • ${boostLabel(def)} ${forPrep} ${def.costShards}?`,
      actions: [
        { label: triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' }), style: 'cancel' },
        {
          label: buyVerb,
          style: 'default',
          onPress: async () => {
            await buyBoost(id);
            setBoostMenuVisible(false);
            setX2Expanded(false);
            setX3Expanded(false);
          },
        },
      ],
    });
  };

  useEffect(() => {
    if (clubTab === 'chat') setBoostMenuVisible(false);
  }, [clubTab]);

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      {/* Хедер */}
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity
          testID="league-screen-back"
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver' })}
          activeOpacity={0.85}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/home' as any);
          }}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={28} color={sx.primary} />
        </TouchableOpacity>
        <Text style={{ color:sx.primary, fontSize: f.h2, fontWeight:'700', marginLeft:8, flex:1 }}>
          {triLang(lang, { ru: 'Лига недели', uk: 'Ліга тижня', es: 'Liga de la semana' })}
        </Text>
        {clubTab === 'rank' && (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!!activeLeagueBoost}
            onPress={() => setBoostMenuVisible(true)}
            style={{
              paddingHorizontal:12,
              paddingVertical:7,
              borderRadius:12,
              borderWidth:0.5,
              borderColor:t.border,
              backgroundColor: activeLeagueBoost ? '#3A3A3A' : t.bgCard,
              flexDirection:'row',
              alignItems:'center',
              gap:6,
              opacity: activeLeagueBoost ? 0.9 : 1,
            }}
          >
            <Ionicons name="flash-outline" size={15} color={activeLeagueBoost ? '#CFCFCF' : t.textPrimary} />
            <Text style={{ color: activeLeagueBoost ? '#CFCFCF' : t.textPrimary, fontSize:f.sub, fontWeight:'800' }}>
              {activeLeagueBoost ? activeLeagueBoostTime : triLang(lang, { ru: 'Буст', uk: 'Буст', es: 'Impulso' })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={contentScrollRef}
        onLayout={(e) => setContentViewportHeight(e.nativeEvent.layout.height)}
        scrollEnabled={clubTab !== 'chat'}
        keyboardShouldPersistTaps="handled"
        style={clubTab === 'chat' ? { flexGrow: 0, flexShrink: 0 } : { flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: clubTab === 'chat' ? 8 : 16,
          gap: 12,
        }}
      >

        {clubTab === 'rank' && rankDelta && (
          <RankChangeBanner
            delta={rankDelta.delta}
            passedName={rankDelta.passedName}
            lostToName={rankDelta.lostToName}
            lang={lang}
            onClose={() => setRankDelta(null)}
          />
        )}

        <View style={{ flexDirection:'row', backgroundColor:t.bgCard, borderRadius:14, borderWidth:0.5, borderColor:t.border, padding:4, gap:4, marginHorizontal: clubTab === 'chat' ? 16 : 0 }}>
          {([
            ['rank', triLang(lang, { ru: 'Рейтинг', uk: 'Рейтинг', es: 'Ranking' }), 'podium-outline'],
            ['chat', triLang(lang, { ru: 'Чат', uk: 'Чат', es: 'Chat' }), 'chatbubbles-outline'],
          ] as const).map(([key, label, icon]) => {
            const active = clubTab === key;
            return (
              <TouchableOpacity
                key={key}
                testID={`club-tab-${key}`}
                activeOpacity={0.86}
                onPress={() => {
                  setClubTab(key);
                  void Haptics.selectionAsync().catch(() => {});
                }}
                style={{
                  flex:1,
                  minHeight:42,
                  borderRadius:10,
                  alignItems:'center',
                  justifyContent:'center',
                  flexDirection:'row',
                  gap:7,
                  backgroundColor: active ? t.accent : 'transparent',
                }}
              >
                <Ionicons name={icon as any} size={17} color={active ? t.correctText : t.textMuted} />
                <Text style={{ color:active ? t.correctText : t.textMuted, fontSize:f.sub, fontWeight:'900' }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {clubTab !== 'chat' && (
        <>
        {/* ── Горизонтальная лента лиг ── */}
        <View
          onLayout={(e) => setLeagueRailWidth(e.nativeEvent.layout.width)}
          style={{ paddingVertical: 12, overflow: 'visible' }}
        >
          <Animated.ScrollView
            ref={leagueRailRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToOffsets={snapOffsets}
            snapToAlignment="start"
            decelerationRate={0.94}
            disableIntervalMomentum
            bounces={false}
            overScrollMode="never"
            onMomentumScrollEnd={(e) => onSnapToLeague(e.nativeEvent.contentOffset.x)}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: railScrollX } } }],
              // Native driver: scroll-linked scale/opacity run on UI thread (smooth).
              // If you see disconnectAnimatedNodeFromView on fast back navigation, switch to useNativeDriver: false + throttle 1.
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            style={{ overflow: 'visible' }}
            contentContainerStyle={{ paddingHorizontal: railSideInset, paddingVertical: 6, gap: LEAGUE_ITEM_GAP }}
          >
            {LEAGUES.map((league, idx) => {
              const isSelectedLeague = league.id === selectedLeagueId;
              const isLockedLeague = league.id > myLeagueId;
              const tagText = leagueTag(lang, league.tagRU, league.tagUK);
              // 5-точечный inputRange — даёт более «крутилочный» эффект:
              // boczne иконки почти исчезают, центральная сильно укрупняется.
              const center = idx * LEAGUE_ITEM_FULL;
              const inputRange = [
                center - LEAGUE_ITEM_FULL * 1.5,
                center - LEAGUE_ITEM_FULL,
                center,
                center + LEAGUE_ITEM_FULL,
                center + LEAGUE_ITEM_FULL * 1.5,
              ];
              const iconScale = railScrollX.interpolate({
                inputRange,
                outputRange: [0.72, 0.88, 1.24, 0.88, 0.72],
                extrapolate: 'clamp',
              });
              const iconOpacity = railScrollX.interpolate({
                inputRange,
                outputRange: [0.25, 0.5, 1, 0.5, 0.25],
                extrapolate: 'clamp',
              });
              const iconTranslateY = railScrollX.interpolate({
                inputRange,
                outputRange: [4, 2, 0, 2, 4],
                extrapolate: 'clamp',
              });
              const labelOpacity = railScrollX.interpolate({
                inputRange,
                outputRange: [0.2, 0.45, 1, 0.45, 0.2],
                extrapolate: 'clamp',
              });
              return (
                <TouchableOpacity
                  key={league.id}
                  activeOpacity={isLockedLeague ? 1 : 0.9}
                  disabled={isLockedLeague}
                  onPress={() => {
                    if (isLockedLeague) return;
                    const targetX = idx * LEAGUE_ITEM_FULL;
                    leagueRailRef.current?.scrollTo({ x: targetX, y: 0, animated: true });
                    setSelectedLeagueId(league.id);
                    setDescModal(league);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  style={{
                    width: LEAGUE_ITEM_SIZE,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    overflow: 'visible',
                  }}
                >
                  <Animated.View style={{
                    transform: [{ scale: iconScale }, { translateY: iconTranslateY }],
                    opacity: iconOpacity,
                    width: 72,
                    height: 72,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'visible',
                  }}>
                    <LeagueIcon
                      league={league}
                      size={52}
                      pulse={false}
                      active={isSelectedLeague && !isLockedLeague}
                      locked={isLockedLeague}
                    />
                  </Animated.View>
                  <Animated.Text
                    numberOfLines={2}
                    style={{
                      color: isLockedLeague ? sx.ghost : (isSelectedLeague ? sx.primary : sx.muted),
                      textAlign: 'center',
                      fontSize: 11,
                      lineHeight: 14,
                      fontWeight: isSelectedLeague ? '700' : '600',
                      opacity: labelOpacity,
                      width: '100%',
                      paddingHorizontal: 4,
                    }}
                  >
                    {triLang(lang, {
                      ru: (() => {
                        const n = league.nameRU;
                        if (/^лига\s+/i.test(n)) {
                          // "Лига Черного Алмаза" → "Черного\nАлмаза"
                          return n.replace(/^лига\s+/i, '').replace(/\s+/, '\n');
                        }
                        // "Золотая лига" → "Золотая\nлига"
                        return n.replace(/\s+лига$/i, '\nлига');
                      })(),
                      uk: league.nameUK,
                      es: league.nameES,
                    })}
                  </Animated.Text>
                  {tagText ? (
                    <Animated.Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      style={{
                        color: isLockedLeague ? sx.ghost : (isSelectedLeague ? '#D4A017' : sx.ghost),
                        textAlign: 'center',
                        fontSize: 11,
                        lineHeight: 14,
                        fontWeight: '700',
                        opacity: labelOpacity,
                        width: '100%',
                      }}
                    >
                      {tagText}
                    </Animated.Text>
                  ) : (
                    <View style={{ height: 14 }} />
                  )}
                  {isSelectedLeague && !isLockedLeague && (
                    <View style={{ width:24, height:2, borderRadius:2, backgroundColor:league.color, marginTop:2 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.ScrollView>
        </View>

        {leagueRaceVisible && (
        <View style={{ backgroundColor:t.bgCard, borderRadius:16, borderWidth:0.5, borderColor:t.border, padding:14, gap:12 }}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
              <Ionicons name="gift-outline" size={19} color={t.accent} />
              <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'900', flex:1 }} numberOfLines={1}>
                {triLang(lang, { ru: 'Бонус лиги', uk: 'Бонус ліги', es: 'Bono de liga' })}
              </Text>
            </View>
            <Text style={{ color: leagueChestReady ? t.correct : t.accent, fontSize:f.body, fontWeight:'900' }}>
              {leagueChestPct}%
            </Text>
          </View>
          <View style={{ height:10, borderRadius:6, overflow:'hidden', backgroundColor:t.bgSurface, borderWidth:0.5, borderColor:t.border }}>
            <View style={{ height:'100%', width:`${leagueChestPct}%` as any, backgroundColor: leagueChestReady ? t.correct : t.accent, borderRadius:6 }} />
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <Text style={{ color:t.textSecond, fontSize:f.caption, fontWeight:'900', flex:1 }} numberOfLines={1}>
              {leagueChestProgress.toLocaleString()} / {leagueChestGoal.toLocaleString()} XP
            </Text>
          </View>
          {!!leagueCrownWinnerName && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:6, paddingTop:2 }}>
              <Ionicons name="trophy-outline" size={15} color={LEAGUE_CROWN_NICK_COLOR} />
              <Text style={{ color:t.textSecond, fontSize:Math.max(10, f.caption - 1), fontWeight:'800', flex:1 }} numberOfLines={1}>
                {triLang(lang, { ru: `Корона недели: ${leagueCrownWinnerName}`, uk: `Корона тижня: ${leagueCrownWinnerName}`, es: `Corona semanal: ${leagueCrownWinnerName}` })}
              </Text>
            </View>
          )}
          {!leagueChestReady && crownRaceTop.length > 0 && (
            <View style={{ backgroundColor:t.bgSurface, borderRadius:12, borderWidth:0.5, borderColor:t.border, padding:10, gap:8 }}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6, flex:1, minWidth:0 }}>
                  <Ionicons name="trophy-outline" size={16} color={LEAGUE_CROWN_NICK_COLOR} />
                  <Text style={{ color:t.textPrimary, fontSize:f.caption, fontWeight:'900', flex:1 }} numberOfLines={1}>
                    {triLang(lang, { ru: 'Гонка за корону', uk: 'Гонка за корону', es: 'Carrera por la corona' })}
                  </Text>
                </View>
              </View>
              <View style={{ gap:6 }}>
                {crownRaceTop.map((p, idx) => {
                  const points = Math.max(0, Math.floor(Number(p.points) || 0));
                  return (
                    <View key={p.uid || `${p.name}-${idx}`} style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <Text style={{ width:18, color:idx === 0 ? LEAGUE_CROWN_NICK_COLOR : t.textMuted, fontSize:f.caption, fontWeight:'900' }}>
                        {idx + 1}
                      </Text>
                      <Text style={{ color:p.isMe ? t.accent : t.textSecond, fontSize:f.caption, fontWeight:'900', flex:1 }} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={{ color:t.textMuted, fontSize:f.caption, fontWeight:'800' }}>
                        {points}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
        )}

        <View
          onLayout={(e) => setLeaderboardTopY(e.nativeEvent.layout.y)}
          style={{ backgroundColor:t.bgCard, borderRadius:16, borderWidth:0.5, borderColor:t.border, overflow:'hidden', marginTop:8 }}
        >
          {sortedGroup.length === 0 ? (
            <Text style={{ color:t.textGhost, fontSize: f.sub, padding:16, textAlign:'center' }}>
              {triLang(lang, {
                uk: 'Ще немає учасників',
                ru: 'Пока нет участников',
                es: 'Aún no hay participantes',
              })}
            </Text>
          ) : (
            sortedGroup.map((p, i) => {
              const isPromotionZone = promotionCutoff > 0 && i < promotionCutoff;
              const isRelegationZone = i >= relegationStartIndex;
              const rowXp = p.isMe ? playerXP : (p.totalXp ?? 0);
              const rowAvatar = p.isMe
                ? myAvatarEmoji
                : (p.avatar ?? String(getBestAvatarForLevel(getLevelFromXP(rowXp))));
              const rowBg = isPromotionZone
                ? 'rgba(52, 199, 89, 0.09)'
                : isRelegationZone
                  ? 'rgba(255, 59, 48, 0.09)'
                  : 'transparent';
              const isMyRow = !!p.isMe;
              const rowFinalBg = isMyRow ? t.accentBg : rowBg;
              const rowMask = rowFinalBg === 'transparent' ? t.bgCard : rowFinalBg;
              const boostMult = p.leagueBoostMultiplier;
              const boostUntil = p.leagueBoostExpiresAt ?? 0;
              const showLeagueBoost =
                typeof boostMult === 'number' && boostMult > 1 && boostUntil > Date.now();
              const hasLeagueCrown = leagueRaceVisible && !!p.uid && (
                p.uid === leagueCrownWinnerUid ||
                Number(leagueCrownsByUid[p.uid]?.expiresAt) > Date.now()
              );
              const rowInner = (
              <TouchableOpacity
                testID={`league-row-${p.uid || i}`}
                accessibilityLabel={`qa-league-row-${p.uid || i}`}
                activeOpacity={0.7}
                onPress={() => setProfile({
                  name: p.name,
                  points: p.isMe ? playerXP : (p.totalXp ?? p.points),
                  totalXp: p.isMe ? playerXP : (p.totalXp ?? undefined),
                  isMe: p.isMe,
                  leagueId: p.leagueId ?? myLeague.id,
                  uid: p.uid,
                  isPremium: p.isPremium ?? false,
                  avatar: p.avatar,
                  frame: p.frame,
                  aura: p.isMe ? myAuraId : p.aura,
                  streak: p.streak ?? null,
                  weekXp: p.points,
                  leagueCrownExpiresAt: hasLeagueCrown
                    ? Math.max(Date.now() + 1, Number(leagueCrownsByUid[p.uid ?? '']?.expiresAt) || 0)
                    : undefined,
                  profileCardLevel: p.profileCardLevel,
                  profileCardTheme: p.profileCardTheme,
                  profileCardMotion: p.profileCardMotion,
                  profileCardPublicFocus: p.profileCardPublicFocus,
                })}
                style={{
                  flexDirection:'row', alignItems:'center',
                  paddingHorizontal:16, paddingVertical:11,
                  borderBottomWidth: i < sortedGroup.length - 1 ? 0.5 : 0,
                  borderBottomColor: t.border,
                  backgroundColor: rowFinalBg,
                  borderLeftWidth: isMyRow ? 4 : 0,
                  borderLeftColor: isMyRow ? t.accent : 'transparent',
                }}
              >
                <Text style={{ width:24, fontSize: 14, color: isMyRow ? t.accent : t.textPrimary, fontWeight: isMyRow ? '900' : '400' }}>{i + 1}</Text>
                <View style={{
                  marginLeft: 2,
                  marginRight: 10,
                  borderRadius: 999,
                  padding: hasLeagueCrown ? 2 : 0,
                  borderWidth: hasLeagueCrown ? 1.5 : 0,
                  borderColor: hasLeagueCrown ? LEAGUE_CROWN_NICK_COLOR : 'transparent',
                  shadowColor: hasLeagueCrown ? LEAGUE_CROWN_NICK_COLOR : 'transparent',
                  shadowOpacity: hasLeagueCrown ? 0.35 : 0,
                  shadowRadius: hasLeagueCrown ? 8 : 0,
                  shadowOffset: { width: 0, height: 0 },
                }}>
                  <PremiumAvatarHalo
                    enabled={!!p.isPremium}
                    avatarSize={36}
                    maskColor={rowMask}
                  >
                    <AvatarView
                      avatar={rowAvatar}
                      totalXP={rowXp}
                      size={36}
                      auraId={getEffectiveAvatarAuraId(p.isMe ? myAuraId : p.aura, p.isPremium)}
                    />
                  </PremiumAvatarHalo>
                </View>
                <View style={{ flex:1, minWidth: 0 }}>
                  {hasLeagueCrown ? (
                    <LeagueCrownName text={p.name} fontSize={f.body} />
                  ) : !!p.isPremium ? (
                    <PremiumGoldUserName text={p.name} fontSize={f.body} />
                  ) : (
                    <Text numberOfLines={1} style={{ fontSize: f.body, color: isMyRow ? t.textPrimary : t.textSecond, fontWeight: isMyRow ? '800' : '400' }}>
                      {p.name}
                    </Text>
                  )}
                </View>
                {isMyRow && (
                  <View style={{ marginRight: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: t.accent + '22', borderWidth: 0.5, borderColor: t.accent + '55' }}>
                    <Text style={{ color: t.accent, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>
                      {triLang(lang, { ru: 'Вы', uk: 'Ви', es: 'Tú' })}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection:'row', alignItems:'center', gap:5, flexShrink: 0 }}>
                  {showLeagueBoost && (
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#f472b6' }}>
                      ×{boostMult}⚡
                    </Text>
                  )}
                  <Ionicons name="star" size={11} color={i < 3 ? t.gold : t.textMuted} />
                  <Text style={{ color: i < 3 ? t.gold : t.textMuted, fontSize: f.body, fontWeight:'600' }}>
                    {p.points}
                  </Text>
                </View>
              </TouchableOpacity>
              );
              return (
              <View
                key={p.uid || `${p.name}-${i}`}
              >
                {p.isMe ? (
                  <Animated.View
                    style={{
                      transform: [{ translateY: myRowAnim }],
                      zIndex: 5,
                      elevation: 5,
                    }}
                  >
                    {rowInner}
                  </Animated.View>
                ) : (
                  rowInner
                )}
              </View>
            );
            })
          )}
        </View>
        </>
        )}

      </ScrollView>

      {clubTab === 'chat' && (
        <View style={{ flex: 1, minHeight: 0 }}>
          <LeagueChatPanel
            fallbackRoom={leagueGroupMeta}
            myUid={arenaClubStableUid}
            myAvatar={myAvatarEmoji}
            myAuraId={myAuraId}
            myTotalXP={playerXP}
            onToast={showLeagueToast}
          />
        </View>
      )}
      </ContentWrap>

      <UnifiedPlayerModal
        player={profilePlayer}
        myInfo={{
          name: userName,
          avatar: myAvatarEmoji,
          frame: myFrameId,
          aura: myAuraId,
          totalXP: playerXP,
          leagueId: myLeagueId,
        }}
        onClose={() => setProfile(null)}
      />

      <Modal
        visible={boostMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBoostMenuVisible(false)}
      >
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center', padding:24 }} onPress={() => setBoostMenuVisible(false)}>
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor:t.bgCard, borderRadius:18, padding:14, width:'90%', maxWidth:280, borderWidth:0.5, borderColor:t.border, gap:10 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setX2Expanded((prev) => !prev);
                  setX3Expanded(false);
                }}
                style={{ backgroundColor:t.bgSurface, borderRadius:12, paddingVertical:10, paddingHorizontal:12, borderWidth:0.5, borderColor:t.border, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}
              >
                <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'800' }}>{triLang(lang, { ru: 'x2 опыта', uk: 'x2 досвід', es: '×2 XP' })}</Text>
                <Ionicons name={x2Expanded ? 'chevron-down' : 'chevron-forward'} size={18} color={t.textMuted} />
              </TouchableOpacity>

              {x2Expanded && (
                <View style={{ gap:8, marginTop:-4 }}>
                  {x2BoostOptions.map((boost) => (
                    <TouchableOpacity
                      key={boost.id}
                      activeOpacity={0.85}
                      onPress={() => confirmAndBuyBoost(boost.id)}
                      style={{ marginHorizontal:6, backgroundColor:t.bgSurface, borderRadius:10, paddingVertical:9, paddingHorizontal:10, borderWidth:0.5, borderColor:t.border, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}
                    >
                      <Text style={{ color:t.textPrimary, fontSize:f.sub, fontWeight:'700' }}>{boostLabel(boost)}</Text>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                        <Text style={{ color:'#A78BFA', fontSize:f.sub, fontWeight:'800' }}>{boost.costShards}</Text>
                        <Image source={oskolokImageForPackShards(boost.costShards)} style={{ width:13, height:13 }} resizeMode="contain" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setX3Expanded((prev) => !prev);
                  setX2Expanded(false);
                }}
                style={{ backgroundColor:t.bgSurface, borderRadius:12, paddingVertical:10, paddingHorizontal:12, borderWidth:0.5, borderColor:t.border, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}
              >
                <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'800' }}>{triLang(lang, { ru: 'x3 опыта', uk: 'x3 досвід', es: '×3 XP' })}</Text>
                <Ionicons name={x3Expanded ? 'chevron-down' : 'flash'} size={16} color="#A78BFA" />
              </TouchableOpacity>

              {x3Expanded && x3BoostDef && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => confirmAndBuyBoost('x3_15m')}
                  style={{ marginTop:-4, marginHorizontal:6, backgroundColor:t.bgSurface, borderRadius:10, paddingVertical:9, paddingHorizontal:10, borderWidth:0.5, borderColor:t.border, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}
                >
                  <Text style={{ color:t.textPrimary, fontSize:f.sub, fontWeight:'700' }}>{boostLabel(x3BoostDef)}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                    <Text style={{ color:'#A78BFA', fontSize:f.sub, fontWeight:'800' }}>{x3BoostDef.costShards}</Text>
                    <Image source={oskolokImageForPackShards(x3BoostDef.costShards)} style={{ width:13, height:13 }} resizeMode="contain" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Описание лиги — попап при тапе на иконку */}
      <Modal
        visible={descModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDescModal(null)}
      >
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center', padding:24 }} onPress={() => setDescModal(null)}>
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor:t.bgCard, borderRadius:20, padding:24, maxWidth:360, borderWidth:0.5, borderColor:t.border }}>
              <Text style={{ color:t.textPrimary, fontSize:f.h2, fontWeight:'800', marginBottom:12, textAlign:'center' }}>
                {descModal ? triLang(lang, { ru: descModal.nameRU, uk: descModal.nameUK, es: descModal.nameES }) : ''}
              </Text>
              <Text style={{ color:t.textSecond, fontSize:f.body, lineHeight:22, textAlign:'center' }}>
                {descModal ? leagueDesc(lang, descModal.id, descModal.descRU, descModal.descUK) : ''}
              </Text>
              {!!descModal && !!leagueTag(lang, descModal.tagRU, descModal.tagUK) && (
                <Text style={{ color:'#D4A017', fontSize:f.body, fontWeight:'700', textAlign:'center', marginTop:12 }}>
                  ⭐ {leagueTag(lang, descModal.tagRU, descModal.tagUK)}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => setDescModal(null)}
                style={{ marginTop:20, backgroundColor:t.accent, borderRadius:12, paddingVertical:12, alignItems:'center' }}
              >
                <Text style={{ color:t.correctText, fontWeight:'700', fontSize:f.body }}>OK</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={gameAlert !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setGameAlert(null)}
      >
        <Pressable
          style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center', padding:24 }}
          onPress={() => setGameAlert(null)}
        >
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor:t.bgCard, borderRadius:18, padding:18, width:'90%', maxWidth:320, borderWidth:0.5, borderColor:t.border }}>
              <Text style={{ color:t.textPrimary, fontSize:f.h2, fontWeight:'800', marginBottom:10 }}>
                {gameAlert?.title}
              </Text>
              <Text style={{ color:t.textSecond, fontSize:f.body, lineHeight:22 }}>
                {gameAlert?.message}
              </Text>
              <View style={{ marginTop:18, flexDirection:'row', justifyContent:'flex-end', gap:10 }}>
                {(gameAlert?.actions ?? []).map((action, idx) => (
                  <TouchableOpacity
                    key={`${action.label}-${idx}`}
                    onPress={async () => {
                      setGameAlert(null);
                      await action.onPress?.();
                    }}
                    style={{
                      paddingVertical:10,
                      paddingHorizontal:14,
                      borderRadius:10,
                      backgroundColor: action.style === 'cancel' ? t.bgSurface : t.accent,
                      borderWidth:0.5,
                      borderColor:t.border,
                    }}
                  >
                    <Text style={{ color: action.style === 'cancel' ? t.textPrimary : t.correctText, fontSize:f.sub, fontWeight:'800' }}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <LeagueChestOpenModal
        visible={leagueRaceVisible && leagueChestOpenModal !== null}
        crownName={leagueChestOpenModal?.crownName}
        isCrownWinner={leagueChestOpenModal?.isCrownWinner}
        onClose={() => setLeagueChestOpenModal(null)}
        onShowLeaderboard={() => {
          setLeagueChestOpenModal(null);
          setClubTab('rank');
          const y = Math.max(0, (leaderboardTopY ?? 0) - 12);
          contentScrollRef.current?.scrollTo({ y, animated: true });
        }}
      />

      {pendingLeagueResult && (
        <LeagueResultModal
          visible={true}
          result={pendingLeagueResult}
          onClose={() => {
            // СИНХРОННО ставим оба гарда до любого await — иначе параллельный focus-loadData
            // успеет регенерировать pending и модалка вылетит снова.
            dismissedLeagueResultThisSessionRef.current = true;
            setPendingLeagueResult(null);
            void clearPendingResult();
          }}
        />
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}
