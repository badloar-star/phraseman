// ═══════════════════════════════════════════════════════════════════════════
// liquidGlassIntroTextRoles.ts — три цвета текста во вступлении занятия: английский, частицы, русский перевод.
//
// зачем (владелец 25.10, координатор: «английский, русский и грамматические частицы (is/are, a/the, -s, «A + is + B») — РАЗНЫЕ цвета
// во всех 29 темах»; эталон рисуют Макеты — intro-text-colors.html): роли из палитры текущей темы, каждая ≥ 4,55 на карточке
// вступления (plateFillFrom → plateFillTo) в светлом и тёмном. Частицы — оттенок акцента самой темы (берётся с «Максимума», чтобы и в
// «Спокойно» оставался цвет), с постоянной насыщенностью и светлотой, подобранной под контраст: доводка к тексту обесцвечивала их
// до серого («Лёд» светлый: ΔE 0,02 к переводу). Пока НЕ подключено к экрану — подключение после утверждения макета владельцем.
// ═══════════════════════════════════════════════════════════════════════════
import { hueOfHex, toContrast } from './liquidGlassPaletteRoles';
import { flattenOver, legibleOn } from './liquidGlassSurfaceRoles';
import { liquidGlassTokens, type LiquidGlassThemeId } from './liquidGlassThemePalette';

/** particleSoft — подложка частицы (accentSoft темы, утверждено владельцем «МАКСИМУМ И ПОДЛОЖКА»); particle читается ≥ 4,55 и на ней, сведённой с карточкой. */
export type IntroTextRoles = Readonly<{ langText: string; particle: string; gloss: string; particleSoft: string }>;

const PARTICLE_CHROMA = 0.15;
const MIN = 4.55;
const cache = new Map<string, IntroTextRoles>();

type RoleTokens = Readonly<{ plateFillFrom: string; plateFillTo: string; text: string; secondary: string; opaqueControl: string; accentSoft: string; isLight: boolean }>;

/** Роли по уже посчитанным токенам темы (экран берёт токены активной темы); кэш по токенам — смена уровня/оформления даёт новый ключ. */
export function introTextRolesForTokens(themeId: LiquidGlassThemeId, g: RoleTokens): IntroTextRoles {
  const key = `${themeId}|${g.plateFillFrom}|${g.plateFillTo}|${g.text}|${g.secondary}|${g.accentSoft}|${g.isLight ? 'l' : 'd'}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const surfaces = [g.plateFillFrom.slice(0, 7), g.plateFillTo.slice(0, 7)];
  const dark = !g.isLight;
  const themeAccent = liquidGlassTokens(themeId, { level: 'max', appearance: dark ? 'dark' : 'light' } as never).accent;
  const hue = hueOfHex(themeAccent, hueOfHex(g.opaqueControl, 255));
  const roles: IntroTextRoles = Object.freeze({
    langText: legibleOn(g.text, g.text, surfaces, MIN),
    // частица лежит и на карточке, и на своей подложке accentSoft, сведённой с карточкой — читается на всех
    particle: toContrast(hue, PARTICLE_CHROMA, dark ? 0.72 : 0.5, dark ? 1 : -1, MIN, [...surfaces, ...surfaces.map((s) => flattenOver(g.accentSoft, s))]),
    gloss: legibleOn(g.secondary, g.text, surfaces, MIN),
    particleSoft: g.accentSoft,
  });
  cache.set(key, roles);
  return roles;
}

export function introTextRoles(themeId: LiquidGlassThemeId, variant: Readonly<{ level?: 'calm' | 'accent' | 'max'; appearance?: 'dark' | 'light'; intensity?: number }> = {}): IntroTextRoles {
  return introTextRolesForTokens(themeId, liquidGlassTokens(themeId, variant as never));
}
