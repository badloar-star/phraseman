import { colorContrast } from '../../../constants/color_contrast';

type CtaTokens = Readonly<{
  accent: string; accentInk: string; ctaFill: string; ctaFillInk: string;
  bg: string; plateFillFrom: string; plateFillTo: string; isLight?: boolean;
}>;

/**
 * Заливка и подпись главной кнопки Диалогов (DialogueGlassCta).
 *
 * зачем ([BLEND-AUDIT] 18.10, «Повторить» в плашке ошибки чата; координатор: «кнопки нигде не сливаются»): кнопка красилась сырым `accent`. В светлом оформлении десяти градиентных тем при
 * насыщенности 1 (grad_aurora, iris, magma, midnight, champagne, jade, orchid, ice, coral, lilac) пастельный accent даёт 1,0–1,7:1 к фону и плашке — кнопка сливается.
 * Если accent не держит 3:1 на фоне и обеих плитках, берём гарантированную пару ctaFill/ctaFillInk (≥3 к поверхностям, подпись ≥4,5) и без пастельного градиента поверх.
 * Во всех остальных случаях — прежний accent/accentInk и фактура темы (вид не меняется); тёмное оформление не затронуто.
 */
export function dialogueCtaPaint(g: CtaTokens, extraSurfaces: readonly string[] = []): Readonly<{ fill: string; ink: string; texture: boolean }> {
  // зачем (Ревизор 18.10, DialogGoalsSheet/DialogWhySheet): кнопка в шторке лежит на opaqueSheet — шторка передаёт свою поверхность сюда, правило то же
  const surfaces = [g.bg, g.plateFillFrom, g.plateFillTo, ...extraSurfaces];
  const merges = !!g.isLight && Math.min(...surfaces.map((s) => colorContrast(g.accent, s))) < 3;
  return merges ? { fill: g.ctaFill, ink: g.ctaFillInk, texture: false } : { fill: g.accent, ink: g.accentInk, texture: true };
}
