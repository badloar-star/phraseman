import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { SessionKind } from './episode_01_session_map_v1';
import type { LocalizedIntroRunsSource, LocalizedSource, SessionSource } from './session_shard_from_source_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];

const COPY: Record<Locale, { title: string; meaning: string; explain: string; choose: string; right: string; wrong: string }> = {
  ru: { title: 'Скажи это по-английски', meaning: 'Значение', explain: 'Эту фразу говорят в живой ситуации. Порядок слов показывает, кто и в какой форме связан с признаком или местом.', choose: 'Выберите готовую английскую фразу.', right: 'Верно: форма связки стоит на своём месте.', wrong: 'Проверьте порядок слов и форму связки.' },
  uk: { title: 'Скажи це англійською', meaning: 'Значення', explain: 'Цю фразу кажуть у живій ситуації. Порядок слів показує, хто і якою формою пов’язаний з ознакою або місцем.', choose: 'Оберіть готову англійську фразу.', right: 'Правильно: форма зв’язки стоїть на своєму місці.', wrong: 'Перевірте порядок слів і форму зв’язки.' },
  es: { title: 'Dilo en inglés', meaning: 'Significado', explain: 'Esta frase se usa en una situación real. El orden muestra quién se une a una cualidad o a un lugar.', choose: 'Elige la frase inglesa completa.', right: 'Correcto: la forma de be está en su lugar.', wrong: 'Revisa el orden y la forma de be.' },
  'pt-BR': { title: 'Diga em inglês', meaning: 'Significado', explain: 'Esta frase aparece em uma situação real. A ordem mostra quem se liga a uma característica ou lugar.', choose: 'Escolha a frase completa em inglês.', right: 'Certo: a forma de be está no lugar.', wrong: 'Confira a ordem e a forma de be.' },
  vi: { title: 'Nói bằng tiếng Anh', meaning: 'Nghĩa', explain: 'Câu này dùng trong tình huống thực. Trật tự từ cho biết ai gắn với đặc điểm hoặc địa điểm.', choose: 'Chọn câu tiếng Anh hoàn chỉnh.', right: 'Đúng: dạng be ở đúng vị trí.', wrong: 'Kiểm tra trật tự từ và dạng be.' },
  id: { title: 'Ucapkan dalam bahasa Inggris', meaning: 'Arti', explain: 'Kalimat ini dipakai dalam situasi nyata. Urutan kata menunjukkan siapa yang terhubung dengan sifat atau tempat.', choose: 'Pilih kalimat bahasa Inggris lengkap.', right: 'Benar: bentuk be berada di tempatnya.', wrong: 'Periksa urutan kata dan bentuk be.' },
  tr: { title: 'İngilizce söyle', meaning: 'Anlam', explain: 'Bu cümle gerçek bir durumda kullanılır. Sözcük sırası kimin bir özellik ya da yerle bağlandığını gösterir.', choose: 'Tam İngilizce cümleyi seçin.', right: 'Doğru: be biçimi yerinde.', wrong: 'Sözcük sırasını ve be biçimini kontrol edin.' },
  pl: { title: 'Powiedz to po angielsku', meaning: 'Znaczenie', explain: 'Tego zdania używa się w prawdziwej sytuacji. Szyk pokazuje, kto łączy się z cechą lub miejscem.', choose: 'Wybierz pełne zdanie po angielsku.', right: 'Dobrze: forma be jest na swoim miejscu.', wrong: 'Sprawdź szyk i formę be.' },
};

const localized = (value: (locale: Locale) => string): LocalizedSource => Object.fromEntries(LOCALES.map((locale) => [locale, value(locale)])) as unknown as LocalizedSource;
const tokens = (english: string) => english.replace(/[?!.]/g, '').split(/\s+/).filter(Boolean);

function allDetails(english: string): Record<Locale, EpisodeSourcePhraseLocalizedDetails> {
  return Object.fromEntries(LOCALES.map((locale) => {
    const copy = COPY[locale];
    const words = tokens(english);
    return [locale, {
      meaning: `${copy.meaning}: ${english}`,
      explanation: copy.explain,
      distractors: words.slice(0, 5).map((word) => ({ value: `${word}?`, reason: copy.wrong })),
      words: words.map((word) => ({ correct: word, prompt: `${copy.choose} ${word}`, distractors: Array.from({ length: 5 }, (_, index) => ({ value: `${word}${index + 1}`, reason: copy.wrong })) })),
    }];
  })) as unknown as Record<Locale, EpisodeSourcePhraseLocalizedDetails>;
}

function phrase(ordinal: number, index: number, english: string, features: readonly string[]): EpisodeSourcePhrase {
  const localizedDetails = allDetails(english);
  return {
    id: `e01-s${String(ordinal).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
    english,
    russian: localizedDetails.ru.meaning,
    explanation: localizedDetails.ru.explanation,
    words: tokens(english).map((correct) => ({
      correct,
      category: /^(I|you|You)$/u.test(correct) ? 'pronoun' : /^(am|are|Are|Am)$/u.test(correct) ? 'to-be' : correct === 'not' ? 'negation' : 'lexical',
      distractors: Array.from({ length: 5 }, (_, distractor) => ({ value: `${correct}${distractor + 1}`, reasonCode: 'wrong_token', why: 'Это не нужное слово в этой позиции.' })),
    })),
    localizedDetails,
    features,
  };
}

function runs(body: LocalizedSource, targets: readonly string[]): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale];
    const term = targets.find((target) => text.includes(target));
    if (!term) return [ { text, semantic: 'explanation' } ];
    const [before, after] = text.split(term);
    return [locale, [{ text: before, semantic: 'explanation' }, { text: term, semantic: 'targetCorrect' }, { text: after, semantic: 'explanation' }]];
  })) as LocalizedIntroRunsSource;
}

const SESSION_PHRASES: Record<number, readonly string[]> = {
  11: ['Are you ready?', 'Are you okay?', 'Are you here?', 'Are you busy?', 'Are you tired?', 'Are you happy?', 'Are you calm?', 'Are you cold?', 'Are you warm?', 'Are you at home?', 'Are you in class?', 'Are you on the bus?', 'Are you not ready?', 'Are you not sure?', 'Are you all right?'],
  12: ['Am I ready?', 'Am I okay?', 'Am I here?', 'Am I busy?', 'Am I tired?', 'Am I happy?', 'Am I calm?', 'Am I cold?', 'Am I warm?', 'Am I at home?', 'Am I in class?', 'Am I on the bus?', 'Am I not ready?', 'Am I not sure?', 'Am I all right?'],
  13: ["You’re ready.", "You’re okay.", "You’re here.", "You’re busy.", "You’re tired.", "You’re happy.", "You’re calm.", "You’re cold.", "You’re warm.", "You’re at home.", "You’re in class.", "You’re on the bus.", "You’re not ready.", "You’re not sure.", "You’re all right."],
  14: ['I am at home.', 'You are at home.', 'I am in class.', 'You are in class.', 'I am at work.', 'You are at work.', 'I am in the park.', 'You are in the park.', 'I am at the station.', 'You are at the station.', 'I am on the bus.', 'You are on the bus.', 'I am in the café.', 'You are in the café.', 'You are not at home.'],
  15: ['Are you ready?', 'Am I ready?', "You’re ready.", 'I am ready.', 'Are you okay?', 'Am I okay?', "You’re not busy.", 'I am not busy.', 'Are you at home?', 'Am I at home?', "You’re in class.", 'I am in class.', 'Are you not sure?', 'Am I not sure?', "You’re all right."],
  16: ['I am here.', 'You are here.', 'Are you here?', 'Am I here?', "You’re here.", 'I am not ready.', 'You are not ready.', 'Are you ready?', 'Am I ready?', "You’re not ready.", 'I am at home.', 'You are in class.', 'Are you on the bus?', 'Am I okay?', "You’re all right."],
};

const FEATURES: Record<number, readonly string[]> = { 11: ['copula_be', 'second_person', 'question_inversion'], 12: ['copula_be', 'first_person_singular', 'question_inversion'], 13: ['copula_be', 'second_person', 'contraction_youre', 'negation_not'], 14: ['copula_be', 'first_person_singular', 'second_person', 'place_noun', 'preposition_place'], 15: ['copula_be', 'first_person_singular', 'second_person', 'question_inversion', 'spoken_production'], 16: ['copula_be', 'first_person_singular', 'second_person', 'question_inversion', 'contraction_youre', 'place_noun'] };

export function buildEpisode01Session11To16(ordinal: 11 | 12 | 13 | 14 | 15 | 16): SessionSource {
  const target = SESSION_PHRASES[ordinal][0];
  const title = localized((locale) => `${COPY[locale].title}: ${target}`);
  const body1 = localized((locale) => `${COPY[locale].explain} ${target}`);
  const body2 = localized((locale) => `${COPY[locale].right} ${target}`);
  const body3 = localized((locale) => `${COPY[locale].wrong} ${target}`);
  const introPages = [body1, body2, body3].map((body, index) => ({
    kind: (['concept', 'formula', 'trap'] as const)[index],
    title,
    body,
    bodyRuns: runs(body, [target]),
    question: {
      prompt: localized((locale) => COPY[locale].choose),
      choices: [title, localized(() => target), localized(() => SESSION_PHRASES[ordinal][1])],
      correctChoiceIndex: 1 as const,
      explanation: localized((locale) => COPY[locale].right),
    },
  })) as unknown as SessionSource['introPages'];
  return {
    packageId: 'learning-v2-en-v1', targetLanguage: 'en', episodeOrdinal: 1, requiredSessionOrdinal: ordinal,
    canDoOutcomeId: 'obj-e01-say-who-i-am', generationInputFingerprint: `authored-e01-s${ordinal}-v1`,
    title, summary: localized((locale) => COPY[locale].explain), learningGoal: localized((locale) => COPY[locale].right), introPages,
    phrases: SESSION_PHRASES[ordinal].map((english, index) => phrase(ordinal, index, english, FEATURES[ordinal])),
  };
}

export function assertAuthoredSessionContract(source: SessionSource, ordinal: number, kind: SessionKind, taught?: string): void {
  expect(source.requiredSessionOrdinal).toBe(ordinal); expect(source.phrases).toHaveLength(15); expect(source.introPages.map((page) => page.kind)).toEqual(['concept', 'formula', 'trap']);
  source.introPages.forEach((page) => LOCALES.forEach((locale) => { expect(page.title[locale]).toBeTruthy(); expect(page.bodyRuns?.[locale].map((run) => run.text).join('')).toBe(page.body[locale]); }));
  source.phrases.forEach((item) => { expect(item.words.length).toBeGreaterThan(0); item.words.forEach((word) => expect(new Set(word.distractors.map((entry) => entry.value)).size).toBe(5)); LOCALES.forEach((locale) => expect(item.localizedDetails?.[locale]).toBeDefined()); });
  if (taught) expect(source.phrases.some((item) => item.features.includes(taught))).toBe(true); expect(kind).toBeTruthy();
}
