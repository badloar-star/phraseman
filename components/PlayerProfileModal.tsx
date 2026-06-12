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
import firestore from '@react-native-firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { CLUBS, clubTierShortName } from '../app/league_engine';
import { arenaTierLabel } from '../app/arena_rating';
import type { RankTier } from '../app/types/arena';
import { getCurrentMultiplierBreakdown, MultiplierBreakdown, normalizeArenaMultipliersFirestore } from '../app/xp_manager';
import { CLOUD_SYNC_ENABLED, ENABLE_DEV_TOOLS, IS_EXPO_GO } from '../app/config';
import { deleteFriend, sendFriendRequest, subscribeToFriends } from '../app/firestore_friend_requests';
import { invalidateFriendsActivityCache } from '../app/firestore_friend_activity';
import { fetchActivityLikeTotal } from '../app/friend_activity_likes';
import { getCanonicalUserId } from '../app/user_id_policy';
import { hapticTap } from '../hooks/use-haptics';
import InGameToast from './InGameToast';
import ThemedConfirmModal from './ThemedConfirmModal';
import ProfileCardUpgradeModal from './ProfileCardUpgradeModal';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { fetchActiveLeagueCrowns } from '../app/services/league_chest_rewards';
import { PREMIUM_AVATAR_AURA_ID, getEffectiveAvatarAuraId } from '../constants/avatar_auras';
import {
  getProfileCardLevelDef,
  getProfileCardSnapshot,
  normalizeProfileCardMotion,
  normalizeProfileCardLevel,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
  profileCardLevelRoman,
  PROFILE_CARD_MAX_LEVEL,
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
const PROFILE_HEADER_ACTION_SIZE = 44;
const PROFILE_HEADER_ACTION_TOP = 14;
const PROFILE_HEADER_ACTION_RIGHT = 14;
const PROFILE_HEADER_ACTION_GAP = 10;

const PROFILE_CARD_VISUALS: Record<ProfileCardTheme, Omit<ProfileCardVisual, 'theme' | 'motion'>> = {
  classic: {
    gradient: ['#202329', '#252931', '#202329'],
    accent: '#94A3B8',
    accentSoft: 'rgba(148,163,184,0.14)',
    accentStrong: 'rgba(148,163,184,0.38)',
    secondary: '#CBD5E1',
    surface: 'rgba(255,255,255,0.055)',
    surfaceBorder: 'rgba(148,163,184,0.16)',
    shadowColor: '#000000',
  },
  gold: {
    gradient: ['#161106', '#2A210D', '#111827'],
    accent: '#FACC15',
    accentSoft: 'rgba(250,204,21,0.16)',
    accentStrong: 'rgba(250,204,21,0.48)',
    secondary: '#FFF2A8',
    surface: 'rgba(250,204,21,0.075)',
    surfaceBorder: 'rgba(250,204,21,0.25)',
    shadowColor: '#FACC15',
  },
  crystal: {
    gradient: ['#06131A', '#0D2732', '#111827'],
    accent: '#67E8F9',
    accentSoft: 'rgba(103,232,249,0.15)',
    accentStrong: 'rgba(103,232,249,0.42)',
    secondary: '#E0F2FE',
    surface: 'rgba(103,232,249,0.07)',
    surfaceBorder: 'rgba(103,232,249,0.22)',
    shadowColor: '#22D3EE',
  },
  ember: {
    gradient: ['#1A090B', '#2A1112', '#15161B'],
    accent: '#FB7185',
    accentSoft: 'rgba(251,113,133,0.15)',
    accentStrong: 'rgba(251,113,133,0.42)',
    secondary: '#FED7AA',
    surface: 'rgba(251,113,133,0.07)',
    surfaceBorder: 'rgba(251,113,133,0.22)',
    shadowColor: '#FB7185',
  },
  aurora: {
    gradient: ['#080B1E', '#14233D', '#1B1230'],
    accent: '#A78BFA',
    accentSoft: 'rgba(167,139,250,0.15)',
    accentStrong: 'rgba(34,211,238,0.36)',
    secondary: '#22D3EE',
    surface: 'rgba(167,139,250,0.075)',
    surfaceBorder: 'rgba(167,139,250,0.22)',
    shadowColor: '#A78BFA',
  },
};

function normalizeProfileCardSnapshotForLevel(raw: Partial<ProfileCardSnapshot> & Partial<PlayerInfo>): ProfileCardSnapshot {
  const level = normalizeProfileCardLevel(raw.profileCardLevel ?? raw.level);
  const theme = level >= 2 ? normalizeProfileCardTheme(raw.profileCardTheme ?? raw.theme) : 'classic';
  const motion = level >= 3 ? normalizeProfileCardMotion(raw.profileCardMotion ?? raw.motion) : 'none';
  const publicFocus = level >= 4 ? normalizeProfileCardPublicFocus(raw.profileCardPublicFocus ?? raw.publicFocus) : 'balanced';
  return { level, theme, motion, publicFocus };
}

function getProfileCardVisual(snapshot: ProfileCardSnapshot): ProfileCardVisual {
  const theme = snapshot.level >= 2 ? snapshot.theme : 'classic';
  const motion = snapshot.level >= 5 && snapshot.motion === 'elite'
    ? 'elite'
    : snapshot.level >= 3
      ? snapshot.motion
      : 'none';
  return { theme, motion, ...PROFILE_CARD_VISUALS[theme] };
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
  multipliers,
  onFriendRequestToast,
}: BodyProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const isCompassTheme = false;
  const profileUpgradeAccent = '#FACC15';
  const { isPremium: myIsPremium, isVip: myIsVip } = usePremium();
  const insets = useSafeAreaInsets();
  const isMe = player.isMe;
  const [friendRequestBusy, setFriendRequestBusy] = useState(false);
  const [friendUids, setFriendUids] = useState<Set<string>>(() => new Set());
  const [removeFriendConfirmOpen, setRemoveFriendConfirmOpen] = useState(false);
  const [cardUpgradeOpen, setCardUpgradeOpen] = useState(false);
  const [profileCardSnapshot, setProfileCardSnapshot] = useState<ProfileCardSnapshot>(() => normalizeProfileCardSnapshotForLevel(player));
  const showProfileCardDevTools = ENABLE_DEV_TOOLS;
  const [activityLikeTotal, setActivityLikeTotal] = useState(0);
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
  const storedAuraId = isMe ? myInfo.aura : player.aura;
  const effectiveAuraId = getEffectiveAvatarAuraId(storedAuraId, showPremium, showVip);
  const usesPremiumAura = effectiveAuraId === PREMIUM_AVATAR_AURA_ID;
  const cardDef = getProfileCardLevelDef(profileCardLevel);
  const cardVisual = getProfileCardVisual(profileCardSnapshot);
  const crownUid = player.friendUid || player.uid || '';
  const leagueCrownCount = Math.max(
    0,
    Math.floor(Number(player.leagueCrownCount) || 0),
    Math.floor(Number(remoteCrown.crownCount) || 0),
  );
  const hasLeagueCrown = leagueCrownCount > 0 || Math.max(Number(player.leagueCrownExpiresAt) || 0, remoteCrown.expiresAt) > Date.now();
  const displayLeagueCrownCount = hasLeagueCrown ? Math.max(1, leagueCrownCount) : 0;
  const rawProfileCardLevel = player.profileCardLevel;
  const rawProfileCardTheme = player.profileCardTheme;
  const rawProfileCardMotion = player.profileCardMotion;
  const rawProfileCardPublicFocus = player.profileCardPublicFocus;

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
    void (async () => {
      const uid = player.friendUid || player.uid || (isMe ? await getCanonicalUserId() : '');
      if (!uid || cancelled) return;
      const total = await fetchActivityLikeTotal(uid);
      if (!cancelled) setActivityLikeTotal(total);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMe, player.friendUid, player.uid]);

  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const prestigeGlowOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: cardVisual.motion === 'none' ? [0.18, 0.18] : [0.18, 0.44],
  });
  const prestigeGlowScale = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: cardVisual.motion === 'pulse' || cardVisual.motion === 'elite' ? [0.98, 1.035] : [1, 1],
  });
  const prestigeGlintX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-180, 260] });
  const prestigeParticleY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [8, -10] });
  const prestigeParticleOpacity = shimmerAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.18, 0.78, 0.18] });
  const prestigeActive = profileCardLevel > 0;
  const compassProfileSurface = isCompassTheme && !prestigeActive;
  const prestigeSurfaceStyle = prestigeActive
    ? { backgroundColor: cardVisual.surface, borderWidth: 1, borderColor: cardVisual.surfaceBorder }
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

  useEffect(() => {
    let cancelled = false;
    setCardUpgradeOpen(false);
    if (!isMe) {
      setProfileCardSnapshot(normalizeProfileCardSnapshotForLevel({
        profileCardLevel: rawProfileCardLevel,
        profileCardTheme: rawProfileCardTheme,
        profileCardMotion: rawProfileCardMotion,
        profileCardPublicFocus: rawProfileCardPublicFocus,
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
    rawProfileCardTheme,
    rawProfileCardMotion,
    rawProfileCardPublicFocus,
    player.uid,
    player.friendUid,
  ]);

  useEffect(() => {
    setFriendRequestBusy(false);
    setRemoveFriendConfirmOpen(false);
  }, [player.uid, player.friendUid]);

  useEffect(() => {
    if (!showAddFriend) {
      setFriendUids(new Set());
      return;
    }
    return subscribeToFriends((rows) => {
      setFriendUids(new Set(rows.map((row) => row.uid)));
    });
  }, [showAddFriend]);

  const handleAddFriendPress = useCallback(async () => {
    if (!friendRequestTargetUid || friendRequestBusy) return;
    setFriendRequestBusy(true);
    try {
      const result = await sendFriendRequest(friendRequestTargetUid);
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
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Вы уже друзья',
            uk: 'Ви вже друзі',
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
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Это ваш профиль',
            uk: 'Це ваш профіль',
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
    } finally {
      setFriendRequestBusy(false);
    }
  }, [friendRequestTargetUid, friendRequestBusy, lang, onFriendRequestToast]);

  const handleFriendButtonPress = useCallback(() => {
    if (!friendRequestTargetUid || friendRequestBusy) return;
    hapticTap();
    if (isAlreadyFriend) {
      setRemoveFriendConfirmOpen(true);
      return;
    }
    void handleAddFriendPress();
  }, [friendRequestTargetUid, friendRequestBusy, isAlreadyFriend, handleAddFriendPress]);

  const handleRemoveFriendConfirm = useCallback(() => {
    if (!friendRequestTargetUid || friendRequestBusy) return;
    setRemoveFriendConfirmOpen(false);
    setFriendRequestBusy(true);
    deleteFriend(friendRequestTargetUid)
      .then(() => {
        setFriendUids((prev) => {
          const next = new Set(prev);
          next.delete(friendRequestTargetUid);
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
  }, [friendRequestTargetUid, friendRequestBusy, lang, onFriendRequestToast]);

  const arenaLabelText = duelRank
    ? `${arenaTierLabel(duelRank.tier as RankTier, lang as Lang)} ${duelRank.level}`
    : triLang(lang as Lang, {
      ru: 'Арена не сыграна',
      uk: 'Арена не зіграна',
      es: 'Arena sin partidas',
      'pt-BR': "Arena sem partidas",
      vi: "Đấu trường chưa có trận",
      id: "Arena tanpa pertandingan",
      tr: "Maçsız Arena",
      pl: "Arena bez meczów",
    });
  const profileFocusConfig = (() => {
    const focus = profileCardSnapshot.publicFocus;
    if (focus === 'arena') {
      return {
        icon: 'flash-outline' as const,
        label: triLang(lang as Lang, {
          ru: 'Фокус арены',
          uk: 'Фокус арени',
          es: 'Enfoque arena',
          'pt-BR': "Foco na Arena",
          vi: "Tập trung Đấu trường",
          id: "Fokus arena",
          tr: "Arena odağı",
          pl: "Fokus na Arenę",
        }),
        value: arenaLabelText,
        detail: duelRank ? `${duelRank.xp} XP` : triLang(lang as Lang, {
          ru: 'Готов к первому рангу',
          uk: 'Готовий до першого рангу',
          es: 'Listo para el primer rango',
          'pt-BR': "Pronto para o primeiro rank",
          vi: "Sẵn sàng cho hạng đầu tiên",
          id: "Siap untuk peringkat pertama",
          tr: "İlk rütbeye hazır",
          pl: "Gotowe na pierwszy ranking",
        }),
      };
    }
    if (focus === 'streak') {
      return {
        icon: 'flame-outline' as const,
        label: triLang(lang as Lang, {
          ru: 'Фокус серии',
          uk: 'Фокус серії',
          es: 'Enfoque racha',
          'pt-BR': "Foco na sequência",
          vi: "Tập trung chuỗi",
          id: "Fokus rangkaian",
          tr: "Seri odağı",
          pl: "Fokus na serię",
        }),
        value: streak !== null ? `${streak}` : '0',
        detail: triLang(lang as Lang, {
          ru: 'дней подряд',
          uk: 'днів поспіль',
          es: 'días seguidos',
          'pt-BR': "dias seguidos",
          vi: "ngày liên tiếp",
          id: "hari berturut-turut",
          tr: "gün üst üste",
          pl: "dni z rzędu",
        }),
      };
    }
    if (focus === 'league') {
      return {
        icon: 'shield-checkmark-outline' as const,
        label: triLang(lang as Lang, {
          ru: 'Фокус лиги',
          uk: 'Фокус ліги',
          es: 'Enfoque liga',
          'pt-BR': "Foco na liga",
          vi: "Tập trung giải đấu",
          id: "Fokus liga",
          tr: "Lig odağı",
          pl: "Fokus na ligę",
        }),
        value: clubTierShortName(club, lang as Lang),
        detail: triLang(lang as Lang, {
          ru: 'текущая лига',
          uk: 'поточна ліга',
          es: 'liga actual',
          'pt-BR': "liga atual",
          vi: "giải đấu hiện tại",
          id: "liga saat ini",
          tr: "mevcut lig",
          pl: "obecna liga",
        }),
      };
    }
    if (focus === 'xp') {
      return {
        icon: 'trending-up-outline' as const,
        label: triLang(lang as Lang, {
          ru: 'Фокус опыта',
          uk: 'Фокус досвіду',
          es: 'Enfoque XP',
          'pt-BR': "Foco em XP",
          vi: "Tập trung XP",
          id: "Fokus XP",
          tr: "XP odağı",
          pl: "Fokus na XP",
        }),
        value: xp.toLocaleString(),
        detail: `Lv.${level} · ${getTitleString(level, lang)}`,
      };
    }
    return {
      icon: 'diamond-outline' as const,
      label: triLang(lang as Lang, {
        ru: 'Сбалансированный профиль',
        uk: 'Збалансований профіль',
        es: 'Perfil equilibrado',
        'pt-BR': "Perfil equilibrado",
        vi: "Hồ sơ cân bằng",
        id: "Profil seimbang",
        tr: "Dengeli profil",
        pl: "Zrównoważony profil",
      }),
      value: `Lv.${level} · ${clubTierShortName(club, lang as Lang)}`,
      detail: streak !== null ? `${streak} ${triLang(lang as Lang, {
        ru: 'дней подряд',
        uk: 'днів поспіль',
        es: 'días seguidos',
        'pt-BR': "dias seguidos",
        vi: "ngày liên tiếp",
        id: "hari berturut-turut",
        tr: "gün üst üste",
        pl: "dni z rzędu",
      })}` : arenaLabelText,
    };
  })();
  const prestigeFacts = [
    { label: 'XP', value: xp.toLocaleString() },
    { label: triLang(lang as Lang, {
      ru: 'Титул',
      uk: 'Титул',
      es: 'Título',
      'pt-BR': "Título",
      vi: "Danh hiệu",
      id: "Gelar",
      tr: "Unvan",
      pl: "Tytuł",
    }), value: getTitleString(level, lang) },
    { label: triLang(lang as Lang, {
      ru: 'Карточка',
      uk: 'Картка',
      es: 'Tarjeta',
      'pt-BR': "Cartão",
      vi: "Thẻ",
      id: "Kartu",
      tr: "Kart",
      pl: "Karta",
    }), value: `CARD ${profileCardLevelRoman(profileCardLevel)}` },
  ];

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
        transform: [{ translateY: slideAnim }],
        borderTopWidth: prestigeActive ? 1 : 0.5,
        borderLeftWidth: prestigeActive ? 1 : 0,
        borderRightWidth: prestigeActive ? 1 : 0,
        borderColor: prestigeActive ? cardVisual.accentStrong : compassProfileSurface ? COMPASS_RICH.hairlineStrong : t.border,
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
            backgroundColor: prestigeActive ? 'rgba(0,0,0,0.28)' : compassProfileSurface ? COMPASS_RICH.charcoalRaised : 'rgba(255,255,255,0.10)',
            borderWidth: 1,
            borderColor: prestigeActive ? cardVisual.accentStrong : compassProfileSurface ? COMPASS_RICH.hairline : 'rgba(255,255,255,0.14)',
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
            disabled={friendRequestBusy}
            style={{
              position: 'absolute',
              top: PROFILE_HEADER_ACTION_TOP + PROFILE_HEADER_ACTION_SIZE + PROFILE_HEADER_ACTION_GAP,
              right: PROFILE_HEADER_ACTION_RIGHT,
              zIndex: 30,
              width: PROFILE_HEADER_ACTION_SIZE,
              height: PROFILE_HEADER_ACTION_SIZE,
              borderRadius: compassProfileSurface ? 9 : PROFILE_HEADER_ACTION_SIZE / 2,
              backgroundColor: prestigeActive ? 'rgba(0,0,0,0.28)' : compassProfileSurface ? COMPASS_RICH.charcoalRaised : 'rgba(255,255,255,0.10)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isAlreadyFriend
                ? (compassProfileSurface ? COMPASS_RICH.copper : (t.wrong ?? t.border))
                : (prestigeActive ? cardVisual.accentStrong : compassProfileSurface ? COMPASS_RICH.hairline : 'rgba(255,255,255,0.14)'),
              overflow: compassProfileSurface ? 'hidden' : 'visible',
              ...(compassProfileSurface ? compassShadow(1) : null),
              opacity: friendRequestBusy ? 0.55 : 1,
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
              name={isAlreadyFriend ? 'person-remove-outline' : 'person-add-outline'}
              size={22}
              color={isAlreadyFriend ? (compassProfileSurface ? COMPASS_RICH.peach : (t.wrong ?? t.accent)) : compassProfileSurface ? COMPASS_RICH.champagne : t.accent}
            />
          </Pressable>
        ) : null}
        {prestigeActive && (
          <>
            <LinearGradient
              colors={cardVisual.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -90,
                alignSelf: 'center',
                width: 260,
                height: 170,
                borderRadius: 130,
                backgroundColor: cardVisual.accentSoft,
                opacity: prestigeGlowOpacity,
                transform: [{ scale: prestigeGlowScale }],
              }}
            />
            {profileCardLevel >= 2 && (
              <View pointerEvents="none" style={{
                position: 'absolute',
                left: 18,
                right: 18,
                top: 18,
                height: 1,
                backgroundColor: cardVisual.accentStrong,
              }} />
            )}
            {profileCardLevel >= 3 && cardVisual.motion !== 'none' && (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: -140,
                  width: 140,
                  height: 3,
                  borderRadius: 999,
                  backgroundColor: cardVisual.secondary,
                  opacity: cardVisual.motion === 'elite' ? 0.95 : 0.72,
                  transform: [{ translateX: prestigeGlintX }],
                }}
              />
            )}
            {(cardVisual.motion === 'particles' || cardVisual.motion === 'elite') && (
              <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, opacity: prestigeParticleOpacity, transform: [{ translateY: prestigeParticleY }] }}>
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <View
                    key={idx}
                    style={{
                      position: 'absolute',
                      top: 26 + (idx % 2) * 22,
                      left: `${12 + idx * 14}%`,
                      width: idx % 3 === 0 ? 5 : 4,
                      height: idx % 3 === 0 ? 5 : 4,
                      borderRadius: 999,
                      backgroundColor: idx % 2 === 0 ? cardVisual.accent : cardVisual.secondary,
                    }}
                  />
                ))}
              </Animated.View>
            )}
          </>
        )}
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 24, paddingBottom: Math.max(96, insets.bottom + 72) }}
        >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: prestigeActive ? cardVisual.accentStrong : t.border, alignSelf: 'center', marginBottom: 20 }} />
        {showPremium && (
          <Animated.View style={{
            opacity: shimmerOpacity,
            alignSelf: 'center',
            marginBottom: 12,
            backgroundColor: t.gold,
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingVertical: 5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: t.gold,
            shadowOpacity: 0.6,
            shadowRadius: 8,
            elevation: 6,
          }}>
            <Ionicons name="star" size={13} color={t.correctText} />
            <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.label, letterSpacing: 1 }}>
              PREMIUM
            </Text>
            <Ionicons name="star" size={13} color={t.correctText} />
          </Animated.View>
        )}
        {profileCardLevel > 0 && (
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
            <Text style={{ color: '#111827', fontWeight: '900', fontSize: f.caption, letterSpacing: 0.4 }}>
              CARD {profileCardLevelRoman(profileCardLevel)} · {cardDef.name}
            </Text>
          </LinearGradient>
        )}
        <View style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: 44 }} />
            <View style={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
              <PremiumAvatarHalo enabled={usesPremiumAura} avatarSize={76} maskColor={prestigeActive ? cardVisual.gradient[1] : t.bgCard}>
                <AvatarView
                  avatar={avatarStr}
                  totalXP={safeTotalXp}
                  size={76}
                  auraId={usesPremiumAura ? undefined : effectiveAuraId}
                />
              </PremiumAvatarHalo>
              {hasLeagueCrown && (
                <View style={{ marginTop: 10, maxWidth: '100%' }}>
                  <LeagueCrownName
                    text={`${player.name}${isMe ? triLang(lang as Lang, {
                      ru: ' (ты)',
                      uk: ' (ти)',
                      es: ' (tú)',
                      'pt-BR': " (você)",
                      vi: " (bạn)",
                      id: " (kamu)",
                      tr: " (sen)",
                      pl: " (ty)",
                    }) : ''}`}
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
                {player.name}{isMe ? triLang(lang as Lang, {
                  ru: ' (ты)',
                  uk: ' (ти)',
                  es: ' (tú)',
                  'pt-BR': " (você)",
                  vi: " (bạn)",
                  id: " (kamu)",
                  tr: " (sen)",
                  pl: " (ty)",
                }) : ''}
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
          <View style={[{ flex: 1, minWidth: 0, borderRadius: 14, padding: 14, alignItems: 'center' }, prestigeSurfaceStyle]}>
            <Text
              style={{ fontSize: f.numMd, fontWeight: '700', color: t.gold, maxWidth: '100%' }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.52}
            >
              {xp.toLocaleString()}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>
              {triLang(lang as Lang, {
                ru: 'опыт',
                uk: 'досвід',
                es: 'experiencia',
                'pt-BR': "experiência",
                vi: "kinh nghiệm",
                id: "pengalaman",
                tr: "deneyim",
                pl: "doświadczenie",
              })}
            </Text>
          </View>
          <View style={[{ flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' }, prestigeSurfaceStyle]}>
            <Text style={{ fontSize: f.numMd, fontWeight: '700', color: t.textPrimary }}>
              {`Lv.${level}`}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>
              {triLang(lang as Lang, {
                ru: 'уровень',
                uk: 'рівень',
                es: 'nivel',
                'pt-BR': "nível",
                vi: "cấp độ",
                id: "level",
                tr: "seviye",
                pl: "poziom",
              })}
            </Text>
          </View>
          {streak !== null && (
            <View style={[{ flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' }, prestigeSurfaceStyle]}>
              {compassProfileSurface && <CompassDepthSurface radius={14} quiet />}
              <Text style={{ fontSize: f.numMd, fontWeight: '700', color: t.textPrimary }}>🔥{streak}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>
                {triLang(lang as Lang, {
                  ru: 'дней подряд',
                  uk: 'днів поспіль',
                  es: 'días seguidos',
                  'pt-BR': "dias seguidos",
                  vi: "ngày liên tiếp",
                  id: "hari berturut-turut",
                  tr: "gün üst üste",
                  pl: "dni z rzędu",
                })}
              </Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={() => {
            hapticTap();
            onFriendRequestToast(
              triLang(lang as Lang, {
                ru: 'Лайки за активность',
                uk: 'Лайки за активність',
                es: 'Likes de actividad',
                'pt-BR': "Curtidas de atividade",
                vi: "Lượt thích hoạt động",
                id: "Like aktivitas",
                tr: "Aktivite beğenileri",
                pl: "Polubienia aktywności",
              }),
              'info',
            );
          }}
          accessibilityRole="button"
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
          style={[{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
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
            <Ionicons name="heart" size={19} color="#FF2D55" />
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
            : <Ionicons name={club.ionIcon as any} size={28} color={club.color} />
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
        {profileCardLevel >= 4 && (
          <LinearGradient
            colors={[cardVisual.accentSoft, 'rgba(255,255,255,0.035)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: cardVisual.accentStrong,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: cardVisual.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: cardVisual.accentStrong }}>
                <Ionicons name={profileFocusConfig.icon} size={18} color={cardVisual.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: cardVisual.accent, fontSize: f.caption, fontWeight: '900' }}>
                  {profileFocusConfig.label}
                </Text>
                <Text
                  style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', marginTop: 1 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {profileFocusConfig.value}
                </Text>
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>
                {profileFocusConfig.detail}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {prestigeFacts.map((fact) => (
                <View
                  key={fact.label}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    borderRadius: 12,
                    paddingHorizontal: 9,
                    paddingVertical: 8,
                    backgroundColor: 'rgba(0,0,0,0.14)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }} numberOfLines={1}>
                    {fact.label}
                  </Text>
                  <Text
                    style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900', marginTop: 2 }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.62}
                  >
                    {fact.value}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        )}
        {profileCardLevel >= 5 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: cardVisual.accentStrong,
            backgroundColor: 'rgba(0,0,0,0.18)',
            padding: 13,
            marginBottom: 10,
          }}>
            <Ionicons name="ribbon-outline" size={22} color={cardVisual.secondary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: cardVisual.secondary, fontSize: f.caption, fontWeight: '900' }}>
                ELITE SIGNATURE
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', marginTop: 2 }}>
                {triLang(lang as Lang, {
                  ru: 'Максимальная карточка с персональным entrance-эффектом.',
                  uk: 'Максимальна картка з персональним entrance-ефектом.',
                  es: 'Tarjeta máxima con efecto de entrada personal.',
                  'pt-BR': "Cartão máximo com efeito de entrada pessoal.",
                  vi: "Thẻ tối đa với hiệu ứng vào cá nhân.",
                  id: "Kartu maksimum dengan efek masuk pribadi.",
                  tr: "Kişisel giriş efektli maksimum kart.",
                  pl: "Maksymalna karta z osobistym efektem wejścia.",
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
        {isMe && showProfileCardDevTools && (
          <TouchableOpacity
            testID="player-profile-card-upgrade-open"
            activeOpacity={0.84}
            onPress={() => {
              hapticTap();
              setCardUpgradeOpen(true);
            }}
            style={{
              marginTop: 2,
              borderRadius: compassProfileSurface ? 9 : 16,
              borderWidth: 1,
              borderColor: prestigeActive ? cardVisual.accentStrong : compassProfileSurface ? COMPASS_RICH.hairlineStrong : 'rgba(250,204,21,0.38)',
              backgroundColor: prestigeActive ? cardVisual.accentSoft : compassProfileSurface ? COMPASS_RICH.charcoalRaised : 'rgba(250,204,21,0.10)',
              paddingVertical: 13,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              overflow: compassProfileSurface ? 'hidden' : 'visible',
              ...(compassProfileSurface ? compassShadow(1) : null),
            }}
          >
            {compassProfileSurface && <CompassDepthSurface radius={9} selected />}
            <Ionicons name={profileCardLevel >= PROFILE_CARD_MAX_LEVEL ? 'sparkles' : 'color-wand-outline'} size={18} color={prestigeActive ? cardVisual.accent : compassProfileSurface ? COMPASS_RICH.champagne : profileUpgradeAccent} />
            <Text style={{ color: prestigeActive ? cardVisual.accent : compassProfileSurface ? COMPASS_RICH.champagne : profileUpgradeAccent, fontSize: f.body, fontWeight: '900' }}>
              {profileCardLevel >= PROFILE_CARD_MAX_LEVEL
                ? triLang(lang as Lang, {
                  ru: 'Карточка максимального уровня',
                  uk: 'Картка максимального рівня',
                  es: 'Tarjeta al nivel máximo',
                  'pt-BR': "Cartão no nível máximo",
                  vi: "Thẻ ở cấp tối đa",
                  id: "Kartu level maksimum",
                  tr: "Maksimum seviyede kart",
                  pl: "Karta na maksymalnym poziomie",
                })
                : triLang(lang as Lang, {
                  ru: 'Улучшить карточку',
                  uk: 'Покращити картку',
                  es: 'Mejorar tarjeta',
                  'pt-BR': "Melhorar cartão",
                  vi: "Nâng cấp thẻ",
                  id: "Tingkatkan kartu",
                  tr: "Kartı yükselt",
                  pl: "Ulepsz kartę",
                })}
            </Text>
          </TouchableOpacity>
        )}
        </ScrollView>
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
    {showProfileCardDevTools ? (
      <ProfileCardUpgradeModal
        visible={cardUpgradeOpen}
        level={profileCardLevel}
        snapshot={profileCardSnapshot}
        onClose={() => setCardUpgradeOpen(false)}
        onUpgraded={(nextLevel) => setProfileCardSnapshot((prev) => ({ ...prev, level: nextLevel }))}
        onChanged={setProfileCardSnapshot}
      />
    ) : null}
    </>
  );
}

function PlayerProfileModal({ player, myInfo, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const [duelRank, setDuelRank] = useState<{ tier: string; level: string; xp: number } | null>(null);
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
