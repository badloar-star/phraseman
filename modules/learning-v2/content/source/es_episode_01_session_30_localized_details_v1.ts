import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для 15
// фраз сессии 30 "Все пять форм подряд" на восьми объяснительных локалях
// (без 'es'). Фабрика d() и общий паттерн distractors на верхнем уровне
// phrase.localizedDetails[locale] скопированы дословно из прецедента сессии
// 29 (es_episode_01_session_29_localized_details_v1.ts), как того требует
// errorExplanationByLocale. Recall-сессия проходит все пять лиц связки ser
// подряд (soy/eres/es/somos/son), поэтому здесь пять пар reasoned-хелперов
// по числу лиц-путаниц, а не два, как в сессии 29 (которая работала только
// с somos/son).
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
  soyQ: { ru: 'Какая связка нужна для разговора только о себе одном?', uk: 'Яка зв’язка потрібна, щоб говорити тільки про себе одного?', en: 'Which linking word fits speaking only about yourself?', 'pt-BR': 'Qual ligação cabe para falar só sobre você mesmo?', vi: 'Từ nối nào phù hợp khi chỉ nói về bản thân?', id: 'Kata penghubung mana yang cocok untuk berbicara hanya tentang diri sendiri?', tr: 'Yalnızca kendinden bahsetmek için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do mówienia tylko o sobie samym?' },
  soyLowerQ: { ru: 'Какая связка нужна после No для разговора только о себе одном?', uk: 'Яка зв’язка потрібна після No, щоб говорити тільки про себе одного?', en: 'Which linking word is needed after No for speaking only about yourself?', 'pt-BR': 'Qual ligação é necessária depois de No para falar só sobre você mesmo?', vi: 'Từ nối nào cần sau No khi chỉ nói về bản thân?', id: 'Kata penghubung mana yang diperlukan setelah No untuk berbicara hanya tentang diri sendiri?', tr: 'Yalnızca kendinden bahsetmek için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No do mówienia tylko o sobie samym?' },
  soyAnswerQ: { ru: 'Какой связкой ответить про себя одного?', uk: 'Якою зв’язкою відповісти про себе одного?', en: 'Which linking word answers about yourself alone?', 'pt-BR': 'Qual ligação responde só sobre você mesmo?', vi: 'Từ nối nào trả lời chỉ về bản thân?', id: 'Kata penghubung mana yang menjawab hanya tentang diri sendiri?', tr: 'Yalnızca kendin hakkında hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada tylko o sobie samym?' },
  eresQ: { ru: 'Какая связка нужна для прямого обращения к одному собеседнику?', uk: 'Яка зв’язка потрібна для прямого звернення до одного співрозмовника?', en: 'Which linking word fits speaking directly to one listener?', 'pt-BR': 'Qual ligação cabe para falar diretamente com um interlocutor?', vi: 'Từ nối nào phù hợp khi nói trực tiếp với một người nghe?', id: 'Kata penghubung mana yang cocok untuk berbicara langsung kepada satu pendengar?', tr: 'Doğrudan tek bir dinleyiciye hitap etmek için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do mówienia bezpośrednio do jednego słuchacza?' },
  eresAnswerQ: { ru: 'Какой связкой ответить одной собеседнице напрямую?', uk: 'Якою зв’язкою відповісти одній співрозмовниці напряму?', en: 'Which linking word answers one listener directly?', 'pt-BR': 'Qual ligação responde diretamente a uma interlocutora?', vi: 'Từ nối nào trả lời trực tiếp cho một người nghe?', id: 'Kata penghubung mana yang menjawab langsung kepada satu pendengar?', tr: 'Bir dinleyiciye doğrudan hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada bezpośrednio jednej słuchaczce?' },
  esQ: { ru: 'Какая связка нужна для разговора об одном третьем лице?', uk: 'Яка зв’язка потрібна для розмови про одну третю особу?', en: 'Which linking word fits talking about one third person?', 'pt-BR': 'Qual ligação cabe para falar sobre uma terceira pessoa?', vi: 'Từ nối nào phù hợp khi nói về một người thứ ba?', id: 'Kata penghubung mana yang cocok untuk berbicara tentang satu orang ketiga?', tr: 'Tek bir üçüncü kişi hakkında konuşmak için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do mówienia o jednej osobie trzeciej?' },
  esLowerQ: { ru: 'Какая связка нужна после No для одного третьего лица?', uk: 'Яка зв’язка потрібна після No для однієї третьої особи?', en: 'Which linking word is needed after No for one third person?', 'pt-BR': 'Qual ligação é necessária depois de No para uma terceira pessoa?', vi: 'Từ nối nào cần sau No cho một người thứ ba?', id: 'Kata penghubung mana yang diperlukan setelah No untuk satu orang ketiga?', tr: 'Tek bir üçüncü kişi için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No dla jednej osoby trzeciej?' },
  esAnswerQ: { ru: 'Какой связкой ответить об одном третьем лице?', uk: 'Якою зв’язкою відповісти про одну третю особу?', en: 'Which linking word answers about one third person?', 'pt-BR': 'Qual ligação responde sobre uma terceira pessoa?', vi: 'Từ nối nào trả lời về một người thứ ba?', id: 'Kata penghubung mana yang menjawab tentang satu orang ketiga?', tr: 'Tek bir üçüncü kişi hakkında hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada o jednej osobie trzeciej?' },
  somosQ: { ru: 'Какая связка нужна для группы, включая говорящего?', uk: 'Яка зв’язка потрібна для групи, включно з мовцем?', en: 'Which linking word fits a group that includes the speaker?', 'pt-BR': 'Qual ligação cabe a um grupo que inclui quem fala?', vi: 'Từ nối nào phù hợp với nhóm gồm cả người nói?', id: 'Kata penghubung mana yang cocok untuk kelompok yang mencakup penutur?', tr: 'Konuşanı da içeren bir grup için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do grupy, w tym do mówiącego?' },
  somosLowerQ: { ru: 'Какая связка нужна после No для группы, включая говорящего?', uk: 'Яка зв’язка потрібна після No для групи, включно з мовцем?', en: 'Which linking word is needed after No for a group that includes the speaker?', 'pt-BR': 'Qual ligação é necessária depois de No para um grupo que inclui quem fala?', vi: 'Từ nối nào cần sau No cho nhóm gồm cả người nói?', id: 'Kata penghubung mana yang diperlukan setelah No untuk kelompok yang mencakup penutur?', tr: 'Konuşanı da içeren bir grup için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No dla grupy, w tym mówiącego?' },
  sonQ: { ru: 'Какая связка нужна для группы БЕЗ говорящего внутри?', uk: 'Яка зв’язка потрібна для групи БЕЗ мовця всередині?', en: 'Which linking word fits a group WITHOUT the speaker inside?', 'pt-BR': 'Qual ligação cabe a um grupo SEM quem fala dentro?', vi: 'Từ nối nào phù hợp với nhóm KHÔNG có người nói ở trong?', id: 'Kata penghubung mana yang cocok untuk kelompok TANPA penutur di dalamnya?', tr: 'İçinde konuşan OLMAYAN bir grup için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do grupy BEZ mówiącego w środku?' },
  sonAnswerQ: { ru: 'Какой связкой ответить про группу без говорящего?', uk: 'Якою зв’язкою відповісти про групу без мовця?', en: 'Which linking word answers about a group without the speaker?', 'pt-BR': 'Qual ligação responde sobre um grupo sem quem fala?', vi: 'Từ nối nào trả lời về nhóm không có người nói?', id: 'Kata penghubung mana yang menjawab tentang kelompok tanpa penutur?', tr: 'Konuşan olmayan bir grup hakkında hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada o grupie bez mówiącego?' },
  noQ: { ru: 'Каким словом начать отрицание?', uk: 'Яким словом почати заперечення?', en: 'Which word starts the negation?', 'pt-BR': 'Qual palavra inicia a negação?', vi: 'Từ nào bắt đầu lời phủ định?', id: 'Kata mana yang memulai negasi?', tr: 'Olumsuzlama hangi kelimeyle başlar?', pl: 'Jakim słowem zacząć przeczenie?' },
  noReactionQ: { ru: 'Каким коротким словом подтвердить отказ?', uk: 'Яким коротким словом підтвердити відмову?', en: 'Which short word confirms the refusal?', 'pt-BR': 'Qual palavra curta confirma a recusa?', vi: 'Từ ngắn nào xác nhận lời từ chối?', id: 'Kata pendek mana yang menegaskan penolakan?', tr: 'Reddi hangi kısa kelime onaylar?', pl: 'Jakie krótkie słowo potwierdza odmowę?' },
  noSecondQ: { ru: 'Каким словом отрицать связку во втором ответе?', uk: 'Яким словом заперечити зв’язку у другій відповіді?', en: 'Which word negates the linking word in the second answer?', 'pt-BR': 'Qual palavra nega a ligação na segunda resposta?', vi: 'Từ nào phủ định từ nối trong câu trả lời thứ hai?', id: 'Kata mana yang menegasikan kata penghubung dalam jawaban kedua?', tr: 'İkinci yanıttaki bağlacı hangi kelime olumsuzlar?', pl: 'Jakie słowo zaprzecza łącznikowi w drugiej odpowiedzi?' },
  tambienQ: { ru: 'Каким словом присоединиться к чужому признаку?', uk: 'Яким словом приєднатися до чужої ознаки?', en: 'Which word joins in with someone else\'s quality?', 'pt-BR': 'Qual palavra se junta à qualidade de outra pessoa?', vi: 'Từ nào để đồng tình với đặc điểm của người khác?', id: 'Kata mana yang bergabung dengan sifat orang lain?', tr: 'Başkasının niteliğine hangi kelime katılır?', pl: 'Jakie słowo dołącza się do cudzej cechy?' },
} as const;

function genderNumberPromptSingular(word: string, masc: boolean): Record<LocaleWithoutEs, string> {
  return masc
    ? { ru: `Какой признак нужен по умолчанию, про одного мужского рода: ${word}?`, uk: `Яка ознака потрібна за замовчуванням, про одного чоловічого роду: ${word}?`, en: `Which quality is needed by default, for one masculine person or thing: ${word}?`, 'pt-BR': `Qual qualidade é necessária por padrão, para um masculino: ${word}?`, vi: `Đặc điểm nào cần theo mặc định, cho một người/vật giống đực: ${word}?`, id: `Sifat mana yang diperlukan secara default, untuk satu maskulin: ${word}?`, tr: `Varsayılan olarak, eril tek biri/şey için hangi nitelik gerekir: ${word}?`, pl: `Jaka cecha jest potrzebna domyślnie, dla jednej osoby/rzeczy rodzaju męskiego: ${word}?` }
    : { ru: `Какой признак нужен для одной женского рода: ${word}?`, uk: `Яка ознака потрібна для однієї жіночого роду: ${word}?`, en: `Which quality is needed for one feminine person or thing: ${word}?`, 'pt-BR': `Qual qualidade é necessária para uma feminina: ${word}?`, vi: `Đặc điểm nào cần cho một người/vật giống cái: ${word}?`, id: `Sifat mana yang diperlukan untuk satu feminin: ${word}?`, tr: `Dişil tek biri/şey için hangi nitelik gerekir: ${word}?`, pl: `Jaka cecha jest potrzebna dla jednej osoby/rzeczy rodzaju żeńskiego: ${word}?` };
}

function genderNumberPromptPlural(word: string, masc: boolean): Record<LocaleWithoutEs, string> {
  return masc
    ? { ru: `Какой признак нужен по умолчанию, для группы мужского рода: ${word}?`, uk: `Яка ознака потрібна за замовчуванням, для групи чоловічого роду: ${word}?`, en: `Which quality is needed by default, for a masculine group: ${word}?`, 'pt-BR': `Qual qualidade é necessária por padrão, para um grupo masculino: ${word}?`, vi: `Đặc điểm nào cần theo mặc định, cho nhóm giống đực: ${word}?`, id: `Sifat mana yang diperlukan secara default, untuk kelompok maskulin: ${word}?`, tr: `Varsayılan olarak, eril bir grup için hangi nitelik gerekir: ${word}?`, pl: `Jaka cecha jest potrzebna domyślnie, dla grupy rodzaju męskiego: ${word}?` }
    : { ru: `Какой признак нужен для группы женского рода: ${word}?`, uk: `Яка ознака потрібна для групи жіночого роду: ${word}?`, en: `Which quality is needed for a feminine group: ${word}?`, 'pt-BR': `Qual qualidade é necessária para um grupo feminino: ${word}?`, vi: `Đặc điểm nào cần cho nhóm giống cái: ${word}?`, id: `Sifat mana yang diperlukan untuk kelompok feminin: ${word}?`, tr: `Dişil bir grup için hangi nitelik gerekir: ${word}?`, pl: `Jaka cecha jest potrzebna dla grupy rodzaju żeńskiego: ${word}?` };
}

function genderMismatchSingular(correct: string, wrong: string, correctIsMasc: boolean): Reasoned {
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма ${correctIsMasc ? 'женского' : 'мужского'} рода. По умолчанию для говорящего мужского рода нужна форма на -o: ${correct}.`,
    uk: `${wrong} — форма ${correctIsMasc ? 'жіночого' : 'чоловічого'} роду. За замовчуванням потрібна форма на -o: ${correct}.`,
    en: `${wrong} is the ${correctIsMasc ? 'feminine' : 'masculine'} form. By default the -o form is needed: ${correct}.`,
    'pt-BR': `${wrong} é a forma ${correctIsMasc ? 'feminina' : 'masculina'}. Por padrão precisa da forma em -o: ${correct}.`,
    vi: `${wrong} là dạng ${correctIsMasc ? 'giống cái' : 'giống đực'}. Theo mặc định cần dạng -o: ${correct}.`,
    id: `${wrong} adalah bentuk ${correctIsMasc ? 'feminin' : 'maskulin'}. Secara default memerlukan bentuk -o: ${correct}.`,
    tr: `${wrong}, ${correctIsMasc ? 'dişil' : 'eril'} biçimdir. Varsayılan olarak -o biçimi gerekir: ${correct}.`,
    pl: `${wrong} to forma ${correctIsMasc ? 'żeńska' : 'męska'}. Domyślnie wymagana jest forma na -o: ${correct}.`,
  }};
}

function genderMismatchSingularToFem(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма мужского рода. Для собеседницы нужна форма на -a: ${correct}.`,
    uk: `${wrong} — форма чоловічого роду. Для співрозмовниці потрібна форма на -a: ${correct}.`,
    en: `${wrong} is the masculine form. A feminine listener needs the -a form: ${correct}.`,
    'pt-BR': `${wrong} é a forma masculina. Uma interlocutora precisa da forma em -a: ${correct}.`,
    vi: `${wrong} là dạng giống đực. Người nghe nữ cần dạng -a: ${correct}.`,
    id: `${wrong} adalah bentuk maskulin. Pendengar wanita memerlukan bentuk -a: ${correct}.`,
    tr: `${wrong} eril biçimdir. Dişil bir dinleyici -a biçimini gerektirir: ${correct}.`,
    pl: `${wrong} to forma męska. Słuchaczka wymaga formy na -a: ${correct}.`,
  }};
}

function numberMismatchToSingular(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма множественного числа. Про одного нужна форма единственного числа: ${correct}.`,
    uk: `${wrong} — форма множини. Про одного потрібна форма однини: ${correct}.`,
    en: `${wrong} is the plural form. Talking about one needs the singular form: ${correct}.`,
    'pt-BR': `${wrong} é a forma plural. Falando de um precisa da forma singular: ${correct}.`,
    vi: `${wrong} là dạng số nhiều. Nói về một người/vật cần dạng số ít: ${correct}.`,
    id: `${wrong} adalah bentuk jamak. Berbicara tentang satu memerlukan bentuk tunggal: ${correct}.`,
    tr: `${wrong} çoğul biçimdir. Bir kişi hakkında konuşmak tekil biçim gerektirir: ${correct}.`,
    pl: `${wrong} to forma mnoga. Mówienie o jednej osobie wymaga formy pojedynczej: ${correct}.`,
  }};
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

// зачем soyVsEresOrEs: зеркало somosVsSonOrSoy из сессии 25/29, но для
// первого лица единственного числа — recall-сессия 30 впервые сталкивает
// soy лицом к лицу и с eres, и с es в одном наборе дистракторов.
function soyVsEresOrEs(target: 'Soy' | 'soy', altSecond: 'Eres' | 'eres' | 'Es' | 'es'): { d1: Reasoned; d2: Reasoned } {
  const eresWord = target === 'Soy' ? 'Eres' : 'eres';
  const esWord = target === 'Soy' ? 'Es' : 'es';
  const isEs = altSecond === 'Es' || altSecond === 'es';
  return {
    d1: { value: eresWord, trapType: 'grammar', reason: {
      ru: `${eresWord} — обращение к собеседнику. Про себя одного — ${target}.`,
      uk: `${eresWord} — звернення до співрозмовника. Про себе одного — ${target}.`,
      en: `${eresWord} addresses the listener directly. Talking only about yourself needs ${target}.`,
      'pt-BR': `${eresWord} fala diretamente com o interlocutor. Falar só sobre você mesmo precisa de ${target}.`,
      vi: `${eresWord} nói trực tiếp với người nghe. Chỉ nói về bản thân cần ${target}.`,
      id: `${eresWord} berbicara langsung dengan pendengar. Berbicara hanya tentang diri sendiri perlu ${target}.`,
      tr: `${eresWord} doğrudan dinleyiciye hitap eder. Yalnızca kendinden bahsetmek ${target} gerektirir.`,
      pl: `${eresWord} zwraca się bezpośrednio do słuchacza. Mówienie tylko o sobie wymaga ${target}.`,
    }},
    d2: isEs
      ? { value: esWord, trapType: 'grammar', reason: {
          ru: `${esWord} — о ком-то третьем. Про себя одного — ${target}.`,
          uk: `${esWord} — про когось третього. Про себе одного — ${target}.`,
          en: `${esWord} is about someone else, a third person. Talking only about yourself needs ${target}.`,
          'pt-BR': `${esWord} é sobre outra pessoa, terceira pessoa. Falar só sobre você mesmo precisa de ${target}.`,
          vi: `${esWord} nói về người thứ ba khác. Chỉ nói về bản thân cần ${target}.`,
          id: `${esWord} tentang orang lain, orang ketiga. Berbicara hanya tentang diri sendiri perlu ${target}.`,
          tr: `${esWord} başka biri, üçüncü kişi hakkındadır. Yalnızca kendinden bahsetmek ${target} gerektirir.`,
          pl: `${esWord} dotyczy kogoś innego, osoby trzeciej. Mówienie tylko o sobie wymaga ${target}.`,
        }}
      : { value: esWord, trapType: 'grammar', reason: {
          ru: `${esWord} — о ком-то третьем. Про себя одного — ${target}.`,
          uk: `${esWord} — про когось третього. Про себе одного — ${target}.`,
          en: `${esWord} is about someone else, a third person. Talking only about yourself needs ${target}.`,
          'pt-BR': `${esWord} é sobre outra pessoa, terceira pessoa. Falar só sobre você mesmo precisa de ${target}.`,
          vi: `${esWord} nói về người thứ ba khác. Chỉ nói về bản thân cần ${target}.`,
          id: `${esWord} tentang orang lain, orang ketiga. Berbicara hanya tentang diri sendiri perlu ${target}.`,
          tr: `${esWord} başka biri, üçüncü kişi hakkındadır. Yalnızca kendinden bahsetmek ${target} gerektirir.`,
          pl: `${esWord} dotyczy kogoś innego, osoby trzeciej. Mówienie tylko o sobie wymaga ${target}.`,
        }},
  };
}

function eresVsSoyOrEs(target: 'Eres' | 'eres'): { d1: Reasoned; d2: Reasoned } {
  const soyWord = target === 'Eres' ? 'Soy' : 'soy';
  const esWord = target === 'Eres' ? 'Es' : 'es';
  return {
    d1: { value: soyWord, trapType: 'grammar', reason: {
      ru: `${soyWord} — только о себе одном. Обращение к собеседнице — ${target}.`,
      uk: `${soyWord} — тільки про себе одного. Звернення до співрозмовниці — ${target}.`,
      en: `${soyWord} is only about the speaker alone. Addressing the listener needs ${target}.`,
      'pt-BR': `${soyWord} é só sobre quem fala sozinho. Falar com a interlocutora precisa de ${target}.`,
      vi: `${soyWord} chỉ nói về một mình người nói. Nói với người nghe cần ${target}.`,
      id: `${soyWord} hanya tentang penutur sendirian. Berbicara dengan pendengar perlu ${target}.`,
      tr: `${soyWord} yalnızca konuşanın kendisi hakkındadır. Dinleyiciye hitap etmek ${target} gerektirir.`,
      pl: `${soyWord} dotyczy tylko samego mówiącego. Zwracanie się do słuchaczki wymaga ${target}.`,
    }},
    d2: { value: esWord, trapType: 'grammar', reason: {
      ru: `${esWord} — о ком-то третьем. Прямое обращение к собеседнице — ${target}.`,
      uk: `${esWord} — про когось третього. Пряме звернення до співрозмовниці — ${target}.`,
      en: `${esWord} is about someone else, a third person. Speaking directly to the listener needs ${target}.`,
      'pt-BR': `${esWord} é sobre outra pessoa, terceira pessoa. Falar diretamente com a interlocutora precisa de ${target}.`,
      vi: `${esWord} nói về người thứ ba khác. Nói trực tiếp với người nghe cần ${target}.`,
      id: `${esWord} tentang orang lain, orang ketiga. Berbicara langsung dengan pendengar perlu ${target}.`,
      tr: `${esWord} başka biri, üçüncü kişi hakkındadır. Dinleyiciye doğrudan hitap etmek ${target} gerektirir.`,
      pl: `${esWord} dotyczy kogoś innego, osoby trzeciej. Bezpośrednie zwracanie się do słuchaczki wymaga ${target}.`,
    }},
  };
}

function esVsSonOrEres(target: 'Es' | 'es'): { d1: Reasoned; d2: Reasoned } {
  const sonWord = target === 'Es' ? 'Son' : 'son';
  const eresWord = target === 'Es' ? 'Eres' : 'eres';
  return {
    d1: { value: sonWord, trapType: 'grammar', reason: {
      ru: `${sonWord} — про несколько. Про одного — ${target}.`,
      uk: `${sonWord} — про кількох. Про одного — ${target}.`,
      en: `${sonWord} is about several. Talking about one needs ${target}.`,
      'pt-BR': `${sonWord} é sobre vários. Falando de um precisa de ${target}.`,
      vi: `${sonWord} nói về nhiều người/vật. Nói về một cần ${target}.`,
      id: `${sonWord} tentang beberapa. Berbicara tentang satu perlu ${target}.`,
      tr: `${sonWord} birkaç kişi/şey hakkındadır. Bir kişi hakkında konuşmak ${target} gerektirir.`,
      pl: `${sonWord} dotyczy kilku. Mówienie o jednej osobie wymaga ${target}.`,
    }},
    d2: { value: eresWord, trapType: 'grammar', reason: {
      ru: `${eresWord} — прямое обращение к собеседнику. О третьем лице — ${target}.`,
      uk: `${eresWord} — пряме звернення до співрозмовника. Про третю особу — ${target}.`,
      en: `${eresWord} addresses the listener directly. Talking about a third person needs ${target}.`,
      'pt-BR': `${eresWord} fala diretamente com o interlocutor. Falar de uma terceira pessoa precisa de ${target}.`,
      vi: `${eresWord} nói trực tiếp với người nghe. Nói về người thứ ba cần ${target}.`,
      id: `${eresWord} berbicara langsung dengan pendengar. Berbicara tentang orang ketiga perlu ${target}.`,
      tr: `${eresWord} doğrudan dinleyiciye hitap eder. Üçüncü kişi hakkında konuşmak ${target} gerektirir.`,
      pl: `${eresWord} zwraca się bezpośrednio do słuchacza. Mówienie o osobie trzeciej wymaga ${target}.`,
    }},
  };
}

// зачем esVsSonOrSomos: вариант esVsSonOrEres для диалоговых карточек, где
// вторая реплика — не eres, а somos (своя группа отвечает третьему лицу),
// поэтому дистрактор person-mismatch должен указывать на somos, а не eres —
// точное соответствие phrases-файлу для es-rapido-somos-rapidos-tambien.
function esVsSonOrSomos(target: 'Es' | 'es'): { d1: Reasoned; d2: Reasoned } {
  const sonWord = target === 'Es' ? 'Son' : 'son';
  const somosWord = target === 'Es' ? 'Somos' : 'somos';
  return {
    d1: { value: sonWord, trapType: 'grammar', reason: {
      ru: `${sonWord} — про несколько. Про одного — ${target}.`,
      uk: `${sonWord} — про кількох. Про одного — ${target}.`,
      en: `${sonWord} is about several. Talking about one needs ${target}.`,
      'pt-BR': `${sonWord} é sobre vários. Falando de um precisa de ${target}.`,
      vi: `${sonWord} nói về nhiều người/vật. Nói về một cần ${target}.`,
      id: `${sonWord} tentang beberapa. Berbicara tentang satu perlu ${target}.`,
      tr: `${sonWord} birkaç kişi/şey hakkındadır. Bir kişi hakkında konuşmak ${target} gerektirir.`,
      pl: `${sonWord} dotyczy kilku. Mówienie o jednej osobie wymaga ${target}.`,
    }},
    d2: { value: somosWord, trapType: 'grammar', reason: {
      ru: `${somosWord} включает говорящего в группу. О третьем лице отдельно — ${target}.`,
      uk: `${somosWord} включає мовця в групу. Про третю особу окремо — ${target}.`,
      en: `${somosWord} includes the speaker in a group. Talking about a third person alone needs ${target}.`,
      'pt-BR': `${somosWord} inclui quem fala em um grupo. Falar de uma terceira pessoa sozinha precisa de ${target}.`,
      vi: `${somosWord} bao gồm người nói trong một nhóm. Nói riêng về người thứ ba cần ${target}.`,
      id: `${somosWord} mencakup penutur dalam kelompok. Berbicara tentang orang ketiga sendirian perlu ${target}.`,
      tr: `${somosWord}, konuşanı bir gruba dahil eder. Üçüncü kişi hakkında tek başına konuşmak ${target} gerektirir.`,
      pl: `${somosWord} obejmuje mówiącego w grupie. Mówienie osobno o osobie trzeciej wymaga ${target}.`,
    }},
  };
}

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

// зачем somosVsSonOrEs: вариант somosVsSonOrSoy для диалоговых карточек,
// где первая реплика — не soy/eres, а es (третье лицо задаёт тон), поэтому
// второй дистрактор — number_mismatch против es, а не person_mismatch
// против soy/eres — точное соответствие phrases-файлу для
// es-rapido-somos-rapidos-tambien.
function somosVsSonOrEs(target: 'Somos' | 'somos'): { d1: Reasoned; d2: Reasoned } {
  const sonWord = target === 'Somos' ? 'Son' : 'son';
  const esWord = target === 'Somos' ? 'Es' : 'es';
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
    d2: { value: esWord, trapType: 'grammar', reason: {
      ru: `${esWord} — только об одном. Про группу, включая говорящего, — ${target}.`,
      uk: `${esWord} — тільки про одного. Про групу, включно з мовцем, — ${target}.`,
      en: `${esWord} is only about one. A group that includes the speaker needs ${target}.`,
      'pt-BR': `${esWord} é só sobre um. Um grupo que inclui quem fala precisa de ${target}.`,
      vi: `${esWord} chỉ nói về một người. Nhóm gồm cả người nói cần ${target}.`,
      id: `${esWord} hanya tentang satu orang. Kelompok yang mencakup penutur perlu ${target}.`,
      tr: `${esWord} yalnızca bir kişi hakkındadır. Konuşanı da içeren bir grup ${target} gerektirir.`,
      pl: `${esWord} dotyczy tylko jednej osoby. Grupa obejmująca mówiącego wymaga ${target}.`,
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
  d1: { value: 'nunca', trapType: 'semantic_neighbor', reason: {
    ru: 'Nunca — «никогда», про частоту во времени. Простое отрицание связки — no.',
    uk: 'Nunca — «ніколи», про частоту в часі. Просте заперечення зв’язки — no.',
    en: 'Nunca means "never", about frequency in time. Simple negation of the linking word needs no.',
    'pt-BR': 'Nunca significa "nunca", sobre frequência no tempo. A negação simples da ligação precisa de no.',
    vi: 'Nunca nghĩa là "không bao giờ", về tần suất thời gian. Phủ định đơn giản của từ nối cần no.',
    id: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Negasi sederhana kata penghubung perlu no.',
    tr: 'Nunca "asla" demektir, zaman sıklığı hakkındadır. Bağlacın basit olumsuzlaması no gerektirir.',
    pl: 'Nunca znaczy „nigdy”, dotyczy częstotliwości w czasie. Proste zaprzeczenie łącznika wymaga no.',
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

// зачем noLowerWordNada: та же lowercase-позиция no (не в начале фразы),
// но с nada/non вместо nunca/non — точное соответствие phrases-файлу для
// eres-rapida-no-es-rapido-q, где no встречается не как реакция и не в
// начале фразы, а перед второй связкой в середине диалога.
const noLowerWordNada: WordSpec = {
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

// зачем tambienVsWrongWord: новый паттерн для сессии 30 — коннектор
// también появляется впервые в двух диалоговых фразах курса-recall,
// дистракторы взяты дословно из phrases-файла (accent_missing и wrong_word
// против verdad).
const tambienWord: WordSpec = {
  correct: 'también',
  prompt: T.tambienQ,
  d1: { value: 'tambien', trapType: 'orthographic', reason: {
    ru: 'Tambien без тильды над é звучал бы и писался бы иначе. Нужна форма с тильдой: también.',
    uk: 'Tambien без тильди над é звучав би і писався б інакше. Потрібна форма з тильдою: también.',
    en: 'Tambien without the tilde over é would sound and be spelled differently. The needed form has the tilde: también.',
    'pt-BR': 'Tambien sem o til sobre é soaria e se escreveria diferente. A forma necessária tem o til: también.',
    vi: 'Tambien không có dấu ngã trên é sẽ phát âm và viết khác. Dạng cần có dấu ngã: también.',
    id: 'Tambien tanpa tilde di atas é akan terdengar dan dieja berbeda. Bentuk yang diperlukan memiliki tilde: también.',
    tr: 'Tambien, é üzerinde tilde olmadan farklı okunur ve yazılırdı. Gereken biçim tilde ile: también.',
    pl: 'Tambien bez tyldy nad é brzmiałoby i pisałoby się inaczej. Potrzebna jest forma z tyldą: también.',
  }},
  d2: { value: 'verdad', trapType: 'semantic_neighbor', reason: {
    ru: 'Verdad — «правда», отдельное подтверждение факта, а не присоединение к чужому признаку. Нужно también.',
    uk: 'Verdad — «правда», окреме підтвердження факту, а не приєднання до чужої ознаки. Потрібно también.',
    en: 'Verdad means "truth", a separate confirmation of a fact, not joining in with someone else\'s quality. You need también.',
    'pt-BR': 'Verdad significa "verdade", uma confirmação separada de um fato, não se juntar à qualidade de outra pessoa. Precisa de también.',
    vi: 'Verdad nghĩa là "sự thật", một xác nhận sự việc riêng biệt, không phải đồng tình với đặc điểm của người khác. Cần también.',
    id: 'Verdad berarti "kebenaran", konfirmasi fakta yang terpisah, bukan bergabung dengan sifat orang lain. Perlu también.',
    tr: 'Verdad "gerçek" demektir, bir gerçeğin ayrı bir onayıdır, başkasının niteliğine katılmak değildir. también gerekir.',
    pl: 'Verdad znaczy „prawda”, osobne potwierdzenie faktu, a nie dołączenie do cudzej cechy. Potrzebne jest también.',
  }},
};

export const ES_SESSION_30_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s30-soy-rapido': d(
    { ru: 'Я быстрый', uk: 'Я швидкий', en: 'I am fast', 'pt-BR': 'Sou rápido', vi: 'Tôi nhanh', id: 'Saya cepat', tr: 'Ben hızlıyım', pl: 'Jestem szybki' },
    { ru: 'Связка первого лица единственного числа — только о себе одном, без собеседника и без группы. Recall из первой сессии курса, где soy впервые появилась.', uk: 'Зв’язка першої особи однини — тільки про себе одного, без співрозмовника і без групи. Recall із першої сесії курсу, де soy вперше з’явилася.', en: 'The first-person singular linking word — only about the speaker alone, without a listener and without a group. Recall from the first session of the course, where soy first appeared.', 'pt-BR': 'A ligação de primeira pessoa do singular — só sobre quem fala sozinho, sem interlocutor e sem grupo. Recall da primeira sessão do curso, onde soy apareceu pela primeira vez.', vi: 'Từ nối ngôi thứ nhất số ít — chỉ nói về một mình người nói, không có người nghe và không có nhóm. Nhắc lại từ buổi học đầu tiên của khóa học, nơi soy xuất hiện lần đầu.', id: 'Kata penghubung orang pertama tunggal — hanya tentang penutur sendirian, tanpa pendengar dan tanpa kelompok. Mengingat kembali dari sesi pertama kursus, tempat soy pertama kali muncul.', tr: 'Birinci tekil şahıs bağlacı — yalnızca konuşanın kendisi hakkında, dinleyici ve grup olmadan. Kursun ilk oturumundan bir hatırlatma, soy’un ilk kez ortaya çıktığı yer.', pl: 'Łącznik pierwszej osoby liczby pojedynczej — tylko o samym mówiącym, bez słuchacza i bez grupy. Przypomnienie z pierwszej sesji kursu, gdzie soy pojawiło się po raz pierwszy.' },
    [
      { correct: 'Soy', prompt: T.soyQ, ...soyVsEresOrEs('Soy', 'Eres') },
      { correct: 'rápido', prompt: genderNumberPromptSingular('rápido', true), d1: genderMismatchSingular('rápido', 'rápida', false), d2: numberMismatchToSingular('rápido', 'rápidos') },
    ],
  ),
  'es-e01-s30-eres-rapida': d(
    { ru: 'Ты быстрая', uk: 'Ти швидка', en: 'You are fast', 'pt-BR': 'Você é rápida', vi: 'Bạn nhanh', id: 'Kamu cepat', tr: 'Sen hızlısın', pl: 'Jesteś szybka' },
    { ru: 'Связка второго лица единственного числа — обращение к одной собеседнице. Recall из девятой сессии, где eres впервые появилась.', uk: 'Зв’язка другої особи однини — звернення до однієї співрозмовниці. Recall із дев’ятої сесії, де eres вперше з’явилася.', en: 'The second-person singular linking word — addressing one female listener. Recall from the ninth session, where eres first appeared.', 'pt-BR': 'A ligação de segunda pessoa do singular — falando com uma interlocutora. Recall da nona sessão, onde eres apareceu pela primeira vez.', vi: 'Từ nối ngôi thứ hai số ít — nói với một người nghe nữ. Nhắc lại từ buổi học thứ chín, nơi eres xuất hiện lần đầu.', id: 'Kata penghubung orang kedua tunggal — berbicara dengan satu pendengar wanita. Mengingat kembali dari sesi kesembilan, tempat eres pertama kali muncul.', tr: 'İkinci tekil şahıs bağlacı — bir kadın dinleyiciye hitap etme. Dokuzuncu oturumdan bir hatırlatma, eres’in ilk kez ortaya çıktığı yer.', pl: 'Łącznik drugiej osoby liczby pojedynczej — zwracanie się do jednej słuchaczki. Przypomnienie z dziewiątej sesji, gdzie eres pojawiło się po raz pierwszy.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsSoyOrEs('Eres') },
      { correct: 'rápida', prompt: genderNumberPromptSingular('rápida', false), d1: genderMismatchSingularToFem('rápida', 'rápido'), d2: numberMismatchToSingular('rápida', 'rápidas') },
    ],
  ),
  'es-e01-s30-es-rapido': d(
    { ru: 'Он/оно быстрый', uk: 'Він/воно швидкий', en: 'He/it is fast', 'pt-BR': 'Ele/isso é rápido', vi: 'Anh ấy/nó nhanh', id: 'Dia/itu cepat', tr: 'O hızlı', pl: 'On/to jest szybki' },
    { ru: 'Связка третьего лица единственного числа — о ком-то или о чём-то одном, без говорящего и без собеседника. Recall из семнадцатой сессии, где es впервые стала главным предметом.', uk: 'Зв’язка третьої особи однини — про когось або щось одне, без мовця і без співрозмовника. Recall із сімнадцятої сесії, де es вперше стала головним предметом.', en: 'The third-person singular linking word — about one person or thing, without the speaker and without a listener. Recall from the seventeenth session, where es first became the main topic.', 'pt-BR': 'A ligação de terceira pessoa do singular — sobre uma pessoa ou coisa, sem quem fala e sem interlocutor. Recall da décima sétima sessão, onde es se tornou o assunto principal pela primeira vez.', vi: 'Từ nối ngôi thứ ba số ít — về một người hoặc vật, không có người nói và không có người nghe. Nhắc lại từ buổi học thứ mười bảy, nơi es lần đầu trở thành chủ đề chính.', id: 'Kata penghubung orang ketiga tunggal — tentang satu orang atau benda, tanpa penutur dan tanpa pendengar. Mengingat kembali dari sesi ketujuh belas, tempat es pertama kali menjadi topik utama.', tr: 'Üçüncü tekil şahıs bağlacı — bir kişi veya şey hakkında, konuşan ve dinleyici olmadan. On yedinci oturumdan bir hatırlatma, es’in ilk kez ana konu haline geldiği yer.', pl: 'Łącznik trzeciej osoby liczby pojedynczej — o jednej osobie lub rzeczy, bez mówiącego i bez słuchacza. Przypomnienie z siedemnastej sesji, gdzie es po raz pierwszy stało się głównym tematem.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsSonOrEres('Es') },
      { correct: 'rápido', prompt: genderNumberPromptSingular('rápido', true), d1: genderMismatchSingular('rápido', 'rápida', false), d2: numberMismatchToSingular('rápido', 'rápidos') },
    ],
  ),
  'es-e01-s30-somos-rapidas': d(
    { ru: 'Мы быстрые (о группе женского рода)', uk: 'Ми швидкі (про групу жіночого роду)', en: 'We are fast (feminine group)', 'pt-BR': 'Somos rápidas', vi: 'Chúng tôi nhanh (nhóm giống cái)', id: 'Kami cepat (kelompok feminin)', tr: 'Biz hızlıyız (dişil grup)', pl: 'Jesteśmy szybkie (grupa żeńska)' },
    { ru: 'Связка первого лица множественного числа — про группу женского рода, включающую говорящую. Recall из двадцать пятой сессии, где somos впервые стала главным предметом.', uk: 'Зв’язка першої особи множини — про групу жіночого роду, що включає мовицю. Recall із двадцять п’ятої сесії, де somos вперше стала головним предметом.', en: 'The first-person plural linking word — about a feminine group that includes the speaker. Recall from the twenty-fifth session, where somos first became the main topic.', 'pt-BR': 'A ligação de primeira pessoa do plural — sobre um grupo feminino que inclui quem fala. Recall da vigésima quinta sessão, onde somos se tornou o assunto principal pela primeira vez.', vi: 'Từ nối ngôi thứ nhất số nhiều — về nhóm giống cái gồm cả người nói. Nhắc lại từ buổi học thứ hai mươi lăm, nơi somos lần đầu trở thành chủ đề chính.', id: 'Kata penghubung orang pertama jamak — tentang kelompok feminin yang mencakup penutur. Mengingat kembali dari sesi kedua puluh lima, tempat somos pertama kali menjadi topik utama.', tr: 'Birinci çoğul şahıs bağlacı — konuşanı da içeren dişil bir grup hakkında. Yirmi beşinci oturumdan bir hatırlatma, somos’un ilk kez ana konu haline geldiği yer.', pl: 'Łącznik pierwszej osoby liczby mnogiej — o grupie żeńskiej obejmującej mówiącą. Przypomnienie z dwudziestej piątej sesji, gdzie somos po raz pierwszy stało się głównym tematem.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrSoy('Somos', 'Soy') },
      { correct: 'rápidas', prompt: genderNumberPromptPlural('rápidas', false), d1: genderMismatchPluralToFem('rápidas', 'rápidos'), d2: numberMismatchToPlural('rápidas', 'rápida') },
    ],
  ),
  'es-e01-s30-son-rapidos': d(
    { ru: 'Они быстрые', uk: 'Вони швидкі', en: 'They are fast', 'pt-BR': 'São rápidos', vi: 'Họ nhanh', id: 'Mereka cepat', tr: 'Onlar hızlı', pl: 'Są szybcy' },
    { ru: 'Связка третьего лица множественного числа — про группу без говорящего внутри. Recall из двадцать седьмой сессии, где son впервые стала главным предметом.', uk: 'Зв’язка третьої особи множини — про групу без мовця всередині. Recall із двадцять сьомої сесії, де son вперше стала головним предметом.', en: 'The third-person plural linking word — about a group without the speaker inside. Recall from the twenty-seventh session, where son first became the main topic.', 'pt-BR': 'A ligação de terceira pessoa do plural — sobre um grupo sem quem fala dentro. Recall da vigésima sétima sessão, onde son se tornou o assunto principal pela primeira vez.', vi: 'Từ nối ngôi thứ ba số nhiều — về nhóm không có người nói ở trong. Nhắc lại từ buổi học thứ hai mươi bảy, nơi son lần đầu trở thành chủ đề chính.', id: 'Kata penghubung orang ketiga jamak — tentang kelompok tanpa penutur di dalamnya. Mengingat kembali dari sesi kedua puluh tujuh, tempat son pertama kali menjadi topik utama.', tr: 'Üçüncü çoğul şahıs bağlacı — içinde konuşan olmayan bir grup hakkında. Yirmi yedinci oturumdan bir hatırlatma, son’un ilk kez ana konu haline geldiği yer.', pl: 'Łącznik trzeciej osoby liczby mnogiej — o grupie bez mówiącego w środku. Przypomnienie z dwudziestej siódmej sesji, gdzie son po raz pierwszy stało się głównym tematem.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      { correct: 'rápidos', prompt: genderNumberPromptPlural('rápidos', true), d1: genderMismatchPlural('rápidos', 'rápidas', false), d2: numberMismatchToPlural('rápidos', 'rápido') },
    ],
  ),
  'es-e01-s30-no-soy-rapido': d(
    { ru: 'Я не быстрый', uk: 'Я не швидкий', en: 'I am not fast', 'pt-BR': 'Não sou rápido', vi: 'Tôi không nhanh', id: 'Saya tidak cepat', tr: 'Ben hızlı değilim', pl: 'Nie jestem szybki' },
    { ru: 'Отрицание первого лица единственного числа. No встаёт перед soy, признак не меняется от отрицания. Recall отрицательной формы из первой сессии.', uk: 'Заперечення першої особи однини. No стає перед soy, ознака не змінюється від заперечення. Recall заперечної форми з першої сесії.', en: 'Negation of the first-person singular. No comes before soy, and the quality does not change with negation. Recall of the negative form from the first session.', 'pt-BR': 'Negação de primeira pessoa do singular. No vem antes de soy, e a qualidade não muda com a negação. Recall da forma negativa da primeira sessão.', vi: 'Phủ định ngôi thứ nhất số ít. No đứng trước soy, và đặc điểm không đổi khi phủ định. Nhắc lại dạng phủ định từ buổi học đầu tiên.', id: 'Negasi orang pertama tunggal. No berada sebelum soy, dan sifat itu tidak berubah dengan negasi. Mengingat kembali bentuk negatif dari sesi pertama.', tr: 'Birinci tekil şahsın olumsuzlanması. No, soy’dan önce gelir ve nitelik olumsuzlamayla değişmez. İlk oturumdan olumsuz biçimin hatırlatılması.', pl: 'Zaprzeczenie pierwszej osoby liczby pojedynczej. No stoi przed soy, a cecha nie zmienia się przez przeczenie. Przypomnienie formy przeczącej z pierwszej sesji.' },
    [
      negationWordNada,
      { correct: 'soy', prompt: T.soyLowerQ, ...soyVsEresOrEs('soy', 'eres') },
      { correct: 'rápido', prompt: genderNumberPromptSingular('rápido', true), d1: genderMismatchSingular('rápido', 'rápida', false), d2: numberMismatchToSingular('rápido', 'rápidos') },
    ],
  ),
  'es-e01-s30-no-eres-rapida': d(
    { ru: 'Ты не быстрая', uk: 'Ти не швидка', en: 'You are not fast', 'pt-BR': 'Você não é rápida', vi: 'Bạn không nhanh', id: 'Kamu tidak cepat', tr: 'Sen hızlı değilsin', pl: 'Nie jesteś szybka' },
    { ru: 'Отрицание второго лица единственного числа. No встаёт перед eres, признак не меняется от отрицания. Recall отрицательной формы, впервые звучавшей мимоходом в сессии про es.', uk: 'Заперечення другої особи однини. No стає перед eres, ознака не змінюється від заперечення. Recall заперечної форми, вперше згаданої побіжно в сесії про es.', en: 'Negation of the second-person singular. No comes before eres, and the quality does not change with negation. Recall of the negative form that first appeared in passing in the session about es.', 'pt-BR': 'Negação de segunda pessoa do singular. No vem antes de eres, e a qualidade não muda com a negação. Recall da forma negativa mencionada de passagem pela primeira vez na sessão sobre es.', vi: 'Phủ định ngôi thứ hai số ít. No đứng trước eres, và đặc điểm không đổi khi phủ định. Nhắc lại dạng phủ định lần đầu xuất hiện thoáng qua trong buổi học về es.', id: 'Negasi orang kedua tunggal. No berada sebelum eres, dan sifat itu tidak berubah dengan negasi. Mengingat kembali bentuk negatif yang pertama kali disebutkan sekilas dalam sesi tentang es.', tr: 'İkinci tekil şahsın olumsuzlanması. No, eres’ten önce gelir ve nitelik olumsuzlamayla değişmez. Es hakkındaki oturumda ilk kez geçici olarak geçen olumsuz biçimin hatırlatılması.', pl: 'Zaprzeczenie drugiej osoby liczby pojedynczej. No stoi przed eres, a cecha nie zmienia się przez przeczenie. Przypomnienie formy przeczącej, która pierwszy raz pojawiła się mimochodem w sesji o es.' },
    [
      negationWordNunca,
      { correct: 'eres', prompt: T.eresQ, ...eresVsSoyOrEs('eres') },
      { correct: 'rápida', prompt: genderNumberPromptSingular('rápida', false), d1: genderMismatchSingularToFem('rápida', 'rápido'), d2: numberMismatchToSingular('rápida', 'rápidas') },
    ],
  ),
  'es-e01-s30-no-es-rapido': d(
    { ru: 'Он/оно не быстрый', uk: 'Він/воно не швидкий', en: 'He/it is not fast', 'pt-BR': 'Ele/isso não é rápido', vi: 'Anh ấy/nó không nhanh', id: 'Dia/itu tidak cepat', tr: 'O hızlı değil', pl: 'On/to nie jest szybki' },
    { ru: 'Отрицание третьего лица единственного числа. No встаёт перед es, признак не меняется от отрицания. Recall отрицательной формы из второй и девятнадцатой сессий.', uk: 'Заперечення третьої особи однини. No стає перед es, ознака не змінюється від заперечення. Recall заперечної форми з другої та дев’ятнадцятої сесій.', en: 'Negation of the third-person singular. No comes before es, and the quality does not change with negation. Recall of the negative form from the second and nineteenth sessions.', 'pt-BR': 'Negação de terceira pessoa do singular. No vem antes de es, e a qualidade não muda com a negação. Recall da forma negativa da segunda e décima nona sessões.', vi: 'Phủ định ngôi thứ ba số ít. No đứng trước es, và đặc điểm không đổi khi phủ định. Nhắc lại dạng phủ định từ buổi học thứ hai và mười chín.', id: 'Negasi orang ketiga tunggal. No berada sebelum es, dan sifat itu tidak berubah dengan negasi. Mengingat kembali bentuk negatif dari sesi kedua dan kesembilan belas.', tr: 'Üçüncü tekil şahsın olumsuzlanması. No, es’ten önce gelir ve nitelik olumsuzlamayla değişmez. İkinci ve on dokuzuncu oturumlardan olumsuz biçimin hatırlatılması.', pl: 'Zaprzeczenie trzeciej osoby liczby pojedynczej. No stoi przed es, a cecha nie zmienia się przez przeczenie. Przypomnienie formy przeczącej z drugiej i dziewiętnastej sesji.' },
    [
      negationWordNada,
      { correct: 'es', prompt: T.esLowerQ, ...esVsSonOrEres('es') },
      { correct: 'rápido', prompt: genderNumberPromptSingular('rápido', true), d1: genderMismatchSingular('rápido', 'rápida', false), d2: numberMismatchToSingular('rápido', 'rápidos') },
    ],
  ),
  'es-e01-s30-no-somos-rapidas': d(
    { ru: 'Мы не быстрые (о группе женского рода)', uk: 'Ми не швидкі (про групу жіночого роду)', en: 'We are not fast (feminine group)', 'pt-BR': 'Não somos rápidas', vi: 'Chúng tôi không nhanh (nhóm giống cái)', id: 'Kami tidak cepat (kelompok feminin)', tr: 'Biz hızlı değiliz (dişil grup)', pl: 'Nie jesteśmy szybkie (grupa żeńska)' },
    { ru: 'Отрицание первого лица множественного числа. No встаёт перед somos, признак не меняется от отрицания. Recall отрицательной формы из двадцать девятой сессии.', uk: 'Заперечення першої особи множини. No стає перед somos, ознака не змінюється від заперечення. Recall заперечної форми з двадцять дев’ятої сесії.', en: 'Negation of the first-person plural. No comes before somos, and the quality does not change with negation. Recall of the negative form from the twenty-ninth session.', 'pt-BR': 'Negação de primeira pessoa do plural. No vem antes de somos, e a qualidade não muda com a negação. Recall da forma negativa da vigésima nona sessão.', vi: 'Phủ định ngôi thứ nhất số nhiều. No đứng trước somos, và đặc điểm không đổi khi phủ định. Nhắc lại dạng phủ định từ buổi học thứ hai mươi chín.', id: 'Negasi orang pertama jamak. No berada sebelum somos, dan sifat itu tidak berubah dengan negasi. Mengingat kembali bentuk negatif dari sesi kedua puluh sembilan.', tr: 'Birinci çoğul şahsın olumsuzlanması. No, somos’tan önce gelir ve nitelik olumsuzlamayla değişmez. Yirmi dokuzuncu oturumdan olumsuz biçimin hatırlatılması.', pl: 'Zaprzeczenie pierwszej osoby liczby mnogiej. No stoi przed somos, a cecha nie zmienia się przez przeczenie. Przypomnienie formy przeczącej z dwudziestej dziewiątej sesji.' },
    [
      negationWordNunca,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos', 'soy') },
      { correct: 'rápidas', prompt: genderNumberPromptPlural('rápidas', false), d1: genderMismatchPluralToFem('rápidas', 'rápidos'), d2: numberMismatchToPlural('rápidas', 'rápida') },
    ],
  ),
  'es-e01-s30-no-son-rapidos': d(
    { ru: 'Они не быстрые', uk: 'Вони не швидкі', en: 'They are not fast', 'pt-BR': 'Não são rápidos', vi: 'Họ không nhanh', id: 'Mereka tidak cepat', tr: 'Onlar hızlı değil', pl: 'Nie są szybcy' },
    { ru: 'Отрицание третьего лица множественного числа. No встаёт перед son, признак не меняется от отрицания. Recall отрицательной формы из двадцать девятой сессии.', uk: 'Заперечення третьої особи множини. No стає перед son, ознака не змінюється від заперечення. Recall заперечної форми з двадцять дев’ятої сесії.', en: 'Negation of the third-person plural. No comes before son, and the quality does not change with negation. Recall of the negative form from the twenty-ninth session.', 'pt-BR': 'Negação de terceira pessoa do plural. No vem antes de son, e a qualidade não muda com a negação. Recall da forma negativa da vigésima nona sessão.', vi: 'Phủ định ngôi thứ ba số nhiều. No đứng trước son, và đặc điểm không đổi khi phủ định. Nhắc lại dạng phủ định từ buổi học thứ hai mươi chín.', id: 'Negasi orang ketiga jamak. No berada sebelum son, dan sifat itu tidak berubah dengan negasi. Mengingat kembali bentuk negatif dari sesi kedua puluh sembilan.', tr: 'Üçüncü çoğul şahsın olumsuzlanması. No, son’dan önce gelir ve nitelik olumsuzlamayla değişmez. Yirmi dokuzuncu oturumdan olumsuz biçimin hatırlatılması.', pl: 'Zaprzeczenie trzeciej osoby liczby mnogiej. No stoi przed son, a cecha nie zmienia się przez przeczenie. Przypomnienie formy przeczącej z dwudziestej dziewiątej sesji.' },
    [
      negationWordNada,
      { correct: 'son', prompt: T.sonQ, ...sonVsSomosOrEs('son') },
      { correct: 'rápidos', prompt: genderNumberPromptPlural('rápidos', true), d1: genderMismatchPlural('rápidos', 'rápidas', false), d2: numberMismatchToPlural('rápidos', 'rápido') },
    ],
  ),
  'es-e01-s30-soy-rapido-eres-rapida-tambien': d(
    { ru: 'Я быстрый; ты тоже быстрая', uk: 'Я швидкий; ти теж швидка', en: 'I am fast; you are fast too', 'pt-BR': 'Sou rápido; você também é rápida', vi: 'Tôi nhanh; bạn cũng nhanh', id: 'Saya cepat; kamu juga cepat', tr: 'Ben hızlıyım; sen de hızlısın', pl: 'Jestem szybki; ty też jesteś szybka' },
    { ru: 'Диалог из утверждения о себе первым лицом и подтверждения тем же признаком вторым лицом. Recall связки soy, ответ — связка eres с recall también.', uk: 'Діалог зі ствердження про себе першою особою і підтвердження тією самою ознакою другою особою. Recall зв’язки soy, відповідь — зв’язка eres з recall también.', en: 'A dialogue: a first-person statement about oneself and a second-person confirmation of the same quality. Recall of the linking word soy, the answer is the linking word eres with a recall of también.', 'pt-BR': 'Um diálogo de afirmação sobre si mesmo em primeira pessoa e confirmação da mesma qualidade em segunda pessoa. Recall da ligação soy, a resposta é a ligação eres com recall de también.', vi: 'Một cuộc đối thoại: câu khẳng định về bản thân ở ngôi thứ nhất và sự xác nhận cùng đặc điểm đó ở ngôi thứ hai. Nhắc lại từ nối soy, câu trả lời là từ nối eres với việc nhắc lại también.', id: 'Sebuah dialog: pernyataan orang pertama tentang diri sendiri dan konfirmasi orang kedua atas sifat yang sama. Mengingat kembali kata penghubung soy, jawabannya adalah kata penghubung eres dengan mengingat kembali también.', tr: 'Bir diyalog: kendisi hakkında birinci şahıs ifadesi ve ikinci şahsın aynı niteliği onaylaması. Soy bağlacının hatırlatılması, cevap también’ın hatırlatılmasıyla birlikte eres bağlacıdır.', pl: 'Dialog: stwierdzenie o sobie w pierwszej osobie i potwierdzenie tej samej cechy w drugiej osobie. Przypomnienie łącznika soy, odpowiedzią jest łącznik eres z przypomnieniem también.' },
    [
      { correct: 'Soy', prompt: T.soyQ, ...soyVsEresOrEs('Soy', 'Eres') },
      { correct: 'rápido', prompt: genderNumberPromptSingular('rápido', true), d1: genderMismatchSingular('rápido', 'rápida', false), d2: numberMismatchToSingular('rápido', 'rápidos') },
      { correct: 'eres', prompt: T.eresAnswerQ, ...eresVsSoyOrEs('eres') },
      { correct: 'rápida', prompt: genderNumberPromptSingular('rápida', false), d1: genderMismatchSingularToFem('rápida', 'rápido'), d2: numberMismatchToSingular('rápida', 'rápidas') },
      tambienWord,
    ],
  ),
  'es-e01-s30-es-rapido-somos-rapidos-tambien': d(
    { ru: 'Он быстрый; мы тоже быстрые', uk: 'Він швидкий; ми теж швидкі', en: 'He is fast; we are fast too', 'pt-BR': 'Ele é rápido; nós também somos rápidos', vi: 'Anh ấy nhanh; chúng tôi cũng nhanh', id: 'Dia cepat; kami juga cepat', tr: 'O hızlı; biz de hızlıyız', pl: 'On jest szybki; my też jesteśmy szybcy' },
    { ru: 'Диалог из утверждения о третьем лице и подтверждения тем же признаком собственной группой. Recall связки es, ответ — связка somos с recall también.', uk: 'Діалог зі ствердження про третю особу і підтвердження тією самою ознакою власною групою. Recall зв’язки es, відповідь — зв’язка somos з recall también.', en: 'A dialogue: a statement about a third person and a confirmation of the same quality by one\'s own group. Recall of the linking word es, the answer is the linking word somos with a recall of también.', 'pt-BR': 'Um diálogo de afirmação sobre uma terceira pessoa e confirmação da mesma qualidade pelo próprio grupo. Recall da ligação es, a resposta é a ligação somos com recall de también.', vi: 'Một cuộc đối thoại: câu khẳng định về người thứ ba và sự xác nhận cùng đặc điểm đó bởi nhóm của mình. Nhắc lại từ nối es, câu trả lời là từ nối somos với việc nhắc lại también.', id: 'Sebuah dialog: pernyataan tentang orang ketiga dan konfirmasi sifat yang sama oleh kelompok sendiri. Mengingat kembali kata penghubung es, jawabannya adalah kata penghubung somos dengan mengingat kembali también.', tr: 'Bir diyalog: üçüncü kişi hakkında bir ifade ve kendi grubunun aynı niteliği onaylaması. Es bağlacının hatırlatılması, cevap también’ın hatırlatılmasıyla birlikte somos bağlacıdır.', pl: 'Dialog: stwierdzenie o osobie trzeciej i potwierdzenie tej samej cechy przez własną grupę. Przypomnienie łącznika es, odpowiedzią jest łącznik somos z przypomnieniem también.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsSonOrSomos('Es') },
      { correct: 'rápido', prompt: genderNumberPromptSingular('rápido', true), d1: genderMismatchSingular('rápido', 'rápida', false), d2: numberMismatchToSingular('rápido', 'rápidos') },
      { correct: 'somos', prompt: T.somosQ, ...somosVsSonOrEs('somos') },
      { correct: 'rápidos', prompt: genderNumberPromptPlural('rápidos', true), d1: genderMismatchPlural('rápidos', 'rápidas', false), d2: numberMismatchToPlural('rápidos', 'rápido') },
      tambienWord,
    ],
  ),
  'es-e01-s30-son-rapidos-no-soy-rapido-q': d(
    { ru: 'Они быстрые? Нет, я не быстрый', uk: 'Вони швидкі? Ні, я не швидкий', en: 'Are they fast? No, I am not fast', 'pt-BR': 'São rápidos? Não, não sou rápido', vi: 'Họ nhanh à? Không, tôi không nhanh', id: 'Apakah mereka cepat? Tidak, saya tidak cepat', tr: 'Onlar hızlı mı? Hayır, ben hızlı değilim', pl: 'Są szybcy? Nie, nie jestem szybki' },
    { ru: 'Вопрос о третьих лицах множественного числа и отрицательный ответ о себе одном. Recall связки son в вопросе, ответ — no soy, полный переход через два разных лица подряд.', uk: 'Питання про третіх осіб множини і заперечна відповідь про себе одного. Recall зв’язки son у питанні, відповідь — no soy, повний перехід через дві різні особи підряд.', en: 'A question about several third persons and a negative answer about the speaker alone. Recall of the linking word son in the question, the answer is no soy, a full switch through two different persons in a row.', 'pt-BR': 'Uma pergunta sobre várias terceiras pessoas e uma resposta negativa sobre quem fala sozinho. Recall da ligação son na pergunta, a resposta é no soy, uma troca completa por duas pessoas diferentes seguidas.', vi: 'Một câu hỏi về nhiều người thứ ba và câu trả lời phủ định về một mình người nói. Nhắc lại từ nối son trong câu hỏi, câu trả lời là no soy, chuyển đổi hoàn toàn qua hai ngôi khác nhau liên tiếp.', id: 'Pertanyaan tentang beberapa orang ketiga dan jawaban negatif tentang penutur sendirian. Mengingat kembali kata penghubung son dalam pertanyaan, jawabannya adalah no soy, pergantian penuh melalui dua orang berbeda berturut-turut.', tr: 'Birkaç üçüncü kişi hakkında bir soru ve konuşanın kendisi hakkında olumsuz bir yanıt. Sorudaki son bağlacının hatırlatılması, cevap no soy’dur, art arda iki farklı şahıs arasında tam bir geçiş.', pl: 'Pytanie o kilka osób trzecich i przecząca odpowiedź o samym mówiącym. Przypomnienie łącznika son w pytaniu, odpowiedzią jest no soy, pełne przejście przez dwie różne osoby pod rząd.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      { correct: 'rápidos', prompt: genderNumberPromptPlural('rápidos', true), d1: genderMismatchPlural('rápidos', 'rápidas', false), d2: numberMismatchToPlural('rápidos', 'rápido') },
      noReactionWord,
      noLowerWord,
      { correct: 'soy', prompt: T.soyAnswerQ, ...soyVsEresOrEs('soy', 'eres') },
      { correct: 'rápido', prompt: genderNumberPromptSingular('rápido', true), d1: genderMismatchSingular('rápido', 'rápida', false), d2: numberMismatchToSingular('rápido', 'rápidos') },
    ],
  ),
  'es-e01-s30-eres-rapida-no-es-rapido-q': d(
    { ru: 'Ты быстрая? Он не быстрый', uk: 'Ти швидка? Він не швидкий', en: 'Are you fast? He is not fast', 'pt-BR': 'Você é rápida? Ele não é rápido', vi: 'Bạn nhanh à? Anh ấy không nhanh', id: 'Apakah kamu cepat? Dia tidak cepat', tr: 'Sen hızlı mısın? O hızlı değil', pl: 'Jesteś szybka? On nie jest szybki' },
    { ru: 'Вопрос ко второму лицу и отрицательный ответ о третьем лице другим родом. Recall связки eres в вопросе, ответ — no es, смена лица И рода в одной карточке.', uk: 'Питання до другої особи і заперечна відповідь про третю особу іншого роду. Recall зв’язки eres у питанні, відповідь — no es, зміна особи І роду в одній картці.', en: 'A question to the second person and a negative answer about a third person of a different gender. Recall of the linking word eres in the question, the answer is no es, a change of both person AND gender in one card.', 'pt-BR': 'Uma pergunta em segunda pessoa e uma resposta negativa sobre uma terceira pessoa de gênero diferente. Recall da ligação eres na pergunta, a resposta é no es, uma mudança de pessoa E gênero em um único cartão.', vi: 'Một câu hỏi ở ngôi thứ hai và câu trả lời phủ định về ngôi thứ ba khác giới. Nhắc lại từ nối eres trong câu hỏi, câu trả lời là no es, thay đổi cả ngôi VÀ giới trong một thẻ.', id: 'Pertanyaan orang kedua dan jawaban negatif tentang orang ketiga dengan gender berbeda. Mengingat kembali kata penghubung eres dalam pertanyaan, jawabannya adalah no es, perubahan orang DAN gender dalam satu kartu.', tr: 'İkinci kişiye bir soru ve farklı cinsiyetten üçüncü kişi hakkında olumsuz bir yanıt. Sorudaki eres bağlacının hatırlatılması, cevap no es’tir, tek bir kartta hem şahıs HEM cinsiyet değişimi.', pl: 'Pytanie do drugiej osoby i przecząca odpowiedź o osobie trzeciej innego rodzaju. Przypomnienie łącznika eres w pytaniu, odpowiedzią jest no es, zmiana osoby I rodzaju w jednej karcie.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsSoyOrEs('Eres') },
      { correct: 'rápida', prompt: genderNumberPromptSingular('rápida', false), d1: genderMismatchSingularToFem('rápida', 'rápido'), d2: numberMismatchToSingular('rápida', 'rápidas') },
      noLowerWordNada,
      { correct: 'es', prompt: T.esAnswerQ, ...esVsSonOrEres('es') },
      { correct: 'rápido', prompt: genderNumberPromptSingular('rápido', true), d1: genderMismatchSingular('rápido', 'rápida', false), d2: numberMismatchToSingular('rápido', 'rápidos') },
    ],
  ),
  'es-e01-s30-somos-rapidas-son-rapidos-tambien': d(
    { ru: 'Мы быстрые (о группе женского рода); они тоже быстрые', uk: 'Ми швидкі (про групу жіночого роду); вони теж швидкі', en: 'We are fast (feminine group); they are fast too', 'pt-BR': 'Somos rápidas; eles também são rápidos', vi: 'Chúng tôi nhanh (nhóm giống cái); họ cũng nhanh', id: 'Kami cepat (kelompok feminin); mereka juga cepat', tr: 'Biz hızlıyız (dişil grup); onlar da hızlı', pl: 'Jesteśmy szybkie (grupa żeńska); oni też są szybcy' },
    { ru: 'Диалог из утверждения о своей группе женского рода первым лицом множественного числа и подтверждения тем же признаком другой группой без говорящего внутри. Recall связки somos, ответ — связка son с recall también, оба лица множественного числа подряд.', uk: 'Діалог зі ствердження про свою групу жіночого роду першою особою множини і підтвердження тією самою ознакою іншою групою без мовця всередині. Recall зв’язки somos, відповідь — зв’язка son з recall también, обидві особи множини підряд.', en: 'A dialogue: a first-person-plural statement about one\'s own feminine group and a confirmation of the same quality by another group without the speaker inside. Recall of the linking word somos, the answer is the linking word son with a recall of también, both plural persons in a row.', 'pt-BR': 'Um diálogo de afirmação sobre o próprio grupo feminino em primeira pessoa do plural e confirmação da mesma qualidade por outro grupo sem quem fala dentro. Recall da ligação somos, a resposta é a ligação son com recall de también, as duas pessoas do plural seguidas.', vi: 'Một cuộc đối thoại: câu khẳng định về nhóm giống cái của mình ở ngôi thứ nhất số nhiều và sự xác nhận cùng đặc điểm đó bởi một nhóm khác không có người nói ở trong. Nhắc lại từ nối somos, câu trả lời là từ nối son với việc nhắc lại también, cả hai ngôi số nhiều liên tiếp.', id: 'Sebuah dialog: pernyataan orang pertama jamak tentang kelompok feminin sendiri dan konfirmasi sifat yang sama oleh kelompok lain tanpa penutur di dalamnya. Mengingat kembali kata penghubung somos, jawabannya adalah kata penghubung son dengan mengingat kembali también, kedua orang jamak berturut-turut.', tr: 'Bir diyalog: kendi dişil grubu hakkında birinci çoğul şahıs ifadesi ve içinde konuşan olmayan başka bir grubun aynı niteliği onaylaması. Somos bağlacının hatırlatılması, cevap también’ın hatırlatılmasıyla birlikte son bağlacıdır, art arda iki çoğul şahıs.', pl: 'Dialog: stwierdzenie o własnej grupie żeńskiej w pierwszej osobie liczby mnogiej i potwierdzenie tej samej cechy przez inną grupę bez mówiącego w środku. Przypomnienie łącznika somos, odpowiedzią jest łącznik son z przypomnieniem también, obie osoby liczby mnogiej pod rząd.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrSoy('Somos', 'Soy') },
      { correct: 'rápidas', prompt: genderNumberPromptPlural('rápidas', false), d1: genderMismatchPluralToFem('rápidas', 'rápidos'), d2: numberMismatchToPlural('rápidas', 'rápida') },
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosOrEs('son') },
      { correct: 'rápidos', prompt: genderNumberPromptPlural('rápidos', true), d1: genderMismatchPlural('rápidos', 'rápidas', false), d2: numberMismatchToPlural('rápidos', 'rápido') },
      tambienWord,
    ],
  ),
});
