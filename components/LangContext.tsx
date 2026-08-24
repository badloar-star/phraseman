import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { coerceInterfaceLang, getDeviceBootstrapLocale, isInterfaceLangEnabled, type Lang } from '../constants/i18n';
import { emitDevStudyTargetChanged, resetDevStudyTargetForSpanishUi } from '../app/study_target_lang_dev';
import { peekAppLang, writePeekAppLang } from '../app/app_snapshot_bootstrap';
import { persistPortablePreference, readPortablePreference } from '../app/phone_state_preference_bridge';

export type { Lang };
const RU = {
  tabs: {
    home: 'Главная', lessons: 'Уроки', flashcards: 'Карточки',
    settings: 'Настройки',
  },
  home: {
    greeting: (n: string) => `${n}`,
    greetingPrefix: (g: string) => g,
    sub: 'Продолжим сегодня?',
    streakLabel: 'Цепочка',
    streakDays: 'дней подряд',
    continueBtn: 'Продолжить',
    startBtn: 'Начать',
    leagueLabel: 'Клуб недели',
    testBtn: 'Тест знаний',
    testSub: 'Узнай уровень',
    examBtn: 'Финальный экзамен',
    attestTile: 'Аттестация',
    statsCardTitle: 'Статистика',
    statsPulseHint: 'Нажми сюда, чтобы увидеть больше',
  },
  lessonMenu: {
    start: 'Начать урок',
    continue: 'Продолжить урок',
    vocab: 'Словарь',
    verbs: 'Неправильные формы глаголов',
    theory: 'Теория',
    fromScratch: 'Начинаем с нуля',
    wordsOfLesson: 'Слова этого урока',
    verbsOfLesson: 'Только неправильные формы',
    theoryOfLesson: 'Грамматика и правила',
  },
  lesson: {
    undo: 'Отменить', cheat: 'Шпаргалка', theory: 'Теория',
    oral: 'Устно', next: 'Далее', check: 'Проверить',
    typeHere: 'Введи ответ...', listenTitle: 'Слушаю...',
    noArticle: 'без артикля',
    hintAfterWrong: 'Подсказка после ошибки',
  },
  lessonComplete: {
    title: 'Урок завершён!',
    subtitle: (n: number) => `Урок ${n} пройден на 100%`,
    bonus: '+500 XP',
    rest: 'Сделай небольшой перерыв — ты заслужил.',
    nextLesson: 'Следующий урок',
    repeatLesson: 'Повторить урок',
    shareResult: 'Поделиться результатом',
    backHome: 'На главную',
  },
  leagues: [
    { name: 'Искатель',    min: 0 },
    { name: 'Знаток',      min: 100 },
    { name: 'Эрудит',      min: 300 },
    { name: 'Оратор',      min: 700 },
    { name: 'Острое перо', min: 1500 },
    { name: 'Профессор',   min: 3000 },
  ],
  settings: {
    title: 'Настройки', profile: 'Профиль',
    name: 'Имя / никнейм', nameSub: (n: string) => n || 'Не задано',
    lang: 'Язык интерфейса', appearance: 'Внешний вид',
    theme: 'Тема', themeDark: 'Тёмная', themeLight: 'Светлая',
    learning: 'Обучение', learnSet: 'Настройки обучения',
    help: 'Помощь',
    premium: 'Plus', premiumSub: 'Уроки, лимиты и практика — по подписке',
    changeName: 'Изменить имя', cancel: 'Отмена', save: 'Сохранить',
    nameError: 'Введи имя', namePlaceholder: 'Введи имя...',
  },
  edu: {
    title: 'Настройки обучения',
    autoCheck: 'Автопроверка', autoCheckSub: 'Проверять при наборе последнего слова',
    autoAdvance: 'Автопереход после ответа', autoAdvanceSub: 'Автоматически переходить при правильном ответе',
    hardMode: 'Ввод с клавиатуры', hardModeSub: 'Вводить предложение вручную',
    speed: 'Скорость произношения', speedHint: 'Отпусти ползунок — прозвучит пример',
    speedSlowLabel: 'Медленно', speedFastLabel: 'Быстро',
    haptics: 'Вибрация при ошибке',
    hapticsSub: 'Тактильный сигнал при неправильном ответе',
    hintsAfterAnswer: 'Подсказки после ответа',
    hintsAfterAnswerSub: 'Показывать карточки с объяснением после каждого ответа',
  },
  words: {
    title: (n: number) => `${n}. Словарь`,
    training: 'Тренировка', wordList: 'Список слов',
    listStartTraining: 'Начать тренировку',
    allLearned: 'Все слова выучены!',
    learnedOf: (a: number, b: number) => `${a} / ${b} выучено`,
    plusPoints: (n: number) => `+${n} опыта`,
  },
  verbs: {
    title: (n: number) => `${n}. Формы глаголов`,
    training: 'Тренировка', list: 'Список',
    base: 'Основа', past: 'Past Simple', pp: 'Past Participle', tr: 'Перевод',
    guessPast: 'Past Simple от:', guessPP: 'Past Participle от:',
    done: 'Тренировка завершена!', repeat: 'Повторить',
  },
  diagnostic: {
    title: 'Диагностика уровня',
    prevResult: 'Твой последний результат',
    examReadinessTitle: 'Готовность к экзамену',
    start: 'Тест уровня английского',
    startTest: 'Начать тест',
    yourLevel: 'Ориентир по уровню',
    currentEnglishLevelTitle: 'Твой текущий уровень английского',
    currentEnglishLevelHintBeforeTest:
      'Пройди тест, чтобы узнать свой уровень.',
    correct: 'Верных ответов',
    skipped: (n: number) => `Пропущено (таймер): ${n}`,
    again: 'Пройти ещё раз',
    backHome: 'На главную',
    timeUp: 'Время вышло — вопрос пропущен',
    points: (n: number) => `+${n} опыта`,
    unlockedTitle: 'Рекомендация по старту',
    unlockedRec:
      'Тест показал примерный уровень. Начни с подходящих тем в курсе или повтори базу, если хочешь закрепить материал.',
  },
  onboarding: {
    chooseLang: 'Выбери язык',
    enterName: 'Введи своё имя или никнейм',
    placeholder: 'Твоё имя...',
    next: 'Продолжить',
    nameError: 'Введи имя, чтобы продолжить',
  },
  premium: {
    locked: 'Plus открывает уроки после A1',
    freeCont: 'Продолжить бесплатно (Урок 1)',
    cta: 'Получить Plus',
    ctaSub: 'Оформить подписку',
    legal: 'Отмена в любое время в настройках App Store / Google Play.',
    features: ['Уроки после A1','Голосовой ввод','Подробная статистика'],
  },
};

const UK: typeof RU = {
  tabs: {
    home: 'Головна', lessons: 'Уроки', flashcards: 'Картки',
    settings: 'Налаштування',
  },
  home: {
    greeting: (n: string) => `${n}`,
    greetingPrefix: (g: string) => g,
    sub: 'Продовжимо сьогодні?',
    streakLabel: 'Ланцюжок',
    streakDays: 'днів поспіль',
    continueBtn: 'Продовжити',
    startBtn: 'Почати',
    leagueLabel: 'Клуб тижня',
    testBtn: 'Тест знань',
    testSub: 'Дізнайся рівень',
    examBtn: 'Фінальний іспит',
    attestTile: 'Атестація',
    statsCardTitle: 'Статистика',
    statsPulseHint: 'Натисни сюди, щоб побачити більше',
  },
  lessonMenu: {
    start: 'Почати урок',
    continue: 'Продовжити урок',
    vocab: 'Словник',
    verbs: 'Неправильні форми дієслів',
    theory: 'Теорія',
    fromScratch: 'Починаємо з нуля',
    wordsOfLesson: 'Слова цього уроку',
    verbsOfLesson: 'Тільки неправильні форми',
    theoryOfLesson: 'Граматика та правила',
  },
  lesson: {
    undo: 'Скасувати', cheat: 'Шпаргалка', theory: 'Теорія',
    oral: 'Усно', next: 'Далі', check: 'Перевірити',
    typeHere: 'Введіть відповідь...', listenTitle: 'Слухаю...',
    noArticle: 'без артикля',
    hintAfterWrong: 'Підказка після помилки',
  },
  lessonComplete: {
    title: 'Урок завершено!',
    subtitle: (n: number) => `Урок ${n} пройдено на 100%`,
    bonus: '+500 XP',
    rest: 'Зроби невелику перерву — ти заслужив.',
    nextLesson: 'Наступний урок',
    repeatLesson: 'Пройти знову',
    shareResult: 'Поділитися результатом',
    backHome: 'На головну',
  },
  leagues: [
    { name: 'Шукач',       min: 0 },
    { name: 'Знавець',     min: 100 },
    { name: 'Ерудит',      min: 300 },
    { name: 'Оратор',      min: 700 },
    { name: 'Гостре перо', min: 1500 },
    { name: 'Професор',    min: 3000 },
  ],
  settings: {
    title: 'Налаштування', profile: 'Профіль',
    name: 'Ім\'я / нікнейм', nameSub: (n: string) => n || 'Не вказано',
    lang: 'Мова інтерфейсу', appearance: 'Зовнішній вигляд',
    theme: 'Тема', themeDark: 'Темна', themeLight: 'Світла',
    learning: 'Навчання', learnSet: 'Налаштування навчання',
    help: 'Допомога',
    premium: 'Plus', premiumSub: 'Уроки, ліміти й практика — за підпискою',
    changeName: 'Змінити ім\'я', cancel: 'Скасувати', save: 'Зберегти',
    nameError: 'Введіть ім\'я', namePlaceholder: 'Введіть ім\'я...',
  },
  edu: {
    title: 'Налаштування навчання',
    autoCheck: 'Автоперевірка', autoCheckSub: 'Перевіряти при наборі останнього слова',
    autoAdvance: 'Автоперехід після відповіді', autoAdvanceSub: 'Автоматично переходити при правильній відповіді',
    hardMode: 'Введення з клавіатури', hardModeSub: 'Вводити речення вручну',
    speed: 'Швидкість вимови', speedHint: 'Відпусти повзунок — пролунає приклад',
    speedSlowLabel: 'Повільно', speedFastLabel: 'Швидко',
    haptics: 'Вібрація при помилці',
    hapticsSub: 'Тактильний сигнал при неправильній відповіді',
    hintsAfterAnswer: 'Підказки після відповіді',
    hintsAfterAnswerSub: 'Показувати картки з поясненням після кожної відповіді',
  },
  words: {
    title: (n: number) => `${n}. Словник`,
    training: 'Тренування', wordList: 'Список слів',
    listStartTraining: 'Почати тренування',
    allLearned: 'Всі слова вивчено!',
    learnedOf: (a: number, b: number) => `${a} / ${b} вивчено`,
    plusPoints: (n: number) => `+${n} досвіду`,
  },
  verbs: {
    title: (n: number) => `${n}. Форми дієслів`,
    training: 'Тренування', list: 'Список',
    base: 'Основа', past: 'Past Simple', pp: 'Past Participle', tr: 'Переклад',
    guessPast: 'Past Simple від:', guessPP: 'Past Participle від:',
    done: 'Тренування завершено!', repeat: 'Повторити',
  },
  diagnostic: {
    title: 'Діагностика рівня',
    prevResult: 'Ваш останній результат',
    examReadinessTitle: 'Готовність до іспиту',
    start: 'Тест рівня англійської',
    startTest: 'Почати тест',
    yourLevel: 'Орієнтир за рівнем',
    currentEnglishLevelTitle: 'Ваш поточний рівень англійської',
    currentEnglishLevelHintBeforeTest:
      'Пройдіть тест, щоб дізнатися свій рівень.',
    correct: 'Правильних відповідей',
    skipped: (n: number) => `Пропущено (таймер): ${n}`,
    again: 'Пройти ще раз',
    backHome: 'На головну',
    timeUp: 'Час вийшов — питання пропущено',
    points: (n: number) => `+${n} досвіду`,
    unlockedTitle: 'Рекомендація для старту',
    unlockedRec:
      'Тест показав орієнтовний рівень. Почни з відповідних тем у курсі або повтори базу, якщо хочеш закріпити матеріал.',
  },
  onboarding: {
    chooseLang: 'Оберіть мову',
    enterName: 'Введіть ваше ім\'я або нікнейм',
    placeholder: 'Ваше ім\'я...',
    next: 'Продовжити',
    nameError: 'Введіть ім\'я щоб продовжити',
  },
  premium: {
    locked: 'Plus відкриває уроки після перших 3',
    freeCont: 'Продовжити безкоштовно (Урок 1)',
    cta: 'Отримати Plus',
    ctaSub: 'Оформити підписку',
    legal: 'Скасування будь-коли в налаштуваннях App Store / Google Play.',
    features: ['Уроки після перших 3','Голосове введення','Докладна статистика'],
  },
};

const ES: typeof RU = {
  tabs: {
    home: 'Inicio', lessons: 'Lecciones', flashcards: 'Tarjetas',
    settings: 'Ajustes',
  },
  home: {
    greeting: (n: string) => `${n}`,
    greetingPrefix: (g: string) => g,
    sub: '¿Seguimos hoy?',
    streakLabel: 'Racha',
    streakDays: 'días seguidos',
    continueBtn: 'Continuar',
    startBtn: 'Empezar',
    leagueLabel: 'Club semanal',
    testBtn: 'Test de conocimientos',
    testSub: 'Descubre tu nivel',
    examBtn: 'Examen final',
    attestTile: 'Evaluación',
    statsCardTitle: 'Estadísticas',
    statsPulseHint: 'Toca aquí para ver más',
  },
  lessonMenu: {
    start: 'Empezar la lección',
    continue: 'Continuar la lección',
    vocab: 'Vocabulario',
    verbs: 'Formas verbales irregulares',
    theory: 'Teoría',
    fromScratch: 'Empezamos desde cero',
    wordsOfLesson: 'Palabras de esta lección',
    verbsOfLesson: 'Solo formas irregulares',
    theoryOfLesson: 'Gramática y reglas',
  },
  lesson: {
    undo: 'Deshacer', cheat: 'Guía rápida', theory: 'Teoría',
    oral: 'En voz alta', next: 'Siguiente', check: 'Comprobar',
    typeHere: 'Escribe tu respuesta...', listenTitle: 'Escuchando...',
    noArticle: 'sin artículo',
    hintAfterWrong: 'Pista tras un error',
  },
  lessonComplete: {
    title: '¡Lección completada!',
    subtitle: (n: number) => `Has completado la lección ${n} al 100 %`,
    bonus: '+500 XP',
    rest: 'Tómate un descanso: te lo mereces.',
    nextLesson: 'Siguiente lección',
    repeatLesson: 'Repetir lección',
    shareResult: 'Compartir resultado',
    backHome: 'Volver al inicio',
  },
  leagues: [
    { name: 'Explorador',    min: 0 },
    { name: 'Experto',       min: 100 },
    { name: 'Erudito',       min: 300 },
    { name: 'Orador',        min: 700 },
    { name: 'Pluma de oro',  min: 1500 },
    { name: 'Profesor',      min: 3000 },
  ],
  settings: {
    title: 'Ajustes', profile: 'Perfil',
    name: 'Nombre / apodo público', nameSub: (n: string) => n || 'No indicado',
    lang: 'Idioma de la interfaz', appearance: 'Apariencia',
    theme: 'Tema', themeDark: 'Oscuro', themeLight: 'Claro',
    learning: 'Aprendizaje', learnSet: 'Ajustes del aprendizaje',
    help: 'Ayuda',
    premium: 'Plus', premiumSub: 'Lecciones, límites y práctica — con suscripción',
    changeName: 'Cambiar nombre', cancel: 'Cancelar', save: 'Guardar',
    nameError: 'Escribe un nombre', namePlaceholder: 'Tu nombre...',
  },
  edu: {
    title: 'Ajustes del aprendizaje',
    autoCheck: 'Comprobación automática', autoCheckSub: 'Comprobar al escribir la última palabra',
    autoAdvance: 'Siguiente automático', autoAdvanceSub: 'Pasar a la siguiente pregunta si la respuesta es correcta',
    hardMode: 'Modo teclado', hardModeSub: 'Escribir la frase completa con el teclado',
    speed: 'Velocidad de la voz', speedHint: 'Suelta el control deslizante para escuchar un ejemplo',
    speedSlowLabel: 'Despacio', speedFastLabel: 'Rápido',
    haptics: 'Vibración al fallar',
    hapticsSub: 'Vibración breve cuando la respuesta es incorrecta.',
    hintsAfterAnswer: 'Pistas después de responder',
    hintsAfterAnswerSub: 'Mostrar tarjetas con explicación tras cada respuesta.',
  },
  words: {
    title: (n: number) => `${n}. Vocabulario`,
    training: 'Práctica', wordList: 'Lista de palabras',
    listStartTraining: 'Empieza a practicar',
    allLearned: '¡Has aprendido todas las palabras!',
    learnedOf: (a: number, b: number) => `${a} / ${b} aprendidas`,
    plusPoints: (n: number) => `+${n} XP`,
  },
  verbs: {
    title: (n: number) => `${n}. Formas verbales`,
    training: 'Práctica', list: 'Lista',
    base: 'Forma base', past: 'Past Simple', pp: 'Past Participle', tr: 'Traducción',
    guessPast: 'Past Simple de:', guessPP: 'Past Participle de:',
    done: '¡Práctica terminada!', repeat: 'Repetir',
  },
  diagnostic: {
    title: 'Diagnóstico de nivel',
    prevResult: 'Tu último resultado',
    examReadinessTitle: 'Preparación para el examen',
    start: 'Test de nivel de inglés',
    startTest: 'Empezar el test',
    yourLevel: 'Nivel orientativo',
    currentEnglishLevelTitle: 'Tu nivel actual de inglés',
    currentEnglishLevelHintBeforeTest:
      'Haz el test para conocer tu nivel.',
    correct: 'Aciertos',
    skipped: (n: number) => `Omitidas (tiempo): ${n}`,
    again: 'Repetir diagnóstico',
    backHome: 'Volver al inicio',
    timeUp: 'Tiempo agotado: pregunta omitida',
    points: (n: number) => `+${n} XP`,
    unlockedTitle: 'Recomendacion de inicio',
    unlockedRec:
      'El test muestra un nivel aproximado. Empieza con los temas adecuados del curso o repasa la base si quieres reforzarla.',
  },
  onboarding: {
    chooseLang: 'Elige el idioma',
    enterName: 'Escribe tu nombre o apodo',
    placeholder: 'Tu nombre...',
    next: 'Continuar',
    nameError: 'Escribe tu nombre para continuar',
  },
  premium: {
    locked: 'Plus abre las lecciones después de las 3 primeras',
    freeCont: 'Seguir gratis (Lección 1)',
    cta: 'Obtener Plus',
    ctaSub: 'Contratar suscripción',
    legal: 'Puedes cancelar cuando quieras desde los ajustes de App Store o Google Play.',
    features: [
      'Lecciones después de las 3 primeras',
      'Respuestas por voz',
      'Estadísticas detalladas',
    ],
  },
};

const PT_BR: typeof RU = {
  tabs: {
    home: 'Início', lessons: 'Lições', flashcards: 'Cartões',
    settings: 'Configurações',
  },
  home: {
    greeting: (n: string) => `${n}`,
    greetingPrefix: (g: string) => g,
    sub: 'Vamos continuar hoje?',
    streakLabel: 'Sequência',
    streakDays: 'dias seguidos',
    continueBtn: 'Continuar',
    startBtn: 'Começar',
    leagueLabel: 'Clube da semana',
    testBtn: 'Teste de conhecimento',
    testSub: 'Descubra seu nível',
    examBtn: 'Exame final',
    attestTile: 'Avaliação',
    statsCardTitle: 'Estatísticas',
    statsPulseHint: 'Toque aqui para ver mais',
  },
  lessonMenu: {
    start: 'Começar lição',
    continue: 'Continuar lição',
    vocab: 'Vocabulário',
    verbs: 'Formas verbais irregulares',
    theory: 'Teoria',
    fromScratch: 'Começamos do zero',
    wordsOfLesson: 'Palavras desta lição',
    verbsOfLesson: 'Só formas irregulares',
    theoryOfLesson: 'Gramática e regras',
  },
  lesson: {
    undo: 'Desfazer', cheat: 'Guia rápido', theory: 'Teoria',
    oral: 'Em voz alta', next: 'Próximo', check: 'Verificar',
    typeHere: 'Digite sua resposta...', listenTitle: 'Ouvindo...',
    noArticle: 'sem artigo',
    hintAfterWrong: 'Dica depois do erro',
  },
  lessonComplete: {
    title: 'Lição concluída!',
    subtitle: (n: number) => `Lição ${n} concluída 100%`,
    bonus: '+500 XP',
    rest: 'Faça uma pequena pausa — você merece.',
    nextLesson: 'Próxima lição',
    repeatLesson: 'Repetir lição',
    shareResult: 'Compartilhar resultado',
    backHome: 'Voltar ao início',
  },
  leagues: [
    { name: 'Explorador', min: 0 },
    { name: 'Conhecedor', min: 100 },
    { name: 'Erudito', min: 300 },
    { name: 'Orador', min: 700 },
    { name: 'Pena afiada', min: 1500 },
    { name: 'Professor', min: 3000 },
  ],
  settings: {
    title: 'Configurações', profile: 'Perfil',
    name: 'Nome / apelido', nameSub: (n: string) => n || 'Não definido',
    lang: 'Idioma da interface', appearance: 'Aparência',
    theme: 'Tema', themeDark: 'Escuro', themeLight: 'Claro',
    learning: 'Estudo', learnSet: 'Configurações de estudo',
    help: 'Ajuda',
    premium: 'Plus', premiumSub: 'Lições, limites e prática — por assinatura',
    changeName: 'Alterar nome', cancel: 'Cancelar', save: 'Salvar',
    nameError: 'Digite um nome', namePlaceholder: 'Digite um nome...',
  },
  edu: {
    title: 'Configurações de estudo',
    autoCheck: 'Correção automática', autoCheckSub: 'Verificar ao digitar a última palavra',
    autoAdvance: 'Avanço automático', autoAdvanceSub: 'Avançar automaticamente quando a resposta estiver correta',
    hardMode: 'Entrada pelo teclado', hardModeSub: 'Digitar a frase manualmente',
    speed: 'Velocidade da voz', speedHint: 'Solte o controle para ouvir um exemplo',
    speedSlowLabel: 'Devagar', speedFastLabel: 'Rápido',
    haptics: 'Vibração ao errar',
    hapticsSub: 'Sinal tátil quando a resposta está incorreta',
    hintsAfterAnswer: 'Dicas após responder',
    hintsAfterAnswerSub: 'Mostrar cartões com explicação depois de cada resposta',
  },
  words: {
    title: (n: number) => `${n}. Vocabulário`,
    training: 'Treino', wordList: 'Lista de palavras',
    listStartTraining: 'Começar treino',
    allLearned: 'Todas as palavras foram aprendidas!',
    learnedOf: (a: number, b: number) => `${a} / ${b} aprendidas`,
    plusPoints: (n: number) => `+${n} XP`,
  },
  verbs: {
    title: (n: number) => `${n}. Formas verbais`,
    training: 'Treino', list: 'Lista',
    base: 'Base', past: 'Past Simple', pp: 'Past Participle', tr: 'Tradução',
    guessPast: 'Past Simple de:', guessPP: 'Past Participle de:',
    done: 'Treino concluído!', repeat: 'Repetir',
  },
  diagnostic: {
    title: 'Diagnóstico de nível',
    prevResult: 'Seu último resultado',
    examReadinessTitle: 'Preparação para o exame',
    start: 'Teste de nível de inglês',
    startTest: 'Começar teste',
    yourLevel: 'Referência de nível',
    currentEnglishLevelTitle: 'Seu nível atual de inglês',
    currentEnglishLevelHintBeforeTest:
      'Faça o teste para conhecer seu nível.',
    correct: 'Respostas corretas',
    skipped: (n: number) => `Puladas (tempo): ${n}`,
    again: 'Fazer de novo',
    backHome: 'Voltar ao início',
    timeUp: 'O tempo acabou — pergunta pulada',
    points: (n: number) => `+${n} XP`,
    unlockedTitle: 'Recomendação de início',
    unlockedRec:
      'O teste mostrou um nível aproximado. Comece pelos temas adequados do curso ou revise a base se quiser reforçar o conteúdo.',
  },
  onboarding: {
    chooseLang: 'Escolha o idioma',
    enterName: 'Digite seu nome ou apelido',
    placeholder: 'Seu nome...',
    next: 'Continuar',
    nameError: 'Digite um nome para continuar',
  },
  premium: {
    locked: 'Plus abre as lições depois do A1',
    freeCont: 'Continuar grátis (Lição 1)',
    cta: 'Obter Plus',
    ctaSub: 'Assinar',
    legal: 'Cancele quando quiser nas configurações da App Store / Google Play.',
    features: ['Lições depois do A1','Entrada por voz','Estatísticas detalhadas'],
  },
};

const VI: typeof RU = {
  tabs: {
    home: 'Trang chủ', lessons: 'Bài học', flashcards: 'Thẻ',
    settings: 'Cài đặt',
  },
  home: {
    greeting: (n: string) => `${n}`,
    greetingPrefix: (g: string) => g,
    sub: 'Hôm nay học tiếp nhé?',
    streakLabel: 'Chuỗi',
    streakDays: 'ngày liên tiếp',
    continueBtn: 'Tiếp tục',
    startBtn: 'Bắt đầu',
    leagueLabel: 'Câu lạc bộ tuần',
    testBtn: 'Kiểm tra kiến thức',
    testSub: 'Biết trình độ của bạn',
    examBtn: 'Bài kiểm tra cuối',
    attestTile: 'Đánh giá',
    statsCardTitle: 'Thống kê',
    statsPulseHint: 'Nhấn vào đây để xem thêm',
  },
  lessonMenu: {
    start: 'Bắt đầu bài học',
    continue: 'Tiếp tục bài học',
    vocab: 'Từ vựng',
    verbs: 'Dạng động từ bất quy tắc',
    theory: 'Lý thuyết',
    fromScratch: 'Bắt đầu từ số không',
    wordsOfLesson: 'Từ của bài này',
    verbsOfLesson: 'Chỉ dạng bất quy tắc',
    theoryOfLesson: 'Ngữ pháp và quy tắc',
  },
  lesson: {
    undo: 'Hoàn tác', cheat: 'Gợi ý nhanh', theory: 'Lý thuyết',
    oral: 'Nói thành tiếng', next: 'Tiếp theo', check: 'Kiểm tra',
    typeHere: 'Nhập câu trả lời...', listenTitle: 'Đang nghe...',
    noArticle: 'không có mạo từ',
    hintAfterWrong: 'Gợi ý sau lỗi sai',
  },
  lessonComplete: {
    title: 'Đã hoàn thành bài học!',
    subtitle: (n: number) => `Bạn đã hoàn thành 100% bài ${n}`,
    bonus: '+500 XP',
    rest: 'Nghỉ một chút đi — bạn xứng đáng.',
    nextLesson: 'Bài tiếp theo',
    repeatLesson: 'Làm lại bài học',
    shareResult: 'Chia sẻ kết quả',
    backHome: 'Về trang chủ',
  },
  leagues: [
    { name: 'Người khám phá', min: 0 },
    { name: 'Người hiểu biết', min: 100 },
    { name: 'Học giả', min: 300 },
    { name: 'Diễn giả', min: 700 },
    { name: 'Ngòi bút sắc', min: 1500 },
    { name: 'Giáo sư', min: 3000 },
  ],
  settings: {
    title: 'Cài đặt', profile: 'Hồ sơ',
    name: 'Tên / biệt danh', nameSub: (n: string) => n || 'Chưa đặt',
    lang: 'Ngôn ngữ giao diện', appearance: 'Giao diện',
    theme: 'Chủ đề', themeDark: 'Tối', themeLight: 'Sáng',
    learning: 'Học tập', learnSet: 'Cài đặt học tập',
    help: 'Trợ giúp',
    premium: 'Plus', premiumSub: 'Bài học, giới hạn và luyện tập — theo gói đăng ký',
    changeName: 'Đổi tên', cancel: 'Hủy', save: 'Lưu',
    nameError: 'Nhập tên', namePlaceholder: 'Nhập tên...',
  },
  edu: {
    title: 'Cài đặt học tập',
    autoCheck: 'Tự động kiểm tra', autoCheckSub: 'Kiểm tra khi nhập từ cuối cùng',
    autoAdvance: 'Tự động chuyển sau khi trả lời', autoAdvanceSub: 'Tự chuyển khi câu trả lời đúng',
    hardMode: 'Nhập bằng bàn phím', hardModeSub: 'Tự nhập câu thủ công',
    speed: 'Tốc độ phát âm', speedHint: 'Thả thanh trượt để nghe ví dụ',
    speedSlowLabel: 'Chậm', speedFastLabel: 'Nhanh',
    haptics: 'Rung khi sai',
    hapticsSub: 'Phản hồi rung khi câu trả lời sai',
    hintsAfterAnswer: 'Gợi ý sau câu trả lời',
    hintsAfterAnswerSub: 'Hiển thị thẻ giải thích sau mỗi câu trả lời',
  },
  words: {
    title: (n: number) => `${n}. Từ vựng`,
    training: 'Luyện tập', wordList: 'Danh sách từ',
    listStartTraining: 'Bắt đầu luyện tập',
    allLearned: 'Đã học hết các từ!',
    learnedOf: (a: number, b: number) => `${a} / ${b} đã học`,
    plusPoints: (n: number) => `+${n} XP`,
  },
  verbs: {
    title: (n: number) => `${n}. Dạng động từ`,
    training: 'Luyện tập', list: 'Danh sách',
    base: 'Dạng gốc', past: 'Past Simple', pp: 'Past Participle', tr: 'Dịch',
    guessPast: 'Past Simple của:', guessPP: 'Past Participle của:',
    done: 'Đã hoàn thành luyện tập!', repeat: 'Làm lại',
  },
  diagnostic: {
    title: 'Chẩn đoán trình độ',
    prevResult: 'Kết quả gần nhất của bạn',
    examReadinessTitle: 'Sẵn sàng cho bài kiểm tra',
    start: 'Kiểm tra trình độ tiếng Anh',
    startTest: 'Bắt đầu kiểm tra',
    yourLevel: 'Mốc trình độ',
    currentEnglishLevelTitle: 'Trình độ tiếng Anh hiện tại của bạn',
    currentEnglishLevelHintBeforeTest:
      'Làm bài kiểm tra để biết trình độ của bạn.',
    correct: 'Câu trả lời đúng',
    skipped: (n: number) => `Bỏ qua (hết giờ): ${n}`,
    again: 'Làm lại',
    backHome: 'Về trang chủ',
    timeUp: 'Hết giờ — câu hỏi bị bỏ qua',
    points: (n: number) => `+${n} XP`,
    unlockedTitle: 'Gợi ý bắt đầu',
    unlockedRec:
      'Bài kiểm tra cho thấy trình độ gần đúng. Hãy bắt đầu với chủ đề phù hợp trong khóa học hoặc ôn lại nền tảng nếu muốn củng cố.',
  },
  onboarding: {
    chooseLang: 'Chọn ngôn ngữ',
    enterName: 'Nhập tên hoặc biệt danh',
    placeholder: 'Tên của bạn...',
    next: 'Tiếp tục',
    nameError: 'Nhập tên để tiếp tục',
  },
  premium: {
    locked: 'Plus mở các bài sau A1',
    freeCont: 'Tiếp tục miễn phí (Bài 1)',
    cta: 'Nhận Plus',
    ctaSub: 'Đăng ký',
    legal: 'Có thể hủy bất cứ lúc nào trong cài đặt App Store / Google Play.',
    features: ['Bài học sau A1','Nhập bằng giọng nói','Thống kê chi tiết'],
  },
};

const ID: typeof RU = {
  tabs: {
    home: 'Beranda', lessons: 'Pelajaran', flashcards: 'Kartu',
    settings: 'Pengaturan',
  },
  home: {
    greeting: (n: string) => `${n}`,
    greetingPrefix: (g: string) => g,
    sub: 'Lanjut hari ini?',
    streakLabel: 'Streak',
    streakDays: 'hari beruntun',
    continueBtn: 'Lanjutkan',
    startBtn: 'Mulai',
    leagueLabel: 'Klub minggu ini',
    testBtn: 'Tes pengetahuan',
    testSub: 'Cari tahu levelmu',
    examBtn: 'Ujian akhir',
    attestTile: 'Evaluasi',
    statsCardTitle: 'Statistik',
    statsPulseHint: 'Ketuk di sini untuk melihat lebih banyak',
  },
  lessonMenu: {
    start: 'Mulai pelajaran',
    continue: 'Lanjutkan pelajaran',
    vocab: 'Kosakata',
    verbs: 'Bentuk kata kerja tidak beraturan',
    theory: 'Teori',
    fromScratch: 'Mulai dari nol',
    wordsOfLesson: 'Kata di pelajaran ini',
    verbsOfLesson: 'Hanya bentuk tidak beraturan',
    theoryOfLesson: 'Tata bahasa dan aturan',
  },
  lesson: {
    undo: 'Urungkan', cheat: 'Panduan cepat', theory: 'Teori',
    oral: 'Lisan', next: 'Berikutnya', check: 'Periksa',
    typeHere: 'Ketik jawaban...', listenTitle: 'Mendengarkan...',
    noArticle: 'tanpa artikel',
    hintAfterWrong: 'Petunjuk setelah salah',
  },
  lessonComplete: {
    title: 'Pelajaran selesai!',
    subtitle: (n: number) => `Pelajaran ${n} selesai 100%`,
    bonus: '+500 XP',
    rest: 'Istirahat sebentar — kamu pantas mendapatkannya.',
    nextLesson: 'Pelajaran berikutnya',
    repeatLesson: 'Ulangi pelajaran',
    shareResult: 'Bagikan hasil',
    backHome: 'Ke beranda',
  },
  leagues: [
    { name: 'Pencari', min: 0 },
    { name: 'Ahli', min: 100 },
    { name: 'Cendekia', min: 300 },
    { name: 'Orator', min: 700 },
    { name: 'Pena tajam', min: 1500 },
    { name: 'Profesor', min: 3000 },
  ],
  settings: {
    title: 'Pengaturan', profile: 'Profil',
    name: 'Nama / nama panggilan', nameSub: (n: string) => n || 'Belum diatur',
    lang: 'Bahasa antarmuka', appearance: 'Tampilan',
    theme: 'Tema', themeDark: 'Gelap', themeLight: 'Terang',
    learning: 'Belajar', learnSet: 'Pengaturan belajar',
    help: 'Bantuan',
    premium: 'Plus', premiumSub: 'Pelajaran, batas, dan latihan — lewat langganan',
    changeName: 'Ubah nama', cancel: 'Batal', save: 'Simpan',
    nameError: 'Masukkan nama', namePlaceholder: 'Masukkan nama...',
  },
  edu: {
    title: 'Pengaturan belajar',
    autoCheck: 'Periksa otomatis', autoCheckSub: 'Periksa saat mengetik kata terakhir',
    autoAdvance: 'Lanjut otomatis setelah menjawab', autoAdvanceSub: 'Otomatis lanjut jika jawaban benar',
    hardMode: 'Input keyboard', hardModeSub: 'Ketik kalimat secara manual',
    speed: 'Kecepatan pengucapan', speedHint: 'Lepaskan slider untuk mendengar contoh',
    speedSlowLabel: 'Lambat', speedFastLabel: 'Cepat',
    haptics: 'Getar saat salah',
    hapticsSub: 'Sinyal sentuh saat jawaban salah',
    hintsAfterAnswer: 'Petunjuk setelah menjawab',
    hintsAfterAnswerSub: 'Tampilkan kartu penjelasan setelah setiap jawaban',
  },
  words: {
    title: (n: number) => `${n}. Kosakata`,
    training: 'Latihan', wordList: 'Daftar kata',
    listStartTraining: 'Mulai latihan',
    allLearned: 'Semua kata sudah dipelajari!',
    learnedOf: (a: number, b: number) => `${a} / ${b} dipelajari`,
    plusPoints: (n: number) => `+${n} XP`,
  },
  verbs: {
    title: (n: number) => `${n}. Bentuk kata kerja`,
    training: 'Latihan', list: 'Daftar',
    base: 'Dasar', past: 'Past Simple', pp: 'Past Participle', tr: 'Terjemahan',
    guessPast: 'Past Simple dari:', guessPP: 'Past Participle dari:',
    done: 'Latihan selesai!', repeat: 'Ulangi',
  },
  diagnostic: {
    title: 'Diagnosis level',
    prevResult: 'Hasil terakhirmu',
    examReadinessTitle: 'Kesiapan ujian',
    start: 'Tes level bahasa Inggris',
    startTest: 'Mulai tes',
    yourLevel: 'Acuan level',
    currentEnglishLevelTitle: 'Level bahasa Inggris kamu saat ini',
    currentEnglishLevelHintBeforeTest:
      'Ikuti tes untuk mengetahui levelmu.',
    correct: 'Jawaban benar',
    skipped: (n: number) => `Dilewati (timer): ${n}`,
    again: 'Coba lagi',
    backHome: 'Ke beranda',
    timeUp: 'Waktu habis — pertanyaan dilewati',
    points: (n: number) => `+${n} XP`,
    unlockedTitle: 'Rekomendasi awal',
    unlockedRec:
      'Tes menunjukkan level perkiraan. Mulailah dari topik yang sesuai di kursus atau ulangi dasar jika ingin memperkuat materi.',
  },
  onboarding: {
    chooseLang: 'Pilih bahasa',
    enterName: 'Masukkan nama atau nama panggilan',
    placeholder: 'Nama kamu...',
    next: 'Lanjutkan',
    nameError: 'Masukkan nama untuk melanjutkan',
  },
  premium: {
    locked: 'Plus membuka pelajaran setelah A1',
    freeCont: 'Lanjut gratis (Pelajaran 1)',
    cta: 'Dapatkan Plus',
    ctaSub: 'Ambil langganan',
    legal: 'Batalkan kapan saja di pengaturan App Store / Google Play.',
    features: ['Pelajaran setelah A1','Input suara','Statistik detail'],
  },
};

const TR: typeof RU = {
  tabs: {
    home: 'Ana sayfa', lessons: 'Dersler', flashcards: 'Kartlar',
    settings: 'Ayarlar',
  },
  home: {
    greeting: (n: string) => `${n}`,
    greetingPrefix: (g: string) => g,
    sub: 'Bugün devam edelim mi?',
    streakLabel: 'Seri',
    streakDays: 'gün üst üste',
    continueBtn: 'Devam et',
    startBtn: 'Başla',
    leagueLabel: 'Haftanın kulübü',
    testBtn: 'Bilgi testi',
    testSub: 'Seviyeni öğren',
    examBtn: 'Final sınavı',
    attestTile: 'Değerlendirme',
    statsCardTitle: 'İstatistikler',
    statsPulseHint: 'Daha fazlasını görmek için buraya dokun',
  },
  lessonMenu: {
    start: 'Dersi başlat',
    continue: 'Derse devam et',
    vocab: 'Sözlük',
    verbs: 'Düzensiz fiil biçimleri',
    theory: 'Teori',
    fromScratch: 'Sıfırdan başlıyoruz',
    wordsOfLesson: 'Bu dersin kelimeleri',
    verbsOfLesson: 'Sadece düzensiz biçimler',
    theoryOfLesson: 'Dil bilgisi ve kurallar',
  },
  lesson: {
    undo: 'Geri al', cheat: 'Hızlı rehber', theory: 'Teori',
    oral: 'Sesli', next: 'Sonraki', check: 'Kontrol et',
    typeHere: 'Cevabını yaz...', listenTitle: 'Dinliyorum...',
    noArticle: 'articlesız',
    hintAfterWrong: 'Hatadan sonra ipucu',
  },
  lessonComplete: {
    title: 'Ders tamamlandı!',
    subtitle: (n: number) => `Ders ${n} %100 tamamlandı`,
    bonus: '+500 XP',
    rest: 'Kısa bir mola ver — hak ettin.',
    nextLesson: 'Sonraki ders',
    repeatLesson: 'Dersi tekrar et',
    shareResult: 'Sonucu paylaş',
    backHome: 'Ana sayfaya dön',
  },
  leagues: [
    { name: 'Arayıcı', min: 0 },
    { name: 'Uzman', min: 100 },
    { name: 'Bilgin', min: 300 },
    { name: 'Hatip', min: 700 },
    { name: 'Keskin kalem', min: 1500 },
    { name: 'Profesör', min: 3000 },
  ],
  settings: {
    title: 'Ayarlar', profile: 'Profil',
    name: 'Ad / takma ad', nameSub: (n: string) => n || 'Ayarlanmadı',
    lang: 'Arayüz dili', appearance: 'Görünüm',
    theme: 'Tema', themeDark: 'Koyu', themeLight: 'Açık',
    learning: 'Öğrenme', learnSet: 'Öğrenme ayarları',
    help: 'Yardım',
    premium: 'Plus', premiumSub: 'Dersler, limitler ve pratik — abonelikle',
    changeName: 'Adı değiştir', cancel: 'İptal', save: 'Kaydet',
    nameError: 'Ad gir', namePlaceholder: 'Adını gir...',
  },
  edu: {
    title: 'Öğrenme ayarları',
    autoCheck: 'Otomatik kontrol', autoCheckSub: 'Son kelime yazılınca kontrol et',
    autoAdvance: 'Cevaptan sonra otomatik geçiş', autoAdvanceSub: 'Doğru cevapta otomatik olarak devam et',
    hardMode: 'Klavye girişi', hardModeSub: 'Cümleyi elle yaz',
    speed: 'Telaffuz hızı', speedHint: 'Örneği dinlemek için kaydırıcıyı bırak',
    speedSlowLabel: 'Yavaş', speedFastLabel: 'Hızlı',
    haptics: 'Hatada titreşim',
    hapticsSub: 'Yanlış cevapta dokunsal uyarı',
    hintsAfterAnswer: 'Cevaptan sonra ipuçları',
    hintsAfterAnswerSub: 'Her cevaptan sonra açıklama kartlarını göster',
  },
  words: {
    title: (n: number) => `${n}. Sözlük`,
    training: 'Alıştırma', wordList: 'Kelime listesi',
    listStartTraining: 'Alıştırmayı başlat',
    allLearned: 'Tüm kelimeler öğrenildi!',
    learnedOf: (a: number, b: number) => `${a} / ${b} öğrenildi`,
    plusPoints: (n: number) => `+${n} XP`,
  },
  verbs: {
    title: (n: number) => `${n}. Fiil biçimleri`,
    training: 'Alıştırma', list: 'Liste',
    base: 'Temel biçim', past: 'Past Simple', pp: 'Past Participle', tr: 'Çeviri',
    guessPast: 'Past Simple biçimi:', guessPP: 'Past Participle biçimi:',
    done: 'Alıştırma tamamlandı!', repeat: 'Tekrar et',
  },
  diagnostic: {
    title: 'Seviye tanılama',
    prevResult: 'Son sonucun',
    examReadinessTitle: 'Sınava hazırlık',
    start: 'İngilizce seviye testi',
    startTest: 'Testi başlat',
    yourLevel: 'Seviye göstergesi',
    currentEnglishLevelTitle: 'Mevcut İngilizce seviyen',
    currentEnglishLevelHintBeforeTest:
      'Seviyeni öğrenmek için testi tamamla.',
    correct: 'Doğru cevaplar',
    skipped: (n: number) => `Atlanan (süre): ${n}`,
    again: 'Tekrar yap',
    backHome: 'Ana sayfaya dön',
    timeUp: 'Süre doldu — soru atlandı',
    points: (n: number) => `+${n} XP`,
    unlockedTitle: 'Başlangıç önerisi',
    unlockedRec:
      'Test yaklaşık seviyeni gösterdi. Kurstaki uygun konulardan başla veya temeli güçlendirmek istersen tekrar yap.',
  },
  onboarding: {
    chooseLang: 'Dil seç',
    enterName: 'Adını veya takma adını gir',
    placeholder: 'Adın...',
    next: 'Devam et',
    nameError: 'Devam etmek için ad gir',
  },
  premium: {
    locked: 'Plus A1 sonrasındaki dersleri açar',
    freeCont: 'Ücretsiz devam et (Ders 1)',
    cta: 'Plus al',
    ctaSub: 'Abonelik başlat',
    legal: 'App Store / Google Play ayarlarından istediğin zaman iptal edebilirsin.',
    features: ['A1 sonrası dersler','Sesli giriş','Detaylı istatistikler'],
  },
};

const PL: typeof RU = {
  tabs: {
    home: 'Główna', lessons: 'Lekcje', flashcards: 'Fiszki',
    settings: 'Ustawienia',
  },
  home: {
    greeting: (n: string) => `${n}`,
    greetingPrefix: (g: string) => g,
    sub: 'Kontynuujemy dzisiaj?',
    streakLabel: 'Seria',
    streakDays: 'dni z rzędu',
    continueBtn: 'Kontynuuj',
    startBtn: 'Zacznij',
    leagueLabel: 'Klub tygodnia',
    testBtn: 'Test wiedzy',
    testSub: 'Poznaj swój poziom',
    examBtn: 'Egzamin końcowy',
    attestTile: 'Ocena',
    statsCardTitle: 'Statystyki',
    statsPulseHint: 'Naciśnij tutaj, aby zobaczyć więcej',
  },
  lessonMenu: {
    start: 'Zacznij lekcję',
    continue: 'Kontynuuj lekcję',
    vocab: 'Słownik',
    verbs: 'Formy czasowników nieregularnych',
    theory: 'Teoria',
    fromScratch: 'Zaczynamy od zera',
    wordsOfLesson: 'Słowa z tej lekcji',
    verbsOfLesson: 'Tylko formy nieregularne',
    theoryOfLesson: 'Gramatyka i zasady',
  },
  lesson: {
    undo: 'Cofnij', cheat: 'Ściąga', theory: 'Teoria',
    oral: 'Ustnie', next: 'Dalej', check: 'Sprawdź',
    typeHere: 'Wpisz odpowiedź...', listenTitle: 'Słucham...',
    noArticle: 'bez rodzajnika',
    hintAfterWrong: 'Podpowiedź po błędzie',
  },
  lessonComplete: {
    title: 'Lekcja zakończona!',
    subtitle: (n: number) => `Lekcja ${n} ukończona w 100%`,
    bonus: '+500 XP',
    rest: 'Zrób krótką przerwę — zasłużyłeś.',
    nextLesson: 'Następna lekcja',
    repeatLesson: 'Powtórz lekcję',
    shareResult: 'Udostępnij wynik',
    backHome: 'Na główną',
  },
  leagues: [
    { name: 'Poszukiwacz', min: 0 },
    { name: 'Znawca', min: 100 },
    { name: 'Erudyta', min: 300 },
    { name: 'Mówca', min: 700 },
    { name: 'Ostre pióro', min: 1500 },
    { name: 'Profesor', min: 3000 },
  ],
  settings: {
    title: 'Ustawienia', profile: 'Profil',
    name: 'Imię / nick', nameSub: (n: string) => n || 'Nie ustawiono',
    lang: 'Język interfejsu', appearance: 'Wygląd',
    theme: 'Motyw', themeDark: 'Ciemny', themeLight: 'Jasny',
    learning: 'Nauka', learnSet: 'Ustawienia nauki',
    help: 'Pomoc',
    premium: 'Plus', premiumSub: 'Lekcje, limity i praktyka — w subskrypcji',
    changeName: 'Zmień imię', cancel: 'Anuluj', save: 'Zapisz',
    nameError: 'Wpisz imię', namePlaceholder: 'Wpisz imię...',
  },
  edu: {
    title: 'Ustawienia nauki',
    autoCheck: 'Automatyczne sprawdzanie', autoCheckSub: 'Sprawdzaj po wpisaniu ostatniego słowa',
    autoAdvance: 'Automatyczne przejście po odpowiedzi', autoAdvanceSub: 'Automatycznie przechodź dalej po poprawnej odpowiedzi',
    hardMode: 'Wpisywanie z klawiatury', hardModeSub: 'Wpisuj zdanie ręcznie',
    speed: 'Szybkość wymowy', speedHint: 'Puść suwak, aby usłyszeć przykład',
    speedSlowLabel: 'Wolno', speedFastLabel: 'Szybko',
    haptics: 'Wibracja przy błędzie',
    hapticsSub: 'Sygnał dotykowy przy błędnej odpowiedzi',
    hintsAfterAnswer: 'Podpowiedzi po odpowiedzi',
    hintsAfterAnswerSub: 'Pokazuj karty z wyjaśnieniem po każdej odpowiedzi',
  },
  words: {
    title: (n: number) => `${n}. Słownik`,
    training: 'Trening', wordList: 'Lista słów',
    listStartTraining: 'Rozpocznij trening',
    allLearned: 'Wszystkie słowa nauczone!',
    learnedOf: (a: number, b: number) => `${a} / ${b} nauczono`,
    plusPoints: (n: number) => `+${n} XP`,
  },
  verbs: {
    title: (n: number) => `${n}. Formy czasowników`,
    training: 'Trening', list: 'Lista',
    base: 'Forma podstawowa', past: 'Past Simple', pp: 'Past Participle', tr: 'Tłumaczenie',
    guessPast: 'Past Simple od:', guessPP: 'Past Participle od:',
    done: 'Trening zakończony!', repeat: 'Powtórz',
  },
  diagnostic: {
    title: 'Diagnoza poziomu',
    prevResult: 'Twój ostatni wynik',
    examReadinessTitle: 'Gotowość do egzaminu',
    start: 'Test poziomu angielskiego',
    startTest: 'Rozpocznij test',
    yourLevel: 'Orientacyjny poziom',
    currentEnglishLevelTitle: 'Twój obecny poziom angielskiego',
    currentEnglishLevelHintBeforeTest:
      'Zrób test, aby poznać swój poziom.',
    correct: 'Poprawne odpowiedzi',
    skipped: (n: number) => `Pominięto (timer): ${n}`,
    again: 'Zrób jeszcze raz',
    backHome: 'Na główną',
    timeUp: 'Czas minął — pytanie pominięte',
    points: (n: number) => `+${n} XP`,
    unlockedTitle: 'Rekomendacja startu',
    unlockedRec:
      'Test pokazał przybliżony poziom. Zacznij od odpowiednich tematów w kursie albo powtórz podstawy, jeśli chcesz je utrwalić.',
  },
  onboarding: {
    chooseLang: 'Wybierz język',
    enterName: 'Wpisz imię albo nick',
    placeholder: 'Twoje imię...',
    next: 'Kontynuuj',
    nameError: 'Wpisz imię, aby kontynuować',
  },
  premium: {
    locked: 'Plus otwiera lekcje po A1',
    freeCont: 'Kontynuuj za darmo (Lekcja 1)',
    cta: 'Pobierz Plus',
    ctaSub: 'Wykup subskrypcję',
    legal: 'Anuluj w dowolnym momencie w ustawieniach App Store / Google Play.',
    features: ['Lekcje po A1','Wprowadzanie głosowe','Szczegółowe statystyki'],
  },
};

/** Текст про отмену подписки — только релевантный магазин для текущей платформы (в iOS без упоминания Google Play). */
(() => {
  if (Platform.OS === 'ios') {
    RU.premium.legal = 'Отмена в любое время в настройках App Store (Подписки).';
    UK.premium.legal = 'Скасування будь-коли в налаштуваннях App Store (Підписки).';
    ES.premium.legal = 'Puedes cancelar cuando quieras en Ajustes → Apple ID → Suscripciones.';
    PT_BR.premium.legal = 'Cancele quando quiser em Ajustes → Apple ID → Assinaturas.';
    VI.premium.legal = 'Có thể hủy bất cứ lúc nào trong Cài đặt → Apple ID → Đăng ký.';
    ID.premium.legal = 'Batalkan kapan saja di Pengaturan → Apple ID → Langganan.';
    TR.premium.legal = 'Ayarlar → Apple ID → Abonelikler bölümünden istediğin zaman iptal edebilirsin.';
    PL.premium.legal = 'Anuluj w dowolnym momencie w Ustawienia → Apple ID → Subskrypcje.';
  } else if (Platform.OS === 'android') {
    RU.premium.legal = 'Отмена в любое время в настройках Google Play (Подписки).';
    UK.premium.legal = 'Скасування будь-коли в налаштуваннях Google Play (Підписки).';
    ES.premium.legal = 'Puedes cancelar cuando quieras en Google Play → Suscripciones.';
    PT_BR.premium.legal = 'Cancele quando quiser em Google Play → Assinaturas.';
    VI.premium.legal = 'Có thể hủy bất cứ lúc nào trong Google Play → Gói đăng ký.';
    ID.premium.legal = 'Batalkan kapan saja di Google Play → Langganan.';
    TR.premium.legal = 'Google Play → Abonelikler bölümünden istediğin zaman iptal edebilirsin.';
    PL.premium.legal = 'Anuluj w dowolnym momencie w Google Play → Subskrypcje.';
  } else {
    RU.premium.legal = 'Отмена в любое время в разделе подписок магазина приложений.';
    UK.premium.legal = 'Скасування будь-коли в розділі підписок магазину застосунків.';
    ES.premium.legal = 'Puedes cancelar cuando quieras en la sección de suscripciones de la tienda de apps.';
    PT_BR.premium.legal = 'Cancele quando quiser na área de assinaturas da loja de apps.';
    VI.premium.legal = 'Có thể hủy bất cứ lúc nào trong phần gói đăng ký của cửa hàng ứng dụng.';
    ID.premium.legal = 'Batalkan kapan saja di bagian langganan toko aplikasi.';
    TR.premium.legal = 'Uygulama mağazasının abonelikler bölümünden istediğin zaman iptal edebilirsin.';
    PL.premium.legal = 'Anuluj w dowolnym momencie w sekcji subskrypcji sklepu z aplikacjami.';
  }
})();

export { RU, UK, ES, PT_BR, VI, ID, TR, PL };

export type Strings = typeof RU;

// ─── КОНТЕКСТ ────────────────────────────────────────────────────────────────
interface LangCtx {
  lang: Lang;
  /** После первого чтения app_lang из AsyncStorage (до этого lang может быть дефолт ru). */
  langHydrated: boolean;
  s: Strings;
  setLang: (l: Lang) => Promise<void>;
}

const LangContext = createContext<LangCtx>({
  lang: 'ru',
  langHydrated: false,
  s: RU,
  setLang: async () => {},
});

const STRINGS_BY_LANG: Record<Lang, Strings> = {
  ru: RU,
  uk: UK,
  es: ES,
  'pt-BR': PT_BR,
  vi: VI,
  id: ID,
  tr: TR,
  pl: PL,
};

const STUDY_TARGET_RESET_LANGS = new Set<Lang>(['es']);

/** Строки интерфейса для кода и лиг без хука React. */
export function stringsForLang(lang: Lang): Strings {
  const pack = isInterfaceLangEnabled(lang) ? STRINGS_BY_LANG[lang] : RU;
  return pack;
}

// B3 (PERF_MASTER_PLAN): app_snapshot_bootstrap.ts кеширует raw 'app_lang' в
// модульный peek после каждого прайма (см. peekAppLang/writePeekAppLang). Внутри
// ОДНОЙ сессии (навигация/ремаунт/Fast Refresh, после первого прайма) читаем его
// синхронно вместо getDeviceBootstrapLocale() — устраняет перерисовку всех текстов
// после hydration. На самом первом кадре самой первой сессии после установки
// приложения peek ещё пуст (prime стартует позже, см. bootstrap.ts) — тогда, как и
// раньше, используем локаль устройства; useEffect ниже досинхронизирует как обычно.
function initialLangFromPeekOrDevice(): Lang {
  const peeked = coerceInterfaceLang(peekAppLang());
  return peeked ?? getDeviceBootstrapLocale();
}

export const LangProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => initialLangFromPeekOrDevice());
  const [langHydrated, setLangHydrated] = useState(false);

  useEffect(() => {
    readPortablePreference('app_lang')
      .then(v => {
        writePeekAppLang(typeof v === 'string' ? v : null);
        const storedLang = coerceInterfaceLang(v);
        if (!storedLang) {
          if (typeof v === 'string') {
            persistPortablePreference('app_lang', 'ru').catch(() => {});
            setLangState('ru');
          }
          return;
        }
        setLangState(storedLang);
        if (STUDY_TARGET_RESET_LANGS.has(storedLang)) {
          void resetDevStudyTargetForSpanishUi().then(emitDevStudyTargetChanged);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLangHydrated(true);
      });
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    if (!isInterfaceLangEnabled(l)) {
      persistPortablePreference('app_lang', 'ru').catch(() => {});
      writePeekAppLang(null);
      setLangState('ru');
      return;
    }
    await persistPortablePreference('app_lang', l);
    writePeekAppLang(l);
    setLangState(l);
    if (STUDY_TARGET_RESET_LANGS.has(l)) {
      await resetDevStudyTargetForSpanishUi();
      emitDevStudyTargetChanged();
    }
  }, []);

  const s = useMemo(() => stringsForLang(lang), [lang]);
  const value = useMemo<LangCtx>(() => ({ lang, langHydrated, s, setLang }), [lang, langHydrated, s, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);

// ─── УТИЛИТЫ ────────────────────────────────────────────────────────────────
export const getLeague = (points: number, lang: Lang = 'ru') => {
  const pack = stringsForLang(lang);
  const leagues = [...pack.leagues].reverse();
  return leagues.find(l => points >= l.min) || pack.leagues[0];
};

export const getNextLeague = (points: number, lang: Lang = 'ru') => {
  const pack = stringsForLang(lang);
  const leagues = pack.leagues;
  const current = getLeague(points, lang);
  const idx = leagues.findIndex(l => l.name === current.name);
  return leagues[idx + 1] || null;
};
