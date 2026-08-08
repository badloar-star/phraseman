import {
  createLevelSpinLandingPlan,
  createLevelSpinOvershootPlan,
  levelSpinAccelerationTerminalRowsPerSecond,
  levelSpinCruiseRowsPerSecond,
  levelSpinReceiptWaitMs,
} from '../app/level_reward_spin_motion';

describe('level reward spin motion plan', () => {
  test('an early receipt waits for cruise-ready and lands strictly ahead without reversing', () => {
    const rowPitch = 118;
    const selectorTop = 250;
    const liveOffset = selectorTop - 12.25 * rowPitch;
    const plan = createLevelSpinLandingPlan({
      liveOffset,
      selectorTop,
      rowPitch,
      streamLength: 45,
    });

    expect(levelSpinReceiptWaitMs(0, 500)).toBe(1_100);
    expect(plan.landingIndex).toBeGreaterThan(12.25);
    expect(plan.targetOffset).toBeLessThan(liveOffset);
    expect(plan.initialVelocityPxPerSecond).toBeLessThan(0);
    expect(Math.abs(plan.initialVelocityPxPerSecond - plan.cruiseVelocityPxPerSecond))
      .toBeLessThan(rowPitch / 1.2);
  });

  test('a late receipt begins immediately and still selects an in-range forward row', () => {
    const plan = createLevelSpinLandingPlan({
      liveOffset: -1_900,
      selectorTop: 210,
      rowPitch: 106,
      streamLength: 45,
    });

    expect(levelSpinReceiptWaitMs(0, 2_100)).toBe(0);
    expect(plan.landingIndex).toBeLessThanOrEqual(42);
    expect(plan.targetOffset).toBeLessThan(-1_900);
  });

  test('acceleration hands off to cruise without a velocity jump', () => {
    expect(levelSpinAccelerationTerminalRowsPerSecond())
      .toBeCloseTo(levelSpinCruiseRowsPerSecond(), 6);
  });

  test('fails closed when the bounded stream has no forward landing row', () => {
    expect(() => createLevelSpinLandingPlan({
      liveOffset: -4_500,
      selectorTop: 200,
      rowPitch: 100,
      streamLength: 45,
    })).toThrow('level_spin_no_forward_landing_row');
  });

  test('lands on the winning row with a short forward overshoot then an exact rollback', () => {
    const targetOffset = -2_412;
    const plan = createLevelSpinOvershootPlan({ targetOffset, rowPitch: 118 });

    expect(plan.overshootOffset).toBeLessThan(targetOffset);
    expect(plan.rollbackOffset).toBe(targetOffset);
    expect(plan.overshootPx).toBeGreaterThanOrEqual(8);
    expect(plan.overshootPx).toBeLessThanOrEqual(14);
  });
});
