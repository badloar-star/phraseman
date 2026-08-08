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
        try { cleanup(); } catch {}
        return false;
      }
      cleanups.add(cleanup);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const cleanup of cleanups) {
        try { cleanup(); } catch {}
      }
      cleanups.clear();
    },
    isDisposed: () => disposed,
  };
}
