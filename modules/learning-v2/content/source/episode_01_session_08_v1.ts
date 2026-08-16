// зачем: сессия 8 — граница первой главы. По карте это checkpoint: новых
// конструкций нет вообще, интро не учит, а собирает уже пройденное в одну
// картину и честно предупреждает о двух ловушках, на которых человек ошибётся
// именно здесь: артикль перед профессией и What вместо How в вопросе об имени.
import { EPISODE_01_SESSION_08_PHRASES } from './episode_01_session_08_phrases_v1';
import type { SessionSource } from './session_shard_from_source_v1';

export const EPISODE_01_SESSION_08_SOURCE = {
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 8,
  canDoOutcomeId: 'obj-e01-say-who-i-am',
  generationInputFingerprint: 'e'.repeat(64),
  title: {
    ru: 'Собираем знакомство целиком',
    uk: 'Збираємо знайомство повністю',
    es: 'Todo junto: presentarse',
  },
  summary: {
    ru: 'Новых слов не будет. Здесь всё, что вы прошли за семь занятий, встречается вперемешку — как в настоящем разговоре, где никто не предупреждает, какое правило сейчас понадобится.',
    uk: 'Нових слів не буде. Тут усе, що ви пройшли за сім занять, трапляється впереміш — як у справжній розмові.',
    es: 'No hay palabras nuevas. Todo lo de las siete sesiones aparece mezclado, como en una conversación real.',
  },
  learningGoal: {
    ru: 'После сессии вы соберёте любую фразу о себе и о других, не подглядывая в правила.',
    uk: 'Після сесії ви складете будь-яку фразу про себе й про інших, не підглядаючи в правила.',
    es: 'Al terminar armarás cualquier frase sobre ti y sobre otros sin mirar las reglas.',
  },
  introPages: [
    {
      kind: 'concept',
      title: {
        ru: 'Что вы уже умеете',
        uk: 'Що ви вже вмієте',
        es: 'Lo que ya sabes',
      },
      body: {
        ru: 'За семь занятий вы собрали целую систему. Связка в трёх формах: am к I, is к he, she, it, are к you, we, they. Отрицание: not сразу после связки. Вопрос: связка выходит вперёд. Вопросительные слова: What, Where, How. Артикль a перед профессией, the перед известным предметом. Множественное число через s. Это не семь разных правил — это одна схема, в которой меняются детали.',
        uk: 'За сім занять ви зібрали цілу систему: зв’язка у трьох формах, заперечення через not, питання перестановкою, слова What, Where, How, артиклі та множина.',
        es: 'En siete sesiones has reunido un sistema: la cópula en tres formas, la negación con not, la pregunta por inversión, What, Where, How, los artículos y el plural.',
      },
      question: {
        prompt: {
          ru: 'Сколько форм у связки в настоящем времени?',
          uk: 'Скільки форм має зв’язка в теперішньому часі?',
          es: '¿Cuántas formas tiene la cópula en presente?',
        },
        choices: [
          { ru: 'Три', uk: 'Три', es: 'Tres' },
          { ru: 'Семь', uk: 'Сім', es: 'Siete' },
          { ru: 'Одна', uk: 'Одна', es: 'Una' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'Три: am, is, are. Лиц семь, а форм всего три — в этом и удобство.',
          uk: 'Три: am, is, are. Осіб сім, а форм лише три.',
          es: 'Tres: am, is, are. Hay siete personas, pero solo tres formas.',
        },
      },
    },
    {
      kind: 'trap',
      title: {
        ru: 'Ловушка первая: пропущенный артикль',
        uk: 'Пастка перша: пропущений артикль',
        es: 'Primera trampa: el artículo que falta',
      },
      body: {
        ru: 'В русском языке артиклей нет, поэтому рука сама пишет I am student. Для англичанина это звучит как обрывок — обязательно нужно a: I am a student. Правило простое: называете профессию или занятие одного человека — ставьте a. Но если рядом стоит my или your, артикль убирается: he is my brother, без a. И перед множественным числом артикля тоже нет: we are friends.',
        uk: 'В українській артиклів немає, тому рука сама пише I am student. Потрібно a: I am a student. Але поряд з my чи your артикль зникає.',
        es: 'En español no hay artículo aquí, y la mano escribe I am student. Hace falta a: I am a student. Pero con my o your el artículo desaparece.',
      },
      question: {
        prompt: {
          ru: 'Как правильно сказать «я студент»?',
          uk: 'Як правильно сказати «я студент»?',
          es: '¿Cómo se dice «soy estudiante»?',
        },
        choices: [
          { ru: 'I am a student', uk: 'I am a student', es: 'I am a student' },
          { ru: 'I am student', uk: 'I am student', es: 'I am student' },
          { ru: 'I am the student', uk: 'I am the student', es: 'I am the student' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'I am a student. Артикль обязателен, а the означал бы «тот самый, известный студент».',
          uk: 'I am a student. Артикль обов’язковий.',
          es: 'I am a student. El artículo es obligatorio.',
        },
      },
    },
    {
      kind: 'trap',
      title: {
        ru: 'Ловушка вторая: «как» не всегда How',
        uk: 'Пастка друга: «як» не завжди How',
        es: 'Segunda trampa: «cómo» no siempre es How',
      },
      body: {
        ru: 'По-русски мы спрашиваем «как тебя зовут» и «как дела» одинаково — через «как». В английском это два разных слова. Имя, номер, работа — это What: What is your name? Самочувствие и качество — это How: How are you? Проверяйте себя вопросом: я спрашиваю ЧТО это или КАКОВО оно? Если что — What.',
        uk: 'Українською «як тебе звати» і «як справи» — однакове «як». В англійській це різні слова: ім’я через What, стан через How.',
        es: 'En español «cómo te llamas» y «cómo estás» usan la misma palabra. En inglés no: el nombre con What, el estado con How.',
      },
      question: {
        prompt: {
          ru: 'Какое слово спрашивает об имени?',
          uk: 'Яке слово запитує про ім’я?',
          es: '¿Qué palabra pregunta por el nombre?',
        },
        choices: [
          { ru: 'What', uk: 'What', es: 'What' },
          { ru: 'How', uk: 'How', es: 'How' },
          { ru: 'Where', uk: 'Where', es: 'Where' },
        ],
        correctChoiceIndex: 0,
        explanation: {
          ru: 'What. How спрашивает о состоянии: How are you? Имя — What is your name?',
          uk: 'What. How питає про стан, ім’я — What is your name?',
          es: 'What. How pregunta por el estado; el nombre es What is your name?',
        },
      },
    },
  ],
  phrases: EPISODE_01_SESSION_08_PHRASES,
} satisfies SessionSource;
