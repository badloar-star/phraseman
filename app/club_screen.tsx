import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Reanimated from 'react-native-reanimated';
import TapScale from '../components/TapScale';
import { View, Text, TouchableOpacity, Animated, Easing, type FlatList } from 'react-native';
import { Image } from 'expo-image';
import { hapticTap } from '../hooks/use-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
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
import ProfileCardBadge from '../components/ProfileCardBadge';
import AvatarView from '../components/AvatarView';
import PremiumAvatarHalo from '../components/PremiumAvatarHalo';
import LeagueChestOpenModal from '../components/LeagueChestOpenModal';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { glassFill } from '../components/GlassSurface';
import {
  LEAGUES,
  clubNamePlanned,
  GroupMember, LeagueState, LeagueResult,
  checkLeagueOnAppOpen,
  clearPendingResult,
  getWeekId,
  getLeagueResultZoneSize,
  loadLeagueState,
  loadPendingResult,
  invalidateLeagueGroupCache,
  getLeagueResultSignature,
  tryAcquireLeagueResultModal,
  markLeagueResultShown,
} from './league_engine';
import LeagueResultModal from './LeagueResultModal';
import { logLeaguePromoted } from './firebase';
import { getBestAvatarForLevel } from '../constants/avatars';
import { PREMIUM_AVATAR_AURA_ID, USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId } from '../constants/avatar_auras';
import { getTitleString } from '../constants/titles';

import { getMyWeekPoints } from './hall_of_fame_utils';
import { getCanonicalUserId } from './user_id_policy';
import { getXPProgress, getLevelFromXP, screenTextOnGradient, type ThemeMode } from '../constants/theme';
import { monoIcon } from '../constants/monoIcon';
import { getLeagueBonusPalette } from '../constants/leagueBonusPalette';
import { getLeagueBonusGiftImage } from '../constants/leagueBonusGiftImages';
import {
  loadPrevRank, savePrevRank, computeRankDelta,
  KEY_CLUB_PREV_RANK, RankDelta,
} from './rank_change';
import RankChangeBanner from '../components/RankChangeBanner';
import { actionToastTri, emitAppEvent, onAppEvent } from './events';
import {
  LEAGUE_BONUS_ADMIN_PREVIEW_KEY,
  LEAGUE_CROWN_NICK_COLOR,
  ensureLeagueChestRewards,
  fetchActiveLeagueCrowns,
  getLeagueChestGoal,
  hasLeagueChestClaimOrPending,
  resolveMyLeagueGroupMeta,
  unlockLeagueGoldThemeReward,
  type LeagueBonusAdminPreview,
  type LeagueCrown,
  type LeagueChestRewardDrop,
} from './services/league_chest_rewards';
import { shouldShowLeagueRace } from './league_race_visibility';
import { visibleWallClock } from './visible_wall_clock';
import { getCachedLeagueStateSync, shouldShowLeagueEmptyParticipants } from './league_open_cache_policy';
import { checkAchievements } from './achievements';
import { GOLD_RICH } from '../constants/goldTheme';
import { safeRouterBack } from './navigation_back';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { oskolokImageForPackShards } from './oskolok';
import { getLeagueXpPromotionThreshold, isLeagueXpPromotionEnabled } from './remote_flags';
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
import { hasClubGiftFreeBoostFromLevel } from './club_boosts';
import {
  buildLeagueBonusMissionModel,
} from './league_club_hub_model';
import { leaguePublicName } from './league_public_name';
import { LeagueBonusMission } from '../components/league/LeagueBonusMission';
import { LeagueHeroStatus, type LeagueHeroGap, type LeagueHeroZone } from '../components/league/LeagueHeroStatus';
import { LeagueLeaderboardRow, type LeagueLeaderboardZone } from '../components/league/LeagueLeaderboardRow';
import type { LeagueHubPalette } from '../components/league/leagueHubPalette';

// v2 — bumped после фикса race на signInAnonymously + остановки резервной записи
// в league_state_v3. Старый таймер мог хранить «не обновлять» с момента, когда
// fetchGroupForUser возвращал только пользователя из-за PERMISSION_DENIED.
const CLUB_REMOTE_REFRESH_AT_KEY = 'club_remote_refresh_at_v2';
// The bonus modal reads Firestore on app start, so the League screen must also
// revalidate on every open; otherwise it can contradict a just-shown modal.
const CLUB_REMOTE_REFRESH_MS = 45_000;
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

function leagueXpPromotionBannerText(lang: Lang, threshold: number): string {
  const xp = Math.max(1, Math.floor(Number(threshold) || 1000)).toLocaleString();
  return triLang(lang, {
    ru: `В этом месяце переход проще: набери ${xp} XP за неделю — и перейдёшь в следующую лигу.`,
    uk: `Цього місяця перехід простіший: набери ${xp} XP за тиждень — і перейдеш у наступну лігу.`,
    es: `Este mes subir es más simple: consigue ${xp} XP esta semana y pasarás a la siguiente liga.`,
    'pt-BR': `Neste mês a subida está mais simples: ganhe ${xp} XP na semana e vá para a próxima liga.`,
    vi: `Tháng này việc thăng hạng dễ hiểu hơn: đạt ${xp} XP trong tuần để lên giải tiếp theo.`,
    id: `Bulan ini naik liga lebih sederhana: kumpulkan ${xp} XP minggu ini untuk masuk liga berikutnya.`,
    tr: `Bu ay yükselme daha basit: haftada ${xp} XP kazan, sonraki lige geç.`,
    pl: `W tym miesiącu awans jest prostszy: zdobądź ${xp} XP w tygodniu i przejdź do następnej ligi.`,
  });
}

/** Конец текущей ISO-недели лиги (понедельник 00:00 UTC, как getWeekId). */
function leagueWeekEndsAtUtcMs(now: number): number {
  const d = new Date(now);
  const dayStartUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = new Date(dayStartUtc).getUTCDay() || 7;
  return dayStartUtc + (8 - dow) * 86_400_000;
}

function formatLeagueWeekCountdown(lang: Lang, msLeft: number): { text: string; urgent: boolean } {
  const left = Math.max(0, msLeft);
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const mins = Math.floor((left % 3_600_000) / 60_000);
  const units = triLang(lang, {
    ru: { d: 'д', h: 'ч', m: 'мин' },
    uk: { d: 'д', h: 'г', m: 'хв' },
    es: { d: 'd', h: 'h', m: 'min' },
    'pt-BR': { d: 'd', h: 'h', m: 'min' },
    vi: { d: 'n', h: 'g', m: 'ph' },
    id: { d: 'h', h: 'j', m: 'mnt' },
    tr: { d: 'g', h: 's', m: 'dk' },
    pl: { d: 'd', h: 'g', m: 'min' },
  });
  const text = days >= 1
    ? `${days} ${units.d} ${hours} ${units.h}`
    : hours >= 1
      ? `${hours} ${units.h} ${mins} ${units.m}`
      : `${Math.max(1, mins)} ${units.m}`;
  return { text, urgent: days < 1 };
}

// ── League icon renderer ──────────────────────────────────────────────────────
const LEAGUE_ICON_SOURCE_SIZE = 384;
const LEAGUE_ICON_RENDER_SAFE_SCALE = 0.94;
const LEAGUE_ICON_CONTENT_OFFSETS: Record<number, { x: number; y: number }> = {};

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
  const renderSize = Math.max(1, Math.round(size * LEAGUE_ICON_RENDER_SAFE_SCALE));
  const safeContentOffset = {
    x: contentOffset.x * LEAGUE_ICON_RENDER_SAFE_SCALE,
    y: contentOffset.y * LEAGUE_ICON_RENDER_SAFE_SCALE,
  };

  useEffect(() => {
    setFailed(false);
  }, [source]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {(!source || failed) ? (
        <Ionicons
          name={iconName as any}
          size={Math.max(14, Math.round(renderSize * 0.8))}
          color={color}
          style={{ position: 'absolute', opacity }}
        />
      ) : null}
      {source ? (
        <Image
          source={source}
          style={{
            width: renderSize,
            height: renderSize,
            opacity,
            transform: [
              { translateX: safeContentOffset.x },
              { translateY: safeContentOffset.y },
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

function LeagueIcon({
  league,
  size = 24,
  pulse = false,
  active = false,
  locked = false,
  alignContent = true,
  themeMode,
}: {
  league: any;
  size?: number;
  pulse?: boolean;
  active?: boolean;
  locked?: boolean;
  alignContent?: boolean;
  themeMode?: ThemeMode;
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
      color={monoIcon(themeMode ?? 'dark', locked ? '#7A7A7A' : (active ? league.color : '#7F8793'))}
      size={size}
      opacity={locked ? 0.55 : (active ? 1 : 0.65)}
      contentOffset={contentOffset}
    />
  ) : (
    <Ionicons
      name={iconName}
      size={Math.max(14, Math.round(size * 0.8))}
      color={monoIcon(themeMode ?? 'dark', locked ? '#7A7A7A' : (active ? league.color : '#7F8793'))}
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

function leagueMemberKeyExtractor(member: GroupMember, index: number): string {
  return member.uid ?? member.botId ?? `${member.name}-${index}`;
}

export default function ClubScreen() {
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onAnimatedScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const insets = useStableSafeAreaInsets();
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
  const [group, setGroup]               = useState<GroupMember[]>(() => Array.isArray(initialLeagueState?.group) ? initialLeagueState!.group : []);
  const [profilePlayer, setProfile]     = useState<UnifiedPlayerInfo | null>(null);
  const [myAvatarEmoji, setMyAvatarEmoji] = useState('🐣');
  const [myFrameId, setMyFrameId]         = useState('plain');
  const [myAuraId, setMyAuraId]           = useState('');
  const [userName, setUserName]         = useState('');
  const [playerXP, setPlayerXP]         = useState(0);
  const [localLeagueHydrated, setLocalLeagueHydrated] = useState(initialLeagueState != null);
  const [rankDelta, setRankDelta] = useState<RankDelta | null>(null);
  const [pendingLeagueResult, setPendingLeagueResult] = useState<LeagueResult | null>(null);
  const dismissedLeagueResultThisSessionRef = useRef<boolean>(false);
  const contentScrollRef = useRef<FlatList<GroupMember> | null>(null);
  /** Совпадает с RankChangeTestModal / тестовым превью — не менять без синхронизации. */
  const ROW_HEIGHT_CLUB = 72;
  const myRowAnim = useRef(new Animated.Value(0)).current;

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
  const [weekCountdown, setWeekCountdown] = useState(() => formatLeagueWeekCountdown(lang ?? 'ru', leagueWeekEndsAtUtcMs(Date.now()) - Date.now()));
  const [groupBoostConfirmVisible, setGroupBoostConfirmVisible] = useState(false);
  // Подарок уровня «Буст клуба бесплатно»: следующая активация не списывает осколки.
  const [freeBoostGiftReady, setFreeBoostGiftReady] = useState(false);

  useEffect(() => {
    void hasClubGiftFreeBoostFromLevel().then((v) => {
      if (isMountedRef.current) setFreeBoostGiftReady(v);
    }).catch(() => {});
  }, []);
  const [groupBoostBuying, setGroupBoostBuying] = useState(false);
  const [groupBoostLikeBusy, setGroupBoostLikeBusy] = useState(false);
  const [groupBoostLikedToday, setGroupBoostLikedToday] = useState(false);
  const [groupBoostLikeTotal, setGroupBoostLikeTotal] = useState(0);
  const [leagueXpPromotionRemote, setLeagueXpPromotionRemote] = useState(() => ({
    enabled: isLeagueXpPromotionEnabled(),
    threshold: getLeagueXpPromotionThreshold(),
  }));
  const activeGroupBoostRef = useRef<LeagueGroupBoostState | null>(null);
  const [leagueCrownsByUid, setLeagueCrownsByUid] = useState<Record<string, LeagueCrown>>({});
  const [leagueChestOpenModal, setLeagueChestOpenModal] = useState<{
    crownName?: string;
    isCrownWinner?: boolean;
    rewards?: LeagueChestRewardDrop[];
  } | null>(null);
  const leagueChestReplayModalKeyRef = useRef('');

  const isMountedRef = useRef(true);

  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => {
      setLeagueXpPromotionRemote({
        enabled: isLeagueXpPromotionEnabled(),
        threshold: getLeagueXpPromotionThreshold(),
      });
    });
    return () => sub.remove();
  }, []);
  // Arena is optional while its feature set is being retired. The league screen
  // keeps its local data and rewards available without the live arena listener.
  useEffect(() => {
    setArenaClubEvent(null);
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

  useEffect(() => {
    let cancelled = false;
    if ((leagueBonusAdminPreview && Date.now() < leagueBonusAdminPreview.expiresAt) || !leagueGroupMeta?.weekId || !leagueGroupMeta?.groupId) return () => {};
    void hasLeagueChestClaimOrPending({
      weekId: leagueGroupMeta.weekId,
      groupId: leagueGroupMeta.groupId,
    }).then((claimedOrPending) => {
      if (!cancelled && isMountedRef.current) setLeagueChestClaimed(claimedOrPending);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [leagueBonusAdminPreview, leagueGroupMeta?.groupId, leagueGroupMeta?.weekId]);

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
    const maybeShowPending = async (result: LeagueResult | null) => {
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
      // Межхостовый guard (league_engine, module-level): та же сигнатура результата
      // могла уже быть забронирована home.tsx (или этим же экраном ранее) — не показываем
      // второй раз. Источник правды — league_engine, локальный dismissedRef оставлен как
      // быстрая защита внутри одного хоста.
      if (!tryAcquireLeagueResultModal(getLeagueResultSignature(result))) {
        return;
      }
      // Персистим «показано» СРАЗУ в момент показа (await, не фоном) — так kill
      // приложения сразу после показа (до закрытия модалки юзером) не приводит
      // к повторному показу при следующем запуске.
      await markLeagueResultShown(result);
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
      // Защита: даже после санитизации у источника гарантируем массив локально, иначе
      // [...safeGroup] / .sort упадут TypeError и глобальный ErrorBoundary уронит всё приложение.
      const safeGroup = Array.isArray(state.group) ? state.group : [];
      setGroup(safeGroup);
      // Если пришёл свежий результат недели (после смены ISO-недели) — показываем модалку
      // прямо здесь. Раньше модалка жила только на home.tsx, поэтому захождение в Лиги
      // в понедельник не давало анимацию.
      if (result) void maybeShowPending(result);
      if (!fromRemote) return;
      // Считаем delta только когда данные пришли из Firestore (не кеш).
      const sorted = [...safeGroup].sort((a, b) => b.points - a.points);
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
      if (cachedPending) void maybeShowPending(cachedPending);

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
        setLocalLeagueHydrated(true);
      } else {
        // Do not manufacture a zero-score league while the authoritative
        // weekly state is still loading. A fake zero is indistinguishable from
        // a real reset and was the source of several user-visible reports.
        setLocalLeagueHydrated(false);
      }

      // ── Фаза 2: сетевой апдейт не чаще 6 часов (или по force) ───────────────
      // ВАЖНО: 6h-троттл должен бить только Firestore-refetch группы, а не проверку
      // смены ISO-недели. Иначе после полуночи понедельника (новая неделя) пользователь
      // может зайти в Лиги и не увидеть LeagueResultModal, если последний refresh был <6h.
      const lastRemoteAtRaw = await AsyncStorage.getItem(CLUB_REMOTE_REFRESH_AT_KEY);
      const lastRemoteAt = parseInt(lastRemoteAtRaw || '0', 10) || 0;
      const withinRefreshTtl = (Date.now() - lastRemoteAt < CLUB_REMOTE_REFRESH_MS);
      const weekChanged = !!cachedLeague && cachedLeague.weekId !== getWeekId();
      const shouldRefreshRemote = !!opts?.forceRemote || !withinRefreshTtl || weekChanged;
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

  // Таймер недели: общий visible wall clock (1 Гц), текст меняется максимум раз в минуту,
  // подписка живёт только пока экран в фокусе — новых setInterval не создаём.
  useFocusEffect(
    useCallback(() => {
      const update = (now: number) => {
        const next = formatLeagueWeekCountdown(lang ?? 'ru', leagueWeekEndsAtUtcMs(now) - now);
        setWeekCountdown((prev) => (prev.text === next.text && prev.urgent === next.urgent ? prev : next));
      };
      update(Date.now());
      const unsubscribe = visibleWallClock.subscribe(update);
      return () => unsubscribe();
    }, [lang]),
  );

  const myLeague = LEAGUES[myLeagueId] ?? LEAGUES[0];

  // useMemo: иначе массив пересоздаётся и пересортировывается на КАЖДЫЙ ре-рендер экрана
  // (смена profile/фокус/обновления), и следом заново прогоняется весь .map по ~30 строкам лиги.
  const sortedGroup = useMemo(
    () => (Array.isArray(group) ? [...group] : []).sort((a, b) => b.points - a.points),
    [group],
  );
  const publicSortedGroup = useMemo(
    () => sortedGroup.map((member) => ({
      ...member,
      name: leaguePublicName(member.name, member.uid ?? member.botId ?? member.name),
    })),
    [sortedGroup],
  );
  const currentUserStreak = sortedGroup.find((p) => p.isMe)?.streak ?? null;
  const showEmptyParticipants = shouldShowLeagueEmptyParticipants({
    localLeagueHydrated,
    participantCount: sortedGroup.length,
  });
  const leagueXpPromotionMode = leagueXpPromotionRemote.enabled;
  const leagueXpPromotionThreshold = leagueXpPromotionRemote.threshold;
  const zoneSize = getLeagueResultZoneSize(sortedGroup.length);
  const promotionCutoff = !leagueXpPromotionMode && sortedGroup.length >= 2 && myLeagueId < LEAGUES.length - 1 ? zoneSize : 0;
  const relegationStartIndex = !leagueXpPromotionMode && sortedGroup.length >= 2 ? Math.max(0, sortedGroup.length - zoneSize) : sortedGroup.length;
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
  const myLeagueRoomXp = Math.max(0, Math.floor(Number(sortedGroup.find((p) => p.isMe)?.points) || 0));
  const myLeagueChestContribution = myLeagueRoomXp + myArenaClubPoints;
  const leagueChestReady = leagueRaceVisible && (leagueBonusAdminActive || leagueChestProgress >= leagueChestGoal);
  const leagueCrownWinnerUid = leagueRaceVisible && leagueChestReady
    ? leagueBonusAdminActive && leagueBonusAdminPreview?.crownWinner
      ? arenaClubStableUid || sortedGroup.find((p) => p.isMe)?.uid
      : sortedGroup[0]?.uid
    : undefined;
  const rawLeagueCrownWinnerName = leagueRaceVisible && leagueChestReady
    ? leagueBonusAdminActive && leagueBonusAdminPreview?.crownWinner
      ? userName || sortedGroup.find((p) => p.isMe)?.name
      : sortedGroup[0]?.name
    : undefined;
  const leagueCrownWinnerName = rawLeagueCrownWinnerName
    ? leaguePublicName(rawLeagueCrownWinnerName, leagueCrownWinnerUid ?? rawLeagueCrownWinnerName)
    : undefined;

  const claimLeagueChestReward = useCallback(async () => {
    if (!leagueRaceVisible || !leagueChestReady || leagueChestClaimed || leagueChestClaiming) return;
    if (leagueBonusAdminActive) {
      setLeagueChestClaimed(true);
      setLeagueChestClaiming(true);
      try {
        const previewRewards = buildLeagueChestPreviewRewards(!!leagueBonusAdminPreview?.crownWinner);
        await unlockLeagueGoldThemeReward('admin_league_bonus_preview');
        if (!isMountedRef.current) return;
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
    setLeagueChestClaimed(true);
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
        studyTarget,
      });
      if (!isMountedRef.current) return;
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
        setLeagueChestClaimed(false);
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'Бонус лиги пока не готов',
          uk: 'Бонус ліги ще не готовий',
          es: 'El bono de liga aún no está listo',
          'pt-BR': 'O bônus da liga ainda não está pronto',
          vi: 'Thưởng giải đấu chưa sẵn sàng',
          id: 'Bonus liga belum siap',
          tr: 'Lig bonusu henüz hazır değil',
          pl: 'Bonus ligi nie jest jeszcze gotowy',
        }));
      }
    } catch {
      if (isMountedRef.current) setLeagueChestClaimed(false);
    } finally {
      if (isMountedRef.current) setLeagueChestClaiming(false);
    }
  }, [leagueRaceVisible, leagueChestReady, leagueGroupMeta, leagueChestClaimed, leagueChestClaiming, leagueBonusAdminActive, leagueBonusAdminPreview?.crownWinner, leagueCrownWinnerName, userName, sortedGroup, arenaClubStableUid, studyTarget]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (leagueBonusAdminActive || !leagueRaceVisible || !leagueChestReady || !leagueGroupMeta || sortedGroup.length === 0) return () => {};
      void (async () => {
        const claimOrPending = await hasLeagueChestClaimOrPending({
          weekId: leagueGroupMeta.weekId,
          groupId: leagueGroupMeta.groupId,
        }).catch(() => false);
        if (!claimOrPending || cancelled || !isMountedRef.current) return;
        setLeagueChestClaimed(true);
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
          studyTarget,
        });
        if (cancelled || !isMountedRef.current) return;
        if (res.rewards) {
          const replayKey = `${leagueGroupMeta.weekId}:${leagueGroupMeta.groupId}`;
          if (leagueChestReplayModalKeyRef.current !== replayKey) {
            leagueChestReplayModalKeyRef.current = replayKey;
            setLeagueChestOpenModal({
              crownName: res.crown?.name,
              isCrownWinner: !!res.crown?.uid && res.crown.uid === arenaClubStableUid,
              rewards: res.rewards.drops ?? [],
            });
          }
        } else if (!res.claimed) {
          setLeagueChestClaimed(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [arenaClubStableUid, leagueBonusAdminActive, leagueChestReady, leagueGroupMeta, leagueRaceVisible, sortedGroup, studyTarget]),
  );

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
    // Обновляем состояние подарочного ваучера перед показом подтверждения,
    // чтобы цена в модалке («бесплатно» vs 50) была актуальной.
    void hasClubGiftFreeBoostFromLevel()
      .then((v) => { if (isMountedRef.current) setFreeBoostGiftReady(v); })
      .catch(() => {});
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
      buyerName: leaguePublicName(userName || me?.name, arenaClubStableUid || me?.uid || me?.botId || userName),
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
    // Подарочный ваучер: проверяем свежее значение прямо перед покупкой —
    // активация бесплатна, баланс не трогаем.
    const giftVoucher = await hasClubGiftFreeBoostFromLevel().catch(() => false);
    if (!giftVoucher && previousBalance !== null && previousBalance < LEAGUE_GROUP_BOOST_COST_SHARDS) {
      showLeagueToast(`Нужно ${LEAGUE_GROUP_BOOST_COST_SHARDS} осколков`, 'error');
      return;
    }
    const optimisticBoost = makeOptimisticGroupBoost();
    setActiveGroupBoost(optimisticBoost);
    setGroupBoostLikeTotal(0);
    setGroupBoostLikedToday(false);
    setGroupBoostConfirmVisible(false);
    void cacheLeagueGroupBoost(optimisticBoost);
    if (!giftVoucher && previousBalance !== null) {
      void replaceShardsBalanceLocal(Math.max(0, previousBalance - LEAGUE_GROUP_BOOST_COST_SHARDS));
    }
    setGroupBoostBuying(true);
    try {
      const res = await buyLeagueGroupBoost();
      if (res.ok) {
        setActiveGroupBoost(res.boost);
        setGroupBoostLikeTotal(res.boost.likeCount);
        if (res.usedGiftVoucher) {
          setFreeBoostGiftReady(false);
          showLeagueToast(`Буст ×${LEAGUE_GROUP_BOOST_MULTIPLIER} включен на 3 часа — бесплатно, подарок использован 🎁`, 'success');
        } else {
          showLeagueToast(`Буст ×${LEAGUE_GROUP_BOOST_MULTIPLIER} включен для всей лиги на 3 часа`, 'success');
        }
        return;
      }
      const shouldRollback = res.reason === 'active' || res.reason === 'not_enough_shards' || res.reason === 'no_current_group';
      if (shouldRollback) {
        setActiveGroupBoost(previousBoost);
        setGroupBoostLikeTotal(0);
        void cacheLeagueGroupBoost(previousBoost);
        if (!giftVoucher && previousBalance !== null) void replaceShardsBalanceLocal(previousBalance);
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
      const total = await likeLeagueGroupBoostBuyer(activeGroupBoost, leaguePublicName(userName, arenaClubStableUid || userName));
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

  const hubPalette = useMemo<LeagueHubPalette>(() => ({
    surface: glassFill(t.bgSurface, 0.78),
    elevated: glassFill(t.bgCard, 0.72),
    text: t.textPrimary,
    muted: t.textMuted,
    accent: t.accent,
    accentText: t.correctText,
    outline: t.border,
    positive: monoIcon(themeMode, '#34C759'),
    negative: monoIcon(themeMode, '#FF5B6C'),
    warning: monoIcon(themeMode, '#FFD43B'),
  }), [t, themeMode]);
  const hubBonusMissionModel = useMemo(() => buildLeagueBonusMissionModel({
    progress: leagueChestProgress,
    goal: leagueChestGoal,
    myContribution: myLeagueChestContribution,
    chestReady: leagueChestReady,
    chestClaimed: leagueChestClaimed,
    contributors: publicSortedGroup,
    boost: activeGroupBoost ? {
      ...activeGroupBoost,
      buyerName: leaguePublicName(activeGroupBoost.buyerName, activeGroupBoost.buyerUid),
    } : null,
  }), [activeGroupBoost, leagueChestClaimed, leagueChestGoal, leagueChestProgress, leagueChestReady, myLeagueChestContribution, publicSortedGroup]);
  // ── Hero-статус: моё место, зона и отрыв до следующего места ────────────────
  const myLeagueRank = useMemo(() => {
    const idx = sortedGroup.findIndex((m) => m.isMe);
    return idx >= 0 ? idx + 1 : 0;
  }, [sortedGroup]);
  const myLeagueZone = useMemo<LeagueHeroZone | null>(() => {
    if (myLeagueRank <= 0) return null;
    if (leagueXpPromotionMode) {
      const me = sortedGroup[myLeagueRank - 1];
      const myPts = Math.max(0, Math.floor(Number(me?.points) || 0));
      return myLeagueId < LEAGUES.length - 1 && myPts >= leagueXpPromotionThreshold ? 'promotion' : 'safe';
    }
    if (promotionCutoff > 0 && myLeagueRank <= promotionCutoff) return 'promotion';
    if (sortedGroup.length >= 2 && myLeagueRank - 1 >= relegationStartIndex) return 'relegation';
    return 'safe';
  }, [leagueXpPromotionMode, leagueXpPromotionThreshold, myLeagueId, myLeagueRank, promotionCutoff, relegationStartIndex, sortedGroup]);
  const myLeagueGap = useMemo<LeagueHeroGap | null>(() => {
    if (myLeagueRank <= 0 || sortedGroup.length < 2) return null;
    const myPts = Math.max(0, Math.floor(Number(sortedGroup[myLeagueRank - 1]?.points) || 0));
    if (myLeagueRank === 1) {
      const secondPts = Math.max(0, Math.floor(Number(sortedGroup[1]?.points) || 0));
      return { kind: 'leader', xpAhead: Math.max(0, myPts - secondPts), ratio: 1 };
    }
    const abovePts = Math.max(0, Math.floor(Number(sortedGroup[myLeagueRank - 2]?.points) || 0));
    return {
      kind: 'to_rank',
      targetRank: myLeagueRank - 1,
      xpNeeded: Math.max(1, abovePts - myPts + 1),
      ratio: abovePts > 0 ? Math.min(1, myPts / abovePts) : 1,
    };
  }, [myLeagueRank, sortedGroup]);
  const leagueBonusPct = useMemo(() => Math.max(0, Number(String(myLeague.tagRU).match(/([+-]?\d+)%/)?.[1] ?? '0') || 0), [myLeague.tagRU]);

  const hasLeagueCrownForMember = useCallback((member: Pick<GroupMember, 'uid'>): boolean => {
    if (!member.uid) return false;
    return member.uid === leagueCrownWinnerUid
      || Math.max(0, Math.floor(Number(leagueCrownsByUid[member.uid]?.crownCount) || 0)) > 0
      || Number(leagueCrownsByUid[member.uid]?.expiresAt) > Date.now();
  }, [leagueCrownWinnerUid, leagueCrownsByUid]);

  const openLeagueMemberProfile = useCallback((member: GroupMember) => {
    const crownCount = member.uid
      ? Math.max(0, Math.floor(Number(leagueCrownsByUid[member.uid]?.crownCount) || 0))
      : 0;
    const hasCrown = hasLeagueCrownForMember(member);
    setProfile({
      name: leaguePublicName(member.name, member.uid ?? member.botId ?? member.name),
      points: member.isMe ? playerXP : (member.totalXp ?? member.points),
      totalXp: member.isMe ? playerXP : (member.totalXp ?? undefined),
      isMe: member.isMe,
      leagueId: member.leagueId ?? myLeague.id,
      uid: member.uid,
      isPremium: member.isPremium ?? false,
      isVip: member.isVip ?? false,
      isLifetime: member.isLifetime ?? false,
      avatar: member.avatar,
      frame: member.frame,
      aura: member.isMe ? myAuraId : member.aura,
      streak: member.streak ?? null,
      weekXp: member.points,
      leagueCrownExpiresAt: hasCrown
        ? Math.max(Date.now() + 1, Number(leagueCrownsByUid[member.uid ?? '']?.expiresAt) || 0)
        : undefined,
      leagueCrownCount: hasCrown ? Math.max(1, crownCount) : undefined,
      profileCardLevel: member.profileCardLevel,
      profileCardTheme: member.profileCardTheme,
      profileCardMotion: member.profileCardMotion,
      profileCardPublicFocus: member.profileCardPublicFocus,
    });
  }, [hasLeagueCrownForMember, leagueCrownsByUid, myAuraId, myLeague.id, playerXP]);

  const openActiveBoostBuyerProfile = useCallback(() => {
    if (!activeGroupBoost) return;
    setProfile({
      name: leaguePublicName(activeGroupBoost.buyerName, activeGroupBoost.buyerUid),
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
    });
  }, [activeGroupBoost, arenaClubStableUid, myLeague.id]);

  const renderLeagueMemberAvatar = useCallback((member: GroupMember, size: number) => {
    const rowXp = member.isMe ? playerXP : (member.totalXp ?? 0);
    const avatar = member.isMe
      ? myAvatarEmoji
      : (member.avatar ?? String(getBestAvatarForLevel(getLevelFromXP(rowXp))));
    const aura = getEffectiveAvatarAuraId(member.isMe ? myAuraId : member.aura, member.isPremium, member.isVip);
    const usesPremiumAura = aura === PREMIUM_AVATAR_AURA_ID;
    return (
      <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={size} maskColor={hubPalette.surface} animateShimmer={false}>
        <AvatarView avatar={avatar} totalXP={rowXp} size={size} auraId={usesPremiumAura ? undefined : aura} animateAura={false} />
      </PremiumAvatarHalo>
    );
  }, [hubPalette.surface, myAuraId, myAvatarEmoji, playerXP]);

  const renderLeagueMemberName = useCallback((p: GroupMember) => {
    const crownCount = p.uid
      ? Math.max(0, Math.floor(Number(leagueCrownsByUid[p.uid]?.crownCount) || 0))
      : 0;
    const displayName = leaguePublicName(p.name, p.uid ?? p.botId ?? p.name);
    const name = hasLeagueCrownForMember(p)
      ? <LeagueCrownName text={displayName} fontSize={f.body} count={Math.max(1, crownCount)} />
      : p.isVip
        ? <VipGreenUserName text={displayName} fontSize={f.body} />
        : p.isPremium
          ? <PremiumGoldUserName text={displayName} fontSize={f.body} />
          : <Text style={{ color: p.isMe ? t.textPrimary : t.textSecond, fontSize: f.body, fontWeight: p.isMe ? '800' : '600' }}>{displayName}</Text>;
    return (
      <View style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
        <View style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>{name}</View>
        <ProfileCardBadge level={p.profileCardLevel} theme={p.profileCardTheme} style={{ marginTop: 3, maxWidth: '100%' }} />
      </View>
    );
  }, [f.body, hasLeagueCrownForMember, leagueCrownsByUid, t.textPrimary, t.textSecond]);

  const scrollToLeagueRank = useCallback(() => {
    contentScrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  const renderLeagueMember = useCallback(({ item, index }: { item: GroupMember; index: number }) => {
    const hasXpPromotion = leagueXpPromotionMode
      && myLeagueId < LEAGUES.length - 1
      && Math.max(0, Math.floor(Number(item.points) || 0)) >= leagueXpPromotionThreshold;
    const zone: LeagueLeaderboardZone = hasXpPromotion || (promotionCutoff > 0 && index < promotionCutoff)
      ? 'promotion'
      : index >= relegationStartIndex
        ? 'relegation'
        : 'safe';
    const row = (
      <LeagueLeaderboardRow
        member={item}
        index={index}
        lang={lang}
        palette={hubPalette}
        zone={zone}
        renderAvatar={renderLeagueMemberAvatar}
        renderName={renderLeagueMemberName}
        hasCrown={hasLeagueCrownForMember(item)}
        xpPromotionBadgeTestID={hasXpPromotion ? `league-xp-promotion-badge-${item.uid ?? item.botId ?? index}` : undefined}
        onOpenProfile={openLeagueMemberProfile}
      />
    );
    return item.isMe ? (
      <Animated.View style={{ transform: [{ translateY: myRowAnim }], zIndex: 5, elevation: 5 }}>{row}</Animated.View>
    ) : row;
  }, [hasLeagueCrownForMember, hubPalette, lang, leagueXpPromotionMode, leagueXpPromotionThreshold, myLeagueId, myRowAnim, openLeagueMemberProfile, promotionCutoff, relegationStartIndex, renderLeagueMemberAvatar, renderLeagueMemberName]);

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
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
            void hapticTap();
            safeRouterBack(router, '/(tabs)/home' as any);
          }}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={28} color={sx.primary} />
        </TapScale>
        <View style={{ flex: 1 }} />
        {leagueBonusPct > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(71,200,112,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Ionicons name="flash" size={12} color={monoIcon(themeMode, '#47C870')} />
            <Text style={{ color: monoIcon(themeMode, '#47C870'), fontSize: f.caption, fontWeight: '900' }}>+{leagueBonusPct}% XP</Text>
          </View>
        ) : null}
        <View testID="league-week-countdown" style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: weekCountdown.urgent ? 'rgba(255,91,108,0.14)' : 'rgba(255,212,59,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Ionicons name="hourglass-outline" size={12} color={weekCountdown.urgent ? monoIcon(themeMode, '#FF5B6C') : monoIcon(themeMode, '#FFD43B')} />
          <Text style={{ color: weekCountdown.urgent ? monoIcon(themeMode, '#FF5B6C') : monoIcon(themeMode, '#FFD43B'), fontSize: f.caption, fontWeight: '900' }}>{weekCountdown.text}</Text>
        </View>
      </View>

      <BouncyWrap>
      <Reanimated.FlatList<GroupMember>
        ref={contentScrollRef as any}
        data={publicSortedGroup}
        keyExtractor={leagueMemberKeyExtractor}
        renderItem={renderLeagueMember}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        scrollEnabled
        decelerationRate="normal"
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 16,
        }}
        onScroll={onAnimatedScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={(<>

        {leagueXpPromotionMode && myLeagueId < LEAGUES.length - 1 && (
          <View
            testID="league-xp-promotion-banner"
            style={{
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 11,
              backgroundColor: 'rgba(52, 199, 89, 0.12)',
              borderWidth: 0,
              borderColor: 'rgba(52, 199, 89, 0.34)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
            }}
          >
            <Ionicons name="trending-up" size={18} color={monoIcon(themeMode, '#34C759')} />
            <Text style={{ color: t.textPrimary, fontSize: f.caption, lineHeight: Math.max(16, f.caption + 4), fontWeight: '800', flex: 1 }}>
              {leagueXpPromotionBannerText(lang, leagueXpPromotionThreshold)}
            </Text>
          </View>
        )}

        <LeagueHeroStatus
          style={{ marginTop: 12, marginBottom: 12 }}
          lang={lang}
          palette={hubPalette}
          leagueName={leagueNameForLang(myLeague, lang)}
          participantCount={publicSortedGroup.length}
          leagueIcon={<LeagueIcon league={myLeague} size={96} active alignContent={false} themeMode={themeMode} />}
          myRank={myLeagueRank}
          zone={myLeagueZone}
          gap={myLeagueGap}
        />

        {rankDelta && (
          <RankChangeBanner
            delta={rankDelta.delta}
            passedName={rankDelta.passedName ? leaguePublicName(rankDelta.passedName, rankDelta.passedName) : undefined}
            lostToName={rankDelta.lostToName ? leaguePublicName(rankDelta.lostToName, rankDelta.lostToName) : undefined}
            lang={lang}
            onClose={() => setRankDelta(null)}
          />
        )}

        <View style={{ gap: 10 }}>
          {leagueRaceVisible && (
            <LeagueBonusMission
              model={hubBonusMissionModel}
              lang={lang}
              palette={hubPalette}
              giftImage={leagueBonusGiftImage}
              renderContributorAvatar={renderLeagueMemberAvatar}
              onClaim={() => { void claimLeagueChestReward(); }}
              onBoost={handleBuyGroupBoost}
              onOpenBoostBuyer={openActiveBoostBuyerProfile}
              onLikeBoost={() => { void handleLikeGroupBoostBuyer(); }}
              boostLiked={groupBoostLikedToday || activeGroupBoost?.buyerUid === arenaClubStableUid}
              boostLikeBusy={groupBoostLikeBusy}
              boostTimeLeft={groupBoostTimeLeft}
              onOpenRank={scrollToLeagueRank}
            />
          )}
          <View style={{ marginTop: 6, marginBottom: 2, gap: 3 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '900' }}>
              {triLang(lang, {
                ru: 'Участники клуба', uk: 'Учасники клубу', es: 'Miembros del club', 'pt-BR': 'Membros do clube',
                vi: 'Thành viên câu lạc bộ', id: 'Anggota klub', tr: 'Kulüp üyeleri', pl: 'Członkowie klubu',
              })}
            </Text>
            {showEmptyParticipants ? (
              <Text style={{ color: t.textGhost, fontSize: f.sub, paddingVertical: 16, textAlign: 'center' }}>
                {triLang(lang, {
                  uk: 'Ще немає учасників', ru: 'Пока нет участников', es: 'Aún no hay participantes', 'pt-BR': 'Ainda não há participantes',
                  vi: 'Chưa có người tham gia', id: 'Belum ada peserta', tr: 'Henüz katılımcı yok', pl: 'Nie ma jeszcze uczestników',
                })}
              </Text>
            ) : null}
          </View>
        </View>
        </>)}
      />
      </BouncyWrap>
      </Reanimated.View>

      </ContentWrap>

      <UnifiedPlayerModal
        player={profilePlayer}
        myInfo={{
          name: leaguePublicName(userName, arenaClubStableUid || userName),
          avatar: myAvatarEmoji,
          frame: myFrameId,
          aura: myAuraId,
          totalXP: playerXP,
          leagueId: myLeagueId,
          streak: currentUserStreak,
        }}
        onClose={() => setProfile(null)}
      />

      <ThemedConfirmModal
        visible={groupBoostConfirmVisible}
        title={triLang(lang, {
          ru: 'Включить буст лиги?',
          uk: 'Увімкнути буст ліги?',
          es: '¿Activar impulso de liga?',
          'pt-BR': 'Ativar impulso da liga?',
          vi: 'Bật tăng lực giải đấu?',
          id: 'Aktifkan boost liga?',
          tr: 'Lig desteği açılsın mı?',
          pl: 'Włączyć boost ligi?',
        })}
        messageNode={(
          <View style={{ gap:10 }}>
            <Text style={{ color:t.textMuted, fontSize:f.body, lineHeight:f.body * 1.45, fontWeight:'700' }}>
              {triLang(lang, {
                ru: 'Все участники лиги будут получать ×2 XP в течение 3 часов.',
                uk: 'Усі учасники ліги отримуватимуть ×2 XP протягом 3 годин.',
                es: 'Todos los participantes de la liga recibirán ×2 XP durante 3 horas.',
                'pt-BR': 'Todos os participantes da liga receberão ×2 XP por 3 horas.',
                vi: 'Tất cả thành viên giải đấu sẽ nhận ×2 XP trong 3 giờ.',
                id: 'Semua peserta liga akan mendapat ×2 XP selama 3 jam.',
                tr: 'Tüm lig katılımcıları 3 saat boyunca ×2 XP alacak.',
                pl: 'Wszyscy uczestnicy ligi będą dostawać ×2 XP przez 3 godziny.',
              })}
            </Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap:7 }}>
              <Text style={{ color:t.textMuted, fontSize:f.body, fontWeight:'800' }}>
                {triLang(lang, {
                  ru: 'Стоимость:',
                  uk: 'Вартість:',
                  es: 'Precio:',
                  'pt-BR': 'Custo:',
                  vi: 'Chi phí:',
                  id: 'Biaya:',
                  tr: 'Ücret:',
                  pl: 'Koszt:',
                })}
              </Text>
              {freeBoostGiftReady ? (
                <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'900' }}>
                  {triLang(lang, {
                    ru: 'Бесплатно — подарок за уровень 🎁',
                    uk: 'Безкоштовно — подарунок за рівень 🎁',
                    es: 'Gratis, regalo de nivel 🎁',
                    'pt-BR': 'Grátis — presente de nível 🎁',
                    vi: 'Miễn phí — quà cấp độ 🎁',
                    id: 'Gratis — hadiah level 🎁',
                    tr: 'Ücretsiz — seviye hediyesi 🎁',
                    pl: 'Za darmo — prezent za poziom 🎁',
                  })}
                </Text>
              ) : (
                <>
                  <Image
                    source={oskolokImageForPackShards(LEAGUE_GROUP_BOOST_COST_SHARDS, themeMode)}
                    style={{ width:20, height:20 }}
                    contentFit="contain"
                  />
                  <Text style={{ color:t.textPrimary, fontSize:f.body, fontWeight:'900' }}>
                    {LEAGUE_GROUP_BOOST_COST_SHARDS}
                  </Text>
                </>
              )}
            </View>
          </View>
        )}
        cancelLabel={triLang(lang, {
          ru: 'Отмена',
          uk: 'Скасувати',
          es: 'Cancelar',
          'pt-BR': 'Cancelar',
          vi: 'Hủy',
          id: 'Batal',
          tr: 'İptal',
          pl: 'Anuluj',
        })}
        confirmLabel={groupBoostBuying
          ? triLang(lang, {
            ru: 'Включаем...',
            uk: 'Вмикаємо...',
            es: 'Activando...',
            'pt-BR': 'Ativando...',
            vi: 'Đang bật...',
            id: 'Mengaktifkan...',
            tr: 'Açılıyor...',
            pl: 'Włączamy...',
          })
          : (freeBoostGiftReady
            ? triLang(lang, {
              ru: 'Включить бесплатно',
              uk: 'Увімкнути безкоштовно',
              es: 'Activar gratis',
              'pt-BR': 'Ativar grátis',
              vi: 'Bật miễn phí',
              id: 'Aktifkan gratis',
              tr: 'Ücretsiz aç',
              pl: 'Włącz za darmo',
            })
            : triLang(lang, {
              ru: `Включить за ${LEAGUE_GROUP_BOOST_COST_SHARDS}`,
              uk: `Увімкнути за ${LEAGUE_GROUP_BOOST_COST_SHARDS}`,
              es: `Activar por ${LEAGUE_GROUP_BOOST_COST_SHARDS}`,
              'pt-BR': `Ativar por ${LEAGUE_GROUP_BOOST_COST_SHARDS}`,
              vi: `Bật với ${LEAGUE_GROUP_BOOST_COST_SHARDS}`,
              id: `Aktifkan seharga ${LEAGUE_GROUP_BOOST_COST_SHARDS}`,
              tr: `${LEAGUE_GROUP_BOOST_COST_SHARDS} karşılığında aç`,
              pl: `Włącz za ${LEAGUE_GROUP_BOOST_COST_SHARDS}`,
            }))}
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
