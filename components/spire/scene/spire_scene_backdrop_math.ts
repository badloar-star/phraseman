// spire_scene_backdrop_math.ts — чистая математика общего фона «Сцены» Пика (без react-native): спек и затемнение под вкладками.
// зачем: считается и в приложении, и в тестах замка «верх цельный» (tests/owner_lock_whole_top_2026_10_25.test.ts).

export type SpireSceneBackdropSpec = Readonly<{ top: string; bottom: string; glow: string; evening: boolean; /** от верха экрана до верха сцены, dp */ bleed: number; sceneH: number }>;

const rgbaOf = (c: string): readonly [number, number, number, number] => {
  const m = /rgba?((d+),s*(d+),s*(d+)(?:,s*([d.e-]+))?)/.exec(c);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  const h = c.replace('#', '');
  return [Number.parseInt(h.slice(0, 2), 16) || 0, Number.parseInt(h.slice(2, 4), 16) || 0, Number.parseInt(h.slice(4, 6), 16) || 0, 1];
};
const lin = (v: number): number => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const lum = (c: readonly number[]): number => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);
// неактивная вкладка — белый 78 % (SPIRE_SCENE_INK.muted) поверх фона: худший из двух текстов вкладок
const MUTED_ALPHA = 0.78;
const whiteOn = (c: readonly number[]): number => {
  const muted = c.map((v) => 255 * MUTED_ALPHA + v * (1 - MUTED_ALPHA));
  const bg = lum(c);
  return Math.min(1.05 / (bg + 0.05), (lum(muted) + 0.05) / (bg + 0.05));
};

/**
 * зачем (замок владельца 25.10 + «контраст текста вкладок на сцене ≥ 4,5»): белые вкладки «Пик / Друзья / Наборы» лежат там, где свет сцены ярче всего —
 * в светлых и ярких темах белый на свете давал 3,3–3,6 (лайм 1,2). Затемнение сверху — часть ТОГО ЖЕ фона (шапка и сцена видят одно и то же, шва нет);
 * сила ровно та, что держит белый ≥ 4,5 на линии вкладок по той же формуле градиента и света, что рисует фон (у 61 из 116 сочетаний — 0).
 */
/** Свет сцены — как на Главной: радиус по вертикали 0,5 × (шапка + высота сцены Главной 392), а не 50 % всего фона Пика. */
export const SPIRE_LIGHT_RY_FACTOR = 0.5;
export const SPIRE_LIGHT_STAGE_H = 392;
/** Затемнение под вкладками затухает к шапка + 140 dp (было + 48) — тексты верха сцены ≥ 4,5 во всех темах (Темы 25.10). */
export const SPIRE_SHADE_TAIL = 140;

export function spireTopShadeAlpha(b: SpireSceneBackdropSpec, width: number): number {
  const H = Math.max(1, b.bleed + b.sceneH);
  const top = rgbaOf(b.top); const bot = rgbaOf(b.bottom); const g = rgbaOf(b.glow);
  const cx = (b.evening ? 0.82 : 0.18) * width;
  let need = 0;
  for (let y = Math.max(0, b.bleed - 64); y <= Math.max(0, b.bleed - 6); y += 6) {
    for (let x = 16; x <= Math.min(width, 260); x += 8) {
      const t = Math.min(1, Math.max(0, ((x / width - 0.22) * 0.56 + y / H) / (0.56 * 0.56 + 1)));
      const base = [0, 1, 2].map((i) => top[i]! * (1 - t) + bot[i]! * t); // линейный градиент сцены: верх → низ по той же оси
      // зачем: тот же радиус света, что рисует spire_scene_backdrop (иначе затемнение считается для другого пятна)
      const o = Math.max(0, 1 - Math.hypot((x - cx) / (0.7 * width), y / Math.min(H, SPIRE_LIGHT_RY_FACTOR * (b.bleed + SPIRE_LIGHT_STAGE_H)))) * g[3]!;
      const c = [0, 1, 2].map((i) => g[i]! * o + base[i]! * (1 - o));
      let a = 0;
      while (a < 0.6 && whiteOn(c.map((v) => v * (1 - a))) < 4.55) a += 0.01;
      if (a > need) need = a;
    }
  }
  return Math.round(need * 100) / 100;
}

