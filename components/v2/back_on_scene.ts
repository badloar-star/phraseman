// зачем (🟡 координатор 22.10, «кнопка назад на сценах не сливается»; закон владельца «цвета — строго оттенки текущей темы»): общий круг назад/✕ красится заливкой
// buttonFill — она рассчитана на страницу, а на сцене (Главная, «Диалоги», обложка Сезона) фон другой, и круг сливался с ним. Здесь токен g.backOnScene:
// круг и значок выбираются по яркости САМОЙ сцены — на тёмной сцене светлое стекло и светлый значок, на светлой тёмное стекло и тёмный значок.
// Чистая математика без React: используют BackButton/ScreenBackButton (параметр «на сцене») и сторож tests/back_on_scene_contrast.test.ts.
// Место и размер круга (SCREEN_BACK_*) НЕ трогаются — меняются только заливка и цвет значка.

export type BackOnSceneInput = Readonly<{
  /** Цвет сцены у верха экрана (там стоит кнопка), #rrggbb. */
  sceneTop: string;
  /** Светлые чернила поверх медиа/сцены темы (g.mediaInk) — значок на ТЁМНОЙ сцене. */
  mediaInk: string;
  /** Тёмные чернила темы (g.text) — значок на СВЕТЛОЙ сцене. */
  text: string;
}>;

export type BackOnSceneTokens = Readonly<{
  /** Заливка круга: rgba поверх сцены. */
  fill: string;
  /** Цвет значка. */
  ink: string;
  /** true — сцена тёмная (светлое стекло). */
  onDarkScene: boolean;
  /** Итоговые контрасты для журнала и сторожа: круг к сцене, значок к кругу. */
  circleToScene: number;
  glyphToCircle: number;
}>;

/** Не ниже: круг к фону сцены и значок к кругу (координатор 22.10). */
export const BACK_ON_SCENE_MIN_CIRCLE = 1.5;
export const BACK_ON_SCENE_MIN_GLYPH = 3;

const DARK_SCENE_BASE_ALPHA = 0.26;
const LIGHT_SCENE_BASE_ALPHA = 0.18;
const ALPHA_STEP = 0.02;
const ALPHA_CAP = 0.5;
// запас над порогом: округление до 8 бит не должно уронить 1,50 в 1,49
const CIRCLE_TARGET = BACK_ON_SCENE_MIN_CIRCLE + 0.05;

type Rgb = readonly [number, number, number];

function parse(hex: string): Rgb | null {
  const m = /^#([0-9a-f]{6})/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(c: Rgb): number {
  const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
}

function ratio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function blend(top: Rgb, alpha: number, under: Rgb): Rgb {
  return [0, 1, 2].map((i) => Math.round(top[i]! * alpha + under[i]! * (1 - alpha))) as unknown as Rgb;
}

type Candidate = { fill: string; ink: string; circle: number; glyph: number };

function candidate(scene: Rgb, stain: Rgb, inkHex: string, baseAlpha: number): Candidate | null {
  const ink = parse(inkHex);
  if (!ink) return null;
  let alpha = baseAlpha;
  let circleRgb = blend(stain, alpha, scene);
  while (ratio(circleRgb, scene) < CIRCLE_TARGET && alpha < ALPHA_CAP) {
    alpha = Math.round((alpha + ALPHA_STEP) * 100) / 100;
    circleRgb = blend(stain, alpha, scene);
  }
  return {
    fill: `rgba(${stain[0]},${stain[1]},${stain[2]},${alpha})`,
    ink: inkHex,
    circle: ratio(circleRgb, scene),
    glyph: ratio(ink, circleRgb),
  };
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/** Круг и значок общей кнопки назад/✕ для сцены с данным верхним цветом. Не hex — считаем сцену чёрной (худший случай). */
export function backOnSceneTokens(input: BackOnSceneInput): BackOnSceneTokens {
  const scene = parse(input.sceneTop) ?? BLACK;
  const light = candidate(scene, WHITE, input.mediaInk, DARK_SCENE_BASE_ALPHA);
  const dark = candidate(scene, BLACK, input.text, LIGHT_SCENE_BASE_ALPHA);
  const ok = (c: Candidate | null): c is Candidate => !!c && c.circle >= BACK_ON_SCENE_MIN_CIRCLE && c.glyph >= BACK_ON_SCENE_MIN_GLYPH;
  // яркость сцены решает; если выбранный вариант не проходит порог, берём тот, что проходит
  const darkScene = luminance(scene) < 0.18;
  const first = darkScene ? light : dark;
  const second = darkScene ? dark : light;
  const pick = ok(first) ? first : ok(second) ? second : (first ?? second)!;
  return {
    fill: pick.fill,
    ink: pick.ink,
    onDarkScene: pick === light,
    circleToScene: pick.circle,
    glyphToCircle: pick.glyph,
  };
}
