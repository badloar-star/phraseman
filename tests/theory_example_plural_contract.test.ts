// зачем (R1 diff learn-059, Макеты 12.10): счётчик примеров в заголовке раздела теории склоняется по числу («1 пример», «4 примера», «5 примеров»), а не «4 примеров».
import fs from 'node:fs';
import path from 'node:path';

import { pluralWithCount } from '../constants/plural';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/theory/TheoryLessonView.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('теория: «N примеров» склоняется', () => {
  it('исходник использует pluralWithCount со словарём форм на 9 языках', () => {
    expect(src).toContain("import { pluralWithCount } from '../../constants/plural';");
    expect(src).toContain('? pluralWithCount(lang, section.exampleCount, triLang(lang, {');
    expect(src).not.toContain('`${section.exampleCount} примеров`');
    for (const key of ["ru: { one: 'пример', few: 'примера', many: 'примеров' }", "uk: { one: 'приклад', few: 'приклади', many: 'прикладів' }", "pl: { one: 'przykład', few: 'przykłady', many: 'przykładów' }", "en: { one: 'example'"]) {
      expect(src).toContain(key);
    }
  });

  it('формы по числу: ru 1/4/5/11/21, uk, pl, en', () => {
    const ru = { one: 'пример', few: 'примера', many: 'примеров' } as const;
    expect([1, 2, 4, 5, 11, 21, 22].map((n) => pluralWithCount('ru', n, ru))).toEqual(['1 пример', '2 примера', '4 примера', '5 примеров', '11 примеров', '21 пример', '22 примера']);
    const uk = { one: 'приклад', few: 'приклади', many: 'прикладів' } as const;
    expect([1, 3, 7].map((n) => pluralWithCount('uk', n, uk))).toEqual(['1 приклад', '3 приклади', '7 прикладів']);
    const pl = { one: 'przykład', few: 'przykłady', many: 'przykładów' } as const;
    expect([1, 4, 5].map((n) => pluralWithCount('pl', n, pl))).toEqual(['1 przykład', '4 przykłady', '5 przykładów']);
    const en = { one: 'example', few: 'examples', many: 'examples' } as const;
    expect([1, 3].map((n) => pluralWithCount('en', n, en))).toEqual(['1 example', '3 examples']);
  });
});
