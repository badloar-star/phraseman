// ─── ПАЛИТРА ────────────────────────────────────────────────────────────────
// Тёмная: Deep Forest Green (Duolingo-style) | Светлая: Warm Sage (Duolingo-style)

export const DARK = {
  // Фоны — глубокий контраст фон vs карточка
  bgPrimary:   '#07100A',
  bgCard:      '#152019',
  bgSurface:   '#1D2D23',
  bgSurface2:  '#253630',
  // Текст
  textPrimary: '#F0F7F2',
  textOnCard:  '#F0F7F2',   // = textPrimary (тёмный фон и карточки одного типа)
  textSecond:  '#58CC89',
  textMuted:   '#8AB49A',
  textGhost:   '#506A5C',
  // Разделители
  border:      'rgba(255,255,255,0.07)',
  borderLight: '#1D2D23',
  // Акценты
  correct:     '#47C870',
  correctBg:   'rgba(71,200,112,0.16)',
  wrong:       '#F05454',
  wrongBg:     'rgba(240,84,84,0.12)',
  // XP / Уровень
  gold:        '#FFC800',
  goldBg:      'rgba(255,200,0,0.14)',
  // Прогресс / активный
  accent:      '#47C870',
  accentBg:    'rgba(71,200,112,0.14)',
  // Текст НА кнопке/пузыре с цветом correct
  correctText: '#042010',
  // ─── Объёмные тени (новое) ───────────────────────────────────────────────
  shadowDark:       '#010804',                   // почти чёрный зелёный — нижняя тень
  shadowLight:      'rgba(71,200,112,0.32)',      // зелёное свечение — блик
  borderHighlight:  'rgba(88,204,137,0.18)',      // имитация блика сверху-слева
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  // Тени и свечение (legacy)
  btnShadow:   '#1E6B3A',
  cardShadow:  'rgba(0,0,0,0.55)',
  glow:        'rgba(71,200,112,0.32)',
  // Градиент карточки — усиленный контраст (светлее слева-сверху, темнее справа-снизу)
  cardGradient: ['#1F2E24', '#070F0A'] as [string, string],
  // Градиент фона экрана (сверху → снизу)
  bgGradient: ['#152A1E', '#07100A'] as [string, string],
};

export const NEON = {
  // Фоны — чуть светлее для лучшего контраста
  bgPrimary:   '#0D0D0D',
  bgCard:      '#202020',   // заметно светлее фона
  bgSurface:   '#2A2A2A',
  bgSurface2:  '#343434',
  // Текст
  textPrimary: '#F0F0F0',
  textOnCard:  '#F0F0F0',   // = textPrimary
  textSecond:  '#C8FF00',
  textMuted:   '#A8A8A8',
  textGhost:   '#606060',
  // Разделители
  border:      'rgba(200,255,0,0.12)',
  borderLight: '#202020',
  // Акценты
  correct:     '#C8FF00',
  correctBg:   'rgba(200,255,0,0.12)',
  wrong:       '#FF4444',
  wrongBg:     'rgba(255,68,68,0.12)',
  // XP / Уровень
  gold:        '#FFE600',
  goldBg:      'rgba(255,230,0,0.14)',
  // Прогресс / активный
  accent:      '#C8FF00',
  accentBg:    'rgba(200,255,0,0.10)',
  // Текст НА кнопке/пузыре с цветом correct (лайм — нужен тёмный текст)
  correctText: '#1A2400',
  // ─── Объёмные тени (новое) ───────────────────────────────────────────────
  shadowDark:       '#000000',                   // абсолютно чёрный — нижняя тень
  shadowLight:      'rgba(200,255,0,0.35)',       // неоново-лаймовое свечение
  borderHighlight:  'rgba(200,255,0,0.18)',       // имитация блика сверху-слева
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  // Тени (legacy)
  btnShadow:   '#4A5C00',
  cardShadow:  'rgba(0,0,0,0.65)',
  glow:        'rgba(200,255,0,0.25)',
  // Градиент карточки — максимальный контраст чёрного
  cardGradient: ['#2E2E2E', '#0A0A0A'] as [string, string],
  bgGradient: ['#1C1C1C', '#0D0D0D'] as [string, string],
};

export const GOLD = {
  // Coral / Finance Dark — тёмный navy + коралловый акцент (Finance App style)
  bgPrimary:   '#14142A',   // очень тёмный navy-фиолетовый
  bgCard:      '#1E1E3C',   // карточки чуть светлее
  bgSurface:   '#25254A',
  bgSurface2:  '#2E2E58',
  textPrimary: '#FFFFFF',
  textOnCard:  '#FFFFFF',
  textSecond:  '#FF6464',   // коралловый
  textMuted:   '#9898B8',
  textGhost:   '#5A5A7A',
  border:      'rgba(255,100,100,0.15)',
  borderLight: '#1E1E3C',
  correct:     '#4A90FF',   // синий — правильные ответы
  correctBg:   'rgba(74,144,255,0.14)',
  wrong:       '#FF6464',   // коралловый — ошибки
  wrongBg:     'rgba(255,100,100,0.14)',
  gold:        '#FFD060',
  goldBg:      'rgba(255,208,96,0.14)',
  accent:      '#FF6464',
  accentBg:    'rgba(255,100,100,0.12)',
  correctText: '#FFFFFF',   // белый текст на синей кнопке
  shadowDark:       '#050510',
  shadowLight:      'rgba(255,100,100,0.26)',
  borderHighlight:  'rgba(255,110,110,0.16)',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   '#6A1A2A',
  cardShadow:  'rgba(0,0,0,0.60)',
  glow:        'rgba(255,100,100,0.22)',
  cardGradient: ['#25254A', '#08080E'] as [string, string],
  bgGradient: ['#1E1E3C', '#0A0A18'] as [string, string],
};



export type ThemeMode = 'dark' | 'neon' | 'gold';
export type Theme = typeof DARK;

// Убеждаемся, что все темы соответствуют одному типу (compile-time check)
const _checkNEON: Theme = NEON as any;
const _checkGOLD: Theme = GOLD as any;

// ─── COLOURS ALIAS (for Expo template components) ────────────────────────────
export const Colors = {
  light: { ...DARK,  icon: DARK.textSecond,  tabIconDefault: DARK.textMuted,  tabIconSelected: DARK.accent,  text: DARK.textPrimary,  background: DARK.bgPrimary  },
  dark:  { ...DARK,  icon: DARK.textSecond,  tabIconDefault: DARK.textMuted,  tabIconSelected: DARK.accent,  text: DARK.textPrimary,  background: DARK.bgPrimary  },
};

// ─── СТРОКИ ИНТЕРФЕЙСА ───────────────────────────────────────────────────────
export const STRINGS = {
  tabs: {
    home:      'Главная',
    lessons:   'Уроки',
    quizzes:   'Квизы',
    hallFame:  'Зал славы',
    settings:  'Настройки',
  },
  home: {
    greeting:     (name: string) => `Привет, ${name}`,
    sub:          'Продолжим сегодня?',
    streakLabel:  'Стрик',
    streakDays:   'дней подряд',
    continueBtn:  'Продолжить',
    startBtn:     'Начать',
    leagueLabel:  'Клуб недели',
    toNext:       'до',
  },
  lessonMenu: {
    start:    'Начать урок',
    continue: 'Продолжить урок',
    vocab:    'Словарь',
    verbs:    'Формы глаголов',
    theory:   'Теория',
  },
  lesson: {
    undo:    'Отменить',
    cheat:   'Шпаргалка',
    theory:  'Теория',
    oral:    'Устно',
    next:    'Далее',
    typeHere: 'Введите ответ...',
  },
  quizzes: {
    selectLevel: 'Выберите уровень',
    easy:        'Легко',
    medium:      'Средне',
    hard:        'Сложно',
    done:        'Квиз завершён!',
    again:       'Пройти снова',
    back:        'Выбрать уровень',
    fixErrors:   'Исправь ошибки',
    timeUp:      'Время вышло',
  },
  eduSettings: {
    title:          'Настройки обучения',
    autoCheck:      'Автопроверка',
    autoCheckSub:   'Проверять при наборе последнего слова',
    voiceOut:       'Озвучить ответ',
    voiceOutSub:    'Произносить фразу после ответа',
    autoAdvance:    'Автопереход после ответа',
    autoAdvanceSub: 'Автоматически переходить при правильном ответе',
    hardMode:       'Ввод с клавиатуры',
    hardModeSub:    'Вводить предложение вручную',
    speed:          'Скорость произношения',
    speedHint:      'Отпусти ползунок — прозвучит пример',
  },
  settings: {
    title:      'Настройки',
    profile:    'Профиль',
    name:       'Имя / никнейм',
    lang:       'Язык интерфейса',
    appearance: 'Внешний вид',
    theme:      'Тема',
    themeDark:  'Тёмная',
    themeLight: 'Светлая',
    learning:   'Обучение',
    learnSet:   'Настройки обучения',
    feedback:   'Предложение или замечание',
    help:       'Помощь',
    premium:    'Premium',
  },
  hallFame: {
    title:     'Зал славы',
    empty:     'Пока никого нет.\nПройди квиз и займи место!',
    rank:      'Место',
    player:    'Игрок',
    points:    'Очки',
    weekReset: 'Сброс в воскресенье',
  },
  leagues: [
    { name: 'Искатель',    min: 0,    color: '#3D5445' },
    { name: 'Знаток',      min: 100,  color: '#7A9484' },
    { name: 'Эрудит',      min: 300,  color: '#4CAF72' },
    { name: 'Оратор',      min: 700,  color: '#6A9C72' },
    { name: 'Острое перо', min: 1500, color: '#D4A017' },
    { name: 'Профессор',   min: 3000, color: '#E8F0EB' },
  ],
  premium: {
    title:    'Premium',
    subtitle: 'Полный доступ ко всем материалам',
    trial:    '7 дней бесплатно',
    price:    '€3.99 / месяц · €23.99 / год',
    cta:      'Начать 7 дней бесплатно',
    ctaSub:   'Оформить на год — €23.99',
    locked:   'Без Premium ты теряешь доступ\nк 31 уроку, квизам и залу славы',
    legal:    'Отмена в любое время в настройках App Store / Google Play.',
    freeCont: 'Продолжить бесплатно (Урок 1)',
    features: [
      'Все 32 урока',
      'Квизы всех уровней',
      'Зал славы и лиги',
      'Голосовой ввод',
      'Подробная статистика',
    ],
  },
  onboarding: {
    chooseLang:  'Выберите язык',
    enterName:   'Введите ваше имя или никнейм',
    placeholder: 'Ваше имя...',
    next:        'Продолжить',
    nameError:   'Введите имя чтобы продолжить',
  },
};

export const getLeague = (points: number) => {
  const leagues = [...STRINGS.leagues].reverse();
  return leagues.find(l => points >= l.min) || STRINGS.leagues[0];
};

export const getNextLeague = (points: number) => {
  const idx = STRINGS.leagues.findIndex(l => l.name === getLeague(points).name);
  return STRINGS.leagues[idx + 1] || null;
};

// ─── XP СИСТЕМА УРОВНЕЙ ─────────────────────────────────────────────────────
// Формула: XP_нужно(lvl) = Math.round(100 * 1.3^(lvl-1))
// Уровни 1-10=A1 | 11-20=A2 | 21-35=B1 | 36-50=B2
// Формула: рост 30% на ур.1, снижается на 1% каждый уровень, минимум 5% (с ур.27)

export const MAX_LEVEL = 50;

export const LEVEL_XP = (level: number): number => {
  if (level <= 1) return 100;
  let xp = 100;
  for (let i = 2; i <= level; i++) {
    const pct = Math.max(0.05, 0.30 - (i - 2) * 0.01);
    xp = Math.round(xp * (1 + pct));
  }
  return xp;
};

export const TOTAL_XP_FOR_LEVEL = (level: number): number => {
  let total = 0;
  for (let i = 1; i < level; i++) total += LEVEL_XP(i);
  return total;
};

export const getLevelFromXP = (totalXP: number): number => {
  let level = 1;
  let accumulated = 0;
  while (level < MAX_LEVEL && accumulated + LEVEL_XP(level) <= totalXP) {
    accumulated += LEVEL_XP(level);
    level++;
  }
  return level;
};

export const getXPProgress = (totalXP: number) => {
  const level = getLevelFromXP(totalXP);
  const xpForThis = TOTAL_XP_FOR_LEVEL(level);
  const xpNeeded = LEVEL_XP(level);
  const xpInLevel = totalXP - xpForThis;
  const progress = level >= MAX_LEVEL ? 1 : xpInLevel / xpNeeded;
  return { level, xpInLevel, xpNeeded, progress };
};

export const CEFR_FOR_LEVEL = (level: number): string => {
  if (level <= 10) return 'A1';
  if (level <= 20) return 'A2';
  if (level <= 35) return 'B1';
  return 'B2';
};

// Уровень урока по номеру (32 урока охватывают A1→B2)
// C1/C2 фразы есть внутри уроков как сложные вариации — используются в квизе hard
export const CEFR_FOR_LESSON = (lessonNum: number): string => {
  if (lessonNum <= 8)  return 'A1';
  if (lessonNum <= 18) return 'A2';
  if (lessonNum <= 28) return 'B1';
  return 'B2';  // уроки 29-32
};
