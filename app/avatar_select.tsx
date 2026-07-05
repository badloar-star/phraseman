import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TapScale from '../components/TapScale';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useFocusEffect, useRouter } from 'expo-router';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import {
  ARENA_PASS_AURA_PREFIX,
  AVATAR_AURA_BUY_COST,
  AVATAR_AURA_GIFT_OWNED_KEY,
  AVATAR_AURA_OWNED_KEY,
  AVATAR_AURAS,
  NO_AVATAR_AURA_ID,
  PREMIUM_AVATAR_AURA_ID,
  VIP_AVATAR_AURA_ID,
  USER_AVATAR_AURA_KEY,
  getAvatarAuraById,
  isAvatarAuraUnlockedByLevel,
  isPremiumAvatarAura,
  isRewardOnlyAvatarAura,
  normalizeAvatarAuraId,
  type AvatarAuraDef,
} from '../constants/avatar_auras';
import {
  CUSTOM_AVATAR_BUY_COST,
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATAR_GIFT_ONLY,
  CUSTOM_AVATAR_OWNED_KEY,
  CUSTOM_AVATAR_RESTYLE_COST,
  CUSTOM_AVATAR_SHOP,
  CustomAvatarLogoColor,
  CustomAvatarDef,
  customAvatarGradientNameForLang,
  isCustomAvatarGiftOnly,
  makeCustomAvatarValue,
  parseCustomAvatarValue,
} from '../constants/custom_avatars';
import { triLang } from '../constants/i18n';
import CustomAvatarBadge from '../components/CustomAvatarBadge';
import AvatarView from '../components/AvatarView';
import AvatarAura from '../components/AvatarAura';
import PlusBadge from '../components/PlusBadge';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import { ENABLE_PROFILE_CARD } from './config';
import { getShardsBalance, spendShards } from './shards_system';
import { oskolokImageForPackShards } from './oskolok';
import { actionToastTri, emitAppEvent } from './events';
import { syncToCloud } from './cloud_sync';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { updateMyGroupPoints } from './firestore_leagues';
import { getVerifiedRealPremiumStatus, getVerifiedVipStatus } from './premium_guard';
import { parseWeekPointsForWeek } from './hall_of_fame_utils';
import { COSMETIC_GIFT_OWNED_AVATAR_KEY } from './level_gift_system';
import { fetchActivityLikeTotal } from './friend_activity_likes';
import { getCanonicalUserId } from './user_id_policy';
import {
  getNextProfileCardLevel,
  getProfileCardLevelDef,
  getProfileCardSnapshot,
  normalizeProfileCardLevel,
  PROFILE_CARD_GRADIENTS,
  PROFILE_CARD_LEVEL_NAME_RU,
  PROFILE_CARD_SURFACES,
  PROFILE_CARD_THEME_COLORS,
  themeForProfileCardLevel,
  type ProfileCardLevel,
  type ProfileCardMotion,
  type ProfileCardSnapshot,
  type ProfileCardTheme,
} from './profile_card_system';
import { profileCardLevelLabel } from '../components/profileCardLabel';

type OwnedAvatars = Record<string, string>;
type OwnedAuras = Record<string, true>;

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_PAD = 16;
const GRID_COLS = 3;
const CELL_W = Math.floor((SCREEN_W - GRID_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
const CUSTOM_AVATAR_CELL_H = Math.max(124, Math.round(CELL_W * 1.22));
const CUSTOM_AVATAR_SLOT_SIZE = Math.min(96, Math.round(CELL_W * 0.82));
const CUSTOM_AVATAR_BADGE_SIZE = Math.min(82, Math.round(CELL_W * 0.68));
const AVATAR_DISPLAY_CLOUD_SYNC_DEFER_MS = 30_000;

type AvatarDisplayCloudSyncMode = 'immediate' | 'deferred';

function syncAvatarDisplayToCloud(mode: AvatarDisplayCloudSyncMode): void {
  if (mode === 'immediate') {
    void syncToCloud({ forceNow: true });
    return;
  }
  void syncToCloud({ deferMs: AVATAR_DISPLAY_CLOUD_SYNC_DEFER_MS });
}

type ProfileCardPreviewVisual = {
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

// Цвета/градиенты уровней живут в profile_card_system.ts — один источник для
// превью здесь, экрана апгрейда и модалки профиля.
const buildProfileCardPreviewVisual = (theme: ProfileCardTheme): Omit<ProfileCardPreviewVisual, 'theme' | 'motion'> => ({
  gradient: PROFILE_CARD_GRADIENTS[theme],
  ...PROFILE_CARD_THEME_COLORS[theme],
  ...PROFILE_CARD_SURFACES[theme],
});

const PROFILE_CARD_PREVIEW_VISUALS: Record<ProfileCardTheme, Omit<ProfileCardPreviewVisual, 'theme' | 'motion'>> = {
  classic: buildProfileCardPreviewVisual('classic'),
  gold: buildProfileCardPreviewVisual('gold'),
  emerald: buildProfileCardPreviewVisual('emerald'),
  sapphire: buildProfileCardPreviewVisual('sapphire'),
  amethyst: buildProfileCardPreviewVisual('amethyst'),
  legend: buildProfileCardPreviewVisual('legend'),
};

const encodeOwnedStyle = (gradientId: string, logoColor: CustomAvatarLogoColor) => `${gradientId}:${logoColor}`;
const decodeOwnedStyle = (value?: string | null): { gradientId: string; logoColor: CustomAvatarLogoColor } => {
  if (!value) return { gradientId: CUSTOM_AVATAR_GRADIENTS[0].id, logoColor: 'black' };
  const parts = String(value).split(':');
  return {
    gradientId: parts[0] || CUSTOM_AVATAR_GRADIENTS[0].id,
    logoColor: parts[1] === 'white' ? 'white' : 'black',
  };
};

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const withGradientAlpha = (color: string, alpha: string): string =>
  HEX_COLOR_RE.test(color) ? `${color}${alpha}` : color;

const customGradientOptionColors = (
  colors: readonly [string, string, string],
  selected: boolean,
): [string, string, string] => [
  withGradientAlpha(colors[0], selected ? '66' : '2E'),
  withGradientAlpha(colors[1], selected ? '4D' : '24'),
  withGradientAlpha(colors[2], selected ? '3D' : '18'),
];

const normalizeProfileCardSnapshotForPreview = (snapshot?: Partial<ProfileCardSnapshot> | null): ProfileCardSnapshot => {
  const level = normalizeProfileCardLevel(snapshot?.level);
  return {
    level,
    theme: themeForProfileCardLevel(level),
    motion: 'none',
    publicFocus: 'balanced',
  };
};

const getProfileCardPreviewVisual = (snapshot: ProfileCardSnapshot): ProfileCardPreviewVisual => {
  const theme = themeForProfileCardLevel(snapshot.level);
  const motion = 'none';
  return { theme, motion, ...PROFILE_CARD_PREVIEW_VISUALS[theme] };
};

function ShardCost({
  amount,
  color,
  fontSize = 11,
  iconSize = 14,
}: { amount: number; color: string; fontSize?: number; iconSize?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Text style={{ color, fontSize, fontWeight: '900' }}>{amount}</Text>
      <Image source={oskolokImageForPackShards(amount)} style={{ width: iconSize, height: iconSize }} contentFit="contain" />
    </View>
  );
}

const readOwnedAvatars = async (): Promise<OwnedAvatars> => {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_AVATAR_OWNED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const readOwnedAuras = async (): Promise<OwnedAuras> => {
  try {
    const raw = await AsyncStorage.getItem(AVATAR_AURA_OWNED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeProfileAvatarSnapshot = async (avatar: string, level: number, aura?: string | null) => {
  try {
    const [[, nameRaw], [, xpRaw], [, langRaw], [, weekRaw], [, streakRaw], [, leagueRaw], [, frameRaw]] =
      await AsyncStorage.multiGet([
        'user_name',
        'user_total_xp',
        'app_lang',
        'week_points_v2',
        'streak_count',
        'league_state_v3',
        'user_frame',
      ]);
    const totalXp = parseInt(xpRaw || '0', 10) || 0;
    const weekPoints = parseWeekPointsForWeek(weekRaw);
    let leagueId: number | undefined;
    try { if (leagueRaw) leagueId = JSON.parse(leagueRaw).leagueId; } catch {}
    const name = (nameRaw || '').trim() || `Level ${level}`;
    const streak = parseInt(streakRaw || '0', 10) || undefined;
    const [realPremium, vip] = await Promise.all([
      getVerifiedRealPremiumStatus().catch(() => false),
      getVerifiedVipStatus().catch(() => false),
    ]);
    await syncPublicProfileSnapshot({
      reason: 'display_change',
      name,
      totalXp,
      weekPoints,
      lang: langRaw || 'ru',
      avatar,
      streak,
      leagueId,
      frame: frameRaw || undefined,
      aura: aura || undefined,
      isPremium: realPremium,
      isVip: vip,
    });
    await updateMyGroupPoints(weekPoints);
  } catch {}
};

const invalidateAvatarDependentCaches = async (nextAvatar: string, nextAura?: string | null) => {
  try {
    const leagueRaw = await AsyncStorage.getItem('league_state_v3');
    if (leagueRaw) {
      const league = JSON.parse(leagueRaw);
      if (Array.isArray(league?.group)) {
        league.group = league.group.map((member: any) =>
          member?.isMe ? { ...member, avatar: nextAvatar, aura: nextAura ?? '' } : member,
        );
        await AsyncStorage.setItem('league_state_v3', JSON.stringify(league));
      }
    }
  } catch {}

  await AsyncStorage.multiRemove([
    'global_lb_cache_v4',
    'leaderboard_cache_v1',
    'arena_top100_snapshot_v8',
    'arena_top100_remote_at_v1',
    'arena_rating_screen_cache_v1',
    'club_remote_refresh_at_v2',
    'friend_profiles_cache_v1',
    'friends_tab_swr_v1',
    'friends_activity_feed_v2',
    'friends_activity_feed_v1',
  ]).catch(() => {});
};

export default function AvatarSelect() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { theme: t, f, themeMode } = useTheme();
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onAnimatedScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const avatarAccent = '#A78BFA';
  const { lang } = useLang();
  const { isPremium, isVip } = usePremium();
  const hasPlusAuraAccess = isPremium || isVip;
  // Both status auras are Plus variants for users: paid Plus and admin-granted
  // Plus unlock the same cosmetics.
  const isUK = lang === 'uk';
  const [level, setLevel] = useState(1);
  const [shards, setShards] = useState(0);
  const [activeAvatar, setActiveAvatar] = useState<string>('1');
  const [owned, setOwned] = useState<OwnedAvatars>({});
  const [ownedAuras, setOwnedAuras] = useState<OwnedAuras>({});
  const [activeAuraId, setActiveAuraId] = useState<string | null>(null);
  const [giftedAuraId, setGiftedAuraId] = useState<string | null>(null);
  const [giftedAvatarId, setGiftedAvatarId] = useState<string | null>(null);
  const [draftAvatar, setDraftAvatar] = useState<CustomAvatarDef | null>(null);
  const [pendingAuraPurchase, setPendingAuraPurchase] = useState<AvatarAuraDef | null>(null);
  const [draftGradientId, setDraftGradientId] = useState(CUSTOM_AVATAR_GRADIENTS[0].id);
  const [draftLogoColor, setDraftLogoColor] = useState<CustomAvatarLogoColor>('black');
  const [busy, setBusy] = useState(false);
  const [userName, setUserName] = useState('User');
  const [totalXp, setTotalXp] = useState(0);
  const [weekPoints, setWeekPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [activityLikeTotal, setActivityLikeTotal] = useState(0);
  const [leagueId, setLeagueId] = useState(0);
  const [profileCardSnapshot, setProfileCardSnapshot] = useState<ProfileCardSnapshot>(DEFAULT_PROFILE_CARD_SNAPSHOT);

  const activeCustom = useMemo(() => parseCustomAvatarValue(activeAvatar), [activeAvatar]);
  const showProfileCardSection = ENABLE_PROFILE_CARD;
  const auraExplicitlyDisabled = activeAuraId === NO_AVATAR_AURA_ID;
  const effectiveAuraId = auraExplicitlyDisabled ? null : activeAuraId || (isPremium ? PREMIUM_AVATAR_AURA_ID : isVip ? VIP_AVATAR_AURA_ID : null);
  const profileCardVisual = useMemo(() => getProfileCardPreviewVisual(profileCardSnapshot), [profileCardSnapshot]);
  const nextProfileCardLevel = useMemo(() => getNextProfileCardLevel(profileCardSnapshot.level), [profileCardSnapshot.level]);
  const nextProfileCardDef = useMemo(
    () => (nextProfileCardLevel === null ? null : getProfileCardLevelDef(nextProfileCardLevel)),
    [nextProfileCardLevel],
  );
  const auraName = useCallback(
    (aura: AvatarAuraDef) => triLang(lang, {
      ru: aura.nameRu,
      uk: aura.nameUk,
      es: aura.nameEs,
      'pt-BR': aura.namePtBr,
      vi: aura.nameVi,
      id: aura.nameId,
      tr: aura.nameTr,
      pl: aura.namePl,
    }),
    [lang],
  );
  const visibleCustomAvatars = useMemo(
    () => [
      ...CUSTOM_AVATAR_SHOP,
      ...CUSTOM_AVATAR_GIFT_ONLY.filter((avatar) => !!owned[avatar.id]),
    ],
    [owned],
  );

  const load = useCallback(async () => {
    try {
      const [
        [, xpRaw],
        [, avatarRaw],
        [, giftedRaw],
        [, auraRaw],
        [, giftedAuraRaw],
        [, nameRaw],
        [, weekRaw],
        [, streakRaw],
        [, leagueRaw],
      ] = await AsyncStorage.multiGet([
        'user_total_xp',
        'user_avatar',
        COSMETIC_GIFT_OWNED_AVATAR_KEY,
        USER_AVATAR_AURA_KEY,
        AVATAR_AURA_GIFT_OWNED_KEY,
        'user_name',
        'week_points_v2',
        'streak_count',
        'league_state_v3',
      ]);
      const xp = parseInt(xpRaw || '0', 10) || 0;
      const lvl = getLevelFromXP(xp);
      const nextOwned = await readOwnedAvatars();
      const nextOwnedAuras = await readOwnedAuras();
      const nextProfileCardSnapshot = await getProfileCardSnapshot();
      let nextLeagueId = 0;
      try {
        const parsed = leagueRaw ? JSON.parse(leagueRaw) : null;
        nextLeagueId = Math.max(0, Math.floor(Number(parsed?.leagueId) || 0));
      } catch {}
      setLevel(lvl);
      setTotalXp(xp);
      setUserName((nameRaw || '').trim() || `Level ${lvl}`);
      setWeekPoints(parseWeekPointsForWeek(weekRaw));
      setStreak(Math.max(0, parseInt(streakRaw || '0', 10) || 0));
      setLeagueId(nextLeagueId);
      setProfileCardSnapshot(normalizeProfileCardSnapshotForPreview(nextProfileCardSnapshot));
      setOwned(nextOwned);
      setOwnedAuras(nextOwnedAuras);
      setGiftedAvatarId(giftedRaw || null);
      setGiftedAuraId(giftedAuraRaw || null);
      const storedAura = normalizeAvatarAuraId(auraRaw) ?? null;
      const storedAuraDef = getAvatarAuraById(storedAura);
      const storedAuraLockedByLevel = !!storedAuraDef?.unlockLevel
        && !isAvatarAuraUnlockedByLevel(storedAuraDef, lvl)
        && !nextOwnedAuras[storedAuraDef.id];
      const storedAuraLockedByPremium = isPremiumAvatarAura(storedAura) && !isPremium;
      const storedAuraLockedByVip = storedAura === VIP_AVATAR_AURA_ID && !isVip;
      setActiveAuraId(storedAura && !storedAuraLockedByLevel && !storedAuraLockedByPremium && !storedAuraLockedByVip ? storedAura : null);
      setActiveAvatar(avatarRaw || getBestAvatarForLevel(lvl));
      setShards(await getShardsBalance());
      getCanonicalUserId()
        .then((uid) => fetchActivityLikeTotal(uid || ''))
        .then(setActivityLikeTotal)
        .catch(() => setActivityLikeTotal(0));
    } catch {}
  }, [isPremium, isVip]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getShardsBalance()
        .then((balance) => {
          if (!cancelled) setShards(balance);
        })
        .catch(() => {});
      getProfileCardSnapshot()
        .then((snapshot) => {
          if (!cancelled) setProfileCardSnapshot(normalizeProfileCardSnapshotForPreview(snapshot));
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const showToast = (
    type: 'info' | 'success' | 'error',
    m: { ru: string; uk: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string },
  ) => {
    emitAppEvent('action_toast', actionToastTri(type, m));
  };

  const openAvatar = (avatar: CustomAvatarDef) => {
    hapticTap();
    const ownedStyle = decodeOwnedStyle(owned[avatar.id]);
    const currentGradient = activeCustom?.avatarId === avatar.id ? activeCustom.gradientId : ownedStyle.gradientId;
    const currentLogoColor = activeCustom?.avatarId === avatar.id ? activeCustom.logoColor : ownedStyle.logoColor;
    setDraftAvatar(avatar);
    setDraftGradientId(currentGradient);
    setDraftLogoColor(currentLogoColor);
  };

  const persistAvatar = async (
    nextAvatar: string,
    nextOwned: OwnedAvatars,
    cloudSyncMode: AvatarDisplayCloudSyncMode = 'deferred',
  ) => {
    const frameId = getBestFrameForLevel(level).id;
    await AsyncStorage.multiSet([
      ['user_avatar', nextAvatar],
      ['user_frame', frameId],
      [USER_AVATAR_AURA_KEY, activeAuraId || ''],
      [CUSTOM_AVATAR_OWNED_KEY, JSON.stringify(nextOwned)],
    ]);
    await invalidateAvatarDependentCaches(nextAvatar, activeAuraId);
    setActiveAvatar(nextAvatar);
    setOwned(nextOwned);
    emitAppEvent('xp_changed');
    syncAvatarDisplayToCloud(cloudSyncMode);
    void writeProfileAvatarSnapshot(nextAvatar, level, activeAuraId);
  };

  const applyDraft = async () => {
    if (!draftAvatar || busy) return;
    const avatarId = draftAvatar.id;
    const wasOwned = !!owned[avatarId];
    const giftOnly = isCustomAvatarGiftOnly(avatarId);
    if (giftOnly && !wasOwned) {
      setDraftAvatar(null);
      showToast('info', {
        ru: 'Этот аватар можно получить только подарком',
        uk: 'Цей аватар можна отримати лише в подарунок',
        es: 'Este avatar solo se consigue como regalo',
        'pt-BR': 'Este avatar só pode ser obtido como presente',
        vi: 'Avatar này chỉ có thể nhận được khi được tặng',
        id: 'Avatar ini hanya bisa didapatkan sebagai hadiah',
        tr: 'Bu avatar yalnızca hediye olarak alınabilir',
        pl: 'Ten awatar można zdobyć tylko w prezencie',
      });
      return;
    }
    const previousStyle = decodeOwnedStyle(owned[avatarId]);
    const styleChanged = wasOwned && (
      previousStyle.gradientId !== draftGradientId ||
      previousStyle.logoColor !== draftLogoColor
    );
    const cost = wasOwned ? (styleChanged ? CUSTOM_AVATAR_RESTYLE_COST : 0) : CUSTOM_AVATAR_BUY_COST;

    setBusy(true);
    try {
      const currentShards = await getShardsBalance();
      setShards(currentShards);
      if (cost > 0 && currentShards < cost) {
        setDraftAvatar(null);
        router.push({
          pathname: '/shards_shop',
          params: {
            need: String(Math.max(0, cost - currentShards)),
            source: wasOwned ? 'custom_avatar_restyle' : 'custom_avatar',
          },
        } as any);
        return;
      }

      if (cost > 0) {
        const ok = await spendShards(cost, wasOwned ? 'custom_avatar_restyle' : 'custom_avatar');
        if (!ok) {
          showToast('error', {
            ru: 'Осколки не списались. Попробуй ещё раз.',
            uk: 'Уламки не списалися. Спробуй ще раз.',
            es: 'No se descontaron los fragmentos. Inténtalo de nuevo.',
            'pt-BR': 'Os fragmentos não foram descontados. Tente novamente.',
            vi: 'Chưa trừ được mảnh. Hãy thử lại.',
            id: 'Shard tidak terpotong. Coba lagi.',
            tr: 'Parçalar düşülmedi. Tekrar dene.',
            pl: 'Nie odjęto odłamków. Spróbuj ponownie.',
          });
          return;
        }
      }
      const nextOwned = { ...owned, [avatarId]: encodeOwnedStyle(draftGradientId, draftLogoColor) };
      const nextAvatar = makeCustomAvatarValue(avatarId, draftGradientId, draftLogoColor);
      await persistAvatar(nextAvatar, nextOwned, cost > 0 ? 'immediate' : 'deferred');
      setShards(await getShardsBalance());
      setDraftAvatar(null);
      showToast('success', wasOwned
        ? {
            ru: 'Аватар применен',
            uk: 'Аватар застосовано',
            es: 'Avatar aplicado',
            'pt-BR': 'Avatar aplicado',
            vi: 'Đã áp dụng avatar',
            id: 'Avatar diterapkan',
            tr: 'Avatar uygulandı',
            pl: 'Awatar zastosowany',
          }
        : {
            ru: 'Аватар куплен',
            uk: 'Аватар придбано',
            es: 'Avatar comprado',
            'pt-BR': 'Avatar comprado',
            vi: 'Đã mua avatar',
            id: 'Avatar dibeli',
            tr: 'Avatar satın alındı',
            pl: 'Awatar kupiony',
          });
      if (!wasOwned) {
        const { checkAchievements } = await import('./achievements');
        void checkAchievements({ type: 'avatar_custom_set' });
      }
    } finally {
      setBusy(false);
    }
  };

  const applyAura = async (aura: AvatarAuraDef | null, purchaseConfirmed = false) => {
    if (busy) return;
    const previousAuraId = activeAuraId;
    let appliedOptimistic = false;
    hapticTap();
    setBusy(true);
    try {
      if (!aura) {
        setActiveAuraId(NO_AVATAR_AURA_ID);
        appliedOptimistic = true;
        await AsyncStorage.setItem(USER_AVATAR_AURA_KEY, NO_AVATAR_AURA_ID);
        await invalidateAvatarDependentCaches(activeAvatar, NO_AVATAR_AURA_ID);
        setActiveAuraId(NO_AVATAR_AURA_ID);
        emitAppEvent('xp_changed');
        syncAvatarDisplayToCloud('deferred');
        void writeProfileAvatarSnapshot(activeAvatar, level, NO_AVATAR_AURA_ID);
        showToast('success', {
          ru: 'Аура выключена',
          uk: 'Ауру вимкнено',
          es: 'Aura desactivada',
          'pt-BR': 'Aura desativada',
          vi: 'Đã tắt hào quang',
          id: 'Aura dimatikan',
          tr: 'Aura kapatıldı',
          pl: 'Aura wyłączona',
        });
        return;
      }

      const isPremiumAura = aura.premiumOnly === true;
      const isVipAura = aura.vipOnly === true;
      const isRewardOnlyAura = aura.rewardOnly === true;
      const unlockedByLevel = isAvatarAuraUnlockedByLevel(aura, level);
      const isOwned = isPremiumAura || isVipAura ? hasPlusAuraAccess : unlockedByLevel || !!ownedAuras[aura.id];
      let purchasedAura = false;
      if (isOwned) {
        setActiveAuraId(aura.id);
        appliedOptimistic = true;
      }
      if (!isOwned) {
        if (isPremiumAura || isVipAura) {
          router.push({ pathname: '/premium_modal', params: { context: 'avatar_aura' } } as any);
          return;
        }
        if (isRewardOnlyAura) {
          // Сезонные / наградные ауры Арены не продаются — их можно только заработать.
          showToast('info', {
            ru: 'Награда Арены — её нельзя купить, только заработать в сезоне',
            uk: 'Нагорода Арени — її не можна купити, лише заробити в сезоні',
            es: 'Recompensa de la Arena: no se compra, solo se gana en la temporada',
            'pt-BR': 'Recompensa da Arena: não pode ser comprada, só ganha na temporada',
            vi: 'Phần thưởng Đấu trường — không thể mua, chỉ giành được trong mùa giải',
            id: 'Hadiah Arena — tidak bisa dibeli, hanya diraih di musim ini',
            tr: 'Arena ödülü — satın alınamaz, yalnızca sezonda kazanılır',
            pl: 'Nagroda Areny — nie można jej kupić, tylko zdobyć w sezonie',
          });
          return;
        }
        if (aura.unlockLevel !== undefined) {
          showToast('info', {
            ru: `Откроется на уровне ${aura.unlockLevel}`,
            uk: `Відкриється на рівні ${aura.unlockLevel}`,
            es: `Se desbloquea en el nivel ${aura.unlockLevel}`,
            'pt-BR': `Desbloqueia no nível ${aura.unlockLevel}`,
            vi: `Mở khóa ở cấp ${aura.unlockLevel}`,
            id: `Terbuka di level ${aura.unlockLevel}`,
            tr: `${aura.unlockLevel}. seviyede açılır`,
            pl: `Odblokuje się na poziomie ${aura.unlockLevel}`,
          });
          return;
        }
        const currentShards = await getShardsBalance();
        setShards(currentShards);
        if (currentShards < AVATAR_AURA_BUY_COST) {
          router.push({
            pathname: '/shards_shop',
            params: { need: String(AVATAR_AURA_BUY_COST - currentShards), source: 'avatar_aura' },
          } as any);
          return;
        }
        if (!purchaseConfirmed) {
          setPendingAuraPurchase(aura);
          return;
        }
        const ok = await spendShards(AVATAR_AURA_BUY_COST, 'avatar_aura');
        if (!ok) {
          showToast('error', {
            ru: 'Осколки не списались. Попробуй ещё раз.',
            uk: 'Уламки не списалися. Спробуй ще раз.',
            es: 'No se descontaron los fragmentos. Inténtalo de nuevo.',
            'pt-BR': 'Os fragmentos não foram descontados. Tente novamente.',
            vi: 'Chưa trừ được mảnh. Hãy thử lại.',
            id: 'Shard tidak terpotong. Coba lagi.',
            tr: 'Parçalar düşülmedi. Tekrar dene.',
            pl: 'Nie odjęto odłamków. Spróbuj ponownie.',
          });
          return;
        }
        const nextOwnedAuras: OwnedAuras = { ...ownedAuras, [aura.id]: true };
        await AsyncStorage.setItem(AVATAR_AURA_OWNED_KEY, JSON.stringify(nextOwnedAuras));
        setOwnedAuras(nextOwnedAuras);
        setShards(await getShardsBalance());
        purchasedAura = true;
      }

      await AsyncStorage.setItem(USER_AVATAR_AURA_KEY, aura.id);
      await invalidateAvatarDependentCaches(activeAvatar, aura.id);
      setActiveAuraId(aura.id);
      emitAppEvent('xp_changed');
      syncAvatarDisplayToCloud(purchasedAura ? 'immediate' : 'deferred');
      void writeProfileAvatarSnapshot(activeAvatar, level, aura.id);
      showToast('success', isOwned
        ? {
            ru: 'Аура применена',
            uk: 'Ауру застосовано',
            es: 'Aura aplicada',
            'pt-BR': 'Aura aplicada',
            vi: 'Đã áp dụng hào quang',
            id: 'Aura diterapkan',
            tr: 'Aura uygulandı',
            pl: 'Aura zastosowana',
          }
        : {
            ru: 'Аура открыта',
            uk: 'Ауру відкрито',
            es: 'Aura desbloqueada',
            'pt-BR': 'Aura desbloqueada',
            vi: 'Đã mở khóa hào quang',
            id: 'Aura terbuka',
            tr: 'Aura açıldı',
            pl: 'Aura odblokowana',
          });
    } catch {
      if (appliedOptimistic) {
        setActiveAuraId(previousAuraId);
      }
      showToast('error', {
        ru: 'Аура не применилась. Попробуй ещё раз.',
        uk: 'Ауру не вдалося застосувати. Спробуй ще раз.',
        es: 'No se pudo aplicar el aura. Inténtalo de nuevo.',
        'pt-BR': 'Não foi possível aplicar a aura. Tente novamente.',
        vi: 'Không áp dụng được hào quang. Hãy thử lại.',
        id: 'Aura gagal diterapkan. Coba lagi.',
        tr: 'Aura uygulanamadı. Tekrar dene.',
        pl: 'Nie udało się zastosować aury. Spróbuj ponownie.',
      });
    } finally {
      setBusy(false);
    }
  };

  const resetToLevelAvatar = async () => {
    if (busy) return;
    const previousAvatar = activeAvatar;
    hapticTap();
    setBusy(true);
    try {
      const nextAvatar = getBestAvatarForLevel(level);
      setActiveAvatar(nextAvatar);
      await persistAvatar(nextAvatar, owned);
      showToast('success', {
        ru: 'Вернули обычный аватар уровня',
        uk: 'Повернули звичайний аватар рівня',
        es: 'Restauramos el avatar normal del nivel',
        'pt-BR': 'Restauramos o avatar normal do nível',
        vi: 'Đã khôi phục avatar thường của cấp',
        id: 'Avatar level biasa dikembalikan',
        tr: 'Seviyenin normal avatarına dönüldü',
        pl: 'Przywrócono zwykły awatar poziomu',
      });
    } catch {
      setActiveAvatar(previousAvatar);
      showToast('error', {
        ru: 'Аватар не применился. Попробуй ещё раз.',
        uk: 'Аватар не вдалося застосувати. Спробуй ще раз.',
        es: 'No se pudo aplicar el avatar. Inténtalo de nuevo.',
        'pt-BR': 'Não foi possível aplicar o avatar. Tente novamente.',
        vi: 'Không áp dụng được avatar. Hãy thử lại.',
        id: 'Avatar gagal diterapkan. Coba lagi.',
        tr: 'Avatar uygulanamadı. Tekrar dene.',
        pl: 'Nie udało się zastosować awatara. Spróbuj ponownie.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenGradient>
      <View testID="screen-avatar-select" style={{ flex: 1 }}>
      <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
          <TapScale
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}
            onPress={() => { hapticTap(); safeRouterBack(router); }}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TapScale>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', flex: 1 }}>Кастомизация</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: avatarAccent, fontSize: 16, fontWeight: '900' }}>{shards}</Text>
            <Image source={oskolokImageForPackShards(shards)} style={{ width: 20, height: 20 }} contentFit="contain" />
          </View>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 14 }}>
          <AvatarView avatar={activeAvatar} level={level} size={82} auraId={effectiveAuraId} />
          <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8 }}>Текущий аватар</Text>
        </View>

        {activeCustom && (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={resetToLevelAvatar}
              style={{ borderRadius: 16, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgCard, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>Вернуть аватар уровня</Text>
            </TouchableOpacity>
          </View>
        )}

      <BouncyWrap>
      <Reanimated.ScrollView decelerationRate="normal" bounces alwaysBounceVertical overScrollMode="always" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GRID_PAD, paddingBottom: bottomInset + 18 }} onScroll={onAnimatedScroll} scrollEventThrottle={16}>
        {showProfileCardSection ? (
        <View style={{ marginBottom: 18 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', marginBottom: 8 }}>Карточка профиля</Text>
          {/* Компактная строка-вход в одношаговый Pro-апгрейд карточки. */}
          <TouchableOpacity
            testID="avatar-profile-card-entry"
            activeOpacity={0.86}
            onPress={() => { hapticTap(); router.push('/profile_card_upgrade' as any); }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: profileCardVisual.accentStrong,
              backgroundColor: t.bgCard,
              paddingHorizontal: 14,
              paddingVertical: 13,
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: profileCardVisual.accentSoft, borderWidth: 1, borderColor: profileCardVisual.accentStrong }}>
              <Ionicons name="card" size={22} color={profileCardVisual.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>
                {profileCardLevelLabel(profileCardSnapshot.level, lang === 'ru')}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>
                {nextProfileCardDef
                  ? `Новая: ${lang === 'ru' ? PROFILE_CARD_LEVEL_NAME_RU[nextProfileCardLevel as ProfileCardLevel] : (nextProfileCardDef.name)} · ${nextProfileCardDef.cost}`
                  : 'Максимальный уровень'}
              </Text>
            </View>
            {nextProfileCardDef ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: profileCardVisual.accent, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: monoIcon(themeMode, '#111827', MONO_ICON.onLight), fontSize: f.sub, fontWeight: '900' }}>Открыть</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
            )}
          </TouchableOpacity>
        </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, justifyContent: 'center' }}>
          {visibleCustomAvatars.map((avatar) => {
            const isOwned = !!owned[avatar.id];
            const isGifted = isOwned && (giftedAvatarId === avatar.id || isCustomAvatarGiftOnly(avatar.id));
            const ownedStyle = decodeOwnedStyle(owned[avatar.id]);
            const gradientId = ownedStyle.gradientId;
            const logoColor = ownedStyle.logoColor;
            const isActive = activeCustom?.avatarId === avatar.id;
            return (
              <TouchableOpacity
                key={avatar.id}
                activeOpacity={0.78}
                onPress={() => openAvatar(avatar)}
                style={{
                  width: CELL_W,
                  height: CUSTOM_AVATAR_CELL_H,
                  borderRadius: 18,
                  borderWidth: isActive ? 2 : 1,
                  borderColor: isActive ? t.accent : t.border,
                  backgroundColor: t.bgCard,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  paddingHorizontal: 6,
                  paddingVertical: 8,
                }}
              >
                <View style={{ width: '100%', height: CUSTOM_AVATAR_SLOT_SIZE, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                  <CustomAvatarBadge
                    avatarId={avatar.id}
                    gradientId={gradientId}
                    logoColor={logoColor}
                    size={CUSTOM_AVATAR_BADGE_SIZE}
                    style={{ alignSelf: 'center' }}
                  />
                </View>
                <View style={{ width: '100%', marginTop: 6, minHeight: 17, alignItems: 'center', justifyContent: 'center' }}>
                  {isOwned
                    ? (
                      <Text
                        numberOfLines={1}
                        style={{ width: '100%', color: isGifted ? t.accent : t.textPrimary, fontSize: 11, fontWeight: '900', textAlign: 'center' }}
                      >
                        {isGifted ? 'Получено' : 'Куплен'}
                      </Text>
                    )
                    : <ShardCost amount={CUSTOM_AVATAR_BUY_COST} color={t.textMuted} fontSize={13} iconSize={16} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: 18, marginBottom: 10 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', marginBottom: 8 }}>Аура</Text>
          <ScrollView horizontal decelerationRate="normal" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => { void applyAura(null); }}
              style={{
                width: 82,
                minHeight: 96,
                borderRadius: 16,
                borderWidth: !effectiveAuraId ? 2 : 1,
                borderColor: !effectiveAuraId ? t.accent : t.border,
                backgroundColor: t.bgCard,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
              }}
            >
              <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={22} color={t.textMuted} />
              </View>
              <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '800', marginTop: 7 }}>Без ауры</Text>
            </TouchableOpacity>
            {AVATAR_AURAS.map((aura) => {
              const isPremiumAura = aura.premiumOnly === true;
              const isVipAura = aura.vipOnly === true;
              const isRewardOnlyAura = aura.rewardOnly === true;
              const unlockedByLevel = isAvatarAuraUnlockedByLevel(aura, level);
              const isOwned = isPremiumAura || isVipAura ? hasPlusAuraAccess : unlockedByLevel || !!ownedAuras[aura.id];
              const isGifted = !isPremiumAura && !isVipAura && !!ownedAuras[aura.id] && giftedAuraId === aura.id;
              const isActive = effectiveAuraId === aura.id;
              return (
                <TouchableOpacity
                  key={aura.id}
                  activeOpacity={0.78}
                  onPress={() => { void applyAura(aura); }}
                  style={{
                    width: 82,
                    minHeight: 96,
                    borderRadius: 16,
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive ? t.accent : t.border,
                    backgroundColor: t.bgCard,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                  }}
                >
                  <AvatarAura auraId={aura.id} size={54}>
                    <AvatarView avatar={activeAvatar} level={level} size={54} />
                  </AvatarAura>
                  <Text style={{ color: t.textPrimary, fontSize: 10, fontWeight: '900', marginTop: 7 }} numberOfLines={1}>
                    {auraName(aura)}
                  </Text>
                  <View style={{ marginTop: 3, minHeight: 15, justifyContent: 'center' }}>
                    {isOwned
                      ? <Text style={{ color: isGifted ? t.accent : t.textMuted, fontSize: 9, fontWeight: '800' }}>{isGifted ? 'Подарок' : 'Открыта'}</Text>
                      : isPremiumAura || isVipAura
                        ? <PlusBadge themeMode={themeMode} size="xs" />
                        : isRewardOnlyAura
                          ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Ionicons name="lock-closed" size={9} color={t.textMuted} />
                              <Text style={{ color: t.textMuted, fontSize: 9, fontWeight: '900' }}>{aura.id.startsWith(ARENA_PASS_AURA_PREFIX) ? 'Арена' : 'Награда'}</Text>
                            </View>
                          )
                        : aura.unlockLevel !== undefined
                          ? <Text style={{ color: t.textMuted, fontSize: 9, fontWeight: '900' }}>Ур. {aura.unlockLevel}</Text>
                          : <ShardCost amount={AVATAR_AURA_BUY_COST} color={t.textMuted} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Reanimated.ScrollView>
      </BouncyWrap>
      </Reanimated.View>

      <ThemedConfirmModal
        visible={!!pendingAuraPurchase}
        title={triLang(lang, {
          ru: 'Открыть ауру?',
          uk: 'Відкрити ауру?',
          es: '¿Desbloquear el aura?',
          'pt-BR': 'Abrir a aura?',
          vi: 'Mở hào quang?',
          id: 'Buka aura?',
          tr: 'Aurayı aç?',
          pl: 'Odblokować aurę?',
        })}
        messageNode={pendingAuraPurchase ? (
          <View style={{ marginBottom: 22 }}>
            <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: f.body * 1.5 }}>
              {triLang(lang, {
                ru: `Открыть ауру «${auraName(pendingAuraPurchase)}» за осколки?`,
                uk: `Відкрити ауру «${auraName(pendingAuraPurchase)}» за уламки?`,
                es: `¿Desbloquear el aura «${auraName(pendingAuraPurchase)}» con fragmentos?`,
                'pt-BR': `Desbloquear a aura «${auraName(pendingAuraPurchase)}» com fragmentos?`,
                vi: `Mở khóa hào quang «${auraName(pendingAuraPurchase)}» bằng mảnh?`,
                id: `Buka aura «${auraName(pendingAuraPurchase)}» dengan shard?`,
                tr: `«${auraName(pendingAuraPurchase)}» aurasını parçalarla aç?`,
                pl: `Odblokować aurę „${auraName(pendingAuraPurchase)}” za odłamki?`,
              })}
            </Text>
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>Стоимость:</Text>
              <ShardCost amount={AVATAR_AURA_BUY_COST} color={t.textPrimary} />
            </View>
          </View>
        ) : null}
        cancelLabel="Отмена"
        confirmLabel="Купить"
        onCancel={() => setPendingAuraPurchase(null)}
        onConfirm={() => {
          const aura = pendingAuraPurchase;
          setPendingAuraPurchase(null);
          if (aura) void applyAura(aura, true);
        }}
        testIDPrefix="avatar-aura-purchase-confirm"
      />

      <Modal visible={!!draftAvatar} transparent animationType="fade" onRequestClose={() => setDraftAvatar(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' }} onPress={() => setDraftAvatar(null)}>
          <Pressable
            style={{
              backgroundColor: t.bgCard,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              padding: 18,
              paddingBottom: bottomInset + 18,
              borderTopWidth: 1,
              borderColor: t.border,
            }}
          >
            {draftAvatar && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 18 }}>
                  <CustomAvatarBadge avatarId={draftAvatar.id} gradientId={draftGradientId} logoColor={draftLogoColor} size={112} />
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', marginTop: 10 }}>Настройка</Text>
                  {(() => {
                    const previousStyle = decodeOwnedStyle(owned[draftAvatar.id]);
                    const isOwned = !!owned[draftAvatar.id];
                    const styleChanged = isOwned && (
                      previousStyle.gradientId !== draftGradientId ||
                      previousStyle.logoColor !== draftLogoColor
                    );
                    const visibleCost = !isOwned
                      ? CUSTOM_AVATAR_BUY_COST
                      : (styleChanged ? CUSTOM_AVATAR_RESTYLE_COST : 0);
                    if (visibleCost <= 0) return null;
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>{visibleCost}</Text>
                        <Image source={oskolokImageForPackShards(visibleCost)} style={{ width: 18, height: 18 }} contentFit="contain" />
                      </View>
                    );
                  })()}
                </View>

                <ScrollView horizontal decelerationRate="normal" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                  {CUSTOM_AVATAR_GRADIENTS.map((gradient) => {
                    const selected = gradient.id === draftGradientId;
                    const optionColors = customGradientOptionColors(gradient.colors, selected);
                    return (
                      <TouchableOpacity
                        key={gradient.id}
                        activeOpacity={0.78}
                        onPress={() => { hapticTap(); setDraftGradientId(gradient.id); }}
                        style={{
                          width: 78,
                          borderRadius: 14,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? gradient.colors[2] : withGradientAlpha(gradient.colors[2], '66'),
                          backgroundColor: t.bgCard,
                          shadowColor: selected ? gradient.colors[2] : '#000000',
                          shadowOffset: { width: 0, height: selected ? 5 : 2 },
                          shadowOpacity: selected ? 0.22 : 0.08,
                          shadowRadius: selected ? 9 : 3,
                          elevation: selected ? 4 : 1,
                        }}
                      >
                        <LinearGradient
                          colors={optionColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            minHeight: 94,
                            borderRadius: selected ? 12 : 13,
                            overflow: 'hidden',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 7,
                          }}
                        >
                          <CustomAvatarBadge avatarId={draftAvatar.id} gradientId={gradient.id} logoColor={draftLogoColor} size={52} />
                          <Text
                            style={{
                              color: selected ? t.textPrimary : t.textMuted,
                              fontSize: 10,
                              fontWeight: '900',
                              marginTop: 6,
                              textAlign: 'center',
                            }}
                            numberOfLines={1}
                          >
                            {customAvatarGradientNameForLang(gradient, lang)}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>


                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  {(['black', 'white'] as CustomAvatarLogoColor[]).map((color) => {
                    const selected = draftLogoColor === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        activeOpacity={0.8}
                        onPress={() => { hapticTap(); setDraftLogoColor(color); }}
                        style={{
                          flex: 1,
                          borderRadius: 14,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? t.accent : t.border,
                          backgroundColor: color === 'black' ? '#111827' : '#F8FAFC',
                          paddingVertical: 11,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: color === 'black' ? '#FFFFFF' : '#111827', fontSize: f.body, fontWeight: '900' }}>
                          {color === 'black' ? 'Темное' : 'Светлое'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  activeOpacity={0.86}
                  disabled={busy}
                  onPress={applyDraft}
                  style={{
                    marginTop: 18,
                    borderRadius: 16,
                    backgroundColor: busy ? t.textGhost : t.accent,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: t.textOnGold ?? '#111827', fontSize: f.bodyLg, fontWeight: '900' }}>
                    {'Применить'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      </View>
    </ScreenGradient>
  );
}
