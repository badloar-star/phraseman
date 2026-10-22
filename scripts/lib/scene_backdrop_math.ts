// ═══════════════════════════════════════════════════════════════════════════
// scene_backdrop_math.ts — аналитический расчёт фона «Сцены» Главной (то, что HomeSceneStage рисует шейдерами) для запекания в WebP и для сторожа.
//
// зачем (владелец 22.10 одобрил план ускорения первого кадра; координатор: «цель — совпадение с нынешним рендером»): фон сцены — диагональный LinearGradient + SVG RadialGradient «sceneLight»
// на ВСЮ площадь сцены. Обе фигуры заданы в долях размера, поэтому маленький растр, растянутый на сцену, даёт тот же вид без единого шейдера.
// Формулы повторяют HomeSceneStage: линейный — start(0.22,0) → end(0.78,1), t = проекция на вектор; радиальный — центр (18 % | вечером 82 %, 0 %), rx 70 % ширины, ry 50 % высоты,
// альфа света a·(1−t) от центра к краю эллипса. Композиция src-over в sRGB (как Canvas Android).
// ═══════════════════════════════════════════════════════════════════════════

export type Rgba = readonly [number, number, number, number];

/** 'rgba(r,g,b,a)' или '#RRGGBB' / '#RRGGBBAA' → [r,g,b,a(0..1)]. */
export function parseColor(input: string): Rgba {
  const s = input.trim();
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  const h = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s);
  if (h) {
    const n = parseInt(h[1]!, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h[2] ? parseInt(h[2], 16) / 255 : 1];
  }
  throw new Error(`scene_backdrop_math: не разобран цвет "${input}"`);
}

export type BackdropInput = Readonly<{
  sceneTop: string;
  sceneBottom: string;
  /** Цвет света: день — sceneGlow, вечер — eveningGlow. */
  glow: string;
  evening: boolean;
}>;

/** Начало/конец диагонального градиента сцены (доли размера) — как в HomeSceneStage. */
export const BACKDROP_LINEAR = { start: [0.22, 0], end: [0.78, 1] } as const;

/** Пиксель фона в точке (u, v) ∈ [0,1]² сцены → [r,g,b] (0..255, без округления). */
export function backdropAt(input: BackdropInput, u: number, v: number, aspectW: number, aspectH: number): [number, number, number] {
  const top = parseColor(input.sceneTop);
  const bottom = parseColor(input.sceneBottom);
  const glow = parseColor(input.glow);
  // линейный: проекция на вектор start→end в пикселях (Android LinearGradient работает в пикселях, не в долях)
  const x = u * aspectW;
  const y = v * aspectH;
  const x0 = BACKDROP_LINEAR.start[0] * aspectW;
  const y0 = BACKDROP_LINEAR.start[1] * aspectH;
  const dx = BACKDROP_LINEAR.end[0] * aspectW - x0;
  const dy = BACKDROP_LINEAR.end[1] * aspectH - y0;
  const t = Math.min(1, Math.max(0, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
  const base = [0, 1, 2].map((i) => top[i]! + (bottom[i]! - top[i]!) * t);
  // радиальный свет: центр (cx, 0), rx 70 % ширины, ry 50 % высоты
  const cx = (input.evening ? 0.82 : 0.18) * aspectW;
  const rx = 0.7 * aspectW;
  const ry = 0.5 * aspectH;
  const r = Math.min(1, Math.hypot((x - cx) / rx, y / ry));
  const a = glow[3] * (1 - r);
  return [0, 1, 2].map((i) => base[i]! * (1 - a) + glow[i]! * a) as [number, number, number];
}

/** Растр W×H (центры пикселей) → RGBA-буфер (A = 255). */
export function renderBackdrop(input: BackdropInput, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j += 1) {
    for (let i = 0; i < w; i += 1) {
      const [r, g, b] = backdropAt(input, (i + 0.5) / w, (j + 0.5) / h, w, h);
      const o = (j * w + i) * 4;
      out[o] = Math.round(r);
      out[o + 1] = Math.round(g);
      out[o + 2] = Math.round(b);
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Билинейная выборка RGBA-растра в точке (u, v) — так GPU растягивает текстуру. */
export function sampleBilinear(buf: Uint8Array, w: number, h: number, u: number, v: number): [number, number, number] {
  const fx = Math.min(w - 1, Math.max(0, u * w - 0.5));
  const fy = Math.min(h - 1, Math.max(0, v * h - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const px = (x: number, y: number, c: number): number => buf[(y * w + x) * 4 + c]!;
  return [0, 1, 2].map((c) => {
    const top = px(x0, y0, c) * (1 - tx) + px(x1, y0, c) * tx;
    const bot = px(x0, y1, c) * (1 - tx) + px(x1, y1, c) * tx;
    return top * (1 - ty) + bot * ty;
  }) as [number, number, number];
}
