import fs from 'fs';
import path from 'path';

const WEBSITE_ROOT = path.join(process.cwd(), 'knowly-www');
const GLOBAL_STYLESHEET = '<link rel="stylesheet" href="/assets/site-background.css?v=20260729-1" />';
const EXCLUDED_HTML = new Map([
  ['googled573b3a1e90712e4.html', 'Google ownership verification token'],
  ['phraseman/apple-auth/index.html', 'authentication callback protocol shim'],
  ['phraseman/duel/index.html', 'immediate legacy deep-link redirect shim'],
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

  it('classifies the complete 24-file HTML inventory with only justified shims excluded', () => {
    expect(htmlFiles).toHaveLength(24);
    expect(humanFacingFiles).toHaveLength(21);
    expect([...EXCLUDED_HTML.keys()].sort()).toEqual([
      'googled573b3a1e90712e4.html',
      'phraseman/apple-auth/index.html',
      'phraseman/duel/index.html',
    ]);
  });

  it.each(humanFacingFiles)('%s links the shared cache-busted stylesheet exactly once', (file) => {
    const html = read(file);
    expect(html.split(GLOBAL_STYLESHEET)).toHaveLength(2);
  });

  it('keeps exact/minimal machine and protocol surfaces free of visual dependencies', () => {
    expect(read('googled573b3a1e90712e4.html')).toBe(
      'google-site-verification: googled573b3a1e90712e4.html',
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
