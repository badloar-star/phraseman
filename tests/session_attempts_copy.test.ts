import {
  SESSION_ATTEMPTS_COPY_LOCALES,
  getSessionAttemptsCopy,
} from '../app/session_attempts/session_attempts_copy';

describe('session attempts copy', () => {
  test('ships complete copy for every supported interface locale', () => {
    expect(SESSION_ATTEMPTS_COPY_LOCALES).toEqual([
      'ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
    ]);

    for (const locale of SESSION_ATTEMPTS_COPY_LOCALES) {
      const copy = getSessionAttemptsCopy(locale);
      expect(copy.exhaustedTitle.trim()).not.toBe('');
      expect(copy.exhaustedBody.trim()).not.toBe('');
      expect(copy.useGift.trim()).not.toBe('');
      expect(copy.restoreForRunes.trim()).not.toBe('');
      expect(copy.endSession.trim()).not.toBe('');
      expect(copy.notEnoughRunes(1).trim()).not.toBe('');
      expect(copy.permanentGift.trim()).not.toBe('');
      expect(copy.attemptsStatus(2, 3)).toContain('2');
      expect(copy.attemptsStatus(2, 3)).toContain('3');
    }
  });

  test('uses the owner-approved Russian naming and price', () => {
    const copy = getSessionAttemptsCopy('ru');
    expect(copy.exhaustedTitle).toBe('Попытки закончились');
    expect(copy.exhaustedBody).toBe('Восстановите все 3 попытки и повторите этот вопрос.');
    expect(copy.useGift).toBe('Использовать подарок');
    expect(copy.restoreForRunes).toBe('Восстановить · 25 рун');
    expect(copy.endSession).toBe('Завершить сессию');
    expect(copy.permanentGift).toBe('Без срока действия');
    expect(copy.attemptsStatus(2, 3)).toBe('Попытки: 2 из 3');
  });

  test('falls back safely to Russian for an unknown persisted locale', () => {
    expect(getSessionAttemptsCopy('xx').exhaustedTitle).toBe('Попытки закончились');
  });
});
