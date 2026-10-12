import { triLang } from '../constants/i18n';

// зачем (координатор 12.10, 🔴): pt-BR/vi/id/tr/pl видимы в выпуске, а словарь без их ключа отдавал РУССКИЙ (~2400 словарей,
// docs/phraseman-2.0/I18N_FALLBACK_5LANG_R1.md). Страховка: свой ключ → en → ru последним. ru/uk/es не меняются.
const FIVE = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('triLang fallback for pt-BR/vi/id/tr/pl', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { warn.mockRestore(); });

  it.each(FIVE)('%s: own key wins over en and ru', (lang) => {
    const dict = { ru: 'Рус', uk: 'Укр', en: 'Eng', es: 'Esp', 'pt-BR': 'PT', vi: 'VI', id: 'ID', tr: 'TR', pl: 'PL' };
    expect(triLang(lang, dict)).toBe(dict[lang]);
  });

  it.each(FIVE)('%s: no own key → English, not Russian', (lang) => {
    expect(triLang(lang, { ru: 'Сохранить', uk: 'Зберегти', en: 'Save', es: 'Guardar' })).toBe('Save');
  });

  it.each(FIVE)('%s: neither own key nor en → Russian stays the last resort', (lang) => {
    expect(triLang(lang, { ru: 'Только русский', uk: 'Тільки українська', es: 'Solo español' })).toBe('Только русский');
  });

  it('ru, uk and es are unchanged', () => {
    const dict = { ru: 'Рус', uk: 'Укр', en: 'Eng', es: 'Esp' };
    expect(triLang('ru', dict)).toBe('Рус');
    expect(triLang('uk', dict)).toBe('Укр');
    expect(triLang('es', dict)).toBe('Esp');
  });

  it('logs [I18N-FALLBACK] once per string and language, with the chosen target', () => {
    const dict = { ru: 'Уникальная строка страховки пяти языков', uk: 'Унікальний', en: 'Unique', es: 'Única' };
    triLang('pt-BR', dict);
    triLang('pt-BR', dict);
    triLang('vi', dict);
    const calls = warn.mock.calls.map((c) => String(c[0])).filter((line) => line.includes('[I18N-FALLBACK]') && line.includes('Уникальная строка страховки'));
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('lang=pt-BR→en');
    expect(calls[1]).toContain('lang=vi→en');
  });
});
