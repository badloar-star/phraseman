import {
  applyRemoteConfigSnapshot,
  assignPhoneStateCohort,
  getRemoteBool,
  getRemoteNumber,
} from '../app/remote_flags';

afterEach(() => applyRemoteConfigSnapshot({ numbers: {}, bools: {}, texts: {} }));

test('all PhoneState authority flags default off', () => {
  expect(getRemoteBool('phone_state_shadow_enabled')).toBe(false);
  expect(getRemoteBool('phone_state_sync_enabled')).toBe(false);
  expect(getRemoteNumber('phone_state_cutover_percent')).toBe(0);
});

test('cohort assignment is stable and never exceeds the configured percent', () => {
  expect(assignPhoneStateCohort('stable-A', 0)).toBe(false);
  expect(assignPhoneStateCohort('stable-A', 10)).toBe(assignPhoneStateCohort('stable-A', 10));
  expect(assignPhoneStateCohort('stable-A', 100)).toBe(true);
});

test('cutover percent is clamped to an integer from zero through one hundred', () => {
  applyRemoteConfigSnapshot({ numbers: { phone_state_cutover_percent: 101.8 } });
  expect(getRemoteNumber('phone_state_cutover_percent')).toBe(100);
  applyRemoteConfigSnapshot({ numbers: { phone_state_cutover_percent: 10.6 } });
  expect(getRemoteNumber('phone_state_cutover_percent')).toBe(11);
});
