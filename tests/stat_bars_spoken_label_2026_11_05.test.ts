// Раунд 2, Статистика: столбик недели читается скринридером «Пн, 12 минут»; сегодняшнее название дня — жирнее.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/stats/StatBars.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('StatBars: подпись столбика для скринридера', () => {
  it('колонка — один доступный элемент с подписью «день, значение»', () => {
    expect(src).toContain('<View key={bar.key} style={styles.col} accessible accessibilityLabel={barSpokenLabel(bar)}>');
    expect(src).toContain('return value ? `${bar.bottomLabel}, ${value}` : bar.bottomLabel;');
  });
  it('значение берётся из scrubLabel, затем topLabel', () => {
    expect(src).toContain("(bar.scrubLabel ?? bar.topLabel ?? '').trim()");
  });
  it('сегодняшнее название дня жирнее только весом шрифта (без смены размера и рамок)', () => {
    expect(src).toContain("bottomLabelToday: { fontWeight: '700' }");
    expect(src).toContain('bar.highlight ? styles.bottomLabelToday : null');
  });
});
