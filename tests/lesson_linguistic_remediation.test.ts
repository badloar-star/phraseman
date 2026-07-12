import { LESSON_DATA } from '../app/lesson_data_all';

const phrase = (lesson: number, id: string) => {
  const row = LESSON_DATA[lesson].phrases.find((candidate) => candidate.id === id);
  expect(row).toBeDefined();
  return row!;
};

describe('lessons 1-32 linguistic remediation', () => {
  it.each([
    [6, 'lesson6_phrase_35', 'How do you find it?', 'Как тебе это?'],
    [12, 'lesson12_phrase_8', 'We made a plan last week', 'Мы составили план на прошлой неделе'],
    [13, 'lesson13_phrase_19', 'I will pay rent next month', 'Я заплачу за аренду в следующем месяце'],
    [14, 'lesson14_phrase_50', 'He got a better job', 'Он нашёл работу получше'],
    [22, 'lesson22_phrase_15', 'It is cold waiting outside', 'На улице холодно ждать'],
    [22, 'lesson22_phrase_50', 'After you finish work, call me', 'После того как закончишь работу, позвони мне'],
    [27, 'lesson27_phrase_36', 'You said that you did not see it', 'Ты сказал, что не видел этого'],
    [28, 'lesson28_phrase_5', 'The app closed by itself', 'Приложение закрылось само'],
    [28, 'lesson28_phrase_23', 'Did she teach herself English?', 'Она сама выучила английский?'],
    [28, 'lesson28_phrase_46', 'Study on your own every day', 'Учись самостоятельно каждый день'],
    [30, 'lesson30_phrase_31', 'I know a man whose phone is missing', 'Я знаю мужчину, у которого пропал телефон'],
    [31, 'lesson31_phrase_35', 'A brave man made the nervous family follow the exit signs.', 'Храбрый мужчина заставил нервную семью следовать указателям выхода.'],
    [32, 'lesson32_phrase_10', 'She is the woman whose bag we found.', 'Она та женщина, чью сумку мы нашли.'],
    [32, 'lesson32_phrase_15', 'They opened the door to the room where we waited.', 'Они открыли дверь в комнату, где мы ждали.'],
    [32, 'lesson32_phrase_29', 'If I had known, I would have helped.', 'Если бы я тогда знал, я бы помог.'],
  ])('keeps exact corrected EN/RU for %s %s', (lesson, id, english, russian) => {
    expect(phrase(lesson as number, id as string)).toMatchObject({ english, russian });
  });

  const correctedEnglishIds = [
    [12, 'lesson12_phrase_8'], [22, 'lesson22_phrase_15'], [22, 'lesson22_phrase_50'],
    [28, 'lesson28_phrase_5'], [28, 'lesson28_phrase_23'], [28, 'lesson28_phrase_46'],
    [30, 'lesson30_phrase_31'], [31, 'lesson31_phrase_35'], [32, 'lesson32_phrase_15'],
  ] as const;

  it.each(correctedEnglishIds)('reconstructs corrected English tokens for %s %s', (lesson, id) => {
    const row = phrase(lesson, id);
    const tokens = (row.wordsEn ?? row.words).map((word) => word.correct);
    const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}']+/gu, ' ').trim();
    expect(normalize(tokens.join(' '))).toBe(normalize(row.english));
    for (const word of row.wordsEn ?? row.words) {
      expect(word.distractors).not.toContain(word.correct);
    }
  });

  it.each([
    [25, 'lesson25_phrase_27', ['Мы', 'не', 'ждали', 'на', 'улице']],
    [27, 'lesson27_phrase_21', ['Они', 'сказали', 'что', 'подождут', 'на', 'улице']],
    [27, 'lesson27_phrase_36', ['Ты', 'сказал', 'что', 'не', 'видел', 'этого']],
    [30, 'lesson30_phrase_34', ['Они', 'позвонили', 'водителю', 'чья', 'машина', 'была', 'на', 'улице']],
    [32, 'lesson32_phrase_10', ['Она', 'та', 'женщина', 'чью', 'сумку', 'мы', 'нашли']],
    [32, 'lesson32_phrase_29', ['Если', 'бы', 'я', 'тогда', 'знал', 'я', 'бы', 'помог']],
    [32, 'lesson32_phrase_36', ['Они', 'заставили', 'нас', 'ждать', 'на', 'улице']],
  ])('reconstructs corrected Russian tokens for %s %s', (lesson, id, expected) => {
    const row = phrase(lesson as number, id as string);
    expect(row.words.map((word) => word.correct)).toEqual(expected);
    for (const word of row.words) expect(word.distractors).not.toContain(word.correct);
  });

  it.each([
    [1, 'lesson1_phrase_18', ['Están', 'en', 'el', 'coche', '.']],
    [1, 'lesson1_phrase_31', ['Estoy', 'en', 'el', 'aeropuerto', '.']],
    [2, 'lesson2_phrase_24', ['¿', 'Está', 'ella', 'afuera', '?']],
    [2, 'lesson2_phrase_40', ['No', 'estoy', 'afuera', '.']],
    [2, 'lesson2_phrase_46', ['Ella', 'no', 'está', 'afuera', '.']],
    [6, 'lesson6_phrase_35', ['¿', 'Cómo', 'lo', 'encuentras', 'tú', '?']],
    [12, 'lesson12_phrase_8', ['Hicimos', 'un', 'plan', 'la', 'semana', 'pasada', '.']],
    [13, 'lesson13_phrase_19', ['Pagaré', 'el', 'alquiler', 'el', 'mes', 'que', 'viene', '.']],
    [14, 'lesson14_phrase_50', ['Consiguió', 'un', 'trabajo', 'mejor', '.']],
  ])('preserves Spanish L2 words for %s %s', (lesson, id, expected) => {
    const row = phrase(lesson as number, id as string);
    expect(row.words.map((word) => word.correct)).toEqual(expected);
    for (const word of row.words) expect(word.distractors).not.toContain(word.correct);
  });

  it.each([
    [1, 'lesson1_phrase_18', 'Они на улице'],
    [1, 'lesson1_phrase_31', 'Я на улице'],
    [2, 'lesson2_phrase_24', 'Она на улице?'],
    [2, 'lesson2_phrase_40', 'Я не на улице'],
    [2, 'lesson2_phrase_46', 'Она не на улице'],
    [25, 'lesson25_phrase_27', 'Мы не ждали на улице'],
    [27, 'lesson27_phrase_21', 'Они сказали, что подождут на улице'],
    [30, 'lesson30_phrase_34', 'Они позвонили водителю, чья машина была на улице'],
    [32, 'lesson32_phrase_36', 'Они заставили нас ждать на улице.'],
  ])('uses a natural location translation for outside in %s %s', (lesson, id, russian) => {
    expect(phrase(lesson as number, id as string).russian).toBe(russian);
  });

  it('preserves 50 unique phrase ids in every lesson', () => {
    for (let lesson = 1; lesson <= 32; lesson += 1) {
      const ids = LESSON_DATA[lesson].phrases.map((row) => row.id);
      expect(ids).toHaveLength(50);
      expect(new Set(ids).size).toBe(50);
    }
  });

  it.each([1, 2, 6, 12, 13, 14, 22, 25, 27, 28, 30, 31, 32])(
    'preserves exact phrase id order for affected lesson %s',
    (lesson) => expect(LESSON_DATA[lesson].phrases.map((row) => row.id)).toEqual(
      Array.from({ length: 50 }, (_, index) => `lesson${lesson}_phrase_${index + 1}`),
    ),
  );
});
