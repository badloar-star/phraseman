export type HiddenTabRedirectInput = {
  rootNavigationReady: boolean;
  routeIsHidden: boolean;
};

/**
 * A tab layout can discover that its current route is no longer available after
 * a study-target change.  It must not navigate until Expo Router's root stack
 * has mounted: this layout can itself be the first committed route.
 */
export function planHiddenTabRedirect({
  rootNavigationReady,
  routeIsHidden,
}: HiddenTabRedirectInput): '/(tabs)/home' | null {
  return rootNavigationReady && routeIsHidden ? '/(tabs)/home' : null;
}
