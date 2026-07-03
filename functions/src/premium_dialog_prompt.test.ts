class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'sk-test-key' }),
}));

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(),
}));

jest.mock('./callable_options', () => ({
  ENFORCE_APP_CHECK_OPENAI: false,
}));

import {
  __premiumDialogTestHooks,
  asInterfaceLang,
  buildCompanionSystemPrompt,
  buildScenarioSystemPrompt,
} from './premium_dialog';

const {
  assertDialogReplyIsEnglish,
  assertDialogTranslationLanguage,
  asTargetLang,
  translationCacheId,
} = __premiumDialogTestHooks;

describe('premium dialog prompt language isolation', () => {
  it('accepts every app UI language and fails closed on unknown values', () => {
    expect(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'].map(asInterfaceLang)).toEqual([
      'ru',
      'uk',
      'es',
      'pt-BR',
      'vi',
      'id',
      'tr',
      'pl',
    ]);
    expect(() => asInterfaceLang('pt_BR')).toThrow('premium_dialog_unsupported_language');
    expect(() => asInterfaceLang('vn')).toThrow('premium_dialog_unsupported_language');
  });

  it('renders scenario prompts with the caller interface language, not a hard-coded Russian profile', () => {
    const prompt = buildScenarioSystemPrompt('A2', {
      interfaceLang: 'es',
      role: 'a friendly barista',
      setting: 'a cafe',
      goalEn: 'order coffee',
    });

    expect(prompt).toContain('Spanish (es)');
    // No Russian assumption for a Spanish learner.
    expect(prompt).not.toContain('The learner is a Russian speaker');
    expect(prompt).not.toContain('Russian (ru)');
  });

  it('locks every reply to English regardless of the learner language (scenario)', () => {
    const prompt = buildScenarioSystemPrompt('A2', {
      interfaceLang: 'ru',
      role: 'a friendly barista',
      setting: 'a cafe',
      goalEn: 'order coffee',
    });

    // The absolute output-language rule must be present, with no exception.
    expect(prompt).toContain('OUTPUT LANGUAGE (ABSOLUTE RULE)');
    expect(prompt).toContain('ALWAYS in English');
    expect(prompt).toContain('There are NO exceptions to this rule');
    // End-of-prompt reinjection re-states English-only.
    expect(prompt).toContain('reply ONLY in English');
  });

  it('tells scenario mode to speak in-scene instead of narrating metadata', () => {
    const prompt = buildScenarioSystemPrompt('B1', {
      interfaceLang: 'ru',
      role: 'a worried neighbor',
      setting: "a doorway where a neighbor asks about a missing cat near the learner's flat",
      goalEn: 'ask whether the learner has seen the cat',
      persona: 'Your name is Walter. You are worried but polite.',
    });

    expect(prompt).toContain('continue from the learner');
    expect(prompt).toContain('NEVER describe the scenario from outside');
    expect(prompt).toContain('NEVER say "the learner"');
    expect(prompt).toContain('NEVER repeat the setting as narration');
  });

  it('companion answers in English even when asked in the native language (no L1 meta-help leak)', () => {
    const prompt = buildCompanionSystemPrompt('A2', { weakWords: ['reservation'] }, 'pl');

    expect(prompt).toContain('Polish (pl)');
    // The old "answer briefly in Polish" exception must be gone.
    expect(prompt).not.toContain('briefly in Polish');
    expect(prompt).not.toContain('in their interface language (Polish)');
    // New contract: even if asked in Polish, answer in English.
    expect(prompt).toContain('still ANSWER IN ENGLISH');
    expect(prompt).toContain('OUTPUT LANGUAGE (ABSOLUTE RULE)');
  });

  it('rejects a non-English live dialog reply before it can reach the client', () => {
    expect(() => assertDialogReplyIsEnglish('Good morning! [[I would like coffee]].')).not.toThrow();
    expect(() => assertDialogReplyIsEnglish('Привет, давай потренируем фразу.')).toThrow('dialog_provider_failed');
  });

  it('keeps translation cache keys and language guards separated by target UI language', () => {
    const source = 'Could I have a coffee, please?';
    expect(translationCacheId(source, 'ru')).not.toBe(translationCacheId(source, 'es'));
    expect(asTargetLang('pt-BR')).toBe('pt-BR');
    expect(() => asTargetLang('fr')).toThrow('premium_dialog_translate_unsupported_language');
  });

  it('rejects cached or fresh translations that do not match the requested UI language', () => {
    expect(() => assertDialogTranslationLanguage('Сегодня хороший шаг.', 'ru')).not.toThrow();
    expect(() => assertDialogTranslationLanguage('Today you keep a good small practice step.', 'ru')).toThrow(
      'premium_dialog_translate_wrong_language',
    );
  });
});
