import { LESSON_31_PHRASES } from '../app/lesson_data_25_32';
import { LESSON_31_INTRO_EXTRA } from '../app/lesson_intro_screens_en_17_32';

const phraseById = new Map(LESSON_31_PHRASES.map((phrase) => [phrase.id, phrase]));

function visibleRussianIntroCopy(screen: (typeof LESSON_31_INTRO_EXTRA)[number]): string {
  const lineCopy = (screen.linesRU ?? []).flatMap((line) => (line.parts ?? []).map((part) => part.text));
  const exampleCopy = (screen.examples ?? []).flatMap((example) => (
    Array.isArray(example.en)
      ? (example.en as Array<{ text: string }>).map((part) => part.text)
      : [String(example.en ?? '')]
  ));
  return [screen.titleRU, screen.subtitleRU, ...lineCopy, ...exampleCopy].filter(Boolean).join(' ').toLowerCase();
}

describe('lesson 31 reported phrase alignment', () => {
  it.each([
    [
      'lesson31_phrase_31',
      'I saw that stray dog cross that busy street.',
      'Я видел, как тот бродячий пёс перебежал ту оживлённую улицу.',
      'Я бачив, як той вуличний пес перебіг ту жваву вулицю.',
    ],
    [
      'lesson31_phrase_32',
      'They heard that quiet student ask that difficult question.',
      'Они слышали, как тот тихий ученик задал тот трудный вопрос.',
      'Вони чули, як той тихий учень поставив те важке запитання.',
    ],
    [
      'lesson31_phrase_35',
      'That brave firefighter made that panicked family follow that emergency exit.',
      'Тот храбрый пожарный заставил ту паникующую семью пройти к тому аварийному выходу.',
      'Той хоробрий пожежник змусив ту запаніковану родину пройти до того аварійного виходу.',
    ],
    [
      'lesson31_phrase_42',
      'She noticed that old man drop that metal key into that storm drain.',
      'Она заметила, как тот пожилой мужчина уронил тот металлический ключ в тот дождевой лоток.',
      'Вона помітила, як той літній чоловік уронив той металевий ключ у ту зливову решітку.',
    ],
    [
      'lesson31_phrase_46',
      'She let that helpful guide show that ancient map to that tourist group.',
      'Она разрешила тому готовому помочь гиду показать ту древнюю карту той группе туристов.',
      'Вона дозволила тому помічному гіду показати ту стародавню мапу тій групі туристів.',
    ],
  ])('keeps %s demonstratives and meaning aligned', (dataId, english, russian, ukrainian) => {
    expect(phraseById.get(dataId)).toMatchObject({ english, russian, ukrainian });
  });

  it.each([
    ['lesson31_phrase_31', 'stray'],
    ['lesson31_phrase_31', 'busy'],
    ['lesson31_phrase_2', 'complex'],
    ['lesson31_phrase_38', 'mural'],
  ])('keeps %s word training coverage for %s', (dataId, word) => {
    expect(phraseById.get(dataId)?.words?.some((entry) => entry.correct === word)).toBe(true);
  });

  it.each([
    ['complex', 'lesson31_phrase_2', 2],
    ['mural', 'lesson31_phrase_38', 38],
  ])('introduces %s in lesson 31 intro before %s', (word, dataId, phraseOrder) => {
    const vocabularyIntro = LESSON_31_INTRO_EXTRA.find(
      (screen) => screen.screenId === 'lesson_31_intro_2_complex_noun_groups',
    );

    expect(vocabularyIntro).toMatchObject({ order: 2 });
    expect(visibleRussianIntroCopy(vocabularyIntro!)).toMatch(new RegExp(`\\b${word}\\b`, 'u'));
    expect(LESSON_31_PHRASES.findIndex((phrase) => phrase.id === dataId) + 1).toBe(phraseOrder);
  });
});
