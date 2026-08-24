import {
  applyPersonalProgressCommand,
  emptyPersonalProgressState,
  type PersonalProgressCommand,
  type PersonalProgressState,
} from '../modules/phone-state/domains/progress_projection';
import {
  createPersonalProgressApi,
  type PersonalProgressJournal,
} from '../modules/phone-state/domains/progress_api';

function progressHarness(options?: Readonly<{ mirrorFails?: boolean }>) {
  let state: PersonalProgressState = emptyPersonalProgressState();
  let releaseCommit: (() => void) | null = null;
  let uiSuccesses = 0;
  const journal: PersonalProgressJournal = {
    commit: async (command: PersonalProgressCommand) => {
      await new Promise<void>((resolve) => { releaseCommit = resolve; });
      const result = applyPersonalProgressCommand(state, command, (xp) => Math.floor(xp / 100) + 1);
      state = result.state;
      uiSuccesses += 1;
      return { projection: state.projection, duplicate: result.duplicate };
    },
    read: async () => state.projection,
  };
  return {
    api: createPersonalProgressApi({
      journal,
      mirror: async () => {
        if (options?.mirrorFails) throw new Error('mirror_disk');
      },
    }),
    releaseSqlCommit: () => releaseCommit?.(),
    uiSuccesses: () => uiSuccesses,
  };
}

function xpInput(input: Readonly<{ amount: number; eventId: string }>) {
  return {
    ...input,
    source: 'lesson_answer',
    activityDate: '2026-08-21',
    exactResult: { accepted: true },
  };
}

test('commit returns only after journal and projection are durable', async () => {
  const harness = progressHarness();
  const pending = harness.api.grantXp(xpInput({ amount: 10, eventId: 'lesson:1:a:1' }));
  expect(harness.uiSuccesses()).toBe(0);
  await Promise.resolve();
  harness.releaseSqlCommit();
  await expect(pending).resolves.toMatchObject({ totalXp: 10, duplicate: false });
});

test('server time and server balance are absent from ordinary progress inputs', () => {
  expect(Object.keys(xpInput({ amount: 10, eventId: 'x' })))
    .not.toEqual(expect.arrayContaining(['serverTime', 'serverTotalXp', 'serverStreak']));
});

test('duplicate XP is idempotent and mirror failure cannot fail the commit', async () => {
  const harness = progressHarness({ mirrorFails: true });
  const first = harness.api.grantXp(xpInput({ amount: 10, eventId: 'same-event' }));
  await Promise.resolve();
  harness.releaseSqlCommit();
  await expect(first).resolves.toMatchObject({ totalXp: 10, duplicate: false });
  const second = harness.api.grantXp(xpInput({ amount: 10, eventId: 'same-event' }));
  await Promise.resolve();
  harness.releaseSqlCommit();
  await expect(second).resolves.toMatchObject({ totalXp: 10, duplicate: true });
});

test('unsafe and negative XP inputs reject before the journal', async () => {
  const harness = progressHarness();
  await expect(harness.api.grantXp(xpInput({ amount: -1, eventId: 'negative' })))
    .rejects.toThrow('phone_state_progress_input_invalid');
  await expect(harness.api.grantXp(xpInput({ amount: Number.NaN, eventId: 'nan' })))
    .rejects.toThrow('phone_state_progress_input_invalid');
});

test('completion unions dates and ids while best result only increases', () => {
  let state = emptyPersonalProgressState();
  state = applyPersonalProgressCommand(state, {
    kind: 'complete_lesson', eventId: 'run-1', lessonId: 'lesson-1', bestPct: 90,
  }, () => 1).state;
  state = applyPersonalProgressCommand(state, {
    kind: 'complete_lesson', eventId: 'run-2', lessonId: 'lesson-1', bestPct: 80,
  }, () => 1).state;
  expect(state.projection.completedLessons).toEqual(['lesson-1']);
  expect(state.projection.bestResults['lesson:lesson-1']).toBe(90);
});
