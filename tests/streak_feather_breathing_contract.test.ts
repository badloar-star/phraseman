import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function source(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

// зачем: ТЗ «Единое перо цепочки дней» (docs/superpowers/specs/
// 2026-08-30-streak-feather-design.md) — дыхание только у КРУПНОЙ ЛИЧНОЙ
// иконки, с 20 дней, и полностью выключено при Reduce Motion. Без сторожа это
// тихо разъезжается: бесконечный цикл в списках друзей греет UI-поток, а
// пропущенный гейт фокуса греет его в свёрнутом приложении.

describe('дыхание пера цепочки', () => {
  const icon = source('components/StreakChainIcon.tsx');

  it('начинается с двадцатого дня, а не сразу', () => {
    expect(icon).toContain('BREATH_FROM_DAYS = 20');
    expect(icon).toMatch(/streakDays\s*>=\s*BREATH_FROM_DAYS/);
  });

  it('гасится при Reduce Motion и вне активного экрана', () => {
    expect(icon).toContain('useReduceMotion');
    expect(icon).toContain('useRuntimeActive');
    expect(icon).toMatch(/runtimeActive\s*&&\s*!reduceMotion/);
  });

  it('бесконечный цикл всегда идёт через общий гейт, а не напрямую', () => {
    // withRepeat(-1) допустим только под вычисленным флагом alive.
    expect(icon).toMatch(/const alive\s*=/);
    // считаем ВЫЗОВЫ в коде: комментарии выкидываем, иначе упоминание
    // withRepeat(-1) в пояснении засчитывается как второй цикл
    const code = icon
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const calls = code.match(/withRepeat\s*\(/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(icon).toMatch(/if \(alive\)[\s\S]*?withRepeat\s*\(/);
    expect(icon).toContain('cancelAnimation(breath)');
  });

  it('замороженная и погасшая цепочка не дышит', () => {
    expect(icon).toMatch(/!frozen\s*&&\s*!inactive/);
  });

  it('дышит только крупная личная иконка: Главная и статистика', () => {
    const screens: Array<[string, number]> = [
      ['app/(tabs)/home.tsx', 1],
      ['app/streak_stats.tsx', 1],
    ];
    for (const [file, expected] of screens) {
      const uses = source(file).match(/<StreakChainIcon[^>]*breathing/g) ?? [];
      expect(uses).toHaveLength(expected);
    }
  });

  it('иконки друзей остаются статичными', () => {
    const friends = source('app/(tabs)/friends.tsx');
    expect(friends).not.toMatch(/<StreakChainIcon[^>]*breathing/);
  });
});
