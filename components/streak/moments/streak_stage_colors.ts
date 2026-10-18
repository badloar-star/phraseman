// streak_stage_colors.ts — цвета стадий огня серии из токенов темы (образец streak-milestones.html, `.flame.st-N`).
// зачем (гейт паритета, круг 1, 14.10): на рубеже 30 огонь фиолетовый (второй цвет темы), на 100 — белый, на 365 — фиолетово-белый, на 1000 — золотой; на 7 — яркий акцент темы.
// Второй цвет темы (`--acc2`) — второе световое пятно градиентной темы (glowB: Аврора — фиолетовый); у остальных тем — акцент, подкрашенный золотом. Всё из токенов, «голых» цветов нет.
import { liquidGlassGradientTheme } from '../../../constants/liquidGlassGradientThemes';
import type { StreakFlameStage } from './streak_milestones';

const hexTriplet = (hex: string): readonly [number, number, number] => {
  const h = hex.replace('#', '').slice(0, 6);
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
};
const lum = (hex: string): number => {
  const [r, g, b] = hexTriplet(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrastRatio = (a: string, b: string): number => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
export function mixHex(from: string, to: string, k: number): string {
  const a = hexTriplet(from);
  const b = hexTriplet(to);
  const c = (i: number) => Math.round(a[i]! * (1 - k) + b[i]! * k).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`.toUpperCase();
}

export type StreakStageTokens = Readonly<{ themeId: string; accentGraphic: string; text: string; bg: string; gold: string }>;

/** Второй цвет темы, доведённый до ≥ 3 : 1 к фону (на светлом оформлении образца он тёмный: фиолетовый). */
export function streakSecondColor(t: StreakStageTokens): string {
  // зачем (Макеты 18.10, d30 светлая streak30_open: «огонь грязно-коричневый»): прежний запасной вариант — акцент, смешанный с золотом, —
  // на светлом оформлении (тёмный акцент) давал коричневый. У тем без второго светового пятна берём второй цвет эталона (--acc2 образца,
  // фиолетовый Авроры), дальше он, как и раньше, доводится до ≥ 3 : 1 к фону — на светлом становится тёмно-фиолетовым, как в образце.
  const base = liquidGlassGradientTheme(t.themeId)?.glowB ?? liquidGlassGradientTheme('grad_aurora')?.glowB ?? mixHex(t.accentGraphic, t.gold, 0.45);
  let c = base;
  for (let k = 0; k <= 0.8001 && contrastRatio(c, t.bg) < 3; k += 0.05) c = mixHex(base, t.text, k);
  return c;
}

/** Цвета огня стадии: внешний и сердцевина; стадия 0 — null (огонь как на Главной). */
export function streakStageColors(stage: StreakFlameStage, t: StreakStageTokens): Readonly<{ outer: string; core: string }> | null {
  const acc2 = streakSecondColor(t);
  switch (stage) {
    case 0: return null;
    case 1: return { outer: t.accentGraphic, core: t.text };
    case 2: return { outer: acc2, core: t.text };
    case 3: return { outer: t.text, core: t.accentGraphic };
    case 4: return { outer: mixHex(acc2, t.text, 0.55), core: t.text };
    default: return { outer: t.gold, core: t.text };
  }
}
