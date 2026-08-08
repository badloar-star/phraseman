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

  it('bumps the homepage stylesheet version so browsers receive the edge fix', () => {
    const html = read('knowly-www/index.html');
    const match = html.match(/\/assets\/phraseman\.css\?v=wow(\d+)/);

    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThanOrEqual(6);
  });
});
