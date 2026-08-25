import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для 15
// фраз сессии 33 "Хорошо или плохо" на восьми объяснительных локалях
// (без 'es'). Фабрика d() и общий паттерн distractors на верхнем уровне
// phrase.localizedDetails[locale] скопированы дословно из прецедента сессии
// 30 (es_episode_01_session_30_localized_details_v1.ts) — та же фабрика,
// те же типы, тот же набор person-mismatch хелперов (soy/eres/es/somos/son
// во всех сочетаниях, уже отработанных на recall builtOn [1, 4]).
//
// НОВОЕ для этой сессии — антонимическая пара bueno/malo. Session 30 не
// сталкивала слово с противоположным по смыслу словом, только формы одного
// слова (род/число). Здесь bueno-family используется как правильный ответ,
// malo-family — как semantic_neighbor дистрактор (и наоборот в
// es-e01-s33-no-son-malos, где malos — правильный ответ, buenos — дистрактор).
// Для этого добавлены четыре новых хелпера: wrongWordAntonymSingular (муж./жен.
// формы ед. числа) и wrongWordAntonymPlural (муж./жен. формы мн. числа) —
// параметризованы correct/wrong/correctMeaning/wrongMeaning, текст reason
// переведён дословно из phrases-файла ("Malo означает «плохой» — противоположная
// оценка. Нужно bueno." и симметричные варианты).
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
  eresLowerQ: { ru: 'Какая связка нужна после No для прямого обращения к одному собеседнику?', uk: 'Яка зв’язка потрібна після No для прямого звернення до одного співрозмовника?', en: 'Which linking word is needed after No for speaking directly to one listener?', 'pt-BR': 'Qual ligação é necessária depois de No para falar diretamente com um interlocutor?', vi: 'Từ nối nào cần sau No khi nói trực tiếp với một người nghe?', id: 'Kata penghubung mana yang diperlukan setelah No untuk berbicara langsung kepada satu pendengar?', tr: 'Doğrudan tek bir dinleyiciye hitap etmek için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No do mówienia bezpośrednio do jednego słuchacza?' },
  eresLowerQ: { ru: 'Какая связка нужна после No для прямого обращения к одному собеседнику?', uk: 'Яка зв’язка потрібна після No для прямого звернення до одного співрозмовника?', en: 'Which linking word is needed after No for speaking directly to one listener?', 'pt-BR': 'Qual ligação é necessária depois de No para falar diretamente com um interlocutor?', vi: 'Từ nối nào cần sau No khi nói trực tiếp với một người nghe?', id: 'Kata penghubung mana yang diperlukan setelah No untuk berbicara langsung kepada satu pendengar?', tr: 'Doğrudan tek bir dinleyiciye hitap etmek için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No do mówienia bezpośrednio do jednego słuchacza?' },
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
  goodDefaultQ: { ru: 'Какой признак нужен для хорошей оценки по умолчанию, мужской род?', uk: 'Яка ознака потрібна для хорошої оцінки за замовчуванням, чоловічий рід?', en: 'Which quality fits a good evaluation by default, masculine?', 'pt-BR': 'Qual qualidade cabe a uma avaliação boa por padrão, masculina?', vi: 'Đặc điểm nào phù hợp với đánh giá tốt theo mặc định, giống đực?', id: 'Sifat mana yang cocok untuk penilaian baik secara default, maskulin?', tr: 'Varsayılan olarak iyi bir değerlendirme için hangi nitelik uyar, eril?', pl: 'Jaka cecha pasuje do dobrej oceny domyślnie, rodzaj męski?' },
  goodFemQ: { ru: 'Какой признак нужен для хорошей оценки, женский род?', uk: 'Яка ознака потрібна для хорошої оцінки, жіночий рід?', en: 'Which quality fits a good evaluation, feminine?', 'pt-BR': 'Qual qualidade cabe a uma avaliação boa, feminina?', vi: 'Đặc điểm nào phù hợp với đánh giá tốt, giống cái?', id: 'Sifat mana yang cocok untuk penilaian baik, feminin?', tr: 'İyi bir değerlendirme için hangi nitelik uyar, dişil?', pl: 'Jaka cecha pasuje do dobrej oceny, rodzaj żeński?' },
  goodDefaultPluralQ: { ru: 'Какой признак нужен для хорошей оценки группы по умолчанию, мужской род?', uk: 'Яка ознака потрібна для хорошої оцінки групи за замовчуванням, чоловічий рід?', en: 'Which quality fits a good evaluation of a group by default, masculine?', 'pt-BR': 'Qual qualidade cabe a uma avaliação boa de um grupo por padrão, masculina?', vi: 'Đặc điểm nào phù hợp với đánh giá tốt về nhóm theo mặc định, giống đực?', id: 'Sifat mana yang cocok untuk penilaian baik atas kelompok secara default, maskulin?', tr: 'Varsayılan olarak bir grubun iyi değerlendirilmesi için hangi nitelik uyar, eril?', pl: 'Jaka cecha pasuje do dobrej oceny grupy domyślnie, rodzaj męski?' },
  goodFemPluralQ: { ru: 'Какой признак нужен для хорошей оценки группы, женский род?', uk: 'Яка ознака потрібна для хорошої оцінки групи, жіночий рід?', en: 'Which quality fits a good evaluation of a group, feminine?', 'pt-BR': 'Qual qualidade cabe a uma avaliação boa de um grupo, feminina?', vi: 'Đặc điểm nào phù hợp với đánh giá tốt về nhóm, giống cái?', id: 'Sifat mana yang cocok untuk penilaian baik atas kelompok, feminin?', tr: 'Bir grubun iyi değerlendirilmesi için hangi nitelik uyar, dişil?', pl: 'Jaka cecha pasuje do dobrej oceny grupy, rodzaj żeński?' },
  badDefaultPluralQ: { ru: 'Какой признак нужен для плохой оценки группы по умолчанию, мужской род?', uk: 'Яка ознака потрібна для поганої оцінки групи за замовчуванням, чоловічий рід?', en: 'Which quality fits a bad evaluation of a group by default, masculine?', 'pt-BR': 'Qual qualidade cabe a uma avaliação ruim de um grupo por padrão, masculina?', vi: 'Đặc điểm nào phù hợp với đánh giá xấu về nhóm theo mặc định, giống đực?', id: 'Sifat mana yang cocok untuk penilaian buruk atas kelompok secara default, maskulin?', tr: 'Varsayılan olarak bir grubun kötü değerlendirilmesi için hangi nitelik uyar, eril?', pl: 'Jaka cecha pasuje do złej oceny grupy domyślnie, rodzaj męski?' },
  badFemPluralQ: { ru: 'Какой признак нужен для плохой оценки группы, женский род?', uk: 'Яка ознака потрібна для поганої оцінки групи, жіночий рід?', en: 'Which quality fits a bad evaluation of a group, feminine?', 'pt-BR': 'Qual qualidade cabe a uma avaliação ruim de um grupo, feminina?', vi: 'Đặc điểm nào phù hợp với đánh giá xấu về nhóm, giống cái?', id: 'Sifat mana yang cocok untuk penilaian buruk atas kelompok, feminin?', tr: 'Bir grubun kötü değerlendirilmesi için hangi nitelik uyar, dişil?', pl: 'Jaka cecha pasuje do złej oceny grupy, rodzaj żeński?' },
  badFemQ: { ru: 'Какой признак нужен для плохой оценки, женский род?', uk: 'Яка ознака потрібна для поганої оцінки, жіночий рід?', en: 'Which quality fits a bad evaluation, feminine?', 'pt-BR': 'Qual qualidade cabe a uma avaliação ruim, feminina?', vi: 'Đặc điểm nào phù hợp với đánh giá xấu, giống cái?', id: 'Sifat mana yang cocok untuk penilaian buruk, feminin?', tr: 'Kötü bir değerlendirme için hangi nitelik uyar, dişil?', pl: 'Jaka cecha pasuje do złej oceny, rodzaj żeński?' },
  badDefaultQ: { ru: 'Какой признак нужен для плохой оценки по умолчанию, мужской род?', uk: 'Яка ознака потрібна для поганої оцінки за замовчуванням, чоловічий рід?', en: 'Which quality fits a bad evaluation by default, masculine?', 'pt-BR': 'Qual qualidade cabe a uma avaliação ruim por padrão, masculina?', vi: 'Đặc điểm nào phù hợp với đánh giá xấu theo mặc định, giống đực?', id: 'Sifat mana yang cocok untuk penilaian buruk secara default, maskulin?', tr: 'Varsayılan olarak kötü bir değerlendirme için hangi nitelik uyar, eril?', pl: 'Jaka cecha pasuje do złej oceny domyślnie, rodzaj męski?' },
} as const;

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

// зачем wrongWordAntonymSingular: НОВЫЙ хелпер для сессии 33 — первая
// антонимическая пара курса (bueno «хороший» ↔ malo «плохой»). Session 30
// сталкивала только формы ОДНОГО слова (род/число), здесь дистрактор — другое
// слово с противоположным значением. correctMeaning/wrongMeaning — короткие
// прилагательные-переводы ("good"/"bad" и т.п.) для сборки читаемой фразы на
// каждой локали; reason дословно следует формулировке phrases-файла
// ("Malo означает «плохой» — противоположная оценка. Нужно bueno.").
function wrongWordAntonymSingular(
  correct: string,
  wrong: string,
  wrongMeaning: Record<LocaleWithoutEs, string>,
): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} означает «${wrongMeaning.ru}» — противоположная оценка. Нужно ${correct}.`,
    uk: `${wrong} означає «${wrongMeaning.uk}» — протилежна оцінка. Потрібно ${correct}.`,
    en: `${wrong} means "${wrongMeaning.en}" — the opposite evaluation. You need ${correct}.`,
    'pt-BR': `${wrong} significa "${wrongMeaning['pt-BR']}" — a avaliação oposta. Precisa de ${correct}.`,
    vi: `${wrong} nghĩa là "${wrongMeaning.vi}" — đánh giá ngược lại. Cần ${correct}.`,
    id: `${wrong} berarti "${wrongMeaning.id}" — penilaian yang berlawanan. Perlu ${correct}.`,
    tr: `${wrong}, "${wrongMeaning.tr}" anlamına gelir — ters bir değerlendirmedir. ${correct} gerekir.`,
    pl: `${wrong} znaczy „${wrongMeaning.pl}” — przeciwna ocena. Potrzebne jest ${correct}.`,
  }};
}

// зачем wrongWordAntonymPlural: множественночисленный вариант той же
// антонимической пары (buenos/malos, buenas/malas) — та же формула reason,
// но текст описывает форму множественного числа.
function wrongWordAntonymPlural(
  correct: string,
  wrong: string,
  wrongMeaning: Record<LocaleWithoutEs, string>,
): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} означает «${wrongMeaning.ru}» — противоположная оценка. Нужно ${correct}.`,
    uk: `${wrong} означає «${wrongMeaning.uk}» — протилежна оцінка. Потрібно ${correct}.`,
    en: `${wrong} means "${wrongMeaning.en}" — the opposite evaluation. You need ${correct}.`,
    'pt-BR': `${wrong} significa "${wrongMeaning['pt-BR']}" — a avaliação oposta. Precisa de ${correct}.`,
    vi: `${wrong} nghĩa là "${wrongMeaning.vi}" — đánh giá ngược lại. Cần ${correct}.`,
    id: `${wrong} berarti "${wrongMeaning.id}" — penilaian yang berlawanan. Perlu ${correct}.`,
    tr: `${wrong}, "${wrongMeaning.tr}" anlamına gelir — ters bir değerlendirmedir. ${correct} gerekir.`,
    pl: `${wrong} znaczy „${wrongMeaning.pl}” — przeciwna ocena. Potrzebne jest ${correct}.`,
  }};
}

const MEANING_BAD: Record<LocaleWithoutEs, string> = { ru: 'плохой', uk: 'поганий', en: 'bad', 'pt-BR': 'ruim', vi: 'tệ', id: 'buruk', tr: 'kötü', pl: 'zły' };
const MEANING_BAD_FEM: Record<LocaleWithoutEs, string> = { ru: 'плохая', uk: 'погана', en: 'bad', 'pt-BR': 'ruim', vi: 'tệ', id: 'buruk', tr: 'kötü', pl: 'zła' };
const MEANING_GOOD: Record<LocaleWithoutEs, string> = { ru: 'хороший', uk: 'хороший', en: 'good', 'pt-BR': 'bom', vi: 'tốt', id: 'baik', tr: 'iyi', pl: 'dobry' };
const MEANING_GOOD_PLURAL: Record<LocaleWithoutEs, string> = { ru: 'хорошие', uk: 'хороші', en: 'good', 'pt-BR': 'bons', vi: 'tốt', id: 'baik', tr: 'iyi', pl: 'dobrzy' };
const MEANING_GOOD_FEM_PLURAL: Record<LocaleWithoutEs, string> = { ru: 'хорошие', uk: 'хороші', en: 'good', 'pt-BR': 'boas', vi: 'tốt', id: 'baik', tr: 'iyi', pl: 'dobre' };

// зачем soyVsEresOrEs: зеркало somosVsSonOrSoy — для первого лица
// единственного числа. Скопировано без изменений из прецедента сессии 30,
// т.к. вся грамматика лиц уже отработана и совпадает буква в букву.
function soyVsEresOrEs(target: 'Soy' | 'soy', altSecond: 'Eres' | 'eres' | 'Es' | 'es'): { d1: Reasoned; d2: Reasoned } {
  const eresWord = target === 'Soy' ? 'Eres' : 'eres';
  const esWord = target === 'Soy' ? 'Es' : 'es';
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
    d2: { value: esWord, trapType: 'grammar', reason: {
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
// точное соответствие phrases-файлу для es-e01-s33-es-bueno-somos-buenos-tambien.
// Скопировано из прецедента сессии 30 (esVsSonOrSomos).
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

// зачем somosVsSonOrEs: вариант somosVsSonOrSoy для диалоговых карточек, где
// первая реплика — не soy/eres, а es (третье лицо задаёт тон), поэтому второй
// дистрактор — number_mismatch против es, а не person_mismatch против
// soy/eres — точное соответствие phrases-файлу для
// es-e01-s33-es-bueno-somos-buenos-tambien. Скопировано из прецедента сессии
// 30 (somosVsSonOrEs).
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

// зачем noLowerWordNada: та же lowercase-позиция no (не в начале фразы), но
// с nada/non вместо nunca/non — точное соответствие phrases-файлу для
// es-e01-s33-eres-buena-no-es-mala-q, где no встречается не как реакция и не
// в начале фразы, а перед второй связкой в середине диалога. Скопировано из
// прецедента сессии 30 (noLowerWordNada).
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

export const ES_SESSION_33_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s33-soy-bueno': d(
    { ru: 'Я хороший', uk: 'Я хороший', en: 'I am good', 'pt-BR': 'Sou bom', vi: 'Tôi tốt', id: 'Saya baik', tr: 'Ben iyiyim', pl: 'Jestem dobry' },
    { ru: 'Оценка себя одного, мужской род или по умолчанию. Bueno сохраняет ту же формулу -o/-a, что и caro или rápido — новый словарь, старая грамматика.', uk: 'Оцінка себе одного, чоловічий рід або за замовчуванням. Bueno зберігає ту саму формулу -o/-a, що і caro чи rápido — нова лексика, стара граматика.', en: 'An evaluation of yourself alone, masculine or default. Bueno keeps the same -o/-a formula as caro or rápido — new vocabulary, the same grammar.', 'pt-BR': 'Uma avaliação de si mesmo sozinho, masculina ou padrão. Bueno mantém a mesma fórmula -o/-a de caro ou rápido — vocabulário novo, gramática igual.', vi: 'Đánh giá về một mình bản thân, giống đực hoặc mặc định. Bueno giữ cùng công thức -o/-a như caro hay rápido — từ vựng mới, ngữ pháp cũ.', id: 'Penilaian tentang diri sendiri sendirian, maskulin atau default. Bueno mempertahankan rumus -o/-a yang sama seperti caro atau rápido — kosakata baru, tata bahasa yang sama.', tr: 'Yalnızca kendisi hakkında bir değerlendirme, eril veya varsayılan. Bueno, caro veya rápido ile aynı -o/-a formülünü korur — yeni kelime, aynı dilbilgisi.', pl: 'Ocena samego siebie, rodzaj męski lub domyślny. Bueno zachowuje tę samą formułę -o/-a co caro czy rápido — nowe słownictwo, ta sama gramatyka.' },
    [
      { correct: 'Soy', prompt: T.soyQ, ...soyVsEresOrEs('Soy', 'Eres') },
      { correct: 'bueno', prompt: T.goodDefaultQ, d1: genderMismatchSingular('bueno', 'buena', false), d2: wrongWordAntonymSingular('bueno', 'malo', MEANING_BAD) },
    ],
  ),
  'es-e01-s33-eres-buena': d(
    { ru: 'Ты хорошая', uk: 'Ти хороша', en: 'You are good', 'pt-BR': 'Você é boa', vi: 'Bạn tốt', id: 'Kamu baik', tr: 'Sen iyisin', pl: 'Jesteś dobra' },
    { ru: 'Обращение к одной собеседнице, женский род. Recall связки eres из девятой сессии, признак согласуется формой на -a.', uk: 'Звернення до однієї співрозмовниці, жіночий рід. Recall зв’язки eres із дев’ятої сесії, ознака узгоджується формою на -a.', en: 'Addressing one female listener, feminine. Recall of the linking word eres from the ninth session, the quality agrees with the -a form.', 'pt-BR': 'Falando com uma interlocutora, feminina. Recall da ligação eres da nona sessão, a qualidade concorda com a forma em -a.', vi: 'Nói với một người nghe nữ, giống cái. Nhắc lại từ nối eres từ buổi học thứ chín, đặc điểm hợp với dạng -a.', id: 'Berbicara dengan satu pendengar wanita, feminin. Mengingat kembali kata penghubung eres dari sesi kesembilan, sifat itu sesuai dengan bentuk -a.', tr: 'Bir kadın dinleyiciye hitap etme, dişil. Dokuzuncu oturumdan eres bağlacının hatırlatılması, nitelik -a biçimiyle uyuşur.', pl: 'Zwracanie się do jednej słuchaczki, rodzaj żeński. Przypomnienie łącznika eres z dziewiątej sesji, cecha zgadza się z formą na -a.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsSoyOrEs('Eres') },
      { correct: 'buena', prompt: T.goodFemQ, d1: genderMismatchSingularToFem('buena', 'bueno'), d2: wrongWordAntonymSingular('buena', 'mala', MEANING_BAD_FEM) },
    ],
  ),
  'es-e01-s33-es-bueno': d(
    { ru: 'Он/оно хороший', uk: 'Він/воно хороший', en: 'He/it is good', 'pt-BR': 'Ele/isso é bom', vi: 'Anh ấy/nó tốt', id: 'Dia/itu baik', tr: 'O iyi', pl: 'On/to jest dobry' },
    { ru: 'Оценка кого-то или чего-то третьего, мужской род или по умолчанию. Recall связки es из семнадцатой сессии.', uk: 'Оцінка когось або чогось третього, чоловічий рід або за замовчуванням. Recall зв’язки es із сімнадцятої сесії.', en: 'An evaluation of someone or something else, masculine or default. Recall of the linking word es from the seventeenth session.', 'pt-BR': 'Uma avaliação de alguém ou algo em terceira pessoa, masculina ou padrão. Recall da ligação es da décima sétima sessão.', vi: 'Đánh giá về ai đó hoặc thứ gì đó khác, giống đực hoặc mặc định. Nhắc lại từ nối es từ buổi học thứ mười bảy.', id: 'Penilaian tentang seseorang atau sesuatu yang lain, maskulin atau default. Mengingat kembali kata penghubung es dari sesi ketujuh belas.', tr: 'Başka biri veya bir şey hakkında bir değerlendirme, eril veya varsayılan. On yedinci oturumdan es bağlacının hatırlatılması.', pl: 'Ocena kogoś lub czegoś innego, rodzaj męski lub domyślny. Przypomnienie łącznika es z siedemnastej sesji.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsSonOrEres('Es') },
      { correct: 'bueno', prompt: T.goodDefaultQ, d1: genderMismatchSingular('bueno', 'buena', false), d2: numberMismatchToSingular('bueno', 'buenos') },
    ],
  ),
  'es-e01-s33-somos-buenas': d(
    { ru: 'Мы хорошие (о группе женского рода)', uk: 'Ми хороші (про групу жіночого роду)', en: 'We are good (feminine group)', 'pt-BR': 'Somos boas', vi: 'Chúng tôi tốt (nhóm giống cái)', id: 'Kami baik (kelompok feminin)', tr: 'Biz iyiyiz (dişil grup)', pl: 'Jesteśmy dobre (grupa żeńska)' },
    { ru: 'Оценка своей группы женского рода, включающей говорящую. Recall связки somos из двадцать пятой сессии, полное согласование по роду и числу.', uk: 'Оцінка своєї групи жіночого роду, що включає мовицю. Recall зв’язки somos із двадцять п’ятої сесії, повне узгодження за родом і числом.', en: 'An evaluation of one\'s own feminine group that includes the speaker. Recall of the linking word somos from the twenty-fifth session, full agreement in gender and number.', 'pt-BR': 'Uma avaliação do próprio grupo feminino que inclui quem fala. Recall da ligação somos da vigésima quinta sessão, concordância total de gênero e número.', vi: 'Đánh giá về nhóm giống cái của mình gồm cả người nói. Nhắc lại từ nối somos từ buổi học thứ hai mươi lăm, hợp đầy đủ về giới và số.', id: 'Penilaian tentang kelompok feminin sendiri yang mencakup penutur. Mengingat kembali kata penghubung somos dari sesi kedua puluh lima, kesesuaian penuh gender dan jumlah.', tr: 'Konuşanı da içeren kendi dişil grubunun değerlendirilmesi. Yirmi beşinci oturumdan somos bağlacının hatırlatılması, cinsiyet ve sayıda tam uyum.', pl: 'Ocena własnej grupy żeńskiej, obejmującej mówiącą. Przypomnienie łącznika somos z dwudziestej piątej sesji, pełna zgodność rodzaju i liczby.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrSoy('Somos', 'Soy') },
      { correct: 'buenas', prompt: T.goodFemPluralQ, d1: genderMismatchPluralToFem('buenas', 'buenos'), d2: numberMismatchToPlural('buenas', 'buena') },
    ],
  ),
  'es-e01-s33-son-buenos': d(
    { ru: 'Они хорошие', uk: 'Вони хороші', en: 'They are good', 'pt-BR': 'São bons', vi: 'Họ tốt', id: 'Mereka baik', tr: 'Onlar iyi', pl: 'Są dobrzy' },
    { ru: 'Оценка группы без говорящего внутри, мужской род или по умолчанию. Recall связки son из двадцать седьмой сессии.', uk: 'Оцінка групи без мовця всередині, чоловічий рід або за замовчуванням. Recall зв’язки son із двадцять сьомої сесії.', en: 'An evaluation of a group without the speaker inside, masculine or default. Recall of the linking word son from the twenty-seventh session.', 'pt-BR': 'Uma avaliação de um grupo sem quem fala dentro, masculina ou padrão. Recall da ligação son da vigésima sétima sessão.', vi: 'Đánh giá về nhóm không có người nói ở trong, giống đực hoặc mặc định. Nhắc lại từ nối son từ buổi học thứ hai mươi bảy.', id: 'Penilaian tentang kelompok tanpa penutur di dalamnya, maskulin atau default. Mengingat kembali kata penghubung son dari sesi kedua puluh tujuh.', tr: 'İçinde konuşan olmayan bir grubun değerlendirilmesi, eril veya varsayılan. Yirmi yedinci oturumdan son bağlacının hatırlatılması.', pl: 'Ocena grupy bez mówiącego w środku, rodzaj męski lub domyślny. Przypomnienie łącznika son z dwudziestej siódmej sesji.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      { correct: 'buenos', prompt: T.goodDefaultPluralQ, d1: genderMismatchPlural('buenos', 'buenas', false), d2: numberMismatchToPlural('buenos', 'bueno') },
    ],
  ),
  'es-e01-s33-no-soy-bueno': d(
    { ru: 'Я не хороший', uk: 'Я не хороший', en: 'I am not good', 'pt-BR': 'Não sou bom', vi: 'Tôi không tốt', id: 'Saya tidak baik', tr: 'Ben iyi değilim', pl: 'Nie jestem dobry' },
    { ru: 'Отрицание оценки себя одного. No встаёт перед soy, признак не меняется от отрицания. Recall отрицательной формы из первой сессии.', uk: 'Заперечення оцінки себе одного. No стає перед soy, ознака не змінюється від заперечення. Recall заперечної форми з першої сесії.', en: 'Negation of the evaluation of oneself alone. No comes before soy, and the quality does not change with negation. Recall of the negative form from the first session.', 'pt-BR': 'Negação da avaliação de si mesmo sozinho. No vem antes de soy, e a qualidade não muda com a negação. Recall da forma negativa da primeira sessão.', vi: 'Phủ định đánh giá về một mình bản thân. No đứng trước soy, và đặc điểm không đổi khi phủ định. Nhắc lại dạng phủ định từ buổi học đầu tiên.', id: 'Negasi penilaian tentang diri sendiri sendirian. No berada sebelum soy, dan sifat itu tidak berubah dengan negasi. Mengingat kembali bentuk negatif dari sesi pertama.', tr: 'Yalnızca kendisi hakkındaki değerlendirmenin olumsuzlanması. No, soy’dan önce gelir ve nitelik olumsuzlamayla değişmez. İlk oturumdan olumsuz biçimin hatırlatılması.', pl: 'Zaprzeczenie oceny samego siebie. No stoi przed soy, a cecha nie zmienia się przez przeczenie. Przypomnienie formy przeczącej z pierwszej sesji.' },
    [
      negationWordNada,
      { correct: 'soy', prompt: T.soyLowerQ, ...soyVsEresOrEs('soy', 'eres') },
      { correct: 'bueno', prompt: T.goodDefaultQ, d1: genderMismatchSingular('bueno', 'buena', false), d2: wrongWordAntonymSingular('bueno', 'malo', MEANING_BAD) },
    ],
  ),
  'es-e01-s33-no-es-buena': d(
    { ru: 'Она не хорошая', uk: 'Вона не хороша', en: 'She is not good', 'pt-BR': 'Ela não é boa', vi: 'Cô ấy không tốt', id: 'Dia tidak baik', tr: 'O iyi değil', pl: 'Ona nie jest dobra' },
    { ru: 'Отрицание оценки третьего лица женского рода. No встаёт перед es, признак не меняется от отрицания. Recall отрицательной формы из второй и девятнадцатой сессий.', uk: 'Заперечення оцінки третьої особи жіночого роду. No стає перед es, ознака не змінюється від заперечення. Recall заперечної форми з другої та дев’ятнадцятої сесій.', en: 'Negation of the evaluation of a third person, feminine. No comes before es, and the quality does not change with negation. Recall of the negative form from the second and nineteenth sessions.', 'pt-BR': 'Negação da avaliação de uma terceira pessoa, feminina. No vem antes de es, e a qualidade não muda com a negação. Recall da forma negativa da segunda e décima nona sessões.', vi: 'Phủ định đánh giá về ngôi thứ ba, giống cái. No đứng trước es, và đặc điểm không đổi khi phủ định. Nhắc lại dạng phủ định từ buổi học thứ hai và mười chín.', id: 'Negasi penilaian tentang orang ketiga, feminin. No berada sebelum es, dan sifat itu tidak berubah dengan negasi. Mengingat kembali bentuk negatif dari sesi kedua dan kesembilan belas.', tr: 'Üçüncü kişi hakkındaki değerlendirmenin olumsuzlanması, dişil. No, es’ten önce gelir ve nitelik olumsuzlamayla değişmez. İkinci ve on dokuzuncu oturumlardan olumsuz biçimin hatırlatılması.', pl: 'Zaprzeczenie oceny osoby trzeciej, rodzaj żeński. No stoi przed es, a cecha nie zmienia się przez przeczenie. Przypomnienie formy przeczącej z drugiej i dziewiętnastej sesji.' },
    [
      negationWordNunca,
      { correct: 'es', prompt: T.esLowerQ, ...esVsSonOrEres('es') },
      { correct: 'buena', prompt: T.goodFemQ, d1: genderMismatchSingularToFem('buena', 'bueno'), d2: wrongWordAntonymSingular('buena', 'mala', MEANING_BAD_FEM) },
    ],
  ),
  'es-e01-s33-no-somos-buenos': d(
    { ru: 'Мы не хорошие', uk: 'Ми не хороші', en: 'We are not good', 'pt-BR': 'Não somos bons', vi: 'Chúng tôi không tốt', id: 'Kami tidak baik', tr: 'Biz iyi değiliz', pl: 'Nie jesteśmy dobrzy' },
    { ru: 'Отрицание оценки своей группы мужского рода или смешанной по умолчанию. No встаёт перед somos, признак сохраняет окончание -os.', uk: 'Заперечення оцінки своєї групи чоловічого роду або змішаної за замовчуванням. No стає перед somos, ознака зберігає закінчення -os.', en: 'Negation of the evaluation of one\'s own masculine or default-mixed group. No comes before somos, and the quality keeps the -os ending.', 'pt-BR': 'Negação da avaliação do próprio grupo masculino ou misto por padrão. No vem antes de somos, e a qualidade mantém a terminação -os.', vi: 'Phủ định đánh giá về nhóm giống đực hoặc nhóm hỗn hợp mặc định của mình. No đứng trước somos, và đặc điểm giữ đuôi -os.', id: 'Negasi penilaian tentang kelompok maskulin atau campuran default milik sendiri. No berada sebelum somos, dan sifat itu mempertahankan akhiran -os.', tr: 'Kendi eril veya varsayılan karma grubunun değerlendirilmesinin olumsuzlanması. No, somos’tan önce gelir ve nitelik -os sonunu korur.', pl: 'Zaprzeczenie oceny własnej grupy męskiej lub domyślnie mieszanej. No stoi przed somos, a cecha zachowuje końcówkę -os.' },
    [
      negationWordNada,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos', 'soy') },
      { correct: 'buenos', prompt: T.goodDefaultPluralQ, d1: genderMismatchPlural('buenos', 'buenas', false), d2: numberMismatchToPlural('buenos', 'bueno') },
    ],
  ),
  'es-e01-s33-no-son-malos': d(
    { ru: 'Они не плохие', uk: 'Вони не погані', en: 'They are not bad', 'pt-BR': 'Não são ruins', vi: 'Họ không tệ', id: 'Mereka tidak buruk', tr: 'Onlar kötü değil', pl: 'Nie są źli' },
    { ru: 'Отрицание оценки чужой группы через антоним malo — признак, что противоположная оценка тоже подчиняется той же формуле -o/-a/-os/-as.', uk: 'Заперечення оцінки чужої групи через антонім malo — ознака, що протилежна оцінка теж підпорядковується тій самій формулі -o/-a/-os/-as.', en: 'Negation of the evaluation of another group via the antonym malo — a sign that the opposite evaluation also follows the same -o/-a/-os/-as formula.', 'pt-BR': 'Negação da avaliação de outro grupo via o antônimo malo — um sinal de que a avaliação oposta também segue a mesma fórmula -o/-a/-os/-as.', vi: 'Phủ định đánh giá về nhóm khác qua từ trái nghĩa malo — dấu hiệu cho thấy đánh giá ngược lại cũng theo cùng công thức -o/-a/-os/-as.', id: 'Negasi penilaian tentang kelompok lain melalui antonim malo — tanda bahwa penilaian yang berlawanan juga mengikuti rumus -o/-a/-os/-as yang sama.', tr: 'Malo zıt anlamlısı aracılığıyla başka bir grubun değerlendirilmesinin olumsuzlanması — ters değerlendirmenin de aynı -o/-a/-os/-as formülünü izlediğinin bir işareti.', pl: 'Zaprzeczenie oceny innej grupy przez antonim malo — znak, że przeciwna ocena też podlega tej samej formule -o/-a/-os/-as.' },
    [
      negationWordNunca,
      { correct: 'son', prompt: T.sonQ, ...sonVsSomosOrEs('son') },
      { correct: 'malos', prompt: T.badDefaultPluralQ, d1: genderMismatchPlural('malos', 'malas', false), d2: wrongWordAntonymPlural('malos', 'buenos', MEANING_GOOD_PLURAL) },
    ],
  ),
  'es-e01-s33-soy-bueno-eres-buena-tambien': d(
    { ru: 'Я хороший; ты тоже хорошая', uk: 'Я хороший; ти теж хороша', en: 'I am good; you are good too', 'pt-BR': 'Sou bom; você também é boa', vi: 'Tôi tốt; bạn cũng tốt', id: 'Saya baik; kamu juga baik', tr: 'Ben iyiyim; sen de iyisin', pl: 'Jestem dobry; ty też jesteś dobra' },
    { ru: 'Диалог из утверждения о себе первым лицом и подтверждения тем же признаком вторым лицом. Recall связки soy, ответ — связка eres с recall también.', uk: 'Діалог зі ствердження про себе першою особою і підтвердження тією самою ознакою другою особою. Recall зв’язки soy, відповідь — зв’язка eres з recall también.', en: 'A dialogue: a first-person statement about oneself and a second-person confirmation of the same quality. Recall of the linking word soy, the answer is the linking word eres with a recall of también.', 'pt-BR': 'Um diálogo de afirmação sobre si mesmo em primeira pessoa e confirmação da mesma qualidade em segunda pessoa. Recall da ligação soy, a resposta é a ligação eres com recall de también.', vi: 'Một cuộc đối thoại: câu khẳng định về bản thân ở ngôi thứ nhất và sự xác nhận cùng đặc điểm đó ở ngôi thứ hai. Nhắc lại từ nối soy, câu trả lời là từ nối eres với việc nhắc lại también.', id: 'Sebuah dialog: pernyataan orang pertama tentang diri sendiri dan konfirmasi orang kedua atas sifat yang sama. Mengingat kembali kata penghubung soy, jawabannya adalah kata penghubung eres dengan mengingat kembali también.', tr: 'Bir diyalog: kendisi hakkında birinci şahıs ifadesi ve ikinci şahsın aynı niteliği onaylaması. Soy bağlacının hatırlatılması, cevap también’ın hatırlatılmasıyla birlikte eres bağlacıdır.', pl: 'Dialog: stwierdzenie o sobie w pierwszej osobie i potwierdzenie tej samej cechy w drugiej osobie. Przypomnienie łącznika soy, odpowiedzią jest łącznik eres z przypomnieniem también.' },
    [
      { correct: 'Soy', prompt: T.soyQ, ...soyVsEresOrEs('Soy', 'Eres') },
      { correct: 'bueno', prompt: T.goodDefaultQ, d1: genderMismatchSingular('bueno', 'buena', false), d2: wrongWordAntonymSingular('bueno', 'malo', MEANING_BAD) },
      { correct: 'eres', prompt: T.eresAnswerQ, ...eresVsSoyOrEs('eres') },
      { correct: 'buena', prompt: T.goodFemQ, d1: genderMismatchSingularToFem('buena', 'bueno'), d2: wrongWordAntonymSingular('buena', 'mala', MEANING_BAD_FEM) },
      tambienWord,
    ],
  ),
  'es-e01-s33-es-bueno-somos-buenos-tambien': d(
    { ru: 'Он хороший; мы тоже хорошие', uk: 'Він хороший; ми теж хороші', en: 'He is good; we are good too', 'pt-BR': 'Ele é bom; nós também somos bons', vi: 'Anh ấy tốt; chúng tôi cũng tốt', id: 'Dia baik; kami juga baik', tr: 'O iyi; biz de iyiyiz', pl: 'On jest dobry; my też jesteśmy dobrzy' },
    { ru: 'Диалог из утверждения о третьем лице и подтверждения тем же признаком собственной группой. Recall связки es, ответ — связка somos с recall también.', uk: 'Діалог зі ствердження про третю особу і підтвердження тією самою ознакою власною групою. Recall зв’язки es, відповідь — зв’язка somos з recall también.', en: 'A dialogue: a statement about a third person and a confirmation of the same quality by one\'s own group. Recall of the linking word es, the answer is the linking word somos with a recall of también.', 'pt-BR': 'Um diálogo de afirmação sobre uma terceira pessoa e confirmação da mesma qualidade pelo próprio grupo. Recall da ligação es, a resposta é a ligação somos com recall de también.', vi: 'Một cuộc đối thoại: câu khẳng định về người thứ ba và sự xác nhận cùng đặc điểm đó bởi nhóm của mình. Nhắc lại từ nối es, câu trả lời là từ nối somos với việc nhắc lại también.', id: 'Sebuah dialog: pernyataan tentang orang ketiga dan konfirmasi sifat yang sama oleh kelompok sendiri. Mengingat kembali kata penghubung es, jawabannya adalah kata penghubung somos dengan mengingat kembali también.', tr: 'Bir diyalog: üçüncü kişi hakkında bir ifade ve kendi grubunun aynı niteliği onaylaması. Es bağlacının hatırlatılması, cevap también’ın hatırlatılmasıyla birlikte somos bağlacıdır.', pl: 'Dialog: stwierdzenie o osobie trzeciej i potwierdzenie tej samej cechy przez własną grupę. Przypomnienie łącznika es, odpowiedzią jest łącznik somos z przypomnieniem también.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsSonOrSomos('Es') },
      { correct: 'bueno', prompt: T.goodDefaultQ, d1: genderMismatchSingular('bueno', 'buena', false), d2: wrongWordAntonymSingular('bueno', 'malo', MEANING_BAD) },
      { correct: 'somos', prompt: T.somosQ, ...somosVsSonOrEs('somos') },
      { correct: 'buenos', prompt: T.goodDefaultPluralQ, d1: genderMismatchPlural('buenos', 'buenas', false), d2: numberMismatchToPlural('buenos', 'bueno') },
      tambienWord,
    ],
  ),
  'es-e01-s33-son-buenos-no-soy-bueno-q': d(
    { ru: 'Они хорошие? Нет, я не хороший', uk: 'Вони хороші? Ні, я не хороший', en: 'Are they good? No, I am not good', 'pt-BR': 'São bons? Não, não sou bom', vi: 'Họ tốt à? Không, tôi không tốt', id: 'Apakah mereka baik? Tidak, saya tidak baik', tr: 'Onlar iyi mi? Hayır, ben iyi değilim', pl: 'Są dobrzy? Nie, nie jestem dobry' },
    { ru: 'Вопрос о третьих лицах множественного числа и отрицательный ответ о себе одном. Recall связки son в вопросе, ответ — no soy.', uk: 'Питання про третіх осіб множини і заперечна відповідь про себе одного. Recall зв’язки son у питанні, відповідь — no soy.', en: 'A question about several third persons and a negative answer about the speaker alone. Recall of the linking word son in the question, the answer is no soy.', 'pt-BR': 'Uma pergunta sobre várias terceiras pessoas e uma resposta negativa sobre quem fala sozinho. Recall da ligação son na pergunta, a resposta é no soy.', vi: 'Một câu hỏi về nhiều người thứ ba và câu trả lời phủ định về một mình người nói. Nhắc lại từ nối son trong câu hỏi, câu trả lời là no soy.', id: 'Pertanyaan tentang beberapa orang ketiga dan jawaban negatif tentang penutur sendirian. Mengingat kembali kata penghubung son dalam pertanyaan, jawabannya adalah no soy.', tr: 'Birkaç üçüncü kişi hakkında bir soru ve konuşanın kendisi hakkında olumsuz bir yanıt. Sorudaki son bağlacının hatırlatılması, cevap no soy’dur.', pl: 'Pytanie o kilka osób trzecich i przecząca odpowiedź o samym mówiącym. Przypomnienie łącznika son w pytaniu, odpowiedzią jest no soy.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      { correct: 'buenos', prompt: T.goodDefaultPluralQ, d1: genderMismatchPlural('buenos', 'buenas', false), d2: numberMismatchToPlural('buenos', 'bueno') },
      noReactionWord,
      noLowerWord,
      { correct: 'soy', prompt: T.soyAnswerQ, ...soyVsEresOrEs('soy', 'eres') },
      { correct: 'bueno', prompt: T.goodDefaultQ, d1: genderMismatchSingular('bueno', 'buena', false), d2: wrongWordAntonymSingular('bueno', 'malo', MEANING_BAD) },
    ],
  ),
  'es-e01-s33-eres-buena-no-es-mala-q': d(
    { ru: 'Ты хорошая? Она не плохая', uk: 'Ти хороша? Вона не погана', en: 'Are you good? She is not bad', 'pt-BR': 'Você é boa? Ela não é ruim', vi: 'Bạn tốt à? Cô ấy không tệ', id: 'Apakah kamu baik? Dia tidak buruk', tr: 'Sen iyi misin? O kötü değil', pl: 'Jesteś dobra? Ona nie jest zła' },
    { ru: 'Вопрос ко второму лицу и отрицательный ответ через антоним о третьем лице. Recall связки eres в вопросе, ответ — no es mala, оба признака согласованы по женскому роду.', uk: 'Питання до другої особи і заперечна відповідь через антонім про третю особу. Recall зв’язки eres у питанні, відповідь — no es mala, обидві ознаки узгоджені за жіночим родом.', en: 'A question to the second person and a negative answer via the antonym about a third person. Recall of the linking word eres in the question, the answer is no es mala, both qualities agree in the feminine.', 'pt-BR': 'Uma pergunta em segunda pessoa e uma resposta negativa via o antônimo sobre uma terceira pessoa. Recall da ligação eres na pergunta, a resposta é no es mala, ambas as qualidades concordam no feminino.', vi: 'Một câu hỏi ở ngôi thứ hai và câu trả lời phủ định qua từ trái nghĩa về ngôi thứ ba. Nhắc lại từ nối eres trong câu hỏi, câu trả lời là no es mala, cả hai đặc điểm hợp giống cái.', id: 'Pertanyaan orang kedua dan jawaban negatif melalui antonim tentang orang ketiga. Mengingat kembali kata penghubung eres dalam pertanyaan, jawabannya adalah no es mala, kedua sifat sesuai dengan bentuk feminin.', tr: 'İkinci kişiye bir soru ve zıt anlamlı aracılığıyla üçüncü kişi hakkında olumsuz bir yanıt. Sorudaki eres bağlacının hatırlatılması, cevap no es mala’dır, her iki nitelik de dişil biçimde uyuşur.', pl: 'Pytanie do drugiej osoby i przecząca odpowiedź przez antonim o osobie trzeciej. Przypomnienie łącznika eres w pytaniu, odpowiedzią jest no es mala, obie cechy zgadzają się w rodzaju żeńskim.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsSoyOrEs('Eres') },
      { correct: 'buena', prompt: T.goodFemQ, d1: genderMismatchSingularToFem('buena', 'bueno'), d2: wrongWordAntonymSingular('buena', 'mala', MEANING_BAD_FEM) },
      noLowerWordNada,
      { correct: 'es', prompt: T.esAnswerQ, ...esVsSonOrEres('es') },
      { correct: 'mala', prompt: T.badFemQ, d1: genderMismatchSingularToFem('mala', 'malo'), d2: wrongWordAntonymSingular('mala', 'buena', MEANING_GOOD) },
    ],
  ),
  'es-e01-s33-somos-buenas-son-malas-q': d(
    { ru: 'Мы хорошие? Нет, они плохие', uk: 'Ми хороші? Ні, вони погані', en: 'Are we good? No, they are bad', 'pt-BR': 'Somos boas? Não, eles são ruins', vi: 'Chúng tôi tốt à? Không, họ tệ', id: 'Apakah kami baik? Tidak, mereka buruk', tr: 'Biz iyi miyiz? Hayır, onlar kötü', pl: 'Jesteśmy dobre? Nie, oni są źli' },
    { ru: 'Вопрос о своей группе женского рода и отрицательный ответ через антоним о другой группе. Recall связки somos в вопросе, ответ — son malas, оба признака согласованы по женскому роду множественного числа.', uk: 'Питання про свою групу жіночого роду і заперечна відповідь через антонім про іншу групу. Recall зв’язки somos у питанні, відповідь — son malas, обидві ознаки узгоджені за жіночим родом множини.', en: 'A question about one\'s own feminine group and a negative answer via the antonym about another group. Recall of the linking word somos in the question, the answer is son malas, both qualities agree in the feminine plural.', 'pt-BR': 'Uma pergunta sobre o próprio grupo feminino e uma resposta negativa via o antônimo sobre outro grupo. Recall da ligação somos na pergunta, a resposta é son malas, ambas as qualidades concordam no plural feminino.', vi: 'Một câu hỏi về nhóm giống cái của mình và câu trả lời phủ định qua từ trái nghĩa về một nhóm khác. Nhắc lại từ nối somos trong câu hỏi, câu trả lời là son malas, cả hai đặc điểm hợp số nhiều giống cái.', id: 'Pertanyaan tentang kelompok feminin sendiri dan jawaban negatif melalui antonim tentang kelompok lain. Mengingat kembali kata penghubung somos dalam pertanyaan, jawabannya adalah son malas, kedua sifat sesuai dengan bentuk jamak feminin.', tr: 'Kendi dişil grubu hakkında bir soru ve zıt anlamlı aracılığıyla başka bir grup hakkında olumsuz bir yanıt. Sorudaki somos bağlacının hatırlatılması, cevap son malas’tır, her iki nitelik de dişil çoğul biçimde uyuşur.', pl: 'Pytanie o własną grupę żeńską i przecząca odpowiedź przez antonim o innej grupie. Przypomnienie łącznika somos w pytaniu, odpowiedzią jest son malas, obie cechy zgadzają się w rodzaju żeńskim liczby mnogiej.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrSoy('Somos', 'Soy') },
      { correct: 'buenas', prompt: T.goodFemPluralQ, d1: genderMismatchPluralToFem('buenas', 'buenos'), d2: wrongWordAntonymPlural('buenas', 'malas', { ru: 'плохие', uk: 'погані', en: 'bad', 'pt-BR': 'ruins', vi: 'tệ', id: 'buruk', tr: 'kötü', pl: 'złe' }) },
      noReactionWord,
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosOrEs('son') },
      { correct: 'malas', prompt: T.badFemPluralQ, d1: genderMismatchPlural('malas', 'malos', false), d2: wrongWordAntonymPlural('malas', 'buenas', MEANING_GOOD_FEM_PLURAL) },
    ],
  ),
  'es-e01-s33-no-eres-malo': d(
    { ru: 'Ты не плохой', uk: 'Ти не поганий', en: 'You are not bad', 'pt-BR': 'Você não é ruim', vi: 'Bạn không tệ', id: 'Kamu tidak buruk', tr: 'Sen kötü değilsin', pl: 'Nie jesteś zły' },
    { ru: 'Отрицание оценки собеседника мужского рода через антоним malo. No встаёт перед eres, признак не меняется от отрицания — единственная непокрытая ранее комбинация лица и отрицания в этой сессии.', uk: 'Заперечення оцінки співрозмовника чоловічого роду через антонім malo. No стає перед eres, ознака не змінюється від заперечення — єдина непокрита раніше комбінація особи й заперечення в цій сесії.', en: 'Negation of an evaluation of a masculine listener via the antonym malo. No comes before eres, and the quality does not change with negation — the one person-and-negation combination not yet covered in this session.', 'pt-BR': 'Negação de uma avaliação de um interlocutor masculino via o antônimo malo. No vem antes de eres, e a qualidade não muda com a negação — a única combinação de pessoa e negação ainda não coberta nesta sessão.', vi: 'Phủ định đánh giá về một người nghe nam qua từ trái nghĩa malo. No đứng trước eres, và đặc điểm không đổi khi phủ định — tổ hợp ngôi và phủ định duy nhất chưa được đề cập trong buổi học này.', id: 'Negasi penilaian terhadap pendengar maskulin melalui antonim malo. No berada sebelum eres, dan sifat itu tidak berubah dengan negasi — satu-satunya kombinasi orang dan negasi yang belum dibahas dalam sesi ini.', tr: 'Eril bir dinleyicinin malo zıt anlamlısı aracılığıyla değerlendirilmesinin olumsuzlanması. No, eres’ten önce gelir ve nitelik olumsuzlamayla değişmez — bu oturumda henüz ele alınmamış tek şahıs ve olumsuzlama kombinasyonu.', pl: 'Zaprzeczenie oceny słuchacza rodzaju męskiego przez antonim malo. No stoi przed eres, a cecha nie zmienia się przez przeczenie — jedyna nieomówiona wcześniej kombinacja osoby i przeczenia w tej sesji.' },
    [
      negationWordNada,
      { correct: 'eres', prompt: T.eresLowerQ, ...eresVsSoyOrEs('eres') },
      { correct: 'malo', prompt: T.badDefaultQ, d1: genderMismatchSingular('malo', 'mala', false), d2: wrongWordAntonymSingular('malo', 'bueno', MEANING_GOOD) },
    ],
  ),
});
