// Все тексты интерфейса (RU/UK — прод; ES — включается в dev, см. ENABLE_SPANISH_LOCALE)
export type Lang = 'ru' | 'uk' | 'es';

export const T = {
  ru: {
    // Табы
    tabLessons:   'Уроки',
    tabQuizzes:   'Квизы',
    tabHallFame:  'Зал славы',
    tabSettings:  'Настройки',

    // Список уроков
    lessonN:      (n: number) => `Урок ${n}`,
    locked:       'Недоступно',

    // Меню урока
    continueLesson:   'Продолжить урок',
    learnWords:       'Учить новые слова',
    learnVerbs:       'Учить формы глаголов',
    lessonDescription:'Описание урока',

    // Урок
    noArticle:  'без артикля',

    oops:       'Ой, ошибся',
    hint:       'Подсказка',
    help:       'Помощь',
    oral:       'Устно',
    next:       'Далее',
    typeAnswer: 'Введите ответ...',

    // Квизы
    selectLevel:  'Выберите уровень',
    easy:         'Легко',
    medium:       'Средне',
    hard:         'Сложно',
    quizDone:     'Квиз завершён!',
    playAgain:    'Пройти снова',
    selectLevel2: 'Выбрать уровень',
    fixErrors:    'Исправь ошибки',
    correct:      'правильно',
    reviewDone:   'Все ошибки исправлены!',

    // Новые слова
    training:     'Тренировка',
    wordList:     'Список слов',
    allLearned:   'Все слова выучены!',
    wordsInLesson:(n: number) => `${n} слов в этом уроке`,

    // Зал славы
    hallOfFame:   'Зал славы',
    noPlayers:    'Пока никого нет.\nПройди квиз и займи место!',
    rank:         'Место',
    player:       'Игрок',
    points:       'Опыт',

    // Настройки
    settings:       'Настройки',
    learningSettings:'Настройки обучения',
    autoCheck:      'Автопроверка',
    autoCheckSub:   'Проверять при наборе последнего слова',
    voiceOut:       'Озвучить ответ',
    voiceOutSub:    'Произносить фразу после ответа',
    autoAdvance:    'Автопереход',
    autoAdvanceSub: 'Переход к следующему тесту при правильном ответе',
    hardMode:       'Сложный режим',
    hardModeSub:    'Ввод предложения вручную с клавиатуры',
    speed:          'Скорость произношения',
    speedHint:      'Отпусти ползунок — прозвучит пример',
    slow:           'Медленно',
    fast:           'Быстро',
    feedback:       'Идеи и предложения',
    helpMenu:       'Помощь',

    // Онбординг
    chooseLanguage: 'Выберите язык',
    enterName:      'Введите ваше имя или никнейм',
    namePlaceholder:'Ваше имя...',
    continueBtn:    'Продолжить',
    nameRequired:   'Введите имя чтобы продолжить',

    // Онбординг: цель
    whyLearnEnglish: 'Зачем ты учишь английский?',
    goalTourism:     'Туризм',
    goalWork:        'Работа',
    goalEmigration:  'Эмиграция',
    goalHobby:       'Хобби',

    // Онбординг: интенсивность
    hoursPerDay:     'Сколько времени в день?',
    min5:            '5 минут',
    min15:           '15 минут',
    min30:           '30 минут',
    min60:           '60+ минут',

    // Онбординг: уровень
    currentLevel:    'Твой текущий уровень?',
    levelA1:         'Начинающий (никогда не учил)',
    levelA2:         'Основы (знаю алфавит)',
    levelB1:         'Среднее (могу разговаривать)',
    levelB2:         'Хорошо (понимаю фильмы)',

    // Онбординг: персональный план
    personalPlan:    'Твой персональный план',
    planForGoal:     (goal: string) => `Цель: Научиться английскому для ${goal}`,
    planIntensity:   (min: number) => `Интенсивность: ${min} минут в день`,
    yourForecast:    'ТВОЙ ПРОГНОЗ:',
    currentLevelLabel: 'Текущий уровень:',
    targetLevelLabel: 'Целевой уровень:',
    timeTillGoal:    'Время до цели:',
    daysEstimate:    (days: number) => `~${days} дней`,
    lessonsCount:    (count: number) => `${count} уроков в твоём темпе`,
    hoursPerWeek:    (hours: number) => `~${hours} часов в неделю обучения`,
    reachTargetBy:   (date: string) => `Ты достигнешь целевого уровня к ${date}`,

    // Онбординг: напоминания
    preferredTime:   'Когда обычно свободен?',
    setNotifications: 'Напоминать мне в {time} каждый день',

    // Онбординг: завершение
    congratulations: 'Поздравляем!',
    onboardingComplete: 'Ты завершил онбординг',
    step:            (n: number, total: number) => `${n} из ${total} шагов`,
  },
  uk: {
    tabLessons:   'Уроки',
    tabQuizzes:   'Квізи',
    tabHallFame:  'Зал слави',
    tabSettings:  'Налаштування',

    lessonN:      (n: number) => `Урок ${n}`,
    locked:       'Недоступно',

    continueLesson:   'Продовжити урок',
    learnWords:       'Вчити нові слова',
    learnVerbs:       'Вчити форми дієслів',
    lessonDescription:'Опис уроку',

    noArticle:  'без артикля',

    oops:       'Ой, помилився',
    hint:       'Підказка',
    help:       'Допомога',
    oral:       'Усно',
    next:       'Далі',
    typeAnswer: 'Введіть відповідь...',

    selectLevel:  'Оберіть рівень',
    easy:         'Легко',
    medium:       'Середньо',
    hard:         'Складно',
    quizDone:     'Квіз завершено!',
    playAgain:    'Пройти знову',
    selectLevel2: 'Обрати рівень',
    fixErrors:    'Виправ помилки',
    correct:      'правильно',
    reviewDone:   'Всі помилки виправлено!',

    training:     'Тренування',
    wordList:     'Список слів',
    allLearned:   'Всі слова вивчено!',
    wordsInLesson:(n: number) => `${n} слів у цьому уроці`,

    hallOfFame:   'Зал слави',
    noPlayers:    'Поки нікого немає.\nПройди квіз та займи місце!',
    rank:         'Місце',
    player:       'Гравець',
    points:       'Бали',

    settings:       'Налаштування',
    learningSettings:'Налаштування навчання',
    autoCheck:      'Автоперевірка',
    autoCheckSub:   'Перевіряти при наборі останнього слова',
    voiceOut:       'Озвучити відповідь',
    voiceOutSub:    'Вимовляти фразу після відповіді',
    autoAdvance:    'Автоперехід',
    autoAdvanceSub: 'Перехід до наступного тесту при правильній відповіді',
    hardMode:       'Складний режим',
    hardModeSub:    'Введення речення вручну з клавіатури',
    speed:          'Швидкість вимови',
    speedHint:      'Відпусти повзунок — прозвучить приклад',
    slow:           'Повільно',
    fast:           'Швидко',
    feedback:       'Ідеї й пропозиції',
    helpMenu:       'Допомога',

    chooseLanguage: 'Оберіть мову',
    enterName:      'Введіть ваше ім\'я або нікнейм',
    namePlaceholder:'Ваше ім\'я...',
    continueBtn:    'Продовжити',
    nameRequired:   'Введіть ім\'я щоб продовжити',

    // Онбординг: цель
    whyLearnEnglish: 'Навіщо ти вчиш англійську?',
    goalTourism:     'Туризм',
    goalWork:        'Робота',
    goalEmigration:  'Еміграція',
    goalHobby:       'Хобі',

    // Онбординг: інтенсивність
    hoursPerDay:     'Скільки часу на день?',
    min5:            '5 хвилин',
    min15:           '15 хвилин',
    min30:           '30 хвилин',
    min60:           '60+ хвилин',

    // Онбординг: рівень
    currentLevel:    'Твій поточний рівень?',
    levelA1:         'Початківець (ніколи не вчив)',
    levelA2:         'Основи (знаю абетку)',
    levelB1:         'Середній (можу розмовляти)',
    levelB2:         'Добре (розумію фільми)',

    // Онбординг: персональний план
    personalPlan:    'Твій персональний план',
    planForGoal:     (goal: string) => `Ціль: Навчитися англійської для ${goal}`,
    planIntensity:   (min: number) => `Інтенсивність: ${min} хвилин на день`,
    yourForecast:    'ТВІЙ ПРОГНОЗ:',
    currentLevelLabel: 'Поточний рівень:',
    targetLevelLabel: 'Цільовий рівень:',
    timeTillGoal:    'Час до цілі:',
    daysEstimate:    (days: number) => `~${days} днів`,
    lessonsCount:    (count: number) => `${count} уроків у твоєму темпі`,
    hoursPerWeek:    (hours: number) => `~${hours} годин на тиждень навчання`,
    reachTargetBy:   (date: string) => `Ти досягнеш цільового рівня до ${date}`,

    // Онбординг: нагадування
    preferredTime:   'Коли зазвичай вільний?',
    setNotifications: 'Нагадувати мені в {time} кожен день',

    // Онбординг: завершення
    congratulations: 'Вітаємо!',
    onboardingComplete: 'Ти завершив онбординг',
    step:            (n: number, total: number) => `${n} з ${total} кроків`,
  },
  es: {
    tabLessons:   'Lecciones',
    tabQuizzes:   'Cuestionarios',
    tabHallFame:  'Salón de la fama',
    tabSettings:  'Ajustes',

    lessonN:      (n: number) => `Lección ${n}`,
    locked:       'No disponible',

    continueLesson:   'Continuar la lección',
    learnWords:       'Aprender palabras nuevas',
    learnVerbs:       'Aprender las formas verbales',
    lessonDescription:'Descripción de la lección',

    noArticle:  'sin artículo',

    oops:       'Uy, me equivoqué',
    hint:       'Pista',
    help:       'Ayuda',
    oral:       'En voz alta',
    next:       'Siguiente',
    typeAnswer: 'Escribe tu respuesta...',

    selectLevel:  'Elige el nivel',
    easy:         'Fácil',
    medium:       'Medio',
    hard:         'Difícil',
    quizDone:     '¡Cuestionario terminado!',
    playAgain:    'Intentar de nuevo',
    selectLevel2: 'Elegir otro nivel',
    fixErrors:    'Corrige los errores',
    correct:      'bien',
    reviewDone:   '¡Todos los errores corregidos!',

    training:     'Práctica',
    wordList:     'Lista de palabras',
    allLearned:   '¡Has aprendido todas las palabras!',
    wordsInLesson:(n: number) => `${n} palabras en esta lección`,

    hallOfFame:   'Salón de la fama',
    noPlayers:    'Aún no hay nadie.\n¡Haz un cuestionario y sube en la clasificación!',
    rank:         'Puesto',
    player:       'Jugador',
    points:       'Puntos de experiencia',

    settings:       'Ajustes',
    learningSettings:'Ajustes del aprendizaje',
    autoCheck:      'Comprobación automática',
    autoCheckSub:   'Comprobar al escribir la última palabra',
    voiceOut:       'Leer respuestas en voz alta',
    voiceOutSub:    'La app reproduce la frase después de responder',
    autoAdvance:    'Siguiente automático',
    autoAdvanceSub: 'Pasar a la siguiente pregunta si la respuesta es correcta',
    hardMode:       'Modo teclado',
    hardModeSub:    'Escribir la frase completa con el teclado',
    speed:          'Velocidad de la voz',
    speedHint:      'Suelta el control deslizante para escuchar un ejemplo',
    slow:           'Lenta',
    fast:           'Rápida',
    feedback:       'Comentarios e ideas',
    helpMenu:       'Ayuda',

    chooseLanguage: 'Elige el idioma',
    enterName:      'Escribe tu nombre o apodo',
    namePlaceholder:'Tu nombre...',
    continueBtn:    'Continuar',
    nameRequired:   'Escribe tu nombre para continuar',

    whyLearnEnglish: '¿Para qué estudias inglés?',
    goalTourism:     'el turismo',
    goalWork:        'el trabajo',
    goalEmigration:  'la emigración',
    goalHobby:       'el ocio',

    hoursPerDay:     '¿Cuánto tiempo al día?',
    min5:            '5 minutos',
    min15:           '15 minutos',
    min30:           '30 minutos',
    min60:           '60+ minutos',

    currentLevel:    '¿Cuál es tu nivel ahora mismo?',
    levelA1:         'Principiante (empiezo de cero o casi)',
    levelA2:         'Elemental (léxico básico; lectura con apoyo)',
    levelB1:         'Intermedio (mantengo conversaciones sencillas)',
    levelB2:         'Intermedio alto (comprendo audio auténtico con contexto)',

    personalPlan:    'Tu plan personal',
    planForGoal:     (goal: string) => `Objetivo: mejorar tu inglés para ${goal}`,
    planIntensity:   (min: number) => `Intensidad: ${min} minutos al día`,
    yourForecast:    'Tu proyección:',
    currentLevelLabel: 'Nivel actual:',
    targetLevelLabel: 'Nivel objetivo:',
    timeTillGoal:    'Tiempo hasta el objetivo:',
    daysEstimate:    (days: number) => `~${days} días`,
    lessonsCount:    (count: number) => `${count} lecciones a este ritmo`,
    hoursPerWeek:    (hours: number) => `~${hours} h semanales de estudio`,
    reachTargetBy:   (date: string) => `Prevemos que alcanzarás el nivel objetivo hacia el ${date}`,

    preferredTime:   '¿A qué hora sueles tener un rato libre?',
    setNotifications: 'Avísame cada día a las {time}',

    congratulations: '¡Felicidades!',
    onboardingComplete: 'Has completado la configuración inicial',
    step:            (n: number, total: number) => `${n} de ${total} pasos`,
  },
} as const;

export type Strings = typeof T['ru'];

/** Интерфейс (RU / UK / ES в прод-пакетах). */
export function triLang(lang: Lang, txt: { ru: string; uk: string; es: string }): string {
  if (lang === 'uk') return txt.uk;
  if (lang === 'es') return txt.es;
  return txt.ru;
}

/** Ключ строк в `T` для текущего языка интерфейса (RU / UK / ES). */
export function legacyRuUk(lang: Lang): 'ru' | 'uk' | 'es' {
  if (lang === 'uk') return 'uk';
  if (lang === 'es') return 'es';
  return 'ru';
}

/** Пакеты UI с полными строками RU / UK / ES (магазин осколков, paywall и т.д.). */
export type UiBundleLang = 'ru' | 'uk' | 'es';

export function bundleLang(lang: Lang): UiBundleLang {
  if (lang === 'uk') return 'uk';
  if (lang === 'es') return 'es';
  return 'ru';
}
