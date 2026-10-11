// зачем (сверка Макетов e4e4149d0): слова в плитках 3 и 5 колонок «Сохранённых» режутся по правилам (numberOfLines + ellipsizeMode),
// без adjustsFontSizeToFit; при шрифте 1.0 и 1.5 строки слова помещаются в фиксированную высоту плитки.
import { readFileSync } from 'fs';
import { join } from 'path';
import { GALLERY_STEPS } from '../components/cards-grid/cardsGalleryLayout';

const src = readFileSync(join(__dirname, '..', 'components', 'cards-grid', 'CardsGallery.tsx'), 'utf8');

function faceLine(step: number): number {
  const rows = [...src.matchAll(/\{ lg: \d+, lgLine: \d+, w: [\d.]+, wLine: (\d+),/g)].map((m) => Number(m[1]));
  return rows[step]!;
}

describe('слова в плитках 3 и 5 колонок', () => {
  it('в исходнике: numberOfLines 2 / 1, многоточие, без adjustsFontSizeToFit', () => {
    expect(src).toMatch(/numberOfLines=\{step === 2 \? 2 : step === 3 \? 1 : undefined\}/);
    expect(src).toMatch(/ellipsizeMode=\{miniStep \? 'tail' : undefined\}/);
    expect(src).not.toMatch(/adjustsFontSizeToFit=/);
  });

  it.each([[2, 2], [3, 1]])('шаг %i: %i строк(и) слова помещаются в плитку при шрифте 1.0 и 1.5', (step, lines) => {
    const wLine = faceLine(step);
    for (const scale of [1, 1.5]) {
      const lineH = Math.ceil(wLine * Math.min(scale, 1.5));
      expect(lineH * lines).toBeLessThanOrEqual(GALLERY_STEPS[step]!.h);
    }
  });
});
