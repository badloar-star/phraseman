export const HOME_BACK_FALLBACK = '/(tabs)/home';
const BACK_NOOP_FALLBACK_DELAY_MS = 220;

type SafeBackRouter = {
  canGoBack?: () => boolean;
  back: () => void;
  replace: (fallback: any) => void;
};

let rememberedNavigationPath: string | null = null;
let rememberedNavigationVersion = 0;
let pendingNoopBackTimer: ReturnType<typeof setTimeout> | null = null;

function clearPendingNoopBackTimer(): void {
  if (pendingNoopBackTimer) {
    clearTimeout(pendingNoopBackTimer);
    pendingNoopBackTimer = null;
  }
}

export function rememberNavigationPath(path: string | null | undefined): void {
  const nextPath = path && path.length > 0 ? path : null;
  if (nextPath === rememberedNavigationPath) {
    return;
  }

  rememberedNavigationPath = nextPath;
  rememberedNavigationVersion += 1;
  clearPendingNoopBackTimer();
}

export function safeRouterBack(
  router: SafeBackRouter,
  fallback: any = HOME_BACK_FALLBACK,
): void {
  clearPendingNoopBackTimer();
  const pathBeforeBack = rememberedNavigationPath;
  const versionBeforeBack = rememberedNavigationVersion;

  try {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      pendingNoopBackTimer = setTimeout(() => {
        pendingNoopBackTimer = null;
        if (
          rememberedNavigationPath === pathBeforeBack &&
          rememberedNavigationVersion === versionBeforeBack
        ) {
          router.replace(fallback);
        }
      }, BACK_NOOP_FALLBACK_DELAY_MS);
      return;
    }
  } catch {
    // Fall through to the deterministic route below.
  }

  router.replace(fallback);
}
