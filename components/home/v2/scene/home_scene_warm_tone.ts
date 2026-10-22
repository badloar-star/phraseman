// ═══════════════════════════════════════════════════════════════════════════
// home_scene_warm_tone.ts — «тёплый» тон сцены Главной (огонёк серии, ноль энергии) в оттенке ТЕКУЩЕЙ темы.
//
// зачем (владелец кнопкой 22.10 через координатора: «огонёк серии — В ОТТЕНОК ТЕМЫ», исключений нет): раньше серия и «ноль энергии» красились персиковыми #FFD9D0 / #FFB4A3 мимо темы.
// Теперь это очень светлый оттенок АКЦЕНТА выбранной темы (светлота 0,94 / 0,92): читается на сцене (≥ 4,5, аудит scene_contrast_audit) и остаётся «тёплее» белого по насыщенности.
// ═══════════════════════════════════════════════════════════════════════════
import { homeSceneFromOklch, homeSceneOklchOf } from './home_scene_tokens';

const hexToRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (c: readonly number[]): string => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

export type HomeSceneWarmTone = Readonly<{ flame: string; low: string }>;

const cache = new Map<string, HomeSceneWarmTone>();

/** Огонёк серии (`flame`) и ноль энергии (`low`) — светлые оттенки акцента темы. */
export function homeSceneWarmTone(accentHex: string): HomeSceneWarmTone {
  const hit = cache.get(accentHex);
  if (hit) return hit;
  const [, chroma, hue] = homeSceneOklchOf(hexToRgb(accentHex));
  const c = Math.max(0.04, Math.min(chroma, 0.12));
  const next: HomeSceneWarmTone = Object.freeze({
    flame: toHex(homeSceneFromOklch(0.94, c * 0.55, hue)),
    low: toHex(homeSceneFromOklch(0.92, c * 0.75, hue)),
  });
  cache.set(accentHex, next);
  return next;
}
