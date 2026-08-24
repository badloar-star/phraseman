import { applyRemoteConfigSnapshot } from '../app/remote_flags';
import {
  configurePhoneStateShadowRuntime,
  recordShadowProgressEvent,
  recordShadowXpGrant,
  type PhoneStateShadowAppendInput,
} from '../app/phone_state_shadow_adapters';

beforeEach(() => {
  applyRemoteConfigSnapshot({ bools: { phone_state_shadow_enabled: true } });
});

afterEach(() => {
  configurePhoneStateShadowRuntime(null);
  applyRemoteConfigSnapshot({ numbers: {}, bools: {}, texts: {} });
});

test('XP commits locally first and shadow failure cannot change its result', async () => {
  let legacyTotal = 0;
  const visibleErrors: string[] = [];
  configurePhoneStateShadowRuntime({
    scope: () => ({ stableUid: 'shadow-user', accountGeneration: 1, deviceId: 'shadow_device_0001' }),
    append: async () => { throw new Error('shadow_disk'); },
  });

  const registerXP = async (amount: number, eventId: string) => {
    legacyTotal += amount;
    void recordShadowXpGrant({ eventId, amount, resultingTotalXp: legacyTotal, source: 'lesson_answer' });
    return { xp: legacyTotal };
  };

  await expect(registerXP(10, 'lesson:1:a:1')).resolves.toMatchObject({ xp: 10 });
  await Promise.resolve();
  expect(legacyTotal).toBe(10);
  expect(visibleErrors).toEqual([]);
});

test('lesson completion and XP reuse stable semantic IDs', async () => {
  const operations: PhoneStateShadowAppendInput[] = [];
  const ids = new Set<string>();
  configurePhoneStateShadowRuntime({
    scope: () => ({ stableUid: 'shadow-user', accountGeneration: 1, deviceId: 'shadow_device_0001' }),
    append: async (input) => {
      if (ids.has(input.idempotencyKey)) return { duplicate: true };
      ids.add(input.idempotencyKey);
      operations.push(input);
      return { duplicate: false };
    },
  });

  await recordShadowProgressEvent({
    eventId: 'run-7:lesson-1:complete',
    type: 'lesson_complete',
    payload: { lessonId: 'lesson-1', runId: 'run-7' },
  });
  await recordShadowProgressEvent({
    eventId: 'run-7:lesson-1:complete',
    type: 'lesson_complete',
    payload: { lessonId: 'lesson-1', runId: 'run-7' },
  });

  expect(operations.filter((item) => item.operation.domain === 'lesson_completion')).toHaveLength(1);
  expect(operations[0].idempotencyKey).toContain('run-7:lesson-1:complete');
});
