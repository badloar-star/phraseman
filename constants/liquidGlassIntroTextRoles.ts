// ═══════════════════════════════════════════════════════════════════════════
// liquidGlassIntroTextRoles.ts — цвета текста вступления и теории: ОДИН цвет для слов изучаемого языка и приглушённый тон для «Читается».
//
// зачем (решение владельца 05.11, утверждено макетом docs/work/release/mockups/target_lang_one_color_approved_2026-11-05.html — «да так отлично»; прежние
// «английский / частицы / перевод» заменены): текст на языке интерфейса и заголовки — обычным цветом; ВСЕ слова и фразы изучаемого языка — один жирный цвет `lang`
// из оттенка темы (с ползунками — из H, насыщенность S масштабирует цветность); строка «Читается» — `say`, приглушённый тон того же оттенка (курсив).
// Частей речи и подложки частицы нет. Насыщенность утверждена: lang c = 0,24, say c = 0,05 — НЕ ослаблять (первая версия была бледной, владелец: «ничего не окрашено»).
// Светлота подбирается шагами до контраста ≥ 4,6 на всех подложках, где стоит текст (карточка, стекло, плашка, шторка, подсказка).
// ═══════════════════════════════════════════════════════════════════════════
import { hueOfHex, paletteContrast, toContrast } from './liquidGlassPaletteRoles';
import { flattenOver, legibleOn } from './liquidGlassSurfaceRoles';
import { liquidGlassTokens, type LiquidGlassThemeId } from './liquidGlassThemePalette';
import { THEME_TUNE_S_STANDARD, parseThemeTuneId } from './theme_tune';

/** lang — слова изучаемого языка (жирный); say — «Читается» (курсив); gloss — вторичный текст (перевод, пояснения). */
export type IntroTextRoles = Readonly<{ lang: string; say: string; gloss: string }>;

/** Утверждено владельцем 05.11 (макет «да так отлично»): насыщенность lang и say и исходная светлота тёмная/светлая. */
export const LANG_ROLE_CHROMA = 0.24;
export const SAY_ROLE_CHROMA = 0.05;
const LANG_L = { dark: 0.72, light: 0.5 } as const;
const SAY_L = { dark: 0.64, light: 0.56 } as const;
/** Контраст на каждой подложке (с запасом к 4,5 на разнице округления). */
export const INTRO_ROLE_MIN_CONTRAST = 4.6;
/** Предел роста цветности при насыщенности ползунка выше стандартной (дальше цвет упирается в охват sRGB). */
const CHROMA_SCALE_MAX = 1.4;
const cache = new Map<string, IntroTextRoles>();

type RoleTokens = Readonly<{
  plateFillFrom: string; plateFillTo: string; text: string; secondary: string; opaqueControl: string; accentSoft: string; isLight: boolean;
  opaqueCard: string; opaqueSheet: string; accent: string;
  /** Для подложек «стекло на фоне» и «подсказка»; без них считаются только пять основных. */
  bg?: string; card?: string; selected?: string;
}>;

/** Плашка ситуации задания: акцент 9 % поверх карточки (lv2TaskTokens.accentWash9). */
const SITUATION_ACCENT_ALPHA = 0.09;

/**
 * Основные подложки, на которых стоит текст вступления: карточка вступления (plateFillFrom → plateFillTo), плашка ситуации задания
 * (акцент 9 % на карточке), карточка «Скажи так» (opaqueCard), шторка теории (opaqueSheet).
 */
export function introTextRoleSurfaces(g: RoleTokens): string[] {
  const card = g.opaqueCard.slice(0, 7);
  const situation = flattenOver(`${g.accent.slice(0, 7)}${Math.round(SITUATION_ACCENT_ALPHA * 255).toString(16).padStart(2, '0')}`, card);
  return [g.plateFillFrom.slice(0, 7), g.plateFillTo.slice(0, 7), card, g.opaqueSheet.slice(0, 7), situation];
}

/** Все подложки макета: основные + стекло карточки на фоне + подсказка (selected) на карточке и на низе плашки. */
export function introLangRoleSurfaces(g: RoleTokens): string[] {
  const base = introTextRoleSurfaces(g);
  const extra: string[] = [];
  if (g.bg && g.card) extra.push(flattenOver(g.card, g.bg.slice(0, 7)).slice(0, 7));
  if (g.selected) {
    extra.push(flattenOver(g.selected, g.opaqueCard.slice(0, 7)).slice(0, 7));
    extra.push(flattenOver(g.selected, g.plateFillTo.slice(0, 7)).slice(0, 7));
  }
  return [...base, ...extra];
}

/** Шаг снижения цветности, когда утверждённая не помещается в цвета экрана при нужной светлоте. */
const CHROMA_FALLBACK_STEP = 0.9;
const CHROMA_FALLBACK_TRIES = 30;

/**
 * Цвет роли с контрастом ≥ min на всех подложках: сначала утверждённая цветность (подбор светлоты), и только если она не достижима —
 * цветность снижается шагами ровно до первого читаемого цвета.
 * зачем (владелец 12.11 «Аврора» в релизе; сторож intro_text_roles_contrast): в тёмной «Авроре» плашки вступления средне-тёмные
 * (#74554F у tune:0:60), а розово-красный оттенок с цветностью 0,24 физически не становится светлее #FF77F6 — подбор светлоты
 * упирался в предел цветов экрана и возвращал нечитаемый цвет (2,66–4,0 вместо 4,6). Утверждённая насыщенность не ослабляется там,
 * где помещается (синие, зелёные, все светлые) — снижение только на тех оттенках, где иначе текст не прочесть.
 */
function readableRole(hue: number, chroma: number, start: number, dir: 1 | -1, min: number, surfaces: readonly string[]): string {
  let c = chroma;
  let color = toContrast(hue, c, start, dir, min, surfaces);
  for (let i = 0; i < CHROMA_FALLBACK_TRIES && !surfaces.every((s) => paletteContrast(color.slice(0, 7), s) >= min); i += 1) {
    c *= CHROMA_FALLBACK_STEP;
    color = toContrast(hue, c, start, dir, min, surfaces);
  }
  return color;
}

/** Оттенок и множитель цветности роли: у настроенной темы — из tune:H:S (S / 35, не выше 1,4), у остальных — оттенок акцента темы на «Максимуме». */
function hueAndScale(themeId: LiquidGlassThemeId, g: RoleTokens, dark: boolean): Readonly<{ hue: number; scale: number }> {
  const tune = parseThemeTuneId(themeId);
  if (tune) return { hue: tune.H, scale: Math.min(CHROMA_SCALE_MAX, tune.S / THEME_TUNE_S_STANDARD) };
  const themeAccent = liquidGlassTokens(themeId, { level: 'max', appearance: dark ? 'dark' : 'light' } as never).accent;
  return { hue: hueOfHex(themeAccent, hueOfHex(g.opaqueControl, 255)), scale: 1 };
}

/** Роли по уже посчитанным токенам темы (экран берёт токены активной темы); кэш по токенам — смена уровня/оформления даёт новый ключ. */
export function introTextRolesForTokens(themeId: LiquidGlassThemeId, g: RoleTokens): IntroTextRoles {
  const key = `${themeId}|${g.plateFillFrom}|${g.plateFillTo}|${g.text}|${g.secondary}|${g.opaqueCard}|${g.opaqueSheet}|${g.accent}|${g.bg ?? ''}|${g.card ?? ''}|${g.selected ?? ''}|${g.isLight ? 'l' : 'd'}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const surfaces = introLangRoleSurfaces(g);
  const dark = !g.isLight;
  const { hue, scale } = hueAndScale(themeId, g, dark);
  const dir = dark ? 1 : -1;
  const roles: IntroTextRoles = Object.freeze({
    lang: readableRole(hue, LANG_ROLE_CHROMA * scale, dark ? LANG_L.dark : LANG_L.light, dir, INTRO_ROLE_MIN_CONTRAST, surfaces),
    say: readableRole(hue, SAY_ROLE_CHROMA * scale, dark ? SAY_L.dark : SAY_L.light, dir, INTRO_ROLE_MIN_CONTRAST, surfaces),
    gloss: legibleOn(g.secondary, g.text, surfaces, INTRO_ROLE_MIN_CONTRAST),
  });
  cache.set(key, roles);
  return roles;
}

export function introTextRoles(themeId: LiquidGlassThemeId, variant: Readonly<{ level?: 'calm' | 'accent' | 'max'; appearance?: 'dark' | 'light'; intensity?: number }> = {}): IntroTextRoles {
  return introTextRolesForTokens(themeId, liquidGlassTokens(themeId, variant as never));
}
