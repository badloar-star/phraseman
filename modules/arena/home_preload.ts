/** Share only pending reads; completed responses must not retain live queue/match links. */
export function createArenaHomeRead<T>() {
  let pending: { scope: string; promise: Promise<T> } | undefined;
  return (scope: string, read: () => Promise<T>): Promise<T> => {
    if (pending?.scope === scope) return pending.promise;
    const promise = read();
    const entry = { scope, promise };
    pending = entry;
    const clear = () => { if (pending === entry) pending = undefined; };
    void promise.then(clear, clear);
    return promise;
  };
}

/** Start independent resources immediately; a slow extra mode cannot hold up the hub. */
export async function preloadArenaHome(options: {
  loadDisk: () => Promise<unknown>;
  fetchHome: () => Promise<unknown>;
  fetchExpansion: () => Promise<unknown>;
  isCurrent: () => boolean;
  remember: (value: { home?: unknown; expansion?: unknown }) => void;
}): Promise<void> {
  if (!options.isCurrent()) return;
  await Promise.allSettled([
    options.loadDisk(),
    options.fetchHome().then(home => {
      if (options.isCurrent()) options.remember({ home });
    }),
    options.fetchExpansion().then(expansion => {
      if (options.isCurrent()) options.remember({ expansion });
    }),
  ]);
}
