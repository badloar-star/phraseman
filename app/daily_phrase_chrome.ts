/**
 * Visual "chrome" for the Daily Phrase surface — the single source of truth for
 * how the phrase-of-the-day looks on the CURRENT theme.
 *
 * Used by components/DailyPhraseCard.tsx for the in-app card.
 *
 * зачем (владелец 28.10: «каждый цвет — оттенок текущей темы»; координатор: аудит цвета, пакет 1): раньше оформление брали из таблицы по прежнему
 * «режиму» (dark / gold / olive / midnight …, 126 литералов): у любой тёмной темы карточка была зелёной (#193025), у серого «Затмения» тоже. Теперь
 * цвета считаются из токенов Liquid Glass ТЕКУЩЕЙ темы: градиент — карточка темы с долей акцента, текст — text / secondary, акцент и кнопка — accentGraphic / cta.
 */
import { alphaHex, mixHex } from '../constants/v2Style';
import type { GlassTokens } from '../constants/liquidGlassThemePalette';
import { relativeLuminance } from '../components/home/v2/scene/home_scene_tokens';

export interface DailyPhraseChrome {
  /** 3-stop vertical gradient, top → bottom. */
  colors: [string, string, string];
  /** Hairline border tint. */
  border: string;
  /** Soft ambient glow behind the card. */
  glow: string;
  /** Kicker / label color ("PHRASE OF THE DAY"). */
  title: string;
  /** The English phrase color (primary). */
  phrase: string;
  /** Meaning / sub text color. */
  sub: string;
  /** Icon chip fill. */
  iconBg: string;
  /** Icon chip border. */
  iconBorder: string;
  /** Brand accent for ornament + play affordance. */
  ornament: string;
  /** Solid background for Daily Phrase action controls. */
  actionBg: string;
  /** Foreground text and icons for Daily Phrase action controls. */
  actionText: string;
  /** Drop-shadow color (matches accent on dark themes). */
  shadow: string;
}

/** Доля акцента темы в верхней точке градиента карточки: тёмное оформление глубже, светлое — тоньше. */
export const DAILY_PHRASE_ACCENT_MIX = { dark: 0.16, light: 0.1 } as const;

/** Минимальный контраст формы кнопки к карточке (WCAG 1.4.11 для графики). */
export const DAILY_PHRASE_ACTION_MIN_CONTRAST = 3;

function contrastOf(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Оформление «Фразы дня» из токенов текущей темы (все 23 темы × светлое / тёмное). Чистая функция, мемоизируется вызывающим по объекту токенов. */
export function dailyPhraseChromeFromTokens(g: Pick<GlassTokens, 'isLight' | 'opaqueCard' | 'bg' | 'accent' | 'accentGlow' | 'accentGraphic' | 'accentTextSafe' | 'glassEdge' | 'text' | 'secondary' | 'cta' | 'ctaInk' | 'shadowTint'>): DailyPhraseChrome {
  const mix = g.isLight ? DAILY_PHRASE_ACCENT_MIX.light : DAILY_PHRASE_ACCENT_MIX.dark;
  // зачем (замер 28.10): в части светлых тем заливка кнопки темы (cta) совпадает с карточкой (1,00:1) — кнопки не видно; тогда форма — тон текста темы, подпись — цвет карточки (как у кнопки сцены Диалогов)
  const ctaVisible = contrastOf(g.cta, g.opaqueCard) >= DAILY_PHRASE_ACTION_MIN_CONTRAST;
  return {
    colors: [mixHex(g.opaqueCard, g.accent, mix), g.opaqueCard, g.bg],
    border: g.glassEdge,
    glow: g.accentGlow,
    title: g.accentTextSafe,
    phrase: g.text,
    sub: g.secondary,
    iconBg: alphaHex(g.accent, 0.14),
    iconBorder: alphaHex(g.accent, 0.26),
    ornament: g.accentGraphic,
    actionBg: ctaVisible ? g.cta : g.text,
    actionText: ctaVisible ? g.ctaInk : g.opaqueCard,
    // тёмные темы — свечение акцентом (как было), светлые — мягкая тень тоном темы
    shadow: g.isLight ? g.shadowTint : g.accent,
  };
}
