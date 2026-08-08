import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('gift website background contract', () => {
  const assetPath = 'knowly-www/assets/gift-background-champagne-glass-v3.webp';

  it('ships the approved performance-sized variant 3 background', () => {
    expect(fs.existsSync(path.join(process.cwd(), assetPath))).toBe(true);
  });

  it('renders the asset as an accessible, readable, responsive page backdrop', () => {
    const html = read('knowly-www/gift/index.html');
    const css = read('knowly-www/assets/site-background.css');

    expect(html).toContain(
      '<link rel="stylesheet" href="/assets/site-background.css?v=20260729-1" />',
    );
    expect(html).not.toContain('gift-backdrop');
    expect(css).toContain('/assets/gift-background-champagne-glass-v3.webp');
    expect(css).toContain('position: fixed;');
    expect(css).toContain('background-size: cover;');
    expect(css).toContain('linear-gradient(rgba(255, 255, 255, .34), rgba(255, 255, 255, .24))');
  });
});
