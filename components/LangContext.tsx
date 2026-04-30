import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lang } from '../constants/i18n';
import { ENABLE_SPANISH_LOCALE } from '../app/config';
import { emitDevStudyTargetChanged, resetDevStudyTargetForSpanishUi } from '../app/study_target_lang_dev';

export type { Lang };
const RU = {
  tabs: {
    home: 'Главная', lessons: 'Уроки', quizzes: 'Квизы',
    hallFame: 'Зал славы', settings: 'Настройки',
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
    examBtn: 'Экзамен',
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
  hallFame: {
    title: 'Зал славы',
    empty: 'Пока никого нет.\nПройди квиз и займи место!',
    rank: 'Место', player: 'Участник', points: 'Опыт',
    weekReset: 'Сброс каждое воскресенье',
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
    feedback: 'Идеи и предложения', help: 'Помощь',
    premium: 'Premium', premiumSub: 'Все уроки и квизы — €3.99/мес',
    changeName: 'Изменить имя', cancel: 'Отмена', save: 'Сохранить',
    nameError: 'Введите имя', namePlaceholder: 'Введите имя...',
  },
  edu: {
    title: 'Настройки обучения',
    autoCheck: 'Автопроверка', autoCheckSub: 'Проверять при наборе последнего слова',
    voiceOut: 'Озвучить ответ', voiceOutSub: 'Произносить фразу после ответа',
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
    listTapToClose: 'Нажмите, чтобы закрыть',
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
    subtitle: 'По материалам курса',
    desc: '20 заданий · до 30 с на ответ\nЛексика, грамматика и скорость. Ориентир CEFR A1–C2 только внутри приложения; это не DELE/SIELE.',
    prevResult: 'Предыдущий результат',
    start: 'Начать диагностику',
    yourLevel: 'Ориентир по уровню',
    correct: 'Верных ответов',
    skipped: (n: number) => `Пропущено (таймер): ${n}`,
    again: 'Пройти ещё раз',
    backHome: 'На главную',
    timeUp: 'Время вышло — вопрос пропущен',
    points: (n: number) => `+${n} опыта`,
    unlockedTitle: 'Доступ к урокам',
    unlockedRec:
      'Рекомендуем пройти предыдущие уроки из блоков «Словарь», «Формы глаголов» и «Теория» для закрепления.',
  },
  onboarding: {
    chooseLang: 'Выберите язык',
    enterName: 'Введите ваше имя или никнейм',
    placeholder: 'Ваше имя...',
    next: 'Продолжить',
    nameError: 'Введите имя чтобы продолжить',
  },
  premium: {
    locked: 'Без Premium ты теряешь доступ\nк 31 уроку и квизам',
    freeCont: 'Продолжить бесплатно (Урок 1)',
    cta: 'Начать 7 дней бесплатно',
    ctaSub: 'Подписаться — €3.99/мес',
    legal: 'Отмена в любое время в настройках App Store / Google Play.',
    features: ['Все 32 урока','Квизы всех уровней','Голосовой ввод','Подробная статистика'],
  },
};

const UK: typeof RU = {
  tabs: {
    home: 'Головна', lessons: 'Уроки', quizzes: 'Квізи',
    hallFame: 'Зал слави', settings: 'Налаштування',
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
    examBtn: 'Іспит',
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
  hallFame: {
    title: 'Зал слави',
    empty: 'Поки нікого немає.\nПройди квіз та займи місце!',
    rank: 'Місце', player: 'Учасник', points: 'Досвід',
    weekReset: 'Скидання щонеділі',
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
    name: 'Імʼя / нікнейм', nameSub: (n: string) => n || 'Не вказано',
    lang: 'Мова інтерфейсу', appearance: 'Зовнішній вигляд',
    theme: 'Тема', themeDark: 'Темна', themeLight: 'Світла',
    learning: 'Навчання', learnSet: 'Налаштування навчання',
    feedback: 'Ідеї й пропозиції', help: 'Допомога',
    premium: 'Premium', premiumSub: 'Всі уроки та квізи — €3.99/міс',
    changeName: 'Змінити імʼя', cancel: 'Скасувати', save: 'Зберегти',
    nameError: 'Введіть імʼя', namePlaceholder: 'Введіть імʼя...',
  },
  edu: {
    title: 'Налаштування навчання',
    autoCheck: 'Автоперевірка', autoCheckSub: 'Перевіряти при наборі останнього слова',
    voiceOut: 'Озвучити відповідь', voiceOutSub: 'Вимовляти фразу після відповіді',
    autoAdvance: 'Автоперехід після відповіді', autoAdvanceSub: 'Автоматично переходити при правильній відповіді',
    hardMode: 'Введення з клавіатури', hardModeSub: 'Вводити речення вручну',
    speed: 'Швидкість вимови', speedHint: 'Відпусти повзунок — прозвучить приклад',
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
    listTapToClose: 'Натисніть, щоб закрити',
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
    subtitle: 'За матеріалами курсу',
    desc: '20 завдань · до 30 с на відповідь\nЛексика, граматика й швидкість. Орієнтир CEFR A1–C2 лише в межах застосунку; це не DELE/SIELE.',
    prevResult: 'Попередній результат',
    start: 'Почати діагностику',
    yourLevel: 'Орієнтир за рівнем',
    correct: 'Правильних відповідей',
    skipped: (n: number) => `Пропущено (таймер): ${n}`,
    again: 'Пройти ще раз',
    backHome: 'На головну',
    timeUp: 'Час вийшов — питання пропущено',
    points: (n: number) => `+${n} досвіду`,
    unlockedTitle: 'Доступ до уроків',
    unlockedRec:
      'Рекомендуємо пройти попередні уроки з «Словника», «Неправильних форм дієслів» і «Теорії» для закріплення.',
  },
  onboarding: {
    chooseLang: 'Оберіть мову',
    enterName: 'Введіть ваше імʼя або нікнейм',
    placeholder: 'Ваше імʼя...',
    next: 'Продовжити',
    nameError: 'Введіть імʼя щоб продовжити',
  },
  premium: {
    locked: 'Без Premium ти втрачаєш доступ\nдо 31 уроку та квізів',
    freeCont: 'Продовжити безкоштовно (Урок 1)',
    cta: 'Почати 7 днів безкоштовно',
    ctaSub: 'Підписатися — €3.99/міс',
    legal: 'Скасування будь-коли в налаштуваннях App Store / Google Play.',
    features: ['Всі 32 уроки','Квізи всіх рівнів','Голосове введення','Докладна статистика'],
  },
};

const ES: typeof RU = {
  tabs: {
    home: 'Inicio', lessons: 'Lecciones', quizzes: 'Cuestionarios',
    hallFame: 'Salón de la fama', settings: 'Ajustes',
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
    examBtn: 'Examen',
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
  hallFame: {
    title: 'Salón de la fama',
    empty: 'Aún no hay nadie.\n¡Haz un cuestionario y sube en la clasificación!',
    rank: 'Puesto', player: 'Jugador', points: 'Puntos',
    weekReset: 'La clasificación se reinicia cada domingo',
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
    feedback: 'Comentarios e ideas', help: 'Ayuda',
    premium: 'Premium', premiumSub: 'Todas las lecciones y todos los cuestionarios — 3,99 €/mes',
    changeName: 'Cambiar nombre', cancel: 'Cancelar', save: 'Guardar',
    nameError: 'Escribe un nombre', namePlaceholder: 'Tu nombre...',
  },
  edu: {
    title: 'Ajustes del aprendizaje',
    autoCheck: 'Comprobación automática', autoCheckSub: 'Comprobar al escribir la última palabra',
    voiceOut: 'Leer respuestas en voz alta', voiceOutSub: 'La app reproduce la frase después de responder',
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
    listTapToClose: 'Toca para cerrar',
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
    subtitle: 'Según el programa del curso',
    desc: '20 tareas · hasta 30 s por respuesta\nEvaluamos léxico, gramática y rapidez. La escala A1–C2 es orientativa dentro de la app; no sustituye a DELE/SIELE ni otros exámenes oficiales.',
    prevResult: 'Resultado anterior',
    start: 'Empezar el diagnóstico',
    yourLevel: 'Nivel orientativo',
    correct: 'Aciertos',
    skipped: (n: number) => `Omitidas (tiempo): ${n}`,
    again: 'Repetir diagnóstico',
    backHome: 'Volver al inicio',
    timeUp: 'Tiempo agotado: pregunta omitida',
    points: (n: number) => `+${n} XP`,
    unlockedTitle: 'Lecciones desbloqueadas',
    unlockedRec:
      'Te recomendamos repasar las lecciones anteriores en «Vocabulario», «Formas verbales irregulares» y «Teoría» para fijar lo aprendido.',
  },
  onboarding: {
    chooseLang: 'Elige el idioma',
    enterName: 'Escribe tu nombre o apodo',
    placeholder: 'Tu nombre...',
    next: 'Continuar',
    nameError: 'Escribe tu nombre para continuar',
  },
  premium: {
    locked: 'Sin Premium, pierdes el acceso\na la lección 31 y al resto de cuestionarios',
    freeCont: 'Seguir gratis (Lección 1)',
    cta: 'Prueba gratuita de 7 días',
    ctaSub: 'Suscripción — 3,99 €/mes',
    legal: 'Puedes cancelar cuando quieras desde los ajustes de App Store o Google Play.',
    features: [
      'Las 32 lecciones',
      'Cuestionarios de todos los niveles',
      'Respuestas por voz',
      'Estadísticas detalladas',
    ],
  },
};

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
  if (lang === 'es') return ES;
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
