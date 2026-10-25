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

type RoleTokens = Readonly<{
  plateFillFrom: string; plateFillTo: string; text: string; secondary: string; opaqueControl: string; accentSoft: string; isLight: boolean;
  opaqueCard: string; opaqueSheet: string; accent: string;
}>;

/** Плашка ситуации задания: акцент 9 % поверх карточки (lv2TaskTokens.accentWash9). */
const SITUATION_ACCENT_ALPHA = 0.09;

/**
 * Все подложки, на которых стоит IntroRoleText: карточка вступления (plateFillFrom → plateFillTo), плашка ситуации задания
 * (акцент 9 % на карточке), карточка «Скажи так» (opaqueCard), шторка теории Мастерской (opaqueSheet).
 * зачем (координатор 25.10, замер docs/work/learning-v2-session-contrast-2026-10-25.md): роли считались только под карточку вступления,
 * а частица на плашке ситуации давала 3,43 (68 из 174 сочетаний), в шторке теории 3,56, в карточке «Скажи так» 4,16.
 */
export function introTextRoleSurfaces(g: RoleTokens): string[] {
  const card = g.opaqueCard.slice(0, 7);
  const situation = flattenOver(`${g.accent.slice(0, 7)}${Math.round(SITUATION_ACCENT_ALPHA * 255).toString(16).padStart(2, '0')}`, card);
  return [g.plateFillFrom.slice(0, 7), g.plateFillTo.slice(0, 7), card, g.opaqueSheet.slice(0, 7), situation];
}

/** Роли по уже посчитанным токенам темы (экран берёт токены активной темы); кэш по токенам — смена уровня/оформления даёт новый ключ. */
export function introTextRolesForTokens(themeId: LiquidGlassThemeId, g: RoleTokens): IntroTextRoles {
  const key = `${themeId}|${g.plateFillFrom}|${g.plateFillTo}|${g.text}|${g.secondary}|${g.accentSoft}|${g.opaqueCard}|${g.opaqueSheet}|${g.accent}|${g.isLight ? 'l' : 'd'}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const surfaces = introTextRoleSurfaces(g);
  const dark = !g.isLight;
  const themeAccent = liquidGlassTokens(themeId, { level: 'max', appearance: dark ? 'dark' : 'light' } as never).accent;
  const hue = hueOfHex(themeAccent, hueOfHex(g.opaqueControl, 255));
  const roles: IntroTextRoles = Object.freeze({
    langText: legibleOn(g.text, g.text, surfaces, MIN),
    // частица лежит и на подложке экрана, и на своей подложке accentSoft, сведённой с ней — читается на всех (карточка вступления, ситуация, «Скажи так», теория)
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
