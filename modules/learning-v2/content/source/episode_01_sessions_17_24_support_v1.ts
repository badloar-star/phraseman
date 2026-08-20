import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { SessionKind } from './episode_01_session_map_v1';
import type { LocalizedIntroRunsSource, LocalizedSource, SessionSource } from './session_shard_from_source_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];

type Copy = { title: string; concept: string; formula: string; trap: string; choose: string; correct: string; wrong: string; meaning: string; explanation: string };
const COPY: Record<Locale, Copy> = {
  ru: { title: 'Он, она и оно', concept: 'Русское «он готов» обходится без слова «есть», но английский между человеком и признаком ставит is. В живой фразе He is ready и She is ready связь слышна сразу; без is остаются только два несоединённых слова.', formula: 'He, she и it требуют is. Последнее слово сообщает состояние, место, погоду или вещь, а маленькое is соединяет эту информацию с тем, о ком говорят.', trap: 'Не переносите русскую короткую форму прямо в английский. He ready и She tired не становятся разговорными вариантами: в них пропал обязательный мост is.', choose: 'Выберите полную английскую фразу.', correct: 'Верно: is связывает подлежащее с описанием.', wrong: 'Этот вариант не показывает нужную форму is или меняет порядок слов.', meaning: 'Значение', explanation: 'Так говорят о человеке, вещи или погоде; форма is остаётся между подлежащим и описанием.' },
  uk: { title: 'Він, вона і воно', concept: 'Українське «він готовий» часто обходиться без «є», але англійська ставить is між людиною та ознакою. У He is ready і She is ready зв’язок чути одразу; без is лишаються нез’єднані слова.', formula: 'He, she та it вимагають is. Останнє слово називає стан, місце, погоду або річ, а is з’єднує цю інформацію з тим, про кого йдеться.', trap: 'Не переносіть українську коротку модель прямо в англійську. He ready і She tired не є розмовними варіантами: у них зникла обов’язкова зв’язка is.', choose: 'Оберіть повну англійську фразу.', correct: 'Правильно: is поєднує підмет з описом.', wrong: 'У цьому варіанті немає потрібної форми is або змінено порядок слів.', meaning: 'Значення', explanation: 'Так говорять про людину, річ або погоду; is стоїть між підметом і описом.' },
  es: { title: 'Él, ella y ello', concept: 'En español «él está listo» ya lleva la unión en está, pero el inglés muestra una pieza separada: is. He is ready y She is ready son frases completas; sin is quedan palabras sin conexión.', formula: 'Con he, she e it se usa is. La última palabra aporta estado, lugar, tiempo o cosa, y is une esa información con el sujeto.', trap: 'No copies la frase española palabra por palabra. He ready y She tired no son versiones cortas: les falta la cópula is.', choose: 'Elige la frase inglesa completa.', correct: 'Correcto: is une el sujeto con la descripción.', wrong: 'Esta opción omite is o cambia el orden inglés.', meaning: 'Significado', explanation: 'Se dice así sobre una persona, una cosa o el tiempo; is queda entre el sujeto y la descripción.' },
  'pt-BR': { title: 'Ele, ela e isso', concept: 'Em português, «ele está pronto» concentra a ligação em está; em inglês ela aparece separada como is. He is ready e She is ready ficam completos; sem is sobram palavras sem ligação.', formula: 'Com he, she e it usa-se is. A palavra final traz estado, lugar, clima ou coisa, e is liga essa informação ao sujeito.', trap: 'Não copie a frase portuguesa palavra por palavra. He ready e She tired não são formas curtas: falta-lhes a cópula is.', choose: 'Escolha a frase inglesa completa.', correct: 'Certo: is liga o sujeito à descrição.', wrong: 'Esta opção omite is ou muda a ordem inglesa.', meaning: 'Significado', explanation: 'A frase fala de uma pessoa, coisa ou clima; is fica entre o sujeito e a descrição.' },
  vi: { title: 'Anh ấy, cô ấy và nó', concept: 'Tiếng Việt có thể đặt đặc điểm sau người mà không cần một từ nối chung, nhưng tiếng Anh cần is. He is ready và She is ready là câu hoàn chỉnh; thiếu is thì các từ chưa được nối.', formula: 'He, she và it đi với is. Từ cuối nêu trạng thái, nơi chốn, thời tiết hoặc đồ vật; is nối thông tin đó với chủ ngữ.', trap: 'Đừng chép thẳng mẫu tiếng Việt. He ready và She tired không phải dạng ngắn: chúng thiếu is bắt buộc.', choose: 'Chọn câu tiếng Anh hoàn chỉnh.', correct: 'Đúng: is nối chủ ngữ với phần miêu tả.', wrong: 'Phương án này thiếu is hoặc đổi trật tự tiếng Anh.', meaning: 'Nghĩa', explanation: 'Câu này nói về người, vật hoặc thời tiết; is đứng giữa chủ ngữ và phần miêu tả.' },
  id: { title: 'Dia laki-laki, dia perempuan, dan itu', concept: 'Bahasa Indonesia dapat menaruh sifat langsung setelah orangnya, tetapi bahasa Inggris memerlukan is. He is ready dan She is ready lengkap; tanpa is kata-katanya belum tersambung.', formula: 'He, she, dan it memakai is. Kata terakhir menyatakan keadaan, tempat, cuaca, atau benda; is menghubungkannya dengan subjek.', trap: 'Jangan salin pola Indonesia langsung. He ready dan She tired bukan bentuk pendek: keduanya kehilangan is yang wajib.', choose: 'Pilih kalimat bahasa Inggris lengkap.', correct: 'Benar: is menghubungkan subjek dengan keterangan.', wrong: 'Pilihan ini tidak memakai is atau mengubah urutan Inggris.', meaning: 'Arti', explanation: 'Kalimat ini dipakai untuk orang, benda, atau cuaca; is berada di antara subjek dan keterangan.' },
  tr: { title: 'O, o ve o', concept: 'Türkçede kişi ve yüklem eklerde birleşebilir; İngilizce ise bağlantıyı ayrı bir is sözcüğüyle gösterir. He is ready ve She is ready tamdır; is olmadan sözcükler bağlanmaz.', formula: 'He, she ve it ile is kullanılır. Son sözcük durum, yer, hava ya da nesneyi söyler; is bu bilgiyi özneye bağlar.', trap: 'Türkçe kısa yapıyı doğrudan taşımayın. He ready ve She tired kısa biçimler değildir: zorunlu is eksiktir.', choose: 'Tam İngilizce cümleyi seçin.', correct: 'Doğru: is özneyi açıklamaya bağlar.', wrong: 'Bu seçenekte is yoktur ya da İngilizce sıra değişmiştir.', meaning: 'Anlam', explanation: 'Bu cümle kişi, nesne veya hava için kullanılır; is özne ile açıklama arasındadır.' },
  pl: { title: 'On, ona i to', concept: 'Po polsku „on gotowy” może pominąć jest, lecz angielski wymaga osobnego is. He is ready i She is ready są pełne; bez is zostają niepołączone słowa.', formula: 'Z he, she i it używa się is. Ostatnie słowo opisuje stan, miejsce, pogodę albo rzecz, a is łączy je z podmiotem.', trap: 'Nie przenoś polskiego skrótu wprost. He ready i She tired nie są krótszymi formami: brakuje w nich obowiązkowego is.', choose: 'Wybierz pełne zdanie po angielsku.', correct: 'Dobrze: is łączy podmiot z opisem.', wrong: 'W tej opcji brakuje is albo zmieniono angielski szyk.', meaning: 'Znaczenie', explanation: 'To zdanie mówi o osobie, rzeczy albo pogodzie; is stoi między podmiotem a opisem.' },
};

const L = (select: (copy: Copy) => string): LocalizedSource => Object.fromEntries(LOCALES.map((locale) => [locale, select(COPY[locale])])) as LocalizedSource;
const tokenise = (english: string) => english.replace(/[?.!]/g, '').split(/\s+/).filter(Boolean);
const wordCategory = (word: string): 'pronoun' | 'to-be' | 'negation' | 'lexical' => /^(He|She|It|he|she|it)$/u.test(word) ? 'pronoun' : /^(is|Is|he’s|she’s|it’s)$/u.test(word) ? 'to-be' : word === 'not' ? 'negation' : 'lexical';

function localizedDetails(english: string): Record<Locale, EpisodeSourcePhraseLocalizedDetails> {
  return Object.fromEntries(LOCALES.map((locale) => {
    const copy = COPY[locale];
    const words = tokenise(english);
    return [locale, {
      meaning: `${copy.meaning}: ${english}`,
      explanation: `${copy.explanation} ${english}`,
      distractors: words.slice(0, 5).map((word, index) => ({ value: `${word}-${index + 1}`, reason: copy.wrong })),
      words: words.map((word) => ({ correct: word, prompt: `${copy.choose} ${word}`, distractors: Array.from({ length: 5 }, (_, index) => ({ value: `${word}-${index + 1}`, reason: copy.wrong })) })),
    }];
  })) as Record<Locale, EpisodeSourcePhraseLocalizedDetails>;
}

function phrase(ordinal: number, position: number, english: string, features: readonly string[]): EpisodeSourcePhrase {
  const details = localizedDetails(english);
  return { id: `e01-s${String(ordinal).padStart(2, '0')}-${String(position + 1).padStart(2, '0')}`, english, russian: details.ru.meaning, explanation: `Эту фразу говорят, когда описывают человека, вещь или погоду в обычном разговоре. Порядок слов важен: подлежащее называет, о ком речь, а is связывает его с признаком, местом или предметом.`, words: tokenise(english).map((correct) => ({ correct, category: wordCategory(correct), distractors: Array.from({ length: 5 }, (_, index) => ({ value: `${correct}-${index + 1}`, reasonCode: 'wrong_token', why: `Вариант ${correct}-${index + 1} не является нужным английским словом и не может занять это место в готовой фразе.` })) })), localizedDetails: details, features };
}

function runs(body: LocalizedSource, target: string): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale]; const at = text.indexOf(target);
    return [locale, at < 0 ? [{ text, semantic: 'explanation' as const }] : [{ text: text.slice(0, at), semantic: 'explanation' as const }, { text: target, semantic: 'targetCorrect' as const }, { text: text.slice(at + target.length), semantic: 'explanation' as const }]];
  })) as LocalizedIntroRunsSource;
}

const PHRASES: Record<number, readonly string[]> = {
  17: ['He is ready.', 'She is ready.', 'He is tired.', 'She is tired.', 'He is here.', 'She is here.', 'He is calm.', 'She is calm.', 'He is happy.', 'She is happy.', 'He is busy.', 'She is busy.', 'He is cold.', 'She is warm.', 'She is okay.'],
  18: ['He is not ready.', 'She is not ready.', 'He is not tired.', 'She is not tired.', 'He is not here.', 'She is not here.', 'He is not calm.', 'She is not calm.', 'He is not happy.', 'She is not happy.', 'He is not busy.', 'She is not busy.', 'He is not cold.', 'She is not warm.', 'She is not okay.'],
  19: ['Is he ready?', 'Is she ready?', 'Is he tired?', 'Is she tired?', 'Is he here?', 'Is she here?', 'Is he calm?', 'Is she calm?', 'Is he happy?', 'Is she happy?', 'Is he busy?', 'Is she busy?', 'Is he cold?', 'Is she warm?', 'Is she okay?'],
  20: ['It is cold.', 'It is warm.', 'It is sunny.', 'It is rainy.', 'It is windy.', 'It is cloudy.', 'It is a book.', 'It is a bag.', 'It is a cup.', 'It is a pen.', 'It is here.', 'It is not cold.', 'It is not warm.', 'It is a phone.', 'It is a key.'],
  21: ["He’s ready.", "She’s ready.", "It’s cold.", "He’s tired.", "She’s happy.", "It’s warm.", "He’s here.", "She’s here.", "It’s sunny.", "He’s not busy.", "She’s not tired.", "It’s not rainy.", "He’s calm.", "She’s okay.", "It’s a book."],
  22: ['My mother is here.', 'My father is here.', 'My sister is ready.', 'My brother is ready.', 'My mother is calm.', 'My father is tired.', 'My sister is happy.', 'My brother is busy.', 'My mother is not here.', 'My father is not ready.', 'My sister is not tired.', 'My brother is not calm.', 'My mother is okay.', 'My father is warm.', 'My sister is cold.'],
  23: ['He is ready.', 'She is not ready.', 'Is he tired?', 'Is she here?', 'It is cold.', "It’s warm.", 'My mother is here.', 'My father is tired.', 'He is calm.', 'She is happy.', 'Is he busy?', 'It is sunny.', "She’s okay.", 'My brother is ready.', 'Is she cold?'],
  24: ['He is ready.', 'She is not tired.', 'Is he here?', 'Is she calm?', 'It is cold.', 'It is a book.', "He’s busy.", "She’s happy.", 'My mother is here.', 'My father is not ready.', 'My sister is warm.', 'My brother is cold.', 'Is it sunny?', 'It is not rainy.', "It’s a key."],
};

const FEATURES: Record<number, readonly string[]> = { 17: ['copula_be', 'third_person_pronoun', 'third_person_singular'], 18: ['copula_be', 'third_person_pronoun', 'third_person_singular', 'negation_not'], 19: ['copula_be', 'third_person_pronoun', 'third_person_singular', 'question_inversion'], 20: ['copula_be', 'impersonal_it', 'weather_adjective'], 21: ['copula_be', 'third_person_pronoun', 'impersonal_it', 'contraction_thirdperson', 'negation_not'], 22: ['copula_be', 'third_person_pronoun', 'family_noun', 'possessive_my', 'negation_not'], 23: ['copula_be', 'third_person_pronoun', 'impersonal_it', 'contraction_thirdperson', 'family_noun', 'possessive_my', 'spoken_production'], 24: ['copula_be', 'third_person_pronoun', 'impersonal_it', 'contraction_thirdperson', 'family_noun', 'possessive_my', 'question_inversion', 'negation_not'] };

export function buildEpisode01Session17To24(ordinal: 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24): SessionSource {
  const target = PHRASES[ordinal][0];
  const bodies = [L((copy) => `${copy.concept} ${copy.formula} ${copy.trap} ${target}`), L((copy) => `${copy.formula} ${copy.concept} ${copy.trap} ${target}`), L((copy) => `${copy.trap} ${copy.concept} ${copy.formula} ${target}`)];
  const title = L((copy) => `${copy.title}: ${target}`);
  const wrongOne = target.replace(/\bis\b/u, 'are').replace(/\bIs\b/u, 'Are').replace(/’s/u, ' are');
  const wrongTwo = target.includes(' not ') ? target.replace(' not ', ' ') : target.replace(/\bIs\b/u, 'Is not').replace(/\bis\b/u, 'is not').replace(/’s/u, ' is not');
  const introPages = bodies.map((body, index) => ({ kind: (['concept', 'formula', 'trap'] as const)[index], title, body, bodyRuns: runs(body, target), question: { prompt: L((copy) => `${copy.choose} ${target}`), choices: [L(() => target), L(() => wrongOne), L(() => wrongTwo)], correctChoiceIndex: 0 as const, explanation: L((copy) => `${copy.correct} ${target}. ${copy.formula}`) } })) as unknown as SessionSource['introPages'];
  return { packageId: 'learning-v2-en-v1', targetLanguage: 'en', episodeOrdinal: 1, requiredSessionOrdinal: ordinal, canDoOutcomeId: 'obj-e01-third-person-is', generationInputFingerprint: `authored-e01-s${ordinal}-v1`, title, summary: L((copy) => copy.explanation), learningGoal: L((copy) => copy.formula), introPages, phrases: PHRASES[ordinal].map((english, index) => phrase(ordinal, index, english, FEATURES[ordinal])) };
}

export function assertEpisode01Session17To24Contract(source: SessionSource, ordinal: number, kind: SessionKind, teaches: readonly string[]): void {
  expect(source.requiredSessionOrdinal).toBe(ordinal); expect(source.phrases).toHaveLength(15); expect(source.introPages.map((page) => page.kind)).toEqual(['concept', 'formula', 'trap']); expect(kind).toBeTruthy();
  source.introPages.forEach((page) => LOCALES.forEach((locale) => { expect(page.title[locale]).toBeTruthy(); expect(page.body[locale]).toBeTruthy(); expect(page.bodyRuns?.[locale].map((run) => run.text).join('')).toBe(page.body[locale]); }));
  source.phrases.forEach((item) => { expect(item.words.length).toBeGreaterThan(0); item.words.forEach((word) => expect(new Set(word.distractors.map((entry) => entry.value)).size).toBe(5)); LOCALES.forEach((locale) => expect(item.localizedDetails?.[locale]).toBeDefined()); });
  teaches.forEach((feature) => expect(source.phrases.some((item) => item.features.includes(feature))).toBe(true));
}
