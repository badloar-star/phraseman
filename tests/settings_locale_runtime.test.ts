import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const ROOT = path.resolve(__dirname, '..');
const SETTINGS_SOURCE = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'settings.tsx'), 'utf8'));
const SETTINGS_EDU_SOURCE = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'settings_edu.tsx'), 'utf8'));
const SETTINGS_NOTIFICATIONS_SOURCE = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'settings_notifications.tsx'), 'utf8'));
const LANG_CONTEXT_SOURCE = normalizeEol(fs.readFileSync(path.join(ROOT, 'components', 'LangContext.tsx'), 'utf8'));
const THEME_CONTEXT_SOURCE = normalizeEol(fs.readFileSync(path.join(ROOT, 'components', 'ThemeContext.tsx'), 'utf8'));
const LEGACY_RUNTIME_RE = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

describe('settings planned locale runtime copy', () => {
  // зачем (темы 2.0, сессия «ТЕМЫ 2.0», 04.10): названия тем переехали из settings.tsx в ОДИН
  // общий словарь app/theme_display_names.ts (копии названий уже разъезжались). Смысл стража
  // прежний и строже: у КАЖДОЙ действующей темы — явное имя на КАЖДОМ языке интерфейса, без подстановки.
  it('uses explicit theme labels for every interface language', () => {
    const { THEME_DISPLAY_NAMES } = require('../app/theme_display_names');
    const { LIQUID_GLASS_THEME_IDS } = require('../constants/liquidGlassThemePalette');
    const { INTERFACE_LANGS } = require('../constants/i18n');
    expect(SETTINGS_SOURCE).toContain("import { themeDisplayName } from '../theme_display_names'");
    expect(SETTINGS_SOURCE).toContain('themeDisplayName(liquidGlassThemeId, lang)');
    expect(SETTINGS_SOURCE).not.toMatch(/graphite: \{ ru: '/);
    for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const names = THEME_DISPLAY_NAMES[id] as Record<string, string | undefined> | undefined;
      expect(names).toBeDefined();
      for (const lang of INTERFACE_LANGS as readonly string[]) {
        expect([id, lang, names?.[lang]?.trim() || null]).toEqual([id, lang, expect.any(String)]);
      }
    }
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

  // зачем (11.10): матрицу дней недели заменило одно время на все дни (решение владельца 2026-07-26, шапка
  // settings_notifications.tsx) — подписей дней больше нет. Держим главное: тексты экрана идут через Record<Lang>,
  // без старых ветвлений ru/uk/es и без возврата матрицы дней.
  it('keeps notification copy explicit for planned locales without the retired weekday matrix', () => {
    expect(SETTINGS_NOTIFICATIONS_SOURCE).toContain('Record<Lang, string>');
    expect(SETTINGS_NOTIFICATIONS_SOURCE).not.toContain('DAYS_BY_LANG');
    expect(SETTINGS_NOTIFICATIONS_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('resolves app language and theme defaults without legacy runtime fallback markers', () => {
    expect(LANG_CONTEXT_SOURCE).toContain('const STRINGS_BY_LANG: Record<Lang, Strings>');
    expect(LANG_CONTEXT_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
    expect(THEME_CONTEXT_SOURCE).not.toContain('const fallback');
  });
});
