// зачем (сверка Макетов e4e4149d0 → владелец 18.10): слова в плитках 3 и 5 колонок «Сохранённых» больше НЕ режутся многоточием: кегль от ширины плитки, перенос по словам,
// плитка растёт под текст (cardsGalleryFit / cardsGalleryGrid), без adjustsFontSizeToFit. Тут — только исходник; числа и «помещается на любом шаге» — tests/saved_cards_fit.test.ts.
import { readFileSync } from 'fs';
import { join } from 'path';
import { stepFace, tileFit } from '../components/cards-grid/cardsGalleryFit';

const src = readFileSync(join(__dirname, '..', 'components', 'cards-grid', 'CardsGallery.tsx'), 'utf8');

describe('длинные слова в плитке нормального вида (шаг 0)', () => {
  it('в исходнике: ни многоточия, ни numberOfLines, ни adjustsFontSizeToFit', () => {
    expect(src).not.toMatch(/adjustsFontSizeToFit=/);
    expect(src).not.toMatch(/ellipsizeMode|numberOfLines/);
  });

  it.each([[0, 120], [0, 240]])('шаг %i, ширина плитки %i: длинное слово занимает несколько строк и плитка вырастает под них при шрифте 1.0 и 1.5', (step, tileW) => {
    for (const scale of [1, 1.5]) {
      const face = stepFace(step, tileW, scale);
      const fit = tileFit(face, 'Supercalifragilisticexpialidocious phrase', null);
      expect(fit.wordLines).toBeGreaterThan(1);
      expect(fit.h).toBeGreaterThanOrEqual(fit.wordLines * face.wordLine);
    }
  });
});
