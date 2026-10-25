// зачем (🟡 координатор 22.10, контраст новых экранов): сырой `good` (зелёный успех темы) на своей мягкой подложке `goodSoft` в светлых темах даёт 3,75–3,90 вместо 4,5 —
// «готово» в ленте недели читалось слабо. Это тот же приём, что у t.correct/t.wrong в makeLiquidGlassTheme (e12fdaaf2): тон темы сохраняется, меняется только глубина
// до ≥ 4,55 на карточке, контроле и их тонированной подложке. Графика (кольца, полосы) по-прежнему берёт сырой good — ей достаточно 3:1.
// зачем (координатор 25.10, замер docs/work/learning-v2-session-contrast-2026-10-25.md): плитки и чипы занятия лежат не на карточке, а на ФОНЕ экрана,
// а чипы красятся 18 %-заливкой цвета — goodText давал 4,02 на мягкой подложке поверх фона. Если вызывающий передаёт фон (`bg` есть у всех токенов темы),
// доводка учитывает и эти подложки: мягкую заливку поверх фона, фон и 18 % поверх фона и карточки. Без `bg` — прежнее поведение.
import { flattenOver, legibleOn } from './liquidGlassSurfaceRoles';

type SemanticGlass = Readonly<{ good: string; bad: string; goodSoft: string; badSoft: string; text: string; opaqueCard: string; opaqueControl: string; bg?: string }>;

const cache = new WeakMap<object, Readonly<{ goodText: string; badText: string }>>();

/** Доля заливки чипа «верно / неверно» в занятии (LearningV2Glass: goodFill / badFill). */
const CHIP_FILL_ALPHA = 0.18;
const withAlpha = (hex: string, a: number): string => `${hex.slice(0, 7)}${Math.round(a * 255).toString(16).padStart(2, '0')}`;

/** Подложки, на которых стоит текст «успех / ошибка»: карточка, контрол, мягкая заливка поверх них; с фоном — ещё фон, мягкая и 18 % поверх фона, 18 % поверх карточки. */
export function semanticInkSurfaces(g: SemanticGlass, tone: string, soft: string): string[] {
  const out = [g.opaqueCard, g.opaqueControl, flattenOver(soft, g.opaqueCard), flattenOver(soft, g.opaqueControl)];
  if (g.bg) {
    const screen = flattenOver(g.bg, '#000000'); // фон темы непрозрачный; сведение защищает от альфы в токене
    const chip = withAlpha(tone, CHIP_FILL_ALPHA);
    out.push(screen, flattenOver(soft, screen), flattenOver(chip, screen), flattenOver(chip, flattenOver(g.opaqueCard, screen)));
  }
  return out;
}

/** Текст/значок «успех» и «ошибка» цветом темы, читаемый на карточке, контроле, своей мягкой подложке и (если передан фон) на фоне экрана. */
export function semanticInk(g: SemanticGlass): Readonly<{ goodText: string; badText: string }> {
  const hit = cache.get(g);
  if (hit) return hit;
  const next = Object.freeze({
    goodText: legibleOn(g.good, g.text, semanticInkSurfaces(g, g.good, g.goodSoft), 4.55),
    badText: legibleOn(g.bad, g.text, semanticInkSurfaces(g, g.bad, g.badSoft), 4.55),
  });
  cache.set(g, next);
  return next;
}
