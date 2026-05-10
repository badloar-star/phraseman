jest.mock('../app/config', () => {
  const actual = jest.requireActual('../app/config') as Record<string, unknown>;
  return {
    ...actual,
    ENABLE_DEV_STUDY_TARGET_LANG: true,
  };
});

import { flashcardContentLang } from '../app/spanish_content_gate';

describe('flashcardContentLang', () => {
  it('never uses es column when studying English, even with Spanish UI', () => {
    expect(flashcardContentLang('es', 'en')).toBe('ru');
  });

  it('uses uk when UI is Ukrainian and studying English', () => {
    expect(flashcardContentLang('uk', 'en')).toBe('uk');
  });

  it('uses ru when UI is Russian and studying English', () => {
    expect(flashcardContentLang('ru', 'en')).toBe('ru');
  });

  it('uses es when UI is Spanish and studying Spanish (dev)', () => {
    expect(flashcardContentLang('es', 'es')).toBe('es');
  });

  it('uses ru/uk when studying Spanish but not Spanish UI', () => {
    expect(flashcardContentLang('ru', 'es')).toBe('ru');
    expect(flashcardContentLang('uk', 'es')).toBe('uk');
  });
});
