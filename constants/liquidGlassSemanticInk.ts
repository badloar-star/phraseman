// зачем (🟡 координатор 22.10, контраст новых экранов): сырой `good` (зелёный успех темы) на своей мягкой подложке `goodSoft` в светлых темах даёт 3,75–3,90 вместо 4,5 —
// «готово» в ленте недели читалось слабо. Это тот же приём, что у t.correct/t.wrong в makeLiquidGlassTheme (e12fdaaf2): тон темы сохраняется, меняется только глубина
// до ≥ 4,55 на карточке, контроле и их тонированной подложке. Графика (кольца, полосы) по-прежнему берёт сырой good — ей достаточно 3:1.
import { flattenOver, legibleOn } from './liquidGlassSurfaceRoles';

type SemanticGlass = Readonly<{ good: string; bad: string; goodSoft: string; badSoft: string; text: string; opaqueCard: string; opaqueControl: string }>;

const cache = new WeakMap<object, Readonly<{ goodText: string; badText: string }>>();

/** Текст/значок «успех» и «ошибка» цветом темы, читаемый на карточке, контроле и своей мягкой подложке. */
export function semanticInk(g: SemanticGlass): Readonly<{ goodText: string; badText: string }> {
  const hit = cache.get(g);
  if (hit) return hit;
  const surfaces = (soft: string): string[] => [g.opaqueCard, g.opaqueControl, flattenOver(soft, g.opaqueCard), flattenOver(soft, g.opaqueControl)];
  const next = Object.freeze({
    goodText: legibleOn(g.good, g.text, surfaces(g.goodSoft), 4.55),
    badText: legibleOn(g.bad, g.text, surfaces(g.badSoft), 4.55),
  });
  cache.set(g, next);
  return next;
}
