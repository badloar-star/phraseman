import type {
  EpisodeSourcePhrase,
  EpisodeSourcePhraseLocalizedDetails,
} from "./episode_01_source_v1";
import {
  AUTHORED_INTROS_33_TO_40,
  type AuthoredIntroPage33To40,
} from "./episode_01_sessions_33_40_intro_data_v1";
import {
  episode01TokenGloss,
  type Episode01FeedbackLocale,
} from "./episode_01_sessions_33_40_token_semantics_v1";
import type { SessionKind } from "./episode_01_session_map_v1";
import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
  SessionSource,
} from "./session_shard_from_source_v1";

type Locale = "ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";
type Owner = "my" | "your" | "his" | "her";
type FamilyNoun = "mother" | "father" | "sister" | "brother";
type PossessiveNoun = FamilyNoun | "book" | "bag" | "cup" | "key";
const LOCALES: readonly Locale[] = [
  "ru",
  "uk",
  "es",
  "pt-BR",
  "vi",
  "id",
  "tr",
  "pl",
];

const tokens = (english: string): string[] =>
  english.replace(/[?.!]/gu, "").split(/\s+/u).filter(Boolean);

function genderedPossessive(
  locale: Locale,
  owner: Owner,
  noun: PossessiveNoun,
): string {
  const feminineByLocale = {
    ru: new Set<PossessiveNoun>(["mother", "sister", "bag", "cup"]),
    uk: new Set<PossessiveNoun>(["mother", "sister", "book", "bag", "cup"]),
    "pt-BR": new Set<PossessiveNoun>(["mother", "sister", "bag", "cup", "key"]),
    pl: new Set<PossessiveNoun>(["mother", "sister", "book", "bag"]),
  } as const;
  if (locale === "ru") {
    if (owner === "his") return "его";
    if (owner === "her") return "её";
    const feminine = feminineByLocale.ru.has(noun);
    return owner === "my"
      ? feminine
        ? "моя"
        : "мой"
      : feminine
        ? "твоя"
        : "твой";
  }
  if (locale === "uk") {
    if (owner === "his") return "його";
    if (owner === "her") return "її";
    const feminine = feminineByLocale.uk.has(noun);
    return owner === "my"
      ? feminine
        ? "моя"
        : "мій"
      : feminine
        ? "твоя"
        : "твій";
  }
  if (locale === "pt-BR") {
    const feminine = feminineByLocale["pt-BR"].has(noun);
    if (owner === "my") return feminine ? "minha" : "meu";
    return feminine ? "sua" : "seu";
  }
  if (locale === "pl") {
    if (owner === "his") return "jego";
    if (owner === "her") return "jej";
    const feminine = feminineByLocale.pl.has(noun);
    return owner === "my"
      ? feminine
        ? "moja"
        : "mój"
      : feminine
        ? "twoja"
        : "twój";
  }
  return ({ my: "my", your: "your", his: "his", her: "her" } as const)[owner];
}

const BANK: Record<string, readonly string[]> = {
  "question-word": ["what", "where", "who", "how", "which", "when"],
  "to-be": ["am", "are", "is", "was", "be", "were"],
  possessive: ["my", "your", "his", "her", "our", "their"],
  demonstrative: ["this", "that", "these", "those", "it", "they"],
  pronoun: ["I", "you", "he", "she", "it", "we", "they"],
  article: ["a", "an", "the", "this", "that", "my"],
  negation: ["not", "very", "also", "too", "really", "quite"],
  object: ["book", "bag", "cup", "key", "phone", "pen"],
  family: ["mother", "father", "sister", "brother", "friend", "parent"],
  location: ["here", "home", "outside", "inside", "nearby", "away"],
  state: ["ready", "calm", "fine", "happy", "busy", "tired", "okay"],
};
const alternatives = (word: string): readonly string[] =>
  (BANK[category(word)] ?? BANK.object)
    .filter((item) => item.toLowerCase() !== word.toLowerCase())
    .slice(0, 5);
const category = (word: string): string =>
  /^(what|where|who|how)$/iu.test(word)
    ? "question-word"
    : /^(is|are|am)$/iu.test(word)
      ? "to-be"
      : /^(my|your|his|her)$/iu.test(word)
        ? "possessive"
        : /^(this|that)$/iu.test(word)
          ? "demonstrative"
          : /^(I|he|she|it|you|we|they)$/iu.test(word)
            ? "pronoun"
            : /^a$/iu.test(word)
              ? "article"
              : /^not$/iu.test(word)
                ? "negation"
                : /^(book|bag|cup|key)$/iu.test(word)
                  ? "object"
                  : /^(mother|father|sister|brother)$/iu.test(word)
                    ? "family"
                    : /^(here|home)$/iu.test(word)
                      ? "location"
                      : /^(ready|calm|fine|happy|busy|tired|okay)$/iu.test(word)
                        ? "state"
                        : "object";
const NEGATIVE_MEANINGS: Record<Locale, Record<string, string>> = {
  ru: {
    "He is not ready.": "Он не готов.",
    "She is not here.": "Её здесь нет.",
    "They are not busy.": "Они не заняты.",
  },
  uk: {
    "He is not ready.": "Він не готовий.",
    "She is not here.": "Її тут немає.",
    "They are not busy.": "Вони не зайняті.",
  },
  es: {
    "He is not ready.": "Él no está listo.",
    "She is not here.": "Ella no está aquí.",
    "They are not busy.": "No están ocupados.",
  },
  "pt-BR": {
    "He is not ready.": "Ele não está pronto.",
    "She is not here.": "Ela não está aqui.",
    "They are not busy.": "Eles não estão ocupados.",
  },
  vi: {
    "He is not ready.": "Anh ấy chưa sẵn sàng.",
    "She is not here.": "Cô ấy không ở đây.",
    "They are not busy.": "Họ không bận.",
  },
  id: {
    "He is not ready.": "Dia belum siap.",
    "She is not here.": "Dia tidak di sini.",
    "They are not busy.": "Mereka tidak sibuk.",
  },
  tr: {
    "He is not ready.": "O hazır değil.",
    "She is not here.": "O burada değil.",
    "They are not busy.": "Onlar meşgul değiller.",
  },
  pl: {
    "He is not ready.": "On nie jest gotowy.",
    "She is not here.": "Jej tu nie ma.",
    "They are not busy.": "Oni nie są zajęci.",
  },
};
const nativeMeaning = (locale: Locale, english: string): string => {
  const familyIdentity = english.match(
    /^(He|She|This|That) is (my|your|his|her) (mother|father|sister|brother)\.$/u,
  );
  if (familyIdentity) {
    const [, subject, owner, family] = familyIdentity;
    const ownerKey = owner as Owner;
    const familyKey = family as FamilyNoun;
    const subjectMap: Record<Locale, Record<string, string>> = {
      ru: { He: "Он", She: "Она", This: "Это", That: "Это" },
      uk: { He: "Він", She: "Вона", This: "Це", That: "То" },
      es: { He: "Él", She: "Ella", This: "Esto", That: "Eso" },
      "pt-BR": { He: "Ele", She: "Ela", This: "Isto", That: "Aquilo" },
      vi: { He: "Anh ấy", She: "Cô ấy", This: "Đây", That: "Kia" },
      id: { He: "Dia", She: "Dia", This: "Ini", That: "Itu" },
      tr: { He: "O", She: "O", This: "Bu", That: "Şu" },
      pl: { He: "On", She: "Ona", This: "To", That: "Tamto" },
    };
    const noun: Record<Locale, Record<string, string>> = {
      ru: { mother: "мама", father: "папа", sister: "сестра", brother: "брат" },
      uk: { mother: "мама", father: "тато", sister: "сестра", brother: "брат" },
      es: {
        mother: "madre",
        father: "padre",
        sister: "hermana",
        brother: "hermano",
      },
      "pt-BR": {
        mother: "mãe",
        father: "pai",
        sister: "irmã",
        brother: "irmão",
      },
      vi: { mother: "mẹ", father: "bố", sister: "chị", brother: "anh" },
      id: {
        mother: "ibu",
        father: "ayah",
        sister: "saudari",
        brother: "saudara",
      },
      tr: {
        mother: "anne",
        father: "baba",
        sister: "kız kardeş",
        brother: "erkek kardeş",
      },
      pl: {
        mother: "mama",
        father: "tata",
        sister: "siostra",
        brother: "brat",
      },
    };
    const feminine = familyKey === "mother" || familyKey === "sister";
    const left = subjectMap[locale][subject];
    const possessive = {
      ru: {
        my: feminine ? "моя" : "мой",
        your: feminine ? "твоя" : "твой",
        his: "его",
        her: "её",
      },
      uk: {
        my: feminine ? "моя" : "мій",
        your: feminine ? "твоя" : "твій",
        his: "його",
        her: "її",
      },
      es: { my: "mi", your: "tu", his: "su", her: "su" },
      "pt-BR": {
        my: feminine ? "minha" : "meu",
        your: feminine ? "sua" : "seu",
        his: feminine ? "a" : "o",
        her: feminine ? "a" : "o",
      },
      vi: {
        my: "của tôi",
        your: "của bạn",
        his: "của anh ấy",
        her: "của cô ấy",
      },
      id: { my: "saya", your: "kamu", his: "dia", her: "dia" },
      tr: { my: "benim", your: "senin", his: "onun", her: "onun" },
      pl: {
        my: feminine ? "moja" : "mój",
        your: feminine ? "twoja" : "twój",
        his: "jego",
        her: "jej",
      },
    };
    const right = `${possessive[locale][ownerKey]} ${noun[locale][familyKey]}`;
    if (locale === "ru" || locale === "uk") return `${left} — ${right}.`;
    if (locale === "es") return `${left} es ${right}.`;
    if (locale === "pt-BR") {
      const owned = owner === "his" ? "dele" : owner === "her" ? "dela" : "";
      return `${left} é ${right}${owned ? ` ${owned}` : ""}.`;
    }
    if (locale === "vi")
      return `${left} là ${noun.vi[familyKey]} ${possessive.vi[ownerKey]}.`;
    if (locale === "id")
      return `${left} adalah ${noun.id[familyKey]} ${possessive.id[ownerKey]}.`;
    if (locale === "tr") return `${left}, ${right}.`;
    return `${left} to ${right}.`;
  }
  const familyIdentityQuestion = english.match(
    /^Is (this|that) (my|your|his|her) (mother|father|sister|brother)\?$/u,
  );
  if (familyIdentityQuestion) {
    const [, demonstrative, owner, family] = familyIdentityQuestion;
    const noun: Record<Locale, Record<string, string>> = {
      ru: { mother: "мама", father: "папа", sister: "сестра", brother: "брат" },
      uk: { mother: "мама", father: "тато", sister: "сестра", brother: "брат" },
      es: {
        mother: "madre",
        father: "padre",
        sister: "hermana",
        brother: "hermano",
      },
      "pt-BR": {
        mother: "mãe",
        father: "pai",
        sister: "irmã",
        brother: "irmão",
      },
      vi: { mother: "mẹ", father: "bố", sister: "chị", brother: "anh" },
      id: {
        mother: "ibu",
        father: "ayah",
        sister: "saudari",
        brother: "saudara",
      },
      tr: {
        mother: "anne",
        father: "baba",
        sister: "kız kardeş",
        brother: "erkek kardeş",
      },
      pl: {
        mother: "mama",
        father: "tata",
        sister: "siostra",
        brother: "brat",
      },
    };
    const possessive: Record<Locale, Record<string, string>> = {
      ru: { my: "моя", your: "твоя", his: "его", her: "её" },
      uk: { my: "моя", your: "твоя", his: "його", her: "її" },
      es: { my: "mi", your: "tu", his: "su", her: "su" },
      "pt-BR": { my: "minha", your: "sua", his: "sua", her: "sua" },
      vi: {
        my: "của tôi",
        your: "của bạn",
        his: "của anh ấy",
        her: "của cô ấy",
      },
      id: { my: "saya", your: "kamu", his: "dia", her: "dia" },
      tr: { my: "benim", your: "senin", his: "onun", her: "onun" },
      pl: { my: "moja", your: "twoja", his: "jego", her: "jej" },
    };
    const d: Record<Locale, string> = {
      ru: demonstrative === "this" ? "это" : "то",
      uk: demonstrative === "this" ? "це" : "то",
      es: demonstrative === "this" ? "esto" : "eso",
      "pt-BR": demonstrative === "this" ? "isto" : "aquilo",
      vi: demonstrative === "this" ? "đây" : "kia",
      id: demonstrative === "this" ? "ini" : "itu",
      tr: demonstrative === "this" ? "bu" : "şu",
      pl: demonstrative === "this" ? "to" : "tamto",
    };
    const ownerKey = owner as Owner;
    const familyKey = family as FamilyNoun;
    const prefix = ["ru", "uk", "pt-BR", "pl"].includes(locale)
      ? genderedPossessive(locale, ownerKey, familyKey)
      : possessive[locale][ownerKey];
    const subject = `${prefix} ${noun[locale][familyKey]}`;
    return (
      {
        ru: `Это ${subject}?`,
        uk: `Це ${subject}?`,
        es: `¿${d[locale]} es ${subject}?`,
        "pt-BR": `${d[locale][0].toUpperCase()}${d[locale].slice(1)} é ${subject}?`,
        vi: `${d[locale][0].toUpperCase()}${d[locale].slice(1)} là ${subject} phải không?`,
        id: `Apakah ${d[locale]} ${subject}?`,
        tr: `${d[locale]} ${subject} mı?`,
        pl: `Czy ${d[locale]} jest ${subject}?`,
      } as Record<Locale, string>
    )[locale];
  }
  const who = english.match(
    /^Who is (he|she|this|that|my|your|his|her)(?: (mother|father|sister|brother))?\?$/u,
  );
  if (who) {
    const [, subject, family] = who;
    const base: Record<Locale, Record<string, string>> = {
      ru: {
        he: "он",
        she: "она",
        this: "это",
        that: "это там",
        my: "моя",
        your: "твоя",
        his: "его",
        her: "её",
      },
      uk: {
        he: "він",
        she: "вона",
        this: "це",
        that: "це там",
        my: "моя",
        your: "твоя",
        his: "його",
        her: "її",
      },
      es: {
        he: "él",
        she: "ella",
        this: "esta persona",
        that: "esa persona",
        my: "mi",
        your: "tu",
        his: "su",
        her: "su",
      },
      "pt-BR": {
        he: "ele",
        she: "ela",
        this: "esta pessoa",
        that: "aquela pessoa",
        my: "minha",
        your: "sua",
        his: "sua",
        her: "sua",
      },
      vi: {
        he: "anh ấy",
        she: "cô ấy",
        this: "đây",
        that: "kia",
        my: "mẹ tôi",
        your: "mẹ bạn",
        his: "mẹ anh ấy",
        her: "mẹ cô ấy",
      },
      id: {
        he: "dia",
        she: "dia",
        this: "ini",
        that: "itu",
        my: "ibu saya",
        your: "ibu kamu",
        his: "ibunya",
        her: "ibunya",
      },
      tr: {
        he: "o",
        she: "o",
        this: "bu",
        that: "şu",
        my: "benim",
        your: "senin",
        his: "onun",
        her: "onun",
      },
      pl: {
        he: "on",
        she: "ona",
        this: "ta osoba",
        that: "tamta osoba",
        my: "moja",
        your: "twoja",
        his: "jego",
        her: "jej",
      },
    };
    const familyWord: Record<Locale, Record<string, string>> = {
      ru: { mother: "мама", father: "папа", sister: "сестра", brother: "брат" },
      uk: { mother: "мама", father: "тато", sister: "сестра", brother: "брат" },
      es: {
        mother: "madre",
        father: "padre",
        sister: "hermana",
        brother: "hermano",
      },
      "pt-BR": {
        mother: "mãe",
        father: "pai",
        sister: "irmã",
        brother: "irmão",
      },
      vi: { mother: "mẹ", father: "bố", sister: "chị", brother: "anh" },
      id: {
        mother: "ibu",
        father: "ayah",
        sister: "saudari",
        brother: "saudara",
      },
      tr: {
        mother: "anne",
        father: "baba",
        sister: "kız kardeş",
        brother: "erkek kardeş",
      },
      pl: {
        mother: "mama",
        father: "tata",
        sister: "siostra",
        brother: "brat",
      },
    };
    const name = family
      ? `${base[locale][subject]} ${familyWord[locale][family]}`
      : base[locale][subject];
    return (
      {
        ru: `Кто ${name}?`,
        uk: `Хто ${name}?`,
        es: `¿Quién es ${name}?`,
        "pt-BR": `Quem é ${name}?`,
        vi: `${name[0].toUpperCase()}${name.slice(1)} là ai?`,
        id: `${name[0].toUpperCase()}${name.slice(1)} siapa?`,
        tr: `${name[0].toUpperCase()}${name.slice(1)} kim?`,
        pl: `Kim ${name} jest?`,
      } as Record<Locale, string>
    )[locale];
  }
  const locationQuestion =
    english.match(/^Are (he|she|you|we|they) (here|home)\?$/u) ??
    english.match(/^Is (he|she) (here|home)\?$/u);
  if (locationQuestion) {
    const [, subject, place] = locationQuestion;
    const person: Record<Locale, Record<string, string>> = {
      ru: { he: "он", she: "она", you: "ты", we: "мы", they: "они" },
      uk: { he: "він", she: "вона", you: "ти", we: "ми", they: "вони" },
      es: { he: "él", she: "ella", you: "tú", we: "nosotros", they: "ellos" },
      "pt-BR": { he: "ele", she: "ela", you: "você", we: "nós", they: "eles" },
      vi: {
        he: "anh ấy",
        she: "cô ấy",
        you: "bạn",
        we: "chúng tôi",
        they: "họ",
      },
      id: { he: "dia", she: "dia", you: "kamu", we: "kami", they: "mereka" },
      tr: { he: "o", she: "o", you: "sen", we: "biz", they: "onlar" },
      pl: { he: "on", she: "ona", you: "ty", we: "my", they: "oni" },
    };
    const location: Record<Locale, Record<string, string>> = {
      ru: { here: "здесь", home: "дома" },
      uk: { here: "тут", home: "вдома" },
      es: { here: "aquí", home: "en casa" },
      "pt-BR": { here: "aqui", home: "em casa" },
      vi: { here: "ở đây", home: "ở nhà" },
      id: { here: "di sini", home: "di rumah" },
      tr: { here: "burada", home: "evde" },
      pl: { here: "tutaj", home: "w domu" },
    };
    const p = person[locale][subject];
    const l = location[locale][place];
    return (
      {
        ru: `${p[0].toUpperCase()}${p.slice(1)} ${l}?`,
        uk: `${p[0].toUpperCase()}${p.slice(1)} ${l}?`,
        es: `¿${p[0].toUpperCase()}${p.slice(1)} está ${l}?`,
        "pt-BR": `${p[0].toUpperCase()}${p.slice(1)} está ${l}?`,
        vi: `${p[0].toUpperCase()}${p.slice(1)} ${l} phải không?`,
        id: `Apakah ${p} ${l}?`,
        tr: `${p[0].toUpperCase()}${p.slice(1)} ${l} mı?`,
        pl: `Czy ${p} jest ${l}?`,
      } as Record<Locale, string>
    )[locale];
  }
  const demonstrativeWhere = english.match(
    /^Where is (this|that) (book|bag|cup|key)\?$/u,
  );
  if (demonstrativeWhere) {
    const [, demonstrative, noun] = demonstrativeWhere;
    const forms: Record<Locale, Record<string, string>> = {
      ru: { book: "книга", bag: "сумка", cup: "чашка", key: "ключ" },
      uk: { book: "книга", bag: "сумка", cup: "чашка", key: "ключ" },
      es: { book: "libro", bag: "bolsa", cup: "taza", key: "llave" },
      "pt-BR": { book: "livro", bag: "bolsa", cup: "xícara", key: "chave" },
      vi: {
        book: "quyển sách",
        bag: "cái túi",
        cup: "cái cốc",
        key: "chìa khóa",
      },
      id: { book: "buku", bag: "tas", cup: "cangkir", key: "kunci" },
      tr: { book: "kitap", bag: "çanta", cup: "fincan", key: "anahtar" },
      pl: { book: "książka", bag: "torba", cup: "kubek", key: "klucz" },
    };
    const d: Record<Locale, string> = {
      ru: demonstrative === "this" ? "эта" : "та",
      uk: demonstrative === "this" ? "ця" : "та",
      es: demonstrative === "this" ? "este" : "ese",
      "pt-BR": demonstrative === "this" ? "este" : "aquele",
      vi: demonstrative === "this" ? "quyển" : "cái kia",
      id: demonstrative === "this" ? "ini" : "itu",
      tr: demonstrative === "this" ? "bu" : "şu",
      pl: demonstrative === "this" ? "ta" : "tamta",
    };
    const subject = `${d[locale]} ${forms[locale][noun]}`;
    return (
      {
        ru: `Где ${subject}?`,
        uk: `Де ${subject}?`,
        es: `¿Dónde está ${subject}?`,
        "pt-BR": `Onde está ${subject}?`,
        vi: `${subject} ở đâu?`,
        id: `${subject[0].toUpperCase()}${subject.slice(1)} di mana?`,
        tr: `${subject} nerede?`,
        pl: `Gdzie ${subject} jest?`,
      } as Record<Locale, string>
    )[locale];
  }
  const possessiveWhere = english.match(
    /^Where is (my|your|his|her) (mother|father|sister|brother|book|bag|cup|key)\?$/u,
  );
  if (possessiveWhere) {
    const [, owner, noun] = possessiveWhere;
    const lex: Record<Locale, Record<string, string>> = {
      ru: {
        mother: "мама",
        father: "папа",
        sister: "сестра",
        brother: "брат",
        book: "книга",
        bag: "сумка",
        cup: "чашка",
        key: "ключ",
      },
      uk: {
        mother: "мама",
        father: "тато",
        sister: "сестра",
        brother: "брат",
        book: "книга",
        bag: "сумка",
        cup: "чашка",
        key: "ключ",
      },
      es: {
        mother: "madre",
        father: "padre",
        sister: "hermana",
        brother: "hermano",
        book: "libro",
        bag: "bolsa",
        cup: "taza",
        key: "llave",
      },
      "pt-BR": {
        mother: "mãe",
        father: "pai",
        sister: "irmã",
        brother: "irmão",
        book: "livro",
        bag: "bolsa",
        cup: "xícara",
        key: "chave",
      },
      vi: {
        mother: "mẹ",
        father: "bố",
        sister: "chị",
        brother: "anh",
        book: "sách",
        bag: "túi",
        cup: "cốc",
        key: "chìa khóa",
      },
      id: {
        mother: "ibu",
        father: "ayah",
        sister: "saudari",
        brother: "saudara",
        book: "buku",
        bag: "tas",
        cup: "cangkir",
        key: "kunci",
      },
      tr: {
        mother: "anne",
        father: "baba",
        sister: "kız kardeş",
        brother: "erkek kardeş",
        book: "kitap",
        bag: "çanta",
        cup: "fincan",
        key: "anahtar",
      },
      pl: {
        mother: "mama",
        father: "tata",
        sister: "siostra",
        brother: "brat",
        book: "książka",
        bag: "torba",
        cup: "kubek",
        key: "klucz",
      },
    };
    const possessive: Record<Locale, Record<string, string>> = {
      ru: { my: "моя", your: "твоя", his: "его", her: "её" },
      uk: { my: "моя", your: "твоя", his: "його", her: "її" },
      es: { my: "mi", your: "tu", his: "su", her: "su" },
      "pt-BR": { my: "minha", your: "sua", his: "seu", her: "sua" },
      vi: {
        my: "của tôi",
        your: "của bạn",
        his: "của anh ấy",
        her: "của cô ấy",
      },
      id: { my: "saya", your: "kamu", his: "dia", her: "dia" },
      tr: { my: "benim", your: "senin", his: "onun", her: "onun" },
      pl: { my: "moja", your: "twoja", his: "jego", her: "jej" },
    };
    const ownerKey = owner as Owner;
    const nounKey = noun as PossessiveNoun;
    const prefix = ["ru", "uk", "pt-BR", "pl"].includes(locale)
      ? genderedPossessive(locale, ownerKey, nounKey)
      : possessive[locale][ownerKey];
    const subject = `${prefix} ${lex[locale][nounKey]}`;
    return (
      {
        ru: `Где ${subject}?`,
        uk: `Де ${subject}?`,
        es: `¿Dónde está ${subject}?`,
        "pt-BR": `Onde está ${subject}?`,
        vi: `${lex[locale][nounKey][0].toUpperCase()}${lex[locale][nounKey].slice(1)} ${possessive[locale][ownerKey]} ở đâu?`,
        id: `${lex[locale][nounKey][0].toUpperCase()}${lex[locale][nounKey].slice(1)} ${possessive[locale][ownerKey]} di mana?`,
        tr: `${subject} nerede?`,
        pl: `Gdzie ${subject} jest?`,
      } as Record<Locale, string>
    )[locale];
  }
  const where = english.match(/^Where (?:is|are) (he|she|it|you|we|they)\?$/u);
  if (where) {
    const subject = where[1];
    const names: Record<Locale, Record<string, string>> = {
      ru: { he: "он", she: "она", it: "это", you: "ты", we: "мы", they: "они" },
      uk: {
        he: "він",
        she: "вона",
        it: "це",
        you: "ти",
        we: "ми",
        they: "вони",
      },
      es: {
        he: "él",
        she: "ella",
        it: "eso",
        you: "tú",
        we: "nosotros",
        they: "ellos",
      },
      "pt-BR": {
        he: "ele",
        she: "ela",
        it: "isso",
        you: "você",
        we: "nós",
        they: "eles",
      },
      vi: {
        he: "anh ấy",
        she: "cô ấy",
        it: "nó",
        you: "bạn",
        we: "chúng tôi",
        they: "họ",
      },
      id: {
        he: "dia",
        she: "dia",
        it: "itu",
        you: "kamu",
        we: "kami",
        they: "mereka",
      },
      tr: { he: "o", she: "o", it: "o", you: "sen", we: "biz", they: "onlar" },
      pl: { he: "on", she: "ona", it: "to", you: "ty", we: "my", they: "oni" },
    };
    const name = names[locale][subject];
    return (
      {
        ru: `Где ${name}?`,
        uk: `Де ${name}?`,
        es: `¿Dónde está ${name}?`,
        "pt-BR": `Onde ${name} está?`,
        vi: `${name[0].toUpperCase()}${name.slice(1)} ở đâu?`,
        id: `${name[0].toUpperCase()}${name.slice(1)} di mana?`,
        tr: `${name[0].toUpperCase()}${name.slice(1)} nerede?`,
        pl: `Gdzie ${name} jest?`,
      } as Record<Locale, string>
    )[locale];
  }
  const demonstrativeQuestion = english.match(
    /^Is (this|that) (?:(a) |(my|your|his|her) )?(book|bag|cup|key)\?$/iu,
  );
  if (demonstrativeQuestion) {
    const [, demonstrative, article, possessive, noun] = demonstrativeQuestion;
    const statement = `${demonstrative[0].toUpperCase()}${demonstrative.slice(1)} is ${article ? "a " : ""}${possessive ? `${possessive} ` : ""}${noun}.`;
    const base = nativeMeaning(locale, statement).replace(/[.]$/u, "");
    return (
      {
        ru: `${base}?`,
        uk: `${base}?`,
        es: `¿${base}?`,
        "pt-BR": `${base}?`,
        vi: `${base} phải không?`,
        id: `Apakah ${base.toLowerCase()}?`,
        tr: `${base} mı?`,
        pl: `Czy ${base.toLowerCase()}?`,
      } as Record<Locale, string>
    )[locale];
  }
  const how = english.match(/^How (?:is|are) (you|he|she|they)\?$/u);
  if (how) {
    const subject = how[1];
    return (
      {
        ru: {
          you: "Как ты?",
          he: "Как он?",
          she: "Как она?",
          they: "Как они?",
        },
        uk: { you: "Як ти?", he: "Як він?", she: "Як вона?", they: "Як вони?" },
        es: {
          you: "¿Cómo estás?",
          he: "¿Cómo está él?",
          she: "¿Cómo está ella?",
          they: "¿Cómo están ellos?",
        },
        "pt-BR": {
          you: "Como você está?",
          he: "Como ele está?",
          she: "Como ela está?",
          they: "Como eles estão?",
        },
        vi: {
          you: "Bạn thế nào?",
          he: "Anh ấy thế nào?",
          she: "Cô ấy thế nào?",
          they: "Họ thế nào?",
        },
        id: {
          you: "Apa kabar?",
          he: "Bagaimana dia?",
          she: "Bagaimana dia?",
          they: "Bagaimana mereka?",
        },
        tr: {
          you: "Nasılsın?",
          he: "O nasıl?",
          she: "O nasıl?",
          they: "Onlar nasıl?",
        },
        pl: {
          you: "Jak się masz?",
          he: "Jak on się czuje?",
          she: "Jak ona się czuje?",
          they: "Jak się czują?",
        },
      } as Record<Locale, Record<string, string>>
    )[locale][subject];
  }
  const stateStatement = english.match(
    /^(I|You|He|She|They) (?:am|are|is) (fine|okay|ready|calm|happy|busy)\.$/u,
  );
  if (stateStatement) {
    const [, subject, state] = stateStatement;
    const words: Record<Locale, Record<string, string>> = {
      ru: {
        fine: "в порядке",
        okay: "в порядке",
        ready: "готов",
        calm: "спокойна",
        happy: "счастливы",
        busy: "заняты",
      },
      uk: {
        fine: "у порядку",
        okay: "гаразд",
        ready: "готовий",
        calm: "спокійна",
        happy: "щасливі",
        busy: "зайняті",
      },
      es: {
        fine: "bien",
        okay: "bien",
        ready: "listo",
        calm: "tranquila",
        happy: "felices",
        busy: "ocupados",
      },
      "pt-BR": {
        fine: "bem",
        okay: "bem",
        ready: "pronto",
        calm: "calma",
        happy: "felizes",
        busy: "ocupados",
      },
      vi: {
        fine: "ổn",
        okay: "ổn",
        ready: "sẵn sàng",
        calm: "bình tĩnh",
        happy: "vui",
        busy: "bận",
      },
      id: {
        fine: "baik-baik saja",
        okay: "baik-baik saja",
        ready: "siap",
        calm: "tenang",
        happy: "senang",
        busy: "sibuk",
      },
      tr: {
        fine: "iyiyim",
        okay: "iyisin",
        ready: "hazır",
        calm: "sakin",
        happy: "mutlu",
        busy: "meşgul",
      },
      pl: {
        fine: "w porządku",
        okay: "w porządku",
        ready: "gotowy",
        calm: "spokojna",
        happy: "szczęśliwi",
        busy: "zajęci",
      },
    };
    const person: Record<Locale, Record<string, string>> = {
      ru: { I: "Я", You: "Ты", He: "Он", She: "Она", They: "Они" },
      uk: { I: "Я", You: "Ти", He: "Він", She: "Вона", They: "Вони" },
      es: {
        I: "Estoy",
        You: "Estás",
        He: "Él está",
        She: "Ella está",
        They: "Ellos están",
      },
      "pt-BR": {
        I: "Estou",
        You: "Você está",
        He: "Ele está",
        She: "Ela está",
        They: "Eles estão",
      },
      vi: { I: "Tôi", You: "Bạn", He: "Anh ấy", She: "Cô ấy", They: "Họ" },
      id: { I: "Saya", You: "Kamu", He: "Dia", She: "Dia", They: "Mereka" },
      tr: { I: "", You: "", He: "O", She: "O", They: "Onlar" },
      pl: {
        I: "Jestem",
        You: "Jesteś",
        He: "On jest",
        She: "Ona jest",
        They: "Oni są",
      },
    };
    const value = words[locale][state];
    if (locale === "tr")
      return `${words.tr[state][0].toUpperCase()}${words.tr[state].slice(1)}.`;
    return `${person[locale][subject]} ${value}.`;
  }
  const stateQuestion = english.match(
    /^(?:Is (he|she) |Are (you|they) )(tired|happy|ready|calm|busy)\?$/u,
  );
  if (stateQuestion) {
    const subject = stateQuestion[1] || stateQuestion[2];
    const state = stateQuestion[3];
    const person: Record<Locale, Record<string, string>> = {
      ru: { he: "Он", she: "Она", you: "Ты", they: "Они" },
      uk: { he: "Він", she: "Вона", you: "Ти", they: "Вони" },
      es: { he: "Él", she: "Ella", you: "Tú", they: "Ellos" },
      "pt-BR": { he: "Ele", she: "Ela", you: "Você", they: "Eles" },
      vi: { he: "Anh ấy", she: "Cô ấy", you: "Bạn", they: "Họ" },
      id: { he: "Dia", she: "Dia", you: "Kamu", they: "Mereka" },
      tr: { he: "O", she: "O", you: "Sen", they: "Onlar" },
      pl: { he: "On", she: "Ona", you: "Ty", they: "Oni" },
    };
    const value: Record<Locale, Record<string, string>> = {
      ru: {
        tired: "уставший",
        happy: "счастлива",
        ready: "готов",
        calm: "спокойны",
        busy: "заняты",
      },
      uk: {
        tired: "втомлений",
        happy: "щаслива",
        ready: "готовий",
        calm: "спокійні",
        busy: "зайняті",
      },
      es: {
        tired: "cansado",
        happy: "feliz",
        ready: "listo",
        calm: "tranquilos",
        busy: "ocupados",
      },
      "pt-BR": {
        tired: "cansado",
        happy: "feliz",
        ready: "pronto",
        calm: "calmos",
        busy: "ocupados",
      },
      vi: {
        tired: "mệt",
        happy: "vui",
        ready: "sẵn sàng",
        calm: "bình tĩnh",
        busy: "bận",
      },
      id: {
        tired: "lelah",
        happy: "senang",
        ready: "siap",
        calm: "tenang",
        busy: "sibuk",
      },
      tr: {
        tired: "yorgun",
        happy: "mutlu",
        ready: "hazır",
        calm: "sakin",
        busy: "meşgul",
      },
      pl: {
        tired: "zmęczony",
        happy: "szczęśliwa",
        ready: "gotowy",
        calm: "spokojni",
        busy: "zajęci",
      },
    };
    const p = person[locale][subject];
    const v = value[locale][state];
    return (
      {
        ru: `${p} ${v}?`,
        uk: `${p} ${v}?`,
        es: `¿${p} está ${v}?`,
        "pt-BR": `${p} está ${v}?`,
        vi: `${p} ${v} phải không?`,
        id: `Apakah ${p.toLowerCase()} ${v}?`,
        tr: `${p} ${v} mı?`,
        pl: `Czy ${p.toLowerCase()} jest ${v}?`,
      } as Record<Locale, string>
    )[locale];
  }
  const possessiveState = english.match(
    /^(My|Your|His|Her) (mother|father|sister|brother|book|bag|cup|key) is (here|home|ready|calm)\.$/u,
  );
  if (possessiveState) {
    const [, owner, noun, state] = possessiveState;
    const poss = owner.toLowerCase();
    const subjects: Record<Locale, Record<string, Record<string, string>>> = {
      ru: {
        my: {
          mother: "Моя мама",
          father: "Мой папа",
          sister: "Моя сестра",
          brother: "Мой брат",
          book: "Моя книга",
          bag: "Моя сумка",
          cup: "Моя чашка",
          key: "Мой ключ",
        },
        your: {
          mother: "Твоя мама",
          father: "Твой папа",
          sister: "Твоя сестра",
          brother: "Твой брат",
          book: "Твоя книга",
          bag: "Твоя сумка",
          cup: "Твоя чашка",
          key: "Твой ключ",
        },
        his: {
          mother: "Его мама",
          father: "Его папа",
          sister: "Его сестра",
          brother: "Его брат",
          book: "Его книга",
          bag: "Его сумка",
          cup: "Его чашка",
          key: "Его ключ",
        },
        her: {
          mother: "Её мама",
          father: "Её папа",
          sister: "Её сестра",
          brother: "Её брат",
          book: "Её книга",
          bag: "Её сумка",
          cup: "Её чашка",
          key: "Её ключ",
        },
      },
      uk: {
        my: {
          mother: "Моя мама",
          father: "Мій тато",
          sister: "Моя сестра",
          brother: "Мій брат",
          book: "Моя книга",
          bag: "Моя сумка",
          cup: "Моя чашка",
          key: "Мій ключ",
        },
        your: {
          mother: "Твоя мама",
          father: "Твій тато",
          sister: "Твоя сестра",
          brother: "Твій брат",
          book: "Твоя книга",
          bag: "Твоя сумка",
          cup: "Твоя чашка",
          key: "Твій ключ",
        },
        his: {
          mother: "Його мама",
          father: "Його тато",
          sister: "Його сестра",
          brother: "Його брат",
          book: "Його книга",
          bag: "Його сумка",
          cup: "Його чашка",
          key: "Його ключ",
        },
        her: {
          mother: "Її мама",
          father: "Її тато",
          sister: "Її сестра",
          brother: "Її брат",
          book: "Її книга",
          bag: "Її сумка",
          cup: "Її чашка",
          key: "Її ключ",
        },
      },
      es: {
        my: {
          mother: "Mi madre",
          father: "Mi padre",
          sister: "Mi hermana",
          brother: "Mi hermano",
          book: "Mi libro",
          bag: "Mi bolsa",
          cup: "Mi taza",
          key: "Mi llave",
        },
        your: {
          mother: "Tu madre",
          father: "Tu padre",
          sister: "Tu hermana",
          brother: "Tu hermano",
          book: "Tu libro",
          bag: "Tu bolsa",
          cup: "Tu taza",
          key: "Tu llave",
        },
        his: {
          mother: "Su madre",
          father: "Su padre",
          sister: "Su hermana",
          brother: "Su hermano",
          book: "Su libro",
          bag: "Su bolsa",
          cup: "Su taza",
          key: "Su llave",
        },
        her: {
          mother: "Su madre",
          father: "Su padre",
          sister: "Su hermana",
          brother: "Su hermano",
          book: "Su libro",
          bag: "Su bolsa",
          cup: "Su taza",
          key: "Su llave",
        },
      },
      "pt-BR": {
        my: {
          mother: "Minha mãe",
          father: "Meu pai",
          sister: "Minha irmã",
          brother: "Meu irmão",
          book: "Meu livro",
          bag: "Minha bolsa",
          cup: "Minha xícara",
          key: "Minha chave",
        },
        your: {
          mother: "Sua mãe",
          father: "Seu pai",
          sister: "Sua irmã",
          brother: "Seu irmão",
          book: "Seu livro",
          bag: "Sua bolsa",
          cup: "Sua xícara",
          key: "Sua chave",
        },
        his: {
          mother: "A mãe dele",
          father: "O pai dele",
          sister: "A irmã dele",
          brother: "O irmão dele",
          book: "O livro dele",
          bag: "A bolsa dele",
          cup: "A xícara dele",
          key: "A chave dele",
        },
        her: {
          mother: "A mãe dela",
          father: "O pai dela",
          sister: "A irmã dela",
          brother: "O irmão dela",
          book: "O livro dela",
          bag: "A bolsa dela",
          cup: "A xícara dela",
          key: "A chave dela",
        },
      },
      vi: {
        my: {
          mother: "Mẹ tôi",
          father: "Bố tôi",
          sister: "Chị tôi",
          brother: "Anh tôi",
          book: "Sách của tôi",
          bag: "Túi của tôi",
          cup: "Cốc của tôi",
          key: "Chìa khóa của tôi",
        },
        your: {
          mother: "Mẹ bạn",
          father: "Bố bạn",
          sister: "Chị bạn",
          brother: "Anh bạn",
          book: "Sách của bạn",
          bag: "Túi của bạn",
          cup: "Cốc của bạn",
          key: "Chìa khóa của bạn",
        },
        his: {
          mother: "Mẹ anh ấy",
          father: "Bố anh ấy",
          sister: "Chị anh ấy",
          brother: "Anh anh ấy",
          book: "Sách của anh ấy",
          bag: "Túi của anh ấy",
          cup: "Cốc của anh ấy",
          key: "Chìa khóa của anh ấy",
        },
        her: {
          mother: "Mẹ cô ấy",
          father: "Bố cô ấy",
          sister: "Chị cô ấy",
          brother: "Anh cô ấy",
          book: "Sách của cô ấy",
          bag: "Túi của cô ấy",
          cup: "Cốc của cô ấy",
          key: "Chìa khóa của cô ấy",
        },
      },
      id: {
        my: {
          mother: "Ibu saya",
          father: "Ayah saya",
          sister: "Saudari saya",
          brother: "Saudara saya",
          book: "Buku saya",
          bag: "Tas saya",
          cup: "Cangkir saya",
          key: "Kunci saya",
        },
        your: {
          mother: "Ibu kamu",
          father: "Ayah kamu",
          sister: "Saudari kamu",
          brother: "Saudara kamu",
          book: "Buku kamu",
          bag: "Tas kamu",
          cup: "Cangkir kamu",
          key: "Kunci kamu",
        },
        his: {
          mother: "Ibunya",
          father: "Ayahnya",
          sister: "Saudarinya",
          brother: "Saudaranya",
          book: "Bukunya",
          bag: "Tasnya",
          cup: "Cangkirnya",
          key: "Kuncinya",
        },
        her: {
          mother: "Ibunya",
          father: "Ayahnya",
          sister: "Saudarinya",
          brother: "Saudaranya",
          book: "Bukunya",
          bag: "Tasnya",
          cup: "Cangkirnya",
          key: "Kuncinya",
        },
      },
      tr: {
        my: {
          mother: "Annem",
          father: "Babam",
          sister: "Kız kardeşim",
          brother: "Erkek kardeşim",
          book: "Kitabım",
          bag: "Çantam",
          cup: "Fincanım",
          key: "Anahtarım",
        },
        your: {
          mother: "Annen",
          father: "Baban",
          sister: "Kız kardeşin",
          brother: "Erkek kardeşin",
          book: "Kitabın",
          bag: "Çantan",
          cup: "Fincanın",
          key: "Anahtarın",
        },
        his: {
          mother: "Annesi",
          father: "Babası",
          sister: "Kız kardeşi",
          brother: "Erkek kardeşi",
          book: "Kitabı",
          bag: "Çantası",
          cup: "Fincanı",
          key: "Anahtarı",
        },
        her: {
          mother: "Annesi",
          father: "Babası",
          sister: "Kız kardeşi",
          brother: "Erkek kardeşi",
          book: "Kitabı",
          bag: "Çantası",
          cup: "Fincanı",
          key: "Anahtarı",
        },
      },
      pl: {
        my: {
          mother: "Moja mama",
          father: "Mój tata",
          sister: "Moja siostra",
          brother: "Mój brat",
          book: "Moja książka",
          bag: "Moja torba",
          cup: "Mój kubek",
          key: "Mój klucz",
        },
        your: {
          mother: "Twoja mama",
          father: "Twój tata",
          sister: "Twoja siostra",
          brother: "Twój brat",
          book: "Twoja książka",
          bag: "Twoja torba",
          cup: "Twój kubek",
          key: "Twój klucz",
        },
        his: {
          mother: "Jego mama",
          father: "Jego tata",
          sister: "Jego siostra",
          brother: "Jego brat",
          book: "Jego książka",
          bag: "Jego torba",
          cup: "Jego kubek",
          key: "Jego klucz",
        },
        her: {
          mother: "Jej mama",
          father: "Jej tata",
          sister: "Jej siostra",
          brother: "Jej brat",
          book: "Jej książka",
          bag: "Jej torba",
          cup: "Jej kubek",
          key: "Jej klucz",
        },
      },
    };
    const subject = subjects[locale][poss][noun];
    const predicate: Record<Locale, Record<string, string>> = {
      ru: { here: "здесь", home: "дома", ready: "готова", calm: "спокоен" },
      uk: { here: "тут", home: "вдома", ready: "готова", calm: "спокійний" },
      es: {
        here: "está aquí",
        home: "está en casa",
        ready: "está lista",
        calm: "está tranquilo",
      },
      "pt-BR": {
        here: "está aqui",
        home: "está em casa",
        ready: "está pronta",
        calm: "está calmo",
      },
      vi: {
        here: "ở đây",
        home: "ở nhà",
        ready: "sẵn sàng",
        calm: "bình tĩnh",
      },
      id: { here: "di sini", home: "di rumah", ready: "siap", calm: "tenang" },
      tr: { here: "burada", home: "evde", ready: "hazır", calm: "sakin" },
      pl: {
        here: "jest tutaj",
        home: "jest w domu",
        ready: "jest gotowa",
        calm: "jest spokojny",
      },
    };
    return `${subject} ${predicate[locale][state]}.`;
  }
  const table: Record<Locale, Record<string, string>> = {
    ru: {
      "What is this?": "Что это?",
      "What is that?": "Что это там?",
      "What is it?": "Что это?",
      "Where is he?": "Где он?",
      "Where is she?": "Где она?",
      "Where is it?": "Где это?",
      "Where are you?": "Где ты?",
      "Who is he?": "Кто он?",
      "Who is she?": "Кто она?",
      "Who is this?": "Кто это?",
      "How are you?": "Как ты?",
      "How is he?": "Как он?",
      "How is she?": "Как она?",
    },
    uk: {
      "What is this?": "Що це?",
      "What is that?": "Що це там?",
      "What is it?": "Що це?",
      "Where is he?": "Де він?",
      "Where is she?": "Де вона?",
      "Where is it?": "Де це?",
      "Where are you?": "Де ти?",
      "Who is he?": "Хто він?",
      "Who is she?": "Хто вона?",
      "Who is this?": "Хто це?",
      "How are you?": "Як ти?",
      "How is he?": "Як він?",
      "How is she?": "Як вона?",
    },
    es: {
      "What is this?": "¿Qué es esto?",
      "What is that?": "¿Qué es eso?",
      "What is it?": "¿Qué es?",
      "Where is he?": "¿Dónde está él?",
      "Where is she?": "¿Dónde está ella?",
      "Where is it?": "¿Dónde está?",
      "Where are you?": "¿Dónde estás?",
      "Who is he?": "¿Quién es él?",
      "Who is she?": "¿Quién es ella?",
      "Who is this?": "¿Quién es esta persona?",
      "How are you?": "¿Cómo estás?",
      "How is he?": "¿Cómo está él?",
      "How is she?": "¿Cómo está ella?",
    },
    "pt-BR": {
      "What is this?": "O que é isto?",
      "What is that?": "O que é aquilo?",
      "What is it?": "O que é isso?",
      "Where is he?": "Onde ele está?",
      "Where is she?": "Onde ela está?",
      "Where is it?": "Onde está?",
      "Where are you?": "Onde você está?",
      "Who is he?": "Quem é ele?",
      "Who is she?": "Quem é ela?",
      "Who is this?": "Quem é esta pessoa?",
      "How are you?": "Como você está?",
      "How is he?": "Como ele está?",
      "How is she?": "Como ela está?",
    },
    vi: {
      "What is this?": "Đây là gì?",
      "What is that?": "Kia là gì?",
      "What is it?": "Nó là gì?",
      "Where is he?": "Anh ấy ở đâu?",
      "Where is she?": "Cô ấy ở đâu?",
      "Where is it?": "Nó ở đâu?",
      "Where are you?": "Bạn ở đâu?",
      "Who is he?": "Anh ấy là ai?",
      "Who is she?": "Cô ấy là ai?",
      "Who is this?": "Đây là ai?",
      "How are you?": "Bạn thế nào?",
      "How is he?": "Anh ấy thế nào?",
      "How is she?": "Cô ấy thế nào?",
    },
    id: {
      "What is this?": "Ini apa?",
      "What is that?": "Itu apa?",
      "What is it?": "Itu apa?",
      "Where is he?": "Dia di mana?",
      "Where is she?": "Dia di mana?",
      "Where is it?": "Itu di mana?",
      "Where are you?": "Kamu di mana?",
      "Who is he?": "Dia siapa?",
      "Who is she?": "Dia siapa?",
      "Who is this?": "Ini siapa?",
      "How are you?": "Apa kabar?",
      "How is he?": "Bagaimana dia?",
      "How is she?": "Bagaimana dia?",
    },
    tr: {
      "What is this?": "Bu ne?",
      "What is that?": "Şu ne?",
      "What is it?": "O ne?",
      "Where is he?": "O nerede?",
      "Where is she?": "O nerede?",
      "Where is it?": "O nerede?",
      "Where are you?": "Sen neredesin?",
      "Who is he?": "O kim?",
      "Who is she?": "O kim?",
      "Who is this?": "Bu kim?",
      "How are you?": "Nasılsın?",
      "How is he?": "O nasıl?",
      "How is she?": "O nasıl?",
    },
    pl: {
      "What is this?": "Co to jest?",
      "What is that?": "Co to jest tam?",
      "What is it?": "Co to jest?",
      "Where is he?": "Gdzie on jest?",
      "Where is she?": "Gdzie ona jest?",
      "Where is it?": "Gdzie to jest?",
      "Where are you?": "Gdzie jesteś?",
      "Who is he?": "Kim on jest?",
      "Who is she?": "Kim ona jest?",
      "Who is this?": "Kim jest ta osoba?",
      "How are you?": "Jak się masz?",
      "How is he?": "Jak on się czuje?",
      "How is she?": "Jak ona się czuje?",
    },
  };
  const identity = english.match(
    /^(This|That) is (?:(a) |(my|your|his|her) )?(book|bag|cup|key)\.$/u,
  );
  if (identity) {
    const [, demonstrative, article, possessive, noun] = identity;
    const words: Record<Locale, Record<string, string>> = {
      ru: { book: "книга", bag: "сумка", cup: "чашка", key: "ключ" },
      uk: { book: "книга", bag: "сумка", cup: "чашка", key: "ключ" },
      es: { book: "libro", bag: "bolsa", cup: "taza", key: "llave" },
      "pt-BR": { book: "livro", bag: "bolsa", cup: "xícara", key: "chave" },
      vi: {
        book: "quyển sách",
        bag: "cái túi",
        cup: "cái cốc",
        key: "chìa khóa",
      },
      id: { book: "buku", bag: "tas", cup: "cangkir", key: "kunci" },
      tr: { book: "kitap", bag: "çanta", cup: "fincan", key: "anahtar" },
      pl: { book: "książka", bag: "torba", cup: "kubek", key: "klucz" },
    };
    const poss: Record<Locale, Record<string, string>> = {
      ru: { my: "моя", your: "твоя", his: "его", her: "её" },
      uk: { my: "моя", your: "твоя", his: "його", her: "її" },
      es: { my: "mi", your: "tu", his: "su", her: "su" },
      "pt-BR": { my: "meu", your: "sua", his: "seu", her: "sua" },
      vi: {
        my: "của tôi",
        your: "của bạn",
        his: "của anh ấy",
        her: "của cô ấy",
      },
      id: { my: "saya", your: "kamu", his: "dia", her: "dia" },
      tr: { my: "benim", your: "senin", his: "onun", her: "onun" },
      pl: { my: "moja", your: "twoja", his: "jego", her: "jej" },
    };
    const n = words[locale][noun];
    const p = possessive
      ? ["ru", "uk", "pt-BR", "pl"].includes(locale)
        ? genderedPossessive(
            locale,
            possessive as Owner,
            noun as PossessiveNoun,
          )
        : poss[locale][possessive]
      : "";
    const thisWord: Record<Locale, string> = {
      ru: demonstrative === "This" ? "Это" : "То",
      uk: demonstrative === "This" ? "Це" : "То",
      es: demonstrative === "This" ? "Esto" : "Eso",
      "pt-BR": demonstrative === "This" ? "Isto" : "Aquilo",
      vi: demonstrative === "This" ? "Đây" : "Kia",
      id: demonstrative === "This" ? "Ini" : "Itu",
      tr: demonstrative === "This" ? "Bu" : "Şu",
      pl: demonstrative === "This" ? "To" : "Tamto",
    };
    return locale === "es"
      ? `${thisWord[locale]} es ${p ? `${p} ` : article ? "un " : ""}${n}.`
      : locale === "pt-BR"
        ? `${thisWord[locale]} é ${p ? `${p} ` : article ? "um " : ""}${n}.`
        : `${thisWord[locale]} ${p ? `${p} ` : ""}${n}.`;
  }
  const rendered = NEGATIVE_MEANINGS[locale][english] ?? table[locale][english];
  if (!rendered)
    throw new Error(`Missing S33–40 native meaning: ${locale} · ${english}`);
  return rendered;
};
function phraseWordPrompt(locale: Locale, meaning: string): string {
  const prompts: Record<Locale, string> = {
    ru: `Какое английское слово завершает фразу со смыслом «${meaning}»?`,
    uk: `Яке англійське слово завершує фразу зі значенням «${meaning}»?`,
    es: `¿Qué palabra inglesa completa la frase con el sentido «${meaning}»?`,
    "pt-BR": `Qual palavra em inglês completa a frase com o sentido «${meaning}»?`,
    vi: `Từ tiếng Anh nào hoàn chỉnh câu mang nghĩa «${meaning}»?`,
    id: `Kata bahasa Inggris mana yang melengkapi kalimat bermakna «${meaning}»?`,
    tr: `«${meaning}» anlamındaki cümleyi hangi İngilizce sözcük tamamlar?`,
    pl: `Które angielskie słowo uzupełnia zdanie o znaczeniu „${meaning}”?`,
  };
  return prompts[locale];
}

function semanticDistractorReason(
  locale: Locale,
  correct: string,
  alternative: string,
  meaning: string,
): string {
  const correctGloss = episode01TokenGloss(
    locale as Episode01FeedbackLocale,
    correct,
  );
  const alternativeGloss = episode01TokenGloss(
    locale as Episode01FeedbackLocale,
    alternative,
  );
  const reasons: Record<Locale, string> = {
    ru: `«${alternative}» передаёт «${alternativeGloss}», тогда как «${correct}» передаёт «${correctGloss}». В значении «${meaning}» на этом месте требуется «${correct}», а не «${alternative}».`,
    uk: `«${alternative}» передає «${alternativeGloss}», тоді як «${correct}» передає «${correctGloss}». У значенні «${meaning}» на цьому місці потрібне «${correct}», а не «${alternative}».`,
    es: `«${alternative}» aporta «${alternativeGloss}», mientras «${correct}» aporta «${correctGloss}». Para expresar «${meaning}», esta posición exige «${correct}», no «${alternative}».`,
    "pt-BR": `«${alternative}» traz «${alternativeGloss}», enquanto «${correct}» traz «${correctGloss}». Para expressar «${meaning}», esta posição exige «${correct}», não «${alternative}».`,
    vi: `«${alternative}» mang nghĩa «${alternativeGloss}», còn «${correct}» mang nghĩa «${correctGloss}». Để diễn đạt «${meaning}», vị trí này cần «${correct}», không phải «${alternative}».`,
    id: `«${alternative}» membawa makna «${alternativeGloss}», sedangkan «${correct}» membawa «${correctGloss}». Untuk menyatakan «${meaning}», posisi ini memerlukan «${correct}», bukan «${alternative}».`,
    tr: `«${alternative}», «${alternativeGloss}» işlevini taşır; «${correct}» ise «${correctGloss}» işlevini taşır. «${meaning}» anlamı için bu yerde «${correct}» gerekir, «${alternative}» değil.`,
    pl: `„${alternative}” wnosi znaczenie „${alternativeGloss}”, a „${correct}” — „${correctGloss}”. Aby wyrazić „${meaning}”, w tym miejscu potrzebne jest „${correct}”, nie „${alternative}”.`,
  };
  return reasons[locale];
}

function authoredPhraseExplanation(
  locale: Locale,
  english: string,
  meaning: string,
): string {
  const phraseTokens = tokens(english);
  const first = phraseTokens[0] ?? "";
  const second = phraseTokens[1] ?? "";
  const third = phraseTokens[2] ?? "";
  const questionWord = /^(what|where|who|how)$/iu.test(first);
  const yesNoQuestion = /^(is|are|am)$/iu.test(first) && english.endsWith("?");
  const negative = phraseTokens.some((token) => token.toLowerCase() === "not");
  const possessive = phraseTokens.find((token) =>
    /^(my|your|his|her)$/iu.test(token),
  );
  const firstGloss = episode01TokenGloss(
    locale as Episode01FeedbackLocale,
    first,
  );
  const possessiveGloss = possessive
    ? episode01TokenGloss(locale as Episode01FeedbackLocale, possessive)
    : "";
  const structure = questionWord
    ? "questionWord"
    : yesNoQuestion
      ? "yesNoQuestion"
      : negative
        ? "negative"
        : possessive
          ? "possessive"
          : "statement";
  const explanations: Record<Locale, Record<typeof structure, string>> = {
    ru: {
      questionWord: `${meaning} В «${english}» слово «${first}» задаёт ${firstGloss}, а «${second}» ставится перед «${third}». Такой порядок сразу показывает, какую информацию должен дать ответ.`,
      yesNoQuestion: `${meaning} В «${english}» форма «${first}» вынесена перед «${second}», поэтому фраза просит подтвердить или опровергнуть весь следующий смысл. Возврат «${first}» после подлежащего превратил бы вопрос в сообщение.`,
      negative: `${meaning} В «${english}» слово «not» стоит сразу после формы to be и отрицает последующее состояние или место. Если убрать «not», получится противоположное утверждение.`,
      possessive: `${meaning} В «${english}» слово «${possessive}» закрепляет владельца: ${possessiveGloss}. Остальные слова называют предмет или человека и связывают его с описанием.`,
      statement: `${meaning} В «${english}» сначала назван участник или предмет «${first}», затем форма «${second}» связывает его с сообщением. Последующая часть уточняет, кто это, где он или в каком он состоянии.`,
    },
    uk: {
      questionWord: `${meaning} У «${english}» слово «${first}» задає ${firstGloss}, а «${second}» стоїть перед «${third}». Такий порядок одразу показує, яку інформацію має дати відповідь.`,
      yesNoQuestion: `${meaning} У «${english}» форму «${first}» винесено перед «${second}», тому вислів просить підтвердити або заперечити весь наступний зміст. Повернення «${first}» після підмета перетворило б питання на повідомлення.`,
      negative: `${meaning} У «${english}» слово «not» стоїть одразу після форми to be й заперечує наступний стан або місце. Без «not» вийшло б протилежне твердження.`,
      possessive: `${meaning} У «${english}» слово «${possessive}» закріплює власника: ${possessiveGloss}. Решта слів називає річ або людину та поєднує її з описом.`,
      statement: `${meaning} У «${english}» спочатку названо учасника або річ «${first}», а форма «${second}» поєднує її з повідомленням. Наступна частина уточнює, хто це, де він або в якому стані.`,
    },
    es: {
      questionWord: `${meaning} En «${english}», «${first}» plantea ${firstGloss} y «${second}» va antes de «${third}». Ese orden anuncia con precisión qué información debe aportar la respuesta.`,
      yesNoQuestion: `${meaning} En «${english}», «${first}» aparece antes de «${second}», por eso la frase pide confirmar o negar todo lo que sigue. Colocar «${first}» después del sujeto la convertiría en una afirmación.`,
      negative: `${meaning} En «${english}», «not» va inmediatamente después de to be y niega el estado o lugar posterior. Sin «not», la frase afirmaría lo contrario.`,
      possessive: `${meaning} En «${english}», «${possessive}» fija a la persona poseedora: ${possessiveGloss}. Las demás palabras nombran la cosa o persona y la unen con la descripción.`,
      statement: `${meaning} En «${english}» aparece primero la persona o cosa «${first}» y luego «${second}» la conecta con el mensaje. La parte final aclara su identidad, lugar o estado.`,
    },
    "pt-BR": {
      questionWord: `${meaning} Em «${english}», «${first}» estabelece ${firstGloss}, e «${second}» vem antes de «${third}». Essa ordem mostra exatamente qual informação a resposta deve trazer.`,
      yesNoQuestion: `${meaning} Em «${english}», «${first}» vem antes de «${second}», então a frase pede confirmação ou negação de tudo o que segue. Colocar «${first}» depois do sujeito transformaria a pergunta em afirmação.`,
      negative: `${meaning} Em «${english}», «not» vem imediatamente depois de to be e nega o estado ou lugar seguinte. Sem «not», a frase afirmaria o contrário.`,
      possessive: `${meaning} Em «${english}», «${possessive}» fixa a pessoa dona: ${possessiveGloss}. As outras palavras nomeiam a coisa ou pessoa e a ligam à descrição.`,
      statement: `${meaning} Em «${english}», a pessoa ou coisa «${first}» aparece primeiro, e «${second}» a conecta à mensagem. A parte final informa identidade, lugar ou estado.`,
    },
    vi: {
      questionWord: `${meaning} Trong «${english}», «${first}» đặt ra ${firstGloss}, còn «${second}» đứng trước «${third}». Trật tự này cho biết chính xác câu trả lời phải cung cấp loại thông tin nào.`,
      yesNoQuestion: `${meaning} Trong «${english}», «${first}» đứng trước «${second}» nên câu yêu cầu xác nhận hoặc phủ nhận toàn bộ phần sau. Đưa «${first}» về sau chủ ngữ sẽ biến câu hỏi thành câu kể.`,
      negative: `${meaning} Trong «${english}», «not» đứng ngay sau dạng to be để phủ định trạng thái hoặc nơi chốn theo sau. Bỏ «not» sẽ tạo ra lời khẳng định ngược lại.`,
      possessive: `${meaning} Trong «${english}», «${possessive}» xác định người sở hữu: ${possessiveGloss}. Các từ còn lại gọi tên người hoặc vật rồi nối với phần mô tả.`,
      statement: `${meaning} Trong «${english}», người hoặc vật «${first}» được nêu trước, rồi «${second}» nối chủ thể với thông tin. Phần cuối cho biết danh tính, nơi chốn hoặc trạng thái.`,
    },
    id: {
      questionWord: `${meaning} Dalam «${english}», «${first}» menetapkan ${firstGloss}, lalu «${second}» berada sebelum «${third}». Urutan ini menunjukkan tepat jenis informasi yang harus diberikan jawaban.`,
      yesNoQuestion: `${meaning} Dalam «${english}», «${first}» ditempatkan sebelum «${second}» sehingga kalimat meminta konfirmasi atau penyangkalan atas bagian berikutnya. Jika «${first}» kembali sesudah subjek, bentuknya menjadi pernyataan.`,
      negative: `${meaning} Dalam «${english}», «not» langsung mengikuti bentuk to be dan menyangkal keadaan atau tempat sesudahnya. Tanpa «not», kalimat menyatakan kebalikannya.`,
      possessive: `${meaning} Dalam «${english}», «${possessive}» menetapkan pemilik: ${possessiveGloss}. Kata lainnya menyebut orang atau benda lalu menghubungkannya dengan keterangan.`,
      statement: `${meaning} Dalam «${english}», orang atau benda «${first}» disebut lebih dulu, kemudian «${second}» menghubungkannya dengan pesan. Bagian akhir menjelaskan identitas, tempat, atau keadaan.`,
    },
    tr: {
      questionWord: `${meaning} «${english}» içinde «${first}», ${firstGloss} işlevini kurar; «${second}» ise «${third}» önünde durur. Bu sıra cevabın hangi bilgiyi vermesi gerektiğini açıkça gösterir.`,
      yesNoQuestion: `${meaning} «${english}» içinde «${first}», «${second}» önüne geçtiği için cümle devamındaki bilgiyi doğrulatır ya da reddettirir. «${first}» özneden sonra gelseydi yapı bildirim olurdu.`,
      negative: `${meaning} «${english}» içinde «not», to be biçiminin hemen ardından gelerek sonraki durum veya yeri olumsuz yapar. «not» kaldırılırsa cümle tersini bildirir.`,
      possessive: `${meaning} «${english}» içinde «${possessive}» sahibini belirler: ${possessiveGloss}. Diğer sözcükler kişi ya da nesneyi adlandırıp açıklamaya bağlar.`,
      statement: `${meaning} «${english}» içinde kişi ya da nesne «${first}» önce gelir; «${second}» onu bilgiye bağlar. Son bölüm kimlik, yer veya durumu açıklar.`,
    },
    pl: {
      questionWord: `${meaning} W „${english}” słowo „${first}” wyznacza ${firstGloss}, a „${second}” stoi przed „${third}”. Taki szyk dokładnie pokazuje, jakiej informacji ma dostarczyć odpowiedź.`,
      yesNoQuestion: `${meaning} W „${english}” forma „${first}” stoi przed „${second}”, więc zdanie prosi o potwierdzenie lub zaprzeczenie dalszej treści. Przeniesienie „${first}” za podmiot utworzyłoby oznajmienie.`,
      negative: `${meaning} W „${english}” słowo „not” stoi bezpośrednio po formie to be i przeczy następującemu stanowi lub miejscu. Bez „not” zdanie twierdziłoby coś przeciwnego.`,
      possessive: `${meaning} W „${english}” słowo „${possessive}” wskazuje właściciela: ${possessiveGloss}. Pozostałe słowa nazywają osobę lub rzecz i łączą ją z opisem.`,
      statement: `${meaning} W „${english}” najpierw pojawia się osoba lub rzecz „${first}”, a „${second}” łączy ją z wiadomością. Końcowa część podaje tożsamość, miejsce lub stan.`,
    },
  };
  return explanations[locale][structure];
}

function buildPhraseStudyDetails(
  english: string,
): Record<Locale, EpisodeSourcePhraseLocalizedDetails> {
  const phraseTokens = tokens(english);
  return Object.fromEntries(
    LOCALES.map((locale) => {
      const meaning = nativeMeaning(locale, english);
      const makeDistractors = (correct: string) =>
        alternatives(correct).map((value) => ({
          value,
          reason: semanticDistractorReason(locale, correct, value, meaning),
        }));
      return [
        locale,
        {
          meaning,
          explanation: authoredPhraseExplanation(locale, english, meaning),
          distractors: makeDistractors(phraseTokens[0]),
          words: phraseTokens.map((correct) => ({
            correct,
            prompt: phraseWordPrompt(locale, meaning),
            distractors: makeDistractors(correct),
          })),
        },
      ];
    }),
  ) as unknown as Record<Locale, EpisodeSourcePhraseLocalizedDetails>;
}
function phrase(
  ordinal: number,
  position: number,
  english: string,
  features: readonly string[],
): EpisodeSourcePhrase {
  const localized = buildPhraseStudyDetails(english);
  return {
    id: `e01-s${String(ordinal).padStart(2, "0")}-${String(position + 1).padStart(2, "0")}`,
    english,
    russian: localized.ru.meaning,
    explanation: localized.ru.explanation,
    localizedDetails: localized,
    features,
    words: tokens(english).map((correct) => ({
      correct,
      category: category(correct),
      distractors: alternatives(correct).map((value) => ({
        value,
        reasonCode: "wrong_token_for_position",
        why: semanticDistractorReason(
          "ru",
          correct,
          value,
          localized.ru.meaning,
        ),
      })),
    })),
  };
}
function runs(body: LocalizedSource, target: string): LocalizedIntroRunsSource {
  return Object.fromEntries(
    LOCALES.map((locale) => {
      const text = body[locale] as string;
      const at = text.indexOf(target);
      return [
        locale,
        at < 0
          ? [{ text, semantic: "explanation" as const }]
          : [
              { text: text.slice(0, at), semantic: "explanation" as const },
              { text: target, semantic: "targetCorrect" as const },
              {
                text: text.slice(at + target.length),
                semantic: "explanation" as const,
              },
            ].filter((run) => run.text.length > 0),
      ];
    }),
  ) as unknown as LocalizedIntroRunsSource;
}

function localizeEnglishChoice(value: string): LocalizedSource {
  return {
    ru: value,
    uk: value,
    es: value,
    "pt-BR": value,
    vi: value,
    id: value,
    tr: value,
    pl: value,
  };
}

function authoredIntroPage(
  page: AuthoredIntroPage33To40,
  ordinal: 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40,
): SessionSource["introPages"][number] {
  const body = ordinal === 39
    ? Object.fromEntries(LOCALES.map((locale) => {
        const replacements: Record<Locale, readonly [string, string]> = {
          ru: ["три изолированные карточки", "три изолированных слова"],
          uk: ["три окремі картки", "три окремі слова"],
          es: ["tres tarjetas separadas", "tres palabras separadas"],
          "pt-BR": ["três cartões separados", "três palavras separadas"],
          vi: ["ba thẻ từ tách rời", "ba từ tách rời"],
          id: ["tiga kartu kata terpisah", "tiga kata terpisah"],
          tr: ["üç ayrı kart", "üç ayrı sözcük"],
          pl: ["trzy oddzielne karty", "trzy oddzielne słowa"],
        };
        const [from, to] = replacements[locale];
        return [locale, (page.body[locale] ?? "").replace(from, to)];
      })) as unknown as LocalizedSource
    : page.body;
  return {
    kind: page.kind,
    title: page.title,
    body,
    bodyRuns: runs(body, page.choices[0]),
    question: {
      prompt: page.prompt,
      choices: [
        localizeEnglishChoice(page.choices[0]),
        localizeEnglishChoice(page.choices[1]),
        localizeEnglishChoice(page.choices[2]),
      ],
      correctChoiceIndex: 0,
      explanation: page.explanation,
    },
  };
}

const PHRASES: Record<number, readonly string[]> = {
  33: [
    "What is this?",
    "What is that?",
    "What is it?",
    "This is a book.",
    "That is a bag.",
    "This is a cup.",
    "That is a key.",
    "Is this a book?",
    "Is that a bag?",
    "Is this a cup?",
    "Is that a key?",
    "This is my book.",
    "That is your bag.",
    "This is my cup.",
    "That is your key.",
  ],
  34: [
    "Where is he?",
    "Where is she?",
    "Where is it?",
    "Where are you?",
    "Where are we?",
    "Where are they?",
    "Where is my mother?",
    "Where is your father?",
    "Where is this book?",
    "Where is that bag?",
    "Is he here?",
    "Is she home?",
    "Are you here?",
    "Are they home?",
    "Where is my key?",
  ],
  35: [
    "Who is he?",
    "Who is she?",
    "Who is this?",
    "Who is that?",
    "Who is your mother?",
    "Who is your father?",
    "Who is my sister?",
    "Who is my brother?",
    "Is this your mother?",
    "Is that your father?",
    "He is my brother.",
    "She is my sister.",
    "This is my mother.",
    "That is your father.",
    "Who is your sister?",
  ],
  36: [
    "How are you?",
    "How is he?",
    "How is she?",
    "How are they?",
    "I am fine.",
    "You are okay.",
    "He is ready.",
    "She is calm.",
    "They are happy.",
    "They are busy.",
    "Is he tired?",
    "Is she happy?",
    "Are you ready?",
    "Are they calm?",
    "Are they busy?",
  ],
  37: [
    "This is my book.",
    "That is your bag.",
    "My cup is here.",
    "Your key is here.",
    "Is this my book?",
    "Is that your bag?",
    "Where is my cup?",
    "Where is your key?",
    "My mother is here.",
    "Your father is home.",
    "My sister is ready.",
    "Your brother is calm.",
    "Is this your cup?",
    "Is that my key?",
    "Who is your mother?",
  ],
  38: [
    "This is his book.",
    "That is her bag.",
    "His cup is here.",
    "Her key is here.",
    "Is this his book?",
    "Is that her bag?",
    "Where is his cup?",
    "Where is her key?",
    "His mother is here.",
    "Her father is home.",
    "His sister is ready.",
    "Her brother is calm.",
    "Is this her cup?",
    "Is that his key?",
    "Who is her mother?",
  ],
  39: [
    "What is this?",
    "Where is he?",
    "Who is she?",
    "How are you?",
    "What is that?",
    "Where are they?",
    "Who is this?",
    "How is he?",
    "What is it?",
    "Where are you?",
    "Who is he?",
    "How is she?",
    "Where is she?",
    "Who is that?",
    "How are they?",
  ],
  40: [
    "What is this?",
    "Where is my book?",
    "Who is your mother?",
    "How are you?",
    "This is my cup.",
    "That is your bag.",
    "His key is here.",
    "Her book is here.",
    "Is this his bag?",
    "Is that her cup?",
    "He is not ready.",
    "She is not here.",
    "They are not busy.",
    "Who is my brother?",
    "Where is her father?",
  ],
};
const KINDS: Record<number, SessionKind> = {
  33: "words_then_phrases",
  34: "phrases",
  35: "phrases",
  36: "phrases",
  37: "words_then_phrases",
  38: "words_then_phrases",
  39: "voice",
  40: "checkpoint",
};
const FEATURES: Record<number, readonly string[]> = {
  33: ["copula_be", "question_inversion", "question_word", "demonstrative"],
  34: ["copula_be", "question_inversion", "question_word"],
  35: ["copula_be", "question_inversion", "question_word", "family_noun"],
  36: ["copula_be", "question_inversion", "question_word", "state_adjective"],
  37: ["copula_be", "question_inversion", "possessive_my", "possessive_your"],
  38: ["copula_be", "question_inversion", "possessive_his_her"],
  39: ["copula_be", "question_inversion", "question_word", "spoken_production"],
  40: [
    "copula_be",
    "question_inversion",
    "question_word",
    "possessive_my",
    "possessive_your",
    "possessive_his_her",
  ],
};

export function buildEpisode01Session33To40(
  ordinal: 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40,
): SessionSource {
  const authored = AUTHORED_INTROS_33_TO_40[ordinal];
  if (!authored) {
    throw new Error(`Missing authored intro for episode 1 session ${ordinal}`);
  }
  const introPages: SessionSource["introPages"] = [
    authoredIntroPage(authored.pages[0], ordinal),
    authoredIntroPage(authored.pages[1], ordinal),
    authoredIntroPage(authored.pages[2], ordinal),
  ];
  return {
    packageId: "learning-v2-en-v1",
    targetLanguage: "en",
    episodeOrdinal: 1,
    requiredSessionOrdinal: ordinal,
    canDoOutcomeId: "obj-e01-question-words-and-possessives",
    generationInputFingerprint: `authored-e01-s${ordinal}-v2`,
    title: authored.title,
    summary: authored.summary,
    learningGoal: authored.learningGoal,
    introPages,
    phrases: PHRASES[ordinal].map((english, index) =>
      phrase(ordinal, index, english, FEATURES[ordinal]),
    ),
  };
}

export function assertEpisode01Sessions33To40Contract(
  sources: readonly SessionSource[],
): void {
  const chapter = sources.filter(
    (source) =>
      source.requiredSessionOrdinal >= 33 &&
      source.requiredSessionOrdinal <= 40,
  );
  expect(chapter.map((source) => source.requiredSessionOrdinal)).toEqual([
    33, 34, 35, 36, 37, 38, 39, 40,
  ]);
  chapter.forEach((source) => {
    const ordinal = source.requiredSessionOrdinal;
    expect(KINDS[ordinal]).toBeTruthy();
    expect(source.phrases).toHaveLength(15);
    source.phrases.forEach((item) => {
      expect(item.english).not.toMatch(/\b(?:do|does)\b/iu);
      expect(Object.keys(item.localizedDetails ?? {}).sort()).toEqual(
        [...LOCALES].sort(),
      );
      item.words.forEach((word) =>
        expect(new Set(word.distractors.map((entry) => entry.value)).size).toBe(
          5,
        ),
      );
    });
    source.introPages.forEach((page) =>
      LOCALES.forEach((locale) => {
        expect(page.bodyRuns?.[locale]?.map((run) => run.text).join("")).toBe(
          page.body[locale],
        );
        expect(
          page.question.choices[page.question.correctChoiceIndex][locale],
        ).not.toMatch(/\b(?:do|does)\b/iu);
      }),
    );
  });
  expect(
    chapter[0].phrases.some((item) => item.features.includes("demonstrative")),
  ).toBe(true);
  expect(
    chapter[4].phrases.some((item) =>
      item.features.includes("possessive_your"),
    ),
  ).toBe(true);
  expect(
    chapter[5].phrases.some((item) =>
      item.features.includes("possessive_his_her"),
    ),
  ).toBe(true);
}
