// зачем (запрос Моментов, 04.11): маршрут /streak_stats?focus=series раскрывает блок «Серия».
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/streak_stats.tsx'), 'utf8').split('\r\n').join('\n');

describe('streak_stats: ?focus=series', () => {
  it('параметр объявлен и раскрывает блок «Серия»', () => {
    expect(src).toContain('focus?: string;');
    expect(src).toContain("if (params.focus === 'series')");
    expect(src).toContain('setSeriesOpen(true);');
  });
});
