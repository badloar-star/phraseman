type ExpoUpdatesModule = {
  isEnabled?: boolean;
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean; isRollBackToEmbedded?: boolean }>;
  fetchUpdateAsync: () => Promise<{ isNew: boolean; isRollBackToEmbedded?: boolean }>;
};

const UPDATE_CHECK_TIMEOUT_MS = 4_000;
const UPDATE_FETCH_TIMEOUT_MS = 15_000;

let prefetchStarted = false;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ms);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function prefetchEasUpdateAfterStartup(
  updatesModule?: ExpoUpdatesModule,
): Promise<boolean> {
  if (prefetchStarted || __DEV__) return false;
  prefetchStarted = true;

  try {
    const Updates = updatesModule ?? await import('expo-updates');
    if (!Updates.isEnabled) return false;

    const check = await withTimeout(Updates.checkForUpdateAsync(), UPDATE_CHECK_TIMEOUT_MS);
    if (!check?.isAvailable || check.isRollBackToEmbedded) return false;

    const fetched = await withTimeout(Updates.fetchUpdateAsync(), UPDATE_FETCH_TIMEOUT_MS);
    return fetched?.isNew === true || fetched?.isRollBackToEmbedded === true;
  } catch {
    return false;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
