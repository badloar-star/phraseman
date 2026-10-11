// зачем (Карточки 2.0 12.10, cards-v2.html «Напиши — неверно»): подсветка лишних букв в ответе: «dilay» против «delay» → красная «i».
import { markWrongLetters } from '../app/flashcards/recall_diff';

const wrongText = (typed: string, expected: string) => markWrongLetters(typed, expected).filter((p) => p.wrong).map((p) => p.text).join('');

describe('markWrongLetters', () => {
  test('макет: dilay против delay подсвечивает одну букву «i»', () => {
    expect(markWrongLetters('dilay', 'delay')).toEqual([
      { text: 'd', wrong: false },
      { text: 'i', wrong: true },
      { text: 'lay', wrong: false },
    ]);
  });

  test('точный ответ и регистр не подсвечиваются', () => {
    expect(wrongText('Delay', 'delay')).toBe('');
    expect(markWrongLetters('delay', 'delay')).toEqual([{ text: 'delay', wrong: false }]);
  });

  test('пробелы не подсвечиваются, лишнее слово подсвечивается', () => {
    expect(wrongText('a long delay', 'delay')).toBe('along');
    expect(wrongText('de lay', 'delay')).toBe('');
  });

  test('у перевода с вариантами берётся ближайший вариант', () => {
    expect(wrongText('здравствуй', 'привет / здравствуй')).toBe('');
  });

  test('пустой ввод и слишком длинный ввод не падают', () => {
    expect(markWrongLetters('', 'delay')).toEqual([]);
    const long = 'x'.repeat(500);
    expect(markWrongLetters(long, 'delay')).toEqual([{ text: long, wrong: false }]);
  });
});
