/**
 * Теория уроков 17–32 — только английский как цель (без испанского L2).
 */
import type { LessonIntroScreen } from './lesson_data_types';

const HOW_APP_WORKS: LessonIntroScreen = {
  kind: 'mechanic',
  titleRU: 'Как это работает',
  titleUK: 'Як це працює',
  titleES: 'Cómo funciona la app',
  textRU:
    'Подсказка на языке интерфейса — собирай фразу на английском по кнопкам. «Теория» снова открывает эти слайды.',
  textUK:
    'Підказка мовою інтерфейсу — збирай англійську фразу. «Теорія» знову відкриває ці слайди.',
  textES:
    'Pista en tu idioma; monta la frase en inglés; «Teoría» reabre estas pantallas.',
};

function bundle(
  why: Pick<LessonIntroScreen, 'titleRU' | 'titleUK' | 'titleES' | 'textRU' | 'textUK' | 'textES'>,
  how: Pick<LessonIntroScreen, 'textRU' | 'textUK' | 'textES' | 'examples'>,
  trap: Pick<LessonIntroScreen, 'textRU' | 'textUK' | 'textES'>,
): LessonIntroScreen[] {
  return [
    { kind: 'why', ...why },
    {
      kind: 'how',
      titleRU: 'Как строится фраза',
      titleUK: 'Як будується фраза',
      titleES: 'Estructura',
      ...how,
    },
    {
      kind: 'trap',
      titleRU: 'Главная ловушка',
      titleUK: 'Головна пастка',
      titleES: 'Trampa',
      ...trap,
    },
    HOW_APP_WORKS,
  ];
}

export const LESSON_17_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Present Continuous', titleUK: 'Present Continuous', titleES: 'Present Continuous',
    textRU:
      'Говоришь о действии именно сейчас или в процессе: ты читаешь текст, они не смотрят фильм по телевизору. Связка am / is / are и окончание -ing держит мысль в «текущем моменте».',
    textUK:
      'Дія триває зараз: форма з am/is/are + дієслово на -ing.',
    textES:
      'Para acciones que ocurren ahora mismo: estar + -ing (am/is/are + verbo con -ing).',
  },
  { textRU:
      'Am I cooking…? You are not reading… · Is he repairing… · Are we watching…',
    textUK:
      'Питання: Am/Is/Are + підмет + V-ing; заперечення — not після am/is/are.',
    textES:
      'Pregunta: ¿Am/Is/Are + sujeto + -ing?',
    examples: [
      { en: 'Am I cooking this dinner in the kitchen right now?', trRU: 'Я сейчас готовлю ужин на кухне?', trUK: 'Чи я зараз готую вечерю на кухні?', trES: '¿Estoy cocinando esta cena en la cocina ahora?' },
      { en: 'You are not reading that article in the newspaper.', trRU: 'Ты не читаешь ту статью в газете.', trUK: 'Ти не читаєш ту статтю в газеті.', trES: 'No estás leyendo ese artículo en el periódico.' },
      { en: 'Are we watching that new show on TV?', trRU: 'Мы смотрим то новое шоу по телевизору?', trUK: 'Чи ми дивимося те нове шоу по ТБ?', trES: '¿Estamos viendo ese programa nuevo en la tele?' },
    ]},
  { textRU:
      'Не вставляй лишний глагол в начальную форму между be и -ing: не *I am cook* — верно I am cooking.',
    textUK:
      'Після is/are/am лише форма на -ing, не інфінітив;',
    textES:
      'Tras am/is/are va el verbo en -ing, no el infinitivo.' },
);

export const LESSON_18_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Повелительное наклонение', titleUK: 'Наказовий спосіб', titleES: 'Imperativo (EN)',
    textRU: 'Команда и просьба: Open the door. Don\'t run. Please sit down. Подлежащее you часто опускают.',
    textUK: 'Наказ і прохання без підмета you: Close the window. Форма як інфінітив, але без to.',
    textES: 'Órdenes en inglés: verbo base + complementos.' },
  { textRU: 'Be quiet. Help me. Don\'t worry. Please wait.',
    textUK: 'Be careful. Don\'t touch. Sit down.',
    textES: 'Base verb + objeto.',
    examples: [
      { en: 'Close the door.', trRU: 'Закрой дверь.', trUK: 'Зачини двері.' },
      { en: 'Please wait.', trRU: 'Подожди, пожалуйста.', trUK: 'Зачекай, будь ласка.' },
      { en: 'Don\'t run.', trRU: 'Не бегай.', trUK: 'Не біжи.' },
    ]},
  { textRU: 'Для he/she/it в формальной записи иногда Let him… — на первых порах держи простой Imperative без подлежащего.',
    textUK: 'Простий наказ без підмета — найбезпечніший старт.',
    textES: 'Imperativo simple primero.' },
);

export const LESSON_19_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Место: in / on / at', titleUK: 'Місце: in / on / at', titleES: 'Lugar: in/on/at',
    textRU: 'at — точка (at the station), on — поверх/этаж, in — объём/страна/комната как пространство.',
    textUK: 'at — точка; on — поверхня; in — всередині / країна / місто як зона.',
    textES: 'Mapa EN: at (punto), on (superficie), in (dentro/zona).' },
  { textRU: 'in the room · on the table · at home · at work.',
    textUK: 'in Kyiv · on the bus (громадський транспорт) vs in the car — це відпрацьовуємо в уроці.',
    textES: 'Collocations fijos.',
    examples: [
      { en: 'She is in the kitchen.', trRU: 'Она на кухне.', trUK: 'Вона на кухні.' },
      { en: 'The keys are on the desk.', trRU: 'Ключи на столе.', trUK: 'Ключі на столі.' },
      { en: 'I am at school.', trRU: 'Я в школе.', trUK: 'Я в школі.' },
    ]},
  { textRU: 'Калька «в автобусе» легко даёт ошибку: чаще on the bus, но в заданиях следуй тому, что отрабатывает урок.',
    textUK: 'Транспорт і прийменники — запам\'ятовуємо готовими парами.',
    textES: 'Fijos por lección.' },
);

export const LESSON_20_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'a / an / the / —', titleUK: 'a / an / the / —', titleES: 'Artículos (EN)',
    textRU: 'a/an для впервые упомянутого счётного; the — когда ясно, о чём речь; прочерк — общеизвестные/массовые вещи без артикля.',
    textUK: 'a/an — згадка вперше; the — конкретика; нульовий артикль — узагальнення.',
    textES: 'a/an/the/∅ en inglés ≠ español.' },
  { textRU: 'a book · an apple · the sun (исключения учим) · I like music.',
    textUK: 'an + голосна; the + унікальне в контексті.',
    textES: 'Ejemplos fijos.',
    examples: [
      { en: 'I have a car.', trRU: 'У меня есть машина.', trUK: 'Я маю машину.' },
      { en: 'Close the window.', trRU: 'Закрой окно (мы знаем, какое).', trUK: 'Зачини вікно.' },
      { en: 'Water is important.', trRU: 'Вода важна.', trUK: 'Вода важлива.' },
    ]},
  { textRU: 'Не вешай the на каждое существительное «как в родном языке».',
    textUK: 'Не став the «за звичкою».',
    textES: 'No calques artículos.' },
);

export const LESSON_21_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'some / any / every…', titleUK: 'some / any / every…', titleES: 'Indefinidos (EN)',
    textRU: 'some в утверждениях (I have some time), any в отрицаниях и вопросах, every/all целиком.',
    textUK: 'some/any/every/no — узгоджуй з типом речення.',
    textES: 'Patrones EN con some/any.' },
  { textRU: 'someone · anything · nowhere · everybody.',
    textUK: 'anything у питанні; nothing у негативі.',
    textES: '-one / -thing / -where.',
    examples: [
      { en: 'I need some help.', trRU: 'Нужна помощь.', trUK: 'Потрібна допомога.' },
      { en: 'Do you have any questions?', trRU: 'Есть вопросы?', trUK: 'Є питання?' },
      { en: 'Nobody came.', trRU: 'Никто не пришёл.', trUK: 'Ніхто не прийшов.' },
    ]},
  { textRU: 'Двойное отрицание по-английски не как в русском — не *I don\'t know nothing*.',
    textUK: 'В англійській не переносимо подвійне заперечення з української чи російської: не *I don\'t know nothing*.',
    textES: 'Sin doble negación estilo ruso.' },
);

export const LESSON_22_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Герундий -ing', titleUK: 'Герундій -ing', titleES: 'Gerundio -ing',
    textRU: 'Форма глагола + ing как существительное по смыслу: Swimming is fun. После love/enjoy/hate часто -ing.',
    textUK: '-ing як іменник дії; після деяких дієслів — обов\'язково вивчаємо списком.',
    textES: '-ing como sustantivo verbal.' },
  { textRU: 'I enjoy reading. Stop typing. He keeps talking.',
    textUK: 'go + -ing про заняття: go swimming.',
    textES: 'enjoy + -ing.',
    examples: [
      { en: 'She likes dancing.', trRU: 'Любит танцевать.', trUK: 'Любить танцювати.' },
      { en: 'Running is healthy.', trRU: 'Бег полезен.', trUK: 'Біг корисний.' },
      { en: 'I am good at painting.', trRU: 'Хорошо рисую.', trUK: 'Добре малюю.' },
    ]},
  { textRU: 'Не путай герундий с формой Present Continuous без контекста — I swim vs I am swimming разные смыслы.',
    textUK: 'Simple vs Continuous — різні ситуації.',
    textES: 'No mezcles tiempos.' },
);

export const LESSON_23_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 23,
    screenId: 'lesson_23_intro_1_passive_core',
    order: 1,
    kind: 'concept',
    titleRU: 'Когда важно не "кто сделал", а "что сделано"',
    titleUK: 'Коли важливо не "хто зробив", а "що зроблено"',
    titleES: 'When the result matters more than who did it',
    subtitleRU: 'Passive Voice ставит предмет в начало: комнату убирают, документы проверяются, билеты продаются.',
    subtitleUK: 'Passive Voice ставить предмет на початок: кімнату прибирають, документи перевіряються, квитки продаються.',
    subtitleES: 'Passive Voice puts the thing first: the room is cleaned, documents are checked, tickets are sold.',
    linesRU: [
      { type: 'text', parts: [{ text: 'Обычная фраза говорит, ' }, { text: 'кто делает действие', tone: 'strong' }, { text: '.' }] },
      { type: 'text', parts: [{ text: 'Пассив говорит, ' }, { text: 'что происходит с предметом', tone: 'strong' }, { text: ': комнату убирают, документы проверяются, билеты продаются.' }] },
      { type: 'formula', parts: [{ text: 'предмет', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
      { type: 'correct', parts: [{ text: 'The tickets ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' sold', tone: 'warning' }, { text: ' online' }] },
      { type: 'correct', parts: [{ text: 'The food ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cooked', tone: 'warning' }, { text: ' here' }] },
      { type: 'spacer' },
      { type: 'tip', parts: [{ text: 'Главная проверка: ', tone: 'strong' }, { text: 'один предмет -> is, много предметов -> are. После этого нужна третья форма: cleaned, checked, sold, made.' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'The room cleans every day', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
    ],
    linesUK: [
      { type: 'text', parts: [{ text: 'Звичайна фраза говорить, ' }, { text: 'хто робить дію', tone: 'strong' }, { text: '.' }] },
      { type: 'text', parts: [{ text: 'Пасив говорить, ' }, { text: 'що відбувається з предметом', tone: 'strong' }, { text: ': кімнату прибирають, документи перевіряються, квитки продаються.' }] },
      { type: 'formula', parts: [{ text: 'предмет', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
      { type: 'correct', parts: [{ text: 'The tickets ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' sold', tone: 'warning' }, { text: ' online' }] },
    ],
    linesES: [
      { type: 'text', parts: [{ text: 'Passive Voice says what happens to the thing, not who does it.' }] },
      { type: 'formula', parts: [{ text: 'thing', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
    ],
  },
  {
    lessonId: 23,
    screenId: 'lesson_23_intro_2_questions_negatives',
    order: 2,
    kind: 'formula',
    titleRU: 'Вопросы и отрицания в пассиве',
    titleUK: 'Питання і заперечення в пасиві',
    titleES: 'Questions and negatives in passive',
    subtitleRU: 'В вопросе is / are выходит вперёд. В отрицании not ставится после is / are.',
    subtitleUK: 'У питанні is / are виходить уперед. У запереченні not стоїть після is / are.',
    subtitleES: 'In questions, is / are moves forward. In negatives, not comes after is / are.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + предмет + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'correct', parts: [{ text: 'Are', tone: 'accent' }, { text: ' the documents ', tone: 'strong' }, { text: 'checked', tone: 'warning' }, { text: ' every morning?' }] },
      { type: 'correct', parts: [{ text: 'Are', tone: 'accent' }, { text: ' the tickets ', tone: 'strong' }, { text: 'sold', tone: 'warning' }, { text: ' online?' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the food ', tone: 'strong' }, { text: 'cooked', tone: 'warning' }, { text: ' here?' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the app ', tone: 'strong' }, { text: 'used', tone: 'warning' }, { text: ' by many people?' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'предмет + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' cleaned every day', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' checked here', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The tickets ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' sold online', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'The room is clean every day?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'The documents not are checked here', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' not checked here', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + предмет + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'correct', parts: [{ text: 'Are', tone: 'accent' }, { text: ' the documents ', tone: 'strong' }, { text: 'checked', tone: 'warning' }, { text: ' every morning?' }] },
      { type: 'formula', parts: [{ text: 'предмет + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' not cleaned every day', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + thing + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'formula', parts: [{ text: 'thing + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
    ],
  },
  {
    lessonId: 23,
    screenId: 'lesson_23_intro_3_people_modals',
    order: 3,
    kind: 'formula',
    titleRU: 'Когда "меня приглашают" и "должно быть подписано"',
    titleUK: 'Коли "мене запрошують" і "має бути підписано"',
    titleES: 'When "I am invited" and "must be signed"',
    subtitleRU: 'Пассив может начинаться не только с предмета, но и с человека. А после must / can появляется be + V3.',
    subtitleUK: 'Пасив може починатися не лише з предмета, а й з людини. А після must / can з\'являється be + V3.',
    subtitleES: 'Passive can start with a person too. After must / can, use be + V3.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'человек + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'You ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' invited too', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' called every day', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' helped here', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' asked many questions', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' invited every week', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This document ', tone: 'strong' }, { text: 'must', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This problem ', tone: 'strong' }, { text: 'can', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' solved', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'This document must signed today', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'This document must ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'людина + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' asked many questions', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This document ', tone: 'strong' }, { text: 'must', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'person + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
    ],
  },
  {
    lessonId: 23,
    screenId: 'lesson_23_intro_4_being_were_practice',
    order: 4,
    kind: 'practice',
    titleRU: 'Сейчас убирается и было проверено',
    titleUK: 'Зараз прибирається і було перевірено',
    titleES: 'Is being cleaned and was checked',
    subtitleRU: 'В конце урока появляются две дополнительные формы: is being cleaned и were checked.',
    subtitleUK: 'Наприкінці уроку з\'являються дві додаткові форми: is being cleaned і were checked.',
    subtitleES: 'At the end of the lesson, two extra forms appear: is being cleaned and were checked.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'предмет + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = прямо сейчас что-то делается с предметом', tone: 'formula' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'предмет + was / were + ', tone: 'accent' }, { text: 'V3', tone: 'warning' }, { text: ' = было сделано в прошлом', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'step', parts: [{ text: '1. Сейчас происходит процесс? ', tone: 'muted' }, { text: 'is being cleaned', tone: 'danger' }] },
      { type: 'step', parts: [{ text: '2. Уже было сделано вчера? ', tone: 'muted' }, { text: 'were checked yesterday', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Must / can перед пассивом? ', tone: 'muted' }, { text: 'must be signed / can be solved', tone: 'danger' }] },
      { type: 'step', parts: [{ text: '4. Обычный пассив сейчас/вообще? ', tone: 'muted' }, { text: 'is cleaned / are checked', tone: 'accent' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'The room is cleaning now', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'The documents are checked yesterday', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Главный навык урока: ', tone: 'strong' }, { text: 'сначала понять время и тип пассива, потом выбрать is / are / being / was / were / be.' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'предмет + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = над предметом прямо зараз виконують дію', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'предмет + was / were + ', tone: 'accent' }, { text: 'V3', tone: 'warning' }, { text: ' = було зроблено в минулому', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'thing + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = being done now', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
    ],
  },
];

export const LESSON_24_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 24,
    screenId: 'lesson_24_intro_1_present_perfect_core',
    order: 1,
    kind: 'concept',
    titleRU: 'Результат уже есть сейчас',
    titleUK: 'Результат уже є зараз',
    titleES: 'The result exists now',
    subtitleRU: 'Present Perfect связывает действие с настоящим: только что сделал, уже сделал, ещё не сделал.',
    subtitleUK: 'Present Perfect пов\'язує дію з теперішнім: щойно зробив, уже зробив, ще не зробив.',
    subtitleES: 'Present Perfect connects the action with now: just done, already done, not done yet.',
    linesRU: [
      { type: 'text', parts: [{ text: 'В Past Simple ты говорил просто о прошлом: ' }, { text: 'I finished yesterday', tone: 'strong' }, { text: '.' }] },
      { type: 'text', parts: [{ text: 'В этом уроке фокус другой: действие уже связано с настоящим результатом.' }] },
      { type: 'formula', parts: [{ text: 'кто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'found', tone: 'warning' }, { text: ' the keys' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'arrived', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'tip', parts: [{ text: 'Главная проверка: ', tone: 'strong' }, { text: 'I / you / we / they -> have. He / she / it -> has. После этого нужна третья форма.' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'She have just called me', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'I have just finish work', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
    ],
    linesUK: [
      { type: 'text', parts: [{ text: 'У цьому уроці дія пов\'язана з результатом зараз:' }] },
      { type: 'formula', parts: [{ text: 'хто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
    ],
    linesES: [
      { type: 'text', parts: [{ text: 'Present Perfect connects the action with the result now:' }] },
      { type: 'formula', parts: [{ text: 'who', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
    ],
    examples: [
      { labelRU: 'just', labelUK: 'just', labelES: 'just', en: [{ text: 'He ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'opened', tone: 'warning' }, { text: ' the door' }], ru: 'Он только что открыл дверь', uk: 'Він щойно відчинив двері', es: 'Acaba de abrir la puerta',
      'pt-BR': 'Ele acabou de abrir a porta',
      vi: 'Anh ấy vừa mở cửa',
      id: 'Dia baru saja membuka pintu',
      tr: 'Kapıyı az önce açtı',
      pl: 'Właśnie otworzył drzwi', noteRU: 'He требует has, а opened здесь третья форма.', noteUK: 'He вимагає has, а opened тут третя форма.', noteES: 'Use has with he, and opened is V3 here.' },
      { labelRU: 'just', labelUK: 'just', labelES: 'just', en: [{ text: 'They ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'sent', tone: 'warning' }, { text: ' documents' }], ru: 'Они только что отправили документы', uk: 'Вони щойно надіслали документи', es: 'Acaban de enviar los documentos',
      'pt-BR': 'Eles acabaram de enviar os documentos',
      vi: 'Họ vừa gửi tài liệu',
      id: 'Mereka baru saja mengirim dokumen',
      tr: 'Belgeleri az önce gönderdiler',
      pl: 'Właśnie wysłali dokumenty', noteRU: 'They требует have, а sent - третья форма.', noteUK: 'They вимагає have, а sent - третя форма.', noteES: 'Use have with they, and sent is V3.' },
    ],
    developerNotes: {
      screenGoal: 'Экран вводит базовую формулу Present Perfect: have/has + V3. Главные ошибки - She have и have + обычная форма вместо V3.',
      visualPriority: ['have / has выделять accent.', 'V3 выделять warning.', 'subject выделять strong.', 'ошибки выделять danger.'],
      highlightRules: ['subject = strong.', 'have/has = accent.', 'V3 = warning.', 'wrong example = danger.'],
      forbiddenContent: ['Не добавлять Past Simple с yesterday как правильный пример Present Perfect.', 'Не добавлять Present Perfect Continuous.', 'Не использовать фразы вне урока 24.'],
      layoutRules: ['Один экран - только базовая формула и just.', 'Если экран узкий, оставить I have just finished, She has just called, We have just found.'],
    },
  },
  {
    lessonId: 24,
    screenId: 'lesson_24_intro_2_just_already_yet',
    order: 2,
    kind: 'formula',
    titleRU: 'just / already / yet',
    titleUK: 'just / already / yet',
    titleES: 'just / already / yet',
    subtitleRU: 'Эти слова показывают, как действие связано с моментом сейчас.',
    subtitleUK: 'Ці слова показують, як дія пов\'язана з моментом зараз.',
    subtitleES: 'These words show how the action connects to now.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = только что', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'just', tone: 'accent' }, { text: ' checked messages', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She has ' }, { text: 'just', tone: 'accent' }, { text: ' cooked dinner', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'just', tone: 'accent' }, { text: ' cleaned the room', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = уже', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'already', tone: 'accent' }, { text: ' paid', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He has ' }, { text: 'already', tone: 'accent' }, { text: ' sent the email', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She has ' }, { text: 'already', tone: 'accent' }, { text: ' bought tickets', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'already', tone: 'accent' }, { text: ' discussed the problem', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = ещё не', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'not', tone: 'danger' }, { text: ' finished ', tone: 'warning' }, { text: 'yet', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'She has ' }, { text: 'not', tone: 'danger' }, { text: ' called ', tone: 'warning' }, { text: 'yet', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'They have ' }, { text: 'not', tone: 'danger' }, { text: ' arrived ', tone: 'warning' }, { text: 'yet', tone: 'danger' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'I have yet not finished', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'I have ' }, { text: 'not', tone: 'danger' }, { text: ' finished ', tone: 'warning' }, { text: 'yet', tone: 'danger' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = щойно', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'just', tone: 'accent' }, { text: ' checked messages', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = уже', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'already', tone: 'accent' }, { text: ' paid', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = ще не', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'not', tone: 'danger' }, { text: ' finished ', tone: 'warning' }, { text: 'yet', tone: 'danger' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = just now', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = already', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = not yet', tone: 'formula' }] },
    ],
    examples: [
      { labelRU: 'already', labelUK: 'already', labelES: 'already', en: [{ text: 'You have ' }, { text: 'already', tone: 'accent' }, { text: ' checked it', tone: 'warning' }], ru: 'Ты уже проверил это', uk: 'Ти вже перевірив це', es: 'Ya lo has revisado',
      'pt-BR': 'Você já verificou isso',
      vi: 'Bạn đã kiểm tra nó rồi',
      id: 'Kamu sudah memeriksanya',
      tr: 'Bunu zaten kontrol ettin',
      pl: 'Już to sprawdziłeś', noteRU: 'already обычно стоит между have/has и V3.', noteUK: 'already зазвичай стоїть між have/has і V3.', noteES: 'already usually stands between have/has and V3.' },
      { labelRU: 'yet', labelUK: 'yet', labelES: 'yet', en: [{ text: 'We have ' }, { text: 'not', tone: 'danger' }, { text: ' found the keys ', tone: 'warning' }, { text: 'yet', tone: 'danger' }], ru: 'Мы ещё не нашли ключи', uk: 'Ми ще не знайшли ключі', es: 'Todavía no hemos encontrado las llaves',
      'pt-BR': 'Ainda não encontramos as chaves',
      vi: 'Chúng tôi chưa tìm thấy chìa khóa',
      id: 'Kami belum menemukan kuncinya',
      tr: 'Anahtarları henüz bulmadık',
      pl: 'Jeszcze nie znaleźliśmy kluczy', noteRU: 'yet в таких фразах стоит в конце.', noteUK: 'yet у таких фразах стоїть у кінці.', noteES: 'yet goes at the end in these sentences.' },
    ],
    developerNotes: {
      screenGoal: 'Экран отдельно закрепляет just/already/yet. Главная ошибка - поставить yet не туда или забыть not в "ещё не".',
      visualPriority: ['just/already выделять accent.', 'not/yet выделять danger.', 'V3 выделять warning.', 'ошибку I have yet not finished выделять danger.'],
      highlightRules: ['just/already = accent.', 'not/yet = danger.', 'V3 = warning.', 'wrong example = danger.'],
      forbiddenContent: ['Не добавлять still как отдельную тему.', 'Не добавлять since/for.', 'Не использовать фразы вне урока 24.'],
      layoutRules: ['Один экран - только just/already/yet.', 'Если экран узкий, оставить по 2 примера на just, already, yet.'],
    },
  },
  {
    lessonId: 24,
    screenId: 'lesson_24_intro_3_questions_ever_never',
    order: 3,
    kind: 'formula',
    titleRU: 'Вопросы, ever и never',
    titleUK: 'Питання, ever і never',
    titleES: 'Questions, ever and never',
    subtitleRU: 'В вопросе Have / Has выходит в начало. Ever спрашивает об опыте, never говорит "никогда".',
    subtitleUK: 'У питанні Have / Has виходить на початок. Ever питає про досвід, never означає "ніколи".',
    subtitleES: 'In questions, Have / Has moves to the front. Ever asks about experience, never means "never".',
    linesRU: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + кто + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + ', tone: 'muted' }, { text: 'yet?', tone: 'danger' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'finished', tone: 'warning' }, { text: ' yet?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Has', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'called', tone: 'warning' }, { text: ' yet?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'sent', tone: 'warning' }, { text: ' documents yet?', tone: 'danger' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'Have / Has + кто + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' seen this?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Has', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' helped you?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' we ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' met before?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'have / has + ', tone: 'formula' }, { text: 'never', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'never', tone: 'danger' }, { text: ' seen this', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She has ' }, { text: 'never', tone: 'danger' }, { text: ' called me', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He has ' }, { text: 'never', tone: 'danger' }, { text: ' used this app', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'Did you ever seen this?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' seen this?', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + хто + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + ', tone: 'muted' }, { text: 'yet?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'finished', tone: 'warning' }, { text: ' yet?', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'Have / Has + хто + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' seen this?', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + who + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + yet?', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'Have / Has + who + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + V3?', tone: 'warning' }] },
    ],
    examples: [
      { labelRU: 'yet question', labelUK: 'yet question', labelES: 'yet question', en: [{ text: 'Has', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'opened', tone: 'warning' }, { text: ' the door yet?', tone: 'danger' }], ru: 'Он уже открыл дверь?', uk: 'Він вже відчинив двері?', es: '¿Él ya ha abierto la puerta?',
      'pt-BR': 'Ele já abriu a porta?',
      vi: 'Anh ấy đã mở cửa chưa?',
      id: 'Apakah dia sudah membuka pintu?',
      tr: 'Kapıyı henüz açtı mı?',
      pl: 'Czy on już otworzył drzwi?', noteRU: 'В вопросе Has выходит перед he, а yet стоит в конце.', noteUK: 'У питанні Has виходить перед he, а yet стоїть у кінці.', noteES: 'In a question, Has moves before he, and yet goes at the end.' },
      { labelRU: 'ever', labelUK: 'ever', labelES: 'ever', en: [{ text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' lost your phone?', tone: 'warning' }], ru: 'Ты когда-нибудь терял свой телефон?', uk: 'Ти коли-небудь губив свій телефон?', es: '¿Alguna vez has perdido tu teléfono?',
      'pt-BR': 'Você já perdeu seu telefone?',
      vi: 'Bạn đã bao giờ làm mất điện thoại chưa?',
      id: 'Apakah kamu pernah kehilangan ponselmu?',
      tr: 'Hiç telefonunu kaybettin mi?',
      pl: 'Czy kiedykolwiek zgubiłeś telefon?', noteRU: 'ever спрашивает об опыте за жизнь или до настоящего момента.', noteUK: 'ever питає про досвід за життя або дотепер.', noteES: 'ever asks about life experience up to now.' },
      { labelRU: 'never', labelUK: 'never', labelES: 'never', en: [{ text: 'We have ' }, { text: 'never', tone: 'danger' }, { text: ' met them', tone: 'warning' }], ru: 'Мы никогда не встречали их', uk: 'Ми ніколи не зустрічали їх', es: 'Nunca los hemos conocido',
      'pt-BR': 'Nós nunca os conhecemos',
      vi: 'Chúng tôi chưa bao giờ gặp họ',
      id: 'Kami belum pernah bertemu mereka',
      tr: 'Onlarla hiç tanışmadık',
      pl: 'Nigdy ich nie spotkaliśmy', noteRU: 'never уже несёт отрицание, поэтому not не нужен.', noteUK: 'never уже несе заперечення, тому not не потрібен.', noteES: 'never already makes the meaning negative, so not is not needed.' },
    ],
    developerNotes: {
      screenGoal: 'Экран закрепляет вопросы Have/Has + subject + V3 + yet, вопросы с ever и утверждения с never. Главные ошибки - Did you ever seen и never + not.',
      visualPriority: ['Have/Has в вопросе выделять accent.', 'ever выделять accent.', 'never/yet выделять danger.', 'V3 выделять warning.', 'wrong example выделять danger.'],
      highlightRules: ['question starter Have/Has = accent.', 'ever = accent.', 'never/yet = danger.', 'V3 = warning.', 'subject = strong.', 'wrong example = danger.'],
      forbiddenContent: ['Не добавлять Past Simple with yesterday.', 'Не добавлять never not.', 'Не использовать фразы вне урока 24.'],
      layoutRules: ['Один экран - questions + ever/never.', 'Если экран узкий, оставить Have you finished yet, Have you ever seen this, I have never seen this.'],
    },
  },
  {
    lessonId: 24,
    screenId: 'lesson_24_intro_4_irregular_v3_practice',
    order: 4,
    kind: 'practice',
    titleRU: 'V3: been / done / made / changed',
    titleUK: 'V3: been / done / made / changed',
    titleES: 'V3: been / done / made / changed',
    subtitleRU: 'В конце урока появляются формы, которые нельзя угадать по -ed.',
    subtitleUK: 'Наприкінці уроку з\'являються форми, які не можна вгадати через -ed.',
    subtitleES: 'At the end of the lesson, some forms cannot be guessed with -ed.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'She has ' }, { text: 'been', tone: 'warning' }, { text: ' here before' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'correct', parts: [{ text: 'They have ' }, { text: 'made', tone: 'warning' }, { text: ' mistakes' }] },
      { type: 'correct', parts: [{ text: 'It has ' }, { text: 'changed', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'step', parts: [{ text: '1. "Только что" -> ', tone: 'muted' }, { text: 'have / has just + V3', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '2. "Уже" -> ', tone: 'muted' }, { text: 'have / has already + V3', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. "Ещё не" -> ', tone: 'muted' }, { text: 'have / has not + V3 + yet', tone: 'danger' }] },
      { type: 'step', parts: [{ text: '4. "Когда-нибудь?" -> ', tone: 'muted' }, { text: 'Have / Has + subject + ever + V3?', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '5. "Никогда" -> ', tone: 'muted' }, { text: 'have / has never + V3', tone: 'danger' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'I have was there', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'We have did it', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'They have maked mistakes', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'They have ' }, { text: 'made', tone: 'warning' }, { text: ' mistakes' }] },
      { type: 'tip', parts: [{ text: 'Главный навык урока: ', tone: 'strong' }, { text: 'после have / has всегда проверяй третью форму, а не обычное прошлое.' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'correct', parts: [{ text: 'They have ' }, { text: 'made', tone: 'warning' }, { text: ' mistakes' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
    ],
    examples: [
      { labelRU: 'been', labelUK: 'been', labelES: 'been', en: [{ text: 'She has ' }, { text: 'been', tone: 'warning' }, { text: ' here before' }], ru: 'Она уже была здесь раньше', uk: 'Вона вже була тут раніше', es: 'Ella ha estado aquí antes',
      'pt-BR': 'Ela já esteve aqui antes',
      vi: 'Cô ấy đã từng ở đây trước kia',
      id: 'Dia sudah pernah berada di sini sebelumnya',
      tr: 'Daha önce burada bulundu',
      pl: 'Ona już tu kiedyś była', noteRU: 'После has нужна форма been, не was.', noteUK: 'Після has потрібна форма been, не was.', noteES: 'After has, use been, not was.' },
      { labelRU: 'done', labelUK: 'done', labelES: 'done', en: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }], ru: 'Мы сделали это', uk: 'Ми зробили це', es: 'Lo hemos hecho',
      'pt-BR': 'Nós fizemos isso',
      vi: 'Chúng tôi đã làm xong việc đó',
      id: 'Kami telah melakukannya',
      tr: 'Bunu yaptık',
      pl: 'Zrobiliśmy to', noteRU: 'Do -> did в Past Simple, но после have нужна форма done.', noteUK: 'Do -> did у Past Simple, але після have потрібна форма done.', noteES: 'Do -> did in Past Simple, but after have use done.' },
      { labelRU: 'made', labelUK: 'made', labelES: 'made', en: [{ text: 'They have ' }, { text: 'made', tone: 'warning' }, { text: ' mistakes' }], ru: 'Они сделали ошибки', uk: 'Вони зробили помилки', es: 'Ellos han cometido errores',
      'pt-BR': 'Eles cometeram erros',
      vi: 'Họ đã mắc lỗi',
      id: 'Mereka telah melakukan kesalahan',
      tr: 'Hatalar yaptılar',
      pl: 'Popełnili błędy', noteRU: 'Make в V3 становится made.', noteUK: 'Make у V3 стає made.', noteES: 'Make becomes made in V3.' },
    ],
    developerNotes: {
      screenGoal: 'Финальный экран закрепляет irregular V3 и общий алгоритм урока. Главные ошибки - have was, have did, have maked.',
      visualPriority: ['have / has выделять accent.', 'irregular V3 выделять warning.', 'never / yet в алгоритме выделять danger.', 'wrong examples выделять danger.'],
      highlightRules: ['have/has = accent.', 'V3 = warning.', 'yet/never/not = danger.', 'wrong example = danger.'],
      forbiddenContent: ['Не добавлять Present Perfect Continuous.', 'Не добавлять since/for.', 'Не добавлять yesterday как Present Perfect маркер.', 'Не использовать фразы вне урока 24.'],
      layoutRules: ['Экран финальный и практический.', 'Если не помещается, оставить I have been there, We have done it, They have made mistakes и три ошибки.'],
    },
  },
];

export const LESSON_25_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 25,
    screenId: 'lesson_25_intro_1_past_continuous_core',
    order: 1,
    kind: 'concept',
    titleRU: 'Действие было в процессе',
    titleUK: 'Дія була в процесі',
    titleES: 'An action was in progress',
    subtitleRU: 'Past Continuous показывает, что действие длилось в прошлом: в восемь, в тот момент, прошлой ночью.',
    subtitleUK: 'Past Continuous показує, що дія тривала в минулому: о восьмій, у той момент, минулої ночі.',
    subtitleES: 'Past Continuous shows that an action was in progress in the past.',
    linesRU: [
      { type: 'text', parts: [{ text: 'Если действие ' }, { text: 'длилось в прошлом', tone: 'strong' }, { text: ', английский использует:' }] },
      { type: 'formula', parts: [{ text: 'кто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'глагол + -ing', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'You ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' reading at that time', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' cooking dinner at six', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' waiting near the door', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'tip', parts: [{ text: 'Главная проверка: ', tone: 'strong' }, { text: 'I / he / she / it -> was. You / we / they -> were. После этого нужен -ing.' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'I working at eight', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'He was cook dinner at six', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'He ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' cooking dinner at six', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'text', parts: [{ text: 'Якщо дія ' }, { text: 'тривала в минулому', tone: 'strong' }, { text: ', англійська використовує:' }] },
      { type: 'formula', parts: [{ text: 'хто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'дієслово + -ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'You ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' reading at that time', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' cooking dinner at six', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'text', parts: [{ text: 'If an action was in progress in the past, use:' }] },
      { type: 'formula', parts: [{ text: 'who', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'verb + -ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
    ],
    examples: [
      { labelRU: 'was', labelUK: 'was', labelES: 'was', en: [{ text: 'She ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' writing a message at noon', tone: 'warning' }], ru: 'Она писала сообщение в полдень', uk: 'Вона писала повідомлення опівдні', es: 'Estaba escribiendo un mensaje al mediodía',
      'pt-BR': 'Ela estava escrevendo uma mensagem ao meio-dia',
      vi: 'Cô ấy đang viết một tin nhắn lúc giữa trưa',
      id: 'Dia sedang menulis pesan pada tengah hari',
      tr: 'Öğlen bir mesaj yazıyordu',
      pl: 'Ona pisała wiadomość w południe', noteRU: 'She требует was, а действие получает -ing.', noteUK: 'She вимагає was, а дія отримує -ing.', noteES: 'Use was with she, and add -ing to the action.' },
      { labelRU: 'were', labelUK: 'were', labelES: 'were', en: [{ text: 'We ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checking documents', tone: 'warning' }], ru: 'Мы проверяли документы', uk: 'Ми перевіряли документи', es: 'Estábamos revisando documentos',
      'pt-BR': 'Nós estávamos verificando documentos',
      vi: 'Chúng tôi đang kiểm tra tài liệu',
      id: 'Kami sedang memeriksa dokumen',
      tr: 'Belgeleri kontrol ediyorduk',
      pl: 'Sprawdzaliśmy dokumenty', noteRU: 'We требует were.', noteUK: 'We вимагає were.', noteES: 'Use were with we.' },
    ],
  },
  {
    lessonId: 25,
    screenId: 'lesson_25_intro_2_questions_negatives',
    order: 2,
    kind: 'formula',
    titleRU: 'Вопросы и отрицания',
    titleUK: 'Питання і заперечення',
    titleES: 'Questions and negatives',
    subtitleRU: 'В вопросе was / were выходит в начало. В отрицании not ставится после was / were.',
    subtitleUK: 'У питанні was / were виходить на початок. У запереченні not стоїть після was / were.',
    subtitleES: 'In questions, was / were moves to the front. In negatives, not comes after was / were.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'кто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Was', tone: 'accent' }, { text: ' he cooking dinner at six?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Was', tone: 'accent' }, { text: ' she writing a message at noon?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' they watching TV last night?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'кто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V-ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' sleeping at midnight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'You ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' listening to me', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' working yesterday evening', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'Did you were working at eight?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'He not was watching TV then', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'He ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' watching TV then', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + хто + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Was', tone: 'accent' }, { text: ' he cooking dinner at six?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'хто + was / were + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V-ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' sleeping at midnight', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + who + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'who + was / were + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + V-ing', tone: 'warning' }] },
    ],
    examples: [
      { labelRU: 'вопрос', labelUK: 'питання', labelES: 'question', en: [{ text: 'Was', tone: 'accent' }, { text: ' she writing a message at noon?', tone: 'warning' }], ru: 'Она писала сообщение в полдень?', uk: 'Вона писала повідомлення опівдні?', es: '¿Ella estaba escribiendo un mensaje al mediodía?',
      'pt-BR': 'Ela estava escrevendo uma mensagem ao meio-dia?',
      vi: 'Cô ấy đang viết một tin nhắn lúc giữa trưa à?',
      id: 'Apakah dia sedang menulis pesan pada tengah hari?',
      tr: 'Öğlen bir mesaj mı yazıyordu?',
      pl: 'Czy ona pisała wiadomość w południe?', noteRU: 'В вопросе Was выходит перед she.', noteUK: 'У питанні Was виходить перед she.', noteES: 'In a question, Was moves before she.' },
      { labelRU: 'отрицание', labelUK: 'заперечення', labelES: 'negative', en: [{ text: 'She ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' using my phone', tone: 'warning' }], ru: 'Она не пользовалась моим телефоном', uk: 'Вона не користувалася моїм телефоном', es: 'Ella no estaba usando mi teléfono',
      'pt-BR': 'Ela não estava usando meu telefone',
      vi: 'Cô ấy không dùng điện thoại của tôi',
      id: 'Dia tidak sedang menggunakan ponsel saya',
      tr: 'Telefonumu kullanmıyordu',
      pl: 'Ona nie używała mojego telefonu', noteRU: 'not стоит после was, а using остаётся с -ing.', noteUK: 'not стоїть після was, а using залишається з -ing.', noteES: 'not comes after was, and using keeps -ing.' },
    ],
  },
  {
    lessonId: 25,
    screenId: 'lesson_25_intro_3_wh_while',
    order: 3,
    kind: 'formula',
    titleRU: 'WH-вопросы и while',
    titleUK: 'WH-питання і while',
    titleES: 'WH-questions and while',
    subtitleRU: 'WH-вопрос начинается с вопросительного слова. While соединяет два длительных действия.',
    subtitleUK: 'WH-питання починається з питального слова. While поєднує дві тривалі дії.',
    subtitleES: 'A WH-question starts with a question word. While connects two ongoing actions.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + кто + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'were', tone: 'warning' }, { text: ' you doing at that time?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Where', tone: 'accent' }, { text: ' ' }, { text: 'were', tone: 'warning' }, { text: ' they waiting?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Who', tone: 'accent' }, { text: ' ' }, { text: 'was', tone: 'warning' }, { text: ' calling you?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Why', tone: 'accent' }, { text: ' ' }, { text: 'was', tone: 'warning' }, { text: ' she crying?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'длительное действие', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'while', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'длительное действие', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was cooking', tone: 'warning' }, { text: ' ' }, { text: 'while', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'was making coffee', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'was cleaning', tone: 'warning' }, { text: ' ' }, { text: 'while', tone: 'accent' }, { text: ' we ', tone: 'strong' }, { text: 'were talking', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'were walking', tone: 'warning' }, { text: ' ' }, { text: 'while', tone: 'accent' }, { text: ' it ', tone: 'strong' }, { text: 'was raining', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'What you were doing at that time?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'were', tone: 'warning' }, { text: ' you doing at that time?', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + хто + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'were', tone: 'warning' }, { text: ' you doing at that time?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'тривала дія + ', tone: 'formula' }, { text: 'while', tone: 'accent' }, { text: ' + тривала дія', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was cooking', tone: 'warning' }, { text: ' ' }, { text: 'while', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'was making coffee', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + who + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'ongoing action + ', tone: 'formula' }, { text: 'while', tone: 'accent' }, { text: ' + ongoing action', tone: 'formula' }] },
    ],
    examples: [
      { labelRU: 'WH-вопрос', labelUK: 'WH-питання', labelES: 'WH-question', en: [{ text: 'Why', tone: 'accent' }, { text: ' ' }, { text: 'was', tone: 'warning' }, { text: ' she crying?', tone: 'warning' }], ru: 'Почему она плакала?', uk: 'Чому вона плакала?', es: '¿Por qué estaba llorando?',
      'pt-BR': 'Por que ela estava chorando?',
      vi: 'Tại sao cô ấy đang khóc?',
      id: 'Mengapa dia menangis?',
      tr: 'Neden ağlıyordu?',
      pl: 'Dlaczego płakała?', noteRU: 'Why первым, потом was, потом she crying.', noteUK: 'Why першим, потім was, потім she crying.', noteES: 'Why first, then was, then she crying.' },
      { labelRU: 'while', labelUK: 'while', labelES: 'while', en: [{ text: 'She ', tone: 'strong' }, { text: 'was writing', tone: 'warning' }, { text: ' ' }, { text: 'while', tone: 'accent' }, { text: ' I ', tone: 'strong' }, { text: 'was reading', tone: 'warning' }], ru: 'Она писала, пока я читал', uk: 'Вона писала, поки я читав', es: 'Ella estaba escribiendo mientras yo leía',
      'pt-BR': 'Ela estava escrevendo enquanto eu lia',
      vi: 'Cô ấy đang viết trong khi tôi đang đọc',
      id: 'Dia sedang menulis sementara saya sedang membaca',
      tr: 'Ben okurken o yazıyordu',
      pl: 'Ona pisała, gdy ja czytałem', noteRU: 'while соединяет два процесса, которые шли одновременно.', noteUK: 'while поєднує два процеси, які тривали одночасно.', noteES: 'while connects two actions happening at the same time.' },
    ],
  },
  {
    lessonId: 25,
    screenId: 'lesson_25_intro_4_when_practice',
    order: 4,
    kind: 'practice',
    titleRU: 'when: процесс + короткое событие',
    titleUK: 'when: процес + коротка подія',
    titleES: 'when: process + short event',
    subtitleRU: 'Past Continuous часто даёт фон, а when вводит короткое событие, которое произошло в этот момент.',
    subtitleUK: 'Past Continuous часто дає фон, а when вводить коротку подію, яка сталася в цей момент.',
    subtitleES: 'Past Continuous often gives the background, and when introduces a short event.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'длительное действие', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'короткое событие в Past Simple', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'was cooking', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'arrived', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'were eating', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' the phone ', tone: 'strong' }, { text: 'rang', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were driving', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' it ', tone: 'strong' }, { text: 'started raining', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'was sleeping', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' I ', tone: 'strong' }, { text: 'opened the door', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'step', parts: [{ text: '1. Что длилось? ', tone: 'muted' }, { text: 'was / were + V-ing', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '2. Что произошло в этот момент? ', tone: 'muted' }, { text: 'Past Simple: called, arrived, rang, opened', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Соединитель: ', tone: 'muted' }, { text: 'when', tone: 'accent' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'I worked when you were calling', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно здесь: ', tone: 'success' }, { text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'She was cooking when he was arriving', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно здесь: ', tone: 'success' }, { text: 'She ', tone: 'strong' }, { text: 'was cooking', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'arrived', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Главный навык урока: ', tone: 'strong' }, { text: 'отделить длинный фон от короткого события. Фон = was / were + -ing. Событие = Past Simple.' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'тривала дія', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'коротка подія в Past Simple', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'was cooking', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'arrived', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'ongoing action', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'short Past Simple event', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
    ],
    examples: [
      { labelRU: 'фон + событие', labelUK: 'фон + подія', labelES: 'background + event', en: [{ text: 'They ', tone: 'strong' }, { text: 'were watching a movie', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' I ', tone: 'strong' }, { text: 'called', tone: 'warning' }], ru: 'Они смотрели фильм, когда я позвонил', uk: 'Вони дивилися фільм, коли я подзвонив', es: 'Estaban viendo una película cuando llamé',
      'pt-BR': 'Eles estavam assistindo a um filme quando liguei',
      vi: 'Họ đang xem phim khi tôi gọi',
      id: 'Mereka sedang menonton film ketika saya menelepon',
      tr: 'Ben aradığımda film izliyorlardı',
      pl: 'Oni oglądali film, kiedy zadzwoniłem', noteRU: 'were watching = фон, called = короткое событие.', noteUK: 'were watching = фон, called = коротка подія.', noteES: 'were watching = background, called = short event.' },
      { labelRU: 'фон + событие', labelUK: 'фон + подія', labelES: 'background + event', en: [{ text: 'I ', tone: 'strong' }, { text: 'was writing a message', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'knocked on the door', tone: 'warning' }], ru: 'Я писал сообщение, когда ты постучал в дверь', uk: 'Я писав повідомлення, коли ти постукав у двері', es: 'Estaba escribiendo un mensaje cuando llamaste a la puerta',
      'pt-BR': 'Eu estava escrevendo uma mensagem quando você bateu na porta',
      vi: 'Tôi đang viết một tin nhắn khi bạn gõ cửa',
      id: 'Saya sedang menulis pesan ketika kamu mengetuk pintu',
      tr: 'Sen kapıyı çaldığında ben bir mesaj yazıyordum',
      pl: 'Pisałem wiadomość, kiedy zapukałeś do drzwi', noteRU: 'was writing длилось, knocked on the door произошло в один момент.', noteUK: 'was writing тривало, knocked on the door сталося в один момент.', noteES: 'was writing was in progress; knocked on the door happened at one moment.' },
    ],
  },
];

export const LESSON_26_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 26,
    screenId: 'lesson_26_intro_1_first_conditional_core',
    order: 1,
    kind: 'concept',
    titleRU: 'Если это случится, будет результат',
    titleUK: 'Якщо це станеться, буде результат',
    titleES: 'If this happens, this will happen',
    subtitleRU: 'В этом уроке if показывает условие, а will показывает будущий результат.',
    subtitleUK: 'У цьому уроці if показує умову, а will показує майбутній результат.',
    subtitleES: 'In this lesson, if shows the condition, and will shows the future result.',
    linesRU: [
      { type: 'text', parts: [{ text: 'Когда русская фраза звучит как ' }, { text: '"если..., то..."', tone: 'strong' }, { text: ', английский делит её на две части:' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + условие в Present Simple', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + результат', tone: 'formula' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she calls me, I ' }, { text: 'will', tone: 'warning' }, { text: ' answer' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' we start now, we ' }, { text: 'will', tone: 'warning' }, { text: ' finish today' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' it rains, we ' }, { text: 'will', tone: 'warning' }, { text: ' stay home' }] },
      { type: 'spacer' },
      { type: 'tip', parts: [{ text: 'Главная ловушка: ', tone: 'strong' }, { text: 'после If в этом уроке не ставим will. Will стоит во второй части.' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'If you will help me, I will finish faster', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
    ],
    linesUK: [
      { type: 'text', parts: [{ text: 'Коли фраза звучить як ' }, { text: '"якщо..., то..."', tone: 'strong' }, { text: ', англійська ділить її на дві частини:' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + умова в Present Simple', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + результат', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she calls me, I ' }, { text: 'will', tone: 'warning' }, { text: ' answer' }] },
      { type: 'tip', parts: [{ text: 'Головна пастка: ', tone: 'strong' }, { text: 'після If у цьому уроці не ставимо will. Will стоїть у другій частині.' }] },
    ],
    linesES: [
      { type: 'text', parts: [{ text: 'If shows the condition. Will shows the future result.' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + result', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
    ],
    examples: [
      { labelRU: 'условие + результат', labelUK: 'умова + результат', labelES: 'condition + result', en: [{ text: 'If', tone: 'accent' }, { text: ' you open the app, it ' }, { text: 'will', tone: 'warning' }, { text: ' work' }], ru: 'Если ты откроешь приложение, оно будет работать', uk: 'Якщо ти відкриєш застосунок, він працюватиме', es: 'Si abres la aplicación, funcionará',
      'pt-BR': 'Se você abrir o aplicativo, ele vai funcionar',
      vi: 'Nếu bạn mở ứng dụng, nó sẽ hoạt động',
      id: 'Jika kamu membuka aplikasi, aplikasi itu akan berfungsi',
      tr: 'Uygulamayı açarsan çalışacak',
      pl: 'Jeśli otworzysz aplikację, ona zadziała', noteRU: 'Open стоит после if без will. Will стоит перед результатом work.', noteUK: 'Open стоїть після if без will. Will стоїть перед результатом work.', noteES: 'Open comes after if without will. Will comes before the result work.' },
      { labelRU: 'he / she / it', labelUK: 'he / she / it', labelES: 'he / she / it', en: [{ text: 'If', tone: 'accent' }, { text: ' he finds the keys, he ' }, { text: 'will', tone: 'warning' }, { text: ' call us' }], ru: 'Если он найдёт ключи, он позвонит нам', uk: 'Якщо він знайде ключі, він зателефонує нам', es: 'Si él encuentra las llaves, nos llamará',
      'pt-BR': 'Se ele encontrar as chaves, ele vai nos ligar',
      vi: 'Nếu anh ấy tìm thấy chìa khóa, anh ấy sẽ gọi cho chúng ta',
      id: 'Jika dia menemukan kuncinya, dia akan menelepon kita',
      tr: 'Anahtarları bulursa bizi arayacak',
      pl: 'Jeśli znajdzie klucze, zadzwoni do nas', noteRU: 'После he в условии нужно finds, потому что это Present Simple.', noteUK: 'Після he в умові потрібно finds, бо це Present Simple.', noteES: 'After he in the condition, use finds because it is Present Simple.' },
    ],
  },
  {
    lessonId: 26,
    screenId: 'lesson_26_intro_2_negative_conditions',
    order: 2,
    kind: 'formula',
    titleRU: 'Если НЕ случится',
    titleUK: 'Якщо НЕ станеться',
    titleES: 'If it does not happen',
    subtitleRU: 'Отрицание внутри if-части строится через do not / does not, но will всё равно остаётся во второй части.',
    subtitleUK: 'Заперечення всередині if-частини будується через do not / does not, але will все одно залишається у другій частині.',
    subtitleES: 'The negative inside the if-part uses do not / does not, but will stays in the result part.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + кто + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + действие, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + результат', tone: 'formula' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you ' }, { text: 'do not', tone: 'danger' }, { text: ' call me, I ' }, { text: 'will', tone: 'warning' }, { text: ' wait' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start without her' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' they ' }, { text: 'do not', tone: 'danger' }, { text: ' help us, we ' }, { text: 'will', tone: 'warning' }, { text: ' do it ourselves' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' it ' }, { text: 'does not', tone: 'danger' }, { text: ' work, I ' }, { text: 'will', tone: 'warning' }, { text: ' check it' }] },
      { type: 'spacer' },
      { type: 'tip', parts: [{ text: 'После does not действие снова обычное: ', tone: 'strong' }, { text: 'come, find, work, sleep' }, { text: '. Не comes / works.', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'If she does not comes, we will start', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + хто + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + дія, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + результат', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you ' }, { text: 'do not', tone: 'danger' }, { text: ' call me, I ' }, { text: 'will', tone: 'warning' }, { text: ' wait' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start without her' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + who + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + action, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + result', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' it ' }, { text: 'does not', tone: 'danger' }, { text: ' work, I ' }, { text: 'will', tone: 'warning' }, { text: ' check it' }] },
    ],
  },
  {
    lessonId: 26,
    screenId: 'lesson_26_intro_3_questions_with_if',
    order: 3,
    kind: 'formula',
    titleRU: 'Вопросы с if',
    titleUK: 'Питання з if',
    titleES: 'Questions with if',
    subtitleRU: 'В вопросах will выходит в начало, а if-часть всё равно остаётся без will.',
    subtitleUK: 'У питаннях will виходить на початок, а if-частина все одно залишається без will.',
    subtitleES: 'In questions, will moves to the front, but the if-part still has no will.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + кто + действие + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + условие?', tone: 'formula' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' she call me ' }, { text: 'if', tone: 'accent' }, { text: ' she has time?' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' it work ' }, { text: 'if', tone: 'accent' }, { text: ' I restart the app?' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'What / Where / Who / How', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + кто + действие + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + условие?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
      { type: 'correct', parts: [{ text: 'Where', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' we go ' }, { text: 'if', tone: 'accent' }, { text: ' they come?' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'Will she calls me if she has time?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'Will', tone: 'warning' }, { text: ' she call me ' }, { text: 'if', tone: 'accent' }, { text: ' she has time?' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'What will you do if it will rain?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + хто + дія + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + умова?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
      { type: 'formula', parts: [{ text: 'What / Where / Who / How', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + хто + дія + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + умова?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + who + action + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + condition?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
    ],
  },
  {
    lessonId: 26,
    screenId: 'lesson_26_intro_4_zero_conditional_commands_practice',
    order: 4,
    kind: 'practice',
    titleRU: 'Правила, факты и команды',
    titleUK: 'Правила, факти і команди',
    titleES: 'Rules, facts, and commands',
    subtitleRU: 'Не все if-фразы про будущее. Иногда if говорит о правиле, факте или инструкции.',
    subtitleUK: 'Не всі if-фрази про майбутнє. Іноді if говорить про правило, факт або інструкцію.',
    subtitleES: 'Not every if-sentence is about the future. Sometimes if shows a rule, fact, or instruction.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = факт / правило', tone: 'formula' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' people do not sleep, they feel tired' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you study every day, you learn faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you press this button, the app starts' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + условие, + команда', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you are tired, rest' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you see a mistake, fix it' }] },
      { type: 'spacer' },
      { type: 'step', parts: [{ text: '1. Реальное будущее? ', tone: 'muted' }, { text: 'If + Present, will + действие', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '2. Общее правило / факт? ', tone: 'muted' }, { text: 'If + Present, Present', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Инструкция? ', tone: 'muted' }, { text: 'If + Present, команда', tone: 'accent' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'If you will need help, call me', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'If you heat water, it will gets hot', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'tip', parts: [{ text: 'Главный навык урока: ', tone: 'strong' }, { text: 'после If почти всегда сначала проверяй Present Simple, а will ставь только там, где нужен будущий результат.' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = факт / правило', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you study every day, you learn faster' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + умова, + команда', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = rule / fact', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + condition, + command', tone: 'formula' }] },
    ],
  },
];

export const LESSON_27_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 27,
    screenId: 'lesson_27_intro_1_said_that_backshift',
    order: 1,
    kind: 'concept',

    titleRU: 'Когда пересказываешь чужие слова',
    titleUK: 'Коли переказуєш чужі слова',
    titleES: 'When you report someone’s words',

    subtitleRU: 'В этом уроке ты не говоришь фразу напрямую. Ты пересказываешь, что кто-то сказал.',
    subtitleUK: 'У цьому уроці ти не говориш фразу напряму. Ти переказуєш, що хтось сказав.',
    subtitleES: 'In this lesson, you do not say the sentence directly. You report what someone said.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'Пряма речь звучит так: ', tone: 'normal' },
          { text: '"I am tired"', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'text',
        parts: [
          { text: 'Но если ты пересказываешь чужие слова, появляется рамка:', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'кто сказал', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'said that', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'пересказ', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' busy', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'were', tone: 'warning' },
          { text: ' ready', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'were', tone: 'warning' },
          { text: ' at home', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'text',
        parts: [
          { text: 'После said that в этом уроке настоящее часто сдвигается назад:', tone: 'normal' },
        ],
      },
      {
        type: 'example',
        parts: [
          { text: 'am / is -> ', tone: 'normal' },
          { text: 'was', tone: 'warning' },
          { text: ' / ', tone: 'muted' },
          { text: 'are -> ', tone: 'normal' },
          { text: 'were', tone: 'warning' },
        ],
      },
      {
        type: 'example',
        parts: [
          { text: 'need -> ', tone: 'normal' },
          { text: 'needed', tone: 'warning' },
          { text: ' / ', tone: 'muted' },
          { text: 'want -> ', tone: 'normal' },
          { text: 'wanted', tone: 'warning' },
          { text: ' / ', tone: 'muted' },
          { text: 'know -> ', tone: 'normal' },
          { text: 'knew', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'needed', tone: 'warning' },
          { text: ' help', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'wanted', tone: 'warning' },
          { text: ' coffee', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'knew', tone: 'warning' },
          { text: ' the answer', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He said that he is tired', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно в этом уроке: ', tone: 'success' },
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'text',
        parts: [
          { text: 'Пряма мова звучить так: ', tone: 'normal' },
          { text: '"I am tired"', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'хто сказав', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'said that', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'переказ', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'were', tone: 'warning' },
          { text: ' ready', tone: 'normal' },
        ],
      },
      {
        type: 'example',
        parts: [
          { text: 'am / is -> ', tone: 'normal' },
          { text: 'was', tone: 'warning' },
          { text: ' / ', tone: 'muted' },
          { text: 'are -> ', tone: 'normal' },
          { text: 'were', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'text',
        parts: [
          { text: 'Direct speech: ', tone: 'normal' },
          { text: '"I am tired"', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'who said it', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'said that', tone: 'accent' },
          { text: ' + reported idea', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'was',
        labelUK: 'was',
        labelES: 'was',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' busy', tone: 'normal' },
        ],
        ru: 'Она сказала, что занята',
        uk: 'Вона сказала, що зайнята',
        es: 'Ella dijo que estaba ocupada',
        'pt-BR': 'Ela disse que estava ocupada',
        vi: 'Cô ấy nói rằng cô ấy bận',
        id: 'Dia berkata bahwa dia sibuk',
        tr: 'Meşgul olduğunu söyledi',
        pl: 'Powiedziała, że jest zajęta',
        noteRU: 'В этом уроке she is busy при пересказе становится she was busy.',
        noteUK: 'У цьому уроці she is busy у переказі стає she was busy.',
        noteES: 'In this lesson, she is busy becomes she was busy in reported speech.',
      },
      {
        labelRU: 'needed',
        labelUK: 'needed',
        labelES: 'needed',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'needed', tone: 'warning' },
          { text: ' help', tone: 'normal' },
        ],
        ru: 'Я сказал, что мне нужна помощь',
        uk: 'Я сказав, що мені потрібна допомога',
        es: 'Dije que necesitaba ayuda',
        'pt-BR': 'Eu disse que precisava de ajuda',
        vi: 'Tôi nói rằng tôi cần giúp đỡ',
        id: 'Saya berkata bahwa saya membutuhkan bantuan',
        tr: 'Yardıma ihtiyacım olduğunu söyledim',
        pl: 'Powiedziałem, że potrzebuję pomocy',
        noteRU: 'Need сдвигается в needed.',
        noteUK: 'Need зсувається в needed.',
        noteES: 'Need shifts to needed.',
      },
    ],
  },

  {
    lessonId: 27,
    screenId: 'lesson_27_intro_2_will_can_shift',
    order: 2,
    kind: 'formula',

    titleRU: 'will становится would, can становится could',
    titleUK: 'will стає would, can стає could',
    titleES: 'will becomes would, can becomes could',

    subtitleRU: 'Когда пересказываешь будущее или возможность, в этом уроке will и can сдвигаются назад.',
    subtitleUK: 'Коли переказуєш майбутнє або можливість, у цьому уроці will і can зсуваються назад.',
    subtitleES: 'When reporting future or ability, this lesson shifts will and can back.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'will -> ', tone: 'normal' },
          { text: 'would', tone: 'warning' },
          { text: ' после said that', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call me', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' help us', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' come later', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' finish today', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' send the message', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'can -> ', tone: 'normal' },
          { text: 'could', tone: 'warning' },
          { text: ' после said that', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' help', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' call him', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' find it', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' work today', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'could not', tone: 'danger' },
          { text: ' = не мог / не могла / не могли', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'could not', tone: 'danger' },
          { text: ' wait', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'could not', tone: 'danger' },
          { text: ' hear me', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He said that he will call me', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно в этом уроке: ', tone: 'success' },
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call me', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'will -> ', tone: 'normal' },
          { text: 'would', tone: 'warning' },
          { text: ' після said that', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call me', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'can -> ', tone: 'normal' },
          { text: 'could', tone: 'warning' },
          { text: ' після said that', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' help', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'will -> ', tone: 'normal' },
          { text: 'would', tone: 'warning' },
          { text: ' after said that', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'can -> ', tone: 'normal' },
          { text: 'could', tone: 'warning' },
          { text: ' after said that', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call me', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'would',
        labelUK: 'would',
        labelES: 'would',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' open the door', tone: 'normal' },
        ],
        ru: 'Она сказала, что откроет дверь',
        uk: 'Вона сказала, що відчинить двері',
        es: 'Ella dijo que abriría la puerta',
        'pt-BR': 'Ela disse que abriria a porta',
        vi: 'Cô ấy nói rằng cô ấy sẽ mở cửa',
        id: 'Dia berkata bahwa dia akan membuka pintu',
        tr: 'Kapıyı açacağını söyledi',
        pl: 'Powiedziała, że otworzy drzwi',
        noteRU: 'Will open при пересказе становится would open.',
        noteUK: 'Will open у переказі стає would open.',
        noteES: 'Will open becomes would open in reported speech.',
      },
      {
        labelRU: 'could',
        labelUK: 'could',
        labelES: 'could',
        en: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' find it', tone: 'normal' },
        ],
        ru: 'Они сказали, что могли найти это',
        uk: 'Вони сказали, що могли знайти це',
        es: 'Ellos dijeron que podían encontrarlo',
        'pt-BR': 'Eles disseram que poderiam encontrá-lo',
        vi: 'Họ nói rằng họ có thể tìm thấy nó',
        id: 'Mereka berkata bahwa mereka bisa menemukannya',
        tr: 'Onu bulabileceklerini söylediler',
        pl: 'Powiedzieli, że mogą to znaleźć',
        noteRU: 'Can find при пересказе становится could find.',
        noteUK: 'Can find у переказі стає could find.',
        noteES: 'Can find becomes could find.',
      },
    ],
  },

  {
    lessonId: 27,
    screenId: 'lesson_27_intro_3_negatives_and_had_v3',
    order: 3,
    kind: 'formula',

    titleRU: 'did not и had + V3',
    titleUK: 'did not і had + V3',
    titleES: 'did not and had + V3',

    subtitleRU: 'В пересказе отрицания и уже завершённые действия тоже сдвигаются назад.',
    subtitleUK: 'У переказі заперечення і вже завершені дії теж зсуваються назад.',
    subtitleES: 'In reported speech, negatives and completed actions also shift back.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'said that + did not + обычный глагол', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' know', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' remember', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' have money', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' need help', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' understand', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'После did not глагол обычный: ', tone: 'strong' },
          { text: 'know, remember, have, need, understand.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He said that he did not knew', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' know', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'said that + ', tone: 'formula' },
          { text: 'had', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'V3', tone: 'warning' },
          { text: ' = сказал, что уже сделал', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' finished', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' called me', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' sent documents', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' found the keys', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' already paid', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'We said that we found the keys', tone: 'danger' },
          { text: ' если нужно "мы сказали, что уже нашли"', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' found the keys', tone: 'warning' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'said that + did not + звичайне дієслово', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' know', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that + ', tone: 'formula' },
          { text: 'had', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' finished', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'said that + did not + base verb', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that + ', tone: 'formula' },
          { text: 'had', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' finished', tone: 'warning' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'did not',
        labelUK: 'did not',
        labelES: 'did not',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' remember', tone: 'normal' },
        ],
        ru: 'Она сказала, что не помнила',
        uk: 'Вона сказала, що не памʼятала',
        es: 'Ella dijo que no recordaba',
        'pt-BR': 'Ela disse que não se lembrava',
        vi: 'Cô ấy nói rằng cô ấy không nhớ',
        id: 'Dia berkata bahwa dia tidak ingat',
        tr: 'Hatırlamadığını söyledi',
        pl: 'Powiedziała, że nie pamięta',
        noteRU: 'После did not используем remember, не remembered.',
        noteUK: 'Після did not використовуємо remember, не remembered.',
        noteES: 'After did not, use remember, not remembered.',
      },
      {
        labelRU: 'had + V3',
        labelUK: 'had + V3',
        labelES: 'had + V3',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' lost my phone', tone: 'warning' },
        ],
        ru: 'Я сказал, что потерял свой телефон',
        uk: 'Я сказав, що загубив свій телефон',
        es: 'Dije que había perdido mi teléfono',
        'pt-BR': 'Eu disse que tinha perdido meu telefone',
        vi: 'Tôi nói rằng tôi đã làm mất điện thoại của mình',
        id: 'Saya berkata bahwa saya telah kehilangan ponsel saya',
        tr: 'Telefonumu kaybettiğimi söyledim',
        pl: 'Powiedziałem, że zgubiłem telefon',
        noteRU: 'Lost здесь третья форма после had.',
        noteUK: 'Lost тут третя форма після had.',
        noteES: 'Lost is V3 after had here.',
      },
    ],
  },

  {
    lessonId: 27,
    screenId: 'lesson_27_intro_4_reporting_verbs_practice',
    order: 4,
    kind: 'practice',

    titleRU: 'said, told, explained, promised',
    titleUK: 'said, told, explained, promised',
    titleES: 'said, told, explained, promised',

    subtitleRU: 'В конце урока меняется слово пересказа, но внутри всё равно нужна правильная структура.',
    subtitleUK: 'Наприкінці уроку змінюється слово переказу, але всередині все одно потрібна правильна структура.',
    subtitleES: 'At the end of the lesson, the reporting verb changes, but the structure inside still matters.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'said that', tone: 'accent' },
          { text: ' = сказал, что', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'told me / told us', tone: 'accent' },
          { text: ' = сказал мне / нам, что', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'explained / promised / warned / admitted / replied that', tone: 'accent' },
          { text: ' = объяснил / пообещал / предупредил / признал / ответил, что', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'told me that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' okay', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'told us that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' ready', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'explained that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' late', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'promised that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'warned us that', tone: 'accent' },
          { text: ' it ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' dangerous', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'admitted that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' made a mistake', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'replied that', tone: 'accent' },
          { text: ' everything ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' okay', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'step',
        parts: [
          { text: '1. Кто пересказывает? ', tone: 'muted' },
          { text: 'He said / She told us / They warned us', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. Есть будущий смысл? ', tone: 'muted' },
          { text: 'will -> would', tone: 'warning' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. Есть возможность? ', tone: 'muted' },
          { text: 'can -> could', tone: 'warning' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '4. Уже сделал до момента речи? ', tone: 'muted' },
          { text: 'had + V3', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '5. Отрицание в прошлом? ', tone: 'muted' },
          { text: 'did not + base verb', tone: 'danger' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'She promised that she will call later', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'She ', tone: 'strong' },
          { text: 'promised that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'We admitted that we made a mistake', tone: 'danger' },
          { text: ' если нужно "мы признали, что уже сделали"', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'We ', tone: 'strong' },
          { text: 'admitted that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' made a mistake', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Главный навык урока: ', tone: 'strong' },
          { text: 'после reporting verb не копируй прямую речь. Проверь местоимение, время и форму глагола.', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'said that / told us that / promised that', tone: 'accent' },
          { text: ' + переказ', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'promised that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'admitted that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' made a mistake', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'said that / told us that / promised that', tone: 'accent' },
          { text: ' + reported idea', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'promised that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'told us',
        labelUK: 'told us',
        labelES: 'told us',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'told us that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' ready', tone: 'normal' },
        ],
        ru: 'Она сказала нам, что готова',
        uk: 'Вона сказала нам, що готова',
        es: 'Ella nos dijo que estaba lista',
        'pt-BR': 'Ela nos disse que estava pronta',
        vi: 'Cô ấy nói với chúng tôi rằng cô ấy đã sẵn sàng',
        id: 'Dia memberi tahu kami bahwa dia siap',
        tr: 'Hazır olduğunu bize söyledi',
        pl: 'Powiedziała nam, że jest gotowa',
        noteRU: 'После told нужен получатель: told us, told me.',
        noteUK: 'Після told потрібен отримувач: told us, told me.',
        noteES: 'After told, you need the receiver: told us, told me.',
      },
      {
        labelRU: 'warned us',
        labelUK: 'warned us',
        labelES: 'warned us',
        en: [
          { text: 'They ', tone: 'strong' },
          { text: 'warned us that', tone: 'accent' },
          { text: ' it ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' dangerous', tone: 'normal' },
        ],
        ru: 'Они предупредили нас, что это было опасно',
        uk: 'Вони попередили нас, що це було небезпечно',
        es: 'Ellos nos advirtieron que era peligroso',
        'pt-BR': 'Eles nos avisaram que era perigoso',
        vi: 'Họ cảnh báo chúng tôi rằng điều đó nguy hiểm',
        id: 'Mereka memperingatkan kami bahwa itu berbahaya',
        tr: 'Bunun tehlikeli olduğu konusunda bizi uyardılar',
        pl: 'Ostrzegli nas, że to było niebezpieczne',
        noteRU: 'warned us that работает как рамка пересказа.',
        noteUK: 'warned us that працює як рамка переказу.',
        noteES: 'warned us that works as a reporting frame.',
      },
      {
        labelRU: 'admitted',
        labelUK: 'admitted',
        labelES: 'admitted',
        en: [
          { text: 'We ', tone: 'strong' },
          { text: 'admitted that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' made a mistake', tone: 'warning' },
        ],
        ru: 'Мы признали, что сделали ошибку',
        uk: 'Ми визнали, що зробили помилку',
        es: 'Admitimos que habíamos cometido un error',
        'pt-BR': 'Nós admitimos que tínhamos cometido um erro',
        vi: 'Chúng tôi thừa nhận rằng chúng tôi đã mắc lỗi',
        id: 'Kami mengakui bahwa kami telah membuat kesalahan',
        tr: 'Bir hata yaptığımızı kabul ettik',
        pl: 'Przyznaliśmy, że popełniliśmy błąd',
        noteRU: 'had made показывает действие, которое уже было сделано к моменту признания.',
        noteUK: 'had made показує дію, яка вже була зроблена до моменту визнання.',
        noteES: 'had made shows the action was already completed before the admission.',
      },
    ],
  },
];

export const LESSON_28_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 28,
    screenId: 'lesson_28_intro_1_reflexive_core',
    order: 1,
    kind: 'concept',

    titleRU: 'Когда действие возвращается на себя',
    titleUK: 'Коли дія повертається на себе',
    titleES: 'When the action goes back to yourself',

    subtitleRU: 'myself / yourself / himself показывают, что человек делает действие с самим собой.',
    subtitleUK: 'myself / yourself / himself показують, що людина робить дію із самою собою.',
    subtitleES: 'myself / yourself / himself show that the action goes back to the same person.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'В этом уроке часто нужно сказать: ', tone: 'normal' },
          { text: 'себя / сам себя / сами себя', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'кто', tone: 'formula' },
          { text: ' + действие + ', tone: 'muted' },
          { text: 'myself / yourself / himself / herself / itself / ourselves / yourselves / themselves', tone: 'accent' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I hurt ', tone: 'normal' },
          { text: 'myself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You hurt ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He hurt ', tone: 'normal' },
          { text: 'himself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She hurt ', tone: 'normal' },
          { text: 'herself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The app closed ', tone: 'normal' },
          { text: 'itself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We prepared ', tone: 'normal' },
          { text: 'ourselves', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They protected ', tone: 'normal' },
          { text: 'themselves', tone: 'accent' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная проверка: ', tone: 'strong' },
          { text: 'смотри на первого участника фразы. I -> myself, he -> himself, she -> herself, they -> themselves.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He hurt hisself', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'He hurt ', tone: 'normal' },
          { text: 'himself', tone: 'accent' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'text',
        parts: [
          { text: 'У цьому уроці часто потрібно сказати: ', tone: 'normal' },
          { text: 'себе / сам себе / самі себе', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'хто', tone: 'formula' },
          { text: ' + дія + ', tone: 'muted' },
          { text: 'myself / yourself / himself / herself / itself / ourselves / yourselves / themselves', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I hurt ', tone: 'normal' },
          { text: 'myself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He hurt ', tone: 'normal' },
          { text: 'himself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She hurt ', tone: 'normal' },
          { text: 'herself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They protected ', tone: 'normal' },
          { text: 'themselves', tone: 'accent' },
        ],
      },
    ],

    linesES: [
      {
        type: 'text',
        parts: [
          { text: 'These words show that the action goes back to the same person:', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'person', tone: 'formula' },
          { text: ' + action + ', tone: 'muted' },
          { text: 'myself / yourself / himself / herself / itself / ourselves / themselves', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I hurt ', tone: 'normal' },
          { text: 'myself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The app closed ', tone: 'normal' },
          { text: 'itself', tone: 'accent' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'I -> myself',
        labelUK: 'I -> myself',
        labelES: 'I -> myself',
        en: [
          { text: 'I hurt ', tone: 'normal' },
          { text: 'myself', tone: 'accent' },
        ],
        ru: 'Я ушибся',
        uk: 'Я забився',
        es: 'Me lastimé',
        'pt-BR': 'Eu me machuquei',
        vi: 'Tôi tự làm mình bị thương',
        id: 'Saya melukai diri sendiri',
        tr: 'Kendimi incittim',
        pl: 'Zraniłem się',
        noteRU: 'I требует myself.',
        noteUK: 'I вимагає myself.',
        noteES: 'Use myself with I.',
      },
      {
        labelRU: 'they -> themselves',
        labelUK: 'they -> themselves',
        labelES: 'they -> themselves',
        en: [
          { text: 'They protected ', tone: 'normal' },
          { text: 'themselves', tone: 'accent' },
        ],
        ru: 'Они защитили себя',
        uk: 'Вони захистили себе',
        es: 'Se protegieron',
        'pt-BR': 'Eles se protegeram',
        vi: 'Họ đã tự bảo vệ mình',
        id: 'Mereka melindungi diri mereka sendiri',
        tr: 'Kendilerini korudular',
        pl: 'Oni ochronili samych siebie',
        noteRU: 'They требует themselves.',
        noteUK: 'They вимагає themselves.',
        noteES: 'Use themselves with they.',
      },
    ],
  },

  {
    lessonId: 28,
    screenId: 'lesson_28_intro_2_emphasis_myself',
    order: 2,
    kind: 'formula',

    titleRU: 'Когда значит "сам"',
    titleUK: 'Коли означає "сам"',
    titleES: 'When it means "by myself / yourself"',

    subtitleRU: 'Иногда -self / -selves не значит "себя", а усиливает: я сам, она сама, они сами.',
    subtitleUK: 'Іноді -self / -selves не означає "себе", а підсилює: я сам, вона сама, вони самі.',
    subtitleES: 'Sometimes -self / -selves adds emphasis: I did it myself.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'Сравни два смысла:', tone: 'normal' },
        ],
      },
      {
        type: 'example',
        parts: [
          { text: 'I hurt ', tone: 'normal' },
          { text: 'myself', tone: 'accent' },
          { text: ' = я ушибся', tone: 'muted' },
        ],
      },
      {
        type: 'example',
        parts: [
          { text: 'I did it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
          { text: ' = я сделал это сам', tone: 'muted' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'кто + сделал действие + ', tone: 'formula' },
          { text: 'myself / yourself / himself / herself / ourselves / yourselves / themselves', tone: 'warning' },
          { text: ' = сам / сама / сами', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I did it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You did it ', tone: 'normal' },
          { text: 'yourself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He did it ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She did it ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We did it ', tone: 'normal' },
          { text: 'ourselves', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They did it ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I fixed it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She cooked dinner ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They cleaned the room ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'They did it themself', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'They did it ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'хто + зробив дію + ', tone: 'formula' },
          { text: 'myself / yourself / himself / herself / ourselves / yourselves / themselves', tone: 'warning' },
          { text: ' = сам / сама / самі', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I did it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She cooked dinner ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They cleaned the room ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'person + action + ', tone: 'formula' },
          { text: 'myself / yourself / himself / herself / themselves', tone: 'warning' },
          { text: ' = emphasis', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I did it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They cleaned the room ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'сам сделал',
        labelUK: 'сам зробив',
        labelES: 'did it myself',
        en: [
          { text: 'I fixed it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
        ru: 'Я сам это исправил',
        uk: 'Я сам це виправив',
        es: 'Lo arreglé yo mismo',
        'pt-BR': 'Eu mesmo consertei isso',
        vi: 'Tôi tự sửa nó',
        id: 'Saya memperbaikinya sendiri',
        tr: 'Onu kendim tamir ettim',
        pl: 'Sam to naprawiłem',
        noteRU: 'myself усиливает: без чужой помощи.',
        noteUK: 'myself підсилює: без чужої допомоги.',
        noteES: 'myself adds emphasis: without someone else.',
      },
      {
        labelRU: 'сами сделали',
        labelUK: 'самі зробили',
        labelES: 'did it themselves',
        en: [
          { text: 'They cleaned the room ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
        ru: 'Они сами убрали комнату',
        uk: 'Вони самі прибрали кімнату',
        es: 'Ellos mismos limpiaron la habitación',
        'pt-BR': 'Eles mesmos limparam o quarto',
        vi: 'Họ tự dọn phòng',
        id: 'Mereka membersihkan kamar itu sendiri',
        tr: 'Odayı kendileri temizlediler',
        pl: 'Sami posprzątali pokój',
        noteRU: 'They требует themselves.',
        noteUK: 'They вимагає themselves.',
        noteES: 'Use themselves with they.',
      },
    ],
  },

  {
    lessonId: 28,
    screenId: 'lesson_28_intro_3_questions_negatives_modals',
    order: 3,
    kind: 'formula',

    titleRU: 'Вопросы, отрицания и cannot',
    titleUK: 'Питання, заперечення і cannot',
    titleES: 'Questions, negatives, and cannot',

    subtitleRU: 'Self-слово остаётся в конце, но грамматика вокруг него меняется: Did, did not, can, should.',
    subtitleUK: 'Self-слово залишається в кінці, але граматика навколо нього змінюється: Did, did not, can, should.',
    subtitleES: 'The self-word stays, but the grammar around it changes: Did, did not, can, should.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'accent' },
          { text: ' + кто + действие + ', tone: 'formula' },
          { text: 'self-word?', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'Did you hurt ', tone: 'normal' },
          { text: 'yourself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did he hurt ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did she teach ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did they prepare ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did you do it ', tone: 'normal' },
          { text: 'yourself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'кто + did not + действие + ', tone: 'formula' },
          { text: 'self-word', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I did not hurt ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He did not teach ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She did not blame ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We did not protect ', tone: 'normal' },
          { text: 'ourselves', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'cannot / should + действие + ', tone: 'formula' },
          { text: 'self-word', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I cannot force ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He cannot control ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They cannot stop ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Should we prepare ', tone: 'normal' },
          { text: 'ourselves', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Did he hurted himself?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Did he hurt ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He cannot controls himself', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'He cannot control ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'accent' },
          { text: ' + хто + дія + ', tone: 'formula' },
          { text: 'self-word?', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did you hurt ', tone: 'normal' },
          { text: 'yourself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did they prepare ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'cannot / should + дія + ', tone: 'formula' },
          { text: 'self-word', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He cannot control ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'accent' },
          { text: ' + who + action + ', tone: 'formula' },
          { text: 'self-word?', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did you hurt ', tone: 'normal' },
          { text: 'yourself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'cannot + action + ', tone: 'formula' },
          { text: 'self-word', tone: 'warning' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'Did question',
        labelUK: 'Did question',
        labelES: 'Did question',
        en: [
          { text: 'Did she write it ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
        ru: 'Она сама это написала?',
        uk: 'Вона сама це написала?',
        es: '¿Ella lo escribió misma?',
        'pt-BR': 'Ela mesma escreveu isso?',
        vi: 'Cô ấy tự viết nó à?',
        id: 'Apakah dia menulisnya sendiri?',
        tr: 'Onu kendisi mi yazdı?',
        pl: 'Czy ona sama to napisała?',
        noteRU: 'После Did основной глагол write без прошлой формы wrote.',
        noteUK: 'Після Did головне дієслово write без минулої форми wrote.',
        noteES: 'After Did, use write, not wrote.',
      },
      {
        labelRU: 'cannot',
        labelUK: 'cannot',
        labelES: 'cannot',
        en: [
          { text: 'She cannot forgive ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
        ],
        ru: 'Она не может простить себя',
        uk: 'Вона не може пробачити себе',
        es: 'Ella no puede perdonarse',
        'pt-BR': 'Ela não consegue se perdoar',
        vi: 'Cô ấy không thể tha thứ cho chính mình',
        id: 'Dia tidak bisa memaafkan dirinya sendiri',
        tr: 'Kendini affedemiyor',
        pl: 'Ona nie może sobie wybaczyć',
        noteRU: 'После cannot глагол forgive обычный, без -s.',
        noteUK: 'Після cannot дієслово forgive звичайне, без -s.',
        noteES: 'After cannot, use forgive with no -s.',
      },
    ],
  },

  {
    lessonId: 28,
    screenId: 'lesson_28_intro_4_fixed_phrases_practice',
    order: 4,
    kind: 'practice',

    titleRU: 'Готовые фразы с yourself',
    titleUK: 'Готові фрази з yourself',
    titleES: 'Fixed phrases with yourself',

    subtitleRU: 'В конце урока появляются живые команды и советы, где yourself лучше запоминать целой связкой.',
    subtitleUK: 'Наприкінці уроку зʼявляються живі команди й поради, де yourself краще запамʼятовувати цілою звʼязкою.',
    subtitleES: 'At the end of the lesson, some phrases with yourself work best as fixed chunks.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'Некоторые фразы лучше не разбирать дословно. Их нужно узнавать как готовые блоки:', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'Help ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = угощайся', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Be ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = будь собой', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Take care of ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = береги себя', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Believe in ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = верь в себя', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Trust ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = доверяй себе', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Teach ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' every day = учись самостоятельно каждый день', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Ask ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' why = спроси себя почему', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Remind ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' to rest = напомни себе отдохнуть', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Give ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' time = дай себе время', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Do not blame ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = не вини себя', tone: 'muted' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'step',
        parts: [
          { text: '1. Действие на себя? ', tone: 'muted' },
          { text: 'hurt myself / protect themselves', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. Значит "сам"? ', tone: 'muted' },
          { text: 'I did it myself / They cleaned it themselves', tone: 'warning' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. Это готовая команда? ', tone: 'muted' },
          { text: 'Take care of yourself / Be yourself', tone: 'accent' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Believe yourself', tone: 'danger' },
          { text: ' если смысл "верь в себя"', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Believe in ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Do not blame you', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Do not blame ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Главный навык урока: ', tone: 'strong' },
          { text: 'сначала понять роль self-слова: "себя", "сам" или готовая фраза.', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'correct',
        parts: [
          { text: 'Help ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = пригощайся', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Be ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = будь собою', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Take care of ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = бережи себе', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Believe in ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = вір у себе', tone: 'muted' },
        ],
      },
    ],

    linesES: [
      {
        type: 'correct',
        parts: [
          { text: 'Help ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = help yourself', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Take care of ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = take care of yourself', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Believe in ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'готовая фраза',
        labelUK: 'готова фраза',
        labelES: 'fixed phrase',
        en: [
          { text: 'Take care of ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
        ru: 'Береги себя',
        uk: 'Бережи себе',
        es: 'Cuídate',
        'pt-BR': 'Cuide-se',
        vi: 'Hãy tự chăm sóc bản thân',
        id: 'Jaga dirimu',
        tr: 'Kendine iyi bak',
        pl: 'Dbaj o siebie',
        noteRU: 'Take care of yourself лучше запоминать целиком.',
        noteUK: 'Take care of yourself краще запамʼятовувати цілком.',
        noteES: 'Take care of yourself works best as a full chunk.',
      },
      {
        labelRU: 'не вини себя',
        labelUK: 'не звинувачуй себе',
        labelES: 'do not blame yourself',
        en: [
          { text: 'Do not blame ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
        ru: 'Не вини себя',
        uk: 'Не звинувачуй себе',
        es: 'No te culpes',
        'pt-BR': 'Não se culpe',
        vi: 'Đừng tự trách mình',
        id: 'Jangan menyalahkan dirimu sendiri',
        tr: 'Kendini suçlama',
        pl: 'Nie obwiniaj się',
        noteRU: 'yourself нужен, потому что действие направлено на самого человека.',
        noteUK: 'yourself потрібен, бо дія спрямована на саму людину.',
        noteES: 'yourself is needed because the action points back to the same person.',
      },
    ],
  },
];

export const LESSON_29_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 29,
    screenId: 'lesson_29_intro_1_used_to_core',
    order: 1,
    kind: 'concept',

    titleRU: 'Раньше было, сейчас уже нет',
    titleUK: 'Раніше було, зараз уже ні',
    titleES: 'It was true before, not now',

    subtitleRU: 'used to показывает старую привычку или старое состояние.',
    subtitleUK: 'used to показує стару звичку або старий стан.',
    subtitleES: 'used to shows an old habit or an old state.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'Когда по-русски фраза начинается с ', tone: 'normal' },
          { text: '"раньше..."', tone: 'strong' },
          { text: ', английский часто использует связку ', tone: 'normal' },
          { text: 'used to', tone: 'accent' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'кто', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'действие', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' work here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' call me every day', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' study English', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' work together', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live near us', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная идея: ', tone: 'strong' },
          { text: 'used to не значит "использовал". Здесь это "раньше обычно делал / раньше было так".', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I use to live here', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно в утверждении: ', tone: 'success' },
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live here', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'text',
        parts: [
          { text: 'Коли фраза починається з ', tone: 'normal' },
          { text: '"раніше..."', tone: 'strong' },
          { text: ', англійська часто використовує ', tone: 'normal' },
          { text: 'used to', tone: 'accent' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'хто', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'дія', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' call me every day', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live near us', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'text',
        parts: [
          { text: 'Use ', tone: 'normal' },
          { text: 'used to', tone: 'accent' },
          { text: ' for an old habit or old situation.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'who', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'accent' },
          { text: ' + action', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live here', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'раньше жил',
        labelUK: 'раніше жив',
        labelES: 'used to live',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live here', tone: 'normal' },
        ],
        ru: 'Раньше я жил здесь',
        uk: 'Раніше я жив тут',
        es: 'Antes vivía aquí',
        'pt-BR': 'Eu morava aqui antes',
        vi: 'Trước đây tôi từng sống ở đây',
        id: 'Dulu saya tinggal di sini',
        tr: 'Eskiden burada yaşardım',
        pl: 'Kiedyś tu mieszkałem',
        noteRU: 'used to показывает старую ситуацию, а не действие сейчас.',
        noteUK: 'used to показує стару ситуацію, а не дію зараз.',
        noteES: 'used to shows an old situation, not a current action.',
      },
      {
        labelRU: 'раньше звонил',
        labelUK: 'раніше телефонував',
        labelES: 'used to call',
        en: [
          { text: 'He ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' call me every day', tone: 'normal' },
        ],
        ru: 'Раньше он звонил мне каждый день',
        uk: 'Раніше він телефонував мені щодня',
        es: 'Antes me llamaba todos los días',
        'pt-BR': 'Antes ele me ligava todos os dias',
        vi: 'Trước đây anh ấy gọi cho tôi mỗi ngày',
        id: 'Dulu dia menelepon saya setiap hari',
        tr: 'Eskiden beni her gün arardı',
        pl: 'Kiedyś dzwonił do mnie codziennie',
        noteRU: 'Every day здесь старая привычка.',
        noteUK: 'Every day тут стара звичка.',
        noteES: 'Every day shows an old habit here.',
      },
    ],
  },

  {
    lessonId: 29,
    screenId: 'lesson_29_intro_2_past_vs_now',
    order: 2,
    kind: 'formula',

    titleRU: 'Раньше vs сейчас',
    titleUK: 'Раніше vs зараз',
    titleES: 'Before vs now',

    subtitleRU: 'used to часто показывает контраст: раньше было так, а сейчас иначе.',
    subtitleUK: 'used to часто показує контраст: раніше було так, а зараз інакше.',
    subtitleES: 'used to often shows contrast: before it was one way, now it is different.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'used to', tone: 'accent' },
          { text: ' + старое действие', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'but now', tone: 'warning' },
          { text: ' + новая ситуация', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' wake up early, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' I wake up late', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' work at night, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' she works in the morning', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live there, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' we live here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' call us, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' they send messages', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' spend money, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' he saves money', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' forget keys, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' I check my bag', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная проверка: ', tone: 'strong' },
          { text: 'после but now уже обычное настоящее: works, sends, saves, checks.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'She used to work at night, but now she work in the morning', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'She used to work at night, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' she works in the morning', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'used to', tone: 'accent' },
          { text: ' + стара дія', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'but now', tone: 'warning' },
          { text: ' + нова ситуація', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' wake up early, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' I wake up late', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' work at night, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' she works in the morning', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'used to', tone: 'accent' },
          { text: ' + old habit + ', tone: 'formula' },
          { text: 'but now', tone: 'warning' },
          { text: ' + current situation', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live there, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' we live here', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'старое и новое',
        labelUK: 'старе і нове',
        labelES: 'old and new',
        en: [
          { text: 'He ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' spend money, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' he saves money', tone: 'normal' },
        ],
        ru: 'Раньше он тратил деньги, но сейчас экономит',
        uk: 'Раніше він витрачав гроші, але зараз економить',
        es: 'Antes él gastaba dinero, pero ahora ahorra',
        'pt-BR': 'Antes ele gastava dinheiro, mas agora economiza',
        vi: 'Trước đây anh ấy tiêu tiền, nhưng bây giờ anh ấy tiết kiệm',
        id: 'Dulu dia menghabiskan uang, tetapi sekarang dia menabung',
        tr: 'Eskiden para harcardı, ama şimdi para biriktiriyor',
        pl: 'Kiedyś wydawał pieniądze, ale teraz oszczędza',
        noteRU: 'used to = раньше, but now = сейчас по-другому.',
        noteUK: 'used to = раніше, but now = зараз інакше.',
        noteES: 'used to = before, but now = different now.',
      },
      {
        labelRU: 'изменение привычки',
        labelUK: 'зміна звички',
        labelES: 'habit change',
        en: [
          { text: 'We ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' order food, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' we cook at home', tone: 'normal' },
        ],
        ru: 'Раньше мы заказывали еду, но сейчас готовим дома',
        uk: 'Раніше ми замовляли їжу, але зараз готуємо вдома',
        es: 'Antes pedíamos comida, pero ahora cocinamos en casa',
        'pt-BR': 'Antes pedíamos comida, mas agora cozinhamos em casa',
        vi: 'Trước đây chúng tôi đặt đồ ăn, nhưng bây giờ chúng tôi nấu ở nhà',
        id: 'Dulu kami memesan makanan, tetapi sekarang kami memasak di rumah',
        tr: 'Eskiden yemek sipariş ederdik, ama şimdi evde yemek yapıyoruz',
        pl: 'Kiedyś zamawialiśmy jedzenie, ale teraz gotujemy w domu',
        noteRU: 'Во второй части обычное настоящее: we cook.',
        noteUK: 'У другій частині звичайний теперішній час: we cook.',
        noteES: 'The second part uses normal present: we cook.',
      },
    ],
  },

  {
    lessonId: 29,
    screenId: 'lesson_29_intro_3_negative_use_to',
    order: 3,
    kind: 'formula',

    titleRU: 'Отрицание: did not use to',
    titleUK: 'Заперечення: did not use to',
    titleES: 'Negative: did not use to',

    subtitleRU: 'После did not форма меняется: use to без d.',
    subtitleUK: 'Після did not форма змінюється: use to без d.',
    subtitleES: 'After did not, the form changes: use to without d.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'кто', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'did not', tone: 'danger' },
          { text: ' + ', tone: 'muted' },
          { text: 'use to', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'действие', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' drink coffee', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' work here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' call me', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' study every day', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' travel often', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' help us', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' wake up early', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' drive at night', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная ловушка: ', tone: 'strong' },
          { text: 'в утверждении used to, но после did not - use to без d.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He did not used to call me', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'He ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' call me', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'хто', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'did not', tone: 'danger' },
          { text: ' + ', tone: 'muted' },
          { text: 'use to', tone: 'accent' },
          { text: ' + дія', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' drink coffee', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' call me', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'who + ', tone: 'formula' },
          { text: 'did not', tone: 'danger' },
          { text: ' + ', tone: 'muted' },
          { text: 'use to', tone: 'accent' },
          { text: ' + action', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' drink coffee', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'раньше не',
        labelUK: 'раніше не',
        labelES: 'did not use to',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' understand English', tone: 'normal' },
        ],
        ru: 'Раньше я не понимал английский',
        uk: 'Раніше я не розумів англійську',
        es: 'Antes no entendía inglés',
        'pt-BR': 'Antes eu não entendia inglês',
        vi: 'Trước đây tôi không hiểu tiếng Anh',
        id: 'Dulu saya tidak memahami bahasa Inggris',
        tr: 'Eskiden İngilizce anlamazdım',
        pl: 'Kiedyś nie rozumiałem angielskiego',
        noteRU: 'После did not пишем use to, не used to.',
        noteUK: 'Після did not пишемо use to, не used to.',
        noteES: 'After did not, write use to, not used to.',
      },
      {
        labelRU: 'she did not',
        labelUK: 'she did not',
        labelES: 'she did not',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' drive at night', tone: 'normal' },
        ],
        ru: 'Раньше она не водила ночью',
        uk: 'Раніше вона не водила вночі',
        es: 'Antes ella no conducía de noche',
        'pt-BR': 'Antes ela não dirigia à noite',
        vi: 'Trước đây cô ấy không lái xe ban đêm',
        id: 'Dulu dia tidak menyetir pada malam hari',
        tr: 'Eskiden geceleri araba kullanmazdı',
        pl: 'Kiedyś nie jeździła nocą',
        noteRU: 'Did not уже показывает прошлое, поэтому use to без d.',
        noteUK: 'Did not уже показує минуле, тому use to без d.',
        noteES: 'Did not already marks the past, so use use to without d.',
      },
    ],
  },

  {
    lessonId: 29,
    screenId: 'lesson_29_intro_4_questions_be_practice',
    order: 4,
    kind: 'practice',

    titleRU: 'Вопросы и "used to be"',
    titleUK: 'Питання і "used to be"',
    titleES: 'Questions and "used to be"',

    subtitleRU: 'В вопросе Did выходит в начало, а used to снова становится use to.',
    subtitleUK: 'У питанні Did виходить на початок, а used to знову стає use to.',
    subtitleES: 'In questions, Did moves to the front, and used to becomes use to again.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' + кто + ', tone: 'formula' },
          { text: 'use to', tone: 'accent' },
          { text: ' + действие?', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' live here?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' she ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' call you?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' they ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' work together?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' he ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' study English?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' we ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' meet on Fridays?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' she ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' read books at night?', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'used to be', tone: 'accent' },
          { text: ' + состояние / качество', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to be', tone: 'accent' },
          { text: ' shy', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'used to be', tone: 'accent' },
          { text: ' afraid of mistakes', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'step',
        parts: [
          { text: '1. Утверждение "раньше..." -> ', tone: 'muted' },
          { text: 'used to', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. Отрицание "раньше не..." -> ', tone: 'muted' },
          { text: 'did not use to', tone: 'danger' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. Вопрос "раньше...?" -> ', tone: 'muted' },
          { text: 'Did + subject + use to', tone: 'danger' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '4. "Раньше был / была..." -> ', tone: 'muted' },
          { text: 'used to be', tone: 'accent' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Did you used to live here?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Did', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' live here?', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I used to shy', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I ', tone: 'strong' },
          { text: 'used to be', tone: 'accent' },
          { text: ' shy', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Главный навык урока: ', tone: 'strong' },
          { text: 'не путать used to в утверждении с use to после did / did not.', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' + хто + ', tone: 'formula' },
          { text: 'use to', tone: 'accent' },
          { text: ' + дія?', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' live here?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' she ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' call you?', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'used to be', tone: 'accent' },
          { text: ' + стан / якість', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to be', tone: 'accent' },
          { text: ' shy', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' + who + ', tone: 'formula' },
          { text: 'use to', tone: 'accent' },
          { text: ' + action?', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' live here?', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'used to be', tone: 'accent' },
          { text: ' + state / quality', tone: 'formula' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'вопрос',
        labelUK: 'питання',
        labelES: 'question',
        en: [
          { text: 'Did', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' wake up early?', tone: 'normal' },
        ],
        ru: 'Ты раньше просыпался рано?',
        uk: 'Ти раніше прокидався рано?',
        es: '¿Te despertabas temprano antes?',
        'pt-BR': 'Você acordava cedo antes?',
        vi: 'Trước đây bạn có thường dậy sớm không?',
        id: 'Apakah dulu kamu biasa bangun pagi?',
        tr: 'Eskiden erken uyanır mıydın?',
        pl: 'Czy kiedyś budziłeś się wcześnie?',
        noteRU: 'После Did пишем use to без d.',
        noteUK: 'Після Did пишемо use to без d.',
        noteES: 'After Did, write use to without d.',
      },
      {
        labelRU: 'used to be',
        labelUK: 'used to be',
        labelES: 'used to be',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'used to be', tone: 'accent' },
          { text: ' afraid of mistakes', tone: 'normal' },
        ],
        ru: 'Раньше она боялась ошибок',
        uk: 'Раніше вона боялася помилок',
        es: 'Antes ella tenía miedo de los errores',
        'pt-BR': 'Antes ela tinha medo de erros',
        vi: 'Trước đây cô ấy sợ mắc lỗi',
        id: 'Dulu dia takut membuat kesalahan',
        tr: 'Eskiden hata yapmaktan korkardı',
        pl: 'Kiedyś bała się błędów',
        noteRU: 'Для состояния нужен be: used to be afraid.',
        noteUK: 'Для стану потрібне be: used to be afraid.',
        noteES: 'For a state, use be: used to be afraid.',
      },
      {
        labelRU: 'изменение',
        labelUK: 'зміна',
        labelES: 'change',
        en: [
          { text: 'We ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' learn slowly, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' we learn faster', tone: 'normal' },
        ],
        ru: 'Раньше мы учились медленно, но сейчас учимся быстрее',
        uk: 'Раніше ми вчилися повільно, але зараз вчимося швидше',
        es: 'Antes aprendíamos despacio, pero ahora aprendemos más rápido',
        'pt-BR': 'Antes aprendíamos devagar, mas agora aprendemos mais rápido',
        vi: 'Trước đây chúng tôi học chậm, nhưng bây giờ chúng tôi học nhanh hơn',
        id: 'Dulu kami belajar perlahan, tetapi sekarang kami belajar lebih cepat',
        tr: 'Eskiden yavaş öğrenirdik, ama şimdi daha hızlı öğreniyoruz',
        pl: 'Kiedyś uczyliśmy się powoli, ale teraz uczymy się szybciej',
        noteRU: 'Фраза показывает изменение: раньше медленно, сейчас быстрее.',
        noteUK: 'Фраза показує зміну: раніше повільно, зараз швидше.',
        noteES: 'The sentence shows change: slowly before, faster now.',
      },
    ],
  },
];

export const LESSON_30_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 30,
    screenId: 'lesson_30_intro_1_who_people',
    order: 1,
    kind: 'concept',

    titleRU: 'Который говорит о человеке',
    titleUK: 'Який говорить про людину',
    titleES: 'Who for people',

    subtitleRU: 'who добавляет информацию о человеке: мужчина, который работает здесь.',
    subtitleUK: 'who додає інформацію про людину: чоловік, який працює тут.',
    subtitleES: 'who adds information about a person: a man who works here.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'В этом уроке фраза часто состоит из двух частей: ', tone: 'normal' },
          { text: 'главная мысль', tone: 'strong' },
          { text: ' + ', tone: 'normal' },
          { text: 'уточнение', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'человек', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + действие / описание', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She knows a woman ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' speaks English', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We met a person ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' can help us', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They called a doctor ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' lives nearby', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I have a friend ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' studies every day', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She has a sister ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works at night', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная проверка: ', tone: 'strong' },
          { text: 'если уточняешь человека, в этом уроке выбирай who.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I know a man which works here', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'text',
        parts: [
          { text: 'У цьому уроці фраза часто складається з двох частин: ', tone: 'normal' },
          { text: 'головна думка', tone: 'strong' },
          { text: ' + ', tone: 'normal' },
          { text: 'уточнення', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'людина', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + дія / опис', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We met a person ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' can help us', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'text',
        parts: [
          { text: 'Use ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' if the extra information is about a person.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'person', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + action / description', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'человек + who',
        labelUK: 'людина + who',
        labelES: 'person + who',
        en: [
          { text: 'This is the student ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' answered correctly', tone: 'normal' },
        ],
        ru: 'Это студент, который ответил правильно',
        uk: 'Це студент, який відповів правильно',
        es: 'Este es el estudiante que respondió correctamente',
        'pt-BR': 'Este é o aluno que respondeu corretamente',
        vi: 'Đây là học viên đã trả lời đúng',
        id: 'Ini siswa yang menjawab dengan benar',
        tr: 'Doğru cevap veren öğrenci bu',
        pl: 'To jest student, który odpowiedział poprawnie',
        noteRU: 'Student - человек, поэтому who.',
        noteUK: 'Student - людина, тому who.',
        noteES: 'Student is a person, so use who.',
      },
      {
        labelRU: 'люди + who',
        labelUK: 'люди + who',
        labelES: 'people + who',
        en: [
          { text: 'I like people ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' listen carefully', tone: 'normal' },
        ],
        ru: 'Мне нравятся люди, которые внимательно слушают',
        uk: 'Мені подобаються люди, які уважно слухають',
        es: 'Me gustan las personas que escuchan con atención',
        'pt-BR': 'Gosto de pessoas que escutam com atenção',
        vi: 'Tôi thích những người lắng nghe cẩn thận',
        id: 'Saya suka orang yang mendengarkan dengan saksama',
        tr: 'Dikkatle dinleyen insanları severim',
        pl: 'Lubię ludzi, którzy uważnie słuchają',
        noteRU: 'People - люди, поэтому who.',
        noteUK: 'People - люди, тому who.',
        noteES: 'People means persons, so use who.',
      },
    ],
  },

  {
    lessonId: 30,
    screenId: 'lesson_30_intro_2_that_which_things',
    order: 2,
    kind: 'formula',

    titleRU: 'Который говорит о вещи',
    titleUK: 'Який говорить про річ',
    titleES: 'That / which for things',

    subtitleRU: 'that и which добавляют информацию о предмете, приложении, телефоне, книге, сообщении или плане.',
    subtitleUK: 'that і which додають інформацію про предмет, додаток, телефон, книгу, повідомлення або план.',
    subtitleES: 'that and which add information about a thing, app, phone, book, message, or plan.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'предмет / вещь', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + уточнение', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the phone ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' I bought yesterday', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the book ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' she read', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'These are the tickets ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' we found', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the message ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' he sent me', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the problem ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' we solved', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'This is the food ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we ordered', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная проверка: ', tone: 'strong' },
          { text: 'если уточняешь не человека, а вещь или идею, в этом уроке выбирай that / which.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'This is the phone who I bought yesterday', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'This is the phone ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' I bought yesterday', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'предмет / річ', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + уточнення', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'thing', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + extra information', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'that',
        labelUK: 'that',
        labelES: 'that',
        en: [
          { text: 'This is the answer ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' she gave me', tone: 'normal' },
        ],
        ru: 'Это ответ, который она дала мне',
        uk: 'Це відповідь, яку вона дала мені',
        es: 'Esta es la respuesta que ella me dio',
        'pt-BR': 'Esta é a resposta que ela me deu',
        vi: 'Đây là câu trả lời mà cô ấy đã đưa cho tôi',
        id: 'Ini jawaban yang dia berikan kepada saya',
        tr: 'Bana verdiği cevap bu',
        pl: 'To jest odpowiedź, którą mi dała',
        noteRU: 'Answer - не человек, поэтому that.',
        noteUK: 'Answer - не людина, тому that.',
        noteES: 'Answer is not a person, so use that.',
      },
      {
        labelRU: 'which',
        labelUK: 'which',
        labelES: 'which',
        en: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
        ru: 'Это план, который мы выбрали',
        uk: 'Це план, який ми обрали',
        es: 'Este es el plan que elegimos',
        'pt-BR': 'Este é o plano que escolhemos',
        vi: 'Đây là kế hoạch mà chúng tôi đã chọn',
        id: 'Ini rencana yang kami pilih',
        tr: 'Seçtiğimiz plan bu',
        pl: 'To jest plan, który wybraliśmy',
        noteRU: 'Which здесь тоже уточняет вещь / идею.',
        noteUK: 'Which тут теж уточнює річ / ідею.',
        noteES: 'Which also adds information about a thing or idea here.',
      },
    ],
  },

  {
    lessonId: 30,
    screenId: 'lesson_30_intro_3_where_whose',
    order: 3,
    kind: 'formula',

    titleRU: 'Где и чей',
    titleUK: 'Де і чий',
    titleES: 'Where and whose',

    subtitleRU: 'where уточняет место. whose показывает принадлежность: чей телефон, чья сумка, чьи ключи.',
    subtitleUK: 'where уточнює місце. whose показує належність: чий телефон, чия сумка, чиї ключі.',
    subtitleES: 'where adds location. whose shows possession: whose phone, whose bag, whose keys.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'место', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + что там происходит / произошло', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the room ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' I work', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the house ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' she lives', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the shop ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' I bought the phone', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the hotel ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' they stayed', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the table ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' I left the keys', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'человек', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + предмет + остальная часть', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She knows a woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We helped a student ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' answer was wrong', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' keys we found', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'This is the place who we met', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I know a man who phone is lost', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'місце', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + що там відбувається / відбулося', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'людина', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + предмет + решта', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'place', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + what happens there', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'person', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + thing + rest', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'where',
        labelUK: 'where',
        labelES: 'where',
        en: [
          { text: 'Find a place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' you can study', tone: 'normal' },
        ],
        ru: 'Найди место, где ты можешь заниматься',
        uk: 'Знайди місце, де ти можеш займатися',
        es: 'Encuentra un lugar donde puedas estudiar',
        'pt-BR': 'Encontre um lugar onde você possa estudar',
        vi: 'Hãy tìm một nơi mà bạn có thể học',
        id: 'Temukan tempat di mana kamu bisa belajar',
        tr: 'Çalışabileceğin bir yer bul',
        pl: 'Znajdź miejsce, w którym możesz się uczyć',
        noteRU: 'Place - место, поэтому where.',
        noteUK: 'Place - місце, тому where.',
        noteES: 'Place is a location, so use where.',
      },
      {
        labelRU: 'whose',
        labelUK: 'whose',
        labelES: 'whose',
        en: [
          { text: 'This is the teacher ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' lesson helped me', tone: 'normal' },
        ],
        ru: 'Это учитель, чей урок помог мне',
        uk: 'Це вчитель, чий урок допоміг мені',
        es: 'Este es el maestro cuya lección me ayudó',
        'pt-BR': 'Este é o professor cuja aula me ajudou',
        vi: 'Đây là giáo viên mà bài học của họ đã giúp tôi',
        id: 'Ini guru yang pelajarannya membantu saya',
        tr: 'Dersi bana yardımcı olan öğretmen bu',
        pl: 'To jest nauczyciel, którego lekcja mi pomogła',
        noteRU: 'Whose связывает человека и то, что ему принадлежит: teacher -> lesson.',
        noteUK: 'Whose звʼязує людину і те, що їй належить: teacher -> lesson.',
        noteES: 'Whose connects a person with something connected to them: teacher -> lesson.',
      },
    ],
  },

  {
    lessonId: 30,
    screenId: 'lesson_30_intro_4_questions_practice',
    order: 4,
    kind: 'practice',

    titleRU: 'Как собирать такие фразы в задании',
    titleUK: 'Як складати такі фрази в завданні',
    titleES: 'How to build these sentences in the task',

    subtitleRU: 'Сначала найди слово, которое нужно уточнить: человек, предмет, место или принадлежность.',
    subtitleUK: 'Спочатку знайди слово, яке треба уточнити: людина, предмет, місце або належність.',
    subtitleES: 'First find what needs extra information: person, thing, place, or possession.',

    linesRU: [
      {
        type: 'step',
        parts: [
          { text: '1. Уточняешь человека? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ': the man who called me', tone: 'normal' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. Уточняешь предмет / вещь? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ': the app that helps you learn', tone: 'normal' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. Уточняешь место? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ': the place where we met', tone: 'normal' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '4. Уточняешь "чей / чья / чьи"? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ': the woman whose bag is here', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'Do you know the man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' called me?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Do you remember the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are these the documents ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' you checked?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are they the people ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' helped us?', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Is this the app who helps you learn?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Is she the woman who bag is here?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Главный навык урока: ', tone: 'strong' },
          { text: 'не переводить русский "который" одним словом. Сначала реши: человек, вещь, место или чей.', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'step',
        parts: [
          { text: '1. Уточнюєш людину? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. Уточнюєш предмет / річ? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. Уточнюєш місце? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '4. Уточнюєш "чий / чия / чиї"? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Do you know the man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' called me?', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'step',
        parts: [
          { text: 'Person? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Thing? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Place? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Possession? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'вопрос с who',
        labelUK: 'питання з who',
        labelES: 'question with who',
        en: [
          { text: 'Are they the people ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' helped us?', tone: 'normal' },
        ],
        ru: 'Это те люди, которые помогли нам?',
        uk: 'Це ті люди, які допомогли нам?',
        es: '¿Son ellos las personas que nos ayudaron?',
        'pt-BR': 'São essas as pessoas que nos ajudaram?',
        vi: 'Họ có phải là những người đã giúp chúng ta không?',
        id: 'Apakah mereka orang-orang yang membantu kita?',
        tr: 'Bize yardım eden kişiler onlar mı?',
        pl: 'Czy to są ludzie, którzy nam pomogli?',
        noteRU: 'People - люди, поэтому who.',
        noteUK: 'People - люди, тому who.',
        noteES: 'People are persons, so use who.',
      },
      {
        labelRU: 'команда с where',
        labelUK: 'команда з where',
        labelES: 'command with where',
        en: [
          { text: 'Find a place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' you can study', tone: 'normal' },
        ],
        ru: 'Найди место, где ты можешь заниматься',
        uk: 'Знайди місце, де ти можеш займатися',
        es: 'Encuentra un lugar donde puedas estudiar',
        'pt-BR': 'Encontre um lugar onde você possa estudar',
        vi: 'Hãy tìm một nơi mà bạn có thể học',
        id: 'Temukan tempat di mana kamu bisa belajar',
        tr: 'Çalışabileceğin bir yer bul',
        pl: 'Znajdź miejsce, w którym możesz się uczyć',
        noteRU: 'Place требует where.',
        noteUK: 'Place вимагає where.',
        noteES: 'Use where for a place.',
      },
      {
        labelRU: 'вопрос с whose',
        labelUK: 'питання з whose',
        labelES: 'question with whose',
        en: [
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
        ru: 'Это та женщина, чья сумка здесь?',
        uk: 'Це та жінка, чия сумка тут?',
        es: '¿Es ella la mujer cuya bolsa está aquí?',
        'pt-BR': 'Ela é a mulher cuja bolsa está aqui?',
        vi: 'Cô ấy có phải là người phụ nữ có chiếc túi ở đây không?',
        id: 'Apakah dia wanita yang tasnya ada di sini?',
        tr: 'Çantası burada olan kadın o mu?',
        pl: 'Czy ona jest kobietą, której torba jest tutaj?',
        noteRU: 'Чья сумка = whose bag.',
        noteUK: 'Чия сумка = whose bag.',
        noteES: 'Whose bag means possession.',
      },
    ],
  },
];

export const LESSON_31_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 31,
    screenId: 'lesson_31_intro_1_causative_perception_bare_infinitive',
    order: 1,
    kind: 'concept',

    titleRU: 'После made / let / heard / noticed',
    titleUK: 'Після made / let / heard / noticed',
    titleES: 'After made / let / heard / noticed',

    subtitleRU: 'В этом уроке после made, let, heard, saw, noticed, felt и helped часто идёт действие без to.',
    subtitleUK: 'У цьому уроці після made, let, heard, saw, noticed, felt і helped часто йде дія без to.',
    subtitleES: 'In this lesson, after made, let, heard, saw, noticed, felt, and helped, the action often goes without to.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'Главная ловушка урока: ', tone: 'strong' },
          { text: 'после made / let / saw / heard / noticed часто не ставим to перед вторым действием.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + кто / что + ', tone: 'formula' },
          { text: 'действие без to', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Но ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' работает иначе: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'made', tone: 'accent' },
          { text: ' us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'let', tone: 'accent' },
          { text: ' me ', tone: 'normal' },
          { text: 'use', tone: 'warning' },
          { text: ' his phone', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'saw', tone: 'accent' },
          { text: ' him ', tone: 'normal' },
          { text: 'leave', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'heard', tone: 'accent' },
          { text: ' me ', tone: 'normal' },
          { text: 'call', tone: 'warning' },
          { text: ' her', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'felt', tone: 'accent' },
          { text: ' the phone ', tone: 'normal' },
          { text: 'vibrate', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This lesson ', tone: 'strong' },
          { text: 'helped', tone: 'accent' },
          { text: ' me ', tone: 'normal' },
          { text: 'understand', tone: 'warning' },
          { text: ' English better', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'They made us to wait outside', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He let me to use his phone', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'He let me ', tone: 'normal' },
          { text: 'use', tone: 'warning' },
          { text: ' his phone', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'text',
        parts: [
          { text: 'Головна пастка уроку: ', tone: 'strong' },
          { text: 'після made / let / saw / heard / noticed часто не ставимо to перед другою дією.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + хто / що + ', tone: 'formula' },
          { text: 'дія без to', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Але ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' працює інакше: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'made', tone: 'accent' },
          { text: ' us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'let', tone: 'accent' },
          { text: ' me ', tone: 'normal' },
          { text: 'use', tone: 'warning' },
          { text: ' his phone', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'saw', tone: 'accent' },
          { text: ' him ', tone: 'normal' },
          { text: 'leave', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'text',
        parts: [
          { text: 'The main trap: after made / let / saw / heard / noticed, often do not put ', tone: 'normal' },
          { text: 'to', tone: 'danger' },
          { text: ' before the second action.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + person / thing + ', tone: 'formula' },
          { text: 'action without to', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'But ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' is different: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'made',
        labelUK: 'made',
        labelES: 'made',
        en: [
          { text: 'That firm manager made that late employee ', tone: 'normal' },
          { text: 'finish', tone: 'warning' },
          { text: ' that boring report', tone: 'normal' },
        ],
        ru: 'Тот жёсткий руководитель заставил того опоздавшего сотрудника закончить тот скучный отчёт',
        uk: 'Той рішучий керівник змусив того запізненого співробітника закінчити той нудний звіт',
        es: 'Ese gerente firme hizo terminar ese informe aburrido a ese empleado tardío',
        'pt-BR': 'Aquele gerente firme fez aquele funcionário atrasado terminar aquele relatório chato',
        vi: 'Người quản lý cứng rắn đó đã bắt nhân viên đến muộn đó hoàn thành bản báo cáo nhàm chán đó',
        id: 'Manajer tegas itu membuat karyawan yang terlambat itu menyelesaikan laporan membosankan itu',
        tr: 'O sert yönetici, o geç kalan çalışana o sıkıcı raporu bitirtti',
        pl: 'Ten stanowczy kierownik kazał temu spóźnionemu pracownikowi skończyć ten nudny raport',
        noteRU: 'После made второе действие finish идёт без to.',
        noteUK: 'Після made друга дія finish йде без to.',
        noteES: 'After made, use finish without to.',
      },
      {
        labelRU: 'heard',
        labelUK: 'heard',
        labelES: 'heard',
        en: [
          { text: 'They heard that skilled mechanic ', tone: 'normal' },
          { text: 'explain', tone: 'warning' },
          { text: ' that serious engine problem', tone: 'normal' },
        ],
        ru: 'Они слышали, как тот опытный механик объяснял ту серьёзную неисправность мотора',
        uk: 'Вони чули, як той вправний механік пояснював ту серйозну несправність мотора',
        es: 'Oyeron explicar a ese mecánico hábil ese grave problema del motor',
        'pt-BR': 'Eles ouviram aquele mecânico habilidoso explicar aquele problema sério do motor',
        vi: 'Họ đã nghe người thợ máy lành nghề đó giải thích vấn đề nghiêm trọng đó của động cơ',
        id: 'Mereka mendengar mekanik terampil itu menjelaskan masalah mesin yang serius itu',
        tr: 'O yetenekli tamircinin o ciddi motor sorununu açıkladığını duydular',
        pl: 'Usłyszeli, jak ten wykwalifikowany mechanik wyjaśnia ten poważny problem z silnikiem',
        noteRU: 'После heard действие explain тоже без to.',
        noteUK: 'Після heard дія explain теж без to.',
        noteES: 'After heard, use explain without to.',
      },
    ],
  },

  {
    lessonId: 31,
    screenId: 'lesson_31_intro_2_complex_noun_groups',
    order: 2,
    kind: 'formula',

    titleRU: 'Длинные группы: that + описание + предмет',
    titleUK: 'Довгі групи: that + опис + предмет',
    titleES: 'Long groups: that + description + noun',

    subtitleRU: 'В уроке много длинных блоков. Их надо собирать как один предмет, а не как хаос из слов.',
    subtitleUK: 'В уроці багато довгих блоків. Їх треба складати як один предмет, а не як хаос зі слів.',
    subtitleES: 'This lesson has many long noun groups. Build them as one unit, not as random words.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + описание + предмет', tone: 'formula' },
          { text: ' = тот / та / то / те ...', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
          { text: ' = тот неопытный водитель', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'huge fine', tone: 'warning' },
          { text: ' = тот огромный штраф', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'complex flight procedure', tone: 'warning' },
          { text: ' = та сложная процедура полёта', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'leather briefcase', tone: 'warning' },
          { text: ' = тот кожаный портфель', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'old jazz composition', tone: 'warning' },
          { text: ' = та старая джазовая композиция', tone: 'muted' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'They made ', tone: 'normal' },
          { text: 'that inexperienced driver', tone: 'warning' },
          { text: ' pay ', tone: 'normal' },
          { text: 'that huge fine', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I heard ', tone: 'normal' },
          { text: 'that experienced pilot', tone: 'warning' },
          { text: ' explain ', tone: 'normal' },
          { text: 'that complex flight procedure', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She heard ', tone: 'normal' },
          { text: 'that famous singer', tone: 'warning' },
          { text: ' sing ', tone: 'normal' },
          { text: 'that old jazz composition', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная проверка: ', tone: 'strong' },
          { text: 'не пытайся переводить каждое слово отдельно. Сначала собери noun group: that + описание + предмет.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так по смыслу: ', tone: 'warning' },
          { text: 'that driver inexperienced', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'that inexperienced driver', tone: 'warning' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + опис + предмет', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'huge fine', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + description + noun', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'noun group',
        labelUK: 'noun group',
        labelES: 'noun group',
        en: [
          { text: 'that ', tone: 'accent' },
          { text: 'suspicious visitor', tone: 'warning' },
        ],
        ru: 'тот подозрительный посетитель',
        uk: 'той підозрілий відвідувач',
        es: 'ese visitante sospechoso',
        'pt-BR': 'aquele visitante suspeito',
        vi: 'vị khách đáng ngờ đó',
        id: 'pengunjung mencurigakan itu',
        tr: 'o şüpheli ziyaretçi',
        pl: 'ten podejrzany gość',
        noteRU: 'Описание suspicious стоит перед предметом visitor.',
        noteUK: 'Опис suspicious стоїть перед предметом visitor.',
        noteES: 'The description suspicious comes before the noun visitor.',
      },
      {
        labelRU: 'noun group',
        labelUK: 'noun group',
        labelES: 'noun group',
        en: [
          { text: 'that ', tone: 'accent' },
          { text: 'serious engine problem', tone: 'warning' },
        ],
        ru: 'та серьёзная неисправность мотора',
        uk: 'та серйозна несправність мотора',
        es: 'ese grave problema del motor',
        'pt-BR': 'aquele problema sério do motor',
        vi: 'vấn đề nghiêm trọng đó của động cơ',
        id: 'masalah mesin yang serius itu',
        tr: 'o ciddi motor sorunu',
        pl: 'ten poważny problem z silnikiem',
        noteRU: 'В английском описания идут перед главным предметом problem.',
        noteUK: 'В англійській описи йдуть перед головним предметом problem.',
        noteES: 'In English, descriptions come before the main noun problem.',
      },
    ],
  },

  {
    lessonId: 31,
    screenId: 'lesson_31_intro_3_conditionals_reported_passive',
    order: 3,
    kind: 'formula',

    titleRU: 'Сложные связки: если бы, сказали, что, было сделано',
    titleUK: 'Складні звʼязки: якби, сказали, що, було зроблено',
    titleES: 'Complex links: if had, said that, was done',

    subtitleRU: 'В середине урока повторяются сильные конструкции: Third Conditional, reported speech и passive.',
    subtitleUK: 'У середині уроку повторюються сильні конструкції: Third Conditional, reported speech і passive.',
    subtitleES: 'The middle of the lesson revisits strong structures: Third Conditional, reported speech, and passive.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
          { text: ' = если бы..., то бы...', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If she ', tone: 'normal' },
          { text: 'had called', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have answered', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If they ', tone: 'normal' },
          { text: 'had checked', tone: 'accent' },
          { text: ' the room, they ', tone: 'normal' },
          { text: 'would have found', tone: 'warning' },
          { text: ' the keys', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'said that + форма со сдвигом времени', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'had sent', tone: 'warning' },
          { text: ' the documents', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'was / were told that + passive', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'was told that', tone: 'accent' },
          { text: ' the app ', tone: 'strong' },
          { text: 'was fixed', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the problem ', tone: 'strong' },
          { text: 'was solved', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'If I knew, I would have helped', tone: 'danger' },
          { text: ' если смысл "если бы я знал тогда"', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + зміщена часова форма', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'Third Conditional',
        labelUK: 'Third Conditional',
        labelES: 'Third Conditional',
        en: [
          { text: 'If we ', tone: 'normal' },
          { text: 'had started', tone: 'accent' },
          { text: ' earlier, we ', tone: 'normal' },
          { text: 'would have finished', tone: 'warning' },
        ],
        ru: 'Если бы мы начали раньше, мы бы закончили',
        uk: 'Якби ми почали раніше, ми б закінчили',
        es: 'Si hubiéramos empezado antes, habríamos terminado',
        'pt-BR': 'Se tivéssemos começado mais cedo, teríamos terminado',
        vi: 'Nếu chúng tôi đã bắt đầu sớm hơn, chúng tôi đã hoàn thành rồi',
        id: 'Jika kami mulai lebih awal, kami pasti sudah selesai',
        tr: 'Daha erken başlasaydık bitirmiş olurduk',
        pl: 'Gdybyśmy zaczęli wcześniej, skończylibyśmy',
        noteRU: 'Это сожаление о прошлом: had started + would have finished.',
        noteUK: 'Це жаль про минуле: had started + would have finished.',
        noteES: 'This is about an unreal past: had started + would have finished.',
      },
      {
        labelRU: 'reported passive',
        labelUK: 'reported passive',
        labelES: 'reported passive',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'was told that', tone: 'accent' },
          { text: ' the app ', tone: 'strong' },
          { text: 'was fixed', tone: 'warning' },
        ],
        ru: 'Мне сказали, что приложение починили',
        uk: 'Мені сказали, що додаток полагодили',
        es: 'Me dijeron que la aplicación fue arreglada',
        'pt-BR': 'Me disseram que o aplicativo foi corrigido',
        vi: 'Tôi được bảo rằng ứng dụng đã được sửa',
        id: 'Saya diberi tahu bahwa aplikasi itu sudah diperbaiki',
        tr: 'Bana uygulamanın düzeltildiği söylendi',
        pl: 'Powiedziano mi, że aplikacja została naprawiona',
        noteRU: 'was told вводит пересказ, was fixed показывает пассив.',
        noteUK: 'was told вводить переказ, was fixed показує пасив.',
        noteES: 'was told introduces the report, and was fixed is passive.',
      },
    ],
  },

  {
    lessonId: 31,
    screenId: 'lesson_31_intro_4_final_advanced_mix',
    order: 4,
    kind: 'practice',

    titleRU: 'Финальные формы урока',
    titleUK: 'Фінальні форми уроку',
    titleES: 'Final advanced forms',

    subtitleRU: 'В конце урока идут have been + -ing, is being + V3, would rather и need / want + object + V3.',
    subtitleUK: 'Наприкінці уроку йдуть have been + -ing, is being + V3, would rather і need / want + object + V3.',
    subtitleES: 'At the end of the lesson: have been + -ing, is being + V3, would rather, and need / want + object + V3.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = действие длится до сейчас', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'have been waiting', tone: 'accent' },
          { text: ' for an hour', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'has been studying', tone: 'accent' },
          { text: ' all morning', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'have been working', tone: 'accent' },
          { text: ' since eight', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = прямо сейчас что-то делается с предметом', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The room ', tone: 'strong' },
          { text: 'is being cleaned', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The documents ', tone: 'strong' },
          { text: 'are being checked', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
          { text: ' = я бы предпочёл, чтобы...', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'did not call', tone: 'warning' },
          { text: ' him', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' we ', tone: 'strong' },
          { text: 'started', tone: 'warning' },
          { text: ' later', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'need / want + object + V3', tone: 'accent' },
          { text: ' = нужно / хотят, чтобы это сделали', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need ', tone: 'normal' },
          { text: 'the documents', tone: 'strong' },
          { text: ' checked today', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We need ', tone: 'normal' },
          { text: 'the room', tone: 'strong' },
          { text: ' cleaned before evening', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They want ', tone: 'normal' },
          { text: 'the problem', tone: 'strong' },
          { text: ' solved quickly', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I would rather you stay here', tone: 'danger' },
          { text: ' в этой фразе урока', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'I would rather you ', tone: 'danger' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I need the documents check today', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = дія триває дотепер', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'have been waiting', tone: 'accent' },
          { text: ' for an hour', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = над предметом зараз виконують дію', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The room ', tone: 'strong' },
          { text: 'is being cleaned', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
          { text: ' = я б волів, щоб...', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'have been',
        labelUK: 'have been',
        labelES: 'have been',
        en: [
          { text: 'They ', tone: 'strong' },
          { text: 'have been looking', tone: 'accent' },
          { text: ' for the keys', tone: 'normal' },
        ],
        ru: 'Они ищут ключи',
        uk: 'Вони шукають ключі',
        es: 'Han estado buscando las llaves',
        'pt-BR': 'Eles têm procurado as chaves',
        vi: 'Họ đã và đang tìm chìa khóa',
        id: 'Mereka telah mencari kuncinya',
        tr: 'Anahtarları arayıp duruyorlar',
        pl: 'Oni szukają kluczy',
        noteRU: 'have been looking показывает процесс, который тянется до сейчас.',
        noteUK: 'have been looking показує процес, який триває дотепер.',
        noteES: 'have been looking shows a process continuing up to now.',
      },
      {
        labelRU: 'object + V3',
        labelUK: 'object + V3',
        labelES: 'object + V3',
        en: [
          { text: 'They want ', tone: 'normal' },
          { text: 'the problem', tone: 'strong' },
          { text: ' solved quickly', tone: 'warning' },
        ],
        ru: 'Они хотят, чтобы проблему решили быстро',
        uk: 'Вони хочуть, щоб проблему вирішили швидко',
        es: 'Quieren el problema resuelto rápidamente',
        'pt-BR': 'Eles querem o problema resolvido rapidamente',
        vi: 'Họ muốn vấn đề được giải quyết nhanh chóng',
        id: 'Mereka ingin masalah itu diselesaikan dengan cepat',
        tr: 'Sorunun hızlıca çözülmesini istiyorlar',
        pl: 'Chcą, żeby problem został szybko rozwiązany',
        noteRU: 'Solved показывает желаемый результат для problem.',
        noteUK: 'Solved показує бажаний результат для problem.',
        noteES: 'Solved shows the desired result for problem.',
      },
    ],
  },
];

export const LESSON_32_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 32,
    screenId: 'lesson_32_intro_1_be_used_to',
    order: 1,
    kind: 'concept',

    titleRU: 'Привык к действию',
    titleUK: 'Звик до дії',
    titleES: 'Used to doing something',

    subtitleRU: 'be used to + V-ing значит "быть привыкшим к действию". Это не used to из урока 29.',
    subtitleUK: 'be used to + V-ing означає "бути звиклим до дії". Це не used to з уроку 29.',
    subtitleES: 'be used to + V-ing means "be accustomed to doing something". This is not past used to.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'В уроке 29 было ', tone: 'normal' },
          { text: 'used to + действие', tone: 'accent' },
          { text: ' = раньше делал, сейчас уже не так.', tone: 'normal' },
        ],
      },
      {
        type: 'text',
        parts: [
          { text: 'В уроке 32 другое:', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' = привык к действию', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'is', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' waking up early', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'are', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' speaking English every day', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'are', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' waiting here', tone: 'danger' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'not', tone: 'danger' },
          { text: ' ставится после am / is / are, а ', tone: 'normal' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' остаётся.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'is', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' driving in the city', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' working so late', tone: 'danger' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' + subject + ', tone: 'formula' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' studying every day?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' living here?', tone: 'danger' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I used to working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' working at night', tone: 'danger' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'She is used to wake up early', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'She is used to ', tone: 'normal' },
          { text: 'waking up', tone: 'danger' },
          { text: ' early', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' = звик до дії', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' studying every day?', tone: 'danger' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'working at night', tone: 'danger' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'привык',
        labelUK: 'звик',
        labelES: 'used to',
        en: [
          { text: 'We ', tone: 'strong' },
          { text: 'are', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'speaking English every day', tone: 'danger' },
        ],
        ru: 'Мы привыкли говорить по-английски каждый день',
        uk: 'Ми звикли говорити англійською щодня',
        es: 'Estamos acostumbrados a hablar inglés todos los días',
        'pt-BR': 'Estamos acostumados a falar inglês todos os dias',
        vi: 'Chúng tôi đã quen với việc nói tiếng Anh mỗi ngày',
        id: 'Kami terbiasa berbicara bahasa Inggris setiap hari',
        tr: 'Her gün İngilizce konuşmaya alışkınız',
        pl: 'Jesteśmy przyzwyczajeni do mówienia po angielsku codziennie',
        noteRU: 'После be used to действие идёт в -ing форме.',
        noteUK: 'Після be used to дія йде у формі -ing.',
        noteES: 'After be used to, the action takes -ing.',
      },
      {
        labelRU: 'вопрос',
        labelUK: 'питання',
        labelES: 'question',
        en: [
          { text: 'Are', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' living here?', tone: 'danger' },
        ],
        ru: 'Они привыкли жить здесь?',
        uk: 'Вони звикли жити тут?',
        es: '¿Están acostumbrados a vivir aquí?',
        'pt-BR': 'Eles estão acostumados a morar aqui?',
        vi: 'Họ đã quen sống ở đây chưa?',
        id: 'Apakah mereka terbiasa tinggal di sini?',
        tr: 'Burada yaşamaya alışkınlar mı?',
        pl: 'Czy oni są przyzwyczajeni do mieszkania tutaj?',
        noteRU: 'В вопросе Are выходит в начало, но living остаётся с -ing.',
        noteUK: 'У питанні Are виходить на початок, але living залишається з -ing.',
        noteES: 'In a question, Are moves to the front, but living keeps -ing.',
      },
    ],
  },

  {
    lessonId: 32,
    screenId: 'lesson_32_intro_2_relative_reported_passive',
    order: 2,
    kind: 'formula',

    titleRU: 'Уточнения и пересказ',
    titleUK: 'Уточнення і переказ',
    titleES: 'Extra information and reporting',

    subtitleRU: 'В середине урока смешиваются relative clauses, reported speech и passive.',
    subtitleUK: 'У середині уроку змішуються relative clauses, reported speech і passive.',
    subtitleES: 'The middle of the lesson mixes relative clauses, reported speech, and passive.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = уточняющий блок внутри фразы', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'This is the person ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' helped me', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She is the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag we found', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I called the man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' sent the message', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We found the keys ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' she lost', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They opened the room ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we waited', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I remember the teacher ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' lesson helped me', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'said that / explained that / was told that', tone: 'accent' },
          { text: ' + пересказ', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'had sent', tone: 'warning' },
          { text: ' the documents', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'was told that', tone: 'accent' },
          { text: ' the app ', tone: 'strong' },
          { text: 'was fixed', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'She is the woman who bag we found', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'She is the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag we found', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'She said that she will call later', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'She said that she ', tone: 'normal' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = уточнення всередині фрази', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the person ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' helped me', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She is the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag we found', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + переказ', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He said that he ', tone: 'normal' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = extra information inside the sentence', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + reported idea', tone: 'formula' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'relative',
        labelUK: 'relative',
        labelES: 'relative',
        en: [
          { text: 'They opened the room ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we waited', tone: 'normal' },
        ],
        ru: 'Они открыли комнату, где мы ждали',
        uk: 'Вони відкрили кімнату, де ми чекали',
        es: 'Abrieron la habitación donde esperábamos',
        'pt-BR': 'Eles abriram a sala onde esperávamos',
        vi: 'Họ đã mở căn phòng nơi chúng tôi đã chờ',
        id: 'Mereka membuka ruangan tempat kami menunggu',
        tr: 'Beklediğimiz odayı açtılar',
        pl: 'Otworzyli pokój, w którym czekaliśmy',
        noteRU: 'Room - место, поэтому where.',
        noteUK: 'Room - місце, тому where.',
        noteES: 'Room is a place, so use where.',
      },
      {
        labelRU: 'reported passive',
        labelUK: 'reported passive',
        labelES: 'reported passive',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'was told that', tone: 'accent' },
          { text: ' the app ', tone: 'strong' },
          { text: 'was fixed', tone: 'warning' },
        ],
        ru: 'Мне сказали, что приложение починили',
        uk: 'Мені сказали, що додаток полагодили',
        es: 'Me dijeron que la aplicación fue arreglada',
        'pt-BR': 'Me disseram que o aplicativo foi corrigido',
        vi: 'Tôi được bảo rằng ứng dụng đã được sửa',
        id: 'Saya diberi tahu bahwa aplikasi itu sudah diperbaiki',
        tr: 'Bana uygulamanın düzeltildiği söylendi',
        pl: 'Powiedziano mi, że aplikacja została naprawiona',
        noteRU: 'was told вводит пересказ, was fixed показывает пассив.',
        noteUK: 'was told вводить переказ, was fixed показує пасив.',
        noteES: 'was told introduces the report, and was fixed is passive.',
      },
    ],
  },

  {
    lessonId: 32,
    screenId: 'lesson_32_intro_3_conditionals_bare_infinitive',
    order: 3,
    kind: 'formula',

    titleRU: 'If и действие без to',
    titleUK: 'If і дія без to',
    titleES: 'If and action without to',

    subtitleRU: 'Этот экран закрывает две большие ловушки: will после if и лишнее to после saw / heard / made / let.',
    subtitleUK: 'Цей екран закриває дві великі пастки: will після if і зайве to після saw / heard / made / let.',
    subtitleES: 'This screen covers two big traps: will after if and extra to after saw / heard / made / let.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + действие', tone: 'warning' },
          { text: ' = реальное будущее условие', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' she has time, she ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' help us', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' they do not come, we ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' start without them', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'danger' },
          { text: ' = нереальное прошлое', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If she ', tone: 'normal' },
          { text: 'had called', tone: 'accent' },
          { text: ' me, I ', tone: 'normal' },
          { text: 'would have answered', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If we ', tone: 'normal' },
          { text: 'had started', tone: 'accent' },
          { text: ' earlier, we ', tone: 'normal' },
          { text: 'would have finished', tone: 'danger' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / felt / made / let / helped', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'действие без to', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I saw him ', tone: 'normal' },
          { text: 'leave', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She heard me ', tone: 'normal' },
          { text: 'call', tone: 'warning' },
          { text: ' her', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We felt the phone ', tone: 'normal' },
          { text: 'vibrate', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He let me ', tone: 'normal' },
          { text: 'use', tone: 'warning' },
          { text: ' his phone', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This lesson helped me ', tone: 'normal' },
          { text: 'understand', tone: 'warning' },
          { text: ' English better', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'If you will call me, I will answer', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'They made us to wait outside', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + дія', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / made / let', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'дія без to', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + action', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / made / let', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'action without to', tone: 'warning' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'if',
        labelUK: 'if',
        labelES: 'if',
        en: [
          { text: 'If', tone: 'accent' },
          { text: ' she has time, she ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' help us', tone: 'normal' },
        ],
        ru: 'Если у неё будет время, она нам поможет',
        uk: 'Якщо в неї буде час, вона нам допоможе',
        es: 'Si ella tiene tiempo, nos ayudará',
        'pt-BR': 'Se ela tiver tempo, ela nos ajudará',
        vi: 'Nếu cô ấy có thời gian, cô ấy sẽ giúp chúng ta',
        id: 'Jika dia punya waktu, dia akan membantu kita',
        tr: 'Zamanı olursa bize yardım edecek',
        pl: 'Jeśli będzie miała czas, pomoże nam',
        noteRU: 'После if стоит has без will. Will стоит в результате.',
        noteUK: 'Після if стоїть has без will. Will стоїть у результаті.',
        noteES: 'After if, use has without will. Will is in the result.',
      },
      {
        labelRU: 'bare infinitive',
        labelUK: 'bare infinitive',
        labelES: 'bare infinitive',
        en: [
          { text: 'He let me ', tone: 'normal' },
          { text: 'use', tone: 'warning' },
          { text: ' his phone', tone: 'normal' },
        ],
        ru: 'Он позволил мне воспользоваться его телефоном',
        uk: 'Він дозволив мені скористатися його телефоном',
        es: 'Me dejó usar su teléfono',
        'pt-BR': 'Ele me deixou usar o telefone dele',
        vi: 'Anh ấy cho tôi dùng điện thoại của anh ấy',
        id: 'Dia membiarkan saya menggunakan ponselnya',
        tr: 'Telefonunu kullanmama izin verdi',
        pl: 'Pozwolił mi użyć swojego telefonu',
        noteRU: 'После let действие use идёт без to.',
        noteUK: 'Після let дія use йде без to.',
        noteES: 'After let, write use without to.',
      },
    ],
  },

  {
    lessonId: 32,
    screenId: 'lesson_32_intro_4_final_advanced_practice',
    order: 4,
    kind: 'practice',

    titleRU: 'Финальный advanced-блок',
    titleUK: 'Фінальний advanced-блок',
    titleES: 'Final advanced block',

    subtitleRU: 'В финале урока идут самые плотные формы: have been + -ing, is being + V3, would rather и object + V3.',
    subtitleUK: 'У фіналі уроку йдуть найнасиченіші форми: have been + -ing, is being + V3, would rather і object + V3.',
    subtitleES: 'The final part uses the densest forms: have been + -ing, is being + V3, would rather, and object + V3.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = процесс длится до сейчас', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'have been waiting', tone: 'accent' },
          { text: ' for an hour', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'has been studying', tone: 'accent' },
          { text: ' all morning', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'have been working', tone: 'accent' },
          { text: ' since eight', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'have been looking', tone: 'accent' },
          { text: ' for the keys', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = прямо сейчас что-то делается с предметом', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The room ', tone: 'strong' },
          { text: 'is being cleaned', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The documents ', tone: 'strong' },
          { text: 'are being checked', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
          { text: ' = я бы предпочёл, чтобы...', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'did not call', tone: 'warning' },
          { text: ' him', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' we ', tone: 'strong' },
          { text: 'started', tone: 'warning' },
          { text: ' later', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'need / want + object + V3', tone: 'accent' },
          { text: ' = нужно / хотят, чтобы это сделали', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need ', tone: 'normal' },
          { text: 'the documents', tone: 'strong' },
          { text: ' checked today', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We need ', tone: 'normal' },
          { text: 'the room', tone: 'strong' },
          { text: ' cleaned before evening', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They want ', tone: 'normal' },
          { text: 'the problem', tone: 'strong' },
          { text: ' solved quickly', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'step',
        parts: [
          { text: '1. "Привык к действию"? ', tone: 'muted' },
          { text: 'am / is / are used to + V-ing', tone: 'danger' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. "Длится до сейчас"? ', tone: 'muted' },
          { text: 'have / has been + V-ing', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. "Сейчас делается с предметом"? ', tone: 'muted' },
          { text: 'is / are being + V3', tone: 'warning' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '4. "Я бы предпочёл, чтобы..."? ', tone: 'muted' },
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '5. "Нужно, чтобы сделали"? ', tone: 'muted' },
          { text: 'need / want + object + V3', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I have waiting for an hour', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I ', tone: 'strong' },
          { text: 'have been waiting', tone: 'accent' },
          { text: ' for an hour', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I would rather you stay here', tone: 'danger' },
          { text: ' в этой фразе урока', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'I would rather you ', tone: 'danger' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I need the documents check today', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = дія триває дотепер', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'have been waiting', tone: 'accent' },
          { text: ' for an hour', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = над предметом зараз виконують дію', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The room ', tone: 'strong' },
          { text: 'is being cleaned', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
          { text: ' = я б волів, щоб...', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I would rather you ', tone: 'danger' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'процесс до сейчас',
        labelUK: 'процес дотепер',
        labelES: 'process up to now',
        en: [
          { text: 'They ', tone: 'strong' },
          { text: 'have been looking', tone: 'accent' },
          { text: ' for the keys', tone: 'normal' },
        ],
        ru: 'Они ищут ключи',
        uk: 'Вони шукають ключі',
        es: 'Han estado buscando las llaves',
        'pt-BR': 'Eles têm procurado as chaves',
        vi: 'Họ đã và đang tìm chìa khóa',
        id: 'Mereka telah mencari kuncinya',
        tr: 'Anahtarları arayıp duruyorlar',
        pl: 'Oni szukają kluczy',
        noteRU: 'have been looking показывает процесс, который тянется до сейчас.',
        noteUK: 'have been looking показує процес, який триває дотепер.',
        noteES: 'have been looking shows a process continuing up to now.',
      },
      {
        labelRU: 'object + V3',
        labelUK: 'object + V3',
        labelES: 'object + V3',
        en: [
          { text: 'They want ', tone: 'normal' },
          { text: 'the problem', tone: 'strong' },
          { text: ' solved quickly', tone: 'warning' },
        ],
        ru: 'Они хотят, чтобы проблему решили быстро',
        uk: 'Вони хочуть, щоб проблему вирішили швидко',
        es: 'Quieren el problema resuelto rápidamente',
        'pt-BR': 'Eles querem o problema resolvido rapidamente',
        vi: 'Họ muốn vấn đề được giải quyết nhanh chóng',
        id: 'Mereka ingin masalah itu diselesaikan dengan cepat',
        tr: 'Sorunun hızlıca çözülmesini istiyorlar',
        pl: 'Chcą, żeby problem został szybko rozwiązany',
        noteRU: 'Solved показывает желаемый результат для problem.',
        noteUK: 'Solved показує бажаний результат для problem.',
        noteES: 'Solved shows the desired result for problem.',
      },
    ],
  },
];
