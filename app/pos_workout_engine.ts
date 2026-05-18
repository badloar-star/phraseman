import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { isUserFacingCategory, normalizeWordCategory, type WordCategory } from './pos_taxonomy';

export type PosDrillType =
  | 'form_choice'
  | 'slot_anchor'
  | 'meaning_map'
  | 'order_rebuild'
  | 'rule_contrast';

export type PosDrillMethod =
  | 'form_agreement'
  | 'missing_slot'
  | 'semantic_anchor'
  | 'connector_bridge'
  | 'rule_contrast';

type PosWorkoutLocaleCopy = Record<Lang, string> & Partial<Record<PlannedInterfaceLang, string>>;
type PosWorkoutLocaleChips = Record<Lang, string[]> & Partial<Record<PlannedInterfaceLang, string[]>>;

export interface PosWorkoutProfile {
  category: WordCategory;
  drillType: PosDrillType;
  icon: string;
  accent: string;
  title: PosWorkoutLocaleCopy;
  drillLabel: PosWorkoutLocaleCopy;
  coachLine: PosWorkoutLocaleCopy;
  mistakeWhy: PosWorkoutLocaleCopy;
  nextStep: PosWorkoutLocaleCopy;
}

export interface PosMasteryEntry {
  category: WordCategory;
  xp: number;
  level: number;
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  lastPracticed: number;
}

export interface PosMasteryReward {
  category: WordCategory;
  xpDelta: number;
  previousLevel: number;
  entry: PosMasteryEntry;
  leveledUp: boolean;
}

export interface PosAttemptSignal {
  category?: WordCategory;
  correct: boolean;
}

export interface PosDrillPlan {
  drillType: PosDrillType;
  method: PosDrillMethod;
  title: string;
  instruction: string;
  prompt: string;
  helper: string;
  answerLabel: string;
  focusChips: string[];
  options: string[];
  correct: string;
}

export interface PosDrillPlanInput {
  category: WordCategory;
  phrase: string;
  token: string;
  lang: Lang;
  translation?: string;
  candidates?: string[];
}

export interface TrainerCategoryLike {
  key: string;
  queue?: string;
  category?: WordCategory;
  grammarTag?: string;
  errorWord?: string;
  arenaQuestion?: { correct?: string; rule?: string };
}

const POS_MASTERY_KEY = 'pos_mastery_v1';
const POS_LEVEL_XP = 120;

const POS_DRILL_OPTIONS: Partial<Record<Exclude<WordCategory, 'other'>, string[]>> = {
  syntax: ['give it to me', 'give me the book', 'send it to her', 'buy it for me'],
  article: ['a', 'an', 'the', 'no article'],
  determiner: ['some', 'any', 'no', 'many', 'much', 'few', 'each', 'every'],
  existential: ['there is', 'there are', "there isn't", "there aren't", 'is there', 'are there'],
  preposition: ['in', 'on', 'at', 'to', 'for', 'from', 'with', 'by'],
  'to-be': ['am', 'is', 'are', 'was', 'were', 'be'],
  modal: ['can', 'could', 'must', 'should', 'may', 'might', 'will', 'would'],
  pronoun: ['I', 'me', 'my', 'mine', 'he', 'him', 'his', 'they', 'them', 'their'],
  conjunction: ['and', 'but', 'because', 'if', 'when', 'although'],
  phrasal_particle: ['up', 'off', 'on', 'out', 'over', 'back', 'away'],
  verb: ['go', 'goes', 'went', 'going', 'do', 'does', 'did', 'done'],
  noun: ['person', 'place', 'thing', 'time', 'day', 'work'],
  adjective: ['good', 'better', 'best', 'new', 'old', 'ready'],
  adverb: ['now', 'then', 'often', 'never', 'quickly', 'well'],
  modifier: ['too', 'enough', 'very', 'really', 'quite', 'too much', 'too many', 'not enough'],
};

const METHOD_BY_DRILL_TYPE: Record<PosDrillType, PosDrillMethod> = {
  form_choice: 'form_agreement',
  slot_anchor: 'missing_slot',
  meaning_map: 'semantic_anchor',
  order_rebuild: 'connector_bridge',
  rule_contrast: 'rule_contrast',
};

const METHOD_INSTRUCTIONS: Record<PosDrillMethod, PosWorkoutLocaleCopy> = {
  form_agreement: {
    ru: 'Выбери форму, которая совпадает с субъектом, временем и смыслом.',
    uk: 'Обери форму, що збігається з підметом, часом і змістом.',
    es: 'Elige la forma que encaja con sujeto, tiempo y sentido.', 'pt-BR': "Escolha a forma que combina com sujeito, tempo e sentido.", vi: "Chọn dạng khớp với chủ ngữ, thì và nghĩa.", id: "Pilih bentuk yang sesuai dengan subjek, waktu, dan makna.", tr: "Özne, zaman ve anlamla uyuşan biçimi seç.", pl: "Wybierz formę pasującą do podmiotu, czasu i sensu.",
  },
  missing_slot: {
    ru: 'Вставь пропущенное слово в точную позицию фразы.',
    uk: 'Встав пропущене слово в точну позицію фрази.',
    es: 'Coloca la palabra que falta en la posición exacta.', 'pt-BR': "Coloque a palavra que falta na posição exata da frase.", vi: "Đặt từ còn thiếu vào đúng vị trí trong cụm/câu.", id: "Letakkan kata yang hilang di posisi yang tepat dalam frasa.", tr: "Eksik kelimeyi cümlenin tam yerine yerleştir.", pl: "Wstaw brakujące słowo w dokładne miejsce frazy.",
  },
  semantic_anchor: {
    ru: 'Сначала привяжи смысл к переводу, потом выбери слово.',
    uk: 'Спочатку прив\'яжи зміст до перекладу, потім обери слово.',
    es: 'Ancla el significado en la traducción y luego elige.', 'pt-BR': "Prenda primeiro o sentido à tradução, depois escolha a palavra.", vi: "Trước hết neo nghĩa vào bản dịch, rồi chọn từ.", id: "Hubungkan dulu makna dengan terjemahan, lalu pilih katanya.", tr: "Önce anlamı çeviriye bağla, sonra kelimeyi seç.", pl: "Najpierw powiąż sens z tłumaczeniem, potem wybierz słowo.",
  },
  connector_bridge: {
    ru: 'Определи, как две части фразы связаны по смыслу.',
    uk: 'Визнач, як дві частини фрази пов\'язані за змістом.',
    es: 'Detecta cómo se conectan las dos partes de la frase.', 'pt-BR': "Identifique como as duas partes da frase se conectam pelo sentido.", vi: "Xác định hai phần của câu liên kết với nhau theo nghĩa như thế nào.", id: "Tentukan bagaimana dua bagian frasa terhubung secara makna.", tr: "Cümlenin iki parçasının anlamca nasıl bağlandığını belirle.", pl: "Określ, jak dwie części frazy łączą się znaczeniowo.",
  },
  rule_contrast: {
    ru: 'Сравни варианты: здесь меняется правило или смысл действия.',
    uk: 'Порівняй варіанти: тут змінюється правило або зміст дії.',
    es: 'Contrasta opciones: cambia la regla o el sentido.', 'pt-BR': "Compare as opções: aqui muda a regra ou o sentido da ação.", vi: "So sánh các lựa chọn: ở đây quy tắc hoặc nghĩa hành động thay đổi.", id: "Bandingkan pilihan: di sini aturan atau makna tindakan berubah.", tr: "Seçenekleri karşılaştır: burada kural ya da eylemin anlamı değişiyor.", pl: "Porównaj opcje: tutaj zmienia się reguła albo sens działania.",
  },
};

const METHOD_ANSWER_LABELS: Record<PosDrillMethod, PosWorkoutLocaleCopy> = {
  form_agreement: {
    ru: 'Форма',
    uk: 'Форма',
    es: 'Forma', 'pt-BR': "Forma", vi: "Dạng", id: "Bentuk", tr: "Biçim", pl: "Forma",
  },
  missing_slot: {
    ru: 'Слот',
    uk: 'Слот',
    es: 'Hueco', 'pt-BR': "Lacuna", vi: "Chỗ trống", id: "Slot", tr: "Boşluk", pl: "Luka",
  },
  semantic_anchor: {
    ru: 'Смысл',
    uk: 'Зміст',
    es: 'Sentido', 'pt-BR': "Sentido", vi: "Nghĩa", id: "Makna", tr: "Anlam", pl: "Sens",
  },
  connector_bridge: {
    ru: 'Связка',
    uk: 'Зв\'язка',
    es: 'Conector', 'pt-BR': "Conector", vi: "Liên kết", id: "Penghubung", tr: "Bağlantı", pl: "Łącznik",
  },
  rule_contrast: {
    ru: 'Контраст',
    uk: 'Контраст',
    es: 'Contraste', 'pt-BR': "Contraste", vi: "Tương phản", id: "Kontras", tr: "Karşıtlık", pl: "Kontrast",
  },
};

const CATEGORY_FOCUS_CHIPS: Record<Exclude<WordCategory, 'other'>, PosWorkoutLocaleChips> = {
  syntax: {
    ru: ['word order', 'person + thing', 'it to me'],
    uk: ['word order', 'person + thing', 'it to me'],
    es: ['orden', 'persona + cosa', 'it to me'], 'pt-BR': ["ordem das palavras","pessoa + coisa","it to me"], vi: ["trật tự từ","người + vật","it to me"], id: ["urutan kata","orang + benda","it to me"], tr: ["kelime sırası","kişi + şey","it to me"], pl: ["szyk słów","osoba + rzecz","it to me"],
  },
  verb: {
    ru: ['действие', 'время', 'субъект'],
    uk: ['дія', 'час', 'підмет'],
    es: ['acción', 'tiempo', 'sujeto'], 'pt-BR': ["ação","tempo verbal","sujeito"], vi: ["hành động","thì","chủ ngữ"], id: ["tindakan","tense","subjek"], tr: ["eylem","zaman","özne"], pl: ["działanie","czas","podmiot"],
  },
  noun: {
    ru: ['предмет', 'число', 'роль'],
    uk: ['предмет', 'число', 'роль'],
    es: ['objeto', 'número', 'rol'], 'pt-BR': ["objeto","número","papel"], vi: ["đồ vật","số","vai trò"], id: ["objek","jumlah","peran"], tr: ["nesne","sayı","rol"], pl: ["przedmiot","liczba","rola"],
  },
  pronoun: {
    ru: ['лицо', 'объект', 'принадлежность'],
    uk: ['особа', 'об\'єкт', 'належність'],
    es: ['persona', 'objeto', 'posesión'], 'pt-BR': ["pessoa","objeto","posse"], vi: ["ngôi","tân ngữ","sở hữu"], id: ["orang","objek","kepemilikan"], tr: ["kişi","nesne","iyelik"], pl: ["osoba","dopełnienie","posiadanie"],
  },
  adjective: {
    ru: ['качество', 'сравнение', 'описание'],
    uk: ['якість', 'порівняння', 'опис'],
    es: ['cualidad', 'comparación', 'descripción'], 'pt-BR': ["qualidade","comparação","descrição"], vi: ["phẩm chất","so sánh","mô tả"], id: ["kualitas","perbandingan","deskripsi"], tr: ["nitelik","karşılaştırma","tanım"], pl: ["cecha","porównanie","opis"],
  },
  adverb: {
    ru: ['как', 'где', 'когда'],
    uk: ['як', 'де', 'коли'],
    es: ['cómo', 'dónde', 'cuándo'], 'pt-BR': ["como","onde","quando"], vi: ["như thế nào","ở đâu","khi nào"], id: ["bagaimana","di mana","kapan"], tr: ["nasıl","nerede","ne zaman"], pl: ["jak","gdzie","kiedy"],
  },
  modifier: {
    ru: ['too/enough', 'very/really', 'quite'],
    uk: ['too/enough', 'very/really', 'quite'],
    es: ['too/enough', 'very/really', 'quite'], 'pt-BR': ["too/enough","very/really","quite"], vi: ["too/enough","very/really","quite"], id: ["too/enough","very/really","quite"], tr: ["too/enough","very/really","quite"], pl: ["too/enough","very/really","quite"],
  },
  preposition: {
    ru: ['связь', 'место', 'направление'],
    uk: ['зв\'язок', 'місце', 'напрям'],
    es: ['relación', 'lugar', 'dirección'], 'pt-BR': ["relação","lugar","direção"], vi: ["quan hệ","nơi chốn","hướng"], id: ["relasi","tempat","arah"], tr: ["ilişki","yer","yön"], pl: ["relacja","miejsce","kierunek"],
  },
  article: {
    ru: ['новый/известный', 'один/общий', 'a/an/the'],
    uk: ['новий/відомий', 'один/загальний', 'a/an/the'],
    es: ['nuevo/conocido', 'uno/general', 'a/an/the'], 'pt-BR': ["novo/conhecido","um/geral","a/an/the"], vi: ["mới/đã biết","một/chung","a/an/the"], id: ["baru/diketahui","satu/umum","a/an/the"], tr: ["yeni/bilinen","bir/genel","a/an/the"], pl: ["nowe/znane","jedno/ogólne","a/an/the"],
  },
  determiner: {
    ru: ['some/any', 'no/not any', 'quantity'],
    uk: ['some/any', 'no/not any', 'quantity'],
    es: ['some/any', 'no/not any', 'cantidad'], 'pt-BR': ["some/any","no/not any","quantidade"], vi: ["some/any","no/not any","số lượng"], id: ["some/any","no/not any","jumlah"], tr: ["some/any","no/not any","miktar"], pl: ["some/any","no/not any","ilość"],
  },
  existential: {
    ru: ['there is/are', 'singular/plural', 'existence'],
    uk: ['there is/are', 'singular/plural', 'existence'],
    es: ['there is/are', 'singular/plural', 'existencia'], 'pt-BR': ["there is/are","singular/plural","existência"], vi: ["there is/are","số ít/số nhiều","sự tồn tại"], id: ["there is/are","singular/plural","keberadaan"], tr: ["there is/are","tekil/çoğul","varlık"], pl: ["there is/are","liczba poj./mn.","istnienie"],
  },
  'to-be': {
    ru: ['лицо', 'число', 'время'],
    uk: ['особа', 'число', 'час'],
    es: ['persona', 'número', 'tiempo'], 'pt-BR': ["pessoa","número","tempo"], vi: ["ngôi","số","thì"], id: ["orang","jumlah","tense"], tr: ["kişi","sayı","zaman"], pl: ["osoba","liczba","czas"],
  },
  conjunction: {
    ru: ['причина', 'контраст', 'условие'],
    uk: ['причина', 'контраст', 'умова'],
    es: ['causa', 'contraste', 'condición'], 'pt-BR': ["causa","contraste","condição"], vi: ["nguyên nhân","tương phản","điều kiện"], id: ["sebab","kontras","kondisi"], tr: ["neden","karşıtlık","koşul"], pl: ["przyczyna","kontrast","warunek"],
  },
  modal: {
    ru: ['возможность', 'обязанность', 'совет'],
    uk: ['можливість', 'обов\'язок', 'порада'],
    es: ['posibilidad', 'obligación', 'consejo'], 'pt-BR': ["possibilidade","obrigação","conselho"], vi: ["khả năng","nghĩa vụ","lời khuyên"], id: ["kemungkinan","kewajiban","saran"], tr: ["olasılık","zorunluluk","tavsiye"], pl: ["możliwość","obowiązek","rada"],
  },
  phrasal_particle: {
    ru: ['глагол', 'частица', 'новый смысл'],
    uk: ['дієслово', 'частка', 'новий зміст'],
    es: ['verbo', 'partícula', 'nuevo sentido'], 'pt-BR': ["verbo","partícula","novo sentido"], vi: ["động từ","particle","nghĩa mới"], id: ["kata kerja","partikel","makna baru"], tr: ["fiil","parçacık","yeni anlam"], pl: ["czasownik","partykuła","nowy sens"],
  },
};

export const USER_FACING_POS_CATEGORIES: WordCategory[] = [
  'verb',
  'noun',
  'pronoun',
  'adjective',
  'adverb',
  'modifier',
  'preposition',
  'syntax',
  'article',
  'determiner',
  'existential',
  'to-be',
  'conjunction',
  'modal',
  'phrasal_particle',
];

const PROFILES: Record<Exclude<WordCategory, 'other'>, PosWorkoutProfile> = {
  syntax: {
    category: 'syntax',
    drillType: 'order_rebuild',
    icon: 'swap-horizontal-outline',
    accent: '#7C3AED',
    title: { ru: 'Syntax', uk: 'Syntax', es: 'Sintaxis', 'pt-BR': "Sintaxe", vi: "Cú pháp", id: "Sintaksis", tr: "Sözdizimi", pl: "Składnia" },
    drillLabel: { ru: 'word order', uk: 'word order', es: 'orden de palabras', 'pt-BR': "ordem das palavras", vi: "trật tự từ", id: "urutan kata", tr: "kelime sırası", pl: "szyk słów" },
    coachLine: {
      ru: 'Find the two objects: person and thing. Then choose person + thing or thing + to/for + person.',
      uk: 'Find the two objects: person and thing. Then choose person + thing or thing + to/for + person.',
      es: 'Encuentra los dos objetos: persona y cosa. Luego elige el orden correcto.', 'pt-BR': "Encontre os dois objetos: pessoa e coisa. Depois escolha pessoa + coisa ou coisa + to/for + pessoa.", vi: "Tìm hai tân ngữ: người và vật. Sau đó chọn người + vật hoặc vật + to/for + người.", id: "Temukan dua objek: orang dan benda. Lalu pilih orang + benda atau benda + to/for + orang.", tr: "İki nesneyi bul: kişi ve şey. Sonra kişi + şey ya da şey + to/for + kişi sırasını seç.", pl: "Znajdź dwa dopełnienia: osobę i rzecz. Potem wybierz osoba + rzecz albo rzecz + to/for + osoba.",
    },
    mistakeWhy: {
      ru: 'The signal points to object order after verbs like give, send, show, tell, buy, or make.',
      uk: 'The signal points to object order after verbs like give, send, show, tell, buy, or make.',
      es: 'La senal apunta al orden de objetos con give, send, show, tell, buy o make.', 'pt-BR': "O sinal aponta para ordem dos objetos depois de verbos como give, send, show, tell, buy ou make.", vi: "Tín hiệu hướng tới thứ tự tân ngữ sau các động từ như give, send, show, tell, buy hoặc make.", id: "Sinyalnya mengarah ke urutan objek setelah kata kerja seperti give, send, show, tell, buy, atau make.", tr: "Sinyal give, send, show, tell, buy ya da make gibi fiillerden sonra nesne sırasına işaret ediyor.", pl: "Sygnał wskazuje na szyk dopełnień po czasownikach takich jak give, send, show, tell, buy albo make.",
    },
    nextStep: {
      ru: 'We will contrast give me the book, give it to me, send it to her, and buy it for me.',
      uk: 'We will contrast give me the book, give it to me, send it to her, and buy it for me.',
      es: 'Contrastaremos give me the book, give it to me, send it to her y buy it for me.', 'pt-BR': "Vamos contrastar give me the book, give it to me, send it to her e buy it for me.", vi: "Ta sẽ đối chiếu give me the book, give it to me, send it to her và buy it for me.", id: "Kita akan membedakan give me the book, give it to me, send it to her, dan buy it for me.", tr: "give me the book, give it to me, send it to her ve buy it for me yapılarını karşılaştıracağız.", pl: "Porównamy give me the book, give it to me, send it to her i buy it for me.",
    },
  },
  verb: {
    category: 'verb',
    drillType: 'form_choice',
    icon: 'flash-outline',
    accent: '#F97316',
    title: { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos', 'pt-BR': "Verbos", vi: "Động từ", id: "Kata kerja", tr: "Fiiller", pl: "Czasowniki" },
    drillLabel: { ru: 'форма и время', uk: 'форма і час', es: 'forma y tiempo', 'pt-BR': "forma e tempo", vi: "dạng và thì", id: "bentuk dan tense", tr: "biçim ve zaman", pl: "forma i czas" },
    coachLine: {
      ru: 'Тренируем формы глагола в контексте фразы.',
      uk: 'Тренуємо форми дієслова в контексті фрази.',
      es: 'Practicamos formas verbales dentro de la frase.', 'pt-BR': "Treinamos formas verbais dentro do contexto da frase.", vi: "Luyện dạng động từ trong ngữ cảnh của câu.", id: "Kita melatih bentuk kata kerja dalam konteks frasa.", tr: "Fiil biçimlerini cümlenin bağlamında çalışıyoruz.", pl: "Ćwiczymy formy czasownika w kontekście frazy.",
    },
    mistakeWhy: {
      ru: 'Ошибка похожа на смешение формы глагола или времени.',
      uk: 'Помилка схожа на змішання форми дієслова або часу.',
      es: 'El error parece venir de forma verbal o tiempo.', 'pt-BR': "O erro parece vir da forma verbal ou do tempo.", vi: "Lỗi có vẻ đến từ dạng động từ hoặc thì.", id: "Kesalahan tampaknya berasal dari bentuk kata kerja atau tense.", tr: "Hata fiil biçimi ya da zamandan geliyor gibi.", pl: "Błąd wygląda na problem z formą czasownika albo czasem.",
    },
    nextStep: {
      ru: 'Следующий пул даст больше контраста между похожими формами.',
      uk: 'Наступний пул дасть більше контрасту між схожими формами.',
      es: 'El siguiente bloque contrastará formas parecidas.', 'pt-BR': "O próximo bloco vai contrastar formas parecidas.", vi: "Khối tiếp theo sẽ đối chiếu các dạng gần giống nhau.", id: "Blok berikutnya akan membedakan bentuk-bentuk yang mirip.", tr: "Sonraki blok benzer biçimleri daha net karşılaştıracak.", pl: "Następny blok zestawi ze sobą podobne formy.",
    },
  },
  noun: {
    category: 'noun',
    drillType: 'meaning_map',
    icon: 'cube-outline',
    accent: '#22C55E',
    title: { ru: 'Существительные', uk: 'Іменники', es: 'Sustantivos', 'pt-BR': "Substantivos", vi: "Danh từ", id: "Kata benda", tr: "İsimler", pl: "Rzeczowniki" },
    drillLabel: { ru: 'предмет и число', uk: 'предмет і число', es: 'objeto y número', 'pt-BR': "objeto e número", vi: "đồ vật và số", id: "objek dan jumlah", tr: "nesne ve sayı", pl: "przedmiot i liczba" },
    coachLine: {
      ru: 'Привяжи слово к объекту, человеку, месту или времени.',
      uk: 'Прив\'яжи слово до об\'єкта, людини, місця або часу.',
      es: 'Une la palabra con objeto, persona, lugar o tiempo.', 'pt-BR': "Ligue a palavra a objeto, pessoa, lugar ou tempo.", vi: "Gắn từ với đồ vật, người, nơi chốn hoặc thời gian.", id: "Hubungkan kata dengan objek, orang, tempat, atau waktu.", tr: "Kelimeyi nesneye, kişiye, yere ya da zamana bağla.", pl: "Połącz słowo z przedmiotem, osobą, miejscem albo czasem.",
    },
    mistakeWhy: {
      ru: 'Здесь важна точная связь слова с предметом или количеством.',
      uk: 'Тут важливий точний зв\'язок слова з предметом або кількістю.',
      es: 'Aquí importa la relación exacta con objeto o cantidad.', 'pt-BR': "Aqui importa a relação exata com objeto ou quantidade.", vi: "Ở đây quan trọng là quan hệ chính xác với đồ vật hoặc số lượng.", id: "Di sini yang penting adalah relasi tepat dengan objek atau jumlah.", tr: "Burada nesne ya da miktarla kurulan tam ilişki önemli.", pl: "Tutaj ważna jest dokładna relacja z przedmiotem albo ilością.",
    },
    nextStep: {
      ru: 'Дальше тренер смешает близкие существительные, чтобы убрать угадывание.',
      uk: 'Далі тренер змішає близькі іменники, щоб прибрати вгадування.',
      es: 'Luego mezclaremos sustantivos cercanos para evitar adivinar.', 'pt-BR': "Depois vamos misturar substantivos próximos para reduzir adivinhação.", vi: "Sau đó ta sẽ trộn các danh từ gần nghĩa để giảm đoán mò.", id: "Selanjutnya kita mencampur kata benda yang dekat agar tidak sekadar menebak.", tr: "Sonra tahmini azaltmak için yakın isimleri karıştıracağız.", pl: "Potem wymieszamy bliskie rzeczowniki, żeby ograniczyć zgadywanie.",
    },
  },
  pronoun: {
    category: 'pronoun',
    drillType: 'slot_anchor',
    icon: 'person-outline',
    accent: '#38BDF8',
    title: { ru: 'Местоимения', uk: 'Займенники', es: 'Pronombres', 'pt-BR': "Pronomes", vi: "Đại từ", id: "Kata ganti", tr: "Zamirler", pl: "Zaimki" },
    drillLabel: { ru: 'кто кому принадлежит', uk: 'хто кому належить', es: 'quién y de quién', 'pt-BR': "quem e de quem", vi: "ai và của ai", id: "siapa dan milik siapa", tr: "kim ve kimin", pl: "kto i czyje" },
    coachLine: {
      ru: 'Проверь лицо: кто делает действие и кому принадлежит объект.',
      uk: 'Перевір особу: хто робить дію й кому належить об\'єкт.',
      es: 'Comprueba persona: quién actúa y de quién es el objeto.', 'pt-BR': "Verifique a pessoa: quem faz a ação e de quem é o objeto.", vi: "Kiểm tra ngôi: ai làm hành động và đồ vật thuộc về ai.", id: "Periksa orangnya: siapa yang melakukan tindakan dan milik siapa objeknya.", tr: "Kişiyi kontrol et: eylemi kim yapıyor ve nesne kime ait.", pl: "Sprawdź osobę: kto wykonuje czynność i do kogo należy obiekt.",
    },
    mistakeWhy: {
      ru: 'Сигнал указывает на путаницу лица, объекта или принадлежности.',
      uk: 'Сигнал вказує на плутанину особи, об\'єкта або належності.',
      es: 'La señal apunta a persona, objeto o posesión.', 'pt-BR': "O sinal aponta para confusão de pessoa, objeto ou posse.", vi: "Tín hiệu hướng tới nhầm lẫn về ngôi, tân ngữ hoặc sở hữu.", id: "Sinyalnya mengarah ke kebingungan orang, objek, atau kepemilikan.", tr: "Sinyal kişi, nesne ya da iyelik karışıklığına işaret ediyor.", pl: "Sygnał wskazuje na mylenie osoby, dopełnienia albo posiadania.",
    },
    nextStep: {
      ru: 'Пул даст короткие пары my/me/mine, he/him/his и похожие контрасты.',
      uk: 'Пул дасть короткі пари my/me/mine, he/him/his та схожі контрасти.',
      es: 'El bloque usará pares como my/me/mine y he/him/his.', 'pt-BR': "O bloco vai usar pares curtos como my/me/mine, he/him/his e contrastes parecidos.", vi: "Khối sẽ dùng các cặp ngắn như my/me/mine, he/him/his và các tương phản tương tự.", id: "Blok ini memakai pasangan pendek seperti my/me/mine, he/him/his, dan kontras serupa.", tr: "Blok my/me/mine, he/him/his gibi kısa çiftler ve benzer karşıtlıklar kullanacak.", pl: "Blok użyje krótkich par typu my/me/mine, he/him/his i podobnych kontrastów.",
    },
  },
  adjective: {
    category: 'adjective',
    drillType: 'meaning_map',
    icon: 'color-palette-outline',
    accent: '#EC4899',
    title: { ru: 'Прилагательные', uk: 'Прикметники', es: 'Adjetivos', 'pt-BR': "Adjetivos", vi: "Tính từ", id: "Kata sifat", tr: "Sıfatlar", pl: "Przymiotniki" },
    drillLabel: { ru: 'качество и сравнение', uk: 'якість і порівняння', es: 'cualidad y comparación', 'pt-BR': "qualidade e comparação", vi: "phẩm chất và so sánh", id: "kualitas dan perbandingan", tr: "nitelik ve karşılaştırma", pl: "cecha i porównanie" },
    coachLine: {
      ru: 'Спроси: какое это? Если есть сравнение, ищи степень.',
      uk: 'Запитай: яке це? Якщо є порівняння, шукай ступінь.',
      es: 'Pregunta: ¿cómo es? Si compara, busca el grado.', 'pt-BR': "Pergunte: como é? Se há comparação, procure o grau.", vi: "Hỏi: nó như thế nào? Nếu có so sánh, hãy tìm cấp độ.", id: "Tanyakan: seperti apa? Jika ada perbandingan, cari tingkatnya.", tr: "Sor: nasıl bir şey? Karşılaştırma varsa dereceyi ara.", pl: "Zapytaj: jakie to jest? Jeśli jest porównanie, szukaj stopnia.",
    },
    mistakeWhy: {
      ru: 'Похоже на ошибку в качестве, описании или степени сравнения.',
      uk: 'Схоже на помилку в якості, описі або ступені порівняння.',
      es: 'Parece un fallo de cualidad, descripción o comparación.', 'pt-BR': "Parece falha em qualidade, descrição ou grau de comparação.", vi: "Có vẻ là lỗi về phẩm chất, mô tả hoặc cấp so sánh.", id: "Sepertinya kesalahan pada kualitas, deskripsi, atau tingkat perbandingan.", tr: "Nitelik, tanım ya da karşılaştırma derecesinde hata gibi.", pl: "Wygląda na błąd cechy, opisu albo stopnia porównania.",
    },
    nextStep: {
      ru: 'Дальше будет больше контраста adjective/adverb и сравнительных форм.',
      uk: 'Далі буде більше контрасту adjective/adverb і форм порівняння.',
      es: 'Seguiremos con contraste adjective/adverb y comparativos.', 'pt-BR': "Vamos reforçar o contraste adjective/adverb e formas comparativas.", vi: "Ta sẽ luyện thêm tương phản adjective/adverb và dạng so sánh.", id: "Kita lanjutkan dengan kontras adjective/adverb dan bentuk comparative.", tr: "Adjective/adverb karşıtlığı ve comparative biçimleriyle devam edeceğiz.", pl: "Dalej będzie więcej kontrastu adjective/adverb i form porównawczych.",
    },
  },
  adverb: {
    category: 'adverb',
    drillType: 'slot_anchor',
    icon: 'speedometer-outline',
    accent: '#A3E635',
    title: { ru: 'Наречия', uk: 'Прислівники', es: 'Adverbios', 'pt-BR': "Advérbios", vi: "Trạng từ", id: "Kata keterangan", tr: "Zarflar", pl: "Przysłówki" },
    drillLabel: { ru: 'как, где, когда', uk: 'як, де, коли', es: 'cómo, dónde, cuándo', 'pt-BR': "como, onde, quando", vi: "như thế nào, ở đâu, khi nào", id: "bagaimana, di mana, kapan", tr: "nasıl, nerede, ne zaman", pl: "jak, gdzie, kiedy" },
    coachLine: {
      ru: 'Найди, что слово уточняет: действие, место, время или частоту.',
      uk: 'Знайди, що слово уточнює: дію, місце, час або частоту.',
      es: 'Mira qué precisa: acción, lugar, tiempo o frecuencia.', 'pt-BR': "Veja o que a palavra especifica: ação, lugar, tempo ou frequência.", vi: "Xem từ đang уточня điều gì: hành động, nơi chốn, thời gian hay tần suất.", id: "Lihat apa yang diperjelas kata itu: tindakan, tempat, waktu, atau frekuensi.", tr: "Kelimenin neyi belirttiğini bul: eylem, yer, zaman ya da sıklık.", pl: "Zobacz, co słowo doprecyzowuje: czynność, miejsce, czas albo częstotliwość.",
    },
    mistakeWhy: {
      ru: 'Ошибка похожа на пропуск уточнения: как, где, когда или насколько часто.',
      uk: 'Помилка схожа на пропуск уточнення: як, де, коли або як часто.',
      es: 'Parece faltar una precisión: cómo, dónde, cuándo o frecuencia.', 'pt-BR': "Parece faltar uma precisão: como, onde, quando ou com que frequência.", vi: "Có vẻ thiếu phần уточня: như thế nào, ở đâu, khi nào hoặc thường xuyên thế nào.", id: "Sepertinya ada penjelas yang hilang: bagaimana, di mana, kapan, atau seberapa sering.", tr: "Bir belirleme eksik gibi: nasıl, nerede, ne zaman ya da ne sıklıkta.", pl: "Wygląda na brak doprecyzowania: jak, gdzie, kiedy albo jak często.",
    },
    nextStep: {
      ru: 'Следующий пул закрепит позицию наречий в коротких фразах.',
      uk: 'Наступний пул закріпить позицію прислівників у коротких фразах.',
      es: 'El siguiente bloque fijará la posición de los adverbios.', 'pt-BR': "O próximo bloco vai fixar a posição dos advérbios em frases curtas.", vi: "Khối tiếp theo sẽ củng cố vị trí trạng từ trong các câu ngắn.", id: "Blok berikutnya akan memperkuat posisi adverbia dalam frasa pendek.", tr: "Sonraki blok kısa cümlelerde zarfların konumunu pekiştirecek.", pl: "Następny blok utrwali pozycję przysłówków w krótkich frazach.",
    },
  },
  modifier: {
    category: 'modifier',
    drillType: 'slot_anchor',
    icon: 'options-outline',
    accent: '#F59E0B',
    title: { ru: 'Modifiers', uk: 'Modifiers', es: 'Modificadores', 'pt-BR': "Modificadores", vi: "Từ bổ nghĩa", id: "Modifier", tr: "Niteleyiciler", pl: "Modyfikatory" },
    drillLabel: { ru: 'degree modifiers', uk: 'degree modifiers', es: 'modificadores de grado', 'pt-BR': "modificadores de grau", vi: "từ chỉ mức độ", id: "modifier derajat", tr: "derece belirteçleri", pl: "modyfikatory stopnia" },
    coachLine: {
      ru: 'Check meaning first: too is excess, enough is sufficient, very is neutral strength, really is emotional, quite is softer.',
      uk: 'Check meaning first: too is excess, enough is sufficient, very is neutral strength, really is emotional, quite is softer.',
      es: 'Primero revisa el sentido: too, enough, very, really o quite.', 'pt-BR': "Cheque o sentido primeiro: too é excesso, enough é suficiente, very é força neutra, really é emocional, quite é mais suave.", vi: "Kiểm tra nghĩa trước: too là quá mức, enough là đủ, very là mức mạnh trung tính, really cảm xúc hơn, quite nhẹ hơn.", id: "Periksa makna dulu: too berarti berlebihan, enough cukup, very kekuatan netral, really emosional, quite lebih lembut.", tr: "Önce anlamı kontrol et: too fazlalık, enough yeterlilik, very nötr güç, really duygusal, quite daha yumuşak.", pl: "Najpierw sprawdź sens: too to nadmiar, enough wystarczalność, very neutralne wzmocnienie, really emocjonalne, quite łagodniejsze.",
    },
    mistakeWhy: {
      ru: 'The signal points to degree modifier meaning or position before an adjective/adverb.',
      uk: 'The signal points to degree modifier meaning or position before an adjective/adverb.',
      es: 'La senal apunta al sentido o posicion de modificadores de grado.', 'pt-BR': "O sinal aponta para sentido ou posição do modificador de grau antes de adjective/adverb.", vi: "Tín hiệu hướng tới nghĩa hoặc vị trí của từ chỉ mức độ trước adjective/adverb.", id: "Sinyalnya mengarah ke makna atau posisi modifier derajat sebelum adjective/adverb.", tr: "Sinyal adjective/adverb öncesindeki derece belirtecinin anlamı ya da konumuna işaret ediyor.", pl: "Sygnał wskazuje na sens albo pozycję modyfikatora stopnia przed adjective/adverb.",
    },
    nextStep: {
      ru: 'We will contrast too hot, good enough, very useful, really tired, and quite difficult.',
      uk: 'We will contrast too hot, good enough, very useful, really tired, and quite difficult.',
      es: 'Contrastaremos too hot, good enough, very useful, really tired y quite difficult.', 'pt-BR': "Vamos contrastar too hot, good enough, very useful, really tired e quite difficult.", vi: "Ta sẽ đối chiếu too hot, good enough, very useful, really tired và quite difficult.", id: "Kita akan membedakan too hot, good enough, very useful, really tired, dan quite difficult.", tr: "too hot, good enough, very useful, really tired ve quite difficult yapılarını karşılaştıracağız.", pl: "Porównamy too hot, good enough, very useful, really tired i quite difficult.",
    },
  },
  preposition: {
    category: 'preposition',
    drillType: 'slot_anchor',
    icon: 'navigate-outline',
    accent: '#14B8A6',
    title: { ru: 'Предлоги', uk: 'Прийменники', es: 'Preposiciones', 'pt-BR': "Preposições", vi: "Giới từ", id: "Preposisi", tr: "Edatlar", pl: "Przyimki" },
    drillLabel: { ru: 'связь и направление', uk: 'зв\'язок і напрям', es: 'relación y dirección', 'pt-BR': "relação e direção", vi: "quan hệ và hướng", id: "relasi dan arah", tr: "ilişki ve yön", pl: "relacja i kierunek" },
    coachLine: {
      ru: 'Предлог показывает связь: место, направление, время или причину.',
      uk: 'Прийменник показує зв\'язок: місце, напрям, час або причину.',
      es: 'La preposición marca relación: lugar, dirección, tiempo o causa.', 'pt-BR': "A preposição mostra relação: lugar, direção, tempo ou causa.", vi: "Giới từ cho thấy quan hệ: nơi chốn, hướng, thời gian hoặc nguyên nhân.", id: "Preposisi menunjukkan relasi: tempat, arah, waktu, atau sebab.", tr: "Edat ilişkiyi gösterir: yer, yön, zaman ya da neden.", pl: "Przyimek pokazuje relację: miejsce, kierunek, czas albo przyczynę.",
    },
    mistakeWhy: {
      ru: 'Сигнал указывает на связь между словами, а не на само слово.',
      uk: 'Сигнал вказує на зв\'язок між словами, а не на саме слово.',
      es: 'La señal está en la relación entre palabras.', 'pt-BR': "O sinal aponta para a relação entre palavras, não para a palavra em si.", vi: "Tín hiệu nằm ở quan hệ giữa các từ, không phải bản thân từ.", id: "Sinyalnya ada pada relasi antarkata, bukan kata itu sendiri.", tr: "Sinyal kelimenin kendisinde değil, kelimeler arasındaki ilişkide.", pl: "Sygnał jest w relacji między słowami, nie w samym słowie.",
    },
    nextStep: {
      ru: 'Дальше будут пары in/on/at, to/for/from и короткие slot-дриллы.',
      uk: 'Далі будуть пари in/on/at, to/for/from і короткі slot-дрили.',
      es: 'Seguimos con pares in/on/at, to/for/from y slots cortos.', 'pt-BR': "Depois vêm pares in/on/at, to/for/from e slot drills curtos.", vi: "Tiếp theo là các cặp in/on/at, to/for/from và slot drills ngắn.", id: "Selanjutnya ada pasangan in/on/at, to/for/from, dan slot drill pendek.", tr: "Sırada in/on/at, to/for/from çiftleri ve kısa slot drill’ler var.", pl: "Dalej będą pary in/on/at, to/for/from i krótkie slot drills.",
    },
  },
  article: {
    category: 'article',
    drillType: 'slot_anchor',
    icon: 'text-outline',
    accent: '#FACC15',
    title: { ru: 'Артикли', uk: 'Артиклі', es: 'Artículos', 'pt-BR': "Artigos", vi: "Mạo từ", id: "Artikel", tr: "Artikeller", pl: "Przedimki" },
    drillLabel: { ru: 'a, an, the или ноль', uk: 'a, an, the або нуль', es: 'a, an, the o cero', 'pt-BR': "a, an, the ou zero", vi: "a, an, the hoặc zero", id: "a, an, the atau nol", tr: "a, an, the ya da sıfır", pl: "a, an, the albo zero" },
    coachLine: {
      ru: 'Проверь: предмет новый или уже известный, один или общий.',
      uk: 'Перевір: предмет новий чи вже відомий, один чи загальний.',
      es: 'Comprueba si es nuevo o conocido, uno o general.', 'pt-BR': "Verifique: o objeto é novo ou já conhecido, um ou geral.", vi: "Kiểm tra: vật đó mới hay đã biết, một hay chung chung.", id: "Periksa: bendanya baru atau sudah diketahui, satu atau umum.", tr: "Kontrol et: nesne yeni mi bilinen mi, bir tane mi genel mi.", pl: "Sprawdź: rzecz jest nowa czy znana, jedna czy ogólna.",
    },
    mistakeWhy: {
      ru: 'Ошибка именно в выборе определенности: a/an, the или без артикля.',
      uk: 'Помилка саме у виборі визначеності: a/an, the або без артикля.',
      es: 'El fallo está en definir: a/an, the o sin artículo.', 'pt-BR': "A falha está na definição: a/an, the ou sem artigo.", vi: "Lỗi nằm ở độ xác định: a/an, the hoặc không mạo từ.", id: "Kesalahannya ada pada penentuan: a/an, the, atau tanpa artikel.", tr: "Hata belirlilik seçiminde: a/an, the ya da artikelsiz.", pl: "Błąd jest w określoności: a/an, the albo bez przedimka.",
    },
    nextStep: {
      ru: 'Следующий пул будет строить микрофразы вокруг одного существительного.',
      uk: 'Наступний пул будуватиме мікрофрази навколо одного іменника.',
      es: 'El bloque creará microfrases alrededor de un sustantivo.', 'pt-BR': "O bloco vai criar microfrases em torno de um substantivo.", vi: "Khối sẽ tạo các micro-câu quanh một danh từ.", id: "Blok ini akan membuat mikrofrasa di sekitar satu kata benda.", tr: "Blok bir isim etrafında mikro cümleler kuracak.", pl: "Blok zbuduje mikrofazy wokół jednego rzeczownika.",
    },
  },
  determiner: {
    category: 'determiner',
    drillType: 'slot_anchor',
    icon: 'options-outline',
    accent: '#14B8A6',
    title: { ru: 'Determiners', uk: 'Determiners', es: 'Determinantes', 'pt-BR': "Determinantes", vi: "Từ hạn định", id: "Determiner", tr: "Belirleyiciler", pl: "Określniki" },
    drillLabel: { ru: 'some, any, no', uk: 'some, any, no', es: 'some, any, no', 'pt-BR': "some, any, no", vi: "some, any, no", id: "some, any, no", tr: "some, any, no", pl: "some, any, no" },
    coachLine: {
      ru: 'Check the sentence type: positive, negative, neutral question, offer, request, or free choice.',
      uk: 'Check the sentence type: positive, negative, neutral question, offer, request, or free choice.',
      es: 'Detecta el tipo de frase: afirmacion, negacion, pregunta, oferta, peticion o eleccion libre.', 'pt-BR': "Detecte o tipo de frase: afirmativa, negativa, pergunta neutra, oferta, pedido ou escolha livre.", vi: "Nhận diện kiểu câu: khẳng định, phủ định, câu hỏi trung tính, lời đề nghị, lời nhờ hoặc lựa chọn tự do.", id: "Kenali jenis kalimat: positif, negatif, pertanyaan netral, tawaran, permintaan, atau pilihan bebas.", tr: "Cümle türünü belirle: olumlu, olumsuz, nötr soru, teklif, rica ya da serbest seçim.", pl: "Rozpoznaj typ zdania: twierdzenie, przeczenie, neutralne pytanie, oferta, prośba albo wolny wybór.",
    },
    mistakeWhy: {
      ru: 'The signal points to quantity logic: some for positive amount, any for negative/question, some for offers and requests.',
      uk: 'The signal points to quantity logic: some for positive amount, any for negative/question, some for offers and requests.',
      es: 'La senal apunta a cantidad: some en positivo, any en negacion/pregunta, some en ofertas y peticiones.', 'pt-BR': "O sinal aponta para lógica de quantidade: some em positivo, any em negativa/pergunta, some em ofertas e pedidos.", vi: "Tín hiệu hướng tới logic số lượng: some trong khẳng định, any trong phủ định/câu hỏi, some trong đề nghị và lời nhờ.", id: "Sinyalnya mengarah ke logika jumlah: some untuk positif, any untuk negatif/pertanyaan, some untuk tawaran dan permintaan.", tr: "Sinyal miktar mantığına işaret ediyor: olumlu miktarda some, olumsuz/soruda any, teklif ve ricalarda some.", pl: "Sygnał wskazuje na logikę ilości: some w twierdzeniu, any w przeczeniu/pytaniu, some w ofertach i prośbach.",
    },
    nextStep: {
      ru: 'Next we contrast some/any/no in short slots and mixed review.',
      uk: 'Next we contrast some/any/no in short slots and mixed review.',
      es: 'Luego contrastamos some/any/no en huecos cortos y repaso mixto.', 'pt-BR': "Depois vamos contrastar some/any/no em lacunas curtas e revisão mista.", vi: "Tiếp theo ta sẽ đối chiếu some/any/no trong chỗ trống ngắn và ôn tập trộn.", id: "Selanjutnya kita membedakan some/any/no dalam slot pendek dan review campuran.", tr: "Sonra kısa boşluklarda ve karma tekrar içinde some/any/no karşılaştıracağız.", pl: "Potem porównamy some/any/no w krótkich lukach i mieszanej powtórce.",
    },
  },
  existential: {
    category: 'existential',
    drillType: 'form_choice',
    icon: 'albums-outline',
    accent: '#0EA5E9',
    title: { ru: 'There is / There are', uk: 'There is / There are', es: 'There is / There are', 'pt-BR': "There is / There are", vi: "There is / There are", id: "There is / There are", tr: "There is / There are", pl: "There is / There are" },
    drillLabel: { ru: 'existence and number', uk: 'existence and number', es: 'existencia y numero', 'pt-BR': "existência e número", vi: "sự tồn tại và số", id: "keberadaan dan jumlah", tr: "varlık ve sayı", pl: "istnienie i liczba" },
    coachLine: {
      ru: 'Look after there: one/uncountable uses is, plural uses are.',
      uk: 'Look after there: one/uncountable uses is, plural uses are.',
      es: 'Mira despues de there: uno/uncountable usa is, plural usa are.', 'pt-BR': "Olhe depois de there: um/uncountable usa is, plural usa are.", vi: "Nhìn sau there: một/uncountable dùng is, số nhiều dùng are.", id: "Lihat setelah there: satu/uncountable memakai is, plural memakai are.", tr: "there sonrasına bak: tekil/sayılamayan is, çoğul are kullanır.", pl: "Spójrz po there: jedno/uncountable używa is, liczba mnoga używa are.",
    },
    mistakeWhy: {
      ru: 'The signal points to existence grammar: there is for one or uncountable, there are for plural.',
      uk: 'The signal points to existence grammar: there is for one or uncountable, there are for plural.',
      es: 'La senal apunta a existencia: there is para uno o uncountable, there are para plural.', 'pt-BR': "O sinal aponta para gramática de existência: there is para um ou uncountable, there are para plural.", vi: "Tín hiệu hướng tới ngữ pháp tồn tại: there is cho một/uncountable, there are cho số nhiều.", id: "Sinyalnya mengarah ke tata bahasa keberadaan: there is untuk satu atau uncountable, there are untuk plural.", tr: "Sinyal varlık gramerine işaret ediyor: bir tane/sayılamayan için there is, çoğul için there are.", pl: "Sygnał wskazuje na gramatykę istnienia: there is dla jednego/uncountable, there are dla liczby mnogiej.",
    },
    nextStep: {
      ru: 'We will contrast there is, there are, questions, negatives, and uncountable nouns.',
      uk: 'We will contrast there is, there are, questions, negatives, and uncountable nouns.',
      es: 'Contrastaremos there is, there are, preguntas, negaciones y uncountable nouns.', 'pt-BR': "Vamos contrastar there is, there are, perguntas, negativas e uncountable nouns.", vi: "Ta sẽ đối chiếu there is, there are, câu hỏi, phủ định và uncountable nouns.", id: "Kita akan membedakan there is, there are, pertanyaan, negatif, dan uncountable nouns.", tr: "there is, there are, sorular, olumsuzlar ve uncountable nouns yapılarını karşılaştıracağız.", pl: "Porównamy there is, there are, pytania, przeczenia i uncountable nouns.",
    },
  },
  'to-be': {
    category: 'to-be',
    drillType: 'form_choice',
    icon: 'git-branch-outline',
    accent: '#818CF8',
    title: { ru: 'Глагол to be', uk: 'Дієслово to be', es: 'Verbo to be', 'pt-BR': "Verbo to be", vi: "Động từ to be", id: "Kata kerja to be", tr: "to be fiili", pl: "Czasownik to be" },
    drillLabel: { ru: 'am, is, are, was, were', uk: 'am, is, are, was, were', es: 'am, is, are, was, were', 'pt-BR': "am, is, are, was, were", vi: "am, is, are, was, were", id: "am, is, are, was, were", tr: "am, is, are, was, were", pl: "am, is, are, was, were" },
    coachLine: {
      ru: 'Сначала выбери подлежащее и время, потом форму to be.',
      uk: 'Спочатку обери підмет і час, потім форму to be.',
      es: 'Elige sujeto y tiempo antes de la forma de to be.', 'pt-BR': "Escolha primeiro o sujeito e o tempo, depois a forma de to be.", vi: "Chọn chủ ngữ và thì trước, rồi chọn dạng to be.", id: "Pilih dulu subjek dan tense, lalu bentuk to be.", tr: "Önce özneyi ve zamanı seç, sonra to be biçimini.", pl: "Najpierw wybierz podmiot i czas, potem formę to be.",
    },
    mistakeWhy: {
      ru: 'Ошибка похожа на смешение лица или времени в to be.',
      uk: 'Помилка схожа на змішання особи або часу в to be.',
      es: 'Parece mezcla de persona o tiempo en to be.', 'pt-BR': "O erro parece misturar pessoa ou tempo em to be.", vi: "Lỗi có vẻ là nhầm ngôi hoặc thì trong to be.", id: "Kesalahan tampaknya mencampur orang atau tense dalam to be.", tr: "Hata to be içinde kişi ya da zaman karışmasına benziyor.", pl: "Błąd wygląda na mieszanie osoby albo czasu w to be.",
    },
    nextStep: {
      ru: 'Дальше тренер даст быстрые пары I am, he is, they are, was/were.',
      uk: 'Далі тренер дасть швидкі пари I am, he is, they are, was/were.',
      es: 'Seguiremos con pares I am, he is, they are, was/were.', 'pt-BR': "Depois o treinador vai dar pares rápidos I am, he is, they are, was/were.", vi: "Tiếp theo trainer sẽ cho các cặp nhanh I am, he is, they are, was/were.", id: "Selanjutnya trainer memberi pasangan cepat I am, he is, they are, was/were.", tr: "Sonra antrenör hızlı I am, he is, they are, was/were çiftleri verecek.", pl: "Dalej trener poda szybkie pary I am, he is, they are, was/were.",
    },
  },
  conjunction: {
    category: 'conjunction',
    drillType: 'order_rebuild',
    icon: 'link-outline',
    accent: '#06B6D4',
    title: { ru: 'Союзы', uk: 'Сполучники', es: 'Conjunciones', 'pt-BR': "Conjunções", vi: "Liên từ", id: "Konjungsi", tr: "Bağlaçlar", pl: "Spójniki" },
    drillLabel: { ru: 'связь частей фразы', uk: 'зв\'язок частин фрази', es: 'conectar ideas', 'pt-BR': "conectar ideias", vi: "nối ý", id: "menghubungkan ide", tr: "fikirleri bağlama", pl: "łączenie myśli" },
    coachLine: {
      ru: 'Союз объясняет, как две части фразы связаны по смыслу.',
      uk: 'Сполучник пояснює, як дві частини фрази пов\'язані за змістом.',
      es: 'La conjunción explica cómo se conectan dos ideas.', 'pt-BR': "A conjunção explica como duas partes da frase se conectam pelo sentido.", vi: "Liên từ giải thích hai phần của câu liên kết theo nghĩa như thế nào.", id: "Konjungsi menjelaskan bagaimana dua bagian frasa terhubung secara makna.", tr: "Bağlaç iki cümle parçasının anlamca nasıl bağlandığını açıklar.", pl: "Spójnik wyjaśnia, jak dwie części frazy łączą się znaczeniowo.",
    },
    mistakeWhy: {
      ru: 'Ошибка похожа на неверную связь: причина, контраст, условие или добавление.',
      uk: 'Помилка схожа на хибний зв\'язок: причина, контраст, умова або додавання.',
      es: 'Parece una conexión equivocada: causa, contraste, condición o suma.', 'pt-BR': "O erro parece uma conexão errada: causa, contraste, condição ou adição.", vi: "Lỗi có vẻ là liên kết sai: nguyên nhân, tương phản, điều kiện hoặc thêm ý.", id: "Kesalahan tampak seperti koneksi yang salah: sebab, kontras, kondisi, atau penambahan.", tr: "Hata yanlış bağlantı gibi: neden, karşıtlık, koşul ya da ekleme.", pl: "Błąd wygląda na złą relację: przyczyna, kontrast, warunek albo dodanie.",
    },
    nextStep: {
      ru: 'Пул даст короткие связки and/but/because/if в мини-контексте.',
      uk: 'Пул дасть короткі зв\'язки and/but/because/if у мініконтексті.',
      es: 'Usaremos and/but/because/if en contexto corto.', 'pt-BR': "O bloco vai usar and/but/because/if em mini-contexto.", vi: "Khối sẽ dùng and/but/because/if trong ngữ cảnh mini.", id: "Blok memakai and/but/because/if dalam mini-konteks.", tr: "Blok mini bağlamda and/but/because/if kullanacak.", pl: "Blok użyje and/but/because/if w mini-kontekście.",
    },
  },
  modal: {
    category: 'modal',
    drillType: 'rule_contrast',
    icon: 'options-outline',
    accent: '#C084FC',
    title: { ru: 'Модальные глаголы', uk: 'Модальні дієслова', es: 'Verbos modales', 'pt-BR': "Verbos modais", vi: "Động từ modal", id: "Kata kerja modal", tr: "Modal fiiller", pl: "Czasowniki modalne" },
    drillLabel: { ru: 'можно, нужно, стоит', uk: 'можна, треба, варто', es: 'posibilidad y obligación', 'pt-BR': "possibilidade e obrigação", vi: "khả năng và nghĩa vụ", id: "kemungkinan dan kewajiban", tr: "olasılık ve zorunluluk", pl: "możliwość i obowiązek" },
    coachLine: {
      ru: 'Модалка задаёт отношение: возможность, обязанность, совет или запрет.',
      uk: 'Модалка задає ставлення: можливість, обов\'язок, пораду або заборону.',
      es: 'El modal marca posibilidad, obligación, consejo o prohibición.', 'pt-BR': "O modal marca possibilidade, obrigação, conselho ou proibição.", vi: "Modal đánh dấu khả năng, nghĩa vụ, lời khuyên hoặc cấm đoán.", id: "Modal menandai kemungkinan, kewajiban, saran, atau larangan.", tr: "Modal olasılık, zorunluluk, tavsiye ya da yasağı belirtir.", pl: "Modal oznacza możliwość, obowiązek, radę albo zakaz.",
    },
    mistakeWhy: {
      ru: 'Сигнал указывает не на действие, а на отношение к действию.',
      uk: 'Сигнал вказує не на дію, а на ставлення до дії.',
      es: 'La señal no es la acción, sino la actitud hacia la acción.', 'pt-BR': "O sinal não é a ação, mas a atitude em relação à ação.", vi: "Tín hiệu không nằm ở hành động, mà ở thái độ đối với hành động.", id: "Sinyalnya bukan tindakannya, melainkan sikap terhadap tindakan.", tr: "Sinyal eylemin kendisi değil, eyleme karşı tutum.", pl: "Sygnał nie dotyczy czynności, tylko nastawienia do czynności.",
    },
    nextStep: {
      ru: 'Дальше будет контраст can/could, must/should, may/might.',
      uk: 'Далі буде контраст can/could, must/should, may/might.',
      es: 'Seguiremos con can/could, must/should, may/might.', 'pt-BR': "Depois vem o contraste can/could, must/should, may/might.", vi: "Tiếp theo là tương phản can/could, must/should, may/might.", id: "Selanjutnya kontras can/could, must/should, may/might.", tr: "Sonra can/could, must/should, may/might karşıtlığı var.", pl: "Dalej będzie kontrast can/could, must/should, may/might.",
    },
  },
  phrasal_particle: {
    category: 'phrasal_particle',
    drillType: 'rule_contrast',
    icon: 'swap-horizontal-outline',
    accent: '#F43F5E',
    title: { ru: 'Фразовые частицы', uk: 'Фразові частки', es: 'Partículas verbales', 'pt-BR': "Partículas frasais", vi: "Particle trong phrasal verb", id: "Partikel frasal", tr: "Phrasal parçacıklar", pl: "Partykuły frazowe" },
    drillLabel: { ru: 'глагол плюс частица', uk: 'дієслово плюс частка', es: 'verbo más partícula', 'pt-BR': "verbo mais partícula", vi: "động từ cộng particle", id: "kata kerja plus partikel", tr: "fiil artı parçacık", pl: "czasownik plus partykuła" },
    coachLine: {
      ru: 'Частица меняет смысл глагола: смотри на пару целиком.',
      uk: 'Частка змінює сенс дієслова: дивись на пару повністю.',
      es: 'La partícula cambia el verbo: mira la pareja completa.', 'pt-BR': "A partícula muda o verbo: olhe para o par completo.", vi: "Particle làm đổi nghĩa động từ: hãy nhìn cả cặp.", id: "Partikel mengubah kata kerja: lihat pasangan lengkapnya.", tr: "Parçacık fiili değiştirir: bütün ikiliye bak.", pl: "Partykuła zmienia czasownik: patrz na całą parę.",
    },
    mistakeWhy: {
      ru: 'Ошибка похожа на выбор знакомого глагола без нужной частицы.',
      uk: 'Помилка схожа на вибір знайомого дієслова без потрібної частки.',
      es: 'Parece elegir el verbo conocido sin la partícula correcta.', 'pt-BR': "Parece escolher o verbo conhecido sem a partícula certa.", vi: "Có vẻ chọn động từ quen thuộc nhưng thiếu particle đúng.", id: "Sepertinya memilih kata kerja yang dikenal tanpa partikel yang tepat.", tr: "Tanıdık fiili doğru parçacık olmadan seçme hatası gibi.", pl: "Wygląda na wybór znanego czasownika bez właściwej partykuły.",
    },
    nextStep: {
      ru: 'Пул будет тренировать pick up, turn on, get off и похожие пары целиком.',
      uk: 'Пул тренуватиме pick up, turn on, get off та схожі пари повністю.',
      es: 'Entrenaremos pares completos como pick up, turn on, get off.', 'pt-BR': "Vamos treinar pares completos como pick up, turn on, get off.", vi: "Ta sẽ luyện cả cặp như pick up, turn on, get off.", id: "Kita akan melatih pasangan lengkap seperti pick up, turn on, get off.", tr: "pick up, turn on, get off gibi tam çiftleri çalışacağız.", pl: "Będziemy ćwiczyć całe pary typu pick up, turn on, get off.",
    },
  },
};

function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / POS_LEVEL_XP) + 1);
}

function masteryKey(category: WordCategory): WordCategory {
  return category;
}

async function loadMastery(): Promise<Partial<Record<WordCategory, PosMasteryEntry>>> {
  try {
    const raw = await AsyncStorage.getItem(POS_MASTERY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveMastery(items: Partial<Record<WordCategory, PosMasteryEntry>>): Promise<void> {
  await AsyncStorage.setItem(POS_MASTERY_KEY, JSON.stringify(items));
}

export function getPosWorkoutProfile(category?: WordCategory | null): PosWorkoutProfile | null {
  if (!category || !isUserFacingCategory(category)) return null;
  return PROFILES[category as Exclude<WordCategory, 'other'>] ?? null;
}

export function getPosDrillOptions(category: WordCategory | undefined, correct: string, candidates: string[] = []): string[] {
  const cleanCorrect = correct.trim();
  if (!cleanCorrect) return [];
  const defaults = category && category !== 'other'
    ? POS_DRILL_OPTIONS[category as Exclude<WordCategory, 'other'>] ?? []
    : [];
  const seen = new Set<string>();
  return [cleanCorrect, ...candidates, ...defaults]
    .map(option => option.trim())
    .filter(option => {
      const key = option.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

export function makePosSlotPrompt(phrase: string, token: string): string {
  const cleanToken = token.trim();
  if (!phrase.trim() || !cleanToken) return phrase;
  const escaped = cleanToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundary = /^[a-z]+$/i.test(cleanToken) ? `\\b${escaped}\\b` : escaped;
  return phrase.replace(new RegExp(boundary, 'i'), '___');
}

export function buildPosDrillPlan(input: PosDrillPlanInput): PosDrillPlan | null {
  const profile = getPosWorkoutProfile(input.category);
  const token = input.token.trim();
  const phrase = input.phrase.trim();
  if (!profile || !token || !phrase) return null;

  const slotPrompt = makePosSlotPrompt(phrase, token);
  const options = getPosDrillOptions(input.category, token, input.candidates);
  const translation = input.translation?.trim();
  const method = METHOD_BY_DRILL_TYPE[profile.drillType];
  const base = {
    drillType: profile.drillType,
    method,
    title: profile.title[input.lang],
    instruction: METHOD_INSTRUCTIONS[method][input.lang],
    answerLabel: METHOD_ANSWER_LABELS[method][input.lang],
    focusChips: CATEGORY_FOCUS_CHIPS[input.category as Exclude<WordCategory, 'other'>]?.[input.lang] ?? [],
    options,
    correct: token,
  };

  if (profile.drillType === 'meaning_map') {
    return {
      ...base,
      prompt: translation ? `${translation}\n${slotPrompt}` : slotPrompt,
      helper: `${profile.coachLine[input.lang]} ${profile.nextStep[input.lang]}`,
    };
  }

  if (profile.drillType === 'order_rebuild') {
    return {
      ...base,
      prompt: slotPrompt,
      helper: profile.nextStep[input.lang],
    };
  }

  if (profile.drillType === 'rule_contrast') {
    return {
      ...base,
      prompt: slotPrompt,
      helper: profile.mistakeWhy[input.lang],
    };
  }

  return {
    ...base,
    prompt: slotPrompt,
    helper: profile.coachLine[input.lang],
  };
}

export function resolveTrainerItemPosCategory(item: TrainerCategoryLike): WordCategory | undefined {
  if (item.category && isUserFacingCategory(item.category)) return item.category;
  const word = item.errorWord || (item.queue === 'words' ? item.key : item.arenaQuestion?.correct);
  const raw = item.grammarTag || item.arenaQuestion?.rule;
  const resolved = normalizeWordCategory(raw, word);
  return isUserFacingCategory(resolved.category) ? resolved.category : undefined;
}

export function getStrongestWeakPos(attempts: readonly PosAttemptSignal[]): WordCategory | null {
  const counts = new Map<WordCategory, number>();
  for (const attempt of attempts) {
    if (attempt.correct || !attempt.category || !isUserFacingCategory(attempt.category)) continue;
    counts.set(attempt.category, (counts.get(attempt.category) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function recordPosWorkoutResult(category: WordCategory | undefined, correct: boolean): Promise<PosMasteryReward | null> {
  if (!category || !isUserFacingCategory(category)) return null;
  const items = await loadMastery();
  const key: WordCategory = masteryKey(category);
  const now = Date.now();
  const previous = items[key] ?? {
    category,
    xp: 0,
    level: 1,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    lastPracticed: now,
  };
  const previousLevel = previous.level;
  const xpDelta = correct ? 16 : 6;
  const streak = correct ? previous.streak + 1 : 0;
  const next: PosMasteryEntry = {
    ...previous,
    xp: previous.xp + xpDelta,
    level: levelFromXp(previous.xp + xpDelta),
    correct: previous.correct + (correct ? 1 : 0),
    wrong: previous.wrong + (correct ? 0 : 1),
    streak,
    bestStreak: Math.max(previous.bestStreak, streak),
    lastPracticed: now,
  };
  items[key] = next;
  await saveMastery(items);
  return {
    category,
    xpDelta,
    previousLevel,
    entry: next,
    leveledUp: next.level > previousLevel,
  };
}

export async function getPosMasterySnapshot(): Promise<PosMasteryEntry[]> {
  const items = await loadMastery();
  return USER_FACING_POS_CATEGORIES
    .map(category => {
      const key: WordCategory = masteryKey(category);
      return items[key];
    })
    .filter((entry): entry is PosMasteryEntry => Boolean(entry))
    .sort((a, b) => b.level - a.level || b.xp - a.xp || b.lastPracticed - a.lastPracticed);
}

export async function clearPosMastery(): Promise<void> {
  await AsyncStorage.removeItem(POS_MASTERY_KEY);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
