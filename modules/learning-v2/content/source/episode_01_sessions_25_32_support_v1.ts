import type {
  EpisodeSourcePhrase,
  EpisodeSourcePhraseLocalizedDetails,
} from "./episode_01_source_v1";
import type { SessionKind } from "./episode_01_session_map_v1";
import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
  SessionSource,
} from "./session_shard_from_source_v1";

const LOCALES = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
type Locale = (typeof LOCALES)[number];
const L = (select: (locale: Locale) => string): LocalizedSource =>
  Object.fromEntries(
    LOCALES.map((locale) => [locale, select(locale)]),
  ) as unknown as LocalizedSource;
const PHRASES: Record<number, readonly string[]> = {
  25: [
    "We are ready.",
    "We are here.",
    "We are calm.",
    "We are happy.",
    "We are busy.",
    "We are tired.",
    "We are warm.",
    "We are okay.",
    "We are friends.",
    "We are at home.",
    "We are in the room.",
    "We are early.",
    "We are together.",
    "We are safe.",
    "We are students.",
  ],
  26: [
    "They are ready.",
    "They are here.",
    "They are calm.",
    "They are happy.",
    "They are busy.",
    "They are tired.",
    "They are books.",
    "They are bags.",
    "They are keys.",
    "They are cups.",
    "They are friends.",
    "They are teachers.",
    "They are at home.",
    "They are in the room.",
    "They are students.",
  ],
  27: [
    "We are not ready.",
    "They are not ready.",
    "We are not tired.",
    "They are not tired.",
    "We are not here.",
    "They are not here.",
    "We are not busy.",
    "They are not busy.",
    "We are not calm.",
    "They are not calm.",
    "We are not happy.",
    "They are not happy.",
    "We are not at home.",
    "They are not friends.",
    "They are not students.",
  ],
  28: [
    "Are we ready?",
    "Are they ready?",
    "Are we here?",
    "Are they here?",
    "Are we calm?",
    "Are they calm?",
    "Are we busy?",
    "Are they busy?",
    "Are we tired?",
    "Are they tired?",
    "Are they friends?",
    "Are they teachers?",
    "Are they books?",
    "Are they bags?",
    "Are we at home?",
  ],
  29: [
    "We’re ready.",
    "They’re ready.",
    "We’re here.",
    "They’re here.",
    "We’re calm.",
    "They’re calm.",
    "We’re happy.",
    "They’re happy.",
    "We’re busy.",
    "They’re busy.",
    "We’re tired.",
    "They’re tired.",
    "We’re friends.",
    "They’re teachers.",
    "They’re in the room.",
  ],
  30: [
    "He isn’t ready.",
    "She isn’t here.",
    "It isn’t warm.",
    "We aren’t ready.",
    "They aren’t here.",
    "You aren’t busy.",
    "I am not tired.",
    "He isn’t calm.",
    "She isn’t happy.",
    "It isn’t cold.",
    "We aren’t busy.",
    "They aren’t tired.",
    "You aren’t okay.",
    "We aren’t friends.",
    "They aren’t bags.",
  ],
  31: [
    "I am ready.",
    "You are ready.",
    "He is ready.",
    "She is ready.",
    "It is warm.",
    "We are ready.",
    "They are ready.",
    "I am not tired.",
    "You are not busy.",
    "He is not here.",
    "She is not calm.",
    "It is not cold.",
    "We are not happy.",
    "They are not tired.",
    "Are they ready?",
  ],
  32: [
    "I am here.",
    "You are here.",
    "He is calm.",
    "She is happy.",
    "It is cold.",
    "We are friends.",
    "They are bags.",
    "I am not ready.",
    "You are not tired.",
    "He is not busy.",
    "She is not here.",
    "It is not warm.",
    "We are not calm.",
    "They are not happy.",
    "Are we ready?",
  ],
};
const FEATURES: Record<number, readonly string[]> = {
  25: ["copula_be", "plural_pronoun"],
  26: ["copula_be", "plural_pronoun", "plural_noun"],
  27: ["copula_be", "plural_pronoun", "plural_noun", "negation_not"],
  28: ["copula_be", "plural_pronoun", "plural_noun", "question_inversion"],
  29: ["copula_be", "plural_pronoun", "plural_noun", "contraction_plural"],
  30: ["copula_be", "negative_contraction"],
  31: [
    "copula_be",
    "first_person_singular",
    "second_person",
    "third_person_pronoun",
    "plural_pronoun",
    "question_inversion",
    "negation_not",
  ],
  32: [
    "copula_be",
    "first_person_singular",
    "second_person",
    "third_person_pronoun",
    "plural_pronoun",
    "question_inversion",
    "negation_not",
  ],
};
const KINDS: Record<number, SessionKind> = {
  25: "words_then_phrases",
  26: "words_then_phrases",
  27: "phrases",
  28: "phrases",
  29: "phrases",
  30: "phrases",
  31: "recall",
  32: "checkpoint",
};
const TITLES: Record<Locale, readonly string[]> = {
  ru: [
    "Мы вместе: are",
    "Они и предметы во множественном числе",
    "Не с we и they",
    "Вопросы с are",
    "Короткие we’re и they’re",
    "isn’t и aren’t",
    "Вся таблица to be",
    "Проверка: вся таблица to be",
  ],
  uk: [
    "Ми разом: are",
    "Вони й множина предметів",
    "Не з we та they",
    "Запитання з are",
    "Короткі we’re та they’re",
    "isn’t і aren’t",
    "Уся таблиця to be",
    "Перевірка: уся таблиця to be",
  ],
  es: [
    "We con are",
    "They y los plurales",
    "Negar con we y they",
    "Preguntas con are",
    "We’re y they’re",
    "isn’t y aren’t",
    "Toda la tabla de to be",
    "Comprobación: toda la tabla",
  ],
  "pt-BR": [
    "We com are",
    "They e os plurais",
    "Negação com we e they",
    "Perguntas com are",
    "We’re e they’re",
    "isn’t e aren’t",
    "Toda a tabela de to be",
    "Revisão: toda a tabela",
  ],
  vi: [
    "We đi với are",
    "They và danh từ số nhiều",
    "Phủ định với we và they",
    "Câu hỏi với are",
    "We’re và they’re",
    "isn’t và aren’t",
    "Toàn bộ bảng to be",
    "Kiểm tra: toàn bộ bảng",
  ],
  id: [
    "We memakai are",
    "They dan benda jamak",
    "Penyangkalan we dan they",
    "Pertanyaan dengan are",
    "We’re dan they’re",
    "isn’t dan aren’t",
    "Seluruh tabel to be",
    "Pemeriksaan seluruh tabel",
  ],
  tr: [
    "We ile are",
    "They ve çoğul nesneler",
    "We ve they ile olumsuzluk",
    "Are ile sorular",
    "We’re ve they’re",
    "isn’t ve aren’t",
    "To be tablosunun tamamı",
    "Kontrol: to be tablosu",
  ],
  pl: [
    "We razem z are",
    "They i liczba mnoga",
    "Przeczenie z we i they",
    "Pytania z are",
    "We’re i they’re",
    "isn’t i aren’t",
    "Cała tabela to be",
    "Sprawdzenie całej tabeli",
  ],
};
const TOPICS: Record<Locale, readonly string[]> = {
  ru: [
    "We называет группу с говорящим, поэтому ему нужна are.",
    "They называет людей или предметы во множественном числе, поэтому после него are.",
    "Not ставят после are, не меняя того, о ком говорят.",
    "В вопросе are выходит перед we или they.",
    "We’re и they’re сохраняют are внутри короткой формы.",
    "isn’t относится к одному, а aren’t — к нескольким.",
    "Форма am, are или is зависит от участника в начале.",
    "Нужно различить утверждение, отрицание и вопрос для всех местоимений.",
  ],
  uk: [
    "We називає групу з мовцем, тому потребує are.",
    "They називає людей або предмети в множині, тому після нього are.",
    "Not стоїть після are і не міняє учасника.",
    "У запитанні are виходить перед we або they.",
    "We’re і they’re зберігають are у короткій формі.",
    "isn’t для одного, а aren’t для кількох.",
    "Am, are чи is залежить від учасника на початку.",
    "Треба відрізняти твердження, заперечення і питання.",
  ],
  es: [
    "We nombra un grupo con quien habla y necesita are.",
    "They nombra personas u objetos plurales y por eso lleva are.",
    "Not va después de are sin cambiar al participante.",
    "En una pregunta are pasa delante de we o they.",
    "We’re y they’re guardan are en la forma breve.",
    "isn’t es singular y aren’t es plural.",
    "Am, are o is depende de quién aparece primero.",
    "Hay que distinguir afirmación, negación y pregunta.",
  ],
  "pt-BR": [
    "We nomeia um grupo com quem fala e pede are.",
    "They nomeia pessoas ou coisas no plural e usa are.",
    "Not vem depois de are sem trocar o participante.",
    "Na pergunta are vai antes de we ou they.",
    "We’re e they’re guardam are na forma curta.",
    "isn’t é singular e aren’t é plural.",
    "Am, are ou is depende de quem vem primeiro.",
    "É preciso distinguir afirmação, negação e pergunta.",
  ],
  vi: [
    "We nói về nhóm có người nói và cần are.",
    "They gọi người hoặc vật số nhiều nên dùng are.",
    "Not đứng sau are mà không đổi chủ ngữ.",
    "Trong câu hỏi are đứng trước we hoặc they.",
    "We’re và they’re giữ are trong dạng ngắn.",
    "isn’t dùng cho một, aren’t dùng cho nhiều.",
    "Am, are hay is tùy chủ thể đứng đầu.",
    "Cần phân biệt khẳng định, phủ định và câu hỏi.",
  ],
  id: [
    "We menyebut kelompok yang mencakup pembicara dan memerlukan are.",
    "They menyebut orang atau benda jamak dan memakai are.",
    "Not berada setelah are tanpa mengubah pelaku.",
    "Dalam pertanyaan are berada sebelum we atau they.",
    "We’re dan they’re menyimpan are dalam bentuk pendek.",
    "isn’t untuk satu, aren’t untuk banyak.",
    "Am, are, atau is bergantung pada pelaku di awal.",
    "Pernyataan, penyangkalan, dan pertanyaan harus dibedakan.",
  ],
  tr: [
    "We konuşanı içeren bir grubu anlatır ve are ister.",
    "They çoğul kişi veya nesneleri anlatır ve are alır.",
    "Not, kişiyi değiştirmeden are sonrasına gelir.",
    "Soruda are, we ya da they önüne geçer.",
    "We’re ve they’re are biçimini kısa söyleyişte taşır.",
    "isn’t tekil, aren’t çoğuldur.",
    "Am, are ya da is baştaki kişiye bağlıdır.",
    "Bildirme, olumsuzluk ve soru ayrılmalıdır.",
  ],
  pl: [
    "We mówi o grupie z mówiącą osobą i wymaga are.",
    "They nazywa osoby lub rzeczy w liczbie mnogiej i ma are.",
    "Not stoi po are i nie zmienia osoby.",
    "W pytaniu are przechodzi przed we albo they.",
    "We’re i they’re zachowują are w skrócie.",
    "isn’t jest dla jednej osoby, aren’t dla wielu.",
    "Am, are albo is zależy od osoby na początku.",
    "Trzeba odróżniać twierdzenie, przeczenie i pytanie.",
  ],
};

const SUBJECT: Record<Locale, Record<string, string>> = {
  ru: {
    I: "Я",
    You: "Ты",
    He: "Он",
    She: "Она",
    It: "Это",
    We: "Мы",
    They: "Они",
  },
  uk: {
    I: "Я",
    You: "Ти",
    He: "Він",
    She: "Вона",
    It: "Це",
    We: "Ми",
    They: "Вони",
  },
  es: {
    I: "Yo",
    You: "Tú",
    He: "Él",
    She: "Ella",
    It: "Eso",
    We: "Nosotros",
    They: "Ellos",
  },
  "pt-BR": {
    I: "Eu",
    You: "Você",
    He: "Ele",
    She: "Ela",
    It: "Isso",
    We: "Nós",
    They: "Eles",
  },
  vi: {
    I: "Tôi",
    You: "Bạn",
    He: "Anh ấy",
    She: "Cô ấy",
    It: "Nó",
    We: "Chúng tôi",
    They: "Họ",
  },
  id: {
    I: "Saya",
    You: "Kamu",
    He: "Dia",
    She: "Dia",
    It: "Itu",
    We: "Kami",
    They: "Mereka",
  },
  tr: {
    I: "Ben",
    You: "Sen",
    He: "O",
    She: "O",
    It: "O",
    We: "Biz",
    They: "Onlar",
  },
  pl: {
    I: "Ja",
    You: "Ty",
    He: "On",
    She: "Ona",
    It: "To",
    We: "My",
    They: "Oni",
  },
};
const WORD: Record<Locale, Record<string, string>> = {
  ru: {
    ready: "готовы",
    here: "здесь",
    calm: "спокойны",
    happy: "счастливы",
    busy: "заняты",
    tired: "устали",
    warm: "в тепле",
    okay: "в порядке",
    friends: "друзья",
    teachers: "учителя",
    students: "студенты",
    books: "книги",
    bags: "сумки",
    keys: "ключи",
    cups: "чашки",
    home: "дома",
    room: "в комнате",
    early: "рано",
    together: "вместе",
    safe: "в безопасности",
    cold: "холодно",
  },
  uk: {
    ready: "готові",
    here: "тут",
    calm: "спокійні",
    happy: "щасливі",
    busy: "зайняті",
    tired: "втомлені",
    warm: "у теплі",
    okay: "гаразд",
    friends: "друзі",
    teachers: "учителі",
    students: "студенти",
    books: "книги",
    bags: "сумки",
    keys: "ключі",
    cups: "чашки",
    home: "вдома",
    room: "у кімнаті",
    early: "рано",
    together: "разом",
    safe: "у безпеці",
    cold: "холодно",
  },
  es: {
    ready: "listos",
    here: "aquí",
    calm: "tranquilos",
    happy: "felices",
    busy: "ocupados",
    tired: "cansados",
    warm: "abrigados",
    okay: "bien",
    friends: "amigos",
    teachers: "profesores",
    students: "estudiantes",
    books: "libros",
    bags: "bolsas",
    keys: "llaves",
    cups: "tazas",
    home: "en casa",
    room: "en la habitación",
    early: "temprano",
    together: "juntos",
    safe: "a salvo",
    cold: "frío",
  },
  "pt-BR": {
    ready: "prontos",
    here: "aqui",
    calm: "calmos",
    happy: "felizes",
    busy: "ocupados",
    tired: "cansados",
    warm: "aquecidos",
    okay: "bem",
    friends: "amigos",
    teachers: "professores",
    students: "estudantes",
    books: "livros",
    bags: "bolsas",
    keys: "chaves",
    cups: "xícaras",
    home: "em casa",
    room: "na sala",
    early: "cedo",
    together: "juntos",
    safe: "seguros",
    cold: "frio",
  },
  vi: {
    ready: "sẵn sàng",
    here: "ở đây",
    calm: "bình tĩnh",
    happy: "vui",
    busy: "bận",
    tired: "mệt",
    warm: "ấm",
    okay: "ổn",
    friends: "bạn bè",
    teachers: "giáo viên",
    students: "học sinh",
    books: "sách",
    bags: "túi",
    keys: "chìa khóa",
    cups: "cốc",
    home: "ở nhà",
    room: "trong phòng",
    early: "đến sớm",
    together: "cùng nhau",
    safe: "an toàn",
    cold: "lạnh",
  },
  id: {
    ready: "siap",
    here: "di sini",
    calm: "tenang",
    happy: "senang",
    busy: "sibuk",
    tired: "lelah",
    warm: "hangat",
    okay: "baik-baik saja",
    friends: "teman",
    teachers: "guru",
    students: "murid",
    books: "buku",
    bags: "tas",
    keys: "kunci",
    cups: "cangkir",
    home: "di rumah",
    room: "di ruangan",
    early: "datang awal",
    together: "bersama",
    safe: "aman",
    cold: "dingin",
  },
  tr: {
    ready: "hazır",
    here: "burada",
    calm: "sakin",
    happy: "mutlu",
    busy: "meşgul",
    tired: "yorgun",
    warm: "sıcak",
    okay: "iyi",
    friends: "arkadaş",
    teachers: "öğretmen",
    students: "öğrenci",
    books: "kitap",
    bags: "çanta",
    keys: "anahtar",
    cups: "fincan",
    home: "evde",
    room: "odada",
    early: "erken",
    together: "birlikte",
    safe: "güvende",
    cold: "soğuk",
  },
  pl: {
    ready: "gotowi",
    here: "tutaj",
    calm: "spokojni",
    happy: "szczęśliwi",
    busy: "zajęci",
    tired: "zmęczeni",
    warm: "w cieple",
    okay: "w porządku",
    friends: "przyjaciółmi",
    teachers: "nauczycielami",
    students: "uczniami",
    books: "książki",
    bags: "torby",
    keys: "klucze",
    cups: "kubki",
    home: "w domu",
    room: "w pokoju",
    early: "wcześnie",
    together: "razem",
    safe: "bezpieczni",
    cold: "zimno",
  },
};
const normalizedTokens = (english: string) =>
  english
    .replace(/[?.!]/gu, "")
    .replace(/We’re/gu, "We are")
    .replace(/They’re/gu, "They are")
    .replace(/isn’t/gu, "is not")
    .replace(/aren’t/gu, "are not")
    .split(/\s+/u)
    .filter(Boolean);
const surfaceTokens = (english: string) =>
  english.replace(/[?.!]/gu, "").split(/\s+/u).filter(Boolean);
const tokenise = normalizedTokens;
const tokenCategory = (token: string) =>
  /^(I|You|He|She|It|We|They)$/u.test(token)
    ? "pronoun"
    : /^(Are|am|are|is|We’re|They’re|isn’t|aren’t)$/u.test(token)
      ? "copula"
      : token === "not"
        ? "negation"
        : /^(a|the)$/u.test(token)
          ? "article"
          : /s$/u.test(token)
            ? "plural"
            : "meaning";

function realizeSemanticClass(
  locale: Locale,
  subject: string,
  predicate: string,
  negative: boolean,
  question: boolean,
): string | undefined {
  const objectForms: Record<Locale, Record<string, string>> = {
    ru: { books: "книги", bags: "сумки", keys: "ключи", cups: "чашки" },
    uk: { books: "книги", bags: "сумки", keys: "ключі", cups: "чашки" },
    es: { books: "libros", bags: "bolsas", keys: "llaves", cups: "tazas" },
    "pt-BR": {
      books: "livros",
      bags: "bolsas",
      keys: "chaves",
      cups: "xícaras",
    },
    vi: {
      books: "những quyển sách",
      bags: "những cái túi",
      keys: "những chiếc chìa khóa",
      cups: "những cái cốc",
    },
    id: {
      books: "buku-buku",
      bags: "tas-tas",
      keys: "kunci-kunci",
      cups: "cangkir-cangkir",
    },
    tr: { books: "kitap", bags: "çanta", keys: "anahtar", cups: "fincan" },
    pl: { books: "książki", bags: "torby", keys: "klucze", cups: "kubki" },
  };
  if (subject === "They" && objectForms[locale][predicate]) {
    const noun = objectForms[locale][predicate];
    const forms: Record<Locale, readonly [string, string, string]> = {
      ru: [`Это ${noun}.`, `Это не ${noun}.`, `Это ${noun}?`],
      uk: [`Це ${noun}.`, `Це не ${noun}.`, `Це ${noun}?`],
      es: [`Son ${noun}.`, `No son ${noun}.`, `¿Son ${noun}?`],
      "pt-BR": [`São ${noun}.`, `Não são ${noun}.`, `São ${noun}?`],
      vi: [
        `Đó là ${noun}.`,
        `Đó không phải là ${noun}.`,
        `Đó có phải là ${noun} không?`,
      ],
      id: [`Itu ${noun}.`, `Itu bukan ${noun}.`, `Apakah itu ${noun}?`],
      tr: [`Bunlar ${noun}.`, `Bunlar ${noun} değil.`, `Bunlar ${noun} mı?`],
      pl: [`To są ${noun}.`, `To nie są ${noun}.`, `Czy to są ${noun}?`],
    };
    return forms[locale][question ? 2 : negative ? 1 : 0];
  }
  if (subject === "It" && (predicate === "warm" || predicate === "cold")) {
    const warm = predicate === "warm";
    const forms: Record<Locale, readonly [string, string, string]> = {
      ru: [
        warm ? "Тепло." : "Холодно.",
        warm ? "Не тепло." : "Не холодно.",
        warm ? "Тепло?" : "Холодно?",
      ],
      uk: [
        warm ? "Тепло." : "Холодно.",
        warm ? "Не тепло." : "Не холодно.",
        warm ? "Тепло?" : "Холодно?",
      ],
      es: [
        warm ? "Hace calor." : "Hace frío.",
        warm ? "No hace calor." : "No hace frío.",
        warm ? "¿Hace calor?" : "¿Hace frío?",
      ],
      "pt-BR": [
        warm ? "Está quente." : "Está frio.",
        warm ? "Não está quente." : "Não está frio.",
        warm ? "Está quente?" : "Está frio?",
      ],
      vi: [
        warm ? "Trời ấm." : "Trời lạnh.",
        warm ? "Trời không ấm." : "Trời không lạnh.",
        warm ? "Trời ấm phải không?" : "Trời lạnh phải không?",
      ],
      id: [
        warm ? "Cuacanya hangat." : "Cuacanya dingin.",
        warm ? "Cuacanya tidak hangat." : "Cuacanya tidak dingin.",
        warm ? "Apakah cuacanya hangat?" : "Apakah cuacanya dingin?",
      ],
      tr: [
        warm ? "Hava sıcak." : "Hava soğuk.",
        warm ? "Hava sıcak değil." : "Hava soğuk değil.",
        warm ? "Hava sıcak mı?" : "Hava soğuk mu?",
      ],
      pl: [
        warm ? "Jest ciepło." : "Jest zimno.",
        warm ? "Nie jest ciepło." : "Nie jest zimno.",
        warm ? "Czy jest ciepło?" : "Czy jest zimno?",
      ],
    };
    return forms[locale][question ? 2 : negative ? 1 : 0];
  }
  const roles = ["friends", "teachers", "students"] as const;
  if (
    (subject === "We" || subject === "They") &&
    roles.includes(predicate as (typeof roles)[number])
  ) {
    const role: Record<Locale, Record<string, string>> = {
      ru: { friends: "друзья", teachers: "учителя", students: "студенты" },
      uk: { friends: "друзі", teachers: "вчителі", students: "учні" },
      es: {
        friends: "amigos",
        teachers: "profesores",
        students: "estudiantes",
      },
      "pt-BR": {
        friends: "amigos",
        teachers: "professores",
        students: "estudantes",
      },
      vi: {
        friends: "bạn bè",
        teachers: "giáo viên",
        students: "học sinh",
      },
      id: { friends: "teman", teachers: "guru", students: "siswa" },
      tr: { friends: "arkadaş", teachers: "öğretmen", students: "öğrenci" },
      pl: {
        friends: "przyjaciółmi",
        teachers: "nauczycielami",
        students: "uczniami",
      },
    };
    const noun = role[locale][predicate];
    const we = subject === "We";
    const trWe: Record<string, readonly [string, string]> = {
      friends: ["Biz arkadaşız.", "Arkadaş mıyız?"],
      teachers: ["Biz öğretmeniz.", "Öğretmen miyiz?"],
      students: ["Biz öğrenciyiz.", "Öğrenci miyiz?"],
    };
    const forms: Record<Locale, readonly [string, string, string]> = {
      ru: [
        `${we ? "Мы" : "Они"} ${noun}.`,
        `${we ? "Мы" : "Они"} не ${noun}.`,
        `${we ? "Мы" : "Они"} ${noun}?`,
      ],
      uk: [
        `${we ? "Ми" : "Вони"} ${noun}.`,
        `${we ? "Ми" : "Вони"} не ${noun}.`,
        `${we ? "Ми" : "Вони"} ${noun}?`,
      ],
      es: [
        `${we ? "Somos" : "Son"} ${noun}.`,
        `${we ? "No somos" : "No son"} ${noun}.`,
        `¿${we ? "Somos" : "Son"} ${noun}?`,
      ],
      "pt-BR": [
        `${we ? "Somos" : "São"} ${noun}.`,
        `${we ? "Não somos" : "Não são"} ${noun}.`,
        `${we ? "Somos" : "São"} ${noun}?`,
      ],
      vi: [
        `${we ? "Chúng tôi" : "Họ"} là ${noun}.`,
        `${we ? "Chúng tôi" : "Họ"} không phải là ${noun}.`,
        `${we ? "Chúng tôi" : "Họ"} có phải là ${noun} không?`,
      ],
      id: [
        `${we ? "Kami" : "Mereka"} adalah ${noun}.`,
        `${we ? "Kami" : "Mereka"} bukan ${noun}.`,
        `Apakah ${we ? "kami" : "mereka"} ${noun}?`,
      ],
      tr: [
        we ? trWe[predicate][0] : `Onlar ${noun}.`,
        we ? `Biz ${noun} değiliz.` : `Onlar ${noun} değiller.`,
        we
          ? trWe[predicate][1]
          : `Onlar ${noun} ${predicate === "friends" ? "mı" : "mi"}?`,
      ],
      pl: [
        `${we ? "Jesteśmy" : "Są"} ${noun}.`,
        `${we ? "Nie jesteśmy" : "Nie są"} ${noun}.`,
        `Czy ${we ? "jesteśmy" : "są"} ${noun}?`,
      ],
    };
    return forms[locale][question ? 2 : negative ? 1 : 0];
  }
  return undefined;
}
function alternatives(token: string): readonly string[] {
  const pools: Record<string, readonly string[]> = {
    pronoun: ["I", "You", "He", "She", "It", "We", "They"],
    copula: ["am", "are", "is", "was", "be", "been"],
    negation: ["very", "also", "too", "really", "quite"],
    article: ["a", "an", "the", "this", "that", "my"],
    plural: [
      "books",
      "bags",
      "keys",
      "cups",
      "friends",
      "teachers",
      "students",
    ],
    meaning: [
      "ready",
      "here",
      "calm",
      "happy",
      "busy",
      "tired",
      "warm",
      "cold",
      "safe",
      "early",
      "together",
    ],
  };
  return pools[tokenCategory(token)]
    .filter((candidate) => candidate.toLowerCase() !== token.toLowerCase())
    .slice(0, 5);
}
function realizeEuropean(
  locale: Locale,
  subject: string,
  predicate: string,
  negative: boolean,
  question: boolean,
): string | undefined {
  const gender =
    subject === "She"
      ? "f"
      : subject === "It"
        ? "n"
        : subject === "We" || subject === "They"
          ? "p"
          : "m";
  const adjective: Record<string, Record<string, Record<string, string>>> = {
    ru: {
      ready: { m: "готов", f: "готова", n: "готово", p: "готовы" },
      calm: { m: "спокоен", f: "спокойна", n: "спокойно", p: "спокойны" },
      happy: { m: "счастлив", f: "счастлива", n: "счастливо", p: "счастливы" },
      busy: { m: "занят", f: "занята", n: "занято", p: "заняты" },
      tired: { m: "устал", f: "устала", n: "устало", p: "устали" },
      safe: {
        m: "в безопасности",
        f: "в безопасности",
        n: "в безопасности",
        p: "в безопасности",
      },
    },
    uk: {
      ready: { m: "готовий", f: "готова", n: "готове", p: "готові" },
      calm: { m: "спокійний", f: "спокійна", n: "спокійне", p: "спокійні" },
      happy: { m: "щасливий", f: "щаслива", n: "щасливе", p: "щасливі" },
      busy: { m: "зайнятий", f: "зайнята", n: "зайняте", p: "зайняті" },
      tired: { m: "втомлений", f: "втомлена", n: "втомлене", p: "втомлені" },
      safe: { m: "у безпеці", f: "у безпеці", n: "у безпеці", p: "у безпеці" },
    },
    es: {
      ready: { m: "listo", f: "lista", n: "listo", p: "listos" },
      calm: { m: "tranquilo", f: "tranquila", n: "tranquilo", p: "tranquilos" },
      happy: { m: "feliz", f: "feliz", n: "feliz", p: "felices" },
      busy: { m: "ocupado", f: "ocupada", n: "ocupado", p: "ocupados" },
      tired: { m: "cansado", f: "cansada", n: "cansado", p: "cansados" },
      safe: { m: "a salvo", f: "a salvo", n: "a salvo", p: "a salvo" },
    },
    "pt-BR": {
      ready: { m: "pronto", f: "pronta", n: "pronto", p: "prontos" },
      calm: { m: "calmo", f: "calma", n: "calmo", p: "calmos" },
      happy: { m: "feliz", f: "feliz", n: "feliz", p: "felizes" },
      busy: { m: "ocupado", f: "ocupada", n: "ocupado", p: "ocupados" },
      tired: { m: "cansado", f: "cansada", n: "cansado", p: "cansados" },
      safe: {
        m: "em segurança",
        f: "em segurança",
        n: "em segurança",
        p: "em segurança",
      },
    },
    pl: {
      ready: { m: "gotowy", f: "gotowa", n: "gotowe", p: "gotowi" },
      calm: { m: "spokojny", f: "spokojna", n: "spokojne", p: "spokojni" },
      happy: {
        m: "szczęśliwy",
        f: "szczęśliwa",
        n: "szczęśliwe",
        p: "szczęśliwi",
      },
      busy: { m: "zajęty", f: "zajęta", n: "zajęte", p: "zajęci" },
      tired: { m: "zmęczony", f: "zmęczona", n: "zmęczone", p: "zmęczeni" },
      safe: {
        m: "bezpieczny",
        f: "bezpieczna",
        n: "bezpieczne",
        p: "bezpieczni",
      },
    },
  };
  if (!["ru", "uk", "es", "pt-BR", "pl"].includes(locale)) return undefined;
  const localized =
    adjective[locale][predicate]?.[gender] ?? WORD[locale][predicate];
  const names: Record<string, Record<string, string>> = {
    ru: {
      I: "Я",
      You: "Ты",
      He: "Он",
      She: "Она",
      It: "Это",
      We: "Мы",
      They: "Они",
    },
    uk: SUBJECT.uk,
    es: { I: "", You: "", He: "Él", She: "Ella", It: "Eso", We: "", They: "" },
    "pt-BR": {
      I: "",
      You: "Você",
      He: "Ele",
      She: "Ela",
      It: "Isso",
      We: "",
      They: "",
    },
    pl: { I: "", You: "", He: "On", She: "Ona", It: "To", We: "", They: "" },
  };
  if (locale === "ru" || locale === "uk") {
    const text =
      `${names[locale][subject]} ${negative ? "не " : ""}${localized}`.trim();
    return `${text}${question ? "?" : "."}`;
  }
  const be: Record<string, Record<string, string>> = {
    es: {
      I: "estoy",
      You: "estás",
      He: "está",
      She: "está",
      It: "está",
      We: "estamos",
      They: "están",
    },
    "pt-BR": {
      I: "estou",
      You: "está",
      He: "está",
      She: "está",
      It: "está",
      We: "estamos",
      They: "estão",
    },
    pl: {
      I: "jestem",
      You: "jesteś",
      He: "jest",
      She: "jest",
      It: "jest",
      We: "jesteśmy",
      They: "są",
    },
  };
  const pronoun = names[locale][subject];
  const neg = negative
    ? locale === "pl"
      ? "nie "
      : locale === "es"
        ? "no "
        : "não "
    : "";
  if (question)
    return locale === "es"
      ? `¿${`${negative ? "No " : ""}${be.es[subject]} ${localized}`.replace(/^./u, (letter) => letter.toLocaleUpperCase("es"))}?`
      : locale === "pt-BR"
        ? `${negative ? "Não " : ""}${be["pt-BR"][subject].replace(/^./u, (letter) => letter.toUpperCase())} ${localized}?`
        : `Czy ${negative ? "nie " : ""}${be.pl[subject]} ${localized}?`;
  const statement = `${pronoun ? `${pronoun} ` : ""}${neg}${be[locale][subject]} ${localized}.`;
  return statement.replace(/^./u, (letter) => letter.toLocaleUpperCase(locale));
}

function meaning(locale: Locale, english: string): string {
  const tokens = normalizedTokens(english);
  const question = english.endsWith("?");
  const rawSubject = tokens[0] === "Are" ? tokens[1] : tokens[0];
  const subject = rawSubject
    ? rawSubject.replace(/^./u, (letter) => letter.toUpperCase())
    : "";
  const negative = tokens.includes("not");
  const predicate = tokens
    .filter(
      (token) =>
        ![
          "i",
          "you",
          "he",
          "she",
          "it",
          "we",
          "they",
          "are",
          "am",
          "are",
          "is",
          "not",
          "at",
          "in",
          "the",
        ].includes(token.toLowerCase()),
    )
    .join(" ");
  const semanticClass = realizeSemanticClass(
    locale,
    subject,
    predicate,
    negative,
    question,
  );
  if (semanticClass) return semanticClass;
  const european = realizeEuropean(
    locale,
    subject,
    predicate,
    negative,
    question,
  );
  if (european) return european;
  if (locale === "vi" || locale === "id") {
    const isVietnamese = locale === "vi";
    const people = isVietnamese
      ? ({
          I: "Tôi",
          You: "Bạn",
          He: "Anh ấy",
          She: "Cô ấy",
          It: "Nó",
          We: "Chúng tôi",
          They: "Họ",
        } as Record<string, string>)
      : ({
          I: "Saya",
          You: "Kamu",
          He: "Dia",
          She: "Dia",
          It: "Itu",
          We: "Kami",
          They: "Mereka",
        } as Record<string, string>);
    const weather =
      subject === "It" && (predicate === "cold" || predicate === "warm");
    const lexicon = WORD[locale][predicate] ?? predicate;
    const stem = weather
      ? isVietnamese
        ? `Trời ${predicate === "cold" ? "lạnh" : "ấm"}`
        : `Cuacanya ${predicate === "cold" ? "dingin" : "hangat"}`
      : `${people[subject]} ${lexicon}`;
    if (question)
      return isVietnamese
        ? `${stem} phải không?`
        : `Apakah ${stem.toLowerCase()}?`;
    if (negative)
      return isVietnamese
        ? `${weather ? "Trời" : people[subject]} không ${weather ? (predicate === "cold" ? "lạnh" : "ấm") : lexicon}.`
        : `${weather ? "Cuacanya" : people[subject]} tidak ${weather ? (predicate === "cold" ? "dingin" : "hangat") : lexicon}.`;
    return `${stem}.`;
  }
  if (locale === "tr") {
    const stem =
      (
        {
          ready: "hazır",
          here: "burada",
          calm: "sakin",
          happy: "mutlu",
          busy: "meşgul",
          tired: "yorgun",
          warm: "sıcak",
          cold: "soğuk",
          okay: "iyi",
          friends: "arkadaş",
          teachers: "öğretmen",
          students: "öğrenci",
          books: "kitap",
          bags: "çanta",
          keys: "anahtar",
          cups: "fincan",
          home: "evde",
          room: "odada",
          early: "erken",
          together: "birlikte",
          safe: "güvende",
        } as Record<string, string>
      )[predicate] ?? predicate;
    const lastVowel =
      [...stem].reverse().find((letter) => /[aeıioöuü]/u.test(letter)) ?? "ı";
    // Loanword `meşgul` takes front-vowel copular/question suffixes despite
    // its final written vowel. Keep lexical exceptions explicit instead of
    // pretending every Turkish predicate follows the mechanical last-vowel rule.
    const harmony =
      stem === "meşgul"
        ? 3
        : /[aı]/u.test(lastVowel)
          ? 0
          : /[ei]/u.test(lastVowel)
            ? 1
            : /[ou]/u.test(lastVowel)
              ? 2
              : 3;
    const particle = ["mı", "mi", "mu", "mü"][harmony];
    const suffix = {
      I: ["ım", "im", "um", "üm"][harmony],
      You: ["sın", "sin", "sun", "sün"][harmony],
      We: ["ız", "iz", "uz", "üz"][harmony],
      qI: ["mıyım", "miyim", "muyum", "müyüm"][harmony],
      qYou: ["mısın", "misin", "musun", "müsün"][harmony],
      qWe: ["mıyız", "miyiz", "muyuz", "müyüz"][harmony],
    };
    const plural =
      stem === "meşgul" ? "ler" : /[aıou]/u.test(lastVowel) ? "lar" : "ler";
    const vowelEnding = /[aeıioöuü]$/u.test(stem);
    const suffixedStem = (ending: string, buffer = false) =>
      `${stem === "sıcak" && /^[ıiuü]/u.test(ending) ? "sıcağ" : stem}${buffer && vowelEnding ? "y" : ""}${ending}`;
    const positive: Record<string, string> = {
      I: suffixedStem(suffix.I, true),
      You: suffixedStem(suffix.You),
      He: `O ${stem}`,
      She: `O ${stem}`,
      It: `O ${stem}`,
      We: suffixedStem(suffix.We, true),
      They: `${stem}${plural}`,
    };
    const negated: Record<string, string> = {
      I: `${stem} değilim`,
      You: `${stem} değilsin`,
      He: `O ${stem} değil`,
      She: `O ${stem} değil`,
      It: `O ${stem} değil`,
      We: `${stem} değiliz`,
      They: `${stem} değiller`,
    };
    const questionForm: Record<string, string> = {
      I: `${stem} ${suffix.qI}`,
      You: `${stem} ${suffix.qYou}`,
      He: `O ${stem} ${particle}`,
      She: `O ${stem} ${particle}`,
      It: `O ${stem} ${particle}`,
      We: `${stem} ${suffix.qWe}`,
      They: (() => {
        const pluralPredicate = `${stem}${plural}`;
        const finalVowel =
          [...pluralPredicate]
            .reverse()
            .find((letter) => /[aeıioöuü]/u.test(letter)) ?? "ı";
        const finalHarmony = /[aı]/u.test(finalVowel)
          ? 0
          : /[ei]/u.test(finalVowel)
            ? 1
            : /[ou]/u.test(finalVowel)
              ? 2
              : 3;
        return `${pluralPredicate} ${["mı", "mi", "mu", "mü"][finalHarmony]}`;
      })(),
    };
    const realized = negative ? negated[subject] : positive[subject];
    return question
      ? `${questionForm[subject].replace(/^./u, (letter) => letter.toLocaleUpperCase("tr"))}?`
      : `${realized.replace(/^./u, (letter) => letter.toLocaleUpperCase("tr"))}.`;
  }
  const base =
    `${SUBJECT[locale][subject]} ${negative ? negativeWord(locale) : ""}${WORD[locale][predicate] ?? predicate}`.trim();
  return question ? questionPrefix(locale, base) : base;
}
function negativeWord(locale: Locale): string {
  return (
    {
      ru: "не ",
      uk: "не ",
      es: "no ",
      "pt-BR": "não ",
      vi: "không ",
      id: "tidak ",
      tr: "değil ",
      pl: "nie ",
    } as Record<Locale, string>
  )[locale];
}
function questionPrefix(locale: Locale, text: string): string {
  return (
    {
      ru: `Правда ли, что ${text}?`,
      uk: `Чи правда, що ${text}?`,
      es: `¿Es cierto que ${text}?`,
      "pt-BR": `É verdade que ${text}?`,
      vi: `Có phải ${text}?`,
      id: `Apakah ${text}?`,
      tr: `${text} mı?`,
      pl: `Czy ${text}?`,
    } as Record<Locale, string>
  )[locale];
}
function quizPrompt(locale: Locale, native: string): string {
  return (
    {
      ru: `Какая английская фраза значит «${native}»?`,
      uk: `Який англійський вислів означає «${native}»?`,
      es: `¿Qué frase inglesa significa «${native}»?`,
      "pt-BR": `Qual frase em inglês significa «${native}»?`,
      vi: `Câu tiếng Anh nào có nghĩa là «${native}»?`,
      id: `Kalimat Inggris mana yang berarti «${native}»?`,
      tr: `Hangi İngilizce cümle «${native}» anlamına gelir?`,
      pl: `Które angielskie zdanie znaczy „${native}”?`,
    } as Record<Locale, string>
  )[locale];
}
function tokenGloss(locale: Locale, token: string): string {
  const lower = token.toLocaleLowerCase("en");
  const shared: Record<Locale, Record<string, string>> = {
    ru: {
      not: "отрицание",
      very: "очень",
      also: "также",
      too: "тоже или слишком",
      really: "действительно",
      quite: "довольно",
      am: "форма be с I",
      are: "форма be с you/we/they",
      is: "форма be с he/she/it",
      was: "форма прошлого времени",
      were: "форма прошлого времени",
      be: "неличная форма",
      been: "причастная форма",
      a: "неопределённый артикль",
      an: "артикль перед гласным звуком",
      the: "определённый артикль",
      this: "этот предмет рядом",
      that: "тот предмет",
      my: "принадлежит мне",
    },
    uk: {
      not: "заперечення",
      very: "дуже",
      also: "також",
      too: "теж або надто",
      really: "справді",
      quite: "доволі",
      am: "форма be з I",
      are: "форма be з you/we/they",
      is: "форма be з he/she/it",
      was: "форма минулого часу",
      were: "форма минулого часу",
      be: "неособова форма",
      been: "дієприкметникова форма",
      a: "неозначений артикль",
      an: "артикль перед голосним звуком",
      the: "означений артикль",
      this: "цей предмет поруч",
      that: "той предмет",
      my: "належить мені",
    },
    es: {
      not: "negación",
      very: "muy",
      also: "también",
      too: "también o demasiado",
      really: "realmente",
      quite: "bastante",
      am: "forma de be con I",
      are: "forma de be con you/we/they",
      is: "forma de be con he/she/it",
      was: "forma de pasado",
      were: "forma de pasado",
      be: "forma no personal",
      been: "participio",
      a: "artículo indefinido",
      an: "artículo ante sonido vocálico",
      the: "artículo definido",
      this: "este objeto cercano",
      that: "ese objeto",
      my: "pertenece a quien habla",
    },
    "pt-BR": {
      not: "negação",
      very: "muito",
      also: "também",
      too: "também ou demais",
      really: "realmente",
      quite: "bastante",
      am: "forma de be com I",
      are: "forma de be com you/we/they",
      is: "forma de be com he/she/it",
      was: "forma de passado",
      were: "forma de passado",
      be: "forma não pessoal",
      been: "particípio",
      a: "artigo indefinido",
      an: "artigo antes de som vocálico",
      the: "artigo definido",
      this: "este objeto próximo",
      that: "aquele objeto",
      my: "pertence a quem fala",
    },
    vi: {
      not: "phủ định",
      very: "rất",
      also: "cũng",
      too: "cũng hoặc quá mức",
      really: "thực sự",
      quite: "khá",
      am: "dạng be đi với I",
      are: "dạng be đi với you/we/they",
      is: "dạng be đi với he/she/it",
      was: "dạng quá khứ",
      were: "dạng quá khứ",
      be: "dạng không chia",
      been: "phân từ",
      a: "mạo từ không xác định",
      an: "mạo từ trước âm nguyên âm",
      the: "mạo từ xác định",
      this: "vật này ở gần",
      that: "vật kia",
      my: "thuộc về người nói",
    },
    id: {
      not: "penyangkalan",
      very: "sangat",
      also: "juga",
      too: "juga atau terlalu",
      really: "benar-benar",
      quite: "cukup",
      am: "bentuk be untuk I",
      are: "bentuk be untuk you/we/they",
      is: "bentuk be untuk he/she/it",
      was: "bentuk lampau",
      were: "bentuk lampau",
      be: "bentuk tidak personal",
      been: "partisip",
      a: "artikel tak tentu",
      an: "artikel sebelum bunyi vokal",
      the: "artikel tertentu",
      this: "benda dekat ini",
      that: "benda itu",
      my: "milik penutur",
    },
    tr: {
      not: "olumsuzluk",
      very: "çok",
      also: "ayrıca",
      too: "de veya aşırı",
      really: "gerçekten",
      quite: "oldukça",
      am: "I ile kullanılan be biçimi",
      are: "you/we/they ile kullanılan be biçimi",
      is: "he/she/it ile kullanılan be biçimi",
      was: "geçmiş zaman biçimi",
      were: "geçmiş zaman biçimi",
      be: "çekimsiz biçim",
      been: "ortaç biçimi",
      a: "belirsiz artikel",
      an: "ünlü ses önündeki artikel",
      the: "belirli artikel",
      this: "yakındaki bu nesne",
      that: "uzaktaki şu nesne",
      my: "konuşana ait",
    },
    pl: {
      not: "przeczenie",
      very: "bardzo",
      also: "również",
      too: "też albo zbyt",
      really: "naprawdę",
      quite: "dość",
      am: "forma be z I",
      are: "forma be z you/we/they",
      is: "forma be z he/she/it",
      was: "forma czasu przeszłego",
      were: "forma czasu przeszłego",
      be: "forma nieosobowa",
      been: "imiesłów",
      a: "rodzajnik nieokreślony",
      an: "rodzajnik przed samogłoską",
      the: "rodzajnik określony",
      this: "ten bliski przedmiot",
      that: "tamten przedmiot",
      my: "należy do mówiącego",
    },
  };
  const lexical = WORD[locale][lower];
  if (lexical) return lexical;
  const pronoun =
    SUBJECT[locale][token.replace(/^./u, (letter) => letter.toUpperCase())];
  return shared[locale][lower] ?? pronoun ?? token;
}
function reason(
  locale: Locale,
  correct: string,
  alternative: string,
  phraseMeaning?: string,
): string {
  const category = tokenCategory(correct);
  const kind = /^(was|were)$/u.test(alternative)
    ? "past"
    : /^(be|been)$/u.test(alternative)
      ? "nonfinite"
      : /^(We’re|They’re|isn’t|aren’t)$/u.test(correct)
        ? "contraction"
        : category === "pronoun"
          ? "pronoun"
          : category === "copula"
            ? "agreement"
            : category === "negation"
              ? "negation"
              : category === "article"
                ? "article"
                : "lexical";
  const copy: Record<Locale, Record<typeof kind, string>> = {
    ru: {
      past: `«${alternative}» переносит фразу в прошлое, а здесь настоящее требует «${correct}».`,
      nonfinite: `«${alternative}» — неличная форма be; после этого подлежащего нужна форма «${correct}».`,
      contraction: `«${alternative}» не сохраняет участника и отрицание, заключённые в «${correct}».`,
      pronoun: `«${alternative}» называет другого участника; смысл фразы требует именно «${correct}».`,
      agreement: `«${alternative}» не согласуется с этим подлежащим; здесь нужна форма «${correct}».`,
      negation: `«${alternative}» не создаёт отрицание; нужный смысл выражает только «${correct}».`,
      article: `«${alternative}» меняет определённость или принадлежность; здесь требуется «${correct}».`,
      lexical: `«${alternative}» называет другой предмет или состояние; точный смысл требует «${correct}».`,
    },
    uk: {
      past: `«${alternative}» переносить вислів у минуле, а тут теперішнє вимагає «${correct}».`,
      nonfinite: `«${alternative}» — неособова форма be; після цього підмета потрібне «${correct}».`,
      contraction: `«${alternative}» не зберігає учасника й заперечення, закладені у «${correct}».`,
      pronoun: `«${alternative}» називає іншого учасника; зміст вимагає саме «${correct}».`,
      agreement: `«${alternative}» не узгоджується з цим підметом; тут потрібне «${correct}».`,
      negation: `«${alternative}» не створює заперечення; потрібний зміст виражає «${correct}».`,
      article: `«${alternative}» змінює означеність або належність; тут потрібне «${correct}».`,
      lexical: `«${alternative}» називає інший предмет або стан; точний зміст вимагає «${correct}».`,
    },
    es: {
      past: `«${alternative}» lleva la frase al pasado, mientras el presente exige «${correct}».`,
      nonfinite: `«${alternative}» es una forma no personal de be; con este sujeto hace falta «${correct}».`,
      contraction: `«${alternative}» no conserva el participante y la negación incluidos en «${correct}».`,
      pronoun: `«${alternative}» nombra a otro participante; el sentido exige exactamente «${correct}».`,
      agreement: `«${alternative}» no concuerda con este sujeto; aquí corresponde «${correct}».`,
      negation: `«${alternative}» no niega la idea; solo «${correct}» expresa el sentido requerido.`,
      article: `«${alternative}» cambia la determinación o la posesión; aquí corresponde «${correct}».`,
      lexical: `«${alternative}» nombra otra cosa o estado; el sentido exacto requiere «${correct}».`,
    },
    "pt-BR": {
      past: `«${alternative}» leva a frase ao passado, enquanto o presente exige «${correct}».`,
      nonfinite: `«${alternative}» é uma forma não pessoal de be; com este sujeito é preciso «${correct}».`,
      contraction: `«${alternative}» não preserva o participante e a negação contidos em «${correct}».`,
      pronoun: `«${alternative}» nomeia outro participante; o sentido exige exatamente «${correct}».`,
      agreement: `«${alternative}» não concorda com este sujeito; aqui se usa «${correct}».`,
      negation: `«${alternative}» não nega a ideia; só «${correct}» expressa o sentido necessário.`,
      article: `«${alternative}» muda a determinação ou a posse; aqui se usa «${correct}».`,
      lexical: `«${alternative}» nomeia outra coisa ou estado; o sentido exato exige «${correct}».`,
    },
    vi: {
      past: `«${alternative}» đưa câu về quá khứ, còn ý hiện tại cần «${correct}».`,
      nonfinite: `«${alternative}» là dạng không chia của be; với chủ thể này cần «${correct}».`,
      contraction: `«${alternative}» không giữ đúng chủ thể và phủ định nằm trong «${correct}».`,
      pronoun: `«${alternative}» chỉ một chủ thể khác; ý nghĩa cần chính xác «${correct}».`,
      agreement: `«${alternative}» không đi với chủ thể này; vị trí đó cần «${correct}».`,
      negation: `«${alternative}» không tạo nghĩa phủ định; chỉ «${correct}» truyền đúng ý.`,
      article: `«${alternative}» làm đổi tính xác định hoặc sở hữu; ở đây cần «${correct}».`,
      lexical: `«${alternative}» gọi một vật hoặc trạng thái khác; ý chính xác cần «${correct}».`,
    },
    id: {
      past: `«${alternative}» membawa kalimat ke masa lalu, sedangkan keadaan sekarang memerlukan «${correct}».`,
      nonfinite: `«${alternative}» ialah bentuk be yang tidak sesuai subjek; di sini diperlukan «${correct}».`,
      contraction: `«${alternative}» tidak mempertahankan pelaku dan penyangkalan di dalam «${correct}».`,
      pronoun: `«${alternative}» menunjuk pelaku lain; makna kalimat memerlukan «${correct}».`,
      agreement: `«${alternative}» tidak sesuai dengan subjek ini; bentuk yang diperlukan ialah «${correct}».`,
      negation: `«${alternative}» tidak menyangkal gagasan; hanya «${correct}» memberi arti yang diminta.`,
      article: `«${alternative}» mengubah ketentuan atau kepemilikan; di sini diperlukan «${correct}».`,
      lexical: `«${alternative}» menyebut benda atau keadaan lain; makna tepat memerlukan «${correct}».`,
    },
    tr: {
      past: `«${alternative}» cümleyi geçmişe taşır; şimdiki anlam için «${correct}» gerekir.`,
      nonfinite: `«${alternative}» çekimsiz bir be biçimidir; bu özneyle «${correct}» gerekir.`,
      contraction: `«${alternative}», «${correct}» içindeki kişiyi ve olumsuzluğu birlikte korumaz.`,
      pronoun: `«${alternative}» başka bir kişiyi gösterir; cümlenin anlamı «${correct}» ister.`,
      agreement: `«${alternative}» bu özneyle uyuşmaz; burada «${correct}» biçimi gerekir.`,
      negation: `«${alternative}» anlamı olumsuz yapmaz; gereken anlamı yalnız «${correct}» verir.`,
      article: `«${alternative}» belirliliği ya da sahipliği değiştirir; burada «${correct}» gerekir.`,
      lexical: `«${alternative}» başka bir nesne ya da durum söyler; kesin anlam «${correct}» ister.`,
    },
    pl: {
      past: `„${alternative}” przenosi zdanie do przeszłości, a teraźniejszość wymaga „${correct}”.`,
      nonfinite: `„${alternative}” jest nieosobową formą be; z tym podmiotem potrzebne jest „${correct}”.`,
      contraction: `„${alternative}” nie zachowuje osoby i przeczenia zawartych w „${correct}”.`,
      pronoun: `„${alternative}” wskazuje innego uczestnika; sens zdania wymaga „${correct}”.`,
      agreement: `„${alternative}” nie zgadza się z tym podmiotem; tutaj potrzebne jest „${correct}”.`,
      negation: `„${alternative}” nie tworzy przeczenia; wymagany sens wyraża „${correct}”.`,
      article: `„${alternative}” zmienia określoność albo przynależność; tutaj potrzebne jest „${correct}”.`,
      lexical: `„${alternative}” nazywa inną rzecz lub stan; dokładny sens wymaga „${correct}”.`,
    },
  };
  const correctGloss = phraseMeaning ?? tokenGloss(locale, correct);
  const alternativeGloss = tokenGloss(locale, alternative);
  const comparison: Record<Locale, string> = {
    ru: `Конкретно «${alternative}» передаёт «${alternativeGloss}», тогда как «${correct}» здесь выполняет роль «${correctGloss}».`,
    uk: `Саме «${alternative}» передає «${alternativeGloss}», тоді як «${correct}» тут виконує роль «${correctGloss}».`,
    es: `En concreto, «${alternative}» aporta «${alternativeGloss}», mientras «${correct}» cumple aquí la función «${correctGloss}».`,
    "pt-BR": `Especificamente, «${alternative}» expressa «${alternativeGloss}», enquanto «${correct}» cumpre aqui a função «${correctGloss}».`,
    vi: `Cụ thể, «${alternative}» mang nghĩa «${alternativeGloss}», còn «${correct}» ở đây giữ vai trò «${correctGloss}».`,
    id: `Secara khusus, «${alternative}» membawa arti «${alternativeGloss}», sedangkan «${correct}» di sini berperan sebagai «${correctGloss}».`,
    tr: `Özellikle «${alternative}», «${alternativeGloss}» işlevini taşırken burada «${correct}» sözcüğünün görevi «${correctGloss}» olur.`,
    pl: `Konkretnie „${alternative}” wnosi znaczenie „${alternativeGloss}”, a „${correct}” pełni tutaj funkcję „${correctGloss}”.`,
  };
  return `${copy[locale][kind]} ${comparison[locale]}`;
}

function explanation(locale: Locale, english: string, native: string): string {
  const question = english.endsWith("?");
  const contraction = /(?:We’re|They’re|isn’t|aren’t)/u.test(english);
  const negative = /(?:not|isn’t|aren’t)/u.test(english);
  const shape = question
    ? "question"
    : contraction && negative
      ? "combined"
      : contraction
        ? "contraction"
        : negative
          ? "negative"
          : "statement";
  const copy: Record<Locale, Record<typeof shape, string>> = {
    ru: {
      statement:
        "Сначала назван участник, затем форма be связывает его с состоянием или местом; порядок нельзя переставлять.",
      negative:
        "Отрицание стоит после формы be и отменяет признак, не меняя самого участника.",
      question:
        "Вопрос начинается с формы are, а затем называет участника; такой порядок сразу делает фразу вопросом.",
      contraction:
        "Короткая форма сохраняет ту же связку are, но произносится одним блоком с местоимением.",
      combined:
        "isn’t или aren’t уже объединяет is/are и not в одной короткой форме; без этой части смысл был бы противоположным.",
    },
    uk: {
      statement:
        "Спершу названо учасника, потім форма be поєднує його зі станом або місцем; порядок не можна міняти.",
      negative:
        "Заперечення стоїть після форми be та скасовує ознаку, не міняючи учасника.",
      question:
        "Запитання починається з are, а далі називає учасника; такий порядок створює запитання.",
      contraction:
        "Коротка форма зберігає are, але вимовляється одним блоком із займенником.",
      combined:
        "isn’t або aren’t уже поєднує is/are і not в одній короткій формі; без неї зміст був би протилежним.",
    },
    es: {
      statement:
        "Primero aparece el participante y be lo une con estado o lugar; el orden no se intercambia.",
      negative:
        "La negación va después de be y cancela la cualidad sin cambiar al participante.",
      question:
        "La pregunta empieza con are y después nombra al participante; ese orden crea la pregunta.",
      contraction:
        "La forma breve conserva are, pero lo pronuncia unido al pronombre.",
      combined:
        "isn’t o aren’t ya une is/are y not en una sola forma breve; sin esa parte el sentido sería el contrario.",
    },
    "pt-BR": {
      statement:
        "Primeiro vem o participante e be o liga ao estado ou lugar; essa ordem não se troca.",
      negative:
        "A negação fica depois de be e cancela a característica sem mudar o participante.",
      question:
        "A pergunta começa com are e depois nomeia o participante; essa ordem cria a pergunta.",
      contraction:
        "A forma curta conserva are, mas o pronuncia unido ao pronome.",
      combined:
        "isn’t ou aren’t já une is/are e not numa única forma curta; sem essa parte, o sentido seria o oposto.",
    },
    vi: {
      statement:
        "Chủ thể xuất hiện trước, rồi be nối với trạng thái hoặc nơi chốn; không đổi trật tự này.",
      negative:
        "Phủ định đứng sau be và phủ nhận đặc điểm mà không đổi chủ thể.",
      question:
        "Câu hỏi mở đầu bằng are rồi mới nêu chủ thể; trật tự đó tạo câu hỏi.",
      contraction: "Dạng ngắn vẫn giữ are nhưng gắn với đại từ thành một cụm.",
      combined:
        "isn’t hoặc aren’t đã gộp is/are và not vào một dạng ngắn; bỏ phần đó sẽ đổi nghĩa.",
    },
    id: {
      statement:
        "Pelaku muncul lebih dahulu, lalu be menghubungkannya dengan keadaan atau tempat; urutan ini tidak ditukar.",
      negative:
        "Penyangkalan berada setelah be dan meniadakan sifat tanpa mengganti pelaku.",
      question:
        "Pertanyaan dimulai dengan are lalu menyebut pelaku; urutan itu membuat pertanyaan.",
      contraction:
        "Bentuk pendek tetap menyimpan are, tetapi menyatu dengan kata ganti.",
      combined:
        "isn’t atau aren’t sudah menyatukan is/are dan not dalam satu bentuk singkat; tanpa bagian itu maknanya berlawanan.",
    },
    tr: {
      statement:
        "Önce kişi gelir, sonra be onu durum veya yere bağlar; bu sıra değiştirilmez.",
      negative:
        "Olumsuzluk be sonrasında gelir ve kişiyi değiştirmeden özelliği reddeder.",
      question:
        "Soru are ile başlar, sonra kişiyi söyler; bu sıra soruyu kurar.",
      contraction:
        "Kısa biçim are anlamını korur ama zamirle tek blok söylenir.",
      combined:
        "isn’t ya da aren’t, is/are ile not öğelerini tek kısa biçimde birleştirir; bu bölüm olmadan anlam tersine döner.",
    },
    pl: {
      statement:
        "Najpierw występuje uczestnik, potem be łączy go ze stanem lub miejscem; tego szyku nie zmieniamy.",
      negative: "Przeczenie stoi po be i odwołuje cechę bez zmiany uczestnika.",
      question:
        "Pytanie zaczyna się od are, a potem podaje uczestnika; ten szyk tworzy pytanie.",
      contraction: "Skrót zachowuje are, ale wymawia je razem z zaimkiem.",
      combined:
        "isn’t albo aren’t łączy is/are i not w jednej krótkiej formie; bez tej części sens byłby przeciwny.",
    },
  };
  return `${native} ${copy[locale][shape]} ${({ ru: "Каждое слово занимает свою роль в готовой мысли.", uk: "Кожне слово має свою роль у готовій думці.", es: "Cada palabra ocupa su papel en la idea completa.", "pt-BR": "Cada palavra ocupa seu papel na ideia completa.", vi: "Mỗi từ đều có vai trò trong ý trọn vẹn.", id: "Setiap kata memiliki peran dalam gagasan utuh.", tr: "Her sözcüğün tamamlanmış düşüncede bir görevi vardır.", pl: "Każde słowo ma swoją rolę w gotowej myśli." } as Record<Locale, string>)[locale]}`;
}

function phrase(
  ordinal: number,
  position: number,
  english: string,
): EpisodeSourcePhrase {
  const localizedDetails = Object.fromEntries(
    LOCALES.map((locale) => {
      const native = meaning(locale, english);
      const words = surfaceTokens(english);
      return [
        locale,
        {
          meaning: native,
          explanation: explanation(locale, english, native),
          distractors: alternatives(words[0]).map((value) => ({
            value,
            reason: reason(locale, words[0], value, native),
          })),
          words: words.map((correct) => ({
            correct,
            prompt: quizPrompt(locale, native),
            distractors: alternatives(correct).map((value) => ({
              value,
              reason: reason(locale, correct, value, native),
            })),
          })),
        },
      ];
    }),
  ) as unknown as Record<Locale, EpisodeSourcePhraseLocalizedDetails>;
  return {
    id: `e01-s${String(ordinal).padStart(2, "0")}-${String(position + 1).padStart(2, "0")}`,
    english,
    russian: localizedDetails.ru.meaning,
    explanation: localizedDetails.ru.explanation,
    localizedDetails,
    features: FEATURES[ordinal],
    words: surfaceTokens(english).map((correct) => ({
      correct,
      category: tokenCategory(correct),
      distractors: alternatives(correct).map((value) => ({
        value,
        reasonCode: "wrong_token_for_position",
        why: reason("ru", correct, value, localizedDetails.ru.meaning),
      })),
    })),
  };
}
const FORMULAS: Record<Locale, readonly string[]> = {
  ru: [
    "Каркас: we + are + описание. Are показывает, что говорящий входит в эту группу.",
    "Каркас: they + are + описание во множественном числе. They может указывать и на людей, и на несколько предметов.",
    "Каркас отрицания: we/they + are + not + описание. Not стоит сразу после are.",
    "Каркас вопроса: Are + we/they + описание? Перенос are в начало меняет намерение всей фразы.",
    "Каркас короткой формы: we’re/they’re + описание. Апостроф сохраняет are внутри одного звучащего блока.",
    "Каркас: один участник + isn’t, несколько участников + aren’t. Обе формы уже содержат not.",
    "Три опоры: I + am; you/we/they + are; he/she/it + is. Форму выбирает подлежащее.",
    "Сначала выберите намерение: утверждение ставит be после подлежащего, отрицание добавляет not, вопрос выносит be вперёд.",
  ],
  uk: [
    "Каркас: we + are + опис. Are показує, що мовець входить до цієї групи.",
    "Каркас: they + are + опис у множині. They може вказувати і на людей, і на кілька предметів.",
    "Каркас заперечення: we/they + are + not + опис. Not стоїть одразу після are.",
    "Каркас запитання: Are + we/they + опис? Перенесення are на початок змінює намір усього вислову.",
    "Каркас короткої форми: we’re/they’re + опис. Апостроф зберігає are в одному звуковому блоці.",
    "Каркас: один учасник + isn’t, кілька учасників + aren’t. Обидві форми вже містять not.",
    "Три опори: I + am; you/we/they + are; he/she/it + is. Форму визначає підмет.",
    "Спершу виберіть намір: твердження ставить be після підмета, заперечення додає not, запитання виносить be вперед.",
  ],
  es: [
    "Patrón: we + are + descripción. Are muestra que quien habla forma parte del grupo.",
    "Patrón: they + are + descripción plural. They puede señalar personas o varios objetos.",
    "Patrón negativo: we/they + are + not + descripción. Not va inmediatamente después de are.",
    "Patrón interrogativo: Are + we/they + descripción? Llevar are al principio cambia la intención completa.",
    "Patrón breve: we’re/they’re + descripción. El apóstrofo conserva are dentro de un solo bloque sonoro.",
    "Patrón: un participante + isn’t; varios participantes + aren’t. Ambas formas ya contienen not.",
    "Tres apoyos: I + am; you/we/they + are; he/she/it + is. El sujeto elige la forma.",
    "Primero decide la intención: la afirmación pone be tras el sujeto, la negación añade not y la pregunta adelanta be.",
  ],
  "pt-BR": [
    "Padrão: we + are + descrição. Are mostra que quem fala faz parte do grupo.",
    "Padrão: they + are + descrição plural. They pode apontar pessoas ou vários objetos.",
    "Padrão negativo: we/they + are + not + descrição. Not vem imediatamente depois de are.",
    "Padrão de pergunta: Are + we/they + descrição? Levar are ao início muda a intenção inteira.",
    "Padrão curto: we’re/they’re + descrição. O apóstrofo mantém are dentro de um único bloco sonoro.",
    "Padrão: um participante + isn’t; vários participantes + aren’t. As duas formas já contêm not.",
    "Três apoios: I + am; you/we/they + are; he/she/it + is. O sujeito escolhe a forma.",
    "Primeiro escolha a intenção: a afirmação põe be após o sujeito, a negação acrescenta not e a pergunta leva be ao início.",
  ],
  vi: [
    "Mẫu: we + are + phần miêu tả. Are cho biết người nói thuộc nhóm đó.",
    "Mẫu: they + are + phần miêu tả số nhiều. They có thể chỉ nhiều người hoặc nhiều đồ vật.",
    "Mẫu phủ định: we/they + are + not + phần miêu tả. Not đứng ngay sau are.",
    "Mẫu câu hỏi: Are + we/they + phần miêu tả? Đưa are lên đầu làm thay đổi mục đích của cả câu.",
    "Mẫu rút gọn: we’re/they’re + phần miêu tả. Dấu nháy giữ are trong một cụm âm thanh.",
    "Mẫu: một chủ thể + isn’t; nhiều chủ thể + aren’t. Cả hai dạng đều đã chứa not.",
    "Ba điểm tựa: I + am; you/we/they + are; he/she/it + is. Chủ ngữ quyết định dạng.",
    "Trước hết chọn mục đích: câu khẳng định đặt be sau chủ ngữ, phủ định thêm not, câu hỏi đưa be lên trước.",
  ],
  id: [
    "Pola: we + are + keterangan. Are menunjukkan bahwa pembicara termasuk kelompok itu.",
    "Pola: they + are + keterangan jamak. They dapat menunjuk beberapa orang atau benda.",
    "Pola negatif: we/they + are + not + keterangan. Not langsung berada setelah are.",
    "Pola pertanyaan: Are + we/they + keterangan? Memindahkan are ke awal mengubah maksud seluruh kalimat.",
    "Pola singkat: we’re/they’re + keterangan. Apostrof menyimpan are dalam satu blok bunyi.",
    "Pola: satu pelaku + isn’t; beberapa pelaku + aren’t. Kedua bentuk sudah memuat not.",
    "Tiga pasangan: I + am; you/we/they + are; he/she/it + is. Subjek menentukan bentuk.",
    "Tentukan maksud lebih dulu: pernyataan menaruh be setelah subjek, penyangkalan menambah not, pertanyaan memindahkan be ke depan.",
  ],
  tr: [
    "Kalıp: we + are + açıklama. Are, konuşanın bu grubun içinde olduğunu gösterir.",
    "Kalıp: they + are + çoğul açıklama. They birden çok kişiyi ya da nesneyi gösterebilir.",
    "Olumsuz kalıp: we/they + are + not + açıklama. Not doğrudan are sonrasına gelir.",
    "Soru kalıbı: Are + we/they + açıklama? Are biçimini başa almak bütün cümlenin amacını değiştirir.",
    "Kısa kalıp: we’re/they’re + açıklama. Kesme işareti are biçimini tek ses bloğunda korur.",
    "Kalıp: tek kişi + isn’t; birden çok kişi + aren’t. İki biçim de not anlamını içerir.",
    "Üç dayanak: I + am; you/we/they + are; he/she/it + is. Biçimi özne seçer.",
    "Önce amacı seçin: bildirim be biçimini özneden sonra koyar, olumsuzluk not ekler, soru be biçimini öne alır.",
  ],
  pl: [
    "Wzór: we + are + opis. Are pokazuje, że mówiąca osoba należy do tej grupy.",
    "Wzór: they + are + opis w liczbie mnogiej. They może wskazywać osoby albo kilka rzeczy.",
    "Wzór przeczenia: we/they + are + not + opis. Not stoi bezpośrednio po are.",
    "Wzór pytania: Are + we/they + opis? Przeniesienie are na początek zmienia intencję całego zdania.",
    "Wzór skrótu: we’re/they’re + opis. Apostrof zachowuje are w jednym bloku brzmieniowym.",
    "Wzór: jeden uczestnik + isn’t; kilku uczestników + aren’t. Obie formy zawierają już not.",
    "Trzy pary: I + am; you/we/they + are; he/she/it + is. Formę wybiera podmiot.",
    "Najpierw wybierz intencję: twierdzenie stawia be po podmiocie, przeczenie dodaje not, a pytanie przenosi be na początek.",
  ],
};

const TRAPS: Record<Locale, readonly string[]> = {
  ru: [
    "Ошибка we is меняет согласование: с we допустима только форма are.",
    "После they нельзя ставить is и нельзя терять смысл множественного числа.",
    "Not перед are или без are разрушает отрицательный каркас.",
    "Порядок we are сообщает факт; вопрос начинается с Are we.",
    "We are и we’re равны по смыслу, но апостроф нельзя просто удалить из короткой записи.",
    "isn’t и aren’t нельзя менять местами: первая форма единственная, вторая множественная.",
    "Одна форма be не подходит всем: I is, he are и they is нарушают согласование.",
    "Нельзя угадывать порядок: факт, отрицание и вопрос различаются положением be и not.",
  ],
  uk: [
    "Помилка we is порушує узгодження: з we можлива лише форма are.",
    "Після they не можна ставити is або втрачати зміст множини.",
    "Not перед are чи без are руйнує заперечний каркас.",
    "Порядок we are повідомляє факт; запитання починається з Are we.",
    "We are і we’re однакові за змістом, але апостроф не можна викинути з короткого запису.",
    "isn’t та aren’t не міняються місцями: перша форма однини, друга множини.",
    "Одна форма be не підходить усім: I is, he are і they is порушують узгодження.",
    "Не можна вгадувати порядок: факт, заперечення й запитання різняться місцем be та not.",
  ],
  es: [
    "El error we is rompe la concordancia: con we solo corresponde are.",
    "Después de they no se usa is ni se pierde el sentido plural.",
    "Poner not antes de are o quitar are rompe la estructura negativa.",
    "El orden we are afirma; la pregunta empieza con Are we.",
    "We are y we’re conservan el sentido, pero el apóstrofo no se elimina de la escritura breve.",
    "isn’t y aren’t no se intercambian: la primera es singular y la segunda plural.",
    "Una sola forma de be no sirve para todos: I is, he are y they is rompen la concordancia.",
    "No adivines el orden: hecho, negación y pregunta se distinguen por la posición de be y not.",
  ],
  "pt-BR": [
    "O erro we is quebra a concordância: com we só cabe are.",
    "Depois de they não se usa is nem se perde o sentido plural.",
    "Colocar not antes de are ou retirar are quebra a estrutura negativa.",
    "A ordem we are afirma; a pergunta começa com Are we.",
    "We are e we’re preservam o sentido, mas o apóstrofo não pode ser apagado da forma curta.",
    "isn’t e aren’t não se trocam: a primeira é singular e a segunda plural.",
    "Uma única forma de be não serve para todos: I is, he are e they is quebram a concordância.",
    "Não adivinhe a ordem: fato, negação e pergunta se distinguem pela posição de be e not.",
  ],
  vi: [
    "Lỗi we is làm sai sự hòa hợp: với we chỉ dùng are.",
    "Sau they không dùng is và không được làm mất nghĩa số nhiều.",
    "Đặt not trước are hoặc bỏ are sẽ phá vỡ cấu trúc phủ định.",
    "Trật tự we are nêu sự thật; câu hỏi bắt đầu bằng Are we.",
    "We are và we’re giữ nguyên nghĩa, nhưng không thể bỏ dấu nháy khỏi dạng viết ngắn.",
    "Không đổi chỗ isn’t và aren’t: dạng đầu cho số ít, dạng sau cho số nhiều.",
    "Một dạng be không dùng cho mọi chủ ngữ: I is, he are và they is đều sai hòa hợp.",
    "Không đoán trật tự: sự thật, phủ định và câu hỏi khác nhau ở vị trí của be và not.",
  ],
  id: [
    "Kesalahan we is merusak kesesuaian: we hanya memakai are.",
    "Setelah they jangan memakai is atau menghilangkan makna jamak.",
    "Menaruh not sebelum are atau membuang are merusak pola negatif.",
    "Urutan we are menyatakan fakta; pertanyaan dimulai dengan Are we.",
    "We are dan we’re mempertahankan arti, tetapi apostrof tidak boleh dihapus dari bentuk singkat.",
    "isn’t dan aren’t tidak dapat ditukar: yang pertama tunggal, yang kedua jamak.",
    "Satu bentuk be tidak cocok untuk semua: I is, he are, dan they is merusak kesesuaian.",
    "Jangan menebak urutan: fakta, penyangkalan, dan pertanyaan dibedakan oleh posisi be dan not.",
  ],
  tr: [
    "We is hatası uyumu bozar: we ile yalnız are kullanılır.",
    "They sonrasında is kullanılamaz ve çoğul anlam kaybedilemez.",
    "Not biçimini are önüne koymak ya da are biçimini silmek olumsuz kalıbı bozar.",
    "We are sırası bildirimdir; soru Are we ile başlar.",
    "We are ile we’re aynı anlamı korur, fakat kısa yazımdaki kesme işareti silinemez.",
    "isn’t ile aren’t yer değiştiremez: ilki tekil, ikincisi çoğuldur.",
    "Tek bir be biçimi herkese uymaz: I is, he are ve they is kişi uyumunu bozar.",
    "Sırayı tahmin etmeyin: bildirim, olumsuzluk ve soru be ile not konumuyla ayrılır.",
  ],
  pl: [
    "Błąd we is łamie zgodę: z we używa się wyłącznie are.",
    "Po they nie wolno użyć is ani zgubić znaczenia liczby mnogiej.",
    "Not przed are albo brak are niszczy konstrukcję przeczącą.",
    "Szyk we are oznajmia; pytanie zaczyna się od Are we.",
    "We are i we’re zachowują sens, ale apostrofu nie można usunąć z zapisu skróconego.",
    "isn’t i aren’t nie są zamienne: pierwsza forma jest pojedyncza, druga mnoga.",
    "Jedna forma be nie pasuje wszystkim: I is, he are i they is łamią zgodę.",
    "Nie zgaduj szyku: fakt, przeczenie i pytanie różnią się pozycją be oraz not.",
  ],
};

const INTRO_FOCUS: Record<
  Locale,
  readonly (readonly [string, string, string])[]
> = {
  ru: [
    [
      "Группа включает говорящего.",
      "Проверьте связку группы с are.",
      "Не подменяйте форму we is.",
    ],
    [
      "Здесь they может быть людьми или вещами.",
      "Отметьте множественный смысл после are.",
      "Не теряйте множественность у предметов.",
    ],
    [
      "Отрицание меняет только признак группы.",
      "Найдите место not после are.",
      "Не ставьте not перед связкой.",
    ],
    [
      "Вопрос запрашивает ответ о группе.",
      "Сначала вынесите Are.",
      "Не оставляйте порядок утверждения.",
    ],
    [
      "Короткая форма звучит как один блок.",
      "Апостроф хранит are в we’re/they’re.",
      "Не разрывайте сокращение.",
    ],
    [
      "Сокращение сразу несёт отрицание.",
      "Разведите isn’t и aren’t по числу.",
      "Не ищите отдельное not внутри записи.",
    ],
    [
      "Выберите форму по каждому местоимению.",
      "Сверьте всю таблицу am/are/is.",
      "Не переносите одну форму на всех.",
    ],
    [
      "Сначала определите намерение сообщения.",
      "Соберите форму для утверждения, отрицания или вопроса.",
      "Проверьте форму и порядок вместе.",
    ],
  ],
  uk: [
    [
      "Група містить мовця.",
      "Перевірте зв’язок групи з are.",
      "Не підміняйте форму we is.",
    ],
    [
      "They тут означає людей або речі.",
      "Позначте множинний зміст після are.",
      "Не губіть множину предметів.",
    ],
    [
      "Заперечення змінює лише ознаку групи.",
      "Знайдіть not після are.",
      "Не ставте not перед зв’язкою.",
    ],
    [
      "Запитання просить відповідь про групу.",
      "Спочатку винесіть Are.",
      "Не лишайте порядок твердження.",
    ],
    [
      "Коротка форма звучить одним блоком.",
      "Апостроф зберігає are у we’re/they’re.",
      "Не розривайте скорочення.",
    ],
    [
      "Скорочення одразу містить заперечення.",
      "Розрізняйте isn’t і aren’t за числом.",
      "Не шукайте окреме not у записі.",
    ],
    [
      "Форму обирає кожен займенник.",
      "Звірте всю таблицю am/are/is.",
      "Не давайте одну форму всім.",
    ],
    [
      "Спершу визначте намір повідомлення.",
      "Зберіть форму твердження, заперечення чи питання.",
      "Перевірте форму й порядок разом.",
    ],
  ],
  es: [
    [
      "We incluye a quien habla dentro del grupo.",
      "Une we exclusivamente con are antes del estado o lugar.",
      "We is rompe la concordancia y deja de sonar como presente normal.",
    ],
    [
      "They puede señalar varias personas o varios objetos.",
      "Mantén they + are y expresa en plural aquello que se identifica.",
      "No traduzcas los objetos como personas ni cambies are por is.",
    ],
    [
      "Not niega el estado del grupo, no la existencia del grupo.",
      "Coloca not inmediatamente después de are en we/they + are + not.",
      "Mover not delante de are destruye el orden de la negación inglesa.",
    ],
    [
      "Are al principio convierte la información sobre el grupo en una pregunta.",
      "Construye Are + we/they + descripción y cierra con signo de interrogación.",
      "We are informa; Are we pregunta: conservar el orden afirmativo cambia la intención.",
    ],
    [
      "We’re y they’re conservan por completo we are y they are.",
      "El apóstrofo marca la unión del pronombre con are en un solo bloque sonoro.",
      "Quitar el apóstrofo o tratar ’re como otra palabra rompe la forma breve.",
    ],
    [
      "Isn’t contiene is + not y aren’t contiene are + not.",
      "Elige isn’t con he/she/it y aren’t con you/we/they.",
      "No añadas otro not ni intercambies las formas singular y plural.",
    ],
    [
      "Cada sujeto selecciona una forma concreta de be en presente.",
      "Recorre la tabla: I am; you/we/they are; he/she/it is.",
      "Una sola forma para todos produce errores como I is o they is.",
    ],
    [
      "La intención decide entre afirmación, negación y pregunta.",
      "Comprueba sujeto, forma de be y posición de not antes de cerrar la frase.",
      "No aceptes una frase solo por sus palabras: el orden también debe expresar la intención.",
    ],
  ],
  "pt-BR": [
    [
      "We inclui quem fala dentro do grupo.",
      "Ligue we somente a are antes do estado ou lugar.",
      "We is quebra a concordância e deixa de formar o presente normal.",
    ],
    [
      "They pode apontar várias pessoas ou vários objetos.",
      "Mantenha they + are e expresse no plural aquilo que é identificado.",
      "Não traduza objetos como pessoas nem troque are por is.",
    ],
    [
      "Not nega o estado do grupo, não a existência do grupo.",
      "Coloque not imediatamente depois de are em we/they + are + not.",
      "Levar not para antes de are destrói a ordem da negação inglesa.",
    ],
    [
      "Are no início transforma uma informação sobre o grupo em pergunta.",
      "Monte Are + we/they + descrição e feche com ponto de interrogação.",
      "We are informa; Are we pergunta: manter a ordem afirmativa muda a intenção.",
    ],
    [
      "We’re e they’re preservam integralmente we are e they are.",
      "O apóstrofo marca a união do pronome com are em um bloco sonoro.",
      "Apagar o apóstrofo ou tratar ’re como outra palavra quebra a forma curta.",
    ],
    [
      "Isn’t contém is + not e aren’t contém are + not.",
      "Use isn’t com he/she/it e aren’t com you/we/they.",
      "Não acrescente outro not nem troque as formas singular e plural.",
    ],
    [
      "Cada sujeito escolhe uma forma específica de be no presente.",
      "Percorra a tabela: I am; you/we/they are; he/she/it is.",
      "Uma única forma para todos cria erros como I is ou they is.",
    ],
    [
      "A intenção decide entre afirmação, negação e pergunta.",
      "Confira sujeito, forma de be e posição de not antes de concluir a frase.",
      "Não aceite uma frase só pelas palavras: a ordem também precisa expressar a intenção.",
    ],
  ],
  vi: [
    [
      "We bao gồm chính người đang nói trong một nhóm.",
      "Chỉ ghép we với are trước trạng thái hoặc nơi chốn.",
      "We is sai hòa hợp nên không tạo được câu hiện tại tự nhiên.",
    ],
    [
      "They có thể chỉ nhiều người hoặc nhiều đồ vật.",
      "Giữ mẫu they + are và bảo toàn nghĩa số nhiều của phần nhận diện.",
      "Không biến đồ vật thành người và không thay are bằng is.",
    ],
    [
      "Not phủ định trạng thái của nhóm chứ không xóa nhóm đó.",
      "Đặt not ngay sau are trong mẫu we/they + are + not.",
      "Đưa not lên trước are sẽ phá vỡ trật tự phủ định tiếng Anh.",
    ],
    [
      "Are đứng đầu biến thông tin về nhóm thành câu hỏi.",
      "Dùng Are + we/they + phần miêu tả rồi đặt dấu hỏi ở cuối.",
      "We are kể một sự việc; Are we hỏi, nên giữ trật tự câu kể sẽ đổi mục đích.",
    ],
    [
      "We’re và they’re giữ nguyên nghĩa của we are và they are.",
      "Dấu nháy cho biết đại từ và are được nói thành một cụm.",
      "Bỏ dấu nháy hoặc xem ’re là từ khác sẽ làm hỏng dạng rút gọn.",
    ],
    [
      "Isn’t chứa is + not, còn aren’t chứa are + not.",
      "Dùng isn’t với he/she/it và aren’t với you/we/they.",
      "Không thêm một not nữa và không đổi chỗ dạng số ít với số nhiều.",
    ],
    [
      "Mỗi chủ ngữ chọn một dạng be cụ thể ở hiện tại.",
      "Đọc đủ bảng: I am; you/we/they are; he/she/it is.",
      "Dùng một dạng cho mọi chủ ngữ tạo lỗi như I is hoặc they is.",
    ],
    [
      "Mục đích quyết định câu khẳng định, phủ định hay câu hỏi.",
      "Kiểm tra chủ ngữ, dạng be và vị trí not trước khi hoàn tất câu.",
      "Đừng chỉ nhìn đủ từ: trật tự cũng phải truyền đúng mục đích.",
    ],
  ],
  id: [
    [
      "We memasukkan penutur ke dalam kelompok yang dibicarakan.",
      "Pasangkan we hanya dengan are sebelum keadaan atau tempat.",
      "We is merusak kesesuaian dan tidak membentuk pernyataan kini yang wajar.",
    ],
    [
      "They dapat menunjuk beberapa orang atau beberapa benda.",
      "Pertahankan pola they + are dan makna jamak pada hal yang dikenali.",
      "Jangan mengubah benda menjadi orang atau mengganti are dengan is.",
    ],
    [
      "Not menyangkal keadaan kelompok, bukan menghapus kelompoknya.",
      "Taruh not tepat setelah are dalam pola we/they + are + not.",
      "Memindahkan not ke depan are merusak urutan penyangkalan bahasa Inggris.",
    ],
    [
      "Are di awal mengubah informasi tentang kelompok menjadi pertanyaan.",
      "Susun Are + we/they + keterangan lalu akhiri dengan tanda tanya.",
      "We are memberi informasi; Are we bertanya, jadi urutan pernyataan mengubah maksud.",
    ],
    [
      "We’re dan they’re mempertahankan seluruh arti we are dan they are.",
      "Apostrof menandai penyatuan kata ganti dengan are dalam satu blok bunyi.",
      "Menghapus apostrof atau menganggap ’re sebagai kata lain merusak bentuk singkat.",
    ],
    [
      "Isn’t memuat is + not dan aren’t memuat are + not.",
      "Pakai isn’t dengan he/she/it dan aren’t dengan you/we/they.",
      "Jangan menambah not lagi atau menukar bentuk tunggal dan jamak.",
    ],
    [
      "Setiap subjek memilih satu bentuk be tertentu pada masa kini.",
      "Periksa tabel lengkap: I am; you/we/they are; he/she/it is.",
      "Satu bentuk untuk semua menghasilkan kesalahan seperti I is atau they is.",
    ],
    [
      "Maksud menentukan pernyataan, penyangkalan, atau pertanyaan.",
      "Periksa subjek, bentuk be, dan posisi not sebelum menuntaskan kalimat.",
      "Jangan menilai dari kumpulan kata saja: urutannya juga harus menyampaikan maksud.",
    ],
  ],
  tr: [
    [
      "We, konuşanı anlatılan grubun içine alır.",
      "Durum ya da yerden önce we ile yalnızca are biçimini eşleştirin.",
      "We is kişi uyumunu bozar ve doğal bir şimdiki bildirim kurmaz.",
    ],
    [
      "They birden çok kişiyi ya da birden çok nesneyi gösterebilir.",
      "They + are kalıbını ve tanımlanan şeyin çoğul anlamını koruyun.",
      "Nesneleri kişi gibi çevirmeyin ve are yerine is koymayın.",
    ],
    [
      "Not grubun durumunu olumsuz yapar; grubun kendisini silmez.",
      "Not biçimini we/they + are + not kalıbında are sonrasına koyun.",
      "Not biçimini are önüne taşımak İngilizce olumsuzluk sırasını bozar.",
    ],
    [
      "Baştaki Are, grup hakkındaki bilgiyi soruya dönüştürür.",
      "Are + we/they + açıklama kalıbını kurup soru işaretiyle bitirin.",
      "We are bilgi verir; Are we sorar, dolayısıyla bildirim sırası amacı değiştirir.",
    ],
    [
      "We’re ile they’re, we are ve they are anlamını bütünüyle korur.",
      "Kesme işareti zamir ile are biçiminin tek ses bloğunda birleştiğini gösterir.",
      "Kesme işaretini silmek ya da ’re parçasını başka sözcük sanmak kısa biçimi bozar.",
    ],
    [
      "Isn’t, is + not; aren’t ise are + not içerir.",
      "He/she/it ile isn’t; you/we/they ile aren’t seçin.",
      "İkinci bir not eklemeyin, tekil ve çoğul biçimleri yer değiştirmeyin.",
    ],
    [
      "Her özne şimdiki zamanda belirli bir be biçimi seçer.",
      "Tüm tabloyu izleyin: I am; you/we/they are; he/she/it is.",
      "Herkese tek biçim vermek I is veya they is gibi hatalar üretir.",
    ],
    [
      "Amaç bildirim, olumsuzluk ve soru arasındaki seçimi belirler.",
      "Cümleyi bitirmeden özneyi, be biçimini ve not konumunu denetleyin.",
      "Yalnız sözcüklerin varlığı yetmez; sıra da amacı doğru aktarmalıdır.",
    ],
  ],
  pl: [
    [
      "We obejmuje osobę mówiącą w opisywanej grupie.",
      "Łącz we wyłącznie z are przed stanem albo miejscem.",
      "We is łamie zgodę i nie tworzy naturalnego zdania w teraźniejszości.",
    ],
    [
      "They może wskazywać kilka osób albo kilka przedmiotów.",
      "Zachowaj wzór they + are oraz liczbę mnogą rozpoznawanych rzeczy.",
      "Nie tłumacz przedmiotów jak osób i nie zamieniaj are na is.",
    ],
    [
      "Not przeczy stanowi grupy, a nie usuwa samej grupy.",
      "Umieść not bezpośrednio po are we wzorze we/they + are + not.",
      "Przeniesienie not przed are niszczy angielski szyk przeczenia.",
    ],
    [
      "Are na początku zamienia informację o grupie w pytanie.",
      "Zbuduj Are + we/they + opis i zakończ znakiem zapytania.",
      "We are informuje, Are we pyta; zachowanie szyku oznajmującego zmienia intencję.",
    ],
    [
      "We’re i they’re zachowują pełny sens we are i they are.",
      "Apostrof oznacza połączenie zaimka z are w jeden blok brzmieniowy.",
      "Usunięcie apostrofu albo uznanie ’re za inne słowo niszczy skrót.",
    ],
    [
      "Isn’t zawiera is + not, a aren’t zawiera are + not.",
      "Wybierz isn’t dla he/she/it, a aren’t dla you/we/they.",
      "Nie dodawaj drugiego not i nie zamieniaj formy pojedynczej z mnogą.",
    ],
    [
      "Każdy podmiot wybiera określoną formę be w teraźniejszości.",
      "Przejdź całą tabelę: I am; you/we/they are; he/she/it is.",
      "Jedna forma dla wszystkich tworzy błędy takie jak I is albo they is.",
    ],
    [
      "Intencja rozstrzyga między twierdzeniem, przeczeniem i pytaniem.",
      "Sprawdź podmiot, formę be oraz pozycję not przed zakończeniem zdania.",
      "Nie wystarczy komplet słów: również szyk musi przekazywać właściwą intencję.",
    ],
  ],
};

function introBody(
  locale: Locale,
  ordinal: number,
  kind: "concept" | "formula" | "trap",
  target: string,
): string {
  const index = ordinal - 25;
  const native = meaning(locale, target);
  const kindIndex = kind === "concept" ? 0 : kind === "formula" ? 1 : 2;
  const example: Record<Locale, string> = {
    ru: `На фразе «${target}» это видно буквально: она означает «${native}». Для этого примера порядок слов передаёт точное намерение говорящего.`,
    uk: `Наприклад, «${target}» означає «${native}». Кожне англійське слово займає місце, що передає саме цей намір.`,
    es: `Por ejemplo, «${target}» significa «${native}». Cada palabra inglesa ocupa la posición que expresa exactamente esa intención.`,
    "pt-BR": `Por exemplo, «${target}» significa «${native}». Cada palavra inglesa ocupa a posição que expressa exatamente essa intenção.`,
    vi: `Ví dụ, «${target}» có nghĩa là «${native}». Mỗi từ tiếng Anh đứng ở vị trí truyền đúng mục đích đó.`,
    id: `Contohnya, «${target}» berarti «${native}». Setiap kata Inggris berada pada posisi yang menyampaikan maksud itu secara tepat.`,
    tr: `Örneğin «${target}», «${native}» demektir. Her İngilizce sözcük tam bu amacı taşıyan konumda durur.`,
    pl: `Na przykład „${target}” znaczy „${native}”. Każde angielskie słowo stoi w miejscu, które przekazuje właśnie tę intencję.`,
  };
  const alternative = wrongs(target)[0];
  const contrast: Record<Locale, readonly string[]> = {
    ru: [
      `Сравните с «${alternative}»: be не является личной формой для we, поэтому связь группы с признаком пропадает.`,
      `Сравните с «${alternative}»: be не показывает согласование с they и не создаёт готовое утверждение о нескольких участниках.`,
      `Сравните с «${alternative}»: неличная be не заменяет are, а положение not больше не строит нормальное отрицание.`,
      `Сравните с «${alternative}»: is не согласуется с we/they, поэтому вопрос о группе разваливается уже в начале.`,
      `Сравните с «${alternative}»: такая запись теряет сокращение we’re/they’re и его слышимый апострофный стык.`,
      `Сравните с «${alternative}»: разложенная неверная связка не передаёт правильную форму isn’t/aren’t вместе с отрицанием.`,
      `Сравните с «${alternative}»: be не выбирает форму по местоимению, а проверка требует точного am, are или is.`,
      `Сравните с «${alternative}»: слова похожи, но неличная be не завершает ни выбранную форму, ни намерение сообщения.`,
    ],
    uk: [
      `Порівняйте з «${alternative}»: be не є особовою формою для we, тому зв’язок групи з ознакою зникає.`,
      `Порівняйте з «${alternative}»: be не показує узгодження з they і не створює готового твердження про кількох учасників.`,
      `Порівняйте з «${alternative}»: неособова be не замінює are, а позиція not уже не будує правильного заперечення.`,
      `Порівняйте з «${alternative}»: is не узгоджується з we/they, тому питання про групу ламається від початку.`,
      `Порівняйте з «${alternative}»: такий запис втрачає скорочення we’re/they’re і апострофний звуковий стик.`,
      `Порівняйте з «${alternative}»: розкладена хибна зв’язка не передає правильне isn’t/aren’t разом із запереченням.`,
      `Порівняйте з «${alternative}»: be не обирає форму за займенником, а тут потрібне точне am, are або is.`,
      `Порівняйте з «${alternative}»: слова схожі, але неособова be не завершує ні форму, ні намір вислову.`,
    ],
    es: [
      `Compáralo con «${alternative}»: be no es la forma personal de we, por eso desaparece la unión con la descripción.`,
      `Compáralo con «${alternative}»: be no concuerda con they ni produce una afirmación completa sobre varios participantes.`,
      `Compáralo con «${alternative}»: be no sustituye a are y la posición de not deja de construir una negación normal.`,
      `Compáralo con «${alternative}»: is no concuerda con we/they, así que la pregunta sobre el grupo falla desde el inicio.`,
      `Compáralo con «${alternative}»: esa escritura pierde la contracción we’re/they’re y la unión marcada por el apóstrofo.`,
      `Compáralo con «${alternative}»: la cópula desplegada de forma incorrecta no conserva isn’t/aren’t con su negación.`,
      `Compáralo con «${alternative}»: be no elige una forma según el pronombre; hace falta am, are o is.`,
      `Compáralo con «${alternative}»: las palabras se parecen, pero be no completa ni la forma ni la intención elegida.`,
    ],
    "pt-BR": [
      `Compare com «${alternative}»: be não é a forma pessoal de we, por isso a ligação com a descrição desaparece.`,
      `Compare com «${alternative}»: be não concorda com they nem forma uma afirmação completa sobre vários participantes.`,
      `Compare com «${alternative}»: be não substitui are e a posição de not deixa de criar uma negação normal.`,
      `Compare com «${alternative}»: is não concorda com we/they, então a pergunta sobre o grupo falha desde o começo.`,
      `Compare com «${alternative}»: essa escrita perde a contração we’re/they’re e a união marcada pelo apóstrofo.`,
      `Compare com «${alternative}»: a cópula aberta de modo incorreto não preserva isn’t/aren’t com sua negação.`,
      `Compare com «${alternative}»: be não escolhe uma forma conforme o pronome; é preciso am, are ou is.`,
      `Compare com «${alternative}»: as palavras se parecem, mas be não completa nem a forma nem a intenção escolhida.`,
    ],
    vi: [
      `So với «${alternative}»: be không phải dạng chia cho we nên mối nối với phần miêu tả bị mất.`,
      `So với «${alternative}»: be không hòa hợp với they và không tạo câu hoàn chỉnh về nhiều người hoặc vật.`,
      `So với «${alternative}»: be không thay được are, còn vị trí not không tạo ra phủ định tự nhiên.`,
      `So với «${alternative}»: is không đi với we/they nên câu hỏi về nhóm sai ngay từ đầu.`,
      `So với «${alternative}»: cách viết đó làm mất dạng rút gọn we’re/they’re và mối nối bằng dấu nháy.`,
      `So với «${alternative}»: cách tách sai không giữ được isn’t/aren’t cùng nghĩa phủ định bên trong.`,
      `So với «${alternative}»: be không chọn dạng theo đại từ; cần đúng am, are hoặc is.`,
      `So với «${alternative}»: các từ có vẻ gần nhau nhưng be không hoàn tất dạng hay mục đích đã chọn.`,
    ],
    id: [
      `Bandingkan dengan «${alternative}»: be bukan bentuk personal untuk we sehingga hubungan dengan keterangan hilang.`,
      `Bandingkan dengan «${alternative}»: be tidak sesuai dengan they dan tidak membentuk pernyataan lengkap tentang beberapa pelaku.`,
      `Bandingkan dengan «${alternative}»: be tidak menggantikan are dan posisi not tidak lagi membentuk penyangkalan wajar.`,
      `Bandingkan dengan «${alternative}»: is tidak sesuai dengan we/they sehingga pertanyaan tentang kelompok salah sejak awal.`,
      `Bandingkan dengan «${alternative}»: tulisan itu menghilangkan kontraksi we’re/they’re dan sambungan apostrofnya.`,
      `Bandingkan dengan «${alternative}»: bentuk yang dibuka secara keliru tidak mempertahankan isn’t/aren’t beserta penyangkalannya.`,
      `Bandingkan dengan «${alternative}»: be tidak memilih bentuk menurut kata ganti; diperlukan am, are, atau is.`,
      `Bandingkan dengan «${alternative}»: katanya tampak mirip, tetapi be tidak menuntaskan bentuk maupun maksud yang dipilih.`,
    ],
    tr: [
      `«${alternative}» ile karşılaştırın: be, we için çekimli biçim değildir; bu yüzden açıklamayla bağ kaybolur.`,
      `«${alternative}» ile karşılaştırın: be, they ile uyum göstermez ve birden çok katılımcı hakkında tamamlanmış bildirim kurmaz.`,
      `«${alternative}» ile karşılaştırın: be, are yerine geçmez; not konumu da doğal olumsuzluk kurmaz.`,
      `«${alternative}» ile karşılaştırın: is, we/they ile uyuşmaz; grup hakkındaki soru daha başta bozulur.`,
      `«${alternative}» ile karşılaştırın: bu yazım we’re/they’re kısaltmasını ve kesme işaretli birleşmeyi kaybeder.`,
      `«${alternative}» ile karşılaştırın: yanlış açılan bağlayıcı isn’t/aren’t biçimini içindeki olumsuzlukla korumaz.`,
      `«${alternative}» ile karşılaştırın: be zamire göre biçim seçmez; doğru am, are veya is gerekir.`,
      `«${alternative}» ile karşılaştırın: sözcükler benzer görünür, fakat be ne seçilen biçimi ne amacı tamamlar.`,
    ],
    pl: [
      `Porównaj z „${alternative}”: be nie jest formą osobową dla we, więc znika połączenie z opisem.`,
      `Porównaj z „${alternative}”: be nie zgadza się z they i nie tworzy pełnego zdania o kilku uczestnikach.`,
      `Porównaj z „${alternative}”: be nie zastępuje are, a pozycja not przestaje tworzyć naturalne przeczenie.`,
      `Porównaj z „${alternative}”: is nie zgadza się z we/they, więc pytanie o grupę jest błędne od początku.`,
      `Porównaj z „${alternative}”: taki zapis gubi skrót we’re/they’re i połączenie zaznaczone apostrofem.`,
      `Porównaj z „${alternative}”: błędnie rozwinięty łącznik nie zachowuje isn’t/aren’t wraz z przeczeniem.`,
      `Porównaj z „${alternative}”: be nie wybiera formy według zaimka; potrzebne jest dokładne am, are albo is.`,
      `Porównaj z „${alternative}”: słowa wyglądają podobnie, lecz be nie domyka ani formy, ani wybranej intencji.`,
    ],
  };
  const form = kind === "trap" ? TRAPS[locale][index] : FORMULAS[locale][index];
  return `${TOPICS[locale][index]} ${INTRO_FOCUS[locale][index][kindIndex]} ${form} ${example[locale]} ${contrast[locale][index]}`;
}

function runs(body: LocalizedSource, target: string): LocalizedIntroRunsSource {
  return Object.fromEntries(
    LOCALES.map((locale) => {
      const text = body[locale] ?? "";
      const index = text.indexOf(target);
      return [
        locale,
        index < 0
          ? [{ text, semantic: "explanation" as const }]
          : [
              { text: text.slice(0, index), semantic: "explanation" as const },
              { text: target, semantic: "targetCorrect" as const },
              {
                text: text.slice(index + target.length),
                semantic: "explanation" as const,
              },
            ],
      ];
    }),
  ) as unknown as LocalizedIntroRunsSource;
}
function wrongs(target: string): readonly [string, string] {
  if (target.endsWith("?")) {
    const parts = target.match(/^Are\s+(we|they)\s+(.+)\?$/iu);
    if (parts)
      return [
        `Is ${parts[1]} ${parts[2]}?`,
        `Are ${parts[1].toLowerCase() === "we" ? "they" : "we"} ${parts[2]}?`,
      ];
  }
  const full = tokenise(target).join(" ");
  return [
    full.replace(/\b(am|are|is)\b/u, "be"),
    target.endsWith("?")
      ? full.replace(/^Are\s/u, "").replace(/\?$/u, "?")
      : full.includes("not")
        ? full.replace(" not", "")
        : `${full} not.`,
  ];
}
export function buildEpisode01Session25To32(
  ordinal: 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32,
): SessionSource {
  const target = PHRASES[ordinal][0];
  const title = L((locale) => TITLES[locale][ordinal - 25]);
  const introTargets = PHRASES[ordinal].slice(0, 3);
  const introPages = (["concept", "formula", "trap"] as const).map(
    (kind, index) => {
      const pageTarget = introTargets[index];
      const [firstWrong, secondWrong] = wrongs(pageTarget);
      const pageBody = L((locale) =>
        introBody(locale, ordinal, kind, pageTarget),
      );
      const pageTitle = L(
        (locale) =>
          `${title[locale]} — ${kind === "concept" ? ({ ru: "Кого описываем", uk: "Кого описуємо", es: "A quién describimos", "pt-BR": "Quem descrevemos", vi: "Ta đang nói về ai", id: "Siapa yang dijelaskan", tr: "Kimi anlatıyoruz", pl: "Kogo opisujemy" } as Record<Locale, string>)[locale] : kind === "formula" ? ({ ru: "Точный порядок", uk: "Точний порядок", es: "El orden exacto", "pt-BR": "A ordem exata", vi: "Trật tự chính xác", id: "Urutan yang tepat", tr: "Kesin sıra", pl: "Dokładny szyk" } as Record<Locale, string>)[locale] : ({ ru: "Где легко ошибиться", uk: "Де легко помилитися", es: "Dónde es fácil fallar", "pt-BR": "Onde é fácil errar", vi: "Chỗ dễ sai", id: "Bagian yang mudah keliru", tr: "Kolay hata noktası", pl: "Łatwa pułapka" } as Record<Locale, string>)[locale]}`,
      );
      return {
        kind,
        title: pageTitle,
        body: pageBody,
        bodyRuns: runs(pageBody, pageTarget),
        question: {
          prompt: L((locale) =>
            quizPrompt(locale, meaning(locale, pageTarget)),
          ),
          choices: [
            L(() => pageTarget),
            L(() => firstWrong),
            L(() => secondWrong),
          ],
          correctChoiceIndex: 0 as const,
          explanation: L((locale) => answerExplanation(locale, pageTarget)),
        },
      };
    },
  ) as unknown as SessionSource["introPages"];
  return {
    packageId: "learning-v2-en-v1",
    targetLanguage: "en",
    episodeOrdinal: 1,
    requiredSessionOrdinal: ordinal,
    canDoOutcomeId: "obj-e01-full-present-to-be",
    generationInputFingerprint: `authored-e01-s${ordinal}-v1`,
    title,
    summary: L((locale) => TOPICS[locale][ordinal - 25]),
    learningGoal: L((locale) => TOPICS[locale][ordinal - 25]),
    introPages,
    phrases: PHRASES[ordinal].map((english, index) =>
      phrase(ordinal, index, english),
    ),
  };
}
function answerExplanation(locale: Locale, english: string): string {
  const native = meaning(locale, english);
  return (
    {
      ru: `Верно: «${english}» значит «${native}». Форма и порядок соответствуют этой мысли.`,
      uk: `Правильно: «${english}» означає «${native}». Форма й порядок відповідають цій думці.`,
      es: `Correcto: «${english}» significa «${native}». La forma y el orden expresan esa idea.`,
      "pt-BR": `Certo: «${english}» significa «${native}». A forma e a ordem expressam essa ideia.`,
      vi: `Đúng: «${english}» có nghĩa là «${native}». Hình thức và trật tự diễn đạt đúng ý đó.`,
      id: `Benar: «${english}» berarti «${native}». Bentuk dan urutannya menyatakan makna itu.`,
      tr: `Doğru: «${english}», «${native}» demektir. Biçim ve sıra bu anlamı verir.`,
      pl: `Dobrze: „${english}” znaczy „${native}”. Forma i szyk wyrażają tę myśl.`,
    } as Record<Locale, string>
  )[locale];
}
export function assertEpisode01Sessions25To32Contract(
  sources: readonly SessionSource[],
): void {
  const chapter = sources.filter(
    (source) =>
      source.requiredSessionOrdinal >= 25 &&
      source.requiredSessionOrdinal <= 32,
  );
  expect(chapter.map((source) => source.requiredSessionOrdinal)).toEqual([
    25, 26, 27, 28, 29, 30, 31, 32,
  ]);
  chapter.forEach((source) => {
    expect(source.phrases).toHaveLength(15);
    expect(new Set(source.phrases.map((item) => item.english)).size).toBe(15);
    expect(KINDS[source.requiredSessionOrdinal]).toBeTruthy();
  });
}
