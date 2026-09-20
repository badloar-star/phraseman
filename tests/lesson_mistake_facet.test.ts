/**
 * Сторож правила «тип ошибки считается по промаху, а не прибит константой».
 *
 * Повод — репорт #15 (Ольга, 2026-09-20): «Какую бы ошибку я не сделала,
 * приложение мне советует обратить внимание на порядок слов». В lesson1.tsx
 * стояло `kind: 'word_order'` для ЛЮБОГО промаха, поэтому подсказка в разделе
 * «Мои ошибки» была одна на все случаи.
 *
 * Обычные тесты раздела этого не ловили: они работают с уже записанным
 * журналом и не проверяют, что туда кладёт урок.
 */

import { lessonMistakeFacet } from '../app/lesson_mistake_facet';

describe('lessonMistakeFacet', () => {
  it('те же слова в другом порядке — настоящий порядок слов', () => {
    expect(lessonMistakeFacet({
      expectedPhrase: 'Why does she close windows',
      answeredPhrase: 'Why she does close windows',
    })).toBe('word_order');
  });

  it('пропущенное слово не выдаётся за порядок слов', () => {
    expect(lessonMistakeFacet({
      expectedPhrase: 'She has been here before',
      answeredPhrase: 'She been here before',
    })).toBe('missing_token');
  });

  it('окончание глагола — это форма слова', () => {
    // Репорт #35: «She love music» вместо «She loves music».
    expect(lessonMistakeFacet({
      expectedPhrase: 'She loves music',
      answeredPhrase: 'She love music',
    })).toBe('form');
  });

  it('единственное вместо множественного — тоже форма', () => {
    // Репорты #33/#34: «They drive car» вместо «They drive cars».
    expect(lessonMistakeFacet({
      expectedPhrase: 'They drive cars',
      answeredPhrase: 'They drive car',
    })).toBe('form');
  });

  it('прошедшее вместо базовой формы после did — форма', () => {
    // Репорты #1/#2 (Ева): «Did you use to spent money fast».
    expect(lessonMistakeFacet({
      expectedPhrase: 'Did you use to spend money fast',
      answeredPhrase: 'Did you use to spent money fast',
    })).toBe('form');
  });

  it('подставлено другое по смыслу слово — значение', () => {
    expect(lessonMistakeFacet({
      expectedPhrase: 'She answered questions',
      answeredPhrase: 'She answered letters',
    })).toBe('meaning');
  });

  it('пустой ответ не падает и не врёт про порядок слов', () => {
    expect(lessonMistakeFacet({
      expectedPhrase: 'I had time yesterday',
      answeredPhrase: '',
    })).toBe('meaning');
  });

  it('знаки препинания и регистр не меняют вывод', () => {
    expect(lessonMistakeFacet({
      expectedPhrase: 'She loves music',
      answeredPhrase: 'she LOVE music.',
    })).toBe('form');
  });

  it('лишнее слово при полном наборе нужных — сбой сборки', () => {
    expect(lessonMistakeFacet({
      expectedPhrase: 'I had time yesterday',
      answeredPhrase: 'I had the time yesterday',
    })).toBe('word_order');
  });
});
