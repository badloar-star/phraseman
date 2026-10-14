// зачем (репорты пользователей 14.10, поручение владельца через координатора): подтверждённые контентные ошибки закрыты в данных и стерегутся тестом.
import fs from 'node:fs';
import path from 'node:path';

import { isCorrectAnswer } from '../constants/contractions';

const root = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');
const lessons = read('app/lesson_data_25_32.ts');
const altsOf = (id: string): string[] => {
  const m = new RegExp(String.raw`id: '${id}',\s+english: '[^']*',\s+alternatives: \[([^\]]*)\]`).exec(lessons);
  expect(m).not.toBeNull();
  return [...m![1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
};

describe('репорты 14.10: контент', () => {
  it('урок 29: «study» вместо «learn» принимается (без запятой тоже)', () => {
    const alts = altsOf('lesson29_phrase_50');
    expect(isCorrectAnswer('We used to study slowly but now we study faster', 'We used to learn slowly, but now we learn faster', alts)).toBe(true);
  });

  it('урок 28: «Teach yourself every day» — принимаем study/learn by yourself', () => {
    const alts = altsOf('lesson28_phrase_46');
    expect(isCorrectAnswer('Study by yourself every day', 'Teach yourself every day', alts)).toBe(true);
    expect(isCorrectAnswer('Learn on your own every day', 'Teach yourself every day', alts)).toBe(true);
  });

  it('урок 28: «Вы сделали это сами» — yourself и yourselves', () => {
    const alts = altsOf('lesson28_phrase_16');
    expect(isCorrectAnswer('You did it yourself', 'You did it yourselves', alts)).toBe(true);
    expect(isCorrectAnswer('You did it yourselves', 'You did it yourselves', alts)).toBe(true);
  });

  it('слова: «Номер (в отеле)» и «Дом (здание)»; синонимы с тем же переводом не попадают в неверные варианты', () => {
    const words = read('app/lesson_words.tsx');
    expect(words).toContain("ru: 'Номер (в отеле)'");
    expect(words).toContain("ru: 'Дом (здание)'");
    expect(words).toContain('w.pos === correct.pos && (w.ru === correct.ru || w.uk === correct.uk)) blockedValues.add(w.en)');
    expect(words).toContain("if (correct.en === 'house') blockedValues.add('home');");
  });

  it('«Мои ошибки»: у неправильных глаголов в задании указана форма (прошлое / причастие / основная)', () => {
    const verbs = read('app/lesson_irregular_verbs.tsx');
    expect(verbs).toContain("sourcePrompt: `${irregularVerbTranslation(verb, lang)} — ${form === 'past'");
  });
});
