// зачем (R69, Сверка 15.10): на «Итоге урока» шов на y=132 px (граница верхнего inset Pixel 8): ниже плоский #eaebfe (корень V2DoneScreen), выше — полотно ScreenGradient #f3f4fd, а заголовок стоял ниже, чем на других
// экранах: хост lesson_complete оборачивал V2DoneScreen в SafeAreaView (отступ inset) — и сам экран добавлял paddingTop: insets.top + 8 ВТОРОЙ раз. Один источник отступа — сам экран, SafeAreaView хоста без отступов.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('R69: «Итог урока» — одно полотно сверху, один источник отступа', () => {
  it('V2DoneScreen сам держит верхний и нижний отступ (иначе SafeAreaView хоста обязан отступать)', () => {
    const done = read('components/completion/V2DoneScreen.tsx');
    expect(done).toContain('paddingTop: insets.top + 8');
    expect(done).toContain('paddingBottom: 170 + insets.bottom');
    expect(done).toContain('paddingBottom: Math.max(24, insets.bottom + 16)'); // док
  });

  it('хост показывает V2DoneScreen внутри SafeAreaView без отступов (edges={[]}), поверх ScreenGradient', () => {
    const host = read('app/lesson_complete.tsx');
    const start = host.indexOf('<V2DoneScreen');
    expect(start).toBeGreaterThan(0);
    const before = host.slice(Math.max(0, start - 1500), start);
    expect(before).toContain('<SafeAreaView edges={[]} style={{ flex: 1 }}>');
    expect(before).toContain('<ScreenGradient>');
    expect(before).not.toMatch(/<SafeAreaView style=\{\{ flex: 1 \}\}>/);
  });
});
