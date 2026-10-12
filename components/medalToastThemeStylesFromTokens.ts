import { glassTone } from './dialogs/glass/glassTone';
import type { GlassTokens } from '../constants/liquidGlassThemePalette';
import type { MedalToastThemeStyle } from './medalToastThemeStyles';

// зачем (координатор 12.10): getMedalToastThemeStyle(themeMode ?? 'indigo') выбирает строку по прежнему режиму, а не по теме Liquid Glass.
// Здесь та же форма стиля строится из токенов. Цвета ступеней медали (бронза/серебро/золото) — смысловые, не цвет темы: в светлой
// теме берём более тёмные тона (как у прежней строки sagePorcelain), чтобы читались на светлой карточке.
// Подключение в MedalToast.tsx — Дизайну.
const TIER = {
  dark: {
    accents: { bronze: '#D99A5B', silver: '#72D8FF', gold: '#F2C44A' }, // theme-exempt: смысловые цвета ступеней медали
    glows: { bronze: 'rgba(217,154,91,0.34)', silver: 'rgba(114,216,255,0.32)', gold: 'rgba(242,196,74,0.46)' }, // theme-exempt: свечение ступеней
  },
  light: {
    accents: { bronze: '#8B6320', silver: '#52605A', gold: '#8B6320' }, // theme-exempt: смысловые цвета ступеней на светлом
    glows: { bronze: 'rgba(139,99,32,0.24)', silver: 'rgba(82,96,90,0.20)', gold: 'rgba(139,99,32,0.28)' }, // theme-exempt: свечение ступеней на светлом
  },
} as const;

export function medalToastStyleFromTokens(t: GlassTokens): MedalToastThemeStyle {
  const tier = t.isLight ? TIER.light : TIER.dark;
  const clear = (c: string) => glassTone(c, 0);
  return {
    signature: `glass-${t.isLight ? 'light' : 'dark'}`,
    cardBgColors: [t.opaqueControl, t.opaqueCard],
    borderColor: glassTone(t.accent, t.isLight ? 0.3 : 0.28),
    titleColor: t.text,
    subtitleColor: t.secondary,
    surfaceAccent: t.accent,
    badgeDownColor: t.accentText,
    topShineColors: [clear(t.accentBright), glassTone(t.accentBright, t.isLight ? 0.5 : 0.56), clear(t.accentBright)],
    topShineOpacity: t.isLight ? 0.64 : 0.72,
    haloOpacity: t.isLight ? 0.18 : 0.24,
    auraColor: glassTone(t.accent, t.isLight ? 0.1 : 0.14),
    medalPlateBg: glassTone(t.accent, 0.07),
    medalPlateBorder: glassTone(t.accent, 0.22),
    textureColor: glassTone(t.accent, 0.05),
    textureOpacity: t.isLight ? 0.4 : 0.52,
    tierAccents: { ...tier.accents },
    tierGlows: { ...tier.glows },
  };
}
