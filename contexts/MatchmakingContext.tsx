import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useRef, useState,
} from 'react';
import {
  joinMatchmakingQueue,
  leaveMatchmakingQueue,
  readMatchmakingQueueState,
  readMatchmakingQueueSessionId,
  subscribeMatchmakingQueue,
  subscribeMatchmakingQueueOthersCount,
} from '../app/services/arena_db';
import {
  MatchmakingEntry, RankTier, SessionSize,
  rankToIndex, RANK_LEVELS, RANK_TIERS,
} from '../app/types/arena';
import {
  BOT_FALLBACK_ENABLED, BOT_FALLBACK_MAX_MS, BOT_FALLBACK_MIN_MS,
  ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK, IS_EXPO_GO,
} from '../app/config';
import { emitAppEvent } from '../app/events';
import { isArenaBotsEnabled } from '../app/remote_flags';
import { arenaToasts } from '../constants/arena_i18n';
import { useArenaMatchmakingControlClock } from '../hooks/use_arena_matchmaking_control_clock';

export type MatchmakingStatus = 'idle' | 'searching' | 'found' | 'timeout' | 'error';

type StartSearchOptions = {
  humanSearchWindowMs?: number;
  preserveQueueStartedAtMs?: number;
  preserveBotFallbackDeadlineAt?: number | null;
};

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
    options?: StartSearchOptions,
  ) => Promise<boolean>;
  /** Если задан — столько ждём живого соперника до бота («Ещё раз»); экран лобби тот же, что при обычном поиске. */
  humanSearchWindowMs: number | null;
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
  /** Повторно встать в очередь после отклонения / таймаута принятия (те же ранг и имя, без «Ещё раз»-окна). */
  resumeSearchAfterLobbyAbort: () => Promise<void>;
  /** Сбросить снимок (например при отмене поиска кнопкой «Отмена» в очереди). */
  forgetSearchResumeSnapshot: () => void;
  showMatchFoundForTesterPreview: () => void;
}

const MatchmakingCtx = createContext<MatchmakingContextValue>({
  status: 'idle',
  sessionId: null,
  userId: null,
  elapsedMs: 0,
  searchStartedAt: 0,
  startSearching: async () => true,
  humanSearchWindowMs: null,
  cancelSearching: async () => {},
  isLobbyActive: false,
  setLobbyActive: () => {},
  markMatchHandled: () => {},
  isMatchHandled: false,
  stopSearchTimer: () => {},
  clearFoundMatch: () => {},
  updateQueueWithPushToken: async () => {},
  showMatchFoundForTesterPreview: () => {},
  resumeSearchAfterLobbyAbort: async () => {},
  forgetSearchResumeSnapshot: () => {},
});

/**
 * Окно поиска соперника — таймаут клиента (сервер чистит stale отдельно).
 * Было 10 минут: при отсутствии живых соперников пользователь до 10 минут смотрел
 * на пустой обратный отсчёт. 75 секунд — разумный компромисс: достаточно времени
 * найти живого игрока и один раз расширить диапазон рангов, но без «зависшего»
 * ожидания. По истечении — понятный экран «Соперник не найден», а не тихий тост.
 */
export const ARENA_MATCHMAKING_SEARCH_MS = 75 * 1000;
const SEARCH_TIMEOUT_MS = ARENA_MATCHMAKING_SEARCH_MS;
const RANGE_EXPAND_MS    = 30 * 1000; // расширяем диапазон рангов через 30 c
const INITIAL_RANGE      = 2;
const EXPANDED_RANGE     = 4;
/** 1s is enough for visible elapsed time; exact bot/search deadlines use wall-clock checks. */
const ELAPSE_TICK_MS     = 1000;

const MATCHMAKING_RESUME_KEY = 'arena_matchmaking_resume_v1';

/**
 * Бот-фолбэк: случайная задержка [BOT_FALLBACK_MIN_MS..BOT_FALLBACK_MAX_MS];
 * в production не стартуем бота, пока в очереди есть другие живые игроки
 * (приоритет матча через CF). `bot_*` sessionId — мок-дуэль в `arena_game`.
 * Окно `humanSearchWindowMs` («Ещё раз»): ровно N мс на живого соперника, без откладывания из‑за очереди, потом бот.
 * В `__DEV__` — короткий путь 3с без проверки очереди (кроме режима humanSearchWindowMs).
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
  humanSearchWindowMs?: number;
  botFallbackDeadlineAt?: number | null;
};

type SearchResumeSnapshot = {
  userId: string;
  rankTier: RankTier;
  rankLevel: string;
  size: SessionSize;
  displayName?: string;
};

/** Обратное к rankToIndex — для автопродолжения поиска, если снимок resume потерян. */
function rankIndexToTierLevel(rankIndex: number): { rankTier: RankTier; rankLevel: string } {
  const ti = Math.max(0, Math.min(RANK_TIERS.length - 1, Math.floor(rankIndex / 3)));
  const li = Math.max(0, Math.min(RANK_LEVELS.length - 1, rankIndex % 3));
  return { rankTier: RANK_TIERS[ti], rankLevel: RANK_LEVELS[li] };
}

function buildResumeSnapshotFromEntry(e: MatchmakingEntry): SearchResumeSnapshot | null {
  if (!e.userId) return null;
  if (typeof e.rankIndex === 'number') {
    const { rankTier, rankLevel } = rankIndexToTierLevel(e.rankIndex);
    return {
      userId: e.userId,
      rankTier,
      rankLevel,
      size: e.size,
      ...(e.displayName ? { displayName: e.displayName } : {}),
    };
  }
  return {
    userId: e.userId,
    rankTier: e.rankTier,
    rankLevel: 'I',
    size: e.size,
    ...(e.displayName ? { displayName: e.displayName } : {}),
  };
}

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
  const [humanSearchWindowMs, setHumanSearchWindowMs] = useState<number | null>(null);

  const userIdRef        = useRef<string>('');
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchActiveRef  = useRef(false);
  const searchGenerationRef = useRef(0);
  const controlClockHandleRef = useRef<ReturnType<typeof useArenaMatchmakingControlClock> | null>(null);
  const unsubRef         = useRef<(() => void) | null>(null);
  const unsubOthersRef   = useRef<(() => void) | null>(null);
  const queueOthersCountRef = useRef(0);
  const startTimeRef     = useRef<number>(0);
  const rangeExpandedRef = useRef(false);
  const entryRef         = useRef<MatchmakingEntry | null>(null);
  const devBotMatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** >0: после «Ещё раз» — не откладывать бота из‑за других в очереди, ровно столько мс на живого. */
  const forceBotAfterMsRef = useRef<number | null>(null);

  const clearDevBotMatchTimeout = useCallback(() => {
    if (devBotMatchTimeoutRef.current) {
      clearTimeout(devBotMatchTimeoutRef.current);
      devBotMatchTimeoutRef.current = null;
    }
  }, []);

  /** Последний успешный join — для автопродолжения поиска после отказа от матча. */
  const searchResumeSnapshotRef = useRef<SearchResumeSnapshot | null>(null);
  const resumeSearchLockRef = useRef(false);

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
    searchActiveRef.current = false;
    controlClockHandleRef.current?.cancel();
    clearDevBotMatchTimeout();
    forceBotAfterMsRef.current = null;
    setHumanSearchWindowMs(null);
    endQueueSubscription();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSearchStartedAt(0);
    void clearMatchmakingResume();
  }, [clearDevBotMatchTimeout, endQueueSubscription]);

  const stopSearchTimer = useCallback(() => {
    searchActiveRef.current = false;
    controlClockHandleRef.current?.cancel();
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
    startTimeRef.current = 0;
    searchActiveRef.current = false;
    controlClockHandleRef.current?.cancel();
  }, []);

  const completeMatchFound = useCallback((foundSessionId: string) => {
    clearDevBotMatchTimeout();
    forceBotAfterMsRef.current = null;
    setHumanSearchWindowMs(null);
    void clearMatchmakingResume();
    stopSearchTimer();
    endQueueSubscription();
    setSessionId(foundSessionId);
    setStatus('found');
  }, [clearDevBotMatchTimeout, endQueueSubscription, stopSearchTimer]);

  const controlExpandRange = useCallback(async (generation: number) => {
    if (generation !== searchGenerationRef.current || statusRef.current !== 'searching') return;
    rangeExpandedRef.current = true;
    const entry = entryRef.current;
    if (!entry) return;
    const next: MatchmakingEntry = {
      ...entry,
      searchRange: EXPANDED_RANGE,
      joinedAt: Date.now(),
    };
    entryRef.current = next;
    await joinMatchmakingQueue(next);
  }, []);

  const controlBotFallback = useCallback(async (generation: number): Promise<number | null> => {
    if (generation !== searchGenerationRef.current || statusRef.current !== 'searching') return null;
    const deferForLivePlayers =
      forceBotAfterMsRef.current == null &&
      !__DEV__ && BOT_FALLBACK_ENABLED && queueOthersCountRef.current > 0;
    if (deferForLivePlayers) {
      const span = BOT_OTHERS_RECHECK_MAX_MS - BOT_OTHERS_RECHECK_MIN_MS;
      return Date.now() + BOT_OTHERS_RECHECK_MIN_MS + Math.floor(Math.random() * span);
    }
    const uid = userIdRef.current;
    void clearMatchmakingResume();
    endQueueSubscription();
    if (uid) void leaveMatchmakingQueue(uid);
    forceBotAfterMsRef.current = null;
    setHumanSearchWindowMs(null);
    searchActiveRef.current = false;
    setSearchStartedAt(0);
    setSessionId(`bot_${uid}_${Date.now()}`);
    setStatus('found');
    return null;
  }, [endQueueSubscription]);

  const controlTimeout = useCallback(async (generation: number) => {
    if (generation !== searchGenerationRef.current || statusRef.current !== 'searching') return;
    const uid = userIdRef.current;
    endQueueSubscription();
    if (uid) void leaveMatchmakingQueue(uid);
    void clearMatchmakingResume();
    searchActiveRef.current = false;
    setSearchStartedAt(0);
    emitAppEvent('action_toast', { type: 'error', ...arenaToasts.searchTimeout });
    setStatus('idle');
  }, [endQueueSubscription]);

  const controlStop = useCallback(async (generation: number) => {
    if (generation !== searchGenerationRef.current) return;
    endQueueSubscription();
    void clearMatchmakingResume();
    searchActiveRef.current = false;
    setSearchStartedAt(0);
    setElapsedMs(0);
    setStatus('idle');
  }, [endQueueSubscription]);

  const controlClock = useArenaMatchmakingControlClock({
    enabled: ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK,
    readAuthoritativeState: readMatchmakingQueueState,
    onMatch: (foundSessionId, generation) => {
      if (generation === searchGenerationRef.current) completeMatchFound(foundSessionId);
    },
    onExpand: controlExpandRange,
    onBotFallback: controlBotFallback,
    onTimeout: controlTimeout,
    onStop: controlStop,
  });
  controlClockHandleRef.current = controlClock;

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
    options?: StartSearchOptions,
  ) => {
    // already searching — ignore duplicate calls
    if (searchActiveRef.current || timerRef.current !== null) return true;

    const uid = typeof userId === 'string' ? userId.trim() : '';
    if (!uid) {
      emitAppEvent('action_toast', {
        type: 'error',
        ...arenaToasts.queueJoinFailAuth,
      });
      return false;
    }

    searchActiveRef.current = true;
    const searchGeneration = searchGenerationRef.current + 1;
    searchGenerationRef.current = searchGeneration;

    const winMs = options?.humanSearchWindowMs;
    const hasHumanPriorityWindow = typeof winMs === 'number' && winMs > 0;
    forceBotAfterMsRef.current = hasHumanPriorityWindow ? winMs : null;
    setHumanSearchWindowMs(hasHumanPriorityWindow ? winMs : null);

    userIdRef.current        = uid;
    setIsMatchHandled(false);
    const now = Date.now();
    const preserveT0 = options?.preserveQueueStartedAtMs;
    const usePreserved =
      typeof preserveT0 === 'number' &&
      preserveT0 > 0 &&
      now - preserveT0 >= 0 &&
      now - preserveT0 < SEARCH_TIMEOUT_MS;
    const t0 = usePreserved ? preserveT0 : now;
    startTimeRef.current = t0;
    setSearchStartedAt(t0);
    const elapsedAlready = now - t0;
    rangeExpandedRef.current = elapsedAlready >= RANGE_EXPAND_MS;
    const initialSearchRange = rangeExpandedRef.current ? EXPANDED_RANGE : INITIAL_RANGE;
    const selectedBotDelay = !isArenaBotsEnabled()
      ? null
      : hasHumanPriorityWindow
        ? winMs
        : __DEV__
          ? DEV_QUICK_MATCH_MS
          : (BOT_FALLBACK_ENABLED ? pickBotFallbackDelayMs() : null);
    const preservedBotDeadline = options?.preserveBotFallbackDeadlineAt;
    // Returning from an unaccepted match keeps the original overall search timeout,
    // but the next bot wait must start now. Using the preserved t0 here makes the
    // freshly calculated deadline already expired and immediately shows the same
    // "match found" state again.
    const botFallbackBaseAt = usePreserved ? now : t0;
    const botFallbackDeadlineAt = preservedBotDeadline === null
      ? null
      : typeof preservedBotDeadline === 'number' && preservedBotDeadline > 0
        ? preservedBotDeadline
        : selectedBotDelay === null
          ? null
          : botFallbackBaseAt + selectedBotDelay;

    const rankIndex = rankToIndex(rankTier, rankLevel as (typeof RANK_LEVELS)[number]);
    const entry: MatchmakingEntry = {
      userId: uid, rankTier, size,
      joinedAt: usePreserved ? now : t0,
      rankIndex,
      searchRange: initialSearchRange,
      ...(expoPushToken ? { expoPushToken } : {}),
      ...(displayName ? { displayName } : {}),
    };
    entryRef.current = entry;

    setStatus('searching');
    setElapsedMs(Math.max(0, elapsedAlready));
    setSessionId(null);

    // Interval: elapsed + range expand + 10m timeout. При переході в `found` обов'язково гасимо інтервал
    // (інакше `timerRef !== null` і наступний `startSearching()` тихо no-op із return true — кнопка «Не реагує»).
    if (!ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK) {
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
        // Понятный, заметный сигнал «Соперник не найден, попробуй ещё раз» вместо
        // тихого info-тоста; возвращаем пользователя в idle (лобби показывает старт).
        emitAppEvent('action_toast', {
          type: 'error',
          ...arenaToasts.searchTimeout,
        });
        setStatus('idle');
      }
      }, ELAPSE_TICK_MS);
    }

    try {
      await joinMatchmakingQueue(entry);
      const resume: ResumePayload = {
        userId: uid,
        startedAt: t0,
        rankTier,
        rankLevel,
        size,
        ...(hasHumanPriorityWindow ? { humanSearchWindowMs: winMs } : {}),
        botFallbackDeadlineAt,
        ...(displayName ? { displayName } : {}),
      };
      await AsyncStorage.setItem(MATCHMAKING_RESUME_KEY, JSON.stringify(resume));
      searchResumeSnapshotRef.current = {
        userId: uid,
        rankTier,
        rankLevel,
        size,
        ...(displayName ? { displayName } : {}),
      };
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
      if (ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK) {
        void controlClock.notifyMatch(foundSessionId);
      } else {
        completeMatchFound(foundSessionId);
      }
    };

    unsubRef.current = subscribeMatchmakingQueue(uid, onMatchFound);
    unsubOthersRef.current?.();
    queueOthersCountRef.current = 0;
    unsubOthersRef.current = subscribeMatchmakingQueueOthersCount(
      () => ({ userId: uid, inSearchFlow: statusRef.current === 'searching' }),
      (n) => { queueOthersCountRef.current = n; },
    );

    if (ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK) {
      controlClock.start({
        generation: searchGeneration,
        userId: uid,
        originalStartedAt: t0,
        rangeDeadlineAt: t0 + RANGE_EXPAND_MS,
        botFallbackDeadlineAt,
        timeoutDeadlineAt: t0 + SEARCH_TIMEOUT_MS,
        rangeExpanded: rangeExpandedRef.current,
      });
      await controlClock.requestReconcile('post_join');
      return true;
    }

    const tryFireBotMatch = (): void => {
      devBotMatchTimeoutRef.current = null;
      if (statusRef.current !== 'searching') return;
      const deferForLivePlayers =
        forceBotAfterMsRef.current == null &&
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
      forceBotAfterMsRef.current = null;
      setHumanSearchWindowMs(null);
      stopSearchTimer();
      setSessionId(`bot_${uid}_${Date.now()}`);
      setStatus('found');
    };

    // «Ещё раз»: ровно humanSearchWindowMs на живого; иначе __DEV__ 3с или случайная задержка prod.
    // Админ-тумблер «Пульт» (arena_bots_enabled=false) полностью отключает бот-фолбэк
    // у всех живьём — тогда матчатся только реальные игроки, бот не подставляется.
    const botDelay = selectedBotDelay;
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
  }, [cleanup, clearDevBotMatchTimeout, completeMatchFound, controlClock, endQueueSubscription, stopSearchTimer]);

  const forgetSearchResumeSnapshot = useCallback(() => {
    searchResumeSnapshotRef.current = null;
    startTimeRef.current = 0;
  }, []);

  const resumeSearchAfterLobbyAbort = useCallback(async () => {
    if (resumeSearchLockRef.current) return;
    let snap: SearchResumeSnapshot | null = searchResumeSnapshotRef.current;
    if (!snap) {
      const e = entryRef.current;
      if (e) snap = buildResumeSnapshotFromEntry(e);
    }
    if (!snap) return;
    resumeSearchLockRef.current = true;
    try {
      const { userId: u, rankTier: rt, rankLevel: rl, size: sz, displayName: dn } = snap;
      setIsMatchHandled(false);
      setStatus('idle');
      setSessionId(null);
      const tPreserve = startTimeRef.current;
      const resumeOpts =
        tPreserve > 0 && Date.now() - tPreserve < SEARCH_TIMEOUT_MS
          ? { preserveQueueStartedAtMs: tPreserve }
          : undefined;
      await startSearching(u, rt, rl, sz, undefined, dn, resumeOpts);
    } finally {
      setTimeout(() => {
        resumeSearchLockRef.current = false;
      }, 700);
    }
  }, [startSearching]);

  /** После перезапуска приложения: очередь в Firestore ещё жива — поднимаем таймер и подписку. */
  useEffect(() => {
    if (IS_EXPO_GO) return;
    let cancelled = false;
    (async () => {
      try {
        if (searchActiveRef.current || timerRef.current !== null) return;
        const raw = await AsyncStorage.getItem(MATCHMAKING_RESUME_KEY);
        if (!raw || cancelled) return;
        let parsed: ResumePayload;
        try {
          parsed = JSON.parse(raw) as ResumePayload;
        } catch {
          await clearMatchmakingResume();
          return;
        }
        const {
          userId, startedAt, rankTier, rankLevel, size, displayName,
          humanSearchWindowMs: resumedHumanWindowMs,
          botFallbackDeadlineAt: resumedBotFallbackDeadlineAt,
        } = parsed;
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
          if (ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK) {
            userIdRef.current = userId;
            searchGenerationRef.current += 1;
            completeMatchFound(d.sessionId);
          } else {
            await clearMatchmakingResume();
          }
          return;
        }
        if (searchActiveRef.current || timerRef.current !== null) return;

        userIdRef.current = userId;
        const t0 = ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK
          ? startedAt
          : (typeof d.joinedAt === 'number' ? d.joinedAt : startedAt);
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
        searchResumeSnapshotRef.current = {
          userId,
          rankTier: (d.rankTier ?? rankTier) as RankTier,
          rankLevel,
          size: (d.size ?? size) as SessionSize,
          ...((d.displayName ?? displayName) ? { displayName: (d.displayName ?? displayName) as string } : {}),
        };

        if (ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK) {
          searchActiveRef.current = true;
          const generation = searchGenerationRef.current + 1;
          searchGenerationRef.current = generation;
          const hasResumedHumanWindow =
            typeof resumedHumanWindowMs === 'number' && resumedHumanWindowMs > 0;
          forceBotAfterMsRef.current = hasResumedHumanWindow ? resumedHumanWindowMs : null;
          setHumanSearchWindowMs(hasResumedHumanWindow ? resumedHumanWindowMs : null);
          const resumeBotDelay = !isArenaBotsEnabled()
            ? null
            : hasResumedHumanWindow
              ? resumedHumanWindowMs
              : __DEV__
                ? DEV_QUICK_MATCH_MS
                : (BOT_FALLBACK_ENABLED ? pickBotFallbackDelayMs() : null);
          const resumeBotDeadline = resumedBotFallbackDeadlineAt === null
            ? null
            : typeof resumedBotFallbackDeadlineAt === 'number' && resumedBotFallbackDeadlineAt > 0
              ? resumedBotFallbackDeadlineAt
              : resumeBotDelay === null
                ? null
                : t0 + resumeBotDelay;

          const onControlMatchFound = (foundSessionId: string) => {
            void controlClock.notifyMatch(foundSessionId);
          };
          unsubRef.current = subscribeMatchmakingQueue(userId, onControlMatchFound);
          unsubOthersRef.current?.();
          queueOthersCountRef.current = 0;
          unsubOthersRef.current = subscribeMatchmakingQueueOthersCount(
            () => ({ userId, inSearchFlow: statusRef.current === 'searching' }),
            (n) => { queueOthersCountRef.current = n; },
          );
          controlClock.start({
            generation,
            userId,
            originalStartedAt: t0,
            rangeDeadlineAt: t0 + RANGE_EXPAND_MS,
            botFallbackDeadlineAt: resumeBotDeadline,
            timeoutDeadlineAt: t0 + SEARCH_TIMEOUT_MS,
            rangeExpanded: rangeExpandedRef.current,
          });
          await controlClock.requestReconcile('resume');
          return;
        }

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
          forceBotAfterMsRef.current = null;
          setHumanSearchWindowMs(null);
          void clearMatchmakingResume();
          stopSearchTimer();
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
            forceBotAfterMsRef.current == null &&
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
          forceBotAfterMsRef.current = null;
          setHumanSearchWindowMs(null);
          stopSearchTimer();
          setSessionId(`bot_${userId}_${Date.now()}`);
          setStatus('found');
        };

        // Тот же админ-гейт, что и в основном пути (arena_bots_enabled=false → без ботов).
        const baseBotDelay = !isArenaBotsEnabled()
          ? null
          : __DEV__
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
    // Restore on mount; dependencies are stable callbacks/controller handles.
  }, [cleanup, clearDevBotMatchTimeout, completeMatchFound, controlClock, endQueueSubscription, stopSearchTimer]);

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

  // Единственный не-мемоизированный провайдер: раньше каждый рендер создавал новый
  // объект value → все потребители контекста перерисовывались зря. Все колбэки уже
  // стабильны (useCallback / setState-сеттеры), поэтому deps — только реактивные
  // значения. `userIdRef.current` меняется синхронно с setStatus/setSessionId, так
  // что status/sessionId в deps гарантируют пересчёт сразу после смены userId.
  const value = useMemo<MatchmakingContextValue>(() => ({
    status, sessionId,
    userId: userIdRef.current || null,
    elapsedMs,
    searchStartedAt,
    humanSearchWindowMs,
    startSearching, cancelSearching,
    isLobbyActive, setLobbyActive,
    markMatchHandled, isMatchHandled,
    stopSearchTimer,
    clearFoundMatch,
    updateQueueWithPushToken,
    showMatchFoundForTesterPreview,
    resumeSearchAfterLobbyAbort,
    forgetSearchResumeSnapshot,
  }), [
    status, sessionId, elapsedMs, searchStartedAt, humanSearchWindowMs,
    startSearching, cancelSearching, setLobbyActive, isLobbyActive,
    markMatchHandled, isMatchHandled, stopSearchTimer, clearFoundMatch,
    updateQueueWithPushToken, showMatchFoundForTesterPreview,
    resumeSearchAfterLobbyAbort, forgetSearchResumeSnapshot,
  ]);

  return (
    <MatchmakingCtx.Provider value={value}>
      {children}
    </MatchmakingCtx.Provider>
  );
}

export function useMatchmakingContext() {
  return useContext(MatchmakingCtx);
}
