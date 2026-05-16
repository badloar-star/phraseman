import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lang } from '../constants/i18n';
import { ENABLE_SPANISH_LOCALE } from '../app/config';
import { emitDevStudyTargetChanged, resetDevStudyTargetForSpanishUi } from '../app/study_target_lang_dev';

export type { Lang };
const RU = {
  tabs: {
    home: 'Главная', lessons: 'Уроки', quizzes: 'Квизы', flashcards: 'Карточки',
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
    typeHere: 'Введите ответ...', listenTitle: 'Слушаю...',
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
  quizzes: {
    selectLevel: 'Выберите уровень', easy: 'Легко', medium: 'Средне', hard: 'Сложно',
    done: 'Квиз завершён!', again: 'Пройти снова',
    back: 'Выбрать уровень', fixErrors: 'Исправь ошибки', timeUp: 'Время вышло',
    perAnswer: 'балл/ответ',
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
    premium: 'Premium', premiumSub: 'Уровни, квизы и практика — по подписке',
    changeName: 'Изменить имя', cancel: 'Отмена', save: 'Сохранить',
    nameError: 'Введите имя', namePlaceholder: 'Введите имя...',
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
    prevResult: 'Ваш последний результат',
    examReadinessTitle: 'Готовность к экзамену',
    start: 'Тест уровня английского',
    startTest: 'Начать тест',
    yourLevel: 'Ориентир по уровню',
    currentEnglishLevelTitle: 'Ваш текущий уровень английского',
    currentEnglishLevelHintBeforeTest:
      'Пройдите тест, чтобы узнать ваш уровень.',
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
    chooseLang: 'Выберите язык',
    enterName: 'Введите ваше имя или никнейм',
    placeholder: 'Ваше имя...',
    next: 'Продолжить',
    nameError: 'Введите имя чтобы продолжить',
  },
  premium: {
    locked: 'Premium открывает уроки после первых 3\nи квизы Medium/Hard',
    freeCont: 'Продолжить бесплатно (Урок 1)',
    cta: 'Получить Premium',
    ctaSub: 'Оформить подписку',
    legal: 'Отмена в любое время в настройках App Store / Google Play.',
    features: ['Уроки после первых 3','Квизы всех уровней','Голосовой ввод','Подробная статистика'],
  },
};

const UK: typeof RU = {
  tabs: {
    home: 'Головна', lessons: 'Уроки', quizzes: 'Квізи', flashcards: 'Картки',
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
  quizzes: {
    selectLevel: 'Оберіть рівень', easy: 'Легко', medium: 'Середньо', hard: 'Складно',
    done: 'Квіз завершено!', again: 'Пройти знову',
    back: 'Обрати рівень', fixErrors: 'Виправ помилки', timeUp: 'Час вийшов',
    perAnswer: 'бал/відповідь',
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
    premium: 'Premium', premiumSub: 'Рівні, квізи й практика — за підпискою',
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
    locked: 'Premium відкриває уроки після перших 3\nі квізи Medium/Hard',
    freeCont: 'Продовжити безкоштовно (Урок 1)',
    cta: 'Отримати Premium',
    ctaSub: 'Оформити підписку',
    legal: 'Скасування будь-коли в налаштуваннях App Store / Google Play.',
    features: ['Уроки після перших 3','Квізи всіх рівнів','Голосове введення','Докладна статистика'],
  },
};

const ES: typeof RU = {
  tabs: {
    home: 'Inicio', lessons: 'Lecciones', quizzes: 'Cuestionarios', flashcards: 'Tarjetas',
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
  quizzes: {
    selectLevel: 'Elige el nivel', easy: 'Fácil', medium: 'Medio', hard: 'Difícil',
    done: '¡Cuestionario terminado!', again: 'Intentar de nuevo',
    back: 'Elegir otro nivel', fixErrors: 'Corrige los errores', timeUp: 'Se acabó el tiempo',
    perAnswer: 'punto por respuesta',
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
    premium: 'Premium', premiumSub: 'Niveles, cuestionarios y práctica — con suscripción',
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
    locked: 'Premium abre las lecciones después de las 3 primeras\ny quizzes Medium/Hard',
    freeCont: 'Seguir gratis (Lección 1)',
    cta: 'Obtener Premium',
    ctaSub: 'Contratar suscripción',
    legal: 'Puedes cancelar cuando quieras desde los ajustes de App Store o Google Play.',
    features: [
      'Lecciones después de las 3 primeras',
      'Cuestionarios de todos los niveles',
      'Respuestas por voz',
      'Estadísticas detalladas',
    ],
  },
};

/** Текст про отмену подписки — только релевантный магазин для текущей платформы (в iOS без упоминания Google Play). */
(() => {
  if (Platform.OS === 'ios') {
    RU.premium.legal = 'Отмена в любое время в настройках App Store (Подписки).';
    UK.premium.legal = 'Скасування будь-коли в налаштуваннях App Store (Підписки).';
    ES.premium.legal = 'Puedes cancelar cuando quieras en Ajustes → Apple ID → Suscripciones.';
  } else if (Platform.OS === 'android') {
    RU.premium.legal = 'Отмена в любое время в настройках Google Play (Подписки).';
    UK.premium.legal = 'Скасування будь-коли в налаштуваннях Google Play (Підписки).';
    ES.premium.legal = 'Puedes cancelar cuando quieras en Google Play → Suscripciones.';
  } else {
    RU.premium.legal = 'Отмена в любое время в разделе подписок магазина приложений.';
    UK.premium.legal = 'Скасування будь-коли в розділі підписок магазину застосунків.';
    ES.premium.legal = 'Puedes cancelar cuando quieras en la sección de suscripciones de la tienda de apps.';
  }
})();

export { RU, UK, ES };

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

/** Строки интерфейса для кода и лиг без хука React. */
export function stringsForLang(lang: Lang): Strings {
  if (lang === 'uk') return UK;
  if (lang === 'es' && ENABLE_SPANISH_LOCALE) return ES;
  return RU;
}

export const LangProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Lang>('ru');
  const [langHydrated, setLangHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('app_lang')
      .then(v => {
        if (v !== 'ru' && v !== 'uk' && v !== 'es') return;
        if (v === 'es' && !ENABLE_SPANISH_LOCALE) {
          AsyncStorage.removeItem('app_lang').catch(() => {});
          setLangState('ru');
          return;
        }
        setLangState(v);
      })
      .catch(() => {})
      .finally(() => {
        setLangHydrated(true);
      });
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    if (l === 'es' && !ENABLE_SPANISH_LOCALE) return;
    await AsyncStorage.setItem('app_lang', l);
    setLangState(l);
    if (l === 'es' && ENABLE_SPANISH_LOCALE) {
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
