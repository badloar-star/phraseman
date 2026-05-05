import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Animated, Easing, Platform, Share, ScrollView,
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
import { emitAppEvent, onAppEvent } from './events';
import { logEvent } from './firebase';
import { useTabNav } from './TabContext';
import { useScreen } from '../hooks/use-screen';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { arenaToasts } from '../constants/arena_i18n';
import {
  ARENA_LOBBY_ACCEPT_MS,
  ARENA_PLAY_AGAIN_BOT_MAX_MS,
  ARENA_PLAY_AGAIN_BOT_MIN_MS,
  CLOUD_SYNC_ENABLED,
  ENABLE_ARENA_RANKED_WAGER,
  IS_EXPO_GO,
} from './config';
import type { ArenaSession, LobbyChoice } from './types/arena';
import {
  setSessionLobbyChoice,
  subscribeMatchmakingSearchingTotal,
  subscribeSession,
  subscribeSessionPlayers,
} from './services/arena_db';
import { buildFriendInviteSharePayload } from './arena_duel_share';
import {
  ARENA_RANKED_WAGER_STAKES,
  clearPendingArenaRankedWager,
  getPendingArenaRankedWager,
  setPendingArenaRankedWager,
  type ArenaRankedPendingWager,
  type ArenaRankedWagerStake,
} from './arena_match_wager';
import { getShardsBalance } from './shards_system';
import { oskolokImageForPackShards } from './oskolok';
import { subscribeToFriends, type FriendEntry } from './firestore_friend_requests';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import AvatarView from '../components/AvatarView';

/** Підказка idle «скільки шукають у мережі» (день 1–7, ніч 1–2): спільний кеш, оновлення ~1 хв. */
const IDLE_QUEUE_HINT_TTL_MS = 60 * 1000;
type IdleQueueHintCache = { value: number; at: number; night: boolean };
let idleQueueHintCache: IdleQueueHintCache | null = null;

/** 20:00–08:00 за локальним часом пристрою — показуємо не більше 2 «у пошуку». */
function isNightArenaIdleQueueHint(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 8;
}

function getOrRefreshIdleQueueHintCount(): number {
  const now = Date.now();
  const night = isNightArenaIdleQueueHint();
  const staleByTime = !idleQueueHintCache || now - idleQueueHintCache.at >= IDLE_QUEUE_HINT_TTL_MS;
  const staleByDaySegment = !!idleQueueHintCache && idleQueueHintCache.night !== night;
  if (!idleQueueHintCache || staleByTime || staleByDaySegment) {
    idleQueueHintCache = {
      value: night ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 7) + 1,
      at: now,
      night,
    };
  }
  return idleQueueHintCache.value;
}

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
  const { autoSearch, playAgainTs } = useLocalSearchParams<{ autoSearch?: string; playAgainTs?: string }>();
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
    resumeSearchAfterLobbyAbort, forgetSearchResumeSnapshot,
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
  /** Підказка «скільки шукають матч» у idle: день 1–7, ніч 20:00–08:00 — 1–2; не частіше ніж раз на хвилину. */
  const [idleQueueHintDisplayCount, setIdleQueueHintDisplayCount] = useState(getOrRefreshIdleQueueHintCount);
  /** Ставка осколками на следующий рейтинг-матч (только «Найти матч» / бот из очереди). */
  const [rankedWagerPending, setRankedWagerPending] = useState<ArenaRankedPendingWager | null>(null);
  const [shardsBalanceUi, setShardsBalanceUi] = useState<number | null>(null);
  const [arenaFriends, setArenaFriends] = useState<FriendEntry[]>([]);
  const [arenaFriendProfiles, setArenaFriendProfiles] = useState<
    Record<string, { name: string; totalXp: number }>
  >({});
  const [arenaFriendHint, setArenaFriendHint] = useState(false);
  const [lobbyAcceptDeadlineAt, setLobbyAcceptDeadlineAt] = useState<number | null>(null);
  const lobbyAcceptBarAnim = useRef(new Animated.Value(1)).current;
  const lobbyAcceptBarAnimRunRef = useRef<Animated.CompositeAnimation | null>(null);
  const friendUnsubRef = useRef<(() => void) | null>(null);
  const friendMatchNavRef = useRef(false);
  const pendingMatchChargeRef = useRef(false);
  const chargeInFlightRef = useRef(false);
  const findMatchInFlightRef = useRef(false);
  /** Идемпотентность тоста/cancel при abort одной и той же ranked-сессии из лобби */
  const matchLobbyAbortHandledRef = useRef<string | null>(null);

  const handleFindMatch = useCallback(async (
    uidOverride?: string,
    opts?: { playAgain?: boolean },
  ) => {
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
        play_again_flow: opts?.playAgain ? 1 : 0,
      });
      setPhase('searching');
      const myName = (await AsyncStorage.getItem('user_name')) ?? defaultPlayerName;
      // Счётчик поиска считается в MatchmakingContext — startSearching() должен вызваться сразу;
      // expo-notifications (разрешения + getExpoPushTokenAsync) может отвечать долго или зависать, из‑за этого
      // раньше phase был «searching», а таймер не стартовал (0:00). Токен — фоновым дозапросом.
      const span = ARENA_PLAY_AGAIN_BOT_MAX_MS - ARENA_PLAY_AGAIN_BOT_MIN_MS;
      const playAgainMs =
        ARENA_PLAY_AGAIN_BOT_MIN_MS + Math.floor(Math.random() * (span + 1));
      const searchOpts = opts?.playAgain
        ? { humanSearchWindowMs: playAgainMs }
        : undefined;
      const joined = await startSearching(
        uid,
        myRank.tier,
        myRank.level,
        size,
        undefined,
        myName,
        searchOpts,
      );
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
        router.replace({
          pathname: '/(tabs)/arena' as any,
          params: { autoSearch: '1', ...(playAgainTs ? { playAgainTs } : {}) },
        });
      } else {
        router.replace('/(tabs)/arena' as any);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isTab, autoSearch, playAgainTs, router]);

  useEffect(() => {
    ensureArenaAuthUid().then((uid) => {
      if (uid) {
        setUserId(uid);
        if (autoSearch === '1') void handleFindMatch(uid, { playAgain: true });
      }
    });
    (async () => {
      setDailyCount(await getDailyArenaCount());
      setDailyMax(await getDailyArenaMaxToday());
    })();
  }, [autoSearch, playAgainTs, handleFindMatch]);

  const refreshRankedWagerUi = useCallback(async () => {
    if (!ENABLE_ARENA_RANKED_WAGER) {
      setRankedWagerPending(null);
      setShardsBalanceUi(null);
      return;
    }
    try {
      const [w, bal] = await Promise.all([getPendingArenaRankedWager(), getShardsBalance()]);
      setRankedWagerPending(w);
      setShardsBalanceUi(bal);
    } catch {
      setShardsBalanceUi(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIdleQueueHintDisplayCount(getOrRefreshIdleQueueHintCount());
      void refreshRankedWagerUi();
      (async () => {
        setDailyCount(await getDailyArenaCount());
        setDailyMax(await getDailyArenaMaxToday());
      })();
    }, [refreshRankedWagerUi]),
  );

  useEffect(() => {
    if (!ENABLE_ARENA_RANKED_WAGER) return undefined;
    const sub = onAppEvent('shards_balance_updated', () => {
      void refreshRankedWagerUi();
    });
    return () => sub.remove();
  }, [refreshRankedWagerUi]);

  useEffect(() => {
    if (phase !== 'idle') return;
    const id = setInterval(() => {
      setIdleQueueHintDisplayCount(getOrRefreshIdleQueueHintCount());
    }, IDLE_QUEUE_HINT_TTL_MS);
    return () => clearInterval(id);
  }, [phase]);

  // Register lobby as active so MatchFoundToast is suppressed while we're here
  useEffect(() => {
    setLobbyActive(true);
    return () => setLobbyActive(false);
  }, [setLobbyActive]);

  useEffect(() => {
    matchLobbyAbortHandledRef.current = null;
  }, [sessionId]);

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
   * Бот-матч без документа arena_sessions: те же 15 с на «Принять», полоска и авто-выход из очереди.
   */
  useEffect(() => {
    if (status !== 'found' || !sessionId || !isBotSession(sessionId)) return;
    const sid = sessionId;
    setLobbyAcceptDeadlineAt(Date.now() + ARENA_LOBBY_ACCEPT_MS);
    const t = setTimeout(() => {
      if (sessionIdRef.current !== sid) return;
      pendingMatchChargeRef.current = false;
      setLobbyAcceptDeadlineAt(null);
      void (async () => {
        await cancelSearching();
        setPhase('idle');
        logEvent('arena_match_lobby_abort', { reason: 'accept_timeout' });
        await resumeSearchAfterLobbyAbort();
      })();
    }, ARENA_LOBBY_ACCEPT_MS + 80);
    return () => {
      clearTimeout(t);
      if (sessionIdRef.current === sid) setLobbyAcceptDeadlineAt(null);
    };
  }, [status, sessionId, cancelSearching, resumeSearchAfterLobbyAbort]);

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
      if (matchLobbyAbortHandledRef.current === sid) {
        matchLobbyAbortHandledRef.current = null;
        return;
      }
      if (sessionIdRef.current !== sid) return;
      matchLobbyAbortHandledRef.current = sid;
      clearDeclineTimer();
      void (async () => {
        pendingMatchChargeRef.current = false;
        await cancelSearching();
        setPhase('idle');
        setLobbyAcceptDeadlineAt(null);
        if (reason !== 'accept_timeout') {
          emitAppEvent('action_toast', {
            type: 'info',
            messageRu: 'Матч отменён (соперник отказался или вышел).',
            messageUk: 'Матч скасовано (суперник відмовився або вийшов).',
            messageEs: 'Partida cancelada: tu rival rechazó o salió.',
          });
        }
        logEvent('arena_match_lobby_abort', { reason: reason ?? 'unknown' });
        await resumeSearchAfterLobbyAbort();
      })();
    };

    const unSubPlayers = subscribeSessionPlayers(sid, (players) => {
      const me = players.find((p) => p.playerId === uid);
      choiceRef.current = me?.lobbyChoice ?? 'none';
      scheduleLobbyAcceptDeadline();
    });

    const unSubSession = subscribeSession(sid, (session) => {
      sessionRef.current = session;
      if (session.state === 'acceptance' && typeof session.acceptDeadlineAt === 'number') {
        setLobbyAcceptDeadlineAt(session.acceptDeadlineAt);
      } else {
        setLobbyAcceptDeadlineAt(null);
      }
      if (session.state === 'aborted') {
        finishAbortedMatch(session.abortReason);
        return;
      }
      scheduleLobbyAcceptDeadline();
    });

    return () => {
      clearDeclineTimer();
      setLobbyAcceptDeadlineAt(null);
      unSubPlayers();
      unSubSession();
    };
  }, [status, sessionId, userId, cancelSearching, resumeSearchAfterLobbyAbort]);

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
    if (sessionId) matchLobbyAbortHandledRef.current = sessionId;
    pendingMatchChargeRef.current = false;
    setLobbyAcceptDeadlineAt(null);
    if (sessionId && !isBotSession(sessionId) && CLOUD_SYNC_ENABLED && userId) {
      await setSessionLobbyChoice(sessionId, userId, 'decline').catch(() => {});
    }
    await cancelSearching();
    setPhase('idle');
    logEvent('arena_match_declined', {});
    void resumeSearchAfterLobbyAbort();
  }, [sessionId, userId, cancelSearching, resumeSearchAfterLobbyAbort]);

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
    forgetSearchResumeSnapshot();
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
  const countsAsInQueue = phase === 'searching' || phase === 'match_found';

  const handleRankedWagerSelect = useCallback(async (stake: ArenaRankedWagerStake) => {
    if (!ENABLE_ARENA_RANKED_WAGER || inSearchFlow) return;
    hapticTap();
    const cur = await getPendingArenaRankedWager();
    if (cur?.stake === stake) {
      await clearPendingArenaRankedWager();
      setRankedWagerPending(null);
      logEvent('arena_ranked_wager_cleared', { stake });
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Ставка на следующий матч снята.',
        messageUk: 'Ставку на наступний матч знято.',
        messageEs: 'Apuesta para la próxima partida cancelada.',
      });
      return;
    }
    const bal = await getShardsBalance();
    if (bal < stake) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: `Нужно минимум ${stake} осколков.`,
        messageUk: `Потрібно щонайменше ${stake} осколків.`,
        messageEs: `Necesitas al menos ${stake} fragmentos.`,
      });
      router.push({
        pathname: '/shards_shop' as any,
        params: { need: String(Math.max(0, stake - bal)), source: 'arena_ranked_wager' },
      });
      return;
    }
    await setPendingArenaRankedWager(stake);
    await refreshRankedWagerUi();
    const payout = stake * 3;
    logEvent('arena_ranked_wager_set', { stake, payout });
    emitAppEvent('action_toast', {
      type: 'success',
      messageRu: `Ставка на матч: ${stake} → при победе +${payout} осколков. Поражение: −${stake}. Ничья: без потерь.`,
      messageUk: `Ставка на матч: ${stake} → при перемозі +${payout} осколків. Поразка: −${stake}. Нічия: без втрат.`,
      messageEs: `Apuesta: ${stake} → si ganas +${payout} fragmentos. Si pierdes: −${stake}. Empate: sin cambio.`,
    });
  }, [inSearchFlow, refreshRankedWagerUi, router]);
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

  useEffect(() => {
    lobbyAcceptBarAnimRunRef.current?.stop?.();
    lobbyAcceptBarAnimRunRef.current = null;
    if (!showMatchFound || !lobbyAcceptDeadlineAt) {
      lobbyAcceptBarAnim.setValue(1);
      return;
    }
    const msLeft = Math.max(0, lobbyAcceptDeadlineAt - Date.now());
    const startFrac = Math.max(0, Math.min(1, msLeft / ARENA_LOBBY_ACCEPT_MS));
    lobbyAcceptBarAnim.setValue(startFrac);
    if (msLeft <= 0) return;
    const anim = Animated.timing(lobbyAcceptBarAnim, {
      toValue: 0,
      duration: msLeft,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    lobbyAcceptBarAnimRunRef.current = anim;
    anim.start(() => {
      lobbyAcceptBarAnimRunRef.current = null;
    });
    return () => {
      anim.stop();
      lobbyAcceptBarAnimRunRef.current = null;
    };
  }, [showMatchFound, lobbyAcceptDeadlineAt, sessionId, lobbyAcceptBarAnim]);

  const queueOthersCount = useMemo(() => {
    const total = Math.max(0, rawSearchingTotal);
    if (countsAsInQueue && userId) return Math.max(0, total - 1);
    return total;
  }, [rawSearchingTotal, countsAsInQueue, userId]);

  useEffect(() => {
    if (!userId || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
      setRawSearchingTotal(0);
      return;
    }
    return subscribeMatchmakingSearchingTotal(setRawSearchingTotal);
  }, [userId]);

  useEffect(() => {
    const unsub = subscribeToFriends(setArenaFriends, () => setArenaFriends([]));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (arenaFriends.length === 0) return;
    const db = (() => {
      if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
      try { return require('@react-native-firebase/firestore').default(); } catch { return null; }
    })();
    if (!db) return;
    let cancelled = false;
    void Promise.all(
      arenaFriends.map(async f => {
        try {
          const snap = await db.collection('users').doc(f.uid).get();
          if (!snap.exists) return null;
          const data = snap.data() ?? {};
          return {
            uid: f.uid,
            name: (data.displayName as string) || (data.progress?.displayName as string) || 'Игрок',
            totalXp: parseInt((data.progress?.user_total_xp as string) ?? '0') || 0,
          };
        } catch { return null; }
      })
    ).then(results => {
      if (cancelled) return;
      const map: Record<string, { name: string; totalXp: number }> = {};
      for (const r of results) if (r) map[r.uid] = r;
      setArenaFriendProfiles(map);
    });
    return () => { cancelled = true; };
  }, [arenaFriends]);

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
        /* В режиме таба верхний inset уже даёт (tabs)/_layout (paddingTop: insets.top).
           Дублирование SafeArea top на iOS давало лишний отступ и дёрганье при появлении EnergyBar/очереди. */
        edges={isTab ? [] : ['top', 'bottom']}
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
        <View style={styles.titleWrap}>
          <Text
            testID="screen-arena-lobby"
            accessibilityLabel="qa-screen-arena-lobby"
            style={[styles.titleText, { color: screenTitleColor, fontSize: f.h2 + 6, fontWeight: '700' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' })}
          </Text>
        </View>
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
            // Підказка «хто шукає матч»: день 1–7, ніч 20:00–08:00 — 1–2; оновлення ~1 хв (див. getOrRefreshIdleQueueHintCount).
            // Бейдж намеренно убран из idle: он дублировал эту строку и дёргал layout.
            <Text
              style={[
                styles.queueHintIdle,
                { color: screenMuted, fontSize: f.caption, textAlign: 'center' },
              ]}
              numberOfLines={1}
            >
              {triLang(lang, {
                uk: `Зараз у пошуку в мережі: ${idleQueueHintDisplayCount}`,
                ru: `Сейчас в сети ищут матч: ${idleQueueHintDisplayCount}`,
                es:
                  idleQueueHintDisplayCount === 1
                    ? 'Hay 1 jugador buscando partida'
                    : `Hay ${idleQueueHintDisplayCount} jugadores buscando partida`,
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
                {ENABLE_ARENA_RANKED_WAGER && rankedWagerPending && (
                  <Text
                    style={[
                      styles.queueSub,
                      {
                        color: t.gold ?? t.accent,
                        fontSize: f.caption,
                        fontWeight: '700',
                        marginTop: 2,
                        textAlign: 'center',
                      },
                    ]}
                  >
                    {triLang(lang, {
                      ru: `💎 Ставка: ${rankedWagerPending.stake} → до +${rankedWagerPending.winPayout}`,
                      uk: `💎 Ставка: ${rankedWagerPending.stake} → до +${rankedWagerPending.winPayout}`,
                      es: `💎 Apuesta: ${rankedWagerPending.stake} → hasta +${rankedWagerPending.winPayout}`,
                    })}
                  </Text>
                )}
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

              {showMatchFound && sessionId && lobbyAcceptDeadlineAt != null && (
                <View style={{ width: layoutW, alignSelf: 'center', marginBottom: 8, marginTop: 2 }} accessibilityRole="timer">
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: `${t.border}99`, overflow: 'hidden' }}>
                    <Animated.View
                      style={{
                        height: '100%',
                        width: '100%',
                        backgroundColor: t.accent,
                        borderRadius: 2,
                        transform: [{ scaleX: lobbyAcceptBarAnim }],
                        transformOrigin: 'left',
                      }}
                    />
                  </View>
                </View>
              )}

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
              {ENABLE_ARENA_RANKED_WAGER && !friendRoomId && (
                <View
                  style={[
                    styles.rankedWagerCard,
                    {
                      width: layoutW,
                      alignSelf: 'center',
                      borderColor: `${t.border}99`,
                      backgroundColor: 'rgba(255,255,255,0.07)',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={[styles.rankedWagerTitle, { color: screenTitleColor, fontSize: f.sub }]}>
                      {triLang(lang, {
                        ru: 'Ставка на следующий матч',
                        uk: 'Ставка на наступний матч',
                        es: 'Apuesta en la próxima partida',
                      })}
                    </Text>
                    {shardsBalanceUi != null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Image
                          source={oskolokImageForPackShards(Math.min(99, shardsBalanceUi))}
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                        <Text style={{ color: screenMuted, fontSize: f.caption, fontWeight: '700' }}>{shardsBalanceUi}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.rankedWagerHint, { color: screenMuted, fontSize: f.caption - 1 }]}>
                    {triLang(lang, {
                      ru: 'Победа: выплата ×3 к ставке вместо обычных +1. Поражение: −ставка. Ничья: без списания.',
                      uk: 'Перемога: виплата ×3 до ставки замість звичайних +1. Поразка: −ставка. Нічия: без списання.',
                      es: 'Victoria: pago ×3 en vez del +1 habitual. Derrota: −apuesta. Empate: sin cambio.',
                    })}
                  </Text>
                  <View style={styles.rankedWagerChipsRow}>
                    {ARENA_RANKED_WAGER_STAKES.map((st) => {
                      const selected = rankedWagerPending?.stake === st;
                      return (
                        <TouchableOpacity
                          key={st}
                          activeOpacity={0.85}
                          onPress={() => void handleRankedWagerSelect(st)}
                          style={[
                            styles.rankedWagerChip,
                            {
                              borderColor: selected ? t.accent : t.border,
                              backgroundColor: selected ? `${t.accent}28` : 'rgba(255,255,255,0.04)',
                            },
                          ]}
                        >
                          <Text style={{ color: screenTitleColor, fontWeight: '800', fontSize: f.body }}>{st}</Text>
                          <Text style={{ color: screenMuted, fontSize: f.caption - 2, marginTop: 2 }}>
                            →{st * 3}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

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

              {/* Arena friends invite list — ARENA-01..04 */}
              {!inSearchFlow && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: screenMuted, fontSize: f.sub, marginBottom: 8, textAlign: 'center' }}>
                    {triLang(lang, { ru: 'Пригласить друга', uk: 'Запросити друга', es: 'Invitar amigo' })}
                  </Text>
                  {arenaFriendHint && (
                    <Text style={{ color: screenMuted, fontSize: f.sub, textAlign: 'center', marginBottom: 6 }}>
                      {triLang(lang, {
                        ru: 'Нажмите «Поделиться ссылкой» выше',
                        uk: 'Натисніть «Поділитися посиланням» вище',
                        es: 'Pulsa «Compartir enlace» arriba',
                      })}
                    </Text>
                  )}
                  {arenaFriends.length === 0 ? (
                    <Text style={{ color: screenMuted, fontSize: f.sub, textAlign: 'center', opacity: 0.6 }}>
                      {triLang(lang, {
                        ru: 'Добавьте друзей по коду в настройках',
                        uk: 'Додайте друзів за кодом у налаштуваннях',
                        es: 'Añade amigos por código en ajustes',
                      })}
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                    >
                      {arenaFriends.map(friend => {
                        const profile = arenaFriendProfiles[friend.uid];
                        const totalXp = profile?.totalXp ?? 0;
                        const level = getLevelFromXP(totalXp);
                        const avatarId = String(getBestAvatarForLevel(level));
                        const name = profile?.name ?? '…';
                        return (
                          <TouchableOpacity
                            key={friend.uid}
                            onPress={() => {
                              hapticTap();
                              if (friendRoomId) {
                                void handleFriendShare();
                              } else {
                                void handlePlayWithFriend();
                                setArenaFriendHint(true);
                                setTimeout(() => setArenaFriendHint(false), 2500);
                              }
                            }}
                            activeOpacity={0.7}
                            style={{ alignItems: 'center', gap: 4, minWidth: 56 }}
                          >
                            <AvatarView avatar={avatarId} size={44} />
                            <Text
                              numberOfLines={1}
                              style={{ color: t.textPrimary, fontSize: f.sub, maxWidth: 60 }}
                            >
                              {name}
                            </Text>
                            <Text style={{ color: screenMuted, fontSize: f.sub }}>
                              Lv {level}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
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
  /** flex:1 на самом Text между узкой кнопкой и широким headerRight сжимал ширину до ~0 на телефонах → буквы столбиком (iOS). */
  titleWrap: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  titleText: { textAlign: 'center', width: '100%' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
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

  rankedWagerCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  rankedWagerTitle: { fontWeight: '800' },
  rankedWagerHint: { lineHeight: 18 },
  rankedWagerChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    justifyContent: 'space-between',
  },
  rankedWagerChip: {
    flexGrow: 1,
    flexBasis: '20%',
    minWidth: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
