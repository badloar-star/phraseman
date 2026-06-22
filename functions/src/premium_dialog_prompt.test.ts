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
  asInterfaceLang,
  buildCompanionSystemPrompt,
  buildScenarioSystemPrompt,
} from './premium_dialog';

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
    expect(prompt).toContain('Do not assume Russian unless this value is Russian');
    expect(prompt).not.toContain('The learner is a Russian speaker');
  });

  it('renders companion native-language meta-help for the requested language only', () => {
    const prompt = buildCompanionSystemPrompt('A2', { weakWords: ['reservation'] }, 'pl');

    expect(prompt).toContain('Polish (pl)');
    expect(prompt).toContain('in their interface language (Polish)');
    expect(prompt).toContain('briefly in Polish');
    expect(prompt).not.toContain('asks in Russian');
    expect(prompt).not.toContain('briefly in Russian');
  });
});
