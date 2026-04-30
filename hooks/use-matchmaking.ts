import { useState, useEffect, useRef, useCallback } from 'react';
import {
  joinMatchmakingQueue,
  leaveMatchmakingQueue,
  subscribeMatchmakingQueue,
} from '../app/services/arena_db';
import { MatchmakingEntry, RankTier, SessionSize } from '../app/types/arena';

export type MatchmakingStatus =
  | 'idle'
  | 'searching'
  | 'found'
  | 'timeout'
  | 'error';

interface UseMatchmakingOptions {
  userId: string;
  rankTier: RankTier;
  size: SessionSize;
  timeoutMs?: number;
}

interface UseMatchmakingResult {
  status: MatchmakingStatus;
  sessionId: string | null;
  elapsedMs: number;
  startSearching: () => Promise<void>;
  cancelSearching: () => Promise<void>;
}

// TEMPORARY: 3s in dev for quick bot testing. Remove __DEV__ branch before launch.
const DEFAULT_TIMEOUT_MS = __DEV__ ? 3_000 : 10 * 60 * 1000;

export function useMatchmaking({
  userId,
  rankTier,
  size,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseMatchmakingOptions): UseMatchmakingResult {
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startSearching = useCallback(async () => {
    if (status === 'searching') return;

    setStatus('searching');
    setElapsedMs(0);
    setSessionId(null);
    startTimeRef.current = Date.now();

    const entry: MatchmakingEntry = {
      userId,
      rankTier,
      size,
      joinedAt: startTimeRef.current,
    };

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(elapsed);

      if (elapsed >= timeoutMs) {
        clearInterval(timerRef.current!);
        timerRef.current = null;

        // TEMPORARY: dev-only test bot for matchmaking testing. Remove before production launch.
        if (__DEV__) {
          const devSessionId = `dev_test_session_${Date.now()}`;
          setSessionId(devSessionId);
          setStatus('found');
        } else {
          setStatus('timeout');
        }
      }
    }, 100);

    try {
      await joinMatchmakingQueue(entry);
    } catch {
      // Firebase error — timer already running, UI stays responsive
    }

    unsubscribeRef.current = subscribeMatchmakingQueue(userId, (foundSessionId) => {
      cleanup();
      setSessionId(foundSessionId);
      setStatus('found');
    });
  }, [userId, rankTier, size, timeoutMs, status, cleanup]);

  const cancelSearching = useCallback(async () => {
    cleanup();
    await leaveMatchmakingQueue(userId);
    setStatus('idle');
    setElapsedMs(0);
  }, [userId, cleanup]);

  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    return () => {
      cleanup();
      if (statusRef.current === 'searching') {
        leaveMatchmakingQueue(userId).catch(() => {});
      }
    };
  }, [cleanup]);

  return { status, sessionId, elapsedMs, startSearching, cancelSearching };
}
