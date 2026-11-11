import fs from 'node:fs';
import path from 'node:path';

const read = (p: string): string => fs.readFileSync(path.join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');

describe('нативная заставка: только тёмный фон без картинки', () => {
  const appJson = JSON.parse(read('app.json')) as { expo: { plugins: unknown[] } };
  const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') as [string, Record<string, unknown> & { dark?: Record<string, unknown> }];

  it('фон #101214 и у светлой, и у тёмной; картинка — пустая прозрачная, не знак и не иконка приложения', () => {
    expect(plugin).toBeDefined();
    const props = plugin[1];
    expect(props.backgroundColor).toBe('#101214');
    expect(props.dark?.backgroundColor).toBe('#101214');
    expect(String(props.image)).toContain('splash-empty.png');
    expect(String(props.dark?.image)).toContain('splash-empty.png');
    expect(String(props.image)).not.toMatch(/splash-icon|splash-glyph|icon\.png/);
  });
  it('splash-empty.png — маленький файл (прозрачный лист), а не картинка со знаком', () => {
    expect(fs.statSync(path.join(__dirname, '..', 'assets/images/splash-empty.png')).size).toBeLessThan(2048);
  });
});
