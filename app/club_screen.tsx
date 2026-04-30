import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Animated, Pressable, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import InGameToast from '../components/InGameToast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import UnifiedPlayerModal, { PlayerInfo as UnifiedPlayerInfo } from '../components/PlayerProfileModal';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import PremiumGoldUserName from '../components/PremiumGoldUserName';
import AvatarView from '../components/AvatarView';
import PremiumAvatarHalo from '../components/PremiumAvatarHalo';
import {
  LEAGUES,
  CLUB_DESC_ES,
  GroupMember, LeagueState, LeagueResult,
  checkLeagueOnAppOpen,
  getWeekId,
  loadLeagueState,
  invalidateLeagueGroupCache,
} from './league_engine';
import { checkAchievements } from './achievements';
import { logLeaguePromoted } from './firebase';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getTitleString } from '../constants/titles';

import { getMyWeekPoints } from './hall_of_fame_utils';
import { ensureAnonUser } from './cloud_sync';
import { getCanonicalUserId } from './user_id_policy';
import { getXPProgress, getLevelFromXP } from '../constants/theme';
import {
  loadPrevRank, savePrevRank, computeRankDelta,
  KEY_CLUB_PREV_RANK, RankDelta,
} from './rank_change';
import RankChangeBanner from '../components/RankChangeBanner';
import { getShardsBalance } from './shards_system';
import { onAppEvent } from './events';
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

// v2 — bumped после фикса race на signInAnonymously + остановки записи fallback'а
// в league_state_v3. Старый таймер мог хранить «не обновлять» с момента, когда
// fetchGroupForUser возвращал только пользователя из-за PERMISSION_DENIED.
const CLUB_REMOTE_REFRESH_AT_KEY = 'club_remote_refresh_at_v2';
const CLUB_REMOTE_REFRESH_MS = 6 * 60 * 60 * 1000;

function leagueTag(lang: Lang, tagRU: string, tagUK: string): string {
  const es = tagRU.replace(/^Бонус:\s*/i, 'Bonificación: ');
  return triLang(lang, { ru: tagRU, uk: tagUK, es });
}

function leagueDesc(lang: Lang, leagueId: number, descRU: string, descUK: string): string {
  return triLang(lang, {
    ru: descRU,
    uk: descUK,
    es: CLUB_DESC_ES[leagueId] ?? descRU,
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
        tintColor: locked ? '#7A7A7A' : undefined,
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
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [myLeagueId, setMyLeagueId]     = useState(0);
  const [selectedLeagueId, setSelectedLeagueId] = useState(0);
  const [group, setGroup]               = useState<GroupMember[]>([]);
  const [descModal, setDescModal]       = useState<(typeof LEAGUES)[number] | null>(null);
  const [profilePlayer, setProfile]     = useState<UnifiedPlayerInfo | null>(null);
  const [myAvatarEmoji, setMyAvatarEmoji] = useState('🐣');
  const [myFrameId, setMyFrameId]         = useState('plain');
  const [userName, setUserName]         = useState('');
  const [playerXP, setPlayerXP]         = useState(0);
  const [toast, setToast] = useState<string | null>(null);
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
  const myRowAnim = useRef(new Animated.Value(0)).current;
  const railScrollX = useRef(new Animated.Value(0)).current;
  const ROW_HEIGHT_CLUB = 60;
  const leagueRailRef = useRef<ScrollView | null>(null);
  const [leagueRailWidth, setLeagueRailWidth] = useState(0);
  const LEAGUE_ITEM_SIZE = 104;
  const LEAGUE_ITEM_GAP = 14;
  const LEAGUE_ITEM_FULL = LEAGUE_ITEM_SIZE + LEAGUE_ITEM_GAP;
  const lastSnapLeagueRef = useRef<number | null>(null);
  const [railSideInset, setRailSideInset] = useState(12);

  const isMountedRef = useRef(true);

  const LEAGUE_LOAD_TIMEOUT_MS = 22_000;

  const loadData = useCallback(async (opts?: { forceRemote?: boolean }) => {
    const applyLeagueOpen = (
      state: LeagueState,
      result: LeagueResult | null,
      fromRemote: boolean,
    ) => {
      if (!isMountedRef.current) return;
      setMyLeagueId(state.leagueId);
      setSelectedLeagueId(state.leagueId);
      if (result?.promoted) {
        checkAchievements({ type: 'league_promoted', newLeagueId: state.leagueId }).catch(() => {});
        const promotedLeague = LEAGUES.find(l => l.id === state.leagueId);
        if (promotedLeague) logLeaguePromoted(promotedLeague.nameRU);
      }
      setGroup(state.group);
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
          // Анимация моей строки: стартует со старой Y, плывёт в 0.
          // delta>0 = поднялся → старая позиция была НИЖЕ (translateY > 0), едем вверх к 0.
          // delta<0 = опустился → старая позиция была ВЫШЕ (translateY < 0), едем вниз к 0.
          const startOffset = delta.delta * ROW_HEIGHT_CLUB;
          myRowAnim.setValue(startOffset);
          Animated.timing(myRowAnim, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }).start();
        }
        await savePrevRank(KEY_CLUB_PREV_RANK, { rank: newRank, contextKey: ctxKey, ts: Date.now() });
      })();
    };

    try {
      // ── Фаза 1: мгновенно читаем локальный кеш ──────────────────────────────
      const [name, frame, phrasm, xp, canonicalUid, cachedLeague] = await Promise.all([
        AsyncStorage.getItem('user_name'),
        AsyncStorage.getItem('user_frame'),
        AsyncStorage.getItem('user_phrasm'),
        AsyncStorage.getItem('user_total_xp'),
        getCanonicalUserId(),
        loadLeagueState(),
      ]);
      if (!isMountedRef.current) return;

      const xpNum = parseInt(xp || '0', 10);
      const anonLevel = getXPProgress(xpNum).level;
      const anonTitle = getTitleString(anonLevel, lang ?? 'ru');
      const suffix = canonicalUid ? canonicalUid.replace(/-/g, '').slice(-4) : String(Math.floor(1000 + Math.random() * 9000));
      const anonName = anonTitle + ' #' + suffix;
      const n = name || anonName;

      setUserName(n);
      setPlayerXP(xpNum);
      setShardsBalance(await getShardsBalance());
      setMyAvatarEmoji(getBestAvatarForLevel(getLevelFromXP(xpNum)));
      if (frame) setMyFrameId(frame);

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
      const lastRemoteAtRaw = await AsyncStorage.getItem(CLUB_REMOTE_REFRESH_AT_KEY);
      const lastRemoteAt = parseInt(lastRemoteAtRaw || '0', 10) || 0;
      const shouldRefreshRemote = !!opts?.forceRemote || (Date.now() - lastRemoteAt >= CLUB_REMOTE_REFRESH_MS);
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
  const relegationStartIndex = Math.max(0, sortedGroup.length - zoneSize);
  const myRank      = sortedGroup.findIndex(m => m.isMe) + 1;
  const total       = sortedGroup.length;
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

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      {/* Хедер */}
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/home' as any);
        }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color:t.textPrimary, fontSize: f.h2, fontWeight:'700', marginLeft:8, flex:1 }}>
          {triLang(lang, { ru: 'Лига недели', uk: 'Ліга тижня', es: 'Liga de la semana' })}
        </Text>
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
      </View>

      <ScrollView
        contentContainerStyle={{ padding:16, gap:12 }}
      >

        {rankDelta && (
          <RankChangeBanner
            delta={rankDelta.delta}
            passedName={rankDelta.passedName}
            lostToName={rankDelta.lostToName}
            lang={lang}
            onClose={() => setRankDelta(null)}
          />
        )}

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
                      color: isLockedLeague ? '#7A7A7A' : (isSelectedLeague ? t.textPrimary : t.textMuted),
                      textAlign: 'center',
                      fontSize: f.caption,
                      lineHeight: Math.round(f.caption * 1.2),
                      fontWeight: isSelectedLeague ? '700' : '600',
                      opacity: labelOpacity,
                      width: '100%',
                      paddingHorizontal: 2,
                      minHeight: Math.round(f.caption * 2.4),
                    }}
                  >
                    {triLang(lang, { ru: league.nameRU, uk: league.nameUK, es: league.nameES })}
                  </Animated.Text>
                  <Animated.Text
                    numberOfLines={1}
                    style={{
                      color: isLockedLeague ? '#8A8A8A' : (isSelectedLeague ? '#D4A017' : t.textGhost),
                      textAlign: 'center',
                      fontSize: Math.max(10, f.caption - 2),
                      fontWeight: '700',
                      opacity: labelOpacity,
                      width: '100%',
                    }}
                  >
                    {leagueTag(lang, league.tagRU, league.tagUK)}
                  </Animated.Text>
                  {isSelectedLeague && !isLockedLeague && (
                    <View style={{ width:24, height:2, borderRadius:2, backgroundColor:league.color, marginTop:2 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.ScrollView>
        </View>

        <Text style={{ color:t.textMuted, fontSize: f.label, textTransform:'uppercase', letterSpacing:0.8, marginTop:4 }}>
          {triLang(lang, {
            ru: 'Участники твоей лиги',
            uk: 'Учасники твоєї ліги',
            es: 'Compañeros de tu liga',
          })}
        </Text>
        <Text style={{ color:t.textSecond, fontSize: f.caption, marginTop:-2, marginBottom:2 }}>
          {triLang(lang, {
            ru: 'На этой неделе ты соревнуешься именно с этими участниками своей лиги.',
            uk: 'Цього тижня ти змагаєшся саме з цими учасниками у своїй лізі.',
            es: 'Esta semana compites con estos jugadores en tu liga.',
          })}
        </Text>

        <View style={{ backgroundColor:t.bgCard, borderRadius:16, borderWidth:0.5, borderColor:t.border, overflow:'hidden' }}>
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
              const isPromotionZone = i < zoneSize;
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
              const rowMask = rowBg === 'transparent' ? t.bgCard : rowBg;
              const rowTransform = p.isMe ? [{ translateY: myRowAnim }] : undefined;
              const rowZ = p.isMe ? 5 : 0;
              return (
              <Animated.View
                key={p.uid || `${p.name}-${i}`}
                style={{ transform: rowTransform, zIndex: rowZ, elevation: rowZ }}
              >
              <TouchableOpacity
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
                  streak: p.streak ?? null,
                  weekXp: p.points,
                })}
                style={{
                  flexDirection:'row', alignItems:'center',
                  paddingHorizontal:16, paddingVertical:11,
                  borderBottomWidth: i < sortedGroup.length - 1 ? 0.5 : 0,
                  borderBottomColor: t.border,
                  backgroundColor: rowBg,
                }}
              >
                <Text style={{ width:24, fontSize: 14, color:t.textPrimary }}>{i + 1}</Text>
                <PremiumAvatarHalo
                  enabled={!!p.isPremium}
                  avatarSize={36}
                  maskColor={rowMask}
                  style={{ marginLeft: 2, marginRight: 10 }}
                >
                  <AvatarView avatar={rowAvatar} totalXP={rowXp} size={36} />
                </PremiumAvatarHalo>
                <View style={{ flex:1 }}>
                  {!!p.isPremium ? (
                    <PremiumGoldUserName text={p.name} fontSize={f.body} />
                  ) : (
                    <Text style={{ fontSize: f.body, color: t.textSecond, fontWeight: '400' }}>
                      {p.name}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
                  <Ionicons name="star" size={11} color={i < 3 ? t.gold : t.textMuted} />
                  <Text style={{ color: i < 3 ? t.gold : t.textMuted, fontSize: f.body, fontWeight:'600' }}>
                    {p.points}
                  </Text>
                </View>
              </TouchableOpacity>
              </Animated.View>
            );
            })
          )}
        </View>

      </ScrollView>
      </ContentWrap>

      <UnifiedPlayerModal
        player={profilePlayer}
        myInfo={{
          name: userName,
          avatar: myAvatarEmoji,
          frame: myFrameId,
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
            <View style={{ backgroundColor:t.bgCard, borderRadius:18, padding:14, width:280, borderWidth:0.5, borderColor:t.border, gap:10 }}>
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
              {!!descModal && (
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
            <View style={{ backgroundColor:t.bgCard, borderRadius:18, padding:18, width:320, maxWidth:'95%', borderWidth:0.5, borderColor:t.border }}>
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

      <InGameToast message={toast} onHide={() => setToast(null)} type="error" />
    </SafeAreaView>
    </ScreenGradient>
  );
}

