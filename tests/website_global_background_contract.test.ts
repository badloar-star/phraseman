import fs from 'fs';
import path from 'path';

const WEBSITE_ROOT = path.join(process.cwd(), 'knowly-www');
// зачем (11.10, координатор 05:30): сайт переведён на одобренный дизайн — каждая страница подключает общий
// /assets/approved/site.css (0217c4a21 и далее), общий фон site-background.css и рантайм перевода site-i18n больше
// не подключаются (остался только у лендинга приглашения). Сторож держит ту же цель: ни одна публичная страница не
// выпадает из общего оформления, служебные страницы остаются без визуальных зависимостей.
// зачем (15.10, дизайн 2.0 bc525a28a по «да» владельца): общий файл оформления теперь /assets/v2/base.css (с ?v= для сброса
// кэша) — его подключают ВСЕ человеческие страницы, включая ссылки, приглашение и служебные заглушки (у них уже был общий
// voice-design.css). Цель сторожа прежняя: ни одна публичная страница не выпадает из общего оформления, ровно одно подключение.
const GLOBAL_STYLESHEET_RE = /<link rel="stylesheet" href="\/assets\/v2\/base\.css(?:\?v=[0-9a-z]+)?">/g;
const EXCLUDED_HTML = new Map([
  ['google608bff17010f9de1.html', 'Google Search Console verification token (a4bf2b7d2)'],
  ['googled573b3a1e90712e4.html', 'Google ownership verification token'],
]);

function collectHtmlFiles(directory: string, prefix = ''): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? collectHtmlFiles(absolutePath, relativePath)
      : entry.name.endsWith('.html')
        ? [relativePath]
        : [];
  });
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(WEBSITE_ROOT, relativePath), 'utf8');
}

describe('public website global background contract', () => {
  const htmlFiles = collectHtmlFiles(WEBSITE_ROOT).sort();
  const humanFacingFiles = htmlFiles.filter((file) => !EXCLUDED_HTML.has(file));

  it('classifies the complete 29-file HTML inventory with only machine verification tokens excluded', () => {
    // зачем (15.10): +1 файл подтверждения Search Console (a4bf2b7d2); ссылки, приглашение и заглушки теперь на общем оформлении 2.0.
    expect(htmlFiles).toHaveLength(29);
    expect(humanFacingFiles).toHaveLength(27);
    expect([...EXCLUDED_HTML.keys()].sort()).toEqual([
      'google608bff17010f9de1.html',
      'googled573b3a1e90712e4.html',
    ]);
  });

  it.each(humanFacingFiles)('%s links the shared 2.0 stylesheet exactly once and no retired one', (file) => {
    const html = read(file);
    expect(html.match(GLOBAL_STYLESHEET_RE) ?? []).toHaveLength(1);
    expect(html).not.toContain('/assets/approved/site.css');
  });

  it('keeps exact/minimal machine and protocol surfaces free of visual dependencies', () => {
    expect(read('googled573b3a1e90712e4.html')).toBe(
      'google-site-verification: googled573b3a1e90712e4.html',
    );
    expect(read('google608bff17010f9de1.html').trim()).toBe(
      'google-site-verification: google608bff17010f9de1.html',
    );

    const appleAuth = read('phraseman/apple-auth/index.html');
    expect(appleAuth).toContain('phraseman://apple-auth');
    expect(appleAuth).not.toContain('/assets/site-background.css');

    const duel = read('phraseman/duel/index.html');
    expect(duel).toContain('http-equiv="refresh"');
    expect(duel).toContain("location.replace('/download/')");
    expect(duel).not.toContain('/assets/site-background.css');
  });

  it('ships one fixed, responsive, non-interactive shared backdrop', () => {
    const css = read('assets/site-background.css');

    expect(fs.existsSync(path.join(WEBSITE_ROOT, 'assets/gift-background-champagne-glass-v3.webp'))).toBe(true);
    expect(css).toContain('url("/assets/gift-background-champagne-glass-v3.webp")');
    expect(css).toContain('body::before');
    expect(css).toContain('position: fixed;');
    expect(css).toContain('background-size: cover;');
    expect(css).toContain('pointer-events: none;');
    expect(css).toContain('.bg');
    expect(css).toContain('html[data-theme="light"] .bg');
    expect(css).toContain('.km-page-bg');
    expect(css).toContain(
      'linear-gradient(rgba(10, 10, 14, .82), rgba(10, 10, 14, .88))',
    );
    expect(css).toContain(
      'linear-gradient(rgba(7, 10, 16, .8), rgba(7, 10, 16, .86))',
    );
  });

  it('removes the superseded gift-only backdrop implementation', () => {
    const gift = read('gift/index.html');

    expect(gift).not.toContain('gift-backdrop');
  });
});
