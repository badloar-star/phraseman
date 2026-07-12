import { LESSON_31_PHRASES } from '../app/lesson_data_25_32';
import { LESSON_31_INTRO_EXTRA } from '../app/lesson_intro_screens_en_17_32';

const phraseById = new Map(LESSON_31_PHRASES.map((phrase) => [phrase.id, phrase]));

describe('lesson 31 reported phrase alignment', () => {
  it.each([
    [
      'lesson31_phrase_31',
      'I saw that lost dog leave that busy street.',
      'Я видел, как та потерявшаяся собака покинула ту оживлённую улицу.',
      'Я бачив, як той загублений пес залишив ту жваву вулицю.',
    ],
    [
      'lesson31_phrase_32',
      'They heard that quiet student ask that difficult question.',
      'Они слышали, как тот тихий ученик задал тот трудный вопрос.',
      'Вони чули, як той тихий учень поставив те складне запитання.',
    ],
    [
      'lesson31_phrase_35',
      'That brave man made that nervous family follow the red exit signs.',
      'Тот храбрый мужчина заставил ту нервную семью следовать красным указателям выхода.',
      'Той хоробрий чоловік змусив ту нервову родину йти за червоними вказівниками виходу.',
    ],
    [
      'lesson31_phrase_42',
      'She noticed that old man drop that metal key into that bag.',
      'Она заметила, как тот пожилой мужчина уронил тот металлический ключ в ту сумку.',
      'Вона помітила, як той літній чоловік упустив той металевий ключ у ту сумку.',
    ],
    [
      'lesson31_phrase_46',
      'She let that helpful guide show that old map to that tourist group.',
      'Она разрешила тому готовому помочь гиду показать ту старую карту той группе туристов.',
      'Вона дозволила тому помічному гіду показати ту стару мапу тій групі туристів.',
    ],
  ])('keeps %s demonstratives and meaning aligned', (dataId, english, russian, ukrainian) => {
    expect(phraseById.get(dataId)).toMatchObject({ english, russian, ukrainian });
  });

  it.each([
    ['lesson31_phrase_31', 'busy'],
  ])('keeps %s word training coverage for %s', (dataId, word) => {
    expect(phraseById.get(dataId)?.words?.some((entry) => entry.correct === word)).toBe(true);
  });

  it('keeps the Complex Object vocabulary intro before the phrase practice', () => {
    expect(LESSON_31_INTRO_EXTRA.find(
      (screen) => screen.screenId === 'lesson_31_intro_2_complex_noun_groups',
    )).toMatchObject({ order: 2 });
  });
});
