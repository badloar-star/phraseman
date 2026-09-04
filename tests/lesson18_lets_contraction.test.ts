/**
 * Урок 18 учит `Let's`, а не `Let us`.
 *
 * Жалоба живого пользователя (Lv48, стрик 21, Premium, 2026-09-04):
 * «Давайте уберём комнату… при чём здесь "Let us clean up the room"?
 *  Us — похоже здесь всё же лишнее?»
 *
 * Он прав. Носитель скажет `Let's clean up the room`; полная форма `Let us`
 * звучит книжно и в разговоре почти не встречается («Let us pray»).
 *
 * Хуже того: правильная форма `Let's` стояла в ДИСТРАКТОРАХ у слова `Let` —
 * то есть упражнение помечало верный вариант как ошибочный и учило наоборот.
 * Десять фраз блока, плюс теория урока.
 *
 * Сторожим, чтобы полная форма не вернулась ни в задания, ни в теорию.
 */
import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(
  path.join(process.cwd(), relativePath),
  'utf8',
);

describe('Урок 18: сокращение Let\'s', () => {
  const data = read('app/lesson_data_17_24.ts');
  const theory = read('components/lesson_help_theory_data.tsx');

  test('ни одна фраза урока не собирается из полной формы', () => {
    expect(data).not.toContain('english: "Let us ');
  });

  test('все десять побудительных фраз используют Let\'s', () => {
    const matches = data.match(/english: "Let's /g) ?? [];
    expect(matches.length).toBe(10);
  });

  test('Let\'s больше не значится ошибочным вариантом', () => {
    // Правильная форма в дистракторах — это обучение наоборот.
    const wrongAsDistractor = /distractors: \[[^\]]*"Let\\'s"[^\]]*\]/;
    expect(wrongAsDistractor.test(data)).toBe(false);
  });

  test('слово-конструктор не разбито на Let + us', () => {
    // Разбиение на два токена и есть источник неестественной фразы.
    expect(data).not.toContain("{ text: 'Let', correct: 'Let'");
  });

  test('законное местоимение us не пострадало', () => {
    // `Help us today` — нормальный английский, его трогать было нельзя.
    expect(data).toContain('english: "Help us today"');
  });

  test('теория называет Let us книжной формой, а не равноправной', () => {
    // Раньше подсказка говорила «принимаются оба варианта» — это и
    // расходилось с упражнением, где Let's считался ошибкой.
    expect(theory).not.toContain('принимаются оба варианта');
    expect(theory).toContain('звучит книжно');
  });

  test('примеры в теории показывают сокращённую форму', () => {
    expect(theory).toContain("Let's start now");
    expect(theory).toContain("Let's clean up the room");
  });
});
