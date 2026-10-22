// ═══════════════════════════════════════════════════════════════════════════
// season_star_tones.ts — цвета звёзд оценки на карточках эпизодов: заполненная и пустая — оттенки ТЕКУЩЕЙ темы.
//
// зачем (владелец 22.10: оценка на пройденных карточках; закон «ЦВЕТА СТРОГО ОТТЕНКИ ТЕКУЩЕЙ ТЕМЫ» — никакого жёлтого/золотого): звёзды лежат на градиенте карточки (seasonThemedArt),
// поэтому заполненная — почти белая с лёгкой тонировкой оттенком темы (≥ 4,5 на любом конце градиента), пустая — тот же оттенок светлее фона, но заметно тусклее заполненной (≥ 3:1, график).
// API: seasonStarTones(themeHue) → { filled, empty }; themeHue = hexHue(g.accent). Звезда = Ionicons star (filled) / star-outline (empty) этого цвета.
// ═══════════════════════════════════════════════════════════════════════════
import { oklchToHex } from './season_art';

export type SeasonStarTones = Readonly<{ filled: string; empty: string }>;

const cache = new Map<number, SeasonStarTones>();

export function seasonStarTones(themeHue: number): SeasonStarTones {
  const key = Math.round(themeHue);
  const hit = cache.get(key);
  if (hit) return hit;
  const next: SeasonStarTones = Object.freeze({
    filled: oklchToHex(0.98, 0.03, key),
    empty: oklchToHex(0.84, 0.05, key),
  });
  cache.set(key, next);
  return next;
}
