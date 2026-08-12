import { LESSON_21_PHRASES } from '../app/lesson_data_17_24';

describe('lesson 21 Nothing is wrong translation', () => {
  it('uses a direct prompt that does not suggest a different English answer', () => {
    const phrase = LESSON_21_PHRASES.find((row) => row.id === 'lesson21_phrase_22');

    expect(phrase).toEqual(expect.objectContaining({
      english: 'Nothing is wrong',
      russian: 'Никаких проблем нет',
      ukrainian: 'Жодних проблем немає',
    }));
    expect(phrase?.russian).not.toBe('Всё в порядке');
    expect(phrase?.ukrainian).not.toBe('Все гаразд');
  });
});
