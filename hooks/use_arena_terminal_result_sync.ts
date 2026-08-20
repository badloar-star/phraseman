import { useEffect, useRef } from 'react';

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

  const scopeKey = `${active ? 'active' : 'inactive'}:${accountKey}:${matchId ?? ''}`;
  const currentScopeRef = useRef(scopeKey);
  currentScopeRef.current = scopeKey;
  const requestedRef = useRef(new Set<string>());

  useEffect(() => {
    const version = terminalSyncVersion;
    if (!active || !matchId || version === null) return;
    const requestKey = `${scopeKey}:${version}`;
    if (requestedRef.current.has(requestKey)) return;
    requestedRef.current.add(requestKey);

    const capturedScope = scopeKey;
    onRequested(version);
    let response: Promise<Response>;
    try {
      response = request(matchId, version);
    } catch {
      return;
    }
    void response.then((value) => {
      if (!mountedRef.current || currentScopeRef.current !== capturedScope) return;
      onResolved(value);
    }).catch(() => {});
    // Deliberately no cleanup: marker state changes terminalSyncVersion to null.
    // mountedRef/currentScopeRef are the only cancellation boundaries.
  }, [
    active,
    matchId,
    onRequested,
    onResolved,
    request,
    terminalSyncVersion,
    scopeKey,
  ]);
}
