import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TapScale from '../components/TapScale';
import { View, Text, ScrollView, TouchableOpacity, Modal, Animated, Easing, PanResponder } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from '../components/SafeLinearGradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { triLang, type Lang } from '../constants/i18n';
import UnifiedPlayerModal, { PlayerInfo as UnifiedPlayerInfo } from '../components/PlayerProfileModal';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import PremiumGoldUserName from '../components/PremiumGoldUserName';
import VipGreenUserName from '../components/VipGreenUserName';
import LeagueCrownName from '../components/LeagueCrownName';
import AvatarView from '../components/AvatarView';
import PremiumAvatarHalo from '../components/PremiumAvatarHalo';
import LeagueChestOpenModal from '../components/LeagueChestOpenModal';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import {
  LEAGUES,
  clubDescPlanned,
  clubNamePlanned,
  GroupMember, LeagueState, LeagueResult,
  checkLeagueOnAppOpen,
  clearPendingResult,
  getWeekId,
  getLeagueResultZoneSize,
  loadLeagueState,
  loadPendingResult,
  invalidateLeagueGroupCache,
} from './league_engine';
import LeagueResultModal from './LeagueResultModal';
import { logLeaguePromoted } from './firebase';
import { getBestAvatarForLevel } from '../constants/avatars';
import { PREMIUM_AVATAR_AURA_ID, USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId } from '../constants/avatar_auras';
import { getTitleString } from '../constants/titles';

import { getMyWeekPoints } from './hall_of_fame_utils';
import { ensureAnonUser } from './cloud_sync';
import { getCanonicalUserId } from './user_id_policy';
import { getXPProgress, getLevelFromXP, screenTextOnGradient } from '../constants/theme';
import { getLeagueBonusPalette } from '../constants/leagueBonusPalette';
import { getLeagueBonusGiftImage } from '../constants/leagueBonusGiftImages';
import {
  loadPrevRank, savePrevRank, computeRankDelta,
  KEY_CLUB_PREV_RANK, RankDelta,
} from './rank_change';
import RankChangeBanner from '../components/RankChangeBanner';
import { actionToastTri, emitAppEvent } from './events';
import { subscribeMyArenaClubWarEvent } from './services/arena_club_wars';
import {
  LEAGUE_BONUS_ADMIN_PREVIEW_KEY,
  LEAGUE_CROWN_NICK_COLOR,
  ensureLeagueChestRewards,
  fetchActiveLeagueCrowns,
  getLeagueChestGoal,
  resolveMyLeagueGroupMeta,
  unlockLeagueGoldThemeReward,
  type LeagueBonusAdminPreview,
  type LeagueCrown,
  type LeagueChestRewardDrop,
} from './services/league_chest_rewards';
import { shouldShowLeagueRace } from './league_race_visibility';
import { getCachedLeagueStateSync, shouldShowLeagueEmptyParticipants } from './league_open_cache_policy';
import LeagueChatPanel from '../components/LeagueChatPanel';
import { formatLeagueChatUnreadBadge } from './league_chat_unread';
import { useLeagueChatUnread } from './use_league_chat_unread';
import { checkAchievements } from './achievements';
import { GOLD_RICH } from '../constants/goldTheme';
import { safeRouterBack } from './navigation_back';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { oskolokImageForPackShards } from './oskolok';
import { tabSwipeLock } from './tabSwipeLock';
import { getLeagueSwipePreviewState, swipeLeaguePreview } from './league_swipe_preview';
import { getShardsBalance, replaceShardsBalanceLocal } from './shards_system';
import {
  LEAGUE_GROUP_BOOST_COST_SHARDS,
  LEAGUE_GROUP_BOOST_DURATION_MS,
  LEAGUE_GROUP_BOOST_MULTIPLIER,
  buyLeagueGroupBoost,
  cacheLeagueGroupBoost,
  fetchLeagueGroupBoostLikedToday,
  formatLeagueGroupBoostTimeLeft,
  likeLeagueGroupBoostBuyer,
  subscribeToActiveLeagueGroupBoost,
  type LeagueGroupBoostState,
} from './league_group_boosts';

// v2 — bumped после фикса race на signInAnonymously + остановки резервной записи
// в league_state_v3. Старый таймер мог хранить «не обновлять» с момента, когда
// fetchGroupForUser возвращал только пользователя из-за PERMISSION_DENIED.
const CLUB_REMOTE_REFRESH_AT_KEY = 'club_remote_refresh_at_v2';
const CLUB_REMOTE_REFRESH_MS = 6 * 60 * 60 * 1000;
const CLUB_ENTRY_REPEATING_MOTION_ENABLED = false;
const CLUB_ANIMATION_USE_NATIVE_DRIVER = false;
const CLUB_LEAGUE_PREVIEW_SWIPE_THRESHOLD = 54;
const CLUB_LEAGUE_PREVIEW_ICON_SLOT_SIZE = 148;
const CLUB_LEAGUE_PREVIEW_ICON_SIZE = 122;

/** Локальный календарный день — для «первый заход в лигу за день». */
const LEAGUE_PROMO_HINT_DAY_KEY = 'league_promo_hint_seen_calendar_day_v1';

function buildLeagueChestPreviewRewards(isCrownWinner: boolean): LeagueChestRewardDrop[] {
  const base: LeagueChestRewardDrop[] = [
    { id: 'preview_league_shards', kind: 'shards', rarity: 'common', amount: 24 },
    { id: 'preview_league_energy', kind: 'energy_fast_recovery', rarity: 'rare', recoveryMs: 5 * 60 * 1000 },
    { id: 'preview_league_xp', kind: 'xp_boost', rarity: 'rare', multiplier: 2, uses: 3 },
    { id: 'preview_league_aura_violet', kind: 'avatar_aura', rarity: 'epic', auraId: 'aura-violet' },
    { id: 'preview_league_avatar', kind: 'custom_avatar', rarity: 'epic', customAvatarId: 'future-league-avatar' },
    { id: 'preview_league_gold_theme', kind: 'gold_theme', rarity: 'legendary' },
  ];
  return isCrownWinner
    ? [
      ...base,
      { id: 'preview_league_arena_plays', kind: 'arena_plays', rarity: 'common', amount: 5 },
      { id: 'preview_league_bonus_shards', kind: 'shards', rarity: 'rare', amount: 18 },
    ]
    : base;
}

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
    'pt-BR': `Bônus de XP: ${formattedPct}`,
    vi: `Thưởng XP: ${formattedPct}`,
    id: `Bonus XP: ${formattedPct}`,
    tr: `XP bonusu: ${formattedPct}`,
    pl: `Bonus XP: ${formattedPct}`,
  });
}

function leaguePromotionHintText(lang: Lang, promotionCutoff: number): string {
  if (promotionCutoff <= 0) {
    return triLang(lang, {
      ru: 'Повышение станет доступно, когда в лиге будет хотя бы 2 участника.',
      uk: 'Підвищення стане доступним, коли в лізі буде хоча б 2 учасники.',
      es: 'El ascenso estará disponible cuando haya al menos 2 participantes en la liga.',
      'pt-BR': "A promoção ficará disponível quando houver pelo menos 2 participantes na liga.",
      vi: "Tính năng thăng hạng sẽ khả dụng khi giải đấu có ít nhất 2 người tham gia.",
      id: "Promosi akan tersedia saat liga memiliki setidaknya 2 peserta.",
      tr: "Lig içinde en az 2 katılımcı olduğunda yükselme kullanılabilir olacak.",
      pl: "Awans będzie dostępny, gdy w lidze będą co najmniej 2 uczestnicy.",
    });
  }
  return triLang(lang, {
    ru: `Чтобы перейти в следующую лигу, к концу недели нужно войти в топ-${promotionCutoff} по опыту, набранному за эту неделю.`,
    uk: `Щоб перейти в наступну лігу, до кінця тижня потрібно потрапити в топ-${promotionCutoff} за досвідом, зібраним за цей тиждень.`,
    es: `Para subir de liga, al final de la semana debes estar entre los ${promotionCutoff} primeros por experiencia ganada esta semana.`,
    'pt-BR': `Para subir para a próxima liga, você precisa terminar a semana no top-${promotionCutoff} por XP ganho nesta semana.`,
    vi: `Để lên giải tiếp theo, đến cuối tuần bạn cần nằm trong top-${promotionCutoff} theo XP kiếm được trong tuần này.`,
    id: `Untuk naik ke liga berikutnya, pada akhir minggu kamu harus masuk top-${promotionCutoff} berdasarkan XP yang didapat minggu ini.`,
    tr: `Bir sonraki lige geçmek için hafta sonunda bu hafta kazandığın XP ile ilk ${promotionCutoff} içinde olman gerekir.`,
    pl: `Aby przejść do następnej ligi, na koniec tygodnia musisz być w top-${promotionCutoff} według XP zdobytego w tym tygodniu.`,
  });
}

// ── League icon renderer ──────────────────────────────────────────────────────
const LEAGUE_ICON_SOURCE_SIZE = 384;
const LEAGUE_ICON_CONTENT_OFFSETS: Record<number, { x: number; y: number }> = {
  0: { x: -13, y: -14 },
  1: { x: 1, y: -20 },
  2: { x: 14.5, y: -12.5 },
  3: { x: 21.5, y: -19 },
  4: { x: -12.5, y: -1.5 },
  5: { x: -1, y: -1 },
  6: { x: 13, y: -1.5 },
  7: { x: 17.5, y: -0.5 },
  8: { x: -14.5, y: 16.5 },
  9: { x: 2.5, y: 11.5 },
  10: { x: 11.5, y: 13.5 },
  11: { x: 16.5, y: 13 },
};

function getLeagueIconContentOffset(leagueId: number, size: number): { x: number; y: number } {
  const offset = LEAGUE_ICON_CONTENT_OFFSETS[leagueId];
  if (!offset) return { x: 0, y: 0 };
  const scale = size / LEAGUE_ICON_SOURCE_SIZE;
  return { x: offset.x * scale, y: offset.y * scale };
}

function LeagueIconImageWithFallback({
  source,
  iconName,
  color,
  size,
  opacity,
  contentOffset = { x: 0, y: 0 },
}: {
  source?: any;
  iconName: string;
  color: string;
  size: number;
  opacity: number;
  contentOffset?: { x: number; y: number };
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {(!source || failed) ? (
        <Ionicons
          name={iconName as any}
          size={Math.max(14, Math.round(size * 0.8))}
          color={color}
          style={{ position: 'absolute', opacity }}
        />
      ) : null}
      {source ? (
        <Image
          source={source}
          style={{
            width: size,
            height: size,
            opacity,
            transform: [
              { translateX: contentOffset.x },
              { translateY: contentOffset.y },
            ],
          }}
          contentFit="contain"
          onLoad={() => setFailed(false)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

function LeagueBonusGiftImageWithFallback({
  source,
  color,
  size,
  opacity,
  style,
}: {
  source?: any;
  color: string;
  size: number;
  opacity: number;
  style?: any;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [source]);

  return (
    <View pointerEvents="none" style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {!loaded || !source ? (
        <Ionicons
          name="gift"
          size={Math.max(18, Math.round(size * 0.48))}
          color={color}
          style={{ position: 'absolute', opacity: Math.max(0.26, opacity) }}
        />
      ) : null}
      {source ? (
        <Image
          source={source}
          contentFit="contain"
          style={{ width: '100%', height: '100%', opacity }}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      ) : null}
    </View>
  );
}

function LeagueIcon({
  league,
  size = 24,
  pulse = false,
  active = false,
  locked = false,
  alignContent = true,
}: {
  league: any;
  size?: number;
  pulse?: boolean;
  active?: boolean;
  locked?: boolean;
  alignContent?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse || !CLUB_ENTRY_REPEATING_MOTION_ENABLED) {
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
      return undefined;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 1100, useNativeDriver: CLUB_ANIMATION_USE_NATIVE_DRIVER }),
        Animated.timing(scaleAnim, { toValue: 1.0,  duration: 1100, useNativeDriver: CLUB_ANIMATION_USE_NATIVE_DRIVER }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, scaleAnim]);

  const iconName = (league as any).ionIcon ?? 'trophy';
  const imageUri = (league as any).imageUri;
  const contentOffset = alignContent ? getLeagueIconContentOffset(Number(league?.id), size) : { x: 0, y: 0 };
  const icon = imageUri ? (
    <LeagueIconImageWithFallback
      source={imageUri}
      iconName={iconName}
      color={locked ? '#7A7A7A' : (active ? league.color : '#7F8793')}
      size={size}
      opacity={locked ? 0.55 : (active ? 1 : 0.65)}
      contentOffset={contentOffset}
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

function leagueNameForLang(league: (typeof LEAGUES)[number], lang: Lang): string {
  return triLang(lang, {
    ru: league.nameRU,
    uk: league.nameUK,
    es: league.nameES,
    'pt-BR': clubNamePlanned(league.id, 'pt-BR'),
    vi: clubNamePlanned(league.id, 'vi'),
    id: clubNamePlanned(league.id, 'id'),
    tr: clubNamePlanned(league.id, 'tr'),
    pl: clubNamePlanned(league.id, 'pl'),
  });
}

export default function ClubScreen() {
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const leagueCrownAccent = themeMode === 'gold'
    ? GOLD_RICH.metalGold
      : LEAGUE_CROWN_NICK_COLOR;
  const leagueBonusPalette = getLeagueBonusPalette(t, themeMode);
  const leagueBonusGiftImage = getLeagueBonusGiftImage(themeMode);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const initialLeagueStateRef = useRef<LeagueState | null | undefined>(undefined);
  if (initialLeagueStateRef.current === undefined) {
    initialLeagueStateRef.current = getCachedLeagueStateSync();
  }
  const initialLeagueState = initialLeagueStateRef.current;

  const [myLeagueId, setMyLeagueId]     = useState(initialLeagueState?.leagueId ?? 0);
  const [previewLeagueId, setPreviewLeagueId] = useState(initialLeagueState?.leagueId ?? 0);
  const [group, setGroup]               = useState<GroupMember[]>(() => initialLeagueState?.group ?? []);
  const [profilePlayer, setProfile]     = useState<UnifiedPlayerInfo | null>(null);
  const [myAvatarEmoji, setMyAvatarEmoji] = useState('🐣');
  const [myFrameId, setMyFrameId]         = useState('plain');
  const [myAuraId, setMyAuraId]           = useState('');
  const [userName, setUserName]         = useState('');
  const [playerXP, setPlayerXP]         = useState(0);
  const [localLeagueHydrated, setLocalLeagueHydrated] = useState(initialLeagueState != null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [rankDelta, setRankDelta] = useState<RankDelta | null>(null);
  const [pendingLeagueResult, setPendingLeagueResult] = useState<LeagueResult | null>(null);
  const dismissedLeagueResultThisSessionRef = useRef<boolean>(false);
  const contentScrollRef = useRef<ScrollView | null>(null);
  /** Совпадает с RankChangeTestModal / тестовым превью — не менять без синхронизации. */
  const CLUB_LEADERBOARD_AVATAR_SIZE = 56;
  const ROW_HEIGHT_CLUB = 84;
  const myRowAnim = useRef(new Animated.Value(0)).current;
  const leagueChestRewardCheckKeyRef = useRef<string | null>(null);
  const chatMetaRefreshAtRef = useRef(0);

  /** Подсказка про зону повышения: только первый раз за календарный день при открытии вкладки лиги. */
  const [leaguePromoHintVisible, setLeaguePromoHintVisible] = useState(false);
  const [arenaClubEvent, setArenaClubEvent] = useState<any | null>(null);
  const [arenaClubStableUid, setArenaClubStableUid] = useState('');
  const [leagueGroupMeta, setLeagueGroupMeta] = useState<{ weekId: string; groupId: string; leagueId: number } | null>(null);
  const [leagueChestClaimed, setLeagueChestClaimed] = useState(false);
  const [leagueChestClaiming, setLeagueChestClaiming] = useState(false);
  const [leagueBonusAdminPreview, setLeagueBonusAdminPreview] = useState<LeagueBonusAdminPreview | null>(null);
  const [activeGroupBoost, setActiveGroupBoost] = useState<LeagueGroupBoostState | null>(null);
  const [groupBoostTimeLeft, setGroupBoostTimeLeft] = useState('');
  const [groupBoostConfirmVisible, setGroupBoostConfirmVisible] = useState(false);
  const [groupBoostBuying, setGroupBoostBuying] = useState(false);
  const [groupBoostLikeBusy, setGroupBoostLikeBusy] = useState(false);
  const [groupBoostLikedToday, setGroupBoostLikedToday] = useState(false);
  const [groupBoostLikeTotal, setGroupBoostLikeTotal] = useState(0);
  const activeGroupBoostRef = useRef<LeagueGroupBoostState | null>(null);
  const [leagueCrownsByUid, setLeagueCrownsByUid] = useState<Record<string, LeagueCrown>>({});
  const [leagueChestOpenModal, setLeagueChestOpenModal] = useState<{
    crownName?: string;
    isCrownWinner?: boolean;
    rewards?: LeagueChestRewardDrop[];
  } | null>(null);

  const isMountedRef = useRef(true);
  const leagueChatUnreadCount = useLeagueChatUnread({
    initialRoom: leagueGroupMeta,
    myUid: arenaClubStableUid,
    active: chatModalVisible,
  });

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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const raw = await AsyncStorage.getItem(LEAGUE_BONUS_ADMIN_PREVIEW_KEY).catch(() => null);
        if (cancelled || !isMountedRef.current) return;
        if (!raw) {
          setLeagueBonusAdminPreview(null);
          return;
        }
        try {
          const parsed = JSON.parse(raw) as LeagueBonusAdminPreview;
          if (!parsed?.expiresAt || Date.now() >= parsed.expiresAt) {
            await AsyncStorage.removeItem(LEAGUE_BONUS_ADMIN_PREVIEW_KEY).catch(() => {});
            if (!cancelled && isMountedRef.current) setLeagueBonusAdminPreview(null);
            return;
          }
          setLeagueBonusAdminPreview(parsed);
          setLeagueChestClaimed(false);
        } catch {
          await AsyncStorage.removeItem(LEAGUE_BONUS_ADMIN_PREVIEW_KEY).catch(() => {});
          if (!cancelled && isMountedRef.current) setLeagueBonusAdminPreview(null);
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
      void checkAchievements({
        type: 'league_result',
        myRank: result.myRank,
        totalInGroup: result.totalInGroup,
        promoted: result.promoted,
        newLeagueId: result.newLeagueId,
      });
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
      setLocalLeagueHydrated(true);

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
    activeGroupBoostRef.current = activeGroupBoost;
  }, [activeGroupBoost]);

  useEffect(() => subscribeToActiveLeagueGroupBoost((boost) => {
    if (!isMountedRef.current) return;
    if (!boost && activeGroupBoostRef.current && activeGroupBoostRef.current.expiresAt > Date.now()) return;
    setActiveGroupBoost(boost);
    setGroupBoostLikeTotal(boost?.likeCount ?? 0);
  }), []);

  useEffect(() => {
    let cancelled = false;
    void fetchLeagueGroupBoostLikedToday(activeGroupBoost)
      .then((liked) => {
        if (!cancelled && isMountedRef.current) setGroupBoostLikedToday(liked);
      })
      .catch(() => {
        if (!cancelled && isMountedRef.current) setGroupBoostLikedToday(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeGroupBoost?.buyerUid, activeGroupBoost?.likeEventId]);

  useEffect(() => {
    if (!activeGroupBoost) {
      setGroupBoostTimeLeft('');
      return;
    }
    const update = () => {
      const live = activeGroupBoost.expiresAt > Date.now();
      if (!live) {
        setActiveGroupBoost(null);
        setGroupBoostTimeLeft('');
        return;
      }
      setGroupBoostTimeLeft(formatLeagueGroupBoostTimeLeft(activeGroupBoost.expiresAt));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeGroupBoost?.expiresAt]);

  useEffect(() => {
    if (!chatModalVisible) return;
    const now = Date.now();
    if (now - chatMetaRefreshAtRef.current < 15_000) return;
    chatMetaRefreshAtRef.current = now;
    void resolveMyLeagueGroupMeta()
      .then((meta) => {
        if (isMountedRef.current && meta) {
          setLeagueGroupMeta((cur) => (
            cur && cur.weekId === meta.weekId && cur.groupId === meta.groupId && cur.leagueId === meta.leagueId
              ? cur
              : meta
          ));
          return;
        }
        if (isMountedRef.current) setLeagueGroupMeta(null);
        void loadData({ forceRemote: true });
      })
      .catch(() => {
        void loadData({ forceRemote: true });
      });
  }, [chatModalVisible, leagueGroupMeta, loadData]);

  const myLeague = LEAGUES[myLeagueId] ?? LEAGUES[0];
  const leaguePreviewState = getLeagueSwipePreviewState(myLeagueId, previewLeagueId);
  const previewLeague = LEAGUES[leaguePreviewState.previewLeagueId] ?? myLeague;

  useEffect(() => {
    setPreviewLeagueId(myLeagueId);
  }, [myLeagueId]);

  const animateLeaguePreviewSwipe = useCallback((direction: number) => {
    setPreviewLeagueId((current) => swipeLeaguePreview(current, direction, LEAGUES.length));
    void Haptics.selectionAsync().catch(() => {});
  }, []);

  const leaguePreviewPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => (
      Math.abs(gestureState.dx) > 18 &&
      Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.25
    ),
    onPanResponderGrant: () => {
      tabSwipeLock.blocked = true;
    },
    onPanResponderRelease: (_, gestureState) => {
      tabSwipeLock.blocked = false;
      const shouldSwipe = Math.abs(gestureState.dx) > CLUB_LEAGUE_PREVIEW_SWIPE_THRESHOLD || Math.abs(gestureState.vx) > 0.45;
      if (shouldSwipe) {
        animateLeaguePreviewSwipe(gestureState.dx < 0 ? 1 : -1);
        return;
      }
    },
    onPanResponderTerminate: () => {
      tabSwipeLock.blocked = false;
    },
  }), [animateLeaguePreviewSwipe]);

  const sortedGroup = [...group].sort((a, b) => b.points - a.points);
  const showEmptyParticipants = shouldShowLeagueEmptyParticipants({
    localLeagueHydrated,
    participantCount: sortedGroup.length,
  });
  const zoneSize = getLeagueResultZoneSize(sortedGroup.length);
  const promotionCutoff = sortedGroup.length >= 2 && myLeagueId < LEAGUES.length - 1 ? zoneSize : 0;
  const relegationStartIndex = sortedGroup.length >= 2 ? Math.max(0, sortedGroup.length - zoneSize) : sortedGroup.length;
  const leagueBonusAdminActive = !!leagueBonusAdminPreview && Date.now() < leagueBonusAdminPreview.expiresAt;
  const leagueRaceVisible = localLeagueHydrated && (
    leagueBonusAdminActive || shouldShowLeagueRace(sortedGroup.length, userName)
  );
  const myArenaClubPoints = arenaClubStableUid
    ? Math.max(0, Math.floor(Number((arenaClubEvent?.members ?? {})[arenaClubStableUid]?.points) || 0))
    : 0;
  const leagueRoomXp = sortedGroup.reduce((sum, p) => sum + Math.max(0, Math.floor(Number(p.points) || 0)), 0);
  const arenaChestBonus = Math.max(0, Math.floor(Number(arenaClubEvent?.totalPoints) || 0));
  const leagueChestGoal = getLeagueChestGoal(myLeagueId);
  const leagueChestProgress = leagueRaceVisible ? Math.min(leagueChestGoal, leagueBonusAdminActive ? leagueChestGoal : leagueRoomXp + arenaChestBonus) : 0;
  const leagueChestPct = leagueChestGoal > 0 ? Math.min(100, Math.round((leagueChestProgress / leagueChestGoal) * 100)) : 0;
  const myLeagueRoomXp = Math.max(0, Math.floor(Number(sortedGroup.find((p) => p.isMe)?.points) || 0));
  const myLeagueChestContribution = myLeagueRoomXp + myArenaClubPoints;
  const leagueChestReady = leagueRaceVisible && (leagueBonusAdminActive || leagueChestProgress >= leagueChestGoal);
  const leagueCrownWinnerUid = leagueRaceVisible && leagueChestReady
    ? leagueBonusAdminActive && leagueBonusAdminPreview?.crownWinner
      ? arenaClubStableUid || sortedGroup.find((p) => p.isMe)?.uid
      : sortedGroup[0]?.uid
    : undefined;
  const leagueCrownWinnerName = leagueRaceVisible && leagueChestReady
    ? leagueBonusAdminActive && leagueBonusAdminPreview?.crownWinner
      ? userName || sortedGroup.find((p) => p.isMe)?.name
      : sortedGroup[0]?.name
    : undefined;
  const crownRaceTop = leagueRaceVisible ? sortedGroup.slice(0, 3) : [];
  const leagueChestVisualAccent = leagueChestReady ? leagueBonusPalette.readyAccent : leagueBonusPalette.accent;
  const leagueChestVisualFill = leagueChestReady ? leagueBonusPalette.readyFill : leagueBonusPalette.fill;

  const claimLeagueChestReward = useCallback(async () => {
    if (!leagueRaceVisible || !leagueChestReady || leagueChestClaimed || leagueChestClaiming) return;
    if (leagueBonusAdminActive) {
      setLeagueChestClaiming(true);
      try {
        const previewRewards = buildLeagueChestPreviewRewards(!!leagueBonusAdminPreview?.crownWinner);
        await unlockLeagueGoldThemeReward('admin_league_bonus_preview');
        if (!isMountedRef.current) return;
        setLeagueChestClaimed(true);
        setLeagueChestOpenModal({
          crownName: leagueCrownWinnerName || userName || 'Fable9521',
          isCrownWinner: !!leagueBonusAdminPreview?.crownWinner,
          rewards: previewRewards,
        });
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: `Превью: выпало ${previewRewards.length} подарков, Gold разблокирован локально`,
          uk: `Превʼю: випало ${previewRewards.length} подарунків, Gold розблоковано локально`,
          es: `Vista previa: ${previewRewards.length} regalos, Gold desbloqueado localmente`,
          'pt-BR': `Prévia: ${previewRewards.length} presentes, Gold desbloqueado localmente`,
          vi: `Xem trước: nhận ${previewRewards.length} quà, Gold đã mở khóa cục bộ`,
          id: `Pratinjau: mendapat ${previewRewards.length} hadiah, Gold dibuka secara lokal`,
          tr: `Önizleme: ${previewRewards.length} hediye düştü, Gold yerel olarak açıldı`,
          pl: `Podgląd: wypadło ${previewRewards.length} prezentów, Gold odblokowany lokalnie`,
        }));
      } finally {
        if (isMountedRef.current) setLeagueChestClaiming(false);
      }
      return;
    }
    if (!leagueGroupMeta || sortedGroup.length === 0) return;
    const checkKey = `${leagueGroupMeta.weekId}:${leagueGroupMeta.groupId}:${Math.floor(myLeagueChestContribution)}`;
    leagueChestRewardCheckKeyRef.current = checkKey;
    setLeagueChestClaiming(true);
    try {
      const res = await ensureLeagueChestRewards({
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
        studyTarget,
      });
      if (!isMountedRef.current) return;
      if (res.claimed) setLeagueChestClaimed(true);
      if (res.rewards) {
        const drops = res.rewards.drops ?? [];
        const rewardCount = drops.length || 1;
        const hasGold = drops.some((drop) => drop.kind === 'gold_theme');
        const hasGoldDuplicate = drops.some((drop) => drop.kind === 'gold_theme_duplicate');
        setLeagueChestOpenModal({
          crownName: res.crown?.name,
          isCrownWinner: !!res.crown?.uid && res.crown.uid === arenaClubStableUid,
          rewards: drops,
        });
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: hasGold
            ? `Бонус лиги открыт: ${rewardCount} подарков, среди них Gold`
            : hasGoldDuplicate
              ? `Бонус лиги открыт: ${rewardCount} подарков, дубль Gold стал осколками`
              : `Бонус лиги открыт: выпало ${rewardCount} подарков`,
          uk: hasGold
            ? `Бонус ліги відкрито: ${rewardCount} подарунків, серед них Gold`
            : hasGoldDuplicate
              ? `Бонус ліги відкрито: ${rewardCount} подарунків, дубль Gold став уламками`
              : `Бонус ліги відкрито: випало ${rewardCount} подарунків`,
          es: hasGold
            ? `Bono de liga abierto: ${rewardCount} regalos, incluido Gold`
            : hasGoldDuplicate
              ? `Bono de liga abierto: ${rewardCount} regalos, Gold doble convertido en fragmentos`
              : `Bono de liga abierto: cayeron ${rewardCount} regalos`,
          'pt-BR': hasGold
            ? `Bônus da liga aberto: ${rewardCount} presentes, incluindo Gold`
            : hasGoldDuplicate
              ? `Bônus da liga aberto: ${rewardCount} presentes, Gold duplicado virou fragmentos`
              : `Bônus da liga aberto: caíram ${rewardCount} presentes`,
          vi: hasGold
            ? `Đã mở thưởng giải đấu: ${rewardCount} quà, có Gold`
            : hasGoldDuplicate
              ? `Đã mở thưởng giải đấu: ${rewardCount} quà, Gold trùng đã đổi thành mảnh`
              : `Đã mở thưởng giải đấu: nhận ${rewardCount} quà`,
          id: hasGold
            ? `Bonus liga dibuka: ${rewardCount} hadiah, termasuk Gold`
            : hasGoldDuplicate
              ? `Bonus liga dibuka: ${rewardCount} hadiah, duplikat Gold menjadi pecahan`
              : `Bonus liga dibuka: mendapat ${rewardCount} hadiah`,
          tr: hasGold
            ? `Lig bonusu açıldı: ${rewardCount} hediye, içinde Gold var`
            : hasGoldDuplicate
              ? `Lig bonusu açıldı: ${rewardCount} hediye, çift Gold parçalara dönüştü`
              : `Lig bonusu açıldı: ${rewardCount} hediye düştü`,
          pl: hasGold
            ? `Bonus ligi otwarty: ${rewardCount} prezentów, w tym Gold`
            : hasGoldDuplicate
              ? `Bonus ligi otwarty: ${rewardCount} prezentów, duplikat Gold zmienił się we fragmenty`
              : `Bonus ligi otwarty: wypadło ${rewardCount} prezentów`,
        }));
      } else if (res.claimed) {
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'Бонус лиги уже забран',
          uk: 'Бонус ліги вже забрано',
          es: 'El bono de liga ya fue recogido',
          'pt-BR': 'O bônus da liga já foi resgatado',
          vi: 'Thưởng giải đấu đã được nhận rồi',
          id: 'Bonus liga sudah diambil',
          tr: 'Lig bonusu zaten alındı',
          pl: 'Bonus ligi został już odebrany',
        }));
      } else {
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'Бонус пока не готов или не хватает личного вклада',
          uk: 'Бонус ще не готовий або бракує особистого внеску',
          es: 'El bono aún no está listo o falta contribución personal',
          'pt-BR': 'O bônus ainda não está pronto ou falta contribuição pessoal',
          vi: 'Thưởng chưa sẵn sàng hoặc bạn chưa đóng góp đủ',
          id: 'Bonus belum siap atau kontribusi pribadi belum cukup',
          tr: 'Bonus henüz hazır değil veya kişisel katkı eksik',
          pl: 'Bonus nie jest jeszcze gotowy albo brakuje osobistego wkładu',
        }));
      }
    } finally {
      if (isMountedRef.current) setLeagueChestClaiming(false);
    }
  }, [leagueRaceVisible, leagueChestReady, leagueGroupMeta, leagueChestClaimed, leagueChestClaiming, leagueBonusAdminActive, leagueBonusAdminPreview?.crownWinner, leagueCrownWinnerName, userName, myLeagueChestContribution, sortedGroup, arenaClubStableUid, studyTarget]);

  const showLeagueToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    emitAppEvent('action_toast', {
      type,
      messageRu: message,
      messageUk: message,
      messageEs: message,
    });
  }, []);

  const handleBuyGroupBoost = useCallback(() => {
    if (activeGroupBoost || groupBoostBuying) return;
    setGroupBoostConfirmVisible(true);
  }, [activeGroupBoost, groupBoostBuying]);

  const makeOptimisticGroupBoost = useCallback((): LeagueGroupBoostState => {
    const now = Date.now();
    const me = sortedGroup.find((p) => p.isMe);
    const buyerUid = arenaClubStableUid || me?.uid || `local_${now}`;
    const groupId = leagueGroupMeta?.groupId || '';
    const weekId = leagueGroupMeta?.weekId || getWeekId();
    return {
      groupId,
      weekId,
      leagueId: leagueGroupMeta?.leagueId ?? myLeagueId,
      multiplier: LEAGUE_GROUP_BOOST_MULTIPLIER,
      startedAt: now,
      expiresAt: now + LEAGUE_GROUP_BOOST_DURATION_MS,
      buyerUid,
      buyerName: (userName || me?.name || 'Player').trim() || 'Player',
      buyerAvatar: myAvatarEmoji || me?.avatar || null,
      buyerFrame: myFrameId || me?.frame || null,
      buyerAura: myAuraId || me?.aura || null,
      buyerTotalXp: Math.max(0, Math.floor(Number(playerXP || me?.totalXp || me?.points || 0))),
      buyerProfileCardLevel: Math.max(0, Math.floor(Number(me?.profileCardLevel || 0))),
      buyerProfileCardTheme: me?.profileCardTheme,
      buyerProfileCardMotion: me?.profileCardMotion,
      buyerProfileCardPublicFocus: me?.profileCardPublicFocus,
      likeEventId: `league_group_boost_${weekId}_${groupId || buyerUid}_${now}`,
      likeCount: 0,
    };
  }, [arenaClubStableUid, leagueGroupMeta?.groupId, leagueGroupMeta?.leagueId, leagueGroupMeta?.weekId, myAuraId, myAvatarEmoji, myFrameId, myLeagueId, playerXP, sortedGroup, userName]);

  const performBuyGroupBoost = useCallback(async () => {
    if (activeGroupBoost || groupBoostBuying) return;
    const previousBoost: LeagueGroupBoostState | null = null;
    const previousBalance = await getShardsBalance().catch(() => null);
    if (previousBalance !== null && previousBalance < LEAGUE_GROUP_BOOST_COST_SHARDS) {
      showLeagueToast(`Нужно ${LEAGUE_GROUP_BOOST_COST_SHARDS} осколков`, 'error');
      return;
    }
    const optimisticBoost = makeOptimisticGroupBoost();
    setActiveGroupBoost(optimisticBoost);
    setGroupBoostLikeTotal(0);
    setGroupBoostLikedToday(false);
    setGroupBoostConfirmVisible(false);
    void cacheLeagueGroupBoost(optimisticBoost);
    if (previousBalance !== null) {
      void replaceShardsBalanceLocal(Math.max(0, previousBalance - LEAGUE_GROUP_BOOST_COST_SHARDS));
    }
    setGroupBoostBuying(true);
    try {
      const res = await buyLeagueGroupBoost();
      if (res.ok) {
        setActiveGroupBoost(res.boost);
        setGroupBoostLikeTotal(res.boost.likeCount);
        showLeagueToast(`Буст ×${LEAGUE_GROUP_BOOST_MULTIPLIER} включен для всей лиги на 3 часа`, 'success');
        return;
      }
      const shouldRollback = res.reason === 'active' || res.reason === 'not_enough_shards' || res.reason === 'no_current_group';
      if (shouldRollback) {
        setActiveGroupBoost(previousBoost);
        setGroupBoostLikeTotal(0);
        void cacheLeagueGroupBoost(previousBoost);
        if (previousBalance !== null) void replaceShardsBalanceLocal(previousBalance);
      }
      if (res.reason === 'active') {
        showLeagueToast('Буст уже активен. Новый можно купить после таймера.', 'info');
      } else if (res.reason === 'not_enough_shards') {
        showLeagueToast(`Нужно ${LEAGUE_GROUP_BOOST_COST_SHARDS} осколков`, 'error');
      } else if (res.reason === 'no_current_group') {
        showLeagueToast('Сначала обнови лигу недели и попробуй снова.', 'info');
      } else {
        showLeagueToast('Буст включен. Сервер обновит лигу в фоне.', 'info');
      }
    } finally {
      if (isMountedRef.current) setGroupBoostBuying(false);
    }
  }, [activeGroupBoost, groupBoostBuying, makeOptimisticGroupBoost, showLeagueToast]);

  const handleLikeGroupBoostBuyer = useCallback(async () => {
    if (!activeGroupBoost || groupBoostLikedToday || groupBoostLikeBusy) return;
    if (activeGroupBoost.buyerUid === arenaClubStableUid) {
      showLeagueToast('Это твой буст. Лайки оставим другим игрокам.', 'info');
      return;
    }
    const previousBoost = activeGroupBoost;
    const previousTotal = groupBoostLikeTotal;
    const optimisticTotal = Math.max(groupBoostLikeTotal, activeGroupBoost.likeCount) + 1;
    const optimisticBoost = { ...activeGroupBoost, likeCount: optimisticTotal };
    setGroupBoostLikedToday(true);
    setGroupBoostLikeTotal(optimisticTotal);
    setActiveGroupBoost(optimisticBoost);
    void cacheLeagueGroupBoost(optimisticBoost);
    setGroupBoostLikeBusy(true);
    try {
      const total = await likeLeagueGroupBoostBuyer(activeGroupBoost, userName);
      setGroupBoostLikeTotal(total);
      const confirmedBoost = { ...activeGroupBoost, likeCount: total };
      setActiveGroupBoost(confirmedBoost);
      void cacheLeagueGroupBoost(confirmedBoost);
    } catch {
      setGroupBoostLikedToday(false);
      setGroupBoostLikeTotal(previousTotal);
      setActiveGroupBoost(previousBoost);
      void cacheLeagueGroupBoost(previousBoost);
      showLeagueToast('Сегодня лайк уже использован или связь недоступна', 'info');
    } finally {
      if (isMountedRef.current) setGroupBoostLikeBusy(false);
    }
  }, [activeGroupBoost, arenaClubStableUid, groupBoostLikeBusy, groupBoostLikeTotal, groupBoostLikedToday, showLeagueToast, userName]);

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      {/* Хедер */}
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TapScale
          testID="league-screen-back"
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Назад',
            uk: 'Назад',
            es: 'Volver',
            'pt-BR': "Voltar",
            vi: "Quay lại",
            id: "Kembali",
            tr: "Geri",
            pl: "Wstecz",
          })}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            safeRouterBack(router, '/(tabs)/home' as any);
          }}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={28} color={sx.primary} />
        </TapScale>
        <Text style={{ color:sx.primary, fontSize: f.h2, fontWeight:'700', marginLeft:8, flex:1 }}>
          {triLang(lang, {
            ru: 'Лига недели',
            uk: 'Ліга тижня',
            es: 'Liga de la semana',
            'pt-BR': "Liga da semana",
            vi: "Giải đấu tuần này",
            id: "Liga minggu ini",
            tr: "Haftanın ligi",
            pl: "Liga tygodnia",
          })}
        </Text>
      </View>

      <BouncyWrap style={bouncyStyle}>
      <ScrollView
        ref={contentScrollRef}
        scrollEnabled
        decelerationRate="normal"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 16,
          gap: 12,
        }}
        onScroll={onBouncyScroll}
        scrollEventThrottle={16}
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

        <View
          {...leaguePreviewPanResponder.panHandlers}
        >
        <LinearGradient
          colors={[leagueBonusPalette.modal.card[0], leagueBonusPalette.modal.card[1], leagueBonusPalette.modal.card[2]]}
          locations={leagueBonusPalette.modal.cardLocations}
          start={{ x:0, y:0 }}
          end={{ x:1, y:1 }}
          style={{ borderRadius:20, borderWidth:0.5, borderColor:leagueBonusPalette.border, paddingHorizontal:16, paddingTop:18, paddingBottom:18, overflow:'hidden', minHeight:204 }}
        >
          <View style={{ position:'absolute', right:-42, top:-48, width:170, height:170, borderRadius:85, borderWidth:1, borderColor:leagueBonusPalette.modal.rail, opacity:0.35 }} />
          <View style={{ position:'absolute', left:-32, bottom:-52, width:150, height:150, borderRadius:75, backgroundColor:leagueBonusPalette.modal.ribbon, opacity:0.9 }} />
          <View
            testID="league-current-icon"
            accessibilityLabel={leagueNameForLang(previewLeague, lang)}
            style={{ width:'100%', alignItems:'center', justifyContent:'center', gap:11, paddingHorizontal:0, paddingTop:2 }}
          >
            <View style={{ width:CLUB_LEAGUE_PREVIEW_ICON_SLOT_SIZE, height:CLUB_LEAGUE_PREVIEW_ICON_SLOT_SIZE, alignItems:'center', justifyContent:'center' }}>
              <LeagueIcon league={previewLeague} size={CLUB_LEAGUE_PREVIEW_ICON_SIZE} active alignContent={false} />
            </View>
            <Text style={{ color:t.textPrimary, fontSize:f.h2, fontWeight:'900', textAlign:'center', width:'100%', paddingHorizontal:56 }} numberOfLines={2}>
              {leagueNameForLang(previewLeague, lang)}
            </Text>
            {!!leagueTag(lang, previewLeague.tagRU, previewLeague.tagUK) && (
              <View style={{ paddingHorizontal:10, paddingVertical:5, borderRadius:999, backgroundColor:leagueBonusPalette.modal.metaBg, borderWidth:0.5, borderColor:leagueBonusPalette.modal.metaBorder }}>
                <Text style={{ color:leagueBonusPalette.modal.eyebrow, fontSize:f.caption, fontWeight:'900' }} numberOfLines={1}>
                  {leagueTag(lang, previewLeague.tagRU, previewLeague.tagUK)}
                </Text>
              </View>
            )}
          </View>
          {leaguePreviewState.isPreviewingMyLeague && (
          <TouchableOpacity
            testID="league-chat-icon"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Чат лиги',
              uk: 'Чат ліги',
              es: 'Chat de liga',
              'pt-BR': 'Chat da liga',
              vi: 'Chat liga',
              id: 'Chat liga',
              tr: 'Lig sohbeti',
              pl: 'Czat ligi',
            })}
            activeOpacity={0.86}
            onPress={() => {
              setChatModalVisible(true);
              void Haptics.selectionAsync().catch(() => {});
            }}
            style={{ position:'absolute', top:14, right:14, width:46, height:46, borderRadius:23, alignItems:'center', justifyContent:'center', backgroundColor:leagueBonusPalette.modal.metaBg, borderWidth:1, borderColor:leagueBonusPalette.modal.metaBorder }}
          >
            <Ionicons name="chatbubbles-outline" size={22} color={leagueBonusPalette.accent} />
            {leagueChatUnreadCount > 0 && (
              <View testID="club-chat-unread-badge" style={{ position:'absolute', top:-4, right:-4, minWidth:20, height:20, paddingHorizontal:5, borderRadius:10, alignItems:'center', justifyContent:'center', backgroundColor:'#E9505F', borderWidth:1.5, borderColor:t.bgCard }}>
                <Text style={{ color:'#FFFFFF', fontSize:10, fontWeight:'900' }}>
                  {formatLeagueChatUnreadBadge(leagueChatUnreadCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          )}
        </LinearGradient>
        <View style={{ flexDirection:'row', justifyContent:'center', alignItems:'center', gap:5, marginTop:8, minHeight:10 }}>
          {LEAGUES.map((league) => (
            <View
              key={league.id}
              style={{
                width: league.id === previewLeague.id ? 18 : 5,
                height: 5,
                borderRadius: 999,
                backgroundColor: league.id === previewLeague.id ? leagueBonusPalette.accent : 'rgba(255,255,255,0.22)',
                opacity: league.id === myLeague.id ? 1 : 0.72,
              }}
            />
          ))}
        </View>
        </View>

        {leaguePreviewState.shouldShowLiveContent && (
        <View>
        {leagueRaceVisible && (
        <LinearGradient colors={leagueBonusPalette.card} locations={leagueBonusPalette.cardLocations} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={{ borderRadius:18, borderWidth:0.5, borderColor:leagueBonusPalette.border, padding:14, gap:12, overflow:'hidden', shadowColor:leagueChestVisualAccent, shadowOpacity:0.12, shadowRadius:18, shadowOffset:{ width:0, height:8 }, elevation:4 }}>
          <LeagueBonusGiftImageWithFallback
            source={leagueBonusGiftImage}
            color={leagueChestVisualAccent}
            size={136}
            opacity={leagueChestReady ? 0.20 : 0.12}
            style={{ position:'absolute', right:-24, top:-22, transform:[{ rotate:'-8deg' }] }}
          />
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:12, minHeight:58 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
              <View style={{ width:58, height:58, borderRadius:29, backgroundColor:leagueBonusPalette.iconBg, borderWidth:0.5, borderColor:leagueBonusPalette.iconBorder, alignItems:'center', justifyContent:'center', shadowColor:leagueChestVisualAccent, shadowOpacity:leagueChestReady ? 0.42 : 0.24, shadowRadius:14, shadowOffset:{ width:0, height:6 }, elevation:7 }}>
                <LeagueBonusGiftImageWithFallback source={leagueBonusGiftImage} color={leagueChestVisualAccent} size={68} opacity={leagueChestReady ? 1 : 0.94} />
              </View>
              <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'900', flex:1 }} numberOfLines={1}>
                {triLang(lang, {
                  ru: 'Бонус лиги',
                  uk: 'Бонус ліги',
                  es: 'Bono de liga',
                  'pt-BR': "Bônus da liga",
                  vi: "Thưởng giải đấu",
                  id: "Bonus liga",
                  tr: "Lig bonusu",
                  pl: "Bonus ligi",
                })}
              </Text>
            </View>
            <View style={{ minWidth:44, minHeight:32, borderRadius:999, paddingHorizontal:10, alignItems:'center', justifyContent:'center', backgroundColor:leagueBonusPalette.modal.metaBg, borderWidth:0.5, borderColor:leagueBonusPalette.modal.metaBorder }}>
            <Text style={{ color: leagueChestVisualAccent, fontSize:f.body, fontWeight:'900' }}>
              {leagueChestPct}%
            </Text>
            </View>
          </View>
          <View style={{ height:12, borderRadius:7, overflow:'hidden', backgroundColor:leagueBonusPalette.track, borderWidth:0.5, borderColor:leagueBonusPalette.trackBorder }}>
            <LinearGradient colors={leagueChestVisualFill} start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={{ height:'100%', width:`${leagueChestPct}%` as any, borderRadius:7 }} />
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <Text style={{ color:leagueBonusPalette.textMuted, fontSize:f.caption, fontWeight:'900', flex:1 }} numberOfLines={1}>
              {leagueChestProgress.toLocaleString()} / {leagueChestGoal.toLocaleString()} XP
            </Text>
          </View>
          <LinearGradient
            testID="league-group-boost-card"
            colors={activeGroupBoost ? ['rgba(255,91,108,0.24)', 'rgba(255,212,59,0.12)'] : ['rgba(255,255,255,0.055)', 'rgba(255,255,255,0.025)']}
            start={{ x:0, y:0 }}
            end={{ x:1, y:1 }}
            style={{ borderRadius:14, borderWidth:0.5, borderColor:activeGroupBoost ? 'rgba(255,212,59,0.34)' : leagueBonusPalette.innerBorder, padding:10, gap:10 }}
          >
            <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
              <View style={{ width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,91,108,0.18)', borderWidth:0.5, borderColor:'rgba(255,91,108,0.34)', alignItems:'center', justifyContent:'center' }}>
                <Ionicons name={activeGroupBoost ? 'flash' : 'flash-outline'} size={19} color={activeGroupBoost ? '#FFD43B' : leagueBonusPalette.accent} />
              </View>
              <View style={{ flex:1, minWidth:0 }}>
                <Text style={{ color:t.textPrimary, fontSize:f.caption, lineHeight:Math.max(15, f.caption + 3), fontWeight:'900' }} numberOfLines={2}>
                  {activeGroupBoost ? 'Общий буст лиги ×2' : '×2 XP для всей лиги'}
                </Text>
                <Text style={{ color:t.textMuted, fontSize:Math.max(10, f.caption - 1), lineHeight:Math.max(13, f.caption + 1), fontWeight:'700', marginTop:2 }} numberOfLines={2}>
                  {activeGroupBoost ? `Осталось ${groupBoostTimeLeft || '...'}` : '3 часа для всех участников'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              testID="league-group-boost-buy"
              activeOpacity={activeGroupBoost ? 1 : 0.86}
              disabled={!!activeGroupBoost || groupBoostBuying}
              onPress={() => { handleBuyGroupBoost(); }}
              style={{
                minHeight: 46,
                width: '100%',
                borderRadius: 13,
                paddingHorizontal: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 7,
                backgroundColor: activeGroupBoost ? 'rgba(255,255,255,0.08)' : t.accent,
                borderWidth: 0.5,
                borderColor: activeGroupBoost ? 'rgba(255,255,255,0.16)' : t.accent,
                opacity: groupBoostBuying ? 0.7 : 1,
              }}
            >
              <Text adjustsFontSizeToFit numberOfLines={1} style={{ color:activeGroupBoost ? t.textMuted : t.correctText, fontSize:f.caption, fontWeight:'900' }}>
                {activeGroupBoost ? 'Активен' : (groupBoostBuying ? 'Включаем...' : 'Купить')}
              </Text>
              {!activeGroupBoost && (
                <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                  <Text style={{ color:t.correctText, fontSize:f.caption, fontWeight:'900' }}>
                    {LEAGUE_GROUP_BOOST_COST_SHARDS}
                  </Text>
                  <Image
                    source={oskolokImageForPackShards(LEAGUE_GROUP_BOOST_COST_SHARDS, themeMode)}
                    style={{ width:16, height:16 }}
                    contentFit="contain"
                  />
                </View>
              )}
            </TouchableOpacity>
            {!!activeGroupBoost && (
              <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                <TouchableOpacity
                  testID="league-group-boost-buyer"
                  activeOpacity={0.76}
                  onPress={() => setProfile({
                    name: activeGroupBoost.buyerName,
                    points: activeGroupBoost.buyerTotalXp ?? 0,
                    totalXp: activeGroupBoost.buyerTotalXp ?? undefined,
                    isMe: activeGroupBoost.buyerUid === arenaClubStableUid,
                    leagueId: activeGroupBoost.leagueId || myLeague.id,
                    uid: activeGroupBoost.buyerUid,
                    avatar: activeGroupBoost.buyerAvatar ?? undefined,
                    frame: activeGroupBoost.buyerFrame ?? undefined,
                    aura: activeGroupBoost.buyerAura ?? undefined,
                    profileCardLevel: activeGroupBoost.buyerProfileCardLevel,
                    profileCardTheme: activeGroupBoost.buyerProfileCardTheme,
                    profileCardMotion: activeGroupBoost.buyerProfileCardMotion,
                    profileCardPublicFocus: activeGroupBoost.buyerProfileCardPublicFocus,
                  })}
                  style={{ flexDirection:'row', alignItems:'center', gap:8, flex:1, minWidth:0 }}
                >
                  <AvatarView
                    avatar={activeGroupBoost.buyerAvatar || String(getBestAvatarForLevel(getLevelFromXP(activeGroupBoost.buyerTotalXp ?? 0)))}
                    totalXP={activeGroupBoost.buyerTotalXp ?? 0}
                    size={34}
                    auraId={activeGroupBoost.buyerAura ?? undefined}
                  />
                  <View style={{ flex:1, minWidth:0 }}>
                    <Text style={{ color:t.textPrimary, fontSize:f.caption, fontWeight:'900' }} numberOfLines={1}>
                      {activeGroupBoost.buyerName}
                    </Text>
                    <Text style={{ color:t.textMuted, fontSize:Math.max(10, f.caption - 1), fontWeight:'700' }} numberOfLines={1}>
                      Купил буст для лиги
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="league-group-boost-like"
                  activeOpacity={0.82}
                  disabled={groupBoostLikeBusy || groupBoostLikedToday || activeGroupBoost.buyerUid === arenaClubStableUid}
                  onPress={() => { void handleLikeGroupBoostBuyer(); }}
                  style={{
                    minHeight: 40,
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    flexDirection:'row',
                    alignItems:'center',
                    gap:6,
                    backgroundColor: groupBoostLikedToday ? 'rgba(255,45,85,0.11)' : 'rgba(255,45,85,0.18)',
                    borderWidth: 0.5,
                    borderColor: groupBoostLikedToday ? 'rgba(255,45,85,0.20)' : 'rgba(255,45,85,0.38)',
                    opacity: activeGroupBoost.buyerUid === arenaClubStableUid ? 0.55 : 1,
                  }}
                >
                  <Ionicons name={groupBoostLikedToday ? 'heart' : 'heart-outline'} size={17} color="#FF5B7C" />
                  <Text style={{ color:'#FF8FA3', fontSize:f.caption, fontWeight:'900' }}>
                    {Math.max(groupBoostLikeTotal, activeGroupBoost.likeCount)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
          {!!leagueCrownWinnerName && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:6, paddingTop:2 }}>
              <Ionicons name="trophy-outline" size={15} color={leagueCrownAccent} />
              <Text style={{ color:t.textSecond, fontSize:Math.max(10, f.caption - 1), fontWeight:'800', flex:1 }} numberOfLines={1}>
                {triLang(lang, {
                  ru: `Корона: ${leagueCrownWinnerName}`,
                  uk: `Корона: ${leagueCrownWinnerName}`,
                  es: `Corona: ${leagueCrownWinnerName}`,
                  'pt-BR': `Coroa: ${leagueCrownWinnerName}`,
                  vi: `Vương miện: ${leagueCrownWinnerName}`,
                  id: `Mahkota: ${leagueCrownWinnerName}`,
                  tr: `Taç: ${leagueCrownWinnerName}`,
                  pl: `Korona: ${leagueCrownWinnerName}`,
                })}
              </Text>
            </View>
          )}
          {!leagueChestReady && crownRaceTop.length > 0 && (
            <View style={{ backgroundColor:leagueBonusPalette.innerBg, borderRadius:12, borderWidth:0.5, borderColor:leagueBonusPalette.innerBorder, padding:10, gap:8 }}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6, flex:1, minWidth:0 }}>
                  <Ionicons name="trophy-outline" size={16} color={leagueCrownAccent} />
                  <Text style={{ color:t.textPrimary, fontSize:f.caption, fontWeight:'900', flex:1 }} numberOfLines={1}>
                    {triLang(lang, {
                      ru: 'Гонка за корону',
                      uk: 'Гонка за корону',
                      es: 'Carrera por la corona',
                      'pt-BR': "Corrida pela coroa",
                      vi: "Cuộc đua giành vương miện",
                      id: "Perebutan mahkota",
                      tr: "Taç yarışı",
                      pl: "Wyścig po koronę",
                    })}
                  </Text>
                </View>
              </View>
              <View style={{ gap:6 }}>
                {crownRaceTop.map((p, idx) => {
                  const points = Math.max(0, Math.floor(Number(p.points) || 0));
                  return (
                    <View key={p.uid || `${p.name}-${idx}`} style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <Text style={{ width:18, color:idx === 0 ? leagueCrownAccent : t.textMuted, fontSize:f.caption, fontWeight:'900' }}>
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
          {leagueChestReady && (
            <TouchableOpacity
              activeOpacity={leagueChestClaimed ? 1 : 0.86}
              disabled={leagueChestClaimed || leagueChestClaiming}
              onPress={() => { void claimLeagueChestReward(); }}
              style={{
                borderRadius: 13,
                minHeight: 48,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: leagueChestClaimed ? t.bgSurface : t.accent,
                borderWidth: 0.5,
                borderColor: leagueChestClaimed ? t.border : t.accent,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: leagueChestClaiming ? 0.72 : 1,
              }}
            >
              <Ionicons
                name={leagueChestClaimed ? 'checkmark-circle' : (leagueCrownWinnerUid === arenaClubStableUid ? 'trophy' : 'gift')}
                size={19}
                color={leagueChestClaimed ? t.textMuted : t.correctText}
              />
              <Text style={{ color: leagueChestClaimed ? t.textMuted : t.correctText, fontSize: f.body, fontWeight: '900' }}>
                {leagueChestClaimed
                  ? triLang(lang, {
                    ru: 'Бонус получен',
                    uk: 'Бонус отримано',
                    es: 'Bono recibido',
                    'pt-BR': "Bônus recebido",
                    vi: "Đã nhận thưởng",
                    id: "Bonus diterima",
                    tr: "Bonus alındı",
                    pl: "Bonus odebrany",
                  })
                  : leagueChestClaiming
                    ? triLang(lang, {
                      ru: 'Открываем...',
                      uk: 'Відкриваємо...',
                      es: 'Abriendo...',
                      'pt-BR': "Abrindo...",
                      vi: "Đang mở...",
                      id: "Membuka...",
                      tr: "Açılıyor...",
                      pl: "Otwieranie...",
                    })
                    : leagueCrownWinnerUid === arenaClubStableUid
                      ? triLang(lang, {
                        ru: 'Забрать корону',
                        uk: 'Забрати корону',
                        es: 'Recoger la corona',
                        'pt-BR': "Pegar coroa",
                        vi: "Nhận vương miện",
                        id: "Ambil mahkota",
                        tr: "Tacı al",
                        pl: "Odbierz koron?",
                      })
                      : triLang(lang, {
                        ru: 'Забрать бонус лиги',
                        uk: 'Забрати бонус ліги',
                        es: 'Recoger bono de liga',
                        'pt-BR': "Pegar bônus da liga",
                        vi: "Nhận thưởng giải đấu",
                        id: "Ambil bonus liga",
                        tr: "Lig bonusunu al",
                        pl: "Odbierz bonus ligi",
                      })}
              </Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
        )}

        <View style={{ backgroundColor:t.bgCard, borderRadius:16, borderWidth:0.5, borderColor:t.border, overflow:'hidden', marginTop:8 }}>
          {showEmptyParticipants ? (
            <Text style={{ color:t.textGhost, fontSize: f.sub, padding:16, textAlign:'center' }}>
              {triLang(lang, {
                uk: 'Ще немає учасників',
                ru: 'Пока нет участников',
                es: 'Aún no hay participantes',
                'pt-BR': "Ainda não há participantes",
                vi: "Chưa có người tham gia",
                id: "Belum ada peserta",
                tr: "Henüz katılımcı yok",
                pl: "Nie ma jeszcze uczestników",
              })}
            </Text>
          ) : sortedGroup.length > 0 ? (
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
              const rowEffectiveAura = getEffectiveAvatarAuraId(p.isMe ? myAuraId : p.aura, p.isPremium, p.isVip);
              const rowUsesPremiumAura = rowEffectiveAura === PREMIUM_AVATAR_AURA_ID;
              const leagueCrownCount = Math.max(0, Math.floor(Number(leagueCrownsByUid[p.uid ?? '']?.crownCount) || 0));
              const hasLeagueCrown = !!p.uid && (
                p.uid === leagueCrownWinnerUid ||
                leagueCrownCount > 0 ||
                Number(leagueCrownsByUid[p.uid]?.expiresAt) > Date.now()
              );
              const displayLeagueCrownCount = hasLeagueCrown ? Math.max(1, leagueCrownCount) : 0;
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
                  isVip: p.isVip ?? false,
                  avatar: p.avatar,
                  frame: p.frame,
                  aura: p.isMe ? myAuraId : p.aura,
                  streak: p.streak ?? null,
                  weekXp: p.points,
                  leagueCrownExpiresAt: hasLeagueCrown
                    ? Math.max(Date.now() + 1, Number(leagueCrownsByUid[p.uid ?? '']?.expiresAt) || 0)
                    : undefined,
                  leagueCrownCount: displayLeagueCrownCount || undefined,
                  profileCardLevel: p.profileCardLevel,
                  profileCardTheme: p.profileCardTheme,
                  profileCardMotion: p.profileCardMotion,
                  profileCardPublicFocus: p.profileCardPublicFocus,
                })}
                style={{
                  flexDirection:'row', alignItems:'center',
                  paddingHorizontal:16, paddingVertical:11,
                  minHeight: ROW_HEIGHT_CLUB,
                  borderBottomWidth: i < sortedGroup.length - 1 ? 0.5 : 0,
                  borderBottomColor: t.border,
                  backgroundColor: rowFinalBg,
                }}
              >
                <Text style={{ width:24, fontSize: 14, color: isMyRow ? t.accent : t.textPrimary, fontWeight: isMyRow ? '900' : '400' }}>{i + 1}</Text>
                <View style={{
                  marginLeft: 2,
                  marginRight: 10,
                  borderRadius: 999,
                  padding: hasLeagueCrown ? 2 : 0,
                  borderWidth: hasLeagueCrown ? 1.5 : 0,
                  borderColor: hasLeagueCrown ? leagueCrownAccent : 'transparent',
                  shadowColor: hasLeagueCrown ? leagueCrownAccent : 'transparent',
                  shadowOpacity: hasLeagueCrown ? 0.35 : 0,
                  shadowRadius: hasLeagueCrown ? 8 : 0,
                  shadowOffset: { width: 0, height: 0 },
                }}>
                  <View
                    style={{
                      width: CLUB_LEADERBOARD_AVATAR_SIZE,
                      height: CLUB_LEADERBOARD_AVATAR_SIZE,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PremiumAvatarHalo
                      enabled={rowUsesPremiumAura}
                      avatarSize={CLUB_LEADERBOARD_AVATAR_SIZE}
                      maskColor={rowMask}
                    >
                      <AvatarView
                        avatar={rowAvatar}
                        totalXP={rowXp}
                        size={CLUB_LEADERBOARD_AVATAR_SIZE}
                        auraId={rowUsesPremiumAura ? undefined : rowEffectiveAura}
                      />
                    </PremiumAvatarHalo>
                  </View>
                </View>
                <View style={{ flex:1, minWidth: 0 }}>
                  {hasLeagueCrown ? (
                    <LeagueCrownName text={p.name} fontSize={f.body} count={displayLeagueCrownCount} />
                  ) : !!p.isVip ? (
                    <VipGreenUserName text={p.name} fontSize={f.body} />
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
                      {triLang(lang, {
                        ru: 'Вы',
                        uk: 'Ви',
                        es: 'Tú',
                        'pt-BR': "Você",
                        vi: "Bạn",
                        id: "Kamu",
                        tr: "Sen",
                        pl: "Ty",
                      })}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection:'row', alignItems:'center', gap:5, flexShrink: 0 }}>
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
          ) : null}
        </View>
        </View>
        )}

      </ScrollView>
      </BouncyWrap>

      </ContentWrap>

      <Modal
        visible={chatModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.56)', justifyContent:'flex-end' }}>
          <View style={{ height:'86%', borderTopLeftRadius:22, borderTopRightRadius:22, overflow:'hidden', backgroundColor:t.bgCard, borderWidth:0.5, borderColor:t.border }}>
            <View style={{ minHeight:54, paddingHorizontal:14, flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderBottomWidth:0.5, borderBottomColor:t.border }}>
              <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'900' }}>
                {triLang(lang, {
                  ru: 'Чат лиги',
                  uk: 'Чат ліги',
                  es: 'Chat de liga',
                  'pt-BR': 'Chat da liga',
                  vi: 'Chat liga',
                  id: 'Chat liga',
                  tr: 'Lig sohbeti',
                  pl: 'Czat ligi',
                })}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close"
                activeOpacity={0.82}
                onPress={() => setChatModalVisible(false)}
                style={{ width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center', backgroundColor:t.bgSurface, borderWidth:0.5, borderColor:t.border }}
              >
                <Ionicons name="close" size={22} color={t.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={{ flex:1, minHeight:0 }}>
              <LeagueChatPanel
                initialRoom={leagueGroupMeta}
                myUid={arenaClubStableUid}
                myAvatar={myAvatarEmoji}
                myAuraId={myAuraId}
                myTotalXP={playerXP}
                onToast={showLeagueToast}
              />
            </View>
          </View>
        </View>
      </Modal>

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

      <ThemedConfirmModal
        visible={groupBoostConfirmVisible}
        title="Включить буст лиги?"
        messageNode={(
          <View style={{ gap:10 }}>
            <Text style={{ color:t.textMuted, fontSize:f.body, lineHeight:f.body * 1.45, fontWeight:'700' }}>
              Все участники лиги будут получать ×2 XP в течение 3 часов.
            </Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap:7 }}>
              <Text style={{ color:t.textMuted, fontSize:f.body, fontWeight:'800' }}>
                Стоимость:
              </Text>
              <Image
                source={oskolokImageForPackShards(LEAGUE_GROUP_BOOST_COST_SHARDS, themeMode)}
                style={{ width:20, height:20 }}
                contentFit="contain"
              />
              <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'900' }}>
                {LEAGUE_GROUP_BOOST_COST_SHARDS}
              </Text>
            </View>
          </View>
        )}
        cancelLabel="Отмена"
        confirmLabel={groupBoostBuying ? 'Включаем...' : `Включить за ${LEAGUE_GROUP_BOOST_COST_SHARDS}`}
        confirmVariant="accent"
        testIDPrefix="league-group-boost-confirm"
        onCancel={() => {
          if (!groupBoostBuying) setGroupBoostConfirmVisible(false);
        }}
        onConfirm={() => { void performBuyGroupBoost(); }}
      />

      <LeagueChestOpenModal
        visible={leagueRaceVisible && leagueChestOpenModal !== null}
        crownName={leagueChestOpenModal?.crownName}
        isCrownWinner={leagueChestOpenModal?.isCrownWinner}
        rewards={leagueChestOpenModal?.rewards}
        onClose={() => setLeagueChestOpenModal(null)}
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
