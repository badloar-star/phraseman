import {
  createPracticeReducer,
  portabilityOf,
  practiceOperations,
  practiceProjectionFromReducerState,
  replayPractice,
} from '../modules/phone-state/domains/practice';
import type { PersonalOperation } from '../modules/phone-state/contracts';

test('plan task completions union while mutable selections use field clocks', () => {
  const state = replayPractice([
    practiceOperations.completeTask('day-1:listening'),
    practiceOperations.completeTask('day-1:quiz'),
    practiceOperations.setField('plan_mode', 'intensive', { deviceId: 'a', counter: 2 }),
    practiceOperations.setField('plan_mode', 'balanced', { deviceId: 'b', counter: 3 }),
  ]);
  expect(state.completedTasks).toEqual(['day-1:listening', 'day-1:quiz']);
  expect(state.planMode).toBe('balanced');
});

test('mistake facts union and session audio remains device-only', () => {
  const state = replayPractice([
    practiceOperations.captureMistake('a'),
    practiceOperations.captureMistake('b'),
  ]);
  expect(state.mistakeIds).toEqual(['a', 'b']);
  expect(portabilityOf('active_audio_buffer')).toBe('device_only');
});

const operation = (input: Partial<PersonalOperation> & Pick<PersonalOperation, 'operationId' | 'kind'>): PersonalOperation => ({
  schemaVersion: 1,
  operationId: input.operationId,
  stableUid: 'account-a',
  accountGeneration: 7,
  deviceId: input.deviceId ?? 'device-a',
  deviceSequence: input.deviceSequence ?? 1,
  hybridClock: input.hybridClock ?? { deviceId: input.deviceId ?? 'device-a', counter: input.deviceSequence ?? 1 },
  domain: 'practice',
  kind: input.kind,
  entityId: input.entityId ?? null,
  payload: input.payload ?? {},
  exactResult: input.exactResult ?? {},
  createdAtMs: input.createdAtMs ?? 1,
  fingerprint: input.fingerprint ?? `fingerprint-${input.operationId}`,
});

test('runtime reducer preserves full immutable facts and ignores an exact duplicate', () => {
  const reducer = createPracticeReducer();
  const fact = operation({
    operationId: 'device-a:1',
    kind: 'mistake',
    entityId: 'mistake-1',
    payload: { value: { prompt: 'one', answer: 'uno' } },
  });
  const once = reducer.apply(reducer.initial(), fact);
  const twice = reducer.apply(once, fact);

  expect(practiceProjectionFromReducerState(twice).mistakes).toEqual({
    'mistake-1': { prompt: 'one', answer: 'uno' },
  });
  expect(twice.appliedOperationIds).toEqual(['device-a:1']);
});

test('runtime register resolution uses the PhoneState hybrid clock', () => {
  const reducer = createPracticeReducer();
  const first = reducer.apply(reducer.initial(), operation({
    operationId: 'device-a:2', kind: 'set_field', entityId: 'plan_state',
    payload: { field: 'plan_state', value: { planId: 'first' } },
    hybridClock: { deviceId: 'device-a', counter: 2 },
  }));
  const merged = reducer.apply(first, operation({
    operationId: 'device-b:3', kind: 'set_field', entityId: 'plan_state',
    payload: { field: 'plan_state', value: { planId: 'second' } },
    hybridClock: { deviceId: 'device-b', counter: 3 },
  }));

  expect(practiceProjectionFromReducerState(merged).registers.plan_state)
    .toEqual({ planId: 'second' });
});
