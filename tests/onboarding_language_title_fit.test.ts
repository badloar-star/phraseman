import fs from 'node:fs';
import path from 'node:path';

import { languageTitleFit, longestWordLength, LANGUAGE_TITLE_LINE, LANGUAGE_TITLE_MIN, LANGUAGE_TITLE_SIZE } from '../components/onboarding/language_title_fit';

// зачем (владелец 11.11.2026, жалоба Стеллы; эмулятор 320 + системный шрифт 1.5): в выборе языка онбординга слово «Французский»
// рвалось на последней букве («Французски / й»). Название языка — одно слово: кегль подгоняется, слово не рвётся.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('languageTitleFit', () => {
  it('на макетной ширине и обычном шрифте название остаётся 16.5/21 — вид совпадает с макетом', () => {
    for (const title of ['Французский', 'Английский', 'Portuguese (Brazil)', 'Español']) {
      expect(languageTitleFit({ title, windowWidth: 390, fontScale: 1 })).toEqual({ fontSize: LANGUAGE_TITLE_SIZE, lineHeight: LANGUAGE_TITLE_LINE });
    }
  });

  it('узкий экран с крупным шрифтом: самое длинное слово помещается в строку целиком', () => {
    const fit = languageTitleFit({ title: 'Французский', windowWidth: 320, fontScale: 1.5 });
    expect(fit.fontSize).toBeLessThan(LANGUAGE_TITLE_SIZE);
    expect(fit.fontSize).toBeGreaterThanOrEqual(LANGUAGE_TITLE_MIN);
    // 11 знаков × кегль × 0.62 × потолок шрифта 1.3 не шире места в строке (320 − 187)
    expect(11 * fit.fontSize * 0.62 * 1.3).toBeLessThanOrEqual(320 - 187);
  });

  it('считается по самому длинному слову, а не по длине всей строки', () => {
    expect(longestWordLength('Portuguese (Brazil)')).toBe(10);
    expect(longestWordLength('Французский')).toBe(11);
    expect(languageTitleFit({ title: 'да нет да нет да нет да нет', windowWidth: 320, fontScale: 1.3 }).fontSize).toBe(LANGUAGE_TITLE_SIZE);
  });

  it('чем уже экран и крупнее шрифт, тем кегль не больше; ниже минимума не опускается', () => {
    let previous = 99;
    for (const [windowWidth, fontScale] of [[430, 1], [390, 1], [360, 1.15], [320, 1.3], [300, 2], [240, 2]] as const) {
      const { fontSize } = languageTitleFit({ title: 'Французский', windowWidth, fontScale });
      expect(fontSize).toBeLessThanOrEqual(previous);
      expect(fontSize).toBeGreaterThanOrEqual(LANGUAGE_TITLE_MIN);
      previous = fontSize;
    }
  });

  it('онбординг: весь список языков получает один кегль — по самому длинному названию; без adjustsFontSizeToFit', () => {
    const source = read('components/CleanOnboarding.tsx');
    expect(source).toContain('languageTitleFit({ title: sizeBy ?? option.native, windowWidth: languageWindowWidth, fontScale: languageFontScale })');
    expect(source).toContain('<Text style={[styles.languageTitle, titleFit]}>{option.native}</Text>');
    expect(source).toContain('sizeBy={visible.map((v) => languageNameOf(oc, v.id)).reduce((a, b) => (longestWordLength(b) > longestWordLength(a) ? b : a), \'\')}');
    expect(read('components/onboarding/language_title_fit.ts')).not.toContain('adjustsFontSizeToFit=');
  });
});
