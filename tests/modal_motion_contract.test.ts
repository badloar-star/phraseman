import { getModalMotionPlan } from '../components/modal_motion_plan';

describe('modal motion plan', () => {
  test('opens gently and closes faster using only a small transform', () => {
    const plan = getModalMotionPlan(false);
    expect(plan.openMs).toBeGreaterThan(plan.closeMs);
    expect(plan.openMs).toBeGreaterThanOrEqual(240);
    expect(plan.openMs).toBeLessThanOrEqual(320);
    expect(plan.translateY).toBeLessThanOrEqual(20);
  });

  test('reduced motion is immediate and stationary', () => {
    expect(getModalMotionPlan(true)).toEqual({ openMs: 0, closeMs: 0, translateY: 0, scaleFrom: 1 });
  });
});
