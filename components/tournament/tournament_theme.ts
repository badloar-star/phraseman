// ═══════════════════════════════════════════════════════════════════════════
// tournament_theme.ts — токены режима «Турниры» (Deep Forest Green).
//
// зачем: перенесены 1:1 из утверждённого прототипа
// (docs/design/tournaments/prototype/src/data/players.ts), чтобы экраны в
// приложении совпадали с 47 макетами попиксельно.
//
// ГЛАВНОЕ ПРАВИЛО ВЛАДЕЛЬЦА: контейнеры БЕЗ обводок. Разделяем тоном
// (card → elev → elev2), тенью и внутренним бликом сверху (innerLight).
// borderWidth/borderColor вокруг блоков в этом режиме запрещены.
// ═══════════════════════════════════════════════════════════════════════════

export const T = Object.freeze({
  bg: '#070C08',
  card: '#101710',
  elev: '#17241A',
  elev2: '#1D2E22',
  text: '#F0F7F2',
  muted: '#8AB49A',
  ghost: '#5B7A67',
  accent: '#47C870',
  accentSoft: 'rgba(71,200,112,0.14)',
  accentText: '#042010',
  accentDark: '#1E6B3A',
  gold: '#FFD43B',
  goldSoft: 'rgba(255,212,59,0.12)',
  goldText: '#B98A1B',
  goldDark: '#7D5F0E',
  silver: '#C9D4DC',
  bronze: '#D29A6A',
  danger: '#FF5B6C',
  dangerSoft: 'rgba(255,91,108,0.12)',
  dangerDark: '#7A2530',
  streak: '#FB923C',
  // зачем: раньше сезонные лидеры/аватары красились хардкод-хексами прямо в
  // экранах (tournaments.tsx/tournament_season.tsx) — это ломало единый
  // токен-набор режима. Выносим палитру аватаров сюда, рядом с остальными T.*.
  leaderWolf: '#8AB49A',
  leaderCrown: '#FFD43B',
  leaderSword: '#FF5B6C',
  leaderGlobe: '#3B82F6',
  leaderBow: '#47C870',
  leaderFox: '#FB923C',
  leaderOwl: '#47C870',
  leaderBolt: '#FFD43B',
});

export const radius = Object.freeze({ lg: 26, md: 18, sm: 12 });

/**
 * Мягкий внутренний блик сверху — заменяет бордер.
 * RN не поддерживает inset-тени, поэтому кладём тонкую полосу отдельным View
 * (см. Card в tournament_ui.tsx).
 */
export const INNER_LIGHT = 'rgba(255,255,255,0.045)';

/** Типографика: крупная, без микро-текста (правило владельца). */
export const type = Object.freeze({
  hero: { fontSize: 64, fontWeight: '900' as const, letterSpacing: -1 },
  title: { fontSize: 28, fontWeight: '900' as const, letterSpacing: -0.8 },
  section: { fontSize: 22, fontWeight: '900' as const, letterSpacing: -0.4 },
  card: { fontSize: 17, fontWeight: '800' as const },
  body: { fontSize: 15, fontWeight: '600' as const },
  label: { fontSize: 13, fontWeight: '700' as const },
});

/** Тайминги. Spring для появлений, ease-out для переходов состояний. */
export const motion = Object.freeze({
  /** Pop-in карточек и игроков в лобби. */
  popIn: { damping: 14, stiffness: 190, mass: 0.9 },
  /** FLIP-перестановка строк таблицы между раундами. */
  reorder: { damping: 18, stiffness: 140, mass: 1 },
  /** Быстрый отклик на нажатие. */
  press: { damping: 20, stiffness: 400 },
  /** Пауза после фидбека ответа перед следующим вопросом (§4 спеки). */
  answerFeedbackMs: 1400,
  /** Показ таблицы между раундами. */
  tableHoldMs: 11000,
});

/**
 * Единый формат таймера (§ спеки): <1ч → MM:SS, <24ч → H:MM:SS,
 * ≥24ч → «Nд» + H:MM. Везде tabular-nums, чтобы цифры не «прыгали».
 */
export function formatTimeLeft(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  if (days >= 1) return `${days}д ${hours}:${pad(minutes)}`;
  if (hours >= 1) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** Цвет медали по месту — для подиума и таблицы. */
export function placeColor(place: number, P: TournamentPalette = T as TournamentPalette): string {
  if (place === 1) return P.gold;
  if (place === 2) return P.silver;
  if (place === 3) return P.bronze;
  return P.muted;
}

/** Медаль-эмодзи призовых мест. */
export function placeMedal(place: number): string {
  return place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '';
}

// ── Палитра от АКТИВНОЙ темы приложения ─────────────────────────────────────
// зачем: владелец 2026-07-26 — «турнир не слушает цвета активной темы».
// Раньше T была статичной копией Deep Forest Green из макетов: в золотой,
// коралловой и любой другой теме турниры оставались тёмно-зелёными.
// Теперь палитра собирается из полей выбранной темы, формат тот же — экраны
// переходят заменой `T` на `useTournamentTheme()` без переписывания стилей.

import type { Theme, ThemeMode } from '../../constants/theme';

export type TournamentPalette = { readonly [K in keyof typeof T]: string };

export function tournamentPaletteFromTheme(t: Theme): TournamentPalette {
  return {
    ...(T as TournamentPalette),
    bg: t.bgPrimary,
    card: t.bgCard,
    elev: t.bgSurface,
    elev2: t.bgSurface2,
    text: t.textPrimary,
    muted: t.textMuted,
    ghost: t.textGhost,
    accent: t.accent,
    accentSoft: t.accentBg,
    gold: t.gold,
    goldSoft: t.goldBg,
    danger: t.wrong,
    dangerSoft: t.wrongBg,
  };
}

// ── Производные V2 ──────────────────────────────────────────────────────────
// зачем: владелец утвердил макеты «Турниры в языке Learning V2»
// (эталон docs/v2/mockups/02-phrase-builder.html): градиентные чипы с
// 3D-кромкой, CTA с переливом и полкой, sheen-фон, hero-градиент по цифрам.
// Все производные считаются из токенов АКТИВНОЙ темы — как color-mix в макете.

/** Смешение hex-цветов: t — доля цвета a (0..1). Только #RRGGBB. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sa: number, sb: number) => Math.round(sa * t + sb * (1 - t));
  const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
  const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = ch(pa & 255, pb & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1).toUpperCase()}`;
}

const tint = (c: string, t: number) => mixHex('#FFFFFF', c, t);
const shade = (c: string, keep: number) => mixHex(c, '#000000', keep);

/** rgba() от hex — для sheen/переливов, где нужна прозрачность акцента. */
export function hexToRgba(hex: string, alpha: number): string {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${alpha})`;
}

/** Металл наград: 3 стопа, тёплый блик (НЕ белый). Не темизируется. */
export const METAL = Object.freeze({
  gold: ['#D19E1D', '#FFD86E', '#E3A812'] as const,
  silver: ['#93A1AE', '#E9EFF5', '#8B98A4'] as const,
  bronze: ['#A96F3D', '#E7B587', '#9C6434'] as const,
  /** Тёмный текст поверх металла. */
  ink: '#241A05',
  /** Золотая CTA «Забрать приз» + её полка. */
  ctaGold: ['#F6E3A1', '#E9C86A', '#C99B33'] as const,
  ctaGoldShelf: '#7A5C14',
  ctaGoldInk: '#231A04',
});

/** Тайминги/кривые V2 (мс) — те же, что в эталоне и constants/motion.ts. */
export const v2motion = Object.freeze({
  press: 120,
  fast: 180,
  normal: 240,
  slow: 320,
  celebrate: 420,
  /** Полёт звезды в счётчик. */
  starFlightMs: 700,
  /** Задержка трейл-копий звезды. */
  starTrailStepMs: 55,
  /** Автопереход «Дальше» после вердикта. */
  autoNextMs: 1400,
  /** Волна вердикта по опциям. */
  verdictWaveStepMs: 70,
  // зачем 2026-07-27 (владелец: «анимации внутри турниров такие же дорогие,
  // как на макетах Learning V2» + «просто анимация перехода на след задание»):
  // два новых шага движения турнира. Значения в том же ряду, что и остальные
  // токены эталона, чтобы переходы не выбивались из общего ритма режимов.
  /** Смена задания: старое уезжает, новое приходит. */
  taskSwapMs: 260,
  /** Шаг отсчёта 3-2-1 перед раундом. */
  countdownStepMs: 700,
  bezierSlide: [0.33, 0.52, 0.25, 0.99] as const,
  bezierOutQuint: [0.23, 1, 0.32, 1] as const,
  bezierSpring: [0.38, 0.7, 0.125, 1.0] as const,
});

export type TournamentV2 = TournamentPalette & {
  /** Градиент чипа/плиты-опции (160°) + нижняя 3D-кромка. */
  chipGradA: string; chipGradB: string; chipEdge: string;
  /** Блик поверх чипов и карточек. */
  chipHi: string;
  /** Поверхность карточек (surface-grad). */
  surfaceGradA: string; surfaceGradB: string;
  /** CTA: перелив сверху-вниз + полка. */
  ctaGradA: string; ctaGradB: string; ctaGradC: string; ctaHi: string; ctaShelf: string;
  /** Верная заливка (ok-grad) и текст на ней. */
  okGradA: string; okGradB: string; okInk: string;
  /** Градиент по тексту героя (цифры таймера, заголовок финала). */
  heroGradA: string; heroGradB: string;
  /** Дыхание фона сверху экрана. */
  sheen: string;
  /** Фон экрана: глубокий вертикальный градиент. */
  bgGradA: string; bgGradB: string;
  /** Текст на золотой пилюле max-яруса серии. */
  onGold: string;
};

export function tournamentV2FromTheme(t: Theme, themeMode?: ThemeMode): TournamentV2 {
  const base = tournamentPaletteFromTheme(t);
  const accent = t.accent;
  const isSagePorcelain = themeMode === 'sagePorcelain';
  return {
    ...base,
    accentText: t.correctText,
    accentDark: t.btnShadow,
    chipGradA: mixHex(accent, t.bgSurface2, 0.16),
    chipGradB: mixHex(accent, t.bgCard, 0.07),
    chipEdge: shade(t.bgCard, 0.45),
    chipHi: 'rgba(255,255,255,0.12)',
    // зачем 2026-08-04 (владелец: «над словом ТУРНИРЫ цвет резко отличается»):
    // на тёмных темах bgCard и bgSurface почти одинаково тёмные — диагональный
    // surface-градиент читается как лёгкое дыхание. На sagePorcelain bgSurface
    // (#E1E5DC, заметно серее) даёт видимый шов у верхнего края карточки, где
    // как раз сидит киккер «ТУРНИРЫ». Держим оба стопа в семье bgCard.
    surfaceGradA: isSagePorcelain ? mixHex(accent, t.bgCard, 0.06) : mixHex(accent, t.bgSurface, 0.1),
    surfaceGradB: shade(t.bgCard, 0.94),
    ctaGradA: tint(accent, 0.22),
    ctaGradB: shade(accent, 0.94),
    ctaGradC: shade(accent, 0.72),
    ctaHi: 'rgba(255,255,255,0.34)',
    ctaShelf: t.btnShadow,
    okGradA: tint(accent, 0.14),
    okGradB: shade(accent, 0.88),
    okInk: t.correctText,
    heroGradA: isSagePorcelain ? t.textPrimary : '#FFFFFF',
    heroGradB: isSagePorcelain ? t.accent : tint(accent, 0.62),
    sheen: hexToRgba(accent, 0.05),
    bgGradA: mixHex(accent, t.bgPrimary, 0.045),
    bgGradB: shade(t.bgPrimary, 0.3),
    onGold: t.textOnGold,
  };
}

// Хук: палитра активной темы, мемоизирована по объекту темы.
// Каждый экран/компонент турниров зовёт его сам — один источник истины.
// Возвращает НАДмножество старой палитры: старые поля целы, V2-поля добавлены.
import { useMemo } from 'react';
import { useTheme } from '../ThemeContext';

export function useTournamentPalette(): TournamentV2 {
  const { theme, themeMode } = useTheme();
  return useMemo(() => tournamentV2FromTheme(theme, themeMode), [theme, themeMode]);
}
