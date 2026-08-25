import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для 15
// фраз сессии 13 на восьми объяснительных локалях (без 'es'). Тема
// pronoun_drop живёт в intro, здесь — только позиционный разбор
// ser-связки и признака (карточки — recall уже известной грамматики).
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;
type Details = EpisodeSourcePhraseLocalizedDetails;
type Trap = Details['distractors'][number]['trapType'];
type Reasoned = { value: string; trapType: Trap; reason: Record<LocaleWithoutEs, string> };

function d(
  meaning: Record<LocaleWithoutEs, string>,
  explanation: Record<LocaleWithoutEs, string>,
  w1correct: string, w1prompt: Record<LocaleWithoutEs, string>, w1d1: Reasoned, w1d2: Reasoned,
  w2correct: string, w2prompt: Record<LocaleWithoutEs, string>, w2d1: Reasoned, w2d2: Reasoned,
): Readonly<Record<LocaleWithoutEs, Details>> {
  const locales: readonly LocaleWithoutEs[] = ['ru', 'uk', 'en', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
  const out = {} as Record<LocaleWithoutEs, Details>;
  for (const l of locales) {
    out[l] = {
      meaning: meaning[l],
      explanation: explanation[l],
      distractors: [
        { value: w1d1.value, reason: w1d1.reason[l], trapType: w1d1.trapType },
        { value: w1d2.value, reason: w1d2.reason[l], trapType: w1d2.trapType },
        { value: w2d1.value, reason: w2d1.reason[l], trapType: w2d1.trapType },
        { value: w2d2.value, reason: w2d2.reason[l], trapType: w2d2.trapType },
      ],
      words: [
        { correct: w1correct, prompt: w1prompt[l], distractors: [
          { value: w1d1.value, reason: w1d1.reason[l], trapType: w1d1.trapType },
          { value: w1d2.value, reason: w1d2.reason[l], trapType: w1d2.trapType },
        ]},
        { correct: w2correct, prompt: w2prompt[l], distractors: [
          { value: w2d1.value, reason: w2d1.reason[l], trapType: w2d1.trapType },
          { value: w2d2.value, reason: w2d2.reason[l], trapType: w2d2.trapType },
        ]},
      ],
    };
  }
  return Object.freeze(out);
}

const T = {
  eresQ: { ru: 'Какая связка нужна при обращении к собеседнику?', uk: 'Яка зв’язка потрібна при зверненні до співрозмовника?', en: 'Which linking word fits addressing the listener?', 'pt-BR': 'Qual ligação cabe ao falar com o interlocutor?', vi: 'Từ nối nào phù hợp khi nói với người nghe?', id: 'Kata penghubung mana yang cocok saat berbicara dengan pendengar?', tr: 'Dinleyiciye hitap etmek için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do zwracania się do słuchacza?' },
  esQ: { ru: 'Какая связка нужна для безличной оценки?', uk: 'Яка зв’язка потрібна для безособової оцінки?', en: 'Which linking word fits an impersonal evaluation?', 'pt-BR': 'Qual ligação cabe numa avaliação impessoal?', vi: 'Từ nối nào phù hợp cho đánh giá phi nhân xưng?', id: 'Kata penghubung mana yang cocok untuk penilaian impersonal?', tr: 'Kişisiz değerlendirme için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do bezosobowej oceny?' },
  soyQ: { ru: 'Какая связка нужна, когда говорят о себе?', uk: 'Яка зв’язка потрібна, коли кажуть про себе?', en: 'Which linking word fits talking about oneself?', 'pt-BR': 'Qual ligação cabe ao falar de si mesmo?', vi: 'Từ nối nào phù hợp khi nói về chính mình?', id: 'Kata penghubung mana yang cocok saat berbicara tentang diri sendiri?', tr: 'Kendisi hakkında konuşmak için hangi bağlaç uyar?', pl: 'Jaki łącznik pasuje do mówienia o sobie?' },
} as const;

function esVsEres(target: 'Eres' | 'Es'): Reasoned {
  if (target === 'Eres') {
    return { value: 'Es', trapType: 'grammar', reason: { ru: 'Es — про предмет или третье лицо. Обращение к собеседнику напрямую — только Eres.', uk: 'Es — про предмет чи третю особу. Звернення до співрозмовника напряму — тільки Eres.', en: 'Es is about a thing or a third person. Addressing the listener directly needs only Eres.', 'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. Falar com o interlocutor diretamente precisa só de Eres.', vi: 'Es nói về một vật hay ngôi thứ ba. Nói trực tiếp với người nghe chỉ cần Eres.', id: 'Es tentang benda atau orang ketiga. Berbicara langsung dengan pendengar hanya perlu Eres.', tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciye doğrudan hitap yalnızca Eres gerektirir.', pl: 'Es dotyczy rzeczy lub trzeciej osoby. Zwracanie się do słuchacza wymaga tylko Eres.' } };
  }
  return { value: 'Eres', trapType: 'grammar', reason: { ru: 'Eres обращается к собеседнику напрямую. Безличная оценка предмета — только Es.', uk: 'Eres звертається до співрозмовника напряму. Безособова оцінка предмета — тільки Es.', en: 'Eres addresses the listener directly. An impersonal evaluation of a thing needs only Es.', 'pt-BR': 'Eres fala com o interlocutor diretamente. Uma avaliação impessoal de uma coisa precisa só de Es.', vi: 'Eres nói trực tiếp với người nghe. Đánh giá phi nhân xưng về một vật chỉ cần Es.', id: 'Eres berbicara langsung dengan pendengar. Penilaian impersonal atas benda hanya perlu Es.', tr: 'Eres doğrudan dinleyiciyle konuşur. Bir şeyin kişisiz değerlendirmesi yalnızca Es gerektirir.', pl: 'Eres zwraca się bezpośrednio do słuchacza. Bezosobowa ocena rzeczy wymaga tylko Es.' } };
}

function soyVsOther(target: 'Eres' | 'Es'): Reasoned {
  if (target === 'Eres') {
    return { value: 'Soy', trapType: 'grammar', reason: { ru: 'Soy — про себя. Обращение к собеседнику — только Eres.', uk: 'Soy — про себе. Звернення до співрозмовника — тільки Eres.', en: 'Soy is about the speaker. Addressing the listener needs only Eres.', 'pt-BR': 'Soy é sobre quem fala. Falar com o interlocutor precisa só de Eres.', vi: 'Soy nói về người nói. Nói với người nghe chỉ cần Eres.', id: 'Soy tentang penutur. Berbicara dengan pendengar hanya perlu Eres.', tr: 'Soy konuşan hakkındadır. Dinleyiciye hitap yalnızca Eres gerektirir.', pl: 'Soy dotyczy mówiącego. Zwracanie się do słuchacza wymaga tylko Eres.' } };
  }
  return { value: 'Soy', trapType: 'grammar', reason: { ru: 'Soy — про себя. Безличная оценка предмета — только Es.', uk: 'Soy — про себе. Безособова оцінка предмета — тільки Es.', en: 'Soy is about the speaker. An impersonal evaluation of a thing needs only Es.', 'pt-BR': 'Soy é sobre quem fala. A avaliação impessoal de uma coisa precisa só de Es.', vi: 'Soy nói về người nói. Đánh giá phi nhân xưng về một vật chỉ cần Es.', id: 'Soy tentang penutur. Penilaian impersonal atas benda hanya perlu Es.', tr: 'Soy konuşan hakkındadır. Bir şeyin kişisiz değerlendirmesi yalnızca Es gerektirir.', pl: 'Soy dotyczy mówiącego. Bezosobowa ocena rzeczy wymaga tylko Es.' } };
}

function otherVsSoy(other: 'Eres' | 'Es'): Reasoned {
  if (other === 'Eres') {
    return { value: 'Eres', trapType: 'grammar', reason: { ru: 'Eres — про тебя. Говорящий про себя — только Soy.', uk: 'Eres — про тебе. Мовець про себе — тільки Soy.', en: 'Eres is about you. The speaker talking about themselves needs only Soy.', 'pt-BR': 'Eres é sobre você. Quem fala sobre si mesmo precisa só de Soy.', vi: 'Eres nói về bạn. Người nói về chính mình chỉ cần Soy.', id: 'Eres tentang kamu. Penutur tentang dirinya sendiri hanya perlu Soy.', tr: 'Eres senin hakkındadır. Konuşan kendisi hakkında yalnızca Soy gerektirir.', pl: 'Eres dotyczy ciebie. Mówiący o sobie wymaga tylko Soy.' } };
  }
  return { value: 'Es', trapType: 'grammar', reason: { ru: 'Es — про предмет или третье лицо. Говорящий про себя — только Soy.', uk: 'Es — про предмет чи третю особу. Мовець про себе — тільки Soy.', en: 'Es is about a thing or a third person. The speaker talking about themselves needs only Soy.', 'pt-BR': 'Es é sobre uma coisa ou terceira pessoa. Quem fala sobre si mesmo precisa só de Soy.', vi: 'Es nói về một vật hay ngôi thứ ba. Người nói về chính mình chỉ cần Soy.', id: 'Es tentang benda atau orang ketiga. Penutur tentang dirinya sendiri hanya perlu Soy.', tr: 'Es bir şey ya da üçüncü kişi hakkındadır. Konuşan kendisi hakkında yalnızca Soy gerektirir.', pl: 'Es dotyczy rzeczy lub trzeciej osoby. Mówiący o sobie wymaga tylko Soy.' } };
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

const wordPrompt = (word: string) => ({
  ru: `Какой признак нужен для ${word}?`, uk: `Яка ознака потрібна для ${word}?`, en: `Which quality fits ${word}?`, 'pt-BR': `Qual qualidade cabe a ${word}?`, vi: `Đặc điểm nào phù hợp cho ${word}?`, id: `Sifat mana yang cocok untuk ${word}?`, tr: `${word} için hangi nitelik uyar?`, pl: `Jaka cecha pasuje do ${word}?`,
});

export const ES_SESSION_13_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, Details>>>
> = Object.freeze({
  'es-e01-s13-eres-bonito': d(
    { ru: 'Ты красивый', uk: 'Ти красивий', en: 'You are pretty', 'pt-BR': 'Você é bonito', vi: 'Bạn đẹp trai', id: 'Kamu tampan', tr: 'Sen yakışıklısın', pl: 'Jesteś przystojny' },
    { ru: 'Естественная форма без местоимения tú — окончание -es уже само называет собеседника. Добавлять tú было бы избыточно, хотя и не ошибка.', uk: 'Природна форма без займенника tú — закінчення -es уже само називає співрозмовника. Додавати tú було б надлишковим, хоча й не помилкою.', en: 'The natural form without the pronoun tú — the ending -es already names the listener by itself. Adding tú would be redundant, though not wrong.', 'pt-BR': 'A forma natural sem o pronome tú — a terminação -es já nomeia o interlocutor sozinha. Adicionar tú seria redundante, embora não errado.', vi: 'Dạng tự nhiên không có đại từ tú — đuôi -es tự nó đã gọi tên người nghe. Thêm tú sẽ dư thừa, dù không sai.', id: 'Bentuk alami tanpa kata ganti tú — akhiran -es sudah menyebut pendengar dengan sendirinya. Menambahkan tú akan berlebihan, meskipun tidak salah.', tr: 'Tú zamiri olmadan doğal biçim — -es son eki dinleyiciyi zaten kendi başına adlandırır. Tú eklemek gereksiz olurdu, yanlış olmasa da.', pl: 'Naturalna forma bez zaimka tú — końcówka -es sama już nazywa słuchacza. Dodanie tú byłoby zbędne, choć nie błędne.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'bonito', wordPrompt('bonito'), genderPair('bonito', 'bonita', true), semanticNeighbor('bonito', 'rápido', { ru: '«быстрый»', uk: '«швидкий»', en: '"fast"', 'pt-BR': '"rápido"', vi: '"nhanh"', id: '"cepat"', tr: '"hızlı"', pl: '„szybki”' }),
  ),
  'es-e01-s13-eres-bonita': d(
    { ru: 'Ты красивая', uk: 'Ти красива', en: 'You are pretty (feminine)', 'pt-BR': 'Você é bonita', vi: 'Bạn xinh đẹp', id: 'Kamu cantik', tr: 'Sen güzelsin', pl: 'Jesteś ładna' },
    { ru: 'Тот же принцип, собеседница женского рода. Окончание -es само указывает на «ты», поэтому tú здесь избыточно.', uk: 'Той самий принцип, співрозмовниця жіночого роду. Закінчення -es само вказує на «ти», тому tú тут надлишкове.', en: 'The same principle, a feminine listener. The ending -es already points to "you", so tú is redundant here.', 'pt-BR': 'O mesmo princípio, uma interlocutora feminina. A terminação -es já aponta para "você", então tú é redundante aqui.', vi: 'Cùng nguyên tắc, người nghe giống cái. Đuôi -es đã chỉ ra "bạn", nên tú thừa ở đây.', id: 'Prinsip yang sama, pendengar feminin. Akhiran -es sudah menunjuk ke "kamu", jadi tú berlebihan di sini.', tr: 'Aynı ilke, dişil bir dinleyici. -es son eki zaten "sen"i gösterir, bu yüzden burada tú gereksizdir.', pl: 'Ta sama zasada, słuchaczka. Końcówka -es już wskazuje na „ty”, więc tú jest tu zbędne.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'bonita', wordPrompt('bonita'), genderPair('bonito', 'bonita', false), semanticNeighbor('bonita', 'segura', { ru: '«уверенная»', uk: '«впевнена»', en: '"confident"', 'pt-BR': '"confiante"', vi: '"tự tin"', id: '"percaya diri"', tr: '"kendine güvenen"', pl: '„pewna siebie”' }),
  ),
  'es-e01-s13-eres-rapido': d(
    { ru: 'Ты быстрый', uk: 'Ти швидкий', en: 'You are fast', 'pt-BR': 'Você é rápido', vi: 'Bạn nhanh nhẹn', id: 'Kamu cepat', tr: 'Sen hızlısın', pl: 'Jesteś szybki' },
    { ru: 'Так говорят собеседнику мужского рода про его темп, без лишнего tú. Форма связки сама несёт информацию о лице.', uk: 'Так кажуть співрозмовнику чоловічого роду про його темп, без зайвого tú. Форма зв’язки сама несе інформацію про особу.', en: 'This is how you tell a masculine listener about their pace, without extra tú. The linking-word form itself carries the person information.', 'pt-BR': 'É assim que se fala a um interlocutor masculino sobre seu ritmo, sem tú extra. A forma da ligação já carrega a informação de pessoa.', vi: 'Đây là cách nói với người nghe giống đực về tốc độ của họ, không cần tú thừa. Bản thân dạng từ nối đã mang thông tin về ngôi.', id: 'Beginilah cara membicarakan kecepatan pendengar maskulin, tanpa tú tambahan. Bentuk kata penghubung itu sendiri membawa informasi orang.', tr: 'Eril bir dinleyiciye temposu hakkında böyle söylenir, fazladan tú olmadan. Bağlaç biçiminin kendisi kişi bilgisini taşır.', pl: 'Tak mówi się słuchaczowi rodzaju męskiego o jego tempie, bez zbędnego tú. Sama forma łącznika niesie informację o osobie.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'rápido', wordPrompt('rápido'), genderPair('rápido', 'rápida', true), semanticNeighbor('rápido', 'verdadero', { ru: '«истинный»', uk: '«істинний»', en: '"true"', 'pt-BR': '"verdadeiro"', vi: '"đúng"', id: '"benar"', tr: '"doğru"', pl: '„prawdziwy”' }),
  ),
  'es-e01-s13-eres-rapida': d(
    { ru: 'Ты быстрая', uk: 'Ти швидка', en: 'You are fast (feminine)', 'pt-BR': 'Você é rápida', vi: 'Bạn nhanh nhẹn (giống cái)', id: 'Kamu cepat (feminin)', tr: 'Sen hızlısın (dişil)', pl: 'Jesteś szybka' },
    { ru: 'Тот же принцип о темпе, собеседница женского рода. Местоимение tú не нужно — форма eres однозначна.', uk: 'Той самий принцип про темп, співрозмовниця жіночого роду. Займенник tú не потрібен — форма eres однозначна.', en: 'The same principle about pace, a feminine listener. The pronoun tú is not needed — the form eres is unambiguous.', 'pt-BR': 'O mesmo princípio sobre ritmo, uma interlocutora feminina. O pronome tú não é necessário — a forma eres é inequívoca.', vi: 'Cùng nguyên tắc về tốc độ, người nghe giống cái. Đại từ tú không cần thiết — dạng eres đã rõ ràng.', id: 'Prinsip yang sama tentang kecepatan, pendengar feminin. Kata ganti tú tidak diperlukan — bentuk eres sudah jelas.', tr: 'Tempo hakkında aynı ilke, dişil bir dinleyici. Tú zamiri gerekli değildir — eres biçimi zaten açıktır.', pl: 'Ta sama zasada o tempie, słuchaczka. Zaimek tú nie jest potrzebny — forma eres jest jednoznaczna.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'rápida', wordPrompt('rápida'), genderPair('rápido', 'rápida', false), semanticNeighbor('rápida', 'única', { ru: '«единственная»', uk: '«єдина»', en: '"unique"', 'pt-BR': '"única"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyna”' }),
  ),
  'es-e01-s13-eres-segura': d(
    { ru: 'Ты уверенная', uk: 'Ти впевнена', en: 'You are confident', 'pt-BR': 'Você é confiante', vi: 'Bạn tự tin', id: 'Kamu percaya diri', tr: 'Sen kendine güveniyorsun', pl: 'Jesteś pewna siebie' },
    { ru: 'Утверждение о собеседнице без tú — окончание -es уже называет её напрямую. Лишнее местоимение не нужно и в утверждении, и в вопросе.', uk: 'Твердження про співрозмовницю без tú — закінчення -es уже називає її напряму. Зайвий займенник не потрібен ні у твердженні, ні в питанні.', en: 'A statement about the listener without tú — the ending -es already names her directly. The extra pronoun is not needed in a statement or in a question.', 'pt-BR': 'Uma afirmação sobre a interlocutora sem tú — a terminação -es já a nomeia diretamente. O pronome extra não é necessário numa afirmação nem numa pergunta.', vi: 'Câu khẳng định về người nghe không có tú — đuôi -es đã gọi tên cô ấy trực tiếp. Đại từ thừa không cần thiết dù trong câu khẳng định hay câu hỏi.', id: 'Pernyataan tentang pendengar tanpa tú — akhiran -es sudah menyebutnya secara langsung. Kata ganti tambahan tidak diperlukan baik dalam pernyataan maupun pertanyaan.', tr: 'Dinleyici hakkında tú olmadan bir ifade — -es son eki onu zaten doğrudan adlandırır. Fazladan zamir ne ifadede ne de soruda gerekli değildir.', pl: 'Twierdzenie o słuchaczce bez tú — końcówka -es już nazywa ją bezpośrednio. Dodatkowy zaimek nie jest potrzebny ani w twierdzeniu, ani w pytaniu.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'segura', wordPrompt('segura'), genderPair('seguro', 'segura', false), semanticNeighbor('segura', 'bonita', { ru: '«красивая»', uk: '«красива»', en: '"pretty"', 'pt-BR': '"bonita"', vi: '"xinh đẹp"', id: '"cantik"', tr: '"güzel"', pl: '„ładna”' }),
  ),
  'es-e01-s13-eres-unico': d(
    { ru: 'Ты единственный такой', uk: 'Ти єдиний такий', en: 'You are one of a kind', 'pt-BR': 'Você é único', vi: 'Bạn là duy nhất', id: 'Kamu satu-satunya', tr: 'Sen eşsizsin', pl: 'Jesteś jedyny w swoim rodzaju' },
    { ru: 'Собеседнику мужского рода говорят о его неповторимости без tú. Тильда над ú остаётся на месте, местоимение не влияет на написание.', uk: 'Співрозмовнику чоловічого роду кажуть про його неповторність без tú. Тильда над ú лишається на місці, займенник не впливає на написання.', en: 'A masculine listener is told about their uniqueness without tú. The tilde over ú stays in place, the pronoun does not affect the spelling.', 'pt-BR': 'Diz-se a um interlocutor masculino sobre sua singularidade sem tú. O til sobre ú permanece no lugar, o pronome não afeta a grafia.', vi: 'Người nghe giống đực được nói về sự độc đáo của họ không có tú. Dấu ngã trên ú vẫn giữ nguyên, đại từ không ảnh hưởng đến cách viết.', id: 'Pendengar maskulin diberi tahu tentang keunikannya tanpa tú. Tilde di atas ú tetap di tempatnya, kata ganti tidak memengaruhi ejaan.', tr: 'Eril bir dinleyiciye eşsizliği hakkında tú olmadan söylenir. Ú üzerindeki tilde yerinde kalır, zamir yazımı etkilemez.', pl: 'Słuchaczowi mówi się o jego wyjątkowości bez tú. Tylda nad ú zostaje na miejscu, zaimek nie wpływa na pisownię.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'único', wordPrompt('único'), genderPair('único', 'única', true), accentTrap('único', 'unico'),
  ),
  'es-e01-s13-eres-unica': d(
    { ru: 'Ты единственная такая', uk: 'Ти єдина така', en: 'You are one of a kind (feminine)', 'pt-BR': 'Você é única', vi: 'Bạn là duy nhất (giống cái)', id: 'Kamu satu-satunya (feminin)', tr: 'Sen eşsizsin (dişil)', pl: 'Jesteś jedyna w swoim rodzaju' },
    { ru: 'Тот же принцип о неповторимости, собеседница женского рода. Тильда над ú остаётся в обеих формах, а tú остаётся лишним.', uk: 'Той самий принцип про неповторність, співрозмовниця жіночого роду. Тильда над ú лишається в обох формах, а tú лишається зайвим.', en: 'The same principle about uniqueness, a feminine listener. The tilde over ú stays in both forms, and tú stays redundant.', 'pt-BR': 'O mesmo princípio sobre singularidade, uma interlocutora feminina. O til sobre ú permanece nas duas formas, e tú continua redundante.', vi: 'Cùng nguyên tắc về sự độc đáo, người nghe giống cái. Dấu ngã trên ú vẫn giữ ở cả hai dạng, còn tú vẫn thừa.', id: 'Prinsip yang sama tentang keunikan, pendengar feminin. Tilde di atas ú tetap di kedua bentuk, dan tú tetap berlebihan.', tr: 'Eşsizlik hakkında aynı ilke, dişil bir dinleyici. Ú üzerindeki tilde her iki biçimde de kalır, ve tú gereksiz kalır.', pl: 'Ta sama zasada o wyjątkowości, słuchaczka. Tylda nad ú zostaje w obu formach, a tú pozostaje zbędne.' },
    'Eres', T.eresQ, esVsEres('Eres'), soyVsOther('Eres'),
    'única', wordPrompt('única'), genderPair('único', 'única', false), accentTrap('única', 'unica'),
  ),
  'es-e01-s13-soy-rapido': d(
    { ru: 'Я быстрый', uk: 'Я швидкий', en: 'I am fast', 'pt-BR': 'Eu sou rápido', vi: 'Tôi nhanh nhẹn', id: 'Aku cepat', tr: 'Ben hızlıyım', pl: 'Jestem szybki' },
    { ru: 'Утверждение о себе без местоимения yo — форма soy сама называет говорящего. Recall из первой сессии внутри новой темы pro-drop.', uk: 'Твердження про себе без займенника yo — форма soy сама називає мовця. Recall з першої сесії всередині нової теми pro-drop.', en: 'A statement about oneself without the pronoun yo — the form soy already names the speaker. A recall from the first session inside the new pro-drop topic.', 'pt-BR': 'Uma afirmação sobre si mesmo sem o pronome yo — a forma soy já nomeia quem fala. Um recall da primeira sessão dentro do novo tema pro-drop.', vi: 'Câu khẳng định về chính mình không có đại từ yo — dạng soy đã gọi tên người nói. Một recall từ buổi đầu tiên trong chủ đề pro-drop mới.', id: 'Pernyataan tentang diri sendiri tanpa kata ganti yo — bentuk soy sudah menyebut penutur. Recall dari sesi pertama dalam topik pro-drop baru.', tr: 'Kendisi hakkında yo zamiri olmadan bir ifade — soy biçimi zaten konuşanı adlandırır. Yeni pro-drop konusu içinde birinci oturumdan bir recall.', pl: 'Twierdzenie o sobie bez zaimka yo — forma soy już nazywa mówiącego. Recall z pierwszej sesji w nowym temacie pro-drop.' },
    'Soy', T.soyQ, otherVsSoy('Eres'), otherVsSoy('Es'),
    'rápido', wordPrompt('rápido'), genderPair('rápido', 'rápida', true), semanticNeighbor('rápido', 'bonito', { ru: '«красивый»', uk: '«красивий»', en: '"pretty"', 'pt-BR': '"bonito"', vi: '"đẹp trai"', id: '"tampan"', tr: '"yakışıklı"', pl: '„przystojny”' }),
  ),
  'es-e01-s13-soy-bonita': d(
    { ru: 'Я красивая', uk: 'Я красива', en: 'I am pretty (feminine)', 'pt-BR': 'Eu sou bonita', vi: 'Tôi xinh đẹp', id: 'Aku cantik', tr: 'Ben güzelim', pl: 'Jestem ładna' },
    { ru: 'Женщина говорит о своей внешности без yo — форма soy уже её называет. То же правило pro-drop, что и с tú.', uk: 'Жінка каже про свою зовнішність без yo — форма soy уже її називає. Те саме правило pro-drop, що й з tú.', en: 'A woman talks about her looks without yo — the form soy already names her. The same pro-drop rule as with tú.', 'pt-BR': 'Uma mulher fala sobre sua aparência sem yo — a forma soy já a nomeia. A mesma regra pro-drop que com tú.', vi: 'Một phụ nữ nói về ngoại hình của mình không có yo — dạng soy đã gọi tên cô ấy. Cùng quy tắc pro-drop như với tú.', id: 'Seorang wanita membicarakan penampilannya tanpa yo — bentuk soy sudah menyebutnya. Aturan pro-drop yang sama seperti dengan tú.', tr: 'Bir kadın yo olmadan görünüşü hakkında konuşur — soy biçimi onu zaten adlandırır. Tú ile aynı pro-drop kuralı.', pl: 'Kobieta mówi o swoim wyglądzie bez yo — forma soy już ją nazywa. Ta sama zasada pro-drop co z tú.' },
    'Soy', T.soyQ, otherVsSoy('Eres'), otherVsSoy('Es'),
    'bonita', wordPrompt('bonita'), genderPair('bonito', 'bonita', false), semanticNeighbor('bonita', 'rápida', { ru: '«быстрая»', uk: '«швидка»', en: '"fast"', 'pt-BR': '"rápida"', vi: '"nhanh"', id: '"cepat"', tr: '"hızlı"', pl: '„szybka”' }),
  ),
  'es-e01-s13-soy-segura': d(
    { ru: 'Я уверенная', uk: 'Я впевнена', en: 'I am confident', 'pt-BR': 'Eu sou confiante', vi: 'Tôi tự tin', id: 'Aku percaya diri', tr: 'Ben kendime güveniyorum', pl: 'Jestem pewna siebie' },
    { ru: 'Женщина говорит о своей уверенности в себе без местоимения. Recall новой лексики (сессия 12) внутри темы pro-drop.', uk: 'Жінка каже про свою впевненість у собі без займенника. Recall нової лексики (сесія 12) всередині теми pro-drop.', en: 'A woman talks about her self-confidence without a pronoun. A recall of new vocabulary (session 12) inside the pro-drop topic.', 'pt-BR': 'Uma mulher fala sobre sua autoconfiança sem pronome. Um recall de vocabulário novo (sessão 12) dentro do tema pro-drop.', vi: 'Một phụ nữ nói về sự tự tin của mình không có đại từ. Một recall từ vựng mới (buổi 12) trong chủ đề pro-drop.', id: 'Seorang wanita membicarakan kepercayaan dirinya tanpa kata ganti. Recall kosakata baru (sesi 12) dalam topik pro-drop.', tr: 'Bir kadın kendine güveni hakkında zamir olmadan konuşur. Pro-drop konusu içinde yeni kelime dağarcığından (12. oturum) bir recall.', pl: 'Kobieta mówi o swojej pewności siebie bez zaimka. Recall nowego słownictwa (sesja 12) w temacie pro-drop.' },
    'Soy', T.soyQ, otherVsSoy('Eres'), otherVsSoy('Es'),
    'segura', wordPrompt('segura'), genderPair('seguro', 'segura', false), semanticNeighbor('segura', 'única', { ru: '«единственная»', uk: '«єдина»', en: '"unique"', 'pt-BR': '"única"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyna”' }),
  ),
  'es-e01-s13-es-bonito': d(
    { ru: 'Это красиво', uk: 'Це красиво', en: 'It is pretty', 'pt-BR': 'É bonito', vi: 'Cái đó đẹp', id: 'Itu bagus', tr: 'Bu güzel', pl: 'To ładne' },
    { ru: 'Безличная оценка предмета — тут вообще нет личного местоимения, потому что подлежащее «это» не называется отдельным словом никогда.', uk: 'Безособова оцінка предмета — тут узагалі немає особового займенника, бо підмет «це» ніколи не називається окремим словом.', en: 'An impersonal evaluation of a thing — there is no personal pronoun at all here, because the subject "it" is never named by a separate word.', 'pt-BR': 'Uma avaliação impessoal de uma coisa — não há pronome pessoal aqui, porque o sujeito "isso" nunca é nomeado por uma palavra separada.', vi: 'Đánh giá phi nhân xưng về một vật — ở đây hoàn toàn không có đại từ nhân xưng, vì chủ ngữ "nó" không bao giờ được gọi tên bằng một từ riêng.', id: 'Penilaian impersonal atas suatu benda — sama sekali tidak ada kata ganti orang di sini, karena subjek "itu" tidak pernah disebut dengan kata terpisah.', tr: 'Bir şeyin kişisiz değerlendirmesi — burada hiç kişi zamiri yoktur, çünkü özne "bu" ayrı bir kelimeyle asla adlandırılmaz.', pl: 'Bezosobowa ocena rzeczy — tutaj w ogóle nie ma zaimka osobowego, ponieważ podmiot „to” nigdy nie jest nazywany osobnym słowem.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'bonito', wordPrompt('bonito'), genderPair('bonito', 'bonita', true), semanticNeighbor('bonito', 'fácil', { ru: '«лёгкий»', uk: '«легкий»', en: '"easy"', 'pt-BR': '"fácil"', vi: '"dễ"', id: '"mudah"', tr: '"kolay"', pl: '„łatwy”' }),
  ),
  'es-e01-s13-es-rapido': d(
    { ru: 'Это быстро', uk: 'Це швидко', en: 'It is fast', 'pt-BR': 'É rápido', vi: 'Cái đó nhanh', id: 'Itu cepat', tr: 'Bu hızlı', pl: 'To szybkie' },
    { ru: 'Безличная оценка темпа — так же без местоимения «это» как отдельного слова. Recall из пятой сессии внутри новой темы.', uk: 'Безособова оцінка темпу — так само без займенника «це» як окремого слова. Recall з п’ятої сесії всередині нової теми.', en: 'An impersonal evaluation of pace — the same way, without "it" as a separate pronoun word. A recall from the fifth session inside the new topic.', 'pt-BR': 'Uma avaliação impessoal do ritmo — do mesmo jeito, sem "isso" como palavra-pronome separada. Um recall da quinta sessão dentro do novo tema.', vi: 'Đánh giá phi nhân xưng về tốc độ — cũng theo cách đó, không có "nó" như một từ đại từ riêng. Một recall từ buổi thứ năm trong chủ đề mới.', id: 'Penilaian impersonal atas kecepatan — dengan cara yang sama, tanpa "itu" sebagai kata ganti terpisah. Recall dari sesi kelima dalam topik baru.', tr: 'Temponun kişisiz değerlendirmesi — aynı şekilde, "bu" ayrı bir zamir kelimesi olmadan. Yeni konu içinde beşinci oturumdan bir recall.', pl: 'Bezosobowa ocena tempa — w ten sam sposób, bez „to” jako osobnego słowa-zaimka. Recall z piątej sesji w nowym temacie.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'rápido', wordPrompt('rápido'), genderPair('rápido', 'rápida', true), semanticNeighbor('rápido', 'único', { ru: '«единственный»', uk: '«єдиний»', en: '"unique"', 'pt-BR': '"único"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyny”' }),
  ),
  'es-e01-s13-es-verdad': d(
    { ru: 'Это правда', uk: 'Це правда', en: 'It is true', 'pt-BR': 'É verdade', vi: 'Điều đó đúng', id: 'Itu benar', tr: 'Bu doğru', pl: 'To prawda' },
    { ru: 'Устойчивая реакция подтверждения без местоимения — уже знакомая фраза из первой сессии, здесь встречается как recall внутри новой темы.', uk: 'Стала реакція підтвердження без займенника — уже знайома фраза з першої сесії, тут трапляється як recall всередині нової теми.', en: 'A fixed confirmation reaction without a pronoun — a phrase already known from the first session, here it appears as a recall inside the new topic.', 'pt-BR': 'Uma reação fixa de confirmação sem pronome — uma frase já conhecida da primeira sessão, aqui aparece como recall dentro do novo tema.', vi: 'Phản ứng xác nhận cố định không có đại từ — cụm từ đã quen từ buổi đầu tiên, ở đây xuất hiện như một recall trong chủ đề mới.', id: 'Reaksi konfirmasi tetap tanpa kata ganti — frasa yang sudah dikenal dari sesi pertama, di sini muncul sebagai recall dalam topik baru.', tr: 'Zamir olmadan sabit bir onay tepkisi — birinci oturumdan zaten tanıdık bir ifade, burada yeni konu içinde bir recall olarak görünür.', pl: 'Utrwalona reakcja potwierdzenia bez zaimka — fraza już znana z pierwszej sesji, tu pojawia się jako recall w nowym temacie.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'verdad', { ru: 'Какое слово нужно для подтверждения чужих слов?', uk: 'Яке слово потрібне для підтвердження чужих слів?', en: 'Which word confirms someone else\'s words?', 'pt-BR': 'Qual palavra confirma as palavras de outra pessoa?', vi: 'Từ nào xác nhận lời của người khác?', id: 'Kata mana yang mengonfirmasi kata-kata orang lain?', tr: 'Başkasının sözlerini doğrulayan kelime hangisidir?', pl: 'Które słowo potwierdza czyjeś słowa?' },
    { value: 'verdadero', trapType: 'grammar', reason: { ru: 'Verdadero — признак предмета, «истинный». Устойчивая реакция — именно verdad, существительное.', uk: 'Verdadero — ознака предмета, «істинний». Стала реакція — саме verdad, іменник.', en: 'Verdadero is a quality of a thing, "true". The fixed reaction needs exactly verdad, a noun.', 'pt-BR': 'Verdadero é uma qualidade de uma coisa, "verdadeiro". A reação fixa precisa exatamente de verdad, um substantivo.', vi: 'Verdadero là đặc điểm của một vật, "chân thực". Phản ứng cố định cần chính xác verdad, danh từ.', id: 'Verdadero adalah sifat suatu benda, "sejati". Reaksi tetap memerlukan tepat verdad, kata benda.', tr: 'Verdadero bir şeyin niteliğidir, "gerçek". Sabit tepki tam olarak verdad’ı, bir ismi gerektirir.', pl: 'Verdadero to cecha rzeczy, „prawdziwy”. Utrwalona reakcja wymaga dokładnie verdad, rzeczownika.' } },
    semanticNeighbor('verdad', 'única', { ru: '«единственная»', uk: '«єдина»', en: '"unique"', 'pt-BR': '"única"', vi: '"duy nhất"', id: '"unik"', tr: '"eşsiz"', pl: '„jedyna”' }),
  ),
  'es-e01-s13-es-unico': d(
    { ru: 'Это единственное такое', uk: 'Це єдине таке', en: 'It is one of a kind', 'pt-BR': 'É único', vi: 'Cái đó duy nhất', id: 'Itu satu-satunya', tr: 'Bu eşsiz', pl: 'To jedyne w swoim rodzaju' },
    { ru: 'Безличная оценка неповторимости предмета, без местоимения. Тильда над ú остаётся на месте, как и в любой другой форме этого слова.', uk: 'Безособова оцінка неповторності предмета, без займенника. Тильда над ú лишається на місці, як і в будь-якій іншій формі цього слова.', en: 'An impersonal evaluation of a thing\'s uniqueness, without a pronoun. The tilde over ú stays in place, as in any other form of this word.', 'pt-BR': 'Uma avaliação impessoal da singularidade de uma coisa, sem pronome. O til sobre ú permanece no lugar, como em qualquer outra forma dessa palavra.', vi: 'Đánh giá phi nhân xưng về sự độc đáo của một vật, không có đại từ. Dấu ngã trên ú vẫn giữ nguyên, như trong bất kỳ dạng nào khác của từ này.', id: 'Penilaian impersonal atas keunikan suatu benda, tanpa kata ganti. Tilde di atas ú tetap di tempatnya, seperti bentuk lain dari kata ini.', tr: 'Bir şeyin eşsizliğinin kişisiz değerlendirmesi, zamir olmadan. Ú üzerindeki tilde, bu kelimenin diğer biçimlerinde olduğu gibi yerinde kalır.', pl: 'Bezosobowa ocena wyjątkowości rzeczy, bez zaimka. Tylda nad ú zostaje na miejscu, tak jak w każdej innej formie tego słowa.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'único', wordPrompt('único'), genderPair('único', 'única', true), accentTrap('único', 'unico'),
  ),
  'es-e01-s13-es-segura': d(
    { ru: 'Она уверенная', uk: 'Вона впевнена', en: 'She is confident', 'pt-BR': 'Ela é confiante', vi: 'Cô ấy tự tin', id: 'Dia percaya diri', tr: 'O kendine güveniyor', pl: 'Ona jest pewna siebie' },
    { ru: 'Про третье лицо женского рода без местоимения ella — форма es в разговоре о конкретном человеке обычно тоже опускает подлежащее.', uk: 'Про третю особу жіночого роду без займенника ella — форма es у розмові про конкретну людину зазвичай теж опускає підмет.', en: 'About a feminine third person without the pronoun ella — the form es in a conversation about a specific person usually drops the subject too.', 'pt-BR': 'Sobre uma terceira pessoa feminina sem o pronome ella — a forma es numa conversa sobre uma pessoa específica geralmente também omite o sujeito.', vi: 'Về ngôi thứ ba giống cái không có đại từ ella — dạng es trong cuộc trò chuyện về một người cụ thể thường cũng bỏ chủ ngữ.', id: 'Tentang orang ketiga feminin tanpa kata ganti ella — bentuk es dalam percakapan tentang seseorang tertentu biasanya juga menghilangkan subjek.', tr: 'Dişil bir üçüncü kişi hakkında ella zamiri olmadan — belirli bir kişi hakkındaki konuşmada es biçimi de genellikle özneyi düşürür.', pl: 'O trzeciej osobie rodzaju żeńskiego bez zaimka ella — forma es w rozmowie o konkretnej osobie zwykle też pomija podmiot.' },
    'Es', T.esQ, esVsEres('Es'), soyVsOther('Es'),
    'segura', wordPrompt('segura'), genderPair('seguro', 'segura', false), semanticNeighbor('segura', 'rápida', { ru: '«быстрая»', uk: '«швидка»', en: '"fast"', 'pt-BR': '"rápida"', vi: '"nhanh"', id: '"cepat"', tr: '"hızlı"', pl: '„szybka”' }),
  ),
});
