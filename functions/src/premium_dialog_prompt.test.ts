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
  assertDialogReplyMatchesTarget,
  assertDialogTranslationLanguage,
  asTargetLang,
  containsUnsafeRegulatedAdvice,
  sanitizeRegulatedAdviceReply,
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

  it('keeps regulated professional advice out of every live dialog prompt', () => {
    const prompt = buildScenarioSystemPrompt('A2', {
      interfaceLang: 'ru',
      role: 'a pharmacy counter assistant',
      setting: 'a pharmacy counter',
      goalEn: 'ask who to speak to for professional advice',
    });

    expect(prompt).toContain('REGULATED ADVICE HARD STOP');
    expect(prompt).toContain('Never diagnose, prescribe, recommend medicines');
    expect(prompt).toContain('practice safe wording only');
    expect(prompt).toContain('qualified professional');
  });

  it('sanitizes unsafe medical recommendations before they can reach the client', () => {
    const unsafe =
      'I understand you have a headache. I can suggest some tablets for you. For headaches, I recommend paracetamol. Do you need help with the dosage?';

    expect(containsUnsafeRegulatedAdvice(unsafe)).toBe(true);
    expect(sanitizeRegulatedAdviceReply(unsafe, 'en')).toBe(
      "I can't choose a real treatment here. Please ask a qualified professional. You can say: [[I need professional advice]].",
    );
  });

  it('does not sanitize ordinary non-medical roleplay recommendations', () => {
    const normal = "I recommend the chef's special today. Would you like a table?";
    expect(containsUnsafeRegulatedAdvice(normal)).toBe(false);
    expect(sanitizeRegulatedAdviceReply(normal, 'en')).toBe(normal);
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

  it('rejects a non-English live dialog reply before it can reach the client (default en target)', () => {
    expect(() => assertDialogReplyMatchesTarget('Good morning! [[I would like coffee]].')).not.toThrow();
    expect(() => assertDialogReplyMatchesTarget('Привет, давай потренируем фразу.')).toThrow('dialog_provider_failed');
  });

  it('keeps translation cache keys and language guards separated by target UI language', () => {
    const source = 'Could I have a coffee, please?';
    expect(translationCacheId(source, 'ru')).not.toBe(translationCacheId(source, 'es'));
    expect(translationCacheId(source, 'ru', 'en')).not.toBe(translationCacheId(source, 'ru', 'fr'));
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

describe('premium dialog — study-target (French) parametrization', () => {
  it('builds a French scenario prompt that instructs French output, not English (DoD 3)', () => {
    const prompt = buildScenarioSystemPrompt('A2', {
      interfaceLang: 'ru',
      studyTarget: 'fr',
      role: 'a friendly barista',
      setting: 'a cafe',
      goalEn: 'order coffee',
    });

    expect(prompt).toContain('ALWAYS in French');
    expect(prompt).toContain('This is French practice');
    expect(prompt).toContain('reply ONLY in French');
    // The English-target wording must NOT appear for a French learner.
    expect(prompt).not.toContain('ALWAYS in English');
    expect(prompt).not.toContain('This is English practice');
    // The native-language profile stays the learner's UI language.
    expect(prompt).toContain('Russian (ru)');
  });

  it('builds a French companion prompt that answers in French (DoD 3)', () => {
    const prompt = buildCompanionSystemPrompt('A2', { weakWords: ['réservation'] }, 'pl', 'fr');
    expect(prompt).toContain('French-speaking friend');
    expect(prompt).toContain('still ANSWER IN FRENCH');
    expect(prompt).not.toContain('still ANSWER IN ENGLISH');
  });

  it('the English scenario prompt is unchanged when studyTarget defaults or is en (DoD 4)', () => {
    const base = {
      interfaceLang: 'ru' as const,
      role: 'a friendly barista',
      setting: 'a cafe',
      goalEn: 'order coffee',
    };
    const withoutTarget = buildScenarioSystemPrompt('A2', base);
    const withEnTarget = buildScenarioSystemPrompt('A2', { ...base, studyTarget: 'en' });
    expect(withEnTarget).toBe(withoutTarget);
    expect(withoutTarget).toContain('ALWAYS in English');
  });

  it('the reply guard passes French for a fr target (DoD 3)', () => {
    // A natural French reply (Latin script, no English stopword flood) is accepted.
    expect(() => assertDialogReplyMatchesTarget('Bonjour ! [[Je voudrais un café]].', 'fr')).not.toThrow();
    expect(() =>
      assertDialogReplyMatchesTarget('Très bien, et vous, comment allez-vous aujourd’hui ?', 'fr'),
    ).not.toThrow();
  });

  it('the reply guard rejects a Cyrillic (learner-language) reply for both en and fr targets (DoD 3)', () => {
    // The learner writing in their own language must never come back as the assistant reply.
    expect(() => assertDialogReplyMatchesTarget('Привет, давай потренируем фразу вместе.', 'fr')).toThrow(
      'dialog_provider_failed',
    );
    expect(() => assertDialogReplyMatchesTarget('Привет, давай потренируем фразу вместе.', 'en')).toThrow(
      'dialog_provider_failed',
    );
  });

  it('the reply guard rejects an English-stopword-flooded reply for a fr target (DoD 3)', () => {
    // Enough English function words in a row = the model drifted to English during French practice.
    expect(() =>
      assertDialogReplyMatchesTarget(
        'The coffee is good and you are in the shop with your friend today for the week.',
        'fr',
      ),
    ).toThrow('dialog_provider_failed');
  });
});
