export const LEVEL_SPIN_ACCELERATION_MS = 350;
export const LEVEL_SPIN_CRUISE_READY_MS = 1_600;
export const LEVEL_SPIN_DECELERATION_MS = 1_200;
export const LEVEL_SPIN_SETTLE_MS = 200;
export const LEVEL_SPIN_CYCLE_MS = 1_250;
export const LEVEL_SPIN_CYCLE_ROWS = 15;
export const LEVEL_SPIN_ACCELERATION_ROWS = 4;
export const LEVEL_SPIN_ACCELERATION_BEZIER_X2 = 0.75;
export const LEVEL_SPIN_ACCELERATION_BEZIER_Y2 = 0.7375;

export function levelSpinCruiseRowsPerSecond(): number {
  return LEVEL_SPIN_CYCLE_ROWS / (LEVEL_SPIN_CYCLE_MS / 1_000);
}

export function levelSpinAccelerationTerminalRowsPerSecond(): number {
  const averageRowsPerSecond = LEVEL_SPIN_ACCELERATION_ROWS / (LEVEL_SPIN_ACCELERATION_MS / 1_000);
  const terminalSlope = (1 - LEVEL_SPIN_ACCELERATION_BEZIER_Y2)
    / (1 - LEVEL_SPIN_ACCELERATION_BEZIER_X2);
  return averageRowsPerSecond * terminalSlope;
}

type LandingPlanInput = {
  liveOffset: number;
  selectorTop: number;
  rowPitch: number;
  streamLength: number;
};

export type LevelSpinLandingPlan = {
  landingIndex: number;
  targetOffset: number;
  cruiseVelocityPxPerSecond: number;
  initialVelocityPxPerSecond: number;
};

export type LevelSpinOvershootPlan = {
  /** The reel travels slightly past the winning card before settling back onto it. */
  overshootOffset: number;
  /** The exact selector-aligned offset; this is always the terminal frame. */
  rollbackOffset: number;
  overshootPx: number;
};

export function createLevelSpinOvershootPlan(input: {
  targetOffset: number;
  rowPitch: number;
}): LevelSpinOvershootPlan {
  if (!Number.isFinite(input.targetOffset) || !Number.isFinite(input.rowPitch) || input.rowPitch <= 0) {
    throw new Error('level_spin_invalid_overshoot_geometry');
  }
  const overshootPx = Math.max(8, Math.min(14, input.rowPitch * 0.1));
  return {
    overshootOffset: input.targetOffset - overshootPx,
    rollbackOffset: input.targetOffset,
    overshootPx,
  };
}

/**
 * Selects the authoritative row from the live, cancelled reel position.
 * The landing easing starts with unit slope, so a one-deceleration-duration
 * runway preserves the incoming cruise velocity within row-rounding error.
 */
export function createLevelSpinLandingPlan(input: LandingPlanInput): LevelSpinLandingPlan {
  const { liveOffset, selectorTop, rowPitch, streamLength } = input;
  if (![liveOffset, selectorTop, rowPitch, streamLength].every(Number.isFinite)
    || rowPitch <= 0
    || !Number.isInteger(streamLength)
    || streamLength < 4) {
    throw new Error('level_spin_invalid_motion_geometry');
  }
  const currentRow = (selectorTop - liveOffset) / rowPitch;
  const cruiseRowsPerSecond = levelSpinCruiseRowsPerSecond();
  const runwayRows = cruiseRowsPerSecond * (LEVEL_SPIN_DECELERATION_MS / 1_000);
  const landingIndex = Math.ceil(currentRow + runwayRows);
  const maximumLandingIndex = streamLength - 3;
  if (landingIndex <= currentRow || landingIndex > maximumLandingIndex) {
    throw new Error('level_spin_no_forward_landing_row');
  }
  const targetOffset = selectorTop - landingIndex * rowPitch;
  const cruiseVelocityPxPerSecond = -cruiseRowsPerSecond * rowPitch;
  const initialVelocityPxPerSecond = (targetOffset - liveOffset)
    / (LEVEL_SPIN_DECELERATION_MS / 1_000);
  return { landingIndex, targetOffset, cruiseVelocityPxPerSecond, initialVelocityPxPerSecond };
}

export function levelSpinReceiptWaitMs(spinStartedAtMs: number, nowMs: number): number {
  if (!Number.isFinite(spinStartedAtMs) || !Number.isFinite(nowMs)) {
    throw new Error('level_spin_invalid_motion_clock');
  }
  return Math.max(0, LEVEL_SPIN_CRUISE_READY_MS - Math.max(0, nowMs - spinStartedAtMs));
}
