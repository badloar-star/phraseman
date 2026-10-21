// ═══════════════════════════════════════════════════════════════════════════
// home_scene_tokens.ts — цвета «Сцены» Главной из палитры темы.
//
// зачем (эталон home-new-concepts.html, раздел A; договорённость с 4 · ТЕМЫ 21.10: «заводи свои значения у себя —
// sceneTop, sceneBottom, sceneGlow, sceneEmber; перенесу в тему, когда сцена устоится»): сцена — глубокий градиент тона
// акцента темы со светом сверху. Белый текст лежит прямо на сцене, поэтому верх и низ затемняются, пока белый не даёт
// ≥ 4,5:1 по яркости WCAG — светлые темы автоматически получают тёмную сцену, а не «белое на светлом».
// Вечер (серия под угрозой) — свои тёплые цвета, как в эталоне (.a-stage.eve).
// ═══════════════════════════════════════════════════════════════════════════
import { alphaHex, mixHex } from '../../../../constants/v2Style';

export type HomeSceneTokens = Readonly<{
  sceneTop: string;
  sceneBottom: string;
  /** Свет в левом верхнем углу сцены (полупрозрачный). */
  sceneGlow: string;
  /** Тёплый свет вечера (полупрозрачный). */
  sceneEmber: string;
  /** Контраст белого на верхнем цвете — для журнала и стража темы. */
  whiteContrastTop: number;
}>;

/** Минимальный контраст белого текста на сцене (обычный текст по WCAG AA). */
export const HOME_SCENE_MIN_WHITE_CONTRAST = 4.5;
const FALLBACK_ACCENT = '#5B49D6';
const HEX = /^#([0-9a-f]{6})$/i;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Относительная яркость WCAG для #rrggbb; не hex — null. */
export function relativeLuminance(hex: string): number | null {
  const m = HEX.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Контраст белого текста на цвете; не hex — 1 (худший случай). */
export function whiteContrastOn(hex: string): number {
  const l = relativeLuminance(hex);
  return l === null ? 1 : 1.05 / (l + 0.05);
}

/** Затемняет цвет шагами, пока белый не даст нужный контраст (не больше 16 шагов). */
export function darkenForWhite(hex: string, min = HOME_SCENE_MIN_WHITE_CONTRAST): string {
  let out = HEX.test(hex) ? hex : FALLBACK_ACCENT;
  for (let i = 0; i < 16 && whiteContrastOn(out) < min; i += 1) out = mixHex(out, '#000000', 0.12);
  return out;
}

const EVENING = Object.freeze({ top: '#2E2648', bottom: '#0F0C1C', glow: 'rgba(214,92,70,0.62)' });

export function homeSceneTokens(accent: string, evening = false): HomeSceneTokens {
  const base = HEX.test(accent) ? accent : FALLBACK_ACCENT;
  if (evening) {
    return Object.freeze({ sceneTop: EVENING.top, sceneBottom: EVENING.bottom, sceneGlow: EVENING.glow, sceneEmber: 'rgba(229,94,70,0.5)', whiteContrastTop: whiteContrastOn(EVENING.top) });
  }
  const top = darkenForWhite(mixHex(base, '#000000', 0.32));
  const bottom = darkenForWhite(mixHex(base, '#05060A', 0.7));
  return Object.freeze({
    sceneTop: top,
    sceneBottom: bottom,
    sceneGlow: alphaHex(mixHex(base, '#FFFFFF', 0.3), 0.7),
    sceneEmber: 'rgba(229,94,70,0.5)',
    whiteContrastTop: whiteContrastOn(top),
  });
}
