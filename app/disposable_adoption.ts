import { DebugLogger } from './debug-logger';
export type DisposableAdoption = {
  adopt: (cleanup: () => void) => boolean;
  dispose: () => void;
  isDisposed: () => boolean;
};

/** Owns cleanups that may be created after an async boundary. */
export function createDisposableAdoption(): DisposableAdoption {
  let disposed = false;
  const cleanups = new Set<() => void>();
  return {
    adopt(cleanup) {
      if (disposed) {
        try { cleanup(); } catch (e) {
      DebugLogger.error('disposable_adoption:adopt', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        return false;
      }
      cleanups.add(cleanup);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const cleanup of cleanups) {
        try { cleanup(); } catch (e) {
      DebugLogger.error('disposable_adoption:dispose', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      }
      cleanups.clear();
    },
    isDisposed: () => disposed,
  };
}
