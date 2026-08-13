export type CompassSheetSource = 'home_control' | 'auto' | 'expanded_surface';

export type CompassSheetLifecycle =
  | Readonly<{ phase: 'idle' }>
  | Readonly<{ phase: 'open'; source: CompassSheetSource }>
  | Readonly<{ phase: 'closing'; source: CompassSheetSource; closeId: number }>;

export const IDLE_COMPASS_SHEET: CompassSheetLifecycle = Object.freeze({ phase: 'idle' });

export function openCompassSheet(source: CompassSheetSource): CompassSheetLifecycle {
  return { phase: 'open', source };
}

export function beginCompassSheetClose(
  current: CompassSheetLifecycle,
  closeId: number,
): CompassSheetLifecycle {
  if (current.phase !== 'open' || !Number.isSafeInteger(closeId) || closeId < 1) return current;
  return { phase: 'closing', source: current.source, closeId };
}

export function completeCompassSheetClose(
  current: CompassSheetLifecycle,
  closeId: number,
): Readonly<{ accepted: boolean; next: CompassSheetLifecycle }> {
  if (current.phase !== 'closing' || current.closeId !== closeId) {
    return { accepted: false, next: current };
  }
  return { accepted: true, next: IDLE_COMPASS_SHEET };
}

export default function __RouteShim() { return null; }
