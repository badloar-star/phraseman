import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'ru' | 'uk';

// ─── ПЕРЕВОДЫ ────────────────────────────────────────────────────────────────
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
    lang: 'Язык интерфейса', appearance: 'Внешний вид',
    theme: 'Тема', themeDark: 'Тёмная', themeLight: 'Светлая',
    learning: 'Обучение', learnSet: 'Настройки обучения',
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
    lang: 'Мова інтерфейсу', appearance: 'Зовнішній вигляд',
    theme: 'Тема', themeDark: 'Темна', themeLight: 'Світла',
    learning: 'Навчання', learnSet: 'Налаштування навчання',
    feedback: 'Пропозиція або зауваження', help: 'Допомога',
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
  },
  words: {
    title: (n: number) => `${n}. Словник`,
    training: 'Тренування', wordList: 'Список слів',
    allLearned: 'Всі слова вивчено!',
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
    enterName: 'Введіть ваше імʼя або нікнейм',
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
    features: ['Всі 32 уроки','Квізи всіх рівнів','Зал слави та ліги','Голосове введення','Докладна статистика'],
  },
};

export type Strings = typeof RU;

// ─── КОНТЕКСТ ────────────────────────────────────────────────────────────────
interface LangCtx {
  lang: Lang;
  s: Strings;
  setLang: (l: Lang) => Promise<void>;
}

const LangContext = createContext<LangCtx>({
  lang: 'ru',
  s: RU,
  setLang: async () => {},
});

export const LangProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Lang>('ru');

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(v => {
      if (v === 'ru' || v === 'uk') {
        setLangState(v);
      }
    });
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    await AsyncStorage.setItem('app_lang', l);
    setLangState(l); // вызывает ре-рендер всего дерева
  }, []);

  return (
    <LangContext.Provider value={{ lang, s: lang === 'uk' ? UK : RU, setLang }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);

// ─── УТИЛИТЫ ────────────────────────────────────────────────────────────────
export const getLeague = (points: number, lang: Lang = 'ru') => {
  const leagues = lang === 'uk' ? [...UK.leagues].reverse() : [...RU.leagues].reverse();
  return leagues.find(l => points >= l.min) || (lang === 'uk' ? UK.leagues[0] : RU.leagues[0]);
};

export const getNextLeague = (points: number, lang: Lang = 'ru') => {
  const leagues = lang === 'uk' ? UK.leagues : RU.leagues;
  const current = getLeague(points, lang);
  const idx = leagues.findIndex(l => l.name === current.name);
  return leagues[idx + 1] || null;
};
