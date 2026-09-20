import { resolveArenaStudyTarget, type ArenaStudyTarget } from '../modules/arena/target_registry';

/**
 * Arena routes are target-bound capabilities. A missing route target or a
 * target changed in Settings while the route is mounted invalidates the
 * screen instead of silently switching its requests to another language.
 */
export function arenaRouteStudyTarget(
  routeValue: unknown,
  currentTarget: unknown,
): ArenaStudyTarget | null {
  const routeTarget = resolveArenaStudyTarget(routeValue);
  const activeTarget = resolveArenaStudyTarget(currentTarget);
  return routeTarget && routeTarget === activeTarget ? routeTarget : null;
}

/** Stable prefix used before a random UUID so identities cannot cross targets. */
export function arenaTargetRequestIdPrefix(prefix: string, studyTarget: ArenaStudyTarget): string {
  return `${prefix}_${studyTarget}`;
}

export function arenaRouteParams(studyTarget: ArenaStudyTarget): Readonly<{ studyTarget: ArenaStudyTarget }> {
  return { studyTarget };
}

/* expo-router: helper, not a screen */
export default function __ArenaRouteTargetShim() {
  return null;
}
