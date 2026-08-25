import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для 15
// фраз сессии 17 на восьми объяснительных локалях (без 'es'). Фабрика d()
// скопирована по прецеденту сессии 14 (es_episode_01_session_14_localized_details_v1.ts)
// — общий список distractors на верхнем уровне phrase.localizedDetails[locale]
// собирается из всех позиций слов, как того требует errorExplanationByLocale.
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;
type Details = EpisodeSourcePhraseLocalizedDetails;
type Trap = Details['distractors'][number]['trapType'];
type Reasoned = { value: string; trapType: Trap; reason: Record<LocaleWithoutEs, string> };
type WordSpec = { correct: string; prompt: Record<LocaleWithoutEs, string>; d1: Reasoned; d2: Reasoned };

function d(
  meaning: Record<LocaleWithoutEs, string>,
  explanation: Record<LocaleWithoutEs, string>,
  words: readonly WordSpec[],
): Readonly<Record<LocaleWithoutEs, Details>> {
  const locales: readonly LocaleWithoutEs[] = ['ru', 'uk', 'en', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
  const out = {} as Record<LocaleWithoutEs, Details>;
  for (const l of locales) {
    out[l] = {
      meaning: meaning[l],
      explanation: explanation[l],
      distractors: words.flatMap((w) => [
        { value: w.d1.value, reason: w.d1.reason[l], trapType: w.d1.trapType },
        { value: w.d2.value, reason: w.d2.reason[l], trapType: w.d2.trapType },
      ]),
      words: words.map((w) => ({
        correct: w.correct,
        prompt: w.prompt[l],
        distractors: [
          { value: w.d1.value, reason: w.d1.reason[l], trapType: w.d1.trapType },
          { value: w.d2.value, reason: w.d2.reason[l], trapType: w.d2.trapType },
        ],
      })),
    };
  }
  return Object.freeze(out);
}

const T = {
  esQ: { ru: 'Какая связка нужна для оценки предмета или ситуации?', uk: 'Яка зв’язка потрібна для оцінки предмета чи ситуації?', en: 'Which linking word fits evaluating a thing or situation?', 'pt-BR': 'Qual ligação cabe à avaliação de uma coisa ou situação?', vi: 'Từ nối nào phù hợp khi đánh giá một vật hay tình huống?', id: 'Kata penghubung mana yang cocok untuk menilai benda atau situasi?', tr: 'Bir şeyi ya da durumu değerlendirmek için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do oceny rzeczy lub sytuacji?' },
  noQ: { ru: 'Каким словом начать возражение?', uk: 'Яким словом почати заперечення?', en: 'Which word starts the pushback?', 'pt-BR': 'Qual palavra inicia a contestação?', vi: 'Từ nào bắt đầu lời phản đối?', id: 'Kata mana yang memulai sanggahan?', tr: 'Karşı çıkış hangi kelimeyle başlar?', pl: 'Jakim słowem zacząć sprzeciw?' },
  esLowerQ: { ru: 'Какая связка нужна после No?', uk: 'Яка зв’язка потрібна після No?', en: 'Which linking word is needed after No?', 'pt-BR': 'Qual ligação é necessária depois de No?', vi: 'Từ nối nào cần sau No?', id: 'Kata penghubung mana yang diperlukan setelah No?', tr: 'No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No?' },
} as const;

function qualityQ(word: string): Record<LocaleWithoutEs, string> {
  return {
    ru: `Какой признак нужен: «${word}»?`,
    uk: `Яка ознака потрібна: «${word}»?`,
    en: `Which quality is needed: "${word}"?`,
    'pt-BR': `Qual qualidade é necessária: "${word}"?`,
    vi: `Đặc điểm nào cần: "${word}"?`,
    id: `Sifat mana yang diperlukan: "${word}"?`,
    tr: `Hangi nitelik gerekir: "${word}"?`,
    pl: `Jaka cecha jest potrzebna: „${word}”?`,
  };
}

function genderQ(masc: boolean): Record<LocaleWithoutEs, string> {
  return masc
    ? { ru: 'Какой признак нужен для предмета мужского рода или по умолчанию?', uk: 'Яка ознака потрібна для предмета чоловічого роду чи за замовчуванням?', en: 'Which quality is needed for a masculine or default noun?', 'pt-BR': 'Qual qualidade é necessária para um substantivo masculino ou padrão?', vi: 'Đặc điểm nào cần cho danh từ giống đực hoặc mặc định?', id: 'Sifat mana yang diperlukan untuk kata benda maskulin atau default?', tr: 'Eril ya da varsayılan bir isim için hangi nitelik gerekir?', pl: 'Jaka cecha jest potrzebna dla rzeczownika męskiego lub domyślnego?' }
    : { ru: 'Какой признак нужен для предмета женского рода?', uk: 'Яка ознака потрібна для предмета жіночого роду?', en: 'Which quality is needed for a feminine noun?', 'pt-BR': 'Qual qualidade é necessária para um substantivo feminino?', vi: 'Đặc điểm nào cần cho danh từ giống cái?', id: 'Sifat mana yang diperlukan untuk kata benda feminin?', tr: 'Dişil bir isim için hangi nitelik gerekir?', pl: 'Jaka cecha jest potrzebna dla rzeczownika żeńskiego?' };
}

function esVsEresOrSoy(target: 'Es' | 'es'): { eres: Reasoned; soy: Reasoned } {
  const eresWord = target === 'Es' ? 'Eres' : 'eres';
  const soyWord = target === 'Es' ? 'Soy' : 'soy';
  return {
    eres: { value: eresWord, trapType: 'grammar', reason: {
      ru: `${eresWord} — обращение к собеседнику напрямую. Оценка предмета или ситуации — только ${target}.`,
      uk: `${eresWord} — звернення до співрозмовника напряму. Оцінка предмета чи ситуації — тільки ${target}.`,
      en: `${eresWord} addresses the listener directly. Evaluating a thing or situation needs only ${target}.`,
      'pt-BR': `${eresWord} fala com o interlocutor diretamente. Avaliar uma coisa ou situação precisa só de ${target}.`,
      vi: `${eresWord} nói trực tiếp với người nghe. Đánh giá một vật hay tình huống chỉ cần ${target}.`,
      id: `${eresWord} berbicara langsung dengan pendengar. Menilai benda atau situasi hanya perlu ${target}.`,
      tr: `${eresWord} doğrudan dinleyiciyle konuşur. Bir şeyi ya da durumu değerlendirmek yalnızca ${target} gerektirir.`,
      pl: `${eresWord} zwraca się bezpośrednio do słuchacza. Ocena rzeczy lub sytuacji wymaga tylko ${target}.`,
    }},
    soy: { value: soyWord, trapType: 'grammar', reason: {
      ru: `${soyWord} — про себя. Оценка предмета или ситуации — только ${target}.`,
      uk: `${soyWord} — про себе. Оцінка предмета чи ситуації — тільки ${target}.`,
      en: `${soyWord} is about the speaker. Evaluating a thing or situation needs only ${target}.`,
      'pt-BR': `${soyWord} é sobre quem fala. Avaliar uma coisa ou situação precisa só de ${target}.`,
      vi: `${soyWord} nói về người nói. Đánh giá một vật hay tình huống chỉ cần ${target}.`,
      id: `${soyWord} tentang penutur. Menilai benda atau situasi hanya perlu ${target}.`,
      tr: `${soyWord} konuşan hakkındadır. Bir şeyi ya da durumu değerlendirmek yalnızca ${target} gerektirir.`,
      pl: `${soyWord} dotyczy mówiącego. Ocena rzeczy lub sytuacji wymaga tylko ${target}.`,
    }},
  };
}

const M = {
  facil: { ru: '«легко»', uk: '«легко»', en: '"easy"', 'pt-BR': '"fácil"', vi: '"dễ"', id: '"mudah"', tr: '"kolay"', pl: '„łatwo”' },
  dificil: { ru: '«трудно» (противоположный признак)', uk: '«важко» (протилежна ознака)', en: '"hard" (the opposite quality)', 'pt-BR': '"difícil" (a qualidade oposta)', vi: '"khó" (đặc điểm ngược lại)', id: '"sulit" (sifat sebaliknya)', tr: '"zor" (karşıt nitelik)', pl: '„trudno” (przeciwna cecha)' },
  importante: { ru: '«важно»', uk: '«важливо»', en: '"important"', 'pt-BR': '"importante"', vi: '"quan trọng"', id: '"penting"', tr: '"önemli"', pl: '„ważne”' },
  verdad: { ru: '«правда» (подтверждение факта)', uk: '«правда» (підтвердження факту)', en: '"truth" (confirming a fact)', 'pt-BR': '"verdade" (confirmando um fato)', vi: '"sự thật" (xác nhận sự thật)', id: '"kebenaran" (mengonfirmasi fakta)', tr: '"gerçek" (bir gerçeği onaylamak)', pl: '„prawda” (potwierdzenie faktu)' },
  igual: { ru: '«всё равно» (безразличие)', uk: '«байдуже» (байдужість)', en: '"indifferent" (does not change things)', 'pt-BR': '"tanto faz" (indiferença)', vi: '"thờ ơ" (không thay đổi gì)', id: '"tidak peduli" (ketidakpedulian)', tr: '"fark etmez" (kayıtsızlık)', pl: '„wszystko jedno” (obojętność)' },
  asi: { ru: '«так» (образ действия)', uk: '«так» (спосіб дії)', en: '"like this" (manner)', 'pt-BR': '"assim" (modo)', vi: '"như vậy" (cách thức)', id: '"begini" (cara)', tr: '"böyle" (tarz)', pl: '„tak” (sposób)' },
  caro: { ru: '«дорого» (про цену)', uk: '«дорого» (про ціну)', en: '"expensive" (about price)', 'pt-BR': '"caro" (sobre preço)', vi: '"đắt" (về giá)', id: '"mahal" (tentang harga)', tr: '"pahalı" (fiyat hakkında)', pl: '„drogo” (o cenie)' },
  bonito: { ru: '«красивый» (другой признак)', uk: '«красивий» (інша ознака)', en: '"pretty" (a different quality)', 'pt-BR': '"bonito" (uma qualidade diferente)', vi: '"đẹp" (đặc điểm khác)', id: '"cantik" (sifat berbeda)', tr: '"güzel" (farklı bir nitelik)', pl: '„ładny” (inna cecha)' },
  unico: { ru: '«единственный» (другой признак)', uk: '«єдиний» (інша ознака)', en: '"unique" (a different quality)', 'pt-BR': '"único" (uma qualidade diferente)', vi: '"duy nhất" (đặc điểm khác)', id: '"unik" (sifat berbeda)', tr: '"eşsiz" (farklı bir nitelik)', pl: '„jedyny” (inna cecha)' },
  verdadero: { ru: '«истинный» (другой признак)', uk: '«істинний» (інша ознака)', en: '"true" (a different quality)', 'pt-BR': '"verdadeiro" (uma qualidade diferente)', vi: '"đúng" (đặc điểm khác)', id: '"benar" (sifat berbeda)', tr: '"doğru" (farklı bir nitelik)', pl: '„prawdziwy” (inna cecha)' },
  cara: { ru: '«дорогая» (другой признак)', uk: '«дорога» (інша ознака)', en: '"expensive, feminine" (a different quality)', 'pt-BR': '"cara" (uma qualidade diferente)', vi: '"đắt, giống cái" (đặc điểm khác)', id: '"mahal, feminin" (sifat berbeda)', tr: '"pahalı, dişil" (farklı bir nitelik)', pl: '„droga” (inna cecha)' },
  facilAdv: { ru: '«легко» как наречие', uk: '«легко» як прислівник', en: '"easily" as an adverb', 'pt-BR': '"facilmente" como advérbio', vi: '"dễ dàng" như trạng từ', id: '"dengan mudah" sebagai kata keterangan', tr: '"kolayca" bir zarf olarak', pl: '„łatwo” jako przysłówek' },
} as const;

function wrongWord(target: string, wrong: string, wrongMeaning: Record<LocaleWithoutEs, string>): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} означает ${wrongMeaning.ru} — другой смысл, не то, что нужно здесь. Нужно ${target}.`,
    uk: `${wrong} означає ${wrongMeaning.uk} — інший сенс, не те, що потрібно тут. Потрібно ${target}.`,
    en: `${wrong} means ${wrongMeaning.en} — a different meaning, not what is needed here. You need ${target}.`,
    'pt-BR': `${wrong} significa ${wrongMeaning['pt-BR']} — um sentido diferente, não o que é preciso aqui. Precisa de ${target}.`,
    vi: `${wrong} nghĩa là ${wrongMeaning.vi} — một nghĩa khác, không phải điều cần ở đây. Cần ${target}.`,
    id: `${wrong} berarti ${wrongMeaning.id} — makna yang berbeda, bukan yang diperlukan di sini. Perlu ${target}.`,
    tr: `${wrong}, ${wrongMeaning.tr} demektir — farklı bir anlam, burada gereken bu değil. ${target} gerekir.`,
    pl: `${wrong} znaczy ${wrongMeaning.pl} — inne znaczenie, nie to, czego tu trzeba. Potrzebne jest ${target}.`,
  }};
}

function genderMismatch(correct: string, wrong: string, correctIsMasc: boolean): Reasoned {
  const wrongEnding = correctIsMasc ? '-a' : '-o';
  const correctEnding = correctIsMasc ? '-o' : '-a';
  const defaultNote = correctIsMasc
    ? { ru: ' Для предмета мужского рода или по умолчанию', uk: ' Для предмета чоловічого роду чи за замовчуванням', en: ' A masculine or default noun', 'pt-BR': ' Um substantivo masculino ou padrão', vi: ' Danh từ giống đực hoặc mặc định', id: ' Kata benda maskulin atau default', tr: ' Eril ya da varsayılan bir isim', pl: ' Rzeczownik męski lub domyślny' }
    : { ru: ' Для предмета женского рода', uk: ' Для предмета жіночого роду', en: ' A feminine noun', 'pt-BR': ' Um substantivo feminino', vi: ' Danh từ giống cái', id: ' Kata benda feminin', tr: ' Dişil bir isim', pl: ' Rzeczownik żeński' };
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма на ${wrongEnding}.${defaultNote.ru} требует форму на ${correctEnding}: ${correct}.`,
    uk: `${wrong} — форма на ${wrongEnding}.${defaultNote.uk} потребує форму на ${correctEnding}: ${correct}.`,
    en: `${wrong} ends in ${wrongEnding}.${defaultNote.en} needs the ${correctEnding} form: ${correct}.`,
    'pt-BR': `${wrong} termina em ${wrongEnding}.${defaultNote['pt-BR']} precisa da forma em ${correctEnding}: ${correct}.`,
    vi: `${wrong} kết thúc bằng ${wrongEnding}.${defaultNote.vi} cần dạng ${correctEnding}: ${correct}.`,
    id: `${wrong} berakhiran ${wrongEnding}.${defaultNote.id} memerlukan bentuk ${correctEnding}: ${correct}.`,
    tr: `${wrong}, ${wrongEnding} ile biter.${defaultNote.tr} ${correctEnding} biçimini gerektirir: ${correct}.`,
    pl: `${wrong} kończy się na ${wrongEnding}.${defaultNote.pl} wymaga formy na ${correctEnding}: ${correct}.`,
  }};
}

const esWord = (prompt: Record<LocaleWithoutEs, string> = T.esQ): WordSpec => {
  const { eres, soy } = esVsEresOrSoy('Es');
  return { correct: 'Es', prompt, d1: eres, d2: soy };
};
const esLowerWord = (prompt: Record<LocaleWithoutEs, string> = T.esLowerQ): WordSpec => {
  const { eres, soy } = esVsEresOrSoy('es');
  return { correct: 'es', prompt, d1: eres, d2: soy };
};
const noWord: WordSpec = {
  correct: 'No',
  prompt: T.noQ,
  d1: { value: 'Es', trapType: 'grammar', reason: {
    ru: 'No должно стоять первым, перед связкой. Начинать с Es значит потерять отрицание.',
    uk: 'No має стояти першим, перед зв’язкою. Починати з Es означає втратити заперечення.',
    en: 'No must come first, before the linking word. Starting with Es loses the negation.',
    'pt-BR': 'No deve vir primeiro, antes da ligação. Começar com Es perde a negação.',
    vi: 'No phải đứng đầu tiên, trước từ nối. Bắt đầu bằng Es sẽ mất phủ định.',
    id: 'No harus di depan, sebelum kata penghubung. Memulai dengan Es kehilangan negasi.',
    tr: 'No, bağlaçtan önce ilk sırada olmalıdır. Es ile başlamak olumsuzlamayı kaybettirir.',
    pl: 'No musi stać pierwsze, przed łącznikiem. Zaczynanie od Es traci przeczenie.',
  }},
  d2: { value: 'Eres', trapType: 'grammar', reason: {
    ru: 'Eres — это связка, а не отрицание. Возражение начинается с No.',
    uk: 'Eres — це зв’язка, а не заперечення. Заперечення починається з No.',
    en: 'Eres is a linking word, not a negation. The pushback starts with No.',
    'pt-BR': 'Eres é uma ligação, não uma negação. A contestação começa com No.',
    vi: 'Eres là từ nối, không phải phủ định. Lời phản đối bắt đầu bằng No.',
    id: 'Eres adalah kata penghubung, bukan negasi. Sanggahan dimulai dengan No.',
    tr: 'Eres bir bağlaçtır, olumsuzlama değildir. Karşı çıkış No ile başlar.',
    pl: 'Eres to łącznik, nie przeczenie. Sprzeciw zaczyna się od No.',
  }},
};

export const ES_SESSION_17_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s17-es-facil': d(
    { ru: 'Это легко', uk: 'Це легко', en: 'It is easy', 'pt-BR': 'É fácil', vi: 'Nó dễ', id: 'Ini mudah', tr: 'Bu kolay', pl: 'To jest łatwe' },
    { ru: 'Так оценивают задачу, язык или решение — не человека. Окончание -s в es называет не «ты» и не «я», а безличное «это»: предмет или ситуацию, о которой идёт речь.', uk: 'Так оцінюють завдання, мову чи рішення — не людину. Закінчення -s в es називає не «ти» і не «я», а безособове «це»: предмет чи ситуацію, про яку йдеться.', en: 'This is how you evaluate a task, a language, or a decision — not a person. The ending -s in es does not name "you" or "I", but an impersonal "it": a thing or situation being discussed.', 'pt-BR': 'É assim que se avalia uma tarefa, um idioma ou uma decisão — não uma pessoa. A terminação -s em es não nomeia "tú" nem "yo", mas um "isso" impessoal: uma coisa ou situação em questão.', vi: 'Đây là cách đánh giá một nhiệm vụ, ngôn ngữ hay quyết định — không phải con người. Đuôi -s trong es không gọi tên "tú" hay "yo", mà là "nó" phi nhân xưng: một vật hay tình huống đang được nói tới.', id: 'Beginilah cara menilai tugas, bahasa, atau keputusan — bukan orang. Akhiran -s dalam es tidak menyebut "tú" atau "yo", melainkan "itu" impersonal: benda atau situasi yang sedang dibicarakan.', tr: 'Bir görevi, dili ya da kararı böyle değerlendirirsiniz — bir kişiyi değil. Es’teki -s son eki "tú" ya da "yo"yu değil, kişisiz bir "o"yu adlandırır: söz konusu olan şey ya da durum.', pl: 'Tak ocenia się zadanie, język lub decyzję — nie osobę. Końcówka -s w es nie nazywa „tú” ani „yo”, lecz bezosobowe „to”: rzecz lub sytuację, o której mowa.' },
    [esWord(), { correct: 'fácil', prompt: qualityQ('fácil'), d1: wrongWord('fácil', 'difícil', M.dificil), d2: wrongWord('fácil', 'importante', M.importante) }],
  ),
  'es-e01-s17-es-verdad': d(
    { ru: 'Это правда', uk: 'Це правда', en: 'It is true', 'pt-BR': 'É verdade', vi: 'Đó là sự thật', id: 'Itu benar', tr: 'Bu doğru', pl: 'To prawda' },
    { ru: 'Так подтверждают факт или чужие слова — про ситуацию, а не про говорящего. Es здесь нельзя заменить на Soy или Eres: подлежащего-человека в этой фразе просто нет.', uk: 'Так підтверджують факт чи чужі слова — про ситуацію, а не про мовця. Es тут не можна замінити на Soy чи Eres: підмета-людини в цій фразі просто немає.', en: 'This is how you confirm a fact or someone else\'s words — about a situation, not the speaker. Es here cannot be replaced with Soy or Eres: there is simply no human subject in this phrase.', 'pt-BR': 'É assim que se confirma um fato ou as palavras de outra pessoa — sobre uma situação, não sobre quem fala. Es aqui não pode ser trocado por Soy ou Eres: simplesmente não há sujeito humano nessa frase.', vi: 'Đây là cách xác nhận một sự thật hay lời của người khác — về một tình huống, không phải người nói. Es ở đây không thể thay bằng Soy hay Eres: câu này đơn giản không có chủ ngữ là người.', id: 'Beginilah cara mengonfirmasi fakta atau perkataan orang lain — tentang situasi, bukan penutur. Es di sini tidak bisa diganti dengan Soy atau Eres: frasa ini sama sekali tidak memiliki subjek manusia.', tr: 'Bir gerçeği ya da başkasının sözlerini böyle doğrularsınız — konuşan hakkında değil, bir durum hakkında. Buradaki Es, Soy ya da Eres ile değiştirilemez: bu ifadede insan özne yoktur.', pl: 'Tak potwierdza się fakt lub czyjeś słowa — o sytuacji, nie o mówiącym. Es nie można tu zastąpić przez Soy ani Eres: w tej frazie po prostu nie ma ludzkiego podmiotu.' },
    [esWord(), { correct: 'verdad', prompt: qualityQ('verdad'), d1: wrongWord('verdad', 'igual', M.igual), d2: wrongWord('verdad', 'así', M.asi) }],
  ),
  'es-e01-s17-es-asi': d(
    { ru: 'Это так', uk: 'Це так', en: 'It is like this', 'pt-BR': 'É assim', vi: 'Nó là như vậy', id: 'Begitulah', tr: 'Bu böyle', pl: 'Tak właśnie jest' },
    { ru: 'Так подтверждают: дело обстоит именно таким образом. Заголовок этой темы взят отсюда — Es así описывает ситуацию целиком, а не одного человека.', uk: 'Так підтверджують: справа саме така. Заголовок цієї теми взято звідси — Es así описує ситуацію цілком, а не одну людину.', en: 'This is how you confirm that things stand exactly this way. The title of this topic comes from here — Es así describes an entire situation, not one person.', 'pt-BR': 'É assim que se confirma: as coisas são exatamente assim. O título deste tema vem daqui — Es así descreve uma situação inteira, não uma pessoa.', vi: 'Đây là cách xác nhận: sự việc đúng là như vậy. Tiêu đề của chủ đề này lấy từ đây — Es así mô tả toàn bộ tình huống, không phải một người.', id: 'Beginilah cara mengonfirmasi: keadaan memang persis begini. Judul topik ini berasal dari sini — Es así menggambarkan seluruh situasi, bukan satu orang.', tr: 'İşlerin tam olarak böyle olduğunu böyle doğrularsınız. Bu konunun başlığı buradan geliyor — Es así, bir kişiyi değil, tüm bir durumu tanımlar.', pl: 'Tak potwierdza się, że sprawy mają się dokładnie tak. Tytuł tego tematu stąd pochodzi — Es así opisuje całą sytuację, nie jedną osobę.' },
    [esWord(), { correct: 'así', prompt: qualityQ('así'), d1: wrongWord('así', 'verdad', M.verdad), d2: wrongWord('así', 'igual', M.igual) }],
  ),
  'es-e01-s17-es-igual': d(
    { ru: 'Всё равно', uk: 'Байдуже', en: 'It does not matter', 'pt-BR': 'Tanto faz', vi: 'Cũng vậy thôi', id: 'Sama saja', tr: 'Fark etmez', pl: 'Wszystko jedno' },
    { ru: 'Так реагируют на новость, которая не меняет дела, — о ситуации, не о человеке. Форма связки третьего лица не меняется, даже если подлежащее не названо ни одним словом.', uk: 'Так реагують на новину, яка не змінює справи, — про ситуацію, не про людину. Форма зв’язки третьої особи не змінюється, навіть якщо підмет не названо жодним словом.', en: 'This is how you react to news that does not change anything — about a situation, not a person. The third-person form of the linking word does not change, even though the subject is never named by any word.', 'pt-BR': 'É assim que se reage a uma notícia que não muda nada — sobre uma situação, não sobre uma pessoa. A forma de terceira pessoa da ligação não muda, mesmo que o sujeito nunca seja nomeado por nenhuma palavra.', vi: 'Đây là cách phản ứng với tin tức không làm thay đổi gì — về một tình huống, không phải con người. Dạng ngôi thứ ba của từ nối không đổi, dù chủ ngữ không bao giờ được gọi tên bằng bất kỳ từ nào.', id: 'Beginilah cara bereaksi terhadap kabar yang tidak mengubah apa pun — tentang situasi, bukan orang. Bentuk orang ketiga dari kata penghubung tidak berubah, meskipun subjeknya tidak pernah disebut dengan kata apa pun.', tr: 'Hiçbir şeyi değiştirmeyen bir habere böyle tepki verirsiniz — bir kişi hakkında değil, bir durum hakkında. Bağlacın üçüncü kişi biçimi değişmez, özne hiçbir kelimeyle adlandırılmasa bile.', pl: 'Tak reaguje się na wiadomość, która niczego nie zmienia — o sytuacji, nie o osobie. Forma trzeciej osoby łącznika się nie zmienia, nawet jeśli podmiot nigdy nie jest nazwany żadnym słowem.' },
    [esWord(), { correct: 'igual', prompt: qualityQ('igual'), d1: wrongWord('igual', 'fácil', M.facil), d2: wrongWord('igual', 'verdad', M.verdad) }],
  ),
  'es-e01-s17-es-importante': d(
    { ru: 'Это важно', uk: 'Це важливо', en: 'It is important', 'pt-BR': 'É importante', vi: 'Nó quan trọng', id: 'Ini penting', tr: 'Bu önemli', pl: 'To ważne' },
    { ru: 'Так подчёркивают значимость темы, дела или решения — снова про ситуацию. Es не согласуется ни с «ты», ни с «я»: у безличного подлежащего просто нет своего слова.', uk: 'Так підкреслюють значущість теми, справи чи рішення — знову про ситуацію. Es не узгоджується ні з «ти», ні з «я»: у безособового підмета просто немає свого слова.', en: 'This is how you stress the significance of a topic, matter, or decision — again about a situation. Es agrees with neither "you" nor "I": the impersonal subject simply has no word of its own.', 'pt-BR': 'É assim que se destaca a importância de um tema, assunto ou decisão — de novo sobre uma situação. Es não concorda nem com "tú" nem com "yo": o sujeito impessoal simplesmente não tem palavra própria.', vi: 'Đây là cách nhấn mạnh tầm quan trọng của một chủ đề, việc, hay quyết định — lại là về tình huống. Es không hòa hợp với "tú" hay "yo": chủ ngữ phi nhân xưng đơn giản không có từ riêng.', id: 'Beginilah cara menekankan pentingnya suatu topik, hal, atau keputusan — sekali lagi tentang situasi. Es tidak sesuai dengan "tú" maupun "yo": subjek impersonal itu sama sekali tidak memiliki katanya sendiri.', tr: 'Bir konunun, meselenin ya da kararın önemini böyle vurgularsınız — yine bir durum hakkında. Es ne "tú" ne de "yo" ile uyuşur: kişisiz öznenin kendine ait bir kelimesi yoktur.', pl: 'Tak podkreśla się znaczenie tematu, sprawy lub decyzji — znów o sytuacji. Es nie zgadza się ani z „tú”, ani z „yo”: bezosobowy podmiot po prostu nie ma własnego słowa.' },
    [esWord(), { correct: 'importante', prompt: qualityQ('importante'), d1: wrongWord('importante', 'difícil', M.dificil), d2: wrongWord('importante', 'caro', M.caro) }],
  ),
  'es-e01-s17-es-caro': d(
    { ru: 'Это дорого', uk: 'Це дорого', en: 'It is expensive', 'pt-BR': 'É caro', vi: 'Nó đắt', id: 'Ini mahal', tr: 'Bu pahalı', pl: 'To drogie' },
    { ru: 'Так оценивают цену вещи или услуги — о предмете, а не о человеке. Признак согласуется с родом самого предмета (по умолчанию — форма на -o), а не с тем, кто говорит.', uk: 'Так оцінюють ціну речі чи послуги — про предмет, а не про людину. Ознака узгоджується з родом самого предмета (за замовчуванням — форма на -o), а не з тим, хто говорить.', en: 'This is how you evaluate the price of a thing or a service — about the object, not a person. The quality agrees with the gender of the object itself (by default, the -o form), not with the speaker.', 'pt-BR': 'É assim que se avalia o preço de uma coisa ou serviço — sobre o objeto, não sobre uma pessoa. A qualidade concorda com o gênero do próprio objeto (por padrão, a forma em -o), não com quem fala.', vi: 'Đây là cách đánh giá giá của một vật hay dịch vụ — về vật đó, không phải con người. Đặc điểm hòa hợp với giống của chính vật đó (mặc định là dạng -o), không phải với người nói.', id: 'Beginilah cara menilai harga suatu benda atau layanan — tentang objek, bukan orang. Sifatnya sesuai dengan gender objek itu sendiri (secara default, bentuk -o), bukan dengan penutur.', tr: 'Bir şeyin ya da hizmetin fiyatını böyle değerlendirirsiniz — bir kişi hakkında değil, nesne hakkında. Nitelik, konuşanla değil, nesnenin kendi cinsiyetiyle (varsayılan olarak -o biçimi) uyumludur.', pl: 'Tak ocenia się cenę rzeczy lub usługi — o przedmiocie, nie o osobie. Cecha zgadza się z rodzajem samego przedmiotu (domyślnie forma na -o), a nie z tym, kto mówi.' },
    [esWord(), { correct: 'caro', prompt: genderQ(true), d1: genderMismatch('caro', 'cara', true), d2: wrongWord('caro', 'fácil', M.facil) }],
  ),
  'es-e01-s17-es-bonito': d(
    { ru: 'Это красиво', uk: 'Це красиво', en: 'It is pretty', 'pt-BR': 'É bonito', vi: 'Nó đẹp', id: 'Ini cantik', tr: 'Bu güzel', pl: 'To ładne' },
    { ru: 'Так хвалят вещь, вид или подарок — предмет мужского рода или предмет без явного рода по умолчанию. Признак согласуется с предметом (-o), а связка остаётся es в любом случае.', uk: 'Так хвалять річ, краєвид чи подарунок — предмет чоловічого роду або предмет без явного роду за замовчуванням. Ознака узгоджується з предметом (-o), а зв’язка лишається es в будь-якому разі.', en: 'This is how you praise a thing, a view, or a gift — a masculine noun or a noun with no explicit gender by default. The quality agrees with the object (-o), while the linking word stays es either way.', 'pt-BR': 'É assim que se elogia uma coisa, uma vista ou um presente — um substantivo masculino ou sem gênero explícito por padrão. A qualidade concorda com o objeto (-o), enquanto a ligação continua es de qualquer forma.', vi: 'Đây là cách khen một vật, cảnh, hay món quà — danh từ giống đực hoặc không rõ giống theo mặc định. Đặc điểm hòa hợp với vật đó (-o), còn từ nối vẫn là es trong mọi trường hợp.', id: 'Beginilah cara memuji suatu benda, pemandangan, atau hadiah — kata benda maskulin atau tanpa gender eksplisit secara default. Sifatnya sesuai dengan objek (-o), sementara kata penghubung tetap es dalam kedua kasus.', tr: 'Bir şeyi, manzarayı ya da hediyeyi böyle översiniz — eril bir isim ya da varsayılan olarak açık cinsiyeti olmayan bir isim. Nitelik nesneyle uyumludur (-o), bağlaç ise her durumda es olarak kalır.', pl: 'Tak chwali się rzecz, widok lub prezent — rzeczownik męski lub bez wyraźnego rodzaju domyślnie. Cecha zgadza się z przedmiotem (-o), a łącznik pozostaje es w każdym przypadku.' },
    [esWord(), { correct: 'bonito', prompt: genderQ(true), d1: genderMismatch('bonito', 'bonita', true), d2: wrongWord('bonito', 'único', M.unico) }],
  ),
  'es-e01-s17-es-bonita': d(
    { ru: 'Она красивая', uk: 'Вона красива', en: 'It is pretty (feminine)', 'pt-BR': 'É bonita', vi: 'Nó đẹp (giống cái)', id: 'Ini cantik (feminin)', tr: 'Bu güzel (dişil)', pl: 'Jest ładna' },
    { ru: 'Та же похвала, но про вещь или ситуацию женского рода — например, casa (дом) или foto (фото). Связка es не меняется вовсе, меняется только концовка признака: -o становится -a.', uk: 'Та сама похвала, але про річ чи ситуацію жіночого роду — наприклад, casa (дім) чи foto (фото). Зв’язка es не змінюється зовсім, змінюється лише закінчення ознаки: -o стає -a.', en: 'The same praise, but about a feminine thing or situation — for example casa (house) or foto (photo). The linking word es does not change at all, only the ending of the quality changes: -o becomes -a.', 'pt-BR': 'O mesmo elogio, mas sobre uma coisa ou situação feminina — por exemplo casa ou foto. A ligação es não muda em nada, só a terminação da qualidade muda: -o vira -a.', vi: 'Cùng một lời khen, nhưng về một vật hay tình huống giống cái — ví dụ casa (nhà) hay foto (ảnh). Từ nối es không đổi chút nào, chỉ đuôi của đặc điểm thay đổi: -o thành -a.', id: 'Pujian yang sama, tetapi tentang benda atau situasi feminin — misalnya casa (rumah) atau foto (foto). Kata penghubung es sama sekali tidak berubah, hanya akhiran sifatnya yang berubah: -o menjadi -a.', tr: 'Aynı övgü, ama dişil bir şey ya da durum hakkında — örneğin casa (ev) ya da foto (fotoğraf). Es bağlacı hiç değişmez, yalnızca niteliğin sonu değişir: -o, -a olur.', pl: 'Ta sama pochwała, ale o rzeczy lub sytuacji rodzaju żeńskiego — na przykład casa (dom) czy foto (zdjęcie). Łącznik es wcale się nie zmienia, zmienia się tylko końcówka cechy: -o staje się -a.' },
    [esWord(), { correct: 'bonita', prompt: genderQ(false), d1: genderMismatch('bonita', 'bonito', false), d2: wrongWord('bonita', 'única', M.unico) }],
  ),
  'es-e01-s17-es-rapido': d(
    { ru: 'Это быстро', uk: 'Це швидко', en: 'It is fast', 'pt-BR': 'É rápido', vi: 'Nó nhanh', id: 'Ini cepat', tr: 'Bu hızlı', pl: 'To szybkie' },
    { ru: 'Так говорят о темпе процесса, транспорта или интернета — не о человеке. Es остаётся неизменным для любой ситуации, только признак подстраивается под род того, о чём речь.', uk: 'Так кажуть про темп процесу, транспорту чи інтернету — не про людину. Es лишається незмінним для будь-якої ситуації, тільки ознака підлаштовується під рід того, про що йдеться.', en: 'This is how you talk about the pace of a process, transport, or internet — not a person. Es stays unchanged for any situation; only the quality adapts to the gender of what is being discussed.', 'pt-BR': 'É assim que se fala do ritmo de um processo, transporte ou internet — não de uma pessoa. Es permanece inalterado para qualquer situação; só a qualidade se ajusta ao gênero do que está em questão.', vi: 'Đây là cách nói về tốc độ của một quá trình, phương tiện, hay internet — không phải con người. Es không đổi cho mọi tình huống; chỉ đặc điểm điều chỉnh theo giống của điều đang được nói tới.', id: 'Beginilah cara membicarakan kecepatan suatu proses, transportasi, atau internet — bukan orang. Es tetap tidak berubah untuk situasi apa pun; hanya sifatnya yang menyesuaikan dengan gender dari apa yang dibicarakan.', tr: 'Bir sürecin, ulaşımın ya da internetin hızından böyle bahsedersiniz — bir kişiden değil. Es her durumda değişmeden kalır; yalnızca nitelik, söz konusu olanın cinsiyetine uyum sağlar.', pl: 'Tak mówi się o tempie procesu, transportu czy internetu — nie o osobie. Es pozostaje niezmienne w każdej sytuacji; zmienia się tylko cecha, dopasowując się do rodzaju tego, o czym mowa.' },
    [esWord(), { correct: 'rápido', prompt: genderQ(true), d1: genderMismatch('rápido', 'rápida', true), d2: wrongWord('rápido', 'verdadero', M.verdadero) }],
  ),
  'es-e01-s17-es-rapida': d(
    { ru: 'Она быстрая', uk: 'Вона швидка', en: 'It is fast (feminine)', 'pt-BR': 'É rápida', vi: 'Nó nhanh (giống cái)', id: 'Ini cepat (feminin)', tr: 'Bu hızlı (dişil)', pl: 'Jest szybka' },
    { ru: 'Та же оценка темпа, но про ситуацию или вещь женского рода — например, conexión (соединение). Признак меняет концовку на -a, связка es остаётся точно такой же.', uk: 'Та сама оцінка темпу, але про ситуацію чи річ жіночого роду — наприклад, conexión (з’єднання). Ознака змінює закінчення на -a, зв’язка es лишається точно такою самою.', en: 'The same pace evaluation, but about a feminine situation or thing — for example conexión (connection). The quality changes its ending to -a, while the linking word es stays exactly the same.', 'pt-BR': 'A mesma avaliação de ritmo, mas sobre uma situação ou coisa feminina — por exemplo conexión (conexão). A qualidade muda a terminação para -a, enquanto a ligação es permanece exatamente a mesma.', vi: 'Cùng một đánh giá về tốc độ, nhưng về một tình huống hay vật giống cái — ví dụ conexión (kết nối). Đặc điểm đổi đuôi thành -a, còn từ nối es vẫn giữ nguyên.', id: 'Penilaian kecepatan yang sama, tetapi tentang situasi atau benda feminin — misalnya conexión (koneksi). Sifatnya mengubah akhirannya menjadi -a, sementara kata penghubung es tetap persis sama.', tr: 'Aynı tempo değerlendirmesi, ama dişil bir durum ya da şey hakkında — örneğin conexión (bağlantı). Nitelik sonunu -a olarak değiştirir, es bağlacı ise tamamen aynı kalır.', pl: 'Ta sama ocena tempa, ale o sytuacji lub rzeczy rodzaju żeńskiego — na przykład conexión (połączenie). Cecha zmienia końcówkę na -a, a łącznik es pozostaje dokładnie taki sam.' },
    [esWord(), { correct: 'rápida', prompt: genderQ(false), d1: genderMismatch('rápida', 'rápido', false), d2: wrongWord('rápida', 'verdadera', M.verdadero) }],
  ),
  'es-e01-s17-es-unico': d(
    { ru: 'Это уникально', uk: 'Це унікально', en: 'It is unique', 'pt-BR': 'É único', vi: 'Nó độc nhất', id: 'Ini unik', tr: 'Bu eşsiz', pl: 'To wyjątkowe' },
    { ru: 'Так говорят про вещь или момент, которому нет равных, — про предмет мужского рода или по умолчанию. Признак согласуется с тем, о чём речь, а не с тем, кто говорит.', uk: 'Так кажуть про річ чи момент, якому немає рівних, — про предмет чоловічого роду чи за замовчуванням. Ознака узгоджується з тим, про що йдеться, а не з тим, хто говорить.', en: 'This is how you talk about a thing or a moment with no equal — about a masculine or default noun. The quality agrees with what is being discussed, not with the speaker.', 'pt-BR': 'É assim que se fala de uma coisa ou momento sem igual — sobre um substantivo masculino ou padrão. A qualidade concorda com aquilo de que se fala, não com quem fala.', vi: 'Đây là cách nói về một vật hay khoảnh khắc không gì sánh bằng — về danh từ giống đực hoặc mặc định. Đặc điểm hòa hợp với điều đang được nói tới, không phải người nói.', id: 'Beginilah cara membicarakan benda atau momen yang tak tertandingi — tentang kata benda maskulin atau default. Sifatnya sesuai dengan apa yang dibicarakan, bukan dengan penutur.', tr: 'Eşi olmayan bir şeyden ya da andan böyle bahsedersiniz — eril ya da varsayılan bir isim hakkında. Nitelik, konuşanla değil, söz konusu olanla uyumludur.', pl: 'Tak mówi się o rzeczy lub chwili, której nie ma równych — o rzeczowniku męskim lub domyślnym. Cecha zgadza się z tym, o czym mowa, nie z tym, kto mówi.' },
    [esWord(), { correct: 'único', prompt: genderQ(true), d1: genderMismatch('único', 'única', true), d2: wrongWord('único', 'importante', M.importante) }],
  ),
  'es-e01-s17-es-unica': d(
    { ru: 'Она уникальная', uk: 'Вона унікальна', en: 'It is unique (feminine)', 'pt-BR': 'É única', vi: 'Nó độc nhất (giống cái)', id: 'Ini unik (feminin)', tr: 'Bu eşsiz (dişil)', pl: 'Jest wyjątkowa' },
    { ru: 'Та же оценка неповторимости, но про вещь или возможность женского рода — например, oportunidad (возможность). Меняется только концовка признака, es остаётся неизменным.', uk: 'Та сама оцінка неповторності, але про річ чи можливість жіночого роду — наприклад, oportunidad (можливість). Змінюється лише закінчення ознаки, es лишається незмінним.', en: 'The same evaluation of uniqueness, but about a feminine thing or opportunity — for example oportunidad (opportunity). Only the ending of the quality changes, es stays unchanged.', 'pt-BR': 'A mesma avaliação de singularidade, mas sobre uma coisa ou oportunidade feminina — por exemplo oportunidad (oportunidade). Só a terminação da qualidade muda, es permanece inalterado.', vi: 'Cùng một đánh giá về sự độc nhất, nhưng về một vật hay cơ hội giống cái — ví dụ oportunidad (cơ hội). Chỉ đuôi của đặc điểm thay đổi, es không đổi.', id: 'Penilaian keunikan yang sama, tetapi tentang benda atau peluang feminin — misalnya oportunidad (peluang). Hanya akhiran sifatnya yang berubah, es tetap tidak berubah.', tr: 'Aynı benzersizlik değerlendirmesi, ama dişil bir şey ya da fırsat hakkında — örneğin oportunidad (fırsat). Yalnızca niteliğin sonu değişir, es değişmeden kalır.', pl: 'Ta sama ocena wyjątkowości, ale o rzeczy lub okazji rodzaju żeńskiego — na przykład oportunidad (okazja). Zmienia się tylko końcówka cechy, es pozostaje niezmienne.' },
    [esWord(), { correct: 'única', prompt: genderQ(false), d1: genderMismatch('única', 'único', false), d2: wrongWord('única', 'cara', M.cara) }],
  ),
  'es-e01-s17-es-verdadero': d(
    { ru: 'Это истинно', uk: 'Це істинно', en: 'It is true', 'pt-BR': 'É verdadeiro', vi: 'Nó là thật', id: 'Ini benar', tr: 'Bu gerçek', pl: 'To prawdziwe' },
    { ru: 'Так подтверждают, что дело обстоит на самом деле именно так, — сильнее простого verdad. Es не спутать с Eres: verdadero описывает факт, а не характер собеседника.', uk: 'Так підтверджують, що справа насправді саме така, — сильніше за просте verdad. Es не сплутати з Eres: verdadero описує факт, а не характер співрозмовника.', en: 'This is how you confirm that things really are exactly this way — stronger than plain verdad. Es is not to be confused with Eres: verdadero describes a fact, not the listener\'s character.', 'pt-BR': 'É assim que se confirma que as coisas realmente são exatamente assim — mais forte que o simples verdad. Es não deve ser confundido com Eres: verdadero descreve um fato, não o caráter do interlocutor.', vi: 'Đây là cách xác nhận rằng sự việc thực sự đúng là như vậy — mạnh hơn verdad thông thường. Đừng nhầm es với Eres: verdadero mô tả sự thật, không phải tính cách người nghe.', id: 'Beginilah cara mengonfirmasi bahwa keadaan sungguh persis begini — lebih kuat daripada verdad biasa. Es jangan sampai tertukar dengan Eres: verdadero menggambarkan fakta, bukan karakter pendengar.', tr: 'İşlerin gerçekten tam olarak böyle olduğunu böyle doğrularsınız — sade verdad’dan daha güçlü. Es, Eres ile karıştırılmamalıdır: verdadero bir gerçeği tanımlar, dinleyicinin karakterini değil.', pl: 'Tak potwierdza się, że sprawy naprawdę mają się dokładnie tak — mocniej niż zwykłe verdad. Es nie należy mylić z Eres: verdadero opisuje fakt, nie charakter słuchacza.' },
    [esWord(), { correct: 'verdadero', prompt: genderQ(true), d1: genderMismatch('verdadero', 'verdadera', true), d2: wrongWord('verdadero', 'verdad', M.verdad) }],
  ),
  'es-e01-s17-es-dificil': d(
    { ru: 'Это трудно', uk: 'Це важко', en: 'It is hard', 'pt-BR': 'É difícil', vi: 'Nó khó', id: 'Ini sulit', tr: 'Bu zor', pl: 'To trudne' },
    { ru: 'Так оценивают задачу или ситуацию как сложную — противоположность fácil. Форма es не различает мужской и женский род вовсе, поэтому она одна и та же в любой оценке ситуации.', uk: 'Так оцінюють завдання чи ситуацію як складну — протилежність fácil. Форма es взагалі не розрізняє чоловічий і жіночий рід, тому вона та сама в будь-якій оцінці ситуації.', en: 'This is how you evaluate a task or situation as difficult — the opposite of fácil. The form es never distinguishes masculine and feminine at all, so it stays the same in any evaluation of a situation.', 'pt-BR': 'É assim que se avalia uma tarefa ou situação como difícil — o oposto de fácil. A forma es nunca distingue masculino e feminino, então ela é a mesma em qualquer avaliação de situação.', vi: 'Đây là cách đánh giá một nhiệm vụ hay tình huống là khó — ngược lại với fácil. Dạng es không bao giờ phân biệt giống đực và giống cái, nên nó giữ nguyên trong mọi đánh giá tình huống.', id: 'Beginilah cara menilai tugas atau situasi sebagai sulit — kebalikan dari fácil. Bentuk es sama sekali tidak membedakan maskulin dan feminin, jadi tetap sama dalam penilaian situasi apa pun.', tr: 'Bir görevi ya da durumu böyle zor olarak değerlendirirsiniz — fácil’in tam tersi. Es biçimi eril ve dişili hiç ayırt etmez, bu yüzden herhangi bir durum değerlendirmesinde aynı kalır.', pl: 'Tak ocenia się zadanie lub sytuację jako trudną — przeciwieństwo fácil. Forma es nigdy nie rozróżnia rodzaju męskiego i żeńskiego, więc pozostaje taka sama w każdej ocenie sytuacji.' },
    [esWord(), { correct: 'difícil', prompt: qualityQ('difícil'), d1: wrongWord('difícil', 'fácil', M.facil), d2: wrongWord('difícil', 'caro', M.caro) }],
  ),
  'es-e01-s17-no-es-facil': d(
    { ru: 'Это нелегко', uk: 'Це нелегко', en: 'It is not easy', 'pt-BR': 'Não é fácil', vi: 'Nó không dễ', id: 'Ini tidak mudah', tr: 'Bu kolay değil', pl: 'To niełatwe' },
    { ru: 'Так возражают на чужую оценку ситуации как простой. No встаёт перед связкой, а не перед признаком, — та же схема отрицания, что и в утверждениях от первого и второго лица, только связка теперь Es.', uk: 'Так заперечують чужу оцінку ситуації як простої. No стоїть перед зв’язкою, а не перед ознакою, — та сама схема заперечення, що й у твердженнях від першої та другої особи, тільки зв’язка тепер Es.', en: 'This is how you push back on someone calling a situation simple. No comes before the linking word, not before the quality — the same negation pattern as in first- and second-person statements, only the linking word is now Es.', 'pt-BR': 'É assim que se contesta alguém chamando uma situação de simples. No vem antes da ligação, não antes da qualidade — o mesmo padrão de negação das afirmações de primeira e segunda pessoa, só que a ligação agora é Es.', vi: 'Đây là cách phản bác khi ai đó gọi một tình huống là đơn giản. No đứng trước từ nối, không phải trước đặc điểm — cùng khuôn mẫu phủ định như trong câu ngôi thứ nhất và thứ hai, chỉ khác từ nối giờ là Es.', id: 'Beginilah cara menyanggah seseorang yang menyebut situasi itu sederhana. No berada sebelum kata penghubung, bukan sebelum sifat — pola negasi yang sama seperti pada pernyataan orang pertama dan kedua, hanya kata penghubungnya sekarang Es.', tr: 'Bir durumu basit olarak nitelendiren birine böyle karşı çıkarsınız. No, nitelikten değil bağlaçtan önce gelir — birinci ve ikinci kişi ifadelerindeki aynı olumsuzlama düzeni, sadece bağlaç artık Es.', pl: 'Tak sprzeciwia się komuś, kto nazywa sytuację prostą. No stoi przed łącznikiem, nie przed cechą — ten sam wzorzec przeczenia co w twierdzeniach pierwszej i drugiej osoby, tylko łącznikiem jest teraz Es.' },
    [noWord, esLowerWord(), { correct: 'fácil', prompt: qualityQ('fácil'), d1: wrongWord('fácil', 'caro', M.caro), d2: wrongWord('fácil', 'importante', M.importante) }],
  ),
});
