import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { moderateLeagueChatMessage } from '../app/league_chat_moderation';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import AvatarView from './AvatarView';
import { triLang } from '../constants/i18n';
import { getBestAvatarForLevel } from '../constants/avatars';
import {
  authorizeLeagueChatRoom,
  blockLeagueChatUser,
  cacheLeagueChatRoom,
  forgetCachedLeagueChatRoom,
  getCachedLeagueChatMessagesSync,
  getCachedLeagueChatRoomSync,
  getBlockedLeagueChatUsers,
  LeagueChatMessage,
  LeagueChatRoom,
  loadCachedLeagueChatMessages,
  loadCachedLeagueChatRoom,
  reportLeagueChatMessage,
  resolveMyLeagueChatRoom,
  sendLeagueChatMessage,
  subscribeLeagueChatMessages,
} from '../app/firestore_league_chat';
import { hapticTap } from '../hooks/use-haptics';

const HIDE_UNDO_MS = 10_000;
const REPORT_REASONS = [
  { id: 'insult', ru: 'Оскорбления', uk: 'Образи', es: 'Insultos' },
  { id: 'spam', ru: 'Спам', uk: 'Спам', es: 'Spam' },
  { id: 'unsafe', ru: 'Опасный контент', uk: 'Небезпечний контент', es: 'Contenido peligroso' },
];

function sameRoom(a: LeagueChatRoom | null | undefined, b: LeagueChatRoom | null | undefined): boolean {
  return !!a && !!b && a.groupId === b.groupId && a.weekId === b.weekId && a.leagueId === b.leagueId;
}

export default function LeagueChatPanel({
  fallbackRoom,
  myUid,
  myAvatar,
  myAuraId,
  myTotalXP,
  onToast,
}: {
  fallbackRoom?: LeagueChatRoom | null;
  myUid?: string;
  myAvatar?: string | null;
  myAuraId?: string | null;
  myTotalXP?: number;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const initialRoomRef = useRef<LeagueChatRoom | null | undefined>(undefined);
  if (initialRoomRef.current === undefined) {
    initialRoomRef.current = fallbackRoom ?? getCachedLeagueChatRoomSync();
  }
  const [room, setRoom] = useState<LeagueChatRoom | null>(initialRoomRef.current ?? null);
  const [roomReady, setRoomReady] = useState(() => !!initialRoomRef.current);
  const [messages, setMessages] = useState<LeagueChatMessage[]>(() => {
    const initialRoom = initialRoomRef.current;
    return initialRoom ? getCachedLeagueChatMessagesSync(initialRoom) : [];
  });
  const [blockedUsers, setBlockedUsers] = useState<Record<string, boolean>>({});
  const [pendingHideUntilByUid, setPendingHideUntilByUid] = useState<Record<string, number>>({});
  const [hideTimerNow, setHideTimerNow] = useState(Date.now());
  const [draft, setDraft] = useState('');
  const [draftBlocked, setDraftBlocked] = useState(false);
  const [sending, setSending] = useState(false);
  const [subscriptionNonce, setSubscriptionNonce] = useState(0);
  const [roomRetryNonce, setRoomRetryNonce] = useState(0);
  const [reportTarget, setReportTarget] = useState<LeagueChatMessage | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].id);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const hideTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    let cancelled = false;
    void getBlockedLeagueChatUsers().then((blocked) => {
      if (!cancelled) setBlockedUsers(blocked);
    });
    if (fallbackRoom) {
      setRoom(fallbackRoom);
      setRoomReady(true);
      void cacheLeagueChatRoom(fallbackRoom);
    }
    void (async () => {
      const cached = await loadCachedLeagueChatRoom();
      if (cancelled) return;
      if (cached) {
        setRoom((cur) => cur ?? cached);
        setRoomReady(true);
      }

      const resolved = await resolveMyLeagueChatRoom();
      if (cancelled) return;
      if (resolved) {
        setRoom((cur) => (sameRoom(cur, resolved) ? cur : resolved));
      }
      setRoomReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fallbackRoom?.groupId, fallbackRoom?.weekId, fallbackRoom?.leagueId, roomRetryNonce]);

  useEffect(() => {
    if (room || !roomReady) return;
    const id = setTimeout(() => setRoomRetryNonce((cur) => cur + 1), 2500);
    return () => clearTimeout(id);
  }, [room, roomReady, roomRetryNonce]);

  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    void authorizeLeagueChatRoom(room).then((status) => {
      if (cancelled) return;
      if (status === 'authorized') {
        setSubscriptionNonce((cur) => cur + 1);
      } else if (status === 'forbidden') {
        void forgetCachedLeagueChatRoom(room);
        setRoom((cur) => (sameRoom(cur, room) ? null : cur));
        setRoomReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [room?.groupId, room?.weekId, room?.leagueId]);

  useEffect(() => {
    if (!room) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const memoryMessages = getCachedLeagueChatMessagesSync(room);
    setMessages(memoryMessages);
    void loadCachedLeagueChatMessages(room).then((cached) => {
      if (cancelled) return;
      setMessages(cached);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    });
    const unsub = subscribeLeagueChatMessages(
      room,
      (rows) => {
        if (cancelled) return;
        setMessages(rows);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      },
      () => {},
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [room?.groupId, room?.weekId, subscriptionNonce]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.authorUid === myUid || !blockedUsers[m.authorUid]),
    [messages, blockedUsers, myUid],
  );

  useEffect(() => {
    const hasPending = Object.keys(pendingHideUntilByUid).length > 0;
    if (!hasPending) return;
    const id = setInterval(() => setHideTimerNow(Date.now()), 250);
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
      }), 'error');
      return;
    }
    setSending(true);
    try {
      const result = await sendLeagueChatMessage(room, text);
      if (result === 'sent') {
        setDraft('');
        setDraftBlocked(false);
        showToast(triLang(lang, { ru: 'Сообщение отправлено', uk: 'Повідомлення надіслано', es: 'Mensaje enviado' }), 'success');
      } else if (result === 'review') {
        setDraft('');
        setDraftBlocked(false);
        showToast(triLang(lang, { ru: 'Сообщение ушло на проверку', uk: 'Повідомлення на перевірці', es: 'Mensaje en revisión' }));
      } else if (result === 'throttled') {
        showToast(triLang(lang, { ru: 'Слишком часто. Подожди немного.', uk: 'Занадто часто. Трохи зачекай.', es: 'Demasiado rápido. Espera un poco.' }), 'error');
      } else {
        setDraft('');
        setDraftBlocked(false);
        showToast(triLang(lang, {
          ru: 'Сообщение содержит запрещённые слова и не было отправлено.',
          uk: 'Повідомлення містить заборонені слова і не було надіслано.',
          es: 'El mensaje contiene palabras prohibidas y no fue enviado.',
        }), 'error');
      }
    } finally {
      setSending(false);
    }
  }, [draft, draftBlocked, lang, room, sending, showToast]);

  const openReportModal = useCallback((message: LeagueChatMessage) => {
    hapticTap();
    setReportTarget(message);
    setReportReason(REPORT_REASONS[0].id);
    setReportDetails('');
  }, []);

  const closeReportModal = useCallback(() => {
    if (reportSubmitting) return;
    setReportTarget(null);
    setReportReason(REPORT_REASONS[0].id);
    setReportDetails('');
  }, [reportSubmitting]);

  const submitReport = useCallback(async () => {
    if (!reportTarget || reportSubmitting) return;
    const details = reportDetails.trim();
    if (!details) {
      showToast(triLang(lang, { ru: 'Опиши причину жалобы', uk: 'Опиши причину скарги', es: 'Describe el motivo del reporte' }), 'error');
      return;
    }
    const reason = REPORT_REASONS.find((item) => item.id === reportReason)?.id ?? 'other';
    setReportSubmitting(true);
    try {
      await reportLeagueChatMessage(reportTarget, `${reason}: ${details}`);
      setReportTarget(null);
      setReportReason(REPORT_REASONS[0].id);
      setReportDetails('');
      showToast(triLang(lang, { ru: 'Жалоба отправлена', uk: 'Скаргу надіслано', es: 'Reporte enviado' }), 'success');
    } catch {
      showToast(triLang(lang, { ru: 'Не удалось отправить жалобу', uk: 'Не вдалося надіслати скаргу', es: 'No se pudo enviar el reporte' }), 'error');
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
    showToast(triLang(lang, { ru: 'Скрытие отменено', uk: 'Приховування скасовано', es: 'Ocultación cancelada' }), 'info');
  }, [lang, showToast]);

  const blockUser = useCallback((message: LeagueChatMessage) => {
    hapticTap();
    if (message.authorUid === myUid) {
      showToast(triLang(lang, { ru: 'Свои сообщения скрывать нельзя', uk: 'Свої повідомлення приховувати не можна', es: 'No puedes ocultar tus propios mensajes' }), 'info');
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
        showToast(triLang(lang, { ru: 'Пользователь скрыт в чате', uk: 'Користувача приховано в чаті', es: 'Usuario oculto en el chat' }), 'success');
      }).catch(() => {
        setPendingHideUntilByUid((cur) => {
          const next = { ...cur };
          delete next[uid];
          return next;
        });
        showToast(triLang(lang, { ru: 'Не удалось скрыть участника', uk: 'Не вдалося приховати учасника', es: 'No se pudo ocultar al participante' }), 'error');
      });
    }, HIDE_UNDO_MS);
  }, [cancelPendingHide, lang, myUid, pendingHideUntilByUid, showToast]);

  if (!room && !roomReady) {
    return <View testID="league-chat-loading" style={{ flex: 1 }} />;
  }

  if (!room) {
    return (
      <View testID="league-chat-resolving" style={{ flex: 1, padding: 18, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <Ionicons name="chatbubbles-outline" size={28} color={t.textGhost} />
        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', textAlign: 'center' }}>
          {triLang(lang, { ru: 'Подключаем чат лиги', uk: 'Підключаємо чат ліги', es: 'Conectando el chat de liga' })}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.35), textAlign: 'center' }}>
          {triLang(lang, {
            ru: 'Пару секунд, проверяем комнату этой недели.',
            uk: 'Кілька секунд, перевіряємо кімнату цього тижня.',
            es: 'Abre la liga tras sincronizar para recibir la sala semanal.',
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
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center', padding: 18 }}>
        <View style={{ borderRadius: 18, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgCard, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="flag-outline" size={20} color={t.accent} />
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>
              {triLang(lang, { ru: 'Отправить жалобу?', uk: 'Надіслати скаргу?', es: 'Enviar reporte?' })}
            </Text>
          </View>
          <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.35) }}>
            {triLang(lang, { ru: 'Выбери причину и коротко опиши проблему. Без текста жалоба не отправится.', uk: 'Обери причину й коротко опиши проблему. Без тексту скарга не надішлеться.', es: 'Elige un motivo y describe el problema. El texto es obligatorio.' })}
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
                    {triLang(lang, { ru: reason.ru, uk: reason.uk, es: reason.es })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            testID="league-chat-report-details"
            value={reportDetails}
            onChangeText={setReportDetails}
            placeholder={triLang(lang, { ru: 'Что именно не так?', uk: 'Що саме не так?', es: 'Que ocurre?' })}
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
                {triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="league-chat-report-submit"
              disabled={reportSubmitting || !reportDetails.trim()}
              onPress={submitReport}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: t.accent, opacity: reportSubmitting || !reportDetails.trim() ? 0.5 : 1 }}
            >
              <Text style={{ color: t.correctText, fontSize: f.caption, fontWeight: '900' }}>
                {triLang(lang, { ru: 'Отправить', uk: 'Надіслати', es: 'Enviar' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      style={{ flex: 1 }}
    >
      <View testID="league-chat-panel" style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: visibleMessages.length === 0 ? 'center' : 'flex-start',
            paddingHorizontal: 14,
            paddingTop: 8,
            paddingBottom: 12,
            gap: 10,
          }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <Text style={{ color: t.textGhost, fontSize: Math.max(11, f.caption - 1), lineHeight: Math.round(f.caption * 1.35), paddingHorizontal: 4, marginBottom: 4 }}>
            {triLang(lang, {
              ru: 'Пиши по делу и поддерживай участников. Спам, ссылки и оскорбления могут привести к блокировке аккаунта.',
              uk: 'Пиши по суті й підтримуй учасників. Спам, посилання та образи можуть призвести до блокування акаунта.',
              es: 'Escribe con respeto. El spam, los enlaces y los insultos pueden provocar el bloqueo de la cuenta.',
            })}
          </Text>
          {visibleMessages.length === 0 ? (
            <View testID="league-chat-empty" style={{ alignItems: 'center', paddingHorizontal: 24, gap: 8 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={t.textGhost} />
              <Text style={{ color: t.textGhost, fontSize: f.sub, textAlign: 'center', lineHeight: Math.round(f.sub * 1.35) }}>
                {triLang(lang, { ru: 'Пока тихо. Можно первым пожелать удачи.', uk: 'Поки тихо. Можна першим побажати успіху.', es: 'Aún está tranquilo. Puedes desear suerte primero.' })}
              </Text>
            </View>
          ) : visibleMessages.map((m) => {
            const isMine = !!myUid && m.authorUid === myUid;
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
                          ? triLang(lang, { ru: 'Отменить скрытие', uk: 'Скасувати приховування', es: 'Cancelar ocultación' })
                          : triLang(lang, { ru: 'Скрыть участника', uk: 'Приховати учасника', es: 'Ocultar participante' })}
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

        <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: 'rgba(0,0,0,0.10)' }}>
          {draftBlocked && (
            <Text style={{ color: '#E05252', fontSize: Math.max(10, f.caption - 1), marginBottom: 5, paddingHorizontal: 4 }}>
              {triLang(lang, {
                ru: 'Сообщение содержит запрещённые слова',
                uk: 'Повідомлення містить заборонені слова',
                es: 'El mensaje contiene palabras prohibidas',
              })}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <TextInput
              testID="league-chat-input"
              value={draft}
              onChangeText={handleDraftChange}
              placeholder={triLang(lang, { ru: 'Сообщение...', uk: 'Повідомлення...', es: 'Mensaje...' })}
              placeholderTextColor={t.textGhost}
              multiline
              maxLength={420}
              style={{
                flex: 1,
                minHeight: 42,
                maxHeight: 110,
                borderRadius: 20,
                borderWidth: 0.5,
                borderColor: draftBlocked ? '#E05252' : t.border,
                color: t.textPrimary,
                backgroundColor: t.bgSurface,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: f.sub,
              }}
            />
            <TouchableOpacity
              testID="league-chat-send"
              disabled={sending || !draft.trim()}
              onPress={submit}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: draft.trim() && !draftBlocked ? t.accent : t.bgSurface,
                borderWidth: draft.trim() && !draftBlocked ? 0 : 0.5,
                borderColor: t.border,
                opacity: sending ? 0.65 : 1,
              }}
            >
              <Ionicons name="send" size={18} color={draft.trim() && !draftBlocked ? t.correctText : t.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
    </>
  );
}
