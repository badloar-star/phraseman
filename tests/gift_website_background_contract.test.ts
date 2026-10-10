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

  // снято 10.10: страница подарка перерисована редизайном сайта 21de22f31 (16.08, «синий акцент») — фон-шампанское, gift-wrap и site-background.css больше не используются
});
