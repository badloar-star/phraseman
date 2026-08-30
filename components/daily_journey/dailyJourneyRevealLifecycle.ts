type DailyJourneyRevealTarget = Readonly<{ x: number; y: number }>;

export type DailyJourneyRevealLifecycleStart = Readonly<{
  identity: string;
  targetPoint: DailyJourneyRevealTarget | null;
  reducedMotion: boolean;
  onIntro: (token: number) => void;
  onFlight: (snapshot: Readonly<{ targetPoint: DailyJourneyRevealTarget | null; reducedMotion: boolean }>, token: number) => void;
  onDelivered: () => void;
}>;

/**
 * Owns the one-way delivery ratchet.  React may rerender a visible Modal for
 * layout/callback changes; only a new composite occurrence identity may start
 * another choreography run.
 */
export class DailyJourneyRevealLifecycle {
  private current: { token: number; identity: string; phase: 'intro' | 'flight' | 'done'; start: DailyJourneyRevealLifecycleStart } | null = null;
  private nextToken = 0;

  begin(start: DailyJourneyRevealLifecycleStart): number {
    if (this.current?.identity === start.identity) return this.current.token;
    const token = ++this.nextToken;
    this.current = { token, identity: start.identity, phase: 'intro', start };
    start.onIntro(token);
    return token;
  }

  isCurrent(token: number): boolean { return this.current?.token === token; }

  skip(token: number): void { this.startFlight(token); }
  back(token: number): void { this.startFlight(token); }
  escape(token: number): void { this.startFlight(token); }

  startFlight(token: number): void {
    const current = this.current;
    if (!current || current.token !== token || current.phase !== 'intro') return;
    current.phase = 'flight';
    current.start.onFlight({ targetPoint: current.start.targetPoint, reducedMotion: current.start.reducedMotion }, token);
  }

  completeFlight(token: number, finished: boolean): void {
    const current = this.current;
    if (!finished || !current || current.token !== token || current.phase !== 'flight') return;
    current.phase = 'done';
    current.start.onDelivered();
  }

  dispose(): void {
    this.current = null;
    this.nextToken += 1;
  }
}
