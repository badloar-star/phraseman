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

  // зачем (владелец 21.10, B3 / репорт №12 «в диалоге недоступно, а в уроках записывает»): как в уроках — версия
  // Android не запрет, пустой список языков (Android ≤ 12 его не отдаёт) не отказ; отказ только по явному списку.
  it('allows ASR on Android 12 and below like lessons; an empty locale list is not a refusal', () => {
    expect(resolveDialogueAsrCapability({ target: 'de', platform: 'android', androidApiLevel: 31, inventoryServiceId: 'a', startServiceId: 'a', locales: ['de-DE'] })).toMatchObject({ available: true, locale: 'de-DE', reason: null });
    expect(resolveDialogueAsrCapability({ target: 'en', platform: 'android', androidApiLevel: 30, inventoryServiceId: null, startServiceId: null, locales: [] })).toMatchObject({ available: true, reason: null });
    expect(resolveDialogueAsrCapability({ target: 'en', platform: 'android', androidApiLevel: undefined, locales: undefined })).toMatchObject({ available: true, reason: null });
    expect(resolveDialogueAsrCapability({ target: 'en', platform: 'android', androidApiLevel: 31, inventoryServiceId: 'a', startServiceId: 'a', locales: ['fr-FR'] })).toMatchObject({ available: false, reason: 'exact_locale_missing' });
  });

  it('requires the same verified service for inventory and start', () => {
    expect(resolveDialogueAsrCapability({ target: 'de', platform: 'android', androidApiLevel: 33, inventoryServiceId: 'a', startServiceId: 'b', locales: ['de-DE'] })).toMatchObject({ available: false, reason: 'service_mismatch' });
    expect(resolveDialogueAsrCapability({ target: 'de', platform: 'android', androidApiLevel: 33, inventoryServiceId: 'a', startServiceId: 'a', locales: ['de-DE'] })).toMatchObject({ available: true, locale: 'de-DE' });
  });

  // Регрессия 2026-09-21: на iPhone Диалоги писали «Голосовой ввод недоступен на
  // этом устройстве» ВСЕГДА. iOS не отдаёт список локалей распознавания, а код
  // требовал его как доказательство. Микрофон в остальных разделах работал.
  it('never blocks iOS voice input just because the locale list is empty', () => {
    expect(resolveDialogueAsrCapability({ target: 'en', platform: 'ios', inventoryServiceId: 'ios-system', startServiceId: 'ios-system', locales: [] }))
      .toMatchObject({ available: true, locale: 'en-US' });
    expect(resolveDialogueAsrCapability({ target: 'es', platform: 'ios', inventoryServiceId: 'ios-system', startServiceId: 'ios-system', locales: [] }).available).toBe(true);
  });

  // Android отдаёт локали то через дефис, то через подчёркивание, иногда без
  // региона — строгое сравнение строкой в строку тоже отказывало зря.
  it('matches Android locales regardless of separator or missing region', () => {
    const base = { target: 'en', platform: 'android', androidApiLevel: 33, inventoryServiceId: 'a', startServiceId: 'a' } as const;
    expect(resolveDialogueAsrCapability({ ...base, locales: ['en_US'] }).available).toBe(true);
    expect(resolveDialogueAsrCapability({ ...base, locales: ['en'] }).available).toBe(true);
    expect(resolveDialogueAsrCapability({ ...base, locales: ['fr-FR'] })).toMatchObject({ available: false, reason: 'exact_locale_missing' });
  });

  it('cancels an in-flight capability result after target switch, unmount, or a late result', () => {
    const guard = createDialogueVoiceAttemptGuard();
    const ticket = guard.begin();
    guard.cancel();
    expect(guard.isCurrent(ticket)).toBe(false);
    expect(guard.isCurrent(guard.begin())).toBe(true);
  });
});
