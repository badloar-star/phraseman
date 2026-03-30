// Все тексты интерфейса на двух языках
export type Lang = 'ru' | 'uk';

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
    points:       'Очки',

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
    feedback:       'Предложение или замечание',
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
    feedback:       'Пропозиція або зауваження',
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
    reachTargetBy:   (date: string) => `Ти досягнеш цільового рівня к ${date}`,

    // Онбординг: нагадування
    preferredTime:   'Коли зазвичай вільний?',
    setNotifications: 'Нагадувати мені в {time} кожен день',

    // Онбординг: завершення
    congratulations: 'Вітаємо!',
    onboardingComplete: 'Ти завершив онбординг',
    step:            (n: number, total: number) => `${n} з ${total} кроків`,
  },
} as const;

export type Strings = typeof T['ru'];
