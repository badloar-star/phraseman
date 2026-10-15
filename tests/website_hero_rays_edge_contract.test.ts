import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('website desktop hero rays edge contract', () => {
  it('extends the decorative rays to the viewport edge without shifting their left edge', () => {
    const css = read('knowly-www/assets/phraseman.css');
    const desktopOverride = css.match(
      /@media \(min-width: 761px\) \{\s*\.hero-rays \{([\s\S]*?)\}\s*\}/,
    )?.[1] ?? '';

    expect(desktopOverride).toContain('right: calc(50% - 50vw);');
    expect(desktopOverride).toContain('width: calc(min(100%, 900px) + 50vw - 50%);');
  });

  // зачем (11.10, координатор 05:30): главная переехала на одобренный дизайн и phraseman.css больше не подключает,
  // так что версия ?v=wowN на ней не нужна. Держим: главная берёт общее оформление сайта.
  it('the homepage uses the shared approved stylesheet', () => {
    const html = read('knowly-www/index.html');

    // зачем (15.10): общее оформление сайта теперь 2.0 — /assets/v2/base.css (с версией для сброса кэша), прежний файл не подключается
    expect(html).toMatch(/<link rel="stylesheet" href="\/assets\/v2\/base\.css(?:\?v=[0-9a-z]+)?">/);
    expect(html).not.toContain('/assets/approved/site.css');
  });
});
