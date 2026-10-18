import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(__dirname, '..');
const siteRoot = path.join(root, 'knowly-www');

const publicContentPages = [
  'index.html',
  '404.html',
  'contact/index.html',
  'download/index.html',
  'gift/index.html',
  'premium/index.html',
  'russia/index.html',
  // зачем (11.10): страница /start/ удалена (1d70c8fc5), хостинг ведёт её 301 на /download/ (firebase.json).
  'start/thanks/index.html',
  'guides/index.html',
  'guides/english-15-minutes-a-day/index.html',
  'guides/english-by-phrases/index.html',
  'guides/english-phrases-for-travel/index.html',
  'guides/how-to-improve-english-pronunciation/index.html',
  'guides/how-to-learn-english/index.html',
  'guides/speaking-barrier/index.html',
  'legal/privacy/index.html',
  'legal/terms/index.html',
  'legal/data-deletion/index.html',
];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(siteRoot, relativePath), 'utf8');
}

type SiteI18n = {
  resolveLocale(input: { search: string; stored: string | null; languages: string[] }): 'en' | 'ru';
  translateValue(value: string, locale: 'en' | 'ru'): string;
  CATALOG: Record<'en' | 'ru', Record<string, unknown>>;
};

function loadSiteI18n(): SiteI18n {
  const sandbox: { KnowlySiteI18n?: SiteI18n; URLSearchParams: typeof URLSearchParams } = { URLSearchParams };
  // зачем (координатор 18.10): assets/site-i18n.locales.js удалён — ни одна страница и ни одна сборка его не подключали, а по прямой ссылке
  // он отдавал старое обещание «7-day money-back guarantee». Рантайм без каталога работает на пустом { en: {}, ru: {} } — логика та же.
  const runtimePath = path.join(siteRoot, 'assets', 'site-i18n.js');
  vm.runInNewContext(fs.readFileSync(runtimePath, 'utf8'), sandbox, { filename: runtimePath });
  if (!sandbox.KnowlySiteI18n) throw new Error('KnowlySiteI18n was not exported');
  return sandbox.KnowlySiteI18n;
}

describe('Knowly public website localization contract', () => {
  test('resolves query, saved preference, then browser language with an English fallback', () => {
    const i18n = loadSiteI18n();
    expect(i18n.resolveLocale({ search: '?lang=en', stored: 'ru', languages: ['ru-RU'] })).toBe('en');
    expect(i18n.resolveLocale({ search: '', stored: 'ru', languages: ['en-GB'] })).toBe('ru');
    expect(i18n.resolveLocale({ search: '', stored: null, languages: ['ru-RU'] })).toBe('ru');
    expect(i18n.resolveLocale({ search: '', stored: null, languages: ['de-DE'] })).toBe('en');
    expect(i18n.resolveLocale({ search: '?lang=de', stored: null, languages: ['de-DE'] })).toBe('en');
  });

  test('ships one EN/RU catalog and an accessible selector runtime', () => {
    const i18n = loadSiteI18n();
    expect(Object.keys(i18n.CATALOG).sort()).toEqual(['en', 'ru']);
    const runtime = read('assets/site-i18n.js');
    const css = read('assets/site-i18n.css');
    expect(runtime).toContain('aria-haspopup="menu"');
    expect(runtime).toContain("event.key === 'Escape'");
    expect(runtime).toContain("localStorage.setItem(STORAGE_KEY, locale)");
    expect(runtime).toContain('navigation.insertBefore(mount, primaryAction)');
    expect(css).toContain('min-width: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion');
  });

  test('keeps homepage navigation labels on one line after the language control is added', () => {
    const css = read('assets/home.css');
    expect(css).toContain('.nav a { white-space: nowrap; }');
  });

  test('normalizes non-breaking spaces without rendering an HTML entity', () => {
    const i18n = loadSiteI18n();
    expect(i18n.translateValue('3,99\u00a0€', 'en')).toBe('3,99 €');
  });

  // зачем (11.10, координатор 05:30): одобренный дизайн сайта — русскоязычный, без рантайм-переключателя языка
  // (site-i18n на страницах больше не подключается). Держим честность документа: объявленный язык совпадает с
  // текстом, у каждой страницы есть заголовок и описание для поиска — без JavaScript.
  test('every public content page declares the Russian document language it actually ships', () => {
    for (const page of publicContentPages) {
      const html = read(page);
      expect(html).toMatch(/<html\b[^>]*\blang="ru"/i);
      expect(html).not.toContain('data-i18n-switcher');
    }
  });

  test('ships title and description metadata before JavaScript runs', () => {
    for (const page of publicContentPages) {
      const html = read(page);
      expect(html).toMatch(/<title>[^<]+<\/title>/i);
      expect(html).toMatch(/<meta\b[^>]*name="description"[^>]*content="[^"]+"/i);
    }
  });

  test('the home-page level-test counter has no legacy 124,000 baseline', () => {
    const home = read('assets/home.js');
    expect(home).not.toContain('var value = 124000');
    expect(home).toContain("fetch('/api/english-test'");
  });
});
