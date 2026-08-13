export type CompassSurfaceState = 'closed' | 'compact' | 'expanded';

export type CompassSurfaceEvent =
  | { type: 'open' }
  | { type: 'expand' }
  | { type: 'collapse' }
  | { type: 'back' }
  | { type: 'dismiss' };

export const COMPASS_SURFACE_RELEASE = {
  projectionSeconds: 0.16,
  dismissVelocityY: 900,
  expandVelocityY: -650,
  dismissDistancePastCompact: 88,
} as const;

export type CompassSurfaceReleaseInput = Readonly<{
  translateY: number;
  velocityY: number;
  expandedY: number;
  compactY: number;
}>;

export type CompassVisualCloseState = Readonly<{
  phase: 'idle' | 'open' | 'closing';
  closeId: number | null;
}>;

/** A visual close callback may mutate the sheet only while its exact request is current. */
export function canAcknowledgeCompassVisualClose(
  current: CompassVisualCloseState,
  callbackCloseId: number,
): boolean {
  return current.phase === 'closing' && current.closeId === callbackCloseId;
}

/**
 * The compact sheet is translated down while its ScrollView keeps expanded geometry.
 * This spacer makes the off-screen part scrollable, including with large text.
 */
export function compassCompactScrollSpacer(
  expanded: boolean,
  expandedY: number,
  compactY: number,
): number {
  return expanded ? 0 : Math.max(0, compactY - expandedY);
}

/**
 * Pure state transition shared by hardware Back, explicit controls and dismiss.
 * Invalid transitions intentionally keep the current detent.
 */
export function reduceCompassSurface(
  state: CompassSurfaceState,
  event: CompassSurfaceEvent,
): CompassSurfaceState {
  switch (event.type) {
    case 'open':
      return state === 'closed' ? 'compact' : state;
    case 'expand':
      return state === 'compact' ? 'expanded' : state;
    case 'collapse':
      return state === 'expanded' ? 'compact' : state;
    case 'back':
      if (state === 'expanded') return 'compact';
      if (state === 'compact') return 'closed';
      return 'closed';
    case 'dismiss':
      return 'closed';
  }
}

/**
 * Selects the destination detent after a drag release. Positive Y is downward.
 * Threshold comparisons deliberately match the current sheet behavior exactly.
 */
export function resolveCompassSurfaceRelease({
  translateY,
  velocityY,
  expandedY,
  compactY,
}: CompassSurfaceReleaseInput): CompassSurfaceState {
  'worklet';

  const projectedY = translateY + velocityY * COMPASS_SURFACE_RELEASE.projectionSeconds;

  if (
    velocityY > COMPASS_SURFACE_RELEASE.dismissVelocityY
    || projectedY > compactY + COMPASS_SURFACE_RELEASE.dismissDistancePastCompact
  ) {
    return 'closed';
  }

  if (
    velocityY < COMPASS_SURFACE_RELEASE.expandVelocityY
    || projectedY < (expandedY + compactY) / 2
  ) {
    return 'expanded';
  }

  return 'compact';
}

export default function __RouteShim() { return null; }
