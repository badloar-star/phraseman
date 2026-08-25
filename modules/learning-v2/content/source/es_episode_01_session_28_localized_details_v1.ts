import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для 15
// фраз сессии 28 на восьми объяснительных локалях (без 'es'). Фабрика d()
// скопирована по прецеденту сессий 17/25/27
// (es_episode_01_session_27_localized_details_v1.ts) — общий список
// distractors на верхнем уровне phrase.localizedDetails[locale] собирается
// из всех позиций слов, как того требует errorExplanationByLocale.
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
  somosQ: { ru: 'Какая связка нужна для счёта своей группы, включая говорящего?', uk: 'Яка зв’язка потрібна для рахунку своєї групи, включно з мовцем?', en: 'Which linking word fits counting a group that includes the speaker?', 'pt-BR': 'Qual ligação cabe à contagem de um grupo que inclui quem fala?', vi: 'Từ nối nào phù hợp khi đếm nhóm gồm cả người nói?', id: 'Kata penghubung mana yang cocok untuk menghitung kelompok yang mencakup penutur?', tr: 'Konuşanı da içeren bir grubu saymak için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do liczenia grupy, w tym mówiącego?' },
  somosLowerQ: { ru: 'Какая связка нужна после No для счёта своей группы?', uk: 'Яка зв’язка потрібна після No для рахунку своєї групи?', en: 'Which linking word is needed after No for counting one\'s own group?', 'pt-BR': 'Qual ligação é necessária depois de No para contar o próprio grupo?', vi: 'Từ nối nào cần sau No khi đếm nhóm của mình?', id: 'Kata penghubung mana yang diperlukan setelah No untuk menghitung kelompok sendiri?', tr: 'Kendi grubunu saymak için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No do liczenia własnej grupy?' },
  somosAnswerQ: { ru: 'Какой связкой ответить про счёт своей группы?', uk: 'Якою зв’язкою відповісти про рахунок своєї групи?', en: 'Which linking word answers about counting one\'s own group?', 'pt-BR': 'Qual ligação responde sobre contar o próprio grupo?', vi: 'Từ nối nào trả lời về việc đếm nhóm của mình?', id: 'Kata penghubung mana yang menjawab tentang menghitung kelompok sendiri?', tr: 'Kendi grubunu saymak hakkında hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada o liczeniu własnej grupy?' },
  sonQ: { ru: 'Какая связка нужна для счёта группы БЕЗ говорящего внутри?', uk: 'Яка зв’язка потрібна для рахунку групи БЕЗ мовця всередині?', en: 'Which linking word fits counting a group WITHOUT the speaker inside?', 'pt-BR': 'Qual ligação cabe à contagem de um grupo SEM quem fala dentro?', vi: 'Từ nối nào phù hợp khi đếm nhóm KHÔNG có người nói ở trong?', id: 'Kata penghubung mana yang cocok untuk menghitung kelompok TANPA penutur di dalamnya?', tr: 'İçinde konuşan OLMAYAN bir grubu saymak için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do liczenia grupy BEZ mówiącego w środku?' },
  sonLowerQ: { ru: 'Какая связка нужна после No для счёта группы без говорящего?', uk: 'Яка зв’язка потрібна після No для рахунку групи без мовця?', en: 'Which linking word is needed after No for counting a group without the speaker?', 'pt-BR': 'Qual ligação é necessária depois de No para contar um grupo sem quem fala?', vi: 'Từ nối nào cần sau No khi đếm nhóm không có người nói?', id: 'Kata penghubung mana yang diperlukan setelah No untuk menghitung kelompok tanpa penutur?', tr: 'Konuşan olmayan bir grubu saymak için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No do liczenia grupy bez mówiącego?' },
  sonAnswerQ: { ru: 'Какой связкой ответить про счёт чужой группы без говорящего?', uk: 'Якою зв’язкою відповісти про рахунок чужої групи без мовця?', en: 'Which linking word answers about counting another group without the speaker?', 'pt-BR': 'Qual ligação responde sobre contar outro grupo sem quem fala?', vi: 'Từ nối nào trả lời về việc đếm nhóm khác không có người nói?', id: 'Kata penghubung mana yang menjawab tentang menghitung kelompok lain tanpa penutur?', tr: 'Konuşan olmayan başka bir grubu saymak hakkında hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada o liczeniu innej grupy bez mówiącego?' },
  eresQ: { ru: 'Какая связка нужна, чтобы спросить собеседника напрямую?', uk: 'Яка зв’язка потрібна, щоб запитати співрозмовника напряму?', en: 'Which linking word is needed to ask the listener directly?', 'pt-BR': 'Qual ligação é necessária para perguntar ao interlocutor diretamente?', vi: 'Từ nối nào cần để hỏi trực tiếp người nghe?', id: 'Kata penghubung mana yang diperlukan untuk bertanya langsung kepada pendengar?', tr: 'Dinleyiciye doğrudan sormak için hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny, aby zapytać słuchacza wprost?' },
  noQ: { ru: 'Каким словом начать отрицание?', uk: 'Яким словом почати заперечення?', en: 'Which word starts the negation?', 'pt-BR': 'Qual palavra inicia a negação?', vi: 'Từ nào bắt đầu lời phủ định?', id: 'Kata mana yang memulai negasi?', tr: 'Olumsuzlama hangi kelimeyle başlar?', pl: 'Jakim słowem zacząć przeczenie?' },
  noSecondQ: { ru: 'Каким словом отрицать второе число во фразе?', uk: 'Яким словом заперечити друге число у фразі?', en: 'Which word negates the second number in the phrase?', 'pt-BR': 'Qual palavra nega o segundo número na frase?', vi: 'Từ nào phủ định số thứ hai trong câu?', id: 'Kata mana yang menegasikan angka kedua dalam frasa?', tr: 'İfadedeki ikinci sayıyı hangi kelime olumsuzlar?', pl: 'Jakie słowo zaprzecza drugiej liczbie we frazie?' },
  tuQ: { ru: 'Каким местоимением спросить «это ты»?', uk: 'Яким займенником запитати «це ти»?', en: 'Which pronoun asks "is it you"?', 'pt-BR': 'Qual pronome pergunta "é você"?', vi: 'Đại từ nào hỏi "có phải là bạn"?', id: 'Kata ganti mana yang menanyakan "apakah ini kamu"?', tr: '"Sen misin" diye hangi zamirle sorulur?', pl: 'Jakim zaimkiem zapytać „to ty”?' },
} as const;

function numberQ(word: 'dos' | 'tres', ordinalHint: string): Record<LocaleWithoutEs, string> {
  return {
    ru: `Какое число нужно назвать: ${ordinalHint}?`,
    uk: `Яке число потрібно назвати: ${ordinalHint}?`,
    en: `Which number is needed: ${ordinalHint}?`,
    'pt-BR': `Qual número é necessário: ${ordinalHint}?`,
    vi: `Số nào cần được nói ra: ${ordinalHint}?`,
    id: `Angka mana yang perlu disebut: ${ordinalHint}?`,
    tr: `Hangi sayı söylenmeli: ${ordinalHint}?`,
    pl: `Jaką liczbę trzeba podać: ${ordinalHint}?`,
  };
}

const M = {
  tres: { ru: '«три» (другое число)', uk: '«три» (інше число)', en: '"three" (a different number)', 'pt-BR': '"três" (um número diferente)', vi: '"ba" (một con số khác)', id: '"tiga" (angka yang berbeda)', tr: '"üç" (farklı bir sayı)', pl: '„trzy” (inna liczba)' },
  dos: { ru: '«два» (другое число)', uk: '«два» (інше число)', en: '"two" (a different number)', 'pt-BR': '"dois" (um número diferente)', vi: '"hai" (một con số khác)', id: '"dua" (angka yang berbeda)', tr: '"iki" (farklı bir sayı)', pl: '„dwa” (inna liczba)' },
  tu: { ru: '«ты» (местоимение, не число)', uk: '«ти» (займенник, не число)', en: '"you" (a pronoun, not a number)', 'pt-BR': '"você" (um pronome, não um número)', vi: '"bạn" (đại từ, không phải số)', id: '"kamu" (kata ganti, bukan angka)', tr: '"sen" (bir zamir, sayı değil)', pl: '„ty” (zaimek, nie liczba)' },
  ellos: { ru: '«они» (местоимение, не число)', uk: '«вони» (займенник, не число)', en: '"they" (a pronoun, not a number)', 'pt-BR': '"eles" (um pronome, não um número)', vi: '"họ" (đại từ, không phải số)', id: '"mereka" (kata ganti, bukan angka)', tr: '"onlar" (bir zamir, sayı değil)', pl: '„oni” (zaimek, nie liczba)' },
  verdad: { ru: '«правда» (подтверждение факта, не число)', uk: '«правда» (підтвердження факту, не число)', en: '"truth" (confirming a fact, not a number)', 'pt-BR': '"verdade" (confirmando um fato, não um número)', vi: '"sự thật" (xác nhận sự thật, không phải số)', id: '"kebenaran" (mengonfirmasi fakta, bukan angka)', tr: '"gerçek" (bir gerçeği onaylamak, sayı değil)', pl: '„prawda” (potwierdzenie faktu, nie liczba)' },
  asi: { ru: '«так» (описание характера, не число)', uk: '«так» (опис характеру, не число)', en: '"like that" (describing character, not a number)', 'pt-BR': '"assim" (descrevendo caráter, não um número)', vi: '"như vậy" (mô tả tính cách, không phải số)', id: '"begitu" (menggambarkan karakter, bukan angka)', tr: '"böyle" (karakter tanımlamak, sayı değil)', pl: '„tak” (opis charakteru, nie liczba)' },
  de: { ru: '«часть формулы согласия, не число»', uk: '«частина формули згоди, не число»', en: '"part of the agreement formula, not a number"', 'pt-BR': '"parte da fórmula de concordância, não um número"', vi: '"một phần công thức đồng ý, không phải số"', id: '"bagian dari rumus persetujuan, bukan angka"', tr: '"onay formülünün parçası, sayı değil"', pl: '„część formuły zgody, nie liczba”' },
  muy: { ru: '«очень»', uk: '«дуже»', en: '"very"', 'pt-BR': '"muito"', vi: '"rất"', id: '"sangat"', tr: '"çok"', pl: '„bardzo”' },
  tan: { ru: '«настолько»', uk: '«настільки»', en: '"so much"', 'pt-BR': '"tão"', vi: '"đến mức"', id: '"sedemikian"', tr: '"o kadar"', pl: '„tak bardzo”' },
  caro: { ru: '«дорого» (про цену)', uk: '«дорого» (про ціну)', en: '"expensive" (about price)', 'pt-BR': '"caro" (sobre preço)', vi: '"đắt" (về giá)', id: '"mahal" (tentang harga)', tr: '"pahalı" (fiyat hakkında)', pl: '„drogo” (o cenie)' },
  acuerdo: { ru: '«согласие» (часть формулы, не местоимение)', uk: '«згода» (частина формули, не займенник)', en: '"agreement" (part of a formula, not a pronoun)', 'pt-BR': '"acordo" (parte de uma fórmula, não um pronome)', vi: '"đồng ý" (một phần công thức, không phải đại từ)', id: '"persetujuan" (bagian dari rumus, bukan kata ganti)', tr: '"onay" (bir formülün parçası, zamir değil)', pl: '„zgoda” (część formuły, nie zaimek)' },
} as const;

function wrongWord(target: string, wrong: string, wrongMeaning: Record<LocaleWithoutEs, string>): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} означает ${wrongMeaning.ru} — здесь нужно другое слово. Нужно ${target}.`,
    uk: `${wrong} означає ${wrongMeaning.uk} — тут потрібне інше слово. Потрібно ${target}.`,
    en: `${wrong} means ${wrongMeaning.en} — a different word is needed here. You need ${target}.`,
    'pt-BR': `${wrong} significa ${wrongMeaning['pt-BR']} — é preciso outra palavra aqui. Precisa de ${target}.`,
    vi: `${wrong} nghĩa là ${wrongMeaning.vi} — cần một từ khác ở đây. Cần ${target}.`,
    id: `${wrong} berarti ${wrongMeaning.id} — kata lain diperlukan di sini. Perlu ${target}.`,
    tr: `${wrong}, ${wrongMeaning.tr} demektir — burada farklı bir kelime gerekir. ${target} gerekir.`,
    pl: `${wrong} znaczy ${wrongMeaning.pl} — potrzebne jest tu inne słowo. Potrzebne jest ${target}.`,
  }};
}

// зачем centered on person-shift между somos/son/eres (по прецеденту
// sonVsEsOrSomos сессии 27): три связки конкурируют на одной позиции —
// somos (говорящий в группе), son (говорящий вне группы), eres (один
// собеседник). Каждая пара обосновывается отдельно, как того требует
// gate distractor_option_set_copied — набор значений варьируется по фразам.
function somosVsSonOrEres(target: 'Somos' | 'somos'): { d1: Reasoned; d2: Reasoned } {
  const sonWord = target === 'Somos' ? 'Son' : 'son';
  const eresWord = target === 'Somos' ? 'Eres' : 'eres';
  return {
    d1: { value: sonWord, trapType: 'grammar', reason: {
      ru: `${sonWord} — «они», без говорящего в составе группы. Про себя вместе с кем-то — ${target}.`,
      uk: `${sonWord} — «вони», без мовця в складі групи. Про себе разом із кимось — ${target}.`,
      en: `${sonWord} means "they", without the speaker in the group. Talking about yourself together with others needs ${target}.`,
      'pt-BR': `${sonWord} significa "eles", sem quem fala no grupo. Falar de si mesmo junto com outros precisa de ${target}.`,
      vi: `${sonWord} nghĩa là "họ", không có người nói trong nhóm. Nói về bản thân cùng người khác cần ${target}.`,
      id: `${sonWord} berarti "mereka", tanpa penutur dalam kelompok. Berbicara tentang diri sendiri bersama orang lain memerlukan ${target}.`,
      tr: `${sonWord} "onlar" demektir, gruba konuşan dahil değildir. Kendinden başkalarıyla birlikte bahsetmek ${target} gerektirir.`,
      pl: `${sonWord} znaczy „oni”, bez mówiącego w grupie. Mówienie o sobie razem z kimś wymaga ${target}.`,
    }},
    d2: { value: eresWord, trapType: 'grammar', reason: {
      ru: `${eresWord} — обращение к одному собеседнику. Счёт своей группы из нескольких человек — ${target}.`,
      uk: `${eresWord} — звернення до одного співрозмовника. Рахунок своєї групи з кількох людей — ${target}.`,
      en: `${eresWord} addresses one listener. Counting your own group of several people needs ${target}.`,
      'pt-BR': `${eresWord} fala com um único interlocutor. Contar o próprio grupo de várias pessoas precisa de ${target}.`,
      vi: `${eresWord} nói với một người nghe. Đếm nhóm của mình gồm nhiều người cần ${target}.`,
      id: `${eresWord} berbicara dengan satu pendengar. Menghitung kelompok sendiri yang terdiri dari beberapa orang memerlukan ${target}.`,
      tr: `${eresWord} tek bir dinleyiciyle konuşur. Kendi birkaç kişilik grubunu saymak ${target} gerektirir.`,
      pl: `${eresWord} zwraca się do jednego słuchacza. Liczenie własnej grupy kilku osób wymaga ${target}.`,
    }},
  };
}

function sonVsSomosOrEs(target: 'Son' | 'son'): { d1: Reasoned; d2: Reasoned } {
  const somosWord = target === 'Son' ? 'Somos' : 'somos';
  const esWord = target === 'Son' ? 'Es' : 'es';
  return {
    d1: { value: somosWord, trapType: 'grammar', reason: {
      ru: `${somosWord} включает самого говорящего в группу. Счёт чужой группы без говорящего — ${target}.`,
      uk: `${somosWord} включає самого мовця в групу. Рахунок чужої групи без мовця — ${target}.`,
      en: `${somosWord} includes the speaker in the group. Counting another group without the speaker needs ${target}.`,
      'pt-BR': `${somosWord} inclui quem fala no grupo. Contar outro grupo sem quem fala precisa de ${target}.`,
      vi: `${somosWord} bao gồm người nói trong nhóm. Đếm nhóm khác không có người nói cần ${target}.`,
      id: `${somosWord} mencakup penutur dalam kelompok. Menghitung kelompok lain tanpa penutur perlu ${target}.`,
      tr: `${somosWord}, konuşanı gruba dahil eder. Konuşan olmayan başka bir grubu saymak ${target} gerektirir.`,
      pl: `${somosWord} obejmuje mówiącego w grupie. Liczenie innej grupy bez mówiącego wymaga ${target}.`,
    }},
    d2: { value: esWord, trapType: 'grammar', reason: {
      ru: `${esWord} — только об одном. Счёт нескольких — ${target}.`,
      uk: `${esWord} — тільки про одного. Рахунок кількох — ${target}.`,
      en: `${esWord} is only about one. Counting several needs ${target}.`,
      'pt-BR': `${esWord} é só sobre um. Contar vários precisa de ${target}.`,
      vi: `${esWord} chỉ nói về một. Đếm nhiều cần ${target}.`,
      id: `${esWord} hanya tentang satu. Menghitung beberapa perlu ${target}.`,
      tr: `${esWord} yalnızca bir kişi hakkındadır. Birkaçını saymak ${target} gerektirir.`,
      pl: `${esWord} dotyczy tylko jednej osoby. Liczenie kilku wymaga ${target}.`,
    }},
  };
}

const negationWord: WordSpec = {
  correct: 'No',
  prompt: T.noQ,
  d1: { value: 'Nada', trapType: 'semantic_neighbor', reason: {
    ru: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.',
    uk: 'Nada — «нічого», окреме слово-предмет. Заперечення зв’язки — No.',
    en: 'Nada means "nothing", a separate word for a thing. Negating the linking word needs No.',
    'pt-BR': 'Nada significa "nada", uma palavra separada para uma coisa. Negar a ligação precisa de No.',
    vi: 'Nada nghĩa là "không có gì", một từ riêng chỉ vật. Phủ định từ nối cần No.',
    id: 'Nada berarti "tidak ada apa-apa", kata terpisah untuk benda. Menegasikan kata penghubung perlu No.',
    tr: 'Nada "hiçbir şey" demektir, bir şey için ayrı bir kelimedir. Bağlacı olumsuzlamak No gerektirir.',
    pl: 'Nada znaczy „nic”, osobne słowo oznaczające rzecz. Zaprzeczenie łącznika wymaga No.',
  }},
  d2: { value: 'Non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется No.',
    uk: 'Non — не іспанське слово. В іспанській заперечення пишеться No.',
    en: 'Non is not a Spanish word. Spanish spells the negation No.',
    'pt-BR': 'Non não é uma palavra espanhola. Em espanhol a negação se escreve No.',
    vi: 'Non không phải là từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha phủ định viết là No.',
    id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol negasi ditulis No.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama No olarak yazılır.',
    pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie zapisuje się No.',
  }},
};

const nuncaNegationWord: WordSpec = {
  correct: 'No',
  prompt: T.noQ,
  d1: { value: 'Nada', trapType: 'semantic_neighbor', reason: {
    ru: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.',
    uk: 'Nada — «нічого», окреме слово-предмет. Заперечення зв’язки — No.',
    en: 'Nada means "nothing", a separate word for a thing. Negating the linking word needs No.',
    'pt-BR': 'Nada significa "nada", uma palavra separada para uma coisa. Negar a ligação precisa de No.',
    vi: 'Nada nghĩa là "không có gì", một từ riêng chỉ vật. Phủ định từ nối cần No.',
    id: 'Nada berarti "tidak ada apa-apa", kata terpisah untuk benda. Menegasikan kata penghubung perlu No.',
    tr: 'Nada "hiçbir şey" demektir, bir şey için ayrı bir kelimedir. Bağlacı olumsuzlamak No gerektirir.',
    pl: 'Nada znaczy „nic”, osobne słowo oznaczające rzecz. Zaprzeczenie łącznika wymaga No.',
  }},
  d2: { value: 'Nunca', trapType: 'semantic_neighbor', reason: {
    ru: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.',
    uk: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — No.',
    en: 'Nunca means "never", about frequency in time. Simple negation needs No.',
    'pt-BR': 'Nunca significa "nunca", sobre frequência no tempo. Negação simples precisa de No.',
    vi: 'Nunca nghĩa là "không bao giờ", về tần suất thời gian. Phủ định đơn giản cần No.',
    id: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Negasi sederhana perlu No.',
    tr: 'Nunca "asla" demektir, zaman sıklığı hakkındadır. Basit olumsuzlama No gerektirir.',
    pl: 'Nunca znaczy „nigdy”, dotyczy częstotliwości w czasie. Proste przeczenie wymaga No.',
  }},
};

const dosWord = (prompt: Record<LocaleWithoutEs, string>, altWrong: string, altMeaning: Record<LocaleWithoutEs, string>): WordSpec => ({
  correct: 'dos',
  prompt,
  d1: wrongWord('dos', 'tres', M.tres),
  d2: wrongWord('dos', altWrong, altMeaning),
});

const tresWord = (prompt: Record<LocaleWithoutEs, string>, altWrong: string, altMeaning: Record<LocaleWithoutEs, string>): WordSpec => ({
  correct: 'tres',
  prompt,
  d1: wrongWord('tres', 'dos', M.dos),
  d2: wrongWord('tres', altWrong, altMeaning),
});

const deWord: WordSpec = {
  correct: 'de',
  prompt: { ru: 'Какое слово стоит внутри формулы согласия?', uk: 'Яке слово стоїть усередині формули згоди?', en: 'Which word sits inside the agreement formula?', 'pt-BR': 'Qual palavra fica dentro da fórmula de concordância?', vi: 'Từ nào nằm trong công thức đồng ý?', id: 'Kata mana yang berada di dalam rumus persetujuan?', tr: 'Onay formülünün içinde hangi kelime bulunur?', pl: 'Jakie słowo znajduje się wewnątrz formuły zgody?' },
  d1: wrongWord('de', 'muy', M.muy),
  d2: wrongWord('de', 'tan', M.tan),
};

const acuerdoWord: WordSpec = {
  correct: 'acuerdo',
  prompt: { ru: 'Какое слово заканчивает формулу согласия?', uk: 'Яке слово завершує формулу згоди?', en: 'Which word finishes the agreement formula?', 'pt-BR': 'Qual palavra termina a fórmula de concordância?', vi: 'Từ nào kết thúc công thức đồng ý?', id: 'Kata mana yang mengakhiri rumus persetujuan?', tr: 'Onay formülünü hangi kelime tamamlar?', pl: 'Jakie słowo kończy formułę zgody?' },
  d1: wrongWord('acuerdo', 'caro', M.caro),
  d2: wrongWord('acuerdo', 'verdad', M.verdad),
};

export const ES_SESSION_28_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s28-somos-dos': d(
    { ru: 'Нас двое', uk: 'Нас двоє', en: 'There are two of us', 'pt-BR': 'Somos dois', vi: 'Chúng tôi có hai người', id: 'Kami berdua', tr: 'İkimiziz', pl: 'Jest nas dwoje' },
    { ru: 'Так говорят о размере своей группы, называя число сразу после связки. Somos уже включает говорящего, а dos просто добавляет точный счёт — сколько человек всего.', uk: 'Так говорять про розмір своєї групи, називаючи число одразу після зв’язки. Somos уже включає мовця, а dos просто додає точний рахунок — скільки людей загалом.', en: 'This is how you state the size of your own group, naming the number right after the linking word. Somos already includes the speaker, and dos simply adds the exact count — how many people in total.', 'pt-BR': 'É assim que se diz o tamanho do próprio grupo, nomeando o número logo após a ligação. Somos já inclui quem fala, e dos apenas acrescenta a contagem exata — quantas pessoas ao todo.', vi: 'Đây là cách nói về quy mô nhóm của mình, gọi tên số ngay sau từ nối. Somos đã bao gồm người nói, và dos chỉ thêm số đếm chính xác — tổng cộng bao nhiêu người.', id: 'Beginilah cara menyatakan ukuran kelompok sendiri, menyebut angka tepat setelah kata penghubung. Somos sudah mencakup penutur, dan dos hanya menambahkan jumlah pasti — berapa banyak orang semuanya.', tr: 'Kendi grubunun büyüklüğü böyle söylenir, sayı bağlaçtan hemen sonra söylenir. Somos zaten konuşanı içerir, ve dos yalnızca kesin sayıyı ekler — toplam kaç kişi.', pl: 'Tak mówi się o rozmiarze własnej grupy, podając liczbę zaraz po łączniku. Somos już obejmuje mówiącego, a dos po prostu dodaje dokładną liczbę — ile osób w sumie.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrEres('Somos') },
      dosWord(numberQ('dos', 'dos'), 'tú', M.tu),
    ],
  ),
  'es-e01-s28-no-somos-dos': d(
    { ru: 'Нас не двое', uk: 'Нас не двоє', en: 'There are not two of us', 'pt-BR': 'Não somos dois', vi: 'Chúng tôi không có hai người', id: 'Kami tidak berdua', tr: 'İkimiz değiliz', pl: 'Nie jest nas dwoje' },
    { ru: 'Отрицание счёта своей группы — поправка на неверное число. No встаёт перед связкой, как и во всех прошлых отрицаниях, а dos остаётся простым числительным без изменений.', uk: 'Заперечення рахунку своєї групи — поправка на невірне число. No стає перед зв’язкою, як і в усіх минулих запереченнях, а dos лишається простим числівником без змін.', en: 'This negates the count of your own group — a correction of the wrong number. No comes before the linking word, as in all earlier negations, and dos remains a plain unchanged number.', 'pt-BR': 'Isso nega a contagem do próprio grupo — uma correção do número errado. No vem antes da ligação, como em todas as negações anteriores, e dos permanece um número simples sem mudanças.', vi: 'Đây là phủ định số đếm nhóm của mình — sửa lại con số sai. No đứng trước từ nối, giống như trong mọi phủ định trước đó, và dos vẫn là con số đơn giản không đổi.', id: 'Ini menegasikan jumlah kelompok sendiri — koreksi angka yang salah. No berada sebelum kata penghubung, seperti pada semua negasi sebelumnya, dan dos tetap menjadi angka sederhana yang tidak berubah.', tr: 'Bu, kendi grubunun sayısını olumsuzlar — yanlış sayının düzeltilmesi. No, önceki tüm olumsuzlamalarda olduğu gibi bağlaçtan önce gelir, ve dos basit, değişmemiş bir sayı olarak kalır.', pl: 'To zaprzecza liczbie własnej grupy — poprawka błędnej liczby. No stoi przed łącznikiem, jak we wszystkich wcześniejszych przeczeniach, a dos pozostaje prostą, niezmienioną liczbą.' },
    [
      negationWord,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrEres('somos') },
      dosWord(numberQ('dos', 'dos'), 'así', M.asi),
    ],
  ),
  'es-e01-s28-somos-dos-verdad-q': d(
    { ru: 'Нас двое, правда?', uk: 'Нас двоє, правда?', en: 'There are two of us, right?', 'pt-BR': 'Somos dois, não é?', vi: 'Chúng tôi có hai người, đúng không?', id: 'Kami berdua, benar kan?', tr: 'İkimiziz, değil mi?', pl: 'Jest nas dwoje, prawda?' },
    { ru: 'Вопрос о размере своей группы с хвостовым подтверждением. Recall слова verdad из первой сессии как короткого «правда?» в конце фразы — Somos и dos не меняются, только добавляется вопрос-довесок.', uk: 'Питання про розмір своєї групи з хвостовим підтвердженням. Recall слова verdad із першої сесії як короткого «правда?» наприкінці фрази — Somos і dos не змінюються, лише додається питання-довісок.', en: 'A question about the size of your own group with a tag confirmation. Recall of the word verdad from the first session as a short "right?" at the end of the phrase — Somos and dos do not change, only a tag question is added.', 'pt-BR': 'Uma pergunta sobre o tamanho do próprio grupo com uma confirmação no final. Recall da palavra verdad da primeira sessão como um curto "não é?" no fim da frase — Somos e dos não mudam, só se acrescenta a pergunta de confirmação.', vi: 'Câu hỏi về quy mô nhóm của mình kèm câu hỏi đuôi xác nhận. Ôn lại từ verdad từ bài đầu tiên như câu hỏi ngắn "đúng không?" ở cuối câu — Somos và dos không đổi, chỉ thêm câu hỏi đuôi.', id: 'Pertanyaan tentang ukuran kelompok sendiri dengan penegasan di akhir. Mengingat kembali kata verdad dari sesi pertama sebagai pertanyaan pendek "benar kan?" di akhir frasa — Somos dan dos tidak berubah, hanya ditambahkan pertanyaan penegas.', tr: 'Kendi grubunun büyüklüğü hakkında etiket onaylı bir soru. İlk oturumdan verdad kelimesinin ifadenin sonunda kısa bir "değil mi?" olarak hatırlanması — Somos ve dos değişmez, yalnızca bir etiket soru eklenir.', pl: 'Pytanie o rozmiar własnej grupy z pytaniem potwierdzającym na końcu. Przypomnienie słowa verdad z pierwszej sesji jako krótkiego „prawda?” na końcu frazy — Somos i dos się nie zmieniają, dodaje się tylko pytanie potwierdzające.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrEres('Somos') },
      dosWord(numberQ('dos', 'dos'), 'ellos', M.ellos),
      { correct: 'verdad', prompt: { ru: 'Каким коротким вопросом подтвердить сказанное?', uk: 'Яким коротким питанням підтвердити сказане?', en: 'Which short question confirms what was just said?', 'pt-BR': 'Qual pergunta curta confirma o que foi dito?', vi: 'Câu hỏi ngắn nào xác nhận điều vừa nói?', id: 'Pertanyaan pendek mana yang menegaskan apa yang baru dikatakan?', tr: 'Az önce söyleneni hangi kısa soru doğrular?', pl: 'Jakie krótkie pytanie potwierdza to, co powiedziano?' }, d1: wrongWord('verdad', 'acuerdo', { ru: '«согласие» (с чужим мнением)', uk: '«згода» (з чужою думкою)', en: '"agreement" (with someone else\'s opinion)', 'pt-BR': '"acordo" (com a opinião de outra pessoa)', vi: '"đồng ý" (với ý kiến người khác)', id: '"persetujuan" (dengan pendapat orang lain)', tr: '"onay" (başkasının görüşüyle)', pl: '„zgoda” (z cudzą opinią)' }), d2: wrongWord('verdad', 'así', M.asi) },
    ],
  ),
  'es-e01-s28-somos-dos-no-tres': d(
    { ru: 'Нас двое, не трое', uk: 'Нас двоє, не троє', en: 'There are two of us, not three', 'pt-BR': 'Somos dois, não três', vi: 'Chúng tôi có hai người, không phải ba', id: 'Kami berdua, bukan bertiga', tr: 'İkimiziz, üç değil', pl: 'Jest nas dwoje, nie troje' },
    { ru: 'Уточнение точного числа через контраст с соседним. No здесь отрицает не связку, а само число — короткая поправка сразу после первого числительного.', uk: 'Уточнення точного числа через контраст із сусіднім. No тут заперечує не зв’язку, а саме число — коротка поправка одразу після першого числівника.', en: 'A clarification of the exact number through contrast with a neighboring one. Here No negates not the linking word but the number itself — a short correction right after the first numeral.', 'pt-BR': 'Um esclarecimento do número exato por contraste com um vizinho. Aqui No nega não a ligação, mas o próprio número — uma correção curta logo após o primeiro numeral.', vi: 'Làm rõ con số chính xác qua đối lập với con số lân cận. Ở đây No phủ định không phải từ nối mà chính con số — một sửa chữa ngắn ngay sau số đầu tiên.', id: 'Klarifikasi angka pasti melalui kontras dengan angka tetangganya. Di sini No menegasikan bukan kata penghubung, melainkan angkanya sendiri — koreksi singkat tepat setelah angka pertama.', tr: 'Komşu sayıyla karşıtlık yoluyla tam sayının netleştirilmesi. Burada No bağlacı değil, sayının kendisini olumsuzlar — ilk sayıdan hemen sonra kısa bir düzeltme.', pl: 'Doprecyzowanie dokładnej liczby przez kontrast z sąsiednią. Tutaj No zaprzecza nie łącznikowi, lecz samej liczbie — krótka poprawka zaraz po pierwszym liczebniku.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrEres('Somos') },
      dosWord(numberQ('dos', 'dos'), 'así', M.asi),
      negationWord,
      tresWord(numberQ('tres', 'tres'), 'tú', M.tu),
    ],
  ),
  'es-e01-s28-son-dos': d(
    { ru: 'Их двое', uk: 'Їх двоє', en: 'There are two of them', 'pt-BR': 'São dois', vi: 'Họ có hai người', id: 'Mereka berdua', tr: 'Onlar iki kişi', pl: 'Jest ich dwoje' },
    { ru: 'Так говорят о размере чужой группы, в которую говорящий не входит. Son показывает третье лицо множественного числа, dos называет точный счёт — те же две части, что и в somos dos, но без говорящего внутри.', uk: 'Так говорять про розмір чужої групи, до якої мовець не входить. Son показує третю особу множини, dos називає точний рахунок — ті самі дві частини, що й у somos dos, але без мовця всередині.', en: 'This is how you state the size of a group the speaker is not part of. Son shows the third-person plural, dos states the exact count — the same two parts as in somos dos, but without the speaker inside.', 'pt-BR': 'É assim que se diz o tamanho de um grupo do qual quem fala não faz parte. Son mostra a terceira pessoa do plural, dos indica a contagem exata — as mesmas duas partes de somos dos, mas sem quem fala dentro.', vi: 'Đây là cách nói về quy mô của một nhóm mà người nói không thuộc về. Son cho thấy ngôi thứ ba số nhiều, dos nói ra số đếm chính xác — cùng hai phần như somos dos, nhưng không có người nói ở trong.', id: 'Beginilah cara menyatakan ukuran kelompok yang tidak mencakup penutur. Son menunjukkan orang ketiga jamak, dos menyebutkan jumlah pasti — dua bagian yang sama seperti pada somos dos, tetapi tanpa penutur di dalamnya.', tr: 'Konuşanın parçası olmadığı bir grubun büyüklüğü böyle söylenir. Son üçüncü çoğul şahsı gösterir, dos kesin sayıyı belirtir — somos dos’taki aynı iki parça, ama içinde konuşan olmadan.', pl: 'Tak mówi się o rozmiarze grupy, do której mówiący nie należy. Son pokazuje trzecią osobę liczby mnogiej, dos podaje dokładną liczbę — te same dwie części co w somos dos, ale bez mówiącego w środku.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      dosWord(numberQ('dos', 'dos'), 'ellos', M.ellos),
    ],
  ),
  'es-e01-s28-no-son-dos': d(
    { ru: 'Их не двое', uk: 'Їх не двоє', en: 'There are not two of them', 'pt-BR': 'Não são dois', vi: 'Họ không có hai người', id: 'Mereka tidak berdua', tr: 'Onlar iki kişi değil', pl: 'Nie jest ich dwoje' },
    { ru: 'Отрицание счёта чужой группы — поправка на неверное число со стороны. No встаёт перед связкой, dos остаётся простым числительным без изменений, как и в somos-версии этого отрицания.', uk: 'Заперечення рахунку чужої групи — поправка на невірне число збоку. No стає перед зв’язкою, dos лишається простим числівником без змін, як і в somos-версії цього заперечення.', en: 'This negates the count of another group — a correction of the wrong number from the outside. No comes before the linking word, dos remains a plain unchanged number, just like in the somos version of this negation.', 'pt-BR': 'Isso nega a contagem de outro grupo — uma correção do número errado de fora. No vem antes da ligação, dos permanece um número simples sem mudanças, assim como na versão com somos dessa negação.', vi: 'Đây là phủ định số đếm của nhóm khác — sửa lại con số sai từ bên ngoài. No đứng trước từ nối, dos vẫn là con số đơn giản không đổi, giống như phiên bản somos của phủ định này.', id: 'Ini menegasikan jumlah kelompok lain — koreksi angka yang salah dari luar. No berada sebelum kata penghubung, dos tetap menjadi angka sederhana yang tidak berubah, sama seperti versi somos dari negasi ini.', tr: 'Bu, başka bir grubun sayısını olumsuzlar — dışarıdan yanlış sayının düzeltilmesi. No bağlaçtan önce gelir, dos bu olumsuzlamanın somos versiyonunda olduğu gibi basit, değişmemiş bir sayı olarak kalır.', pl: 'To zaprzecza liczbie innej grupy — poprawka błędnej liczby z zewnątrz. No stoi przed łącznikiem, dos pozostaje prostą, niezmienioną liczbą, tak jak w wersji z somos tego przeczenia.' },
    [
      nuncaNegationWord,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsSomosOrEs('son') },
      dosWord(numberQ('dos', 'dos'), 'verdad', M.verdad),
    ],
  ),
  'es-e01-s28-son-dos-verdad-q': d(
    { ru: 'Их двое, правда?', uk: 'Їх двоє, правда?', en: 'There are two of them, right?', 'pt-BR': 'São dois, não é?', vi: 'Họ có hai người, đúng không?', id: 'Mereka berdua, benar kan?', tr: 'Onlar iki kişi, değil mi?', pl: 'Jest ich dwoje, prawda?' },
    { ru: 'Вопрос о размере чужой группы с хвостовым подтверждением. Recall слова verdad из первой сессии как короткого «правда?» в конце фразы — Son и dos не меняются, только добавляется вопрос-довесок.', uk: 'Питання про розмір чужої групи з хвостовим підтвердженням. Recall слова verdad із першої сесії як короткого «правда?» наприкінці фрази — Son і dos не змінюються, лише додається питання-довісок.', en: 'A question about the size of another group with a tag confirmation. Recall of the word verdad from the first session as a short "right?" at the end of the phrase — Son and dos do not change, only a tag question is added.', 'pt-BR': 'Uma pergunta sobre o tamanho de outro grupo com uma confirmação no final. Recall da palavra verdad da primeira sessão como um curto "não é?" no fim da frase — Son e dos não mudam, só se acrescenta a pergunta de confirmação.', vi: 'Câu hỏi về quy mô của nhóm khác kèm câu hỏi đuôi xác nhận. Ôn lại từ verdad từ bài đầu tiên như câu hỏi ngắn "đúng không?" ở cuối câu — Son và dos không đổi, chỉ thêm câu hỏi đuôi.', id: 'Pertanyaan tentang ukuran kelompok lain dengan penegasan di akhir. Mengingat kembali kata verdad dari sesi pertama sebagai pertanyaan pendek "benar kan?" di akhir frasa — Son dan dos tidak berubah, hanya ditambahkan pertanyaan penegas.', tr: 'Başka bir grubun büyüklüğü hakkında etiket onaylı bir soru. İlk oturumdan verdad kelimesinin ifadenin sonunda kısa bir "değil mi?" olarak hatırlanması — Son ve dos değişmez, yalnızca bir etiket soru eklenir.', pl: 'Pytanie o rozmiar innej grupy z pytaniem potwierdzającym na końcu. Przypomnienie słowa verdad z pierwszej sesji jako krótkiego „prawda?” na końcu frazy — Son i dos się nie zmieniają, dodaje się tylko pytanie potwierdzające.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      dosWord(numberQ('dos', 'dos'), 'así', M.asi),
      { correct: 'verdad', prompt: { ru: 'Каким коротким вопросом подтвердить сказанное?', uk: 'Яким коротким питанням підтвердити сказане?', en: 'Which short question confirms what was just said?', 'pt-BR': 'Qual pergunta curta confirma o que foi dito?', vi: 'Câu hỏi ngắn nào xác nhận điều vừa nói?', id: 'Pertanyaan pendek mana yang menegaskan apa yang baru dikatakan?', tr: 'Az önce söyleneni hangi kısa soru doğrular?', pl: 'Jakie krótkie pytanie potwierdza to, co powiedziano?' }, d1: wrongWord('verdad', 'acuerdo', { ru: '«согласие» (с чужим мнением)', uk: '«згода» (з чужою думкою)', en: '"agreement" (with someone else\'s opinion)', 'pt-BR': '"acordo" (com a opinião de outra pessoa)', vi: '"đồng ý" (với ý kiến người khác)', id: '"persetujuan" (dengan pendapat orang lain)', tr: '"onay" (başkasının görüşüyle)', pl: '„zgoda” (z cudzą opinią)' }), d2: wrongWord('verdad', 'igual', { ru: '«всё равно» (безразличие)', uk: '«байдуже» (байдужість)', en: '"indifferent" (does not change things)', 'pt-BR': '"tanto faz" (indiferença)', vi: '"thờ ơ" (không thay đổi gì)', id: '"tidak peduli" (ketidakpedulian)', tr: '"fark etmez" (kayıtsızlık)', pl: '„wszystko jedno” (obojętność)' }) },
    ],
  ),
  'es-e01-s28-son-tres': d(
    { ru: 'Их трое', uk: 'Їх троє', en: 'There are three of them', 'pt-BR': 'São três', vi: 'Họ có ba người', id: 'Mereka bertiga', tr: 'Onlar üç kişi', pl: 'Jest ich troje' },
    { ru: 'Тот же счёт чужой группы, но с другим числом. Tres встаёт сразу после son точно так же, как dos — форма связки от числа не зависит вовсе.', uk: 'Той самий рахунок чужої групи, але з іншим числом. Tres стає одразу після son точнісінько як dos — форма зв’язки від числа не залежить зовсім.', en: 'The same count of another group, but with a different number. Tres comes right after son exactly like dos — the linking word\'s form does not depend on the number at all.', 'pt-BR': 'A mesma contagem de outro grupo, mas com um número diferente. Tres vem logo após son exatamente como dos — a forma da ligação não depende nada do número.', vi: 'Cùng số đếm của nhóm khác, nhưng với con số khác. Tres đứng ngay sau son y hệt như dos — dạng của từ nối hoàn toàn không phụ thuộc vào con số.', id: 'Jumlah yang sama dari kelompok lain, tetapi dengan angka berbeda. Tres muncul tepat setelah son persis seperti dos — bentuk kata penghubung sama sekali tidak bergantung pada angka.', tr: 'Başka bir grubun aynı sayısı, ama farklı bir sayıyla. Tres, son’dan hemen sonra tıpkı dos gibi gelir — bağlacın biçimi sayıya hiç bağlı değildir.', pl: 'Ta sama liczba innej grupy, ale z inną liczbą. Tres pojawia się zaraz po son dokładnie tak jak dos — forma łącznika wcale nie zależy od liczby.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      tresWord(numberQ('tres', 'tres'), 'ellos', M.ellos),
    ],
  ),
  'es-e01-s28-no-son-tres': d(
    { ru: 'Их не трое', uk: 'Їх не троє', en: 'There are not three of them', 'pt-BR': 'Não são três', vi: 'Họ không có ba người', id: 'Mereka tidak bertiga', tr: 'Onlar üç kişi değil', pl: 'Nie jest ich troje' },
    { ru: 'Отрицание счёта чужой группы с числом tres — та же поправка, что и с dos, только другое число. No встаёт перед связкой, tres остаётся без изменений.', uk: 'Заперечення рахунку чужої групи з числом tres — та сама поправка, що й з dos, тільки інше число. No стає перед зв’язкою, tres лишається без змін.', en: 'A negation of another group\'s count with the number tres — the same correction as with dos, only a different number. No comes before the linking word, tres remains unchanged.', 'pt-BR': 'Uma negação da contagem de outro grupo com o número tres — a mesma correção que com dos, só que com número diferente. No vem antes da ligação, tres permanece sem mudanças.', vi: 'Phủ định số đếm của nhóm khác với con số tres — cùng cách sửa như với dos, chỉ khác con số. No đứng trước từ nối, tres không đổi.', id: 'Negasi jumlah kelompok lain dengan angka tres — koreksi yang sama seperti dengan dos, hanya angkanya berbeda. No berada sebelum kata penghubung, tres tetap tidak berubah.', tr: 'Başka bir grubun tres sayısıyla olumsuzlanması — dos’takiyle aynı düzeltme, sadece farklı bir sayı. No bağlaçtan önce gelir, tres değişmeden kalır.', pl: 'Zaprzeczenie liczby innej grupy liczbą tres — ta sama poprawka co przy dos, tylko inna liczba. No stoi przed łącznikiem, tres pozostaje bez zmian.' },
    [
      negationWord,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsSomosOrEs('son') },
      tresWord(numberQ('tres', 'tres'), 'verdad', M.verdad),
    ],
  ),
  'es-e01-s28-son-tres-q': d(
    { ru: 'Их трое? Нас двое', uk: 'Їх троє? Нас двоє', en: 'Are there three of them? There are two of us', 'pt-BR': 'São três? Somos dois', vi: 'Họ có ba người à? Chúng tôi có hai người', id: 'Apakah mereka bertiga? Kami berdua', tr: 'Onlar üç kişi mi? İkimiziz', pl: 'Jest ich troje? Jest nas dwoje' },
    { ru: 'Диалог из вопроса о чужой группе и ответа о своей — прямой контраст somos против son на одной карточке. Оба числа разные: у них tres, у нас dos.', uk: 'Діалог із питання про чужу групу й відповіді про свою — прямий контраст somos проти son на одній картці. Обидва числа різні: у них tres, у нас dos.', en: 'A dialogue with a question about another group and an answer about one\'s own — a direct contrast of somos against son on one card. The two numbers differ: tres for them, dos for us.', 'pt-BR': 'Um diálogo com uma pergunta sobre outro grupo e uma resposta sobre o próprio — um contraste direto de somos contra son em um único cartão. Os dois números são diferentes: tres para eles, dos para nós.', vi: 'Đoạn hội thoại với câu hỏi về nhóm khác và câu trả lời về nhóm mình — đối lập trực tiếp somos với son trên cùng một thẻ. Hai con số khác nhau: tres cho họ, dos cho chúng tôi.', id: 'Dialog dengan pertanyaan tentang kelompok lain dan jawaban tentang kelompok sendiri — kontras langsung somos melawan son dalam satu kartu. Kedua angka berbeda: tres untuk mereka, dos untuk kami.', tr: 'Başka bir grup hakkında bir soru ve kendi grubu hakkında bir yanıt içeren bir diyalog — tek bir kartta somos’a karşı son’un doğrudan karşıtlığı. İki sayı farklıdır: onlar için tres, biz için dos.', pl: 'Dialog z pytaniem o inną grupę i odpowiedzią o własną — bezpośredni kontrast somos wobec son na jednej karcie. Obie liczby są różne: tres dla nich, dos dla nas.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      tresWord(numberQ('tres', 'tres'), 'ellos', M.ellos),
      { correct: 'somos', prompt: T.somosAnswerQ, ...somosVsSonOrEres('somos') },
      dosWord(numberQ('dos', 'dos'), 'así', M.asi),
    ],
  ),
  'es-e01-s28-eres-tu-somos-dos': d(
    { ru: 'Это ты? Нас двое', uk: 'Це ти? Нас двоє', en: 'Is it you? There are two of us', 'pt-BR': 'É você? Somos dois', vi: 'Có phải là bạn không? Chúng tôi có hai người', id: 'Apakah ini kamu? Kami berdua', tr: 'Sen misin? İkimiziz', pl: 'To ty? Jest nas dwoje' },
    { ru: 'Диалог из вопроса, узнают ли собеседника, и ответа про размер своей группы. Recall связки eres из девятой сессии в вопросе, ответ — уже somos перед числом dos.', uk: 'Діалог із питання, чи впізнають співрозмовника, і відповіді про розмір своєї групи. Recall зв’язки eres із дев’ятої сесії в питанні, відповідь — уже somos перед числом dos.', en: 'A dialogue with a question checking whether the listener is recognized, and an answer about the size of one\'s own group. Recall of the linking word eres from the ninth session in the question, the reply is already somos before the number dos.', 'pt-BR': 'Um diálogo com uma pergunta para saber se reconhecem o interlocutor, e uma resposta sobre o tamanho do próprio grupo. Recall da ligação eres da nona sessão na pergunta, a resposta já é somos antes do número dos.', vi: 'Đoạn hội thoại với câu hỏi kiểm tra xem có nhận ra người nghe không, và câu trả lời về quy mô nhóm của mình. Ôn lại từ nối eres từ bài thứ chín trong câu hỏi, câu trả lời đã là somos trước con số dos.', id: 'Dialog dengan pertanyaan untuk memeriksa apakah pendengar dikenali, dan jawaban tentang ukuran kelompok sendiri. Mengingat kembali kata penghubung eres dari sesi kesembilan dalam pertanyaan, jawabannya sudah somos sebelum angka dos.', tr: 'Dinleyicinin tanınıp tanınmadığını kontrol eden bir soru ve kendi grubunun büyüklüğü hakkında bir yanıt içeren bir diyalog. Sorudaki dokuzuncu oturumdan bağlaç eres’in hatırlanması, yanıt zaten dos sayısından önce somos’tur.', pl: 'Dialog z pytaniem sprawdzającym, czy rozpoznano słuchacza, i odpowiedzią o rozmiarze własnej grupy. Przypomnienie łącznika eres z dziewiątej sesji w pytaniu, odpowiedzią jest już somos przed liczbą dos.' },
    [
      { correct: 'Eres', prompt: T.eresQ, d1: { value: 'Es', trapType: 'grammar', reason: {
        ru: 'Es — про предмет или третье лицо. Прямой вопрос собеседнику — только Eres.',
        uk: 'Es — про предмет чи третю особу. Прямий запит до співрозмовника — тільки Eres.',
        en: 'Es is about a thing or a third person. A direct question to the listener needs only Eres.',
        'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. Uma pergunta direta ao interlocutor precisa só de Eres.',
        vi: 'Es nói về vật hay ngôi thứ ba. Câu hỏi trực tiếp với người nghe chỉ cần Eres.',
        id: 'Es tentang benda atau orang ketiga. Pertanyaan langsung kepada pendengar hanya perlu Eres.',
        tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciye doğrudan soru yalnızca Eres gerektirir.',
        pl: 'Es dotyczy rzeczy lub trzeciej osoby. Pytanie wprost do słuchacza wymaga tylko Eres.',
      }}, d2: { value: 'Somos', trapType: 'grammar', reason: {
        ru: 'Somos — про группу с говорящим. Вопрос об одном собеседнике — нужна Eres.',
        uk: 'Somos — про групу з мовцем. Питання про одного співрозмовника — потрібна Eres.',
        en: 'Somos is about a group with the speaker. A question about one listener needs Eres.',
        'pt-BR': 'Somos é sobre um grupo com quem fala. Uma pergunta sobre um único interlocutor precisa de Eres.',
        vi: 'Somos nói về nhóm có người nói. Câu hỏi về một người nghe cần Eres.',
        id: 'Somos tentang kelompok dengan penutur. Pertanyaan tentang satu pendengar memerlukan Eres.',
        tr: 'Somos konuşanı içeren bir grup hakkındadır. Tek bir dinleyici hakkında soru Eres gerektirir.',
        pl: 'Somos dotyczy grupy z mówiącym. Pytanie o jednego słuchacza wymaga Eres.',
      }} },
      { correct: 'tú', prompt: T.tuQ, d1: wrongWord('tú', 'dos', M.dos), d2: wrongWord('tú', 'así', M.asi) },
      { correct: 'somos', prompt: T.somosAnswerQ, ...somosVsSonOrEres('somos') },
      dosWord(numberQ('dos', 'dos'), 'tú', M.tu),
    ],
  ),
  'es-e01-s28-eres-tu-son-tres': d(
    { ru: 'Это ты? Их трое', uk: 'Це ти? Їх троє', en: 'Is it you? There are three of them', 'pt-BR': 'É você? São três', vi: 'Có phải là bạn không? Họ có ba người', id: 'Apakah ini kamu? Mereka bertiga', tr: 'Sen misin? Onlar üç kişi', pl: 'To ty? Jest ich troje' },
    { ru: 'Тот же вопрос собеседнику, но ответ уже про чужую группу без говорящего. Recall связки eres из девятой сессии, ответ — son перед числом tres, а не somos.', uk: 'Те саме питання співрозмовнику, але відповідь уже про чужу групу без мовця. Recall зв’язки eres із дев’ятої сесії, відповідь — son перед числом tres, а не somos.', en: 'The same question to the listener, but the answer is already about another group without the speaker. Recall of the linking word eres from the ninth session, the reply is son before the number tres, not somos.', 'pt-BR': 'A mesma pergunta ao interlocutor, mas a resposta já é sobre outro grupo sem quem fala. Recall da ligação eres da nona sessão, a resposta é son antes do número tres, não somos.', vi: 'Cùng câu hỏi với người nghe, nhưng câu trả lời đã là về nhóm khác không có người nói. Ôn lại từ nối eres từ bài thứ chín, câu trả lời là son trước con số tres, không phải somos.', id: 'Pertanyaan yang sama kepada pendengar, tetapi jawabannya sudah tentang kelompok lain tanpa penutur. Mengingat kembali kata penghubung eres dari sesi kesembilan, jawabannya adalah son sebelum angka tres, bukan somos.', tr: 'Dinleyiciye aynı soru, ama yanıt zaten konuşan olmayan başka bir grup hakkındadır. Dokuzuncu oturumdan bağlaç eres’in hatırlanması, yanıt somos değil, tres sayısından önce son’dur.', pl: 'To samo pytanie do słuchacza, ale odpowiedź dotyczy już innej grupy bez mówiącego. Przypomnienie łącznika eres z dziewiątej sesji, odpowiedzią jest son przed liczbą tres, nie somos.' },
    [
      { correct: 'Eres', prompt: T.eresQ, d1: { value: 'Es', trapType: 'grammar', reason: {
        ru: 'Es — про предмет или третье лицо. Прямой вопрос собеседнику — только Eres.',
        uk: 'Es — про предмет чи третю особу. Прямий запит до співрозмовника — тільки Eres.',
        en: 'Es is about a thing or a third person. A direct question to the listener needs only Eres.',
        'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. Uma pergunta direta ao interlocutor precisa só de Eres.',
        vi: 'Es nói về vật hay ngôi thứ ba. Câu hỏi trực tiếp với người nghe chỉ cần Eres.',
        id: 'Es tentang benda atau orang ketiga. Pertanyaan langsung kepada pendengar hanya perlu Eres.',
        tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciye doğrudan soru yalnızca Eres gerektirir.',
        pl: 'Es dotyczy rzeczy lub trzeciej osoby. Pytanie wprost do słuchacza wymaga tylko Eres.',
      }}, d2: { value: 'Son', trapType: 'grammar', reason: {
        ru: 'Son — про нескольких без говорящего. Вопрос об одном собеседнике — нужна Eres.',
        uk: 'Son — про кількох без мовця. Питання про одного співрозмовника — потрібна Eres.',
        en: 'Son is about several without the speaker. A question about one listener needs Eres.',
        'pt-BR': 'Son é sobre vários sem quem fala. Uma pergunta sobre um único interlocutor precisa de Eres.',
        vi: 'Son nói về nhiều mà không có người nói. Câu hỏi về một người nghe cần Eres.',
        id: 'Son tentang beberapa tanpa penutur. Pertanyaan tentang satu pendengar memerlukan Eres.',
        tr: 'Son konuşan olmadan birkaçı hakkındadır. Tek bir dinleyici hakkında soru Eres gerektirir.',
        pl: 'Son dotyczy kilku bez mówiącego. Pytanie o jednego słuchacza wymaga Eres.',
      }} },
      { correct: 'tú', prompt: T.tuQ, d1: wrongWord('tú', 'tres', M.tres), d2: wrongWord('tú', 'acuerdo', M.acuerdo) },
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosOrEs('son') },
      tresWord(numberQ('tres', 'tres'), 'ellos', M.ellos),
    ],
  ),
  'es-e01-s28-somos-dos-de-acuerdo': d(
    { ru: 'Нас двое, договорились', uk: 'Нас двоє, домовилися', en: 'There are two of us, agreed', 'pt-BR': 'Somos dois, combinado', vi: 'Chúng tôi có hai người, đồng ý', id: 'Kami berdua, sepakat', tr: 'İkimiziz, anlaştık', pl: 'Jest nas dwoje, zgoda' },
    { ru: 'Подтверждение размера своей группы с закреплением через уже знакомую формулу согласия. Somos dos называет число, de acuerdo закрепляет его как решённый вопрос — та же неизменяемая формула, что и в прежних сессиях.', uk: 'Підтвердження розміру своєї групи із закріпленням через уже знайому формулу згоди. Somos dos називає число, de acuerdo закріплює його як вирішене питання — та сама незмінна формула, що й у попередніх сесіях.', en: 'A confirmation of your own group\'s size, sealed with the already familiar agreement formula. Somos dos states the number, de acuerdo seals it as a settled matter — the same unchanging formula as in earlier sessions.', 'pt-BR': 'Uma confirmação do tamanho do próprio grupo, selada com a já conhecida fórmula de concordância. Somos dos indica o número, de acuerdo a sela como um assunto resolvido — a mesma fórmula inalterável das sessões anteriores.', vi: 'Xác nhận quy mô nhóm của mình, chốt lại bằng công thức đồng ý đã quen thuộc. Somos dos nói ra con số, de acuerdo chốt nó như một vấn đề đã giải quyết — cùng công thức không đổi như trong các bài trước.', id: 'Konfirmasi ukuran kelompok sendiri, disegel dengan rumus persetujuan yang sudah dikenal. Somos dos menyatakan angka, de acuerdo menyegelnya sebagai hal yang sudah diputuskan — rumus yang sama tidak berubah seperti pada sesi sebelumnya.', tr: 'Kendi grubunun büyüklüğünün, zaten tanıdık olan onay formülüyle mühürlenmiş bir onayı. Somos dos sayıyı belirtir, de acuerdo onu çözülmüş bir mesele olarak mühürler — önceki oturumlardaki aynı değişmeyen formül.', pl: 'Potwierdzenie rozmiaru własnej grupy, przypieczętowane już znaną formułą zgody. Somos dos podaje liczbę, de acuerdo przypieczętowuje ją jako rozstrzygniętą sprawę — ta sama niezmienna formuła co w poprzednich sesjach.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrEres('Somos') },
      dosWord(numberQ('dos', 'dos'), 'de', M.de),
      deWord,
      acuerdoWord,
    ],
  ),
  'es-e01-s28-no-somos-tres-somos-dos': d(
    { ru: 'Нас не трое, нас двое', uk: 'Нас не троє, нас двоє', en: 'There are not three of us, there are two of us', 'pt-BR': 'Não somos três, somos dois', vi: 'Chúng tôi không có ba người, chúng tôi có hai người', id: 'Kami tidak bertiga, kami berdua', tr: 'Üçümüz değiliz, ikimiziz', pl: 'Nie jest nas troje, jest nas dwoje' },
    { ru: 'Двойная поправка: сначала отрицается неверное число, затем сразу называется верное. No встаёт перед первой связкой, обе связки остаются somos — группа своя, меняется только число рядом с ней.', uk: 'Подвійна поправка: спершу заперечується невірне число, потім одразу називається правильне. No стає перед першою зв’язкою, обидві зв’язки лишаються somos — група своя, змінюється лише число поруч із нею.', en: 'A double correction: first the wrong number is negated, then the right one is stated right away. No comes before the first linking word, both linking words remain somos — it is your own group, only the number next to it changes.', 'pt-BR': 'Uma correção dupla: primeiro nega-se o número errado, depois indica-se logo o certo. No vem antes da primeira ligação, ambas as ligações permanecem somos — o grupo é o próprio, só o número ao lado muda.', vi: 'Sửa chữa kép: đầu tiên phủ định con số sai, sau đó nói ngay con số đúng. No đứng trước từ nối đầu tiên, cả hai từ nối vẫn là somos — nhóm là của mình, chỉ có con số bên cạnh thay đổi.', id: 'Koreksi ganda: pertama angka yang salah dinegasikan, lalu angka yang benar langsung disebutkan. No berada sebelum kata penghubung pertama, kedua kata penghubung tetap somos — kelompoknya milik sendiri, hanya angka di sampingnya yang berubah.', tr: 'Çift düzeltme: önce yanlış sayı olumsuzlanır, sonra hemen doğrusu söylenir. No ilk bağlaçtan önce gelir, her iki bağlaç da somos olarak kalır — grup kendi grubudur, yalnızca yanındaki sayı değişir.', pl: 'Podwójna poprawka: najpierw zaprzecza się błędnej liczbie, potem od razu podaje się właściwą. No stoi przed pierwszym łącznikiem, oba łączniki pozostają somos — grupa jest własna, zmienia się tylko liczba obok niego.' },
    [
      negationWord,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrEres('somos') },
      tresWord(numberQ('tres', 'tres'), 'verdad', M.verdad),
      { correct: 'somos', prompt: T.somosAnswerQ, ...somosVsSonOrEres('somos') },
      dosWord(numberQ('dos', 'dos'), 'así', M.asi),
    ],
  ),
  'es-e01-s28-son-tres-de-acuerdo': d(
    { ru: 'Их трое, договорились', uk: 'Їх троє, домовилися', en: 'There are three of them, agreed', 'pt-BR': 'São três, combinado', vi: 'Họ có ba người, đồng ý', id: 'Mereka bertiga, sepakat', tr: 'Onlar üç kişi, anlaştık', pl: 'Jest ich troje, zgoda' },
    { ru: 'Подтверждение размера чужой группы с закреплением через уже знакомую формулу согласия — зеркально фразе про свою группу, но здесь без говорящего внутри. Son tres называет число, de acuerdo закрепляет его как решённый вопрос.', uk: 'Підтвердження розміру чужої групи із закріпленням через уже знайому формулу згоди — дзеркально фразі про свою групу, але тут без мовця всередині. Son tres називає число, de acuerdo закріплює його як вирішене питання.', en: 'A confirmation of another group\'s size, sealed with the already familiar agreement formula — a mirror of the phrase about your own group, but without the speaker inside here. Son tres states the number, de acuerdo seals it as a settled matter.', 'pt-BR': 'Uma confirmação do tamanho de outro grupo, selada com a já conhecida fórmula de concordância — um espelho da frase sobre o próprio grupo, mas aqui sem quem fala dentro. Son tres indica o número, de acuerdo a sela como um assunto resolvido.', vi: 'Xác nhận quy mô của nhóm khác, chốt lại bằng công thức đồng ý đã quen thuộc — đối xứng với câu về nhóm của mình, nhưng ở đây không có người nói ở trong. Son tres nói ra con số, de acuerdo chốt nó như một vấn đề đã giải quyết.', id: 'Konfirmasi ukuran kelompok lain, disegel dengan rumus persetujuan yang sudah dikenal — cerminan dari frasa tentang kelompok sendiri, tetapi di sini tanpa penutur di dalamnya. Son tres menyatakan angka, de acuerdo menyegelnya sebagai hal yang sudah diputuskan.', tr: 'Başka bir grubun büyüklüğünün, zaten tanıdık olan onay formülüyle mühürlenmiş bir onayı — kendi grubu hakkındaki ifadenin bir yansıması, ama burada içinde konuşan olmadan. Son tres sayıyı belirtir, de acuerdo onu çözülmüş bir mesele olarak mühürler.', pl: 'Potwierdzenie rozmiaru innej grupy, przypieczętowane już znaną formułą zgody — lustrzane odbicie frazy o własnej grupie, ale tutaj bez mówiącego w środku. Son tres podaje liczbę, de acuerdo przypieczętowuje ją jako rozstrzygniętą sprawę.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      tresWord(numberQ('tres', 'tres'), 'de', M.de),
      deWord,
      { correct: 'acuerdo', prompt: { ru: 'Какое слово заканчивает формулу согласия?', uk: 'Яке слово завершує формулу згоди?', en: 'Which word finishes the agreement formula?', 'pt-BR': 'Qual palavra termina a fórmula de concordância?', vi: 'Từ nào kết thúc công thức đồng ý?', id: 'Kata mana yang mengakhiri rumus persetujuan?', tr: 'Onay formülünü hangi kelime tamamlar?', pl: 'Jakie słowo kończy formułę zgody?' }, d1: wrongWord('acuerdo', 'caro', M.caro), d2: wrongWord('acuerdo', 'importante', { ru: '«важно»', uk: '«важливо»', en: '"important"', 'pt-BR': '"importante"', vi: '"quan trọng"', id: '"penting"', tr: '"önemli"', pl: '„ważne”' }) },
    ],
  ),
});
