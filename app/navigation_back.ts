export const HOME_BACK_FALLBACK = '/(tabs)/home';

type SafeBackRouter = {
  canGoBack?: () => boolean;
  back: () => void;
  replace: (fallback: any) => void;
};

let rememberedNavigationPath: string | null = null;
let previousNavigationPath: string | null = null;
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

  previousNavigationPath = rememberedNavigationPath;
  rememberedNavigationPath = nextPath;
  rememberedNavigationVersion += 1;
  clearPendingNoopBackTimer();
}

export function safeRouterBack(
  router: SafeBackRouter,
  fallback: any = HOME_BACK_FALLBACK,
): void {
  clearPendingNoopBackTimer();
  // Native-stack router.back() hard-crashes the app on Android/Fabric during the
  // Back teardown (see screenOptions note in app/_layout.tsx — the stack already
  // forces animation:'none' to work around that native fault). Going back through
  // router.back() re-exposes that crash on the universal "exit from any section"
  // path. Since the stack has no animation, a deterministic replace to the previous
  // (or fallback) route is visually identical and never triggers the native crash.
  const target =
    previousNavigationPath !== null && previousNavigationPath !== rememberedNavigationPath
      ? previousNavigationPath
      : fallback;

  router.replace(target);
}
