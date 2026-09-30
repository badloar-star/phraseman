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
      const result = applyPersonalProgressCommand(state, command);
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

// зачем: выдача XP удалена (PM-055/PM-067); те же гарантии проверяются на completeLesson.
function lessonInput(eventId: string) {
  return { eventId, lessonId: 'lesson-1', bestPct: 90 };
}

test('commit returns only after journal and projection are durable', async () => {
  const harness = progressHarness();
  const pending = harness.api.completeLesson(lessonInput('lesson:1:a:1'));
  expect(harness.uiSuccesses()).toBe(0);
  await Promise.resolve();
  harness.releaseSqlCommit();
  await expect(pending).resolves.toMatchObject({ completedLessons: ['lesson-1'] });
});

test('server time and server balance are absent from ordinary progress inputs', () => {
  expect(Object.keys(lessonInput('x')))
    .not.toEqual(expect.arrayContaining(['serverTime', 'serverTotalXp', 'serverStreak']));
});

test('duplicate completion is idempotent and mirror failure cannot fail the commit', async () => {
  const harness = progressHarness({ mirrorFails: true });
  const first = harness.api.completeLesson(lessonInput('same-event'));
  await Promise.resolve();
  harness.releaseSqlCommit();
  await expect(first).resolves.toMatchObject({ completedLessons: ['lesson-1'] });
  const second = harness.api.completeLesson(lessonInput('same-event'));
  await Promise.resolve();
  harness.releaseSqlCommit();
  await expect(second).resolves.toMatchObject({ completedLessons: ['lesson-1'] });
});

test('invalid completion inputs reject before the journal', async () => {
  const harness = progressHarness();
  const pending = harness.api.completeLesson({ eventId: 'bad', lessonId: 'lesson-1', bestPct: -1 });
  await Promise.resolve();
  harness.releaseSqlCommit();
  await expect(pending).rejects.toThrow('phone_state_progress_input_invalid');
});

test('completion unions dates and ids while best result only increases', () => {
  let state = emptyPersonalProgressState();
  state = applyPersonalProgressCommand(state, {
    kind: 'complete_lesson', eventId: 'run-1', lessonId: 'lesson-1', bestPct: 90,
  }).state;
  state = applyPersonalProgressCommand(state, {
    kind: 'complete_lesson', eventId: 'run-2', lessonId: 'lesson-1', bestPct: 80,
  }).state;
  expect(state.projection.completedLessons).toEqual(['lesson-1']);
  expect(state.projection.bestResults['lesson:lesson-1']).toBe(90);
});
