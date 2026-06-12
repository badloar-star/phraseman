import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Text, TextInput, TouchableOpacity, View, ScrollView,
  Modal, KeyboardAvoidingView, Platform, Clipboard, Animated,
} from 'react-native';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { LinearGradient } from '../components/SafeLinearGradient';
import { Ionicons } from '@expo/vector-icons';
import TapScale from '../components/TapScale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenGradient from '../components/ScreenGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ThemedChoiceModal from '../components/ThemedChoiceModal';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import { ensureArenaAuthUid } from './user_id_policy';
import { emitAppEvent } from './events';
import { hapticMediumImpact, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import {
  createArenaLiveRoom,
  getArenaLiveRoom,
  shareArenaLiveRoom,
  subscribeArenaRoomRuns,
  subscribeArenaRoomMembers,
  subscribeArenaRoomDoc,
  subscribeArenaRoomChat,
  joinArenaRoom,
  leaveArenaRoom,
  setArenaRoomReady,
  kickArenaRoomMember,
  closeArenaRoom,
  sendArenaRoomChatMessage,
  type ArenaLiveRoom,
  type ArenaRoomRun,
  type ArenaRoomMember,
  type ArenaRoomChatMessage,
} from './services/arena_rooms_live';
import { reserveArenaGameEntry } from './arena_access_gate';
import { safeRouterBack } from './navigation_back';

type ArenaRoomConfirmDialog = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
};

function cleanCode(code: string): string {
  return String(code ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
}

// ─── Компонент строки участника ───────────────────────────────────────────────
function MemberRow({
  member,
  isMe,
  isHost,
  meIsHost,
  lang,
  t,
  f,
  onKick,
}: {
  member: ArenaRoomMember;
  isMe: boolean;
  isHost: boolean;
  meIsHost: boolean;
  lang: Lang;
  t: any;
  f: any;
  onKick: (uid: string, name: string) => void;
}) {
  const hostAccent = '#F59E0B';
  const readyAccent = '#22C55E';
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
      borderTopWidth: 0.5, borderTopColor: t.border,
      backgroundColor: isMe ? t.accentBg : 'transparent',
    }}>
      <View style={{
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: isHost ? `${hostAccent}22` : t.bgSurface,
        borderWidth: 1.5, borderColor: isHost ? hostAccent : (member.ready ? readyAccent : t.border),
        alignItems: 'center', justifyContent: 'center', marginRight: 10,
      }}>
        <Text style={{ fontSize: 16 }}>{isHost ? '👑' : (member.ready ? '✓' : '?')}</Text>
      </View>
      <Text style={{ flex: 1, color: isMe ? t.accent : t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
        {member.userName}
        {isMe && <Text style={{ color: t.textMuted, fontWeight: '600' }}>
          {triLang(lang, {
            ru: ' (ты)',
            uk: ' (ти)',
            es: ' (tú)',
            'pt-BR': " (você)",
            vi: " (bạn)",
            id: " (kamu)",
            tr: " (sen)",
            pl: " (ty)",
          })}
        </Text>}
      </Text>
      <View style={{
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
        backgroundColor: member.ready ? `${readyAccent}22` : t.bgSurface,
        borderWidth: 1, borderColor: member.ready ? readyAccent : t.border,
        marginRight: meIsHost && !isMe && !isHost ? 8 : 0,
      }}>
        <Text style={{ fontSize: f.caption - 1, fontWeight: '800', color: member.ready ? readyAccent : t.textMuted }}>
          {member.ready
            ? triLang(lang, {
              ru: 'Готов',
              uk: 'Готовий',
              es: 'Listo',
              'pt-BR': "Pronto",
              vi: "Sẵn sàng",
              id: "Siap",
              tr: "Hazır",
              pl: "Gotowe",
            })
            : triLang(lang, {
              ru: 'Ожидает',
              uk: 'Очікує',
              es: 'Esperando',
              'pt-BR': "Esperando",
              vi: "Đang chờ",
              id: "Menunggu",
              tr: "Bekliyor",
              pl: "Oczekiwanie",
            })}
        </Text>
      </View>
      {meIsHost && !isMe && !isHost && (
        <TapScale onPress={() => onKick(member.authUid, member.userName)} style={{ padding: 4 }}>
          <Ionicons name="close-circle-outline" size={20} color={t.textMuted} />
        </TapScale>
      )}
    </View>
  );
}

// ─── Компонент сообщения чата ─────────────────────────────────────────────────
function ChatBubble({ msg, isMe, t, f }: { msg: ArenaRoomChatMessage; isMe: boolean; t: any; f: any }) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={{ marginBottom: 8, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
      {!isMe && (
        <Text style={{ color: t.textMuted, fontSize: f.caption - 2, marginBottom: 2, marginLeft: 4 }}>
          {msg.authorName}
        </Text>
      )}
      <View style={{
        maxWidth: '80%', borderRadius: 14,
        backgroundColor: isMe ? t.accent : t.bgCard,
        paddingHorizontal: 12, paddingVertical: 8,
        borderBottomRightRadius: isMe ? 4 : 14,
        borderBottomLeftRadius: isMe ? 14 : 4,
      }}>
        <Text style={{ color: isMe ? '#fff' : t.textPrimary, fontSize: f.body }}>{msg.text}</Text>
        <Text style={{ color: isMe ? 'rgba(255,255,255,0.6)' : t.textGhost, fontSize: f.caption - 2, marginTop: 2, alignSelf: 'flex-end' }}>
          {time}
        </Text>
      </View>
    </View>
  );
}

// ─── Главный экран ────────────────────────────────────────────────────────────
export default function ArenaRoomScreen() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const topFadeScrollY = useRef(new Animated.Value(0)).current;
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const arenaReadyAccent = '#22C55E';
  const arenaRankAccent = '#F59E0B';
  const arenaCtaColors = ['#F59E0B', '#7C3AED'] as [string, string];
  const arenaReadyColors = ['#22C55E', '#16A34A'] as [string, string];
  const { lang } = useLang();
  const { code: routeCode } = useLocalSearchParams<{ code?: string }>();

  const [codeInput, setCodeInput] = useState(() => cleanCode(routeCode || ''));
  const [room, setRoom] = useState<ArenaLiveRoom | null>(null);
  const [members, setMembers] = useState<ArenaRoomMember[]>([]);
  const [runs, setRuns] = useState<ArenaRoomRun[]>([]);
  const [chatMessages, setChatMessages] = useState<ArenaRoomChatMessage[]>([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ArenaRoomConfirmDialog | null>(null);
  const confirmDialogVisible = useOverlayVisible('arenaRoomConfirm', confirmDialog != null);
  const [chatInput, setChatInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [myReady, setMyReady] = useState(false);
  const [readyBusy, setReadyBusy] = useState(false);
  const [chatSending, setChatSending] = useState(false);

  const codeCopiedRef = useRef(false);
  const joinedRef = useRef(false);
  const lastReadChatCount = useRef(0);
  const chatListRef = useRef<FlashListRef<ArenaRoomChatMessage>>(null);

  const roomCode = room?.code ?? cleanCode(codeInput);
  const sortedRuns = useMemo(() => [...runs].sort((a, b) => b.score - a.score), [runs]);

  const meIsHost = !!(myUid && room && room.ownerUid === myUid);
  const myMember = members.find(m => m.authUid === myUid);
  const allReady = members.length > 0 && members.every(m => m.ready);
  const canStart = meIsHost && allReady && members.length >= 2;

  // Загружаем uid
  useEffect(() => {
    ensureArenaAuthUid().then(setMyUid).catch(() => {});
  }, []);

  // Подписка на документ комнаты (статус, закрытие)
  useEffect(() => {
    if (!room?.code) return;
    return subscribeArenaRoomDoc(room.code, (updated) => {
      if (!updated || updated.status === 'closed') {
        // Комната закрыта — выходим
        if (updated?.status === 'closed') {
          emitAppEvent('action_toast', {
            type: 'info',
            messageRu: 'Комната была закрыта хостом',
            messageUk: 'Кімнату закрив господар',
            messageEs: 'La sala fue cerrada por el host',
          });
          router.replace('/(tabs)/arena' as any);
        }
      } else {
        setRoom(updated);
      }
    });
  }, [room?.code, router]);

  // Подписка на участников
  useEffect(() => {
    if (!room?.code) { setMembers([]); return; }
    return subscribeArenaRoomMembers(room.code, (newMembers) => {
      setMembers(newMembers);
      // Синхронизируем myReady
      if (myUid) {
        const me = newMembers.find(m => m.authUid === myUid);
        if (me) setMyReady(me.ready);
        // Кик — выходим
        if (me?.kicked) {
          emitAppEvent('action_toast', {
            type: 'info',
            messageRu: 'Тебя удалил хост из комнаты',
            messageUk: 'Хост видалив тебе з кімнати',
            messageEs: 'El host te expulsó de la sala',
          });
          router.replace('/(tabs)/arena' as any);
        }
      }
    });
  }, [room?.code, myUid, router]);

  // Подписка на результаты
  useEffect(() => {
    if (!room?.code) { setRuns([]); return; }
    return subscribeArenaRoomRuns(room.code, setRuns);
  }, [room?.code]);

  // Подписка на чат
  useEffect(() => {
    if (!room?.code) { setChatMessages([]); return; }
    return subscribeArenaRoomChat(room.code, (msgs) => {
      setChatMessages(msgs);
      if (!showChat) {
        const newCount = msgs.length - lastReadChatCount.current;
        if (newCount > 0) setUnreadChat(prev => prev + newCount);
        lastReadChatCount.current = msgs.length;
      } else {
        lastReadChatCount.current = msgs.length;
      }
      // Скролл вниз при открытом чате
      if (showChat) {
        setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
  }, [room?.code, showChat]);

  // Вход в комнату после загрузки
  useEffect(() => {
    if (!room?.code || !myUid || joinedRef.current) return;
    joinedRef.current = true;
    AsyncStorage.getItem('user_name').then(name => {
      joinArenaRoom({ code: room.code, userName: name || 'Phraseman' }).catch(() => {});
    });
  }, [room?.code, myUid]);

  // Выход из комнаты при размонтировании
  useEffect(() => {
    return () => {
      if (room?.code) leaveArenaRoom(room.code);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code]);

  const loadRoom = useCallback(async (code: string) => {
    const c = cleanCode(code);
    if (!c) return;
    setLoadingRoom(true);
    try {
      const found = await getArenaLiveRoom(c);
      if (!found) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Комната не найдена или уже истекла.',
          messageUk: 'Кімнату не знайдено або вона вже завершилась.',
          messageEs: 'No se encontró la sala o ya ha caducado.',
        });
        return;
      }
      if (found.status === 'closed') {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Эта комната закрыта.',
          messageUk: 'Ця кімната закрита.',
          messageEs: 'Esta sala está cerrada.',
        });
        return;
      }
      setRoom(found);
      setCodeInput(found.code);
      joinedRef.current = false; // сбросим чтобы joined запустился
    } finally {
      setLoadingRoom(false);
    }
  }, []);

  useEffect(() => {
    const c = cleanCode(routeCode || '');
    if (c) void loadRoom(c);
  }, [loadRoom, routeCode]);

  const handleCreate = useCallback(async () => {
    if (busy) return;
    hapticTap();
    setBusy(true);
    try {
      const uid = await ensureArenaAuthUid();
      if (!uid) return;
      const name = (await AsyncStorage.getItem('user_name').catch(() => null)) || 'Phraseman';
      const created = await createArenaLiveRoom({ ownerUid: uid, ownerName: name });
      setRoom(created);
      setCodeInput(created.code);
      joinedRef.current = false;
      await shareArenaLiveRoom(created, lang);
    } finally {
      setBusy(false);
    }
  }, [busy, lang]);

  const handleJoin = useCallback(async () => {
    hapticTap();
    await loadRoom(codeInput);
  }, [codeInput, loadRoom]);

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    hapticSuccess();
    const uid = await ensureArenaAuthUid();
    if (!uid || !roomCode) return;
    await reserveArenaGameEntry(`room_${roomCode}`, 'room');
    router.push({
      pathname: '/arena_game' as any,
      params: { sessionId: `room_${roomCode}`, roomCode, userId: uid, rankedArena: '0' },
    });
  }, [canStart, roomCode, router]);

  const handleToggleReady = useCallback(async () => {
    if (!room?.code || readyBusy) return;
    hapticTap();
    setReadyBusy(true);
    const next = !myReady;
    setMyReady(next);
    try {
      await setArenaRoomReady(room.code, next);
    } catch {
      setMyReady(!next);
    } finally {
      setReadyBusy(false);
    }
  }, [room?.code, myReady, readyBusy]);

  const handleKick = useCallback((uid: string, name: string) => {
    if (!room?.code) return;
    hapticTap();
    const code = room.code;
    setConfirmDialog({
      title: triLang(lang, {
        ru: 'Удалить игрока',
        uk: 'Видалити гравця',
        es: 'Expulsar jugador',
        'pt-BR': "Expulsar jogador",
        vi: "Mời người chơi ra khỏi phòng",
        id: "Keluarkan pemain",
        tr: "Oyuncuyu çıkar",
        pl: "Wyrzuć gracza",
      }),
      message: triLang(lang, {
        ru: `Удалить ${name} из комнаты?`,
        uk: `Видалити ${name} з кімнати?`,
        es: `¿Expulsar a ${name} de la sala?`,
        'pt-BR': `Expulsar ${name} da sala?`,
        vi: `Mời ${name} ra khỏi phòng?`,
        id: `Keluarkan ${name} dari room?`,
        tr: `${name} odadan çıkarılsın mı?`,
        pl: `Wyrzucić ${name} z pokoju?`,
      }),
      cancelLabel: triLang(lang, {
        ru: 'Отмена',
        uk: 'Скасувати',
        es: 'Cancelar',
        'pt-BR': "Cancelar",
        vi: "Hủy",
        id: "Batal",
        tr: "İptal",
        pl: "Anuluj",
      }),
      confirmLabel: triLang(lang, {
        ru: 'Удалить',
        uk: 'Видалити',
        es: 'Expulsar',
        'pt-BR': "Expulsar",
        vi: "Mời ra",
        id: "Keluarkan",
        tr: "Çıkar",
        pl: "Wyrzuć",
      }),
      onConfirm: () => {
        kickArenaRoomMember(code, uid).catch(() => {});
      },
    });
  }, [room?.code, lang]);

  const handleClose = useCallback(() => {
    if (!room?.code) return;
    hapticTap();
    const code = room.code;
    setConfirmDialog({
      title: triLang(lang, {
        ru: 'Закрыть комнату',
        uk: 'Закрити кімнату',
        es: 'Cerrar sala',
        'pt-BR': "Fechar sala",
        vi: "Đóng phòng",
        id: "Tutup room",
        tr: "Odayı kapat",
        pl: "Zamknij pokój",
      }),
      message: triLang(lang, {
        ru: 'Закрыть комнату для всех?',
        uk: 'Закрити кімнату для всіх?',
        es: '¿Cerrar la sala para todos?',
        'pt-BR': "Fechar a sala para todos?",
        vi: "Đóng phòng cho tất cả?",
        id: "Tutup room untuk semua?",
        tr: "Oda herkes için kapatılsın mı?",
        pl: "Zamknąć pokój dla wszystkich?",
      }),
      cancelLabel: triLang(lang, {
        ru: 'Отмена',
        uk: 'Скасувати',
        es: 'Cancelar',
        'pt-BR': "Cancelar",
        vi: "Hủy",
        id: "Batal",
        tr: "İptal",
        pl: "Anuluj",
      }),
      confirmLabel: triLang(lang, {
        ru: 'Закрыть',
        uk: 'Закрити',
        es: 'Cerrar',
        'pt-BR': "Fechar",
        vi: "Đóng",
        id: "Tutup",
        tr: "Kapat",
        pl: "Zamknij",
      }),
      onConfirm: () => {
        closeArenaRoom(code).catch(() => {});
      },
    });
  }, [room?.code, lang]);

  const handleCopyCode = useCallback(() => {
    if (!room?.code) return;
    hapticTap();
    Clipboard.setString(room.code);
    if (!codeCopiedRef.current) {
      codeCopiedRef.current = true;
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: `Код ${room.code} скопирован`,
        messageUk: `Код ${room.code} скопійовано`,
        messageEs: `Código ${room.code} copiado`,
      });
      setTimeout(() => { codeCopiedRef.current = false; }, 2000);
    }
  }, [room?.code]);

  const handleOpenChat = useCallback(() => {
    hapticTap();
    setUnreadChat(0);
    lastReadChatCount.current = chatMessages.length;
    setShowChat(true);
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: false }), 150);
  }, [chatMessages.length]);

  const handleSendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !room?.code || chatSending) return;
    hapticTap();
    setChatInput('');
    setChatSending(true);
    try {
      await sendArenaRoomChatMessage(room.code, text);
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Сообщение не дошло. Проверь сеть и повтори.',
        messageUk: 'Не вдалося надіслати повідомлення',
        messageEs: 'No se pudo enviar el mensaje',
      });
      setChatInput(text);
    } finally {
      setChatSending(false);
    }
  }, [chatInput, room?.code, chatSending]);

  const myRun = myUid ? sortedRuns.find(r => r.userId === myUid) : undefined;
  const myRank = myRun ? sortedRuns.indexOf(myRun) + 1 : null;

  return (
    <ScreenGradient topFade={{ scrollY: topFadeScrollY }}>
      <BouncyWrap style={bouncyStyle}>
      <Animated.ScrollView
        testID="screen-arena-room"
        decelerationRate="normal"
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, gap: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: topFadeScrollY } } }], { useNativeDriver: true, listener: (e: any) => { onBouncyScroll(e); } })}
      >
        {/* Шапка */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TapScale
            onPress={() => safeRouterBack(router, '/(tabs)/arena' as any)}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border }}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TapScale>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2 + 2, fontWeight: '900' }} numberOfLines={1}>
              {triLang(lang, {
                ru: 'С друзьями',
                uk: 'З друзями',
                es: 'Con amigos',
                'pt-BR': "Com amigos",
                vi: "Với bạn bè",
                id: "Dengan teman",
                tr: "Arkadaşlarla",
                pl: "Ze znajomymi",
              })}
            </Text>
            {room && (
              <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                {triLang(lang, {
                  ru: `Комната ${room.code}`,
                  uk: `Кімната ${room.code}`,
                  es: `Sala ${room.code}`,
                  'pt-BR': `Sala ${room.code}`,
                  vi: `Phòng ${room.code}`,
                  id: `Room ${room.code}`,
                  tr: `${room.code} odası`,
                  pl: `Pokój ${room.code}`,
                })}
              </Text>
            )}
          </View>
          {/* Кнопка чата — только в комнате */}
          {room && (
            <TapScale
              onPress={handleOpenChat}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={unreadChat > 0 ? t.accent : t.textMuted} />
              {unreadChat > 0 && (
                <View style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{unreadChat > 99 ? '99+' : unreadChat}</Text>
                </View>
              )}
            </TapScale>
          )}
        </View>

        {/* Блок ввода кода + создание — только до открытия комнаты */}
        {!room && (
          <View style={{ borderRadius: 18, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgCard, padding: 16, gap: 12 }}>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800', textTransform: 'uppercase' }}>
              {triLang(lang, {
                ru: 'Войти в комнату по коду',
                uk: 'Увійти в кімнату за кодом',
                es: 'Entrar a sala por código',
                'pt-BR': "Entrar na sala por código",
                vi: "Vào phòng bằng mã",
                id: "Masuk room dengan kode",
                tr: "Kodla odaya gir",
                pl: "Wejdź do pokoju kodem",
              })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                testID="arena-room-code-input"
                accessibilityLabel={triLang(lang, {
                  ru: 'Код комнаты',
                  uk: 'Код кімнати',
                  es: 'Código de sala',
                  'pt-BR': 'Código da sala',
                  vi: 'Mã phòng',
                  id: 'Kode ruangan',
                  tr: 'Oda kodu',
                  pl: 'Kod pokoju',
                })}
                value={codeInput}
                onChangeText={(v) => setCodeInput(cleanCode(v))}
                autoCapitalize="characters"
                maxLength={6}
                placeholder="A7K2"
                placeholderTextColor={t.textGhost}
                style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: t.border, color: t.textPrimary, backgroundColor: t.bgSurface, paddingHorizontal: 14, fontSize: f.h2, fontWeight: '900', letterSpacing: 2, textAlign: 'center' }}
              />
              <TapScale
                onPress={handleJoin}
                disabled={loadingRoom || !codeInput}
                style={{ paddingHorizontal: 16, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: codeInput ? t.accent + '22' : t.bgSurface, borderWidth: 1, borderColor: codeInput ? t.accent : t.border, flexDirection: 'row', gap: 6 }}
              >
                <Ionicons name="enter-outline" size={20} color={codeInput ? t.accent : t.textMuted} />
                <Text style={{ color: codeInput ? t.accent : t.textMuted, fontSize: f.caption, fontWeight: '800' }}>
                  {triLang(lang, {
                    ru: 'Войти',
                    uk: 'Увійти',
                    es: 'Entrar',
                    'pt-BR': "Entrar",
                    vi: "Vào",
                    id: "Masuk",
                    tr: "Gir",
                    pl: "Wejdź",
                  })}
                </Text>
              </TapScale>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              <Text style={{ color: t.textGhost, fontSize: f.caption }}>
                {triLang(lang, {
                  ru: 'или',
                  uk: 'або',
                  es: 'o',
                  'pt-BR': "ou",
                  vi: "hoặc",
                  id: "atau",
                  tr: "veya",
                  pl: "albo",
                })}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
            </View>

            <TouchableOpacity testID="arena-room-create-btn" onPress={handleCreate} disabled={busy} activeOpacity={0.88}>
              <LinearGradient colors={[t.accent, t.accent + 'BB']} style={{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                <Ionicons name="add-circle" size={20} color={t.correctText} />
                <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>
                  {busy ? triLang(lang, {
                    ru: 'Создаём…',
                    uk: 'Створюємо…',
                    es: 'Creando…',
                    'pt-BR': "Criando…",
                    vi: "Đang tạo…",
                    id: "Membuat…",
                    tr: "Oluşturuluyor…",
                    pl: "Tworzenie…",
                  })
                       : triLang(lang, {
                         ru: 'Создать комнату',
                         uk: 'Створити кімнату',
                         es: 'Crear sala',
                         'pt-BR': "Criar sala",
                         vi: "Tạo phòng",
                         id: "Buat room",
                         tr: "Oda oluştur",
                         pl: "Utwórz pokój",
                       })}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={{ color: t.textGhost, fontSize: f.caption - 1, textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Создай комнату → поделись кодом с друзьями → все нажмите Готов → хост запускает игру',
                uk: 'Створи кімнату → поділися кодом → всі натисніть Готовий → хост запускає гру',
                es: 'Crea sala → comparte el código → todos pulsan Listo → el host inicia el juego',
                'pt-BR': "Crie a sala → compartilhe o código → todos tocam Pronto → o host inicia o jogo",
                vi: "Tạo phòng → chia sẻ mã → mọi người bấm Sẵn sàng → chủ phòng bắt đầu trò chơi",
                id: "Buat room → bagikan kode → semua tekan Siap → host memulai game",
                tr: "Oda oluştur → kodu paylaş → herkes Hazır der → host oyunu başlatır",
                pl: "Utwórz pokój → udostępnij kod → wszyscy klikają Gotowe → gospodarz zaczyna grę",
              })}
            </Text>
          </View>
        )}

        {/* Карточка активной комнаты */}
        {room && (
          <View style={{ borderRadius: 18, borderWidth: 1.5, borderColor: t.accent + '55', backgroundColor: t.bgCard, overflow: 'hidden' }}>
            <LinearGradient colors={[t.accent + '15', 'transparent']} style={{ padding: 16, gap: 12 }}>

              {/* Код + хост-действия */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 }}>
                    {triLang(lang, {
                      ru: 'Код комнаты',
                      uk: 'Код кімнати',
                      es: 'Código de sala',
                      'pt-BR': "Código da sala",
                      vi: "Mã phòng",
                      id: "Kode room",
                      tr: "Oda kodu",
                      pl: "Kod pokoju",
                    })}
                  </Text>
                  <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text testID="arena-room-code-display" style={{ color: t.accent, fontSize: 34, fontWeight: '900', letterSpacing: 4 }}>
                      {room.code}
                    </Text>
                    <Ionicons name="copy-outline" size={16} color={t.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={{ gap: 6 }}>
                  <TapScale
                    onPress={() => shareArenaLiveRoom(room, lang)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: t.accent + '88', backgroundColor: t.accent + '15' }}
                  >
                    <Ionicons name="share-social" size={15} color={t.accent} />
                    <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '800' }}>
                      {triLang(lang, {
                        ru: 'Пригласить',
                        uk: 'Запросити',
                        es: 'Invitar',
                        'pt-BR': "Convidar",
                        vi: "Mời",
                        id: "Undang",
                        tr: "Davet et",
                        pl: "Zaproś",
                      })}
                    </Text>
                  </TapScale>
                  {meIsHost && (
                    <TapScale
                      onPress={handleClose}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#EF444488', backgroundColor: '#EF444415' }}
                    >
                      <Ionicons name="close-circle-outline" size={15} color="#EF4444" />
                      <Text style={{ color: '#EF4444', fontSize: f.caption, fontWeight: '800' }}>
                        {triLang(lang, {
                          ru: 'Закрыть',
                          uk: 'Закрити',
                          es: 'Cerrar',
                          'pt-BR': "Fechar",
                          vi: "Đóng",
                          id: "Tutup",
                          tr: "Kapat",
                          pl: "Zamknij",
                        })}
                      </Text>
                    </TapScale>
                  )}
                </View>
              </View>

              {/* Статистика */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, borderRadius: 12, backgroundColor: t.bgSurface, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: t.accent, fontSize: f.h2, fontWeight: '900' }}>{members.length}</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.caption - 1 }}>
                    {triLang(lang, {
                      ru: 'в комнате',
                      uk: 'у кімнаті',
                      es: 'en sala',
                      'pt-BR': "na sala",
                      vi: "trong phòng",
                      id: "di room",
                      tr: "odada",
                      pl: "w pokoju",
                    })}
                  </Text>
                </View>
                <View style={{ flex: 1, borderRadius: 12, backgroundColor: t.bgSurface, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: arenaReadyAccent, fontSize: f.h2, fontWeight: '900' }}>
                    {members.filter(m => m.ready).length}/{members.length}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.caption - 1 }}>
                    {triLang(lang, {
                      ru: 'готовы',
                      uk: 'готові',
                      es: 'listos',
                      'pt-BR': "prontos",
                      vi: "sẵn sàng",
                      id: "siap",
                      tr: "hazır",
                      pl: "gotowych",
                    })}
                  </Text>
                </View>
                {myRank && (
                  <View style={{ flex: 1, borderRadius: 12, backgroundColor: t.bgSurface, padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: myRank === 1 ? arenaRankAccent : t.accent, fontSize: f.h2, fontWeight: '900' }}>#{myRank}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption - 1 }}>
                      {triLang(lang, {
                        ru: 'место',
                        uk: 'місце',
                        es: 'posición',
                        'pt-BR': "posição",
                        vi: "vị trí",
                        id: "posisi",
                        tr: "sıra",
                        pl: "miejsce",
                      })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Кнопка Готов (для не-хоста) или Начать (для хоста) */}
              {meIsHost ? (
                <TouchableOpacity
                  testID="arena-room-start-btn"
                  onPress={handleStart}
                  disabled={!canStart}
                  activeOpacity={canStart ? 0.9 : 1}
                >
                  <LinearGradient
                    colors={canStart ? arenaCtaColors : [t.bgSurface, t.bgSurface]}
                    style={{ height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: canStart ? 0 : 1, borderColor: t.border }}
                  >
                    <Ionicons name="play" size={22} color={canStart ? '#FFFFFF' : t.textMuted} />
                    <Text style={{ color: canStart ? '#FFFFFF' : t.textMuted, fontSize: f.body, fontWeight: '900' }}>
                      {canStart
                        ? triLang(lang, {
                          ru: 'Начать игру!',
                          uk: 'Почати гру!',
                          es: '¡Iniciar juego!',
                          'pt-BR': "Iniciar jogo!",
                          vi: "Bắt đầu chơi!",
                          id: "Mulai game!",
                          tr: "Oyunu başlat!",
                          pl: "Rozpocznij grę!",
                        })
                        : triLang(lang, {
                          ru: 'Ждём готовности всех…',
                          uk: 'Чекаємо на всіх…',
                          es: 'Esperando a todos…',
                          'pt-BR': "Esperando todos…",
                          vi: "Đang chờ mọi người…",
                          id: "Menunggu semua…",
                          tr: "Herkes bekleniyor…",
                          pl: "Czekamy na wszystkich…",
                        })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleToggleReady}
                  disabled={readyBusy}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={myReady ? arenaReadyColors : [t.bgSurface, t.bgSurface]}
                    style={{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: myReady ? 0 : 1.5, borderColor: t.border }}
                  >
                    <Ionicons name={myReady ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={myReady ? '#fff' : t.textMuted} />
                    <Text style={{ color: myReady ? '#fff' : t.textMuted, fontSize: f.body, fontWeight: '900' }}>
                      {myReady
                        ? triLang(lang, {
                          ru: 'Готов ✓ (нажми чтобы отменить)',
                          uk: 'Готовий ✓ (натисни щоб скасувати)',
                          es: 'Listo ✓ (toca para cancelar)',
                          'pt-BR': "Pronto ✓ (toque para cancelar)",
                          vi: "Sẵn sàng ✓ (chạm để hủy)",
                          id: "Siap ✓ (ketuk untuk batal)",
                          tr: "Hazır ✓ (iptal için dokun)",
                          pl: "Gotowe ✓ (dotknij, aby anulować)",
                        })
                        : triLang(lang, {
                          ru: 'Нажми — Я ГОТОВ',
                          uk: 'Натисни — Я ГОТОВИЙ',
                          es: 'Pulsa — ESTOY LISTO',
                          'pt-BR': "Toque — ESTOU PRONTO",
                          vi: "Bấm — TÔI SẴN SÀNG",
                          id: "Tekan — SAYA SIAP",
                          tr: "Dokun — HAZIRIM",
                          pl: "Kliknij — JESTEM GOTOWY",
                        })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Сыграть самому (любой игрок может стартануть сам независимо) */}
              {!meIsHost && (
                <TouchableOpacity
                  testID="arena-room-start-solo-btn"
                  onPress={handleStart}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={arenaCtaColors} style={{ height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                    <Ionicons name="play-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: f.sub, fontWeight: '900' }}>
                      {myRun
                        ? triLang(lang, {
                          ru: 'Сыграть снова',
                          uk: 'Зіграти знову',
                          es: 'Jugar de nuevo',
                          'pt-BR': "Jogar de novo",
                          vi: "Chơi lại",
                          id: "Main lagi",
                          tr: "Tekrar oyna",
                          pl: "Zagraj ponownie",
                        })
                        : triLang(lang, {
                          ru: 'Играть в комнате',
                          uk: 'Грати в кімнаті',
                          es: 'Jugar en sala',
                          'pt-BR': "Jogar em sala",
                          vi: "Chơi trong phòng",
                          id: "Main di room",
                          tr: "Odada oyna",
                          pl: "Graj w pokoju",
                        })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Список участников */}
        {room && members.length > 0 && (
          <View style={{ borderRadius: 18, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgCard, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10 }}>
              <Ionicons name="people" size={16} color={t.textMuted} style={{ marginRight: 6 }} />
              <Text style={{ flex: 1, color: t.textMuted, fontSize: f.caption, fontWeight: '900', textTransform: 'uppercase' }}>
                {triLang(lang, {
                  ru: 'В комнате сейчас',
                  uk: 'Зараз у кімнаті',
                  es: 'En la sala ahora',
                  'pt-BR': "Na sala agora",
                  vi: "Đang trong phòng",
                  id: "Di room sekarang",
                  tr: "Şu anda odada",
                  pl: "Teraz w pokoju",
                })}
              </Text>
              <Text style={{ color: t.textGhost, fontSize: f.caption - 1 }}>{members.length}/20</Text>
            </View>
            {members.map((m, idx) => (
              <MemberRow
                key={m.id}
                member={m}
                isMe={m.authUid === myUid}
                isHost={room.ownerUid === m.authUid}
                meIsHost={meIsHost}
                lang={lang}
                t={t}
                f={f}
                onKick={handleKick}
              />
            ))}
          </View>
        )}

        {/* Таблица результатов */}
        {room && (
          <View style={{ borderRadius: 18, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgCard, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10 }}>
              <Text style={{ flex: 1, color: t.textMuted, fontSize: f.caption, fontWeight: '900', textTransform: 'uppercase' }}>
                {triLang(lang, {
                  ru: 'Таблица результатов',
                  uk: 'Таблиця результатів',
                  es: 'Clasificación',
                  'pt-BR': "Classificação",
                  vi: "Xếp hạng",
                  id: "Peringkat",
                  tr: "Sıralama",
                  pl: "Klasyfikacja",
                })}
              </Text>
              {runs.length > 0 && (
                <Text style={{ color: t.textGhost, fontSize: f.caption - 1 }}>
                  {runs.length} {triLang(lang, {
                    ru: 'игроков',
                    uk: 'гравців',
                    es: 'jugadores',
                    'pt-BR': "jogadores",
                    vi: "người chơi",
                    id: "pemain",
                    tr: "oyuncu",
                    pl: "graczy",
                  })}
                </Text>
              )}
            </View>

            {sortedRuns.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
                <Ionicons name="trophy-outline" size={32} color={t.textGhost} />
                <Text style={{ color: t.textGhost, fontSize: f.sub, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Пока никто не сыграл\nНажми «Играть» чтобы первым попасть в таблицу!',
                    uk: 'Ще ніхто не зіграв\nНатисни «Грати» щоб першим потрапити до таблиці!',
                    es: 'Aún no ha jugado nadie\n¡Juega para ser el primero en el marcador!',
                    'pt-BR': "Ninguém jogou ainda\nJogue para ser o primeiro no placar!",
                    vi: "Chưa ai chơi\nHãy chơi để là người đầu tiên trên bảng điểm!",
                    id: "Belum ada yang bermain\nMainlah untuk jadi yang pertama di papan skor!",
                    tr: "Henüz kimse oynamadı\nSkor tablosunda ilk olmak için oyna!",
                    pl: "Nikt jeszcze nie grał\nZagraj, aby być pierwszym w tabeli!",
                  })}
                </Text>
              </View>
            ) : sortedRuns.map((run, idx) => {
              const isMe = run.userId === myUid;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              return (
                <View key={run.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: isMe ? t.accentBg : 'transparent' }}>
                  <Text style={{ width: 32, color: idx === 0 ? arenaRankAccent : t.textMuted, fontSize: f.body, fontWeight: '900' }}>
                    {medal ?? `${idx + 1}`}
                  </Text>
                  <Text style={{ flex: 1, color: isMe ? t.accent : t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
                    {run.userName}{isMe && <Text style={{ color: t.textMuted, fontWeight: '600' }}>{triLang(lang, {
                      ru: ' (ты)',
                      uk: ' (ти)',
                      es: ' (tú)',
                      'pt-BR': " (você)",
                      vi: " (bạn)",
                      id: " (kamu)",
                      tr: " (sen)",
                      pl: " (ty)",
                    })}</Text>}
                  </Text>
                  {run.total > 0 && <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '800', marginRight: 10 }}>{run.correct}/{run.total}</Text>}
                  <Text style={{ color: idx === 0 ? arenaRankAccent : (isMe ? t.accent : t.textPrimary), fontSize: f.body, fontWeight: '900', minWidth: 44, textAlign: 'right' }}>{run.score}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Animated.ScrollView>
      </BouncyWrap>

      {/* ─── Модалка чата ─────────────────────────────────────────────────────── */}
      <Modal visible={showChat} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowChat(false)}>
        <ScreenGradient artBackdrop="arenaMatch">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          {/* Шапка чата */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>
              {triLang(lang, {
                ru: 'Чат комнаты',
                uk: 'Чат кімнати',
                es: 'Chat de sala',
                'pt-BR': "Chat da sala",
                vi: "Chat phòng",
                id: "Chat room",
                tr: "Oda sohbeti",
                pl: "Czat pokoju",
              })}
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}> {room?.code}</Text>
            </Text>
            <TapScale onPress={() => setShowChat(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={t.textPrimary} />
            </TapScale>
          </View>

          {/* Сообщения */}
          <FlashList
            ref={chatListRef}
            data={chatMessages}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Ionicons name="chatbubbles-outline" size={40} color={t.textGhost} />
                <Text style={{ color: t.textGhost, marginTop: 8 }}>
                  {triLang(lang, {
                    ru: 'Нет сообщений. Начни чат!',
                    uk: 'Немає повідомлень. Починай чат!',
                    es: "Sin mensajes. ¡Empieza el chat!",
                    'pt-BR': "Sem mensagens. Comece o chat!",
                    vi: "Chưa có tin nhắn. Bắt đầu trò chuyện!",
                    id: "Belum ada pesan. Mulai chat!",
                    tr: "Mesaj yok. Sohbeti başlat!",
                    pl: "Brak wiadomości. Zacznij czat!",
                  })}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <ChatBubble msg={item} isMe={item.authorUid === myUid} t={t} f={f} />
            )}
            onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Поле ввода */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 20, gap: 8, borderTopWidth: 0.5, borderTopColor: t.border }}>
            <TextInput
              accessibilityLabel={triLang(lang, {
                ru: 'Сообщение в чат',
                uk: 'Повідомлення в чат',
                es: 'Mensaje de chat',
                'pt-BR': 'Mensagem de chat',
                vi: 'Tin nhắn chat',
                id: 'Pesan obrolan',
                tr: 'Sohbet mesajı',
                pl: 'Wiadomość na czacie',
              })}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder={triLang(lang, {
                ru: 'Написать сообщение…',
                uk: 'Написати повідомлення…',
                es: 'Escribe un mensaje…',
                'pt-BR': "Escreva uma mensagem…",
                vi: "Nhập tin nhắn…",
                id: "Tulis pesan…",
                tr: "Mesaj yaz…",
                pl: "Napisz wiadomość…",
              })}
              placeholderTextColor={t.textGhost}
              multiline
              maxLength={300}
              style={{ flex: 1, borderRadius: 20, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgSurface, color: t.textPrimary, paddingHorizontal: 14, paddingVertical: 10, fontSize: f.body, maxHeight: 100 }}
              onSubmitEditing={handleSendChat}
            />
            <TapScale
              onPress={handleSendChat}
              disabled={!chatInput.trim() || chatSending}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: chatInput.trim() ? t.accent : t.bgSurface, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="send" size={18} color={chatInput.trim() ? '#fff' : t.textMuted} />
            </TapScale>
          </View>
        </KeyboardAvoidingView>
        </ScreenGradient>
      </Modal>
      <ThemedChoiceModal
        visible={confirmDialogVisible}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        choices={
          confirmDialog
            ? [
                { label: confirmDialog.cancelLabel, variant: 'secondary', onPress: () => {} },
                { label: confirmDialog.confirmLabel, onPress: confirmDialog.onConfirm },
              ]
            : []
        }
        onRequestClose={() => setConfirmDialog(null)}
      />
    </ScreenGradient>
  );
}
