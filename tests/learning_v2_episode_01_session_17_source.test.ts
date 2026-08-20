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
    expect(source.phrases.map((phrase) => phrase.english)).toContain(choices[page.question.correctChoiceIndex]);
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
    expect(new Set(source.introPages.map((page) => page.question.choices[page.question.correctChoiceIndex].ru)).size).toBe(3);
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

test('semantic meaning matrix keeps weather, objects, locations, people, gender and temperature separate in every locale', () => {
  const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  const byEnglish = (english: string) => {
    const source = [EPISODE_01_SESSION_17_SOURCE, EPISODE_01_SESSION_18_SOURCE, EPISODE_01_SESSION_19_SOURCE, EPISODE_01_SESSION_20_SOURCE, EPISODE_01_SESSION_21_SOURCE, EPISODE_01_SESSION_22_SOURCE, EPISODE_01_SESSION_23_SOURCE, EPISODE_01_SESSION_24_SOURCE]
      .find((candidate) => candidate.phrases.some((phrase) => phrase.english === english));
    return source?.phrases.find((phrase) => phrase.english === english);
  };
  const expected = {
    'It is a book.': { ru: 'Это книга.', uk: 'Це книга.', es: 'Es un libro.', 'pt-BR': 'É um livro.', vi: 'Đây là một quyển sách.', id: 'Ini sebuah buku.', tr: 'Bu bir kitap.', pl: 'To jest książka.' },
    'It is here.': { ru: 'Это здесь.', uk: 'Це тут.', es: 'Está aquí.', 'pt-BR': 'Está aqui.', vi: 'Nó ở đây.', id: 'Itu di sini.', tr: 'O burada.', pl: 'To jest tutaj.' },
    'It is not cold.': { ru: 'Не холодно.', uk: 'Не холодно.', es: 'No hace frío.', 'pt-BR': 'Não está frio.', vi: 'Trời không lạnh.', id: 'Cuacanya tidak dingin.', tr: 'Hava soğuk değil.', pl: 'Nie jest zimno.' },
    'Is it sunny?': { ru: 'Солнечно?', uk: 'Сонячно?', es: '¿Hace sol?', 'pt-BR': 'Está ensolarado?', vi: 'Trời có nắng không?', id: 'Apakah cuacanya cerah?', tr: 'Hava güneşli mi?', pl: 'Czy jest słonecznie?' },
    'He is cold.': { ru: 'Ему холодно.', uk: 'Йому холодно.', es: 'Él tiene frío.', 'pt-BR': 'Ele está com frio.', vi: 'Anh ấy lạnh.', id: 'Dia kedinginan.', tr: 'O üşüyor.', pl: 'Jemu jest zimno.' },
    'She is warm.': { ru: 'Ей тепло.', uk: 'Їй тепло.', es: 'Ella tiene calor.', 'pt-BR': 'Ela está com calor.', vi: 'Cô ấy ấm.', id: 'Dia hangat.', tr: 'O sıcak.', pl: 'Jej jest ciepło.' },
    'Is she cold?': { ru: 'Ей холодно?', uk: 'Їй холодно?', es: '¿Ella tiene frío?', 'pt-BR': 'Ela está com frio?', vi: 'Cô ấy lạnh phải không?', id: 'Apakah dia kedinginan?', tr: 'O üşüyor mu?', pl: 'Czy jej jest zimno?' },
    'My sister is warm.': { ru: 'Моей сестре тепло.', uk: 'Моїй сестрі тепло.', es: 'Mi hermana tiene calor.', 'pt-BR': 'Minha irmã está com calor.', vi: 'Chị tôi ấm.', id: 'Saudari saya hangat.', tr: 'Kız kardeşim sıcak.', pl: 'Mojej siostrze jest ciepło.' },
    'My father is warm.': { ru: 'Моему папе тепло.', uk: 'Моєму татові тепло.', es: 'Mi padre tiene calor.', 'pt-BR': 'Meu pai está com calor.', vi: 'Bố tôi ấm.', id: 'Ayah saya hangat.', tr: 'Babam sıcak.', pl: 'Mojemu tacie jest ciepło.' },
  } as const;
  Object.entries(expected).forEach(([english, meanings]) => locales.forEach((locale) => {
    expect(byEnglish(english)?.localizedDetails?.[locale].meaning).toBe(meanings[locale]);
  }));
});

test('Turkish questions select the question particle from the final vowel', () => {
  const expected = {
    'Is he ready?': 'O hazır mı?', 'Is he tired?': 'O yorgun mu?', 'Is he calm?': 'O sakin mi?',
    'Is he happy?': 'O mutlu mu?', 'Is he busy?': 'O meşgul mü?', 'Is she cold?': 'O üşüyor mu?',
  } as const;
  Object.entries(expected).forEach(([english, meaning]) => {
    const source = english === 'Is she cold?' ? EPISODE_01_SESSION_23_SOURCE : EPISODE_01_SESSION_19_SOURCE;
    expect(source.phrases.find((phrase) => phrase.english === english)?.localizedDetails?.tr.meaning).toBe(meaning);
  });
});

test('negative human temperatures stay native in every locale', () => {
  const expected = {
    'He is not cold.': { ru: 'Ему не холодно.', uk: 'Йому не холодно.', es: 'Él no tiene frío.', 'pt-BR': 'Ele não está com frio.', vi: 'Anh ấy không lạnh.', id: 'Dia tidak kedinginan.', tr: 'O üşümüyor.', pl: 'Jemu nie jest zimno.' },
    'She is not warm.': { ru: 'Ей не тепло.', uk: 'Їй не тепло.', es: 'Ella no tiene calor.', 'pt-BR': 'Ela não está com calor.', vi: 'Cô ấy không ấm.', id: 'Dia tidak hangat.', tr: 'O sıcak değil.', pl: 'Jej nie jest ciepło.' },
  } as const;
  Object.entries(expected).forEach(([english, meanings]) => {
    const phrase = EPISODE_01_SESSION_18_SOURCE.phrases.find((candidate) => candidate.english === english);
    Object.entries(meanings).forEach(([locale, meaning]) => {
      expect(phrase?.localizedDetails?.[locale as keyof typeof meanings].meaning).toBe(meaning);
    });
  });
});

test('intros use topic-specific native copy with exact question order and no chronology', () => {
  const sources = [EPISODE_01_SESSION_17_SOURCE, EPISODE_01_SESSION_18_SOURCE, EPISODE_01_SESSION_19_SOURCE, EPISODE_01_SESSION_20_SOURCE, EPISODE_01_SESSION_21_SOURCE, EPISODE_01_SESSION_22_SOURCE, EPISODE_01_SESSION_23_SOURCE, EPISODE_01_SESSION_24_SOURCE];
  const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  const forbidden = /\b(?:session|lesson|course|screen|previous|next|future|Example)\b|(?:сесси|урок|экран|прошл|будущ|следующ|теперь|тепер)|(?:formas conocidas|formas conhecidas|dạng quen thuộc|sudah dikenal|Tanıdık biçimler|Znane formy)/iu;
  sources.forEach((source) => source.introPages.forEach((page) => locales.forEach((locale) => {
    expect(page.body[locale]).not.toMatch(forbidden);
    expect(page.question.explanation[locale]).not.toMatch(forbidden);
  })));
  expect(EPISODE_01_SESSION_19_SOURCE.introPages[1].body.ru).toContain('Is + he/she + description?');
});

test('contracted negative explanations cover both the contraction and not', () => {
  const phrase = EPISODE_01_SESSION_21_SOURCE.phrases.find((candidate) => candidate.english === 'He’s not busy.');
  const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  locales.forEach((locale) => {
    const explanation = phrase?.localizedDetails?.[locale].explanation ?? '';
    expect(explanation).toContain('’s');
    expect((explanation.match(/\bnot\b/gu) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
