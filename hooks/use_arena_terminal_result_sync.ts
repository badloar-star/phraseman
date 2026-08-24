import { useEffect, useRef, useState } from 'react';

const TERMINAL_SYNC_RETRY_DELAYS_MS = [750, 1_500, 3_000] as const;

/**
 * One-shot terminal sync whose lifetime is independent from its marker render.
 *
 * `onRequested` normally changes reducer state immediately. That rerender must
 * not cancel the network promise it just created. Only component unmount or an
 * explicit match/account scope change makes the eventual response stale.
 */
export function useArenaTerminalResultSync<Response>(input: Readonly<{
  active: boolean;
  matchId: string | null;
  accountKey: string;
  terminalSyncVersion: number | null;
  request(matchId: string, version: number): Promise<Response>;
  onRequested(version: number): void;
  onResolved(response: Response): void;
}>): void {
  const {
    active,
    matchId,
    accountKey,
    terminalSyncVersion,
    request,
    onRequested,
    onResolved,
  } = input;
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const scopeKey = `${accountKey}:${matchId ?? ''}`;
  const currentScopeRef = useRef(scopeKey);
  currentScopeRef.current = scopeKey;
  const requestedRef = useRef(new Set<string>());
  const retryCountsRef = useRef(new Map<string, number>());
  const exhaustedRef = useRef(new Set<string>());
  const pendingRetryRef = useRef<Readonly<{ scopeKey: string; version: number }> | null>(null);
  const retryTimersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [retryEpoch, setRetryEpoch] = useState(0);
  const previousActiveRef = useRef(active);

  useEffect(() => () => {
    retryTimersRef.current.forEach(clearTimeout);
    retryTimersRef.current.clear();
  }, []);

  useEffect(() => {
    const wasActive = previousActiveRef.current;
    previousActiveRef.current = active;
    if (!active || wasActive) return;
    const pendingRetry = pendingRetryRef.current;
    if (!pendingRetry || pendingRetry.scopeKey !== scopeKey) return;
    const requestKey = `${scopeKey}:${pendingRetry.version}`;
    exhaustedRef.current.delete(requestKey);
    retryCountsRef.current.delete(requestKey);
    requestedRef.current.delete(requestKey);
  }, [active, scopeKey]);

  useEffect(() => {
    const pendingRetry = pendingRetryRef.current;
    const version = terminalSyncVersion ?? (
      pendingRetry?.scopeKey === scopeKey ? pendingRetry.version : null
    );
    if (!active || !matchId || version === null) return;
    const requestKey = `${scopeKey}:${version}`;
    if (exhaustedRef.current.has(requestKey)) return;
    if (requestedRef.current.has(requestKey)) return;
    requestedRef.current.add(requestKey);
    pendingRetryRef.current = { scopeKey, version };

    const capturedScope = scopeKey;
    const capturedScopeIsCurrent = () => mountedRef.current
      && currentScopeRef.current === capturedScope;
    const scheduleRetry = () => {
      if (!capturedScopeIsCurrent()) return;
      requestedRef.current.delete(requestKey);
      const attempt = retryCountsRef.current.get(requestKey) ?? 0;
      const delayMs = TERMINAL_SYNC_RETRY_DELAYS_MS[attempt];
      if (delayMs === undefined) {
        exhaustedRef.current.add(requestKey);
        return;
      }
      retryCountsRef.current.set(requestKey, attempt + 1);
      const timer = setTimeout(() => {
        retryTimersRef.current.delete(timer);
        const pendingRetry = pendingRetryRef.current;
        if (!capturedScopeIsCurrent()
          || pendingRetry?.scopeKey !== capturedScope
          || pendingRetry.version !== version) return;
        setRetryEpoch((value) => value + 1);
      }, delayMs);
      retryTimersRef.current.add(timer);
    };

    onRequested(version);
    let response: Promise<Response>;
    try {
      response = request(matchId, version);
    } catch {
      scheduleRetry();
      return;
    }
    void response.then((value) => {
      if (!mountedRef.current || currentScopeRef.current !== capturedScope) return;
      retryCountsRef.current.delete(requestKey);
      exhaustedRef.current.delete(requestKey);
      const pending = pendingRetryRef.current;
      if (pending?.scopeKey === scopeKey && pending.version === version) {
        pendingRetryRef.current = null;
      }
      onResolved(value);
    }).catch(scheduleRetry);
    // Deliberately no cleanup: marker state changes terminalSyncVersion to null.
    // mountedRef/currentScopeRef are the only cancellation boundaries.
  }, [
    active,
    matchId,
    onRequested,
    onResolved,
    request,
    retryEpoch,
    terminalSyncVersion,
    scopeKey,
  ]);
}
