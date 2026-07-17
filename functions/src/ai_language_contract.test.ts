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
  LANGUAGE_CONTRACT_VERSION,
  assertAiJsonTextFieldsLanguage,
  resolveAiOutputLang,
  resolveStudyTarget,
  studyTargetName,
} from './ai_language_contract';

describe('ai_language_contract', () => {
  it('keeps supported UI output languages exact', () => {
    expect(LANGUAGE_CONTRACT_VERSION).toBe('ai-language-contract-v1');
    expect(resolveAiOutputLang('pt-BR', 'explain')).toBe('pt-BR');
    expect(resolveAiOutputLang('PT-br', 'explain')).toBe('pt-BR');
    expect(resolveAiOutputLang('uk', 'weekly_review')).toBe('uk');
  });

  it('fails closed for unsupported output languages', () => {
    expect(() => resolveAiOutputLang('xx', 'explain')).toThrow('explain_unsupported_language');
  });

  it('preserves French study target separately from interface language', () => {
    expect(resolveStudyTarget('fr')).toBe('fr');
    expect(resolveStudyTarget('en')).toBe('en');
    expect(resolveStudyTarget('xx')).toBe('en');
  });

  it('maps study targets to their human names (single source of truth)', () => {
    expect(studyTargetName('en')).toBe('English');
    expect(studyTargetName('fr')).toBe('French');
  });

  it('rejects visible JSON fields that look like the wrong language', () => {
    expect(() =>
      assertAiJsonTextFieldsLanguage({
        targetLang: 'ru',
        feature: 'weekly_review',
        texts: ['Today you keep a good small practice step with your phrases.'],
      }),
    ).toThrow('weekly_review_wrong_language');
  });
});
