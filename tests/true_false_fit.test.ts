import fs from 'node:fs';
import path from 'node:path';

import { trueFalseFit, TRUE_FALSE_TRANSLATION_MIN, TRUE_FALSE_WORD_MIN } from '../app/flashcards/true_false_fit';

// зачем (владелец 11.11.2026, жалоба Стеллы): карточка «Правда / ложь» — зона фиксированной высоты 210; слово 34 и перевод 22 не ужимались,
// и на узком экране или при крупном системном шрифте длинная фраза вылезала за карточку. На макетной ширине вид не меняется.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const LONG_EN = 'I insist that he be present at the meeting tomorrow morning';
const LONG_RU = 'Я настаиваю на том, чтобы он присутствовал на встрече';

describe('trueFalseFit', () => {
  it('на макетной ширине и обычном шрифте короткая пара остаётся 34/40 и 22/28 — вид совпадает с макетом', () => {
    for (const [word, translation] of [['apple', 'яблоко'], ['Nice to meet you', 'Рад познакомиться']] as const) {
      expect(trueFalseFit({ word, translation, cardWidth: 350, fontScale: 1 })).toEqual({ wordSize: 34, wordLine: 40, translationSize: 22, translationLine: 28 });
    }
  });

  it('длинная фраза на узком экране с крупным шрифтом уменьшается, но не ниже минимума', () => {
    const fit = trueFalseFit({ word: LONG_EN, translation: LONG_RU, cardWidth: 280, fontScale: 1.5 });
    expect(fit.wordSize).toBeLessThan(34);
    expect(fit.wordSize).toBeGreaterThanOrEqual(TRUE_FALSE_WORD_MIN);
    expect(fit.translationSize).toBeLessThan(22);
    expect(fit.translationSize).toBeGreaterThanOrEqual(TRUE_FALSE_TRANSLATION_MIN);
  });

  it('чем уже карточка и крупнее шрифт, тем кегль слова не больше', () => {
    let previous = 99;
    for (const [cardWidth, fontScale] of [[390, 1], [350, 1], [320, 1.15], [280, 1.3], [260, 2]] as const) {
      const { wordSize } = trueFalseFit({ word: LONG_EN, translation: LONG_RU, cardWidth, fontScale });
      expect(wordSize).toBeLessThanOrEqual(previous);
      previous = wordSize;
    }
  });

  it('короткий перевод оставляет слову больше места, чем длинный', () => {
    const withShort = trueFalseFit({ word: LONG_EN, translation: 'да', cardWidth: 320, fontScale: 1 });
    const withLong = trueFalseFit({ word: LONG_EN, translation: LONG_RU, cardWidth: 320, fontScale: 1 });
    expect(withShort.wordSize).toBeGreaterThanOrEqual(withLong.wordSize);
  });

  it('межстрочный держит пропорции макета (40/34 и 28/22)', () => {
    const fit = trueFalseFit({ word: LONG_EN, translation: LONG_RU, cardWidth: 280, fontScale: 1.3 });
    expect(fit.wordLine).toBe(Math.round((fit.wordSize * 40) / 34));
    expect(fit.translationLine).toBe(Math.round((fit.translationSize * 28) / 22));
  });

  it('карточка берёт размеры из подгонки и не пользуется adjustsFontSizeToFit', () => {
    const source = read('app/flashcards/TrueFalseSwipeCard.tsx');
    expect(source).toContain('trueFalseFit({ word, translation, cardWidth, fontScale })');
    expect(source).toContain('fontSize: fit.wordSize, lineHeight: lh(fit.wordLine)');
    expect(source).toContain('fontSize: fit.translationSize, lineHeight: lh(fit.translationLine)');
    expect(source).toContain('onLayout={onZoneLayout}');
    expect(source).not.toContain('adjustsFontSizeToFit');
  });
});
