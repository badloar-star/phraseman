// R35 (Ревизор 15.10): ступень Пика засчитывала день серии «в обход» — updateStreakOnActivity напрямую, без сигнала дня:
// огонь контурный, нет «День засчитан», рубежа, истории и синка серии. Теперь — общий touchStreakForToday('activity:spire_steps').
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'spire_report_client.ts'), 'utf8');

describe('Пик засчитывает день серии общим путём', () => {
  it('markSpireStreakDay идёт через touchStreakForToday, прямого updateStreakOnActivity нет', () => {
    expect(src).toContain("touchStreakForToday('activity:spire_steps')");
    expect(src).not.toMatch(/updateStreakOnActivity\(\)/);
  });
});
