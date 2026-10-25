import { glassTone } from './dialogs/glass/glassTone';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
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

const TEXTURE_ALPHA = 0.05;

// зачем (Ревизор 25.10, 31b17106b): MedalToast зовёт эту функцию на каждом рендере, а в ней 6 вызовов legibleOn — кэш по объекту
// токенов (токены темы кэшируются и неизменны, как у semanticInk); новый объект токенов при смене темы даёт новый стиль
const cache = new WeakMap<GlassTokens, MedalToastThemeStyle>();

export function medalToastStyleFromTokens(t: GlassTokens): MedalToastThemeStyle {
  const hit = cache.get(t);
  if (hit) return hit;
  const style = buildMedalToastStyle(t);
  cache.set(t, style);
  return style;
}

function buildMedalToastStyle(t: GlassTokens): MedalToastThemeStyle {
  const tier = t.isLight ? TIER.light : TIER.dark;
  const clear = (c: string) => glassTone(c, 0);
  const textureOpacity = t.isLight ? 0.4 : 0.52;
  // зачем (4 · ТЕМЫ 25.10, docs/work/toast-contrast-2026-10-25.md: подпись ступени цветом бронзы/серебра/золота не читалась в 77 из 174
  // сочетаний — светлые 4,0, olive тёмная 3,57; accentText без повышения — 4,42 в marine): текст тоста доводим legibleOn к `text` по обоим
  // краям карточки с текстурой (MedalToast: градиент cardBgColors + texture на всю карточку) до 4,55. Оттенок ступени сохраняется — меняется
  // только светлота. Сами цвета ступеней (TIER, theme-exempt Дизайна) не трогаем: они остаются в tierAccents для значка и свечения.
  const textureOver = glassTone(t.accent, TEXTURE_ALPHA * textureOpacity);
  const textSurfaces = [t.opaqueControl, t.opaqueCard].map((c) => flattenOver(textureOver, c));
  const readable = (c: string): string => legibleOn(c, t.text, textSurfaces, 4.55);
  return {
    signature: `glass-${t.isLight ? 'light' : 'dark'}`,
    cardBgColors: [t.opaqueControl, t.opaqueCard],
    borderColor: glassTone(t.accent, t.isLight ? 0.3 : 0.28),
    titleColor: t.text,
    subtitleColor: readable(t.secondary),
    surfaceAccent: t.accent,
    badgeDownColor: readable(t.accentText),
    topShineColors: [clear(t.accentBright), glassTone(t.accentBright, t.isLight ? 0.5 : 0.56), clear(t.accentBright)],
    topShineOpacity: t.isLight ? 0.64 : 0.72,
    haloOpacity: t.isLight ? 0.18 : 0.24,
    auraColor: glassTone(t.accent, t.isLight ? 0.1 : 0.14),
    medalPlateBg: glassTone(t.accent, 0.07),
    medalPlateBorder: glassTone(t.accent, 0.22),
    textureColor: glassTone(t.accent, TEXTURE_ALPHA),
    textureOpacity,
    tierAccents: { ...tier.accents },
    tierLabelColors: { bronze: readable(tier.accents.bronze), silver: readable(tier.accents.silver), gold: readable(tier.accents.gold) },
    tierGlows: { ...tier.glows },
  };
}
