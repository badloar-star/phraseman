import type { AppStateStatus } from 'react-native';
import fs from 'node:fs';
import path from 'node:path';
import { createLearningV2CompletionBackgroundScheduler } from
  '../app/learning_v2_completion_background_scheduler';

jest.mock('../app/learning_v2_required_session_completion_sync', () => ({
  attemptPendingRequiredSessionCompletions: jest.fn(async () => ({ processed: 0, disposition: 'drained' })),
}));
jest.mock('../app/learning_v2_completion_credential_admission', () => ({
  attemptLearningV2CompletionCredentialAdmission: jest.fn(async () => 'ready'),
}));

const SCOPE = 'a'.repeat(64);
const createRuntime = (
  outcomes: any[] = [{ processed: 0, disposition: 'drained' }],
  initialCursor: any = null,
  credentialOutcomes: any[] = ['ready'],
) => {
  let appState: AppStateStatus = 'active';
  let appListener: ((state: AppStateStatus) => void) | null = null;
  let accountListener: (() => void) | null = null;
  let netListener: ((online: boolean) => void) | null = null;
  let scope: string | null = SCOPE;
  let cursor: any = initialCursor;
  let now = 1_000;
  const tasks: { cancelled: boolean; work: () => void }[] = [];
  const timers: { cancelled: boolean; work: () => void; delayMs: number }[] = [];
  const flush = jest.fn(async () => await (outcomes.shift() ?? { processed: 0, disposition: 'drained' }));
  const admitCredentials = jest.fn(async () => await (credentialOutcomes.shift() ?? 'ready'));
  const scheduler = createLearningV2CompletionBackgroundScheduler({
    currentAppState: () => appState,
    subscribeAppState: (listener) => { appListener = listener; return () => { appListener = null; }; },
    subscribeAccount: (listener) => { accountListener = listener; return () => { accountListener = null; }; },
    subscribeConnectivity: (listener) => { netListener = listener; return () => { netListener = null; }; },
    afterInteractions: (work) => {
      const task = { cancelled: false, work };
      tasks.push(task);
      return { cancel: () => { task.cancelled = true; } };
    },
    setTimer: (work, delayMs) => {
      const timer = { cancelled: false, work, delayMs };
      timers.push(timer);
      return { cancel: () => { timer.cancelled = true; } };
    },
    now: () => now,
    activeAccountScopeHash: () => scope,
    loadCursor: async () => cursor,
    persistCursor: async (next) => { cursor = next; },
    clearCursor: async () => { cursor = null; },
    flush,
    admitCredentials,
  });
  const pendingTasks = () => tasks.filter((task) => !task.cancelled);
  const runNext = () => {
    const task = tasks.find((candidate) => !candidate.cancelled);
    if (!task) throw new Error('missing_scheduled_task');
    task.cancelled = true;
    task.work();
  };
  return {
    scheduler, flush, admitCredentials, tasks, timers, pendingTasks, runNext,
    emitApp: (next: AppStateStatus) => { appState = next; appListener?.(next); },
    emitAccount: () => accountListener?.(), emitNet: (online: boolean) => netListener?.(online),
    setScope: (next: string | null) => { scope = next; },
    setNow: (next: number) => { now = next; }, getCursor: () => cursor,
    setCursor: (next: any) => { cursor = next; },
  };
};

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test('root install schedules one initial wake and remains idempotent', async () => {
  const runtime = createRuntime();
  runtime.scheduler.install();
  runtime.scheduler.install();
  expect(runtime.pendingTasks()).toHaveLength(1);
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(1);
  expect(runtime.admitCredentials).not.toHaveBeenCalled();
  expect(runtime.getCursor()).toBeNull();
});

test('app root installs the scheduler without a Learning V2 route visit', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');
  expect(source).toContain("import('./learning_v2_completion_background_scheduler')");
  expect(source).toContain('ensureLearningV2CompletionBackgroundSchedulerInstalled()');
});

test('interactive surfaces cancel admission and final release resumes once', async () => {
  const runtime = createRuntime();
  runtime.scheduler.install();
  const releaseA = runtime.scheduler.enterInteractiveSurface();
  const releaseB = runtime.scheduler.enterInteractiveSurface();
  expect(runtime.pendingTasks()).toHaveLength(0);
  releaseA();
  expect(runtime.pendingTasks()).toHaveLength(0);
  releaseB();
  expect(runtime.pendingTasks()).toHaveLength(1);
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(1);
});

test('connectivity storms coalesce into one wake', async () => {
  const runtime = createRuntime();
  runtime.scheduler.install();
  runtime.emitNet(true);
  runtime.emitNet(true);
  expect(runtime.pendingTasks()).toHaveLength(1);
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(1);
});

test('retryable result persists backoff and due timer retries after deadline', async () => {
  const runtime = createRuntime([
    { processed: 0, disposition: 'retryable_failure' },
    { processed: 1, disposition: 'drained' },
  ]);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.getCursor()?.failureOrdinal).toBe(1);
  expect(runtime.timers.filter((timer) => !timer.cancelled)).toHaveLength(1);
  runtime.setNow(11_000);
  runtime.timers.find((timer) => !timer.cancelled)?.work();
  expect(runtime.pendingTasks()).toHaveLength(1);
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(2);
  expect(runtime.getCursor()).toBeNull();
});

test('restart before durable due schedules timer without transport', async () => {
  const cursor = {
    schemaVersion: 'learning-v2-required-session-completion-retry-cursor.v1',
    accountScopeHash: SCOPE,
    revision: 1,
    failureOrdinal: 1,
    nextAttemptAtMs: 9_000,
    reason: 'attempt_reserved',
    cursorFingerprint: 'b'.repeat(64),
  };
  const runtime = createRuntime([{ processed: 1, disposition: 'drained' }], cursor);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.flush).not.toHaveBeenCalled();
  expect(runtime.timers.filter((timer) => !timer.cancelled)).toHaveLength(1);
});

test('online edge bypasses a persisted backoff exactly once', async () => {
  const cursor = {
    schemaVersion: 'learning-v2-required-session-completion-retry-cursor.v1',
    accountScopeHash: SCOPE,
    revision: 1,
    failureOrdinal: 1,
    nextAttemptAtMs: 9_000,
    reason: 'retryable_failure',
    cursorFingerprint: 'b'.repeat(64),
  };
  const runtime = createRuntime([{ processed: 1, disposition: 'drained' }], cursor);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.flush).not.toHaveBeenCalled();
  runtime.emitNet(true);
  runtime.emitNet(true);
  expect(runtime.pendingTasks()).toHaveLength(1);
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(1);
  expect(runtime.getCursor()).toBeNull();
});

test('interactive deferral retains a durable short retry instead of stranding work', async () => {
  const runtime = createRuntime([{ processed: 0, disposition: 'deferred' }]);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.getCursor()?.reason).toBe('attempt_reserved');
  expect(runtime.timers.filter((timer) => !timer.cancelled)).toHaveLength(1);
});

test('credentials-required admission publishes once and resumes the reserved attempt', async () => {
  const runtime = createRuntime([
    { processed: 0, disposition: 'credentials_required' },
    { processed: 1, disposition: 'drained' },
  ], null, ['published']);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.admitCredentials).toHaveBeenCalledTimes(1);
  expect(runtime.pendingTasks()).toHaveLength(1);
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(2);
  expect(runtime.getCursor()).toBeNull();
});

test('credential capacity is paced by the durable retry cursor without a loop', async () => {
  const runtime = createRuntime([
    { processed: 0, disposition: 'credentials_required' },
  ], null, ['capacity_exhausted']);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.admitCredentials).toHaveBeenCalledTimes(1);
  expect(runtime.getCursor()?.reason).toBe('retryable_failure');
  expect(runtime.getCursor()?.failureOrdinal).toBe(1);
  expect(runtime.pendingTasks()).toHaveLength(0);
  expect(runtime.timers.filter((timer) => !timer.cancelled)).toHaveLength(1);
});

test('a credential warm longer than one retry window keeps a current durable wake', async () => {
  let finishWarm!: (value: string) => void;
  const slowWarm = new Promise<string>((resolve) => { finishWarm = resolve; });
  const runtime = createRuntime([
    { processed: 0, disposition: 'credentials_required' },
    { processed: 0, disposition: 'credentials_required' },
  ], null, [slowWarm]);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.admitCredentials).toHaveBeenCalledTimes(1);

  const firstTimer = runtime.timers.find((timer) => !timer.cancelled);
  expect(firstTimer).toBeDefined();
  runtime.setNow(11_000);
  firstTimer!.cancelled = true;
  firstTimer!.work();
  runtime.runNext();
  await settle();

  expect(runtime.admitCredentials).toHaveBeenCalledTimes(1);
  expect(runtime.getCursor()?.reason).toBe('attempt_reserved');
  expect(runtime.timers.filter((timer) => !timer.cancelled)).toHaveLength(1);
  finishWarm('unavailable');
  await settle();
});

test('a stalled credential admission for A does not block B generation', async () => {
  let settleA!: (value: string) => void;
  const pendingA = new Promise<string>((resolve) => { settleA = resolve; });
  const runtime = createRuntime([
    { processed: 0, disposition: 'credentials_required' },
    { processed: 0, disposition: 'credentials_required' },
    { processed: 1, disposition: 'drained' },
  ], null, [pendingA, 'published']);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.admitCredentials).toHaveBeenCalledTimes(1);

  runtime.setScope('b'.repeat(64));
  runtime.setCursor(null);
  runtime.emitAccount();
  runtime.runNext();
  await settle();
  expect(runtime.admitCredentials).toHaveBeenCalledTimes(2);
  expect(runtime.pendingTasks()).toHaveLength(1);
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(3);

  settleA('stale');
  await settle();
  expect(runtime.getCursor()).toBeNull();
});

test('a stalled admission cannot block a newer account generation with the same scope', async () => {
  let settleOld!: (value: string) => void;
  const oldAdmission = new Promise<string>((resolve) => { settleOld = resolve; });
  const runtime = createRuntime([
    { processed: 0, disposition: 'credentials_required' },
    { processed: 0, disposition: 'credentials_required' },
    { processed: 1, disposition: 'drained' },
  ], null, [oldAdmission, 'published']);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.admitCredentials).toHaveBeenCalledTimes(1);

  runtime.emitAccount();
  runtime.runNext();
  await settle();
  expect(runtime.admitCredentials).toHaveBeenCalledTimes(2);
  expect(runtime.pendingTasks()).toHaveLength(1);
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(3);
  expect(runtime.getCursor()).toBeNull();

  settleOld('stale');
  await settle();
  expect(runtime.getCursor()).toBeNull();
  expect(runtime.pendingTasks()).toHaveLength(0);
});

test('a stalled old-generation sync flight cannot block the new generation', async () => {
  let settleOld!: (value: any) => void;
  const oldFlight = new Promise((resolve) => { settleOld = resolve; });
  const runtime = createRuntime([
    oldFlight,
    { processed: 1, disposition: 'drained' },
  ]);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(1);

  runtime.emitAccount();
  expect(runtime.pendingTasks()).toHaveLength(1);
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(2);
  expect(runtime.getCursor()).toBeNull();

  settleOld({ processed: 0, disposition: 'drained' });
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(2);
  expect(runtime.getCursor()).toBeNull();
});

test('a late old-generation rejection cannot reset the current continuation budget', async () => {
  let rejectOld!: (error: Error) => void;
  const oldFlight = new Promise((_resolve, reject) => { rejectOld = reject; });
  const runtime = createRuntime([
    oldFlight,
    ...Array.from({ length: 5 }, () => ({
      processed: 128,
      disposition: 'bounded_continuation',
    })),
  ]);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  runtime.emitAccount();

  for (let index = 0; index < 4; index += 1) {
    runtime.runNext();
    await settle();
  }
  rejectOld(new Error('old_generation_transport_failed'));
  await settle();
  runtime.runNext();
  await settle();

  expect(runtime.getCursor()?.reason).toBe('bounded_continuation');
  expect(runtime.pendingTasks()).toHaveLength(0);
  expect(runtime.timers.filter((timer) => !timer.cancelled)).toHaveLength(1);
});

test('eight stalled sync flights bound a ninth generation until a slot settles', async () => {
  const releases: ((value: any) => void)[] = [];
  const stalled = Array.from({ length: 8 }, () => new Promise((resolve) => {
    releases.push(resolve);
  }));
  const runtime = createRuntime([
    ...stalled,
    { processed: 1, disposition: 'drained' },
  ]);
  runtime.scheduler.install();
  for (let index = 0; index < 8; index += 1) {
    if (index > 0) runtime.emitAccount();
    runtime.runNext();
    await settle();
  }
  expect(runtime.flush).toHaveBeenCalledTimes(8);

  runtime.emitAccount();
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(8);
  const capacityTimer = runtime.timers.find((timer) => !timer.cancelled);
  expect(capacityTimer).toBeDefined();

  releases[0]!({ processed: 0, disposition: 'drained' });
  await settle();
  runtime.setNow(11_000);
  capacityTimer!.cancelled = true;
  capacityTimer!.work();
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(9);
  expect(runtime.getCursor()).toBeNull();

  for (const release of releases.slice(1)) {
    release({ processed: 0, disposition: 'drained' });
  }
  await settle();
});

test('exactly 128 drained items do not invent a continuation', async () => {
  const runtime = createRuntime([{ processed: 128, disposition: 'drained' }]);
  runtime.scheduler.install();
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(1);
  expect(runtime.pendingTasks()).toHaveLength(0);
  expect(runtime.timers.filter((timer) => !timer.cancelled)).toHaveLength(0);
});

test('account transition cancels admitted task and isolates a missing active owner', () => {
  const runtime = createRuntime();
  runtime.scheduler.install();
  runtime.setScope(null);
  runtime.emitAccount();
  expect(runtime.pendingTasks()).toHaveLength(0);
  expect(runtime.flush).not.toHaveBeenCalled();
});

test('an online bypass admitted for A cannot clear B retry state after account switch', async () => {
  const runtime = createRuntime();
  runtime.scheduler.install();
  runtime.emitNet(true);
  const bCursor = {
    schemaVersion: 'learning-v2-required-session-completion-retry-cursor.v1',
    accountScopeHash: 'b'.repeat(64),
    revision: 4,
    failureOrdinal: 2,
    nextAttemptAtMs: 9_000,
    reason: 'retryable_failure',
    cursorFingerprint: 'c'.repeat(64),
  };
  runtime.setScope('b'.repeat(64));
  runtime.setCursor(bCursor);
  runtime.emitAccount();
  runtime.runNext();
  await settle();
  expect(runtime.flush).not.toHaveBeenCalled();
  expect(runtime.getCursor()).toBe(bCursor);
});

test('641st item resumes after four immediate continuations and durable cooldown', async () => {
  const runtime = createRuntime([
    ...Array.from({ length: 5 }, () => ({ processed: 128, disposition: 'bounded_continuation' })),
    { processed: 1, disposition: 'drained' },
  ]);
  runtime.scheduler.install();
  for (let index = 0; index < 5; index += 1) {
    expect(runtime.pendingTasks()).toHaveLength(1);
    runtime.runNext();
    await settle();
  }
  expect(runtime.flush).toHaveBeenCalledTimes(5);
  expect(runtime.pendingTasks()).toHaveLength(0);
  expect(runtime.getCursor()?.reason).toBe('bounded_continuation');
  expect(runtime.timers.filter((timer) => !timer.cancelled)).toHaveLength(1);
  runtime.setNow(6_000);
  runtime.timers.find((timer) => !timer.cancelled)?.work();
  runtime.runNext();
  await settle();
  expect(runtime.flush).toHaveBeenCalledTimes(6);
  expect(runtime.getCursor()).toBeNull();
});

test('wake requested during real in-flight work is replayed after settlement', async () => {
  let resolve!: (value: any) => void;
  const deferred = new Promise((next) => { resolve = next; });
  const runtime = createRuntime([deferred, { processed: 0, disposition: 'drained' }]);
  runtime.scheduler.install();
  runtime.runNext();
  runtime.emitNet(true);
  expect(runtime.pendingTasks()).toHaveLength(0);
  resolve({ processed: 0, disposition: 'drained' });
  await settle();
  expect(runtime.pendingTasks()).toHaveLength(1);
});
