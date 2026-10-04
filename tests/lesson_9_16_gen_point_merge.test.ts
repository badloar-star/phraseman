// зачем (Ядро/координатор, 04.10): в .gen уроков 9–16 забрали из генератора ТОЛЬКО 4 alternativesEs и 29 wordsEn
// (25 вопросов без токена «?» + 4 фразы урока 16 с «at night»/«this morning»-кусками в одном токене). Дистракторы и
// категории репозитория лучше генераторных (398 против 1644 самопересечений), поэтому их не трогаем.
import * as gen from '../app/lesson_data_9_16_phrases_es.gen';
import * as src from '../app/lesson_data_9_16';

type W = { correct: string };
type P = { id: string; english: string; words?: W[]; wordsEn?: W[]; alternativesEs?: string[] };
const all = (m: unknown): P[] => [9, 10, 11, 12, 13, 14, 15, 16].flatMap((n) => (m as Record<string, P[]>)[`LESSON_${n}_PHRASES`] ?? []);

describe('lessons 9-16 .gen: точечное слияние', () => {
  const phrases = all(gen);
  it('400 фраз, испанские токены не изменились относительно источника', () => {
    expect(phrases).toHaveLength(400);
    const s = new Map(all(src).map((p) => [p.id, p]));
    for (const p of phrases) {
      expect((p.words ?? []).map((w) => w.correct)).toEqual((s.get(p.id)?.words ?? []).map((w) => w.correct));
    }
  });
  it('4 alternativesEs на месте и только они', () => {
    const withAlt = phrases.filter((p) => p.alternativesEs).map((p) => [p.id, p.alternativesEs]);
    expect(withAlt).toEqual([
      ['lesson9_phrase_7', ['Hay muchos coches por la calle.']],
      ['lesson9_phrase_21', ['Hay una mesa redonda en esta habitación.']],
      ['lesson9_phrase_37', ['Hay una bicicleta roja en mi garaje.']],
      ['lesson9_phrase_45', ['¿Hay mucho tiempo libre hoy?']],
    ]);
  });
  it('каждый английский вопрос заканчивается токеном «?», а токены собирают исходную фразу', () => {
    for (const p of phrases) {
      const en = (p.wordsEn ?? []).map((w) => w.correct);
      if (p.english.trim().endsWith('?')) expect(en[en.length - 1]).toBe('?');
      expect(en.join(' ').replace(/ \?$/, '?')).toBe(p.english.trim());
    }
  });
});
