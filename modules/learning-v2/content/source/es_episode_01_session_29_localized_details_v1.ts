import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для 15
// фраз сессии 29 на восьми объяснительных локалях (без 'es'). Фабрика d()
// скопирована по прецеденту сессий 17/25/27/28
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
  noQ: { ru: 'Каким словом начать отрицание?', uk: 'Яким словом почати заперечення?', en: 'Which word starts the negation?', 'pt-BR': 'Qual palavra inicia a negação?', vi: 'Từ nào bắt đầu lời phủ định?', id: 'Kata mana yang memulai negasi?', tr: 'Olumsuzlama hangi kelimeyle başlar?', pl: 'Jakim słowem zacząć przeczenie?' },
  noSecondQ: { ru: 'Каким словом отрицать вторую связку во фразе?', uk: 'Яким словом заперечити другу зв’язку у фразі?', en: 'Which word negates the second linking word in the phrase?', 'pt-BR': 'Qual palavra nega a segunda ligação na frase?', vi: 'Từ nào phủ định từ nối thứ hai trong câu?', id: 'Kata mana yang menegasikan kata penghubung kedua dalam frasa?', tr: 'İfadedeki ikinci bağlacı hangi kelime olumsuzlar?', pl: 'Jakie słowo zaprzecza drugiemu łącznikowi we frazie?' },
  noReactionQ: { ru: 'Каким коротким словом подтвердить отказ?', uk: 'Яким коротким словом підтвердити відмову?', en: 'Which short word confirms the refusal?', 'pt-BR': 'Qual palavra curta confirma a recusa?', vi: 'Từ ngắn nào xác nhận lời từ chối?', id: 'Kata pendek mana yang menegaskan penolakan?', tr: 'Reddi hangi kısa kelime onaylar?', pl: 'Jakie krótkie słowo potwierdza odmowę?' },
  somosQ: { ru: 'Какая связка нужна для группы, включая говорящего?', uk: 'Яка зв’язка потрібна для групи, включно з мовцем?', en: 'Which linking word fits a group that includes the speaker?', 'pt-BR': 'Qual ligação cabe a um grupo que inclui quem fala?', vi: 'Từ nối nào phù hợp với nhóm gồm cả người nói?', id: 'Kata penghubung mana yang cocok untuk kelompok yang mencakup penutur?', tr: 'Konuşanı da içeren bir grup için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do grupy, w tym do mówiącego?' },
  somosLowerQ: { ru: 'Какая связка нужна после No для группы, включая говорящего?', uk: 'Яка зв’язка потрібна після No для групи, включно з мовцем?', en: 'Which linking word is needed after No for a group that includes the speaker?', 'pt-BR': 'Qual ligação é necessária depois de No para um grupo que inclui quem fala?', vi: 'Từ nối nào cần sau No cho nhóm gồm cả người nói?', id: 'Kata penghubung mana yang diperlukan setelah No untuk kelompok yang mencakup penutur?', tr: 'Konuşanı da içeren bir grup için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No dla grupy, w tym mówiącego?' },
  sonQ: { ru: 'Какая связка нужна для группы БЕЗ говорящего внутри?', uk: 'Яка зв’язка потрібна для групи БЕЗ мовця всередині?', en: 'Which linking word fits a group WITHOUT the speaker inside?', 'pt-BR': 'Qual ligação cabe a um grupo SEM quem fala dentro?', vi: 'Từ nối nào phù hợp với nhóm KHÔNG có người nói ở trong?', id: 'Kata penghubung mana yang cocok untuk kelompok TANPA penutur di dalamnya?', tr: 'İçinde konuşan OLMAYAN bir grup için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do grupy BEZ mówiącego w środku?' },
  sonLowerQ: { ru: 'Какая связка нужна после No для группы без говорящего?', uk: 'Яка зв’язка потрібна після No для групи без мовця?', en: 'Which linking word is needed after No for a group without the speaker?', 'pt-BR': 'Qual ligação é necessária depois de No para um grupo sem quem fala?', vi: 'Từ nối nào cần sau No cho nhóm không có người nói?', id: 'Kata penghubung mana yang diperlukan setelah No untuk kelompok tanpa penutur?', tr: 'Konuşan olmayan bir grup için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No dla grupy bez mówiącego?' },
  sonAnswerQ: { ru: 'Какой связкой ответить про другую группу без говорящего?', uk: 'Якою зв’язкою відповісти про іншу групу без мовця?', en: 'Which linking word answers about another group without the speaker?', 'pt-BR': 'Qual ligação responde sobre outro grupo sem quem fala?', vi: 'Từ nối nào trả lời về nhóm khác không có người nói?', id: 'Kata penghubung mana yang menjawab tentang kelompok lain tanpa penutur?', tr: 'Konuşan olmayan başka bir grup hakkında hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada o innej grupie bez mówiącego?' },
} as const;

function genderNumberPrompt(word: string, masc: boolean): Record<LocaleWithoutEs, string> {
  return masc
    ? { ru: `Какой признак нужен по умолчанию, для группы мужского рода: ${word}?`, uk: `Яка ознака потрібна за замовчуванням, для групи чоловічого роду: ${word}?`, en: `Which quality is needed by default, for a masculine group: ${word}?`, 'pt-BR': `Qual qualidade é necessária por padrão, para um grupo masculino: ${word}?`, vi: `Đặc điểm nào cần theo mặc định, cho nhóm giống đực: ${word}?`, id: `Sifat mana yang diperlukan secara default, untuk kelompok maskulin: ${word}?`, tr: `Varsayılan olarak, eril bir grup için hangi nitelik gerekir: ${word}?`, pl: `Jaka cecha jest potrzebna domyślnie, dla grupy rodzaju męskiego: ${word}?` }
    : { ru: `Какой признак нужен для группы женского рода: ${word}?`, uk: `Яка ознака потрібна для групи жіночого роду: ${word}?`, en: `Which quality is needed for a feminine group: ${word}?`, 'pt-BR': `Qual qualidade é necessária para um grupo feminino: ${word}?`, vi: `Đặc điểm nào cần cho nhóm giống cái: ${word}?`, id: `Sifat mana yang diperlukan untuk kelompok feminin: ${word}?`, tr: `Dişil bir grup için hangi nitelik gerekir: ${word}?`, pl: `Jaka cecha jest potrzebna dla grupy rodzaju żeńskiego: ${word}?` };
}

function genderMismatchPlural(correct: string, wrong: string, correctIsMasc: boolean): Reasoned {
  const wrongEnding = correctIsMasc ? '-as' : '-os';
  const correctEnding = correctIsMasc ? '-os' : '-as';
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма ${correctIsMasc ? 'женского' : 'мужского'} рода множественного числа, с ${wrongEnding}. По умолчанию нужна форма на ${correctEnding}: ${correct}.`,
    uk: `${wrong} — форма ${correctIsMasc ? 'жіночого' : 'чоловічого'} роду множини, з ${wrongEnding}. За замовчуванням потрібна форма на ${correctEnding}: ${correct}.`,
    en: `${wrong} is the ${correctIsMasc ? 'feminine' : 'masculine'} plural form, ending in ${wrongEnding}. By default the ${correctEnding} form is needed: ${correct}.`,
    'pt-BR': `${wrong} é a forma plural ${correctIsMasc ? 'feminina' : 'masculina'}, terminada em ${wrongEnding}. Por padrão precisa da forma em ${correctEnding}: ${correct}.`,
    vi: `${wrong} là dạng số nhiều ${correctIsMasc ? 'giống cái' : 'giống đực'}, kết thúc bằng ${wrongEnding}. Theo mặc định cần dạng ${correctEnding}: ${correct}.`,
    id: `${wrong} adalah bentuk jamak ${correctIsMasc ? 'feminin' : 'maskulin'}, berakhiran ${wrongEnding}. Secara default memerlukan bentuk ${correctEnding}: ${correct}.`,
    tr: `${wrong}, ${wrongEnding} ile biten ${correctIsMasc ? 'dişil' : 'eril'} çoğul biçimdir. Varsayılan olarak ${correctEnding} biçimi gerekir: ${correct}.`,
    pl: `${wrong} to forma ${correctIsMasc ? 'żeńska' : 'męska'} liczby mnogiej, zakończona na ${wrongEnding}. Domyślnie wymagana jest forma na ${correctEnding}: ${correct}.`,
  }};
}

function genderMismatchPluralToFem(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: ${correct}.`,
    uk: `${wrong} — форма чоловічого роду множини. Для групи жіночого роду потрібна форма на -as: ${correct}.`,
    en: `${wrong} is the masculine plural form. A feminine group needs the -as form: ${correct}.`,
    'pt-BR': `${wrong} é a forma plural masculina. Um grupo feminino precisa da forma em -as: ${correct}.`,
    vi: `${wrong} là dạng số nhiều giống đực. Nhóm giống cái cần dạng -as: ${correct}.`,
    id: `${wrong} adalah bentuk jamak maskulin. Kelompok feminin memerlukan bentuk -as: ${correct}.`,
    tr: `${wrong} eril çoğul biçimdir. Dişil bir grup -as biçimini gerektirir: ${correct}.`,
    pl: `${wrong} to forma męska liczby mnogiej. Grupa rodzaju żeńskiego wymaga formy na -as: ${correct}.`,
  }};
}

function numberMismatchToPlural(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма единственного числа. Про группу нужна форма множественного числа: ${correct}.`,
    uk: `${wrong} — форма однини. Про групу потрібна форма множини: ${correct}.`,
    en: `${wrong} is the singular form. Talking about a group needs the plural form: ${correct}.`,
    'pt-BR': `${wrong} é a forma singular. Falando de um grupo precisa da forma plural: ${correct}.`,
    vi: `${wrong} là dạng số ít. Nói về một nhóm cần dạng số nhiều: ${correct}.`,
    id: `${wrong} adalah bentuk tunggal. Berbicara tentang kelompok memerlukan bentuk jamak: ${correct}.`,
    tr: `${wrong} tekil biçimdir. Bir grup hakkında konuşmak çoğul biçim gerektirir: ${correct}.`,
    pl: `${wrong} to forma pojedyncza. Mówienie o grupie wymaga formy mnogiej: ${correct}.`,
  }};
}

function accentTrapPlural(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'orthographic', reason: {
    ru: `${wrong} без тильды над ú звучал бы иначе. Нужна форма с тильдой: ${correct}.`,
    uk: `${wrong} без тильди над ú звучав би інакше. Потрібна форма з тильдою: ${correct}.`,
    en: `${wrong} without the tilde over ú would sound different. The needed form has the tilde: ${correct}.`,
    'pt-BR': `${wrong} sem o til sobre ú soaria diferente. A forma necessária tem o til: ${correct}.`,
    vi: `${wrong} không có dấu ngã trên ú sẽ nghe khác. Dạng cần có dấu ngã: ${correct}.`,
    id: `${wrong} tanpa tilde di atas ú akan terdengar berbeda. Bentuk yang diperlukan memiliki tilde: ${correct}.`,
    tr: `${wrong}, ú üzerinde tilde olmadan farklı duyulurdu. Gereken biçim tilde ile: ${correct}.`,
    pl: `${wrong} bez tyldy nad ú brzmiałoby inaczej. Potrzebna jest forma z tyldą: ${correct}.`,
  }};
}

// зачем centered on person-shift (не number-shift): somos отмечена
// distractor'ом number_mismatch против son (то же лицо, другое число — тот
// же приём, что и в сессиях 25/26/27/28) и agreement_person_mismatch против
// son/eres (другое лицо) — прецедент somosVsSoyOrSon из сессии 25 и
// sonVsEsOrSomos из сессии 27, здесь применённый под негацией.
function somosVsSonOrSoy(target: 'Somos' | 'somos', altSecond: 'Soy' | 'soy' | 'Eres' | 'eres'): { d1: Reasoned; d2: Reasoned } {
  const sonWord = target === 'Somos' ? 'Son' : 'son';
  const isEres = altSecond === 'Eres' || altSecond === 'eres';
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
    d2: isEres
      ? { value: altSecond, trapType: 'grammar', reason: {
          ru: `${altSecond} — обращение к одному собеседнику или собеседнице. Про группу, включая говорящего, — ${target}.`,
          uk: `${altSecond} — звернення до одного співрозмовника чи співрозмовниці. Про групу, включно з мовцем, — ${target}.`,
          en: `${altSecond} addresses one listener directly. A group that includes the speaker needs ${target}.`,
          'pt-BR': `${altSecond} fala com um interlocutor diretamente. Um grupo que inclui quem fala precisa de ${target}.`,
          vi: `${altSecond} nói trực tiếp với một người nghe. Nhóm gồm cả người nói cần ${target}.`,
          id: `${altSecond} berbicara langsung dengan satu pendengar. Kelompok yang mencakup penutur perlu ${target}.`,
          tr: `${altSecond} doğrudan bir dinleyiciye hitap eder. Konuşanı da içeren bir grup ${target} gerektirir.`,
          pl: `${altSecond} zwraca się bezpośrednio do jednego słuchacza. Grupa obejmująca mówiącego wymaga ${target}.`,
        }}
      : { value: altSecond, trapType: 'grammar', reason: {
          ru: `${altSecond} — только о себе одном. Про группу, включая говорящего, — ${target}.`,
          uk: `${altSecond} — тільки про себе одного. Про групу, включно з мовцем, — ${target}.`,
          en: `${altSecond} is only about the speaker alone. A group that includes the speaker needs ${target}.`,
          'pt-BR': `${altSecond} é só sobre quem fala sozinho. Um grupo que inclui quem fala precisa de ${target}.`,
          vi: `${altSecond} chỉ nói về một mình người nói. Nhóm gồm cả người nói cần ${target}.`,
          id: `${altSecond} hanya tentang penutur sendirian. Kelompok yang mencakup penutur perlu ${target}.`,
          tr: `${altSecond} yalnızca konuşanın kendisi hakkındadır. Konuşanı da içeren bir grup ${target} gerektirir.`,
          pl: `${altSecond} dotyczy tylko samego mówiącego. Grupa obejmująca mówiącego wymaga ${target}.`,
        }},
  };
}

function sonVsSomosOrEs(target: 'Son' | 'son'): { d1: Reasoned; d2: Reasoned } {
  const somosWord = target === 'Son' ? 'Somos' : 'somos';
  const esWord = target === 'Son' ? 'Es' : 'es';
  return {
    d1: { value: somosWord, trapType: 'grammar', reason: {
      ru: `${somosWord} включает говорящего в группу. Про «них» без говорящего внутри — ${target}.`,
      uk: `${somosWord} включає мовця в групу. Про «них» без мовця всередині — ${target}.`,
      en: `${somosWord} includes the speaker in the group. "They" without the speaker inside need ${target}.`,
      'pt-BR': `${somosWord} inclui quem fala no grupo. "Eles" sem quem fala dentro precisam de ${target}.`,
      vi: `${somosWord} bao gồm người nói trong nhóm. "Họ" mà không có người nói ở trong cần ${target}.`,
      id: `${somosWord} mencakup penutur dalam kelompok. "Mereka" tanpa penutur di dalamnya perlu ${target}.`,
      tr: `${somosWord}, konuşanı gruba dahil eder. İçinde konuşan olmayan "onlar" ${target} gerektirir.`,
      pl: `${somosWord} obejmuje mówiącego w grupie. „Oni” bez mówiącego w środku potrzebują ${target}.`,
    }},
    d2: { value: esWord, trapType: 'grammar', reason: {
      ru: `${esWord} — только об одном. Про несколько человек или вещей — ${target}.`,
      uk: `${esWord} — тільки про одного. Про кількох людей чи речей — ${target}.`,
      en: `${esWord} is only about one. Several people or things need ${target}.`,
      'pt-BR': `${esWord} é só sobre um. Várias pessoas ou coisas precisam de ${target}.`,
      vi: `${esWord} chỉ nói về một người hay vật. Nhiều người hay vật cần ${target}.`,
      id: `${esWord} hanya tentang satu orang atau benda. Beberapa orang atau benda perlu ${target}.`,
      tr: `${esWord} yalnızca bir kişi ya da şey hakkındadır. Birkaç kişi ya da şey ${target} gerektirir.`,
      pl: `${esWord} dotyczy tylko jednej osoby lub rzeczy. Kilka osób lub rzeczy potrzebuje ${target}.`,
    }},
  };
}

const negationWordNada: WordSpec = {
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

const negationWordNunca: WordSpec = {
  correct: 'No',
  prompt: T.noQ,
  d1: { value: 'Nunca', trapType: 'semantic_neighbor', reason: {
    ru: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.',
    uk: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — No.',
    en: 'Nunca means "never", about frequency in time. Simple negation needs No.',
    'pt-BR': 'Nunca significa "nunca", sobre frequência no tempo. Negação simples precisa de No.',
    vi: 'Nunca nghĩa là "không bao giờ", về tần suất thời gian. Phủ định đơn giản cần No.',
    id: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Negasi sederhana perlu No.',
    tr: 'Nunca "asla" demektir, zaman sıklığı hakkındadır. Basit olumsuzlama No gerektirir.',
    pl: 'Nunca znaczy „nigdy”, dotyczy częstotliwości w czasie. Proste przeczenie wymaga No.',
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

const noLowerWord: WordSpec = {
  correct: 'no',
  prompt: T.noSecondQ,
  d1: { value: 'nada', trapType: 'semantic_neighbor', reason: {
    ru: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.',
    uk: 'Nada — «нічого», окреме слово-предмет. Заперечення зв’язки — no.',
    en: 'Nada means "nothing", a separate word for a thing. Negating the linking word needs no.',
    'pt-BR': 'Nada significa "nada", uma palavra separada para uma coisa. Negar a ligação precisa de no.',
    vi: 'Nada nghĩa là "không có gì", một từ riêng chỉ vật. Phủ định từ nối cần no.',
    id: 'Nada berarti "tidak ada apa-apa", kata terpisah untuk benda. Menegasikan kata penghubung perlu no.',
    tr: 'Nada "hiçbir şey" demektir, bir şey için ayrı bir kelimedir. Bağlacı olumsuzlamak no gerektirir.',
    pl: 'Nada znaczy „nic”, osobne słowo oznaczające rzecz. Zaprzeczenie łącznika wymaga no.',
  }},
  d2: { value: 'non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется no.',
    uk: 'Non — не іспанське слово. В іспанській заперечення пишеться no.',
    en: 'Non is not a Spanish word. Spanish spells the negation no.',
    'pt-BR': 'Non não é uma palavra espanhola. Em espanhol a negação se escreve no.',
    vi: 'Non không phải là từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha phủ định viết là no.',
    id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol negasi ditulis no.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama no olarak yazılır.',
    pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie zapisuje się no.',
  }},
};

const noLowerWordNunca: WordSpec = {
  correct: 'no',
  prompt: T.noSecondQ,
  d1: { value: 'nunca', trapType: 'semantic_neighbor', reason: {
    ru: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.',
    uk: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — no.',
    en: 'Nunca means "never", about frequency in time. Simple negation needs no.',
    'pt-BR': 'Nunca significa "nunca", sobre frequência no tempo. Negação simples precisa de no.',
    vi: 'Nunca nghĩa là "không bao giờ", về tần suất thời gian. Phủ định đơn giản cần no.',
    id: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Negasi sederhana perlu no.',
    tr: 'Nunca "asla" demektir, zaman sıklığı hakkındadır. Basit olumsuzlama no gerektirir.',
    pl: 'Nunca znaczy „nigdy”, dotyczy częstotliwości w czasie. Proste przeczenie wymaga no.',
  }},
  d2: { value: 'non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется no.',
    uk: 'Non — не іспанське слово. В іспанській заперечення пишеться no.',
    en: 'Non is not a Spanish word. Spanish spells the negation no.',
    'pt-BR': 'Non não é uma palavra espanhola. Em espanhol a negação se escreve no.',
    vi: 'Non không phải là từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha phủ định viết là no.',
    id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol negasi ditulis no.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama no olarak yazılır.',
    pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie zapisuje się no.',
  }},
};

const noReactionWord: WordSpec = {
  correct: 'no',
  prompt: T.noReactionQ,
  d1: { value: 'nada', trapType: 'semantic_neighbor', reason: {
    ru: 'Nada — «ничего», отдельное слово-предмет. Короткая реакция отказа — no.',
    uk: 'Nada — «нічого», окреме слово-предмет. Коротка реакція відмови — no.',
    en: 'Nada means "nothing", a separate word for a thing. The short refusal reaction is no.',
    'pt-BR': 'Nada significa "nada", uma palavra separada para uma coisa. A reação curta de recusa é no.',
    vi: 'Nada nghĩa là "không có gì", một từ riêng chỉ vật. Phản ứng từ chối ngắn là no.',
    id: 'Nada berarti "tidak ada apa-apa", kata terpisah untuk benda. Reaksi penolakan singkat adalah no.',
    tr: 'Nada "hiçbir şey" demektir, bir şey için ayrı bir kelimedir. Kısa ret tepkisi no’dur.',
    pl: 'Nada znaczy „nic”, osobne słowo oznaczające rzecz. Krótka reakcja odmowy to no.',
  }},
  d2: { value: 'non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется no.',
    uk: 'Non — не іспанське слово. В іспанській заперечення пишеться no.',
    en: 'Non is not a Spanish word. Spanish spells the negation no.',
    'pt-BR': 'Non não é uma palavra espanhola. Em espanhol a negação se escreve no.',
    vi: 'Non không phải là từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha phủ định viết là no.',
    id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol negasi ditulis no.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama no olarak yazılır.',
    pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie zapisuje się no.',
  }},
};

const VERDAD_MEANING = { ru: '«правда» (подтверждение факта)', uk: '«правда» (підтвердження факту)', en: '"truth" (confirming a fact)', 'pt-BR': '"verdade" (confirmando um fato)', vi: '"sự thật" (xác nhận sự thật)', id: '"kebenaran" (mengonfirmasi fakta)', tr: '"gerçek" (bir gerçeği onaylamak)', pl: '„prawda” (potwierdzenie faktu)' } as const;
const IGUAL_MEANING = { ru: '«всё равно» (безразличие)', uk: '«байдуже» (байдужість)', en: '"indifferent" (does not change things)', 'pt-BR': '"tanto faz" (indiferença)', vi: '"thờ ơ" (không thay đổi gì)', id: '"tidak peduli" (ketidakpedulian)', tr: '"fark etmez" (kayıtsızlık)', pl: '„wszystko jedno” (obojętność)' } as const;

const verdadWord: WordSpec = {
  correct: 'verdad',
  prompt: { ru: 'Каким словом подтвердить сказанное?', uk: 'Яким словом підтвердити сказане?', en: 'Which word confirms what was said?', 'pt-BR': 'Qual palavra confirma o que foi dito?', vi: 'Từ nào xác nhận điều đã nói?', id: 'Kata mana yang mengonfirmasi apa yang dikatakan?', tr: 'Söyleneni hangi kelime doğrular?', pl: 'Jakie słowo potwierdza to, co powiedziano?' },
  d1: { value: 'acuerdo', trapType: 'semantic_neighbor', reason: {
    ru: 'Acuerdo — про согласие с чужим мнением, а не короткое подтверждение вслед за отказом. Нужно verdad.',
    uk: 'Acuerdo — про згоду з чужою думкою, а не коротке підтвердження після відмови. Потрібно verdad.',
    en: 'Acuerdo is about agreeing with someone\'s opinion, not the short confirmation after a refusal. You need verdad.',
    'pt-BR': 'Acuerdo é sobre concordar com a opinião de outra pessoa, não a confirmação curta depois de uma recusa. Precisa de verdad.',
    vi: 'Acuerdo là về việc đồng ý với ý kiến của người khác, không phải lời xác nhận ngắn sau khi từ chối. Cần verdad.',
    id: 'Acuerdo tentang menyetujui pendapat seseorang, bukan konfirmasi singkat setelah penolakan. Perlu verdad.',
    tr: 'Acuerdo, birinin görüşüne katılmakla ilgilidir, bir reddin ardından gelen kısa onay değildir. verdad gerekir.',
    pl: 'Acuerdo dotyczy zgody z czyimś zdaniem, nie krótkiego potwierdzenia po odmowie. Potrzebne jest verdad.',
  }},
  d2: { value: 'igual', trapType: 'semantic_neighbor', reason: {
    ru: 'Igual означает безразличие, а не подтверждение сказанного. Нужно verdad.',
    uk: 'Igual означає байдужість, а не підтвердження сказаного. Потрібно verdad.',
    en: 'Igual means indifference, not confirming what was said. You need verdad.',
    'pt-BR': 'Igual significa indiferença, não confirmar o que foi dito. Precisa de verdad.',
    vi: 'Igual nghĩa là thờ ơ, không phải xác nhận điều đã nói. Cần verdad.',
    id: 'Igual berarti ketidakpedulian, bukan mengonfirmasi apa yang dikatakan. Perlu verdad.',
    tr: 'Igual kayıtsızlık demektir, söyleneni doğrulamak değil. verdad gerekir.',
    pl: 'Igual znaczy obojętność, nie potwierdzenie tego, co powiedziano. Potrzebne jest verdad.',
  }},
};

export const ES_SESSION_29_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s29-no-somos-rapidos': d(
    { ru: 'Мы не быстрые', uk: 'Ми не швидкі', en: 'We are not fast', 'pt-BR': 'Não somos rápidos', vi: 'Chúng tôi không nhanh', id: 'Kami tidak cepat', tr: 'Biz hızlı değiliz', pl: 'Nie jesteśmy szybcy' },
    { ru: 'Отрицание темпа группы мужского рода или смешанной по умолчанию, включающей говорящего. No встаёт перед somos, признак сохраняет окончание множественного числа -os точно так же, как и в утвердительной форме.', uk: 'Заперечення темпу групи чоловічого роду чи змішаної за замовчуванням, що включає мовця. No стає перед somos, ознака зберігає закінчення множини -os точно так само, як і в стверджувальній формі.', en: 'This negates the pace of a masculine or default mixed group that includes the speaker. No comes before somos, and the quality keeps the plural ending -os exactly as in the affirmative form.', 'pt-BR': 'Isso nega o ritmo de um grupo masculino ou misto por padrão que inclui quem fala. No vem antes de somos, e a qualidade mantém a terminação plural -os exatamente como na forma afirmativa.', vi: 'Đây là phủ định tốc độ của nhóm giống đực hoặc hỗn hợp mặc định gồm cả người nói. No đứng trước somos, và đặc điểm giữ đuôi số nhiều -os y hệt như trong dạng khẳng định.', id: 'Ini menegasikan kecepatan kelompok maskulin atau campuran default yang mencakup penutur. No berada sebelum somos, dan sifat itu mempertahankan akhiran jamak -os persis seperti dalam bentuk afirmatif.', tr: 'Bu, konuşanı da içeren eril ya da varsayılan karma bir grubun hızını olumsuzlar. No, somos’tan önce gelir ve nitelik, olumlu biçimdeki gibi çoğul -os ekini korur.', pl: 'To zaprzecza tempu grupy rodzaju męskiego lub domyślnie mieszanej, obejmującej mówiącego. No stoi przed somos, a cecha zachowuje końcówkę liczby mnogiej -os dokładnie tak, jak w formie twierdzącej.' },
    [
      negationWordNada,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos', 'soy') },
      { correct: 'rápidos', prompt: genderNumberPrompt('rápidos', true), d1: numberMismatchToPlural('rápidos', 'rápido'), d2: genderMismatchPlural('rápidos', 'rápidas', false) },
    ],
  ),
  'es-e01-s29-no-somos-rapidas': d(
    { ru: 'Мы не быстрые (о группе женского рода)', uk: 'Ми не швидкі (про групу жіночого роду)', en: 'We are not fast (feminine group)', 'pt-BR': 'Não somos rápidas', vi: 'Chúng tôi không nhanh (nhóm giống cái)', id: 'Kami tidak cepat (kelompok feminin)', tr: 'Biz hızlı değiliz (dişil grup)', pl: 'Nie jesteśmy szybkie (grupa żeńska)' },
    { ru: 'Тот же отказ признать темп, но про группу женского рода — например, подруг вместе. No встаёт перед somos, признак сохраняет окончание -as, как и без отрицания.', uk: 'Та сама відмова визнати темп, але про групу жіночого роду — наприклад, подруг разом. No стає перед somos, ознака зберігає закінчення -as, як і без заперечення.', en: 'The same refusal to admit the pace, but for a feminine group — for example, friends together. No comes before somos, and the quality keeps the -as ending, as without negation.', 'pt-BR': 'A mesma recusa em admitir o ritmo, mas para um grupo feminino — por exemplo, amigas juntas. No vem antes de somos, e a qualidade mantém a terminação -as, como sem negação.', vi: 'Sự từ chối thừa nhận tốc độ tương tự, nhưng cho nhóm giống cái — ví dụ, những người bạn nữ cùng nhau. No đứng trước somos, và đặc điểm giữ đuôi -as, như khi không có phủ định.', id: 'Penolakan yang sama untuk mengakui kecepatan, tetapi untuk kelompok feminin — misalnya, teman-teman wanita bersama. No berada sebelum somos, dan sifat itu mempertahankan akhiran -as, seperti tanpa negasi.', tr: 'Hızı kabul etmeme durumu aynıdır, ama dişil bir grup için — örneğin birlikte olan kadın arkadaşlar. No, somos’tan önce gelir ve nitelik, olumsuzlama olmadığı gibi -as ekini korur.', pl: 'Taka sama odmowa uznania tempa, ale dla grupy żeńskiej — na przykład koleżanek razem. No stoi przed somos, a cecha zachowuje końcówkę -as, tak jak bez przeczenia.' },
    [
      negationWordNunca,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos', 'eres') },
      { correct: 'rápidas', prompt: genderNumberPrompt('rápidas', false), d1: genderMismatchPluralToFem('rápidas', 'rápidos'), d2: numberMismatchToPlural('rápidas', 'rápida') },
    ],
  ),
  'es-e01-s29-no-son-rapidos': d(
    { ru: 'Они не быстрые', uk: 'Вони не швидкі', en: 'They are not fast', 'pt-BR': 'Não são rápidos', vi: 'Họ không nhanh', id: 'Mereka tidak cepat', tr: 'Onlar hızlı değil', pl: 'Nie są szybcy' },
    { ru: 'Отрицание темпа группы мужского рода или смешанной по умолчанию, без говорящего внутри. No встаёт перед son, признак сохраняет -os, как и в утвердительной форме сессии про son.', uk: 'Заперечення темпу групи чоловічого роду чи змішаної за замовчуванням, без мовця всередині. No стає перед son, ознака зберігає -os, як і в стверджувальній формі сесії про son.', en: 'This negates the pace of a masculine or default mixed group without the speaker inside. No comes before son, and the quality keeps -os, as in the affirmative form of the son session.', 'pt-BR': 'Isso nega o ritmo de um grupo masculino ou misto por padrão sem quem fala dentro. No vem antes de son, e a qualidade mantém -os, como na forma afirmativa da sessão sobre son.', vi: 'Đây là phủ định tốc độ của nhóm giống đực hoặc hỗn hợp mặc định không có người nói ở trong. No đứng trước son, và đặc điểm giữ -os, như trong dạng khẳng định của buổi học về son.', id: 'Ini menegasikan kecepatan kelompok maskulin atau campuran default tanpa penutur di dalamnya. No berada sebelum son, dan sifat itu mempertahankan -os, seperti dalam bentuk afirmatif sesi tentang son.', tr: 'Bu, içinde konuşan olmayan eril ya da varsayılan karma bir grubun hızını olumsuzlar. No, son’dan önce gelir ve nitelik, son hakkındaki olumlu biçimdeki gibi -os’u korur.', pl: 'To zaprzecza tempu grupy rodzaju męskiego lub domyślnie mieszanej, bez mówiącego w środku. No stoi przed son, a cecha zachowuje -os, tak jak w formie twierdzącej z sesji o son.' },
    [
      negationWordNada,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsSomosOrEs('son') },
      { correct: 'rápidos', prompt: genderNumberPrompt('rápidos', true), d1: genderMismatchPlural('rápidos', 'rápidas', false), d2: numberMismatchToPlural('rápidos', 'rápido') },
    ],
  ),
  'es-e01-s29-no-son-rapidas': d(
    { ru: 'Они не быстрые (о группе женского рода)', uk: 'Вони не швидкі (про групу жіночого роду)', en: 'They are not fast (feminine group)', 'pt-BR': 'Não são rápidas', vi: 'Họ không nhanh (nhóm giống cái)', id: 'Mereka tidak cepat (kelompok feminin)', tr: 'Onlar hızlı değil (dişil grup)', pl: 'Nie są szybkie (grupa żeńska)' },
    { ru: 'Тот же отказ, но про группу женского рода без говорящего внутри. No перед son, признак сохраняет -as вне зависимости от отрицания.', uk: 'Та сама відмова, але про групу жіночого роду без мовця всередині. No перед son, ознака зберігає -as незалежно від заперечення.', en: 'The same refusal, but for a feminine group without the speaker inside. No before son, the quality keeps -as regardless of negation.', 'pt-BR': 'A mesma recusa, mas para um grupo feminino sem quem fala dentro. No antes de son, a qualidade mantém -as independentemente da negação.', vi: 'Sự từ chối tương tự, nhưng cho nhóm giống cái không có người nói ở trong. No trước son, đặc điểm giữ -as bất kể phủ định.', id: 'Penolakan yang sama, tetapi untuk kelompok feminin tanpa penutur di dalamnya. No sebelum son, sifat itu mempertahankan -as terlepas dari negasi.', tr: 'Aynı ret, ama içinde konuşan olmayan dişil bir grup için. Son’dan önce no, nitelik olumsuzlamadan bağımsız olarak -as’ı korur.', pl: 'Taka sama odmowa, ale dla grupy żeńskiej bez mówiącego w środku. No przed son, cecha zachowuje -as niezależnie od przeczenia.' },
    [
      negationWordNunca,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsSomosOrEs('son') },
      { correct: 'rápidas', prompt: genderNumberPrompt('rápidas', false), d1: genderMismatchPluralToFem('rápidas', 'rápidos'), d2: numberMismatchToPlural('rápidas', 'rápida') },
    ],
  ),
  'es-e01-s29-no-somos-bonitos': d(
    { ru: 'Мы не красивые', uk: 'Ми не гарні', en: 'We are not pretty', 'pt-BR': 'Não somos bonitos', vi: 'Chúng tôi không đẹp', id: 'Kami tidak cantik', tr: 'Biz güzel değiliz', pl: 'Nie jesteśmy przystojni' },
    { ru: 'Отрицание внешности группы мужского рода или смешанной по умолчанию, включающей говорящего. No встаёт перед somos, bonitos сохраняет окончание -os.', uk: 'Заперечення зовнішності групи чоловічого роду чи змішаної за замовчуванням, що включає мовця. No стає перед somos, bonitos зберігає закінчення -os.', en: 'This negates the appearance of a masculine or default mixed group that includes the speaker. No comes before somos, and bonitos keeps the -os ending.', 'pt-BR': 'Isso nega a aparência de um grupo masculino ou misto por padrão que inclui quem fala. No vem antes de somos, e bonitos mantém a terminação -os.', vi: 'Đây là phủ định vẻ ngoài của nhóm giống đực hoặc hỗn hợp mặc định gồm cả người nói. No đứng trước somos, và bonitos giữ đuôi -os.', id: 'Ini menegasikan penampilan kelompok maskulin atau campuran default yang mencakup penutur. No berada sebelum somos, dan bonitos mempertahankan akhiran -os.', tr: 'Bu, konuşanı da içeren eril ya da varsayılan karma bir grubun görünüşünü olumsuzlar. No, somos’tan önce gelir ve bonitos -os ekini korur.', pl: 'To zaprzecza wyglądowi grupy rodzaju męskiego lub domyślnie mieszanej, obejmującej mówiącego. No stoi przed somos, a bonitos zachowuje końcówkę -os.' },
    [
      negationWordNada,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos', 'soy') },
      { correct: 'bonitos', prompt: genderNumberPrompt('bonitos', true), d1: genderMismatchPlural('bonitos', 'bonitas', false), d2: numberMismatchToPlural('bonitos', 'bonito') },
    ],
  ),
  'es-e01-s29-no-somos-bonitas': d(
    { ru: 'Мы не красивые (о группе женского рода)', uk: 'Ми не гарні (про групу жіночого роду)', en: 'We are not pretty (feminine group)', 'pt-BR': 'Não somos bonitas', vi: 'Chúng tôi không đẹp (nhóm giống cái)', id: 'Kami tidak cantik (kelompok feminin)', tr: 'Biz güzel değiliz (dişil grup)', pl: 'Nie jesteśmy ładne (grupa żeńska)' },
    { ru: 'Та же отрицаемая оценка внешности, но про группу женского рода. No перед somos, bonitas сохраняет окончание -as.', uk: 'Та сама заперечувана оцінка зовнішності, але про групу жіночого роду. No перед somos, bonitas зберігає закінчення -as.', en: 'The same negated evaluation of appearance, but for a feminine group. No before somos, bonitas keeps the -as ending.', 'pt-BR': 'A mesma avaliação negada da aparência, mas para um grupo feminino. No antes de somos, bonitas mantém a terminação -as.', vi: 'Đánh giá vẻ ngoài bị phủ định tương tự, nhưng cho nhóm giống cái. No trước somos, bonitas giữ đuôi -as.', id: 'Penilaian penampilan yang dinegasikan yang sama, tetapi untuk kelompok feminin. No sebelum somos, bonitas mempertahankan akhiran -as.', tr: 'Aynı olumsuzlanmış görünüş değerlendirmesi, ama dişil bir grup için. Somos’tan önce no, bonitas -as ekini korur.', pl: 'Ta sama zanegowana ocena wyglądu, ale dla grupy żeńskiej. No przed somos, bonitas zachowuje końcówkę -as.' },
    [
      negationWordNunca,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos', 'eres') },
      { correct: 'bonitas', prompt: genderNumberPrompt('bonitas', false), d1: genderMismatchPluralToFem('bonitas', 'bonitos'), d2: numberMismatchToPlural('bonitas', 'bonita') },
    ],
  ),
  'es-e01-s29-no-son-bonitos': d(
    { ru: 'Они не красивые', uk: 'Вони не гарні', en: 'They are not pretty', 'pt-BR': 'Não são bonitos', vi: 'Họ không đẹp', id: 'Mereka tidak cantik', tr: 'Onlar güzel değil', pl: 'Nie są przystojni' },
    { ru: 'Отрицание внешности группы мужского рода или смешанной по умолчанию, без говорящего внутри. No встаёт перед son, bonitos сохраняет -os.', uk: 'Заперечення зовнішності групи чоловічого роду чи змішаної за замовчуванням, без мовця всередині. No стає перед son, bonitos зберігає -os.', en: 'This negates the appearance of a masculine or default mixed group without the speaker inside. No comes before son, and bonitos keeps -os.', 'pt-BR': 'Isso nega a aparência de um grupo masculino ou misto por padrão sem quem fala dentro. No vem antes de son, e bonitos mantém -os.', vi: 'Đây là phủ định vẻ ngoài của nhóm giống đực hoặc hỗn hợp mặc định không có người nói ở trong. No đứng trước son, và bonitos giữ -os.', id: 'Ini menegasikan penampilan kelompok maskulin atau campuran default tanpa penutur di dalamnya. No berada sebelum son, dan bonitos mempertahankan -os.', tr: 'Bu, içinde konuşan olmayan eril ya da varsayılan karma bir grubun görünüşünü olumsuzlar. No, son’dan önce gelir ve bonitos -os’u korur.', pl: 'To zaprzecza wyglądowi grupy rodzaju męskiego lub domyślnie mieszanej, bez mówiącego w środku. No stoi przed son, a bonitos zachowuje -os.' },
    [
      negationWordNada,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsSomosOrEs('son') },
      { correct: 'bonitos', prompt: genderNumberPrompt('bonitos', true), d1: genderMismatchPlural('bonitos', 'bonitas', false), d2: numberMismatchToPlural('bonitos', 'bonito') },
    ],
  ),
  'es-e01-s29-no-son-bonitas': d(
    { ru: 'Они не красивые (о группе женского рода)', uk: 'Вони не гарні (про групу жіночого роду)', en: 'They are not pretty (feminine group)', 'pt-BR': 'Não são bonitas', vi: 'Họ không đẹp (nhóm giống cái)', id: 'Mereka tidak cantik (kelompok feminin)', tr: 'Onlar güzel değil (dişil grup)', pl: 'Nie są ładne (grupa żeńska)' },
    { ru: 'Та же отрицаемая оценка, но про группу женского рода без говорящего внутри. No перед son, bonitas сохраняет -as.', uk: 'Та сама заперечувана оцінка, але про групу жіночого роду без мовця всередині. No перед son, bonitas зберігає -as.', en: 'The same negated evaluation, but for a feminine group without the speaker inside. No before son, bonitas keeps -as.', 'pt-BR': 'A mesma avaliação negada, mas para um grupo feminino sem quem fala dentro. No antes de son, bonitas mantém -as.', vi: 'Đánh giá bị phủ định tương tự, nhưng cho nhóm giống cái không có người nói ở trong. No trước son, bonitas giữ -as.', id: 'Penilaian yang dinegasikan yang sama, tetapi untuk kelompok feminin tanpa penutur di dalamnya. No sebelum son, bonitas mempertahankan -as.', tr: 'Aynı olumsuzlanmış değerlendirme, ama içinde konuşan olmayan dişil bir grup için. Son’dan önce no, bonitas -as’ı korur.', pl: 'Ta sama zanegowana ocena, ale dla grupy żeńskiej bez mówiącego w środku. No przed son, bonitas zachowuje -as.' },
    [
      negationWordNunca,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsSomosOrEs('son') },
      { correct: 'bonitas', prompt: genderNumberPrompt('bonitas', false), d1: genderMismatchPluralToFem('bonitas', 'bonitos'), d2: numberMismatchToPlural('bonitas', 'bonita') },
    ],
  ),
  'es-e01-s29-no-somos-unicos': d(
    { ru: 'Мы не единственные в своём роде', uk: 'Ми не єдині у своєму роді', en: 'We are not one of a kind', 'pt-BR': 'Não somos únicos', vi: 'Chúng tôi không phải là duy nhất', id: 'Kami tidak unik', tr: 'Biz eşsiz değiliz', pl: 'Nie jesteśmy wyjątkowi' },
    { ru: 'Скромное признание, что группа, включающая говорящего, не является чем-то неповторимым. No встаёт перед somos, тильда над ú и окончание -os остаются на месте.', uk: 'Скромне визнання, що група, яка включає мовця, не є чимось неповторним. No стає перед somos, тильда над ú і закінчення -os лишаються на місці.', en: 'A modest admission that the group including the speaker is not something unrepeatable. No comes before somos, the tilde over ú and the -os ending stay in place.', 'pt-BR': 'Um reconhecimento modesto de que o grupo que inclui quem fala não é algo único. No vem antes de somos, o til sobre ú e a terminação -os permanecem no lugar.', vi: 'Sự thừa nhận khiêm tốn rằng nhóm gồm cả người nói không phải là điều gì đó không thể lặp lại. No đứng trước somos, dấu ngã trên ú và đuôi -os vẫn giữ nguyên.', id: 'Pengakuan sederhana bahwa kelompok yang mencakup penutur bukanlah sesuatu yang tak tertandingi. No berada sebelum somos, tilde di atas ú dan akhiran -os tetap di tempatnya.', tr: 'Konuşanı da içeren grubun eşsiz bir şey olmadığına dair mütevazı bir itiraf. No, somos’tan önce gelir, ú üzerindeki tilde ve -os eki yerinde kalır.', pl: 'Skromne przyznanie, że grupa obejmująca mówiącego nie jest czymś niepowtarzalnym. No stoi przed somos, tylda nad ú i końcówka -os pozostają na miejscu.' },
    [
      negationWordNada,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos', 'soy') },
      { correct: 'únicos', prompt: genderNumberPrompt('únicos', true), d1: genderMismatchPlural('únicos', 'únicas', false), d2: accentTrapPlural('únicos', 'unicos') },
    ],
  ),
  'es-e01-s29-no-son-unicas': d(
    { ru: 'Они не единственные в своём роде (о группе женского рода)', uk: 'Вони не єдині у своєму роді (про групу жіночого роду)', en: 'They are not one of a kind (feminine group)', 'pt-BR': 'Não são únicas', vi: 'Họ không phải là duy nhất (nhóm giống cái)', id: 'Mereka tidak unik (kelompok feminin)', tr: 'Onlar eşsiz değil (dişil grup)', pl: 'Nie są wyjątkowe (grupa żeńska)' },
    { ru: 'Отрицание неповторимости группы женского рода без говорящего внутри — например, серийных изделий, ошибочно принятых за редкие. No перед son, únicas сохраняет тильду и окончание -as.', uk: 'Заперечення неповторності групи жіночого роду без мовця всередині — наприклад, серійних виробів, помилково прийнятих за рідкісні. No перед son, únicas зберігає тильду і закінчення -as.', en: 'This negates the uniqueness of a feminine group without the speaker inside — for example, mass-produced items mistaken for rare ones. No before son, únicas keeps the tilde and the -as ending.', 'pt-BR': 'Isso nega a singularidade de um grupo feminino sem quem fala dentro — por exemplo, itens de produção em série confundidos com raros. No antes de son, únicas mantém o til e a terminação -as.', vi: 'Đây là phủ định sự độc nhất của nhóm giống cái không có người nói ở trong — ví dụ, các món hàng sản xuất hàng loạt bị nhầm là hiếm. No trước son, únicas giữ dấu ngã và đuôi -as.', id: 'Ini menegasikan keunikan kelompok feminin tanpa penutur di dalamnya — misalnya, barang produksi massal yang dikira langka. No sebelum son, únicas mempertahankan tilde dan akhiran -as.', tr: 'Bu, içinde konuşan olmayan dişil bir grubun benzersizliğini olumsuzlar — örneğin nadir sanılan seri üretim eşyalar. Son’dan önce no, únicas tildeyi ve -as ekini korur.', pl: 'To zaprzecza niepowtarzalności grupy żeńskiej bez mówiącego w środku — na przykład produktów seryjnych mylnie uznanych za rzadkie. No przed son, únicas zachowuje tyldę i końcówkę -as.' },
    [
      negationWordNunca,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsSomosOrEs('son') },
      { correct: 'únicas', prompt: genderNumberPrompt('únicas', false), d1: genderMismatchPluralToFem('únicas', 'únicos'), d2: accentTrapPlural('únicas', 'unicas') },
    ],
  ),
  'es-e01-s29-no-somos-caros': d(
    { ru: 'Мы не дорогие', uk: 'Ми не дорогі', en: 'We are not expensive', 'pt-BR': 'Não somos caros', vi: 'Chúng tôi không đắt', id: 'Kami tidak mahal', tr: 'Biz pahalı değiliz', pl: 'Nie jesteśmy drodzy' },
    { ru: 'Так отвечают о цене услуг собственной группы — например, мастерской, которую сочли дорогой. No встаёт перед somos, caros сохраняет окончание -os.', uk: 'Так відповідають про ціну послуг власної групи — наприклад, майстерні, яку вважали дорогою. No стає перед somos, caros зберігає закінчення -os.', en: 'This is how you answer about the price of your own group\'s services — for example, a workshop deemed expensive. No comes before somos, caros keeps the -os ending.', 'pt-BR': 'É assim que se responde sobre o preço dos serviços do próprio grupo — por exemplo, uma oficina considerada cara. No vem antes de somos, caros mantém a terminação -os.', vi: 'Đây là cách trả lời về giá dịch vụ của nhóm mình — ví dụ, một xưởng bị coi là đắt. No đứng trước somos, caros giữ đuôi -os.', id: 'Beginilah cara menjawab tentang harga layanan kelompok sendiri — misalnya, bengkel yang dianggap mahal. No berada sebelum somos, caros mempertahankan akhiran -os.', tr: 'Kendi grubunuzun hizmetlerinin fiyatı hakkında böyle cevap verilir — örneğin pahalı bulunan bir atölye. No, somos’tan önce gelir, caros -os ekini korur.', pl: 'Tak odpowiada się o cenie usług własnej grupy — na przykład warsztatu uznanego za drogi. No stoi przed somos, caros zachowuje końcówkę -os.' },
    [
      negationWordNada,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos', 'soy') },
      { correct: 'caros', prompt: genderNumberPrompt('caros', true), d1: genderMismatchPlural('caros', 'caras', false), d2: numberMismatchToPlural('caros', 'caro') },
    ],
  ),
  'es-e01-s29-no-son-caras': d(
    { ru: 'Они не дорогие (о вещах женского рода)', uk: 'Вони не дорогі (про речі жіночого роду)', en: 'They are not expensive (feminine things)', 'pt-BR': 'Não são caras', vi: 'Chúng không đắt (đồ vật giống cái)', id: 'Mereka tidak mahal (benda feminin)', tr: 'Onlar pahalı değil (dişil eşyalar)', pl: 'Nie są drogie (rzeczy rodzaju żeńskiego)' },
    { ru: 'Возражение на оценку цены нескольких вещей женского рода — например, camisetas (футболок), которые сочли дорогими. No перед son, caras сохраняет окончание -as.', uk: 'Заперечення оцінки ціни кількох речей жіночого роду — наприклад, camisetas (футболок), які вважали дорогими. No перед son, caras зберігає закінчення -as.', en: 'This objects to the price evaluation of several feminine things — for example, camisetas (t-shirts) deemed expensive. No before son, caras keeps the -as ending.', 'pt-BR': 'Isso contesta a avaliação do preço de várias coisas femininas — por exemplo, camisetas consideradas caras. No antes de son, caras mantém a terminação -as.', vi: 'Đây là phản đối đánh giá giá của nhiều vật giống cái — ví dụ, camisetas (áo phông) bị coi là đắt. No trước son, caras giữ đuôi -as.', id: 'Ini menyanggah penilaian harga beberapa benda feminin — misalnya, camisetas (kaus) yang dianggap mahal. No sebelum son, caras mempertahankan akhiran -as.', tr: 'Bu, birkaç dişil eşyanın fiyat değerlendirmesine karşı çıkar — örneğin pahalı bulunan camisetas (tişörtler). Son’dan önce no, caras -as ekini korur.', pl: 'To sprzeciw wobec oceny ceny kilku rzeczy rodzaju żeńskiego — na przykład camisetas (koszulek) uznanych za drogie. No przed son, caras zachowuje końcówkę -as.' },
    [
      negationWordNunca,
      { correct: 'son', prompt: T.sonLowerQ, ...sonVsSomosOrEs('son') },
      { correct: 'caras', prompt: genderNumberPrompt('caras', false), d1: genderMismatchPluralToFem('caras', 'caros'), d2: numberMismatchToPlural('caras', 'cara') },
    ],
  ),
  'es-e01-s29-somos-rapidos-no-son-rapidos': d(
    { ru: 'Мы быстрые; они не быстрые', uk: 'Ми швидкі; вони не швидкі', en: 'We are fast; they are not fast', 'pt-BR': 'Somos rápidos; não são rápidos', vi: 'Chúng tôi nhanh; họ không nhanh', id: 'Kami cepat; mereka tidak cepat', tr: 'Biz hızlıyız; onlar hızlı değil', pl: 'Jesteśmy szybcy; nie są szybcy' },
    { ru: 'Диалог из утверждения о своей группе и отказа признать то же качество за другой группой. Recall утвердительной связки somos, ответ — no перед son, признак rápidos не меняется в обеих репликах.', uk: 'Діалог зі ствердження про свою групу і відмови визнати ту саму якість за іншою групою. Recall стверджувальної зв’язки somos, відповідь — no перед son, ознака rápidos не змінюється в обох репліках.', en: 'A dialogue: an affirmation about one\'s own group and a refusal to grant the same quality to another group. Recall of the affirmative linking word somos, the answer is no before son, and rápidos does not change in either line.', 'pt-BR': 'Um diálogo de afirmação sobre o próprio grupo e recusa de conceder a mesma qualidade a outro grupo. Recall da ligação afirmativa somos, a resposta é no antes de son, e rápidos não muda em nenhuma das falas.', vi: 'Một cuộc đối thoại: khẳng định về nhóm của mình và từ chối công nhận cùng phẩm chất đó cho nhóm khác. Nhắc lại từ nối khẳng định somos, câu trả lời là no trước son, và rápidos không đổi ở cả hai câu.', id: 'Sebuah dialog: penegasan tentang kelompok sendiri dan penolakan untuk memberikan sifat yang sama kepada kelompok lain. Mengingat kembali kata penghubung afirmatif somos, jawabannya adalah no sebelum son, dan rápidos tidak berubah di kedua baris.', tr: 'Bir diyalog: kendi grubu hakkında bir onaylama ve aynı niteliği başka bir gruba tanımayı reddetme. Olumlu bağlaç somos’un hatırlatılması, cevap son’dan önce no’dur ve rápidos her iki cümlede de değişmez.', pl: 'Dialog: potwierdzenie o własnej grupie i odmowa przyznania tej samej cechy innej grupie. Przypomnienie twierdzącego łącznika somos, odpowiedzią jest no przed son, a rápidos nie zmienia się w żadnej z kwestii.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrSoy('Somos', 'Soy') },
      { correct: 'rápidos', prompt: genderNumberPrompt('rápidos', true), d1: genderMismatchPlural('rápidos', 'rápidas', false), d2: numberMismatchToPlural('rápidos', 'rápido') },
      noLowerWord,
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosOrEs('son') },
      { correct: 'rápidos', prompt: genderNumberPrompt('rápidos', true), d1: genderMismatchPlural('rápidos', 'rápidas', false), d2: numberMismatchToPlural('rápidos', 'rápido') },
    ],
  ),
  'es-e01-s29-no-somos-bonitas-verdad-q': d(
    { ru: 'Мы не красивые? Нет, правда', uk: 'Ми не гарні? Ні, правда', en: 'Are we not pretty? No, truly', 'pt-BR': 'Não somos bonitas? Não, verdade', vi: 'Chúng tôi không đẹp sao? Không, thật đấy', id: 'Apakah kami tidak cantik? Tidak, sungguh', tr: 'Biz güzel değil miyiz? Hayır, gerçekten', pl: 'Nie jesteśmy ładne? Nie, naprawdę' },
    { ru: 'Вопрос-сомнение о своей группе женского рода и короткое подтверждение отказа. No внутри вопроса отрицает связку, а ответное no — отдельное слово-реакция перед verdad, recall из первой сессии.', uk: 'Питання-сумнів про свою групу жіночого роду і коротке підтвердження відмови. No всередині питання заперечує зв’язку, а відповідне no — окреме слово-реакція перед verdad, recall із першої сесії.', en: 'A doubting question about one\'s own feminine group and a short confirmation of refusal. The no inside the question negates the linking word, and the answering no is a separate reaction word before verdad, a recall from the first session.', 'pt-BR': 'Uma pergunta de dúvida sobre o próprio grupo feminino e uma confirmação curta de recusa. O no dentro da pergunta nega a ligação, e o no de resposta é uma palavra de reação separada antes de verdad, um recall da primeira sessão.', vi: 'Một câu hỏi nghi ngờ về nhóm giống cái của mình và một lời xác nhận từ chối ngắn. No bên trong câu hỏi phủ định từ nối, còn no trả lời là một từ phản ứng riêng biệt trước verdad, nhắc lại từ buổi học đầu tiên.', id: 'Pertanyaan keraguan tentang kelompok feminin sendiri dan konfirmasi penolakan singkat. No di dalam pertanyaan menegasikan kata penghubung, dan no jawaban adalah kata reaksi terpisah sebelum verdad, mengingat kembali dari sesi pertama.', tr: 'Kendi dişil grubu hakkında şüpheli bir soru ve kısa bir ret onayı. Sorunun içindeki no bağlacı olumsuzlar, cevaptaki no ise verdad’dan önce gelen ayrı bir tepki kelimesidir, ilk oturumdan bir hatırlatma.', pl: 'Pytanie z wątpliwością o własną grupę żeńską i krótkie potwierdzenie odmowy. No wewnątrz pytania zaprzecza łącznikowi, a odpowiadające no to osobne słowo reakcji przed verdad, przypomnienie z pierwszej sesji.' },
    [
      negationWordNada,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos', 'eres') },
      { correct: 'bonitas', prompt: genderNumberPrompt('bonitas', false), d1: genderMismatchPluralToFem('bonitas', 'bonitos'), d2: numberMismatchToPlural('bonitas', 'bonita') },
      noReactionWord,
      verdadWord,
    ],
  ),
  'es-e01-s29-son-unicos-no-somos-unicos': d(
    { ru: 'Они единственные в своём роде; мы не единственные в своём роде', uk: 'Вони єдині у своєму роді; ми не єдині у своєму роді', en: 'They are one of a kind; we are not one of a kind', 'pt-BR': 'São únicos; não somos únicos', vi: 'Họ là duy nhất; chúng tôi không phải là duy nhất', id: 'Mereka unik; kami tidak unik', tr: 'Onlar eşsiz; biz eşsiz değiliz', pl: 'Są wyjątkowi; nie jesteśmy wyjątkowi' },
    { ru: 'Диалог из признания неповторимости другой группы и скромного отказа от такой же оценки для своей. Recall утвердительной связки son, ответ — no перед somos, признак únicos не меняется ни разу.', uk: 'Діалог із визнання неповторності іншої групи і скромної відмови від такої самої оцінки для своєї. Recall стверджувальної зв’язки son, відповідь — no перед somos, ознака únicos не змінюється жодного разу.', en: 'A dialogue: admitting the uniqueness of another group and modestly declining the same evaluation for one\'s own. Recall of the affirmative linking word son, the answer is no before somos, and únicos never changes.', 'pt-BR': 'Um diálogo de reconhecer a singularidade de outro grupo e recusar modestamente a mesma avaliação para o próprio. Recall da ligação afirmativa son, a resposta é no antes de somos, e únicos nunca muda.', vi: 'Một cuộc đối thoại: thừa nhận sự độc nhất của nhóm khác và khiêm tốn từ chối đánh giá tương tự cho nhóm mình. Nhắc lại từ nối khẳng định son, câu trả lời là no trước somos, và únicos không bao giờ đổi.', id: 'Sebuah dialog: mengakui keunikan kelompok lain dan dengan rendah hati menolak penilaian yang sama untuk kelompok sendiri. Mengingat kembali kata penghubung afirmatif son, jawabannya adalah no sebelum somos, dan únicos tidak pernah berubah.', tr: 'Bir diyalog: başka bir grubun benzersizliğini kabul etme ve kendi grubu için aynı değerlendirmeyi alçakgönüllülükle reddetme. Olumlu bağlaç son’un hatırlatılması, cevap somos’tan önce no’dur ve únicos hiç değişmez.', pl: 'Dialog: uznanie niepowtarzalności innej grupy i skromna odmowa tej samej oceny dla własnej. Przypomnienie twierdzącego łącznika son, odpowiedzią jest no przed somos, a únicos nigdy się nie zmienia.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      { correct: 'únicos', prompt: genderNumberPrompt('únicos', true), d1: genderMismatchPlural('únicos', 'únicas', false), d2: accentTrapPlural('únicos', 'unicos') },
      noLowerWordNunca,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos', 'soy') },
      { correct: 'únicos', prompt: genderNumberPrompt('únicos', true), d1: genderMismatchPlural('únicos', 'únicas', false), d2: accentTrapPlural('únicos', 'unicos') },
    ],
  ),
});
