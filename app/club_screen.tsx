import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Animated, Easing, Pressable, Image } from 'react-native';
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
import {
  LEAGUES,
  clubDescForLang,
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

// v2 — bumped после фикса race на signInAnonymously + остановки резервной записи
// в league_state_v3. Старый таймер мог хранить «не обновлять» с момента, когда
// fetchGroupForUser возвращал только пользователя из-за PERMISSION_DENIED.
const CLUB_REMOTE_REFRESH_AT_KEY = 'club_remote_refresh_at_v2';
const CLUB_REMOTE_REFRESH_MS = 6 * 60 * 60 * 1000;
const CLUB_ENTRY_REPEATING_MOTION_ENABLED = false;
const CLUB_ANIMATION_USE_NATIVE_DRIVER = false;

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
function LeagueIconImageWithFallback({
  source,
  iconName,
  color,
  size,
  opacity,
}: {
  source?: any;
  iconName: string;
  color: string;
  size: number;
  opacity: number;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [source]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {!loaded || !source ? (
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
          }}
          resizeMode="contain"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
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
          resizeMode="contain"
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
}: {
  league: any;
  size?: number;
  pulse?: boolean;
  active?: boolean;
  locked?: boolean;
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
  const icon = imageUri ? (
    <LeagueIconImageWithFallback
      source={imageUri}
      iconName={iconName}
      color={locked ? '#7A7A7A' : (active ? league.color : '#7F8793')}
      size={size}
      opacity={locked ? 0.55 : (active ? 1 : 0.65)}
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
  const [selectedLeagueId, setSelectedLeagueId] = useState(initialLeagueState?.leagueId ?? 0);
  const [group, setGroup]               = useState<GroupMember[]>(() => initialLeagueState?.group ?? []);
  const [descModal, setDescModal]       = useState<(typeof LEAGUES)[number] | null>(null);
  const [profilePlayer, setProfile]     = useState<UnifiedPlayerInfo | null>(null);
  const [myAvatarEmoji, setMyAvatarEmoji] = useState('🐣');
  const [myFrameId, setMyFrameId]         = useState('plain');
  const [myAuraId, setMyAuraId]           = useState('');
  const [userName, setUserName]         = useState('');
  const [playerXP, setPlayerXP]         = useState(0);
  const [localLeagueHydrated, setLocalLeagueHydrated] = useState(initialLeagueState != null);
  const [clubTab, setClubTab] = useState<'rank' | 'chat'>('rank');
  const [rankDelta, setRankDelta] = useState<RankDelta | null>(null);
  const [pendingLeagueResult, setPendingLeagueResult] = useState<LeagueResult | null>(null);
  const dismissedLeagueResultThisSessionRef = useRef<boolean>(false);
  const railScrollX = useRef(new Animated.Value(0)).current;
  const [leagueRailWidth, setLeagueRailWidth] = useState(0);
  const LEAGUE_ITEM_SIZE = 104;
  const LEAGUE_ITEM_GAP = 14;
  const LEAGUE_ITEM_FULL = LEAGUE_ITEM_SIZE + LEAGUE_ITEM_GAP;
  const LEAGUE_RAIL_ICON_SIZE = 78;
  const LEAGUE_RAIL_ICON_BOX_SIZE = 108;
  const leagueRailRef = useRef<ScrollView | null>(null);
  const contentScrollRef = useRef<ScrollView | null>(null);
  const didAutoScrollToMyRowRef = useRef<string | null>(null);
  const [contentViewportHeight, setContentViewportHeight] = useState(0);
  const [leaderboardTopY, setLeaderboardTopY] = useState<number | null>(null);
  const lastSnapLeagueRef = useRef<number | null>(null);
  const [leagueRailPositioned, setLeagueRailPositioned] = useState(false);
  const railSideInset = leagueRailWidth > 0
    ? Math.max(12, Math.round((leagueRailWidth - LEAGUE_ITEM_SIZE) / 2))
    : 12;
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
  const [leagueCrownsByUid, setLeagueCrownsByUid] = useState<Record<string, { expiresAt: number }>>({});
  const [leagueChestOpenModal, setLeagueChestOpenModal] = useState<{
    crownName?: string;
    isCrownWinner?: boolean;
    rewards?: LeagueChestRewardDrop[];
  } | null>(null);

  const isMountedRef = useRef(true);
  const leagueChatUnreadCount = useLeagueChatUnread({
    initialRoom: leagueGroupMeta,
    myUid: arenaClubStableUid,
    active: clubTab === 'chat',
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
    if (clubTab !== 'chat') return;
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
  }, [clubTab, leagueGroupMeta, loadData]);

  useEffect(() => {
    if (clubTab === 'chat') {
      setLeagueRailPositioned(false);
      return;
    }
    if (!leagueRailRef.current || leagueRailWidth <= 0) return;
    const idx = Math.max(0, LEAGUES.findIndex((l) => l.id === myLeagueId));
    const targetX = idx * LEAGUE_ITEM_FULL;
    setLeagueRailPositioned(false);
    const frame = requestAnimationFrame(() => {
      railScrollX.setValue(targetX);
      lastSnapLeagueRef.current = LEAGUES[idx]?.id ?? 0;
      leagueRailRef.current?.scrollTo({ x: targetX, y: 0, animated: false });
      if (isMountedRef.current) setLeagueRailPositioned(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [LEAGUE_ITEM_FULL, clubTab, leagueRailWidth, myLeagueId, railScrollX]);

  const myLeague = LEAGUES[myLeagueId];

  const sortedGroup = [...group].sort((a, b) => b.points - a.points);
  const showEmptyParticipants = shouldShowLeagueEmptyParticipants({
    localLeagueHydrated,
    participantCount: sortedGroup.length,
  });
  const zoneSize = getLeagueResultZoneSize(sortedGroup.length);
  const promotionCutoff = sortedGroup.length >= 2 && myLeagueId < LEAGUES.length - 1 ? zoneSize : 0;
  const relegationStartIndex = sortedGroup.length >= 2 ? Math.max(0, sortedGroup.length - zoneSize) : sortedGroup.length;
  const myRank      = sortedGroup.findIndex(m => m.isMe) + 1;
  const total       = sortedGroup.length;
  const myRowIndex = myRank > 0 ? myRank - 1 : -1;
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

  const snapOffsets = LEAGUES.map((_, idx) => idx * LEAGUE_ITEM_FULL);

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

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      {/* Хедер */}
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity
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
          activeOpacity={0.85}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            safeRouterBack(router, '/(tabs)/home' as any);
          }}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={28} color={sx.primary} />
        </TouchableOpacity>
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
            ['rank', triLang(lang, {
              ru: 'Рейтинг',
              uk: 'Рейтинг',
              es: 'Ranking',
              'pt-BR': "Ranking",
              vi: "Xếp hạng",
              id: "Peringkat",
              tr: "Sıralama",
              pl: "Ranking",
            }), 'podium-outline'],
            ['chat', triLang(lang, {
              ru: 'Чат',
              uk: 'Чат',
              es: 'Chat',
              'pt-BR': "Chat",
              vi: "Trò chuyện",
              id: "Chat",
              tr: "Sohbet",
              pl: "Czat",
            }), 'chatbubbles-outline'],
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
                  position:'relative',
                  overflow:'visible',
                  backgroundColor: active ? t.accent : 'transparent',
                }}
              >
                <Ionicons name={icon as any} size={17} color={active ? t.correctText : t.textMuted} />
                <Text style={{ color:active ? t.correctText : t.textMuted, fontSize:f.sub, fontWeight:'900' }}>{label}</Text>
                {key === 'chat' && leagueChatUnreadCount > 0 && (
                  <View
                    testID="club-chat-unread-badge"
                    style={{
                      position:'absolute',
                      top:-6,
                      right:8,
                      minWidth:20,
                      height:20,
                      paddingHorizontal:6,
                      borderRadius:10,
                      alignItems:'center',
                      justifyContent:'center',
                      backgroundColor:'#E9505F',
                      borderWidth:1.5,
                      borderColor:t.bgCard,
                    }}
                  >
                    <Text style={{ color:'#FFFFFF', fontSize:10, fontWeight:'900' }}>
                      {formatLeagueChatUnreadBadge(leagueChatUnreadCount)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {clubTab !== 'chat' && (
        <>
        {/* ── Горизонтальная лента лиг ── */}
        <View
          pointerEvents={leagueRailPositioned ? 'auto' : 'none'}
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
            style={{ overflow: 'visible', opacity: leagueRailPositioned ? 1 : 0 }}
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
                    width: LEAGUE_RAIL_ICON_BOX_SIZE,
                    height: LEAGUE_RAIL_ICON_BOX_SIZE,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'visible',
                  }}>
                    <LeagueIcon
                      league={league}
                      size={LEAGUE_RAIL_ICON_SIZE}
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
                      'pt-BR': clubNamePlanned(league.id, 'pt-BR'),
                      vi: clubNamePlanned(league.id, 'vi'),
                      id: clubNamePlanned(league.id, 'id'),
                      tr: clubNamePlanned(league.id, 'tr'),
                      pl: clubNamePlanned(league.id, 'pl'),
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
        <LinearGradient colors={leagueBonusPalette.card} locations={leagueBonusPalette.cardLocations} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={{ borderRadius:16, borderWidth:0.5, borderColor:leagueBonusPalette.border, padding:14, gap:12, overflow:'hidden' }}>
          <LeagueBonusGiftImageWithFallback
            source={leagueBonusGiftImage}
            color={leagueChestVisualAccent}
            size={136}
            opacity={leagueChestReady ? 0.20 : 0.12}
            style={{ position:'absolute', right:-24, top:-22, transform:[{ rotate:'-8deg' }] }}
          />
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
              <View style={{ width:56, height:56, borderRadius:28, backgroundColor:leagueBonusPalette.iconBg, borderWidth:0.5, borderColor:leagueBonusPalette.iconBorder, alignItems:'center', justifyContent:'center', shadowColor:leagueChestVisualAccent, shadowOpacity:leagueChestReady ? 0.42 : 0.24, shadowRadius:14, shadowOffset:{ width:0, height:6 }, elevation:7 }}>
                <LeagueBonusGiftImageWithFallback source={leagueBonusGiftImage} color={leagueChestVisualAccent} size={66} opacity={leagueChestReady ? 1 : 0.94} />
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
            <Text style={{ color: leagueChestVisualAccent, fontSize:f.body, fontWeight:'900' }}>
              {leagueChestPct}%
            </Text>
          </View>
          <View style={{ height:10, borderRadius:6, overflow:'hidden', backgroundColor:leagueBonusPalette.track, borderWidth:0.5, borderColor:leagueBonusPalette.trackBorder }}>
            <LinearGradient colors={leagueChestVisualFill} start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={{ height:'100%', width:`${leagueChestPct}%` as any, borderRadius:6 }} />
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <Text style={{ color:leagueBonusPalette.textMuted, fontSize:f.caption, fontWeight:'900', flex:1 }} numberOfLines={1}>
              {leagueChestProgress.toLocaleString()} / {leagueChestGoal.toLocaleString()} XP
            </Text>
          </View>
          {!!leagueCrownWinnerName && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:6, paddingTop:2 }}>
              <Ionicons name="trophy-outline" size={15} color={leagueCrownAccent} />
              <Text style={{ color:t.textSecond, fontSize:Math.max(10, f.caption - 1), fontWeight:'800', flex:1 }} numberOfLines={1}>
                {triLang(lang, {
                  ru: `Корона недели: ${leagueCrownWinnerName}`,
                  uk: `Корона тижня: ${leagueCrownWinnerName}`,
                  es: `Corona semanal: ${leagueCrownWinnerName}`,
                  'pt-BR': `Coroa da semana: ${leagueCrownWinnerName}`,
                  vi: `Vương miện tuần: ${leagueCrownWinnerName}`,
                  id: `Mahkota mingguan: ${leagueCrownWinnerName}`,
                  tr: `Haftanın tacı: ${leagueCrownWinnerName}`,
                  pl: `Korona tygodnia: ${leagueCrownWinnerName}`,
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

        <View
          onLayout={(e) => setLeaderboardTopY(e.nativeEvent.layout.y)}
          style={{ backgroundColor:t.bgCard, borderRadius:16, borderWidth:0.5, borderColor:t.border, overflow:'hidden', marginTop:8 }}
        >
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
                  isVip: p.isVip ?? false,
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
                <View style={{ flex:1, minWidth: 0 }}>
                  {hasLeagueCrown ? (
                    <LeagueCrownName text={p.name} fontSize={f.body} />
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
        </>
        )}

      </ScrollView>

      {clubTab === 'chat' && (
        <View style={{ flex: 1, minHeight: 0 }}>
          <LeagueChatPanel
            initialRoom={leagueGroupMeta}
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
                {descModal ? triLang(lang, {
                  ru: descModal.nameRU,
                  uk: descModal.nameUK,
                  es: descModal.nameES,
                  'pt-BR': descModal ? clubNamePlanned(descModal.id, 'pt-BR') : '',
                  vi: descModal ? clubNamePlanned(descModal.id, 'vi') : '',
                  id: descModal ? clubNamePlanned(descModal.id, 'id') : '',
                  tr: descModal ? clubNamePlanned(descModal.id, 'tr') : '',
                  pl: descModal ? clubNamePlanned(descModal.id, 'pl') : '',
                }) : ''}
              </Text>
              <Text style={{ color:t.textSecond, fontSize:f.body, lineHeight:22, textAlign:'center' }}>
                {descModal ? clubDescForLang(descModal, lang) : ''}
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
