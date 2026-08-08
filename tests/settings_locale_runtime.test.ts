import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SETTINGS_SOURCE = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'settings.tsx'), 'utf8');
const SETTINGS_EDU_SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'settings_edu.tsx'), 'utf8');
const SETTINGS_NOTIFICATIONS_SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'settings_notifications.tsx'), 'utf8');
const LANG_CONTEXT_SOURCE = fs.readFileSync(path.join(ROOT, 'components', 'LangContext.tsx'), 'utf8');
const THEME_CONTEXT_SOURCE = fs.readFileSync(path.join(ROOT, 'components', 'ThemeContext.tsx'), 'utf8');
const LEGACY_RUNTIME_RE = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

describe('settings planned locale runtime copy', () => {
  it('uses explicit theme labels for every interface language', () => {
    expect(SETTINGS_SOURCE).toContain('const names: Record<string, Record<Lang, string>>');
    expect(SETTINGS_SOURCE).toContain("dark: { ru: 'Форест', uk: 'Форест', es: 'Bosque', 'pt-BR': 'Floresta'");
    expect(SETTINGS_SOURCE).toContain('return entry[lang];');
    expect(SETTINGS_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('keeps education settings labels explicit for planned locales', () => {
    // settings_edu.tsx localizes rows through the L({ ... }) helper, giving an
    // explicit string per planned locale (ru/uk/es/pt-BR/vi/id/tr/pl) rather than
    // a runtime triLang fallback. Assert the helper shape and every locale key is present.
    expect(SETTINGS_EDU_SOURCE).toContain('const L = (m: Record<string, string>): string => m[lang]');
    expect(SETTINGS_EDU_SOURCE).toMatch(/label: L\(\{\s*\n\s*ru:/u);
    for (const locale of ['ru', 'uk', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      expect(SETTINGS_EDU_SOURCE).toContain(`${locale}:`);
    }
    expect(SETTINGS_EDU_SOURCE).toContain("'Verificação automática'");
    expect(SETTINGS_EDU_SOURCE).toContain("'Tự động kiểm tra'");
    expect(SETTINGS_EDU_SOURCE).toContain("'Periksa otomatis'");
    expect(SETTINGS_EDU_SOURCE).toContain("'Otomatik kontrol'");
    expect(SETTINGS_EDU_SOURCE).toContain("'Automatyczne sprawdzanie'");
    expect(SETTINGS_EDU_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('keeps notification weekday labels explicit for planned locales', () => {
    expect(SETTINGS_NOTIFICATIONS_SOURCE).toContain('const DAYS_BY_LANG: Record<Lang, readonly string[]>');
    expect(SETTINGS_NOTIFICATIONS_SOURCE).toContain("'pt-BR': DAYS_PT_BR");
    expect(SETTINGS_NOTIFICATIONS_SOURCE).toContain('vi: DAYS_VI');
    expect(SETTINGS_NOTIFICATIONS_SOURCE).toContain('id: DAYS_ID');
    expect(SETTINGS_NOTIFICATIONS_SOURCE).toContain('tr: DAYS_TR');
    expect(SETTINGS_NOTIFICATIONS_SOURCE).toContain('pl: DAYS_PL');
    expect(SETTINGS_NOTIFICATIONS_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('resolves app language and theme defaults without legacy runtime fallback markers', () => {
    expect(LANG_CONTEXT_SOURCE).toContain('const STRINGS_BY_LANG: Record<Lang, Strings>');
    expect(LANG_CONTEXT_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
    expect(THEME_CONTEXT_SOURCE).not.toContain('const fallback');
  });
});
