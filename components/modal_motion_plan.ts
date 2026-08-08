export type ModalMotionPlan = { openMs: number; closeMs: number; translateY: number; scaleFrom: number };

export function getModalMotionPlan(reduceMotion: boolean): ModalMotionPlan {
  return reduceMotion
    ? { openMs: 0, closeMs: 0, translateY: 0, scaleFrom: 1 }
    : { openMs: 280, closeMs: 180, translateY: 18, scaleFrom: 0.985 };
}
