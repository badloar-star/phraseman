import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('premium modal hero layout contract', () => {
  it('hero block exists and spans full width with a filled background', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'premium_modal.tsx'), 'utf8');
    const heroStart = source.indexOf('{/* БЛОК 1: Герой */}');

    expect(heroStart).toBeGreaterThanOrEqual(0);

    const heroBlock = source.slice(heroStart, heroStart + 2000);
    // Hero card spans full width.
    expect(heroBlock).toContain("width: '100%'");
    // Бэкдроп-картинку заменили на градиентные слои, заполняющие карточку
    // (StyleSheet.absoluteFill*). Контракт: фон героя заполнен на всю карточку.
    expect(heroBlock).toMatch(/StyleSheet\.absoluteFill(Object)?/);
  });
});
