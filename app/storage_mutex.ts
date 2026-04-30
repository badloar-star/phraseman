let _locked = false;
const _queue: (() => void)[] = [];

export function acquireStorageLock(): Promise<void> {
  return new Promise(resolve => {
    if (!_locked) { _locked = true; resolve(); }
    else _queue.push(resolve);
  });
}

export function releaseStorageLock(): void {
  const next = _queue.shift();
  if (next) next();
  else _locked = false;
}

export async function withStorageLock<T>(fn: () => Promise<T>): Promise<T> {
  await acquireStorageLock();
  try { return await fn(); }
  finally { releaseStorageLock(); }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
