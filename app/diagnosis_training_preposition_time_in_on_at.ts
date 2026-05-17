import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function timeStep(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  correctFeedback: TriText;
  wrong: Record<string, TriText>;
  retry: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  const correctIndex = input.options.findIndex((option) => option === input.correctAnswer);
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Не переводи предлог напрямую. Сначала определи тип времени: точка, день/дата или широкий период.',
      'Не перекладай прийменник напряму. Спочатку визнач тип часу: точка, день/дата або широкий період.',
      'No traduzcas la preposición directamente. Primero identifica el tipo de tiempo: punto, día/fecha o período amplio.',
    ),
    microTask: tri('Выбери правильный предлог времени.', 'Обери правильний прийменник часу.', 'Elige la preposición de tiempo correcta.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. Проверь размер времени: at = точка, on = день/дата, in = широкий период.',
        'Не зовсім. Перевір розмір часу: at = точка, on = день/дата, in = широкий період.',
        'No exactamente. Revisa el tamaño del tiempo: at = punto, on = día/fecha, in = período amplio.',
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: здесь нужен блок "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        `Підказка: тут потрібен блок "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
        `Pista: aquí necesitas el bloque "${input.correctAnswer} ${input.focusWords[0] ?? ''}".`.trim(),
      ),
    ],
    fallbackExplanation: tri(
      'Лестница времени: at для маленькой точки на часах, on для дня или даты, in для месяца, года, сезона, части дня и будущего периода.',
      'Сходи часу: at для маленької точки на годиннику, on для дня або дати, in для місяця, року, сезону, частини дня і майбутнього періоду.',
      'Escalera de tiempo: at para un punto pequeño en el reloj, on para día o fecha, in para mes, año, estación, parte del día y período futuro.',
    ),
    focusWords: input.focusWords,
  };
}

export const PREPOSITION_TIME_IN_ON_AT_TRAINING: DiagnosisTraining = {
  id: 'preposition_time_in_on_at',
  category: 'preposition',
  version: '1.0.0',
  status: 'active',
  priority: 4,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('In / On / At: время', 'In / On / At: час', 'In / On / At: tiempo'),
  shortTitle: tri('In / On / At для времени', 'In / On / At для часу', 'In / On / At para tiempo'),
  shortDiagnosis: tri(
    'Ты путаешь in, on и at во времени: точка, день или широкий период.',
    'Ти плутаєш in, on і at у часі: точка, день або широкий період.',
    'Confundes in, on y at en tiempo: punto, día o período amplio.',
  ),
  diagnosisText: tri(
    'Ты путаешь in, on и at, когда говоришь о времени. Обычно проблема в том, что ты пытаешься переводить предлог напрямую, а в английском здесь важен размер временной точки: точное время, день или более широкий период.',
    'Ти плутаєш in, on і at, коли говориш про час. Зазвичай проблема в тому, що ти намагаєшся перекладати прийменник напряму, а в англійській тут важливий розмір часової точки: точний час, день або ширший період.',
    'Confundes in, on y at cuando hablas de tiempo. Normalmente el problema es intentar traducir la preposición directamente, pero en inglés aquí importa el tamaño del punto temporal: hora exacta, día o período más amplio.',
  ),
  mentalModel: tri(
    'At = точная точка времени. On = день или дата. In = широкий период: месяц, год, сезон, часть дня или период внутри будущего.',
    'At = точна точка часу. On = день або дата. In = широкий період: місяць, рік, сезон, частина дня або період у майбутньому.',
    'At = punto exacto de tiempo. On = día o fecha. In = período amplio: mes, año, estación, parte del día o período en el futuro.',
  ),
  contrastSet: ['in', 'on', 'at'],
  coreRule: tri(
    "at 6:30, at night, at the weekend. on Monday, on Friday morning, on 12 May. in March, in 2026, in summer, in the morning, in two weeks.",
    "at 6:30, at night, at the weekend. on Monday, on Friday morning, on 12 May. in March, in 2026, in summer, in the morning, in two weeks.",
    "at 6:30, at night, at the weekend. on Monday, on Friday morning, on 12 May. in March, in 2026, in summer, in the morning, in two weeks.",
  ),
  whatUserMustLearn: {
    ru: [
      "At используется для точного времени: at 7 o'clock, at 6:30, at noon, at midnight.",
      'On используется с днями и датами: on Monday, on Friday, on 12 May.',
      'On также используется, если есть день + часть дня: on Monday morning, on Friday night.',
      'In используется с месяцами, годами, сезонами и длинными периодами: in May, in 2026, in summer.',
      'In используется с частями дня: in the morning, in the afternoon, in the evening.',
      'At night - исключение, которое лучше запомнить готовым блоком.',
      'In используется для будущего через период: in two days, in three weeks.',
      'Не переводи предлог напрямую. Сначала определи тип времени.',
    ],
    uk: [
      "At використовується для точного часу: at 7 o'clock, at 6:30, at noon, at midnight.",
      'On використовується з днями та датами: on Monday, on Friday, on 12 May.',
      'On також використовується, якщо є день + частина дня: on Monday morning, on Friday night.',
      'In використовується з місяцями, роками, сезонами та довгими періодами: in May, in 2026, in summer.',
      'In використовується з частинами дня: in the morning, in the afternoon, in the evening.',
      'At night - виняток, який краще запам’ятати готовим блоком.',
      'In використовується для майбутнього через період: in two days, in three weeks.',
      'Не перекладай прийменник напряму. Спочатку визнач тип часу.',
    ],
    es: [
      "At se usa para hora exacta: at 7 o'clock, at 6:30, at noon, at midnight.",
      'On se usa con días y fechas: on Monday, on Friday, on 12 May.',
      'On también se usa si hay día + parte del día: on Monday morning, on Friday night.',
      'In se usa con meses, años, estaciones y períodos largos: in May, in 2026, in summer.',
      'In se usa con partes del día: in the morning, in the afternoon, in the evening.',
      'At night es una excepción que conviene memorizar como bloque.',
      'In se usa para futuro después de un período: in two days, in three weeks.',
      'No traduzcas la preposición directamente. Primero identifica el tipo de tiempo.',
    ],
  },
  examples: [
    { en: "The meeting starts at 9 o'clock.", ru: 'Встреча начинается в девять часов.', uk: 'Зустріч починається о дев’ятій годині.', es: 'La reunión empieza a las nueve.', why: tri("9 o'clock - точная точка времени. Для точного времени используется at.", "9 o'clock - точна точка часу. Для точного часу використовується at.", "9 o'clock es un punto exacto de tiempo. Para hora exacta usamos at.") },
    { en: 'I will call you on Monday.', ru: 'Я позвоню тебе в понедельник.', uk: 'Я подзвоню тобі в понеділок.', es: 'Te llamaré el lunes.', why: tri('Monday - день недели. С днями недели используется on.', 'Monday - день тижня. З днями тижня використовується on.', 'Monday es un día de la semana. Con días usamos on.') },
    { en: 'She was born in 1998.', ru: 'Она родилась в 1998 году.', uk: 'Вона народилася у 1998 році.', es: 'Ella nació en 1998.', why: tri('1998 - год, широкий период. С годами используется in.', '1998 - рік, широкий період. З роками використовується in.', '1998 es un año, un período amplio. Con años usamos in.') },
    { en: 'We usually work in the morning.', ru: 'Мы обычно работаем утром.', uk: 'Ми зазвичай працюємо вранці.', es: 'Normalmente trabajamos por la mañana.', why: tri('The morning - часть дня. Обычно с частями дня используется in.', 'The morning - частина дня. Зазвичай із частинами дня використовується in.', 'The morning es una parte del día. Normalmente con partes del día usamos in.') },
    { en: 'I saw him on Friday morning.', ru: 'Я видел его в пятницу утром.', uk: 'Я бачив його в п’ятницю вранці.', es: 'Lo vi el viernes por la mañana.', why: tri('Friday morning = конкретный день + часть дня. Когда есть день, используется on.', 'Friday morning = конкретний день + частина дня. Коли є день, використовується on.', 'Friday morning = día concreto + parte del día. Cuando hay día, usamos on.') },
    { en: "I don't like driving at night.", ru: 'Я не люблю водить ночью.', uk: 'Я не люблю водити вночі.', es: 'No me gusta conducir de noche.', why: tri('At night - устойчивый блок. Хотя morning/evening обычно идут с in, night часто идет с at.', 'At night - сталий блок. Хоча morning/evening зазвичай ідуть з in, night часто йде з at.', 'At night es un bloque fijo. Aunque morning/evening suelen ir con in, night muchas veces va con at.') },
    { en: 'The course starts in May.', ru: 'Курс начинается в мае.', uk: 'Курс починається у травні.', es: 'El curso empieza en mayo.', why: tri('May - месяц, широкий период. С месяцами используется in.', 'May - місяць, широкий період. З місяцями використовується in.', 'May es un mes, un período amplio. Con meses usamos in.') },
    { en: "I'll be back in two weeks.", ru: 'Я вернусь через две недели.', uk: 'Я повернуся через два тижні.', es: 'Volveré en dos semanas.', why: tri('In two weeks означает через две недели от текущего момента. Для будущего через период используется in.', 'In two weeks означає через два тижні від поточного моменту. Для майбутнього через період використовується in.', 'In two weeks significa dentro de dos semanas desde ahora. Para futuro después de un período usamos in.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь in, on и at во времени. Это нормально: в русском часто всё переводится одним словом “в”, но английский разделяет время на разные размеры.', 'Схоже, ти плутаєш in, on і at у часі. Це нормально: українською часто все передається одним прийменником, але англійська ділить час на різні розміри.', 'Parece que confundes in, on y at con tiempo. Es normal: en español muchas veces se traduce parecido, pero el inglés divide el tiempo por tamaño.') },
    { id: 'intro_rule', type: 'rule', text: tri('Запомни лестницу: at - маленькая точка, on - день, in - большой период.', 'Запам’ятай сходи: at - маленька точка, on - день, in - великий період.', 'Recuerda la escalera: at - punto pequeño, on - día, in - período grande.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не спрашивай “как перевести в?”. Спрашивай “что это за время?” Точное время - at. День или дата - on. Месяц, год, сезон, часть дня или будущий период - in.', 'Не питай “як перекласти прийменник?”. Питай “який це тип часу?” Точний час - at. День або дата - on. Місяць, рік, сезон, частина дня або майбутній період - in.', 'No preguntes “cómo traduzco la preposición?”. Pregunta “qué tipo de tiempo es?”. Hora exacta - at. Día o fecha - on. Mes, año, estación, parte del día o período futuro - in.') },
  ],
  steps: [
    timeStep({ id: 'time_easy_001', order: 1, difficulty: 'easy', targetSkill: 'exact_time_at', sentence: "The lesson starts ___ 8 o'clock.", translation: tri('Урок начинается в восемь часов.', 'Урок починається о восьмій годині.', 'La clase empieza a las ocho.'), options: ['in', 'on', 'at', 'by'], correctAnswer: 'at', correctFeedback: tri("Да. 8 o'clock - точное время на часах. Для точного времени используется at.", "Так. 8 o'clock - точний час на годиннику. Для точного часу використовується at.", "Sí. 8 o'clock es una hora exacta en el reloj. Para hora exacta usamos at."), wrong: { in: tri("In используется для периода: in May, in 2026, in the morning. 8 o'clock - не период, а точная точка. Нужен at.", "In використовується для періоду: in May, in 2026, in the morning. 8 o'clock - не період, а точна точка. Потрібен at.", "In se usa para períodos: in May, in 2026, in the morning. 8 o'clock no es período, es punto exacto. Necesitamos at."), on: tri("On используется для дней и дат: on Monday, on 12 May. 8 o'clock - точное время, поэтому at.", "On використовується для днів і дат: on Monday, on 12 May. 8 o'clock - точний час, тому at.", "On se usa para días y fechas: on Monday, on 12 May. 8 o'clock es hora exacta, por eso at."), by: tri("By означает “к какому-то сроку”: by 8 o'clock = не позже восьми. Здесь урок начинается ровно в 8, поэтому at.", "By означає “до певного строку”: by 8 o'clock = не пізніше восьмої. Тут урок починається рівно о 8, тому at.", "By significa “para antes de cierto límite”: by 8 o'clock = no más tarde de las ocho. Aquí la clase empieza a las 8, por eso at.") }, retry: [tri("8 o'clock - точка на часах. Точка времени = at.", "8 o'clock - точка на годиннику. Точка часу = at.", "8 o'clock es punto en el reloj. Punto de tiempo = at."), tri("Запомни блок: at 8 o'clock.", "Запам’ятай блок: at 8 o'clock.", "Recuerda el bloque: at 8 o'clock."), tri("Подсказка: starts at 8 o'clock.", "Підказка: starts at 8 o'clock.", "Pista: starts at 8 o'clock.")], focusWords: ["8 o'clock"] }),
    timeStep({ id: 'time_easy_002', order: 2, difficulty: 'easy', targetSkill: 'exact_time_at', sentence: 'We usually have lunch ___ noon.', translation: tri('Мы обычно обедаем в полдень.', 'Ми зазвичай обідаємо опівдні.', 'Normalmente almorzamos al mediodía.'), options: ['in', 'on', 'at', 'for'], correctAnswer: 'at', correctFeedback: tri('Да. Noon - точный момент дня. С noon используется at.', 'Так. Noon - точний момент дня. З noon використовується at.', 'Sí. Noon es un momento exacto del día. Con noon usamos at.'), wrong: { in: tri('In используется с the morning, the afternoon, the evening. Но noon - точный момент, поэтому at noon.', 'In використовується з the morning, the afternoon, the evening. Але noon - точний момент, тому at noon.', 'In se usa con the morning, the afternoon, the evening. Pero noon es un momento exacto, por eso at noon.'), on: tri('On нужен для дней и дат. Noon - не день и не дата, а точный момент. Нужен at.', 'On потрібен для днів і дат. Noon - не день і не дата, а точний момент. Потрібен at.', 'On se usa para días y fechas. Noon no es día ni fecha, es momento exacto. Necesitamos at.'), for: tri('For показывает длительность: for two hours. Здесь не длительность, а момент. Нужен at noon.', 'For показує тривалість: for two hours. Тут не тривалість, а момент. Потрібен at noon.', 'For muestra duración: for two hours. Aquí no es duración, es momento. Necesitamos at noon.') }, retry: [tri('Noon = точная точка дня. Точная точка = at.', 'Noon = точна точка дня. Точна точка = at.', 'Noon = punto exacto del día. Punto exacto = at.'), tri('Готовый блок: at noon.', 'Готовий блок: at noon.', 'Bloque listo: at noon.'), tri('Подсказка: at noon.', 'Підказка: at noon.', 'Pista: at noon.')], focusWords: ['noon'] }),
    timeStep({ id: 'time_easy_003', order: 3, difficulty: 'easy', targetSkill: 'month_in', sentence: 'My birthday is ___ March.', translation: tri('Мой день рождения в марте.', 'Мій день народження в березні.', 'Mi cumpleaños es en marzo.'), options: ['in', 'on', 'at', 'to'], correctAnswer: 'in', correctFeedback: tri('Да. March - месяц, широкий период. С месяцами используется in.', 'Так. March - місяць, широкий період. З місяцями використовується in.', 'Sí. March es un mes, un período amplio. Con meses usamos in.'), wrong: { on: tri('On используется с конкретной датой: on 12 March. Но просто March - месяц, поэтому in March.', 'On використовується з конкретною датою: on 12 March. Але просто March - місяць, тому in March.', 'On se usa con fecha concreta: on 12 March. Pero March solo es mes, por eso in March.'), at: tri('At используется для точного времени: at 8. March - не точка на часах, а месяц. Нужен in.', 'At використовується для точного часу: at 8. March - не точка на годиннику, а місяць. Потрібен in.', 'At se usa para hora exacta: at 8. March no es punto en el reloj, es mes. Necesitamos in.'), to: tri('To показывает направление или предел, но не месяц события. С месяцем нужен in.', 'To показує напрямок або межу, але не місяць події. З місяцем потрібен in.', 'To muestra dirección o límite, no el mes de un evento. Con meses usamos in.') }, retry: [tri('Месяц - это широкий период. Широкий период = in.', 'Місяць - це широкий період. Широкий період = in.', 'Un mes es un período amplio. Período amplio = in.'), tri('Запомни: in March.', 'Запам’ятай: in March.', 'Recuerda: in March.'), tri('Подсказка: in March.', 'Підказка: in March.', 'Pista: in March.')], focusWords: ['March'] }),
    timeStep({ id: 'time_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'day_on', sentence: 'I have an interview ___ Monday.', translation: tri('У меня собеседование в понедельник.', 'У мене співбесіда в понеділок.', 'Tengo una entrevista el lunes.'), options: ['in', 'on', 'at', 'during'], correctAnswer: 'on', correctFeedback: tri('Да. Monday - день недели. С днями недели используется on.', 'Так. Monday - день тижня. З днями тижня використовується on.', 'Sí. Monday es un día de la semana. Con días usamos on.'), wrong: { in: tri('In используется с периодами: in March, in 2026. Monday - конкретный день, поэтому on Monday.', 'In використовується з періодами: in March, in 2026. Monday - конкретний день, тому on Monday.', 'In se usa con períodos: in March, in 2026. Monday es un día concreto, por eso on Monday.'), at: tri('At используется с точным временем: at 9. Monday - день, не час. Нужен on.', 'At використовується з точним часом: at 9. Monday - день, не година. Потрібен on.', 'At se usa con hora exacta: at 9. Monday es día, no hora. Necesitamos on.'), during: tri('During Monday звучит неестественно в этой фразе. Для события в день недели нужен on Monday.', 'During Monday звучить неприродно в цій фразі. Для події в день тижня потрібен on Monday.', 'During Monday suena poco natural en esta frase. Para un evento en un día usamos on Monday.') }, retry: [tri('День недели = on. Monday = день. Значит on Monday.', 'День тижня = on. Monday = день. Значить on Monday.', 'Día de la semana = on. Monday = día. Entonces on Monday.'), tri('Запомни блок: on Monday.', 'Запам’ятай блок: on Monday.', 'Recuerda el bloque: on Monday.'), tri('Подсказка: interview on Monday.', 'Підказка: interview on Monday.', 'Pista: interview on Monday.')], focusWords: ['Monday'] }),
    timeStep({ id: 'time_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'date_on', sentence: 'The course begins ___ 12 May.', translation: tri('Курс начинается 12 мая.', 'Курс починається 12 травня.', 'El curso empieza el 12 de mayo.'), options: ['in', 'on', 'at', 'from'], correctAnswer: 'on', correctFeedback: tri('Да. 12 May - конкретная дата. С датами используется on.', 'Так. 12 May - конкретна дата. З датами використовується on.', 'Sí. 12 May es una fecha concreta. Con fechas usamos on.'), wrong: { in: tri('In May было бы правильно для месяца. Но 12 May - конкретная дата, поэтому on 12 May.', 'In May було б правильно для місяця. Але 12 May - конкретна дата, тому on 12 May.', 'In May sería correcto para el mes. Pero 12 May es fecha concreta, por eso on 12 May.'), at: tri('At используется с точным временем на часах. 12 May - дата, поэтому on.', 'At використовується з точним часом на годиннику. 12 May - дата, тому on.', 'At se usa con hora exacta en el reloj. 12 May es fecha, por eso on.'), from: tri('From 12 May означает “начиная с 12 мая”. Здесь просто дата начала события. Нужен on 12 May.', 'From 12 May означає “починаючи з 12 травня”. Тут просто дата початку події. Потрібен on 12 May.', 'From 12 May significa “desde el 12 de mayo”. Aquí solo damos la fecha de inicio del evento. Necesitamos on 12 May.') }, retry: [tri('Если есть число + месяц, это дата. Дата = on.', 'Якщо є число + місяць, це дата. Дата = on.', 'Si hay número + mes, es fecha. Fecha = on.'), tri('12 May = on 12 May.', '12 May = on 12 May.', '12 May = on 12 May.'), tri('Подсказка: begins on 12 May.', 'Підказка: begins on 12 May.', 'Pista: begins on 12 May.')], focusWords: ['12 May'] }),
    timeStep({ id: 'time_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'exact_time_at', sentence: 'The train leaves ___ 6:45.', translation: tri('Поезд отправляется в 6:45.', 'Поїзд відправляється о 6:45.', 'El tren sale a las 6:45.'), options: ['in', 'on', 'at', 'since'], correctAnswer: 'at', correctFeedback: tri('Да. 6:45 - точное время. Для точного времени нужен at.', 'Так. 6:45 - точний час. Для точного часу потрібен at.', 'Sí. 6:45 es hora exacta. Para hora exacta necesitamos at.'), wrong: { in: tri('In подходит для периодов, но 6:45 - точка на часах. Нужен at.', 'In підходить для періодів, але 6:45 - точка на годиннику. Потрібен at.', 'In sirve para períodos, pero 6:45 es punto en el reloj. Necesitamos at.'), on: tri('On нужен для дня или даты. 6:45 - точное время, поэтому at.', 'On потрібен для дня або дати. 6:45 - точний час, тому at.', 'On se usa para día o fecha. 6:45 es hora exacta, por eso at.'), since: tri('Since означает “с какого момента” и требует длительности до настоящего. Здесь поезд отправляется в точное время. Нужен at.', 'Since означає “з якого моменту” і потребує тривалості до теперішнього. Тут поїзд відправляється в точний час. Потрібен at.', 'Since significa “desde qué momento” y implica duración hasta ahora. Aquí el tren sale a una hora exacta. Necesitamos at.') }, retry: [tri('6:45 - это точка на часах. Точка = at.', '6:45 - це точка на годиннику. Точка = at.', '6:45 es un punto en el reloj. Punto = at.'), tri('Время на часах - at.', 'Час на годиннику - at.', 'Hora en el reloj - at.'), tri('Подсказка: leaves at 6:45.', 'Підказка: leaves at 6:45.', 'Pista: leaves at 6:45.')], focusWords: ['6:45'] }),
    timeStep({ id: 'time_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'year_in', sentence: 'They moved here ___ 2020.', translation: tri('Они переехали сюда в 2020 году.', 'Вони переїхали сюди у 2020 році.', 'Se mudaron aquí en 2020.'), options: ['in', 'on', 'at', 'since'], correctAnswer: 'in', correctFeedback: tri('Да. 2020 - год, широкий период. С годами используется in.', 'Так. 2020 - рік, широкий період. З роками використовується in.', 'Sí. 2020 es un año, un período amplio. Con años usamos in.'), wrong: { on: tri('On используется с конкретными датами: on 12 May. 2020 - год, поэтому in 2020.', 'On використовується з конкретними датами: on 12 May. 2020 - рік, тому in 2020.', 'On se usa con fechas concretas: on 12 May. 2020 es año, por eso in 2020.'), at: tri('At используется с точным временем. 2020 - не точка на часах, а год. Нужен in.', 'At використовується з точним часом. 2020 - не точка на годиннику, а рік. Потрібен in.', 'At se usa con hora exacta. 2020 no es punto en el reloj, es año. Necesitamos in.'), since: tri('Since 2020 означало бы “с 2020 года до сейчас”. Здесь moved - завершенное действие в прошлом году. Нужен in 2020.', 'Since 2020 означало б “з 2020 року до зараз”. Тут moved - завершена дія в минулому році. Потрібен in 2020.', 'Since 2020 significaría “desde 2020 hasta ahora”. Aquí moved es una acción terminada en ese año. Necesitamos in 2020.') }, retry: [tri('Год - широкий период. Широкий период = in.', 'Рік - широкий період. Широкий період = in.', 'Año = período amplio. Período amplio = in.'), tri('Запомни блок: in 2020.', 'Запам’ятай блок: in 2020.', 'Recuerda el bloque: in 2020.'), tri('Подсказка: moved here in 2020.', 'Підказка: moved here in 2020.', 'Pista: moved here in 2020.')], focusWords: ['2020'] }),
    timeStep({ id: 'time_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'season_in', sentence: 'We usually travel ___ summer.', translation: tri('Мы обычно путешествуем летом.', 'Ми зазвичай подорожуємо влітку.', 'Normalmente viajamos en verano.'), options: ['in', 'on', 'at', 'by'], correctAnswer: 'in', correctFeedback: tri('Да. Summer - сезон, широкий период. С сезонами используется in.', 'Так. Summer - сезон, широкий період. Із сезонами використовується in.', 'Sí. Summer es una estación, un período amplio. Con estaciones usamos in.'), wrong: { on: tri('On нужен для дней и дат. Summer - не один день, а сезон. Нужен in.', 'On потрібен для днів і дат. Summer - не один день, а сезон. Потрібен in.', 'On se usa para días y fechas. Summer no es un día, es una estación. Necesitamos in.'), at: tri('At нужен для точной точки времени. Summer - длинный период, поэтому in summer.', 'At потрібен для точної точки часу. Summer - довгий період, тому in summer.', 'At se usa para punto exacto de tiempo. Summer es período largo, por eso in summer.'), by: tri('By summer означает “к лету”, то есть до начала лета. Здесь мы путешествуем летом, поэтому in summer.', 'By summer означає “до літа”. Тут ми подорожуємо влітку, тому in summer.', 'By summer significa “para antes del verano”. Aquí viajamos durante el verano, por eso in summer.') }, retry: [tri('Сезон - это длинный период. Длинный период = in.', 'Сезон - це довгий період. Довгий період = in.', 'Una estación es un período largo. Período largo = in.'), tri('Запомни: in summer.', 'Запам’ятай: in summer.', 'Recuerda: in summer.'), tri('Подсказка: travel in summer.', 'Підказка: travel in summer.', 'Pista: travel in summer.')], focusWords: ['summer'] }),
    timeStep({ id: 'time_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'month_in', sentence: 'The app will launch ___ December.', translation: tri('Приложение выйдет в декабре.', 'Додаток вийде в грудні.', 'La app saldrá en diciembre.'), options: ['in', 'on', 'at', 'until'], correctAnswer: 'in', correctFeedback: tri('Да. December - месяц. С месяцами используется in.', 'Так. December - місяць. З місяцями використовується in.', 'Sí. December es un mes. Con meses usamos in.'), wrong: { on: tri('On нужен для конкретной даты: on 5 December. Просто December - месяц, поэтому in December.', 'On потрібен для конкретної дати: on 5 December. Просто December - місяць, тому in December.', 'On se usa para fecha concreta: on 5 December. Solo December es mes, por eso in December.'), at: tri('At нужен для точного времени. December - месяц, широкий период. Нужен in.', 'At потрібен для точного часу. December - місяць, широкий період. Потрібен in.', 'At se usa para hora exacta. December es mes, período amplio. Necesitamos in.'), until: tri('Until December означает “до декабря”. Здесь запуск будет в декабре. Нужен in December.', 'Until December означає “до грудня”. Тут запуск буде в грудні. Потрібен in December.', 'Until December significa “hasta diciembre”. Aquí el lanzamiento será en diciembre. Necesitamos in December.') }, retry: [tri('December - месяц. Месяц = in.', 'December - місяць. Місяць = in.', 'December es mes. Mes = in.'), tri('Запомни блок: in December.', 'Запам’ятай блок: in December.', 'Recuerda el bloque: in December.'), tri('Подсказка: launch in December.', 'Підказка: launch in December.', 'Pista: launch in December.')], focusWords: ['December'] }),
    timeStep({ id: 'time_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'part_of_day_in', sentence: 'I usually study ___ the evening.', translation: tri('Я обычно учусь вечером.', 'Я зазвичай навчаюся ввечері.', 'Normalmente estudio por la tarde/noche.'), options: ['in', 'on', 'at', 'for'], correctAnswer: 'in', correctFeedback: tri('Да. The evening - часть дня. Обычно с morning, afternoon, evening используется in.', 'Так. The evening - частина дня. Зазвичай з morning, afternoon, evening використовується in.', 'Sí. The evening es parte del día. Normalmente con morning, afternoon, evening usamos in.'), wrong: { on: tri('On нужен, если есть конкретный день: on Friday evening. Просто the evening - часть дня, поэтому in the evening.', 'On потрібен, якщо є конкретний день: on Friday evening. Просто the evening - частина дня, тому in the evening.', 'On se usa si hay un día concreto: on Friday evening. Solo the evening es parte del día, por eso in the evening.'), at: tri('At используется в блоке at night, но evening обычно идет с in: in the evening.', 'At використовується в блоці at night, але evening зазвичай іде з in: in the evening.', 'At se usa en el bloque at night, pero evening normalmente va con in: in the evening.'), for: tri('For показывает длительность: for two hours. Здесь время дня, поэтому in the evening.', 'For показує тривалість: for two hours. Тут частина дня, тому in the evening.', 'For muestra duración: for two hours. Aquí es parte del día, por eso in the evening.') }, retry: [tri('Morning, afternoon, evening обычно идут с in.', 'Morning, afternoon, evening зазвичай ідуть з in.', 'Morning, afternoon, evening normalmente van con in.'), tri('Запомни: in the evening.', 'Запам’ятай: in the evening.', 'Recuerda: in the evening.'), tri('Подсказка: study in the evening.', 'Підказка: study in the evening.', 'Pista: study in the evening.')], focusWords: ['the evening'] }),
    timeStep({ id: 'time_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'night_at', sentence: "I don't like working ___ night.", translation: tri('Я не люблю работать ночью.', 'Я не люблю працювати вночі.', 'No me gusta trabajar de noche.'), options: ['in', 'on', 'at', 'during'], correctAnswer: 'at', correctFeedback: tri('Да. At night - устойчивый блок. Его лучше запомнить отдельно.', 'Так. At night - сталий блок. Його краще запам’ятати окремо.', 'Sí. At night es un bloque fijo. Es mejor memorizarlo aparte.'), wrong: { in: tri('Для частей дня бывает in, но night обычно живёт отдельно: at night.', 'Для частин дня буває in, але night зазвичай живе окремо: at night.', 'In the morning, in the afternoon, in the evening - sí. Pero night normalmente: at night.'), on: tri('On нужен с конкретным днем: on Friday night. Просто night - at night.', 'On потрібен із конкретним днем: on Friday night. Просто night - at night.', 'On se usa con día concreto: on Friday night. Solo night - at night.'), during: tri('During the night возможно, но здесь обычная естественная фраза - at night.', 'During the night можливе, але тут звичайна природна фраза - at night.', 'During the night es posible, pero aquí la frase natural normal es at night.') }, retry: [tri('Night - особый блок: at night.', 'Night - особливий блок: at night.', 'Night es bloque especial: at night.'), tri('Запомни целиком: work at night.', 'Запам’ятай повністю: work at night.', 'Memoriza completo: work at night.'), tri('Подсказка: working at night.', 'Підказка: working at night.', 'Pista: working at night.')], focusWords: ['night'] }),
    timeStep({ id: 'time_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'day_part_on', sentence: "Let's meet ___ Friday morning.", translation: tri('Давай встретимся в пятницу утром.', 'Давай зустрінемося в п’ятницю вранці.', 'Quedemos el viernes por la mañana.'), options: ['in', 'on', 'at', 'by'], correctAnswer: 'on', correctFeedback: tri('Да. Friday morning = конкретный день + часть дня. Когда есть день, используется on.', 'Так. Friday morning = конкретний день + частина дня. Коли є день, використовується on.', 'Sí. Friday morning = día concreto + parte del día. Cuando hay día, usamos on.'), wrong: { in: tri('In the morning правильно без дня. Но Friday morning содержит день Friday, поэтому on Friday morning.', 'In the morning правильно без дня. Але Friday morning містить день Friday, тому on Friday morning.', 'In the morning es correcto sin día. Pero Friday morning contiene el día Friday, por eso on Friday morning.'), at: tri('At нужен для точного времени: at 9. Friday morning - день + часть дня, поэтому on.', 'At потрібен для точного часу: at 9. Friday morning - день + частина дня, тому on.', 'At se usa para hora exacta: at 9. Friday morning es día + parte del día, por eso on.'), by: tri('By Friday morning означает “к пятнице утром, не позже”. Здесь встреча назначена на пятницу утром. Нужен on.', 'By Friday morning означає “до п’ятниці ранку, не пізніше”. Тут зустріч призначена на п’ятницю вранці. Потрібен on.', 'By Friday morning significa “para el viernes por la mañana, no más tarde”. Aquí la reunión es el viernes por la mañana. Necesitamos on.') }, retry: [tri('Friday - это день. Если есть день, выбирай on.', 'Friday - це день. Якщо є день, обирай on.', 'Friday es día. Si hay día, elige on.'), tri('Friday morning = on Friday morning.', 'Friday morning = on Friday morning.', 'Friday morning = on Friday morning.'), tri('Подсказка: meet on Friday morning.', 'Підказка: meet on Friday morning.', 'Pista: meet on Friday morning.')], focusWords: ['Friday morning'] }),
    timeStep({ id: 'time_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'future_period_in', sentence: "I'll call you ___ two hours.", translation: tri('Я позвоню тебе через два часа.', 'Я подзвоню тобі через дві години.', 'Te llamaré en dos horas.'), options: ['in', 'on', 'at', 'for'], correctAnswer: 'in', correctFeedback: tri('Да. In two hours означает через два часа от текущего момента.', 'Так. In two hours означає через дві години від поточного моменту.', 'Sí. In two hours significa dentro de dos horas desde ahora.'), wrong: { on: tri('On нужен для дней и дат. Two hours - период до будущего момента, поэтому in two hours.', 'On потрібен для днів і дат. Two hours - період до майбутнього моменту, тому in two hours.', 'On se usa para días y fechas. Two hours es período hasta un momento futuro, por eso in two hours.'), at: tri('At нужен для точного времени: at 5. Two hours - период, через который что-то случится. Нужен in.', 'At потрібен для точного часу: at 5. Two hours - період, через який щось станеться. Потрібен in.', 'At se usa para hora exacta: at 5. Two hours es un período después del cual algo pasa. Necesitamos in.'), for: tri("For two hours означает длительность: в течение двух часов. I'll call you for two hours = я буду звонить тебе два часа. Здесь “через два часа”, поэтому in.", "For two hours означає тривалість: протягом двох годин. I'll call you for two hours = я буду дзвонити тобі дві години. Тут “через дві години”, тому in.", "For two hours significa duración: durante dos horas. I'll call you for two hours = te llamaré durante dos horas. Aquí es “dentro de dos horas”, por eso in.") }, retry: [tri('Через период в будущем = in. Через два часа = in two hours.', 'Через період у майбутньому = in. Через дві години = in two hours.', 'Dentro de un período futuro = in. Dentro de dos horas = in two hours.'), tri('In two hours = через два часа.', 'In two hours = через дві години.', 'In two hours = dentro de dos horas.'), tri('Подсказка: call you in two hours.', 'Підказка: call you in two hours.', 'Pista: call you in two hours.')], focusWords: ['two hours'] }),
    timeStep({ id: 'time_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'weekend_at', sentence: 'What do you usually do ___ the weekend?', translation: tri('Что ты обычно делаешь на выходных?', 'Що ти зазвичай робиш на вихідних?', 'Qué haces normalmente el fin de semana?'), options: ['in', 'on', 'at', 'since'], correctAnswer: 'at', correctFeedback: tri('Да. В британском и ирландском английском обычно говорят at the weekend. В американском часто говорят on the weekend.', 'Так. У британській та ірландській англійській зазвичай кажуть at the weekend. В американській часто кажуть on the weekend.', 'Sí. En inglés británico e irlandés normalmente dicen at the weekend. En inglés americano muchas veces dicen on the weekend.'), wrong: { in: tri('In the weekend обычно звучит неправильно. В британском/ирландском варианте естественно at the weekend.', 'In the weekend зазвичай звучить неправильно. У британському/ірландському варіанті природно at the weekend.', 'In the weekend normalmente suena incorrecto. En inglés británico/irlandés lo natural es at the weekend.'), on: tri('On the weekend часто используется в американском английском. Но для ирландского/британского стандарта здесь лучше at the weekend.', 'On the weekend часто використовується в американській англійській. Але для ірландського/британського стандарту тут краще at the weekend.', 'On the weekend se usa mucho en inglés americano. Pero para el estándar irlandés/británico aquí es mejor at the weekend.'), since: tri('Since the weekend означает “с выходных до сейчас”. Здесь вопрос о привычке на выходных. Нужен at the weekend.', 'Since the weekend означає “з вихідних до зараз”. Тут питання про звичку на вихідних. Потрібен at the weekend.', 'Since the weekend significa “desde el fin de semana hasta ahora”. Aquí preguntamos por una costumbre. Necesitamos at the weekend.') }, retry: [tri('Для Ирландии и Британии запомни блок: at the weekend.', 'Для Ірландії та Британії запам’ятай блок: at the weekend.', 'Para Irlanda y Reino Unido memoriza el bloque: at the weekend.'), tri('Для ирландского и британского стандарта естественно: at the weekend.', 'Для ірландського та британського стандарту природно: at the weekend.', 'At the weekend es natural en Irish/British English.'), tri('Подсказка: at the weekend.', 'Підказка: at the weekend.', 'Pista: at the weekend.')], focusWords: ['the weekend'] }),
    timeStep({ id: 'time_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_time_type_recognition', sentence: "The exam is ___ Friday ___ 10 o'clock.", translation: tri('Экзамен в пятницу в 10 часов.', 'Іспит у п’ятницю о 10 годині.', 'El examen es el viernes a las 10.'), options: ['in / in', 'on / at', 'at / on', 'on / in'], correctAnswer: 'on / at', correctFeedback: tri("Да. Friday - день, поэтому on Friday. 10 o'clock - точное время, поэтому at 10 o'clock.", "Так. Friday - день, тому on Friday. 10 o'clock - точний час, тому at 10 o'clock.", "Sí. Friday es día, por eso on Friday. 10 o'clock es hora exacta, por eso at 10 o'clock."), wrong: { 'in / in': tri("In подходит для широких периодов, но Friday - день, а 10 o'clock - точное время. Нужна пара on / at.", "In підходить для широких періодів, але Friday - день, а 10 o'clock - точний час. Потрібна пара on / at.", "In sirve para períodos amplios, pero Friday es día y 10 o'clock es hora exacta. Necesitamos on / at."), 'at / on': tri("Ты поменял их местами. День = on. Точное время = at. Поэтому on Friday at 10 o'clock.", "Ти поміняв їх місцями. День = on. Точний час = at. Тому on Friday at 10 o'clock.", "Los invertiste. Día = on. Hora exacta = at. Por eso on Friday at 10 o'clock."), 'on / in': tri("Первая часть правильная: on Friday. Но 10 o'clock - точное время, поэтому не in, а at.", "Перша частина правильна: on Friday. Але 10 o'clock - точний час, тому не in, а at.", "La primera parte está bien: on Friday. Pero 10 o'clock es hora exacta, por eso no in, sino at.") }, retry: [tri("Раздели на два куска: Friday = день = on. 10 o'clock = точное время = at.", "Розділи на два шматки: Friday = день = on. 10 o'clock = точний час = at.", "Divídelo en dos partes: Friday = día = on. 10 o'clock = hora exacta = at."), tri('День on, часы at.', 'День on, години at.', 'Día on, hora at.'), tri("Подсказка: on Friday at 10 o'clock.", "Підказка: on Friday at 10 o'clock.", "Pista: on Friday at 10 o'clock.")], focusWords: ['Friday', "10 o'clock"] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['exact_time_wrong_preposition', 'day_wrong_preposition', 'month_year_wrong_preposition', 'part_of_day_confusion', 'day_part_of_day_confusion', 'future_period_confusion'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем тип времени и правильный предлог.', 'Звичайне пояснення: показуємо тип часу і правильний прийменник.', 'Explicación normal: mostramos el tipo de tiempo y la preposición correcta.'),
    depth2: tri('Проще: сводим выбор к лестнице at/on/in.', 'Простіше: зводимо вибір до сходів at/on/in.', 'Más simple: reducimos la elección a la escalera at/on/in.'),
    depth3: tri('Еще проще: показываем готовый блок, например at 7, on Monday, in May.', 'Ще простіше: показуємо готовий блок, наприклад at 7, on Monday, in May.', 'Aún más simple: mostramos un bloque listo, por ejemplo at 7, on Monday, in May.'),
    depth4: tri('Почти подсказка: прямо указываем тип времени.', 'Майже підказка: прямо вказуємо тип часу.', 'Casi pista: indicamos directamente el tipo de tiempo.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Не переводи “в”. Сначала определи размер времени: точка на часах = at, день/дата = on, большой период = in.', 'Зупинись. Не перекладай прийменник напряму. Спочатку визнач розмір часу: точка на годиннику = at, день/дата = on, великий період = in.', 'Detente. No traduzcas directamente. Primero identifica el tamaño del tiempo: punto en el reloj = at, día/fecha = on, período grande = in.') },
    afterThreeWrongInSameExercise: { action: 'show_time_type_hint_then_retry', card: tri('Подсказка по типу времени: система покажет, это точное время, день или период, но не выберет предлог за пользователя.', 'Підказка за типом часу: система покаже, це точний час, день чи період, але не вибере прийменник за користувача.', 'Pista de tipo de tiempo: el sistema mostrará si es hora exacta, día o período, pero no elegirá la preposición por el usuario.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери тип времени. Потом система вернет тебя к in/on/at.', 'Режим підказки: спочатку обери тип часу. Потім система поверне тебе до in/on/at.', 'Modo guiado: primero elige el tipo de tiempo. Luego el sistema te devuelve a in/on/at.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_time_001', prompt: tri("8 o'clock - это точное время, день или широкий период?", "8 o'clock - це точний час, день чи широкий період?", "8 o'clock es hora exacta, día o período amplio?"), options: ['точное время', 'день', 'широкий период'], correctIndex: 0, thenReturnToExerciseId: 'time_easy_001' },
      { id: 'guided_time_002', prompt: tri('Monday - это точное время, день или широкий период?', 'Monday - це точний час, день чи широкий період?', 'Monday es hora exacta, día o período amplio?'), options: ['точное время', 'день', 'широкий период'], correctIndex: 1, thenReturnToExerciseId: 'time_contrast_001' },
      { id: 'guided_time_003', prompt: tri('March - это точное время, день или широкий период?', 'March - це точний час, день чи широкий період?', 'March es hora exacta, día o período amplio?'), options: ['точное время', 'день', 'широкий период'], correctIndex: 2, thenReturnToExerciseId: 'time_easy_003' },
      { id: 'guided_time_004', prompt: tri('Friday morning содержит конкретный день?', 'Friday morning містить конкретний день?', 'Friday morning contiene un día concreto?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'time_mixed_003' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'preposition',
    microDiagnosisId: 'preposition_time_in_on_at',
    diagnosisLabel: tri('In / On / At для времени', 'In / On / At для часу', 'In / On / At para tiempo'),
    contrastSet: ['in', 'on', 'at'],
    focusWords: ['in', 'on', 'at'],
    focusPatterns: ['exact_time_at', 'day_on', 'date_on', 'month_in', 'year_in', 'season_in', 'part_of_day_in', 'night_at', 'day_part_on', 'future_period_in', 'weekend_at', 'mixed_time_type_recognition'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_preposition_time_in_on_at_start',
    answer: 'diagnosis_training_preposition_time_in_on_at_answer',
    mastery: 'diagnosis_training_preposition_time_in_on_at_mastery',
    fallback: 'diagnosis_training_preposition_time_in_on_at_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'preposition', microDiagnosisId: 'preposition_time_in_on_at', contrastSet: ['in', 'on', 'at'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logTimeType: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=preposition&microDiagnosisId=preposition_time_in_on_at',
  },
  qualityChecklist: {
    hasStableId: true,
    hasCategory: true,
    hasMultilingualTitle: true,
    hasPlainDiagnosisText: true,
    hasMentalModel: true,
    hasContrastSet: true,
    hasAtLeastSixExamples: true,
    hasAtLeastTwelveExercises: true,
    hasEasyContrastMixedStructure: true,
    hasDistractorSpecificFeedback: true,
    hasRetryFeedbackLevels: true,
    hasGuidedModeForRepeatedMistakes: true,
    hasMasteryRules: true,
    hasSmartTrainerConfig: true,
    hasAnalyticsPayload: true,
    hasFallbackRoute: true,
  },
};


