import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { moderateLeagueChatMessage } from '../app/league_chat_moderation';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import AvatarView from './AvatarView';
import { triLang } from '../constants/i18n';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getSocialChatIcon } from '../constants/socialIconAssets';
import type { ThemeMode } from '../constants/theme';
import {
  authorizeLeagueChatRoom,
  blockLeagueChatUser,
  cacheLeagueChatRoom,
  forgetCachedLeagueChatAuthorization,
  forgetCachedLeagueChatRoom,
  getCachedLeagueChatMessagesSync,
  getCachedLeagueChatRoomSync,
  getBlockedLeagueChatUsers,
  LeagueChatMessage,
  LeagueChatRoom,
  LeagueChatSystemType,
  isSystemLeagueChatMessage,
  loadCachedLeagueChatMessages,
  loadCachedLeagueChatRoom,
  reportLeagueChatMessage,
  resolveMyLeagueChatRoom,
  sendLeagueChatMessage,
  subscribeLeagueChatMessages,
} from '../app/firestore_league_chat';
import { emitAppEvent } from '../app/events';
import { leagueChatRoomKey, markLeagueChatRoomRead } from '../app/league_chat_unread';
import { hapticTap } from '../hooks/use-haptics';
import {
  createOptimisticLeagueChatMessage,
  getLeagueChatConnectionUi,
  getLeagueChatKeyboardAvoidingBehavior,
  isOptimisticLeagueChatMessage,
  mergeLeagueChatOptimisticMessages,
  type OptimisticLeagueChatMessage,
} from './leagueChatPanelBehavior';

const HIDE_UNDO_MS = 10_000;
const CHAT_RETRY_MS = 2_500;
const REPORT_REASONS = [
  { id: 'insult', ru: 'Оскорбления', uk: 'Образи', es: 'Insultos', 'pt-BR': 'Insultos', ptBR: 'Insultos', vi: 'Lăng mạ', idText: 'Hinaan', tr: 'Hakaret', pl: 'Obelgi' },
  { id: 'spam', ru: 'Спам', uk: 'Спам', es: 'Spam', 'pt-BR': 'Spam', ptBR: 'Spam', vi: 'Spam', idText: 'Spam', tr: 'Spam', pl: 'Spam' },
  { id: 'unsafe', ru: 'Опасный контент', uk: 'Небезпечний контент', es: 'Contenido peligroso', 'pt-BR': 'Conteúdo perigoso', ptBR: 'Conteúdo perigoso', vi: 'Nội dung nguy hiểm', idText: 'Konten berbahaya', tr: 'Tehlikeli içerik', pl: 'Niebezpieczne treści' },
]

function LeagueChatThemeIcon({
  themeMode,
  size,
}: {
  themeMode: ThemeMode;
  size: number;
}) {
  return (
    <Image
      source={getSocialChatIcon(themeMode)}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="League chat"
      accessibilityIgnoresInvertColors
    />
  );
}

function sameRoom(a: LeagueChatRoom | null | undefined, b: LeagueChatRoom | null | undefined): boolean {
  return !!a && !!b && a.groupId === b.groupId && a.weekId === b.weekId && a.leagueId === b.leagueId;
}

/** Иконка Ionicons для системного события лиги. */
function systemMessageIcon(type: LeagueChatSystemType | undefined): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'rank_up': return 'trending-up';
    case 'new_leader': return 'trophy';
    case 'member_joined': return 'person-add';
    case 'chest_unlocked': return 'gift';
    case 'week_ending': return 'time';
    default: return 'sparkles';
  }
}

function roomKey(room: LeagueChatRoom | null | undefined): string {
  return room ? `${room.weekId}:${room.leagueId}:${room.groupId}` : '';
}

function LeagueChatPanel({
  initialRoom,
  myUid,
  myAvatar,
  myAuraId,
  myTotalXP,
  onToast,
}: {
  initialRoom?: LeagueChatRoom | null;
  myUid?: string;
  myAvatar?: string | null;
  myAuraId?: string | null;
  myTotalXP?: number;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const initialRoomRef = useRef<LeagueChatRoom | null | undefined>(undefined);
  if (initialRoomRef.current === undefined) {
    initialRoomRef.current = initialRoom ?? getCachedLeagueChatRoomSync();
  }
  const [room, setRoom] = useState<LeagueChatRoom | null>(initialRoomRef.current ?? null);
  const [roomReady, setRoomReady] = useState(() => !!initialRoomRef.current);
  const [messages, setMessages] = useState<LeagueChatMessage[]>(() => {
    const seedRoom = initialRoomRef.current;
    return seedRoom ? getCachedLeagueChatMessagesSync(seedRoom) : [];
  });
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticLeagueChatMessage[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Record<string, boolean>>({});
  const [pendingHideUntilByUid, setPendingHideUntilByUid] = useState<Record<string, number>>({});
  const [hideTimerNow, setHideTimerNow] = useState(Date.now());
  const [draft, setDraft] = useState('');
  const [draftBlocked, setDraftBlocked] = useState(false);
  const [sending, setSending] = useState(false);
  const [subscriptionNonce, setSubscriptionNonce] = useState(0);
  const [roomRetryNonce, setRoomRetryNonce] = useState(0);
  const [authorizationRetryNonce, setAuthorizationRetryNonce] = useState(0);
  const [authorizedRoomKey, setAuthorizedRoomKey] = useState('');
  const [authorizingRoomKey, setAuthorizingRoomKey] = useState('');
  const [subscriptionError, setSubscriptionError] = useState(false);
  const [reportTarget, setReportTarget] = useState<LeagueChatMessage | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].id);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const hideTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const forbiddenRoomKeyRef = useRef('');
  const optimisticMessageSeqRef = useRef(0);

  const scrollToLatestMessage = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);
  const markVisibleMessagesRead = useCallback((targetRoom: LeagueChatRoom, rows: LeagueChatMessage[]) => {
    void markLeagueChatRoomRead(targetRoom, rows).then(() => {
      emitAppEvent('league_chat_unread_changed', {
        roomKey: leagueChatRoomKey(targetRoom),
        unreadCount: 0,
      });
    }).catch(() => {});
  }, []);

  const handleComposerFocus = useCallback(() => {
    setTimeout(scrollToLatestMessage, 80);
  }, [scrollToLatestMessage]);

  useEffect(() => {
    let cancelled = false;
    void getBlockedLeagueChatUsers().then((blocked) => {
      if (!cancelled) setBlockedUsers(blocked);
    });
    if (initialRoom && forbiddenRoomKeyRef.current !== roomKey(initialRoom)) {
      setRoom((cur) => (sameRoom(cur, initialRoom) ? cur : initialRoom));
      setRoomReady(true);
      void cacheLeagueChatRoom(initialRoom);
    }
    void (async () => {
      const cached = await loadCachedLeagueChatRoom();
      if (cancelled) return;
      if (cached && forbiddenRoomKeyRef.current !== roomKey(cached)) {
        setRoom((cur) => cur ?? cached);
        setRoomReady(true);
      }

      const resolved = await resolveMyLeagueChatRoom();
      if (cancelled) return;
      if (resolved) {
        if (forbiddenRoomKeyRef.current === roomKey(resolved)) forbiddenRoomKeyRef.current = '';
        setRoom((cur) => (sameRoom(cur, resolved) ? cur : resolved));
      }
      setRoomReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialRoom, roomRetryNonce]);

  useEffect(() => {
    if (room || !roomReady) return;
    const id = setTimeout(() => setRoomRetryNonce((cur) => cur + 1), CHAT_RETRY_MS);
    return () => clearTimeout(id);
  }, [room, roomReady, roomRetryNonce]);

  useEffect(() => {
    if (!room || !subscriptionError) return;
    const id = setTimeout(() => setAuthorizationRetryNonce((cur) => cur + 1), CHAT_RETRY_MS);
    return () => clearTimeout(id);
  }, [room, subscriptionError]);

  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const key = roomKey(room);
    setAuthorizingRoomKey(key);
    setSubscriptionError(false);
    setAuthorizedRoomKey((cur) => (cur === key ? '' : cur));
    void authorizeLeagueChatRoom(room).then((status) => {
      if (cancelled) return;
      setAuthorizingRoomKey((cur) => (cur === key ? '' : cur));
      if (status === 'authorized') {
        if (forbiddenRoomKeyRef.current === key) forbiddenRoomKeyRef.current = '';
        setAuthorizedRoomKey(key);
        setSubscriptionNonce((cur) => cur + 1);
      } else if (status === 'forbidden') {
        forbiddenRoomKeyRef.current = key;
        void forgetCachedLeagueChatRoom(room);
        setAuthorizedRoomKey((cur) => (cur === key ? '' : cur));
        setRoom((cur) => (sameRoom(cur, room) ? null : cur));
        setRoomReady(true);
      } else {
        retryTimer = setTimeout(() => setAuthorizationRetryNonce((cur) => cur + 1), CHAT_RETRY_MS);
      }
    });
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [room, authorizationRetryNonce]);

  const currentRoomKey = roomKey(room);
  const roomAuthorized = !!room && currentRoomKey === authorizedRoomKey;
  const roomAuthorizing = !!room && currentRoomKey === authorizingRoomKey;
  const connectionUi = getLeagueChatConnectionUi({
    hasRoom: !!room,
    roomAuthorized,
    roomAuthorizing,
    subscriptionError,
    sending,
    draft,
    draftBlocked,
  });
  const composerBottomPadding = Math.max(14, insets.bottom + 10);

  useEffect(() => {
    if (!room) {
      setMessages([]);
      setOptimisticMessages([]);
      return;
    }
    let cancelled = false;
    const memoryMessages = getCachedLeagueChatMessagesSync(room);
    setMessages(memoryMessages);
    setOptimisticMessages((cur) => mergeLeagueChatOptimisticMessages(memoryMessages, cur).filter(isOptimisticLeagueChatMessage));
    void loadCachedLeagueChatMessages(room).then((cached) => {
      if (cancelled) return;
      setMessages(cached);
      setOptimisticMessages((cur) => mergeLeagueChatOptimisticMessages(cached, cur).filter(isOptimisticLeagueChatMessage));
      markVisibleMessagesRead(room, cached);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    });
    return () => {
      cancelled = true;
    };
  }, [room, markVisibleMessagesRead]);

  useEffect(() => {
    if (!room || !connectionUi.shouldSubscribe) return;
    let cancelled = false;
    const key = currentRoomKey;
    setSubscriptionError(false);
    const unsub = subscribeLeagueChatMessages(
      room,
      (rows) => {
        if (cancelled) return;
        setSubscriptionError(false);
        setMessages(rows);
        setOptimisticMessages((cur) => mergeLeagueChatOptimisticMessages(rows, cur).filter(isOptimisticLeagueChatMessage));
        markVisibleMessagesRead(room, rows);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      },
      () => {
        if (cancelled) return;
        void forgetCachedLeagueChatAuthorization(room);
        setSubscriptionError(true);
        setAuthorizedRoomKey((cur) => (cur === key ? '' : cur));
      },
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [room, currentRoomKey, connectionUi.shouldSubscribe, subscriptionNonce, markVisibleMessagesRead]);

  const visibleMessages = useMemo(
    () => mergeLeagueChatOptimisticMessages(messages, optimisticMessages)
      .filter((m) => isOptimisticLeagueChatMessage(m) || m.authorUid === myUid || !blockedUsers[m.authorUid]),
    [messages, optimisticMessages, blockedUsers, myUid],
  );

  useEffect(() => {
    const hasPending = Object.keys(pendingHideUntilByUid).length > 0;
    if (!hasPending) return;
    const id = setInterval(() => setHideTimerNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pendingHideUntilByUid]);

  useEffect(() => () => {
    Object.values(hideTimersRef.current).forEach(clearTimeout);
    hideTimersRef.current = {};
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    onToast?.(message, type);
  }, [onToast]);

  const handleDraftChange = useCallback((text: string) => {
    setDraft(text);
    if (!text.trim()) {
      setDraftBlocked(false);
      return;
    }
    const result = moderateLeagueChatMessage(text);
    setDraftBlocked(result.status === 'blocked');
  }, []);

  const submit = useCallback(async () => {
    if (!room || sending) return;
    const text = draft.trim();
    if (!text) return;
    if (draftBlocked) {
      showToast(triLang(lang, {
  ru: 'Сообщение содержит запрещённые слова и не было отправлено.',
  uk: 'Повідомлення містить заборонені слова і не було надіслано.',
  es: 'El mensaje contiene palabras prohibidas y no fue enviado.',
  "pt-BR": 'A mensagem contém palavras proibidas e não foi enviada.',
  vi: 'Tin nhắn chứa từ bị cấm và chưa được gửi.',
  id: 'Pesan berisi kata terlarang dan tidak dikirim.',
  tr: 'Mesaj yasaklı kelimeler içeriyor ve gönderilmedi.',
  pl: 'Wiadomość zawiera zakazane słowa i nie została wysłana.',
}), 'error');
      return;
    }
    const optimisticMessage = createOptimisticLeagueChatMessage(room, {
      clientId: `${Date.now()}-${optimisticMessageSeqRef.current += 1}`,
      authorUid: myUid || 'local-league-chat-user',
      authorAvatar: myAvatar,
      authorAura: myAuraId,
      text,
      now: Date.now(),
    });
    setOptimisticMessages((cur) => [...cur, optimisticMessage]);
    scrollToLatestMessage();
    setSending(true);
    setDraft('');
    setDraftBlocked(false);
    try {
      const result = await sendLeagueChatMessage(room, text);
      if (result === 'sent') {
        return;
      } else if (result === 'review') {
        setOptimisticMessages((cur) => cur.map((message) => (
          message.id === optimisticMessage.id ? { ...message, localStatus: 'review' } : message
        )));
        return;
      } else if (result === 'throttled') {
        setOptimisticMessages((cur) => cur.filter((message) => message.id !== optimisticMessage.id));
        setDraft(text);
        showToast(triLang(lang, {
  ru: 'Слишком часто. Подожди немного.',
  uk: 'Занадто часто. Трохи зачекай.',
  es: 'Demasiado rápido. Espera un poco.',
  "pt-BR": 'Rápido demais. Espere um pouco.',
  vi: 'Quá nhanh. Đợi một chút nhé.',
  id: 'Terlalu sering. Tunggu sebentar.',
  tr: 'Çok sık. Biraz bekle.',
  pl: 'Za często. Poczekaj chwilę.',
}), 'error');
      } else if (result === 'offline') {
        setOptimisticMessages((cur) => cur.map((message) => (
          message.id === optimisticMessage.id ? { ...message, localStatus: 'failed' } : message
        )));
        setDraft(text);
        showToast(triLang(lang, {
  ru: 'Нет соединения. Сообщение не отправлено.',
  uk: 'Немає зʼєднання. Повідомлення не надіслано.',
  es: 'Sin conexión. El mensaje no se envió.',
  "pt-BR": 'Sem conexão. A mensagem não foi enviada.',
  vi: 'Không có kết nối. Tin nhắn chưa được gửi.',
  id: 'Tidak ada koneksi. Pesan tidak dikirim.',
  tr: 'Bağlantı yok. Mesaj gönderilmedi.',
  pl: 'Brak połączenia. Wiadomość nie została wysłana.',
}), 'error');
      } else {
        setOptimisticMessages((cur) => cur.filter((message) => message.id !== optimisticMessage.id));
        setDraft(text);
        setDraftBlocked(true);
        showToast(triLang(lang, {
  ru: 'Сообщение содержит запрещённые слова и не было отправлено.',
  uk: 'Повідомлення містить заборонені слова і не було надіслано.',
  es: 'El mensaje contiene palabras prohibidas y no fue enviado.',
  "pt-BR": 'A mensagem contém palavras proibidas e não foi enviada.',
  vi: 'Tin nhắn chứa từ bị cấm và chưa được gửi.',
  id: 'Pesan berisi kata terlarang dan tidak dikirim.',
  tr: 'Mesaj yasaklı kelimeler içeriyor ve gönderilmedi.',
  pl: 'Wiadomość zawiera zakazane słowa i nie została wysłana.',
}), 'error');
      }
    } finally {
      setSending(false);
    }
  }, [draft, draftBlocked, lang, myAuraId, myAvatar, myUid, room, scrollToLatestMessage, sending, showToast]);

  const openReportModal = useCallback((message: LeagueChatMessage) => {
    hapticTap();
    setReportTarget(message);
    setReportReason(REPORT_REASONS[0].id);
    setReportDetails('');
  }, []);

  const closeReportModal = useCallback(() => {
    if (reportSubmitting) return;
    Keyboard.dismiss();
    setReportTarget(null);
    setReportReason(REPORT_REASONS[0].id);
    setReportDetails('');
  }, [reportSubmitting]);

  const submitReport = useCallback(async () => {
    if (!reportTarget || reportSubmitting) return;
    const details = reportDetails.trim();
    if (!details) {
      showToast(triLang(lang, {
  ru: 'Опиши причину жалобы',
  uk: 'Опиши причину скарги',
  es: 'Describe el motivo del reporte',
  "pt-BR": 'Descreva o motivo da denúncia',
  vi: 'Mô tả lý do báo cáo',
  id: 'Jelaskan alasan laporan',
  tr: 'Şikayet nedenini açıkla',
  pl: 'Opisz powód zgłoszenia',
}), 'error');
      return;
    }
    const reason = REPORT_REASONS.find((item) => item.id === reportReason)?.id ?? 'other';
    Keyboard.dismiss();
    setReportSubmitting(true);
    try {
      await reportLeagueChatMessage(reportTarget, `${reason}: ${details}`);
      setReportTarget(null);
      setReportReason(REPORT_REASONS[0].id);
      setReportDetails('');
      showToast(triLang(lang, {
  ru: 'Жалоба отправлена',
  uk: 'Скаргу надіслано',
  es: 'Reporte enviado',
  "pt-BR": 'Denúncia enviada',
  vi: 'Đã gửi báo cáo',
  id: 'Laporan terkirim',
  tr: 'Şikayet gönderildi',
  pl: 'Zgłoszenie wysłane',
}), 'success');
    } catch {
      showToast(triLang(lang, {
  ru: 'Жалоба не отправилась',
  uk: 'Не вдалося надіслати скаргу',
  es: 'No se pudo enviar el reporte',
  "pt-BR": 'Não foi possível enviar a denúncia',
  vi: 'Không gửi được báo cáo',
  id: 'Laporan gagal dikirim',
  tr: 'Şikayet gönderilemedi',
  pl: 'Nie udało się wysłać zgłoszenia',
}), 'error');
    } finally {
      setReportSubmitting(false);
    }
  }, [lang, reportDetails, reportReason, reportSubmitting, reportTarget, showToast]);

  const cancelPendingHide = useCallback((uid: string) => {
    hapticTap();
    const timer = hideTimersRef.current[uid];
    if (timer) clearTimeout(timer);
    delete hideTimersRef.current[uid];
    setPendingHideUntilByUid((cur) => {
      const next = { ...cur };
      delete next[uid];
      return next;
    });
    showToast(triLang(lang, {
  ru: 'Скрытие отменено',
  uk: 'Приховування скасовано',
  es: 'Ocultación cancelada',
  "pt-BR": 'Ocultação cancelada',
  vi: 'Đã hủy ẩn',
  id: 'Menyembunyikan dibatalkan',
  tr: 'Gizleme iptal edildi',
  pl: 'Ukrywanie anulowane',
}), 'info');
  }, [lang, showToast]);

  const blockUser = useCallback((message: LeagueChatMessage) => {
    hapticTap();
    if (message.authorUid === myUid) {
      showToast(triLang(lang, {
  ru: 'Свои сообщения скрывать нельзя',
  uk: 'Свої повідомлення приховувати не можна',
  es: 'No puedes ocultar tus propios mensajes',
  "pt-BR": 'Você não pode ocultar suas próprias mensagens',
  vi: 'Bạn không thể ẩn tin nhắn của chính mình',
  id: 'Kamu tidak bisa menyembunyikan pesanmu sendiri',
  tr: 'Kendi mesajlarını gizleyemezsin',
  pl: 'Nie możesz ukrywać własnych wiadomości',
}), 'info');
      return;
    }

    const uid = message.authorUid;
    if (pendingHideUntilByUid[uid]) {
      cancelPendingHide(uid);
      return;
    }

    const hideAt = Date.now() + HIDE_UNDO_MS;
    setHideTimerNow(Date.now());
    setPendingHideUntilByUid((cur) => ({ ...cur, [uid]: hideAt }));
    hideTimersRef.current[uid] = setTimeout(() => {
      delete hideTimersRef.current[uid];
      void blockLeagueChatUser(uid).then(() => {
        setBlockedUsers((cur) => ({ ...cur, [uid]: true }));
        setPendingHideUntilByUid((cur) => {
          const next = { ...cur };
          delete next[uid];
          return next;
        });
        showToast(triLang(lang, {
  ru: 'Пользователь скрыт в чате',
  uk: 'Користувача приховано в чаті',
  es: 'Usuario oculto en el chat',
  "pt-BR": 'Usuário ocultado no chat',
  vi: 'Đã ẩn người dùng trong chat',
  id: 'Pengguna disembunyikan di chat',
  tr: 'Kullanıcı sohbette gizlendi',
  pl: 'Użytkownik ukryty na czacie',
}), 'success');
      }).catch(() => {
        setPendingHideUntilByUid((cur) => {
          const next = { ...cur };
          delete next[uid];
          return next;
        });
        showToast(triLang(lang, {
  ru: 'Участник не скрылся',
  uk: 'Не вдалося приховати учасника',
  es: 'No se pudo ocultar al participante',
  "pt-BR": 'Não foi possível ocultar o participante',
  vi: 'Không ẩn được người tham gia',
  id: 'Peserta gagal disembunyikan',
  tr: 'Katılımcı gizlenemedi',
  pl: 'Nie udało się ukryć uczestnika',
}), 'error');
      });
    }, HIDE_UNDO_MS);
  }, [cancelPendingHide, lang, myUid, pendingHideUntilByUid, showToast]);

  if (connectionUi.showBlockingConnectionState) {
    return (
      <View testID="league-chat-resolving" style={{ flex: 1, padding: 18, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <LeagueChatThemeIcon themeMode={themeMode} size={58} />
        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', textAlign: 'center' }}>
          {triLang(lang, {
  ru: 'Подключаем чат лиги',
  uk: 'Підключаємо чат ліги',
  es: 'Conectando el chat de liga',
  "pt-BR": 'Conectando o chat da liga',
  vi: 'Đang kết nối chat giải đấu',
  id: 'Menghubungkan chat liga',
  tr: 'Lig sohbetine bağlanılıyor',
  pl: 'Łączenie z czatem ligi',
})}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.35), textAlign: 'center' }}>
          {triLang(lang, {
  ru: 'Пару секунд, проверяем комнату этой недели.',
  uk: 'Кілька секунд, перевіряємо кімнату цього тижня.',
  es: 'Abre la liga tras sincronizar para recibir la sala semanal.',
  "pt-BR": 'Só um instante, verificando a sala desta semana.',
  vi: 'Chờ vài giây, đang kiểm tra phòng tuần này.',
  id: 'Sebentar, kami memeriksa ruang minggu ini.',
  tr: 'Birkaç saniye, bu haftanın odasını kontrol ediyoruz.',
  pl: 'Chwilę, sprawdzamy pokój z tego tygodnia.',
})}
        </Text>
      </View>
    );
  }

  return (
    <>
    <Modal
      visible={!!reportTarget}
      transparent
      animationType="fade"
      onRequestClose={closeReportModal}
    >
      <KeyboardAvoidingView
        behavior={getLeagueChatKeyboardAvoidingBehavior(Platform.OS)}
        keyboardVerticalOffset={0}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', padding: 18 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
        <View style={{ borderRadius: 18, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgCard, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="flag-outline" size={20} color={t.accent} />
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>
              {triLang(lang, {
  ru: 'Отправить жалобу?',
  uk: 'Надіслати скаргу?',
  es: 'Enviar reporte?',
  "pt-BR": 'Enviar denúncia?',
  vi: 'Gửi báo cáo?',
  id: 'Kirim laporan?',
  tr: 'Şikayet gönderilsin mi?',
  pl: 'Wysłać zgłoszenie?',
})}
            </Text>
          </View>
          <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.35) }}>
            {triLang(lang, {
  ru: 'Выбери причину и коротко опиши проблему. Без текста жалоба не отправится.',
  uk: 'Обери причину й коротко опиши проблему. Без тексту скарга не надішлеться.',
  es: 'Elige un motivo y describe el problema. El texto es obligatorio.',
  "pt-BR": 'Escolha um motivo e descreva o problema. Sem texto, a denúncia não será enviada.',
  vi: 'Chọn lý do và mô tả ngắn vấn đề. Không có nội dung thì báo cáo sẽ không được gửi.',
  id: 'Pilih alasan dan jelaskan masalahnya. Tanpa teks, laporan tidak akan dikirim.',
  tr: 'Bir neden seç ve sorunu kısaca açıkla. Metin olmadan şikayet gönderilmez.',
  pl: 'Wybierz powód i krótko opisz problem. Bez tekstu zgłoszenie nie zostanie wysłane.',
})}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REPORT_REASONS.map((reason) => {
              const active = reportReason === reason.id;
              return (
                <TouchableOpacity
                  key={reason.id}
                  testID={`league-chat-report-reason-${reason.id}`}
                  onPress={() => setReportReason(reason.id)}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? t.accent : t.border,
                    backgroundColor: active ? t.accent : 'transparent',
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ color: active ? t.correctText : t.textMuted, fontSize: Math.max(10, f.caption - 1), fontWeight: '800' }}>
                    {triLang(lang, {
  ru: reason.ru,
  uk: reason.uk,
  es: reason.es,
  "pt-BR": reason.ptBR,
  vi: reason.vi,
  id: reason.idText,
  tr: reason.tr,
  pl: reason.pl,
})}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            testID="league-chat-report-details"
            value={reportDetails}
            onChangeText={setReportDetails}
            placeholder={triLang(lang, {
  ru: 'Что именно не так?',
  uk: 'Що саме не так?',
  es: '¿Qué ocurre?',
  "pt-BR": 'O que exatamente está errado?',
  vi: 'Cụ thể có vấn đề gì?',
  id: 'Apa tepatnya yang bermasalah?',
  tr: 'Tam olarak sorun ne?',
  pl: 'Co dokładnie jest nie tak?',
})}
            placeholderTextColor={t.textGhost}
            multiline
            maxLength={420}
            style={{
              minHeight: 96,
              maxHeight: 150,
              borderRadius: 12,
              borderWidth: 0.5,
              borderColor: reportDetails.trim() ? t.border : '#E05252',
              color: t.textPrimary,
              backgroundColor: t.bgSurface,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: f.sub,
              textAlignVertical: 'top',
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <TouchableOpacity
              testID="league-chat-report-cancel"
              disabled={reportSubmitting}
              onPress={closeReportModal}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 0.5, borderColor: t.border }}
            >
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '900' }}>
                {triLang(lang, {
  ru: 'Отмена',
  uk: 'Скасувати',
  es: 'Cancelar',
  "pt-BR": 'Cancelar',
  vi: 'Hủy',
  id: 'Batal',
  tr: 'İptal',
  pl: 'Anuluj',
})}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="league-chat-report-submit"
              disabled={reportSubmitting || !reportDetails.trim()}
              onPress={submitReport}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: t.accent, opacity: reportSubmitting || !reportDetails.trim() ? 0.5 : 1 }}
            >
              <Text style={{ color: t.correctText, fontSize: f.caption, fontWeight: '900' }}>
                {triLang(lang, {
  ru: 'Отправить',
  uk: 'Надіслати',
  es: 'Enviar',
  "pt-BR": 'Enviar',
  vi: 'Gửi',
  id: 'Kirim',
  tr: 'Gönder',
  pl: 'Wyślij',
})}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
    <View style={{ flex: 1 }}>
      <View
        testID="league-chat-panel"
        style={{
          flex: 1,
        }}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: visibleMessages.length === 0 ? 'center' : 'flex-start',
            paddingHorizontal: 14,
            paddingTop: 8,
            paddingBottom: 16,
            gap: 10,
          }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {visibleMessages.length === 0 ? (
            <View testID="league-chat-empty" style={{ alignItems: 'center', paddingHorizontal: 24, gap: 8 }}>
              <LeagueChatThemeIcon themeMode={themeMode} size={58} />
              <Text style={{ color: t.textGhost, fontSize: f.sub, textAlign: 'center', lineHeight: Math.round(f.sub * 1.35) }}>
                {triLang(lang, {
  ru: 'Пока тихо. Можно первым пожелать удачи.',
  uk: 'Поки тихо. Можна першим побажати успіху.',
  es: 'Aún está tranquilo. Puedes desear suerte primero.',
  "pt-BR": 'Ainda está quieto. Você pode ser o primeiro a desejar boa sorte.',
  vi: 'Hiện vẫn khá yên. Bạn có thể là người đầu tiên chúc may mắn.',
  id: 'Masih sepi. Kamu bisa jadi yang pertama mengucapkan semoga berhasil.',
  tr: 'Şimdilik sessiz. İlk başarı dileğini sen yazabilirsin.',
  pl: 'Na razie cisza. Możesz jako pierwszy życzyć powodzenia.',
})}
              </Text>
            </View>
          ) : visibleMessages.map((m) => {
            // ── Системное сообщение лиги: по центру, мельче, с иконкой,
            //    без аватара и без действий (репорт/скрыть). Явно «не от людей».
            if (isSystemLeagueChatMessage(m)) {
              // Оптимистичные сообщения никогда не системные → безопасно читаем systemType.
              const systemType = (m as LeagueChatMessage).systemType;
              return (
                <View
                  key={m.id}
                  testID={`league-chat-system-${m.id}`}
                  style={{ alignItems: 'center', paddingHorizontal: 2, marginVertical: 2 }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      maxWidth: '88%',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: t.bgSurface,
                      borderWidth: 0.5,
                      borderColor: t.border,
                      opacity: 0.92,
                    }}
                  >
                    <Ionicons name={systemMessageIcon(systemType)} size={13} color={t.textMuted} />
                    <Text
                      testID={`league-chat-system-text-${m.id}`}
                      style={{
                        color: t.textMuted,
                        fontSize: Math.max(11, f.caption - 1),
                        fontWeight: '700',
                        textAlign: 'center',
                        lineHeight: Math.round((f.caption - 1) * 1.4),
                        flexShrink: 1,
                      }}
                    >
                      {m.text}
                    </Text>
                  </View>
                </View>
              );
            }

            const localMessage = isOptimisticLeagueChatMessage(m);
            const isMine = localMessage || (!!myUid && m.authorUid === myUid);
            const pendingHideUntil = pendingHideUntilByUid[m.authorUid] ?? 0;
            const hideCountdown = Math.max(0, Math.ceil((pendingHideUntil - hideTimerNow) / 1000));
            const avatar = isMine
              ? (myAvatar || m.authorAvatar || String(getBestAvatarForLevel(1)))
              : (m.authorAvatar || String(getBestAvatarForLevel(1)));
            const avatarSize = 36;
            const avatarGap = 8;
            const sideOffset = avatarSize + avatarGap + 4;
            const avatarNode = isMine ? (
              <AvatarView
                avatar={avatar}
                totalXP={myTotalXP}
                size={avatarSize}
                auraId={myAuraId ?? m.authorAura}
              />
            ) : (
              <AvatarView avatar={avatar} size={avatarSize} auraId={m.authorAura} />
            );
            return (
              <View
                key={m.id}
                testID={`league-chat-message-${m.id}`}
                style={{
                  alignItems: isMine ? 'flex-end' : 'flex-start',
                  paddingHorizontal: 2,
                }}
              >
                {!isMine && m.authorName ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: t.textMuted,
                      fontSize: Math.max(10, f.caption - 1),
                      fontWeight: '800',
                      marginLeft: sideOffset + 6,
                      marginBottom: 3,
                      maxWidth: '74%',
                    }}
                  >
                    {m.authorName}
                  </Text>
                ) : null}

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-end',
                    gap: avatarGap,
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  {!isMine && avatarNode}
                  <View
                    style={{
                      maxWidth: '78%',
                      borderRadius: 18,
                      borderBottomLeftRadius: isMine ? 18 : 6,
                      borderBottomRightRadius: isMine ? 6 : 18,
                      backgroundColor: isMine ? t.accent : t.bgSurface,
                      borderWidth: isMine ? 0 : 0.5,
                      borderColor: t.border,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text testID={`league-chat-message-text-${m.id}`} style={{ color: isMine ? t.correctText : t.textPrimary, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.38) }}>
                      {m.text}
                    </Text>
                    <Text style={{ color: isMine ? t.correctText : t.textGhost, opacity: isMine ? 0.68 : 1, fontSize: Math.max(9, f.caption - 2), alignSelf: 'flex-end', marginTop: 3, fontWeight: '700' }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {isMine && avatarNode}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    opacity: 0.72,
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    marginTop: 3,
                    marginRight: isMine ? sideOffset : 0,
                    marginLeft: isMine ? 0 : sideOffset,
                    paddingHorizontal: 4,
                  }}
                >
                  {!isMine && (
                    <>
                      <TouchableOpacity
                        testID={`league-chat-report-${m.id}`}
                        accessibilityLabel={`qa-league-chat-report-${m.id}`}
                        onPress={() => openReportModal(m)}
                        style={{ padding: 3 }}
                      >
                        <Ionicons name="flag-outline" size={14} color={t.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID={`league-chat-hide-${m.id}`}
                        onPress={() => blockUser(m)}
                        accessibilityRole="button"
                        accessibilityLabel={pendingHideUntil
                          ? triLang(lang, {
  ru: 'Отменить скрытие',
  uk: 'Скасувати приховування',
  es: 'Cancelar ocultación',
  "pt-BR": 'Cancelar ocultação',
  vi: 'Hủy ẩn',
  id: 'Batalkan sembunyikan',
  tr: 'Gizlemeyi iptal et',
  pl: 'Anuluj ukrycie',
})
                          : triLang(lang, {
  ru: 'Скрыть участника',
  uk: 'Приховати учасника',
  es: 'Ocultar participante',
  "pt-BR": 'Ocultar participante',
  vi: 'Ẩn người tham gia',
  id: 'Sembunyikan peserta',
  tr: 'Katılımcıyı gizle',
  pl: 'Ukryj uczestnika',
})}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: pendingHideUntil ? 1.5 : 0,
                          borderColor: pendingHideUntil ? t.accent : 'transparent',
                        }}
                      >
                        {pendingHideUntil ? (
                          <Text style={{ color: t.accent, fontSize: Math.max(9, f.caption - 2), fontWeight: '900' }}>
                            {hideCountdown}
                          </Text>
                        ) : (
                          <Ionicons name="eye-off-outline" size={14} color={t.textMuted} />
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View
          testID="league-chat-composer"
          style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: composerBottomPadding, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: 'rgba(0,0,0,0.10)' }}
        >
          {draftBlocked && (
            <Text style={{ color: '#E05252', fontSize: Math.max(10, f.caption - 1), marginBottom: 5, paddingHorizontal: 4 }}>
              {triLang(lang, {
  ru: 'Сообщение содержит запрещённые слова',
  uk: 'Повідомлення містить заборонені слова',
  es: 'El mensaje contiene palabras prohibidas',
  "pt-BR": 'A mensagem contém palavras proibidas',
  vi: 'Tin nhắn chứa từ bị cấm',
  id: 'Pesan berisi kata terlarang',
  tr: 'Mesaj yasaklı kelimeler içeriyor',
  pl: 'Wiadomość zawiera zakazane słowa',
})}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <TextInput
              testID="league-chat-input"
              value={draft}
              onChangeText={handleDraftChange}
              editable={connectionUi.canEditDraft}
              onFocus={handleComposerFocus}
              placeholder={triLang(lang, {
  ru: 'Сообщение...',
  uk: 'Повідомлення...',
  es: 'Mensaje...',
  "pt-BR": 'Mensagem...',
  vi: 'Tin nhắn...',
  id: 'Pesan...',
  tr: 'Mesaj...',
  pl: 'Wiadomość...',
})}
              placeholderTextColor={t.textGhost}
              multiline
              scrollEnabled
              maxLength={420}
              style={{
                flex: 1,
                minHeight: 44,
                maxHeight: 120,
                borderRadius: 20,
                borderWidth: 0.5,
                borderColor: draftBlocked ? '#E05252' : t.border,
                color: t.textPrimary,
                backgroundColor: t.bgSurface,
                opacity: connectionUi.canEditDraft ? 1 : 0.62,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: f.sub,
                lineHeight: Math.round(f.sub * 1.35),
                textAlignVertical: 'top',
              }}
            />
            <TouchableOpacity
              testID="league-chat-send"
              disabled={!connectionUi.canSendDraft}
              onPress={submit}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: connectionUi.canSendDraft ? t.accent : t.bgSurface,
                borderWidth: connectionUi.canSendDraft ? 0 : 0.5,
                borderColor: t.border,
                opacity: sending || !connectionUi.canEditDraft ? 0.65 : 1,
              }}
            >
              <Ionicons name="send" size={18} color={connectionUi.canSendDraft ? t.correctText : t.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
    </>
  );
}

export default memo(LeagueChatPanel);
