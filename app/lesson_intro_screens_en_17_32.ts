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
  { titleRU: 'Повелительное', titleUK: 'Наказовий спосіб', titleES: 'Imperativo (EN)',
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
    textUK: 'in Kyiv · on the bus (разговорно) vs in the car — отрабатываем в уроке.',
    textES: 'Collocations fijos.',
    examples: [
      { en: 'She is in the kitchen.', trRU: 'Она на кухне.', trUK: 'Вона на кухні.' },
      { en: 'The keys are on the desk.', trRU: 'Ключи на столе.', trUK: 'Ключі на столі.' },
      { en: 'I am at school.', trRU: 'Я в школе.', trUK: 'Я в школі.' },
    ]},
  { textRU: 'Калька «в автобусе» легко даёт ошибку: чаще on the bus, но в заданиях следуй тому, что отрабатывает урок.',
    textUK: 'Транспорт і прийменники — запам’ятовуємо готовими парами.',
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
    textUK: 'Не подвійне заперечення як у російській.',
    textES: 'Sin doble negación estilo ruso.' },
);

export const LESSON_22_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Герундий -ing', titleUK: 'Герундій -ing', titleES: 'Gerundio -ing',
    textRU: 'Форма глагола + ing как существительное по смыслу: Swimming is fun. После love/enjoy/hate часто -ing.',
    textUK: '-ing як іменник дії; після деяких дієслів — обов’язково вивчаємо списком.',
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

export const LESSON_23_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Passive Voice', titleUK: 'Passive Voice', titleES: 'Voz pasiva',
    textRU: 'Объект в начале: The letter was sent. Формула: be + V3 (past participle).',
    textUK: 'be + третя форма: було зроблено; хто — через by (не завжди).',
    textES: 'be + participio en EN.' },
  { textRU: 'It is made in China. The door was closed. The work will be done.',
    textUK: 'was/were + V3; is + V3 для законів / інструкцій.',
    textES: 'Tiempos pasivos.',
    examples: [
      { en: 'English is spoken here.', trRU: 'Здесь говорят по-английски.', trUK: 'Тут говорять англійською.' },
      { en: 'The cake was eaten.', trRU: 'Торт съели.', trUK: 'Торт з’їли.' },
      { en: 'Homework must be finished.', trRU: 'ДЗ нужно закончить.', trUK: 'ДЗ треба закінчити.' },
    ]},
  { textRU: 'Нужна правильная третья форма неправильных глаголов — учи таблицу неправильных.',
    textUK: 'Irregular V3 — окремо.',
    textES: 'Irregulares en participio.' },
);

export const LESSON_24_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Present Perfect', titleUK: 'Present Perfect', titleES: 'Present Perfect',
    textRU: 'Связь «тогда» с «сейчас»: I have eaten. have/has + V3. Часто уже/ещё: already, yet.',
    textUK: 'have/has + V3; досвід / результат зараз.',
    textES: 'have/has + past participle.' },
  { textRU: 'I have seen this film. She has not arrived yet. Have you finished?',
    textUK: 'ever/never з Present Perfect у питаннях про досвід.',
    textES: 'already/yet.',
    examples: [
      { en: 'I have lost my keys.', trRU: 'Я потерял ключи.', trUK: 'Я загубив ключі.' },
      { en: 'We have lived here for two years.', trRU: 'Живём здесь два года.', trUK: 'Живемо тут два роки.' },
      { en: 'He has never tried sushi.', trRU: 'Никогда не пробовал суши.', trUK: 'Ніколи не пробував суші.' },
    ]},
  { textRU: 'Не смешивай с прошлым временем «просто так»: yesterday обычно с Past Simple, не с Present Perfect.',
    textUK: 'Yesterday → Past Simple.',
    textES: 'Marcadores de tiempo claros.' },
);

export const LESSON_25_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Past Continuous', titleUK: 'Past Continuous', titleES: 'Past Continuous',
    textRU: 'Длительное действие в прошлом: I was working. was/were + -ing. На фоне короткого события.',
    textUK: 'was/were + V-ing; фон і переривання (when…).',
    textES: 'was/were + -ing.' },
  { textRU: 'I was reading when you called. They were not sleeping.',
    textUK: 'While I was cooking…',
    textES: 'when + past simple.',
    examples: [
      { en: 'She was cooking at 8 pm.', trRU: 'В 8 вечера готовила.', trUK: 'О 8 вечора готувала.' },
      { en: 'We were talking all evening.', trRU: 'Говорили весь вечер.', trUK: 'Говорили ввечері.' },
      { en: 'It was raining.', trRU: 'Шёл дождь.', trUK: 'Йшов дощ.' },
    ]},
  { textRU: 'Не ставь все глаголы в Continuous — stative verbs (know, like) редко в -ing в значении состояния.',
    textUK: 'know/love — обережно з -ing.',
    textES: 'Stative verbs.' },
);

export const LESSON_26_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Условные 0 и 1', titleUK: 'Умовні 0 і 1', titleES: 'Condicional cero/primero',
    textRU: 'Zero: If it rains, I stay home (факт/правило). First: If it rains, I will stay (реальное будущее).',
    textUK: 'Нульовий: If it rains, I stay home (факт або правило). Перший умовний: If it rains, I will stay (реальне майбутнє).',
    textES: 'Zero vs first conditional.' },
  { textRU: 'If you heat ice, it melts. If I am late, I will call you.',
    textUK: 'У нульовому — If + Present + Present; в першому — If + Present, will + інфінітив.',
    textES: 'No will en la cláusula if (norma básica).',
    examples: [
      { en: 'If it snows, we will stay home.', trRU: 'Если снег — останемся дома.', trUK: 'Якщо сніг — залишимось вдома.' },
      { en: 'If you don\'t hurry, you will miss the train.', trRU: 'Не поторопишься — опоздаешь.', trUK: 'Не поспішаєш — запізнишся.' },
      { en: 'Water boils if you heat it to 100°C.', trRU: 'Вода закипает при 100°.', trUK: 'Вода кипить при 100°.' },
    ]},
  { textRU: 'Не сдвигай времена «как в русском условном» — схема другая.',
    textUK: 'Не калькуй умовний з російської дослівно.',
    textES: 'Estructura fija en EN.' },
);

export const LESSON_27_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Косвенная речь', titleUK: 'Непряма мова', titleES: 'Estilo indirecto',
    textRU: 'Пересказ чужих слов: He said that he was tired. Сдвиг времени и местоимений по смыслу.',
    textUK: 'said + that + зміна часів; tell/ask — інші патерни.',
    textES: 'Reported speech + backshift.' },
  { textRU: '“I am busy,” she said → She said (that) she was busy.',
    textUK: 'Питання → if/whether у непрямій мові.',
    textES: 'Cambio de pronombres y tiempos.',
    examples: [
      { en: 'He said he would call.', trRU: 'Сказал, что позвонит.', trUK: 'Сказав, що подзвонить.' },
      { en: 'She asked if I was ready.', trRU: 'Спросила, готов ли я.', trUK: 'Запитала, чи я готовий.' },
      { en: 'They told us to wait.', trRU: 'Сказали подождать.', trUK: 'Сказали зачекати.' },
    ]},
  { textRU: 'Живой английский иногда оставляет настоящее, если факт всё ещё верен — на уроке следуй правилам сдвига.',
    textUK: 'У складних випадках — як у вправі.',
    textES: 'Sigue las reglas del ejercicio.' },
);

export const LESSON_28_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Возвратные местоимения', titleUK: 'Зворотні займенники', titleES: 'Reflexivos (EN)',
    textRU: 'myself, yourself — для усиления или когда действие обращено на себя: I hurt myself.',
    textUK: 'enjoy yourself; by myself = сам/-а;',
    textES: '-self/-selves en EN.' },
  { textRU: 'He made it himself. We enjoyed ourselves. Help yourself.',
    textUK: 'myself vs me — різні ролі в реченні.',
    textES: 'Colocación del reflexivo.',
    examples: [
      { en: 'She looked at herself.', trRU: 'Посмотрела на себя.', trUK: 'Подивилася на себе.' },
      { en: 'I did the work by myself.', trRU: 'Сделал работу сам.', trUK: 'Зробив роботу сам.' },
      { en: 'Behave yourselves!', trRU: 'Ведите себя!', trUK: 'Поводьтеся гарно!' },
    ]},
  { textRU: 'Не ставь «лишний» himself после глаголов вроде *feel* без смены смысла — учи устойчивые сочетания.',
    textUK: 'Фразові дієслова — окремо.',
    textES: 'Collocations.' },
);

export const LESSON_29_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Used to', titleUK: 'Used to', titleES: 'Used to',
    textRU: 'Было раньше, сейчас нет: I used to play football. Отрицание: didn\'t use to.',
    textUK: 'used to + інфінітив — колись звичка; не плутай з get used to.',
    textES: 'used to + infinitivo.' },
  { textRU: 'I used to smoke. She didn\'t use to live here. Did you use to walk?',
    textUK: 'be used to + -ing — звикнути.',
    textES: 'used to vs be used to.',
    examples: [
      { en: 'He used to be shy.', trRU: 'Раньше был застенчивым.', trUK: 'Раніше був сором’язливим.' },
      { en: 'We used to meet every week.', trRU: 'Раньше встречались каждую неделю.', trUK: 'Раніше зустрічалися щотижня.' },
      { en: 'It didn\'t use to rain so much.', trRU: 'Раньше не было стольких дождей.', trUK: 'Раніше не було стільки дощів.' },
    ]},
  { textRU: 'Не пиши *use to* без d в утверждении прошлого — I used to.',
    textUK: 'used to з -d.',
    textES: 'Ortografía used to.' },
);

export const LESSON_30_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Относительные предложения', titleUK: 'Відносні речення', titleES: 'Relativas',
    textRU: 'who для людей, which/that для вещей: The book that I bought. Запятая меняет смысл (определение).',
    textUK: 'who/which/that; where/when; обмежувальні й необмежувальні.',
    textES: 'who/which/that en EN.' },
  { textRU: 'The man who called… The city where I live… The day when we met…',
    textUK: 'Яку форму обираємо — як у вправі.',
    textES: 'Cláusulas sin coma si son definitorias.',
    examples: [
      { en: 'This is the house that Jack built.', trRU: 'Дом, который построил Джек.', trUK: 'Будинок, який збудував Джек.' },
      { en: 'She is the teacher who helped me.', trRU: 'Учительница, которая помогла.', trUK: 'Вчителька, яка допомогла.' },
      { en: 'I remember the summer when we met.', trRU: 'Лето, когда мы познакомились.', trUK: 'Літо, коли ми познайомились.' },
    ]},
  { textRU: 'Which vs that — в американском норме часто that для ограничения; не цепляйся за русский «который» один в один.',
    textUK: 'Не калькуй «який» дослівно в усіх місцях.',
    textES: 'Elegancia vs norma del ejercicio.' },
);

export const LESSON_31_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Сложное дополнение', titleUK: 'Складний додаток', titleES: 'Objeto + infinitivo',
    textRU: 'I want you to stay. Видеть / слышать / просить + объект + инфинитив без to там, где учит урок.',
    textUK: 'want/ask/tell + object + to + V; see/hear + object + bare inf — за правилами уроку.',
    textES: 'Estructuras de reporting/percepción.' },
  { textRU: 'He asked me to help. I saw her leave. They want us to wait.',
    textUK: 'make/let + bare inf — окремий клас.',
    textES: 'Patrones del tema.',
    examples: [
      { en: 'She told him to stop.', trRU: 'Сказала ему остановиться.', trUK: 'Сказала йому зупинитися.' },
      { en: 'I expect them to arrive soon.', trRU: 'Ожидаю, что скоро приедут.', trUK: 'Чекаю, що скоро прибудуть.' },
      { en: 'We heard someone shout.', trRU: 'Услышали, как кто-то крикнул.', trUK: 'Почули, як хтось крикнув.' },
    ]},
  { textRU: 'Не подставляй лишний to перед каждым глаголом после see/hear — смотри уроковый список.',
    textUK: 'Bare inf після see/hear/watch — не завжди.',
    textES: 'Lista del ejercicio.' },
);

export const LESSON_32_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Финальный обзор', titleUK: 'Фінальний огляд', titleES: 'Repaso final',
    textRU: 'Сводка уровня: времён, модальных, пассива, условных и устойчивых конструкций. Следи за порядком слов.',
    textUK: 'Повтори ключові схеми й не змішуй часи без причини.',
    textES: 'Repaso A2–B1 en EN.' },
  { textRU: 'Просматривай шпаргалки по урокам, где ошибался чаще всего.',
    textUK: 'Hint по уроку + повторення.', textES: 'Repasa lecciones débiles.',
    examples: [
      { en: 'Keep your word order simple.', trRU: 'Держи простой порядок слов.', trUK: 'Тримай простий порядок слів.' },
      { en: 'Match tense to the time marker.', trRU: 'Время по маркеру.', trUK: 'Час за маркером.' },
      { en: 'Practice fixed phrases.', trRU: 'Устойчивые выражения.', trUK: 'Сталі вирази.' },
    ]},
  { textRU: 'Паника «выучить всё» хуже тихого повтора по кругу.',
    textUK: 'Краще часті малі повтори.',
    textES: 'Constancia > cram.' },
);
