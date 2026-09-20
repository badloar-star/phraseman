class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
}));

import {
  DIALOGUE_NON_ENGLISH_PACK_BINDING_MANIFEST,
  resolveDialoguePackBindingAgainstManifest,
  type DialoguePackBindingPin,
  DIALOGUE_LANGUAGE_CONTRACT_VERSION,
  DIALOGUE_ACTIVATED_STUDY_TARGETS,
  assertDialogueStudyLanguage,
  dialogueContractHttpError,
  dialogueStudyTargetName,
  resolveActivatedDialogueStudyTarget,
  resolveDialogueStudyTarget,
  resolveDialogueTargetBeforeWarmup,
} from './dialogue_ai_language_contract';

describe('dialogue_ai_language_contract', () => {
  it('activates every shipped dialogue target without changing target identity', () => {
    expect(DIALOGUE_LANGUAGE_CONTRACT_VERSION).toBe('dialogue-ai-language-contract-v4');
    expect(['en', 'es', 'fr', 'de'].map(resolveDialogueStudyTarget)).toEqual(['en', 'es', 'fr', 'de']);
    expect(DIALOGUE_ACTIVATED_STUDY_TARGETS).toEqual(['en', 'es', 'fr', 'de']);
    for (const target of ['en', 'es', 'fr', 'de'] as const) {
      expect(resolveActivatedDialogueStudyTarget(target)).toBe(target);
    }
  });

  it.each([undefined, null, '', ' ', 'EN', 'es-ES', 'de-DE', 'it', 'xx']) (
    'fails closed for absent or unsupported target %p',
    (target) => {
      expect(() => resolveDialogueStudyTarget(target)).toThrow('premium_dialog_unsupported_study_target');
    },
  );

  it('provides target names without an English fallback', () => {
    expect(dialogueStudyTargetName('en')).toBe('English');
    expect(dialogueStudyTargetName('es')).toBe('Spanish');
    expect(dialogueStudyTargetName('fr')).toBe('French');
    expect(dialogueStudyTargetName('de')).toBe('German');
  });

  it('preserves every activated target through direct callable preflight', () => {
    expect(resolveDialogueTargetBeforeWarmup({ studyTarget: 'en', warmupPing: true })).toBe('en');
    expect(resolveDialogueTargetBeforeWarmup({ studyTarget: 'es', warmupPing: true })).toBe('es');
    expect(resolveDialogueTargetBeforeWarmup({ studyTarget: 'fr', warmupPing: true })).toBe('fr');
    expect(resolveDialogueTargetBeforeWarmup({ studyTarget: 'de', warmupPing: true })).toBe('de');
    expect(() => resolveDialogueTargetBeforeWarmup({ warmupPing: true })).toThrow(
      'premium_dialog_unsupported_study_target',
    );
  });

  it('keeps English legacy binding metadata-free while requiring exact native pack pins', () => {
    expect(DIALOGUE_NON_ENGLISH_PACK_BINDING_MANIFEST).toEqual({});
    expect(resolveDialoguePackBindingAgainstManifest({ studyTarget: 'en' })).toBe('en');
    expect(resolveDialoguePackBindingAgainstManifest({
      studyTarget: 'en',
      scenarioId: ' ignored ',
      packVersion: ' ignored ',
      packSha256: 'ignored',
      sharedManifestSha256: 'ignored',
    })).toBe('en');

    const pin: DialoguePackBindingPin = {
      studyTarget: 'es', scenarioId: 'coffee_order', packVersion: 'es-native-v1-draft',
      packSha256: 'a'.repeat(64), sharedManifestSha256: 'b'.repeat(64),
    };
    const manifest = { 'es:coffee_order': pin };
    const request = { ...pin, warmupPing: true };
    expect(resolveDialoguePackBindingAgainstManifest(request, manifest)).toBe('es');
    expect(resolveDialogueTargetBeforeWarmup(request, manifest)).toBe('es');
  });

  it('accepts the released target-only client contract but fails closed on malformed binding metadata', () => {
    expect(resolveDialoguePackBindingAgainstManifest({ studyTarget: 'fr' })).toBe('fr');
    const valid = {
      studyTarget: 'fr', scenarioId: 'coffee_order', packVersion: 'fr-native-v1-draft',
      packSha256: 'a'.repeat(64), sharedManifestSha256: 'b'.repeat(64),
    };
    for (const malformed of [
      { scenarioId: 'coffee order' },
      { scenarioId: 'Coffee_order' },
      { packVersion: 'fr--native' },
      { packVersion: ' fr-native-v1-draft' },
      { packSha256: 'A'.repeat(64) },
      { packSha256: 'not-a-sha' },
      { sharedManifestSha256: 'b'.repeat(63) },
    ]) {
      expect(() => resolveDialoguePackBindingAgainstManifest({ ...valid, ...malformed })).toThrow(
        'premium_dialog_pack_binding_required',
      );
    }
  });

  it('fails closed when a native binding does not exactly match its manifest pin', () => {
    const pin: DialoguePackBindingPin = {
      studyTarget: 'de', scenarioId: 'coffee_order', packVersion: 'de-native-v1-draft',
      packSha256: 'a'.repeat(64), sharedManifestSha256: 'b'.repeat(64),
    };
    const manifest = { 'de:coffee_order': pin };
    for (const mismatch of [{ scenarioId: 'doctor_visit' }, { packVersion: 'de-native-v2-draft' }, { packSha256: 'c'.repeat(64) }, { sharedManifestSha256: 'd'.repeat(64) }]) {
      expect(() => resolveDialoguePackBindingAgainstManifest({ ...pin, ...mismatch }, manifest)).toThrow('premium_dialog_pack_binding_mismatch');
    }
  });

  it('maps each binding failure to its exact stream HTTP error', () => {
    expect(dialogueContractHttpError(
      new FakeHttpsError('invalid-argument', 'premium_dialog_unsupported_study_target'),
    )).toEqual({ status: 400, error: 'premium_dialog_unsupported_study_target' });
    expect(dialogueContractHttpError(
      new FakeHttpsError('invalid-argument', 'premium_dialog_pack_binding_required'),
    )).toEqual({ status: 400, error: 'premium_dialog_pack_binding_required' });
    expect(dialogueContractHttpError(
      new FakeHttpsError('failed-precondition', 'premium_dialog_pack_binding_mismatch'),
    )).toEqual({ status: 412, error: 'premium_dialog_pack_binding_mismatch' });
    expect(dialogueContractHttpError(
      new FakeHttpsError('failed-precondition', 'premium_dialog_study_target_unavailable'),
    )).toEqual({ status: 412, error: 'premium_dialog_study_target_unavailable' });
    expect(dialogueContractHttpError(new Error('internal detail'))).toEqual({
      status: 400,
      error: 'premium_dialog_unsupported_study_target',
    });
  });

  it('rejects a clear English leak for every non-English target', () => {
    const leak = 'The coffee is good and you are in the shop with your friend today for the week.';
    for (const studyTarget of ['es', 'fr', 'de'] as const) {
      expect(() => assertDialogueStudyLanguage({
        text: leak,
        studyTarget,
        feature: 'premium_dialog',
      })).toThrow('premium_dialog_wrong_language');
    }
  });

  it.each([
    ['es', 'Can I pay by card?'],
    ['fr', 'I would like coffee.'],
    ['de', 'Please give me the bill.'],
  ] as const)('rejects a short English learner phrase for %s', (studyTarget, text) => {
    expect(() => assertDialogueStudyLanguage({ text, studyTarget, feature: 'premium_dialog' }))
      .toThrow('premium_dialog_wrong_language');
  });

  it.each(['Hello!', 'How are things?', 'Tell me about your family.', 'Good morning!', 'Nice to meet you!'])(
    'rejects basic English leakage for every non-English target: %s',
    (text) => {
      for (const studyTarget of ['es', 'fr', 'de'] as const) {
        expect(() => assertDialogueStudyLanguage({ text, studyTarget, feature: 'premium_dialog' }))
          .toThrow('premium_dialog_wrong_language');
      }
    },
  );

  it.each([
    ['es', 'Je voudrais un café, merci.'],
    ['fr', 'Ich möchte einen Kaffee, bitte.'],
    ['de', 'Quiero una mesa, por favor.'],
  ] as const)('rejects a short cross-language phrase for %s', (studyTarget, text) => {
    expect(() => assertDialogueStudyLanguage({ text, studyTarget, feature: 'premium_dialog' }))
      .toThrow('premium_dialog_wrong_language');
  });

  it.each(['Anna', 'Café Central', 'Hotel Europa'])('allows a neutral proper name: %s', (text) => {
    for (const studyTarget of ['en', 'es', 'fr', 'de'] as const) {
      expect(() => assertDialogueStudyLanguage({ text, studyTarget, feature: 'premium_dialog' })).not.toThrow();
    }
  });
});
