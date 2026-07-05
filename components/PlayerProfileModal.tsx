import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
/**
 * Unified player/bot profile card.
 * Used in Hall of Fame AND Clubs — same component, no differences.
 *
 * Props:
 *   player      — the player to display (null = hidden). Modal `visible` tied only to this — no
 *                 post-close snapshot, so Android never keeps an invisible touch-blocking layer.
 *   myInfo      — current user's own data (to detect isMe)
 *   onClose     — called when modal should close (parent sets player to null immediately)
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  InteractionManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import firestore from '@react-native-firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import AvatarView from './AvatarView';
import PremiumAvatarHalo from './PremiumAvatarHalo';
import LeagueCrownName from './LeagueCrownName';
import { memberNameStatusStyle } from './premiumMemberStyles';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import { getTitleString } from '../constants/titles';
import { triLang, type Lang } from '../constants/i18n';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { CLUBS, clubTierShortName } from '../app/league_engine';
import { arenaTierLabel } from '../app/arena_rating';
import type { RankTier } from '../app/types/arena';
import { getCurrentMultiplierBreakdown, MultiplierBreakdown, normalizeArenaMultipliersFirestore } from '../app/xp_manager';
import { CLOUD_SYNC_ENABLED, ENABLE_PROFILE_CARD, IS_EXPO_GO } from '../app/config';
import { readLifetimeProfileStatsCache, loadLifetimeProfileStats } from '../app/lifetime_profile_stats';
import { syncToCloud } from '../app/cloud_sync';
import { deleteFriend, sendFriendRequest, subscribeToFriends } from '../app/firestore_friend_requests';
import { invalidateFriendsActivityCache } from '../app/firestore_friend_activity';
import {
  fetchActivityLikeTotal,
  fetchTodayActivityLikeState,
  sendFriendActivityLike,
  removeFriendActivityLike,
  todayActivityLikeDateKeyUtc,
  PROFILE_LIKE_EVENT_ID,
  type FriendActivityLikeTodayState,
} from '../app/friend_activity_likes';
import { getCanonicalUserId } from '../app/user_id_policy';
import { isLifetimePlanLocal } from '../app/premium_guard';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import InGameToast from './InGameToast';
import ThemedConfirmModal from './ThemedConfirmModal';
import ProfileCardMotionFx from './ProfileCardMotionFx';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { fetchActiveLeagueCrowns } from '../app/services/league_chest_rewards';
import { PREMIUM_AVATAR_AURA_ID, getEffectiveAvatarAuraId } from '../constants/avatar_auras';
import {
  fxKindForProfileCard,
  getNextProfileCardLevel,
  getProfileCardLegendNo,
  getProfileCardLevelDef,
  getProfileCardSnapshot,
  PROFILE_CARD_GRADIENTS,
  PROFILE_CARD_LEVEL_NAME_RU,
  PROFILE_CARD_SURFACES,
  PROFILE_CARD_THEME_COLORS,
  normalizeProfileCardLevel,
  profileCardLevelRoman,
  themeForProfileCardLevel,
  upgradeProfileCardLevel,
  ProfileCardLevel,
  ProfileCardMotion,
  ProfileCardSnapshot,
  ProfileCardTheme,
} from '../app/profile_card_system';

export interface PlayerInfo {
  name: string;
  points: number;      // total XP (or weekXp when from club room)
  totalXp?: number;    // actual total XP (overrides points for level calc)
  weekXp?: number;
  isMe: boolean;
  avatar?: string;
  frame?: string;
  aura?: string;
  streak?: number | null;
  leagueId?: number;
  uid?: string;
  friendUid?: string;
  isPremium?: boolean;
  isVip?: boolean;
  /** Разовая покупка «Навсегда» (premium_plan==='lifetime') → показываем «Pro» вместо «Plus». */
  isLifetime?: boolean;
  leagueCrownExpiresAt?: number;
  leagueCrownCount?: number;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
}

interface MyInfo {
  name: string;
  avatar: string;
  frame: string;
  aura?: string;
  totalXP: number;
  leagueId?: number;
  streak?: number | null;
}

interface Props {
  player: PlayerInfo | null;
  myInfo: MyInfo;
  onClose: () => void;
}

const RANK_TIER_EMOJIS: Record<string, string> = {
  bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎',
  diamond: '👑', master: '🔥', grandmaster: '⚡', legend: '🌟',
};

// Синяя «дорогая» палитра Pro-плашки (зеркало celebrationContent.ts → pro.main).
const PRO_BADGE_BLUE = '#38BDF8';
const PRO_BADGE_TEXT = '#04101f';

type ProfileCardVisual = {
  theme: ProfileCardTheme;
  motion: ProfileCardMotion;
  gradient: readonly [string, string, string];
  accent: string;
  accentSoft: string;
  accentStrong: string;
  secondary: string;
  surface: string;
  surfaceBorder: string;
  shadowColor: string;
};

const DEFAULT_PROFILE_CARD_SNAPSHOT: ProfileCardSnapshot = {
  level: 0,
  theme: 'classic',
  motion: 'none',
  publicFocus: 'balanced',
};
const PROFILE_HEADER_ACTION_SIZE = 42;
// Отступы больше радиуса угла шторки (30), чтобы круглые кнопки не срезались скруглением.
const PROFILE_HEADER_ACTION_TOP = 18;
const PROFILE_HEADER_ACTION_RIGHT = 18;
const PROFILE_HEADER_ACTION_GAP = 10;

// Цвета/градиенты/подложки живут в profile_card_system.ts (одни и те же на модалке
// профиля и превью апгрейда — владелец и другие игроки видят ОДИН визуал уровня).
const buildCardVisual = (theme: ProfileCardTheme): Omit<ProfileCardVisual, 'theme' | 'motion'> => ({
  gradient: PROFILE_CARD_GRADIENTS[theme],
  ...PROFILE_CARD_THEME_COLORS[theme],
  ...PROFILE_CARD_SURFACES[theme],
});

const PROFILE_CARD_VISUALS: Record<ProfileCardTheme, Omit<ProfileCardVisual, 'theme' | 'motion'>> = {
  classic: buildCardVisual('classic'),
  gold: buildCardVisual('gold'),
  emerald: buildCardVisual('emerald'),
  sapphire: buildCardVisual('sapphire'),
  amethyst: buildCardVisual('amethyst'),
  legend: buildCardVisual('legend'),
};

function normalizeProfileCardSnapshotForLevel(raw: Partial<ProfileCardSnapshot> & Partial<PlayerInfo>): ProfileCardSnapshot {
  const level = normalizeProfileCardLevel(raw.profileCardLevel ?? raw.level);
  const theme = themeForProfileCardLevel(level);
  const motion = 'none';
  const publicFocus = 'balanced';
  return { level, theme, motion, publicFocus };
}

function getProfileCardVisual(snapshot: ProfileCardSnapshot): ProfileCardVisual {
  const theme = themeForProfileCardLevel(snapshot.level);
  const motion = 'none';
  return { theme, motion, ...PROFILE_CARD_VISUALS[theme] };
}

/** Публичные блоки статистики, открываемые уровнями карточки (II+). null = скрыть строку. */
type ProfileCardStats = {
  wordsLearned: number | null;
  phrasesLearned: number | null;
  arenaWins: number | null;
  arenaMatches: number | null;
  appDays: number | null;
  longestStreak: number | null;
  legendNo: number | null;
};

function readPublicCardStatNumber(value: unknown): number | null {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatProfileCompactNumber(value: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  if (n < 1000) return String(n);
  const thousands = n / 1000;
  if (n < 10000) {
    const oneDecimal = Math.floor(thousands * 10) / 10;
    return `${Number.isInteger(oneDecimal) ? oneDecimal.toFixed(0) : oneDecimal.toFixed(1)}K`;
  }
  return `${Math.floor(thousands)}K`;
}

type BodyProps = {
  player: PlayerInfo;
  myInfo: MyInfo;
  resolvedTotalXp: number | null;
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  shimmerAnim: Animated.Value;
  onBackdropPress: () => void;
  onClose: () => void;
  duelRank: { tier: string; level: string; xp: number } | null;
  seasonBadge: { seasonId: string; tier: 'champion' | 'top10' | 'top100' } | null;
  multipliers: MultiplierBreakdown | null;
  onFriendRequestToast: (message: string, toastType?: 'error' | 'info') => void;
};

function PlayerProfileModalBody({
  player,
  myInfo,
  resolvedTotalXp,
  slideAnim,
  fadeAnim,
  shimmerAnim,
  onBackdropPress,
  onClose,
  duelRank,
  seasonBadge,
  multipliers,
  onFriendRequestToast,
}: BodyProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const isCompassTheme = false;
  const { isPremium: myIsPremium, isVip: myIsVip } = usePremium();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const isMe = player.isMe;
  const [friendRequestBusy, setFriendRequestBusy] = useState(false);
  const [friendUids, setFriendUids] = useState<Set<string>>(() => new Set());
  const [friendRequestSentUids, setFriendRequestSentUids] = useState<Set<string>>(() => new Set());
  const [removeFriendConfirmOpen, setRemoveFriendConfirmOpen] = useState(false);
  const [profileCardSnapshot, setProfileCardSnapshot] = useState<ProfileCardSnapshot>(() => normalizeProfileCardSnapshotForLevel(player));
  const [cardStats, setCardStats] = useState<ProfileCardStats | null>(null);
  // Превью апгрейда прямо на открытой карточке: null = настоящий уровень, иначе
  // карточка целиком преображается в выбранный уровень (визуал+эффекты+блоки).
  const [previewLevel, setPreviewLevel] = useState<ProfileCardLevel | null>(null);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  // Анимация «морфа» при смене уровня карточки (превью или покупка).
  const levelSwitchAnim = useRef(new Animated.Value(1)).current;
  // Выезд панели превью снизу (0 = спрятана под краем, 1 = на месте).
  const previewPanelAnim = useRef(new Animated.Value(0)).current;
  const [activityLikeTotal, setActivityLikeTotal] = useState(0);
  // Profile-level activity like the current user has already placed today (toggle state).
  const [todayLike, setTodayLike] = useState<FriendActivityLikeTodayState | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const likeInFlightRef = useRef(false);
  const profileCardLevel = profileCardSnapshot.level;
  const [remoteCrown, setRemoteCrown] = useState<{ expiresAt: number; crownCount: number }>(() => ({ expiresAt: 0, crownCount: 0 }));
  const playerPoints = Number.isFinite(Number(player.points)) ? Math.max(0, Math.floor(Number(player.points))) : null;
  const totalXp = isMe ? myInfo.totalXP : (resolvedTotalXp ?? player.totalXp ?? playerPoints ?? null);
  const safeTotalXp = totalXp ?? 0;
  const displayXp = isMe ? myInfo.totalXP : (totalXp ?? 0);
  const xp = displayXp;
  const level = getLevelFromXP(safeTotalXp);
  const streak = isMe ? (myInfo.streak ?? null) : (player.streak ?? null);
  const avatarStr = isMe
    ? (myInfo.avatar || String(getBestAvatarForLevel(level)))
    : (player.avatar ? String(player.avatar) : String(getBestAvatarForLevel(level)));
  const leagueIdx = isMe
    ? (myInfo.leagueId ?? 0)
    : (player.leagueId ?? 0);
  const club = CLUBS[Math.max(0, Math.min(leagueIdx, CLUBS.length - 1))];
  const showPremium = isMe ? myIsPremium : (player.isPremium ?? false);
  const showVip = isMe ? myIsVip : (player.isVip ?? false);
  // «Pro» = разовая покупка «Навсегда» (lifetime). Для себя читаем локальный план,
  // для чужих — денормализованный флаг из публичного профиля. Показываем Pro только
  // при активном премиум-доступе (showPremium), иначе плашки нет вовсе.
  const [myIsLifetime, setMyIsLifetime] = useState(false);
  useEffect(() => {
    if (!isMe) return;
    let cancelled = false;
    void isLifetimePlanLocal().then((v) => { if (!cancelled) setMyIsLifetime(v); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isMe]);
  const showPro = showPremium && (isMe ? myIsLifetime : (player.isLifetime ?? false));
  const storedAuraId = isMe ? myInfo.aura : player.aura;
  const effectiveAuraId = getEffectiveAvatarAuraId(storedAuraId, showPremium, showVip);
  const usesPremiumAura = effectiveAuraId === PREMIUM_AVATAR_AURA_ID;
  // Всё ВИЗУАЛЬНОЕ рисуем от displayCardLevel (уровень превью, если оно активно),
  // а логика покупки/кнопки живёт на настоящем profileCardLevel.
  const nextRealLevel = getNextProfileCardLevel(profileCardLevel);
  const displayCardLevel: ProfileCardLevel = isMe && previewLevel !== null ? previewLevel : profileCardLevel;
  const displaySnapshot: ProfileCardSnapshot = displayCardLevel === profileCardSnapshot.level
    ? profileCardSnapshot
    : normalizeProfileCardSnapshotForLevel({ profileCardLevel: displayCardLevel });
  const cardDef = getProfileCardLevelDef(displayCardLevel);
  const cardVisual = getProfileCardVisual(displaySnapshot);
  const nextLevelVisual = PROFILE_CARD_VISUALS[themeForProfileCardLevel(nextRealLevel ?? profileCardLevel)];
  const crownUid = player.friendUid || player.uid || '';
  const leagueCrownCount = Math.max(
    0,
    Math.floor(Number(player.leagueCrownCount) || 0),
    Math.floor(Number(remoteCrown.crownCount) || 0),
  );
  const hasLeagueCrown = leagueCrownCount > 0 || Math.max(Number(player.leagueCrownExpiresAt) || 0, remoteCrown.expiresAt) > Date.now();
  const displayLeagueCrownCount = hasLeagueCrown ? Math.max(1, leagueCrownCount) : 0;
  const rawProfileCardLevel = player.profileCardLevel;

  useEffect(() => {
    if (!crownUid) {
      setRemoteCrown({ expiresAt: 0, crownCount: 0 });
      return;
    }
    let cancelled = false;
    void fetchActiveLeagueCrowns([crownUid]).then((crowns) => {
      const crown = crowns[crownUid];
      if (!cancelled) {
        setRemoteCrown({
          expiresAt: crown?.expiresAt ?? 0,
          crownCount: Math.max(0, Math.floor(Number(crown?.crownCount) || 0)),
        });
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [crownUid]);

  useEffect(() => {
    let cancelled = false;
    setActivityLikeTotal(0);
    setTodayLike(null);
    void (async () => {
      const uid = player.friendUid || player.uid || (isMe ? await getCanonicalUserId() : '');
      if (!uid || cancelled) return;
      const [total, likeState] = await Promise.all([
        fetchActivityLikeTotal(uid),
        isMe ? Promise.resolve(null) : fetchTodayActivityLikeState().catch(() => null),
      ]);
      if (cancelled) return;
      setActivityLikeTotal(total);
      setTodayLike(likeState);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMe, player.friendUid, player.uid]);

  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  // Анимацию карточки рисует теперь ProfileCardMotionFx (единый движок) — старые
  // prestigeGlow/Glint/Particle интерполяции удалены как мёртвый код.
  const prestigeActive = displayCardLevel > 0;
  const compassProfileSurface = isCompassTheme && !prestigeActive;
  // ПРАВИЛО владельца: никаких обводок у контейнеров — поверхность отличается ТОНОМ.
  const prestigeSurfaceStyle = prestigeActive
    ? { backgroundColor: cardVisual.surface, borderWidth: 0, borderColor: 'transparent' }
    : compassProfileSurface
      ? { backgroundColor: COMPASS_RICH.charcoalRaised, borderWidth: 1, borderColor: COMPASS_RICH.hairlineQuiet, overflow: 'hidden' as const }
      : { backgroundColor: t.bgSurface, borderWidth: 0, borderColor: 'transparent' };
  const friendRequestTargetUid = player.friendUid !== undefined ? player.friendUid : player.uid;

  const showAddFriend =
    !isMe &&
    !!friendRequestTargetUid &&
    CLOUD_SYNC_ENABLED &&
    !IS_EXPO_GO;
  const isAlreadyFriend = !!friendRequestTargetUid && friendUids.has(friendRequestTargetUid);
  const isFriendRequestSent = !!friendRequestTargetUid && friendRequestSentUids.has(friendRequestTargetUid);

  // Profile-level activity like: tappable on ANY user's card (friend or not), just not your
  // own. The like is bound to the person (not an event), one per day across everyone, toggleable.
  const likeTargetUid = player.friendUid || player.uid || '';
  const canLike = !isMe && !!likeTargetUid && CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  const likedThisProfile =
    !!todayLike &&
    todayLike.targetUid === likeTargetUid &&
    todayLike.eventId === PROFILE_LIKE_EVENT_ID;

  useEffect(() => {
    let cancelled = false;
    if (!isMe) {
      setProfileCardSnapshot(normalizeProfileCardSnapshotForLevel({
        profileCardLevel: rawProfileCardLevel,
      }));
      return () => {
        cancelled = true;
      };
    }
    getProfileCardSnapshot()
      .then((snapshot) => {
        if (!cancelled) setProfileCardSnapshot(normalizeProfileCardSnapshotForLevel(snapshot));
      })
      .catch(() => {
        if (!cancelled) setProfileCardSnapshot(DEFAULT_PROFILE_CARD_SNAPSHOT);
      });
    return () => {
      cancelled = true;
    };
  }, [
    isMe,
    rawProfileCardLevel,
    player.uid,
    player.friendUid,
  ]);

  // Блоки статистики уровней II+ («Выучено»/«Арена»/«Путь»/«Легенда»). Для себя —
  // локальные lifetime-статы (кэш мгновенно, полный пересчёт добегает следом); для
  // других — денормализованные card*-поля из public_profiles, которые пишет
  // public_profile_snapshot.ts при уровне карточки II+.
  useEffect(() => {
    let cancelled = false;
    setCardStats(null);
    // Свою карточку грузим всегда (нужно для превью будущих уровней), чужую — только
    // если её уровень реально открывает блоки.
    if (!isMe && profileCardLevel < 2) {
      return () => { cancelled = true; };
    }
    if (isMe) {
      void (async () => {
        const legendNo = profileCardLevel >= 5 ? await getProfileCardLegendNo().catch(() => null) : null;
        const apply = (s: Awaited<ReturnType<typeof readLifetimeProfileStatsCache>>) => {
          if (cancelled || !s) return;
          setCardStats({
            wordsLearned: s.wordsLearned,
            phrasesLearned: s.phrasesLearned,
            arenaWins: s.arenaWins,
            arenaMatches: s.arenaWins + s.arenaLosses,
            appDays: s.appDaysUnion,
            longestStreak: s.longestStreakDays,
            legendNo,
          });
        };
        apply(await readLifetimeProfileStatsCache().catch(() => null));
        // Полный пересчёт освежит кэш и цифры, если снимок устарел.
        InteractionManager.runAfterInteractions(() => {
          if (cancelled) return;
          void loadLifetimeProfileStats().then(apply).catch(() => {});
        });
      })();
      return () => { cancelled = true; };
    }
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
      return () => { cancelled = true; };
    }
    const publicIds = Array.from(new Set([player.friendUid, player.uid].filter(Boolean) as string[]));
    void (async () => {
      for (const id of publicIds) {
        try {
          const snap = await firestore().collection('public_profiles').doc(id).get();
          if (cancelled) return;
          if (!snap.exists) continue;
          const d = (snap.data() ?? {}) as Record<string, unknown>;
          setCardStats({
            wordsLearned: readPublicCardStatNumber(d.cardWordsLearned),
            phrasesLearned: readPublicCardStatNumber(d.cardPhrasesLearned),
            arenaWins: readPublicCardStatNumber(d.cardArenaWins),
            arenaMatches: readPublicCardStatNumber(d.cardArenaMatches),
            appDays: readPublicCardStatNumber(d.cardAppDays),
            longestStreak: readPublicCardStatNumber(d.cardLongestStreak),
            legendNo: readPublicCardStatNumber(d.profileCardLegendNo),
          });
          return;
        } catch { /* пробуем следующий id */ }
      }
    })();
    return () => { cancelled = true; };
  }, [isMe, profileCardLevel, player.friendUid, player.uid]);

  // «Морф» при каждой смене отображаемого уровня: фон/эффекты проявляются заново,
  // шторка едва заметно пружинит масштабом.
  const prevDisplayLevelRef = useRef(displayCardLevel);
  useEffect(() => {
    if (prevDisplayLevelRef.current === displayCardLevel) return;
    prevDisplayLevelRef.current = displayCardLevel;
    levelSwitchAnim.setValue(0);
    Animated.timing(levelSwitchAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [displayCardLevel, levelSwitchAnim]);

  // Панель превью выезжает снизу при входе в режим превью и уезжает при выходе.
  useEffect(() => {
    Animated.timing(previewPanelAnim, {
      toValue: isMe && previewLevel !== null ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isMe, previewLevel, previewPanelAnim]);

  // Тап по круглой кнопке: карточка ПРЯМО ЗДЕСЬ преображается в следующий уровень
  // (никакого отдельного экрана). Повторные тапы листают уровни дальше до V,
  // после V — возврат к настоящей карточке.
  const handleUpgradeButtonTap = useCallback(() => {
    hapticTap();
    setPreviewLevel((prev) => (prev === null ? getNextProfileCardLevel(profileCardLevel) : getNextProfileCardLevel(prev)));
  }, [profileCardLevel]);

  const handleExitPreview = useCallback(() => {
    hapticTap();
    setPreviewLevel(null);
  }, []);

  const handleBuyPreviewedLevel = useCallback(async () => {
    if (upgradeBusy || previewLevel === null || nextRealLevel === null || previewLevel !== nextRealLevel) return;
    hapticTap();
    setUpgradeBusy(true);
    try {
      const result = await upgradeProfileCardLevel();
      if (result.ok === true) {
        const fresh = await getProfileCardSnapshot().catch(() => null);
        if (fresh) setProfileCardSnapshot(normalizeProfileCardSnapshotForLevel(fresh));
        setPreviewLevel(null);
        if (result.legendNo) {
          const legendNo = result.legendNo;
          setCardStats((prev) => (prev ? { ...prev, legendNo } : prev));
        }
        // Покупка = публичная смена вида: бейдж в списках должен смениться сразу.
        void syncToCloud({ forceNow: true });
        const boughtName = lang === 'ru'
          ? PROFILE_CARD_LEVEL_NAME_RU[result.level]
          : getProfileCardLevelDef(result.level).name;
        onFriendRequestToast(triLang(lang as Lang, {
          ru: `Карточка улучшена: ${boughtName}`,
          uk: `Картку покращено: ${boughtName}`,
          es: `Tarjeta mejorada: ${boughtName}`,
          'pt-BR': `Cartão melhorado: ${boughtName}`,
          vi: `Đã nâng cấp thẻ: ${boughtName}`,
          id: `Kartu ditingkatkan: ${boughtName}`,
          tr: `Kart yükseltildi: ${boughtName}`,
          pl: `Karta ulepszona: ${boughtName}`,
        }), 'info');
        return;
      }
      if (result.reason === 'insufficient') {
        // Осколков не хватает — закрываем модал и ведём в магазин с готовой суммой.
        onClose();
        router.push({
          pathname: '/shards_shop',
          params: { need: String(Math.max(0, result.need ?? 0)), source: 'profile_card_upgrade' },
        } as any);
        return;
      }
      onFriendRequestToast(triLang(lang as Lang, {
        ru: 'Не получилось обновить карточку. Попробуй ещё раз.',
        uk: 'Не вдалося оновити картку. Спробуй ще раз.',
        es: 'No se pudo mejorar la tarjeta. Inténtalo de nuevo.',
        'pt-BR': 'Não foi possível melhorar o cartão. Tente novamente.',
        vi: 'Không thể nâng cấp thẻ. Hãy thử lại.',
        id: 'Kartu belum bisa ditingkatkan. Coba lagi.',
        tr: 'Kart yükseltilemedi. Tekrar dene.',
        pl: 'Nie udało się ulepszyć karty. Spróbuj ponownie.',
      }), 'error');
    } finally {
      setUpgradeBusy(false);
    }
  }, [lang, nextRealLevel, onClose, onFriendRequestToast, previewLevel, router, upgradeBusy]);

  useEffect(() => {
    setFriendRequestBusy(false);
    setRemoveFriendConfirmOpen(false);
    setFriendRequestSentUids(new Set());
    setPreviewLevel(null);
    setUpgradeBusy(false);
  }, [player.uid, player.friendUid]);

  useEffect(() => {
    if (!showAddFriend) {
      setFriendUids(new Set());
      return;
    }
    return subscribeToFriends((rows) => {
      const nextFriendUids = new Set(rows.map((row) => row.uid));
      setFriendUids(nextFriendUids);
      setFriendRequestSentUids(prev => {
        const next = new Set([...prev].filter(uid => !nextFriendUids.has(uid)));
        return next.size === prev.size ? prev : next;
      });
    });
  }, [showAddFriend]);

  const handleAddFriendPress = useCallback(async () => {
    if (!friendRequestTargetUid || friendRequestBusy) return;
    const targetUid = friendRequestTargetUid;
    setFriendRequestBusy(true);
    setFriendRequestSentUids(prev => {
      const next = new Set(prev);
      next.add(targetUid);
      return next;
    });
    onFriendRequestToast(
      triLang(lang as Lang, {
        ru: 'Заявка отправлена!',
        uk: 'Заявку надіслано!',
        es: '¡Solicitud enviada!',
        'pt-BR': 'Solicitação enviada!',
        vi: 'Đã gửi lời mời!',
        id: 'Permintaan terkirim!',
        tr: 'İstek gönderildi!',
        pl: 'Zaproszenie wysłane!',
      }),
      'info',
    );
    try {
      const result = await sendFriendRequest(targetUid);
      if (result === 'sent') {
        void invalidateFriendsActivityCache();
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Заявка отправлена!',
            uk: 'Заявку надіслано!',
            es: '¡Solicitud enviada!',
            'pt-BR': "Solicitação enviada!",
            vi: "Đã gửi lời mời!",
            id: "Permintaan terkirim!",
            tr: "İstek gönderildi!",
            pl: "Zaproszenie wysłane!",
          }),
          'info',
        );
      } else if (result === 'already_friends') {
        setFriendRequestSentUids(prev => {
          const next = new Set(prev);
          next.delete(targetUid);
          return next;
        });
        setFriendUids(prev => {
          const next = new Set(prev);
          next.add(targetUid);
          return next;
        });
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Уже друзья',
            uk: 'Уже друзі',
            es: 'Ya son amigos',
            'pt-BR': "Vocês já são amigos",
            vi: "Hai bạn đã là bạn bè",
            id: "Kalian sudah berteman",
            tr: "Zaten arkadaşsınız",
            pl: "Już jesteście znajomymi",
          }),
          'info',
        );
      } else if (result === 'already_sent') {
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Заявка уже отправлена',
            uk: 'Заявку вже надіслано',
            es: 'Solicitud ya enviada',
            'pt-BR': "Solicitação já enviada",
            vi: "Lời mời đã được gửi",
            id: "Permintaan sudah dikirim",
            tr: "İstek zaten gönderildi",
            pl: "Zaproszenie już wysłane",
          }),
          'info',
        );
      } else if (result === 'self') {
        setFriendRequestSentUids(prev => {
          const next = new Set(prev);
          next.delete(targetUid);
          return next;
        });
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Это твой профиль',
            uk: 'Це твій профіль',
            es: 'Es tu perfil',
            'pt-BR': "Este é seu perfil",
            vi: "Đây là hồ sơ của bạn",
            id: "Ini profilmu",
            tr: "Bu senin profilin",
            pl: "To twój profil",
          }),
          'info',
        );
      } else {
        setFriendRequestSentUids(prev => {
          const next = new Set(prev);
          next.delete(targetUid);
          return next;
        });
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Не отправилось. Попробуй позже',
            uk: 'Не вдалося надіслати. Спробуйте пізніше',
            es: 'No se pudo enviar. Inténtalo más tarde',
            'pt-BR': "Não foi possível enviar. Tente mais tarde",
            vi: "Không gửi được. Hãy thử lại sau",
            id: "Tidak dapat dikirim. Coba lagi nanti",
            tr: "Gönderilemedi. Daha sonra tekrar dene",
            pl: "Nie udało się wysłać. Spróbuj później",
          }),
          'error',
        );
      }
    } catch {
      setFriendRequestSentUids(prev => {
        const next = new Set(prev);
        next.delete(targetUid);
        return next;
      });
      onFriendRequestToast(
        triLang(lang as Lang, {
          ru: 'Не отправилось. Попробуй позже',
          uk: 'Не вдалося надіслати. Спробуйте пізніше',
          es: 'No se pudo enviar. Inténtalo más tarde',
          'pt-BR': 'Não foi possível enviar. Tente mais tarde',
          vi: 'Không gửi được. Hãy thử lại sau',
          id: 'Tidak dapat dikirim. Coba lagi nanti',
          tr: 'Gönderilemedi. Daha sonra tekrar dene',
          pl: 'Nie udało się wysłać. Spróbuj później',
        }),
        'error',
      );
    } finally {
      setFriendRequestBusy(false);
    }
  }, [friendRequestTargetUid, friendRequestBusy, lang, onFriendRequestToast]);

  const handleFriendButtonPress = useCallback(() => {
    if (!friendRequestTargetUid || friendRequestBusy || isFriendRequestSent) return;
    hapticTap();
    if (isAlreadyFriend) {
      setRemoveFriendConfirmOpen(true);
      return;
    }
    void handleAddFriendPress();
  }, [friendRequestTargetUid, friendRequestBusy, isAlreadyFriend, isFriendRequestSent, handleAddFriendPress]);

  const handleRemoveFriendConfirm = useCallback(() => {
    if (!friendRequestTargetUid || friendRequestBusy) return;
    const removedUid = friendRequestTargetUid;
    const wasFriend = friendUids.has(removedUid);
    setRemoveFriendConfirmOpen(false);
    setFriendRequestBusy(true);
    setFriendUids((prev) => {
      const next = new Set(prev);
      next.delete(removedUid);
      return next;
    });
    deleteFriend(removedUid)
      .then(() => {
        setFriendUids((prev) => {
          const next = new Set(prev);
          next.delete(removedUid);
          return next;
        });
        void invalidateFriendsActivityCache();
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Друг удалён',
            uk: 'Друга видалено',
            es: 'Amigo eliminado',
            'pt-BR': "Amigo removido",
            vi: "Đã xóa bạn bè",
            id: "Teman dihapus",
            tr: "Arkadaş silindi",
            pl: "Znajomy usunięty",
          }),
          'info',
        );
      })
      .catch(() => {
        if (wasFriend) {
          setFriendUids((prev) => {
            const next = new Set(prev);
            next.add(removedUid);
            return next;
          });
        }
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Ошибка удаления. Попробуй ещё раз',
            uk: 'Помилка видалення. Спробуйте ще раз',
            es: 'Error al eliminar. Inténtalo de nuevo',
            'pt-BR': "Erro ao remover. Tente de novo",
            vi: "Xóa bị lỗi. Hãy thử lại",
            id: "Gagal menghapus. Coba lagi",
            tr: "Silme hatası. Tekrar dene",
            pl: "Błąd usuwania. Spróbuj ponownie",
          }),
          'error',
        );
      })
      .finally(() => setFriendRequestBusy(false));
  }, [friendRequestTargetUid, friendRequestBusy, friendUids, lang, onFriendRequestToast]);

  const handleToggleLike = useCallback(() => {
    if (!canLike || !likeTargetUid || likeInFlightRef.current) return;
    hapticTap();
    likeInFlightRef.current = true;
    setLikeBusy(true);

    const wasLiked = likedThisProfile;
    // Optimistic toggle.
    if (wasLiked) {
      setActivityLikeTotal((n) => Math.max(0, n - 1));
      setTodayLike(null);
    } else {
      setActivityLikeTotal((n) => n + 1);
      setTodayLike({
        date: todayActivityLikeDateKeyUtc(),
        targetUid: likeTargetUid,
        eventId: PROFILE_LIKE_EVENT_ID,
        createdAt: Date.now(),
      });
    }

    const action = wasLiked
      ? removeFriendActivityLike({ targetUid: likeTargetUid })
      : sendFriendActivityLike({ targetUid: likeTargetUid, senderDisplayName: myInfo.name });

    void action
      .then((res) => {
        // Reconcile with the authoritative server total.
        setActivityLikeTotal(Math.max(0, Math.floor(Number(res.targetActivityLikeTotal) || 0)));
        if (wasLiked) {
          setTodayLike(null);
        } else {
          setTodayLike({
            date: res.date,
            targetUid: res.targetUid,
            eventId: res.eventId,
            createdAt: Date.now(),
          });
        }
        void invalidateFriendsActivityCache();
      })
      .catch(async (err: unknown) => {
        const code = String((err as { code?: string })?.code ?? '');
        const limitReached = code.includes('resource-exhausted');
        // Roll back the optimistic change to the truth on the server.
        const freshState = await fetchTodayActivityLikeState().catch(() => null);
        const freshTotal = await fetchActivityLikeTotal(likeTargetUid).catch(() => null);
        setTodayLike(freshState);
        if (typeof freshTotal === 'number') setActivityLikeTotal(Math.max(0, freshTotal));
        if (limitReached) {
          onFriendRequestToast(
            triLang(lang as Lang, {
              ru: 'Сегодня лайк уже поставлен. Можно один в день.',
              uk: 'Сьогодні лайк уже поставлено. Можна один на день.',
              es: 'Ya diste un like hoy. Solo uno por día.',
              'pt-BR': 'Você já curtiu hoje. Apenas um por dia.',
              vi: 'Hôm nay bạn đã thích rồi. Mỗi ngày một lượt.',
              id: 'Kamu sudah suka hari ini. Hanya satu per hari.',
              tr: 'Bugün zaten beğendin. Günde bir tane.',
              pl: 'Już dziś polubiłeś. Tylko jeden dziennie.',
            }),
            'info',
          );
        } else {
          onFriendRequestToast(
            triLang(lang as Lang, {
              ru: 'Не получилось. Попробуй позже',
              uk: 'Не вдалося. Спробуй пізніше',
              es: 'No funcionó. Inténtalo más tarde',
              'pt-BR': 'Não deu certo. Tente mais tarde',
              vi: 'Không thành công. Hãy thử lại sau',
              id: 'Gagal. Coba lagi nanti',
              tr: 'Olmadı. Daha sonra dene',
              pl: 'Nie udało się. Spróbuj później',
            }),
            'error',
          );
        }
        void invalidateFriendsActivityCache();
      })
      .finally(() => {
        likeInFlightRef.current = false;
        setLikeBusy(false);
      });
  }, [canLike, likeTargetUid, likedThisProfile, myInfo.name, lang, onFriendRequestToast]);

  const compactXp = formatProfileCompactNumber(xp);
  const profileChainLabel = triLang(lang as Lang, {
    ru: 'цепочка',
    uk: 'ланцюжок',
    es: 'racha',
    'pt-BR': "sequência",
    vi: "chuỗi",
    id: "rangkaian",
    tr: "seri",
    pl: "seria",
  });

  return (
    <>
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        opacity: fadeAnim,
        justifyContent: 'flex-end',
      }}
    >
      <Pressable style={{ flex: 1 }} onPress={onBackdropPress} />
      <Animated.View testID="player-profile-modal-sheet" style={{
        backgroundColor: compassProfileSurface ? COMPASS_RICH.charcoalRaised : t.bgCard,
        borderTopLeftRadius: compassProfileSurface ? 14 : 30,
        borderTopRightRadius: compassProfileSurface ? 14 : 30,
        maxHeight: '90%',
        overflow: 'hidden',
        transform: [
          { translateY: slideAnim },
          { scale: levelSwitchAnim.interpolate({ inputRange: [0, 1], outputRange: [0.982, 1] }) },
        ],
        // Без обводок (правило владельца): модал держат скругление, градиент и тень.
        borderTopWidth: prestigeActive ? 0 : 0.5,
        borderColor: compassProfileSurface ? COMPASS_RICH.hairlineStrong : t.border,
        shadowColor: prestigeActive ? cardVisual.shadowColor : '#000',
        shadowOpacity: prestigeActive ? 0.34 : compassProfileSurface ? 0.58 : 0.18,
        shadowRadius: prestigeActive ? 22 : compassProfileSurface ? 24 : 12,
        elevation: prestigeActive ? 12 : compassProfileSurface ? 14 : 6,
      }}>
        {compassProfileSurface && <CompassDepthSurface radius={14} selected />}
        <TouchableOpacity
          testID="player-profile-close"
          accessibilityRole="button"
          accessibilityLabel={triLang(lang as Lang, {
            ru: 'Закрыть профиль',
            uk: 'Закрити профіль',
            es: 'Cerrar perfil',
            'pt-BR': 'Fechar perfil',
            vi: 'Đóng hồ sơ',
            id: 'Tutup profil',
            tr: 'Profili kapat',
            pl: 'Zamknij profil',
          })}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          onPress={() => {
            hapticTap();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: PROFILE_HEADER_ACTION_TOP,
            right: PROFILE_HEADER_ACTION_RIGHT,
            zIndex: 30,
            width: PROFILE_HEADER_ACTION_SIZE,
            height: PROFILE_HEADER_ACTION_SIZE,
            borderRadius: compassProfileSurface ? 9 : PROFILE_HEADER_ACTION_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: prestigeActive ? 'rgba(0,0,0,0.34)' : compassProfileSurface ? COMPASS_RICH.charcoalRaised : 'rgba(255,255,255,0.10)',
            borderWidth: compassProfileSurface ? 1 : 0,
            borderColor: compassProfileSurface ? COMPASS_RICH.hairline : 'transparent',
            overflow: compassProfileSurface ? 'hidden' : 'visible',
            ...(compassProfileSurface ? compassShadow(1) : null),
          }}
        >
          {compassProfileSurface && <CompassDepthSurface radius={9} quiet />}
          <Ionicons name="close" size={22} color={prestigeActive ? '#FFFFFF' : compassProfileSurface ? COMPASS_RICH.champagne : t.textPrimary} />
        </TouchableOpacity>
        {showAddFriend ? (
          <Pressable
            testID="player-profile-add-friend"
            onPress={handleFriendButtonPress}
            disabled={friendRequestBusy || isFriendRequestSent}
            style={{
              position: 'absolute',
              top: PROFILE_HEADER_ACTION_TOP + PROFILE_HEADER_ACTION_SIZE + PROFILE_HEADER_ACTION_GAP,
              right: PROFILE_HEADER_ACTION_RIGHT,
              zIndex: 30,
              width: PROFILE_HEADER_ACTION_SIZE,
              height: PROFILE_HEADER_ACTION_SIZE,
              borderRadius: compassProfileSurface ? 9 : PROFILE_HEADER_ACTION_SIZE / 2,
              backgroundColor: isAlreadyFriend
                ? (compassProfileSurface ? COMPASS_RICH.charcoalRaised : prestigeActive ? 'rgba(240,84,84,0.22)' : 'rgba(240,84,84,0.16)')
                : (prestigeActive ? 'rgba(0,0,0,0.34)' : compassProfileSurface ? COMPASS_RICH.charcoalRaised : 'rgba(255,255,255,0.10)'),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: compassProfileSurface ? 1 : 0,
              borderColor: compassProfileSurface ? COMPASS_RICH.hairline : 'transparent',
              overflow: compassProfileSurface ? 'hidden' : 'visible',
              ...(compassProfileSurface ? compassShadow(1) : null),
              opacity: friendRequestBusy ? 0.55 : isFriendRequestSent ? 0.75 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang as Lang, {
              ru: 'Добавить в друзья',
              uk: 'Додати до друзів',
              es: 'Añadir amigo',
              'pt-BR': "Adicionar amigo",
              vi: "Thêm bạn bè",
              id: "Tambah teman",
              tr: "Arkadaş ekle",
              pl: "Dodaj znajomego",
            })}
          >
            {compassProfileSurface && <CompassDepthSurface radius={9} quiet />}
            <Ionicons
              name={isAlreadyFriend ? 'person-remove-outline' : isFriendRequestSent ? 'checkmark-circle-outline' : 'person-add-outline'}
              size={22}
              color={isAlreadyFriend ? (compassProfileSurface ? COMPASS_RICH.peach : (t.wrong ?? t.accent)) : compassProfileSurface ? COMPASS_RICH.champagne : t.accent}
            />
          </Pressable>
        ) : null}
        {isMe && ENABLE_PROFILE_CARD && nextRealLevel !== null ? (
          // Круглая кнопка апгрейда на СВОЕЙ карточке: тап преображает карточку в
          // превью следующего уровня ПРЯМО НА МЕСТЕ, повторные тапы листают до V.
          // Модель: заливка градиентом следующего уровня + бриллиант (в превью — номер).
          <TouchableOpacity
            testID="player-profile-upgrade-card"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang as Lang, {
              ru: 'Улучшить карточку',
              uk: 'Покращити картку',
              es: 'Mejorar tarjeta',
              'pt-BR': 'Melhorar cartão',
              vi: 'Nâng cấp thẻ',
              id: 'Tingkatkan kartu',
              tr: 'Kartı yükselt',
              pl: 'Ulepsz kartę',
            })}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            onPress={handleUpgradeButtonTap}
            activeOpacity={0.85}
            style={{
              position: 'absolute',
              top: PROFILE_HEADER_ACTION_TOP,
              left: PROFILE_HEADER_ACTION_RIGHT,
              zIndex: 30,
              width: PROFILE_HEADER_ACTION_SIZE,
              height: PROFILE_HEADER_ACTION_SIZE,
              borderRadius: PROFILE_HEADER_ACTION_SIZE / 2,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: nextLevelVisual.shadowColor,
              shadowOpacity: 0.55,
              shadowRadius: 9,
              shadowOffset: { width: 0, height: 0 },
              elevation: 7,
            }}
          >
            <LinearGradient
              colors={[nextLevelVisual.accent, nextLevelVisual.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={{ opacity: shimmerOpacity }}>
              {previewLevel === null ? (
                <Ionicons name="diamond" size={19} color={monoIcon(themeMode, '#111827', MONO_ICON.onLight)} />
              ) : (
                <Text style={{ color: monoIcon(themeMode, '#111827', MONO_ICON.onLight), fontSize: 15, fontWeight: '900' }}>
                  {profileCardLevelRoman(previewLevel)}
                </Text>
              )}
            </Animated.View>
          </TouchableOpacity>
        ) : null}
        {prestigeActive && (
          // При смене уровня (превью/покупка) фон и эффекты мягко проявляются заново —
          // «морф» карточки вместо мгновенной подмены.
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: levelSwitchAnim }]}>
            <LinearGradient
              colors={cardVisual.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Глубина без обводок: два мягких тональных пятна цвета уровня. */}
            <View pointerEvents="none" style={{ position: 'absolute', top: -70, left: -50, width: 240, height: 240, borderRadius: 120, backgroundColor: cardVisual.accentSoft }} />
            <View pointerEvents="none" style={{ position: 'absolute', top: 150, right: -90, width: 300, height: 300, borderRadius: 150, backgroundColor: cardVisual.accentSoft, opacity: 0.45 }} />
            {/* Единый движок анимаций (тот же, что в превью «Моя карточка») — чтобы
                владелец и другие игроки видели ОДИН и тот же эффект уровня. Заменил
                старые inline Animated glint/частицы. */}
            <ProfileCardMotionFx
              kind={fxKindForProfileCard(displaySnapshot.level, displaySnapshot.motion)}
              radius={30}
              accent={cardVisual.accent}
              secondary={cardVisual.secondary}
              accentSoft={cardVisual.accentSoft}
            />
          </Animated.View>
        )}
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 24, paddingBottom: Math.max(96, bottomInset + 72) + (isMe && previewLevel !== null ? 112 : 0) }}
        >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: prestigeActive ? cardVisual.accentStrong : t.border, alignSelf: 'center', marginBottom: 20 }} />
        {showPremium && (
          // Pro (разовая «Навсегда») — синяя «дорогая» плашка с 💎; иначе Plus —
          // золотая со звёздами. Внутренний доступ один и тот же (premium), меняется
          // только видимое имя/цвет — как в PremiumCelebrationModal (pro=синий).
          <Animated.View style={{
            opacity: shimmerOpacity,
            alignSelf: 'center',
            marginBottom: 12,
            backgroundColor: showPro ? PRO_BADGE_BLUE : t.gold,
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingVertical: 5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: showPro ? PRO_BADGE_BLUE : t.gold,
            shadowOpacity: 0.6,
            shadowRadius: 8,
            elevation: 6,
          }}>
            {showPro ? (
              <Ionicons name="diamond" size={13} color={PRO_BADGE_TEXT} />
            ) : (
              <Ionicons name="star" size={13} color={t.correctText} />
            )}
            <Text style={{ color: showPro ? PRO_BADGE_TEXT : t.correctText, fontWeight: '800', fontSize: f.label, letterSpacing: 1 }}>
              {showPro ? 'PRO' : 'PLUS'}
            </Text>
            {showPro ? (
              <Ionicons name="diamond" size={13} color={PRO_BADGE_TEXT} />
            ) : (
              <Ionicons name="star" size={13} color={t.correctText} />
            )}
          </Animated.View>
        )}
        {displayCardLevel > 0 && (
          <LinearGradient
            colors={[cardVisual.accent, cardVisual.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
            alignSelf: 'center',
            marginBottom: 12,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: cardVisual.shadowColor,
            shadowOpacity: 0.32,
            shadowRadius: 10,
            elevation: 5,
          }}>
            <Ionicons name="sparkles" size={13} color="#111827" />
            <Text style={{ color: monoIcon(themeMode, '#111827', MONO_ICON.onLight), fontWeight: '900', fontSize: f.caption, letterSpacing: 0.4 }}>
              {profileCardLevelRoman(displayCardLevel)} · {lang === 'ru' ? PROFILE_CARD_LEVEL_NAME_RU[displayCardLevel] : cardDef.name}
            </Text>
          </LinearGradient>
        )}
        <View style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: 44 }} />
            <View style={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
              {/* Уровень III+ обещает «усиленную рамку аватара» — кольцо цвета уровня. */}
              <View style={displayCardLevel >= 3 ? { padding: 5, borderRadius: 999, backgroundColor: cardVisual.surface } : null}>
                <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={76} maskColor={prestigeActive ? cardVisual.gradient[1] : t.bgCard}>
                  <AvatarView
                    avatar={avatarStr}
                    totalXP={safeTotalXp}
                    size={76}
                    auraId={usesPremiumAura ? undefined : effectiveAuraId}
                  />
                </PremiumAvatarHalo>
              </View>
              {hasLeagueCrown && (
                <View style={{ marginTop: 10, maxWidth: '100%' }}>
                  <LeagueCrownName
                    text={player.name}
                    fontSize={f.h2}
                    iconScale={1.8}
                    count={displayLeagueCrownCount}
                  />
                </View>
              )}
              {!hasLeagueCrown && (
              <Text style={memberNameStatusStyle(
                { fontSize: f.h2, fontWeight: '700', color: t.textPrimary, marginTop: 10 },
                { isPremium: showPremium, isVip: showVip, themeMode },
              )}>
                {player.name}
              </Text>
              )}
              <Text style={{ color: t.gold, fontSize: f.label, fontWeight: '600', marginTop: 2 }}>
                {getTitleString(level, lang)}
              </Text>
            </View>
            <View style={{ width: PROFILE_HEADER_ACTION_SIZE }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          {[
            {
              key: 'xp',
              value: compactXp,
              label: triLang(lang as Lang, {
                ru: 'опыт',
                uk: 'досвід',
                es: 'experiencia',
                'pt-BR': "experiência",
                vi: "kinh nghiệm",
                id: "pengalaman",
                tr: "deneyim",
                pl: "doświadczenie",
              }),
              color: t.gold,
            },
            {
              key: 'level',
              value: `Lv.${level}`,
              label: triLang(lang as Lang, {
                ru: 'уровень',
                uk: 'рівень',
                es: 'nivel',
                'pt-BR': "nível",
                vi: "cấp độ",
                id: "level",
                tr: "seviye",
                pl: "poziom",
              }),
              color: t.textPrimary,
            },
            {
              key: 'streak',
              value: String(streak ?? 0),
              label: profileChainLabel,
              color: t.textPrimary,
            },
          ].map((metric) => (
            <View key={metric.key} style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
              <View style={[{
                width: '100%',
                minHeight: 46,
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }, prestigeSurfaceStyle]}>
                {compassProfileSurface && <CompassDepthSurface radius={12} quiet />}
                <Text
                  style={{ color: metric.color, fontSize: f.numMd, fontWeight: '800', width: '100%', textAlign: 'center' }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.62}
                  maxFontSizeMultiplier={1}
                >
                  {metric.value}
                </Text>
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', marginTop: 6 }} numberOfLines={1}>
                {metric.label}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          testID="player-profile-activity-like"
          onPress={() => {
            // Tap just works: like / unlike toggles silently, the counter updates. No hint copy.
            if (canLike) handleToggleLike();
          }}
          disabled={!canLike || likeBusy}
          accessibilityRole="button"
          accessibilityState={{ selected: likedThisProfile, disabled: !canLike || likeBusy }}
          accessibilityLabel={triLang(lang as Lang, {
            ru: 'Лайки за активность',
            uk: 'Лайки за активність',
            es: 'Likes de actividad',
            'pt-BR': "Curtidas de atividade",
            vi: "Lượt thích hoạt động",
            id: "Like aktivitas",
            tr: "Aktivite beğenileri",
            pl: "Polubienia aktywności",
          })}
          style={({ pressed }) => [{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            opacity: likeBusy ? 0.6 : pressed && canLike ? 0.85 : 1,
          }, prestigeSurfaceStyle]}
        >
          {compassProfileSurface && <CompassDepthSurface radius={14} quiet />}
          <View style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,45,85,0.16)',
          }}>
            <Ionicons
              name={likedThisProfile ? 'heart' : 'heart-outline'}
              size={19}
              color={monoIcon(themeMode, '#FF2D55')}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>
              {activityLikeTotal.toLocaleString()}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }} numberOfLines={1}>
              {triLang(lang as Lang, {
                ru: 'лайки за активность',
                uk: 'лайки за активність',
                es: 'likes de actividad',
                'pt-BR': "curtidas de atividade",
                vi: "lượt thích hoạt động",
                id: "like aktivitas",
                tr: "aktivite beğenisi",
                pl: "polubień aktywności",
              })}
            </Text>
          </View>
        </Pressable>
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 }, prestigeSurfaceStyle]}>
          {compassProfileSurface && <CompassDepthSurface radius={14} quiet />}
          {club.imageUri
            ? <Image source={club.imageUri} style={{ width: 32, height: 32, borderRadius: 6 }} contentFit="contain" accessibilityLabel="Иконка лиги" />
            : <Ionicons name={club.ionIcon as any} size={28} color={monoIcon(themeMode, club.color)} />
          }
          <View>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
              {clubTierShortName(club, lang as Lang)}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub }}>
              {triLang(lang as Lang, {
                ru: 'текущая лига',
                uk: 'поточна ліга',
                es: 'Liga actual',
                'pt-BR': "Liga atual",
                vi: "Giải đấu hiện tại",
                id: "Liga saat ini",
                tr: "Mevcut lig",
                pl: "Obecna liga",
              })}
            </Text>
          </View>
        </View>
        {/* Блоки, открываемые уровнями карточки: II «Выучено», III «Арена», IV «Путь», V «Легенда». */}
        {displayCardLevel >= 2 && cardStats && (cardStats.wordsLearned !== null || cardStats.phrasesLearned !== null) && (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 }, prestigeSurfaceStyle]}>
            <Ionicons name="book" size={26} color={monoIcon(themeMode, cardVisual.accent)} />
            <View>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {(cardStats.wordsLearned ?? 0).toLocaleString()} · {(cardStats.phrasesLearned ?? 0).toLocaleString()}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {triLang(lang as Lang, {
                  ru: 'выучено: слова · фразы',
                  uk: 'вивчено: слова · фрази',
                  es: 'aprendido: palabras · frases',
                  'pt-BR': 'aprendido: palavras · frases',
                  vi: 'đã học: từ · cụm từ',
                  id: 'dipelajari: kata · frasa',
                  tr: 'öğrenilen: kelime · kalıp',
                  pl: 'nauczone: słowa · frazy',
                })}
              </Text>
            </View>
          </View>
        )}
        {displayCardLevel >= 3 && cardStats && cardStats.arenaWins !== null && (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 }, prestigeSurfaceStyle]}>
            <Ionicons name="podium" size={26} color={monoIcon(themeMode, cardVisual.accent)} />
            <View>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {cardStats.arenaWins.toLocaleString()} · {
                  cardStats.arenaMatches && cardStats.arenaMatches > 0
                    ? `${Math.round((cardStats.arenaWins / cardStats.arenaMatches) * 100)}%`
                    : '—'
                }
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {triLang(lang as Lang, {
                  ru: 'арена: победы · винрейт',
                  uk: 'арена: перемоги · вінрейт',
                  es: 'arena: victorias · % de victorias',
                  'pt-BR': 'arena: vitórias · % de vitórias',
                  vi: 'đấu trường: thắng · tỷ lệ thắng',
                  id: 'arena: menang · rasio menang',
                  tr: 'arena: galibiyet · kazanma %',
                  pl: 'arena: wygrane · % wygranych',
                })}
              </Text>
            </View>
          </View>
        )}
        {displayCardLevel >= 4 && cardStats && cardStats.appDays !== null && (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 }, prestigeSurfaceStyle]}>
            <Ionicons name="compass" size={26} color={monoIcon(themeMode, cardVisual.accent)} />
            <View>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {cardStats.appDays.toLocaleString()} · 🔥{(cardStats.longestStreak ?? 0).toLocaleString()}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {triLang(lang as Lang, {
                  ru: 'дней в Phraseman · рекордная серия',
                  uk: 'днів у Phraseman · рекордна серія',
                  es: 'días en Phraseman · racha récord',
                  'pt-BR': 'dias no Phraseman · sequência recorde',
                  vi: 'ngày dùng Phraseman · chuỗi kỷ lục',
                  id: 'hari di Phraseman · rentetan rekor',
                  tr: 'Phraseman günleri · rekor seri',
                  pl: 'dni w Phraseman · rekordowa seria',
                })}
              </Text>
            </View>
          </View>
        )}
        {displayCardLevel >= 5 && (
          <View style={[
            { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 },
            prestigeSurfaceStyle,
            { backgroundColor: cardVisual.accentSoft },
          ]}>
            <Text style={{ fontSize: f.numLg }}>👑</Text>
            <View>
              <Text style={{ color: cardVisual.secondary, fontSize: f.body, fontWeight: '900' }}>
                {cardStats?.legendNo
                  ? triLang(lang as Lang, {
                      ru: `Легенда №${cardStats.legendNo}`,
                      uk: `Легенда №${cardStats.legendNo}`,
                      es: `Leyenda #${cardStats.legendNo}`,
                      'pt-BR': `Lenda #${cardStats.legendNo}`,
                      vi: `Huyền thoại #${cardStats.legendNo}`,
                      id: `Legenda #${cardStats.legendNo}`,
                      tr: `Efsane #${cardStats.legendNo}`,
                      pl: `Legenda #${cardStats.legendNo}`,
                    })
                  : triLang(lang as Lang, {
                      ru: 'Легенда',
                      uk: 'Легенда',
                      es: 'Leyenda',
                      'pt-BR': 'Lenda',
                      vi: 'Huyền thoại',
                      id: 'Legenda',
                      tr: 'Efsane',
                      pl: 'Legenda',
                    })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {triLang(lang as Lang, {
                  ru: 'высший уровень карточки',
                  uk: 'найвищий рівень картки',
                  es: 'nivel máximo de la tarjeta',
                  'pt-BR': 'nível máximo do cartão',
                  vi: 'cấp thẻ cao nhất',
                  id: 'level kartu tertinggi',
                  tr: 'en yüksek kart seviyesi',
                  pl: 'najwyższy poziom karty',
                })}
              </Text>
            </View>
          </View>
        )}
        {isMe && multipliers && (
          <View style={[{ borderRadius: 14, padding: 14, marginBottom: 10 }, prestigeSurfaceStyle]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang as Lang, {
                  ru: 'Модификаторы XP',
                  uk: 'Модифікатори XP',
                  es: 'Modificadores de XP',
                  'pt-BR': "Modificadores de XP",
                  vi: "Bộ điều chỉnh XP",
                  id: "Pengubah XP",
                  tr: "XP değiştiricileri",
                  pl: "Modyfikatory XP",
                })}
              </Text>
              <View style={{ backgroundColor: multipliers.total > 1 ? t.correct : t.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: multipliers.total > 1 ? t.correctText : t.textMuted, fontWeight: '800', fontSize: f.label }}>
                  ×{multipliers.total.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {multipliers.clubM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13 }}>🏛️</Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {triLang(lang as Lang, {
                      ru: 'Лига',
                      uk: 'Ліга',
                      es: 'Liga',
                      'pt-BR': "Liga",
                      vi: "Giải đấu",
                      id: "Liga",
                      tr: "Lig",
                      pl: "Liga",
                    })} ×{multipliers.clubM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.streakM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13 }}>🔥</Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {triLang(lang as Lang, {
                      ru: 'Цепочка',
                      uk: 'Стрік',
                      es: 'Racha',
                      'pt-BR': "Sequência",
                      vi: "Chuỗi",
                      id: "Rangkaian",
                      tr: "Seri",
                      pl: "Seria",
                    })} ×{multipliers.streakM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.comebackM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13 }}>⚡</Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {triLang(lang as Lang, {
                      ru: 'Камбэк',
                      uk: 'Повернення',
                      es: 'Vuelta',
                      'pt-BR': "Retorno",
                      vi: "Quay lại",
                      id: "Kembali",
                      tr: "Dönüş",
                      pl: "Powrót",
                    })} ×{multipliers.comebackM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.leagueBoostM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13 }}>XP</Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {triLang(lang as Lang, {
                      ru: 'Буст лиги',
                      uk: 'Буст ліги',
                      es: 'Impulso de liga',
                      'pt-BR': "Impulso de liga",
                      vi: "Tăng lực giải đấu",
                      id: "Dorongan liga",
                      tr: "Lig güçlendirmesi",
                      pl: "Wzmocnienie ligi",
                    })} ×{multipliers.leagueBoostM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.leagueGroupBoostM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13 }}>XP</Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {triLang(lang as Lang, {
                      ru: 'Общий буст лиги',
                      uk: 'Спільний буст ліги',
                      es: 'Impulso común de liga',
                      'pt-BR': "Impulso comum de liga",
                      vi: "Tăng lực chung giải đấu",
                      id: "Dorongan liga bersama",
                      tr: "Ortak lig güçlendirmesi",
                      pl: "Wspólne wzmocnienie ligi",
                    })} ×{multipliers.leagueGroupBoostM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.giftM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13 }}>🎁</Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {triLang(lang as Lang, {
                      ru: 'Подарок',
                      uk: 'Подарунок',
                      es: 'Regalo',
                      'pt-BR': "Presente",
                      vi: "Quà tặng",
                      id: "Hadiah",
                      tr: "Hediye",
                      pl: "Prezent",
                    })} ×{multipliers.giftM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.total === 1 && (
                <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                  {triLang(lang as Lang, {
                    ru: 'Нет активных бонусов',
                    uk: 'Немає активних бонусів',
                    es: 'No hay bonificaciones activas',
                    'pt-BR': "Não há bonificações ativas",
                    vi: "Không có thưởng đang hoạt động",
                    id: "Tidak ada bonus aktif",
                    tr: "Aktif bonus yok",
                    pl: "Brak aktywnych bonusów",
                  })}
                </Text>
              )}
            </View>
          </View>
        )}
        {duelRank && (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 }, prestigeSurfaceStyle]}>
            <Text style={{ fontSize: f.numLg }}>{RANK_TIER_EMOJIS[duelRank.tier] ?? '⚔️'}</Text>
            <View>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {arenaTierLabel(duelRank.tier as RankTier, lang as Lang)} {duelRank.level} · {duelRank.xp} XP
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {triLang(lang as Lang, {
                  ru: 'Ранг арены',
                  uk: 'Ранг арени',
                  es: 'Rango en la arena',
                  'pt-BR': "Rank na Arena",
                  vi: "Hạng Đấu trường",
                  id: "Peringkat arena",
                  tr: "Arena rütbesi",
                  pl: "Ranking na Arenie",
                })}
              </Text>
            </View>
          </View>
        )}
        {seasonBadge && (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 }, prestigeSurfaceStyle]}>
            <Text style={{ fontSize: f.numLg }}>
              {seasonBadge.tier === 'champion' ? '🏆' : seasonBadge.tier === 'top10' ? '🥇' : '⭐'}
            </Text>
            <View>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang as Lang, {
                  ru: seasonBadge.tier === 'champion' ? 'Чемпион сезона' : seasonBadge.tier === 'top10' ? 'Топ-10 сезона' : 'Топ-100 сезона',
                  uk: seasonBadge.tier === 'champion' ? 'Чемпіон сезону' : seasonBadge.tier === 'top10' ? 'Топ-10 сезону' : 'Топ-100 сезону',
                  es: seasonBadge.tier === 'champion' ? 'Campeón de temporada' : seasonBadge.tier === 'top10' ? 'Top 10 de temporada' : 'Top 100 de temporada',
                  'pt-BR': seasonBadge.tier === 'champion' ? 'Campeão da temporada' : seasonBadge.tier === 'top10' ? 'Top 10 da temporada' : 'Top 100 da temporada',
                  vi: seasonBadge.tier === 'champion' ? 'Quán quân mùa' : seasonBadge.tier === 'top10' ? 'Top 10 mùa' : 'Top 100 mùa',
                  id: seasonBadge.tier === 'champion' ? 'Juara musim' : seasonBadge.tier === 'top10' ? 'Top 10 musim' : 'Top 100 musim',
                  tr: seasonBadge.tier === 'champion' ? 'Sezon şampiyonu' : seasonBadge.tier === 'top10' ? 'Sezon ilk 10' : 'Sezon ilk 100',
                  pl: seasonBadge.tier === 'champion' ? 'Mistrz sezonu' : seasonBadge.tier === 'top10' ? 'Top 10 sezonu' : 'Top 100 sezonu',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>{seasonBadge.seasonId}</Text>
            </View>
          </View>
        )}
        </ScrollView>
        {isMe && previewLevel !== null && (
          // Панель превью: карточка выше уже преобразилась в выбранный уровень —
          // здесь имя уровня, выход из превью и покупка СЛЕДУЮЩЕГО уровня.
          // Плавающая скруглённая панель без обводок — часть модала, а не «приклейка».
          // Выезжает снизу (previewPanelAnim).
          <Animated.View style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: Math.max(12, bottomInset + 8),
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 12,
            borderRadius: 20,
            backgroundColor: 'rgba(4,9,6,0.94)',
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
            opacity: previewPanelAnim,
            transform: [{ translateY: previewPanelAnim.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) }],
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: cardVisual.secondary, fontSize: f.caption, fontWeight: '900', letterSpacing: 0.4 }} numberOfLines={1}>
                {triLang(lang as Lang, {
                  ru: 'Превью',
                  uk: 'Превʼю',
                  es: 'Vista previa',
                  'pt-BR': 'Prévia',
                  vi: 'Xem trước',
                  id: 'Pratinjau',
                  tr: 'Önizleme',
                  pl: 'Podgląd',
                })} · {profileCardLevelRoman(displayCardLevel)} {lang === 'ru' ? PROFILE_CARD_LEVEL_NAME_RU[displayCardLevel] : cardDef.name}
              </Text>
              <TouchableOpacity
                testID="player-profile-preview-exit"
                accessibilityRole="button"
                onPress={handleExitPreview}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="close" size={18} color={t.textMuted} />
              </TouchableOpacity>
            </View>
            {previewLevel === nextRealLevel ? (
              <TouchableOpacity
                testID="player-profile-preview-buy"
                disabled={upgradeBusy}
                onPress={handleBuyPreviewedLevel}
                activeOpacity={0.88}
                style={{ borderRadius: 14, paddingVertical: 13, alignItems: 'center', backgroundColor: '#FACC15', opacity: upgradeBusy ? 0.7 : 1, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              >
                <Text style={{ color: monoIcon(themeMode, '#1A1205', MONO_ICON.onLight), fontSize: f.bodyLg, fontWeight: '900' }}>
                  {triLang(lang as Lang, {
                    ru: `Улучшить · ${cardDef.cost}`,
                    uk: `Покращити · ${cardDef.cost}`,
                    es: `Mejorar · ${cardDef.cost}`,
                    'pt-BR': `Melhorar · ${cardDef.cost}`,
                    vi: `Nâng cấp · ${cardDef.cost}`,
                    id: `Tingkatkan · ${cardDef.cost}`,
                    tr: `Yükselt · ${cardDef.cost}`,
                    pl: `Ulepsz · ${cardDef.cost}`,
                  })}
                </Text>
                {upgradeBusy ? (
                  <ActivityIndicator size="small" color="#1A1205" />
                ) : (
                  <Ionicons name="diamond" size={16} color="#1A1205" />
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ borderRadius: 14, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)' }}>
                <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '800' }}>
                  {nextRealLevel !== null
                    ? triLang(lang as Lang, {
                        ru: `Сначала уровень ${profileCardLevelRoman(nextRealLevel)}`,
                        uk: `Спочатку рівень ${profileCardLevelRoman(nextRealLevel)}`,
                        es: `Primero el nivel ${profileCardLevelRoman(nextRealLevel)}`,
                        'pt-BR': `Primeiro o nível ${profileCardLevelRoman(nextRealLevel)}`,
                        vi: `Trước tiên cấp ${profileCardLevelRoman(nextRealLevel)}`,
                        id: `Level ${profileCardLevelRoman(nextRealLevel)} dulu`,
                        tr: `Önce seviye ${profileCardLevelRoman(nextRealLevel)}`,
                        pl: `Najpierw poziom ${profileCardLevelRoman(nextRealLevel)}`,
                      })
                    : ''}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
    <ThemedConfirmModal
      visible={removeFriendConfirmOpen}
      title={triLang(lang as Lang, {
        ru: 'Удалить друга?',
        uk: 'Видалити друга?',
        es: '¿Eliminar amigo?',
        'pt-BR': "Remover amigo?",
        vi: "Xóa bạn bè?",
        id: "Hapus teman?",
        tr: "Arkadaş silinsin mi?",
        pl: "Usunąć znajomego?",
      })}
      message={player.name}
      cancelLabel={triLang(lang as Lang, {
        ru: 'Отмена',
        uk: 'Скасувати',
        es: 'Cancelar',
        'pt-BR': "Cancelar",
        vi: "Hủy",
        id: "Batal",
        tr: "İptal",
        pl: "Anuluj",
      })}
      confirmLabel={triLang(lang as Lang, {
        ru: 'Удалить',
        uk: 'Видалити',
        es: 'Eliminar',
        'pt-BR': "Remover",
        vi: "Xóa",
        id: "Hapus",
        tr: "Sil",
        pl: "Usuń",
      })}
      confirmVariant="default"
      onCancel={() => setRemoveFriendConfirmOpen(false)}
      onConfirm={handleRemoveFriendConfirm}
    />
    </>
  );
}

function PlayerProfileModal({ player, myInfo, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const [duelRank, setDuelRank] = useState<{ tier: string; level: string; xp: number } | null>(null);
  const [seasonBadge, setSeasonBadge] = useState<{ seasonId: string; tier: 'champion' | 'top10' | 'top100' } | null>(null);
  const [multipliers, setMultipliers] = useState<MultiplierBreakdown | null>(null);
  const [resolvedTotalXp, setResolvedTotalXp] = useState<number | null>(null);
  const [friendToast, setFriendToast] = useState<string | null>(null);
  const [friendToastType, setFriendToastType] = useState<'error' | 'info'>('info');

  // Только `player` с родителя — никакого «снимка» после onClose. Иначе на Android
  // прозрачный Modal с visible=true оставался невидимым перехватчиком касаний.
  const modalOpen = !!player;

  // Gold shimmer — пока открыт профиль
  useEffect(() => {
    if (!player) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [player, shimmerAnim]);

  // Сброс при полном закрытии
  useEffect(() => {
    if (player) return;
    slideAnim.setValue(500);
    fadeAnim.setValue(0);
    setDuelRank(null);
    setSeasonBadge(null);
    setMultipliers(null);
    setResolvedTotalXp(null);
    setFriendToast(null);
  }, [player, slideAnim, fadeAnim]);

  const showFriendRequestToast = useCallback((message: string, toastType: 'error' | 'info' = 'info') => {
    setFriendToastType(toastType);
    setFriendToast(message);
  }, []);

  // Открытие: анимация; данные — после interactions.
  useEffect(() => {
    if (!player) return;

    setDuelRank(null);
    setSeasonBadge(null);
    setMultipliers(null);
    const initialTotalXp = Number.isFinite(Number(player.totalXp))
      ? Math.max(0, Math.floor(Number(player.totalXp)))
      : Number.isFinite(Number(player.points))
        ? Math.max(0, Math.floor(Number(player.points)))
        : null;
    setResolvedTotalXp(initialTotalXp);

    slideAnim.stopAnimation();
    fadeAnim.stopAnimation();
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    let cancelled = false;
    const task: { cancel: () => void } = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      if (player.isMe) {
        getCurrentMultiplierBreakdown().then((m) => { if (!cancelled) setMultipliers(m); }).catch(() => {});
      }
      if (player.uid) {
        const lbDocIds = Array.from(new Set([player.friendUid, player.uid].filter(Boolean) as string[]));
        Promise.all([
          firestore().collection('arena_profiles').doc(player.uid).get(),
          Promise.all(lbDocIds.map((id) => firestore().collection('leaderboard').doc(id).get().catch(() => null))),
        ])
          .then(([arenaSnap, lbSnaps]) => {
            if (cancelled) return;
            let bestTotalXp = initialTotalXp;
            for (const lbSnap of lbSnaps) {
              if (lbSnap?.exists) {
                const lbData = lbSnap.data() as { points?: unknown };
                const lbTotal = Number(lbData?.points);
                if (Number.isFinite(lbTotal) && lbTotal >= 0) {
                  bestTotalXp = Math.max(bestTotalXp ?? 0, Math.floor(lbTotal));
                }
              }
            }
            if (arenaSnap.exists) {
              const d = arenaSnap.data() as {
                rank?: { tier: string; level: string };
                xp?: number;
                courseTotalXp?: number;
                courseProfileCardLevel?: number;
                stats?: { matchesPlayed?: number };
                multipliers?: unknown;
                seasonBadge?: { seasonId: string; tier: 'champion' | 'top10' | 'top100' } | null;
              };
              if (Number.isFinite(Number(d.courseTotalXp)) && Number(d.courseTotalXp) >= 0) {
                bestTotalXp = Math.max(bestTotalXp ?? 0, Math.floor(Number(d.courseTotalXp)));
              }
              const mp = d.stats?.matchesPlayed;
              const hasPlayedAtLeastOne =
                typeof mp === 'number'
                  ? mp >= 1
                  : (d.stats === undefined ? (d.xp ?? 0) > 0 : false);
              if (hasPlayedAtLeastOne && d?.rank) {
                setDuelRank({ tier: d.rank.tier, level: d.rank.level, xp: d.xp ?? 0 });
              }
              if (d?.seasonBadge?.seasonId) {
                setSeasonBadge(d.seasonBadge);
              }
              if (!player.isMe && d?.multipliers) {
                const norm = normalizeArenaMultipliersFirestore(d.multipliers);
                if (norm) setMultipliers(norm);
              }
            }
            if (bestTotalXp !== null) setResolvedTotalXp(bestTotalXp);
          })
          .catch(() => {});
      }
    });
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [player, fadeAnim, slideAnim]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const clearFriendToast = useCallback(() => {
    setFriendToast(null);
  }, []);

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      hardwareAccelerated
      statusBarTranslucent
    >
      {player && (
        <View style={styles.modalFill} pointerEvents="box-none">
          <PlayerProfileModalBody
            player={player}
            myInfo={myInfo}
            resolvedTotalXp={resolvedTotalXp}
            slideAnim={slideAnim}
            fadeAnim={fadeAnim}
            shimmerAnim={shimmerAnim}
            onBackdropPress={handleClose}
            onClose={handleClose}
            duelRank={duelRank}
            seasonBadge={seasonBadge}
            multipliers={multipliers}
            onFriendRequestToast={showFriendRequestToast}
          />
          <InGameToast
            message={friendToast}
            type={friendToastType}
            onHide={clearFriendToast}
          />
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFill: {
    flex: 1,
  },
});

export default memo(PlayerProfileModal);
