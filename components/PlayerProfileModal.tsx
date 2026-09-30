import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
/**
 * Active PhraseMan 2.0 player card.
 *
 * Identity is represented by the authoritative rank coin. A missing public rank
 * stays neutral; this component never substitutes the current account's rank.
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FONT_SCALE, useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../app/config';
import { deleteFriend, sendFriendRequest } from '../app/firestore_friend_requests';
import { friendsAccountStore } from '../app/friends_account_store';
import {
  isSyntheticUid,
  loadSyntheticFriendRequests,
  peekSyntheticFriendRequests,
  rememberSyntheticFriendRequest,
} from '../app/synthetic_friend_requests';
import {
  hasLikedSynthetic,
  loadSyntheticActivityLikes,
  syntheticLikesAddedByMe,
  toggleSyntheticLike,
} from '../app/synthetic_activity_likes';
import { residentBaseLikes } from '../constants/synthetic_residents';
import ReportUserModal from './ReportUserModal';
import {
  fetchActivityLikeTotal,
  fetchActivityLikeState,
  sendFriendActivityLike,
  removeFriendActivityLike,
  PROFILE_LIKE_EVENT_ID,
  type FriendActivityLikeState,
} from '../app/friend_activity_likes';
import { getCanonicalUserId } from '../app/user_id_policy';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { coinRankRowForDisplay } from '../app/coin_rank_table_v1';
import {
  resolvePlayerProfileV2State,
  resolvePlayerProfileVisibleRank,
} from '../app/player_profile_v2_state';
import { emitAppEvent } from '../app/events';
import InGameToast from './InGameToast';
import ThemedConfirmModal from './ThemedConfirmModal';

export interface PlayerInfo {
  name: string;
  points: number;
  isMe: boolean;
  uid?: string;
  friendUid?: string;
  /** Public rank supplied by an authoritative public-profile projection. */
  coinRank?: number | null;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
  /** Retained only for caller compatibility while the retired card system is removed elsewhere. */
  avatar?: string;
  frame?: string;
  aura?: string;
  streak?: number | null;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  devProfileCardLevelOverride?: number;
}

interface MyInfo {
  name: string;
  avatar: string;
  frame: string;
  aura?: string;
  streak?: number | null;
}

interface Props {
  player: PlayerInfo | null;
  myInfo: MyInfo;
  onClose: () => void;
  /** Kept as a no-op compatibility prop for the retired showcase. */
  motionVariant?: 'classic' | 'hybrid';
}

const PROFILE_ACTION_SIZE = 48;
const PROFILE_ACTION_RIGHT = 21;
const PROFILE_ACTION_TOP = 31;
const PROFILE_ACTION_GAP = 9;

type BodyProps = {
  player: PlayerInfo;
  myInfo: MyInfo;
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  onBackdropPress: () => void;
  onClose: () => void;
  onFriendRequestToast: (message: string, toastType?: 'error' | 'info') => void;
};

function PlayerProfileModalBody({
  player,
  myInfo,
  slideAnim,
  fadeAnim,
  onBackdropPress,
  onClose,
  onFriendRequestToast,
}: BodyProps) {
  const { fontSize, liquidGlassThemeId, uiScale } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const topInset = Math.max(0, insets.top);
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const availableHeight = Math.max(0, windowHeight - topInset - bottomInset - 12);
  const sheetHeight = Math.min(530, availableHeight);
  const textScale = FONT_SCALE[fontSize] / FONT_SCALE.medium * uiScale;
  const g = liquidGlassTokens(liquidGlassThemeId);
  const isMe = player.isMe;
  const myCoinRank = useMyCoinRank();
  const publicRank = player.coinRank ?? null;
  const visibleRank = resolvePlayerProfileVisibleRank({
    isMe,
    myRank: myCoinRank,
    publicRank: publicRank,
  });
  const rankRow = visibleRank === null ? null : coinRankRowForDisplay(visibleRank);

  const [friendRequestBusy, setFriendRequestBusy] = useState(false);
  const [friendUids, setFriendUids] = useState<Set<string>>(() => new Set());
  const [friendRequestSentUids, setFriendRequestSentUids] = useState<Set<string>>(
    () => new Set(peekSyntheticFriendRequests()),
  );
  const [removeFriendConfirmOpen, setRemoveFriendConfirmOpen] = useState(false);
  const [reportUserOpen, setReportUserOpen] = useState(false);
  const [activityLikeTotal, setActivityLikeTotal] = useState(0);
  const [profileLike, setProfileLike] = useState<FriendActivityLikeState | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const likeInFlightRef = useRef(false);

  const friendRequestTargetUid = player.friendUid !== undefined ? player.friendUid : player.uid;
  const showAddFriend =
    !isMe &&
    !!friendRequestTargetUid &&
    CLOUD_SYNC_ENABLED &&
    !IS_EXPO_GO;
  const isAlreadyFriend = !!friendRequestTargetUid && friendUids.has(friendRequestTargetUid);
  const isFriendRequestSent = !!friendRequestTargetUid && friendRequestSentUids.has(friendRequestTargetUid);
  const likeTargetUid = player.friendUid || player.uid || '';
  const canLike = !isMe && !!likeTargetUid && CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  const likedThisProfile =
    !!profileLike &&
    profileLike.targetUid === likeTargetUid &&
    profileLike.eventId === PROFILE_LIKE_EVENT_ID;

  const profileState = resolvePlayerProfileV2State({
    isMe,
    targetUid: friendRequestTargetUid,
    friendRequestBusy,
    friendRequestSent: isFriendRequestSent,
    isFriend: isAlreadyFriend,
    liked: likedThisProfile,
  });

  useEffect(() => {
    setFriendRequestBusy(false);
    setRemoveFriendConfirmOpen(false);
    setReportUserOpen(false);
    setFriendRequestSentUids(new Set(peekSyntheticFriendRequests()));
  }, [player.friendUid, player.uid]);

  useEffect(() => {
    let cancelled = false;
    void loadSyntheticFriendRequests().then((stored) => {
      if (cancelled || stored.size === 0) return;
      setFriendRequestSentUids((previous) => {
        const next = new Set(previous);
        stored.forEach((uid) => next.add(uid));
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showAddFriend) {
      setFriendUids(new Set());
      return undefined;
    }
    return friendsAccountStore.subscribe((rows) => {
      const nextFriendUids = new Set(rows.map((row) => row.uid));
      setFriendUids(nextFriendUids);
      setFriendRequestSentUids((previous) => {
        const next = new Set([...previous].filter((uid) => !nextFriendUids.has(uid)));
        return next.size === previous.size ? previous : next;
      });
    });
  }, [showAddFriend]);

  useEffect(() => {
    let cancelled = false;
    setActivityLikeTotal(0);
    setProfileLike(null);
    void (async () => {
      const uid = player.friendUid || player.uid || (isMe ? await getCanonicalUserId() : '');
      if (!uid || cancelled) return;
      if (isSyntheticUid(uid)) {
        await loadSyntheticActivityLikes();
        if (cancelled) return;
        setActivityLikeTotal(residentBaseLikes(player.points ?? 0) + syntheticLikesAddedByMe(uid));
        setProfileLike(
          hasLikedSynthetic(uid)
            ? { date: '', targetUid: uid, eventId: PROFILE_LIKE_EVENT_ID }
            : null,
        );
        return;
      }
      const [total, likeState] = await Promise.all([
        fetchActivityLikeTotal(uid),
        isMe ? Promise.resolve(null) : fetchActivityLikeState(uid).catch(() => null),
      ]);
      if (cancelled) return;
      setActivityLikeTotal(total);
      setProfileLike(likeState);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMe, player.friendUid, player.points, player.uid]);

  const requestSentText = triLang(lang as Lang, {
    ru: 'Заявка отправлена!',
    uk: 'Заявку надіслано!',
    es: '¡Solicitud enviada!',
    en: 'Request sent!',
    'pt-BR': 'Solicitação enviada!',
    vi: 'Đã gửi lời mời!',
    id: 'Permintaan terkirim!',
    tr: 'İstek gönderildi!',
    pl: 'Zaproszenie wysłane!',
  });
  const requestFailedText = triLang(lang as Lang, {
    ru: 'Не отправилось. Попробуй позже',
    uk: 'Не вдалося надіслати. Спробуйте пізніше',
    es: 'No se pudo enviar. Inténtalo más tarde',
    en: 'Failed to send. Try again later',
    'pt-BR': 'Não foi possível enviar. Tente mais tarde',
    vi: 'Không gửi được. Hãy thử lại sau',
    id: 'Tidak dapat dikirim. Coba lagi nanti',
    tr: 'Gönderilemedi. Daha sonra tekrar dene',
    pl: 'Nie udało się wysłać. Spróbuj później',
  });

  const handleAddFriendPress = useCallback(async () => {
    if (!friendRequestTargetUid || friendRequestBusy) return;
    const targetUid = friendRequestTargetUid;
    setFriendRequestBusy(true);
    setFriendRequestSentUids((previous) => new Set([...previous, targetUid]));
    onFriendRequestToast(requestSentText, 'info');

    if (isSyntheticUid(targetUid)) {
      rememberSyntheticFriendRequest(targetUid);
      setFriendRequestBusy(false);
      return;
    }

    try {
      const result = await sendFriendRequest(targetUid);
      if (result === 'sent') {
        onFriendRequestToast(requestSentText, 'info');
      } else if (result === 'already_friends') {
        setFriendRequestSentUids((previous) => {
          const next = new Set(previous);
          next.delete(targetUid);
          return next;
        });
        setFriendUids((previous) => new Set([...previous, targetUid]));
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Уже друзья',
            uk: 'Уже друзі',
            es: 'Ya son amigos',
            en: 'Already friends',
            'pt-BR': 'Vocês já são amigos',
            vi: 'Hai bạn đã là bạn bè',
            id: 'Kalian sudah berteman',
            tr: 'Zaten arkadaşsınız',
            pl: 'Już jesteście znajomymi',
          }),
          'info',
        );
      } else if (result === 'already_sent') {
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Заявка уже отправлена',
            uk: 'Заявку вже надіслано',
            es: 'Solicitud ya enviada',
            en: 'Request already sent',
            'pt-BR': 'Solicitação já enviada',
            vi: 'Lời mời đã được gửi',
            id: 'Permintaan sudah dikirim',
            tr: 'İstek zaten gönderildi',
            pl: 'Zaproszenie już wysłane',
          }),
          'info',
        );
      } else if (result === 'self' || result === 'not_found' || result === 'error') {
        setFriendRequestSentUids((previous) => {
          const next = new Set(previous);
          next.delete(targetUid);
          return next;
        });
        onFriendRequestToast(
          result === 'self'
            ? triLang(lang as Lang, {
                ru: 'Это твой профиль',
                uk: 'Це твій профіль',
                es: 'Es tu perfil',
                en: 'This is your profile',
                'pt-BR': 'Este é seu perfil',
                vi: 'Đây là hồ sơ của bạn',
                id: 'Ini profilmu',
                tr: 'Bu senin profilin',
                pl: 'To twój profil',
              })
            : requestFailedText,
          result === 'self' ? 'info' : 'error',
        );
      }
    } catch {
      setFriendRequestSentUids((previous) => {
        const next = new Set(previous);
        next.delete(targetUid);
        return next;
      });
      onFriendRequestToast(requestFailedText, 'error');
    } finally {
      setFriendRequestBusy(false);
    }
  }, [
    friendRequestBusy,
    friendRequestTargetUid,
    lang,
    onFriendRequestToast,
    requestFailedText,
    requestSentText,
  ]);

  const handleFriendButtonPress = useCallback(() => {
    if (!friendRequestTargetUid || friendRequestBusy || isFriendRequestSent) return;
    hapticTap();
    if (isAlreadyFriend) {
      setRemoveFriendConfirmOpen(true);
      return;
    }
    void handleAddFriendPress();
  }, [
    friendRequestBusy,
    friendRequestTargetUid,
    handleAddFriendPress,
    isAlreadyFriend,
    isFriendRequestSent,
  ]);

  const handleRemoveFriendConfirm = useCallback(() => {
    if (!friendRequestTargetUid || friendRequestBusy) return;
    const removedUid = friendRequestTargetUid;
    const wasFriend = friendUids.has(removedUid);
    setRemoveFriendConfirmOpen(false);
    setFriendRequestBusy(true);
    setFriendUids((previous) => {
      const next = new Set(previous);
      next.delete(removedUid);
      return next;
    });
    deleteFriend(removedUid)
      .then(() => {
        setFriendUids((previous) => {
          const next = new Set(previous);
          next.delete(removedUid);
          return next;
        });
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Друг убран из списка',
            uk: 'Друга видалено',
            es: 'Amigo eliminado',
            en: 'Friend removed',
            'pt-BR': 'Amigo removido',
            vi: 'Đã xóa bạn bè',
            id: 'Teman dihapus',
            tr: 'Arkadaş silindi',
            pl: 'Znajomy usunięty',
          }),
          'info',
        );
      })
      .catch(() => {
        if (wasFriend) {
          setFriendUids((previous) => new Set([...previous, removedUid]));
        }
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Не получилось убрать. Попробуй ещё раз',
            uk: 'Не вийшло прибрати. Спробуй ще раз',
            es: 'No se pudo quitar. Inténtalo de nuevo',
            en: 'Could not remove. Try again',
            'pt-BR': 'Não deu para remover. Tente de novo',
            vi: 'Chưa gỡ được. Hãy thử lại',
            id: 'Belum bisa dihapus. Coba lagi',
            tr: 'Kaldırılamadı. Tekrar dene',
            pl: 'Nie udało się usunąć. Spróbuj ponownie',
          }),
          'error',
        );
      })
      .finally(() => setFriendRequestBusy(false));
  }, [
    friendRequestBusy,
    friendRequestTargetUid,
    friendUids,
    lang,
    onFriendRequestToast,
  ]);

  const handleToggleLike = useCallback(() => {
    if (!canLike || !likeTargetUid || likeInFlightRef.current) return;
    hapticTap();
    likeInFlightRef.current = true;
    setLikeBusy(true);

    const wasLiked = likedThisProfile;
    if (wasLiked) {
      setActivityLikeTotal((total) => Math.max(0, total - 1));
      setProfileLike(null);
    } else {
      setActivityLikeTotal((total) => total + 1);
      setProfileLike({
        date: '',
        targetUid: likeTargetUid,
        eventId: PROFILE_LIKE_EVENT_ID,
        createdAt: Date.now(),
      });
    }

    if (isSyntheticUid(likeTargetUid)) {
      toggleSyntheticLike(likeTargetUid, !wasLiked);
      likeInFlightRef.current = false;
      setLikeBusy(false);
      return;
    }

    const action = wasLiked
      ? removeFriendActivityLike({ targetUid: likeTargetUid })
      : sendFriendActivityLike({ targetUid: likeTargetUid, senderDisplayName: myInfo.name });

    void action
      .then((result) => {
        setActivityLikeTotal(Math.max(0, Math.floor(Number(result.targetActivityLikeTotal) || 0)));
        setProfileLike(
          wasLiked
            ? null
            : {
                date: result.date,
                targetUid: result.targetUid,
                eventId: result.eventId,
                createdAt: Date.now(),
              },
        );
        emitAppEvent('profile_like_changed', { targetUid: likeTargetUid, liked: !wasLiked });
      })
      .catch(async () => {
        const freshState = await fetchActivityLikeState(likeTargetUid).catch(() => null);
        const freshTotal = await fetchActivityLikeTotal(likeTargetUid).catch(() => null);
        setProfileLike(freshState);
        if (typeof freshTotal === 'number') setActivityLikeTotal(Math.max(0, freshTotal));
        emitAppEvent('profile_like_changed', { targetUid: likeTargetUid, liked: !!freshState });
        onFriendRequestToast(
          triLang(lang as Lang, {
            ru: 'Не получилось. Проверь интернет и попробуй ещё раз',
            uk: 'Не вдалося. Перевір інтернет і спробуй ще раз',
            es: 'No funcionó. Comprueba Internet e inténtalo de nuevo',
            en: 'Did not work. Check your internet and try again',
            'pt-BR': 'Não deu certo. Verifique a internet e tente novamente',
            vi: 'Không thành công. Hãy kiểm tra mạng rồi thử lại',
            id: 'Gagal. Periksa internet lalu coba lagi',
            tr: 'Olmadı. İnterneti kontrol edip tekrar dene',
            pl: 'Nie udało się. Sprawdź internet i spróbuj ponownie',
          }),
          'error',
        );
      })
      .finally(() => {
        likeInFlightRef.current = false;
        setLikeBusy(false);
      });
  }, [
    canLike,
    lang,
    likeTargetUid,
    likedThisProfile,
    myInfo.name,
    onFriendRequestToast,
  ]);

  const relationshipText = (() => {
    switch (profileState) {
      case 'self':
        return triLang(lang as Lang, {
          ru: 'Ваша визитка',
          uk: 'Ваша візитка',
          es: 'Tu tarjeta',
          en: 'Your player card',
          'pt-BR': 'Seu cartão',
          vi: 'Thẻ của bạn',
          id: 'Kartu Anda',
          tr: 'Oyuncu kartın',
          pl: 'Twoja wizytówka',
        });
      case 'readonly':
        return triLang(lang as Lang, {
          ru: 'Профиль доступен только для просмотра',
          uk: 'Профіль доступний лише для перегляду',
          es: 'Perfil disponible solo para ver',
          en: 'View-only profile',
          'pt-BR': 'Perfil somente para visualização',
          vi: 'Hồ sơ chỉ xem',
          id: 'Profil hanya lihat',
          tr: 'Salt okunur profil',
          pl: 'Profil tylko do odczytu',
        });
      case 'add-busy':
        return triLang(lang as Lang, {
          ru: 'Отправляем заявку…',
          uk: 'Надсилаємо заявку…',
          es: 'Enviando solicitud…',
          en: 'Sending request…',
          'pt-BR': 'Enviando solicitação…',
          vi: 'Đang gửi lời mời…',
          id: 'Mengirim permintaan…',
          tr: 'İstek gönderiliyor…',
          pl: 'Wysyłanie zaproszenia…',
        });
      case 'request-sent':
        return triLang(lang as Lang, {
          ru: 'Заявка отправлена',
          uk: 'Заявку надіслано',
          es: 'Solicitud enviada',
          en: 'Request sent',
          'pt-BR': 'Solicitação enviada',
          vi: 'Đã gửi lời mời',
          id: 'Permintaan terkirim',
          tr: 'İstek gönderildi',
          pl: 'Zaproszenie wysłane',
        });
      case 'friend':
        return triLang(lang as Lang, {
          ru: 'Вы друзья',
          uk: 'Ви друзі',
          es: 'Son amigos',
          en: 'You are friends',
          'pt-BR': 'Vocês são amigos',
          vi: 'Hai bạn là bạn bè',
          id: 'Kalian berteman',
          tr: 'Arkadaşsınız',
          pl: 'Jesteście znajomymi',
        });
      case 'liked':
        return triLang(lang as Lang, {
          ru: 'Активность отмечена',
          uk: 'Активність відзначено',
          es: 'Actividad marcada',
          en: 'Activity liked',
          'pt-BR': 'Atividade curtida',
          vi: 'Đã thích hoạt động',
          id: 'Aktivitas disukai',
          tr: 'Etkinlik beğenildi',
          pl: 'Aktywność polubiona',
        });
      default:
        return triLang(lang as Lang, {
          ru: 'Можно отправить заявку в друзья',
          uk: 'Можна надіслати запит у друзі',
          es: 'Puedes enviar una solicitud de amistad',
          en: 'You can send a friend request',
          'pt-BR': 'Você pode enviar uma solicitação de amizade',
          vi: 'Bạn có thể gửi lời mời kết bạn',
          id: 'Anda dapat mengirim permintaan pertemanan',
          tr: 'Arkadaşlık isteği gönderebilirsin',
          pl: 'Możesz wysłać zaproszenie do znajomych',
        });
    }
  })();

  const actionButton = (
    testID: string,
    icon: React.ComponentProps<typeof Ionicons>['name'],
    label: string,
    onPress: () => void,
    disabled = false,
    index = 0,
  ) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        top: PROFILE_ACTION_TOP + index * (PROFILE_ACTION_SIZE + PROFILE_ACTION_GAP),
        right: PROFILE_ACTION_RIGHT,
        zIndex: 5,
        width: PROFILE_ACTION_SIZE,
        height: PROFILE_ACTION_SIZE,
        borderRadius: PROFILE_ACTION_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: g.opaqueControl,
        opacity: disabled ? 0.52 : pressed ? 0.76 : 1,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
      })}
    >
      {disabled && friendRequestBusy ? (
        <ActivityIndicator size="small" color={g.text} />
      ) : (
        <Ionicons name={icon} size={21} color={g.text} />
      )}
    </Pressable>
  );

  const friendActionLabel = isAlreadyFriend
    ? triLang(lang as Lang, {
        ru: 'Удалить из друзей',
        uk: 'Видалити з друзів',
        es: 'Eliminar amigo',
        en: 'Remove friend',
        'pt-BR': 'Remover amigo',
        vi: 'Xóa bạn bè',
        id: 'Hapus teman',
        tr: 'Arkadaşlıktan çıkar',
        pl: 'Usuń znajomego',
      })
    : isFriendRequestSent
      ? relationshipText
      : triLang(lang as Lang, {
          ru: 'Добавить в друзья',
          uk: 'Додати в друзі',
          es: 'Añadir amigo',
          en: 'Add friend',
          'pt-BR': 'Adicionar amigo',
          vi: 'Thêm bạn',
          id: 'Tambah teman',
          tr: 'Arkadaş ekle',
          pl: 'Dodaj znajomego',
        });

  return (
    <>
      <Animated.View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.58)',
          opacity: fadeAnim,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={triLang(lang as Lang, {
            ru: 'Закрыть профиль',
            uk: 'Закрити профіль',
            es: 'Cerrar perfil',
            en: 'Close profile',
            'pt-BR': 'Fechar perfil',
            vi: 'Đóng hồ sơ',
            id: 'Tutup profil',
            tr: 'Profili kapat',
            pl: 'Zamknij profil',
          })}
          style={StyleSheet.absoluteFillObject}
          onPress={onBackdropPress}
        />
        <Animated.View
          testID="player-profile-modal-sheet"
          accessibilityViewIsModal
          style={{
            height: sheetHeight,
            maxHeight: availableHeight,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            backgroundColor: g.opaqueSheet,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.38,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: -6 },
            elevation: 16,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <ScrollView
            testID="player-profile-scroll"
            style={{ flex: 1, minHeight: 0, width: '100%' }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: Math.max(54, bottomInset + 24),
            }}
            bounces={false}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <View
              pointerEvents="none"
              style={{
                width: 42,
                height: 5,
                borderRadius: 5,
                alignSelf: 'center',
                backgroundColor: g.mutedText,
                opacity: 0.72,
              }}
            />

            {actionButton(
              'player-profile-close',
              'close',
              triLang(lang as Lang, {
                ru: 'Закрыть профиль',
                uk: 'Закрити профіль',
                es: 'Cerrar perfil',
                en: 'Close profile',
                'pt-BR': 'Fechar perfil',
                vi: 'Đóng hồ sơ',
                id: 'Tutup profil',
                tr: 'Profili kapat',
                pl: 'Zamknij profil',
              }),
              onClose,
            )}
            {showAddFriend
              ? actionButton(
                  'player-profile-add-friend',
                  isAlreadyFriend ? 'person-remove-outline' : isFriendRequestSent ? 'checkmark' : 'person-add-outline',
                  friendActionLabel,
                  handleFriendButtonPress,
                  friendRequestBusy || isFriendRequestSent,
                  1,
                )
              : null}
            {!isMe && !!friendRequestTargetUid
              ? actionButton(
                  'player-profile-report-user',
                  'alert-circle-outline',
                  triLang(lang as Lang, {
                    ru: 'Пожаловаться на игрока',
                    uk: 'Поскаржитися на гравця',
                    es: 'Reportar jugador',
                    en: 'Report player',
                    'pt-BR': 'Denunciar jogador',
                    vi: 'Báo cáo người chơi',
                    id: 'Laporkan pemain',
                    tr: 'Oyuncuyu bildir',
                    pl: 'Zgłoś gracza',
                  }),
                  () => {
                    hapticTap();
                    setReportUserOpen(true);
                  },
                  false,
                  showAddFriend ? 2 : 1,
                )
              : null}

            <View style={{ width: '100%', minWidth: 0, alignItems: 'center', paddingTop: 73 }}>
            {rankRow ? (
              <Image
                source={rankRow.source}
                style={{ width: 88, height: 88 }}
                contentFit="contain"
                accessible
                accessibilityLabel={rankRow.levelTitle}
              />
            ) : (
              <View
                testID="player-profile-rank-placeholder"
                accessibilityLabel={triLang(lang as Lang, {
                  ru: 'Ранг игрока пока недоступен',
                  uk: 'Ранг гравця поки недоступний',
                  es: 'Rango del jugador aún no disponible',
                  en: 'Player rank is not available yet',
                  'pt-BR': 'A classificação do jogador ainda não está disponível',
                  vi: 'Hạng người chơi chưa có',
                  id: 'Peringkat pemain belum tersedia',
                  tr: 'Oyuncu rütbesi henüz mevcut değil',
                  pl: 'Ranga gracza nie jest jeszcze dostępna',
                })}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: g.opaqueControl,
                }}
              >
                <Ionicons name="person-outline" size={32} color={g.secondary} />
              </View>
            )}

            <Text
              style={{
                marginTop: 16,
                color: g.text,
                width: '100%',
                minWidth: 0,
                flexShrink: 1,
                fontSize: 29 * textScale,
                lineHeight: 35 * textScale,
                letterSpacing: -0.45,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {player.name}
            </Text>
            <Text
              style={{
                minHeight: 20,
                width: '100%',
                minWidth: 0,
                flexShrink: 1,
                marginTop: 5,
                color: g.secondary,
                fontSize: 14 * textScale,
                lineHeight: 20 * textScale,
                textAlign: 'center',
              }}
            >
              {relationshipText}
            </Text>

            <View
              style={{
                marginTop: 17,
                minHeight: 40,
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 999,
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                maxWidth: '100%',
                minWidth: 0,
                gap: 8,
                backgroundColor: g.opaqueControl,
              }}
            >
              {rankRow ? (
                <Image source={rankRow.source} style={{ width: 24, height: 24 }} contentFit="contain" accessible={false} />
              ) : (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: g.selected }} />
              )}
              <View style={{ flexShrink: 1, minWidth: 0, alignItems: 'center' }}>
                <Text style={{ color: g.text, flexShrink: 1, fontSize: 13 * textScale, lineHeight: 18 * textScale, fontWeight: '700', textAlign: 'center' }}>
                  {triLang(lang as Lang, {
                    ru: 'Ранг игрока',
                    uk: 'Ранг гравця',
                    es: 'Rango del jugador',
                    en: 'Player rank',
                    'pt-BR': 'Classificação do jogador',
                    vi: 'Hạng người chơi',
                    id: 'Peringkat pemain',
                    tr: 'Oyuncu rütbesi',
                    pl: 'Ranga gracza',
                  })}
                </Text>
                {rankRow ? (
                  <Text style={{ color: g.secondary, flexShrink: 1, fontSize: 11 * textScale, lineHeight: 16 * textScale, marginTop: 1, textAlign: 'center' }}>{rankRow.levelTitle}</Text>
                ) : null}
              </View>
            </View>
            </View>

            <View style={{ height: 1, marginTop: 31, marginBottom: 22, backgroundColor: g.line }} />

            <View style={{ width: '100%', minWidth: 0, alignItems: 'center', gap: 20 }}>
            <Text style={{ width: '100%', minWidth: 0, flexShrink: 1, color: g.secondary, fontSize: 14 * textScale, lineHeight: 20 * textScale, textAlign: 'center' }}>
              {relationshipText}
            </Text>
            <Pressable
              testID="player-profile-activity-like"
              accessibilityRole="button"
              accessibilityLabel={triLang(lang as Lang, {
                ru: 'Лайки за активность',
                uk: 'Вподобання за активність',
                es: 'Me gusta por actividad',
                en: 'Activity likes',
                'pt-BR': 'Curtidas por atividade',
                vi: 'Lượt thích hoạt động',
                id: 'Suka aktivitas',
                tr: 'Etkinlik beğenileri',
                pl: 'Polubienia aktywności',
              })}
              accessibilityState={{ selected: likedThisProfile, disabled: !canLike || likeBusy }}
              disabled={!canLike || likeBusy}
              onPress={handleToggleLike}
              style={({ pressed }) => ({
                minHeight: 48,
                maxWidth: '100%',
                minWidth: 0,
                paddingHorizontal: 16,
                borderRadius: 23,
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: g.opaqueControl,
                opacity: !canLike ? 0.48 : pressed || likeBusy ? 0.74 : 1,
              })}
            >
              <Ionicons name={likedThisProfile ? 'heart' : 'heart-outline'} size={20} color={likedThisProfile ? '#FF5C7A' : g.text} />
              <Text style={{ color: g.text, flexShrink: 1, fontSize: 15 * textScale, lineHeight: 20 * textScale, fontWeight: '700' }}>
                {activityLikeTotal.toLocaleString()}
              </Text>
              <Text style={{ color: g.secondary, flexShrink: 1, minWidth: 0, fontSize: 12 * textScale, lineHeight: 17 * textScale, fontWeight: '500', textAlign: 'center' }}>
                {triLang(lang as Lang, {
                  ru: 'Лайки за активность',
                  uk: 'Вподобання за активність',
                  es: 'Me gusta por actividad',
                  en: 'Activity likes',
                  'pt-BR': 'Curtidas por atividade',
                  vi: 'Lượt thích hoạt động',
                  id: 'Suka aktivitas',
                  tr: 'Etkinlik beğenileri',
                  pl: 'Polubienia aktywności',
                })}
              </Text>
              {likeBusy ? <ActivityIndicator size="small" color={g.secondary} /> : null}
            </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>

      {renderProfileModalOverlays(
        player,
        lang,
        removeFriendConfirmOpen,
        setRemoveFriendConfirmOpen,
        handleRemoveFriendConfirm,
        reportUserOpen,
        setReportUserOpen,
      )}
    </>
  );
}

// зачем: подтверждение удаления друга и жалоба на ник рендерятся ВНЕ анимированной
// панели (свои Modal), поэтому не участвуют в classic/hybrid ветвлении входа.
function renderProfileModalOverlays(
  player: PlayerInfo,
  lang: string,
  removeFriendConfirmOpen: boolean,
  setRemoveFriendConfirmOpen: (v: boolean) => void,
  handleRemoveFriendConfirm: () => void,
  reportUserOpen: boolean,
  setReportUserOpen: (v: boolean) => void,
) {
  return (
    <>
    <ThemedConfirmModal
      visible={removeFriendConfirmOpen}
      title={triLang(lang as Lang, {
        ru: 'Удалить друга?',
        uk: 'Видалити друга?',
        es: '¿Eliminar amigo?',
        en: 'Delete friend?',
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
        en: 'Cancel',
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
        en: 'Delete',
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
    <ReportUserModal
      visible={reportUserOpen}
      reportedUid={player.friendUid || player.uid || ''}
      reportedName={player.name}
      screen="profile"
      lang={lang as Lang}
      onClose={() => setReportUserOpen(false)}
    />
    </>
  );
}

function PlayerProfileModal({ player, myInfo, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [friendToast, setFriendToast] = useState<string | null>(null);
  const [friendToastType, setFriendToastType] = useState<'error' | 'info'>('info');
  const reduceMotion = useReduceMotion();
  const modalOpen = !!player;

  useEffect(() => {
    if (player) return;
    slideAnim.setValue(500);
    fadeAnim.setValue(0);
    setFriendToast(null);
  }, [fadeAnim, player, slideAnim]);

  useEffect(() => {
    if (!player) return;
    slideAnim.stopAnimation();
    fadeAnim.stopAnimation();
    if (reduceMotion) slideAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: reduceMotion ? 0 : 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: reduceMotion ? 150 : 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, player, reduceMotion, slideAnim]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const showFriendRequestToast = useCallback(
    (message: string, toastType: 'error' | 'info' = 'info') => {
      setFriendToastType(toastType);
      setFriendToast(message);
    },
    [],
  );

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      hardwareAccelerated
      statusBarTranslucent
      navigationBarTranslucent
    >
      {player ? (
        <View style={styles.modalFill} pointerEvents="box-none">
          <PlayerProfileModalBody
            player={player}
            myInfo={myInfo}
            slideAnim={slideAnim}
            fadeAnim={fadeAnim}
            onBackdropPress={handleClose}
            onClose={handleClose}
            onFriendRequestToast={showFriendRequestToast}
          />
          <InGameToast
            message={friendToast}
            type={friendToastType}
            onHide={() => setFriendToast(null)}
          />
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFill: {
    flex: 1,
  },
});

export default memo(PlayerProfileModal);
