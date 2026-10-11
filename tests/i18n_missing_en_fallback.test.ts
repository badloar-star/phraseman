import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { triLang } from '../constants/i18n';

// Английский интерфейс выключен в проде (app/config.ts) — для проверки запасного пути включаем его только в этом тесте.
let mockEnglishEnabled = true;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get ENGLISH_UI_LOCALE_ENABLED() { return mockEnglishEnabled; },
}));

// зачем (координатор 12.10, подготовка к включению английского интерфейса, решение по флагу 14.10): словарь без ключа `en` раньше молча
// отдавал РУССКИЙ при lang==='en'. Теперь — запасной es и одна строка [I18N-FALLBACK] в журнал; число таких словарей не растёт (храповик).
describe('triLang without an English key', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { warn.mockRestore(); });

  it('returns the English text when it exists', () => {
    expect(triLang('en', { ru: 'Привет', uk: 'Привіт', en: 'Hello', es: 'Hola' })).toBe('Hello');
  });

  it('falls back to Spanish, not Russian, and logs [I18N-FALLBACK] once per string', () => {
    const dict = { ru: 'Уникальная строка для теста запасного языка', uk: 'Унікальний рядок', es: 'Cadena única de prueba' };
    expect(triLang('en', dict)).toBe('Cadena única de prueba');
    expect(triLang('en', dict)).toBe('Cadena única de prueba');
    const calls = warn.mock.calls.filter((c) => String(c[0]).includes('[I18N-FALLBACK]'));
    expect(calls).toHaveLength(1);
    expect(String(calls[0]![0])).toContain('Уникальная строка для теста запасного языка');
  });

  it('while the English interface is switched off nothing changes: en still gets the Russian text and no log', () => {
    mockEnglishEnabled = false;
    try {
      expect(triLang('en', { ru: 'Привет, мир', uk: 'Привіт, світе', es: 'Hola, mundo' })).toBe('Привет, мир');
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('[I18N-FALLBACK]'))).toHaveLength(0);
    } finally {
      mockEnglishEnabled = true;
    }
  });

  it('keeps ru and uk untouched', () => {
    const dict = { ru: 'Привет', uk: 'Привіт', es: 'Hola' };
    expect(triLang('ru', dict)).toBe('Привет');
    expect(triLang('uk', dict)).toBe('Привіт');
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('[I18N-FALLBACK]'))).toHaveLength(0);
  });
});

describe('dictionaries without an English key never grow', () => {
  it('scan_missing_en_dictionaries passes against config/missing-en-baseline.json', () => {
    const root = path.resolve(__dirname, '..');
    const out = execFileSync(process.execPath, [path.join(root, 'scripts', 'scan_missing_en_dictionaries.mjs')], { cwd: root, encoding: 'utf8', timeout: 120_000 });
    expect(out).toMatch(/OK|Стало лучше/);
  });
});
