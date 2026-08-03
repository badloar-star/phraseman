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
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import AvatarView from './AvatarView';
import PremiumAvatarHalo from './PremiumAvatarHalo';
import LeagueCrownName from './LeagueCrownName';
import { memberNameStatusStyle } from './premiumMemberStyles';
import { getBestAvatarForLevel } from '../constants/avatars';
import { noAndroidOutline } from '../constants/androidGlow';
import { getLevelFromXP, isLightThemeMode } from '../constants/theme';
import { getTitleString } from '../constants/titles';
import { triLang, type Lang } from '../constants/i18n';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { pearlIconForTheme } from '../app/coin_icons';
import { CLUBS, clubTierShortName } from '../app/league_engine';
import { getCurrentMultiplierBreakdown, peekLastMultiplierBreakdown, MultiplierBreakdown } from '../app/xp_manager';
import SkeletonBlock from './SkeletonShimmer';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { getCardStreakShieldStatus, type CardStreakShieldStatus } from '../app/profile_card_streak_shield';
import { CLOUD_SYNC_ENABLED, ENABLE_PROFILE_CARD, IS_EXPO_GO } from '../app/config';
import { readLifetimeProfileStatsCache, loadLifetimeProfileStats } from '../app/lifetime_profile_stats';
import { syncToCloud } from '../app/cloud_sync';
import { deleteFriend, sendFriendRequest, subscribeToFriends } from '../app/firestore_friend_requests';
import { fetchFriendProfilesBatch } from '../app/friends_profiles_batch';
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
import SeasonProfileCardFrame from './SeasonProfileCardFrame';
import { fetchActiveLeagueCrowns } from '../app/services/league_chest_rewards';
import { PREMIUM_AVATAR_AURA_ID, getEffectiveAvatarAuraId } from '../constants/avatar_auras';
import { onAppEvent } from '../app/events';
import {
  loadSeasonCosmetics,
  peekSeasonCosmetics,
} from '../app/season_cosmetics';
import {
  resolveProfileCardDisplayLevel,
  resolveSeasonProfileFrameVisible,
  SEASON1_FRAME_ID,
} from '../app/season_cosmetics_model';
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
  /** Public status reward decorating the complete profile-card sheet. */
  seasonProfileFrameId?: string;
  /** DEV Settings only: visual level preview; never changes purchase/storage state. */
  devProfileCardLevelOverride?: number;
  /** DEV Settings only: compare the real card with/without the seasonal frame. */
  devSeasonProfileFrameEnabled?: boolean;
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

// Синяя «дорогая» палитра Pro-плашки (зеркало celebrationContent.ts → pro.main).
const PRO_BADGE_BLUE = '#38BDF8';

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
  glowBottom: string;
  glowTop: string;
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

const PROFILE_CARD_VISUALS = Object.fromEntries(
  (Object.keys(PROFILE_CARD_THEME_COLORS) as ProfileCardTheme[]).map((theme) => [theme, buildCardVisual(theme)]),
) as Record<ProfileCardTheme, Omit<ProfileCardVisual, 'theme' | 'motion'>>;

// ─── AURORA ─────────────────────────────────────────────────────────────────
// Утверждённый владельцем редизайн «стекло и глубина света»: полупрозрачные
// панели с тонкой светлой кромкой поверх тёмного градиента уровня, волосяные
// разделители и стеклянный хром (кнопки/пилюли) rgba(8,10,16,0.44).
const AURORA_GLASS = {
  panelBg: 'rgba(255,255,255,0.05)',
  panelBorder: 'rgba(255,255,255,0.075)',
  hairline: 'rgba(255,255,255,0.08)',
  chromeBg: 'rgba(8,10,16,0.44)',
  chromeBorder: 'rgba(255,255,255,0.13)',
  chipBg: 'rgba(255,255,255,0.055)',
  chipBorder: 'rgba(255,255,255,0.07)',
  inkSoft: '#C9CBD6',
} as const;

/**
 * Кольцо аватара (AURORA v2): СТАТИЧНАЯ полная окружность с градиентом акцента,
 * strokeWidth 2 — без dasharray-разрыва и без вращения. Анимированные ауры
 * рисует PremiumAvatarHalo; вращающееся кольцо с ними конфликтовало (фидбек
 * владельца 2026-07-19).
 */
function ProfileOrbitRing({ size, accent }: { size: number; accent: string }) {
  const strokeWidth = 2;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="profileOrbitStroke" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accent} />
            <Stop offset="0.5" stopColor={accent} stopOpacity={0.55} />
            <Stop offset="1" stopColor={accent} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#profileOrbitStroke)"
          strokeWidth={strokeWidth}
        />
      </Svg>
    </View>
  );
}

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
  multipliers,
  onFriendRequestToast,
}: BodyProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const { isPremium: myIsPremium, isVip: myIsVip } = usePremium();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const isMe = player.isMe;
  const devSeasonFrameOverride = __DEV__ ? player.devSeasonProfileFrameEnabled : undefined;
  const hasDevProfileCardLevelOverride = __DEV__ && player.devProfileCardLevelOverride !== undefined;
  const [friendRequestBusy, setFriendRequestBusy] = useState(false);
  const [friendUids, setFriendUids] = useState<Set<string>>(() => new Set());
  const [friendRequestSentUids, setFriendRequestSentUids] = useState<Set<string>>(() => new Set());
  const [removeFriendConfirmOpen, setRemoveFriendConfirmOpen] = useState(false);
  const [hasSeasonProfileFrame, setHasSeasonProfileFrame] = useState(
    () => resolveSeasonProfileFrameVisible({
      isMe,
      ownedFrameIds: peekSeasonCosmetics().frames,
      publicFrameId: player.seasonProfileFrameId,
      devOverride: devSeasonFrameOverride,
    }),
  );
  const [profileCardSnapshot, setProfileCardSnapshot] = useState<ProfileCardSnapshot>(() => normalizeProfileCardSnapshotForLevel(player));
  const [cardStats, setCardStats] = useState<ProfileCardStats | null>(null);
  // Фаза 3: статус карточного щита «Защита цепочки» (III+, только своя карточка).
  const [cardShieldStatus, setCardShieldStatus] = useState<CardStreakShieldStatus | null>(null);
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
  // зачем (2026-08-03): `points` у чужого игрока — витринное поле вызывающего
  // экрана (в лиге это НЕДЕЛЬНЫЕ очки, в лобби турнира — заглушка 0, пока не
  // долетел батч профилей). Считать его общим опытом нельзя: именно отсюда
  // бралась «0 опыта, Lv.1» на карточке живого игрока. Ноль как источник уровня
  // теперь не принимаем — берём только явно положительное значение, иначе ждём
  // настоящий totalXp (resolvedTotalXp/leaderboard) и показываем skeleton.
  const rawPoints = Math.floor(Number(player.points));
  const playerPoints = Number.isFinite(rawPoints) && rawPoints > 0 ? rawPoints : null;
  const playerTotalXp = Number.isFinite(Number(player.totalXp))
    ? Math.max(0, Math.floor(Number(player.totalXp)))
    : null;
  const totalXp = isMe ? myInfo.totalXP : (resolvedTotalXp ?? playerTotalXp ?? playerPoints ?? null);
  const safeTotalXp = totalXp ?? 0;
  const displayXp = isMe ? myInfo.totalXP : (totalXp ?? 0);
  const xp = displayXp;
  const level = getLevelFromXP(safeTotalXp);
  const streak = isMe ? (myInfo.streak ?? player.streak ?? null) : (player.streak ?? null);
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
    if (devSeasonFrameOverride !== undefined) {
      setHasSeasonProfileFrame(devSeasonFrameOverride);
      return undefined;
    }
    if (!isMe) {
      setHasSeasonProfileFrame(resolveSeasonProfileFrameVisible({
        isMe: false,
        ownedFrameIds: [],
        publicFrameId: player.seasonProfileFrameId,
      }));
      return undefined;
    }

    let cancelled = false;
    const refreshFromCache = () => {
      if (!cancelled) {
        setHasSeasonProfileFrame(peekSeasonCosmetics().frames.includes(SEASON1_FRAME_ID));
      }
    };
    const subscription = onAppEvent('season_cosmetics_changed', refreshFromCache);
    refreshFromCache();
    void loadSeasonCosmetics().then(refreshFromCache).catch(() => {});

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [devSeasonFrameOverride, isMe, player.seasonProfileFrameId]);

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
  const displayCardLevel = normalizeProfileCardLevel(resolveProfileCardDisplayLevel({
    realLevel: profileCardLevel,
    inCardPreviewLevel: isMe ? previewLevel : null,
    devOverride: __DEV__ ? player.devProfileCardLevelOverride : undefined,
  }));
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
  // AURORA-стекло: на тёмной престижной карточке — всегда; на светлой базовой
  // карточке стекло нечитаемо, поэтому используем непрозрачные токены темы.
  const auroraGlass = prestigeActive || !isLightThemeMode(themeMode);
  const glassPanel = auroraGlass ? AURORA_GLASS.panelBg : t.bgSurface;
  // зачем: panelBorder/chipBorder больше не используются — все кромки панелей и
  // чипов сняты по §0.D, разделение переведено на тон. Токены удалены, чтобы не
  // соблазняли вернуть рамку.
  const glassHairline = auroraGlass ? AURORA_GLASS.hairline : t.border;
  const glassChromeBg = auroraGlass ? AURORA_GLASS.chromeBg : t.bgSurface;
  const glassChipBg = auroraGlass ? AURORA_GLASS.chipBg : t.bgCard;
  const activeMultiplierColor = isLightThemeMode(themeMode) ? t.accent : '#35D07F';

  // зачем: владелец не терпит обводок контейнеров — разделяем тоном/тенью/фоном
  // (хендоф docs/cards-redesign §0.D, приоритет над рамками из HTML-макета).
  // Акцентная подложка уровня вместо цветной кромки: та же семантика уровня,
  // читается как материал, а не как рамка.
  const levelSurface = cardVisual.accentSoft;

  // зачем: A-54/A-55 — модалка не знала про «Уменьшение движения», вечный shimmer
  // крутился всегда. Теперь один флаг гейтит и цикл, и длительности входа.
  const reduceMotion = useReduceMotion();

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

  // Открытие уровневых блоков карточки: II «Выучено» и IV «Путь» собираются
  // ниже в ОДНУ glass-панель (iOS-список); V «Легенда» — отдельная строка.
  const showLearnedBlock =
    displayCardLevel >= 2 &&
    !!cardStats &&
    (cardStats.wordsLearned !== null || cardStats.phrasesLearned !== null);
  const showPathBlock = displayCardLevel >= 4 && !!cardStats && cardStats.appDays !== null;
  // Фаза 3: строка щита — только своя карточка уровня III+ (чужой статус не виден).
  const showShieldBlock = isMe && displayCardLevel >= 3;
  const showShieldRow = showShieldBlock && cardShieldStatus !== null;

  // Статус щита грузим как соседние cardStats: async, с отменой при размонтировании.
  useEffect(() => {
    let cancelled = false;
    if (isMe && displayCardLevel >= 3) {
      getCardStreakShieldStatus().then((s) => { if (!cancelled) setCardShieldStatus(s); }).catch(() => {});
    } else {
      setCardShieldStatus(null);
    }
    return () => { cancelled = true; };
  }, [isMe, displayCardLevel]);

  // Подпись статуса щита: активна / перезарядка · N дн / спасла сегодня.
  const cardShieldStatusText = cardShieldStatus === null
    ? ''
    : cardShieldStatus.usedToday
      ? triLang(lang as Lang, {
          ru: 'спасла сегодня',
          uk: 'врятувала сьогодні',
          es: 'te salvó hoy',
          'pt-BR': 'salvou hoje',
          vi: 'đã cứu hôm nay',
          id: 'menyelamatkan hari ini',
          tr: 'bugün kurtardı',
          pl: 'uratowała dziś',
        })
      : cardShieldStatus.eligible
        ? triLang(lang as Lang, {
            ru: 'активна',
            uk: 'активна',
            es: 'activa',
            'pt-BR': 'ativa',
            vi: 'đang hoạt động',
            id: 'aktif',
            tr: 'aktif',
            pl: 'aktywna',
          })
        : triLang(lang as Lang, {
            ru: `перезарядка · ${cardShieldStatus.cooldownDaysLeft} дн`,
            uk: `перезарядка · ${cardShieldStatus.cooldownDaysLeft} дн`,
            es: `recarga · ${cardShieldStatus.cooldownDaysLeft} d`,
            'pt-BR': `recarga · ${cardShieldStatus.cooldownDaysLeft} d`,
            vi: `nạp lại · ${cardShieldStatus.cooldownDaysLeft} ngày`,
            id: `isi ulang · ${cardShieldStatus.cooldownDaysLeft} hari`,
            tr: `yeniden dolum · ${cardShieldStatus.cooldownDaysLeft} gün`,
            pl: `odnowienie · ${cardShieldStatus.cooldownDaysLeft} dni`,
          });

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
    const needsRemoteFrame = !isMe
      && devSeasonFrameOverride === undefined
      && player.seasonProfileFrameId === undefined;
    const needsRemoteStats = !isMe && profileCardLevel >= 2;
    if (!isMe && !needsRemoteStats && !needsRemoteFrame) {
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
      let statsApplied = false;
      for (const id of publicIds) {
        try {
          const snap = await firestore().collection('public_profiles').doc(id).get();
          if (cancelled) return;
          if (!snap.exists) continue;
          const d = (snap.data() ?? {}) as Record<string, unknown>;
          if (needsRemoteStats && !statsApplied) {
            statsApplied = true;
            setCardStats({
              wordsLearned: readPublicCardStatNumber(d.cardWordsLearned),
              phrasesLearned: readPublicCardStatNumber(d.cardPhrasesLearned),
              appDays: readPublicCardStatNumber(d.cardAppDays),
              longestStreak: readPublicCardStatNumber(d.cardLongestStreak),
              legendNo: readPublicCardStatNumber(d.profileCardLegendNo),
            });
          }
          if (!needsRemoteFrame) return;
          const publicFrameId = typeof d.seasonProfileFrameId === 'string'
            ? d.seasonProfileFrameId
            : '';
          if (publicFrameId === SEASON1_FRAME_ID) {
            setHasSeasonProfileFrame(true);
            return;
          }
        } catch { /* пробуем следующий id */ }
      }
      if (!cancelled && needsRemoteFrame) setHasSeasonProfileFrame(false);
    })();
    return () => { cancelled = true; };
  }, [devSeasonFrameOverride, isMe, player.friendUid, player.seasonProfileFrameId, player.uid, profileCardLevel]);

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
      toValue: isMe && !hasDevProfileCardLevelOverride && previewLevel !== null ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [hasDevProfileCardLevelOverride, isMe, previewLevel, previewPanelAnim]);

  // Тап по круглой кнопке: карточка ПРЯМО ЗДЕСЬ преображается в следующий уровень
  // (никакого отдельного экрана). Повторные тапы листают уровни дальше до V,
  // после V — возврат к настоящей карточке.
  const handleUpgradeButtonTap = useCallback(() => {
    if (hasDevProfileCardLevelOverride) return;
    hapticTap();
    setPreviewLevel((prev) => (prev === null ? getNextProfileCardLevel(profileCardLevel) : getNextProfileCardLevel(prev)));
  }, [hasDevProfileCardLevelOverride, profileCardLevel]);

  const handleExitPreview = useCallback(() => {
    hapticTap();
    setPreviewLevel(null);
  }, []);

  const handleBuyPreviewedLevel = useCallback(async () => {
    if (hasDevProfileCardLevelOverride || upgradeBusy || previewLevel === null || nextRealLevel === null || previewLevel !== nextRealLevel) return;
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
        if (result.legendNo) {
          // Фаза 4: «праздник легенды» — отдельный праздничный тост следом за тостом апгрейда.
          const legendNo = result.legendNo;
          setTimeout(() => {
            onFriendRequestToast(triLang(lang as Lang, {
              ru: `🎉 Ты стал Легендой № ${legendNo}! Друзья получили +5 💠`,
              uk: `🎉 Ти став Легендою № ${legendNo}! Друзі отримали +5 💠`,
              es: `🎉 ¡Te convertiste en Leyenda n.º ${legendNo}! Tus amigos recibieron +5 💠`,
              'pt-BR': `🎉 Você virou Lenda n.º ${legendNo}! Seus amigos receberam +5 💠`,
              vi: `🎉 Bạn đã trở thành Huyền thoại số ${legendNo}! Bạn bè nhận được +5 💠`,
              id: `🎉 Kamu menjadi Legenda № ${legendNo}! Temanmu menerima +5 💠`,
              tr: `🎉 Efsane № ${legendNo} oldun! Arkadaşların +5 💠 kazandı`,
              pl: `🎉 Zostałeś Legendą № ${legendNo}! Znajomi otrzymali +5 💠`,
            }), 'info');
          }, 1400);
        }
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
  }, [hasDevProfileCardLevelOverride, lang, nextRealLevel, onClose, onFriendRequestToast, previewLevel, router, upgradeBusy]);

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
  // зачем (2026-08-03): опыт чужого игрока может быть ещё не известен (батч
  // профилей/leaderboard в полёте). Печатать в этом случае «0» и «Lv.1» —
  // враньё: владелец видел живого игрока с нулями. Показываем skeleton той же
  // геометрии (первый кадр = финальный, layout не прыгает), а как только
  // приходит настоящее число — плитки заполняются.
  // зачем (2026-08-03): skeleton был ВЕЧНЫМ. У новичка (турнирное лобби, Lv.1)
  // опыт честно равен нулю: сервер отдаёт профиль с totalXp: 0 либо null, а
  // клиент считал такой ответ «не знаю» и ждал число, которое никогда не
  // придёт. Теперь ожидание конечно: как только сеть отработала
  // (xpResolutionSettled), показываем настоящий 0 и Lv.1 вместо пульсации.
  const xpUnknown = !isMe && totalXp === null && !xpResolutionSettled;
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
        backgroundColor: t.bgCard,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: '90%',
        overflow: 'hidden',
        transform: [
          { translateY: slideAnim },
          { scale: levelSwitchAnim.interpolate({ inputRange: [0, 1], outputRange: [0.982, 1] }) },
        ],
        // Без обводок (правило владельца): модал держат скругление, градиент и тень.
        borderTopWidth: prestigeActive ? 0 : 0.5,
        borderColor: t.border,
        shadowColor: prestigeActive ? cardVisual.shadowColor : '#000',
        shadowOpacity: prestigeActive ? 0.34 : 0.18,
        shadowRadius: prestigeActive ? 22 : 12,
        elevation: prestigeActive ? 12 : 6,
      }}>
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
            borderRadius: PROFILE_HEADER_ACTION_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            // зачем: §0.D — та же логика, что у кнопки друга: тон + мягкая
            // тень вместо кромки; кнопка лежит поверх артворка карточки.
            backgroundColor: glassChromeBg,
            overflow: 'visible',
            shadowColor: '#000',
            shadowOpacity: 0.32,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 5,
          }}
        >
          <Ionicons name="close" size={22} color={prestigeActive ? 'rgba(255,255,255,0.82)' : t.textPrimary} />
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
              borderRadius: PROFILE_HEADER_ACTION_SIZE / 2,
              // зачем: §0.D — кнопка лежит поверх артворка карточки, поэтому
              // кромку заменяем более плотной заливкой + мягкой тенью ниже:
              // отделение то же, «нарисованной» линии нет.
              backgroundColor: isAlreadyFriend ? 'rgba(240,84,84,0.30)' : glassChromeBg,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
              shadowColor: '#000',
              shadowOpacity: 0.32,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
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
            <Ionicons
              name={isAlreadyFriend ? 'person-remove-outline' : isFriendRequestSent ? 'checkmark-circle-outline' : 'person-add-outline'}
              size={22}
              color={isAlreadyFriend ? (t.wrong ?? t.accent) : t.accent}
            />
          </Pressable>
        ) : null}
        {isMe && !hasDevProfileCardLevelOverride && ENABLE_PROFILE_CARD && nextRealLevel !== null ? (
          // Круглая кнопка апгрейда на СВОЕЙ карточке: тап преображает карточку в
          // превью следующего уровня ПРЯМО НА МЕСТЕ, повторные тапы листают до V.
          // AURORA: стеклянный круг, кромка и стрелка в акценте СЛЕДУЮЩЕГО уровня
          // + его свечение (в превью — римский номер уровня вместо стрелки).
          <Pressable
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
            style={{
              position: 'absolute',
              top: PROFILE_HEADER_ACTION_TOP + PROFILE_HEADER_ACTION_SIZE + PROFILE_HEADER_ACTION_GAP,
              right: PROFILE_HEADER_ACTION_RIGHT,
              zIndex: 30,
              width: PROFILE_HEADER_ACTION_SIZE,
              height: PROFILE_HEADER_ACTION_SIZE,
              borderRadius: PROFILE_HEADER_ACTION_SIZE / 2,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              // зачем: §0.D — вместо цветной кромки уровня даём тонированную
              // подложку следующего уровня; свечение ниже и так несёт его цвет.
              backgroundColor: nextLevelVisual.accentSoft,
              shadowColor: nextLevelVisual.shadowColor,
              shadowOpacity: 0.55,
              shadowRadius: 9,
              shadowOffset: { width: 0, height: 0 },
              elevation: 7,
            }}
          >
            <Animated.View style={{ opacity: shimmerOpacity }}>
              {previewLevel === null ? (
                <Ionicons name="arrow-up" size={22} color={nextLevelVisual.accent} />
              ) : (
                <Text style={{ color: nextLevelVisual.accent, fontSize: 15, fontWeight: '900' }}>
                  {profileCardLevelRoman(previewLevel)}
                </Text>
              )}
            </Animated.View>
          </Pressable>
        ) : null}
        {displayCardLevel > 0 && (
          // AURORA: пилюля уровня переехала из центра в ЛЕВЫЙ ВЕРХНИЙ УГОЛ —
          // floating glass pill, кромка и текст в акценте отображаемого уровня.
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: PROFILE_HEADER_ACTION_TOP,
              left: PROFILE_HEADER_ACTION_RIGHT,
              zIndex: 30,
              maxWidth: '58%',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              // зачем: §0.D — пилюля уровня держится тоном акцента, не кромкой.
              backgroundColor: levelSurface,
              borderRadius: 999,
              paddingHorizontal: 11,
              paddingVertical: 6,
            }}
          >
            <Ionicons name="sparkles" size={12} color={cardVisual.accent} />
            <Text style={{ color: cardVisual.accent, fontWeight: '800', fontSize: f.caption, letterSpacing: 0.4, flexShrink: 1 }}>
              {profileCardLevelRoman(displayCardLevel)} · {lang === 'ru' ? PROFILE_CARD_LEVEL_NAME_RU[displayCardLevel] : cardDef.name}
            </Text>
          </View>
        )}
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
            {/* Свечение снизу+сверху и все эффекты уровня рисует единый движок —
                чтобы владелец и другие игроки видели ОДИН визуал. */}
            <ProfileCardMotionFx
              kind={fxKindForProfileCard(displaySnapshot.level, displaySnapshot.motion)}
              radius={30}
              accent={cardVisual.accent}
              secondary={cardVisual.secondary}
              accentSoft={cardVisual.accentSoft}
              glowBottom={cardVisual.glowBottom}
              glowTop={cardVisual.glowTop}
            />
          </Animated.View>
        )}
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: Math.max(96, bottomInset + 72) + (isMe && !hasDevProfileCardLevelOverride && previewLevel !== null ? 112 : 0) }}
        >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: prestigeActive ? cardVisual.accentStrong : t.border, alignSelf: 'center', marginBottom: 20 }} />
        <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 18 }}>
          <View style={{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            {displayCardLevel > 0 ? (
              <ProfileOrbitRing size={88} accent={cardVisual.accent} />
            ) : (
              // Уровень 0 — без кольца, простая тонкая кромка.
              <View pointerEvents="none" style={{ position: 'absolute', width: 78, height: 78, borderRadius: 39, borderWidth: 1, borderColor: auroraGlass ? 'rgba(255,255,255,0.14)' : t.border }} />
            )}
            {/* Уровень III+ — мягкое внешнее свечение кольца цветом уровня
                (бывшее «усиленное кольцо», переосмысленное под стекло). */}
            <View style={displayCardLevel >= 3 ? {
              borderRadius: 999,
              // зачем: КРУГЛЫЙ аватар без непрозрачного фона — Android рисовал
              // вокруг него квадрат вместо свечения. На iOS ореол как был.
              shadowColor: cardVisual.shadowColor,
              shadowOpacity: 0.55,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 0 },
              ...noAndroidOutline,
            } : null}>
              <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={76} maskColor={prestigeActive ? cardVisual.gradient[1] : t.bgCard}>
                <AvatarView
                  avatar={avatarStr}
                  totalXP={safeTotalXp}
                  size={76}
                  auraId={usesPremiumAura ? undefined : effectiveAuraId}
                />
              </PremiumAvatarHalo>
            </View>
            <View style={{
              position: 'absolute',
              bottom: -6,
              alignSelf: 'center',
              // зачем: §0.D — бейдж лежит поверх аватара, поэтому отделяем его
              // плотной подложкой + тенью вместо акцентной кромки.
              backgroundColor: auroraGlass ? 'rgba(8,10,16,0.88)' : t.bgCard,
              borderRadius: 999,
              paddingHorizontal: 9,
              paddingVertical: 2,
              shadowColor: '#000',
              shadowOpacity: auroraGlass ? 0.5 : 0.18,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              ...noAndroidOutline,
            }}>
              <Text style={{ color: cardVisual.accent, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7 }}>
                LV {level}
              </Text>
            </View>
          </View>
          {hasLeagueCrown && (
            <View style={{ maxWidth: '100%' }}>
              <LeagueCrownName
                text={player.name}
                fontSize={26}
                iconScale={1.8}
                count={displayLeagueCrownCount}
              />
            </View>
          )}
          {!hasLeagueCrown && (
          <Text style={memberNameStatusStyle(
            { fontSize: 26, fontWeight: '700', color: t.textPrimary },
            { isPremium: showPremium, isVip: showVip, themeMode },
          )}>
            {player.name}
          </Text>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 }}>
            {showPremium && (
              // Стеклянная пилюля подписки: PLUS — золотая с diamond, lifetime PRO —
              // синяя (pro=синий, как в PremiumCelebrationModal). Shimmer сохранён.
              <Animated.View style={{ opacity: shimmerOpacity }}>
                <LinearGradient
                  // зачем: §0.D — цветную кромку заменяет более глубокий
                  // градиент того же тона (0.18→0.28 сверху): пилюля читается
                  // как материал, а не как обведённый блок.
                  colors={showPro
                    ? ['rgba(56,189,248,0.28)', 'rgba(56,189,248,0.10)']
                    : ['rgba(245,200,66,0.28)', 'rgba(245,200,66,0.10)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    borderRadius: 999,
                    paddingHorizontal: 11,
                    paddingVertical: 5,
                  }}
                >
                  <Ionicons name="diamond" size={11} color={showPro ? PRO_BADGE_BLUE : '#F5C842'} />
                  <Text style={{ color: showPro ? PRO_BADGE_BLUE : '#F5C842', fontWeight: '800', fontSize: 11.5, letterSpacing: 1 }}>
                    {showPro ? 'PRO' : 'PLUS'}
                  </Text>
                </LinearGradient>
              </Animated.View>
            )}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 999,
              paddingHorizontal: 11,
              paddingVertical: 5,
              // зачем: §0.D — пилюля титула держится тоном; кромку заменяет
              // чуть более плотная подложка (0.06 → 0.10), разделение то же.
              backgroundColor: auroraGlass ? 'rgba(255,255,255,0.10)' : t.bgSurface,
            }}>
              <Text style={{ color: auroraGlass ? AURORA_GLASS.inkSoft : t.textSecond, fontSize: 11.5, fontWeight: '600' }}>
                {getTitleString(level, lang)}
              </Text>
            </View>
          </View>
        </View>
        {/* AURORA: три плитки статистики слиты в ОДНУ стеклянную капсулу
            с волосяными разделителями; значения/форматирование не менялись. */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'stretch',
          borderRadius: 16,
          // зачем: §0.D — капсула статистики держится тоном подложки, не кромкой.
          backgroundColor: glassPanel,
          paddingVertical: 12,
          marginBottom: 14,
        }}>
          {[
            {
              key: 'xp',
              value: xpUnknown ? null : compactXp,
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
              value: xpUnknown ? null : `Lv.${level}`,
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
              // Цепочку показываем только когда она реально известна: жёсткий
              // `?? 0` рисовал ноль и тем, у кого цепочка просто не пришла.
              value: streak === null ? (xpUnknown ? null : '0') : String(streak),
              label: profileChainLabel,
              color: t.textPrimary,
            },
          ].map((metric, idx) => (
            <View
              key={metric.key}
              style={{
                flex: 1,
                minWidth: 0,
                alignItems: 'center',
                paddingHorizontal: 6,
                // Волосяной разделитель между колонками — левая кромка колонки.
                borderLeftWidth: idx > 0 ? 1 : 0,
                borderColor: idx > 0 ? glassHairline : 'transparent',
                marginVertical: 3,
              }}
            >
              <View style={{ width: '100%' }}>
                {/* зачем: авто-ужатие шрифта убрано — запрещено правилом
                    владельца (класс бага: короткие значения на iOS сжимались
                    до нечитаемого кегля рядом с длинными). Значения тут
                    короткие — «12.3K», «Lv.42», «365», — поэтому фиксированный
                    кегль с tabular-nums: цифры одной ширины, три колонки не
                    пляшут. text-integrity: clip запрещён (усечение без следа) —
                    аномально длинное значение получит честное многоточие. */}
                {metric.value === null ? (
                  // Заглушка ровно под кегль 20/вес 800 — геометрия колонки та же,
                  // поэтому подстановка настоящей цифры не двигает лейаут.
                  <View style={{ height: 24, alignItems: 'center', justifyContent: 'center' }}>
                    <SkeletonBlock width={46} height={18} borderRadius={5} />
                  </View>
                ) : (
                  <Text
                    style={{
                      color: metric.color,
                      fontSize: 20,
                      fontWeight: '800',
                      width: '100%',
                      textAlign: 'center',
                      fontVariant: ['tabular-nums'],
                    }}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.1}
                  >
                    {metric.value}
                  </Text>
                )}
              </View>
              <Text
                style={{ color: t.textMuted, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 3 }}
                numberOfLines={1}
              >
                {metric.label}
              </Text>
            </View>
          ))}
        </View>
        {/* AURORA мета-ряд: компактная пилюля лайка (сердце + число, ширина по
            содержимому) + чип лиги на остаток ширины. Ряд — это кнопка лайка
            (вся логика: тап, оптимизм, дневной лимит, тосты — без изменений);
            чип лиги глушит responder, чтобы тап по нему не ставил лайк. */}
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
          style={({ pressed }) => ({
            flexDirection: 'row',
            gap: 10,
            marginBottom: 14,
            opacity: likeBusy ? 0.6 : pressed && canLike ? 0.85 : 1,
          })}
        >
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderRadius: 999,
            // зачем: §0.D — счётчик лайков держится тоном подложки.
            backgroundColor: glassPanel,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}>
            <Ionicons
              name={likedThisProfile ? 'heart' : 'heart-outline'}
              size={16}
              color={monoIcon(themeMode, '#FF2D55')}
            />
            <Text style={{ color: t.textPrimary, fontSize: 13.5, fontWeight: '800' }} numberOfLines={1}>
              {activityLikeTotal.toLocaleString()}
            </Text>
          </View>
          <View
            onStartShouldSetResponder={() => true}
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              borderRadius: 16,
              // зачем: §0.D — плашка лиги держится тоном подложки.
              backgroundColor: glassPanel,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            {club.imageUri
              ? <Image source={club.imageUri} style={{ width: 28, height: 28, borderRadius: 6 }} contentFit="contain" accessibilityLabel="Иконка лиги" />
              : <Ionicons name={club.ionIcon as any} size={26} color={monoIcon(themeMode, club.color)} />
            }
            <Text style={{ color: t.textPrimary, fontSize: 13.5, fontWeight: '700', flex: 1, minWidth: 0 }} numberOfLines={1}>
              {clubTierShortName(club, lang as Lang)}
            </Text>
          </View>
        </Pressable>
        {isMe && !multipliers && (
          // зачем: §5 Шаг 1 «состояния» + Performance Bible — модификаторы
          // грузятся после interactions, и панель раньше ВОЗНИКАЛА на пустом
          // месте, дёргая лэйаут. Скелетон держит ту же геометрию (высота
          // шапки 24 + gap 9 + ряд чипов 24 + паддинги 26 = 83), поэтому
          // первый кадр совпадает с финальным.
          <View style={{
            borderRadius: 16, backgroundColor: glassPanel,
            paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
              <SkeletonBlock width={118} height={11} borderRadius={4} />
              <SkeletonBlock width={54} height={19} borderRadius={6} />
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <SkeletonBlock width={92} height={24} borderRadius={8} />
              <SkeletonBlock width={78} height={24} borderRadius={8} />
            </View>
          </View>
        )}
        {isMe && multipliers && (
          // AURORA: одна glass-панель — шапка (подпись капсом + крупный итог,
          // зелёный #35D07F когда бонус активен) и wrap-чипы модификаторов под ней.
          // зачем: §0.D — панель держится тоном подложки, кромка снята.
          <View style={{
            borderRadius: 16, backgroundColor: glassPanel,
            paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
              <Text style={{ color: t.textMuted, fontSize: 10.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
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
              <Text style={{ color: multipliers.total > 1 ? activeMultiplierColor : t.textMuted, fontWeight: '800', fontSize: 19 }}>
                ×{multipliers.total.toFixed(2)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {multipliers.clubM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: glassChipBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 13 }}>🏛️</Text>
                  <Text style={{ color: t.textSecond, fontSize: 11 }}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: glassChipBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 13 }}>🔥</Text>
                  <Text style={{ color: t.textSecond, fontSize: 11 }}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: glassChipBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 13 }}>⚡</Text>
                  <Text style={{ color: t.textSecond, fontSize: 11 }}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: glassChipBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 13 }}>XP</Text>
                  <Text style={{ color: t.textSecond, fontSize: 11 }}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: glassChipBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 13 }}>XP</Text>
                  <Text style={{ color: t.textSecond, fontSize: 11 }}>
                    {triLang(lang as Lang, {
                      ru: 'Общий буст лиги',
                      uk: 'Спільний буст ліги',
                      es: 'Impulso común de liga',
                      'pt-BR': "Impulso común de liga",
                      vi: "Tăng lực chung giải đấu",
                      id: "Dorongan liga bersama",
                      tr: "Ortak lig güçlendirmesi",
                      pl: "Wspólne wzmocnienie ligi",
                    })} ×{multipliers.leagueGroupBoostM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.giftM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: glassChipBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 13 }}>🎁</Text>
                  <Text style={{ color: t.textSecond, fontSize: 11 }}>
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
              {multipliers.cardM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: glassChipBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 13 }}>✦</Text>
                  <Text style={{ color: t.textSecond, fontSize: 11 }}>
                    {triLang(lang as Lang, {
                      ru: 'Карточка',
                      uk: 'Картка',
                      es: 'Tarjeta',
                      'pt-BR': "Cartão",
                      vi: "Thẻ",
                      id: "Kartu",
                      tr: "Kart",
                      pl: 'Karta',
                    })} ×{multipliers.cardM.toFixed(2)}
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
        {/* Разблокировки уровней II «Выучено», III «Защита цепочки» (только себе)
            и IV «Путь» — ОДНА glass-панель: строки разделены волосяной линией,
            как iOS-список; если открыт только один блок — панель с одной строкой.
            V «Легенда» — отдельная строка. */}
        {(showLearnedBlock || showShieldBlock || showPathBlock) && (
          <View style={{
            // зачем: §0.D — панель бонусов держится тоном подложки, не кромкой.
            borderRadius: 16, backgroundColor: glassPanel,
            marginBottom: 14,
          }}>
            {showLearnedBlock && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 11 }}>
                <View style={{
                  width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: cardVisual.accentSoft,
                  shadowColor: cardVisual.shadowColor, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, ...noAndroidOutline,
                }}>
                  <Ionicons name="book" size={16} color={monoIcon(themeMode, cardVisual.accent)} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>
                    {(cardStats?.wordsLearned ?? 0).toLocaleString()} · {(cardStats?.phrasesLearned ?? 0).toLocaleString()}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 10, marginTop: 1 }}>
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
            {showLearnedBlock && (showShieldRow || showPathBlock) && (
              <View style={{ height: 1, backgroundColor: glassHairline, marginLeft: 56 }} />
            )}
            {showShieldRow && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 11 }}>
                <View style={{
                  width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: cardVisual.accentSoft,
                  shadowColor: cardVisual.shadowColor, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, ...noAndroidOutline,
                }}>
                  <Ionicons name="shield-checkmark" size={16} color={monoIcon(themeMode, cardVisual.accent)} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>
                    {triLang(lang as Lang, {
                      ru: 'Защита цепочки',
                      uk: 'Захист ланцюжка',
                      es: 'Protección de racha',
                      'pt-BR': 'Proteção de sequência',
                      vi: 'Bảo vệ chuỗi',
                      id: 'Perlindungan rentetan',
                      tr: 'Seri koruması',
                      pl: 'Ochrona serii',
                    })}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 10, marginTop: 1 }}>
                    {cardShieldStatusText}
                  </Text>
                </View>
              </View>
            )}
            {showShieldRow && showPathBlock && (
              <View style={{ height: 1, backgroundColor: glassHairline, marginLeft: 56 }} />
            )}
            {showPathBlock && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 11 }}>
                <View style={{
                  width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: cardVisual.accentSoft,
                  shadowColor: cardVisual.shadowColor, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, ...noAndroidOutline,
                }}>
                  <Ionicons name="compass" size={16} color={monoIcon(themeMode, cardVisual.accent)} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>
                    {(cardStats?.appDays ?? 0).toLocaleString()} · 🔥{(cardStats?.longestStreak ?? 0).toLocaleString()}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 10, marginTop: 1 }}>
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
          </View>
        )}
        {displayCardLevel >= 5 && (
          // AURORA: акцентная строка легенды — корона + имя одной строкой
          // (вторая строка-подпись убрана по фидбеку владельца).
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11,
            // зачем: §0.D — строка легенды держится акцентным тоном уровня V.
            borderRadius: 16, backgroundColor: cardVisual.accentSoft,
            paddingHorizontal: 12, paddingVertical: 11, marginBottom: 14,
          }}>
            <Text style={{ fontSize: f.numMd }}>👑</Text>
            <Text style={{ color: cardVisual.secondary, fontSize: 14, fontWeight: '900' }}>
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
          </View>
        )}
        </ScrollView>
        {isMe && !hasDevProfileCardLevelOverride && previewLevel !== null && (
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
            // зачем: §0.D — плавающая панель превью отделяется тенью ниже
            // (она уже сильная), кромка не нужна.
            // зачем: фон панели полупрозрачный (alpha 0.94) — Android не мог
            // вывести скруглённый outline и заливал квадрат под панелью.
            backgroundColor: 'rgba(8,10,16,0.94)',
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            ...noAndroidOutline,
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
                  // зачем: цена карточки — в жемчужинах, значит и значок обязан быть
                  // ассетом жемчужины (как в магазине/на Главной), а не Ionicons-«алмазом».
                  <Image
                    source={pearlIconForTheme(themeMode)}
                    style={{ width: 20, height: 20 }}
                    contentFit="contain"
                    accessible={false}
                  />
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
        {hasSeasonProfileFrame && <SeasonProfileCardFrame radius={30} />}
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

  // зачем: требование владельца — модалка открывается СНИМКОМ, без skeleton→
  // reveal. getCurrentMultiplierBreakdown() сама по себе асинхронна (AsyncStorage
  // + Firestore чтения), но peekLastMultiplierBreakdown() отдаёт синхронно
  // последнее резолвленное значение той же сессии — используем его как
  // начальное состояние, чтобы первый рендер уже был "финальным" (если игрок
  // уже открывал профиль/начислял XP в этой сессии). Совсем первое открытие
  // после старта приложения по-прежнему покажет короткий skeleton — реальных
  // синхронных данных для него в приложении не существует.
  const [multipliers, setMultipliers] = useState<MultiplierBreakdown | null>(() => peekLastMultiplierBreakdown());
  const [resolvedTotalXp, setResolvedTotalXp] = useState<number | null>(null);
  // зачем (2026-08-03): «вечный скелет» на карточке игрока из турнира. Флаг
  // отмечает, что сетевое доразрешение опыта ЗАВЕРШИЛОСЬ (успехом или пустым
  // ответом) — без него у skeleton не было условия выхода вообще, и он
  // крутился до закрытия модалки.
  const [xpResolutionSettled, setXpResolutionSettled] = useState(false);
  const [friendToast, setFriendToast] = useState<string | null>(null);
  const [friendToastType, setFriendToastType] = useState<'error' | 'info'>('info');

  // зачем: A-54/A-55 — внешняя оболочка модалки владеет вечным shimmer и
  // анимацией входа; флаг нужен здесь отдельно от внутренней карточки.
  const reduceMotion = useReduceMotion();

  // Только `player` с родителя — никакого «снимка» после onClose. Иначе на Android
  // прозрачный Modal с visible=true оставался невидимым перехватчиком касаний.
  const modalOpen = !!player;

  // Gold shimmer — пока открыт профиль.
  // зачем: A-6/A-54 — вечный цикл раньше крутился всегда, даже при системном
  // «Уменьшении движения». Теперь при reduce-motion показываем статичный кадр
  // на полной непрозрачности вместо пульсации (гасим цикл, не элемент).
  useEffect(() => {
    if (!player) {
      return;
    }
    if (reduceMotion) {
      shimmerAnim.setValue(1);
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
  }, [player, shimmerAnim, reduceMotion]);

  // Сброс при полном закрытии
  useEffect(() => {
    if (player) return;
    slideAnim.setValue(500);
    fadeAnim.setValue(0);
    // зачем: НЕ сбрасываем multipliers в null при закрытии — держим последний
    // резолвленный снимок, чтобы следующее открытие сразу отрисовалось финальным
    // состоянием (см. peekLastMultiplierBreakdown выше), а не снова со skeleton.
    setResolvedTotalXp(null);
    setXpResolutionSettled(false);
    setFriendToast(null);
  }, [player, slideAnim, fadeAnim]);

  const showFriendRequestToast = useCallback((message: string, toastType: 'error' | 'info' = 'info') => {
    setFriendToastType(toastType);
    setFriendToast(message);
  }, []);

  // Открытие: множители запускаем сразу, чтобы первый профиль в сессии успел
  // отрисовать реальные данные во время entrance-анимации. Более тяжёлое чтение
  // leaderboard остаётся после interactions ниже.
  useEffect(() => {
    if (!player) return;
    let cancelled = false;

    // зачем: не затираем кэш в null на каждое открытие — если peekLastMultiplierBreakdown()
    // уже дал значение синхронно при инициализации state, держим его видимым, пока
    // фоновый пересчёт ниже не подтвердит/обновит актуальное значение.
    if (!multipliers) setMultipliers(peekLastMultiplierBreakdown());
    // зачем (2026-08-03): `points` для ЧУЖОГО игрока — витринное число вызывающего
    // экрана (недельные очки в лиге, заглушка 0 в лобби турнира). Раньше оно
    // попадало сюда как стартовый «общий опыт», а дальше стояло Math.max(...) —
    // и ноль намертво фиксировался как правда ещё до ответа leaderboard.
    // Теперь для чужой карточки стартуем только с явного totalXp.
    const numericTotalXp = Number.isFinite(Number(player.totalXp))
      ? Math.max(0, Math.floor(Number(player.totalXp)))
      : null;
    const numericPoints = Number.isFinite(Number(player.points))
      ? Math.max(0, Math.floor(Number(player.points)))
      : null;
    const initialTotalXp = player.isMe
      ? (numericTotalXp ?? numericPoints)
      : numericTotalXp;
    setResolvedTotalXp(initialTotalXp);
    // Своей карточке и карточке с уже готовым опытом ждать нечего — ожидание
    // закрыто сразу, skeleton не показывается вовсе.
    setXpResolutionSettled(player.isMe || initialTotalXp !== null);

    if (player.isMe) {
      void getCurrentMultiplierBreakdown().then((m) => {
        if (!cancelled) setMultipliers(m);
      }).catch(() => {});
    }

    slideAnim.stopAnimation();
    fadeAnim.stopAnimation();
    // зачем: A-55 — при «Уменьшении движения» вход не отменяем (иначе модалка
    // возникает рывком), а сжимаем до 150мс и убираем выезд снизу: остаётся
    // мягкий кросс-фейд на месте.
    if (reduceMotion) slideAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: reduceMotion ? 0 : 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, { toValue: 1, duration: reduceMotion ? 150 : 220, useNativeDriver: true }),
    ]).start();

    const task: { cancel: () => void } = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      if (player.uid) {
        const lbDocIds = Array.from(new Set([player.friendUid, player.uid].filter(Boolean) as string[]));
        Promise.all(lbDocIds.map((id) => firestore().collection('leaderboard').doc(id).get().catch(() => null)))
          .then((lbSnaps) => {
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
            if (bestTotalXp !== null) setResolvedTotalXp(bestTotalXp);
            // зачем (2026-08-03): документа leaderboard/{uid} может не быть — он
            // живёт под firebaseAuthUid, а на руках stableId (или наоборот).
            // Раньше карточка в этом случае молча оставалась на нуле и зависела
            // от того, успел ли ВЫЗЫВАЮЩИЙ экран сделать префетч. Теперь модалка
            // сама добирает профиль тем же батч-хелпером (TTL-кэш 5 мин + dedupe,
            // на одну карточку это максимум один callable, обычно ноль).
            if (bestTotalXp !== null || !CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
              setXpResolutionSettled(true);
              return;
            }
            void fetchFriendProfilesBatch(lbDocIds)
              .then((profiles) => {
                if (cancelled) return;
                for (const id of lbDocIds) {
                  const fetched = profiles[id];
                  // зачем (2026-08-03): было `fetched.totalXp > 0` — профиль
                  // новичка с честным нулём отбрасывался как «пустой», и
                  // карточка навсегда оставалась в skeleton. Ноль — валидный
                  // ответ; «не знаю» — это только отсутствие профиля (null).
                  if (fetched) {
                    setResolvedTotalXp(Math.max(0, Math.floor(fetched.totalXp)));
                    return;
                  }
                }
              })
              .catch(() => {})
              // Сеть отработала — ожидание закрыто в любом исходе, включая
              // «профиля нет вовсе»: тогда честно показываем 0 / Lv.1.
              .finally(() => { if (!cancelled) setXpResolutionSettled(true); });
          })
          .catch(() => { if (!cancelled) setXpResolutionSettled(true); });
      } else {
        // Нет uid (бот, локальный профиль) — доразрешать нечего, ждать незачем.
        setXpResolutionSettled(true);
      }
    });
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [player, fadeAnim, slideAnim, reduceMotion]);

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
            xpResolutionSettled={xpResolutionSettled}
            slideAnim={slideAnim}
            fadeAnim={fadeAnim}
            shimmerAnim={shimmerAnim}
            onBackdropPress={handleClose}
            onClose={handleClose}
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
