import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-28): ручной перевод и разбор для 15
// фраз сессии 34 "Одинаковое и разное" на восьми объяснительных локалях
// (без 'es'). Фабрика d() и общий паттерн distractors на верхнем уровне
// phrase.localizedDetails[locale] скопированы дословно из прецедента сессии
// 33 (es_episode_01_session_33_localized_details_v1.ts) — та же фабрика,
// те же типы, тот же набор person-mismatch хелперов (soy/eres/es/somos/son
// во всех сочетаниях, уже отработанных на recall builtOn [33]).
//
// НОВОЕ для этой сессии — неизменяемое прилагательное diferente и его
// противопоставление уже известному igual (сессия 14, «всё равно»).
// invariableAdjectiveWronglyInflected — новый хелпер для формы -a у
// неизменяемого прилагательного (аналог genderMismatchSingular, но для
// класса без родовых форм — diferenta/iguala не существуют). Хелперы
// wrongWordAntonymSingular/Plural скопированы из сессии 33 без изменений —
// diferente/igual та же антонимическая структура, что bueno/malo.
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
  soyAnswerQ: { ru: 'Какой связкой ответить про себя одного?', uk: 'Якою зв’язкою відповісти про себе одного?', en: 'Which linking word answers about yourself alone?', 'pt-BR': 'Qual ligação responde só sobre você mesmo?', vi: 'Từ nối nào trả lời chỉ về bản thân?', id: 'Kata penghubung mana yang menjawab hanya tentang diri sendiri?', tr: 'Yalnızca kendin hakkında hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada tylko o sobie samym?' },
  eresQ: { ru: 'Какая связка нужна для прямого обращения к одному собеседнику?', uk: 'Яка зв’язка потрібна для прямого звернення до одного співрозмовника?', en: 'Which linking word fits speaking directly to one listener?', 'pt-BR': 'Qual ligação cabe para falar diretamente com um interlocutor?', vi: 'Từ nối nào phù hợp khi nói trực tiếp với một người nghe?', id: 'Kata penghubung mana yang cocok untuk berbicara langsung kepada satu pendengar?', tr: 'Doğrudan tek bir dinleyiciye hitap etmek için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do mówienia bezpośrednio do jednego słuchacza?' },
  esQ: { ru: 'Какая связка нужна для безличной оценки?', uk: 'Яка зв’язка потрібна для безособової оцінки?', en: 'Which linking word fits an impersonal evaluation?', 'pt-BR': 'Qual ligação cabe a uma avaliação impessoal?', vi: 'Từ nối nào phù hợp với đánh giá phi cá nhân?', id: 'Kata penghubung mana yang cocok untuk penilaian impersonal?', tr: 'Kişisiz bir değerlendirme için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do bezosobowej oceny?' },
  esLowerQ: { ru: 'Какая связка нужна после No для безличной оценки?', uk: 'Яка зв’язка потрібна після No для безособової оцінки?', en: 'Which linking word is needed after No for an impersonal evaluation?', 'pt-BR': 'Qual ligação é necessária depois de No para uma avaliação impessoal?', vi: 'Từ nối nào cần sau No cho đánh giá phi cá nhân?', id: 'Kata penghubung mana yang diperlukan setelah No untuk penilaian impersonal?', tr: 'Kişisiz bir değerlendirme için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No dla bezosobowej oceny?' },
  esAnswerQ: { ru: 'Какой связкой ответить безлично?', uk: 'Якою зв’язкою відповісти безособово?', en: 'Which linking word answers impersonally?', 'pt-BR': 'Qual ligação responde de forma impessoal?', vi: 'Từ nối nào trả lời phi cá nhân?', id: 'Kata penghubung mana yang menjawab secara impersonal?', tr: 'Kişisiz olarak hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada bezosobowo?' },
  somosQ: { ru: 'Какая связка нужна для группы, включая говорящего?', uk: 'Яка зв’язка потрібна для групи, включно з мовцем?', en: 'Which linking word fits a group that includes the speaker?', 'pt-BR': 'Qual ligação cabe a um grupo que inclui quem fala?', vi: 'Từ nối nào phù hợp với nhóm gồm cả người nói?', id: 'Kata penghubung mana yang cocok untuk kelompok yang mencakup penutur?', tr: 'Konuşanı da içeren bir grup için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do grupy, w tym do mówiącego?' },
  somosLowerQ: { ru: 'Какая связка нужна после No для группы, включая говорящего?', uk: 'Яка зв’язка потрібна після No для групи, включно з мовцем?', en: 'Which linking word is needed after No for a group that includes the speaker?', 'pt-BR': 'Qual ligação é necessária depois de No para um grupo que inclui quem fala?', vi: 'Từ nối nào cần sau No cho nhóm gồm cả người nói?', id: 'Kata penghubung mana yang diperlukan setelah No untuk kelompok yang mencakup penutur?', tr: 'Konuşanı da içeren bir grup için No’dan sonra hangi bağlaç gerekir?', pl: 'Jaki łącznik jest potrzebny po No dla grupy, w tym mówiącego?' },
  sonQ: { ru: 'Какая связка нужна для группы БЕЗ говорящего внутри?', uk: 'Яка зв’язка потрібна для групи БЕЗ мовця всередині?', en: 'Which linking word fits a group WITHOUT the speaker inside?', 'pt-BR': 'Qual ligação cabe a um grupo SEM quem fala dentro?', vi: 'Từ nối nào phù hợp với nhóm KHÔNG có người nói ở trong?', id: 'Kata penghubung mana yang cocok untuk kelompok TANPA penutur di dalamnya?', tr: 'İçinde konuşan OLMAYAN bir grup için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do grupy BEZ mówiącego w środku?' },
  sonAnswerQ: { ru: 'Какой связкой ответить про группу без говорящего?', uk: 'Якою зв’язкою відповісти про групу без мовця?', en: 'Which linking word answers about a group without the speaker?', 'pt-BR': 'Qual ligação responde sobre um grupo sem quem fala?', vi: 'Từ nối nào trả lời về nhóm không có người nói?', id: 'Kata penghubung mana yang menjawab tentang kelompok tanpa penutur?', tr: 'Konuşan olmayan bir grup hakkında hangi bağlaç yanıt verir?', pl: 'Jaki łącznik odpowiada o grupie bez mówiącego?' },
  noQ: { ru: 'Каким словом начать отрицание?', uk: 'Яким словом почати заперечення?', en: 'Which word starts the negation?', 'pt-BR': 'Qual palavra inicia a negação?', vi: 'Từ nào bắt đầu lời phủ định?', id: 'Kata mana yang memulai negasi?', tr: 'Olumsuzlama hangi kelimeyle başlar?', pl: 'Jakim słowem zacząć przeczenie?' },
  noReactionQ: { ru: 'Каким коротким словом подтвердить отказ?', uk: 'Яким коротким словом підтвердити відмову?', en: 'Which short word confirms the refusal?', 'pt-BR': 'Qual palavra curta confirma a recusa?', vi: 'Từ ngắn nào xác nhận lời từ chối?', id: 'Kata pendek mana yang menegaskan penolakan?', tr: 'Reddi hangi kısa kelime onaylar?', pl: 'Jakie krótkie słowo potwierdza odmowę?' },
  noSecondQ: { ru: 'Каким словом отрицать связку во втором ответе?', uk: 'Яким словом заперечити зв’язку у другій відповіді?', en: 'Which word negates the linking word in the second answer?', 'pt-BR': 'Qual palavra nega a ligação na segunda resposta?', vi: 'Từ nào phủ định từ nối trong câu trả lời thứ hai?', id: 'Kata mana yang menegasikan kata penghubung dalam jawaban kedua?', tr: 'İkinci yanıttaki bağlacı hangi kelime olumsuzlar?', pl: 'Jakie słowo zaprzecza łącznikowi w drugiej odpowiedzi?' },
  tambienQ: { ru: 'Каким словом присоединиться к чужому признаку?', uk: 'Яким словом приєднатися до чужої ознаки?', en: 'Which word joins in with someone else\'s quality?', 'pt-BR': 'Qual palavra se junta à qualidade de outra pessoa?', vi: 'Từ nào để đồng tình với đặc điểm của người khác?', id: 'Kata mana yang bergabung dengan sifat orang lain?', tr: 'Başkasının niteliğine hangi kelime katılır?', pl: 'Jakie słowo dołącza się do cudzej cechy?' },
  diferenteDefaultQ: { ru: 'Какой признак нужен для сравнения «другой», независимо от рода?', uk: 'Яка ознака потрібна для порівняння «інший», незалежно від роду?', en: 'Which quality fits the comparison "different", regardless of gender?', 'pt-BR': 'Qual qualidade cabe à comparação "diferente", independente do gênero?', vi: 'Đặc điểm nào phù hợp với so sánh "khác", bất kể giống?', id: 'Sifat mana yang cocok untuk perbandingan "berbeda", terlepas dari gender?', tr: '"Farklı" karşılaştırması için hangi nitelik uyar, cinsiyetten bağımsız?', pl: 'Jaka cecha pasuje do porównania „inny”, niezależnie od rodzaju?' },
  diferentesPluralQ: { ru: 'Какой признак нужен для сравнения группы «разные»?', uk: 'Яка ознака потрібна для порівняння групи «різні»?', en: 'Which quality fits the comparison of a group, "different"?', 'pt-BR': 'Qual qualidade cabe à comparação de um grupo, "diferentes"?', vi: 'Đặc điểm nào phù hợp với so sánh một nhóm, "khác nhau"?', id: 'Sifat mana yang cocok untuk perbandingan kelompok, "berbeda"?', tr: 'Bir grubun karşılaştırması için hangi nitelik uyar, "farklı"?', pl: 'Jaka cecha pasuje do porównania grupy, „różni”?' },
  igualQ: { ru: 'Какое слово называет безразличие «всё равно»?', uk: 'Яке слово називає байдужість «все одно»?', en: 'Which word names the indifference "all the same"?', 'pt-BR': 'Qual palavra nomeia a indiferença "tanto faz"?', vi: 'Từ nào gọi tên sự thờ ơ "cũng như nhau"?', id: 'Kata mana yang menyebutkan ketidakpedulian "sama saja"?', tr: 'Kayıtsızlığı adlandıran kelime hangisi, "aynı şey"?', pl: 'Jakie słowo nazywa obojętność „wszystko jedno”?' },
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

function numberMismatchToSingular(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма множественного числа. Про одно нужна форма единственного числа: ${correct}.`,
    uk: `${wrong} — форма множини. Про одне потрібна форма однини: ${correct}.`,
    en: `${wrong} is the plural form. Talking about one needs the singular form: ${correct}.`,
    'pt-BR': `${wrong} é a forma plural. Falando de um precisa da forma singular: ${correct}.`,
    vi: `${wrong} là dạng số nhiều. Nói về một cần dạng số ít: ${correct}.`,
    id: `${wrong} adalah bentuk jamak. Berbicara tentang satu memerlukan bentuk tunggal: ${correct}.`,
    tr: `${wrong} çoğul biçimdir. Bir şey hakkında konuşmak tekil biçim gerektirir: ${correct}.`,
    pl: `${wrong} to forma mnoga. Mówienie o jednej rzeczy wymaga formy pojedynczej: ${correct}.`,
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

// зачем invariableAdjectiveWronglyInflected: НОВЫЙ хелпер для сессии 34 —
// класс неизменяемых прилагательных (diferente/igual) не имеет родовых
// форм вообще, в отличие от genderMismatchSingular (сессия 33, -o/-a).
// Дистрактор здесь — несуществующая форма на -a (diferenta/iguala).
function invariableAdjectiveWronglyInflected(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${correct} не меняется по роду — формы ${wrong} не существует.`,
    uk: `${correct} не змінюється за родом — форми ${wrong} не існує.`,
    en: `${correct} does not change by gender — the form ${wrong} does not exist.`,
    'pt-BR': `${correct} não muda por gênero — a forma ${wrong} não existe.`,
    vi: `${correct} không đổi theo giống — dạng ${wrong} không tồn tại.`,
    id: `${correct} tidak berubah menurut gender — bentuk ${wrong} tidak ada.`,
    tr: `${correct} cinsiyete göre değişmez — ${wrong} biçimi yoktur.`,
    pl: `${correct} nie zmienia się według rodzaju — forma ${wrong} nie istnieje.`,
  }};
}

// зачем wrongWordAntonymSingular/Plural: скопированы из прецедента сессии
// 33 без изменений — та же структура антонимической пары, применённая к
// diferente/igual вместо bueno/malo.
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

// зачем wrongWordDifferentClass: НОВЫЙ хелпер для дистракторов из ДРУГОГО
// класса согласования (bueno/malo, -o/-a) внутри фраз этой сессии,
// подтверждающий, что diferente/diferentes принадлежит другому,
// неизменяемому классу — используется в фразе es-e01-s34-somos-diferentes-son-buenos-q.
function wrongWordDifferentClass(
  correct: string,
  wrong: string,
  wrongMeaning: Record<LocaleWithoutEs, string>,
): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} означает «${wrongMeaning.ru}» — общая оценка, а не сравнение. Нужно ${correct}.`,
    uk: `${wrong} означає «${wrongMeaning.uk}» — загальна оцінка, а не порівняння. Потрібно ${correct}.`,
    en: `${wrong} means "${wrongMeaning.en}" — a general evaluation, not a comparison. You need ${correct}.`,
    'pt-BR': `${wrong} significa "${wrongMeaning['pt-BR']}" — uma avaliação geral, não uma comparação. Precisa de ${correct}.`,
    vi: `${wrong} nghĩa là "${wrongMeaning.vi}" — một đánh giá chung, không phải so sánh. Cần ${correct}.`,
    id: `${wrong} berarti "${wrongMeaning.id}" — penilaian umum, bukan perbandingan. Perlu ${correct}.`,
    tr: `${wrong}, "${wrongMeaning.tr}" anlamına gelir — genel bir değerlendirmedir, karşılaştırma değil. ${correct} gerekir.`,
    pl: `${wrong} znaczy „${wrongMeaning.pl}” — ogólna ocena, nie porównanie. Potrzebne jest ${correct}.`,
  }};
}

const MEANING_IGUAL: Record<LocaleWithoutEs, string> = { ru: 'всё равно', uk: 'все одно', en: 'all the same', 'pt-BR': 'tanto faz', vi: 'cũng như nhau', id: 'sama saja', tr: 'aynı şey', pl: 'wszystko jedno' };
const MEANING_IGUALES: Record<LocaleWithoutEs, string> = { ru: 'одинаковые, всё равно', uk: 'однакові, все одно', en: 'all the same', 'pt-BR': 'tanto faz', vi: 'cũng như nhau', id: 'sama saja', tr: 'aynı şey', pl: 'wszystko jedno' };
const MEANING_DIFERENTE: Record<LocaleWithoutEs, string> = { ru: 'другой', uk: 'інший', en: 'different', 'pt-BR': 'diferente', vi: 'khác', id: 'berbeda', tr: 'farklı', pl: 'inny' };
const MEANING_BUENO: Record<LocaleWithoutEs, string> = { ru: 'хороший', uk: 'хороший', en: 'good', 'pt-BR': 'bom', vi: 'tốt', id: 'baik', tr: 'iyi', pl: 'dobry' };
const MEANING_BUENOS: Record<LocaleWithoutEs, string> = { ru: 'хорошие', uk: 'хороші', en: 'good', 'pt-BR': 'bons', vi: 'tốt', id: 'baik', tr: 'iyi', pl: 'dobrzy' };
const MEANING_MALO: Record<LocaleWithoutEs, string> = { ru: 'плохой', uk: 'поганий', en: 'bad', 'pt-BR': 'ruim', vi: 'tệ', id: 'buruk', tr: 'kötü', pl: 'zły' };

function soyVsEresOrEs(target: 'Soy' | 'soy'): { d1: Reasoned; d2: Reasoned } {
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
      ru: `${soyWord} — только о себе одном. Обращение к собеседнику — ${target}.`,
      uk: `${soyWord} — тільки про себе одного. Звернення до співрозмовника — ${target}.`,
      en: `${soyWord} is only about the speaker alone. Addressing the listener needs ${target}.`,
      'pt-BR': `${soyWord} é só sobre quem fala sozinho. Falar com o interlocutor precisa de ${target}.`,
      vi: `${soyWord} chỉ nói về một mình người nói. Nói với người nghe cần ${target}.`,
      id: `${soyWord} hanya tentang penutur sendirian. Berbicara dengan pendengar perlu ${target}.`,
      tr: `${soyWord} yalnızca konuşanın kendisi hakkındadır. Dinleyiciye hitap etmek ${target} gerektirir.`,
      pl: `${soyWord} dotyczy tylko samego mówiącego. Zwracanie się do słuchacza wymaga ${target}.`,
    }},
    d2: { value: esWord, trapType: 'grammar', reason: {
      ru: `${esWord} — о ком-то третьем. Прямое обращение к собеседнику — ${target}.`,
      uk: `${esWord} — про когось третього. Пряме звернення до співрозмовника — ${target}.`,
      en: `${esWord} is about someone else, a third person. Speaking directly to the listener needs ${target}.`,
      'pt-BR': `${esWord} é sobre outra pessoa, terceira pessoa. Falar diretamente com o interlocutor precisa de ${target}.`,
      vi: `${esWord} nói về người thứ ba khác. Nói trực tiếp với người nghe cần ${target}.`,
      id: `${esWord} tentang orang lain, orang ketiga. Berbicara langsung dengan pendengar perlu ${target}.`,
      tr: `${esWord} başka biri, üçüncü kişi hakkındadır. Dinleyiciye doğrudan hitap etmek ${target} gerektirir.`,
      pl: `${esWord} dotyczy kogoś innego, osoby trzeciej. Bezpośrednie zwracanie się do słuchacza wymaga ${target}.`,
    }},
  };
}

function esVsSonOrEres(target: 'Es' | 'es'): { d1: Reasoned; d2: Reasoned } {
  const sonWord = target === 'Es' ? 'Son' : 'son';
  const eresWord = target === 'Es' ? 'Eres' : 'eres';
  return {
    d1: { value: sonWord, trapType: 'grammar', reason: {
      ru: `${sonWord} — про несколько. Про одно — ${target}.`,
      uk: `${sonWord} — про кількох. Про одне — ${target}.`,
      en: `${sonWord} is about several. Talking about one needs ${target}.`,
      'pt-BR': `${sonWord} é sobre vários. Falando de um precisa de ${target}.`,
      vi: `${sonWord} nói về nhiều. Nói về một cần ${target}.`,
      id: `${sonWord} tentang beberapa. Berbicara tentang satu perlu ${target}.`,
      tr: `${sonWord} birkaç şey hakkındadır. Bir şey hakkında konuşmak ${target} gerektirir.`,
      pl: `${sonWord} dotyczy kilku. Mówienie o jednej rzeczy wymaga ${target}.`,
    }},
    d2: { value: eresWord, trapType: 'grammar', reason: {
      ru: `${eresWord} — прямое обращение к собеседнику. Безличная оценка — ${target}.`,
      uk: `${eresWord} — пряме звернення до співрозмовника. Безособова оцінка — ${target}.`,
      en: `${eresWord} addresses the listener directly. An impersonal evaluation needs ${target}.`,
      'pt-BR': `${eresWord} fala diretamente com o interlocutor. Uma avaliação impessoal precisa de ${target}.`,
      vi: `${eresWord} nói trực tiếp với người nghe. Đánh giá phi cá nhân cần ${target}.`,
      id: `${eresWord} berbicara langsung dengan pendengar. Penilaian impersonal perlu ${target}.`,
      tr: `${eresWord} doğrudan dinleyiciye hitap eder. Kişisiz bir değerlendirme ${target} gerektirir.`,
      pl: `${eresWord} zwraca się bezpośrednio do słuchacza. Bezosobowa ocena wymaga ${target}.`,
    }},
  };
}

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

function somosVsSonOrSoy(target: 'Somos' | 'somos'): { d1: Reasoned; d2: Reasoned } {
  const sonWord = target === 'Somos' ? 'Son' : 'son';
  const soyWord = target === 'Somos' ? 'Soy' : 'soy';
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
    d2: { value: soyWord, trapType: 'grammar', reason: {
      ru: `${soyWord} — только о себе одном. Про группу, включая говорящего, — ${target}.`,
      uk: `${soyWord} — тільки про себе одного. Про групу, включно з мовцем, — ${target}.`,
      en: `${soyWord} is only about the speaker alone. A group that includes the speaker needs ${target}.`,
      'pt-BR': `${soyWord} é só sobre quem fala sozinho. Um grupo que inclui quem fala precisa de ${target}.`,
      vi: `${soyWord} chỉ nói về một mình người nói. Nhóm gồm cả người nói cần ${target}.`,
      id: `${soyWord} hanya tentang penutur sendirian. Kelompok yang mencakup penutur perlu ${target}.`,
      tr: `${soyWord} yalnızca konuşanın kendisi hakkındadır. Konuşanı da içeren bir grup ${target} gerektirir.`,
      pl: `${soyWord} dotyczy tylko samego mówiącego. Grupa obejmująca mówiącego wymaga ${target}.`,
    }},
  };
}

// зачем отдельный хелпер (а не переиспользование somosVsSonOrSoy): во фразе
// es-diferente-somos-diferentes-tambien второй ответ — somos, но раскладка
// лица там third→first (Es→Somos), поэтому естественная пара дистракторов —
// son (agreement_person_mismatch) и es (number_mismatch), а не son/soy. Баг
// прошлой версии — вызов esVsSonOrSomos('Es') для слова с correct: 'somos':
// текст ловушек называл целью Es, а не somos, что и ловил гейт
// distractor_feedback_not_pair_specific (Библия, requiredMatch по обеим
// строкам). Здесь текст дистракторов зеркалит верхнеуровневые RAW_PHRASES.
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
      vi: `${esWord} chỉ nói về một. Nhóm gồm cả người nói cần ${target}.`,
      id: `${esWord} hanya tentang satu. Kelompok yang mencakup penutur perlu ${target}.`,
      tr: `${esWord} yalnızca biri hakkındadır. Konuşanı da içeren bir grup ${target} gerektirir.`,
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
  correct: 'No', prompt: T.noQ,
  d1: { value: 'Nada', trapType: 'semantic_neighbor', reason: {
    ru: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', uk: 'Nada — «нічого», окреме слово-предмет. Заперечення зв’язки — No.',
    en: 'Nada means "nothing", a separate word for a thing. Negating the linking word needs No.', 'pt-BR': 'Nada significa "nada", uma palavra separada para uma coisa. Negar a ligação precisa de No.',
    vi: 'Nada nghĩa là "không có gì", một từ riêng chỉ vật. Phủ định từ nối cần No.', id: 'Nada berarti "tidak ada apa-apa", kata terpisah untuk benda. Menegasikan kata penghubung perlu No.',
    tr: 'Nada "hiçbir şey" demektir, bir şey için ayrı bir kelimedir. Bağlacı olumsuzlamak No gerektirir.', pl: 'Nada znaczy „nic”, osobne słowo oznaczające rzecz. Zaprzeczenie łącznika wymaga No.',
  }},
  d2: { value: 'Non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется No.', uk: 'Non — не іспанське слово. В іспанській заперечення пишеться No.',
    en: 'Non is not a Spanish word. Spanish spells the negation No.', 'pt-BR': 'Non não é uma palavra espanhola. Em espanhol a negação se escreve No.',
    vi: 'Non không phải là từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha phủ định viết là No.', id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol negasi ditulis No.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama No olarak yazılır.', pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie zapisuje się No.',
  }},
};

const negationWordNunca: WordSpec = {
  correct: 'No', prompt: T.noQ,
  d1: { value: 'Nunca', trapType: 'semantic_neighbor', reason: {
    ru: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', uk: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — No.',
    en: 'Nunca means "never", about frequency in time. Simple negation needs No.', 'pt-BR': 'Nunca significa "nunca", sobre frequência no tempo. Negação simples precisa de No.',
    vi: 'Nunca nghĩa là "không bao giờ", về tần suất thời gian. Phủ định đơn giản cần No.', id: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Negasi sederhana perlu No.',
    tr: 'Nunca "asla" demektir, zaman sıklığı hakkındadır. Basit olumsuzlama No gerektirir.', pl: 'Nunca znaczy „nigdy”, dotyczy częstotliwości w czasie. Proste przeczenie wymaga No.',
  }},
  d2: { value: 'Non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется No.', uk: 'Non — не іспанське слово. В іспанській заперечення пишеться No.',
    en: 'Non is not a Spanish word. Spanish spells the negation No.', 'pt-BR': 'Non não é uma palavra espanhola. Em espanhol a negação se escreve No.',
    vi: 'Non không phải là từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha phủ định viết là No.', id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol negasi ditulis No.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama No olarak yazılır.', pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie zapisuje się No.',
  }},
};

const noLowerWord: WordSpec = {
  correct: 'no', prompt: T.noSecondQ,
  d1: { value: 'nunca', trapType: 'semantic_neighbor', reason: {
    ru: 'Nunca — «никогда», про частоту во времени. Простое отрицание связки — no.', uk: 'Nunca — «ніколи», про частоту в часі. Просте заперечення зв’язки — no.',
    en: 'Nunca means "never", about frequency in time. Simple negation of the linking word needs no.', 'pt-BR': 'Nunca significa "nunca", sobre frequência no tempo. A negação simples da ligação precisa de no.',
    vi: 'Nunca nghĩa là "không bao giờ", về tần suất thời gian. Phủ định đơn giản của từ nối cần no.', id: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Negasi sederhana kata penghubung perlu no.',
    tr: 'Nunca "asla" demektir, zaman sıklığı hakkındadır. Bağlacın basit olumsuzlaması no gerektirir.', pl: 'Nunca znaczy „nigdy”, dotyczy częstotliwości w czasie. Proste zaprzeczenie łącznika wymaga no.',
  }},
  d2: { value: 'non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется no.', uk: 'Non — не іспанське слово. В іспанській заперечення пишеться no.',
    en: 'Non is not a Spanish word. Spanish spells the negation no.', 'pt-BR': 'Non não é uma palavra espanhola. Em espanhol a negação se escreve no.',
    vi: 'Non không phải là từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha phủ định viết là no.', id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol negasi ditulis no.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama no olarak yazılır.', pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie zapisuje się no.',
  }},
};

const noReactionWord: WordSpec = {
  correct: 'no', prompt: T.noReactionQ,
  d1: { value: 'nada', trapType: 'semantic_neighbor', reason: {
    ru: 'Nada — «ничего», отдельное слово-предмет. Короткая реакция отказа — no.', uk: 'Nada — «нічого», окреме слово-предмет. Коротка реакція відмови — no.',
    en: 'Nada means "nothing", a separate word for a thing. The short refusal reaction is no.', 'pt-BR': 'Nada significa "nada", uma palavra separada para uma coisa. A reação curta de recusa é no.',
    vi: 'Nada nghĩa là "không có gì", một từ riêng chỉ vật. Phản ứng từ chối ngắn là no.', id: 'Nada berarti "tidak ada apa-apa", kata terpisah untuk benda. Reaksi penolakan singkat adalah no.',
    tr: 'Nada "hiçbir şey" demektir, bir şey için ayrı bir kelimedir. Kısa ret tepkisi no’dur.', pl: 'Nada znaczy „nic”, osobne słowo oznaczające rzecz. Krótka reakcja odmowy to no.',
  }},
  d2: { value: 'non', trapType: 'orthographic', reason: {
    ru: 'Non — не испанское слово. В испанском отрицание пишется no.', uk: 'Non — не іспанське слово. В іспанській заперечення пишеться no.',
    en: 'Non is not a Spanish word. Spanish spells the negation no.', 'pt-BR': 'Non não é uma palavra espanhola. Em espanhol a negação se escreve no.',
    vi: 'Non không phải là từ tiếng Tây Ban Nha. Trong tiếng Tây Ban Nha phủ định viết là no.', id: 'Non bukan kata bahasa Spanyol. Dalam bahasa Spanyol negasi ditulis no.',
    tr: 'Non İspanyolca bir kelime değildir. İspanyolcada olumsuzlama no olarak yazılır.', pl: 'Non nie jest hiszpańskim słowem. W hiszpańskim przeczenie zapisuje się no.',
  }},
};

const tambienWord: WordSpec = {
  correct: 'también', prompt: T.tambienQ,
  d1: { value: 'tambien', trapType: 'orthographic', reason: {
    ru: 'Tambien без тильды над é звучал бы и писался бы иначе. Нужна форма с тильдой: también.', uk: 'Tambien без тильди над é звучав би і писався б інакше. Потрібна форма з тильдою: también.',
    en: 'Tambien without the tilde over é would sound and be spelled differently. The needed form has the tilde: también.', 'pt-BR': 'Tambien sem o til sobre é soaria e se escreveria diferente. A forma necessária tem o til: también.',
    vi: 'Tambien không có dấu ngã trên é sẽ phát âm và viết khác. Dạng cần có dấu ngã: también.', id: 'Tambien tanpa tilde di atas é akan terdengar dan dieja berbeda. Bentuk yang diperlukan memiliki tilde: también.',
    tr: 'Tambien, é üzerinde tilde olmadan farklı okunur ve yazılırdı. Gereken biçim tilde ile: también.', pl: 'Tambien bez tyldy nad é brzmiałoby i pisałoby się inaczej. Potrzebna jest forma z tyldą: también.',
  }},
  d2: { value: 'verdad', trapType: 'semantic_neighbor', reason: {
    ru: 'Verdad — «правда», отдельное подтверждение факта, а не присоединение к чужому признаку. Нужно también.', uk: 'Verdad — «правда», окреме підтвердження факту, а не приєднання до чужої ознаки. Потрібно también.',
    en: 'Verdad means "truth", a separate confirmation of a fact, not joining in with someone else\'s quality. You need también.', 'pt-BR': 'Verdad significa "verdade", uma confirmação separada de um fato, não se juntar à qualidade de outra pessoa. Precisa de también.',
    vi: 'Verdad nghĩa là "sự thật", một xác nhận sự việc riêng biệt, không phải đồng tình với đặc điểm của người khác. Cần también.', id: 'Verdad berarti "kebenaran", konfirmasi fakta yang terpisah, bukan bergabung dengan sifat orang lain. Perlu también.',
    tr: 'Verdad "gerçek" demektir, bir gerçeğin ayrı bir onayıdır, başkasının niteliğine katılmak değildir. también gerekir.', pl: 'Verdad znaczy „prawda”, osobne potwierdzenie faktu, a nie dołączenie do cudzej cechy. Potrzebne jest también.',
  }},
};

export const ES_SESSION_34_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s34-soy-diferente': d(
    { ru: 'Я другой', uk: 'Я інший', en: 'I am different', 'pt-BR': 'Sou diferente', vi: 'Tôi khác', id: 'Saya berbeda', tr: 'Ben farklıyım', pl: 'Jestem inny' },
    { ru: 'Оценка себя одного через неизменяемый признак сравнения. Diferente не меняется по роду — та же формула, что у fácil и igual, новый словарь.', uk: 'Оцінка себе одного через незмінну ознаку порівняння. Diferente не змінюється за родом — та сама формула, що і в fácil та igual, нова лексика.', en: 'An evaluation of yourself alone through an invariable comparison quality. Diferente does not change by gender — the same formula as fácil and igual, new vocabulary.', 'pt-BR': 'Avaliação de si mesmo por uma qualidade invariável. Diferente não muda por gênero — mesma fórmula de fácil e igual.', vi: 'Đánh giá về một mình bản thân qua một đặc điểm so sánh bất biến. Diferente không đổi theo giống — cùng công thức như fácil và igual, từ vựng mới.', id: 'Penilaian diri sendiri lewat sifat tak berubah. Diferente tidak berubah menurut gender — rumus sama seperti fácil dan igual.', tr: 'Değişmez bir nitelik ile kendisi hakkında değerlendirme. Diferente cinsiyete göre değişmez — fácil ve igual ile aynı formül.', pl: 'Ocena samego siebie poprzez niezmienną cechę porównania. Diferente nie zmienia się według rodzaju — ta sama formuła co fácil i igual, nowe słownictwo.' },
    [
      { correct: 'Soy', prompt: T.soyQ, ...soyVsEresOrEs('Soy') },
      { correct: 'diferente', prompt: T.diferenteDefaultQ, d1: invariableAdjectiveWronglyInflected('diferente', 'diferenta'), d2: wrongWordAntonymSingular('diferente', 'igual', MEANING_IGUAL) },
    ],
  ),
  'es-e01-s34-eres-diferente': d(
    { ru: 'Ты другой', uk: 'Ти інший', en: 'You are different', 'pt-BR': 'Você é diferente', vi: 'Bạn khác', id: 'Kamu berbeda', tr: 'Sen farklısın', pl: 'Jesteś inny' },
    { ru: 'Обращение к одному собеседнику. Recall связки eres из девятой сессии, признак не меняется — та же форма diferente для любого рода.', uk: 'Звернення до одного співрозмовника. Recall зв’язки eres із дев’ятої сесії, ознака не змінюється — та сама форма diferente для будь-якого роду.', en: 'Addressing one listener. Recall the linking word eres from session nine, the quality does not change — the same form diferente for any gender.', 'pt-BR': 'Falar com um interlocutor. Recall da ligação eres da sessão nove, a qualidade não muda — a mesma forma diferente para qualquer gênero.', vi: 'Nói với một người nghe. Ôn lại từ nối eres từ buổi chín, đặc điểm không đổi — cùng dạng diferente cho mọi giống.', id: 'Berbicara dengan satu pendengar. Recall kata penghubung eres dari sesi sembilan, sifat tidak berubah — bentuk diferente yang sama untuk gender apa pun.', tr: 'Bir dinleyiciye hitap etmek. Dokuzuncu oturumdan eres bağlacını hatırlama, nitelik değişmez — herhangi bir cinsiyet için aynı diferente biçimi.', pl: 'Zwracanie się do jednego słuchacza. Przypomnienie łącznika eres z sesji dziewiątej, cecha się nie zmienia — ta sama forma diferente dla każdego rodzaju.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsSoyOrEs('Eres') },
      { correct: 'diferente', prompt: T.diferenteDefaultQ, d1: invariableAdjectiveWronglyInflected('diferente', 'diferenta'), d2: wrongWordAntonymSingular('diferente', 'igual', MEANING_IGUAL) },
    ],
  ),
  'es-e01-s34-es-diferente': d(
    { ru: 'Это другое', uk: 'Це інше', en: 'It is different', 'pt-BR': 'É diferente', vi: 'Nó khác', id: 'Itu berbeda', tr: 'Bu farklı', pl: 'To jest inne' },
    { ru: 'Безличная оценка ситуации или предмета. Recall связки es из семнадцатой сессии, неизменяемая форма diferente для среднего/безличного контекста.', uk: 'Безособова оцінка ситуації чи предмета. Recall зв’язки es із сімнадцятої сесії, незмінна форма diferente для середнього/безособового контексту.', en: 'An impersonal evaluation of a situation or object. Recall the linking word es from session seventeen, the invariable form diferente for a neutral/impersonal context.', 'pt-BR': 'Uma avaliação impessoal de uma situação ou objeto. Recall da ligação es da sessão dezessete, a forma invariável diferente para um contexto neutro/impessoal.', vi: 'Đánh giá phi cá nhân về một tình huống hoặc vật. Ôn lại từ nối es từ buổi mười bảy, dạng bất biến diferente cho ngữ cảnh trung tính/phi cá nhân.', id: 'Penilaian impersonal atas situasi atau benda. Recall kata penghubung es dari sesi tujuh belas, bentuk diferente tak berubah.', tr: 'Bir durum veya nesnenin kişisiz değerlendirmesi. On yedinci oturumdan es bağlacını hatırlama, nötr/kişisiz bağlam için değişmez diferente biçimi.', pl: 'Bezosobowa ocena sytuacji lub przedmiotu. Przypomnienie łącznika es z sesji siedemnastej, niezmienna forma diferente dla neutralnego/bezosobowego kontekstu.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsSonOrEres('Es') },
      { correct: 'diferente', prompt: T.diferenteDefaultQ, d1: invariableAdjectiveWronglyInflected('diferente', 'diferenta'), d2: wrongWordDifferentClass('diferente', 'bueno', MEANING_BUENO) },
    ],
  ),
  'es-e01-s34-somos-diferentes': d(
    { ru: 'Мы разные', uk: 'Ми різні', en: 'We are different', 'pt-BR': 'Somos diferentes', vi: 'Chúng tôi khác nhau', id: 'Kami berbeda', tr: 'Biz farklıyız', pl: 'Jesteśmy różni' },
    { ru: 'Оценка своей группы, включающей говорящего. Recall связки somos из двадцать пятой сессии, множественное число добавляет только -s: diferentes.', uk: 'Оцінка своєї групи, що включає мовця. Recall зв’язки somos із двадцять п’ятої сесії, множина додає лише -s: diferentes.', en: 'An evaluation of your own group including the speaker. Recall the linking word somos from session twenty-five, the plural simply adds -s: diferentes.', 'pt-BR': 'Uma avaliação do próprio grupo que inclui quem fala. Recall da ligação somos da sessão vinte e cinco, o plural só acrescenta -s: diferentes.', vi: 'Đánh giá về nhóm của mình gồm cả người nói. Ôn lại từ nối somos từ buổi hai mươi lăm, số nhiều chỉ thêm -s: diferentes.', id: 'Penilaian atas kelompok sendiri yang mencakup penutur. Recall kata penghubung somos dari sesi dua puluh lima, jamak hanya menambahkan -s: diferentes.', tr: 'Konuşanı da içeren kendi grubunun değerlendirmesi. Yirmi beşinci oturumdan somos bağlacını hatırlama, çoğul yalnızca -s ekler: diferentes.', pl: 'Ocena własnej grupy obejmującej mówiącego. Przypomnienie łącznika somos z sesji dwudziestej piątej, liczba mnoga po prostu dodaje -s: diferentes.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrSoy('Somos') },
      { correct: 'diferentes', prompt: T.diferentesPluralQ, d1: numberMismatchToPlural('diferentes', 'diferente'), d2: wrongWordAntonymPlural('diferentes', 'iguales', MEANING_IGUALES) },
    ],
  ),
  'es-e01-s34-son-diferentes': d(
    { ru: 'Они разные', uk: 'Вони різні', en: 'They are different', 'pt-BR': 'Eles são diferentes', vi: 'Họ khác nhau', id: 'Mereka berbeda', tr: 'Onlar farklı', pl: 'Oni są różni' },
    { ru: 'Оценка группы без говорящего внутри. Recall связки son из двадцать седьмой сессии.', uk: 'Оцінка групи без мовця всередині. Recall зв’язки son із двадцять сьомої сесії.', en: 'An evaluation of a group without the speaker inside. Recall the linking word son from session twenty-seven.', 'pt-BR': 'Uma avaliação de um grupo sem quem fala dentro. Recall da ligação son da sessão vinte e sete.', vi: 'Đánh giá một nhóm không có người nói ở trong. Ôn lại từ nối son từ buổi hai mươi bảy.', id: 'Penilaian kelompok tanpa penutur di dalamnya. Recall kata penghubung son dari sesi dua puluh tujuh.', tr: 'İçinde konuşan olmayan bir grubun değerlendirmesi. Yirmi yedinci oturumdan son bağlacını hatırlama.', pl: 'Ocena grupy bez mówiącego w środku. Przypomnienie łącznika son z sesji dwudziestej siódmej.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      { correct: 'diferentes', prompt: T.diferentesPluralQ, d1: numberMismatchToPlural('diferentes', 'diferente'), d2: wrongWordAntonymPlural('diferentes', 'iguales', MEANING_IGUALES) },
    ],
  ),
  'es-e01-s34-no-soy-diferente': d(
    { ru: 'Я не другой', uk: 'Я не інший', en: 'I am not different', 'pt-BR': 'Não sou diferente', vi: 'Tôi không khác', id: 'Saya tidak berbeda', tr: 'Ben farklı değilim', pl: 'Nie jestem inny' },
    { ru: 'Отрицание оценки себя одного. No встаёт перед soy, признак не меняется от отрицания. Recall отрицательной формы из первой сессии.', uk: 'Заперечення оцінки себе одного. No стоїть перед soy, ознака не змінюється від заперечення. Recall заперечної форми з першої сесії.', en: 'Negating an evaluation of yourself alone. No goes before soy, the quality does not change from negation. Recall the negative form from session one.', 'pt-BR': 'Negar uma avaliação de si mesmo sozinho. No vem antes de soy, a qualidade não muda com a negação. Recall da forma negativa da sessão um.', vi: 'Phủ định đánh giá về một mình bản thân. No đứng trước soy, đặc điểm không đổi khi phủ định. Ôn lại dạng phủ định từ buổi một.', id: 'Menegasikan penilaian tentang diri sendiri sendirian. No berada sebelum soy, sifat tidak berubah karena negasi. Recall bentuk negatif dari sesi satu.', tr: 'Yalnızca kendisi hakkındaki değerlendirmeyi olumsuzlamak. No, soy\'dan önce gelir, nitelik olumsuzlamadan değişmez. Birinci oturumdan olumsuz biçimi hatırlama.', pl: 'Zaprzeczenie oceny samego siebie. No stoi przed soy, cecha nie zmienia się przez przeczenie. Przypomnienie formy przeczącej z sesji pierwszej.' },
    [
      negationWordNada,
      { correct: 'soy', prompt: T.soyAnswerQ, ...soyVsEresOrEs('soy') },
      { correct: 'diferente', prompt: T.diferenteDefaultQ, d1: invariableAdjectiveWronglyInflected('diferente', 'diferenta'), d2: wrongWordAntonymSingular('diferente', 'igual', MEANING_IGUAL) },
    ],
  ),
  'es-e01-s34-no-es-diferente': d(
    { ru: 'Это не другое', uk: 'Це не інше', en: 'It is not different', 'pt-BR': 'Não é diferente', vi: 'Nó không khác', id: 'Itu tidak berbeda', tr: 'Bu farklı değil', pl: 'To nie jest inne' },
    { ru: 'Отрицание безличной оценки. No встаёт перед es, признак не меняется от отрицания. Recall отрицательной формы из второй и девятнадцатой сессий.', uk: 'Заперечення безособової оцінки. No стоїть перед es, ознака не змінюється від заперечення. Recall заперечної форми з другої та дев’ятнадцятої сесій.', en: 'Negating an impersonal evaluation. No goes before es, the quality does not change from negation. Recall the negative form from sessions two and nineteen.', 'pt-BR': 'Negar uma avaliação impessoal. No vem antes de es, a qualidade não muda com a negação. Recall da forma negativa das sessões dois e dezenove.', vi: 'Phủ định đánh giá phi cá nhân. No đứng trước es, đặc điểm không đổi khi phủ định. Ôn lại dạng phủ định từ buổi hai và mười chín.', id: 'Menegasikan penilaian impersonal. No berada sebelum es, sifat tidak berubah karena negasi. Recall bentuk negatif dari sesi dua dan sembilan belas.', tr: 'Kişisiz bir değerlendirmeyi olumsuzlamak. No, es\'ten önce gelir, nitelik olumsuzlamadan değişmez. İkinci ve on dokuzuncu oturumlardan olumsuz biçimi hatırlama.', pl: 'Zaprzeczenie bezosobowej oceny. No stoi przed es, cecha nie zmienia się przez przeczenie. Przypomnienie formy przeczącej z sesji drugiej i dziewiętnastej.' },
    [
      negationWordNunca,
      { correct: 'es', prompt: T.esAnswerQ, ...esVsSonOrEres('es') },
      { correct: 'diferente', prompt: T.diferenteDefaultQ, d1: invariableAdjectiveWronglyInflected('diferente', 'diferenta'), d2: wrongWordDifferentClass('diferente', 'malo', MEANING_MALO) },
    ],
  ),
  'es-e01-s34-no-somos-diferentes': d(
    { ru: 'Мы не разные', uk: 'Ми не різні', en: 'We are not different', 'pt-BR': 'Não somos diferentes', vi: 'Chúng tôi không khác nhau', id: 'Kami tidak berbeda', tr: 'Biz farklı değiliz', pl: 'Nie jesteśmy różni' },
    { ru: 'Отрицание оценки своей группы. No встаёт перед somos, признак сохраняет окончание -es.', uk: 'Заперечення оцінки своєї групи. No стоїть перед somos, ознака зберігає закінчення -es.', en: 'Negating an evaluation of your own group. No goes before somos, the quality keeps the -es ending.', 'pt-BR': 'Negar uma avaliação do próprio grupo. No vem antes de somos, a qualidade mantém a terminação -es.', vi: 'Phủ định đánh giá về nhóm của mình. No đứng trước somos, đặc điểm giữ đuôi -es.', id: 'Menegasikan penilaian atas kelompok sendiri. No berada sebelum somos, sifat mempertahankan akhiran -es.', tr: 'Kendi grubunun değerlendirmesini olumsuzlamak. No, somos\'tan önce gelir, nitelik -es sonunu korur.', pl: 'Zaprzeczenie oceny własnej grupy. No stoi przed somos, cecha zachowuje końcówkę -es.' },
    [
      negationWordNada,
      { correct: 'somos', prompt: T.somosLowerQ, ...somosVsSonOrSoy('somos') },
      { correct: 'diferentes', prompt: T.diferentesPluralQ, d1: numberMismatchToPlural('diferentes', 'diferente'), d2: wrongWordAntonymPlural('diferentes', 'iguales', MEANING_IGUALES) },
    ],
  ),
  'es-e01-s34-no-son-diferentes': d(
    { ru: 'Они не разные', uk: 'Вони не різні', en: 'They are not different', 'pt-BR': 'Eles não são diferentes', vi: 'Họ không khác nhau', id: 'Mereka tidak berbeda', tr: 'Onlar farklı değil', pl: 'Oni nie są różni' },
    { ru: 'Отрицание оценки чужой группы. No встаёт перед son, признак сохраняет окончание -es — единственная непокрытая ранее комбинация лица и отрицания в этой сессии.', uk: 'Заперечення оцінки чужої групи. No стоїть перед son, ознака зберігає закінчення -es — єдина непокрита раніше комбінація особи й заперечення в цій сесії.', en: 'Negating an evaluation of someone else\'s group. No goes before son, the quality keeps the -es ending — the only person-and-negation combination not yet covered in this session.', 'pt-BR': 'Negar avaliação do grupo de outra pessoa. No vem antes de son, a qualidade mantém a terminação -es.', vi: 'Phủ định đánh giá về nhóm của người khác. No đứng trước son, đặc điểm giữ đuôi -es — tổ hợp ngôi và phủ định duy nhất chưa được đề cập trong buổi này.', id: 'Menegasikan penilaian kelompok orang lain. No berada sebelum son, sifat mempertahankan akhiran -es.', tr: 'Başkasının grubunu olumsuzlamak. No, son\'dan önce gelir, nitelik -es sonunu korur.', pl: 'Zaprzeczenie oceny cudzej grupy. No stoi przed son, cecha zachowuje końcówkę -es — jedyna kombinacja osoby i przeczenia nieomówiona wcześniej w tej sesji.' },
    [
      negationWordNunca,
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosOrEs('son') },
      { correct: 'diferentes', prompt: T.diferentesPluralQ, d1: numberMismatchToPlural('diferentes', 'diferente'), d2: wrongWordAntonymPlural('diferentes', 'iguales', MEANING_IGUALES) },
    ],
  ),
  'es-e01-s34-soy-diferente-eres-igual-tambien': d(
    { ru: 'Я другой; ты тоже безразличен', uk: 'Я інший; тобі теж все одно', en: 'I am different; you feel the same too', 'pt-BR': 'Sou diferente; você também não se importa', vi: 'Tôi khác; bạn cũng thấy vậy', id: 'Saya berbeda; kamu juga sama saja', tr: 'Ben farklıyım; sen de aynı şekilde', pl: 'Jestem inny; tobie też wszystko jedno' },
    { ru: 'Диалог из утверждения о себе и ответа собеседника с recall igual. Recall связки soy, ответ — связка eres с recall también.', uk: 'Діалог із твердження про себе і відповіді співрозмовника з recall igual. Recall зв’язки soy, відповідь — зв’язка eres з recall también.', en: 'A dialogue of a statement about yourself and the listener\'s answer with a recall of igual. Recall the linking word soy, the answer uses eres with a recall of también.', 'pt-BR': 'Um diálogo de uma afirmação sobre si mesmo e a resposta do interlocutor com recall de igual. Recall da ligação soy, a resposta usa eres com recall de también.', vi: 'Một cuộc đối thoại gồm phát biểu về bản thân và câu trả lời của người nghe với ôn lại igual. Ôn lại từ nối soy, câu trả lời dùng eres với ôn lại también.', id: 'Dialog pernyataan tentang diri sendiri dan jawaban pendengar dengan recall igual. Recall kata penghubung soy, jawaban menggunakan eres dengan recall también.', tr: 'Kendisi hakkında bir ifade ve dinleyicinin igual\'i hatırlatan yanıtından oluşan bir diyalog. Soy bağlacını hatırlama, yanıt también\'i hatırlatan eres kullanır.', pl: 'Dialog złożony ze stwierdzenia o sobie i odpowiedzi słuchacza z przypomnieniem igual. Przypomnienie łącznika soy, odpowiedź używa eres z przypomnieniem también.' },
    [
      { correct: 'Soy', prompt: T.soyQ, ...soyVsEresOrEs('Soy') },
      { correct: 'diferente', prompt: T.diferenteDefaultQ, d1: invariableAdjectiveWronglyInflected('diferente', 'diferenta'), d2: wrongWordAntonymSingular('diferente', 'igual', MEANING_IGUAL) },
      { correct: 'eres', prompt: T.eresQ, ...eresVsSoyOrEs('eres') },
      { correct: 'igual', prompt: T.igualQ, d1: wrongWordAntonymSingular('igual', 'diferente', MEANING_DIFERENTE), d2: invariableAdjectiveWronglyInflected('igual', 'iguala') },
      tambienWord,
    ],
  ),
  'es-e01-s34-es-diferente-somos-diferentes-tambien': d(
    { ru: 'Он другой; мы тоже разные', uk: 'Він інший; ми теж різні', en: 'He is different; we are different too', 'pt-BR': 'Ele é diferente; nós também somos diferentes', vi: 'Anh ấy khác; chúng tôi cũng khác', id: 'Dia berbeda; kami juga berbeda', tr: 'O farklı; biz de farklıyız', pl: 'On jest inny; my też jesteśmy różni' },
    { ru: 'Диалог из утверждения о третьем лице и подтверждения тем же признаком собственной группой. Recall связки es, ответ — связка somos с recall también.', uk: 'Діалог із твердження про третю особу і підтвердження тією самою ознакою власною групою. Recall зв’язки es, відповідь — зв’язка somos з recall también.', en: 'A dialogue of a statement about a third person and confirmation of the same quality by your own group. Recall the linking word es, the answer uses somos with a recall of también.', 'pt-BR': 'Afirmação sobre terceira pessoa e confirmação pelo próprio grupo. Recall da ligação es, a resposta usa somos com también.', vi: 'Một cuộc đối thoại gồm phát biểu về người thứ ba và xác nhận cùng đặc điểm bởi nhóm của mình. Ôn lại từ nối es, câu trả lời dùng somos với ôn lại también.', id: 'Pernyataan tentang orang ketiga, dikonfirmasi kelompok sendiri. Recall kata penghubung es, jawaban pakai somos dan también.', tr: 'Üçüncü kişi hakkında ifade, kendi grubunca onaylanır. Es bağlacını hatırlama, yanıt somos ve también kullanır.', pl: 'Stwierdzenie o osobie trzeciej i potwierdzenie przez własną grupę. Przypomnienie łącznika es, odpowiedź używa somos i también.' },
    [
      { correct: 'Es', prompt: T.esQ, ...esVsSonOrEres('Es') },
      { correct: 'diferente', prompt: T.diferenteDefaultQ, d1: invariableAdjectiveWronglyInflected('diferente', 'diferenta'), d2: wrongWordAntonymSingular('diferente', 'igual', MEANING_IGUAL) },
      { correct: 'somos', prompt: T.somosQ, ...somosVsSonOrEs('Somos') },
      { correct: 'diferentes', prompt: T.diferentesPluralQ, d1: numberMismatchToPlural('diferentes', 'diferente'), d2: wrongWordAntonymPlural('diferentes', 'iguales', MEANING_IGUALES) },
      tambienWord,
    ],
  ),
  'es-e01-s34-son-diferentes-no-soy-igual-q': d(
    { ru: 'Они разные? Нет, мне не всё равно', uk: 'Вони різні? Ні, мені не все одно', en: 'Are they different? No, I do not feel the same', 'pt-BR': 'Eles são diferentes? Não, eu me importo', vi: 'Họ khác nhau? Không, tôi không thấy như nhau', id: 'Apakah mereka berbeda? Tidak, saya tidak merasa sama saja', tr: 'Onlar farklı mı? Hayır, benim için aynı değil', pl: 'Czy oni są różni? Nie, dla mnie to nie wszystko jedno' },
    { ru: 'Вопрос о третьих лицах множественного числа и отрицательный ответ о себе одном с recall igual. Recall связки son в вопросе, ответ — no soy igual.', uk: 'Питання про третіх осіб множини і заперечна відповідь про себе одного з recall igual. Recall зв’язки son у питанні, відповідь — no soy igual.', en: 'A question about third-person plural and a negative answer about yourself alone with a recall of igual. Recall the linking word son in the question, the answer is no soy igual.', 'pt-BR': 'Pergunta sobre terceira pessoa plural, resposta negativa sobre si mesmo com recall de igual. Recall da ligação son na pergunta, resposta no soy igual.', vi: 'Một câu hỏi về ngôi thứ ba số nhiều và câu trả lời phủ định về một mình bản thân với ôn lại igual. Ôn lại từ nối son trong câu hỏi, câu trả lời là no soy igual.', id: 'Pertanyaan orang ketiga jamak, jawaban negatif diri sendiri dengan recall igual. Recall kata penghubung son, jawabannya no soy igual.', tr: 'Üçüncü çoğul kişi hakkında soru, igual\'i hatırlatan olumsuz yanıt. Son bağlacını hatırlama, yanıt no soy igual.', pl: 'Pytanie o trzecią osobę mnogą, przecząca odpowiedź o sobie z przypomnieniem igual. Przypomnienie łącznika son, odpowiedź no soy igual.' },
    [
      { correct: 'Son', prompt: T.sonQ, ...sonVsSomosOrEs('Son') },
      { correct: 'diferentes', prompt: T.diferentesPluralQ, d1: numberMismatchToPlural('diferentes', 'diferente'), d2: wrongWordAntonymPlural('diferentes', 'iguales', MEANING_IGUALES) },
      noReactionWord,
      noLowerWord,
      { correct: 'soy', prompt: T.soyAnswerQ, ...soyVsEresOrEs('soy') },
      { correct: 'igual', prompt: T.igualQ, d1: wrongWordAntonymSingular('igual', 'diferente', MEANING_DIFERENTE), d2: invariableAdjectiveWronglyInflected('igual', 'iguala') },
    ],
  ),
  'es-e01-s34-eres-diferente-no-es-igual-q': d(
    { ru: 'Ты другой? Всё равно', uk: 'Ти інший? Все одно', en: 'Are you different? It is all the same', 'pt-BR': 'Você é diferente? Tanto faz', vi: 'Bạn khác à? Cũng như nhau', id: 'Kamu berbeda? Sama saja', tr: 'Sen farklı mısın? Aynı şey', pl: 'Jesteś inny? Wszystko jedno' },
    { ru: 'Вопрос ко второму лицу и отрицательный ответ безразличием о третьем лице. Recall связки eres в вопросе, ответ — no es igual.', uk: 'Питання до другої особи і заперечна відповідь байдужістю про третю особу. Recall зв’язки eres у питанні, відповідь — no es igual.', en: 'A question to the second person and a negative answer with indifference about a third person. Recall the linking word eres in the question, the answer is no es igual.', 'pt-BR': 'Uma pergunta à segunda pessoa e uma resposta negativa com indiferença sobre uma terceira pessoa. Recall da ligação eres na pergunta, a resposta é no es igual.', vi: 'Một câu hỏi cho ngôi thứ hai và câu trả lời phủ định thể hiện sự thờ ơ về người thứ ba. Ôn lại từ nối eres trong câu hỏi, câu trả lời là no es igual.', id: 'Pertanyaan kepada orang kedua, jawaban negatif tak peduli tentang orang ketiga. Recall kata penghubung eres, jawabannya no es igual.', tr: 'İkinci kişiye bir soru ve üçüncü kişi hakkında kayıtsızlıkla olumsuz bir yanıt. Sorudaki eres bağlacını hatırlama, yanıt no es igual.', pl: 'Pytanie do drugiej osoby i przecząca odpowiedź z obojętnością o osobie trzeciej. Przypomnienie łącznika eres w pytaniu, odpowiedź to no es igual.' },
    [
      { correct: 'Eres', prompt: T.eresQ, ...eresVsSoyOrEs('Eres') },
      { correct: 'diferente', prompt: T.diferenteDefaultQ, d1: invariableAdjectiveWronglyInflected('diferente', 'diferenta'), d2: wrongWordAntonymSingular('diferente', 'igual', MEANING_IGUAL) },
      negationWordNada,
      { correct: 'es', prompt: T.esLowerQ, ...esVsSonOrEres('es') },
      { correct: 'igual', prompt: T.igualQ, d1: wrongWordAntonymSingular('igual', 'diferente', MEANING_DIFERENTE), d2: invariableAdjectiveWronglyInflected('igual', 'iguala') },
    ],
  ),
  'es-e01-s34-somos-diferentes-son-buenos-q': d(
    { ru: 'Мы разные? Да, они хорошие', uk: 'Ми різні? Так, вони хороші', en: 'Are we different? Yes, they are good', 'pt-BR': 'Somos diferentes? Sim, eles são bons', vi: 'Chúng tôi khác nhau à? Đúng, họ tốt', id: 'Apakah kami berbeda? Ya, mereka baik', tr: 'Biz farklı mıyız? Evet, onlar iyi', pl: 'Czy jesteśmy różni? Tak, oni są dobrzy' },
    { ru: 'Вопрос про свою группу с recall diferentes и ответ про другую группу с recall bueno — сталкивает два класса признаков курса подряд.', uk: 'Питання про свою групу з recall diferentes і відповідь про іншу групу з recall bueno — зіштовхує два класи ознак курсу підряд.', en: 'A question about your own group with a recall of diferentes and an answer about another group with a recall of bueno — contrasts the course\'s two agreement classes.', 'pt-BR': 'Pergunta sobre o próprio grupo com recall de diferentes e resposta sobre outro grupo com recall de bueno — contrasta as duas classes do curso.', vi: 'Câu hỏi về nhóm mình với ôn lại diferentes, câu trả lời về nhóm khác với ôn lại bueno — đối lập hai lớp hòa hợp của khóa học.', id: 'Pertanyaan kelompok sendiri dengan recall diferentes, jawaban kelompok lain dengan recall bueno — kontras dua kelas kursus.', tr: 'Diferentes\'i hatırlatan kendi grup sorusu, bueno\'yu hatırlatan başka grup yanıtı — kursun iki sınıfını karşılaştırır.', pl: 'Pytanie o własną grupę z diferentes i odpowiedź o innej grupie z bueno — zestawia dwie klasy kursu.' },
    [
      { correct: 'Somos', prompt: T.somosQ, ...somosVsSonOrSoy('Somos') },
      { correct: 'diferentes', prompt: T.diferentesPluralQ, d1: numberMismatchToPlural('diferentes', 'diferente'), d2: wrongWordDifferentClass('diferentes', 'buenos', MEANING_BUENOS) },
      { correct: 'son', prompt: T.sonAnswerQ, ...sonVsSomosOrEs('son') },
      { correct: 'buenos', prompt: { ru: 'Какой признак нужен для хорошей оценки группы по умолчанию, мужской род?', uk: 'Яка ознака потрібна для хорошої оцінки групи за замовчуванням, чоловічий рід?', en: 'Which quality fits a good evaluation of a group by default, masculine?', 'pt-BR': 'Qual qualidade cabe a uma avaliação boa de um grupo por padrão, masculina?', vi: 'Đặc điểm nào phù hợp với đánh giá tốt về nhóm theo mặc định, giống đực?', id: 'Sifat mana yang cocok untuk penilaian baik atas kelompok secara default, maskulin?', tr: 'Varsayılan olarak bir grubun iyi değerlendirilmesi için hangi nitelik uyar, eril?', pl: 'Jaka cecha pasuje do dobrej oceny grupy domyślnie, rodzaj męski?' }, d1: { value: 'buenas', trapType: 'grammar', reason: { ru: 'Buenas — форма женского рода множественного числа. По умолчанию нужна форма на -os: buenos.', uk: 'Buenas — форма жіночого роду множини. За замовчуванням потрібна форма на -os: buenos.', en: 'Buenas is the feminine plural form. By default the -os form is needed: buenos.', 'pt-BR': 'Buenas é a forma plural feminina. Por padrão precisa da forma em -os: buenos.', vi: 'Buenas là dạng số nhiều giống cái. Theo mặc định cần dạng -os: buenos.', id: 'Buenas adalah bentuk jamak feminin. Secara default memerlukan bentuk -os: buenos.', tr: 'Buenas dişil çoğul biçimdir. Varsayılan olarak -os biçimi gerekir: buenos.', pl: 'Buenas to forma żeńska liczby mnogiej. Domyślnie wymagana jest forma na -os: buenos.' } }, d2: wrongWordDifferentClass('buenos', 'diferentes', MEANING_DIFERENTE) },
    ],
  ),
  'es-e01-s34-no-eres-diferente': d(
    { ru: 'Ты не другой', uk: 'Ти не інший', en: 'You are not different', 'pt-BR': 'Você não é diferente', vi: 'Bạn không khác', id: 'Kamu tidak berbeda', tr: 'Sen farklı değilsin', pl: 'Nie jesteś inny' },
    { ru: 'Отрицание оценки собеседника. No встаёт перед eres, признак не меняется от отрицания.', uk: 'Заперечення оцінки співрозмовника. No стоїть перед eres, ознака не змінюється від заперечення.', en: 'Negating an evaluation of the listener. No goes before eres, the quality does not change from negation.', 'pt-BR': 'Negar uma avaliação do interlocutor. No vem antes de eres, a qualidade não muda com a negação.', vi: 'Phủ định đánh giá về người nghe. No đứng trước eres, đặc điểm không đổi khi phủ định.', id: 'Menegasikan penilaian atas pendengar. No berada sebelum eres, sifat tidak berubah karena negasi.', tr: 'Dinleyicinin değerlendirmesini olumsuzlamak. No, eres\'ten önce gelir, nitelik olumsuzlamadan değişmez.', pl: 'Zaprzeczenie oceny słuchacza. No stoi przed eres, cecha nie zmienia się przez przeczenie.' },
    [
      negationWordNada,
      { correct: 'eres', prompt: T.eresQ, ...eresVsSoyOrEs('eres') },
      { correct: 'diferente', prompt: T.diferenteDefaultQ, d1: invariableAdjectiveWronglyInflected('diferente', 'diferenta'), d2: wrongWordDifferentClass('diferente', 'malo', MEANING_MALO) },
    ],
  ),
});
