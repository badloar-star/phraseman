// Раунд 2, Статистика (скринридер): клетки тепловой карты читаются «4 ноября, 15 минут практики», а не «2026-11-04».
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/ActivityHeatmap365.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('тепловая карта: подпись дня для скринридера', () => {
  it('оба места (годовая карта и окно месяца) берут heatmapDaySpokenLabel, сырой даты в подписи нет', () => {
    expect(src).toContain('accessibilityLabel={day ? heatmapDaySpokenLabel(day.date, day.minutes, lang) : undefined}');
    expect(src).toContain('accessibilityLabel={heatmapDaySpokenLabel(cell.day.date, cell.day.minutes, lang)}');
    expect(src).not.toContain('accessibilityLabel={day?.date}');
    expect(src).not.toContain('accessibilityLabel={cell.day.date}');
  });
  it('подпись = день словами + минуты (если были), на языке интерфейса', () => {
    expect(src).toContain('export function heatmapDaySpokenLabel(dateKey: string, minutes: number, lang: string): string {');
    expect(src).toContain('`${dayText}, ${countLabel(lang, safeMinutes, PRACTICE_MINUTE_FORMS)}`');
  });
});
