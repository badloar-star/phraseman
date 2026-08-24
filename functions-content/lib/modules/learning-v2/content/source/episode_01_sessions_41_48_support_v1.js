"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEpisode01Session41To48 = buildEpisode01Session41To48;
exports.assertEpisode01Sessions41To48Contract = assertEpisode01Sessions41To48Contract;
const episode_01_sessions_41_48_intro_data_v1_1 = require("./episode_01_sessions_41_48_intro_data_v1");
const episode_01_phrase_localization_41_56_v1_1 = require("./episode_01_phrase_localization_41_56_v1");
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
// Each locale is authored as learner-facing copy, rather than falling back to Russian.
const COPY = {
    ru: { title: 'Мир вокруг', concept: 'Новые слова называют вещи и людей, но знакомая связка to be держит всю фразу. Сначала назовите предмет или человека, затем спокойно добавьте am, is или are.', formula: 'Смотрите на модель: subject + am/is/are + word. В английском цвет и размер стоят перед предметом: a red bag, a small cup.', trap: 'Не меняйте порядок слов и не добавляйте другой глагол. Для возраста английский говорит years old после формы to be: She is ten years old.', prompt: 'Выберите точную английскую фразу.', correct: 'Верно: форма to be и порядок слов подходят.', wrong: 'Это другое слово или оно стоит не на своём месте.', meaning: 'Значение', explanation: 'Это естественное короткое описание на английском.' },
    uk: { title: 'Світ навколо', concept: 'Нові слова називають речі й людей, але знайома зв’язка to be тримає всю фразу. Спочатку назвіть предмет чи людину, потім додайте am, is або are.', formula: 'Дивіться на модель: subject + am/is/are + word. В англійській колір і розмір стоять перед предметом: a red bag, a small cup.', trap: 'Не міняйте порядок слів і не додавайте іншого дієслова. Для віку англійська ставить years old після форми to be: She is ten years old.', prompt: 'Оберіть точну англійську фразу.', correct: 'Правильно: форма to be і порядок слів підходять.', wrong: 'Це інше слово або воно стоїть не на своєму місці.', meaning: 'Значення', explanation: 'Це природний короткий опис англійською.' },
    es: { title: 'El mundo cercano', concept: 'Las palabras nuevas nombran cosas y personas, pero la unión conocida to be sostiene toda la frase. Nombra primero la cosa o la persona y añade am, is o are.', formula: 'Mira el modelo: subject + am/is/are + word. En inglés el color y el tamaño van antes del objeto: a red bag, a small cup.', trap: 'No cambies el orden ni añadas otro verbo. Para la edad, years old va después de to be: She is ten years old.', prompt: 'Elige la frase inglesa exacta.', correct: 'Correcto: la forma de to be y el orden encajan.', wrong: 'Es otra palabra o está en una posición incorrecta.', meaning: 'Significado', explanation: 'Es una descripción corta y natural en inglés.' },
    'pt-BR': { title: 'O mundo ao redor', concept: 'As palavras novas nomeiam objetos e pessoas, mas a ligação conhecida to be sustenta a frase inteira. Nomeie primeiro o objeto ou a pessoa e acrescente am, is ou are.', formula: 'Veja o modelo: subject + am/is/are + word. Em inglês cor e tamanho vêm antes do objeto: a red bag, a small cup.', trap: 'Não troque a ordem nem acrescente outro verbo. Para idade, years old vem depois de to be: She is ten years old.', prompt: 'Escolha a frase inglesa exata.', correct: 'Certo: a forma de to be e a ordem combinam.', wrong: 'É outra palavra ou está na posição errada.', meaning: 'Significado', explanation: 'É uma descrição curta e natural em inglês.' },
    vi: { title: 'Thế giới quanh ta', concept: 'Từ mới gọi tên đồ vật và con người, còn liên kết quen thuộc to be giữ cả câu. Hãy nêu đồ vật hay người trước rồi thêm am, is hoặc are.', formula: 'Mẫu là: subject + am/is/are + word. Trong tiếng Anh màu sắc và kích thước đứng trước đồ vật: a red bag, a small cup.', trap: 'Đừng đổi trật tự hay thêm động từ khác. Khi nói tuổi, years old đứng sau to be: She is ten years old.', prompt: 'Chọn câu tiếng Anh chính xác.', correct: 'Đúng: dạng to be và trật tự phù hợp.', wrong: 'Đó là từ khác hoặc ở sai vị trí.', meaning: 'Nghĩa', explanation: 'Đây là câu miêu tả ngắn tự nhiên bằng tiếng Anh.' },
    id: { title: 'Dunia di sekitar', concept: 'Kata baru menamai benda dan orang, sedangkan penghubung to be yang sudah dikenal menjaga seluruh kalimat. Sebutkan benda atau orang dahulu, lalu tambahkan am, is, atau are.', formula: 'Polanya: subject + am/is/are + word. Dalam bahasa Inggris warna dan ukuran berada sebelum benda: a red bag, a small cup.', trap: 'Jangan mengubah urutan atau menambahkan kata kerja lain. Untuk usia, years old berada setelah to be: She is ten years old.', prompt: 'Pilih kalimat Inggris yang tepat.', correct: 'Benar: bentuk to be dan urutannya cocok.', wrong: 'Itu kata lain atau posisinya salah.', meaning: 'Arti', explanation: 'Ini deskripsi pendek yang alami dalam bahasa Inggris.' },
    tr: { title: 'Çevremizdeki dünya', concept: 'Yeni sözcükler nesneleri ve insanları adlandırır; tanıdık to be bağı ise tüm cümleyi taşır. Önce nesneyi ya da kişiyi söyleyin, sonra am, is veya are ekleyin.', formula: 'Kalıp: subject + am/is/are + word. İngilizcede renk ve boyut nesneden önce gelir: a red bag, a small cup.', trap: 'Sırayı değiştirmeyin ve başka fiil eklemeyin. Yaş için years old, to be biçiminden sonra gelir: She is ten years old.', prompt: 'Tam doğru İngilizce cümleyi seçin.', correct: 'Doğru: to be biçimi ve sıra uygundur.', wrong: 'Bu başka bir sözcük ya da yanlış konumdadır.', meaning: 'Anlam', explanation: 'Bu İngilizcede doğal ve kısa bir betimlemedir.' },
    pl: { title: 'Świat wokół nas', concept: 'Nowe słowa nazywają rzeczy i ludzi, lecz znane to be trzyma całe zdanie. Najpierw nazwij rzecz albo osobę, potem dodaj am, is lub are.', formula: 'Wzór: subject + am/is/are + word. W angielskim kolor i rozmiar stoją przed rzeczą: a red bag, a small cup.', trap: 'Nie zmieniaj szyku ani nie dodawaj innego czasownika. Przy wieku years old stoi po to be: She is ten years old.', prompt: 'Wybierz dokładne zdanie po angielsku.', correct: 'Dobrze: forma to be i szyk są właściwe.', wrong: 'To inne słowo albo stoi w złym miejscu.', meaning: 'Znaczenie', explanation: 'To naturalny, krótki opis po angielsku.' },
};
const L = (pick) => Object.fromEntries(LOCALES.map((locale) => [locale, pick(COPY[locale])]));
const words = (english) => english.replace(/[?.!]/gu, '').split(/\s+/u).filter(Boolean);
const vocabulary = ['this', 'that', 'my', 'your', 'book', 'bag', 'cup', 'key', 'red', 'blue', 'green', 'big', 'small', 'one', 'two', 'ten', 'old', 'kind', 'funny', 'quiet', 'is', 'are', 'am', 'he', 'she', 'they'];
const alternatives = (word) => vocabulary.filter((item) => item !== word.toLowerCase()).slice(0, 5);
const localizedDetails = (english) => (0, episode_01_phrase_localization_41_56_v1_1.buildEpisode01WorldLocalizedDetails)(english, words(english), alternatives);
const phrase = (ordinal, position, english, features) => {
    const localized = localizedDetails(english);
    return { id: `e01-s${String(ordinal).padStart(2, '0')}-${String(position + 1).padStart(2, '0')}`, english, russian: localized.ru.meaning, explanation: localized.ru.explanation, localizedDetails: localized, features, words: words(english).map((correct) => ({ correct, category: /^(am|is|are)$/u.test(correct) ? 'to-be' : 'lexical', distractors: alternatives(correct).map((value) => ({ value, reasonCode: 'wrong_token_for_position', why: (0, episode_01_phrase_localization_41_56_v1_1.episode01WorldDistractorReason)('ru', correct, value) })) })) };
};
const runs = (body, target) => Object.fromEntries(LOCALES.map((locale) => { const text = body[locale]; const index = text.indexOf(target); return [locale, index < 0 ? [{ text, semantic: 'explanation' }] : [{ text: text.slice(0, index), semantic: 'explanation' }, { text: target, semantic: 'targetCorrect' }, { text: text.slice(index + target.length), semantic: 'explanation' }].filter((run) => run.text.length > 0)]; }));
const localizeEnglishChoice = (value) => Object.fromEntries(LOCALES.map((locale) => [locale, value]));
const authoredIntroPage = (page) => {
    const body = page.body;
    return {
        kind: page.kind,
        title: page.title,
        body,
        bodyRuns: runs(body, page.choices[0]),
        question: { prompt: page.prompt, choices: [localizeEnglishChoice(page.choices[0]), localizeEnglishChoice(page.choices[1]), localizeEnglishChoice(page.choices[2])], correctChoiceIndex: 0, explanation: page.explanation },
    };
};
const PHRASES = {
    41: ['This is my book.', 'That is your bag.', 'This is a cup.', 'That is a key.', 'My book is here.', 'Your bag is here.', 'Is this my cup?', 'Is that your key?', 'This is my key.', 'That is your cup.', 'My bag is here.', 'Your book is here.', 'Is this your book?', 'Is that my bag?', 'This is your key.'],
    42: ['This is a red bag.', 'That is a blue cup.', 'My book is green.', 'Your key is red.', 'This cup is blue.', 'That bag is green.', 'Is this a red book?', 'Is that a blue key?', 'My bag is red.', 'Your cup is green.', 'This key is blue.', 'That book is red.', 'Is my cup green?', 'Is your bag blue?', 'This is a green key.'],
    43: ['This is a big bag.', 'That is a small cup.', 'My book is big.', 'Your key is small.', 'This is a big red bag.', 'That is a small blue cup.', 'Is this a big book?', 'Is that a small key?', 'My big bag is here.', 'Your small cup is here.', 'This big key is red.', 'That small book is green.', 'Is my bag big?', 'Is your cup small?', 'This is a small green key.'],
    44: ['One book is here.', 'Two bags are here.', 'Three cups are here.', 'Four keys are here.', 'Five books are here.', 'Six bags are here.', 'Seven cups are here.', 'Eight keys are here.', 'Nine books are here.', 'Ten bags are here.', 'Eleven cups are here.', 'Twelve keys are here.', 'Thirteen books are here.', 'Fourteen bags are here.', 'Twenty cups are here.'],
    45: ['I am ten years old.', 'You are eleven years old.', 'He is twelve years old.', 'She is thirteen years old.', 'I am fourteen years old.', 'You are fifteen years old.', 'He is sixteen years old.', 'She is seventeen years old.', 'I am eighteen years old.', 'You are nineteen years old.', 'He is twenty years old.', 'How old are you?', 'How old is he?', 'How old is she?', 'She is ten years old.'],
    46: ['He is kind.', 'She is funny.', 'He is quiet.', 'She is happy.', 'He is calm.', 'She is ready.', 'Is he kind?', 'Is she funny?', 'He is not busy.', 'She is not tired.', 'Is he quiet?', 'Is she happy?', 'He is fine.', 'She is okay.', 'They are kind.'],
    47: ['This is a red bag.', 'That is a small cup.', 'My book is green.', 'Your key is blue.', 'He is kind.', 'She is funny.', 'He is ten years old.', 'She is eleven years old.', 'This bag is big.', 'That key is small.', 'Is this your book?', 'Is that my cup?', 'How old is he?', 'How old is she?', 'They are quiet.'],
    48: ['This is my red bag.', 'That is your small cup.', 'My green book is here.', 'Your blue key is here.', 'Two bags are here.', 'Three cups are here.', 'He is kind.', 'She is funny.', 'He is ten years old.', 'She is eleven years old.', 'Is this a big bag?', 'Is that a small key?', 'How old are you?', 'How old is he?', 'They are happy.'],
};
const FEATURES = { 41: ['copula_be', 'everyday_object_noun'], 42: ['copula_be', 'colour_adjective'], 43: ['copula_be', 'size_adjective', 'adjective_before_noun'], 44: ['copula_be', 'plural_noun', 'number_1_20'], 45: ['copula_be', 'age_expression', 'question_inversion'], 46: ['copula_be', 'descriptive_adjective'], 47: ['copula_be', 'spoken_production'], 48: ['copula_be'] };
const OUTCOME = { 41: 'obj-e01-everyday-objects', 42: 'obj-e01-colours', 43: 'obj-e01-size-and-order', 44: 'obj-e01-numbers', 45: 'obj-e01-age', 46: 'obj-e01-people-description', 47: 'obj-e01-world-voice', 48: 'obj-e01-world-checkpoint' };
function buildEpisode01Session41To48(ordinal) {
    const authored = episode_01_sessions_41_48_intro_data_v1_1.AUTHORED_INTROS_41_TO_48[ordinal];
    if (!authored)
        throw new Error(`Missing authored intro for episode 1 session ${ordinal}`);
    const introPages = [
        authoredIntroPage(authored.pages[0]),
        authoredIntroPage(authored.pages[1]),
        authoredIntroPage(authored.pages[2]),
    ];
    return { packageId: 'learning-v2-en-v1', targetLanguage: 'en', episodeOrdinal: 1, requiredSessionOrdinal: ordinal, canDoOutcomeId: OUTCOME[ordinal], generationInputFingerprint: `authored-e01-s${ordinal}-v2`, title: authored.title, summary: authored.summary, learningGoal: authored.learningGoal, introPages, phrases: PHRASES[ordinal].map((english, index) => phrase(ordinal, index, english, FEATURES[ordinal])) };
}
function assertEpisode01Sessions41To48Contract(sources) {
    const chapter = sources.filter((source) => source.requiredSessionOrdinal >= 41 && source.requiredSessionOrdinal <= 48);
    expect(chapter.map((source) => source.requiredSessionOrdinal)).toEqual([41, 42, 43, 44, 45, 46, 47, 48]);
    chapter.forEach((source) => { expect(source.phrases).toHaveLength(15); expect(source.introPages.map((page) => page.kind)).toEqual(['concept', 'formula', 'trap']); source.phrases.forEach((item) => { expect(Object.keys(item.localizedDetails ?? {}).sort()).toEqual([...LOCALES].sort()); expect(item.english).not.toMatch(/\b(?:do|does|have|had|will|can|like|want|go|see|there)\b/iu); item.words.forEach((word) => expect(new Set(word.distractors.map((entry) => entry.value)).size).toBe(5)); }); source.introPages.forEach((page) => LOCALES.forEach((locale) => expect(page.bodyRuns?.[locale]?.map((run) => run.text).join('')).toBe(page.body[locale]))); });
    expect(chapter[0].phrases.some((item) => item.features.includes('everyday_object_noun'))).toBe(true);
    expect(chapter[1].phrases.some((item) => item.features.includes('colour_adjective'))).toBe(true);
    expect(chapter[2].phrases.some((item) => item.features.includes('adjective_before_noun'))).toBe(true);
    expect(chapter[3].phrases.some((item) => item.features.includes('number_1_20'))).toBe(true);
    expect(chapter[4].phrases.every((item) => !/\bhave\b/iu.test(item.english))).toBe(true);
    expect(chapter[6].phrases.every((item) => !/\b(?:have|do|does|will|can)\b/iu.test(item.english))).toBe(true);
}
//# sourceMappingURL=episode_01_sessions_41_48_support_v1.js.map