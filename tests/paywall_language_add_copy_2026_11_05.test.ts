// Пейвол «ещё один язык» (макет Codex variant-3): тексты ru дословно по макету, все 9 языков заполнены, название языка в подзаголовке.
import { paywallLanguageAddCopy } from '../app/paywall_language_add_copy';
import type { Lang } from '../constants/i18n';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('тексты пейвола «ещё один язык»', () => {
  it('ru — дословно по макету variant-3', () => {
    const c = paywallLanguageAddCopy('ru', 'de');
    expect(c.title).toBe('Ещё один язык. Больше тебя.');
    expect(c.subtitle).toBe('Добавь немецкий с PhraseMan Plus.');
    expect(c.benefits.map((b) => b.title)).toEqual(['Языки на выбор', 'Курс дальше', 'Больше практики']);
    expect(c.benefits.map((b) => b.detail)).toEqual(['Дополнительные языки с Plus', 'Продолжение после урока 3', 'Видео, диалоги и карточки']);
    expect(c.paragraph).toBe('В первом выбранном языке уроки 1–3 бесплатны. Для продолжения и дополнительных языков нужен Plus.');
  });
  it('все 9 языков: непустые строки, три пункта, число бесплатных уроков в абзаце', () => {
    for (const lang of LANGS) {
      const c = paywallLanguageAddCopy(lang, 'fr');
      expect(c.title.length).toBeGreaterThan(5);
      expect(c.subtitle).toContain('PhraseMan Plus');
      expect(c.subtitle).not.toContain('{x}');
      expect(c.benefits).toHaveLength(3);
      for (const b of c.benefits) { expect(b.title.length).toBeGreaterThan(2); expect(b.detail.length).toBeGreaterThan(2); }
      expect(c.paragraph).toContain('1–3');
    }
  });
  it('нет языка цели — подзаголовок без названия (не «undefined»), украинский — винительный падеж', () => {
    expect(paywallLanguageAddCopy('en', null).subtitle).toBe('Add another language with PhraseMan Plus.');
    expect(paywallLanguageAddCopy('uk', 'de').subtitle).toBe('Додай німецьку з PhraseMan Plus.');
  });
});
