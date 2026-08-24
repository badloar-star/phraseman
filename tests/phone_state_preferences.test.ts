import {
  createPersonalPreferencesApi,
  mergePreferenceOperations,
  resolveRegister,
} from '../modules/phone-state/domains/preferences';

const setPreference = (deviceId: string, counter: number, field: string, value: unknown) => ({
  field, value, clock: { counter, deviceId },
});

test('independent device edits to different fields both survive', () => {
  expect(mergePreferenceOperations([
    setPreference('device-a', 4, 'app_lang', 'es'),
    setPreference('device-b', 8, 'user_avatar', 'avatar-7'),
  ])).toMatchObject({ app_lang: 'es', user_avatar: 'avatar-7' });
});

test('same-field tie uses counter then deviceId', () => {
  expect(resolveRegister(
    setPreference('a', 9, 'app_lang', 'es'),
    setPreference('b', 9, 'app_lang', 'fr'),
  ).value).toBe('fr');
});

test('API rejects server-owned identity/access fields', async () => {
  const api = createPersonalPreferencesApi({ commit: async () => undefined, read: async () => ({}) });
  await expect(api.setField('premium', true, 'x')).rejects.toThrow('phone_state_preference_field_invalid');
});
