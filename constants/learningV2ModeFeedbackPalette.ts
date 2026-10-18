/**
 * Цвета панели обратной связи режимов Learning V2 (верно/неверно, разбор фразы).
 * зачем (координатор 17.10, храповик theme_hardcoded_colors): значения перенесены из modules/learning-v2/modes/mode_feedback_v1.tsx
 * БЕЗ изменений (вид не меняется). Тёмный текст здесь не следует теме — это отдельная задача для «Тем», не этой переноски.
 */
export const MODE_FEEDBACK_ART = Object.freeze({
  correctTint: 'rgba(43, 138, 94, 0.12)',
  correctEdge: 'rgba(43, 138, 94, 0.32)',
  wrongTint: 'rgba(190, 118, 28, 0.12)',
  wrongEdge: 'rgba(190, 118, 28, 0.32)',
  ink: '#17332A',
  inkSoft: '#355148',
});

const rgbOf = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lumOf = (rgb: number[]): number => {
  const c = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratioOf = (a: number[], b: number[]): number => {
  const [x, y] = [lumOf(a), lumOf(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};
const TINT_RGBA: readonly (readonly [number, number, number, number])[] = [[43, 138, 94, 0.12], [190, 118, 28, 0.12]];

/**
 * Приглушённый цвет вторичных строк панели (пояснение, функция, контраст-подсказка) для СВЕТЛЫХ тем.
 * зачем (Ревизор 3.32, 18.10): макет держит иерархию «основной / приглушённый»; токен вторичного текста темы (secondary), если он даёт ≥ 4,5:1
 * на 12 %-тинте и поверх страницы, и поверх карточки; иначе (5 из 115 светлых сочетаний: grad_aurora/jade/orchid при высоком ползунке) — основной текст.
 */
export function feedbackInkSoftForLight(t: Readonly<{ text: string; secondary: string; bg: string; opaqueCard: string }>): string {
  const fg = rgbOf(t.secondary);
  let worst = Infinity;
  for (const under of [t.bg, t.opaqueCard]) {
    const u = rgbOf(under);
    for (const [r, g, b, a] of TINT_RGBA) {
      const mixed = [r, g, b].map((v, i) => v * a! + u[i]! * (1 - a!));
      worst = Math.min(worst, ratioOf(fg, mixed));
    }
  }
  return worst >= 4.5 ? t.secondary : t.text;
}
