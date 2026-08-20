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

const BODY: Record<Locale, readonly [string, string, string]> = {
  ru: ['В английском вопрос часто начинается со связки, потому что именно она показывает форму высказывания. Сначала произнесите связку, затем человека, к которому обращён вопрос. Так собеседник сразу слышит, что вы спрашиваете, а не утверждаете. Готовая фраза нужна в реальном разговоре, когда вы уточняете состояние или место.', 'В устойчивом порядке каждое слово делает свою работу. Связка на первом месте превращает знакомые слова в вопрос, а местоимение остаётся после неё. Признак или место ставят в конце, поэтому смысл слышен без догадки. Такой порядок полезно произносить целиком, чтобы не переставлять слова по привычке.', 'Не переносите порядок слов из утверждения в вопрос без изменения. Если связка остаётся после местоимения, звучит утверждение, хотя голос может быть вопросительным. Отрицание, когда оно нужно, идёт после связки и перед признаком. Проверьте фразу целиком: она должна точно передавать то, что вы хотите узнать.'],
  uk: ['В англійському запитання часто починається зі зв’язки, бо саме вона показує форму вислову. Спочатку вимовте зв’язку, а потім людину, до якої звернене запитання. Так співрозмовник одразу чує, що ви питаєте, а не стверджуєте. Готова фраза потрібна в живій розмові, коли уточнюєте стан або місце.', 'У сталому порядку кожне слово має свою роботу. Зв’язка на початку перетворює знайомі слова на запитання, а займенник лишається після неї. Ознака або місце стоять наприкінці, тому зміст зрозумілий без здогадів. Цей порядок варто вимовляти цілком, щоб не міняти слова за звичкою.', 'Не залишайте порядок твердження у запитанні без зміни. Якщо зв’язка стоїть після займенника, це звучить як твердження, навіть з питальною інтонацією. Заперечення, коли воно потрібне, стоїть після зв’язки та перед ознакою. Перевірте весь вислів: він має точно передавати те, що ви хочете з’ясувати.'],
  es: ['En inglés, una pregunta suele empezar con la forma de be porque esa palabra muestra que preguntas. Di primero la forma de be y después la persona a quien preguntas. Así la otra persona oye la intención desde el inicio y no la confunde con una afirmación. La frase completa sirve para comprobar un estado o un lugar en una conversación real.', 'En este orden, cada palabra tiene una función clara. La forma de be al principio convierte palabras conocidas en una pregunta y el pronombre queda después. La cualidad o el lugar van al final, por eso el sentido llega sin adivinar. Pronuncia el orden entero para que no cambies las palabras por costumbre.', 'No mantengas el orden de una afirmación cuando quieres preguntar. Si be queda después del pronombre, suena a afirmación aunque suba la voz. Cuando hay negación, va después de be y antes de la cualidad. Revisa la frase entera: debe expresar exactamente lo que quieres comprobar.'],
  'pt-BR': ['Em inglês, uma pergunta costuma começar com a forma de be, porque essa palavra mostra que você pergunta. Diga primeiro a forma de be e depois a pessoa a quem pergunta. Assim a outra pessoa percebe a intenção logo no início e não ouve uma afirmação. A frase completa serve para confirmar um estado ou um lugar numa conversa real.', 'Nesta ordem, cada palavra tem um trabalho claro. A forma de be no começo transforma palavras conhecidas em pergunta e o pronome fica depois dela. A característica ou o lugar vem no fim, então o sentido chega sem adivinhação. Fale a ordem inteira para não trocar as palavras por hábito.', 'Não deixe a ordem de uma afirmação quando quer perguntar. Se be fica depois do pronome, soa como afirmação mesmo com a voz subindo. Quando há negação, ela fica depois de be e antes da característica. Confira a frase completa: ela deve dizer exatamente o que você quer confirmar.'],
  vi: ['Trong tiếng Anh, câu hỏi thường bắt đầu bằng dạng be vì từ đó cho người nghe biết bạn đang hỏi. Hãy nói dạng be trước rồi mới nói người được hỏi. Nhờ vậy người nghe nhận ra ý định ngay từ đầu và không nhầm với câu khẳng định. Câu hoàn chỉnh dùng để hỏi về trạng thái hoặc địa điểm trong tình huống thật.', 'Trong trật tự này, mỗi từ có nhiệm vụ rõ ràng. Dạng be ở đầu biến các từ quen thuộc thành câu hỏi và đại từ đứng sau nó. Đặc điểm hoặc địa điểm ở cuối nên ý nghĩa rõ ràng, không cần đoán. Hãy nói cả trật tự để không đổi chỗ từ theo thói quen.', 'Đừng giữ trật tự của câu khẳng định khi bạn muốn hỏi. Nếu be đứng sau đại từ, câu nghe như khẳng định dù giọng nói đi lên. Khi có phủ định, nó đứng sau be và trước đặc điểm. Hãy kiểm tra cả câu: câu phải nói đúng điều bạn muốn xác nhận.'],
  id: ['Dalam bahasa Inggris, pertanyaan sering dimulai dengan bentuk be karena kata itu menunjukkan bahwa kamu bertanya. Ucapkan bentuk be lebih dahulu, lalu orang yang kamu tanyai. Dengan begitu lawan bicara langsung mendengar maksudmu dan tidak mengira itu pernyataan. Kalimat lengkap ini dipakai untuk memastikan keadaan atau tempat dalam percakapan nyata.', 'Dalam urutan ini setiap kata memiliki tugas yang jelas. Bentuk be di awal mengubah kata-kata yang sudah dikenal menjadi pertanyaan dan kata ganti tetap sesudahnya. Sifat atau tempat berada di akhir sehingga maknanya tidak perlu ditebak. Ucapkan seluruh urutan agar kamu tidak menukar kata karena kebiasaan.', 'Jangan memakai urutan pernyataan saat ingin bertanya. Jika be berada setelah kata ganti, bunyinya menjadi pernyataan walaupun nada naik. Bila ada penyangkalan, letakkan setelah be dan sebelum sifat. Periksa kalimat lengkapnya: kalimat harus menyatakan tepat apa yang ingin kamu pastikan.'],
  tr: ['İngilizcede soru çoğu zaman be biçimiyle başlar; çünkü bu sözcük soru sorduğunuzu gösterir. Önce be biçimini, sonra soru yönelttiğiniz kişiyi söyleyin. Böylece karşıdaki kişi niyetinizi hemen duyar ve bunu bildirim sanmaz. Tam cümle, gerçek bir konuşmada bir durumu ya da yeri doğrulamak için kullanılır.', 'Bu dizilimde her sözcüğün görevi açıktır. Baştaki be biçimi tanıdık sözcükleri soruya çevirir ve zamir onun ardından gelir. Özellik ya da yer sonda bulunur; bu yüzden anlam tahmin gerektirmez. Sözcükleri alışkanlıkla değiştirmemek için dizilimi bütün olarak söyleyin.', 'Sormak isterken bildirim sırasını değiştirmeden bırakmayın. Be zamirden sonra kalırsa, ses yükselse bile bildirim gibi duyulur. Olumsuzluk gerektiğinde be sonrasında ve özellikten önce gelir. Tüm cümleyi kontrol edin: doğrulamak istediğiniz şeyi tam olarak söylemelidir.'],
  pl: ['W języku angielskim pytanie często zaczyna się od formy be, ponieważ to słowo pokazuje, że pytasz. Najpierw powiedz formę be, a potem osobę, do której kierujesz pytanie. Dzięki temu rozmówca od razu słyszy zamiar i nie bierze zdania za stwierdzenie. Pełne zdanie służy do sprawdzenia stanu albo miejsca w prawdziwej rozmowie.', 'W tym szyku każde słowo ma jasne zadanie. Forma be na początku zmienia znane słowa w pytanie, a zaimek zostaje po niej. Cecha albo miejsce stoją na końcu, więc sens nie wymaga zgadywania. Powiedz cały szyk, aby nie przestawiać słów z przyzwyczajenia.', 'Nie zostawiaj szyku oznajmującego, gdy chcesz zapytać. Jeśli be stoi po zaimku, zdanie brzmi jak stwierdzenie, nawet gdy głos idzie w górę. Gdy potrzebne jest przeczenie, stoi ono po be i przed cechą. Sprawdź całe zdanie: ma dokładnie wyrażać to, co chcesz potwierdzić.'],
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
    explanation: `Эту фразу говорят, когда нужно естественно уточнить состояние или место человека. Слова стоят именно в таком порядке, потому что форма to be связывает человека с признаком, местом или вопросом.`,
    words: tokens(english).map((correct) => ({
      correct,
      category: /^(I|you|You)$/u.test(correct) ? 'pronoun' : /^(am|are|Are|Am)$/u.test(correct) ? 'to-be' : correct === 'not' ? 'negation' : 'lexical',
      distractors: Array.from({ length: 5 }, (_, distractor) => ({ value: `${correct}${distractor + 1}`, reasonCode: 'wrong_token', why: `Вариант ${correct}${distractor + 1} не является нужным английским словом и не может занять эту позицию в готовой фразе.` })),
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

function introBody(locale: Locale, page: 0 | 1 | 2, target: string): string {
  return `${BODY[locale][page]} ${COPY[locale].explain} ${COPY[locale].right} ${target}`;
}

export function buildEpisode01Session11To16(ordinal: 11 | 12 | 13 | 14 | 15 | 16): SessionSource {
  const target = SESSION_PHRASES[ordinal][0];
  const title = localized((locale) => `${COPY[locale].title}: ${target}`);
  const body1 = localized((locale) => introBody(locale, 0, target));
  const body2 = localized((locale) => introBody(locale, 1, target));
  const body3 = localized((locale) => introBody(locale, 2, target));
  const introPages = [body1, body2, body3].map((body, index) => ({
    kind: (['concept', 'formula', 'trap'] as const)[index],
    title,
    body,
    bodyRuns: runs(body, [target]),
    question: {
      prompt: localized((locale) => COPY[locale].choose),
      choices: [title, localized(() => target), localized(() => SESSION_PHRASES[ordinal][1])],
      correctChoiceIndex: 1 as const,
      explanation: localized((locale) => `${COPY[locale].right} ${target}. ${COPY[locale].explain}`),
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
