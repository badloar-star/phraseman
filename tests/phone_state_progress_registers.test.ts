import type { PersonalOperation } from '../modules/phone-state/contracts';
import { createProgressRegistersReducer } from '../modules/phone-state/domains/progress_registers';

function operation(input: Readonly<{
  operationId: string;
  key: string;
  value: string | null;
  counter: number;
  deviceId?: string;
}>): PersonalOperation {
  const deviceId = input.deviceId ?? 'device-a';
  return {
    schemaVersion: 1,
    operationId: input.operationId,
    stableUid: 'account-a',
    accountGeneration: 2,
    deviceId,
    deviceSequence: input.counter,
    hybridClock: { deviceId, counter: input.counter },
    domain: 'progress_registers',
    kind: 'set_field',
    entityId: input.key,
    payload: { field: input.key, value: input.value },
    exactResult: { value: input.value },
    createdAtMs: input.counter,
    fingerprint: 'a'.repeat(64),
  };
}

describe('PhoneState progress registers reducer', () => {
  test('uses HLC LWW for named field-register inventory keys', () => {
    const reducer = createProgressRegistersReducer();
    const newer = operation({
      operationId: 'newer', key: 'onboarding_step', value: 'name', counter: 5,
    });
    const older = operation({
      operationId: 'older', key: 'onboarding_step', value: 'plan', counter: 4,
    });

    const state = reducer.apply(reducer.apply(reducer.initial(), newer), older);
    expect(state.registers.onboarding_step?.value).toBe('name');
    expect(state.appliedOperationIds).toEqual(['newer', 'older']);
  });

  test('rejects progress keys whose merge contract is not field-register', () => {
    const reducer = createProgressRegistersReducer();
    expect(() => reducer.apply(reducer.initial(), operation({
      operationId: 'xp', key: 'user_total_xp', value: '100', counter: 1,
    }))).toThrow('phone_state_progress_register_field_invalid');
  });
});
