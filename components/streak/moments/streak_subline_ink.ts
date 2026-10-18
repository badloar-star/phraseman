// streak_subline_ink.ts — цвет подзаголовка и приглушённого оверлайна момента серии: вторичный текст темы, если он читается и на фоне, и на ореоле.
// зачем (Темы 8117615b3, координатор 18.10): secondary на ореоле даёт 4,37:1 при цели 4,5 — единственный провал из 230 сочетаний (grad_midnight, светлая,
// ползунок 1,0). По образцу feedbackInkSoftForLight (constants/learningV2ModeFeedbackPalette.ts): макет держит иерархию «основной / приглушённый» —
// secondary, если худший контраст ≥ 4,5 на фоне, верхнем тоне фона и центре ореола поверх них; иначе основной текст.
import { flattenOver } from '../../../constants/liquidGlassSurfaceRoles';
import { momentGlowCenterOpacity } from '../../spire/moments/moment_glow_math';
import { contrastRatio, mixHex } from './streak_stage_colors';

export type StreakSublineTokens = Readonly<{ text: string; secondary: string; bg: string; bgTop?: string; accentSoft?: string; isLight: boolean }>;

/** Центр ореола над основой: мягкий акцент темы с итоговой альфой ореола (moment_glow_math). */
function glowCenterOver(base: string, accentSoft: string, isLight: boolean): string {
  const full = flattenOver(accentSoft, base); // акцент со своей альфой
  return mixHex(base, full, momentGlowCenterOpacity(accentSoft, isLight)); // доля ореола поверх неё
}

/** Худший контраст цвета к поверхностям, где лежит подзаголовок. */
export function streakSublineWorstRatio(fg: string, t: StreakSublineTokens): number {
  const bases = [t.bg, ...(t.bgTop ? [t.bgTop] : [])].map((b) => flattenOver(b, b)); // фон непрозрачный — сведение к #RRGGBB
  const surfaces = bases.flatMap((b) => (t.accentSoft ? [b, glowCenterOver(b, t.accentSoft, t.isLight)] : [b]));
  return Math.min(...surfaces.map((s) => contrastRatio(flattenOver(fg, s), s)));
}

export function streakSublineInk(t: StreakSublineTokens): string {
  return streakSublineWorstRatio(t.secondary, t) >= 4.5 ? t.secondary : t.text;
}
