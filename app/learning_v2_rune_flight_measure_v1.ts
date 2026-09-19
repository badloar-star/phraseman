export interface LearningV2RuneMeasureNodeV1 {
  measureInWindow(
    callback: (x: number, y: number, width: number, height: number) => void,
  ): void;
}

export interface LearningV2RuneFlightPointsV1 {
  readonly from: Readonly<{ x: number; y: number }>;
  readonly to: Readonly<{ x: number; y: number }>;
}

const validRect = (rect: readonly number[]): boolean =>
  rect.every(Number.isFinite) && Math.min(rect[2] ?? 0, rect[3] ?? 0) > 0;

/**
 * Native layout can lag one or two frames behind a correct answer. Keep the
 * durable award immediate, but retry the decorative flight for a bounded
 * number of frames instead of silently dropping it.
 */
export function measureLearningV2RuneFlightWithRetryV1(input: Readonly<{
  getOrigin: () => LearningV2RuneMeasureNodeV1 | null;
  getCounter: () => LearningV2RuneMeasureNodeV1 | null;
  schedule: (callback: () => void) => void;
  shouldContinue: () => boolean;
  onMeasured: (points: LearningV2RuneFlightPointsV1) => void;
  maxAttempts?: number;
}>): void {
  const maxAttempts = Math.max(1, Math.floor(input.maxAttempts ?? 4));

  const attempt = (attemptNumber: number): void => {
    if (!input.shouldContinue()) return;
    const origin = input.getOrigin();
    const counter = input.getCounter();
    const retry = () => {
      if (attemptNumber >= maxAttempts || !input.shouldContinue()) return;
      input.schedule(() => attempt(attemptNumber + 1));
    };
    if (!origin || !counter) {
      retry();
      return;
    }
    origin.measureInWindow((fromX, fromY, fromWidth, fromHeight) => {
      if (!input.shouldContinue()) return;
      counter.measureInWindow((toX, toY, toWidth, toHeight) => {
        if (!input.shouldContinue()) return;
        const from = [fromX, fromY, fromWidth, fromHeight] as const;
        const to = [toX, toY, toWidth, toHeight] as const;
        if (!validRect(from) || !validRect(to)) {
          retry();
          return;
        }
        input.onMeasured({
          from: { x: fromX + fromWidth / 2, y: fromY + fromHeight / 2 },
          to: { x: toX + toWidth / 2, y: toY + toHeight / 2 },
        });
      });
    });
  };

  attempt(1);
}
