/**
 * Пик B, строка топа: серое кольцо «это ты» не рисуется поверх кольца подписки (владелец 11.11.2026: «серая рамка на аватарке» → «Да, убрать»).
 *
 * зачем: у подписчика кольцо Plus/Ultra почти того же диаметра ложилось на серое кольцо «я» — от серого оставался обломок дуги.
 * Правило то же, что замок Главной 28.10 («два кольца сразу не может быть»): есть кольцо подписки — серое не рисуется.
 * Сторож исходника (как owner_locks_peak_b_live_2026_11_05): строка — чистая разметка без логики, которую можно вызвать отдельно.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[\s;{(,])\/\/[^\n]*/g, '$1');

describe('Пик B: одно кольцо на своей монете', () => {
  const row = stripComments(read('components/spire/peak/PeakTopRow.tsx'));

  it('серое кольцо «это ты» рисуется только у себя и только без подписки', () => {
    expect(row).toMatch(/\{row\.isMe && !row\.isPremium \? \(\s*<View style=\{\[s\.ringOuter/);
    expect(row).not.toMatch(/\{row\.isMe \? \(/);
  });

  it('кольцо подписки на монете остаётся (в том числе у себя)', () => {
    expect(row).toContain("plus={row.isPremium} plusTier={row.plusTier ?? 'plus'}");
  });

  it('серое кольцо не занимает места в строке — его отсутствие не сдвигает имя (внешний круг шире монеты на 12, поля −6 с каждой стороны)', () => {
    expect(row).toMatch(/width: coinSize \+ 12/);
    expect(row).toMatch(/ringOuter: \{[^}]*marginHorizontal: -6/);
  });
});
