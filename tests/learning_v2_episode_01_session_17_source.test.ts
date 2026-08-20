import { EPISODE_01_SESSION_17_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_17_v1';
import { EPISODE_01_SESSION_18_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_18_v1';
import { EPISODE_01_SESSION_19_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_19_v1';
import { EPISODE_01_SESSION_20_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_20_v1';
import { EPISODE_01_SESSION_21_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_21_v1';
import { EPISODE_01_SESSION_22_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_22_v1';
import { EPISODE_01_SESSION_23_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_23_v1';
import { EPISODE_01_SESSION_24_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_24_v1';
import { assertEpisode01Session17To24Contract } from '../modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1';

test('session 17 keeps the third-person pronouns and is contract', () =>
  assertEpisode01Session17To24Contract(EPISODE_01_SESSION_17_SOURCE, 17, 'words_then_phrases', ['third_person_pronoun', 'third_person_singular']));

test('sessions 17 to 24 keep distinct topical intros and one English answer per intro question', () => {
  const sources = [EPISODE_01_SESSION_17_SOURCE, EPISODE_01_SESSION_18_SOURCE, EPISODE_01_SESSION_19_SOURCE, EPISODE_01_SESSION_20_SOURCE, EPISODE_01_SESSION_21_SOURCE, EPISODE_01_SESSION_22_SOURCE, EPISODE_01_SESSION_23_SOURCE, EPISODE_01_SESSION_24_SOURCE];
  const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  locales.forEach((locale) => expect(new Set(sources.map((source) => source.title[locale])).size).toBe(8));
  sources.forEach((source) => source.introPages.forEach((page) => {
    const choices = page.question.choices.map((choice) => choice.ru);
    expect(new Set(choices).size).toBe(3);
    expect(choices[page.question.correctChoiceIndex]).toBe(source.phrases[0].english);
    locales.forEach((locale) => {
      expect(page.question.prompt[locale]).not.toContain(source.phrases[0].english);
    });
  }));
  const expectedRussianTitles = [
    'Он и она: связка is',
    'Он и она: отрицание',
    'Вопросы с is',
    'It: вещи и погода',
    'Короткие формы с ’s',
    'Моя семья рядом',
    'Говорим о людях и вещах',
    'Всё вместе: he, she, it',
  ];
  expect(sources.map((source) => source.title.ru)).toEqual(expectedRussianTitles);
  sources.forEach((source) => {
    const sentenceSets = source.introPages.map((page) => page.body.ru
      .split(/(?<=[.!?])\s+/u)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .sort()
      .join('|'));
    expect(new Set(sentenceSets).size).toBe(3);
  });
});

test('sessions 17 to 24 use native meanings and real word alternatives rather than generated labels', () => {
  const sources = [EPISODE_01_SESSION_17_SOURCE, EPISODE_01_SESSION_18_SOURCE, EPISODE_01_SESSION_19_SOURCE, EPISODE_01_SESSION_20_SOURCE, EPISODE_01_SESSION_21_SOURCE, EPISODE_01_SESSION_22_SOURCE, EPISODE_01_SESSION_23_SOURCE, EPISODE_01_SESSION_24_SOURCE];
  const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  const examples = {
    ru: ['Он готов.', 'Он не готов.', 'Он готов?', 'Холодно.', 'Он готов.', 'Моя мама здесь.'],
    uk: ['Він готовий.', 'Він не готовий.', 'Він готовий?', 'Холодно.', 'Він готовий.', 'Моя мама тут.'],
    es: ['Él está listo.', 'Él no está listo.', '¿Él está listo?', 'Hace frío.', 'Él está listo.', 'Mi madre está aquí.'],
    'pt-BR': ['Ele está pronto.', 'Ele não está pronto.', 'Ele está pronto?', 'Está frio.', 'Ele está pronto.', 'Minha mãe está aqui.'],
    vi: ['Anh ấy sẵn sàng.', 'Anh ấy không sẵn sàng.', 'Anh ấy sẵn sàng phải không?', 'Trời lạnh.', 'Anh ấy sẵn sàng.', 'Mẹ tôi ở đây.'],
    id: ['Dia siap.', 'Dia tidak siap.', 'Apakah dia siap?', 'Cuacanya dingin.', 'Dia siap.', 'Ibu saya di sini.'],
    tr: ['O hazır.', 'O hazır değil.', 'O hazır mı?', 'Hava soğuk.', 'O hazır.', 'Annem burada.'],
    pl: ['On jest gotowy.', 'On nie jest gotowy.', 'Czy on jest gotowy?', 'Jest zimno.', 'On jest gotowy.', 'Moja mama jest tutaj.'],
  } as const;
  const sampleIndexes = [0, 0, 0, 0, 0, 0] as const;
  Object.entries(examples).forEach(([locale, meanings]) => {
    [17, 18, 19, 20, 21, 22].forEach((ordinal, index) => {
      expect(sources[ordinal - 17].phrases[sampleIndexes[index]].localizedDetails?.[locale as keyof typeof examples].meaning).toBe(meanings[index]);
    });
  });
  sources.forEach((source) => source.phrases.forEach((phrase) => locales.forEach((locale) => {
    const details = phrase.localizedDetails?.[locale];
    expect(details?.meaning).not.toMatch(/^(Meaning|Significado|Значение|Значення|Nghĩa|Arti|Anlam|Znaczenie):/);
    expect(details?.meaning).not.toContain(phrase.english);
    expect(details?.explanation.length).toBeGreaterThanOrEqual(100);
    details?.words.forEach((word) => word.distractors.forEach((distractor) => {
      expect(distractor.value).not.toMatch(/[-_][0-9]+$/);
      expect(distractor.reason.length).toBeGreaterThanOrEqual(40);
    }));
  })));
});

test('family members stay distinct and Russian temperature uses an experiencer', () => {
  const family = EPISODE_01_SESSION_22_SOURCE.phrases;
  expect(family.find((phrase) => phrase.english === 'My mother is here.')?.localizedDetails?.ru.meaning).toBe('Моя мама здесь.');
  expect(family.find((phrase) => phrase.english === 'My father is here.')?.localizedDetails?.ru.meaning).toBe('Мой папа здесь.');
  expect(family.find((phrase) => phrase.english === 'My sister is ready.')?.localizedDetails?.ru.meaning).toBe('Моя сестра готова.');
  expect(family.find((phrase) => phrase.english === 'My brother is ready.')?.localizedDetails?.ru.meaning).toBe('Мой брат готов.');
  expect(EPISODE_01_SESSION_17_SOURCE.phrases.find((phrase) => phrase.english === 'He is cold.')?.localizedDetails?.ru.meaning).toBe('Ему холодно.');
  expect(EPISODE_01_SESSION_17_SOURCE.phrases.find((phrase) => phrase.english === 'She is warm.')?.localizedDetails?.ru.meaning).toBe('Ей тепло.');
});

test('female descriptions and weather polarity stay natural in inflected locales', () => {
  const sheTired = EPISODE_01_SESSION_17_SOURCE.phrases.find((phrase) => phrase.english === 'She is tired.');
  const expected = {
    ru: 'Она устала.',
    uk: 'Вона втомлена.',
    es: 'Ella está cansada.',
    'pt-BR': 'Ela está cansada.',
    pl: 'Ona jest zmęczona.',
  } as const;
  Object.entries(expected).forEach(([locale, meaning]) => {
    expect(sheTired?.localizedDetails?.[locale as keyof typeof expected].meaning).toBe(meaning);
  });
  expect(EPISODE_01_SESSION_20_SOURCE.phrases.find((phrase) => phrase.english === 'It is not cold.')?.localizedDetails?.ru.meaning).toBe('Не холодно.');
  expect(EPISODE_01_SESSION_24_SOURCE.phrases.find((phrase) => phrase.english === 'Is it sunny?')?.localizedDetails?.ru.meaning).toBe('Солнечно?');
  expect(EPISODE_01_SESSION_24_SOURCE.phrases.find((phrase) => phrase.english === 'It is not rainy.')?.localizedDetails?.ru.meaning).toBe('Дождя нет.');
});

test('root word reasons name both the chosen alternative and the required word', () => {
  EPISODE_01_SESSION_17_SOURCE.phrases.forEach((phrase) => phrase.words.forEach((word) => {
    word.distractors.forEach((distractor) => {
      expect(distractor.why).toContain(distractor.value);
      expect(distractor.why).toContain(word.correct);
    });
  }));
});
