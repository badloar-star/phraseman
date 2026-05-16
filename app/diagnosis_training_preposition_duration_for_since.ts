import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

function durationStep(input: {
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
      'Не переводи for/since напрямую. Сначала спроси: после пропуска длительность или точка начала?',
      'Не перекладай for/since напряму. Спочатку запитай: після пропуску тривалість чи точка початку?',
      'No traduzcas for/since directamente. Primero pregunta: después del hueco hay duración o punto de inicio?',
    ),
    microTask: tri('Выбери правильный предлог длительности/старта.', 'Обери правильний прийменник тривалості/старту.', 'Elige la preposición correcta de duración/inicio.'),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        'Не совсем. For отвечает “как долго?”, since отвечает “с какого момента?”.',
        'Не зовсім. For відповідає “як довго?”, since відповідає “з якого моменту?”.',
        'No exactamente. For responde “cuánto tiempo?”, since responde “desde qué momento?”.',
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
      'For + длительность: for two hours, for years. Since + старт: since Monday, since 2020, since I moved here.',
      'For + тривалість: for two hours, for years. Since + старт: since Monday, since 2020, since I moved here.',
      'For + duración: for two hours, for years. Since + inicio: since Monday, since 2020, since I moved here.',
    ),
    focusWords: input.focusWords,
  };
}

export const PREPOSITION_DURATION_FOR_SINCE_TRAINING: DiagnosisTraining = {
  id: 'preposition_duration_for_since',
  category: 'preposition',
  version: '1.0.0',
  status: 'active',
  priority: 6,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('For / Since: длительность и старт', 'For / Since: тривалість і старт', 'For / Since: duración y punto de inicio'),
  shortTitle: tri('For / Since', 'For / Since', 'For / Since'),
  shortDiagnosis: tri(
    'Ты путаешь for и since: длительность или точка начала.',
    'Ти плутаєш for і since: тривалість чи точка початку.',
    'Confundes for y since: duración o punto de inicio.',
  ),
  diagnosisText: tri(
    'Ты путаешь for и since. Обычно проблема в том, что оба могут переводиться как “уже/в течение/с”, но английский различает две вещи: сколько длится действие и когда оно началось.',
    'Ти плутаєш for і since. Зазвичай проблема в тому, що обидва можуть перекладатися схоже, але англійська розрізняє дві речі: скільки триває дія і коли вона почалася.',
    'Confundes for y since. Normalmente el problema es que ambos pueden traducirse de forma parecida, pero el inglés distingue dos cosas: cuánto dura la acción y cuándo empezó.',
  ),
  mentalModel: tri(
    'For = сколько времени длится. Since = с какого момента началось.',
    'For = скільки часу триває. Since = з якого моменту почалося.',
    'For = cuánto tiempo dura. Since = desde qué momento empezó.',
  ),
  contrastSet: ['for', 'since'],
  coreRule: tri(
    'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
    'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
    'for two days, for three years, for a long time. since Monday, since 2020, since I moved here.',
  ),
  whatUserMustLearn: {
    ru: [
      'For отвечает на вопрос “как долго?”: for two hours, for five years.',
      'Since отвечает на вопрос “с какого момента?”: since Monday, since 2020.',
      'For обычно идет с длительностью: two days, three weeks, a long time.',
      'Since обычно идет с точкой старта: Monday, 2020, yesterday, I moved here.',
      'С Present Perfect часто используются оба: I have lived here for three years / since 2021.',
      'For не означает дедлайн. For two hours = в течение двух часов, не через два часа.',
      'Since не означает длительность. Since three years неправильно, если хочешь сказать “три года”.',
    ],
    uk: [
      'For відповідає на питання “як довго?”: for two hours, for five years.',
      'Since відповідає на питання “з якого моменту?”: since Monday, since 2020.',
      'For зазвичай іде з тривалістю: two days, three weeks, a long time.',
      'Since зазвичай іде з точкою старту: Monday, 2020, yesterday, I moved here.',
      'З Present Perfect часто використовуються обидва: I have lived here for three years / since 2021.',
      'For не означає дедлайн. For two hours = протягом двох годин, не через дві години.',
      'Since не означає тривалість. Since three years неправильно, якщо хочеш сказати “три роки”.',
    ],
    es: [
      'For responde a “cuánto tiempo?”: for two hours, for five years.',
      'Since responde a “desde qué momento?”: since Monday, since 2020.',
      'For normalmente va con duración: two days, three weeks, a long time.',
      'Since normalmente va con punto de inicio: Monday, 2020, yesterday, I moved here.',
      'Con Present Perfect se usan mucho ambos: I have lived here for three years / since 2021.',
      'For no significa fecha límite. For two hours = durante dos horas, no dentro de dos horas.',
      'Since no significa duración. Since three years es incorrecto si quieres decir “tres años”.',
    ],
  },
  examples: [
    { en: 'I have lived here for three years.', ru: 'Я живу здесь три года.', uk: 'Я живу тут три роки.', es: 'He vivido aquí durante tres años.', why: tri('Three years отвечает на “как долго?”. Это длительность, поэтому for.', 'Three years відповідає на “як довго?”. Це тривалість, тому for.', 'Three years responde a “cuánto tiempo?”. Es duración, por eso for.') },
    { en: 'I have lived here since 2021.', ru: 'Я живу здесь с 2021 года.', uk: 'Я живу тут з 2021 року.', es: 'He vivido aquí desde 2021.', why: tri('2021 - точка старта. Поэтому since.', '2021 - точка старту. Тому since.', '2021 es punto de inicio. Por eso since.') },
    { en: 'She has worked here for six months.', ru: 'Она работает здесь шесть месяцев.', uk: 'Вона працює тут шість місяців.', es: 'Ella ha trabajado aquí durante seis meses.', why: tri('Six months - длительность. Поэтому for six months.', 'Six months - тривалість. Тому for six months.', 'Six months es duración. Por eso for six months.') },
    { en: 'She has worked here since March.', ru: 'Она работает здесь с марта.', uk: 'Вона працює тут з березня.', es: 'Ella trabaja aquí desde marzo.', why: tri('March - момент начала. Поэтому since March.', 'March - момент початку. Тому since March.', 'March es momento de inicio. Por eso since March.') },
    { en: 'We waited for two hours.', ru: 'Мы ждали два часа.', uk: 'Ми чекали дві години.', es: 'Esperamos durante dos horas.', why: tri('Two hours - сколько длилось ожидание. Это длительность, поэтому for.', 'Two hours - скільки тривало очікування. Це тривалість, тому for.', 'Two hours indica cuánto duró la espera. Es duración, por eso for.') },
    { en: "I haven't seen him since Monday.", ru: 'Я не видел его с понедельника.', uk: 'Я не бачив його з понеділка.', es: 'No lo he visto desde el lunes.', why: tri('Monday - точка старта периода без встречи. Поэтому since Monday.', 'Monday - точка старту періоду без зустрічі. Тому since Monday.', 'Monday es el punto de inicio del período sin verlo. Por eso since Monday.') },
    { en: 'They stayed there for a week.', ru: 'Они пробыли там неделю.', uk: 'Вони пробули там тиждень.', es: 'Se quedaron allí durante una semana.', why: tri('A week - длительность пребывания. Поэтому for a week.', 'A week - тривалість перебування. Тому for a week.', 'A week es duración de la estancia. Por eso for a week.') },
    { en: 'I have known her since we were children.', ru: 'Я знаю её с тех пор, как мы были детьми.', uk: 'Я знаю її з тих часів, коли ми були дітьми.', es: 'La conozco desde que éramos niños.', why: tri('Since может стоять перед целым предложением, если оно показывает момент начала.', 'Since може стояти перед цілим реченням, якщо воно показує момент початку.', 'Since puede ir antes de una oración completa si muestra el momento de inicio.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь for и since. В переводе они часто звучат похоже, но в английском это два разных вопроса.', 'Схоже, ти плутаєш for і since. У перекладі вони часто звучать схоже, але в англійській це два різні питання.', 'Parece que confundes for y since. En traducción a veces suenan parecido, pero en inglés son dos preguntas diferentes.') },
    { id: 'intro_rule', type: 'rule', text: tri('For отвечает “как долго?”. Since отвечает “с какого момента?”.', 'For відповідає “як довго?”. Since відповідає “з якого моменту?”.', 'For responde “cuánto tiempo?”. Since responde “desde qué momento?”.') },
    { id: 'intro_warning', type: 'warning', text: tri('Не смотри на перевод. Смотри на слово после пропуска: длительность - for, точка старта - since.', 'Не дивись на переклад. Дивись на слово після пропуску: тривалість - for, точка старту - since.', 'No mires la traducción. Mira la palabra después del hueco: duración - for, punto de inicio - since.') },
  ],
  steps: [
    durationStep({ id: 'duration_easy_001', order: 1, difficulty: 'easy', targetSkill: 'duration_for', sentence: 'I waited ___ two hours.', translation: tri('Я ждал два часа.', 'Я чекав дві години.', 'Esperé durante dos horas.'), options: ['for', 'since', 'from', 'during'], correctAnswer: 'for', correctFeedback: tri('Да. Two hours показывает, сколько длилось ожидание. Длительность = for.', 'Так. Two hours показує, скільки тривало очікування. Тривалість = for.', 'Sí. Two hours muestra cuánto duró la espera. Duración = for.'), wrong: { since: tri('Since нужен для точки старта: since Monday. Two hours - это длительность, поэтому for.', 'Since потрібен для точки старту: since Monday. Two hours - це тривалість, тому for.', 'Since se usa con punto de inicio: since Monday. Two hours es duración, por eso for.'), from: tri('From показывает начало диапазона. Здесь нет начальной точки, только длительность. Нужен for.', 'From показує початок діапазону. Тут немає початкової точки, тільки тривалість. Потрібен for.', 'From muestra inicio de rango. Aquí solo hay duración. Necesitamos for.'), during: tri('During обычно идет с событием: during the meeting. С количеством времени естественно for two hours.', 'During зазвичай іде з подією: during the meeting. З кількістю часу природно for two hours.', 'During normalmente va con evento. Con cantidad de tiempo usamos for two hours.') }, retry: [tri('Two hours отвечает на “как долго?”. Как долго = for.', 'Two hours відповідає на “як довго?”. Як довго = for.', 'Two hours responde a “cuánto tiempo?”. Cuánto tiempo = for.'), tri('Длительность: for two hours.', 'Тривалість: for two hours.', 'Duración: for two hours.'), tri('Подсказка: waited for two hours.', 'Підказка: waited for two hours.', 'Pista: waited for two hours.')], focusWords: ['two hours'] }),
    durationStep({ id: 'duration_easy_002', order: 2, difficulty: 'easy', targetSkill: 'duration_for', sentence: 'She stayed there ___ a week.', translation: tri('Она пробыла там неделю.', 'Вона пробула там тиждень.', 'Ella se quedó allí una semana.'), options: ['for', 'since', 'from', 'until'], correctAnswer: 'for', correctFeedback: tri('Да. A week - длительность пребывания. Поэтому for a week.', 'Так. A week - тривалість перебування. Тому for a week.', 'Sí. A week es duración de la estancia. Por eso for a week.'), wrong: { since: tri('Since нужен для точки начала. A week - длительность, поэтому for.', 'Since потрібен для точки початку. A week - тривалість, тому for.', 'Since se usa con punto de inicio. A week es duración, por eso for.'), from: tri('From требует точку начала. A week говорит, сколько длилось. Поэтому for.', 'From потребує точку початку. A week говорить, скільки тривало. Тому for.', 'From necesita punto de inicio. A week dice cuánto duró. Por eso for.'), until: tri('Until показывает конечную точку. A week - длительность, не конец. Нужен for.', 'Until показує кінцеву точку. A week - тривалість, не кінець. Потрібен for.', 'Until muestra punto final. A week es duración. Necesitamos for.') }, retry: [tri('A week = сколько времени. Сколько времени = for.', 'A week = скільки часу. Скільки часу = for.', 'A week = cuánto tiempo. Cuánto tiempo = for.'), tri('Запомни: for a week.', 'Запам’ятай: for a week.', 'Recuerda: for a week.'), tri('Подсказка: stayed for a week.', 'Підказка: stayed for a week.', 'Pista: stayed for a week.')], focusWords: ['a week'] }),
    durationStep({ id: 'duration_easy_003', order: 3, difficulty: 'easy', targetSkill: 'start_point_since', sentence: "I haven't seen him ___ Monday.", translation: tri('Я не видел его с понедельника.', 'Я не бачив його з понеділка.', 'No lo he visto desde el lunes.'), options: ['for', 'since', 'during', 'until'], correctAnswer: 'since', correctFeedback: tri('Да. Monday - точка старта периода. С точки старта используется since.', 'Так. Monday - точка старту періоду. З точкою старту використовується since.', 'Sí. Monday es punto de inicio. Con punto de inicio usamos since.'), wrong: { for: tri('For нужен для длительности: for two days. Monday - точка начала. Нужен since.', 'For потрібен для тривалості: for two days. Monday - точка початку. Потрібен since.', 'For se usa con duración. Monday es punto de inicio. Necesitamos since.'), during: tri('During Monday не выражает “с понедельника до сейчас”. Нужен since Monday.', 'During Monday не виражає “з понеділка до зараз”. Потрібен since Monday.', 'During Monday no expresa “desde el lunes hasta ahora”. Necesitamos since Monday.'), until: tri('Until Monday означает “до понедельника”. Здесь наоборот: с понедельника до сейчас.', 'Until Monday означає “до понеділка”. Тут навпаки: з понеділка до зараз.', 'Until Monday significa hasta el lunes. Aquí es desde el lunes hasta ahora.') }, retry: [tri('Monday отвечает на “с какого момента?”. С какого момента = since.', 'Monday відповідає на “з якого моменту?”. З якого моменту = since.', 'Monday responde a “desde qué momento?”. Desde qué momento = since.'), tri('Старт: since Monday.', 'Старт: since Monday.', 'Inicio: since Monday.'), tri('Подсказка: since Monday.', 'Підказка: since Monday.', 'Pista: since Monday.')], focusWords: ['Monday'] }),
    durationStep({ id: 'duration_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'start_point_since', sentence: 'They have lived here ___ 2020.', translation: tri('Они живут здесь с 2020 года.', 'Вони живуть тут з 2020 року.', 'Viven aquí desde 2020.'), options: ['for', 'since', 'during', 'in'], correctAnswer: 'since', correctFeedback: tri('Да. 2020 - год начала. Это точка старта, поэтому since 2020.', 'Так. 2020 - рік початку. Це точка старту, тому since 2020.', 'Sí. 2020 es el año de inicio. Por eso since 2020.'), wrong: { for: tri('For 2020 неправильно: 2020 - не длительность. For требует период: for three years.', 'For 2020 неправильно: 2020 - не тривалість. For потребує період: for three years.', 'For 2020 es incorrecto: 2020 no es duración. For necesita período.'), during: tri('During 2020 = в течение 2020 года. Здесь с 2020 до сейчас, поэтому since.', 'During 2020 = протягом 2020 року. Тут з 2020 до зараз, тому since.', 'During 2020 = durante el año 2020. Aquí es desde 2020 hasta ahora.'), in: tri('In 2020 было бы для события: moved here in 2020. Have lived here требует since.', 'In 2020 було б для події. Have lived here потребує since.', 'In 2020 sería para un evento. Have lived here necesita since.') }, retry: [tri('2020 - начало периода. Начало = since.', '2020 - початок періоду. Початок = since.', '2020 es inicio del período. Inicio = since.'), tri('С 2020 года = since 2020.', 'З 2020 року = since 2020.', 'Desde 2020 = since 2020.'), tri('Подсказка: since 2020.', 'Підказка: since 2020.', 'Pista: since 2020.')], focusWords: ['2020'] }),
    durationStep({ id: 'duration_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'duration_for', sentence: 'We have known each other ___ ten years.', translation: tri('Мы знаем друг друга десять лет.', 'Ми знаємо одне одного десять років.', 'Nos conocemos desde hace diez años.'), options: ['for', 'since', 'from', 'during'], correctAnswer: 'for', correctFeedback: tri('Да. Ten years - длительность. Поэтому for ten years.', 'Так. Ten years - тривалість. Тому for ten years.', 'Sí. Ten years es duración. Por eso for ten years.'), wrong: { since: tri('Since ten years неправильно. Since требует старт: since 2014. Ten years - длительность.', 'Since ten years неправильно. Since потребує старт: since 2014. Ten years - тривалість.', 'Since ten years es incorrecto. Since necesita inicio. Ten years es duración.'), from: tri('From требует начальную точку. Ten years - не старт, а длительность. Нужен for.', 'From потребує початкову точку. Ten years - не старт, а тривалість. Потрібен for.', 'From necesita punto de inicio. Ten years es duración. Necesitamos for.'), during: tri('During ten years звучит неестественно здесь. С количеством времени используется for.', 'During ten years звучить неприродно тут. З кількістю часу використовується for.', 'During ten years suena poco natural. Con cantidad de tiempo usamos for.') }, retry: [tri('Ten years отвечает на “как долго?”. Значит for.', 'Ten years відповідає на “як довго?”. Значить for.', 'Ten years responde a “cuánto tiempo?”. Entonces for.'), tri('Длительность = for ten years.', 'Тривалість = for ten years.', 'Duración = for ten years.'), tri('Подсказка: known each other for ten years.', 'Підказка: known each other for ten years.', 'Pista: known each other for ten years.')], focusWords: ['ten years'] }),
    durationStep({ id: 'duration_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'start_point_since', sentence: 'She has worked here ___ March.', translation: tri('Она работает здесь с марта.', 'Вона працює тут з березня.', 'Ella trabaja aquí desde marzo.'), options: ['for', 'since', 'during', 'by'], correctAnswer: 'since', correctFeedback: tri('Да. March - момент начала работы. Точка старта = since.', 'Так. March - момент початку роботи. Точка старту = since.', 'Sí. March es inicio del trabajo. Punto de inicio = since.'), wrong: { for: tri('For March неправильно: March - не длительность. Длительность была бы for three months.', 'For March неправильно: March - не тривалість. Тривалість була б for three months.', 'For March es incorrecto: March no es duración. La duración sería for three months.'), during: tri('During March = в течение марта. Здесь она работает с марта до сейчас: since.', 'During March = протягом березня. Тут вона працює з березня до зараз: since.', 'During March = durante marzo. Aquí trabaja desde marzo hasta ahora: since.'), by: tri('By March означает “к марту”. Здесь март - начало периода. Нужен since.', 'By March означає “до березня”. Тут березень - початок періоду. Потрібен since.', 'By March significa para marzo. Aquí marzo es inicio. Necesitamos since.') }, retry: [tri('March отвечает на “с какого месяца?”. С какого момента = since.', 'March відповідає на “з якого місяця?”. З якого моменту = since.', 'March responde a “desde qué mes?”. Desde qué momento = since.'), tri('Старт: since March.', 'Старт: since March.', 'Inicio: since March.'), tri('Подсказка: since March.', 'Підказка: since March.', 'Pista: since March.')], focusWords: ['March'] }),
    durationStep({ id: 'duration_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'present_perfect_duration_for', sentence: 'I have been tired ___ days.', translation: tri('Я уставший уже несколько дней.', 'Я втомлений уже кілька днів.', 'Estoy cansado desde hace días.'), options: ['for', 'since', 'from', 'in'], correctAnswer: 'for', correctFeedback: tri('Да. Days здесь означает длительность: несколько дней. Поэтому for days.', 'Так. Days тут означає тривалість: кілька днів. Тому for days.', 'Sí. Days aquí significa duración. Por eso for days.'), wrong: { since: tri('Since days неправильно. Since требует точку начала: since Monday. Days здесь длительность.', 'Since days неправильно. Since потребує точку початку: since Monday. Days тут тривалість.', 'Since days es incorrecto. Since necesita punto de inicio. Days es duración.'), from: tri('From требует стартовую точку. Days показывает длительность. Нужен for.', 'From потребує стартову точку. Days показує тривалість. Потрібен for.', 'From necesita punto de inicio. Days muestra duración. Necesitamos for.'), in: tri('In days может значить “через несколько дней”. Здесь состояние длится несколько дней. Нужен for.', 'In days може означати “через кілька днів”. Тут стан триває кілька днів. Потрібен for.', 'In days puede significar dentro de unos días. Aquí el estado dura días. Necesitamos for.') }, retry: [tri('Состояние длится несколько дней. Длится сколько? for days.', 'Стан триває кілька днів. Триває скільки? for days.', 'El estado dura varios días. Dura cuánto? for days.'), tri('Длительность = for days.', 'Тривалість = for days.', 'Duración = for days.'), tri('Подсказка: tired for days.', 'Підказка: tired for days.', 'Pista: tired for days.')], focusWords: ['days'] }),
    durationStep({ id: 'duration_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'present_perfect_start_since', sentence: 'He has been sick ___ last week.', translation: tri('Он болеет с прошлой недели.', 'Він хворіє з минулого тижня.', 'Está enfermo desde la semana pasada.'), options: ['for', 'since', 'during', 'within'], correctAnswer: 'since', correctFeedback: tri('Да. Last week - точка старта состояния. Поэтому since last week.', 'Так. Last week - точка старту стану. Тому since last week.', 'Sí. Last week es punto de inicio. Por eso since last week.'), wrong: { for: tri('For last week звучит неправильно. For требует длительность: for a week. Last week - старт.', 'For last week звучить неправильно. For потребує тривалість: for a week. Last week - старт.', 'For last week suena incorrecto. For necesita duración: for a week. Last week es inicio.'), during: tri('During last week = в течение прошлой недели. Здесь с прошлой недели до сейчас: since.', 'During last week = протягом минулого тижня. Тут з минулого тижня до зараз: since.', 'During last week = durante la semana pasada. Aquí desde la semana pasada: since.'), within: tri('Within означает “в пределах периода”. Здесь нужен старт состояния: since last week.', 'Within означає “у межах періоду”. Тут потрібен старт стану: since last week.', 'Within significa dentro de un período. Aquí necesitamos inicio: since last week.') }, retry: [tri('Last week показывает, когда состояние началось. Началось когда? since.', 'Last week показує, коли стан почався. Почався коли? since.', 'Last week muestra cuándo empezó. Empezó cuándo? since.'), tri('Старт состояния = since last week.', 'Старт стану = since last week.', 'Inicio del estado = since last week.'), tri('Подсказка: sick since last week.', 'Підказка: sick since last week.', 'Pista: sick since last week.')], focusWords: ['last week'] }),
    durationStep({ id: 'duration_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'duration_for', sentence: 'The baby slept ___ three hours.', translation: tri('Ребёнок спал три часа.', 'Дитина спала три години.', 'El bebé durmió tres horas.'), options: ['for', 'since', 'at', 'by'], correctAnswer: 'for', correctFeedback: tri('Да. Three hours показывает длительность сна. Поэтому for three hours.', 'Так. Three hours показує тривалість сну. Тому for three hours.', 'Sí. Three hours muestra duración del sueño. Por eso for three hours.'), wrong: { since: tri('Since three hours неправильно. Since требует начало: since 3 o’clock. Three hours - длительность.', 'Since three hours неправильно. Since потребує початок: since 3 o’clock. Three hours - тривалість.', 'Since three hours es incorrecto. Since necesita inicio. Three hours es duración.'), at: tri('At используется для точного времени: at 3 o’clock. Здесь длительность, поэтому for.', 'At використовується для точного часу. Тут тривалість, тому for.', 'At se usa con hora exacta. Aquí es duración, por eso for.'), by: tri('By three hours не выражает длительность сна. Нужен for.', 'By three hours не виражає тривалість сну. Потрібен for.', 'By three hours no expresa duración del sueño. Necesitamos for.') }, retry: [tri('Спал сколько? Три часа. Длительность = for.', 'Спав скільки? Три години. Тривалість = for.', 'Durmió cuánto? Tres horas. Duración = for.'), tri('For three hours.', 'For three hours.', 'For three hours.'), tri('Подсказка: slept for three hours.', 'Підказка: slept for three hours.', 'Pista: slept for three hours.')], focusWords: ['three hours'] }),
    durationStep({ id: 'duration_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'since_clause', sentence: 'I have known her ___ we were children.', translation: tri('Я знаю её с тех пор, как мы были детьми.', 'Я знаю її з тих часів, коли ми були дітьми.', 'La conozco desde que éramos niños.'), options: ['for', 'since', 'during', 'from'], correctAnswer: 'since', correctFeedback: tri('Да. We were children показывает момент начала через целое предложение. Since может стоять перед clause.', 'Так. We were children показує момент початку через ціле речення. Since може стояти перед clause.', 'Sí. We were children muestra el inicio con una oración completa. Since puede ir antes.'), wrong: { for: tri('For не ставится перед целым предложением we were children в таком смысле. Нужен since.', 'For не ставиться перед цілим реченням we were children у такому сенсі. Потрібен since.', 'For no va antes de we were children con este sentido. Necesitamos since.'), during: tri('During our childhood было бы возможно. Но перед предложением естественно since.', 'During our childhood було б можливо. Але перед реченням природно since.', 'During our childhood sería posible. Pero antes de la oración, lo natural es since.'), from: tri('From обычно не работает перед такой clause. Нужен since we were children.', 'From зазвичай не працює перед такою clause. Потрібен since we were children.', 'From normalmente no funciona antes de esta clause. Necesitamos since we were children.') }, retry: [tri('We were children показывает, когда началось знакомство. С момента начала = since.', 'We were children показує, коли почалося знайомство. З моменту початку = since.', 'We were children muestra cuándo empezó. Desde el inicio = since.'), tri('Since + предложение: since we were children.', 'Since + речення: since we were children.', 'Since + oración: since we were children.'), tri('Подсказка: since we were children.', 'Підказка: since we were children.', 'Pista: since we were children.')], focusWords: ['we were children'] }),
    durationStep({ id: 'duration_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'for_vs_in_future', sentence: "I'll be ready ___ ten minutes.", translation: tri('Я буду готов через десять минут.', 'Я буду готовий через десять хвилин.', 'Estaré listo en diez minutos.'), options: ['for', 'since', 'in', 'during'], correctAnswer: 'in', correctFeedback: tri('Да. In ten minutes означает через десять минут. Это будущий момент, не длительность действия.', 'Так. In ten minutes означає через десять хвилин. Це майбутній момент, не тривалість дії.', 'Sí. In ten minutes significa dentro de diez minutos. Es momento futuro, no duración.'), wrong: { for: tri('For ten minutes = в течение десяти минут. “Через десять минут” = in ten minutes.', 'For ten minutes = протягом десяти хвилин. “Через десять хвилин” = in ten minutes.', 'For ten minutes = durante diez minutos. Dentro de diez minutos = in ten minutes.'), since: tri('Since нужен для точки старта. Ten minutes здесь показывает будущий момент. Нужен in.', 'Since потрібен для точки старту. Ten minutes тут показує майбутній момент. Потрібен in.', 'Since se usa para inicio. Ten minutes aquí muestra momento futuro. Necesitamos in.'), during: tri('During ten minutes звучит неестественно здесь. Для “через десять минут” нужен in.', 'During ten minutes звучить неприродно тут. Для “через десять хвилин” потрібен in.', 'During ten minutes suena poco natural. Para dentro de diez minutos usamos in.') }, retry: [tri('Через десять минут = in ten minutes. В течение десяти минут = for ten minutes.', 'Через десять хвилин = in ten minutes. Протягом десяти хвилин = for ten minutes.', 'Dentro de diez minutos = in ten minutes. Durante diez minutos = for ten minutes.'), tri('Будущий момент через период = in.', 'Майбутній момент через період = in.', 'Momento futuro después de un período = in.'), tri('Подсказка: ready in ten minutes.', 'Підказка: ready in ten minutes.', 'Pista: ready in ten minutes.')], focusWords: ['ten minutes'] }),
    durationStep({ id: 'duration_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'duration_for', sentence: 'He worked in London ___ five years.', translation: tri('Он работал в Лондоне пять лет.', 'Він працював у Лондоні п’ять років.', 'Trabajó en Londres durante cinco años.'), options: ['for', 'since', 'from', 'by'], correctAnswer: 'for', correctFeedback: tri('Да. Five years показывает длительность работы. Поэтому for five years.', 'Так. Five years показує тривалість роботи. Тому for five years.', 'Sí. Five years muestra duración del trabajo. Por eso for five years.'), wrong: { since: tri('Since five years неправильно. Since требует старт: since 2018. Five years - длительность.', 'Since five years неправильно. Since потребує старт: since 2018. Five years - тривалість.', 'Since five years es incorrecto. Since necesita inicio. Five years es duración.'), from: tri('From требует старт или диапазон. Здесь только длительность. Нужен for.', 'From потребує старт або діапазон. Тут тільки тривалість. Потрібен for.', 'From necesita inicio o rango. Aquí solo hay duración. Necesitamos for.'), by: tri('By five years не выражает “работал пять лет”. Нужен worked for five years.', 'By five years не виражає “працював п’ять років”. Потрібен worked for five years.', 'By five years no expresa trabajó cinco años. Necesitamos worked for five years.') }, retry: [tri('Работал сколько? Пять лет. Сколько времени = for.', 'Працював скільки? П’ять років. Скільки часу = for.', 'Trabajó cuánto tiempo? Cinco años. Cuánto tiempo = for.'), tri('Длительность работы = for five years.', 'Тривалість роботи = for five years.', 'Duración del trabajo = for five years.'), tri('Подсказка: worked for five years.', 'Підказка: worked for five years.', 'Pista: worked for five years.')], focusWords: ['five years'] }),
    durationStep({ id: 'duration_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'start_point_since', sentence: "I haven't eaten anything ___ breakfast.", translation: tri('Я ничего не ел с завтрака.', 'Я нічого не їв зі сніданку.', 'No he comido nada desde el desayuno.'), options: ['for', 'since', 'during', 'until'], correctAnswer: 'since', correctFeedback: tri('Да. Breakfast здесь точка старта периода без еды. Поэтому since breakfast.', 'Так. Breakfast тут точка старту періоду без їжі. Тому since breakfast.', 'Sí. Breakfast aquí es punto de inicio del período sin comer. Por eso since breakfast.'), wrong: { for: tri('For breakfast значит “на завтрак” в другом контексте. Здесь breakfast - точка начала, поэтому since.', 'For breakfast означає “на сніданок” в іншому контексті. Тут breakfast - точка початку, тому since.', 'For breakfast significa para el desayuno. Aquí breakfast es punto de inicio, por eso since.'), during: tri('During breakfast = во время завтрака. Здесь с момента завтрака до сейчас. Нужен since.', 'During breakfast = під час сніданку. Тут з моменту сніданку до зараз. Потрібен since.', 'During breakfast = durante el desayuno. Aquí desde el desayuno hasta ahora. Necesitamos since.'), until: tri('Until breakfast = до завтрака. Здесь наоборот: после завтрака до сейчас. Нужен since.', 'Until breakfast = до сніданку. Тут навпаки: після сніданку до зараз. Потрібен since.', 'Until breakfast = hasta el desayuno. Aquí es desde el desayuno hasta ahora.') }, retry: [tri('Breakfast здесь момент, после которого ты не ел. Момент старта = since.', 'Breakfast тут момент, після якого ти не їв. Момент старту = since.', 'Breakfast aquí es el momento después del cual no comiste. Punto de inicio = since.'), tri('С завтрака = since breakfast.', 'Зі сніданку = since breakfast.', 'Desde el desayuno = since breakfast.'), tri('Подсказка: since breakfast.', 'Підказка: since breakfast.', 'Pista: since breakfast.')], focusWords: ['breakfast'] }),
    durationStep({ id: 'duration_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'duration_for', sentence: 'We talked ___ a long time.', translation: tri('Мы долго разговаривали.', 'Ми довго розмовляли.', 'Hablamos durante mucho tiempo.'), options: ['for', 'since', 'from', 'within'], correctAnswer: 'for', correctFeedback: tri('Да. A long time - длительность. Поэтому for a long time.', 'Так. A long time - тривалість. Тому for a long time.', 'Sí. A long time es duración. Por eso for a long time.'), wrong: { since: tri('Since a long time неправильно. Since требует точку начала. A long time - длительность.', 'Since a long time неправильно. Since потребує точку початку. A long time - тривалість.', 'Since a long time es incorrecto. Since necesita punto de inicio. A long time es duración.'), from: tri('From требует точку начала. A long time не старт, а длительность. Нужен for.', 'From потребує точку початку. A long time не старт, а тривалість. Потрібен for.', 'From necesita punto de inicio. A long time es duración. Necesitamos for.'), within: tri('Within a long time не выражает “долго разговаривали”. Нужен for a long time.', 'Within a long time не виражає “довго розмовляли”. Потрібен for a long time.', 'Within a long time no expresa hablar mucho tiempo. Necesitamos for a long time.') }, retry: [tri('A long time отвечает на “как долго?”. Значит for.', 'A long time відповідає на “як довго?”. Значить for.', 'A long time responde a “cuánto tiempo?”. Entonces for.'), tri('Долго = for a long time.', 'Довго = for a long time.', 'Mucho tiempo = for a long time.'), tri('Подсказка: talked for a long time.', 'Підказка: talked for a long time.', 'Pista: talked for a long time.')], focusWords: ['a long time'] }),
    durationStep({ id: 'duration_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_for_since_pair', sentence: 'She has lived in Cork ___ 2019, so she has been there ___ five years.', translation: tri('Она живет в Корке с 2019 года, так что она там уже пять лет.', 'Вона живе в Корку з 2019 року, тож вона там уже п’ять років.', 'Ella vive en Cork desde 2019, así que lleva allí cinco años.'), options: ['for / since', 'since / for', 'from / since', 'during / for'], correctAnswer: 'since / for', correctFeedback: tri('Да. 2019 - точка старта, поэтому since 2019. Five years - длительность, поэтому for five years.', 'Так. 2019 - точка старту, тому since 2019. Five years - тривалість, тому for five years.', 'Sí. 2019 es punto de inicio, por eso since. Five years es duración, por eso for.'), wrong: { 'for / since': tri('Ты поменял местами. 2019 - старт, значит since. Five years - длительность, значит for.', 'Ти поміняв місцями. 2019 - старт, значить since. Five years - тривалість, значить for.', 'Los invertiste. 2019 es inicio: since. Five years es duración: for.'), 'from / since': tri('From 2019 возможно в диапазонах, но с has lived до настоящего естественно since. Five years требует for.', 'From 2019 можливе в діапазонах, але з has lived до теперішнього природно since. Five years потребує for.', 'From 2019 puede funcionar en rangos, pero con has lived lo natural es since. Five years necesita for.'), 'during / for': tri('During 2019 = в течение 2019 года. Здесь с 2019 до сейчас, поэтому since 2019.', 'During 2019 = протягом 2019 року. Тут з 2019 до зараз, тому since 2019.', 'During 2019 = durante 2019. Aquí desde 2019 hasta ahora, por eso since 2019.') }, retry: [tri('Раздели: 2019 = когда началось = since. Five years = сколько длится = for.', 'Розділи: 2019 = коли почалося = since. Five years = скільки триває = for.', 'Divide: 2019 = cuándo empezó = since. Five years = cuánto dura = for.'), tri('Старт since, длительность for.', 'Старт since, тривалість for.', 'Inicio since, duración for.'), tri('Подсказка: since 2019 / for five years.', 'Підказка: since 2019 / for five years.', 'Pista: since 2019 / for five years.')], focusWords: ['2019', 'five years'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['duration_since_error', 'start_point_for_error', 'present_perfect_duration_confusion', 'since_clause_confusion', 'for_vs_in_future_confusion', 'specific_start_vs_duration_confusion'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, это длительность или точка старта.', 'Звичайне пояснення: показуємо, це тривалість чи точка старту.', 'Explicación normal: mostramos si es duración o punto de inicio.'),
    depth2: tri('Проще: сводим выбор к двум вопросам “как долго?” и “с какого момента?”.', 'Простіше: зводимо вибір до двох питань “як довго?” і “з якого моменту?”.', 'Más simple: reducimos la elección a dos preguntas “cuánto tiempo?” y “desde cuándo?”.'),
    depth3: tri('Еще проще: показываем готовую пару for + period, since + start.', 'Ще простіше: показуємо готову пару for + period, since + start.', 'Aún más simple: mostramos la pareja for + period, since + start.'),
    depth4: tri('Почти подсказка: прямо указываем, что после пропуска стоит длительность или старт.', 'Майже підказка: прямо вказуємо, що після пропуску стоїть тривалість або старт.', 'Casi pista: indicamos directamente si después del hueco hay duración o inicio.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Остановись. Не переводи. После пропуска длительность или точка начала? Длительность = for. Точка начала = since.', 'Зупинись. Не перекладай. Після пропуску тривалість чи точка початку? Тривалість = for. Точка початку = since.', 'Detente. No traduzcas. Después del hueco hay duración o punto de inicio? Duración = for. Punto de inicio = since.') },
    afterThreeWrongInSameExercise: { action: 'show_duration_start_hint_then_retry', card: tri('Подсказка по смыслу: система покажет, это “как долго” или “с какого момента”, но не выберет ответ за пользователя.', 'Підказка за змістом: система покаже, це “як довго” чи “з якого моменту”, але не вибере відповідь за користувача.', 'Pista de significado: el sistema mostrará si es “cuánto tiempo” o “desde cuándo”, pero no elegirá la respuesta.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Режим подсказки: сначала выбери тип времени: длительность или старт. Потом система вернет тебя к for/since.', 'Режим підказки: спочатку обери тип часу: тривалість чи старт. Потім система поверне тебе до for/since.', 'Modo guiado: primero elige el tipo de tiempo: duración o inicio. Luego el sistema te devuelve a for/since.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_duration_001', prompt: tri('Two hours - это длительность или точка начала?', 'Two hours - це тривалість чи точка початку?', 'Two hours es duración o punto de inicio?'), options: ['длительность', 'точка начала'], correctIndex: 0, thenReturnToExerciseId: 'duration_easy_001' },
      { id: 'guided_duration_002', prompt: tri("Monday в фразе I haven't seen him ___ Monday - это длительность или точка начала?", "Monday у фразі I haven't seen him ___ Monday - це тривалість чи точка початку?", "Monday en I haven't seen him ___ Monday es duración o punto de inicio?"), options: ['длительность', 'точка начала'], correctIndex: 1, thenReturnToExerciseId: 'duration_easy_003' },
      { id: 'guided_duration_003', prompt: tri('Five years - это “как долго” или “с какого момента”?', 'Five years - це “як довго” чи “з якого моменту”?', 'Five years es “cuánto tiempo” o “desde cuándo”?'), options: ['как долго', 'с какого момента'], correctIndex: 0, thenReturnToExerciseId: 'duration_contrast_002' },
      { id: 'guided_duration_004', prompt: tri('2019 - это “как долго” или “с какого момента”?', '2019 - це “як довго” чи “з якого моменту”?', '2019 es “cuánto tiempo” o “desde cuándo”?'), options: ['как долго', 'с какого момента'], correctIndex: 1, thenReturnToExerciseId: 'duration_contrast_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'preposition',
    microDiagnosisId: 'preposition_duration_for_since',
    diagnosisLabel: tri('For / Since: длительность и старт', 'For / Since: тривалість і старт', 'For / Since: duración e inicio'),
    contrastSet: ['for', 'since'],
    focusWords: ['for', 'since'],
    focusPatterns: ['duration_for', 'start_point_since', 'present_perfect_duration_for', 'present_perfect_start_since', 'since_clause', 'for_vs_in_future', 'mixed_for_since_pair'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_preposition_duration_for_since_start',
    answer: 'diagnosis_training_preposition_duration_for_since_answer',
    mastery: 'diagnosis_training_preposition_duration_for_since_mastery',
    fallback: 'diagnosis_training_preposition_duration_for_since_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'preposition', microDiagnosisId: 'preposition_duration_for_since', contrastSet: ['for', 'since'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logDurationType: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=preposition&microDiagnosisId=preposition_duration_for_since',
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


