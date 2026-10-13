// ─── Визитка 2.0: друзья, лайк за активность, жалоба — логика без изменений ────
// зачем: вынесено из components/PlayerProfileModal.tsx при переносе макета визитки
// (2026-09-30), чтобы файл визитки оставался раскладкой. Поведение прежнее:
// optimistic заявка/удаление/лайк с откатом, общий friends_account_store,
// persistent-лайки через fetchActivityLikeState(uid). Немых catch нет — каждый
// сбой пишет причину с префиксом [PROFILE-CARD].
import { useCallback, useEffect, useRef, useState } from 'react';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../../app/config';
import { DebugLogger } from '../../app/debug-logger';
import { emitAppEvent } from '../../app/events';
import {
  fetchActivityLikeState,
  fetchActivityLikeTotal,
  PROFILE_LIKE_EVENT_ID,
  removeFriendActivityLike,
  sendFriendActivityLike,
  type FriendActivityLikeState,
} from '../../app/friend_activity_likes';
import { friendsAccountStore } from '../../app/friends_account_store';
import { deleteFriend, sendFriendRequest } from '../../app/firestore_friend_requests';
import { resolvePlayerProfileV2State } from '../../app/player_profile_v2_state';
import {
  hasLikedSynthetic,
  loadSyntheticActivityLikes,
  syntheticLikesAddedByMe,
  toggleSyntheticLike,
} from '../../app/synthetic_activity_likes';
import {
  isSyntheticUid,
  loadSyntheticFriendRequests,
  peekSyntheticFriendRequests,
  rememberSyntheticFriendRequest,
} from '../../app/synthetic_friend_requests';
import { getCanonicalUserId } from '../../app/user_id_policy';
import { triLang, type Lang } from '../../constants/i18n';
import { residentBaseLikes } from '../../constants/synthetic_residents';
import { hapticTap } from '../../hooks/use-haptics';
import { PC, t4 } from './profile_card_copy';

type SocialPlayer = Readonly<{
  name: string;
  points: number;
  isMe: boolean;
  uid?: string;
  friendUid?: string;
}>;

function logCatch(where: string, error: unknown): void {
  DebugLogger.warn('[PROFILE-CARD]', `${where}: ${error instanceof Error ? error.message : String(error)}`);
}

// зачем (аудит Optimistic UI Профиля, 13.10): отправленная заявка нигде не помнилась (кроме синтетических) — закрыл карточку и открыл снова, кнопка опять «Добавить в друзья», тап стоил 3–5 чтений
// ради ответа «уже отправлена». Держим uid в памяти процесса 10 минут (не durable, не очередь «показать потом»): живая подписка на друзей сама уберёт принятого, откат — удаляет.
const SENT_REQUEST_MEMORY_MS = 10 * 60_000;
const sentRequestsInSession = new Map<string, number>();

function peekSentRequests(): string[] {
  const now = Date.now();
  const alive: string[] = [];
  sentRequestsInSession.forEach((at, uid) => {
    if (now - at < SENT_REQUEST_MEMORY_MS) alive.push(uid);
    else sentRequestsInSession.delete(uid);
  });
  return alive;
}

export function usePlayerProfileSocial(
  player: SocialPlayer,
  myName: string,
  L: Lang,
  onFriendRequestToast: (message: string, toastType?: 'error' | 'info') => void,
) {
  const isMe = player.isMe;
  const [friendRequestBusy, setFriendRequestBusy] = useState(false);
  // зачем (там же): первый кадр уже знает друзей из снимка вкладки «Друзья» — раньше у друга на миг стояло «Добавить в друзья», пока подписка не ответила. Чтений нет, снимок в памяти.
  const [friendUids, setFriendUids] = useState<Set<string>>(() => (player.isMe ? new Set() : new Set(friendsAccountStore.getSnapshot().rows.map((row) => row.uid))));
  const [friendRequestSentUids, setFriendRequestSentUids] = useState<Set<string>>(
    () => new Set([...peekSyntheticFriendRequests(), ...peekSentRequests()]),
  );
  // Синхронный замок действий с друзьями: состояние `friendRequestBusy` обновляется после рендера, два тапа в одном кадре прошли бы оба.
  const friendOpInFlightRef = useRef(false);
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
    setFriendRequestSentUids(new Set([...peekSyntheticFriendRequests(), ...peekSentRequests()]));
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
      nextFriendUids.forEach((uid) => sentRequestsInSession.delete(uid)); // принятая заявка больше не «в пути»
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
      // зачем (аудит Optimistic UI Профиля, 13.10; Firebase-экономия): счётчик лайков рисует только футер ЧУЖОЙ карточки (PlayerProfileModal → ProfileCardOtherFooter) — у своей карточки это было лишнее чтение при каждом открытии.
      const [total, likeState] = await Promise.all([
        isMe ? Promise.resolve(0) : fetchActivityLikeTotal(uid),
        isMe ? Promise.resolve(null) : fetchActivityLikeState(uid).catch((error: unknown) => {
          logCatch('лайк: состояние не прочитано', error);
          return null;
        }),
      ]);
      if (cancelled) return;
      setActivityLikeTotal(total);
      setProfileLike(likeState);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMe, player.friendUid, player.points, player.uid]);

  const requestSentText = triLang(L, {
    ru: 'Заявка отправлена!', uk: 'Заявку надіслано!', es: '¡Solicitud enviada!', en: 'Request sent!',
    'pt-BR': 'Solicitação enviada!', vi: 'Đã gửi lời mời!', id: 'Permintaan terkirim!', tr: 'İstek gönderildi!', pl: 'Zaproszenie wysłane!',
  });
  const requestFailedText = triLang(L, {
    ru: 'Не отправилось. Попробуй позже', uk: 'Не вдалося надіслати. Спробуй пізніше', es: 'No se pudo enviar. Inténtalo más tarde',
    en: 'Failed to send. Try again later', 'pt-BR': 'Não foi possível enviar. Tente mais tarde', vi: 'Không gửi được. Hãy thử lại sau',
    id: 'Tidak dapat dikirim. Coba lagi nanti', tr: 'Gönderilemedi. Daha sonra tekrar dene', pl: 'Nie udało się wysłać. Spróbuj później',
  });

  const handleAddFriendPress = useCallback(async () => {
    if (!friendRequestTargetUid || friendRequestBusy || friendOpInFlightRef.current) return;
    friendOpInFlightRef.current = true;
    const targetUid = friendRequestTargetUid;
    setFriendRequestBusy(true);
    setFriendRequestSentUids((previous) => new Set([...previous, targetUid]));
    onFriendRequestToast(requestSentText, 'info');

    if (isSyntheticUid(targetUid)) {
      rememberSyntheticFriendRequest(targetUid);
      setFriendRequestBusy(false);
      friendOpInFlightRef.current = false;
      return;
    }
    sentRequestsInSession.set(targetUid, Date.now());

    try {
      const result = await sendFriendRequest(targetUid);
      if (result === 'sent') {
        onFriendRequestToast(requestSentText, 'info');
      } else if (result === 'already_friends') {
        setFriendRequestSentUids((previous) => {
          sentRequestsInSession.delete(targetUid);
          const next = new Set(previous);
          next.delete(targetUid);
          return next;
        });
        setFriendUids((previous) => new Set([...previous, targetUid]));
        onFriendRequestToast(triLang(L, {
          ru: 'Уже друзья', uk: 'Уже друзі', es: 'Ya son amigos', en: 'Already friends', 'pt-BR': 'Vocês já são amigos',
          vi: 'Hai bạn đã là bạn bè', id: 'Kalian sudah berteman', tr: 'Zaten arkadaşsınız', pl: 'Już jesteście znajomymi',
        }), 'info');
      } else if (result === 'already_sent') {
        onFriendRequestToast(triLang(L, {
          ru: 'Заявка уже отправлена', uk: 'Заявку вже надіслано', es: 'Solicitud ya enviada', en: 'Request already sent',
          'pt-BR': 'Solicitação já enviada', vi: 'Lời mời đã được gửi', id: 'Permintaan sudah dikirim', tr: 'İstek zaten gönderildi', pl: 'Zaproszenie już wysłane',
        }), 'info');
      } else if (result === 'self' || result === 'not_found' || result === 'error' || result === 'network') {
        setFriendRequestSentUids((previous) => {
          sentRequestsInSession.delete(targetUid);
          const next = new Set(previous);
          next.delete(targetUid);
          return next;
        });
        onFriendRequestToast(
          result === 'self'
            ? triLang(L, {
                ru: 'Это твой профиль', uk: 'Це твій профіль', es: 'Es tu perfil', en: 'This is your profile', 'pt-BR': 'Este é seu perfil',
                vi: 'Đây là hồ sơ của bạn', id: 'Ini profilmu', tr: 'Bu senin profilin', pl: 'To twój profil',
              })
            : result === 'network'
              // зачем (PM-162): при сбое сети — «Связь пропала», а не общее «не удалось».
              ? triLang(L, {
                  ru: 'Связь пропала. Попробуй ещё раз', uk: 'Зв’язок зник. Спробуй ще раз', es: 'Se perdió la conexión. Inténtalo de nuevo',
                  en: 'Connection lost. Try again', 'pt-BR': 'A conexão caiu. Tente novamente', vi: 'Mất kết nối. Hãy thử lại',
                  id: 'Koneksi terputus. Coba lagi', tr: 'Bağlantı kesildi. Tekrar dene', pl: 'Brak połączenia. Spróbuj ponownie',
                })
              : requestFailedText,
          result === 'self' ? 'info' : 'error',
        );
      }
    } catch (error) {
      logCatch('заявка в друзья: сбой', error);
      setFriendRequestSentUids((previous) => {
        sentRequestsInSession.delete(targetUid);
        const next = new Set(previous);
        next.delete(targetUid);
        return next;
      });
      onFriendRequestToast(requestFailedText, 'error');
    } finally {
      setFriendRequestBusy(false);
      friendOpInFlightRef.current = false;
    }
  }, [friendRequestBusy, friendRequestTargetUid, L, onFriendRequestToast, requestFailedText, requestSentText]);

  const handleFriendButtonPress = useCallback(() => {
    if (!friendRequestTargetUid || friendRequestBusy || isFriendRequestSent) return;
    hapticTap();
    if (isAlreadyFriend) {
      setRemoveFriendConfirmOpen(true);
      return;
    }
    void handleAddFriendPress();
  }, [friendRequestBusy, friendRequestTargetUid, handleAddFriendPress, isAlreadyFriend, isFriendRequestSent]);

  const handleRemoveFriendConfirm = useCallback(() => {
    if (!friendRequestTargetUid || friendRequestBusy || friendOpInFlightRef.current) return;
    friendOpInFlightRef.current = true;
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
        onFriendRequestToast(triLang(L, {
          ru: 'Друг убран из списка', uk: 'Друга видалено', es: 'Amigo eliminado', en: 'Friend removed', 'pt-BR': 'Amigo removido',
          vi: 'Đã xóa bạn bè', id: 'Teman dihapus', tr: 'Arkadaş silindi', pl: 'Znajomy usunięty',
        }), 'info');
      })
      .catch((error: unknown) => {
        logCatch('удаление друга: сбой, откат', error);
        if (wasFriend) {
          setFriendUids((previous) => new Set([...previous, removedUid]));
        }
        onFriendRequestToast(triLang(L, {
          ru: 'Не получилось убрать. Попробуй ещё раз', uk: 'Не вийшло прибрати. Спробуй ще раз', es: 'No se pudo quitar. Inténtalo de nuevo',
          en: 'Could not remove. Try again', 'pt-BR': 'Não deu para remover. Tente de novo', vi: 'Chưa gỡ được. Hãy thử lại',
          id: 'Belum bisa dihapus. Coba lagi', tr: 'Kaldırılamadı. Tekrar dene', pl: 'Nie udało się usunąć. Spróbuj ponownie',
        }), 'error');
      })
      .finally(() => {
        setFriendRequestBusy(false);
        friendOpInFlightRef.current = false;
      });
  }, [friendRequestBusy, friendRequestTargetUid, friendUids, L, onFriendRequestToast]);

  const handleToggleLike = useCallback(() => {
    if (!canLike || !likeTargetUid || likeInFlightRef.current) return;
    hapticTap();
    likeInFlightRef.current = true;
    setLikeBusy(true);

    const wasLiked = likedThisProfile;
    // зачем (аудит Optimistic UI Профиля, 13.10): запоминаем, что человек видел ДО тапа, — при сбое возвращаем ровно это.
    const prevTotal = activityLikeTotal;
    const prevLike = profileLike;
    if (wasLiked) {
      setActivityLikeTotal((total) => Math.max(0, total - 1));
      setProfileLike(null);
    } else {
      setActivityLikeTotal((total) => total + 1);
      setProfileLike({ date: '', targetUid: likeTargetUid, eventId: PROFILE_LIKE_EVENT_ID, createdAt: Date.now() });
    }

    if (isSyntheticUid(likeTargetUid)) {
      toggleSyntheticLike(likeTargetUid, !wasLiked);
      likeInFlightRef.current = false;
      setLikeBusy(false);
      return;
    }

    const action = wasLiked
      ? removeFriendActivityLike({ targetUid: likeTargetUid })
      : sendFriendActivityLike({ targetUid: likeTargetUid, senderDisplayName: myName });

    void action
      .then((result) => {
        setActivityLikeTotal(Math.max(0, Math.floor(Number(result.targetActivityLikeTotal) || 0)));
        setProfileLike(
          wasLiked
            ? null
            : { date: result.date, targetUid: result.targetUid, eventId: result.eventId, createdAt: Date.now() },
        );
        emitAppEvent('profile_like_changed', { targetUid: likeTargetUid, liked: !wasLiked });
      })
      .catch((error: unknown) => {
        // зачем (аудит Optimistic UI Профиля, 13.10): раньше сбой «сверялся с сервером», но чтения лайков при обрыве связи глотают ошибку и отдают «нет лайка» и 0 — сердце гасло, счётчик падал в ноль,
        // хотя сервер не менялся. Откат к значениям до тапа мгновенный и без чтений; правда сервера подтянется при следующем открытии карточки.
        logCatch('лайк: сбой, откат к значениям до тапа', error);
        DebugLogger.warn('[PROFILE-LIKE]', `откат ${likeTargetUid.slice(0, 6)}…: было liked=${String(wasLiked)} total=${prevTotal} → возвращаем liked=${String(!!prevLike)} total=${prevTotal} (источник: значения до тапа, чтений нет)`);
        setProfileLike(prevLike);
        setActivityLikeTotal(prevTotal);
        onFriendRequestToast(triLang(L, {
          ru: 'Не получилось. Проверь интернет и попробуй ещё раз', uk: 'Не вдалося. Перевір інтернет і спробуй ще раз',
          es: 'No funcionó. Comprueba Internet e inténtalo de nuevo', en: 'Did not work. Check your internet and try again',
          'pt-BR': 'Não deu certo. Verifique a internet e tente novamente', vi: 'Không thành công. Hãy kiểm tra mạng rồi thử lại',
          id: 'Gagal. Periksa internet lalu coba lagi', tr: 'Olmadı. İnterneti kontrol edip tekrar dene', pl: 'Nie udało się. Sprawdź internet i spróbuj ponownie',
        }), 'error');
      })
      .finally(() => {
        likeInFlightRef.current = false;
        setLikeBusy(false);
      });
  }, [activityLikeTotal, canLike, L, likeTargetUid, likedThisProfile, myName, onFriendRequestToast, profileLike]);

  const relationshipText = (() => {
    switch (profileState) {
      case 'self': return t4(L, { ru: 'Твоя визитка', uk: 'Твоя візитка', en: 'Your player card', es: 'Tu tarjeta' });
      case 'readonly': return t4(L, { ru: 'Профиль доступен только для просмотра', uk: 'Профіль доступний лише для перегляду', en: 'View-only profile', es: 'Perfil disponible solo para ver' });
      case 'add-busy': return t4(L, { ru: 'Отправляем заявку…', uk: 'Надсилаємо заявку…', en: 'Sending request…', es: 'Enviando solicitud…' });
      case 'request-sent': return t4(L, PC.requestSent);
      case 'friend': return t4(L, PC.friends);
      // зачем (Сверка, R1_LONG_TRANSLATIONS 13.10): строка жила вне таблицы PC — на pt-BR/vi/id/tr/pl падала на английский.
      case 'liked': return t4(L, PC.activityLiked);
      default: return t4(L, PC.addFriend);
    }
  })();

  const friendActionLabel = isAlreadyFriend
    ? t4(L, { ru: 'Удалить из друзей', uk: 'Видалити з друзів', en: 'Remove friend', es: 'Eliminar amigo' })
    : isFriendRequestSent
      ? relationshipText
      : t4(L, PC.addFriend);


  return {
    friendRequestTargetUid,
    showAddFriend,
    isAlreadyFriend,
    isFriendRequestSent,
    friendRequestBusy,
    canLike,
    likedThisProfile,
    likeBusy,
    activityLikeTotal,
    profileState,
    relationshipText,
    friendActionLabel,
    handleFriendButtonPress,
    handleToggleLike,
    handleRemoveFriendConfirm,
    removeFriendConfirmOpen,
    setRemoveFriendConfirmOpen,
    reportUserOpen,
    setReportUserOpen,
  };
}
