import {
  createDialogueVoiceAttemptGuard,
  resolveDialogueAsrCapability,
  resolveDialogueVoiceCapability,
} from '../app/dialogue_voice_capability';

describe('strict dialogue voice capability', () => {
  it('accepts only an exact installed target locale and never an English or regional substitute', () => {
    expect(resolveDialogueVoiceCapability({ target: 'es', platform: 'android', voices: [{ identifier: 'es', language: 'es-ES' }] })).toMatchObject({ available: true, voiceId: 'es' });
    expect(resolveDialogueVoiceCapability({ target: 'es', platform: 'android', voices: [{ identifier: 'en', language: 'en-US' }] })).toMatchObject({ available: false, reason: 'exact_voice_missing' });
    expect(resolveDialogueVoiceCapability({ target: 'es', platform: 'android', voices: [{ identifier: 'mx', language: 'es-MX' }] })).toMatchObject({ available: false, reason: 'exact_voice_missing' });
  });

  it('fails closed on an empty, errored, or timed out inventory and does not infer iOS non-English proof', () => {
    expect(resolveDialogueVoiceCapability({ target: 'fr', platform: 'android', voices: [] }).available).toBe(false);
    expect(resolveDialogueVoiceCapability({ target: 'de', platform: 'android', inventoryError: true }).reason).toBe('inventory_unverified');
    expect(resolveDialogueVoiceCapability({ target: 'fr', platform: 'ios', voices: [{ identifier: 'fr', language: 'fr-FR' }] }).available).toBe(false);
    expect(resolveDialogueVoiceCapability({ target: 'fr', platform: 'ios', iosTargetSpecificProof: true, voices: [{ identifier: 'fr', language: 'fr-FR' }] }).available).toBe(true);
  });

  it('keeps ASR unavailable before Android 13 and requires the same verified service for inventory and start', () => {
    expect(resolveDialogueAsrCapability({ target: 'de', platform: 'android', androidApiLevel: 31, inventoryServiceId: 'a', startServiceId: 'a', locales: ['de-DE'] })).toMatchObject({ available: false, reason: 'android_api_unsupported' });
    expect(resolveDialogueAsrCapability({ target: 'de', platform: 'android', androidApiLevel: 33, inventoryServiceId: 'a', startServiceId: 'b', locales: ['de-DE'] })).toMatchObject({ available: false, reason: 'service_mismatch' });
    expect(resolveDialogueAsrCapability({ target: 'de', platform: 'android', androidApiLevel: 33, inventoryServiceId: 'a', startServiceId: 'a', locales: ['de-DE'] })).toMatchObject({ available: true, locale: 'de-DE' });
  });

  it('cancels an in-flight capability result after target switch, unmount, or a late result', () => {
    const guard = createDialogueVoiceAttemptGuard();
    const ticket = guard.begin();
    guard.cancel();
    expect(guard.isCurrent(ticket)).toBe(false);
    expect(guard.isCurrent(guard.begin())).toBe(true);
  });
});
