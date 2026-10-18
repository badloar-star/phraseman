import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Reanimated, { cancelAnimation, Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import AvatarView from './AvatarView';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { HOME_NOTIFICATION_BADGE_COLOR, HOME_NOTIFICATION_BADGE_TEXT_COLOR } from './homeNotificationBadge';
import AppMessagesInbox from './AppMessagesInbox';
import {
  claimReportRewardBundle,
  reportRewardCoins,
  reportRewardHasVisibleReward,
  resumePendingReportRewardBundleClaims,
} from '../app/report_reward_bundle';
import {
  countUnreadNotifications,
  deleteUserNotification,
  isUserNotificationVisible,
  loadOlderUserNotifications,
  markUserNotificationsRead,
  probeUserNotificationsHead,
  readCachedUserNotifications,
  refreshUserNotificationsOnce,
  type UserNotification,
  type UserNotificationType,
} from '../app/user_notifications';
import {
  hideNotificationIds,
  NOTIFICATION_DELETE_UNDO_MS,
  stageNotificationDeletion,
  undoNotificationDeletion,
  type PendingNotificationDeletion,
} from '../app/notification_delete_undo';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import PressableScale from './PressableScale';
import { V2 } from '../constants/v2Style';
import { useV2Palette } from './v2/useV2Palette';
import { colorWithAlpha } from './v2/plateAlpha';
import { nestedBoxShadow, useShadowGlass } from './v2/ShadowSurface';
import { KitSheetModal } from './v2/KitSheetModal';
import auth from '@react-native-firebase/auth';
import { noAndroidOutline } from '../constants/androidGlow';
import BackGlyph from './v2/BackGlyph';
import { HomeBellStateContext } from './home/v2/home_bell_state';

const EXEMPT_COLOR_1 = 'rgba(99,217,143,0.35)'; // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
const EXEMPT_COLOR_2 = '#2E9E63'; // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
const EXEMPT_COLOR_3 = '#F6C453'; // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
const EXEMPT_COLOR_4 = '#63D98F'; // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
const EXEMPT_COLOR_5 = '#F6C453'; // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
const EXEMPT_COLOR_6 = '#07110A'; // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)

/**
 * Центр событий на главной: «кто поставил лайк, кто принял заявку, кто ответил
 * на сообщение» — всё в одном месте. Данные пишут cloud functions в
 * users/{stableUid}/notifications; тап по событию ведёт ровно туда, где оно случилось
 * (чат — к конкретному сообщению с подсветкой).
 */

// The header reads the server at app entry only when its 12-hour cache is stale.
// Between refreshes it renders the cached unread count, without background polling.
const NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 12 * 60 * 60_000;

type NotificationCenterButtonProps = {
  /** Без провайдера HomeBellStateContext берётся отсюда; на Главной приходит из контекста (шапка не перерисовывается на возврате). */
  isHomeTabActive?: boolean;
  homeFocusTick?: number;
  requestedReportReply?: UserNotification | null;
  onRequestedReportReplyHandled?: () => void;
};

function centerCopy(lang: Lang) {
  return {
    showMore: triLang(lang, { ru: 'Показать ещё', uk: 'Показати ще', en: 'Show more', es: 'Mostrar más', 'pt-BR': 'Mostrar mais', vi: 'Xem thêm', id: 'Tampilkan lagi', tr: 'Daha fazla göster', pl: 'Pokaż więcej' }),
    // зачем (Сверка system-014/015, system.html inbox): «Сообщения» + подзаголовок «Все прочитаны» / «N новых»;
    // пустое — «Сообщений нет» и пояснение (было «Уведомления» и «Здесь пока тихо» без пояснения).
    title: triLang(lang, { ru: 'Сообщения', en: 'Messages', uk: 'Повідомлення', es: 'Mensajes', 'pt-BR': 'Mensagens', vi: 'Tin nhắn', id: 'Pesan', tr: 'Mesajlar', pl: 'Wiadomości' }),
    allRead: triLang(lang, { ru: 'Все прочитаны', en: 'All read', uk: 'Усі прочитані', es: 'Todo leído', 'pt-BR': 'Tudo lido', vi: 'Đã đọc hết', id: 'Semua sudah dibaca', tr: 'Hepsi okundu', pl: 'Wszystko przeczytane' }),
    empty: triLang(lang, { ru: 'Сообщений нет', en: 'No messages', uk: 'Повідомлень немає', es: 'No hay mensajes', 'pt-BR': 'Nenhuma mensagem', vi: 'Chưa có tin nhắn', id: 'Belum ada pesan', tr: 'Mesaj yok', pl: 'Brak wiadomości' }),
    emptyHint: triLang(lang, {
      ru: 'Здесь появятся новости от команды.',
      en: 'News from the team will appear here.',
      uk: 'Тут з’являться новини від команди.',
      es: 'Aquí aparecerán las novedades del equipo.',
      'pt-BR': 'As novidades da equipe aparecerão aqui.',
      vi: 'Tin tức từ đội ngũ sẽ xuất hiện ở đây.',
      id: 'Kabar dari tim akan muncul di sini.',
      tr: 'Ekipten haberler burada görünecek.',
      pl: 'Tu pojawią się wiadomości od zespołu.',
    }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
    // зачем (I18N_GAPS_AUTH_R1, 13.10): плашка отмены удаления была только по-русски на всех 9 языках интерфейса.
    deletedUndo: triLang(lang, { ru: 'Уведомление удалено', uk: 'Сповіщення видалено', en: 'Notification deleted', es: 'Notificación eliminada', 'pt-BR': 'Notificação excluída', vi: 'Đã xóa thông báo', id: 'Notifikasi dihapus', tr: 'Bildirim silindi', pl: 'Powiadomienie usunięte' }),
    undo: triLang(lang, { ru: 'Вернуть', uk: 'Повернути', en: 'Undo', es: 'Deshacer', 'pt-BR': 'Desfazer', vi: 'Hoàn tác', id: 'Urungkan', tr: 'Geri al', pl: 'Cofnij' }),
  };
}

// «2 новых» (макет): ru/uk — 1 новое / 2 новых; остальные — короткая форма.
function newCountLabel(lang: Lang, n: number): string {
  const n10 = n % 10; const n100 = n % 100;
  const one = n10 === 1 && n100 !== 11;
  return triLang(lang, {
    ru: `${n} ${one ? 'новое' : 'новых'}`,
    uk: `${n} ${one ? 'нове' : 'нових'}`,
    en: `${n} new`,
    es: `${n} ${n === 1 ? 'nuevo' : 'nuevos'}`,
    'pt-BR': `${n} ${n === 1 ? 'nova' : 'novas'}`,
    vi: `${n} mới`,
    id: `${n} baru`,
    tr: `${n} yeni`,
    pl: `${n} ${n === 1 ? 'nowa' : 'nowe'}`,
  });
}

function reportReplyCopy(lang: Lang) {
  return {
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć' }),
    reportReply: triLang(lang, { ru: 'Ответ на репорт', uk: 'Відповідь на репорт', en: 'Reply to your report', es: 'Respuesta a tu reporte', 'pt-BR': 'Resposta ao seu reporte', vi: 'Phản hồi báo cáo', id: 'Balasan laporan', tr: 'Rapor yanıtı', pl: 'Odpowiedź na zgłoszenie' }),
    claim: triLang(lang, { ru: 'Получить', uk: 'Отримати', en: 'Claim', es: 'Recibir', 'pt-BR': 'Receber', vi: 'Nhận', id: 'Ambil', tr: 'Al', pl: 'Odbierz' }),
    claimError: triLang(lang, { ru: 'Не получилось начислить награду. Попробуй ещё раз.', uk: 'Не вдалося нарахувати нагороду. Спробуй ще раз.', en: 'Could not apply the reward. Please try again.', es: 'No se pudo entregar la recompensa. Inténtalo de nuevo.', 'pt-BR': 'Não foi possível entregar a recompensa. Tente de novo.', vi: 'Không thể trao thưởng. Hãy thử lại.', id: 'Hadiah belum dapat diberikan. Coba lagi.', tr: 'Ödül verilemedi. Tekrar deneyin.', pl: 'Nie udało się przyznać nagrody. Spróbuj ponownie.' }),
    claimed: triLang(lang, { ru: 'Награда получена', uk: 'Нагороду отримано', en: 'Reward claimed', es: 'Recompensa recibida', 'pt-BR': 'Recompensa recebida', vi: 'Đã nhận thưởng', id: 'Hadiah diterima', tr: 'Ödül alındı', pl: 'Nagroda odebrana' }),
  };
}

function notificationLabel(type: UserNotificationType, lang: Lang): string {
  switch (type) {
    case 'friend_request':
      return triLang(lang, { ru: 'заявка в друзья', uk: 'заявка в друзі', en: 'friend request', es: 'solicitud de amistad', 'pt-BR': 'pedido de amizade', vi: 'lời mời kết bạn', id: 'permintaan pertemanan', tr: 'arkadaşlık isteği', pl: 'zaproszenie do znajomych' });
    case 'friend_accepted':
      return triLang(lang, { ru: 'принял(а) твою заявку', uk: 'прийняв(ла) твою заявку', en: 'accepted your request', es: 'aceptó tu solicitud', 'pt-BR': 'aceitou seu pedido', vi: 'đã chấp nhận lời mời', id: 'menerima permintaanmu', tr: 'isteğini kabul etti', pl: 'przyjął(ęła) zaproszenie' });
    case 'activity_like':
      return triLang(lang, { ru: 'поставил(а) тебе лайк', uk: 'поставив(ла) тобі лайк', en: 'liked you', es: 'te dio un like', 'pt-BR': 'curtiu você', vi: 'đã thích bạn', id: 'menyukaimu', tr: 'seni beğendi', pl: 'dał(a) ci polubienie' });
    case 'arena_partner_invite':
      return triLang(lang, { ru: 'отправил(а) тебе приглашение', uk: 'надіслав(ла) тобі запрошення', en: 'sent you an invitation', es: 'te envió una invitación', 'pt-BR': 'enviou um convite', vi: 'đã gửi lời mời cho bạn', id: 'mengirimimu undangan', tr: 'sana davet gönderdi', pl: 'wysłał(a) ci zaproszenie' });
    case 'arena_partner_nudge':
      return triLang(lang, { ru: 'напомнил(а) о себе', uk: 'нагадав(ла) про себе', en: 'sent you a reminder', es: 'te envió un recordatorio', 'pt-BR': 'enviou um lembrete', vi: 'đã nhắc bạn', id: 'mengirimimu pengingat', tr: 'sana hatırlatma gönderdi', pl: 'przypomniał(a) o sobie' });
    case 'friend_nudge':
      return triLang(lang, { ru: 'зовёт позаниматься', uk: 'кличе позайматися', en: 'is inviting you to study', es: 'te invita a estudiar', 'pt-BR': 'chama você para estudar', vi: 'rủ bạn học', id: 'mengajakmu belajar', tr: 'seni çalışmaya çağırıyor', pl: 'zaprasza do nauki' });
    case 'report_reply':
      return reportReplyCopy(lang).reportReply;
    case 'pack_comment':
      return triLang(lang, { ru: 'оставил(а) отклик', uk: 'залишив(ла) відгук', en: 'left a comment', es: 'dejó un comentario', 'pt-BR': 'deixou um comentário', vi: 'đã để lại bình luận', id: 'meninggalkan komentar', tr: 'yorum bıraktı', pl: 'zostawił(a) komentarz' });
    default:
      return '';
  }
}

function notificationIcon(type: UserNotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'friend_request': return 'person-add-outline';
    case 'friend_accepted': return 'people-outline';
    case 'activity_like': return 'heart';
    case 'arena_partner_invite': return 'people-circle-outline';
    case 'arena_partner_nudge': return 'flash-outline';
    case 'friend_nudge': return 'book-outline';
    case 'report_reply': return 'chatbox-ellipses-outline';
    case 'pack_comment': return 'chatbubble-outline';
    default: return 'notifications-outline';
  }
}

function notificationIconColor(type: UserNotificationType, fallback: string): string {
  if (type === 'activity_like') return '#FF2D55'; // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
  if (type === 'friend_accepted') return '#34C759'; // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
  if (type === 'report_reply') return '#2E9E63'; // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
  return fallback;
}

function timeLabel(ms: number): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function NotificationCenterButton({
  isHomeTabActive: isHomeTabActiveProp,
  homeFocusTick: homeFocusTickProp,
  requestedReportReply = null,
  onRequestedReportReplyHandled,
}: NotificationCenterButtonProps) {
  // зачем (координатор 18.10, [HOME-CHILD-COST]): активность вкладки и счётчик фокусов читаем из контекста Главной — элемент колокольчика в шапке остаётся неизменным, шапка не перерисовывается на каждом возврате
  const bellState = useContext(HomeBellStateContext);
  const isHomeTabActive = bellState?.active ?? isHomeTabActiveProp ?? false;
  const homeFocusTick = bellState?.focusTick ?? homeFocusTickProp ?? 0;
  const v2 = useV2Palette();
  const shadowGlass = useShadowGlass();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isScreenFocused = useIsScreenFocused();
  const copy = useMemo(() => ({ ...centerCopy(lang as Lang), ...reportReplyCopy(lang as Lang) }), [lang]);
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<UserNotification[]>([]);
  // зачем (Ядро 01.10): «Показать ещё» догружает старые уведомления страницей; hasMore=false — кнопки нет.
  const [hasOlder, setHasOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);
  const loadOlder = useCallback(() => {
    if (loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    void loadOlderUserNotifications().then((page) => {
      console.log('[NOTIF] older page', JSON.stringify({ fetched: page.fetched, total: page.list.length, hasMore: page.hasMore }));
      setItems(hideNotificationIds(page.list, hiddenNotificationIdsRef.current));
      setHasOlder(page.hasMore);
    }).catch((error: unknown) => {
      console.warn('[NOTIF] older page failed', error instanceof Error ? error.message : String(error));
    }).finally(() => {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    });
  }, []);
  const [teamUnreadCount, setTeamUnreadCount] = useState(0);
  const [teamMessageCount, setTeamMessageCount] = useState(0);
  const [teamDetailOpen, setTeamDetailOpen] = useState(false);
  const markedReadIdsRef = useRef<Set<string>>(new Set());
  const [claimingMessageId, setClaimingMessageId] = useState<string | null>(null);
  const [claimErrorMessageId, setClaimErrorMessageId] = useState<string | null>(null);
  const notificationTargetRef = useRef<View>(null);
  const requestGenerationRef = useRef(0);
  const [identityRevision, setIdentityRevision] = useState(0);
  const [pendingDeletion, setPendingDeletion] = useState<PendingNotificationDeletion<UserNotification> | null>(null);
  const pendingDeletionRef = useRef<PendingNotificationDeletion<UserNotification> | null>(null);
  const hiddenNotificationIdsRef = useRef<Set<string>>(new Set());
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      return auth().onAuthStateChanged(() => {
        requestGenerationRef.current += 1;
        setItems([]);
        setSelectedId(null);
        setTeamUnreadCount(0);
        setTeamMessageCount(0);
        setTeamDetailOpen(false);
        markedReadIdsRef.current.clear();
        setClaimingMessageId(null);
        setClaimErrorMessageId(null);
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
        pendingDeletionRef.current = null;
        hiddenNotificationIdsRef.current.clear();
        setPendingDeletion(null);
        setIdentityRevision((current) => current + 1);
      });
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!isScreenFocused || !isHomeTabActive) return;
    void resumePendingReportRewardBundleClaims();
    let alive = true;
    const generation = ++requestGenerationRef.current;
    let authoritativeResultApplied = false;
    const refreshOnce = () => {
      // зачем (владелец 17.10 «друзья должны находиться мгновенно, а не через полчаса»): полный перечит раз в 12 ч прятал
      // заявку в друзья часами. Сначала проба одного документа (≤1 раз в минуту), полный список — только если пришло новое.
      void probeUserNotificationsHead('home_focus').then((probed) => probed ?? refreshUserNotificationsOnce({
        minIntervalMs: NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS,
      })).then((list) => {
        if (alive && requestGenerationRef.current === generation) {
          authoritativeResultApplied = true;
          setItems(hideNotificationIds(list, hiddenNotificationIdsRef.current));
        }
      });
    };
    void readCachedUserNotifications().then((cached) => {
      if (alive && requestGenerationRef.current === generation && !authoritativeResultApplied && cached.length) {
        setItems((cur) => (cur.length ? cur : hideNotificationIds(cached, hiddenNotificationIdsRef.current)));
      }
    });
    refreshOnce();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshOnce();
      }
    });
    return () => {
      alive = false;
      appSub.remove();
    };
  }, [homeFocusTick, identityRevision, isHomeTabActive, isScreenFocused]);

  const visibleItems = useMemo(() => items.filter(isUserNotificationVisible), [items]);
  const unreadCount = countUnreadNotifications(
    visibleItems.filter((row) => !markedReadIdsRef.current.has(row.id)),
  );
  const combinedUnreadCount = teamUnreadCount + unreadCount;
  const selected = useMemo(() => visibleItems.find((row) => row.id === selectedId) ?? null, [visibleItems, selectedId]);

  useEffect(() => {
    if (!requestedReportReply?.reportReply || requestedReportReply.type !== 'report_reply') return;
    setItems((current) => current.some((row) => row.id === requestedReportReply.id)
      ? current.map((row) => row.id === requestedReportReply.id ? { ...requestedReportReply, read: true } : row)
      : [{ ...requestedReportReply, read: true }, ...current]);
    markedReadIdsRef.current.add(requestedReportReply.id);
    setSelectedId(requestedReportReply.id);
    setVisible(true);
    void markUserNotificationsRead([requestedReportReply.id]);
    onRequestedReportReplyHandled?.();
  }, [onRequestedReportReplyHandled, requestedReportReply]);

  // Гибрид «Световод + Чекан» (owner-инициатива, семья «Отклик» B6): микро-
  // качание колокольчика 4→-2.5→0 ОДИН раз, ровно в момент появления бейджа
  // непрочитанного (переход 0 → >0), не на каждый ре-рендер счётчика.
  const reduceMotion = useReduceMotion();
  const bellShakeDeg = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(bellShakeDeg);
    bellShakeDeg.value = 0;
    if (combinedUnreadCount <= 0 || reduceMotion) return;
    bellShakeDeg.value = withRepeat(withSequence(
      withTiming(4, { duration: 95, easing: Easing.out(Easing.cubic) }),
      withTiming(-3, { duration: 105, easing: Easing.inOut(Easing.cubic) }),
      withTiming(2, { duration: 90, easing: Easing.inOut(Easing.cubic) }),
      withTiming(0, { duration: 110, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 2400 }),
    ), 3, false); /* зачем (владелец 01.10): анимации на Главной короткие — 3 раза и покой */
    return () => cancelAnimation(bellShakeDeg);
  }, [bellShakeDeg, combinedUnreadCount, reduceMotion]);
  const bellShakeStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${bellShakeDeg.value}deg` }] }));

  const commitPendingDeletion = useCallback(() => {
    const deletion = pendingDeletionRef.current;
    if (!deletion) return;
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = null;
    pendingDeletionRef.current = null;
    setPendingDeletion(null);
    void deleteUserNotification(deletion.row.id);
  }, []);

  const stageDelete = useCallback((row: UserNotification) => {
    commitPendingDeletion();
    const staged = stageNotificationDeletion(items, row.id, Date.now());
    if (!staged.deletion) return;
    hapticTap();
    hiddenNotificationIdsRef.current.add(row.id);
    setItems(staged.rows);
    pendingDeletionRef.current = staged.deletion;
    setPendingDeletion(staged.deletion);
    deleteTimerRef.current = setTimeout(commitPendingDeletion, NOTIFICATION_DELETE_UNDO_MS);
  }, [commitPendingDeletion, items]);

  const undoDelete = useCallback(() => {
    const deletion = pendingDeletionRef.current;
    if (!deletion) return;
    hapticTap();
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = null;
    pendingDeletionRef.current = null;
    hiddenNotificationIdsRef.current.delete(deletion.row.id);
    setPendingDeletion(null);
    setItems((current) => undoNotificationDeletion(current, deletion));
  }, []);

  useEffect(() => () => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    const deletion = pendingDeletionRef.current;
    if (deletion) void deleteUserNotification(deletion.row.id);
  }, []);

  const open = useCallback(() => {
    setVisible(true);
    const generation = requestGenerationRef.current;
    // The header can legitimately use a long-lived cache while it is idle. Once
    // the user opens the center, reconcile it immediately so its badge and list
    // cannot describe different server snapshots.
    void refreshUserNotificationsOnce({ force: true }).then((list) => {
      if (requestGenerationRef.current !== generation) return;
      const visibleList = hideNotificationIds(list, hiddenNotificationIdsRef.current);
      setItems(visibleList);
    });
  }, []);

  const close = useCallback(() => {
    hapticTap();
    commitPendingDeletion();
    setSelectedId(null);
    setVisible(false);
  }, [commitPendingDeletion]);

  const backToList = useCallback(() => {
    hapticTap();
    setSelectedId(null);
  }, []);

  const markReportReplyClaimedLocally = useCallback((notificationId: string, messageId: string, claimed = true) => {
    setItems((prev) => prev.map((row) => {
      if (row.id !== notificationId && row.reportReply?.messageId !== messageId) return row;
      if (!row.reportReply) return row;
      return { ...row, reportReply: { ...row.reportReply, claimed } };
    }));
  }, []);

  // зачем (аудит Ядра adc40dad2, координатор 13.10): state `claimingMessageId` обновляется после рендера — второй тап в том же кадре
  // проходил проверку и запускал вторую выдачу. Синхронный замок по id сообщения, снимается в finally.
  const claimLockRef = useRef<Set<string>>(new Set());
  const claimReportReward = useCallback(async (row: UserNotification) => {
    const reward = row.reportReply;
    // зачем (PM-047, владелец): спин убран из наград — claimReportRewardBundle
    // теперь молча закрывает spins-часть без начисления ([SPIN-RETIRED] в
    // report_reward_bundle.ts). hasReward больше не считает spins, чтобы
    // тир, где остались только спины, не показывал забираемую награду,
    // которая ничего не даст.
    const hasReward = !!reward && reportRewardHasVisibleReward(reward.rewardBundle);
    if (!reward || !hasReward || reward.claimed || claimingMessageId === reward.messageId) {
      if (__DEV__) console.info('[REPORT-REWARD] claim tap ignored', { messageId: reward?.messageId, hasReward, claimed: reward?.claimed, busy: claimingMessageId });
      return;
    }
    if (claimLockRef.current.has(reward.messageId)) {
      console.info('[REPORT-REWARD] claim tap ignored reason=lock', { messageId: reward.messageId }); // guard-ok: ранний выход логируется
      return;
    }
    claimLockRef.current.add(reward.messageId);
    hapticTap();
    setClaimErrorMessageId(null);
    setClaimingMessageId(reward.messageId);
    // зачем: Q4 (координатор 01.10) + Optimistic UI — «Получено» показываем сразу,
    // монеты догоняют через очередь выдачи; при ошибке откатываем и пишем причину.
    // Двойной тап закрыт claimingMessageId; durable-очередь claim сама доберёт
    // начисление при следующем открытии, если сеть отвалилась после подтверждения.
    markReportReplyClaimedLocally(row.id, reward.messageId, true);
    try {
      const result = await claimReportRewardBundle(reward.messageId, reward.rewardBundle);
      if (__DEV__) console.info('[REPORT-REWARD] claim ok', { messageId: reward.messageId, status: result.status, coins: reportRewardCoins(result.rewardBundle) });
    } catch (e) {
      if (__DEV__) console.warn('[REPORT-REWARD] claim failed, rollback', { messageId: reward.messageId, error: String(e) });
      markReportReplyClaimedLocally(row.id, reward.messageId, false);
      setClaimErrorMessageId(reward.messageId);
    } finally {
      claimLockRef.current.delete(reward.messageId);
      setClaimingMessageId(null);
    }
  }, [claimingMessageId, markReportReplyClaimedLocally]);

  const openNotification = useCallback((row: UserNotification) => {
    // зачем (правило владельца): хаптик только на управляющих кнопках — тап по плитке/строке без вибрации.
    if (!row.read && !markedReadIdsRef.current.has(row.id)) {
      markedReadIdsRef.current.add(row.id);
      setItems((current) => current.map((candidate) => candidate.id === row.id ? { ...candidate, read: true } : candidate));
      void markUserNotificationsRead([row.id]);
    }
    if (row.type === 'report_reply' && row.reportReply) {
      setSelectedId(row.id);
      return;
    }
    setVisible(false);
    const nav = row.nav;
    if (!nav) return;
    if (nav.kind === 'friend_event') {
      if ((nav.action === 'duel_invite' || nav.action === 'duel_state') && nav.inviteId) {
        // зачем: D83 — клиентская Арена удалена; старое уведомление о дуэли
        // ведёт на Главную, а не в несуществующий экран приглашения.
        if (__DEV__) console.warn('[D83-ARENA-RETIRED] legacy duel notification tap -> home', { action: nav.action });
        router.push('/(tabs)/home' as never);
        return;
      }
      router.push({
        pathname: '/(tabs)/friends',
        params: {
          focusFriend: nav.actorStableUid,
          socialEventId: nav.eventId,
        },
      } as never);
      return;
    }
    // зачем (владелец 2026-09-17): «может нажать и сразу перейти к этому
    // комментарию без открытия промежуточных экранов» — набор открывается
    // с параметрами, а шторку комментариев и подсветку строки берёт на себя
    // сам экран (flashcards_collection.tsx), см. openComments/commentId.
    if (nav.kind === 'pack_comment') {
      router.push({
        pathname: '/flashcards_collection',
        params: { pack: nav.packId, openComments: '1', commentId: nav.commentId },
      } as never);
      return;
    }
    // зачем: /arena_partner удалён (владелец, 2026-08-16). Старое уведомление
    // о партнёре Арены — если у кого-то ещё лежит непрочитанным — теперь
    // падает в тот же безопасный дом, что и уведомления о друзьях.
    router.push('/(tabs)/friends' as any);
  }, []);

  const renderReportReplyDetail = (row: UserNotification) => {
    const reward = row.reportReply;
    if (!reward) return null;
    const title = reward.title || row.text || copy.reportReply;
    const body = reward.body || row.text || '';
    return (
      <ScrollView decelerationRate="fast" style={styles.sheetList} contentContainerStyle={styles.detailContent}>
        <Text style={[styles.detailMeta, { color: t.textGhost }]}>{timeLabel(row.createdAt)}</Text>
        <Text style={[styles.detailTitle, { color: t.textPrimary }]}>{title}</Text>
        {body ? <Text style={[styles.detailBody, { color: t.textMuted }]}>{body}</Text> : null}
        {reportRewardHasVisibleReward(reward.rewardBundle) ? (
          <View style={[styles.rewardCard, { backgroundColor: t.bgSurface, borderColor: EXEMPT_COLOR_1 }]}>
            <Reanimated.View entering={reduceMotion ? undefined : ZoomIn.duration(420).springify()} style={styles.rewardTop}>
              <View style={styles.rewardIcon}>
                <Ionicons name={reward.claimed ? 'checkmark-circle' : 'gift-outline'} size={22} color={EXEMPT_COLOR_2} />
              </View>
              <Text style={[styles.rewardTitle, { color: t.textPrimary }]}>
                {reward.claimed ? copy.claimed : copy.reportReply}
              </Text>
            </Reanimated.View>
            {reward.claimed && !reduceMotion ? (
              <Reanimated.View entering={ZoomIn.delay(120).duration(460)} style={styles.celebrationRow}>
                {['sparkles', 'star', 'sparkles', 'star', 'sparkles'].map((icon, index) => (
                  <Ionicons key={`${icon}-${index}`} name={icon as keyof typeof Ionicons.glyphMap} size={index === 2 ? 22 : 15} color={index % 2 ? EXEMPT_COLOR_3 : EXEMPT_COLOR_4} />
                ))}
              </Reanimated.View>
            ) : null}
            <View style={styles.rewardList}>
              {/* зачем (PM-047, владелец): строка "+N спин" убрана — спин
                  больше не начисляется (grantLocalReportRewardSpins no-op),
                  обещание в UI отменено вместе с механикой. */}
              {/* зачем: Q4 (координатор 01.10) — награда показывается в монетах
                  (v2 coins; у старых v1 руны — тот же кошелёк монет). */}
              {reportRewardCoins(reward.rewardBundle) > 0 ? (
                <Reanimated.View entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(260)} style={styles.rewardLine}>
                  <Ionicons name="star-outline" size={21} color={EXEMPT_COLOR_5} />
                  <Text style={[styles.rewardLineText, { color: t.textPrimary }]}>{`+${reportRewardCoins(reward.rewardBundle)} ${triLang(lang as Lang, { ru: 'монет', uk: 'монет', en: 'coins', es: 'monedas', 'pt-BR': 'moedas', vi: 'xu', id: 'koin', tr: 'jeton', pl: 'monet' })}`}</Text>
                </Reanimated.View>
              ) : null}
              {/* зачем (Ядро 01.10, D70/D104): жемчуг за жалобу не начисляется — строку «+N» убрали, награда только монетами. */}
            </View>
            {claimErrorMessageId === reward.messageId ? (
              <Text accessibilityRole="alert" style={[styles.rewardError, { color: t.wrong }]}>{copy.claimError}</Text>
            ) : null}
            {!reward.claimed ? (
              <TouchableOpacity
                testID="notification-report-reply-claim-cta"
                activeOpacity={0.86}
                accessibilityRole="button"
                accessibilityLabel={copy.claim}
                accessibilityState={{ busy: claimingMessageId === reward.messageId, disabled: claimingMessageId === reward.messageId }}
                disabled={claimingMessageId === reward.messageId}
                onPress={() => { void claimReportReward(row); }}
                style={styles.rewardButton}
              >
                <Ionicons name="gift-outline" size={17} color={EXEMPT_COLOR_6} />
                <Text style={styles.rewardButtonText}>{copy.claim}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    );
  };

  const renderNotificationRow = ({ item: row }: { item: UserNotification }) => {
    const label = notificationLabel(row.type, lang as Lang);
    const rowTitle = row.type === 'report_reply'
      ? (row.reportReply?.title || row.text || copy.reportReply)
      : `${row.fromName || '·'}${label ? ` ${label}` : ''}`;
    const rowPreview = row.type === 'report_reply'
      ? (row.reportReply?.body || row.text || '')
      : row.text;
    const hasUnclaimedReportReward = row.type === 'report_reply'
      && !!row.reportReply
      && !row.reportReply.claimed
      // зачем (PM-047): spins больше не считается наградой в UI (см. claimReportReward выше).
      && reportRewardHasVisibleReward(row.reportReply.rewardBundle);
    const hasAvatar = !!row.fromAvatar;
    return (
      <TouchableOpacity
        testID={`notification-row-${row.id}`}
        activeOpacity={0.82}
        onPress={() => openNotification(row)}
        style={[styles.notificationRow, { backgroundColor: t.bgSurface }]}
      >
        {hasAvatar ? (
          <AvatarView avatar={row.fromAvatar!} size={38} animateAura={false} />
        ) : (
          <View style={[styles.notificationIcon, { backgroundColor: t.bgCard }]}>
            <Ionicons name={notificationIcon(row.type)} size={18} color={notificationIconColor(row.type, t.textMuted)} />
          </View>
        )}
        <View style={styles.notificationCopy}>
          <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800', lineHeight: Math.round(f.caption * 1.3) }}>
            {rowTitle}
          </Text>
          {rowPreview ? (
            <Text style={{ color: t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '700', marginTop: 2 }}>
              {rowPreview}
            </Text>
          ) : null}
        </View>
        <View style={styles.notificationMeta}>
          <Text style={{ color: t.textGhost, fontSize: Math.max(9, f.caption - 2), fontWeight: '800' }}>
            {timeLabel(row.createdAt)}
          </Text>
          <Ionicons name={notificationIcon(row.type)} size={13} color={notificationIconColor(row.type, t.textGhost)} />
        </View>
        {!hasUnclaimedReportReward ? (
        <TouchableOpacity
          testID={`notification-delete-${row.id}`}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang as Lang, { ru: 'Удалить уведомление', uk: 'Видалити сповіщення', en: 'Delete notification', es: 'Eliminar notificación', 'pt-BR': 'Excluir notificação', vi: 'Xóa thông báo', id: 'Hapus notifikasi', tr: 'Bildirimi sil', pl: 'Usuń powiadomienie' })}
          activeOpacity={0.72}
          onPress={(event) => {
            event.stopPropagation?.();
            stageDelete(row);
          }}
          style={styles.notificationDelete}
        >
          <Ionicons name="trash-outline" size={18} color={t.textGhost} />
        </TouchableOpacity>
        ) : null}
        {!row.read && !markedReadIdsRef.current.has(row.id) ? (
          <View style={styles.notificationUnreadDot} />
        ) : null}
      </TouchableOpacity>
    );
  };

  const teamInboxSection = (
    <AppMessagesInbox
      key={identityRevision}
      mode="notification-center"
      centerVisible={visible}
      onUnreadCountChange={setTeamUnreadCount}
      onMessageCountChange={setTeamMessageCount}
      onDetailOpenChange={setTeamDetailOpen}
      notificationTargetRef={notificationTargetRef}
      ownerActive={isHomeTabActive}
    />
  );

  return (
    <>
      <View ref={notificationTargetRef} collapsable={false}>
      <PressableScale
        testID="home-notification-center-button"
        variant="icon"
        pressScaleTo={1.02}
        accessibilityRole="button"
        accessibilityLabel={combinedUnreadCount > 0 ? `${copy.title}: ${combinedUnreadCount}` : copy.title}
        onPress={open}
        style={styles.headerPressable}
        contentStyle={[styles.headerButton, { backgroundColor: colorWithAlpha(v2.glassRaised, 0.5), boxShadow: nestedBoxShadow(shadowGlass) }]} // зачем: приказ владельца 11.10 19:2x — фон кнопки Главной 50 % (альфа цвета, значок и бейдж 100 %)
      >
        {/* зачем (2.0, референс владельца 24.09): круглая кнопка на графите,
            непрочитанное — светлая точка, число уходит в подпись для скринридера. */}
        <Reanimated.View style={[styles.headerIconWrap, bellShakeStyle]}>
          <Ionicons name="notifications-outline" size={22} color={v2.textSecondary} />
        </Reanimated.View>
        {combinedUnreadCount > 0 ? (
          <View testID="home-notification-center-badge" style={[styles.badge, { backgroundColor: v2.text, borderColor: v2.control }]} />
        ) : null}
      </PressableScale>
      </View>

      {/* зачем (координатор 05.10, Сверка system-014/015): входящие — шторка снизу поверх раздела (system.html inbox),
          а не полноэкранное окно. Список, деталь ответа и «Вернуть» — внутри шторки; данные и прочтение не тронуты. */}
      <KitSheetModal
        visible={visible}
        onRequestClose={close}
        closeLabel={copy.close}
        testID="notification-center-motion-modal"
        header={(
          <View style={styles.header}>
            {selected ? (
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityRole="button"
                accessibilityLabel={copy.back}
                onPress={backToList}
                hitSlop={5}
              style={[styles.closeButton, { backgroundColor: t.bgSurface }]}
              >
                <BackGlyph size={22} color={t.textPrimary} />
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.headerTitle, { color: t.textPrimary }]}>
                {selected ? copy.reportReply : copy.title}
              </Text>
              {selected ? null : (
                <Text numberOfLines={1} style={[styles.headerSub, { color: t.textMuted }]}>
                  {combinedUnreadCount > 0 ? newCountLabel(lang as Lang, combinedUnreadCount) : copy.allRead}
                </Text>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityRole="button"
              accessibilityLabel={copy.close}
              onPress={close}
              hitSlop={5}
              style={[styles.closeButton, { backgroundColor: t.bgSurface }]}
            >
              <Ionicons name="close" size={18} color={t.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
      >
        <View testID="notification-center-screen" style={styles.sheetBody}>
          {selected ? renderReportReplyDetail(selected) : (
          <FlatList removeClippedSubviews={false} decelerationRate="fast"
            // зачем (FINAL_PHASE п.4): «Показать ещё» растит список страницами — первый кадр
            // рисует только видимое, дальнее не держим в памяти. Высоты строк разные, getItemLayout нет.
            initialNumToRender={10}
            maxToRenderPerBatch={8}
            windowSize={7}
            data={teamDetailOpen ? [] : visibleItems}
            keyExtractor={(row) => row.id}
            renderItem={renderNotificationRow}
            ListHeaderComponent={teamInboxSection}
            ListFooterComponent={!teamDetailOpen && hasOlder && visibleItems.length > 0 ? (
              <TouchableOpacity
                testID="notification-center-load-older"
                accessibilityRole="button"
                accessibilityState={{ busy: loadingOlder }}
                activeOpacity={0.76}
                onPress={loadOlder}
                disabled={loadingOlder}
                style={[styles.loadOlder, { backgroundColor: t.bgSurface, opacity: loadingOlder ? 0.6 : 1 }]}
              >
                <Text style={[styles.loadOlderText, { color: t.textPrimary }]}>{copy.showMore}</Text>
              </TouchableOpacity>
            ) : null}
            ListEmptyComponent={!teamDetailOpen && teamMessageCount === 0 ? (
              // `.center` пустого состояния: поля 50/20/20, плитка 55 (r14, #2A2A2C) со значком 24, заголовок 18/700 через 14,
              // пояснение --sec 15 → D145 16/22 через 6.
              <View style={{ alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20 }}>
                <View style={{ width: 55, height: 55, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}>
                  <Ionicons name="chatbubble-outline" size={24} color={t.textPrimary} />
                </View>
                <Text style={{ color: t.textPrimary, fontSize: 16, lineHeight: 24, fontWeight: '700', textAlign: 'center', marginTop: 14 }}>
                  {copy.empty}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 6 }}>
                  {copy.emptyHint}
                </Text>
              </View>
            ) : null}
            // зачем: в шторке список растёт по содержимому до её предела (пусто — шторка низкая, как в макете).
            style={styles.sheetList}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 8, gap: 8 }}
            showsVerticalScrollIndicator={false}
          />
          )}
          {pendingDeletion ? (
            <View style={[styles.notificationUndo, { bottom: 0, backgroundColor: t.bgSurface }]}>
              <Text style={[styles.notificationUndoText, { color: t.textPrimary }]}>{copy.deletedUndo}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={undoDelete} style={styles.notificationUndoButton}>
                <Text style={[styles.notificationUndoAction, { color: t.accentText }]}>{copy.undo}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </KitSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  loadOlder: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  loadOlderText: { fontSize: 16, fontWeight: '700' },
  headerPressable: {
    width: V2.iconButton,
    height: V2.iconButton,
  },
  headerButton: {
    width: V2.iconButton,
    height: V2.iconButton,
    borderRadius: V2.iconButton / 2,
    // зачем (владелец 12.10, стиль «Тень» + сверка снимков 6b3890202): без обводок — кнопку отделяют тон фона и малая внешняя тень.
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5, // shadow-ok: кольцо-отбивка точки «непрочитано» от кнопки — индикатор, не контейнер
  },
  badgeText: {
    color: HOME_NOTIFICATION_BADGE_TEXT_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },
  header: {
    minHeight: 46,
    paddingHorizontal: 4,
    paddingBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sheetBody: { flexShrink: 1, minHeight: 0 },
  sheetList: { flexGrow: 0, flexShrink: 1 },
  // `Сообщения` 22/700 и подзаголовок 14 --sec через 2 (system.html inbox).
  headerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  // `.rb.fill` 35 — круг с крестиком.
  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 0,
    paddingLeft: 12,
    paddingVertical: 10,
  },
  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCopy: {
    flex: 1,
    minWidth: 0,
  },
  notificationMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  notificationDelete: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationUnreadDot: {
    position: 'absolute',
    top: 8,
    right: 48,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: HOME_NOTIFICATION_BADGE_COLOR,
  },
  notificationUndo: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 52,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000', // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    ...noAndroidOutline, // зачем: без непрозрачного фона Android рисует квадрат вокруг скругления (сторож android_no_square_outline)
  },
  notificationUndoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  notificationUndoButton: {
    minWidth: 72,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationUndoAction: {
    fontSize: 13,
    fontWeight: '900',
  },
  detailContent: {
    // в шторке поля даёт .sheet (18); здесь — как у шапки.
    paddingHorizontal: 4,
    paddingBottom: 28,
  },
  detailMeta: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    marginBottom: 12,
  },
  detailBody: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  rewardCard: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 0,
    padding: 14,
    gap: 14,
  },
  rewardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  celebrationRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  rewardList: {
    gap: 9,
  },
  rewardLine: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(99,217,143,0.08)', // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
  },
  rewardLineText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  rewardError: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  rewardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99,217,143,0.14)', // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
  },
  rewardTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  rewardButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#63D98F', // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  rewardButtonText: {
    color: '#07110A', // theme-exempt: центр уведомлений: цвет типа события и зелёная награда — семантика/бренд (токены good/accent — у «Тем»)
    fontSize: 13,
    fontWeight: '900',
  },
});

export default memo(NotificationCenterButton);
