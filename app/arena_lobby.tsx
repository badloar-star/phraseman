import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Animated, Platform, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useEnergy } from '../components/EnergyContext';
import EnergyBar from '../components/EnergyBar';
import ScreenGradient from '../components/ScreenGradient';
import { SessionSize } from './types/arena';
import { ensureArenaAuthUid } from './user_id_policy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useArenaRank } from '../hooks/use-arena-rank';
import { ARENA_MATCHMAKING_SEARCH_MS, useMatchmakingContext } from '../contexts/MatchmakingContext';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import ArenaLimitModal, { ArenaLimitMode } from '../components/ArenaLimitModal';
import NoEnergyModal from '../components/NoEnergyModal';
import {
  ARENA_DAILY_MAX,
  ARENA_MATCHES_SHARD_REFILL_COST,
  ARENA_MATCHES_SHARD_REFILL_SLOTS,
  getDailyArenaCount,
  getDailyArenaMaxToday,
  getDailyArenaPlaysLeft,
  incrementDailyArenaPlay,
} from './arena_daily_limit';
import { emitAppEvent } from './events';
import { logEvent } from './firebase';
import { useTabNav } from './TabContext';
import { useScreen } from '../hooks/use-screen';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { arenaToasts } from '../constants/arena_i18n';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import type { ArenaSession, LobbyChoice } from './types/arena';
import {
  setSessionLobbyChoice,
  subscribeMatchmakingSearchingTotal,
  subscribeSession,
  subscribeSessionPlayers,
} from './services/arena_db';
import { buildFriendInviteSharePayload } from './arena_duel_share';

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Обратный отсчёт до конца окна поиска (10 мин). */
function formatRemainSearch(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

type LobbyPhase = 'idle' | 'searching' | 'match_found';

function genRoomId() {
  // При Math.random() === 0 toString(36) = "0", substring(2,9) = "" — тогда !friendRoomId
  // вечно «Создаём комнату...». Гарантируем непустой id.
  let s = '';
  while (s.length < 5) {
    s = Math.random().toString(36).replace(/^0\./, '').replace(/\./g, '');
  }
  return s.substring(0, 12).toUpperCase();
}

function isBotSession(sid: string | null | undefined): boolean {
  return !!sid && String(sid).startsWith('bot_');
}

async function createRoom(hostId: string, hostName: string, roomId: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require('@react-native-firebase/firestore').default();
  await db.collection('arena_rooms').doc(roomId).set({
    hostId, hostName, roomId,
    status: 'waiting',
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

// ── Главный экран ─────────────────────────────────────────────────────────────
export default function DuelLobbyScreen({ isTab = false }: { isTab?: boolean } = {}) {
  const { width: windowW, contentMaxW } = useScreen();
  const router = useRouter();
  const { goHome } = useTabNav();
  const { autoSearch } = useLocalSearchParams<{ autoSearch?: string }>();
  const { theme: t, f, themeMode } = useTheme();
  const screenTitleColor = (themeMode === 'sakura' || themeMode === 'ocean')
    ? (themeMode === 'ocean' ? 'rgba(240,252,255,0.95)' : 'rgba(255,248,252,0.95)')
    : t.textPrimary;
  const screenMuted = (themeMode === 'sakura' || themeMode === 'ocean')
    ? (themeMode === 'ocean' ? 'rgba(200,230,255,0.78)' : 'rgba(255,210,230,0.75)')
    : t.textMuted;
  const { lang } = useLang();
  const defaultPlayerName = useMemo(
    () => triLang(lang, { ru: 'Игрок', uk: 'Гравець', es: 'Jugador' }),
    [lang],
  );
  const { spendOne, isUnlimited, energy, bonusEnergy } = useEnergy();
  const size: SessionSize = 2;
  const [userId, setUserId] = useState<string>('');
  const [phase, setPhase] = useState<LobbyPhase>('idle');
  const myRank = useArenaRank();
  const {
    status, sessionId, elapsedMs, searchStartedAt,
    startSearching, cancelSearching, stopSearchTimer, updateQueueWithPushToken,
    setLobbyActive, markMatchHandled, clearFoundMatch,
  } = useMatchmakingContext();
  const [arenaLimitModal, setArenaLimitModal] = useState<ArenaLimitMode | null>(null);
  const [noEnergyModal, setNoEnergyModal] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyMax, setDailyMax] = useState(ARENA_DAILY_MAX);
  /** non-null = открыт блок «другу», id комнаты уже известен (локально) до Firestore */
  const [friendRoomId, setFriendRoomId] = useState<string | null>(null);
  const [friendShared, setFriendShared] = useState(false);
  /** Скільки в пошуку зараз (агрегат app_meta, оновлює Cloud Function; не скануємо matchmaking_queue). */
  const [rawSearchingTotal, setRawSearchingTotal] = useState(0);
  const friendUnsubRef = useRef<(() => void) | null>(null);
  const friendMatchNavRef = useRef(false);
  const pendingMatchChargeRef = useRef(false);
  const chargeInFlightRef = useRef(false);
  const findMatchInFlightRef = useRef(false);
  /** Идемпотентность тоста/cancel при abort одной и той же ranked-сессии из лобби */
  const matchLobbyAbortHandledRef = useRef<string | null>(null);

  const handleFindMatch = useCallback(async (uidOverride?: string) => {
    if (findMatchInFlightRef.current) return;
    findMatchInFlightRef.current = true;
    try {
      if (!isUnlimited) {
        const left = await getDailyArenaPlaysLeft();
        if (left <= 0) {
          setArenaLimitModal('matchmaking');
          return;
        }
      }
      const hasEnergy = isUnlimited || (energy + bonusEnergy) > 0;
      if (!hasEnergy) {
        setNoEnergyModal(true);
        return;
      }
      let uid = (uidOverride || userId).trim();
      if (!uid) {
        uid = (await ensureArenaAuthUid()) ?? '';
      }
      if (!uid) {
        emitAppEvent('action_toast', { type: 'error', ...arenaToasts.queueJoinFailAuth });
        return;
      }
      pendingMatchChargeRef.current = !isUnlimited;
      logEvent('arena_search_started', {
        rank_idx: myRank.rankIndex,
        is_unlimited: isUnlimited ? 1 : 0,
      });
      setPhase('searching');
      const myName = (await AsyncStorage.getItem('user_name')) ?? defaultPlayerName;
      // Счётчик поиска считается в MatchmakingContext — startSearching() должен вызваться сразу;
      // expo-notifications (разрешения + getExpoPushTokenAsync) может отвечать долго или зависать, из‑за этого
      // раньше phase был «searching», а таймер не стартовал (0:00). Токен — фоновым дозапросом.
      const joined = await startSearching(uid, myRank.tier, myRank.level, size, undefined, myName);
      if (!joined) {
        pendingMatchChargeRef.current = false;
        setPhase('idle');
      }
      void (async () => {
        try {
          const { getExpoPushTokenAsync, getPermissionsAsync } = await import('expo-notifications');
          const { status } = await getPermissionsAsync();
          if (status !== 'granted') return;
          const easProjectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
          const tokenData = await getExpoPushTokenAsync(easProjectId ? { projectId: easProjectId } : undefined);
          if (tokenData.data) await updateQueueWithPushToken(tokenData.data);
        } catch {
          emitAppEvent('action_toast', {
            type: 'info',
            messageRu: 'Уведомления недоступны. Поиск матча работает без них.',
            messageUk: 'Сповіщення недоступні. Пошук матчу працює без них.',
            messageEs:
              'Las notificaciones no están disponibles. Puedes buscar partida sin ellas.',
          });
        }
      })();
    } finally {
      findMatchInFlightRef.current = false;
    }
  }, [bonusEnergy, defaultPlayerName, energy, isUnlimited, myRank.level, myRank.rankIndex, myRank.tier, size, startSearching, updateQueueWithPushToken, userId]);

  /** Стековый /arena_lobby — без таббара; редиректим после маунта, чтобы не падать до RootLayout. */
  useEffect(() => {
    if (isTab) return;
    const timer = setTimeout(() => {
      if (autoSearch === '1') {
        router.replace({ pathname: '/(tabs)/arena' as any, params: { autoSearch: '1' } });
      } else {
        router.replace('/(tabs)/arena' as any);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isTab, autoSearch, router]);

  useEffect(() => {
    ensureArenaAuthUid().then(uid => {
      if (uid) {
        setUserId(uid);
        if (autoSearch === '1') handleFindMatch(uid);
      }
    });
    (async () => {
      setDailyCount(await getDailyArenaCount());
      setDailyMax(await getDailyArenaMaxToday());
    })();
  }, [autoSearch, handleFindMatch]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setDailyCount(await getDailyArenaCount());
        setDailyMax(await getDailyArenaMaxToday());
      })();
    }, []),
  );

  // Register lobby as active so MatchFoundToast is suppressed while we're here
  useEffect(() => {
    setLobbyActive(true);
    return () => setLobbyActive(false);
  }, [setLobbyActive]);

  /** Глобальный статус поиска (в т.ч. после перезапуска) → локальная фаза лобби. */
  useEffect(() => {
    if (status === 'searching') setPhase('searching');
    // Ошибка join / сеть: контекст уже idle, а phase залипал в «searching» (без sessionId).
    if (status === 'idle' && phase === 'searching' && !sessionId) setPhase('idle');
  }, [status, phase, sessionId]);

  // Тикер UI: `Date.now()-t0` не даёт ререндер сам; пока ищем — крутим, даже если searchStartedAt ещё 0
  const [, setSearchUiTick] = useState(0);
  useEffect(() => {
    if (phase !== 'searching' && status !== 'searching') return;
    const id = setInterval(() => { setSearchUiTick((n) => n + 1); }, 200);
    return () => { clearInterval(id); };
  }, [phase, status]);
  const displayElapsed =
    searchStartedAt > 0 ? (Date.now() - searchStartedAt) : elapsedMs;
  const remainSearchMs = Math.max(0, ARENA_MATCHMAKING_SEARCH_MS - displayElapsed);

  // refs to avoid stale closures in animation callbacks
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string>('');
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Матч найден — остаёмся в лобби, пока игрок не нажмёт «Принять» (см. блок match found + handlers ниже).
  useEffect(() => {
    if (status === 'found' && sessionId) setPhase('match_found');
    if (status === 'idle' && phase === 'match_found') setPhase('idle');
  }, [status, sessionId, phase]);

  /**
   * В лобби «соперник найден» раньше не слушали arena_sessions: при accept_timeout / decline
   * на сервере клиент оставался в status=found. Подписка + авто-decline по дедлайну (как в use-arena-session).
   */
  useEffect(() => {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const sid = sessionId;
    const uid = userId;
    if (status !== 'found' || !sid || isBotSession(sid) || !uid) return;

    let declineTimer: ReturnType<typeof setTimeout> | null = null;
    const sessionRef: { current: ArenaSession | null } = { current: null };
    const choiceRef: { current: LobbyChoice | undefined } = { current: 'none' };

    const clearDeclineTimer = () => {
      if (declineTimer) {
        clearTimeout(declineTimer);
        declineTimer = null;
      }
    };

    const scheduleLobbyAcceptDeadline = () => {
      clearDeclineTimer();
      const s = sessionRef.current;
      if (!s || s.state !== 'acceptance') return;
      const ch = choiceRef.current ?? 'none';
      if (ch === 'accept' || ch === 'decline') return;
      const deadline = s.acceptDeadlineAt;
      if (typeof deadline !== 'number') return;
      const delay = Math.max(0, deadline - Date.now()) + 80;
      declineTimer = setTimeout(() => {
        declineTimer = null;
        setSessionLobbyChoice(sid, uid, 'decline').catch(() => {});
      }, delay);
    };

    const finishAbortedMatch = (reason: ArenaSession['abortReason']) => {
      if (matchLobbyAbortHandledRef.current === sid) return;
      matchLobbyAbortHandledRef.current = sid;
      clearDeclineTimer();
      void (async () => {
        pendingMatchChargeRef.current = false;
        await cancelSearching();
        setPhase('idle');
        if (reason === 'accept_timeout') {
          emitAppEvent('action_toast', {
            type: 'info',
            messageRu: 'Время на принятие матча истекло. Можно снова искать соперника.',
            messageUk: 'Час на прийняття матчу вичерпано. Можна знову шукати суперника.',
            messageEs:
              'Se acabó el tiempo para aceptar. Puedes buscar otro rival desde la Arena.',
          });
        } else {
          emitAppEvent('action_toast', {
            type: 'info',
            messageRu: 'Матч отменён (соперник отказался или вышел).',
            messageUk: 'Матч скасовано (суперник відмовився або вийшов).',
            messageEs: 'Partida cancelada: tu rival rechazó o salió.',
          });
        }
        logEvent('arena_match_lobby_abort', { reason: reason ?? 'unknown' });
      })();
    };

    const unSubPlayers = subscribeSessionPlayers(sid, (players) => {
      const me = players.find((p) => p.playerId === uid);
      choiceRef.current = me?.lobbyChoice ?? 'none';
      scheduleLobbyAcceptDeadline();
    });

    const unSubSession = subscribeSession(sid, (session) => {
      sessionRef.current = session;
      if (session.state === 'aborted') {
        finishAbortedMatch(session.abortReason);
        return;
      }
      scheduleLobbyAcceptDeadline();
    });

    return () => {
      clearDeclineTimer();
      unSubPlayers();
      unSubSession();
    };
  }, [status, sessionId, userId, cancelSearching]);

  const goToGameAfterAccept = useCallback(() => {
    markMatchHandled();
    hapticSuccess();
    stopSearchTimer();
    clearFoundMatch();
    setPhase('idle');
    const sid = sessionIdRef.current ?? sessionId ?? '';
    const uid = userIdRef.current || userId;
    router.replace({
      pathname: '/arena_game' as any,
      params: { sessionId: sid, userId: uid, fromLobby: '1' },
    });
  }, [markMatchHandled, stopSearchTimer, clearFoundMatch, router, sessionId, userId]);

  const handleMatchFoundDecline = useCallback(async () => {
    hapticTap();
    pendingMatchChargeRef.current = false;
    if (sessionId && !isBotSession(sessionId) && CLOUD_SYNC_ENABLED && userId) {
      await setSessionLobbyChoice(sessionId, userId, 'decline').catch(() => {});
    }
    await cancelSearching();
    setPhase('idle');
    logEvent('arena_match_declined', {});
  }, [sessionId, userId, cancelSearching]);

  const handleMatchFoundAccept = useCallback(async () => {
    if (!sessionId || !userId) return;
    hapticSuccess();

    const doNavigate = async () => {
      if (sessionId && !isBotSession(sessionId) && CLOUD_SYNC_ENABLED) {
        try {
          await setSessionLobbyChoice(sessionId, userId, 'accept');
        } catch {
          emitAppEvent('action_toast', {
            type: 'error',
            messageRu: 'Не удалось подтвердить матч. Проверь сеть и попробуй снова.',
            messageUk: 'Не вдалося підтвердити матч. Перевір мережу і спробуй знову.',
            messageEs: 'No se ha podido confirmar la partida. Revisa la conexión e inténtalo de nuevo.',
          });
          return;
        }
      }
      goToGameAfterAccept();
    };

    if (isUnlimited || !pendingMatchChargeRef.current) {
      await doNavigate();
      return;
    }
    if (chargeInFlightRef.current) return;

    chargeInFlightRef.current = true;
    try {
      const charged = await spendOne();
      if (!charged) {
        pendingMatchChargeRef.current = false;
        await cancelSearching();
        setPhase('idle');
        setNoEnergyModal(true);
        return;
      }
      await incrementDailyArenaPlay();
      const newCount = await getDailyArenaCount();
      setDailyCount(newCount);
      logEvent('arena_match_charged', { mode: 'ranked', daily_count: newCount });
      pendingMatchChargeRef.current = false;
      await doNavigate();
    } finally {
      chargeInFlightRef.current = false;
    }
  }, [sessionId, userId, isUnlimited, goToGameAfterAccept, spendOne, cancelSearching]);

  const handlePlayWithFriend = async () => {
    hapticTap();
    const hasEnergy = isUnlimited || (energy + bonusEnergy) > 0;
    if (!hasEnergy) {
      setNoEnergyModal(true);
      return;
    }

    const id = genRoomId();
    friendMatchNavRef.current = false;
    friendUnsubRef.current?.();
    setFriendRoomId(id);
    setFriendShared(false);

    const runFirestore = async () => {
      try {
        const uid = await ensureArenaAuthUid();
        const name = (await AsyncStorage.getItem('user_name')) ?? defaultPlayerName;
        if (!uid) {
          emitAppEvent('action_toast', {
            type: 'error',
            messageRu: 'Облако недоступно (синхронизация выключена). Друг не сможет войти в комнату.',
            messageUk: 'Хмара недоступна (синхронізація вимкнена). Друг не зможе зайти в кімнату.',
            messageEs: 'La nube no está disponible (sincronización desactivada). Tu amigo no podrá entrar en la sala.',
          });
          return;
        }
        await createRoom(uid, name, id);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const db = require('@react-native-firebase/firestore').default();
        friendUnsubRef.current?.();
        friendUnsubRef.current = db.collection('arena_rooms').doc(id).onSnapshot((snap: any) => {
          if (!snap || !snap.exists) return;
          const data = snap.data();
          if (data.status === 'matched' && data.guestId) {
            if (friendMatchNavRef.current) return;
            friendMatchNavRef.current = true;
            void (async () => {
              if (!isUnlimited) {
                const charged = await spendOne();
                if (!charged) {
                  friendMatchNavRef.current = false;
                  emitAppEvent('action_toast', {
                    type: 'error',
                    messageRu: 'Недостаточно энергии для старта матча.',
                    messageUk: 'Недостатньо енергії для старту матчу.',
                    messageEs: 'No tienes suficiente energía para empezar la partida.',
                  });
                  return;
                }
                logEvent('arena_match_charged', { mode: 'friend' });
              }
              emitAppEvent('action_toast', {
                type: 'success',
                messageRu: 'Друг подключился. Начинаем матч!',
                messageUk: 'Друг підключився. Починаємо матч!',
                messageEs: 'Tu amigo se ha unido. ¡Empezamos el duelo!',
              });
              friendUnsubRef.current?.();
              setFriendRoomId(null);
              router.replace({ pathname: '/arena_game' as any, params: { sessionId: id, userId: uid } });
            })();
          }
        });
      } catch {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Не удалось создать комнату в облаке. Проверьте сеть — если друг не заходит, пригласите ещё раз.',
          messageUk: 'Не вдалося створити кімнату в хмарі. Перевірте мережу — якщо друг не заходить, запросіть ще раз.',
          messageEs: 'No se pudo crear la sala en la nube. Revisa la conexión: si tu amigo no puede entrar, vuelve a invitarlo.',
        });
      }
    };
    void runFirestore();
    // Системный share открывает пользователь кнопкой внизу (ссылку в UI не показываем).
  };

  const handleFriendShare = async () => {
    hapticTap();
    if (!friendRoomId) return;
    try {
      const payload = await buildFriendInviteSharePayload(friendRoomId);
      await Share.share({ message: payload.message }).catch(() => {});
      // Не показываем тост «отправлено» — лист «Поделиться» можно закрыть без реальной отправки
      setFriendShared(true);
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось поделиться ссылкой.',
        messageUk: 'Не вдалося поділитися посиланням.',
        messageEs: 'No se pudo compartir el enlace.',
      });
    }
  };

  const handleCancelSearch = async () => {
    hapticTap();
    pendingMatchChargeRef.current = false;
    const cancelledMs = searchStartedAt > 0 ? (Date.now() - searchStartedAt) : elapsedMs;
    await cancelSearching();
    logEvent('arena_search_cancelled', { elapsed_ms: cancelledMs });
    setPhase('idle');
  };

  /**
   * Лише `phase === 'searching'` — хто **реально** у пошуку в цьому екрані.
   * Не змішувати з `status === 'searching' && phase === 'idle'`: тоді зритель у лобі «вираховує» себе з
   * глобального лічильника, якщо status залип searching (покаже 0, хоча в мережі шукають).
   */
  const inSearchFlow = phase === 'searching' || phase === 'match_found';
  const showMatchFound = status === 'found' && !!sessionId;
  const showQueuePanel =
    (status === 'searching' && (phase === 'searching' || phase === 'idle'))
    || (showMatchFound && (phase === 'searching' || phase === 'match_found'));

  /** Ширина ряда кнопок очереди: как у `body` (padding 20+20). На планшете таб обёрнут в `min(width, contentMaxW)` — иначе слот «Отмена» был шире колонки и зрительно «уезжал». */
  const layoutW = Math.max(
    1,
    (isTab ? Math.min(windowW, contentMaxW) : windowW) - 40,
  );
  const slotHalf = (layoutW - 10) / 2;

  const morph = useRef(new Animated.Value(0)).current;
  const { leftW, rightW, leftOp, spacerW } = useMemo(() => ({
    leftW: morph.interpolate({ inputRange: [0, 1], outputRange: [0, slotHalf] }),
    rightW: morph.interpolate({ inputRange: [0, 1], outputRange: [layoutW, slotHalf] }),
    leftOp: morph.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.9, 1] }),
    spacerW: morph.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
  }), [morph, layoutW, slotHalf]);

  useEffect(() => {
    if (!showMatchFound) {
      morph.setValue(0);
      return;
    }
    morph.setValue(0);
    const run = () => {
      Animated.spring(morph, {
        toValue: 1,
        useNativeDriver: false,
        tension: 100,
        friction: 8.2,
        overshootClamping: true,
        restDisplacementThreshold: 0.1,
        restSpeedThreshold: 0.1,
      }).start();
    };
    const t0 = setTimeout(run, 24);
    return () => { clearTimeout(t0); };
  }, [showMatchFound, sessionId, morph]);

  const queueOthersCount = useMemo(() => {
    const total = Math.max(0, rawSearchingTotal);
    if (inSearchFlow && userId) return Math.max(0, total - 1);
    return total;
  }, [rawSearchingTotal, inSearchFlow, userId]);

  useEffect(() => {
    if (!userId || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
      setRawSearchingTotal(0);
      return;
    }
    return subscribeMatchmakingSearchingTotal(setRawSearchingTotal);
  }, [userId]);

  const othersInQueueBadge =
    queueOthersCount > 0 ? (
      <View
        style={[
          styles.queueActivityBadge,
          {
            borderColor: `${t.accent}55`,
            backgroundColor: `${t.accent}14`,
          },
        ]}
        accessibilityRole="text"
        accessibilityLabel={triLang(lang, {
          uk: `Зараз шукають матч: ${queueOthersCount}`,
          ru: `Сейчас ищут матч: ${queueOthersCount}`,
          es: `Jugadores buscando partida: ${queueOthersCount}`,
        })}
      >
        <Ionicons name="people" size={18} color={t.accent} />
        <Text style={[styles.queueActivityBadgeText, { color: t.textPrimary }]}>
          {triLang(lang, {
            uk: 'Шукають матч: ',
            ru: 'Ищут матч: ',
            es: 'Buscan partida: ',
          })}
          <Text style={{ fontWeight: '900', color: t.accent }}>{queueOthersCount}</Text>
        </Text>
      </View>
    ) : null;

  return (
    <ScreenGradient>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        edges={isTab ? ['top'] : ['top', 'bottom']}
      >
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="arena-header-back"
          accessibilityLabel="qa-arena-header-back"
          accessible
          onPress={() => {
            hapticTap();
            if (isTab) {
              goHome();
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/home' as any);
            }
          }}
          style={[
            styles.backBtn,
            {
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.bgCard,
              borderWidth: 0.5,
              borderColor: t.border,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
        </TouchableOpacity>
        <Text
          testID="screen-arena-lobby"
          accessibilityLabel="qa-screen-arena-lobby"
          style={[styles.title, { color: screenTitleColor, fontSize: f.h2 + 6, fontWeight: '700' }]}
        >
          {triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' })}
        </Text>
        <View style={styles.headerRight}>
          {!isUnlimited && <EnergyBar size={16} />}
          <TouchableOpacity
            testID="arena-top100-button"
            accessibilityLabel={triLang(lang, {
              ru: 'Топ-100 арены',
              uk: 'Топ-100 арени',
              es: 'Top 100 de la Arena',
            })}
            onPress={() => { hapticTap(); router.push('/arena_leaderboard' as any); }}
            style={[styles.rankBadge, { backgroundColor: t.bgSurface, borderColor: t.border }]}
          >
            <Ionicons name="podium-outline" size={18} color={t.accent} />
            <Text style={[styles.rankText, { color: t.textSecond, fontSize: f.label }]}>
              {triLang(lang, { ru: 'Топ-100', uk: 'Топ-100', es: 'Top 100' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="arena-rating-button"
            onPress={() => { hapticTap(); router.push('/arena_rating' as any); }}
            style={[styles.rankBadge, { backgroundColor: t.bgSurface, borderColor: t.border }]}
          >
            <Image source={myRank.image} style={{ width: 24, height: 24 }} resizeMode="contain" />
            <Text style={[styles.rankText, { color: t.textSecond, fontSize: f.label }]}>{myRank.labelShort}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {/* INFO-зона — фиксированная высота над actions. Любая поздняя
            подгрузка контекста (isUnlimited, queueOthersCount) НЕ должна
            смещать кнопки в actions — поэтому держим всё, что асинхронно,
            в отдельном слоте с зарезервированным minHeight. */}
        <View style={styles.infoZone} pointerEvents="box-none">
          {!showQueuePanel && (
            // Текстовая подсказка — одна строка, фиксированной высоты,
            // не прыгает при асинхронном приходе queueOthersCount из Firestore.
            // Бейдж намеренно убран из idle: он дублировал эту строку и дёргал layout.
            <Text
              style={[
                styles.queueHintIdle,
                { color: screenMuted, fontSize: f.caption, textAlign: 'center' },
              ]}
              numberOfLines={1}
            >
              {triLang(lang, {
                uk: `Зараз у пошуку в мережі: ${queueOthersCount}`,
                ru: `Сейчас в сети ищут матч: ${queueOthersCount}`,
                es:
                  queueOthersCount === 1
                    ? 'Hay 1 jugador buscando partida'
                    : `Hay ${queueOthersCount} jugadores buscando partida`,
              })}
            </Text>
          )}
          {/* Premium-слот зарезервирован: рендерится всегда, чтобы isUnlimited,
              приходящий из контекста с задержкой, не сдвигал кнопки.
              Контент скрыт через opacity, место — через minHeight. */}
          {!showQueuePanel && (
            <View
              style={[
                styles.premiumUnlimitedCard,
                {
                  borderColor: 'rgba(255,255,255,0.22)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  opacity: isUnlimited ? 1 : 0,
                },
              ]}
              pointerEvents={isUnlimited ? 'auto' : 'none'}
            >
              <Text style={[styles.premiumUnlimitedText, { color: screenTitleColor, fontSize: f.caption }]}>
                {triLang(lang, {
                  ru: '💎 Premium: безлимитная арена',
                  uk: '💎 Premium: безлімітна дуель',
                  es: '💎 Premium: partidas ilimitadas',
                })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {showQueuePanel ? (
            <>
              <View
                style={[
                  styles.queuePanel,
                  { borderColor: t.border, backgroundColor: 'rgba(255,255,255,0.06)' },
                ]}
              >
                {othersInQueueBadge}
                <Text style={[styles.queueTitle, { color: t.textPrimary, fontSize: f.body }]}>
                  {triLang(lang, {
                    uk: 'Ви в черзі на матч',
                    ru: 'Вы в очереди на матч',
                    es: 'Estás en la cola para una partida',
                  })}
                </Text>
                <Text style={[styles.queueSub, { color: screenMuted, fontSize: f.caption }]}>
                  {triLang(lang, { uk: 'До 10 хв', ru: 'До 10 мин', es: 'Máximo 10 minutos' })}
                </Text>
                <Text style={[styles.queueCountdown, { color: t.accent }]}>
                  {formatRemainSearch(remainSearchMs)}
                </Text>
                <Text style={[styles.searchingLabel, { color: screenMuted, fontSize: f.sub, marginTop: 4 }]}>
                  {triLang(lang, {
                    uk: `У черзі: ${formatElapsed(displayElapsed)}`,
                    ru: `В очереди: ${formatElapsed(displayElapsed)}`,
                    es: `En cola: ${formatElapsed(displayElapsed)}`,
                  })}
                </Text>
                {showMatchFound && (
                  <Text style={[{ color: t.accent, fontSize: f.caption, fontWeight: '800', marginTop: 6, textAlign: 'center' }]}>
                    {triLang(lang, {
                      uk: 'Суперника знайдено',
                      ru: 'Соперник найден',
                      es: 'Rival encontrado',
                    })}
                  </Text>
                )}
              </View>

              <View style={styles.queueActionMorphRow}>
                <Animated.View style={[styles.queueBtnSlot, { width: leftW, overflow: 'hidden' }]}>
                  {showMatchFound && (
                    <Animated.View style={{ width: '100%', opacity: leftOp }}>
                      <TouchableOpacity
                        testID="arena-accept-match"
                        activeOpacity={0.9}
                        onPress={handleMatchFoundAccept}
                        style={[styles.queueAcceptBtn, { backgroundColor: t.accent, borderColor: t.accent }]}
                      >
                        <Ionicons name="checkmark-circle" size={20} color={t.correctText} />
                        <Text style={{ color: t.correctText, fontWeight: '900', fontSize: f.sub }}>
                          {triLang(lang, { uk: 'ПРИЙНЯТИ', ru: 'ПРИНЯТЬ', es: 'ACEPTAR' })}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                </Animated.View>
                <Animated.View style={{ width: spacerW, flexShrink: 0 }} />
                <Animated.View style={[styles.queueBtnSlot, { width: rightW }]}>
                  <TouchableOpacity
                    testID="arena-queue-cancel"
                    style={[styles.cancelBtn, { borderColor: t.border, width: '100%' }]}
                    onPress={showMatchFound ? handleMatchFoundDecline : handleCancelSearch}
                    activeOpacity={0.9}
                    accessibilityLabel={
                      showMatchFound
                        ? triLang(lang, { uk: 'Відмовитись', ru: 'Отклонить', es: 'Rechazar' })
                        : triLang(lang, { uk: 'Скасувати', ru: 'Отмена', es: 'Cancelar' })
                    }
                  >
                    <Text
                      style={[
                        {
                          color: showMatchFound ? t.textPrimary : screenMuted,
                          fontSize: f.body,
                          fontWeight: showMatchFound ? '800' : '400',
                          textAlign: 'center',
                          lineHeight: f.body + 2,
                        },
                        Platform.OS === 'android' && { includeFontPadding: false, textAlignVertical: 'center' as const },
                      ]}
                    >
                      {showMatchFound
                        ? triLang(lang, { uk: 'Відмовити', ru: 'Отклонить', es: 'Rechazar' })
                        : triLang(lang, { uk: 'Скасувати', ru: 'Отмена', es: 'Cancelar' })}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </>
          ) : (
            <>
              <TouchableOpacity testID="arena-find-match" accessibilityLabel="qa-arena-find-match" accessible={true} onPress={() => { hapticTap(); handleFindMatch(); }} activeOpacity={0.85}>
                <LinearGradient
                  colors={[t.accent, t.accent + 'BB']}
                  style={styles.mainBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flash" size={22} color={t.correctText} />
                  <Text style={[styles.mainBtnText, { color: t.correctText, fontSize: f.h2 }]}>
                    {triLang(lang, { uk: 'Знайти матч', ru: 'Найти матч', es: 'Buscar partida' })}
                  </Text>
                  {!isUnlimited && (
                    <Text style={[styles.energyCost, { color: t.correctText + 'AA', fontSize: f.sub }]}>
                      −1 ⚡ · −1 🎟
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                testID="arena-play-with-friend"
                accessibilityLabel="qa-arena-play-with-friend"
                accessible={true}
                style={[styles.secondaryBtn, { borderColor: t.border, backgroundColor: t.bgCard }]}
                onPress={handlePlayWithFriend}
                activeOpacity={0.8}
              >
                <Ionicons name="people" size={20} color={t.accent} />
                <Text style={[styles.secondaryBtnText, { color: t.textPrimary, fontSize: f.body }]}>
                  {triLang(lang, {
                    uk: 'Грати з другом',
                    ru: 'Играть с другом',
                    es: 'Jugar con un amigo',
                  })}
                </Text>
                {!isUnlimited && (
                  <Text style={[styles.energyCost, { color: t.textMuted, fontSize: f.sub, marginLeft: 4 }]}>
                    −1 ⚡
                  </Text>
                )}
              </TouchableOpacity>

              {friendRoomId && (
                <>
                  <TouchableOpacity onPress={handleFriendShare} activeOpacity={0.85}>
                    <LinearGradient
                      colors={[t.accent, t.accent + 'BB']}
                      style={styles.mainBtn}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="share-social" size={22} color={t.correctText} />
                      <Text style={[styles.mainBtnText, { color: t.correctText, fontSize: f.h2 }]}>
                        {friendShared
                          ? triLang(lang, {
                            uk: 'Поділитися знову',
                            ru: 'Поделиться снова',
                            es: 'Compartir de nuevo',
                          })
                          : triLang(lang, {
                            uk: 'Поділитися посиланням',
                            ru: 'Поделиться ссылкой',
                            es: 'Compartir el enlace',
                          })}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {friendShared && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color={t.accent} />
                      <Text style={[{ color: screenMuted, fontSize: f.sub }]}>
                        {triLang(lang, {
                          uk: 'Чекаємо друга...',
                          ru: 'Ждём друга...',
                          es: 'Esperando a tu amigo…',
                        })}
                      </Text>
                    </View>
                  )}
                </>
              )}

            </>
          )}
        </View>


        {/* Слот всегда занят, чтобы поздний приход isUnlimited / phase
            не сдвигал кнопки в actions (иначе при заходе ловим «прыжок» интерфейса). */}
        <View
          style={styles.dailyLimitRow}
          pointerEvents={!isUnlimited && !inSearchFlow ? 'auto' : 'none'}
        >
          {!isUnlimited && !inSearchFlow && (
            <Text style={[styles.energyInfo, { color: screenMuted, fontSize: f.sub, marginTop: 0 }]}>
              🎟 {Math.max(0, dailyMax - dailyCount)}/{dailyMax}{' '}
              {triLang(lang, {
                uk: 'спроб сьогодні',
                ru: 'попыток сегодня',
                es: 'intentos hoy',
              })}
            </Text>
          )}
        </View>
      </View>
      </SafeAreaView>

      <ArenaLimitModal
        visible={arenaLimitModal !== null}
        mode={arenaLimitModal ?? 'matchmaking'}
        playsUsed={dailyCount}
        dailyMax={dailyMax}
        isUnlimited={isUnlimited}
        onRefillSuccess={async () => {
          setDailyCount(await getDailyArenaCount());
          setDailyMax(await getDailyArenaMaxToday());
          logEvent('arena_plays_refill_shards', {
            cost: ARENA_MATCHES_SHARD_REFILL_COST,
            slots: ARENA_MATCHES_SHARD_REFILL_SLOTS,
          });
        }}
        onClose={() => setArenaLimitModal(null)}
      />
      <NoEnergyModal
        visible={noEnergyModal}
        onClose={() => setNoEnergyModal(false)}
        paywallContext="arena"
      />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingBottom: 6,
    /** Жёсткая высота шапки: EnergyBar (с formattedTime/bonusEnergy) и
        myRank (label из Firestore) подгружаются позже — не дёргают layout. */
    minHeight: 60,
  },
  backBtn: { marginRight: 12 },
  title: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5,
  },
  rankEmoji: { fontSize: 16 },
  rankText: { fontWeight: '600' },

  body: { flex: 1, paddingHorizontal: 20, gap: 16 },
  /** infoZone — фиксированный по высоте слот сверху для async-контента
      (queueHintIdle + premiumUnlimitedCard). Стабилизирует позицию кнопок:
      когда isUnlimited / queueOthersCount прилетают позже, центр группы
      в actions НЕ смещается. */
  infoZone: {
    gap: 8,
    minHeight: 80,
  },

  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  cardLabel: { fontWeight: '500' },
  sizeButtons: { flexDirection: 'row', gap: 10 },
  sizeBtn: {
    flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  sizeBtnText: { fontWeight: '700' },

  actions: { flex: 1, gap: 12, justifyContent: 'center' },
  mainBtn: {
    borderRadius: 18, height: 62,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  mainBtnText: { fontWeight: '800' },
  energyCost: { marginLeft: 4, fontWeight: '600' },


  secondaryBtn: {
    borderRadius: 18, height: 56, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  secondaryBtnText: { fontWeight: '600' },
  queueHintIdle: {
    width: '100%',
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  queueActivityBadge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  queueActivityBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  premiumUnlimitedCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  premiumUnlimitedText: {
    fontWeight: '700',
    textAlign: 'center',
  },

  searchingLabel: { fontWeight: '500' },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  queuePanel: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  queueTitle: { fontWeight: '800', textAlign: 'center' },
  queueSub: { textAlign: 'center', lineHeight: 20 },
  queueCountdown: {
    fontSize: 44,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 6,
  },

  energyInfo: { textAlign: 'center', marginTop: 0 },
  /** Один ряд с попытками — чуть выше таббара. minHeight держит место,
      чтобы поздний переключатель isUnlimited не дёргал layout actions. */
  dailyLimitRow: { alignItems: 'center', justifyContent: 'center', paddingBottom: 4, marginBottom: 18, minHeight: 36 },

  queueActionMorphRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  queueBtnSlot: { minHeight: 48, justifyContent: 'center' },
  queueAcceptBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },

});
