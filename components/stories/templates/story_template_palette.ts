// ═══════════════════════════════════════════════════════════════════════════
// story_template_palette.ts — цвета кадров историй из токенов текущей темы (макет stories-templates-v1.html, `tokCss` 1:1).
//
// зачем (владелец 28.10: «эти все прекрасные шаблоны, их надо добавить и проверить, что они именно так выглядят в приложении»): кадры берут
// ТОЛЬКО токены темы — все 23 темы, тёмное и светлое оформление. Имена полей — те же, что переменные макета (--tx, --sec, --acc-g…), чтобы
// сверка «макет ↔ код» шла построчно. `color-mix(in srgb, var(--tx) N%, transparent)` макета = txA(N / 100).
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { useTheme } from '../../ThemeContext';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { colorWithAlpha } from '../../v2/plateAlpha';

export type StoryTemplatePalette = Readonly<{
  /** --bg-top / --bg-mid / --bg-bot — градиент фона просмотра. */
  bgTop: string; bgMid: string; bgBot: string;
  /** --tx / --sec / --mu — текст, вторичный, приглушённый. */
  tx: string; sec: string; mu: string;
  /** --acc (accentText) — обзоры и значки цвета темы. */
  acc: string;
  /** --acc-g (accent) — заливки и графика цвета темы. */
  accG: string;
  /** --acc-b (accentBright) — звёзды, конфетти. */
  accB: string;
  /** --acc-ink — текст на заливке accent. */
  accInk: string;
  accSoft: string;
  /** --acc-glow — свечение. */
  accGlow: string;
  /** --g1..--g3 — пятна света фона (bgGlow). */
  g1: string; g2: string; g3: string;
  /** --card / --ctl — непрозрачная карточка и контрол. */
  card: string; ctl: string;
  /** --cta / --cta-ink — кнопка действия. */
  cta: string; ctaInk: string;
  /** --sh-tint — оттенок теней. */
  shTint: string;
  isLight: boolean;
  /** Плашка цифры на огне — та же, что у огня серии (mediaScrim). */
  mediaScrim: string;
  mediaInk: string;
}>;

/** Чистая функция: палитра кадров по токенам темы (тест и фотостудия зовут её напрямую). */
export function storyTemplatePalette(themeId: unknown): StoryTemplatePalette {
  const t = liquidGlassTokens(themeId);
  const glow = t.bgGlow ?? [t.accentGlow, t.accentGlow, t.accentGlow];
  return Object.freeze({
    bgTop: t.bgTop, bgMid: t.bg, bgBot: t.bgBottom,
    tx: t.text, sec: t.secondary, mu: t.mutedText,
    acc: t.accentText, accG: t.accent, accB: t.accentBright ?? t.accent, accInk: t.accentInk, accSoft: t.accentSoft, accGlow: t.accentGlow,
    g1: glow[0], g2: glow[1] ?? glow[0], g3: glow[2] ?? glow[0],
    card: t.opaqueCard, ctl: t.opaqueControl, cta: t.cta, ctaInk: t.ctaInk,
    shTint: t.shadowTint ?? t.bg, isLight: t.isLight === true,
    mediaScrim: t.mediaScrim, mediaInk: t.mediaInk,
  });
}

/** color-mix(in srgb, color N%, transparent) — тот же цвет с прозрачностью. */
export function mix(color: string, alpha: number): string {
  return colorWithAlpha(color, Math.max(0, Math.min(1, alpha)));
}

export function useStoryTemplatePalette(): StoryTemplatePalette {
  const { theme, themeMode, liquidGlassThemeId } = useTheme();
  // зачем: смена оформления (тёмное/светлое) меняет токены той же темы — пересчёт по всем трём ключам, как в useSpirePalette
  return useMemo(() => storyTemplatePalette(liquidGlassThemeId), [theme, themeMode, liquidGlassThemeId]); // eslint-disable-line react-hooks/exhaustive-deps
}
