import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UILang    = 'ru' | 'uk' | 'en';
export type LearnLang = 'ru' | 'uk' | 'en';
/** @deprecated Use UILang or LearnLang instead */
export type Lang = UILang;

// ─── РУССКИЙ ИНТЕРФЕЙС ───────────────────────────────────────────────────────
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
  },
  lessonComplete: {
    title: 'Урок завершён!',
    subtitle: (n: number) => `Урок ${n} пройден на 100%`,
    bonus: '+500 XP',
    rest: 'Сделай небольшой перерыв — ты заслужил.',
    nextLesson: 'Следующий урок',
    repeatLesson: 'Повторить урок',
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
    rank: 'Место', player: 'Участник', points: 'Досвід',
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
    lang: 'Язык интерфейса', learning: 'Обучение',
    learnLangLabel: 'Изучаю язык',
    appearance: 'Внешний вид',
    theme: 'Тема', themeDark: 'Тёмная', themeLight: 'Светлая',
    learnSet: 'Настройки обучения',
    feedback: 'Предложение или замечание', help: 'Помощь',
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
  },
  words: {
    title: (n: number) => `${n}. Словарь`,
    training: 'Тренировка', wordList: 'Список слов',
    allLearned: 'Все слова выучены!',
    learnedOf: (a: number, b: number) => `${a} / ${b} выучено`,
    plusPoints: (n: number) => `+${n} очков`,
  },
  verbs: {
    title: (n: number) => `${n}. Формы глаголов`,
    training: 'Тренировка', list: 'Список',
    base: 'Основа', past: 'Past Simple', pp: 'Past Participle', tr: 'Перевод',
    guessPast: 'Past Simple от:', guessPP: 'Past Participle от:',
    done: 'Тренировка завершена!', repeat: 'Повторить',
  },
  diagnostic: {
    title: 'Тест знаний', subtitle: 'Тест Профессора',
    desc: '20 вопросов · 30 секунд на каждый\nОпределяем уровень от A1 до C2',
    prevResult: 'Предыдущий результат',
    start: 'Начать тест',
    yourLevel: 'Твой уровень',
    correct: 'Правильных ответов',
    skipped: (n: number) => `Пропущено (таймер): ${n}`,
    again: 'Пройти снова',
    backHome: 'На главную',
    timeUp: 'Время вышло — вопрос пропущен',
    points: (n: number) => `+${n} очков`,
  },
  onboarding: {
    chooseLang: 'Выберите язык',
    chooseLearnLang: 'Что хотите изучать?',
    enterName: 'Введите ваше имя или никнейм',
    placeholder: 'Ваше имя...',
    next: 'Продолжить',
    nameError: 'Введите имя чтобы продолжить',
  },
  premium: {
    locked: 'Без Premium ты теряешь доступ\nк 31 уроку, квизам и залу славы',
    freeCont: 'Продолжить бесплатно (Урок 1)',
    cta: 'Начать 7 дней бесплатно',
    ctaSub: 'Подписаться — €3.99/мес',
    legal: 'Отмена в любое время в настройках App Store / Google Play.',
    features: ['Все 32 урока','Квизы всех уровней','Зал славы и лиги','Голосовой ввод','Подробная статистика'],
  },
  learnLangNames: {
    ru: 'Русский',
    uk: 'Украинский',
    en: 'Английский',
  },
};

// ─── УКРАИНСКИЙ ИНТЕРФЕЙС ────────────────────────────────────────────────────
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
  },
  lessonComplete: {
    title: 'Урок завершено!',
    subtitle: (n: number) => `Урок ${n} пройдено на 100%`,
    bonus: '+500 XP',
    rest: 'Зроби невелику перерву — ти заслужив.',
    nextLesson: 'Наступний урок',
    repeatLesson: 'Пройти знову',
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
    name: 'Імʼя / нікнейм', nameSub: (n: string) => n || 'Не задано',
    lang: 'Мова інтерфейсу', learning: 'Навчання',
    learnLangLabel: 'Вивчаю мову',
    appearance: 'Зовнішній вигляд',
    theme: 'Тема', themeDark: 'Темна', themeLight: 'Світла',
    learnSet: 'Налаштування навчання',
    feedback: 'Пропозиція або зауваження', help: 'Допомога',
    premium: 'Premium', premiumSub: 'Усі уроки та квізи — €3.99/міс',
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
  },
  words: {
    title: (n: number) => `${n}. Словник`,
    training: 'Тренування', wordList: 'Список слів',
    allLearned: 'Усі слова вивчено!',
    learnedOf: (a: number, b: number) => `${a} / ${b} вивчено`,
    plusPoints: (n: number) => `+${n} очок`,
  },
  verbs: {
    title: (n: number) => `${n}. Форми дієслів`,
    training: 'Тренування', list: 'Список',
    base: 'Основа', past: 'Past Simple', pp: 'Past Participle', tr: 'Переклад',
    guessPast: 'Past Simple від:', guessPP: 'Past Participle від:',
    done: 'Тренування завершено!', repeat: 'Повторити',
  },
  diagnostic: {
    title: 'Тест знань', subtitle: 'Тест Професора',
    desc: '20 питань · 30 секунд на кожне\nВизначаємо рівень від A1 до C2',
    prevResult: 'Попередній результат',
    start: 'Почати тест',
    yourLevel: 'Твій рівень',
    correct: 'Правильних відповідей',
    skipped: (n: number) => `Пропущено (таймер): ${n}`,
    again: 'Пройти знову',
    backHome: 'На головну',
    timeUp: 'Час вийшов — питання пропущено',
    points: (n: number) => `+${n} очок`,
  },
  onboarding: {
    chooseLang: 'Оберіть мову',
    chooseLearnLang: 'Що хочете вивчати?',
    enterName: 'Введіть своє імʼя або нікнейм',
    placeholder: 'Ваше імʼя...',
    next: 'Продовжити',
    nameError: 'Введіть імʼя щоб продовжити',
  },
  premium: {
    locked: 'Без Premium ти втрачаєш доступ\nдо 31 уроку, квізів та залу слави',
    freeCont: 'Продовжити безкоштовно (Урок 1)',
    cta: 'Почати 7 днів безкоштовно',
    ctaSub: 'Підписатися — €3.99/міс',
    legal: 'Скасування будь-коли в налаштуваннях App Store / Google Play.',
    features: ['Усі 32 уроки','Квізи всіх рівнів','Зал слави та ліги','Голосове введення','Докладна статистика'],
  },
  learnLangNames: {
    ru: 'Російська',
    uk: 'Українська',
    en: 'Англійська',
  },
};

// ─── АНГЛИЙСКИЙ ИНТЕРФЕЙС ────────────────────────────────────────────────────
const EN: typeof RU = {
  tabs: {
    home: 'Home', lessons: 'Lessons', quizzes: 'Quizzes',
    hallFame: 'Hall of Fame', settings: 'Settings',
  },
  home: {
    greeting: (n: string) => `${n}`,
    greetingPrefix: (g: string) => g,
    sub: 'Ready to continue?',
    streakLabel: 'Streak',
    streakDays: 'days in a row',
    continueBtn: 'Continue',
    startBtn: 'Start',
    leagueLabel: 'Club of the week',
    testBtn: 'Knowledge test',
    testSub: 'Find your level',
    examBtn: 'Final exam',
  },
  lessonMenu: {
    start: 'Start lesson',
    continue: 'Continue lesson',
    vocab: 'Vocabulary',
    verbs: 'Irregular verb forms',
    theory: 'Theory',
    fromScratch: 'Starting from scratch',
    wordsOfLesson: 'Words of this lesson',
    verbsOfLesson: 'Irregular forms only',
    theoryOfLesson: 'Grammar & rules',
  },
  lesson: {
    undo: 'Undo', cheat: 'Cheat sheet', theory: 'Theory',
    oral: 'Oral', next: 'Next', check: 'Check',
    typeHere: 'Type your answer...', listenTitle: 'Listening...',
  },
  lessonComplete: {
    title: 'Lesson complete!',
    subtitle: (n: number) => `Lesson ${n} — 100% done`,
    bonus: '+500 XP',
    rest: 'Take a short break — you\'ve earned it.',
    nextLesson: 'Next lesson',
    repeatLesson: 'Repeat lesson',
    backHome: 'Back to home',
  },
  quizzes: {
    selectLevel: 'Select level', easy: 'Easy', medium: 'Medium', hard: 'Hard',
    done: 'Quiz complete!', again: 'Play again',
    back: 'Select level', fixErrors: 'Fix mistakes', timeUp: 'Time\'s up',
    perAnswer: 'pt / answer',
  },
  hallFame: {
    title: 'Hall of Fame',
    empty: 'No one here yet.\nComplete a quiz and claim your spot!',
    rank: 'Rank', player: 'Player', points: 'Points',
    weekReset: 'Resets every Sunday',
  },
  leagues: [
    { name: 'Seeker',    min: 0 },
    { name: 'Learner',   min: 100 },
    { name: 'Scholar',   min: 300 },
    { name: 'Speaker',   min: 700 },
    { name: 'Wordsmith', min: 1500 },
    { name: 'Professor', min: 3000 },
  ],
  settings: {
    title: 'Settings', profile: 'Profile',
    name: 'Name / nickname', nameSub: (n: string) => n || 'Not set',
    lang: 'Interface language', learning: 'Learning',
    learnLangLabel: 'I\'m learning',
    appearance: 'Appearance',
    theme: 'Theme', themeDark: 'Dark', themeLight: 'Light',
    learnSet: 'Learning settings',
    feedback: 'Feedback or suggestion', help: 'Help',
    premium: 'Premium', premiumSub: 'All lessons & quizzes — €3.99/mo',
    changeName: 'Change name', cancel: 'Cancel', save: 'Save',
    nameError: 'Please enter a name', namePlaceholder: 'Enter name...',
  },
  edu: {
    title: 'Learning settings',
    autoCheck: 'Auto-check', autoCheckSub: 'Check when the last word is typed',
    voiceOut: 'Read answer aloud', voiceOutSub: 'Pronounce the phrase after answering',
    autoAdvance: 'Auto-advance after answer', autoAdvanceSub: 'Move to next question automatically on correct answer',
    hardMode: 'Keyboard input', hardModeSub: 'Type the sentence manually',
    speed: 'Pronunciation speed', speedHint: 'Release the slider to hear a sample',
  },
  words: {
    title: (n: number) => `${n}. Vocabulary`,
    training: 'Training', wordList: 'Word list',
    allLearned: 'All words learned!',
    learnedOf: (a: number, b: number) => `${a} / ${b} learned`,
    plusPoints: (n: number) => `+${n} pts`,
  },
  verbs: {
    title: (n: number) => `${n}. Verb forms`,
    training: 'Training', list: 'List',
    base: 'Base', past: 'Past Simple', pp: 'Past Participle', tr: 'Translation',
    guessPast: 'Past Simple of:', guessPP: 'Past Participle of:',
    done: 'Training complete!', repeat: 'Repeat',
  },
  diagnostic: {
    title: 'Knowledge test', subtitle: 'Professor\'s test',
    desc: '20 questions · 30 seconds each\nDetermines your level from A1 to C2',
    prevResult: 'Previous result',
    start: 'Start test',
    yourLevel: 'Your level',
    correct: 'Correct answers',
    skipped: (n: number) => `Skipped (timer): ${n}`,
    again: 'Retake test',
    backHome: 'Back to home',
    timeUp: 'Time\'s up — question skipped',
    points: (n: number) => `+${n} pts`,
  },
  onboarding: {
    chooseLang: 'Choose your language',
    chooseLearnLang: 'What do you want to learn?',
    enterName: 'Enter your name or nickname',
    placeholder: 'Your name...',
    next: 'Continue',
    nameError: 'Please enter a name to continue',
  },
  premium: {
    locked: 'Without Premium you lose access\nto 31 lessons, quizzes and Hall of Fame',
    freeCont: 'Continue for free (Lesson 1)',
    cta: 'Start 7 days free',
    ctaSub: 'Subscribe — €3.99/mo',
    legal: 'Cancel anytime in App Store / Google Play settings.',
    features: ['All 32 lessons', 'All quiz levels', 'Hall of Fame & leagues', 'Voice input', 'Detailed stats'],
  },
  learnLangNames: {
    ru: 'Russian',
    uk: 'Ukrainian',
    en: 'English',
  },
};

export type Strings = typeof RU;

// ─── КОНТЕКСТ ────────────────────────────────────────────────────────────────
interface LangCtx {
  uiLang: UILang;
  s: Strings;
  setUILang: (l: UILang) => Promise<void>;
  learnLang: LearnLang;
  setLearnLang: (l: LearnLang) => Promise<void>;
  /** @deprecated Use uiLang instead */
  lang: UILang;
  /** @deprecated Use setUILang instead */
  setLang: (l: UILang) => Promise<void>;
}

const LangContext = createContext<LangCtx>({
  uiLang: 'ru',
  s: RU,
  setUILang: async () => {},
  learnLang: 'en',
  setLearnLang: async () => {},
  lang: 'ru',
  setLang: async () => {},
});

const UI_STRINGS: Record<UILang, Strings> = { ru: RU, uk: UK, en: EN };

export const LangProvider = ({ children }: { children: React.ReactNode }) => {
  const [uiLang, setUILangState] = useState<UILang>('ru');
  const [learnLang, setLearnLangState] = useState<LearnLang>('en');

  useEffect(() => {
    const init = async () => {
      // Миграция: app_lang → ui_lang
      let ui = await AsyncStorage.getItem('ui_lang');
      if (!ui) {
        const legacy = await AsyncStorage.getItem('app_lang');
        ui = (legacy === 'uk' ? 'uk' : legacy === 'en' ? 'en' : 'ru');
        await AsyncStorage.setItem('ui_lang', ui);
      }

      const learn = await AsyncStorage.getItem('learn_lang');

      if (ui === 'ru' || ui === 'uk' || ui === 'en') setUILangState(ui);
      if (learn === 'ru' || learn === 'uk' || learn === 'en') setLearnLangState(learn);
    };
    init();
  }, []);

  const setUILang = useCallback(async (l: UILang) => {
    await AsyncStorage.setItem('ui_lang', l);
    setUILangState(l);
  }, []);

  const setLearnLang = useCallback(async (l: LearnLang) => {
    await AsyncStorage.setItem('learn_lang', l);
    setLearnLangState(l);
  }, []);

  return (
    <LangContext.Provider value={{
      uiLang,
      s: UI_STRINGS[uiLang],
      setUILang,
      learnLang,
      setLearnLang,
      // Обратная совместимость
      lang: uiLang,
      setLang: setUILang,
    }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);

// ─── УТИЛИТЫ ────────────────────────────────────────────────────────────────
export const getLeague = (points: number, uiLang: UILang = 'ru') => {
  const leagues = [...UI_STRINGS[uiLang].leagues].reverse();
  return leagues.find(l => points >= l.min) ?? UI_STRINGS[uiLang].leagues[0];
};

export const getNextLeague = (points: number, uiLang: UILang = 'ru') => {
  const leagues = UI_STRINGS[uiLang].leagues;
  const current = getLeague(points, uiLang);
  const idx = leagues.findIndex(l => l.name === current.name);
  return leagues[idx + 1] ?? null;
};

/** Возвращает список языков для изучения (исключает язык интерфейса) */
export const getLearnOptions = (uiLang: UILang): LearnLang[] =>
  (['ru', 'uk', 'en'] as LearnLang[]).filter(l => l !== uiLang);
