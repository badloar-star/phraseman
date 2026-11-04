import { paywallContextPill, paywallContextTexts } from '../app/paywall_context_texts';

describe('language_add is a course-only Plus message', () => {
  test('names an additional course language in every supported UI language', () => {
    const copy = paywallContextTexts().language_add;
    expect(copy.ru).toEqual({
      title: 'Ещё один язык для занятий',
      subtitle: 'Подключи Plus, чтобы начать курс на другом языке',
      benefit: 'Новый курс на другом языке',
    });
    expect(Object.keys(copy)).toHaveLength(9);
    for (const localized of Object.values(copy)) {
      expect(localized.title).toBeTruthy();
      expect(localized.subtitle).toBeTruthy();
      expect(localized.benefit).toBeTruthy();
      expect(localized.subtitle.toLowerCase()).toMatch(/plus/);
    }
  });

  test('does not claim a general language-limit exhaustion pill', () => {
    expect(paywallContextPill('language_add', 'en')).toBe('');
    expect(paywallContextPill('language_add', 'ru')).toBe('');
  });
});
