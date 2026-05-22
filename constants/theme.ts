// ─── ПАЛИТРА ────────────────────────────────────────────────────────────────
// Тёмная: Deep Forest Green (Duolingo-style) | Светлая: Warm Sage (Duolingo-style)

import { Platform } from 'react-native';
import { GOLD_GRADIENTS, GOLD_RICH } from './goldTheme';

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
  /** Подписи на тёмном градиенте экрана (хедер). У «гибридных» тем — см. ocean/sakura. */
  heroTextPrimary: '#F0F7F2',
  heroTextMuted:   '#8AB49A',
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
  /** Кнопки с заливкой t.gold — тёмный текст на ярком жёлтом (не #fff). */
  textOnGold:  '#1A1A1A',
  // Прогресс / активный
  accent:      '#47C870',
  accentBg:    'rgba(71,200,112,0.14)',
  // Текст на залитых CTA (t.accent / t.correct) — всегда через correctText, не хардкодить белый.
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
  bgGradient: ['#1A3525', '#07100A'] as [string, string],
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
  heroTextPrimary: '#F0F0F0',
  heroTextMuted:   '#A8A8A8',
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
  textOnGold:  '#1A1A00',
  // Прогресс / активный
  accent:      '#C8FF00',
  accentBg:    'rgba(200,255,0,0.10)',
  // Текст/иконки на залитых CTA: t.accent, t.correct, t.textSecond (пейволл). На неоновом лайме — только тёмный, не #fff.
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
  bgGradient: ['#1E1E1E', '#0A0A0A'] as [string, string],
};

export const GOLD = {
  // Black Gold — deep black surfaces, champagne metal accents, thin premium rims.
  bgPrimary:   GOLD_RICH.blackVoid,
  bgCard:      GOLD_RICH.blackPiano,
  bgSurface:   GOLD_RICH.graphite,
  bgSurface2:  GOLD_RICH.graphiteRaised,
  textPrimary: GOLD_RICH.ivory,
  textOnCard:  GOLD_RICH.ivory,
  textSecond:  GOLD_RICH.paleGold,
  textMuted:   GOLD_RICH.taupe,
  textGhost:   GOLD_RICH.taupeDeep,
  heroTextPrimary: GOLD_RICH.ivory,
  heroTextMuted:   GOLD_RICH.taupe,
  border:      GOLD_RICH.hairline,
  borderLight: '#24201A',
  correct:     GOLD_RICH.metalGold,
  correctBg:   GOLD_RICH.washStrong,
  wrong:       '#B65A4A',
  wrongBg:     'rgba(182,90,74,0.13)',
  gold:        GOLD_RICH.metalGold,
  goldBg:      GOLD_RICH.washStrong,
  textOnGold:  '#0A0702',
  accent:      GOLD_RICH.antiqueGold,
  accentBg:    GOLD_RICH.bronzeWash,
  correctText: '#0A0702',
  shadowDark:       '#000000',
  shadowLight:      'rgba(214,179,90,0.18)',
  borderHighlight:  GOLD_RICH.hairlineStrong,
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   GOLD_RICH.bronzeDark,
  cardShadow:  'rgba(0,0,0,0.78)',
  glow:        GOLD_RICH.bronzeWash,
  cardGradient: [GOLD_GRADIENTS.premiumPanel[0], GOLD_GRADIENTS.premiumPanel[2]] as [string, string],
  bgGradient: [GOLD_GRADIENTS.appBackground[0], GOLD_GRADIENTS.appBackground[2]] as [string, string],
};

export const CORAL = {
  // Coral / Finance Dark: soft rose screen background with warm cocoa surfaces.
  bgPrimary:   '#1C1113',
  bgCard:      '#21181B',
  bgSurface:   '#2D2024',
  bgSurface2:  '#3A2A2E',
  textPrimary: '#FFFFFF',
  textOnCard:  '#FFFFFF',
  textSecond:  '#FF6464',
  textMuted:   '#B9A6AE',
  textGhost:   '#75656C',
  heroTextPrimary: '#FFFFFF',
  heroTextMuted:   '#D8C2C5',
  border:      'rgba(255,100,100,0.15)',
  borderLight: '#2D2024',
  correct:     '#4A90FF',
  correctBg:   'rgba(74,144,255,0.14)',
  wrong:       '#FF6464',
  wrongBg:     'rgba(255,100,100,0.14)',
  gold:        '#FFD060',
  goldBg:      'rgba(255,208,96,0.14)',
  textOnGold:  '#1A1208',
  accent:      '#FF6464',
  accentBg:    'rgba(255,100,100,0.12)',
  correctText: '#FFFFFF',
  shadowDark:       '#050510',
  shadowLight:      'rgba(255,100,100,0.26)',
  borderHighlight:  'rgba(255,110,110,0.16)',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   '#6A1A2A',
  cardShadow:  'rgba(0,0,0,0.60)',
  glow:        'rgba(255,100,100,0.22)',
  cardGradient: ['#2E2226', '#0B0708'] as [string, string],
  bgGradient: ['#463036', '#251719'] as [string, string],
};

// ─── LIGHT OCEAN ─────────────────────────────────────────────────────────────
// Тёмная глубина + яркий циан; светлые карточки; как у «Сакуры» по структуре
export const LIGHT_OCEAN = {
  bgPrimary:   '#060C14',
  bgCard:      '#F0FAFF',
  bgSurface:   '#D8EEF8',
  bgSurface2:  '#C4E4F4',
  // Текст: на светлых карточках — нейтральные тёмные (не «голубой на голубом»)
  textPrimary: '#0A2540',
  textOnCard:  '#0A2540',
  textSecond:  '#003D5C',
  textMuted:   '#1A3344',
  textGhost:   '#4A5E6E',
  /** Тёмный фон экрана; в хедере — светлый текст */
  heroTextPrimary: '#EAF6FF',
  heroTextMuted:   'rgba(190, 224, 248, 0.92)',
  // Разделители
  border:      'rgba(80,200,255,0.28)',
  borderLight: '#1A3048',
  // Акценты
  correct:     '#0076C0',
  correctBg:   'rgba(0,118,192,0.12)',
  wrong:       '#C0392B',
  wrongBg:     'rgba(192,57,43,0.10)',
  // XP / Уровень
  gold:        '#8B5E00',
  goldBg:      'rgba(139,94,0,0.14)',
  textOnGold:  '#1A0F06',
  // Прогресс / активный
  accent:      '#0076C0',
  accentBg:    'rgba(0,118,192,0.12)',
  // Текст на залитых CTA (синий accent)
  correctText: '#FFFFFF',
  shadowDark:       'rgba(0,0,0,0.40)',
  shadowLight:      'rgba(0,200,255,0.32)',
  borderHighlight:  'rgba(0,200,255,0.30)',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  // Тени (legacy)
  btnShadow:   '#0068B0',
  cardShadow:  'rgba(0,40,80,0.32)',
  glow:        'rgba(0,180,255,0.24)',
  cardGradient: ['#FFFFFF', '#40C0F0'] as [string, string],
  bgGradient:   ['#135A82', '#0E2840', '#081828'] as unknown as [string, string],
};

// ─── LIGHT SAKURA ────────────────────────────────────────────────────────────
// Тёмный насыщенный винно-розовый фон; плитки/карточки светлые; CTA с текстом через correctText
export const LIGHT_SAKURA = {
  bgPrimary:   '#1A0812',
  bgCard:      '#FFFBFC',
  bgSurface:   '#FFF4F7',
  bgSurface2:  '#FFE8EF',
  // Текст: на светлых карточках — нейтральные/тёмные (не «розовый на розовом»)
  textPrimary: '#2D0A1A',
  textOnCard:  '#2D0A1A',
  textSecond:  '#5C0A32',
  textMuted:   '#3D242E',
  textGhost:   '#5C4A52',
  heroTextPrimary: '#FFF5F9',
  heroTextMuted:   'rgba(255, 214, 228, 0.92)',
  // Разделители
  border:      'rgba(255,160,200,0.28)',
  borderLight: '#3A1A28',
  // Акценты
  correct:     '#C0006A',
  correctBg:   'rgba(192,0,106,0.12)',
  wrong:       '#C0392B',
  wrongBg:     'rgba(192,57,43,0.10)',
  // XP / Уровень
  gold:        '#8B5E00',
  goldBg:      'rgba(139,94,0,0.14)',
  textOnGold:  '#1A0F06',
  // Прогресс / активный
  accent:      '#C0006A',
  accentBg:    'rgba(192,0,106,0.12)',
  // Текст на залитых CTA (розовый accent)
  correctText: '#FFFFFF',
  // Объём: тёмный пол + яркое сияние (насыщение, не серая «пыль»)
  shadowDark:       'rgba(0,0,0,0.40)',
  shadowLight:      'rgba(255,40,120,0.32)',
  borderHighlight:  'rgba(255,150,200,0.30)',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  // Тени (legacy)
  btnShadow:   '#B01050',
  cardShadow:  'rgba(0,0,0,0.32)',
  glow:        'rgba(255,60,130,0.24)',
  // Карточка: белый → яркий розовый блик; экран: сверху читаемая роза, к низу — глубокий винный
  cardGradient: ['#FFFFFF', '#E87098'] as [string, string],
  bgGradient:   ['#8A2A4E', '#3A0E1E', '#1A080E'] as unknown as [string, string],
};

// ─── MODERN MINIMAL (Apple-like) ─────────────────────────────────────────────
// Neutral grayscale, generous whitespace, rounded cards, subtle contrast.
export const MINIMAL_LIGHT = {
  // "Sketch" light: paper background + graphite ink accents.
  bgPrimary:   '#F3ECDC',
  bgCard:      '#FFFDF6',
  bgSurface:   '#DED4C0',
  bgSurface2:  '#CFC2AD',
  textPrimary: '#171615',
  textOnCard:  '#171615',
  textSecond:  '#273044',
  textMuted:   '#48443C',
  textGhost:   '#6A6256',
  heroTextPrimary: '#171615',
  heroTextMuted:   '#48443C',
  border:      'rgba(45,39,30,0.24)',
  borderLight: '#BCA98E',
  correct:     '#33466F',
  correctBg:   'rgba(51,70,111,0.16)',
  wrong:       '#873434',
  wrongBg:     'rgba(135,52,52,0.14)',
  gold:        '#76531F',
  goldBg:      'rgba(118,83,31,0.16)',
  textOnGold:  '#171615',
  accent:      '#343842',
  accentBg:    'rgba(52,56,66,0.15)',
  correctText: '#FFFFFF',
  shadowDark:       'rgba(34,28,18,0.20)',
  shadowLight:      'rgba(255,255,255,0.72)',
  borderHighlight:  'rgba(255,255,255,0.50)',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   'rgba(34,28,18,0.16)',
  cardShadow:  'rgba(34,28,18,0.16)',
  glow:        'rgba(52,56,66,0.16)',
  cardGradient: ['#FFFDF6', '#EDE3D2'] as [string, string],
  bgGradient: ['#F3ECDC', '#DED1BB'] as [string, string],
};

export const MINIMAL_DARK = {
  bgPrimary:   '#121212',
  bgCard:      '#232428',
  bgSurface:   '#2D2F34',
  bgSurface2:  '#363940',
  textPrimary: '#F5F5F5',
  textOnCard:  '#F5F5F5',
  textSecond:  '#6EA8FF',
  textMuted:   '#A7ABB3',
  textGhost:   '#747A84',
  heroTextPrimary: '#F5F5F5',
  heroTextMuted:   '#A7ABB3',
  border:      'rgba(255,255,255,0.14)',
  borderLight: '#3A3D44',
  correct:     '#6EA8FF',
  correctBg:   'rgba(110,168,255,0.18)',
  wrong:       '#F26D6D',
  wrongBg:     'rgba(242,109,109,0.16)',
  gold:        '#E9B949',
  goldBg:      'rgba(233,185,73,0.16)',
  textOnGold:  '#1A1A1A',
  accent:      '#6EA8FF',
  accentBg:    'rgba(110,168,255,0.18)',
  correctText: '#0E1A2F',
  shadowDark:       'rgba(0,0,0,0.5)',
  shadowLight:      'rgba(255,255,255,0.06)',
  borderHighlight:  'rgba(255,255,255,0.14)',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   'rgba(0,0,0,0.45)',
  cardShadow:  'rgba(0,0,0,0.42)',
  glow:        'rgba(110,168,255,0.16)',
  cardGradient: ['#31343B', '#23262C'] as [string, string],
  bgGradient: ['#1A1A1A', '#121212'] as [string, string],
};

export type ThemeMode = 'dark' | 'neon' | 'gold' | 'coral' | 'minimalLight' | 'minimalDark';
export type Theme = typeof DARK;

export function screenTextOnGradient(theme: Theme, _themeMode: ThemeMode): {
  primary: string;
  second: string;
  muted: string;
  ghost: string;
} {
  return {
    primary: theme.textPrimary,
    second: theme.textSecond,
    muted: theme.textMuted,
    ghost: theme.textGhost,
  };
}

// Убеждаемся, что все темы соответствуют одному типу (compile-time check)
const _checkNEON:   Theme = NEON         as any;
const _checkGOLD:   Theme = GOLD         as any;
const _checkCORAL:  Theme = CORAL        as any;
const _checkMINL:   Theme = MINIMAL_LIGHT as any;
const _checkMIND:   Theme = MINIMAL_DARK  as any;

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
    settings:  'Настройки',
  },
  home: {
    greeting:     (name: string) => `Привет, ${name}`,
    sub:          'Продолжим сегодня?',
    streakLabel:  'Цепочка',
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
    help:       'Помощь',
    premium:    'Premium',
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
    trial:    '3 дня бесплатно',
    price:    'Месячная или годовая — точная сумма в App Store / Google Play',
    cta:      'Начать 3 дня бесплатно',
    ctaSub:   'Оформить годовую подписку',
    locked:   'Premium открывает уроки после первых 3\nи квизы Medium/Hard',
    legal:    'Отмена в любое время в настройках App Store / Google Play.',
    freeCont: 'Продолжить бесплатно (Урок 1)',
    features: [
      'Уроки после первых 3',
      'Квизы всех уровней',
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

(() => {
  const p = STRINGS.premium;
  if (Platform.OS === 'ios') {
    p.price = 'Месячная или годовая — точная сумма в App Store.';
    p.legal = 'Отмена в любое время в настройках App Store (Подписки).';
  } else if (Platform.OS === 'android') {
    p.price = 'Месячная или годовая — точная сумма в Google Play.';
    p.legal = 'Отмена в любое время в настройках Google Play (Подписки).';
  } else {
    p.price = 'Месячная или годовая — точная сумма в магазине приложений.';
    p.legal = 'Отмена в любое время в разделе подписок магазина приложений.';
  }
})();

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

export const MAX_LEVEL = 60;

// Total XP to reach level L = 400 * (L-1)^1.82
// Level 2 = 400 XP, Level 50 ≈ 477 000 XP
// Inverse: L = floor((xp/400)^(1/1.82)) + 1
const XP_BASE = 400;
const XP_EXP = 1.82;
const XP_EXP_INV = 1 / XP_EXP; // ≈ 0.5495
const LEGENDARY_BASE_LEVEL = 50;
const LEGENDARY_XP_STEP = 150000;

const TOTAL_XP_FOR_STANDARD_LEVEL = (level: number): number => {
  if (level <= 1) return 0;
  return Math.round(XP_BASE * Math.pow(level - 1, XP_EXP));
};

const TOTAL_XP_FOR_LEGENDARY_LEVEL = (level: number): number => {
  const legendaryLevels = Math.max(0, level - LEGENDARY_BASE_LEVEL);
  return TOTAL_XP_FOR_STANDARD_LEVEL(LEGENDARY_BASE_LEVEL)
    + Math.round((LEGENDARY_XP_STEP * legendaryLevels * (legendaryLevels + 1)) / 2);
};

const normalizeLevelForXP = (level: number, totalXP: number): number => {
  let normalized = Math.max(1, Math.min(MAX_LEVEL, level));
  while (normalized < MAX_LEVEL && totalXP >= TOTAL_XP_FOR_LEVEL(normalized + 1)) {
    normalized += 1;
  }
  while (normalized > 1 && totalXP < TOTAL_XP_FOR_LEVEL(normalized)) {
    normalized -= 1;
  }
  return normalized;
};

export const TOTAL_XP_FOR_LEVEL = (level: number): number => {
  if (level <= 1) return 0;
  if (level <= LEGENDARY_BASE_LEVEL) return TOTAL_XP_FOR_STANDARD_LEVEL(level);
  return TOTAL_XP_FOR_LEGENDARY_LEVEL(level);
};

export const LEVEL_XP = (level: number): number =>
  Math.max(1, TOTAL_XP_FOR_LEVEL(level + 1) - TOTAL_XP_FOR_LEVEL(level));

export const getLevelFromXP = (totalXP: number): number => {
  if (totalXP <= 0) return 1;
  const firstLegendaryLevelXP = TOTAL_XP_FOR_LEGENDARY_LEVEL(LEGENDARY_BASE_LEVEL + 1);
  if (totalXP < firstLegendaryLevelXP) {
    const estimatedLevel = Math.min(
      LEGENDARY_BASE_LEVEL,
      Math.floor(Math.pow(totalXP / XP_BASE, XP_EXP_INV)) + 1,
    );
    return normalizeLevelForXP(estimatedLevel, totalXP);
  }

  const legendaryXP = totalXP - TOTAL_XP_FOR_STANDARD_LEVEL(LEGENDARY_BASE_LEVEL);
  const legendaryLevels = Math.floor(
    (Math.sqrt(1 + (8 * legendaryXP) / LEGENDARY_XP_STEP) - 1) / 2,
  );
  return normalizeLevelForXP(
    LEGENDARY_BASE_LEVEL + Math.max(0, legendaryLevels),
    totalXP,
  );
};

export const getXPProgress = (totalXP: number) => {
  const level = getLevelFromXP(totalXP);
  const xpForThis = TOTAL_XP_FOR_LEVEL(level);
  const xpNeeded = LEVEL_XP(level);
  const xpInLevel = Math.round(totalXP - xpForThis);
  const progress = level >= MAX_LEVEL ? 1 : xpInLevel / xpNeeded;
  return { level, xpInLevel, xpNeeded, progress };
};

/**
 * Максимальная энергия в зависимости от уровня.
 * Каждые 10 уровней даётся +1 слот энергии (базовые 5).
 */
export const getMaxEnergyForLevel = (level: number): number => {
  if (level >= 50) return 10;
  if (level >= 40) return 9;
  if (level >= 30) return 8;
  if (level >= 20) return 7;
  if (level >= 10) return 6;
  return 5;
};

/** Уровень на котором откроется следующий слот энергии (null если уже максимум) */
export const getNextEnergyUnlockLevel = (level: number): number | null => {
  if (level < 10) return 10;
  if (level < 20) return 20;
  if (level < 30) return 30;
  if (level < 40) return 40;
  if (level < 50) return 50;
  return null;
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
