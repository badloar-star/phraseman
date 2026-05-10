/**
 * Теория уроков 1–8 для продукта «учим английский» (RU/UK интерфейс).
 * Раньше сюда ошибочно подставлялись слайды из español L2 (ser/estar и т.д.).
 */
import type { LessonIntroScreen } from './lesson_data_types';

const HOW_APP_WORKS: LessonIntroScreen = {
  kind: 'mechanic',
  titleRU: 'Как это работает',
  titleUK: 'Як це працює',
  titleES: 'Cómo funciona la app',
  textRU:
    'На экране подсказка на языке интерфейса — собери именно английскую фразу из кнопок со словами, в правильном порядке. Кнопка «½» убирает половину лишних вариантов. Раздел «Теория» снова открывает эти экраны.',
  textUK:
    'На екрані підказка мовою інтерфейсу — зібери саме англійську фразу з кнопок у правильному порядку. «½» прибирає половину зайвих варіантів. «Теорія» знову відкриває ці екрани.',
  textES:
    'La pista está en tu idioma: monta la frase en inglés en orden. «½» elimina opciones. «Teoría» vuelve a abrir estas pantallas.',
};

export const LESSON_1_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: 'why',
    titleRU: 'Зачем тема To Be',
    titleUK: 'Навіщо тема To Be',
    titleES: 'Por qué importa To Be',
    textRU:
      'В английском почти каждое утверждение строится вокруг глагола: «я учитель», «ты здесь», «мы свободны». Связка to be (am / is / are) и местоимения — скелет простого предложения.',
    textUK:
      'В англійській майже кожне речення тримається на дієслові: хто ти, де ти, як ти себе почуваєш. To be (am / is / are) і займенники — це каркас простого речення.',
    textES:
      'En inglés casi toda frase necesita un verbo principal; am/is/are + pronombres es la base.',
  },
  {
    kind: 'how',
    titleRU: 'Как строится фраза',
    titleUK: 'Як будується фраза',
    titleES: 'Cómo se forma',
    textRU:
      'После I всегда am, после he/she/it — is, после you/we/they — are: I am…, He is…, We are…. Следующее слово обычно смысловое: профессия, состояние, место.',
    textUK:
      'Після I — am, після he/she/it — is, після you/we/they — are. Далі йде слово зі змістом: професія, стан, місце.',
    textES:
      'Patrón: pronombre + am/is/are + resto (sustantivo/adjetivo/lugar).',
    examples: [
      { en: 'I am a teacher.', trRU: 'Я учитель.', trUK: 'Я вчитель.', trES: 'Soy profesor.' },
      { en: 'You are here.', trRU: 'Ты здесь.', trUK: 'Ти тут.', trES: 'Estás aquí.' },
      { en: 'She is tired.', trRU: 'Она устала.', trUK: 'Вона втомилась.', trES: 'Ella está cansada.' },
    ],
  },
  {
    kind: 'trap',
    titleRU: 'Главная ловушка',
    titleUK: 'Головна пастка',
    titleES: 'Trampa típica',
    textRU:
      'Нельзя оставить местоимение «висящим» без формы to be: не *he teacher*, а He is a teacher. И не путай am (только с I) с is/are.',
    textUK:
      'Не залишай займенник без to be: не *he teacher*, а He is a teacher. am — лише з I.',
    textES:
      'No omitas am/is/are después del sujeto; am solo va con I.',
  },
  HOW_APP_WORKS,
];

export const LESSON_2_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: 'why',
    titleRU: 'Отрицание и вопросы',
    titleUK: 'Заперечення й питання',
    titleES: 'Negación y preguntas',
    textRU:
      'Отрицание с to be: not ставится после формы (I am not… / He is not…). Вопрос — та же форма в начале: Are you…? Is she…? Так ты снимаешь недопонимание одной короткой репликой.',
    textUK:
      'Із to be заперечення через not одразу після am/is/are. У питанні am/is/are виходить на початок: Are you…?',
    textES:
      'Con be: negación con not; preguntas invirtiendo am/is/are.',
  },
  {
    kind: 'how',
    titleRU: 'Как строится фраза',
    titleUK: 'Як будується фраза',
    titleES: 'Estructura',
    textRU:
      'Отрицание: I am not ready. Вопрос с да/нет: Are you at home? Короткий ответ: Yes, I am / No, I\'m not.',
    textUK:
      'Негатив: I am not ready. Питання: Are you at home? Короткі відповіді: Yes / No + am/is/are.',
    textES:
      'Negación: sujeto + am/is/are + not. Pregunta: ¿Are you…?',
    examples: [
      { en: 'I am not ready.', trRU: 'Я не готов.', trUK: 'Я не готовий.' },
      { en: 'Are you at home?', trRU: 'Ты дома?', trUK: 'Ти вдома?' },
      { en: 'She is not busy.', trRU: 'Она не занята.', trUK: 'Вона не зайнята.' },
    ],
  },
  {
    kind: 'trap',
    titleRU: 'Главная ловушка',
    titleUK: 'Головна пастка',
    titleES: 'Trampa',
    textRU:
      'Двойное «не» по-русски не копируй: не *I not am*, порядок фиксирован — I am not. И в коротком ответе сохраняй ту же форму: Yes, she is / No, she isn\'t.',
    textUK:
      'Не калькуй порядок з російської: I am not, а не *I not am*. У короткій відповіді та сама форма: Yes, he is.',
    textES:
      'Orden fijo: sujeto + am/is/are + not.',
  },
  HOW_APP_WORKS,
];

export const LESSON_3_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: 'why',
    titleRU: 'Настоящее простое',
    titleUK: 'Теперішній простий',
    titleES: 'Presente simple',
    textRU:
      'Факты и привычки в настоящем: где работаешь, что понимаешь, что обычно делаешь. В третьем лице единственного числа к глаголу часто добавляется -s: works, lives.',
    textUK:
      'Факти й звички: I work, you understand. У третій особі однини до дієслова часто -s/-es: works, goes.',
    textES:
      'Hábitos y hechos: presente simple; -s en 3ª persona.',
  },
  {
    kind: 'how',
    titleRU: 'Как строится фраза',
    titleUK: 'Як будується фраза',
    titleES: 'Patrón',
    textRU:
      'Утверждение: I work here. Вопрос с do/does: Do you work…? Does he work…? (это в следующих уроках — здесь закрепляем базовый порядок местоимение + глагол.)',
    textUK:
      'Твердження: підмет + дієслово + обставини. Питальні з do/does зʼявляться далі; зараз важливий порядок слів.',
    textES:
      'Sujeto + verbo (+ complementos).',
    examples: [
      { en: 'I work here.', trRU: 'Я работаю здесь.', trUK: 'Я працюю тут.' },
      { en: 'You understand me.', trRU: 'Ты понимаешь меня.', trUK: 'Ти розумієш мене.' },
      { en: 'He lives nearby.', trRU: 'Он живёт рядом.', trUK: 'Він живе поруч.' },
    ],
  },
  {
    kind: 'trap',
    titleRU: 'Главная ловушка',
    titleUK: 'Головна пастка',
    titleES: 'Trampa',
    textRU:
      'Не ставь -s у I/you/we/they: не *I works*. И не пропускай do/does в вопросах к обычному глаголу (восклицательная интонация не заменяет вопрос на письме).',
    textUK:
      'Без -s для I/you/we/they. Для звичайних дієслів у питанні потрібні do/does.',
    textES:
      'No añadas -s con I/you/we/they.',
  },
  HOW_APP_WORKS,
];

export const LESSON_4_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: 'why',
    titleRU: 'Do / does + not',
    titleUK: 'Do / does + not',
    titleES: 'Do/does + not',
    textRU:
      'Для обычных глаголов отрицание и вопрос строятся через do или does: I do not drink…, Do you eat…? Это отдельно от конструкции с to be.',
    textUK:
      'Для основного дієслова — do/does: I do not…, Do you…? Це не to be.',
    textES:
      'Con verbos normales: do/does + not; preguntas con Do/Does.',
  },
  {
    kind: 'how',
    titleRU: 'Как строится фраза',
    titleUK: 'Як будується фраза',
    titleES: 'Estructura',
    textRU:
      'Отрицание: субъект + do not / does not + голова глагола без to: I do not drink milk. Вопрос: Do you…? Does she…?',
    textUK:
      'Негатив: do not / does not + інфінітив без to. Питання: Do/Does + підмет + дієслово.',
    textES:
      'Neg: sujeto + don\'t/doesn\'t + verbo base.',
    examples: [
      { en: 'I do not drink milk.', trRU: 'Я не пью молоко.', trUK: 'Я не п\'ю молоко.' },
      { en: 'You do not listen.', trRU: 'Ты не слушаешь.', trUK: 'Ти не слухаєш.' },
      { en: 'She does not eat meat.', trRU: 'Она не ест мясо.', trUK: 'Вона не їсть м\'ясо.' },
    ],
  },
  {
    kind: 'trap',
    titleRU: 'Главная ловушка',
    titleUK: 'Головна пастка',
    titleES: 'Trampa',
    textRU:
      'После does not не добавляй -s на смысловой глагол: *She doesn\'t eats* неверно — She doesn\'t eat.',
    textUK:
      'Після does/does not інфінітив без -s: не *doesn\'t eats*.',
    textES:
      'Tras doesn\'t + base verb, sin -s.',
  },
  HOW_APP_WORKS,
];

export const LESSON_5_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: 'why',
    titleRU: 'Вопросы с Do',
    titleUK: 'Питання з Do',
    titleES: 'Preguntas con do',
    textRU:
      'Чтобы уточнять бытовые детали — кофе, еда, расписание — нужны короткие вопросы Do you…? В ответах часто хватает Yes / No или Yes, I do.',
    textUK:
      'Уточнення про звички: Do you…? Відповіді Yes / No або з do/does на кінці.',
    textES:
      'Preguntas de hábito: Do you…?',
  },
  {
    kind: 'how',
    titleRU: 'Как строится фраза',
    titleUK: 'Як будується фраза',
    titleES: 'Patrón',
    textRU:
      'Do you drink coffee? Does he like tea? Порядок: вспомогательный do/does → подлежащее → смысловой глагол в начальной форме.',
    textUK:
      'Do you…? Does he…? Спочатку Do/Does, потім підмет, потім дієслово в початковій формі.',
    textES:
      'Do/Does + sujeto + verbo base.',
    examples: [
      { en: 'Do you drink coffee?', trRU: 'Ты пьёшь кофе?', trUK: 'Ти п\'єш каву?' },
      { en: 'Does she cook every day?', trRU: 'Она готовит каждый день?', trUK: 'Вона готує щодня?' },
      { en: 'Do they eat here?', trRU: 'Они едят здесь?', trUK: 'Вони їдять тут?' },
    ],
  },
  {
    kind: 'trap',
    titleRU: 'Главная ловушка',
    titleUK: 'Головна пастка',
    titleES: 'Trampa',
    textRU:
      'Не смешивай порядок как в русском «Ты кофе пьёшь?» — в английском сначала Do/Does: *You drink coffee?* в разговоре бывает, но нормативно учим Do you drink coffee?',
    textUK:
      'У стандарті спочатку Do/Does, не *You drink…?* без допоміжного дієслова.',
    textES:
      'En estándar: auxiliar primero.',
  },
  HOW_APP_WORKS,
];

export const LESSON_6_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: 'why',
    titleRU: 'Вопросительные слова',
    titleUK: 'Питальні слова',
    titleES: 'Palabras interrogativas',
    textRU:
      'Where, What, When, Why, How помогают получить не просто да/нет, а конкретику: куда, что, когда. Они стоят в начале вопроса.',
    textUK:
      'Where / What / When / Why / How стоять на початку спеціального питання.',
    textES:
      'Wh- words al inicio: Where…?, What…?',
  },
  {
    kind: 'how',
    titleRU: 'Как строится фраза',
    titleUK: 'Як будується фраза',
    titleES: 'Estructura',
    textRU:
      'Where do you live? What do you want? После Wh-слова ставь do/does, если дальше обычный глагол. Если же дальше только связка be (без второго смыслового глагола), используй am/is/are: Where are you? How are you?',
    textUK:
      'Where do you…? What does she…? Wh-слово + do/does + решта (для звичайних дієслів). З to be — інший порядок (наступні уроки закріплюють).',
    textES:
      'Wh- + do/does + sujeto + verbo base (verbos normales).',
    examples: [
      { en: 'Where do you live?', trRU: 'Где ты живёшь?', trUK: 'Де ти живеш?' },
      { en: 'What do you need?', trRU: 'Что тебе нужно?', trUK: 'Що тобі потрібно?' },
      { en: 'How much is it?', trRU: 'Сколько это стоит?', trUK: 'Скільки це коштує?' },
    ],
  },
  {
    kind: 'trap',
    titleRU: 'Главная ловушка',
    titleUK: 'Головна пастка',
    titleES: 'Trampa',
    textRU:
      'Не дублируй вспомогательный глагол: *Where do you live in?* — лишний in на хвосте, если Where уже задаёт место (*Where do you live?*).',
    textUK:
      'Уважно з прийменниками кінця речення з Where/What — зайве *in* часто помилкове.',
    textES:
      'Evita preposiciones duplicadas con where.',
  },
  HOW_APP_WORKS,
];

export const LESSON_7_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: 'why',
    titleRU: 'Глагол To Have',
    titleUK: 'Дієслово To Have',
    titleES: 'Verbo to have',
    textRU:
      'Have в значении «иметь с собой» помогает говорить о вещах, времени, бумагах: I have a ticket, Do you have a minute? В уроке закрепляешь вопросы и отрицания с have.',
    textUK:
      'Have — «мати»: речі, час, документи; питання Do you have… і заперечення без кальки з рідної мови.',
    textES:
      'Have indica tener algo disponible o pedir tiempo/objeto con cortesía: I have…, Do you have…?',
  },
  {
    kind: 'how',
    titleRU: 'Как строится фраза',
    titleUK: 'Як будується фраза',
    titleES: 'Patrón',
    textRU:
      'I have… / She has… Вопросы: Do you have…? Does he have…? Отрицание: don\'t have / doesn\'t have.',
    textUK:
      'I have, he has. Питання: Do you have…? Заперечення: don\'t / doesn\'t have.',
    textES:
      'I have / she has; preguntas con do/does.',
    examples: [
      { en: 'I have insurance.', trRU: 'У меня есть страховка.', trUK: 'Я маю страховку.' },
      { en: 'Do you have a ticket?', trRU: 'У тебя есть билет?', trUK: 'У тебе є квиток?' },
      { en: 'She does not have cash.', trRU: 'У неё нет наличных.', trUK: 'У неї немає готівки.' },
    ],
  },
  {
    kind: 'trap',
    titleRU: 'Главная ловушка',
    titleUK: 'Головна пастка',
    titleES: 'Trampa',
    textRU:
      'Не путай I have с I am: *I am a passport* неверно для «у меня паспорт» — I have a passport.',
    textUK:
      'Have ≠ be: паспорт «у мене» — I have a passport, не I am.',
    textES:
      'Tener ≠ ser: I have a passport.',
  },
  HOW_APP_WORKS,
];

export const LESSON_8_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: 'why',
    titleRU: 'Время и дни',
    titleUK: 'Час і дні',
    titleES: 'Tiempo y días',
    textRU:
      'Дни недели, расписание тренировок и смен пишутся с on Monday, on Friday — on для дней, at для часа.',
    textUK:
      'Дні тижня з on: on Monday. Години з at: at 5 p.m.',
    textES:
      'Días con on; horas con at.',
  },
  {
    kind: 'how',
    titleRU: 'Как строится фраза',
    titleUK: 'Як будується фраза',
    titleES: 'Patrón',
    textRU:
      'I work on Monday. They play on Sunday morning. Устойчиво учи on + день недели без артикля перед названием дня.',
    textUK:
      'on + Monday/Tuesday… без артикля перед назвою дня в таких планах.',
    textES:
      'on + weekday para rutina.',
    examples: [
      { en: 'I work on Monday.', trRU: 'Я работаю в понедельник.', trUK: 'Я працюю в понеділок.' },
      { en: 'We train on Friday.', trRU: 'Мы тренируемся в пятницу.', trUK: 'Ми тренуємось у п\'ятницю.' },
      { en: 'The game is on Sunday.', trRU: 'Игра в воскресенье.', trUK: 'Гра в неділю.' },
    ],
  },
  {
    kind: 'trap',
    titleRU: 'Главная ловушка',
    titleUK: 'Головна пастка',
    titleES: 'Trampa',
    textRU:
      'Не переводи «в понедельник» как *in Monday* — стандарт on Monday.',
    textUK:
      'Не *in Monday* — on Monday.',
    textES:
      'on Monday, no in Monday.',
  },
  HOW_APP_WORKS,
];
