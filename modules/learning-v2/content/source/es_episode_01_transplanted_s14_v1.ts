import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

/*
 * Пересаженный материал удалённой сессии s14 ES-курса.
 *
 * зачем (владелец, 2026-08-30): сессии-источники удалены намеренно, но живые
 * сессии переиспользуют их фразы (voice-16: три вопроса de acuerdo). Материал перенесён байт в байт
 * из git-истории (936b8c09b фразы, 57407c92b переводы) вместе с родными
 * локальными хелперами переводов; удалённые файлы не воскресают, бандл не
 * тащит мёртвый контент целиком.
 */

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для 15
// фраз сессии 14 на восьми объяснительных локалях (без 'es'). De acuerdo
// вводится как обычные позиционные токены De/acuerdo внутри фраз (не
// word-first vocabulary — многословные target там не поддерживаются,
// подтверждено research-агентом при первой попытке).
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
  eresQ: { ru: 'Какая связка нужна при обращении к собеседнику?', uk: 'Яка зв’язка потрібна при зверненні до співрозмовника?', en: 'Which linking word fits addressing the listener?', 'pt-BR': 'Qual ligação cabe ao falar com o interlocutor?', vi: 'Từ nối nào phù hợp khi nói với người nghe?', id: 'Kata penghubung mana yang cocok saat berbicara dengan pendengar?', tr: 'Dinleyiciye hitap etmek için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do zwracania się do słuchacza?' },
  esQ: { ru: 'Какая связка нужна для безличной оценки?', uk: 'Яка зв’язка потрібна для безособової оцінки?', en: 'Which linking word fits an impersonal evaluation?', 'pt-BR': 'Qual ligação cabe numa avaliação impessoal?', vi: 'Từ nối nào phù hợp cho đánh giá phi nhân xưng?', id: 'Kata penghubung mana yang cocok untuk penilaian impersonal?', tr: 'Kişisiz değerlendirme için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do bezosobowej oceny?' },
  somosQ: { ru: 'Какая связка нужна для «мы»?', uk: 'Яка зв’язка потрібна для «ми»?', en: 'Which linking word fits "we"?', 'pt-BR': 'Qual ligação cabe a "nós"?', vi: 'Từ nối nào phù hợp cho "chúng tôi"?', id: 'Kata penghubung mana yang cocok untuk "kami"?', tr: '"Biz" için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do „my”?' },
  deQ: { ru: 'Какое слово начинает формулу согласия?', uk: 'Яке слово починає формулу згоди?', en: 'Which word starts the agreement formula?', 'pt-BR': 'Qual palavra começa a fórmula de concordância?', vi: 'Từ nào bắt đầu công thức đồng ý?', id: 'Kata mana yang memulai rumus persetujuan?', tr: 'Katılım formülünü hangi kelime başlatır?', pl: 'Które słowo rozpoczyna formułę zgody?' },
  acuerdoQ: { ru: 'Какое слово нужно для согласия?', uk: 'Яке слово потрібне для згоди?', en: 'Which word is needed for agreement?', 'pt-BR': 'Qual palavra é necessária para concordância?', vi: 'Từ nào cần cho sự đồng ý?', id: 'Kata mana yang diperlukan untuk persetujuan?', tr: 'Katılım için hangi kelime gerekir?', pl: 'Jakie słowo jest potrzebne do zgody?' },
} as const;

const deVsEs: Reasoned = { value: 'Es', trapType: 'semantic_neighbor', reason: { ru: 'Es — связка «есть», а не часть формулы согласия. Формула согласия начинается с De.', uk: 'Es — зв’язка «є», а не частина формули згоди. Формула згоди починається з De.', en: 'Es is the linking word "is", not part of the agreement formula. The agreement formula starts with De.', 'pt-BR': 'Es é a ligação "é", não parte da fórmula de concordância. A fórmula de concordância começa com De.', vi: 'Es là từ nối "là", không phải một phần của công thức đồng ý. Công thức đồng ý bắt đầu bằng De.', id: 'Es adalah kata penghubung "adalah", bukan bagian dari rumus persetujuan. Rumus persetujuan dimulai dengan De.', tr: 'Es "dir" bağlacıdır, katılım formülünün parçası değildir. Katılım formülü De ile başlar.', pl: 'Es to łącznik „jest”, nie część formuły zgody. Formuła zgody zaczyna się od De.' } };
const deVsNo: Reasoned = { value: 'No', trapType: 'semantic_neighbor', reason: { ru: 'No отрицает, а тут утверждается согласие. Формула согласия начинается с De.', uk: 'No заперечує, а тут стверджується згода. Формула згоди починається з De.', en: 'No negates, but here agreement is being stated. The agreement formula starts with De.', 'pt-BR': 'No nega, mas aqui a concordância está sendo afirmada. A fórmula de concordância começa com De.', vi: 'No phủ định, nhưng ở đây đang khẳng định sự đồng ý. Công thức đồng ý bắt đầu bằng De.', id: 'No menegasikan, tetapi di sini persetujuan sedang dinyatakan. Rumus persetujuan dimulai dengan De.', tr: 'No olumsuzlar, ama burada katılım ifade ediliyor. Katılım formülü De ile başlar.', pl: 'No zaprzecza, a tutaj wyrażana jest zgoda. Formuła zgody zaczyna się od De.' } };
const deVsMuy: Reasoned = { value: 'muy', trapType: 'semantic_neighbor', reason: { ru: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', uk: 'Muy означає «дуже», не входить до формули згоди. Потрібно de.', en: 'Muy means "very", it is not part of the agreement formula. De is needed.', 'pt-BR': 'Muy significa "muito", não faz parte da fórmula de concordância. Precisa de de.', vi: 'Muy nghĩa là "rất", không thuộc công thức đồng ý. Cần de.', id: 'Muy berarti "sangat", tidak termasuk rumus persetujuan. Perlu de.', tr: 'Muy "çok" demektir, katılım formülünün parçası değildir. De gerekir.', pl: 'Muy znaczy „bardzo”, nie jest częścią formuły zgody. Potrzebne jest de.' } };
const deVsTan: Reasoned = { value: 'tan', trapType: 'semantic_neighbor', reason: { ru: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', uk: 'Tan означає «настільки», не входить до формули згоди. Потрібно de.', en: 'Tan means "so", it is not part of the agreement formula. De is needed.', 'pt-BR': 'Tan significa "tão", não faz parte da fórmula de concordância. Precisa de de.', vi: 'Tan nghĩa là "đến mức", không thuộc công thức đồng ý. Cần de.', id: 'Tan berarti "begitu", tidak termasuk rumus persetujuan. Perlu de.', tr: 'Tan "o kadar" demektir, katılım formülünün parçası değildir. De gerekir.', pl: 'Tan znaczy „tak bardzo”, nie jest częścią formuły zgody. Potrzebne jest de.' } };

function acuerdoVs(wrong: string, wrongMeaning: Record<LocaleWithoutEs, string>): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} означает ${wrongMeaning.ru}, а не согласие. Нужно acuerdo.`,
    uk: `${wrong} означає ${wrongMeaning.uk}, а не згоду. Потрібно acuerdo.`,
    en: `${wrong} means ${wrongMeaning.en}, not agreement. Acuerdo is needed.`,
    'pt-BR': `${wrong} significa ${wrongMeaning['pt-BR']}, não concordância. Precisa de acuerdo.`,
    vi: `${wrong} nghĩa là ${wrongMeaning.vi}, không phải đồng ý. Cần acuerdo.`,
    id: `${wrong} berarti ${wrongMeaning.id}, bukan persetujuan. Perlu acuerdo.`,
    tr: `${wrong}, ${wrongMeaning.tr} demektir, katılım değil. Acuerdo gerekir.`,
    pl: `${wrong} znaczy ${wrongMeaning.pl}, nie zgodę. Potrzebne jest acuerdo.`,
  }};
}

const M = {
  igual: { ru: '«безразличие»', uk: '«байдужість»', en: '"indifference"', 'pt-BR': '"indiferença"', vi: '"thờ ơ"', id: '"ketidakpedulian"', tr: '"kayıtsızlık"', pl: '„obojętność”' },
  verdad: { ru: '«правда» (подтверждение факта)', uk: '«правда» (підтвердження факту)', en: '"truth" (confirming a fact)', 'pt-BR': '"verdade" (confirmando um fato)', vi: '"sự thật" (xác nhận sự thật)', id: '"kebenaran" (mengonfirmasi fakta)', tr: '"gerçek" (bir gerçeği onaylamak)', pl: '„prawda” (potwierdzenie faktu)' },
  iguales: { ru: '«одинаковые»', uk: '«однакові»', en: '"the same"', 'pt-BR': '"iguais"', vi: '"giống nhau"', id: '"sama"', tr: '"aynı"', pl: '„takie same”' },
} as const;

function esVsEres(target: 'Eres' | 'Es' | 'Somos'): Reasoned {
  if (target === 'Eres') return { value: 'Es', trapType: 'grammar', reason: { ru: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — только Eres.', uk: 'Es — про предмет чи третю особу. Питання співрозмовнику напряму — тільки Eres.', en: 'Es is about a thing or a third person. Addressing the listener directly needs only Eres.', 'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. Falar com o interlocutor diretamente precisa só de Eres.', vi: 'Es nói về một vật hay ngôi thứ ba. Nói trực tiếp với người nghe chỉ cần Eres.', id: 'Es tentang benda atau orang ketiga. Berbicara langsung dengan pendengar hanya perlu Eres.', tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciye doğrudan hitap yalnızca Eres gerektirir.', pl: 'Es dotyczy rzeczy lub trzeciej osoby. Zwracanie się do słuchacza wymaga tylko Eres.' } };
  if (target === 'Es') return { value: 'Eres', trapType: 'grammar', reason: { ru: 'Eres обращается к собеседнику напрямую. Безличная оценка — только Es.', uk: 'Eres звертається до співрозмовника напряму. Безособова оцінка — тільки Es.', en: 'Eres addresses the listener directly. An impersonal evaluation needs only Es.', 'pt-BR': 'Eres fala com o interlocutor diretamente. Uma avaliação impessoal precisa só de Es.', vi: 'Eres nói trực tiếp với người nghe. Đánh giá phi nhân xưng chỉ cần Es.', id: 'Eres berbicara langsung dengan pendengar. Penilaian impersonal hanya perlu Es.', tr: 'Eres doğrudan dinleyiciyle konuşur. Kişisiz değerlendirme yalnızca Es gerektirir.', pl: 'Eres zwraca się bezpośrednio do słuchacza. Bezosobowa ocena wymaga tylko Es.' } };
  return { value: 'Son', trapType: 'grammar', reason: { ru: 'Son — «они». Про себя вместе с кем-то — Somos.', uk: 'Son — «вони». Про себе разом із кимось — Somos.', en: 'Son means "they". Talking about oneself with others needs Somos.', 'pt-BR': 'Son significa "eles". Falar de si mesmo com outros precisa de Somos.', vi: 'Son nghĩa là "họ". Nói về chính mình cùng người khác cần Somos.', id: 'Son berarti "mereka". Berbicara tentang diri sendiri bersama orang lain perlu Somos.', tr: 'Son "onlar" demektir. Başkalarıyla birlikte kendinden bahsetmek Somos gerektirir.', pl: 'Son znaczy „oni”. Mówienie o sobie razem z innymi wymaga Somos.' } };
}

function soyOrOtherVsEres(): Reasoned {
  return { value: 'Soy', trapType: 'grammar', reason: { ru: 'Soy — про себя. Вопрос собеседнику — только Eres.', uk: 'Soy — про себе. Питання співрозмовнику — тільки Eres.', en: 'Soy is about the speaker. A question to the listener needs only Eres.', 'pt-BR': 'Soy é sobre quem fala. Uma pergunta ao interlocutor precisa só de Eres.', vi: 'Soy nói về người nói. Câu hỏi với người nghe chỉ cần Eres.', id: 'Soy tentang penutur. Pertanyaan kepada pendengar hanya perlu Eres.', tr: 'Soy konuşan hakkındadır. Dinleyiciye soru yalnızca Eres gerektirir.', pl: 'Soy dotyczy mówiącego. Pytanie do słuchacza wymaga tylko Eres.' } };
}

function soyVsEs(): Reasoned {
  return { value: 'Soy', trapType: 'grammar', reason: { ru: 'Soy — про себя. Безличная оценка — только Es.', uk: 'Soy — про себе. Безособова оцінка — тільки Es.', en: 'Soy is about the speaker. An impersonal evaluation needs only Es.', 'pt-BR': 'Soy é sobre quem fala. Uma avaliação impessoal precisa só de Es.', vi: 'Soy nói về người nói. Đánh giá phi nhân xưng chỉ cần Es.', id: 'Soy tentang penutur. Penilaian impersonal hanya perlu Es.', tr: 'Soy konuşan hakkındadır. Kişisiz değerlendirme yalnızca Es gerektirir.', pl: 'Soy dotyczy mówiącego. Bezosobowa ocena wymaga tylko Es.' } };
}

function soisVsSomos(): Reasoned {
  return { value: 'Sois', trapType: 'grammar', reason: { ru: 'Sois — форма для vosotros, которую этот курс не использует. Про себя вместе с кем-то — Somos.', uk: 'Sois — форма для vosotros, яку цей курс не використовує. Про себе разом із кимось — Somos.', en: 'Sois is the form for vosotros, which this course does not use. Talking about oneself with others needs Somos.', 'pt-BR': 'Sois é a forma para vosotros, que este curso não usa. Falar de si mesmo com outros precisa de Somos.', vi: 'Sois là dạng cho vosotros, mà khóa học này không dùng. Nói về chính mình cùng người khác cần Somos.', id: 'Sois adalah bentuk untuk vosotros, yang tidak digunakan kursus ini. Berbicara tentang diri sendiri bersama orang lain perlu Somos.', tr: 'Sois bu kursun kullanmadığı vosotros biçimidir. Başkalarıyla birlikte kendinden bahsetmek Somos gerektirir.', pl: 'Sois to forma dla vosotros, której ten kurs nie używa. Mówienie o sobie razem z innymi wymaga Somos.' } };
}

function genderPair(masc: string, fem: string, correctIsMasc: boolean): Reasoned {
  const wrong = correctIsMasc ? fem : masc;
  const correct = correctIsMasc ? masc : fem;
  const wrongEnding = correctIsMasc ? '-a' : '-o';
  const correctEnding = correctIsMasc ? '-o' : '-a';
  return { value: wrong, trapType: 'grammar', reason: {
    ru: `${wrong} — форма на ${wrongEnding}. Нужна форма ${correct} на ${correctEnding}.`,
    uk: `${wrong} — форма на ${wrongEnding}. Потрібна форма ${correct} на ${correctEnding}.`,
    en: `${wrong} ends in ${wrongEnding}. The needed form is ${correct}, ending in ${correctEnding}.`,
    'pt-BR': `${wrong} termina em ${wrongEnding}. A forma necessária é ${correct}, terminada em ${correctEnding}.`,
    vi: `${wrong} kết thúc bằng ${wrongEnding}. Dạng cần là ${correct}, kết thúc bằng ${correctEnding}.`,
    id: `${wrong} berakhiran ${wrongEnding}. Bentuk yang diperlukan adalah ${correct}, berakhiran ${correctEnding}.`,
    tr: `${wrong}, ${wrongEnding} ile biter. Gereken biçim ${correct}, ${correctEnding} ile biter.`,
    pl: `${wrong} kończy się na ${wrongEnding}. Potrzebna jest forma ${correct}, zakończona na ${correctEnding}.`,
  }};
}

function semanticNeighbor(correct: string, wrong: string, wrongMeaning: Record<LocaleWithoutEs, string>): Reasoned {
  return { value: wrong, trapType: 'semantic_neighbor', reason: {
    ru: `${wrong} — это ${wrongMeaning.ru}, другой признак. Здесь нужно ${correct}.`,
    uk: `${wrong} — це ${wrongMeaning.uk}, інша ознака. Тут потрібно ${correct}.`,
    en: `${wrong} means ${wrongMeaning.en}, a different quality. Here you need ${correct}.`,
    'pt-BR': `${wrong} significa ${wrongMeaning['pt-BR']}, uma qualidade diferente. Aqui é preciso ${correct}.`,
    vi: `${wrong} nghĩa là ${wrongMeaning.vi}, đặc điểm khác. Ở đây cần ${correct}.`,
    id: `${wrong} berarti ${wrongMeaning.id}, sifat berbeda. Di sini perlu ${correct}.`,
    tr: `${wrong}, ${wrongMeaning.tr} demektir, farklı bir niteliktir. Burada ${correct} gerekir.`,
    pl: `${wrong} znaczy ${wrongMeaning.pl}, inna cecha. Tu potrzebne jest ${correct}.`,
  }};
}

function accentTrap(correct: string, wrong: string): Reasoned {
  return { value: wrong, trapType: 'orthographic', reason: {
    ru: `${wrong} без тильды над ú звучал бы иначе. Нужна форма ${correct} с тильдой.`,
    uk: `${wrong} без тильди над ú звучав би інакше. Потрібна форма ${correct} з тильдою.`,
    en: `${wrong} without the tilde over ú would sound different. The needed form is ${correct}, with the tilde.`,
    'pt-BR': `${wrong} sem o til sobre ú soaria diferente. A forma necessária é ${correct}, com o til.`,
    vi: `${wrong} không có dấu ngã trên ú sẽ nghe khác. Dạng cần là ${correct}, có dấu ngã.`,
    id: `${wrong} tanpa tilde di atas ú akan terdengar berbeda. Bentuk yang diperlukan adalah ${correct}, dengan tilde.`,
    tr: `${wrong}, ú üzerinde tilde olmadan farklı duyulurdu. Gereken biçim ${correct}, tilde ile.`,
    pl: `${wrong} bez tyldy nad ú brzmiałoby inaczej. Potrzebna jest forma ${correct}, z tyldą.`,
  }};
}

const deWord = (prompt: Record<LocaleWithoutEs, string> = T.deQ): WordSpec => ({ correct: 'De', prompt, d1: deVsEs, d2: deVsNo });
const deWordLower = (prompt: Record<LocaleWithoutEs, string> = T.deQ): WordSpec => ({ correct: 'de', prompt, d1: deVsMuy, d2: deVsTan });
const acuerdoWord = (prompt: Record<LocaleWithoutEs, string> = T.acuerdoQ): WordSpec => ({ correct: 'acuerdo', prompt, d1: acuerdoVs('igual', M.igual), d2: acuerdoVs('verdad', M.verdad) });

const TRANSPLANTED_DETAILS = Object.freeze({
'es-e01-s14-eres-de-acuerdo-q': d(
    { ru: 'Ты согласен?', uk: 'Ти згоден?', en: 'Do you agree?', 'pt-BR': 'Você concorda?', vi: 'Bạn có đồng ý không?', id: 'Apakah kamu setuju?', tr: 'Katılıyor musun?', pl: 'Zgadzasz się?' },
    { ru: 'Вопрос собеседнику напрямую, с тем же принципом, что и в сессии про вопросы. Порядок слов не меняется, только знаки ¿...? и интонация.', uk: 'Питання співрозмовнику напряму, з тим самим принципом, що й у сесії про питання. Порядок слів не змінюється, лише знаки ¿...? та інтонація.', en: 'A question addressed directly to the listener, with the same principle as in the session about questions. The word order does not change, only the marks ¿...? and the intonation.', 'pt-BR': 'Uma pergunta dirigida diretamente ao interlocutor, com o mesmo princípio da sessão sobre perguntas. A ordem das palavras não muda, só os sinais ¿...? e a entonação.', vi: 'Câu hỏi trực tiếp với người nghe, cùng nguyên tắc như trong buổi về câu hỏi. Trật tự từ không đổi, chỉ dấu ¿...? và ngữ điệu.', id: 'Pertanyaan langsung kepada pendengar, dengan prinsip yang sama seperti dalam sesi tentang pertanyaan. Urutan kata tidak berubah, hanya tanda ¿...? dan intonasi.', tr: 'Dinleyiciye doğrudan yöneltilen bir soru, sorular hakkındaki oturumla aynı ilkeyle. Kelime sırası değişmez, yalnızca ¿...? işaretleri ve tonlama.', pl: 'Pytanie skierowane bezpośrednio do słuchacza, z tą samą zasadą co w sesji o pytaniach. Kolejność słów się nie zmienia, tylko znaki ¿...? i intonacja.' },
    [{ correct: 'Eres', prompt: T.eresQ, d1: esVsEres('Eres'), d2: soyOrOtherVsEres() }, deWordLower(), acuerdoWord()],
  ),
'es-e01-s14-es-de-acuerdo-q': d(
    { ru: 'Он согласен?', uk: 'Він згоден?', en: 'Does he agree?', 'pt-BR': 'Ele concorda?', vi: 'Anh ấy có đồng ý không?', id: 'Apakah dia setuju?', tr: 'O katılıyor mu?', pl: 'Czy on się zgadza?' },
    { ru: 'Вопрос о третьем лице, а не собеседнику напрямую — используется связка es. Формула acuerdo не меняется независимо от того, о ком идёт речь.', uk: 'Питання про третю особу, а не співрозмовнику напряму — використовується зв’язка es. Формула acuerdo не змінюється незалежно від того, про кого йдеться.', en: 'A question about a third person, not the listener directly — the linking word es is used. The formula acuerdo does not change regardless of who is being talked about.', 'pt-BR': 'Uma pergunta sobre uma terceira pessoa, não diretamente ao interlocutor — usa-se a ligação es. A fórmula acuerdo não muda independentemente de quem se fala.', vi: 'Câu hỏi về ngôi thứ ba, không phải trực tiếp với người nghe — dùng từ nối es. Công thức acuerdo không đổi bất kể đang nói về ai.', id: 'Pertanyaan tentang orang ketiga, bukan langsung kepada pendengar — digunakan kata penghubung es. Rumus acuerdo tidak berubah terlepas dari siapa yang dibicarakan.', tr: 'Doğrudan dinleyiciye değil, üçüncü kişi hakkında bir soru — es bağlacı kullanılır. Acuerdo formülü kimden bahsedildiğine bakılmaksızın değişmez.', pl: 'Pytanie o trzecią osobę, nie bezpośrednio do słuchacza — używa się łącznika es. Formuła acuerdo nie zmienia się niezależnie od tego, o kim mowa.' },
    [{ correct: 'Es', prompt: T.esQ, d1: esVsEres('Es'), d2: soyVsEs() }, deWordLower(), acuerdoWord()],
  ),
'es-e01-s14-no-eres-de-acuerdo': d(
    { ru: 'Разве ты не согласен?', uk: 'Хіба ти не згоден?', en: "Aren't you agreed?", 'pt-BR': 'Você não concorda?', vi: 'Chẳng phải bạn không đồng ý sao?', id: 'Bukankah kamu tidak setuju?', tr: 'Katılmıyor musun?', pl: 'Czy się nie zgadzasz?' },
    { ru: 'Отрицательный вопрос собеседнику, ожидающий подтверждения или опровержения. No встаёт перед связкой, как и в утверждении.', uk: 'Заперечне питання співрозмовнику, що очікує підтвердження чи спростування. No стоїть перед зв’язкою, як і у твердженні.', en: 'A negative question to the listener, expecting confirmation or denial. No goes before the linking word, just as in a statement.', 'pt-BR': 'Uma pergunta negativa ao interlocutor, esperando confirmação ou negação. No fica antes da ligação, assim como na afirmação.', vi: 'Câu hỏi phủ định với người nghe, mong đợi xác nhận hay phủ nhận. No đứng trước từ nối, giống như trong câu khẳng định.', id: 'Pertanyaan negatif kepada pendengar, mengharapkan konfirmasi atau penyangkalan. No berada sebelum kata penghubung, sama seperti dalam pernyataan.', tr: 'Dinleyiciye onay ya da ret bekleyen olumsuz bir soru. No, ifadedeki gibi bağlaçtan önce gelir.', pl: 'Pytanie przeczące do słuchacza, oczekujące potwierdzenia lub zaprzeczenia. No stoi przed łącznikiem, tak jak w twierdzeniu.' },
    [
      { correct: 'No', prompt: { ru: 'Какое слово нужно для отрицания?', uk: 'Яке слово потрібне для заперечення?', en: 'Which word is needed for negation?', 'pt-BR': 'Qual palavra é necessária para a negação?', vi: 'Từ nào cần để phủ định?', id: 'Kata mana yang diperlukan untuk negasi?', tr: 'Olumsuzlama için hangi kelime gerekir?', pl: 'Jakie słowo jest potrzebne do przeczenia?' }, d1: { value: 'Nunca', trapType: 'semantic_neighbor', reason: { ru: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', uk: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — No.', en: 'Nunca means "never". Simple negation needs No.', 'pt-BR': 'Nunca significa "nunca". A negação simples precisa de No.', vi: 'Nunca nghĩa là "không bao giờ". Phủ định đơn giản cần No.', id: 'Nunca berarti "tidak pernah". Negasi sederhana perlu No.', tr: 'Nunca "asla" demektir. Basit olumsuzlama No gerektirir.', pl: 'Nunca znaczy „nigdy”. Proste przeczenie wymaga No.' } }, d2: { value: 'Non', trapType: 'orthographic', reason: { ru: 'Non — не испанское слово. В испанском отрицание пишется No.', uk: 'Non — не іспанське слово. В іспанській заперечення пишеться No.', en: 'Non is not a Spanish word. Spanish negation is spelled No.', 'pt-BR': 'Non não é uma palavra em espanhol. A negação em espanhol se escreve No.', vi: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là No.', id: 'Non bukan kata bahasa Spanyol. Negasi bahasa Spanyol dieja No.', tr: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzlama No şeklinde yazılır.', pl: 'Non to nie hiszpańskie słowo. Hiszpańskie przeczenie pisze się No.' } } },
      { correct: 'eres', prompt: T.eresQ, d1: { value: 'es', trapType: 'grammar', reason: { ru: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — eres.', uk: 'Es — про предмет чи третю особу. Питання співрозмовнику напряму — eres.', en: 'Es is about a thing or a third person. A question to the listener needs eres.', 'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. Uma pergunta ao interlocutor precisa de eres.', vi: 'Es nói về một vật hay ngôi thứ ba. Câu hỏi với người nghe cần eres.', id: 'Es tentang benda atau orang ketiga. Pertanyaan kepada pendengar perlu eres.', tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciye soru eres gerektirir.', pl: 'Es dotyczy rzeczy lub trzeciej osoby. Pytanie do słuchacza wymaga eres.' } }, d2: { value: 'soy', trapType: 'grammar', reason: { ru: 'Soy — про себя. Вопрос собеседнику — eres.', uk: 'Soy — про себе. Питання співрозмовнику — eres.', en: 'Soy is about the speaker. A question to the listener needs eres.', 'pt-BR': 'Soy é sobre quem fala. Uma pergunta ao interlocutor precisa de eres.', vi: 'Soy nói về người nói. Câu hỏi với người nghe cần eres.', id: 'Soy tentang penutur. Pertanyaan kepada pendengar perlu eres.', tr: 'Soy konuşan hakkındadır. Dinleyiciye soru eres gerektirir.', pl: 'Soy dotyczy mówiącego. Pytanie do słuchacza wymaga eres.' } } },
      deWordLower(),
      acuerdoWord({ ru: 'Какая формула нужна для (не)согласия?', uk: 'Яка формула потрібна для (не)згоди?', en: 'Which formula is needed for (dis)agreement?', 'pt-BR': 'Qual fórmula é necessária para (dis)concordância?', vi: 'Công thức nào cần cho sự (không) đồng ý?', id: 'Rumus mana yang diperlukan untuk (tidak) setuju?', tr: '(Katılmama) için hangi formül gerekir?', pl: 'Jaka formuła jest potrzebna do (nie)zgody?' }),
    ],
  ),
});

const TRANSPLANTED_RAW: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] = Object.freeze([
{
      id: 'es-e01-s14-eres-de-acuerdo-q',
      english: '¿Eres de acuerdo?',
      russian: 'Ты согласен?',
      explanation:
        'Вопрос собеседнику напрямую, с тем же принципом, что и в сессии про вопросы. Порядок слов не меняется, только знаки ¿...? и интонация.',
      words: [
        { correct: 'Eres', category: 'ser', distractors: [
          { value: 'Es', reasonCode: 'agreement_person_mismatch:Eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Eres', why: 'Soy — про себя. Вопрос собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad — про подтверждение факта, а не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'agreement_phrase', 'question_marks', 'second_person_singular'],
    },
{
      id: 'es-e01-s14-es-de-acuerdo-q',
      english: '¿Es de acuerdo?',
      russian: 'Он согласен?',
      explanation:
        'Вопрос о третьем лице, а не собеседнику напрямую — используется связка es. Формула acuerdo не меняется независимо от того, о ком идёт речь.',
      words: [
        { correct: 'Es', category: 'ser', distractors: [
          { value: 'Eres', reasonCode: 'agreement_person_mismatch:Es', why: 'Eres обращается к собеседнику напрямую. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
          { value: 'Soy', reasonCode: 'agreement_person_mismatch:Es', why: 'Soy — про себя. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad — про подтверждение факта, а не про согласие с мнением. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'agreement_phrase', 'question_marks'],
    },
{
      id: 'es-e01-s14-no-eres-de-acuerdo',
      english: '¿No eres de acuerdo?',
      russian: 'Разве ты не согласен?',
      explanation:
        'Отрицательный вопрос собеседнику, ожидающий подтверждения или опровержения. No встаёт перед связкой, как и в утверждении.',
      words: [
        { correct: 'No', category: 'negation', distractors: [
          { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', trapType: 'semantic_neighbor' },
          { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
        ]},
        { correct: 'eres', category: 'ser', distractors: [
          { value: 'es', reasonCode: 'agreement_person_mismatch:eres', why: 'Es — про предмет или третье лицо. Вопрос собеседнику напрямую — eres.', trapType: 'grammar' },
          { value: 'soy', reasonCode: 'agreement_person_mismatch:eres', why: 'Soy — про себя. Вопрос собеседнику — eres.', trapType: 'grammar' },
        ]},
        { correct: 'de', category: 'agreement-phrase-part', distractors: [
          { value: 'muy', reasonCode: 'wrong_word:de', why: 'Muy означает «очень», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
          { value: 'tan', reasonCode: 'wrong_word:de', why: 'Tan означает «настолько», не входит в формулу согласия. Нужно de.', trapType: 'semantic_neighbor' },
        ]},
        { correct: 'acuerdo', category: 'agreement-phrase-part', distractors: [
          { value: 'igual', reasonCode: 'wrong_word:acuerdo', why: 'Igual означает безразличие, а не (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
          { value: 'verdad', reasonCode: 'wrong_word:acuerdo', why: 'Verdad подтверждает факт, а не выражает (не)согласие. Нужно acuerdo.', trapType: 'semantic_neighbor' },
        ]},
      ],
      features: ['ser', 'negation', 'agreement_phrase', 'question_marks', 'second_person_singular'],
    },
]);

export const ES_TRANSPLANTED_S14_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze(
  TRANSPLANTED_RAW.map((phrase) => Object.freeze({
    ...phrase,
    localizedDetails: (TRANSPLANTED_DETAILS as Record<string, EpisodeSourcePhrase['localizedDetails']>)[phrase.id],
  })),
);
