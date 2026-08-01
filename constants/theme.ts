// ─── ПАЛИТРА ────────────────────────────────────────────────────────────────
// Тёмная: Deep Forest Green (Duolingo-style) | Светлая: Warm Sage (Duolingo-style)

import { Platform } from 'react-native';
import { GOLD_GRADIENTS, GOLD_RICH } from './goldTheme';
import { CINEMA, cinemaAlpha, type CinemaPalette } from './cinemaThemes';

export const DARK = {
  // Фоны — глубокий контраст фон vs карточка
  bgPrimary:   '#030604',
  bgCard:      '#101710',
  bgSurface:   '#17241A',
  bgSurface2:  '#203028',
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
  cardGradient: ['#2B4A32', '#070B08'] as [string, string],
  // Градиент фона экрана (сверху → снизу)
  bgGradient: ['#050B06', '#010101'] as [string, string],
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
  bgGradient: ['#0D0A04', '#010101'] as [string, string],
};

export const CORAL = {
  // Coral / Finance Dark: soft rose screen background with warm cocoa surfaces.
  bgPrimary:   '#090405',
  bgCard:      '#171013',
  bgSurface:   '#22171B',
  bgSurface2:  '#302126',
  textPrimary: '#FFFFFF',
  textOnCard:  '#FFFFFF',
  textSecond:  '#FF8A66',
  textMuted:   '#B9A6AE',
  textGhost:   '#75656C',
  heroTextPrimary: '#FFFFFF',
  heroTextMuted:   '#D8C2C5',
  border:      'rgba(255,127,80,0.15)',
  borderLight: '#2D2024',
  correct:     '#4A90FF',
  correctBg:   'rgba(74,144,255,0.14)',
  wrong:       '#FF6464',
  wrongBg:     'rgba(255,100,100,0.14)',
  gold:        '#FFD060',
  goldBg:      'rgba(255,208,96,0.14)',
  textOnGold:  '#1A1208',
  accent:      '#FF7F50',
  accentBg:    'rgba(255,127,80,0.12)',
  correctText: '#FFFFFF',
  shadowDark:       '#050510',
  shadowLight:      'rgba(255,127,80,0.26)',
  borderHighlight:  'rgba(255,140,100,0.16)',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   '#8A3A1E',
  cardShadow:  'rgba(0,0,0,0.60)',
  glow:        'rgba(255,127,80,0.22)',
  cardGradient: ['#3A242B', '#070304'] as [string, string],
  bgGradient: ['#0E0507', '#010101'] as [string, string],
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
export const MINIMAL_DARK = {
  // Legacy minimalDark palette retained only for stored-data and asset compatibility.
  bgPrimary:   '#0B0B0C',
  bgCard:      '#121214',
  bgSurface:   '#171717',
  bgSurface2:  '#202024',
  textPrimary: '#F5F5F5',
  textOnCard:  '#F5F5F5',
  textSecond:  '#6EA8FF',
  textMuted:   '#A7ABB3',
  textGhost:   '#747A84',
  heroTextPrimary: '#F5F5F5',
  heroTextMuted:   '#A7ABB3',
  border:      'rgba(255,255,255,0.14)',
  borderLight: '#2E2E33',
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
  cardGradient: ['#1F2937', '#0B0B0C'] as [string, string],
  bgGradient: ['#0B0B0C', '#010102'] as [string, string],
};

// ─── «ЧЁРНОЕ КИНО» (midnight/ember/aurora/volt) ──────────────────────────────
// Чистый чёрный + двухцветный блум снизу (рисуется слоем CinemaBloom в
// ScreenGradient). Палитры — constants/cinemaThemes.ts; здесь только маппинг
// спектра на токены Theme.
const buildCinemaTheme = (p: CinemaPalette) => ({
  bgPrimary:   '#010102',
  bgCard:      p.card,
  bgSurface:   p.surface,
  bgSurface2:  p.surface2,
  textPrimary: '#FFFFFF',
  textOnCard:  '#FFFFFF',
  textSecond:  p.second,
  textMuted:   p.textMuted,
  textGhost:   p.textGhost,
  heroTextPrimary: '#FFFFFF',
  heroTextMuted:   p.textMuted,
  // Кромки — в цвет акцента (как у «Компаса» шампань-hairline): именно они
  // несут колорит на каждой карточке/плитке по всему приложению.
  border:      cinemaAlpha(p.accent, 0.17),
  borderLight: p.borderLight,
  correct:     p.correct,
  correctBg:   cinemaAlpha(p.correct, 0.16),
  wrong:       p.wrong,
  wrongBg:     cinemaAlpha(p.wrong, 0.16),
  gold:        p.gold,
  goldBg:      cinemaAlpha(p.gold, 0.16),
  textOnGold:  p.onGold,
  accent:      p.accent,
  accentBg:    cinemaAlpha(p.accent, 0.18),
  correctText: p.onAccent,
  shadowDark:       '#000000',
  shadowLight:      cinemaAlpha(p.accent, 0.36),
  borderHighlight:  cinemaAlpha(p.accent, 0.30),
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   p.btnShadow,
  cardShadow:  'rgba(0,0,0,0.60)',
  glow:        cinemaAlpha(p.bloomA, 0.38),
  cardGradient: [p.cardGradient[0], p.cardGradient[1]] as [string, string],
  bgGradient: [p.bgGradient3[0], p.bgGradient3[2]] as [string, string],
});

export const MIDNIGHT = buildCinemaTheme(CINEMA.midnight);
export const EMBER    = buildCinemaTheme(CINEMA.ember);
export const AURORA   = buildCinemaTheme(CINEMA.aurora);
export const VOLT     = buildCinemaTheme(CINEMA.volt);

// ─── «БИЗНЕС» (business) ─────────────────────────────────────────────────────
// Инстаграм-язык, тёмный: чистый чёрный фон, БЕЗ карточек-контейнеров с
// обводками — секции разделяются волосяными линиями (hairline). Никаких
// градиентов, теней и объёма; тонкие иконки и тонкий текст. Единственный
// цветной акцент — синий (ссылки/CTA/прогресс), ошибка — инстаграмный красный.
// Обе business-темы включают ГЛОБАЛЬНЫЙ плоский режим — см. isFlatMode().
export const BUSINESS = {
  bgPrimary:   '#000000',
  bgCard:      '#0A0A0A',
  bgSurface:   '#121212',
  bgSurface2:  '#1A1A1A',
  textPrimary: '#F5F5F5',
  textOnCard:  '#F5F5F5',
  textSecond:  '#A8A8A8',
  textMuted:   '#737373',
  textGhost:   '#4D4D4D',
  heroTextPrimary: '#F5F5F5',
  heroTextMuted:   '#737373',
  // Волосяные разделители вместо рамок контейнеров.
  border:      'rgba(255,255,255,0.15)',
  borderLight: '#262626',
  // Верно/CTA: инстаграмный синий; кнопки «Продолжить» (через correct) — тоже.
  correct:     '#0095F6',
  correctBg:   'rgba(0,149,246,0.12)',
  // Ошибка: инстаграмный красный.
  wrong:       '#ED4956',
  wrongBg:     'rgba(237,73,86,0.12)',
  // XP / Уровень — нейтральный светлый (в этой теме нет «золота»).
  gold:        '#E6E6E6',
  goldBg:      'rgba(255,255,255,0.10)',
  textOnGold:  '#000000',
  // Прогресс / активный — синий.
  accent:      '#0095F6',
  accentBg:    'rgba(0,149,246,0.12)',
  // Текст на залитых синих CTA — белый.
  correctText: '#FFFFFF',
  shadowDark:       'rgba(0,0,0,0)',
  shadowLight:      'rgba(0,0,0,0)',
  borderHighlight:  'rgba(255,255,255,0.15)',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   'rgba(0,0,0,0)',
  cardShadow:  'rgba(0,0,0,0)',
  glow:        'rgba(0,0,0,0)',
  // Плоскость: «градиенты» вырождены в один цвет — карточки и фон без переливов.
  cardGradient: ['#0A0A0A', '#0A0A0A'] as [string, string],
  bgGradient:  ['#000000', '#000000'] as [string, string],
};

// ─── «БИЗНЕС СВЕТЛЫЙ» (businessLight) ────────────────────────────────────────
// Инстаграм-язык, светлый: чистый белый фон, волосяные линии #DBDBDB вместо
// рамок, тонкий тёмный текст #262626, серые подписи #8E8E8E, синий акцент.
// Никаких теней, градиентов и объёма. Включает глобальный плоский режим.
export const BUSINESS_LIGHT = {
  bgPrimary:   '#FFFFFF',
  bgCard:      '#FFFFFF',
  bgSurface:   '#FAFAFA',
  bgSurface2:  '#EFEFEF',
  textPrimary: '#262626',
  textOnCard:  '#262626',
  textSecond:  '#555555',
  textMuted:   '#8E8E8E',
  textGhost:   '#C7C7C7',
  heroTextPrimary: '#262626',
  heroTextMuted:   '#8E8E8E',
  // Волосяные разделители.
  border:      '#DBDBDB',
  borderLight: '#EFEFEF',
  // Верно/CTA: инстаграмный синий.
  correct:     '#0095F6',
  correctBg:   'rgba(0,149,246,0.10)',
  // Ошибка: инстаграмный красный.
  wrong:       '#ED4956',
  wrongBg:     'rgba(237,73,86,0.10)',
  // XP / Уровень — нейтральный тёмный (без «золота»).
  gold:        '#262626',
  goldBg:      '#EFEFEF',
  textOnGold:  '#262626',
  // Прогресс / активный — синий.
  accent:      '#0095F6',
  accentBg:    'rgba(0,149,246,0.10)',
  // Текст на залитых синих CTA — белый.
  correctText: '#FFFFFF',
  shadowDark:       'rgba(0,0,0,0)',
  shadowLight:      'rgba(0,0,0,0)',
  borderHighlight:  '#DBDBDB',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   'rgba(0,0,0,0)',
  cardShadow:  'rgba(0,0,0,0)',
  glow:        'rgba(0,0,0,0)',
  cardGradient: ['#FFFFFF', '#FFFFFF'] as [string, string],
  bgGradient:  ['#FFFFFF', '#FFFFFF'] as [string, string],
};

// Legacy candyBlue palette retained only for stored-data and asset compatibility.
// Тёмная холодная синева + нежный «леденцовый» голубой акцент. На залитых
// акцентом CTA — тёмный текст (UI Contrast Rule, как у lime/green тем).
export const CANDY_BLUE = {
  bgPrimary:   '#0B161B',
  bgCard:      '#122229',
  bgSurface:   '#16282F',
  bgSurface2:  '#1C323B',
  textPrimary: '#EAF4F8',
  textOnCard:  '#EAF4F8',
  textSecond:  '#9DB9C4',
  textMuted:   '#7FA0AD',
  textGhost:   '#4E6A76',
  heroTextPrimary: '#EAF4F8',
  heroTextMuted:   '#7FA0AD',
  border:      'rgba(178,213,229,0.14)',
  borderLight: '#24383F',
  correct:     '#B2D5E5',
  correctBg:   'rgba(178,213,229,0.16)',
  wrong:       '#F26D6D',
  wrongBg:     'rgba(242,109,109,0.14)',
  gold:        '#FFC53D',
  goldBg:      'rgba(255,197,61,0.14)',
  textOnGold:  '#1A1408',
  accent:      '#B2D5E5',
  accentBg:    'rgba(178,213,229,0.14)',
  correctText: '#07110A',
  shadowDark:       'rgba(0,0,0,0.5)',
  shadowLight:      'rgba(178,213,229,0.18)',
  borderHighlight:  'rgba(178,213,229,0.14)',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   '#3A5A68',
  cardShadow:  'rgba(0,0,0,0.45)',
  glow:        'rgba(178,213,229,0.16)',
  cardGradient: ['#122229', '#0E1C22'] as [string, string],
  bgGradient: ['#0B161B', '#050C0F', '#010203'] as unknown as [string, string],
};

// ─── «ИНДИГО» (indigo) ───────────────────────────────────────────────────────
// Тёмный индиго-сумрак + мягкий лавандовый акцент; на залитых CTA — тёмный
// текст #17162B. Вторичный оттенок градиентов — royal dusk #273468.
export const INDIGO = {
  bgPrimary:   '#14131F',
  bgCard:      '#1C1B2E',
  bgSurface:   '#222140',
  bgSurface2:  '#2A2952',
  textPrimary: '#F1EFFF',
  textOnCard:  '#F1EFFF',
  textSecond:  '#B7B3D9',
  textMuted:   '#9A95C2',
  textGhost:   '#605C8A',
  heroTextPrimary: '#F1EFFF',
  heroTextMuted:   '#9A95C2',
  border:      'rgba(200,195,255,0.14)',
  borderLight: '#34325E',
  correct:     '#C8C3FF',
  correctBg:   'rgba(200,195,255,0.16)',
  wrong:       '#F26D8A',
  wrongBg:     'rgba(242,109,138,0.14)',
  gold:        '#FFC53D',
  goldBg:      'rgba(255,197,61,0.14)',
  textOnGold:  '#1A1408',
  accent:      '#C8C3FF',
  accentBg:    'rgba(200,195,255,0.14)',
  correctText: '#17162B',
  shadowDark:       'rgba(0,0,0,0.5)',
  shadowLight:      'rgba(200,195,255,0.18)',
  borderHighlight:  'rgba(200,195,255,0.14)',
  isGlowEnabled:    false,
  isGlossEnabled:   false,
  btnShadow:   '#3D3A72',
  cardShadow:  'rgba(0,0,0,0.45)',
  glow:        'rgba(200,195,255,0.16)',
  cardGradient: ['#273468', '#16152A'] as [string, string],
  bgGradient: ['#14131F', '#0C0B16', '#010102'] as unknown as [string, string],
};

export const SAGE_PORCELAIN = {
  bgPrimary:'#F0F1EC', bgCard:'#FCFDF9', bgSurface:'#E1E5DC', bgSurface2:'#D1D9D1', textPrimary:'#17201D', textOnCard:'#17201D', textSecond:'#3C5A50', textMuted:'#52605A', textGhost:'#61706A', heroTextPrimary:'#17201D', heroTextMuted:'#52605A', border:'#CFD6CE', borderLight:'#BDC8BD', correct:'#2F6F4F', correctBg:'#DCEADF', wrong:'#A8464D', wrongBg:'#F2DFE0', gold:'#8B6320', goldBg:'#EEE5D1', textOnGold:'#FFFFFF', accent:'#315F50', accentBg:'#D9E9E1', correctText:'#FFFFFF', shadowDark:'#23322B', shadowLight:'rgba(252,253,249,0.78)', borderHighlight:'rgba(252,253,249,0.92)', isGlowEnabled:false, isGlossEnabled:false, btnShadow:'#264A3F', cardShadow:'rgba(35,50,43,0.14)', glow:'rgba(49,95,80,0.10)', cardGradient:['#FCFDF9','#F5F7F2'] as [string,string], bgGradient:['#F7F8F4','#E7EAE3'] as [string,string]
};

export type ThemeMode = 'dark' | 'gold' | 'coral' | 'minimalDark' | 'midnight' | 'ember' | 'aurora' | 'volt' | 'business' | 'businessLight' | 'candyBlue' | 'indigo' | 'sagePorcelain';
export type Theme = typeof DARK;

export function isLightThemeMode(mode: ThemeMode): boolean { return mode === 'sagePorcelain'; }

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
const _checkGOLD:   Theme = GOLD         as any;
const _checkCORAL:  Theme = CORAL        as any;
const _checkMIND:   Theme = MINIMAL_DARK  as any;
const _checkMIDNIGHT: Theme = MIDNIGHT as any;
const _checkEMBER:    Theme = EMBER    as any;
const _checkAURORA:   Theme = AURORA   as any;
const _checkVOLT:     Theme = VOLT     as any;
const _checkBUSINESS: Theme = BUSINESS as any;
const _checkBUSINESS_LIGHT: Theme = BUSINESS_LIGHT as any;
const _checkCANDY_BLUE: Theme = CANDY_BLUE as any;
const _checkSAGE_PORCELAIN: Theme = SAGE_PORCELAIN as any;
const _checkINDIGO: Theme = INDIGO as any;

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
    quizzes:   'Вызовы',
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
    typeHere: 'Введи ответ...',
  },
  quizzes: {
    selectLevel: 'Выбери уровень',
    easy:        'Легко',
    medium:      'Средне',
    hard:        'Сложно',
    done:        'Вызов завершён!',
    again:       'Пройти снова',
    back:        'Выбери уровень',
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
    locked:   'Premium открывает уроки после A1\nи снимает дневные лимиты',
    legal:    'Отмена в любое время в настройках App Store / Google Play.',
    freeCont: 'Продолжить бесплатно (Урок 1)',
    features: [
      'Уроки после A1',
      'Вызовы без дневного лимита',
      'Голосовой ввод',
      'Подробная статистика',
    ],
  },
  onboarding: {
    chooseLang:  'Выбери язык',
    enterName:   'Введи своё имя или никнейм',
    placeholder: 'Твоё имя...',
    next:        'Продолжить',
    nameError:   'Введи имя, чтобы продолжить',
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
 * Пять слотов доступны до 49 уровня; на 50 уровне открывается один дополнительный слот.
 */
export const getMaxEnergyForLevel = (level: number, baseEnergy: number = 5): number => {
  const safeBase = Number.isFinite(baseEnergy) ? Math.max(1, Math.floor(baseEnergy)) : 5;
  return safeBase + (level >= 50 ? 1 : 0);
};

/** Уровень на котором откроется следующий слот энергии (null если уже максимум) */
export const getNextEnergyUnlockLevel = (level: number): number | null => {
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
