import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from 'react';
import {
  joinMatchmakingQueue,
  leaveMatchmakingQueue,
  readMatchmakingQueueSessionId,
  subscribeMatchmakingQueue,
  subscribeMatchmakingQueueOthersCount,
} from '../app/services/arena_db';
import {
  MatchmakingEntry, RankTier, SessionSize,
  rankToIndex, RANK_LEVELS,
} from '../app/types/arena';
import {
  BOT_FALLBACK_ENABLED, BOT_FALLBACK_MAX_MS, BOT_FALLBACK_MIN_MS, IS_EXPO_GO,
} from '../app/config';
import { emitAppEvent } from '../app/events';
import { arenaToasts } from '../constants/arena_i18n';

export type MatchmakingStatus = 'idle' | 'searching' | 'found' | 'timeout' | 'error';

interface MatchmakingContextValue {
  status: MatchmakingStatus;
  sessionId: string | null;
  userId: string | null;
  elapsedMs: number;
  /** Wall-clock 0, пока нет поиска; >0 = Date.now() в момент старта (для UI, если таймер setInterval душится). */
  searchStartedAt: number;
  startSearching: (
    userId: string,
    rankTier: RankTier,
    rankLevel: string,
    size: SessionSize,
    expoPushToken?: string,
    displayName?: string,
  ) => Promise<boolean>;
  cancelSearching: () => Promise<void>;
  isLobbyActive: boolean;
  setLobbyActive: (v: boolean) => void;
  /** Call just before lobby navigates to arena_game — prevents toast flicker */
  markMatchHandled: () => void;
  isMatchHandled: boolean;
  /** После матча найден: подписка очищена, но интервал `elapsed` ещё идёт — вызовите перед уходом в `arena_game`. */
  stopSearchTimer: () => void;
  /** Сбрасывает найденный матч (status/sessionId), чтобы старый sid не утёк в следующий запуск. */
  clearFoundMatch: () => void;
  /** Дополняет запись в очереди push-токеном после `startSearching` (не блокирует старт таймера). */
  updateQueueWithPushToken: (expoPushToken: string) => Promise<void>;
  /** Админка: тост «соперник найден» без реального матча в Firestore. */
  showMatchFoundForTesterPreview: () => void;
}

const MatchmakingCtx = createContext<MatchmakingContextValue>({
  status: 'idle',
  sessionId: null,
  userId: null,
  elapsedMs: 0,
  searchStartedAt: 0,
  startSearching: async () => true,
  cancelSearching: async () => {},
  isLobbyActive: false,
  setLobbyActive: () => {},
  markMatchHandled: () => {},
  isMatchHandled: false,
  stopSearchTimer: () => {},
  clearFoundMatch: () => {},
  updateQueueWithPushToken: async () => {},
  showMatchFoundForTesterPreview: () => {},
});

/** 10 мин поиска — UI обратного отсчёта и таймаут клиента (сервер чистит stale отдельно). */
export const ARENA_MATCHMAKING_SEARCH_MS = 10 * 60 * 1000;
const SEARCH_TIMEOUT_MS = ARENA_MATCHMAKING_SEARCH_MS;
const RANGE_EXPAND_MS    =  3 * 60 * 1000; // expand after 3 min
const INITIAL_RANGE      = 2;
const EXPANDED_RANGE     = 4;
/** 200ms — тише, чем 1s, при лаге JS/Native; `elapsed` пересчитываем от `Date.now()` */
const ELAPSE_TICK_MS     = 200;

const MATCHMAKING_RESUME_KEY = 'arena_matchmaking_resume_v1';

/**
 * Бот-фолбэк: случайная задержка [BOT_FALLBACK_MIN_MS..BOT_FALLBACK_MAX_MS];
 * в production не стартуем бота, пока в очереди есть другие живые игроки
 * (приоритет матча через CF). `bot_*` sessionId — мок-дуэль в `arena_game`.
 * В `__DEV__` — короткий путь 3с без проверки очереди.
 */
const DEV_QUICK_MATCH_MS = 3_000;
const BOT_OTHERS_RECHECK_MIN_MS = 2_000;
const BOT_OTHERS_RECHECK_MAX_MS = 5_500;
function pickBotFallbackDelayMs(): number {
  const min = Math.max(0, BOT_FALLBACK_MIN_MS);
  const max = Math.max(min, BOT_FALLBACK_MAX_MS);
  return Math.round(min + Math.random() * (max - min));
}

type ResumePayload = {
  userId: string;
  startedAt: number;
  rankTier: RankTier;
  rankLevel: string;
  size: SessionSize;
  displayName?: string;
};

async function clearMatchmakingResume(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MATCHMAKING_RESUME_KEY);
  } catch { /* ignore */ }
}

export function MatchmakingProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus]       = useState<MatchmakingStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [searchStartedAt, setSearchStartedAt] = useState(0);
  const statusRef = useRef<MatchmakingStatus>('idle');
  const [isLobbyActive, setLobbyActive] = useState(false);
  const [isMatchHandled, setIsMatchHandled] = useState(false);
  const markMatchHandled = useCallback(() => { setIsMatchHandled(true); }, []);

  const userIdRef        = useRef<string>('');
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef         = useRef<(() => void) | null>(null);
  const unsubOthersRef   = useRef<(() => void) | null>(null);
  const queueOthersCountRef = useRef(0);
  const startTimeRef     = useRef<number>(0);
  const rangeExpandedRef = useRef(false);
  const entryRef         = useRef<MatchmakingEntry | null>(null);
  const devBotMatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDevBotMatchTimeout = useCallback(() => {
    if (devBotMatchTimeoutRef.current) {
      clearTimeout(devBotMatchTimeoutRef.current);
      devBotMatchTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const endQueueSubscription = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    unsubOthersRef.current?.();
    unsubOthersRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    clearDevBotMatchTimeout();
    endQueueSubscription();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSearchStartedAt(0);
    void clearMatchmakingResume();
  }, [clearDevBotMatchTimeout, endQueueSubscription]);

  const stopSearchTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSearchStartedAt(0);
  }, []);

  const clearFoundMatch = useCallback(() => {
    setStatus('idle');
    setSessionId(null);
    setElapsedMs(0);
    setSearchStartedAt(0);
  }, []);

  const updateQueueWithPushToken = useCallback(async (expoPushToken: string) => {
    const ent = entryRef.current;
    if (!ent || !expoPushToken) return;
    try {
      const searchRange = rangeExpandedRef.current ? EXPANDED_RANGE : INITIAL_RANGE;
      const next: MatchmakingEntry = { ...ent, expoPushToken, searchRange };
      await joinMatchmakingQueue(next);
      entryRef.current = next;
    } catch { /* keep searching without token */ }
  }, []);

  const startSearching = useCallback(async (
    userId: string,
    rankTier: RankTier,
    rankLevel: string,
    size: SessionSize,
    expoPushToken?: string,
    displayName?: string,
  ) => {
    // already searching — ignore duplicate calls
    if (timerRef.current !== null) return true;

    const uid = typeof userId === 'string' ? userId.trim() : '';
    if (!uid) {
      emitAppEvent('action_toast', {
        type: 'error',
        ...arenaToasts.queueJoinFailAuth,
      });
      return false;
    }

    userIdRef.current        = uid;
    rangeExpandedRef.current = false;
    setIsMatchHandled(false);
    const t0 = Date.now();
    startTimeRef.current   = t0;
    setSearchStartedAt(t0);

    const rankIndex = rankToIndex(rankTier, rankLevel as (typeof RANK_LEVELS)[number]);
    const entry: MatchmakingEntry = {
      userId: uid, rankTier, size,
      joinedAt: startTimeRef.current,
      rankIndex,
      searchRange: INITIAL_RANGE,
      ...(expoPushToken ? { expoPushToken } : {}),
      ...(displayName ? { displayName } : {}),
    };
    entryRef.current = entry;

    setStatus('searching');
    setElapsedMs(0);
    setSessionId(null);

    // Interval: elapsed + range expand + 10m timeout. При `found` лобби вызывает stopSearchTimer перед навигацией.
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(elapsed);

      if (
        statusRef.current === 'searching' &&
        !rangeExpandedRef.current &&
        elapsed >= RANGE_EXPAND_MS
      ) {
        rangeExpandedRef.current = true;
        const ent = entryRef.current;
        if (ent) {
          const next: MatchmakingEntry = {
            ...ent,
            searchRange: EXPANDED_RANGE,
            joinedAt: Date.now(),
          };
          entryRef.current = next;
          void joinMatchmakingQueue(next);
        }
      }

      if (statusRef.current === 'searching' && elapsed >= SEARCH_TIMEOUT_MS) {
        cleanup();
        leaveMatchmakingQueue(userIdRef.current).catch(() => {});
        emitAppEvent('action_toast', {
          type: 'info',
          ...arenaToasts.searchTimeout,
        });
        setStatus('idle');
      }
    }, ELAPSE_TICK_MS);

    try {
      await joinMatchmakingQueue(entry);
      const resume: ResumePayload = {
        userId: uid,
        startedAt: t0,
        rankTier,
        rankLevel,
        size,
        ...(displayName ? { displayName } : {}),
      };
      await AsyncStorage.setItem(MATCHMAKING_RESUME_KEY, JSON.stringify(resume));
    } catch {
      // PERMISSION_DENIED / network error — раньше глоталось тихо и юзер 10 минут смотрел на пустой таймер.
      cleanup();
      leaveMatchmakingQueue(uid).catch(() => {});
      emitAppEvent('action_toast', {
        type: 'error',
        ...arenaToasts.queueJoinFailRetry,
      });
      setStatus('idle');
      return false;
    }

    const onMatchFound = (foundSessionId: string) => {
      clearDevBotMatchTimeout();
      void clearMatchmakingResume();
      endQueueSubscription();
      setSessionId(foundSessionId);
      setStatus('found');
    };

    unsubRef.current = subscribeMatchmakingQueue(uid, onMatchFound);
    unsubOthersRef.current?.();
    queueOthersCountRef.current = 0;
    unsubOthersRef.current = subscribeMatchmakingQueueOthersCount(
      () => ({ userId: uid, inSearchFlow: statusRef.current === 'searching' }),
      (n) => { queueOthersCountRef.current = n; },
    );

    const tryFireBotMatch = (): void => {
      devBotMatchTimeoutRef.current = null;
      if (statusRef.current !== 'searching') return;
      const deferForLivePlayers =
        !__DEV__ && BOT_FALLBACK_ENABLED && queueOthersCountRef.current > 0;
      if (deferForLivePlayers) {
        const span = BOT_OTHERS_RECHECK_MAX_MS - BOT_OTHERS_RECHECK_MIN_MS;
        const ms = BOT_OTHERS_RECHECK_MIN_MS + Math.floor(Math.random() * span);
        devBotMatchTimeoutRef.current = setTimeout(tryFireBotMatch, ms);
        return;
      }
      void clearMatchmakingResume();
      endQueueSubscription();
      void leaveMatchmakingQueue(uid);
      setSessionId(`bot_${uid}_${Date.now()}`);
      setStatus('found');
    };

    // Бот-фолбэк: __DEV__ — 3с без проверки очереди; prod — 1с…2мин, но не пока есть другие в matchmaking.
    const botDelay = __DEV__
      ? DEV_QUICK_MATCH_MS
      : (BOT_FALLBACK_ENABLED ? pickBotFallbackDelayMs() : null);
    if (botDelay !== null) {
      clearDevBotMatchTimeout();
      devBotMatchTimeoutRef.current = setTimeout(tryFireBotMatch, botDelay);
    }

    // CF може записати sessionId між await join і першим snapshot — добираємо матч get-ом.
    const lateSid = await readMatchmakingQueueSessionId(uid);
    if (lateSid && statusRef.current === 'searching') {
      onMatchFound(lateSid);
      leaveMatchmakingQueue(uid).catch(() => {});
    }
    return true;
  }, [cleanup, endQueueSubscription, clearDevBotMatchTimeout]);

  /** После перезапуска приложения: очередь в Firestore ещё жива — поднимаем таймер и подписку. */
  useEffect(() => {
    if (IS_EXPO_GO) return;
    let cancelled = false;
    (async () => {
      try {
        if (timerRef.current !== null) return;
        const raw = await AsyncStorage.getItem(MATCHMAKING_RESUME_KEY);
        if (!raw || cancelled) return;
        let parsed: ResumePayload;
        try {
          parsed = JSON.parse(raw) as ResumePayload;
        } catch {
          await clearMatchmakingResume();
          return;
        }
        const { userId, startedAt, rankTier, rankLevel, size, displayName } = parsed;
        if (!userId || typeof startedAt !== 'number') {
          await clearMatchmakingResume();
          return;
        }
        const elapsed = Date.now() - startedAt;
        if (elapsed >= SEARCH_TIMEOUT_MS) {
          await clearMatchmakingResume();
          await leaveMatchmakingQueue(userId).catch(() => {});
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const db = require('@react-native-firebase/firestore').default();
        const qSnap = await db.collection('matchmaking_queue').doc(userId).get();
        if (cancelled) return;
        if (!qSnap.exists) {
          await clearMatchmakingResume();
          return;
        }
        const d = qSnap.data() as MatchmakingEntry & { sessionId?: string };
        if (d.sessionId) {
          await clearMatchmakingResume();
          return;
        }
        if (timerRef.current !== null) return;

        userIdRef.current = userId;
        const t0 = typeof d.joinedAt === 'number' ? d.joinedAt : startedAt;
        startTimeRef.current = t0;
        setSearchStartedAt(t0);
        const elapsedSinceJoin = Date.now() - t0;
        rangeExpandedRef.current = elapsedSinceJoin >= RANGE_EXPAND_MS;
        entryRef.current = {
          userId: d.userId ?? userId,
          rankTier: (d.rankTier ?? rankTier) as RankTier,
          size: (d.size ?? size) as SessionSize,
          joinedAt: typeof d.joinedAt === 'number' ? d.joinedAt : t0,
          rankIndex: typeof d.rankIndex === 'number' ? d.rankIndex : rankToIndex(rankTier, rankLevel as (typeof RANK_LEVELS)[number]),
          searchRange: rangeExpandedRef.current ? EXPANDED_RANGE : INITIAL_RANGE,
          ...(d.expoPushToken ? { expoPushToken: d.expoPushToken } : {}),
          ...(d.displayName || displayName ? { displayName: (d.displayName ?? displayName) as string } : {}),
        };
        setIsMatchHandled(false);
        setStatus('searching');
        setElapsedMs(Date.now() - t0);
        setSessionId(null);

        timerRef.current = setInterval(() => {
          const el = Date.now() - startTimeRef.current;
          setElapsedMs(el);
          if (
            statusRef.current === 'searching' &&
            !rangeExpandedRef.current &&
            el >= RANGE_EXPAND_MS
          ) {
            rangeExpandedRef.current = true;
            const ent = entryRef.current;
            if (ent) {
              const next: MatchmakingEntry = {
                ...ent,
                searchRange: EXPANDED_RANGE,
                joinedAt: Date.now(),
              };
              entryRef.current = next;
              void joinMatchmakingQueue(next);
            }
          }
          if (statusRef.current === 'searching' && el >= SEARCH_TIMEOUT_MS) {
            cleanup();
            leaveMatchmakingQueue(userIdRef.current).catch(() => {});
        emitAppEvent('action_toast', {
          type: 'info',
          ...arenaToasts.searchTimeout,
        });
            setStatus('idle');
          }
        }, ELAPSE_TICK_MS);

        const onMatchFoundResume = (foundSessionId: string) => {
          clearDevBotMatchTimeout();
          void clearMatchmakingResume();
          endQueueSubscription();
          setSessionId(foundSessionId);
          setStatus('found');
        };

        unsubRef.current = subscribeMatchmakingQueue(userId, onMatchFoundResume);
        unsubOthersRef.current?.();
        queueOthersCountRef.current = 0;
        unsubOthersRef.current = subscribeMatchmakingQueueOthersCount(
          () => ({ userId, inSearchFlow: statusRef.current === 'searching' }),
          (n) => { queueOthersCountRef.current = n; },
        );

        const tryFireBotMatchResume = (): void => {
          devBotMatchTimeoutRef.current = null;
          if (statusRef.current !== 'searching') return;
          const deferForLivePlayers =
            !__DEV__ && BOT_FALLBACK_ENABLED && queueOthersCountRef.current > 0;
          if (deferForLivePlayers) {
            const span = BOT_OTHERS_RECHECK_MAX_MS - BOT_OTHERS_RECHECK_MIN_MS;
            const ms = BOT_OTHERS_RECHECK_MIN_MS + Math.floor(Math.random() * span);
            devBotMatchTimeoutRef.current = setTimeout(tryFireBotMatchResume, ms);
            return;
          }
          void clearMatchmakingResume();
          endQueueSubscription();
          void leaveMatchmakingQueue(userId);
          setSessionId(`bot_${userId}_${Date.now()}`);
          setStatus('found');
        };

        const baseBotDelay = __DEV__
          ? DEV_QUICK_MATCH_MS
          : (BOT_FALLBACK_ENABLED ? pickBotFallbackDelayMs() : null);
        if (baseBotDelay !== null) {
          const delay = Math.max(0, baseBotDelay - (Date.now() - t0));
          clearDevBotMatchTimeout();
          devBotMatchTimeoutRef.current = setTimeout(tryFireBotMatchResume, delay);
        }

        const lateSidResume = await readMatchmakingQueueSessionId(userId);
        if (lateSidResume && statusRef.current === 'searching') {
          onMatchFoundResume(lateSidResume);
          leaveMatchmakingQueue(userId).catch(() => {});
        }
      } catch {
        await clearMatchmakingResume();
      }
    })();
    return () => { cancelled = true; };
    // Восстановление один раз при монтировании провайдера
    // eslint-disable-next-line react-hooks/exhaustive-deps -- намеренно без deps: не дублировать подписку при смене ссылок callback
  }, []);

  const cancelSearching = useCallback(async () => {
    cleanup();
    const uid = userIdRef.current;
    if (uid) leaveMatchmakingQueue(uid).catch(() => {});
    setStatus('idle');
    setElapsedMs(0);
    setSessionId(null);
  }, [cleanup]);

  const showMatchFoundForTesterPreview = useCallback(() => {
    void cancelSearching().then(() => {
      const uid = `tester_toast_${Date.now()}`;
      userIdRef.current = uid;
      setIsMatchHandled(false);
      setSessionId(`preview_match_${Date.now()}`);
      setStatus('found');
    });
  }, [cancelSearching]);

  useEffect(() => () => cleanup(), [cleanup]);

  return (
    <MatchmakingCtx.Provider value={{
      status, sessionId,
      userId: userIdRef.current || null,
      elapsedMs,
      searchStartedAt,
      startSearching, cancelSearching,
      isLobbyActive, setLobbyActive,
      markMatchHandled, isMatchHandled,
      stopSearchTimer,
      clearFoundMatch,
      updateQueueWithPushToken,
      showMatchFoundForTesterPreview,
    }}>
      {children}
    </MatchmakingCtx.Provider>
  );
}

export function useMatchmakingContext() {
  return useContext(MatchmakingCtx);
}
