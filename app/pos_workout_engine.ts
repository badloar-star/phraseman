import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Lang } from '../constants/i18n';
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

export interface PosWorkoutProfile {
  category: WordCategory;
  drillType: PosDrillType;
  icon: string;
  accent: string;
  title: Record<Lang, string>;
  drillLabel: Record<Lang, string>;
  coachLine: Record<Lang, string>;
  mistakeWhy: Record<Lang, string>;
  nextStep: Record<Lang, string>;
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

const METHOD_INSTRUCTIONS: Record<PosDrillMethod, Record<Lang, string>> = {
  form_agreement: {
    ru: 'Выбери форму, которая совпадает с субъектом, временем и смыслом.',
    uk: 'Обери форму, що збігається з підметом, часом і змістом.',
    es: 'Elige la forma que encaja con sujeto, tiempo y sentido.',
  },
  missing_slot: {
    ru: 'Вставь пропущенное слово в точную позицию фразы.',
    uk: 'Встав пропущене слово в точну позицію фрази.',
    es: 'Coloca la palabra que falta en la posición exacta.',
  },
  semantic_anchor: {
    ru: 'Сначала привяжи смысл к переводу, потом выбери слово.',
    uk: 'Спочатку прив\'яжи зміст до перекладу, потім обери слово.',
    es: 'Ancla el significado en la traducción y luego elige.',
  },
  connector_bridge: {
    ru: 'Определи, как две части фразы связаны по смыслу.',
    uk: 'Визнач, як дві частини фрази пов\'язані за змістом.',
    es: 'Detecta cómo se conectan las dos partes de la frase.',
  },
  rule_contrast: {
    ru: 'Сравни варианты: здесь меняется правило или смысл действия.',
    uk: 'Порівняй варіанти: тут змінюється правило або зміст дії.',
    es: 'Contrasta opciones: cambia la regla o el sentido.',
  },
};

const METHOD_ANSWER_LABELS: Record<PosDrillMethod, Record<Lang, string>> = {
  form_agreement: {
    ru: 'Форма',
    uk: 'Форма',
    es: 'Forma',
  },
  missing_slot: {
    ru: 'Слот',
    uk: 'Слот',
    es: 'Hueco',
  },
  semantic_anchor: {
    ru: 'Смысл',
    uk: 'Зміст',
    es: 'Sentido',
  },
  connector_bridge: {
    ru: 'Связка',
    uk: 'Зв\'язка',
    es: 'Conector',
  },
  rule_contrast: {
    ru: 'Контраст',
    uk: 'Контраст',
    es: 'Contraste',
  },
};

const CATEGORY_FOCUS_CHIPS: Record<Exclude<WordCategory, 'other'>, Record<Lang, string[]>> = {
  syntax: {
    ru: ['word order', 'person + thing', 'it to me'],
    uk: ['word order', 'person + thing', 'it to me'],
    es: ['orden', 'persona + cosa', 'it to me'],
  },
  verb: {
    ru: ['действие', 'время', 'субъект'],
    uk: ['дія', 'час', 'підмет'],
    es: ['acción', 'tiempo', 'sujeto'],
  },
  noun: {
    ru: ['предмет', 'число', 'роль'],
    uk: ['предмет', 'число', 'роль'],
    es: ['objeto', 'número', 'rol'],
  },
  pronoun: {
    ru: ['лицо', 'объект', 'принадлежность'],
    uk: ['особа', 'об\'єкт', 'належність'],
    es: ['persona', 'objeto', 'posesión'],
  },
  adjective: {
    ru: ['качество', 'сравнение', 'описание'],
    uk: ['якість', 'порівняння', 'опис'],
    es: ['cualidad', 'comparación', 'descripción'],
  },
  adverb: {
    ru: ['как', 'где', 'когда'],
    uk: ['як', 'де', 'коли'],
    es: ['cómo', 'dónde', 'cuándo'],
  },
  modifier: {
    ru: ['too/enough', 'very/really', 'quite'],
    uk: ['too/enough', 'very/really', 'quite'],
    es: ['too/enough', 'very/really', 'quite'],
  },
  preposition: {
    ru: ['связь', 'место', 'направление'],
    uk: ['зв\'язок', 'місце', 'напрям'],
    es: ['relación', 'lugar', 'dirección'],
  },
  article: {
    ru: ['новый/известный', 'один/общий', 'a/an/the'],
    uk: ['новий/відомий', 'один/загальний', 'a/an/the'],
    es: ['nuevo/conocido', 'uno/general', 'a/an/the'],
  },
  determiner: {
    ru: ['some/any', 'no/not any', 'quantity'],
    uk: ['some/any', 'no/not any', 'quantity'],
    es: ['some/any', 'no/not any', 'cantidad'],
  },
  existential: {
    ru: ['there is/are', 'singular/plural', 'existence'],
    uk: ['there is/are', 'singular/plural', 'existence'],
    es: ['there is/are', 'singular/plural', 'existencia'],
  },
  'to-be': {
    ru: ['лицо', 'число', 'время'],
    uk: ['особа', 'число', 'час'],
    es: ['persona', 'número', 'tiempo'],
  },
  conjunction: {
    ru: ['причина', 'контраст', 'условие'],
    uk: ['причина', 'контраст', 'умова'],
    es: ['causa', 'contraste', 'condición'],
  },
  modal: {
    ru: ['возможность', 'обязанность', 'совет'],
    uk: ['можливість', 'обов\'язок', 'порада'],
    es: ['posibilidad', 'obligación', 'consejo'],
  },
  phrasal_particle: {
    ru: ['глагол', 'частица', 'новый смысл'],
    uk: ['дієслово', 'частка', 'новий зміст'],
    es: ['verbo', 'partícula', 'nuevo sentido'],
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
    title: { ru: 'Syntax', uk: 'Syntax', es: 'Sintaxis' },
    drillLabel: { ru: 'word order', uk: 'word order', es: 'orden de palabras' },
    coachLine: {
      ru: 'Find the two objects: person and thing. Then choose person + thing or thing + to/for + person.',
      uk: 'Find the two objects: person and thing. Then choose person + thing or thing + to/for + person.',
      es: 'Encuentra los dos objetos: persona y cosa. Luego elige el orden correcto.',
    },
    mistakeWhy: {
      ru: 'The signal points to object order after verbs like give, send, show, tell, buy, or make.',
      uk: 'The signal points to object order after verbs like give, send, show, tell, buy, or make.',
      es: 'La senal apunta al orden de objetos con give, send, show, tell, buy o make.',
    },
    nextStep: {
      ru: 'We will contrast give me the book, give it to me, send it to her, and buy it for me.',
      uk: 'We will contrast give me the book, give it to me, send it to her, and buy it for me.',
      es: 'Contrastaremos give me the book, give it to me, send it to her y buy it for me.',
    },
  },
  verb: {
    category: 'verb',
    drillType: 'form_choice',
    icon: 'flash-outline',
    accent: '#F97316',
    title: { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos' },
    drillLabel: { ru: 'форма и время', uk: 'форма і час', es: 'forma y tiempo' },
    coachLine: {
      ru: 'Тренируем формы глагола в контексте фразы.',
      uk: 'Тренуємо форми дієслова в контексті фрази.',
      es: 'Practicamos formas verbales dentro de la frase.',
    },
    mistakeWhy: {
      ru: 'Ошибка похожа на смешение формы глагола или времени.',
      uk: 'Помилка схожа на змішання форми дієслова або часу.',
      es: 'El error parece venir de forma verbal o tiempo.',
    },
    nextStep: {
      ru: 'Следующий пул даст больше контраста между похожими формами.',
      uk: 'Наступний пул дасть більше контрасту між схожими формами.',
      es: 'El siguiente bloque contrastará formas parecidas.',
    },
  },
  noun: {
    category: 'noun',
    drillType: 'meaning_map',
    icon: 'cube-outline',
    accent: '#22C55E',
    title: { ru: 'Существительные', uk: 'Іменники', es: 'Sustantivos' },
    drillLabel: { ru: 'предмет и число', uk: 'предмет і число', es: 'objeto y número' },
    coachLine: {
      ru: 'Привяжи слово к объекту, человеку, месту или времени.',
      uk: 'Прив\'яжи слово до об\'єкта, людини, місця або часу.',
      es: 'Une la palabra con objeto, persona, lugar o tiempo.',
    },
    mistakeWhy: {
      ru: 'Здесь важна точная связь слова с предметом или количеством.',
      uk: 'Тут важливий точний зв\'язок слова з предметом або кількістю.',
      es: 'Aquí importa la relación exacta con objeto o cantidad.',
    },
    nextStep: {
      ru: 'Дальше тренер смешает близкие существительные, чтобы убрать угадывание.',
      uk: 'Далі тренер змішає близькі іменники, щоб прибрати вгадування.',
      es: 'Luego mezclaremos sustantivos cercanos para evitar adivinar.',
    },
  },
  pronoun: {
    category: 'pronoun',
    drillType: 'slot_anchor',
    icon: 'person-outline',
    accent: '#38BDF8',
    title: { ru: 'Местоимения', uk: 'Займенники', es: 'Pronombres' },
    drillLabel: { ru: 'кто кому принадлежит', uk: 'хто кому належить', es: 'quién y de quién' },
    coachLine: {
      ru: 'Проверь лицо: кто делает действие и кому принадлежит объект.',
      uk: 'Перевір особу: хто робить дію й кому належить об\'єкт.',
      es: 'Comprueba persona: quién actúa y de quién es el objeto.',
    },
    mistakeWhy: {
      ru: 'Сигнал указывает на путаницу лица, объекта или принадлежности.',
      uk: 'Сигнал вказує на плутанину особи, об\'єкта або належності.',
      es: 'La señal apunta a persona, objeto o posesión.',
    },
    nextStep: {
      ru: 'Пул даст короткие пары my/me/mine, he/him/his и похожие контрасты.',
      uk: 'Пул дасть короткі пари my/me/mine, he/him/his та схожі контрасти.',
      es: 'El bloque usará pares como my/me/mine y he/him/his.',
    },
  },
  adjective: {
    category: 'adjective',
    drillType: 'meaning_map',
    icon: 'color-palette-outline',
    accent: '#EC4899',
    title: { ru: 'Прилагательные', uk: 'Прикметники', es: 'Adjetivos' },
    drillLabel: { ru: 'качество и сравнение', uk: 'якість і порівняння', es: 'cualidad y comparación' },
    coachLine: {
      ru: 'Спроси: какое это? Если есть сравнение, ищи степень.',
      uk: 'Запитай: яке це? Якщо є порівняння, шукай ступінь.',
      es: 'Pregunta: ¿cómo es? Si compara, busca el grado.',
    },
    mistakeWhy: {
      ru: 'Похоже на ошибку в качестве, описании или степени сравнения.',
      uk: 'Схоже на помилку в якості, описі або ступені порівняння.',
      es: 'Parece un fallo de cualidad, descripción o comparación.',
    },
    nextStep: {
      ru: 'Дальше будет больше контраста adjective/adverb и сравнительных форм.',
      uk: 'Далі буде більше контрасту adjective/adverb і форм порівняння.',
      es: 'Seguiremos con contraste adjective/adverb y comparativos.',
    },
  },
  adverb: {
    category: 'adverb',
    drillType: 'slot_anchor',
    icon: 'speedometer-outline',
    accent: '#A3E635',
    title: { ru: 'Наречия', uk: 'Прислівники', es: 'Adverbios' },
    drillLabel: { ru: 'как, где, когда', uk: 'як, де, коли', es: 'cómo, dónde, cuándo' },
    coachLine: {
      ru: 'Найди, что слово уточняет: действие, место, время или частоту.',
      uk: 'Знайди, що слово уточнює: дію, місце, час або частоту.',
      es: 'Mira qué precisa: acción, lugar, tiempo o frecuencia.',
    },
    mistakeWhy: {
      ru: 'Ошибка похожа на пропуск уточнения: как, где, когда или насколько часто.',
      uk: 'Помилка схожа на пропуск уточнення: як, де, коли або як часто.',
      es: 'Parece faltar una precisión: cómo, dónde, cuándo o frecuencia.',
    },
    nextStep: {
      ru: 'Следующий пул закрепит позицию наречий в коротких фразах.',
      uk: 'Наступний пул закріпить позицію прислівників у коротких фразах.',
      es: 'El siguiente bloque fijará la posición de los adverbios.',
    },
  },
  modifier: {
    category: 'modifier',
    drillType: 'slot_anchor',
    icon: 'options-outline',
    accent: '#F59E0B',
    title: { ru: 'Modifiers', uk: 'Modifiers', es: 'Modificadores' },
    drillLabel: { ru: 'degree modifiers', uk: 'degree modifiers', es: 'modificadores de grado' },
    coachLine: {
      ru: 'Check meaning first: too is excess, enough is sufficient, very is neutral strength, really is emotional, quite is softer.',
      uk: 'Check meaning first: too is excess, enough is sufficient, very is neutral strength, really is emotional, quite is softer.',
      es: 'Primero revisa el sentido: too, enough, very, really o quite.',
    },
    mistakeWhy: {
      ru: 'The signal points to degree modifier meaning or position before an adjective/adverb.',
      uk: 'The signal points to degree modifier meaning or position before an adjective/adverb.',
      es: 'La senal apunta al sentido o posicion de modificadores de grado.',
    },
    nextStep: {
      ru: 'We will contrast too hot, good enough, very useful, really tired, and quite difficult.',
      uk: 'We will contrast too hot, good enough, very useful, really tired, and quite difficult.',
      es: 'Contrastaremos too hot, good enough, very useful, really tired y quite difficult.',
    },
  },
  preposition: {
    category: 'preposition',
    drillType: 'slot_anchor',
    icon: 'navigate-outline',
    accent: '#14B8A6',
    title: { ru: 'Предлоги', uk: 'Прийменники', es: 'Preposiciones' },
    drillLabel: { ru: 'связь и направление', uk: 'зв\'язок і напрям', es: 'relación y dirección' },
    coachLine: {
      ru: 'Предлог показывает связь: место, направление, время или причину.',
      uk: 'Прийменник показує зв\'язок: місце, напрям, час або причину.',
      es: 'La preposición marca relación: lugar, dirección, tiempo o causa.',
    },
    mistakeWhy: {
      ru: 'Сигнал указывает на связь между словами, а не на само слово.',
      uk: 'Сигнал вказує на зв\'язок між словами, а не на саме слово.',
      es: 'La señal está en la relación entre palabras.',
    },
    nextStep: {
      ru: 'Дальше будут пары in/on/at, to/for/from и короткие slot-дриллы.',
      uk: 'Далі будуть пари in/on/at, to/for/from і короткі slot-дрили.',
      es: 'Seguimos con pares in/on/at, to/for/from y slots cortos.',
    },
  },
  article: {
    category: 'article',
    drillType: 'slot_anchor',
    icon: 'text-outline',
    accent: '#FACC15',
    title: { ru: 'Артикли', uk: 'Артиклі', es: 'Artículos' },
    drillLabel: { ru: 'a, an, the или ноль', uk: 'a, an, the або нуль', es: 'a, an, the o cero' },
    coachLine: {
      ru: 'Проверь: предмет новый или уже известный, один или общий.',
      uk: 'Перевір: предмет новий чи вже відомий, один чи загальний.',
      es: 'Comprueba si es nuevo o conocido, uno o general.',
    },
    mistakeWhy: {
      ru: 'Ошибка именно в выборе определенности: a/an, the или без артикля.',
      uk: 'Помилка саме у виборі визначеності: a/an, the або без артикля.',
      es: 'El fallo está en definir: a/an, the o sin artículo.',
    },
    nextStep: {
      ru: 'Следующий пул будет строить микрофразы вокруг одного существительного.',
      uk: 'Наступний пул будуватиме мікрофрази навколо одного іменника.',
      es: 'El bloque creará microfrases alrededor de un sustantivo.',
    },
  },
  determiner: {
    category: 'determiner',
    drillType: 'slot_anchor',
    icon: 'options-outline',
    accent: '#14B8A6',
    title: { ru: 'Determiners', uk: 'Determiners', es: 'Determinantes' },
    drillLabel: { ru: 'some, any, no', uk: 'some, any, no', es: 'some, any, no' },
    coachLine: {
      ru: 'Check the sentence type: positive, negative, neutral question, offer, request, or free choice.',
      uk: 'Check the sentence type: positive, negative, neutral question, offer, request, or free choice.',
      es: 'Detecta el tipo de frase: afirmacion, negacion, pregunta, oferta, peticion o eleccion libre.',
    },
    mistakeWhy: {
      ru: 'The signal points to quantity logic: some for positive amount, any for negative/question, some for offers and requests.',
      uk: 'The signal points to quantity logic: some for positive amount, any for negative/question, some for offers and requests.',
      es: 'La senal apunta a cantidad: some en positivo, any en negacion/pregunta, some en ofertas y peticiones.',
    },
    nextStep: {
      ru: 'Next we contrast some/any/no in short slots and mixed review.',
      uk: 'Next we contrast some/any/no in short slots and mixed review.',
      es: 'Luego contrastamos some/any/no en huecos cortos y repaso mixto.',
    },
  },
  existential: {
    category: 'existential',
    drillType: 'form_choice',
    icon: 'albums-outline',
    accent: '#0EA5E9',
    title: { ru: 'There is / There are', uk: 'There is / There are', es: 'There is / There are' },
    drillLabel: { ru: 'existence and number', uk: 'existence and number', es: 'existencia y numero' },
    coachLine: {
      ru: 'Look after there: one/uncountable uses is, plural uses are.',
      uk: 'Look after there: one/uncountable uses is, plural uses are.',
      es: 'Mira despues de there: uno/uncountable usa is, plural usa are.',
    },
    mistakeWhy: {
      ru: 'The signal points to existence grammar: there is for one or uncountable, there are for plural.',
      uk: 'The signal points to existence grammar: there is for one or uncountable, there are for plural.',
      es: 'La senal apunta a existencia: there is para uno o uncountable, there are para plural.',
    },
    nextStep: {
      ru: 'We will contrast there is, there are, questions, negatives, and uncountable nouns.',
      uk: 'We will contrast there is, there are, questions, negatives, and uncountable nouns.',
      es: 'Contrastaremos there is, there are, preguntas, negaciones y uncountable nouns.',
    },
  },
  'to-be': {
    category: 'to-be',
    drillType: 'form_choice',
    icon: 'git-branch-outline',
    accent: '#818CF8',
    title: { ru: 'Глагол to be', uk: 'Дієслово to be', es: 'Verbo to be' },
    drillLabel: { ru: 'am, is, are, was, were', uk: 'am, is, are, was, were', es: 'am, is, are, was, were' },
    coachLine: {
      ru: 'Сначала выбери подлежащее и время, потом форму to be.',
      uk: 'Спочатку обери підмет і час, потім форму to be.',
      es: 'Elige sujeto y tiempo antes de la forma de to be.',
    },
    mistakeWhy: {
      ru: 'Ошибка похожа на смешение лица или времени в to be.',
      uk: 'Помилка схожа на змішання особи або часу в to be.',
      es: 'Parece mezcla de persona o tiempo en to be.',
    },
    nextStep: {
      ru: 'Дальше тренер даст быстрые пары I am, he is, they are, was/were.',
      uk: 'Далі тренер дасть швидкі пари I am, he is, they are, was/were.',
      es: 'Seguiremos con pares I am, he is, they are, was/were.',
    },
  },
  conjunction: {
    category: 'conjunction',
    drillType: 'order_rebuild',
    icon: 'link-outline',
    accent: '#06B6D4',
    title: { ru: 'Союзы', uk: 'Сполучники', es: 'Conjunciones' },
    drillLabel: { ru: 'связь частей фразы', uk: 'зв\'язок частин фрази', es: 'conectar ideas' },
    coachLine: {
      ru: 'Союз объясняет, как две части фразы связаны по смыслу.',
      uk: 'Сполучник пояснює, як дві частини фрази пов\'язані за змістом.',
      es: 'La conjunción explica cómo se conectan dos ideas.',
    },
    mistakeWhy: {
      ru: 'Ошибка похожа на неверную связь: причина, контраст, условие или добавление.',
      uk: 'Помилка схожа на хибний зв\'язок: причина, контраст, умова або додавання.',
      es: 'Parece una conexión equivocada: causa, contraste, condición o suma.',
    },
    nextStep: {
      ru: 'Пул даст короткие связки and/but/because/if в мини-контексте.',
      uk: 'Пул дасть короткі зв\'язки and/but/because/if у мініконтексті.',
      es: 'Usaremos and/but/because/if en contexto corto.',
    },
  },
  modal: {
    category: 'modal',
    drillType: 'rule_contrast',
    icon: 'options-outline',
    accent: '#C084FC',
    title: { ru: 'Модальные глаголы', uk: 'Модальні дієслова', es: 'Verbos modales' },
    drillLabel: { ru: 'можно, нужно, стоит', uk: 'можна, треба, варто', es: 'posibilidad y obligación' },
    coachLine: {
      ru: 'Модалка задаёт отношение: возможность, обязанность, совет или запрет.',
      uk: 'Модалка задає ставлення: можливість, обов\'язок, пораду або заборону.',
      es: 'El modal marca posibilidad, obligación, consejo o prohibición.',
    },
    mistakeWhy: {
      ru: 'Сигнал указывает не на действие, а на отношение к действию.',
      uk: 'Сигнал вказує не на дію, а на ставлення до дії.',
      es: 'La señal no es la acción, sino la actitud hacia la acción.',
    },
    nextStep: {
      ru: 'Дальше будет контраст can/could, must/should, may/might.',
      uk: 'Далі буде контраст can/could, must/should, may/might.',
      es: 'Seguiremos con can/could, must/should, may/might.',
    },
  },
  phrasal_particle: {
    category: 'phrasal_particle',
    drillType: 'rule_contrast',
    icon: 'swap-horizontal-outline',
    accent: '#F43F5E',
    title: { ru: 'Фразовые частицы', uk: 'Фразові частки', es: 'Partículas verbales' },
    drillLabel: { ru: 'глагол плюс частица', uk: 'дієслово плюс частка', es: 'verbo más partícula' },
    coachLine: {
      ru: 'Частица меняет смысл глагола: смотри на пару целиком.',
      uk: 'Частка змінює сенс дієслова: дивись на пару повністю.',
      es: 'La partícula cambia el verbo: mira la pareja completa.',
    },
    mistakeWhy: {
      ru: 'Ошибка похожа на выбор знакомого глагола без нужной частицы.',
      uk: 'Помилка схожа на вибір знайомого дієслова без потрібної частки.',
      es: 'Parece elegir el verbo conocido sin la partícula correcta.',
    },
    nextStep: {
      ru: 'Пул будет тренировать pick up, turn on, get off и похожие пары целиком.',
      uk: 'Пул тренуватиме pick up, turn on, get off та схожі пари повністю.',
      es: 'Entrenaremos pares completos como pick up, turn on, get off.',
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
