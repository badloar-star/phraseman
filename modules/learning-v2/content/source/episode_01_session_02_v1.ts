// зачем: сессия 2 закрывает то, что агент-новичок не смог пройти в сессии 1 —
// вежливые формулы и артикль a. Ключевая разница: теперь у них СВОЁ интро,
// правило приходит ДО задания, а не в подсказке после ответа.
import { EPISODE_01_SESSION_02_PHRASES } from './episode_01_session_02_phrases_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_02_SOURCE = {
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 2,
  canDoOutcomeId: 'obj-e01-say-who-i-am',
  generationInputFingerprint: 'e'.repeat(64),
  title: {
    ru: 'Вежливые слова и знакомство',
    uk: 'Ввічливі слова та знайомство',
    es: 'Palabras de cortesía y presentación',
  },
  summary: {
    ru: 'Вы научитесь здороваться, благодарить, извиняться и прощаться — теми словами, которые действительно говорят. И назовёте своё имя и занятие так, как это звучит в жизни.',
    uk: 'Ви навчитеся вітатися, дякувати, вибачатися й прощатися — тими словами, які справді кажуть. І назвете своє ім’я та заняття так, як це звучить у житті.',
    es: 'Aprenderás a saludar, dar las gracias, pedir perdón y despedirte con las palabras que la gente usa de verdad. Y dirás tu nombre y tu oficio como suena en la vida real.',
  },
  learningGoal: {
    ru: 'После сессии вы поздороваетесь, представитесь и попрощаетесь, не заглядывая в подсказку.',
    uk: 'Після сесії ви привітаєтеся, представитеся й попрощаєтеся без підказки.',
    es: 'Al terminar podrás saludar, presentarte y despedirte sin mirar la pista.',
  },
  introPages: [
    {
      kind: 'concept',
      title: {
        ru: 'Готовые формулы, которые не разбирают по словам',
        uk: 'Готові формули, які не розбирають на слова',
        es: 'Fórmulas fijas que no se analizan palabra por palabra',
      },
      body: {
        ru: 'Часть английских фраз работает не по правилам, а целым куском: Hi, Please, Sorry, Thank you, See you later, Good night. Их не собирают из грамматики — их просто говорят. Так же, как по-русски «здрасьте» никто не разбирает на части. Запоминайте их целиком, и они сразу зазвучат естественно. Именно эти слова англичане повторяют десятки раз в день, и без них речь кажется резкой. Одно слово внутри всё же поясним: later значит «позже», поэтому See you later — это «увидимся позже», то есть наше «до встречи».',
        uk: 'Частина англійських фраз працює не за правилами, а цілим шматком: Hi, Please, Sorry, Thank you, See you later, Good night. Їх не збирають із граматики — їх просто кажуть. Запам’ятовуйте цілком.',
        es: 'Algunas frases del inglés funcionan como un bloque, no por reglas: Hi, Please, Sorry, Thank you, See you later, Good night. No se arman con gramática, se dicen tal cual. Apréndelas enteras.',
      },
      question: {
        prompt: {
          ru: 'Как сказать «спасибо»?',
          uk: 'Як сказати «дякую»?',
          es: '¿Cómo se dice «gracias»?',
        },
        choices: [
          { ru: 'Thank you', uk: 'Thank you', es: 'Thank you' },
          { ru: 'Thanks you', uk: 'Thanks you', es: 'Thanks you' },
          { ru: 'Think you', uk: 'Think you', es: 'Think you' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Thank you — без s внутри формулы. Отдельно можно сказать короче: Thanks.',
          uk: 'Thank you — без s усередині формули. Окремо можна коротше: Thanks.',
          es: 'Thank you, sin s dentro de la fórmula. Suelto puedes decir Thanks.',
        },
      },
    },
    {
      kind: 'tip',
      title: {
        ru: 'Имя называют через ту же связку',
        uk: 'Ім’я називають через ту саму зв’язку',
        es: 'El nombre se dice con la misma cópula',
      },
      body: {
        ru: 'Вы уже знаете схему I am + слово. Имя вставляется туда же: I am Anna, или короче I’m Anna. Учебниковое «My name is Anna» формально верное, но живые люди так почти не говорят — звучит как из старого пособия. А чтобы сказать, где вы живёте, называют город: I live in Madrid. Здесь связки am уже нет, потому что live — это действие, и глагол в предложении уже есть.',
        uk: 'Ви вже знаєте схему I am + слово. Ім’я вставляється туди ж: I am Anna, або коротше I’m Anna. А щоб сказати, де ви живете, називають місто: I live in Madrid — тут зв’язки am немає, бо live це вже дія.',
        es: 'Ya conoces la fórmula I am + palabra. El nombre entra ahí: I am Anna, o más corto I’m Anna. Y para decir dónde vives se nombra la ciudad: I live in Madrid — aquí no hay am, porque live ya es un verbo.',
      },
      question: {
        prompt: {
          ru: 'Как представиться живым языком?',
          uk: 'Як представитися живою мовою?',
          es: '¿Cómo te presentas de forma natural?',
        },
        choices: [
          { ru: 'I am Anna', uk: 'I am Anna', es: 'I am Anna' },
          { ru: 'I Anna', uk: 'I Anna', es: 'I Anna' },
          { ru: 'Me Anna', uk: 'Me Anna', es: 'Me Anna' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'I am Anna. Связка нужна и здесь, а «Me Anna» — это не английский.',
          uk: 'I am Anna. Зв’язка потрібна й тут, а «Me Anna» — це не англійська.',
          es: 'I am Anna. La cópula también hace falta aquí; «Me Anna» no es inglés.',
        },
      },
    },
    {
      kind: 'trap',
      title: {
        ru: 'Перед профессией всегда стоит маленькое a',
        uk: 'Перед професією завжди стоїть маленьке a',
        es: 'Antes del oficio siempre va una a',
      },
      body: {
        ru: 'По-русски мы говорим «я учитель» — два слова. В английском между ними обязательно встаёт короткое a: I am a teacher. Оно означает «один из», то есть вы один из многих учителей. Это слово нельзя пропускать, хотя в русском ему нет никакой пары — именно поэтому его забывают чаще всего. Правило: перед названием профессии или занятия всегда a.',
        uk: 'Українською ми кажемо «я вчитель» — два слова. В англійській між ними обов’язково стає коротке a: I am a teacher. Воно означає «один із». Пропускати його не можна.',
        es: 'En español decimos «soy profesor», sin artículo. En inglés hace falta una a: I am a teacher. Significa «uno de tantos» y no se puede omitir.',
      },
      question: {
        prompt: {
          ru: 'Как сказать «я студент»?',
          uk: 'Як сказати «я студент»?',
          es: '¿Cómo se dice «soy estudiante»?',
        },
        choices: [
          { ru: 'I am a student', uk: 'I am a student', es: 'I am a student' },
          { ru: 'I am student', uk: 'I am student', es: 'I am student' },
          { ru: 'I am the student', uk: 'I am the student', es: 'I am the student' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'I am a student. Без артикля фраза неполная, а the означало бы «тот самый, известный студент».',
          uk: 'I am a student. Без артикля фраза неповна, а the означало б «той самий студент».',
          es: 'I am a student. Sin artículo la frase queda incompleta, y the sería «ese estudiante concreto».',
        },
      },
    },
  ],
  phrases: EPISODE_01_SESSION_02_PHRASES,
} satisfies SessionSource;
