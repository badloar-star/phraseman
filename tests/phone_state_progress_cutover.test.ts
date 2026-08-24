import { applyRemoteConfigSnapshot } from '../app/remote_flags';
import {
  configurePhoneStateProgressCutover,
  tryGrantXpThroughPhoneState,
  trySubmitProgressThroughPhoneState,
} from '../app/phone_state_progress_cutover';
import type { PersonalProgressApi } from '../modules/phone-state/domains/progress_api';
import type { PersonalProgressProjection } from '../modules/phone-state/domains/progress_projection';
import type { PersonalOperation } from '../modules/phone-state/contracts';
import { assembleSegments } from '../modules/phone-state/segments';
import { configurePhoneStateHealthStorage } from '../app/phone_state_health';

const emptyProjection: PersonalProgressProjection = {
  totalXp: 0, level: 1, weeklyXp: 0, activityDates: [], streakCount: 0,
  completedLessons: [], passedExams: [], unlockedLessons: [], bestResults: {},
};

async function cutoverHarness(enabled: boolean) {
  const phoneOperations: string[] = [];
  let callableCalls = 0;
  const api: PersonalProgressApi = {
    grantXp: async (input) => {
      phoneOperations.push(input.eventId);
      return { totalXp: phoneOperations.length * input.amount, level: 1, streakCount: 1, duplicate: false };
    },
    completeLesson: async (input) => { phoneOperations.push(input.eventId); return emptyProjection; },
    completeExam: async (input) => { phoneOperations.push(input.eventId); return emptyProjection; },
    read: async () => emptyProjection,
  };
  configurePhoneStateProgressCutover(api);
  await configurePhoneStateHealthStorage({
    read: async () => null,
    write: async () => undefined,
  });
  applyRemoteConfigSnapshot({
    bools: {
      phone_state_sync_enabled: enabled,
      phone_state_emergency_stop: !enabled,
    },
    numbers: { phone_state_cutover_percent: enabled ? 100 : 0 },
  });
  return {
    registerXP: async (amount: number, eventId: string) => {
      const committed = await tryGrantXpThroughPhoneState('stable-cutover-user', {
        eventId, amount, source: 'lesson_answer', activityDate: '2026-08-21', exactResult: { amount },
      });
      if (!committed) callableCalls += 1;
    },
    completeTwentyAnswerLesson: async () => {
      for (let index = 1; index <= 20; index += 1) {
        await tryGrantXpThroughPhoneState('stable-cutover-user', {
          eventId: `lesson:1:a:${index}`, amount: 1, source: 'lesson_answer',
          activityDate: '2026-08-21', exactResult: { amount: 1 },
        });
      }
      await trySubmitProgressThroughPhoneState('stable-cutover-user', {
        eventId: 'lesson:1:run:complete', type: 'lesson_complete', payload: { lessonId: 'lesson-1' },
      });
      const deviceId = 'cutover_device_001';
      const operations: PersonalOperation[] = phoneOperations.map((eventId, index) => ({
        schemaVersion: 1, operationId: eventId, stableUid: 'stable-cutover-user', accountGeneration: 1,
        deviceId, deviceSequence: index + 1, hybridClock: { counter: index + 1, deviceId },
        domain: 'progress', kind: 'fact', entityId: eventId, payload: {}, exactResult: {},
        createdAtMs: index + 1, fingerprint: (index + 1).toString(16).padStart(64, '0'),
      }));
      return assembleSegments(operations, { reason: 'lesson_complete' });
    },
    phoneStateOperations: () => [...phoneOperations],
    callableCalls: () => callableCalls,
  };
}

afterEach(async () => {
  configurePhoneStateProgressCutover(null);
  await configurePhoneStateHealthStorage(null);
  applyRemoteConfigSnapshot({ numbers: {}, bools: {}, texts: {} });
});

test('cutover cohort grants XP through PhoneState and never submits progress callable', async () => {
  const harness = await cutoverHarness(true);
  await harness.registerXP(10, 'lesson:1:a:1');
  expect(harness.phoneStateOperations()).toHaveLength(1);
  expect(harness.callableCalls()).toBe(0);
});

test('legacy cohort behavior remains available during compatibility horizon', async () => {
  const harness = await cutoverHarness(false);
  await harness.registerXP(10, 'lesson:1:a:1');
  expect(harness.callableCalls()).toBe(1);
});

test('twenty answers and lesson completion seal one segment', async () => {
  const harness = await cutoverHarness(true);
  expect(await harness.completeTwentyAnswerLesson()).toHaveLength(1);
});

test('local PhoneState failure is silent and returns control to the compatible durable path', async () => {
  configurePhoneStateProgressCutover({
    grantXp: async () => { throw new Error('disk_busy'); },
    completeLesson: async () => { throw new Error('disk_busy'); },
    completeExam: async () => { throw new Error('disk_busy'); },
    read: async () => emptyProjection,
  });
  await configurePhoneStateHealthStorage({ read: async () => null, write: async () => undefined });
  applyRemoteConfigSnapshot({
    bools: { phone_state_sync_enabled: true, phone_state_emergency_stop: false },
    numbers: { phone_state_cutover_percent: 100 },
  });
  await expect(tryGrantXpThroughPhoneState('stable-cutover-user', {
    eventId: 'fallback-xp', amount: 1, source: 'lesson_answer',
    activityDate: '2026-08-21', exactResult: {},
  })).resolves.toBeNull();
  await expect(trySubmitProgressThroughPhoneState('stable-cutover-user', {
    eventId: 'fallback-lesson', type: 'lesson_complete', payload: { lessonId: '1' },
  })).resolves.toBeNull();
});
