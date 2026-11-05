// зачем (Главная, удобство одобрено владельцем 04.11): тап по «серии» в шапке открывает статистику сразу на блоке «Серия».
// Контракт с «Темы»: маршрут /streak_stats?focus=series (ключ и значение строго такие). Сторож: чип серии ведёт именно туда.
import fs from 'node:fs';
import path from 'node:path';

describe('шапка Главной → блок «Серия»', () => {
  it("чип home-v2-streak открывает '/streak_stats?focus=series'", () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/home.tsx'), 'utf8');
    const at = src.indexOf("testID: 'home-v2-streak'");
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(at, at + 1500)).toContain("nav.push('/streak_stats?focus=series')");
  });
});

// ЗАМОК (макет approved-rev8/rev6-home-free-0, владелец 05.11 «1 в 1»): пилюля серии на Главной — одна строка «🔥 N дней», без подписи «Серия» под числом.
describe('пилюля серии: одна строка без подписи', () => {
  it('шапка не рисует подпись для home-v2-streak (подпись остаётся только в accessibilityLabel)', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/home/v2/HomeV2Header.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(src).toContain("stat.testID !== 'home-v2-coins' && stat.testID !== 'home-v2-streak'");
  });
});
