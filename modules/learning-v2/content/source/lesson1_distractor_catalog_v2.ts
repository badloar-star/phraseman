import type {
  EpisodeSourceDistractor,
  EpisodeSourcePhrase,
  EpisodeSourcePhraseLocalizedDetails,
} from './episode_01_source_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export type Lesson1DistractorTrapType = NonNullable<EpisodeSourceDistractor['trapType']>;

export type Lesson1DistractorLocale = keyof NonNullable<EpisodeSourcePhrase['localizedDetails']>;

/**
 * Локали, для которых этот каталог пишет объяснения дистракторов.
 *
 * зачем (2026-08-23): общий список локалей источника получил девятую запись
 * 'en' — её добавили для ИСПАНСКОГО курса, где английский служит языком
 * объяснения. Для урока 1 английского курса пара «объясняем английский
 * по-английски» вырожденная: `LOCALES` ниже её намеренно не содержит, и в
 * словари объяснений 'en' физически не приходит (единственный проход — по
 * LOCALES, см. генерацию в конце файла).
 *
 * Поэтому тип словарей сужен до реально обслуживаемых локалей, а не расширен
 * пустыми английскими строками: пустышка молча доехала бы до ученика вместо
 * честного UNTRANSLATED_MARKER. Появится английский курс с объяснениями на
 * английском — добавляем 'en' И в LOCALES, И в каждый словарь разом.
 */
type Locale = Exclude<Lesson1DistractorLocale, 'en'>;

const LOCALES: readonly Locale[] = [
  'ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
];

const GROUPS = Object.freeze({
  article: ['a', 'an', 'the', 'this', 'that', 'my', 'your'],
  copula: ['am', 'is', 'are', 'do', 'does', "isn't", "aren't", 'not', "i'm", "you're", "he's", "she's", "it's", "we're", "they're"],
  subject: ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me'],
  possessive: ['my', 'your', 'his', 'her', 'mine', 'yours', 'hers', 'whose'],
  question: ['how', 'what', 'where', 'who', 'whose', 'is', 'are'],
  preposition: ['at', 'in', 'on', 'to', 'here', 'home'],
  connector: ['and', 'but', 'too', 'all', 'alone', 'together'],
  object: ['bag', 'book', 'cup', 'key', 'pen', 'phone', 'books', 'bags', 'cups', 'keys'],
  place: ['bus', 'café', 'class', 'park', 'room', 'station', 'work', 'home', 'here'],
  plural: ['bags', 'books', 'cups', 'keys', 'friends', 'students', 'teachers', 'years'],
  family: ['brother', "brother's", 'father', "father's", 'mother', "mother's", 'sister', "sister's", 'parent', 'friends'],
  profession: ['artist', 'cook', 'designer', 'doctor', 'driver', 'engineer', 'freelancer', 'guide', 'manager', 'nurse', 'photographer', 'student', 'teacher', 'writer'],
  emotion: ['angry', 'bored', 'calm', 'excited', 'happy', 'nervous', 'relaxed', 'sad', 'scared', 'upset', 'worried'],
  physical: ['cold', 'comfortable', 'hot', 'hungry', 'sick', 'sleepy', 'thirsty', 'tired', 'warm'],
  readiness: ['busy', 'fine', 'free', 'okay', 'ready', 'right', 'safe', 'sure'],
  weather: ['cloudy', 'cold', 'hot', 'rainy', 'sunny', 'warm', 'windy'],
  quality: ['big', 'blue', 'funny', 'green', 'kind', 'old', 'quiet', 'red', 'small'],
  timing: ['early', 'late', 'morning', 'afternoon', 'evening', 'night'],
  number: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
  formula: ['afternoon', 'evening', 'morning', 'night', 'good', 'hello', 'hi', 'nice', 'meet', 'later', 'see', 'thank', 'thanks', 'welcome', 'please', 'take', 'care', 'sorry', 'pardon', 'excuse', 'me'],
} as const);

const DISPLAY: Readonly<Record<string, string>> = Object.freeze({
  i: 'I', "i'm": 'I’m', "you're": 'You’re', "he's": 'He’s',
  "she's": 'She’s', "it's": 'It’s', "we're": 'We’re', "they're": 'They’re',
});

const PHONETIC_PAIRS = new Set([
  'eight|eighteen', 'eighteen|eight', 'four|fourteen', 'fourteen|four',
  'here|her', 'her|here', 'to|two', 'two|to',
  'hi|high', 'hi|he', 'hello|yellow',
  'thank|think', 'thank|tank', 'thanks|thinks', 'thanks|tanks',
  'please|peas', 'please|peace',
]);

const ORTHOGRAPHIC_PAIRS = new Set([
  'her|hers', 'hers|her', 'his|hers', 'hers|his', "i|i'm", "i'm|i",
  'hello|hell',
  "she|she's", "she's|she", "they|they're", "they're|they",
  "we|we're", "we're|we", "you|you're", "you're|you",
  "your|you're", "you're|your", 'who|whose', 'whose|who',
]);

const NUMBER_AGREEMENT_PAIRS = new Set([
  'bag|bags', 'bags|bag', 'book|books', 'books|book',
  'cup|cups', 'cups|cup', 'key|keys', 'keys|key',
  'student|students', 'students|student',
  'teacher|teachers', 'teachers|teacher',
]);

// These are editorially ordered form traps, not a generic vocabulary ring.
// The first two choices are the closest *wrong* forms for a positive clause:
// they preserve the task's meaning while testing agreement/auxiliary choice.
// Negative forms stay later and therefore cannot turn a positive prompt into
// an accidentally valid negative answer.
const FORM_NEIGHBORS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  am: ['is', 'are', 'do', "isn't", "aren't"],
  is: ['are', 'am', 'do', "isn't", "aren't"],
  are: ['is', 'do', 'am', "isn't", "aren't"],
  do: ['does', 'is', 'are', "isn't", "aren't"],
  does: ['do', 'is', 'are', "isn't", "aren't"],
  "isn't": ["aren't", 'is', 'are', 'do', 'not'],
  "aren't": ["isn't", 'are', 'is', 'do', 'not'],
  at: ['in', 'on', 'to', 'here', 'home'],
  in: ['on', 'at', 'to', 'here', 'home'],
  on: ['in', 'at', 'to', 'here', 'home'],
  to: ['at', 'in', 'on', 'here', 'home'],
  hi: ['high', 'he', 'hide', 'hike', 'hit'],
  hello: ['yellow', 'hell', 'help', 'halo', 'hollow'],
  thank: ['thanks', 'think', 'tank', 'welcome', 'please'],
  thanks: ['thank', 'thinks', 'think', 'tanks', 'welcome'],
  please: ['peas', 'peace', 'lease', 'place', 'sorry'],
});

function key(value: string): string {
  return value.normalize('NFKC').replace(/[’]/gu, "'").toLowerCase();
}

function display(value: string): string {
  return DISPLAY[key(value)] ?? value.replace(/[']/gu, '’');
}

function groupFor(correct: string): readonly string[] {
  const token = key(correct);
  if (/^(?:a|an|the)$/u.test(token)) return GROUPS.article;
  if (/^(?:am|is|are|do|does|isn't|aren't|not|i'm|you're|he's|she's|it's|we're|they're)$/u.test(token)) return GROUPS.copula;
  if (/^(?:i|you|he|she|it|we|they|me)$/u.test(token)) return GROUPS.subject;
  if (/^(?:my|your|his|her|mine|yours|hers|whose)$/u.test(token)) return GROUPS.possessive;
  if (/^(?:how|what|where|who)$/u.test(token)) return GROUPS.question;
  if (/^(?:at|in|on|to)$/u.test(token)) return GROUPS.preposition;
  if (/^(?:and|but|too|all|alone|together)$/u.test(token)) return GROUPS.connector;
  if (GROUPS.plural.includes(token as never)) return GROUPS.plural;
  if (GROUPS.family.includes(token as never)) return GROUPS.family;
  if (GROUPS.profession.includes(token as never)) return GROUPS.profession;
  if (GROUPS.number.includes(token as never)) return GROUPS.number;
  if (GROUPS.formula.includes(token as never)) return GROUPS.formula;
  if (GROUPS.place.includes(token as never)) return GROUPS.place;
  if (GROUPS.object.includes(token as never)) return GROUPS.object;
  if (GROUPS.emotion.includes(token as never)) return GROUPS.emotion;
  if (GROUPS.physical.includes(token as never)) return GROUPS.physical;
  if (GROUPS.readiness.includes(token as never)) return GROUPS.readiness;
  if (GROUPS.weather.includes(token as never)) return GROUPS.weather;
  if (GROUPS.quality.includes(token as never)) return GROUPS.quality;
  if (GROUPS.timing.includes(token as never)) return GROUPS.timing;
  if (/^(?:this|that)$/u.test(token)) return GROUPS.article;
  throw new Error(`lesson1_distractor_catalog_missing:${correct}`);
}

function distractorValues(correct: string, sessionOrdinal?: number): readonly string[] {
  const normalizedCorrect = key(correct);
  if (sessionOrdinal === 13 && normalizedCorrect === "you're") {
    return ['Your', 'You', 'Youre', 'Yours', 'You is'];
  }
  const editorialNeighbors = FORM_NEIGHBORS[normalizedCorrect];
  if (editorialNeighbors) return editorialNeighbors.map(display);
  const group = [...new Set(groupFor(correct).map(display))];
  const correctIndex = group.findIndex((value) => key(value) === normalizedCorrect);
  if (correctIndex < 0) throw new Error(`lesson1_distractor_catalog_target_not_in_group:${correct}`);
  const candidates = group
    .slice(correctIndex + 1)
    .concat(group.slice(0, correctIndex));
  const preferred = candidates.filter((value) =>
    PHONETIC_PAIRS.has(`${normalizedCorrect}|${key(value)}`) ||
    ORTHOGRAPHIC_PAIRS.has(`${normalizedCorrect}|${key(value)}`),
  );
  const remaining = candidates.filter((value) => !preferred.includes(value));
  const result = [...preferred, ...remaining].slice(0, 5);
  if (result.length !== 5) throw new Error(`lesson1_distractor_catalog_too_small:${correct}`);
  return result;
}

function trapType(correct: string, alternative: string): Lesson1DistractorTrapType {
  const pair = `${key(correct)}|${key(alternative)}`;
  if (PHONETIC_PAIRS.has(pair)) return 'phonetic';
  if (ORTHOGRAPHIC_PAIRS.has(pair)) return 'orthographic';
  if (NUMBER_AGREEMENT_PAIRS.has(pair)) return 'grammar';
  if (/^(?:sorry|pardon|excuse|please|thank|thanks|welcome|nice|meet|see|take|care|good|morning|afternoon|evening|night|later)$/iu.test(correct)) return 'collocation_pragmatics';
  if (/^(?:and|but|too|not)$/iu.test(correct)) return 'phrase_assembly';
  if (/^(?:i|me|a|an|the|at|in|on|to)$/iu.test(correct)) return 'l1_transfer';
  if (/^(?:am|is|are|do|does|isn't|aren't|i'm|you're|he's|she's|it's|we're|they're|you|he|she|it|we|they|my|your|his|her|mine|yours|hers|whose|how|what|where|who|this|that)$/iu.test(key(correct))) return 'grammar';
  return 'semantic_neighbor';
}

type SemanticFamily =
  | 'emotion'
  | 'family'
  | 'object'
  | 'physical'
  | 'place'
  | 'profession'
  | 'quality'
  | 'readiness'
  | 'timing'
  | 'weather'
  | 'number_or_plural';

function semanticFamily(correct: string): SemanticFamily {
  const token = key(correct);
  if (GROUPS.emotion.includes(token as never)) return 'emotion';
  if (GROUPS.family.includes(token as never)) return 'family';
  if (GROUPS.object.includes(token as never)) return 'object';
  if (GROUPS.physical.includes(token as never)) return 'physical';
  if (GROUPS.place.includes(token as never)) return 'place';
  if (GROUPS.profession.includes(token as never)) return 'profession';
  if (GROUPS.quality.includes(token as never)) return 'quality';
  if (GROUPS.readiness.includes(token as never)) return 'readiness';
  if (GROUPS.timing.includes(token as never)) return 'timing';
  if (GROUPS.weather.includes(token as never)) return 'weather';
  return 'number_or_plural';
}

const SEMANTIC_FAMILY_FOCUS: Readonly<
  Record<Locale, Record<SemanticFamily, string>>
> = Object.freeze({
  ru: {
    emotion: 'эмоцию человека', family: 'семейную роль', object: 'конкретный предмет',
    physical: 'телесное ощущение', place: 'конкретное место', profession: 'профессию человека',
    quality: 'видимый признак', readiness: 'готовность или текущее состояние',
    timing: 'часть дня или время', weather: 'состояние погоды', number_or_plural: 'точное число или количество',
  },
  uk: {
    emotion: 'емоцію людини', family: 'сімейну роль', object: 'конкретний предмет',
    physical: 'тілесне відчуття', place: 'конкретне місце', profession: 'професію людини',
    quality: 'видиму ознаку', readiness: 'готовність або поточний стан',
    timing: 'частину дня або час', weather: 'стан погоди', number_or_plural: 'точне число або кількість',
  },
  es: {
    emotion: 'una emoción de la persona', family: 'un vínculo familiar', object: 'un objeto concreto',
    physical: 'una sensación física', place: 'un lugar concreto', profession: 'la profesión de la persona',
    quality: 'un rasgo visible', readiness: 'la disponibilidad o el estado actual',
    timing: 'un momento del día', weather: 'el estado del tiempo', number_or_plural: 'el número o la cantidad exactos',
  },
  'pt-BR': {
    emotion: 'uma emoção da pessoa', family: 'um vínculo familiar', object: 'um objeto específico',
    physical: 'uma sensação física', place: 'um lugar específico', profession: 'a profissão da pessoa',
    quality: 'uma característica visível', readiness: 'a disponibilidade ou o estado atual',
    timing: 'um momento do dia', weather: 'a condição do tempo', number_or_plural: 'o número ou a quantidade exatos',
  },
  vi: {
    emotion: 'cảm xúc của một người', family: 'vai trò trong gia đình', object: 'một đồ vật cụ thể',
    physical: 'cảm giác cơ thể', place: 'một địa điểm cụ thể', profession: 'nghề nghiệp của một người',
    quality: 'đặc điểm nhìn thấy được', readiness: 'mức độ sẵn sàng hoặc trạng thái hiện tại',
    timing: 'một thời điểm trong ngày', weather: 'tình trạng thời tiết', number_or_plural: 'con số hoặc số lượng chính xác',
  },
  id: {
    emotion: 'emosi seseorang', family: 'hubungan keluarga', object: 'benda tertentu',
    physical: 'sensasi tubuh', place: 'tempat tertentu', profession: 'profesi seseorang',
    quality: 'ciri yang terlihat', readiness: 'kesiapan atau keadaan saat ini',
    timing: 'bagian hari atau waktu', weather: 'keadaan cuaca', number_or_plural: 'angka atau jumlah yang tepat',
  },
  tr: {
    emotion: 'kişinin duygusunu', family: 'aile içindeki rolü', object: 'belirli bir nesneyi',
    physical: 'bedensel bir durumu', place: 'belirli bir yeri', profession: 'kişinin mesleğini',
    quality: 'görünür bir özelliği', readiness: 'hazırlık ya da o anki durumu',
    timing: 'günün bir bölümünü veya zamanı', weather: 'hava durumunu', number_or_plural: 'tam sayı ya da miktarı',
  },
  pl: {
    emotion: 'emocję osoby', family: 'rolę w rodzinie', object: 'konkretny przedmiot',
    physical: 'odczucie fizyczne', place: 'konkretne miejsce', profession: 'zawód osoby',
    quality: 'widoczną cechę', readiness: 'gotowość lub obecny stan',
    timing: 'porę dnia lub czas', weather: 'stan pogody', number_or_plural: 'dokładną liczbę lub ilość',
  },
});

function semanticNeighborReason(
  locale: Locale,
  wrong: string,
  correct: string,
  phrase: string,
): string {
  const focus = SEMANTIC_FAMILY_FOCUS[locale][semanticFamily(correct)];
  const copy: Record<Locale, string> = {
    ru: `«${wrong}» относится к той же близкой теме, но здесь проверяется ${focus}. В «${phrase}» это значение передаёт «${correct}», поэтому похожее по теме «${wrong}» описало бы уже другую ситуацию.`,
    uk: `«${wrong}» належить до тієї самої близької теми, але тут перевіряється ${focus}. У «${phrase}» це значення передає «${correct}», тому схоже за темою «${wrong}» описало б іншу ситуацію.`,
    es: `«${wrong}» pertenece al mismo campo cercano, pero aquí se identifica ${focus}. En «${phrase}» ese sentido lo expresa «${correct}»; elegir «${wrong}» describiría otra situación.`,
    'pt-BR': `«${wrong}» pertence ao mesmo campo próximo, mas aqui se identifica ${focus}. Em «${phrase}» esse sentido é dado por «${correct}»; escolher «${wrong}» descreveria outra situação.`,
    vi: `“${wrong}” thuộc cùng một nhóm nghĩa gần, nhưng ở đây cần xác định ${focus}. Trong “${phrase}”, ý đó do “${correct}” diễn đạt; chọn “${wrong}” sẽ thành tình huống khác.`,
    id: `“${wrong}” masih berada dalam bidang makna yang berdekatan, tetapi yang diuji di sini ialah ${focus}. Dalam “${phrase}”, makna itu dibawa oleh “${correct}”; memilih “${wrong}” akan menggambarkan situasi lain.`,
    tr: `«${wrong}» yakın bir anlam alanındadır, fakat burada ${focus} anlatan sözcük aranıyor. «${phrase}» içinde bu anlamı «${correct}» verir; «${wrong}» seçilirse başka bir durum anlatılır.`,
    pl: `„${wrong}” należy do bliskiego pola znaczeń, lecz tutaj trzeba nazwać ${focus}. W „${phrase}” ten sens wyraża „${correct}”; wybór „${wrong}” opisałby inną sytuację.`,
  };
  return copy[locale];
}

const REASON: Readonly<Record<Locale, Record<Lesson1DistractorTrapType, (wrong: string, correct: string, phrase: string) => string>>> = Object.freeze({
  ru: {
    grammar: (w, c, p) => `«${w}» похоже по грамматической роли, но не согласуется с этой позицией в «${p}»; здесь нужна форма «${c}».`,
    semantic_neighbor: (w, c, p) => `«${w}» относится к той же теме и поэтому отвлекает, но называет другой предмет, признак или число; точный смысл «${p}» требует «${c}».`,
    collocation_pragmatics: (w, c, p) => `«${w}» встречается в близких вежливых формулах, но не образует нужную готовую реплику «${p}»; её естественная часть — «${c}».`,
    phonetic: (w, c, p) => `«${w}» созвучно с «${c}», но отличается окончанием или ударным слогом; в звучании и смысле «${p}» нужно распознать именно «${c}».`,
    orthographic: (w, c, p) => `«${w}» визуально похоже на «${c}», но апостроф, окончание или набор букв задаёт другую форму; в «${p}» пишется «${c}».`,
    l1_transfer: (w, c, p) => `«${w}» появляется при дословном переносе привычного порядка или формы родного языка, но английская конструкция «${p}» требует «${c}».`,
    phrase_assembly: (w, c, p) => `«${w}» можно поставить рядом в другой связи, но здесь оно меняет порядок или отношение частей; фраза «${p}» собирается со словом «${c}».`,
  },
  uk: {
    grammar: (w, c, p) => `«${w}» має схожу граматичну роль, але не узгоджується з цією позицією у «${p}»; тут потрібна форма «${c}».`,
    semantic_neighbor: (w, c, p) => `«${w}» належить до тієї самої теми й тому відволікає, але називає іншу річ, ознаку або число; точний зміст «${p}» потребує «${c}».`,
    collocation_pragmatics: (w, c, p) => `«${w}» трапляється у схожих ввічливих формулах, але не утворює потрібну готову репліку «${p}»; її природна частина — «${c}».`,
    phonetic: (w, c, p) => `«${w}» співзвучне з «${c}», проте відрізняється закінченням або наголошеним складом; у звучанні та змісті «${p}» треба впізнати «${c}».`,
    orthographic: (w, c, p) => `«${w}» схоже на письмі на «${c}», але апостроф, закінчення чи літери створюють іншу форму; у «${p}» пишеться «${c}».`,
    l1_transfer: (w, c, p) => `«${w}» виникає через дослівне перенесення звичного порядку або форми української, але англійська конструкція «${p}» вимагає «${c}».`,
    phrase_assembly: (w, c, p) => `«${w}» можливе в іншому зв’язку, але тут змінює порядок або відношення частин; фраза «${p}» складається зі словом «${c}».`,
  },
  es: {
    grammar: (w, c, p) => `«${w}» parece cumplir la misma función, pero no concuerda en esta posición de «${p}»; aquí corresponde «${c}».`,
    semantic_neighbor: (w, c, p) => `«${w}» pertenece al mismo campo y por eso distrae, pero nombra otro objeto, rasgo o número; el sentido exacto de «${p}» exige «${c}».`,
    collocation_pragmatics: (w, c, p) => `«${w}» aparece en fórmulas corteses cercanas, pero no forma la expresión fija «${p}»; su pieza natural es «${c}».`,
    phonetic: (w, c, p) => `«${w}» suena cerca de «${c}», pero cambia la terminación o la sílaba tónica; en el sonido y sentido de «${p}» hay que reconocer «${c}».`,
    orthographic: (w, c, p) => `«${w}» se parece por escrito a «${c}», pero el apóstrofo, la terminación o las letras crean otra forma; en «${p}» se escribe «${c}».`,
    l1_transfer: (w, c, p) => `«${w}» nace al copiar literalmente una forma u omisión posible en español, pero la estructura inglesa «${p}» requiere «${c}».`,
    phrase_assembly: (w, c, p) => `«${w}» puede aparecer en otra relación, pero aquí altera el orden o el vínculo entre partes; «${p}» se construye con «${c}».`,
  },
  'pt-BR': {
    grammar: (w, c, p) => `«${w}» parece ter a mesma função, mas não concorda nesta posição de «${p}»; aqui a forma correta é «${c}».`,
    semantic_neighbor: (w, c, p) => `«${w}» pertence ao mesmo campo e por isso confunde, mas nomeia outro objeto, traço ou número; o sentido exato de «${p}» exige «${c}».`,
    collocation_pragmatics: (w, c, p) => `«${w}» aparece em fórmulas educadas parecidas, mas não compõe a expressão fixa «${p}»; a parte natural dela é «${c}».`,
    phonetic: (w, c, p) => `«${w}» soa parecido com «${c}», mas muda a terminação ou a sílaba tônica; no som e no sentido de «${p}» é preciso reconhecer «${c}».`,
    orthographic: (w, c, p) => `«${w}» se parece na escrita com «${c}», mas o apóstrofo, a terminação ou as letras formam outra palavra; em «${p}» escreve-se «${c}».`,
    l1_transfer: (w, c, p) => `«${w}» surge ao copiar literalmente uma forma ou omissão possível em português, mas a estrutura inglesa «${p}» exige «${c}».`,
    phrase_assembly: (w, c, p) => `«${w}» cabe em outra ligação, mas aqui muda a ordem ou a relação entre as partes; «${p}» é montada com «${c}».`,
  },
  vi: {
    grammar: (w, c, p) => `“${w}” có vẻ cùng chức năng nhưng không hòa hợp ở vị trí này trong “${p}”; dạng cần dùng là “${c}”.`,
    semantic_neighbor: (w, c, p) => `“${w}” cùng trường nghĩa nên dễ gây nhiễu, nhưng chỉ đồ vật, đặc điểm hoặc số khác; nghĩa chính xác của “${p}” cần “${c}”.`,
    collocation_pragmatics: (w, c, p) => `“${w}” xuất hiện trong lời nói lịch sự gần nghĩa, nhưng không tạo thành cụm cố định “${p}”; phần tự nhiên ở đây là “${c}”.`,
    phonetic: (w, c, p) => `“${w}” nghe gần giống “${c}” nhưng khác phần cuối hoặc âm tiết mang trọng âm; trong âm thanh và nghĩa của “${p}” phải nhận ra “${c}”.`,
    orthographic: (w, c, p) => `“${w}” trông gần giống “${c}”, nhưng dấu nháy, phần cuối hoặc chuỗi chữ tạo dạng khác; trong “${p}” phải viết “${c}”.`,
    l1_transfer: (w, c, p) => `“${w}” dễ xuất hiện khi mang nguyên cách lược bỏ hoặc trật tự quen thuộc của tiếng Việt sang, nhưng cấu trúc tiếng Anh “${p}” cần “${c}”.`,
    phrase_assembly: (w, c, p) => `“${w}” có thể dùng trong quan hệ khác, nhưng ở đây làm đổi trật tự hoặc liên kết; cụm “${p}” được ghép với “${c}”.`,
  },
  id: {
    grammar: (w, c, p) => `“${w}” tampak memiliki fungsi serupa, tetapi tidak sesuai pada posisi ini dalam “${p}”; bentuk yang diperlukan ialah “${c}”.`,
    semantic_neighbor: (w, c, p) => `“${w}” masih satu bidang makna sehingga mengecoh, tetapi menyebut benda, sifat, atau angka lain; arti tepat “${p}” memerlukan “${c}”.`,
    collocation_pragmatics: (w, c, p) => `“${w}” muncul dalam ungkapan sopan yang mirip, tetapi tidak membentuk ungkapan tetap “${p}”; bagian alaminya ialah “${c}”.`,
    phonetic: (w, c, p) => `“${w}” terdengar mirip dengan “${c}”, tetapi akhiran atau suku kata bertekanannya berbeda; bunyi dan arti “${p}” menuntut “${c}”.`,
    orthographic: (w, c, p) => `“${w}” tampak mirip dengan “${c}”, tetapi apostrof, akhiran, atau hurufnya membentuk bentuk lain; dalam “${p}” ditulis “${c}”.`,
    l1_transfer: (w, c, p) => `“${w}” mudah muncul ketika pola penghilangan atau urutan bahasa Indonesia disalin mentah, tetapi struktur Inggris “${p}” memerlukan “${c}”.`,
    phrase_assembly: (w, c, p) => `“${w}” dapat dipakai dalam hubungan lain, tetapi di sini mengubah urutan atau kaitan bagian; “${p}” disusun dengan “${c}”.`,
  },
  tr: {
    grammar: (w, c, p) => `«${w}» benzer görevde görünür, ancak «${p}» içinde bu konumla uyuşmaz; burada gereken biçim «${c}»dir.`,
    semantic_neighbor: (w, c, p) => `«${w}» aynı anlam alanından olduğu için şaşırtır, fakat başka nesne, özellik ya da sayıyı anlatır; «${p}» tam olarak «${c}» ister.`,
    collocation_pragmatics: (w, c, p) => `«${w}» yakın bir nezaket kalıbında bulunabilir, fakat «${p}» sabit sözünü kurmaz; onun doğal parçası «${c}»dir.`,
    phonetic: (w, c, p) => `«${w}» ile «${c}» benzer duyulur, fakat sonları ya da vurgulu heceleri ayrıdır; «${p}» sesinde ve anlamında «${c}» seçilmelidir.`,
    orthographic: (w, c, p) => `«${w}» yazıda «${c}»ye benzer, fakat kesme işareti, son ek ya da harf dizisi başka biçim kurar; «${p}» içinde «${c}» yazılır.`,
    l1_transfer: (w, c, p) => `«${w}» Türkçedeki ek ya da sözcük sırası doğrudan taşındığında cazip gelir, fakat İngilizce «${p}» yapısı «${c}» ister.`,
    phrase_assembly: (w, c, p) => `«${w}» başka bir bağda kullanılabilir, ancak burada sıra veya parçalar arası ilişki değişir; «${p}» sözü «${c}» ile kurulur.`,
  },
  pl: {
    grammar: (w, c, p) => `„${w}” wygląda na podobną funkcję, ale nie zgadza się w tej pozycji w „${p}”; tutaj potrzebna jest forma „${c}”.`,
    semantic_neighbor: (w, c, p) => `„${w}” należy do tego samego pola znaczeń i dlatego myli, lecz nazywa inną rzecz, cechę lub liczbę; dokładny sens „${p}” wymaga „${c}”.`,
    collocation_pragmatics: (w, c, p) => `„${w}” pojawia się w podobnych zwrotach grzecznościowych, ale nie tworzy stałej wypowiedzi „${p}”; jej naturalną częścią jest „${c}”.`,
    phonetic: (w, c, p) => `„${w}” brzmi podobnie do „${c}”, ale różni się końcówką albo akcentowaną sylabą; w brzmieniu i znaczeniu „${p}” trzeba rozpoznać „${c}”.`,
    orthographic: (w, c, p) => `„${w}” wygląda podobnie do „${c}”, lecz apostrof, końcówka lub litery tworzą inną formę; w „${p}” piszemy „${c}”.`,
    l1_transfer: (w, c, p) => `„${w}” kusi przy dosłownym przeniesieniu polskiej odmiany lub szyku, ale angielska konstrukcja „${p}” wymaga „${c}”.`,
    phrase_assembly: (w, c, p) => `„${w}” pasuje do innego połączenia, lecz tutaj zmienia szyk albo relację części; zwrot „${p}” budujemy ze słowem „${c}”.`,
  },
});

type PairReasonKey = 'are|is' | 'are|do' | 'at|in' | 'at|on';

const PAIR_REASON: Readonly<
  Record<Locale, Record<PairReasonKey, (phrase: string) => string>>
> = Object.freeze({
  ru: {
    'are|is': (p) => `«is» легко выбрать как знакомую форму to be, но она относится к he, she, it или одному предмету. В «${p}» рядом стоит you, поэтому вопрос начинается с «are».`,
    'are|do': (p) => `«do» действительно ставят перед you в вопросе о действии, например Do you work? Но в «${p}» после you описывается состояние или место, а не действие, поэтому нужна связка «are».`,
    'at|in': (p) => `«in» обычно помещает кого-то внутрь названного места или пространства. Home в этой готовой английской формуле не контейнер: «дома» передаётся сочетанием «at home», как в «${p}».`,
    'at|on': (p) => `«on» направляет мысль на поверхность, поэтому рядом с home кажется знакомым предлогом места, но создаёт неверную связь. Устойчивое «дома» — «at home», как в «${p}».`,
  },
  uk: {
    'are|is': (p) => `«is» легко вибрати як знайому форму to be, але вона поєднується з he, she, it або одним предметом. У «${p}» стоїть you, тому питання починається з «are».`,
    'are|do': (p) => `«do» справді ставлять перед you у питанні про дію, наприклад Do you work? Але у «${p}» після you описано стан або місце, а не дію, тому потрібна зв’язка «are».`,
    'at|in': (p) => `«in» зазвичай поміщає когось усередину названого місця чи простору. Home у цій готовій англійській формулі не контейнер: «вдома» передається як «at home», як у «${p}».`,
    'at|on': (p) => `«on» вказує на поверхню, тому поруч із home здається знайомим прийменником місця, але створює хибний зв’язок. Усталене «вдома» — «at home», як у «${p}».`,
  },
  es: {
    'are|is': (p) => `«is» atrae porque también es una forma de to be, pero corresponde a he, she, it o a una sola cosa. En «${p}» aparece you, así que la pregunta empieza con «are».`,
    'are|do': (p) => `«do» sí va antes de you cuando se pregunta por una acción, como en Do you work? En «${p}», lo que sigue a you describe un estado o lugar, no una acción; por eso se necesita «are».`,
    'at|in': (p) => `«in» suele situar a alguien dentro de un lugar o espacio nombrado. En esta expresión home no funciona como recipiente: «en casa» se dice «at home», como en «${p}».`,
    'at|on': (p) => `«on» lleva la idea hacia una superficie y por eso parece un preposición de lugar posible, pero con home crea una unión incorrecta. La expresión fija es «at home», como en «${p}».`,
  },
  'pt-BR': {
    'are|is': (p) => `«is» chama atenção por também ser uma forma de to be, mas acompanha he, she, it ou uma única coisa. Em «${p}» aparece you, por isso a pergunta começa com «are».`,
    'are|do': (p) => `«do» realmente vem antes de you numa pergunta sobre ação, como Do you work? Em «${p}», o trecho depois de you descreve estado ou lugar, não ação; por isso é preciso «are».`,
    'at|in': (p) => `«in» normalmente coloca alguém dentro de um lugar ou espaço nomeado. Nesta expressão, home não funciona como recipiente: «em casa» é «at home», como em «${p}».`,
    'at|on': (p) => `«on» sugere contato com uma superfície e por isso parece uma preposição de lugar possível, mas com home cria a ligação errada. A expressão fixa é «at home», como em «${p}».`,
  },
  vi: {
    'are|is': (p) => `“is” dễ gây nhầm vì cũng là một dạng của to be, nhưng nó đi với he, she, it hoặc một vật số ít. Trong “${p}” chủ ngữ là you, vì vậy câu hỏi phải mở đầu bằng “are”.`,
    'are|do': (p) => `“do” đúng là đứng trước you khi hỏi về hành động, chẳng hạn Do you work? Trong “${p}”, phần sau you diễn tả trạng thái hoặc nơi chốn chứ không phải hành động, nên cần “are”.`,
    'at|in': (p) => `“in” thường đặt người hoặc vật vào bên trong một nơi hay không gian được nêu tên. Trong cụm này home không phải vật chứa: ý “ở nhà” dùng cụm cố định “at home”, như trong “${p}”.`,
    'at|on': (p) => `“on” gợi ý vị trí trên một bề mặt nên trông giống một giới từ chỉ nơi chốn phù hợp, nhưng ghép với home thì sai. Cụm tự nhiên là “at home”, như trong “${p}”.`,
  },
  id: {
    'are|is': (p) => `“is” mudah dipilih karena juga bentuk to be, tetapi bentuk itu dipakai bersama he, she, it atau satu benda. Dalam “${p}” subjeknya you, jadi pertanyaan harus diawali “are”.`,
    'are|do': (p) => `“do” memang berada sebelum you ketika menanyakan tindakan, misalnya Do you work? Dalam “${p}”, bagian sesudah you menyatakan keadaan atau tempat, bukan tindakan, sehingga diperlukan “are”.`,
    'at|in': (p) => `“in” biasanya menempatkan seseorang di dalam tempat atau ruang yang disebutkan. Dalam ungkapan ini home bukan wadah: makna “di rumah” memakai bentuk tetap “at home”, seperti dalam “${p}”.`,
    'at|on': (p) => `“on” mengarahkan makna ke permukaan sehingga tampak seperti preposisi tempat yang mungkin, tetapi gabungannya dengan home keliru. Ungkapan tetapnya “at home”, seperti dalam “${p}”.`,
  },
  tr: {
    'are|is': (p) => `«is», to be fiilinin tanıdık bir biçimi olduğu için çekicidir; ancak he, she, it ya da tek bir nesneyle kullanılır. «${p}» içinde özne you olduğundan soru «are» ile başlar.`,
    'are|do': (p) => `«do», Do you work? örneğindeki gibi bir eylem sorusunda gerçekten you’dan önce gelir. «${p}» içinde you’dan sonrası eylem değil durum ya da yer bildirir; bu yüzden «are» gerekir.`,
    'at|in': (p) => `«in» genellikle birini adı verilen yerin ya da alanın içine koyar. Bu kalıpta home bir kap gibi düşünülmez; «evde» anlamı «${p}» içindeki gibi «at home» ile verilir.`,
    'at|on': (p) => `«on» bir yüzey üzerindeki konumu çağrıştırdığı için yer edatı gibi çekici görünür, fakat home ile yanlış bağ kurar. Doğal kalıp «${p}» içindeki «at home»dur.`,
  },
  pl: {
    'are|is': (p) => `„is” kusi, bo także jest formą to be, lecz łączy się z he, she, it albo jedną rzeczą. W „${p}” podmiotem jest you, dlatego pytanie zaczyna się od „are”.`,
    'are|do': (p) => `„do” rzeczywiście stoi przed you w pytaniu o czynność, na przykład Do you work? W „${p}” część po you opisuje stan albo miejsce, nie czynność, dlatego potrzebne jest „are”.`,
    'at|in': (p) => `„in” zwykle umieszcza kogoś wewnątrz nazwanego miejsca lub przestrzeni. W tym zwrocie home nie jest pojemnikiem: „w domu” oddaje stałe „at home”, jak w „${p}”.`,
    'at|on': (p) => `„on” kieruje uwagę na powierzchnię, więc wygląda jak możliwy przyimek miejsca, ale z home tworzy błędne połączenie. Stały zwrot to „at home”, jak w „${p}”.`,
  },
});

function pairSpecificReason(
  locale: Locale,
  wrong: string,
  correct: string,
  phrase: string,
): string | undefined {
  const pair = `${key(correct)}|${key(wrong)}` as PairReasonKey;
  return PAIR_REASON[locale][pair]?.(phrase);
}

const LOCALIZED_DISTRACTOR_CACHE = new Map<string, ReturnType<typeof createWordDistractors>>();

function createWordDistractors(locale: Locale, correct: string, phrase: string, sessionOrdinal?: number) {
  return Object.freeze(distractorValues(correct, sessionOrdinal).map((value) => {
    const kind = trapType(correct, value);
    const reason =
      pairSpecificReason(locale, value, correct, phrase) ??
      (kind === 'semantic_neighbor'
        ? semanticNeighborReason(locale, value, correct, phrase)
        : REASON[locale][kind](value, correct, phrase));
    return {
      value,
      trapType: kind,
      // Client-child canonical JSON rejects decomposed Unicode. Source text
      // can legitimately contain accented words, so normalize the completed
      // pair-specific explanation after interpolation, not only constants.
      reason: reason.normalize('NFC'),
    };
  }));
}

function buildWordDistractors(locale: Locale, correct: string, phrase: string, sessionOrdinal?: number) {
  const cacheKey = `${locale}\u0000${sessionOrdinal ?? 0}\u0000${key(correct)}\u0000${phrase}`;
  const cached = LOCALIZED_DISTRACTOR_CACHE.get(cacheKey);
  if (cached) return cached;
  const created = createWordDistractors(locale, correct, phrase, sessionOrdinal);
  LOCALIZED_DISTRACTOR_CACHE.set(cacheKey, created);
  return created;
}

/**
 * зачем (2026-08-23): принимает ПОЛНЫЙ список локалей источника, включая 'en',
 * потому что вызывающий (session_package_from_shard_v1) перебирает
 * LEARNING_V2_INTERFACE_LOCALES целиком. Для 'en' объяснений у урока 1 нет по
 * замыслу (см. Locale выше), и функция возвращает пустой список — вызывающий
 * уже умеет обходиться без авторского объяснения и подставляет свой fallback.
 * Молча вернуть русский текст было бы хуже пустоты: ученик увидел бы чужой
 * язык вместо честного отсутствия перевода.
 */
export function lesson1DistractorChoicesV2(
  locale: Lesson1DistractorLocale,
  correct: string,
  phrase: string,
  sessionOrdinal?: number,
) {
  if (locale === 'en') return [];
  return buildWordDistractors(locale, correct, phrase, sessionOrdinal);
}

function upgradePhraseInPlace(phrase: EpisodeSourcePhrase, sessionOrdinal: number): EpisodeSourcePhrase {
  const words = phrase.words.map((word) => ({
    ...word,
    distractors: buildWordDistractors('ru', word.correct, phrase.english, sessionOrdinal).map((item) => ({
      value: item.value,
      trapType: item.trapType,
      reasonCode: `${item.trapType}:${key(word.correct)}:${key(item.value)}`,
      why: item.reason,
    })),
  }));
  const localizedDetails = phrase.localizedDetails
    // зачем: localizedDetails объявлен как Partial<Record<...>> — локали может
    // не быть вовсе (например en у англоязычного интерфейса). Пропускаем такие
    // вместо обращения к undefined; ниже отфильтруем пустые пары.
    ? Object.fromEntries(LOCALES.flatMap((locale) => {
        const source = phrase.localizedDetails![locale];
        if (!source) return [];
        const localizedWords = source.words.map((word) => ({
          ...word,
          distractors: buildWordDistractors(locale, word.correct, phrase.english, sessionOrdinal),
        }));
        const firstCorrect = source.words[0]?.correct ?? words[0]?.correct ?? phrase.english;
        const upgraded: EpisodeSourcePhraseLocalizedDetails = {
          ...source,
          distractors: buildWordDistractors(locale, firstCorrect, phrase.english, sessionOrdinal),
          words: localizedWords,
        };
        // flatMap ждёт массив элементов: одна пара [ключ, значение] — [[k, v]].
        return [[locale, upgraded] as const];
      })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>
    : phrase.localizedDetails;
  const mutable = phrase as {
    words: EpisodeSourcePhrase['words'];
    localizedDetails?: EpisodeSourcePhrase['localizedDetails'];
  };
  mutable.words = words;
  mutable.localizedDetails = localizedDetails;
  return phrase;
}

/**
 * Fail-closed Lesson 1 repair layer. It replaces legacy arbitrary vocabulary
 * slices with pair-specific, category-bounded traps before any shard is built.
 */
export function upgradeLesson1SessionDistractorsV2(source: SessionSource): SessionSource {
  if (source.distractorAuthorship === 'manual') return source;
  source.phrases.forEach((phrase) => upgradePhraseInPlace(phrase, source.requiredSessionOrdinal));
  return source;
}
