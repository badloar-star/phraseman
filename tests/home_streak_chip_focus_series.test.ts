// зачем (Главная, удобство одобрено владельцем 04.11): тап по «серии» в шапке открывает статистику сразу на блоке «Серия».
// Контракт с «Темы»: маршрут /streak_stats?focus=series (ключ и значение строго такие). Сторож: чип серии ведёт именно туда.
import fs from 'node:fs';
import path from 'node:path';

describe('шапка Главной → блок «Серия»', () => {
  it("чип home-v2-streak открывает '/streak_stats?focus=series'", () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/home.tsx'), 'utf8');
    const at = src.indexOf("testID: 'home-v2-streak'");
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(at, at + 700)).toContain("nav.push('/streak_stats?focus=series')");
  });
});
